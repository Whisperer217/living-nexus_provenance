/**
 * SacredCanvas — Procedural Sacred Canvas System
 *
 * Renders a full-page background layer unique to each creator, derived
 * deterministically from their numeric ID (the seed). The canvas sits
 * beneath all content at 2–5% opacity, with:
 *
 *   • 8 motif families (arches, compass, constellation, manuscript,
 *     waveform, sacred geometry, cartographic lines, tree roots)
 *   • Soft radial illumination from page centre
 *   • Edge vignette
 *   • Typography protection zone (near-zero opacity behind text)
 *   • Optional 0.5 px parallax on scroll
 *
 * Usage:
 *   <SacredCanvas seed={creator.id} />          // inside a relative container
 *   <SacredCanvas seed={creator.id} parallax />  // with subtle scroll depth
 *
 * The component is purely decorative — pointer-events: none, aria-hidden.
 */

import { useMemo, useEffect, useRef } from "react";

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function (): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Colour palette (matte dark + antique bronze/gold/parchment) ──────────────
const PALETTE = [
  "#C49A28", // antique gold
  "#8B7355", // antique bronze
  "#D4C5A9", // parchment gray
  "#9E9E8E", // charcoal smoke
  "#6B6B5A", // muted obsidian
];

function pickColour(rng: () => number): string {
  return PALETTE[Math.floor(rng() * PALETTE.length)];
}

// ─── Motif generators ─────────────────────────────────────────────────────────

/** Gothic / cathedral arches */
function gothicArches(rng: () => number, w: number, h: number): string {
  const count = 3 + Math.floor(rng() * 4); // 3–6 arches
  const spacing = w / count;
  let d = "";
  for (let i = 0; i < count; i++) {
    const x = spacing * i + spacing * 0.2 + rng() * spacing * 0.2;
    const aw = spacing * (0.3 + rng() * 0.25);
    const ah = h * (0.55 + rng() * 0.3);
    const cx = x + aw / 2;
    // Pointed arch
    d += `M ${x},${h} L ${x},${h - ah * 0.6} Q ${cx},${h - ah} ${x + aw},${h - ah * 0.6} L ${x + aw},${h} `;
    // Inner tracery
    const iw = aw * 0.55;
    const ix = cx - iw / 2;
    d += `M ${ix},${h} L ${ix},${h - ah * 0.55} Q ${cx},${h - ah * 0.88} ${ix + iw},${h - ah * 0.55} L ${ix + iw},${h} `;
    // Keystone circle
    d += `M ${cx + 4},${h - ah} a 4,4 0 1,0 -8,0 a 4,4 0 1,0 8,0 `;
    // Horizontal tracery bar
    const barY = h - ah * 0.45;
    d += `M ${x + aw * 0.1},${barY} L ${x + aw * 0.9},${barY} `;
  }
  return d;
}

/** Compass rose */
function compassRose(rng: () => number, cx: number, cy: number, r: number): string {
  const points = 8 + Math.floor(rng() * 8) * 4; // 8, 12, 16, 24, 32
  const safePoints = [8, 12, 16, 24][Math.floor(rng() * 4)];
  let d = "";
  for (let i = 0; i < safePoints; i++) {
    const angle = (i / safePoints) * Math.PI * 2 - Math.PI / 2;
    const isCardinal = i % (safePoints / 4) === 0;
    const tip = isCardinal ? r : r * 0.6;
    const base = r * 0.08;
    const ax = cx + Math.cos(angle) * tip;
    const ay = cy + Math.sin(angle) * tip;
    const lx = cx + Math.cos(angle + Math.PI / 2) * base;
    const ly = cy + Math.sin(angle + Math.PI / 2) * base;
    const rx = cx + Math.cos(angle - Math.PI / 2) * base;
    const ry = cy + Math.sin(angle - Math.PI / 2) * base;
    d += `M ${lx},${ly} L ${ax},${ay} L ${rx},${ry} `;
  }
  // Inner rings
  for (const frac of [0.35, 0.55, 0.75]) {
    const rr = r * frac;
    d += `M ${cx + rr},${cy} a ${rr},${rr} 0 1,0 ${-rr * 2},0 a ${rr},${rr} 0 1,0 ${rr * 2},0 `;
  }
  return d;
}

