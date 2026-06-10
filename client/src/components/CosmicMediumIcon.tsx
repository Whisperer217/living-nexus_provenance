/**
 * CosmicMediumIcon — custom SVG glyphs for each content medium
 * Used on HomePage (Witnessed Works) and UploadPage (medium selector)
 *
 * Design language: deep space, sacred geometry, celestial provenance
 *   Music      — sound wave through a nebula ring (violet/indigo)
 *   Lyrics     — quill pen with star-trail ink (gold/amber)
 *   Manuscripts — scroll with constellation lines (emerald/teal)
 *   Comics     — panel grid with galaxy burst (orange/coral)
 */

import React from "react";

type MediumType = "audio" | "lyrics" | "manuscript" | "comic" | "game";

interface CosmicMediumIconProps {
  medium: MediumType;
  size?: number;
  /** If true, renders the full card with glow halo (homepage). If false, icon only (upload selector) */
  card?: boolean;
  active?: boolean;
  onClick?: () => void;
  count?: number | string;
  label?: string;
}

// ── Color tokens per medium ────────────────────────────────────────────────────
export const MEDIUM_COLORS: Record<MediumType, { primary: string; glow: string; bg: string; border: string }> = {
  audio:      { primary: "#A78BFA",  glow: "rgba(167,139,250,0.35)", bg: "rgba(124,58,237,0.12)",  border: "rgba(167,139,250,0.35)" },
  lyrics:     { primary: "#F5C451",  glow: "rgba(245,196,81,0.35)",  bg: "rgba(208,161,95,0.12)",  border: "rgba(245,196,81,0.40)"  },
  manuscript: { primary: "var(--ln-seal-bright)",  glow: "rgba(74,222,128,0.30)",  bg: "rgba(22,163,74,0.12)",   border: "rgba(74,222,128,0.40)"  },
  comic:      { primary: "#F87171",  glow: "rgba(248,113,113,0.30)", bg: "rgba(220,38,38,0.12)",   border: "rgba(248,113,113,0.40)" },
  game:       { primary: "#34D399",  glow: "rgba(52,211,153,0.30)",  bg: "rgba(16,185,129,0.12)",  border: "rgba(52,211,153,0.40)"  },
};

// ── SVG Glyphs ────────────────────────────────────────────────────────────────

function MusicGlyph({ color, size }: { color: string; size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer nebula ring */}
      <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="0.6" strokeDasharray="3 4" opacity="0.4" />
      {/* Inner ring */}
      <circle cx="24" cy="24" r="15" stroke={color} strokeWidth="0.5" opacity="0.25" />
      {/* Sound wave bars — centered */}
      <rect x="10" y="20" width="3" height="8"  rx="1.5" fill={color} opacity="0.5" />
      <rect x="15" y="16" width="3" height="16" rx="1.5" fill={color} opacity="0.75" />
      <rect x="20" y="12" width="3" height="24" rx="1.5" fill={color} />
      <rect x="25" y="16" width="3" height="16" rx="1.5" fill={color} opacity="0.75" />
      <rect x="30" y="20" width="3" height="8"  rx="1.5" fill={color} opacity="0.5" />
      <rect x="35" y="22" width="3" height="4"  rx="1.5" fill={color} opacity="0.3" />
      {/* Star sparks */}
      <circle cx="7"  cy="10" r="0.8" fill={color} opacity="0.6" />
      <circle cx="41" cy="38" r="0.8" fill={color} opacity="0.6" />
      <circle cx="40" cy="9"  r="0.5" fill={color} opacity="0.4" />
      <circle cx="8"  cy="39" r="0.5" fill={color} opacity="0.4" />
      {/* Constellation lines */}
      <line x1="7" y1="10" x2="10" y2="18" stroke={color} strokeWidth="0.4" opacity="0.3" />
      <line x1="40" y1="9" x2="37" y2="18" stroke={color} strokeWidth="0.4" opacity="0.3" />
    </svg>
  );
}

function LyricsGlyph({ color, size }: { color: string; size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer sacred ring */}
      <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="0.6" strokeDasharray="2 5" opacity="0.35" />
      {/* Quill shaft */}
      <path d="M30 8 C36 12 38 20 32 28 L20 40 L18 36 L28 26 C32 20 30 14 26 12 Z"
        fill={color} opacity="0.15" stroke={color} strokeWidth="0.8" />
      {/* Quill tip */}
      <path d="M18 36 L16 44 L22 40 Z" fill={color} opacity="0.7" />
      {/* Ink star-trail */}
      <path d="M20 38 Q16 34 14 28 Q12 22 16 18" stroke={color} strokeWidth="0.7" strokeDasharray="1.5 2.5" opacity="0.5" fill="none" />
      {/* Star sparks along trail */}
      <circle cx="14" cy="28" r="1.2" fill={color} opacity="0.8" />
      <circle cx="13" cy="22" r="0.8" fill={color} opacity="0.6" />
      <circle cx="16" cy="18" r="0.6" fill={color} opacity="0.5" />
      {/* Constellation dots */}
      <circle cx="8"  cy="8"  r="0.8" fill={color} opacity="0.5" />
      <circle cx="40" cy="12" r="0.6" fill={color} opacity="0.4" />
      <circle cx="42" cy="36" r="0.8" fill={color} opacity="0.5" />
      <circle cx="6"  cy="38" r="0.5" fill={color} opacity="0.3" />
      <line x1="8" y1="8" x2="16" y2="18" stroke={color} strokeWidth="0.4" opacity="0.25" />
      <line x1="40" y1="12" x2="32" y2="18" stroke={color} strokeWidth="0.4" opacity="0.25" />
    </svg>
  );
}

