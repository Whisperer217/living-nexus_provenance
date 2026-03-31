/**
 * ImagePositioner — Inline slider repositioner (mobile-first)
 *
 * Renders INLINE — no modal, no portal, no drag.
 * Shows a live preview strip above two range sliders (X/Y) plus quick presets.
 * Parent controls show/hide; this component just renders in-place.
 *
 * Uses background-image + background-position instead of <img objectPosition>
 * so that BOTH horizontal and vertical movement are always visible regardless
 * of the image's aspect ratio relative to the container.
 *
 * Props:
 *   imageUrl      — the image to preview
 *   initialX      — starting horizontal position 0–100 (default 50)
 *   initialY      — starting vertical position 0–100 (default 50)
 *   previewHeight — CSS height string for the preview strip (default "12rem")
 *   previewClass  — extra Tailwind classes on the preview container
 *   roundedTop    — whether to round the top corners of the preview (default true)
 *   onSave        — called with { x, y } when user confirms
 *   onCancel      — called when user cancels
 *   label         — badge text shown on the preview (default "Editing")
 */

import { useState } from "react";

interface ImagePositionerProps {
  imageUrl: string;
  initialX?: number;
  initialY?: number;
  previewHeight?: string;
  previewClass?: string;
  roundedTop?: boolean;
  onSave: (pos: { x: number; y: number }) => void;
  onCancel: () => void;
  label?: string;
}

// Keep backward-compat with old { initialPosition: { x, y } } call sites
interface LegacyProps {
  imageUrl: string;
  initialPosition?: { x: number; y: number };
  aspectClass?: string;
  onSave: (pos: { x: number; y: number }) => void;
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
  const imageUrl = props.imageUrl;
  const initialX = "initialX" in props ? (props.initialX ?? 50) : ((props as LegacyProps).initialPosition?.x ?? 50);
  const initialY = "initialY" in props ? (props.initialY ?? 50) : ((props as LegacyProps).initialPosition?.y ?? 50);
  const previewHeight = "previewHeight" in props ? (props.previewHeight ?? "12rem") : "12rem";
  const previewClass  = "previewClass"  in props ? (props.previewClass  ?? "") : "";
  const roundedTop    = "roundedTop"    in props ? (props.roundedTop    ?? true) : true;
  const onSave   = props.onSave;
  const onCancel = props.onCancel ?? (() => {});
  const label    = props.label ?? "Editing";

  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);

  const topRadius = roundedTop ? "rounded-t-xl" : "";

  return (
    <div className="w-full">
      {/* ── Live preview strip ──
          Uses background-image so BOTH X and Y sliders always produce visible
          movement regardless of the image's native aspect ratio. With <img
          object-cover w-full h-full>, a wide image fills the container width
          and has zero horizontal overflow — making X appear frozen.
          background-size:cover + background-position always shows the shift. */}
      <div
        className={`relative w-full overflow-hidden ${topRadius} ${previewClass}`}
        style={{
          height: previewHeight,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: `${x}% ${y}%`,
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Gold editing border */}
        <div className={`absolute inset-0 border-2 border-[#c9a84c] pointer-events-none ${topRadius}`} />
        {/* Editing badge */}
        <div className="absolute top-2 left-2 bg-[#c9a84c] text-black text-xs font-bold px-2 py-1 rounded pointer-events-none select-none">
          {label}
        </div>
      </div>

      {/* ── Controls panel ── */}
      <div className="bg-[oklch(0.10_0.015_280)] border-x border-b border-[#c9a84c]/30 rounded-b-xl p-4 space-y-3">
        {/* Horizontal slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider select-none">
              Left ← Horizontal → Right
            </label>
            <span className="text-xs text-[#c9a84c] font-mono w-9 text-right">{x}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            className="w-full accent-[#c9a84c] cursor-pointer h-2"
          />
        </div>

        {/* Vertical slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider select-none">
              Top ↑ Vertical ↓ Bottom
            </label>
            <span className="text-xs text-[#c9a84c] font-mono w-9 text-right">{y}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="w-full accent-[#c9a84c] cursor-pointer h-2"
          />
        </div>

        {/* Quick presets */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setX(p.x); setY(p.y); }}
              className="text-xs text-gray-400 hover:text-[#c9a84c] bg-white/5 hover:bg-[#c9a84c]/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSave({ x, y })}
            className="flex-1 bg-[#c9a84c] text-black font-bold py-2.5 rounded-xl text-sm hover:bg-[#d4b05a] transition-colors active:scale-95"
          >
            Save Position
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImagePositioner;
