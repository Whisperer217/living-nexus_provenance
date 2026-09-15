import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyRegisteredBatchItems } from "../domains/batchUpload/service";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

describe("H2 Batch Upload protected-service contracts", () => {
  it("reconciles only one terminal item with the same full source hash", () => {
    expect(classifyRegisteredBatchItems({
      sourceSha256: HASH_A,
      items: [{ itemReceiptId: "one", sourceSha256: HASH_A, status: "registered", songId: 42, witnessId: "WID-MUS-TEST" }],
    })).toEqual({ state: "RECOVERED_EXISTING", sourceSha256: HASH_A, recoverySource: "BATCH_RECEIPT", itemReceiptId: "one", songId: 42, witnessId: "WID-MUS-TEST" });
  });

  it("never chooses across multiple terminal receipt candidates", () => {
    expect(classifyRegisteredBatchItems({
      sourceSha256: HASH_A,
      items: [
        { itemReceiptId: "one", sourceSha256: HASH_A, status: "registered", songId: 42, witnessId: "WID-MUS-ONE" },
        { itemReceiptId: "two", sourceSha256: HASH_A, status: "recovered_existing", songId: 43, witnessId: "WID-MUS-TWO" },
      ],
    })).toEqual({ state: "AMBIGUOUS", sourceSha256: HASH_A, candidateItemReceiptIds: ["one", "two"], candidateSongIds: [] });
  });

  it("does not treat a different full source hash or nonterminal receipt as a retry", () => {
    expect(classifyRegisteredBatchItems({
      sourceSha256: HASH_A,
      items: [
        { itemReceiptId: "different", sourceSha256: HASH_B, status: "registered", songId: 42, witnessId: "WID-MUS-OTHER" },
        { itemReceiptId: "pending", sourceSha256: HASH_A, status: "asset_verified", songId: null, witnessId: null },
      ],
    })).toEqual({ state: "NO_REGISTERED_RECEIPT", sourceSha256: HASH_A });
  });

  it("requires canonical same-creator full-hash candidates to be checked before receipt recovery", () => {
    const service = readFileSync(resolve(process.cwd(), "server/domains/batchUpload/service.ts"), "utf8");
    expect(service).toContain("eq(songs.userId, input.creatorId)");
    expect(service).toContain("eq(songs.fileHash, sourceSha256)");
    expect(service).toContain("if (canonicalCandidates.length > 1)");
    expect(service).toContain('recoverySource: "CANONICAL_WORK"');
    expect(service).not.toContain("getSongByWitnessId");
  });

  it("binds Batch assets only from server-produced upload evidence and returns non-content receipt errors", () => {
    const route = readFileSync(resolve(process.cwd(), "server/routes/uploadRoute.ts"), "utf8");
    expect(route).toContain("bindVerifiedBatchAsset");
    expect(route).toContain("evidence: result.evidence");
    expect(route).toContain("ERR_BATCH_OPERATION_NOT_FOUND");
    expect(route).toContain("ERR_BATCH_OPERATION_CONFLICT");
    expect(route).not.toContain("batchStorageUrl");
    expect(route).not.toContain("batchStorageKey");
  });

  it("keeps protected H2 services separate from Work, WID, and collection writers", () => {
    const source = readFileSync(resolve(process.cwd(), "server/routers/batchUpload.ts"), "utf8");
    const service = readFileSync(resolve(process.cwd(), "server/domains/batchUpload/service.ts"), "utf8");
    expect(source).toContain("protectedProcedure");
    expect(source).not.toContain("createSong");
    expect(source).not.toContain("createCollection");
    expect(source).not.toContain("linkSongsToCollection");
    expect(source).not.toContain("witnessId:");
    expect(service).toContain("getPrivateCollectionFinalizationReadiness");
    expect(service).toContain("readyForExplicitFinalization");
    expect(service).toContain("does not create a collection");
    expect(service).not.toContain("createSong");
    expect(service).not.toContain("createCollection");
    expect(service).not.toContain("linkSongsToCollection");
  });
});
