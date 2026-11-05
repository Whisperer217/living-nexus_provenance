import { Link } from "wouter";
import { PlayerDevicePreview } from "./PlayerDevicePreview";
import { trpc } from "@/lib/trpc";
export function PlayerCollectionFeature() {
  const editions = trpc.playerCollections.editions.useQuery(undefined, {
    retry: false,
    staleTime: 30000,
  });
  const edition = editions.data?.[0];
  const list = trpc.playerCollections.list.useQuery(
    { editionId: edition?.id ?? 0 },
    { enabled: Boolean(edition), retry: false, staleTime: 30000 }
  );
  const selected = list.data?.filter(row => row.status === "selected") ?? [];
  return (
    <section className="player-feature player-cabinet-feature">
      <div>
        <p className="player-eyebrow">From the archive. Into your hands.</p>
        <h2 className="player-cabinet-title">Edition Cabinet</h2>
        <p>
          Creator-selected music and audiobooks, considered for a Living Nexus
          player. Follow the collection as it takes shape.
        </p>
        <p>
          {edition?.title ?? "The first collection starts here"} ·{" "}
          {selected.length} / {edition?.targetTracks ?? 50} selected
        </p>
        {editions.isError && (
          <p role="status">Collection details are temporarily unavailable.</p>
        )}
        <Link className="player-action" href="/player-collections">
          Explore this edition
        </Link>{" "}
        <Link
          className="player-action player-action-secondary"
          href="/player-collections#submit"
        >
          Submit your work
        </Link>
      </div>
      <PlayerDevicePreview
        count={selected.length}
        title={selected[0]?.title}
        artist={selected[0]?.artist || selected[0]?.name || undefined}
      />
      {selected.length > 0 && (
        <div
          className="player-feature-previews"
          aria-label="Selected work previews"
        >
          {selected.slice(0, 3).map(row => (
            <Link
              className="player-feature-preview"
              href={`/song/${row.songId}`}
              key={row.id}
            >
              {row.artwork ? (
                <img src={row.artwork} alt="" loading="lazy" />
              ) : (
                <span
                  className="player-feature-preview-placeholder"
                  aria-hidden="true"
                />
              )}
              <span>
                <strong>{row.title}</strong>
                <small>{row.artist || row.name || "Creator"}</small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
