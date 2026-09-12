import { Router } from "express";
import { sdk } from "../_core/sdk";
import { processCoreIngestionBatch } from "../services/coreIngestion";

export const coreIngestionScheduleRouter = Router();

/**
 * Durable I1 worker entry. It accepts managed scheduler identities only. This
 * slice registers the endpoint but does not create or activate a schedule.
 */
coreIngestionScheduleRouter.post("/api/scheduled/core-ingestion", async (req, res) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    const result = await processCoreIngestionBatch();
    return res.json({ ok: true, taskUid: user.taskUid, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CoreIngestionSchedule] Failed:", message);
    return res.status(500).json({
      error: message,
      context: { path: "/api/scheduled/core-ingestion" },
      timestamp: new Date().toISOString(),
    });
  }
});

