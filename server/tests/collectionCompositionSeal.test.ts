import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  assessCollectionCompositionSeal,
  collectionCompositionSealMatches,
  collectionWidFromCollectiveHash,
  computeCollectionCollectiveHash,
} from "../domains/collections/collectionCompositionSeal";

const wids = ["WID-MUS-ALPHA", "WID-MUS-BRAVO", "WID-MUS-CHARLIE"];
const collectiveHash = computeCollectionCollectiveHash(wids);
const sealedCollection = {
  collectionWid: collectionWidFromCollectiveHash(collectiveHash),
  collectiveHash,
  trackCount: wids.length,
};
const members = wids.map((witnessId) => ({ witnessId }));

describe("WID-ALB origin membership seal", () => {
  it("replays the original sorted-WID SHA-256 registration algorithm without mutating input", () => {
    const reversed = [...wids].reverse();
    const expected = createHash("sha256").update([...wids].sort().join("|"), "utf8").digest("hex");

    expect(computeCollectionCollectiveHash(reversed)).toBe(expected);
    expect(reversed).toEqual([...wids].reverse());
    expect(collectionWidFromCollectiveHash(expected)).toMatch(/^WID-ALB-[0-9A-F]{8}-[0-9A-F]{8}$/);
  });

  it("accepts the same member multiset regardless of presentation order", () => {
    expect(collectionCompositionSealMatches(sealedCollection, [...members].reverse())).toBe(true);
  });

  it.each([
    ["added member", [...members, { witnessId: "WID-MUS-DELTA" }]],
    ["removed member", members.slice(0, 2)],
    ["replaced member", [{ witnessId: "WID-MUS-ALPHA" }, { witnessId: "WID-MUS-BRAVO" }, { witnessId: "WID-MUS-DELTA" }]],
  ])("fails closed when membership has a %s", (_label, currentMembers) => {
    expect(collectionCompositionSealMatches(sealedCollection, currentMembers)).toBe(false);
  });

  it("fails closed for missing Work WIDs, stale count, stored hash drift, and a mismatched stored collection WID", () => {
    expect(assessCollectionCompositionSeal(sealedCollection, [{ witnessId: wids[0] }, { witnessId: null }, { witnessId: wids[2] }]).reason)
      .toBe("missing_member_wid");
    expect(assessCollectionCompositionSeal({ ...sealedCollection, trackCount: 99 }, members).reason)
      .toBe("track_count_mismatch");
    expect(assessCollectionCompositionSeal({ ...sealedCollection, collectiveHash: "0".repeat(64) }, members).reason)
      .toBe("collective_hash_mismatch");
    expect(assessCollectionCompositionSeal({ ...sealedCollection, collectionWid: "WID-ALB-00000000-00000000" }, members).reason)
      .toBe("collection_wid_mismatch");
  });
});
