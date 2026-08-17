import { Router } from "express";
import { sdk } from "../_core/sdk";
import { processVisualQueueBatch } from "../workers/visualQueue";

export const visualQueueScheduleRouter = Router();

/**
 * Durable LN worker entry point. It accepts only managed scheduler identities;
 * public requests and ordinary user sessions cannot run queue processing.
 */
visualQueueScheduleRouter.post("/api/scheduled/visual-queue", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    await processVisualQueueBatch();
    return res.json({ ok: true, taskUid: user.taskUid });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[VisualQueueSchedule] Failed:", message);
    return res.status(500).json({
      error: message,
      context: { path: "/api/scheduled/visual-queue" },
      timestamp: new Date().toISOString(),
    });
  }
});
