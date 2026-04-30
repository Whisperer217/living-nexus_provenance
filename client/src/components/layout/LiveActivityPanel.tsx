/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LiveActivityPanel
   Left-edge slide-in panel. Desktop only.
   Book-tab spine navigation — tabs protrude from the right edge
   of the drawer like dividers in a living reference book.
═══════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { Music, Zap, Radio } from "lucide-react";
import BookSpineTabs from "@/components/BookSpineTabs";

const PANEL_WIDTH = 272;
const TOP_OFFSET = 52;
const BOTTOM_OFFSET = 72;

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

interface LiveActivityPanelProps {
  open: boolean;
  onToggle: () => void;
}

export default function LiveActivityPanel({ open, onToggle }: LiveActivityPanelProps) {
  const [tab, setTab] = useState<LiveTab>("playing");
  const [, navigate] = useLocation();
  const { state, allTracks, playTrack } = usePlayer();

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
  const isAudioTrack = (t: typeof rawCurrentTrack) =>
    !t || !t.contentType || t.contentType === "audio";
  const currentTrack = isAudioTrack(rawCurrentTrack) ? rawCurrentTrack : null;

  const TABS = [
    { id: "live" as LiveTab,    label: "Live",    icon: Radio, dot: true },
    { id: "playing" as LiveTab, label: "Playing", icon: Music },
    { id: "tips" as LiveTab,    label: "Tips",    icon: Zap },
  ];

  return (
    <>
      <style>{`
        @keyframes bar-bounce {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        @keyframes lnPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      {/* ── Slide-in panel ───────────────────────────────────────── */}
      <div
        className="hidden md:flex fixed flex-col"
        style={{
          top: `${TOP_OFFSET}px`,
          left: 0,
          width: `${PANEL_WIDTH}px`,
          bottom: `${BOTTOM_OFFSET}px`,
          /* Parchment-toned dark background — warmer than the old blue-grey */
          background: "linear-gradient(180deg, rgba(18,15,10,0.98) 0%, rgba(22,18,12,0.97) 100%)",
          borderRight: "1px solid rgba(196,154,40,0.12)",
          backdropFilter: "blur(20px)",
          transform: open ? "translateX(0)" : `translateX(-${PANEL_WIDTH}px)`,
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: "6px 0 32px rgba(0,0,0,0.55)",
          /* position:relative so the spine tabs can be absolutely positioned */
          position: "fixed",
          overflow: "visible",
          zIndex: 35,
        }}
      >
        {/* ── Book spine tabs — protrude from right edge ─────────── */}
        {/* Rendered as absolute children of the panel so they move with it */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 0, height: "100%", overflow: "visible", zIndex: 36 }}>
          <BookSpineTabs
            side="left"
            tabs={TABS}
            activeTab={tab}
            onTabChange={(id) => setTab(id as LiveTab)}
            drawerOpen={open}
            onDrawerToggle={onToggle}
            topOffset={TOP_OFFSET}
            drawerWidth={PANEL_WIDTH}
          />
        </div>

        {/* ── Page edge rule — top of the "book page" ────────────── */}
        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 py-3"
          style={{
            borderBottom: "1px solid rgba(196,154,40,0.10)",
            background: "rgba(196,154,40,0.025)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "#ef4444", animation: "lnPulse 1.5s infinite" }}
          />
          <span
            className="text-[9px] font-heading tracking-[0.16em] uppercase"
            style={{ color: "rgba(196,154,40,0.6)", fontFamily: "'Cinzel', serif" }}
          >
            Live Activity
          </span>
          {/* Active tab label shown inline */}
          <span
            className="ml-auto text-[9px] font-heading tracking-[0.12em] uppercase"
            style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}
          >
            {TABS.find(t => t.id === tab)?.label}
          </span>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(196,154,40,0.25) transparent",
            overscrollBehavior: "contain",
          }}
        >
          {/* LIVE TAB — recently registered tracks */}
          {tab === "live" && (
            <div className="py-2">
              <div className="px-4 py-1.5">
                <span className="text-[8px] font-heading tracking-[0.12em] uppercase" style={{ color: "rgba(196,154,40,0.4)", fontFamily: "'Cinzel', serif" }}>
                  Recently Registered
                </span>
              </div>
              {recentSongs?.map((item: any) => {
                const s = item.song ?? item;
                const c = item.creator ?? {};
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-all"
                    onClick={() => navigate(`/song/${s.id}`)}
                    style={{ borderBottom: "1px solid rgba(196,154,40,0.04)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(196,154,40,0.04)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #1a1208, #2a1f0e)", border: "1px solid rgba(196,154,40,0.12)" }}
                    >
                      {s.coverArtUrl
                        ? <img src={s.coverArtUrl} alt="" className="w-full h-full object-cover rounded-md" />
                        : <Music size={12} style={{ color: "rgba(196,154,40,0.35)" }} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{s.title}</div>
                      <div className="text-[9px] truncate" style={{ color: "rgba(196,154,40,0.45)" }}>{c.artistHandle || c.name || "Unknown"}</div>
                    </div>
                  </div>
                );
              })}
              {(!recentSongs || recentSongs.length === 0) && (
                <div className="px-4 py-6 text-center">
                  <Radio size={20} style={{ color: "rgba(196,154,40,0.15)", margin: "0 auto 8px" }} />
                  <div className="text-[11px]" style={{ color: "rgba(196,154,40,0.35)" }}>No recent activity</div>
                </div>
              )}
            </div>
          )}

          {/* PLAYING TAB */}
          {tab === "playing" && (
            <div className="py-2">
              {currentTrack && (
                <>
                  <div className="px-4 py-1.5">
                    <span className="text-[8px] font-heading tracking-[0.12em] uppercase" style={{ color: "rgba(196,154,40,0.4)", fontFamily: "'Cinzel', serif" }}>
                      Your Session
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
                    style={{ background: "rgba(196,154,40,0.04)", borderBottom: "1px solid rgba(196,154,40,0.06)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #1a1208, #2a1f0e)", border: "1px solid rgba(196,154,40,0.15)" }}
                    >
                      {currentTrack.artUrl
                        ? <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                        : (
                          <div className="flex gap-0.5 items-end h-3.5">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-0.5 rounded-sm" style={{
                                background: "rgba(196,154,40,0.5)",
                                height: `${[8, 14, 10][i]}px`,
                                animationName: "bar-bounce",
                                animationDuration: "0.8s",
                                animationTimingFunction: "ease-in-out",
                                animationIterationCount: "infinite",
                                animationDirection: "alternate",
                                animationDelay: `${i * 0.2}s`,
                              }} />
                            ))}
                          </div>
                        )
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{currentTrack.title}</div>
                      <div className="text-[10px] truncate" style={{ color: "rgba(196,154,40,0.5)" }}>{currentTrack.artist}</div>
                    </div>
                    <div className="flex gap-0.5 items-end h-3" style={{ flexShrink: 0 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-0.5 rounded-sm" style={{
                          background: "rgba(196,154,40,0.5)",
                          height: `${[6, 12, 8][i]}px`,
                          animationName: state.isPlaying ? "bar-bounce" : "none",
                          animationDuration: "0.8s",
                          animationTimingFunction: "ease-in-out",
                          animationIterationCount: "infinite",
                          animationDirection: "alternate",
                          animationDelay: `${i * 0.2}s`,
                        }} />
                      ))}
                    </div>
                  </div>
                  <div className="mx-4 my-1" style={{ height: "1px", background: "rgba(196,154,40,0.05)" }} />
                </>
              )}
              <div className="px-4 py-1.5">
                <span className="text-[8px] font-heading tracking-[0.12em] uppercase" style={{ color: "rgba(196,154,40,0.4)", fontFamily: "'Cinzel', serif" }}>
                  Recently Registered
                </span>
              </div>
              {recentSongs?.map((item: any) => {
                const s = item.song ?? item;
                const c = item.creator ?? {};
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-all"
                    onClick={() => navigate(`/song/${s.id}`)}
                    style={{ borderBottom: "1px solid rgba(196,154,40,0.04)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(196,154,40,0.04)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #1a1208, #2a1f0e)", border: "1px solid rgba(196,154,40,0.12)" }}
                    >
                      {s.coverArtUrl
                        ? <img src={s.coverArtUrl} alt="" className="w-full h-full object-cover rounded-md" />
                        : <Music size={12} style={{ color: "rgba(196,154,40,0.35)" }} />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{s.title}</div>
                      <div className="text-[9px] truncate" style={{ color: "rgba(196,154,40,0.45)" }}>{c.artistHandle || c.name || "Unknown"}</div>
                    </div>
                  </div>
                );
              })}
              {(!recentSongs || recentSongs.length === 0) && (
                <div className="px-4 py-6 text-center">
                  <Music size={20} style={{ color: "rgba(196,154,40,0.15)", margin: "0 auto 8px" }} />
                  <div className="text-[11px]" style={{ color: "rgba(196,154,40,0.35)" }}>No tracks yet</div>
                </div>
              )}
            </div>
          )}

          {/* TIPS TAB */}
          {tab === "tips" && (
            <div className="py-2">
              <div className="px-4 py-1.5">
                <span className="text-[8px] font-heading tracking-[0.12em] uppercase" style={{ color: "rgba(196,154,40,0.4)", fontFamily: "'Cinzel', serif" }}>
                  Recent Tips
                </span>
              </div>
              {tips && tips.length > 0 ? tips.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 px-4 py-2.5 transition-all"
                  style={{ borderBottom: "1px solid rgba(196,154,40,0.04)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.15)" }}
                  >
                    {(t.fanName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px]" style={{ color: "var(--ln-parchment)" }}>
                      <span style={{ color: "rgba(230,205,174,0.9)", fontWeight: 600 }}>@{t.fanName || "fan"}</span>
                      {" tipped "}
                      <span style={{ color: "var(--ln-parchment)", fontWeight: 500 }}>{t.creatorName}</span>
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "rgba(196,154,40,0.5)" }}>
                      {formatAmount(t.amountCents)} · "{t.songTitle}"
                    </div>
                    {t.createdAt && (
                      <div className="text-[9px] mt-0.5" style={{ color: "rgba(196,154,40,0.35)" }}>
                        {timeAgo(new Date(t.createdAt).getTime())}
                      </div>
                    )}
                  </div>
                  <div className="text-[12px] font-bold flex-shrink-0" style={{ color: "var(--ln-gold)" }}>
                    {formatAmount(t.amountCents)}
                  </div>
                </div>
              )) : (
                <div className="px-4 py-6 text-center">
                  <Zap size={20} style={{ color: "rgba(196,154,40,0.15)", margin: "0 auto 8px" }} />
                  <div className="text-[11px]" style={{ color: "rgba(196,154,40,0.35)" }}>No tips yet today</div>
                  <div className="text-[10px] mt-1" style={{ color: "rgba(196,154,40,0.2)" }}>Be the first to support a creator</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
