/**
 * useHarmonicSignature
 * ─────────────────────────────────────────────────────────────────────────────
 * Derives a deterministic, unique visual identity from a song's ECDSA Witness
 * ID signature. Each song's cryptographic provenance becomes a distinct color
 * temperature and intensity — the song's soul made visible.
 *
 * Design constraints:
 *  - Pure deterministic hash: no async, no Web Crypto, no canvas
 *  - Output is stable: same WID + signature always produces the same colors
 *  - Palette is constrained to the sacred aesthetic: warm golds, deep purples,
 *    crimson reds, and cool ambers — never neon, never garish
 *  - Performance: runs once per song change (memoized), zero RAF cost
 *
 * Algorithm:
 *  1. Concatenate witnessId + ecdsaSignature (or witnessId alone as fallback)
 *  2. Run a fast 32-bit FNV-1a hash over the UTF-16 code units
 *  3. Extract three independent sub-hashes from different bit regions
 *  4. Map each sub-hash to a constrained aesthetic range
 *
 * Output:
 *  { hue, saturation, intensity, glowColor, borderColor, pulseColor }
 *  All values are ready for direct use in CSS / inline styles.
 */

import { useMemo } from "react";

/* ── Aesthetic palette constraints ─────────────────────────────────────────
 * These ranges define the "sacred cathedral" palette. Hue is mapped to a
 * weighted distribution across the three dominant color families:
 *
 *  Warm gold / amber  →  30°–55°   (40% weight — the primary sacred tone)
 *  Deep crimson / rose → 340°–360° (30% weight — testimony, sacrifice)
 *  Royal purple / indigo → 260°–290° (30% weight — mystery, depth)
 *
 * Saturation is kept moderate (45–75%) so the glow reads as luminous, not
 * saturated. Intensity (lightness for the glow layer) is kept low (35–55%)
 * so it feels like inner light, not a spotlight.
 * ─────────────────────────────────────────────────────────────────────── */
const PALETTE_BANDS = [
  { hueMin: 30,  hueMax: 55,  weight: 40 },  // warm gold / amber
  { hueMin: 340, hueMax: 360, weight: 30 },  // deep crimson / rose
  { hueMin: 260, hueMax: 290, weight: 30 },  // royal purple / indigo
] as const;

const SAT_MIN = 45;
const SAT_MAX = 75;
const INTENSITY_MIN = 35;
const INTENSITY_MAX = 55;

/* ── FNV-1a 32-bit hash ─────────────────────────────────────────────────── */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Multiply by FNV prime (32-bit), keep within 32-bit unsigned range
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0; // force unsigned 32-bit
  }
  return hash >>> 0;
}

/* ── Sub-hash extraction ────────────────────────────────────────────────── */
// Derive three independent values from the same seed by hashing with different
// salts. This avoids correlation between the three output dimensions.
function deriveSubHash(seed: number, salt: string): number {
  return fnv1a32(`${seed.toString(16)}:${salt}`);
}

/* ── Map a 32-bit unsigned int to a float in [0, 1) ─────────────────────── */
function toUnit(hash: number): number {
  return (hash >>> 0) / 0xffffffff;
}

/* ── Palette band selection ─────────────────────────────────────────────── */
function selectHue(t: number): number {
  // t is in [0, 1). Map to weighted palette bands.
  const totalWeight = PALETTE_BANDS.reduce((s, b) => s + b.weight, 0);
  let cursor = 0;
  for (const band of PALETTE_BANDS) {
    cursor += band.weight / totalWeight;
    if (t < cursor) {
      // t within this band — map linearly to hue range
      const bandT = (t - (cursor - band.weight / totalWeight)) / (band.weight / totalWeight);
      return band.hueMin + bandT * (band.hueMax - band.hueMin);
    }
  }
  return PALETTE_BANDS[0].hueMin; // fallback
}

