/**
 * CinematicComicReader — Living Nexus Signature Reader
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces HorizontalBookReader with a cinematic, testimony-first reading
 * experience. Four modes:
 *
 *  1. SINGLE PAGE (default desktop) — one page, max-width 1100px, centered
 *  2. SPREAD — two pages side-by-side for cinematic double-page spreads
 *  3. GUIDED — panel-by-panel zoom/pan using creator-defined bounding boxes
 *  4. OVERVIEW — thumbnail grid explorer (not a reading mode)
 *
 * Mobile default: vertical guided reader (swipe ↓ = next panel/page)
 *
 * Panel metadata format (stored in pagesJson per page):
 *  { page: number, panels: Array<{ x, y, width, height, caption? }> }
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BookOpen, Grid3x3, Layers, Compass, ZoomIn, ZoomOut,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookPage {
  pageNumber: number;
  imageUrl: string;
  caption?: string;
}

export interface PanelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  caption?: string;
  // Focus Hold — creator-set pacing for emotional reveals, suspense, scripture moments
  hold?: boolean;
  recommendedDuration?: number; // seconds — overrides global autoplay timing
}

export interface PagePanelData {
  page: number; // 1-indexed
  panels: PanelRegion[];
}

type ReaderMode = "single" | "spread" | "guided" | "overview";

interface Props {
  pages: BookPage[];
  title: string;
  onClose: () => void;
  startPage?: number;
  panelData?: PagePanelData[]; // optional guided mode metadata
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CinematicComicReader({ pages, title, onClose, startPage = 0, panelData = [] }: Props) {
  const isMobile = useIsMobile();
  const totalPages = pages.length;

  // Current page index (0-based)
  const [pageIdx, setPageIdx] = useState(clamp(startPage, 0, totalPages - 1));

  // Reader mode — mobile defaults to guided if panel data exists, else single
  const [mode, setMode] = useState<ReaderMode>(() => {
    if (isMobile) return panelData.length > 0 ? "guided" : "single";
    return "single";
  });

  // Guided mode: current panel index within current page
  const [panelIdx, setPanelIdx] = useState(0);

  // Zoom state (single/spread mode)
  const [zoom, setZoom] = useState(1.0);

  // Controls visibility (auto-hide)
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Transition direction for CSS
  const [transDir, setTransDir] = useState<"forward" | "back" | null>(null);

  // ── Controls auto-hide ────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [resetControlsTimer]);

  // ── Panel data for current page ───────────────────────────────────────────
  const currentPanels: PanelRegion[] = (() => {
    const pd = panelData.find(p => p.page === pageIdx + 1);
    return pd?.panels ?? [];
  })();

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToPage = useCallback((idx: number, dir: "forward" | "back") => {
    const next = clamp(idx, 0, totalPages - 1);
    if (next === pageIdx) return;
    setTransDir(dir);
    setTimeout(() => {
      setPageIdx(next);
      setPanelIdx(0);
      setTransDir(null);
    }, 220);
    resetControlsTimer();
  }, [pageIdx, totalPages, resetControlsTimer]);

  const goNext = useCallback(() => {
    if (mode === "guided" && currentPanels.length > 0) {
      if (panelIdx < currentPanels.length - 1) {
        setPanelIdx(p => p + 1);
        resetControlsTimer();
        return;
      }
    }
    if (mode === "spread") {
      // Advance 2 pages (cover is alone, then pairs)
      const nextPage = pageIdx === 0 ? 1 : pageIdx + 2;
      goToPage(Math.min(nextPage, totalPages - 1), "forward");
    } else {
      goToPage(pageIdx + 1, "forward");
    }
  }, [mode, currentPanels, panelIdx, pageIdx, totalPages, goToPage, resetControlsTimer]);

  const goPrev = useCallback(() => {
    if (mode === "guided" && panelIdx > 0) {
      setPanelIdx(p => p - 1);
      resetControlsTimer();
      return;
    }
    if (mode === "spread") {
      const prevPage = pageIdx <= 1 ? 0 : pageIdx - 2;
      goToPage(prevPage, "back");
    } else {
      goToPage(pageIdx - 1, "back");
    }
  }, [mode, panelIdx, pageIdx, goToPage, resetControlsTimer]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom(z => Math.min(z + 0.2, 3.0));
      if (e.key === "-") setZoom(z => Math.max(z - 0.2, 0.5));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => clamp(z - e.deltaY * 0.002, 0.5, 3.0));
    }
  }, []);

  // ── Fullscreen ────────────────────────────────────────────────────────────
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

  // ── Touch ─────────────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    resetControlsTimer();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDy > absDx && absDy > 40) {
      // Vertical swipe — mobile guided
      if (dy < 0) goNext();
      else goPrev();
    } else if (absDx > absDy && absDx > 40) {
      // Horizontal swipe
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // ── Double-tap to fullscreen panel ────────────────────────────────────────
  const lastTap = useRef<number>(0);
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      toggleFullscreen();
    }
    lastTap.current = now;
    resetControlsTimer();
  };

  // ── Spread page pair ──────────────────────────────────────────────────────
  const spreadRight = mode === "spread" && pageIdx < totalPages - 1 ? pageIdx + 1 : null;

  // ── Guided mode: compute transform for panel zoom ─────────────────────────
  function getGuidedTransform(imgRef: HTMLImageElement | null): React.CSSProperties {
    if (!imgRef || currentPanels.length === 0) return {};
    const panel = currentPanels[panelIdx];
    if (!panel) return {};
    // We need to scale so the panel fills the viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const imgW = imgRef.naturalWidth || imgRef.clientWidth || 800;
    const imgH = imgRef.naturalHeight || imgRef.clientHeight || 1100;
    const scaleX = vw / panel.width;
    const scaleY = vh / panel.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    const panelCenterX = panel.x + panel.width / 2;
    const panelCenterY = panel.y + panel.height / 2;
    // Translate so panel center is at viewport center
    const imgDisplayW = imgRef.clientWidth || vw;
    const imgDisplayH = imgRef.clientHeight || vh;
    const ratioX = imgDisplayW / imgW;
    const ratioY = imgDisplayH / imgH;
    const tx = (vw / 2) - (panelCenterX * ratioX * scale);
    const ty = (vh / 2) - (panelCenterY * ratioY * scale);
    return {
      transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
      transformOrigin: "0 0",
      transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
    };
  }

  const imgRef = useRef<HTMLImageElement>(null);
  const [guidedStyle, setGuidedStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (mode === "guided" && currentPanels.length > 0 && imgRef.current) {
      const style = getGuidedTransform(imgRef.current);
      setGuidedStyle(style);
    } else {
      setGuidedStyle({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, panelIdx, pageIdx]);

  // ── Page label ────────────────────────────────────────────────────────────
  const pageLabel = mode === "spread" && spreadRight !== null
    ? `${pageIdx + 1}–${spreadRight + 1} / ${totalPages}`
    : `${pageIdx + 1} / ${totalPages}`;

  const canGoNext = pageIdx < totalPages - 1 || (mode === "guided" && panelIdx < currentPanels.length - 1);
  const canGoPrev = pageIdx > 0 || (mode === "guided" && panelIdx > 0);

  // ── Overview grid ─────────────────────────────────────────────────────────
  if (mode === "overview") {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: "#080808" }}
      >
        {/* Overview header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.8)", borderBottom: "1px solid rgba(196,154,40,0.12)" }}>
          <div className="flex items-center gap-2.5">
            <BookOpen size={15} style={{ color: "var(--ln-gold)" }} />
            <span className="text-sm font-heading font-bold tracking-widest" style={{ color: "#E8DFC8" }}>
              {title.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("single")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-wide transition-all hover:opacity-90"
              style={{ background: "rgba(196,154,40,0.12)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.3)" }}
            >
              <BookOpen size={12} /> Read
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Thumbnail grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => { setPageIdx(i); setPanelIdx(0); setMode("single"); }}
                className="relative rounded-lg overflow-hidden group transition-transform hover:scale-[1.03]"
                style={{
                  aspectRatio: "3/4",
                  border: i === pageIdx ? "2px solid rgba(196,154,40,0.8)" : "1px solid rgba(196,154,40,0.15)",
                  boxShadow: i === pageIdx ? "0 0 16px rgba(196,154,40,0.2)" : "none",
                }}
              >
                <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] font-heading font-bold"
                  style={{ background: "rgba(0,0,0,0.7)", color: i === pageIdx ? "#C9A84C" : "#888" }}>
                  {p.pageNumber}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Main reader ───────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col select-none overflow-hidden"
      style={{ background: "#080808" }}
      onMouseMove={resetControlsTimer}
      onClick={onTap}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes cnPageForward {
          0%   { opacity: 1; transform: translate3d(0,0,0) scale(1); }
          40%  { opacity: 0; transform: translate3d(-3%,0,0) scale(0.98); }
          60%  { opacity: 0; transform: translate3d(3%,0,0) scale(0.98); }
          100% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes cnPageBack {
          0%   { opacity: 1; transform: translate3d(0,0,0) scale(1); }
          40%  { opacity: 0; transform: translate3d(3%,0,0) scale(0.98); }
          60%  { opacity: 0; transform: translate3d(-3%,0,0) scale(0.98); }
          100% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
        }
        .cn-page-forward { animation: cnPageForward 0.44s cubic-bezier(0.4,0,0.2,1) forwards; }
        .cn-page-back    { animation: cnPageBack    0.44s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>

      {/* ── Top bar ── */}
      <div
        className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-3 transition-all duration-500"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: close + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-heading font-bold tracking-wide transition-colors hover:text-[#C9A84C]"
            style={{ color: "#888" }}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">EXIT</span>
          </button>
          <span className="text-xs font-heading font-bold tracking-widest truncate max-w-[40vw]" style={{ color: "#E8DFC8" }}>
            {title.toUpperCase()}
          </span>
        </div>

        {/* Center: mode switcher */}
        <div className="flex items-center gap-1 rounded-full px-1 py-1" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(196,154,40,0.2)" }}>
          {(["single", "spread", "guided", "overview"] as ReaderMode[]).map(m => {
            const icons: Record<ReaderMode, React.ReactNode> = {
              single: <BookOpen size={12} />,
              spread: <Layers size={12} />,
              guided: <Compass size={12} />,
              overview: <Grid3x3 size={12} />,
            };
            const labels: Record<ReaderMode, string> = {
              single: "Standard",
              spread: "Spread",
              guided: "Guided",
              overview: "Overview",
            };
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setPanelIdx(0); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-heading font-bold tracking-wide transition-all"
                style={{
                  background: mode === m ? "rgba(196,154,40,0.22)" : "transparent",
                  color: mode === m ? "#C9A84C" : "#666",
                  border: mode === m ? "1px solid rgba(196,154,40,0.4)" : "1px solid transparent",
                }}
              >
                {icons[m]}
                <span className="hidden sm:inline">{labels[m]}</span>
              </button>
            );
          })}
        </div>

        {/* Right: page counter + zoom + fullscreen */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-heading font-bold tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.25)" }}>
            {pageLabel}
          </span>
          {mode !== "guided" && (
            <>
              <button onClick={e => { e.stopPropagation(); setZoom(z => Math.max(z - 0.2, 0.5)); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
                <ZoomOut size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); setZoom(z => Math.min(z + 0.2, 3.0)); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
                <ZoomIn size={13} />
              </button>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* ── Page area ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">

        {/* Left nav zone */}
        <button
          onClick={e => { e.stopPropagation(); goPrev(); }}
          disabled={!canGoPrev}
          className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-start pl-3 md:pl-5 transition-opacity"
          style={{
            width: "clamp(44px, 10vw, 80px)",
            opacity: showControls && canGoPrev ? 1 : 0,
            pointerEvents: canGoPrev ? "auto" : "none",
            background: "linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 100%)",
          }}
        >
          <ChevronLeft size={28} style={{ color: "rgba(196,154,40,0.8)" }} />
        </button>

        {/* Page image(s) */}
        <div
          className={`flex items-center justify-center gap-2 h-full w-full
            ${transDir === "forward" ? "cn-page-forward" : transDir === "back" ? "cn-page-back" : ""}`}
          style={{ padding: "52px 80px 52px" }}
        >
          {/* Guided mode: full page with panel zoom transform */}
          {mode === "guided" ? (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <img
                ref={imgRef}
                src={pages[pageIdx]?.imageUrl}
                alt={`Page ${pageIdx + 1}`}
                className="max-h-full object-contain"
                style={{
                  maxWidth: "1100px",
                  willChange: "transform",
                  ...guidedStyle,
                }}
                onLoad={() => {
                  if (currentPanels.length > 0 && imgRef.current) {
                    setGuidedStyle(getGuidedTransform(imgRef.current));
                  }
                }}
                draggable={false}
              />
              {/* Panel caption */}
              {currentPanels[panelIdx]?.caption && (
                <div
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm text-center max-w-xs"
                  style={{ background: "rgba(0,0,0,0.75)", color: "#F5F5F5", border: "1px solid rgba(196,154,40,0.2)", fontFamily: "'Georgia', serif" }}
                >
                  {currentPanels[panelIdx].caption}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Primary page */}
              <img
                src={pages[pageIdx]?.imageUrl}
                alt={`Page ${pageIdx + 1}`}
                className="max-h-full object-contain rounded-sm shadow-2xl"
                style={{
                  maxWidth: mode === "spread" ? "540px" : "1100px",
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: "transform 0.2s ease",
                  willChange: "transform",
                }}
                draggable={false}
              />
              {/* Spread: second page */}
              {mode === "spread" && spreadRight !== null && (
                <img
                  src={pages[spreadRight]?.imageUrl}
                  alt={`Page ${spreadRight + 1}`}
                  className="max-h-full object-contain rounded-sm shadow-2xl"
                  style={{
                    maxWidth: "540px",
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease",
                    willChange: "transform",
                  }}
                  draggable={false}
                />
              )}
            </>
          )}
        </div>

        {/* Right nav zone */}
        <button
          onClick={e => { e.stopPropagation(); goNext(); }}
          disabled={!canGoNext}
          className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-end pr-3 md:pr-5 transition-opacity"
          style={{
            width: "clamp(44px, 10vw, 80px)",
            opacity: showControls && canGoNext ? 1 : 0,
            pointerEvents: canGoNext ? "auto" : "none",
            background: "linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 100%)",
          }}
        >
          <ChevronRight size={28} style={{ color: "rgba(196,154,40,0.8)" }} />
        </button>
      </div>

      {/* ── Bottom bar — caption + mobile next panel ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[100] transition-all duration-500"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Caption */}
        {pages[pageIdx]?.caption && mode !== "guided" && (
          <p className="text-center text-xs px-8 py-2" style={{ color: "rgba(232,223,200,0.75)", fontFamily: "'Georgia', serif" }}>
            {pages[pageIdx].caption}
          </p>
        )}

        {/* Mobile: guided mode panel indicator + next button */}
        {isMobile && mode === "guided" && (
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex gap-1">
              {currentPanels.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === panelIdx ? "16px" : "6px",
                    height: "6px",
                    background: i === panelIdx ? "rgba(196,154,40,0.9)" : "rgba(196,154,40,0.25)",
                  }}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-bold tracking-wide"
              style={{ background: "rgba(196,154,40,0.18)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.4)" }}
            >
              {panelIdx < currentPanels.length - 1 ? "Next Panel" : "Next Page"}
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Desktop: prev/next page buttons */}
        {!isMobile && (
          <div className="flex items-center justify-between px-8 py-3">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-bold tracking-wide transition-all disabled:opacity-30"
              style={{ background: "rgba(0,0,0,0.5)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.25)" }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            {/* Page dots (max 12 shown) */}
            <div className="flex gap-1 items-center">
              {pages.slice(0, Math.min(totalPages, 12)).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i, i > pageIdx ? "forward" : "back")}
                  className="rounded-full transition-all"
                  style={{
                    width: i === pageIdx ? "18px" : "6px",
                    height: "6px",
                    background: i === pageIdx ? "rgba(196,154,40,0.9)" : "rgba(196,154,40,0.2)",
                  }}
                />
              ))}
              {totalPages > 12 && <span className="text-[9px] ml-1" style={{ color: "rgba(196,154,40,0.4)" }}>+{totalPages - 12}</span>}
            </div>
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-bold tracking-wide transition-all disabled:opacity-30"
              style={{ background: "rgba(0,0,0,0.5)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.25)" }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
