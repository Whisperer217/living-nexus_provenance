/**
 * ACT IV — Evidence Column
 *
 * The provenance inspector for Living Nexus.
 * Answers the single question: "Why should I trust this artifact?"
 *
 * Eight independently expandable/collapsible sections:
 *   1. Witness Status       — verification state, witness count, registration date
 *   2. Authorship Disclosure — AI/human authorship badge + locked statement
 *   3. Provenance           — WID, creator, origin, parent/child artifacts
 *   4. Timeline             — chronological event chain
 *   5. Chain of Record      — origin, updates, co-signers (ChainOfRecordFooter)
 *   6. Lineage              — artifact relationships (LineageGraph)
 *   7. Graph                — relationship graph entry point
 *   8. References & Citations — external refs, internal links (ReferenceCitePanel)
 *
 * Design: Inspector panel aesthetic (Figma/Unity style)
 * Layout: Sticky on desktop, accordion on mobile
 */

import { useState, ReactNode } from "react";
import { Link } from "wouter";
import {
  ChevronDown, ChevronRight,
  ShieldCheck, Shield, ShieldAlert, ShieldOff,
  Clock, GitBranch, Network, BookOpen,
  User, Hash, Calendar, CheckCircle2, AlertCircle,
  Lock, Fingerprint, Eye, FileText, ExternalLink,
  Layers, GitMerge, Cpu, Mic2,
} from "lucide-react";
import { ProvenanceTimeline } from "@/components/ProvenanceTimeline";
import { LineageGraph } from "@/components/LineageGraph";
import { WitnessesPanel } from "@/components/WitnessesPanel";
import { ChainOfRecordFooter } from "@/components/ChainOfRecordFooter";
import { ReferenceCitePanel } from "@/components/ReferenceCitePanel";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EvidenceColumnProps {
  song: any;
  creator: any;
  isOwner: boolean;
  songId: number;
}

// ─── Inspector Section ───────────────────────────────────────────────────────

interface InspectorSectionProps {
  id: string;
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

function InspectorSection({
  title, icon, defaultOpen = false, badge, empty, emptyMessage, children
}: InspectorSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(10,10,10,0.6)",
        border: "1px solid rgba(196,154,40,0.12)",
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span className="flex-shrink-0 opacity-60" style={{ color: "var(--ln-gold)" }}>
          {icon}
        </span>
        <span
          className="flex-1 text-[11px] font-heading tracking-widest uppercase"
          style={{ color: "rgba(196,154,40,0.75)" }}
        >
          {title}
        </span>
        {badge && <span className="flex-shrink-0">{badge}</span>}
        <span className="flex-shrink-0 opacity-40" style={{ color: "var(--ln-smoke)" }}>
          {open
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div
          className="px-3 pb-3 pt-1"
          style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}
        >
          {empty
            ? (
              <p className="text-[11px] italic py-2" style={{ color: "rgba(196,154,40,0.35)" }}>
                {emptyMessage ?? "No evidence available yet."}
              </p>
            )
            : children}
        </div>
      )}
    </div>
  );
}

// ─── Row helper ─────────────────────────────────────────────────────────────

function Row({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1" style={{ borderBottom: "1px solid rgba(196,154,40,0.06)" }}>
      <span className="text-[10px] uppercase tracking-wider flex-shrink-0 mt-0.5" style={{ color: "rgba(196,154,40,0.45)" }}>{label}</span>
      <span className={`text-[11px] text-right break-all ${mono ? "font-mono" : ""}`} style={{ color: "var(--ln-parchment)" }}>{value}</span>
    </div>
  );
}

// ─── Authorship badge map ────────────────────────────────────────────────────

