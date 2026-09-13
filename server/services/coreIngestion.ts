/**
 * Core Ingestion Commission — I1 deterministic foundation.
 *
 * This service owns only creator-scoped Commission, job, and inspection receipt
 * records. It does not create a Work, WID, provenance event, publication,
 * Quiver record, PNA record, marketplace record, or AI/provider request.
 */
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  coreIngestionCommissions,
  coreIngestionDraftConfirmations,
  coreIngestionDraftProposals,
  coreIngestionInspectionReceipts,
  coreIngestionJobs,
  coreIngestionPrivateDrafts,
  songs,
} from "../../drizzle/schema";
import { storageGet } from "../utils/storage";
import { getDb } from "../utils/db";

export const CORE_INGESTION_POLICY_VERSION = "core.ingestion.v1";
export const CORE_INGESTION_REVIEW_VERSION = "core.ingestion.review.v1";
const CORE_INGESTION_MAX_BYTES = 64 * 1024 * 1024;
const CORE_INGESTION_BATCH_SIZE = 3;
const CORE_INGESTION_LEASE_MS = 90_000;
const CORE_INGESTION_PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000;
const CORE_INGESTION_CONFIRMATION_TTL_MS = 15 * 60 * 1000;

type RequestedOutcome = "private_draft" | "registration_review";

export type CoreIngestionOwnedAudioAsset = {
  sourceSongId: number;
  title: string;
  durationSeconds: number | null;
  status: string;
  assetHashHint: string | null;
  createdAt: Date;
};

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

