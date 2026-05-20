/**
 * StandardCanvas — Single centered page with minimal distractions.
 * Adapts layout behavior from the medium adapter:
 * - fillMode, maxWidthFraction, padding, centered, aspectRatio
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

  const { layout } = state.adapter;

  // Compute max-width from adapter layout config
  const maxWidth = `${Math.round(layout.maxWidthFraction * 100)}vw`;

  // Compute object-fit from fillMode
  const objectFit: React.CSSProperties["objectFit"] =
    layout.fillMode === "cover" ? "cover" :
    layout.fillMode === "fit-width" ? "contain" :
    layout.fillMode === "fit-height" ? "contain" :
    "contain";

  return (
    <div
      className={`flex items-center justify-center h-full w-full
        ${state.transDir === "forward" ? "mr-page-forward" : state.transDir === "back" ? "mr-page-back" : ""}`}
      style={{ padding: `52px ${layout.padding * 16}px` }}
    >
      {state.shouldLoadPage(state.pageIdx) && (
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          className="max-h-full rounded-sm"
          style={{
            maxWidth,
            objectFit,
            aspectRatio: layout.aspectRatio ?? undefined,
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
