/**
 * PinchZoomImage
 *
 * A lightweight image viewer that supports:
 *   - Pinch-to-zoom (two-finger touch)
 *   - Drag to pan (when zoomed in)
 *   - Double-tap to reset zoom
 *   - Mouse wheel zoom (desktop)
 *
 * Usage:
 *   <PinchZoomImage src={url} alt="..." />
 */
import { useRef, useState, useCallback, useEffect } from "react";

interface PinchZoomImageProps {
  src: string;
  alt?: string;
  maxHeight?: string;
}

export default function PinchZoomImage({ src, alt = "", maxHeight = "70vh" }: PinchZoomImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Refs for touch state (avoids stale closures in event handlers)
  const touchState = useRef<{
    type: "none" | "drag" | "pinch";
    // drag
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
    // pinch
    startDist: number;
    startScale: number;
    // double-tap
    lastTap: number;
  }>({
    type: "none",
    startX: 0, startY: 0, startTx: 0, startTy: 0,
    startDist: 0, startScale: 1,
    lastTap: 0,
  });

  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  scaleRef.current = scale;
  translateRef.current = translate;

  const clampTranslate = useCallback((tx: number, ty: number, s: number) => {
    const el = containerRef.current;
    if (!el) return { x: tx, y: ty };
    const maxX = (el.clientWidth * (s - 1)) / 2;
    const maxY = (el.clientHeight * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    };
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // ── Touch handlers ────────────────────────────────────────────────
  const onTouchStart = useCallback((e: TouchEvent) => {
    const ts = touchState.current;

    if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - ts.lastTap < 300) {
        e.preventDefault();
        resetZoom();
        ts.lastTap = 0;
        return;
      }
      ts.lastTap = now;

      ts.type = "drag";
      ts.startX = e.touches[0].clientX;
      ts.startY = e.touches[0].clientY;
      ts.startTx = translateRef.current.x;
      ts.startTy = translateRef.current.y;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      ts.type = "pinch";
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      ts.startDist = Math.hypot(dx, dy);
      ts.startScale = scaleRef.current;
      ts.startTx = translateRef.current.x;
      ts.startTy = translateRef.current.y;
    }
  }, [resetZoom]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    const ts = touchState.current;
    if (ts.type === "drag" && e.touches.length === 1 && scaleRef.current > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - ts.startX;
      const dy = e.touches[0].clientY - ts.startY;
      const clamped = clampTranslate(ts.startTx + dx, ts.startTy + dy, scaleRef.current);
      setTranslate(clamped);
    } else if (ts.type === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.max(1, Math.min(5, ts.startScale * (dist / ts.startDist)));
      setScale(newScale);
      // Re-clamp translate for new scale
      const clamped = clampTranslate(ts.startTx, ts.startTy, newScale);
      setTranslate(clamped);
    }
  }, [clampTranslate]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const ts = touchState.current;
    if (e.touches.length === 0) {
      ts.type = "none";
      // Snap back to 1x if scale is very close
      if (scaleRef.current < 1.05) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1) {
      // Transition from pinch back to drag
      ts.type = "drag";
      ts.startX = e.touches[0].clientX;
      ts.startY = e.touches[0].clientY;
      ts.startTx = translateRef.current.x;
      ts.startTy = translateRef.current.y;
    }
  }, []);

  // ── Mouse wheel zoom (desktop) ────────────────────────────────────
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale(prev => {
      const next = Math.max(1, Math.min(5, prev + delta));
      if (next <= 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Attach native listeners (passive: false so preventDefault works)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, onWheel]);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "hidden",
        touchAction: "none",
        cursor: scale > 1 ? "grab" : "default",
        background: "var(--ln-obsidian)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        maxHeight,
        minHeight: 120,
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          display: "block",
          maxWidth: "100%",
          maxHeight,
          objectFit: "contain",
          transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
          transformOrigin: "center center",
          transition: scale === 1 ? "transform 0.2s ease" : "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: "none", // let container handle all touch events
        }}
      />
      {scale > 1 && (
        <button
          onClick={resetZoom}
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.75)",
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.45rem",
            letterSpacing: "0.08em",
            padding: "3px 8px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          RESET ZOOM
        </button>
      )}
    </div>
  );
}