function ManuscriptGlyph({ color, size }: { color: string; size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="0.6" strokeDasharray="4 3" opacity="0.35" />
      {/* Scroll body */}
      <rect x="12" y="13" width="24" height="22" rx="2" stroke={color} strokeWidth="1" fill={color} fillOpacity="0.08" />
      {/* Scroll rollers */}
      <rect x="10" y="11" width="28" height="4" rx="2" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.15" />
      <rect x="10" y="33" width="28" height="4" rx="2" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.15" />
      {/* Text lines */}
      <line x1="16" y1="20" x2="32" y2="20" stroke={color} strokeWidth="0.8" opacity="0.6" />
      <line x1="16" y1="24" x2="32" y2="24" stroke={color} strokeWidth="0.8" opacity="0.6" />
      <line x1="16" y1="28" x2="26" y2="28" stroke={color} strokeWidth="0.8" opacity="0.4" />
      {/* Constellation overlay */}
      <circle cx="7"  cy="7"  r="0.9" fill={color} opacity="0.6" />
      <circle cx="41" cy="7"  r="0.9" fill={color} opacity="0.6" />
      <circle cx="7"  cy="41" r="0.9" fill={color} opacity="0.6" />
      <circle cx="41" cy="41" r="0.9" fill={color} opacity="0.6" />
      <circle cx="24" cy="5"  r="0.7" fill={color} opacity="0.5" />
      <line x1="7" y1="7" x2="41" y2="7"   stroke={color} strokeWidth="0.35" opacity="0.2" />
      <line x1="7" y1="7" x2="7"  y2="41"  stroke={color} strokeWidth="0.35" opacity="0.2" />
      <line x1="41" y1="7" x2="41" y2="41" stroke={color} strokeWidth="0.35" opacity="0.2" />
      <line x1="7" y1="41" x2="41" y2="41" stroke={color} strokeWidth="0.35" opacity="0.2" />
    </svg>
  );
}

function GameGlyph({ color, size }: { color: string; size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="0.6" strokeDasharray="3 4" opacity="0.35" />
      {/* Controller body */}
      <rect x="10" y="17" width="28" height="14" rx="7" stroke={color} strokeWidth="1" fill={color} fillOpacity="0.08" />
      {/* D-pad left side */}
      <rect x="14" y="22" width="5" height="2" rx="1" fill={color} opacity="0.7" />
      <rect x="15.5" y="20.5" width="2" height="5" rx="1" fill={color} opacity="0.7" />
      {/* Buttons right side */}
      <circle cx="32" cy="22" r="1.5" fill={color} opacity="0.8" />
      <circle cx="35" cy="24" r="1.5" fill={color} opacity="0.6" />
      <circle cx="32" cy="26" r="1.5" fill={color} opacity="0.5" />
      <circle cx="29" cy="24" r="1.5" fill={color} opacity="0.6" />
      {/* Center button */}
      <circle cx="24" cy="24" r="2" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.2" />
      {/* Star sparks */}
      <circle cx="7"  cy="9"  r="0.8" fill={color} opacity="0.6" />
      <circle cx="41" cy="9"  r="0.8" fill={color} opacity="0.6" />
      <circle cx="7"  cy="39" r="0.8" fill={color} opacity="0.5" />
      <circle cx="41" cy="39" r="0.8" fill={color} opacity="0.5" />
      <line x1="7" y1="9" x2="12" y2="17" stroke={color} strokeWidth="0.4" opacity="0.25" />
      <line x1="41" y1="9" x2="36" y2="17" stroke={color} strokeWidth="0.4" opacity="0.25" />
    </svg>
  );
}

