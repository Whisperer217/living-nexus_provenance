/**
 * useWaveformVisualizer
 * ─────────────────────────────────────────────────────────────────────────────
 * Draws a live oscilloscope waveform to a <canvas> element, driven by real
 * time-domain audio data from the Web Audio API.
 *
 * Architecture:
 *  - Reuses the module-level AudioContext + AnalyserNode singletons from
 *    useFrequencyGlow (same graph, same source — no double-connect)
 *  - Uses getByteTimeDomainData (oscilloscope) for the wave shape
 *  - Uses getByteFrequencyData for band-based color shifting
 *  - ~60fps RAF loop draws directly to the canvas — no React state updates
 *
 * Visual design:
 *  - Full-width smooth bezier curve, vertically centered in the canvas
 *  - Amplitude driven by live audio samples (0 = flat line, loud = tall wave)
 *  - Color palette:
 *      Idle / low energy:  deep violet  rgba(138, 43, 226, α)
 *      Bass hit:           gold/amber   rgba(196, 154, 40, α)
 *      Mid-heavy:          cyan/teal    rgba(56, 189, 248, α)
 *  - Line width: 1.5px base, thickens to 2.5px on loud passages
 *  - Subtle glow: shadow blur matches amplitude
 *  - Flat line (silence / paused): fades to near-invisible
 *
 * CORS: audio element must have crossOrigin="anonymous" before src is set.
 * Falls back gracefully if Web Audio API is unavailable.
 */

import { useEffect, useRef, useCallback } from "react";

// ── Reuse the singleton graph from useFrequencyGlow ──────────────────────────
// These are declared in useFrequencyGlow.ts but we access them via the same
// module scope. Since both hooks live in the same bundle, the singletons are
// shared automatically.
// We re-declare them here as module-level vars that mirror the other module's
// state — but we use a separate ensureGraph function so this hook can be used
// independently if needed.
let _wCtx: AudioContext | null = null;
let _wAnalyser: AnalyserNode | null = null;
let _wSource: MediaElementAudioSourceNode | null = null;
let _wConnectedEl: HTMLAudioElement | null = null;
let _wReady = false;

async function ensureWaveGraph(audio: HTMLAudioElement): Promise<boolean> {
  try {
    // Try to reuse an existing AudioContext from the window (shared with glow hook)
    // by checking if there's already a running context attached to this element.
    // If the glow hook has already built the graph, _wConnectedEl will be set.
    if (_wReady && _wAnalyser && _wConnectedEl === audio) return true;

    if (!_wCtx || _wCtx.state === "closed") {
      // Check if glow hook's context is available via a shared global
      const shared = (window as any).__lnAudioCtx as AudioContext | undefined;
      if (shared && shared.state !== "closed") {
        _wCtx = shared;
      } else {
        _wCtx = new AudioContext();
        (window as any).__lnAudioCtx = _wCtx;
      }
      _wAnalyser = null;
      _wSource = null;
      _wConnectedEl = null;
      _wReady = false;
    }

    if (_wCtx.state === "suspended") {
      await _wCtx.resume();
    }

    if (_wCtx.state !== "running") return false;

    if (!_wAnalyser) {
      // Check if glow hook already created an analyser on this context
      const sharedAnalyser = (window as any).__lnAnalyser as AnalyserNode | undefined;
      if (sharedAnalyser && sharedAnalyser.context === _wCtx) {
        _wAnalyser = sharedAnalyser;
      } else {
        _wAnalyser = _wCtx.createAnalyser();
        _wAnalyser.fftSize = 2048; // high resolution for smooth wave
        _wAnalyser.smoothingTimeConstant = 0.8;
        _wAnalyser.connect(_wCtx.destination);
        (window as any).__lnAnalyser = _wAnalyser;
      }
    }

    if (_wConnectedEl !== audio) {
      try {
        // Check if glow hook already connected this element
        const sharedSource = (window as any).__lnSource as MediaElementAudioSourceNode | undefined;
        if (sharedSource) {
          // Source already connected — just mark as ready
          _wSource = sharedSource;
        } else {
          _wSource = _wCtx.createMediaElementSource(audio);
          _wSource.connect(_wAnalyser);
          (window as any).__lnSource = _wSource;
        }
        _wConnectedEl = audio;
        _wReady = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already") || msg.includes("InvalidState")) {
          _wConnectedEl = audio;
          _wReady = true;
        } else {
          return false;
        }
      }
    }

    return _wReady;
  } catch {
    return false;
  }
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function lerpRGB(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  t: number
): [number, number, number] {
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ];
}

