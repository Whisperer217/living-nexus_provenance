/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MainLayout
   Divine Noir: Sacred column sidebar + Quick-reference slider + Player altar
   Features: Hamburger menu, left QR slider, persistent audio player
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import PlayerBar from "@/components/player/PlayerBar";
import MobilePlayerPanel from "@/components/player/MobilePlayerPanel";
import TheaterPlayer from "@/components/player/TheaterPlayer";
import QuickRefSlider from "@/components/layout/QuickRefSlider";
import TipTicker from "@/components/TipTicker";
import {
  Home, Compass, Users, User, Upload, Library, BarChart2,
  Menu, X, ChevronRight, LogIn, LogOut, Heart, Star, ListMusic, BookOpen, Shield,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/", group: "Discover" },
  { label: "Explore", icon: Compass, path: "/explore", group: "Discover" },
  { label: "Listen Together", icon: Users, path: "/together", group: "Discover", badge: "LIVE" },
  { label: "Founding Creators", icon: Star, path: "/contributors", group: "Discover" },
  { label: "Manifesto", icon: BookOpen, path: "/manifesto", group: "Discover" },
  { label: "Creator License", icon: Shield, path: "/pricing", group: "Discover", badge: "$88.88" },
  { label: "My Profile", icon: User, path: "/profile", group: "My Music" },
  { label: "Upload", icon: Upload, path: "/upload", group: "My Music" },
  { label: "Batch Upload", icon: Upload, path: "/batch-upload", group: "My Music" },
  { label: "Archive", icon: Library, path: "/archive", group: "My Music" },
  { label: "Liked Songs", icon: Heart, path: "/liked", group: "My Music" },
  { label: "My Playlist", icon: ListMusic, path: "/playlist", group: "My Music" },
  { label: "Dashboard", icon: BarChart2, path: "/dashboard", group: "My Music" },
];

