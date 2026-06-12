import "dotenv/config";
import compression from "compression";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerOgRoutes } from "../og";
import { registerEmbedRoutes } from "../embedRoute";
import { registerSseRoutes } from "../sse";
import { appRouter, handleStripeWebhook } from "../routers";
import { uploadRouter } from "../uploadRoute";
import { stampRouter } from "../stampRoute";
import { downloadRouter } from "../downloadRoute";
import { physicalExportRouter } from "../physicalExport";
import { harmonicRouter } from "../harmonicRoute";
import { publicApiRouter } from "../publicApiRoute";
import { oembedRouter } from "../oembedRoute";
import { ogApiRouter } from "../ogApiRoutes";
import { shareRouter } from "../shareRoute";
import { workRouter } from "../workRoute";
import { workerCallbackRouter } from "../workerCallbackRoute";
import { mcpRouter } from "../mcp/index";
import { sitemapRouter } from "../sitemapRoute";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startVisualWorker, backfillVisualQueue } from "../visualQueue";
import { startSelfImprovementWorker } from "../selfImprovementWorker";
import { startPaymentIntegrityWorker } from "../paymentIntegrityWorker";
import { globalErrorHandler } from "./errorHandler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Gzip compression — saves 60-80% on JSON/HTML payloads
  app.use(compression({ level: 6, threshold: 1024 }));

  // ── Canonical domain enforcement ──────────────────────────────────────────
  // Redirect all http:// and non-www requests to https://www.livingnexus.org
  // This fixes Google Search Console "Crawled - currently not indexed" for:
  //   http://livingnexus.org/
  //   http://www.livingnexus.org/creator/180001
  // Only enforce in production to avoid breaking local dev.
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      // Skip redirect for all API routes — especially /api/oauth/callback.
      // Redirecting the OAuth callback strips the code/state params and breaks login.
      if (req.path.startsWith("/api/")) return next();
      const host = req.headers["x-forwarded-host"] as string || req.headers.host || "";
      const proto = (req.headers["x-forwarded-proto"] as string || req.protocol || "http").split(",")[0].trim();
      const isHttps = proto === "https";
      const isWww = host.startsWith("www.");
      // Only enforce www redirect for livingnexus.org — NOT for *.manus.space or other domains
      // Redirecting manus.space to www.manus.space creates a dead DNS loop
      const isCanonicalDomain = host.endsWith("livingnexus.org") || host.endsWith("bddtpublishing.com");
      if (isCanonicalDomain && (!isHttps || !isWww)) {
        const wwwHost = isWww ? host : `www.${host.replace(/^www\./, "")}`;
        return res.redirect(301, `https://${wwwHost}${req.originalUrl}`);
      }
      next();
    });
  }

  // Embed iframe routes MUST be registered BEFORE the X-Frame-Options header
  // so Discord can load /embed/song/:id inside an iframe for inline playback.
  registerEmbedRoutes(app);
  // PDL Share Surface — /share/:wid must be registered BEFORE X-Frame-Options header
  // The Manus CDN forwards /share/* to Express (not a known static page route)
  // This is the canonical share URL for Discord, Twitter, Slack, iMessage, etc.
  app.use(shareRouter);

  // Security headers (applied to all routes EXCEPT /embed/* which overrides below)
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Stripe webhook MUST be before express.json() for signature verification
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  // Body parser — raised to 10 MB to accommodate base64-encoded payloads (video thumbnails,
  // storyboard pages, etc.). Large binary file uploads still use the multipart /api/upload-file
  // endpoint which streams directly to S3 without buffering in the JSON body.
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Rate limiting for public write endpoints — prevents spam/play-count inflation
  const publicWriteLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 30,             // 30 requests per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please slow down." },
  });
  app.use("/api/trpc/comments.add", publicWriteLimit);
  app.use("/api/trpc/songs.play", publicWriteLimit);
  app.use("/api/trpc/songs.download", publicWriteLimit);
  app.use("/api/trpc/songs.recordPlay", publicWriteLimit);
  // OAuth callback under /api/oauth/callback
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // Server-Sent Events for real-time community notifications
  registerSseRoutes(app);
  // Multipart file upload endpoint (bypasses tRPC JSON body size limit)
  app.use(uploadRouter);
  // Sovereign Stamp — POST /api/stamp-song (tone injection pipeline)
  app.use(stampRouter);
  // WID-tagged audio download endpoint
  app.use(downloadRouter);
  // Physical distribution export (admin-only)
  app.use(physicalExportRouter);
  // Harmonic Signature — GET /api/harmonic/:songId/audio and /api/harmonic/:songId/image
  app.use("/api/harmonic", harmonicRouter);
  // Public REST API v1 (Plex/Jellyfin/external clients)
  app.use(publicApiRouter);
  // oEmbed discovery endpoint — Discord reads this to get song-specific metadata
  // Must be under /api/* so the Manus CDN forwards it to the Express server
  app.use(oembedRouter);
  // OG API HTML endpoints — CDN-bypass OG meta tag pages for Facebook/Messenger
  // /api/og/song/:id, /api/og/creator/:id, /api/og/project/:slug
  // These return OG-injected HTML that Facebook/Messenger crawlers can scrape directly
  app.use(ogApiRouter);
  // WID Protocol — Canonical Work API
  // GET /api/work/:wid — read-only, immutable provenance record for any registered work
  // CORS open, external apps can call this directly
  app.use("/api/work", workRouter);
  // POST /mcp — read-only MCP server (Streamable HTTP, bearer auth, 60 req/min)
  app.use("/mcp", mcpRouter);
  // Cloud Worker Callbacks — HMAC-authenticated callbacks from the Layer 3 processing worker
  // Must be registered with raw body capture BEFORE express.json() processes the body
  app.use(workerCallbackRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Sitemap — must be before Vite/static so /sitemap.xml is served by Express
  app.use(sitemapRouter);
  // Open Graph meta tag injection for /song/:id (must be before Vite/static)
  registerOgRoutes(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ── Global error handler ─────────────────────────────────────────────────
  // MUST be registered LAST — after all routes and middleware.
  // Catches any unhandled error passed to next(err) or thrown synchronously.
  // Full error details go to server logs only; client receives a safe payload.
  app.use(globalErrorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start the visual generation worker after the server is up.
    // Backfill any published songs that don't have visuals yet.
    backfillVisualQueue().catch(err => console.error("[VisualQueue] Backfill error:", err));
    startVisualWorker();
    // Self-improvement worker: runs nightly at 2am, scans codebase for issues
    startSelfImprovementWorker();
    startPaymentIntegrityWorker();
  });
}

startServer().catch(console.error);
