import React from "react";
import { Archive, BookOpen, CheckCircle2, Eye, Image, Layers, Link2, Music, Settings2, ShieldCheck, Sparkles, X } from "lucide-react";
import { NexusContextPanel, type NexusNowPlayingContext } from "@/components/NexusContextPanel";
import type { NexusContextRef, NexusContextSuggestion } from "@/lib/nexusContext";
import { PNAArtifactReviewCard } from "./PNAArtifactReviewCard";
import type {
  PNAActionReceiptView,
  PNAArtifactSourceView,
  PNAContextEntryView,
  PNAContextUseEntryView,
  PNAContextUseReceiptView,
  PNAInspectionSurface,
  PNAProfileSettingView,
  PNAWorkspaceArtifact,
} from "./pnaWorkspaceTypes";

interface PNAWorkspaceRailProps {
  surface: PNAInspectionSurface;
  onSurfaceChange: (surface: PNAInspectionSurface) => void;
  threadId?: string | null;
  envelope: { id: string; revision: number } | null;
  entries: PNAContextEntryView[];
  profile: PNAProfileSettingView | null;
  context: NexusContextRef | null;
  suggestion?: NexusContextSuggestion | null;
  nowPlaying?: NexusNowPlayingContext | null;
  artifacts: PNAWorkspaceArtifact[];
  artifactSources: PNAArtifactSourceView[];
  actionReceipts: PNAActionReceiptView[];
  useReceipts: PNAContextUseReceiptView[];
  useEntries: PNAContextUseEntryView[];
  pendingArtifactAction?: { id: string; action: "review" | "preserve" | "discard" } | null;
  isDetachingContext?: boolean;
  onAttachNowPlaying: () => void;
  onDetachContext: (entryId: string) => void;
  onOpenContextReference: () => void;
  onVerifyContext: () => void;
  onPlayContext: () => void;
  onReviewArtifact: (id: string) => void;
  onPreserveArtifact: (id: string) => void;
  onDiscardArtifact: (id: string) => void;
  onOpenQuiver: () => void;
  onOpenStewardshipSettings: () => void;
  mobile?: boolean;
}

