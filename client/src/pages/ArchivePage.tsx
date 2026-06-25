/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Archive Page
   Authenticated users only. Shows all of the user's own tracks.
   Phase 66: Batch-select checkboxes, WID monospace under title,
             improved track numbers, drag handles, auth guard.
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Music, Upload, Globe, EyeOff, Eye, Pencil, ExternalLink,
  Play, ListMusic, Trash2, GripVertical, Shield, CheckSquare, Square,
  Download, Lock, Coins, Layers, AlertTriangle, X,
  Library, ChevronRight, Layers2, Search,
} from "lucide-react";
import { EditChapel } from "@/components/EditChapel";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import MyListsTab from "@/components/MyListsTab";
import ExternalPlaylistsTab from "@/components/ExternalPlaylistsTab";
import AddToNamedPlaylistPopover from "@/components/AddToNamedPlaylistPopover";


/* ── Status tag ─────────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Published: { bg: "color-mix(in srgb, var(--lnx-green) 15%, transparent)",  text: "var(--lnx-green-soft)"  },
  Draft:     { bg: "color-mix(in srgb, var(--lnx-orange) 15%, transparent)", text: "var(--lnx-orange-soft)" },
  Unlisted:  { bg: "rgba(196,154,40,0.15)",                             text: "var(--ln-gold)"   },
  Deleted:   { bg: "color-mix(in srgb, var(--lnx-red) 15%, transparent)",    text: "var(--lnx-red-soft)"   },
};

function StatusTag({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "rgba(63,74,80,0.18)", text: "var(--ln-smoke)" };
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

/* ── CollectionsSection — batch upload albums ───────────────────── */
function CollectionsSection() {
  const { data: collections = [], isLoading } = trpc.songs.getMyCollections.useQuery();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState<number | null>(null);
  const { data: tracks = [] } = trpc.songs.getCollectionTracks.useQuery(
    { collectionId: expanded! },
    { enabled: expanded !== null }
  );
  const { playQueueAt } = usePlayer();

  const handlePlayCollection = (e: React.MouseEvent, colId: number, colTracks: any[]) => {
    e.stopPropagation();
    const playable = colTracks.filter((t: any) => t.fileUrl);
    if (!playable.length) { toast.error("No playable tracks in this collection."); return; }
    playQueueAt(playable.map((t: any) => ({
      id: String(t.id),
      title: t.title ?? "Untitled",
      artist: t.creatorName ?? "Unknown",
      audioUrl: t.fileUrl,
      coverArt: t.coverArtUrl ?? "",
      artUrl: t.coverArtUrl ?? undefined,
      genre: t.genre ?? "",
      witnessId: t.witnessId ?? "",
      aiDisclosure: t.aiConsent ?? "original",
    })), 0, "PLAYLIST");
    toast.success(`Playing collection: ${colTracks[0]?.collectionName ?? ""}`);
  };

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "var(--ln-coal)" }} />)}
    </div>
  );

  return (
    <div>
      <h3 className="text-xs font-bold tracking-widest mb-3 flex items-center gap-2"
        style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
        <Library size={13} /> BATCH UPLOAD ALBUMS
        <span className="ml-auto text-xs font-normal" style={{ color: "var(--ln-iron)" }}>
          {collections.length} album{collections.length !== 1 ? "s" : ""}
        </span>
      </h3>
      {collections.length === 0 ? (
        <div className="rounded-xl p-6 text-center" style={{ border: "1px dashed rgba(196,154,40,0.2)", background: "rgba(196,154,40,0.02)" }}>
          <Library className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "var(--ln-gold)" }} />
          <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No batch upload albums yet.</p>
          <p className="text-xs mt-1" style={{ color: "var(--ln-iron)" }}>Upload multiple tracks together to create an album collection.</p>
          <Link href="/upload">
            <button className="mt-3 text-xs px-4 py-1.5 rounded-full transition-all"
              style={{ background: "rgba(196,154,40,0.10)", border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>
              Register Work →
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(collections as any[]).map((col: any) => {
            const isOpen = expanded === col.id;
            return (
              <div key={col.id} className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(196,154,40,0.18)", background: "var(--ln-coal)" }}>
                {/* Header row */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : col.id)}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(196,154,40,0.08)" }}>
                    <Library className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                      {col.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
                      {col.trackCount ?? 0} tracks
                    </p>
                  </div>
                  {/* Play all */}
                  {isOpen && tracks.length > 0 && (
                    <button
                      onClick={(e) => handlePlayCollection(e, col.id, tracks as any[])}
                      className="flex items-center gap-1 text-xs px-3 py-1 rounded-full flex-shrink-0"
                      style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
                    >
                      <Play size={11} /> Play All
                    </button>
                  )}
                  <ChevronRight
                    size={16}
                    className={`flex-shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
                    style={{ color: "var(--ln-smoke)" }}
                  />
                </div>
                {/* Expanded track list */}
                {isOpen && (
                  <div className="border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }}>
                    {(tracks as any[]).length === 0 ? (
                      <p className="text-xs p-4 text-center" style={{ color: "var(--ln-smoke)" }}>No tracks in this collection.</p>
                    ) : (
                      <div className="divide-y" style={{ borderColor: "rgba(196,154,40,0.08)" }}>
                        {(tracks as any[]).map((t: any, idx: number) => (
                          <div key={t.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors">
                            <span className="text-xs w-5 text-center font-mono tabular-nums flex-shrink-0" style={{ color: "var(--ln-smoke)" }}>{idx + 1}</span>
                            <div className="w-8 h-8 rounded flex-shrink-0 overflow-hidden flex items-center justify-center"
                              style={{ background: "rgba(196,154,40,0.08)" }}>
                              {t.coverArtUrl
                                ? <img src={t.coverArtUrl} alt={t.title} className="w-full h-full object-cover" />
                                : <Music size={12} style={{ color: "var(--ln-gold)" }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{t.title}</p>
                              {t.witnessId && <p className="text-[11px] font-mono truncate" style={{ color: "rgba(196,154,40,0.5)" }}>{t.witnessId}</p>}
                              {(t.lyricsWid || t.song?.lyricsWid) && <p className="text-[10px] font-mono truncate" style={{ color: "rgba(196,154,40,0.35)" }}>{t.lyricsWid ?? t.song?.lyricsWid}</p>}
                            </div>
                            <Link href={`/song/${t.id}`}>
                              <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 flex-shrink-0">
                                <ExternalLink size={12} style={{ color: "var(--ln-gold)" }} />
                              </button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
          background: "var(--ln-coal)",
          border: "1px solid color-mix(in srgb, var(--lnx-red) 35%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-bold text-lg mb-1" style={{ color: "var(--ln-ember)", fontFamily: "'Cinzel', serif" }}>
          Delete Track
        </p>
        <p className="text-sm mb-1" style={{ color: "#E2E8F0" }}>
          Are you sure you want to delete:
        </p>
        <p className="font-semibold mb-4 truncate" style={{ color: "var(--ln-parchment)" }}>
          "{song.title}"
        </p>

        {/* WID Preservation Notice */}
        <div
          className="rounded-xl p-3 mb-5"
          style={{
            background: "rgba(196,154,40,0.05)",
            border: "1px solid rgba(196,154,40,0.2)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
            <p className="text-xs font-bold" style={{ color: "var(--ln-gold)" }}>
              WID Preserved
            </p>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#E2E8F0" }}>
            Your Witness ID{" "}
            <span className="font-mono text-[11px]" style={{ color: "var(--ln-gold)" }}>
              {song.witnessId}
            </span>{" "}
            remains on record permanently. The cryptographic proof of origin is never deleted — only the track is removed from public view.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
            style={{
              background: "color-mix(in srgb, var(--lnx-red) 20%, transparent)",
              border: "1px solid color-mix(in srgb, var(--lnx-red) 50%, transparent)",
              color: "var(--ln-ember)",
            }}
          >
            {isPending ? "Deleting…" : "Delete Track"}
          </button>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ border: "1px solid #C3AB7D", color: "#E2E8F0" }}
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
  const [activeTab, setActiveTab] = useState<"tracks" | "collections" | "external" | "witnessed">("tracks");

  // ── Witnessed Works (Witness Subscription Archive) ────────────────────────────────────────────
  const [witnessArchivePage, setWitnessArchivePage] = useState(0);
  const WITNESS_PAGE_SIZE = 20;
  const { data: witnessArchiveData, isLoading: witnessArchiveLoading } = trpc.witnessSubscription.getMyArchive.useQuery(
    { limit: WITNESS_PAGE_SIZE, offset: witnessArchivePage * WITNESS_PAGE_SIZE },
    { enabled: isAuthenticated && activeTab === "witnessed", staleTime: 30_000 }
  );
  const witnessArchiveItems = witnessArchiveData?.items ?? [];
  const witnessArchiveTotal = witnessArchiveData?.total ?? 0;
  const { playQueueAt } = usePlayer();
  const { user } = useAuth();
  const myArtistName = user?.artistHandle || user?.name || "Unknown Creator";

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  // Drag-to-reorder state
  const [localSongs, setLocalSongs] = useState<any[]>([]);
  const draggedId = useRef<number | null>(null);
  const dragOverId = useRef<number | null>(null);

  // Filter + sort state
  const [statusFilter, setStatusFilter] = useState<"All" | "Published" | "Draft" | "Deleted">("All");
  const [missingArtFilter, setMissingArtFilter] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [trackSearch, setTrackSearch] = useState("");

  const buildTrack = (song: any) => ({
    id: String(song.id),
    title: song.title ?? "Untitled Work",
    artist: myArtistName,
    audioUrl: song.fileUrl || undefined,
    coverArt: song.coverArtUrl ?? "",
    artUrl: song.coverArtUrl ?? undefined,
    genre: song.genre ?? "",
    witnessId: song.witnessId ?? "",
    aiDisclosure: song.aiConsent ?? "original",
    coverPositionX: song.coverPositionX ?? 50,
    coverPositionY: song.coverPositionY ?? 50,
    visualReady: song.visualReady ?? false,
    autoVideoUrl: song.autoVideoUrl ?? undefined,
    creatorRole: song.creator?.role ?? undefined,
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

  // No hard redirect — guests see a soft sign-in gate below

  const { data: songs, isLoading: songsLoading } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Sync localSongs when server data arrives
  useEffect(() => {
    if (songs) setLocalSongs(songs);
  }, [songs]);

  // Clear selection when exiting batch mode
  useEffect(() => {
    if (!batchMode) setSelectedIds(new Set());
  }, [batchMode]);

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

  /* Dismiss all drafts */
  const dismissDrafts = trpc.songs.dismissDrafts.useMutation({
    onSuccess: (data) => {
      toast.success(`Cleared ${data.deleted} stale draft${data.deleted === 1 ? "" : "s"}.`);
      utils.songs.mySongs.invalidate();
    },
    onError: () => toast.error("Failed to clear drafts"),
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

  /* Download permission — optimistic cycle: none → free → tipped → none */
  const updateDownload = trpc.songDownload.updatePermission.useMutation({
    onMutate: async ({ songId, permission }) => {
      await utils.songs.mySongs.cancel();
      const prev = utils.songs.mySongs.getData();
      utils.songs.mySongs.setData(undefined, (old: any) =>
        old?.map((s: any) => s.id === songId ? { ...s, downloadPermission: permission } : s)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.songs.mySongs.setData(undefined, ctx.prev);
      toast.error("Failed to update download setting");
    },
    onSuccess: (_data, vars) => {
      const labels: Record<string, string> = { none: "Downloads off", free: "Free downloads on", tipped: "Tip-gated downloads on" };
      toast.success(labels[vars.permission] ?? "Download setting updated");
    },
    onSettled: () => utils.songs.mySongs.invalidate(),
  });

  const cycleDownload = (e: React.MouseEvent, song: any) => {
    e.preventDefault();
    e.stopPropagation();
    const cycle: Record<string, "none" | "free" | "tipped"> = { none: "free", free: "tipped", tipped: "none" };
    const current = (song.downloadPermission ?? "none") as string;
    const next = cycle[current] ?? "none";
    updateDownload.mutate({ songId: song.id, permission: next, tipThresholdCents: song.downloadTipThresholdCents ?? 179 });
  };

  /* Reorder — calls songs.reorder which validates ownership server-side */
  const reorderMySongs = trpc.songs.reorder.useMutation({
    onError: () => {
      toast.error("Failed to save order");
      if (songs) setLocalSongs(songs); // rollback
    },
  });

  // Pull-to-refresh — MUST be declared here (before any early returns) to satisfy Rules of Hooks
  const { pullProgress, isRefreshing, indicatorY } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        utils.songs.mySongs.invalidate(),
        utils.userCollections.list.invalidate(),
        utils.witnessSubscription.getMyArchive.invalidate(),
      ]);
    },
  });

  const handleToggle = (e: React.MouseEvent, song: any) => {
    e.preventDefault();
    e.stopPropagation();
    const next = song.status === "Published" ? "Draft" : "Published";
    updateStatus.mutate({ songId: song.id, status: next });
  };

  /* ── Batch selection helpers ───────────────────────────────────── */
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const nonDeleted = displaySongs.filter((s: any) => s.status !== "Deleted").map((s: any) => s.id);
    setSelectedIds(new Set(nonDeleted));
  };

  const clearSelection = () => setSelectedIds(new Set());

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
    reorderMySongs.mutate({ orderedIds: reordered.map((s: any) => s.id) });
    toast.success("Track order saved");
    draggedId.current = null;
    dragOverId.current = null;
  };

  const handleDragEnd = () => {
    draggedId.current = null;
    dragOverId.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--ln-gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "var(--ln-coal)" }}>
        <div className="w-12 h-12 rounded-full border-2 mb-2" style={{ borderColor: "var(--ln-gold)", boxShadow: "0 0 24px rgba(196,154,40,0.2)" }} />
        <p className="text-lg font-heading" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Your Archive</p>
        <p className="text-sm text-center max-w-xs" style={{ color: "var(--ln-smoke)" }}>Sign in to manage your registered works, download permissions, and provenance records.</p>
        <a href={getLoginUrl("/archive")} className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>Sign In</a>
      </div>
    );
  }

  const displaySongs = localSongs.length > 0 ? localSongs : (songs ?? []);
  const nonDeletedCount = displaySongs.filter((s: any) => s.status !== "Deleted").length;

  // Derived: filtered + sorted list for display
  const filteredSongs = (() => {
    let list = [...displaySongs];
    if (statusFilter !== "All") {
      list = list.filter((s: any) => s.status === statusFilter);
    }
    if (missingArtFilter) {
      list = list.filter((s: any) => !s.coverArtUrl);
    }
    if (trackSearch.trim()) {
      const q = trackSearch.trim().toLowerCase();
      list = list.filter((s: any) => {
        // Title
        if ((s.title ?? "").toLowerCase().includes(q)) return true;
        // Genre
        if ((s.genre ?? "").toLowerCase().includes(q)) return true;
        // Mood tags (JSON array of strings)
        if (Array.isArray(s.moodTags) && s.moodTags.some((t: string) => t.toLowerCase().includes(q))) return true;
        // Co-writers (JSON array of strings)
        if (Array.isArray(s.coWriters) && s.coWriters.some((w: string) => w.toLowerCase().includes(q))) return true;
        // Credits JSON — array of { role, name } — search both name and role
        if (s.creditsJson) {
          try {
            const credits: { role: string; name: string }[] = typeof s.creditsJson === "string" ? JSON.parse(s.creditsJson) : s.creditsJson;
            if (Array.isArray(credits) && credits.some(c =>
              (c.name ?? "").toLowerCase().includes(q) ||
              (c.role ?? "").toLowerCase().includes(q)
            )) return true;
          } catch { /* malformed JSON — skip */ }
        }
        return false;
      });
    }
    if (sortBy === "newest") {
      list.sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a: any, b: any) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
    } else if (sortBy === "title") {
      list.sort((a: any, b: any) => (a.title ?? "").localeCompare(b.title ?? ""));
    }
    return list;
  })();

  return (
    <>
    <PullToRefreshIndicator
      pullProgress={pullProgress}
      isRefreshing={isRefreshing}
      indicatorY={indicatorY}
    />
    <div className="min-h-screen" style={{ background: "#000000" }}>
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: "200px" }}>
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663123503966/znZFuENyiCRsHFOi.png"
          alt="Archive hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "saturate(1.15) contrast(1.1)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,15,30,0.85) 0%, rgba(20,25,40,0.45) 45%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(53,62,67,0.85) 0%, rgba(53,62,67,0.15) 40%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 p-6">
          <p className="text-xs mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)", letterSpacing: "0.18em" }}>LIVING NEXUS</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>LNX Archive</h1>
          <p className="text-sm mt-1" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--ln-parchment)" }}>The permanent record of witnessed creative works</p>
        </div>
      </div>
      <div className="container py-10 max-w-4xl mx-auto px-4" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>

        {/* ── Breadcrumb ──────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-xs mb-5" style={{ color: "#E2E8F0" }}>
          <Link href="/dashboard">
            <span className="hover:underline cursor-pointer" style={{ color: "var(--ln-gold)" }}>Dashboard</span>
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ln-parchment)" }}>Archive</span>
        </nav>

        {/* ── Upload action ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-end mb-6">
          <Link href="/upload">
            <Button size="sm" style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
              <Upload className="w-3 h-3 mr-1" /> Upload New
            </Button>
          </Link>
        </div>

        {/* ── Slot Usage Bar ─────────────────────────────────────────── */}
        {(() => {
          const slotsUsed = (songs as any)?.[0]?.slotsUsed ?? nonDeletedCount;
          const slotsTotal = (user as any)?.songSlotsTotal ?? 100;
          const slotPct = slotsTotal > 0 ? Math.round((nonDeletedCount / slotsTotal) * 100) : 0;
          const isNear = slotPct >= 90;
          const isFull = nonDeletedCount >= slotsTotal;
          return (
            <Link href="/settings/billing">
              <div
                className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border cursor-pointer hover:border-amber-500/50 transition-colors"
                style={{
                  background: isFull ? "rgba(44,52,56,0.4)" : isNear ? "rgba(44,52,56,0.3)" : "var(--ln-coal)",
                  borderColor: isFull ? "rgba(239,68,68,0.4)" : isNear ? "rgba(196,154,40,0.34)" : "rgba(44,52,56,0.4)",
                }}
              >
                {isFull ? (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-ember)" }} />
                ) : (
                  <Layers className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: isFull ? "var(--ln-ember)" : isNear ? "var(--ln-parchment)" : "var(--ln-parchment)" }}>
                      {isFull ? "Archive Full" : isNear ? "Approaching Slot Limit" : "Archive Slots"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                      {nonDeletedCount} / {slotsTotal}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "var(--ln-coal)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(slotPct, 100)}%`,
                        background: isFull ? "var(--ln-ember)" : isNear ? "var(--ln-gold)" : "var(--ln-seal-bright)",
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--ln-smoke)" }}>Manage →</span>
              </div>
            </Link>
          );
        })()}

        {/* ── Tab switcher ──────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl flex-wrap" style={{ background: "var(--ln-coal)" }}>
          {(["tracks", "collections", "external", "witnessed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={activeTab === tab
                ? { background: "var(--ln-gold)", color: "var(--ln-parchment)" }
                : { color: "var(--ln-smoke)" }}
            >
              {tab === "tracks" && <><Music size={13} /> My Tracks</>}
              {tab === "collections" && <><Layers2 size={13} /> Collections &amp; Playlists</>}
              {tab === "external" && <><Globe size={13} /> External</>}
              {tab === "witnessed" && <><Eye size={13} /> My Archive</>}
            </button>
          ))}
        </div>

        {activeTab === "collections" && (
          <div className="space-y-8">
            {/* ── Batch Upload Albums (userCollections) ── */}
            <CollectionsSection />
            {/* ── Named Playlists ── */}
            <div>
              <h3 className="text-xs font-bold tracking-widest mb-3 flex items-center gap-2"
                style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
                <ListMusic size={13} /> NAMED PLAYLISTS
              </h3>
              <MyListsTab />
            </div>
          </div>
        )}
        {activeTab === "external" && <ExternalPlaylistsTab />}

        {/* ── My Archive (Witness Subscription reserved works) ─────────────────────────────────────────────────── */}
        {activeTab === "witnessed" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold tracking-widest flex items-center gap-2"
                style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
                <Eye size={13} /> MY ARCHIVE
              </h2>
              {witnessArchiveTotal > 0 && (
                <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                  {witnessArchiveTotal} reserved {witnessArchiveTotal === 1 ? "work" : "works"}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm mb-4" style={{ color: "var(--ln-smoke)" }}>
              Works reserved from creators you subscribe to. These are preserved in your archive as they are published.
            </p>

            {witnessArchiveLoading && (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--ln-coal)" }} />
                ))}
              </div>
            )}

            {!witnessArchiveLoading && witnessArchiveItems.length === 0 && (
              <div className="text-center py-12 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                <Eye className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: "var(--ln-smoke)" }} />
                <p className="text-sm font-medium mb-1" style={{ color: "var(--ln-parchment)" }}>No reserved works yet</p>
                <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                  Subscribe to creators at the Reserve or Steward tier to automatically archive their new publications.
                </p>
              </div>
            )}

            {!witnessArchiveLoading && witnessArchiveItems.length > 0 && (
              <div className="space-y-2">
                {witnessArchiveItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ background: "var(--ln-coal)", border: "1px solid rgba(99,102,241,0.15)" }}
                  >
                    {/* Cover art */}
                    {item.coverArtUrl ? (
                      <img
                        src={item.coverArtUrl}
                        alt={item.title}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ background: "rgba(99,102,241,0.1)" }}>
                        <Eye size={16} style={{ color: "#a5b4fc" }} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.wid && (
                          <span className="text-[10px] font-mono" style={{ color: "var(--ln-gold)" }}>
                            {item.wid}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                          {item.contentType}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                          Reserved {new Date(item.reservedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Tier badge */}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{
                        background: item.tier === "steward" ? "rgba(16,185,129,0.12)" : item.tier === "reserve" ? "rgba(99,102,241,0.12)" : "rgba(196,154,40,0.08)",
                        color: item.tier === "steward" ? "#6ee7b7" : item.tier === "reserve" ? "#a5b4fc" : "var(--ln-gold)",
                        border: `1px solid ${item.tier === "steward" ? "rgba(16,185,129,0.25)" : item.tier === "reserve" ? "rgba(99,102,241,0.25)" : "rgba(196,154,40,0.2)"}`,
                      }}
                    >
                      {item.tier === "witness" ? "Witness" : item.tier === "reserve" ? "Reserve" : "Steward"}
                    </span>

                    {/* Link to work */}
                    {item.slug && (
                      <a
                        href={`/w/${item.slug}`}
                        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: "var(--ln-parchment)" }}
                        title="View work"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {witnessArchiveTotal > WITNESS_PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setWitnessArchivePage(p => Math.max(0, p - 1))}
                  disabled={witnessArchivePage === 0}
                  className="px-4 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "var(--ln-smoke)" }}
                >
                  Previous
                </button>
                <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                  Page {witnessArchivePage + 1} of {Math.ceil(witnessArchiveTotal / WITNESS_PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setWitnessArchivePage(p => p + 1)}
                  disabled={(witnessArchivePage + 1) * WITNESS_PAGE_SIZE >= witnessArchiveTotal}
                  className="px-4 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "var(--ln-smoke)" }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Filter + Sort bar ─────────────────────────────────── */}
        {activeTab === "tracks" && !songsLoading && displaySongs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Search box */}
            <div className="relative flex items-center" style={{ minWidth: 180, maxWidth: 260, flex: "1 1 180px" }}>
              <Search className="absolute left-2.5 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--ln-smoke)" }} />
              <input
                type="text"
                value={trackSearch}
                onChange={e => setTrackSearch(e.target.value)}
                placeholder="Search my works…"
                className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: trackSearch ? "1px solid rgba(196,154,40,0.45)" : "1px solid rgba(255,255,255,0.1)",
                  color: "#E2E8F0",
                }}
              />
              {trackSearch && (
                <button
                  onClick={() => setTrackSearch("")}
                  className="absolute right-2 flex items-center justify-center w-4 h-4 rounded-full transition-opacity hover:opacity-100 opacity-60"
                  style={{ color: "var(--ln-smoke)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Status filter pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {(["All", "Published", "Draft", "Deleted"] as const).map((f) => {
                const counts: Record<string, number> = {
                  All: displaySongs.length,
                  Published: displaySongs.filter((s: any) => s.status === "Published").length,
                  Draft: displaySongs.filter((s: any) => s.status === "Draft").length,
                  Deleted: displaySongs.filter((s: any) => s.status === "Deleted").length,
                };
                const active = statusFilter === f;
                const colors: Record<string, { active: string; dot: string }> = {
                  All: { active: "var(--ln-gold)", dot: "var(--ln-gold)" },
                  Published: { active: "var(--lnx-green-soft)", dot: "var(--lnx-green-soft)" },
                  Draft: { active: "var(--lnx-orange-soft)", dot: "var(--lnx-orange-soft)" },
                  Deleted: { active: "var(--lnx-red-soft)", dot: "var(--lnx-red-soft)" },
                };
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                    style={active
                      ? { background: "rgba(196,154,40,0.12)", border: `1px solid ${colors[f].active}`, color: colors[f].active }
                      : { background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "var(--ln-smoke)" }
                    }
                  >
                    {f !== "All" && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: active ? colors[f].dot : "rgba(255,255,255,0.25)" }} />
                    )}
                    {f} <span className="opacity-60">({counts[f]})</span>
                  </button>
                );
              })}
            </div>
            {/* Missing Art filter pill */}
            {displaySongs.filter((s: any) => !s.coverArtUrl).length > 0 && (
              <button
                onClick={() => setMissingArtFilter(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={missingArtFilter
                  ? { background: "rgba(234,179,8,0.12)", border: "1px solid #eab308", color: "#eab308" }
                  : { background: "transparent", border: "1px solid rgba(234,179,8,0.35)", color: "rgba(234,179,8,0.65)" }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: missingArtFilter ? "#eab308" : "rgba(234,179,8,0.4)" }} />
                Missing Art <span className="opacity-60">({displaySongs.filter((s: any) => !s.coverArtUrl).length})</span>
              </button>
            )}
            {/* Sort dropdown */}
            <div className="ml-auto flex items-center gap-1">
              <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Sort:</span>
              {(["newest", "oldest", "title"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className="px-2 py-0.5 rounded text-xs transition-all"
                  style={sortBy === s
                    ? { background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }
                    : { color: "var(--ln-smoke)", border: "1px solid transparent" }
                  }
                >
                  {s === "newest" ? "Newest" : s === "oldest" ? "Oldest" : "A–Z"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Track toolbar ──────────────────────────────────────── */}
        {activeTab === "tracks" && !songsLoading && displaySongs.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            {/* Left: count + batch toggle */}
            <div className="flex items-center gap-3">
              <p className="text-xs" style={{ color: "#E2E8F0" }}>
                {nonDeletedCount} {nonDeletedCount === 1 ? "track" : "tracks"}
              </p>
              <button
                onClick={() => setBatchMode(b => !b)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
                style={batchMode
                  ? { background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }
                  : { color: "var(--ln-smoke)", border: "1px solid #C49A28" }
                }
              >
                <CheckSquare className="w-3 h-3" />
                {batchMode ? "Exit Select" : "Select"}
              </button>
              {batchMode && (
                <>
                  <button
                    onClick={selectAll}
                    className="text-xs px-2 py-1 rounded-lg transition-all"
                    style={{ color: "var(--ln-smoke)", border: "1px solid #C49A28" }}
                  >
                    All
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-xs px-2 py-1 rounded-lg transition-all"
                      style={{ color: "var(--ln-smoke)", border: "1px solid #C49A28" }}
                    >
                      Clear ({selectedIds.size})
                    </button>
                  )}
                </>
              )}
            </div>
            {/* Right: drag hint */}
            {!batchMode && (
              <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                Drag <GripVertical className="inline w-3 h-3" /> to reorder
              </p>
            )}
          </div>
        )}

          {/* ── Phase 148H: Draft Continuation Card ──────────────── */}
        {activeTab === "tracks" && !songsLoading && (() => {
          const draftSongs = displaySongs.filter((s: any) => s.status === "Draft");
          if (draftSongs.length === 0) return null;
          const newestDraft = draftSongs[0];
          const draftType = newestDraft?.contentType ?? "audio";
          const typeLabel: Record<string, string> = { audio: "Audio Manifestation", lyrics: "Lyrics Work", manuscript: "Manuscript", comic: "Comic / Novel" };
          const daysSince = newestDraft?.createdAt
            ? Math.floor((Date.now() - new Date(newestDraft.createdAt).getTime()) / 86400000)
            : null;
          const isBook = draftType === "manuscript" || draftType === "comic";
          const resumeHref = isBook ? `/book/${newestDraft.id}/studio` : `/upload?editId=${newestDraft.id}&type=${draftType}`;
          return (
            <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.15)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Pencil style={{ color: "rgba(212,175,55,0.55)", width: 14, height: 14 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "rgba(212,175,55,0.80)", fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }}>
                  {draftSongs.length === 1
                    ? `Unpublished Draft: "${newestDraft.title || "Untitled"}"`
                    : `${draftSongs.length} unpublished drafts in your archive`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.32)", fontFamily: "'DM Sans', sans-serif" }}>
                  {daysSince !== null && daysSince > 0 ? `Last touched ${daysSince} day${daysSince === 1 ? "" : "s"} ago — ` : ""}
                  Saved — continue editing or publish when ready.
                </p>
              </div>
              {/* Continue button — only shown for single draft */}
              {draftSongs.length === 1 && (
                <Link href={resumeHref}>
                  <button className="text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-all"
                    style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37", fontFamily: "'Cinzel', serif", letterSpacing: "0.06em", cursor: "pointer" }}>
                    Continue →
                  </button>
                </Link>
              )}
              {/* Dismiss / clear all drafts button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (dismissDrafts.isPending) return;
                  dismissDrafts.mutate({});
                }}
                disabled={dismissDrafts.isPending}
                title={draftSongs.length === 1 ? "Dismiss this draft" : "Clear all drafts"}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.40)", cursor: "pointer" }}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
          );
        })()}

        {/* ── Loading skeleton ─────────────────────────────────────── */}
        {activeTab === "tracks" && songsLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse"
                style={{ background: "var(--ln-coal)" }} />
            ))}
          </div>
        )}

        {/* ── Empty state (Phase 148G — Intelligent CTA) ─────────── */}
        {activeTab === "tracks" && !songsLoading && displaySongs.length === 0 && (() => {
          // Determine intelligent upload destination based on any existing content
          // (songs may be empty but guide drafts or other signals could exist)
          // For now: brand-new users (no songs at all) get the type selector
          // Future: check guide drafts via trpc.guides.myGuides when available
          const uploadHref = "/upload";
          const ctaLabel = "Register Your First Work";
          const ctaSubtext = "Begin witnessing creation.";

          return (
            <div className="text-center py-24 rounded-2xl flex flex-col items-center"
              style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(10,10,10,0.90) 100%)", border: "1px dashed rgba(212,175,55,0.25)", boxShadow: "inset 0 0 60px rgba(212,175,55,0.03)" }}>
              <div className="mb-6" style={{ width: 72, height: 72, borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)", border: "1px solid rgba(212,175,55,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Music style={{ color: "rgba(212,175,55,0.45)", width: 28, height: 28 }} />
              </div>
              <p className="text-base font-semibold mb-2" style={{ color: "rgba(212,175,55,0.75)", fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}>
                No manifestations archived yet.
              </p>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.38)", fontFamily: "'DM Sans', sans-serif" }}>
                {ctaSubtext}
              </p>
              {/* Manifestation type selector — quick-pick before routing */}
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {([
                  { type: "audio", label: "Audio", icon: "♪" },
                  { type: "comic", label: "Comic / Novel", icon: "◈" },
                  { type: "manuscript", label: "Manuscript", icon: "⊞" },
                  { type: "lyrics", label: "Lyrics", icon: "≡" },
                ] as const).map(({ type, label, icon }) => (
                  <Link key={type} href={`${uploadHref}?type=${type}`}>
                    <button
                      className="px-3 py-1.5 rounded-full text-xs transition-all"
                      style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.20)", color: "rgba(212,175,55,0.65)", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}
                    >
                      <span className="mr-1.5">{icon}</span>{label}
                    </button>
                  </Link>
                ))}
              </div>
              <Link href={uploadHref}>
                <Button style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.10) 100%)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.30)", fontFamily: "'Cinzel', serif", letterSpacing: "0.10em", fontSize: "11px" }}>
                  {ctaLabel}
                </Button>
              </Link>
            </div>
          );
        })()}

        {/* ── Track list ────────────────────────────────────────── */}
        {activeTab === "tracks" && !songsLoading && displaySongs.length > 0 && (
          <div className="space-y-2">
            {filteredSongs.length === 0 && (
              <div className="text-center py-10 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                {trackSearch.trim() ? (
                  <>
                    <p className="text-sm mb-1" style={{ color: "var(--ln-smoke)" }}>No works found for “{trackSearch.trim()}”</p>
                    <button onClick={() => setTrackSearch("")} className="text-xs underline" style={{ color: "var(--ln-gold)" }}>Clear search</button>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No tracks match the current filter.</p>
                )}
              </div>
            )}
            {filteredSongs.map((song: any, idx: number) => {
              const isPublished = song.status === "Published";
              const isPending = updateStatus.isPending && updateStatus.variables?.songId === song.id;
              const hasAudio = !!song.fileUrl;
              const isDeleted = song.status === "Deleted";
              const isSelected = selectedIds.has(song.id);

              return (
                <div
                  key={song.id}
                  draggable={!batchMode && !isDeleted}
                  onDragStart={(e) => !batchMode && handleDragStart(e, song.id)}
                  onDragOver={(e) => !batchMode && handleDragOver(e, song.id)}
                  onDrop={(e) => !batchMode && handleDrop(e, song.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    if (batchMode && !isDeleted) { toggleSelect(song.id); return; }
                    if (hasAudio && !isDeleted) handlePlay(e, filteredSongs, idx);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:brightness-110"
                  style={{
                    background: isSelected
                      ? "rgba(196,154,40,0.05)"
                      : isDeleted ? "var(--ln-coal)" : "var(--ln-coal)",
                    border: isSelected
                      ? "1px solid rgba(196,154,40,0.3)"
                      : `1px solid ${isDeleted ? "color-mix(in srgb, var(--lnx-red) 20%, transparent)" : "var(--ln-gold)"}`,
                    cursor: batchMode ? (isDeleted ? "default" : "pointer") : (hasAudio && !isDeleted ? "pointer" : "default"),
                    opacity: isDeleted ? 0.6 : 1,
                  }}
                >
                  {/* Batch checkbox OR drag handle */}
                  {batchMode ? (
                    <div
                      className="flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); if (!isDeleted) toggleSelect(song.id); }}
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                        : <Square className="w-4 h-4" style={{ color: "var(--ln-iron)" }} />
                      }
                    </div>
                  ) : (
                    <div
                      className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                      onClick={(e) => e.stopPropagation()}
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" style={{ color: "var(--ln-iron)" }} />
                    </div>
                  )}

                  {/* Track number */}
                  <span
                    className="text-xs w-5 text-center flex-shrink-0 font-mono tabular-nums"
                    style={{ color: "var(--ln-smoke)" }}
                  >
                    {idx + 1}
                  </span>

                  {/* Cover art */}
                  <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "var(--ln-coal)" }}>
                    {song.coverArtUrl
                      ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover"
                          style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                      : <Music className="w-4 h-4 opacity-40" style={{ color: "var(--ln-gold)" }} />}
                  </div>

                  {/* Title + WID + genre */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate"
                      style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
                      {song.title}
                    </p>
                    {/* WID in monospace — always shown if present */}
                    {song.witnessId && (
                      <p
                        className="font-mono text-[11px] truncate mt-0.5 tracking-tight"
                        style={{ color: "rgba(196,154,40,0.55)" }}
                        title={`Witness ID: ${song.witnessId}`}
                      >
                        {song.witnessId}
                      </p>
                    )}
                    {/* Genre — only if no WID shown */}
                    {!song.witnessId && song.genre && (
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

                  {/* Action buttons — hidden in batch mode */}
                  {!batchMode && (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Play button */}
                      {hasAudio && !isDeleted && (
                        <button
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                          style={{ color: "var(--ln-gold)" }}
                          title="Play track"
                          onClick={(e) => { e.stopPropagation(); handlePlay(e, filteredSongs, idx); }}
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}

                      {/* View page — route books/manuscripts/comics to /book/:id */}
                      {!isDeleted && (() => {
                        const isBook = song.contentType === "manuscript" || song.contentType === "comic";
                        const viewHref = isBook ? `/book/${song.id}` : `/song/${song.id}`;
                        const viewTitle = isBook ? "View book page" : "View song page";
                        return (
                          <Link href={viewHref}>
                            <button
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                              title={viewTitle}
                            >
                              <ExternalLink className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
                            </button>
                          </Link>
                        );
                      })()}

                      {/* Edit */}
                      {!isDeleted && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingSong(song); }}
                          title="Edit track metadata"
                          className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all"
                          style={{
                            background: "rgba(212,175,55,0.1)",
                            color: "var(--ln-gold)",
                            border: "1px solid rgba(212,175,55,0.3)",
                          }}
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                      )}

                      {/* Download permission cycle button */}
                      {!isDeleted && (() => {
                        const dlPerm = (song.downloadPermission ?? "none") as string;
                        const dlPending = updateDownload.isPending && updateDownload.variables?.songId === song.id;
                        const dlConfig: Record<string, { icon: React.ReactNode; label: string; bg: string; color: string; border: string }> = {
                          none: {
                            icon: <Lock className="w-3 h-3" />,
                            label: "No DL",
                            bg: "rgba(44,52,56,0.6)",
                            color: "var(--ln-parchment)",
                            border: "1px solid rgba(196,154,40,0.10)",
                          },
                          free: {
                            icon: <Download className="w-3 h-3" />,
                            label: "Free DL",
                            bg: "rgba(74,222,128,0.12)",
                            color: "var(--ln-seal-bright)",
                            border: "1px solid rgba(74,222,128,0.35)",
                          },
                          tipped: {
                            icon: <Coins className="w-3 h-3" />,
                            label: "Tip DL",
                            bg: "rgba(196,154,40,0.08)",
                            color: "var(--ln-gold)",
                            border: "1px solid rgba(196,154,40,0.3)",
                          },
                        };
                        const cfg = dlConfig[dlPerm] ?? dlConfig.none;
                        return (
                          <button
                            onClick={(e) => cycleDownload(e, song)}
                            disabled={dlPending}
                            title={`Download: ${dlPerm} — click to cycle`}
                            className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all disabled:opacity-50"
                            style={{ background: cfg.bg, color: cfg.color, border: cfg.border }}
                          >
                            {dlPending
                              ? <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />
                              : cfg.icon
                            }
                            {cfg.label}
                          </button>
                        );
                      })()}

                      {/* Add to named playlist (published songs only) */}
                      {isPublished && (
                        <span onClick={(e) => e.stopPropagation()}>
                          <AddToNamedPlaylistPopover songId={song.id} songTitle={song.title} variant="compact" />
                        </span>
                      )}
                      {/* Publish toggle */}
                      {!isDeleted && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(e, song); }}
                          disabled={isPending}
                          title={isPublished ? "Unpublish (set to Draft)" : "Publish"}
                          className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-all disabled:opacity-50"
                          style={isPublished
                            ? { background: "rgba(58,138,86,0.15)", color: "var(--ln-seal-bright)", border: "1px solid rgba(74,222,128,0.35)" }
                            : { background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }
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
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:badge-error"
                          style={{ color: "var(--lnx-red)" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* Edit Chapel */}
    {editingSong && (
      <EditChapel
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
