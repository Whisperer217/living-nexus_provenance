import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerOgRoutes } from "../og";
import { appRouter, handleStripeWebhook } from "../routers";
import { uploadRouter } from "../uploadRoute";
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
  // Stripe webhook MUST be before express.json() for signature verification
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  // Configure body parser with larger size limit for file uploads
  // WAV files can be 100-200MB; base64 encoding adds ~33% overhead, so 500mb covers up to ~375MB raw files
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Multipart file upload endpoint (bypasses tRPC JSON body size limit)
  app.use(uploadRouter);
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
