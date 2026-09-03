import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const songsDb = readFileSync("server/db/songs.ts", "utf-8");
const songsRouter = readFileSync("server/routers/songs.ts", "utf-8");
const home = readFileSync("client/src/pages/HomePage.tsx", "utf-8");

describe("Best Played This Week projection contract", () => {
  it("uses the existing play ledger and public publication boundary", () => {
    expect(songsDb).toContain("export async function getBestPlayedThisWeek(limit = 3)");
    expect(songsDb).toContain("const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)");
    expect(songsDb).toContain("FROM playEvents");
    expect(songsDb).toContain("eq(songs.isPublic, true)");
    expect(songsDb).toContain('eq(songs.status, "Published")');
    expect(songsDb).toContain('eq(songs.contentType, "audio")');
    expect(songsDb).toContain("isNotNull(songs.fileUrl)");
    expect(songsDb).toContain(".orderBy(desc(weeklyPlays), desc(songs.playCount), desc(songs.createdAt), asc(songs.id))");
    expect(songsDb).toContain(".limit(Math.min(Math.max(limit, 1), 3))");
  });

  it("exposes a public bounded procedure without creating persistence or a worker", () => {
    expect(songsRouter).toContain('import { getBestPlayedThisWeek } from "../db/songs"');
    expect(songsRouter).toContain("bestPlayedThisWeek: publicProcedure");
    expect(songsRouter).toContain("z.number().int().min(1).max(3).optional()");
    expect(songsRouter).toContain("getBestPlayedThisWeek(input?.limit ?? 3)");
    expect(songsRouter).not.toContain("createHeartbeatJob");
  });

  it("projects Top 3 artifacts with work, creator, playback, and Support paths", () => {
    expect(home).toContain("trpc.songs.bestPlayedThisWeek.useQuery");
    expect(home).toContain("{ limit: 3 }");
    expect(home).toContain("Best Played This Week");
    expect(home).toContain("last seven days");
    expect(home).toContain("No qualifying public plays");
    expect(home).toContain("/song/${v.id}");
    expect(home).toContain("creatorHref(v)");
    expect(home).toContain("openTip(v)");
    expect(home).toContain("weeklyPlays");
  });

  it("shows each available showcase creator as an independent public identity link without fabricating a profile", () => {
    expect(home).toContain("profilePhotoUrl: (creator?.profilePhotoUrl as string | null) ?? null");
    expect(home).toContain("const creatorHref = (v: ShowcaseTrack)");
    expect(home).toContain("`/creator/${v.artistHandle}`");
    expect(home).toContain("Visit ${v.artistName}'s creator domain");
    expect(home).toContain("{v.profilePhotoUrl ? (");
    expect(home).toContain("(v.artistName || \"C\").slice(0, 1).toUpperCase()");
    expect(home).toContain("<span className=\"truncate\">@{v.artistHandle || v.artistName || \"creator\"}</span>");
  });
});
