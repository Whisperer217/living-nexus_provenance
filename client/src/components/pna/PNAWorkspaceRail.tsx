import React from "react";
import { Archive, Image, Layers, Music, Sparkles } from "lucide-react";
import { NexusContextPanel, type NexusNowPlayingContext } from "@/components/NexusContextPanel";
import { PNAVisualProposalCard } from "@/components/PNAVisualProposalCard";
import type { NexusContextRef, NexusContextSuggestion } from "@/lib/nexusContext";
import type { PNAWorkspaceArtifact, PNAWorkspaceSurface } from "./pnaWorkspaceTypes";

interface PNAWorkspaceRailProps {
  surface: Exclude<PNAWorkspaceSurface, "conversation">;
  onSurfaceChange: (surface: Exclude<PNAWorkspaceSurface, "conversation">) => void;
  context: NexusContextRef | null;
  suggestion?: NexusContextSuggestion | null;
  nowPlaying?: NexusNowPlayingContext | null;
  artifacts: PNAWorkspaceArtifact[];
  isSavingArtifact?: boolean;
  onOpenNowPlaying: () => void;
  onCloseContext: () => void;
  onOpenContextReference: () => void;
  onVerifyContext: () => void;
  onPlayContext: () => void;
  onSaveArtifact: (messageId: string) => void;
  onOpenQuiver: () => void;
  mobile?: boolean;
}

function SurfaceTabs({ surface, onSurfaceChange }: Pick<PNAWorkspaceRailProps, "surface" | "onSurfaceChange">) {
  return (
    <div className="grid grid-cols-2 gap-1 p-2" role="tablist" aria-label="PNA inspection surfaces" style={{ borderBottom: "1px solid var(--ln-panel-border)" }}>
      {([
        ["context", "Context", Layers],
        ["artifacts", "Artifacts", Image],
      ] as const).map(([id, label, Icon]) => {
        const selected = surface === id;
        return (
          <button
            key={id}
            id={`pna-rail-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`pna-rail-panel-${id}`}
            onClick={() => onSurfaceChange(id)}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: selected ? "color-mix(in srgb, var(--ln-gold) 14%, transparent)" : "transparent",
              border: `1px solid ${selected ? "color-mix(in srgb, var(--ln-gold) 36%, transparent)" : "transparent"}`,
              color: selected ? "var(--ln-gold)" : "var(--ln-smoke)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.1em",
            }}
          >
            <Icon size={14} aria-hidden="true" />
            {label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export function PNAWorkspaceRail({
  surface,
  onSurfaceChange,
  context,
  suggestion,
  nowPlaying,
  artifacts,
  isSavingArtifact = false,
  onOpenNowPlaying,
  onCloseContext,
  onOpenContextReference,
  onVerifyContext,
  onPlayContext,
  onSaveArtifact,
  onOpenQuiver,
  mobile = false,
}: PNAWorkspaceRailProps) {
  const sourceEntries = [
    context ? { label: suggestion?.label ?? "Selected session context", detail: "Session-only · read-only" } : null,
    nowPlaying ? { label: nowPlaying.title, detail: nowPlaying.wid ? `Now playing · ${nowPlaying.wid}` : "Now playing · no WID available" } : null,
  ].filter(Boolean) as Array<{ label: string; detail: string }>;

  return (
    <aside
      aria-label="PNA workspace inspection rail"
      className={mobile ? "flex h-full min-h-0 w-full flex-col" : "hidden h-full min-h-0 w-[320px] flex-shrink-0 flex-col xl:flex"}
      style={{ background: "var(--ln-panel)", borderLeft: mobile ? "none" : "1px solid var(--ln-panel-border)" }}
    >
      <header className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--ln-panel-border)" }}>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--ln-gold) 10%, transparent)", color: "var(--ln-gold)", border: "1px solid color-mix(in srgb, var(--ln-gold) 24%, transparent)" }}>
          <Sparkles size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold)" }}>Private inspection</p>
          <p className="mt-1 font-body text-[var(--text-sm)]" style={{ color: "var(--ln-smoke)" }}>Sources and proposals remain creator-controlled.</p>
        </div>
      </header>

      <SurfaceTabs surface={surface} onSurfaceChange={onSurfaceChange} />

      {surface === "context" ? (
        <div id="pna-rail-panel-context" role="tabpanel" aria-labelledby="pna-rail-tab-context" className="flex min-h-0 flex-1 flex-col overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
          <section className="p-4" aria-labelledby="pna-active-sources-title">
            <div className="flex items-center gap-2">
              <Layers size={13} style={{ color: "var(--ln-gold-dim)" }} aria-hidden="true" />
              <h2 id="pna-active-sources-title" className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Active sources</h2>
            </div>
            {sourceEntries.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {sourceEntries.map((entry) => (
                  <div key={`${entry.label}-${entry.detail}`} className="rounded-lg p-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)" }}>
                    <p className="truncate font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>{entry.label}</p>
                    <p className="mt-1 font-mono text-[var(--text-xs)] tracking-[0.04em]" style={{ color: "var(--ln-smoke)" }}>{entry.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-lg p-3" style={{ background: "var(--ln-coal)", border: "1px dashed var(--ln-ash)" }}>
                <p className="font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-bone)" }}>No source is attached to this private thread. Select a Work context deliberately; nothing is inferred or persisted here.</p>
                <button
                  type="button"
                  onClick={onOpenNowPlaying}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2"
                  style={{ border: "1px solid var(--ln-gold-dim)", color: "var(--ln-gold)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.1em" }}
                >
                  <Music size={13} /> OPEN NOW-PLAYING CONTEXT
                </button>
              </div>
            )}
          </section>

          {context ? (
            <div className="min-h-[360px] flex-1" aria-label="Active context canvas">
              <NexusContextPanel
                context={context}
                suggestion={suggestion}
                nowPlaying={nowPlaying}
                onClose={onCloseContext}
                onOpen={onOpenContextReference}
                onVerify={onVerifyContext}
                onPlay={onPlayContext}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div id="pna-rail-panel-artifacts" role="tabpanel" aria-labelledby="pna-rail-tab-artifacts" className="min-h-0 flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}>
          <div className="flex items-center gap-2">
            <Archive size={13} style={{ color: "var(--ln-gold-dim)" }} aria-hidden="true" />
            <h2 className="font-display text-[var(--text-xs)] tracking-[0.18em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Private artifacts</h2>
          </div>
          <p className="mt-2 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Drafts stay private until you explicitly preserve them. A private artifact is not a Work, WID, or publication.</p>
          {artifacts.length === 0 ? (
            <div className="mt-4 rounded-lg p-4 text-center" style={{ background: "var(--ln-coal)", border: "1px dashed var(--ln-ash)" }}>
              <Image className="mx-auto" size={20} style={{ color: "var(--ln-gold-dim)" }} aria-hidden="true" />
              <p className="mt-3 font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>No private artifacts yet</p>
              <p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>Use Vision to prepare a proposal, then review it here before saving it to Quiver.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {artifacts.map((artifact) => (
                <PNAVisualProposalCard
                  key={artifact.id}
                  proposal={artifact.proposal}
                  isSaving={isSavingArtifact}
                  onSave={() => onSaveArtifact(artifact.id)}
                  onOpenQuiver={artifact.proposal.savedQuiverId ? onOpenQuiver : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
