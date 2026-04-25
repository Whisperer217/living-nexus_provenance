/**
 * useFrequencyGlow
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects to the shared audio element via Web Audio API AnalyserNode and
 * returns real-time frequency band values (bass, mid, high) that drive the
 * purple reactive glow border on the global player.
 *
 * Architecture:
 *  - One AudioContext + AnalyserNode is created lazily on first enable
 *  - The audio element is connected as a MediaElementSourceNode (once only)
 *  - requestAnimationFrame loop samples frequency data ~60fps
 *  - Returns { bass, mid, high } as 0–1 floats + a CSS box-shadow string
 *
 * CORS note: S3 audio must have CORS headers allowing the page origin.
 * If the connect fails we fall back to a static ambient glow so the UI
 * never breaks.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface FrequencyBands {
  bass: number;   // 0–1  (20–250 Hz)
  mid: number;    // 0–1  (250–4000 Hz)
  high: number;   // 0–1  (4000–20000 Hz)
  glowShadow: string; // ready-to-use CSS box-shadow value
}

const IDLE: FrequencyBands = {
  bass: 0,
  mid: 0,
  high: 0,
  glowShadow: "none",
};

// Purple palette — deep royal to soft violet
const PURPLE_DEEP   = "138, 43, 226";   // blueviolet
const PURPLE_MID    = "167, 80, 255";   // medium violet
const PURPLE_BRIGHT = "192, 132, 252";  // soft lavender

function buildGlowShadow(bass: number, mid: number, high: number): string {
  if (bass < 0.02 && mid < 0.02 && high < 0.02) return "none";

  // Bass drives the wide outer bloom
  const outerSpread = Math.round(bass * 48);
  const outerOpacity = (0.25 + bass * 0.65).toFixed(2);

  // Mid drives the mid-range shimmer
  const midSpread = Math.round(mid * 24);
  const midOpacity = (0.15 + mid * 0.55).toFixed(2);

  // High drives the thin bright edge
  const highOpacity = (0.1 + high * 0.5).toFixed(2);

  return [
    `0 -${outerSpread}px ${outerSpread * 2}px rgba(${PURPLE_DEEP}, ${outerOpacity})`,
    `0 -${midSpread}px ${midSpread * 1.5}px rgba(${PURPLE_MID}, ${midOpacity})`,
    `0 -2px 8px rgba(${PURPLE_BRIGHT}, ${highOpacity})`,
    // Also glow downward slightly for depth
    `0 2px ${Math.round(bass * 12)}px rgba(${PURPLE_DEEP}, ${(bass * 0.3).toFixed(2)})`,
  ].join(", ");
}

// Singleton audio context + source node (shared across re-renders)
let _audioCtx: AudioContext | null = null;
let _analyser: AnalyserNode | null = null;
let _source: MediaElementAudioSourceNode | null = null;
let _connectedElement: HTMLAudioElement | null = null;

function getOrCreateAnalyser(audio: HTMLAudioElement): AnalyserNode | null {
  try {
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new AudioContext();
      _analyser = null;
      _source = null;
      _connectedElement = null;
    }

    if (_audioCtx.state === "suspended") {
      _audioCtx.resume().catch(() => {});
    }

    if (!_analyser) {
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.8;
      _analyser.connect(_audioCtx.destination);
    }

    // Only connect the source once per audio element
    if (_connectedElement !== audio) {
      if (_source) {
        try { _source.disconnect(); } catch {}
      }
      _source = _audioCtx.createMediaElementSource(audio);
      _source.connect(_analyser);
      _connectedElement = audio;
    }

    return _analyser;
  } catch {
    return null;
  }
}

function getFrequencyBands(analyser: AnalyserNode): { bass: number; mid: number; high: number } {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  const sampleRate = analyser.context.sampleRate;
  const binSize = sampleRate / (analyser.fftSize);
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
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    const audio = audioRef.current;
    if (!audio) return;

    const analyser = getOrCreateAnalyser(audio);
    if (!analyser) {
      // CORS or API not available — show static ambient glow while playing
      setBands({
        bass: 0.4, mid: 0.2, high: 0.1,
        glowShadow: buildGlowShadow(0.4, 0.2, 0.1),
      });
      return;
    }
    analyserRef.current = analyser;

    const tick = () => {
      const { bass, mid, high } = getFrequencyBands(analyser);
      setBands({ bass, mid, high, glowShadow: buildGlowShadow(bass, mid, high) });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [audioRef, stopLoop]);

  useEffect(() => {
    if (enabled && isPlaying) {
      startLoop();
    } else {
      stopLoop();
      setBands(IDLE);
    }
    return stopLoop;
  }, [enabled, isPlaying, startLoop, stopLoop]);

  return bands;
}
