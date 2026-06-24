/*
╔══════════════════════════════════════════════════════════════════╗
║  LIVING NEXUS — WITNESS CARD (CANONICAL SPEC v2.0)              ║
║  ──────────────────────────────────────────────────────────────  ║
║  Design Language: Vibe-coded cathedral. Premium gallery.         ║
║  The creation is the statement. The creator is the signature.    ║
║                                                                  ║
║  Layer 1: Artwork — full-bleed portrait, 2:3 aspect ratio        ║
║  Layer 2: Gradient — bottom 50%, deep cinematic fade             ║
║  Layer 3: WID badge — top-right, gold pill, elegant              ║
║  Layer 4: Play — hidden at rest, centered glow ring on hover     ║
║  Layer 5: Title — bottom, dominant, work-first                   ║
║  Layer 6: Creator — whispered below title, 55% opacity           ║
║  Layer 7: Resonance — plays/tips, bottom-right, minimal          ║
╚══════════════════════════════════════════════════════════════════╝
*/

import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Play, Pause, Shield, MoreVertical, FolderPlus, ExternalLink, Copy, SkipForward, Flame, Heart } from "lucide-react";
import { AddToCollectionModal } from "@/components/AddToCollectionModal";
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
  /** When true, renders a "NEW" badge on the top-left corner of the card */
  isNew?: boolean;
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

function formatResonance(song: SongData) {
  const plays = song.playCount && song.playCount > 0
    ? song.playCount >= 1000 ? `${(song.playCount / 1000).toFixed(1)}k` : String(song.playCount)
    : null;
  const tips = song.tipCount && song.tipCount > 0 ? String(song.tipCount) : null;
  return { plays, tips };
}

// ── Collection menu item ──────────────────────────────────────────
function CollectionMenuItem({ songId, songTitle, onMenuClose }: {
  songId: number;
  songTitle: string;
  onMenuClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-white/5 transition-colors text-left"
        style={{ color: "var(--ln-parchment)" }}
      >
        <FolderPlus className="w-3.5 h-3.5 opacity-60" />
        Add to Collection
      </button>
      <AddToCollectionModal
        songId={songId}
        songTitle={songTitle}
        open={open}
        onClose={() => { setOpen(false); onMenuClose(); }}
      />
    </>
  );
}

// ── Context menu ──────────────────────────────────────────────────
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
      <CollectionMenuItem songId={song.id} songTitle={song.title} onMenuClose={onClose} />
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

