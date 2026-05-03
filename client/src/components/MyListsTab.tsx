/**
 * MyListsTab — Manage mode for user playlists
 *
 * Features:
 *  - Lists all user playlists with track count and cover mosaic
 *  - Expand a playlist to see its tracks in drag-to-reorder manage mode
 *  - "Save Version" button snapshots the current ordering as a WID array
 *  - Version history panel shows up to 20 past versions with timestamps
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WIDPanel } from "@/components/WIDPanel";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  History,
  Music,
  Plus,
  Trash2,
  Clock,
  Hash,
  Play,
} from "lucide-react";

/* ── Drag-to-reorder hook ──────────────────────────────────────────────────── */
function useDragReorder<T extends { id: number }>(
  initial: T[],
  onChange: (reordered: T[]) => void
) {
  const [items, setItems] = useState(initial);
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  // Sync when initial changes (e.g. after server refetch).
  // Use useEffect (not inline during render) to avoid infinite re-render loop.
  const initialKey = initial.map((t) => t.id).join(",");
  useEffect(() => {
    setItems(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  function handleDragStart(idx: number) {
    dragIdx.current = idx;
  }

  function handleDragEnter(idx: number) {
    if (dragIdx.current === null || dragIdx.current === idx) return;
    dragOverIdx.current = idx;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(idx, 0, moved);
    dragIdx.current = idx;
    setItems(next);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    dragOverIdx.current = null;
    onChange(items);
  }

  return { items, handleDragStart, handleDragEnter, handleDragEnd };
}

/* ── Track row in manage mode ─────────────────────────────────────────────── */
function ManageTrackRow({
  track,
  idx,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onRemove,
  playlistId,
  allTracks,
}: {
  track: any;
  idx: number;
  onDragStart: (i: number) => void;
  onDragEnter: (i: number) => void;
  onDragEnd: () => void;
  onRemove: (trackId: number) => void;
  playlistId: number;
  allTracks: any[];
}) {
  const { addAndPlay, playQueueAt } = usePlayer();

  function handlePlay(e: React.MouseEvent) {
    e.stopPropagation();
    // Build a Track array from all playlist tracks and play from this index
    const playerTracks = allTracks
      .filter((t: any) => !!t.fileUrl || !!t.audioUrl)
      .map((t: any) => ({
        id: String(t.songId ?? t.id),
        title: t.title ?? "Untitled",
        artist: t.artistHandle ? `@${t.artistHandle}` : (t.creatorName ?? ""),
        genre: t.genre ?? "",
        audioUrl: t.fileUrl ?? t.audioUrl ?? "",
        artUrl: t.coverArtUrl ?? undefined,
        witnessId: t.witnessId ?? undefined,
      }));
    const playIdx = allTracks
      .filter((t: any) => !!t.fileUrl || !!t.audioUrl)
      .findIndex((_: any, i: number) => i === idx);
    if (playerTracks.length === 0) {
      // Fallback: addAndPlay just this track
      addAndPlay({
        id: String(track.songId ?? track.id),
        title: track.title ?? "Untitled",
        artist: track.artistHandle ? `@${track.artistHandle}` : (track.creatorName ?? ""),
        genre: track.genre ?? "",
        audioUrl: track.fileUrl ?? track.audioUrl ?? "",
        artUrl: track.coverArtUrl ?? undefined,
        witnessId: track.witnessId ?? undefined,
      });
      return;
    }
    playQueueAt(playerTracks, Math.max(0, playIdx), "PLAYLIST");
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(idx)}
      onDragEnter={() => onDragEnter(idx)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors select-none group"
      style={{
        background: "var(--ln-coal)",
        border: "1px solid #C49A28",
        cursor: "grab",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(196,154,40,0.08)")}
      onMouseLeave={e => (e.currentTarget.style.background = "var(--ln-coal)")}
    >
      {/* Drag handle */}
      <GripVertical
        size={14}
        style={{ color: "var(--ln-smoke)", flexShrink: 0 }}
      />

      {/* Position */}
      <span
        className="text-[11px] w-4 text-center flex-shrink-0"
        style={{ color: "var(--ln-smoke)" }}
      >
        {idx + 1}
      </span>

      {/* Cover art */}
      <div
        className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"
        style={{ background: "var(--ln-coal)" }}
      >
        {track.coverArtUrl ? (
          <img
            src={track.coverArtUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={10} style={{ color: "rgba(196,154,40,0.4)" }} />
          </div>
        )}
      </div>

      {/* Title + WID */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] font-medium truncate"
          style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
        >
          {track.title}
        </p>
        {track.witnessId && (
          <WIDPanel
            witnessId={track.witnessId}
            songTitle={track.title}
          />
        )}
      </div>

      {/* Play button */}
      <button
        onClick={handlePlay}
        className="w-6 h-6 rounded-full flex items-center justify-center transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
        title="Play from here"
        style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.3)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(196,154,40,0.3)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(196,154,40,0.15)")}
      >
        <Play size={9} style={{ color: "#D4AF37", marginLeft: 1 }} />
      </button>

      {/* Remove button */}
      <button
        onClick={() => onRemove(track.playlistTrackId)}
        className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:badge-error flex-shrink-0"
        title="Remove from list"
      >
        <Trash2 size={11} style={{ color: "var(--ln-ember)" }} />
      </button>
    </div>
  );
}

/* ── Version history panel ────────────────────────────────────────────────── */
function VersionHistoryPanel({ playlistId }: { playlistId: number }) {
  const { data: versions, isLoading } = trpc.playlists.getVersions.useQuery(
    { playlistId },
    { staleTime: 30_000 }
  );

  if (isLoading) {
    return (
      <div className="space-y-2 mt-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg animate-pulse"
            style={{ background: "var(--ln-coal)" }}
          />
        ))}
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div
        className="mt-3 rounded-xl p-4 text-center"
        style={{ background: "rgba(44,52,56,0.6)", border: "1px dashed #C3AB7D" }}
      >
        <p className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>
          No versions saved yet. Save a version to create an immutable snapshot of this list's ordering.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {versions.map((v: any) => (
        <div
          key={v.id}
          className="flex items-start gap-3 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(44,52,56,0.6)", border: "1px solid #C49A28" }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)" }}
          >
            <Hash size={10} style={{ color: "var(--ln-gold)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--ln-gold)" }}
              >
                v{v.versionNum}
              </span>
              <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                {(v.widArray as string[]).length} tracks
              </span>
              {v.note && (
                <span className="text-[10px] truncate" style={{ color: "var(--ln-smoke)" }}>
                  — {v.note}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={9} style={{ color: "var(--ln-smoke)" }} />
              <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                {new Date(v.savedAt).toLocaleString()} by {v.savedByHandle || v.savedByName || "you"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Playlist manage panel ────────────────────────────────────────────────── */
function PlaylistManagePanel({ playlist }: { playlist: any }) {
  const [showHistory, setShowHistory] = useState(false);
  const [versionNote, setVersionNote] = useState("");
  const utils = trpc.useUtils();

  const { data: playlistData, isLoading } = trpc.playlists.getById.useQuery(
    { id: playlist.id },
    { staleTime: 30_000 }
  );

  const reorder = trpc.playlists.reorder.useMutation({
    onError: () => toast.error("Failed to save order"),
  });

  const saveVersion = trpc.playlists.saveVersion.useMutation({
    onSuccess: (data) => {
      toast.success(`Version v${data.versionNum} saved — ${data.trackCount} tracks`);
      setVersionNote("");
      utils.playlists.getVersions.invalidate({ playlistId: playlist.id });
    },
    onError: () => toast.error("Failed to save version"),
  });

  const removeTrack = trpc.playlists.removeTrack.useMutation({
    onSuccess: () => {
      toast.success("Track removed");
      utils.playlists.getById.invalidate({ id: playlist.id });
    },
    onError: () => toast.error("Failed to remove track"),
  });

  const rawTracks = playlistData?.tracks ?? [];
  const trackItems = rawTracks.map((t: any) => ({ ...t, id: t.songId }));

  const { items, handleDragStart, handleDragEnter, handleDragEnd } = useDragReorder(
    trackItems,
    (reordered) => {
      reorder.mutate({
        playlistId: playlist.id,
        orderedSongIds: reordered.map((t: any) => t.songId),
      });
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-2 mt-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl animate-pulse"
            style={{ background: "var(--ln-coal)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Track list */}
      {items.length === 0 ? (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: "rgba(44,52,56,0.5)", border: "1px dashed #C3AB7D" }}
        >
          <p className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>
            No tracks in this list yet.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((track: any, idx: number) => (
            <ManageTrackRow
              key={track.id}
              track={track}
              idx={idx}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onRemove={(trackId) =>
                removeTrack.mutate({ playlistTrackId: trackId, playlistId: playlist.id })
              }
              playlistId={playlist.id}
              allTracks={items}
            />
          ))}
        </div>
      )}

      {/* Save version row */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            placeholder="Version note (optional)"
            value={versionNote}
            onChange={(e) => setVersionNote(e.target.value)}
            maxLength={256}
            className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none"
            style={{
              background: "var(--ln-coal)",
              border: "1px solid #C49A28",
              color: "var(--ln-parchment)",
            }}
          />
          <Button
            size="sm"
            disabled={saveVersion.isPending}
            onClick={() =>
              saveVersion.mutate({
                playlistId: playlist.id,
                note: versionNote || undefined,
              })
            }
            style={{
              background: "rgba(196,154,40,0.08)",
              border: "1px solid rgba(196,154,40,0.25)",
              color: "var(--ln-gold)",
            }}
          >
            <Save size={12} className="mr-1.5" />
            Save Version
          </Button>
        </div>
      )}

      {/* Version history toggle */}
      <button
        onClick={() => setShowHistory((v) => !v)}
        className="flex items-center gap-1.5 mt-3 text-[11px] transition-colors hover:opacity-80"
        style={{ color: "var(--ln-smoke)" }}
      >
        <History size={12} />
        {showHistory ? "Hide" : "Show"} version history
        {showHistory ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>

      {showHistory && <VersionHistoryPanel playlistId={playlist.id} />}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function MyListsTab() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const utils = trpc.useUtils();

  const { data: playlists, isLoading } = trpc.playlists.mine.useQuery(undefined, {
    staleTime: 30_000,
  });

  const createPlaylist = trpc.playlists.create.useMutation({
    onSuccess: () => {
      toast.success("List created");
      setNewName("");
      setShowCreate(false);
      utils.playlists.mine.invalidate();
    },
    onError: () => toast.error("Failed to create list"),
  });

  const deletePlaylist = trpc.playlists.delete.useMutation({
    onSuccess: () => {
      toast.success("List deleted");
      utils.playlists.mine.invalidate();
    },
    onError: () => toast.error("Failed to delete list"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse"
            style={{ background: "var(--ln-coal)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Create new list */}
      {showCreate ? (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}
        >
          <input
            autoFocus
            type="text"
            placeholder="List name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                createPlaylist.mutate({ name: newName.trim() });
              }
              if (e.key === "Escape") setShowCreate(false);
            }}
            maxLength={128}
            className="flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: "var(--ln-parchment)" }}
          />
          <Button
            size="sm"
            disabled={!newName.trim() || createPlaylist.isPending}
            onClick={() => createPlaylist.mutate({ name: newName.trim() })}
            style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
          >
            Create
          </Button>
          <button
            onClick={() => setShowCreate(false)}
            className="text-[11px] px-2"
            style={{ color: "var(--ln-smoke)" }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2.5 transition-colors hover:brightness-110"
          style={{
            background: "rgba(44,52,56,0.5)",
            border: "1px dashed #C3AB7D",
            color: "var(--ln-gold)",
          }}
        >
          <Plus size={14} />
          <span className="text-[12px]">New List</span>
        </button>
      )}

      {/* Empty state */}
      {(!playlists || playlists.length === 0) && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "rgba(44,52,56,0.5)", border: "1px dashed #C49A28" }}
        >
          <Music size={28} className="mx-auto mb-2 opacity-20" style={{ color: "var(--ln-gold)" }} />
          <p className="text-[12px]" style={{ color: "var(--ln-smoke)" }}>
            You have no lists yet. Create one to start curating.
          </p>
        </div>
      )}

      {/* Playlist rows */}
      {playlists?.map((pl: any) => {
        const isExpanded = expandedId === pl.id;
        return (
          <div
            key={pl.id}
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${isExpanded ? "rgba(196,154,40,0.2)" : "var(--ln-gold)"}` }}
          >
            {/* Header row */}
            <div
              className="flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:brightness-110"
              style={{ background: "var(--ln-coal)" }}
              onClick={() => setExpandedId(isExpanded ? null : pl.id)}
            >
              {/* Expand icon */}
              {isExpanded ? (
                <ChevronDown size={14} style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
              ) : (
                <ChevronRight size={14} style={{ color: "var(--ln-smoke)", flexShrink: 0 }} />
              )}

              {/* Cover art */}
              <div
                className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
                style={{ background: "var(--ln-coal)" }}
              >
                {pl.coverArtUrl ? (
                  <img src={pl.coverArtUrl} alt={pl.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={12} style={{ color: "rgba(196,154,40,0.3)" }} />
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-medium truncate"
                  style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
                >
                  {pl.name}
                </p>
                <p className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                  {pl.isPublic ? "Public" : "Private"} · {pl.isCollaborative ? "Collaborative" : "Solo"}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${pl.name}"? This cannot be undone.`)) {
                    deletePlaylist.mutate({ id: pl.id });
                  }
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:badge-error flex-shrink-0"
                title="Delete list"
              >
                <Trash2 size={12} style={{ color: "rgba(239,68,68,0.7)" }} />
              </button>
            </div>

            {/* Expanded manage panel */}
            {isExpanded && (
              <div
                className="px-3 pb-4"
                style={{ background: "rgba(44,52,56,0.5)" }}
              >
                <PlaylistManagePanel playlist={pl} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
