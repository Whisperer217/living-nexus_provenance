import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  batchUploadAssets,
  batchUploadItems,
  batchUploadOperations,
  songs,
  type BatchUploadAsset,
  type BatchUploadItem,
  type BatchUploadOperation,
} from "../../../drizzle/schema";
import { getDb } from "../../utils/db";
import {
  mayUseBatchAssetReceipt,
  type StorageEvidence,
} from "./evidenceContracts";

const SHA_256 = /^[a-f0-9]{64}$/i;
const ACTIVE_OPERATION_STATUSES = ["preparing", "assets_verified"] as const;
const TERMINAL_ITEM_STATUSES = ["registered", "recovered_existing"] as const;
type BatchAssetKind = "audio" | "cover";

export type BatchSourceReconciliation =
  | { state: "NO_REGISTERED_RECEIPT"; sourceSha256: string }
  | { state: "RECOVERED_EXISTING"; sourceSha256: string; recoverySource: "CANONICAL_WORK" | "BATCH_RECEIPT"; itemReceiptId?: string; songId: number; witnessId: string | null }
  | { state: "AMBIGUOUS"; sourceSha256: string; candidateItemReceiptIds: string[]; candidateSongIds: number[] };

function unavailable(): never {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Batch recovery service is unavailable." });
}

function normalizeSha256(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!SHA_256.test(normalized)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A complete SHA-256 value is required." });
  }
  return normalized;
}

function ensureActiveOperation(operation: BatchUploadOperation) {
  if (!ACTIVE_OPERATION_STATUSES.includes(operation.status as (typeof ACTIVE_OPERATION_STATUSES)[number])) {
    throw new TRPCError({ code: "CONFLICT", message: "This Batch operation cannot accept another asset receipt." });
  }
}

async function ownedOperation(operationId: string, creatorId: number) {
  const db = await getDb();
  if (!db) unavailable();
  const [operation] = await db.select().from(batchUploadOperations)
    .where(and(eq(batchUploadOperations.operationId, operationId), eq(batchUploadOperations.creatorId, creatorId)))
    .limit(1);
  if (!operation) throw new TRPCError({ code: "NOT_FOUND", message: "Private Batch operation not found." });
  return { db, operation };
}

function privateOperationProjection(operation: BatchUploadOperation) {
  return {
    operationId: operation.operationId,
    status: operation.status,
    policyVersion: operation.policyVersion,
    collectionName: operation.collectionName,
    failureCode: operation.failureCode,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
  };
}

function privateAssetProjection(asset: BatchUploadAsset) {
  return {
    assetReceiptId: asset.assetReceiptId,
    assetKind: asset.assetKind,
    sourceSha256: asset.sourceSha256,
    storedArtifactSha256: asset.storedArtifactSha256,
    storageTransformVersion: asset.storageTransformVersion,
    sourceBytes: asset.sourceBytes,
    storedBytes: asset.storedBytes,
    contentType: asset.contentType,
    status: asset.status,
    createdAt: asset.createdAt,
    consumedAt: asset.consumedAt,
  };
}

