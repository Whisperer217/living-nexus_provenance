/*
╔══════════════════════════════════════════════════════════════════════════════╗
║  LIVING NEXUS — VISION CHAMBER RITUAL                                        ║
║  ──────────────────────────────────────────────────────────────────────────  ║
║  A living canvas ritual that plays during image generation.                  ║
║  No external libraries — pure canvas + CSS + SVG.                            ║
║                                                                               ║
║  Phases:                                                                      ║
║    1. AWAKENING  (0–0.5s)  — chamber dims, particles spawn                   ║
║    2. WEAVING    (0.5s–∞)  — particles drift, prompt words dissolve upward   ║
║    3. SEALING    (on done) — particles collapse, gold seal traces to close   ║
║    4. REVEAL     (seal done) — image materialises with center-out wipe       ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

import { useRef, useEffect, useState, useCallback } from "react";

// ── Keyframe injection (once per page load) ───────────────────────────────────
let ritualKeyframesInjected = false;
function ensureRitualKeyframes() {
  if (ritualKeyframesInjected || typeof document === "undefined") return;
  ritualKeyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes vcr-word-float {
      0%   { opacity: 0.7; transform: translateY(0px) scale(1); }
      60%  { opacity: 0.4; transform: translateY(-28px) scale(0.92); }
      100% { opacity: 0;   transform: translateY(-52px) scale(0.82); }
    }
    @keyframes vcr-seal-flash {
      0%   { opacity: 0; transform: scale(0.88); }
      30%  { opacity: 1; transform: scale(1.06); filter: drop-shadow(0 0 12px rgba(196,154,40,0.9)); }
      70%  { opacity: 0.8; transform: scale(1.02); }
      100% { opacity: 0; transform: scale(1.12); }
    }
    @keyframes vcr-image-reveal {
      0%   { clip-path: circle(0% at 50% 50%); opacity: 0; }
      60%  { clip-path: circle(55% at 50% 50%); opacity: 0.9; }
      100% { clip-path: circle(100% at 50% 50%); opacity: 1; }
    }
    @keyframes vcr-shimmer-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(196,154,40,0); }
      20%  { box-shadow: 0 0 0 6px rgba(196,154,40,0.55), 0 0 32px rgba(196,154,40,0.35); }
      60%  { box-shadow: 0 0 0 12px rgba(196,154,40,0.18), 0 0 48px rgba(196,154,40,0.18); }
      100% { box-shadow: 0 0 0 0 rgba(196,154,40,0); }
    }
    @keyframes vcr-label-fade {
      0%   { opacity: 0; transform: translateY(6px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ── Particle system ───────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  alpha: number;
  targetAlpha: number;
  color: string;
  life: number; // 0–1
  phase: "drift" | "collapse";
  collapseTargetX?: number;
  collapseTargetY?: number;
}

function createParticle(w: number, h: number, modeColor: string): Particle {
  const colors = [modeColor, "rgba(196,154,40,0.7)", "rgba(120,80,20,0.5)", "rgba(60,40,10,0.4)"];
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.3 - 0.1,
    radius: Math.random() * 2.2 + 0.4,
    alpha: 0,
    targetAlpha: Math.random() * 0.55 + 0.1,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: Math.random(),
    phase: "drift",
  };
}

// ── Word fragment component ───────────────────────────────────────────────────
function WordFragment({ word, x, y, delay, color }: { word: string; x: number; y: number; delay: number; color: string }) {
  return (
    <span
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.55rem",
        color,
        opacity: 0,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        letterSpacing: "0.08em",
        animation: `vcr-word-float 2.8s ease-out ${delay}s forwards`,
        textShadow: `0 0 8px ${color}`,
      }}
    >
      {word}
    </span>
  );
}

// ── SVG Seal ──────────────────────────────────────────────────────────────────
function GoldSeal({ progress, flash, size = 80 }: { progress: number; flash: boolean; size?: number }) {
  const r = size * 0.38;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        animation: flash ? "vcr-seal-flash 0.9s ease-out forwards" : "none",
        pointerEvents: "none",
      }}
    >
      {/* Outer ring — faint track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(196,154,40,0.12)"
        strokeWidth="1"
      />
      {/* Animated arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(196,154,40,0.85)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "stroke-dashoffset 0.08s linear",
          filter: "drop-shadow(0 0 4px rgba(196,154,40,0.6))",
        }}
      />
      {/* Inner cross-hair — only at full seal */}
      {progress >= 0.98 && (
        <>
          <line x1={size / 2 - 6} y1={size / 2} x2={size / 2 + 6} y2={size / 2}
            stroke="rgba(196,154,40,0.5)" strokeWidth="0.8" />
          <line x1={size / 2} y1={size / 2 - 6} x2={size / 2} y2={size / 2 + 6}
            stroke="rgba(196,154,40,0.5)" strokeWidth="0.8" />
          <circle cx={size / 2} cy={size / 2} r={2.5}
            fill="none" stroke="rgba(196,154,40,0.7)" strokeWidth="0.8" />
        </>
      )}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface VisionChamberRitualProps {
  isGenerating: boolean;
  prompt: string;
  modeColor: string;
  /** Called when the reveal animation completes — parent can show the image */
  onRevealComplete?: () => void;
}

type RitualPhase = "idle" | "awakening" | "weaving" | "sealing" | "flash" | "done";

