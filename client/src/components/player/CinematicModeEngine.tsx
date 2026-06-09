/**
 * CinematicModeEngine — Phase 195 (v2 — Full-Screen Art)
 * ─────────────────────────────────────────────────────────────────────────────
 * Five playback experiences. ALL modes fill the screen edge-to-edge with the
 * artwork. Mode-specific overlays (metadata, waveform, shelf, cosmos) are
 * layered on top of the full-bleed art, never replacing it.
 *
 * Modes:
 *   living-canvas    — artwork fills screen, particles + pulse overlay
 *   archive-artifact — museum overlay: WID, provenance grid, corner accents
 *   retro-signal     — CRT waveform + spectrum bars over full-screen art
 *   shelf-playback   — queue strip at bottom, art fills top 70%
 *   cosmos           — starfield + orbit rings over full-screen art
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track } from "@/contexts/PlayerContext";
import {
  ChevronDown,
  Shield,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Layers,
} from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CinematicMode =
  | "living-canvas"
  | "archive-artifact"
  | "retro-signal"
  | "shelf-playback"
  | "cosmos";

const MODE_LABELS: Record<CinematicMode, string> = {
  "living-canvas": "Living Canvas",
  "archive-artifact": "Archive Artifact",
  "retro-signal": "Retro Signal",
  "shelf-playback": "Shelf Playback",
  cosmos: "Cosmos",
};

const MODE_ORDER: CinematicMode[] = [
  "living-canvas",
  "archive-artifact",
  "retro-signal",
  "shelf-playback",
  "cosmos",
];

const STORAGE_KEY = "ln-cinematic-mode";

interface CinematicModeEngineProps {
  track: Track;
  queue: Track[];
  currentIdx: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number; // 0–100
  onClose: () => void;
  onPlayIdx: (idx: number) => void;
  onTogglePlay: () => void;
  onSeek: (pct: number) => void;
  onNext: () => void;
  onPrev: () => void;
  /** Optional: audio analyser node for waveform/spectrum (Retro Signal) */
  analyserNode?: AnalyserNode | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function aiLabel(v?: string): string {
  if (v === "ai_generated") return "AI Generated";
  if (v === "ai_assisted") return "AI Assisted";
  return "Original Work";
}

function contentTypeLabel(ct?: string): string {
  const map: Record<string, string> = {
    audio: "Audio",
    lyrics: "Lyrics",
    manuscript: "Manuscript",
    comic: "Comic",
    guide: "Guide",
  };
  return ct ? (map[ct] ?? ct) : "Manifestation";
}

// ─── Full-Screen Art Base ─────────────────────────────────────────────────────
// All modes share this: artwork fills 100% of the container, blurred copy as bg.

