/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TrackCard
   Three-zone interaction doctrine:
     Zone 1: Cover art  → loads track in global player (does NOT navigate)
     Zone 2: Song title  → navigates to /song/{id}
     Zone 3: Artist     → navigates to /creator/{creatorId}
   Badges: WID (clickable → /verify/:id), AI disclosure, YOURS
   Genre: split on comma → individual pill tags (max 4 + overflow)
   Modal: AddToMyListModal uses ContextualModal — anchored to origin button
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Play, Heart, DollarSign, ExternalLink, ListPlus, SkipForward, Shield, Crown } from "lucide-react";
import { AiDisclosurePill } from "@/components/AiDisclosurePill";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { Track, usePlayer } from "@/contexts/PlayerContext";
import { Link, useLocation } from "wouter";
import { useLike } from "@/hooks/useLike";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MediaAsset } from "@/components/MediaAsset";
import { getContentTypeColors } from "@/lib/contentTypeColors";
import { CreatorHandle } from "@/components/CreatorHandle";

interface Props {
  track: Track;
  index: number;
  /** Called when user clicks the gift button. Receives the track and the button's DOMRect for contextual modal anchoring. */
  onTip?: (track: Track, rect: DOMRect) => void;
  /** Pre-fetched like count — skips the individual getLikeCount query when provided */
  prefetchedLikeCount?: number;
  /** Pre-fetched liked status — skips the individual getLikeStatus query when provided */
  prefetchedLiked?: boolean;
  /**
   * Optional override for cover-art click. When provided, the parent section
   * is responsible for calling playQueueAt with the correct ordered queue.
   * When omitted, falls back to addAndPlay (single-track, no queue context).
   */
  onPlay?: (track: Track) => void;
}

/** Split a comma-separated genre string into trimmed, non-empty tags */
function parseGenreTags(genre: string | undefined | null): string[] {
  if (!genre) return [];
  return genre.split(",").map(t => t.trim()).filter(Boolean);
}

