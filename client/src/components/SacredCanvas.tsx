/**
 * SacredCanvas — Archive Background System
 *
 * Exact layer order (bottom to top):
 *
 *   Layer 1 — Pure black base (body/html CSS, not this component)
 *   Layer 2 — Very faint procedural paper grain (SVG feTurbulence, ~1%)
 *   Layer 3 — Sacred geometry linework (2% opacity)
 *   Layer 4 — Chain of Witness linework (3% opacity)
 *   Layer 5 — Soft radial illumination (centre glow + edge vignette)
 *   Layer 6 — Content cards (handled by page components)
 *   Layer 7 — Typography (handled by page components)
 *
 * This component renders layers 2–5 only, fixed behind all content.
 * Seed = creator numeric ID → deterministic, unique per creator.
 */

import { useMemo, useEffect, useRef } from "react";

// ─── Seeded PRNG ───────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return (): number => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Layer 3: Sacred geometry (2%) ────────────────────────────────────────────
// Antique bronze linework: Flower of Life circles, Vesica Piscis,
// fine grid, compass rose, pointed arch silhouettes.
function buildSacredGeometry(rng: () => number, W: number, H: number): string {
  let d = "";

  // Flower of Life — one cluster, seeded position
  const cx = W * (0.15 + rng() * 0.70);
  const cy = H * (0.15 + rng() * 0.70);
  const r  = 35 + rng() * 55;
  // Centre circle
  d += `M ${(cx + r).toFixed(1)} ${cy.toFixed(1)} A ${r} ${r} 0 1 0 ${(cx - r).toFixed(1)} ${cy.toFixed(1)} A ${r} ${r} 0 1 0 ${(cx + r).toFixed(1)} ${cy.toFixed(1)} `;
  // Six petals
  for (let i = 0; i < 6; i++) {
    const a  = (i / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    d += `M ${(px + r).toFixed(1)} ${py.toFixed(1)} A ${r} ${r} 0 1 0 ${(px - r).toFixed(1)} ${py.toFixed(1)} A ${r} ${r} 0 1 0 ${(px + r).toFixed(1)} ${py.toFixed(1)} `;
  }

  // Vesica Piscis — second seeded position
  const vx = W * (0.1 + rng() * 0.80);
  const vy = H * (0.1 + rng() * 0.80);
  const vr = 28 + rng() * 44;
  d += `M ${(vx + vr).toFixed(1)} ${vy.toFixed(1)} A ${vr} ${vr} 0 1 0 ${(vx - vr).toFixed(1)} ${vy.toFixed(1)} A ${vr} ${vr} 0 1 0 ${(vx + vr).toFixed(1)} ${vy.toFixed(1)} `;
  d += `M ${vx.toFixed(1)} ${(vy + vr).toFixed(1)} A ${vr} ${vr} 0 1 0 ${vx.toFixed(1)} ${(vy - vr).toFixed(1)} A ${vr} ${vr} 0 1 0 ${vx.toFixed(1)} ${(vy + vr).toFixed(1)} `;

  // Fine grid — lower-left quadrant
  const gx   = rng() * W * 0.25;
  const gy   = H * 0.4 + rng() * H * 0.35;
  const gs   = 18 + rng() * 28;
  const cols = 8 + Math.floor(rng() * 8);
  const rows = 5 + Math.floor(rng() * 5);
  for (let row = 0; row <= rows; row++) {
    d += `M ${gx.toFixed(1)} ${(gy + row * gs).toFixed(1)} h ${(cols * gs).toFixed(1)} `;
  }
  for (let col = 0; col <= cols; col++) {
    d += `M ${(gx + col * gs).toFixed(1)} ${gy.toFixed(1)} v ${(rows * gs).toFixed(1)} `;
  }

  // Compass rose — right side
  const rx2 = W * (0.72 + rng() * 0.20);
  const ry2 = H * (0.20 + rng() * 0.60);
  const rr  = 22 + rng() * 32;
  d += `M ${(rx2 + rr).toFixed(1)} ${ry2.toFixed(1)} A ${rr} ${rr} 0 1 0 ${(rx2 - rr).toFixed(1)} ${ry2.toFixed(1)} A ${rr} ${rr} 0 1 0 ${(rx2 + rr).toFixed(1)} ${ry2.toFixed(1)} `;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    d += `M ${rx2.toFixed(1)} ${ry2.toFixed(1)} L ${(rx2 + Math.cos(a) * rr).toFixed(1)} ${(ry2 + Math.sin(a) * rr).toFixed(1)} `;
  }

  // Pointed arch silhouettes rising from bottom
  const archCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < archCount; i++) {
    const ax  = W * (0.1 + (i / archCount) * 0.75 + rng() * 0.08);
    const aw  = W * (0.08 + rng() * 0.10);
    const ah  = H * (0.35 + rng() * 0.30);
    const acx = ax + aw / 2;
    d += `M ${ax.toFixed(1)} ${H} C ${ax.toFixed(1)} ${(H - ah * 0.5).toFixed(1)}, ${acx.toFixed(1)} ${(H - ah * 1.05).toFixed(1)}, ${acx.toFixed(1)} ${(H - ah).toFixed(1)} C ${acx.toFixed(1)} ${(H - ah * 1.05).toFixed(1)}, ${(ax + aw).toFixed(1)} ${(H - ah * 0.5).toFixed(1)}, ${(ax + aw).toFixed(1)} ${H} `;
  }

  return d;
}

