/**
 * ImagePositioner — Inline slider repositioner (mobile-first)
 *
 * Renders INLINE — no modal, no portal, no drag.
 * Shows a live preview with a hard boundary frame (gold outline) that
 * represents exactly what will be visible in the final render.
 *
 * FIT MODES:
 *   "contain" — image fits entirely within the boundary (no cropping, may have
 *               letterbox/pillarbox space). This is the default at zoom=100.
 *   "cover"   — image fills the boundary completely (may crop edges).
 *               Activated when zoom > 100.
 *   "stretch" — image is stretched to fill boundary exactly (no cropping, no
 *               letterbox). Toggle via the Stretch button.
 *
 * ZOOM:
 *   - 100 = contain (full image visible, no crop) — the default minimum
 *   - 101–200 = cover with progressive zoom (crops edges as zoom increases)
 *   Zoom is stored as background-size percentage.
 *   At 100 the image is fully visible (background-size: contain).
 *   Above 100 it transitions to cover-style cropping.
 *
 * HARD BOUNDARY:
 *   The preview container has overflow:hidden and a gold inset border so the
 *   creator can see exactly what the final crop will look like — no surprises.
 *
 * onSave returns { x, y, zoom } where zoom is 100–200 (default 100).
 * Consumers that don't use zoom can ignore the field — it's backward-compatible.
 *
 * Props:
 *   imageUrl      — the image to preview
 *   initialX      — starting horizontal position 0–100 (default 50)
 *   initialY      — starting vertical position 0–100 (default 50)
 *   initialZoom   — starting zoom 100–200 (default 100 = contain)
 *   previewHeight — CSS height string for the preview strip (default "14rem")
 *   previewClass  — extra Tailwind classes on the preview container
 *   roundedTop    — whether to round the top corners of the preview (default true)
 *   onSave        — called with { x, y, zoom } when user confirms
 *   onCancel      — called when user cancels
 *   label         — badge text shown on the preview (default "Editing")
 */

import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface ImagePositionerProps {
  imageUrl: string;
  initialX?: number;
  initialY?: number;
  initialZoom?: number;
  previewHeight?: string;
  previewClass?: string;
  roundedTop?: boolean;
  onSave: (pos: { x: number; y: number; zoom: number }) => void;
  onCancel: () => void;
  label?: string;
}

