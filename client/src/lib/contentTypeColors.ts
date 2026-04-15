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
 *   Lyrics Only    → Gold    (#F5C451 / #B8860B)   — existing WID gold, elevated
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
    primary:    "#C49A28",   // --ln-gold — the signature LN color for music
    dim:        "#8B6914",   // --ln-gold-dim
    glow:       "rgba(196,154,40,0.25)",
    text:       "#E8B840",   // --ln-gold-hot
    chipBg:     "rgba(196,154,40,0.08)",
    chipBorder: "rgba(196,154,40,0.20)",
    label:      "Music",
    icon:       "🎵",
  },
  lyrics: {
    primary:    "#4A9DBF",   // --ln-witness-bright — intellectual, textual
    dim:        "#2A6B8A",   // --ln-witness
    glow:       "rgba(74,157,191,0.25)",
    text:       "#7BBFD8",
    chipBg:     "rgba(74,157,191,0.08)",
    chipBorder: "rgba(74,157,191,0.20)",
    label:      "Lyrics",
    icon:       "✍️",
  },
  manuscript: {
    primary:    "#C9C0A8",   // --ln-bone — literal paper/document color
    dim:        "#6B6555",   // --ln-smoke
    glow:       "rgba(201,192,168,0.20)",
    text:       "#E8DFC8",   // --ln-parchment
    chipBg:     "rgba(201,192,168,0.08)",
    chipBorder: "rgba(201,192,168,0.20)",
    label:      "Manuscript",
    icon:       "📖",
  },
  comic: {
    primary:    "#C4440A",   // --ln-ember — energy, visual pop
    dim:        "#8B1A0A",   // --ln-blood
    glow:       "rgba(196,68,10,0.25)",
    text:       "#E06030",
    chipBg:     "rgba(196,68,10,0.08)",
    chipBorder: "rgba(196,68,10,0.20)",
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
