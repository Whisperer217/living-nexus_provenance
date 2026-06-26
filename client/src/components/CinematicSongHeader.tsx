/**
 * CinematicSongHeader
 * ─────────────────────────────────────────────────────────────────────────────
 * The single, unified play surface for SongDetailPage.
 *
 * Design doctrine (sovereign-cathedral):
 *  • One header = one truth. No competing play triggers below this component.
 *  • Mixed media: video background when available, cover art fallback.
 *  • Reactive gold glow — border and shadow intensify when playing.
 *  • Waveform canvas overlaid at the bottom of the frame (not a separate strip).
 *  • Ken Burns slow drift on the cover art when active.
 *  • All playback routed through the global PlayerContext — this component owns
 *    no audio element.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState, useEffect, RefObject } from "react";
import {
  Play, Pause, Music, ShieldCheck, Video, ImageIcon, BookOpen,
} from "lucide-react";

interface CinematicSongHeaderProps {
  // Song data
  title: string;
  artistName: string;
  genre?: string | null;
  witnessId?: string | null;
  coverArtUrl?: string | null;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  videoUrl?: string | null;
  hasAudio: boolean;
  contentType?: string | null;
  isOwner?: boolean;

  // Playback state (from PlayerContext)
  isThisTrackActive: boolean;
  isPlaying: boolean;

  // Stats
  playCount?: number;
  commentCount?: number;
  likeCount?: number;

  // Waveform
  waveCanvasRef: RefObject<HTMLCanvasElement>;

  // Callbacks
  onPlay: () => void;
  onReadNow?: () => void;
  onEditArt?: () => void;
}

export function CinematicSongHeader({
  title,
  artistName,
  genre,
  witnessId,
  coverArtUrl,
  coverPositionX,
  coverPositionY,
  videoUrl,
  hasAudio,
  contentType,
  isOwner,
  isThisTrackActive,
  isPlaying,
  playCount = 0,
  commentCount = 0,
  likeCount = 0,
  waveCanvasRef,
  onPlay,
  onReadNow,
  onEditArt,
}: CinematicSongHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [showVideoMode, setShowVideoMode] = useState(false);

  const isReadable = contentType === "comic" || contentType === "manuscript";
  const showVideo = videoUrl && showVideoMode && !videoError;
  const focalX = coverPositionX ?? 50;
  const focalY = coverPositionY ?? 50;

  // Sync video playback with global player state
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !showVideo) return;
    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying, showVideo]);

  const handleHeaderClick = () => {
    if (isReadable && !hasAudio) {
      onReadNow?.();
    } else if (hasAudio) {
      onPlay();
    }
  };

  // Glow intensity — ramps up when playing
  const glowStyle = isThisTrackActive
    ? {
        border: isPlaying
          ? "1.5px solid rgba(196,154,40,0.65)"
          : "1px solid rgba(196,154,40,0.40)",
        boxShadow: isPlaying
          ? "0 0 80px rgba(196,154,40,0.28), 0 0 32px rgba(196,154,40,0.18), 0 12px 48px rgba(0,0,0,0.75)"
          : "0 0 40px rgba(196,154,40,0.14), 0 8px 40px rgba(0,0,0,0.65)",
      }
    : {
        border: "1px solid rgba(196,154,40,0.12)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      };

  return (
    <div className="cathedral-enter-art mb-6">
      {/* ── Main cinematic frame ── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl cursor-pointer group"
        style={{
          height: "clamp(300px, 42vw, 520px)",
          background: "linear-gradient(135deg, #0d0b08, #000000)",
          transition: "box-shadow 0.7s ease, border-color 0.7s ease",
          ...glowStyle,
        }}
        onClick={handleHeaderClick}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleHeaderClick(); } }}
      >
        {/* ── Background media ── */}
        {showVideo ? (
          <video
            ref={videoRef}
            src={videoUrl!}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted={false}
            loop
            onError={() => setVideoError(true)}
          />
        ) : coverArtUrl ? (
          <img
            src={coverArtUrl}
            alt={title}
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[14000ms] ease-in-out ${isThisTrackActive ? "scale-[1.04]" : "scale-100"}`}
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        ) : (
          /* Missing art void */
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6"
            style={{ background: "linear-gradient(160deg, #130f1e 0%, #0a0812 45%, #060409 100%)" }}
          >
            <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
              <div className="absolute inset-0 rounded-full relic-ring-outer" style={{ border: "1px solid rgba(196,154,40,0.20)", boxShadow: "0 0 20px rgba(196,154,40,0.06)" }} />
              <div className="absolute inset-[14px] rounded-full relic-ring-inner" style={{ border: "1px solid rgba(196,154,40,0.14)" }} />
              <div className="absolute inset-[28px] rounded-full" style={{ border: "1px solid rgba(196,154,40,0.08)" }} />
              <Music style={{ width: 30, height: 30, color: "rgba(196,154,40,0.40)", filter: "drop-shadow(0 0 8px rgba(196,154,40,0.22))" }} />
            </div>
            <div className="text-center px-8">
              <p className="font-heading tracking-[0.18em] uppercase mb-2" style={{ fontSize: "0.78rem", color: "rgba(196,154,40,0.52)" }}>
                Awaiting Visual Testimony
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.18)", lineHeight: 1.6 }}>
                This work has not yet received its cover art
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditArt?.(); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 btn-gold-glow"
                style={{
                  background: "rgba(196,154,40,0.10)",
                  border: "1px solid rgba(196,154,40,0.42)",
                  color: "var(--ln-gold)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.06em",
                  boxShadow: "0 0 16px rgba(196,154,40,0.12)",
                }}
              >
                <ImageIcon size={14} /> Bestow Cover Art
              </button>
            )}
          </div>
        )}

        {/* ── Cinematic gradient overlay — bottom fade ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.12) 35%, rgba(8,7,4,0.88) 100%)" }}
        />

        {/* ── Top-left: WID badge ── */}
        {witnessId && (
          <div
            className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] pointer-events-none"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(196,154,40,0.20)",
              color: "rgba(196,154,40,0.75)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <ShieldCheck className="w-3 h-3" /> WID
          </div>
        )}

        {/* ── Top-right: genre badge + video toggle ── */}
        <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
          {videoUrl && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowVideoMode((v) => !v); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] transition-all hover:opacity-90"
              style={{
                background: showVideoMode ? "rgba(196,154,40,0.20)" : "rgba(0,0,0,0.55)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${showVideoMode ? "rgba(196,154,40,0.50)" : "rgba(196,154,40,0.20)"}`,
                color: showVideoMode ? "rgba(196,154,40,0.95)" : "rgba(196,154,40,0.65)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {showVideoMode ? <><ImageIcon className="w-3 h-3" /> Cover Art</> : <><Video className="w-3 h-3" /> Music Video</>}
            </button>
          )}
          {genre && (
            <div
              className="px-3 py-1 rounded-full text-xs tracking-widest uppercase pointer-events-none"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(196,154,40,0.25)",
                color: "rgba(196,154,40,0.85)",
                fontFamily: "'Cinzel', serif",
                letterSpacing: "0.12em",
              }}
            >
              {genre}
            </div>
          )}
        </div>

        {/* ── Live indicator (top-right when active) ── */}
        {isThisTrackActive && (
          <div
            className="absolute top-4 pointer-events-none"
            style={{ right: genre || videoUrl ? "auto" : "1rem", left: genre || videoUrl ? "auto" : "auto" }}
          >
            {/* positioned via the badge row above when genre exists, else standalone */}
          </div>
        )}
        {isThisTrackActive && (
          <div
            className="absolute top-14 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full pointer-events-none"
            style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(196,154,40,0.4)" }}
          >
            <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
            <span className="text-[9px] font-heading tracking-widest" style={{ color: "rgba(196,154,40,0.8)" }}>LIVE</span>
          </div>
        )}

        {/* ── Bottom: title + artist + waveform + play button ── */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          {/* Waveform canvas — overlaid just above the title */}
          {hasAudio && (
            <canvas
              ref={waveCanvasRef}
              width={1200}
              height={64}
              className={`w-full block${isPlaying ? " playing" : ""}`}
              style={{
                height: "64px",
                opacity: isPlaying ? 0.75 : 0.25,
                transition: "opacity 0.6s ease",
                mixBlendMode: "screen",
              }}
            />
          )}

          {/* Title + artist row */}
          <div className="px-5 pb-5 pt-2 flex items-end justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1
                className="font-heading leading-tight mb-1 truncate"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "clamp(1.3rem, 3.2vw, 2.2rem)",
                  color: "rgba(255,255,255,0.97)",
                  textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(196,154,40,0.12)",
                  letterSpacing: "0.03em",
                }}
              >
                {title}
              </h1>
              <p
                className="text-sm truncate"
                style={{ color: "rgba(196,154,40,0.82)", fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}
              >
                {artistName}
              </p>
            </div>

            {/* Primary play/pause button — bottom right */}
            {(hasAudio || isReadable) && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleHeaderClick(); }}
                className="pointer-events-auto shrink-0 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                style={{
                  width: 56,
                  height: 56,
                  background: isPlaying ? "rgba(196,154,40,0.22)" : "rgba(196,154,40,0.92)",
                  border: "1.5px solid rgba(196,154,40,0.70)",
                  color: isPlaying ? "rgba(196,154,40,0.95)" : "#0A0B08",
                  backdropFilter: "blur(8px)",
                  boxShadow: isPlaying
                    ? "0 0 32px rgba(196,154,40,0.45), 0 0 12px rgba(196,154,40,0.25)"
                    : "0 0 16px rgba(196,154,40,0.20)",
                  transition: "all 0.3s ease",
                }}
                aria-label={isPlaying ? "Pause" : isReadable && !hasAudio ? "Read" : "Play"}
              >
                {isReadable && !hasAudio ? (
                  <BookOpen size={22} />
                ) : isPlaying ? (
                  <Pause size={22} fill="currentColor" />
                ) : (
                  <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Hover overlay (subtle) ── */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(196,154,40,0.04) 0%, transparent 70%)",
            opacity: isThisTrackActive ? 1 : 0,
          }}
        />
      </div>

      {/* ── Stats row — below the frame ── */}
      <div
        className="flex items-center justify-center gap-6 py-3 mt-1"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
      >
        <div className="flex flex-col items-center gap-0.5" title={`${playCount} plays`}>
          <span className="text-base font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{playCount}</span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>Plays</span>
        </div>
        <div className="w-px h-6" style={{ background: "rgba(196,154,40,0.12)" }} />
        <div className="flex flex-col items-center gap-0.5" title={`${commentCount} voices`}>
          <span className="text-base font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{commentCount}</span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>Voices</span>
        </div>
        <div className="w-px h-6" style={{ background: "rgba(196,154,40,0.12)" }} />
        <div className="flex flex-col items-center gap-0.5" title={`${likeCount} loved`}>
          <span className="text-base font-bold" style={{ color: likeCount > 0 ? "var(--ln-ember)" : "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>{likeCount}</span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>Loved</span>
        </div>
      </div>
    </div>
  );
}
