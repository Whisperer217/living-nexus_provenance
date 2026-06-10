/**
 * CinematicComicReader — Living Nexus Phase 147 Guided Manifestation Reader
 * ─────────────────────────────────────────────────────────────────────────────
 * A narrative camera engine. Comics are not image galleries — they are
 * interactive witnessed cinema.
 *
 * MODES:
 *  1. GUIDED (PRIMARY) — panel-by-panel cinematic zoom/pan, GPU-accelerated
 *  2. SINGLE PAGE — one page, max-width 1100px, centered, drag/zoom
 *  3. SPREAD — two pages side-by-side (desktop only)
 *  4. OVERVIEW — thumbnail explorer ONLY (the only place many pages are visible)
 *
 * FEATURES:
 *  - Panel region metadata with readOrder, transitionType, emotional beats, commentary
 *  - Witness Access gating (free = preview + standard; Witness = guided + HD + commentary)
 *  - Creator Commentary overlay (tap panel → scene meaning, lore, testimony)
 *  - Lazy loading (nearby pages only)
 *  - Progressive resolution (low-res preview → HD focus region)
 *  - Fullscreen immersive mode (ESC, cinematic fade, hidden chrome, notch safe area)
 *  - Smooth easing transitions (no harsh snapping)
 *  - Desktop: arrow keys, wheel progression
 *  - Mobile: tap-to-advance, vertical swipe momentum
 *  - Auto-hide UI chrome
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BookOpen, Grid3x3, Layers, Compass, ZoomIn, ZoomOut,
  MessageSquare, Star, Lock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookPage {
  pageNumber: number;
  imageUrl: string;
  caption?: string;
}

export type PanelType = "panel" | "dialogue" | "narration" | "splash" | "reveal" | "cinematic";
export type TransitionType = "fade" | "zoom" | "pan" | "cut";

export interface PanelRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PanelType;
  readOrder?: number;
  transitionType?: TransitionType;
  isEmotionalBeat?: boolean;
  commentary?: string; // Creator Commentary text
  // Legacy support
  caption?: string;
  hold?: boolean;
  recommendedDuration?: number;
}

export interface PagePanelData {
  page: number; // 1-indexed
  regions: PanelRegion[];
  // Legacy support
  panels?: PanelRegion[];
}

export interface SoundtrackCue {
  page: number;
  region?: string;
  trackId: string;
  startTime: number;
  label?: string;
}

type ReaderMode = "single" | "spread" | "guided" | "overview";

interface Props {
  pages: BookPage[];
  title: string;
  onClose?: () => void;
  startPage?: number;
  panelData?: PagePanelData[];
  soundtrackCues?: SoundtrackCue[];
  hasWitnessAccess?: boolean; // Witness Pass gating
  previewPageCount?: number;  // How many pages free users can read
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

// Normalize panel data — supports both new (regions) and legacy (panels) shapes
function getRegionsForPage(panelData: PagePanelData[], pageNum: number): PanelRegion[] {
  const pd = panelData.find(p => p.page === pageNum);
  if (!pd) return [];
  const raw = pd.regions ?? pd.panels ?? [];
  // Sort by readOrder if present
  return [...raw].sort((a, b) => {
    if (a.readOrder !== undefined && b.readOrder !== undefined) return a.readOrder - b.readOrder;
    return 0;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CinematicComicReader({
  pages,
  title,
  onClose,
  startPage = 0,
  panelData = [],
  soundtrackCues = [],
  hasWitnessAccess = true,
  previewPageCount = 5,
}: Props) {
  const isMobile = useIsMobile();
  const totalPages = pages.length;

  // Current page index (0-based)
  const [pageIdx, setPageIdx] = useState(clamp(startPage, 0, totalPages - 1));

  // Reader mode — Guided is PRIMARY if panel data exists
  const [mode, setMode] = useState<ReaderMode>(() => {
    const hasPanels = panelData.length > 0;
    if (hasPanels && hasWitnessAccess) return "guided";
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

  // Creator Commentary overlay
  const [showCommentary, setShowCommentary] = useState(false);

  // Witness Access gate — which page is the paywall at
  const freePageLimit = hasWitnessAccess ? totalPages : Math.min(previewPageCount, totalPages);
  const isPageGated = (idx: number) => !hasWitnessAccess && idx >= freePageLimit;

  // Lazy loading — track which pages are "near" (within 2 of current)
  const shouldLoadPage = (idx: number) => Math.abs(idx - pageIdx) <= 2;

  // ── Controls auto-hide ────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [resetControlsTimer]);

  // ── Panel data for current page ─────────────────────────────────────────
  // Memoized: getRegionsForPage returns a new array every call — without useMemo
  // computeGuidedTransform recreates on every render → infinite setState loop.
  const currentPanels = useMemo(
    () => getRegionsForPage(panelData, pageIdx + 1),
    // panelData is a stable prop reference; pageIdx is a primitive — safe deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelData, pageIdx]
  );
  const currentPanel = currentPanels[panelIdx] ?? null;

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToPage = useCallback((idx: number, dir: "forward" | "back") => {
    const next = clamp(idx, 0, totalPages - 1);
    if (next === pageIdx) return;
    if (isPageGated(next)) return; // Don't navigate into gated pages
    setTransDir(dir);
    setTimeout(() => {
      setPageIdx(next);
      setPanelIdx(0);
      setTransDir(null);
      setShowCommentary(false);
    }, 220);
    resetControlsTimer();
  }, [pageIdx, totalPages, resetControlsTimer, isPageGated]);

  const goNext = useCallback(() => {
    if (mode === "guided" && currentPanels.length > 0) {
      if (panelIdx < currentPanels.length - 1) {
        setPanelIdx(p => p + 1);
        setShowCommentary(false);
        resetControlsTimer();
        return;
      }
    }
    if (mode === "spread") {
      const nextPage = pageIdx === 0 ? 1 : pageIdx + 2;
      goToPage(Math.min(nextPage, totalPages - 1), "forward");
    } else {
      goToPage(pageIdx + 1, "forward");
    }
  }, [mode, currentPanels, panelIdx, pageIdx, totalPages, goToPage, resetControlsTimer]);

  const goPrev = useCallback(() => {
    if (mode === "guided" && panelIdx > 0) {
      setPanelIdx(p => p - 1);
      setShowCommentary(false);
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
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      if (e.key === "Escape") { if (isFullscreen) document.exitFullscreen?.(); else onClose?.(); }
      if (e.key === "+" || e.key === "=") setZoom(z => Math.min(z + 0.2, 3.0));
      if (e.key === "-") setZoom(z => Math.max(z - 0.2, 0.5));
      if (e.key === "c" || e.key === "C") setShowCommentary(s => !s);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose, isFullscreen]);

  // ── Wheel — scroll to advance pages in guided mode ────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => clamp(z - e.deltaY * 0.002, 0.5, 3.0));
    } else if (mode === "guided" || mode === "single") {
      // Wheel advances panels/pages in guided mode
      if (Math.abs(e.deltaY) > 30) {
        if (e.deltaY > 0) goNext();
        else goPrev();
      }
    }
  }, [mode, goNext, goPrev]);

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
      if (dy < 0) goNext();
      else goPrev();
    } else if (absDx > absDy && absDx > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // ── Double-tap to fullscreen ──────────────────────────────────────────────
  const lastTap = useRef<number>(0);
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) toggleFullscreen();
    lastTap.current = now;
    resetControlsTimer();
  };

  // ── Spread page pair ──────────────────────────────────────────────────────
  const spreadRight = mode === "spread" && pageIdx < totalPages - 1 ? pageIdx + 1 : null;

  // ── Guided mode: compute GPU-accelerated transform for panel zoom ─────────
  const imgRef = useRef<HTMLImageElement>(null);
  const [guidedStyle, setGuidedStyle] = useState<React.CSSProperties>({});

  const computeGuidedTransform = useCallback(() => {
    const img = imgRef.current;
    if (!img || currentPanels.length === 0) {
      setGuidedStyle({});
      return;
    }
    const panel = currentPanels[panelIdx];
    if (!panel) { setGuidedStyle({}); return; }

    const vw = containerRef.current?.clientWidth ?? window.innerWidth;
    const vh = containerRef.current?.clientHeight ?? window.innerHeight;
    const imgW = img.naturalWidth || img.clientWidth || 800;
    const imgH = img.naturalHeight || img.clientHeight || 1100;

    // Scale so the panel fills the viewport with 8% padding
    const scaleX = (vw * 0.92) / panel.width;
    const scaleY = (vh * 0.88) / panel.height;
    const scale = Math.min(scaleX, scaleY);

    // Panel center in image-coordinate space
    const panelCenterX = panel.x + panel.width / 2;
    const panelCenterY = panel.y + panel.height / 2;

    // Convert to display-space coordinates
    const displayRatioX = img.clientWidth / imgW;
    const displayRatioY = img.clientHeight / imgH;

    // Translate so panel center aligns with viewport center
    const tx = vw / 2 - panelCenterX * displayRatioX * scale;
    const ty = vh / 2 - panelCenterY * displayRatioY * scale;

    // Choose transition based on panel's declared transitionType
    const transitionMap: Record<TransitionType, string> = {
      fade: "opacity 0.4s ease, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      zoom: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
      pan: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
      cut: "transform 0s",
    };
    const transition = transitionMap[panel.transitionType ?? "zoom"];

    setGuidedStyle({
      transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
      transformOrigin: "0 0",
      transition,
      willChange: "transform",
    });
  }, [currentPanels, panelIdx]);

  useEffect(() => {
    if (mode === "guided") {
      computeGuidedTransform();
    } else {
      setGuidedStyle({});
    }
  }, [mode, panelIdx, pageIdx, computeGuidedTransform]);

  // ── Page label ────────────────────────────────────────────────────────────
  const pageLabel = mode === "spread" && spreadRight !== null
    ? `${pageIdx + 1}–${spreadRight + 1} / ${totalPages}`
    : `${pageIdx + 1} / ${totalPages}`;

  const canGoNext = !isPageGated(pageIdx + 1) && (
    pageIdx < totalPages - 1 || (mode === "guided" && panelIdx < currentPanels.length - 1)
  );
  const canGoPrev = pageIdx > 0 || (mode === "guided" && panelIdx > 0);

  // ── Witness Access Gate Wall ──────────────────────────────────────────────
  if (isPageGated(pageIdx)) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ background: "#080808" }}
      >
        <div className="text-center max-w-sm px-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)" }}>
            <Lock size={28} style={{ color: "#C9A84C" }} />
          </div>
          <h3 className="text-xl font-heading font-bold mb-3" style={{ color: "#E8DFC8" }}>
            Witness Access Required
          </h3>
          <p className="text-sm mb-6" style={{ color: "rgba(232,223,200,0.55)", lineHeight: 1.7 }}>
            You've read the free preview. Witness Access unlocks the full guided reading experience, HD resolution, soundtrack sync, and creator commentary.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
            style={{ background: "rgba(196,154,40,0.18)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.4)" }}
          >
            Return to Work
          </button>
        </div>
      </div>
    );
  }

  // ── Overview mode ─────────────────────────────────────────────────────────
  if (mode === "overview") {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: "#080808" }}
      >
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
              onClick={() => setMode(panelData.length > 0 && hasWitnessAccess ? "guided" : "single")}
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
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  if (!isPageGated(i)) {
                    setPageIdx(i);
                    setPanelIdx(0);
                    setMode(panelData.length > 0 && hasWitnessAccess ? "guided" : "single");
                  }
                }}
                className="relative rounded-lg overflow-hidden group transition-transform hover:scale-[1.03]"
                style={{
                  aspectRatio: "3/4",
                  border: i === pageIdx ? "2px solid rgba(196,154,40,0.8)" : "1px solid rgba(196,154,40,0.15)",
                  boxShadow: i === pageIdx ? "0 0 16px rgba(196,154,40,0.2)" : "none",
                  opacity: isPageGated(i) ? 0.4 : 1,
                }}
              >
                {shouldLoadPage(i) ? (
                  <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full" style={{ background: "rgba(196,154,40,0.05)" }} />
                )}
                <div className="absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] font-heading font-bold"
                  style={{ background: "rgba(0,0,0,0.7)", color: i === pageIdx ? "#C9A84C" : "#888" }}>
                  {isPageGated(i) ? <Lock size={8} style={{ display: "inline" }} /> : p.pageNumber}
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
        @keyframes cnFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cn-fade-in { animation: cnFadeIn 0.3s ease forwards; }
      `}</style>

      {/* ── Top bar (sticky reader controls) ── */}
      <div
        className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-3 py-2 transition-all duration-500"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)",
          paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: exit + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-heading font-bold tracking-wide transition-colors hover:text-[#C9A84C]"
            style={{ color: "#888" }}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">EXIT</span>
          </button>
          <span className="hidden sm:inline text-xs font-heading font-bold tracking-widest truncate max-w-[30vw]" style={{ color: "#E8DFC8" }}>
            {title.toUpperCase()}
          </span>
          {/* Emotional beat indicator */}
          {mode === "guided" && currentPanel?.isEmotionalBeat && (
            <span className="hidden sm:flex items-center gap-1 text-[9px] font-heading font-bold tracking-widest px-2 py-0.5 rounded-full cn-fade-in"
              style={{ background: "rgba(196,154,40,0.18)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.35)" }}>
              <Star size={8} fill="currentColor" /> EMOTIONAL BEAT
            </span>
          )}
        </div>

        {/* Center: mode switcher */}
        <div className="flex items-center gap-0.5 rounded-full px-1 py-1" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(196,154,40,0.2)" }}>
          {(["guided", "single", "spread", "overview"] as ReaderMode[]).map(m => {
            const icons: Record<ReaderMode, React.ReactNode> = {
              guided: <Compass size={11} />,
              single: <BookOpen size={11} />,
              spread: <Layers size={11} />,
              overview: <Grid3x3 size={11} />,
            };
            const labels: Record<ReaderMode, string> = {
              guided: "Guided",
              single: "Standard",
              spread: "Spread",
              overview: "Overview",
            };
            const isLocked = m === "guided" && !hasWitnessAccess;
            return (
              <button
                key={m}
                onClick={() => {
                  if (isLocked) return;
                  setMode(m);
                  setPanelIdx(0);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-heading font-bold tracking-wide transition-all"
                style={{
                  background: mode === m ? "rgba(196,154,40,0.22)" : "transparent",
                  color: isLocked ? "#444" : mode === m ? "#C9A84C" : "#666",
                  border: mode === m ? "1px solid rgba(196,154,40,0.4)" : "1px solid transparent",
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
                title={isLocked ? "Witness Access required for Guided Mode" : undefined}
              >
                {icons[m]}
                <span className="hidden md:inline">{labels[m]}</span>
                {isLocked && <Lock size={8} style={{ opacity: 0.5 }} />}
              </button>
            );
          })}
        </div>

        {/* Right: page counter + zoom + commentary + fullscreen */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-heading font-bold tracking-wider px-2 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.55)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.25)" }}>
            {pageLabel}
          </span>
          {mode !== "guided" && (
            <>
              <button onClick={e => { e.stopPropagation(); setZoom(z => Math.max(z - 0.2, 0.5)); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
                <ZoomOut size={12} />
              </button>
              <button onClick={e => { e.stopPropagation(); setZoom(z => Math.min(z + 0.2, 3.0)); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
                <ZoomIn size={12} />
              </button>
            </>
          )}
          {/* Creator Commentary toggle — only shown in guided mode when commentary exists */}
          {mode === "guided" && currentPanel?.commentary && (
            <button
              onClick={e => { e.stopPropagation(); setShowCommentary(s => !s); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: showCommentary ? "rgba(196,154,40,0.2)" : "transparent",
                color: showCommentary ? "#C9A84C" : "#888",
                border: showCommentary ? "1px solid rgba(196,154,40,0.4)" : "1px solid transparent",
              }}
              title="Creator Commentary (C)"
            >
              <MessageSquare size={13} />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors" style={{ color: "#888" }}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

        {/* ── Page area ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative"
        style={{ paddingBottom: isMobile ? "calc(80px + env(safe-area-inset-bottom, 0px))" : "0" }}
      >

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
          style={{ padding: mode === "guided" ? "0" : isMobile ? "48px 0 8px" : "52px 80px 52px" }}
        >
          {/* Guided mode: full page with panel zoom transform */}
          {mode === "guided" ? (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              {/* Lazy load: only render nearby pages */}
              {shouldLoadPage(pageIdx) && (
                <img
                  ref={imgRef}
                  src={pages[pageIdx]?.imageUrl}
                  alt={`Page ${pageIdx + 1}`}
                  className="absolute max-h-full object-contain"
                  style={{
                    maxWidth: "1100px",
                    ...guidedStyle,
                  }}
                  onLoad={computeGuidedTransform}
                  draggable={false}
                  loading="eager"
                />
              )}
              {/* Panel type badge */}
              {currentPanel && (
                <div
                  className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-heading font-bold tracking-widest cn-fade-in"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    color: currentPanel.type === "splash" || currentPanel.type === "cinematic" ? "#C9A84C" : "rgba(232,223,200,0.5)",
                    border: "1px solid rgba(196,154,40,0.15)",
                    opacity: showControls ? 1 : 0,
                    transition: "opacity 0.5s",
                  }}
                >
                  {currentPanel.type.toUpperCase()}
                </div>
              )}
              {/* Panel caption / narration */}
              {(currentPanel?.caption) && (
                <div
                  className="absolute bottom-20 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm text-center max-w-sm cn-fade-in"
                  style={{ background: "rgba(0,0,0,0.8)", color: "#F5F5F5", border: "1px solid rgba(196,154,40,0.2)", fontFamily: "'Georgia', serif", lineHeight: 1.7 }}
                >
                  {currentPanel.caption}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Primary page */}
              {shouldLoadPage(pageIdx) && (
                <img
                  src={pages[pageIdx]?.imageUrl}
                  alt={`Page ${pageIdx + 1}`}
                  className="max-h-full object-contain rounded-sm shadow-2xl"
                  style={{
                    maxWidth: mode === "spread" ? "540px" : isMobile ? "100vw" : "1100px",
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease",
                    willChange: "transform",
                  }}
                  draggable={false}
                  loading="eager"
                />
              )}
              {/* Spread: second page — hidden on mobile (too cramped) */}
              {mode === "spread" && !isMobile && spreadRight !== null && shouldLoadPage(spreadRight) && (
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
                  loading="lazy"
                />
              )}
            </>
          )}
        </div>

        {/* Preload adjacent pages (invisible) */}
        <div className="hidden">
          {pageIdx + 1 < totalPages && !isPageGated(pageIdx + 1) && (
            <img src={pages[pageIdx + 1]?.imageUrl} alt="" aria-hidden loading="lazy" />
          )}
          {pageIdx - 1 >= 0 && (
            <img src={pages[pageIdx - 1]?.imageUrl} alt="" aria-hidden loading="lazy" />
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

        {/* Next-page gate wall preview */}
        {isPageGated(pageIdx + 1) && pageIdx === freePageLimit - 1 && (
          <div
            className="absolute right-0 top-0 bottom-0 z-30 flex items-center justify-center"
            style={{ width: "clamp(60px, 15vw, 120px)", background: "linear-gradient(to left, rgba(0,0,0,0.95) 0%, transparent 100%)" }}
          >
            <div className="flex flex-col items-center gap-1.5">
              <Lock size={16} style={{ color: "#C9A84C", opacity: 0.7 }} />
              <span className="text-[8px] font-heading font-bold tracking-widest" style={{ color: "rgba(196,154,40,0.5)", writingMode: "vertical-rl" }}>WITNESS ACCESS</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Creator Commentary overlay ── */}
      {showCommentary && currentPanel?.commentary && (
        <div
          className="absolute left-4 right-4 z-[110] cn-fade-in"
          style={{
            bottom: isMobile ? "80px" : "72px",
            background: "rgba(8,8,8,0.92)",
            border: "1px solid rgba(196,154,40,0.3)",
            borderRadius: "16px",
            padding: "20px 24px",
            backdropFilter: "blur(12px)",
            maxWidth: "560px",
            margin: "0 auto",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={13} style={{ color: "#C9A84C" }} />
              <span className="text-[10px] font-heading font-bold tracking-widest" style={{ color: "#C9A84C" }}>CREATOR COMMENTARY</span>
            </div>
            <button onClick={() => setShowCommentary(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" style={{ color: "#666" }}>
              <X size={13} />
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(232,223,200,0.85)", fontFamily: "'Georgia', serif" }}>
            {currentPanel.commentary}
          </p>
        </div>
      )}

      {/* ── Bottom bar (sticky reader controls) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[100] transition-all duration-500"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? "auto" : "none",
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Page caption (non-guided) */}
        {pages[pageIdx]?.caption && mode !== "guided" && (
          <p className="text-center text-xs px-8 py-2" style={{ color: "rgba(232,223,200,0.75)", fontFamily: "'Georgia', serif" }}>
            {pages[pageIdx].caption}
          </p>
        )}

        {/* Mobile: guided mode panel indicator + next button */}
        {isMobile && mode === "guided" && (
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex gap-1 items-center">
              {currentPanels.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPanelIdx(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === panelIdx ? "16px" : "6px",
                    height: "6px",
                    background: i === panelIdx
                      ? (p.isEmotionalBeat ? "#C9A84C" : "rgba(196,154,40,0.9)")
                      : "rgba(196,154,40,0.2)",
                    boxShadow: i === panelIdx && p.isEmotionalBeat ? "0 0 8px rgba(196,154,40,0.6)" : "none",
                  }}
                />
              ))}
            </div>
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-bold tracking-wide transition-all active:scale-95"
              style={{ background: "rgba(196,154,40,0.18)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.4)" }}
            >
              {panelIdx < currentPanels.length - 1 ? "Next Panel" : pageIdx < totalPages - 1 ? "Next Page" : "Finish"}
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Desktop: prev/next page buttons + page dots */}
        {!isMobile && (
          <div className="flex items-center justify-between px-8 py-3">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-bold tracking-wide transition-all disabled:opacity-30 hover:opacity-80"
              style={{ background: "rgba(0,0,0,0.5)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.25)" }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            {/* Page dots (max 14 shown) */}
            <div className="flex gap-1 items-center">
              {pages.slice(0, Math.min(totalPages, 14)).map((_, i) => (
                <button
                  key={i}
                  onClick={() => !isPageGated(i) && goToPage(i, i > pageIdx ? "forward" : "back")}
                  className="rounded-full transition-all"
                  style={{
                    width: i === pageIdx ? "18px" : "6px",
                    height: "6px",
                    background: isPageGated(i)
                      ? "rgba(196,154,40,0.08)"
                      : i === pageIdx
                        ? "rgba(196,154,40,0.9)"
                        : "rgba(196,154,40,0.2)",
                    cursor: isPageGated(i) ? "not-allowed" : "pointer",
                  }}
                />
              ))}
              {totalPages > 14 && <span className="text-[9px] ml-1" style={{ color: "rgba(196,154,40,0.4)" }}>+{totalPages - 14}</span>}
            </div>
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-bold tracking-wide transition-all disabled:opacity-30 hover:opacity-80"
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
