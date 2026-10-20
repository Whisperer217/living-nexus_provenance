import { describe, expect, it } from "vitest";
import {
  clearPlayerCommentDraft,
  currentPlayerCommentDraft,
  initialPlayerCommentComposerState,
  openPlayerCommentComposer,
  setPlayerCommentDraft,
  switchPlayerCommentTarget,
} from "../../client/src/components/player/commentComposerState";

const pushForward = { songId: 60001, title: "PUSH FORWARD", creator: "DocSMercer", artUrl: null };
const anchorInTheDark = { songId: 60002, title: "Anchor In The Dark", creator: "DocSMercer", artUrl: null };

describe("player comment composer state", () => {
  it("keeps a draft bound to its opening Work while playback advances", () => {
    const opened = openPlayerCommentComposer(initialPlayerCommentComposerState, pushForward);
    const writing = setPlayerCommentDraft(opened, "A thought for Push Forward");

    // Playback may move to Anchor In The Dark, but no composer action occurs.
    expect(writing.target).toEqual(pushForward);
    expect(currentPlayerCommentDraft(writing)).toBe("A thought for Push Forward");
  });

  it("preserves the original Work draft when the listener explicitly switches targets", () => {
    const writingOnPushForward = setPlayerCommentDraft(
      openPlayerCommentComposer(initialPlayerCommentComposerState, pushForward),
      "A thought for Push Forward",
    );
    const switched = switchPlayerCommentTarget(writingOnPushForward, anchorInTheDark);
    const writingOnAnchor = setPlayerCommentDraft(switched, "A thought for Anchor");

    expect(writingOnAnchor.target).toEqual(anchorInTheDark);
    expect(currentPlayerCommentDraft(writingOnAnchor)).toBe("A thought for Anchor");
    expect(writingOnAnchor.drafts[pushForward.songId]).toBe("A thought for Push Forward");
  });

  it("clears only the submitted Work draft", () => {
    const state = {
      target: anchorInTheDark,
      drafts: {
        [pushForward.songId]: "A thought for Push Forward",
        [anchorInTheDark.songId]: "A thought for Anchor",
      },
    };

    const afterSubmit = clearPlayerCommentDraft(state, anchorInTheDark.songId);
    expect(afterSubmit.target).toBeNull();
    expect(afterSubmit.drafts[pushForward.songId]).toBe("A thought for Push Forward");
    expect(afterSubmit.drafts[anchorInTheDark.songId]).toBeUndefined();
  });
});
