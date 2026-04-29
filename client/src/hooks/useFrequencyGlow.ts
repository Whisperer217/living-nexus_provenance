/**
 * useFrequencyGlow
 * ─────────────────────────────────────────────────────────────────────────────
 * Beat-reactive glow that pulses with the music.
 *
 * Architecture:
 *  - One AudioContext + AnalyserNode, created lazily on first enable
 *  - Audio element connected as MediaElementSourceNode ONCE, FOREVER
 *  - Toggle controls only the RAF loop — NEVER the audio routing
 *  - ~60fps RAF loop samples frequency data and drives a peak/decay envelope
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
const DECAY         = 0.88;   // peak decay per frame (~60fps → full decay in ~0.5s)
const BEAT_THRESHOLD = 1.15;  // current bass must exceed peak×this to trigger beat
const MIN_PEAK      = 0.03;   // minimum peak before glow shows (silence threshold)

// ── Color palette (RGB strings) ───────────────────────────────────────────────
const C_VIOLET = "138, 43, 226";    // deep violet — base color
const C_GOLD   = "196, 154, 40";    // gold/amber — bass hit (brand color)
const C_CYAN   = "56, 189, 248";    // cyan/teal — mid-heavy passages
const C_WHITE  = "255, 255, 255";   // white shimmer — high freq edge

/**
 * Interpolate between two RGB strings by factor t (0→1).
 * e.g. lerpColor("138,43,226", "196,154,40", 0.5) → "167,98,133"
 */
function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = a.split(",").map(Number);
  const [br, bg, bb] = b.split(",").map(Number);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `${r}, ${g}, ${bl}`;
}

function buildGlowShadow(
  bass: number,
  mid: number,
  high: number,
  peak: number,
): string {
  if (peak < MIN_PEAK) return "none";

  // ── Color: interpolate violet→gold on bass hit, violet→cyan on mid ──────
  // When bass is high (beat), shift toward gold. When mid is high, shift toward cyan.
  const bassColor = lerpColor(C_VIOLET, C_GOLD, Math.min(bass * 2.5, 1));
  const midColor  = lerpColor(C_VIOLET, C_CYAN, Math.min(mid * 2.0, 1));
  // Blend bass and mid colors by their relative energy
  const totalEnergy = bass + mid + 0.001;
  const primaryColor = lerpColor(bassColor, midColor, mid / totalEnergy);

  // ── Spread & opacity driven by peak envelope ─────────────────────────────
  const outerSpread  = Math.round(peak * 56);           // 0–56px
  const outerOpacity = (0.15 + peak * 0.75).toFixed(2); // 0.15–0.90
  const midSpread    = Math.round(peak * 28);            // 0–28px
  const midOpacity   = (0.1 + mid * 0.6).toFixed(2);
  const sideSpread   = Math.round(peak * 40);            // 0–40px
  const sideOpacity  = (0.1 + peak * 0.5).toFixed(2);
  const insetSize    = Math.round(peak * 20);            // 0–20px
  const insetOpacity = (0.1 + peak * 0.55).toFixed(2);

  // ── High-freq shimmer: sharp thin edge flash ─────────────────────────────
  const highOpacity  = (high * 0.6).toFixed(2);
  const highSpread   = Math.round(high * 4);

  return [
    // Primary upward pulse — main beat glow above the bar
    `0 -${outerSpread}px ${outerSpread * 2}px rgba(${primaryColor}, ${outerOpacity})`,
    // Secondary mid layer
    `0 -${midSpread}px ${midSpread * 1.5}px rgba(${midColor}, ${midOpacity})`,
    // High-freq sharp edge shimmer (white flash on transients)
    `0 -${highSpread}px ${highSpread * 3}px rgba(${C_WHITE}, ${highOpacity})`,
    // Inset glow on the bar itself — always visible
    `inset 0 1px ${insetSize}px rgba(${primaryColor}, ${insetOpacity})`,
    `inset 0 0 ${Math.round(mid * 20)}px rgba(${midColor}, ${(mid * 0.25).toFixed(2)})`,
    // Side glow — left and right edges pulse with bass
    `-${sideSpread}px 0 ${sideSpread * 1.5}px rgba(${primaryColor}, ${sideOpacity})`,
    `${sideSpread}px 0 ${sideSpread * 1.5}px rgba(${primaryColor}, ${sideOpacity})`,
    // Subtle downward pulse
    `0 2px ${Math.round(peak * 18)}px rgba(${primaryColor}, ${(peak * 0.3).toFixed(2)})`,
  ].join(", ");
}

