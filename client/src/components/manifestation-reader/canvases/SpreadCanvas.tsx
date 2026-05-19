/**
 * SpreadCanvas — Two-page spread reading mode.
 * Landscape spread support, comic-first layout behavior.
 */
import type { ManifestationReaderState, ManifestationReaderConfig } from "../useManifestationReader";

interface Props {
  state: ManifestationReaderState;
  config: ManifestationReaderConfig;
}

export function SpreadCanvas({ state, config }: Props) {
  const leftPage = config.pages[state.pageIdx];
  const rightPage = state.spreadRight !== null ? config.pages[state.spreadRight] : null;

  if (!leftPage) return null;

  return (
    <div
      className={`flex items-center justify-center gap-1 h-full w-full
        ${state.transDir === "forward" ? "mr-page-forward" : state.transDir === "back" ? "mr-page-back" : ""}`}
      style={{ padding: "52px 60px" }}
    >
      {/* Left page */}
      {state.shouldLoadPage(state.pageIdx) && (
        <img
          src={leftPage.imageUrl}
          alt={`Page ${leftPage.pageNumber}`}
          className="max-h-full object-contain"
          style={{
            maxWidth: "540px",
            transform: `scale(${state.zoom})`,
            transformOrigin: "center right",
            transition: "transform 0.2s ease",
            willChange: "transform",
            boxShadow: "-4px 4px 40px rgba(0,0,0,0.5)",
            borderRadius: "2px 0 0 2px",
          }}
          draggable={false}
          loading="eager"
        />
      )}
      {/* Spine divider */}
      {rightPage && (
        <div className="w-[2px] h-[70%] self-center" style={{ background: "rgba(196,154,40,0.08)" }} />
      )}
      {/* Right page */}
      {rightPage && state.shouldLoadPage(state.spreadRight!) && (
        <img
          src={rightPage.imageUrl}
          alt={`Page ${rightPage.pageNumber}`}
          className="max-h-full object-contain"
          style={{
            maxWidth: "540px",
            transform: `scale(${state.zoom})`,
            transformOrigin: "center left",
            transition: "transform 0.2s ease",
            willChange: "transform",
            boxShadow: "4px 4px 40px rgba(0,0,0,0.5)",
            borderRadius: "0 2px 2px 0",
          }}
          draggable={false}
          loading="lazy"
        />
      )}
      {/* Preload adjacent */}
      <div className="hidden">
        {state.pageIdx + 2 < state.totalPages && (
          <img src={config.pages[state.pageIdx + 2]?.imageUrl} alt="" aria-hidden loading="lazy" />
        )}
      </div>
    </div>
  );
}