function privateItemProjection(item: BatchUploadItem) {
  return {
    itemReceiptId: item.itemReceiptId,
    clientCardId: item.clientCardId,
    audioAssetReceiptId: item.audioAssetReceiptId,
    coverAssetReceiptId: item.coverAssetReceiptId,
    sourceSha256: item.sourceSha256,
    status: item.status,
    songId: item.songId,
    witnessId: item.witnessId,
    failureCode: item.failureCode,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function createPrivateBatchOperation(input: {
  creatorId: number;
  collectionName?: string;
  intendedMetadataHash?: string;
}) {
  const db = await getDb();
  if (!db) unavailable();
  const operationId = nanoid(24);
  const intendedMetadataHash = input.intendedMetadataHash ? normalizeSha256(input.intendedMetadataHash) : null;
  await db.insert(batchUploadOperations).values({
    operationId,
    creatorId: input.creatorId,
    collectionName: input.collectionName?.trim() || null,
    intendedMetadataHash,
  });
  const [operation] = await db.select().from(batchUploadOperations)
    .where(and(eq(batchUploadOperations.operationId, operationId), eq(batchUploadOperations.creatorId, input.creatorId)))
    .limit(1);
  if (!operation) unavailable();
  return privateOperationProjection(operation);
}

export async function getPrivateBatchOperation(operationId: string, creatorId: number) {
  const { db, operation } = await ownedOperation(operationId, creatorId);
  const [assets, items] = await Promise.all([
    db.select().from(batchUploadAssets)
      .where(and(eq(batchUploadAssets.operationId, operationId), eq(batchUploadAssets.creatorId, creatorId))),
    db.select().from(batchUploadItems)
      .where(and(eq(batchUploadItems.operationId, operationId), eq(batchUploadItems.creatorId, creatorId))),
  ]);
  return {
    operation: privateOperationProjection(operation),
    assets: assets.map(privateAssetProjection),
    items: items.map(privateItemProjection),
  };
}

export async function cancelPrivateBatchOperation(operationId: string, creatorId: number) {
  const { db, operation } = await ownedOperation(operationId, creatorId);
  if (operation.status === "completed" || operation.status === "cancelled") {
    throw new TRPCError({ code: "CONFLICT", message: "This Batch operation is already closed." });
  }
  await db.update(batchUploadOperations).set({ status: "cancelled", failureCode: null })
    .where(and(eq(batchUploadOperations.operationId, operationId), eq(batchUploadOperations.creatorId, creatorId)));
  await db.update(batchUploadItems).set({ status: "cancelled" })
    .where(and(
      eq(batchUploadItems.operationId, operationId),
      eq(batchUploadItems.creatorId, creatorId),
      inArray(batchUploadItems.status, ["asset_pending", "asset_verified", "failed", "evidence_mismatch", "ambiguous"]),
    ));
  return { operationId, status: "cancelled" as const };
}

/**
 * Internal-only bridge from the authenticated multipart upload route. It receives
 * server-created storage facts and never accepts a browser-supplied storage URL as
 * proof. H3 may use the returned receipt ID in the private Batch client.
 */
export async function bindVerifiedBatchAsset(input: {
  operationId: string;
  creatorId: number;
  clientCardId: string;
  assetKind: BatchAssetKind;
  storageKey: string;
  storageUrl: string;
  contentType: string;
  evidence: StorageEvidence;
}) {
  const { db, operation } = await ownedOperation(input.operationId, input.creatorId);
  ensureActiveOperation(operation);
  const sourceSha256 = normalizeSha256(input.evidence.sourceSha256);
  const existingAssets = await db.select().from(batchUploadAssets)
    .where(and(
      eq(batchUploadAssets.operationId, input.operationId),
      eq(batchUploadAssets.creatorId, input.creatorId),
      eq(batchUploadAssets.sourceSha256, sourceSha256),
      eq(batchUploadAssets.assetKind, input.assetKind),
    ))
    .limit(1);
  const asset = existingAssets[0] ?? await (async () => {
    const assetReceiptId = nanoid(24);
    await db.insert(batchUploadAssets).values({
      assetReceiptId,
      operationId: input.operationId,
      creatorId: input.creatorId,
      assetKind: input.assetKind,
      storageKey: input.storageKey,
      storageUrl: input.storageUrl,
      sourceSha256,
      storedArtifactSha256: normalizeSha256(input.evidence.storedArtifactSha256),
      storageTransformVersion: input.evidence.storageTransformVersion,
      sourceBytes: input.evidence.sourceBytes,
      storedBytes: input.evidence.storedBytes,
      contentType: input.contentType,
    });
    const [created] = await db.select().from(batchUploadAssets)
      .where(and(eq(batchUploadAssets.assetReceiptId, assetReceiptId), eq(batchUploadAssets.creatorId, input.creatorId)))
      .limit(1);
    if (!created) unavailable();
    return created;
  })();

  const [existingItem] = await db.select().from(batchUploadItems)
    .where(and(
      eq(batchUploadItems.operationId, input.operationId),
      eq(batchUploadItems.creatorId, input.creatorId),
      eq(batchUploadItems.clientCardId, input.clientCardId),
    ))
    .limit(1);
  const itemReceiptId = existingItem?.itemReceiptId ?? nanoid(24);
  const itemValues = input.assetKind === "audio"
    ? { audioAssetReceiptId: asset.assetReceiptId, sourceSha256, status: "asset_verified" as const }
    : { coverAssetReceiptId: asset.assetReceiptId };
  if (existingItem) {
    if (existingItem.status === "registered" || existingItem.status === "recovered_existing") {
      throw new TRPCError({ code: "CONFLICT", message: "The Batch item has already reached a terminal state." });
    }
    await db.update(batchUploadItems).set(itemValues)
      .where(and(eq(batchUploadItems.itemReceiptId, existingItem.itemReceiptId), eq(batchUploadItems.creatorId, input.creatorId)));
  } else {
    await db.insert(batchUploadItems).values({
      itemReceiptId,
      operationId: input.operationId,
      creatorId: input.creatorId,
      clientCardId: input.clientCardId,
      ...itemValues,
    });
  }
  await db.update(batchUploadOperations).set({ status: "assets_verified" })
    .where(and(eq(batchUploadOperations.operationId, input.operationId), eq(batchUploadOperations.creatorId, input.creatorId)));
  return {
    operationId: input.operationId,
    asset: privateAssetProjection(asset),
    itemReceiptId,
  };
}

export function classifyRegisteredBatchItems(input: {
  sourceSha256: string;
  items: Array<Pick<BatchUploadItem, "itemReceiptId" | "sourceSha256" | "status" | "songId" | "witnessId">>;
}): BatchSourceReconciliation {
  const sourceSha256 = normalizeSha256(input.sourceSha256);
  const candidates = input.items.filter((item) =>
    item.sourceSha256?.toLowerCase() === sourceSha256
    && TERMINAL_ITEM_STATUSES.includes(item.status as (typeof TERMINAL_ITEM_STATUSES)[number])
    && typeof item.songId === "number",
  );
  if (candidates.length === 0) return { state: "NO_REGISTERED_RECEIPT", sourceSha256 };
  if (candidates.length > 1) {
    return {
      state: "AMBIGUOUS",
      sourceSha256,
      candidateItemReceiptIds: candidates.map((item) => item.itemReceiptId),
      candidateSongIds: [],
    };
  }
  const item = candidates[0];
  return {
    state: "RECOVERED_EXISTING",
    sourceSha256,
    recoverySource: "BATCH_RECEIPT",
    itemReceiptId: item.itemReceiptId,
    songId: item.songId!,
    witnessId: item.witnessId ?? null,
  };
}

export async function reconcilePrivateBatchSource(input: { operationId: string; creatorId: number; sourceSha256: string }) {
  const { db } = await ownedOperation(input.operationId, input.creatorId);
  const sourceSha256 = normalizeSha256(input.sourceSha256);
  const canonicalCandidates = await db.select({ id: songs.id, witnessId: songs.witnessId }).from(songs)
    .where(and(eq(songs.userId, input.creatorId), eq(songs.fileHash, sourceSha256)));
  if (canonicalCandidates.length > 1) {
    return {
      state: "AMBIGUOUS" as const,
      sourceSha256,
      candidateItemReceiptIds: [],
      candidateSongIds: canonicalCandidates.map((candidate: { id: number }) => candidate.id),
    };
  }
  if (canonicalCandidates.length === 1) {
    const candidate = canonicalCandidates[0] as { id: number; witnessId: string | null };
    const [item] = await db.select().from(batchUploadItems)
      .where(and(
        eq(batchUploadItems.operationId, input.operationId),
        eq(batchUploadItems.creatorId, input.creatorId),
        eq(batchUploadItems.sourceSha256, sourceSha256),
      ))
      .limit(1);
    if (item && item.status !== "registered" && item.status !== "recovered_existing") {
      await db.update(batchUploadItems).set({
        status: "recovered_existing",
        songId: candidate.id,
        witnessId: candidate.witnessId,
        failureCode: null,
      }).where(and(eq(batchUploadItems.itemReceiptId, item.itemReceiptId), eq(batchUploadItems.creatorId, input.creatorId)));
    }
    return {
      state: "RECOVERED_EXISTING" as const,
      sourceSha256,
      recoverySource: "CANONICAL_WORK" as const,
      itemReceiptId: item?.itemReceiptId,
      songId: candidate.id,
      witnessId: candidate.witnessId,
    };
  }
  const sourceAssets = await db.select({ assetReceiptId: batchUploadAssets.assetReceiptId }).from(batchUploadAssets)
    .where(and(
      eq(batchUploadAssets.creatorId, input.creatorId),
      eq(batchUploadAssets.sourceSha256, sourceSha256),
      inArray(batchUploadAssets.status, ["verified", "consumed"]),
    ));
  if (sourceAssets.length === 0) return { state: "NO_REGISTERED_RECEIPT" as const, sourceSha256 };
  const sourceAssetReceiptIds = sourceAssets.map((asset: { assetReceiptId: string }) => asset.assetReceiptId);
  const items: BatchUploadItem[] = await db.select().from(batchUploadItems)
    .where(and(
      eq(batchUploadItems.creatorId, input.creatorId),
      inArray(batchUploadItems.audioAssetReceiptId, sourceAssetReceiptIds),
    ));
  const receiptResult = classifyRegisteredBatchItems({ sourceSha256, items });
  if (receiptResult.state === "AMBIGUOUS") return { ...receiptResult, candidateSongIds: [] };
  return receiptResult;
}

export async function getPrivateCollectionFinalizationReadiness(operationId: string, creatorId: number) {
  const { db, operation } = await ownedOperation(operationId, creatorId);
  const items: BatchUploadItem[] = await db.select().from(batchUploadItems)
    .where(and(eq(batchUploadItems.operationId, operationId), eq(batchUploadItems.creatorId, creatorId)));
  const registeredItems = items.filter((item) => TERMINAL_ITEM_STATUSES.includes(item.status as (typeof TERMINAL_ITEM_STATUSES)[number]));
  const hasPending = items.some((item) => !TERMINAL_ITEM_STATUSES.includes(item.status as (typeof TERMINAL_ITEM_STATUSES)[number]));
  return {
    operationId,
    collectionName: operation.collectionName,
    itemCount: items.length,
    registeredItemCount: registeredItems.length,
    readyForExplicitFinalization: items.length > 0 && !hasPending && registeredItems.length === items.length,
    reason: items.length === 0 ? "NO_REGISTERED_BATCH_ITEMS" : hasPending ? "BATCH_ITEMS_NOT_TERMINAL" : "READY_FOR_EXPLICIT_FINALIZATION",
    note: "This is a private readiness projection only. It does not create a collection, compute a collection WID, or link a Work.",
  };
}

export function mayBindVerifiedReceipt(input: {
  receipt: Parameters<typeof mayUseBatchAssetReceipt>[0];
  expectation: Parameters<typeof mayUseBatchAssetReceipt>[1];
}) {
  return mayUseBatchAssetReceipt(input.receipt, input.expectation);
}
