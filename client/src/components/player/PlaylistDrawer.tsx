/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlaylistDrawer
   Right-side slide-in drawer for quick playlist access.
   Triggered by a small tab on the right edge of the screen.
   z-index: 9000 — sits above page content but BELOW the expanded
   player (z-9995) and cinematic layer (z-9999).
═══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight, ChevronLeft, ListMusic, TrendingUp, Sparkles,
  Heart, Plus, Play, Music, Loader2, Lock, X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// ── Types ──────────────────────────────────────────────────────────
type PlaylistTab = "new" | "trending" | "liked" | "build";

interface TrackRow {
  id: number;
  title: string;
  artist: string;
  artUrl?: string | null;
  audioUrl?: string;
  genre?: string | null;
  witnessId?: string | null;
  creatorId?: number | null;
  creatorRole?: string | null;
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  emoji?: string | null;
  bg?: string | null;
  autoVideoUrl?: string | null;
  visualReady?: boolean;
}

function flattenSong(s: any): TrackRow {
  const song = s.song ?? s;
  const creator = s.creator ?? {};
  return {
    id: song.id,
    title: song.title ?? "Untitled",
    artist: creator.name ?? creator.artistHandle ?? song.artistName ?? "Unknown",
    artUrl: song.coverArtUrl ?? null,
    audioUrl: song.fileUrl ?? song.audioUrl ?? "",
    genre: song.genre ?? null,
    witnessId: song.witnessId ?? null,
    creatorId: creator.id ?? null,
    creatorRole: creator.role ?? null,
    coverPositionX: song.coverPositionX ?? null,
    coverPositionY: song.coverPositionY ?? null,
    emoji: song.emoji ?? null,
    bg: song.bg ?? null,
    autoVideoUrl: song.autoVideoUrl ?? null,
    visualReady: song.visualReady ?? true,
  };
}

