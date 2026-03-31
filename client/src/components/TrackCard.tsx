/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TrackCard
   Three-zone interaction doctrine:
     Zone 1: Cover art  → loads track in global player (does NOT navigate)
     Zone 2: Song title → navigates to /track/{id}
     Zone 3: Artist     → navigates to /creator/{creatorId}
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Play, Heart, DollarSign, ExternalLink, ListPlus, SkipForward } from "lucide-react";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { Track, usePlayer } from "@/contexts/PlayerContext";
import { Link, useLocation } from "wouter";
import { useLike } from "@/hooks/useLike";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Props {
  track: Track;
  index: number;
  onTip?: (index: number) => void;
}

export default function TrackCard({ track, index, onTip }: Props) {
  const { state, addAndPlay, playNext, openNowPlayingPanel } = usePlayer();
  const [showAddToList, setShowAddToList] = useState(false);
  const [, navigate] = useLocation();
  const isPlaying = state.currentIdx === index && state.isPlaying;
  const isActive = state.currentIdx === index;

  // Zone 1: Cover art click — load into global player only, no navigation
  const handleCoverClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addAndPlay(track);
    openNowPlayingPanel();
  };

  // DB-backed like state
  const numericId = typeof track.id === "string" ? parseInt(track.id, 10) : track.id;
  const { liked: isLiked, toggle: toggleLike } = useLike(isNaN(numericId) ? 0 : numericId);
  const { data: likeCountData } = trpc.songs.getLikeCount.useQuery(
    { songId: isNaN(numericId) ? 0 : numericId },
    { enabled: !isNaN(numericId) && numericId > 0 }
  );
  const likeCount = likeCountData?.count ?? 0;

  // Derive cover object-position from track metadata
  const coverPos = `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%`;

  return (
    <>
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-200
        border bg-[oklch(0.095_0.028_275)] track-card-glow
        ${isActive
          ? "border-[#D4AF37]/40 shadow-[0_0_0_1px_rgba(232,197,71,0.2),0_8px_32px_rgba(0,0,0,0.6),0_0_24px_oklch(0.82_0.14_85_/_0.12)]"
          : "border-white/[0.05] hover:border-[#A78BFA]/30"
        }`}
    >
      {/* ── Zone 1: Cover Art — plays in global player ── */}
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{ height: "180px", background: track.bg || "oklch(0.15 0.05 275)" }}
        onClick={handleCoverClick}
        title="Play this track"
      >
        {track.artUrl && track.artType !== "video" && (
          <img
            src={track.artUrl}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ objectPosition: coverPos }}
          />
        )}
        {track.artUrl && track.artType === "video" && (
          <video
            src={track.artUrl}
            className="w-full h-full object-cover"
            style={{ objectPosition: coverPos }}
            muted
            loop
          />
        )}
        {!track.artUrl && (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {track.emoji || "🎵"}
          </div>
        )}

        {/* Overlay gradient */}
        <div className={`absolute inset-0 transition-opacity duration-200
          bg-gradient-to-b from-transparent via-transparent to-black/70
          ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        />

        {/* Play button */}
        <div className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-200 z-10
          ${isActive ? "opacity-100 bg-[#D4AF37]" : "opacity-0 group-hover:opacity-100 bg-[#A78BFA]"}`}
        >
          {isPlaying
            ? <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
            : <Play size={14} fill="currentColor" className="text-black ml-0.5" />
          }
        </div>

        {/* YOURS badge */}
        {track.isOwn && (
          <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
            bg-black/70 text-[#D4AF37] border border-[#D4AF37]/30 z-10 font-heading tracking-wider">
            YOURS
          </div>
        )}
      </div>

      {/* ── Info panel ── */}
      <div className="p-3">
        {/* Zone 2: Song title → song detail page */}
        <Link
          href={`/track/${track.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="block text-[13px] font-heading text-white/90 truncate mb-1 tracking-wide
            hover:text-[#D4AF37] transition-colors cursor-pointer"
          title={`Open ${track.title}`}
        >
          {track.title}
        </Link>

        {/* Zone 3: Artist name → creator profile page */}
        <div className="flex items-center gap-2 text-[11px] text-white/75 mb-2">
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
            bg-gradient-to-br from-[#7C3AED] to-[#A78BFA] text-white flex-shrink-0">
            {track.artist.charAt(0)}
          </div>
          {track.creatorId ? (
            <Link
              href={`/creator/${track.creatorId}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="truncate hover:text-[#D4AF37] transition-colors cursor-pointer"
              title={`View ${track.artist}'s profile`}
            >
              {track.artist}
            </Link>
          ) : (
            <span className="truncate">{track.artist}</span>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70 font-body">
            {track.genre}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => toggleLike(e)}
              className={`flex items-center gap-0.5 p-1 transition-colors ${isLiked ? "text-pink-400" : "text-white/70 hover:text-pink-400"}`}
              title={isLiked ? "Unlike" : "Like"}
            >
              <Heart size={12} fill={isLiked ? "currentColor" : "none"} />
              {likeCount > 0 && (
                <span className="text-[10px] leading-none font-medium tabular-nums">
                  {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
                </span>
              )}
            </button>
            {onTip && (
              <button
                onClick={e => { e.stopPropagation(); onTip(index); }}
                className="p-1 text-white/70 hover:text-[#D4AF37] transition-colors"
                title="Send a gift"
              >
                <DollarSign size={12} />
              </button>
            )}
            {!isNaN(numericId) && numericId > 0 && (
              <>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    playNext(track);
                    toast.success(`"${track.title}" plays next`);
                  }}
                  className="p-1 text-white/70 hover:text-[#D4AF37] transition-colors"
                  title="Play next"
                >
                  <SkipForward size={12} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setShowAddToList(true); }}
                  className="p-1 text-white/70 hover:text-[#D4AF37] transition-colors"
                  title="Add to my list"
                >
                  <ListPlus size={12} />
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/track/${track.id}`); }}
              className="p-1 text-white/70 hover:text-[#A78BFA] transition-colors"
              title="Open track page"
            >
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
    {showAddToList && !isNaN(numericId) && numericId > 0 && (
      <AddToMyListModal
        songId={numericId}
        songTitle={track.title}
        onClose={() => setShowAddToList(false)}
      />
    )}
  </>
  );
}
