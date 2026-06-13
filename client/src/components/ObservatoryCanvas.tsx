/**
 * ObservatoryCanvas
 * ─────────────────────────────────────────────────────────────────────────────
 * A persistent, slow-moving 3-depth-layer starfield that sits behind the entire
 * homepage. Communicates "navigating a living archive" — not decoration.
 *
 * Design principles:
 *  - Three depth layers (near / mid / far) with different drift speeds → genuine
 *    parallax depth without any scroll dependency
 *  - Stars are tiny (0.5–2px), gold-tinted, low opacity — observatory, not disco
 *  - Occasional "witness thread" lines connect distant stars very slowly
 *  - No flicker, no pulse, no bounce — cinematic stillness
 *  - Runs at ~20fps equivalent via requestAnimationFrame with time-based stepping
 *  - Fully self-contained, zero external dependencies
 */

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;       // horizontal drift speed (pixels per second)
  opacity: number;
  layer: 0 | 1 | 2;   // 0=far, 1=mid, 2=near
  twinklePhase: number;
  twinkleSpeed: number;
}

interface WitnessThread {
  a: number; // index into stars array
  b: number;
  opacity: number;
  maxOpacity: number;
  phase: "forming" | "holding" | "fading";
  age: number;
  lifetime: number;
}

const LAYER_CONFIG = [
  { count: 80,  speedRange: [0.8,  1.8],  sizeRange: [0.4, 0.9],  opacityRange: [0.08, 0.18] }, // far
  { count: 50,  speedRange: [2.0,  3.5],  sizeRange: [0.7, 1.4],  opacityRange: [0.12, 0.25] }, // mid
  { count: 25,  speedRange: [4.0,  6.5],  sizeRange: [1.2, 2.0],  opacityRange: [0.18, 0.35] }, // near
] as const;

const GOLD_HUE = "196,154,40";
const THREAD_MAX_DIST = 180; // px — max distance for witness thread connections
const MAX_THREADS = 6;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rand(min: number, max: number) { return min + Math.random() * (max - min); }

export function ObservatoryCanvas({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const threadsRef = useRef<WitnessThread[]>([]);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const widthRef = useRef(0);
  const heightRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // ── Initialise canvas size ──────────────────────────────────────────────
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      widthRef.current = w;
      heightRef.current = h;
      initStars(w, h);
    };

    const initStars = (w: number, h: number) => {
      const stars: Star[] = [];
      LAYER_CONFIG.forEach((cfg, layer) => {
        for (let i = 0; i < cfg.count; i++) {
          stars.push({
            x: rand(0, w),
            y: rand(0, h),
            size: rand(cfg.sizeRange[0], cfg.sizeRange[1]),
            speed: rand(cfg.speedRange[0], cfg.speedRange[1]),
            opacity: rand(cfg.opacityRange[0], cfg.opacityRange[1]),
            layer: layer as 0 | 1 | 2,
            twinklePhase: rand(0, Math.PI * 2),
            twinkleSpeed: rand(0.3, 0.9),
          });
        }
      });
      starsRef.current = stars;
      threadsRef.current = [];
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Thread spawner ──────────────────────────────────────────────────────
    const spawnThread = () => {
      const stars = starsRef.current;
      const threads = threadsRef.current;
      if (threads.length >= MAX_THREADS) return;

      // Pick a random star in the mid or near layer
      const candidates = stars
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => s.layer >= 1);
      if (candidates.length < 2) return;

      const ai = Math.floor(rand(0, candidates.length));
      const { s: sa, i: ia } = candidates[ai];

      // Find a nearby star within THREAD_MAX_DIST
      const nearby = candidates.filter(({ s, i }) => {
        if (i === ia) return false;
        const dx = s.x - sa.x;
        const dy = s.y - sa.y;
        return Math.sqrt(dx * dx + dy * dy) < THREAD_MAX_DIST;
      });
      if (nearby.length === 0) return;

      const { i: ib } = nearby[Math.floor(rand(0, nearby.length))];
      threads.push({
        a: ia,
        b: ib,
        opacity: 0,
        maxOpacity: rand(0.04, 0.10),
        phase: "forming",
        age: 0,
        lifetime: rand(4000, 9000), // ms
      });
    };

    const threadSpawnInterval = setInterval(spawnThread, 2200);

    // ── Draw loop ───────────────────────────────────────────────────────────
    const draw = (timestamp: number) => {
      const dt = Math.min(timestamp - lastTimeRef.current, 50); // cap at 50ms
      lastTimeRef.current = timestamp;
      const w = widthRef.current;
      const h = heightRef.current;

      ctx.clearRect(0, 0, w, h);

      const stars = starsRef.current;
      const threads = threadsRef.current;

      // ── Update + draw witness threads ─────────────────────────────────────
      for (let i = threads.length - 1; i >= 0; i--) {
        const t = threads[i];
        t.age += dt;

        const formDur = 1200;
        const fadeDur = 1000;
        const holdDur = t.lifetime - formDur - fadeDur;

        if (t.phase === "forming") {
          t.opacity = lerp(0, t.maxOpacity, Math.min(t.age / formDur, 1));
          if (t.age >= formDur) { t.phase = "holding"; t.age = 0; }
        } else if (t.phase === "holding") {
          t.opacity = t.maxOpacity;
          if (t.age >= holdDur) { t.phase = "fading"; t.age = 0; }
        } else {
          t.opacity = lerp(t.maxOpacity, 0, Math.min(t.age / fadeDur, 1));
          if (t.age >= fadeDur) { threads.splice(i, 1); continue; }
        }

        const sa = stars[t.a];
        const sb = stars[t.b];
        if (!sa || !sb) { threads.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = t.opacity;
        ctx.strokeStyle = `rgba(${GOLD_HUE},1)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.stroke();
        ctx.restore();
      }

      // ── Update + draw stars ───────────────────────────────────────────────
      const now = timestamp / 1000;
      for (const star of stars) {
        // Drift right, wrap around
        star.x += (star.speed * dt) / 1000;
        if (star.x > w + 4) star.x = -4;

        // Subtle twinkle — very slow, low amplitude
        const twinkle = 0.85 + 0.15 * Math.sin(now * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.opacity * twinkle;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgba(${GOLD_HUE},1)`;
        if (star.size > 1.2) {
          // Larger stars get a soft glow
          ctx.shadowColor = `rgba(${GOLD_HUE},0.5)`;
          ctx.shadowBlur = star.size * 2.5;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame((ts) => {
      lastTimeRef.current = ts;
      animRef.current = requestAnimationFrame(draw);
    });

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(threadSpawnInterval);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{ display: "block", ...style }}
      aria-hidden="true"
    />
  );
}
