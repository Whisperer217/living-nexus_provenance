/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlayerBar (The Altar)
   v2.1 — Background video: cover art stays static until play,
   muted looping video fades in behind the music on play.
   Audio and video are completely separate streams.
═══════════════════════════════════════════════════════════════════ */

import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useFrequencyGlow } from "@/hooks/useFrequencyGlow";
import { useWaveformVisualizer } from "@/hooks/useWaveformVisualizer";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, DollarSign, Maximize2, Minimize2,
  ChevronDown, ChevronUp, MessageCircle, Share2, Download,
  MoreHorizontal, ExternalLink, ListPlus, List, Waves,
} from "lucide-react";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { useLocation } from "wouter";
import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import PlayerTipModal from "./PlayerTipModal";
import { MediaAsset } from "@/components/MediaAsset";

function fmtTime(s: number) {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const {
    state, audioRef, allTracks, togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute, setVolume, seek,
    openTheater,
  } = usePlayer();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [tipOpen, setTipOpen] = useState(false);
  const [addToListOpen, setAddToListOpen] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const commentListRef = useRef<HTMLDivElement>(null);
  // Context menu (Go-To / Share / Download / Add / List)
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // Playback speed toggle: 1x → 1.5x → 2x → 0.75x → 1x
  const [playbackRate, setPlaybackRate] = useState(1);
  const SPEED_CYCLE = [1, 1.5, 2, 0.75];

  // ── Frequency-reactive purple glow ──
  // OPT-IN: default false so AudioContext is never created before a user gesture.
  // A fresh session (no localStorage key) starts with glow OFF, preventing the
  // suspended-AudioContext silence bug on first page load.
  const [glowEnabled, setGlowEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("ln-player-glow") === "on"; } catch { return false; }
  });
  const toggleGlow = () => setGlowEnabled(v => {
    const next = !v;
    try { localStorage.setItem("ln-player-glow", next ? "on" : "off"); } catch {}
    return next;
  });
  const { glowShadow } = useFrequencyGlow(audioRef, glowEnabled, state.isPlaying);

  // ── Waveform canvas ──
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useWaveformVisualizer(audioRef, waveCanvasRef, glowEnabled, state.isPlaying);

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail for tip status, video
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );
  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;
  const videoUrl = (songDetail?.song as any)?.videoUrl as string | null | undefined;
  const videoWitnessId = (songDetail?.song as any)?.videoWitnessId as string | null | undefined;

  // Background video ref — always muted, synced to audio play state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Sync background video to audio play/pause state
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (state.isPlaying && isExpanded) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [state.isPlaying, isExpanded, videoUrl]);

  // Buffering event listeners — show video as soon as it can play (even when paused)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onReady = () => setVideoReady(true);
    const onError = () => setVideoReady(false);
    vid.addEventListener("canplay", onReady);
    vid.addEventListener("canplaythrough", onReady);
    vid.addEventListener("loadeddata", onReady);
    vid.addEventListener("error", onError);
    // If already ready (e.g. cached), fire immediately
    if (vid.readyState >= 2) setVideoReady(true);
    return () => {
      vid.removeEventListener("canplay", onReady);
      vid.removeEventListener("canplaythrough", onReady);
      vid.removeEventListener("loadeddata", onReady);
      vid.removeEventListener("error", onError);
    };
  }, [videoUrl]);

  // Reset video when track changes
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }
    setVideoReady(false);
  }, [currentTrack?.id]);

  // Show video as soon as it's loaded — even when paused (shows first frame)
  const showVideo = videoReady;

  // Comments (only fetched when expanded, polled every 15 s for live feel)
  const { data: commentsData, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: currentSongId! },
    { enabled: isExpanded && !!currentSongId && !isNaN(currentSongId), staleTime: 15_000, refetchInterval: 15_000 }
  );
  const addCommentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { refetchComments(); setNewComment(""); },
  });

  // Auto-scroll comment list to bottom when new comments arrive
  useEffect(() => {
    if (commentListRef.current) {
      commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
    }
  }, [commentsData]);

  // DB-backed like state
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId) }
  );
  const isLiked = !!likeStatusData?.liked;

  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => { refetchLikeStatus(); },
  });

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const dur = (audio && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : state.duration;
    if (!dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * dur);
  }, [audioRef, seek, state.duration]);

  // Cinematic inline mode
  const [isCinematic, setIsCinematic] = useState(false);

  // Vertical volume popup — rendered via fixed-position portal to escape any stacking context
  const [showVolume, setShowVolume] = useState(false);
  const [volumePopupPos, setVolumePopupPos] = useState<{ bottom: number; right: number } | null>(null);
  const volumeBtnRef = useRef<HTMLButtonElement>(null);
  const volumePopupRef = useRef<HTMLDivElement>(null);  // portal card ref for outside-click

  // Context menu — fixed-position portal
  const [contextMenuPos, setContextMenuPos] = useState<{ bottom: number; right: number } | null>(null);
  const contextMenuBtnRef = useRef<HTMLButtonElement>(null);
  const contextMenuPortalRef = useRef<HTMLDivElement>(null);

  function openVolumePopup() {
    if (showVolume) { setShowVolume(false); return; }
    const btn = volumeBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setVolumePopupPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right - 4 });
    setShowVolume(true);
  }

  function openContextMenu() {
    if (showContextMenu) { setShowContextMenu(false); return; }
    const btn = contextMenuBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setContextMenuPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right - 4 });
    setShowContextMenu(true);
  }

  useEffect(() => {
    if (!showVolume) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (volumePopupRef.current?.contains(target)) return;
      if (volumeBtnRef.current?.contains(target)) return;
      setShowVolume(false);
    };
    const timer = setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", handleClickOutside); };
  }, [showVolume]);

  // Navigate to song/creator pages
  const goToSong = useCallback(() => {
    if (currentSongId) navigate(`/song/${currentSongId}`);
  }, [currentSongId, navigate]);

  const goToCreator = useCallback(() => {
    if (songDetail?.creator?.id) navigate(`/creator/${songDetail.creator.id}`);
    else if (currentTrack?.artist) navigate(`/creator/${currentTrack.artist}`);
  }, [songDetail, currentTrack, navigate]);

  const goToVerify = useCallback(() => {
    if (currentTrack?.witnessId) navigate(`/verify/${currentTrack.witnessId}`);
  }, [currentTrack, navigate]);

  const submitComment = () => {
    if (!newComment.trim() || !currentSongId) return;
    addCommentMutation.mutate({
      songId: currentSongId,
      content: newComment.trim(),
      authorName: user?.artistHandle || user?.name || undefined,
    });
  };

  // Collapse expanded bar when track changes
  useEffect(() => {
    setIsExpanded(false);
    setIsCinematic(false);
  }, [currentTrack?.id]);

  // Sync playback rate to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioRef]);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;
    const handler = (e: MouseEvent) => {
      if (!contextMenuRef.current?.contains(e.target as Node)) setShowContextMenu(false);
    };
    const t = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [showContextMenu]);

  const cycleSpeed = useCallback(() => {
    setPlaybackRate(r => {
      const idx = SPEED_CYCLE.indexOf(r);
      return SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    });
  }, []);

  const mainPortal = createPortal(
    <div
      className="transition-all duration-500 ease-in-out hidden md:block"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: isCinematic ? "100dvh" : isExpanded ? "256px" : "68px",
        overflow: "visible",
        background: "#000000",
          borderTop: isCinematic ? "none" : "1px solid rgba(196,154,40,0.25)",
        boxShadow: isCinematic ? "none" : [
          "0 -4px 40px rgba(0,0,0,0.8)",
          "0 -4px 32px rgba(196,154,40,0.15)",
          "0 -1px 8px rgba(196,154,40,0.18)",
          glowShadow !== "none" ? glowShadow : "",
        ].filter(Boolean).join(", "),
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "16px",
        zIndex: isCinematic ? 9020 : isExpanded ? 9010 : 9001,
      }}
    >
      {/* ── Expand / Collapse tab — sits on top of bar, centered ── */}
      {currentTrack && (
        <button
          onClick={() => setIsExpanded(e => !e)}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 text-[11px] font-semibold transition-all duration-200 rounded-t-lg z-10"
          style={{
            top: "-26px",
            background: "#000000",
            borderTop: "1px solid rgba(196,154,40,0.25)",
            borderLeft: "1px solid rgba(196,154,40,0.25)",
            borderRight: "1px solid rgba(196,154,40,0.25)",
            borderBottom: "none",
            color: isExpanded ? "var(--ln-gold)" : "var(--ln-smoke)",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-gold)")}
          onMouseLeave={e => (e.currentTarget.style.color = isExpanded ? "var(--ln-gold)" : "var(--ln-smoke)")}
          title={isExpanded ? "Collapse player" : "Expand player"}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          {isExpanded ? "collapse" : "expand player"}
          {!isExpanded && commentsData && commentsData.length > 0 && (
            <span
              className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none"
              style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
            >
              {commentsData.length} {commentsData.length === 1 ? "witness" : "witnesses"}
            </span>
          )}
        </button>
      )}

      {/* ══ INLINE CINEMATIC MODE (full-viewport) ══ */}
      {isCinematic && currentTrack && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {/* Full-bleed artwork / video */}
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
            videoRef={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark gradient at bottom for controls legibility */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)" }}
          />
          {/* Exit cinematic button — top right */}
          <button
            onClick={() => setIsCinematic(false)}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
            style={{
              background: "var(--ln-iron)",
              border: "1px solid rgba(63,74,80,0.6)",
              color: "var(--ln-gold)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Minimize2 size={12} /> Exit Cinematic
          </button>
          {/* Track info — top left */}
          <div className="absolute top-4 left-4 z-20">
            <div className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              {currentTrack.title}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--ln-seal-bright)" }}>
              {currentTrack.artist}
            </div>
            {currentTrack.witnessId && (
              <button
                onClick={goToVerify}
                className="text-[9px] font-mono mt-1 block transition-opacity hover:opacity-80"
                style={{ color: "rgba(196,154,40,0.6)" }}
              >
                WID: {currentTrack.witnessId.slice(0, 24)}…
              </button>
            )}
          </div>
          {/* Controls overlay — bottom center */}
          <div className="absolute bottom-8 left-0 right-0 z-20 flex flex-col items-center gap-4 px-8">
            {/* Progress bar */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[11px] tabular-nums w-8" style={{ color: "var(--ln-smoke)" }}>{fmtTime(state.currentTime)}</span>
              <div
                className="flex-1 h-1 rounded-full cursor-pointer group relative"
                style={{ background: "rgba(44,52,56,0.5)" }}
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #EF4444 0%, #6B6555 50%, #E8DFC8 100%)",
                    boxShadow: progress > 2 ? "0 0 8px 1px rgba(196,154,40,0.35)" : "none",
                  }}
                />
              </div>
              <span className="text-[11px] tabular-nums w-8" style={{ color: "var(--ln-smoke)" }}>{fmtTime(state.duration)}</span>
            </div>
            {/* Playback controls */}
            <div className="flex items-center gap-6">
              <button type="button" onClick={toggleShuffle} className={`p-2 transition-colors ${state.isShuffle ? "text-[#C49A28]" : "text-white/40 hover:text-white/80"}`}>
                <Shuffle size={18} />
              </button>
              <button type="button" onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition-colors">
                <SkipBack size={22} />
              </button>
              {/* Crystal Orb Play Button — desktop */}
              <button
                onClick={togglePlay}
                className="relative flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ width: "64px", height: "64px", background: "transparent", border: "none", padding: 0 }}
              >
                {state.isPlaying && (
                  <span className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 3px rgba(212,175,55,0.25), 0 0 24px rgba(212,175,55,0.45)", animation: "crystal-pulse 2.2s ease-in-out infinite", borderRadius: "50%" }} />
                )}
                <svg viewBox="0 0 64 64" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                  {[0,1,2,3,4,5,6,7].map(i => (
                    <path key={i}
                      d={`M 32 32 L ${32 + 30 * Math.cos((i * 45 - 22.5) * Math.PI / 180)} ${32 + 30 * Math.sin((i * 45 - 22.5) * Math.PI / 180)} A 30 30 0 0 1 ${32 + 30 * Math.cos(((i + 1) * 45 - 22.5) * Math.PI / 180)} ${32 + 30 * Math.sin(((i + 1) * 45 - 22.5) * Math.PI / 180)} Z`}
                      fill={i % 2 === 0 ? "rgba(212,175,55,0.72)" : "rgba(140,100,10,0.48)"}
                      stroke="rgba(245,230,179,0.35)" strokeWidth="0.5"
                    />
                  ))}
                  <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(212,175,55,0.55)" strokeWidth="1" />
                </svg>
                <span className="absolute rounded-full flex items-center justify-center"
                  style={{
                    width: "44px", height: "44px",
                    background: "radial-gradient(circle at 32% 28%, rgba(255,245,200,0.98) 0%, rgba(212,175,55,0.92) 42%, rgba(160,120,20,1) 80%, rgba(70,45,5,1) 100%)",
                    boxShadow: state.isPlaying
                      ? "0 0 16px rgba(212,175,55,0.8), 0 0 32px rgba(212,175,55,0.35), inset 0 2px 0 rgba(255,255,255,0.3)"
                      : "0 0 10px rgba(212,175,55,0.5), inset 0 2px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  <span className="absolute rounded-full" style={{ width: "14px", height: "8px", top: "8px", left: "11px", background: "rgba(255,255,255,0.35)", filter: "blur(2px)", transform: "rotate(-20deg)" }} />
                  {state.isPlaying
                    ? <Pause size={18} fill="#1a0e00" style={{ color: "#1a0e00", position: "relative", zIndex: 1 }} />
                    : <Play size={18} fill="#1a0e00" style={{ color: "#1a0e00", position: "relative", zIndex: 1, marginLeft: "2px" }} />
                  }
                </span>
              </button>
              <button type="button" onClick={nextTrack} className="p-2 text-white/70 hover:text-white transition-colors">
                <SkipForward size={22} />
              </button>
              <button type="button" onClick={toggleRepeat} className={`p-2 transition-colors ${state.isRepeat ? "text-[#C49A28]" : "text-white/40 hover:text-white/80"}`}>
                <Repeat size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EXPANDED CINEMATIC VIEW ══ */}
      {isExpanded && currentTrack && (
        <div className="flex h-full overflow-hidden">

          {/* LEFT — Art / Video (256px wide) — MRS player mode */}
          <div className="w-64 h-full flex-shrink-0 relative overflow-hidden">
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
              videoRef={videoRef}
              className="absolute inset-0 w-full h-full"
            />
            {/* Video WID badge — top-right, links to verify page */}
            {videoWitnessId && (
              <button
                onClick={() => navigate(`/verify/${videoWitnessId}`)}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold tracking-wide transition-all z-20"
                style={{
                  background: "rgba(44,52,56,0.88)",
                  border: "1px solid rgba(74,222,128,0.5)",
                  color: "var(--ln-seal-bright)",
                  backdropFilter: "blur(4px)",
                }}
                title="Video cryptographically witnessed — click to verify"
              >
                ✓ Video WID
              </button>
            )}
            {/* Gold gradient fade to center */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{ background: "linear-gradient(to right, transparent 60%, #000000)" }}
            />
          </div>

          {/* CENTER — Track info + controls */}
          <div className="flex-1 flex flex-col justify-between px-5 py-3 min-w-0 overflow-hidden">
            {/* Track info */}
            <div>
              <button
                onClick={goToSong}
                disabled={!currentSongId}
                className="text-lg font-bold truncate block w-full text-left transition-colors hover:text-[#C49A28] disabled:cursor-default mb-0.5"
                style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif" }}
              >
                {currentTrack.title}
              </button>
              <button
                onClick={goToCreator}
                disabled={!currentTrack}
                className="text-sm truncate block w-full text-left transition-opacity hover:opacity-80 disabled:cursor-default mb-1"
                style={{ color: "var(--ln-seal-bright)" }}
              >
                {currentTrack.artist || "—"}
              </button>
              {currentTrack.witnessId && (
                <button
                  onClick={goToVerify}
                  className="text-[9px] font-mono truncate block text-left transition-opacity hover:opacity-80 mb-2"
                  style={{ color: "rgba(196,154,40,0.5)" }}
                  title="View Witness Certificate"
                >
                  WID: {currentTrack.witnessId.slice(0, 22)}…
                </button>
              )}
              {/* Like + Tip */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (user && currentSongId && !isNaN(currentSongId)) toggleLikeMutation.mutate({ songId: currentSongId }); }}
                  disabled={!user || toggleLikeMutation.isPending}
                  className={`p-1.5 transition-colors ${isLiked ? "text-[#4ADE80]" : "text-white/25 hover:text-white/60"} disabled:opacity-40`}
                  title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
                >
                  <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {tipsEnabled && (
                  <button
                    onClick={() => setTipOpen(true)}
                    className="p-1.5 transition-colors text-[#C49A28] hover:text-[#E8DFC8]"
                    title={`Tip ${currentTrack.artist}`}
                  >
                    <DollarSign size={15} />
                  </button>
                )}
                {currentSongId && (
                  <button
                    onClick={e => { setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setAddToListOpen(true); }}
                    className="p-1.5 transition-colors text-white/50 hover:text-[#C49A28]"
                    title="Add to My List"
                  >
                    <ListPlus size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: "var(--ln-smoke)" }}>
                {fmtTime(state.currentTime)}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                style={{ background: "rgba(44,52,56,0.7)" }}
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full relative transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #EF4444 0%, #6B6555 50%, #E8DFC8 100%)",
                    boxShadow: progress > 2 ? "0 0 8px 1px rgba(196,154,40,0.35)" : "none",
                  }}
                >
                  {state.isPlaying && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full progress-playhead"
                      style={{ background: "var(--ln-parchment)", boxShadow: "0 0 8px 3px rgba(196,154,40,0.7)" }}
                    />
                  )}
                </div>
              </div>
              <span className="text-[11px] w-8 tabular-nums" style={{ color: "var(--ln-smoke)" }}>
                {fmtTime(state.duration)}
              </span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={toggleShuffle} className={`p-1.5 transition-colors ${state.isShuffle ? "text-[#C49A28]" : "text-white/30 hover:text-white/70"}`}>
                  <Shuffle size={14} />
                </button>
                <button type="button" onClick={prevTrack} className="p-1.5 transition-colors" style={{ color: "var(--ln-smoke)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-smoke)")}>
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                  style={{ background: "var(--ln-parchment)", color: "var(--ln-coal)" }}
                >
                  {state.isPlaying
                    ? <Pause size={17} fill="currentColor" />
                    : <Play size={17} fill="currentColor" className="ml-0.5" />
                  }
                </button>
                <button type="button" onClick={nextTrack} className="p-1.5 transition-colors" style={{ color: "var(--ln-smoke)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-smoke)")}>
                  <SkipForward size={18} />
                </button>
                <button type="button" onClick={toggleRepeat} className={`p-1.5 transition-colors ${state.isRepeat ? "text-[#C49A28]" : "text-white/30 hover:text-white/70"}`}>
                  <Repeat size={14} />
                </button>
              </div>
              {/* Volume + Theater */}
              <div className="flex items-center gap-2">
                {/* Vertical volume popup — trigger only; popup rendered via portal */}
                <button
                  ref={volumeBtnRef}
                  onClick={openVolumePopup}
                  className="p-1 transition-colors"
                  style={{ color: state.isMuted ? "var(--ln-iron)" : "var(--ln-smoke)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
                  onMouseLeave={e => (e.currentTarget.style.color = state.isMuted ? "var(--ln-iron)" : "var(--ln-smoke)")}
                  title="Volume"
                >
                  {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <button
                  onClick={openTheater}
                  className="p-1.5 transition-colors ml-1"
                  style={{ color: "var(--ln-smoke)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-gold)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-smoke)")}
                  title="Open Theater Player"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — Live comment feed (272px) */}
          <div
            className="w-72 flex flex-col flex-shrink-0 overflow-hidden"
            style={{ borderLeft: "1px solid rgba(196,154,40,0.15)" }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 flex items-center gap-2 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(196,154,40,0.15)" }}
            >
              <MessageCircle size={11} style={{ color: "var(--ln-gold)" }} />
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
              >
                Live Feed
              </span>
            </div>

            {/* Comment list — scrolls to bottom */}
            <div
              ref={commentListRef}
              className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#000000 transparent" }}
            >
              {commentsData && commentsData.length > 0 ? (
                commentsData.map((c: any) => (
                  <div key={c.id} className="flex gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                      style={{ background: "#1a1500", color: "var(--ln-gold)" }}
                    >
                      {(c.authorName ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold mr-1.5" style={{ color: "var(--ln-seal-bright)" }}>
                        {c.authorName ?? "Anonymous"}
                      </span>
                      <span className="text-[11px] leading-relaxed" style={{ color: "#EDE0C4" }}>
                        {c.content}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-4 opacity-40">
                  <MessageCircle size={20} style={{ color: "var(--ln-gold)" }} className="mb-1.5" />
                  <p className="text-[11px] italic" style={{ color: "var(--ln-smoke)" }}>
                    No witnesses yet.
                  </p>
                </div>
              )}
            </div>

            {/* Comment input */}
            <div
              className="p-2 flex gap-1.5 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(196,154,40,0.15)" }}
            >
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                placeholder="Leave a witness..."
                disabled={!user || addCommentMutation.isPending}
                maxLength={500}
                className="flex-1 rounded-md px-2.5 py-1.5 text-[11px] outline-none transition-colors disabled:opacity-50"
                style={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(196,154,40,0.2)",
                  color: "#EDE0C4",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(196,154,40,0.55)")}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(196,154,40,0.2)")}
              />
              <button
                onClick={submitComment}
                disabled={!user || !newComment.trim() || addCommentMutation.isPending}
                className="px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-colors disabled:opacity-40"
                style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPACT BAR (always visible, overlays bottom of expanded) ══ */}
      {!isExpanded && !isCinematic && (
        <div
          className="flex items-center gap-4"
          style={{ height: "68px", backgroundColor: "#000000", borderRadius: "0px", paddingRight: "5px", paddingLeft: "5px", marginRight: "5px", marginLeft: "10px", overflow: "visible", position: "relative" }}
        >
          {/* ── Track info (left) ── */}
          <div className="flex items-center gap-3 w-[240px] flex-shrink-0 min-w-0">
            {/* Art — 56px, clickable → song page */}
            <button
              onClick={goToSong}
              disabled={!currentSongId}
              className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl
                transition-opacity hover:opacity-80 disabled:cursor-default"
              style={{ background: currentTrack?.bg || "#000000" }}
              title={currentTrack?.title || ""}
            >
              {currentTrack?.artUrl && currentTrack.artType !== "video"
                ? <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%` }} />
                : currentTrack?.artUrl && currentTrack.artType === "video"
                ? <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
                : <span>{currentTrack?.emoji || "🎵"}</span>
              }
            </button>

            <div className="min-w-0 flex-1">
              {/* Title */}
              <button
                onClick={goToSong}
                disabled={!currentSongId}
                className="text-[13.5px] font-semibold truncate block w-full text-left
                  transition-colors hover:text-[#C49A28] disabled:cursor-default"
                style={{ color: "#F5EDD8", fontFamily: "'Cinzel', serif", letterSpacing: "0.03em" }}
              >
                {currentTrack?.title || "No track selected"}
              </button>
              {/* Artist */}
              <button
                onClick={goToCreator}
                disabled={!currentTrack}
                className="text-[11px] truncate block w-full text-left
                  transition-colors hover:opacity-80 disabled:cursor-default"
                style={{ color: "rgba(230,220,200,0.75)" }}
              >
                {currentTrack?.artist || "—"}
              </button>
              {/* WID badge */}
              {currentTrack?.witnessId && (
                <button
                  onClick={goToVerify}
                  className="text-[9px] font-mono truncate block text-left transition-opacity hover:opacity-80 mt-0.5"
                  style={{ color: "rgba(196,154,40,0.5)" }}
                  title="View Witness Certificate"
                >
                  {currentTrack.witnessId.slice(0, 18)}…
                </button>
              )}
            </div>

            {/* Heart */}
            <button
              onClick={() => { if (user && currentSongId && !isNaN(currentSongId)) toggleLikeMutation.mutate({ songId: currentSongId }); }}
              disabled={!user || toggleLikeMutation.isPending}
              className={`p-1 transition-colors flex-shrink-0 ${isLiked ? "text-[#4ADE80]" : "text-white/25 hover:text-white/60"} disabled:opacity-40`}
              title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
            >
              <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* ── Controls (center) ── */}
          <div className="flex-1 flex flex-col items-center gap-1.5" style={{ position: "relative" }}>
            {/* Waveform canvas — anchored to center column only */}
            <canvas
              ref={waveCanvasRef}
              width={1200}
              height={68}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                opacity: glowEnabled ? 1 : 0,
                transition: "opacity 0.4s ease",
                zIndex: 0,
              }}
            />
            <div className="flex items-center gap-4" style={{ marginTop: "6px" }}>
              <button
                onClick={toggleShuffle}
                className={`p-1.5 transition-colors ${state.isShuffle ? "text-[#B8860B]" : "hover:text-[#C49A28]"}`}
                style={{ color: state.isShuffle ? "var(--ln-gold-dim)" : "var(--ln-smoke)" }}
              >
                <Shuffle size={14} />
              </button>
              <button type="button" onClick={prevTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{ background: "var(--ln-parchment)", color: "var(--ln-coal)" }}
              >
                {state.isPlaying
                  ? <Pause size={17} fill="currentColor" />
                  : <Play size={17} fill="currentColor" className="ml-0.5" />
                }
              </button>
              <button type="button" onClick={nextTrack} className="p-1.5 transition-colors" style={{ color: "var(--ln-smoke)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-smoke)")}>
                <SkipForward size={18} />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-1.5 transition-colors ${state.isRepeat ? "text-[#B8860B]" : "hover:text-[#C49A28]"}`}
                style={{ color: state.isRepeat ? "var(--ln-gold-dim)" : "var(--ln-smoke)" }}
              >
                <Repeat size={14} />
              </button>
            </div>

            {/* Progress bar with animated gold playhead */}
            <div className="flex items-center gap-2 w-full max-w-[520px]">
              <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: "var(--ln-smoke)" }}>
                {fmtTime(state.currentTime)}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                style={{ background: "rgba(44,52,56,0.7)" }}
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full relative transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #EF4444 0%, #6B6555 50%, #E8DFC8 100%)",
                    boxShadow: progress > 2 ? "0 0 8px 1px rgba(196,154,40,0.35)" : "none",
                  }}
                >
                  {state.isPlaying && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full progress-playhead"
                      style={{ background: "var(--ln-parchment)", boxShadow: "0 0 8px 3px rgba(196,154,40,0.7)" }}
                    />
                  )}
                  {!state.isPlaying && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full
                        opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "var(--ln-parchment)" }}
                    />
                  )}
                </div>
              </div>
              <span className="text-[11px] w-8 tabular-nums" style={{ color: "var(--ln-smoke)" }}>
                {fmtTime(state.duration)}
              </span>
            </div>
          </div>

          {/* ── Right controls ── */}
          <div className="flex items-center gap-1.5 w-[240px] justify-end flex-shrink-0 overflow-visible">
            {/* Live wave */}
            {state.isPlaying && (
              <div className="live-wave">
                <span /><span /><span /><span /><span />
              </div>
            )}

            {/* Tip button */}
            {currentTrack && (
              <button
                onClick={() => setTipOpen(true)}
                disabled={!tipsEnabled}
                className={`p-1.5 transition-colors ${
                  tipsEnabled
                    ? "text-[#C49A28] hover:text-[#E8DFC8]"
                    : "text-white/15 cursor-not-allowed"
                }`}
                title={tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips not enabled yet"}
              >
                <DollarSign size={14} />
              </button>
            )}

            {/* Share */}
            {currentTrack && currentSongId && (
              <button
                onClick={async () => {
                  // Always use /song/:id — canonical shareable URL with server-side OG tags
                  const url = `${window.location.origin}/song/${currentSongId}`;
                  const shareData = {
                    title: currentTrack.title || "Track on Living Nexus",
                    text: `${currentTrack.title} by ${currentTrack.artist} — Listen on Living Nexus — sovereign music with cryptographic provenance.`,
                    url,
                  };
                  try {
                    if (navigator.share) { await navigator.share(shareData); return; }
                  } catch {}
                  try {
                    await navigator.clipboard.writeText(url);
                    // brief visual feedback via title attr — no toast dependency here
                  } catch {}
                }}
                className="p-1.5 transition-colors"
                style={{ color: "var(--ln-smoke)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-gold)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-smoke)")}
                title={`Share: ${currentTrack.title}`}
              >
                <Share2 size={14} />
              </button>
            )}

            {/* Download — permission-aware */}
            {currentTrack && currentSongId && (() => {
              const dlPerm = (songDetail?.song as any)?.downloadPermission as string | undefined;
              if (!dlPerm || dlPerm === "none") return null;
              const triggerDownload = () => {
                const a = document.createElement("a");
                a.href = `/api/download/${currentSongId}`;
                a.style.display = "none";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              };
              return (
                <button
                  onClick={triggerDownload}
                  className="p-1.5 transition-colors"
                  style={{ color: "var(--ln-smoke)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-gold)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-smoke)")}
                  title={dlPerm === "tipped" ? "Download (tip required)" : "Download track — WID travels with the file 🔐"}
                >
                  <Download size={14} />
                </button>
              );
            })()}

            {/* Add to My List */}
            {currentSongId && (
              <button
                onClick={e => { setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setAddToListOpen(true); }}
                className="p-1.5 transition-colors flex-shrink-0"
                style={{ color: "var(--ln-gold)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-gold)")}
                title="Add to My List"
              >
                <ListPlus size={15} />
              </button>
            )}


            {/* Volume — vertical popup (compact bar) — portal-based fixed positioning */}
            <button
              ref={volumeBtnRef}
              onClick={openVolumePopup}
              className="p-1 transition-colors"
              style={{ color: state.isMuted ? "var(--ln-iron)" : "var(--ln-smoke)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
              onMouseLeave={e => (e.currentTarget.style.color = state.isMuted ? "var(--ln-iron)" : "var(--ln-smoke)")}
              title="Volume"
            >
              {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Frequency glow toggle */}
            <button
              onClick={toggleGlow}
              className="p-1.5 transition-all ml-1 rounded"
              style={{
                color: glowEnabled ? "#C084FC" : "var(--ln-iron)",
                background: glowEnabled ? "rgba(192,132,252,0.08)" : "transparent",
                border: `1px solid ${glowEnabled ? "rgba(192,132,252,0.35)" : "rgba(44,52,56,0.4)"}`,
                boxShadow: glowEnabled && state.isPlaying ? "0 0 8px rgba(138,43,226,0.5)" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#C084FC")}
              onMouseLeave={e => (e.currentTarget.style.color = glowEnabled ? "#C084FC" : "var(--ln-iron)")}
              title={glowEnabled ? "Frequency glow: ON" : "Frequency glow: OFF"}
            >
              <Waves size={14} />
            </button>
            {/* Cinematic / Theater toggle */}
            <button
              onClick={() => { setIsCinematic(c => !c); setIsExpanded(false); }}
              className="p-1.5 transition-colors ml-1"
              style={{ color: isCinematic ? "var(--ln-gold)" : "var(--ln-smoke)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-gold)")}
              onMouseLeave={e => (e.currentTarget.style.color = isCinematic ? "var(--ln-gold)" : "var(--ln-smoke)")}
              title={isCinematic ? "Exit Cinematic View" : "Cinematic View"}
            >
              {isCinematic ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Speed toggle — x1 / x1.5 / x2 / x0.75 */}
            {currentTrack && (
              <button
                onClick={cycleSpeed}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ml-1"
                style={{
                  color: playbackRate !== 1 ? "var(--ln-gold)" : "var(--ln-iron)",
                  background: playbackRate !== 1 ? "rgba(196,154,40,0.08)" : "transparent",
                  border: `1px solid ${playbackRate !== 1 ? "rgba(196,154,40,0.3)" : "rgba(44,52,56,0.5)"}`,
                  minWidth: "30px",
                }}
                title="Cycle playback speed"
              >
                {playbackRate === 1 ? "1×" : playbackRate === 1.5 ? "1.5×" : playbackRate === 2 ? "2×" : "¾×"}
              </button>
            )}

            {/* Context menu — ⋯ kebab (Go-To / Share / Download / Add / List) */}
            {currentTrack && (
              <div className="relative ml-1">
                <button
                  ref={contextMenuBtnRef}
                  onClick={openContextMenu}
                  className="p-1.5 rounded transition-all"
                  style={{ color: showContextMenu ? "var(--ln-gold)" : "var(--ln-iron)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-gold)")}
                  onMouseLeave={e => (e.currentTarget.style.color = showContextMenu ? "var(--ln-gold)" : "var(--ln-iron)")}
                  title="More options"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tip Modal */}
      {tipOpen && currentSongId && (
        <PlayerTipModal
          songId={currentSongId}
          songTitle={currentTrack?.title}
          artistName={currentTrack?.artist || "this creator"}
          genre={currentTrack?.genre}
          witnessId={currentTrack?.witnessId}
          artUrl={currentTrack?.artUrl}
          artType={currentTrack?.artType}
          coverPositionX={currentTrack?.coverPositionX}
          coverPositionY={currentTrack?.coverPositionY}
          stripeAccountId={creatorStripeAccountId}
          onClose={() => setTipOpen(false)}
        />
      )}
      <AddToMyListModal
        open={!!(addToListOpen && currentSongId)}
        songId={currentSongId ?? 0}
        songTitle={currentTrack?.title ?? ""}
        onClose={() => setAddToListOpen(false)}
        originRect={addToListRect}
      />
    </div>,
    document.body
  );

  // ── Volume popup portal (fixed, escapes all stacking contexts) ──────────
  const volumePortal = showVolume && volumePopupPos ? createPortal(
    <div
      ref={volumePopupRef}
      style={{
        position: "fixed",
        bottom: volumePopupPos.bottom,
        right: volumePopupPos.right,
        zIndex: 99999,
        background: "var(--ln-coal)",
        border: "1px solid rgba(122,90,30,0.6)",
        borderRadius: "1rem",
        boxShadow: "0 0 24px 4px rgba(196,154,40,0.12), 0 8px 32px rgba(44,52,56,0.8)",
        padding: "12px 14px 10px",
        minWidth: "140px",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ln-gold)" }}>
          {state.isMuted ? "MUTED" : `${Math.round(state.volume * 100)}%`}
        </span>
        <button
          onClick={toggleMute}
          className="p-1 rounded-full transition-all"
          style={{
            color: state.isMuted ? "var(--ln-gold)" : "var(--ln-iron)",
            background: state.isMuted ? "rgba(196,154,40,0.08)" : "transparent",
          }}
          title={state.isMuted ? "Unmute" : "Mute"}
        >
          <VolumeX size={11} />
        </button>
      </div>
      <div className="flex items-center justify-center py-2">
        <input
          type="range"
          min="0" max="1" step="0.01"
          value={state.isMuted ? 0 : state.volume}
          onChange={e => { if (state.isMuted) toggleMute(); setVolume(parseFloat(e.target.value)); }}
          className="volume-slider-vertical"
          style={{
            background: `linear-gradient(to top, #E8DFC8 ${
              state.isMuted ? 0 : state.volume * 100
            }%, rgba(44,52,56,0.8) ${
              state.isMuted ? 0 : state.volume * 100
            }%)`,
          }}
        />
      </div>
    </div>,
    document.body
  ) : null;

  // ── Context menu portal (fixed, escapes all stacking contexts) ──────────
  const contextMenuPortal = showContextMenu && contextMenuPos ? createPortal(
    <div
      ref={contextMenuPortalRef}
      style={{
        position: "fixed",
        bottom: contextMenuPos.bottom,
        right: contextMenuPos.right,
        zIndex: 99999,
        background: "var(--ln-coal)",
        border: "1px solid rgba(122,90,30,0.55)",
        borderRadius: "1rem",
        boxShadow: "0 0 28px 4px rgba(196,154,40,0.12), 0 8px 32px rgba(44,52,56,0.85)",
        minWidth: "160px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => { setShowContextMenu(false); goToSong(); }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-body transition-colors hover:bg-white/5 text-left"
        style={{ color: "var(--ln-parchment)" }}
      >
        <ExternalLink size={13} style={{ color: "var(--ln-smoke)" }} />
        Go to Song
      </button>
      <button
        onClick={async () => {
          setShowContextMenu(false);
          const url = `${window.location.origin}/song/${currentSongId}`;
          try { if (navigator.share) { await navigator.share({ title: currentTrack!.title, url }); return; } } catch {}
          try { await navigator.clipboard.writeText(url); } catch {}
        }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-body transition-colors hover:bg-white/5 text-left"
        style={{ color: "var(--ln-parchment)" }}
      >
        <Share2 size={13} style={{ color: "var(--ln-smoke)" }} />
        Share Artifact
      </button>
      {(() => {
        const dlPerm = (songDetail?.song as any)?.downloadPermission as string | undefined;
        if (!dlPerm || dlPerm === "none") return null;
        return (
          <button
            onClick={() => {
              setShowContextMenu(false);
              const a = document.createElement("a");
              a.href = `/api/download/${currentSongId}`;
              a.style.display = "none";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-body transition-colors hover:bg-white/5 text-left"
            style={{ color: "var(--ln-parchment)" }}
          >
            <Download size={13} style={{ color: "var(--ln-smoke)" }} />
            Download
          </button>
        );
      })()}
      {currentSongId && (
        <button
          onClick={e => {
            setShowContextMenu(false);
            setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
            setAddToListOpen(true);
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-body transition-colors hover:bg-white/5 text-left"
          style={{ color: "var(--ln-parchment)" }}
        >
          <ListPlus size={13} style={{ color: "var(--ln-smoke)" }} />
          Add to List
        </button>
      )}
      <button
        onClick={() => { setShowContextMenu(false); navigate("/archive"); }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[12px] font-body transition-colors hover:bg-white/5 text-left border-t"
        style={{ color: "var(--ln-parchment)", borderColor: "rgba(44,52,56,0.5)" }}
      >
        <List size={13} style={{ color: "var(--ln-smoke)" }} />
        View Queue
      </button>
    </div>,
    document.body
  ) : null;

  // ── Outside-click for context menu portal ──────────────────────────────
  useEffect(() => {
    if (!showContextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (contextMenuPortalRef.current?.contains(target)) return;
      if (contextMenuBtnRef.current?.contains(target)) return;
      setShowContextMenu(false);
    };
    const timer = setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener("click", handleClickOutside); };
  }, [showContextMenu]);

  return <>{mainPortal}{volumePortal}{contextMenuPortal}</>;
}
