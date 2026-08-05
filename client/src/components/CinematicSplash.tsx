/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — CinematicSplash
   ─────────────────────────────────────────────────────────────────────────
   Full-screen cinematic entry experience. Plays once per session.
   Phases:
     1. AWAKENING  (0–1.2s)  — void fades in, LN logo materialises
     2. FREQUENCY  (1.2–3.5s) — animated waveform pulses beneath logo
     3. PROCESS    (3.5–8s)  — three process cards cycle (Register → Witness → Discover)
     4. DISSOLVE   (8–9s)    — everything fades to void, app reveals
   No external libraries — pure canvas + CSS animations.
═══════════════════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useState, useCallback } from "react";

// ── Session guard ──────────────────────────────────────────────────────────
const SESSION_KEY = "ln_splash_seen_v2";
export function shouldShowSplash(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return !sessionStorage.getItem(SESSION_KEY);
}
export function markSplashSeen(): void {
  if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_KEY, "1");
}

// ── Keyframe injection ─────────────────────────────────────────────────────
let splashKeyframesInjected = false;
function ensureSplashKeyframes() {
  if (splashKeyframesInjected || typeof document === "undefined") return;
  splashKeyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ln-logo-rise {
      0%   { opacity: 0; transform: translateY(18px) scale(0.92); }
      60%  { opacity: 1; transform: translateY(-2px) scale(1.03); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ln-tagline-fade {
      0%   { opacity: 0; letter-spacing: 0.35em; }
      100% { opacity: 1; letter-spacing: 0.22em; }
    }
    @keyframes ln-card-enter {
      0%   { opacity: 0; transform: translateY(24px) scale(0.95); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes ln-card-exit {
      0%   { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-20px) scale(0.96); }
    }
    @keyframes ln-splash-dissolve {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes ln-skip-pulse {
      0%, 100% { opacity: 0.4; }
      50%       { opacity: 0.9; }
    }
    @keyframes ln-gold-pulse {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(212,175,55,0.3)); }
      50%       { filter: drop-shadow(0 0 24px rgba(212,175,55,0.8)); }
    }
    @keyframes ln-particle-drift {
      0%   { transform: translateY(0px) translateX(0px); opacity: 0.6; }
      50%  { transform: translateY(-12px) translateX(4px); opacity: 0.9; }
      100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
}

// ── Frequency canvas ───────────────────────────────────────────────────────
function FrequencyCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth || 480;
    const H = 80;
    canvas.width = W;
    canvas.height = H;

    const BARS = 64;
    const barW = W / BARS;
    // Each bar has a base frequency and phase offset for organic motion
    const phases = Array.from({ length: BARS }, (_, i) => ({
      freq: 0.8 + Math.random() * 2.4,
      phase: (i / BARS) * Math.PI * 2 + Math.random() * Math.PI,
      amp: 0.3 + Math.random() * 0.7,
    }));

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      tRef.current += 0.025;
      const t = tRef.current;

      for (let i = 0; i < BARS; i++) {
        const p = phases[i];
        // Layered sine waves give organic, music-like motion
        const raw =
          Math.sin(t * p.freq + p.phase) * 0.5 +
          Math.sin(t * p.freq * 1.7 + p.phase * 0.6) * 0.3 +
          Math.sin(t * 0.4 + (i / BARS) * Math.PI * 4) * 0.2;
        const normalised = (raw + 1) / 2; // 0–1
        const barH = Math.max(3, normalised * H * 0.85 * p.amp);
        const x = i * barW;
        const y = (H - barH) / 2;

        // Gold gradient per bar
        const alpha = active ? 0.4 + normalised * 0.6 : 0.1;
        const gradient = ctx.createLinearGradient(x, y, x, y + barH);
        gradient.addColorStop(0, `rgba(212,175,55,${alpha * 0.5})`);
        gradient.addColorStop(0.5, `rgba(212,175,55,${alpha})`);
        gradient.addColorStop(1, `rgba(212,175,55,${alpha * 0.5})`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barW - 2, barH, 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: 80,
        opacity: active ? 1 : 0.3,
        transition: "opacity 0.6s ease",
      }}
    />
  );
}

// ── Process cards ──────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  {
    step: "01",
    title: "Register",
    subtitle: "Your work receives a permanent Witness ID",
    description: "Upload your creation. The platform generates a cryptographic fingerprint and issues a WID — a sovereign proof of authorship that cannot be altered or removed.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" style={{ width: 40, height: 40 }}>
        <circle cx="24" cy="24" r="20" stroke="rgba(212,175,55,0.3)" strokeWidth="1.5" />
        <path d="M16 24l6 6 10-12" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="10" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />
      </svg>
    ),
    accentColor: "#D4AF37",
  },
  {
    step: "02",
    title: "Witness",
    subtitle: "Others verify and anchor your provenance chain",
    description: "Listeners, collaborators, and the community can witness your work — each act of witnessing strengthens the provenance chain and adds a timestamped record to the registry.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" style={{ width: 40, height: 40 }}>
        <circle cx="24" cy="24" r="20" stroke="rgba(100,200,255,0.3)" strokeWidth="1.5" />
        <path d="M8 24c0 0 6-10 16-10s16 10 16 10-6 10-16 10S8 24 8 24z" stroke="#64C8FF" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4" fill="#64C8FF" opacity="0.8" />
        <circle cx="24" cy="24" r="7" stroke="rgba(100,200,255,0.4)" strokeWidth="1" />
      </svg>
    ),
    accentColor: "#64C8FF",
  },
  {
    step: "03",
    title: "Discover",
    subtitle: "Your work lives in the Grand Hall — forever",
    description: "Every registered work becomes part of the sovereign archive — discoverable, verifiable, and permanently attributed to its creator. Truth survives through return.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" style={{ width: 40, height: 40 }}>
        <circle cx="24" cy="24" r="20" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" />
        <path d="M24 8 L26.5 18 L37 18 L28.5 24.5 L31 35 L24 28.5 L17 35 L19.5 24.5 L11 18 L21.5 18 Z" stroke="#A78BFA" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(167,139,250,0.12)" />
      </svg>
    ),
    accentColor: "#A78BFA",
  },
];

