import { describe, expect, it } from "vitest";
import {
  requireCommentParentForWork,
  requirePublicCommentTarget,
  type CommentTargetWork,
} from "../domains/comments/commentTargetPolicy";

const publicWork: CommentTargetWork = {
  id: 60001,
  title: "PUSH FORWARD",
  userId: 1,
  isPublic: true,
  status: "Published",
  moderationStatus: "clear",
};

describe("comment target policy", () => {
  it("accepts a canonical publicly available Work", () => {
    expect(requirePublicCommentTarget(publicWork)).toEqual(publicWork);
  });

  it.each([
    undefined,
    { ...publicWork, isPublic: false },
    { ...publicWork, status: "Draft" as const },
    { ...publicWork, status: "Unlisted" as const },
    { ...publicWork, status: "Deleted" as const },
    { ...publicWork, moderationStatus: "removed" as const },
  ])("rejects an unavailable public Voice target", (work) => {
    expect(() => requirePublicCommentTarget(work)).toThrow("not available for public Voices");
  });

  it("rejects a cross-Work reply before a comment can be written", () => {
    expect(() => requireCommentParentForWork({ id: 99, songId: 60001 }, 60002))
      .toThrow("same Work as its parent signal");
  });

  it("accepts a parent signal on the target Work", () => {
    expect(requireCommentParentForWork({ id: 99, songId: 60001 }, 60001))
      .toEqual({ id: 99, songId: 60001 });
  });
});
