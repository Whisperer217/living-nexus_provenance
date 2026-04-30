/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LiveActivityPanel
   Left-edge slide-in panel. Desktop only (hidden md:block).

   ARCHITECTURE: Matches MarketplaceDrawer exactly.
   - Self-contained isOpen state (no props needed)
   - Single centered handle button on the right edge of the panel
   - Handle slides with the panel (left: isOpen ? PANEL_WIDTH : 0)
   - createPortal to document.body
   - Inline styles using var(--ln-panel) / var(--ln-gold) tokens
   - Closes on route change and outside click
═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { Music, Zap, Radio } from "lucide-react";

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

// ─── Handle (always visible, slides with panel) ───────────────────
function DrawerHandle({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? "Close live activity panel" : "Open live activity panel"}
      style={{
        position: "fixed",
        left: isOpen ? `${PANEL_WIDTH}px` : "0px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 56,
        background: "var(--ln-panel)",
        borderTop: "1px solid var(--ln-panel-border)",
        borderRight: "1px solid var(--ln-panel-border)",
        borderBottom: "1px solid var(--ln-panel-border)",
        borderLeft: "none",
        borderRadius: "0 8px 8px 0",
        padding: "12px 6px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
        color: "var(--ln-gold)",
      }}
    >
      <span style={{ fontSize: "14px" }}>◈</span>
      <span style={{
        writingMode: "vertical-rl",
        textOrientation: "mixed",
        transform: "rotate(180deg)",
        fontSize: "9px",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
      }}>
        LIVE
      </span>
      <span style={{ fontSize: "10px", opacity: 0.5 }}>{isOpen ? "‹" : "›"}</span>
    </button>
  );
}

// ─── Tab pill row ─────────────────────────────────────────────────
function TabRow({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: LiveTab; label: string }[];
  active: LiveTab;
  onChange: (id: LiveTab) => void;
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
        const handle = document.querySelector("[data-live-handle]");
        if (handle && handle.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

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

  const TABS = [
    { id: "live" as LiveTab,    label: "Live"    },
    { id: "playing" as LiveTab, label: "Playing" },
    { id: "tips" as LiveTab,    label: "Tips"    },
  ];

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

      {/* Handle */}
      <div data-live-handle className="hidden md:block">
        <DrawerHandle isOpen={isOpen} onClick={() => setIsOpen(v => !v)} />
      </div>

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="hidden md:flex"
        style={{
          position: "fixed",
          top: 0,
          left: isOpen ? 0 : `-${PANEL_WIDTH}px`,
          width: `${PANEL_WIDTH}px`,
          height: "100vh",
          background: "var(--ln-panel)",
          borderRight: "1px solid var(--ln-panel-border)",
          zIndex: 55,
          display: "flex",
          flexDirection: "column",
          transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
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
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#ef4444",
                display: "inline-block",
                animation: "lnPulse 1.5s infinite",
              }} />
              Live Activity
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
              Platform pulse
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
        <TabRow tabs={TABS} active={tab} onChange={setTab} />

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
