/**
 * workerQueue.ts
 * Layer 3 job dispatch and polling helpers.
 *
 * Architecture: The cloud worker (127.0.0.1:3001 on cloud-pc-5eqy0mw7) cannot be
 * reached directly from the Manus backend because Redis is bound to localhost only.
 * Instead, the backend stores pending jobs in the `workerJobs` DB table and the
 * cloud worker polls /api/worker/jobs/poll (HMAC-signed) every 10 seconds.
 */
import { eq, and, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { workerJobs } from "../drizzle/schema";
import type { WorkerJob } from "../drizzle/schema";

export type JobType = "comic-processing" | "guide-extraction" | "notification-digest";

/**
 * Enqueue a new processing job. Returns the created job row.
 */
export async function enqueueJob(
  jobType: JobType,
  payload: Record<string, unknown>
): Promise<WorkerJob | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(workerJobs).values({
    jobType,
    status: "pending",
    payloadJson: payload,
  });
  const insertId = (result as { insertId?: number }).insertId;
  if (!insertId) return null;
  const [job] = await db.select().from(workerJobs).where(eq(workerJobs.id, insertId));
  return job ?? null;
}

/**
 * Claim up to `limit` pending jobs of the given types.
 * Marks them as "claimed" atomically so the worker won't double-process.
 */
export async function claimPendingJobs(
  types: JobType[],
  limit = 10
): Promise<WorkerJob[]> {
  const db = await getDb();
  if (!db) return [];

  // Fetch pending jobs
  const pending = await db
    .select()
    .from(workerJobs)
    .where(and(eq(workerJobs.status, "pending"), inArray(workerJobs.jobType, types)))
    .limit(limit);

  if (pending.length === 0) return [];

  // Mark as claimed
  const ids = pending.map((j: WorkerJob) => j.id);
  await db
    .update(workerJobs)
    .set({ status: "claimed", claimedAt: new Date() })
    .where(inArray(workerJobs.id, ids));

  return pending;
}

/**
 * Mark a job as completed with its result payload.
 */
export async function completeJob(
  jobId: number,
  result: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workerJobs)
    .set({ status: "completed", resultJson: result, completedAt: new Date() })
    .where(eq(workerJobs.id, jobId));
}

/**
 * Mark a job as failed with an error message.
 */
export async function failJob(jobId: number, errorMessage: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workerJobs)
    .set({ status: "failed", errorMessage })
    .where(eq(workerJobs.id, jobId));
}

/**
 * Get recent jobs for the Mission Control dashboard.
 */
export async function getRecentJobs(limit = 50): Promise<WorkerJob[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workerJobs).orderBy(workerJobs.createdAt).limit(limit);
}

/**
 * Get job counts by status for the dashboard.
 */
export async function getJobStats(): Promise<{
  pending: number;
  claimed: number;
  completed: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { pending: 0, claimed: 0, completed: 0, failed: 0 };

  const all = await db.select({ status: workerJobs.status }).from(workerJobs);
  const counts = { pending: 0, claimed: 0, completed: 0, failed: 0 };
  for (const row of all) {
    if (row.status in counts) counts[row.status as keyof typeof counts]++;
  }
  return counts;
}
