/**
 * OrbitFocusGroup
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps a row of creator cards. When any card is hovered:
 *   - The hovered card gets a faint gold orbit ring drawn around it (SVG overlay)
 *   - Sibling cards dim slightly (depth-of-field effect)
 *
 * This replaces the generic hover:scale-105 bounce with something that
 * communicates "locking onto a star / entering a creator domain."
 *
 * Usage:
 *   <OrbitFocusGroup>
 *     {creators.map(c => <StoreCreatorCard key={c.id} creator={c} />)}
 *   </OrbitFocusGroup>
 *
 * The group uses CSS custom properties so no JS per-frame work is needed.
 */

import { useState, type ReactNode } from "react";

interface OrbitFocusGroupProps {
  children: ReactNode;
  className?: string;
}

export function OrbitFocusGroup({ children, className = "" }: OrbitFocusGroupProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // We need to clone children to inject hover handlers and dimming styles.
  // We do this via a wrapper div per child.
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div className={`flex gap-3 ${className}`}>
      {childArray.map((child, i) => {
        const isDimmed = hoveredIdx !== null && hoveredIdx !== i;
        const isFocused = hoveredIdx === i;

        return (
          <div
            key={i}
            className="relative flex-shrink-0"
            style={{
              transition: "opacity 350ms ease, filter 350ms ease",
              opacity: isDimmed ? 0.45 : 1,
              filter: isDimmed ? "brightness(0.7)" : "brightness(1)",
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {child}

            {/* Orbit ring — SVG overlay, only visible when focused */}
            {isFocused && (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%", zIndex: 20 }}
                aria-hidden="true"
              >
                <rect
                  x="2" y="2"
                  width="calc(100% - 4px)" height="calc(100% - 4px)"
                  rx="14" ry="14"
                  fill="none"
                  stroke="rgba(196,154,40,0.35)"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                  style={{
                    animation: "orbit-ring-spin 12s linear infinite",
                  }}
                />
                {/* Inner pulse ring */}
                <rect
                  x="5" y="5"
                  width="calc(100% - 10px)" height="calc(100% - 10px)"
                  rx="11" ry="11"
                  fill="none"
                  stroke="rgba(196,154,40,0.12)"
                  strokeWidth="0.5"
                />
              </svg>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes orbit-ring-spin {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  );
}

/**
 * OrbitCard
 * ─────────────────────────────────────────────────────────────────────────────
 * A standalone wrapper for a single card that adds the orbit ring on hover.
 * Use when you can't use OrbitFocusGroup (e.g., cards in a scroll container
 * where you can't easily access siblings).
 */
export function OrbitCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}

      {hovered && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%", zIndex: 20 }}
          aria-hidden="true"
        >
          <rect
            x="2" y="2"
            width="calc(100% - 4px)" height="calc(100% - 4px)"
            rx="14" ry="14"
            fill="none"
            stroke="rgba(196,154,40,0.30)"
            strokeWidth="1"
            strokeDasharray="6 4"
            style={{ animation: "orbit-ring-spin 12s linear infinite" }}
          />
        </svg>
      )}

      <style>{`
        @keyframes orbit-ring-spin {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -100; }
        }
      `}</style>
    </div>
  );
}
