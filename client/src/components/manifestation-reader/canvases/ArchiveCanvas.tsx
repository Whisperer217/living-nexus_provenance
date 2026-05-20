/**
 * ArchiveCanvas — Progressive Provenance Visualization
 * ═══════════════════════════════════════════════════════
 * 
 * Progressively reveals provenance depth rather than overwhelming
 * users with graph complexity on initial load.
 * 
 * Layers:
 *   L1 (Surface)    → WID badge, creation date, primary creator
 *   L2 (Context)    → Contributors, consent type, medium classification
 *   L3 (Lineage)    → Derivative relationships, parent/child works
 *   L4 (Deep)       → Transformation history, version timeline
 *   L5 (Ecosystem)  → Cross-medium connections, bundle relationships
 * 
 * Each layer reveals on interaction (click/tap to deepen).
 * The user controls their depth of exploration.
 */
import { useState, useMemo } from "react";
import {
  Shield, Users, GitBranch, Clock, Network,
  ChevronDown, ChevronUp, Eye, Fingerprint, Crown
} from "lucide-react";
import type { ManifestationReaderState, ManifestationReaderConfig } from "../useManifestationReader";

interface Props {
  state: ManifestationReaderState;
  config: ManifestationReaderConfig;
}

type ProvenanceDepthLevel = 1 | 2 | 3 | 4 | 5;

const DEPTH_LABELS: Record<ProvenanceDepthLevel, { label: string; icon: typeof Shield; description: string }> = {
  1: { label: "SURFACE", icon: Shield, description: "Identity & Origin" },
  2: { label: "CONTEXT", icon: Users, description: "Contributors & Classification" },
  3: { label: "LINEAGE", icon: GitBranch, description: "Derivative Relationships" },
  4: { label: "DEEP", icon: Clock, description: "Transformation History" },
  5: { label: "ECOSYSTEM", icon: Network, description: "Cross-Medium Connections" },
};