const AUTHORSHIP_MAP: Record<string, { label: string; color: string; icon: ReactNode; description: string }> = {
  human: {
    label: "Original Human Authored",
    color: "#4ADE80",
    icon: <Mic2 className="w-3.5 h-3.5" />,
    description: "This work was created entirely by a human author with no AI assistance.",
  },
  human_ai: {
    label: "Human Assisted by AI",
    color: "#60A5FA",
    icon: <User className="w-3.5 h-3.5" />,
    description: "A human author created this work and used AI tools to assist in the process.",
  },
  ai_human: {
    label: "AI Assisted Human Creation",
    color: "#A78BFA",
    icon: <Cpu className="w-3.5 h-3.5" />,
    description: "AI generated primary content under human creative direction and curation.",
  },
  ai: {
    label: "Fully AI Generated",
    color: "#F59E0B",
    icon: <Cpu className="w-3.5 h-3.5" />,
    description: "This work was generated entirely by an AI system.",
  },
  collaborative: {
    label: "Collaborative Work",
    color: "#34D399",
    icon: <GitMerge className="w-3.5 h-3.5" />,
    description: "This work was created through collaboration between multiple creators.",
  },
};

// ─── Witness status config ───────────────────────────────────────────────────

function getWitnessStatus(song: any) {
  if (song?.witnessId) {
    return { label: "Witnessed Work", color: "#4ADE80", icon: <ShieldCheck className="w-4 h-4" />, description: "This artifact has been registered and witnessed on Living Nexus." };
  }
  if (song?.registrationStatus === "pending") {
    return { label: "Pending Review", color: "#F59E0B", icon: <ShieldAlert className="w-4 h-4" />, description: "Registration is pending review." };
  }
  if (song?.registrationStatus === "disputed") {
    return { label: "Disputed", color: "#EF4444", icon: <ShieldOff className="w-4 h-4" />, description: "This artifact has an active dispute." };
  }
  if (song?.registrationStatus === "locked") {
    return { label: "Locked", color: "#94A3B8", icon: <Lock className="w-4 h-4" />, description: "This artifact is locked." };
  }
  if (song?.registrationStatus === "archived") {
    return { label: "Archived", color: "#64748B", icon: <Shield className="w-4 h-4" />, description: "This artifact has been archived." };
  }
  // Registered but no WID yet
  if (song?.createdAt) {
    return { label: "Registered", color: "#C49A28", icon: <CheckCircle2 className="w-4 h-4" />, description: "This artifact is registered on Living Nexus." };
  }
  return { label: "Unverified", color: "#64748B", icon: <AlertCircle className="w-4 h-4" />, description: "Verification status unknown." };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EvidenceColumn({ song, creator, isOwner, songId }: EvidenceColumnProps) {
  const witnessStatus = getWitnessStatus(song);
  const witnessId = song?.witnessId;
  const lyricsWid = (song as any)?.lyricsWid;
  const aiDisclosure = (song as any)?.aiDisclosure;
  const haaiDeclaration = (song as any)?.haaiDeclaration;
  const registrationDate = song?.createdAt
    ? new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  // Authorship
  const authorshipKey = aiDisclosure?.toLowerCase().replace(/\s+/g, "_") ?? null;
  const authorshipInfo = authorshipKey ? (AUTHORSHIP_MAP[authorshipKey] ?? null) : null;

  // External links for Graph section
  const externalLinks: { label: string; url: string }[] = [];
  if ((song as any)?.spotifyUrl) externalLinks.push({ label: "Spotify", url: (song as any).spotifyUrl });
  if ((song as any)?.appleMusicUrl) externalLinks.push({ label: "Apple Music", url: (song as any).appleMusicUrl });
  if ((song as any)?.youtubeUrl) externalLinks.push({ label: "YouTube", url: (song as any).youtubeUrl });
  if ((song as any)?.soundcloudUrl) externalLinks.push({ label: "SoundCloud", url: (song as any).soundcloudUrl });

  const hasProvenance = !!(witnessId || lyricsWid || registrationDate || creator);
  const hasAuthorship = !!(aiDisclosure || haaiDeclaration);
  const hasGraph = !!(creator || externalLinks.length);

  return (
    <div className="flex flex-col gap-2">
      {/* Column label */}
      <div className="flex items-center gap-2 px-1 pb-1" style={{ borderBottom: "1px solid rgba(196,154,40,0.10)" }}>
        <Fingerprint className="w-3.5 h-3.5 opacity-50" style={{ color: "var(--ln-gold)" }} />
        <span className="text-[9px] font-heading tracking-[0.2em] uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>
          Evidence Inspector
        </span>
      </div>

      {/* ── 1. Witness Status ── */}
      <InspectorSection
        id="witness"
        title="Witness Status"
        icon={<Shield className="w-3.5 h-3.5" />}
        defaultOpen={true}
        badge={
          <span
            className="text-[9px] font-heading tracking-wider uppercase px-1.5 py-0.5 rounded"
            style={{ background: `${witnessStatus.color}18`, color: witnessStatus.color, border: `1px solid ${witnessStatus.color}30` }}
          >
            {witnessStatus.label}
          </span>
        }
      >
        <div className="flex items-start gap-2.5 py-2">
          <span style={{ color: witnessStatus.color }}>{witnessStatus.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium mb-0.5" style={{ color: witnessStatus.color, fontFamily: "'Cinzel', serif" }}>
              {witnessStatus.label}
            </p>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
              {witnessStatus.description}
            </p>
          </div>
        </div>

        {registrationDate && (
          <Row label="Registered" value={registrationDate} />
        )}
        {witnessId && (
          <Row label="WID" value={
            <span className="font-mono text-[10px]" style={{ color: "var(--ln-gold)" }}>
              {witnessId.slice(0, 16)}…
            </span>
          } />
        )}

        {/* Witnesses sub-panel */}
        <div className="mt-2">
          <WitnessesPanel songId={songId} ownerId={song?.userId} />
        </div>
      </InspectorSection>

      {/* ── 2. Authorship Disclosure ── */}
      <InspectorSection
        id="authorship"
        title="Authorship Disclosure"
        icon={<Eye className="w-3.5 h-3.5" />}
        defaultOpen={hasAuthorship}
        empty={!hasAuthorship}
        emptyMessage="No authorship declaration has been recorded for this artifact."
      >
        {authorshipInfo && (
          <div
            className="flex items-start gap-2.5 rounded-lg p-3 mb-2"
            style={{ background: `${authorshipInfo.color}10`, border: `1px solid ${authorshipInfo.color}25` }}
          >
            <span style={{ color: authorshipInfo.color }} className="flex-shrink-0 mt-0.5">
              {authorshipInfo.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold mb-1" style={{ color: authorshipInfo.color, fontFamily: "'Cinzel', serif" }}>
                {authorshipInfo.label}
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
                {authorshipInfo.description}
              </p>
            </div>
          </div>
        )}

        {/* Raw disclosure text if not in map */}
        {aiDisclosure && !authorshipInfo && (
          <div className="rounded-lg p-3 mb-2" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)" }}>
            <p className="text-[11px]" style={{ color: "var(--ln-parchment)" }}>{aiDisclosure}</p>
          </div>
        )}

        {/* HAAI Declaration */}
        {haaiDeclaration && (
          <div className="mt-2 rounded-lg p-3" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.10)" }}>
            <p className="text-[9px] font-heading tracking-widest uppercase mb-1.5" style={{ color: "rgba(196,154,40,0.5)" }}>
              HAAI Declaration
            </p>
            <p className="text-[10px] leading-relaxed italic" style={{ color: "var(--ln-smoke)" }}>
              {haaiDeclaration}
            </p>
          </div>
        )}

        {/* Lock indicator */}
        <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}>
          <Lock className="w-3 h-3 opacity-40" style={{ color: "var(--ln-gold)" }} />
          <span className="text-[9px]" style={{ color: "rgba(196,154,40,0.4)" }}>
            Authorship declaration is locked to this registration
          </span>
        </div>
      </InspectorSection>

      {/* ── 3. Provenance ── */}
      <InspectorSection
        id="provenance"
        title="Provenance"
        icon={<Fingerprint className="w-3.5 h-3.5" />}
        defaultOpen={hasProvenance}
        empty={!hasProvenance}
        emptyMessage="No provenance data available for this artifact."
      >
        {witnessId && <Row label="WID" value={<span className="font-mono text-[10px]" style={{ color: "var(--ln-gold)" }}>{witnessId}</span>} />}
        {lyricsWid && <Row label="Lyrics WID" value={<span className="font-mono text-[10px]" style={{ color: "var(--ln-gold)" }}>{lyricsWid}</span>} />}
        {registrationDate && <Row label="Registered" value={registrationDate} />}
        {creator && (
          <Row label="Creator" value={
            <Link href={`/creator/${creator.id}`}>
              <span className="hover:underline cursor-pointer" style={{ color: "var(--ln-gold)" }}>
                {creator.artistHandle || creator.name}
              </span>
            </Link>
          } />
        )}
        {song?.title && <Row label="Manifestation" value={song.title} />}
        {(song as any)?.contentType && <Row label="Type" value={(song as any).contentType} />}
        {(song as any)?.version && <Row label="Version" value={(song as any).version} />}

        {/* Verify link */}
        {witnessId && (
          <a
            href={`https://www.livingnexus.org/verify/${witnessId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-2 text-[10px] hover:underline"
            style={{ color: "var(--ln-gold)" }}
          >
            <ExternalLink className="w-3 h-3" />
            Verify on Living Nexus
          </a>
        )}
      </InspectorSection>

      {/* ── 4. Timeline ── */}
      <InspectorSection
        id="timeline"
        title="Timeline"
        icon={<Clock className="w-3.5 h-3.5" />}
        defaultOpen={false}
      >
        <ProvenanceTimeline songId={songId} ownerId={song?.userId} />
      </InspectorSection>

      {/* ── 5. Chain of Record ── */}
      <InspectorSection
        id="chain"
        title="Chain of Record"
        icon={<Layers className="w-3.5 h-3.5" />}
        defaultOpen={false}
      >
        <ChainOfRecordFooter
          songId={songId}
          songTitle={song?.title ?? ""}
          ownerId={song?.userId}
        />
      </InspectorSection>

      {/* ── 6. Lineage ── */}
      <InspectorSection
        id="lineage"
        title="Lineage"
        icon={<GitBranch className="w-3.5 h-3.5" />}
        defaultOpen={false}
      >
        <LineageGraph
          songId={songId}
          ownerId={song?.userId}
          songTitle={song?.title ?? ""}
        />
      </InspectorSection>

      {/* ── 7. Graph ── */}
      <InspectorSection
        id="graph"
        title="Graph"
        icon={<Network className="w-3.5 h-3.5" />}
        defaultOpen={false}
        empty={!hasGraph}
        emptyMessage="No graph connections available yet."
      >
        {/* Creator node */}
        {creator && (
          <div className="mb-3">
            <p className="text-[9px] font-heading tracking-widest uppercase mb-1.5" style={{ color: "rgba(196,154,40,0.45)" }}>Creator</p>
            <Link href={`/creator/${creator.id}`}>
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-white/[0.04] transition-colors"
                style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.10)" }}>
                {creator.profilePhotoUrl
                  ? <img src={creator.profilePhotoUrl} alt={creator.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(196,154,40,0.15)" }}>
                      <User className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
                    </div>
                }
                <span className="text-[11px]" style={{ color: "var(--ln-parchment)" }}>
                  {creator.artistHandle || creator.name}
                </span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-40" style={{ color: "var(--ln-gold)" }} />
              </div>
            </Link>
          </div>
        )}

        {/* External platform connections */}
        {externalLinks.length > 0 && (
          <div>
            <p className="text-[9px] font-heading tracking-widest uppercase mb-1.5" style={{ color: "rgba(196,154,40,0.45)" }}>Published On</p>
            <div className="flex flex-col gap-1">
              {externalLinks.map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-[11px] hover:bg-white/[0.04] transition-colors"
                  style={{ color: "var(--ln-smoke)", border: "1px solid rgba(196,154,40,0.08)" }}
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Future: mini graph preview placeholder */}
        <div className="mt-3 rounded-lg px-3 py-2 flex items-center gap-2"
          style={{ background: "rgba(196,154,40,0.03)", border: "1px dashed rgba(196,154,40,0.15)" }}>
          <Network className="w-3.5 h-3.5 opacity-30" style={{ color: "var(--ln-gold)" }} />
          <span className="text-[9px] italic" style={{ color: "rgba(196,154,40,0.35)" }}>
            Full relationship graph — coming soon
          </span>
        </div>
      </InspectorSection>

      {/* ── 8. References & Citations ── */}
      <InspectorSection
        id="references"
        title="References & Citations"
        icon={<BookOpen className="w-3.5 h-3.5" />}
        defaultOpen={false}
      >
        <ReferenceCitePanel songId={songId} songTitle={song?.title ?? ""} />
      </InspectorSection>
    </div>
  );
}
