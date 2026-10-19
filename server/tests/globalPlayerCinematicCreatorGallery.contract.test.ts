import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("Global Player cinematic Creator gallery", () => {
  it("keeps card selection and return-to-listening local to cinematic presentation state", () => {
    const player = read("client/src/components/player/GlobalPlayer.tsx");
    const selectionHandler = between(
      player,
      "const handleCinematicSelectWork",
      "const handleCinematicReturnToListening",
    );
    const returnHandler = between(
      player,
      "const handleCinematicReturnToListening",
      "const handleCinematicPlayWork",
    );
    const gallery = read("client/src/components/player/CinematicCreatorGallery.tsx");
    const cardSelection = between(
      gallery,
      "className=\"ln-cinematic-work-card__select\"",
      "<div className=\"ln-cinematic-work-card__actions\"",
    );

    expect(selectionHandler).toContain("setCinematicSelectedWorkId(workId)");
    expect(selectionHandler).not.toMatch(/playQueueAt|playTrack|togglePlay|addAndPlay|appendToQueue|playNext/);
    expect(returnHandler).toContain("setCinematicSelectedWorkId(currentSongId ?? null)");
    expect(returnHandler).not.toMatch(/playQueueAt|playTrack|togglePlay|addAndPlay|appendToQueue|playNext/);
    expect(cardSelection).toContain("onClick={() => onSelectWork(row.song.id)}");
    expect(cardSelection).toContain('aria-label={`Preview ${title} in the cinematic view`}');
    expect(cardSelection).not.toContain("onPlayWork");
  });

  it("changes the frozen session queue only through the explicit Creator Work Play action", () => {
    const player = read("client/src/components/player/GlobalPlayer.tsx");
    const playHandler = between(
      player,
      "const handleCinematicPlayWork",
      "const handleCinematicOpenWork",
    );
    const gallery = read("client/src/components/player/CinematicCreatorGallery.tsx");

    expect(playHandler).toContain('playQueueAt(playableCreatorTracks, selectedIndex, "CREATOR_PAGE", `creator:${cinematicCreatorId}`)');
    expect(playHandler.match(/playQueueAt\(/g)).toHaveLength(1);
    expect(playHandler).not.toMatch(/playTrack|togglePlay|addAndPlay|appendToQueue|playNext/);
    expect(gallery).toContain("onClick={() => onPlayWork(row.song.id)}");
    expect(gallery).toContain("The gallery is intentionally presentation-only");
  });

  it("uses the canonical public discovery feed as a bounded, deduplicated, paginated Creator catalog", () => {
    const catalog = read("client/src/components/player/useCinematicCreatorCatalog.ts");
    const player = read("client/src/components/player/GlobalPlayer.tsx");

    expect(catalog).toContain("const CINEMATIC_CREATOR_PAGE_SIZE = 12");
    expect(catalog).toContain("trpc.songs.discoverInfinite.useInfiniteQuery");
    expect(catalog).toContain('contentType: "audio"');
    expect(catalog).toContain("limit: CINEMATIC_CREATOR_PAGE_SIZE");
    expect(catalog).toContain("getNextPageParam: (lastPage) => lastPage.nextCursor");
    expect(catalog).toContain("pages.flatMap((page) => page.items)");
    expect(catalog).toContain("const seenWorkIds = new Set<number>()");
    expect(catalog).toContain("seenWorkIds.has(row.song.id)");
    expect(catalog).toContain("enabled: options.enabled && Boolean(options.creatorId)");
    expect(catalog).not.toMatch(/limit:\s*(700|1000)/);
    expect(player).toContain("enabled: cinematic && Boolean(cinematicCreatorId)");
    expect(player).toContain("onLoadMore={() => void cinematicCatalog.fetchNextPage()}");
  });

  it("keeps one PlayerContext audio authority and renders only a presentation background layer", () => {
    const player = read("client/src/components/player/GlobalPlayer.tsx");
    const context = read("client/src/contexts/PlayerContext.tsx");
    const styles = read("client/src/index.css");

    expect(player).toContain("const cinematicTriggerRef = useRef<HTMLButtonElement>(null)");
    expect(player).toContain("cinematicTriggerRef.current?.focus()");
    expect(player).toContain("ln-cinematic-portal__atmosphere");
    expect(player).toContain("key={cinematicFeaturedArt ?? \"cinematic-dark-fallback\"}");
    expect(player).not.toContain("new Audio(");
    expect(player).not.toContain("<audio");
    expect(player).not.toContain("<PlayerProvider");
    expect(context).toContain("let _globalAudio: HTMLAudioElement | null = null;");
    expect(context.match(/_globalAudio\s*=\s*new Audio\(\)/g)).toHaveLength(1);
    expect(styles).toContain("background-size: cover");
    expect(styles).toContain("ln-cinematic-art-arrive");
    expect(styles).toContain("ln-cinematic-portal__art--fallback");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("clearly separates Previewing from Listening Now and makes the playback target explicit", () => {
    const player = read("client/src/components/player/GlobalPlayer.tsx");
    const gallery = read("client/src/components/player/CinematicCreatorGallery.tsx");

    expect(player).toContain("const cinematicFeaturedWork = cinematicSelectedRow?.song ?? null");
    expect(player).toContain('"Previewing — audio continues"');
    expect(player).toContain("Listening now: {visTrack.title}");
    expect(player).toContain("activeWorkId={visTrack.id}");
    expect(player).toContain("onReturnToListening={handleCinematicReturnToListening}");
    expect(gallery).toContain("Listening now");
    expect(gallery).toContain("Previewing");
    expect(gallery).toContain("Return to Listening Now");
    expect(gallery).toContain("Browse without interrupting playback");
  });

  it("supports native scroll or swipe plus explicit desktop and keyboard gallery navigation", () => {
    const gallery = read("client/src/components/player/CinematicCreatorGallery.tsx");
    const styles = read("client/src/index.css");

    expect(gallery).toContain("row.scrollBy({");
    expect(gallery).toContain('event.key === "ArrowRight"');
    expect(gallery).toContain('event.key === "ArrowLeft"');
    expect(gallery).toContain("movePreviewFocus(index, 1)");
    expect(gallery).toContain("movePreviewFocus(index, -1)");
    expect(gallery).toContain("Load More Works");
    expect(styles).toContain("ln-cinematic-creator-gallery__scroll-controls");
    expect(styles).toContain(".ln-cinematic-work-card__actions {\n  grid-template-columns: repeat(3, minmax(0, 1fr));");
  });
});
