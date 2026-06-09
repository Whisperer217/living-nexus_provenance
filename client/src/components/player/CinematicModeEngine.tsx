/**
 * CinematicModeEngine — Phase 195
 * ─────────────────────────────────────────────────────────────────────────────
 * Five playback experiences that transform the Living Nexus player from a
 * conventional streaming interface into a living archive.
 *
 * Modes:
 *   living-canvas  — artwork expands into full-screen environment with
 *                    audio-reactive color extraction, slow pulse, particles
 *   archive-artifact — manifestation as museum exhibit with WID, provenance,
 *                    witness count, creator metadata
 *   retro-signal   — CRT glow, waveform, audio-reactive spectrum bars
 *   shelf-playback — item pulled from a shelf, nearby queue works visible
 *   cosmos         — playing track as central node, related works orbit
 *
 * Usage:
 *   <CinematicModeEngine
 *     track={currentTrack}
 *     queue={state.tracks}
 *     currentIdx={state.currentIdx}
 *     isPlaying={state.isPlaying}
 *     currentTime={state.currentTime}
 *     duration={state.duration}
 *     progress={progress}
 *     onClose={onClose}
 *     onPlayIdx={onPlayIdx}
 *     onTogglePlay={togglePlay}
 *     onSeek={seek}
 *     onNext={nextTrack}
 *     onPrev={prevTrack}
 *   />
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track } from "@/contexts/PlayerContext";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  light = false,
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
  light?: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const handleSeekClick = (e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, pct)));
  };

  const textColor = light ? "rgba(255,255,255,0.9)" : "rgba(232,223,200,0.9)";
  const dimColor = light ? "rgba(255,255,255,0.5)" : "rgba(196,154,40,0.6)";

  return (
    <div className="flex flex-col items-center gap-3 w-full px-6">
      {/* Track identity */}
      <div className="text-center">
        <div
          className="text-xl font-bold leading-tight"
          style={{ fontFamily: "'Cinzel', serif", color: textColor }}
        >
          {track.title}
        </div>
        <div className="text-sm mt-0.5" style={{ color: dimColor }}>
          {track.artist}
        </div>
      </div>
      {/* Progress */}
      <div className="w-full flex items-center gap-3">
        <span className="text-[11px] tabular-nums w-8 text-right" style={{ color: dimColor }}>
          {fmtTime(currentTime)}
        </span>
        <div
          ref={barRef}
          className="flex-1 h-1 rounded-full cursor-pointer relative"
          style={{ background: "rgba(44,52,56,0.5)" }}
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
        <span className="text-[11px] tabular-nums w-8" style={{ color: dimColor }}>
          {fmtTime(duration)}
        </span>
      </div>
      {/* Playback buttons */}
      <div className="flex items-center gap-8">
        <button
          onClick={onPrev}
          className="p-2 transition-opacity hover:opacity-80 active:scale-90"
          style={{ color: textColor }}
        >
          <SkipBack size={22} />
        </button>
        <button
          onClick={onTogglePlay}
          className="flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
          style={{
            width: 56,
            height: 56,
            background: "rgba(196,154,40,0.15)",
            border: "1.5px solid rgba(196,154,40,0.5)",
            color: "var(--ln-gold)",
            boxShadow: isPlaying ? "0 0 20px rgba(196,154,40,0.3)" : "none",
          }}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={onNext}
          className="p-2 transition-opacity hover:opacity-80 active:scale-90"
          style={{ color: textColor }}
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

  // Spawn particles
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

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
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
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [isPlaying]);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Artwork background */}
      {track.artUrl ? (
        <img
          src={track.artUrl}
          alt={track.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(2px) brightness(0.55) saturate(1.4)", transform: "scale(1.05)" }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #0A0C0E 0%, #1A1F23 50%, #0A0C0E 100%)" }}
        />
      )}
      {/* Canvas overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      {/* Bottom gradient */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: "55%", background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)" }}
      />
      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 pb-10 flex flex-col items-center gap-6">
        {track.witnessId && (
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
        )}
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
    <div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0D0F11 0%, #141A1E 60%, #0A0C0E 100%)" }}
    >
      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(196,154,40,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(196,154,40,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Museum card */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg px-8"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        {/* Artifact label */}
        <div
          className="text-[9px] font-mono tracking-[0.3em] uppercase"
          style={{ color: "rgba(196,154,40,0.5)" }}
        >
          Living Nexus Archive — {contentTypeLabel(track.contentType)}
        </div>

        {/* Artwork in exhibit frame */}
        <div
          className="relative"
          style={{
            width: 200,
            height: 200,
            border: "2px solid rgba(196,154,40,0.3)",
            boxShadow: "0 0 40px rgba(196,154,40,0.12), inset 0 0 20px rgba(0,0,0,0.4)",
          }}
        >
          {track.artUrl ? (
            <img src={track.artUrl} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl"
              style={{ background: "rgba(20,26,30,0.8)" }}
            >
              {track.emoji || "◈"}
            </div>
          )}
          {/* Corner accents */}
          {[
            "top-0 left-0 border-t-2 border-l-2",
            "top-0 right-0 border-t-2 border-r-2",
            "bottom-0 left-0 border-b-2 border-l-2",
            "bottom-0 right-0 border-b-2 border-r-2",
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-4 h-4 ${cls}`}
              style={{ borderColor: "var(--ln-gold)", margin: "-2px" }}
            />
          ))}
        </div>

        {/* Provenance metadata */}
        <div className="w-full space-y-2">
          <div
            className="text-2xl font-bold text-center"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            {track.title}
          </div>
          <div className="text-sm text-center" style={{ color: "rgba(196,154,40,0.7)" }}>
            {track.artist}
          </div>

          {/* Metadata grid */}
          <div
            className="grid grid-cols-2 gap-2 mt-4 text-[10px]"
            style={{ borderTop: "1px solid rgba(196,154,40,0.15)", paddingTop: "12px" }}
          >
            {[
              ["Type", contentTypeLabel(track.contentType)],
              ["Origin", aiLabel(track.aiDisclosure)],
              ["Plays", track.plays?.toLocaleString() ?? "—"],
              ["Genre", track.genre || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span style={{ color: "rgba(196,154,40,0.45)", fontFamily: "monospace" }}>{label}</span>
                <span style={{ color: "var(--ln-parchment)" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* WID provenance row */}
          {track.witnessId && (
            <Link
              href={`/verify/${track.witnessId}`}
              className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{
                background: "rgba(74,222,128,0.06)",
                border: "1px solid rgba(74,222,128,0.25)",
              }}
            >
              <Shield size={10} style={{ color: "var(--ln-seal-bright)" }} />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono" style={{ color: "rgba(74,222,128,0.6)" }}>
                  WITNESS ID
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--ln-seal-bright)" }}>
                  {track.witnessId}
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* Controls */}
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

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
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

      // CRT scanline background
      ctx.fillStyle = "rgba(0, 8, 4, 0.85)";
      ctx.fillRect(0, 0, w, h);

      // Scanlines
      for (let y = 0; y < h; y += 4) {
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(0, y, w, 1);
      }

      // CRT vignette
      const vign = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.85);
      vign.addColorStop(0, "rgba(0,0,0,0)");
      vign.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vign;
      ctx.fillRect(0, 0, w, h);

      // Get frequency data
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Simulated bars when no analyser
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.floor(80 + 100 * Math.abs(Math.sin(t * 3 + i * 0.3)) * Math.random())
            : Math.floor(10 + 20 * Math.abs(Math.sin(t + i * 0.2)));
        }
      }

      // Spectrum bars
      const barW = (w * 0.8) / bufferLength;
      const startX = w * 0.1;
      const barAreaH = h * 0.35;
      const barY = h * 0.55;

      for (let i = 0; i < bufferLength; i++) {
        const barH = (dataArray[i] / 255) * barAreaH;
        const hue = 120 + i * 0.8; // green → teal
        const alpha = 0.7 + 0.3 * (dataArray[i] / 255);
        ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${alpha})`;
        ctx.shadowColor = `hsl(${hue}, 90%, 60%)`;
        ctx.shadowBlur = 4;
        ctx.fillRect(startX + i * barW, barY - barH, barW - 1, barH);
      }
      ctx.shadowBlur = 0;

      // Waveform line
      if (analyserNode) {
        analyserNode.getByteTimeDomainData(dataArray);
      } else {
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 128 + (isPlaying ? 40 * Math.sin(t * 8 + i * 0.15) : 5 * Math.sin(t + i * 0.1));
        }
      }
      ctx.beginPath();
      ctx.strokeStyle = "rgba(74,222,128,0.8)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(74,222,128,0.6)";
      ctx.shadowBlur = 6;
      const sliceW = (w * 0.8) / bufferLength;
      let x = w * 0.1;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128;
        const y = (v * h * 0.12) + h * 0.35;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Static noise overlay (subtle)
      const noiseAlpha = 0.03 + 0.01 * Math.sin(t * 20);
      ctx.fillStyle = `rgba(255,255,255,${noiseAlpha})`;
      for (let i = 0; i < 200; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      // Horizontal glitch line (rare)
      if (Math.random() < 0.015) {
        const gy = Math.random() * h;
        ctx.fillStyle = "rgba(74,222,128,0.15)";
        ctx.fillRect(0, gy, w, 1);
      }

      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [isPlaying, analyserNode]);

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: "#000804" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Signal header */}
      <div className="relative z-10 flex flex-col items-center pt-10 gap-1">
        <div
          className="text-[8px] font-mono tracking-[0.4em] uppercase"
          style={{ color: "rgba(74,222,128,0.5)" }}
        >
          ◈ SIGNAL ACQUIRED ◈
        </div>
        <div
          className="text-2xl font-bold"
          style={{ fontFamily: "'Courier New', monospace", color: "rgba(74,222,128,0.9)", textShadow: "0 0 12px rgba(74,222,128,0.5)" }}
        >
          {track.title}
        </div>
        <div className="text-sm font-mono" style={{ color: "rgba(74,222,128,0.55)" }}>
          {track.artist}
        </div>
        {track.witnessId && (
          <Link
            href={`/verify/${track.witnessId}`}
            className="mt-1 text-[8px] font-mono transition-opacity hover:opacity-80"
            style={{ color: "rgba(74,222,128,0.4)" }}
          >
            WID:{track.witnessId.slice(0, 24)}
          </Link>
        )}
      </div>

      {/* Controls at bottom */}
      <div className="absolute inset-x-0 bottom-0 pb-8 z-10 flex flex-col items-center gap-4">
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
          light
        />
      </div>
    </div>
  );
}

