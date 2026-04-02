/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TrackCard
   Three-zone interaction doctrine:
     Zone 1: Cover art  → loads track in global player (does NOT navigate)
     Zone 2: Song title → navigates to /track/{id}
     Zone 3: Artist     → navigates to /creator/{creatorId}
   Badges: WID (clickable → /verify/:id), AI disclosure, YOURS
   Genre: split on comma → individual pill tags (max 4 + overflow)
   Modal: AddToMyListModal uses ContextualModal — anchored to origin button
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Play, Heart, DollarSign, ExternalLink, ListPlus, SkipForward, Shield, Bot, Sparkles, Fingerprint } from "lucide-react";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { Track, usePlayer } from "@/contexts/PlayerContext";
import { Link, useLocation } from "wouter";
import { useLike } from "@/hooks/useLike";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MediaAsset } from "@/components/MediaAsset";

interface Props {
  track: Track;
  index: number;
  /** Called when user clicks the gift button. Receives the index and the button's DOMRect for contextual modal anchoring. */
  onTip?: (index: number, rect: DOMRect) => void;
  /** Pre-fetched like count — skips the individual getLikeCount query when provided */
  prefetchedLikeCount?: number;
  /** Pre-fetched liked status — skips the individual getLikeStatus query when provided */
  prefetchedLiked?: boolean;
}

/** Split a comma-separated genre string into trimmed, non-empty tags */
function parseGenreTags(genre: string | undefined | null): string[] {
  if (!genre) return [];
  return genre.split(",").map(t => t.trim()).filter(Boolean);
}

/** Render genre tags as individual pills. Shows max `maxVisible` with an overflow count. */
function GenrePills({ genre, maxVisible = 4 }: { genre: string | undefined | null; maxVisible?: number }) {
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
            background: "oklch(0.18 0.04 275 / 0.8)",
            color: "oklch(0.72 0.06 280)",
            border: "1px solid oklch(0.30 0.04 275 / 0.6)",
          }}
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-body leading-none"
          style={{
            background: "oklch(0.14 0.03 275 / 0.6)",
            color: "oklch(0.55 0.04 280)",
            border: "1px solid oklch(0.25 0.03 275 / 0.4)",
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** Map aiDisclosure value to a compact badge label + color */
function AiDisclosureBadge({ value }: { value: string }) {
  if (value === "original") {
    return (
      <div
        className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider"
        style={{ background: "rgba(0,0,0,0.72)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.45)" }}
        title="Original human creation — no AI generation"
      >
        <Fingerprint size={8} />
        <span>ORIG</span>
      </div>
    );
  }
  if (value === "ai_assisted") {
    return (
      <div
        className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider"
        style={{ background: "rgba(0,0,0,0.72)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.45)" }}
        title="AI-assisted creation"
      >
        <Sparkles size={8} />
        <span>AI+</span>
      </div>
    );
  }
  if (value === "ai_generated") {
    return (
      <div
        className="absolute top-2 right-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider"
        style={{ background: "rgba(0,0,0,0.72)", color: "oklch(0.65 0.2 300)", border: "1px solid oklch(0.65 0.2 300 / 0.45)" }}
        title="AI-generated content"
      >
        <Bot size={8} />
        <span>AI</span>
      </div>
    );
  }
  return null;
}

export default function TrackCard({ track, index, onTip, prefetchedLikeCount, prefetchedLiked }: Props) {
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
    addAndPlay(track);
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
        style={{ height: "180px" }}
        onClick={handleCoverClick}
        title="Play this track"
      >
        <MediaAsset
          src={track.artType !== "video" ? track.artUrl : null}
          alt={track.title}
          mode="card"
          aspectRatio="1:1"
          focalX={track.coverPositionX ?? 50}
          focalY={track.coverPositionY ?? 50}
          emoji={track.emoji}
          bg={track.bg}
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
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

        {/* YOURS badge — top-left */}
        {track.isOwn && (
          <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
            bg-black/70 text-[#D4AF37] border border-[#D4AF37]/30 z-10 font-heading tracking-wider">
            YOURS
          </div>
        )}

        {/* WID badge — bottom-left, clickable → /verify/:witnessId */}
        {hasWid && (
          <Link
            href={`/verify/${track.witnessId}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="absolute bottom-2 left-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider wid-glow transition-opacity opacity-80 hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.72)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.55)" }}
            title={`Verified Witness ID: ${track.witnessId}`}
          >
            <Shield size={8} />
            <span>WID</span>
          </Link>
        )}

        {/* AI Disclosure badge — top-right */}
        {hasAiDisclosure && (
          <AiDisclosureBadge value={track.aiDisclosure!} />
        )}
      </div>

      {/* ── Info panel ── */}
      <div className="p-3 flex flex-col gap-2">
        {/* Zone 2: Song title → song detail page */}
        <Link
          href={`/track/${track.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="block text-[13px] font-heading text-white/90 truncate tracking-wide
            hover:text-[#D4AF37] transition-colors cursor-pointer"
          title={`Open ${track.title}`}
        >
          {track.title}
        </Link>

        {/* Zone 3: Artist name → creator profile page */}
        <div className="flex items-center gap-2 text-[11px] text-white/75">
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

        {/* Genre pills — own row, always visible */}
        <GenrePills genre={track.genre} maxVisible={4} />

        {/* Actions row — always visible, no opacity-0 hiding */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Like button */}
          <button
            onClick={e => toggleLike(e)}
            className={`flex items-center gap-0.5 p-1 transition-colors ${isLiked ? "text-pink-400" : "text-white/50 hover:text-pink-400"}`}
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
                onClick={e => { e.stopPropagation(); onTip(index, (e.currentTarget as HTMLButtonElement).getBoundingClientRect()); }}
                className="p-1 text-white/50 hover:text-[#D4AF37] transition-colors"
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
                  className="p-1 text-white/50 hover:text-[#D4AF37] transition-colors"
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
                  className="p-1 text-white/50 hover:text-[#D4AF37] transition-colors"
                  title="Add to my list"
                >
                  <ListPlus size={12} />
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/track/${track.id}`); }}
              className="p-1 text-white/50 hover:text-[#A78BFA] transition-colors"
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