// ── Particle field ─────────────────────────────────────────────────────────
function ParticleField() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 4,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: "rgba(212,175,55,0.6)",
            animation: `ln-particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Main CinematicSplash ───────────────────────────────────────────────────
interface CinematicSplashProps {
  onComplete: () => void;
}

export default function CinematicSplash({ onComplete }: CinematicSplashProps) {
  ensureSplashKeyframes();

  const [phase, setPhase] = useState<"awakening" | "frequency" | "process" | "dissolve">("awakening");
  const [processStep, setProcessStep] = useState(0);
  const [cardState, setCardState] = useState<"enter" | "exit">("enter");
  const [dissolving, setDissolving] = useState(false);

  const handleSkip = useCallback(() => {
    setDissolving(true);
    setTimeout(() => { markSplashSeen(); onComplete(); }, 700);
  }, [onComplete]);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("frequency"), 1200);
    const t2 = setTimeout(() => setPhase("process"), 3500);
    const t3 = setTimeout(() => { setDissolving(true); }, 8000);
    const t4 = setTimeout(() => { markSplashSeen(); onComplete(); }, 9000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  // Cycle process cards
  useEffect(() => {
    if (phase !== "process") return;
    const CARD_DURATION = 1500;
    const TRANSITION = 350;

    let step = 0;
    const cycle = () => {
      setCardState("exit");
      setTimeout(() => {
        step = (step + 1) % PROCESS_STEPS.length;
        setProcessStep(step);
        setCardState("enter");
      }, TRANSITION);
    };

    const interval = setInterval(cycle, CARD_DURATION);
    return () => clearInterval(interval);
  }, [phase]);

  const currentStep = PROCESS_STEPS[processStep];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--void, #050505)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        animation: dissolving ? "ln-splash-dissolve 0.9s ease forwards" : undefined,
        overflow: "hidden",
      }}
    >
      {/* Particle field */}
      <ParticleField />

      {/* Radial glow behind logo */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          transition: "opacity 1s ease",
          opacity: phase === "awakening" ? 0 : 1,
        }}
      />

      {/* ── Logo block ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          animation: "ln-logo-rise 1.2s cubic-bezier(0.16,1,0.3,1) forwards",
          opacity: 0,
        }}
      >
        {/* LN monogram */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            border: "1.5px solid rgba(212,175,55,0.5)",
            background: "rgba(212,175,55,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: phase !== "awakening" ? "ln-gold-pulse 2.5s ease-in-out infinite" : undefined,
          }}
        >
          <img
            src="/manus-storage/living-nexus-logo-2025_19c2d497.png"
            alt="Living Nexus"
            style={{ width: 52, height: 52, objectFit: "contain" }}
            onError={(e) => {
              // Fallback: render LN text if image fails
              const el = e.currentTarget;
              el.style.display = "none";
              const parent = el.parentElement;
              if (parent) {
                parent.innerHTML = `<span style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#D4AF37;letter-spacing:0.05em">LN</span>`;
              }
            }}
          />
        </div>

        {/* Platform name */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
              fontWeight: 700,
              color: "rgba(240,230,210,0.95)",
              letterSpacing: "0.08em",
              lineHeight: 1,
              animation: "ln-logo-rise 1.4s 0.15s cubic-bezier(0.16,1,0.3,1) forwards",
              opacity: 0,
            }}
          >
            Living Nexus
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.65rem",
              color: "rgba(212,175,55,0.7)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop: 8,
              animation: "ln-tagline-fade 1.2s 0.6s ease forwards",
              opacity: 0,
            }}
          >
            Sovereign Creative Archive
          </div>
        </div>
      </div>

      {/* ── Frequency waveform ── */}
      <div
        style={{
          width: "min(480px, 80vw)",
          marginTop: 32,
          opacity: phase === "awakening" ? 0 : 1,
          transition: "opacity 0.8s ease",
        }}
      >
        <FrequencyCanvas active={phase === "frequency" || phase === "process"} />
      </div>

      {/* ── Process cards ── */}
      <div
        style={{
          marginTop: 32,
          width: "min(480px, 85vw)",
          minHeight: 160,
          opacity: phase === "process" ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        <div
          key={processStep}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${currentStep.accentColor}30`,
            borderRadius: 16,
            padding: "20px 24px",
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
            animation: `${cardState === "enter" ? "ln-card-enter" : "ln-card-exit"} 0.35s ease forwards`,
          }}
        >
          <div style={{ flexShrink: 0, marginTop: 2 }}>{currentStep.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: currentStep.accentColor, opacity: 0.7 }}>{currentStep.step}</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 700, color: "rgba(240,230,210,0.95)", letterSpacing: "0.04em" }}>{currentStep.title}</span>
            </div>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: currentStep.accentColor, letterSpacing: "0.05em", marginBottom: 8 }}>{currentStep.subtitle}</p>
            <p style={{ fontSize: "0.78rem", color: "rgba(180,170,155,0.8)", lineHeight: 1.6 }}>{currentStep.description}</p>
          </div>
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          {PROCESS_STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                width: i === processStep ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === processStep ? s.accentColor : "rgba(255,255,255,0.15)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Skip button ── */}
      <button
        onClick={handleSkip}
        style={{
          position: "absolute",
          bottom: 32,
          right: 32,
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.6rem",
          color: "rgba(255,255,255,0.35)",
          background: "none",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          padding: "6px 14px",
          cursor: "pointer",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          animation: "ln-skip-pulse 3s ease-in-out infinite",
          transition: "color 0.2s, border-color 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(212,175,55,0.8)"; e.currentTarget.style.borderColor = "rgba(212,175,55,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
      >
        Enter →
      </button>

      {/* ── Bottom attribution ── */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 32,
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.55rem",
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        BDDT Publishing LLC · 2026
      </div>
    </div>
  );
}
