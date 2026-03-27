/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MainLayout v2
   Sovereign Identity Command Center
   Identity-first sidebar: avatar → WID status → grouped command sections
   Groups: DISCOVER / MY COMMAND / SYSTEM / ACCOUNT
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
  Menu, X, ChevronRight, LogIn, LogOut, Heart, Star, ListMusic,
  BookOpen, Shield, Fingerprint, ScrollText, CheckCircle2,
  PenLine, Layers, Bell, BookMarked,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

// ── Nav structure ──────────────────────────────────────────────────
const NAV_ITEMS = [
  // DISCOVER — public-facing
  { label: "Home",             icon: Home,        path: "/",            group: "DISCOVER" },
  { label: "Explore",          icon: Compass,     path: "/explore",     group: "DISCOVER" },
  { label: "Listen Together",  icon: Users,       path: "/together",    group: "DISCOVER", badge: "LIVE" },
  { label: "Founding Creators",icon: Star,        path: "/contributors",group: "DISCOVER" },
  { label: "Manifesto",        icon: BookOpen,    path: "/manifesto",   group: "DISCOVER" },
  { label: "Creator License",  icon: Shield,      path: "/pricing",     group: "DISCOVER", badge: "$88.88" },

  // MY COMMAND — identity + provenance
  { label: "My Profile",       icon: User,        path: "/profile",     group: "MY COMMAND" },
  { label: "Dashboard",        icon: BarChart2,   path: "/dashboard",   group: "MY COMMAND" },
  { label: "LNA",              icon: Layers,      path: "/archive",     group: "MY COMMAND", tooltip: "Living Nexus Archive" },
  { label: "My Works",         icon: ListMusic,   path: "/playlist",    group: "MY COMMAND" },
  { label: "Liked Songs",      icon: Heart,       path: "/liked",       group: "MY COMMAND" },
  { label: "Field Notes",      icon: PenLine,     path: "/field-notes", group: "MY COMMAND" },

  // SYSTEM — tools + provenance
  { label: "Verify WID",       icon: Fingerprint, path: "/verify",      group: "SYSTEM" },
  { label: "Upload",           icon: Upload,      path: "/upload",      group: "SYSTEM" },
  { label: "Batch Upload",     icon: Upload,      path: "/batch-upload",group: "SYSTEM" },
  { label: "Witness Records",  icon: ScrollText,  path: "/archive",     group: "SYSTEM" },
  { label: "WID Specification", icon: CheckCircle2, path: "/doctrine/wid-spec", group: "SYSTEM" },
  { label: "Lexicon",            icon: BookMarked,  path: "/lexicon",             group: "SYSTEM" },
];

const GROUPS = ["DISCOVER", "MY COMMAND", "SYSTEM"];

