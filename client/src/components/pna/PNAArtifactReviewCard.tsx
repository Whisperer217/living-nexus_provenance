import React from "react";
import { Archive, Check, Eye, Image, Loader2, Trash2 } from "lucide-react";
import type { PNAArtifactSourceView, PNAWorkspaceArtifact } from "./pnaWorkspaceTypes";

interface PNAArtifactReviewCardProps {
  artifact: PNAWorkspaceArtifact;
  sources: PNAArtifactSourceView[];
  pendingAction?: "review" | "preserve" | "discard" | null;
  onReview: () => void;
  onPreserve: () => void;
  onDiscard: () => void;
  onOpenQuiver: () => void;
}

const STATE_COPY = {
  draft: { label: "REQUIRES REVIEW", detail: "A private proposal. Nothing has been attached, registered, or published." },
  reviewed: { label: "REVIEWED", detail: "Review is complete. Preserve only if you want a private Quiver copy." },
  preserved_private: { label: "PRESERVED PRIVATELY", detail: "A private Quiver copy exists. No Work, WID, or public page changed." },
  discarded: { label: "DISCARDED FROM REVIEW", detail: "The proposal is no longer active in this review flow. No Registry record changed." },
} as const;

function SourceLabel({ source }: { source: PNAArtifactSourceView }) {
  const relation = source.relation === "source" ? "SOURCE" : source.relation === "creator_input" ? "CREATOR INPUT" : "INFERENCE";
  return (
    <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--ln-iron)", border: "1px solid var(--ln-panel-border)" }}>
      <p className="font-display text-[var(--text-xs)] tracking-[0.12em]" style={{ color: "var(--ln-gold-dim)" }}>{relation}</p>
      <p className="mt-1 truncate font-body text-[var(--text-sm)]" style={{ color: "var(--ln-bone)" }}>{source.titleSnapshot}</p>
      {source.locatorSnapshot ? <p className="mt-0.5 truncate font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{source.locatorSnapshot}</p> : null}
    </div>
  );
}

export function PNAArtifactReviewCard({ artifact, sources, pendingAction = null, onReview, onPreserve, onDiscard, onOpenQuiver }: PNAArtifactReviewCardProps) {
  const state = STATE_COPY[artifact.state];
  const url = artifact.payloadJson?.url ?? artifact.proposal?.url;
  const prompt = artifact.payloadJson?.prompt ?? artifact.proposal?.prompt;
  const busy = Boolean(pendingAction);

  return (
    <article className="overflow-hidden rounded-xl" style={{ background: "var(--ln-coal)", border: "1px solid color-mix(in srgb, var(--ln-gold) 30%, var(--ln-panel-border))" }}>
      {url ? (
        <img src={url} alt={`Private Artifact preview: ${artifact.title}`} className="block aspect-square w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center" style={{ background: "var(--ln-iron)", color: "var(--ln-gold-dim)" }}><Image size={24} aria-hidden="true" /></div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[var(--text-xs)] tracking-[0.14em] uppercase" style={{ color: "var(--ln-gold)" }}>Private Artifact · {state.label}</p>
            <h3 className="mt-1 font-editorial text-[var(--text-h4)] leading-tight" style={{ color: "var(--ln-parchment)" }}>{artifact.title}</h3>
          </div>
          <Archive size={15} style={{ color: "var(--ln-gold-dim)" }} aria-hidden="true" />
        </div>
        <p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{artifact.summary ?? state.detail}</p>
        {prompt ? <p className="mt-3 line-clamp-3 rounded-lg px-2.5 py-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)", background: "var(--ln-iron)", border: "1px solid var(--ln-panel-border)" }}>{prompt}</p> : null}

        {sources.length > 0 ? (
          <section className="mt-3" aria-label={`Source basis for ${artifact.title}`}>
            <p className="font-display text-[var(--text-xs)] tracking-[0.12em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Source basis</p>
            <div className="mt-2 grid gap-2">{sources.map((source) => <SourceLabel key={source.id} source={source} />)}</div>
          </section>
        ) : null}

        <p className="mt-3 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>{state.detail}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {artifact.state === "draft" ? (
            <button type="button" onClick={onReview} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2" style={{ background: "var(--ln-gold)", color: "var(--ln-void)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}>
              {pendingAction === "review" ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />} MARK REVIEWED
            </button>
          ) : null}
          {artifact.state === "reviewed" ? (
            <button type="button" onClick={onPreserve} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2" style={{ background: "var(--ln-gold)", color: "var(--ln-void)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}>
              {pendingAction === "preserve" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} PRESERVE PRIVATELY
            </button>
          ) : null}
          {artifact.state === "preserved_private" ? (
            <button type="button" onClick={onOpenQuiver} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-gold-dim)", color: "var(--ln-gold)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}>
              <Archive size={14} /> OPEN PRIVATE QUIVER
            </button>
          ) : null}
          {artifact.state !== "preserved_private" && artifact.state !== "discarded" ? (
            <button type="button" onClick={onDiscard} disabled={busy} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-smoke)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}>
              {pendingAction === "discard" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} DISCARD REVIEW
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
