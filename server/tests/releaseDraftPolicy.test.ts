import { describe, expect, it } from "vitest";
import {
  assertDraftMembershipCandidates,
  assertEditableDraft,
  assertExactDraftMembershipIds,
  ReleaseDraftPolicyError,
} from "../domains/releases/releasePolicy";

const eligibleWork = {
  id: 41,
  userId: 7,
  status: "Published",
  isPublic: true,
  contentType: "audio",
  witnessId: "WID-MUS-EXAMPLE",
  fileUrl: "https://media.example.test/track.mp3",
};

describe("Draft Release relationship policy", () => {
  it("accepts owned, published audio Works with canonical WIDs without changing the Work", () => {
    expect(() => assertDraftMembershipCandidates(7, [41], [eligibleWork])).not.toThrow();
  });

  it("rejects a foreign, unpublished, non-audio, or unregistered Work as one unavailable request", () => {
    for (const override of [
      { userId: 8 },
      { status: "Draft" },
      { contentType: "document" },
      { witnessId: null },
      { fileUrl: null },
    ]) {
      expect(() => assertDraftMembershipCandidates(7, [41], [{ ...eligibleWork, ...override }]))
        .toThrow(ReleaseDraftPolicyError);
    }
  });

  it("rejects duplicate Work membership for an initial sealed-edition-compatible draft", () => {
    expect(() => assertDraftMembershipCandidates(7, [41, 41], [eligibleWork])).toThrow(/once/);
  });

  it("requires owner, editable state, and expected revision before a draft mutates", () => {
    expect(() => assertEditableDraft({ creatorId: 7, status: "draft", revision: 2 }, 7, 2)).not.toThrow();
    expect(() => assertEditableDraft({ creatorId: 7, status: "draft", revision: 2 }, 7, 1)).toThrow(/changed/);
    expect(() => assertEditableDraft({ creatorId: 7, status: "published", revision: 2 }, 7, 2)).toThrow(/no longer editable/);
    expect(() => assertEditableDraft({ creatorId: 8, status: "draft", revision: 2 }, 7, 2)).toThrow(/unavailable/);
  });

  it("requires a precise current membership-row set for reorder requests", () => {
    expect(() => assertExactDraftMembershipIds([10, 12, 15], [15, 10, 12])).not.toThrow();
    expect(() => assertExactDraftMembershipIds([10, 12, 15], [10, 10, 15])).toThrow(/changed/);
    expect(() => assertExactDraftMembershipIds([10, 12, 15], [10, 12])).toThrow(/changed/);
    expect(() => assertExactDraftMembershipIds([10, 12, 15], [10, 12, 99])).toThrow(/changed/);
  });
});
