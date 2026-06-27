/**
 * ARCHIVE LAYOUT — Living Nexus
 *
 * Transforms a song detail page into an authenticated artifact preserved
 * inside the Living Nexus Archive. Every work feels like opening a record
 * from a National Archive, museum exhibit, or rare book collection.
 *
 * Content-type identity:
 *   audio      → Sacred Score / Museum Exhibit
 *   lyrics     → Library Catalog / Academic Archive
 *   manuscript → Illuminated Manuscript / Theological Archive
 *   comic      → Military Field Manual / Rare Book Collection
 */

import React from "react";
import { ShieldCheck, BookOpen, ExternalLink } from "lucide-react";

// ─── Archive Identity ────────────────────────────────────────────────────────

export interface ArchiveIdentity {
  classification: string;   // e.g. "SACRED SCORE"
  institution: string;      // e.g. "LIVING NEXUS ARCHIVE"
  accentColor: string;      // CSS color
  accentDim: string;        // dimmed variant
  grainOpacity: number;     // 0–1, paper grain intensity
  borderStyle: string;      // CSS border shorthand
  headerBg: string;         // section header background
}

export function getArchiveIdentity(contentType?: string | null): ArchiveIdentity {
  const ct = (contentType ?? "audio").toLowerCase().trim();

  if (ct === "manuscript") {
    return {
      classification: "ILLUMINATED MANUSCRIPT",
      institution: "LIVING NEXUS ARCHIVE — THEOLOGICAL COLLECTION",
      accentColor: "rgba(201,192,168,0.90)",
      accentDim: "rgba(201,192,168,0.35)",
      grainOpacity: 0.055,
      borderStyle: "1px solid rgba(201,192,168,0.22)",
      headerBg: "rgba(201,192,168,0.04)",
    };
  }
  if (ct === "comic" || ct === "novel" || ct === "comic_novel") {
    return {
      classification: "FIELD RECORD",
      institution: "LIVING NEXUS ARCHIVE — OPERATIONAL COLLECTION",
      accentColor: "rgba(196,68,10,0.90)",
      accentDim: "rgba(196,68,10,0.35)",
      grainOpacity: 0.045,
      borderStyle: "1px solid rgba(196,68,10,0.22)",
      headerBg: "rgba(196,68,10,0.04)",
    };
  }
  if (ct === "lyrics" || ct === "lyrics_only") {
    return {
      classification: "LITERARY RECORD",
      institution: "LIVING NEXUS ARCHIVE — TEXTUAL COLLECTION",
      accentColor: "rgba(74,157,191,0.90)",
      accentDim: "rgba(74,157,191,0.35)",
      grainOpacity: 0.04,
      borderStyle: "1px solid rgba(74,157,191,0.22)",
      headerBg: "rgba(74,157,191,0.04)",
    };
  }
  // default: audio / music
  return {
    classification: "SACRED SCORE",
    institution: "LIVING NEXUS ARCHIVE — MUSIC COLLECTION",
    accentColor: "rgba(196,154,40,0.90)",
    accentDim: "rgba(196,154,40,0.35)",
    grainOpacity: 0.05,
    borderStyle: "1px solid rgba(196,154,40,0.22)",
    headerBg: "rgba(196,154,40,0.04)",
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Engraved section divider with Cinzel overline label */
export const ArchiveDivider: React.FC<{ label: string; accent?: string }> = ({
  label,
  accent = "rgba(212,175,55,0.55)",
}) => (
  <div className="flex items-center gap-3 my-8">
    <div style={{ width: 32, height: 1, background: accent }} />
    <span
      className="text-[10px] tracking-[0.22em] uppercase flex-shrink-0"
      style={{ fontFamily: "'Cinzel', serif", color: accent }}
    >
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: `${accent.replace(/[\d.]+\)$/, "0.18)")}` }} />
  </div>
);

/** Manuscript margin rule — vertical left accent bar */
export const MarginRule: React.FC<{ accent: string }> = ({ accent }) => (
  <div
    className="absolute left-0 top-0 bottom-0"
    style={{ width: 2, background: `linear-gradient(to bottom, transparent, ${accent}, transparent)` }}
  />
);

