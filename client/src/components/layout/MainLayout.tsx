/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MainLayout v3
   Clean 6-item sidebar. Creator-centered. No system/dev items.

   PRIMARY NAV (always visible):
     Home · Explore · Listen Together · Guilds · Profile · Upload

   CREATOR NAV (authenticated only):
     Dashboard · LNA — Archive (with song count badge)

   System tools are accessible via contextual locations:
     - Verify WID → WIDPanel component
     - Batch Upload → UploadPage
     - Witness Records → Profile → Works tab
     - WID Spec + Lexicon → /learn
     - Redeem Code → Profile → Settings
     - Admin → direct URL only (role-gated)
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import PlayerBar from "@/components/player/PlayerBar";
import MobilePlayerLayer from "@/components/player/MobilePlayerLayer";
import TheaterPlayer from "@/components/player/TheaterPlayer";
import QuickRefSlider from "@/components/layout/QuickRefSlider";
import TipTicker from "@/components/TipTicker";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import { trpc } from "@/lib/trpc";
import {
  Home, Compass, Users, User, Upload, Shield,
  Menu, X, ChevronRight, LogIn, LogOut,
  CheckCircle2, Fingerprint, Bell,
  BookOpen, Star, Eye, Archive, LayoutDashboard,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

// ── Nav item types ─────────────────────────────────────────────────
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  notifKey?: "signals" | "jukebox";
  goldLabel?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Home",            icon: Home,    path: "/"         },
  { label: "Explore",         icon: Compass, path: "/explore"  },
  { label: "Listen Together", icon: Users,   path: "/together", badge: "LIVE", notifKey: "jukebox" },
  { label: "Guilds",          icon: Shield,  path: "/guilds"   },
  { label: "Profile",         icon: User,    path: "/profile", notifKey: "signals" },
  { label: "Upload",          icon: Upload,  path: "/upload"   },
];

// Dashboard nav item — only rendered when authenticated
const DASHBOARD_NAV_ITEM: NavItem = {
  label: "Dashboard",
  icon: LayoutDashboard,
  path: "/dashboard",
};

// Archive nav item — only rendered when authenticated
const ARCHIVE_NAV_ITEM: NavItem = {
  label: "LNA — Archive",
  icon: Archive,
  path: "/archive",
  goldLabel: true,
};

// ── (PAGE_SUMMARIES removed — QuickAccessPanel is self-contained) ──

