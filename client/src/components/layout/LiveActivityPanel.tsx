/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LiveActivityPanel
   Right-edge slide-in panel. Desktop only (hidden md:block).

   ARCHITECTURE:
   - Self-contained isOpen state
   - Each tab (Live / Playing / Tips) is its own individual protruding
     handle on the left edge of the panel, stacked top-to-bottom
   - All tab handles slide in sync with the panel
     (right: isOpen ? PANEL_WIDTH : 0)
   - Clicking a tab: opens drawer + switches to that tab
   - Clicking the active tab again: collapses the drawer
   - createPortal to document.body
   - Inline styles using var(--ln-panel) / var(--ln-gold) tokens
   - Closes on route change and outside click
═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { Music, Zap } from "lucide-react";

const PANEL_WIDTH = 280;

type LiveTab = "live" | "playing" | "tips";

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ── Tab definitions ────────────────────────────────────────────────
const TABS: { id: LiveTab; label: string; icon: string }[] = [
  { id: "live",    label: "LIVE",    icon: "◈" },
  { id: "playing", label: "PLAYING", icon: "♪" },
  { id: "tips",    label: "TIPS",    icon: "⚡" },
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
  tab: { id: LiveTab; label: string; icon: string };
  index: number;
  total: number;
  isOpen: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  // Stack tabs centered in the viewport.
  // Each tab button is ~72px tall. Gap between tabs: 4px.
  const TAB_HEIGHT = 68;
  const TAB_GAP = 2;
  // Anchor from bottom so this group sits in the lower portion of the screen,
  // separated from the PlaylistDrawer group which anchors from the top.
  // BOTTOM_ANCHOR: distance from bottom of viewport to the bottom of the last tab.
  const BOTTOM_ANCHOR = 120; // px from bottom (clears the player bar)
  const totalHeight = total * TAB_HEIGHT + (total - 1) * TAB_GAP;
  // index 0 = topmost tab in this group
  const bottomOffset = BOTTOM_ANCHOR + (total - 1 - index) * (TAB_HEIGHT + TAB_GAP);
  const topOffset = `calc(100% - ${bottomOffset + TAB_HEIGHT}px)`;

  return (
    <button
      onClick={onClick}
      aria-label={`${isOpen && isActive ? "Close" : "Open"} live activity panel — ${tab.label}`}
      style={{
        position: "fixed",
        right: isOpen ? `${PANEL_WIDTH}px` : "-4px",
        top: topOffset,
        zIndex: 54,
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

// ─── Main Component ───────────────────────────────────────────────
export default function LiveActivityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<LiveTab>("playing");
  const drawerRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { state, allTracks, playTrack } = usePlayer();

  // Close on route change
  const [location] = useLocation();
  useEffect(() => { setIsOpen(false); }, [location]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        const handles = Array.from(document.querySelectorAll("[data-live-tab-handle]"));
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

  // Handle tab click: open + switch tab, or collapse if already active
  function handleTabClick(tabId: LiveTab) {
    if (isOpen && tab === tabId) {
      setIsOpen(false);
    } else {
      setTab(tabId);
      setIsOpen(true);
    }
  }

  // Data
  const { data: tips } = trpc.tips.recentTips.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
  const { data: recentSongsRaw } = trpc.songs.discover.useQuery(
    { limit: 12, offset: 0, contentType: "audio" },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const recentSongs = recentSongsRaw?.filter((item: any) => {
    const s = item.song ?? item;
    return !s.contentType || s.contentType === "audio";
  }).slice(0, 6);

  const tracks = allTracks();
  const rawCurrentTrack = state.currentIdx >= 0 ? tracks[state.currentIdx] : null;
  const currentTrack = (!rawCurrentTrack?.contentType || rawCurrentTrack.contentType === "audio") ? rawCurrentTrack : null;

  const content = (
    <>
      <style>{`
        @keyframes lnBarBounce {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        @keyframes lnPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      {/* Individual stacked tab handles */}
      <div className="hidden md:block" data-live-tab-handle>
        {TABS.map((t, i) => (
          <TabHandle
            key={t.id}
            tab={t}
            index={i}
            total={TABS.length}
            isOpen={isOpen}
            isActive={tab === t.id}
            onClick={() => handleTabClick(t.id)}
          />
        ))}
      </div>

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="hidden md:flex"
        style={{
          position: "fixed",
          top: 0,
          right: isOpen ? 0 : `-${PANEL_WIDTH}px`,
          width: `${PANEL_WIDTH}px`,
          height: "100vh",
          background: "var(--ln-panel)",
          borderLeft: "1px solid var(--ln-panel-border)",
          zIndex: 55,
          flexDirection: "column",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
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
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              {tab === "live" && (
                <>
                  <span style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: "#ef4444", display: "inline-block",
                    animation: "lnPulse 1.5s infinite",
                  }} />
                  Live Activity
                </>
              )}
              {tab === "playing" && <>♪ Now Playing</>}
              {tab === "tips" && <>⚡ Tips</>}
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
              {tab === "live" && "Platform pulse"}
              {tab === "playing" && "Current queue"}
              {tab === "tips" && "Recent creator support"}
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

        {/* Body */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(196,154,40,0.25) transparent",
        }}>

          {/* LIVE TAB */}
          {tab === "live" && (
            <div style={{ padding: "8px 0" }}>
              <div style={{ padding: "6px 16px" }}>
                <span style={{
                  fontSize: "8px", fontFamily: "var(--font-display)",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "rgba(196,154,40,0.4)",
                }}>Recently Registered</span>
              </div>
              {recentSongs?.map((item: any) => {
                const s = item.song ?? item;
                const c = item.creator ?? {};
                return (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/song/${s.id}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "8px 16px", cursor: "pointer",
                      borderBottom: "1px solid rgba(196,154,40,0.04)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(196,154,40,0.04)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "6px",
                      overflow: "hidden", flexShrink: 0,
                      background: "rgba(0,0,0,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {s.coverArtUrl
                        ? <img src={s.coverArtUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Music size={12} style={{ color: "rgba(196,154,40,0.35)" }} />
                      }
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: "11px", fontWeight: 600,
                        color: "var(--ln-parchment)",
                        fontFamily: "var(--font-display)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{s.title}</div>
                      <div style={{ fontSize: "9px", color: "rgba(196,154,40,0.45)", marginTop: "2px" }}>
                        {c.artistHandle || c.name || "Unknown"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!recentSongs || recentSongs.length === 0) && (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>◈</div>
                  <div style={{ fontSize: "12px", fontFamily: "var(--font-display)" }}>No tracks yet</div>
                </div>
              )}
            </div>
          )}

          {/* PLAYING TAB */}
          {tab === "playing" && (
            <div style={{ padding: "8px 0" }}>
              {currentTrack && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 16px",
                  background: "rgba(196,154,40,0.04)",
                  borderBottom: "1px solid rgba(196,154,40,0.06)",
                  marginBottom: "4px",
                }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    overflow: "hidden", flexShrink: 0,
                    background: "rgba(0,0,0,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {currentTrack.artUrl
                      ? <img src={currentTrack.artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Music size={14} style={{ color: "rgba(196,154,40,0.35)" }} />
                    }
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: "12px", fontWeight: 600,
                      color: "var(--ln-parchment)",
                      fontFamily: "var(--font-display)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{currentTrack.title}</div>
                    <div style={{ fontSize: "10px", color: "rgba(196,154,40,0.5)", marginTop: "2px" }}>
                      {currentTrack.artist}
                    </div>
                  </div>
                  {/* Mini waveform */}
                  <div style={{ display: "flex", gap: "2px", alignItems: "flex-end", height: "12px", flexShrink: 0 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: "2px", borderRadius: "1px",
                        background: "rgba(196,154,40,0.5)",
                        height: `${[8, 14, 10][i]}px`,
                        animationName: state.isPlaying ? "lnBarBounce" : "none",
                        animationDuration: "0.8s",
                        animationTimingFunction: "ease-in-out",
                        animationIterationCount: "infinite",
                        animationDirection: "alternate",
                        animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div style={{ padding: "6px 16px" }}>
                <span style={{
                  fontSize: "8px", fontFamily: "var(--font-display)",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "rgba(196,154,40,0.4)",
                }}>Queue</span>
              </div>
              {tracks.filter(t => !t.contentType || t.contentType === "audio").slice(0, 8).map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => playTrack(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "8px 16px", cursor: "pointer",
                    borderBottom: "1px solid rgba(196,154,40,0.04)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(196,154,40,0.04)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    overflow: "hidden", flexShrink: 0,
                    background: "rgba(0,0,0,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {t.artUrl
                      ? <img src={t.artUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <Music size={10} style={{ color: "rgba(196,154,40,0.3)" }} />
                    }
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: "10px",
                      color: state.currentIdx === i ? "var(--ln-gold)" : "var(--ln-parchment)",
                      fontFamily: "var(--font-display)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{t.title}</div>
                    <div style={{ fontSize: "9px", color: "rgba(196,154,40,0.4)", marginTop: "1px" }}>{t.artist}</div>
                  </div>
                </div>
              ))}
              {tracks.filter(t => !t.contentType || t.contentType === "audio").length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>◈</div>
                  <div style={{ fontSize: "12px", fontFamily: "var(--font-display)" }}>Nothing queued</div>
                </div>
              )}
            </div>
          )}

          {/* TIPS TAB */}
          {tab === "tips" && (
            <div style={{ padding: "8px 0" }}>
              <div style={{ padding: "6px 16px" }}>
                <span style={{
                  fontSize: "8px", fontFamily: "var(--font-display)",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "rgba(196,154,40,0.4)",
                }}>Recent Tips</span>
              </div>
              {tips && tips.length > 0 ? tips.map((t: any) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(196,154,40,0.04)",
                  }}
                >
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(196,154,40,0.08)",
                    border: "1px solid rgba(196,154,40,0.15)",
                    color: "var(--ln-gold)",
                    fontSize: "11px", fontWeight: 700,
                  }}>
                    {(t.fanName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "var(--ln-parchment)" }}>
                      <span style={{ color: "rgba(230,205,174,0.9)", fontWeight: 600 }}>@{t.fanName || "fan"}</span>
                      {" tipped "}
                      <span style={{ fontWeight: 500 }}>{t.creatorName}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "rgba(196,154,40,0.5)", marginTop: "2px" }}>
                      {formatAmount(t.amountCents)} · "{t.songTitle}"
                    </div>
                    {t.createdAt && (
                      <div style={{ fontSize: "9px", color: "rgba(196,154,40,0.35)", marginTop: "2px" }}>
                        {timeAgo(new Date(t.createdAt).getTime())}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ln-gold)", flexShrink: 0 }}>
                    {formatAmount(t.amountCents)}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: "center", padding: "40px 16px", color: "rgba(255,255,255,0.3)" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                    <Zap size={20} style={{ color: "rgba(196,154,40,0.15)", margin: "0 auto" }} />
                  </div>
                  <div style={{ fontSize: "12px", fontFamily: "var(--font-display)" }}>No tips yet today</div>
                  <div style={{ fontSize: "10px", marginTop: "4px", color: "rgba(196,154,40,0.2)" }}>
                    Be the first to support a creator
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
