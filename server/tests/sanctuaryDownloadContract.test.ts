import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Creator sanctuary + paid-download integration contract", () => {
  it("mounts each public surface through the canonical routes", () => {
    const app = source("client/src/App.tsx");
    expect(app).toContain('<Route path="/explore" component={ExplorePage}');
    expect(app).toContain('<Route path="/song/:id" component={SongDetailPage}');
    expect(app).toContain('<Route path="/creator/:id" component={CreatorProfilePage}');
    expect(app).toContain('import("./pages/loop/LoopWorkPage")');
    expect(app).toContain('import("./pages/loop/LoopCreatorPage")');
  });

  it("keeps one progressive atmosphere utility across creator, Explore, and Chapel", () => {
    const creator = source("client/src/pages/loop/LoopCreatorPage.tsx");
    const explore = source("client/src/pages/ExplorePage.tsx");
    const chapel = source("client/src/components/CreativeDrawer.tsx");
    const quality = source("client/src/hooks/useSanctuaryQuality.ts");

    expect(creator).toContain("CreatorSanctuaryStage");
    expect(explore).toContain("DepthAtmosphere");
    expect(chapel).toContain("DepthAtmosphere");
    expect(quality).toContain("prefers-reduced-motion: reduce");
    expect(quality).toContain("saveData");
    expect(quality).not.toContain("raf = requestAnimationFrame(tick);\n    const onMove");
  });

  it("shows work-page download CTAs, avoids repeat checkout, and claims checkout returns", () => {
    const work = source("client/src/pages/loop/LoopWorkPage.tsx");
    const tips = source("server/routers/tips.ts");

    expect(work).toContain("Free Download");
    expect(work).toContain("Download — $");
    expect(work).toContain("await downloadMutation.mutateAsync({ songId })");
    expect(work).toContain('get("download") !== "unlocked"');
    expect(work).toContain("downloadPermission:");
    expect(work).toContain("downloadTipThresholdCents:");
    expect(tips).toContain('downloadPermission !== "tipped"');
  });

  it("returns only creator-owned public playlists and uses public-safe links", () => {
    const profile = source("server/routers/profile.ts");
    const db = source("server/utils/db.ts");
    const playlists = source("client/src/components/creator/SanctuaryWorksOrganizer.tsx");

    expect(profile).toContain("getPublicPlaylistsByOwner(input.creatorId, 24)");
    expect(db).toContain("eq(playlists.ownerId, ownerId)");
    expect(db).toContain("eq(playlists.isPublic, true)");
    expect(playlists).toContain("pl.shareSlug");
    expect(playlists).toContain("`/creator/${handle}/playlists`");
  });

  it("uses a music-native creator domain instead of mixed-media shelves", () => {
    const types = source("shared/domainTypes.ts");
    const renderer = source("client/src/components/domain/DomainRenderer.tsx");
    const editor = source("client/src/components/domain/DomainEditor.tsx");
    const creator = source("client/src/pages/loop/LoopCreatorPage.tsx");
    const profile = source("server/routers/profile.ts");

    expect(types).toContain("LOOP_DEFAULT_DOMAIN_LAYOUT");
    for (const block of ["latest_releases", "genre_paths", "playlists_shelf"]) {
      expect(types).toContain(`"${block}"`);
      expect(renderer).toContain(`block.blockType === "${block}"`);
    }
    expect(types).toContain("isLoopMusicContentType");
    expect(renderer).toContain("isLoopMusicContentType(song.contentType)");
    expect(types).not.toMatch(
      /LOOP_DOMAIN_ALLOWED_BLOCKS[^;]+shelf_(?:books|comics|manuscripts|artifacts|merch|games)/s,
    );
    expect(editor).toContain("Featured Tracks");
    expect(editor).toContain("Albums & Releases");
    expect(editor).toContain("if (!isDirty) setBlocks(initBlocks())");
    expect(creator.indexOf("<DomainRenderer")).toBeLessThan(
      creator.indexOf("<SanctuaryWorksOrganizer"),
    );
    expect(creator).not.toContain("<SanctuaryPlaylists");
    expect(profile).toContain("albums: publicAlbums");
  });
});
