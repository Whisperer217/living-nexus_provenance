/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TrackCard
   Divine noir track card with hover glow and play button
═══════════════════════════════════════════════════════════════════ */

import { Play, Heart, DollarSign } from "lucide-react";
import { Track, usePlayer } from "@/contexts/PlayerContext";

interface Props {
  track: Track;
  index: number;
  onTip?: (index: number) => void;
}

export default function TrackCard({ track, index, onTip }: Props) {
  const { state, playTrack, toggleLike } = usePlayer();
  const isPlaying = state.currentIdx === index && state.isPlaying;
  const isActive = state.currentIdx === index;
  const isLiked = state.liked.has(track.id);

  return (
    <div
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200
        border bg-[oklch(0.14_0.013_280)]
        ${isActive
          ? "border-[#E8C547]/40 shadow-[0_0_0_1px_rgba(232,197,71,0.2),0_8px_32px_rgba(0,0,0,0.6)]"
          : "border-white/[0.06] hover:border-[#A78BFA]/30 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
        }`}
      onClick={() => playTrack(index)}
    >
      {/* Artwork */}
      <div className="aspect-square relative overflow-hidden" style={{ background: track.bg || "oklch(0.18 0.014 280)" }}>
        {track.artUrl && track.artType !== "video" && (
          <img src={track.artUrl} alt={track.title} className="w-full h-full object-cover" />
        )}
        {track.artUrl && track.artType === "video" && (
          <video src={track.artUrl} className="w-full h-full object-cover" muted loop />
        )}
        {!track.artUrl && (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {track.emoji || "🎵"}
          </div>
        )}

        {/* Overlay */}
        <div className={`absolute inset-0 transition-opacity duration-200
          bg-gradient-to-b from-transparent via-transparent to-black/70
          ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        />

        {/* Play button */}
        <div className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-200 z-10
          ${isActive ? "opacity-100 bg-[#E8C547]" : "opacity-0 group-hover:opacity-100 bg-[#A78BFA]"}`}
        >
          {isPlaying
            ? <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
            : <Play size={14} fill="currentColor" className="text-black ml-0.5" />
          }
        </div>

        {/* Badge */}
        {track.isOwn && (
          <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
            bg-black/70 text-[#E8C547] border border-[#E8C547]/30 z-10 font-heading tracking-wider">
            YOURS
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="text-[13px] font-heading text-white/90 truncate mb-1 tracking-wide">
          {track.title}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
            bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white flex-shrink-0">
            {track.artist.charAt(0)}
          </div>
          <span className="truncate">{track.artist}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/30 font-body">
            {track.genre}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); toggleLike(track.id); }}
              className={`p-1 transition-colors ${isLiked ? "text-[#A78BFA]" : "text-white/30 hover:text-[#A78BFA]"}`}
            >
              <Heart size={12} fill={isLiked ? "currentColor" : "none"} />
            </button>
            {onTip && (
              <button
                onClick={e => { e.stopPropagation(); onTip(index); }}
                className="p-1 text-white/30 hover:text-[#E8C547] transition-colors"
              >
                <DollarSign size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
