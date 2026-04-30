import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Play, Shield, MoreVertical, ListPlus, ExternalLink, Copy, SkipForward } from "lucide-react";
import { createPortal } from "react-dom";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { Track } from "@/contexts/PlayerContext";

interface SongData {
  id: number;
  title: string;
  coverArtUrl?: string | null;
  artistName?: string | null;
  genre?: string | null;
  wid?: string | null;
  widShort?: string | null;
  playCount?: number | null;
  fileUrl?: string | null;
  duration?: number | null;
  userId?: number | null;
  artistHandle?: string | null;
  profilePhotoUrl?: string | null;
  aiDisclosure?: string | null;
  contentType?: string | null;
}

interface StoreTrackCardProps {
  song: SongData;
  size?: "sm" | "md" | "lg";
  allSongs?: SongData[];
  songIndex?: number;
}

function toTrack(s: SongData): Track {
  return {
    id: String(s.id),
    title: s.title,
    artist: s.artistName || "Unknown",
    genre: s.genre || "",
    audioUrl: s.fileUrl || undefined,
    artUrl: s.coverArtUrl || undefined,
    witnessId: s.wid || s.widShort || undefined,
    creatorHandle: s.artistHandle || undefined,
    creatorId: s.userId || undefined,
    aiDisclosure: (s.aiDisclosure as Track["aiDisclosure"]) || undefined,
    contentType: (s.contentType as Track["contentType"]) || "audio",
  };
}