function sameDigest(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function proposalSnapshot(receipt: typeof coreIngestionInspectionReceipts.$inferSelect) {
  return {
    source: "core_ingestion_inspection_receipt",
    inspectionVersion: receipt.inspectionVersion,
    resultStatus: receipt.resultStatus,
    asset: {
      sha256: receipt.rootAssetHash,
      measuredFacts: receipt.measuredFacts,
    },
    inspectionReceipt: {
      receiptId: receipt.receiptId,
      receiptHash: receipt.receiptHash,
      createdAt: receipt.createdAt.toISOString(),
    },
  };
}

function proposalDigest(input: {
  commissionId: string;
  receiptId: string;
  rootAssetHash: string;
  receiptHash: string;
  technicalSnapshot: Record<string, unknown>;
}) {
  return sha256hex(JSON.stringify({
    commissionId: input.commissionId,
    receiptId: input.receiptId,
    rootAssetHash: input.rootAssetHash,
    receiptHash: input.receiptHash,
    proposalVersion: CORE_INGESTION_REVIEW_VERSION,
    technicalSnapshot: input.technicalSnapshot,
  }));
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

/**
 * A creator-private projection of already-owned audio assets. This reads only
 * the minimal source-selection fields; it does not alter the canonical Work,
 * status, WID, provenance, visibility, AI permission, or upload record.
 */
export async function listOwnedCoreIngestionAudioAssets(creatorId: number, limit = 30): Promise<CoreIngestionOwnedAudioAsset[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({
    sourceSongId: songs.id,
    title: songs.title,
    fileKey: songs.fileKey,
    fileHash: songs.fileHash,
    durationSeconds: songs.durationSeconds,
    status: songs.status,
    createdAt: songs.createdAt,
  }).from(songs).where(and(
    eq(songs.userId, creatorId),
    eq(songs.contentType, "audio"),
  )).orderBy(desc(songs.createdAt)).limit(Math.min(Math.max(limit, 1), 50));

  const candidates = rows as Array<{
    sourceSongId: number;
    title: string;
    fileKey: string | null;
    fileHash: string | null;
    durationSeconds: number | null;
    status: string;
    createdAt: Date;
  }>;
  return candidates.filter((row) => Boolean(row.fileKey) && row.fileKey!.startsWith(`audio/${creatorId}/`)).map((row) => ({
    sourceSongId: row.sourceSongId,
    title: row.title,
    durationSeconds: row.durationSeconds,
    status: row.status,
    assetHashHint: row.fileHash ?? null,
    createdAt: row.createdAt,
  }));
}

async function getOwnedCoreIngestionAudioAsset(db: any, creatorId: number, sourceSongId: number) {
  const rows = await db.select({
    sourceSongId: songs.id,
    fileKey: songs.fileKey,
    title: songs.title,
  }).from(songs).where(and(
    eq(songs.id, sourceSongId),
    eq(songs.userId, creatorId),
    eq(songs.contentType, "audio"),
  )).limit(1);
  const asset = rows[0];
  if (!asset || !asset.fileKey || !asset.fileKey.startsWith(`audio/${creatorId}/`)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Owned audio asset not found for this Creator Domain." });
  }
  return asset;
}

/**
 * Starts a Commission and attaches exactly one pre-existing, creator-owned
 * audio source. It never writes to the source Work; source selection is only
 * a convenience bridge into I1's existing storage-key inspection boundary.
 */
export async function startCoreIngestionFromOwnedAudioAsset(
  creatorId: number,
  input: { sourceSongId: number; requestedOutcome: RequestedOutcome; idempotencyKey: string },
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const asset = await getOwnedCoreIngestionAudioAsset(db, creatorId, input.sourceSongId);
  const commission = await startCoreIngestionCommission(creatorId, {
    requestedOutcome: input.requestedOutcome,
    idempotencyKey: input.idempotencyKey,
  });
  if (commission.assetStorageKey) {
    if (commission.assetStorageKey !== asset.fileKey) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This idempotency key already belongs to a Commission with a different selected audio asset.",
      });
    }
    return { commissionId: commission.commissionId, status: commission.status, idempotent: true };
  }
  const attachment = await attachCoreIngestionAsset(creatorId, {
    commissionId: commission.commissionId,
    storageKey: asset.fileKey,
  });
  return { commissionId: attachment.commissionId, status: attachment.status, idempotent: commission.idempotent };
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
  const [jobs, receipts, proposals, privateDrafts] = await Promise.all([
    db.select().from(coreIngestionJobs).where(eq(coreIngestionJobs.commissionId, commissionId)).orderBy(asc(coreIngestionJobs.createdAt)),
    db.select().from(coreIngestionInspectionReceipts).where(eq(coreIngestionInspectionReceipts.commissionId, commissionId)).orderBy(desc(coreIngestionInspectionReceipts.createdAt)),
    db.select().from(coreIngestionDraftProposals).where(and(
      eq(coreIngestionDraftProposals.commissionId, commissionId),
      eq(coreIngestionDraftProposals.creatorId, creatorId),
    )).orderBy(desc(coreIngestionDraftProposals.createdAt)),
    db.select().from(coreIngestionPrivateDrafts).where(and(
      eq(coreIngestionPrivateDrafts.commissionId, commissionId),
      eq(coreIngestionPrivateDrafts.creatorId, creatorId),
    )).limit(1),
  ]);
  return { commission: toPublicCommission(commission), jobs, receipts, proposals, privateDraft: privateDrafts[0] ?? null };
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

