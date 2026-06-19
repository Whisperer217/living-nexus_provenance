/**
 * useFrequencyGlow
 * ─────────────────────────────────────────────────────────────────────────────
 * Beat-reactive glow that pulses with the music.
 *
 * Architecture:
 *  - One AudioContext + AnalyserNode, created lazily on first enable
 *  - Audio element connected as MediaElementSourceNode ONCE, FOREVER
 *  - Toggle controls only the RAF loop — NEVER the audio routing
 *  - RAF loop samples frequency data and drives a peak/decay envelope
 *
 * Mobile optimizations (applied when isMobile = true):
 *  - Direct DOM mutation (element.style.boxShadow) instead of React setState
 *    → eliminates 60 React re-renders per second on the GlobalPlayer component
 *  - Loop throttled to 30fps (every other frame) instead of 60fps
 *  - fftSize reduced from 2048 → 512 (75% fewer frequency bins to process)
 *  - Box-shadow reduced from 8 layers → 3 layers (less GPU compositing)
 *
 * Desktop keeps the full 60fps / 8-layer experience unchanged.
 *
 * Beat detection & decay:
 *  - Bass energy is averaged over the 20–250 Hz band each frame
 *  - A running "peak" value decays exponentially (×DECAY per frame)
 *  - When current bass exceeds peak × BEAT_THRESHOLD, a beat is detected:
 *    peak snaps up to current bass, triggering a bright pulse
 *  - Between beats the peak decays smoothly → glow fades naturally
 *
 * Color palette (shifts with frequency content):
 *  - Idle / low energy: deep violet  (138, 43, 226)
 *  - Bass hit:          gold/amber   (196, 154, 40)  ← Living Nexus brand
 *  - Mid-heavy:         cyan/teal    (56, 189, 248)
 *  - High shimmer:      soft white   (255, 255, 255)
 *
 * CORS: audio element must have crossOrigin="anonymous" before src is set.
 * If graph setup fails we fall back to a static ambient glow.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface FrequencyBands {
  bass: number;        // 0–1 raw band average
  mid: number;         // 0–1 raw band average
  high: number;        // 0–1 raw band average
  peak: number;        // 0–1 smoothed peak envelope (drives glow intensity)
  glowShadow: string;  // ready-to-use CSS box-shadow value
}

const IDLE: FrequencyBands = {
  bass: 0, mid: 0, high: 0, peak: 0,
  glowShadow: "none",
};

// ── Tuning constants ──────────────────────────────────────────────────────────
const DECAY          = 0.88;   // peak decay per frame (~60fps → full decay in ~0.5s)
const BEAT_THRESHOLD = 1.15;   // current bass must exceed peak×this to trigger beat
const MIN_PEAK       = 0.03;   // minimum peak before glow shows (silence threshold)

// ── Color palette (RGB strings) ───────────────────────────────────────────────
const C_VIOLET = "138, 43, 226";    // deep violet — base color
const C_GOLD   = "196, 154, 40";    // gold/amber — bass hit (brand color)
const C_CYAN   = "56, 189, 248";    // cyan/teal — mid-heavy passages
const C_WHITE  = "255, 255, 255";   // white shimmer — high freq edge

/**
 * Interpolate between two RGB strings by factor t (0→1).
 */
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = a.split(",").map(Number);
  const [br, bg, bb] = b.split(",").map(Number);
  const r  = Math.round(ar + (br - ar) * t);
  const g  = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `${r}, ${g}, ${bl}`;
}

/**
 * Full 8-layer shadow — desktop quality.
 */
function buildGlowShadowFull(
  bass: number,
  mid: number,
  high: number,
  peak: number,
): string {
  if (peak < MIN_PEAK) return "none";

  const bassColor    = lerpColor(C_VIOLET, C_GOLD, Math.min(bass * 2.5, 1));
  const midColor     = lerpColor(C_VIOLET, C_CYAN, Math.min(mid * 2.0, 1));
  const totalEnergy  = bass + mid + 0.001;
  const primaryColor = lerpColor(bassColor, midColor, mid / totalEnergy);

  const outerSpread  = Math.round(peak * 56);
  const outerOpacity = (0.15 + peak * 0.75).toFixed(2);
  const midSpread    = Math.round(peak * 28);
  const midOpacity   = (0.1 + mid * 0.6).toFixed(2);
  const sideSpread   = Math.round(peak * 40);
  const sideOpacity  = (0.1 + peak * 0.5).toFixed(2);
  const insetSize    = Math.round(peak * 20);
  const insetOpacity = (0.1 + peak * 0.55).toFixed(2);
  const highOpacity  = (high * 0.6).toFixed(2);
  const highSpread   = Math.round(high * 4);

  return [
    `0 -${outerSpread}px ${outerSpread * 2}px rgba(${primaryColor}, ${outerOpacity})`,
    `0 -${midSpread}px ${midSpread * 1.5}px rgba(${midColor}, ${midOpacity})`,
    `0 -${highSpread}px ${highSpread * 3}px rgba(${C_WHITE}, ${highOpacity})`,
    `inset 0 1px ${insetSize}px rgba(${primaryColor}, ${insetOpacity})`,
    `inset 0 0 ${Math.round(mid * 20)}px rgba(${midColor}, ${(mid * 0.25).toFixed(2)})`,
    `-${sideSpread}px 0 ${sideSpread * 1.5}px rgba(${primaryColor}, ${sideOpacity})`,
    `${sideSpread}px 0 ${sideSpread * 1.5}px rgba(${primaryColor}, ${sideOpacity})`,
    `0 2px ${Math.round(peak * 18)}px rgba(${primaryColor}, ${(peak * 0.3).toFixed(2)})`,
  ].join(", ");
}

