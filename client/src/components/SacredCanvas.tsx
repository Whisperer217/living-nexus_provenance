/**
 * SacredCanvas — Archive Network Background System
 *
 * Renders a full-page background that makes the platform feel like opening
 * a sacred archive where every artifact is connected by an unbroken chain
 * of testimony. Layers (bottom to top):
 *
 *   1. Procedural parchment grain (SVG feTurbulence noise)
 *   2. Cartographic contour lines — ancient map substrate
 *   3. Sacred geometric linework — Flower of Life, Vesica Piscis, grids
 *   4. Cathedral architecture — pointed arches, tracery, rose windows
 *   5. Ancient manuscript etchings — marginalia, flourishes, annotation marks
 *   6. Fine constellation paths — star fields with connecting lines
 *   7. Antique gold chain links — weaving throughout, fading in/out
 *      (complete = verified provenance; broken = public domain / liberated)
 *   8. Radial illumination + edge vignette
 *
 * All layers: hand-forged antique bronze palette, 2–4% global opacity,
 * slight embossed engraving effect via SVG feMorphology + feBlend.
 * Typography protection: central reading zone softly masked.
 *
 * Usage:
 *   <SacredCanvas seed={creator.id} />
 *   <SacredCanvas seed={creator.id} parallax />
 *   <SacredCanvas />  // uses a fixed platform-level seed
 */

