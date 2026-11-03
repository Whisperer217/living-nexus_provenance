import { type CSSProperties } from "react";
import {
  ArrowRight,
  Download,
  Pause,
  Play,
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { LnBadge, LnButton, LnDivider, LnOverline } from "@/design-system/primitives";
import { LnCard, LnInput, LnSurface } from "@/design-system/surfaces";
import { ProvenancePill } from "@/design-system/platform";
import { WitnessSigil } from "@/components/icons/WitnessSigil";

interface VisualSpecimensProps {
  previewStyle: CSSProperties;
}

const ICON_SIZES = [16, 20, 24, 48] as const;

type MediumStudyKind = "audio" | "lyrics" | "manuscript" | "comic" | "game" | "visual";

const UTILITY_SPECIMENS: ReadonlyArray<{ label: string; icon: LucideIcon }> = [
  { label: "Search", icon: Search },
  { label: "Play", icon: Play },
  { label: "Pause", icon: Pause },
  { label: "Close", icon: X },
  { label: "Download", icon: Download },
  { label: "Advance", icon: ArrowRight },
];

const MEDIUM_SPECIMENS: ReadonlyArray<{ kind: MediumStudyKind; label: string; caption: string }> = [
  { kind: "audio", label: "Resonance vessel", caption: "Audio" },
  { kind: "lyrics", label: "Testimony quill", caption: "Lyrics" },
  { kind: "manuscript", label: "Archive leaf", caption: "Manuscript" },
  { kind: "comic", label: "Panel constellation", caption: "Comic" },
  { kind: "game", label: "Playfield orbit", caption: "Game" },
  { kind: "visual", label: "Manifestation aperture", caption: "Visual" },
];

const ICON_KIT_OVERLINE_STYLE: CSSProperties = {
  color: "var(--ln-vl-icon-kit-overline)",
};

const SPECIMEN_OVERLINE_STYLE: CSSProperties = {
  color: "var(--ln-vl-specimen-overline)",
};

function WIDSealStudy({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M4.5 4.5 10.5 8v12L4.5 16.5zM19.5 4.5 13.5 8v12l6-3.5z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path d="M12 5.5v13M9.6 8.55 12 6.7l2.4 1.85" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RecordThreadStudy({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.45" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.45" />
      <circle cx="12" cy="19" r="2" stroke="currentColor" strokeWidth="1.45" />
    </svg>
  );
}

function HAAIMarkStudy({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="9" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.35" />
      <circle cx="15" cy="10" r="4.5" stroke="currentColor" strokeWidth="1.35" />
      <path d="M7.5 16.75Q12 20.5 16.5 16.75" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function MediumStudyGlyph({ kind, size = 24 }: { kind: MediumStudyKind; size?: number }) {
  if (kind === "audio") {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M5 14v-4M9 18V6M13 21V3M17 17V7M21 14v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
  }
  if (kind === "lyrics") {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M15.5 4.5c2.8 1.7 3.3 5.1 1.3 7.7L9.25 19.75 6.8 17.3l7.55-7.55c2.6-2 2-4.2.8-5.25Z" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" /><path d="m6.8 17.3-2.35 2.35 3.2-1.05" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (kind === "manuscript") {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M7 4.5h10v15H7zM9.5 8h5M9.5 11.5h5M9.5 15h3.5" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (kind === "comic") {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" /></svg>;
  }
  if (kind === "game") {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.35" /><path d="M4.5 12c2.2-4.2 5-6.3 7.5-6.3s5.3 2.1 7.5 6.3c-2.2 4.2-5 6.3-7.5 6.3S6.7 16.2 4.5 12Z" stroke="currentColor" strokeWidth="1.35" /></svg>;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.35" /><circle cx="12" cy="12" r="2.25" fill="currentColor" /><path d="m12 5.5 2.5 6.5-2.5 6.5-2.5-6.5z" fill="currentColor" fillOpacity="0.2" /></svg>;
}

function IconKitStudy() {
  return (
    <section className="ln-vl-icon-kit" aria-labelledby="ln-vl-icon-kit-title" data-ln-static-icon-kit>
      <header className="ln-vl-icon-kit__header">
        <div>
          <LnOverline style={ICON_KIT_OVERLINE_STYLE}>Witnessed Instruments</LnOverline>
          <h2 id="ln-vl-icon-kit-title">Icon system study</h2>
          <p>Static, labelled studies of visual roles. No record, creator, status, or application control is mounted here.</p>
        </div>
        <span className="ln-vl-icon-kit__static-note">Illustrative only</span>
      </header>

      <div className="ln-vl-icon-kit__families">
        <article className="ln-vl-icon-kit__family" data-icon-role="instrument">
          <LnOverline style={ICON_KIT_OVERLINE_STYLE}>Instrument</LnOverline>
          <h3>Utility actions</h3>
          <p>Familiar operational symbols remain neutral until a real interface supplies an active state.</p>
          <div className="ln-vl-icon-kit__utility-grid">
            {UTILITY_SPECIMENS.map(({ label, icon: Icon }) => (
              <figure className="ln-vl-icon-kit__tile" key={label}>
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <figcaption>{label}</figcaption>
              </figure>
            ))}
          </div>
        </article>

        <article className="ln-vl-icon-kit__family" data-icon-role="seal">
          <LnOverline style={ICON_KIT_OVERLINE_STYLE}>Seal</LnOverline>
          <h3>Record and testimony</h3>
          <p>These specimens are semantic marks, not status checks, security shields, or account identity.</p>
          <div className="ln-vl-icon-kit__seal-grid">
            <figure className="ln-vl-icon-kit__tile ln-vl-icon-kit__tile--accent"><WIDSealStudy /><figcaption>Record-seal specimen</figcaption></figure>
            <figure className="ln-vl-icon-kit__tile"><WitnessSigil /><figcaption>Witnessing</figcaption></figure>
            <figure className="ln-vl-icon-kit__tile"><RecordThreadStudy /><figcaption>Record thread</figcaption></figure>
            <figure className="ln-vl-icon-kit__tile"><HAAIMarkStudy /><figcaption>HAAI mark</figcaption></figure>
          </div>
        </article>

        <article className="ln-vl-icon-kit__family" data-icon-role="constellation">
          <LnOverline style={ICON_KIT_OVERLINE_STYLE}>Constellation</LnOverline>
          <h3>Medium identity</h3>
          <p>Shape leads the study while production medium-color authority remains an explicit ADR decision.</p>
          <div className="ln-vl-icon-kit__medium-grid">
            {MEDIUM_SPECIMENS.map(({ kind, label, caption }) => (
              <figure className="ln-vl-icon-kit__tile" key={kind}>
                <MediumStudyGlyph kind={kind} />
                <figcaption><strong>{caption}</strong><span>{label}</span></figcaption>
              </figure>
            ))}
          </div>
        </article>
      </div>

      <div className="ln-vl-icon-kit__comparison-row">
        <article className="ln-vl-icon-kit__comparison" aria-label="Utility size and state comparison">
          <LnOverline style={ICON_KIT_OVERLINE_STYLE}>Instrument scale</LnOverline>
          <div className="ln-vl-icon-kit__scale-row">
            {ICON_SIZES.map((size) => (
              <figure key={size}><Search size={size} strokeWidth={1.75} aria-hidden="true" /><figcaption>{size}px</figcaption></figure>
            ))}
          </div>
          <div className="ln-vl-icon-kit__state-row" aria-label="Static state samples">
            <span data-state="muted"><Search size={20} strokeWidth={1.75} aria-hidden="true" />Muted</span>
            <span data-state="default"><Search size={20} strokeWidth={1.75} aria-hidden="true" />Default</span>
            <span data-state="focus"><Search size={20} strokeWidth={1.75} aria-hidden="true" />Focus study</span>
            <span data-state="active"><Search size={20} strokeWidth={1.75} aria-hidden="true" />Active study</span>
          </div>
        </article>

        <figure className="ln-vl-icon-kit__asset-frame" data-icon-role="asset-frame" aria-labelledby="ln-vl-asset-frame-caption">
          <div className="ln-vl-icon-kit__asset-art" aria-hidden="true">
            <div className="ln-vl-icon-kit__asset-orbit" />
            <div className="ln-vl-icon-kit__asset-column ln-vl-icon-kit__asset-column--left" />
            <div className="ln-vl-icon-kit__asset-column ln-vl-icon-kit__asset-column--right" />
            <span className="ln-vl-icon-kit__asset-mark"><WIDSealStudy size={18} /></span>
          </div>
          <figcaption id="ln-vl-asset-frame-caption">
            <LnOverline style={ICON_KIT_OVERLINE_STYLE}>Human-facing asset frame study</LnOverline>
            <strong>Illustrative visual asset</strong>
            <p>No registry record, rights claim, NFT statement, or verification destination is present in this specimen.</p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export function VisualSpecimens({ previewStyle }: VisualSpecimensProps) {
  return (
    <section data-ln-visual-lab-preview style={previewStyle} aria-label="Visual Lab preview">
      <header className="ln-vl-specimen-nav">
        <div>
          <LnOverline style={SPECIMEN_OVERLINE_STYLE}>Living Nexus · Visual Lab</LnOverline>
          <strong>Current Production preview</strong>
        </div>
        <LnBadge variant="gold">Local preview only</LnBadge>
      </header>

      <main className="ln-vl-specimen-main">
        <section className="ln-vl-specimen-hero">
          <LnOverline style={SPECIMEN_OVERLINE_STYLE}>Manifestation study</LnOverline>
          <h2>Architect the feeling before you change the record.</h2>
          <p>
            This is an inert visual specimen. No profile, work, WID, player, or provenance record is loaded or changed.
          </p>
          <div className="ln-vl-specimen-actions">
            <LnButton variant="primary" size="sm" type="button" leftIcon={<Sparkles size={14} />}>Honor the visual system</LnButton>
            <LnButton variant="secondary" size="sm" type="button" leftIcon={<SlidersHorizontal size={14} />}>Inspect tokens</LnButton>
          </div>
        </section>

        <section className="ln-vl-specimen-grid" aria-label="Representative component specimens">
          <LnCard variant="museum" noHover className="ln-vl-specimen-card">
            <div className="ln-vl-specimen-art" aria-label="Abstract no-record visual specimen">
              <div className="ln-vl-specimen-art__ring" />
              <span>NO RECORD</span>
            </div>
            <div className="ln-vl-specimen-card__body">
              <LnOverline style={SPECIMEN_OVERLINE_STYLE}>Artifact frame</LnOverline>
              <h3>A study in witness and form</h3>
              <p>Gold rim, intentional space, and clear hierarchy — without attaching to a living artifact.</p>
              <div className="ln-vl-specimen-meta">
                <ProvenancePill type="original" compact />
                <LnBadge variant="gold">Illustrative</LnBadge>
              </div>
            </div>
          </LnCard>

          <LnSurface level="elevated" className="ln-vl-specimen-panel">
            <LnOverline style={SPECIMEN_OVERLINE_STYLE}>Interface rhythm</LnOverline>
            <h3>A local composition surface</h3>
            <p>Typography, fields, dividers, and surfaces respond live to the safe preview tokens.</p>
            <LnDivider variant="section" label="Specimen controls" />
            <LnInput aria-label="Illustrative title field" value="Local visual study" readOnly />
          </LnSurface>
        </section>

        <IconKitStudy />

        <section className="ln-vl-specimen-bottom-sheet" aria-label="Bottom-sheet specimen">
          <LnOverline style={SPECIMEN_OVERLINE_STYLE}>Responsive surface</LnOverline>
          <h3>Bottom-sheet geometry</h3>
          <p>Preview-only dimensions can be tested here without interfering with the app’s global player or safe-area stack.</p>
        </section>
      </main>
    </section>
  );
}
