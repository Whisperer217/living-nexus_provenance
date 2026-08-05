/**
 * CinematicSongHeader — ACT I: Foundation (Identity & Presence)
 * ─────────────────────────────────────────────────────────────────────────────
 * Design doctrine (ACT I spec):
 *  • Creator-first: avatar + name anchor the artifact to a human presence.
 *  • Artwork-first visually: full-bleed cinematic frame, never cropped.
 *  • Minimal UI: only the elements that matter — identity, artifact, actions.
 *  • One play surface: the artwork frame is the single play trigger.
 *  • Primary action row: Play, Follow, Share, Register, Favorite — all below
 *    the artwork, never competing with the visual.
 *  • WID badge and genre/tags live in the metadata strip.
 *  • No competing play triggers anywhere on the page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState, useEffect, RefObject } from "react";
import {
  Play, Pause, Music, ShieldCheck, Video, ImageIcon, BookOpen,
  Heart, Share2, UserPlus, UserCheck, Plus, Check,
} from "lucide-react";
import { Link } from "wouter";

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

  // Creator identity
  creatorId?: number | null;
  creatorAvatarUrl?: string | null;
  creatorHandle?: string | null;

  // Playback state (from PlayerContext)
  isThisTrackActive: boolean;
  isPlaying: boolean;

  // Stats
  playCount?: number;
  commentCount?: number;
  likeCount?: number;

  // Interaction state
  isLiked?: boolean;
  isFollowing?: boolean;

  // Waveform
  waveCanvasRef: RefObject<HTMLCanvasElement>;

  // Callbacks
  onPlay: () => void;
  onReadNow?: () => void;
  onEditArt?: () => void;
  onLike?: () => void;
  onFollow?: () => void;
  onShare?: () => void;
  onRegister?: () => void;
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
  creatorId,
  creatorAvatarUrl,
  creatorHandle,
  isThisTrackActive,
  isPlaying,
  playCount = 0,
  commentCount = 0,
  likeCount = 0,
  isLiked = false,
  isFollowing = false,
  waveCanvasRef,
  onPlay,
  onReadNow,
  onEditArt,
  onLike,
  onFollow,
  onShare,
  onRegister,
}: CinematicSongHeaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [showVideoMode, setShowVideoMode] = useState(false);

  const isReadable = contentType === "comic" || contentType === "manuscript";
  const showVideo = videoUrl && showVideoMode && !videoError;

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

  const handleFrameClick = () => {
    if (isReadable && !hasAudio) {
      onReadNow?.();
    } else if (hasAudio) {
      onPlay();
    }
  };

  // Genre chips — split comma-separated string
  const genreChips = genre
    ? genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

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

      {/* ═══════════════════════════════════════════════════════════════
           ACT I — CREATOR IDENTITY ANCHOR
           Creator avatar + name appear above the artwork frame,
           establishing the human presence before the artifact.
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 mb-4 px-1">
        {/* Creator avatar */}
        <Link href={creatorId ? `/creator/${creatorId}` : "/"}>
          <div
            className="shrink-0 rounded-full overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-[rgba(196,154,40,0.5)]"
            style={{
              width: 44,
              height: 44,
              background: "rgba(196,154,40,0.08)",
              border: "1.5px solid rgba(196,154,40,0.25)",
              boxShadow: "0 0 12px rgba(196,154,40,0.10)",
            }}
          >
            {creatorAvatarUrl ? (
              <img
                src={creatorAvatarUrl}
                alt={artistName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music style={{ width: 18, height: 18, color: "rgba(196,154,40,0.45)" }} />
              </div>
            )}
          </div>
        </Link>

        {/* Creator name + handle */}
        <div className="flex-1 min-w-0">
          <Link href={creatorId ? `/creator/${creatorId}` : "/"}>
            <p
              className="text-sm font-semibold truncate cursor-pointer hover:underline"
              style={{
                color: "rgba(196,154,40,0.92)",
                fontFamily: "'Cinzel', serif",
                letterSpacing: "0.06em",
              }}
            >
              {artistName}
            </p>
          </Link>
          {creatorHandle && creatorHandle !== artistName && (
            <p
              className="text-xs truncate"
              style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.04em" }}
            >
              @{creatorHandle.replace(/^@/, "")}
            </p>
          )}
        </div>

        {/* Follow button — inline with creator identity */}
        {!isOwner && onFollow && (
          <button
            type="button"
            onClick={onFollow}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: isFollowing ? "rgba(196,154,40,0.15)" : "rgba(196,154,40,0.08)",
              border: `1px solid ${isFollowing ? "rgba(196,154,40,0.50)" : "rgba(196,154,40,0.25)"}`,
              color: isFollowing ? "rgba(196,154,40,0.95)" : "rgba(196,154,40,0.65)",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.05em",
            }}
            aria-label={isFollowing ? "Unfollow creator" : "Follow creator"}
          >
            {isFollowing
              ? <><UserCheck size={12} /> Following</>
              : <><UserPlus size={12} /> Follow</>}
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           ARTWORK FRAME — cinematic, full-bleed, click-to-play
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full overflow-hidden rounded-2xl cursor-pointer group"
        style={{
          maxHeight: "clamp(360px, 70vw, 640px)",
          background: "linear-gradient(135deg, #0d0b08, #000000)",
          transition: "box-shadow 0.7s ease, border-color 0.7s ease",
          ...glowStyle,
        }}
        onClick={handleFrameClick}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? `Pause ${title}` : (isReadable && !hasAudio ? `Read ${title}` : `Play ${title}`)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleFrameClick(); } }}
      >

        {showVideo ? (
          <video
            ref={videoRef}
            src={videoUrl!}
            className="w-full h-full object-cover"
            style={{ maxHeight: "inherit", display: "block" }}
            playsInline
            muted={false}
            loop
            onError={() => setVideoError(true)}
          />
        ) : coverArtUrl ? (
          <div className="relative w-full" style={{ maxHeight: "inherit" }}>
            {/* Blurred backdrop — fills letterbox/pillarbox space */}
            <img
              src={coverArtUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              style={{
                objectFit: "cover",
                objectPosition: `${coverPositionX ?? 50}% ${coverPositionY ?? 50}%`,
                filter: "blur(28px) saturate(0.6) brightness(0.35)",
                transform: "scale(1.08)",
              }}
            />
            {/* Primary artwork — object-contain preserves full composition */}
            <img
              src={coverArtUrl}
              alt={title}
              className={`relative w-full transition-transform duration-[14000ms] ease-in-out ${isThisTrackActive ? "scale-[1.02]" : "scale-100"}`}
              style={{
                objectFit: "contain",
                maxHeight: "clamp(360px, 70vw, 640px)",
                display: "block",
                filter: "drop-shadow(0 4px 32px rgba(0,0,0,0.55))",
              }}
            />
          </div>
        ) : (
          /* Missing art void */
          <div
            className="w-full flex flex-col items-center justify-center gap-6 py-16"
            style={{
              minHeight: "clamp(280px, 40vw, 420px)",
              background: "linear-gradient(160deg, #130f1e 0%, #0a0812 45%, #060409 100%)",
            }}
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

        {/* Overlay badges */}
        {(coverArtUrl || showVideo) && (
          <>
            {/* WID badge — top left */}
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
                role="status"
                aria-label="Witness ID verified"
              >
                <ShieldCheck className="w-3 h-3" aria-hidden="true" /> WID
              </div>
            )}

            {/* Video toggle — top right */}
            {videoUrl && (
              <div className="absolute top-4 right-4 pointer-events-auto">
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
                  {showVideoMode
                    ? <><ImageIcon className="w-3 h-3" aria-hidden="true" /> Cover Art</>
                    : <><Video className="w-3 h-3" aria-hidden="true" /> Music Video</>}
                </button>
              </div>
            )}

            {/* Live indicator */}
            {isThisTrackActive && (
              <div
                className="absolute top-14 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full pointer-events-none"
                style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(196,154,40,0.4)" }}
              >
                <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
                <span className="text-[9px] font-heading tracking-widest" style={{ color: "rgba(196,154,40,0.8)" }}>LIVE</span>
              </div>
            )}

            {/* Play overlay — center, only visible on hover */}
            {(hasAudio || isReadable) && (
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{ background: "rgba(0,0,0,0.18)" }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 72,
                    height: 72,
                    background: isPlaying ? "rgba(196,154,40,0.22)" : "rgba(196,154,40,0.88)",
                    border: "2px solid rgba(196,154,40,0.70)",
                    color: isPlaying ? "rgba(196,154,40,0.95)" : "#0A0B08",
                    boxShadow: "0 0 40px rgba(196,154,40,0.45)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {isReadable && !hasAudio ? (
                    <BookOpen size={28} />
                  ) : isPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" style={{ marginLeft: 3 }} />
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Waveform canvas — bottom of frame */}
        {hasAudio && coverArtUrl && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <canvas
              ref={waveCanvasRef}
              width={1200}
              height={64}
              aria-hidden="true"
              className={`w-full block${isPlaying ? " playing" : ""}`}
              style={{
                height: "64px",
                opacity: isPlaying ? 0.65 : 0.18,
                transition: "opacity 0.6s ease",
                mixBlendMode: "screen",
              }}
            />
          </div>
        )}

        {/* Hover radial glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(196,154,40,0.04) 0%, transparent 70%)",
            opacity: isThisTrackActive ? 1 : 0,
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           ARTIFACT IDENTITY — title, subtitle, WID, genre tags
      ═══════════════════════════════════════════════════════════════ */}
      <div className="px-1 pt-4 pb-3">
        {/* Title */}
        <h1
          className="font-heading leading-tight mb-1"
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "clamp(1.25rem, 3vw, 2rem)",
            color: "rgba(255,255,255,0.97)",
            textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(196,154,40,0.12)",
            letterSpacing: "0.03em",
            overflowWrap: "break-word",
            wordBreak: "break-word",
          }}
        >
          {title}
        </h1>

        {/* WID + genre metadata strip */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {witnessId && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
              style={{
                background: "rgba(196,154,40,0.10)",
                border: "1px solid rgba(196,154,40,0.28)",
                color: "rgba(196,154,40,0.80)",
                fontFamily: "'Cinzel', serif",
                letterSpacing: "0.06em",
              }}
            >
              <ShieldCheck size={9} /> WID · {witnessId.slice(0, 8)}…
            </span>
          )}
          {genreChips.map((g) => (
            <span
              key={g}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.05em",
              }}
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           PRIMARY ACTION ROW — Play · Favorite · Share · Register
           Minimal, horizontal, icon-first
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className="flex items-center gap-2 px-1 py-3"
        style={{ borderTop: "1px solid rgba(196,154,40,0.08)", borderBottom: "1px solid rgba(196,154,40,0.08)" }}
      >
        {/* PLAY — primary action */}
        {(hasAudio || isReadable) && (
          <button
            type="button"
            onClick={isReadable && !hasAudio ? onReadNow : onPlay}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{
              background: isPlaying ? "rgba(196,154,40,0.18)" : "rgba(196,154,40,0.92)",
              border: "1.5px solid rgba(196,154,40,0.70)",
              color: isPlaying ? "rgba(196,154,40,0.95)" : "#0A0B08",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.06em",
              boxShadow: isPlaying
                ? "0 0 24px rgba(196,154,40,0.35)"
                : "0 0 16px rgba(196,154,40,0.20)",
              transition: "all 0.3s ease",
            }}
            aria-label={isPlaying ? "Pause" : isReadable && !hasAudio ? "Read" : "Play"}
          >
            {isReadable && !hasAudio ? (
              <><BookOpen size={15} /> Read</>
            ) : isPlaying ? (
              <><Pause size={15} fill="currentColor" /> Playing</>
            ) : (
              <><Play size={15} fill="currentColor" style={{ marginLeft: 1 }} /> Play</>
            )}
          </button>
        )}

        {/* FAVORITE */}
        {onLike && (
          <button
            type="button"
            onClick={onLike}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: isLiked ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isLiked ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.12)"}`,
              color: isLiked ? "rgba(239,68,68,0.90)" : "rgba(255,255,255,0.45)",
            }}
            aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
            {likeCount > 0 && (
              <span className="text-xs" style={{ color: isLiked ? "rgba(239,68,68,0.80)" : "rgba(255,255,255,0.35)" }}>
                {likeCount}
              </span>
            )}
          </button>
        )}

        {/* SHARE */}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.45)",
            }}
            aria-label="Share this work"
          >
            <Share2 size={15} />
          </button>
        )}

        {/* REGISTER — only for non-owners, shows WID registration CTA */}
        {!isOwner && !witnessId && onRegister && (
          <button
            type="button"
            onClick={onRegister}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs transition-all hover:scale-105 active:scale-95 ml-auto"
            style={{
              background: "rgba(196,154,40,0.06)",
              border: "1px solid rgba(196,154,40,0.22)",
              color: "rgba(196,154,40,0.60)",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.05em",
            }}
            aria-label="Register this work on Living Nexus"
          >
            <Plus size={12} /> Register
          </button>
        )}

        {/* WID registered indicator — replaces Register when WID exists */}
        {witnessId && (
          <span
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs ml-auto"
            style={{
              background: "rgba(196,154,40,0.06)",
              border: "1px solid rgba(196,154,40,0.18)",
              color: "rgba(196,154,40,0.55)",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.05em",
            }}
          >
            <Check size={11} /> Registered
          </span>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center justify-center gap-6 py-3">
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

      {/* Waveform canvas for no-art case */}
      {hasAudio && !coverArtUrl && (
        <canvas
          ref={waveCanvasRef}
          width={1200}
          height={48}
          className={`w-full block mt-1${isPlaying ? " playing" : ""}`}
          style={{
            height: "48px",
            opacity: isPlaying ? 0.65 : 0.18,
            transition: "opacity 0.6s ease",
            mixBlendMode: "screen",
            borderRadius: "0.5rem",
          }}
        />
      )}
    </div>
  );
}