function ArtBase({ track }: { track: Track }) {
  return (
    <>
      {/* Blurred background fill */}
      {track.artUrl ? (
        <img
          src={track.artUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(32px) brightness(0.35) saturate(1.6)", transform: "scale(1.08)" }}
          aria-hidden
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: track.bg || "linear-gradient(135deg, #0A0C0E 0%, #1A1F23 100%)" }}
        />
      )}
      {/* Sharp full-bleed art — centered, cover */}
      {track.artUrl ? (
        <img
          src={track.artUrl}
          alt={track.title}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ zIndex: 1 }}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-[96px] z-[1]"
          style={{ textShadow: "0 8px 40px rgba(0,0,0,0.8)" }}
        >
          {track.emoji || "◈"}
        </div>
      )}
      {/* Bottom gradient — controls legibility */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-[2]"
        style={{ height: "52%", background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}
      />
      {/* Top gradient — chrome legibility */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-[2]"
        style={{ height: "20%", background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)" }}
      />
    </>
  );
}

// ─── Shared Controls Bar ──────────────────────────────────────────────────────

function ControlsBar({
  track,
  isPlaying,
  currentTime,
  duration,
  progress,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
}: {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  onTogglePlay: () => void;
  onSeek: (pct: number) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const handleSeekClick = (e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, pct)));
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full px-6">
      {/* Track identity */}
      <div className="text-center">
        <div
          className="text-xl font-bold leading-tight"
          style={{ fontFamily: "'Cinzel', serif", color: "rgba(245,237,216,0.97)" }}
        >
          {track.title}
        </div>
        <div className="text-sm mt-0.5" style={{ color: "rgba(196,154,40,0.8)" }}>
          {track.artist}
        </div>
      </div>
      {/* Progress */}
      <div className="w-full flex items-center gap-3">
        <span className="text-[11px] tabular-nums w-8 text-right" style={{ color: "rgba(196,154,40,0.6)" }}>
          {fmtTime(currentTime)}
        </span>
        <div
          ref={barRef}
          className="flex-1 h-1 rounded-full cursor-pointer relative"
          style={{ background: "rgba(255,255,255,0.12)" }}
          onClick={handleSeekClick}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #C49A28 0%, #E8DFC8 100%)",
              boxShadow: progress > 2 ? "0 0 8px 1px rgba(196,154,40,0.4)" : "none",
            }}
          />
        </div>
        <span className="text-[11px] tabular-nums w-8" style={{ color: "rgba(196,154,40,0.6)" }}>
          {fmtTime(duration)}
        </span>
      </div>
      {/* Playback buttons */}
      <div className="flex items-center gap-8">
        <button
          onClick={onPrev}
          className="p-2 transition-opacity hover:opacity-80 active:scale-90"
          style={{ color: "rgba(245,237,216,0.9)" }}
        >
          <SkipBack size={22} />
        </button>
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
          style={{
            width: 56,
            height: 56,
            background: "rgba(196,154,40,0.18)",
            border: "1.5px solid rgba(196,154,40,0.6)",
            color: "var(--ln-gold)",
            boxShadow: isPlaying ? "0 0 24px rgba(196,154,40,0.35)" : "none",
          }}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={onNext}
          className="p-2 transition-opacity hover:opacity-80 active:scale-90"
          style={{ color: "rgba(245,237,216,0.9)" }}
        >
          <SkipForward size={22} />
        </button>
      </div>
    </div>
  );
}

// ─── Mode Selector ────────────────────────────────────────────────────────────

