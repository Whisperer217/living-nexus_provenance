/**
 * FeaturedBookModel
 * ─────────────────────────────────────────────────────────────────────────────
 * CSS 3D book cover showcase for the creator profile.
 *
 * Behaviour:
 *  • Renders a perspective-correct 3D book: front cover, spine, and a subtle
 *    back cover using only CSS transforms — no canvas, no WebGL.
 *  • On hover/tap: the cover opens 30° (like a book being picked up) and a
 *    "Read" CTA appears.
 *  • Clicking navigates to /book/:id.
 *  • If the book has a storyboard (pagesJson), a page-count badge is shown.
 *  • Spine colour is derived from the accent colour (comic = red, manuscript = green).
 *
 * Props:
 *  song        — the song/work object (must have contentType comic|manuscript)
 *  onRead      — called when the user clicks "Read" (opens the reader inline)
 */

import { useLocation } from "wouter";
import { BookOpen, Play } from "lucide-react";

interface BookWork {
  id: number;
  title: string;
  coverArtUrl?: string | null;
  contentType?: string | null;
  pagesJson?: string | null;
  witnessId?: string | null;
}

interface Props {
  song: BookWork;
  onRead?: () => void;
}

export function FeaturedBookModel({ song, onRead }: Props) {
  const [, navigate] = useLocation();
  const isComic = song.contentType === "comic";
  const accentColor = isComic ? "#EF4444" : "#4ADE80";
  const spineColor = isComic ? "#7F1D1D" : "#14532D";

  const pageCount = (() => {
    if (!song.pagesJson) return 0;
    try { return (JSON.parse(song.pagesJson) as unknown[]).length; } catch { return 0; }
  })();

  const coverUrl = song.coverArtUrl || "";

  function handleClick() {
    if (onRead) { onRead(); return; }
    navigate(`/book/${song.id}`);
  }

  return (
    <div
      className="group relative flex flex-col items-center gap-3 cursor-pointer"
      onClick={handleClick}
      style={{ userSelect: "none" }}
    >
      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes bookHover {
          0%   { transform: perspective(600px) rotateY(0deg); }
          100% { transform: perspective(600px) rotateY(-30deg); }
        }
        @keyframes bookRest {
          0%   { transform: perspective(600px) rotateY(-30deg); }
          100% { transform: perspective(600px) rotateY(0deg); }
        }
        .book-wrap {
          transform: perspective(600px) rotateY(0deg);
          transition: transform 0.45s cubic-bezier(0.4,0,0.2,1);
        }
        .group:hover .book-wrap,
        .group:focus-within .book-wrap {
          transform: perspective(600px) rotateY(-30deg);
        }
      `}</style>

      {/* ── 3D Book ── */}
      <div
        className="book-wrap relative"
        style={{
          width: 120,
          height: 170,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front cover */}
        <div
          className="absolute inset-0 rounded-r-md overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            boxShadow: "4px 6px 24px rgba(0,0,0,0.7), inset -2px 0 6px rgba(0,0,0,0.3)",
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={song.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-end p-2"
              style={{ background: `linear-gradient(135deg, ${spineColor}, ${accentColor}33)` }}
            >
              <span
                className="text-[9px] font-heading font-bold tracking-wider leading-tight"
                style={{ color: "#E6CDAE" }}
              >
                {song.title}
              </span>
            </div>
          )}
          {/* Gold rim overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-r-md"
            style={{ border: "1px solid rgba(203,177,131,0.30)", boxShadow: "inset 0 0 0 1px rgba(203,177,131,0.12)" }}
          />
          {/* Hover CTA overlay */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(2px)" }}
          >
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: accentColor + "22", border: `1px solid ${accentColor}55` }}
            >
              <Play size={10} fill={accentColor} style={{ color: accentColor }} />
              <span className="text-[9px] font-heading font-bold tracking-widest" style={{ color: accentColor }}>
                READ
              </span>
            </div>
          </div>
        </div>

        {/* Spine (left face) */}
        <div
          className="absolute top-0 bottom-0 left-0"
          style={{
            width: 14,
            background: `linear-gradient(to right, ${spineColor}, ${spineColor}CC)`,
            transform: "rotateY(90deg) translateZ(-7px) translateX(-7px)",
            transformOrigin: "left center",
            backfaceVisibility: "hidden",
            boxShadow: "inset -2px 0 4px rgba(0,0,0,0.4)",
          }}
        />

        {/* Back cover (subtle) */}
        <div
          className="absolute inset-0 rounded-r-md"
          style={{
            background: spineColor,
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
          }}
        />

        {/* Page count badge */}
        {pageCount > 0 && (
          <div
            className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-heading font-bold tracking-wider z-10"
            style={{ background: "rgba(0,0,0,0.72)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.35)" }}
          >
            <BookOpen size={7} />
            {pageCount}
          </div>
        )}
      </div>

      {/* ── Title below ── */}
      <div className="text-center max-w-[120px]">
        <p
          className="text-[10px] font-heading font-bold tracking-wider leading-tight truncate"
          style={{ color: "#E6CDAE" }}
        >
          {song.title}
        </p>
        <p className="text-[8px] mt-0.5 font-heading tracking-widest" style={{ color: accentColor, opacity: 0.8 }}>
          {isComic ? "COMIC / NOVEL" : "MANUSCRIPT"}
        </p>
      </div>
    </div>
  );
}
