import { Router } from "express";
import { sdk } from "../_core/sdk";
import {
  getEnabledCoreIngestionSchedulerConfig,
  processCoreIngestionBatch,
  recordCoreIngestionSchedulerCompletion,
  recordCoreIngestionSchedulerFailure,
  recordCoreIngestionSchedulerStarted,
} from "../services/coreIngestion";

export const coreIngestionScheduleRouter = Router();

/**
 * Durable I1 worker entry. It accepts managed scheduler identities only. This
 * slice registers the endpoint but does not create or activate a schedule.
 */
coreIngestionScheduleRouter.post("/api/scheduled/core-ingestion", async (req, res) => {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    taskUid = user.taskUid;
    const scheduler = await getEnabledCoreIngestionSchedulerConfig(taskUid);
    if (scheduler.state !== "enabled") {
      return res.json({ ok: true, taskUid, skipped: scheduler.state });
    }
    await recordCoreIngestionSchedulerStarted(taskUid);
    const result = await processCoreIngestionBatch();
    await recordCoreIngestionSchedulerCompletion(taskUid, result);
    return res.json({ ok: true, taskUid, result });
  } catch (error) {
    if (!taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    if (taskUid) await recordCoreIngestionSchedulerFailure(taskUid).catch(() => undefined);
    console.error("[CoreIngestionSchedule] Deterministic batch failed.");
    return res.status(500).json({
      error: "scheduler-batch-failed",
      context: { path: "/api/scheduled/core-ingestion" },
      timestamp: new Date().toISOString(),
    });
  }
});
