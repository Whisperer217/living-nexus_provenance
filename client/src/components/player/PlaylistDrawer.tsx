/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlaylistDrawer
   Right-side slide-in panel. Desktop + mobile.

   ARCHITECTURE: Matches MarketplaceDrawer exactly.
   - Self-contained isOpen state
   - Single centered handle button on the left edge of the panel
   - Handle slides with the panel (right: isOpen ? PANEL_WIDTH : 0)
   - createPortal to document.body
   - Inline styles using var(--ln-panel) / var(--ln-gold) tokens
   - Closes on route change and outside click
   - Swipe-to-close on mobile (swipe right)
═══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ListMusic, TrendingUp, Sparkles,
  Heart, Plus, Play, Music, Loader2, Lock,
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

// ─── Handle (always visible, slides with panel) ───────────────────
function DrawerHandle({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? "Close quick play panel" : "Open quick play panel"}
      style={{
        position: "fixed",
        right: isOpen ? `${PANEL_WIDTH}px` : "0px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 56,
        background: "var(--ln-panel)",
        borderTop: "1px solid var(--ln-panel-border)",
        borderLeft: "1px solid var(--ln-panel-border)",
        borderBottom: "1px solid var(--ln-panel-border)",
        borderRight: "none",
        borderRadius: "8px 0 0 8px",
        padding: "12px 6px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
        color: "var(--ln-gold)",
      }}
    >
      <span style={{ fontSize: "14px" }}>♪</span>
      <span style={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        fontSize: "9px",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
      }}>
        PLAY
      </span>
      <span style={{ fontSize: "10px", opacity: 0.5 }}>{isOpen ? "›" : "‹"}</span>
    </button>
  );
}

// ─── Tab pill row ─────────────────────────────────────────────────
function TabRow({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: PlaylistTab; label: string }[];
  active: PlaylistTab;
  onChange: (id: PlaylistTab) => void;
}) {
  return (
    <div style={{
      display: "flex",
      gap: "4px",
      padding: "8px 12px",
      borderBottom: "1px solid var(--ln-panel-border)",
      flexShrink: 0,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            padding: "5px 0",
            background: active === t.id ? "rgba(196,154,40,0.15)" : "transparent",
            border: active === t.id ? "1px solid rgba(196,154,40,0.35)" : "1px solid transparent",
            borderRadius: "6px",
            color: active === t.id ? "var(--ln-gold)" : "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
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
      {/* Artwork */}
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
      {/* Info */}
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
      {/* Play icon */}
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
  const { addAndPlay, playQueueAt, state } = usePlayer();
  const { user } = useAuth();

  // Close on route change
  const [location, navigate] = useLocation();
  useEffect(() => { setIsOpen(false); }, [location]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        const handle = document.querySelector("[data-playlist-handle]");
        if (handle && handle.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Close when modal/dialog opens
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

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Swipe-to-close
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    if (e.changedTouches[0].clientX - touchStartX.current > 60) setIsOpen(false);
    touchStartX.current = null;
  };

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

  const TABS = [
    { id: "new" as PlaylistTab,      label: "New"      },
    { id: "trending" as PlaylistTab, label: "Trending" },
    { id: "liked" as PlaylistTab,    label: "Liked"    },
    { id: "build" as PlaylistTab,    label: "Build"    },
  ];

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

      {/* Handle */}
      <div data-playlist-handle>
        <DrawerHandle isOpen={isOpen} onClick={() => setIsOpen(v => !v)} />
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
              <ListMusic size={13} style={{ color: "var(--ln-gold)" }} />
              Quick Play
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
              Curated playlists
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

        {/* Tab row */}
        <TabRow tabs={TABS} active={activeTab} onChange={setActiveTab} />

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
