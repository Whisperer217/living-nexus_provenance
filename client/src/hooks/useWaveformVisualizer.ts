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
 *  - RAF loop draws directly to the canvas — no React state updates
 *
 * Mobile optimizations (applied when isMobile = true):
 *  - Loop throttled to 30fps (every other frame)
 *  - fftSize reduced to 512 (75% fewer samples → faster bezier loop)
 *  - ctx.shadowBlur removed entirely (eliminates GPU blur compositing pass)
 *
 * Visual design:
 *  - Full-width smooth bezier curve, vertically centered in the canvas
 *  - Amplitude driven by live audio samples (0 = flat line, loud = tall wave)
 *  - Color palette:
 *      Idle / low energy:  deep violet  rgba(138, 43, 226, α)
 *      Bass hit:           gold/amber   rgba(196, 154, 40, α)
 *      Mid-heavy:          cyan/teal    rgba(56, 189, 248, α)
 *  - Line width: 1.5px base, thickens to 2.5px on loud passages
 *  - Desktop: subtle glow via shadowBlur matching amplitude
 *  - Mobile:  no shadowBlur (performance)
 *
 * CORS: audio element must have crossOrigin="anonymous" before src is set.
 * Falls back gracefully if Web Audio API is unavailable.
 */

import { useEffect, useRef, useCallback } from "react";

// ── Reuse the singleton graph from useFrequencyGlow ──────────────────────────
let _wCtx: AudioContext | null = null;
let _wAnalyser: AnalyserNode | null = null;
let _wSource: MediaElementAudioSourceNode | null = null;
let _wConnectedEl: HTMLAudioElement | null = null;
let _wReady = false;

