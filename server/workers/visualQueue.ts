/**
 * Visual Generation Pipeline
 *
 * Automatic, queue-backed system that ensures every published work has a
 * loopable MP4 visual (autoVideoUrl).
 *
 * Trigger points:
 *   - Song creation (createSong)
 *   - WID issuance (witnessId assigned)
 *   - Publish event (status → "Published")
 *
 * Queue status transitions:
 *   pending → processing → complete
 *                       → failed  (retried up to MAX_ATTEMPTS times)
 *
 * Worker runs on a setInterval inside the Express process.
 * It is non-blocking — the upload flow never waits for video generation.
 */

import { eq, and, desc, sql, or } from "drizzle-orm";
import { getDb } from "../utils/db";
import { visualQueue, songs, users } from "../../drizzle/schema";
import { getOrGenerateEmbedVideo } from "../services/embedVideo";
import { storagePut } from "../utils/storage";
import { notifyOwner } from "../_core/notification";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max retry attempts before a job is permanently marked failed. */
const MAX_ATTEMPTS = 3;

/** How many jobs the worker processes per tick. */
const BATCH_SIZE = 5;

/** Worker poll interval in ms. */
const WORKER_INTERVAL_MS = 10_000; // 10 seconds (reduced from 15s for higher throughput)

/** Priority assigned to founder works. */
const FOUNDER_PRIORITY = 10;

/** Priority assigned to regular works. */
const DEFAULT_PRIORITY = 0;

// ─── DB Helpers ───────────────────────────────────────────────────────────────

/**
 * Enqueue a visual generation job for a song.
 * If a pending/processing job already exists, this is a no-op.
 * If the song already has autoVideoUrl set, mark it complete immediately.
 */
export async function enqueueVisualJob(songId: number, isFounder = false): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if song already has a video — if so, just mark visualReady
  const [song] = await db.select({
    autoVideoUrl: songs.autoVideoUrl,
    visualReady: songs.visualReady,
    coverArtUrl: songs.coverArtUrl,
    fileUrl: songs.fileUrl,
  }).from(songs).where(eq(songs.id, songId)).limit(1);

  if (song?.autoVideoUrl) {
    if (!song.visualReady) {
      await db.update(songs).set({ visualReady: true }).where(eq(songs.id, songId));
    }
    return;
  }

  // Songs without both cover art AND audio are ineligible — skip silently
  if (!song?.coverArtUrl || !song?.fileUrl) {
    console.log(`[VisualQueue] Skipping enqueue for song ${songId} — ineligible (no cover or audio)`);
    return;
  }

  // Check if a pending or processing job already exists
  const { inArray } = await import("drizzle-orm");
  const existing = await db.select({ id: visualQueue.id })
    .from(visualQueue)
    .where(and(
      eq(visualQueue.songId, songId),
      inArray(visualQueue.status, ["pending", "processing"]),
    ))
    .limit(1);

  if (existing.length > 0) return; // already queued

  const priority = isFounder ? FOUNDER_PRIORITY : DEFAULT_PRIORITY;
  await db.insert(visualQueue).values({ songId, priority });
  console.log(`[VisualQueue] Enqueued job for song ${songId} (priority=${priority})`);
}

/**
 * Enqueue visual jobs for all published songs that don't have autoVideoUrl yet.
 * Used on server startup to backfill existing works.
 */
export async function backfillVisualQueue(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { isNull, isNotNull, ne } = await import("drizzle-orm");

  // Only enqueue songs that have BOTH cover art AND audio file — ineligible songs are silently skipped
  const rows = await db
    .select({
      id: songs.id,
      role: users.role,
    })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(
      eq(songs.status, "Published"),
      eq(songs.isPublic, true),
      isNull(songs.autoVideoUrl),
      isNotNull(songs.coverArtUrl),
      ne(songs.coverArtUrl, ""),
      isNotNull(songs.fileUrl),
      ne(songs.fileUrl, ""),
    ));

  let enqueued = 0;
  for (const row of rows) {
    await enqueueVisualJob(row.id, row.role === "founder");
    enqueued++;
  }

  if (enqueued > 0) {
    console.log(`[VisualQueue] Backfill: enqueued ${enqueued} pending visual jobs`);
  }
}

/**
 * Get visual pipeline stats for the admin panel.
 */
