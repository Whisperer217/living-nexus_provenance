/**
 * workerCallbackRoute.ts
 * Express router for callbacks from the cloud processing worker.
 * All routes are protected by requireWorkerAuth (HMAC-SHA256).
 *
 * POST /api/worker/comic-processed   — comic page processing complete
 * POST /api/worker/guide-extracted   — guide entity extraction complete
 * POST /api/worker/health            — worker health ping (no auth required)
 */

import { Router, Request, Response } from "express";
import { requireWorkerAuth } from "./workerAuth";
import { getDb } from "./db";
import { songs, guides } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const workerCallbackRouter = Router();

// ── Health ping (no auth — just confirms the route is reachable) ──────────────
workerCallbackRouter.get("/api/worker/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "living-nexus-backend", ts: Date.now() });
});

// ── Capture raw body for HMAC verification ────────────────────────────────────
// This middleware runs before express.json() on worker routes so we have the
// raw body string available for signature verification.
workerCallbackRouter.use(
  "/api/worker",
  (req: Request & { rawBody?: string }, _res: Response, next) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => {
      req.rawBody = data;
      // Parse JSON manually so downstream handlers have req.body
      try { (req as Request).body = JSON.parse(data); } catch { /* ignore */ }
      next();
    });
  }
);

// ── Comic page processing complete ───────────────────────────────────────────
workerCallbackRouter.post(
  "/api/worker/comic-processed",
  requireWorkerAuth,
  async (req: Request, res: Response) => {
    try {
      const {
        songId,
        pageIndex,
        fullUrl,
        mobileUrl,
        thumbUrl,
        sha256,
        width,
        height,
      } = req.body as {
        songId: number;
        pageIndex: number;
        fullUrl: string;
        mobileUrl: string;
        thumbUrl: string;
        sha256: string;
        width: number;
        height: number;
      };

      if (!songId || pageIndex === undefined || !fullUrl || !sha256) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable" });
        return;
      }

      // Fetch current pagesJson, update the processed page entry
      const [song] = await db.select({ pagesJson: songs.pagesJson }).from(songs).where(eq(songs.id, songId));
      if (!song) {
        res.status(404).json({ error: "Song not found" });
        return;
      }

      let pages: Array<Record<string, unknown>> = [];
      try { pages = JSON.parse(song.pagesJson ?? "[]"); } catch { pages = []; }

      if (pages[pageIndex]) {
        pages[pageIndex] = {
          ...pages[pageIndex],
          imageUrl: fullUrl,
          mobileUrl,
          thumbUrl,
          sha256,
          width,
          height,
          processed: true,
          processedAt: new Date().toISOString(),
        };
      }

      await db.update(songs)
        .set({ pagesJson: JSON.stringify(pages) })
        .where(eq(songs.id, songId));

      console.log(`[Worker] Comic page ${pageIndex} processed for song ${songId}`);
      res.json({ ok: true });
    } catch (err) {
      console.error("[Worker] comic-processed callback error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  }
);

// ── Guide entity extraction complete ─────────────────────────────────────────
workerCallbackRouter.post(
  "/api/worker/guide-extracted",
  requireWorkerAuth,
  async (req: Request, res: Response) => {
    try {
      const {
        guideId,
        canonicalName,
        guideType,
        role,
        alignment,
        domain,
        testimonyOfOrigin,
        symbolsJson,
        extractedImageUrls,
      } = req.body as {
        guideId: number;
        canonicalName?: string;
        guideType?: string;
        role?: string;
        alignment?: string;
        domain?: string;
        testimonyOfOrigin?: string;
        symbolsJson?: string;
        extractedImageUrls?: string[];
      };

      if (!guideId) {
        res.status(400).json({ error: "Missing guideId" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable" });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (canonicalName) updates.canonicalName = canonicalName;
      if (guideType) updates.guideType = guideType;
      if (role) updates.role = role;
      if (alignment) updates.alignment = alignment;
      if (domain) updates.domain = domain;
      if (testimonyOfOrigin) updates.testimonyOfOrigin = testimonyOfOrigin;
      if (symbolsJson) updates.symbolsJson = symbolsJson;
      if (extractedImageUrls?.length) {
        updates.extractedImageUrls = JSON.stringify(extractedImageUrls);
      }

      if (Object.keys(updates).length > 0) {
        await db.update(guides)
          .set(updates as Parameters<typeof db.update>[0] extends infer T ? T : never)
          .where(eq(guides.id, guideId));
      }

      console.log(`[Worker] Guide ${guideId} extraction complete`);
      res.json({ ok: true });
    } catch (err) {
      console.error("[Worker] guide-extracted callback error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  }
);

// ── Job polling endpoint — worker polls this to claim pending jobs ─────────────
// GET /api/worker/jobs/poll?types=comic-processing,guide-extraction&limit=5
workerCallbackRouter.get(
  "/api/worker/jobs/poll",
  requireWorkerAuth,
  async (req: Request, res: Response) => {
    try {
      const { claimPendingJobs } = await import("./workerQueue");
      const typesParam = (req.query.types as string) || "comic-processing,guide-extraction,notification-digest";
      const limit = Math.min(parseInt((req.query.limit as string) || "10", 10), 50);
      const types = typesParam.split(",").map(t => t.trim()) as import("./workerQueue").JobType[];
      const jobs = await claimPendingJobs(types, limit);
      res.json({ jobs });
    } catch (err) {
      console.error("[Worker] jobs/poll error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  }
);

// ── Job completion endpoint — worker reports job done ─────────────────────────
// POST /api/worker/jobs/:id/complete
workerCallbackRouter.post(
  "/api/worker/jobs/:id/complete",
  requireWorkerAuth,
  async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.id, 10);
      if (isNaN(jobId)) {
        res.status(400).json({ error: "Invalid job ID" });
        return;
      }
      const { completeJob, failJob } = await import("./workerQueue");
      const { success, result, error } = req.body as {
        success: boolean;
        result?: Record<string, unknown>;
        error?: string;
      };
      if (success) {
        await completeJob(jobId, result ?? {});
      } else {
        await failJob(jobId, error ?? "Unknown error");
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[Worker] jobs/complete error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  }
);

// ── Worker stats endpoint — for Mission Control dashboard ─────────────────────
// GET /api/worker/stats  (no auth — public stats for ops dashboard)
workerCallbackRouter.get("/api/worker/stats", async (_req: Request, res: Response) => {
  try {
    const { getJobStats, getRecentJobs } = await import("./workerQueue");
    const [stats, recent] = await Promise.all([getJobStats(), getRecentJobs(20)]);
    res.json({ stats, recent });
  } catch (err) {
    console.error("[Worker] stats error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});