const INSPECTION_TABS = [
  ["context", "Envelope", Layers],
  ["sources", "Sources", Link2],
  ["artifacts", "Artifacts", Image],
  ["activity", "Activity", Archive],
] as const;

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function SurfaceTabs({ surface, onSurfaceChange }: Pick<PNAWorkspaceRailProps, "surface" | "onSurfaceChange">) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = INSPECTION_TABS.findIndex(([id]) => id === surface);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + INSPECTION_TABS.length) % INSPECTION_TABS.length;
    onSurfaceChange(INSPECTION_TABS[nextIndex][0]);
    window.requestAnimationFrame(() => document.getElementById(`pna-rail-tab-${INSPECTION_TABS[nextIndex][0]}`)?.focus());
  };

  return (
    <div className="grid grid-cols-2 gap-1 p-2" role="tablist" aria-label="PNA inspection surfaces" onKeyDown={handleKeyDown} style={{ borderBottom: "1px solid var(--ln-panel-border)" }}>
      {INSPECTION_TABS.map(([id, label, Icon]) => {
        const selected = surface === id;
        return (
          <button key={id} id={`pna-rail-tab-${id}`} type="button" role="tab" aria-selected={selected} aria-controls={`pna-rail-panel-${id}`} tabIndex={selected ? 0 : -1}
            onClick={() => onSurfaceChange(id)} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{ background: selected ? "color-mix(in srgb, var(--ln-gold) 14%, transparent)" : "transparent", border: `1px solid ${selected ? "color-mix(in srgb, var(--ln-gold) 36%, transparent)" : "transparent"}`, color: selected ? "var(--ln-gold)" : "var(--ln-smoke)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}>
            <Icon size={13} aria-hidden="true" />{label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

function ContextEntryCard({ entry, busy, onDetach, onOpen }: { entry: PNAContextEntryView; busy: boolean; onDetach: () => void; onOpen: () => void }) {
  return (
    <article className="rounded-lg p-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[var(--text-xs)] tracking-[0.12em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>{entry.sourceKind.replace("_", " ")} · Creator private</p>
          <h3 className="mt-1 truncate font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>{entry.titleSnapshot}</h3>
        </div>
        <ShieldCheck size={15} style={{ color: "var(--ln-gold-dim)" }} aria-hidden="true" />
      </div>
      <p className="mt-1 font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{entry.widSnapshot ?? `Attached ${formatDate(entry.attachedAt)}`}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onOpen} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-bone)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.06em" }}><Eye size={13} /> INSPECT</button>
        <button type="button" onClick={onDetach} disabled={busy} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-smoke)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.06em" }}><X size={13} /> DETACH</button>
      </div>
    </article>
  );
}

function RouteDisclosure({ profile, entryCount, onOpenSettings }: { profile: PNAProfileSettingView | null; entryCount: number; onOpenSettings: () => void }) {
  const disabled = profile && !profile.isEnabled;
  const remoteAllowed = profile?.allowRemoteContext ?? false;
  const copy = disabled
    ? `${profile?.label ?? "This profile"} is disabled in Stewardship settings.`
    : entryCount === 0
      ? "No selected source has been sent to a model."
      : remoteAllowed
        ? `Remote route permitted for ${entryCount} selected source${entryCount === 1 ? "" : "s"}. Each send rechecks your settings and Envelope.`
        : `Selected sources stay here until you permit remote selected-context use for ${profile?.label ?? "this profile"}.`;
  return (
    <section className="rounded-lg p-3" aria-label="Model route disclosure" style={{ background: "color-mix(in srgb, var(--ln-gold) 7%, var(--ln-coal))", border: "1px solid color-mix(in srgb, var(--ln-gold) 22%, var(--ln-panel-border))" }}>
      <div className="flex items-center gap-2"><ShieldCheck size={14} style={{ color: "var(--ln-gold)" }} aria-hidden="true" /><p className="font-display text-[var(--text-xs)] tracking-[0.12em] uppercase" style={{ color: "var(--ln-gold)" }}>{disabled ? "Profile disabled" : remoteAllowed ? "Remote route permitted" : "Route not permitted"}</p></div>
      <p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>{copy}</p>
      <button type="button" onClick={onOpenSettings} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-gold-dim)", color: "var(--ln-gold)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}><Settings2 size={13} /> STEWARDSHIP SETTINGS</button>
    </section>
  );
}

export function PNAWorkspaceRail({ surface, onSurfaceChange, threadId, envelope, entries, profile, context, suggestion, nowPlaying, artifacts, artifactSources, actionReceipts, useReceipts, useEntries, pendingArtifactAction = null, isDetachingContext = false, onAttachNowPlaying, onDetachContext, onOpenContextReference, onVerifyContext, onPlayContext, onReviewArtifact, onPreserveArtifact, onDiscardArtifact, onOpenQuiver, onOpenStewardshipSettings, mobile = false }: PNAWorkspaceRailProps) {
  const attachedEntries = entries.filter((entry) => entry.state === "attached");
  const visibleArtifacts = artifacts.filter((artifact) => artifact.state !== "discarded");

  return (
    <aside aria-label="PNA workspace inspection rail" className={mobile ? "flex h-full min-h-0 w-full flex-col" : "hidden h-full min-h-0 w-[360px] flex-shrink-0 flex-col xl:flex"} style={{ background: "var(--ln-panel)", borderLeft: mobile ? "none" : "1px solid var(--ln-panel-border)" }}>
      <header className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--ln-panel-border)" }}>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--ln-gold) 10%, transparent)", color: "var(--ln-gold)", border: "1px solid color-mix(in srgb, var(--ln-gold) 24%, transparent)" }}><Sparkles size={16} aria-hidden="true" /></div>
        <div className="min-w-0"><p className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold)" }}>Private inspection</p><p className="mt-1 font-body text-[var(--text-sm)]" style={{ color: "var(--ln-smoke)" }}>Scope, sources, proposals, and creator decisions stay inspectable.</p></div>
      </header>
      <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} />
      <div aria-live="polite" className="sr-only">{surface === "context" ? `${attachedEntries.length} selected Context sources` : surface === "artifacts" ? `${visibleArtifacts.length} private Artifacts` : `${surface} inspection surface`}</div>

      {surface === "context" ? (
        <div id="pna-rail-panel-context" role="tabpanel" aria-labelledby="pna-rail-tab-context" className="min-h-0 flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}>
          <section aria-labelledby="pna-envelope-title"><div className="flex items-center gap-2"><Layers size={13} style={{ color: "var(--ln-gold-dim)" }} /><h2 id="pna-envelope-title" className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Context Envelope</h2></div><p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{envelope ? `Active · Revision ${envelope.revision} · ${attachedEntries.length} selected source${attachedEntries.length === 1 ? "" : "s"}` : "No private Context Envelope is attached to this thread."}</p></section>
          <div className="mt-4"><RouteDisclosure profile={profile} entryCount={attachedEntries.length} onOpenSettings={onOpenStewardshipSettings} /></div>
          {attachedEntries.length > 0 ? <section className="mt-4" aria-labelledby="pna-visible-sources"><div className="flex items-center gap-2"><BookOpen size={13} style={{ color: "var(--ln-gold-dim)" }} /><h2 id="pna-visible-sources" className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>What PNA can see</h2></div><div className="mt-3 grid gap-2">{attachedEntries.map((entry) => <ContextEntryCard key={entry.id} entry={entry} busy={isDetachingContext} onDetach={() => onDetachContext(entry.id)} onOpen={onOpenContextReference} />)}</div></section> : <section className="mt-4 rounded-lg p-3" style={{ background: "var(--ln-coal)", border: "1px dashed var(--ln-ash)" }}><p className="font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>No source is attached to this private thread. A playing Work is only a session suggestion until you attach it deliberately.</p><button type="button" onClick={onAttachNowPlaying} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-gold-dim)", color: "var(--ln-gold)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}><Music size={13} /> ATTACH NOW-PLAYING WORK</button></section>}
          {context ? <div className="mt-4 min-h-[280px]" aria-label="Session-only context canvas"><NexusContextPanel context={context} suggestion={suggestion} nowPlaying={nowPlaying} onClose={() => undefined} onOpen={onOpenContextReference} onVerify={onVerifyContext} onPlay={onPlayContext} /></div> : null}
        </div>
      ) : null}

      {surface === "sources" ? (
        <div id="pna-rail-panel-sources" role="tabpanel" aria-labelledby="pna-rail-tab-sources" className="min-h-0 flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}><div className="flex items-center gap-2"><Link2 size={13} style={{ color: "var(--ln-gold-dim)" }} /><h2 className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Source basis</h2></div><p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Sources describe records selected for a private Artifact. They do not turn an inference or proposal into a verified fact.</p>{artifactSources.length === 0 ? <div className="mt-4 rounded-lg p-4 text-center" style={{ background: "var(--ln-coal)", border: "1px dashed var(--ln-ash)" }}><Link2 className="mx-auto" size={20} style={{ color: "var(--ln-gold-dim)" }} /><p className="mt-3 font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>No recorded Artifact sources</p><p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Attach a source, then create a private proposal to see its source basis here.</p></div> : <div className="mt-4 grid gap-2">{artifactSources.map((source) => <div key={source.id} className="rounded-lg p-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}><p className="font-display text-[var(--text-xs)] tracking-[0.12em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>{source.relation.replace("_", " ")}</p><p className="mt-1 font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>{source.titleSnapshot}</p>{source.locatorSnapshot ? <p className="mt-1 font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{source.locatorSnapshot}</p> : null}</div>)}</div>}</div>
      ) : null}

      {surface === "artifacts" ? (
        <div id="pna-rail-panel-artifacts" role="tabpanel" aria-labelledby="pna-rail-tab-artifacts" className="min-h-0 flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}><div className="flex items-center gap-2"><Archive size={13} style={{ color: "var(--ln-gold-dim)" }} /><h2 className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Artifact Review</h2></div><p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>A private Artifact is not a Work, Witness ID, testimony, or publication.</p>{visibleArtifacts.length === 0 ? <div className="mt-4 rounded-lg p-4 text-center" style={{ background: "var(--ln-coal)", border: "1px dashed var(--ln-ash)" }}><Image className="mx-auto" size={20} style={{ color: "var(--ln-gold-dim)" }} /><p className="mt-3 font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>No private Artifacts yet</p><p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Vision proposals appear here for review before a private Quiver save is available.</p></div> : <div className="mt-4 grid gap-3">{visibleArtifacts.map((artifact) => <PNAArtifactReviewCard key={artifact.id} artifact={artifact} sources={artifactSources.filter((source) => source.artifactId === artifact.id)} pendingAction={pendingArtifactAction?.id === artifact.id ? pendingArtifactAction.action : null} onReview={() => onReviewArtifact(artifact.id)} onPreserve={() => onPreserveArtifact(artifact.id)} onDiscard={() => onDiscardArtifact(artifact.id)} onOpenQuiver={onOpenQuiver} />)}</div>}</div>
      ) : null}

      {surface === "activity" ? (
        <div id="pna-rail-panel-activity" role="tabpanel" aria-labelledby="pna-rail-tab-activity" className="min-h-0 flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}><div className="flex items-center gap-2"><CheckCircle2 size={13} style={{ color: "var(--ln-gold-dim)" }} /><h2 className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Creator decisions</h2></div><p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>This is a private operational record. It does not become Registry provenance.</p><div className="mt-4 grid gap-2">{actionReceipts.map((receipt) => <div key={receipt.id} className="rounded-lg p-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}><p className="font-display text-[var(--text-xs)] tracking-[0.12em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>{receipt.action.replaceAll("_", " ")}</p><p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>{receipt.effectSummary}</p><p className="mt-1 font-body text-[var(--text-xs)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{receipt.nonEffectSummary}</p><p className="mt-2 font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{formatDate(receipt.createdAt)}</p></div>)}{useReceipts.map((receipt) => <div key={receipt.id} className="rounded-lg p-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}><p className="font-display text-[var(--text-xs)] tracking-[0.12em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Model route · {receipt.outcome}</p><p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>{receipt.disclosureSnapshot}</p>{useEntries.filter((entry) => entry.receiptId === receipt.id).length > 0 ? <ul className="mt-2 grid gap-1 font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{useEntries.filter((entry) => entry.receiptId === receipt.id).map((entry) => <li key={entry.id}>• {entry.titleSnapshot}</li>)}</ul> : null}<p className="mt-2 font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{formatDate(receipt.createdAt)}</p></div>)}{actionReceipts.length === 0 && useReceipts.length === 0 ? <div className="rounded-lg p-4 text-center" style={{ background: "var(--ln-coal)", border: "1px dashed var(--ln-ash)" }}><p className="font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>No private decisions recorded</p><p className="mt-1 font-body text-[var(--text-sm)]" style={{ color: "var(--ln-smoke)" }}>Attach context or review an Artifact to make this creator-controlled activity visible.</p></div> : null}</div></div>
      ) : null}
    </aside>
  );
}
