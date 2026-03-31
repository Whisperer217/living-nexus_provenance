/**
 * ImagePositioner — Inline slider repositioner (mobile-first)
 *
 * DOCTRINE: The frame must adapt to the work — never distort the creator's image.
 *
 * RENDERING RULES:
 *   - Default mode is CROP (background-size: cover). The image fills the frame,
 *     cropping edges. This matches the actual banner render on the profile page.
 *   - FIT mode shows the full image with letterbox (background-size: contain).
 *     Use when the creator explicitly wants the whole image visible.
 *   - STRETCH is an explicit override only — it distorts pixels and is labelled
 *     with a warning. It is never the default.
 *
 * AI FOCAL POINT:
 *   When initialX/initialY are provided from an AI focal point detection call,
 *   an "AI" badge appears on the position sliders to signal auto-placement.
 *   The creator can override by moving the sliders.
 *
 * onSave returns { x, y, zoom } where:
 *   - x, y: 0–100 background-position percentages
 *   - zoom: 100 = fit/contain, 101–200 = cover with progressive zoom
 *
 * Props:
 *   imageUrl      — the image to preview
 *   initialX      — starting horizontal position 0–100 (default 50)
 *   initialY      — starting vertical position 0–100 (default 50)
 *   initialZoom   — starting zoom 100–200 (default 110 = crop/cover)
 *   aiFocal       — true if initialX/Y came from AI detection (shows badge)
 *   previewHeight — CSS height string for the preview strip (default "14rem")
 *   previewClass  — extra Tailwind classes on the preview container
 *   roundedTop    — whether to round the top corners (default true)
 *   onSave        — called with { x, y, zoom } when user confirms
 *   onCancel      — called when user cancels
 *   label         — badge text shown on the preview (default "Editing")
 */

import { useState } from "react";
import { Maximize2, Minimize2, AlertTriangle, Sparkles } from "lucide-react";

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

const PRESETS = [
  { label: "Top",    x: 50,  y: 0   },
  { label: "Center", x: 50,  y: 50  },
  { label: "Bottom", x: 50,  y: 100 },
  { label: "Left",   x: 0,   y: 50  },
  { label: "Right",  x: 100, y: 50  },
];

