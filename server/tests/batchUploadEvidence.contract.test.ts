import { describe, expect, it } from "vitest";
import {
  createStorageEvidence,
  mayUseBatchAssetReceipt,
  sha256Hex,
} from "../domains/batchUpload/evidenceContracts";
import {
  batchUploadAssets,
  batchUploadItems,
  batchUploadOperations,
  songs,
} from "../../drizzle/schema";

describe("Batch Upload H1 evidence foundation", () => {
  it("records source and stored byte digests as independent facts", () => {
    const source = Buffer.from("creator-source-with-metadata");
    const stored = Buffer.from("canonical-audio-without-metadata");
    const evidence = createStorageEvidence(source, stored, "audio-metadata-strip-v1");

    expect(evidence.sourceSha256).toBe(sha256Hex(source));
    expect(evidence.storedArtifactSha256).toBe(sha256Hex(stored));
    expect(evidence.sourceSha256).not.toBe(evidence.storedArtifactSha256);
    expect(evidence.storageTransformVersion).toBe("audio-metadata-strip-v1");
  });

  it("allows only a verified receipt for the same creator, operation, and asset kind", () => {
    const receipt = { creatorId: 42, operationId: "batch-1", assetKind: "audio" as const, status: "verified" as const };
    expect(mayUseBatchAssetReceipt(receipt, { creatorId: 42, operationId: "batch-1", assetKind: "audio" })).toBe(true);
    expect(mayUseBatchAssetReceipt(receipt, { creatorId: 43, operationId: "batch-1", assetKind: "audio" })).toBe(false);
    expect(mayUseBatchAssetReceipt({ ...receipt, status: "consumed" }, { creatorId: 42, operationId: "batch-1", assetKind: "audio" })).toBe(false);
    expect(mayUseBatchAssetReceipt(receipt, { creatorId: 42, operationId: "batch-2", assetKind: "audio" })).toBe(false);
  });

  it("rejects non-versioned storage-transform labels", () => {
    expect(() => createStorageEvidence(Buffer.from("a"), Buffer.from("a"), "bad transform")).toThrow("Invalid storage transform version");
  });

  it("declares additive private recovery receipts and prospective stored-byte evidence", () => {
    expect(songs.storedArtifactHash.name).toBe("storedArtifactHash");
    expect(songs.storageTransformVersion.name).toBe("storageTransformVersion");
    expect(batchUploadOperations.operationId.name).toBe("operationId");
    expect(batchUploadAssets.assetReceiptId.name).toBe("assetReceiptId");
    expect(batchUploadItems.itemReceiptId.name).toBe("itemReceiptId");
    expect(batchUploadItems.witnessId.name).toBe("witnessId");
  });
});