export function VisionChamberRitual({ isGenerating, prompt, modeColor, onRevealComplete }: VisionChamberRitualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<RitualPhase>("idle");
  const [sealProgress, setSealProgress] = useState(0);
  const [sealFlash, setSealFlash] = useState(false);
  const [wordFragments, setWordFragments] = useState<{ word: string; x: number; y: number; delay: number }[]>([]);
  const sealProgressRef = useRef(0);
  const phaseRef = useRef<RitualPhase>("idle");

  ensureRitualKeyframes();

  // ── Sync phase ref ──
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Build word fragments from prompt ──
  const buildFragments = useCallback((text: string) => {
    const words = text.split(/\s+/).filter(Boolean).slice(0, 18);
    return words.map((word, i) => ({
      word: word.toUpperCase().slice(0, 12),
      x: 8 + Math.random() * 72,
      y: 15 + Math.random() * 65,
      delay: i * 0.22 + 0.3,
    }));
  }, []);

  // ── Particle canvas loop ──
  const startCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Spawn initial particles
    particlesRef.current = Array.from({ length: 55 }, () => createParticle(W, H, modeColor));

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      const currentPhase = phaseRef.current;

      for (const p of particlesRef.current) {
        // Fade in
        if (p.alpha < p.targetAlpha && currentPhase !== "sealing" && currentPhase !== "flash") {
          p.alpha = Math.min(p.alpha + 0.012, p.targetAlpha);
        }

        if (p.phase === "collapse") {
          // Collapse toward center
          const dx = (p.collapseTargetX ?? cx) - p.x;
          const dy = (p.collapseTargetY ?? cy) - p.y;
          p.vx += dx * 0.018;
          p.vy += dy * 0.018;
          p.vx *= 0.88;
          p.vy *= 0.88;
          p.alpha *= 0.97;
        } else {
          // Drift
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02 - 0.003;
          p.vx *= 0.98;
          p.vy *= 0.98;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges (drift mode only)
        if (p.phase === "drift") {
          if (p.x < -4) p.x = W + 4;
          if (p.x > W + 4) p.x = -4;
          if (p.y < -4) p.y = H + 4;
          if (p.y > H + 4) p.y = -4;
        }

        if (p.alpha <= 0.005) continue;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
      }

      // Advance seal during sealing phase
      if (currentPhase === "sealing") {
        sealProgressRef.current = Math.min(sealProgressRef.current + 0.008, 1);
        setSealProgress(sealProgressRef.current);

        if (sealProgressRef.current >= 1) {
          setPhase("flash");
          phaseRef.current = "flash";
          setSealFlash(true);
          setTimeout(() => {
            setPhase("done");
            phaseRef.current = "done";
            onRevealComplete?.();
          }, 900);
          return; // stop loop
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [modeColor, onRevealComplete]);

  // ── Trigger on isGenerating change ──
  useEffect(() => {
    if (isGenerating) {
      // Reset
      sealProgressRef.current = 0;
      setSealProgress(0);
      setSealFlash(false);
      setPhase("awakening");
      phaseRef.current = "awakening";
      setWordFragments(buildFragments(prompt));

      setTimeout(() => {
        setPhase("weaving");
        phaseRef.current = "weaving";
        startCanvas();
      }, 400);
    } else {
      // Generation finished — enter sealing phase
      if (phaseRef.current === "weaving" || phaseRef.current === "awakening") {
        // Switch all particles to collapse mode
        const canvas = canvasRef.current;
        const cx = canvas ? canvas.width / 2 : 100;
        const cy = canvas ? canvas.height / 2 : 100;
        for (const p of particlesRef.current) {
          p.phase = "collapse";
          p.collapseTargetX = cx + (Math.random() - 0.5) * 20;
          p.collapseTargetY = cy + (Math.random() - 0.5) * 20;
        }
        setPhase("sealing");
        phaseRef.current = "sealing";
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isGenerating]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "idle" || phase === "done") return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(2px)",
        borderRadius: "inherit",
        overflow: "hidden",
      }}
    >
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: phase === "awakening" ? 0 : 1,
          transition: "opacity 0.5s ease",
        }}
      />

      {/* Floating word fragments */}
      {(phase === "weaving") && wordFragments.map((f, i) => (
        <WordFragment
          key={i}
          word={f.word}
          x={f.x}
          y={f.y}
          delay={f.delay}
          color={`${modeColor}cc`}
        />
      ))}

      {/* Gold seal */}
      {(phase === "weaving" || phase === "sealing" || phase === "flash") && (
        <GoldSeal
          progress={sealProgress}
          flash={sealFlash}
          size={88}
        />
      )}

      {/* Status label */}
      <div
        style={{
          position: "absolute",
          bottom: "18%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.5rem",
          letterSpacing: "0.18em",
          color: "rgba(196,154,40,0.7)",
          whiteSpace: "nowrap",
          animation: "vcr-label-fade 0.6s ease-out 0.3s both",
          pointerEvents: "none",
        }}
      >
        {phase === "awakening" && "AWAKENING VISION CHAMBER"}
        {phase === "weaving" && "WEAVING YOUR VISION"}
        {phase === "sealing" && "SEALING TO THE ARCHIVE"}
        {phase === "flash" && "WITNESSED"}
      </div>
    </div>
  );
}

// ── First-appearance shimmer wrapper ─────────────────────────────────────────
/**
 * Wrap a generated image in this to get the "being witnessed for the first time"
 * gold shimmer pulse on mount.
 */
export function WitnessedImageReveal({ children, className, style }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  ensureRitualKeyframes();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Trigger reveal animation on mount
    const t = setTimeout(() => setRevealed(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={className}
      style={{
        ...style,
        animation: revealed ? "vcr-image-reveal 0.85s cubic-bezier(0.22,1,0.36,1) forwards, vcr-shimmer-pulse 1.6s ease-out 0.5s forwards" : "none",
        borderRadius: "inherit",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
