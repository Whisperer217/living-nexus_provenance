import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Witnessing Circle and artifact Voices contracts", () => {
  const layout = read("client/src/components/layout/MainLayout.tsx");
  const circle = read("client/src/components/layout/WitnessingCirclePanel.tsx");
  const rail = read("client/src/components/layout/LeftRail.tsx");
  const topBar = read("client/src/components/layout/TopBar.tsx");
  const detail = read("client/src/pages/SongDetailPage.tsx");
  const header = read("client/src/components/CinematicSongHeader.tsx");
  const experience = read("client/src/components/ExperienceColumn.tsx");
  const creatorDirectory = read("client/src/pages/ExplorePage.tsx");
  const witnessedCreators = read("server/utils/db.ts");
  const css = read("client/src/index.css");

  it("opens one subscription-backed Witnessing Circle from global navigation", () => {
    expect(layout).toContain('"ln:open-witnessing-circle"');
    expect(layout).toContain("<WitnessingCirclePanel");
    expect(circle).toContain("trpc.witnessSubscription.myWitnessing.useQuery");
    expect(circle).toContain("Find a creator");
    expect(circle).toContain("Recently witnessed");
    expect(rail).toContain('new Event("ln:open-witnessing-circle")');
    expect(topBar).toContain('new Event("ln:open-witnessing-circle")');
  });

  it("uses the shared sigil motion and dimensional field grammar", () => {
    expect(css).toContain(".ln-witness-sigil");
    expect(css).toContain("@keyframes ln-witness-sigil-acknowledge");
    expect(css).toContain("button:active .ln-witness-sigil");
    expect(css).toContain(".ln-dimensional-field");
    expect(circle).toContain("ln-dimensional-field ln-witnessing-circle__search");
  });

  it("makes existing comments visible as a counted Voices surface without changing persistence", () => {
    expect(detail).toContain("const publishedVoices");
    expect(detail).toContain("commentCount={publishedVoices}");
    expect(detail).toContain("onOpenVoices={openVoices}");
    expect(header).toContain("onOpenVoices?: () => void");
    expect(header).toContain('aria-label={`Open ${commentCount} voices`}');
    expect(experience).toContain('title="Voices"');
    expect(experience).toContain("Conversation held in the living record of this Work.");
    expect(experience).toContain("ln-dimensional-field");
  });

  it("shows resolved comment identities and relative time within the canonical Voices surface", () => {
    expect(experience).toContain("function relativeVoiceTime");
    expect(experience).toContain("c.avatarUrl ? <img");
    expect(experience).toContain("r.avatarUrl ? <img");
    expect(experience).toContain("relativeVoiceTime(c.createdAt)");
    expect(experience).toContain("relativeVoiceTime(r.createdAt)");
    expect(experience).toContain("ln-voice-comment__avatar");
  });

  it("derives recent publication indicators from the canonical publication feed", () => {
    expect(witnessedCreators).toContain("latestPublishedAt");
    expect(witnessedCreators).toContain("creatorPublicationFeed.publishedAt");
    expect(circle).toContain("function hasRecentPublication");
    expect(circle).toContain("New work");
    expect(circle).toContain("ln-witnessing-circle__publication");
  });

  it("uses the shared dimensional grammar for creator cards and global navigation actions", () => {
    expect(creatorDirectory).toContain("ln-dimensional-card group relative aspect-[5/4]");
    expect(css).toContain(".ln-dimensional-card");
    expect(css).toContain(".ln-dimensional-action");
    expect(css).toContain(".ln-voice-comment");
  });

  it("keeps Work Signals explainable, orderable, and individually dimensional", () => {
    const voices = read("client/src/components/WorkVoices.tsx");

    expect(voices).toContain("Signal order");
    expect(voices).toContain("Most recent");
    expect(voices).toContain("A Signal adds your attributed voice");
    expect(voices).toContain("ln-signal-card");
    expect(css).toContain(".ln-signal-card");
  });

  it("projects a latest eligible Work before exposing Circle support", () => {
    expect(witnessedCreators).toContain("latestSupportWorkId");
    expect(witnessedCreators).toContain("latestSupportWorkTitle");
    expect(witnessedCreators).toContain("latestSupportWorkCoverArtUrl");
    expect(circle).toContain("SupportCreatorDrawer");
    expect(circle).toContain("latestSupportWorkId");
    expect(circle).toContain("ln-witnessing-circle__support");
    expect(css).toContain(".ln-witnessing-circle__creator-actions");
  });
});