export async function offerCoreIngestionDraftProposal(creatorId: number, commissionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx: any) => {
    const commission = await getOwnedCommission(tx, creatorId, commissionId);
    if (commission.status !== "inspection_ready" || !commission.inspectionReceiptId || !commission.assetSha256) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A successful deterministic inspection is required before a private Commission Draft can be proposed.",
      });
    }
    const receiptRows = await tx.select().from(coreIngestionInspectionReceipts).where(and(
      eq(coreIngestionInspectionReceipts.receiptId, commission.inspectionReceiptId),
      eq(coreIngestionInspectionReceipts.commissionId, commission.commissionId),
    )).limit(1);
    const receipt = receiptRows[0];
    if (!receipt || receipt.resultStatus !== "succeeded" || receipt.rootAssetHash !== commission.assetSha256) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The inspection receipt cannot support a private Draft proposal." });
    }

    const now = new Date();
    const technicalSnapshot = proposalSnapshot(receipt);
    const proposalHash = proposalDigest({
      commissionId: commission.commissionId,
      receiptId: receipt.receiptId,
      rootAssetHash: receipt.rootAssetHash,
      receiptHash: receipt.receiptHash,
      technicalSnapshot,
    });
    const expiresAt = new Date(now.getTime() + CORE_INGESTION_PROPOSAL_TTL_MS);
    const existingRows = await tx.select().from(coreIngestionDraftProposals).where(and(
      eq(coreIngestionDraftProposals.commissionId, commission.commissionId),
      eq(coreIngestionDraftProposals.receiptId, receipt.receiptId),
    )).limit(1);
    const existing = existingRows[0];
    if (existing) {
      if (existing.status === "confirmed" || (existing.status === "offered" && existing.expiresAt > now)) {
        return { proposal: existing, idempotent: true };
      }
      await tx.update(coreIngestionDraftProposals).set({
        status: "offered",
        technicalSnapshot,
        proposalHash,
        expiresAt,
        confirmedAt: null,
        dismissedAt: null,
      }).where(eq(coreIngestionDraftProposals.proposalId, existing.proposalId));
      const renewedRows = await tx.select().from(coreIngestionDraftProposals)
        .where(eq(coreIngestionDraftProposals.proposalId, existing.proposalId)).limit(1);
      return { proposal: renewedRows[0], idempotent: false };
    }

    const proposalId = randomUUID();
    await tx.insert(coreIngestionDraftProposals).values({
      proposalId,
      commissionId: commission.commissionId,
      creatorId,
      receiptId: receipt.receiptId,
      rootAssetHash: receipt.rootAssetHash,
      receiptHash: receipt.receiptHash,
      proposalVersion: CORE_INGESTION_REVIEW_VERSION,
      status: "offered",
      technicalSnapshot,
      proposalHash,
      expiresAt,
    });
    const proposalRows = await tx.select().from(coreIngestionDraftProposals)
      .where(eq(coreIngestionDraftProposals.proposalId, proposalId)).limit(1);
    return { proposal: proposalRows[0], idempotent: false };
  });
}

async function getOwnedDraftProposal(db: any, creatorId: number, proposalId: string) {
  const rows = await db.select().from(coreIngestionDraftProposals).where(and(
    eq(coreIngestionDraftProposals.proposalId, proposalId),
    eq(coreIngestionDraftProposals.creatorId, creatorId),
  )).limit(1);
  const proposal = rows[0];
  if (!proposal) throw new TRPCError({ code: "NOT_FOUND", message: "Private Commission Draft proposal not found." });
  return proposal;
}

export async function issueCoreIngestionDraftConfirmation(creatorId: number, proposalId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx: any) => {
    const proposal = await getOwnedDraftProposal(tx, creatorId, proposalId);
    const now = new Date();
    if (proposal.status === "offered" && proposal.expiresAt <= now) {
      await tx.update(coreIngestionDraftProposals).set({ status: "expired" })
        .where(eq(coreIngestionDraftProposals.proposalId, proposal.proposalId));
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This private Draft proposal has expired. Review the Commission again to create a new proposal." });
    }
    if (proposal.status !== "offered") {
      throw new TRPCError({ code: "CONFLICT", message: "This private Draft proposal is no longer available for confirmation." });
    }

    await tx.update(coreIngestionDraftConfirmations).set({ status: "revoked", revokedAt: now })
      .where(and(
        eq(coreIngestionDraftConfirmations.proposalId, proposal.proposalId),
        eq(coreIngestionDraftConfirmations.status, "issued"),
      ));
    const confirmationId = randomUUID();
    const confirmationToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + CORE_INGESTION_CONFIRMATION_TTL_MS);
    await tx.insert(coreIngestionDraftConfirmations).values({
      confirmationId,
      proposalId: proposal.proposalId,
      commissionId: proposal.commissionId,
      creatorId,
      tokenHash: sha256hex(confirmationToken),
      status: "issued",
      expiresAt,
    });
    return { confirmationId, confirmationToken, expiresAt, proposalId: proposal.proposalId };
  });
}