// ── Identity header ────────────────────────────────────────────────
function IdentityHeader({
  user, profileAvatar, profileName, sidebarOpen, onProfileClick,
}: {
  user: { name?: string | null; profilePhotoUrl?: string | null; licenseStatus?: string | null; avatarObjectPosition?: string | null } | null;
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
            ? <img src={avatar} alt="avatar" className="w-full h-full object-cover rounded-full" style={{ objectPosition: user?.avatarObjectPosition ?? "50% 50%" }} />
            : displayName.charAt(0).toUpperCase()
          }
        </div>
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
              <span className="text-[9px] font-heading tracking-wider" style={{ color: "#D4AF37" }}>WITNESSED</span>
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
  const jukeboxQueueCount = state.jukeboxQueueCount;
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

  // Notification badges
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Song count for Archive badge — only fetch when authenticated
  const { data: mySongs } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const archiveSongCount = mySongs ? mySongs.filter((s: any) => s.status !== "Deleted").length : 0;

  const openMobileMenu = useCallback(() => { setQrOpen(false); setMobileMenuOpen(true); }, []);
  const toggleQr = useCallback(() => {
    if (!qrOpen) setMobileMenuOpen(false);
    setQrOpen(o => !o);
  }, [qrOpen]);
  const goTo = useCallback((path: string) => { navigate(path); setMobileMenuOpen(false); }, [navigate]);

  // Active check — treat /home as / alias
  const isActive = (path: string) => {
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  const renderNavItem = (item: NavItem, compact: boolean) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const isLive = item.badge === "LIVE";
    const isArchive = item.path === "/archive";

    // Dynamic badges
    const isJukebox = item.notifKey === "jukebox";
    const isSignals = item.notifKey === "signals";
    const jukeboxBadge = isJukebox && jukeboxQueueCount > 0 ? (jukeboxQueueCount > 9 ? "9+" : String(jukeboxQueueCount)) : null;
    const signalsBadge = isSignals && (unreadCount as number) > 0 ? ((unreadCount as number) > 99 ? "99+" : String(unreadCount)) : null;
    const archiveBadge = isArchive && archiveSongCount > 0 ? (archiveSongCount > 99 ? "99+" : String(archiveSongCount)) : null;
    const pulseBadge = signalsBadge;
    const staticBadge = !pulseBadge && !jukeboxBadge && !archiveBadge && item.badge && isLive ? item.badge : null;
    const countBadge = jukeboxBadge || archiveBadge;

    // Gold label for Archive
    const labelColor = item.goldLabel
      ? (active ? "#D4AF37" : "oklch(0.72 0.12 82 / 0.7)")
      : undefined;

    return (
      <button
        key={item.label}
        onClick={() => goTo(item.path)}
        title={item.label}
        className={`w-full flex items-center gap-3 transition-all duration-150 relative
          ${compact ? "px-4 py-3 text-[14px]" : `py-2.5 text-[13.5px] ${sidebarOpen ? "px-4" : "justify-center px-0"}`}
          ${active
            ? "text-white/95"
            : "text-white/40 hover:text-[oklch(0.82_0.155_175)] hover:bg-[oklch(0.82_0.155_175/0.06)]"
          }`}
        style={active ? { background: "oklch(0.80 0.145 82 / 0.08)" } : {}}
      >
        {/* Left accent bar for active state */}
        {active && !compact && (
          <span
            className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full"
            style={{ background: item.goldLabel ? "#D4AF37" : "oklch(0.80 0.145 82)" }}
          />
        )}

        {/* Icon */}
        <div className="relative flex-shrink-0">
          <Icon
            size={compact ? 16 : 15}
            style={{
              color: active
                ? (item.goldLabel ? "#D4AF37" : "oklch(0.80 0.145 82)")
                : (item.goldLabel ? "oklch(0.72 0.12 82 / 0.6)" : "inherit"),
              opacity: active ? 1 : (item.goldLabel ? 1 : 0.6),
            }}
          />
          {/* Collapsed sidebar: dot badge on icon */}
          {!compact && !sidebarOpen && pulseBadge && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: "oklch(0.65 0.22 25)" }}
            />
          )}
          {/* Collapsed sidebar: count dot for archive */}
          {!compact && !sidebarOpen && archiveBadge && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: "#D4AF37" }}
            />
          )}
        </div>

        {(compact || sidebarOpen) && (
          <>
            <span
              className="font-body flex-1 text-left truncate"
              style={labelColor ? { color: labelColor } : undefined}
            >
              {item.label}
            </span>
            {/* Pulse badge (signals) */}
            {pulseBadge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto min-w-[18px] text-center animate-pulse"
                style={{ background: "oklch(0.65 0.22 25)", color: "white" }}
              >{pulseBadge}</span>
            )}
            {/* Count badge (jukebox queue or archive count) */}
            {!pulseBadge && countBadge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto min-w-[18px] text-center"
                style={isArchive
                  ? { background: "oklch(0.84 0.155 85 / 0.18)", color: "#D4AF37", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }
                  : { background: "oklch(0.80 0.145 82)", color: "oklch(0.15 0.01 280)" }
                }
              >{countBadge}</span>
            )}
            {/* Static badge (LIVE) */}
            {!pulseBadge && !countBadge && staticBadge && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto"
                style={{ background: "oklch(0.65 0.18 160 / 0.20)", color: "oklch(0.65 0.18 160)", border: "1px solid oklch(0.65 0.18 160 / 0.30)" }}
              >{staticBadge}</span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <div className="noise-overlay flex flex-col h-screen overflow-hidden bg-[oklch(0.08_0.01_280)] relative">
      {/* Quick Reference Slider */}
      <QuickRefSlider open={qrOpen} onToggle={toggleQr} />

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

          {/* Identity header — clickable, routes to /profile */}
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

          {/* Primary nav — 6 items */}
          <nav className="flex-1 overflow-y-auto py-3">
            <div className="space-y-0.5">
              {PRIMARY_NAV.map(item => renderNavItem(item, false))}
            </div>

            {/* Creator nav items — authenticated only */}
            {!authLoading && user && (
              <div className="space-y-0.5 mt-0.5">
                {renderNavItem(DASHBOARD_NAV_ITEM, false)}
                {renderNavItem(ARCHIVE_NAV_ITEM, false)}
              </div>
            )}

            {/* Divider after Upload / Archive */}
            {sidebarOpen && (
              <div className="gold-divider mx-4 mt-3 mb-2 opacity-20" />
            )}

            {/* Unauthenticated discovery hint */}
            {!authLoading && !user && sidebarOpen && (
              <div className="px-4 py-2">
                <p className="text-[10px] text-white/25 leading-relaxed">
                  Sign in to upload, witness your work, and build your creator profile.
                </p>
              </div>
            )}
            {/* Secondary: Lore & Discover links */}
            {sidebarOpen && (
              <div className="px-4 pt-2 pb-2 space-y-0.5">
                <p className="text-[9px] font-heading tracking-widest text-white/20 uppercase mb-1.5">Discover</p>
                {([
                  { label: "Manifesto", icon: BookOpen, path: "/manifesto" },
                  { label: "Founding Creators", icon: Star, path: "/founders" },
                  { label: "Witness Registry", icon: Eye, path: "/witness-registry" },
                ] as { label: string; icon: React.ElementType; path: string }[]).map(item => {
                  const Icon = item.icon;
                  const active = location === item.path;
                  return (
                    <button
                      key={item.label}
                      onClick={() => goTo(item.path)}
                      className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-left transition-colors"
                      style={{
                        background: active ? "oklch(0.75 0.18 85 / 0.10)" : "transparent",
                        color: active ? "oklch(0.84 0.155 85)" : "oklch(0.40 0.02 280)",
                      }}
                    >
                      <Icon size={12} className="flex-shrink-0" />
                      <span className="text-[11px] font-body">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
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
          {/* Mobile signals badge */}
          {!!user && (unreadCount as number) > 0 && (
            <button
              onClick={() => goTo("/profile")}
              className="relative p-2 rounded-lg text-white/40 hover:text-white/70"
            >
              <Bell size={16} />
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
                style={{ background: "oklch(0.65 0.22 25)" }}
              />
            </button>
          )}
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
                  <button
                    className="flex items-center gap-3 p-3 rounded-xl w-full text-left"
                    style={{ background: "oklch(0.14 0.04 270 / 60%)" }}
                    onClick={() => goTo("/profile")}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
                          boxShadow: user?.licenseStatus === "licensed" ? "0 0 0 2px #D4AF37, 0 0 14px oklch(0.80 0.145 82 / 0.4)" : "none",
                        }}
                      >
                        {user?.profilePhotoUrl || state.profileAvatar
                          ? <img src={user?.profilePhotoUrl ?? state.profileAvatar ?? ""} alt="avatar" className="w-full h-full object-cover rounded-full" style={{ objectPosition: user?.avatarObjectPosition ?? "50% 50%" }} />
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
                        <div className="text-[11px] text-white/35 mt-0.5">View Profile</div>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-white/30 flex-shrink-0" />
                  </button>
                </div>
              )}

              {/* Mobile primary nav */}
              <div className="flex-1 py-2">
                {PRIMARY_NAV.map(item => renderNavItem(item, true))}
                {/* Creator nav — authenticated only */}
                {!authLoading && user && renderNavItem(DASHBOARD_NAV_ITEM, true)}
                {!authLoading && user && renderNavItem(ARCHIVE_NAV_ITEM, true)}
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
          <style>{`
            @media (min-width: 768px) { .player-scroll-area { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; } }
            @media (max-width: 767px) { .player-scroll-area { padding-bottom: calc(80px + max(env(safe-area-inset-bottom, 0px), 8px)) !important; } }
          `}</style>
          <div className="flex-1 overflow-y-auto player-scroll-area">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop Player Bar */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>

      {/* Mobile Player Layer — portal-based, full-viewport, detached from layout */}
      <MobilePlayerLayer />

      {/* Theater Player */}
      <TheaterPlayer />

      {/* Scroll to top */}
      <ScrollToTopButton />
    </div>
  );
}