// ── Module-level singleton Web Audio graph ────────────────────────────────────
let _audioCtx: AudioContext | null = null;
let _analyser: AnalyserNode | null = null;
let _source: MediaElementAudioSourceNode | null = null;
let _connectedElement: HTMLAudioElement | null = null;
let _graphReady = false;

async function ensureAudioGraph(audio: HTMLAudioElement): Promise<boolean> {
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
      _analyser.fftSize = 2048; // high-res for both glow and waveform
      // Moderate smoothing — fast enough to catch transients, smooth enough to look good
      _analyser.smoothingTimeConstant = 0.75;
      _analyser.connect(_audioCtx.destination);
      (window as any).__lnAnalyser = _analyser;
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
  const binSize = sampleRate / analyser.fftSize;
  const len = data.length;

  let bassSum = 0, bassCount = 0;
  let midSum = 0, midCount = 0;
  let highSum = 0, highCount = 0;

  for (let i = 0; i < len; i++) {
    const freq = i * binSize;
    const val = data[i] / 255;
    if (freq < 250) {
      bassSum += val; bassCount++;
    } else if (freq < 4000) {
      midSum += val; midCount++;
    } else if (freq < 20000) {
      highSum += val; highCount++;
    }
  }

  return {
    bass:  bassCount  > 0 ? bassSum  / bassCount  : 0,
    mid:   midCount   > 0 ? midSum   / midCount   : 0,
    high:  highCount  > 0 ? highSum  / highCount  : 0,
  };
}

export function useFrequencyGlow(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  enabled: boolean,
  isPlaying: boolean,
): FrequencyBands {
  const [bands, setBands] = useState<FrequencyBands>(IDLE);
  const rafRef  = useRef<number | null>(null);
  // Peak envelope — persists across renders, updated inside RAF loop
  const peakRef = useRef<number>(0);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback((analyser: AnalyserNode) => {
    stopLoop();
    peakRef.current = 0; // reset peak on new loop start

    const tick = () => {
      const { bass, mid, high } = getFrequencyBands(analyser);

      // ── Beat detection + peak/decay envelope ──────────────────────────────
      let peak = peakRef.current * DECAY; // decay this frame

      // Beat onset: bass energy jumped above decayed peak × threshold
      if (bass > peak * BEAT_THRESHOLD) {
        peak = bass; // snap peak up to current energy
      }

      // Also let mid/high contribute to peak at lower weight
      const combinedEnergy = bass + mid * 0.4 + high * 0.15;
      if (combinedEnergy > peak) {
        peak = Math.max(peak, combinedEnergy * 0.6);
      }

      peakRef.current = peak;

      setBands({
        bass, mid, high, peak,
        glowShadow: buildGlowShadow(bass, mid, high, peak),
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop]);

  useEffect(() => {
    if (!enabled) {
      stopLoop();
      peakRef.current = 0;
      setBands(IDLE);
      return stopLoop;
    }

    if (!isPlaying) {
      stopLoop();
      // Decay peak to zero over a few frames rather than instant cut
      peakRef.current = 0;
      setBands(IDLE);
      return stopLoop;
    }

    const audio = audioRef.current;
    if (!audio) {
      stopLoop();
      setBands(IDLE);
      return stopLoop;
    }

    // Graph already ready — start loop immediately
    if (_graphReady && _analyser && _connectedElement === audio) {
      startLoop(_analyser);
      return stopLoop;
    }

    // First enable or audio element changed — build graph (user-gesture chain)
    let cancelled = false;
    ensureAudioGraph(audio).then((ready) => {
      if (cancelled) return;
      if (ready && _analyser) {
        startLoop(_analyser);
      } else {
        // CORS/API unavailable — static ambient glow as fallback
        setBands({
          bass: 0.4, mid: 0.2, high: 0.1, peak: 0.4,
          glowShadow: buildGlowShadow(0.4, 0.2, 0.1, 0.4),
        });
      }
    });

    return () => {
      cancelled = true;
      stopLoop();
    };
  }, [enabled, isPlaying, audioRef, startLoop, stopLoop]);

  return bands;
}
