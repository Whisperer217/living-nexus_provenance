/**
 * LIVING NEXUS — Content-Type Color System
 *
 * Each content type has a distinct accent color that appears on:
 *   - Card border glow (active/hover state)
 *   - Genre / category chips
 *   - WID pill accent ring
 *   - Medium selector tiles (upload page)
 *   - Detail page header accent bar
 *
 * Palette:
 *   Music / Audio  → Purple  (#A78BFA / #7C3AED)
 *   Lyrics Only    → Gold    (#F5C451 / #D0A15F)   — existing WID gold, elevated
 *   Manuscript     → Green   (#4ADE80 / #16A34A)
 *   Comic / Novel  → Red     (#F87171 / #DC2626)
 */

export type ContentType = "audio" | "lyrics" | "manuscript" | "comic" | string;

export interface ContentTypeColors {
  /** Primary accent — used for active borders, pill backgrounds */
  primary: string;
  /** Dimmed variant — used for inactive borders, muted text */
  dim: string;
  /** Glow color for box-shadow */
  glow: string;
  /** Text color on a dark background */
  text: string;
  /** Chip background (semi-transparent) */
  chipBg: string;
  /** Chip border */
  chipBorder: string;
  /** Human-readable label */
  label: string;
  /** Emoji icon */
  icon: string;
}

const COLORS: Record<string, ContentTypeColors> = {
  audio: {
    primary:    "#A78BFA",
    dim:        "#7C3AED",
    glow:       "rgba(167,139,250,0.35)",
    text:       "#C4B5FD",
    chipBg:     "rgba(124,58,237,0.18)",
    chipBorder: "rgba(167,139,250,0.45)",
    label:      "Music",
    icon:       "🎵",
  },
  lyrics: {
    primary:    "#F5C451",
    dim:        "#D0A15F",
    glow:       "rgba(245,196,81,0.35)",
    text:       "#F5E6C8",
    chipBg:     "rgba(208,161,95,0.18)",
    chipBorder: "rgba(245,196,81,0.45)",
    label:      "Lyrics",
    icon:       "✍️",
  },
  manuscript: {
    primary:    "#4ADE80",
    dim:        "#16A34A",
    glow:       "rgba(74,222,128,0.30)",
    text:       "#86EFAC",
    chipBg:     "rgba(22,163,74,0.18)",
    chipBorder: "rgba(74,222,128,0.45)",
    label:      "Manuscript",
    icon:       "📖",
  },
  comic: {
    primary:    "#F87171",
    dim:        "#DC2626",
    glow:       "rgba(248,113,113,0.30)",
    text:       "#FCA5A5",
    chipBg:     "rgba(220,38,38,0.18)",
    chipBorder: "rgba(248,113,113,0.45)",
    label:      "Comic / Novel",
    icon:       "🎨",
  },
};

/** Fallback for unknown types */
const FALLBACK: ContentTypeColors = COLORS.audio;

/**
 * Resolve a content type string (from DB or upload form) to its color tokens.
 * Handles aliases: "music" → audio, "novel" → comic, etc.
 */
export function getContentTypeColors(contentType?: string | null): ContentTypeColors {
  if (!contentType) return FALLBACK;
  const key = contentType.toLowerCase().trim();
  if (key === "audio" || key === "music") return COLORS.audio;
  if (key === "lyrics" || key === "lyrics_only") return COLORS.lyrics;
  if (key === "manuscript") return COLORS.manuscript;
  if (key === "comic" || key === "novel" || key === "comic_novel") return COLORS.comic;
  return FALLBACK;
}

export { COLORS as CONTENT_TYPE_COLORS };
