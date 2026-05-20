/**
 * ManifestationReader — Immersive Reading Architecture
 * ─────────────────────────────────────────────────────
 * Spotify immersion + Kindle readability + Steam atmosphere + Anytype modularity.
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  [TopBar — minimal chrome, auto-hide]                       │
 *  ├────────┬────────────────────────────────────┬───────────────┤
 *  │  Left  │                                    │    Right      │
 *  │  Nav   │     Center Canvas (immersive)      │    Panel      │
 *  │  Panel │                                    │  (contextual) │
 *  ├────────┴────────────────────────────────────┴───────────────┤
 *  │  [BottomBar — progress, page nav, mode indicator]           │
 *  └─────────────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useRef } from "react";
import {
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BookOpen, Grid3x3, Layers, Compass, ZoomIn, ZoomOut,
  MessageSquare, Star, Lock, PanelLeftOpen, PanelRightOpen,
  Eye, Map, Fingerprint, Info, List, Settings,
} from "lucide-react";
import {
  useManifestationReader,
  type ManifestationReaderConfig,
  type ManifestationReaderState,
  type ViewingMode,
} from "./useManifestationReader";
import { LeftNavPanel } from "./LeftNavPanel";
import { RightContextPanel } from "./RightContextPanel";
import { StandardCanvas } from "./canvases/StandardCanvas";
import { SpreadCanvas } from "./canvases/SpreadCanvas";
import { GuidedCanvas } from "./canvases/GuidedCanvas";
import { OverviewCanvas } from "./canvases/OverviewCanvas";
import { ArchiveCanvas } from "./canvases/ArchiveCanvas";

// ── Component ─────────────────────────────────────────────────────────────────

export function ManifestationReader(config: ManifestationReaderConfig) {
  const state = useManifestationReader(config);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); state.goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); state.goPrev(); }
      if (e.key === "Escape") { state.close(); }
      if (e.key === "+" || e.key === "=") state.setZoom(z => z + 0.2);
      if (e.key === "-") state.setZoom(z => z - 0.2);
      if (e.key === "c" || e.key === "C") state.setShowCommentary(!state.showCommentary);
      if (e.key === "f" || e.key === "F") state.toggleFullscreen();
      if (e.key === "l" || e.key === "L") state.toggleLeftNav();
      if (e.key === "r" || e.key === "R") state.toggleRightPanel();
      if (e.key === "1") state.setMode("standard");
      if (e.key === "2") state.setMode("spread");
      if (e.key === "3") state.setMode("guided");
      if (e.key === "4") state.setMode("overview");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state]);

  // ── Wheel navigation ────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      state.setZoom(z => z - e.deltaY * 0.002);
    } else if (state.mode === "guided" || state.mode === "standard") {
      if (Math.abs(e.deltaY) > 30) {
        if (e.deltaY > 0) state.goNext();
        else state.goPrev();
      }
    }
  }, [state]);

  // ── Touch navigation ────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    state.resetControlsTimer();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDy > absDx && absDy > 40) {
      if (dy < 0) state.goNext(); else state.goPrev();
    } else if (absDx > absDy && absDx > 40) {
      if (dx < 0) state.goNext(); else state.goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // ── Double-tap fullscreen ───────────────────────────────────────────────
  const lastTap = useRef<number>(0);
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) state.toggleFullscreen();
    lastTap.current = now;
    state.resetControlsTimer();
  };

  // ── Witness Access Gate ─────────────────────────────────────────────────
  if (state.isPageGated(state.pageIdx)) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-[9999] flex flex-col items-center justify-center" style={{ background: "#050505" }}>
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
          <button onClick={state.close}
            className="px-6 py-2.5 rounded-full text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
            style={{ background: "rgba(196,154,40,0.18)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.4)" }}>
            Return to Work
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col select-none overflow-hidden"
      style={{ background: `rgba(5,5,5,${state.settings.backgroundIntensity / 100})` }}
      onMouseMove={state.resetControlsTimer}
      onClick={onTap}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes mrPageForward {
          0%   { opacity: 1; transform: translate3d(0,0,0) scale(1); }
          40%  { opacity: 0; transform: translate3d(-3%,0,0) scale(0.98); }
          60%  { opacity: 0; transform: translate3d(3%,0,0) scale(0.98); }
          100% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes mrPageBack {
          0%   { opacity: 1; transform: translate3d(0,0,0) scale(1); }
          40%  { opacity: 0; transform: translate3d(3%,0,0) scale(0.98); }
          60%  { opacity: 0; transform: translate3d(-3%,0,0) scale(0.98); }
          100% { opacity: 1; transform: translate3d(0,0,0) scale(1); }
        }
        @keyframes mrFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mrSlideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes mrSlideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        .mr-page-forward { animation: mrPageForward 0.44s cubic-bezier(0.4,0,0.2,1) forwards; }
        .mr-page-back    { animation: mrPageBack    0.44s cubic-bezier(0.4,0,0.2,1) forwards; }
        .mr-fade-in      { animation: mrFadeIn 0.3s ease forwards; }
        .mr-slide-left   { animation: mrSlideInLeft 0.35s cubic-bezier(0.4,0,0.2,1) forwards; }
        .mr-slide-right  { animation: mrSlideInRight 0.35s cubic-bezier(0.4,0,0.2,1) forwards; }
      `}</style>

      {/* ── Top Bar (minimal chrome) ── */}
      <TopBar state={state} config={config} />

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Panel */}
        {state.leftNavOpen && (
          <LeftNavPanel state={state} config={config} />
        )}

        {/* Center Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          {/* Left nav zone (click area) */}
          <button
            onClick={e => { e.stopPropagation(); state.goPrev(); }}
            disabled={!state.canGoPrev}
            className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-start pl-3 md:pl-5 transition-opacity"
            style={{
              width: "clamp(44px, 8vw, 70px)",
              opacity: state.showControls && state.canGoPrev ? 1 : 0,
              pointerEvents: state.canGoPrev ? "auto" : "none",
              background: "linear-gradient(to right, rgba(0,0,0,0.3) 0%, transparent 100%)",
            }}
          >
            <ChevronLeft size={24} style={{ color: "rgba(196,154,40,0.8)" }} />
          </button>

          {/* Render active canvas based on mode */}
          <CanvasRouter state={state} config={config} />

          {/* Right nav zone (click area) */}
          <button
            onClick={e => { e.stopPropagation(); state.goNext(); }}
            disabled={!state.canGoNext}
            className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-end pr-3 md:pr-5 transition-opacity"
            style={{
              width: "clamp(44px, 8vw, 70px)",
              opacity: state.showControls && state.canGoNext ? 1 : 0,
              pointerEvents: state.canGoNext ? "auto" : "none",
              background: "linear-gradient(to left, rgba(0,0,0,0.3) 0%, transparent 100%)",
            }}
          >
            <ChevronRight size={24} style={{ color: "rgba(196,154,40,0.8)" }} />
          </button>
        </div>

        {/* Right Contextual Panel */}
        {state.rightPanelOpen && (
          <RightContextPanel state={state} config={config} />
        )}
      </div>

      {/* ── Bottom Bar ── */}
      <BottomBar state={state} config={config} />
    </div>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────

