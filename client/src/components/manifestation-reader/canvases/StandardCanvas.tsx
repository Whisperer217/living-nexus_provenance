/**
 * StandardCanvas — Single centered page with minimal distractions.
 * Dark immersive background, smooth zoom, clean page display.
 */
import type { ManifestationReaderState, ManifestationReaderConfig } from "../useManifestationReader";

interface Props {
  state: ManifestationReaderState;
  config: ManifestationReaderConfig;
}

export function StandardCanvas({ state, config }: Props) {
  const page = config.pages[state.pageIdx];
  if (!page) return null;

  return (
    <div
      className={`flex items-center justify-center h-full w-full
        ${state.transDir === "forward" ? "mr-page-forward" : state.transDir === "back" ? "mr-page-back" : ""}`}
      style={{ padding: "52px 80px" }}
    >
      {state.shouldLoadPage(state.pageIdx) && (
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="max-h-full object-contain rounded-sm"
          style={{
            maxWidth: "1100px",
            transform: `scale(${state.zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.2s ease",
            willChange: "transform",
            boxShadow: "0 8px 60px rgba(0,0,0,0.6), 0 2px 20px rgba(0,0,0,0.4)",
          }}
          draggable={false}
          loading="eager"
        />
      )}
      {/* Preload adjacent pages */}
      <div className="hidden">
        {state.pageIdx + 1 < state.totalPages && !state.isPageGated(state.pageIdx + 1) && (
          <img src={config.pages[state.pageIdx + 1]?.imageUrl} alt="" aria-hidden loading="lazy" />
        )}
        {state.pageIdx - 1 >= 0 && (
          <img src={config.pages[state.pageIdx - 1]?.imageUrl} alt="" aria-hidden loading="lazy" />
        )}
      </div>
    </div>
  );
}
