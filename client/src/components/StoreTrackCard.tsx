/*
╔══════════════════════════════════════════════════════════════════╗
║  LIVING NEXUS — WITNESS CARD (SACRED VISION v3.0 — Phase N+5)  ║
║  ──────────────────────────────────────────────────────────────  ║
║  Design Language: Vibe-coded cathedral. Premium gallery.         ║
║  The creation is the statement. The creator is the signature.    ║
║                                                                  ║
║  Layer 1: Artwork — full-bleed portrait, 2:3 aspect ratio        ║
║  Layer 2: Gradient — bottom 55%, deeper cinematic fade           ║
║  Layer 3: WID badge — top-right, architectural seal, permanent   ║
║  Layer 4: Play — hidden at rest, centered glow ring on hover     ║
║  Layer 5: Title — bottom, dominant, work-first                   ║
║  Layer 6: Creator — whispered below title, warm parchment        ║
║  Layer 7: Resonance — plays/tips, bottom-right, minimal          ║
║                                                                  ║
║  Sacred Vision Elevation:                                        ║
║  • sanctuary-glow animation when playing (replaces witness-breathe)
║  • Missing art: relic rings + void-breathe + inviting label      ║
║  • sg-corner-frame on all cards (architectural gold brackets)    ║
║  • Deeper cinematic scrim (95→0 bottom fade)                     ║
║  • Gold shimmer on title when active                             ║
╚══════════════════════════════════════════════════════════════════╝
*/

import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Play, Pause, Shield, MoreVertical, ListPlus, ExternalLink, Copy, SkipForward, Flame, Heart, Music } from "lucide-react";
import { AddToMyListModal } from "@/components/AddToMyListModal";
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
        <ListPlus className="w-3.5 h-3.5 opacity-60" />
        Add to My List
      </button>
      <AddToMyListModal
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