import { useMemo, useEffect, useRef } from "react";

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
function mulberry32(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return function (): number {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Palette — antique bronze / parchment / gold ──────────────────────────────
const BRONZE   = "#8B6914";
const GOLD     = "#C49A28";
const PARCHMENT = "#D4C5A9";
const SMOKE    = "#9E9E8E";
const DIM      = "#6B6050";

function pickColour(rng: () => number): string {
  const palette = [BRONZE, GOLD, PARCHMENT, SMOKE, DIM];
  return palette[Math.floor(rng() * palette.length)];
}

// ─── Layer 1: Cartographic contour lines ──────────────────────────────────────
function cartographicLines(rng: () => number, w: number, h: number): string {
  let d = "";
  const lineCount = 12 + Math.floor(rng() * 10);
  for (let i = 0; i < lineCount; i++) {
    const y0 = rng() * h;
    const segments = 8 + Math.floor(rng() * 8);
    const points: [number, number][] = [];
    let x = rng() * w * 0.3;
    let y = y0;
    for (let j = 0; j < segments; j++) {
      x += (w / segments) * (0.7 + rng() * 0.6);
      y += (rng() - 0.5) * h * 0.08;
      points.push([x, y]);
    }
    if (points.length < 2) continue;
    d += `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let j = 1; j < points.length; j++) {
      const mx = ((points[j - 1][0] + points[j][0]) / 2).toFixed(1);
      const my = ((points[j - 1][1] + points[j][1]) / 2).toFixed(1);
      d += ` Q ${points[j - 1][0].toFixed(1)} ${points[j - 1][1].toFixed(1)} ${mx} ${my}`;
    }
  }
  return d;
}

// ─── Layer 2: Sacred geometric linework ───────────────────────────────────────
function sacredGeometry(rng: () => number, w: number, h: number): string {
  let d = "";

  // Flower of Life circles
  const cx = w * (0.2 + rng() * 0.6);
  const cy = h * (0.2 + rng() * 0.6);
  const r = 40 + rng() * 60;
  const rings = 2 + Math.floor(rng() * 2);
  for (let ring = 0; ring <= rings; ring++) {
    if (ring === 0) {
      d += `M ${(cx + r).toFixed(1)} ${cy.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(cx - r).toFixed(1)} ${cy.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(cx + r).toFixed(1)} ${cy.toFixed(1)} `;
    } else {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const nx = cx + Math.cos(angle) * r * ring;
        const ny = cy + Math.sin(angle) * r * ring;
        d += `M ${(nx + r).toFixed(1)} ${ny.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(nx - r).toFixed(1)} ${ny.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(nx + r).toFixed(1)} ${ny.toFixed(1)} `;
      }
    }
  }

  // Vesica Piscis
  const vx = w * (0.1 + rng() * 0.8);
  const vy = h * (0.1 + rng() * 0.8);
  const vr = 30 + rng() * 50;
  d += `M ${(vx + vr).toFixed(1)} ${vy.toFixed(1)} A ${vr.toFixed(1)} ${vr.toFixed(1)} 0 1 0 ${(vx - vr).toFixed(1)} ${vy.toFixed(1)} A ${vr.toFixed(1)} ${vr.toFixed(1)} 0 1 0 ${(vx + vr).toFixed(1)} ${vy.toFixed(1)} `;
  d += `M ${vx.toFixed(1)} ${(vy + vr).toFixed(1)} A ${vr.toFixed(1)} ${vr.toFixed(1)} 0 1 0 ${vx.toFixed(1)} ${(vy - vr).toFixed(1)} A ${vr.toFixed(1)} ${vr.toFixed(1)} 0 1 0 ${vx.toFixed(1)} ${(vy + vr).toFixed(1)} `;

  // Grid of fine squares
  const gx = rng() * w * 0.5;
  const gy = rng() * h * 0.5;
  const gs = 20 + rng() * 30;
  const gcols = 6 + Math.floor(rng() * 6);
  const grows = 4 + Math.floor(rng() * 4);
  for (let row = 0; row < grows; row++) {
    for (let col = 0; col < gcols; col++) {
      const x = gx + col * gs;
      const y = gy + row * gs;
      d += `M ${x.toFixed(1)} ${y.toFixed(1)} h ${gs.toFixed(1)} v ${gs.toFixed(1)} h -${gs.toFixed(1)} Z `;
    }
  }

  return d;
}

// ─── Layer 3: Cathedral architecture ──────────────────────────────────────────
function cathedralArchitecture(rng: () => number, w: number, h: number): string {
  let d = "";
  const count = 2 + Math.floor(rng() * 3);

  for (let i = 0; i < count; i++) {
    const x = (w / count) * i + (w / count) * (0.1 + rng() * 0.2);
    const aw = (w / count) * (0.25 + rng() * 0.2);
    const ah = h * (0.5 + rng() * 0.35);
    const cx = x + aw / 2;
    const base = h;

    // Pointed arch
    const cp1x = x;
    const cp1y = base - ah * 0.55;
    const cp2x = cx;
    const cp2y = base - ah * 1.05;
    const cp3x = x + aw;
    const cp3y = base - ah * 0.55;
    d += `M ${x.toFixed(1)} ${base.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${cx.toFixed(1)} ${(base - ah).toFixed(1)} C ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${cp3x.toFixed(1)} ${cp3y.toFixed(1)}, ${(x + aw).toFixed(1)} ${base.toFixed(1)} `;

    // Tracery — inner smaller arch
    const tr = aw * 0.3;
    const tx = cx - tr / 2;
    const tah = ah * 0.45;
    const tcp1x = tx;
    const tcp1y = base - tah * 0.55;
    const tcp2x = cx;
    const tcp2y = base - tah * 1.05;
    const tcp3x = tx + tr;
    const tcp3y = base - tah * 0.55;
    d += `M ${tx.toFixed(1)} ${base.toFixed(1)} C ${tcp1x.toFixed(1)} ${tcp1y.toFixed(1)}, ${tcp2x.toFixed(1)} ${tcp2y.toFixed(1)}, ${cx.toFixed(1)} ${(base - tah).toFixed(1)} C ${tcp2x.toFixed(1)} ${tcp2y.toFixed(1)}, ${tcp3x.toFixed(1)} ${tcp3y.toFixed(1)}, ${(tx + tr).toFixed(1)} ${base.toFixed(1)} `;

    // Rose window at apex
    const rwr = aw * 0.12;
    const rwx = cx;
    const rwy = base - ah + rwr * 2;
    d += `M ${(rwx + rwr).toFixed(1)} ${rwy.toFixed(1)} A ${rwr.toFixed(1)} ${rwr.toFixed(1)} 0 1 0 ${(rwx - rwr).toFixed(1)} ${rwy.toFixed(1)} A ${rwr.toFixed(1)} ${rwr.toFixed(1)} 0 1 0 ${(rwx + rwr).toFixed(1)} ${rwy.toFixed(1)} `;
    // Spokes
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2;
      d += `M ${rwx.toFixed(1)} ${rwy.toFixed(1)} l ${(Math.cos(a) * rwr).toFixed(1)} ${(Math.sin(a) * rwr).toFixed(1)} `;
    }
  }

  return d;
}

// ─── Layer 4: Manuscript etchings — marginalia & flourishes ───────────────────
function manuscriptEtchings(rng: () => number, w: number, h: number): string {
  let d = "";

  // Corner flourishes
  const corners = [
    [0, 0, 1, 1],
    [w, 0, -1, 1],
    [0, h, 1, -1],
    [w, h, -1, -1],
  ];
  for (const [ox, oy, sx, sy] of corners) {
    const size = 60 + rng() * 80;
    // Curling vine
    d += `M ${ox} ${oy} `;
    d += `C ${ox + sx * size * 0.3} ${oy + sy * size * 0.05}, ${ox + sx * size * 0.6} ${oy + sy * size * 0.2}, ${ox + sx * size * 0.5} ${oy + sy * size * 0.5} `;
    d += `C ${ox + sx * size * 0.4} ${oy + sy * size * 0.8}, ${ox + sx * size * 0.1} ${oy + sy * size * 0.7}, ${ox + sx * size * 0.15} ${oy + sy * size} `;
    // Cross flourish
    d += `M ${ox} ${oy} C ${ox + sx * size * 0.05} ${oy + sy * size * 0.3}, ${ox + sx * size * 0.2} ${oy + sy * size * 0.6}, ${ox + sx * size * 0.5} ${oy + sy * size * 0.5} `;
  }

  // Scattered annotation marks (small crosses, asterisks)
  const markCount = 8 + Math.floor(rng() * 12);
  for (let i = 0; i < markCount; i++) {
    const mx = rng() * w;
    const my = rng() * h;
    const ms = 4 + rng() * 8;
    // Cross
    d += `M ${(mx - ms).toFixed(1)} ${my.toFixed(1)} h ${(ms * 2).toFixed(1)} M ${mx.toFixed(1)} ${(my - ms).toFixed(1)} v ${(ms * 2).toFixed(1)} `;
    // Diagonal
    d += `M ${(mx - ms * 0.7).toFixed(1)} ${(my - ms * 0.7).toFixed(1)} l ${(ms * 1.4).toFixed(1)} ${(ms * 1.4).toFixed(1)} M ${(mx + ms * 0.7).toFixed(1)} ${(my - ms * 0.7).toFixed(1)} l ${(-ms * 1.4).toFixed(1)} ${(ms * 1.4).toFixed(1)} `;
  }

  // Horizontal rule lines (like manuscript page lines)
  const lineCount = 3 + Math.floor(rng() * 4);
  for (let i = 0; i < lineCount; i++) {
    const ly = rng() * h;
    const lx1 = rng() * w * 0.1;
    const lx2 = w - rng() * w * 0.1;
    d += `M ${lx1.toFixed(1)} ${ly.toFixed(1)} L ${lx2.toFixed(1)} ${ly.toFixed(1)} `;
  }

  return d;
}

// ─── Layer 5: Constellation paths ─────────────────────────────────────────────
function constellationPaths(rng: () => number, w: number, h: number): string {
  let d = "";
  const starCount = 30 + Math.floor(rng() * 40);
  const stars: [number, number][] = [];
  for (let i = 0; i < starCount; i++) {
    stars.push([rng() * w, rng() * h]);
  }

  // Draw connecting lines between nearby stars
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[i][0] - stars[j][0];
      const dy = stars[i][1] - stars[j][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120 + rng() * 60) {
        d += `M ${stars[i][0].toFixed(1)} ${stars[i][1].toFixed(1)} L ${stars[j][0].toFixed(1)} ${stars[j][1].toFixed(1)} `;
      }
    }
  }

  // Star dots (small circles approximated with short paths)
  for (const [sx, sy] of stars) {
    const sr = 1 + rng() * 2;
    d += `M ${(sx + sr).toFixed(1)} ${sy.toFixed(1)} A ${sr.toFixed(1)} ${sr.toFixed(1)} 0 1 0 ${(sx - sr).toFixed(1)} ${sy.toFixed(1)} A ${sr.toFixed(1)} ${sr.toFixed(1)} 0 1 0 ${(sx + sr).toFixed(1)} ${sy.toFixed(1)} `;
  }

  return d;
}

// ─── Layer 6: Chain links ──────────────────────────────────────────────────────
/**
 * Generates a path of interlocking oval chain links along a curved route.
 * complete=true → full closed links (verified provenance)
 * complete=false → broken links (public domain / liberated works)
 */
function chainLinkPath(
  rng: () => number,
  w: number,
  h: number,
  complete: boolean
): string {
  let d = "";

  // Generate a wandering path across the canvas
  const segCount = 6 + Math.floor(rng() * 8);
  const waypoints: [number, number][] = [];
  let px = rng() * w;
  let py = rng() * h;
  waypoints.push([px, py]);
  for (let i = 0; i < segCount; i++) {
    px = Math.max(20, Math.min(w - 20, px + (rng() - 0.5) * w * 0.35));
    py = Math.max(20, Math.min(h - 20, py + (rng() - 0.5) * h * 0.35));
    waypoints.push([px, py]);
  }

  // Place chain links along the path
  const linkW = 14;
  const linkH = 8;
  let traveled = 0;
  const spacing = linkW * 1.6;

  for (let seg = 0; seg < waypoints.length - 1; seg++) {
    const [x1, y1] = waypoints[seg];
    const [x2, y2] = waypoints[seg + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let t = (spacing - (traveled % spacing)) % spacing;
    while (t < segLen) {
      const lx = x1 + cos * t;
      const ly = y1 + sin * t;
      const isEven = Math.floor((traveled + t) / spacing) % 2 === 0;

      // Alternate link orientation (horizontal / vertical relative to path)
      const linkAngle = isEven ? angle : angle + Math.PI / 2;
      const lcos = Math.cos(linkAngle);
      const lsin = Math.sin(linkAngle);

      // Oval link as two arcs
      const rx = linkW / 2;
      const ry = linkH / 2;

      if (complete) {
        // Full closed oval
        d += `M ${(lx + lcos * rx).toFixed(1)} ${(ly + lsin * rx).toFixed(1)} `;
        d += `A ${rx.toFixed(1)} ${ry.toFixed(1)} ${(linkAngle * 180 / Math.PI).toFixed(1)} 1 0 `;
        d += `${(lx - lcos * rx).toFixed(1)} ${(ly - lsin * rx).toFixed(1)} `;
        d += `A ${rx.toFixed(1)} ${ry.toFixed(1)} ${(linkAngle * 180 / Math.PI).toFixed(1)} 1 0 `;
        d += `${(lx + lcos * rx).toFixed(1)} ${(ly + lsin * rx).toFixed(1)} `;
      } else {
        // Broken link — two arcs with a gap
        d += `M ${(lx + lcos * rx).toFixed(1)} ${(ly + lsin * rx).toFixed(1)} `;
        d += `A ${rx.toFixed(1)} ${ry.toFixed(1)} ${(linkAngle * 180 / Math.PI).toFixed(1)} 0 0 `;
        d += `${(lx - lcos * rx * 0.3 - lsin * ry).toFixed(1)} ${(ly - lsin * rx * 0.3 + lcos * ry).toFixed(1)} `;
        d += `M ${(lx - lcos * rx).toFixed(1)} ${(ly - lsin * rx).toFixed(1)} `;
        d += `A ${rx.toFixed(1)} ${ry.toFixed(1)} ${(linkAngle * 180 / Math.PI).toFixed(1)} 0 0 `;
        d += `${(lx + lcos * rx * 0.3 + lsin * ry).toFixed(1)} ${(ly + lsin * rx * 0.3 - lcos * ry).toFixed(1)} `;
      }

      t += spacing;
    }
    traveled += segLen;
  }

  return d;
}

// ─── Layer definitions ────────────────────────────────────────────────────────
interface ArchiveLayer {
  id: string;
  pathData: string;
  colour: string;
  strokeWidth: number;
  opacity: number;
  strokeDasharray?: string;
}

function buildArchiveLayers(seed: number, w: number, h: number): ArchiveLayer[] {
  const rng = mulberry32(seed);
  const layers: ArchiveLayer[] = [];

  // 1. Cartographic contour lines — very faint, thin
  layers.push({
    id: "carto",
    pathData: cartographicLines(rng, w, h),
    colour: SMOKE,
    strokeWidth: 0.4,
    opacity: 0.6,
    strokeDasharray: "4 8",
  });

  // 2. Sacred geometry — slightly more present
  layers.push({
    id: "sacred",
    pathData: sacredGeometry(rng, w, h),
    colour: pickColour(rng),
    strokeWidth: 0.5,
    opacity: 0.55,
  });

  // 3. Cathedral architecture — structural, from bottom
  layers.push({
    id: "cathedral",
    pathData: cathedralArchitecture(rng, w, h),
    colour: BRONZE,
    strokeWidth: 0.6,
    opacity: 0.5,
  });

  // 4. Manuscript etchings — delicate
  layers.push({
    id: "manuscript",
    pathData: manuscriptEtchings(rng, w, h),
    colour: PARCHMENT,
    strokeWidth: 0.4,
    opacity: 0.45,
  });

  // 5. Constellation paths — finest lines
  layers.push({
    id: "constellation",
    pathData: constellationPaths(rng, w, h),
    colour: SMOKE,
    strokeWidth: 0.3,
    opacity: 0.4,
    strokeDasharray: undefined,
  });

  // 6a. Complete chain links (verified provenance) — 2–3 chains
  const chainCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < chainCount; i++) {
    layers.push({
      id: `chain-complete-${i}`,
      pathData: chainLinkPath(rng, w, h, true),
      colour: GOLD,
      strokeWidth: 0.7,
      opacity: 0.5 + rng() * 0.25,
    });
  }

  // 6b. Broken chain links (public domain / liberated) — 1–2 chains
  const brokenCount = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < brokenCount; i++) {
    layers.push({
      id: `chain-broken-${i}`,
      pathData: chainLinkPath(rng, w, h, false),
      colour: DIM,
      strokeWidth: 0.5,
      opacity: 0.35 + rng() * 0.2,
    });
  }

  return layers;
}

// ─── Component props ──────────────────────────────────────────────────────────
interface SacredCanvasProps {
  /** Creator's numeric ID — used as the deterministic seed. Defaults to platform seed. */
  seed?: number;
  /** Enable subtle 0.5 px parallax on scroll */
  parallax?: boolean;
  /** Override global opacity (default: 0.032 — 3.2%, within 2–4% spec) */
  opacity?: number;
}

// Platform-level seed (used when no creator seed is provided)
const PLATFORM_SEED = 0x4c4e5058; // "LNPX" in hex

export function SacredCanvas({
  seed = PLATFORM_SEED,
  parallax = false,
  opacity = 0.032,
}: SacredCanvasProps) {
  const W = 1440;
  const H = 900;
  const svgRef = useRef<SVGSVGElement>(null);

  // Parallax on scroll
  useEffect(() => {
    if (!parallax || !svgRef.current) return;
    const el = svgRef.current.parentElement;
    if (!el) return;
    const onScroll = () => {
      const y = window.scrollY * 0.004; // 0.4px per 100px scroll
      el.style.transform = `translateY(${y}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [parallax]);

  const layers = useMemo(() => buildArchiveLayers(seed, W, H), [seed]);

  const gradId  = `an-radial-${seed}`;
  const vigId   = `an-vignette-${seed}`;
  const maskId  = `an-typo-${seed}`;
  const noiseId = `an-noise-${seed}`;
  const embossId = `an-emboss-${seed}`;

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
          {/* Parchment grain noise */}
          <filter id={noiseId} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="3"
              seed={seed % 1000}
              result="noise"
            />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
            <feComponentTransfer in="blended">
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
          </filter>

          {/* Emboss / engraving effect */}
          <filter id={embossId} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" result="blur" />
            <feOffset dx="0.5" dy="0.5" in="blur" result="offsetBlur" />
            <feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
          </filter>

          {/* Soft radial illumination — centre glow */}
          <radialGradient id={gradId} cx="50%" cy="42%" r="60%" fx="50%" fy="42%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.0" />
          </radialGradient>

          {/* Edge vignette */}
          <radialGradient id={vigId} cx="50%" cy="50%" r="72%">
            <stop offset="0%"   stopColor="#000000" stopOpacity="0.0" />
            <stop offset="65%"  stopColor="#000000" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
          </radialGradient>

          {/* Typography protection mask */}
          <mask id={maskId}>
            <rect x="0" y="0" width={W} height={H} fill="white" />
            <ellipse
              cx={W / 2}
              cy={H * 0.44}
              rx={W * 0.26}
              ry={H * 0.30}
              fill="black"
              opacity="0.5"
            />
          </mask>
        </defs>

        {/* Parchment grain background rect */}
        <rect
          x="0" y="0" width={W} height={H}
          fill="#1a1510"
          filter={`url(#${noiseId})`}
          opacity="0.4"
        />

        {/* All archive layers — masked for typography protection, embossed */}
        <g mask={`url(#${maskId})`} filter={`url(#${embossId})`}>
          {layers.map((layer) => (
            <path
              key={layer.id}
              d={layer.pathData}
              fill="none"
              stroke={layer.colour}
              strokeWidth={layer.strokeWidth}
              opacity={layer.opacity}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={layer.strokeDasharray}
            />
          ))}
        </g>

        {/* Radial illumination overlay */}
        <rect x="0" y="0" width={W} height={H} fill={`url(#${gradId})`} />

        {/* Edge vignette */}
        <rect x="0" y="0" width={W} height={H} fill={`url(#${vigId})`} />
      </svg>
    </div>
  );
}
