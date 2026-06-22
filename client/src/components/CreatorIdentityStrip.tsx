/**
 * CreatorIdentityStrip
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact inline identity band rendered in the profile header, directly below
 * the name / bio / badges row on:
 *   • CreatorProfilePage  (/creator/:id)
 *   • CreatorIdentityPage (/identity/:id)
 *   • ProfilePage         (/profile)
 *
 * Layout:
 *   [Fingerprint icon] [Active Medium chips …] · [Origin / Mission one-liner]
 *
 * On mobile the one-liner is hidden; only the medium chips are shown.
 * The strip links to /identity/:creatorId so visitors can dive deeper.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Link } from "wouter";
import { Fingerprint } from "lucide-react";

// ── Medium colour palette (mirrors CreatorIdentitySection) ───────────────────
const MEDIUM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  music:        { bg: "rgba(212,175,55,0.10)",  border: "rgba(212,175,55,0.30)",  text: "#D4AF37" },
  books:        { bg: "rgba(139,92,246,0.10)",  border: "rgba(139,92,246,0.30)",  text: "#A78BFA" },
  comics:       { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.30)",  text: "#60A5FA" },
  manuscripts:  { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.30)",  text: "#FCD34D" },
  video:        { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.30)",   text: "#FCA5A5" },
  research:     { bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.30)",  text: "#6EE7B7" },
  artifacts:    { bg: "rgba(161,140,100,0.10)", border: "rgba(161,140,100,0.30)", text: "#C8B98A" },
  "visual art": { bg: "rgba(236,72,153,0.10)",  border: "rgba(236,72,153,0.30)",  text: "#F9A8D4" },
  other:        { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "rgba(255,255,255,0.45)" },
};

const MEDIUM_LABELS: Record<string, string> = {
  music: "Music", books: "Books", comics: "Comics", manuscripts: "Manuscripts",
  video: "Video", research: "Research", artifacts: "Artifacts",
  "visual art": "Visual Art", other: "Other",
};

function parseMediums(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string); } catch { return []; }
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface CreatorIdentityStripProps {
  creatorId: number;
  activeMediums?: string[] | string | null;
  originStatement?: string | null;
  creativeMission?: string | null;
  /** If true, the strip is not wrapped in a Link (e.g. we're already on the identity page) */
  noLink?: boolean;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CreatorIdentityStrip({
  creatorId,
  activeMediums,
  originStatement,
  creativeMission,
  noLink = false,
  className = "",
}: CreatorIdentityStripProps) {
  const mediums = parseMediums(activeMediums);
  const blurb = (originStatement || creativeMission || "").trim();
  // Truncate blurb to ~100 chars for the inline preview
  const blurbPreview = blurb.length > 100 ? blurb.slice(0, 97) + "…" : blurb;

  const hasContent = mediums.length > 0 || !!blurbPreview;
  if (!hasContent) return null;

  const inner = (
    <div
      className={`flex items-center gap-2 flex-wrap mt-3 px-3 py-2 rounded-xl transition-all ${className}`}
      style={{
        background: "rgba(196,154,40,0.04)",
        border: "1px solid rgba(196,154,40,0.10)",
        cursor: noLink ? "default" : "pointer",
      }}
    >
      {/* Icon */}
      <Fingerprint
        className="w-3.5 h-3.5 flex-shrink-0"
        style={{ color: "rgba(196,154,40,0.5)" }}
      />

      {/* Medium chips */}
      {mediums.map(m => {
        const key = m.toLowerCase();
        const colors = MEDIUM_COLORS[key] ?? MEDIUM_COLORS.other;
        return (
          <span
            key={m}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
          >
            {MEDIUM_LABELS[key] ?? m}
          </span>
        );
      })}

      {/* Blurb — hidden on mobile */}
      {blurbPreview && (
        <>
          {mediums.length > 0 && (
            <span
              className="hidden sm:block w-px h-3 flex-shrink-0"
              style={{ background: "rgba(196,154,40,0.15)" }}
            />
          )}
          <span
            className="hidden sm:block text-[11px] leading-snug flex-1 min-w-0 truncate"
            style={{ color: "rgba(196,154,40,0.55)" }}
          >
            {blurbPreview}
          </span>
        </>
      )}
    </div>
  );

  if (noLink) return inner;

  return (
    <Link href={`/identity/${creatorId}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
      {inner}
    </Link>
  );
}
