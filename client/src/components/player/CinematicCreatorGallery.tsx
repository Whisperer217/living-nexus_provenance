import { ExternalLink, Heart, LoaderCircle, Play, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import type { FeedRow } from "@shared/coreDataTypes";

export type CinematicCreatorIdentity = {
  id: number | null;
  name: string;
  handle: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
};

type CinematicCreatorGalleryProps = {
  creator: CinematicCreatorIdentity;
  items: FeedRow[];
  selectedWorkId: number | null;
  activeWorkId: string | null;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  onSelectWork: (workId: number) => void;
  onPlayWork: (workId: number) => void;
  onOpenWork: (workId: number) => void;
  onOpenCreator: () => void;
  onSupportCreator: () => void;
  onLoadMore: () => void;
};

/**
 * The gallery is intentionally presentation-only. Selecting a card changes
 * cinematic focus through `onSelectWork`; it never receives playback state or
 * PlayerContext controls. The one explicit Play action is injected by the host.
 */
export function CinematicCreatorGallery({
  creator,
  items,
  selectedWorkId,
  activeWorkId,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  expanded,
  onExpandedChange,
  onSelectWork,
  onPlayWork,
  onOpenWork,
  onOpenCreator,
  onSupportCreator,
  onLoadMore,
}: CinematicCreatorGalleryProps) {
  const creatorLabel = creator.handle ? `@${creator.handle}` : "Creator";
  const panelId = "ln-cinematic-creator-details";

  return (
    <section className="ln-cinematic-creator-gallery" aria-label="Creator works">
      <div className="ln-cinematic-creator-panel">
        <div className="ln-cinematic-creator-panel__identity">
          {creator.profilePhotoUrl ? (
            <img
              src={creator.profilePhotoUrl}
              alt=""
              className="ln-cinematic-creator-panel__avatar"
              loading="lazy"
            />
          ) : (
            <div className="ln-cinematic-creator-panel__avatar ln-cinematic-creator-panel__avatar--fallback" aria-hidden="true">
              {creator.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="ln-cinematic-creator-panel__eyebrow">Creator Domain</p>
            <p className="ln-cinematic-creator-panel__name">{creator.name}</p>
            <p className="ln-cinematic-creator-panel__handle">{creatorLabel}</p>
          </div>
        </div>
        <button
          type="button"
          className="ln-cinematic-creator-panel__toggle"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onExpandedChange(!expanded)}
        >
          <span>{expanded ? "Close" : "About"}</span>
          {expanded ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>
      </div>

      {expanded && (
        <div id={panelId} className="ln-cinematic-creator-panel__details">
          <p>
            {creator.bio || "This Creator’s Domain preserves the Works, identity, and testimony they have chosen to share."}
          </p>
          <div className="ln-cinematic-creator-panel__actions">
            <button type="button" onClick={onOpenCreator}>
              <ExternalLink size={14} aria-hidden="true" />
              Visit Creator Domain
            </button>
            <button type="button" onClick={onSupportCreator}>
              <Heart size={14} aria-hidden="true" />
              Support Creator
            </button>
          </div>
        </div>
      )}

      <div className="ln-cinematic-creator-gallery__heading">
        <div>
          <p className="ln-cinematic-creator-gallery__eyebrow">Creator Works</p>
          <h2>Browse without interrupting playback</h2>
        </div>
        <span className="ln-cinematic-creator-gallery__count" aria-live="polite">
          {items.length ? `${items.length} loaded` : "Catalog"}
        </span>
      </div>

      {isLoading ? (
        <div className="ln-cinematic-creator-gallery__loading" role="status">
          <LoaderCircle size={18} aria-hidden="true" />
          Gathering public Works…
        </div>
      ) : items.length ? (
        <div className="museum-pan-row ln-cinematic-creator-gallery__row" aria-label={`${creator.name} public audio Works`}>
          {items.map((row) => {
            const isSelected = row.song.id === selectedWorkId;
            const isListening = String(row.song.id) === activeWorkId;
            const isPlayable = Boolean(row.song.fileUrl);
            const title = row.song.title || "Untitled Work";

            return (
              <article
                key={row.song.id}
                className={`museum-card ln-cinematic-work-card${isSelected ? " museum-card--active" : ""}`}
                data-selected={isSelected ? "true" : "false"}
              >
                <button
                  type="button"
                  className="ln-cinematic-work-card__select"
                  aria-pressed={isSelected}
                  aria-label={`Feature ${title} in the cinematic view`}
                  onClick={() => onSelectWork(row.song.id)}
                >
                  <div className="ln-cinematic-work-card__art">
                    {row.song.coverArtUrl ? (
                      <img src={row.song.coverArtUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="ln-cinematic-work-card__fallback" aria-hidden="true"><Sparkles size={22} /></div>
                    )}
                    {isListening && <span className="ln-cinematic-work-card__listening">Listening now</span>}
                    {isSelected && <span className="ln-cinematic-work-card__featured">Featured</span>}
                  </div>
                  <div className="museum-card-info ln-cinematic-work-card__copy">
                    <p className="ln-cinematic-work-card__title">{title}</p>
                    <p className="ln-cinematic-work-card__meta">{row.song.witnessId || row.song.genre || "Living Nexus Work"}</p>
                  </div>
                </button>
                <div className="ln-cinematic-work-card__actions">
                  <button
                    type="button"
                    onClick={() => onOpenWork(row.song.id)}
                    aria-label={`Open ${title}`}
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    View
                  </button>
                  <button
                    type="button"
                    disabled={!isPlayable}
                    onClick={() => onPlayWork(row.song.id)}
                    aria-label={isPlayable ? `Play ${title}` : `${title} has no playable audio file`}
                  >
                    <Play size={14} fill="currentColor" aria-hidden="true" />
                    {isPlayable ? "Play" : "Record only"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="ln-cinematic-creator-gallery__empty">No other public audio Works are available in this Creator’s catalog yet.</p>
      )}

      {hasNextPage && (
        <button
          type="button"
          className="ln-cinematic-creator-gallery__more"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
          {isFetchingNextPage ? "Gathering more Works" : "Load more Works"}
        </button>
      )}
    </section>
  );
}
