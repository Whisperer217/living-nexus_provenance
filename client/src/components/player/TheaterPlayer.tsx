/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TheaterPlayer
   Full-screen desktop theater overlay. Reuses global audio engine —
   no independent audio elements. Single source of truth.
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  X, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, DollarSign,
  ChevronDown, MessageCircle, Music, Shield, Fingerprint,
  ExternalLink, Users, Crown, Share2, Check,
} from "lucide-react";
import PlayerTipModal from "./PlayerTipModal";

// Emoji reaction config (canonical — shared with MobilePlayerLayer)
const THEATER_EMOJI_REACTIONS = [
  { type: "fire",     emoji: "🔥", label: "Fire"     },
  { type: "love",     emoji: "❤️", label: "Love"     },
  { type: "grateful", emoji: "🙏", label: "Grateful" },
  { type: "magic",    emoji: "✨", label: "Magic"    },
  { type: "gem",      emoji: "💎", label: "Gem"      },
  { type: "vibe",     emoji: "🎵", label: "Vibe"     },
];

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function TheaterPlayer() {
  const {
    state, audioRef, allTracks, togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute, setVolume, seek,
    isTheaterOpen, closeTheater,
    patchTrack,
  } = usePlayer();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"lyrics" | "comments" | "signals">("lyrics");
  const [tipOpen, setTipOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [widPanelOpen, setWidPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail for lyrics, video, tip status
  // Poll every 30s while visualReady is false so the shimmer clears automatically.
  const isTrackVisualPending = currentTrack?.visualReady === false;
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    {
      enabled: !!currentSongId && !isNaN(currentSongId),
      staleTime: 60_000,
      refetchInterval: isTrackVisualPending ? 30_000 : false,
    }
  );
  // When poll returns visualReady:true, patch the track in the queue so shimmer clears
  const theaterVisualReady = (songDetail?.song as any)?.visualReady as boolean | undefined;
  const theaterAutoVideoUrl = (songDetail?.song as any)?.autoVideoUrl as string | null | undefined;
  useEffect(() => {
    if (!currentTrack || !theaterVisualReady) return;
    if (currentTrack.visualReady === true) return;
    patchTrack(currentTrack.id, {
      visualReady: true,
      autoVideoUrl: theaterAutoVideoUrl ?? currentTrack.autoVideoUrl,
    });
  }, [theaterVisualReady, theaterAutoVideoUrl, currentTrack, patchTrack]);

  // Comments
  const { data: commentsData, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId) && activeTab === "comments", staleTime: 30_000 }
  );
  const addCommentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { refetchComments(); setNewComment(""); },
  });

  // Like state
  const { data: likeStatusData, refetch: refetchLikeStatus } = trpc.songs.getLikeStatus.useQuery(
    { songId: currentSongId! },
    { enabled: !!user && !!currentSongId && !isNaN(currentSongId) }
  );
  const isLiked = !!likeStatusData?.liked;
  const toggleLikeMutation = trpc.songs.toggleLike.useMutation({
    onSuccess: () => refetchLikeStatus(),
  });

  // Reactions / signals
  const { data: reactionsData, refetch: refetchReactions } = trpc.songs.getReactions.useQuery(
    { songId: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 30_000 }
  );
  const reactionCounts = reactionsData?.counts ?? {};
  const myReactions = reactionsData?.mine ?? [];
  const toggleReactionMutation = trpc.songs.toggleReaction.useMutation({
    onSuccess: () => refetchReactions(),
  });
  const handleToggleReaction = (type: string) => {
    if (!user || !currentSongId) return;
    toggleReactionMutation.mutate({ songId: currentSongId, type });
  };
  // Witness Activity — live listener count (poll every 30s)
  const { data: listenerData } = trpc.songs.getListenerCount.useQuery(
    { songId: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), refetchInterval: 30_000, staleTime: 25_000 }
  );
  const listenerCount = (listenerData as any)?.count ?? 0;


  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;
  const videoUrl = (songDetail?.song as any)?.videoUrl as string | null | undefined;
  const videoWitnessId = (songDetail?.song as any)?.videoWitnessId as string | null | undefined;
  // WID — prefer track.witnessId, fall back to videoWitnessId
  const widBadge = currentTrack?.witnessId || videoWitnessId || null;

  const handleShare = useCallback(async () => {
    if (!currentTrack) return;
    const url = widBadge
      ? `${window.location.origin}/share/${encodeURIComponent(widBadge)}`
      : currentSongId ? `${window.location.origin}/song/${currentSongId}` : window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: currentTrack.title ?? "", url }); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [currentTrack, currentSongId, widBadge]);

  // Background video ref — always muted, synced to audio play state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Sync background video to audio play/pause state
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) return;
    if (state.isPlaying && isTheaterOpen) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [state.isPlaying, isTheaterOpen, videoUrl]);

  // Show video as soon as it's loaded — even when paused (shows first frame)
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
    if (vid) vid.currentTime = 0;
    setVideoReady(false);
  }, [currentTrack?.id]);
  // Show video as soon as it's loaded — even when paused (shows first frame)
  const showVideo = videoReady;

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const dur = (audio && isFinite(audio.duration) && audio.duration > 0) ? audio.duration : state.duration;
    if (!dur) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * dur);
  }, [audioRef, seek, state.duration]);

  const handleVolume = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  }, [setVolume]);

  const goToCreator = useCallback(() => {
    if (songDetail?.creator?.id) { closeTheater(); navigate(`/creator/${songDetail.creator.id}`); }
  }, [songDetail, navigate, closeTheater]);

  const goToVerify = useCallback(() => {
    if (currentTrack?.witnessId) { closeTheater(); navigate(`/verify/${currentTrack.witnessId}`); }
  }, [currentTrack, navigate, closeTheater]);

  const submitComment = () => {
    if (!newComment.trim() || !currentSongId) return;
    addCommentMutation.mutate({
      songId: currentSongId,
      content: newComment.trim(),
      authorName: user?.artistHandle || user?.name || undefined,
    });
  };

  return createPortal(
    <AnimatePresence>
      {isTheaterOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 280 }}
          className="fixed inset-0 z-[9015] flex flex-col md:flex-row overflow-hidden"
          style={{ background: "var(--ln-coal)" }}
        >
          {/* ── LEFT — Media + Controls ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Art / Video */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
              style={{ background: "var(--ln-coal)" }}>
              {/* Background video — always muted, fades in when playing + buffered */}
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                  style={{ opacity: showVideo ? 1 : 0 }}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              )}
              {/* Cover art — sits on top, fades out only when video is playing AND buffered */}
              {currentTrack?.artUrl ? (
                <img
                  src={currentTrack.artUrl}
                  alt={currentTrack.title}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                  style={{
                    opacity: (videoUrl && showVideo) ? 0 : 1,
                    objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%`,
                  }}
                />
              ) : (
                <div
                  className="absolute inset-0 w-full h-full flex items-center justify-center text-8xl transition-opacity duration-500"
                  style={{
                    background: currentTrack?.bg || "var(--ln-coal)",
                    opacity: (videoUrl && showVideo) ? 0 : 1,
                  }}
                >
                  {currentTrack?.emoji || "🎵"}
                </div>
              )}
              {/* visualReady shimmer — shown while auto-video MP4 is being generated */}
              {currentTrack && currentTrack.visualReady === false && !videoUrl && (
                <div
                  className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 py-2 px-4"
                  style={{ background: "linear-gradient(to top, rgba(44,52,56,0.88), transparent)" }}
                >
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "rgba(196,154,40,0.5)",
                          animationName: "pulse",
                          animationDuration: "2s",
                          animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
                          animationIterationCount: "infinite",
                          animationDelay: `${i * 200}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-heading tracking-wider" style={{ color: "rgba(196,154,40,0.5)" }}>
                    generating visual…
                  </span>
                </div>
              )}
              {/* WID badge — always show if any WID exists */}
              {widBadge && (
                <button
                  onClick={() => setWidPanelOpen(v => !v)}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all z-20"
                  style={{
                    background: "rgba(44,52,56,0.88)",
                    border: "1px solid rgba(74,222,128,0.5)",
                    color: "var(--ln-seal-bright)",
                    backdropFilter: "blur(6px)",
                  }}
                  title="Cryptographically witnessed — click to expand"
                >
                  <Shield size={9} />
                  WID
                </button>
              )}
              {/* WID Provenance Panel — slides down from artwork */}
              {widPanelOpen && widBadge && (
                <div
                  className="absolute bottom-0 left-0 right-0 z-30 p-4"
                  style={{
                    background: "rgba(44,52,56,0.95)",
                    backdropFilter: "blur(12px)",
                    borderTop: "1px solid rgba(58,138,86,0.3)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Fingerprint size={14} style={{ color: "var(--ln-seal-bright)" }} />
                      <span className="text-[11px] font-heading tracking-[0.12em] uppercase" style={{ color: "var(--ln-seal-bright)" }}>
                        Origin Proof
                      </span>
                    </div>
                    <button type="button" onClick={() => setWidPanelOpen(false)} className="text-[10px]" style={{ color: "var(--ln-iron)" }}>✕</button>
                  </div>
                  <div className="text-[10px] font-mono break-all mb-2" style={{ color: "var(--ln-seal-bright)" }}>{widBadge}</div>
                  <div className="flex items-center gap-3">
                    {currentTrack?.title && <span className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>{currentTrack.title}</span>}
                    <button
                      onClick={() => { closeTheater(); navigate(`/verify/${widBadge}`); }}
                      className="flex items-center gap-1 text-[10px] ml-auto transition-all hover:opacity-80"
                      style={{ color: "var(--ln-seal-bright)" }}
                    >
                      <ExternalLink size={10} />
                      Verify
                    </button>
                  </div>
                </div>
              )}
              {/* Gradient overlay at bottom */}
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
                style={{ background: "linear-gradient(to top, var(--ln-coal), transparent)" }}
              />
            </div>

            {/* Track info + controls */}
            <div className="px-6 py-5 flex-shrink-0" style={{ background: "var(--ln-coal)" }}>
              {/* Title / Artist / WID */}
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1 mr-4">
                  <h2
                    className="text-xl font-bold truncate mb-0.5"
                    style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
                  >
                    {currentTrack?.title || "No track selected"}
                  </h2>
                  <button
                    onClick={goToCreator}
                    disabled={!songDetail?.creator?.id}
                    className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-80 disabled:cursor-default"
                    style={{ color: "var(--ln-parchment)" }}
                  >
                    {currentTrack?.creatorRole === "founder" && (
                      <Crown size={11} style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
                    )}
                    {currentTrack?.artist || "—"}
                  </button>
                  {currentTrack?.witnessId && (
                    <button
                      onClick={goToVerify}
                      className="block text-[10px] font-mono mt-1 transition-opacity hover:opacity-80"
                      style={{ color: "rgba(196,154,40,0.5)" }}
                      title="View Witness Certificate"
                    >
                      WID: {currentTrack.witnessId.slice(0, 20)}…
                    </button>
                  )}
                </div>
                {/* Like + Tip + Room */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { if (user && currentSongId && !isNaN(currentSongId)) toggleLikeMutation.mutate({ songId: currentSongId }); }}
                    disabled={!user || toggleLikeMutation.isPending}
                    className={`p-2 transition-colors ${isLiked ? "text-[#4ADE80]" : "text-white/30 hover:text-white/60"} disabled:opacity-40`}
                    title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
                  >
                    <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                  </button>
                  {currentTrack && (
                    <button
                      onClick={() => setTipOpen(true)}
                      disabled={!tipsEnabled}
                      className={`p-2 transition-colors ${tipsEnabled ? "text-[#C49A28] hover:text-[#E8DFC8]" : "text-white/15 cursor-not-allowed"}`}
                      title={tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips not enabled"}
                    >
                      <DollarSign size={18} />
                    </button>
                  )}
                  <button
                    onClick={handleShare}
                    className="p-2 transition-colors"
                    style={{ color: copied ? "var(--ln-gold)" : "var(--ln-iron)" }}
                    title={copied ? "Link copied!" : "Share track"}
                  >
                    {copied ? <Check size={18} /> : <Share2 size={18} />}
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: "var(--ln-smoke)" }}>
                  {fmtTime(state.currentTime)}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                  style={{ background: "var(--ln-coal)" }}
                  onClick={handleSeek}
                >
                  <div
                    className="h-full rounded-full relative"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #1C1A14, #C49A28)",
                    }}
                  >
                    {state.isPlaying && (
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full progress-playhead"
                        style={{ background: "var(--ln-gold)", boxShadow: "0 0 6px 2px rgba(196,154,40,0.6)" }}
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
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleShuffle}
                    className={`p-1.5 transition-colors ${state.isShuffle ? "text-[#C49A28]" : "text-white/30 hover:text-white/70"}`}
                  >
                    <Shuffle size={16} />
                  </button>
                  <button type="button" onClick={prevTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                    <SkipBack size={22} />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                    style={{ background: "var(--ln-parchment)", color: "var(--ln-coal)" }}
                  >
                    {state.isPlaying
                      ? <Pause size={20} fill="currentColor" />
                      : <Play size={20} fill="currentColor" className="ml-0.5" />
                    }
                  </button>
                  <button type="button" onClick={nextTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                    <SkipForward size={22} />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={`p-1.5 transition-colors ${state.isRepeat ? "text-[#C49A28]" : "text-white/30 hover:text-white/70"}`}
                  >
                    <Repeat size={16} />
                  </button>
                </div>

                {/* Volume — theater organ-pipe vertical slider */}
                <div className="flex flex-col items-center gap-1.5 px-1">
                  {/* Mute / volume icon */}
                  <button
                    onClick={toggleMute}
                    className="p-1 transition-all rounded-full"
                    style={{
                      color: state.isMuted ? "var(--ln-gold)" : "var(--ln-smoke)",
                      background: state.isMuted ? "rgba(196,154,40,0.08)" : "transparent",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
                    onMouseLeave={e => (e.currentTarget.style.color = state.isMuted ? "var(--ln-gold)" : "var(--ln-smoke)")}
                    title={state.isMuted ? "Unmute" : "Mute"}
                  >
                    {state.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  {/* Vertical organ-pipe slider */}
                  <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={state.isMuted ? 0 : state.volume}
                    onChange={e => { setVolume(parseFloat(e.target.value)); }}
                    className="volume-slider-theater"
                    style={{
                      background: `linear-gradient(to top, #E8DFC8 ${
                        state.isMuted ? 0 : state.volume * 100
                      }%, rgba(44,52,56,0.85) ${
                        state.isMuted ? 0 : state.volume * 100
                      }%)`,
                    }}
                  />
                  {/* Volume % readout */}
                  <span className="text-[9px] font-mono tracking-widest" style={{ color: "var(--ln-gold)" }}>
                    {state.isMuted ? "0" : Math.round(state.volume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT — Lyrics + Comments + Signals ── */}
          <div
            className="w-full md:w-[380px] flex flex-col flex-shrink-0 overflow-hidden"
            style={{ borderLeft: "1px solid rgba(44,52,56,0.6)" }}
          >
            {/* Tab bar */}
            <div
              className="flex flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(44,52,56,0.6)" }}
            >
              {(["lyrics", "signals", "comments"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-xs font-medium capitalize transition-colors flex items-center justify-center gap-1"
                  style={{
                    color: activeTab === tab ? "var(--ln-gold)" : "var(--ln-iron)",
                    borderBottom: activeTab === tab ? "2px solid #C49A28" : "2px solid transparent",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {tab === "lyrics" ? <Music size={12} /> : tab === "signals" ? <span className="text-[12px]">✨</span> : <MessageCircle size={12} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Lyrics panel */}
            {activeTab === "lyrics" && (
              <div className="flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: "contain" }}>
                {songDetail?.song?.lyricsText ? (
                  <pre
                    className="whitespace-pre-wrap"
                    style={{
                      fontFamily: "'Inter', Georgia, serif",
                      fontSize: "15px",
                      lineHeight: "2",
                      color: "var(--ln-parchment)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {songDetail.song.lyricsText}
                  </pre>
                ) : (
                  <div
                    className="rounded-xl p-6 text-center mt-4"
                    style={{
                      background: "var(--ln-coal)",
                      border: "1px dashed rgba(196,154,40,0.15)",
                    }}
                  >
                    <p className="text-[13px] italic mb-1.5" style={{ color: "var(--ln-iron)" }}>
                      No lyrics registered
                    </p>
                    <p className="text-[12px]" style={{ color: "var(--ln-gold)" }}>
                      Upload lyrics to protect your words.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Signals panel */}
            {activeTab === "signals" && (
              <div className="flex-1 overflow-y-auto p-5" style={{ overscrollBehavior: "contain" }}>
                {/* Witness Activity Strip */}
                {listenerCount > 0 && (
                  <div
                    className="mb-4 flex items-center justify-center gap-2 py-2 px-4 rounded-full animate-fade-in"
                    style={{
                      background: "rgba(44,52,56,0.5)",
                      border: "1px solid rgba(44,52,56,0.4)",
                    }}
                  >
                    <span className="text-[13px]">🎧</span>
                    <span
                      className="text-[12px] font-medium tracking-wide"
                      style={{ color: "var(--ln-smoke)" }}
                    >
                      {listenerCount === 1
                        ? "1 person currently listening"
                        : `${listenerCount} people currently listening`}
                    </span>
                  </div>
                )}
                {/* Emoji reactions grid */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-[10px] font-heading tracking-[0.15em] uppercase" style={{ color: "var(--ln-smoke)" }}>
                      Signal this work
                    </div>
                    <div className="flex-1 h-px" style={{ background: "rgba(44,52,56,0.5)" }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {THEATER_EMOJI_REACTIONS.map(({ type, emoji, label }) => {
                      const count = (reactionCounts as Record<string, number>)[type] ?? 0;
                      const isActive = myReactions.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => handleToggleReaction(type)}
                          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: isActive ? "rgba(122,90,30,0.5)" : "rgba(44,52,56,0.8)",
                            border: `1px solid ${isActive ? "rgba(196,154,40,0.42)" : "rgba(44,52,56,0.6)"}`,
                          }}
                          title={label}
                        >
                          <span className="text-[22px] leading-none">{emoji}</span>
                          <span className="text-[10px] font-heading" style={{ color: isActive ? "var(--ln-gold)" : "var(--ln-iron)" }}>
                            {label}
                          </span>
                          {count > 0 && (
                            <span className="text-[10px] font-mono" style={{ color: isActive ? "var(--ln-gold)" : "var(--ln-iron)" }}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Total signals summary */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.10)" }}>
                    <div className="text-[10px] font-heading tracking-[0.15em] uppercase mb-2" style={{ color: "var(--ln-iron)" }}>
                      Total signals
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {THEATER_EMOJI_REACTIONS.filter(r => (reactionCounts as Record<string, number>)[r.type] > 0).map(({ type, emoji }) => (
                        <span key={type} className="flex items-center gap-1 text-[12px]" style={{ color: "var(--ln-smoke)" }}>
                          {emoji} {(reactionCounts as Record<string, number>)[type]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!user && (
                  <p className="text-[12px] mt-4 text-center" style={{ color: "var(--ln-iron)" }}>
                    Sign in to send signals
                  </p>
                )}
              </div>
            )}

            {/* Comments panel */}
            {activeTab === "comments" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Witness Activity Strip */}
                {listenerCount > 0 && (
                  <div
                    className="mx-4 mt-4 flex items-center justify-center gap-2 py-2 px-4 rounded-full animate-fade-in"
                    style={{
                      background: "rgba(44,52,56,0.5)",
                      border: "1px solid rgba(44,52,56,0.4)",
                    }}
                  >
                    <span className="text-[13px]">🎧</span>
                    <span
                      className="text-[12px] font-medium tracking-wide"
                      style={{ color: "var(--ln-smoke)" }}
                    >
                      {listenerCount === 1
                        ? "1 person currently listening"
                        : `${listenerCount} people currently listening`}
                    </span>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ overscrollBehavior: "contain" }}>
                  {commentsData && commentsData.length > 0 ? (
                    commentsData.map((c: any) => (
                      <div key={c.id} className="flex gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                          style={{ background: "var(--ln-coal)", color: "var(--ln-gold)" }}
                        >
                          {(c.authorName ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold" style={{ color: "var(--ln-seal-bright)" }}>
                              {c.authorName ?? "Anonymous"}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--ln-iron)" }}>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed" style={{ color: "var(--ln-parchment)" }}>
                            {c.content}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle size={28} className="mx-auto mb-2 opacity-20" style={{ color: "var(--ln-gold)" }} />
                      <p className="text-[13px] italic" style={{ color: "var(--ln-iron)" }}>
                        No comments yet. Be the first.
                      </p>
                    </div>
                  )}
                </div>

                {/* Comment input */}
                <div
                  className="p-3 flex-shrink-0"
                  style={{ borderTop: "1px solid rgba(44,52,56,0.6)" }}
                >
                  <div className="flex gap-2">
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                      placeholder={user ? "Add a comment…" : "Sign in to comment"}
                      disabled={!user || addCommentMutation.isPending}
                      maxLength={1000}
                      className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none transition-colors disabled:opacity-50"
                      style={{
                        background: "var(--ln-coal)",
                        border: "1px solid rgba(196,154,40,0.10)",
                        color: "var(--ln-parchment)",
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = "rgba(196,154,40,0.42)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--ln-coal)")}
                    />
                    <button
                      onClick={submitComment}
                      disabled={!user || !newComment.trim() || addCommentMutation.isPending}
                      className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-40"
                      style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Close button ── */}
          <button
            onClick={closeTheater}
            className="absolute top-4 right-4 rounded-full p-2 transition-colors z-10"
            style={{
              background: "rgba(44,52,56,0.8)",
              color: "var(--ln-smoke)",
              border: "1px solid rgba(196,154,40,0.10)",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ln-parchment)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ln-smoke)")}
            title="Close Theater"
          >
            <X size={18} />
          </button>

          {/* ── Minimize button (bottom of left panel) ── */}
          <button
            onClick={closeTheater}
            className="absolute bottom-[220px] left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[11px] flex items-center gap-1.5 transition-colors md:hidden"
            style={{
              background: "rgba(44,52,56,0.8)",
              color: "var(--ln-smoke)",
              border: "1px solid rgba(196,154,40,0.10)",
            }}
          >
            <ChevronDown size={12} />
            Minimize
          </button>

          {/* Tip Modal */}
          {tipOpen && currentSongId && (
            <PlayerTipModal
              songId={currentSongId}
              artistName={currentTrack?.artist || "this creator"}
              stripeAccountId={creatorStripeAccountId}
              onClose={() => setTipOpen(false)}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
