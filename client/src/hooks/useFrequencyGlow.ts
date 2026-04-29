/**
 * useFrequencyGlow
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects to the shared audio element via Web Audio API AnalyserNode and
 * returns real-time frequency band values (bass, mid, high) that drive the
 * purple reactive glow border on the global player.
 *
 * Architecture:
 *  - One AudioContext + AnalyserNode is created lazily on first enable
 *  - The audio element is connected as a MediaElementSourceNode (ONCE, FOREVER)
 *  - The toggle only controls the RAF animation loop — NEVER the audio routing
 *  - requestAnimationFrame loop samples frequency data ~60fps
 *  - Returns { bass, mid, high } as 0–1 floats + a CSS box-shadow string
 *
 * CRITICAL Web Audio API rules enforced here:
 *  1. createMediaElementSource() is called AT MOST ONCE per audio element.
 *     Once called, the element's output is permanently rerouted through the
 *     Web Audio graph. We NEVER disconnect or recreate the source node.
 *  2. The analyser is ALWAYS connected to audioCtx.destination so audio
 *     always reaches the speakers regardless of glow toggle state.
 *  3. The toggle only starts/stops the requestAnimationFrame visualizer loop.
 *     Audio routing is untouched by the toggle.
 *  4. AudioContext is only created inside a confirmed user-gesture call chain
 *     (the toggle click) to satisfy browser autoplay policy.
 *  5. If the audio element instance changes (new Audio() in PlayerContext),
 *     we detect it and reconnect the new element to the existing graph.
 *
 * CORS note: S3 audio must have CORS headers allowing the page origin.
 * If connect fails we fall back to a static ambient glow so the UI never breaks.
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

  const outerSpread = Math.round(bass * 48);
  const outerOpacity = (0.25 + bass * 0.65).toFixed(2);
  const midSpread = Math.round(mid * 24);
  const midOpacity = (0.15 + mid * 0.55).toFixed(2);
  const highOpacity = (0.1 + high * 0.5).toFixed(2);
  const sideSpread = Math.round(bass * 32);
  const sideOpacity = (0.2 + bass * 0.4).toFixed(2);

  return [
    // Upward glow (above the bar)
    `0 -${outerSpread}px ${outerSpread * 2}px rgba(${PURPLE_DEEP}, ${outerOpacity})`,
    `0 -${midSpread}px ${midSpread * 1.5}px rgba(${PURPLE_MID}, ${midOpacity})`,
    `0 -2px 8px rgba(${PURPLE_BRIGHT}, ${highOpacity})`,
    // Inset glow on the bar itself (always visible regardless of content above)
    `inset 0 1px ${Math.round(bass * 16)}px rgba(${PURPLE_MID}, ${midOpacity})`,
    `inset 0 0 ${Math.round(mid * 24)}px rgba(${PURPLE_BRIGHT}, ${(mid * 0.3).toFixed(2)})`,
    // Side glow (left and right edges)
    `-${sideSpread}px 0 ${sideSpread * 1.5}px rgba(${PURPLE_DEEP}, ${sideOpacity})`,
    `${sideSpread}px 0 ${sideSpread * 1.5}px rgba(${PURPLE_DEEP}, ${sideOpacity})`,
    // Subtle downward pulse
    `0 2px ${Math.round(bass * 16)}px rgba(${PURPLE_DEEP}, ${(bass * 0.35).toFixed(2)})`,
  ].join(", ");
}

// ── Module-level singleton Web Audio graph ────────────────────────────────────
// Kept outside the hook so it survives re-renders and hot-reloads.
// INVARIANT: once _source is created for an audio element, it is NEVER
// disconnected. The analyser is ALWAYS connected to destination.
let _audioCtx: AudioContext | null = null;
let _analyser: AnalyserNode | null = null;
let _source: MediaElementAudioSourceNode | null = null;
let _connectedElement: HTMLAudioElement | null = null;
// Flag: did we successfully build the graph at least once?
let _graphReady = false;

/**
 * Ensure the Web Audio graph is built and the given audio element is connected.
 * Safe to call multiple times — idempotent once the graph is ready.
 * Must be called from a user-gesture call chain (toggle click).
 * Returns true if the graph is ready and audio will flow through it.
 */
async function ensureAudioGraph(audio: HTMLAudioElement): Promise<boolean> {
  try {
    // Create AudioContext once
    if (!_audioCtx || _audioCtx.state === "closed") {
      _audioCtx = new AudioContext();
      _analyser = null;
      _source = null;
      _connectedElement = null;
      _graphReady = false;
    }

    // Resume if suspended — safe here because we're inside a user-gesture chain
    if (_audioCtx.state === "suspended") {
      await _audioCtx.resume();
    }

    // If still not running, bail — don't touch the audio element
    if (_audioCtx.state !== "running") {
      return false;
    }

    // Create analyser once and wire it permanently to destination
    if (!_analyser) {
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.8;
      // ALWAYS connect to destination — audio must always reach speakers
      _analyser.connect(_audioCtx.destination);
    }

    // Connect source node only once per audio element instance.
    // If the audio element changed (e.g. PlayerContext created a new one),
    // we need to connect the new element. We NEVER disconnect the old source
    // from the analyser — we just create a new source for the new element.
    if (_connectedElement !== audio) {
      // Note: we do NOT disconnect _source from _analyser here.
      // The old source will simply stop producing audio when its element is
      // no longer playing. Creating a new source for the new element is safe.
      try {
        _source = _audioCtx.createMediaElementSource(audio);
        _source.connect(_analyser);
        _connectedElement = audio;
        _graphReady = true;
      } catch (err) {
        // InvalidStateError: element already has a source node (e.g. same element
        // was connected in a previous render). This is fine — graph is already set.
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already") || msg.includes("InvalidState")) {
          // The element is already connected — graph is ready
          _connectedElement = audio;
          _graphReady = true;
        } else {
          // Real error (CORS, etc.) — fall back to ambient glow
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
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback((analyser: AnalyserNode) => {
    stopLoop();
    analyserRef.current = analyser;
    const tick = () => {
      const { bass, mid, high } = getFrequencyBands(analyser);
      setBands({ bass, mid, high, glowShadow: buildGlowShadow(bass, mid, high) });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopLoop]);

  useEffect(() => {
    // Glow is off — stop the RAF loop and clear bands.
    // IMPORTANT: do NOT touch the audio graph here. The source node stays
    // connected to the analyser which stays connected to destination.
    // Audio continues to play normally.
    if (!enabled) {
      stopLoop();
      setBands(IDLE);
      return stopLoop;
    }

    // Glow is on but audio is paused — stop visualizer but keep graph intact
    if (!isPlaying) {
      stopLoop();
      setBands(IDLE);
      return stopLoop;
    }

    const audio = audioRef.current;
    if (!audio) {
      stopLoop();
      setBands(IDLE);
      return stopLoop;
    }

    // If graph is already ready and analyser is available, just run the loop
    if (_graphReady && _analyser && _connectedElement === audio) {
      startLoop(_analyser);
      return stopLoop;
    }

    // First time enabling (or audio element changed): build/update the graph.
    // This is safe because `enabled` becoming true is always a user toggle click.
    let cancelled = false;
    ensureAudioGraph(audio).then((ready) => {
      if (cancelled) return;
      if (ready && _analyser) {
        startLoop(_analyser);
      } else {
        // CORS or API unavailable — show static ambient glow without Web Audio
        setBands({
          bass: 0.4, mid: 0.2, high: 0.1,
          glowShadow: buildGlowShadow(0.4, 0.2, 0.1),
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