// ── Mini Track Row ─────────────────────────────────────────────────
function MiniTrackRow({
  track,
  isActive,
  onPlay,
}: {
  track: TrackRow;
  isActive: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      className="w-full flex items-center gap-3 px-4 py-2.5 transition-all active:scale-[0.98] text-left group"
      style={{
        background: isActive ? "rgba(196,154,40,0.05)" : "transparent",
        borderLeft: isActive ? "2px solid #C49A28" : "2px solid transparent",
      }}
    >
      {/* Artwork */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden relative"
        style={{ background: "var(--ln-coal)" }}
      >
        {track.artUrl ? (
          <img src={track.artUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={14} style={{ color: "var(--ln-smoke)" }} />
          </div>
        )}
        {isActive && (
          <div
            className="absolute inset-0 flex items-end justify-center pb-1 gap-[2px]"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  height: "6px",
                  background: "var(--ln-gold)",
                  animation: `drawerWave ${0.4 + i * 0.12}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className="text-[12px] font-heading truncate leading-tight"
          style={{ color: isActive ? "var(--ln-gold)" : "var(--ln-parchment)" }}
        >
          {track.title}
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: "var(--ln-smoke)" }}>
          {track.artist}
        </div>
      </div>
      {/* Play icon on hover */}
      <div
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--ln-gold)" }}
      >
        <Play size={12} fill="currentColor" />
      </div>
    </button>
  );
}

// ── Build Your Own placeholder ─────────────────────────────────────
function BuildYourOwn({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)" }}
      >
        <Plus size={24} style={{ color: "var(--ln-gold)" }} />
      </div>
      <div>
        <div className="text-[14px] font-heading mb-1" style={{ color: "var(--ln-parchment)" }}>
          Custom Playlists
        </div>
        <div className="text-[11px] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
          Build and save your own playlists. Curate tracks from any creator on the platform.
        </div>
      </div>
      <button
        onClick={() => { onClose(); navigate("/explore"); }}
        className="px-4 py-2 rounded-xl text-[11px] font-heading tracking-wide transition-all active:scale-95"
        style={{
          background: "rgba(196,154,40,0.08)",
          border: "1px solid rgba(196,154,40,0.3)",
          color: "var(--ln-gold)",
        }}
      >
        Browse Tracks
      </button>
      <div
        className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-full"
        style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)" }}
      >
        <Sparkles size={10} />
        Full playlist builder coming soon
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function PlaylistDrawer() {
   const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PlaylistTab>("new");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { addAndPlay, playQueueAt, state } = usePlayer();
  const { user } = useAuth();
  // LAYER AUTHORITY RULE: Close drawer on route change — prevents stacking with new pages
  const [location] = useLocation();
  useEffect(() => { setIsOpen(false); }, [location]);

  // LAYER AUTHORITY RULE: Close drawer when any modal/dialog opens — one primary surface at a time
  useEffect(() => {
    const checkAndClose = () => {
      const locked =
        document.body.hasAttribute("data-scroll-locked") ||
        document.body.style.overflow === "hidden" ||
        document.body.style.overflowY === "hidden";
      if (locked) setIsOpen(false);
    };
    const observer = new MutationObserver(checkAndClose);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"] });
    return () => observer.disconnect();
  }, []);

  // Detect when any Radix dialog/modal is open — hide tab trigger to prevent accidental activation
  useEffect(() => {
    const checkDialogOpen = () => {
      // Radix Dialog sets data-scroll-locked on <body> when open
      // Custom modals (EditTrackPanel etc.) set body overflow:hidden directly
      const locked =
        document.body.hasAttribute("data-scroll-locked") ||
        document.body.style.overflow === "hidden" ||
        document.body.style.overflowY === "hidden";
      setDialogOpen(locked);
    };
    // Run immediately on mount to catch already-open dialogs
    checkDialogOpen();
    // Watch for attribute/style changes
    const observer = new MutationObserver(checkDialogOpen);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"] });
    // Poll as a safety net (100ms interval) — catches edge cases where MutationObserver fires late
    const interval = setInterval(checkDialogOpen, 100);
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
  // Swipe-to-close gesture
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 60) setIsOpen(false);
    touchStartX.current = null;
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Data queries ────────────────────────────────────────────────
  const { data: newData, isLoading: newLoading } = trpc.songs.newThisWeek.useQuery(
    { limit: 20 },
    { enabled: isOpen && activeTab === "new", staleTime: 60_000 }
  );
  const { data: trendingData, isLoading: trendingLoading } = trpc.songs.trending.useQuery(
    { limit: 20 },
    { enabled: isOpen && activeTab === "trending", staleTime: 60_000 }
  );
  const { data: likedData, isLoading: likedLoading } = trpc.songs.getLiked.useQuery(undefined, {
    enabled: isOpen && activeTab === "liked" && !!user,
    staleTime: 60_000,
  });

  const newTracks: TrackRow[] = (newData ?? []).map(flattenSong);
  const trendingTracks: TrackRow[] = (trendingData ?? []).map(flattenSong);
  const likedTracks: TrackRow[] = (likedData ?? []).map(flattenSong);

  const currentTracks = useCallback(() => {
    if (activeTab === "new") return newTracks;
    if (activeTab === "trending") return trendingTracks;
    if (activeTab === "liked") return likedTracks;
    return [];
  }, [activeTab, newTracks, trendingTracks, likedTracks]);

  const isLoading =
    (activeTab === "new" && newLoading) ||
    (activeTab === "trending" && trendingLoading) ||
    (activeTab === "liked" && likedLoading);

  const toPlayerTrack = (t: TrackRow) => ({
    id: String(t.id),
    title: t.title,
    artist: t.artist,
    artUrl: t.artUrl ?? undefined,
    audioUrl: t.audioUrl ?? "",
    genre: t.genre ?? "",
    witnessId: t.witnessId ?? undefined,
    creatorId: t.creatorId ?? undefined,
    creatorRole: t.creatorRole ?? undefined,
    coverPositionX: t.coverPositionX ?? undefined,
    coverPositionY: t.coverPositionY ?? undefined,
    emoji: t.emoji ?? undefined,
    bg: t.bg ?? undefined,
    autoVideoUrl: t.autoVideoUrl ?? undefined,
    visualReady: t.visualReady,
  });

  const handlePlay = useCallback(
    (track: TrackRow, allTracks: TrackRow[]) => {
      const playerTracks = allTracks.map(toPlayerTrack);
      const startIdx = allTracks.findIndex((t) => t.id === track.id);
      playQueueAt(playerTracks, startIdx >= 0 ? startIdx : 0, "NONE");
    },
    [playQueueAt]
  );

  const tracks = currentTracks();
  const stateTracks = state.tracks ?? [];
  const currentId = stateTracks[state.currentIdx]?.id;

  const TABS: { id: PlaylistTab; label: string; icon: React.ElementType }[] = [
    { id: "new", label: "New", icon: Sparkles },
    { id: "trending", label: "Trending", icon: TrendingUp },
    { id: "liked", label: "Liked", icon: Heart },
    { id: "build", label: "Build", icon: Plus },
  ];

  const drawerContent = (
    <>
      <style>{`
        @keyframes drawerWave {
          from { height: 3px; }
          to   { height: 9px; }
        }
      `}</style>

      {/* Backdrop — only on mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-[30]"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Tab trigger — right edge, desktop only.
           Hidden on mobile (md:hidden) because the fixed handle overlaps page
           content at the right edge and intercepts taps on buttons like the
           Provenance Prompt Generator, triggering the drawer instead of the
           intended action. On mobile the drawer is opened via the sidebar. */}
      {/* Slides fully off-screen when any dialog/modal is open to prevent accidental activation */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="md:flex hidden fixed z-[32] items-center justify-center active:scale-95"
        style={{
          // When drawer open: peeking left of the drawer panel
          // When drawer closed + no dialog: peek 4px into screen (visible handle)
          // When drawer closed + dialog open: fully off-screen (right: -28px)
          right: isOpen ? "280px" : (dialogOpen ? "-28px" : "0px"),
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 140px)",
          width: "22px",
          height: "64px",
          borderRadius: "8px 0 0 8px",
          background: isOpen
            ? "rgba(196,154,40,0.25)"
            : "rgba(20,18,12,0.97)",
          border: isOpen
            ? "1px solid rgba(196,154,40,0.5)"
            : "1px solid rgba(196,154,40,0.4)",
          borderRight: "none",
          backdropFilter: "blur(12px)",
          boxShadow: "-3px 0 16px rgba(196,154,40,0.15)",
          transition: "right 0.35s cubic-bezier(0.32, 0.72, 0, 1), background 0.2s",
          color: "var(--ln-gold)",
          // When any dialog/modal is open: always disable pointer events on the handle
          // This prevents the handle from intercepting taps on dialogs (e.g. Prompt Studio)
          pointerEvents: dialogOpen ? "none" : "auto",
        }}
        title={isOpen ? "Close playlist drawer" : "Open playlist drawer"}
        aria-label={isOpen ? "Close playlist drawer" : "Open playlist drawer"}
      >
        {isOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full z-[31] flex flex-col${isOpen ? "" : " pointer-events-none"}`}
        style={{
          width: "280px",
          background: "rgba(44,52,56,0.97)",
          borderLeft: "1px solid rgba(196,154,40,0.08)",
          backdropFilter: "blur(20px)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.60)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          overscrollBehavior: "contain", // prevent panel from escaping its bounds on mobile momentum scroll
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid rgba(196,154,40,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <ListMusic size={14} style={{ color: "var(--ln-gold)" }} />
            <span className="text-[12px] font-heading tracking-widest uppercase" style={{ color: "var(--ln-gold)" }}>
              Quick Play
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:bg-white/5 active:scale-90"
            style={{ color: "var(--ln-smoke)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tab bar */}
        <div
          className="flex-shrink-0 flex items-center gap-1 px-3 py-2"
          style={{ borderBottom: "1px solid rgba(196,154,40,0.04)" }}
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all text-[10px] font-heading tracking-wide"
                style={{
                  background: isActive ? "rgba(196,154,40,0.10)" : "rgba(44,52,56,0.60)",
                  color: isActive ? "var(--ln-parchment)" : "var(--ln-smoke)",
                  border: isActive ? "1px solid rgba(196,154,40,0.35)" : "1px solid rgba(196,154,40,0.08)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.06em",
                  fontSize: "9px",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)" }}>
          {activeTab === "build" ? (
            <BuildYourOwn onClose={() => setIsOpen(false)} />
          ) : activeTab === "liked" && !user ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
              <Lock size={20} style={{ color: "var(--ln-iron)" }} />
              <div className="text-[12px]" style={{ color: "var(--ln-smoke)" }}>
                Sign in to see your liked tracks
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={18} className="animate-spin" style={{ color: "rgba(196,154,40,0.4)" }} />
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Music size={18} style={{ color: "var(--ln-coal)" }} />
              <div className="text-[11px]" style={{ color: "var(--ln-coal)" }}>
                {activeTab === "liked" ? "No liked tracks yet" : "No tracks found"}
              </div>
            </div>
          ) : (
            <div className="py-2">
              {/* Play all button */}
              <button
                onClick={() => tracks.length > 0 && handlePlay(tracks[0], tracks)}
                className="w-full flex items-center gap-2 px-4 py-2 mb-1 transition-all hover:bg-white/5 active:scale-[0.98]"
                style={{ color: "var(--ln-gold)" }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)" }}
                >
                  <Play size={11} fill="currentColor" />
                </div>
                <span className="text-[11px] font-heading tracking-wide">Play All ({tracks.length})</span>
              </button>
              <div className="h-px mx-4 mb-1" style={{ background: "rgba(196,154,40,0.04)" }} />
              {tracks.map((track) => (
                <MiniTrackRow
                  key={track.id}
                  track={track}
                  isActive={currentId === String(track.id)}
                  onPlay={() => handlePlay(track, tracks)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