function TopBar({ state, config }: { state: ManifestationReaderState; config: ManifestationReaderConfig }) {
  const modeIcons: Record<ViewingMode, React.ReactNode> = {
    standard: <BookOpen size={11} />,
    spread: <Layers size={11} />,
    guided: <Compass size={11} />,
    overview: <Grid3x3 size={11} />,
    archive: <Fingerprint size={11} />,
  };
  const modeLabels: Record<ViewingMode, string> = {
    standard: "Standard",
    spread: "Spread",
    guided: "Guided",
    overview: "Overview",
    archive: "Archive",
  };

  const availableModes: ViewingMode[] = ["standard", "spread", "guided", "overview"];

  return (
    <div
      className="absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-3 transition-all duration-500"
      style={{
        opacity: state.showControls ? 1 : 0,
        pointerEvents: state.showControls ? "auto" : "none",
        background: "linear-gradient(to bottom, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 60%, transparent 100%)",
        paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Left: exit + nav toggle + title */}
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={state.close}
          className="flex items-center gap-1 text-xs font-heading font-bold tracking-wide transition-colors hover:text-[#C9A84C]"
          style={{ color: "#666" }}>
          <X size={16} />
        </button>
        <button onClick={state.toggleLeftNav}
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:bg-white/5"
          style={{ color: state.leftNavOpen ? "#C9A84C" : "#666" }}>
          <PanelLeftOpen size={14} />
        </button>
        <span className="text-xs font-heading font-bold tracking-widest truncate max-w-[25vw]" style={{ color: "#E8DFC8" }}>
          {config.title.toUpperCase()}
        </span>
        {/* Chapter indicator */}
        {state.currentChapter && (
          <span className="hidden lg:inline text-[10px] font-heading tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: "rgba(196,154,40,0.1)", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.15)" }}>
            {state.currentChapter.title}
          </span>
        )}
        {/* Emotional beat indicator */}
        {state.mode === "guided" && state.currentPanel?.isEmotionalBeat && (
          <span className="hidden sm:flex items-center gap-1 text-[9px] font-heading font-bold tracking-widest px-2 py-0.5 rounded-full mr-fade-in"
            style={{ background: "rgba(196,154,40,0.18)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.35)" }}>
            <Star size={8} fill="currentColor" /> EMOTIONAL BEAT
          </span>
        )}
      </div>

      {/* Center: mode switcher */}
      <div className="flex items-center gap-0.5 rounded-full px-1 py-1"
        style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(196,154,40,0.15)" }}>
        {availableModes.map(m => {
          const isLocked = m === "guided" && !config.hasWitnessAccess;
          return (
            <button
              key={m}
              onClick={() => { if (!isLocked) state.setMode(m); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-heading font-bold tracking-wide transition-all"
              style={{
                background: state.mode === m ? "rgba(196,154,40,0.2)" : "transparent",
                color: isLocked ? "#333" : state.mode === m ? "#C9A84C" : "#555",
                border: state.mode === m ? "1px solid rgba(196,154,40,0.35)" : "1px solid transparent",
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
              title={isLocked ? "Witness Access required" : modeLabels[m]}
            >
              {modeIcons[m]}
              <span className="hidden md:inline">{modeLabels[m]}</span>
              {isLocked && <Lock size={8} style={{ opacity: 0.4 }} />}
            </button>
          );
        })}
      </div>

      {/* Right: page counter + tools + right panel toggle */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-heading font-bold tracking-wider px-2 py-1 rounded-full"
          style={{ background: "rgba(0,0,0,0.55)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.2)" }}>
          {state.pageLabel}
        </span>
        {state.mode !== "guided" && state.mode !== "overview" && (
          <>
            <button onClick={e => { e.stopPropagation(); state.setZoom(z => z - 0.2); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#666" }}>
              <ZoomOut size={12} />
            </button>
            <button onClick={e => { e.stopPropagation(); state.setZoom(z => z + 0.2); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#666" }}>
              <ZoomIn size={12} />
            </button>
          </>
        )}
        {/* Commentary toggle */}
        {state.mode === "guided" && state.currentPanel?.commentary && (
          <button
            onClick={e => { e.stopPropagation(); state.setShowCommentary(!state.showCommentary); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{
              background: state.showCommentary ? "rgba(196,154,40,0.15)" : "transparent",
              color: state.showCommentary ? "#C9A84C" : "#666",
            }}
            title="Creator Commentary (C)"
          >
            <MessageSquare size={13} />
          </button>
        )}
        {/* Right panel toggle */}
        <button onClick={e => { e.stopPropagation(); state.toggleRightPanel(); }}
          className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: state.rightPanelOpen ? "#C9A84C" : "#666" }}>
          <PanelRightOpen size={14} />
        </button>
        {/* Fullscreen */}
        <button onClick={e => { e.stopPropagation(); state.toggleFullscreen(); }}
          className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/5 transition-colors" style={{ color: "#666" }}>
          {state.isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>
    </div>
  );
}

// ── Canvas Router ─────────────────────────────────────────────────────────────

function CanvasRouter({ state, config }: { state: ManifestationReaderState; config: ManifestationReaderConfig }) {
  switch (state.mode) {
    case "overview":
      return <OverviewCanvas state={state} config={config} />;
    case "guided":
      return <GuidedCanvas state={state} config={config} />;
    case "spread":
      return <SpreadCanvas state={state} config={config} />;
    case "archive":
      return <ArchiveCanvas state={state} config={config} />;
    case "standard":
    default:
      return <StandardCanvas state={state} config={config} />;
  }
}

// ── Bottom Bar ────────────────────────────────────────────────────────────────

function BottomBar({ state, config }: { state: ManifestationReaderState; config: ManifestationReaderConfig }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const progressPct = state.totalPages > 1 ? ((state.pageIdx) / (state.totalPages - 1)) * 100 : 0;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-[100] transition-all duration-500"
      style={{
        opacity: state.showControls ? 1 : 0,
        pointerEvents: state.showControls ? "auto" : "none",
        background: "linear-gradient(to top, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.6) 60%, transparent 100%)",
        paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Progress bar */}
      {state.settings.progressBarVisible && state.mode !== "overview" && (
        <div className="mx-8 mb-2">
          <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(196,154,40,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%`, background: "rgba(196,154,40,0.6)" }}
            />
          </div>
        </div>
      )}

      {/* Page caption (non-guided) */}
      {config.pages[state.pageIdx]?.caption && state.mode !== "guided" && state.mode !== "overview" && (
        <p className="text-center text-xs px-8 py-1.5" style={{ color: "rgba(232,223,200,0.65)", fontFamily: "'Georgia', serif" }}>
          {config.pages[state.pageIdx].caption}
        </p>
      )}

      {/* Mobile: guided mode panel indicator */}
      {isMobile && state.mode === "guided" && (
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex gap-1 items-center">
            {state.currentPanels.map((p, i) => (
              <button
                key={i}
                onClick={() => state.setPanelIdx(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === state.panelIdx ? "16px" : "6px",
                  height: "6px",
                  background: i === state.panelIdx
                    ? (p.isEmotionalBeat ? "#C9A84C" : "rgba(196,154,40,0.9)")
                    : "rgba(196,154,40,0.15)",
                  boxShadow: i === state.panelIdx && p.isEmotionalBeat ? "0 0 8px rgba(196,154,40,0.5)" : "none",
                }}
              />
            ))}
          </div>
          <button
            onClick={state.goNext}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading font-bold tracking-wide transition-all active:scale-95"
            style={{ background: "rgba(196,154,40,0.15)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.3)" }}>
            {state.panelIdx < state.currentPanels.length - 1 ? "Next Panel" : state.pageIdx < state.totalPages - 1 ? "Next Page" : "Finish"}
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Desktop: prev/next + page dots */}
      {!isMobile && state.mode !== "overview" && (
        <div className="flex items-center justify-between px-8 py-2">
          <button
            onClick={state.goPrev}
            disabled={!state.canGoPrev}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading font-bold tracking-wide transition-all disabled:opacity-20 hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.4)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.2)" }}>
            <ChevronLeft size={14} /> Prev
          </button>
          {/* Page dots (max 16) */}
          <div className="flex gap-1 items-center">
            {config.pages.slice(0, Math.min(state.totalPages, 16)).map((_, i) => (
              <button
                key={i}
                onClick={() => !state.isPageGated(i) && state.goToPage(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === state.pageIdx ? "18px" : "5px",
                  height: "5px",
                  background: state.isPageGated(i)
                    ? "rgba(196,154,40,0.05)"
                    : i === state.pageIdx
                      ? "rgba(196,154,40,0.85)"
                      : "rgba(196,154,40,0.15)",
                  cursor: state.isPageGated(i) ? "not-allowed" : "pointer",
                }}
              />
            ))}
            {state.totalPages > 16 && <span className="text-[9px] ml-1" style={{ color: "rgba(196,154,40,0.3)" }}>+{state.totalPages - 16}</span>}
          </div>
          <button
            onClick={state.goNext}
            disabled={!state.canGoNext}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading font-bold tracking-wide transition-all disabled:opacity-20 hover:opacity-80"
            style={{ background: "rgba(0,0,0,0.4)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.2)" }}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
