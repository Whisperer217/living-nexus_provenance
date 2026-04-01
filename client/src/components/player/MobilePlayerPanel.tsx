/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobilePlayerPanel v2.0 (Cinematic Mode)
   Structure:
   • Full-bleed artwork as background (dominant, immersive)
   • Right-side emotional action stack: Love ❤️ | Share 🔁 | Comment 💬
   • Functional row below controls: Gift | Details | Sound
   • WID badge always visible, directly under title
   • Details slide-up panel: WID, Creator, License, Provenance, Tags
   • Tap artwork to toggle UI visibility (true cinematic mode)
   • Floating heart pulse animation on Love tap
   • Gradient fade behind controls
   Divine Noir — Orbitron/Cinzel, gold/cyan palette
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX,
  Heart, X, Music, DollarSign, Users,
  Share2, ChevronDown, MessageCircle, Info,
  Check, Shield, Tag, FileText, User,
} from "lucide-react";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import PlayerTipModal from "./PlayerTipModal";

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

// Floating heart particle
function HeartParticle({ id, onDone }: { id: number; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(id), 900);
    return () => clearTimeout(t);
  }, [id, onDone]);
  const left = 30 + Math.random() * 40;
  return (
    <div
      className="absolute pointer-events-none select-none text-xl"
      style={{
        left: `${left}%`,
        bottom: "20%",
        animation: "heartFloat 0.9s ease-out forwards",
        zIndex: 60,
      }}
    >
      ❤️
    </div>
  );
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
  const [, navigate] = useLocation();

  const open = isNowPlayingPanelOpen;
  const togglePanel = () => isNowPlayingPanelOpen ? closeNowPlayingPanel() : openNowPlayingPanel();

  // UI visibility (cinematic tap-to-hide)
  const [uiVisible, setUiVisible] = useState(true);
  const uiHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Details panel
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Comment panel
  const [commentOpen, setCommentOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  // Tip modal
  const [tipOpen, setTipOpen] = useState(false);

  // Share copied
  const [copied, setCopied] = useState(false);

  // Heart particles
  const [hearts, setHearts] = useState<number[]>([]);
  const heartCounter = useRef(0);

  // Volume
  const [volOpen, setVolOpen] = useState(false);

  // Draggable floating tab
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

  // Grab-handle swipe
  const grabTouchStartY = useRef<number | null>(null);
  const onGrabTouchStart = (e: React.TouchEvent) => { grabTouchStartY.current = e.touches[0].clientY; };
  const onGrabTouchEnd = (e: React.TouchEvent) => {
    if (grabTouchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - grabTouchStartY.current;
    if (delta > 60) closeNowPlayingPanel();
    grabTouchStartY.current = null;
  };

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );
  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;
  const song = songDetail?.song as any;
  const creator = songDetail?.creator as any;

  // Comments
  const { data: commentsData, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: currentSongId! },
    { enabled: commentOpen && !!currentSongId && !isNaN(currentSongId), staleTime: 30_000 }
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

  // DB-backed like
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId) }
  );
  const isLiked = !!likeStatusData?.liked;
  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => refetchLikeStatus(),
  });

  const handleLove = useCallback(() => {
    if (!user || !currentSongId || isNaN(currentSongId)) return;
    toggleLikeMutation.mutate({ songId: currentSongId });
    // Spawn heart particle
    const id = heartCounter.current++;
    setHearts(h => [...h, id]);
  }, [user, currentSongId, toggleLikeMutation]);

  const removeHeart = useCallback((id: number) => {
    setHearts(h => h.filter(x => x !== id));
  }, []);

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  const handleSeekTouch = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.touches[0].clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    const url = currentSongId ? `${window.location.origin}/song/${currentSongId}` : window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: currentTrack.title || "", url }); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [currentTrack, currentSongId]);

  // Tap artwork to toggle UI
  const handleArtTap = useCallback(() => {
    if (detailsOpen || commentOpen) return;
    setUiVisible(v => !v);
  }, [detailsOpen, commentOpen]);

  // Auto-show UI after 4s of hiding
  useEffect(() => {
    if (!uiVisible) {
      uiHideTimer.current = setTimeout(() => setUiVisible(true), 4000);
    }
    return () => { if (uiHideTimer.current) clearTimeout(uiHideTimer.current); };
  }, [uiVisible]);

  // Reset on track change
  useEffect(() => {
    setUiVisible(true);
    setDetailsOpen(false);
    setCommentOpen(false);
  }, [currentTrack?.id]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeNowPlayingPanel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Background video
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = song?.videoUrl as string | null | undefined;
  const videoWitnessId = song?.videoWitnessId as string | null | undefined;
  const [videoBuffering, setVideoBuffering] = useState(true);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (state.isPlaying && open) vid.play().catch(() => {});
    else vid.pause();
  }, [state.isPlaying, open, videoUrl]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    const onWaiting  = () => setVideoBuffering(true);
    const onCanPlay  = () => setVideoBuffering(false);
    const onPlaying  = () => setVideoBuffering(false);
    const onError    = () => setVideoBuffering(false);
    vid.addEventListener("waiting",  onWaiting);
    vid.addEventListener("canplay",  onCanPlay);
    vid.addEventListener("playing",  onPlaying);
    vid.addEventListener("error",    onError);
    return () => {
      vid.removeEventListener("waiting",  onWaiting);
      vid.removeEventListener("canplay",  onCanPlay);
      vid.removeEventListener("playing",  onPlaying);
      vid.removeEventListener("error",    onError);
    };
  }, [videoUrl]);

  const showVideo = state.isPlaying && !videoBuffering && !!videoUrl;

  useEffect(() => {
    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }
    setVideoBuffering(true);
  }, [currentTrack?.id]);

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
            <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover"
              style={{ objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%` }} />
          ) : currentTrack?.artUrl && currentTrack.artType === "video" ? (
            <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
          ) : (
            <Music className="w-4 h-4 opacity-40 text-white" />
          )}
        </div>
        {state.isPlaying && (
          <div className="flex items-end gap-[2px] h-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-[3px] rounded-full"
                style={{ background: "#D4AF37", animation: `mobileWave 0.8s ease-in-out ${i * 0.15}s infinite alternate`, height: "6px" }} />
            ))}
          </div>
        )}
        <div className="text-white/30 transition-transform duration-300"
          style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", fontSize: "10px", lineHeight: 1 }}>
          ›
        </div>
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeNowPlayingPanel} />
      )}

      {/* ══════════════════════════════════════════════════════════════
          CINEMATIC PANEL — full-height, right-side drawer
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="md:hidden fixed top-0 right-0 h-full z-50 flex flex-col
          transition-transform duration-300 ease-in-out overflow-hidden"
        style={{
          width: "min(340px, 92vw)",
          background: "oklch(0.07 0.02 275)",
          borderLeft: "1px solid oklch(0.18 0.02 275)",
          boxShadow: "-8px 0 48px oklch(0 0 0 / 0.8)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* ══ ARTWORK SECTION — full-bleed, dominant ══ */}
        <div
          className="relative flex-shrink-0"
          style={{ height: "56vw", maxHeight: "280px", minHeight: "200px" }}
        >
          {/* Background video */}
          {videoUrl && (
            <video ref={videoRef} src={videoUrl}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: showVideo ? 1 : 0 }}
              playsInline loop muted preload="metadata" />
          )}
          {/* Cover art */}
          {currentTrack?.artUrl ? (
            <img src={currentTrack.artUrl} alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{
                opacity: showVideo ? 0 : 1,
                objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%`,
              }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: currentTrack?.bg || "oklch(0.14 0.04 275)" }}>
              <Music className="w-16 h-16 opacity-20 text-white" />
            </div>
          )}

          {/* Gradient fade — bottom of artwork into controls */}
          <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, oklch(0.07 0.02 275))" }} />

          {/* Tap zone — toggle UI visibility */}
          <div className="absolute inset-0 z-10 cursor-pointer" onClick={handleArtTap} />

          {/* Heart particles */}
          {hearts.map(id => <HeartParticle key={id} id={id} onDone={removeHeart} />)}

          {/* ── Header controls (always visible) ── */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4 z-20">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.84 0.155 85 / 0.6)", fontFamily: "'Cinzel', serif" }}>
                Now Playing
              </span>
              {queueContextLabel && (
                <span className="text-[8px] tracking-wider"
                  style={{ color: "oklch(0.84 0.155 85 / 0.35)", fontFamily: "'Cinzel', serif" }}>
                  {queueContextLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={closeNowPlayingPanel}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-all"
                style={{ background: "oklch(0 0 0 / 0.35)", backdropFilter: "blur(4px)" }}>
                <ChevronDown size={16} />
              </button>
              <button onClick={closeNowPlayingPanel}
                className="p-1.5 rounded-lg text-white/30 hover:text-white transition-all"
                style={{ background: "oklch(0 0 0 / 0.35)", backdropFilter: "blur(4px)" }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── RIGHT-SIDE EMOTIONAL ACTION STACK ── */}
          <div
            className="absolute right-3 bottom-16 flex flex-col items-center gap-4 z-20 transition-opacity duration-300"
            style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? "auto" : "none" }}
          >
            {/* Love ❤️ */}
            <button
              onClick={handleLove}
              disabled={!user}
              className="flex flex-col items-center gap-1 group"
              title={!user ? "Sign in to love" : isLiked ? "Loved" : "Love"}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: isLiked ? "oklch(0.65 0.22 10 / 0.25)" : "oklch(0 0 0 / 0.45)",
                  backdropFilter: "blur(8px)",
                  border: isLiked ? "1px solid oklch(0.65 0.22 10 / 0.5)" : "1px solid oklch(1 0 0 / 0.12)",
                  boxShadow: isLiked ? "0 0 12px oklch(0.65 0.22 10 / 0.3)" : "none",
                }}
              >
                <Heart size={18} fill={isLiked ? "oklch(0.75 0.22 10)" : "none"}
                  style={{ color: isLiked ? "oklch(0.75 0.22 10)" : "oklch(1 0 0 / 0.7)" }} />
              </div>
              <span className="text-[9px]" style={{ color: "oklch(1 0 0 / 0.45)" }}>Love</span>
            </button>

            {/* Share 🔁 */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1"
              title="Share"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: copied ? "oklch(0.84 0.155 85 / 0.2)" : "oklch(0 0 0 / 0.45)",
                  backdropFilter: "blur(8px)",
                  border: copied ? "1px solid oklch(0.84 0.155 85 / 0.4)" : "1px solid oklch(1 0 0 / 0.12)",
                }}
              >
                {copied
                  ? <Check size={18} style={{ color: "oklch(0.84 0.155 85)" }} />
                  : <Share2 size={18} style={{ color: "oklch(1 0 0 / 0.7)" }} />}
              </div>
              <span className="text-[9px]" style={{ color: "oklch(1 0 0 / 0.45)" }}>
                {copied ? "Copied!" : "Share"}
              </span>
            </button>

            {/* Comment 💬 */}
            <button
              onClick={() => { setCommentOpen(v => !v); setDetailsOpen(false); }}
              className="flex flex-col items-center gap-1"
              title="Comment"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: commentOpen ? "oklch(0.55 0.18 220 / 0.25)" : "oklch(0 0 0 / 0.45)",
                  backdropFilter: "blur(8px)",
                  border: commentOpen ? "1px solid oklch(0.55 0.18 220 / 0.4)" : "1px solid oklch(1 0 0 / 0.12)",
                }}
              >
                <MessageCircle size={18} style={{ color: commentOpen ? "oklch(0.72 0.18 220)" : "oklch(1 0 0 / 0.7)" }} />
              </div>
              <span className="text-[9px]" style={{ color: "oklch(1 0 0 / 0.45)" }}>
                {commentsData?.length ? commentsData.length : ""}Comment
              </span>
            </button>
          </div>

          {/* Video WID badge */}
          {videoWitnessId && (
            <button
              onClick={() => navigate(`/verify/${videoWitnessId}`)}
              className="absolute top-12 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold tracking-wide z-20"
              style={{
                background: "oklch(0.22 0.08 145 / 0.88)",
                border: "1px solid oklch(0.55 0.18 145 / 0.5)",
                color: "oklch(0.82 0.18 145)",
                backdropFilter: "blur(4px)",
              }}
            >
              ✓ Video WID
            </button>
          )}
        </div>

        {/* ══ TRACK INFO — title + WID badge ══ */}
        <div
          className="flex-shrink-0 px-5 pt-3 pb-2 transition-opacity duration-300"
          style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? "auto" : "none" }}
        >
          {/* Title */}
          <button
            onClick={() => { if (currentSongId) navigate(`/song/${currentSongId}`); }}
            disabled={!currentSongId}
            className="text-[16px] font-semibold leading-snug line-clamp-1 text-left w-full
              transition-opacity hover:opacity-75 disabled:cursor-default"
            style={{ color: "oklch(0.96 0.008 270)", fontFamily: "'Cinzel', serif" }}
          >
            {currentTrack?.title || "No track selected"}
          </button>
          {/* Artist */}
          <button
            onClick={() => { if (creator?.id) navigate(`/creator/${creator.id}`); }}
            disabled={!creator?.id}
            className="text-sm truncate mt-0.5 text-left w-full transition-opacity hover:opacity-75 disabled:cursor-default"
            style={{ color: "oklch(0.72 0.155 175)" }}
          >
            {currentTrack?.artist || "—"}
          </button>
          {/* WID badge — always visible, directly under title */}
          {currentTrack?.witnessId && (
            <button
              onClick={() => navigate(`/verify/${currentTrack.witnessId}`)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1 rounded-full
                transition-opacity hover:opacity-80"
              style={{
                background: "oklch(0.80 0.145 82 / 0.12)",
                color: "oklch(0.80 0.145 82)",
                border: "1px solid oklch(0.80 0.145 82 / 0.3)",
              }}
              title="View Witness Certificate"
            >
              <Shield size={10} />
              WID: {currentTrack.witnessId.slice(0, 14)}…
            </button>
          )}
        </div>

        {/* ══ PROGRESS BAR ══ */}
        <div
          className="flex-shrink-0 px-5 pb-2 transition-opacity duration-300"
          style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? "auto" : "none" }}
        >
          <div
            className="relative h-1 rounded-full cursor-pointer"
            style={{ background: "oklch(1 0 0 / 0.1)" }}
            onClick={handleSeek}
            onTouchMove={handleSeekTouch}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: "oklch(0.84 0.155 85)" }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: "oklch(0.45 0.03 280)" }}>
              {fmtTime(state.currentTime)}
            </span>
            <span className="text-[10px]" style={{ color: "oklch(0.45 0.03 280)" }}>
              {fmtTime(state.duration)}
            </span>
          </div>
        </div>

        {/* ══ PLAYER CONTROLS — clean, dominant play button ══ */}
        <div
          className="flex-shrink-0 px-5 pb-3 transition-opacity duration-300"
          style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? "auto" : "none" }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={toggleShuffle}
              className="p-2 transition-colors"
              style={{ color: state.isShuffle ? "oklch(0.84 0.155 85)" : "oklch(0.38 0.03 280)" }}
            >
              <Shuffle size={18} />
            </button>
            <button onClick={prevTrack} className="p-2" style={{ color: "oklch(0.75 0.03 280)" }}>
              <SkipBack size={24} />
            </button>
            {/* Dominant play button */}
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform
                hover:scale-105 active:scale-95 shadow-xl"
              style={{
                background: "oklch(0.94 0.006 280)",
                color: "oklch(0.08 0.01 280)",
                boxShadow: "0 0 24px oklch(0.84 0.155 85 / 0.25)",
              }}
            >
              {state.isPlaying
                ? <Pause size={22} fill="currentColor" />
                : <Play size={22} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-2" style={{ color: "oklch(0.75 0.03 280)" }}>
              <SkipForward size={24} />
            </button>
            <button
              onClick={toggleRepeat}
              className="p-2 transition-colors"
              style={{ color: state.isRepeat ? "oklch(0.84 0.155 85)" : "oklch(0.38 0.03 280)" }}
            >
              <Repeat size={18} />
            </button>
          </div>
        </div>

        {/* ══ FUNCTIONAL ROW — Gift | Details | Sound ══ */}
        <div
          className="flex-shrink-0 px-5 pb-4 transition-opacity duration-300"
          style={{ opacity: uiVisible ? 1 : 0, pointerEvents: uiVisible ? "auto" : "none" }}
        >
          <div className="flex items-center gap-2">
            {/* Gift */}
            <button
              onClick={() => { if (tipsEnabled) setTipOpen(true); }}
              disabled={!tipsEnabled || !currentTrack}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold
                transition-all disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                background: tipsEnabled ? "oklch(0.84 0.155 85 / 0.12)" : "oklch(0.12 0.02 275)",
                color: tipsEnabled ? "oklch(0.84 0.155 85)" : "oklch(0.40 0.03 280)",
                border: tipsEnabled ? "1px solid oklch(0.84 0.155 85 / 0.25)" : "1px solid oklch(0.20 0.02 275)",
                fontFamily: "'Cinzel', serif",
              }}
              title={tipsEnabled ? "Gift creator" : "Tips not enabled"}
            >
              <DollarSign size={13} />
              Gift
            </button>

            {/* Details */}
            <button
              onClick={() => { setDetailsOpen(v => !v); setCommentOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{
                background: detailsOpen ? "oklch(0.55 0.18 220 / 0.15)" : "oklch(0.12 0.02 275)",
                color: detailsOpen ? "oklch(0.72 0.18 220)" : "oklch(0.55 0.03 280)",
                border: detailsOpen ? "1px solid oklch(0.55 0.18 220 / 0.35)" : "1px solid oklch(0.20 0.02 275)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              <Info size={13} />
              Details
            </button>

            {/* Sound */}
            <button
              onClick={toggleMute}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{
                background: state.isMuted ? "oklch(0.55 0.18 25 / 0.12)" : "oklch(0.12 0.02 275)",
                color: state.isMuted ? "oklch(0.75 0.18 25)" : "oklch(0.55 0.03 280)",
                border: state.isMuted ? "1px solid oklch(0.55 0.18 25 / 0.3)" : "1px solid oklch(0.20 0.02 275)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {state.isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              Sound
            </button>
          </div>
        </div>

        {/* ══ DETAILS SLIDE-UP PANEL ══ */}
        <div
          className="flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: detailsOpen ? "320px" : "0px",
            opacity: detailsOpen ? 1 : 0,
          }}
        >
          <div
            className="mx-4 mb-4 rounded-2xl p-4 space-y-3"
            style={{
              background: "oklch(0.11 0.025 275)",
              border: "1px solid oklch(0.20 0.02 275)",
            }}
          >
            <h3 className="text-[11px] font-bold tracking-widest uppercase mb-3"
              style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}>
              Track Details
            </h3>

            {/* WID */}
            {currentTrack?.witnessId && (
              <div className="flex items-start gap-2.5">
                <Shield size={13} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.80 0.145 82)" }} />
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.45 0.03 280)" }}>
                    Witness ID
                  </div>
                  <button
                    onClick={() => navigate(`/verify/${currentTrack.witnessId}`)}
                    className="text-[11px] font-mono break-all text-left hover:opacity-75 transition-opacity"
                    style={{ color: "oklch(0.80 0.145 82)" }}
                  >
                    {currentTrack.witnessId}
                  </button>
                </div>
              </div>
            )}

            {/* Creator */}
            {creator && (
              <div className="flex items-start gap-2.5">
                <User size={13} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.72 0.155 175)" }} />
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.45 0.03 280)" }}>
                    Creator
                  </div>
                  <button
                    onClick={() => { if (creator.id) navigate(`/creator/${creator.id}`); }}
                    className="text-[12px] font-semibold hover:opacity-75 transition-opacity"
                    style={{ color: "oklch(0.88 0.02 280)", fontFamily: "'Cinzel', serif" }}
                  >
                    {creator.artistHandle || creator.name || "Unknown"}
                  </button>
                </div>
              </div>
            )}

            {/* License */}
            {song?.licenseStatus && (
              <div className="flex items-start gap-2.5">
                <FileText size={13} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 55)" }} />
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.45 0.03 280)" }}>
                    License
                  </div>
                  <span className="text-[12px] capitalize" style={{ color: "oklch(0.80 0.02 280)" }}>
                    {song.licenseStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Provenance / AI Disclosure */}
            {currentTrack?.aiDisclosure && currentTrack.aiDisclosure !== "original" && (
              <div className="flex items-start gap-2.5">
                <Shield size={13} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 25)" }} />
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.45 0.03 280)" }}>
                    Provenance
                  </div>
                  <span className="text-[12px]" style={{ color: "oklch(0.80 0.02 280)" }}>
                    {currentTrack.aiDisclosure === "ai_generated" ? "AI-Generated" : "AI-Assisted"}
                  </span>
                </div>
              </div>
            )}

            {/* Tags / Genre */}
            {currentTrack?.genre && (
              <div className="flex items-start gap-2.5">
                <Tag size={13} className="flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 280)" }} />
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.45 0.03 280)" }}>
                    Genre / Tags
                  </div>
                  <span className="text-[12px]" style={{ color: "oklch(0.80 0.02 280)" }}>
                    {currentTrack.genre}
                  </span>
                </div>
              </div>
            )}

            {/* Open full song page */}
            {currentSongId && (
              <button
                onClick={() => { navigate(`/song/${currentSongId}`); closeNowPlayingPanel(); }}
                className="w-full mt-1 py-2 rounded-xl text-[11px] font-semibold tracking-wide transition-all"
                style={{
                  background: "oklch(0.84 0.155 85 / 0.10)",
                  color: "oklch(0.84 0.155 85)",
                  border: "1px solid oklch(0.84 0.155 85 / 0.20)",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                Open Full Song Page →
              </button>
            )}
          </div>
        </div>

        {/* ══ COMMENT PANEL ══ */}
        <div
          className="flex-1 overflow-hidden transition-all duration-300 ease-in-out flex flex-col"
          style={{
            maxHeight: commentOpen ? "400px" : "0px",
            opacity: commentOpen ? 1 : 0,
          }}
        >
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-2 space-y-3"
            style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.22 0.02 275) transparent" }}>
            <h3 className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}>
              Activity
            </h3>
            {commentsData && commentsData.length > 0 ? (
              commentsData.map((c: any) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                    style={{ background: "oklch(0.84 0.155 85 / 0.15)", color: "oklch(0.84 0.155 85)" }}>
                    {(c.authorName ?? "A")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold" style={{ color: "oklch(0.82 0.155 175)" }}>
                        {c.authorName ?? "Anonymous"}
                      </span>
                      <span className="text-[9px]" style={{ color: "oklch(0.40 0.02 280)" }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed" style={{ color: "oklch(0.78 0.02 280)" }}>
                      {c.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <MessageCircle size={20} className="mx-auto mb-1.5 opacity-20" style={{ color: "oklch(0.80 0.145 82)" }} />
                <p className="text-[12px] italic" style={{ color: "oklch(0.40 0.02 280)" }}>
                  No comments yet. Be the first.
                </p>
              </div>
            )}
          </div>
          {/* Comment input */}
          <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2"
            style={{ borderTop: "1px solid oklch(0.18 0.02 275)" }}>
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              placeholder={user ? "Leave a witness..." : "Sign in to comment"}
              disabled={!user || addCommentMutation.isPending}
              maxLength={1000}
              className="flex-1 rounded-xl px-3 py-2 text-[12px] outline-none transition-colors disabled:opacity-50"
              style={{
                background: "oklch(0.12 0.04 270)",
                border: "1px solid oklch(0.22 0.04 270)",
                color: "oklch(0.88 0.02 280)",
              }}
            />
            <button
              onClick={submitComment}
              disabled={!user || !newComment.trim() || addCommentMutation.isPending}
              className="px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: "oklch(0.80 0.145 82)", color: "oklch(0.08 0.01 280)" }}
            >
              Post
            </button>
          </div>
        </div>

        {/* ══ QUEUE CONTEXT + GRAB HANDLE ══ */}
        <div
          className="flex-shrink-0 flex flex-col items-center pb-5 pt-2 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={onGrabTouchStart}
          onTouchEnd={onGrabTouchEnd}
        >
          <div className="rounded-full" style={{ width: "48px", height: "4px", background: "oklch(0.24 0.02 275)" }} />
          {currentTrack && (
            <div className="flex items-center gap-2 mt-3 px-4">
              <AddToPlaylistButton songId={currentSongId!} variant="full" className="flex-1" />
              <button
                onClick={() => { closeNowPlayingPanel(); navigate("/together"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-body transition-all"
                style={{
                  background: "oklch(0.12 0.02 275)",
                  color: "oklch(0.50 0.03 280)",
                  border: "1px solid oklch(0.20 0.02 275)",
                }}
              >
                <Users size={12} />
                Room
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes mobileWave {
          from { height: 3px; }
          to   { height: 10px; }
        }
        @keyframes heartFloat {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          60%  { opacity: 0.8; transform: translateY(-40px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
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