/**
 * Lightweight 3-layer shadow — mobile quality.
 * Upward pulse + inset bar glow + subtle downward pulse only.
 * Eliminates side glows and high-freq shimmer to reduce GPU compositing.
 */
function buildGlowShadowMobile(
  bass: number,
  mid: number,
  peak: number,
): string {
  if (peak < MIN_PEAK) return "none";

  const bassColor    = lerpColor(C_VIOLET, C_GOLD, Math.min(bass * 2.5, 1));
  const midColor     = lerpColor(C_VIOLET, C_CYAN, Math.min(mid * 2.0, 1));
  const totalEnergy  = bass + mid + 0.001;
  const primaryColor = lerpColor(bassColor, midColor, mid / totalEnergy);

  const outerSpread  = Math.round(peak * 40);           // slightly smaller on mobile
  const outerOpacity = (0.15 + peak * 0.65).toFixed(2);
  const insetSize    = Math.round(peak * 14);
  const insetOpacity = (0.1 + peak * 0.45).toFixed(2);
  const downOpacity  = (peak * 0.2).toFixed(2);

  return [
    `0 -${outerSpread}px ${outerSpread * 2}px rgba(${primaryColor}, ${outerOpacity})`,
    `inset 0 1px ${insetSize}px rgba(${primaryColor}, ${insetOpacity})`,
    `0 2px ${Math.round(peak * 12)}px rgba(${primaryColor}, ${downOpacity})`,
  ].join(", ");
}

// ── Module-level singleton Web Audio graph ────────────────────────────────────
let _audioCtx: AudioContext | null = null;
let _analyser: AnalyserNode | null = null;
let _source: MediaElementAudioSourceNode | null = null;
let _connectedElement: HTMLAudioElement | null = null;
let _graphReady = false;

async function ensureAudioGraph(
  audio: HTMLAudioElement,
  fftSize: number,
): Promise<boolean> {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new AudioContext();
      (window as any).__lnAudioCtx = _audioCtx;
      _analyser = null;
      _source = null;
      _connectedElement = null;
      _graphReady = false;
    }

    if (_audioCtx.state === "suspended") {
      await _audioCtx.resume();
    }

    if (_audioCtx.state !== "running") return false;

    if (!_analyser) {
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = fftSize;
      _analyser.smoothingTimeConstant = 0.75;
      _analyser.connect(_audioCtx.destination);
      (window as any).__lnAnalyser = _analyser;
    } else if (_analyser.fftSize !== fftSize) {
      // Update fftSize if device type changed (unlikely but safe)
      _analyser.fftSize = fftSize;
    }

    if (_connectedElement !== audio) {
      try {
        _source = _audioCtx.createMediaElementSource(audio);
        _source.connect(_analyser);
        _connectedElement = audio;
        _graphReady = true;
        (window as any).__lnSource = _source;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already") || msg.includes("InvalidState")) {
          _connectedElement = audio;
          _graphReady = true;
        } else {
          return false;
        }
      }
    }

    return _graphReady;
  } catch {
    return false;
  }
}

function getFrequencyBands(analyser: AnalyserNode): { bass: number; mid: number; high: number } {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  const sampleRate = analyser.context.sampleRate;
  const binSize    = sampleRate / analyser.fftSize;
  const len        = data.length;

  let bassSum = 0, bassCount = 0;
  let midSum  = 0, midCount  = 0;
  let highSum = 0, highCount = 0;

  for (let i = 0; i < len; i++) {
    const freq = i * binSize;
    const val  = data[i] / 255;
    if (freq < 250)        { bassSum += val; bassCount++; }
    else if (freq < 4000)  { midSum  += val; midCount++;  }
    else if (freq < 20000) { highSum += val; highCount++; }
  }

  return {
    bass: bassCount > 0 ? bassSum / bassCount : 0,
    mid:  midCount  > 0 ? midSum  / midCount  : 0,
    high: highCount > 0 ? highSum / highCount : 0,
  };
}

