import { createHash } from "crypto";

/**
 * H1 contract: a creator's submitted source bytes and the canonical persisted
 * artifact can differ after controlled processing. They are deliberately
 * recorded as two facts rather than silently conflated into one WID claim.
 */
export type StorageEvidence = {
  sourceSha256: string;
  storedArtifactSha256: string;
  storageTransformVersion: string;
  sourceBytes: number;
  storedBytes: number;
};

export type BatchAssetReceiptScope = {
  creatorId: number;
  operationId: string;
  assetKind: "audio" | "cover";
  status: "verified" | "consumed" | "revoked";
};

export type BatchAssetReceiptExpectation = Pick<BatchAssetReceiptScope, "creatorId" | "operationId" | "assetKind">;

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createStorageEvidence(
  sourceBytes: Uint8Array,
  storedBytes: Uint8Array,
  storageTransformVersion: string,
): StorageEvidence {
  if (!/^[-a-z0-9.]{1,64}$/i.test(storageTransformVersion)) {
    throw new Error("Invalid storage transform version");
  }

  return {
    sourceSha256: sha256Hex(sourceBytes),
    storedArtifactSha256: sha256Hex(storedBytes),
    storageTransformVersion,
    sourceBytes: sourceBytes.byteLength,
    storedBytes: storedBytes.byteLength,
  };
}

/**
 * Prepared for H2: an operation may consume only its own verified receipt.
 * H1 intentionally provides no procedure that creates or consumes a receipt.
 */
export function mayUseBatchAssetReceipt(
  receipt: BatchAssetReceiptScope,
  expected: BatchAssetReceiptExpectation,
): boolean {
  return receipt.status === "verified"
    && receipt.creatorId === expected.creatorId
    && receipt.operationId === expected.operationId
    && receipt.assetKind === expected.assetKind;
}
