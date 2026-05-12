/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TopBar (Phase 136: Integrated WSP)
   Layout: [Search] [← Player Center →] [CTAs + Bell + Avatar]
   The WSP Surface Mode is embedded directly in the navbar center zone.
   Mobile: not rendered (MainLayout handles mobile separately).
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import { useWSP } from "@/contexts/WSPContext";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { useLightsMode } from "@/contexts/LightsModeContext";
import {
  Upload, Bell, LogIn, LogOut, CheckCircle2, Zap, Search, User, Settings,
  SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, PictureInPicture2,
  ChevronDown,
} from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";

interface TopBarProps {
  archiveSongCount: number;
  unreadCount: number;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ── Inline Player (center zone) ── */
function InlinePlayer() {
  const { state, togglePlay, seek, nextTrack, prevTrack } = usePlayer();
  const { expand } = useWSP();
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const track = state.tracks[state.currentIdx];
  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeekClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seek(state.duration * ratio);
  }, [seek, state.duration]);

  if (!track) {
    // Empty state — subtle placeholder
    return (
      <div className="flex-1 flex items-center justify-center gap-3 px-6 min-w-0 max-w-[640px] mx-auto">
        <div className="flex items-center gap-2 opacity-20">
          <div className="w-8 h-8 rounded" style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.15)" }} />
          <div>
            <div className="h-2 w-24 rounded" style={{ background: "rgba(255,255,255,0.12)" }} />
            <div className="h-1.5 w-16 rounded mt-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-2 px-4 min-w-0 max-w-[700px] mx-auto">
      {/* Artwork — tap to expand */}
      <button
        onClick={expand}
        className="shrink-0 rounded overflow-hidden transition-transform hover:scale-105"
        style={{ width: 36, height: 36, background: "rgba(255,215,0,0.08)" }}
        aria-label="Expand player"
      >
        {track.artUrl ? (
          <img
            src={track.artUrl}
            alt={track.title}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${track.coverPositionX ?? 50}% ${track.coverPositionY ?? 50}%` }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base">
            {track.emoji || "🎵"}
          </div>
        )}
      </button>

      {/* Title + Artist — tap to expand */}
      <button
        onClick={expand}
        className="flex flex-col text-left shrink-0 min-w-0"
        style={{ width: 140 }}
        aria-label="Expand player"
      >
        <span
          className="truncate text-xs font-medium leading-tight"
          style={{ color: "rgba(255,255,255,0.90)", maxWidth: 140 }}
        >
          {track.title}
        </span>
        <span
          className="truncate text-[10px] leading-tight mt-0.5"
          style={{ color: "rgba(255,215,0,0.65)", maxWidth: 140 }}
        >
          {track.artist}
        </span>
      </button>

      {/* Time + Seek bar + Time */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 tabular-nums"
          style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}
        >
          {fmtTime(state.currentTime)}
        </span>
        <div
          ref={seekBarRef}
          className="flex-1 relative cursor-pointer group"
          style={{ height: 16, display: "flex", alignItems: "center" }}
          onClick={handleSeekClick}
        >
          {/* Track */}
          <div
            className="w-full rounded-full"
            style={{ height: 3, background: "rgba(255,255,255,0.10)" }}
          >
            {/* Fill */}
            <div
              className="rounded-full transition-all"
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, rgba(255,215,0,0.9), rgba(255,165,0,0.7))",
                transition: "width 0.25s linear",
              }}
            />
          </div>
          {/* Thumb — visible on hover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `${progress}%`,
              transform: `translateX(-50%) translateY(-50%)`,
              background: "#C49A28",
              boxShadow: "0 0 6px rgba(196,154,40,0.5)",
            }}
          />
        </div>
        <span
          className="shrink-0 tabular-nums"
          style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace" }}
        >
          {fmtTime(state.duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Shuffle */}
        <button
          onClick={() => setShuffle(s => !s)}
          className="p-1.5 rounded transition-all"
          style={{ color: shuffle ? "rgba(255,215,0,0.8)" : "rgba(255,255,255,0.3)" }}
          aria-label="Shuffle"
          title="Shuffle"
        >
          <Shuffle size={13} />
        </button>
        {/* Prev */}
        <button
          onClick={() => prevTrack()}
          className="p-1.5 rounded transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.55)" }}
          aria-label="Previous"
        >
          <SkipBack size={15} />
        </button>
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="flex items-center justify-center rounded-full mx-1 transition-all hover:scale-105"
          style={{
            width: 34,
            height: 34,
            background: "rgba(255,215,0,0.18)",
            border: "1px solid rgba(255,215,0,0.35)",
            color: "rgba(255,215,0,0.95)",
          }}
          aria-label={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying
            ? <Pause size={14} fill="currentColor" />
            : <Play size={14} fill="currentColor" />
          }
        </button>
        {/* Next */}
        <button
          onClick={() => nextTrack()}
          className="p-1.5 rounded transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.55)" }}
          aria-label="Next"
        >
          <SkipForward size={15} />
        </button>
        {/* Repeat */}
        <button
          onClick={() => setRepeat(r => !r)}
          className="p-1.5 rounded transition-all"
          style={{ color: repeat ? "rgba(255,215,0,0.8)" : "rgba(255,255,255,0.3)" }}
          aria-label="Repeat"
          title="Repeat"
        >
          <Repeat size={13} />
        </button>
        {/* PiP / Expand */}
        <button
          onClick={expand}
          className="p-1.5 rounded transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.3)" }}
          aria-label="Expand player"
          title="Expand player"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}

export default function TopBar({ archiveSongCount: _archiveSongCount, unreadCount }: TopBarProps) {
  const [location, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [avatarMenuOpen]);

  const { state } = usePlayer();
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const goTo = useCallback(
    (path: string) => { navigate(path); },
    [navigate]
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      goTo(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, goTo]);

  const displayName = user?.name || state.profileName || "Creator";
  const avatar = user?.profilePhotoUrl || state.profileAvatar;
  const hasWid = user?.licenseStatus === "licensed";
  const userId = (user as any)?.id;

  const { mode: lightsMode } = useLightsMode();
  const isWarm = lightsMode === "on";

  const NAV_BG = isWarm ? "rgba(55,68,85,0.72)" : "rgba(10,8,6,0.97)";
  const NAV_BORDER = isWarm ? "rgba(100,125,150,0.22)" : "rgba(196,154,40,0.22)";

  return (
    <div className="hidden md:block">
      {/* ── Integrated TopBar + Player ─────────────────────────────── */}
      <header
        className="fixed top-0 z-[400] flex items-center"
        style={{
          left: 72,
          right: 0,
          height: "56px",
          background: NAV_BG,
          borderBottom: `1px solid ${NAV_BORDER}`,
          backdropFilter: isWarm ? "blur(32px) saturate(0.7)" : "blur(16px)",
          transition: "background 0.4s ease, border-color 0.4s ease",
        }}
      >
        {/* LEFT: Search bar */}
        <form
          onSubmit={handleSearch}
          className="flex items-center px-4 shrink-0"
          style={{ width: 260 }}
        >
          <div
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: searchFocused
                ? "rgba(196,154,40,0.08)"
                : "rgba(255,255,255,0.04)",
              border: searchFocused
                ? "1px solid rgba(196,154,40,0.30)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Search size={13} style={{ color: searchFocused ? "var(--ln-gold)" : "rgba(255,255,255,0.3)", flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search works, creators, WIDs…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent outline-none text-white/80 placeholder:text-white/25"
              style={{ fontSize: "12px", fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </form>

        {/* CENTER: Inline Player */}
        <InlinePlayer />

        {/* RIGHT: CTAs + Bell + Avatar */}
        <div
          className="flex items-center gap-2 px-4 shrink-0"
          style={{
            borderLeft: "1px solid rgba(46,43,34,0.80)",
            height: "100%",
          }}
        >
          {/* Prompt Generator */}
          {user && userId && (
            <button
              onClick={() => goTo(`/creator/${userId}?openPromptStudio=1`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
              style={{
                fontSize: "11px",
                fontFamily: "'Cinzel', serif",
                fontWeight: 500,
                letterSpacing: "0.05em",
                background: "transparent",
                border: "1px solid rgba(196,154,40,0.2)",
                color: "var(--ln-gold)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = "var(--ln-parchment)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.4)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = "var(--ln-gold)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.2)";
              }}
            >
              <Zap size={12} style={{ color: "var(--ln-gold-dim)" }} />
              <span>Prompt Gen</span>
            </button>
          )}

          {/* Register Work */}
          <button
            onClick={() => goTo("/upload")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              background: "#C49A28",
              color: "#0A0806",
              border: "none",
              borderRadius: "2px",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#E8B840"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#C49A28"; }}
          >
            <Upload size={12} />
            <span>Register Work</span>
          </button>

          {/* Notification bell */}
          {user && (
            <button
              onClick={() => goTo("/notifications")}
              className="relative flex items-center justify-center rounded-lg transition-all"
              style={{ color: "#6B6555", minWidth: 40, minHeight: 40, padding: "0 8px" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--ln-gold)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B6555"; }}
              title="Notifications"
            >
              <Bell size={17} />
              {(unreadCount as number) > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--ln-ember)" }}
                />
              )}
            </button>
          )}

          {/* Avatar / Sign In */}
          {!authLoading && user ? (
            <div ref={avatarMenuRef} className="relative flex-shrink-0">
              <button
                onClick={() => setAvatarMenuOpen(prev => !prev)}
                className="relative flex-shrink-0"
                title={displayName}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #1C1A14, #3D3A2E)",
                    boxShadow: hasWid
                      ? "0 0 0 2px #C49A28, 0 0 10px rgba(196,154,40,0.25)"
                      : avatarMenuOpen
                      ? "0 0 0 2px rgba(196,154,40,0.5)"
                      : "none",
                  }}
                >
                  {avatar
                    ? <img
                        src={avatar}
                        alt="avatar"
                        className="w-full h-full object-cover rounded-full"
                        style={{ objectPosition: user?.avatarObjectPosition ?? "50% 50%" }}
                      />
                    : displayName.charAt(0).toUpperCase()
                  }
                </div>
                {hasWid && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{ background: "#C49A28" }}
                  >
                    <CheckCircle2 size={8} className="text-black" />
                  </div>
                )}
              </button>

              {/* Avatar dropdown */}
              {avatarMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 min-w-[160px] rounded-xl overflow-hidden shadow-2xl py-1 z-[500]"
                  style={{ background: "#1A1710", border: "1px solid rgba(196,154,40,0.25)" }}
                >
                  <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(196,154,40,0.12)" }}>
                    <p className="text-[11px] font-semibold truncate" style={{ color: "var(--ln-parchment)" }}>{displayName}</p>
                  </div>
                  <button
                    onClick={() => { setAvatarMenuOpen(false); goTo("/profile"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                    style={{ color: "var(--ln-parchment)" }}
                  >
                    <User size={13} style={{ opacity: 0.6 }} /> Profile
                  </button>
                  <button
                    onClick={() => { setAvatarMenuOpen(false); goTo("/settings"); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
                    style={{ color: "var(--ln-parchment)" }}
                  >
                    <Settings size={13} style={{ opacity: 0.6 }} /> Settings
                  </button>
                  <div className="my-1 border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }} />
                  <button
                    onClick={() => { setAvatarMenuOpen(false); logout().finally(() => navigate("/")); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-500/10 transition-colors text-left"
                    style={{ color: "var(--ln-ember, #e05a2b)" }}
                  >
                    <LogOut size={13} /> Log Out
                  </button>
                </div>
              )}
            </div>
          ) : !authLoading ? (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                background: "rgba(196,154,40,0.08)",
                border: "1px solid rgba(196,154,40,0.20)",
                color: "#C9C0A8",
              }}
            >
              <LogIn size={12} />
              <span>Sign In</span>
            </a>
          ) : null}
        </div>
      </header>

      {/* What's New Modal */}
      {whatsNewOpen && (
        <WhatsNewModal forceOpen={true} onClose={() => setWhatsNewOpen(false)} />
      )}
    </div>
  );
}
