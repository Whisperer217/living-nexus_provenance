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
<<<<<<< Updated upstream
 *   Music / Audio  → Gold    (#C49A28)  — signature LN color
 *   Lyrics Only    → Blue    (#4A9DBF)  — intellectual, textual
 *   Manuscript     → Bone    (#C9C0A8)  — literal paper/document
 *   Comic / Novel  → Ember   (#C4440A)  — energy, visual pop
 *
 * Border brightness now matches the Upload page palette:
 *   default border → rgba(accent, 0.40)  (was a dark hex, barely visible)
 *   chip border    → rgba(accent, 0.28)
 *   glow           → rgba(accent, 0.30)
=======
 *   Music / Audio  → Gold    (#C49A28 / --ln-gold)
 *   Lyrics Only    → Blue    (#4A9DBF / --ln-witness-bright)
 *   Manuscript     → Bone    (#C9C0A8 / --ln-bone)
 *   Comic / Novel  → Ember   (#C4440A / --ln-ember)
>>>>>>> Stashed changes
 */

export type ContentType = "audio" | "lyrics" | "manuscript" | "comic" | string;

export interface ContentTypeColors {
  /** Primary accent — used for active borders, pill backgrounds */
  primary: string;
  /** Dimmed variant — used for inactive card borders */
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
<<<<<<< Updated upstream
    primary:    "#C49A28",               // --ln-gold — the signature LN color for music
    dim:        "rgba(196,154,40,0.40)", // matches Upload page active border
    glow:       "rgba(196,154,40,0.30)",
    text:       "#E8B840",               // --ln-gold-hot
    chipBg:     "rgba(196,154,40,0.10)",
    chipBorder: "rgba(196,154,40,0.28)",
=======
    primary:    "#C49A28",              // --ln-gold — the signature LN color for music
    dim:        "rgba(196,154,40,0.40)", // visible against dark card bg (matches Upload page)
    glow:       "rgba(196,154,40,0.30)",
    text:       "#E8B840",              // --ln-gold-hot
    chipBg:     "rgba(196,154,40,0.10)",
    chipBorder: "rgba(196,154,40,0.35)",
>>>>>>> Stashed changes
    label:      "Music",
    icon:       "🎵",
  },
  lyrics: {
<<<<<<< Updated upstream
    primary:    "#4A9DBF",               // --ln-witness-bright — intellectual, textual
    dim:        "rgba(74,157,191,0.40)",
    glow:       "rgba(74,157,191,0.28)",
    text:       "#7BBFD8",
    chipBg:     "rgba(74,157,191,0.10)",
    chipBorder: "rgba(74,157,191,0.28)",
=======
    primary:    "#4A9DBF",              // --ln-witness-bright — intellectual, textual
    dim:        "rgba(74,157,191,0.40)", // visible against dark card bg
    glow:       "rgba(74,157,191,0.30)",
    text:       "#7BBFD8",
    chipBg:     "rgba(74,157,191,0.10)",
    chipBorder: "rgba(74,157,191,0.35)",
>>>>>>> Stashed changes
    label:      "Lyrics",
    icon:       "✍️",
  },
  manuscript: {
    primary:    "#C9C0A8",               // --ln-bone — literal paper/document color
<<<<<<< Updated upstream
    dim:        "rgba(201,192,168,0.38)",
    glow:       "rgba(201,192,168,0.25)",
    text:       "#E8DFC8",               // --ln-parchment
    chipBg:     "rgba(201,192,168,0.10)",
    chipBorder: "rgba(201,192,168,0.28)",
=======
    dim:        "rgba(201,192,168,0.38)", // visible against dark card bg
    glow:       "rgba(201,192,168,0.25)",
    text:       "#E8DFC8",               // --ln-parchment
    chipBg:     "rgba(201,192,168,0.10)",
    chipBorder: "rgba(201,192,168,0.35)",
>>>>>>> Stashed changes
    label:      "Manuscript",
    icon:       "📖",
  },
  comic: {
<<<<<<< Updated upstream
    primary:    "#C4440A",               // --ln-ember — energy, visual pop
    dim:        "rgba(196,68,10,0.40)",
    glow:       "rgba(196,68,10,0.28)",
    text:       "#E06030",
    chipBg:     "rgba(196,68,10,0.10)",
    chipBorder: "rgba(196,68,10,0.28)",
=======
    primary:    "#C4440A",              // --ln-ember — energy, visual pop
    dim:        "rgba(196,68,10,0.40)", // visible against dark card bg
    glow:       "rgba(196,68,10,0.30)",
    text:       "#E06030",
    chipBg:     "rgba(196,68,10,0.10)",
    chipBorder: "rgba(196,68,10,0.35)",
>>>>>>> Stashed changes
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