// ── Add-to-List sub-panel ─────────────────────────────────────────────────────
function AddToListPanel({ songId, onClose, anchorRect }: { songId: number; onClose: () => void; anchorRect: DOMRect | null }) {
  const { data: playlists = [], isLoading } = trpc.playlists.mine.useQuery(undefined, { staleTime: 30_000 });
  const addMutation = trpc.playlists.addTrack.useMutation({
    onSuccess: () => { toast.success("Added to list"); onClose(); },
    onError: (e: { message: string }) => { toast.error(e.message); onClose(); },
  });
  const createMutation = trpc.playlists.create.useMutation({
    onSuccess: (pl) => { if (pl.id) addMutation.mutate({ playlistId: pl.id as number, songId }); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const style: React.CSSProperties = anchorRect
    ? { position: "fixed", top: anchorRect.bottom + 4, left: anchorRect.left, zIndex: 100001 }
    : { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 100001 };

  return createPortal(
    <div
      style={{ ...style, background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.3)", borderRadius: "0.75rem", minWidth: "180px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", overflow: "hidden" }}
      onClick={e => e.stopPropagation()}
    >
      {isLoading ? (
        <div className="px-4 py-3 text-xs text-white/40">Loading…</div>
      ) : playlists.length === 0 ? (
        <button
          onClick={() => createMutation.mutate({ name: "My List" })}
          className="w-full px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors"
          style={{ color: "var(--ln-parchment)" }}
        >
          + Create new list
        </button>
      ) : (
        <>
          {playlists.map((pl: any) => (
            <button
              key={pl.id}
              onClick={() => addMutation.mutate({ playlistId: pl.id, songId })}
              className="w-full px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors truncate"
              style={{ color: "var(--ln-parchment)" }}
            >
              {pl.name}
            </button>
          ))}
          <div className="border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }} />
          <button
            onClick={() => createMutation.mutate({ name: "New List" })}
            className="w-full px-4 py-2.5 text-xs text-left hover:bg-white/5 transition-colors"
            style={{ color: "var(--ln-gold)" }}
          >
            + New list
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────
function TrackContextMenu({ song, position, onClose }: { song: SongData; position: { x: number; y: number }; onClose: () => void }) {
  const { playNext } = usePlayer();
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNext(toTrack(song));
    toast.success(`"${song.title}" plays next`);
    onClose();
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = song.wid
      ? `https://www.livingnexus.org/share/${encodeURIComponent(song.wid)}`
      : `${window.location.origin}/song/${song.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success(song.wid ? "WID share link copied" : "Link copied");
    onClose();
  };

  // Clamp to viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = 200;
  const menuH = 160;
  const x = Math.min(position.x, vw - menuW - 8);
  const y = Math.min(position.y, vh - menuH - 8);

  return createPortal(
    <>
      <div
        ref={menuRef}
        style={{
          position: "fixed", top: y, left: x, zIndex: 100000,
          background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.35)",
          borderRadius: "0.75rem", minWidth: `${menuW}px`, overflow: "hidden",
          boxShadow: "0 0 24px rgba(196,154,40,0.1), 0 8px 32px rgba(0,0,0,0.7)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {song.fileUrl && (
          <button onClick={handlePlayNext} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
            <SkipForward className="w-3.5 h-3.5 opacity-60" /> Play Next
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors text-left"
          style={{ color: "var(--ln-parchment)" }}
        >
          <ListPlus className="w-3.5 h-3.5 opacity-60" /> Add to List
        </button>
        <div className="border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }} />
        <Link href={`/song/${song.id}`} onClick={onClose}>
          <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" /> Go to Song
          </button>
        </Link>
        {song.userId && (
          <Link href={`/creator/${song.userId}`} onClick={onClose}>
            <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" /> View Creator
            </button>
          </Link>
        )}
        <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
          <Copy className="w-3.5 h-3.5 opacity-60" />
          {song.wid ? "Copy WID Link" : "Copy Link"}
        </button>
      </div>
      {showAddToList && (
        <AddToListPanel songId={song.id} onClose={() => { setShowAddToList(false); onClose(); }} anchorRect={addToListRect} />
      )}
    </>,
    document.body
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export function StoreTrackCard({ song, size = "md", allSongs, songIndex }: StoreTrackCardProps) {
  const { state, playQueueAt, addAndPlay } = usePlayer();
  const currentTrack = state.tracks[state.currentIdx];
  const isCurrentlyPlaying = currentTrack?.id === String(song.id) && state.isPlaying;
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const heightClass = size === "sm" ? "h-48" : size === "lg" ? "h-80" : "h-64";
  const widthClass = size === "sm" ? "w-36" : size === "lg" ? "w-56" : "w-48";

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!song.fileUrl) return;
    if (allSongs && songIndex !== undefined) {
      playQueueAt(allSongs.map(toTrack), songIndex, "HOME");
    } else {
      addAndPlay(toTrack(song));
    }
  };

  const handleMenuOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        onClick={handlePlay}
        className={`relative ${widthClass} ${heightClass} flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group transition-transform duration-200 hover:scale-[1.03] hover:shadow-2xl`}
      >
          {/* Cover Art */}
          <div className="absolute inset-0">
            {song.coverArtUrl ? (
              <img
                src={song.coverArtUrl}
                alt={song.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-8 h-8 text-white/40" />
                </div>
              </div>
            )}
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Play button overlay */}
          {song.fileUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={handlePlay}
                className="w-12 h-12 rounded-full bg-[#C9A84C]/90 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-[#C9A84C] transition-colors"
              >
                <Play className="w-5 h-5 text-black fill-black ml-0.5" />
              </button>
            </div>
          )}

          {/* 3-dot context menu button — visible on hover */}
          <button
            onClick={handleMenuOpen}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10"
            title="More options"
          >
            <MoreVertical className="w-3.5 h-3.5 text-white/80" />
          </button>

          {/* Currently playing bars */}
          {isCurrentlyPlaying && (
            <div className="absolute top-2 left-2 flex gap-0.5 items-end h-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-[#C9A84C] rounded-full animate-pulse"
                  style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            {(song.wid || song.widShort) && (
              <div className="flex items-center gap-1 mb-1.5">
                <Shield className="w-2.5 h-2.5 text-[#C9A84C]" />
                <span className="text-[9px] font-mono text-[#C9A84C]/80 tracking-wider uppercase">WID</span>
              </div>
            )}
            <p className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-1">{song.title}</p>
            <div className="flex items-center gap-1.5">
              {song.profilePhotoUrl ? (
                <img src={song.profilePhotoUrl} alt={song.artistName || ""} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white/20 flex-shrink-0" />
              )}
              <span className="text-white/60 text-xs truncate">{song.artistName || "Unknown Artist"}</span>
            </div>
            {song.genre && (
              <span className="inline-block mt-1.5 text-[10px] text-white/40 bg-white/10 rounded px-1.5 py-0.5 truncate max-w-full">
                {song.genre.split(",")[0].trim()}
              </span>
            )}
          </div>
      </div>
      {/* Context menu portal */}
      {menuPos && (
        <TrackContextMenu
          song={song}
          position={menuPos}
          onClose={() => setMenuPos(null)}
        />
      )}
    </>
  );
}