// ── Quick-ref summaries ────────────────────────────────────────────
interface QuickRefPoint { label: string; path?: string; scrollTo?: string; }
const PAGE_SUMMARIES: Record<string, { title: string; points: QuickRefPoint[] }> = {
  "/": { title: "Home", points: [
    { label: "Featured tracks", scrollTo: "section-featured" },
    { label: "Genre filters", scrollTo: "section-genres" },
    { label: "Trending artists", scrollTo: "section-trending" },
    { label: "New releases", scrollTo: "section-new-releases" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/explore": { title: "Explore", points: [
    { label: "All genres", path: "/explore" },
    { label: "Search tracks", path: "/explore" },
    { label: "Discover artists", path: "/explore" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/together": { title: "Listen Together", points: [
    { label: "Create a room", path: "/together" },
    { label: "Join by code", path: "/together" },
    { label: "Live chat", path: "/together" },
    { label: "Synced playback", path: "/together" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/profile": { title: "My Profile", points: [
    { label: "Your tracks", path: "/profile" },
    { label: "Activity feed", path: "/profile" },
    { label: "Snapshot stats", path: "/profile" },
    { label: "Featured works", path: "/profile" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/dashboard": { title: "Dashboard", points: [
    { label: "Song catalog", path: "/dashboard" },
    { label: "Tips earned", path: "/dashboard" },
    { label: "Enable tips", path: "/dashboard" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/archive": { title: "LNA", points: [
    { label: "Your songs", path: "/archive" },
    { label: "Publish / unpublish", path: "/archive" },
    { label: "Status filter", path: "/archive" },
    { label: "Version history", path: "/archive" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/upload": { title: "Upload", points: [
    { label: "Audio + artwork", path: "/upload" },
    { label: "Track metadata", path: "/upload" },
    { label: "Witness ID provenance", path: "/upload" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/batch-upload": { title: "Batch Upload", points: [
    { label: "Upload full album", path: "/batch-upload" },
    { label: "One cover art", path: "/batch-upload" },
    { label: "Per-track WIDs", path: "/batch-upload" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/liked": { title: "Liked Songs", points: [
    { label: "Songs you loved", path: "/liked" },
    { label: "From other creators", path: "/explore" },
    { label: "Heart to save", path: "/liked" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/playlist": { title: "My Works", points: [
    { label: "Saved tracks", path: "/playlist" },
    { label: "Bookmark any song", path: "/playlist" },
    { label: "Play as queue", path: "/playlist" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/field-notes": { title: "Field Notes", points: [
    { label: "Doctrine entries", path: "/field-notes" },
    { label: "Videos & concepts", path: "/field-notes" },
    { label: "System philosophy", path: "/field-notes" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/contributors": { title: "Founding Creators", points: [
    { label: "Genesis Day", path: "/contributors" },
    { label: "March 20, 2026", path: "/contributors" },
    { label: "Five founders", path: "/contributors" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/manifesto": { title: "Manifesto", points: [
    { label: "Creator sovereignty", path: "/manifesto" },
    { label: "WID provenance", path: "/manifesto" },
    { label: "Anti-extraction", path: "/manifesto" },
    { label: "🔐 Verify WID", path: "/verify" },
  ]},
  "/verify": { title: "Verify WID", points: [
    { label: "Enter a WID", path: "/verify" },
    { label: "Check provenance", path: "/verify" },
    { label: "View creator record", path: "/verify" },
  ]},
};

// ── Identity header (shared desktop + mobile) ─────────────────────
function IdentityHeader({
  user, profileAvatar, profileName, sidebarOpen, onProfileClick,
}: {
  user: { name?: string | null; profilePhotoUrl?: string | null; licenseStatus?: string | null } | null;
  profileAvatar?: string;
  profileName?: string;
  sidebarOpen: boolean;
  onProfileClick: () => void;
}) {
  const displayName = user?.name || profileName || "Creator";
  const avatar = user?.profilePhotoUrl || profileAvatar;
  const hasWid = user?.licenseStatus === "licensed";

  if (!user) return null;

  return (
    <button
      onClick={onProfileClick}
      className={`w-full text-left transition-all rounded-xl p-3 hover:bg-white/[0.05] group
        ${sidebarOpen ? "flex items-center gap-3" : "flex flex-col items-center gap-1.5"}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
            boxShadow: hasWid ? "0 0 0 2px #D4AF37, 0 0 12px oklch(0.80 0.145 82 / 0.35)" : "none",
          }}
        >
          {avatar
            ? <img src={avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
            : displayName.charAt(0).toUpperCase()
          }
        </div>
        {/* WID verified badge */}
        {hasWid && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "#D4AF37" }}
            title="Witness ID Verified"
          >
            <CheckCircle2 size={10} className="text-black" />
          </div>
        )}
      </div>

      {sidebarOpen && (
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-white/90 truncate leading-tight">{displayName}</div>
          {hasWid ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Fingerprint size={9} style={{ color: "#D4AF37" }} />
              <span className="text-[10px] font-heading tracking-wider" style={{ color: "#D4AF37" }}>
                WITNESSED
              </span>
            </div>
          ) : (
            <div className="text-[10px] text-white/30 font-body mt-0.5">Creator</div>
          )}
        </div>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────
export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { state } = usePlayer();
  const { user, loading: authLoading, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    try { await logout(); } finally {
      setMobileMenuOpen(false);
      navigate("/");
    }
  }, [logout, navigate]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const openMobileMenu = useCallback(() => { setQrOpen(false); setMobileMenuOpen(true); }, []);
  const toggleQr = useCallback(() => {
    if (!qrOpen) setMobileMenuOpen(false);
    setQrOpen(o => !o);
  }, [qrOpen]);
  const goTo = useCallback((path: string) => { navigate(path); setMobileMenuOpen(false); }, [navigate]);

  const pageSummary = PAGE_SUMMARIES[location] || PAGE_SUMMARIES["/"];

  // Active check — some items share a path (Witness Records → /archive)
  const isActive = (path: string) => location === path;

  const renderNavItem = (item: typeof NAV_ITEMS[0], compact: boolean) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const isGold = item.badge === "$88.88";
    const isLive = item.badge === "LIVE";

    return (
      <button
        key={item.label}
        onClick={() => goTo(item.path)}
        title={item.tooltip || item.label}
        className={`w-full flex items-center gap-3 transition-all duration-150 rounded-none
          ${compact ? "px-4 py-3 text-[14px]" : `px-4 py-2.5 text-[13.5px] ${sidebarOpen ? "" : "justify-center px-0"}`}
          ${active
            ? "text-[oklch(0.96_0.008_270)] border-r-2"
            : "text-white/40 hover:text-[oklch(0.82_0.155_175)] hover:bg-[oklch(0.82_0.155_175/0.06)]"
          }`}
        style={active ? { background: "oklch(0.80 0.145 82 / 0.08)", borderColor: "oklch(0.80 0.145 82)" } : {}}
      >
        <Icon
          size={compact ? 16 : 15}
          className="flex-shrink-0"
          style={{ color: active ? "oklch(0.80 0.145 82)" : "inherit", opacity: active ? 1 : 0.6 }}
        />
        {(compact || sidebarOpen) && (
          <>
            <span className="font-body flex-1 text-left">{item.label}</span>
            {item.badge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto"
                style={isGold
                  ? { background: "oklch(0.80 0.145 82 / 0.15)", color: "oklch(0.80 0.145 82)", border: "1px solid oklch(0.80 0.145 82 / 0.35)" }
                  : isLive
                  ? { background: "oklch(0.65 0.18 160 / 0.20)", color: "oklch(0.65 0.18 160)", border: "1px solid oklch(0.65 0.18 160 / 0.30)" }
                  : {}
                }
              >{item.badge}</span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="noise-overlay flex flex-col h-screen overflow-hidden bg-[oklch(0.08_0.01_280)] relative">
      {/* Quick Reference Slider */}
      <QuickRefSlider open={qrOpen} onToggle={toggleQr} summary={pageSummary} currentPath={location} />

      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── Desktop Sidebar ── */}
        <aside
          className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
            border-r bg-[oklch(0.115_0.05_268)]
            ${sidebarOpen ? "w-[220px]" : "w-[64px]"}`}
          style={{ borderColor: "oklch(0.28 0.04 270 / 60%)" }}
        >
          {/* Logo row */}
          <div className={`flex items-center gap-3 px-4 py-4 border-b border-white/[0.07] ${!sidebarOpen && "justify-center px-0"}`}>
            <div
              className="w-9 h-9 flex items-center justify-center flex-shrink-0 cursor-pointer"
              onClick={() => setSidebarOpen(o => !o)}
            >
              <img src={LOGO_URL} alt="Living Nexus" className="w-full h-full object-contain" />
            </div>
            {sidebarOpen && (
              <span className="font-display text-lg gold-shimmer cursor-pointer select-none" onClick={() => goTo("/")}>
                Living Nexus
              </span>
            )}
          </div>

          {/* Identity header — only when authenticated */}
          {!authLoading && user && (
            <div className="px-2 pt-3 pb-2 border-b border-white/[0.05]">
              <IdentityHeader
                user={user}
                profileAvatar={state.profileAvatar ?? undefined}
                profileName={state.profileName}
                sidebarOpen={sidebarOpen}
                onProfileClick={() => goTo("/profile")}
              />
            </div>
          )}

          {/* Nav groups */}
          <nav className="flex-1 overflow-y-auto py-3">
            {GROUPS.map(group => {
              const items = NAV_ITEMS.filter(n => n.group === group);
              // Hide MY COMMAND + SYSTEM groups if not authenticated
              if ((group === "MY COMMAND" || group === "SYSTEM") && !user) return null;
              return (
                <div key={group} className="mb-1">
                  {sidebarOpen && (
                    <div className="px-4 py-1 text-[9.5px] font-heading tracking-[0.16em] uppercase text-white/20 mb-0.5">
                      {group}
                    </div>
                  )}
                  {items.map(item => renderNavItem(item, false))}
                  {sidebarOpen && <div className="gold-divider mx-4 my-2 opacity-20" />}
                </div>
              );
            })}
          </nav>

          {/* Account footer */}
          <div className={`p-3 border-t border-white/[0.07] ${!sidebarOpen && "flex flex-col items-center gap-2"}`}>
            {!authLoading && !user ? (
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
              <button
                onClick={handleLogout}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md w-full transition-all
                  text-white/30 hover:text-white/60 hover:bg-white/[0.04]
                  ${!sidebarOpen && "justify-center"}`}
              >
                <LogOut size={13} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-[12px] font-body">Log Out</span>}
              </button>
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
              className="w-72 h-full bg-[oklch(0.11_0.012_280)] border-r border-white/[0.07] pt-16 overflow-y-auto flex flex-col"
              style={{ paddingBottom: "max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Mobile identity header */}
              {!authLoading && user && (
                <div className="px-3 pt-3 pb-3 border-b border-white/[0.07]">
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "oklch(0.14 0.04 270 / 60%)" }}>
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
                          boxShadow: user?.licenseStatus === "licensed" ? "0 0 0 2px #D4AF37, 0 0 14px oklch(0.80 0.145 82 / 0.4)" : "none",
                        }}
                      >
                        {user?.profilePhotoUrl || state.profileAvatar
                          ? <img src={user?.profilePhotoUrl ?? state.profileAvatar ?? ""} alt="avatar" className="w-full h-full object-cover rounded-full" />
                          : (user?.name || state.profileName || "?").charAt(0).toUpperCase()
                        }
                      </div>
                      {user?.licenseStatus === "licensed" && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#D4AF37" }}>
                          <CheckCircle2 size={10} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium text-white/95 truncate">{user?.name || state.profileName || "Creator"}</div>
                      {user?.licenseStatus === "licensed" ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Fingerprint size={10} style={{ color: "#D4AF37" }} />
                          <span className="text-[10px] font-heading tracking-wider" style={{ color: "#D4AF37" }}>WITNESSED</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-white/35 mt-0.5">Creator</div>
                      )}
                    </div>
                    <button
                      onClick={() => goTo("/profile")}
                      className="flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile nav groups */}
              <div className="flex-1 overflow-y-auto py-2">
                {GROUPS.map(group => {
                  const items = NAV_ITEMS.filter(n => n.group === group);
                  if ((group === "MY COMMAND" || group === "SYSTEM") && !user) return null;
                  return (
                    <div key={group} className="mb-1">
                      <div className="px-4 py-1.5 text-[9.5px] font-heading tracking-[0.16em] uppercase text-white/20">{group}</div>
                      {items.map(item => renderNavItem(item, true))}
                      <div className="gold-divider mx-4 my-1.5 opacity-15" />
                    </div>
                  );
                })}
              </div>

              {/* Mobile account footer */}
              <div className="px-4 pb-4 border-t border-white/[0.07] pt-3">
                {!authLoading && !user ? (
                  <a
                    href={getLoginUrl()}
                    className="flex items-center gap-3 p-3 rounded-xl w-full transition-all"
                    style={{ background: "oklch(0.75 0.18 85 / 0.12)", border: "1px solid oklch(0.75 0.18 85 / 0.25)" }}
                  >
                    <LogIn size={16} style={{ color: "oklch(0.75 0.18 85)" }} />
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: "oklch(0.85 0.1 85)" }}>Sign In</div>
                      <div className="text-[11px] text-white/35">Upload &amp; earn tips</div>
                    </div>
                  </a>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 rounded-md w-full transition-all text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                  >
                    <LogOut size={14} className="flex-shrink-0" />
                    <span className="text-[13px] font-body">Log Out</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Page content ── */}
        <main className="flex-1 flex flex-col overflow-hidden md:pt-0 pt-14">
          <TipTicker />
          <style>{`@media (min-width: 768px) { .player-scroll-area { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; } }`}</style>
          <div className="flex-1 overflow-y-auto player-scroll-area">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Player Bar */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>

      {/* Mobile Player Panel */}
      <MobilePlayerPanel />

      {/* Theater Player */}
      <TheaterPlayer />
    </div>
  );
}
