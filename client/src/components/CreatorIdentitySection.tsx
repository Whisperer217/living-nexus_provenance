/**
 * CreatorIdentitySection
 *
 * Public-facing identity block rendered on /creator/:id.
 * Displays Origin Statement, Creative Mission, Active Mediums chips,
 * and expandable Creative Philosophy / Doctrine / Archive Continuity.
 *
 * Identity is a first-class domain object:
 *   Creator → Identity → Manifestations → Provenance → Discovery
 */

import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, Fingerprint, Compass, BookOpen, Layers } from "lucide-react";

const MEDIUM_LABELS: Record<string, string> = {
  music: "Music",
  books: "Books",
  comics: "Comics",
  manuscripts: "Manuscripts",
  video: "Video",
  research: "Research",
  artifacts: "Artifacts",
  "visual art": "Visual Art",
  other: "Other",
};

const MEDIUM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  music:       { bg: "rgba(212,175,55,0.12)",  border: "rgba(212,175,55,0.35)",  text: "#D4AF37" },
  books:       { bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.35)",  text: "#A78BFA" },
  comics:      { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.35)",  text: "#60A5FA" },
  manuscripts: { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)",  text: "#FCD34D" },
  video:       { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.35)",   text: "#FCA5A5" },
  research:    { bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.35)",  text: "#6EE7B7" },
  artifacts:   { bg: "rgba(161,140,100,0.12)", border: "rgba(161,140,100,0.35)", text: "#C8B98A" },
  "visual art":{ bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.35)",  text: "#F9A8D4" },
  other:       { bg: "rgba(255,255,255,0.06)",  border: "rgba(255,255,255,0.15)", text: "rgba(255,255,255,0.55)" },
};

interface CreatorIdentitySectionProps {
  creator: {
    id: number;
    originStatement?: string | null;
    creativeMission?: string | null;
    activeMediums?: string[] | string | null;
    creativePhilosophy?: string | null;
    creativeDoctrine?: string | null;
    archiveContinuity?: string | null;
  };
  isOwner: boolean;
}

function parseMediams(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string); } catch { return []; }
}

