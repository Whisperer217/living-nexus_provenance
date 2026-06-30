/**
 * useFontSize — three-level font size toggle for Compose / Keeper interfaces
 *
 * Levels: "sm" | "md" | "lg"
 * Persists to localStorage under key "ln-compose-font-size"
 * Exposes CSS multipliers consumed by KeeperComposePage inline styles.
 */

import { useState, useCallback } from "react";

export type FontSizeLevel = "sm" | "md" | "lg";

const STORAGE_KEY = "ln-compose-font-size";

/** Scale factors applied to base compose font sizes */
export const FONT_SCALE: Record<FontSizeLevel, number> = {
  sm: 0.88,
  md: 1.0,
  lg: 1.22,
};

/**
 * Resolved rem values for each level.
 * These are the actual font sizes used in KeeperComposePage output text.
 *
 *   Lyrics body (Georgia serif):
 *     sm → 0.82rem  (≈13px)
 *     md → 0.95rem  (≈15px)  ← default
 *     lg → 1.18rem  (≈19px)
 *
 *   Terminal labels (Space Mono):
 *     sm → 0.52rem  (≈8px)
 *     md → 0.60rem  (≈10px) ← default
 *     lg → 0.74rem  (≈12px)
 */
export const FONT_SIZES: Record<FontSizeLevel, {
  lyricsBody: string;
  terminalLabel: string;
  terminalSm: string;
  terminalMd: string;
  terminalLg: string;
  lineHeight: number;
}> = {
  sm: {
    lyricsBody:     "0.82rem",
    terminalLabel:  "0.52rem",
    terminalSm:     "0.55rem",
    terminalMd:     "0.65rem",
    terminalLg:     "0.78rem",
    lineHeight:     1.8,
  },
  md: {
    lyricsBody:     "0.95rem",
    terminalLabel:  "0.60rem",
    terminalSm:     "0.65rem",
    terminalMd:     "0.75rem",
    terminalLg:     "0.90rem",
    lineHeight:     2.0,
  },
  lg: {
    lyricsBody:     "1.18rem",
    terminalLabel:  "0.74rem",
    terminalSm:     "0.80rem",
    terminalMd:     "0.92rem",
    terminalLg:     "1.10rem",
    lineHeight:     2.2,
  },
};

function readStoredLevel(): FontSizeLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "sm" || stored === "md" || stored === "lg") return stored;
  } catch {
    // SSR / private browsing — ignore
  }
  return "md";
}

export function useFontSize() {
  const [level, setLevelState] = useState<FontSizeLevel>(readStoredLevel);

  const setLevel = useCallback((next: FontSizeLevel) => {
    setLevelState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const cycle = useCallback(() => {
    setLevel(level === "sm" ? "md" : level === "md" ? "lg" : "sm");
  }, [level, setLevel]);

  return { level, setLevel, cycle, sizes: FONT_SIZES[level] };
}
