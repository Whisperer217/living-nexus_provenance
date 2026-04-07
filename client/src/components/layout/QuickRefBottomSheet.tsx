/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — QuickRefBottomSheet
   Mobile-first swipe-up bottom sheet replacing the left-pane slider.
   - Triggered by a pill handle sitting above the bottom nav bar
   - Swipe-up or tap handle to open; swipe-down or tap backdrop to close
   - Tabs: "Now Playing" (when track active) | "Discover"
   - Anchored above the bottom nav (56px) + mini player (64px when active)
═══════════════════════════════════════════════════════════════════ */

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Play, X, ChevronUp, Music2, Pause, SkipBack, SkipForward } from "lucide-react";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { trpc } from "@/lib/trpc";

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
  /** Height of the bottom nav bar in px (default 56) */
  navBarHeight?: number;
  /** Whether a mini player is visible (adds 64px to bottom offset) */
  miniPlayerVisible?: boolean;
}

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function QuickRefBottomSheet({
  navBarHeight = 56,
  miniPlayerVisible = false,
}: Props) {
  const [, navigate] = useLocation();
  const { addAndPlay, state, togglePlay, seek, nextTrack, prevTrack } = usePlayer();
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Derive current track info from player state
  const activeTracks = state.tracks.filter(t => !!t.audioUrl);
  const currentTrack = state.currentIdx >= 0 ? activeTracks[state.currentIdx] : null;
  const hasTrack = !!currentTrack;
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  // Tab state — default to "nowplaying" when a track is active
  const [activeTab, setActiveTab] = useState<"nowplaying" | "discover">(hasTrack ? "nowplaying" : "discover");

  // Switch to now-playing tab when a new track starts
  useEffect(() => {
    if (hasTrack && open) setActiveTab("nowplaying");
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag-to-dismiss ───────────────────────────────────────────────
  const dragStartY = useRef<number | null>(null);
  const dragDelta = useRef(0);

  const onDragStart = useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragDelta.current = 0;
  }, []);

  const onDragMove = useCallback((clientY: number) => {
    if (dragStartY.current === null) return;
    dragDelta.current = clientY - dragStartY.current;
  }, []);

  const onDragEnd = useCallback(() => {
    if (dragDelta.current > 60) setOpen(false);
    dragStartY.current = null;
    dragDelta.current = 0;
  }, []);

  // ── Close on backdrop click ───────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e instanceof TouchEvent ? e.touches[0]?.target : (e as MouseEvent).target;
      if (sheetRef.current && target && !sheetRef.current.contains(target as Node)) {
        setOpen(false);
      }
    };
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handler as EventListener);
      document.addEventListener("touchstart", handler as EventListener, { passive: true });
    }, 100);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler as EventListener);
      document.removeEventListener("touchstart", handler as EventListener);
    };
  }, [open]);

  // ── Close on Escape ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Search + genre state ──────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | undefined>(undefined);

  const discoverInput = useMemo(() => ({
    genre: activeGenre,
    limit: 12,
    search: query.trim() || undefined,
  }), [activeGenre, query]);

  const { data: feedData, isLoading: feedLoading } = trpc.songs.discover.useQuery(
    discoverInput,
    { staleTime: 30_000, enabled: open && activeTab === "discover" }
  );
  const tracks = feedData ?? [];

  const handleTrackClick = (track: any) => {
    setOpen(false);
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
      setOpen(false);
      navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // Handle scrubber seek (click + touch drag)
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * state.duration);
  };

  const handleScrubberTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation(); // prevent sheet drag-to-dismiss from firing
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    seek(ratio * state.duration);
  };

  // Bottom offset: nav bar + mini player (if visible)
  const bottomOffset = navBarHeight + (miniPlayerVisible ? 64 : 0);

  return createPortal(
    <>
      {/* ── Pill handle tab — always visible on mobile ──────────────── */}
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && hasTrack) setActiveTab("nowplaying");
        }}
        aria-label={open ? "Close quick access" : "Open quick access"}
        className="md:hidden fixed left-1/2 -translate-x-1/2 z-[9992] flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all active:scale-95"
        style={{
          bottom: `${bottomOffset + 8}px`,
          background: "oklch(0.14 0.025 278 / 0.95)",
          border: "1px solid oklch(0.80 0.145 82 / 0.25)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 2px 16px oklch(0 0 0 / 0.4)",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {hasTrack && !open && (
          <Music2 size={11} style={{ color: "oklch(0.80 0.145 82)" }} />
        )}
        <ChevronUp
          size={12}
          className="transition-transform duration-300"
          style={{
            color: "oklch(0.80 0.145 82)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
        <span className="text-[10px] font-heading tracking-[0.15em] uppercase"
          style={{ color: "oklch(0.80 0.145 82)" }}>
          {hasTrack && !open ? "Now Playing" : "Quick Access"}
        </span>
      </button>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-[9989] bg-black/60"
          aria-hidden="true"
          style={{ backdropFilter: "blur(2px)" }}
        />
      )}

      {/* ── Sheet ────────────────────────────────────────────────────── */}
      <div
        ref={sheetRef}
        className="md:hidden fixed left-0 right-0 z-[9991] flex flex-col rounded-t-2xl overflow-hidden"
        style={{
          bottom: `${bottomOffset}px`,
          maxHeight: `calc(100dvh - ${bottomOffset}px - 16px)`,
          background: "oklch(0.10 0.018 278)",
          border: "1px solid oklch(0.80 0.145 82 / 0.15)",
          borderBottom: "none",
          boxShadow: "0 -8px 40px oklch(0 0 0 / 0.6)",
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onTouchStart={e => onDragStart(e.touches[0].clientY)}
        onTouchMove={e => onDragMove(e.touches[0].clientY)}
        onTouchEnd={onDragEnd}
      >
        {/* Drag handle pill */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: "oklch(0.30 0.02 280)" }} />
        </div>

        {/* Header + close */}
        <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
          {/* Tabs */}
          <div className="flex gap-1">
            {hasTrack && (
              <button
                onClick={() => setActiveTab("nowplaying")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-heading tracking-wide uppercase transition-all"
                style={activeTab === "nowplaying"
                  ? { background: "oklch(0.80 0.145 82 / 0.15)", color: "oklch(0.80 0.145 82)", border: "1px solid oklch(0.80 0.145 82 / 0.30)" }
                  : { background: "transparent", color: "oklch(0.45 0.02 280)", border: "1px solid transparent" }
                }
              >
                <Music2 size={10} />
                Now Playing
              </button>
            )}
            <button
              onClick={() => setActiveTab("discover")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-heading tracking-wide uppercase transition-all"
              style={activeTab === "discover"
                ? { background: "oklch(0.80 0.145 82 / 0.15)", color: "oklch(0.80 0.145 82)", border: "1px solid oklch(0.80 0.145 82 / 0.30)" }
                : { background: "transparent", color: "oklch(0.45 0.02 280)", border: "1px solid transparent" }
              }
            >
              Discover
            </button>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-md transition-colors"
            style={{ color: "oklch(0.55 0.03 280)", minWidth: "36px", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── NOW PLAYING TAB ──────────────────────────────────────────── */}
        {activeTab === "nowplaying" && currentTrack && (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-2" style={{ overscrollBehavior: "contain" }}>
            {/* Cover art */}
            <div className="flex justify-center mb-4">
              {currentTrack.artUrl ? (
                <img
                  src={currentTrack.artUrl}
                  alt={currentTrack.title}
                  className="w-40 h-40 rounded-2xl object-cover shadow-2xl"
                  style={{
                    objectPosition: `${currentTrack.coverPositionX ?? 50}% ${currentTrack.coverPositionY ?? 50}%`,
                    boxShadow: "0 8px 40px oklch(0 0 0 / 0.7)",
                  }}
                />
              ) : (
                <div className="w-40 h-40 rounded-2xl flex items-center justify-center text-5xl shadow-2xl"
                  style={{ background: "oklch(0.195 0.038 48)" }}>
                  🎵
                </div>
              )}
            </div>

            {/* Title + artist */}
            <div className="text-center mb-4">
              <p className="text-[14px] font-heading font-semibold leading-snug"
                style={{ color: "oklch(0.92 0.01 280)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {currentTrack.title}
              </p>
              <p className="text-[13px] mt-0.5 truncate" style={{ color: "oklch(0.60 0.03 280)" }}>
                {currentTrack.artist}
              </p>
            </div>

            {/* Scrubber */}
            <div className="mb-3">
              <div
                className="relative h-1.5 rounded-full cursor-pointer mb-1.5"
                style={{ background: "oklch(0.20 0.02 280)", touchAction: "none" }}
                onClick={handleScrubberClick}
                onTouchMove={handleScrubberTouchMove}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${progress}%`, background: "oklch(0.80 0.145 82)" }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow"
                  style={{
                    left: `calc(${progress}% - 6px)`,
                    background: "oklch(0.80 0.145 82)",
                    boxShadow: "0 0 6px oklch(0.80 0.145 82 / 0.6)",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px]" style={{ color: "oklch(0.45 0.02 280)" }}>
                <span>{formatTime(state.currentTime)}</span>
                <span>{formatTime(state.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => prevTrack()}
                className="p-3 rounded-full transition-all active:scale-90"
                style={{ color: "oklch(0.65 0.03 280)" }}
                aria-label="Previous"
              >
                <SkipBack size={22} />
              </button>
              <button
                onClick={() => togglePlay()}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                style={{
                  background: "oklch(0.80 0.145 82)",
                  boxShadow: "0 4px 20px oklch(0.80 0.145 82 / 0.4)",
                }}
                aria-label={state.isPlaying ? "Pause" : "Play"}
              >
                {state.isPlaying
                  ? <Pause size={24} fill="oklch(0.10 0.018 278)" style={{ color: "oklch(0.10 0.018 278)" }} />
                  : <Play size={24} fill="oklch(0.10 0.018 278)" style={{ color: "oklch(0.10 0.018 278)" }} />
                }
              </button>
              <button
                onClick={() => nextTrack()}
                className="p-3 rounded-full transition-all active:scale-90"
                style={{ color: "oklch(0.65 0.03 280)" }}
                aria-label="Next"
              >
                <SkipForward size={22} />
              </button>
            </div>

            {/* View full player link */}
            <button
              onClick={() => { setOpen(false); navigate(`/song/${currentTrack.id}`); }}
              className="w-full mt-5 py-2.5 rounded-xl text-[12px] font-body text-center transition-colors"
              style={{ background: "oklch(0.14 0.02 278)", color: "oklch(0.55 0.03 280)", border: "1px solid oklch(0.20 0.02 278)" }}
            >
              View full song page →
            </button>
          </div>
        )}

        {/* ── DISCOVER TAB ─────────────────────────────────────────────── */}
        {activeTab === "discover" && (
          <>
            {/* Search */}
            <div className="px-4 pb-3 flex-shrink-0">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "oklch(0.50 0.03 280)" }} />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search tracks, artists…"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-[13px] font-body outline-none transition-all"
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

            {/* Genre chips */}
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {GENRE_FILTERS.map(g => {
                  const isActive = activeGenre === g.value;
                  return (
                    <button
                      key={g.label}
                      onClick={() => setActiveGenre(g.value)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-body transition-all"
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

            {/* Track list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 border-t border-white/[0.06] pt-3"
              style={{ overscrollBehavior: "contain" }}>
              <p className="text-[9px] font-heading tracking-[0.15em] uppercase mb-3"
                style={{ color: "oklch(0.45 0.02 280)" }}>
                {query.trim() ? "Results" : "Recently Added"}
              </p>

              {feedLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "oklch(0.16 0.02 280)" }} />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 rounded" style={{ background: "oklch(0.16 0.02 280)", width: "70%" }} />
                        <div className="h-2 rounded" style={{ background: "oklch(0.14 0.02 280)", width: "45%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : tracks.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-[12px] text-center" style={{ color: "oklch(0.40 0.02 280)" }}>
                    {query.trim() ? "No results found" : "No tracks yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {tracks.slice(0, 10).map((track: any) => (
                    <button
                      key={track.id ?? track.song?.id}
                      onClick={() => handleTrackClick(track)}
                      className="w-full flex items-center gap-3 rounded-xl p-2 transition-colors text-left active:bg-white/[0.06]"
                      style={{ background: "transparent" }}
                    >
                      {(track.coverArtUrl ?? track.song?.coverArtUrl) ? (
                        <img
                          src={track.coverArtUrl ?? track.song?.coverArtUrl}
                          alt={track.title ?? track.song?.title}
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                          style={{ objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%` }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-base"
                          style={{ background: "oklch(0.195 0.038 48)" }}>
                          🎵
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate"
                          style={{ color: "oklch(0.88 0.01 280)" }}>
                          {track.title ?? track.song?.title}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "oklch(0.55 0.02 280)" }}>
                          {track.artistName ?? track.creator?.name ?? track.creator?.artistHandle ?? "Unknown"}
                        </p>
                      </div>
                      <Play size={12} className="flex-shrink-0" style={{ color: "oklch(0.80 0.145 82 / 0.5)" }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Footer */}
              <button
                onClick={() => { setOpen(false); navigate("/explore"); }}
                className="w-full mt-4 py-3 rounded-xl text-[12px] font-body text-center transition-colors"
                style={{ background: "oklch(0.14 0.02 278)", color: "oklch(0.55 0.03 280)", border: "1px solid oklch(0.20 0.02 278)" }}
              >
                Open full Explore →
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