/** Constellation — scattered stars with connecting lines */
function constellation(rng: () => number, w: number, h: number): string {
  const starCount = 12 + Math.floor(rng() * 20);
  const stars: [number, number][] = [];
  for (let i = 0; i < starCount; i++) {
    stars.push([rng() * w, rng() * h]);
  }
  let d = "";
  // Stars (tiny circles approximated as cross marks)
  for (const [sx, sy] of stars) {
    const r = 1 + rng() * 2;
    d += `M ${sx - r},${sy} L ${sx + r},${sy} M ${sx},${sy - r} L ${sx},${sy + r} `;
  }
  // Connect nearby stars
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[i][0] - stars[j][0];
      const dy = stars[i][1] - stars[j][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < w * 0.18 && rng() > 0.45) {
        d += `M ${stars[i][0]},${stars[i][1]} L ${stars[j][0]},${stars[j][1]} `;
      }
    }
  }
  return d;
}

/** Manuscript margin borders */
function manuscriptBorders(rng: () => number, w: number, h: number): string {
  const margin = 28 + rng() * 24;
  let d = "";
  // Outer frame
  d += `M ${margin},${margin} L ${w - margin},${margin} L ${w - margin},${h - margin} L ${margin},${h - margin} Z `;
  // Inner frame
  const inner = margin + 10 + rng() * 8;
  d += `M ${inner},${inner} L ${w - inner},${inner} L ${w - inner},${h - inner} L ${inner},${h - inner} Z `;
  // Corner flourishes
  const corners: [number, number, number][] = [
    [margin, margin, 0],
    [w - margin, margin, Math.PI / 2],
    [w - margin, h - margin, Math.PI],
    [margin, h - margin, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, rot] of corners) {
    const fl = 18 + rng() * 12;
    const ax = cx + Math.cos(rot) * fl;
    const ay = cy + Math.sin(rot) * fl;
    const bx = cx + Math.cos(rot + Math.PI / 2) * fl;
    const by = cy + Math.sin(rot + Math.PI / 2) * fl;
    d += `M ${cx},${cy} Q ${ax},${ay} ${ax + Math.cos(rot + Math.PI / 4) * 8},${ay + Math.sin(rot + Math.PI / 4) * 8} `;
    d += `M ${cx},${cy} Q ${bx},${by} ${bx + Math.cos(rot + Math.PI * 0.75) * 8},${by + Math.sin(rot + Math.PI * 0.75) * 8} `;
  }
  return d;
}

/** Waveform / resonance circles */
function waveformResonance(rng: () => number, cx: number, cy: number, w: number): string {
  let d = "";
  const ringCount = 4 + Math.floor(rng() * 5);
  for (let i = 1; i <= ringCount; i++) {
    const r = (w * 0.06) * i * (0.8 + rng() * 0.4);
    d += `M ${cx + r},${cy} a ${r},${r} 0 1,0 ${-r * 2},0 a ${r},${r} 0 1,0 ${r * 2},0 `;
  }
  // Sine wave across middle
  const amplitude = 12 + rng() * 18;
  const frequency = 2 + Math.floor(rng() * 4);
  const steps = 120;
  const startX = cx - w * 0.3;
  const endX = cx + w * 0.3;
  let wave = `M ${startX},${cy}`;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const wx = startX + (endX - startX) * t;
    const wy = cy + Math.sin(t * Math.PI * 2 * frequency) * amplitude;
    wave += ` L ${wx},${wy}`;
  }
  d += wave + " ";
  return d;
}

