/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Archive Page
   Authenticated users only. Shows all of the user's own tracks.
   Phase 65: Added Delete button + confirm modal (WID preserved),
             drag-to-reorder with DB persistence, /dashboard/archive alias.
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Music, Upload, Globe, EyeOff, Pencil, ExternalLink,
  Play, ListMusic, Trash2, GripVertical, Shield,
} from "lucide-react";
import { EditTrackPanel } from "@/components/EditTrackPanel";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import MyListsTab from "@/components/MyListsTab";
import ExternalPlaylistsTab from "@/components/ExternalPlaylistsTab";

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

/* ── Confirm Delete Modal ───────────────────────────────────────── */
function ConfirmDeleteModal({
  song,
  onConfirm,
  onCancel,
  isPending,
}: {
  song: any;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl p-6 max-w-sm w-full"
        style={{
          background: "oklch(0.09 0.04 265)",
          border: "1px solid oklch(0.65 0.18 25 / 0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-bold text-lg mb-1" style={{ color: "oklch(0.75 0.18 25)", fontFamily: "'Cinzel', serif" }}>
          Delete Track
        </p>
        <p className="text-sm mb-1" style={{ color: "#E2E8F0" }}>
          Are you sure you want to delete:
        </p>
        <p className="font-semibold mb-4 truncate" style={{ color: "oklch(0.95 0.02 85)" }}>
          "{song.title}"
        </p>

        {/* WID Preservation Notice */}
        <div
          className="rounded-xl p-3 mb-5"
          style={{
            background: "oklch(0.84 0.155 85 / 0.08)",
            border: "1px solid oklch(0.84 0.155 85 / 0.25)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.84 0.155 85)" }} />
            <p className="text-xs font-bold" style={{ color: "oklch(0.84 0.155 85)" }}>
              WID Preserved
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#E2E8F0" }}>
            Your Witness ID <span className="font-mono" style={{ color: "oklch(0.84 0.155 85)" }}>{song.witnessId}</span> remains
            on record permanently. The cryptographic proof of origin is never deleted — only the track is removed from public view.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            style={{
              background: "oklch(0.65 0.18 25 / 0.2)",
              border: "1px solid oklch(0.65 0.18 25 / 0.5)",
              color: "oklch(0.75 0.18 25)",
            }}
          >
            {isPending ? "Deleting…" : "Delete Track"}
          </button>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ border: "1px solid oklch(0.25 0.02 280)", color: "#E2E8F0" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function ArchivePage() {
  const { isAuthenticated, loading } = useAuth();
  const [,] = useLocation();
  const utils = trpc.useUtils();
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const [deletingSong, setDeletingSong] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"tracks" | "lists" | "external">("tracks");
  const { playQueueAt } = usePlayer();
  const { user } = useAuth();
  const myArtistName = user?.artistHandle || user?.name || "Unknown Creator";

  // Drag-to-reorder state
  const [localSongs, setLocalSongs] = useState<any[]>([]);
  const draggedId = useRef<number | null>(null);
  const dragOverId = useRef<number | null>(null);

  const buildTrack = (song: any) => ({
    id: String(song.id),
    title: song.title ?? "Untitled Work",
    artist: myArtistName,
    audioUrl: song.fileUrl ?? "",
    coverArt: song.coverArtUrl ?? "",
    artUrl: song.coverArtUrl ?? undefined,
    genre: song.genre ?? "",
    witnessId: song.witnessId ?? "",
    aiDisclosure: song.aiConsent ?? "original",
    coverPositionX: song.coverPositionX ?? 50,
    coverPositionY: song.coverPositionY ?? 50,
  });

  const handlePlay = (e: React.MouseEvent, songList: any[], idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const playable = songList.filter((s: any) => s.fileUrl);
    const clickedTrack = songList[idx];
    if (!clickedTrack?.fileUrl) {
      toast.error("This track has no audio file attached.");
      return;
    }
    const tracks = playable.map(buildTrack);
    const startIdx = tracks.findIndex((t) => t.id === String(clickedTrack.id));
    playQueueAt(tracks, startIdx >= 0 ? startIdx : 0, "PLAYLIST");
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

  // Sync localSongs when server data arrives
  useEffect(() => {
    if (songs) setLocalSongs(songs);
  }, [songs]);

  /* Optimistic publish toggle */
  const updateStatus = trpc.songs.updateStatus.useMutation({
    onMutate: async ({ songId, status }) => {
      await utils.songs.mySongs.cancel();
      const prev = utils.songs.mySongs.getData();
      utils.songs.mySongs.setData(undefined, (old: any) =>
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

  /* Delete (soft) */
  const deleteSong = trpc.songs.delete.useMutation({
    onSuccess: () => {
      toast.success("Track removed. Your WID record is preserved permanently.");
      setDeletingSong(null);
      utils.songs.mySongs.invalidate();
    },
    onError: () => toast.error("Failed to delete track"),
  });

  /* Reorder */
  const reorderMySongs = trpc.songs.reorderMySongs.useMutation({
    onError: () => {
      toast.error("Failed to save order");
      if (songs) setLocalSongs(songs); // rollback
    },
  });

  const handleToggle = (e: React.MouseEvent, song: any) => {
    e.preventDefault();
    e.stopPropagation();
    const next = song.status === "Published" ? "Draft" : "Published";
    updateStatus.mutate({ songId: song.id, status: next });
  };

  /* ── Drag handlers ─────────────────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, id: number) => {
    draggedId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverId.current = id;
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId.current === null || draggedId.current === targetId) return;
    const from = localSongs.findIndex((s) => s.id === draggedId.current);
    const to = localSongs.findIndex((s) => s.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...localSongs];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLocalSongs(reordered);
    reorderMySongs.mutate({ songIds: reordered.map((s) => s.id) });
    toast.success("Track order saved");
    draggedId.current = null;
    dragOverId.current = null;
  };

  const handleDragEnd = () => {
    draggedId.current = null;
    dragOverId.current = null;
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.09 0.04 265)" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "oklch(0.84 0.155 85)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const displaySongs = localSongs.length > 0 ? localSongs : (songs ?? []);

  return (
    <>
    <div className="min-h-screen" style={{ background: "oklch(0.09 0.04 265)" }}>
      <div className="container py-10 max-w-4xl mx-auto px-4" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>

        {/* ── Breadcrumb ──────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-xs mb-5" style={{ color: "#E2E8F0" }}>
          <Link href="/dashboard">
            <span className="hover:underline cursor-pointer" style={{ color: "oklch(0.84 0.155 85)" }}>Dashboard</span>
          </Link>
          <span>/</span>
          <span style={{ color: "oklch(0.95 0.02 85)" }}>Archive</span>
        </nav>

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

        {/* ── Tab switcher ───────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "oklch(0.115 0.055 278)" }}>
          {(["tracks", "lists", "external"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={activeTab === tab
                ? { background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }
                : { color: "oklch(0.6 0.03 280)" }}
            >
              {tab === "tracks" && <><Music size={13} /> My Tracks</>}
              {tab === "lists"  && <><ListMusic size={13} /> My Lists</>}
              {tab === "external" && <><Globe size={13} /> External</>}
            </button>
          ))}
        </div>

        {activeTab === "lists"    && <MyListsTab />}
        {activeTab === "external" && <ExternalPlaylistsTab />}

        {/* ── Track count ────────────────────────────────────────── */}
        {activeTab === "tracks" && !songsLoading && displaySongs.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs" style={{ color: "#E2E8F0" }}>
              {displaySongs.length} {displaySongs.length === 1 ? "track" : "tracks"}
            </p>
            <p className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>
              Drag <GripVertical className="inline w-3 h-3" /> to reorder
            </p>
          </div>
        )}

        {/* ── Loading skeleton ────────────────────────────────────────── */}
        {activeTab === "tracks" && songsLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse"
                style={{ background: "oklch(0.115 0.055 278)" }} />
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────── */}
        {activeTab === "tracks" && !songsLoading && displaySongs.length === 0 && (
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

        {/* ── Track list ────────────────────────────────────────── */}
        {activeTab === "tracks" && !songsLoading && displaySongs.length > 0 && (
          <div className="space-y-2">
            {displaySongs.map((song: any, idx: number) => {
              const isPublished = song.status === "Published";
              const isPending = updateStatus.isPending && updateStatus.variables?.songId === song.id;
              const hasAudio = !!song.fileUrl;
              const isDeleted = song.status === "Deleted";

              return (
                <div
                  key={song.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, song.id)}
                  onDragOver={(e) => handleDragOver(e, song.id)}
                  onDrop={(e) => handleDrop(e, song.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => hasAudio && !isDeleted && handlePlay(e, displaySongs, idx)}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:brightness-110"
                  style={{
                    background: isDeleted ? "oklch(0.09 0.02 265)" : "oklch(0.115 0.055 278)",
                    border: `1px solid ${isDeleted ? "oklch(0.65 0.18 25 / 0.2)" : "oklch(0.18 0.015 280)"}`,
                    cursor: hasAudio && !isDeleted ? "pointer" : "default",
                    opacity: isDeleted ? 0.6 : 1,
                  }}
                >
                  {/* Drag handle */}
                  <div
                    className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" style={{ color: "oklch(0.4 0.02 280)" }} />
                  </div>

                  {/* Row number */}
                  <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: "#E2E8F0" }}>
                    {idx + 1}
                  </span>

                  {/* Cover art */}
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "oklch(0.11 0.025 270)" }}>
                    {song.coverArtUrl
                      ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover"
                          style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
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
                  <span className="text-xs flex-shrink-0 hidden sm:block" style={{ color: "#E2E8F0" }}>
                    {formatDate(song.createdAt)}
                  </span>

                  {/* Status tag */}
                  <div className="flex-shrink-0">
                    <StatusTag status={song.status ?? "Draft"} />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Play indicator */}
                    {hasAudio && !isDeleted && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ color: "oklch(0.84 0.155 85)" }} title="Click row to play">
                        <Play className="w-3 h-3" />
                      </div>
                    )}

                    {/* View song page */}
                    {!isDeleted && (
                      <Link href={`/song/${song.id}`}>
                        <button
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                          title="View song page"
                        >
                          <ExternalLink className="w-3 h-3" style={{ color: "oklch(0.65 0.2 300)" }} />
                        </button>
                      </Link>
                    )}

                    {/* Edit */}
                    {!isDeleted && (
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
                    )}

                    {/* Publish toggle */}
                    {!isDeleted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(e, song); }}
                        disabled={isPending}
                        title={isPublished ? "Unpublish (set to Draft)" : "Publish"}
                        className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all disabled:opacity-50"
                        style={isPublished
                          ? { background: "oklch(0.65 0.18 145 / 0.15)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.35)" }
                          : { background: "oklch(0.75 0.18 85 / 0.15)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.75 0.18 85 / 0.35)" }
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
                    )}

                    {/* Delete */}
                    {!isDeleted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingSong(song); }}
                        title="Delete track (WID preserved)"
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/20"
                        style={{ color: "oklch(0.65 0.18 25)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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

    {/* Confirm Delete Modal */}
    {deletingSong && (
      <ConfirmDeleteModal
        song={deletingSong}
        onConfirm={() => deleteSong.mutate({ songId: deletingSong.id })}
        onCancel={() => setDeletingSong(null)}
        isPending={deleteSong.isPending}
      />
    )}
  </>);
}