// Keep backward-compat with old { initialPosition: { x, y } } call sites
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
  const initialZoom = "initialZoom" in props ? (props.initialZoom ?? 100) : 100;
  const previewHeight = "previewHeight" in props ? (props.previewHeight ?? "14rem") : "14rem";
  const previewClass  = "previewClass"  in props ? (props.previewClass  ?? "") : "";
  const roundedTop    = "roundedTop"    in props ? (props.roundedTop    ?? true) : true;
  const onSave   = props.onSave;
  const onCancel = props.onCancel ?? (() => {});
  const label    = props.label ?? "Editing";

  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  // zoom: 100 = contain (full image visible), 101–200 = cover with crop
  const [zoom, setZoom] = useState(Math.max(100, Math.min(200, initialZoom)));
  // stretch mode: image stretches to fill boundary exactly (100% x 100%)
  const [stretch, setStretch] = useState(false);

  const topRadius = roundedTop ? "rounded-t-xl" : "";

  // Compute background-size:
  //   stretch=true  → "100% 100%"  (fills exactly, may distort)
  //   zoom=100      → "contain"    (full image visible, letterbox possible)
  //   zoom>100      → "{zoom}%"    (cover-style, crops edges)
  const bgSize = stretch
    ? "100% 100%"
    : zoom === 100
      ? "contain"
      : `${zoom}%`;

  // When in contain or stretch mode, position sliders have no effect on
  // a fully-fitted image, so we show a subtle hint.
  const positionActive = stretch || zoom > 100;

  return (
    <div className="w-full">
      {/* ── Live preview strip ──
          overflow:hidden creates the hard boundary — the image cannot bleed outside.
          The gold inset border shows the creator exactly what the crop frame is. */}
      <div
        className={`relative w-full overflow-hidden ${topRadius} ${previewClass}`}
        style={{
          height: previewHeight,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: bgSize,
          backgroundPosition: positionActive ? `${x}% ${y}%` : "center center",
          backgroundRepeat: "no-repeat",
          // Dark background shows letterbox areas clearly
          backgroundColor: "oklch(0.06 0.02 280)",
        }}
      >
        {/* Hard boundary gold frame — shows exact crop edge */}
        <div
          className={`absolute inset-0 pointer-events-none ${topRadius}`}
          style={{
            boxShadow: "inset 0 0 0 2px #c9a84c, inset 0 0 0 4px rgba(201,168,76,0.15)",
          }}
        />

        {/* Corner accent marks — reinforce the boundary */}
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

        {/* Editing badge */}
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
          style={{
            background: "rgba(0,0,0,0.65)",
            color: stretch ? "#c9a84c" : zoom > 100 ? "#a78bfa" : "#6ee7b7",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {stretch ? "STRETCH" : zoom === 100 ? "FIT" : `ZOOM ${zoom}%`}
        </div>

        {/* Letterbox hint when in contain mode */}
        {!stretch && zoom === 100 && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] px-2 py-0.5 rounded pointer-events-none select-none"
            style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.4)" }}
          >
            Full image visible — increase zoom to crop & reposition
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
        {/* Fit mode toggle row */}
        <div className="flex items-center gap-2 pb-1 border-b" style={{ borderColor: "rgba(201,168,76,0.15)" }}>
          <span className="text-xs text-gray-500 uppercase tracking-wider flex-1">Display Mode</span>
          <button
            type="button"
            onClick={() => { setStretch(false); if (zoom < 100) setZoom(100); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={!stretch && zoom === 100
              ? { background: "rgba(110,231,183,0.15)", color: "#6ee7b7", border: "1px solid rgba(110,231,183,0.3)" }
              : { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            <Minimize2 className="w-3 h-3" /> Fit
          </button>
          <button
            type="button"
            onClick={() => { setStretch(false); if (zoom <= 100) setZoom(110); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={!stretch && zoom > 100
              ? { background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }
              : { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            Crop
          </button>
          <button
            type="button"
            onClick={() => setStretch(!stretch)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={stretch
              ? { background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.35)" }
              : { background: "rgba(255,255,255,0.05)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.08)" }
            }
          >
            <Maximize2 className="w-3 h-3" /> Stretch
          </button>
        </div>

        {/* Horizontal slider — only active in crop mode */}
        <div style={{ opacity: positionActive ? 1 : 0.35 }}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider select-none">
              Left ← Horizontal → Right
            </label>
            <span className="text-xs font-mono w-9 text-right" style={{ color: "#c9a84c" }}>{x}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            disabled={!positionActive}
            className="w-full cursor-pointer h-2"
            style={{ accentColor: "#c9a84c" }}
          />
        </div>

        {/* Vertical slider — only active in crop mode */}
        <div style={{ opacity: positionActive ? 1 : 0.35 }}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider select-none">
              Top ↑ Vertical ↓ Bottom
            </label>
            <span className="text-xs font-mono w-9 text-right" style={{ color: "#c9a84c" }}>{y}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            disabled={!positionActive}
            className="w-full cursor-pointer h-2"
            style={{ accentColor: "#c9a84c" }}
          />
        </div>

        {/* Zoom slider — only shown in crop mode */}
        {!stretch && (
          <div style={{ opacity: zoom > 100 ? 1 : 0.5 }}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider select-none">
                − Zoom +
              </label>
              <div className="flex items-center gap-2">
                {zoom > 100 && (
                  <button
                    type="button"
                    onClick={() => setZoom(100)}
                    className="text-[10px] px-1.5 py-0.5 rounded transition-colors"
                    style={{ color: "rgba(201,168,76,0.7)", background: "rgba(201,168,76,0.08)" }}
                  >
                    Reset
                  </button>
                )}
                <span className="text-xs font-mono w-12 text-right" style={{ color: "#c9a84c" }}>
                  {zoom === 100 ? "Fit" : `${zoom}%`}
                </span>
              </div>
            </div>
            <input
              type="range"
              min={100}
              max={200}
              step={5}
              value={zoom}
              onChange={(e) => { const v = Number(e.target.value); setZoom(v); if (v > 100) setStretch(false); }}
              className="w-full cursor-pointer h-2"
              style={{ accentColor: "#c9a84c" }}
            />
          </div>
        )}

        {/* Quick presets — only useful in crop mode */}
        {!stretch && zoom > 100 && (
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setX(p.x); setY(p.y); }}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  color: "#9ca3af",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.color = "#c9a84c"; (e.target as HTMLElement).style.background = "rgba(201,168,76,0.1)"; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.color = "#9ca3af"; (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
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
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#6b7280",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = "#6b7280"; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImagePositioner;
