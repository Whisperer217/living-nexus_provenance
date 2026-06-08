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
          className="text-[11px] px-1.5 py-0.5 rounded-full font-body leading-none"
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
          className="text-[11px] px-1.5 py-0.5 rounded-full font-body leading-none"
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

  // Testimony snippet: first non-empty line of description or lyricsText
  const testimonySnippet = (() => {
    const raw = (track as any).description || (track as any).lyricsText || null;
    if (!raw) return null;
    const line = raw.split(/\n+/).find((l: string) => l.trim().length > 0)?.trim() ?? "";
    if (!line) return null;
    return line.length > 110 ? line.slice(0, 107) + "\u2026" : line;
  })();

  return (
    <>
    {/*
      ╔══════════════════════════════════════╗
      ║  TESTIMONY CARD (TrackCard)          ║
      ║  Background: blurred artwork         ║
      ║  1. Testimony text (primary)         ║
      ║  2. Play button (Manifestation)      ║
      ║  3. Creator + resonance              ║
      ╚══════════════════════════════════════╝
    */}
    <div
      className={`group relative rounded-xl overflow-hidden transition-all duration-300
        ${
          isActive
            ? "shadow-[0_0_32px_rgba(196,154,40,0.22),0_4px_24px_rgba(0,0,0,0.7)]"
            : isHot
              ? "gold-banner"
              : ""
        }`}
      style={{
        border: isActive
          ? "1px solid rgba(196,154,40,0.5)"
          : `1px solid ${ctColors.dim}`,
        minHeight: "180px",
      }}
    >
      {/* ── Background: full artwork — clear, vibrant, no blur ── */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        {track.artUrl && track.artType !== "video" ? (
          <>
            <img
              src={track.artUrl}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={{
                filter: "brightness(0.88)",
                objectPosition: coverPos,
              }}
              onError={(e) => {
                // Hide broken image and show gradient fallback
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "block";
              }}
            />
            <div
              className="w-full h-full hidden absolute inset-0"
              style={{ background: "linear-gradient(135deg, #111111 0%, #0A0A0A 50%, #000000 100%)" }}
            />
          </>
        ) : track.artUrl && track.artType === "video" ? (
          <video
            src={track.artUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.88)", objectPosition: coverPos }}
            muted
            loop
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, #111111 0%, #0A0A0A 50%, #000000 100%)" }}
          />
        )}
      </div>

      {/* ── LAYER 2: Gradient — exact canonical spec ── */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.0) 80%)" }}
      />

      {/* ── Hot ribbon ── */}
      {isHot && !track.isOwn && (
        <div className="absolute top-0 left-0 z-20 flex items-center gap-0.5 px-2 py-0.5 rounded-tl-xl"
          style={{
            background: "linear-gradient(90deg, rgba(100,74,10,0.95), rgba(196,154,40,0.90))",
            borderBottomRightRadius: "8px",
          }}
        >
          <Crown size={9} style={{ color: "#0A0806" }} />
          <span           className="text-[11px] font-heading font-bold tracking-widest" style={{ color: "#0A0806" }}>
            {(track.plays ?? 0) >= 1000 ? `${Math.floor((track.plays ?? 0) / 1000)}K PLAYS` : `${track.plays} PLAYS`}
          </span>
        </div>
      )}
      {track.isOwn && (
        <div className="absolute top-2 left-2 z-20 text-[11px] font-bold px-2 py-0.5 rounded bg-black/70 text-[#C49A28] border border-[#C49A28]/30 font-heading tracking-wider">
          YOURS
        </div>
      )}

      {/* ── LAYER 4: Play button — centered 56px gold ring ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <button
          onClick={handleCoverClick}
          className="pointer-events-auto flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            width: "56px",
            height: "56px",
            background: isPlaying ? "rgba(196,154,40,0.22)" : "rgba(0,0,0,0.35)",
            border: isPlaying ? "2px solid rgba(196,154,40,0.9)" : "2px solid rgba(196,154,40,0.65)",
            boxShadow: isPlaying
              ? "0 0 0 6px rgba(196,154,40,0.15), 0 0 24px rgba(196,154,40,0.4)"
              : "0 0 16px rgba(196,154,40,0.2)",
            animation: isPlaying ? "pulse-gold 1.8s ease-in-out infinite" : "none",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <div className="live-wave scale-[0.65]"><span /><span /><span /></div>
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" style={{ color: "#C9A84C" }} />
          )}
        </button>
      </div>

      {/* ── LAYERS 3 + 5 + 6: Bottom content stack ── */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3 flex flex-col gap-1.5">

        {/* LAYER 3: Testimony — 2-line max, #F5F5F5 @ 0.92 */}
        {testimonySnippet && (
          <p
            className="type-caption leading-snug line-clamp-2 cursor-pointer"
            onClick={handleCoverClick}
            style={{
              color: "rgba(245,245,245,0.92)",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              letterSpacing: "0.01em",
              lineHeight: "1.5",
              textShadow: "0 1px 6px rgba(0,0,0,0.95)",
            }}
          >
            &ldquo;{testimonySnippet}&rdquo;
          </p>
        )}

        {/* LAYERS 5 + 6: Attribution (left) + Resonance (right) */}
        <div className="flex items-center justify-between gap-2">

          {/* Layer 5: Attribution — creator + WID */}
          <div className="flex items-center gap-1.5 min-w-0">
            <CreatorHandle
              userId={track.creatorId}
              handle={track.creatorHandle}
              displayName={track.artist}
              role={track.creatorRole}
              size="sm"
            />
            {hasWid && (
              <Link
                href={`/verify/${track.witnessId}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="flex items-center gap-0.5 flex-shrink-0"
                title={`Verified Witness ID: ${track.witnessId}`}
              >
                <Shield size={8} style={{ color: "rgba(196,154,40,0.6)" }} />
                <span className="type-overline" style={{ color: "rgba(196,154,40,0.5)" }}>WID</span>
              </Link>
            )}
          </div>

          {/* Layer 6: Resonance — likes / tip / actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={e => toggleLike(e)}
              className={`flex items-center gap-0.5 p-0.5 transition-colors ${isLiked ? "text-pink-400" : "text-[#6B6555] hover:text-pink-400"}`}
              title={isLiked ? "Unlike" : "Like"}
            >
              <Heart size={11} fill={isLiked ? "currentColor" : "none"} />
              {likeCount > 0 && (
                <span className="text-[11px] leading-none tabular-nums">
                  {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
                </span>
              )}
            </button>
            {onTip && (
              <button
                onClick={e => { e.stopPropagation(); onTip(track, (e.currentTarget as HTMLButtonElement).getBoundingClientRect()); }}
                className="p-0.5 text-[#6B6555] hover:text-[#C49A28] transition-colors"
                title="Send a gift"
              >
                <DollarSign size={11} />
              </button>
            )}
            {!isNaN(numericId) && numericId > 0 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); playNext(track); toast.success(`"${track.title}" plays next`); }}
                  className="p-0.5 text-[#6B6555] hover:text-[#C49A28] transition-colors"
                  title="Play next"
                >
                  <SkipForward size={11} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }}
                  className="p-0.5 text-[#6B6555] hover:text-[#C49A28] transition-colors"
                  title="Add to my list"
                >
                  <ListPlus size={11} />
                </button>
              </>
            )}
            <button
              onClick={e => { e.stopPropagation(); navigate(`/song/${track.id}`); }}
              className="p-0.5 text-[#6B6555] hover:text-[#B8860B] transition-colors"
              title="Open track page"
            >
              <ExternalLink size={11} />
            </button>
          </div>
        </div>

        {/* visualReady shimmer dot */}
        {track.visualReady === false && (
          <span
            style={{
              display: "inline-block", width: 5, height: 5, borderRadius: "50%",
              background: "rgba(245,196,81,0.7)",
              animation: "trackCardDot 1.1s ease-in-out infinite",
            }}
          />
        )}
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
