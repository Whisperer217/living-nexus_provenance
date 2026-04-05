/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — QuickAccessPanel
   - Collapsed by default (edge handle only)
   - Overlay mode (no layout shift)
   - Close on outside click
   - Content: global search → quick genre filters → recently played
   - Filters call the same DiscoveryFeed system as HomePage (no duplication)
═══════════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useState, useMemo } from "react";
import { ChevronRight, Search, Play, X } from "lucide-react";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";

// ── Genre filter chips (same set as HomePage) ─────────────────────
const GENRE_FILTERS = [
  { label: "All",        value: undefined },
  { label: "Ambient",    value: "Ambient" },
  { label: "Gospel",     value: "Gospel" },
  { label: "Electronic", value: "Electronic" },
  { label: "Hip-Hop",    value: "Hip-Hop" },
  { label: "Jazz",       value: "Jazz" },
  { label: "R&B",        value: "R&B" },
];

interface Props {
  /** Whether the panel is open */
  open: boolean;
  /** Toggle open/close */
  onToggle: () => void;
  /** Unused legacy props kept for backward compat — ignored */
  summary?: unknown;
  currentPath?: string;
}

export default function QuickAccessPanel({ open, onToggle }: Props) {
  const [, navigate] = useLocation();
  const { addAndPlay } = usePlayer();
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Search state ──────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | undefined>(undefined);

  // ── Discovery feed — same procedure as HomePage ───────────────────
  const discoverInput = useMemo(() => ({
    genre: activeGenre,
    limit: 12,
    search: query.trim() || undefined,
  }), [activeGenre, query]);

  const { data: feedData, isLoading: feedLoading } = trpc.songs.discover.useQuery(
    discoverInput,
    { staleTime: 30_000, enabled: open }
  );

  const tracks = feedData ?? [];

  // ── Close on outside click ────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    // Small delay so the toggle click itself doesn't immediately close
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, onToggle]);

  // ── Close on Escape ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onToggle(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onToggle]);

  const handleTrackClick = (track: any) => {
    onToggle();
    addAndPlay({
      id: String(track.id ?? track.song?.id),
      title: track.title ?? track.song?.title,
      artist: track.artistName ?? track.creator?.name ?? track.creator?.artistHandle ?? "Unknown",
      artUrl: track.coverArtUrl ?? track.song?.coverArtUrl ?? undefined,
      artType: "image",
      audioUrl: track.fileUrl ?? track.song?.fileUrl ?? undefined,
      witnessId: track.witnessId ?? track.song?.witnessId ?? undefined,
      genre: track.genre ?? "",
      bg: "oklch(0.195 0.038 48)",
      emoji: "🎵",
      coverPositionX: track.coverPositionX ?? track.song?.coverPositionX ?? 50,
      coverPositionY: track.coverPositionY ?? track.song?.coverPositionY ?? 50,
      visualReady: track.visualReady ?? track.song?.visualReady ?? false,
      autoVideoUrl: track.autoVideoUrl ?? track.song?.autoVideoUrl ?? undefined,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onToggle();
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <>
      {/* ── Edge handle tab — always visible ─────────────────────── */}
      <button
        onClick={onToggle}
        aria-label={open ? "Close quick access panel" : "Open quick access panel"}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center
          w-5 h-16 rounded-r-lg transition-all duration-300
          border border-l-0 qr-tab-glow`}
        style={{
          background: "oklch(0.148 0.025 52)",
          borderColor: "oklch(0.80 0.145 82 / 0.4)",
          transform: `translateY(-50%) translateX(${open ? "240px" : "0px"})`,
        }}
      >
        <ChevronRight
          size={12}
          className="transition-transform duration-300"
          style={{
            color: "oklch(0.80 0.145 82)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* ── Backdrop overlay ─────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px]"
          aria-hidden="true"
        />
      )}

      {/* ── Panel ────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className="fixed left-0 top-0 bottom-0 z-40 flex flex-col w-[240px]
          border-r border-white/[0.08]
          transition-transform duration-300 ease-in-out"
        style={{
          background: "oklch(0.10 0.018 278)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          boxShadow: open ? "4px 0 32px oklch(0 0 0 / 0.6)" : "none",
        }}
        aria-hidden={!open}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/[0.06]">
          <span className="text-[11px] font-heading tracking-[0.18em] uppercase"
            style={{ color: "oklch(0.80 0.145 82)" }}>
            Quick Access
          </span>
          <button
            onClick={onToggle}
            className="p-1 rounded-md transition-colors hover:bg-white/[0.06]"
            style={{ color: "oklch(0.55 0.03 280)" }}
            aria-label="Close panel"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Search ─────────────────────────────────────────────── */}
        <div className="px-3 pt-4 pb-3">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "oklch(0.50 0.03 280)" }}
              />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tracks, artists…"
                className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] font-body outline-none transition-all"
                style={{
                  background: "oklch(0.14 0.02 278)",
                  border: "1px solid oklch(0.22 0.03 278)",
                  color: "oklch(0.88 0.01 280)",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "oklch(0.80 0.145 82 / 0.5)")}
                onBlur={e => (e.currentTarget.style.borderColor = "oklch(0.22 0.03 278)")}
              />
            </div>
          </form>
        </div>

        {/* ── Genre filter chips ──────────────────────────────────── */}
        <div className="px-3 pb-3">
          <p className="text-[9px] font-heading tracking-[0.15em] uppercase mb-2"
            style={{ color: "oklch(0.45 0.02 280)" }}>
            Filter
          </p>
          <div className="flex flex-wrap gap-1.5">
            {GENRE_FILTERS.map(g => {
              const isActive = activeGenre === g.value;
              return (
                <button
                  key={g.label}
                  onClick={() => setActiveGenre(g.value)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-body transition-all"
                  style={isActive
                    ? { background: "oklch(0.80 0.145 82 / 0.18)", color: "oklch(0.80 0.145 82)", border: "1px solid oklch(0.80 0.145 82 / 0.35)" }
                    : { background: "oklch(0.14 0.02 278)", color: "oklch(0.50 0.03 280)", border: "1px solid oklch(0.20 0.02 278)" }
                  }
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Track results / recently played ────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col px-3 pb-3 border-t border-white/[0.06] pt-3 overflow-hidden">
          <p className="text-[9px] font-heading tracking-[0.15em] uppercase mb-2 flex-shrink-0"
            style={{ color: "oklch(0.45 0.02 280)" }}>
            {query.trim() ? "Results" : "Recently Added"}
          </p>

          {feedLoading ? (
            <div className="space-y-2 flex-1">
              {[0, 1, 2, 4].map(i => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="w-8 h-8 rounded flex-shrink-0" style={{ background: "oklch(0.16 0.02 280)" }} />
                  <div className="flex-1 space-y-1">
                    <div className="h-2 rounded" style={{ background: "oklch(0.16 0.02 280)", width: "70%" }} />
                    <div className="h-2 rounded" style={{ background: "oklch(0.14 0.02 280)", width: "45%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[11px] text-center" style={{ color: "oklch(0.40 0.02 280)" }}>
                {query.trim() ? "No results found" : "No tracks yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
              {tracks.slice(0, 10).map((track: any) => (
                <button
                  key={track.id ?? track.song?.id}
                  onClick={() => handleTrackClick(track)}
                  className="w-full flex items-center gap-2 rounded-lg p-1.5 transition-colors group text-left"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "oklch(0.96 0.008 270 / 0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {(track.coverArtUrl ?? track.song?.coverArtUrl) ? (
                    <img
                      src={track.coverArtUrl ?? track.song?.coverArtUrl}
                      alt={track.title ?? track.song?.title}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                      style={{ objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%` }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-sm"
                      style={{ background: "oklch(0.195 0.038 48)" }}>
                      🎵
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate transition-colors group-hover:text-[oklch(0.80_0.145_82)]"
                      style={{ color: "oklch(0.88 0.01 280)" }}>
                      {track.title ?? track.song?.title}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "oklch(0.55 0.02 280)" }}>
                      {track.artistName ?? track.creator?.name ?? track.creator?.artistHandle ?? "Unknown"}
                    </p>
                  </div>
                  <Play size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "oklch(0.80 0.145 82)" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer hint ─────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t border-white/[0.05]">
          <button
            onClick={() => { onToggle(); navigate("/explore"); }}
            className="w-full text-[10px] font-body text-center transition-colors"
            style={{ color: "oklch(0.40 0.02 280)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.80 0.145 82)")}
            onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.40 0.02 280)")}
          >
            Open full Explore →
          </button>
        </div>
      </div>
    </>
  );
}