/** Sacred geometry — Flower of Life / Metatron's Cube fragments */
function sacredGeometry(rng: () => number, cx: number, cy: number, r: number): string {
  let d = "";
  const petals = 6;
  const centers: [number, number][] = [[cx, cy]];
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2;
    centers.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }
  for (const [px, py] of centers) {
    d += `M ${px + r},${py} a ${r},${r} 0 1,0 ${-r * 2},0 a ${r},${r} 0 1,0 ${r * 2},0 `;
  }
  // Outer ring
  const outerR = r * 2;
  d += `M ${cx + outerR},${cy} a ${outerR},${outerR} 0 1,0 ${-outerR * 2},0 a ${outerR},${outerR} 0 1,0 ${outerR * 2},0 `;
  return d;
}

/** Cartographic lines — topographic / grid */
function cartographicLines(rng: () => number, w: number, h: number): string {
  let d = "";
  // Horizontal contour lines
  const lineCount = 8 + Math.floor(rng() * 10);
  for (let i = 0; i < lineCount; i++) {
    const y = (h / (lineCount + 1)) * (i + 1);
    const wobble = 6 + rng() * 12;
    let path = `M 0,${y}`;
    const segments = 12;
    for (let s = 1; s <= segments; s++) {
      const x = (w / segments) * s;
      const dy = (rng() - 0.5) * wobble;
      path += ` L ${x},${y + dy}`;
    }
    d += path + " ";
  }
  // Grid tick marks
  const gridSpacing = 60 + Math.floor(rng() * 60);
  for (let gx = 0; gx < w; gx += gridSpacing) {
    for (let gy = 0; gy < h; gy += gridSpacing) {
      const tickLen = 4 + rng() * 4;
      d += `M ${gx - tickLen},${gy} L ${gx + tickLen},${gy} M ${gx},${gy - tickLen} L ${gx},${gy + tickLen} `;
    }
  }
  return d;
}

/** Tree roots / organic branching */
function treeRoots(rng: () => number, w: number, h: number): string {
  let d = "";
  const trunkCount = 2 + Math.floor(rng() * 3);
  for (let t = 0; t < trunkCount; t++) {
    const startX = rng() * w;
    const startY = h;
    const branch = (x: number, y: number, angle: number, length: number, depth: number): void => {
      if (depth === 0 || length < 8) return;
      const endX = x + Math.cos(angle) * length;
      const endY = y + Math.sin(angle) * length;
      d += `M ${x},${y} L ${endX},${endY} `;
      const spread = 0.3 + rng() * 0.4;
      branch(endX, endY, angle - spread, length * (0.6 + rng() * 0.2), depth - 1);
      branch(endX, endY, angle + spread, length * (0.6 + rng() * 0.2), depth - 1);
    };
    branch(startX, startY, -Math.PI / 2 + (rng() - 0.5) * 0.5, 80 + rng() * 60, 5);
  }
  return d;
}

// ─── Motif family registry ─────────────────────────────────────────────────────
type MotifFamily =
  | "arches"
  | "compass"
  | "constellation"
  | "manuscript"
  | "waveform"
  | "geometry"
  | "cartographic"
  | "roots";

const ALL_FAMILIES: MotifFamily[] = [
  "arches",
  "compass",
  "constellation",
  "manuscript",
  "waveform",
  "geometry",
  "cartographic",
  "roots",
];

interface MotifLayer {
  family: MotifFamily;
  pathData: string;
  colour: string;
  strokeWidth: number;
  opacity: number;
}

