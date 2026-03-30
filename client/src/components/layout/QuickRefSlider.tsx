/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — QuickRefSlider (Phase 65 upgrade)
   - Glowing gold pulse tab trigger
   - Clickable nav points with navigate+scroll
   - Recent Tracks mini-feed (last 6 tracks, tap to play)
   - Log Out button at bottom (visible when logged in)
═══════════════════════════════════════════════════════════════════ */

import { ChevronRight, Play, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

interface QuickRefPoint {
  label: string;
  path?: string;
  scrollTo?: string;
}

interface Props {
  open: boolean;
  onToggle: () => void;
  summary: { title: string; points: QuickRefPoint[] | string[] };
  currentPath: string;
}

export default function QuickRefSlider({ open, onToggle, summary, currentPath }: Props) {
  const [, navigate] = useLocation();
  const { addAndPlay } = usePlayer();
  const { user, logout } = useAuth();

  // Fetch last 6 tracks for the mini-feed using the discover procedure
  const { data: recentTracksData } = trpc.songs.discover.useQuery(
    { limit: 6 },
    { staleTime: 60_000 }
  );
  const recentTracks = recentTracksData ?? [];

  const handlePointClick = (point: QuickRefPoint | string) => {
    const p = typeof point === "string" ? { label: point } : point;
    onToggle();

    const doScroll = () => {
      if (p.scrollTo) {
        const el = document.getElementById(p.scrollTo);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    if (p.path && p.path !== currentPath) {
      navigate(p.path);
      setTimeout(doScroll, 350);
    } else {
      doScroll();
    }
  };

  const handleTrackClick = (track: { song: { id: number; title: string; fileUrl: string | null; coverArtUrl: string | null; witnessId: string | null }; creator: { id: number; name: string | null; artistHandle: string | null } | null }) => {
    onToggle();
    addAndPlay({
      id: String(track.song.id),
      title: track.song.title,
      artist: track.creator?.name ?? track.creator?.artistHandle ?? "Unknown",
      artUrl: track.song.coverArtUrl ?? undefined,
      artType: "image",
      audioUrl: track.song.fileUrl ?? undefined,
      witnessId: track.song.witnessId ?? undefined,
      genre: "",
      bg: "oklch(0.185 0.06 270)",
      emoji: "🎵",
    });
  };

  const handleLogout = async () => {
    onToggle();
    await logout();
    navigate("/");
  };

  return (
    <>
      {/* ── Glowing gold pulse tab trigger ── */}
      <button
        onClick={onToggle}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center
          w-5 h-16 rounded-r-lg transition-all duration-300
          border border-l-0
          qr-tab-glow
          ${open ? "translate-x-[180px]" : "translate-x-0"}`}
        style={{
          background: "oklch(0.14 0.013 280)",
          borderColor: "oklch(0.80 0.145 82 / 0.4)",
        }}
        title="Quick Reference"
      >
        <ChevronRight
          size={12}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ color: "oklch(0.80 0.145 82)" }}
        />
      </button>

      {/* ── Panel ── */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-20 flex flex-col
          w-[180px] border-r border-white/[0.07]
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "oklch(0.11 0.012 280)" }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-white/[0.07]">
          <div className="text-[9px] font-heading tracking-[0.18em] uppercase mb-1"
            style={{ color: "oklch(0.96 0.008 270 / 0.25)" }}>
            Quick Reference
          </div>
          <div className="text-[13px] font-heading" style={{ color: "oklch(0.80 0.145 82)" }}>
            {summary.title}
          </div>
        </div>

        {/* Nav points */}
        <div className="overflow-y-auto flex-shrink-0 px-4 py-4 space-y-1" style={{ maxHeight: "160px" }}>
          {summary.points.map((point, i) => {
            const p = typeof point === "string" ? { label: point } : point;
            const isLink = !!(p.path || p.scrollTo);
            return (
              <button
                key={i}
                onClick={() => handlePointClick(point)}
                className={`w-full flex items-start gap-2 text-left rounded-md px-2 py-1.5 transition-all
                  ${isLink
                    ? "hover:bg-white/[0.05] cursor-pointer group"
                    : "cursor-default"
                  }`}
              >
                <div className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 transition-colors
                  ${isLink ? "group-hover:bg-[oklch(0.80_0.145_82)]" : ""}`}
                  style={{ background: "oklch(0.80 0.145 82 / 0.4)" }}
                />
                <span className={`text-[12px] font-body leading-relaxed transition-colors
                  ${isLink
                    ? "group-hover:text-[oklch(0.80_0.145_82)]"
                    : ""}`}
                  style={{ color: "oklch(0.96 0.008 270 / 0.5)" }}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recent Tracks mini-feed */}
        {recentTracks.length > 0 && (
          <div className="px-4 py-3 border-t border-white/[0.07] flex-1 min-h-0 flex flex-col">
            <p className="text-[9px] font-heading tracking-[0.15em] uppercase mb-2"
              style={{ color: "oklch(0.80 0.145 82)" }}>
              Recent Tracks
            </p>
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: "160px" }}>
              {recentTracks.slice(0, 6).map((track: any) => (
                <button
                  key={track.song.id}
                  onClick={() => handleTrackClick(track)}
                  className="w-full flex items-center gap-2 rounded-lg p-1.5 transition-colors group"
                  style={{ background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "oklch(0.96 0.008 270 / 0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {track.song.coverArtUrl ? (
                    <img
                      src={track.song.coverArtUrl}
                      alt={track.song.title}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                      style={{ objectPosition: `${(track.song as any).coverPositionX ?? 50}% ${(track.song as any).coverPositionY ?? 50}%` }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-sm"
                      style={{ background: "oklch(0.185 0.06 270)" }}>
                      🎵
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[11px] truncate transition-colors group-hover:text-[oklch(0.80_0.145_82)]"
                      style={{ color: "oklch(0.96 0.008 270)" }}>
                      {track.song.title}
                    </p>
                    <p className="text-[10px] truncate"
                      style={{ color: "oklch(0.68 0.02 280)" }}>
                      {track.creator?.name ?? track.creator?.artistHandle ?? "Unknown"}
                    </p>
                  </div>
                  <Play size={10} className="flex-shrink-0 transition-colors group-hover:text-[oklch(0.80_0.145_82)]"
                    style={{ color: "oklch(0.68 0.02 280)" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Log Out — visible only when logged in */}
        {user && (
          <div className="px-4 py-3 border-t border-white/[0.07] mt-auto">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 text-left transition-colors rounded-md px-2 py-1.5"
              style={{ color: "oklch(0.68 0.02 280)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.96 0.008 270)")}
              onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.68 0.02 280)")}
            >
              <LogOut size={12} />
              <span className="text-[12px] font-body">Log Out</span>
            </button>
          </div>
        )}

        {/* Footer */}
        {!user && (
          <div className="px-4 py-4 border-t border-white/[0.07] mt-auto">
            <div className="text-[9px] font-heading tracking-[0.12em] uppercase text-center"
              style={{ color: "oklch(0.96 0.008 270 / 0.15)" }}>
              Living Nexus
            </div>
          </div>
        )}
      </div>

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
