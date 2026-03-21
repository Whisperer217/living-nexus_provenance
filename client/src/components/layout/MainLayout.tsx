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
import QuickRefSlider from "@/components/layout/QuickRefSlider";
import TipTicker from "@/components/TipTicker";
import {
  Home, Compass, Users, User, Upload, Library, BarChart2,
  Menu, X, ChevronRight, LogIn, Heart, Star,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/", group: "Discover" },
  { label: "Explore", icon: Compass, path: "/explore", group: "Discover" },
  { label: "Listen Together", icon: Users, path: "/together", group: "Discover", badge: "LIVE" },
  { label: "Founding Creators", icon: Star, path: "/contributors", group: "Discover" },
  { label: "My Profile", icon: User, path: "/profile", group: "My Music" },
  { label: "Upload", icon: Upload, path: "/upload", group: "My Music" },
  { label: "Batch Upload", icon: Upload, path: "/batch-upload", group: "My Music" },
  { label: "Archive", icon: Library, path: "/archive", group: "My Music" },
  { label: "Liked Songs", icon: Heart, path: "/liked", group: "My Music" },
  { label: "Dashboard", icon: BarChart2, path: "/dashboard", group: "My Music" },
];

const PAGE_SUMMARIES: Record<string, { title: string; points: string[] }> = {
  "/": {
    title: "Home",
    points: ["Featured tracks", "Genre filters", "Trending artists", "New releases"],
  },
  "/explore": {
    title: "Explore",
    points: ["All genres", "Search tracks", "Discover artists", "Charts"],
  },
  "/together": {
    title: "Together",
    points: ["Create a room", "Join by code", "Live chat", "Synced playback"],
  },
  "/profile": {
    title: "Profile",
    points: ["Your tracks", "Liked songs", "Activity feed", "Tips earned"],
  },
  "/upload": {
    title: "Upload",
    points: ["Audio + artwork", "Track metadata", "Witness ID provenance", "Publish"],
  },
  "/batch-upload": {
    title: "Batch Upload",
    points: ["Upload full album", "One cover art", "Per-track WIDs", "Grouped on profile"],
  },
  "/archive": {
    title: "Archive",
    points: ["Your songs", "Publish / unpublish", "Status filter", "Track management"],
  },
  "/liked": {
    title: "Liked Songs",
    points: ["Songs you loved", "From other creators", "Heart to save", "Your personal playlist"],
  },
  "/dashboard": {
    title: "Dashboard",
    points: ["Song catalog", "Tips earned", "Enable tips", "License status"],
  },
  "/contributors": {
    title: "Founding Creators",
    points: ["Genesis Day", "March 20, 2026", "Five founders", "Witness ID pioneers"],
  },
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { state } = usePlayer();
  const { user, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

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
        onToggle={() => setQrOpen(o => !o)}
        summary={pageSummary}
        currentPath={location}
      />

      {/* ── Main shell ── */}
      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── Sidebar (desktop) ── */}
        <aside
          className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
            border-r border-white/[0.07] bg-[oklch(0.11_0.012_280)]
            ${sidebarOpen ? "w-[220px]" : "w-[64px]"}`}
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
                          ? "bg-white/[0.06] text-[oklch(0.94_0.006_280)] border-r-2 border-[#D4AF37]"
                          : "text-white/40 hover:bg-white/[0.04] hover:text-white/80"
                        }`}
                    >
                      <Icon
                        size={15}
                        className={`flex-shrink-0 ${active ? "text-[#D4AF37]" : "opacity-60"}`}
                      />
                      {sidebarOpen && (
                        <>
                          <span className="font-body flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[oklch(0.65_0.18_160)/20] text-[oklch(0.65_0.18_160)] border border-[oklch(0.65_0.18_160)/30]">
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
          <div className={`p-3 border-t border-white/[0.07] ${!sidebarOpen && "flex justify-center"}`}>
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
              // Authenticated: show profile button
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
            )}
          </div>
        </aside>

        {/* ── Mobile header ── */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3
          bg-[oklch(0.11_0.012_280)] border-b border-white/[0.07]">
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2 flex-1">
            <img src={LOGO_URL} alt="LN" className="w-7 h-7 object-contain" />
            <span className="font-display text-base gold-shimmer">Living Nexus</span>
          </div>
          <button
            onClick={() => setQrOpen(o => !o)}
            className="p-2 rounded-lg text-white/40 hover:text-[#D4AF37] transition-all"
          >
            <ChevronRight size={16} className={`transition-transform ${qrOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* ── Mobile nav overlay ── */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="w-64 h-full bg-[oklch(0.11_0.012_280)] border-r border-white/[0.07] pt-16"
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
            </div>
          </div>
        )}

        {/* ── Page content ── */}
        <main className="flex-1 flex flex-col overflow-hidden md:pt-0 pt-14">
          {/* ── Live Tip Ticker ── */}
          <TipTicker />
          {/*
            Desktop: paddingBottom reserves space for the fixed PlayerBar (64px) + safe-area.
            Mobile: MobilePlayerPanel is a side panel — no bottom space needed.
          */}
          {/* Desktop: padding-bottom reserves space for fixed PlayerBar. Mobile: no bottom padding needed (side panel). */}
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
    </div>
  );
}
