import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Explore creator directory", () => {
  const explore = read("client/src/pages/ExplorePage.tsx");
  const creatorDb = read("server/db/users.ts");

  it("renders Browse creators from the public creator projection rather than grouping the current track feed", () => {
    const directoryStart = explore.indexOf("function AllCreatorsView");
    const directoryEnd = explore.indexOf("// ── Main ExplorePage", directoryStart);
    const directory = explore.slice(directoryStart, directoryEnd);

    expect(explore).toContain("trpc.profile.allCreators.useQuery");
    expect(explore).toContain('label: "Browse creators"');
    expect(explore).toContain('view === "creators"');
    expect(explore).toContain('url.searchParams.set("view", "creators")');
    expect(explore).toContain('!search && !selectedCreatorId && viewMode !== "grid"');
    expect(directory).toContain("function AllCreatorsView({ creators, search, selectedCreatorId }");
    expect(directory).toContain("Browse creators");
    expect(directory).not.toContain("data: ReturnType<typeof useExploreData>");
    expect(directory).not.toContain("byCreator");
    expect(directory).not.toContain("works.slice(0, 5)");
  });

  it("keeps creator cards routed by an existing public handle or numeric ID", () => {
    expect(explore).toContain("const routeIdentity = creator.artistHandle || creator.id");
    expect(explore).toContain("href={`/creator/${routeIdentity}`}");
    expect(explore).not.toContain("href={`/creator/${creator.name}`}");
  });

  it("requires a truly public published Work before shared public creator discovery exposes a profile", () => {
    const creatorReaderStart = creatorDb.indexOf("export async function getAllCreators");
    const creatorReaderEnd = creatorDb.indexOf("// ─── Creator OG", creatorReaderStart);
    const creatorReader = creatorDb.slice(creatorReaderStart, creatorReaderEnd);

    expect(creatorReader).toContain('eq(songs.status, "Published")');
    expect(creatorReader).toContain("eq(songs.isPublic, true)");
    expect(creatorReader).toContain("isNotNull(users.artistHandle)");
    expect(creatorReader).toContain("count(${songs.id}) > 0");
  });

  it("keeps list-mode likes on the page-level bulk map instead of mounting per-row status observers", () => {
    expect(explore).toContain("prefetchedLiked={likedMap[row.song.id] ?? false}");
    expect(explore).toContain("return useMemo(() => ({");
    expect(explore).not.toContain("explore-list-static");
  });
});
