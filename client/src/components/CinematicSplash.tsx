/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — CinematicSplash v4 (Manual / Swipeable)
   ─────────────────────────────────────────────────────────────────────────
   Full-screen cinematic entry experience. Plays once per session.

   Phases:
     1. AWAKENING  (0–1.2s)  — void fades in, LN logo materialises
     2. FREQUENCY  (1.2–3s)  — animated waveform pulses beneath logo
     3. PROCESS    (3s+)     — three process cards, MANUAL advance (swipe / arrow / button)
                               No auto-dismiss. User controls the pace.
     4. DISSOLVE             — triggered only by user clicking "Enter the Archive →"

   Gestures supported:
     • Click left/right arrow buttons
     • Swipe left/right (touch or mouse drag)
     • Click the card dots directly
     • Click "Enter the Archive →" at any time to skip in
═══════════════════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useState, useCallback } from "react";

// ── Session guard ──────────────────────────────────────────────────────────
// v4 key — bumped so returning visitors see the redesigned splash once
const SESSION_KEY = "ln_splash_seen_v4";
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
    @keyframes ln-card-enter-right {
      0%   { opacity: 0; transform: translateX(40px) scale(0.96); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes ln-card-enter-left {
      0%   { opacity: 0; transform: translateX(-40px) scale(0.96); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes ln-card-exit-left {
      0%   { opacity: 1; transform: translateX(0) scale(1); }
      100% { opacity: 0; transform: translateX(-40px) scale(0.96); }
    }
    @keyframes ln-card-exit-right {
      0%   { opacity: 1; transform: translateX(0) scale(1); }
      100% { opacity: 0; transform: translateX(40px) scale(0.96); }
    }
    @keyframes ln-splash-dissolve {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes ln-enter-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
      50%       { box-shadow: 0 0 0 8px rgba(212,175,55,0.15); }
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
    @keyframes ln-arrow-bounce-right {
      0%, 100% { transform: translateX(0); }
      50%       { transform: translateX(4px); }
    }
    @keyframes ln-arrow-bounce-left {
      0%, 100% { transform: translateX(0); }
      50%       { transform: translateX(-4px); }
    }
  `;
  document.head.appendChild(style);
}

// ── Motion preference ───────────────────────────────────────────────────────
// The entrance film is purely atmospheric. A reduced-motion preference keeps
// the existing void/glow ceremony while never loading or playing the video.
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
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
    const H = 72;
    canvas.width = W;
    canvas.height = H;

    const BARS = 56;
    const barW = W / BARS;
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
        const raw =
          Math.sin(t * p.freq + p.phase) * 0.5 +
          Math.sin(t * p.freq * 1.7 + p.phase * 0.6) * 0.3 +
          Math.sin(t * 0.4 + (i / BARS) * Math.PI * 4) * 0.2;
        const normalised = (raw + 1) / 2;
        const barH = Math.max(3, normalised * H * 0.85 * p.amp);
        const x = i * barW;
        const y = (H - barH) / 2;

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

      if (active) animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: 72, opacity: active ? 1 : 0.25, transition: "opacity 0.8s ease" }}
    />
  );
}

// ── Process cards ──────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  {
    step: "01",
    title: "Register",
    subtitle: "Your work receives a permanent Witness ID",
    description:
      "Upload your creation. The platform generates a cryptographic fingerprint and issues a WID — a sovereign proof of authorship that cannot be altered or removed. Your work is timestamped and anchored before it touches any other platform.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" style={{ width: 44, height: 44 }}>
        <circle cx="24" cy="24" r="20" stroke="rgba(212,175,55,0.3)" strokeWidth="1.5" />
        <path d="M16 24l6 6 10-12" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="10" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />
      </svg>
    ),
    accentColor: "#D4AF37",
    bgColor: "rgba(212,175,55,0.06)",
  },
  {
    step: "02",
    title: "Witness",
    subtitle: "Others verify and anchor your provenance chain",
    description:
      "Listeners, collaborators, and the community can witness your work — each act of witnessing strengthens the provenance chain and adds a timestamped record to the registry. Truth is confirmed through return.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" style={{ width: 44, height: 44 }}>
        <circle cx="24" cy="24" r="20" stroke="rgba(100,200,255,0.3)" strokeWidth="1.5" />
        <path d="M8 24c0 0 6-10 16-10s16 10 16 10-6 10-16 10S8 24 8 24z" stroke="#64C8FF" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4" fill="#64C8FF" opacity="0.8" />
        <circle cx="24" cy="24" r="7" stroke="rgba(100,200,255,0.4)" strokeWidth="1" />
      </svg>
    ),
    accentColor: "#64C8FF",
    bgColor: "rgba(100,200,255,0.06)",
  },
  {
    step: "03",
    title: "Discover",
    subtitle: "Your work lives in the Grand Hall — forever",
    description:
      "Every registered work becomes part of the sovereign archive — discoverable, verifiable, and permanently attributed to its creator. Music, books, research, visual works, and doctrine — all protected by the same immutable chain.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" style={{ width: 44, height: 44 }}>
        <circle cx="24" cy="24" r="20" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" />
        <path d="M24 8 L26.5 18 L37 18 L28.5 24.5 L31 35 L24 28.5 L17 35 L19.5 24.5 L11 18 L21.5 18 Z"
          stroke="#A78BFA" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(167,139,250,0.12)" />
      </svg>
    ),
    accentColor: "#A78BFA",
    bgColor: "rgba(167,139,250,0.06)",
  },
];

// ── Particle field ─────────────────────────────────────────────────────────
function ParticleField() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 1.5,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 4,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2 }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: "rgba(212,175,55,0.5)",
          animation: `ln-particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Arrow button ───────────────────────────────────────────────────────────
function ArrowBtn({
  dir, onClick, disabled,
}: { dir: "left" | "right"; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "right" ? "Next" : "Previous"}
      className="ln-cinematic-splash__process-arrow"
      style={{
        width: 44, height: 44, borderRadius: "50%",
        border: `1px solid ${disabled ? "rgba(255,255,255,0.08)" : "rgba(212,175,55,0.35)"}`,
        background: disabled ? "rgba(255,255,255,0.03)" : "rgba(212,175,55,0.08)",
        color: disabled ? "rgba(255,255,255,0.2)" : "rgba(212,175,55,0.9)",
        cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.2s ease",
        animation: disabled ? undefined : `ln-arrow-bounce-${dir} 1.8s ease-in-out infinite`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "rgba(212,175,55,0.15)";
          e.currentTarget.style.borderColor = "rgba(212,175,55,0.6)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = "rgba(212,175,55,0.08)";
          e.currentTarget.style.borderColor = "rgba(212,175,55,0.35)";
        }
      }}
    >
      {dir === "left" ? (
        <svg viewBox="0 0 20 20" fill="none" style={{ width: 18, height: 18 }}>
          <path d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" style={{ width: 18, height: 18 }}>
          <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ── Splash audio ─────────────────────────────────────────────────────────────
const SPLASH_AUDIO_SRC = "/manus-storage/VaultofGold_68340573.mp3";
const SPLASH_AUDIO_POSITION_KEY = "ln_splash_audio_position_v1";
const SPLASH_AUDIO_VOLUME_KEY = "ln_splash_audio_volume_v1";
const SPLASH_AUDIO_MUTED_KEY = "ln_splash_audio_muted_v1";

function SplashAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedSecondRef = useRef(-1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const storedPosition = Number.parseFloat(localStorage.getItem(SPLASH_AUDIO_POSITION_KEY) ?? "");
    const storedVolume = Number.parseFloat(localStorage.getItem(SPLASH_AUDIO_VOLUME_KEY) ?? "");
    const storedMuted = localStorage.getItem(SPLASH_AUDIO_MUTED_KEY);
    const initialVolume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(0, storedVolume)) : 0.4;
    const initialMuted = storedMuted === "true";
    audio.volume = initialVolume;
    audio.muted = initialMuted;
    setVolume(initialVolume);
    setMuted(initialMuted);
    if (Number.isFinite(storedPosition) && storedPosition >= 0) {
      audio.currentTime = storedPosition;
    }

    const persistPosition = () => {
      const second = Math.floor(audio.currentTime);
      if (second !== lastSavedSecondRef.current) {
        lastSavedSecondRef.current = second;
        localStorage.setItem(SPLASH_AUDIO_POSITION_KEY, String(audio.currentTime));
      }
    };

    const attemptPlayback = async () => {
      try {
        await audio.play();
      } catch {
        // Browsers may block audible autoplay. Keep the requested loop alive muted.
        audio.muted = true;
        setMuted(true);
        localStorage.setItem(SPLASH_AUDIO_MUTED_KEY, "true");
        try { await audio.play(); } catch { /* User gesture required; control remains available. */ }
      }
    };

    audio.addEventListener("timeupdate", persistPosition);
    void attemptPlayback();
    return () => {
      persistPosition();
      audio.pause();
      audio.removeEventListener("timeupdate", persistPosition);
    };
  }, []);

  const toggleMuted = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
    localStorage.setItem(SPLASH_AUDIO_MUTED_KEY, String(nextMuted));
    if (!nextMuted) void audio.play().catch(() => undefined);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(event.target.value);
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = nextVolume;
    setVolume(nextVolume);
    localStorage.setItem(SPLASH_AUDIO_VOLUME_KEY, String(nextVolume));
  };

  return (
    <div className="ln-cinematic-splash__audio" role="group" aria-label="Entrance audio controls">
      <audio ref={audioRef} src={SPLASH_AUDIO_SRC} loop preload="auto" />
      <button type="button" onClick={toggleMuted} className="ln-cinematic-splash__audio-toggle" aria-pressed={muted}>
        {muted ? "Unmute" : "Mute"}
      </button>
      <label className="ln-cinematic-splash__audio-volume">
        <span>Volume</span>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} aria-label="Entrance volume" />
      </label>
    </div>
  );
}

// ── Main CinematicSplash ───────────────────────────────────────────────────
interface CinematicSplashProps {
  onComplete: () => void;
}

export default function CinematicSplash({ onComplete }: CinematicSplashProps) {
  ensureSplashKeyframes();

  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"awakening" | "frequency" | "vault" | "process">("awakening");
  const [step, setStep] = useState(0);
  const [cardAnim, setCardAnim] = useState<"enter-right" | "enter-left" | "exit-left" | "exit-right" | "idle">("enter-right");
  const [dissolving, setDissolving] = useState(false);
  const [allSeen, setAllSeen] = useState(false);

  // Swipe tracking
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  // Phase timeline — reveal the vault, then wait for the visitor to open the process.
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("frequency"), 1200);
    const t2 = setTimeout(() => setPhase("vault"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Track if user has seen all cards
  useEffect(() => {
    if (step === PROCESS_STEPS.length - 1) setAllSeen(true);
  }, [step]);

  const handleEnter = useCallback(() => {
    setDissolving(true);
    setTimeout(() => { markSplashSeen(); onComplete(); }, 900);
  }, [onComplete]);

  // Returning visitors can bypass the ceremony immediately. Marking the session
  // prevents the splash from reappearing during the rest of this visit.
  const handleSkip = useCallback(() => {
    markSplashSeen();
    onComplete();
  }, [onComplete]);

  const openProcess = useCallback(() => {
    setPhase("process");
    setCardAnim("enter-right");
  }, []);

  const goTo = useCallback((nextStep: number, direction: "left" | "right") => {
    if (nextStep < 0 || nextStep >= PROCESS_STEPS.length) return;
    // Exit current card in the direction of travel
    setCardAnim(direction === "right" ? "exit-left" : "exit-right");
    setTimeout(() => {
      setStep(nextStep);
      setCardAnim(direction === "right" ? "enter-right" : "enter-left");
    }, 280);
  }, []);

  const goNext = useCallback(() => goTo(step + 1, "right"), [step, goTo]);
  const goPrev = useCallback(() => goTo(step - 1, "left"), [step, goTo]);

  // Swipe handlers
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    isDragging.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 8) isDragging.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (!isDragging.current) return;
    isDragging.current = false;
    if (delta < -40) goNext();
    else if (delta > 40) goPrev();
  };

  // Keyboard navigation and deliberate vault advance.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === "vault" && e.key === "ArrowRight") {
        openProcess();
      } else if (phase === "process" && e.key === "ArrowRight") {
        goNext();
      } else if (phase === "process" && e.key === "ArrowLeft") {
        goPrev();
      } else if ((phase === "vault" || phase === "process") && (e.key === "Enter" || e.key === "Escape")) {
        handleEnter();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, goNext, goPrev, handleEnter, openProcess]);

  const currentStep = PROCESS_STEPS[step];

  const cardAnimStyle: React.CSSProperties = (() => {
    switch (cardAnim) {
      case "enter-right": return { animation: "ln-card-enter-right 0.32s cubic-bezier(0.16,1,0.3,1) forwards" };
      case "enter-left":  return { animation: "ln-card-enter-left 0.32s cubic-bezier(0.16,1,0.3,1) forwards" };
      case "exit-left":   return { animation: "ln-card-exit-left 0.28s ease forwards" };
      case "exit-right":  return { animation: "ln-card-exit-right 0.28s ease forwards" };
      default: return {};
    }
  })();

  return (
    <div
      className="ln-cinematic-splash"
      data-phase={phase}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--ln-void, var(--void, #050505))",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "var(--ln-splash-justify, center)",
        boxSizing: "border-box", minHeight: "100dvh", height: "100dvh",
        padding: "var(--ln-splash-padding, 24px)",
        animation: dissolving ? "ln-splash-dissolve 0.9s ease forwards" : undefined,
        overflowX: "hidden", overflowY: "auto",
        userSelect: "none",
        isolation: "isolate",
      }}
    >
      {!prefersReducedMotion && (
        <video
          aria-hidden="true"
          autoPlay
          className="ln-cinematic-splash__vault-film"
          disablePictureInPicture
          loop
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
        >
          <source src="/manus-storage/dark-gold-vault_1238ee74.mp4" type="video/mp4" />
        </video>
      )}

      <div
        aria-hidden="true"
        className="ln-cinematic-splash__vault-veil"
      />

      {!prefersReducedMotion && <ParticleField />}

      <SplashAudio />

      <button
        type="button"
        className="ln-cinematic-splash__skip"
        onClick={handleSkip}
        aria-label="Skip cinematic introduction and enter the archive"
      >
        Skip Intro
      </button>

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
        transition: "opacity 1s ease",
        opacity: phase === "awakening" ? 0 : 1,
        zIndex: 2,
      }} />

      {/* ── Logo block ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--ln-splash-logo-gap, 16px)",
        animation: prefersReducedMotion ? undefined : "ln-logo-rise 1.2s cubic-bezier(0.16,1,0.3,1) forwards",
        opacity: prefersReducedMotion ? 1 : 0,
        position: "relative", zIndex: 3,
      }}>
        <div style={{
          width: "var(--ln-splash-seal-size, 80px)", height: "var(--ln-splash-seal-size, 80px)", borderRadius: 20,
          border: "1.5px solid rgba(212,175,55,0.5)",
          background: "rgba(212,175,55,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: !prefersReducedMotion && phase !== "awakening" ? "ln-gold-pulse 2.5s ease-in-out infinite" : undefined,
        }}>
          <img
            src="/manus-storage/living-nexus-logo-2025_19c2d497.png"
            alt="Living Nexus"
            style={{ width: "var(--ln-splash-mark-size, 52px)", height: "var(--ln-splash-mark-size, 52px)", objectFit: "contain" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) parent.innerHTML = `<span style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:#D4AF37;letter-spacing:0.05em">LN</span>`;
            }}
          />
        </div>
        <div className="ln-cinematic-splash__logo-copy" style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-editorial)",
            fontSize: "clamp(2.15rem, 4.8vw, 3.5rem)",
            fontWeight: 700, color: "rgba(240,230,210,0.95)",
            letterSpacing: "0.06em", lineHeight: 0.96,
            animation: prefersReducedMotion ? undefined : "ln-logo-rise 1.4s 0.15s cubic-bezier(0.16,1,0.3,1) forwards",
            opacity: prefersReducedMotion ? 1 : 0,
          }}>Living Nexus</div>
          <div style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.625rem, 0.58rem + 0.25vw, 0.78rem)", color: "var(--ln-gold, var(--gold))",
            letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 10,
            animation: prefersReducedMotion ? undefined : "ln-tagline-fade 1.2s 0.6s ease forwards",
            opacity: prefersReducedMotion ? 1 : 0,
          }}>Sovereign Creative Archive</div>
        </div>
      </div>

      {/* ── Frequency waveform ── */}
      <div style={{
        width: "min(620px, 86vw)", marginTop: "var(--ln-splash-wave-gap, 28px)",
        opacity: phase === "awakening" ? 0 : 1,
        transition: "opacity 0.8s ease",
        position: "relative", zIndex: 3,
      }}>
        <FrequencyCanvas active={!prefersReducedMotion && phase !== "awakening"} />
      </div>

      {phase === "vault" && (
        <div className="ln-cinematic-splash__vault-actions">
          <button
            type="button"
            className="ln-cinematic-splash__process-entry"
            onClick={openProcess}
          >
            Explore the process
          </button>
          <p>Arrow right to continue · Enter to enter the archive</p>
        </div>
      )}

      {/* ── Process cards section ── */}
      {phase === "process" && <div className="ln-cinematic-splash__process-stage" style={{
        marginTop: "var(--ln-splash-process-gap, 24px)", width: "min(620px, 92vw)",
        opacity: 1,
        transition: "opacity 0.6s ease",
        pointerEvents: "auto",
        position: "relative", zIndex: 3,
      }}>
        {/* Navigation row: prev arrow + card + next arrow */}
        <div className="ln-cinematic-splash__process-nav" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ArrowBtn dir="left" onClick={goPrev} disabled={step === 0} />

          {/* Swipeable card */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{ flex: 1, cursor: "grab", touchAction: "pan-y" }}
          >
            <div
              key={step}
              className="ln-cinematic-splash__process-card"
              style={{
                background: `color-mix(in srgb, var(--ln-panel, var(--ln-void)) 88%, ${currentStep.accentColor})`,
                border: `1px solid ${currentStep.accentColor}35`,
                borderRadius: 18,
                padding: "var(--ln-splash-card-padding, 24px 22px)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                minHeight: "var(--ln-splash-card-min-height, 220px)",
                ...cardAnimStyle,
              }}
            >
              {/* Card header */}
              <div className="ln-cinematic-splash__card-header" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="ln-cinematic-splash__card-icon" style={{
                  flexShrink: 0, width: 60, height: 60, borderRadius: 14,
                  background: `${currentStep.accentColor}12`,
                  border: `1px solid ${currentStep.accentColor}25`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {currentStep.icon}
                </div>
                <div className="ln-cinematic-splash__card-copy" style={{ flex: 1, minWidth: 0 }}>
                  <div className="ln-cinematic-splash__card-title-row" style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <span className="ln-cinematic-splash__card-step" style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.64rem, 0.6rem + 0.15vw, 0.76rem)", color: currentStep.accentColor, opacity: 0.82 }}>
                      {currentStep.step}
                    </span>
                    <span className="ln-cinematic-splash__card-title" style={{ fontFamily: "var(--font-editorial)", fontSize: "clamp(1.6rem, 2.2vw, 2.15rem)", fontWeight: 700, color: "var(--ln-parchment, var(--foreground))", letterSpacing: "0.035em", lineHeight: 0.98 }}>
                      {currentStep.title}
                    </span>
                  </div>
                  <p className="ln-cinematic-splash__card-subtitle" style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem, 0.62rem + 0.2vw, 0.84rem)", color: currentStep.accentColor, letterSpacing: "0.04em", lineHeight: 1.35 }}>
                    {currentStep.subtitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="ln-cinematic-splash__card-description" style={{
                fontSize: "clamp(0.94rem, 0.88rem + 0.18vw, 1.06rem)", color: "var(--ln-bone, var(--foreground))",
                lineHeight: 1.62, margin: 0,
              }}>
                {currentStep.description}
              </p>
            </div>
          </div>

          <ArrowBtn dir="right" onClick={goNext} disabled={step === PROCESS_STEPS.length - 1} />
        </div>

        {/* Step dots — clickable */}
        <div className="ln-cinematic-splash__process-dots" style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 18 }}>
          {PROCESS_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > step ? "right" : "left")}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
              style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i === step ? s.accentColor : "rgba(255,255,255,0.15)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Swipe hint */}
        <p className="ln-cinematic-splash__process-hint" style={{
          textAlign: "center", marginTop: 10,
          fontFamily: "var(--font-body)", fontSize: "clamp(0.6rem, 0.55rem + 0.12vw, 0.72rem)",
          color: "var(--ln-smoke, var(--muted-foreground))", letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Swipe or use arrows to navigate
        </p>
      </div>}

      {/* ── Enter button — always visible once process phase starts ── */}
      {phase === "process" && <div style={{
        marginTop: "var(--ln-splash-enter-gap, 28px)",
        opacity: 1,
        transition: "opacity 0.6s 0.3s ease",
        pointerEvents: "auto",
        position: "relative", zIndex: 3,
      }}>
        <button
          onClick={handleEnter}
          className="ln-cinematic-splash__archive-entry"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.72rem, 0.66rem + 0.16vw, 0.86rem)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: allSeen ? "#0a0a0a" : "rgba(212,175,55,0.9)",
            background: allSeen
              ? "linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)"
              : "rgba(212,175,55,0.08)",
            border: `1px solid ${allSeen ? "#D4AF37" : "rgba(212,175,55,0.4)"}`,
            borderRadius: 10,
            padding: "12px 32px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            animation: allSeen ? "ln-enter-pulse 2s ease-in-out infinite" : undefined,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)";
            e.currentTarget.style.color = "#0a0a0a";
            e.currentTarget.style.borderColor = "#D4AF37";
          }}
          onMouseLeave={(e) => {
            if (!allSeen) {
              e.currentTarget.style.background = "rgba(212,175,55,0.08)";
              e.currentTarget.style.color = "rgba(212,175,55,0.9)";
              e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)";
            } else {
              e.currentTarget.style.background = "linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)";
              e.currentTarget.style.color = "#0a0a0a";
            }
          }}
        >
          Enter the Archive →
        </button>
      </div>}

      {/* ── Bottom attribution ── */}
      <div className="ln-cinematic-splash__attribution" style={{
        position: "absolute", bottom: "var(--ln-splash-footer-bottom, 24px)", left: 28,
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.5rem", color: "rgba(255,255,255,0.18)",
        letterSpacing: "0.08em", textTransform: "uppercase",
        zIndex: 3,
      }}>
        BDDT Publishing LLC · 2026
      </div>
    </div>
  );
}
