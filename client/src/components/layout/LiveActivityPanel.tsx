/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LiveActivityPanel
   Left-edge slide-in panel. Desktop only.
   Shows: Now Playing tracks, recent tips, active listen sessions.
   Replaces the TipTicker marquee on desktop.
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { X, Music, Zap } from "lucide-react";

const PANEL_WIDTH = 272;

type LiveTab = "playing" | "tips";

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

  // Recent tips
  const { data: tips } = trpc.tips.recentTips.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 25_000,
  });



  // Recent audio tracks from explore (for "Now Playing" context) — filter to audio only
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
  // Only show audio tracks in "Now Playing" — manuscripts, comics, and lyrics are not audio
  const isAudioTrack = (t: typeof rawCurrentTrack) =>
    !t || !t.contentType || t.contentType === "audio";
  const currentTrack = isAudioTrack(rawCurrentTrack) ? rawCurrentTrack : null;

  return (
    <>
      {/* ── Pull tab (always visible on desktop) ─────────────────── */}
      <div
        className="hidden md:flex fixed z-40 flex-col items-center gap-1.5 cursor-pointer select-none transition-all duration-300"
        style={{
          top: "50%",
          left: open ? `${PANEL_WIDTH}px` : "0px",
          transform: "translateY(-50%)",
          background: "rgba(44,52,56,0.95)",
          border: "1px solid rgba(44,52,56,0.5)",
          borderLeft: "none",
          borderRadius: "0 8px 8px 0",
          padding: "12px 6px",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
        onClick={onToggle}
        title={open ? "Close Live Panel" : "Open Live Panel"}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: "#ef4444", animation: "pulse 1.5s infinite" }}
        />
        <span
          className="text-[9px] font-heading tracking-[0.12em] uppercase"
          style={{ color: open ? "var(--ln-gold)" : "var(--ln-smoke)" }}
        >
          Live
        </span>
      </div>

      {/* ── Slide-in panel ───────────────────────────────────────── */}
      <div
        className="hidden md:flex fixed flex-col z-35"
        style={{
          top: "52px",
          left: 0,
          width: `${PANEL_WIDTH}px`,
          bottom: "72px",
          background: "rgba(44,52,56,0.97)",
          borderRight: "1px solid rgba(44,52,56,0.5)",
          backdropFilter: "blur(16px)",
          transform: open ? "translateX(0)" : `translateX(-${PANEL_WIDTH}px)`,
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(44,52,56,0.35)" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#ef4444", animation: "pulse 1.5s infinite" }} />
            <span className="text-[10px] font-heading tracking-[0.12em] uppercase" style={{ color: "rgba(196,154,40,0.7)" }}>
              Live Activity
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded transition-all"
            style={{ color: "var(--ln-iron)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid rgba(44,52,56,0.3)" }}>
          {([
            { key: "playing", label: "Playing", icon: Music },
            { key: "tips",    label: "Tips",    icon: Zap    },
          ] as { key: LiveTab; label: string; icon: React.ElementType }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-all"
              style={{
                fontSize: "10px", fontWeight: 600,
                color: tab === t.key ? "var(--ln-gold)" : "var(--ln-iron)",
                borderBottom: tab === t.key ? "2px solid #C49A28" : "2px solid transparent",
              }}
            >
              <t.icon size={11} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#C3AB7D transparent", overscrollBehavior: "contain" }}>

          {/* NOW PLAYING TAB */}
          {tab === "playing" && (
            <div className="py-2">
              {/* Currently playing in this session */}
              {currentTrack && (
                <>
                  <div className="px-4 py-1.5">
                    <span className="text-[8px] font-heading tracking-[0.12em] uppercase" style={{ color: "var(--ln-iron)" }}>
                      Your Session
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all"
                    style={{ background: "rgba(196,154,40,0.04)" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(44,52,56,0.35)" }}
                    >
                      {currentTrack.artUrl
                        ? <img src={currentTrack.artUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                        : (
                          <div className="flex gap-0.5 items-end h-3.5">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="w-0.5 rounded-sm" style={{
                                background: "var(--ln-iron)",
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
                      <div className="text-[11px] font-semibold truncate" style={{ color: "var(--ln-parchment)" }}>{currentTrack.title}</div>
                      <div className="text-[10px] truncate" style={{ color: "var(--ln-iron)" }}>{currentTrack.artist}</div>
                    </div>
                    <div className="flex gap-0.5 items-end h-3" style={{ flexShrink: 0 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-0.5 rounded-sm" style={{
                          background: "var(--ln-iron)",
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
                  <div className="mx-4 my-1" style={{ height: "1px", background: "rgba(44,52,56,0.3)" }} />
                </>
              )}

              {/* Recent public tracks */}
              <div className="px-4 py-1.5">
                <span className="text-[8px] font-heading tracking-[0.12em] uppercase" style={{ color: "var(--ln-iron)" }}>
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
                  style={{ borderBottom: "1px solid rgba(44,52,56,0.15)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(44,52,56,0.6)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div
                    className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(44,52,56,0.3)" }}
                  >
                    {s.coverArtUrl
                      ? <img src={s.coverArtUrl} alt="" className="w-full h-full object-cover rounded-md" />
                      : <Music size={12} style={{ color: "var(--ln-iron)" }} />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{s.title}</div>
                    <div className="text-[9px] truncate" style={{ color: "var(--ln-iron)" }}>{c.name || c.artistHandle || "Unknown"}</div>
                  </div>
                </div>
                );
              })}
              {(!recentSongs || recentSongs.length === 0) && (
                <div className="px-4 py-6 text-center">
                  <Music size={20} style={{ color: "var(--ln-coal)", margin: "0 auto 8px" }} />
                  <div className="text-[11px]" style={{ color: "var(--ln-iron)" }}>No tracks yet</div>
                </div>
              )}
            </div>
          )}

          {/* TIPS TAB */}
          {tab === "tips" && (
            <div className="py-2">
              <div className="px-4 py-1.5">
                <span className="text-[8px] font-heading tracking-[0.12em] uppercase" style={{ color: "var(--ln-iron)" }}>
                  Recent Tips
                </span>
              </div>
              {tips && tips.length > 0 ? tips.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 px-4 py-2.5 transition-all"
                  style={{ borderBottom: "1px solid rgba(44,52,56,0.15)" }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)" }}
                  >
                    {(t.fanName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px]" style={{ color: "var(--ln-parchment)" }}>
                      <span style={{ color: "rgba(230,205,174,0.9)", fontWeight: 600 }}>@{t.fanName || "fan"}</span>
                      {" tipped "}
                      <span style={{ color: "var(--ln-parchment)", fontWeight: 500 }}>{t.creatorName}</span>
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--ln-iron)" }}>
                      {formatAmount(t.amountCents)} · "{t.songTitle}"
                    </div>
                    {t.createdAt && (
                      <div className="text-[9px] mt-0.5" style={{ color: "var(--ln-iron)" }}>
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
                  <Zap size={20} style={{ color: "var(--ln-coal)", margin: "0 auto 8px" }} />
                  <div className="text-[11px]" style={{ color: "var(--ln-iron)" }}>No tips yet today</div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--ln-coal)" }}>Be the first to support a creator</div>
                </div>
              )}
            </div>
          )}



        </div>
      </div>

      {/* Bar-bounce animation */}
      <style>{`
        @keyframes bar-bounce {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
