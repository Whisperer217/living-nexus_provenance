/**
 * Living Nexus — Server-Sent Events (SSE) broadcast module
 * Manages a registry of active SSE client connections and provides
 * a broadcast function to push events to all connected clients.
 *
 * No external dependencies — uses Node.js HTTP response streams.
 */

import type { Request, Response, Express } from "express";

// ── Client registry ──────────────────────────────────────────────────────────
type SseClient = {
  id: string;
  res: Response;
};

const clients = new Map<string, SseClient>();

function addClient(id: string, res: Response) {
  clients.set(id, { id, res });
}

function removeClient(id: string) {
  clients.delete(id);
}

// ── Broadcast to all connected clients ───────────────────────────────────────
export function broadcastEvent(eventName: string, data: unknown) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of Array.from(clients.values())) {
    try {
      client.res.write(payload);
    } catch {
      // Client disconnected mid-write — remove it
      removeClient(client.id);
    }
  }
}

// ── Register the SSE endpoint ─────────────────────────────────────────────────
export function registerSseRoutes(app: Express) {
  app.get("/api/sse/events", (req: Request, res: Response) => {
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
    res.flushHeaders();

    // Send a heartbeat comment every 25 s to keep the connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(": heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 25_000);

    // Register this client
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    addClient(clientId, res);

    // Send a welcome event so the client knows the stream is open
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    // Clean up when the client disconnects
    req.on("close", () => {
      clearInterval(heartbeat);
      removeClient(clientId);
    });
  });
}