export async function getVisualPipelineStats(): Promise<{
  totalPublished: number;
  visualReady: number;
  pending: number;
  processing: number;
  failed: number;
  complete: number;
}> {
  const db = await getDb();
  if (!db) return { totalPublished: 0, visualReady: 0, pending: 0, processing: 0, failed: 0, complete: 0 };

  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(songs)
    .where(and(eq(songs.status, "Published"), eq(songs.isPublic, true)));

  const [readyRow] = await db.select({ count: sql<number>`count(*)` }).from(songs)
    .where(and(eq(songs.status, "Published"), eq(songs.isPublic, true), eq(songs.visualReady, true)));

  // Queue breakdown
  const queueRows = await db
    .select({ status: visualQueue.status, count: sql<number>`count(*)` })
    .from(visualQueue)
    .groupBy(visualQueue.status);

  const queueMap: Record<string, number> = {};
  for (const r of queueRows) queueMap[r.status] = Number(r.count);

  return {
    totalPublished: Number(totalRow?.count ?? 0),
    visualReady: Number(readyRow?.count ?? 0),
    pending: queueMap["pending"] ?? 0,
    processing: queueMap["processing"] ?? 0,
    failed: queueMap["failed"] ?? 0,
    complete: queueMap["complete"] ?? 0,
  };
}

/**
 * Get recent queue jobs for the admin pipeline view.
 */
export async function getRecentQueueJobs(limit = 50): Promise<Array<{
  id: number;
  songId: number;
  songTitle: string | null;
  status: string;
  priority: number;
  attempts: number;
  errorMessage: string | null;
  enqueuedAt: Date;
  completedAt: Date | null;
}>> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: visualQueue.id,
      songId: visualQueue.songId,
      songTitle: songs.title,
      status: visualQueue.status,
      priority: visualQueue.priority,
      attempts: visualQueue.attempts,
      errorMessage: visualQueue.errorMessage,
      enqueuedAt: visualQueue.enqueuedAt,
      completedAt: visualQueue.completedAt,
    })
    .from(visualQueue)
    .leftJoin(songs, eq(visualQueue.songId, songs.id))
    .orderBy(desc(visualQueue.enqueuedAt))
    .limit(limit);

  return rows.map((r: typeof rows[number]) => ({
    ...r,
    songTitle: r.songTitle ?? null,
  }));
}

/**
 * Requeue all failed jobs (reset to pending for retry).
 */
export async function requeueFailedJobs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.update(visualQueue)
    .set({ status: "pending", attempts: 0, errorMessage: null, startedAt: null, completedAt: null })
    .where(eq(visualQueue.status, "failed"));

  const count = (result as any).affectedRows ?? 0;
  console.log(`[VisualQueue] Requeued ${count} failed jobs`);
  return count;
}

// ─── Worker ───────────────────────────────────────────────────────────────────

let workerRunning = false;

async function processNextBatch(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;

  try {
    const db = await getDb();
    if (!db) return;

    // Pick the highest-priority pending jobs (founders first)
    const jobs = await db
      .select()
      .from(visualQueue)
      .where(and(
        eq(visualQueue.status, "pending"),
        sql`${visualQueue.attempts} < ${MAX_ATTEMPTS}`,
      ))
      .orderBy(desc(visualQueue.priority), visualQueue.enqueuedAt)
      .limit(BATCH_SIZE);

    if (jobs.length === 0) return;

    for (const job of jobs) {
      // Mark as processing
      await db.update(visualQueue)
        .set({ status: "processing", startedAt: new Date(), attempts: job.attempts + 1 })
        .where(eq(visualQueue.id, job.id));

      try {
        // Fetch song data
        const [song] = await db
          .select({ id: songs.id, coverArtUrl: songs.coverArtUrl, fileUrl: songs.fileUrl, autoVideoUrl: songs.autoVideoUrl })
          .from(songs)
          .where(eq(songs.id, job.songId))
          .limit(1);

        if (!song) {
          // Song deleted — mark job as skipped/complete silently
          await db.update(visualQueue)
            .set({ status: "complete", completedAt: new Date(), errorMessage: "Song not found — skipped" })
            .where(eq(visualQueue.id, job.id));
          console.log(`[VisualQueue] ⚠ Skipped job ${job.id} — song ${job.songId} not found`);
          continue;
        }

        // Songs without both cover art AND audio cannot generate a video — skip silently
        if (!song.coverArtUrl || !song.fileUrl) {
          await db.update(visualQueue)
            .set({ status: "complete", completedAt: new Date(), errorMessage: "Ineligible: missing coverArtUrl or fileUrl" })
            .where(eq(visualQueue.id, job.id));
          console.log(`[VisualQueue] ⚠ Skipped job ${job.id} for song ${job.songId} — ineligible (no cover or audio)`);
          continue;
        }

        // If song already has autoVideoUrl (e.g., manually set), just mark complete
        let videoUrl = song.autoVideoUrl;
        if (!videoUrl) {
          // Generate using the embed video engine (cover art + audio → MP4)
          videoUrl = await getOrGenerateEmbedVideo({
            songId: song.id,
            coverArtUrl: song.coverArtUrl,
            fileUrl: song.fileUrl,
          });

          if (!videoUrl) {
            // Generation returned null — skip silently rather than retrying
            await db.update(visualQueue)
              .set({ status: "complete", completedAt: new Date(), errorMessage: "Generation returned null — skipped" })
              .where(eq(visualQueue.id, job.id));
            console.log(`[VisualQueue] ⚠ Skipped job ${job.id} for song ${job.songId} — generation returned null`);
            continue;
          }

          // Store in autoVideoUrl (separate from embedVideoUrl)
          await db.update(songs)
            .set({ autoVideoUrl: videoUrl, visualReady: true })
            .where(eq(songs.id, job.songId));
        } else {
          // Already has video — just mark visualReady
          await db.update(songs)
            .set({ visualReady: true })
            .where(eq(songs.id, job.songId));
        }

        // Mark job complete
        await db.update(visualQueue)
          .set({ status: "complete", completedAt: new Date() })
          .where(eq(visualQueue.id, job.id));

        console.log(`[VisualQueue] ✓ Completed job ${job.id} for song ${job.songId}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[VisualQueue] ✗ Failed job ${job.id} for song ${job.songId}:`, errorMessage);

        const newAttempts = job.attempts + 1;
        const newStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
        // Only notify owner on the FIRST time a job reaches permanently-failed status
        // (i.e., this transition — not on re-runs of already-failed jobs)
        await db.update(visualQueue)
          .set({ status: newStatus, errorMessage, startedAt: null })
          .where(eq(visualQueue.id, job.id));
        // Per-failure notifications suppressed — daily digest handles alerting
      }
    }
  } finally {
    workerRunning = false;
  }
}

