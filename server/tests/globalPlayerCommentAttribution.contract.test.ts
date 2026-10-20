import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Global Player comment attribution contract", () => {
  const player = read("client/src/components/player/GlobalPlayer.tsx");
  const state = read("client/src/components/player/commentComposerState.ts");
  const voices = read("client/src/components/WorkVoices.tsx");

  it("captures a composer target instead of submitting against moving playback state", () => {
    expect(player).toContain("openCommentsForCurrentTrack");
    expect(player).toContain("openPlayerCommentComposer(previous, commentTargetForCurrentTrack)");
    expect(player).toContain("{ songId: commentTarget?.songId ?? 0 }");
    expect(player).toContain("songId: commentTarget.songId");
    expect(player).toContain("Commenting on {commentTarget.title}");
    expect(player).toContain("Your signal was not posted. Your draft is still here.");
    expect(player).not.toContain("mutateAsync({ songId: currentSongId, content: commentText.trim() })");
  });

  it("requires an explicit switch and retains a per-Work draft map", () => {
    expect(player).toContain("Switch to Current Track");
    expect(player).toContain("switchCommentsToCurrentTrack");
    expect(state).toContain("drafts: Record<number, string>");
    expect(state).toContain("switchPlayerCommentTarget");
    expect(state).toContain("clearPlayerCommentDraft");
  });

  it("leaves canonical Work Voices route-bound rather than coupling it to PlayerContext", () => {
    expect(voices).toContain("export function WorkVoices({ songId }");
    expect(voices).not.toContain("usePlayer(");
  });
});
