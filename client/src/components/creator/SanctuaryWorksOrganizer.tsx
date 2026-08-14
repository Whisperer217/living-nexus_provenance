/**
 * SanctuaryWorksOrganizer — works + playlists for creator sanctuary.
 * Real DOM. Depth comes from the stage behind, not card chrome.
 */

import { Link } from "wouter";
import { Eye, ListMusic, Music, Pause, Play, Shield } from "lucide-react";

export type SanctuaryWork = {
  id: number;
  title: string;
  fileUrl?: string | null;
  coverArtUrl?: string | null;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  genre?: string | null;
  witnessId?: string | null;
};

export type SanctuaryPlaylist = {
  id: number;
  name: string;
  description?: string | null;
  coverArtUrl?: string | null;
  shareSlug?: string | null;
  playCount?: number;
};

type OrgMode = "all" | "sealed" | "unsealed";

interface WorksProps {
  works: SanctuaryWork[];
  mode: OrgMode;
  onModeChange: (m: OrgMode) => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
  onPlay: (work: SanctuaryWork, index: number) => void;
  isOwner: boolean;
  handle?: string | null;
}

export function SanctuaryWorksOrganizer({
  works,
  mode,
  onModeChange,
  currentTrackId,
  isPlaying,
  onPlay,
  isOwner,
  handle,
}: WorksProps) {
  const filtered = works.filter((w) => {
    if (mode === "sealed") return !!w.witnessId;
    if (mode === "unsealed") return !w.witnessId;
    return true;
  });

  const genres = Array.from(
    new Set(works.map((w) => (w.genre || "").trim()).filter(Boolean))
  ).slice(0, 8);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.22em] mb-2"
            style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}
          >
            {isOwner ? "Your registry" : "Registered music"}
          </p>
          <h2 className="text-3xl" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Works
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["sealed", "Sealed WID"],
              ["unsealed", "Unsealed"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onModeChange(id)}
              className="px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.12em]"
              style={{
                border:
                  mode === id
                    ? "1px solid color-mix(in srgb, var(--ln-gold) 55%, transparent)"
                    : "1px solid color-mix(in srgb, var(--ln-parchment) 14%, transparent)",
                color: mode === id ? "var(--ln-gold)" : "color-mix(in srgb, var(--ln-parchment) 60%, transparent)",
                background: mode === id ? "color-mix(in srgb, var(--ln-gold) 12%, transparent)" : "transparent",
              }}
            >
              {label}
            </button>
          ))}
          {handle && (
            <Link href={`/creator/${handle}/music`}>
              <span
                className="inline-flex px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.12em] cursor-pointer"
                style={{ color: "var(--ln-gold)" }}
              >
                Full archive →
              </span>
            </Link>
          )}
        </div>
      </div>

      {genres.length > 0 && (
        <p
          className="mb-6 text-[11px] uppercase tracking-[0.14em]"
          style={{ color: "color-mix(in srgb, var(--ln-parchment) 42%, transparent)" }}
        >
          {genres.join(" · ")}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="py-14 text-center">
          <Music className="mx-auto mb-4 opacity-40" style={{ color: "var(--ln-gold)" }} />
          <p style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)", fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>
            {mode === "all" ? "No registered works yet." : "Nothing in this filter."}
          </p>
          {isOwner && mode === "all" && (
            <Link href="/manifest">
              <span
                className="inline-block mt-6 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--ln-gold)", color: "#0A0806" }}
              >
                Register a work
              </span>
            </Link>
          )}
        </div>
      ) : (
        <ul className="mb-4">
          {filtered.map((song, index) => {
            const active = currentTrackId === String(song.id);
            const playing = !!(active && isPlaying);
            return (
              <li
                key={song.id}
                className="group flex items-center gap-4 py-4"
                style={{
                  borderBottom: "1px solid color-mix(in srgb, var(--ln-gold) 12%, transparent)",
                  animation: "ln-breath-reveal 0.55s cubic-bezier(0.22,1,0.36,1) both",
                  animationDelay: `${Math.min(index, 16) * 35}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={() => onPlay(song, index)}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden"
                  style={{
                    background: "#111",
                    boxShadow: playing
                      ? "0 0 0 1px color-mix(in srgb, var(--ln-gold) 55%, transparent), 0 0 24px color-mix(in srgb, var(--ln-gold) 22%, transparent)"
                      : undefined,
                  }}
                >
                  {song.coverArtUrl ? (
                    <img
                      src={song.coverArtUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{
                        objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={18} style={{ color: "var(--ln-gold)", opacity: 0.45 }} />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                    {playing ? (
                      <Pause size={18} fill="currentColor" style={{ color: "var(--ln-gold)" }} />
                    ) : (
                      <Play size={18} fill="currentColor" style={{ color: "var(--ln-gold)" }} />
                    )}
                  </span>
                </button>

                <div className="flex-1 min-w-0">
                  <Link href={`/song/${song.id}`}>
                    <span
                      className="block truncate text-lg hover:underline"
                      style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                    >
                      {song.title}
                    </span>
                  </Link>
                  <div
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs"
                    style={{ color: "color-mix(in srgb, var(--ln-parchment) 50%, transparent)" }}
                  >
                    {song.genre && <span>{song.genre}</span>}
                    {song.witnessId ? (
                      <Link href={`/verify/${song.witnessId}`}>
                        <span className="inline-flex items-center gap-1" style={{ color: "var(--ln-gold)" }}>
                          <Shield size={10} />
                          <span className="font-mono text-[10px] truncate max-w-[160px]">{song.witnessId}</span>
                        </span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Eye size={10} /> Unsealed
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface PlaylistsProps {
  playlists: SanctuaryPlaylist[];
  isOwner: boolean;
  handle?: string | null;
}

export function SanctuaryPlaylists({ playlists, isOwner, handle }: PlaylistsProps) {
  if (playlists.length === 0 && !isOwner) return null;

  return (
    <section className="mt-16 pt-10" style={{ borderTop: "1px solid color-mix(in srgb, var(--ln-gold) 14%, transparent)" }}>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.22em] mb-2"
            style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}
          >
            Curated paths
          </p>
          <h2 className="text-3xl" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Playlists
          </h2>
        </div>
        <div className="flex gap-3">
          {handle && (
            <Link href={`/creator/${handle}/playlists`}>
              <span className="text-sm cursor-pointer" style={{ color: "var(--ln-gold)" }}>
                All playlists →
              </span>
            </Link>
          )}
          {isOwner && (
            <Link href="/playlists">
              <span className="text-sm cursor-pointer" style={{ color: "color-mix(in srgb, var(--ln-parchment) 65%, transparent)" }}>
                Manage →
              </span>
            </Link>
          )}
        </div>
      </div>

      {playlists.length === 0 ? (
        <p style={{ color: "color-mix(in srgb, var(--ln-parchment) 50%, transparent)", fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
          {isOwner
            ? "Publish a playlist to offer witnesses a path through your work."
            : "No public playlists yet."}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((pl) => {
            const href = pl.shareSlug
              ? `/p/${pl.shareSlug}`
              : isOwner
                ? "/playlists"
                : handle
                  ? `/creator/${handle}/playlists`
                  : "#";
            return (
              <Link key={pl.id} href={href}>
                <article
                  className="group flex gap-4 p-3 rounded-xl transition-colors"
                  style={{
                    border: "1px solid color-mix(in srgb, var(--ln-gold) 16%, transparent)",
                    background: "color-mix(in srgb, var(--ln-obsidian, #060504) 88%, transparent)",
                  }}
                >
                  <div
                    className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg"
                    style={{ background: "#111" }}
                  >
                    {pl.coverArtUrl ? (
                      <img src={pl.coverArtUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic size={18} style={{ color: "var(--ln-gold)", opacity: 0.55 }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="truncate text-base group-hover:underline"
                      style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                    >
                      {pl.name}
                    </h3>
                    {pl.description && (
                      <p
                        className="text-sm mt-1 line-clamp-2"
                        style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)" }}
                      >
                        {pl.description}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
