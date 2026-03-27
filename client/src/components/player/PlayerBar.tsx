/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlayerBar (The Altar)
   v2.1 — Background video: cover art stays static until play,
   muted looping video fades in behind the music on play.
   Audio and video are completely separate streams.
═══════════════════════════════════════════════════════════════════ */

import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, Users, DollarSign, Maximize2,
  ChevronDown, ChevronUp, MessageCircle,
} from "lucide-react";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import { useLocation } from "wouter";
import { useState, useCallback, useRef, useEffect } from "react";
import PlayerTipModal from "./PlayerTipModal";

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const commentListRef = useRef<HTMLDivElement>(null);

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
  const [videoBuffering, setVideoBuffering] = useState(true);

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

  // Reset video when track changes
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) { vid.pause(); vid.currentTime = 0; }
    setVideoBuffering(true);
  }, [currentTrack?.id]);

  // Show video only when playing AND not buffering
  const showVideo = state.isPlaying && !videoBuffering;

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
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audioRef.current.duration);
  }, [audioRef, seek]);

  const handleVolume = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  }, [setVolume]);

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
      authorName: user?.name ?? "Anonymous",
    });
  };

  // Collapse expanded bar when track changes
  useEffect(() => {
    setIsExpanded(false);
  }, [currentTrack?.id]);

  return (
    <div
      className="z-50 transition-all duration-500 ease-in-out hidden md:block"
      style={{
        position: "fixed",
        bottom: 0,
        left: "164px",
        right: 0,
        height: isExpanded ? "256px" : "68px",
        background: "oklch(0.115 0.05 268)",
        borderTop: isExpanded
          ? "1px solid oklch(0.80 0.145 82 / 0.20)"
          : "1px solid oklch(0.28 0.04 270 / 60%)",
        boxShadow: "0 -4px 40px rgba(0,0,0,0.7), 0 -4px 32px oklch(0.82 0.155 175 / 0.06), 0 -1px 8px oklch(0.80 0.145 82 / 0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ── Expand / Collapse tab — sits on top of bar, centered ── */}
      {currentTrack && (
        <button
          onClick={() => setIsExpanded(e => !e)}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 text-[11px] font-semibold transition-all duration-200 rounded-t-lg z-10"
          style={{
            top: "-26px",
            background: "oklch(0.115 0.05 268)",
            border: "1px solid oklch(0.28 0.04 270 / 60%)",
            borderBottom: "none",
            color: isExpanded ? "oklch(0.80 0.145 82)" : "oklch(0.55 0.02 280)",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.80 0.145 82)")}
          onMouseLeave={e => (e.currentTarget.style.color = isExpanded ? "oklch(0.80 0.145 82)" : "oklch(0.55 0.02 280)")}
          title={isExpanded ? "Collapse player" : "Expand player"}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          {isExpanded ? "collapse" : "expand player"}
          {!isExpanded && commentsData && commentsData.length > 0 && (
            <span
              className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none"
              style={{ background: "oklch(0.80 0.145 82)", color: "oklch(0.08 0.01 280)" }}
            >
              {commentsData.length} {commentsData.length === 1 ? "witness" : "witnesses"}
            </span>
          )}
        </button>
      )}

      {/* ══ EXPANDED CINEMATIC VIEW ══ */}
      {isExpanded && currentTrack && (
        <div className="flex h-full overflow-hidden">

          {/* LEFT — Art / Video (256px wide) */}
          {/* Cover art stays static until play; muted video fades in on play */}
          <div className="w-64 h-full flex-shrink-0 relative overflow-hidden">
            {/* Background video — always muted, loops, fades in when playing + buffered */}
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
            {currentTrack.artUrl ? (
              <img
                src={currentTrack.artUrl}
                alt={currentTrack.title}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                style={{ opacity: (videoUrl && showVideo) ? 0 : 1 }}
              />
            ) : (
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center text-5xl transition-opacity duration-500"
                style={{
                  background: currentTrack.bg || "oklch(0.12 0.06 270)",
                  opacity: (videoUrl && showVideo) ? 0 : 1,
                }}
              >
                {currentTrack.emoji || "🎵"}
              </div>
            )}
            {/* Video WID badge — top-right, links to verify page */}
            {videoWitnessId && (
              <button
                onClick={() => navigate(`/verify/${videoWitnessId}`)}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold tracking-wide transition-all z-20"
                style={{
                  background: "oklch(0.22 0.08 145 / 0.88)",
                  border: "1px solid oklch(0.55 0.18 145 / 0.5)",
                  color: "oklch(0.82 0.18 145)",
                  backdropFilter: "blur(4px)",
                }}
                title="Video cryptographically witnessed — click to verify"
              >
                ✓ Video WID
              </button>
            )}
            {/* Gold gradient fade to center */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to right, transparent 60%, oklch(0.115 0.05 268))" }}
            />
          </div>

          {/* CENTER — Track info + controls */}
          <div className="flex-1 flex flex-col justify-between px-5 py-3 min-w-0 overflow-hidden">
            {/* Track info */}
            <div>
              <button
                onClick={goToSong}
                disabled={!currentSongId}
                className="text-lg font-bold truncate block w-full text-left transition-colors hover:text-[oklch(0.80_0.145_82)] disabled:cursor-default mb-0.5"
                style={{ color: "oklch(0.96 0.008 270)", fontFamily: "'Cinzel', serif" }}
              >
                {currentTrack.title}
              </button>
              <button
                onClick={goToCreator}
                disabled={!currentTrack}
                className="text-sm truncate block w-full text-left transition-opacity hover:opacity-80 disabled:cursor-default mb-1"
                style={{ color: "oklch(0.82 0.155 175)" }}
              >
                {currentTrack.artist || "—"}
              </button>
              {currentTrack.witnessId && (
                <button
                  onClick={goToVerify}
                  className="text-[9px] font-mono truncate block text-left transition-opacity hover:opacity-80 mb-2"
                  style={{ color: "oklch(0.80 0.145 82 / 0.6)" }}
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
                  className={`p-1.5 transition-colors ${isLiked ? "text-[oklch(0.82_0.155_175)]" : "text-white/25 hover:text-white/60"} disabled:opacity-40`}
                  title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
                >
                  <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {tipsEnabled && (
                  <button
                    onClick={() => setTipOpen(true)}
                    className="p-1.5 transition-colors text-[oklch(0.80_0.145_82)] hover:text-[oklch(0.88_0.16_85)]"
                    title={`Tip ${currentTrack.artist}`}
                  >
                    <DollarSign size={15} />
                  </button>
                )}
                {currentSongId && <AddToPlaylistButton songId={currentSongId} variant="compact" />}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: "oklch(0.68 0.02 280)" }}>
                {fmtTime(state.currentTime)}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                style={{ background: "oklch(0.28 0.04 270 / 80%)" }}
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full relative transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, oklch(0.50 0.20 295), oklch(0.80 0.145 82))",
                  }}
                >
                  {state.isPlaying && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full progress-playhead"
                      style={{ background: "oklch(0.80 0.145 82)", boxShadow: "0 0 6px 2px oklch(0.80 0.145 82 / 0.7)" }}
                    />
                  )}
                </div>
              </div>
              <span className="text-[11px] w-8 tabular-nums" style={{ color: "oklch(0.68 0.02 280)" }}>
                {fmtTime(state.duration)}
              </span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={toggleShuffle} className={`p-1.5 transition-colors ${state.isShuffle ? "text-[oklch(0.80_0.145_82)]" : "text-white/30 hover:text-white/70"}`}>
                  <Shuffle size={14} />
                </button>
                <button onClick={prevTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                  style={{ background: "oklch(0.96 0.008 270)", color: "oklch(0.08 0.01 280)" }}
                >
                  {state.isPlaying
                    ? <Pause size={17} fill="currentColor" />
                    : <Play size={17} fill="currentColor" className="ml-0.5" />
                  }
                </button>
                <button onClick={nextTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                  <SkipForward size={18} />
                </button>
                <button onClick={toggleRepeat} className={`p-1.5 transition-colors ${state.isRepeat ? "text-[oklch(0.80_0.145_82)]" : "text-white/30 hover:text-white/70"}`}>
                  <Repeat size={14} />
                </button>
              </div>
              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="p-1 transition-colors"
                  style={{ color: "oklch(0.68 0.02 280)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.96 0.008 270)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.68 0.02 280)")}
                >
                  {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
                <div
                  className="w-20 h-1.5 rounded-full cursor-pointer"
                  style={{ background: "oklch(0.28 0.04 270 / 80%)" }}
                  onClick={handleVolume}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: state.isMuted ? "0%" : `${state.volume * 100}%`, background: "oklch(0.68 0.02 280)" }}
                  />
                </div>
                <button
                  onClick={openTheater}
                  className="p-1.5 transition-colors ml-1"
                  style={{ color: "oklch(0.68 0.02 280)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.80 0.145 82)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.68 0.02 280)")}
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
            style={{ borderLeft: "1px solid oklch(0.22 0.04 270 / 60%)" }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 flex items-center gap-2 flex-shrink-0"
              style={{ borderBottom: "1px solid oklch(0.22 0.04 270 / 60%)" }}
            >
              <MessageCircle size={11} style={{ color: "oklch(0.80 0.145 82)" }} />
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.80 0.145 82)", fontFamily: "'Cinzel', serif" }}
              >
                Live Feed
              </span>
            </div>

            {/* Comment list — scrolls to bottom */}
            <div
              ref={commentListRef}
              className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
              style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.22 0.02 275) transparent" }}
            >
              {commentsData && commentsData.length > 0 ? (
                commentsData.map((c: any) => (
                  <div key={c.id} className="flex gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5"
                      style={{ background: "oklch(0.22 0.08 270)", color: "oklch(0.80 0.145 82)" }}
                    >
                      {(c.authorName ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold mr-1.5" style={{ color: "oklch(0.82 0.155 175)" }}>
                        {c.authorName ?? "Anonymous"}
                      </span>
                      <span className="text-[11px] leading-relaxed" style={{ color: "oklch(0.75 0.02 280)" }}>
                        {c.content}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-4 opacity-40">
                  <MessageCircle size={20} style={{ color: "oklch(0.80 0.145 82)" }} className="mb-1.5" />
                  <p className="text-[11px] italic" style={{ color: "oklch(0.55 0.02 280)" }}>
                    No witnesses yet.
                  </p>
                </div>
              )}
            </div>

            {/* Comment input */}
            <div
              className="p-2 flex gap-1.5 flex-shrink-0"
              style={{ borderTop: "1px solid oklch(0.22 0.04 270 / 60%)" }}
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
                className="px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-colors disabled:opacity-40"
                style={{ background: "oklch(0.80 0.145 82)", color: "oklch(0.08 0.01 280)" }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPACT BAR (always visible, overlays bottom of expanded) ══ */}
      {!isExpanded && (
        <div
          className="flex items-center px-4 gap-4"
          style={{ height: "68px" }}
        >
          {/* ── Track info (left) ── */}
          <div className="flex items-center gap-3 w-[240px] flex-shrink-0 min-w-0">
            {/* Art — 56px, clickable → song page */}
            <button
              onClick={goToSong}
              disabled={!currentSongId}
              className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl
                transition-opacity hover:opacity-80 disabled:cursor-default"
              style={{ background: currentTrack?.bg || "oklch(0.185 0.06 270)" }}
              title={currentTrack?.title || ""}
            >
              {currentTrack?.artUrl && currentTrack.artType !== "video"
                ? <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
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
                className="text-[13.5px] font-semibold truncate font-body block w-full text-left
                  transition-colors hover:text-[oklch(0.80_0.145_82)] disabled:cursor-default"
                style={{ color: "oklch(0.96 0.008 270)" }}
              >
                {currentTrack?.title || "No track selected"}
              </button>
              {/* Artist */}
              <button
                onClick={goToCreator}
                disabled={!currentTrack}
                className="text-[11px] truncate font-body block w-full text-left
                  transition-colors hover:opacity-80 disabled:cursor-default"
                style={{ color: "oklch(0.82 0.155 175)" }}
              >
                {currentTrack?.artist || "—"}
              </button>
              {/* WID badge */}
              {currentTrack?.witnessId && (
                <button
                  onClick={goToVerify}
                  className="text-[9px] font-mono truncate block text-left transition-opacity hover:opacity-80 mt-0.5"
                  style={{ color: "oklch(0.80 0.145 82 / 0.6)" }}
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
              className={`p-1 transition-colors flex-shrink-0 ${isLiked ? "text-[oklch(0.82_0.155_175)]" : "text-white/25 hover:text-white/60"} disabled:opacity-40`}
              title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
            >
              <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* ── Controls (center) ── */}
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={`p-1.5 transition-colors ${state.isShuffle ? "text-[oklch(0.80_0.145_82)]" : "text-white/30 hover:text-white/70"}`}
              >
                <Shuffle size={14} />
              </button>
              <button onClick={prevTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                style={{ background: "oklch(0.96 0.008 270)", color: "oklch(0.08 0.01 280)" }}
              >
                {state.isPlaying
                  ? <Pause size={17} fill="currentColor" />
                  : <Play size={17} fill="currentColor" className="ml-0.5" />
                }
              </button>
              <button onClick={nextTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                <SkipForward size={18} />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-1.5 transition-colors ${state.isRepeat ? "text-[oklch(0.80_0.145_82)]" : "text-white/30 hover:text-white/70"}`}
              >
                <Repeat size={14} />
              </button>
            </div>

            {/* Progress bar with animated gold playhead */}
            <div className="flex items-center gap-2 w-full max-w-[520px]">
              <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: "oklch(0.68 0.02 280)" }}>
                {fmtTime(state.currentTime)}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                style={{ background: "oklch(0.28 0.04 270 / 80%)" }}
                onClick={handleSeek}
              >
                <div
                  className="h-full rounded-full relative transition-all"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, oklch(0.50 0.20 295), oklch(0.80 0.145 82))",
                  }}
                >
                  {state.isPlaying && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full progress-playhead"
                      style={{ background: "oklch(0.80 0.145 82)", boxShadow: "0 0 6px 2px oklch(0.80 0.145 82 / 0.7)" }}
                    />
                  )}
                  {!state.isPlaying && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full
                        opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "oklch(0.96 0.008 270)" }}
                    />
                  )}
                </div>
              </div>
              <span className="text-[11px] w-8 tabular-nums" style={{ color: "oklch(0.68 0.02 280)" }}>
                {fmtTime(state.duration)}
              </span>
            </div>
          </div>

          {/* ── Right controls ── */}
          <div className="flex items-center gap-2.5 w-[220px] justify-end flex-shrink-0">
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
                    ? "text-[oklch(0.80_0.145_82)] hover:text-[oklch(0.88_0.16_85)]"
                    : "text-white/15 cursor-not-allowed"
                }`}
                title={tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips not enabled yet"}
              >
                <DollarSign size={14} />
              </button>
            )}

            {/* Add to Playlist */}
            {currentSongId && (
              <AddToPlaylistButton songId={currentSongId} variant="compact" />
            )}

            {/* Listen Together shortcut */}
            <button
              onClick={() => navigate("/together")}
              className="p-1.5 transition-colors"
              style={{ color: "oklch(0.68 0.02 280)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.82 0.155 175)")}
              onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.68 0.02 280)")}
              title="Listen Together"
            >
              <Users size={14} />
            </button>

            {/* Volume */}
            <button
              onClick={toggleMute}
              className="p-1 transition-colors"
              style={{ color: "oklch(0.68 0.02 280)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.96 0.008 270)")}
              onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.68 0.02 280)")}
            >
              {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <div
              className="w-20 h-1.5 rounded-full cursor-pointer relative group"
              style={{ background: "oklch(0.28 0.04 270 / 80%)" }}
              onClick={handleVolume}
            >
              <div
                className="h-full rounded-full transition-colors"
                style={{
                  width: state.isMuted ? "0%" : `${state.volume * 100}%`,
                  background: "oklch(0.68 0.02 280)",
                }}
              />
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full
                  opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  right: state.isMuted ? "100%" : `${100 - state.volume * 100}%`,
                  background: "oklch(0.96 0.008 270)",
                }}
              />
            </div>

            {/* Expand to Theater Player */}
            <button
              onClick={openTheater}
              className="p-1.5 transition-colors ml-1"
              style={{ color: "oklch(0.68 0.02 280)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.80 0.145 82)")}
              onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.68 0.02 280)")}
              title="Open Theater Player"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Tip Modal */}
      {tipOpen && currentSongId && (
        <PlayerTipModal
          songId={currentSongId}
          artistName={currentTrack?.artist || "this creator"}
          stripeAccountId={creatorStripeAccountId}
          onClose={() => setTipOpen(false)}
        />
      )}
    </div>
  );
}