async function ensureWaveGraph(
  audio: HTMLAudioElement,
  fftSize: number,
): Promise<boolean> {
  try {
    if (_wReady && _wAnalyser && _wConnectedEl === audio) return true;

    if (!_wCtx || _wCtx.state === "closed") {
      const shared = (window as any).__lnAudioCtx as AudioContext | undefined;
      if (shared && shared.state !== "closed") {
        _wCtx = shared;
      } else {
        _wCtx = new AudioContext();
        (window as any).__lnAudioCtx = _wCtx;
      }
      _wAnalyser  = null;
      _wSource    = null;
      _wConnectedEl = null;
      _wReady     = false;
    }

    if (_wCtx.state === "suspended") await _wCtx.resume();
    if (_wCtx.state !== "running") return false;

    if (!_wAnalyser) {
      const sharedAnalyser = (window as any).__lnAnalyser as AnalyserNode | undefined;
      if (sharedAnalyser && sharedAnalyser.context === _wCtx) {
        _wAnalyser = sharedAnalyser;
      } else {
        _wAnalyser = _wCtx.createAnalyser();
        _wAnalyser.fftSize = fftSize;
        _wAnalyser.smoothingTimeConstant = 0.8;
        _wAnalyser.connect(_wCtx.destination);
        (window as any).__lnAnalyser = _wAnalyser;
      }
    }

    // Update fftSize if needed
    if (_wAnalyser.fftSize !== fftSize) {
      try { _wAnalyser.fftSize = fftSize; } catch { /* ignore */ }
    }

    if (_wConnectedEl !== audio) {
      try {
        const sharedSource = (window as any).__lnSource as MediaElementAudioSourceNode | undefined;
        if (sharedSource) {
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
  const bassT = Math.min(bass * 3.0, 1);
  const midT  = Math.min(mid  * 2.5, 1);
  const [r1, g1, b1] = lerpRGB(138, 43, 226, 196, 154, 40, bassT);
  const [r2, g2, b2] = lerpRGB(r1, g1, b1, 56, 189, 248, midT * 0.6);
  return [r2, g2, b2];
}

function getFreqBands(analyser: AnalyserNode): { bass: number; mid: number; rms: number } {
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);

  const sampleRate = analyser.context.sampleRate;
  const binSize    = sampleRate / analyser.fftSize;
  const len        = freqData.length;

  let bassSum = 0, bassCount = 0;
  let midSum  = 0, midCount  = 0;
  let totalSum = 0;

  for (let i = 0; i < len; i++) {
    const freq = i * binSize;
    const val  = freqData[i] / 255;
    totalSum += val;
    if (freq < 250)       { bassSum += val; bassCount++; }
    else if (freq < 4000) { midSum  += val; midCount++;  }
  }

  return {
    bass: bassCount > 0 ? bassSum / bassCount : 0,
    mid:  midCount  > 0 ? midSum  / midCount  : 0,
    rms:  len > 0 ? totalSum / len : 0,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWaveformVisualizer(
  audioRef:  React.RefObject<HTMLAudioElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled:   boolean,
  isPlaying: boolean,
  /** Pass true on mobile to enable all mobile optimizations */
  isMobile?: boolean,
): void {
  const rafRef   = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const drawWave = useCallback((
    ctx:      CanvasRenderingContext2D,
    analyser: AnalyserNode,
    width:    number,
    height:   number,
    mobile:   boolean,
  ) => {
    const bufferLength = analyser.fftSize;
    const timeData     = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(timeData);

    const { bass, mid, rms } = getFreqBands(analyser);
    const [r, g, b]          = getBandColor(bass, mid);

    const alpha     = Math.max(0.15, Math.min(0.85, 0.2 + rms * 2.5));
    const lineWidth = 1.5 + rms * 2.0;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.lineWidth   = lineWidth;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

    if (mobile) {
      // No shadowBlur on mobile — eliminates GPU blur compositing pass
      ctx.shadowBlur = 0;
    } else {
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`;
      ctx.shadowBlur  = 4 + rms * 12;
    }

    const sliceWidth = width / (bufferLength - 1);
    let x = 0;

    const firstY = ((timeData[0] / 128.0) - 1) * (height * 0.42) + height / 2;
    ctx.moveTo(0, firstY);

    for (let i = 1; i < bufferLength - 1; i++) {
      const y     = ((timeData[i]     / 128.0) - 1) * (height * 0.42) + height / 2;
      const nextY = ((timeData[i + 1] / 128.0) - 1) * (height * 0.42) + height / 2;
      const midX  = x + sliceWidth / 2;
      const midY  = (y + nextY) / 2;
      ctx.quadraticCurveTo(x, y, midX, midY);
      x += sliceWidth;
    }

    const lastY = ((timeData[bufferLength - 1] / 128.0) - 1) * (height * 0.42) + height / 2;
    ctx.lineTo(width, lastY);
    ctx.stroke();

    if (!mobile) ctx.shadowBlur = 0;
  }, []);

  const startLoop = useCallback((analyser: AnalyserNode) => {
    stopLoop();
    frameRef.current = 0;
    const mobile = !!isMobile;

    const tick = () => {
      frameRef.current++;

      // Mobile throttle: skip odd frames → effective 30fps
      if (mobile && frameRef.current % 2 !== 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) { stopLoop(); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) { stopLoop(); return; }

      const { width, height } = canvas;
      drawWave(ctx, analyser, width, height, mobile);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop, canvasRef, drawWave, isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!enabled || !isPlaying) {
      stopLoop();
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

    const fftSize = isMobile ? 512 : 2048;

    if (_wReady && _wAnalyser && _wConnectedEl === audio) {
      startLoop(_wAnalyser);
      return stopLoop;
    }

    let cancelled = false;
    ensureWaveGraph(audio, fftSize).then((ready) => {
      if (cancelled) return;
      if (ready && _wAnalyser) startLoop(_wAnalyser);
    });

    return () => {
      cancelled = true;
      stopLoop();
    };
  }, [enabled, isPlaying, audioRef, canvasRef, startLoop, stopLoop, isMobile]);
}