export async function confirmCoreIngestionPrivateDraft(input: {
  creatorId: number;
  proposalId: string;
  confirmationId: string;
  confirmationToken: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async (tx: any) => {
    const proposal = await getOwnedDraftProposal(tx, input.creatorId, input.proposalId);
    const confirmationRows = await tx.select().from(coreIngestionDraftConfirmations).where(and(
      eq(coreIngestionDraftConfirmations.confirmationId, input.confirmationId),
      eq(coreIngestionDraftConfirmations.proposalId, proposal.proposalId),
      eq(coreIngestionDraftConfirmations.creatorId, input.creatorId),
    )).limit(1);
    const confirmation = confirmationRows[0];
    if (!confirmation || !sameDigest(confirmation.tokenHash, sha256hex(input.confirmationToken))) {
      throw new TRPCError({ code: "NOT_FOUND", message: "The private Draft confirmation is invalid or unavailable." });
    }
    const now = new Date();
    if (confirmation.status === "consumed") {
      const existingRows = await tx.select().from(coreIngestionPrivateDrafts).where(eq(
        coreIngestionPrivateDrafts.confirmationId,
        confirmation.confirmationId,
      )).limit(1);
      if (existingRows[0]) return { privateDraft: existingRows[0], idempotent: true };
      throw new TRPCError({ code: "CONFLICT", message: "This private Draft confirmation has already been consumed." });
    }
    if (confirmation.status !== "issued" || confirmation.expiresAt <= now || proposal.expiresAt <= now || proposal.status !== "offered") {
      if (confirmation.status === "issued" && confirmation.expiresAt <= now) {
        await tx.update(coreIngestionDraftConfirmations).set({ status: "expired" })
          .where(eq(coreIngestionDraftConfirmations.confirmationId, confirmation.confirmationId));
      }
      if (proposal.status === "offered" && proposal.expiresAt <= now) {
        await tx.update(coreIngestionDraftProposals).set({ status: "expired" })
          .where(eq(coreIngestionDraftProposals.proposalId, proposal.proposalId));
      }
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This private Draft confirmation is no longer valid. Review the Commission again before confirming." });
    }

    const existingByCommission = await tx.select().from(coreIngestionPrivateDrafts).where(eq(
      coreIngestionPrivateDrafts.commissionId,
      proposal.commissionId,
    )).limit(1);
    if (existingByCommission[0]) {
      throw new TRPCError({ code: "CONFLICT", message: "This Commission already has a private Draft." });
    }
    const privateDraftId = randomUUID();
    await tx.insert(coreIngestionPrivateDrafts).values({
      privateDraftId,
      commissionId: proposal.commissionId,
      proposalId: proposal.proposalId,
      confirmationId: confirmation.confirmationId,
      creatorId: input.creatorId,
      rootAssetHash: proposal.rootAssetHash,
      receiptHash: proposal.receiptHash,
      draftState: "private_review",
      technicalSnapshot: proposal.technicalSnapshot,
    });
    await tx.update(coreIngestionDraftConfirmations).set({ status: "consumed", consumedAt: now })
      .where(eq(coreIngestionDraftConfirmations.confirmationId, confirmation.confirmationId));
    await tx.update(coreIngestionDraftProposals).set({ status: "confirmed", confirmedAt: now })
      .where(eq(coreIngestionDraftProposals.proposalId, proposal.proposalId));
    const privateDraftRows = await tx.select().from(coreIngestionPrivateDrafts)
      .where(eq(coreIngestionPrivateDrafts.privateDraftId, privateDraftId)).limit(1);
    return { privateDraft: privateDraftRows[0], idempotent: false };
  });
}

export async function dismissCoreIngestionDraftProposal(creatorId: number, proposalId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async (tx: any) => {
    const proposal = await getOwnedDraftProposal(tx, creatorId, proposalId);
    if (proposal.status !== "offered") return { proposalId, status: proposal.status, idempotent: true };
    const now = new Date();
    await tx.update(coreIngestionDraftProposals).set({ status: "dismissed", dismissedAt: now })
      .where(eq(coreIngestionDraftProposals.proposalId, proposal.proposalId));
    await tx.update(coreIngestionDraftConfirmations).set({ status: "revoked", revokedAt: now })
      .where(and(
        eq(coreIngestionDraftConfirmations.proposalId, proposal.proposalId),
        eq(coreIngestionDraftConfirmations.status, "issued"),
      ));
    return { proposalId, status: "dismissed" as const, idempotent: false };
  });
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
