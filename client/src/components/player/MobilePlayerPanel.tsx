/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobilePlayerPanel
   v1.5.0 — two UX fixes applied on top of v1.4.0 baseline:
     • Cinema Mode eye icon moved from header → next to heart/like button
     • Swipe-right-to-close removed; replaced with grab handle at bottom
       of lyrics section (swipe down ≥ 60 px closes, swipe up ≥ 60 px expands)
   v1.4.0 baseline + 4 additions:
     1. Share button (Web Share API + clipboard fallback) in action row
     2. Hide Player button (ChevronDown) in header alongside X
     3. WID badge + AI/genre tags on their own row below artist name
     4. Cinema Mode toggle (Eye icon) — now next to heart button
   Cover art: rounded square, padded, unchanged from v1.4.0.
   Controls overlay: bottom of art, unchanged from v1.4.0.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, X,
  Music, DollarSign, Users, Video,
  Share2, ChevronDown, Eye, EyeOff, Check, MessageCircle,
} from "lucide-react";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import PlayerTipModal from "./PlayerTipModal";

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function MobilePlayerPanel() {
  const {
    state, audioRef, allTracks,
    togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute,
    setVolume, seek,
    isNowPlayingPanelOpen, openNowPlayingPanel, closeNowPlayingPanel,
    queueContextLabel,
  } = usePlayer();
  const { user } = useAuth();

  const open = isNowPlayingPanelOpen;
  const togglePanel = () => isNowPlayingPanelOpen ? closeNowPlayingPanel() : openNowPlayingPanel();
  const [tipOpen, setTipOpen] = useState(false);

  // Cinema Mode
  const [cinemaMode, setCinemaMode] = useState(false);
  // Lyrics/Comments tab in Cinema Mode
  const [cinemaTab, setCinemaTab] = useState<"lyrics" | "comments">("lyrics");
  const [newComment, setNewComment] = useState("");

  // Share copied state
  const [copied, setCopied] = useState(false);

  // Panel ref (no swipe-right gesture — removed)
  const panelRef = useRef<HTMLDivElement>(null);

  // Grab-handle swipe state (swipe down ≥ 60 px closes, swipe up ≥ 60 px expands)
  const grabTouchStartY = useRef<number | null>(null);

  const onGrabTouchStart = (e: React.TouchEvent) => {
    grabTouchStartY.current = e.touches[0].clientY;
  };
  const onGrabTouchEnd = (e: React.TouchEvent) => {
    if (grabTouchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - grabTouchStartY.current;
    if (delta > 60) closeNowPlayingPanel();
    else if (delta < -60 && !open) openNowPlayingPanel();
    grabTouchStartY.current = null;
  };

  // ── Draggable floating tab ──────────────────────────────────────────
  const STORAGE_KEY = "ln_player_tab_top";
  const DEFAULT_TOP = () => Math.max(0, window.innerHeight - 220);
  const [tabTop, setTabTop] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? parseInt(saved, 10) : DEFAULT_TOP();
    } catch { return DEFAULT_TOP(); }
  });
  const dragStartY = useRef<number | null>(null);
  const dragStartTop = useRef<number>(0);
  const isDragging = useRef(false);

  const onTabTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartTop.current = tabTop;
    isDragging.current = false;
  }, [tabTop]);

  const onTabTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (Math.abs(delta) > 4) isDragging.current = true;
    if (!isDragging.current) return;
    e.stopPropagation();
    const newTop = Math.max(60, Math.min(window.innerHeight - 160, dragStartTop.current + delta));
    setTabTop(newTop);
  }, []);

  const onTabTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isDragging.current) {
      e.preventDefault();
      try { sessionStorage.setItem(STORAGE_KEY, String(tabTop)); } catch {}
    }
    dragStartY.current = null;
    isDragging.current = false;
  }, [tabTop]);

  const { backgroundCreatorHandle } = usePlayer();
  const [, navigate] = useLocation();

  const prevCreatorHandle = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    if (!backgroundCreatorHandle) return;
    if (backgroundCreatorHandle === prevCreatorHandle.current) return;
    prevCreatorHandle.current = backgroundCreatorHandle;
    if (prevCreatorHandle.current !== null) {
      navigate(`/creator/${backgroundCreatorHandle}`);
    }
  }, [backgroundCreatorHandle, open, navigate]);

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail (for tip status, lyrics, video)
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );
  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;

  // Comments (only fetched when Comments tab is active in Cinema Mode)
  const { data: commentsData, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: currentSongId! },
    { enabled: cinemaMode && cinemaTab === "comments" && !!currentSongId && !isNaN(currentSongId), staleTime: 30_000 }
  );
  const addCommentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { refetchComments(); setNewComment(""); },
  });
  const submitComment = useCallback(() => {
    if (!newComment.trim() || !currentSongId) return;
    addCommentMutation.mutate({
      songId: currentSongId,
      content: newComment.trim(),
      authorName: user?.name ?? "Anonymous",
    });
  }, [newComment, currentSongId, addCommentMutation, user]);

  // DB-backed like state
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId) }
  );
  const isLiked = !!likeStatusData?.liked;

  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => { refetchLikeStatus(); },
  });

  const handleToggleLike = useCallback(() => {
    if (!user || !currentSongId || isNaN(currentSongId)) return;
    toggleLikeMutation.mutate({ songId: currentSongId });
  }, [user, currentSongId, toggleLikeMutation]);

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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeNowPlayingPanel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Background video — always muted, auto-fades in when playing
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = (songDetail?.song as any)?.videoUrl as string | null | undefined;
  const videoWitnessId = (songDetail?.song as any)?.videoWitnessId as string | null | undefined;
  const [videoBuffering, setVideoBuffering] = useState(true);

  // Sync background video to audio play/pause state
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (state.isPlaying && open) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [state.isPlaying, open, videoUrl]);

  // Buffering event listeners — hold cover art while video loads
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    const onWaiting  = () => setVideoBuffering(true);
    const onStalled  = () => setVideoBuffering(true);
    const onCanPlay  = () => setVideoBuffering(false);
    const onPlaying  = () => setVideoBuffering(false);
    const onError    = () => setVideoBuffering(false);
    vid.addEventListener("waiting",  onWaiting);
    vid.addEventListener("stalled",  onStalled);
    vid.addEventListener("canplay",  onCanPlay);
    vid.addEventListener("canplaythrough", onCanPlay);
    vid.addEventListener("playing",  onPlaying);
    vid.addEventListener("error",    onError);
    return () => {
      vid.removeEventListener("waiting",  onWaiting);
      vid.removeEventListener("stalled",  onStalled);
      vid.removeEventListener("canplay",  onCanPlay);
      vid.removeEventListener("canplaythrough", onCanPlay);
      vid.removeEventListener("playing",  onPlaying);
      vid.removeEventListener("error",    onError);
    };
  }, [videoUrl]);

  // Show video only when playing AND not buffering
  const showVideo = state.isPlaying && !videoBuffering;

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }
    setVideoBuffering(true);
    setCinemaMode(false);
    setCinemaTab("lyrics");
    setNewComment("");
  }, [currentTrack?.id]);

  // Vertical volume bar
  const [volBarActive, setVolBarActive] = useState(false);
  const volBarRef = useRef<HTMLDivElement>(null);

  const handleVolBarTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const ratio = 1 - Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
    setVolume(ratio);
  }, [setVolume]);

  const handleVolBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setVolume(ratio);
  }, [setVolume]);

  // Share handler
  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    const url = currentSongId
      ? `${window.location.origin}/song/${currentSongId}`
      : window.location.href;
    const shareData = {
      title: currentTrack.title || "Track on Living Nexus",
      text: `${currentTrack.title} by ${currentTrack.artist} — Listen on Living Nexus`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [currentTrack, currentSongId]);

  return (
    <>
      {/* ── Floating tab (right edge, draggable) ── */}
      <button
        onClick={() => { if (!isDragging.current) togglePanel(); }}
        onTouchStart={onTabTouchStart}
        onTouchMove={onTabTouchMove}
        onTouchEnd={onTabTouchEnd}
        aria-label={open ? "Collapse player" : "Expand player"}
        className="md:hidden fixed z-50 flex flex-col items-center justify-center gap-1
          transition-[box-shadow] duration-200 active:scale-95"
        style={{
          right: 0,
          top: `${tabTop}px`,
          width: "44px",
          paddingTop: "10px",
          paddingBottom: "10px",
          borderRadius: "10px 0 0 10px",
          background: "oklch(0.14 0.025 275)",
          border: "1px solid oklch(0.22 0.02 275)",
          borderRight: "none",
          boxShadow: "-4px 0 24px oklch(0 0 0 / 0.5), -2px 0 8px oklch(0.55 0.22 295 / 0.15)",
        }}
      >
        {/* Thumbnail */}
        <div
          className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: currentTrack?.bg || "oklch(0.18 0.04 275)" }}
        >
          {currentTrack?.artUrl && currentTrack.artType !== "video" ? (
            <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover object-top" />
          ) : currentTrack?.artUrl && currentTrack.artType === "video" ? (
            <video src={currentTrack.artUrl} className="w-full h-full object-cover object-top" muted />
          ) : (
            <Music className="w-4 h-4 opacity-40 text-white" />
          )}
        </div>
        {/* Playing indicator dots */}
        {state.isPlaying && (
          <div className="flex items-end gap-[2px] h-3">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-[3px] rounded-full"
                style={{
                  background: "#D4AF37",
                  animation: `mobileWave 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                  height: "6px",
                }}
              />
            ))}
          </div>
        )}
        {/* Chevron */}
        <div
          className="text-white/30 transition-transform duration-300"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", fontSize: "10px", lineHeight: 1 }}
        >
          ›
        </div>
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeNowPlayingPanel}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          SIDE PANEL  (no swipe-right-to-close — use grab handle below)
      ══════════════════════════════════════════════════════════════ */}
      <div
        ref={panelRef}
        className="md:hidden fixed top-0 right-0 h-full z-50 flex flex-col
          transition-transform duration-300 ease-in-out"
        style={{
          width: "min(320px, 88vw)",
          background: "oklch(0.10 0.022 275)",
          borderLeft: "1px solid oklch(0.20 0.02 275)",
          boxShadow: "-8px 0 48px oklch(0 0 0 / 0.7)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* ══ FIXED TOP SECTION ══ */}
        <div className="flex-shrink-0">

          {/* ── Header: Now Playing label + Hide + Close — always visible ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex flex-col gap-0.5">
              {!cinemaMode && (
                <>
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: "oklch(0.45 0.03 280)", fontFamily: "'Cinzel', serif" }}
                  >
                    Now Playing
                  </span>
                  <span
                    className="text-[9px] tracking-wider"
                    style={{ color: "oklch(0.84 0.155 85 / 0.70)", fontFamily: "'Cinzel', serif" }}
                  >
                    {queueContextLabel}
                  </span>
                </>
              )}
              {cinemaMode && (
                <span
                  className="text-[9px] tracking-widest uppercase"
                  style={{ color: "oklch(0.84 0.155 85 / 0.45)", fontFamily: "'Cinzel', serif" }}
                >
                  Cinema
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Cinema Mode toggle — always visible in header so user can exit */}
              <button
                onClick={() => setCinemaMode(v => !v)}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  color: cinemaMode ? "oklch(0.84 0.155 85)" : "oklch(0.38 0.03 280)",
                  background: cinemaMode ? "oklch(0.84 0.155 85 / 0.12)" : "transparent",
                  border: cinemaMode ? "1px solid oklch(0.84 0.155 85 / 0.30)" : "1px solid transparent",
                }}
                title={cinemaMode ? "Exit Cinema Mode" : "Cinema Mode — lyrics & comments"}
              >
                {cinemaMode ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              {/* Hide Player (collapse) */}
              <button
                onClick={closeNowPlayingPanel}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                title="Hide player"
              >
                <ChevronDown size={16} />
              </button>
              {/* Close (X) */}
              <button
                onClick={closeNowPlayingPanel}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Cover art: rounded square, padded (v1.4.0 baseline) ── */}
          <div className="px-5 pb-3">
            <div
              key={currentTrack?.id || "empty"}
              className="w-full rounded-xl overflow-hidden relative flex items-center justify-center"
              style={{
                height: "280px",
                background: currentTrack?.bg || "oklch(0.15 0.05 275)",
                animation: "panelArtFadeIn 0.4s ease",
              }}
            >
              {/* Background video — always muted, fades in when playing + buffered */}
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                  style={{ opacity: showVideo ? 1 : 0 }}
                  playsInline
                  loop
                  muted
                  preload="metadata"
                />
              )}
              {/* Cover art — sits on top, fades out only when video is playing AND buffered */}
              {currentTrack?.artUrl ? (
                <img
                  src={currentTrack.artUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500"
                  style={{ opacity: (videoUrl && showVideo) ? 0 : 1 }}
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <Music className="w-1/2 h-1/2 opacity-30 text-white" />
                </div>
              )}
              {/* Video indicator badge — shown when video is active */}
              {videoUrl && showVideo && (
                <div
                  className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide"
                  style={{
                    background: "oklch(0.84 0.155 85 / 0.85)",
                    color: "oklch(0.08 0.01 280)",
                    backdropFilter: "blur(4px)",
                    zIndex: 20,
                  }}
                >
                  <Video size={10} />
                  Live
                </div>
              )}
              {/* Video WID badge — top-right, links to verify page */}
              {videoWitnessId && (
                <button
                  onClick={() => navigate(`/verify/${videoWitnessId}`)}
                  className="absolute top-2 right-12 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold tracking-wide transition-all"
                  style={{
                    background: "oklch(0.22 0.08 145 / 0.88)",
                    border: "1px solid oklch(0.55 0.18 145 / 0.5)",
                    color: "oklch(0.82 0.18 145)",
                    backdropFilter: "blur(4px)",
                    zIndex: 20,
                  }}
                  title="Video cryptographically witnessed"
                >
                  ✓ Video WID
                </button>
              )}

              {/* Vertical volume bar — right edge of art */}
              <div
                className="absolute top-0 right-0 h-full flex flex-col items-center justify-end"
                style={{
                  width: "44px",
                  paddingBottom: "80px",
                  paddingTop: "8px",
                  zIndex: 10,
                  transition: "opacity 0.2s",
                  opacity: volBarActive ? 1 : 0,
                  pointerEvents: volBarActive ? "auto" : "none",
                }}
              >
                <div
                  ref={volBarRef}
                  className="relative flex-1 w-2 rounded-full cursor-pointer"
                  style={{ background: "oklch(1 0 0 / 0.15)", maxHeight: "100%" }}
                  onClick={handleVolBarClick}
                  onTouchMove={handleVolBarTouch}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full"
                    style={{
                      height: state.isMuted ? "0%" : `${state.volume * 100}%`,
                      background: "linear-gradient(to top, #D4AF37, #7C3AED)",
                      transition: "height 0.1s linear",
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg"
                    style={{
                      bottom: `calc(${state.isMuted ? 0 : state.volume * 100}% - 8px)`,
                      transition: "bottom 0.1s linear",
                    }}
                  />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="mt-2 mb-1 text-white/60 hover:text-white transition-colors"
                >
                  {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>

              {/* Controls overlay — bottom of art (v1.4.0 baseline) */}
              <div
                className="absolute bottom-0 left-0 right-0 flex flex-col"
                style={{
                  background: "linear-gradient(to top, oklch(0 0 0 / 0.82) 0%, oklch(0 0 0 / 0.55) 60%, transparent 100%)",
                  paddingBottom: "12px",
                }}
              >
                {/* Progress bar */}
                <div className="px-4 pt-3 pb-1">
                  <div
                    className="w-full h-1 rounded-full bg-white/20 cursor-pointer relative group"
                    onClick={handleSeek}
                    onTouchMove={handleSeekTouch}
                  >
                    <div
                      className="h-full rounded-full relative"
                      style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #7C3AED, #D4AF37)",
                        transition: "width 0.25s linear",
                      }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white
                        opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-white/50 tabular-nums">{fmtTime(state.currentTime)}</span>
                    <span className="text-[10px] text-white/50 tabular-nums">{fmtTime(state.duration)}</span>
                  </div>
                </div>
                {/* Playback controls */}
                <div
                  className="px-4 flex items-center justify-between"
                  style={{ paddingRight: volBarActive ? "48px" : "16px", transition: "padding 0.2s" }}
                >
                  <button
                    onClick={toggleShuffle}
                    className={`p-1.5 transition-colors ${state.isShuffle ? "text-[#D4AF37]" : "text-white/40 hover:text-white/70"}`}
                  >
                    <Shuffle size={16} />
                  </button>
                  <button onClick={prevTrack} className="p-1.5 text-white/70 hover:text-white transition-colors">
                    <SkipBack size={22} />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg"
                    style={{ background: "oklch(0.94 0.006 280)", color: "oklch(0.08 0.01 280)" }}
                  >
                    {state.isPlaying
                      ? <Pause size={20} fill="currentColor" />
                      : <Play size={20} fill="currentColor" className="ml-0.5" />
                    }
                  </button>
                  <button onClick={nextTrack} className="p-1.5 text-white/70 hover:text-white transition-colors">
                    <SkipForward size={22} />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={`p-1.5 transition-colors ${state.isRepeat ? "text-[#D4AF37]" : "text-white/40 hover:text-white/70"}`}
                  >
                    <Repeat size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Content below art — hidden in Cinema Mode except lyrics ── */}
          {!cinemaMode && (
            <>
              {/* Track title + artist + Cinema Mode toggle + heart/like */}
              <div className="px-5 pb-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Title — clickable → song page */}
                  <button
                    onClick={() => { if (currentSongId) navigate(`/song/${currentSongId}`); }}
                    disabled={!currentSongId}
                    className="text-[15px] font-semibold font-body leading-snug line-clamp-2 text-left w-full
                      transition-colors hover:opacity-80 disabled:cursor-default"
                    style={{ color: "oklch(0.96 0.008 270)" }}
                  >
                    {currentTrack?.title || "No track selected"}
                  </button>
                  {/* Artist — clickable → creator page */}
                  <button
                    onClick={() => { if (songDetail?.creator?.id) navigate(`/creator/${songDetail.creator.id}`); }}
                    disabled={!songDetail?.creator?.id}
                    className="text-sm truncate font-body mt-0.5 text-left w-full
                      transition-colors hover:opacity-80 disabled:cursor-default"
                    style={{ color: "oklch(0.82 0.155 175)" }}
                  >
                    {currentTrack?.artist || "—"}
                  </button>
                  {/* WID badge + genre/AI tags — own row below artist */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {currentTrack?.witnessId && (
                      <button
                        onClick={() => navigate(`/verify/${currentTrack.witnessId}`)}
                        className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full
                          transition-opacity hover:opacity-80"
                        style={{
                          background: "oklch(0.80 0.145 82 / 0.12)",
                          color: "oklch(0.80 0.145 82)",
                          border: "1px solid oklch(0.80 0.145 82 / 0.3)",
                        }}
                        title="View Witness Certificate"
                      >
                        🔐 WID: {currentTrack.witnessId.slice(0, 12)}…
                      </button>
                    )}
                    {currentTrack?.genre && (
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "oklch(0.16 0.02 280)",
                          color: "oklch(0.55 0.04 280)",
                          border: "1px solid oklch(0.22 0.02 280)",
                        }}
                      >
                        {currentTrack.genre}
                      </span>
                    )}
                    {currentTrack?.aiDisclosure && currentTrack.aiDisclosure !== "original" && (
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          background: currentTrack.aiDisclosure === "ai_generated"
                            ? "oklch(0.55 0.18 25 / 0.2)"
                            : "oklch(0.60 0.18 55 / 0.2)",
                          color: currentTrack.aiDisclosure === "ai_generated"
                            ? "oklch(0.80 0.18 25)"
                            : "oklch(0.85 0.18 55)",
                          border: `1px solid ${currentTrack.aiDisclosure === "ai_generated"
                            ? "oklch(0.55 0.18 25 / 0.4)"
                            : "oklch(0.60 0.18 55 / 0.4)"}`,
                        }}
                      >
                        {currentTrack.aiDisclosure === "ai_generated" ? "AI-Generated" : "AI-Assisted"}
                      </span>
                    )}
                  </div>
                </div>
                {/* Heart/like — leftmost of the two icon buttons */}
                <button
                  onClick={handleToggleLike}
                  disabled={!user || toggleLikeMutation.isPending}
                  className={`p-2 flex-shrink-0 transition-colors ${isLiked ? "text-[#A78BFA]" : "text-white/25 hover:text-white/60"} disabled:opacity-40`}
                  title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
                >
                  <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {/* Cinema Mode toggle — sits directly next to the heart button */}
                <button
                  onClick={() => setCinemaMode(v => !v)}
                  className="p-2 flex-shrink-0 rounded-lg transition-all"
                  style={{
                    color: cinemaMode ? "oklch(0.84 0.155 85)" : "oklch(0.38 0.03 280)",
                    background: cinemaMode ? "oklch(0.84 0.155 85 / 0.15)" : "transparent",
                    border: cinemaMode ? "1px solid oklch(0.84 0.155 85 / 0.35)" : "1px solid transparent",
                  }}
                  title={cinemaMode ? "Exit Cinema Mode" : "Cinema Mode — art + lyrics only"}
                >
                  {cinemaMode ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Tip button */}
              {currentTrack && (
                <div className="px-5 pb-3">
                  <button
                    onClick={() => setTipOpen(true)}
                    disabled={!tipsEnabled}
                    className="w-full py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all
                      flex items-center justify-center gap-2
                      disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: tipsEnabled ? "oklch(0.84 0.155 85)" : "oklch(0.18 0.02 275)",
                      color: tipsEnabled ? "oklch(0.08 0.01 280)" : "oklch(0.45 0.03 280)",
                      border: tipsEnabled ? "none" : "1px solid oklch(0.24 0.02 275)",
                      fontFamily: "'Cinzel', serif",
                    }}
                    title={tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips not enabled yet"}
                  >
                    <DollarSign size={14} />
                    {tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips not enabled yet"}
                  </button>
                </div>
              )}

              {/* Action buttons — Playlist + Room + Share */}
              {currentTrack && currentSongId && (
                <div className="px-5 pb-3 flex items-center gap-2">
                  <AddToPlaylistButton songId={currentSongId} variant="full" className="flex-1" />
                  <button
                    onClick={() => { closeNowPlayingPanel(); navigate("/together"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all
                      bg-white/[0.06] text-white/70 border border-white/[0.12] hover:bg-white/[0.10] hover:text-white flex-1 justify-center"
                    title="Take to Sanctuary room"
                  >
                    <Users size={13} />
                    Room
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all border justify-center"
                    style={{
                      background: copied ? "oklch(0.84 0.155 85 / 0.12)" : "oklch(0.12 0.02 275 / 0.0)",
                      color: copied ? "oklch(0.84 0.155 85)" : "oklch(0.65 0.03 280)",
                      border: copied
                        ? "1px solid oklch(0.84 0.155 85 / 0.35)"
                        : "1px solid oklch(0.22 0.02 275)",
                      minWidth: "60px",
                    }}
                    title="Share this track"
                  >
                    {copied ? <Check size={13} /> : <Share2 size={13} />}
                    {copied ? "Copied!" : "Share"}
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="mx-5 mb-1" style={{ height: "1px", background: "oklch(0.84 0.155 85 / 0.10)" }} />
            </>
          )}
        </div>

        {/* ══ SCROLLABLE SECTION — volume + lyrics + grab handle ══ */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.22 0.02 275) transparent" }}
        >
          {/* Volume row — hidden in Cinema Mode */}
          {!cinemaMode && (
            <div className="px-5 pt-3 pb-2 flex items-center gap-3">
              <button
                onClick={() => setVolBarActive(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all ${
                  volBarActive
                    ? "text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/08"
                    : "text-white/35 hover:text-white/65 border border-white/10"
                }`}
                style={{ background: volBarActive ? "oklch(0.84 0.155 85 / 0.08)" : "transparent" }}
                title={volBarActive ? "Hide volume bar" : "Show volume bar on art"}
              >
                {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{state.isMuted ? "Muted" : `${Math.round(state.volume * 100)}%`}</span>
              </button>
              <button
                onClick={toggleMute}
                className="ml-auto text-[10px] font-body px-2.5 py-1.5 rounded-lg transition-all"
                style={{
                  color: state.isMuted ? "oklch(0.84 0.155 85)" : "oklch(0.45 0.03 280)",
                  background: state.isMuted ? "oklch(0.84 0.155 85 / 0.1)" : "transparent",
                  border: `1px solid ${state.isMuted ? "oklch(0.84 0.155 85 / 0.3)" : "oklch(0.22 0.02 275)"}`,
                }}
              >
                {state.isMuted ? "Unmute" : "Mute"}
              </button>
            </div>
          )}

          {/* Lyrics / Comments tabs */}
          <div className="px-0 pb-6 pt-0">
            {/* Tab bar */}
            <div
              className="flex mx-5 mb-4"
              style={{ borderBottom: "1px solid oklch(0.22 0.04 270 / 60%)" }}
            >
              {(["lyrics", "comments"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setCinemaTab(tab)}
                  className="flex-1 py-2 text-[12px] font-medium capitalize transition-colors flex items-center justify-center gap-1.5"
                  style={{
                    color: cinemaTab === tab ? "oklch(0.80 0.145 82)" : "oklch(0.45 0.02 280)",
                    borderBottom: cinemaTab === tab ? "2px solid oklch(0.80 0.145 82)" : "2px solid transparent",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {tab === "lyrics" ? <Music size={11} /> : <MessageCircle size={11} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Lyrics panel */}
            {cinemaTab === "lyrics" && (
              <div className="px-5">
                {songDetail?.song?.lyricsText ? (
                  <pre
                    className="whitespace-pre-wrap"
                    style={{
                      fontFamily: "'Inter', Georgia, serif",
                      fontSize: "15px",
                      lineHeight: "2.1",
                      color: "oklch(0.90 0.02 280)",
                      letterSpacing: "0.015em",
                      paddingBottom: "2rem",
                    }}
                  >
                    {songDetail.song.lyricsText}
                  </pre>
                ) : (
                  <div
                    className="rounded-xl p-8 text-center mt-2"
                    style={{
                      background: "oklch(0.10 0.02 275)",
                      border: "1px dashed oklch(0.22 0.02 275)",
                    }}
                  >
                    <Music size={28} className="mx-auto mb-3 opacity-20" style={{ color: "oklch(0.80 0.145 82)" }} />
                    <p className="text-[14px] italic mb-2" style={{ color: "oklch(0.50 0.02 280)" }}>
                      No lyrics registered
                    </p>
                    <p className="text-[12px]" style={{ color: "oklch(0.84 0.155 85)" }}>
                      Upload lyrics to protect your words.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comments panel */}
            {cinemaTab === "comments" && (
              <div className="px-5">
                {/* Comment list */}
                <div className="space-y-3 mb-4">
                  {commentsData && commentsData.length > 0 ? (
                    commentsData.map((c: any) => (
                      <div key={c.id} className="flex gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                          style={{ background: "oklch(0.22 0.08 270)", color: "oklch(0.80 0.145 82)" }}
                        >
                          {(c.authorName ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold" style={{ color: "oklch(0.82 0.155 175)" }}>
                              {c.authorName ?? "Anonymous"}
                            </span>
                            <span className="text-[10px]" style={{ color: "oklch(0.45 0.02 280)" }}>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed" style={{ color: "oklch(0.80 0.02 280)" }}>
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <MessageCircle size={24} className="mx-auto mb-2 opacity-20" style={{ color: "oklch(0.80 0.145 82)" }} />
                      <p className="text-[13px] italic" style={{ color: "oklch(0.45 0.02 280)" }}>
                        No comments yet. Be the first.
                      </p>
                    </div>
                  )}
                </div>
                {/* Comment input */}
                <div className="flex gap-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    placeholder={user ? "Leave a witness..." : "Sign in to comment"}
                    disabled={!user || addCommentMutation.isPending}
                    maxLength={1000}
                    className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none transition-colors disabled:opacity-50"
                    style={{
                      background: "oklch(0.12 0.04 270)",
                      border: "1px solid oklch(0.22 0.04 270)",
                      color: "oklch(0.88 0.02 280)",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.80 0.145 82 / 0.5)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "oklch(0.22 0.04 270)")}
                  />
                  <button
                    onClick={submitComment}
                    disabled={!user || !newComment.trim() || addCommentMutation.isPending}
                    className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40"
                    style={{ background: "oklch(0.80 0.145 82)", color: "oklch(0.08 0.01 280)" }}
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Grab handle — swipe down to close, swipe up to expand ── */}
          <div
            className="flex flex-col items-center pb-6 pt-3 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={onGrabTouchStart}
            onTouchEnd={onGrabTouchEnd}
            title="Swipe down to close"
          >
            <div
              className="rounded-full"
              style={{
                width: "48px",
                height: "5px",
                background: "oklch(0.28 0.02 275)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes mobileWave {
          from { height: 3px; }
          to   { height: 10px; }
        }
        @keyframes panelArtFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Tip Modal */}
      {tipOpen && currentSongId && (
        <PlayerTipModal
          songId={currentSongId}
          artistName={currentTrack?.artist || "this creator"}
          stripeAccountId={creatorStripeAccountId}
          onClose={() => setTipOpen(false)}
        />
      )}
    </>
  );
}
