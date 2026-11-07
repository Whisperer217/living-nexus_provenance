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
    expect(explore).toContain('!search && !selectedCreatorId && viewMode === "list"');
    expect(directory).toContain("function AllCreatorsView({");
    expect(directory).toContain("selectedCreatorId,");
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

  it("makes the shared discovery field a creator-aware search without adding a separate eager query", () => {
    expect(explore).toContain('"Search public creators"');
    expect(explore).toContain('"Find creators, handles, statements…"');
    expect(explore).toContain("[creator.name, creator.artistHandle, creator.bio]");
    expect(explore).toContain("!search && !selectedCreatorId && viewMode === \"list\"");
  });

  it("passes existing creator banners through the public directory without replacing them with Work artwork", () => {
    const creatorReaderStart = creatorDb.indexOf("export async function getAllCreators");
    const creatorReaderEnd = creatorDb.indexOf("// ─── Creator OG", creatorReaderStart);
    const creatorReader = creatorDb.slice(creatorReaderStart, creatorReaderEnd);

    expect(creatorReader).toContain("bannerUrl: users.bannerUrl");
    expect(explore).toContain("bannerUrl: c.bannerUrl ?? null");
    expect(explore).not.toContain("coverArtUrl: c.bannerUrl");
    expect(explore).not.toContain("coverArtUrl: creator.bannerUrl");
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

  it("removes the legacy Columns control and routes old grid URLs into the retained list mode", () => {
    expect(explore).toContain('type ViewMode = "list" | "creators"');
    expect(explore).toContain('if (view === "creators") return "creators"');
    expect(explore).toContain('return "list"');
    expect(explore).not.toContain('label: "Columns"');
    expect(explore).not.toContain('key: "columns"');
    expect(explore).not.toContain('viewMode === "columns"');
    expect(explore).not.toContain("LayoutGrid");
  });

  it("adds an Explore-owned gallery with desktop states and mobile snap semantics without a second navigation authority", () => {
    expect(explore).toContain('type GalleryState = "expanded" | "compact" | "hidden"');
    expect(explore).toContain("function CreatorGalleryRail({");
    expect(explore).toContain("data-gallery-state={galleryState}");
    expect(explore).toContain("onClick={() => onSelect(isSelected ? null : creator.id)}");
    expect(explore).toContain('loading="lazy"');
    expect(explore).toContain("ln-explore-spatial-shell");
    expect(explore).toContain("ln-explore-gallery__scroller");
    expect(explore).not.toContain("CreatorGalleryDrawer");
  });

  it("keeps the Explore refinement presentation-only and gives the header, domains, and registry distinct spatial hooks", () => {
    expect(explore).toContain("ln-explore-header");
    expect(explore).toContain("ln-explore-header__identity");
    expect(explore).toContain("ln-explore-header__search-row");
    expect(explore).toContain("ln-explore-registry");
    expect(explore).toContain("WorkListRow");
    expect(explore).not.toContain("audioTracks.slice");
  });

  it("keeps mobile creator scope and discovery controls in the one Settings surface", () => {
    expect(explore).toContain('className="ln-explore-desktop-filter"');
    expect(explore).toContain('className="ln-explore-mobile-settings__creator"');
    expect(explore).toContain('aria-controls="explore-mobile-settings"');
    expect(explore).toContain("<WorkSortControl value={workSort} onChange={setWorkSort} />");
    expect(explore).toContain("<CreatorSortControl value={creatorSort} onChange={setCreatorSort} />");
    expect(explore).toContain("<ViewToggle value={viewMode} onChange={handleViewChange} />");
    expect(explore).toContain("title=\"Refresh discovery\"");
    expect(explore).toContain("onSelect={setSelectedCreatorId}");
  });
});