/** Render genre tags as individual pills. Shows max `maxVisible` with an overflow count. */
function GenrePills({ genre, maxVisible = 4, chipBg, chipBorder, textColor }: {
  genre: string | undefined | null;
  maxVisible?: number;
  chipBg?: string;
  chipBorder?: string;
  textColor?: string;
}) {
  const tags = parseGenreTags(genre);
  if (tags.length === 0) return null;
  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(tag => (
        <span
          key={tag}
          className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-none"
          style={{
            background: chipBg ?? "rgba(20,18,40,0.8)",
            color: textColor ?? "#9b8fc0",
            border: `1px solid ${chipBorder ?? "rgba(50,45,80,0.6)"}`,
          }}
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-none"
          style={{
            background: "rgba(14,12,30,0.6)",
            color: "#7a7099",
            border: "1px solid rgba(40,36,65,0.4)",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// AiDisclosureBadge replaced by shared AiDisclosurePill component

export default function TrackCard({ track, index, onTip, prefetchedLikeCount, prefetchedLiked, onPlay }: Props) {
  const { state, addAndPlay, playNext, openNowPlayingPanel, currentTrackId } = usePlayer();
  const [showAddToList, setShowAddToList] = useState(false);
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);
  const [, navigate] = useLocation();
  const isActive = currentTrackId === String(track.id);
  const isPlaying = isActive && state.isPlaying;

  // Zone 1: Cover art click — load into global player only, no navigation
  const handleCoverClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlay) {
      onPlay(track);
    } else {
      addAndPlay(track);
    }
    openNowPlayingPanel();
  };

  // DB-backed like state
  const numericId = typeof track.id === "string" ? parseInt(track.id, 10) : track.id;
  const hasPrefetch = prefetchedLiked !== undefined;
  const { liked: isLiked, toggle: toggleLike } = useLike(
    isNaN(numericId) ? 0 : numericId,
    { skipQuery: hasPrefetch, initialLiked: prefetchedLiked ?? false }
  );
  const { data: likeCountData } = trpc.songs.getLikeCount.useQuery(
    { songId: isNaN(numericId) ? 0 : numericId },
    { enabled: prefetchedLikeCount === undefined && !isNaN(numericId) && numericId > 0 }
  );
  const likeCount = prefetchedLikeCount !== undefined ? prefetchedLikeCount : (likeCountData?.count ?? 0);

  // Derive cover object-position from track metadata
  const coverPos = `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%`;

  const hasWid = !!track.witnessId;
  const hasAiDisclosure = !!track.aiDisclosure;
  const isHot = (track.plays ?? 0) >= 50;
  const ctColors = getContentTypeColors((track as any).contentType ?? "audio");

  return (
    <>
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-300
        museum-card parchment-grain
        ${isActive
          ? "museum-card--active"
          : isHot
            ? "museum-card--hot gold-banner"
            : ""
        }`}
      style={isActive ? undefined : { borderColor: ctColors.dim, boxShadow: `0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px ${ctColors.dim}` }}
    >
      {/* ── Zone 1: Cover Art — plays in global player ── */}
      <div
        className="relative overflow-hidden cursor-pointer w-full"
        style={{ maxHeight: "200px" }}
        onClick={handleCoverClick}
        title="Play this track"
      >
        <MediaAsset
          src={track.artType !== "video" ? track.artUrl : null}
          alt={track.title}
          mode="card"
          aspectRatio="4:5"
          focalX={track.coverPositionX ?? 50}
          focalY={track.coverPositionY ?? 50}
          emoji={track.emoji}
          bg={track.bg}
          className="w-full transition-transform duration-300 group-hover:scale-105"
        />
        {/* Video cover art */}
        {track.artUrl && track.artType === "video" && (
          <video
            src={track.artUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: coverPos }}
            muted
            loop
          />
        )}

        {/* Overlay gradient — always present, intensifies on hover/active */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.82) 100%)",
          }}
        />

        {/* Play button */}
        <div className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center
          transition-all duration-200 z-10
          ${isActive ? "opacity-100 bg-[#1C1A14]" : "opacity-0 group-hover:opacity-100 bg-[#A78BFA]"}`}
        >
          {isPlaying
            ? <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
            : <Play size={14} fill="currentColor" className="text-black ml-0.5" />
          }
        </div>

        {/* 🔥 Hot badge — top-left corner ribbon for 50+ plays */}
        {isHot && !track.isOwn && (
          <div className="absolute top-0 left-0 z-20 flex items-center gap-0.5 px-2 py-0.5"
            style={{
              background: "linear-gradient(90deg, rgba(100,74,10,0.95), rgba(196,154,40,0.90))",
              borderBottomRightRadius: "8px",
              borderTopLeftRadius: "inherit",
            }}
          >
            <Crown size={9} style={{ color: "#0A0806" }} />
            <span className="text-[8px] font-heading font-bold tracking-widest" style={{ color: "#0A0806" }}>
              {(track.plays ?? 0) >= 1000
                ? `${Math.floor((track.plays ?? 0) / 1000)}K PLAYS`
                : `${track.plays} PLAYS`}
            </span>
          </div>
        )}

        {/* YOURS badge — top-left */}
        {track.isOwn && (
          <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
            bg-black/70 text-[#C49A28] border border-[#C49A28]/30 z-10 font-heading tracking-wider">
            YOURS
          </div>
        )}

        {/* WID badge — bottom-left, clickable → /verify/:witnessId */}
        {hasWid && (
          <Link
            href={`/verify/${track.witnessId}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="absolute bottom-2 left-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider wid-glow wid-origin-glow transition-opacity opacity-90 hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.72)", color: "#F5C451", border: "1px solid rgba(245,196,81,0.55)" }}
            title={`Verified Witness ID: ${track.witnessId}`}
          >
            <Shield size={8} />
            <span>WID</span>
          </Link>
        )}

        {/* AI Disclosure badge — top-right */}
        {hasAiDisclosure && (
          <div className="absolute top-2 right-2 z-10">
            <AiDisclosurePill value={track.aiDisclosure as any} size="compact" />
          </div>
        )}

        {/* visualReady shimmer — pulsing overlay while auto-video is being generated */}
        {track.visualReady === false && (
          <div
            className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
            style={{ borderRadius: "inherit" }}
          >
            {/* Sweep shimmer */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(245,196,81,0.09) 50%, transparent 65%)",
                backgroundSize: "200% 100%",
                animation: "trackCardShimmer 2.2s ease-in-out infinite",
              }}
            />
            {/* Bottom label */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 py-1.5"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(245,196,81,0.7)",
                  animation: "trackCardDot 1.1s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: "8px",
                  color: "rgba(245,196,81,0.75)",
                  letterSpacing: "0.12em",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                generating visual
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Info panel ── */}
      <div className="p-3 flex flex-col gap-2">
        {/* Zone 2: Song title → song detail page */}
        <Link
          href={`/song/${track.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="block text-[13px] font-heading truncate tracking-wide
            text-[#E8DFC8] hover:text-[#B8860B] transition-colors cursor-pointer"
          title={`Open ${track.title}`}
        >
          {track.title}
        </Link>

        {/* Zone 3: Artist handle chip with mini pop-up */}
        <div className="flex items-center gap-1">
          <CreatorHandle
            userId={track.creatorId}
            handle={track.creatorHandle}
            displayName={track.artist}
            role={track.creatorRole}
            size="sm"
          />
        </div>

        {/* Content-type chip + genre pills */}
        <div className="flex flex-wrap gap-1 items-center">
          <span
            className="text-[8px] px-1.5 py-0.5 rounded-full font-heading tracking-widest leading-none uppercase"
            style={{ background: ctColors.chipBg, color: ctColors.text, border: `1px solid ${ctColors.chipBorder}` }}
          >
            {ctColors.icon} {ctColors.label}
          </span>
        </div>
        <GenrePills genre={track.genre} maxVisible={3} chipBg={ctColors.chipBg} chipBorder={ctColors.chipBorder} textColor={ctColors.text} />

        {/* Actions row — always visible, no opacity-0 hiding */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Like button */}
          <button
            onClick={e => toggleLike(e)}
            className={`flex items-center gap-0.5 p-1 transition-colors ${isLiked ? "text-pink-400" : "text-[#6B6555] hover:text-pink-400"}`}
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart size={12} fill={isLiked ? "currentColor" : "none"} />
            {likeCount > 0 && (
              <span className="text-[10px] leading-none font-medium tabular-nums">
                {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
              </span>
            )}
          </button>

          {/* Right-side action cluster */}
          <div className="flex items-center gap-1">
            {onTip && (
              <button
                onClick={e => { e.stopPropagation(); onTip(track, (e.currentTarget as HTMLButtonElement).getBoundingClientRect()); }}
                className="p-1 text-[#6B6555] hover:text-[#C49A28] transition-colors"
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
                  className="p-1 text-[#6B6555] hover:text-[#C49A28] transition-colors"
                  title="Play next"
                >
                  <SkipForward size={12} />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
                    setShowAddToList(true);
                  }}
                  className="p-1 text-[#6B6555] hover:text-[#C49A28] transition-colors"
                  title="Add to my list"
                >
                  <ListPlus size={12} />
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/song/${track.id}`); }}
              className="p-1 text-[#6B6555] hover:text-[#B8860B] transition-colors"
              title="Open track page"
            >
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Contextual modal — anchored to the ListPlus button that triggered it */}
    <AddToMyListModal
      open={showAddToList && !isNaN(numericId) && numericId > 0}
      songId={numericId}
      songTitle={track.title}
      onClose={() => setShowAddToList(false)}
      originRect={addToListRect}
    />
  </>
  );
}
