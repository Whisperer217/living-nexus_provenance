/**
 * OverviewCanvas — Grid/map visualization for chapter navigation
 * and manifestation discovery architecture.
 */
import { BookOpen, Lock } from "lucide-react";
import type { ManifestationReaderState, ManifestationReaderConfig } from "../useManifestationReader";

interface Props {
  state: ManifestationReaderState;
  config: ManifestationReaderConfig;
}

export function OverviewCanvas({ state, config }: Props) {
  const { chapters = [] } = config;
  const hasChapters = chapters.length > 0;

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-6">
      {/* Chapter headers (if available) */}
      {hasChapters && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {chapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => state.goToPage(ch.startPage - 1)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-heading font-bold tracking-wide transition-all hover:opacity-80"
                style={{
                  background: state.currentChapter?.id === ch.id ? "rgba(196,154,40,0.2)" : "rgba(196,154,40,0.05)",
                  color: state.currentChapter?.id === ch.id ? "#C9A84C" : "rgba(232,223,200,0.5)",
                  border: state.currentChapter?.id === ch.id ? "1px solid rgba(196,154,40,0.4)" : "1px solid rgba(196,154,40,0.1)",
                }}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Page grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {config.pages.map((p, i) => {
          const isGated = state.isPageGated(i);
          const isCurrent = i === state.pageIdx;
          // Find chapter boundary
          const isChapterStart = chapters.some(ch => ch.startPage === i + 1);

          return (
            <button
              key={i}
              onClick={() => {
                if (!isGated) {
                  state.goToPage(i);
                  state.setMode("standard");
                }
              }}
              className="relative rounded-lg overflow-hidden group transition-all hover:scale-[1.03] hover:shadow-lg"
              style={{
                aspectRatio: "3/4",
                border: isCurrent
                  ? "2px solid rgba(196,154,40,0.8)"
                  : isChapterStart
                    ? "1px solid rgba(196,154,40,0.35)"
                    : "1px solid rgba(196,154,40,0.08)",
                boxShadow: isCurrent ? "0 0 20px rgba(196,154,40,0.15)" : "none",
                opacity: isGated ? 0.3 : 1,
                cursor: isGated ? "not-allowed" : "pointer",
              }}
            >
              {state.shouldLoadPage(i) || Math.abs(i - state.pageIdx) <= 8 ? (
                <img
                  src={p.imageUrl}
                  alt={`Page ${p.pageNumber}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full" style={{ background: "rgba(196,154,40,0.03)" }} />
              )}
              {/* Page number badge */}
              <div
                className="absolute bottom-0 left-0 right-0 py-1 text-center text-[9px] font-heading font-bold"
                style={{
                  background: "rgba(0,0,0,0.75)",
                  color: isCurrent ? "#C9A84C" : "#666",
                }}
              >
                {isGated ? <Lock size={8} style={{ display: "inline" }} /> : p.pageNumber}
              </div>
              {/* Chapter start marker */}
              {isChapterStart && (
                <div className="absolute top-0 left-0 right-0 py-0.5 text-center text-[7px] font-heading font-bold tracking-widest"
                  style={{ background: "rgba(196,154,40,0.15)", color: "#C9A84C" }}>
                  CH
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <BookOpen size={16} style={{ color: "#C9A84C" }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