function ModeSelector({
  current,
  onChange,
}: {
  current: CinematicMode;
  onChange: (m: CinematicMode) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all"
        style={{
          background: "rgba(0,0,0,0.6)",
          border: "1px solid rgba(196,154,40,0.4)",
          color: "var(--ln-gold)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Layers size={10} />
        {MODE_LABELS[current]}
      </button>
      {open && (
        <div
          className="absolute top-full mt-1 right-0 z-50 rounded-xl overflow-hidden"
          style={{
            background: "rgba(10,12,14,0.95)",
            border: "1px solid rgba(196,154,40,0.25)",
            backdropFilter: "blur(16px)",
            minWidth: 160,
          }}
        >
          {MODE_ORDER.map((m) => (
            <button
              key={m}
              onClick={() => { onChange(m); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-[11px] font-medium transition-colors hover:bg-white/5"
              style={{
                color: m === current ? "var(--ln-gold)" : "rgba(232,223,200,0.7)",
                borderBottom: "1px solid rgba(196,154,40,0.08)",
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mode: Living Canvas ──────────────────────────────────────────────────────
// Full-screen art + particle overlay + controls at bottom.

function LivingCanvas({
  track,
  isPlaying,
  currentTime,
  duration,
  progress,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
}: Omit<CinematicModeEngineProps, "onClose" | "onPlayIdx" | "queue" | "currentIdx">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; size: number; hue: number }>>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const spawn = () => {
      if (particlesRef.current.length < 80) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(Math.random() * 0.6 + 0.3),
          life: 1,
          size: Math.random() * 3 + 1,
          hue: 35 + Math.random() * 30,
        });
      }
    };
    const id = setInterval(spawn, isPlaying ? 120 : 400);
    return () => clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      timeRef.current += isPlaying ? 0.008 : 0.002;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Slow parallax vignette pulse
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.2);
      const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, h * 0.8);
      grad.addColorStop(0, `rgba(196,154,40,${0.04 + 0.03 * pulse})`);
      grad.addColorStop(0.5, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${0.3 + 0.1 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Particles
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0.01);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.004;
        ctx.save();
        ctx.globalAlpha = p.life * 0.7;
        ctx.fillStyle = `hsl(${p.hue}, 70%, 65%)`;
        ctx.shadowColor = `hsl(${p.hue}, 80%, 60%)`;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [isPlaying]);

  return (
    <div className="absolute inset-0">
      <ArtBase track={track} />
      {/* Particle canvas overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[3]" />
      {/* WID badge */}
      {track.witnessId && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[4]">
          <Link
            href={`/verify/${track.witnessId}`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(74,222,128,0.4)",
              color: "var(--ln-seal-bright)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Shield size={8} />
            WID: {track.witnessId.slice(0, 20)}…
          </Link>
        </div>
      )}
      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 pb-10 z-[4] flex flex-col items-center gap-6">
        <ControlsBar
          track={track}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>
    </div>
  );
}

// ─── Mode: Archive Artifact ───────────────────────────────────────────────────
// Full-screen art + museum overlay (grid lines, corner accents, provenance strip).

function ArchiveArtifact({
  track,
  isPlaying,
  currentTime,
  duration,
  progress,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
}: Omit<CinematicModeEngineProps, "onClose" | "onPlayIdx" | "queue" | "currentIdx">) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, [track.id]);

  return (
    <div className="absolute inset-0">
      <ArtBase track={track} />

      {/* Subtle grid lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[3]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(196,154,40,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(196,154,40,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Corner accent marks — top-left and top-right */}
      {[
        { top: "16px", left: "16px", borderTop: "2px solid var(--ln-gold)", borderLeft: "2px solid var(--ln-gold)" },
        { top: "16px", right: "16px", borderTop: "2px solid var(--ln-gold)", borderRight: "2px solid var(--ln-gold)" },
        { bottom: "16px", left: "16px", borderBottom: "2px solid var(--ln-gold)", borderLeft: "2px solid var(--ln-gold)" },
        { bottom: "16px", right: "16px", borderBottom: "2px solid var(--ln-gold)", borderRight: "2px solid var(--ln-gold)" },
      ].map((style, i) => (
        <div
          key={i}
          className="absolute pointer-events-none z-[4]"
          style={{ ...style, width: 28, height: 28 }}
        />
      ))}

      {/* Artifact label — top center */}
      <div
        className="absolute top-16 inset-x-0 flex justify-center z-[4]"
        style={{
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        <div
          className="text-[9px] font-mono tracking-[0.3em] uppercase px-3 py-1 rounded-full"
          style={{
            color: "rgba(196,154,40,0.8)",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(196,154,40,0.2)",
          }}
        >
          Living Nexus Archive — {contentTypeLabel(track.contentType)}
        </div>
      </div>

      {/* Provenance strip — bottom overlay above controls */}
      <div
        className="absolute inset-x-0 z-[4] px-6"
        style={{
          bottom: "200px",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
        }}
      >
        {/* Metadata grid */}
        <div
          className="grid grid-cols-4 gap-3 text-[10px] mb-3 py-3 px-4 rounded-xl"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(196,154,40,0.15)",
            backdropFilter: "blur(12px)",
          }}
        >
          {[
            ["Type", contentTypeLabel(track.contentType)],
            ["Origin", aiLabel(track.aiDisclosure)],
            ["Plays", track.plays?.toLocaleString() ?? "—"],
            ["Genre", track.genre || "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span style={{ color: "rgba(196,154,40,0.5)", fontFamily: "monospace" }}>{label}</span>
              <span style={{ color: "var(--ln-parchment)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* WID provenance row */}
        {track.witnessId && (
          <Link
            href={`/verify/${track.witnessId}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Shield size={10} style={{ color: "var(--ln-seal-bright)" }} />
            <div className="flex flex-col">
              <span className="text-[8px] font-mono" style={{ color: "rgba(74,222,128,0.6)" }}>WITNESS ID</span>
              <span className="text-[10px] font-mono" style={{ color: "var(--ln-seal-bright)" }}>{track.witnessId}</span>
            </div>
          </Link>
        )}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 pb-10 z-[4] flex flex-col items-center gap-4">
        <ControlsBar
          track={track}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>
    </div>
  );
}

// ─── Mode: Retro Signal ───────────────────────────────────────────────────────
// Full-screen art + CRT canvas overlay (scanlines, spectrum, waveform).

function RetroSignal({
  track,
  isPlaying,
  currentTime,
  duration,
  progress,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  analyserNode,
}: Omit<CinematicModeEngineProps, "onClose" | "onPlayIdx" | "queue" | "currentIdx">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Semi-transparent dark CRT tint (art shows through)
      ctx.fillStyle = "rgba(0, 8, 4, 0.55)";
      ctx.fillRect(0, 0, w, h);

      // Scanlines
      for (let y = 0; y < h; y += 4) {
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(0, y, w, 1);
      }

      // CRT vignette
      const vign = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
      vign.addColorStop(0, "rgba(0,0,0,0)");
      vign.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vign;
      ctx.fillRect(0, 0, w, h);

      // Frequency data
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.floor(80 + 100 * Math.abs(Math.sin(t * 3 + i * 0.3)) * Math.random())
            : Math.floor(10 + 20 * Math.abs(Math.sin(t + i * 0.2)));
        }
      }

      // Spectrum bars — bottom third of screen
      const barW = (w * 0.8) / bufferLength;
      const startX = w * 0.1;
      const barAreaH = h * 0.28;
      const barY = h * 0.62;

      for (let i = 0; i < bufferLength; i++) {
        const barH = (dataArray[i] / 255) * barAreaH;
        const hue = 120 + i * 0.8;
        const alpha = 0.6 + 0.3 * (dataArray[i] / 255);
        ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${alpha})`;
        ctx.shadowColor = `hsl(${hue}, 90%, 60%)`;
        ctx.shadowBlur = 4;
        ctx.fillRect(startX + i * barW, barY - barH, barW - 1, barH);
      }
      ctx.shadowBlur = 0;

      // Waveform line — mid screen
      if (analyserNode) {
        analyserNode.getByteTimeDomainData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 128 + (isPlaying ? 40 * Math.sin(t * 8 + i * 0.15) : 5 * Math.sin(t + i * 0.1));
        }
      }
      ctx.beginPath();
      ctx.strokeStyle = "rgba(74,222,128,0.85)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(74,222,128,0.6)";
      ctx.shadowBlur = 6;
      const sliceW = (w * 0.8) / bufferLength;
      let x = w * 0.1;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128;
        const y = (v * h * 0.1) + h * 0.32;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Static noise
      const noiseAlpha = 0.025 + 0.01 * Math.sin(t * 20);
      ctx.fillStyle = `rgba(255,255,255,${noiseAlpha})`;
      for (let i = 0; i < 200; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      // Rare glitch line
      if (Math.random() < 0.015) {
        const gy = Math.random() * h;
        ctx.fillStyle = "rgba(74,222,128,0.12)";
        ctx.fillRect(0, gy, w, 1);
      }

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [isPlaying, analyserNode]);

  return (
    <div className="absolute inset-0">
      <ArtBase track={track} />
      {/* CRT canvas overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[3]" />

      {/* Signal header */}
      <div className="absolute top-16 inset-x-0 flex flex-col items-center gap-1 z-[4]">
        <div
          className="text-[8px] font-mono tracking-[0.4em] uppercase px-3 py-1 rounded-full"
          style={{
            color: "rgba(74,222,128,0.8)",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
          }}
        >
          ◈ SIGNAL ACQUIRED ◈
        </div>
        {track.witnessId && (
          <Link
            href={`/verify/${track.witnessId}`}
            className="mt-0.5 text-[8px] font-mono transition-opacity hover:opacity-80"
            style={{ color: "rgba(74,222,128,0.5)" }}
          >
            WID:{track.witnessId.slice(0, 24)}
          </Link>
        )}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 pb-8 z-[4] flex flex-col items-center gap-4">
        <ControlsBar
          track={track}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>
    </div>
  );
}

// ─── Mode: Shelf Playback ─────────────────────────────────────────────────────
// Current track art fills top 65% of screen. Queue strip sits in the lower third.

function ShelfPlayback({
  track,
  queue,
  currentIdx,
  isPlaying,
  currentTime,
  duration,
  progress,
  onPlayIdx,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
}: Omit<CinematicModeEngineProps, "onClose">) {
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  const start = Math.max(0, currentIdx - half);
  const end = Math.min(queue.length - 1, start + windowSize - 1);
  const visible = queue.slice(start, end + 1);
  const relIdx = currentIdx - start;

  return (
    <div className="absolute inset-0">
      <ArtBase track={track} />

      {/* Shelf label — top */}
      <div className="absolute top-16 inset-x-0 flex flex-col items-center z-[4]">
        <div
          className="text-[8px] font-mono tracking-[0.3em] uppercase px-3 py-1 rounded-full"
          style={{
            color: "rgba(196,154,40,0.7)",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(196,154,40,0.2)",
          }}
        >
          Creator Domain — Shelf
        </div>
        {track.creatorHandle && (
          <div className="text-sm mt-1" style={{ color: "rgba(196,154,40,0.6)" }}>
            {track.creatorHandle}
          </div>
        )}
      </div>

      {/* Queue strip — lower third */}
      <div
        className="absolute inset-x-0 z-[4] flex items-end justify-center gap-3 px-4"
        style={{ bottom: "200px" }}
      >
        {/* Shelf wood grain bar */}
        <div className="absolute inset-x-4 bottom-0 h-2 rounded-sm"
          style={{ background: "linear-gradient(180deg, rgba(139,90,43,0.6) 0%, rgba(101,65,30,0.8) 100%)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
        />
        {visible.map((t, i) => {
          const isCurrent = i === relIdx;
          const dist = Math.abs(i - relIdx);
          const scale = isCurrent ? 1 : 1 - dist * 0.12;
          const opacity = isCurrent ? 1 : 1 - dist * 0.25;
          const translateY = isCurrent ? -16 : dist * 4;

          return (
            <button
              key={t.id}
              onClick={() => onPlayIdx(start + i)}
              className="flex flex-col items-center gap-1.5 transition-all duration-300 focus:outline-none"
              style={{ transform: `scale(${scale}) translateY(${translateY}px)`, opacity }}
            >
              <div
                className="relative overflow-hidden"
                style={{
                  width: isCurrent ? 80 : 56,
                  height: isCurrent ? 80 : 56,
                  border: isCurrent ? "2px solid rgba(196,154,40,0.7)" : "1px solid rgba(196,154,40,0.2)",
                  boxShadow: isCurrent ? "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(196,154,40,0.2)" : "0 4px 12px rgba(0,0,0,0.4)",
                  transition: "width 0.3s, height 0.3s",
                  borderRadius: 4,
                }}
              >
                {t.artUrl ? (
                  <img src={t.artUrl} alt={t.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(20,15,8,0.9)", fontSize: isCurrent ? 24 : 16 }}>
                    {t.emoji || "◈"}
                  </div>
                )}
                {isCurrent && isPlaying && (
                  <div className="absolute bottom-1 right-1 flex gap-0.5 items-end" style={{ height: 10 }}>
                    {[0, 1, 2].map((b) => (
                      <div key={b} className="w-1 rounded-sm"
                        style={{ background: "var(--ln-gold)", height: `${40 + 60 * Math.random()}%`, animation: `shelf-eq ${0.4 + b * 0.15}s ease-in-out infinite alternate` }}
                      />
                    ))}
                  </div>
                )}
              </div>
              {isCurrent && (
                <div className="text-center max-w-[80px]">
                  <div className="text-[10px] font-semibold truncate" style={{ color: "var(--ln-parchment)" }}>{t.title}</div>
                  {t.witnessId && <div className="text-[8px] font-mono mt-0.5" style={{ color: "rgba(74,222,128,0.6)" }}>WID ◈</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 pb-8 z-[4] flex flex-col items-center gap-4">
        <ControlsBar
          track={track}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>

      <style>{`
        @keyframes shelf-eq {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Mode: Cosmos ─────────────────────────────────────────────────────────────
// Full-screen art + starfield + orbit rings canvas overlay.

function CosmosPlayback({
  track,
  queue,
  currentIdx,
  isPlaying,
  currentTime,
  duration,
  progress,
  onPlayIdx,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
}: Omit<CinematicModeEngineProps, "onClose">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const orbitTracks = [
    ...queue.slice(Math.max(0, currentIdx - 3), currentIdx),
    ...queue.slice(currentIdx + 1, currentIdx + 4),
  ].slice(0, 6);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      timeRef.current += isPlaying ? 0.005 : 0.001;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Starfield
      ctx.fillStyle = "rgba(196,154,40,0.2)";
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5 + t * 2) % w);
        const sy = ((i * 97.3 + t * 1.5) % h);
        const size = 0.5 + (i % 3) * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Orbit rings — centered on screen
      const cx = w / 2;
      const cy = h * 0.42;
      const r1 = Math.min(w, h) * 0.22;
      const r2 = Math.min(w, h) * 0.35;

      ctx.strokeStyle = "rgba(196,154,40,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke();

      // Orbit nodes
      orbitTracks.forEach((ot, i) => {
        const angle = (i / orbitTracks.length) * Math.PI * 2 + t * 0.4;
        const radius = i % 2 === 0 ? r1 : r2;
        const nx = cx + radius * Math.cos(angle);
        const ny = cy + radius * Math.sin(angle);
        ctx.strokeStyle = "rgba(196,154,40,0.15)";
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
        ctx.fillStyle = "rgba(196,154,40,0.6)";
        ctx.shadowColor = "rgba(196,154,40,0.4)";
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(nx, ny, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Central pulse ring
      const pulse = 0.5 + 0.5 * Math.sin(t * (isPlaying ? 3 : 1));
      ctx.strokeStyle = `rgba(196,154,40,${0.2 + 0.12 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 52 + 4 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  }, [isPlaying, orbitTracks]);

  return (
    <div className="absolute inset-0">
      <ArtBase track={track} />
      {/* Cosmos canvas overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[3]" />

      {/* Track identity + WID — top center */}
      <div className="absolute top-16 inset-x-0 flex flex-col items-center gap-1 z-[4] px-8">
        {track.witnessId && (
          <Link
            href={`/verify/${track.witnessId}`}
            className="flex items-center gap-1 text-[9px] font-mono transition-opacity hover:opacity-80"
            style={{ color: "rgba(74,222,128,0.6)" }}
          >
            <Shield size={8} /> WID
          </Link>
        )}
      </div>

      {/* Orbit track labels */}
      {orbitTracks.length > 0 && (
        <div className="absolute inset-x-0 z-[4] flex flex-wrap justify-center gap-2 px-8" style={{ top: "60%" }}>
          {orbitTracks.map((ot) => (
            <button
              key={ot.id}
              onClick={() => onPlayIdx(queue.indexOf(ot))}
              className="px-2 py-0.5 rounded-full text-[9px] font-mono transition-opacity hover:opacity-80"
              style={{
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(196,154,40,0.25)",
                color: "rgba(196,154,40,0.7)",
                backdropFilter: "blur(4px)",
              }}
            >
              {ot.title.slice(0, 16)}{ot.title.length > 16 ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 pb-8 z-[4] flex flex-col items-center gap-4">
        <ControlsBar
          track={track}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          onTogglePlay={onTogglePlay}
          onSeek={onSeek}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>
    </div>
  );
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export function CinematicModeEngine(props: CinematicModeEngineProps) {
  const { track, queue, currentIdx, isPlaying, currentTime, duration, progress,
    onClose, onPlayIdx, onTogglePlay, onSeek, onNext, onPrev, analyserNode } = props;

  const [mode, setMode] = useState<CinematicMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as CinematicMode) || "living-canvas";
  });

  const handleModeChange = useCallback((m: CinematicMode) => {
    setMode(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const sharedProps = { track, queue, currentIdx, isPlaying, currentTime, duration, progress, onPlayIdx, onTogglePlay, onSeek, onNext, onPrev, analyserNode };

  return (
    <div className="fixed inset-0 z-[9020] overflow-hidden" style={{ background: "#000" }}>
      {/* Mode content — fills entire viewport */}
      {mode === "living-canvas" && <LivingCanvas {...sharedProps} />}
      {mode === "archive-artifact" && <ArchiveArtifact {...sharedProps} />}
      {mode === "retro-signal" && <RetroSignal {...sharedProps} />}
      {mode === "shelf-playback" && <ShelfPlayback {...sharedProps} />}
      {mode === "cosmos" && <CosmosPlayback {...sharedProps} />}

      {/* Top chrome — always on top of mode content */}
      <div
        className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-3 pb-2"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top))",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(63,74,80,0.5)",
            color: "rgba(232,223,200,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          <ChevronDown size={12} /> Exit
        </button>

        {/* Mode selector */}
        <ModeSelector current={mode} onChange={handleModeChange} />
      </div>
    </div>
  );
}
