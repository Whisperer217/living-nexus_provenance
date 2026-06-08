/**
 * BookCard — display card for manuscript and comic/novel work types.
 * Visually distinct from TrackCard: portrait cover, "Read" CTA, no play button.
 */
import { Link, useLocation } from "wouter";
import { Shield, BookOpen, ImageIcon } from "lucide-react";
import { useLike } from "@/hooks/useLike";
import { Heart } from "lucide-react";

interface BookCardProps {
  item: {
    song: {
      id: number;
      title: string;
      coverArtUrl?: string | null;
      witnessId?: string | null;
      genre?: string | null;
      contentType?: string | null;
      pageCount?: number | null;
      isrc?: string | null; // ISBN stored here
      pagesJson?: string | null;
    };
    creator?: {
      id?: number | null;
      name?: string | null;
      artistHandle?: string | null;
    } | null;
  };
  prefetchedLiked?: boolean;
  prefetchedLikeCount?: number;
  /** If provided, clicking a comic card calls this instead of navigating to /book/:id */
  onRead?: (song: BookCardProps["item"]["song"]) => void;
}

export default function BookCard({ item, prefetchedLiked, prefetchedLikeCount, onRead }: BookCardProps) {
  const { song, creator } = item;
  const [, navigate] = useLocation();
  const hasPrefetch = prefetchedLiked !== undefined;
  const { liked, toggle: toggleLike } = useLike(song.id, { skipQuery: hasPrefetch, initialLiked: prefetchedLiked });
  const likeCount = prefetchedLikeCount ?? 0;
  const artistName = creator?.artistHandle || creator?.name || "Unknown";
  const isComic = song.contentType === "comic";
  const accentColor = isComic ? "var(--ln-ember)" : "var(--ln-seal-bright)";
  const accentBg   = isComic ? "rgba(239,68,68,0.12)" : "rgba(74,222,128,0.10)";
  const typeLabel  = isComic ? "Comic / Novel" : "Manuscript";

  const handleCardClick = () => {
    if (isComic && onRead) { onRead(song); return; }
    navigate(`/book/${song.id}`);
  };

  return (
    <div
      className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        background: "linear-gradient(160deg, #1E2D3A 0%, #1A2830 60%, #000000 100%)",
        border: "1px solid rgba(196,154,40,0.15)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
      }}
      onClick={handleCardClick}
    >
      {/* ── Cover Art — portrait 3:4 ── */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
        {song.coverArtUrl ? (
          <img
            src={song.coverArtUrl}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1E2D3A, #000000)" }}>
            <ImageIcon className="w-10 h-10 opacity-20" style={{ color: "var(--ln-gold)" }} />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(30,45,58,0.85) 0%, transparent 55%)" }} />

        {/* Medium type badge — top-left */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-heading tracking-widest font-bold"
          style={{ background: accentBg, color: accentColor, border: `1px solid ${accentColor}44` }}>
          <BookOpen size={8} />
          {typeLabel.toUpperCase()}
        </div>

        {/* WID badge — bottom-left */}
        {song.witnessId && (
          <Link
            href={`/verify/${song.witnessId}`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="absolute bottom-2 left-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider transition-opacity opacity-90 hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.72)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.5)" }}
            title={`Verified Witness ID: ${song.witnessId}`}
          >
            <Shield size={8} /><span>WID</span>
          </Link>
        )}

        {/* Read button — bottom-right on hover */}
        <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-heading font-bold tracking-wider"
            style={{ background: accentColor, color: "#1E2D3A" }}>
            <BookOpen size={10} />
            READ
          </div>
        </div>
      </div>

      {/* ── Info panel ── */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Title */}
        <p className="text-[13px] font-heading text-white/90 leading-tight line-clamp-2 tracking-wide group-hover:text-[#C49A28] transition-colors"
          title={song.title}>
          {song.title}
        </p>

        {/* Author */}
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)", color: "white" }}>
            {artistName.charAt(0).toUpperCase()}
          </div>
          {creator?.id ? (
            <Link
              href={`/creator/${creator.id}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="truncate hover:text-[#C49A28] transition-colors"
            >
              {artistName}
            </Link>
          ) : (
            <span className="truncate">{artistName}</span>
          )}
        </div>

        {/* Category chip + like */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {song.genre ? (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-body truncate max-w-[70%]"
              style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px solid rgba(196,154,40,0.15)" }}>
              {(song.genre as string).split(/[,/|]+/)[0].trim()}
            </span>
          ) : <span />}

          <button
            onClick={e => { e.stopPropagation(); toggleLike(e); }}
            className={`flex items-center gap-0.5 p-1 transition-colors ${liked ? "text-pink-400" : "text-white/50 hover:text-pink-400"}`}
            title={liked ? "Unlike" : "Like"}
          >
            <Heart size={11} fill={liked ? "currentColor" : "none"} />
            {likeCount > 0 && (
              <span className="text-[10px] leading-none font-medium tabular-nums">{likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
