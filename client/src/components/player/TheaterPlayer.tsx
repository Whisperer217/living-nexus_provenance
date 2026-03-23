/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TheaterPlayer
   Full-screen desktop theater overlay. Reuses global audio engine —
   no independent audio elements. Single source of truth.
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  X, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, DollarSign,
  ChevronDown, MessageCircle, Music,
} from "lucide-react";
import PlayerTipModal from "./PlayerTipModal";

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
  } = usePlayer();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"lyrics" | "comments">("lyrics");
  const [tipOpen, setTipOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail for lyrics, video, tip status
  const { data: songDetail } = trpc.songs.getById.useQuery(
    { id: currentSongId! },
    { enabled: !!currentSongId && !isNaN(currentSongId), staleTime: 60_000 }
  );

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

  const creatorStripeAccountId = songDetail?.creator?.stripeAccountId ?? null;
  const tipsEnabled = !!creatorStripeAccountId;

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
      authorName: user?.name ?? "Anonymous",
    });
  };

  return (
    <AnimatePresence>
      {isTheaterOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 280 }}
          className="fixed inset-0 z-[200] flex flex-col md:flex-row overflow-hidden"
          style={{ background: "oklch(0.075 0.04 268)" }}
        >
          {/* ── LEFT — Media + Controls ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Art / Video */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden"
              style={{ background: "oklch(0.09 0.04 268)" }}>
              {currentTrack?.artUrl && currentTrack.artType === "video" ? (
                <video
                  src={currentTrack.artUrl}
                  className="w-full h-full object-cover"
                  muted
                  autoPlay
                  loop
                />
              ) : currentTrack?.artUrl ? (
                <img
                  src={currentTrack.artUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  style={{ maxHeight: "calc(100vh - 220px)" }}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-8xl"
                  style={{ background: currentTrack?.bg || "oklch(0.12 0.06 270)" }}
                >
                  {currentTrack?.emoji || "🎵"}
                </div>
              )}
              {/* Gradient overlay at bottom */}
              <div
                className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
                style={{ background: "linear-gradient(to top, oklch(0.075 0.04 268), transparent)" }}
              />
            </div>

            {/* Track info + controls */}
            <div className="px-6 py-5 flex-shrink-0" style={{ background: "oklch(0.075 0.04 268)" }}>
              {/* Title / Artist / WID */}
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1 mr-4">
                  <h2
                    className="text-xl font-bold truncate mb-0.5"
                    style={{ color: "oklch(0.96 0.008 270)", fontFamily: "'Cinzel', serif" }}
                  >
                    {currentTrack?.title || "No track selected"}
                  </h2>
                  <button
                    onClick={goToCreator}
                    disabled={!songDetail?.creator?.id}
                    className="text-sm transition-opacity hover:opacity-80 disabled:cursor-default"
                    style={{ color: "oklch(0.82 0.155 175)" }}
                  >
                    {currentTrack?.artist || "—"}
                  </button>
                  {currentTrack?.witnessId && (
                    <button
                      onClick={goToVerify}
                      className="block text-[10px] font-mono mt-1 transition-opacity hover:opacity-80"
                      style={{ color: "oklch(0.80 0.145 82 / 0.6)" }}
                      title="View Witness Certificate"
                    >
                      WID: {currentTrack.witnessId.slice(0, 20)}…
                    </button>
                  )}
                </div>
                {/* Like + Tip */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { if (user && currentSongId && !isNaN(currentSongId)) toggleLikeMutation.mutate({ songId: currentSongId }); }}
                    disabled={!user || toggleLikeMutation.isPending}
                    className={`p-2 transition-colors ${isLiked ? "text-[oklch(0.82_0.155_175)]" : "text-white/30 hover:text-white/60"} disabled:opacity-40`}
                    title={!user ? "Sign in to like" : isLiked ? "Unlike" : "Like"}
                  >
                    <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
                  </button>
                  {currentTrack && (
                    <button
                      onClick={() => setTipOpen(true)}
                      disabled={!tipsEnabled}
                      className={`p-2 transition-colors ${tipsEnabled ? "text-[oklch(0.80_0.145_82)] hover:text-[oklch(0.88_0.16_85)]" : "text-white/15 cursor-not-allowed"}`}
                      title={tipsEnabled ? `Tip ${currentTrack.artist}` : "Tips not enabled"}
                    >
                      <DollarSign size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: "oklch(0.68 0.02 280)" }}>
                  {fmtTime(state.currentTime)}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full cursor-pointer relative group"
                  style={{ background: "oklch(0.22 0.04 270)" }}
                  onClick={handleSeek}
                >
                  <div
                    className="h-full rounded-full relative"
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
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleShuffle}
                    className={`p-1.5 transition-colors ${state.isShuffle ? "text-[oklch(0.80_0.145_82)]" : "text-white/30 hover:text-white/70"}`}
                  >
                    <Shuffle size={16} />
                  </button>
                  <button onClick={prevTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                    <SkipBack size={22} />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                    style={{ background: "oklch(0.96 0.008 270)", color: "oklch(0.08 0.01 280)" }}
                  >
                    {state.isPlaying
                      ? <Pause size={20} fill="currentColor" />
                      : <Play size={20} fill="currentColor" className="ml-0.5" />
                    }
                  </button>
                  <button onClick={nextTrack} className="p-1.5 text-white/50 hover:text-white transition-colors">
                    <SkipForward size={22} />
                  </button>
                  <button
                    onClick={toggleRepeat}
                    className={`p-1.5 transition-colors ${state.isRepeat ? "text-[oklch(0.80_0.145_82)]" : "text-white/30 hover:text-white/70"}`}
                  >
                    <Repeat size={16} />
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
                    {state.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <div
                    className="w-24 h-1.5 rounded-full cursor-pointer relative group"
                    style={{ background: "oklch(0.22 0.04 270)" }}
                    onClick={handleVolume}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: state.isMuted ? "0%" : `${state.volume * 100}%`,
                        background: "oklch(0.68 0.02 280)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT — Lyrics + Comments ── */}
          <div
            className="w-full md:w-[380px] flex flex-col flex-shrink-0 overflow-hidden"
            style={{ borderLeft: "1px solid oklch(0.22 0.04 270 / 60%)" }}
          >
            {/* Tab bar */}
            <div
              className="flex flex-shrink-0"
              style={{ borderBottom: "1px solid oklch(0.22 0.04 270 / 60%)" }}
            >
              {(["lyrics", "comments"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 py-3 text-sm font-medium capitalize transition-colors flex items-center justify-center gap-1.5"
                  style={{
                    color: activeTab === tab ? "oklch(0.80 0.145 82)" : "oklch(0.55 0.02 280)",
                    borderBottom: activeTab === tab ? "2px solid oklch(0.80 0.145 82)" : "2px solid transparent",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {tab === "lyrics" ? <Music size={13} /> : <MessageCircle size={13} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Lyrics panel */}
            {activeTab === "lyrics" && (
              <div className="flex-1 overflow-y-auto p-5">
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
                    className="rounded-xl p-6 text-center mt-4"
                    style={{
                      background: "oklch(0.10 0.02 275)",
                      border: "1px dashed oklch(0.22 0.02 275)",
                    }}
                  >
                    <p className="text-[13px] italic mb-1.5" style={{ color: "oklch(0.50 0.02 280)" }}>
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
            {activeTab === "comments" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {commentsData && commentsData.length > 0 ? (
                    commentsData.map((c) => (
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
                    <div className="text-center py-8">
                      <MessageCircle size={28} className="mx-auto mb-2 opacity-20" style={{ color: "oklch(0.80 0.145 82)" }} />
                      <p className="text-[13px] italic" style={{ color: "oklch(0.45 0.02 280)" }}>
                        No comments yet. Be the first.
                      </p>
                    </div>
                  )}
                </div>

                {/* Comment input */}
                <div
                  className="p-3 flex-shrink-0"
                  style={{ borderTop: "1px solid oklch(0.22 0.04 270 / 60%)" }}
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
              </div>
            )}
          </div>

          {/* ── Close button ── */}
          <button
            onClick={closeTheater}
            className="absolute top-4 right-4 rounded-full p-2 transition-colors z-10"
            style={{
              background: "oklch(0.12 0.04 270 / 80%)",
              color: "oklch(0.68 0.02 280)",
              border: "1px solid oklch(0.22 0.04 270)",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.96 0.008 270)")}
            onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.68 0.02 280)")}
            title="Close Theater"
          >
            <X size={18} />
          </button>

          {/* ── Minimize button (bottom of left panel) ── */}
          <button
            onClick={closeTheater}
            className="absolute bottom-[220px] left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-[11px] flex items-center gap-1.5 transition-colors md:hidden"
            style={{
              background: "oklch(0.12 0.04 270 / 80%)",
              color: "oklch(0.68 0.02 280)",
              border: "1px solid oklch(0.22 0.04 270)",
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
    </AnimatePresence>
  );
}
