/**
 * ChainOfRecordFooter
 * ─────────────────────────────────────────────────────────────────────────────
 * Three-column expandable footer zone for SongDetailPage.
 * Columns: Provenance Timeline | Lineage Graph | Witnesses
 *
 * Desktop: side-by-side three columns, each independently expandable.
 * Mobile: stacked accordion, collapsed by default to reduce eye fatigue.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, GitBranch, Eye } from "lucide-react";
import { ProvenanceTimeline } from "./ProvenanceTimeline";
import { LineageGraph } from "./LineageGraph";
import { WitnessesPanel } from "./WitnessesPanel";

interface ChainOfRecordFooterProps {
  songId: number;
  songTitle: string;
  ownerId: number;
}

interface ColumnDef {
  id: "provenance" | "lineage" | "witnesses";
  label: string;
  sublabel: string;
  Icon: React.ElementType;
}

const COLUMNS: ColumnDef[] = [
  {
    id: "provenance",
    label: "Provenance",
    sublabel: "Timeline",
    Icon: Clock,
  },
  {
    id: "lineage",
    label: "Lineage",
    sublabel: "Graph",
    Icon: GitBranch,
  },
  {
    id: "witnesses",
    label: "Witnesses",
    sublabel: "Co-signers",
    Icon: Eye,
  },
];

export function ChainOfRecordFooter({ songId, songTitle, ownerId }: ChainOfRecordFooterProps) {
  // Each column tracks its own open state; default all closed on mobile
  const [open, setOpen] = useState<Record<string, boolean>>({
    provenance: false,
    lineage: false,
    witnesses: false,
  });

  const toggle = (id: string) =>
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="mt-8" style={{ borderTop: "1px solid rgba(196,154,40,0.12)" }}>
      {/* Section header */}
      <div className="flex items-center gap-3 pt-6 pb-5 px-1">
        <div
          className="w-px h-6 flex-shrink-0"
          style={{ background: "rgba(196,154,40,0.35)" }}
        />
        <div>
          <p
            className="text-[10px] tracking-[0.22em] uppercase"
            style={{ color: "rgba(196,154,40,0.5)", fontFamily: "'Cinzel', serif" }}
          >
            Chain of Record
          </p>
          <p
            className="text-[11px] mt-0.5"
            style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
          >
            Immutable origin, lineage, and co-signers of this work
          </p>
        </div>
      </div>

      {/* ── Desktop: three columns side-by-side ── */}
      {/* ── Mobile: stacked accordion ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLUMNS.map(({ id, label, sublabel, Icon }) => {
          const isOpen = open[id];
          return (
            <div
              key={id}
              className="rounded-xl overflow-hidden transition-all duration-300"
              style={{
                background: isOpen
                  ? "rgba(196,154,40,0.04)"
                  : "rgba(255,255,255,0.02)",
                border: isOpen
                  ? "1px solid rgba(196,154,40,0.22)"
                  : "1px solid rgba(196,154,40,0.09)",
              }}
            >
              {/* Column header / toggle */}
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3.5 transition-opacity hover:opacity-80"
                onClick={() => toggle(id)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: isOpen ? "rgba(196,154,40,0.85)" : "rgba(196,154,40,0.45)" }}
                  />
                  <div className="text-left">
                    <p
                      className="text-[11px] tracking-[0.16em] uppercase leading-none"
                      style={{
                        fontFamily: "'Cinzel', serif",
                        color: isOpen ? "rgba(196,154,40,0.9)" : "rgba(196,154,40,0.55)",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 leading-none"
                      style={{ color: "rgba(255,255,255,0.28)", fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {sublabel}
                    </p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.55)" }} />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.35)" }} />
                )}
              </button>

              {/* Expandable content */}
              {isOpen && (
                <div className="px-2 pb-3">
                  {id === "provenance" && (
                    <ProvenanceTimeline
                      songId={songId}
                      ownerId={ownerId}
                    />
                  )}
                  {id === "lineage" && (
                    <LineageGraph
                      songId={songId}
                      songTitle={songTitle}
                      ownerId={ownerId}
                    />
                  )}
                  {id === "witnesses" && (
                    <WitnessesPanel
                      songId={songId}
                      ownerId={ownerId}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
