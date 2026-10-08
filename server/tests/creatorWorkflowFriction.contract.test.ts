import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveToneFromMetadata, PARTICIPATION_VALUES } from "@shared/loopRegistration";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("creator workflow friction repair", () => {
  it("provides direct month and year selection inside the shared historical date popover", () => {
    const field = read("client/src/components/HistoricalDateField.tsx");

    expect(field).toContain('captionLayout="dropdown"');
    expect(field).toContain("startMonth={startMonth}");
    expect(field).toContain("endMonth={endMonth}");
    expect(field).toContain("defaultMonth={selected ?? maximum ?? today}");
    expect(field).toContain("formatHistoricalDateValue(date)");
  });

  it("allows creators to explicitly declare that an instrumental Work has no lyrics or voice", () => {
    const schema = read("drizzle/schema.ts");
    const musicEnvironment = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const router = read("server/routers/songs.ts");
    const publicWork = read("client/src/pages/loop/LoopWorkPage.tsx");

    expect(PARTICIPATION_VALUES).toEqual(["Human", "AI", "Both", "None"]);
    expect(schema).toContain('participationLyrics: mysqlEnum("participationLyrics", ["Human", "AI", "Both", "None"])');
    expect(schema).toContain('participationVoice: mysqlEnum("participationVoice", ["Human", "AI", "Both", "None"])');
    expect(router).toContain('participationLyrics: z.enum(["Human", "AI", "Both", "None"]).optional()');
    expect(musicEnvironment).toContain('return label === "Lyrics" ? "No lyrics" : "No voice";');
    expect(musicEnvironment).toContain('candidate !== "None"');
    expect(publicWork).toContain("No ${axis.toLowerCase()} declared");
  });

  it("does not mislabel a human instrumental declaration as mixed authorship", () => {
    const tone = deriveToneFromMetadata({
      genre: "Ambient",
      participation: { music: "Human", lyrics: "None", voice: "None" },
    });

    expect(tone.label).toBe("Ambient");
    expect(tone.participation).toEqual({ music: "Human", lyrics: "None", voice: "None" });
  });

  it("opens Signal alerts at the canonical Work Voices section", () => {
    const rail = read("client/src/components/layout/RightRail.tsx");
    const inbox = read("client/src/pages/NotificationsPage.tsx");
    const work = read("client/src/pages/loop/LoopWorkPage.tsx");

    expect(rail).toContain('sig.type === "comment" ? "#voices" : ""');
    expect(rail).toContain('item.type === "comment" ? "#voices" : ""');
    expect(inbox).toContain('notif.type === "comment" ? "#voices" : ""');
    expect(work).toContain('window.location.hash !== "#voices"');
    expect(work).toContain('document.getElementById("voices")?.scrollIntoView');
  });

  it("keeps creator Work actions visible, permission-aware, and bounded to bulk state reads", () => {
    const profile = read("client/src/pages/loop/LoopCreatorPage.tsx");
    const organizer = read("client/src/components/creator/SanctuaryWorksOrganizer.tsx");
    const actions = read("client/src/components/CreatorWorkQuickActions.tsx");
    const playlist = read("client/src/components/AddToPlaylistButton.tsx");
    const trackCard = read("client/src/components/TrackCard.tsx");
    const workRow = read("client/src/components/WorkListRow.tsx");
    const storeCard = read("client/src/components/StoreTrackCard.tsx");
    const styles = read("client/src/index.css");

    expect(profile).toContain("trpc.songs.getBulkLikeStatuses.useMutation");
    expect(profile).toContain("initialLiked: likedMap[song.id] ?? false");
    expect(organizer).toContain("CreatorWorkQuickActions");
    expect(organizer).toContain("initialLiked?: boolean");
    expect(actions).toContain("deferLikeStatusQuery = true");
    expect(actions).toContain("deferPlaylistStatusQuery = true");
    expect(actions).toContain("triggerTaggedDownload");
    expect(actions).toContain('downloadPermission !== "none"');
    expect(playlist).toContain("deferStatusQuery?: boolean");
    expect(playlist).toContain("isAuthenticated && !deferStatusQuery");
    expect(playlist).toContain("aria-label={title}");
    expect(trackCard).toContain("CreatorWorkQuickActions");
    expect(trackCard).toContain("downloadPermission={track.downloadPermission}");
    expect(workRow).toContain("CreatorWorkQuickActions");
    expect(workRow).toContain("downloadPermission={song.downloadPermission}");
    expect(storeCard).toContain("ln-store-track-actions");
    expect(storeCard).toContain("CreatorWorkQuickActions");
    expect(styles).toContain(".ln-creator-work-action");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
