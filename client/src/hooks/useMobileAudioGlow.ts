/**
 * useMobileAudioGlow
 * Drives the mobile MiniBar audio visualizer bars with real frequency data
 * from the shared Web Audio analyser (window.__lnAnalyser).
 *
 * Returns:
 *   barHeights — array of 5 normalized heights [0..1] for each bar
 *   glowColor  — CSS color string matching the desktop glow palette
 *   glowShadow — box-shadow string for the bar container
 */

import { useEffect, useRef, useState } from "react";

interface MobileAudioGlowState {
  barHeights: number[];    // 5 values, each 0..1
  glowColor: string;       // CSS color for the bars
  glowShadow: string;      // box-shadow for the container
}

const DEFAULT_STATE: MobileAudioGlowState = {
  barHeights: [0.4, 0.7, 1.0, 0.6, 0.35],
  glowColor: "rgba(232,223,200,0.6)",
  glowShadow: "none",
};

// Frequency bin indices for the 5 bars (bass → treble)
// fftSize 2048 → 1024 bins, each bin = 22050/1024 ≈ 21.5 Hz
const BAR_BIN_RANGES = [
  [1, 4],    // sub-bass  20–86 Hz
  [4, 10],   // bass      86–215 Hz
  [10, 25],  // low-mid   215–538 Hz
  [25, 60],  // mid       538–1.3 kHz
  [60, 130], // high-mid  1.3–2.8 kHz
];

function getAverageFreq(data: Uint8Array, lo: number, hi: number): number {
  let sum = 0;
  const count = hi - lo;
  for (let i = lo; i < hi && i < data.length; i++) sum += data[i];
  return sum / count / 255;
}

function pickColor(bass: number, mid: number): string {
  if (bass > 0.65) {
    // Gold/amber on bass hit
    const t = Math.min((bass - 0.65) / 0.35, 1);
    const r = Math.round(196 + t * 59);
    const g = Math.round(154 + t * 16);
    const b = Math.round(40 - t * 10);
    return `rgb(${r},${g},${b})`;
  }
  if (mid > 0.5) {
    // Cyan on mid-heavy
    const t = Math.min((mid - 0.5) / 0.5, 1);
    return `rgba(${Math.round(100 + t * 56)},${Math.round(200 + t * 55)},${Math.round(220 + t * 35)},0.9)`;
  }
  // Violet at rest
  const energy = Math.max(bass, mid);
  const alpha = 0.45 + energy * 0.55;
  return `rgba(180,140,255,${alpha.toFixed(2)})`;
}

export function useMobileAudioGlow(
  isPlaying: boolean,
  glowEnabled: boolean,
): MobileAudioGlowState {
  const [state, setState] = useState<MobileAudioGlowState>(DEFAULT_STATE);
  const rafRef = useRef<number | null>(null);
  const peakRef = useRef(0);

  useEffect(() => {
    if (!isPlaying || !glowEnabled) {
      // Cancel any running animation
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setState(DEFAULT_STATE);
      return;
    }

    const tick = () => {
      const analyser = (window as any).__lnAnalyser as AnalyserNode | undefined;
      if (!analyser) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const bufLen = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(freqData);

      // Compute per-bar normalized heights
      const heights = BAR_BIN_RANGES.map(([lo, hi]) =>
        Math.min(1, getAverageFreq(freqData, lo, hi) * 2.5)
      );

      // Bass and mid for color selection
      const bass = getAverageFreq(freqData, 1, 10);
      const mid = getAverageFreq(freqData, 10, 60);

      // Peak/decay envelope for glow intensity
      const energy = bass * 0.7 + mid * 0.3;
      if (energy > peakRef.current * 1.15) {
        peakRef.current = energy;
      } else {
        peakRef.current *= 0.88;
      }
      const peak = Math.min(peakRef.current, 1);

      const color = pickColor(bass, mid);
      const glowIntensity = peak * 12;
      const shadow = peak > 0.1
        ? `0 0 ${glowIntensity}px ${glowIntensity / 2}px ${color}`
        : "none";

      setState({ barHeights: heights, glowColor: color, glowShadow: shadow });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, glowEnabled]);

  return state;
}
