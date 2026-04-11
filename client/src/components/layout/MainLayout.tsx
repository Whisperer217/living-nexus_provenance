/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MainLayout v4
   Desktop: slim TopBar + full-width drawer + LiveActivityPanel
   Mobile: unchanged (hamburger + bottom nav)

   Desktop layout:
     ┌─────────────────────────────────────────────────┐
     │  TopBar (52px fixed)                            │
     ├─────────────────────────────────────────────────┤
     │ [Live]  │  Page content (scrollable)            │
     │  panel  │                                       │
     │ (slide) │                                       │
     ├─────────────────────────────────────────────────┤
     │  PlayerBar (72px fixed, full width)             │
     └─────────────────────────────────────────────────┘
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import PlayerBar from "@/components/player/PlayerBar";
import MobilePlayerLayer from "@/components/player/MobilePlayerLayer";
import TheaterPlayer from "@/components/player/TheaterPlayer";
// QuickRefSlider and QuickRefBottomSheet removed (Phase 88) — replaced by right-side playlist drawer
import PlaylistDrawer from "@/components/player/PlaylistDrawer";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import TopBar from "@/components/layout/TopBar";
import LiveActivityPanel from "@/components/layout/LiveActivityPanel";
import { trpc } from "@/lib/trpc";
import { useLightsMode } from "@/contexts/LightsModeContext";
import {
  Home, Compass, User, Upload, Shield,
  Menu, X, ChevronRight, LogIn, LogOut,
  CheckCircle2, Fingerprint, Bell,
  BookOpen, Star, Eye, Archive, LayoutDashboard, Sparkles, Terminal, Heart, Scale,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  notifKey?: "signals";
  goldLabel?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Home",            icon: Home,    path: "/"          },
  { label: "Explore",         icon: Compass, path: "/explore"   },
  { label: "Profile",         icon: User,    path: "/profile",  notifKey: "signals" },
  { label: "Upload",          icon: Upload,  path: "/upload"    },
];