function ComicGlyph({ color, size }: { color: string; size: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="24" cy="24" r="21" stroke={color} strokeWidth="0.6" strokeDasharray="3 4" opacity="0.35" />
      {/* Panel grid */}
      <rect x="10" y="10" width="12" height="12" rx="1.5" stroke={color} strokeWidth="0.9" fill={color} fillOpacity="0.08" />
      <rect x="26" y="10" width="12" height="12" rx="1.5" stroke={color} strokeWidth="0.9" fill={color} fillOpacity="0.08" />
      <rect x="10" y="26" width="12" height="12" rx="1.5" stroke={color} strokeWidth="0.9" fill={color} fillOpacity="0.08" />
      <rect x="26" y="26" width="12" height="12" rx="1.5" stroke={color} strokeWidth="0.9" fill={color} fillOpacity="0.08" />
      {/* Galaxy burst from center */}
      <circle cx="24" cy="24" r="3" fill={color} opacity="0.5" />
      <line x1="24" y1="24" x2="24" y2="16" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <line x1="24" y1="24" x2="24" y2="32" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <line x1="24" y1="24" x2="16" y2="24" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <line x1="24" y1="24" x2="32" y2="24" stroke={color} strokeWidth="0.6" opacity="0.5" />
      <line x1="24" y1="24" x2="19" y2="19" stroke={color} strokeWidth="0.5" opacity="0.35" />
      <line x1="24" y1="24" x2="29" y2="19" stroke={color} strokeWidth="0.5" opacity="0.35" />
      <line x1="24" y1="24" x2="19" y2="29" stroke={color} strokeWidth="0.5" opacity="0.35" />
      <line x1="24" y1="24" x2="29" y2="29" stroke={color} strokeWidth="0.5" opacity="0.35" />
      {/* Star sparks */}
      <circle cx="6"  cy="6"  r="0.8" fill={color} opacity="0.6" />
      <circle cx="42" cy="6"  r="0.8" fill={color} opacity="0.6" />
      <circle cx="6"  cy="42" r="0.8" fill={color} opacity="0.6" />
      <circle cx="42" cy="42" r="0.8" fill={color} opacity="0.6" />
    </svg>
  );
}

const GLYPHS: Record<MediumType, React.FC<{ color: string; size: number }>> = {
  audio:      MusicGlyph,
  lyrics:     LyricsGlyph,
  manuscript: ManuscriptGlyph,
  comic:      ComicGlyph,
  game:       GameGlyph,
};

export const MEDIUM_LABELS: Record<MediumType, string> = {
  audio:      "Music",
  lyrics:     "Lyrics",
  manuscript: "Manuscripts",
  comic:      "Comics",
  game:       "Games",
};

// ── Main component ─────────────────────────────────────────────────────────────

export function CosmicMediumIcon({
  medium,
  size = 40,
  card = false,
  active = false,
  onClick,
  count,
  label,
}: CosmicMediumIconProps) {
  const colors = MEDIUM_COLORS[medium];
  const Glyph = GLYPHS[medium];
  const displayLabel = label ?? MEDIUM_LABELS[medium];

  // Micro mode — tiny badge, no label, no wrapper (for card thumbnails)
  if (!card && size <= 12) {
    return (
      <span className="inline-flex items-center justify-center" style={{ width: size + 4, height: size + 4 }}>
        <Glyph color={colors.primary} size={size} />
      </span>
    );
  }

  if (!card) {
    // Icon-only mode (upload selector button)
    return (
      <button
        onClick={onClick}
        className="relative flex flex-col items-center justify-center gap-2 rounded-xl p-3 transition-all duration-300 cursor-pointer"
        style={{
          background: active ? colors.bg : "var(--ln-coal)",
          border: `1px solid ${active ? colors.border.replace("0.25", "0.6") : colors.border}`,
          boxShadow: active ? `0 0 18px ${colors.glow}, inset 0 0 12px ${colors.glow.replace("0.35", "0.08")}` : "none",
        }}
      >
        {/* Glow halo behind icon */}
        {active && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${colors.glow.replace("0.35", "0.18")} 0%, transparent 70%)`,
            }}
          />
        )}
        <Glyph color={colors.primary} size={size} />
        <span
          className="text-xs font-semibold tracking-wide leading-none"
          style={{ fontFamily: "'Cinzel', serif", color: active ? colors.primary : "var(--ln-smoke)" }}
        >
          {displayLabel}
        </span>
      </button>
    );
  }

  // Card mode (homepage Witnessed Works)
  return (
    <div
      className="relative flex items-center gap-3 rounded-xl px-3 py-3 overflow-hidden"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Ambient glow blob */}
      <div
        className="absolute -top-4 -left-4 w-16 h-16 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)` }}
      />
      {/* Particle dust — 3 micro dots */}
      <div className="absolute top-1 right-3 w-0.5 h-0.5 rounded-full" style={{ background: colors.primary, opacity: 0.5 }} />
      <div className="absolute bottom-2 right-6 w-0.5 h-0.5 rounded-full" style={{ background: colors.primary, opacity: 0.35 }} />
      <div className="absolute top-3 right-8 w-px h-px rounded-full" style={{ background: colors.primary, opacity: 0.4 }} />

      {/* Icon */}
      <div className="relative flex-shrink-0">
        <Glyph color={colors.primary} size={size} />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1 relative">
        <p
          className="text-[11px] font-semibold leading-none tracking-wider uppercase"
          style={{ fontFamily: "'Cinzel', serif", color: colors.primary }}
        >
          {displayLabel}
        </p>
        <p
          className="text-[12px] font-mono mt-1 tabular-nums font-bold"
          style={{ color: count && count !== "—" ? "var(--ln-parchment)" : "var(--ln-iron)" }}
        >
          {count ?? "—"}
        </p>
      </div>
    </div>
  );
}

export default CosmicMediumIcon;
