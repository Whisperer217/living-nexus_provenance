/**
 * Core Ingestion Commission — I1 deterministic foundation.
 *
 * This service owns only creator-scoped Commission, job, and inspection receipt
 * records. It does not create a Work, WID, provenance event, publication,
 * Quiver record, PNA record, marketplace record, or AI/provider request.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import {
  coreIngestionCommissions,
  coreIngestionInspectionReceipts,
  coreIngestionJobs,
} from "../../drizzle/schema";
import { storageGet } from "../utils/storage";
import { getDb } from "../utils/db";

export const CORE_INGESTION_POLICY_VERSION = "core.ingestion.v1";
const CORE_INGESTION_MAX_BYTES = 64 * 1024 * 1024;
const CORE_INGESTION_BATCH_SIZE = 3;
const CORE_INGESTION_LEASE_MS = 90_000;

type RequestedOutcome = "private_draft" | "registration_review";

class IngestionFailure extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
  }
}

function sha256hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function assertOwnedStorageKey(creatorId: number, storageKey: string) {
  // I1 consumes only the current authenticated audio-upload key convention.
  // This is a boundary check, not a substitute for the subsequent storage read.
  if (!storageKey.startsWith(`audio/${creatorId}/`)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This asset is outside the current Creator Domain audio boundary.",
    });
  }
}

async function getOwnedCommission(db: any, creatorId: number, commissionId: string) {
  const rows = await db.select().from(coreIngestionCommissions).where(and(
    eq(coreIngestionCommissions.commissionId, commissionId),
    eq(coreIngestionCommissions.creatorId, creatorId),
  )).limit(1);
  const commission = rows[0];
  if (!commission) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Ingestion Commission not found in this Creator Domain." });
  }
  return commission;
}

function toPublicCommission(commission: typeof coreIngestionCommissions.$inferSelect) {
  return {
    commissionId: commission.commissionId,
    requestedOutcome: commission.requestedOutcome,
    status: commission.status,
    assetStorageKey: commission.assetStorageKey,
    assetContentType: commission.assetContentType,
    assetSizeBytes: commission.assetSizeBytes,
    assetSha256: commission.assetSha256,
    inspectionReceiptId: commission.inspectionReceiptId,
    failureCode: commission.failureCode,
    failureMessage: commission.failureMessage,
    cancelledAt: commission.cancelledAt,
    createdAt: commission.createdAt,
    updatedAt: commission.updatedAt,
  };
}

export async function startCoreIngestionCommission(
  creatorId: number,
  input: { requestedOutcome: RequestedOutcome; idempotencyKey: string },
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db.select().from(coreIngestionCommissions).where(and(
    eq(coreIngestionCommissions.creatorId, creatorId),
    eq(coreIngestionCommissions.idempotencyKey, input.idempotencyKey),
  )).limit(1);
  if (existing[0]) return { ...toPublicCommission(existing[0]), idempotent: true };

  const commissionId = randomUUID();
  await db.insert(coreIngestionCommissions).values({
    commissionId,
    creatorId,
    requestedOutcome: input.requestedOutcome,
    idempotencyKey: input.idempotencyKey,
    status: "awaiting_asset",
  });

  const commission = await getOwnedCommission(db, creatorId, commissionId);
  return { ...toPublicCommission(commission), idempotent: false };
}

export async function attachCoreIngestionAsset(
  creatorId: number,
  input: { commissionId: string; storageKey: string; declaredContentType?: string; declaredSizeBytes?: number },
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  assertOwnedStorageKey(creatorId, input.storageKey);

  return db.transaction(async (tx: any) => {
    const commission = await getOwnedCommission(tx, creatorId, input.commissionId);
    if (commission.status !== "awaiting_asset") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Ingestion Commission already has an attached asset or has reached a terminal state.",
      });
    }

    const jobId = randomUUID();
    const jobIdempotencyKey = sha256hex(`${commission.commissionId}:verify_asset:${input.storageKey}`);
    await tx.update(coreIngestionCommissions).set({
      status: "queued",
      assetStorageKey: input.storageKey,
      assetContentType: input.declaredContentType ?? null,
      assetSizeBytes: input.declaredSizeBytes ?? null,
      failureCode: null,
      failureMessage: null,
    }).where(eq(coreIngestionCommissions.commissionId, commission.commissionId));
    await tx.insert(coreIngestionJobs).values({
      jobId,
      commissionId: commission.commissionId,
      stage: "verify_asset",
      status: "queued",
      idempotencyKey: jobIdempotencyKey,
    });

    return { commissionId: commission.commissionId, jobId, status: "queued" as const };
  });
}

export async function cancelCoreIngestionCommission(creatorId: number, commissionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx: any) => {
    const commission = await getOwnedCommission(tx, creatorId, commissionId);
    if (["inspection_ready", "failed", "cancelled"].includes(commission.status)) {
      return { commissionId, status: commission.status, idempotent: true };
    }
    const cancelledAt = new Date();
    await tx.update(coreIngestionCommissions).set({ status: "cancelled", cancelledAt }).where(eq(coreIngestionCommissions.commissionId, commissionId));
    await tx.update(coreIngestionJobs).set({ status: "cancelled", completedAt: cancelledAt, leaseExpiresAt: null })
      .where(and(
        eq(coreIngestionJobs.commissionId, commissionId),
        inArray(coreIngestionJobs.status, ["queued", "processing"]),
      ));
    return { commissionId, status: "cancelled" as const, idempotent: false };
  });
}

export async function getCoreIngestionCommission(creatorId: number, commissionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const commission = await getOwnedCommission(db, creatorId, commissionId);
  const [jobs, receipts] = await Promise.all([
    db.select().from(coreIngestionJobs).where(eq(coreIngestionJobs.commissionId, commissionId)).orderBy(asc(coreIngestionJobs.createdAt)),
    db.select().from(coreIngestionInspectionReceipts).where(eq(coreIngestionInspectionReceipts.commissionId, commissionId)).orderBy(desc(coreIngestionInspectionReceipts.createdAt)),
  ]);
  return { commission: toPublicCommission(commission), jobs, receipts };
}

export async function listCoreIngestionCommissions(creatorId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(coreIngestionCommissions)
    .where(eq(coreIngestionCommissions.creatorId, creatorId))
    .orderBy(desc(coreIngestionCommissions.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
  return rows.map(toPublicCommission);
}

async function inspectQueuedJob(job: typeof coreIngestionJobs.$inferSelect) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const commissionRows = await db.select().from(coreIngestionCommissions)
    .where(eq(coreIngestionCommissions.commissionId, job.commissionId)).limit(1);
  const commission = commissionRows[0];
  if (!commission || commission.status === "cancelled") {
    await db.update(coreIngestionJobs).set({ status: "cancelled", completedAt: new Date(), leaseExpiresAt: null })
      .where(eq(coreIngestionJobs.jobId, job.jobId));
    return "cancelled" as const;
  }
  if (!commission.assetStorageKey) {
    throw new IngestionFailure("ASSET_MISSING", "The Commission has no stored asset reference.", false);
  }

  const download = await storageGet(commission.assetStorageKey);
  const response = await fetch(download.url, { cache: "no-store" });
  if (!response.ok) {
    throw new IngestionFailure("ASSET_UNAVAILABLE", "The stored asset could not be verified.", response.status >= 500);
  }
  const statedLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(statedLength) && statedLength > CORE_INGESTION_MAX_BYTES) {
    throw new IngestionFailure("ASSET_TOO_LARGE", "The asset exceeds the I1 deterministic inspection size boundary.", false);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > CORE_INGESTION_MAX_BYTES) {
    throw new IngestionFailure("ASSET_TOO_LARGE", "The asset exceeds the I1 deterministic inspection size boundary.", false);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || commission.assetContentType || "application/octet-stream";
  if (!contentType.startsWith("audio/")) {
    throw new IngestionFailure("ASSET_TYPE_UNSUPPORTED", "I1 deterministic inspection currently accepts audio assets only.", false);
  }

  const rootAssetHash = sha256hex(buffer);
  const measuredFacts = {
    byteLength: buffer.byteLength,
    contentType,
    sha256: rootAssetHash,
    source: "storage_verified",
  };
  const receiptCanonical = JSON.stringify({
    commissionId: commission.commissionId,
    jobId: job.jobId,
    rootAssetHash,
    inspectionVersion: CORE_INGESTION_POLICY_VERSION,
    resultStatus: "succeeded",
    measuredFacts,
    derivedAssetRefs: [],
    warningCodes: [],
  });
  const receiptId = randomUUID();
  const receiptHash = sha256hex(receiptCanonical);
  const completedAt = new Date();

  const committed = await db.transaction(async (tx: any) => {
    const currentCommissionRows = await tx.select().from(coreIngestionCommissions)
      .where(eq(coreIngestionCommissions.commissionId, commission.commissionId)).limit(1);
    const currentJobRows = await tx.select().from(coreIngestionJobs)
      .where(eq(coreIngestionJobs.jobId, job.jobId)).limit(1);
    const currentCommission = currentCommissionRows[0];
    const currentJob = currentJobRows[0];
    if (!currentCommission || !currentJob || currentCommission.status === "cancelled" || currentJob.status === "cancelled") {
      return false;
    }
    if (currentCommission.status !== "inspecting" || currentJob.status !== "processing") {
      throw new IngestionFailure("JOB_STATE_CONFLICT", "The inspection job no longer holds a valid processing lease.", true);
    }
    await tx.insert(coreIngestionInspectionReceipts).values({
      receiptId,
      commissionId: commission.commissionId,
      jobId: job.jobId,
      rootAssetHash,
      inspectionVersion: CORE_INGESTION_POLICY_VERSION,
      resultStatus: "succeeded",
      measuredFacts,
      derivedAssetRefs: [],
      warningCodes: [],
      receiptHash,
      createdAt: completedAt,
    });
    await tx.update(coreIngestionJobs).set({
      status: "complete",
      rootAssetHash,
      completedAt,
      leaseExpiresAt: null,
      errorCode: null,
      errorMessage: null,
    }).where(eq(coreIngestionJobs.jobId, job.jobId));
    await tx.update(coreIngestionCommissions).set({
      status: "inspection_ready",
      assetContentType: contentType,
      assetSizeBytes: buffer.byteLength,
      assetSha256: rootAssetHash,
      inspectionReceiptId: receiptId,
      failureCode: null,
      failureMessage: null,
    }).where(eq(coreIngestionCommissions.commissionId, commission.commissionId));
    return true;
  });
  return committed ? "complete" as const : "cancelled" as const;
}

async function recordJobFailure(job: typeof coreIngestionJobs.$inferSelect, cause: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const failure = cause instanceof IngestionFailure
    ? cause
    : new IngestionFailure("INSPECTION_FAILED", "Deterministic asset inspection could not complete.", true);
  const attempts = job.attempts + 1;
  const terminal = !failure.retryable || attempts >= job.maxAttempts;
  const status = terminal ? "failed" : "queued" as const;
  await db.transaction(async (tx: any) => {
    await tx.update(coreIngestionJobs).set({
      status,
      attempts,
      leaseExpiresAt: null,
      startedAt: null,
      completedAt: terminal ? new Date() : null,
      errorCode: failure.code,
      errorMessage: failure.message,
    }).where(eq(coreIngestionJobs.jobId, job.jobId));
    if (terminal) {
      await tx.update(coreIngestionCommissions).set({
        status: "failed",
        failureCode: failure.code,
        failureMessage: failure.message,
      }).where(eq(coreIngestionCommissions.commissionId, job.commissionId));
    } else {
      await tx.update(coreIngestionCommissions).set({
        status: "queued",
        failureCode: failure.code,
        failureMessage: failure.message,
      }).where(and(
        eq(coreIngestionCommissions.commissionId, job.commissionId),
        eq(coreIngestionCommissions.status, "inspecting"),
      ));
    }
  });
  return terminal ? "failed" as const : "retried" as const;
}

/**
 * Scheduler-only worker. I1 never invokes this with an in-process timer and no
 * scheduler is created by this slice; deployment/Heartbeat approval remains a
 * separate operational decision.
 */
