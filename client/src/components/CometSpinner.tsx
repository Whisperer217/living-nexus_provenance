/**
 * CometSpinner — Living Nexus pull-to-refresh indicator
 *
 * A comet chasing its own tail along a circular orbit.
 * The comet head is a gold-white point with a fading violet tail.
 * Stars in the background pulse gently.
 *
 * Props:
 *   progress  0–1  how far the user has pulled (controls rotation before release)
 *   spinning  bool  true = free-spinning (refresh in progress)
 *   size      number  diameter in px (default 52)
 */

import React, { useEffect, useRef } from "react";

interface CometSpinnerProps {
  progress?: number;   // 0–1, drag progress before release
  spinning?: boolean;  // true while refresh is in progress
  size?: number;
  className?: string;
}

export function CometSpinner({
  progress = 0,
  spinning = false,
  size = 52,
  className = "",
}: CometSpinnerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  // When spinning, animate the comet freely at ~1.5 rev/sec
  useEffect(() => {
    if (!spinning) {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      animRef.current = null;
      lastTimeRef.current = null;
      return;
    }
    const tick = (ts: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const dt = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      angleRef.current = (angleRef.current + (dt / 1000) * 360 * 1.5) % 360;
      if (svgRef.current) {
        const g = svgRef.current.querySelector<SVGGElement>("#comet-group");
        if (g) g.setAttribute("transform", `rotate(${angleRef.current}, 26, 26)`);
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current !== null) cancelAnimationFrame(animRef.current); };
  }, [spinning]);

  // When not spinning, rotate by progress (0 → 270deg max during drag)
  const staticAngle = spinning ? undefined : progress * 270;

  const r = 16; // orbit radius
  const cx = 26; // center x
  const cy = 26; // center y

  // Comet head position (at angle 0 = right of center)
  // The group is rotated, so head is always at (cx+r, cy)
  const headX = cx + r;
  const headY = cy;

  // Tail arc: sweeps ~160° behind the head (counter-clockwise)
  // We draw it as a conic gradient via a stroked arc path
  const tailDeg = 160;
  const tailRad = (tailDeg * Math.PI) / 180;
  const tailStartX = cx + r * Math.cos(tailRad);
  const tailStartY = cy + r * Math.sin(tailRad);

  // Large arc flag: 1 because 160° > 90°
  const tailPath = `M ${tailStartX} ${tailStartY} A ${r} ${r} 0 0 0 ${headX} ${headY}`;

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Loading"
    >
      <defs>
        {/* Radial glow for the comet head */}
        <radialGradient id="cometHeadGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF8DC" stopOpacity="1" />
          <stop offset="40%" stopColor="#E8C547" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#C49A28" stopOpacity="0" />
        </radialGradient>

        {/* Linear gradient for the tail — gold at head, fading to transparent violet */}
        <linearGradient id="cometTailGrad"
          gradientUnits="userSpaceOnUse"
          x1={tailStartX} y1={tailStartY}
          x2={headX} y2={headY}
        >
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0" />
          <stop offset="60%" stopColor="#A78BFA" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#E8C547" stopOpacity="0.9" />
        </linearGradient>

        {/* Soft glow filter for the head */}
        <filter id="headGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle star glow */}
        <filter id="starGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Orbit ring — faint gold circle ── */}
      <circle
        cx={cx} cy={cy} r={r}
        stroke="#C49A28"
        strokeOpacity="0.18"
        strokeWidth="0.8"
        fill="none"
      />

      {/* ── Background stars ── */}
      {[
        { x: 8,  y: 10, r: 0.9, opacity: 0.6 },
        { x: 42, y: 8,  r: 0.7, opacity: 0.5 },
        { x: 44, y: 38, r: 1.0, opacity: 0.7 },
        { x: 6,  y: 40, r: 0.8, opacity: 0.4 },
        { x: 26, y: 4,  r: 0.6, opacity: 0.5 },
        { x: 48, y: 22, r: 0.7, opacity: 0.6 },
        { x: 4,  y: 24, r: 0.9, opacity: 0.4 },
        { x: 20, y: 47, r: 0.6, opacity: 0.5 },
        { x: 36, y: 48, r: 0.8, opacity: 0.6 },
      ].map((s, i) => (
        <circle
          key={i}
          cx={s.x} cy={s.y} r={s.r}
          fill="#E8C547"
          fillOpacity={s.opacity}
          filter="url(#starGlow)"
        >
          {spinning && (
            <animate
              attributeName="fill-opacity"
              values={`${s.opacity};${s.opacity * 0.3};${s.opacity}`}
              dur={`${1.2 + i * 0.15}s`}
              repeatCount="indefinite"
            />
          )}
        </circle>
      ))}

      {/* ── Comet group — rotates as a unit ── */}
      <g
        id="comet-group"
        transform={spinning ? `rotate(${angleRef.current}, ${cx}, ${cy})` : `rotate(${staticAngle}, ${cx}, ${cy})`}
      >
        {/* Tail arc */}
        <path
          d={tailPath}
          stroke="url(#cometTailGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity={Math.max(0.3, progress)}
        />

        {/* Comet head — bright core */}
        <circle
          cx={headX} cy={headY} r={3.2}
          fill="url(#cometHeadGlow)"
          filter="url(#headGlow)"
          opacity={Math.max(0.5, progress)}
        />

        {/* Comet head — hard bright center */}
        <circle
          cx={headX} cy={headY} r={1.4}
          fill="#FFFBEA"
          opacity={Math.max(0.7, progress)}
        />

        {/* Tiny sparkle cross on the head */}
        <line x1={headX - 2} y1={headY} x2={headX + 2} y2={headY}
          stroke="#FFF8DC" strokeWidth="0.5" strokeOpacity="0.6" />
        <line x1={headX} y1={headY - 2} x2={headX} y2={headY + 2}
          stroke="#FFF8DC" strokeWidth="0.5" strokeOpacity="0.6" />
      </g>
    </svg>
  );
}
