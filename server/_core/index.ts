import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerOgRoutes } from "../og";
import { registerEmbedRoutes } from "../embedRoute";
import { registerSseRoutes } from "../sse";
import { appRouter, handleStripeWebhook } from "../routers";
import { uploadRouter } from "../uploadRoute";
import { downloadRouter } from "../downloadRoute";
import { publicApiRouter } from "../publicApiRoute";
import { oembedRouter } from "../oembedRoute";
import { shareRouter } from "../shareRoute";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

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
  // Configure body parser — 50mb covers base64-encoded audio up to ~37MB raw
  // Large files should use the multipart /api/upload-file endpoint instead
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Server-Sent Events for real-time community notifications
  registerSseRoutes(app);
  // Multipart file upload endpoint (bypasses tRPC JSON body size limit)
  app.use(uploadRouter);
  // WID-tagged audio download endpoint
  app.use(downloadRouter);
  // Public REST API v1 (Plex/Jellyfin/external clients)
  app.use(publicApiRouter);
  // oEmbed discovery endpoint — Discord reads this to get song-specific metadata
  // Must be under /api/* so the Manus CDN forwards it to the Express server
  app.use(oembedRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Open Graph meta tag injection for /song/:id (must be before Vite/static)
  registerOgRoutes(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
