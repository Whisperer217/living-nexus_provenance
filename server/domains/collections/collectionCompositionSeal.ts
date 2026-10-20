import { createHash } from "node:crypto";

export type CollectionOriginSeal = {
  collectionWid: string | null | undefined;
  collectiveHash: string | null | undefined;
  trackCount: number | null | undefined;
};

export type CollectionOriginMember = {
  witnessId: string | null | undefined;
};

export type CollectionCompositionSealAssessment = {
  valid: boolean;
  actualHash: string | null;
  expectedWid: string | null;
  reason:
    | "missing_stored_seal"
    | "missing_member_wid"
    | "track_count_mismatch"
    | "collective_hash_mismatch"
    | "collection_wid_mismatch"
    | null;
};

/**
 * Replays the original WID-ALB registration algorithm exactly: sorted member
 * WIDs joined by `|`, then SHA-256. It deliberately does not mutate, dedupe,
 * persist, reissue, or otherwise alter historical collection evidence.
 */
export function computeCollectionCollectiveHash(witnessIds: readonly string[]): string {
  return createHash("sha256")
    .update([...witnessIds].sort().join("|"), "utf8")
    .digest("hex");
}

export function collectionWidFromCollectiveHash(collectiveHash: string): string {
  return `WID-ALB-${collectiveHash.slice(0, 8).toUpperCase()}-${collectiveHash.slice(8, 16).toUpperCase()}`;
}

/**
 * Validates whether the current membership can truthfully make a current
 * WID-ALB composition claim. Presentation metadata and order are intentionally
 * outside this historic sorted-WID seal.
 */
export function assessCollectionCompositionSeal(
  collection: CollectionOriginSeal,
  members: readonly CollectionOriginMember[],
): CollectionCompositionSealAssessment {
  const storedHash = collection.collectiveHash?.trim().toLowerCase();
  const storedWid = collection.collectionWid?.trim();
  if (!storedHash || !storedWid) {
    return { valid: false, actualHash: null, expectedWid: null, reason: "missing_stored_seal" };
  }

  const witnessIds = members.map((member) => member.witnessId?.trim() ?? "");
  if (witnessIds.some((witnessId) => !witnessId)) {
    return { valid: false, actualHash: null, expectedWid: null, reason: "missing_member_wid" };
  }

  if (collection.trackCount !== undefined && collection.trackCount !== null && collection.trackCount !== members.length) {
    return { valid: false, actualHash: null, expectedWid: null, reason: "track_count_mismatch" };
  }

  const actualHash = computeCollectionCollectiveHash(witnessIds);
  const expectedWid = collectionWidFromCollectiveHash(actualHash);
  if (actualHash !== storedHash) {
    return { valid: false, actualHash, expectedWid, reason: "collective_hash_mismatch" };
  }

  if (storedWid !== expectedWid) {
    return { valid: false, actualHash, expectedWid, reason: "collection_wid_mismatch" };
  }

  return { valid: true, actualHash, expectedWid, reason: null };
}

export function collectionCompositionSealMatches(
  collection: CollectionOriginSeal,
  members: readonly CollectionOriginMember[],
): boolean {
  return assessCollectionCompositionSeal(collection, members).valid;
}
