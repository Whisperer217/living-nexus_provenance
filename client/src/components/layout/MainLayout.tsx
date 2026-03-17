/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MainLayout
   Divine Noir: Sacred column sidebar + Quick-reference slider + Player altar
   Features: Hamburger menu, left QR slider, persistent audio player
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import PlayerBar from "@/components/player/PlayerBar";
import QuickRefSlider from "@/components/layout/QuickRefSlider";
import {
  Home, Compass, Users, User, Upload, Heart,
  Menu, X, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/", group: "Discover" },
  { label: "Explore", icon: Compass, path: "/explore", group: "Discover" },
  { label: "Listen Together", icon: Users, path: "/together", group: "Discover", badge: "LIVE" },
  { label: "My Profile", icon: User, path: "/profile", group: "My Music" },
  { label: "Upload", icon: Upload, path: "/upload", group: "My Music" },
  { label: "Liked Songs", icon: Heart, path: "/liked", group: "My Music" },
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
    points: ["Audio file", "Artwork / video", "Track metadata", "Publish"],
  },
  "/liked": {
    title: "Liked Songs",
    points: ["Saved tracks", "Quick play", "Heart to save", "Your collection"],
  },
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { state } = usePlayer();
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
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
              style={{ background: "linear-gradient(135deg, #E8C547, #7C3AED)" }}
              onClick={() => setSidebarOpen(o => !o)}
            >
              <span className="text-sm font-bold text-black">LN</span>
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
                          ? "bg-white/[0.06] text-[oklch(0.94_0.006_280)] border-r-2 border-[#E8C547]"
                          : "text-white/40 hover:bg-white/[0.04] hover:text-white/80"
                        }`}
                    >
                      <Icon
                        size={15}
                        className={`flex-shrink-0 ${active ? "text-[#E8C547]" : "opacity-60"}`}
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

          {/* Profile footer */}
          <div className={`p-3 border-t border-white/[0.07] ${!sidebarOpen && "flex justify-center"}`}>
            <button
              onClick={() => goTo("/profile")}
              className={`flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-all w-full ${!sidebarOpen && "justify-center w-auto"}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden"
                style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}
              >
                {state.profileAvatar
                  ? <img src={state.profileAvatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
                  : state.profileName.charAt(0)
                }
              </div>
              {sidebarOpen && (
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[13px] font-medium text-white/90 truncate">{state.profileName}</div>
                  <div className="text-[11px] text-white/35">Artist</div>
                </div>
              )}
            </button>
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
          <span className="font-display text-base gold-shimmer flex-1">Living Nexus</span>
          <button
            onClick={() => setQrOpen(o => !o)}
            className="p-2 rounded-lg text-white/40 hover:text-[#E8C547] transition-all"
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
                          ${active ? "bg-white/[0.06] text-white border-r-2 border-[#E8C547]" : "text-white/50 hover:text-white hover:bg-white/[0.04]"}`}
                      >
                        <Icon size={16} className={active ? "text-[#E8C547]" : "opacity-60"} />
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
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ── Player Bar (the altar) ── */}
      <PlayerBar />
    </div>
  );
}
