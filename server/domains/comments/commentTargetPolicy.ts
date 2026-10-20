import { TRPCError } from "@trpc/server";

export type CommentTargetWork = {
  id: number;
  title: string;
  userId: number;
  isPublic: boolean;
  status: "Draft" | "Published" | "Unlisted" | "Deleted";
  moderationStatus: "clear" | "flagged" | "removed";
};

export type CommentParent = {
  id: number;
  songId: number;
};

/**
 * Voices are a public relationship to a published Work. Resolve this before any
 * interaction event or comment write so unavailable Works never gain new public
 * commentary records through a caller-supplied numeric ID.
 */
export function requirePublicCommentTarget(
  work: CommentTargetWork | null | undefined,
): CommentTargetWork {
  if (!work || !work.isPublic || work.status !== "Published" || work.moderationStatus === "removed") {
    throw new TRPCError({ code: "NOT_FOUND", message: "This Work is not available for public Voices." });
  }
  return work;
}

/** A reply must remain attached to a parent on the same canonical Work. */
export function requireCommentParentForWork(
  parent: CommentParent | null | undefined,
  songId: number,
): CommentParent {
  if (!parent) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The parent signal was not found." });
  }
  if (parent.songId !== songId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A reply must remain attached to the same Work as its parent signal." });
  }
  return parent;
}