const DASHBOARD_NAV_ITEM: NavItem = { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" };
const ARCHIVE_NAV_ITEM: NavItem   = { label: "LNA — Archive", icon: Archive, path: "/archive", goldLabel: true };

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { state } = usePlayer();
  const { user, loading: authLoading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);

  // Notification badges
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Archive badge count
  const { data: mySongs } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const archiveSongCount = mySongs ? mySongs.filter((s: any) => s.status !== "Deleted").length : 0;

  const { mode: lightsMode } = useLightsMode();
  const isWarm = lightsMode === "on";

  // Warm theme tokens for mobile chrome only
  // Warm mode: very subtle steel tint — dark base fully dominates, just a faint cool cast
  const MOBILE_HEADER_BG = isWarm ? "rgba(55,68,85,0.72)" : "oklch(0.125 0.028 52)";
  const MOBILE_HEADER_BORDER = isWarm ? "rgba(100,125,150,0.22)" : "oklch(0.30 0.04 60 / 0.35)";
  const MOBILE_SIDEBAR_BG = isWarm ? "rgba(42,55,70,0.80)" : "oklch(0.125 0.028 52)";
  const MOBILE_SIDEBAR_BORDER = isWarm ? "rgba(100,125,150,0.18)" : "oklch(0.30 0.04 60 / 0.35)";
  const MOBILE_TEXT = isWarm ? "rgba(200,212,228,0.85)" : undefined;
  const MOBILE_TEXT_MUTED = isWarm ? "rgba(148,165,185,0.60)" : undefined;

  // Body scroll lock for mobile menu — routed through global overlayController
  const openMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
    overlayOpen("menu");
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    overlayClose("menu");
  }, []);

  const handleLogout = useCallback(async () => {
    try { await logout(); } finally {
      closeMobileMenu();
      navigate("/");
    }
  }, [logout, navigate, closeMobileMenu]);
  const goTo = useCallback((path: string) => { navigate(path); closeMobileMenu(); }, [navigate, closeMobileMenu]);

  const isActive = (path: string) => {
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  // ── Mobile nav item renderer ──────────────────────────────────────
  const renderMobileNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    const isLive = item.badge === "LIVE";
    const isArchive = item.path === "/archive";
    const isSignals = item.notifKey === "signals";
    const signalsBadge = isSignals && (unreadCount as number) > 0 ? ((unreadCount as number) > 99 ? "99+" : String(unreadCount)) : null;
    const archiveBadge = isArchive && archiveSongCount > 0 ? (archiveSongCount > 99 ? "99+" : String(archiveSongCount)) : null;
    const pulseBadge = signalsBadge;
    const countBadge = archiveBadge;
    const staticBadge = !pulseBadge && !archiveBadge && isLive ? item.badge : null;
    const labelColor = item.goldLabel ? (active ? "#E8A830" : "oklch(0.72 0.13 72 / 0.7)") : undefined;

    const warmActiveBg = "rgba(100,125,150,0.18)";
    const warmHoverBg = "rgba(100,125,150,0.12)";
    const warmActiveText = "rgba(180,202,230,0.95)";
    const warmMutedText = "rgba(148,165,185,0.60)";
    const warmBodyText = "rgba(200,215,235,0.90)";

    return (
      <button
        key={item.label}
        onClick={() => goTo(item.path)}
        title={item.label}
        className={`w-full flex items-center gap-3 transition-all duration-150 relative px-4 py-3 text-[14px]
          ${!isWarm ? (active ? "text-white/95" : "text-white/40 hover:text-[oklch(0.82_0.155_75)] hover:bg-[oklch(0.82_0.155_75/0.06)]") : ""}`}
        style={{
          background: active ? (isWarm ? warmActiveBg : "oklch(0.82 0.155 75 / 0.10)") : "transparent",
          color: isWarm ? (active ? warmActiveText : warmMutedText) : undefined,
          transition: "background 0.3s ease, color 0.3s ease",
        }}
        onMouseEnter={isWarm ? e => { if (!active) { (e.currentTarget as HTMLElement).style.background = warmHoverBg; (e.currentTarget as HTMLElement).style.color = warmBodyText; } } : undefined}
        onMouseLeave={isWarm ? e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = warmMutedText; } } : undefined}
      >
        <Icon size={16} style={{
          color: isWarm
            ? (active ? warmActiveText : warmMutedText)
            : (active ? (item.goldLabel ? "#E8A830" : "oklch(0.82 0.155 75)") : (item.goldLabel ? "oklch(0.72 0.13 72 / 0.7)" : "inherit")),
          opacity: (!isWarm && !active && !item.goldLabel) ? 0.6 : 1,
        }} />
        <span className="flex-1 text-left font-body" style={isWarm ? { color: active ? warmActiveText : warmMutedText } : (labelColor ? { color: labelColor } : undefined)}>{item.label}</span>
        {pulseBadge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse" style={{ background: "oklch(0.65 0.22 25)", color: "white" }}>{pulseBadge}</span>}
        {!pulseBadge && countBadge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center" style={isArchive ? { background: "oklch(0.82 0.155 75 / 0.18)", color: "#E8A830", border: "1px solid oklch(0.82 0.155 75 / 0.3)" } : { background: "oklch(0.82 0.155 75)", color: "oklch(0.12 0.02 55)" }}>{countBadge}</span>}
        {!pulseBadge && !countBadge && staticBadge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto" style={{ background: "oklch(0.78 0.12 175 / 0.20)", color: "oklch(0.78 0.12 175)", border: "1px solid oklch(0.78 0.12 175 / 0.30)" }}>{staticBadge}</span>}
      </button>
    );
  };

  return (
    <div className="noise-overlay flex flex-col h-dvh overflow-hidden bg-[oklch(0.10_0.022_55)] relative" style={{ overscrollBehavior: "none" }}>

      {/* ── Quick Reference Slider — temporarily hidden per user request (Phase 77) ── */}


      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT (md+)
          TopBar replaces sidebar entirely.
          LiveActivityPanel slides in from left edge.
      ══════════════════════════════════════════════ */}

      {/* TopBar — desktop only */}
      <TopBar archiveSongCount={archiveSongCount} unreadCount={unreadCount as number} />

      {/* LiveActivityPanel — desktop only */}
      <LiveActivityPanel open={liveOpen} onToggle={() => setLiveOpen(o => !o)} />

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT (<md)
      ══════════════════════════════════════════════ */}

      {/* Mobile header */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3"
        style={{
          background: MOBILE_HEADER_BG,
          borderBottom: `1px solid ${MOBILE_HEADER_BORDER}`,
          transition: "background 0.4s ease",
        }}
      >
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
        {/* Bell — 44px tap target, navigates to /notifications */}
        {!!user && (
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 transition-all"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Bell size={18} />
            {(unreadCount as number) > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.22 25)" }} />
            )}
          </button>
        )}
      </div>

      {/* Mobile nav overlay — always rendered, animated via translateX */}
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-[8000]"
        style={{
          background: "oklch(0 0 0 / 0.72)",
          backdropFilter: "blur(4px)",
          opacity: mobileMenuOpen ? 1 : 0,
          pointerEvents: mobileMenuOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
        onClick={closeMobileMenu}
      />
      {/* Drawer panel */}
      <div
        className="md:hidden fixed top-0 left-0 z-[9000] flex flex-col"
        style={{
          width: "min(85vw, 320px)",
          height: "100dvh",
          minHeight: "100dvh",
          background: isWarm ? "rgba(28,38,52,0.98)" : "oklch(0.125 0.028 52)",
          borderRight: `1px solid ${MOBILE_SIDEBAR_BORDER}`,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))",
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          overflowY: "auto",
          overscrollBehavior: "contain",
          boxShadow: mobileMenuOpen ? "4px 0 40px oklch(0 0 0 / 0.6)" : "none",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Spacer for mobile header height */}
        <div style={{ height: "56px", flexShrink: 0 }} />
            {/* Mobile identity header */}
            {!authLoading && user && (
              <div className="px-3 pt-3 pb-3" style={{ borderBottom: `1px solid ${MOBILE_SIDEBAR_BORDER}` }}>
                <button
                  className="flex items-center gap-3 p-3 rounded-xl w-full text-left"
                  style={{ background: "oklch(0.148 0.030 50 / 60%)" }}
                  onClick={() => goTo("/profile")}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg, #8B5E1A, #C8954A)",
                        boxShadow: user?.licenseStatus === "licensed" ? "0 0 0 2px #E8A830, 0 0 14px oklch(0.82 0.155 75 / 0.4)" : "none",
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
            <div className="flex-1 py-2 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
              {PRIMARY_NAV.map(item => renderMobileNavItem(item))}
              {!authLoading && user && (
                <div className="px-4 pt-4 pb-1">
                  <p className="text-[9px] font-heading tracking-widest text-white/20 uppercase">Creator Tools</p>
                </div>
              )}
              {!authLoading && user && renderMobileNavItem({ label: "Upload", icon: Upload, path: "/upload" })}
              {!authLoading && user && renderMobileNavItem(DASHBOARD_NAV_ITEM)}
              {!authLoading && user && renderMobileNavItem(ARCHIVE_NAV_ITEM)}
              {!authLoading && user && renderMobileNavItem({ label: "My Profile", icon: Fingerprint, path: `/creator/${(user as any).id}` })}
              {!authLoading && user && renderMobileNavItem({ label: "Prompt Generator", icon: Sparkles, path: `/creator/${(user as any).id}?openPromptStudio=1` })}
              {!authLoading && (user as any)?.role === "admin" && renderMobileNavItem({ label: "LN Command", icon: Terminal, path: "/admin" })}

              <div className="px-4 pt-4 pb-2">
                <p className="text-[9px] font-heading tracking-widest text-white/20 uppercase mb-2">Discover</p>
                {([
                  { label: "Manifesto",         icon: BookOpen, path: "/manifesto"        },
                  { label: "Terms of Service",  icon: Scale,    path: "/terms"            },
                  { label: "Compare Platform TOS", icon: Scale,  path: "/terms/compare"    },
                  { label: "Privacy Policy",     icon: Shield,   path: "/privacy"          },
                  { label: "Platform Trust",     icon: Shield,   path: "/trust"            },
                  { label: "Founding Creators", icon: Star,     path: "/founders"         },
                  { label: "Founder Era Support", icon: Heart,  path: "/founder-era"      },
                  { label: "Witness Registry",  icon: Eye,      path: "/witness-registry" },
                ] as { label: string; icon: React.ElementType; path: string }[]).map(item => {
                  const Icon = item.icon;
                  const active = location === item.path;
                  return (
                    <button
                      key={item.label}
                      onClick={() => goTo(item.path)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{ background: active ? "oklch(0.82 0.155 75 / 0.10)" : "transparent", color: active ? "oklch(0.82 0.155 75)" : "oklch(0.55 0.04 60)" }}
                    >
                      <Icon size={14} className="flex-shrink-0" />
                      <span className="text-[13px] font-body">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile account footer */}
            <div className="px-4 pb-4 border-t border-[oklch(0.30_0.04_60/0.35)] pt-3">
              <button
                onClick={closeMobileMenu}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full mb-2 transition-all text-white/40 hover:text-[#E8A830] hover:bg-[oklch(0.82_0.155_75/0.06)]"
              >
                <Sparkles size={15} className="flex-shrink-0" />
                <span className="text-[13px] font-body">What's New</span>
                <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "oklch(0.82 0.155 75 / 0.12)", color: "oklch(0.75 0.13 72)" }}>v2.24</span>
              </button>
              {!authLoading && !user ? (
                <a
                  href={getLoginUrl()}
                  className="flex items-center gap-3 p-3 rounded-xl w-full transition-all"
                  style={{ background: "oklch(0.82 0.155 75 / 0.12)", border: "1px solid oklch(0.82 0.155 75 / 0.25)" }}
                >
                  <LogIn size={16} style={{ color: "oklch(0.82 0.155 75)" }} />
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "oklch(0.88 0.12 75)" }}>Sign In</div>
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

      {/* ══════════════════════════════════════════════
          PAGE CONTENT
          Desktop: top-padding for TopBar (52px)
          Mobile: top-padding for mobile header (56px)
      ══════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden md:pt-[52px] pt-14" style={{ overscrollBehavior: "none" }}>
        <style>{`
          /* Desktop: 72px player bar + safe area */
          @media (min-width: 768px) { .player-scroll-area { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; } }
          /* Mobile: nav (56px + safe-area) + mini player (64px) = full bottom stack */
          @media (max-width: 767px) { .player-scroll-area { padding-bottom: var(--bottom-stack) !important; } }
        `}</style>
        <div className="flex-1 overflow-y-auto player-scroll-area" style={{ overscrollBehaviorX: "none", overscrollBehaviorY: "none", touchAction: "pan-y" }}>
          {children}
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          PLAYERS
          Desktop PlayerBar: full-width (no left offset)
          Mobile: portal-based MobilePlayerLayer
      ══════════════════════════════════════════════ */}

      {/* Desktop Player Bar — full width */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>

      {/* Mobile Player Layer */}
      <MobilePlayerLayer />

      {/* Theater Player */}
      <TheaterPlayer />
      {/* Right-side Playlist Drawer — z-9000, below expanded player (z-9995) */}
      <PlaylistDrawer />

      {/* Scroll to top */}
      <ScrollToTopButton />
    </div>
  );
}
