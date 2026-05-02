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
  Music, Loader2, Lock, Play, Plus, Sparkles, GripVertical, Trash2, FolderOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { AddToCollectionButton } from "@/components/AddToCollectionModal";

const PANEL_WIDTH = 280;

// ── Types ──────────────────────────────────────────────────────────
type PlaylistTab = "new" | "trending" | "liked" | "build" | "shop";

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
  { id: "shop",     label: "SHOP",     icon: "⊛" },
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
  const TAB_HEIGHT = 68;
  const TAB_GAP = 2;
  // Anchor from top so this group sits in the upper portion of the screen,
  // separated from the LiveActivityPanel group which anchors from the bottom.
  const TOP_ANCHOR = 80; // px from top of viewport
  const topOffset = `${TOP_ANCHOR + index * (TAB_HEIGHT + TAB_GAP)}px`;

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

// ── DraggableLikedList ─────────────────────────────────────────────
// Reorderable list of liked tracks with drag handles
function DraggableLikedList({
  tracks,
  onReorder,
  onPlay,
  currentId,
}: {
  tracks: TrackRow[];
  onReorder: (orderedIds: number[]) => void;
  onPlay: (track: TrackRow, all: TrackRow[]) => void;
  currentId?: string;
}) {
  const [items, setItems] = useState<TrackRow[]>(tracks);
  const dragIdx = useRef<number | null>(null);

  useEffect(() => { setItems(tracks); }, [tracks]);

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setItems(next);
  }
  function onDragEnd() {
    dragIdx.current = null;
    onReorder(items.map(t => t.id));
  }

  return (
    <div style={{ padding: "8px 0" }}>
      {items.map((track, i) => (
        <div
          key={track.id}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => onDragOver(e, i)}
          onDragEnd={onDragEnd}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 8px 6px 4px",
            background: String(track.id) === currentId ? "rgba(196,154,40,0.05)" : "transparent",
            borderLeft: String(track.id) === currentId ? "2px solid var(--ln-gold)" : "2px solid transparent",
            cursor: "grab",
          }}
        >
          <GripVertical size={12} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
          <div
            style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}
            onClick={() => onPlay(track, items)}
          >
            <div style={{
              width: "36px", height: "36px", borderRadius: "6px",
              overflow: "hidden", flexShrink: 0,
              background: "rgba(0,0,0,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {track.artUrl
                ? <img src={track.artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Music size={12} style={{ color: "rgba(255,255,255,0.2)" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: "11px", fontWeight: 600,
                color: String(track.id) === currentId ? "var(--ln-gold)" : "var(--ln-parchment)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{track.title}</div>
              <div style={{
                fontSize: "9px", color: "rgba(255,255,255,0.35)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{track.artist}</div>
            </div>
          </div>
          <AddToCollectionButton songId={track.id} songTitle={track.title} size={12} />
        </div>
      ))}
    </div>
  );
}

// ── BuildCollectionsPanel ──────────────────────────────────────────
// Shows user's named collections with expandable track lists
function BuildCollectionsPanel() {
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const { playQueueAt } = usePlayer();

  const { data: collections, isLoading } = trpc.userCollections.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: legacyPlaylists } = trpc.playlists.mine.useQuery(undefined, { enabled: !!user });
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<number | null>(null);
  const { data: expandedPlaylistData } = trpc.playlists.getById.useQuery(
    { id: expandedPlaylistId! },
    { enabled: expandedPlaylistId !== null }
  );
  const expandedPlaylistTracks = expandedPlaylistData?.tracks ?? [];
  const { data: expandedTracks } = trpc.userCollections.getTracks.useQuery(
    { collectionId: expandedId! },
    { enabled: expandedId !== null }
  );

  const createCol = trpc.userCollections.create.useMutation({
    onSuccess: () => {
      utils.userCollections.list.invalidate();
      setCreating(false);
      setNewName("");
    },
  });
  const deleteCol = trpc.userCollections.delete.useMutation({
    onSuccess: () => utils.userCollections.list.invalidate(),
  });
  const removeTrack = trpc.userCollections.removeTrack.useMutation({
    onSuccess: () => utils.userCollections.getTracks.invalidate(),
  });

  if (!user) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px", padding: "24px", textAlign: "center" }}>
      <Lock size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>Sign in to manage collections</div>
    </div>
  );

  return (
    <div style={{ padding: "12px 0" }}>
      {/* Create new */}
      <div style={{ padding: "0 12px 12px" }}>
        {creating ? (
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              autoFocus
              placeholder="Collection name…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && newName.trim() && createCol.mutate({ name: newName.trim() })}
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(196,154,40,0.3)",
                borderRadius: "6px", color: "#e8e0d0",
                padding: "6px 10px", fontSize: "12px", outline: "none",
              }}
            />
            <button
              onClick={() => newName.trim() && createCol.mutate({ name: newName.trim() })}
              disabled={!newName.trim() || createCol.isPending}
              style={{
                padding: "6px 12px", borderRadius: "6px",
                background: "var(--ln-gold)", color: "#0a0812",
                border: "none", fontWeight: 700, fontSize: "11px", cursor: "pointer",
              }}
            >{createCol.isPending ? "…" : "Add"}</button>
            <button
              onClick={() => { setCreating(false); setNewName(""); }}
              style={{ padding: "6px", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "16px" }}
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 10px", borderRadius: "8px",
              background: "transparent", border: "1px dashed rgba(196,154,40,0.3)",
              color: "var(--ln-gold)", cursor: "pointer", fontSize: "11px",
              fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.06em",
            }}
          >
            <Plus size={12} /> New Collection
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
          <Loader2 size={16} style={{ color: "rgba(196,154,40,0.4)", animation: "spin 1s linear infinite" }} />
        </div>
      ) : !collections || collections.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px", color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
          <FolderOpen size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
          No collections yet
        </div>
      ) : (
        collections.map((col: { id: number; name: string; trackCount: number }) => (
          <div key={col.id}>
            {/* Collection header */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 12px",
              background: expandedId === col.id ? "rgba(196,154,40,0.05)" : "transparent",
              borderLeft: expandedId === col.id ? "2px solid var(--ln-gold)" : "2px solid transparent",
              cursor: "pointer",
            }}
              onClick={() => setExpandedId(expandedId === col.id ? null : col.id)}
            >
              {expandedId === col.id
                ? <ChevronDown size={12} style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
                : <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
              <FolderOpen size={13} style={{ color: expandedId === col.id ? "var(--ln-gold)" : "rgba(255,255,255,0.4)", flexShrink: 0 }} />
              <span style={{
                flex: 1, fontSize: "12px", fontWeight: 600,
                fontFamily: "var(--font-display)",
                color: expandedId === col.id ? "var(--ln-gold)" : "var(--ln-parchment)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{col.name}</span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>{col.trackCount}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteCol.mutate({ collectionId: col.id }); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: "2px", flexShrink: 0 }}
                title="Delete collection"
              ><Trash2 size={11} /></button>
            </div>

            {/* Expanded tracks */}
            {expandedId === col.id && (
              <div style={{ paddingLeft: "24px" }}>
                {!expandedTracks ? (
                  <div style={{ padding: "8px", color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>Loading…</div>
                ) : expandedTracks.length === 0 ? (
                  <div style={{ padding: "8px 12px", color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>No tracks yet — use + on any track card</div>
                ) : (
                  expandedTracks.map((t: any) => {
                    const s = t.song ?? t;
                    const artUrl = s.coverArtUrl ?? s.artUrl ?? null;
                    const artist = t.creator?.artistHandle || t.creator?.name || s.artist || "";
                    return (
                    <div key={t.entry?.id ?? s.id} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "6px 12px 6px 0",
                    }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "4px",
                        overflow: "hidden", flexShrink: 0,
                        background: "rgba(0,0,0,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {artUrl
                          ? <img src={artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <Music size={10} style={{ color: "rgba(255,255,255,0.2)" }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ln-parchment)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                        <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist}</div>
                      </div>
                      <button
                        onClick={() => removeTrack.mutate({ collectionId: col.id, songId: s.id })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", padding: "2px", flexShrink: 0 }}
                      ><Trash2 size={10} /></button>
                    </div>
                    );
                  })
                )}
                {/* Play collection */}
                {expandedTracks && expandedTracks.length > 0 && (
                  <button
                    onClick={() => {
                      const playerTracks = expandedTracks.map((t: any) => {
                        const s = t.song ?? t;
                        return {
                          id: String(s.id), title: s.title,
                          artist: t.creator?.artistHandle || t.creator?.name || s.artist || "",
                          artUrl: (s.coverArtUrl ?? s.artUrl) ?? undefined,
                          audioUrl: s.audioUrl ?? "",
                        };
                      });
                      playQueueAt(playerTracks, 0, "NONE");
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "6px 12px 10px 0",
                      background: "none", border: "none",
                      color: "var(--ln-gold)", cursor: "pointer",
                      fontSize: "10px", fontFamily: "var(--font-display)",
                      fontWeight: 700, letterSpacing: "0.06em",
                    }}
                  >
                    <Play size={10} fill="currentColor" /> Play All
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
      {/* Legacy Playlists Section */}
      {legacyPlaylists && legacyPlaylists.length > 0 && (
        <>
          <div style={{ padding: "12px 12px 6px", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "8px" }}>
            <span style={{ fontSize: "9px", fontFamily: "var(--font-display)", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>My Playlists</span>
          </div>
          {legacyPlaylists.map((pl: { id: number; name: string }) => (
            <div key={pl.id}>
              <div style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 12px",
                background: expandedPlaylistId === pl.id ? "rgba(196,154,40,0.05)" : "transparent",
                borderLeft: expandedPlaylistId === pl.id ? "2px solid var(--ln-gold)" : "2px solid transparent",
                cursor: "pointer",
              }}
                onClick={() => setExpandedPlaylistId(expandedPlaylistId === pl.id ? null : pl.id)}
              >
                {expandedPlaylistId === pl.id
                  ? <ChevronDown size={12} style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
                  : <ChevronRight size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
                <Music size={13} style={{ color: expandedPlaylistId === pl.id ? "var(--ln-gold)" : "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                <span style={{
                  flex: 1, fontSize: "12px", fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  color: expandedPlaylistId === pl.id ? "var(--ln-gold)" : "var(--ln-parchment)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{pl.name}</span>
              </div>
              {expandedPlaylistId === pl.id && (
                <div style={{ paddingLeft: "24px" }}>
                  {expandedPlaylistTracks.length === 0 ? (
                    <div style={{ padding: "8px 12px", color: "rgba(255,255,255,0.2)", fontSize: "10px" }}>No tracks</div>
                  ) : (
                    expandedPlaylistTracks.map((t: any) => {
                      const artUrl = t.song?.coverArtUrl ?? t.song?.artUrl ?? null;
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px 6px 0" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {artUrl ? <img src={artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Music size={10} style={{ color: "rgba(255,255,255,0.2)" }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--ln-parchment)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.song?.title ?? "Unknown"}</div>
                            <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.song?.artist ?? ""}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
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

  // Drawer exclusivity: close when the left-rail context drawer opens
  useEffect(() => {
    const handler = () => setIsOpen(false);
    window.addEventListener("ln:close-right-drawers", handler);
    return () => window.removeEventListener("ln:close-right-drawers", handler);
  }, []);

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
  // SHOP tab dispatches a custom event to open MarketplaceDrawer instead
  function handleTabClick(tabId: PlaylistTab) {
    if (tabId === "shop") {
      // Close this drawer and open the Marketplace drawer
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent("ln:open-shop"));
      return;
    }
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
  const utils = trpc.useUtils();
  const { data: likedData, isLoading: likedLoading } = trpc.songs.getLikedOrdered.useQuery(undefined, {
    enabled: isOpen && activeTab === "liked" && !!user,
    staleTime: 30_000,
  });
  const reorderLikes = trpc.songs.reorderLikes.useMutation({
    onSuccess: () => utils.songs.getLikedOrdered.invalidate(),
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
    shop: "Shop",
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
            <BuildCollectionsPanel />
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "128px" }}>
              <Loader2 size={18} style={{ color: "rgba(196,154,40,0.4)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : tracks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "128px", gap: "8px" }}>
              <Music size={18} style={{ color: "rgba(255,255,255,0.1)" }} />
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                {activeTab === "liked" ? "No liked tracks yet" : "No tracks found"}
              </div>
            </div>
          ) : activeTab === "liked" ? (
            <>
              {/* Play all */}
              <button
                onClick={() => likedTracks.length > 0 && handlePlay(likedTracks[0], likedTracks)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", marginBottom: "4px", background: "transparent", border: "none", cursor: "pointer", color: "var(--ln-gold)", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)" }}>
                  <Play size={11} fill="currentColor" />
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em" }}>Play All ({likedTracks.length})</span>
              </button>
              <div style={{ height: "1px", margin: "0 16px 4px", background: "rgba(196,154,40,0.04)" }} />
              <DraggableLikedList
                tracks={likedTracks}
                onReorder={(ids) => reorderLikes.mutate({ orderedSongIds: ids })}
                onPlay={handlePlay}
                currentId={currentId}
              />
            </>
          ) : (
            <div style={{ padding: "8px 0" }}>
              {/* Play all */}
              <button
                onClick={() => tracks.length > 0 && handlePlay(tracks[0], tracks)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", marginBottom: "4px", background: "transparent", border: "none", cursor: "pointer", color: "var(--ln-gold)", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)" }}>
                  <Play size={11} fill="currentColor" />
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em" }}>Play All ({tracks.length})</span>
              </button>
              <div style={{ height: "1px", margin: "0 16px 4px", background: "rgba(196,154,40,0.04)" }} />
              {tracks.map((track) => (
                <MiniTrackRow key={track.id} track={track} isActive={currentId === String(track.id)} onPlay={() => handlePlay(track, tracks)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
