/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobilePlayerPanel
   Mobile-only: floating right-edge tab + collapsible side panel.
   Desktop keeps the standard PlayerBar at the bottom.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, X,
  Music, DollarSign, Users,
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
  // Position stored as distance from top of viewport (px)
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

  // Background creator page routing — when queue auto-advances while panel is open,
  // navigate to the next creator's profile so closing the panel lands there
  const prevCreatorHandle = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    if (!backgroundCreatorHandle) return;
    if (backgroundCreatorHandle === prevCreatorHandle.current) return;
    prevCreatorHandle.current = backgroundCreatorHandle;
    // Only background-navigate if panel is already open (not on first open)
    if (prevCreatorHandle.current !== null) {
      navigate(`/creator/${backgroundCreatorHandle}`);
    }
  }, [backgroundCreatorHandle, open, navigate]);

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail (for tip status)
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );
  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;

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

  const handleVolumeClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  }, [setVolume]);

  const handleVolumeTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    setVolume(Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)));
  }, [setVolume]);

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

  // Art renderer
  const ArtContent = ({ size }: { size: string }) => (
    <div
      className={`${size} rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0`}
      style={{ background: currentTrack?.bg || "oklch(0.15 0.05 275)" }}
    >
      {currentTrack?.artUrl && currentTrack.artType !== "video" ? (
        <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
      ) : currentTrack?.artUrl && currentTrack.artType === "video" ? (
        <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
      ) : (
        <Music className="w-1/2 h-1/2 opacity-30 text-white" />
      )}
    </div>
  );

  return (
    <>
      {/* ── Floating tab (right edge, draggable) ── */}
      <button
        onClick={(e) => { if (!isDragging.current) togglePanel(); }}
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
        {/* Thumbnail or music note */}
        <div
          className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ background: currentTrack?.bg || "oklch(0.18 0.04 275)" }}
        >
          {currentTrack?.artUrl && currentTrack.artType !== "video" ? (
            <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
          ) : currentTrack?.artUrl && currentTrack.artType === "video" ? (
            <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
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

        {/* Chevron indicator */}
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

      {/* ── Side panel ── */}
      <div
        ref={panelRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
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
        {/* ══ FIXED TOP SECTION — art, title, artist, badges, tip ══ */}
        <div className="flex-shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex flex-col gap-0.5">
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
            </div>
            <button
              onClick={closeNowPlayingPanel}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Large art — crossfade handled via key-based remount */}
          <div className="px-5 pb-3">
            <div
              key={currentTrack?.id || "empty"}
              className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                background: currentTrack?.bg || "oklch(0.15 0.05 275)",
                animation: "panelArtFadeIn 0.4s ease",
              }}
            >
              {currentTrack?.artUrl && currentTrack.artType !== "video" ? (
                <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
              ) : currentTrack?.artUrl && currentTrack.artType === "video" ? (
                <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
              ) : (
                <Music className="w-1/2 h-1/2 opacity-30 text-white" />
              )}
            </div>
          </div>

          {/* Track info + like */}
          <div className="px-5 pb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-white/90 font-body leading-snug line-clamp-2">
                {currentTrack?.title || "No track selected"}
              </p>
              <p className="text-sm text-white/50 truncate font-body mt-0.5">
                {currentTrack?.artist || "—"}
              </p>
              {/* WID badge */}
              {currentTrack?.witnessId && (
                <span className="inline-block mt-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "oklch(0.84 0.155 85 / 0.12)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}>
                  🔐 WID: {currentTrack.witnessId.slice(0, 12)}…
                </span>
              )}
              {/* Genre + AI Disclosure badges */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentTrack?.genre && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{ background: "oklch(0.16 0.02 280)", color: "oklch(0.55 0.04 280)", border: "1px solid oklch(0.22 0.02 280)" }}>
                    {currentTrack.genre}
                  </span>
                )}
                {currentTrack?.aiDisclosure && currentTrack.aiDisclosure !== "original" && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background: currentTrack.aiDisclosure === "ai_generated" ? "oklch(0.55 0.18 25 / 0.2)" : "oklch(0.60 0.18 55 / 0.2)",
                      color: currentTrack.aiDisclosure === "ai_generated" ? "oklch(0.80 0.18 25)" : "oklch(0.85 0.18 55)",
                      border: `1px solid ${currentTrack.aiDisclosure === "ai_generated" ? "oklch(0.55 0.18 25 / 0.4)" : "oklch(0.60 0.18 55 / 0.4)"}`,
                    }}>
                    {currentTrack.aiDisclosure === "ai_generated" ? "AI-Generated" : "AI-Assisted"}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleToggleLike}
              disabled={!user || toggleLikeMutation.isPending}
              className={`p-2 flex-shrink-0 transition-colors ${isLiked ? "text-[#A78BFA]" : "text-white/25 hover:text-white/60"} disabled:opacity-40`}
              title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
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

          {/* Action buttons row: Add to Playlist + Take to Room */}
          {currentTrack && currentSongId && (
            <div className="px-5 pb-3 flex items-center gap-2">
              <AddToPlaylistButton songId={currentSongId} variant="full" className="flex-1" />
              <button
                onClick={() => { closeNowPlayingPanel(); navigate("/together"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body transition-all
                  bg-white/[0.06] text-white/70 border border-white/[0.12] hover:bg-white/[0.10] hover:text-white flex-1 justify-center"
                title="Take to Sanctuary room"
              >
                <Users size={13} />
                Take to Room
              </button>
            </div>
          )}

          {/* Gold divider */}
          <div className="mx-5 mb-1" style={{ height: "1px", background: "oklch(0.84 0.155 85 / 0.12)" }} />
        </div>

        {/* ══ SCROLLABLE BOTTOM SECTION — progress, controls, volume, lyrics ══ */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.22 0.02 275) transparent" }}
        >
          {/* Progress bar */}
          <div className="px-5 pt-4 pb-3">
            <div
              className="w-full h-1.5 rounded-full bg-white/10 cursor-pointer relative group"
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
              <span className="text-[11px] text-white/30 tabular-nums">{fmtTime(state.currentTime)}</span>
              <span className="text-[11px] text-white/30 tabular-nums">{fmtTime(state.duration)}</span>
            </div>
          </div>

          {/* Main controls */}
          <div className="px-5 pb-4 flex items-center justify-between">
            <button
              onClick={toggleShuffle}
              className={`p-2 transition-colors ${state.isShuffle ? "text-[#D4AF37]" : "text-white/30 hover:text-white/60"}`}
            >
              <Shuffle size={18} />
            </button>
            <button onClick={prevTrack} className="p-2 text-white/60 hover:text-white transition-colors">
              <SkipBack size={24} />
            </button>
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              style={{ background: "oklch(0.94 0.006 280)", color: "oklch(0.08 0.01 280)" }}
            >
              {state.isPlaying
                ? <Pause size={22} fill="currentColor" />
                : <Play size={22} fill="currentColor" className="ml-1" />
              }
            </button>
            <button onClick={nextTrack} className="p-2 text-white/60 hover:text-white transition-colors">
              <SkipForward size={24} />
            </button>
            <button
              onClick={toggleRepeat}
              className={`p-2 transition-colors ${state.isRepeat ? "text-[#D4AF37]" : "text-white/30 hover:text-white/60"}`}
            >
              <Repeat size={18} />
            </button>
          </div>

          {/* Volume */}
          <div className="px-5 pb-5 flex items-center gap-3">
            <button onClick={toggleMute} className="p-1 text-white/35 hover:text-white transition-colors flex-shrink-0">
              {state.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div
              className="flex-1 h-1.5 rounded-full bg-white/10 cursor-pointer relative group"
              onClick={handleVolumeClick}
              onTouchMove={handleVolumeTouch}
            >
              <div
                className="h-full rounded-full bg-white/40 group-hover:bg-[#D4AF37] transition-colors"
                style={{ width: state.isMuted ? "0%" : `${state.volume * 100}%` }}
              />
            </div>
          </div>

          {/* Lyrics section */}
          <div className="px-5 pb-8">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.40 0.03 280)", fontFamily: "'Cinzel', serif" }}
              >
                Lyrics
              </span>
              <div className="flex-1" style={{ height: "1px", background: "oklch(0.18 0.02 275)" }} />
            </div>
            {songDetail?.song?.lyricsText ? (
              <pre
                className="text-[13px] leading-7 whitespace-pre-wrap font-body"
                style={{ color: "oklch(0.72 0.03 280)", fontFamily: "'Inter', sans-serif" }}
              >
                {songDetail.song.lyricsText}
              </pre>
            ) : (
              <p
                className="text-[12px] italic text-center py-6"
                style={{ color: "oklch(0.35 0.02 280)" }}
              >
                No lyrics registered —{" "}
                <span style={{ color: "oklch(0.84 0.155 85)" }}>upload lyrics to protect your words.</span>
              </p>
            )}
          </div>

          {/* Swipe hint */}
          <p className="text-center text-[10px] pb-4" style={{ color: "oklch(0.25 0.02 280)" }}>
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
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* ── Tip Modal ── */}
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