// ─── Mode: Shelf Playback ─────────────────────────────────────────────────────

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
  // Show 2 before + current + 2 after
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  const start = Math.max(0, currentIdx - half);
  const end = Math.min(queue.length - 1, start + windowSize - 1);
  const visible = queue.slice(start, end + 1);
  const relIdx = currentIdx - start;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(180deg, #0D0A06 0%, #1A1208 50%, #0D0A06 100%)" }}
    >
      {/* Shelf wood grain top */}
      <div
        className="absolute top-0 inset-x-0 h-1"
        style={{ background: "linear-gradient(90deg, rgba(139,90,43,0.3), rgba(196,154,40,0.5), rgba(139,90,43,0.3))" }}
      />

      {/* Shelf label */}
      <div className="pt-8 pb-2 text-center">
        <div
          className="text-[8px] font-mono tracking-[0.3em] uppercase"
          style={{ color: "rgba(196,154,40,0.4)" }}
        >
          Creator Domain — Shelf
        </div>
        {track.creatorHandle && (
          <div className="text-sm mt-0.5" style={{ color: "rgba(196,154,40,0.6)" }}>
            {track.creatorHandle}
          </div>
        )}
      </div>

      {/* Shelf items */}
      <div className="flex items-end justify-center gap-3 px-4 flex-1">
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
              style={{
                transform: `scale(${scale}) translateY(${translateY}px)`,
                opacity,
              }}
            >
              {/* Album spine / cover */}
              <div
                className="relative overflow-hidden"
                style={{
                  width: isCurrent ? 120 : 80,
                  height: isCurrent ? 120 : 80,
                  border: isCurrent
                    ? "2px solid rgba(196,154,40,0.7)"
                    : "1px solid rgba(196,154,40,0.2)",
                  boxShadow: isCurrent
                    ? "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(196,154,40,0.2)"
                    : "0 4px 12px rgba(0,0,0,0.4)",
                  transition: "width 0.3s, height 0.3s, border 0.3s",
                }}
              >
                {t.artUrl ? (
                  <img src={t.artUrl} alt={t.title} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: "rgba(20,15,8,0.9)", fontSize: isCurrent ? 32 : 20 }}
                  >
                    {t.emoji || "◈"}
                  </div>
                )}
                {isCurrent && isPlaying && (
                  <div
                    className="absolute bottom-1.5 right-1.5 flex gap-0.5 items-end"
                    style={{ height: 12 }}
                  >
                    {[0, 1, 2].map((b) => (
                      <div
                        key={b}
                        className="w-1 rounded-sm"
                        style={{
                          background: "var(--ln-gold)",
                          height: `${40 + 60 * Math.random()}%`,
                          animation: `shelf-eq ${0.4 + b * 0.15}s ease-in-out infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              {isCurrent && (
                <div className="text-center max-w-[120px]">
                  <div
                    className="text-[11px] font-semibold truncate"
                    style={{ color: "var(--ln-parchment)" }}
                  >
                    {t.title}
                  </div>
                  {t.witnessId && (
                    <div className="text-[8px] font-mono mt-0.5" style={{ color: "rgba(74,222,128,0.6)" }}>
                      WID ◈
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Shelf wood grain bottom */}
      <div
        className="inset-x-0 h-3 rounded-sm mx-4 mb-2"
        style={{
          background: "linear-gradient(180deg, rgba(139,90,43,0.6) 0%, rgba(101,65,30,0.8) 100%)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}
      />

      {/* Controls */}
      <div className="pb-8 w-full flex flex-col items-center gap-4">
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

  // Nearby tracks for orbit (up to 6)
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
      ctx.fillStyle = "rgba(196,154,40,0.15)";
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5 + t * 2) % w);
        const sy = ((i * 97.3 + t * 1.5) % h);
        const size = 0.5 + (i % 3) * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Orbit rings
      const cx = w / 2;
      const cy = h * 0.42;
      const r1 = Math.min(w, h) * 0.22;
      const r2 = Math.min(w, h) * 0.35;

      ctx.strokeStyle = "rgba(196,154,40,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke();

      // Orbit nodes (related tracks)
      orbitTracks.forEach((ot, i) => {
        const angle = (i / orbitTracks.length) * Math.PI * 2 + t * 0.4;
        const radius = i % 2 === 0 ? r1 : r2;
        const nx = cx + radius * Math.cos(angle);
        const ny = cy + radius * Math.sin(angle);

        // Connection line
        ctx.strokeStyle = "rgba(196,154,40,0.12)";
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();

        // Node dot
        ctx.fillStyle = "rgba(196,154,40,0.5)";
        ctx.shadowColor = "rgba(196,154,40,0.4)";
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(nx, ny, 4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Central pulse ring
      const pulse = 0.5 + 0.5 * Math.sin(t * (isPlaying ? 3 : 1));
      ctx.strokeStyle = `rgba(196,154,40,${0.15 + 0.1 * pulse})`;
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
    <div
      className="absolute inset-0 flex flex-col items-center"
      style={{ background: "linear-gradient(180deg, #050608 0%, #0A0C10 100%)" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Central artwork node */}
      <div
        className="relative z-10 mt-16"
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid rgba(196,154,40,0.5)",
          boxShadow: "0 0 40px rgba(196,154,40,0.25), 0 0 80px rgba(196,154,40,0.1)",
        }}
      >
        {track.artUrl ? (
          <img src={track.artUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: "rgba(10,12,16,0.9)" }}
          >
            {track.emoji || "◈"}
          </div>
        )}
      </div>

      {/* Track name */}
      <div className="relative z-10 mt-4 text-center px-8">
        <div
          className="text-xl font-bold"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
        >
          {track.title}
        </div>
        <div className="text-sm mt-0.5" style={{ color: "rgba(196,154,40,0.6)" }}>
          {track.artist}
        </div>
        {track.witnessId && (
          <Link
            href={`/verify/${track.witnessId}`}
            className="flex items-center justify-center gap-1 mt-1 text-[9px] font-mono transition-opacity hover:opacity-80"
            style={{ color: "rgba(74,222,128,0.5)" }}
          >
            <Shield size={8} /> WID
          </Link>
        )}
      </div>

      {/* Orbit track labels */}
      {orbitTracks.length > 0 && (
        <div className="relative z-10 mt-4 flex flex-wrap justify-center gap-2 px-8">
          {orbitTracks.map((ot, i) => (
            <button
              key={ot.id}
              onClick={() => onPlayIdx(queue.indexOf(ot))}
              className="px-2 py-0.5 rounded-full text-[9px] font-mono transition-opacity hover:opacity-80"
              style={{
                background: "rgba(196,154,40,0.08)",
                border: "1px solid rgba(196,154,40,0.2)",
                color: "rgba(196,154,40,0.6)",
              }}
            >
              {ot.title.slice(0, 16)}{ot.title.length > 16 ? "…" : ""}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-0 pb-8 z-10 flex flex-col items-center gap-4">
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
      {/* Mode content */}
      {mode === "living-canvas" && <LivingCanvas {...sharedProps} />}
      {mode === "archive-artifact" && <ArchiveArtifact {...sharedProps} />}
      {mode === "retro-signal" && <RetroSignal {...sharedProps} />}
      {mode === "shelf-playback" && <ShelfPlayback {...sharedProps} />}
      {mode === "cosmos" && <CosmosPlayback {...sharedProps} />}

      {/* Top chrome — always on top */}
      <div
        className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-3 pb-2"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
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
