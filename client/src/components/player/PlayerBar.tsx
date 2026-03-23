/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlayerBar (The Altar)
   Divine Steel upgrade: 56px art, clickable links, animated progress,
   volume slider, expand-to-full-panel button
═══════════════════════════════════════════════════════════════════ */

import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, Users, DollarSign, Maximize2,
} from "lucide-react";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import { useLocation } from "wouter";
import { useState, useCallback } from "react";
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

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentSongId = currentTrack?.id ? parseInt(currentTrack.id, 10) : null;

  // Song detail for tip status
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

  return (
    <div
      className="flex items-center px-4 gap-4 z-50"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "oklch(0.115 0.05 268)",
        borderTop: "1px solid oklch(0.28 0.04 270 / 60%)",
        boxShadow: "0 -4px 40px rgba(0,0,0,0.7), 0 -4px 32px oklch(0.82 0.155 175 / 0.06), 0 -1px 8px oklch(0.80 0.145 82 / 0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        minHeight: "68px",
      }}
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
          {/* Title — clickable → song page */}
          <button
            onClick={goToSong}
            disabled={!currentSongId}
            className="text-[13.5px] font-semibold truncate font-body block w-full text-left
              transition-colors hover:text-[oklch(0.80_0.145_82)] disabled:cursor-default"
            style={{ color: "oklch(0.96 0.008 270)" }}
          >
            {currentTrack?.title || "No track selected"}
          </button>
          {/* Artist — clickable → creator page */}
          <button
            onClick={goToCreator}
            disabled={!currentTrack}
            className="text-[11px] truncate font-body block w-full text-left
              transition-colors hover:opacity-80 disabled:cursor-default"
            style={{ color: "oklch(0.82 0.155 175)" }}
          >
            {currentTrack?.artist || "—"}
          </button>
          {/* WID badge — clickable → verify page */}
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
              {/* Animated gold playhead */}
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