// ── WITNESS CARD ──────────────────────────────────────────────────
export function StoreTrackCard({ song, size = "md", allSongs, songIndex, isNew }: StoreTrackCardProps) {
  const { state, playQueueAt, addAndPlay } = usePlayer();
  const currentTrack = state.tracks[state.currentIdx];
  const isPlaying = currentTrack?.id === String(song.id) && state.isPlaying;
  const isActive = currentTrack?.id === String(song.id);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  // Portrait card widths — 2:3 aspect ratio (golden ratio territory)
  // sm: 140px mobile / 160px desktop
  // md: 160px mobile / 190px desktop  
  // lg: 180px mobile / 220px desktop
  const cardWidth =
    size === "sm" ? "w-[140px] sm:w-[160px]" :
    size === "lg" ? "w-[180px] sm:w-[220px]" :
                   "w-[160px] sm:w-[190px]";

  const { plays, tips } = formatResonance(song);
  const hasAudio = !!song.fileUrl;
  const hasWid = !!(song.wid || song.widShort);

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

  const creatorLabel = song.artistHandle ? `@${song.artistHandle}` : (song.artistName || "Unknown");

  return (
    <>
      <Link href={`/song/${song.id}`}>
        <div
          className={`relative ${cardWidth} flex-shrink-0 snap-start cursor-pointer group`}
          style={{ aspectRatio: "2/3" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* ── Card frame — rounded, subtle gold border ── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{
              border: isActive
                ? "1px solid rgba(196,154,40,0.55)"
                : "1px solid rgba(196,154,40,0.18)",
              boxShadow: isActive
                ? "0 0 0 1px rgba(196,154,40,0.22), 0 8px 32px rgba(0,0,0,0.65), 0 0 28px rgba(196,154,40,0.14), inset 0 0 32px rgba(196,154,40,0.05)"
                : hovered
                  ? "0 12px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(196,154,40,0.22), 0 0 24px rgba(196,154,40,0.10), inset 0 0 24px rgba(196,154,40,0.04)"
                  : "0 4px 20px rgba(0,0,0,0.55)",
              transform: hovered ? "translateY(-4px) scale(1.015)" : "translateY(0) scale(1)",
              transition: "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease, border-color 0.28s ease",
            }}
          >
            {/* ── LAYER 1: Artwork — full-bleed, portrait ── */}
            {song.coverArtUrl ? (
              <img
                src={song.coverArtUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: hovered ? "brightness(0.82)" : "brightness(0.88)",
                  transition: "filter 0.28s ease",
                }}
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(160deg, #1a1228 0%, #0e0c1c 40%, #0d0814 100%)",
                }}
              />
            )}

            {/* ── LAYER 2: Gradient scrim — cinematic bottom fade ── */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.70) 25%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.06) 68%, transparent 80%)",
              }}
            />

            {/* ── LAYER 3: WID seal — top-right, architectural badge ── */}
            {hasWid && (
              <Link
                href={`/verify/${song.wid || song.widShort}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <div
                  className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(196,154,40,0.12)",
                    border: "1px solid rgba(196,154,40,0.50)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 0 8px rgba(196,154,40,0.14), 0 0 0 1px rgba(196,154,40,0.06), inset 0 1px 0 rgba(196,154,40,0.18)",
                  }}
                >
                  <Shield className="w-2.5 h-2.5" style={{ color: "#D4A843" }} />
                  <span
                    className="font-heading text-[8px] tracking-[0.20em] uppercase"
                    style={{ color: "#D4A843", textShadow: "0 0 8px rgba(196,154,40,0.40)" }}
                  >
                    WID
                  </span>
                </div>
              </Link>
            )}

            {/* ── NEW badge — top-left, only when isNew=true ── */}
            {isNew && !isActive && (
              <div
                className="absolute top-2.5 left-2.5 z-20 text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                style={{
                  background: "rgba(74,222,128,0.14)",
                  border: "1px solid rgba(74,222,128,0.45)",
                  color: "#4ade80",
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: "0.14em",
                  backdropFilter: "blur(4px)",
                }}
              >
                NEW
              </div>
            )}

            {/* ── NOW PLAYING badge — top-left when active ── */}
            {isActive && (
              <div
                className="absolute top-2.5 left-2.5 z-20 text-[8px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                style={{
                  background: "rgba(196,154,40,0.18)",
                  border: "1px solid rgba(196,154,40,0.45)",
                  color: "#C9A84C",
                  fontFamily: "'Cinzel', serif",
                  backdropFilter: "blur(4px)",
                }}
              >
                ▶ NOW PLAYING
              </div>
            )}

            {/* ── LAYER 4: Play button — centered, hidden at rest, glowing on hover ── */}
            {hasAudio && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                style={{
                  opacity: hovered || isPlaying ? 1 : 0,
                  transition: "opacity 0.22s ease",
                }}
              >
                <button
                  onClick={handlePlay}
                  className="pointer-events-auto flex items-center justify-center rounded-full"
                  style={{
                    width: "52px",
                    height: "52px",
                    background: isPlaying ? "rgba(196,154,40,0.20)" : "rgba(0,0,0,0.42)",
                    border: isPlaying ? "1.5px solid rgba(196,154,40,0.90)" : "1.5px solid rgba(196,154,40,0.70)",
                    boxShadow: isPlaying
                      ? "0 0 0 6px rgba(196,154,40,0.07), 0 0 24px rgba(196,154,40,0.32)"
                      : "0 0 0 5px rgba(196,154,40,0.05), 0 0 16px rgba(196,154,40,0.22)",
                    backdropFilter: "blur(4px)",
                    animation: isPlaying ? "pulse-gold 1.8s ease-in-out infinite" : "none",
                    transition: "box-shadow 0.2s ease, background 0.2s ease",
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

            {/* ── LAYERS 5 + 6 + 7: Bottom content stack ── */}
            <div className="absolute inset-x-0 bottom-0 p-3 z-10">
              {/* Work title — dominant, creation first */}
              <p
                className="font-heading leading-tight line-clamp-2 mb-1"
                style={{
                  fontSize: size === "sm" ? "0.80rem" : "0.90rem",
                  color: "rgba(248,244,236,1)",
                  letterSpacing: "0.025em",
                  textShadow: "0 1px 8px rgba(0,0,0,1), 0 2px 24px rgba(0,0,0,0.90), 0 0 40px rgba(0,0,0,0.60)",
                }}
              >
                {song.title}
              </p>

              {/* Creator + resonance row */}
              <div className="flex items-center justify-between gap-1">
                {/* Creator — whispered, secondary */}
                <div className="flex items-center gap-1 min-w-0">
                  {song.profilePhotoUrl ? (
                    <img
                      src={song.profilePhotoUrl}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                      style={{ border: "1px solid rgba(196,154,40,0.22)" }}
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: "rgba(196,154,40,0.10)", border: "1px solid rgba(196,154,40,0.18)" }}
                    />
                  )}
                  <span
                    className="truncate"
                    style={{
                      fontSize: "10px",
                  color: "rgba(220,200,140,0.62)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.03em",
                  textShadow: "0 1px 8px rgba(0,0,0,0.98)",
                    }}
                  >
                    {creatorLabel}
                  </span>
                </div>

                {/* Resonance — plays / tips, minimal */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {plays && (
                    <div className="flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" style={{ color: "rgba(220,180,80,0.45)" }} />
                      <span style={{ fontSize: "10px", color: "rgba(220,180,80,0.45)", fontVariantNumeric: "tabular-nums" }}>{plays}</span>
                    </div>
                  )}
                  {tips && (
                    <div className="flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5" style={{ color: "rgba(220,80,80,0.55)" }} />
                      <span style={{ fontSize: "10px", color: "rgba(220,80,80,0.55)", fontVariantNumeric: "tabular-nums" }}>{tips}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 3-dot menu — top-right area, appears on hover, below WID badge ── */}
            {!hasWid && (
              <button
                onClick={handleMenuOpen}
                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center z-20"
                style={{
                  background: "rgba(0,0,0,0.50)",
                  backdropFilter: "blur(4px)",
                  opacity: hovered ? 1 : 0,
                  transition: "opacity 0.2s ease",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
                title="More options"
              >
                <MoreVertical className="w-3 h-3 text-white/70" />
              </button>
            )}
            {hasWid && (
              <button
                onClick={handleMenuOpen}
                className="absolute top-9 right-2.5 w-6 h-6 rounded-full flex items-center justify-center z-20"
                style={{
                  background: "rgba(0,0,0,0.50)",
                  backdropFilter: "blur(4px)",
                  opacity: hovered ? 1 : 0,
                  transition: "opacity 0.2s ease",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
                title="More options"
              >
                <MoreVertical className="w-3 h-3 text-white/70" />
              </button>
            )}
          </div>
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
