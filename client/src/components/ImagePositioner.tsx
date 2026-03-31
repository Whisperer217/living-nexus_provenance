/**
 * ImagePositioner — Direct-manipulation image editor
 *
 * PRINCIPLE: The editing interface must disappear behind the work.
 *
 * INTERACTIONS (on the canvas itself):
 *   - Click + drag    → reposition (moves background-position)
 *   - Scroll wheel    → zoom in/out
 *   - Pinch (touch)   → zoom in/out
 *   - Double-click    → reset to center (x=50, y=50, zoom=110)
 *
 * KEYBOARD (active when canvas is focused — invisible otherwise):
 *   - R               → reset center
 *   - + / =           → zoom in
 *   - - / _           → zoom out
 *   - Arrow keys      → nudge position (1% per press, 5% with Shift)
 *   - Enter           → save
 *   - Esc             → cancel
 *
 * CONTROLS:
 *   - Thin 44px dock BELOW the image (never on the canvas)
 *   - Mode buttons: Fit | Crop | Stretch⚠ (low contrast, utility-first)
 *   - Save button only highlights when changes exist
 *   - Contextual overlays: zoom % and crosshair guides appear during
 *     interaction and fade out after 1.5s
 *   - Keyboard hint strip: appears in dock only when canvas is focused
 *
 * RENDERING:
 *   - Crop (default): background-size: cover, zoom=110
 *   - Fit: background-size: contain, letterbox visible
 *   - Stretch: background-size: 100% 100% — explicit override only
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles } from "lucide-react";

interface ImagePositionerProps {
  imageUrl: string;
  initialX?: number;
  initialY?: number;
  initialZoom?: number;
  aiFocal?: boolean;
  previewHeight?: string;
  previewClass?: string;
  roundedTop?: boolean;
  onSave: (pos: { x: number; y: number; zoom: number }) => void;
  onCancel: () => void;
  label?: string;
}

// Backward-compat with old { initialPosition: { x, y } } call sites
interface LegacyProps {
  imageUrl: string;
  initialPosition?: { x: number; y: number };
  aspectClass?: string;
  onSave: (pos: { x: number; y: number; zoom?: number }) => void;
  onCancel?: () => void;
  label?: string;
}

type Mode = "crop" | "fit" | "stretch";

export function ImagePositioner(props: ImagePositionerProps | LegacyProps) {
  const imageUrl      = props.imageUrl;
  const initialX      = "initialX"      in props ? (props.initialX      ?? 50)  : ((props as LegacyProps).initialPosition?.x ?? 50);
  const initialY      = "initialY"      in props ? (props.initialY      ?? 50)  : ((props as LegacyProps).initialPosition?.y ?? 50);
  const initialZoom   = "initialZoom"   in props ? (props.initialZoom   ?? 110) : 110;
  const aiFocal       = "aiFocal"       in props ? (props.aiFocal       ?? false) : false;
  const previewHeight = "previewHeight" in props ? (props.previewHeight ?? "14rem") : "14rem";
  const previewClass  = "previewClass"  in props ? (props.previewClass  ?? "") : "";
  const roundedTop    = "roundedTop"    in props ? (props.roundedTop    ?? true) : true;
  const onSave        = props.onSave;
  const onCancel      = props.onCancel ?? (() => {});
  const label         = props.label ?? "Editing";

  const [x, setX]       = useState(initialX);
  const [y, setY]       = useState(initialY);
  const [zoom, setZoom] = useState(Math.max(100, Math.min(300, initialZoom)));
  const [mode, setMode] = useState<Mode>(initialZoom <= 100 ? "fit" : "crop");

  // Track whether anything changed from initial values
  const hasChanges = x !== initialX || y !== initialY || zoom !== initialZoom;

  // ── Contextual overlay ────────────────────────────────────────────
  const [showOverlay, setShowOverlay] = useState(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashOverlay = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setShowOverlay(false), 1500);
  }, []);

  useEffect(() => () => {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
  }, []);

  // ── Canvas focus state (drives keyboard hint visibility) ──────────
  const [canvasFocused, setCanvasFocused] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Keyboard shortcuts ────────────────────────────────────────────
  // Present when canvas is focused, invisible otherwise.
  useEffect(() => {
    if (!canvasFocused) return;
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;

      const step = e.shiftKey ? 5 : 1;

      switch (e.key) {
        case "r":
        case "R":
          e.preventDefault();
          setX(50); setY(50); setZoom(110); setMode("crop");
          flashOverlay();
          break;
        case "+":
        case "=":
          e.preventDefault();
          if (mode === "fit") return;
          setZoom(prev => Math.min(300, prev + 5));
          flashOverlay();
          break;
        case "-":
        case "_":
          e.preventDefault();
          if (mode === "fit") return;
          setZoom(prev => Math.max(100, prev - 5));
          flashOverlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (mode === "fit") return;
          setX(prev => Math.max(0, prev - step));
          flashOverlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (mode === "fit") return;
          setX(prev => Math.min(100, prev + step));
          flashOverlay();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (mode === "fit") return;
          setY(prev => Math.max(0, prev - step));
          flashOverlay();
          break;
        case "ArrowDown":
          e.preventDefault();
          if (mode === "fit") return;
          setY(prev => Math.min(100, prev + step));
          flashOverlay();
          break;
        case "Enter":
          e.preventDefault();
          onSave({ x, y, zoom: mode === "fit" ? 100 : mode === "stretch" ? 100 : zoom });
          break;
        case "Escape":
          e.preventDefault();
          onCancel();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [canvasFocused, mode, x, y, zoom, flashOverlay, onSave, onCancel]);

  // ── Drag to reposition ────────────────────────────────────────────
  const dragRef = useRef<{ startX: number; startY: number; startBgX: number; startBgY: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === "fit") return;
    e.preventDefault();
    canvasRef.current?.focus();
    dragRef.current = { startX: e.clientX, startY: e.clientY, startBgX: x, startBgY: y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const sensitivity = 0.15;
      const newX = Math.max(0, Math.min(100, dragRef.current.startBgX - dx * sensitivity));
      const newY = Math.max(0, Math.min(100, dragRef.current.startBgY - dy * sensitivity));
      setX(Math.round(newX));
      setY(Math.round(newY));
      flashOverlay();
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [mode, x, y, flashOverlay]);

  // ── Touch drag + pinch zoom ───────────────────────────────────────
  const touchRef = useRef<{
    startX: number; startY: number; startBgX: number; startBgY: number;
    dist?: number; startZoom?: number;
  } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (mode === "fit") return;
    if (e.touches.length === 1) {
      touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startBgX: x, startBgY: y };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchRef.current = { startX: 0, startY: 0, startBgX: x, startBgY: y, dist: Math.hypot(dx, dy), startZoom: zoom };
    }
  }, [mode, x, y, zoom]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current || mode === "fit") return;
    e.preventDefault();
    if (e.touches.length === 1 && touchRef.current.dist === undefined) {
      const dx = e.touches[0].clientX - touchRef.current.startX;
      const dy = e.touches[0].clientY - touchRef.current.startY;
      setX(Math.round(Math.max(0, Math.min(100, touchRef.current.startBgX - dx * 0.2))));
      setY(Math.round(Math.max(0, Math.min(100, touchRef.current.startBgY - dy * 0.2))));
      flashOverlay();
    } else if (e.touches.length === 2 && touchRef.current.dist !== undefined) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const scale = Math.hypot(dx, dy) / touchRef.current.dist!;
      const newZoom = Math.max(100, Math.min(300, Math.round((touchRef.current.startZoom ?? zoom) * scale)));
      setZoom(newZoom);
      if (newZoom > 100 && mode !== "crop") setMode("crop");
      flashOverlay();
    }
  }, [mode, zoom, flashOverlay]);

  const onTouchEnd = useCallback(() => { touchRef.current = null; }, []);

  // ── Scroll to zoom ────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (mode === "fit") return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    setZoom(prev => {
      const next = Math.max(100, Math.min(300, prev + delta));
      if (next > 100 && mode !== "crop") setMode("crop");
      return next;
    });
    flashOverlay();
  }, [mode, flashOverlay]);

  // ── Double-click to reset ─────────────────────────────────────────
  const onDoubleClick = useCallback(() => {
    setX(50); setY(50); setZoom(110); setMode("crop");
    flashOverlay();
  }, [flashOverlay]);

  // ── Derived styles ────────────────────────────────────────────────
  const bgSize = mode === "stretch" ? "100% 100%" : mode === "fit" ? "contain" : "cover";
  const bgPos  = mode === "fit" ? "center center" : `${x}% ${y}%`;
  const topRadius   = roundedTop ? "rounded-t-xl" : "";
  const cursorStyle = mode === "fit" ? "default" : "grab";

  return (
    <div className="w-full select-none">
      {/* ── Canvas — the work lives here ── */}
      <div
        ref={canvasRef}
        tabIndex={0}
        className={`relative w-full overflow-hidden outline-none ${topRadius} ${previewClass}`}
        style={{
          height: previewHeight,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: bgSize,
          backgroundPosition: bgPos,
          backgroundRepeat: "no-repeat",
          backgroundColor: "oklch(0.06 0.02 280)",
          cursor: cursorStyle,
          touchAction: "none",
        }}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onFocus={() => setCanvasFocused(true)}
        onBlur={() => setCanvasFocused(false)}
      >
        {/* Thin gold frame — boundary only, no weight */}
        <div
          className={`absolute inset-0 pointer-events-none ${topRadius}`}
          style={{ boxShadow: "inset 0 0 0 1px rgba(201,168,76,0.35)" }}
        />

        {/* Small label badge — top-left, minimal */}
        <div
          className="absolute top-2 left-2 text-[10px] font-mono px-2 py-0.5 rounded pointer-events-none select-none"
          style={{ background: "rgba(0,0,0,0.5)", color: "rgba(201,168,76,0.7)", backdropFilter: "blur(4px)" }}
        >
          {label}
        </div>

        {/* AI badge — top-right, only when AI focal active */}
        {aiFocal && (
          <div
            className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded pointer-events-none select-none"
            style={{ background: "rgba(0,0,0,0.45)", color: "rgba(201,168,76,0.65)", backdropFilter: "blur(4px)" }}
          >
            <Sparkles className="w-2.5 h-2.5" /> AI
          </div>
        )}

        {/* Contextual overlay — appears during interaction, fades out */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-500"
          style={{ opacity: showOverlay ? 1 : 0 }}
        >
          {mode !== "fit" && (
            <>
              <div className="absolute top-0 bottom-0 w-px" style={{ left: `${x}%`, background: "rgba(255,255,255,0.12)" }} />
              <div className="absolute left-0 right-0 h-px" style={{ top: `${y}%`, background: "rgba(255,255,255,0.12)" }} />
            </>
          )}
          <div
            className="text-xs font-mono px-2.5 py-1 rounded"
            style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.7)", backdropFilter: "blur(6px)" }}
          >
            {mode === "fit" ? "FIT" : mode === "stretch" ? "STRETCH" : `${zoom}%`}
          </div>
        </div>

        {/* Static hint — very low opacity, bottom center */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded pointer-events-none select-none whitespace-nowrap"
          style={{ background: "rgba(0,0,0,0.35)", color: "rgba(255,255,255,0.18)" }}
        >
          {mode === "fit"
            ? "Full image — switch to Crop to reposition"
            : "drag · scroll to zoom · double-click to reset"}
        </div>
      </div>

      {/* ── Thin bottom dock — 44px, outside the canvas ── */}
      <div
        className="flex items-center gap-1.5 px-3 rounded-b-xl"
        style={{
          height: "44px",
          background: "oklch(0.11 0.015 280)",
          borderLeft: "1px solid rgba(201,168,76,0.15)",
          borderRight: "1px solid rgba(201,168,76,0.15)",
          borderBottom: "1px solid rgba(201,168,76,0.15)",
        }}
      >
        {/* Mode buttons — low contrast, utility-first */}
        <button
          type="button"
          onClick={() => setMode("fit")}
          className="text-[11px] px-2.5 py-1 rounded transition-all"
          style={mode === "fit"
            ? { background: "rgba(110,231,183,0.1)", color: "#6ee7b7", border: "1px solid rgba(110,231,183,0.2)" }
            : { background: "transparent", color: "#4b5563", border: "1px solid transparent" }
          }
        >
          Fit
        </button>
        <button
          type="button"
          onClick={() => { setMode("crop"); if (zoom <= 100) setZoom(110); }}
          className="text-[11px] px-2.5 py-1 rounded transition-all"
          style={mode === "crop"
            ? { background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }
            : { background: "transparent", color: "#4b5563", border: "1px solid transparent" }
          }
        >
          Crop
        </button>
        {/* Stretch — visually de-emphasised, ⚠ labelled */}
        <button
          type="button"
          onClick={() => setMode(mode === "stretch" ? "crop" : "stretch")}
          className="text-[10px] px-2 py-1 rounded transition-all"
          style={mode === "stretch"
            ? { background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }
            : { background: "transparent", color: "#374151", border: "1px solid transparent" }
          }
          title="Stretch distorts original pixels — explicit override only"
        >
          ⚠ Str
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Keyboard hint strip — visible only when canvas is focused */}
        <div
          className="flex items-center gap-2 transition-opacity duration-300 mr-2"
          style={{ opacity: canvasFocused ? 1 : 0, pointerEvents: "none" }}
        >
          {[
            { key: "R", label: "reset" },
            { key: "+/−", label: "zoom" },
            { key: "↑↓←→", label: "nudge" },
            { key: "↵", label: "save" },
            { key: "⎋", label: "cancel" },
          ].map(({ key, label }) => (
            <span key={key} className="flex items-center gap-0.5 text-[9px]" style={{ color: "#374151" }}>
              <kbd
                className="px-1 py-0.5 rounded text-[9px] font-mono"
                style={{ background: "rgba(255,255,255,0.06)", color: "#4b5563", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {key}
              </kbd>
              <span style={{ color: "#2d3748" }}>{label}</span>
            </span>
          ))}
        </div>

        {/* Cancel */}
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] px-3 py-1 rounded transition-colors"
          style={{ color: "#4b5563", background: "transparent" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#4b5563"; }}
        >
          Cancel
        </button>

        {/* Save — only gold when changes exist */}
        <button
          type="button"
          onClick={() => onSave({ x, y, zoom: mode === "fit" ? 100 : mode === "stretch" ? 100 : zoom })}
          className="text-[11px] px-3 py-1 rounded font-semibold transition-all"
          style={hasChanges
            ? { background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "#0a0812", boxShadow: "0 2px 8px rgba(201,168,76,0.25)" }
            : { background: "rgba(255,255,255,0.06)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }
          }
        >
          Save
        </button>
      </div>
    </div>
  );
}