interface QuickRefPoint { label: string; path?: string; scrollTo?: string; }
const PAGE_SUMMARIES: Record<string, { title: string; points: QuickRefPoint[] }> = {
  "/": {
    title: "Home",
    points: [
      { label: "Featured tracks", path: "/", scrollTo: "section-featured" },
      { label: "Genre filters", path: "/", scrollTo: "section-genres" },
      { label: "Trending artists", path: "/", scrollTo: "section-trending" },
      { label: "New releases", path: "/", scrollTo: "section-new-releases" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/explore": {
    title: "Explore",
    points: [
      { label: "All genres", path: "/explore" },
      { label: "Search tracks", path: "/explore" },
      { label: "Discover artists", path: "/explore" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/together": {
    title: "Together",
    points: [
      { label: "Create a room", path: "/together" },
      { label: "Join by code", path: "/together" },
      { label: "Live chat", path: "/together" },
      { label: "Synced playback", path: "/together" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/profile": {
    title: "Profile",
    points: [
      { label: "Your tracks", path: "/profile" },
      { label: "Liked songs", path: "/liked" },
      { label: "Archive", path: "/archive" },
      { label: "Dashboard", path: "/dashboard" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/upload": {
    title: "Upload",
    points: [
      { label: "Audio + artwork", path: "/upload" },
      { label: "Track metadata", path: "/upload" },
      { label: "Witness ID provenance", path: "/upload" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/batch-upload": {
    title: "Batch Upload",
    points: [
      { label: "Upload full album", path: "/batch-upload" },
      { label: "One cover art", path: "/batch-upload" },
      { label: "Per-track WIDs", path: "/batch-upload" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/archive": {
    title: "Archive",
    points: [
      { label: "Your songs", path: "/archive" },
      { label: "Publish / unpublish", path: "/archive" },
      { label: "Status filter", path: "/archive" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/liked": {
    title: "Liked Songs",
    points: [
      { label: "Songs you loved", path: "/liked" },
      { label: "From other creators", path: "/explore" },
      { label: "Heart to save", path: "/liked" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/dashboard": {
    title: "Dashboard",
    points: [
      { label: "Song catalog", path: "/dashboard" },
      { label: "Tips earned", path: "/dashboard" },
      { label: "Enable tips", path: "/dashboard" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/contributors": {
    title: "Founding Creators",
    points: [
      { label: "Genesis Day", path: "/contributors" },
      { label: "March 20, 2026", path: "/contributors" },
      { label: "Five founders", path: "/contributors" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/manifesto": {
    title: "Manifesto",
    points: [
      { label: "Creator sovereignty", path: "/manifesto" },
      { label: "WID provenance", path: "/manifesto" },
      { label: "Anti-extraction", path: "/manifesto" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
  "/playlist": {
    title: "My Playlist",
    points: [
      { label: "Saved tracks", path: "/playlist" },
      { label: "Bookmark any song", path: "/playlist" },
      { label: "Play as queue", path: "/playlist" },
      { label: "🔐 Verify WID", path: "/verify" },
    ],
  },
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { state } = usePlayer();
  const { user, loading: authLoading, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      setMobileMenuOpen(false);
      navigate("/");
    }
  }, [logout, navigate]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  // One-panel rule: opening one panel closes the other
  const openMobileMenu = useCallback(() => {
    setQrOpen(false);
    setMobileMenuOpen(true);
  }, []);
  const toggleQr = useCallback(() => {
    if (!qrOpen) {
      setMobileMenuOpen(false);
    }
    setQrOpen(o => !o);
  }, [qrOpen]);

  const goTo = useCallback((path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  }, [navigate]);

  const groups = ["Discover", "My Music"];
  const pageSummary = PAGE_SUMMARIES[location] || PAGE_SUMMARIES["/"];

  return (
    <div className="noise-overlay flex flex-col h-screen overflow-hidden bg-[oklch(0.08_0.01_280)] relative">
      {/* ── Quick Reference Slider (left edge) ── */}
      <QuickRefSlider
        open={qrOpen}
        onToggle={toggleQr}
        summary={pageSummary}
        currentPath={location}
      />

      {/* ── Main shell ── */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── Sidebar (desktop) ── */}
        <aside
          className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
            border-r bg-[oklch(0.115_0.05_268)]
            ${sidebarOpen ? "w-[220px]" : "w-[64px]"}`}
          style={{ borderColor: "oklch(0.28 0.04 270 / 60%)" }}
        >
          {/* Logo */}
          <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.07] ${!sidebarOpen && "justify-center px-0"}`}>
            <div
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 cursor-pointer"
              onClick={() => setSidebarOpen(o => !o)}
            >
              <img src={LOGO_URL} alt="Living Nexus" className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <span
                className="font-display text-lg gold-shimmer cursor-pointer select-none"
                onClick={() => goTo("/")}
              >
                Living Nexus
              </span>
            )}
          </div>

          {/* Nav groups */}
          <nav className="flex-1 overflow-y-auto py-3">
            {groups.map(group => (
              <div key={group} className="mb-2">
                {sidebarOpen && (
                  <div className="px-4 py-1 text-[10px] font-heading tracking-[0.14em] uppercase text-white/25 mb-1">
                    {group}
                  </div>
                )}
                {NAV_ITEMS.filter(n => n.group === group).map(item => {
                  const Icon = item.icon;
                  const active = location === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] transition-all duration-150 rounded-none
                        ${sidebarOpen ? "" : "justify-center px-0"}
                        ${active
                          ? "text-[oklch(0.96_0.008_270)] border-r-2"
                          : "text-white/40 hover:text-[oklch(0.82_0.155_175)] hover:bg-[oklch(0.82_0.155_175/0.06)]"
                        }`}
                      style={active ? { background: "oklch(0.80 0.145 82 / 0.08)", borderColor: "oklch(0.80 0.145 82)" } : {}}
                    >
                      <Icon
                        size={15}
                        className="flex-shrink-0"
                        style={{ color: active ? "oklch(0.80 0.145 82)" : "inherit", opacity: active ? 1 : 0.6 }}
                      />
                      {sidebarOpen && (
                        <>
                          <span className="font-body flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={item.badge === "$88.88"
                                ? { background: "oklch(0.80 0.145 82 / 0.15)", color: "oklch(0.80 0.145 82)", border: "1px solid oklch(0.80 0.145 82 / 0.35)" }
                                : { background: "oklch(0.65 0.18 160 / 0.20)", color: "oklch(0.65 0.18 160)", border: "1px solid oklch(0.65 0.18 160 / 0.30)" }
                              }
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
                {sidebarOpen && <div className="gold-divider mx-4 my-2 opacity-30" />}
              </div>
            ))}
          </nav>

          {/* Profile footer / Login CTA */}
          <div className={`p-3 border-t border-white/[0.07] ${!sidebarOpen && "flex flex-col items-center gap-2"}`}>
            {!authLoading && !user ? (
              // Unauthenticated: show login CTA
              <a
                href={getLoginUrl()}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-all w-full ${!sidebarOpen ? "justify-center w-auto" : ""}`}
                style={{ background: "oklch(0.75 0.18 85 / 0.12)", border: "1px solid oklch(0.75 0.18 85 / 0.25)" }}
              >
                <LogIn size={16} style={{ color: "oklch(0.75 0.18 85)", flexShrink: 0 }} />
                {sidebarOpen && (
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[13px] font-medium" style={{ color: "oklch(0.85 0.1 85)" }}>Sign In</div>
                    <div className="text-[11px]" style={{ color: "oklch(0.6 0.04 280)" }}>Upload &amp; earn tips</div>
                  </div>
                )}
              </a>
            ) : (
              // Authenticated: show profile button + log out
              <>
                <button
                  onClick={() => goTo("/profile")}
                  className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-all w-full ${!sidebarOpen && "justify-center w-auto"}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
                  >
                    {user?.profilePhotoUrl
                      ? <img src={user.profilePhotoUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
                      : state.profileAvatar
                      ? <img src={state.profileAvatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
                      : (user?.name || state.profileName || "?").charAt(0).toUpperCase()
                    }
                  </div>
                  {sidebarOpen && (
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[13px] font-medium text-white/90 truncate">{user?.name || state.profileName || "Artist"}</div>
                      <div className="text-[11px] text-white/35">Artist</div>
                    </div>
                  )}
                </button>
                {/* Log Out — subtle utility button */}
                <button
                  onClick={handleLogout}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md w-full transition-all
                    text-white/30 hover:text-white/60 hover:bg-white/[0.04]
                    ${!sidebarOpen && "justify-center"}`}
                >
                  <LogOut size={13} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-[12px] font-body">Log Out</span>}
                </button>
              </>
            )}
          </div>
        </aside>

        {/* ── Mobile header ── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3
          bg-[oklch(0.11_0.012_280)] border-b border-white/[0.07]">
          <button
            onClick={() => mobileMenuOpen ? setMobileMenuOpen(false) : openMobileMenu()}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2 flex-1">
            <img src={LOGO_URL} alt="LN" className="w-7 h-7 object-contain" />
            <span className="font-display text-base gold-shimmer">Living Nexus</span>
          </div>
          <button
            onClick={toggleQr}
            className="p-2 rounded-lg text-white/40 hover:text-[#D4AF37] transition-all"
          >
            <ChevronRight size={16} className={`transition-transform ${qrOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* ── Mobile nav overlay ── */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="w-64 h-full bg-[oklch(0.11_0.012_280)] border-r border-white/[0.07] pt-16 overflow-y-auto"
              style={{ paddingBottom: "max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))" }}
              onClick={e => e.stopPropagation()}
            >
              {groups.map(group => (
                <div key={group} className="mb-2">
                  <div className="px-4 py-1 text-[10px] font-heading tracking-[0.14em] uppercase text-white/25 mb-1">{group}</div>
                  {NAV_ITEMS.filter(n => n.group === group).map(item => {
                    const Icon = item.icon;
                    const active = location === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => goTo(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-[14px] transition-all
                          ${active ? "bg-white/[0.06] text-white border-r-2 border-[#D4AF37]" : "text-white/50 hover:text-white hover:bg-white/[0.04]"}`}
                      >
                        <Icon size={16} className={active ? "text-[#D4AF37]" : "opacity-60"} />
                        <span className="font-body">{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 ml-auto">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              {/* Log Out — bottom of mobile nav, visible only when authenticated */}
              {user && (
                <div className="mt-2 px-4 border-t border-white/[0.07] pt-3">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-md w-full transition-all text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                  >
                    <LogOut size={14} className="flex-shrink-0" />
                    <span className="text-[13px] font-body">Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Page content ── */}
        <main className="flex-1 flex flex-col overflow-hidden md:pt-0 pt-14">
          {/* ── Live Tip Ticker — pinned just below the nav bar ── */}
          <TipTicker />
          {/*
            Desktop: paddingBottom reserves space for the fixed PlayerBar (64px) + safe-area.
            Mobile: MobilePlayerPanel is a side panel — no bottom padding needed.
          */}
          <style>{`@media (min-width: 768px) { .player-scroll-area { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; } }`}</style>
          <div className="flex-1 overflow-y-auto player-scroll-area">
            {children}
          </div>
        </main>
      </div>

      {/* ── Desktop Player Bar (fixed bottom, hidden on mobile) ── */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>

      {/* ── Mobile Player Panel (floating tab + right slide-out, hidden on desktop) ── */}
      <MobilePlayerPanel />

      {/* ── Theater Player — full-screen desktop overlay ── */}
      <TheaterPlayer />
    </div>
  );
}