/** Archive classification stamp — top of artifact panel */
export const ClassificationStamp: React.FC<{
  identity: ArchiveIdentity;
  witnessId?: string | null;
  registeredAt?: Date | string | null;
}> = ({ identity, witnessId, registeredAt }) => (
  <div
    className="flex items-start justify-between gap-4 pb-5 mb-6"
    style={{ borderBottom: identity.borderStyle }}
  >
    <div className="space-y-1">
      <p
        className="text-[9px] tracking-[0.28em] uppercase"
        style={{ fontFamily: "'Space Mono', monospace", color: identity.accentDim }}
      >
        {identity.institution}
      </p>
      <p
        className="text-[11px] tracking-[0.18em] uppercase font-semibold"
        style={{ fontFamily: "'Cinzel', serif", color: identity.accentColor }}
      >
        {identity.classification}
      </p>
    </div>
    {witnessId && (
      <div className="flex-shrink-0 text-right space-y-0.5">
        <div className="flex items-center gap-1.5 justify-end">
          <ShieldCheck className="w-3 h-3" style={{ color: identity.accentColor }} />
          <span
            className="text-[9px] tracking-[0.14em] uppercase"
            style={{ fontFamily: "'Cinzel', serif", color: identity.accentColor }}
          >
            Witnessed
          </span>
        </div>
        {registeredAt && (
          <p
            className="text-[9px]"
            style={{ fontFamily: "'Space Mono', monospace", color: identity.accentDim }}
          >
            {new Date(registeredAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    )}
  </div>
);

/** Archive page grain overlay — pure CSS, no images */
export const ArchiveGrain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => (
  <div
    className="pointer-events-none absolute inset-0"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      backgroundRepeat: "repeat",
      backgroundSize: "200px 200px",
      opacity,
      mixBlendMode: "overlay",
    }}
  />
);

/** Architectural frame — the outer container that gives the page weight */
export const ArchiveFrame: React.FC<{
  identity: ArchiveIdentity;
  children: React.ReactNode;
}> = ({ identity, children }) => (
  <div className="relative w-full" style={{ background: "var(--ln-void)" }}>
    {/* Grain layer */}
    <ArchiveGrain opacity={identity.grainOpacity} />

    {/* Left architectural margin line */}
    <div
      className="hidden lg:block absolute left-[max(2rem,calc(50%-34rem))] top-0 bottom-0"
      style={{ width: 1, background: `linear-gradient(to bottom, transparent 0%, ${identity.accentDim} 15%, ${identity.accentDim} 85%, transparent 100%)`, opacity: 0.4 }}
    />
    {/* Right architectural margin line */}
    <div
      className="hidden lg:block absolute right-[max(2rem,calc(50%-34rem))] top-0 bottom-0"
      style={{ width: 1, background: `linear-gradient(to bottom, transparent 0%, ${identity.accentDim} 15%, ${identity.accentDim} 85%, transparent 100%)`, opacity: 0.4 }}
    />

    {/* Reading surface */}
    <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-12 py-10">
      {children}
    </div>
  </div>
);

/** Artifact Panel — the unified record: title + creator + metadata + WID + description */
export const ArtifactPanel: React.FC<{
  identity: ArchiveIdentity;
  children: React.ReactNode;
}> = ({ identity, children }) => (
  <div
    className="relative rounded-none border-l-0 border-r-0"
    style={{
      background: `linear-gradient(180deg, ${identity.headerBg} 0%, rgba(10,8,6,0.0) 100%)`,
      borderTop: identity.borderStyle,
      borderBottom: identity.borderStyle,
      padding: "2.5rem 0",
    }}
  >
    {/* Left accent rule */}
    <div
      className="absolute left-0 top-8 bottom-8"
      style={{ width: 3, background: `linear-gradient(to bottom, transparent, ${identity.accentColor}, transparent)`, borderRadius: 2 }}
    />
    <div className="pl-6">
      {children}
    </div>
  </div>
);

/** Archive section wrapper — consistent padding + top rule */
export const ArchiveSection: React.FC<{
  label: string;
  accent?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, accent = "rgba(212,175,55,0.55)", children, className = "" }) => (
  <section className={`relative ${className}`}>
    <ArchiveDivider label={label} accent={accent} />
    <div className="relative pl-1">
      {children}
    </div>
  </section>
);

// ─── WID Certificate Block ────────────────────────────────────────────────────

export const WIDCertificate: React.FC<{
  witnessId: string;
  creatorName: string;
  registeredAt?: Date | string | null;
  certificateUrl?: string | null;
  identity: ArchiveIdentity;
}> = ({ witnessId, creatorName, registeredAt, certificateUrl, identity }) => (
  <div
    className="rounded-sm px-5 py-4 space-y-3"
    style={{
      background: identity.headerBg,
      border: identity.borderStyle,
      borderLeft: `3px solid ${identity.accentColor}`,
    }}
  >
    <div className="flex items-center gap-2">
      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: identity.accentColor }} />
      <span
        className="text-[10px] tracking-[0.20em] uppercase"
        style={{ fontFamily: "'Cinzel', serif", color: identity.accentColor }}
      >
        Witness Identity Certificate
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <p className="text-[9px] tracking-[0.14em] uppercase mb-1" style={{ fontFamily: "'Cinzel', serif", color: identity.accentDim }}>WID</p>
        <p className="text-xs font-mono break-all" style={{ color: "var(--ln-parchment)" }}>{witnessId}</p>
      </div>
      <div>
        <p className="text-[9px] tracking-[0.14em] uppercase mb-1" style={{ fontFamily: "'Cinzel', serif", color: identity.accentDim }}>Creator</p>
        <p className="text-sm" style={{ color: "var(--ln-bone)", fontFamily: "'Cormorant Garamond', serif" }}>{creatorName}</p>
      </div>
      {registeredAt && (
        <div>
          <p className="text-[9px] tracking-[0.14em] uppercase mb-1" style={{ fontFamily: "'Cinzel', serif", color: identity.accentDim }}>Registered</p>
          <p className="text-xs font-mono" style={{ color: "var(--ln-bone)" }}>
            {new Date(registeredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      )}
      {certificateUrl && (
        <div className="flex items-end">
          <a
            href={certificateUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs hover:underline"
            style={{ color: identity.accentColor }}
          >
            <ExternalLink className="w-3 h-3" />
            View Certificate
          </a>
        </div>
      )}
    </div>
  </div>
);

// ─── Metadata Row ─────────────────────────────────────────────────────────────

export const MetadataRow: React.FC<{
  label: string;
  value: React.ReactNode;
  accent?: string;
}> = ({ label, value, accent = "rgba(212,175,55,0.45)" }) => (
  <div className="flex gap-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
    <span
      className="text-[9px] tracking-[0.18em] uppercase flex-shrink-0 w-28 pt-0.5"
      style={{ fontFamily: "'Cinzel', serif", color: accent }}
    >
      {label}
    </span>
    <span className="text-sm flex-1" style={{ color: "var(--ln-bone)", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.97rem" }}>
      {value}
    </span>
  </div>
);

// ─── BookOpen icon re-export for convenience ──────────────────────────────────
export { BookOpen };
