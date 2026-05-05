import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Play, Pause, Shield, MoreVertical, FolderPlus, ExternalLink, Copy, SkipForward, Flame, Zap } from "lucide-react";
import { AddToCollectionButton } from "@/components/AddToCollectionModal";
import { createPortal } from "react-dom";
import { usePlayer } from "@/contexts/PlayerContext";
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
  description?: string | null;
  lyricsText?: string | null;
  totalFundingCents?: number | null;
  tipCount?: number | null;
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

/** Extract best testimony lines — up to 4 lines, max 200 chars total */
function getTestimony(song: SongData): string | null {
  const raw = song.description || song.lyricsText || null;
  if (!raw) return null;
  const lines = raw.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;
  // Take up to 3 lines, cap total at 200 chars
  let result = "";
  for (const line of lines.slice(0, 3)) {
    if ((result + line).length > 200) break;
    result += (result ? "\n" : "") + line;
  }
  return result || null;
}

function formatResonance(song: SongData): { plays: string | null; funding: string | null } {
  const plays = song.playCount && song.playCount > 0
    ? song.playCount >= 1000 ? `${(song.playCount / 1000).toFixed(1)}k` : String(song.playCount)
    : null;
  const cents = song.totalFundingCents ?? 0;
  const funding = cents >= 100
    ? cents >= 100000 ? `$${(cents / 100000).toFixed(1)}k` : `$${(cents / 100).toFixed(0)}`
    : null;
  return { plays, funding };
}

// ── Context menu ──────────────────────────────────────────────────────────────
function TrackContextMenu({ song, position, onClose }: { song: SongData; position: { x: number; y: number }; onClose: () => void }) {
  const { playNext } = usePlayer();
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

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuW = 200;
  const menuH = 160;
  const x = Math.min(position.x, vw - menuW - 8);
  const y = Math.min(position.y, vh - menuH - 8);

  return createPortal(
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
      <div className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
        <FolderPlus className="w-3.5 h-3.5 opacity-60" />
        <AddToCollectionButton songId={song.id} songTitle={song.title} size={14} className="flex-1 text-left" />
      </div>
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
    </div>,
    document.body
  );
}

// ── Testimony Card ─────────────────────────────────────────────────────────────
export function StoreTrackCard({ song, size = "md", allSongs, songIndex }: StoreTrackCardProps) {
  const { state, playQueueAt, addAndPlay } = usePlayer();
  const currentTrack = state.tracks[state.currentIdx];
  const isCurrentlyPlaying = currentTrack?.id === String(song.id) && state.isPlaying;
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const cardWidth = size === "sm" ? "w-52" : size === "lg" ? "w-72" : "w-60";
  const testimony = getTestimony(song);
  const { plays, funding } = formatResonance(song);

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
      <Link href={`/song/${song.id}`}>
        {/*
          ╔══════════════════════════════════════╗
          ║  TESTIMONY CARD                      ║
          ║  ─────────────────────────────────── ║
          ║  Background: blurred artwork         ║
          ║  Layer 1: dark overlay (60–80%)      ║
          ║  Layer 2: testimony text (primary)   ║
          ║  Layer 3: play button                ║
          ║  Layer 4: creator + resonance        ║
          ╚══════════════════════════════════════╝
        */}
        <div
          className={`relative ${cardWidth} flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group
            transition-all duration-300
            hover:scale-[1.025] hover:shadow-[0_0_40px_rgba(196,154,40,0.18),0_12px_40px_rgba(0,0,0,0.7)]`}
          style={{ minHeight: "200px" }}
        >
          {/* ── Background: full artwork — clear, vibrant, no blur ── */}
          <div className="absolute inset-0">
            {song.coverArtUrl ? (
              <img
                src={song.coverArtUrl}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                style={{ filter: "brightness(0.85)" }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: "linear-gradient(135deg, #1a1409 0%, #0d0b07 50%, #111009 100%)",
                }}
              />
            )}
          </div>

          {/* ── Bottom gradient only — for text readability, artwork breathes at top ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.0) 100%)" }}
          />

          {/* ── Content layer — artwork visible at top, content anchored at bottom ── */}
          <div className="relative z-10 flex flex-col justify-end h-full p-4 gap-2" style={{ minHeight: "200px" }}>

            {/* 1. TESTIMONY — overlay companion, bottom of card */}
            {testimony && (
              <p
                className="text-xs leading-relaxed line-clamp-3"
                style={{
                  color: "rgba(240,228,196,0.90)",
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  letterSpacing: "0.01em",
                  lineHeight: "1.55",
                  textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                }}
              >
                &ldquo;{testimony.replace(/\n/g, " ")}&rdquo;
              </p>
            )}

            {/* 2. PLAY BUTTON — Manifestation */}
            <div className="flex items-center gap-3">
              {song.fileUrl ? (
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200
                    group-hover:shadow-[0_0_16px_rgba(196,154,40,0.4)]"
                  style={{
                    background: isCurrentlyPlaying ? "rgba(196,154,40,0.25)" : "rgba(196,154,40,0.15)",
                    border: "1px solid rgba(196,154,40,0.45)",
                    color: "#C9A84C",
                  }}
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>Playing</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                      <span>Play</span>
                    </>
                  )}
                </button>
              ) : (
                /* Lyrics / manuscript — no audio */
                <span
                  className="text-[10px] px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(196,154,40,0.08)",
                    border: "1px solid rgba(196,154,40,0.2)",
                    color: "rgba(196,154,40,0.6)",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.08em",
                  }}
                >
                  READ
                </span>
              )}

              {/* WID badge */}
              {(song.wid || song.widShort) && (
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#C9A84C]" />
                  <span className="text-[9px] font-mono text-[#C9A84C]/70 tracking-wider uppercase">WID</span>
                </div>
              )}
            </div>

            {/* 3. CREATOR + RESONANCE — bottom */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "rgba(196,154,40,0.1)" }}>
              {/* Creator */}
              <div className="flex items-center gap-2 min-w-0">
                {song.profilePhotoUrl ? (
                  <img src={song.profilePhotoUrl} alt={song.artistName || ""} className="w-5 h-5 rounded-full object-cover flex-shrink-0 ring-1 ring-[#C9A84C]/20" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.2)" }} />
                )}
                <span className="text-[11px] truncate" style={{ color: "rgba(232,220,190,0.6)" }}>
                  {song.artistName || "Unknown"}
                </span>
              </div>

              {/* Resonance metrics */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {plays && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" style={{ color: "rgba(196,154,40,0.55)" }} />
                    <span className="text-[10px] tabular-nums" style={{ color: "rgba(196,154,40,0.55)" }}>{plays}</span>
                  </div>
                )}
                {funding && (
                  <div className="flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" style={{ color: "rgba(196,154,40,0.7)" }} />
                    <span className="text-[10px] tabular-nums font-medium" style={{ color: "rgba(196,154,40,0.7)" }}>{funding}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3-dot menu — top-right, hover-visible */}
          <button
            onClick={handleMenuOpen}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-20"
            title="More options"
          >
            <MoreVertical className="w-3 h-3 text-white/70" />
          </button>
        </div>
      </Link>

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
