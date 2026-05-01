/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TopBar (Phase 108: AppShell v1.0)
   Stripped to essentials: Logo + Search + Prompt Gen + Register Work
   + Notifications bell + Profile avatar.
   Navigation is now handled by LeftRail (72px icon-only mode switcher).
   Mobile: not rendered (MainLayout handles mobile separately).
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { useLightsMode } from "@/contexts/LightsModeContext";
import {
  Upload, Bell, LogIn, CheckCircle2, Zap, Search,
} from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

interface TopBarProps {
  archiveSongCount: number;
  unreadCount: number;
}

export default function TopBar({ archiveSongCount: _archiveSongCount, unreadCount }: TopBarProps) {
  const [location, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
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
      goTo(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [searchQuery, goTo]);

  const displayName = user?.name || state.profileName || "Creator";
  const avatar = user?.profilePhotoUrl || state.profileAvatar;
  const hasWid = user?.licenseStatus === "licensed";
  const userId = (user as any)?.id;

  const { mode: lightsMode } = useLightsMode();
  const isWarm = lightsMode === "on";

  // LN Identity Palette — coal background, gold accent hierarchy
  const NAV_BG = isWarm ? "rgba(55,68,85,0.72)" : "rgba(10,8,6,0.97)";
  const NAV_BORDER = isWarm ? "rgba(100,125,150,0.22)" : "rgba(196,154,40,0.22)";

  return (
    <div className="hidden md:block">
      {/* ── Slim top bar ─────────────────────────────────────────── */}
      <header
        className="fixed top-0 z-50 flex items-center gap-0"
        style={{
          left: 72,   /* LeftRail width */
          right: 0,
          height: "52px",
          background: NAV_BG,
          borderBottom: `1px solid ${NAV_BORDER}`,
          backdropFilter: isWarm ? "blur(32px) saturate(0.7)" : "blur(16px)",
          transition: "background 0.4s ease, border-color 0.4s ease",
        }}
      >
        {/* Search bar — flex-1, centered */}
        <form
          onSubmit={handleSearch}
          className="flex items-center flex-1 px-4"
        >
          <div
            className="flex items-center gap-2 flex-1 max-w-[480px] px-3 py-1.5 rounded-lg transition-all"
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
              style={{
                fontSize: "12px",
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>
        </form>

        {/* Right zone — CTAs + notifications + profile */}
        <div
          className="flex items-center gap-2 px-4 flex-shrink-0"
          style={{
            borderLeft: "1px solid rgba(46,43,34,0.80)",
            height: "100%",
            paddingLeft: "16px",
          }}
        >
          {/* Prompt Generator quick button */}
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

          {/* Register Work — gold CTA */}
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
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#E8B840";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "#C49A28";
            }}
          >
            <Upload size={12} />
            <span>Register Work</span>
          </button>

          {/* Notification bell */}
          {user && (
            <button
              onClick={() => goTo("/notifications")}
              className="relative flex items-center justify-center rounded-lg transition-all"
              style={{ color: "#6B6555", minWidth: 44, minHeight: 44, padding: "0 10px" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--ln-gold)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B6555"; }}
              title="Notifications"
            >
              <Bell size={18} />
              {(unreadCount as number) > 0 && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "var(--ln-ember)" }}
                />
              )}
            </button>
          )}

          {/* Avatar / Sign In */}
          {!authLoading && user ? (
            <button
              onClick={() => goTo("/profile")}
              className="relative flex-shrink-0"
              title={displayName}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #1C1A14, #3D3A2E)",
                  boxShadow: hasWid
                    ? "0 0 0 2px #C49A28, 0 0 10px rgba(196,154,40,0.25)"
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