export function ImagePositioner(props: ImagePositionerProps | LegacyProps) {
  // Normalise legacy vs new API
  const imageUrl    = props.imageUrl;
  const initialX    = "initialX"    in props ? (props.initialX    ?? 50)  : ((props as LegacyProps).initialPosition?.x ?? 50);
  const initialY    = "initialY"    in props ? (props.initialY    ?? 50)  : ((props as LegacyProps).initialPosition?.y ?? 50);
  // Default zoom=110 → Crop/cover mode out of the box (not 100/contain)
  const initialZoom = "initialZoom" in props ? (props.initialZoom ?? 110) : 110;
  const aiFocal     = "aiFocal"     in props ? (props.aiFocal     ?? false) : false;
  const previewHeight = "previewHeight" in props ? (props.previewHeight ?? "14rem") : "14rem";
  const previewClass  = "previewClass"  in props ? (props.previewClass  ?? "") : "";
  const roundedTop    = "roundedTop"    in props ? (props.roundedTop    ?? true) : true;
  const onSave   = props.onSave;
  const onCancel = props.onCancel ?? (() => {});
  const label    = props.label ?? "Editing";

  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  // zoom: 100 = contain (full image, may letterbox), 101–200 = cover with crop
  const [zoom, setZoom] = useState(Math.max(100, Math.min(200, initialZoom)));
  // stretch: explicit override only — distorts pixels, labelled with warning
  const [stretch, setStretch] = useState(false);
  // Track if user has moved sliders (removes AI badge)
  const [userMoved, setUserMoved] = useState(false);

  const topRadius = roundedTop ? "rounded-t-xl" : "";

  // Compute background-size:
  //   stretch=true  → "100% 100%"  (fills exactly, DISTORTS — override only)
  //   zoom=100      → "contain"    (full image visible, letterbox possible)
  //   zoom>100      → "cover"      (fills frame, crops edges — the correct default)
  //
  // IMPORTANT: zoom>100 uses "cover" not a percentage, so the render matches
  // the actual banner which also uses background-size: cover.
  const bgSize = stretch
    ? "100% 100%"
    : zoom === 100
      ? "contain"
      : "cover";

  // Position sliders are active in crop mode (zoom>100) and stretch mode.
  // In contain/fit mode, position has no effect on a fully-fitted image.
  const positionActive = stretch || zoom > 100;

  const isCropMode = !stretch && zoom > 100;
  const isFitMode  = !stretch && zoom === 100;
  const isStretch  = stretch;

  // Mode label for the badge
  const modeLabel = isStretch ? "⚠ STRETCH" : isFitMode ? "FIT" : "CROP";
  const modeBadgeColor = isStretch
    ? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }
    : isFitMode
      ? { background: "rgba(110,231,183,0.12)", color: "#6ee7b7", border: "1px solid rgba(110,231,183,0.25)" }
      : { background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" };

  const showAiBadge = aiFocal && !userMoved && positionActive;

  return (
    <div className="w-full">
      {/* ── Live preview strip ──
          overflow:hidden creates the hard boundary — image cannot bleed outside.
          background-size: cover here matches the actual profile banner render. */}
      <div
        className={`relative w-full overflow-hidden ${topRadius} ${previewClass}`}
        style={{
          height: previewHeight,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: bgSize,
          backgroundPosition: positionActive ? `${x}% ${y}%` : "center center",
          backgroundRepeat: "no-repeat",
          // Dark fill shows letterbox areas in fit mode
          backgroundColor: "oklch(0.06 0.02 280)",
        }}
      >
        {/* Hard boundary gold frame */}
        <div
          className={`absolute inset-0 pointer-events-none ${topRadius}`}
          style={{
            boxShadow: "inset 0 0 0 2px #c9a84c, inset 0 0 0 4px rgba(201,168,76,0.12)",
          }}
        />
        {/* Corner accent marks */}
        {[
          "top-0 left-0 border-t-2 border-l-2",
          "top-0 right-0 border-t-2 border-r-2",
          "bottom-0 left-0 border-b-2 border-l-2",
          "bottom-0 right-0 border-b-2 border-r-2",
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-4 h-4 pointer-events-none ${cls}`}
            style={{ borderColor: "#c9a84c" }}
          />
        ))}

        {/* Label badge — top left */}
        <div
          className="absolute top-2 left-2 text-xs font-bold px-2.5 py-1 rounded pointer-events-none select-none"
          style={{
            background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
            color: "#0a0812",
            boxShadow: "0 2px 8px rgba(201,168,76,0.4)",
          }}
        >
          {label}
        </div>

        {/* Mode badge — top right */}
        <div
          className="absolute top-2 right-2 text-[10px] font-mono px-2 py-1 rounded pointer-events-none select-none"
          style={modeBadgeColor}
        >
          {modeLabel}
        </div>

        {/* Fit mode hint */}
        {isFitMode && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded pointer-events-none select-none whitespace-nowrap"
            style={{ background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.4)" }}
          >
            Full image visible — switch to Crop to reposition
          </div>
        )}

        {/* Stretch warning overlay */}
        {isStretch && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded pointer-events-none select-none whitespace-nowrap"
            style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            Stretch distorts original pixels — use only if intentional
          </div>
        )}
      </div>

      {/* ── Controls panel ── */}
      <div
        className="border-x border-b rounded-b-xl p-4 space-y-3"
        style={{
          background: "oklch(0.13 0.02 280)",
          borderColor: "#c9a84c40",
        }}
      >
        {/* Mode toggle row */}
        <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: "rgba(201,168,76,0.12)" }}>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex-1">Mode</span>

          {/* FIT */}
          <button
            type="button"
            onClick={() => { setStretch(false); setZoom(100); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={isFitMode
              ? { background: "rgba(110,231,183,0.12)", color: "#6ee7b7", border: "1px solid rgba(110,231,183,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }
            }
          >
            <Minimize2 className="w-3 h-3" /> Fit
          </button>

          {/* CROP — default, highlighted */}
          <button
            type="button"
            onClick={() => { setStretch(false); if (zoom <= 100) setZoom(110); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={isCropMode
              ? { background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }
              : { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }
            }
          >
            Crop
          </button>

          {/* STRETCH — explicit override, visually de-emphasised */}
          <button
            type="button"
            onClick={() => setStretch(!stretch)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={isStretch
              ? { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }
              : { background: "rgba(255,255,255,0.03)", color: "#4b5563", border: "1px solid rgba(255,255,255,0.05)" }
            }
            title="Stretch distorts original pixels — use only as an explicit override"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="text-[10px]">Stretch ⚠</span>
          </button>
        </div>

        {/* Horizontal position slider */}
        <div style={{ opacity: positionActive ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider select-none flex items-center gap-1.5">
              Left ← Horizontal → Right
              {showAiBadge && (
                <span
                  className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}
                >
                  <Sparkles className="w-2 h-2" /> AI
                </span>
              )}
            </label>
            <span className="text-xs font-mono w-9 text-right" style={{ color: "#c9a84c" }}>{x}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={x}
            onChange={(e) => { setX(Number(e.target.value)); setUserMoved(true); }}
            disabled={!positionActive}
            className="w-full cursor-pointer h-2"
            style={{ accentColor: "#c9a84c" }}
          />
        </div>

        {/* Vertical position slider */}
        <div style={{ opacity: positionActive ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider select-none flex items-center gap-1.5">
              Top ↑ Vertical ↓ Bottom
              {showAiBadge && (
                <span
                  className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}
                >
                  <Sparkles className="w-2 h-2" /> AI
                </span>
              )}
            </label>
            <span className="text-xs font-mono w-9 text-right" style={{ color: "#c9a84c" }}>{y}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={y}
            onChange={(e) => { setY(Number(e.target.value)); setUserMoved(true); }}
            disabled={!positionActive}
            className="w-full cursor-pointer h-2"
            style={{ accentColor: "#c9a84c" }}
          />
        </div>

        {/* Zoom slider — only in crop mode */}
        {isCropMode && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider select-none">
                − Zoom +
              </label>
              <div className="flex items-center gap-2">
                {zoom > 110 && (
                  <button
                    type="button"
                    onClick={() => setZoom(110)}
                    className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                    style={{ color: "rgba(201,168,76,0.7)", background: "rgba(201,168,76,0.08)" }}
                  >
                    Reset
                  </button>
                )}
                <span className="text-xs font-mono w-12 text-right" style={{ color: "#c9a84c" }}>
                  {zoom}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min={100}
              max={200}
              step={5}
              value={zoom}
              onChange={(e) => { setZoom(Number(e.target.value)); setStretch(false); }}
              className="w-full cursor-pointer h-2"
              style={{ accentColor: "#c9a84c" }}
            />
          </div>
        )}

        {/* Quick presets — crop mode only */}
        {isCropMode && (
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setX(p.x); setY(p.y); setUserMoved(true); }}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: "#9ca3af",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "#c9a84c";
                  (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "#9ca3af";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSave({ x, y, zoom: stretch ? 100 : zoom })}
            className="flex-1 font-bold py-2.5 rounded-xl text-sm transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #c9a84c, #e8c96a)",
              color: "#0a0812",
              boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
            }}
          >
            Save Position
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 rounded-xl text-sm transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#6b7280" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
