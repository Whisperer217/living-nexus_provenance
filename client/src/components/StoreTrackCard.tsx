/*
╔══════════════════════════════════════════════════════════════════╗
║  LIVING NEXUS — DUAL SURFACE CARD (CANONICAL SPEC v1.0)         ║
║  ──────────────────────────────────────────────────────────────  ║
║  Principle:                                                      ║
║    Artwork attracts → Testimony anchors → Action converts        ║
║    → Attribution persists                                        ║
║                                                                  ║
║  Layer 1: Artwork — full-bleed, no blur, brightness(0.88)        ║
║  Layer 2: Gradient — bottom-only, exact spec values              ║
║  Layer 3: Testimony — 2-line overlay, #F5F5F5 @ 0.92            ║
║  Layer 4: Play — centered 56px gold ring, glow, pulse            ║
║  Layer 5: Attribution — creator + WID, bottom-left               ║
║  Layer 6: Resonance — plays/hearts/funding, bottom-right         ║
╚══════════════════════════════════════════════════════════════════╝
*/

import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Play, Pause, Shield, MoreVertical, FolderPlus, ExternalLink, Copy, SkipForward, Flame, Heart, Zap } from "lucide-react";
import { AddToCollectionButton } from "@/components/AddToCollectionModal";
import { CreatorHandle } from "@/components/CreatorHandle";
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
  creatorRole?: string | null;
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

/** Extract best testimony — max 2 lines, ~120 chars */
function getTestimony(song: SongData): string | null {
  const raw = song.description || song.lyricsText || null;
  if (!raw) return null;
  const lines = raw.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;
  let result = "";
  for (const line of lines.slice(0, 2)) {
    if ((result + line).length > 120) break;
    result += (result ? " " : "") + line;
  }
  return result || lines[0].slice(0, 120) || null;
}

function formatResonance(song: SongData) {
  const plays = song.playCount && song.playCount > 0
    ? song.playCount >= 1000 ? `${(song.playCount / 1000).toFixed(1)}k` : String(song.playCount)
    : null;
  const cents = song.totalFundingCents ?? 0;
  const funding = cents >= 100
    ? cents >= 100000 ? `$${(cents / 100000).toFixed(1)}k` : `$${(cents / 100).toFixed(0)}`
    : null;
  const tips = song.tipCount && song.tipCount > 0 ? String(song.tipCount) : null;
  return { plays, funding, tips };
}

