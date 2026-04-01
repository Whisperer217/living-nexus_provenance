/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobilePlayerLayer v1.0
   Full-viewport player layer — detached from layout tree via React portal.

   Three states:
     mini      → 64px bottom bar, always present when track loaded
     expanded  → full-screen sheet (100dvh), slides up from bottom
     cinematic → edge-to-edge artwork/video, tap to reveal controls

   Gesture model:
     mini      → swipe-up or tap artwork → expanded
     expanded  → swipe-down (≥60px) → mini
     expanded  → tap ⬛ cinematic button → cinematic
     cinematic → tap → toggle overlay controls
     cinematic → swipe-down (≥80px) → expanded
     landscape → reduced strip UI (play + scrubber + time only)
═══════════════════════════════════════════════════════════════════ */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Heart, Music,
  Share2, DollarSign, ChevronDown,
  Maximize2, Check, Video, ListMusic,
  Volume2, VolumeX,
} from "lucide-react";
import GiftModal from "./GiftModal";
import { MediaAsset } from "@/components/MediaAsset";

// ── Helpers ────────────────────────────────────────────────────────
function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

type PlayerState = "mini" | "expanded" | "cinematic";

// ── Scrubber ───────────────────────────────────────────────────────
function Scrubber({
  progress, currentTime, duration, onSeek, onSeekTouch, thin = false,
}: {
  progress: number;
  currentTime: number;
  duration: number;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSeekTouch: (e: React.TouchEvent<HTMLDivElement>) => void;
  thin?: boolean;
}) {
  return (
    <div className="w-full select-none">
      <div
        className={`relative w-full rounded-full cursor-pointer ${thin ? "h-0.5" : "h-1"} group`}
        style={{ background: "oklch(1 0 0 / 0.12)" }}
        onClick={onSeek}
        onTouchMove={onSeekTouch}
        onTouchStart={onSeekTouch}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-100"
          style={{
            width: `${Math.min(100, progress)}%`,
            background: "linear-gradient(90deg, oklch(0.84 0.155 85), oklch(0.75 0.18 85))",
          }}
        />
        {!thin && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `calc(${Math.min(100, progress)}% - 6px)`,
              background: "oklch(0.84 0.155 85)",
              boxShadow: "0 0 6px oklch(0.84 0.155 85 / 0.6)",
            }}
          />
        )}
      </div>
      {!thin && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono" style={{ color: "oklch(0.45 0.03 280)" }}>
            {fmtTime(currentTime)}
          </span>
          <span className="text-[10px] font-mono" style={{ color: "oklch(0.45 0.03 280)" }}>
            {fmtTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function MobilePlayerLayer() {
  const {
    state, audioRef, allTracks,
    togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute,
    setVolume, seek,
    queueContextLabel,
  } = usePlayer();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [playerState, setPlayerState] = useState<PlayerState>("mini");
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  // Overlay auto-hide timer in cinematic mode
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOverlay = useCallback(() => {
    setOverlayVisible(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setOverlayVisible(false), 3000);
  }, []);

  // Detect landscape orientation
  useEffect(() => {
    const check = () => {
      setIsLandscape(window.matchMedia("(orientation: landscape)").matches);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // Lock body scroll when expanded/cinematic
  useEffect(() => {
    if (playerState !== "mini") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [playerState]);

  // ── Gesture: swipe-up on mini → expanded ──────────────────────
  const miniTouchStartY = useRef<number | null>(null);
  const onMiniTouchStart = (e: React.TouchEvent) => {
    miniTouchStartY.current = e.touches[0].clientY;
  };
  const onMiniTouchEnd = (e: React.TouchEvent) => {
    if (miniTouchStartY.current === null) return;
    const delta = miniTouchStartY.current - e.changedTouches[0].clientY;
    // Long swipe (>120px) goes directly to cinematic; short swipe (>40px) goes to expanded
    if (delta > 120) setPlayerState("cinematic");
    else if (delta > 40) setPlayerState("expanded");
    miniTouchStartY.current = null;
  };

  // ── Gesture: swipe-down on expanded → mini ────────────────────
  const expandedTouchStartY = useRef<number | null>(null);
  const [expandedDragOffset, setExpandedDragOffset] = useState(0);
  const onExpandedTouchStart = (e: React.TouchEvent) => {
    expandedTouchStartY.current = e.touches[0].clientY;
    setExpandedDragOffset(0);
  };
  const onExpandedTouchMove = (e: React.TouchEvent) => {
    if (expandedTouchStartY.current === null) return;
    const delta = e.touches[0].clientY - expandedTouchStartY.current;
    if (delta > 0) setExpandedDragOffset(Math.min(delta, 200));
  };
  const onExpandedTouchEnd = () => {
    if (expandedDragOffset > 60) {
      setPlayerState("mini");
    }
    setExpandedDragOffset(0);
    expandedTouchStartY.current = null;
  };

  // ── Gesture: swipe-down on cinematic → expanded ───────────────
  const cinematicTouchStartY = useRef<number | null>(null);
  const onCinematicTouchStart = (e: React.TouchEvent) => {
    cinematicTouchStartY.current = e.touches[0].clientY;
    showOverlay();
  };
  const onCinematicTouchEnd = (e: React.TouchEvent) => {
    if (cinematicTouchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - cinematicTouchStartY.current;
    if (delta > 80) setPlayerState("expanded");
    cinematicTouchStartY.current = null;
  };

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );
  const stripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const videoUrl = (songDetail?.song as any)?.videoUrl as string | null | undefined;
  const videoWitnessId = (songDetail?.song as any)?.videoWitnessId as string | null | undefined;
  const lyricsText = (songDetail?.song as any)?.lyricsText as string | null | undefined;

  // Like state
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId) }
  );
  const isLiked = !!likeStatusData?.liked;
  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => refetchLikeStatus(),
  });
  const handleToggleLike = useCallback(() => {
    if (!user || !currentSongId) return;
    toggleLikeMutation.mutate({ songId: currentSongId });
  }, [user, currentSongId, toggleLikeMutation]);

  // Video ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoBuffering, setVideoBuffering] = useState(true);
  const showVideo = state.isPlaying && !videoBuffering;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (state.isPlaying && playerState !== "mini") {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [state.isPlaying, playerState, videoUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    const onWaiting = () => setVideoBuffering(true);
    const onCanPlay = () => setVideoBuffering(false);
    const onPlaying = () => setVideoBuffering(false);
    vid.addEventListener("waiting", onWaiting);
    vid.addEventListener("stalled", onWaiting);
    vid.addEventListener("canplay", onCanPlay);
    vid.addEventListener("canplaythrough", onCanPlay);
    vid.addEventListener("playing", onPlaying);
    vid.addEventListener("error", () => setVideoBuffering(false));
    return () => {
      vid.removeEventListener("waiting", onWaiting);
      vid.removeEventListener("stalled", onWaiting);
      vid.removeEventListener("canplay", onCanPlay);
      vid.removeEventListener("canplaythrough", onCanPlay);
      vid.removeEventListener("playing", onPlaying);
    };
  }, [videoUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }
    setVideoBuffering(true);
  }, [currentTrack?.id]);

  // Scrubber
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);
  const handleSeekTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    seek(((touch.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  // Share
  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    const url = currentSongId ? `${window.location.origin}/song/${currentSongId}` : window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: currentTrack.title ?? "", url }); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [currentTrack, currentSongId]);

  // Don't render if no track
  if (!currentTrack) return null;

  // artStyle is used ONLY in the expanded sheet ArtworkLayer (object-contain so full art is visible).
  // Mini thumbnail and cinematic mode use their own inline styles (object-cover is intentional there).
  const artStyle: React.CSSProperties = {
    objectFit: "contain",
    width: "100%",
    height: "100%",
  };

  // ── Artwork/Video layer (shared across expanded + cinematic) — MRS player mode ──
  const ArtworkLayer = ({ fill = false }: { fill?: boolean }) => (
    <div className={`relative ${fill ? "absolute inset-0" : "w-full h-full"} overflow-hidden`}>
      <MediaAsset
        src={currentTrack.artUrl}
        alt={currentTrack.title}
        mode="player"
        focalX={currentTrack.coverPositionX ?? 50}
        focalY={currentTrack.coverPositionY ?? 50}
        emoji={currentTrack.emoji}
        bg={currentTrack.bg}
        showGradient={false}
        videoUrl={videoUrl}
        showVideo={showVideo}
        videoRef={videoRef as React.RefObject<HTMLVideoElement | null>}
        className="absolute inset-0 w-full h-full"
      />
      {videoUrl && showVideo && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
          style={{ background: "oklch(0.84 0.155 85 / 0.9)", color: "oklch(0.08 0.01 280)" }}>
          <Video size={9} /> Live
        </div>
      )}
    </div>
  );

  // ── Controls row (shared) ──────────────────────────────────────
  const ControlsRow = ({ large = false, overlay = false }: { large?: boolean; overlay?: boolean }) => (
    <div className={`flex items-center justify-center gap-${large ? "8" : "6"}`}>
      <button
        onClick={toggleShuffle}
        className="transition-all active:scale-90"
        style={{ color: state.isShuffle ? "oklch(0.84 0.155 85)" : "oklch(0.40 0.03 280)" }}
      >
        <Shuffle size={large ? 20 : 16} />
      </button>
      <button
        onClick={prevTrack}
        className="transition-all active:scale-90"
        style={{ color: overlay ? "white" : "oklch(0.75 0.04 280)" }}
      >
        <SkipBack size={large ? 28 : 22} fill="currentColor" />
      </button>
      <button
        onClick={togglePlay}
        className="flex items-center justify-center rounded-full transition-all active:scale-90"
        style={{
          width: large ? "64px" : "52px",
          height: large ? "64px" : "52px",
          background: "linear-gradient(135deg, oklch(0.84 0.155 85), oklch(0.72 0.18 75))",
          boxShadow: "0 4px 20px oklch(0.84 0.155 85 / 0.35)",
          color: "oklch(0.08 0.01 280)",
        }}
      >
        {state.isPlaying
          ? <Pause size={large ? 26 : 20} fill="currentColor" />
          : <Play size={large ? 26 : 20} fill="currentColor" style={{ marginLeft: "2px" }} />}
      </button>
      <button
        onClick={nextTrack}
        className="transition-all active:scale-90"
        style={{ color: overlay ? "white" : "oklch(0.75 0.04 280)" }}
      >
        <SkipForward size={large ? 28 : 22} fill="currentColor" />
      </button>
      <button
        onClick={toggleRepeat}
        className="transition-all active:scale-90"
        style={{ color: state.isRepeat ? "oklch(0.84 0.155 85)" : "oklch(0.40 0.03 280)" }}
      >
        <Repeat size={large ? 20 : 16} />
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  MINI STATE
  // ══════════════════════════════════════════════════════════════
  const MiniBar = () => (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9990]"
      style={{
        minHeight: "64px",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        background: "oklch(0.10 0.025 275 / 0.98)",
        backdropFilter: "blur(20px) saturate(1.4)",
        borderTop: "1px solid oklch(0.84 0.155 85 / 0.20)",
        boxShadow: "0 -8px 40px oklch(0 0 0 / 0.6), 0 -1px 0 oklch(0.84 0.155 85 / 0.08)",
      }}
      onTouchStart={onMiniTouchStart}
      onTouchEnd={onMiniTouchEnd}
    >
      {/* Progress line at top of mini bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "oklch(1 0 0 / 0.06)" }}>
        <div
          className="h-full transition-[width] duration-100"
          style={{
            width: `${Math.min(100, progress)}%`,
            background: "linear-gradient(90deg, oklch(0.84 0.155 85), oklch(0.75 0.18 85))",
          }}
        />
      </div>

      <div className="flex items-center h-full px-3 gap-3">
        {/* Artwork — tap to expand */}
        <button
          onClick={() => setPlayerState("expanded")}
          className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden relative"
          style={{ background: currentTrack.bg || "oklch(0.18 0.04 275)" }}
        >
          {currentTrack.artUrl && currentTrack.artType !== "video" ? (
            <img src={currentTrack.artUrl} alt="" className="w-full h-full" style={artStyle} />
          ) : currentTrack.artUrl && currentTrack.artType === "video" ? (
            <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
          ) : (
            <Music className="absolute inset-0 m-auto w-5 h-5 opacity-30 text-white" />
          )}
          {/* Playing waveform overlay */}
          {state.isPlaying && (
            <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-1"
              style={{ background: "oklch(0 0 0 / 0.35)" }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-[2px] rounded-full"
                  style={{
                    background: "oklch(0.84 0.155 85)",
                    animation: `mobileWave 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                    height: "6px",
                  }} />
              ))}
            </div>
          )}
        </button>

        {/* Title + artist — tap to expand */}
        <button
          onClick={() => setPlayerState("expanded")}
          className="flex-1 min-w-0 text-left"
        >
          <div className="text-[13px] font-body text-white truncate leading-tight">
            {currentTrack.title || "Unknown Track"}
          </div>
          <div className="text-[11px] truncate leading-tight mt-0.5"
            style={{ color: "oklch(0.55 0.04 280)" }}>
            {currentTrack.artist || "Unknown Artist"}
          </div>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
          style={{
            background: "oklch(0.84 0.155 85 / 0.12)",
            color: "oklch(0.84 0.155 85)",
            border: "1px solid oklch(0.84 0.155 85 / 0.25)",
          }}
        >
          {state.isPlaying
            ? <Pause size={18} fill="currentColor" />
            : <Play size={18} fill="currentColor" style={{ marginLeft: "2px" }} />}
        </button>

        {/* Next */}
        <button
          onClick={nextTrack}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-all active:scale-90"
          style={{ color: "oklch(0.45 0.03 280)" }}
        >
          <SkipForward size={18} fill="currentColor" />
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  EXPANDED STATE
  // ══════════════════════════════════════════════════════════════
  const ExpandedSheet = () => (
    <div
      className="md:hidden fixed inset-0 z-[9995] flex flex-col"
      style={{
        background: "oklch(0.08 0.02 275)",
        transform: `translateY(${expandedDragOffset}px)`,
        transition: expandedDragOffset === 0 ? "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)" : "none",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 12px)",
      }}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        onTouchStart={onExpandedTouchStart}
        onTouchMove={onExpandedTouchMove}
        onTouchEnd={onExpandedTouchEnd}
      >
        <div className="w-10 h-1 rounded-full" style={{ background: "oklch(1 0 0 / 0.15)" }} />
      </div>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3">
        <button
          onClick={() => setPlayerState("mini")}
          className="p-2 rounded-xl transition-all active:scale-90"
          style={{ color: "oklch(0.45 0.03 280)" }}
        >
          <ChevronDown size={22} />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-heading tracking-[0.18em] uppercase"
            style={{ color: "oklch(0.45 0.03 280)" }}>
            Now Playing
          </div>
          {queueContextLabel && (
            <div className="text-[9px] mt-0.5" style={{ color: "oklch(0.84 0.155 85 / 0.55)", fontFamily: "'Cinzel', serif" }}>
              {queueContextLabel}
            </div>
          )}
        </div>
        <button
          onClick={() => setPlayerState("cinematic")}
          className="p-2 rounded-xl transition-all active:scale-90"
          style={{ color: "oklch(0.45 0.03 280)" }}
          title="Cinematic mode"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Artwork — square, centered */}
      <div className="flex-shrink-0 px-8 pb-5">
        <div
          className="w-full rounded-2xl overflow-hidden relative"
          style={{
            aspectRatio: "1 / 1",
            boxShadow: "0 16px 64px oklch(0 0 0 / 0.6), 0 4px 16px oklch(0.84 0.155 85 / 0.08)",
          }}
        >
          <ArtworkLayer />
          {videoWitnessId && (
            <button
              onClick={() => navigate(`/verify/${videoWitnessId}`)}
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold"
              style={{
                background: "oklch(0.22 0.08 145 / 0.88)",
                border: "1px solid oklch(0.55 0.18 145 / 0.5)",
                color: "oklch(0.82 0.18 145)",
                backdropFilter: "blur(4px)",
              }}
            >
              ✓ WID
            </button>
          )}
        </div>
      </div>

      {/* Track info */}
      <div className="flex-shrink-0 px-8 pb-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-heading text-white truncate leading-tight">
            {currentTrack.title || "Unknown Track"}
          </div>
          <div className="text-[13px] mt-1 truncate" style={{ color: "oklch(0.55 0.04 280)" }}>
            {currentTrack.artist || "Unknown Artist"}
          </div>
        </div>
        <button
          onClick={handleToggleLike}
          className="flex-shrink-0 ml-4 p-2 rounded-full transition-all active:scale-90"
          style={{
            color: isLiked ? "oklch(0.65 0.22 15)" : "oklch(0.40 0.03 280)",
            background: isLiked ? "oklch(0.65 0.22 15 / 0.12)" : "transparent",
          }}
        >
          <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Scrubber */}
      <div className="flex-shrink-0 px-8 pb-5">
        <Scrubber
          progress={progress}
          currentTime={state.currentTime}
          duration={state.duration}
          onSeek={handleSeek}
          onSeekTouch={handleSeekTouch}
        />
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 px-8 pb-6">
        <ControlsRow large />
      </div>

      {/* Action row */}
      <div className="flex-shrink-0 px-8 pb-4 flex items-center justify-between">
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          style={{ color: copied ? "oklch(0.70 0.18 145)" : "oklch(0.40 0.03 280)" }}
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          <span className="text-[9px] font-heading tracking-wide">{copied ? "Copied" : "Share"}</span>
        </button>

        <button
          onClick={() => setGiftOpen(true)}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          style={{ color: "oklch(0.40 0.03 280)" }}
        >
          <DollarSign size={18} />
          <span className="text-[9px] font-heading tracking-wide">Gift</span>
        </button>

        <button
          onClick={() => {
            if (currentSongId) {
              setPlayerState("mini");
              navigate(`/song/${currentSongId}`);
            }
          }}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          style={{ color: "oklch(0.40 0.03 280)" }}
        >
          <ListMusic size={18} />
          <span className="text-[9px] font-heading tracking-wide">Details</span>
        </button>

        <button
          onClick={toggleMute}
          className="flex flex-col items-center gap-1 transition-all active:scale-90"
          style={{ color: state.isMuted ? "oklch(0.65 0.22 15)" : "oklch(0.40 0.03 280)" }}
        >
          {state.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span className="text-[9px] font-heading tracking-wide">{state.isMuted ? "Muted" : "Sound"}</span>
        </button>
      </div>

      {/* Lyrics strip (if available) */}
      {lyricsText && (
        <div className="flex-1 overflow-y-auto px-8 pb-4 min-h-0">
          <div className="text-[11px] font-heading tracking-[0.12em] uppercase mb-3"
            style={{ color: "oklch(0.35 0.02 280)" }}>
            Lyrics
          </div>
          <div className="text-[13px] font-body leading-relaxed whitespace-pre-wrap"
            style={{ color: "oklch(0.55 0.04 280)" }}>
            {lyricsText}
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  //  CINEMATIC STATE
  // ══════════════════════════════════════════════════════════════
  const CinematicLayer = () => (
    <div
      className="md:hidden fixed inset-0 z-[9999] bg-black"
      onTouchStart={onCinematicTouchStart}
      onTouchEnd={onCinematicTouchEnd}
      onClick={showOverlay}
    >
      {/* Full-bleed artwork/video — cinematic mode with Ken Burns + parallax */}
      <MediaAsset
        src={currentTrack.artUrl}
        alt={currentTrack.title}
        mode="cinematic"
        focalX={currentTrack.coverPositionX ?? 50}
        focalY={currentTrack.coverPositionY ?? 50}
        emoji={currentTrack.emoji}
        bg={currentTrack.bg}
        showGradient={false}
        videoUrl={videoUrl}
        showVideo={showVideo}
        videoRef={videoRef as React.RefObject<HTMLVideoElement | null>}
        className="absolute inset-0 w-full h-full"
      />

      {/* Ambient gradient — bottom fade for controls legibility */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: isLandscape ? "35%" : "45%",
          background: "linear-gradient(to top, oklch(0 0 0 / 0.85) 0%, transparent 100%)",
          transition: "opacity 0.4s",
          opacity: overlayVisible ? 1 : 0,
        }}
      />

      {/* Top gradient — for exit button legibility */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "20%",
          background: "linear-gradient(to bottom, oklch(0 0 0 / 0.6) 0%, transparent 100%)",
          transition: "opacity 0.4s",
          opacity: overlayVisible ? 1 : 0,
        }}
      />

      {/* ── Overlay controls — fade in/out ── */}
      <div
        className="absolute inset-0 flex flex-col justify-between"
        style={{
          transition: "opacity 0.4s",
          opacity: overlayVisible ? 1 : 0,
          pointerEvents: overlayVisible ? "auto" : "none",
          paddingTop: "env(safe-area-inset-top, 16px)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Top row: exit + track info */}
        <div className="flex items-start justify-between px-5 pt-2">
          <button
            onClick={() => setPlayerState("expanded")}
            className="p-2 rounded-xl transition-all active:scale-90"
            style={{ color: "rgba(255,255,255,0.7)", background: "oklch(0 0 0 / 0.3)", backdropFilter: "blur(8px)" }}
          >
            <ChevronDown size={22} />
          </button>
          <div className="text-right">
            <div className="text-[13px] font-heading text-white/90 truncate max-w-[200px]">
              {currentTrack.title}
            </div>
            <div className="text-[11px] text-white/50 truncate max-w-[200px]">
              {currentTrack.artist}
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        {isLandscape ? (
          // ── Landscape: minimal strip ──────────────────────────
          <div className="px-6 pb-2">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
                style={{ background: "oklch(0.84 0.155 85 / 0.9)", color: "oklch(0.08 0.01 280)" }}>
                {state.isPlaying
                  ? <Pause size={18} fill="currentColor" />
                  : <Play size={18} fill="currentColor" style={{ marginLeft: "2px" }} />}
              </button>
              <span className="text-[10px] font-mono text-white/50 flex-shrink-0">
                {fmtTime(state.currentTime)}
              </span>
              <div className="flex-1">
                <Scrubber
                  progress={progress}
                  currentTime={state.currentTime}
                  duration={state.duration}
                  onSeek={handleSeek}
                  onSeekTouch={handleSeekTouch}
                  thin
                />
              </div>
              <span className="text-[10px] font-mono text-white/50 flex-shrink-0">
                {fmtTime(state.duration)}
              </span>
              <button onClick={nextTrack} style={{ color: "rgba(255,255,255,0.6)" }}>
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>
          </div>
        ) : (
          // ── Portrait: full controls ───────────────────────────
          <div className="px-6 pb-4 space-y-5">
            {/* Track info + like */}
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[17px] font-heading text-white truncate">{currentTrack.title}</div>
                <div className="text-[12px] text-white/50 truncate mt-0.5">{currentTrack.artist}</div>
              </div>
              <button onClick={handleToggleLike} className="flex-shrink-0 ml-3 p-2"
                style={{ color: isLiked ? "oklch(0.65 0.22 15)" : "rgba(255,255,255,0.4)" }}>
                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Scrubber */}
            <Scrubber
              progress={progress}
              currentTime={state.currentTime}
              duration={state.duration}
              onSeek={handleSeek}
              onSeekTouch={handleSeekTouch}
            />

            {/* Controls */}
            <ControlsRow large overlay />

            {/* Action tray — Gift / Share / Details */}
            <div className="flex items-center justify-around pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); setGiftOpen(true); }}
                className="flex flex-col items-center gap-1 transition-all active:scale-90"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{ background: "oklch(1 0 0 / 0.08)", backdropFilter: "blur(8px)" }}>
                  <DollarSign size={16} />
                </div>
                <span className="text-[9px] font-heading tracking-widest uppercase">Gift</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                className="flex flex-col items-center gap-1 transition-all active:scale-90"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{ background: "oklch(1 0 0 / 0.08)", backdropFilter: "blur(8px)" }}>
                  {copied ? <Check size={16} style={{ color: "oklch(0.84 0.155 85)" }} /> : <Share2 size={16} />}
                </div>
                <span className="text-[9px] font-heading tracking-widest uppercase">{copied ? "Copied" : "Share"}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPlayerState("mini"); navigate(`/song/${currentSongId}`); }}
                className="flex flex-col items-center gap-1 transition-all active:scale-90"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <div className="w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{ background: "oklch(1 0 0 / 0.08)", backdropFilter: "blur(8px)" }}>
                  <ListMusic size={16} />
                </div>
                <span className="text-[9px] font-heading tracking-widest uppercase">Details</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render via portal ──────────────────────────────────────────
  return createPortal(
    <>
      {/* CSS keyframes for waveform animation */}
      <style>{`
        @keyframes mobileWave {
          from { height: 3px; }
          to   { height: 10px; }
        }
      `}</style>

      {/* Mini bar — always visible when track loaded */}
      {playerState === "mini" && <MiniBar />}

      {/* Expanded sheet — slides up */}
      {playerState === "expanded" && <ExpandedSheet />}

      {/* Cinematic layer — full-bleed */}
      {playerState === "cinematic" && <CinematicLayer />}

      {/* Gift modal */}
      {giftOpen && currentTrack && currentSongId && (
        <GiftModal
          songId={currentSongId}
          artistName={currentTrack.artist ?? ""}
          stripeAccountId={stripeAccountId}
          onClose={() => setGiftOpen(false)}
        />
      )}
    </>,
    document.body
  );
}
