/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobilePlayerPanel  (v2 — full-bleed cinematic)
   Cover art fills the top half of the panel. A dark gradient sweeps
   down into the lyrics/info area below. WID badge, Tip button, and
   playback controls are all part of the single immersive view.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, X,
  Music, DollarSign, Users, Video, ImageIcon,
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

  // Touch-swipe to close (swipe right ≥ 60px)
  const touchStartX = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );
  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;

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

  // Swipe-right-to-close
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 60) closeNowPlayingPanel();
    touchStartX.current = null;
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeNowPlayingPanel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Video/art toggle
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = (songDetail?.song as any)?.videoUrl as string | null | undefined;

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (state.isPlaying && showVideo) {
      vid.currentTime = state.currentTime;
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [state.isPlaying, showVideo, videoUrl]);

  useEffect(() => { setShowVideo(false); }, [currentTrack?.id]);

  // Volume bar
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

  // ── Art background URL ──────────────────────────────────────────────
  const artBg = currentTrack?.artUrl && currentTrack.artType !== "video"
    ? `url(${currentTrack.artUrl})`
    : null;

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
        <div
          className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: currentTrack?.bg || "oklch(0.18 0.04 275)" }}
        >
          {currentTrack?.artUrl && currentTrack.artType !== "video" ? (
            <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music className="w-4 h-4 opacity-40 text-white" />
          )}
        </div>
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
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeNowPlayingPanel}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          SIDE PANEL — full-bleed cinematic layout
      ══════════════════════════════════════════════════════════════ */}
      <div
        ref={panelRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="md:hidden fixed top-0 right-0 h-full z-50 flex flex-col
          transition-transform duration-300 ease-in-out overflow-hidden"
        style={{
          width: "min(340px, 92vw)",
          background: "oklch(0.08 0.018 275)",
          borderLeft: "1px solid oklch(0.18 0.02 275)",
          boxShadow: "-8px 0 48px oklch(0 0 0 / 0.8)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* ══ FULL-BLEED ART HERO — top ~48% of the panel ══ */}
        <div
          className="relative flex-shrink-0"
          style={{ height: "48%", minHeight: "220px", maxHeight: "340px" }}
        >
          {/* Background art */}
          {videoUrl && showVideo ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              loop
              muted={state.isMuted}
            />
          ) : artBg ? (
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                backgroundImage: artBg,
                backgroundSize: "cover",
                backgroundPosition: "center",
                animation: "panelArtFadeIn 0.5s ease",
              }}
            />
          ) : (
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{ background: currentTrack?.bg || "oklch(0.14 0.04 275)" }}
            >
              <Music className="w-16 h-16 opacity-20 text-white" />
            </div>
          )}

          {/* Dark gradient — fades art into the content below */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, oklch(0 0 0 / 0.35) 0%, oklch(0 0 0 / 0.10) 30%, oklch(0 0 0 / 0.55) 70%, oklch(0.08 0.018 275 / 1) 100%)",
            }}
          />

          {/* Header row — NOW PLAYING label + close */}
          <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-4 pt-4 z-20">
            <div>
              <span
                className="text-[9px] font-bold tracking-widest uppercase block"
                style={{ color: "oklch(0.84 0.155 85 / 0.85)", fontFamily: "'Cinzel', serif" }}
              >
                Now Playing
              </span>
              <span
                className="text-[8px] tracking-wider"
                style={{ color: "oklch(0.65 0.03 280 / 0.7)", fontFamily: "'Cinzel', serif" }}
              >
                {queueContextLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Video/Art toggle */}
              {videoUrl && (
                <button
                  onClick={() => setShowVideo(v => !v)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold tracking-wide transition-all"
                  style={{
                    background: showVideo ? "oklch(0.84 0.155 85 / 0.9)" : "oklch(0 0 0 / 0.45)",
                    color: showVideo ? "oklch(0.08 0.01 280)" : "oklch(0.9 0.02 85)",
                    border: showVideo ? "none" : "1px solid oklch(0.84 0.155 85 / 0.4)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {showVideo ? <ImageIcon size={10} /> : <Video size={10} />}
                  {showVideo ? "Art" : "Video"}
                </button>
              )}
              <button
                onClick={closeNowPlayingPanel}
                className="p-1.5 rounded-full transition-all"
                style={{ background: "oklch(0 0 0 / 0.40)", backdropFilter: "blur(6px)", color: "oklch(0.85 0.02 280)" }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Vertical volume bar — right edge of art */}
          <div
            className="absolute top-10 right-3 bottom-20 flex flex-col items-center justify-end z-20"
            style={{
              width: "28px",
              transition: "opacity 0.2s",
              opacity: volBarActive ? 1 : 0,
              pointerEvents: volBarActive ? "auto" : "none",
            }}
          >
            <div
              ref={volBarRef}
              className="relative flex-1 w-1.5 rounded-full cursor-pointer"
              style={{ background: "oklch(1 0 0 / 0.18)", maxHeight: "100%" }}
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
                className="absolute left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg"
                style={{
                  bottom: `calc(${state.isMuted ? 0 : state.volume * 100}% - 7px)`,
                  transition: "bottom 0.1s linear",
                }}
              />
            </div>
          </div>

          {/* Track title + artist + like — bottom of art hero */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-20">
            <div className="flex items-end justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[17px] font-bold leading-snug line-clamp-2 text-white"
                  style={{ fontFamily: "'Cinzel', serif", textShadow: "0 1px 8px oklch(0 0 0 / 0.8)" }}
                >
                  {currentTrack?.title || "No track selected"}
                </p>
                <p
                  className="text-[12px] mt-0.5 truncate"
                  style={{ color: "oklch(0.84 0.155 85)", textShadow: "0 1px 6px oklch(0 0 0 / 0.7)" }}
                >
                  {currentTrack?.artist || "—"}
                </p>
              </div>
              <button
                onClick={handleToggleLike}
                disabled={!user || toggleLikeMutation.isPending}
                className={`p-2 flex-shrink-0 transition-colors ${isLiked ? "text-[#A78BFA]" : "text-white/30 hover:text-white/70"} disabled:opacity-40`}
                title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
              >
                <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>

        {/* ══ SCROLLABLE CONTENT — WID, badges, progress, controls, tip, actions, lyrics ══ */}
        <div
          className="flex-1 overflow-y-auto flex flex-col"
          style={{ scrollbarWidth: "none" }}
        >
          {/* WID + genre badges — own clearly-spaced row */}
          <div className="px-4 pt-4 pb-3 flex flex-wrap gap-1.5">
            {currentTrack?.witnessId && (
              <span
                className="text-[9px] font-mono px-2 py-1 rounded-full"
                style={{ background: "oklch(0.84 0.155 85 / 0.12)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}
              >
                🔐 WID: {currentTrack.witnessId.slice(0, 12)}…
              </span>
            )}
            {currentTrack?.genre && (
              <span
                className="text-[9px] font-mono px-2 py-1 rounded-full"
                style={{ background: "oklch(0.16 0.02 280)", color: "oklch(0.55 0.04 280)", border: "1px solid oklch(0.22 0.02 280)" }}
              >
                {currentTrack.genre}
              </span>
            )}
            {currentTrack?.aiDisclosure && currentTrack.aiDisclosure !== "original" && (
              <span
                className="text-[9px] font-mono px-2 py-1 rounded-full"
                style={{
                  background: currentTrack.aiDisclosure === "ai_generated" ? "oklch(0.55 0.18 25 / 0.2)" : "oklch(0.60 0.18 55 / 0.2)",
                  color: currentTrack.aiDisclosure === "ai_generated" ? "oklch(0.80 0.18 25)" : "oklch(0.85 0.18 55)",
                  border: `1px solid ${currentTrack.aiDisclosure === "ai_generated" ? "oklch(0.55 0.18 25 / 0.4)" : "oklch(0.60 0.18 55 / 0.4)"}`,
                }}
              >
                {currentTrack.aiDisclosure === "ai_generated" ? "AI-Generated" : "AI-Assisted"}
              </span>
            )}
          </div>

          {/* Progress bar — clearly separated from badges */}
          <div className="px-4 pb-2">
            <div
              className="w-full h-[3px] rounded-full bg-white/15 cursor-pointer relative group"
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
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white
                  opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
              </div>
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] tabular-nums" style={{ color: "oklch(0.45 0.03 280)" }}>{fmtTime(state.currentTime)}</span>
              <span className="text-[10px] tabular-nums" style={{ color: "oklch(0.45 0.03 280)" }}>{fmtTime(state.duration)}</span>
            </div>
          </div>

          {/* Playback controls — generous vertical padding */}
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={toggleShuffle}
              className={`p-2 transition-colors ${state.isShuffle ? "text-[#D4AF37]" : "text-white/35 hover:text-white/70"}`}
            >
              <Shuffle size={18} />
            </button>
            <button onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition-colors">
              <SkipBack size={26} />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-xl"
              style={{ background: "oklch(0.94 0.006 280)", color: "oklch(0.08 0.01 280)" }}
            >
              {state.isPlaying
                ? <Pause size={22} fill="currentColor" />
                : <Play size={22} fill="currentColor" className="ml-0.5" />
              }
            </button>
            <button onClick={nextTrack} className="p-2 text-white/70 hover:text-white transition-colors">
              <SkipForward size={26} />
            </button>
            <button
              onClick={toggleRepeat}
              className={`p-2 transition-colors ${state.isRepeat ? "text-[#D4AF37]" : "text-white/35 hover:text-white/70"}`}
            >
              <Repeat size={18} />
            </button>
          </div>

          {/* Volume row — inline pill: icon + % + mute toggle */}
          <div className="px-4 pb-4 flex items-center gap-2">
            <button
              onClick={() => setVolBarActive(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-body transition-all ${
                volBarActive
                  ? "text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30"
                  : "text-white/40 hover:text-white/65 border border-white/10"
              }`}
              title={volBarActive ? "Hide volume bar" : "Show volume bar"}
            >
              {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{state.isMuted ? "Muted" : `${Math.round(state.volume * 100)}%`}</span>
            </button>
            <button
              onClick={toggleMute}
              className="ml-auto text-[10px] font-body px-3 py-2 rounded-xl transition-all"
              style={{
                color: state.isMuted ? "oklch(0.84 0.155 85)" : "oklch(0.45 0.03 280)",
                background: state.isMuted ? "oklch(0.84 0.155 85 / 0.1)" : "oklch(0.12 0.02 275)",
                border: `1px solid ${state.isMuted ? "oklch(0.84 0.155 85 / 0.3)" : "oklch(0.20 0.02 275)"}`,
              }}
            >
              {state.isMuted ? "Unmute" : "Mute"}
            </button>
          </div>

          {/* Tip button */}
          {currentTrack && (
            <div className="px-4 pb-2">
              <button
                onClick={() => setTipOpen(true)}
                disabled={!tipsEnabled}
                className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all
                  flex items-center justify-center gap-2
                  disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: tipsEnabled ? "oklch(0.84 0.155 85)" : "oklch(0.14 0.02 275)",
                  color: tipsEnabled ? "oklch(0.08 0.01 280)" : "oklch(0.40 0.03 280)",
                  border: tipsEnabled ? "none" : "1px solid oklch(0.20 0.02 275)",
                  fontFamily: "'Cinzel', serif",
                }}
                title={tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips not enabled yet"}
              >
                <DollarSign size={15} />
                {tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips Not Enabled Yet"}
              </button>
            </div>
          )}

          {/* Action buttons: Add to Playlist + Take to Room */}
          {currentTrack && currentSongId && (
            <div className="px-4 pb-3 flex items-center gap-2">
              <AddToPlaylistButton songId={currentSongId} variant="full" className="flex-1" />
              <button
                onClick={() => { closeNowPlayingPanel(); navigate("/together"); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-body transition-all
                  border flex-1 justify-center"
                style={{
                  background: "oklch(0.12 0.02 275)",
                  color: "oklch(0.65 0.03 280)",
                  border: "1px solid oklch(0.20 0.02 275)",
                }}
              >
                <Users size={13} />
                Take to Room
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="mx-4 mb-3" style={{ height: "1px", background: "oklch(0.84 0.155 85 / 0.10)" }} />

          {/* ── LYRICS ── */}
          <div className="px-4 pb-10">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.84 0.155 85 / 0.7)", fontFamily: "'Cinzel', serif" }}
              >
                Lyrics
              </span>
              <div className="flex-1" style={{ height: "1px", background: "oklch(0.84 0.155 85 / 0.12)" }} />
            </div>
            {songDetail?.song?.lyricsText ? (
              <pre
                className="whitespace-pre-wrap"
                style={{
                  fontFamily: "'Inter', Georgia, serif",
                  fontSize: "15px",
                  lineHeight: "2",
                  color: "oklch(0.88 0.02 280)",
                  letterSpacing: "0.01em",
                }}
              >
                {songDetail.song.lyricsText}
              </pre>
            ) : (
              <div
                className="rounded-xl p-5 text-center"
                style={{ background: "oklch(0.10 0.02 275)", border: "1px dashed oklch(0.20 0.02 275)" }}
              >
                <p className="text-[13px] italic mb-1" style={{ color: "oklch(0.45 0.02 280)" }}>
                  No lyrics registered
                </p>
                <p className="text-[12px]" style={{ color: "oklch(0.84 0.155 85)" }}>
                  Upload lyrics to protect your words.
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] pb-4" style={{ color: "oklch(0.22 0.02 280)" }}>
            Swipe right to close
          </p>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes mobileWave {
          from { height: 3px; }
          to   { height: 10px; }
        }
        @keyframes panelArtFadeIn {
          from { opacity: 0; transform: scale(1.04); }
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
