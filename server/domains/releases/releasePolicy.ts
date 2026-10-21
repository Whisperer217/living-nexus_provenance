export class ReleaseDraftPolicyError extends Error {
  constructor(
    readonly code:
      | "DRAFT_UNAVAILABLE"
      | "DRAFT_CHANGED"
      | "DRAFT_NOT_EDITABLE"
      | "WORKS_UNAVAILABLE"
      | "DUPLICATE_WORK"
      | "EMPTY_RELEASE",
    message: string,
  ) {
    super(message);
    this.name = "ReleaseDraftPolicyError";
  }
}

export type ReleaseMembershipCandidate = {
  id: number;
  userId: number;
  status: string;
  isPublic: boolean | null;
  contentType: string;
  witnessId: string | null;
  fileUrl: string | null;
};

/**
 * A Draft Release only relates existing, owned, published audio Works. It never
 * creates or changes a Work record, WID, HAAI declaration, media asset, or
 * legacy WID-ALB collection membership.
 */
export function assertDraftMembershipCandidates(
  creatorId: number,
  songIdsInOrder: number[],
  candidates: ReleaseMembershipCandidate[],
): void {
  if (songIdsInOrder.length === 0) {
    throw new ReleaseDraftPolicyError("EMPTY_RELEASE", "Choose at least one published audio Work.");
  }

  if (new Set(songIdsInOrder).size !== songIdsInOrder.length) {
    throw new ReleaseDraftPolicyError("DUPLICATE_WORK", "A Draft Release may include each Work once.");
  }

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  for (const songId of songIdsInOrder) {
    const candidate = byId.get(songId);
    if (!candidate
      || candidate.userId !== creatorId
      || candidate.status !== "Published"
      || candidate.isPublic !== true
      || candidate.contentType !== "audio"
      || !candidate.witnessId
      || !candidate.fileUrl) {
      // Do not identify which requested Work was unavailable. This maintains the
      // same owner-safe relationship boundary used by other private containers.
      throw new ReleaseDraftPolicyError("WORKS_UNAVAILABLE", "One or more selected Works are unavailable for this Draft Release.");
    }
  }
}

export function assertEditableDraft(
  draft: { creatorId: number; status: string; revision: number } | undefined,
  creatorId: number,
  expectedRevision: number,
): void {
  if (!draft || draft.creatorId !== creatorId) {
    throw new ReleaseDraftPolicyError("DRAFT_UNAVAILABLE", "Draft release unavailable.");
  }
  if (draft.status !== "draft") {
    throw new ReleaseDraftPolicyError("DRAFT_NOT_EDITABLE", "This Draft Release is no longer editable.");
  }
  if (draft.revision !== expectedRevision) {
    throw new ReleaseDraftPolicyError("DRAFT_CHANGED", "This draft changed. Reload, review, or retry.");
  }
}

export function assertExactDraftMembershipIds(currentIds: number[], submittedIds: number[]): void {
  if (currentIds.length !== submittedIds.length || new Set(submittedIds).size !== submittedIds.length) {
    throw new ReleaseDraftPolicyError("DRAFT_CHANGED", "This draft changed. Reload, review, or retry.");
  }
  const current = new Set(currentIds);
  if (submittedIds.some((id) => !current.has(id))) {
    throw new ReleaseDraftPolicyError("DRAFT_CHANGED", "This draft changed. Reload, review, or retry.");
  }
}