export async function processCoreIngestionBatch() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  // A deploy or timeout can strand a lease. Requeue only expired leases while
  // retaining their attempt count, so a recovery cannot become an infinite loop.
  await db.update(coreIngestionJobs).set({ status: "queued", startedAt: null, leaseExpiresAt: null })
    .where(and(
      eq(coreIngestionJobs.status, "processing"),
      lt(coreIngestionJobs.leaseExpiresAt, now),
      sql`${coreIngestionJobs.attempts} < ${coreIngestionJobs.maxAttempts}`,
    ));
  const candidates = await db.select().from(coreIngestionJobs).where(and(
    eq(coreIngestionJobs.status, "queued"),
    sql`${coreIngestionJobs.attempts} < ${coreIngestionJobs.maxAttempts}`,
  )).orderBy(asc(coreIngestionJobs.createdAt)).limit(CORE_INGESTION_BATCH_SIZE);

  const result = { completed: 0, retried: 0, failed: 0, cancelled: 0, skipped: 0 };
  for (const job of candidates) {
    const startedAt = new Date();
    const claim = await db.update(coreIngestionJobs).set({
      status: "processing",
      attempts: job.attempts + 1,
      startedAt,
      leaseExpiresAt: new Date(startedAt.getTime() + CORE_INGESTION_LEASE_MS),
    }).where(and(
      eq(coreIngestionJobs.jobId, job.jobId),
      eq(coreIngestionJobs.status, "queued"),
      eq(coreIngestionJobs.attempts, job.attempts),
    ));
    const claimed = (claim as any).affectedRows ?? (claim as any)[0]?.affectedRows ?? 0;
    if (!claimed) {
      result.skipped++;
      continue;
    }
    await db.update(coreIngestionCommissions).set({ status: "inspecting" }).where(and(
      eq(coreIngestionCommissions.commissionId, job.commissionId),
      eq(coreIngestionCommissions.status, "queued"),
    ));
    try {
      const outcome = await inspectQueuedJob(job);
      if (outcome === "complete") result.completed++;
      else result.cancelled++;
    } catch (cause) {
      const outcome = await recordJobFailure(job, cause);
      if (outcome === "failed") result.failed++;
      else result.retried++;
    }
  }
  return result;
}