// ── Context menu ──────────────────────────────────────────────────────────────
function TrackContextMenu({ song, position, onClose }: {
  song: SongData;
  position: { x: number; y: number };
  onClose: () => void;
}) {
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

// ── DUAL SURFACE CARD ─────────────────────────────────────────────────────────
export function StoreTrackCard({ song, size = "md", allSongs, songIndex }: StoreTrackCardProps) {
  const { state, playQueueAt, addAndPlay } = usePlayer();
  const currentTrack = state.tracks[state.currentIdx];
  const isPlaying = currentTrack?.id === String(song.id) && state.isPlaying;
  const isActive = currentTrack?.id === String(song.id);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const cardWidth = size === "sm" ? "w-52" : size === "lg" ? "w-72" : "w-60";
  const testimony = getTestimony(song);
  const { plays, funding, tips } = formatResonance(song);
  const hasAudio = !!song.fileUrl;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasAudio) return;
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
        <div
          className={`relative ${cardWidth} flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group`}
          style={{
            minHeight: "240px",
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 40px rgba(196,154,40,0.15), 0 16px 48px rgba(0,0,0,0.6)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
          }}
        >
          {/* ── LAYER 1: Artwork — full-bleed, vibrant, no blur ── */}
          <div className="absolute inset-0">
            {song.coverArtUrl ? (
              <img
                src={song.coverArtUrl}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover"
                style={{ filter: "brightness(0.88)" }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: "linear-gradient(135deg, #1a1409 0%, #0d0b07 50%, #111009 100%)" }}
              />
            )}
          </div>

          {/* ── LAYER 2: Gradient — bottom-only, exact spec ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.0) 80%)",
            }}
          />

          {/* ── LAYER 4: Play button — centered 56px gold ring ── */}
          {hasAudio && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                onClick={handlePlay}
                className="pointer-events-auto flex items-center justify-center rounded-full transition-all duration-200"
                style={{
                  width: "56px",
                  height: "56px",
                  background: isPlaying ? "rgba(196,154,40,0.22)" : "rgba(0,0,0,0.35)",
                  border: isPlaying ? "2px solid rgba(196,154,40,0.9)" : "2px solid rgba(196,154,40,0.65)",
                  boxShadow: isPlaying
                    ? "0 0 0 6px rgba(196,154,40,0.15), 0 0 24px rgba(196,154,40,0.4)"
                    : "0 0 16px rgba(196,154,40,0.2)",
                  animation: isPlaying ? "pulse-gold 1.8s ease-in-out infinite" : "none",
                }}
                onMouseEnter={e => {
                  if (!isPlaying) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 4px rgba(196,154,40,0.2), 0 0 28px rgba(196,154,40,0.5)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,154,40,0.95)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,154,40,0.18)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isPlaying) {
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(196,154,40,0.2)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(196,154,40,0.65)";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.35)";
                  }
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" style={{ color: "#C9A84C" }} />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" style={{ color: "#C9A84C" }} />
                )}
              </button>
            </div>
          )}

          {/* ── LAYERS 3 + 5 + 6: Bottom content stack ── */}
          <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1.5">

            {/* LAYER 3: Testimony — 2-line max */}
            {testimony && (
              <p
                className="text-xs leading-snug line-clamp-2"
                style={{
                  color: "rgba(245,245,245,0.92)",
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  letterSpacing: "0.01em",
                  lineHeight: "1.5",
                  textShadow: "0 1px 6px rgba(0,0,0,0.95)",
                }}
              >
                &ldquo;{testimony}&rdquo;
              </p>
            )}

            {/* LAYER 5 + 6: Attribution (left) + Resonance (right) */}
            <div className="flex items-center justify-between gap-2">

              {/* Layer 5: Attribution — creator + WID (with witness identity popup) */}
              <div className="flex items-center gap-1.5 min-w-0">
                <CreatorHandle
                  userId={song.userId || undefined}
                  handle={song.artistHandle}
                  displayName={song.artistName}
                  role={song.creatorRole}
                  size="sm"
                />
                {(song.wid || song.widShort) && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <Shield className="w-2.5 h-2.5" style={{ color: "rgba(196,154,40,0.6)" }} />
                    <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color: "rgba(196,154,40,0.5)" }}>WID</span>
                  </div>
                )}
              </div>

              {/* Layer 6: Resonance — plays / hearts / funding */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {plays && (
                  <div className="flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5" style={{ color: "rgba(196,154,40,0.55)" }} />
                    <span className="text-[10px] tabular-nums" style={{ color: "rgba(196,154,40,0.55)" }}>{plays}</span>
                  </div>
                )}
                {tips && (
                  <div className="flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" style={{ color: "rgba(220,80,80,0.65)" }} />
                    <span className="text-[10px] tabular-nums" style={{ color: "rgba(220,80,80,0.65)" }}>{tips}</span>
                  </div>
                )}
                {funding && (
                  <div className="flex items-center gap-0.5">
                    <span className="text-[10px] tabular-nums font-medium" style={{ color: "rgba(196,154,40,0.8)" }}>+{funding}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contributed badge — shown when user has supported */}
            {isActive && (
              <div
                className="absolute top-3 right-3 text-[8px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                style={{
                  background: "rgba(196,154,40,0.18)",
                  border: "1px solid rgba(196,154,40,0.4)",
                  color: "#C9A84C",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                NOW PLAYING
              </div>
            )}
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
