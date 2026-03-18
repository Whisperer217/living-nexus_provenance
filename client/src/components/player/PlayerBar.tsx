/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlayerBar (The Altar)
   Persistent audio player at the bottom of every page
═══════════════════════════════════════════════════════════════════ */

import { usePlayer } from "@/contexts/PlayerContext";
import { DEMO_TRACKS } from "@/contexts/PlayerContext";
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Volume2, VolumeX, Heart, Users,
} from "lucide-react";
import { useLocation } from "wouter";

function fmtTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function PlayerBar() {
  const { state, audioRef, allTracks, togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat, toggleMute, setVolume, seek, toggleLike } = usePlayer();
  const [, navigate] = useLocation();

  const tracks = allTracks();
  const currentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const isLiked = currentTrack ? state.liked.has(currentTrack.id) : false;
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * audioRef.current.duration);
  };

  const handleVolume = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  return (
    <div className="flex-shrink-0 h-[82px] flex items-center px-4 gap-4 relative z-20
      bg-[oklch(0.10_0.025_265)] border-t border-white/[0.06]"
      style={{ boxShadow: "0 -4px 40px rgba(0,0,0,0.7), 0 -4px 32px oklch(0.55 0.22 295 / 0.10), 0 -1px 8px oklch(0.82 0.14 85 / 0.08)" }}
    >
      {/* ── Track info ── */}
      <div className="flex items-center gap-3 w-[220px] flex-shrink-0 min-w-0">
        <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl"
          style={{ background: currentTrack?.bg || "oklch(0.13 0.028 270)" }}>
          {currentTrack?.artUrl && currentTrack.artType !== "video"
            ? <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover" />
            : currentTrack?.artUrl && currentTrack.artType === "video"
            ? <video src={currentTrack.artUrl} className="w-full h-full object-cover" muted />
            : <span>{currentTrack?.emoji || "🎵"}</span>
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium text-white/90 truncate font-body">
            {currentTrack?.title || "No track selected"}
          </div>
          <div className="text-[11px] text-white/35 truncate font-body">
            {currentTrack?.artist || "—"}
          </div>
        </div>
        <button
          onClick={() => currentTrack && toggleLike(currentTrack.id)}
          className={`p-1 transition-colors flex-shrink-0 ${isLiked ? "text-[#A78BFA]" : "text-white/25 hover:text-white/60"}`}
        >
          <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* ── Controls ── */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-1 transition-colors ${state.isShuffle ? "text-[#E8C547]" : "text-white/30 hover:text-white/70"}`}
          >
            <Shuffle size={14} />
          </button>
          <button onClick={prevTrack} className="p-1 text-white/50 hover:text-white transition-colors">
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ background: "oklch(0.94 0.006 280)", color: "oklch(0.08 0.01 280)" }}
          >
            {state.isPlaying
              ? <Pause size={16} fill="currentColor" />
              : <Play size={16} fill="currentColor" className="ml-0.5" />
            }
          </button>
          <button onClick={nextTrack} className="p-1 text-white/50 hover:text-white transition-colors">
            <SkipForward size={18} />
          </button>
          <button
            onClick={toggleRepeat}
            className={`p-1 transition-colors ${state.isRepeat ? "text-[#E8C547]" : "text-white/30 hover:text-white/70"}`}
          >
            <Repeat size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full max-w-[480px]">
          <span className="text-[11px] text-white/30 w-8 text-right tabular-nums">{fmtTime(state.currentTime)}</span>
          <div
            className="flex-1 h-1 rounded-full bg-white/10 cursor-pointer relative group"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full relative transition-all"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #7C3AED, #E8C547)",
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white
                opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
            </div>
          </div>
          <span className="text-[11px] text-white/30 w-8 tabular-nums">{fmtTime(state.duration)}</span>
        </div>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-3 w-[200px] justify-end flex-shrink-0">
        {/* Live wave */}
        {state.isPlaying && (
          <div className="live-wave">
            <span /><span /><span /><span /><span />
          </div>
        )}

        {/* Listen Together shortcut */}
        <button
          onClick={() => navigate("/together")}
          className="p-1.5 text-white/25 hover:text-[#A78BFA] transition-colors"
          title="Listen Together"
        >
          <Users size={14} />
        </button>

        {/* Volume */}
        <button onClick={toggleMute} className="p-1 text-white/35 hover:text-white transition-colors">
          {state.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <div
          className="w-20 h-1 rounded-full bg-white/10 cursor-pointer relative group"
          onClick={handleVolume}
        >
          <div
            className="h-full rounded-full bg-white/40 group-hover:bg-[#E8C547] transition-colors"
            style={{ width: state.isMuted ? "0%" : `${state.volume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
