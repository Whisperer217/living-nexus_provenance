/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlaylistDrawer
   Right-side slide-in panel. Desktop + mobile.

   ARCHITECTURE: Matches LiveActivityPanel exactly.
   - Self-contained isOpen state
   - Each tab (New / Trending / Liked / Build) is its own individual
     protruding handle on the left edge of the panel, stacked top-to-bottom
   - All tab handles slide in sync with the panel
     (right: isOpen ? PANEL_WIDTH : 0)
   - Clicking a tab: opens drawer + switches to that tab
   - Clicking the active tab again: collapses the drawer
   - createPortal to document.body
   - Inline styles using var(--ln-panel) / var(--ln-gold) tokens
   - Closes on route change and outside click
   - Swipe-to-close on mobile (swipe right)
═══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Music, Loader2, Lock, Play, Plus, Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

const PANEL_WIDTH = 280;

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

// ── Tab definitions ────────────────────────────────────────────────
const TABS: { id: PlaylistTab; label: string; icon: string }[] = [
  { id: "new",      label: "NEW",      icon: "✦" },
  { id: "trending", label: "TREND",    icon: "↑" },
  { id: "liked",    label: "LIKED",    icon: "♥" },
  { id: "build",    label: "BUILD",    icon: "+" },
];

// ─── Individual Tab Handle ─────────────────────────────────────────
// Each tab is its own fixed-position button on the right edge.
// They stack vertically using `top` offsets calculated from the center.
// All slide left when the drawer opens.
function TabHandle({
  tab,
  index,
  total,
  isOpen,
  isActive,
  onClick,
}: {
  tab: { id: PlaylistTab; label: string; icon: string };
  index: number;
  total: number;
  isOpen: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const TAB_HEIGHT = 72;
  const TAB_GAP = 4;
  const totalHeight = total * TAB_HEIGHT + (total - 1) * TAB_GAP;
  const topOffset = `calc(50% - ${totalHeight / 2}px + ${index * (TAB_HEIGHT + TAB_GAP)}px)`;

  return (
    <button
      onClick={onClick}
      aria-label={`${isOpen && isActive ? "Close" : "Open"} quick play panel — ${tab.label}`}
      style={{
        position: "fixed",
        right: isOpen ? `${PANEL_WIDTH}px` : "0px",
        top: topOffset,
        zIndex: 56,
        background: isActive && isOpen
          ? "rgba(196,154,40,0.18)"
          : "var(--ln-panel)",
        borderTop: "1px solid var(--ln-panel-border)",
        borderLeft: "1px solid var(--ln-panel-border)",
        borderBottom: "1px solid var(--ln-panel-border)",
        borderRight: isActive && isOpen
          ? "2px solid var(--ln-gold)"
          : "none",
        borderRadius: "8px 0 0 8px",
        padding: "10px 7px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        height: `${TAB_HEIGHT}px`,
        width: "28px",
        transition: "right 0.3s cubic-bezier(0.4,0,0.2,1), background 0.15s, border-right 0.15s",
        color: isActive && isOpen ? "var(--ln-gold)" : "rgba(255,255,255,0.45)",
      }}
      onMouseEnter={e => {
        if (!(isActive && isOpen)) {
          (e.currentTarget as HTMLElement).style.background = "rgba(196,154,40,0.08)";
          (e.currentTarget as HTMLElement).style.color = "rgba(196,154,40,0.8)";
        }
      }}
      onMouseLeave={e => {
        if (!(isActive && isOpen)) {
          (e.currentTarget as HTMLElement).style.background = "var(--ln-panel)";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
        }
      }}
    >
      <span style={{ fontSize: "12px", lineHeight: 1 }}>{tab.icon}</span>
      <span style={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        fontSize: "8px",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        lineHeight: 1,
      }}>
        {tab.label}
      </span>
    </button>
  );
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
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 16px",
        background: isActive ? "rgba(196,154,40,0.05)" : "transparent",
        borderLeft: isActive ? "2px solid var(--ln-gold)" : "2px solid transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(196,154,40,0.03)";
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <div style={{
        width: "40px", height: "40px", borderRadius: "8px",
        overflow: "hidden", flexShrink: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        {track.artUrl ? (
          <img src={track.artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Music size={14} style={{ color: "rgba(255,255,255,0.2)" }} />
        )}
        {isActive && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            paddingBottom: "4px", gap: "2px",
          }}>
            {[1, 2, 3].map(i => (
              <span key={i} style={{
                width: "2px", borderRadius: "1px",
                background: "var(--ln-gold)",
                height: "6px",
                animation: `drawerWave ${0.4 + i * 0.12}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.08}s`,
              }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "12px", fontWeight: 600,
          color: isActive ? "var(--ln-gold)" : "var(--ln-parchment)",
          fontFamily: "var(--font-display)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {track.title}
        </div>
        <div style={{
          fontSize: "10px", marginTop: "2px",
          color: "rgba(255,255,255,0.35)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {track.artist}
        </div>
      </div>
      <Play size={11} fill="currentColor" style={{ color: "var(--ln-gold)", flexShrink: 0, opacity: 0.6 }} />
    </button>
  );
}

// ── Build Your Own placeholder ─────────────────────────────────────
function BuildYourOwn({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", padding: "24px", textAlign: "center", gap: "16px",
    }}>
      <div style={{
        width: "56px", height: "56px", borderRadius: "16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(196,154,40,0.08)",
        border: "1px solid rgba(196,154,40,0.25)",
      }}>
        <Plus size={24} style={{ color: "var(--ln-gold)" }} />
      </div>
      <div>
        <div style={{
          fontSize: "14px", fontWeight: 700,
          fontFamily: "var(--font-display)",
          color: "var(--ln-parchment)", marginBottom: "4px",
        }}>Custom Playlists</div>
        <div style={{ fontSize: "11px", lineHeight: 1.6, color: "rgba(255,255,255,0.4)" }}>
          Build and save your own playlists. Curate tracks from any creator on the platform.
        </div>
      </div>
      <button
        onClick={() => { onClose(); navigate("/explore"); }}
        style={{
          padding: "8px 16px", borderRadius: "10px",
          background: "rgba(196,154,40,0.08)",
          border: "1px solid rgba(196,154,40,0.3)",
          color: "var(--ln-gold)",
          fontFamily: "var(--font-display)",
          fontWeight: 700, fontSize: "11px",
          letterSpacing: "0.08em", cursor: "pointer",
        }}
      >
        Browse Tracks
      </button>
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        fontSize: "10px", padding: "6px 12px", borderRadius: "20px",
        background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.3)",
      }}>
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const { playQueueAt, state } = usePlayer();
  const { user } = useAuth();

  // Close on route change
  const [location, navigate] = useLocation();
  useEffect(() => { setIsOpen(false); }, [location]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        const handles = Array.from(document.querySelectorAll("[data-playlist-tab-handle]"));
        for (const h of handles) {
          if (h.contains(e.target as Node)) return;
        }
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Swipe-to-close (swipe right)
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    if (e.changedTouches[0].clientX - touchStartX.current > 60) setIsOpen(false);
    touchStartX.current = null;
  };

  // Handle tab click: open + switch tab, or collapse if already active
  function handleTabClick(tabId: PlaylistTab) {
    if (isOpen && activeTab === tabId) {
      setIsOpen(false);
    } else {
      setActiveTab(tabId);
      setIsOpen(true);
    }
  }

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

  const tabLabel: Record<PlaylistTab, string> = {
    new: "New This Week",
    trending: "Trending",
    liked: "Liked Tracks",
    build: "Build Playlist",
  };

  const content = (
    <>
      <style>{`
        @keyframes drawerWave {
          from { height: 3px; }
          to   { height: 9px; }
        }
      `}</style>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Individual stacked tab handles */}
      <div data-playlist-tab-handle>
        {TABS.map((t, i) => (
          <TabHandle
            key={t.id}
            tab={t}
            index={i}
            total={TABS.length}
            isOpen={isOpen}
            isActive={activeTab === t.id}
            onClick={() => handleTabClick(t.id)}
          />
        ))}
      </div>

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed",
          top: 0,
          right: isOpen ? 0 : `-${PANEL_WIDTH}px`,
          width: `${PANEL_WIDTH}px`,
          height: "100vh",
          background: "var(--ln-panel)",
          borderLeft: "1px solid var(--ln-panel-border)",
          zIndex: 55,
          display: "flex",
          flexDirection: "column",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflowX: "hidden",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--ln-panel-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--ln-parchment)",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span style={{ color: "var(--ln-gold)" }}>♪</span>
              {tabLabel[activeTab]}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
              Quick play
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.4)", fontSize: "18px", padding: "4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: "auto",
          overscrollBehavior: "contain",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 120px)",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(196,154,40,0.25) transparent",
        }}>
          {activeTab === "build" ? (
            <BuildYourOwn onClose={() => setIsOpen(false)} />
          ) : activeTab === "liked" && !user ? (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "200px", gap: "12px", padding: "24px",
              textAlign: "center",
            }}>
              <Lock size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>
                Sign in to see your liked tracks
              </div>
            </div>
          ) : isLoading ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "128px",
            }}>
              <Loader2 size={18} style={{ color: "rgba(196,154,40,0.4)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : tracks.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              height: "128px", gap: "8px",
            }}>
              <Music size={18} style={{ color: "rgba(255,255,255,0.1)" }} />
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                {activeTab === "liked" ? "No liked tracks yet" : "No tracks found"}
              </div>
            </div>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {/* Play all */}
              <button
                onClick={() => tracks.length > 0 && handlePlay(tracks[0], tracks)}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 16px", marginBottom: "4px",
                  background: "transparent", border: "none",
                  cursor: "pointer", color: "var(--ln-gold)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{
                  width: "28px", height: "28px", borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(196,154,40,0.08)",
                  border: "1px solid rgba(196,154,40,0.25)",
                }}>
                  <Play size={11} fill="currentColor" />
                </div>
                <span style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.06em",
                }}>
                  Play All ({tracks.length})
                </span>
              </button>
              <div style={{ height: "1px", margin: "0 16px 4px", background: "rgba(196,154,40,0.04)" }} />
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

  return createPortal(content, document.body);
}