// ── WITNESS CARD — Sacred Vision v3.0 ────────────────────────────
export function StoreTrackCard({ song, size = "md", allSongs, songIndex, isNew }: StoreTrackCardProps) {
  const { state, playQueueAt, addAndPlay } = usePlayer();
  const currentTrack = state.tracks[state.currentIdx];
  const isPlaying = currentTrack?.id === String(song.id) && state.isPlaying;
  const isActive = currentTrack?.id === String(song.id);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  // Portrait card widths — 2:3 aspect ratio (golden ratio territory)
  const cardWidth =
    size === "sm" ? "w-[140px] sm:w-[160px]" :
    size === "lg" ? "w-[180px] sm:w-[220px]" :
                   "w-[160px] sm:w-[190px]";

  const { plays, tips } = formatResonance(song);
  const hasAudio = !!song.fileUrl;
  const hasWid = !!(song.wid || song.widShort);
  const hasArt = !!song.coverArtUrl;

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
  const [, navigate] = useLocation();

  // Sacred Vision: card frame style — active tracks breathe with sanctuary glow
  const cardFrameStyle: React.CSSProperties = {
    border: isActive
      ? "1px solid rgba(196,154,40,0.68)"
      : hovered
        ? "1px solid rgba(196,154,40,0.38)"
        : "1px solid rgba(196,154,40,0.18)",
    boxShadow: isActive
      ? "0 0 0 2px rgba(196,154,40,0.18), 0 8px 48px rgba(0,0,0,0.75), 0 0 40px rgba(196,154,40,0.22)"
      : hovered
        ? "0 16px 64px rgba(0,0,0,0.82), 0 0 0 1px rgba(196,154,40,0.28), 0 0 32px rgba(196,154,40,0.14)"
        : "0 4px 24px rgba(0,0,0,0.58), 0 0 0 0 transparent",
    transform: hovered && !isActive ? "translateY(-6px) scale(1.022)" : isActive ? "translateY(-2px) scale(1.008)" : "translateY(0) scale(1)",
    transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.32s ease",
    // sanctuary-glow animation applied via className below
  };

  return (
    <>
      <Link
        href={`/song/${song.id}`}
        className={`block ${cardWidth} flex-shrink-0 snap-start`}
        style={{ aspectRatio: "2/3" }}
      >
        <div
          className="relative w-full h-full cursor-pointer group"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* ── Card frame — sg-corner-frame + sanctuary glow when active ── */}
          <div
            className={`absolute inset-0 rounded-2xl overflow-hidden sg-corner-frame${isActive ? " witness-card sacred-active" : ""}`}
            style={cardFrameStyle}
          >
            {/* ── LAYER 1: Artwork — full-bleed, portrait ── */}
            {hasArt ? (
              <img
                src={song.coverArtUrl!}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  filter: hovered ? "brightness(0.75) saturate(1.10)" : "brightness(0.84) saturate(1.05)",
                  transition: "filter 0.32s ease",
                }}
              />
            ) : (
              /* ── Missing Art Sanctuary — relic rings, void breathe ── */
              <div
                className="absolute inset-0 missing-art-void flex flex-col items-center justify-center gap-3"
                style={{
                  background: "linear-gradient(160deg, #120e1c 0%, #0a0812 40%, #08060f 100%)",
                }}
              >
                {/* Relic geometry rings */}
                <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
                  <div
                    className="absolute inset-0 rounded-full relic-ring-outer"
                    style={{ border: "1px solid rgba(196,154,40,0.22)" }}
                  />
                  <div
                    className="absolute inset-[10px] rounded-full relic-ring-inner"
                    style={{ border: "1px solid rgba(196,154,40,0.14)" }}
                  />
                  <Music
                    className="relic-icon"
                    style={{ width: 22, height: 22, color: "rgba(196,154,40,0.38)" }}
                  />
                </div>
                <span
                  className="text-[9px] font-heading tracking-[0.18em] uppercase"
                  style={{ color: "rgba(196,154,40,0.30)" }}
                >
                  No Art Yet
                </span>
              </div>
            )}

            {/* ── LAYER 2: Gradient scrim — deeper cinematic bottom fade ── */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 20%, rgba(0,0,0,0.38) 46%, rgba(0,0,0,0.10) 64%, transparent 80%)",
              }}
            />

            {/* ── LAYER 3: WID seal — top-right, architectural badge ── */}
            {hasWid && (
              <button
                type="button"
                aria-label="Verify WID"
                className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(196,154,40,0.15)",
                  border: "1px solid rgba(196,154,40,0.62)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 14px rgba(196,154,40,0.24), 0 0 0 1px rgba(196,154,40,0.08), inset 0 1px 0 rgba(255,220,100,0.26)",
                  cursor: "pointer",
                }}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/verify/${song.wid || song.widShort}`);
                }}
              >
                <Shield className="w-2.5 h-2.5" style={{ color: "#D4A843", filter: "drop-shadow(0 0 4px rgba(196,154,40,0.65))" }} />
                <span
                  className="font-heading text-[8px] tracking-[0.22em] uppercase"
                  style={{ color: "#D4A843", textShadow: "0 0 10px rgba(196,154,40,0.60)" }}
                >
                  WID
                </span>
              </button>
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
                className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                style={{
                  background: "rgba(196,154,40,0.22)",
                  border: "1px solid rgba(196,154,40,0.58)",
                  color: "#C9A84C",
                  fontFamily: "'Cinzel', serif",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 0 10px rgba(196,154,40,0.22)",
                }}
              >
                <div className="live-wave scale-75"><span /><span /><span /></div>
                LIVE
              </div>
            )}

            {/* ── LAYER 4: Play button — centered, hidden at rest, glowing on hover ── */}
            {hasAudio && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                style={{
                  opacity: hovered || isPlaying ? 1 : 0,
                  transition: "opacity 0.24s ease",
                }}
              >
                <button
                  onClick={handlePlay}
                  className="pointer-events-auto flex items-center justify-center rounded-full"
                  style={{
                    width: "56px",
                    height: "56px",
                    background: isPlaying
                      ? "rgba(196,154,40,0.26)"
                      : "rgba(0,0,0,0.50)",
                    border: isPlaying
                      ? "1.5px solid rgba(196,154,40,0.98)"
                      : "1.5px solid rgba(196,154,40,0.80)",
                    boxShadow: isPlaying
                      ? "0 0 0 8px rgba(196,154,40,0.10), 0 0 32px rgba(196,154,40,0.42), inset 0 1px 0 rgba(255,220,100,0.22)"
                      : "0 0 0 7px rgba(196,154,40,0.07), 0 0 22px rgba(196,154,40,0.28), inset 0 1px 0 rgba(255,220,100,0.14)",
                    backdropFilter: "blur(8px)",
                    animation: isPlaying ? "pulse-gold 1.8s ease-in-out infinite" : "none",
                    transition: "box-shadow 0.22s ease, background 0.22s ease",
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
                className="font-heading leading-tight line-clamp-2 mb-1.5"
                style={{
                  fontSize: size === "sm" ? "0.80rem" : "0.92rem",
                  color: isActive ? "rgba(255,230,140,0.98)" : "rgba(252,248,240,1)",
                  letterSpacing: "0.025em",
                  textShadow: isActive
                    ? "0 1px 8px rgba(0,0,0,1), 0 0 20px rgba(196,154,40,0.35)"
                    : "0 1px 8px rgba(0,0,0,1), 0 2px 24px rgba(0,0,0,0.92)",
                  transition: "color 0.4s ease, text-shadow 0.4s ease",
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
                      style={{ border: "1px solid rgba(196,154,40,0.30)" }}
                    />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: "rgba(196,154,40,0.10)", border: "1px solid rgba(196,154,40,0.22)" }}
                    />
                  )}
                  <span
                    className="truncate"
                    style={{
                      fontSize: "10px",
                      color: "rgba(220,200,140,0.60)",
                      fontFamily: "'Cinzel', serif",
                      letterSpacing: "0.04em",
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
                      <Flame className="w-2.5 h-2.5" style={{ color: "rgba(220,180,80,0.50)" }} />
                      <span style={{ fontSize: "10px", color: "rgba(220,180,80,0.50)", fontVariantNumeric: "tabular-nums" }}>{plays}</span>
                    </div>
                  )}
                  {tips && (
                    <div className="flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5" style={{ color: "rgba(220,80,80,0.60)" }} />
                      <span style={{ fontSize: "10px", color: "rgba(220,80,80,0.60)", fontVariantNumeric: "tabular-nums" }}>{tips}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── 3-dot menu — below WID badge, appears on hover ── */}
            <button
              onClick={handleMenuOpen}
              className="absolute z-20 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                top: hasWid ? "2.4rem" : "0.625rem",
                right: "0.625rem",
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                opacity: hovered ? 1 : 0,
                transition: "opacity 0.2s ease",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
              title="More options"
            >
              <MoreVertical className="w-3 h-3 text-white/70" />
            </button>
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
