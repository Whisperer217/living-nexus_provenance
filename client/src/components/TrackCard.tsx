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
      {/* ── Background: blurred artwork ── */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        {track.artUrl && track.artType !== "video" ? (
          <img
            src={track.artUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            style={{
              filter: "blur(3px) brightness(0.28)",
              transform: "scale(1.08)",
              objectPosition: coverPos,
            }}
          />
        ) : track.artUrl && track.artType === "video" ? (
          <video
            src={track.artUrl}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "blur(3px) brightness(0.28)", objectPosition: coverPos }}
            muted
            loop
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, #1a1409 0%, #0d0b07 50%, #111009 100%)" }}
          />
        )}
      </div>

      {/* ── Dark overlay ── */}
      <div
        className="absolute inset-0 rounded-xl transition-opacity duration-300 group-hover:opacity-60"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.68) 0%, rgba(0,0,0,0.80) 60%, rgba(0,0,0,0.92) 100%)" }}
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
          <span className="text-[8px] font-heading font-bold tracking-widest" style={{ color: "#0A0806" }}>
            {(track.plays ?? 0) >= 1000 ? `${Math.floor((track.plays ?? 0) / 1000)}K PLAYS` : `${track.plays} PLAYS`}
          </span>
        </div>
      )}
      {track.isOwn && (
        <div className="absolute top-2 left-2 z-20 text-[9px] font-bold px-2 py-0.5 rounded bg-black/70 text-[#C49A28] border border-[#C49A28]/30 font-heading tracking-wider">
          YOURS
        </div>
      )}

      {/* ── Content layer ── */}
      <div className="relative z-10 flex flex-col p-3 gap-3" style={{ minHeight: "180px" }}>

        {/* 1. TESTIMONY — primary surface */}
        <div className="flex-1 cursor-pointer" onClick={handleCoverClick}>
          {testimonySnippet ? (
            <p
              className="text-[12px] leading-relaxed"
              style={{
                color: "rgba(240,228,196,0.90)",
                fontFamily: "'Georgia', 'Times New Roman', serif",
                letterSpacing: "0.01em",
                lineHeight: "1.65",
                textShadow: "0 1px 8px rgba(0,0,0,0.9)",
              }}
            >
              &ldquo;{testimonySnippet}&rdquo;
            </p>
          ) : (
            <Link
              href={`/song/${track.id}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <p
                className="text-[13px] font-heading tracking-wide leading-snug"
                style={{
                  color: "rgba(240,228,196,0.80)",
                  fontFamily: "'Cinzel', serif",
                  textShadow: "0 1px 8px rgba(0,0,0,0.9)",
                }}
              >
                {track.title}
              </p>
            </Link>
          )}
        </div>

        {/* 2. PLAY + WID row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCoverClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200
              group-hover:shadow-[0_0_12px_rgba(196,154,40,0.35)]`}
            style={{
              background: isActive ? "rgba(196,154,40,0.22)" : "rgba(196,154,40,0.12)",
              border: `1px solid ${isActive ? "rgba(196,154,40,0.55)" : "rgba(196,154,40,0.35)"}`,
              color: "#C9A84C",
            }}
          >
            {isPlaying
              ? <><div className="live-wave scale-[0.6]"><span /><span /><span /></div><span>Playing</span></>
              : <><Play size={10} fill="currentColor" className="ml-0.5" /><span>Play</span></>
            }
          </button>

          {hasWid && (
            <Link
              href={`/verify/${track.witnessId}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="flex items-center gap-0.5 px-1.5 py-1 rounded text-[8px] font-bold font-heading tracking-wider wid-glow transition-opacity opacity-80 hover:opacity-100"
              style={{ background: "rgba(0,0,0,0.55)", color: "#F5C451", border: "1px solid rgba(245,196,81,0.45)" }}
              title={`Verified Witness ID: ${track.witnessId}`}
            >
              <Shield size={7} />
              <span>WID</span>
            </Link>
          )}

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

        {/* 3. CREATOR + RESONANCE */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: "rgba(196,154,40,0.1)" }}>
          <CreatorHandle
            userId={track.creatorId}
            handle={track.creatorHandle}
            displayName={track.artist}
            role={track.creatorRole}
            size="sm"
          />

          <div className="flex items-center gap-1.5">
            {/* Like */}
            <button
              onClick={e => toggleLike(e)}
              className={`flex items-center gap-0.5 p-0.5 transition-colors ${isLiked ? "text-pink-400" : "text-[#6B6555] hover:text-pink-400"}`}
              title={isLiked ? "Unlike" : "Like"}
            >
              <Heart size={11} fill={isLiked ? "currentColor" : "none"} />
              {likeCount > 0 && (
                <span className="text-[10px] leading-none tabular-nums">
                  {likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
                </span>
              )}
            </button>

            {/* Tip */}
            {onTip && (
              <button
                onClick={e => { e.stopPropagation(); onTip(track, (e.currentTarget as HTMLButtonElement).getBoundingClientRect()); }}
                className="p-0.5 text-[#6B6555] hover:text-[#C49A28] transition-colors"
                title="Send a gift"
              >
                <DollarSign size={11} />
              </button>
            )}

            {/* Queue + list */}
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

        {/* AI disclosure — demoted to tiny footnote */}
        {hasAiDisclosure && (
          <div className="flex justify-end">
            <AiDisclosurePill value={track.aiDisclosure as any} size="compact" />
          </div>
        )}

        {/* Genre pills */}
        <GenrePills genre={track.genre} maxVisible={2} chipBg={ctColors.chipBg} chipBorder={ctColors.chipBorder} textColor={ctColors.text} />
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
