import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import type { Track } from "@/contexts/PlayerContext";
import type { FeedRow } from "@shared/coreDataTypes";

const CINEMATIC_CREATOR_PAGE_SIZE = 12;

/**
 * Reads a creator's public audio Works for the Global Player cinematic gallery.
 * This query is deliberately bounded and presentation-only: it has no playback
 * side effects and never changes PlayerContext's frozen session queue.
 */
export function useCinematicCreatorCatalog(options: {
  creatorId: number | null;
  enabled: boolean;
}) {
  const query = trpc.songs.discoverInfinite.useInfiniteQuery(
    {
      creatorId: options.creatorId ?? 0,
      contentType: "audio",
      limit: CINEMATIC_CREATOR_PAGE_SIZE,
    },
    {
      enabled: options.enabled && Boolean(options.creatorId),
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  /**
   * Cursor pages should already be disjoint. The stable ID gate still protects
   * the visual catalog and its explicit playback mapping if a public projection
   * changes while a visitor is loading subsequent pages.
   */
  const items = useMemo(() => {
    const seenWorkIds = new Set<number>();
    return (query.data?.pages.flatMap((page) => page.items) ?? []).filter((row) => {
      if (seenWorkIds.has(row.song.id)) return false;
      seenWorkIds.add(row.song.id);
      return true;
    });
  }, [query.data]);

  return {
    ...query,
    items,
    pageSize: CINEMATIC_CREATOR_PAGE_SIZE,
  };
}

/**
 * Converts the canonical public FeedRow projection into the existing playback
 * Track shape. The caller decides when listener intent permits queue creation.
 */
export function cinematicFeedRowToTrack(row: FeedRow): Track | null {
  if (!row.song.fileUrl) return null;

  return {
    id: String(row.song.id),
    title: row.song.title,
    artist: row.creator.artistHandle || row.creator.name || "Creator",
    genre: row.song.genre || "Unclassified",
    desc: row.song.description || undefined,
    audioUrl: row.song.fileUrl,
    artUrl: row.song.coverArtUrl || undefined,
    artType: row.song.playerAssetType === "video" ? "video" : "image",
    dur: row.song.durationSeconds ? String(row.song.durationSeconds) : undefined,
    witnessId: row.song.witnessId || undefined,
    creatorHandle: row.creator.artistHandle || String(row.creator.id),
    creatorId: row.creator.id,
    contentType: "audio",
    downloadPermission: row.song.downloadPermission,
    downloadTipThresholdCents: row.song.downloadTipThresholdCents,
  };
}
