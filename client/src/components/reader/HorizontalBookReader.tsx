/**
 * HorizontalBookReader
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-bleed, horizontal page-by-page comic/novel reader.
 *
 * Architecture:
 *  • Zero chrome by default — controls fade in on hover/tap, fade out after 2 s
 *  • Desktop: two-page spread (left + right), CSS 3D rotateY page-turn
 *  • Mobile: single-page, swipe left/right with the same flip animation
 *  • Keyboard: ← → arrow keys, Escape to close
 *  • Touch: swipe threshold 40 px
 *  • Page counter pill fades in with controls
 *  • Optional caption bar slides up from bottom on hover/tap
 *  • Fullscreen API supported on desktop
 *
 * Props:
 *  pages     — ordered array from pagesJson
 *  title     — book title (shown in header on hover)
 *  onClose   — called when the reader should be dismissed
 *  startPage — 0-indexed page to open on (default 0)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, BookOpen } from "lucide-react";

export interface BookPage {
  pageNumber: number;
  imageUrl: string;
  caption?: string;
}

interface Props {
  pages: BookPage[];
  title: string;
  onClose: () => void;
  startPage?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// On desktop we show two pages at once (spread). Page 0 is always shown alone
// as the cover (right-aligned). Then pages 1-2, 3-4, 5-6 … are paired.
function spreadIndexForPage(page: number): number {
  if (page === 0) return 0;
  return Math.ceil(page / 2);
}

function pagesForSpread(spreadIdx: number, total: number): [number, number | null] {
  if (spreadIdx === 0) return [0, null]; // cover alone
  const left = spreadIdx * 2 - 1;
  const right = left + 1;
  return [left, right < total ? right : null];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HorizontalBookReader({ pages, title, onClose, startPage = 0 }: Props) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const totalPages = pages.length;
  const totalSpreads = spreadIndexForPage(totalPages - 1) + 1;

  // Current spread (desktop) or page (mobile)
  const [spread, setSpread] = useState(() =>
    isMobile ? startPage : spreadIndexForPage(startPage)
  );
  const [page, setPage] = useState(startPage); // mobile only

  // Flip animation state
  const [flipping, setFlipping] = useState<"left" | "right" | null>(null);

  // Controls visibility
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch tracking
  const touchStartX = useRef<number | null>(null);

  // ── Controls auto-hide ──────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 2800);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [resetControlsTimer]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (flipping) return;
    if (isMobile) {
      if (page >= totalPages - 1) return;
      setFlipping("right");
      setTimeout(() => { setPage(p => clamp(p + 1, 0, totalPages - 1)); setFlipping(null); }, 380);
    } else {
      if (spread >= totalSpreads - 1) return;
      setFlipping("right");
      setTimeout(() => { setSpread(s => clamp(s + 1, 0, totalSpreads - 1)); setFlipping(null); }, 380);
    }
    resetControlsTimer();
  }, [flipping, isMobile, page, totalPages, spread, totalSpreads, resetControlsTimer]);

  const goPrev = useCallback(() => {
    if (flipping) return;
    if (isMobile) {
      if (page <= 0) return;
      setFlipping("left");
      setTimeout(() => { setPage(p => clamp(p - 1, 0, totalPages - 1)); setFlipping(null); }, 380);
    } else {
      if (spread <= 0) return;
      setFlipping("left");
      setTimeout(() => { setSpread(s => clamp(s - 1, 0, totalSpreads - 1)); setFlipping(null); }, 380);
    }
    resetControlsTimer();
  }, [flipping, isMobile, page, totalPages, spread, totalSpreads, resetControlsTimer]);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    resetControlsTimer();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  // ── Derived page data ───────────────────────────────────────────────────────
  const currentPageData = isMobile ? pages[page] : null;
  const [leftIdx, rightIdx] = isMobile ? [null, null] : pagesForSpread(spread, totalPages);
  const leftPage = leftIdx !== null ? pages[leftIdx] : null;
  const rightPage = rightIdx !== null ? pages[rightIdx] : null;

  const currentCaption = isMobile
    ? currentPageData?.caption
    : (leftPage?.caption || rightPage?.caption);

  const pageLabel = isMobile
    ? `${page + 1} / ${totalPages}`
    : (() => {
        const [l, r] = pagesForSpread(spread, totalPages);
        if (r === null) return `${l + 1} / ${totalPages}`;
        return `${l + 1}–${r + 1} / ${totalPages}`;
      })();

  const canGoNext = isMobile ? page < totalPages - 1 : spread < totalSpreads - 1;
  const canGoPrev = isMobile ? page > 0 : spread > 0;

  // ── Flip animation class ────────────────────────────────────────────────────
  const flipClass = flipping === "right"
    ? "animate-page-flip-right"
    : flipping === "left"
    ? "animate-page-flip-left"
    : "";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col select-none"
      style={{ background: "#0A0C0E" }}
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Inline keyframe styles ── */}
      <style>{`
        @keyframes pageFlipRight {
          0%   { transform: perspective(1200px) rotateY(0deg); }
          50%  { transform: perspective(1200px) rotateY(-25deg); opacity: 0.6; }
          100% { transform: perspective(1200px) rotateY(0deg); }
        }
        @keyframes pageFlipLeft {
          0%   { transform: perspective(1200px) rotateY(0deg); }
          50%  { transform: perspective(1200px) rotateY(25deg); opacity: 0.6; }
          100% { transform: perspective(1200px) rotateY(0deg); }
        }
        .animate-page-flip-right { animation: pageFlipRight 0.38s cubic-bezier(0.4,0,0.2,1) forwards; }
        .animate-page-flip-left  { animation: pageFlipLeft  0.38s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>

      {/* ── Top bar (fades with controls) ── */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 transition-opacity duration-500"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)",
        }}
      >
        {/* Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen size={15} style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
          <span
            className="text-sm font-heading font-bold tracking-widest truncate"
            style={{ color: "var(--ln-parchment)", maxWidth: "60vw" }}
          >
            {title.toUpperCase()}
          </span>
        </div>
        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Page counter pill */}
          <span
            className="text-[11px] font-heading font-bold tracking-wider px-3 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}
          >
            {pageLabel}
          </span>
          {/* Fullscreen (desktop only) */}
          <button
            onClick={toggleFullscreen}
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--ln-smoke)" }}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--ln-smoke)" }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Page area ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">

        {/* Left nav zone (desktop: left third; mobile: left half) */}
        <button
          onClick={goPrev}
          disabled={!canGoPrev}
          className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-start pl-4 md:pl-6 transition-opacity"
          style={{
            width: "clamp(48px, 12vw, 100px)",
            opacity: showControls && canGoPrev ? 1 : 0,
            pointerEvents: canGoPrev ? "auto" : "none",
            background: "linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 100%)",
          }}
        >
          <ChevronLeft size={28} style={{ color: "var(--ln-gold)" }} />
        </button>

        {/* Right nav zone */}
        <button
          onClick={goNext}
          disabled={!canGoNext}
          className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end pr-4 md:pr-6 transition-opacity"
          style={{
            width: "clamp(48px, 12vw, 100px)",
            opacity: showControls && canGoNext ? 1 : 0,
            pointerEvents: canGoNext ? "auto" : "none",
            background: "linear-gradient(to left, rgba(0,0,0,0.35) 0%, transparent 100%)",
          }}
        >
          <ChevronRight size={28} style={{ color: "var(--ln-gold)" }} />
        </button>

        {/* ── Mobile: single page ── */}
        {isMobile && currentPageData && (
          <div
            key={`m-${page}`}
            className={`w-full h-full flex items-center justify-center ${flipClass}`}
            style={{ transformOrigin: flipping === "right" ? "left center" : "right center" }}
          >
            <img
              src={currentPageData.imageUrl}
              alt={currentPageData.caption || `Page ${currentPageData.pageNumber}`}
              className="max-w-full max-h-full object-contain"
              style={{ display: "block" }}
              draggable={false}
            />
          </div>
        )}

        {/* ── Desktop: two-page spread ── */}
        {!isMobile && (
          <div
            key={`d-${spread}`}
            className={`flex items-center justify-center gap-0 h-full ${flipClass}`}
            style={{
              transformOrigin: flipping === "right" ? "left center" : "right center",
              maxWidth: "100vw",
            }}
          >
            {/* Left page */}
            <div
              className="h-full flex items-center justify-end"
              style={{ width: rightPage ? "50%" : "100%", maxWidth: rightPage ? "50vw" : "80vw" }}
            >
              {leftPage ? (
                <img
                  src={leftPage.imageUrl}
                  alt={leftPage.caption || `Page ${leftPage.pageNumber}`}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    display: "block",
                    borderRight: rightPage ? "1px solid rgba(196,154,40,0.12)" : "none",
                    boxShadow: rightPage ? "2px 0 12px rgba(0,0,0,0.5)" : "0 0 40px rgba(0,0,0,0.6)",
                  }}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            {/* Right page */}
            {rightPage && (
              <div className="h-full flex items-center justify-start" style={{ width: "50%", maxWidth: "50vw" }}>
                <img
                  src={rightPage.imageUrl}
                  alt={rightPage.caption || `Page ${rightPage.pageNumber}`}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    display: "block",
                    boxShadow: "-2px 0 12px rgba(0,0,0,0.5)",
                  }}
                  draggable={false}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Caption bar (slides up on hover/tap) ── */}
      {currentCaption && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 px-6 py-4 transition-all duration-500"
          style={{
            opacity: showControls ? 1 : 0,
            transform: showControls ? "translateY(0)" : "translateY(100%)",
            background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)",
          }}
        >
          <p
            className="text-center text-sm font-heading tracking-wide"
            style={{ color: "var(--ln-parchment)" }}
          >
            {currentCaption}
          </p>
        </div>
      )}

      {/* ── Bottom progress bar ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 transition-opacity duration-500"
        style={{
          opacity: showControls ? 0.7 : 0,
          background: "rgba(196,154,40,0.12)",
        }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${((isMobile ? page : spread) / Math.max(1, (isMobile ? totalPages : totalSpreads) - 1)) * 100}%`,
            background: "linear-gradient(90deg, #C49A28, #B8860B)",
          }}
        />
      </div>
    </div>
  );
}
