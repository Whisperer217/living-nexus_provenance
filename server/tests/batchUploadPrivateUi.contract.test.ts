import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const pageSource = fs.readFileSync(
  path.resolve(process.cwd(), "client/src/pages/BatchUploadPage.tsx"),
  "utf8",
);

describe("private Batch Upload UI contract", () => {
  it("uses protected H2 operation and recovery services instead of the legacy registration mutation", () => {
    expect(pageSource).toContain("trpc.batchUpload.createOperation.useMutation()");
    expect(pageSource).toContain("batchUtils.batchUpload.reconcileSource.fetch");
    expect(pageSource).toContain("batchUtils.batchUpload.collectionFinalizationReadiness.fetch");
    expect(pageSource).not.toContain("trpc.songs.batchUpload.useMutation()");
    expect(pageSource).not.toContain("batchUpload.mutateAsync(");
  });

  it("binds each submitted asset to server-attested operation metadata and never treats a local WID as authority", () => {
    expect(pageSource).toContain("batchOperationId");
    expect(pageSource).toContain("batchClientCardId");
    expect(pageSource).toContain("batchAssetKind");
    expect(pageSource).toContain("Server evidence receipt did not match this prepared source digest.");
    expect(pageSource).not.toContain("formatWID(");
    expect(pageSource).not.toContain("generateECDSAKeypair(");
  });

  it("shows Draft-only scope and explicit private operation, ambiguity, and cancel states", () => {
    expect(pageSource).toContain('data-testid="private-batch-operation-status"');
    expect(pageSource).toContain("Draft only · no registration or publication");
    expect(pageSource).toContain("Exact-hash recovery is ambiguous. No record was selected.");
    expect(pageSource).toContain("Cancel private preparation");
    expect(pageSource).not.toContain('batchPublishIntent === "Published"');
  });

  it("keeps the opaque private operation reference only in tab session state and restores it through the owner-scoped read route", () => {
    expect(pageSource).toContain('"living-nexus.private-batch-operation"');
    expect(pageSource).toContain("trpc.batchUpload.getOperation.useQuery");
    expect(pageSource).toContain("window.sessionStorage.removeItem");
    expect(pageSource).not.toContain("localStorage.setItem");
  });
});
