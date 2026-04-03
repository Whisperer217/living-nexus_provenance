/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlaylistPage  (/playlist)
   User's personal saved playlist with full queue support.
   Divine Noir aesthetic, PLAYLIST context for player.
═══════════════════════════════════════════════════════════════════ */

import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { Link } from "wouter";
import { Music, Play, Trash2, BookmarkX, ListMusic } from "lucide-react";
import { toast } from "sonner";

export default function PlaylistPage() {
  const { isAuthenticated, loading } = useAuth();
  const { playQueueAt, openNowPlayingPanel, currentTrackId, state: playerState } = usePlayer();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl("/playlist");
    }
  }, [loading, isAuthenticated]);

  const { data: items = [], isLoading } = trpc.playlist.get.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const removeMutation = trpc.playlist.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from playlist");
      utils.playlist.get.invalidate();
      utils.playlist.check.invalidate();
    },
    onError: () => toast.error("Failed to remove"),
  });

  const playMutation = trpc.songs.play.useMutation();

  const buildTracks = () =>
    items
      .filter((item: any) => !!item.song.fileUrl)
      .map((item: any) => ({
        id: String(item.song.id),
        title: item.song.title,
        artist: item.creator?.artistHandle || item.creator?.name || "Unknown",
        genre: item.song.genre || "",
        audioUrl: item.song.fileUrl!,
        artUrl: item.song.coverArtUrl || undefined,
        witnessId: item.song.witnessId || undefined,
        aiDisclosure: item.creator?.aiDisclosure || undefined,
        creatorHandle: item.creator?.id ? String(item.creator.id) : undefined,
        creatorId: item.creator?.id ?? undefined,
        coverPositionX: item.song.coverPositionX ?? 50,
        coverPositionY: item.song.coverPositionY ?? 50,
      }));

  const handlePlay = (songId: number) => {
    const tracks = buildTracks();
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t: any) => t.id === String(songId));
    playQueueAt(tracks, idx >= 0 ? idx : 0, "PLAYLIST");
    playMutation.mutate({ songId });
    openNowPlayingPanel();
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, oklch(0.84 0.155 85 / 0.25), oklch(0.55 0.2 290 / 0.25))", border: "1px solid oklch(0.84 0.155 85 / 0.35)" }}>
          <ListMusic size={22} style={{ color: "#D4AF37" }} />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-white tracking-wider">My Playlist</h1>
          <p className="text-[13px] font-body mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            {isLoading ? "Loading…" : `${items.length} ${items.length === 1 ? "track" : "tracks"} saved`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => {
              const tracks = buildTracks();
              if (tracks.length > 0) {
                playQueueAt(tracks, 0, "PLAYLIST");
                openNowPlayingPanel();
              }
            }}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-[13px] tracking-wider transition-all"
            style={{ background: "linear-gradient(135deg, #D4AF37, #B8860B)", color: "#000" }}
          >
            <Play size={14} fill="currentColor" />
            Play All
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: "oklch(0.14 0.013 280)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <BookmarkX size={28} style={{ color: "rgba(255,255,255,0.25)" }} />
          </div>
          <div className="font-heading text-[17px] text-white/40 mb-2">Your playlist is empty</div>
          <div className="text-[13px] font-body text-white/30 mb-6">
            Tap the bookmark icon on any track to save it here
          </div>
          <Link href="/explore">
            <button className="px-5 py-2.5 rounded-xl font-heading text-[13px] tracking-wider transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #D4AF37, #B8860B)", color: "#000" }}>
              Explore Tracks
            </button>
          </Link>
        </div>
      )}

      {/* Track list */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item: any, idx: number) => {
            const song = item.song;
            const creator = item.creator;
            const isActive = currentTrackId === String(song.id);
            return (
              <div
                key={item.id}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all
                  border
                  ${isActive
                    ? "border-[#D4AF37]/30 bg-[#D4AF37]/[0.07]"
                    : "border-white/[0.06] bg-[oklch(0.115_0.055_278)] hover:border-[#A78BFA]/25 hover:bg-white/[0.05]"
                  }`}
                onClick={() => handlePlay(song.id)}
              >
                {/* Index / play icon */}
                <div className="w-7 text-center flex-shrink-0">
                  {isActive && playerState.isPlaying ? (
                    <div className="flex items-end justify-center gap-[2px] h-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-[2.5px] rounded-full bg-[#D4AF37]"
                          style={{ height: "40%", animation: `waveBar 0.8s ease-in-out ${i * 0.15}s infinite alternate` }} />
                      ))}
                    </div>
                  ) : (
                    <span className={`text-[12px] font-body group-hover:hidden ${isActive ? "text-[#D4AF37]" : "text-white/30"}`}>
                      {idx + 1}
                    </span>
                  )}
                  {!isActive && (
                    <Play size={13} fill="currentColor" className="hidden group-hover:block text-white/70 mx-auto" />
                  )}
                </div>

                {/* Cover art */}
                <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden"
                  style={{ background: "oklch(0.15 0.05 275)" }}>
                  {song.coverArtUrl ? (
                    <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${(song as any).coverPositionX ?? 50}% ${(song as any).coverPositionY ?? 50}%` }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
                    </div>
                  )}
                </div>

                {/* Title + artist */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-heading truncate ${isActive ? "text-[#D4AF37]" : "text-white"}`}>
                    {song.title}
                  </div>
                  <div className="text-[11px] font-body truncate mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>
                    <Link href={`/creator/${creator?.id}`} onClick={e => e.stopPropagation()}>
                      <span className="hover:text-white/70 transition-colors">
                        {creator?.artistHandle || creator?.name || "Unknown"}
                      </span>
                    </Link>
                    {song.genre && (
                      <span style={{ color: "rgba(255,255,255,0.30)" }}> · {song.genre}</span>
                    )}
                  </div>
                </div>

                {/* WID badge */}
                {song.witnessId && (
                  <div className="hidden sm:flex text-[9px] font-bold px-2 py-0.5 rounded flex-shrink-0 font-heading tracking-wider wid-glow"
                    style={{ color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.55)", background: "rgba(0,0,0,0.5)" }}>
                    WID
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate({ songId: song.id });
                  }}
                  title="Remove from playlist"
                  className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all
                    bg-white/[0.06] text-white/40 hover:bg-red-500/15 hover:text-lnx-red border border-white/[0.08]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
