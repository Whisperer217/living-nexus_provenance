/**
 * LeftNavPanel — Persistent left navigation architecture.
 * Page thumbnails, chapter markers, mode switcher, and reading progress.
 */
import { BookOpen, Compass, Grid3x3, Layers, Lock, Fingerprint } from "lucide-react";
import type { ManifestationReaderState, ManifestationReaderConfig, ViewingMode } from "./useManifestationReader";

interface Props {
  state: ManifestationReaderState;
  config: ManifestationReaderConfig;
}

export function LeftNavPanel({ state, config }: Props) {
  const { chapters = [] } = config;
  const hasChapters = chapters.length > 0;
  const progressPct = state.totalPages > 1 ? ((state.pageIdx) / (state.totalPages - 1)) * 100 : 0;

  return (
    <div
      className="h-full flex flex-col mr-slide-left flex-shrink-0"
      style={{
        width: "220px",
        background: "rgba(8,8,8,0.97)",
        borderRight: "1px solid rgba(196,154,40,0.08)",
        backdropFilter: "blur(12px)",
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 pt-14 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "rgba(196,154,40,0.12)" }}>
            <BookOpen size={10} style={{ color: "#C9A84C" }} />
          </div>
          <span className="text-[10px] font-heading font-bold tracking-widest" style={{ color: "rgba(232,223,200,0.6)" }}>
            NAVIGATION
          </span>
        </div>
        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-heading tracking-wide" style={{ color: "rgba(232,223,200,0.4)" }}>
              Progress
            </span>
            <span className="text-[9px] font-heading font-bold" style={{ color: "#C9A84C" }}>
              {Math.round(progressPct)}%
            </span>
          </div>
          <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(196,154,40,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: "rgba(196,154,40,0.5)" }} />
          </div>
        </div>
      </div>

      {/* Chapter list (if available) */}
      {hasChapters && (
        <div className="px-3 pb-2 flex-shrink-0">
          <span className="text-[9px] font-heading font-bold tracking-widest px-1 mb-1.5 block" style={{ color: "rgba(232,223,200,0.35)" }}>
            CHAPTERS
          </span>
          <div className="space-y-0.5">
            {chapters.map(ch => {
              const isActive = state.currentChapter?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => state.goToPage(ch.startPage - 1)}
                  className="w-full text-left px-2 py-1.5 rounded-md text-[10px] font-heading tracking-wide transition-all hover:bg-white/5"
                  style={{
                    color: isActive ? "#C9A84C" : "rgba(232,223,200,0.5)",
                    background: isActive ? "rgba(196,154,40,0.08)" : "transparent",
                  }}
                >
                  {ch.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Page thumbnails */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(196,154,40,0.15) transparent" }}>
        <span className="text-[9px] font-heading font-bold tracking-widest px-1 mb-1.5 block" style={{ color: "rgba(232,223,200,0.35)" }}>
          PAGES
        </span>
        {config.pages.map((p, i) => {
          const isCurrent = i === state.pageIdx;
          const isGated = state.isPageGated(i);
          return (
            <button
              key={i}
              onClick={() => { if (!isGated) state.goToPage(i); }}
              className="w-full rounded-md overflow-hidden transition-all hover:opacity-90 relative group"
              style={{
                aspectRatio: "3/4",
                border: isCurrent ? "2px solid rgba(196,154,40,0.7)" : "1px solid rgba(196,154,40,0.06)",
                opacity: isGated ? 0.3 : 1,
                cursor: isGated ? "not-allowed" : "pointer",
                boxShadow: isCurrent ? "0 0 12px rgba(196,154,40,0.1)" : "none",
              }}
            >
              <img
                src={p.imageUrl}
                alt={`Page ${p.pageNumber}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 py-0.5 text-center text-[8px] font-heading font-bold"
                style={{ background: "rgba(0,0,0,0.7)", color: isCurrent ? "#C9A84C" : "#555" }}>
                {isGated ? <Lock size={7} style={{ display: "inline" }} /> : p.pageNumber}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom: reading info */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(196,154,40,0.06)" }}>
        <div className="text-[9px] font-heading tracking-wide" style={{ color: "rgba(232,223,200,0.3)" }}>
          {state.pageIdx + 1} of {state.totalPages} pages
        </div>
      </div>
    </div>
  );
}
