/**
 * RightContextPanel — Expandable contextual right-side system.
 * Tabs: Provenance, Commentary, Metadata, Chapters.
 * Deep provenance systems hidden beneath the surface.
 */
import { Fingerprint, MessageSquare, Info, List, X, GitBranch, Users, Clock, ExternalLink } from "lucide-react";
import type { ManifestationReaderState, ManifestationReaderConfig } from "./useManifestationReader";

interface Props {
  state: ManifestationReaderState;
  config: ManifestationReaderConfig;
}

type TabId = "provenance" | "commentary" | "metadata" | "chapters";

export function RightContextPanel({ state, config }: Props) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "provenance", label: "Provenance", icon: <Fingerprint size={12} /> },
    { id: "commentary", label: "Commentary", icon: <MessageSquare size={12} /> },
    { id: "metadata", label: "Metadata", icon: <Info size={12} /> },
    { id: "chapters", label: "Chapters", icon: <List size={12} /> },
  ];

  return (
    <div
      className="h-full flex flex-col mr-slide-right flex-shrink-0"
      style={{
        width: "280px",
        background: "rgba(8,8,8,0.97)",
        borderLeft: "1px solid rgba(196,154,40,0.08)",
        backdropFilter: "blur(12px)",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-3 pt-14 pb-2 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => state.toggleRightPanel(tab.id)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[9px] font-heading font-bold tracking-wide transition-all"
            style={{
              background: state.rightPanelTab === tab.id ? "rgba(196,154,40,0.12)" : "transparent",
              color: state.rightPanelTab === tab.id ? "#C9A84C" : "rgba(232,223,200,0.4)",
              border: state.rightPanelTab === tab.id ? "1px solid rgba(196,154,40,0.2)" : "1px solid transparent",
            }}
          >
            {tab.icon}
            <span className="hidden xl:inline">{tab.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => state.toggleRightPanel()} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5" style={{ color: "#555" }}>
          <X size={12} />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(196,154,40,0.15) transparent" }}>
        {state.rightPanelTab === "provenance" && <ProvenanceTab config={config} />}
        {state.rightPanelTab === "commentary" && <CommentaryTab state={state} />}
        {state.rightPanelTab === "metadata" && <MetadataTab config={config} state={state} />}
        {state.rightPanelTab === "chapters" && <ChaptersTab state={state} config={config} />}
      </div>
    </div>
  );
}

// ── Provenance Tab ────────────────────────────────────────────────────────────

function ProvenanceTab({ config }: { config: ManifestationReaderConfig }) {
  const prov = config.provenance;
  if (!prov) {
    return (
      <div className="text-center py-8">
        <Fingerprint size={24} className="mx-auto mb-3" style={{ color: "rgba(196,154,40,0.3)" }} />
        <p className="text-xs" style={{ color: "rgba(232,223,200,0.4)" }}>No provenance data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Witness ID */}
      {prov.witnessId && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
            WITNESS ID
          </label>
          <div className="px-3 py-2 rounded-lg text-xs font-mono" style={{ background: "rgba(196,154,40,0.05)", color: "#C9A84C", border: "1px solid rgba(196,154,40,0.12)" }}>
            {prov.witnessId}
          </div>
        </div>
      )}

      {/* Creator */}
      {prov.creator && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
            CREATOR
          </label>
          <p className="text-xs" style={{ color: "rgba(232,223,200,0.7)" }}>{prov.creator}</p>
        </div>
      )}

      {/* Created At */}
      {prov.createdAt && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
            WITNESSED
          </label>
          <div className="flex items-center gap-1.5">
            <Clock size={11} style={{ color: "rgba(196,154,40,0.4)" }} />
            <p className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>{prov.createdAt}</p>
          </div>
        </div>
      )}

      {/* Contributors */}
      {prov.contributors && prov.contributors.length > 0 && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-2" style={{ color: "rgba(196,154,40,0.6)" }}>
            CONTRIBUTORS
          </label>
          <div className="space-y-1.5">
            {prov.contributors.map((c, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md" style={{ background: "rgba(196,154,40,0.04)" }}>
                <Users size={10} style={{ color: "rgba(196,154,40,0.4)" }} />
                <span className="text-xs" style={{ color: "rgba(232,223,200,0.7)" }}>{c.name}</span>
                <span className="text-[9px] ml-auto" style={{ color: "rgba(196,154,40,0.4)" }}>{c.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transformations */}
      {prov.transformations && prov.transformations.length > 0 && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-2" style={{ color: "rgba(196,154,40,0.6)" }}>
            TRANSFORMATION HISTORY
          </label>
          <div className="space-y-1.5 relative pl-3" style={{ borderLeft: "1px solid rgba(196,154,40,0.15)" }}>
            {prov.transformations.map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[13px] top-1.5 w-[5px] h-[5px] rounded-full" style={{ background: "rgba(196,154,40,0.5)" }} />
                <div className="pl-2">
                  <p className="text-[10px] font-heading font-bold" style={{ color: "rgba(232,223,200,0.6)" }}>{t.type}</p>
                  <p className="text-[9px]" style={{ color: "rgba(232,223,200,0.35)" }}>{t.date}</p>
                  {t.from && <p className="text-[9px]" style={{ color: "rgba(196,154,40,0.4)" }}>from: {t.from}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Derivatives */}
      {prov.derivatives && prov.derivatives.length > 0 && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-2" style={{ color: "rgba(196,154,40,0.6)" }}>
            DERIVATIVES
          </label>
          <div className="space-y-1.5">
            {prov.derivatives.map((d, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.06)" }}>
                <GitBranch size={10} style={{ color: "rgba(196,154,40,0.4)" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] truncate" style={{ color: "rgba(232,223,200,0.6)" }}>{d.title}</p>
                  <p className="text-[8px]" style={{ color: "rgba(196,154,40,0.35)" }}>{d.type}</p>
                </div>
                <ExternalLink size={9} style={{ color: "rgba(196,154,40,0.3)" }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Commentary Tab ────────────────────────────────────────────────────────────

function CommentaryTab({ state }: { state: ManifestationReaderState }) {
  const panels = state.currentPanels;
  const commentaryPanels = panels.filter(p => p.commentary);

  if (commentaryPanels.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare size={24} className="mx-auto mb-3" style={{ color: "rgba(196,154,40,0.3)" }} />
        <p className="text-xs" style={{ color: "rgba(232,223,200,0.4)" }}>No commentary on this page</p>
        <p className="text-[10px] mt-1" style={{ color: "rgba(232,223,200,0.25)" }}>Navigate to panels with creator commentary</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="text-[9px] font-heading font-bold tracking-widest block" style={{ color: "rgba(196,154,40,0.6)" }}>
        PAGE {state.pageIdx + 1} COMMENTARY
      </label>
      {commentaryPanels.map((panel, i) => (
        <div key={i} className="px-3 py-3 rounded-lg" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.08)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[8px] font-heading font-bold tracking-widest px-1.5 py-0.5 rounded"
              style={{ background: "rgba(196,154,40,0.1)", color: "rgba(196,154,40,0.6)" }}>
              {panel.type.toUpperCase()}
            </span>
            {panel.isEmotionalBeat && (
              <span className="text-[8px] font-heading font-bold tracking-widest px-1.5 py-0.5 rounded"
                style={{ background: "rgba(196,154,40,0.15)", color: "#C9A84C" }}>
                BEAT
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(232,223,200,0.7)", fontFamily: "'Georgia', serif" }}>
            {panel.commentary}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Metadata Tab ──────────────────────────────────────────────────────────────

function MetadataTab({ config, state }: { config: ManifestationReaderConfig; state: ManifestationReaderState }) {
  const page = config.pages[state.pageIdx];

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
          TITLE
        </label>
        <p className="text-sm font-heading font-bold" style={{ color: "rgba(232,223,200,0.8)" }}>{config.title}</p>
      </div>
      <div>
        <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
          MEDIUM
        </label>
        <p className="text-xs capitalize" style={{ color: "rgba(232,223,200,0.6)" }}>{config.medium}</p>
      </div>
      <div>
        <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
          TOTAL PAGES
        </label>
        <p className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>{config.pages.length}</p>
      </div>
      {config.panelData && config.panelData.length > 0 && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
            PANEL REGIONS
          </label>
          <p className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>
            {config.panelData.reduce((sum, pd) => sum + (pd.regions?.length ?? pd.panels?.length ?? 0), 0)} panels across {config.panelData.length} pages
          </p>
        </div>
      )}
      {config.soundtrackCues && config.soundtrackCues.length > 0 && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
            SOUNDTRACK CUES
          </label>
          <p className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>{config.soundtrackCues.length} cues linked</p>
        </div>
      )}
      {page && (
        <div>
          <label className="text-[9px] font-heading font-bold tracking-widest block mb-1.5" style={{ color: "rgba(196,154,40,0.6)" }}>
            CURRENT PAGE
          </label>
          <div className="space-y-1">
            <p className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>Page {page.pageNumber}</p>
            {page.caption && <p className="text-[10px] italic" style={{ color: "rgba(232,223,200,0.4)" }}>{page.caption}</p>}
            {page.chapterTitle && <p className="text-[10px]" style={{ color: "rgba(196,154,40,0.5)" }}>Chapter: {page.chapterTitle}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chapters Tab ──────────────────────────────────────────────────────────────

function ChaptersTab({ state, config }: { state: ManifestationReaderState; config: ManifestationReaderConfig }) {
  const { chapters = [] } = config;

  if (chapters.length === 0) {
    return (
      <div className="text-center py-8">
        <List size={24} className="mx-auto mb-3" style={{ color: "rgba(196,154,40,0.3)" }} />
        <p className="text-xs" style={{ color: "rgba(232,223,200,0.4)" }}>No chapters defined</p>
        <p className="text-[10px] mt-1" style={{ color: "rgba(232,223,200,0.25)" }}>This work uses continuous pagination</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[9px] font-heading font-bold tracking-widest block mb-2" style={{ color: "rgba(196,154,40,0.6)" }}>
        TABLE OF CONTENTS
      </label>
      {chapters.map((ch, i) => {
        const isActive = state.currentChapter?.id === ch.id;
        const pageCount = ch.endPage - ch.startPage + 1;
        return (
          <button
            key={ch.id}
            onClick={() => state.goToPage(ch.startPage - 1)}
            className="w-full text-left px-3 py-2.5 rounded-lg transition-all hover:bg-white/5"
            style={{
              background: isActive ? "rgba(196,154,40,0.08)" : "transparent",
              border: isActive ? "1px solid rgba(196,154,40,0.2)" : "1px solid transparent",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-heading font-bold w-5 text-center" style={{ color: isActive ? "#C9A84C" : "rgba(196,154,40,0.35)" }}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-heading font-bold truncate" style={{ color: isActive ? "#C9A84C" : "rgba(232,223,200,0.6)" }}>
                  {ch.title}
                </p>
                <p className="text-[9px]" style={{ color: "rgba(232,223,200,0.3)" }}>
                  Pages {ch.startPage}–{ch.endPage} · {pageCount} pages
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
