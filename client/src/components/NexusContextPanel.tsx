import React from "react";
import { ExternalLink, Music, PanelRightClose, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import type { NexusContextRef, NexusContextSuggestion } from "@/lib/nexusContext";

export interface NexusNowPlayingContext {
  id: number | string;
  title: string;
  artist?: string | null;
  artUrl?: string | null;
  wid?: string | null;
  isPlaying: boolean;
}

interface NexusContextPanelProps {
  context: NexusContextRef;
  suggestion?: NexusContextSuggestion | null;
  nowPlaying?: NexusNowPlayingContext | null;
  onClose: () => void;
  onOpen: () => void;
  onVerify: () => void;
  onPlay: () => void;
}

const KIND_LABEL: Record<NexusContextRef["kind"], string> = {
  explore: "Explore context",
  work: "Work context",
  creator: "Creator context",
  provenance: "Provenance context",
  "now-playing": "Now playing",
};

/**
 * ADR-023 Phase 1 renderer. Data resolution remains host-owned and read-only.
 * This component intentionally has no query, persistence, or mutation behavior.
 */
export function NexusContextPanel({
  context,
  suggestion,
  nowPlaying,
  onClose,
  onOpen,
  onVerify,
  onPlay,
}: NexusContextPanelProps) {
  const isNowPlaying = context.kind === "now-playing";
  const canVerify = context.kind === "provenance" || (context.kind === "work" && Boolean(context.wid)) || (isNowPlaying && Boolean(nowPlaying?.wid));
  const canPlay = isNowPlaying || context.kind === "work";
  const sourceLabel = suggestion?.source === "agent-suggestion"
    ? suggestion.confidence === "deterministic" ? "Agent-suggested · deterministic reference" : "Agent-suggested · review before use"
    : isNowPlaying ? "Player session · read-only context" : "Canonical reference · read-only context";

  return (
    <aside
      aria-label="Nexus Context Canvas"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      style={{ background: "var(--ln-panel)", borderLeft: "1px solid var(--ln-panel-border)" }}
    >
      <header
        className="flex items-start justify-between gap-3 px-4 py-3"
        style={{ borderBottom: "1px solid var(--ln-panel-border)" }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles size={13} style={{ color: "var(--ln-gold)" }} aria-hidden="true" />
            <span className="font-display text-[var(--text-xs)] tracking-[0.2em] uppercase" style={{ color: "var(--ln-gold)" }}>
              Context Canvas
            </span>
          </div>
          <p className="mt-1 font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>
            {sourceLabel}
          </p>
        </div>
        <button
          type="button"
          aria-label="Close Context Canvas"
          onClick={onClose}
          className="rounded-md p-1.5 transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2"
          style={{ color: "var(--ln-smoke)", outlineColor: "var(--ln-gold)" }}
        >
          <X size={15} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ overscrollBehavior: "contain" }}>
        <section className="rounded-xl p-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}>
          <div className="flex items-start gap-3">
            {isNowPlaying && nowPlaying?.artUrl ? (
              <img src={nowPlaying.artUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--ln-iron)", color: "var(--ln-gold)" }}>
                <Music size={20} aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>
                {KIND_LABEL[context.kind]}
              </p>
              <h2 className="mt-1 truncate font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>
                {isNowPlaying ? nowPlaying?.title ?? "No work is active" : suggestion?.label ?? "Selected reference"}
              </h2>
              {isNowPlaying && nowPlaying?.artist && (
                <p className="mt-0.5 truncate font-body text-[var(--text-sm)]" style={{ color: "var(--ln-smoke)" }}>
                  {nowPlaying.artist}
                </p>
              )}
              {isNowPlaying && nowPlaying?.wid && (
                <p className="mt-2 truncate font-mono text-[var(--text-xs)] tracking-[0.05em]" style={{ color: "var(--ln-gold)" }}>
                  {nowPlaying.wid}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4" aria-labelledby="context-boundary-title">
          <h3 id="context-boundary-title" className="font-display text-[var(--text-xs)] tracking-[0.2em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>
            Boundary
          </h3>
          <p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>
            This panel orients the workspace. It does not rewrite provenance, alter playback, save a diary, or act on behalf of the Keeper.
          </p>
        </section>

        <section className="mt-5" aria-labelledby="context-actions-title">
          <h3 id="context-actions-title" className="font-display text-[var(--text-xs)] tracking-[0.2em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>
            Deliberate actions
          </h3>
          <div className="mt-2 grid gap-2">
            {!isNowPlaying && (
              <button
                type="button"
                onClick={onOpen}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-display text-[var(--text-xs)] tracking-[0.12em] uppercase transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2"
                style={{ color: "var(--ln-gold)", border: "1px solid var(--ln-gold-dim)", outlineColor: "var(--ln-gold)" }}
              >
                <ExternalLink size={13} /> Open reference
              </button>
            )}
            {canVerify && (
              <button
                type="button"
                onClick={onVerify}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-display text-[var(--text-xs)] tracking-[0.12em] uppercase transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2"
                style={{ color: "var(--ln-parchment)", border: "1px solid var(--ln-ash)", outlineColor: "var(--ln-gold)" }}
              >
                <ShieldCheck size={13} /> Verify WID
              </button>
            )}
            {canPlay && (
              <button
                type="button"
                onClick={onPlay}
                disabled={isNowPlaying && !nowPlaying}
                className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-display text-[var(--text-xs)] tracking-[0.12em] uppercase transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
                style={{ background: "var(--ln-gold)", color: "var(--ln-void)", outlineColor: "var(--ln-gold)" }}
              >
                <Play size={13} fill="currentColor" /> {isNowPlaying && nowPlaying?.isPlaying ? "Pause playback" : "Play"}
              </button>
            )}
          </div>
        </section>
      </div>

      <footer className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
        <PanelRightClose size={13} style={{ color: "var(--ln-smoke)" }} aria-hidden="true" />
        <p className="font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>
          Session-only · no durable memory
        </p>
      </footer>
    </aside>
  );
}