/**
 * Send a daily digest of visual pipeline activity to the owner.
 */
async function sendDailyDigest(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const queueRows = await db
      .select({ status: visualQueue.status, count: sql<number>`count(*)` })
      .from(visualQueue)
      .groupBy(visualQueue.status);
    const queueMap: Record<string, number> = {};
    for (const r of queueRows) queueMap[r.status] = Number(r.count);
    const completed = queueMap["complete"] ?? 0;
    const failed = queueMap["failed"] ?? 0;
    const pending = queueMap["pending"] ?? 0;
    const processing = queueMap["processing"] ?? 0;
    const total = completed + failed + pending + processing;
    const content = [
      `Visual Pipeline — Daily Digest`,
      ``,
      `Total jobs tracked: ${total}`,
      `  ✓ Complete:    ${completed}`,
      `  ✗ Failed:      ${failed}`,
      `  ⏳ Pending:     ${pending}`,
      `  ▶ Processing:  ${processing}`,
      ``,
      failed > 0
        ? `${failed} job(s) need attention. Open Admin → Media Generation to requeue.`
        : `No failed jobs — pipeline is healthy.`,
    ].join("\n");
    await notifyOwner({
      title: `Visual Pipeline Digest — ${new Date().toLocaleDateString()}`,
      content,
    });
    console.log("[VisualQueue] Daily digest sent");
  } catch (err) {
    console.error("[VisualQueue] Failed to send daily digest:", err);
  }
}

/**
 * Schedule the daily digest to fire at midnight (00:00) server time.
 */
function scheduleDailyDigest(): void {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // next midnight
  const msUntilMidnight = midnight.getTime() - now.getTime();
  console.log(`[VisualQueue] Daily digest scheduled in ${Math.round(msUntilMidnight / 60000)} min`);
  setTimeout(() => {
    sendDailyDigest();
    // Re-schedule every 24 hours after the first midnight fire
    setInterval(sendDailyDigest, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

/**
 * Start the background visual generation worker.
 * Call once at server startup.
 */
export function startVisualWorker(): void {
  console.log(`[VisualQueue] Worker started (interval=${WORKER_INTERVAL_MS}ms, batch=${BATCH_SIZE})`);

  // Run immediately on start (catches any pending jobs from previous runs)
  processNextBatch().catch(err => console.error("[VisualQueue] Worker tick error:", err));

  // Then run on interval
  setInterval(() => {
    processNextBatch().catch(err => console.error("[VisualQueue] Worker tick error:", err));
  }, WORKER_INTERVAL_MS);

  // Schedule daily digest at midnight
  scheduleDailyDigest();
}