export function ArchiveCanvas({ state, config }: Props) {
  const [depthLevel, setDepthLevel] = useState<ProvenanceDepthLevel>(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const provenance = config.provenance;
  const page = config.pages[state.pageIdx];

  const canDeepen = depthLevel < 5;
  const canSurface = depthLevel > 1;

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Depth indicator dots
  const depthIndicator = useMemo(() => (
    <div className="flex items-center gap-1.5">
      {([1, 2, 3, 4, 5] as ProvenanceDepthLevel[]).map(level => (
        <button
          key={level}
          onClick={() => setDepthLevel(level)}
          className="transition-all duration-300"
          style={{
            width: level <= depthLevel ? "10px" : "6px",
            height: level <= depthLevel ? "10px" : "6px",
            borderRadius: "50%",
            background: level <= depthLevel
              ? `rgba(196, 154, 40, ${0.3 + (level / 5) * 0.7})`
              : "rgba(196, 154, 40, 0.1)",
            border: level === depthLevel
              ? "1px solid rgba(196, 154, 40, 0.8)"
              : "1px solid rgba(196, 154, 40, 0.1)",
            boxShadow: level === depthLevel ? "0 0 8px rgba(196, 154, 40, 0.3)" : "none",
          }}
          title={DEPTH_LABELS[level].description}
        />
      ))}
    </div>
  ), [depthLevel]);

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center p-6 md:p-10">
      {/* Depth navigation header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {(() => {
              const DepthIcon = DEPTH_LABELS[depthLevel].icon;
              return <DepthIcon size={16} style={{ color: "#C9A84C" }} />;
            })()}
            <span className="text-[10px] font-heading font-bold tracking-[0.2em]" style={{ color: "#C9A84C" }}>
              {DEPTH_LABELS[depthLevel].label}
            </span>
            <span className="text-[9px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>
              {DEPTH_LABELS[depthLevel].description}
            </span>
          </div>
          {depthIndicator}
        </div>

        {/* Depth navigation controls */}
        <div className="flex gap-2">
          {canSurface && (
            <button
              onClick={() => setDepthLevel(d => Math.max(1, d - 1) as ProvenanceDepthLevel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-heading font-bold tracking-widest transition-all hover:opacity-80"
              style={{
                background: "rgba(196,154,40,0.05)",
                border: "1px solid rgba(196,154,40,0.15)",
                color: "rgba(232,223,200,0.5)",
              }}
            >
              <ChevronUp size={10} /> SURFACE
            </button>
          )}
          {canDeepen && (
            <button
              onClick={() => setDepthLevel(d => Math.min(5, d + 1) as ProvenanceDepthLevel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-heading font-bold tracking-widest transition-all hover:opacity-80"
              style={{
                background: "rgba(196,154,40,0.1)",
                border: "1px solid rgba(196,154,40,0.25)",
                color: "#C9A84C",
              }}
            >
              <ChevronDown size={10} /> DEEPEN
            </button>
          )}
        </div>
      </div>

      {/* Layer 1: Surface — WID, creation date, primary creator */}
      <div
        className="w-full max-w-2xl rounded-2xl p-6 mb-4 transition-all duration-500"
        style={{
          background: "rgba(5,5,5,0.6)",
          border: "1px solid rgba(196,154,40,0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Fingerprint size={14} style={{ color: "#C9A84C" }} />
          <span className="text-[10px] font-heading font-bold tracking-[0.15em]" style={{ color: "#C9A84C" }}>
            WITNESS IDENTITY
          </span>
        </div>

        <div className="space-y-3">
          {/* WID */}
          {provenance?.wid && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>WID</span>
              <span className="font-mono text-xs" style={{ color: "rgba(232,223,200,0.8)" }}>
                {provenance.wid}
              </span>
            </div>
          )}
          {/* Title */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>TITLE</span>
            <span className="text-sm font-heading" style={{ color: "rgba(232,223,200,0.9)" }}>
              {config.title}
            </span>
          </div>
          {/* Primary Creator */}
          {provenance?.creator && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>CREATOR</span>
              <div className="flex items-center gap-2">
                <Crown size={10} style={{ color: "#C9A84C" }} />
                <span className="text-sm" style={{ color: "rgba(232,223,200,0.8)" }}>
                  {provenance.creator}
                </span>
              </div>
            </div>
          )}
          {/* Creation Date */}
          {provenance?.createdAt && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>REGISTERED</span>
              <span className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>
                {new Date(provenance.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Layer 2: Context — Contributors, consent, medium */}
      {depthLevel >= 2 && (
        <div
          className="w-full max-w-2xl rounded-2xl p-6 mb-4 transition-all duration-500 mr-fade-in"
          style={{
            background: "rgba(5,5,5,0.5)",
            border: "1px solid rgba(196,154,40,0.08)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Users size={14} style={{ color: "rgba(196,154,40,0.7)" }} />
            <span className="text-[10px] font-heading font-bold tracking-[0.15em]" style={{ color: "rgba(196,154,40,0.7)" }}>
              CONTEXT
            </span>
          </div>
          <div className="space-y-3">
            {/* Consent Type */}
            {provenance?.consentType && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>CONSENT</span>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  background: "rgba(196,154,40,0.1)",
                  color: "#C9A84C",
                  border: "1px solid rgba(196,154,40,0.2)",
                }}>
                  {provenance.consentType}
                </span>
              </div>
            )}
            {/* Medium */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>MEDIUM</span>
              <span className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>
                {state.adapter.label}
              </span>
            </div>
            {/* Contributors */}
            {provenance?.contributors && provenance.contributors.length > 0 && (
              <div>
                <span className="text-[10px] tracking-wide block mb-2" style={{ color: "rgba(232,223,200,0.4)" }}>CONTRIBUTORS</span>
                <div className="flex flex-wrap gap-2">
                  {provenance.contributors.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]"
                      style={{
                        background: "rgba(196,154,40,0.05)",
                        border: "1px solid rgba(196,154,40,0.1)",
                        color: "rgba(232,223,200,0.6)",
                      }}
                    >
                      <Eye size={8} style={{ color: "rgba(196,154,40,0.5)" }} />
                      {c.name}{c.role ? ` · ${c.role}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layer 3: Lineage — Derivative relationships */}
      {depthLevel >= 3 && (
        <div
          className="w-full max-w-2xl rounded-2xl p-6 mb-4 transition-all duration-500 mr-fade-in"
          style={{
            background: "rgba(5,5,5,0.4)",
            border: "1px solid rgba(196,154,40,0.06)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <GitBranch size={14} style={{ color: "rgba(196,154,40,0.6)" }} />
            <span className="text-[10px] font-heading font-bold tracking-[0.15em]" style={{ color: "rgba(196,154,40,0.6)" }}>
              LINEAGE
            </span>
          </div>
          <div className="space-y-3">
            {provenance?.parentWid && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>DERIVED FROM</span>
                <span className="font-mono text-[10px]" style={{ color: "rgba(196,154,40,0.7)" }}>
                  {provenance.parentWid}
                </span>
              </div>
            )}
            {provenance?.derivatives && provenance.derivatives.length > 0 && (
              <div>
                <span className="text-[10px] tracking-wide block mb-2" style={{ color: "rgba(232,223,200,0.4)" }}>DERIVATIVES</span>
                <div className="space-y-1.5">
                  {provenance.derivatives.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all hover:opacity-80"
                      style={{
                        background: "rgba(196,154,40,0.03)",
                        border: "1px solid rgba(196,154,40,0.08)",
                      }}
                      onClick={() => toggleNode(`deriv-${i}`)}
                    >
                      <span className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>{d.title}</span>
                      <GitBranch size={10} style={{ color: "rgba(196,154,40,0.4)" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!provenance?.parentWid && (!provenance?.derivatives || provenance.derivatives.length === 0) && (
              <p className="text-[10px] italic" style={{ color: "rgba(232,223,200,0.3)" }}>
                This is an origin manifestation — no known lineage connections.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Layer 4: Deep — Transformation history */}
      {depthLevel >= 4 && (
        <div
          className="w-full max-w-2xl rounded-2xl p-6 mb-4 transition-all duration-500 mr-fade-in"
          style={{
            background: "rgba(5,5,5,0.35)",
            border: "1px solid rgba(196,154,40,0.04)",
            backdropFilter: "blur(3px)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Clock size={14} style={{ color: "rgba(196,154,40,0.5)" }} />
            <span className="text-[10px] font-heading font-bold tracking-[0.15em]" style={{ color: "rgba(196,154,40,0.5)" }}>
              TRANSFORMATION HISTORY
            </span>
          </div>
          <div className="relative pl-4 border-l" style={{ borderColor: "rgba(196,154,40,0.1)" }}>
            {provenance?.transformations && provenance.transformations.length > 0 ? (
              provenance.transformations.map((t, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                  <div
                    className="absolute -left-[21px] w-2.5 h-2.5 rounded-full"
                    style={{
                      background: i === 0 ? "#C9A84C" : "rgba(196,154,40,0.3)",
                      border: "2px solid rgba(10,10,10,1)",
                    }}
                  />
                  <div className="ml-2">
                    <p className="text-xs" style={{ color: "rgba(232,223,200,0.7)" }}>{t.description}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: "rgba(232,223,200,0.3)" }}>
                      {new Date(t.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] italic ml-2" style={{ color: "rgba(232,223,200,0.3)" }}>
                No transformation events recorded.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Layer 5: Ecosystem — Cross-medium connections */}
      {depthLevel >= 5 && (
        <div
          className="w-full max-w-2xl rounded-2xl p-6 mb-4 transition-all duration-500 mr-fade-in"
          style={{
            background: "rgba(5,5,5,0.3)",
            border: "1px solid rgba(196,154,40,0.03)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Network size={14} style={{ color: "rgba(196,154,40,0.4)" }} />
            <span className="text-[10px] font-heading font-bold tracking-[0.15em]" style={{ color: "rgba(196,154,40,0.4)" }}>
              ECOSYSTEM
            </span>
          </div>
          <div className="space-y-3">
            {provenance?.relatedWorks && provenance.relatedWorks.length > 0 ? (
              provenance.relatedWorks.map((rw, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(196,154,40,0.02)",
                    border: "1px solid rgba(196,154,40,0.06)",
                  }}
                >
                  <div>
                    <p className="text-xs" style={{ color: "rgba(232,223,200,0.6)" }}>{rw.title}</p>
                    <p className="text-[9px]" style={{ color: "rgba(232,223,200,0.3)" }}>{rw.medium} · {rw.relationship}</p>
                  </div>
                  <Network size={10} style={{ color: "rgba(196,154,40,0.3)" }} />
                </div>
              ))
            ) : (
              <p className="text-[10px] italic" style={{ color: "rgba(232,223,200,0.3)" }}>
                No cross-medium ecosystem connections mapped yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail of current page for reference */}
      {page && (
        <div className="w-full max-w-2xl mt-6 flex justify-center">
          <div className="relative rounded-lg overflow-hidden" style={{ maxWidth: "200px", opacity: 0.6 }}>
            <img
              src={page.imageUrl}
              alt={`Page ${page.pageNumber} reference`}
              className="w-full object-contain"
              style={{ filter: "brightness(0.7)" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)" }} />
            <div className="absolute bottom-2 left-0 right-0 text-center text-[8px] font-heading" style={{ color: "rgba(196,154,40,0.5)" }}>
              {state.adapter.primaryUnit} {page.pageNumber}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
