/**
 * Tests for Collection WID layer:
 *  - WID-ALB format generation logic
 *  - verifyCollection procedure (not found path)
 *  - getCollectionForSong procedure (no collection path)
 */
import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

/** Replicates the exact WID-ALB generation logic in batchUpload */
function generateCollectionWid(wids: string[]): { collectionWid: string; collectiveHash: string } {
  const hashInput = wids.slice().sort().join("|");
  const collectiveHash = createHash("sha256").update(hashInput).digest("hex");
  const collectionWid = `WID-ALB-${collectiveHash.slice(0, 8).toUpperCase()}-${collectiveHash.slice(8, 16).toUpperCase()}`;
  return { collectionWid, collectiveHash };
}

// ─── WID-ALB generation ──────────────────────────────────────────────────────

describe("Collection WID generation", () => {
  it("produces a WID-ALB-XXXXXXXX-XXXXXXXX format string", () => {
    const wids = ["WID-ABC12345-DEF67890", "WID-111AAAAA-222BBBBB"];
    const { collectionWid } = generateCollectionWid(wids);
    expect(collectionWid).toMatch(/^WID-ALB-[0-9A-F]{8}-[0-9A-F]{8}$/);
  });

  it("is deterministic — same input always yields same WID", () => {
    const wids = ["WID-AAA-001", "WID-BBB-002", "WID-CCC-003"];
    const { collectionWid: a } = generateCollectionWid(wids);
    const { collectionWid: b } = generateCollectionWid([...wids].reverse()); // order shouldn't matter
    expect(a).toBe(b);
  });

  it("changes when a different set of WIDs is used", () => {
    const { collectionWid: a } = generateCollectionWid(["WID-AAA", "WID-BBB"]);
    const { collectionWid: b } = generateCollectionWid(["WID-AAA", "WID-CCC"]);
    expect(a).not.toBe(b);
  });

  it("collectiveHash is a 64-char hex string (SHA-256)", () => {
    const { collectiveHash } = generateCollectionWid(["WID-TEST-001"]);
    expect(collectiveHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("WID-ALB prefix is uppercase", () => {
    const { collectionWid } = generateCollectionWid(["WID-X"]);
    expect(collectionWid.startsWith("WID-ALB-")).toBe(true);
  });
});

// ─── verifyCollection — not found path ──────────────────────────────────────

describe("songs.verifyCollection", () => {
  it("throws NOT_FOUND for a non-existent collection WID", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // A WID-ALB that was never inserted into the DB
    await expect(
      caller.songs.verifyCollection({ collectionWid: "WID-ALB-00000000-00000000" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ─── getCollectionForSong — no collection path ───────────────────────────────

describe("songs.getCollectionForSong", () => {
  it("returns null for a song that is not part of any collection", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Song ID 0 will never exist in the DB
    const result = await caller.songs.getCollectionForSong({ songId: 0 });
    expect(result).toBeNull();
  });
});