export function CreatorIdentitySection({ creator, isOwner }: CreatorIdentitySectionProps) {
  const [expanded, setExpanded] = useState(false);

  const mediums = parseMediams(creator.activeMediums);
  const hasOrigin   = !!creator.originStatement?.trim();
  const hasMission  = !!creator.creativeMission?.trim();
  const hasMediums  = mediums.length > 0;
  const hasExpanded = !!(
    creator.creativePhilosophy?.trim() ||
    creator.creativeDoctrine?.trim() ||
    creator.archiveContinuity?.trim()
  );

  const hasAnyIdentity = hasOrigin || hasMission || hasMediums || hasExpanded;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!hasAnyIdentity) {
    return (
      <div
        className="rounded-xl px-6 py-5 mb-6"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-3">
          <Fingerprint className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'Cinzel', serif", letterSpacing: "0.05em" }}>
            Creator identity has not yet been completed.
          </p>
          {isOwner && (
            <Link href="/profile?tab=identity">
              <span
                className="ml-auto text-xs px-3 py-1 rounded-lg cursor-pointer flex-shrink-0 transition-all hover:opacity-80"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  color: "#D4AF37",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.06em",
                }}
              >
                Establish Identity →
              </span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Populated state ────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl mb-6 overflow-hidden"
      style={{
        background: "rgba(10,8,18,0.7)",
        border: "1px solid rgba(212,175,55,0.18)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{
          borderBottom: "1px solid rgba(212,175,55,0.1)",
          background: "rgba(212,175,55,0.04)",
        }}
      >
        <Fingerprint className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#D4AF37" }} />
        <span
          className="text-[10px] tracking-[0.18em] uppercase"
          style={{ color: "#D4AF37", fontFamily: "'Cinzel', serif" }}
        >
          Creator Identity
        </span>
        {isOwner && (
          <Link href="/profile?tab=identity">
            <span
              className="ml-auto text-[10px] px-2.5 py-0.5 rounded cursor-pointer transition-all hover:opacity-80"
              style={{
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.25)",
                color: "rgba(212,175,55,0.7)",
                fontFamily: "'Cinzel', serif",
                letterSpacing: "0.08em",
              }}
            >
              Edit
            </span>
          </Link>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Active Mediums */}
        {hasMediums && (
          <div className="flex flex-wrap gap-2">
            {mediums.map((m) => {
              const key = m.toLowerCase();
              const colors = MEDIUM_COLORS[key] ?? MEDIUM_COLORS.other;
              return (
                <span
                  key={m}
                  className="text-[11px] px-3 py-1 rounded-full"
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.06em",
                  }}
                >
                  {MEDIUM_LABELS[key] ?? m}
                </span>
              );
            })}
          </div>
        )}

        {/* Origin Statement */}
        {hasOrigin && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(212,175,55,0.5)" }} />
              <span
                className="text-[9px] tracking-[0.16em] uppercase"
                style={{ color: "rgba(212,175,55,0.5)", fontFamily: "'Cinzel', serif" }}
              >
                Origin Statement
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.78)",
                fontFamily: "'Crimson Text', Georgia, serif",
                fontSize: "0.925rem",
                lineHeight: "1.75",
              }}
            >
              {creator.originStatement}
            </p>
          </div>
        )}

        {/* Creative Mission */}
        {hasMission && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(212,175,55,0.5)" }} />
              <span
                className="text-[9px] tracking-[0.16em] uppercase"
                style={{ color: "rgba(212,175,55,0.5)", fontFamily: "'Cinzel', serif" }}
              >
                Creative Mission
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.72)",
                fontFamily: "'Crimson Text', Georgia, serif",
                fontSize: "0.925rem",
                lineHeight: "1.7",
              }}
            >
              {creator.creativeMission}
            </p>
          </div>
        )}

        {/* Expandable: Philosophy / Doctrine / Archive Continuity */}
        {hasExpanded && (
          <div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-2 text-[10px] tracking-[0.12em] uppercase transition-all hover:opacity-80"
              style={{ color: "rgba(212,175,55,0.45)", fontFamily: "'Cinzel', serif" }}
            >
              <Layers className="w-3 h-3" />
              {expanded ? "Collapse" : "Creative Doctrine"}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {expanded && (
              <div className="mt-4 space-y-4 pl-4" style={{ borderLeft: "1px solid rgba(212,175,55,0.12)" }}>
                {creator.creativePhilosophy?.trim() && (
                  <div className="space-y-1.5">
                    <span
                      className="text-[9px] tracking-[0.16em] uppercase"
                      style={{ color: "rgba(212,175,55,0.4)", fontFamily: "'Cinzel', serif" }}
                    >
                      Philosophy
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        fontFamily: "'Crimson Text', Georgia, serif",
                        fontSize: "0.9rem",
                        lineHeight: "1.7",
                      }}
                    >
                      {creator.creativePhilosophy}
                    </p>
                  </div>
                )}
                {creator.creativeDoctrine?.trim() && (
                  <div className="space-y-1.5">
                    <span
                      className="text-[9px] tracking-[0.16em] uppercase"
                      style={{ color: "rgba(212,175,55,0.4)", fontFamily: "'Cinzel', serif" }}
                    >
                      Doctrine
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        fontFamily: "'Crimson Text', Georgia, serif",
                        fontSize: "0.9rem",
                        lineHeight: "1.7",
                      }}
                    >
                      {creator.creativeDoctrine}
                    </p>
                  </div>
                )}
                {creator.archiveContinuity?.trim() && (
                  <div className="space-y-1.5">
                    <span
                      className="text-[9px] tracking-[0.16em] uppercase"
                      style={{ color: "rgba(212,175,55,0.4)", fontFamily: "'Cinzel', serif" }}
                    >
                      Archive Continuity
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        fontFamily: "'Crimson Text', Georgia, serif",
                        fontSize: "0.9rem",
                        lineHeight: "1.7",
                      }}
                    >
                      {creator.archiveContinuity}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