// ─── Layer 4: Chain of Witness linework (3%) ──────────────────────────────────
// Antique gold oval chain links weaving across the canvas.
// complete=true  → closed links = verified provenance / unbroken chain of custody
// complete=false → open links   = public domain / liberated works
function buildChainPath(
  rng: () => number,
  W: number,
  H: number,
  complete: boolean
): string {
  let d = "";

  // Wandering waypoints
  const segCount = 7 + Math.floor(rng() * 7);
  const pts: [number, number][] = [];
  let px = rng() * W;
  let py = rng() * H;
  pts.push([px, py]);
  for (let i = 0; i < segCount; i++) {
    px = Math.max(16, Math.min(W - 16, px + (rng() - 0.5) * W * 0.32));
    py = Math.max(16, Math.min(H - 16, py + (rng() - 0.5) * H * 0.32));
    pts.push([px, py]);
  }

  const LW = 13; // link width (long axis)
  const LH = 7;  // link height (short axis)
  const spacing = LW * 1.55;
  let traveled = 0;

  for (let seg = 0; seg < pts.length - 1; seg++) {
    const [x1, y1] = pts[seg];
    const [x2, y2] = pts[seg + 1];
    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let t = (spacing - (traveled % spacing)) % spacing;
    while (t < len) {
      const lx = x1 + cos * t;
      const ly = y1 + sin * t;
      // Alternate link orientation every other link
      const even = Math.floor((traveled + t) / spacing) % 2 === 0;
      const la   = even ? angle : angle + Math.PI / 2;
      const lc   = Math.cos(la);
      const ls   = Math.sin(la);
      const rx   = LW / 2;
      const ry   = LH / 2;
      const deg  = (la * 180) / Math.PI;

      if (complete) {
        // Full closed oval
        d += `M ${(lx + lc * rx).toFixed(1)} ${(ly + ls * rx).toFixed(1)} `;
        d += `A ${rx} ${ry} ${deg.toFixed(1)} 1 0 ${(lx - lc * rx).toFixed(1)} ${(ly - ls * rx).toFixed(1)} `;
        d += `A ${rx} ${ry} ${deg.toFixed(1)} 1 0 ${(lx + lc * rx).toFixed(1)} ${(ly + ls * rx).toFixed(1)} `;
      } else {
        // Broken — two open arcs with a gap at each end
        d += `M ${(lx + lc * rx).toFixed(1)} ${(ly + ls * rx).toFixed(1)} `;
        d += `A ${rx} ${ry} ${deg.toFixed(1)} 0 0 ${(lx - ls * ry).toFixed(1)} ${(ly + lc * ry).toFixed(1)} `;
        d += `M ${(lx - lc * rx).toFixed(1)} ${(ly - ls * rx).toFixed(1)} `;
        d += `A ${rx} ${ry} ${deg.toFixed(1)} 0 0 ${(lx + ls * ry).toFixed(1)} ${(ly - lc * ry).toFixed(1)} `;
      }

      t += spacing;
    }
    traveled += len;
  }

  return d;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface SacredCanvasProps {
  seed?: number;
  parallax?: boolean;
}

const PLATFORM_SEED = 0x4c4e5058;

export function SacredCanvas({
  seed = PLATFORM_SEED,
  parallax = false,
}: SacredCanvasProps) {
  const W = 1440;
  const H = 900;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parallax || !wrapRef.current) return;
    const el = wrapRef.current;
    const onScroll = () => {
      el.style.transform = `translateY(${window.scrollY * 0.004}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [parallax]);

  const { sacredPath, chainCompletePaths, chainBrokenPaths } = useMemo(() => {
    const rng = mulberry32(seed);
    return {
      sacredPath: buildSacredGeometry(rng, W, H),
      // 2–3 complete chains, 1–2 broken chains
      chainCompletePaths: Array.from({ length: 2 + Math.floor(rng() * 2) }, () =>
        buildChainPath(mulberry32(seed + Math.floor(rng() * 9999)), W, H, true)
      ),
      chainBrokenPaths: Array.from({ length: 1 + Math.floor(rng() * 2) }, () =>
        buildChainPath(mulberry32(seed + Math.floor(rng() * 9999) + 50000), W, H, false)
      ),
    };
  }, [seed]);

  const noiseId = `grain-${seed}`;
  const glowId  = `glow-${seed}`;
  const vigId   = `vig-${seed}`;

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        willChange: parallax ? "transform" : undefined,
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Layer 2 — paper grain filter */}
          <filter id={noiseId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.72"
              numOctaves="4"
              seed={(seed % 997) + 1}
              result="noise"
            />
            <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blended" />
            <feComponentTransfer in="blended">
              <feFuncA type="linear" slope="0.22" />
            </feComponentTransfer>
          </filter>

          {/* Layer 5 — radial centre glow */}
          <radialGradient id={glowId} cx="50%" cy="44%" r="55%">
            <stop offset="0%"   stopColor="#c49a28" stopOpacity="0.07" />
            <stop offset="40%"  stopColor="#8b6914" stopOpacity="0.025" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Layer 5 — edge vignette */}
          <radialGradient id={vigId} cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor="#000000" stopOpacity="0" />
            <stop offset="60%"  stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        {/* ── Layer 2: Paper grain ── */}
        <rect
          x="0" y="0" width={W} height={H}
          fill="#0d0b08"
          filter={`url(#${noiseId})`}
          opacity="0.012"
        />

        {/* ── Layer 3: Sacred geometry — 2% ── */}
        <path
          d={sacredPath}
          fill="none"
          stroke="#8B6914"
          strokeWidth="0.55"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.02"
        />

        {/* ── Layer 4: Chain of Witness — 3% ── */}
        {/* Complete chains — verified provenance (gold) */}
        {chainCompletePaths.map((p, i) => (
          <path
            key={`cc-${i}`}
            d={p}
            fill="none"
            stroke="#C49A28"
            strokeWidth="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.03"
          />
        ))}
        {/* Broken chains — liberated / public domain (dimmer bronze) */}
        {chainBrokenPaths.map((p, i) => (
          <path
            key={`cb-${i}`}
            d={p}
            fill="none"
            stroke="#6B5020"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.025"
          />
        ))}

        {/* ── Layer 5: Soft radial illumination ── */}
        <rect x="0" y="0" width={W} height={H} fill={`url(#${glowId})`} />
        <rect x="0" y="0" width={W} height={H} fill={`url(#${vigId})`} />
      </svg>
    </div>
  );
}
