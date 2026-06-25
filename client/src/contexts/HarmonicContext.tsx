/**
 * HarmonicContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides the platform-wide harmonic signature derived from the currently
 * playing song's Witness ID. Any component in the tree can consume this via
 * `useHarmonic()` without prop drilling or duplicate computation.
 *
 * Architecture:
 *  - Reads `witnessId` and `isPlaying` from PlayerContext
 *  - Derives the harmonic signature once per track change (memoized)
 *  - Exposes { harmonicSig, isPlaying, hue, glowColor, navGlow } to consumers
 *
 * Design:
 *  - When music is playing, the harmonic signature is fully active
 *  - When paused/idle, the signature fades to the platform null gold identity
 *    (this is handled by consumers via the `isPlaying` flag — the context
 *    always provides the current track's signature regardless of play state)
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  useHarmonicSignature,
  type HarmonicSignature,
  NULL_SIGNATURE,
} from "@/hooks/useHarmonicSignature";

/* ── Context shape ──────────────────────────────────────────────────────── */
export interface HarmonicContextValue {
  /** Full harmonic signature for the current track */
  harmonicSig: HarmonicSignature;
  /** Whether music is currently playing */
  isPlaying: boolean;
  /** Convenience: the derived hue in degrees */
  hue: number;
  /** Convenience: the primary glow color string */
  glowColor: string;
  /**
   * A very subtle CSS box-shadow string for the navigation bar bottom edge.
   * Only meaningful when isPlaying is true.
   * Designed to be barely perceptible — the cathedral breathing, not shouting.
   */
  navGlow: string;
  /**
   * A subtle CSS background tint for the navigation bar.
   * Adds a barely-visible warm shift toward the harmonic hue.
   */
  navTint: string;
  /**
   * Waveform stroke color — the primary color for the oscilloscope line,
   * shifted toward the harmonic hue while remaining within the sacred palette.
   */
  waveformColor: string;
  /**
   * Waveform glow color — the shadow/bloom color for the waveform canvas.
   */
  waveformGlow: string;
}

/* ── Default value (no track playing) ──────────────────────────────────── */
const DEFAULT_VALUE: HarmonicContextValue = {
  harmonicSig: NULL_SIGNATURE,
  isPlaying: false,
  hue: 43,
  glowColor: "rgba(212,175,55,0.35)",
  navGlow: "none",
  navTint: "transparent",
  waveformColor: "rgba(212,175,55,0.75)",
  waveformGlow: "rgba(212,175,55,0.35)",
};

const HarmonicCtx = createContext<HarmonicContextValue>(DEFAULT_VALUE);

/* ── Provider ───────────────────────────────────────────────────────────── */
export function HarmonicProvider({ children }: { children: ReactNode }) {
  const { state } = usePlayer();
  const currentTrack = state.tracks[state.currentIdx];

  // Derive the harmonic signature from the current track's witnessId.
  // The hook is memoized — only recomputes when witnessId changes.
  const harmonicSig = useHarmonicSignature(
    currentTrack?.witnessId ?? null,
    null, // ecdsaSignature not available in PlayerTrack; witnessId alone is sufficient
  );

  const value = useMemo((): HarmonicContextValue => {
    const { hue, saturation, intensity, glowColor } = harmonicSig;
    const isPlaying = state.isPlaying;

    // Nav bar bottom-edge glow: extremely subtle, only when playing.
    // Two layers: a tight 1px line + a wide 24px diffuse bloom.
    // Opacity is kept very low so it reads as "the platform is alive"
    // rather than "there is a colored border on the nav bar."
    const navGlow = isPlaying
      ? [
          `0 1px 0 0 hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${intensity.toFixed(1)}%, 0.45)`,
          `0 0 24px 0 hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${intensity.toFixed(1)}%, 0.12)`,
        ].join(", ")
      : "none";

    // Nav bar background tint: a barely-visible warm shift.
    // At 0.03 alpha it's imperceptible on its own but creates a cohesive
    // feeling when combined with the bottom-edge glow.
    const navTint = isPlaying
      ? `hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${intensity.toFixed(1)}%, 0.03)`
      : "transparent";

    // Waveform color: shift toward the harmonic hue.
    // Keep alpha high (0.80) so the waveform remains clearly visible.
    const waveformColor = `hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${Math.min(intensity + 15, 70).toFixed(1)}%, 0.80)`;

    // Waveform glow: softer, lower alpha for the shadow bloom.
    const waveformGlow = `hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${intensity.toFixed(1)}%, 0.40)`;

    return {
      harmonicSig,
      isPlaying,
      hue,
      glowColor,
      navGlow,
      navTint,
      waveformColor,
      waveformGlow,
    };
  }, [harmonicSig, state.isPlaying]);

  return <HarmonicCtx.Provider value={value}>{children}</HarmonicCtx.Provider>;
}

/* ── Consumer hook ──────────────────────────────────────────────────────── */
export function useHarmonic(): HarmonicContextValue {
  return useContext(HarmonicCtx);
}