export function useFrequencyGlow(
  audioRef:    React.RefObject<HTMLAudioElement | null>,
  enabled:     boolean,
  isPlaying:   boolean,
  /** Optional: DOM element to mutate directly on mobile (bypasses React setState) */
  targetRef?:  React.RefObject<HTMLElement | null>,
  /** Pass true on mobile to enable all mobile optimizations */
  isMobile?:   boolean,
): FrequencyBands {
  // Desktop: use React state (unchanged behavior)
  // Mobile:  keep state at IDLE always — actual glow goes direct to DOM
  const [bands, setBands] = useState<FrequencyBands>(IDLE);
  const rafRef   = useRef<number | null>(null);
  const peakRef  = useRef<number>(0);
  const frameRef = useRef<number>(0); // frame counter for 30fps throttle

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback((analyser: AnalyserNode) => {
    stopLoop();
    peakRef.current  = 0;
    frameRef.current = 0;

    const mobile    = !!isMobile;
    const fftTarget = mobile ? 512 : 2048;

    // Ensure analyser fftSize matches device
    if (analyser.fftSize !== fftTarget) {
      try { analyser.fftSize = fftTarget; } catch { /* read-only after connect on some browsers */ }
    }

    const tick = () => {
      frameRef.current++;

      // Mobile throttle: skip odd frames → effective 30fps
      if (mobile && frameRef.current % 2 !== 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const { bass, mid, high } = getFrequencyBands(analyser);

      // ── Beat detection + peak/decay envelope ──────────────────────────────
      let peak = peakRef.current * DECAY;
      if (bass > peak * BEAT_THRESHOLD) peak = bass;
      const combinedEnergy = bass + mid * 0.4 + high * 0.15;
      if (combinedEnergy > peak) peak = Math.max(peak, combinedEnergy * 0.6);
      peakRef.current = peak;

      if (mobile) {
        // ── Mobile path: direct DOM mutation, no React re-render ─────────
        const shadow = buildGlowShadowMobile(bass, mid, peak);
        const el = targetRef?.current;
        if (el) {
          el.style.boxShadow = shadow === "none" ? "" : shadow;
        }
        // Keep React state at IDLE so GlobalPlayer never re-renders from glow
      } else {
        // ── Desktop path: React state (full quality, unchanged) ───────────
        setBands({
          bass, mid, high, peak,
          glowShadow: buildGlowShadowFull(bass, mid, high, peak),
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop, isMobile, targetRef]);

  useEffect(() => {
    if (!enabled) {
      stopLoop();
      peakRef.current = 0;
      setBands(IDLE);
      // Clear direct DOM glow if mobile
      if (isMobile && targetRef?.current) {
        targetRef.current.style.boxShadow = "";
      }
      return stopLoop;
    }

    if (!isPlaying) {
      stopLoop();
      peakRef.current = 0;
      setBands(IDLE);
      if (isMobile && targetRef?.current) {
        targetRef.current.style.boxShadow = "";
      }
      return stopLoop;
    }

    const audio = audioRef.current;
    if (!audio) {
      stopLoop();
      setBands(IDLE);
      return stopLoop;
    }

    const fftSize = isMobile ? 512 : 2048;

    // Graph already ready — start loop immediately
    if (_graphReady && _analyser && _connectedElement === audio) {
      startLoop(_analyser);
      return stopLoop;
    }

    // First enable or audio element changed — build graph
    let cancelled = false;
    ensureAudioGraph(audio, fftSize).then((ready) => {
      if (cancelled) return;
      if (ready && _analyser) {
        startLoop(_analyser);
      } else {
        // CORS/API unavailable — static ambient glow as fallback
        if (!isMobile) {
          setBands({
            bass: 0.4, mid: 0.2, high: 0.1, peak: 0.4,
            glowShadow: buildGlowShadowFull(0.4, 0.2, 0.1, 0.4),
          });
        } else if (targetRef?.current) {
          targetRef.current.style.boxShadow =
            buildGlowShadowMobile(0.4, 0.2, 0.4);
        }
      }
    });

    return () => {
      cancelled = true;
      stopLoop();
    };
  }, [enabled, isPlaying, audioRef, startLoop, stopLoop, isMobile, targetRef]);

  return bands;
}
