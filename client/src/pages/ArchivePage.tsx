/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Archive Page
   Authenticated users only. Shows all of the user's own tracks.
   Displays: cover art, title, genre, upload date, status tag,
             publish toggle (Draft ↔ Published).
═══════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Music, Upload, Globe, EyeOff, Pencil, ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { EditTrackPanel } from "@/components/EditTrackPanel";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";

/* ── Status tag ─────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Published: { bg: "oklch(0.65 0.18 145 / 0.18)", text: "oklch(0.65 0.18 145)" },
  Draft:     { bg: "oklch(0.65 0.18 45 / 0.18)",  text: "oklch(0.65 0.18 45)"  },
  Unlisted:  { bg: "oklch(0.65 0.2 300 / 0.18)",  text: "oklch(0.65 0.2 300)"  },
  Deleted:   { bg: "oklch(0.65 0.18 25 / 0.18)",  text: "oklch(0.65 0.18 25)"  },
};

function StatusTag({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "oklch(0.5 0.03 280 / 0.18)", text: "oklch(0.5 0.03 280)" };
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {status}
    </span>
  );
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function ArchivePage() {
  const { isAuthenticated, loading } = useAuth();
  const [,] = useLocation();
  const utils = trpc.useUtils();
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const { playQueueAt } = usePlayer();

  const buildTrack = (song: any) => ({
    id: String(song.id),
    title: song.title,
    artist: song.artistName ?? "Unknown Artist",
    audioUrl: song.audioUrl ?? "",
    coverArt: song.coverArtUrl ?? "",
    genre: song.genre ?? "",
    witnessId: song.witnessId ?? "",
    aiDisclosure: song.aiConsent ?? "original",
  });

  const handlePlay = (e: React.MouseEvent, songs: any[], idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const playable = songs.filter((s: any) => s.audioUrl);
    const clickedTrack = songs[idx];
    if (!clickedTrack?.audioUrl) {
      toast.error("This track has no audio file attached.");
      return;
    }
    // Build queue starting from clicked song, then remaining
    const tracks = playable.map(buildTrack);
    const startIdx = tracks.findIndex((t) => t.id === String(clickedTrack.id));
    playQueueAt(tracks, startIdx >= 0 ? startIdx : 0);
    toast.success(`Now playing: ${clickedTrack.title}`);
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const { data: songs, isLoading: songsLoading } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  /* Optimistic publish toggle */
  const updateStatus = trpc.songs.updateStatus.useMutation({
    onMutate: async ({ songId, status }) => {
      await utils.songs.mySongs.cancel();
      const prev = utils.songs.mySongs.getData();
      utils.songs.mySongs.setData(undefined, (old) =>
        old?.map((s: any) => s.id === songId ? { ...s, status } : s)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.songs.mySongs.setData(undefined, ctx.prev);
      toast.error("Failed to update status");
    },
    onSuccess: (_data, vars) => {
      const label = vars.status === "Published" ? "Track published" : "Track set to Draft";
      toast.success(label);
    },
    onSettled: () => utils.songs.mySongs.invalidate(),
  });

  const handleToggle = (e: React.MouseEvent, song: any) => {
    e.preventDefault();
    e.stopPropagation();
    const next = song.status === "Published" ? "Draft" : "Published";
    updateStatus.mutate({ songId: song.id, status: next });
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.09 0.04 265)" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "oklch(0.84 0.155 85)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen" style={{ background: "oklch(0.09 0.04 265)" }}>
      <div className="container py-10 max-w-4xl mx-auto px-4" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
              My Archive
            </h1>
            <p className="text-sm mt-1" style={{ color: "#E2E8F0" }}>
              All tracks you have uploaded to Living Nexus
            </p>
          </div>
          <Link href="/upload">
            <Button size="sm" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>
              <Upload className="w-3 h-3 mr-1" /> Upload New
            </Button>
          </Link>
        </div>

        {/* ── Track count ────────────────────────────────────────── */}
        {!songsLoading && songs && (
          <p className="text-xs mb-4" style={{ color: "#E2E8F0" }}>
            {songs.length} {songs.length === 1 ? "track" : "tracks"}
          </p>
        )}

        {/* ── Loading skeleton ───────────────────────────────────── */}
        {songsLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse"
                style={{ background: "oklch(0.115 0.055 278)" }} />
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────── */}
        {!songsLoading && (!songs || songs.length === 0) && (
          <div className="text-center py-20 rounded-xl"
            style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
            <Music className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
            <p className="text-sm mb-4" style={{ color: "#E2E8F0" }}>
              You have not uploaded any tracks yet.
            </p>
            <Link href="/upload">
              <Button style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>
                Upload Your First Track
              </Button>
            </Link>
          </div>
        )}

        {/* ── Track list ─────────────────────────────────────────── */}
        {!songsLoading && songs && songs.length > 0 && (
          <div className="space-y-2">
            {songs.map((song: any, idx: number) => {
              const isPublished = song.status === "Published";
              const isPending = updateStatus.isPending && updateStatus.variables?.songId === song.id;
              const hasAudio = !!song.audioUrl;

              return (
                <div key={song.id}
                  onClick={(e) => hasAudio && handlePlay(e, songs, idx)}
                  className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:brightness-110"
                  style={{
                    background: "oklch(0.115 0.055 278)",
                    border: "1px solid oklch(0.18 0.015 280)",
                    cursor: hasAudio ? "pointer" : "default",
                  }}
                >
                    {/* Row number */}
                    <span className="text-xs w-5 text-center flex-shrink-0"
                      style={{ color: "#E2E8F0" }}>
                      {idx + 1}
                    </span>

                    {/* Cover art */}
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: "oklch(0.11 0.025 270)" }}>
                      {song.coverArtUrl
                        ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
                        : <Music className="w-4 h-4 opacity-40" style={{ color: "oklch(0.84 0.155 85)" }} />}
                    </div>

                    {/* Title + genre */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate"
                        style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>
                        {song.title}
                      </p>
                      {song.genre && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "#E2E8F0" }}>
                          {song.genre}
                        </p>
                      )}
                    </div>

                    {/* Upload date */}
                    <span className="text-xs flex-shrink-0 hidden sm:block"
                      style={{ color: "#E2E8F0" }}>
                      {formatDate(song.createdAt)}
                    </span>

                    {/* Status tag */}
                    <div className="flex-shrink-0">
                      <StatusTag status={song.status ?? "Draft"} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Play indicator */}
                      {hasAudio && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ color: "oklch(0.84 0.155 85)" }}
                          title="Click row to play">
                          <Play className="w-3 h-3" />
                        </div>
                      )}

                      {/* View song page */}
                      <Link href={`/song/${song.id}`}>
                        <button
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                          title="View song page"
                        >
                          <ExternalLink className="w-3 h-3" style={{ color: "oklch(0.65 0.2 300)" }} />
                        </button>
                      </Link>

                      {/* Edit */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingSong(song); }}
                        title="Edit track metadata"
                        className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all"
                        style={{
                          background: "rgba(212,175,55,0.1)",
                          color: "#D4AF37",
                          border: "1px solid rgba(212,175,55,0.3)",
                        }}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>

                      {/* Publish toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(e, song); }}
                        disabled={isPending}
                        title={isPublished ? "Unpublish (set to Draft)" : "Publish"}
                        className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all disabled:opacity-50"
                        style={isPublished
                          ? {
                              background: "oklch(0.65 0.18 145 / 0.15)",
                              color: "oklch(0.65 0.18 145)",
                              border: "1px solid oklch(0.65 0.18 145 / 0.35)",
                            }
                          : {
                              background: "oklch(0.75 0.18 85 / 0.15)",
                              color: "oklch(0.84 0.155 85)",
                              border: "1px solid oklch(0.75 0.18 85 / 0.35)",
                            }
                        }
                      >
                        {isPending ? (
                          <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
                            style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />
                        ) : isPublished ? (
                          <><EyeOff className="w-3 h-3" /> Unpublish</>
                        ) : (
                          <><Globe className="w-3 h-3" /> Publish</>
                        )}
                      </button>
                    </div>
                  </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* Edit Track Panel */}
    {editingSong && (
      <EditTrackPanel
        song={editingSong}
        onClose={() => setEditingSong(null)}
        onSaved={() => {
          setEditingSong(null);
          utils.songs.mySongs.invalidate();
        }}
      />
    )}
  </>);
}
