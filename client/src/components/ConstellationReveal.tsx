/**
 * ConstellationReveal
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps any content and reveals it when it enters the viewport.
 * The reveal sequence:
 *   1. Anchor dots appear (like stars forming)
 *   2. Connecting lines draw between them (constellation formation)
 *   3. Content fades in with a slow upward drift
 *
 * This replaces generic fade-in / slide-up animations with something that
 * communicates "discovery" — works being revealed from the archive.
 *
 * Usage:
 *   <ConstellationReveal delay={0}>
 *     <ShowcaseRow ...>...</ShowcaseRow>
 *   </ConstellationReveal>
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ConstellationRevealProps {
  children: ReactNode;
  delay?: number;       // ms before animation starts after intersection
  className?: string;
  dotCount?: number;    // number of constellation dots to show (default 4)
  skipDots?: boolean;   // skip the dot/line phase, just do the content reveal
}

export function ConstellationReveal({
  children,
  delay = 0,
  className = "",
  dotCount = 4,
  skipDots = false,
}: ConstellationRevealProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"hidden" | "dots" | "lines" | "content">("hidden");
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const triggerReveal = () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      observer.disconnect();

      if (skipDots) {
        setTimeout(() => setPhase("content"), delay);
        return;
      }

      // Phase sequence: hidden → dots → lines → content
      setTimeout(() => setPhase("dots"), delay);
      setTimeout(() => setPhase("lines"), delay + 400);
      setTimeout(() => setPhase("content"), delay + 900);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerReveal();
      },
      { threshold: 0.02, rootMargin: "0px 0px 0px 0px" }
    );

    observer.observe(el);

    // Safety fallback: if the observer never fires (e.g. element is below fold on mobile
    // and user never scrolls), force the reveal after 2.5s so content is never permanently hidden.
    const fallbackTimer = setTimeout(() => triggerReveal(), 2500);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [delay, skipDots]);

  const isVisible = phase === "content";
  const showDots = phase === "dots" || phase === "lines" || phase === "content";
  const showLines = phase === "lines" || phase === "content";

  // Generate stable dot positions (deterministic from dotCount)
  const dots = Array.from({ length: dotCount }, (_, i) => ({
    x: (i / (dotCount - 1)) * 88 + 6, // 6% to 94% of width
    y: 50 + (i % 2 === 0 ? -8 : 8),   // alternating above/below center
  }));

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Constellation overlay — sits above content during formation, then fades */}
      {!skipDots && (
        <div
          className="absolute inset-x-0 top-0 pointer-events-none z-10 overflow-hidden"
          style={{
            height: "28px",
            opacity: isVisible ? 0 : 1,
            transition: isVisible ? "opacity 600ms ease-out" : "none",
          }}
          aria-hidden="true"
        >
          <svg width="100%" height="28" style={{ overflow: "visible" }}>
            {/* Connecting lines */}
            {showLines && dots.slice(0, -1).map((dot, i) => (
              <line
                key={`line-${i}`}
                x1={`${dot.x}%`} y1={dot.y}
                x2={`${dots[i + 1].x}%`} y2={dots[i + 1].y}
                stroke="rgba(196,154,40,0.25)"
                strokeWidth="0.5"
                style={{
                  strokeDasharray: 200,
                  strokeDashoffset: showLines ? 0 : 200,
                  transition: `stroke-dashoffset ${500 + i * 80}ms ease-out`,
                }}
              />
            ))}
            {/* Dots */}
            {showDots && dots.map((dot, i) => (
              <circle
                key={`dot-${i}`}
                cx={`${dot.x}%`} cy={dot.y} r={1.5}
                fill="rgba(196,154,40,0.6)"
                style={{
                  opacity: showDots ? 1 : 0,
                  transition: `opacity 200ms ease-out ${i * 80}ms`,
                }}
              />
            ))}
          </svg>
        </div>
      )}

      {/* Content — slow cinematic rise */}
      <div
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(18px)",
          transition: isVisible
            ? "opacity 700ms cubic-bezier(0.16,1,0.3,1), transform 700ms cubic-bezier(0.16,1,0.3,1)"
            : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * ManifestationReveal
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps an individual card/item and reveals it with a staggered cinematic rise.
 * Use this on each card in a row, passing `index` for the stagger delay.
 *
 * Unlike ConstellationReveal, this is purely a content reveal — no dots/lines.
 * The stagger creates the feeling of works surfacing from the archive one by one.
 */
export function ManifestationReveal({
  children,
  index = 0,
  className = "",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !triggered.current) {
          triggered.current = true;
          observer.disconnect();
          // Stagger: 60ms per index, capped at 600ms so long rows don't feel broken
          const stagger = Math.min(index * 60, 600);
          setTimeout(() => setVisible(true), stagger);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: visible
          ? "opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)"
          : "none",
      }}
    >
      {children}
    </div>
  );
}