/* ── Linear interpolation ───────────────────────────────────────────────── */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ── Output type ────────────────────────────────────────────────────────── */
export interface HarmonicSignature {
  /** HSL hue in degrees (0–360) */
  hue: number;
  /** HSL saturation percentage (45–75) */
  saturation: number;
  /** Perceived intensity / lightness (35–55) */
  intensity: number;
  /** Primary glow color — used for border and outer glow */
  glowColor: string;
  /** Slightly lighter variant for the inner highlight edge */
  borderColor: string;
  /** Slightly warmer/brighter variant for the breathing pulse peak */
  pulseColor: string;
  /** CSS box-shadow string for the expanded player border glow */
  expandedGlowShadow: string;
  /** CSS border string for the expanded player */
  expandedBorder: string;
}

/* ── Null signature (no WID available) ─────────────────────────────────── */
// When no WID is available, return the platform's default gold identity.
export const NULL_SIGNATURE: HarmonicSignature = {
  hue: 43,
  saturation: 60,
  intensity: 45,
  glowColor: "rgba(212,175,55,0.35)",
  borderColor: "rgba(212,175,55,0.55)",
  pulseColor: "rgba(245,230,179,0.45)",
  expandedGlowShadow: [
    "0 0 0 1px rgba(212,175,55,0.45)",
    "0 0 24px 4px rgba(212,175,55,0.18)",
    "0 0 64px 12px rgba(212,175,55,0.08)",
    "inset 0 0 32px rgba(212,175,55,0.04)",
  ].join(", "),
  expandedBorder: "1px solid rgba(212,175,55,0.45)",
};

/* ── Main derivation function ───────────────────────────────────────────── */
function deriveHarmonicSignature(
  witnessId: string | null | undefined,
  ecdsaSignature: string | null | undefined,
): HarmonicSignature {
  if (!witnessId) return NULL_SIGNATURE;

  // Seed: concatenate the available cryptographic material
  const seed = fnv1a32(`${witnessId}:${ecdsaSignature ?? "unsigned"}`);

  // Three independent sub-hashes for hue, saturation, intensity
  const hueHash    = deriveSubHash(seed, "hue");
  const satHash    = deriveSubHash(seed, "sat");
  const intHash    = deriveSubHash(seed, "int");

  const hue        = selectHue(toUnit(hueHash));
  const saturation = lerp(SAT_MIN, SAT_MAX, toUnit(satHash));
  const intensity  = lerp(INTENSITY_MIN, INTENSITY_MAX, toUnit(intHash));

  // Build color strings
  // Primary glow: hsl at derived values, low alpha for subtlety
  const glowColor   = `hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${intensity.toFixed(1)}%, 0.35)`;
  // Border highlight: slightly lighter and more opaque
  const borderColor = `hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${Math.min(intensity + 12, 72).toFixed(1)}%, 0.55)`;
  // Pulse peak: warmer, brighter — used at the 50% keyframe of the breathing animation
  const pulseColor  = `hsla(${hue.toFixed(1)}, ${Math.min(saturation + 8, 85).toFixed(1)}%, ${Math.min(intensity + 18, 78).toFixed(1)}%, 0.45)`;

  // Layered box-shadow: outer diffuse → mid glow → inner bloom → inset warmth
  const expandedGlowShadow = [
    `0 0 0 1px ${borderColor}`,                                                                       // crisp border ring
    `0 0 24px 4px ${glowColor}`,                                                                      // mid diffuse glow
    `0 0 64px 12px hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${intensity.toFixed(1)}%, 0.10)`, // wide soft halo
    `inset 0 0 32px hsla(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${intensity.toFixed(1)}%, 0.05)`, // inner warmth
  ].join(", ");

  const expandedBorder = `1px solid ${borderColor}`;

  return {
    hue,
    saturation,
    intensity,
    glowColor,
    borderColor,
    pulseColor,
    expandedGlowShadow,
    expandedBorder,
  };
}

/* ── React hook ─────────────────────────────────────────────────────────── */
export function useHarmonicSignature(
  witnessId: string | null | undefined,
  ecdsaSignature: string | null | undefined,
): HarmonicSignature {
  return useMemo(
    () => deriveHarmonicSignature(witnessId, ecdsaSignature),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [witnessId ?? "", ecdsaSignature ?? ""],
  );
}