function buildMotifLayers(seed: number, w: number, h: number): MotifLayer[] {
  const rng = mulberry32(seed);
  const layers: MotifLayer[] = [];

  // Pick 3–5 motif families deterministically
  const shuffled = [...ALL_FAMILIES].sort(() => rng() - 0.5);
  const count = 3 + Math.floor(rng() * 3); // 3–5
  const chosen = shuffled.slice(0, count);

  for (const family of chosen) {
    const colour = pickColour(rng);
    const strokeWidth = 0.4 + rng() * 0.8;
    const opacity = 0.35 + rng() * 0.45; // relative; overall SVG opacity is very low

    let pathData = "";
    switch (family) {
      case "arches":
        pathData = gothicArches(rng, w, h);
        break;
      case "compass": {
        const cx = w * (0.2 + rng() * 0.6);
        const cy = h * (0.2 + rng() * 0.6);
        const r = Math.min(w, h) * (0.08 + rng() * 0.12);
        pathData = compassRose(rng, cx, cy, r);
        break;
      }
      case "constellation":
        pathData = constellation(rng, w, h);
        break;
      case "manuscript":
        pathData = manuscriptBorders(rng, w, h);
        break;
      case "waveform": {
        const cx = w * (0.3 + rng() * 0.4);
        const cy = h * (0.3 + rng() * 0.4);
        pathData = waveformResonance(rng, cx, cy, w);
        break;
      }
      case "geometry": {
        const cx = w * (0.2 + rng() * 0.6);
        const cy = h * (0.2 + rng() * 0.6);
        const r = Math.min(w, h) * (0.05 + rng() * 0.08);
        pathData = sacredGeometry(rng, cx, cy, r);
        break;
      }
      case "cartographic":
        pathData = cartographicLines(rng, w, h);
        break;
      case "roots":
        pathData = treeRoots(rng, w, h);
        break;
      default:
        break;
    }

    if (pathData) {
      layers.push({ family, pathData, colour, strokeWidth, opacity });
    }
  }

  return layers;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SacredCanvasProps {
  /** Creator's numeric ID — used as the deterministic seed */
  seed: number;
  /** Enable 0.5 px parallax on scroll */
  parallax?: boolean;
  /** Override base opacity (default: 0.07 — visibly subtle on dark backgrounds) */
  opacity?: number;
}

export function SacredCanvas({ seed, parallax = false, opacity = 0.07 }: SacredCanvasProps) {
  const W = 1440;
  const H = 900;
  const svgRef = useRef<SVGSVGElement>(null);

  const layers = useMemo(() => buildMotifLayers(seed, W, H), [seed]);

  // Parallax scroll handler
  useEffect(() => {
    if (!parallax) return;
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const onScroll = () => {
      const scrollY = window.scrollY;
      const shift = scrollY * 0.005; // 0.5 px per 100 px scroll
      if (svgRef.current) {
        svgRef.current.style.transform = `translateY(${shift}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [parallax]);

  const gradId = `sc-radial-${seed}`;
  const vigId = `sc-vignette-${seed}`;
  const maskId = `sc-typo-mask-${seed}`;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        opacity,
        willChange: parallax ? "transform" : undefined,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Soft radial illumination from page centre */}
          <radialGradient id={gradId} cx="50%" cy="45%" r="65%" fx="50%" fy="45%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
          </radialGradient>

          {/* Edge vignette */}
          <radialGradient id={vigId} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.0" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>

          {/* Typography protection mask — near-zero opacity behind central reading field */}
          <mask id={maskId}>
            {/* Full canvas white (visible) */}
            <rect x="0" y="0" width={W} height={H} fill="white" />
            {/* Central reading zone — fade motifs to near-invisible */}
            <ellipse
              cx={W / 2}
              cy={H * 0.42}
              rx={W * 0.28}
              ry={H * 0.32}
              fill="black"
              opacity="0.55"
            />
          </mask>
        </defs>

        {/* Motif layers — masked for typography protection */}
        <g mask={`url(#${maskId})`}>
          {layers.map((layer, i) => (
            <path
              key={`${layer.family}-${i}`}
              d={layer.pathData}
              fill="none"
              stroke={layer.colour}
              strokeWidth={layer.strokeWidth}
              opacity={layer.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Radial illumination overlay */}
        <rect x="0" y="0" width={W} height={H} fill={`url(#${gradId})`} />

        {/* Edge vignette overlay */}
        <rect x="0" y="0" width={W} height={H} fill={`url(#${vigId})`} />
      </svg>
    </div>
  );
}

export default SacredCanvas;
