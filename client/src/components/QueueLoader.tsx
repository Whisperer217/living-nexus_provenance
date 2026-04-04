/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — QueueLoader
   Fetches all published songs from the DB on app mount and seeds
   the PlayerContext queue so the player is ready immediately.
   Runs once; setQueue is a no-op if the queue is already populated.
═══════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { usePlayer, Track } from "@/contexts/PlayerContext";

export default function QueueLoader() {
  const { setQueue } = usePlayer();
  const { data } = trpc.songs.discover.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data || data.length === 0) return;
    const tracks: Track[] = data
      .filter(({ song }: any) => !!song.fileUrl)
      .map(({ song, creator }: any) => ({
        id: String(song.id),
        title: song.title,
        artist: creator?.artistHandle || creator?.name || "Unknown Artist",
        genre: song.genre || "",
        audioUrl: song.fileUrl ?? undefined,
        artUrl: song.coverArtUrl ?? undefined,
        plays: song.playCount ?? 0,
        witnessId: song.witnessId ?? undefined,
        aiDisclosure: (song.aiConsent as Track["aiDisclosure"]) ?? undefined,
        visualReady: song.visualReady ?? false,
        autoVideoUrl: song.autoVideoUrl ?? undefined,
        creatorRole: song.creator?.role ?? undefined,
      }));
    setQueue(tracks);
  }, [data, setQueue]);

  return null; // purely a side-effect component
}