function getBandColor(bass: number, mid: number): [number, number, number] {
  // Base: violet (138, 43, 226)
  // Bass shift → gold (196, 154, 40)
  // Mid shift → cyan (56, 189, 248)
  const bassT = Math.min(bass * 3.0, 1);
  const midT  = Math.min(mid  * 2.5, 1);

  // Blend violet→gold by bass energy
  const [r1, g1, b1] = lerpRGB(138, 43, 226, 196, 154, 40, bassT);
  // Then blend that result →cyan by mid energy
  const [r2, g2, b2] = lerpRGB(r1, g1, b1, 56, 189, 248, midT * 0.6);
  return [r2, g2, b2];
}

function getFreqBands(analyser: AnalyserNode): { bass: number; mid: number; rms: number } {
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);

  const sampleRate = analyser.context.sampleRate;
  const binSize = sampleRate / analyser.fftSize;
  const len = freqData.length;

  let bassSum = 0, bassCount = 0;
  let midSum = 0, midCount = 0;
  let totalSum = 0;

  for (let i = 0; i < len; i++) {
    const freq = i * binSize;
    const val = freqData[i] / 255;
    totalSum += val;
    if (freq < 250) { bassSum += val; bassCount++; }
    else if (freq < 4000) { midSum += val; midCount++; }
  }

  return {
    bass: bassCount > 0 ? bassSum / bassCount : 0,
    mid:  midCount  > 0 ? midSum  / midCount  : 0,
    rms:  len > 0 ? totalSum / len : 0,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWaveformVisualizer(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  isPlaying: boolean,
): void {
  const rafRef = useRef<number | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const drawWave = useCallback((
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    width: number,
    height: number,
  ) => {
    const bufferLength = analyser.fftSize;
    const timeData = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(timeData);

    // Get band data for color
    const { bass, mid, rms } = getFreqBands(analyser);
    const [r, g, b] = getBandColor(bass, mid);

    // Compute amplitude (how far from center the wave goes)
    // RMS energy drives overall brightness/opacity
    const alpha = Math.max(0.15, Math.min(0.85, 0.2 + rms * 2.5));
    const lineWidth = 1.5 + rms * 2.0;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform as smooth bezier curve
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
    ctx.shadowBlur = 4 + rms * 12;

    const sliceWidth = width / (bufferLength - 1);
    let x = 0;

    // First point
    const firstY = ((timeData[0] / 128.0) - 1) * (height * 0.42) + height / 2;
    ctx.moveTo(0, firstY);

    // Draw smooth curve through all points using quadratic bezier
    for (let i = 1; i < bufferLength - 1; i++) {
      const y = ((timeData[i] / 128.0) - 1) * (height * 0.42) + height / 2;
      const nextY = ((timeData[i + 1] / 128.0) - 1) * (height * 0.42) + height / 2;
      const midX = x + sliceWidth / 2;
      const midY = (y + nextY) / 2;
      ctx.quadraticCurveTo(x, y, midX, midY);
      x += sliceWidth;
    }

    // Last point
    const lastY = ((timeData[bufferLength - 1] / 128.0) - 1) * (height * 0.42) + height / 2;
    ctx.lineTo(width, lastY);

    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const startLoop = useCallback((analyser: AnalyserNode) => {
    stopLoop();

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) { stopLoop(); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) { stopLoop(); return; }

      const { width, height } = canvas;
      drawWave(ctx, analyser, width, height);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop, canvasRef, drawWave]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!enabled || !isPlaying) {
      stopLoop();
      // Clear canvas when stopped
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return stopLoop;
    }

    const audio = audioRef.current;
    if (!audio || !canvas) {
      stopLoop();
      return stopLoop;
    }

    // Graph already ready — start loop immediately
    if (_wReady && _wAnalyser && _wConnectedEl === audio) {
      startLoop(_wAnalyser);
      return stopLoop;
    }

    // Build graph (requires user gesture — already satisfied by play action)
    let cancelled = false;
    ensureWaveGraph(audio).then((ready) => {
      if (cancelled) return;
      if (ready && _wAnalyser) {
        startLoop(_wAnalyser);
      }
      // If not ready (CORS issue etc.), canvas stays clear — no fallback needed
    });

    return () => {
      cancelled = true;
      stopLoop();
    };
  }, [enabled, isPlaying, audioRef, canvasRef, startLoop, stopLoop]);
}
