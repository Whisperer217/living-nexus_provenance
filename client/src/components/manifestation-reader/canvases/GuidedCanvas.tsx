/**
 * GuidedCanvas — Sequential panel focus with cinematic transitions.
 * Adapts pacing and transition style from the medium adapter.
 * GPU-accelerated panel zoom, creator commentary overlays, emotional beats.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import type { ManifestationReaderState, ManifestationReaderConfig, TransitionType } from "../useManifestationReader";

interface Props {
  state: ManifestationReaderState;
  config: ManifestationReaderConfig;
}

export function GuidedCanvas({ state, config }: Props) {
  const page = config.pages[state.pageIdx];
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [guidedStyle, setGuidedStyle] = useState<React.CSSProperties>({});

  const { pacing, layout } = state.adapter;

  // Compute GPU-accelerated transform for panel zoom
  const computeGuidedTransform = useCallback(() => {
    const img = imgRef.current;
    if (!img || state.currentPanels.length === 0) {
      setGuidedStyle({});
      return;
    }
    const panel = state.currentPanels[state.panelIdx];
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

    // Adapter-driven transition duration; panel-level type overrides adapter default
    const duration = pacing.transitionDuration;
    const transitionMap: Record<TransitionType, string> = {
      fade: `opacity 0.4s ease, transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      zoom: `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
      pan: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      cut: "transform 0s",
      cinematic: `transform ${Math.round(duration * 1.5)}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
    };
    const panelTransition = panel.transitionType ?? (pacing.transitionStyle as TransitionType) ?? "zoom";
    const transition = transitionMap[panelTransition] ?? transitionMap.zoom;

    setGuidedStyle({
      transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
      transformOrigin: "0 0",
      transition,
      willChange: "transform",
    });
  }, [state.currentPanels, state.panelIdx, pacing.transitionDuration, pacing.transitionStyle]);

  useEffect(() => {
    computeGuidedTransform();
  }, [state.panelIdx, state.pageIdx, computeGuidedTransform]);

  if (!page) return null;

  const currentPanel = state.currentPanel;
  const maxWidth = `${Math.round(layout.maxWidthFraction * 100)}vw`;

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Full page with panel zoom transform */}
      {state.shouldLoadPage(state.pageIdx) && (
        <img
          ref={imgRef}
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="absolute max-h-full object-contain"
          style={{
            maxWidth,
            ...guidedStyle,
          }}
          onLoad={computeGuidedTransform}
          draggable={false}
          loading="eager"
        />
      )}

      {/* Panel type badge */}
      {currentPanel && state.showControls && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-heading font-bold tracking-widest mr-fade-in z-30"
          style={{
            background: "rgba(0,0,0,0.7)",
            color: currentPanel.type === "splash" || currentPanel.type === "cinematic" ? "#C9A84C" : "rgba(232,223,200,0.5)",
            border: "1px solid rgba(196,154,40,0.15)",
          }}
        >
          {currentPanel.type.toUpperCase()}
        </div>
      )}

      {/* Panel caption / narration */}
      {currentPanel?.caption && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm text-center max-w-sm mr-fade-in z-30"
          style={{
            background: "rgba(5,5,5,0.85)",
            color: "#F5F5F5",
            border: "1px solid rgba(196,154,40,0.15)",
            fontFamily: "'Georgia', serif",
            lineHeight: 1.7,
            backdropFilter: "blur(8px)",
          }}
        >
          {currentPanel.caption}
        </div>
      )}

      {/* Creator Commentary overlay */}
      {state.showCommentary && currentPanel?.commentary && (
        <div
          className="absolute left-4 right-4 z-[110] mr-fade-in"
          style={{
            bottom: "90px",
            background: "rgba(5,5,5,0.94)",
            border: "1px solid rgba(196,154,40,0.25)",
            borderRadius: "16px",
            padding: "20px 24px",
            backdropFilter: "blur(12px)",
            maxWidth: "520px",
            margin: "0 auto",
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={13} style={{ color: "#C9A84C" }} />
              <span className="text-[10px] font-heading font-bold tracking-widest" style={{ color: "#C9A84C" }}>CREATOR COMMENTARY</span>
            </div>
            <button onClick={() => state.setShowCommentary(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10" style={{ color: "#555" }}>
              <X size={13} />
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(232,223,200,0.8)", fontFamily: "'Georgia', serif" }}>
            {currentPanel.commentary}
          </p>
        </div>
      )}

      {/* Preload adjacent pages */}
      <div className="hidden">
        {state.pageIdx + 1 < state.totalPages && !state.isPageGated(state.pageIdx + 1) && (
          <img src={config.pages[state.pageIdx + 1]?.imageUrl} alt="" aria-hidden loading="lazy" />
        )}
        {state.pageIdx - 1 >= 0 && (
          <img src={config.pages[state.pageIdx - 1]?.imageUrl} alt="" aria-hidden loading="lazy" />
        )}
      </div>
    </div>
  );
}
