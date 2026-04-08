/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TopBar (Desktop Only)
   Slim fixed top bar + full-width collapsible drawer.
   Replaces the left sidebar on md+ screens.
   Mobile: not rendered (MainLayout handles mobile separately).
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { usePlayer } from "@/contexts/PlayerContext";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { useLightsMode } from "@/contexts/LightsModeContext";
import {
  Home, Compass, Users, User, Upload, Shield,
  LayoutDashboard, Archive, Sparkles, Terminal,
  BookOpen, Star, Heart, Eye, Fingerprint, Scale,
  LogIn, LogOut, Bell, Menu, X, ChevronRight,
  CheckCircle2, Zap, Rocket,
} from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

// ── Core nav items (always visible in top bar) ─────────────────────
const CORE_NAV = [
  { label: "Home",            icon: Home,          path: "/"          },
  { label: "Explore",         icon: Compass,       path: "/explore"   },
  { label: "Projects",        icon: Rocket,        path: "/projects"  },
  { label: "Listen Together", icon: Users,         path: "/together", badge: "LIVE" },
  { label: "Upload",          icon: Upload,        path: "/upload"    },
  { label: "Dashboard",       icon: LayoutDashboard, path: "/dashboard", authOnly: true },
  { label: "Archive",         icon: Archive,       path: "/archive",  authOnly: true, archiveBadge: true },
];

// ── Drawer sections ────────────────────────────────────────────────
const DRAWER_NAVIGATE = [
  { label: "Home",            icon: Home,    path: "/"          },
  { label: "Explore",         icon: Compass, path: "/explore"   },
  { label: "Projects",        icon: Rocket,  path: "/projects"  },
  { label: "Listen Together", icon: Users,   path: "/together", badge: "LIVE" },
  { label: "Guilds",          icon: Shield,  path: "/guilds"    },
];

const DRAWER_CREATE = [
  { label: "Upload Work",      icon: Upload,          path: "/upload",    authOnly: true },
  { label: "Dashboard",        icon: LayoutDashboard, path: "/dashboard", authOnly: true },
  { label: "LNA Archive",      icon: Archive,         path: "/archive",   authOnly: true, archiveBadge: true },
  { label: "Prompt Generator", icon: Sparkles,        path: "",           authOnly: true, promptGen: true },
  { label: "LN Command",       icon: Terminal,        path: "/admin",     adminOnly: true },
];

const DRAWER_DISCOVER = [
  { label: "Manifesto",         icon: BookOpen, path: "/manifesto"        },
  { label: "Terms of Service",  icon: Scale,    path: "/terms"            },
  { label: "Compare Platform TOS", icon: Scale,  path: "/terms/compare"    },
  { label: "Privacy Policy",     icon: Shield,  path: "/privacy"          },
  { label: "Platform Trust",     icon: Shield,  path: "/trust"            },
  { label: "Founding Creators", icon: Star,     path: "/founders"         },
  { label: "Founder Era Support", icon: Heart,  path: "/founder-era"      },
  { label: "Witness Registry",  icon: Eye,      path: "/witness-registry" },
];

const DRAWER_ACCOUNT = [
  { label: "My Profile",    icon: User,        path: "/profile",     authOnly: true },
  { label: "Creator Page",  icon: Fingerprint, path: "",             authOnly: true, creatorPage: true },
  { label: "My Projects",   icon: Heart,       path: "/my-projects", authOnly: true },
  { label: "Notifications", icon: Bell,        path: "/notifications", authOnly: true, notifBadge: true },
];

interface TopBarProps {
  archiveSongCount: number;
  unreadCount: number;
}

export default function TopBar({ archiveSongCount, unreadCount }: TopBarProps) {
  const [location, navigate] = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const { state } = usePlayer();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (path: string) => { navigate(path); setDrawerOpen(false); },
    [navigate]
  );

  const handleLogout = useCallback(async () => {
    try { await logout(); } finally {
      setDrawerOpen(false);
      navigate("/");
    }
  }, [logout, navigate]);

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location]);

  const isActive = (path: string) => {
    if (!path) return false;
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  const displayName = user?.name || state.profileName || "Creator";
  const avatar = user?.profilePhotoUrl || state.profileAvatar;
  const hasWid = user?.licenseStatus === "licensed";
  const isAdmin = (user as any)?.role === "admin";
  const userId = (user as any)?.id;

  const { mode: lightsMode } = useLightsMode();
  const isWarm = lightsMode === "on";

  // Warm mode: very subtle steel tint — dark base fully dominates, just a faint cool cast
  const NAV_BG = isWarm ? "rgba(55,68,85,0.72)" : "oklch(0.115 0.025 52 / 0.97)";
  const NAV_BORDER = isWarm ? "rgba(100,125,150,0.22)" : "oklch(0.30 0.04 60 / 45%)";
  const DRAWER_BG = isWarm ? "rgba(42,55,70,0.80)" : "oklch(0.09 0.018 280 / 0.98)";
  const DRAWER_BORDER = isWarm ? "rgba(100,125,150,0.18)" : "oklch(0.28 0.04 270 / 50%)";
  const NAV_TEXT = isWarm ? "rgba(200,212,228,0.85)" : "oklch(0.62 0.04 65)";
  const NAV_TEXT_MUTED = isWarm ? "rgba(148,165,185,0.60)" : "oklch(0.55 0.02 280)";
  const NAV_SECTION_LABEL = isWarm ? "rgba(148,165,185,0.45)" : "oklch(0.75 0.12 85 / 0.7)";
  const NAV_SECTION_BORDER = isWarm ? "rgba(100,125,150,0.15)" : "oklch(0.84 0.155 85 / 0.10)";
  const NAV_ACTIVE_BG = isWarm ? "rgba(100,125,150,0.18)" : "oklch(0.82 0.155 75 / 0.12)";
  const NAV_ACTIVE_BORDER = isWarm ? "rgba(120,148,178,0.32)" : "oklch(0.82 0.155 75 / 0.22)";
  const NAV_ACTIVE_TEXT = isWarm ? "rgba(180,202,230,0.95)" : "oklch(0.88 0.14 75)";
  const LOGO_DIVIDER = isWarm ? "rgba(100,125,150,0.20)" : "oklch(0.30 0.04 60 / 35%)";
  const RIGHT_DIVIDER = isWarm ? "rgba(100,125,150,0.20)" : "oklch(0.30 0.04 60 / 35%)";

  // ── Drawer item renderer ─────────────────────────────────────────
  const renderDrawerItem = (item: {
    label: string; icon: React.ElementType; path: string;
    badge?: string; authOnly?: boolean; adminOnly?: boolean;
    archiveBadge?: boolean; notifBadge?: boolean; promptGen?: boolean; creatorPage?: boolean;
  }) => {
    if (item.authOnly && !user) return null;
    if (item.adminOnly && !isAdmin) return null;

    const Icon = item.icon;
    const targetPath = item.promptGen
      ? `/creator/${userId}?openPromptStudio=1`
      : item.creatorPage
      ? `/creator/${userId}`
      : item.path;
    const active = isActive(item.path || targetPath);

    const badge = item.badge === "LIVE" ? (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded ml-auto"
        style={{ background: "oklch(0.65 0.18 160 / 0.20)", color: "oklch(0.65 0.18 160)", border: "1px solid oklch(0.65 0.18 160 / 0.30)" }}>
        LIVE
      </span>
    ) : item.archiveBadge && archiveSongCount > 0 ? (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto min-w-[18px] text-center"
        style={{ background: "oklch(0.84 0.155 85 / 0.18)", color: "#D4AF37", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}>
        {archiveSongCount > 99 ? "99+" : archiveSongCount}
      </span>
    ) : item.notifBadge && unreadCount > 0 ? (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto min-w-[18px] text-center animate-pulse"
        style={{ background: "oklch(0.65 0.22 25)", color: "white" }}>
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    ) : null;

    return (
      <button
        key={item.label}
        onClick={() => goTo(targetPath)}
        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all"
        style={{
          background: active ? NAV_ACTIVE_BG : "transparent",
          color: active ? NAV_ACTIVE_TEXT : NAV_TEXT_MUTED,
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = isWarm ? "rgba(120,145,170,0.18)" : "oklch(0.20 0.02 280 / 0.6)"; (e.currentTarget as HTMLElement).style.color = isWarm ? "rgba(210,225,245,0.95)" : "oklch(0.85 0.02 280)"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = NAV_TEXT_MUTED; } }}
      >
        <Icon size={13} className="flex-shrink-0" style={{ color: active ? "oklch(0.80 0.145 82)" : "inherit" }} />
        <span className="text-[12px] font-body flex-1">{item.label}</span>
        {badge}
      </button>
    );
  };

  return (
    <div ref={drawerRef} className="hidden md:block">
      {/* ── Slim top bar ─────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center gap-0"
        style={{
          height: "52px",
          background: NAV_BG,
          borderBottom: `1px solid ${NAV_BORDER}`,
          backdropFilter: isWarm ? "blur(32px) saturate(0.7)" : "blur(16px)",
          transition: "background 0.4s ease, border-color 0.4s ease",
        }}
      >
        {/* Logo zone */}
        <div
          className="flex items-center gap-2.5 px-4 flex-shrink-0 cursor-pointer"
          style={{ borderRight: `1px solid ${LOGO_DIVIDER}`, height: "100%", paddingRight: "16px" }}
          onClick={() => goTo("/")}
        >
          <img src={LOGO_URL} alt="Living Nexus" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-display text-sm gold-shimmer leading-tight">Living Nexus</div>
            <div className="text-[8px] tracking-widest font-heading" style={{ color: "oklch(0.58 0.06 65)" }}>CREATIVE PROVENANCE</div>
          </div>
        </div>

        {/* Core nav pills */}
        <nav className="flex items-center gap-0.5 px-3 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CORE_NAV.map(item => {
            if (item.authOnly && !user && !authLoading) return null;
            const active = isActive(item.path);
            const isLive = item.badge === "LIVE";
            const archiveBadge = item.archiveBadge && archiveSongCount > 0
              ? (archiveSongCount > 99 ? "99+" : String(archiveSongCount))
              : null;

            return (
              <button
                key={item.label}
                onClick={() => goTo(item.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  background: active ? NAV_ACTIVE_BG : "transparent",
                  border: active ? `1px solid ${NAV_ACTIVE_BORDER}` : "1px solid transparent",
                  color: active ? NAV_ACTIVE_TEXT : NAV_TEXT,
                }}
              >
                <item.icon size={13} style={{ color: active ? "oklch(0.82 0.155 75)" : "inherit" }} />
                <span>{item.label}</span>
                {isLive && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                )}
                {archiveBadge && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                    style={{ background: "oklch(0.82 0.155 75 / 0.18)", color: "#E8A830" }}>
                    {archiveBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right zone */}
        <div
          className="flex items-center gap-2 px-4 flex-shrink-0"
          style={{ borderLeft: `1px solid ${RIGHT_DIVIDER}`, height: "100%" }}
        >
          {/* Prompt Generator quick button */}
          {user && userId && (
            <button
              onClick={() => goTo(`/creator/${userId}?openPromptStudio=1`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
              style={{
                fontSize: "11px", fontWeight: 600,
                background: "transparent",
                border: "1px solid oklch(0.30 0.04 60 / 50%)",
                color: "oklch(0.62 0.04 65)",
              }}
            >
              <Zap size={12} />
              <span>Prompt Gen</span>
            </button>
          )}

          {/* Register Work — gold CTA */}
          <button
            onClick={() => goTo("/upload")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{
              fontSize: "11px", fontWeight: 700,
              background: "#E8A830",
              color: "#000",
              border: "none",
            }}
          >
            <Upload size={12} />
            <span>Register Work</span>
          </button>

          {/* Notification bell — min 44px tap target for mobile */}
          {user && (
            <button
              onClick={() => goTo("/notifications")}
              className="relative flex items-center justify-center rounded-lg transition-all"
              style={{ color: "oklch(0.62 0.04 65)", minWidth: 44, minHeight: 44, padding: "0 10px" }}
            >
              <Bell size={18} />
              {(unreadCount as number) > 0 && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "oklch(0.65 0.22 25)" }}
                />
              )}
            </button>
          )}

          {/* Avatar */}
          {!authLoading && user ? (
            <button
              onClick={() => goTo("/profile")}
              className="relative flex-shrink-0"
              title={displayName}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #8B5E1A, #C8954A)",
                  boxShadow: hasWid ? "0 0 0 2px #E8A830, 0 0 10px oklch(0.82 0.155 75 / 0.35)" : "none",
                }}
              >
                {avatar
                  ? <img src={avatar} alt="avatar" className="w-full h-full object-cover rounded-full" style={{ objectPosition: user?.avatarObjectPosition ?? "50% 50%" }} />
                  : displayName.charAt(0).toUpperCase()
                }
              </div>
              {hasWid && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "#E8A830" }}>
                  <CheckCircle2 size={8} className="text-black" />
                </div>
              )}
            </button>
          ) : !authLoading ? (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
              style={{
                fontSize: "11px", fontWeight: 600,
                background: "oklch(0.82 0.155 75 / 0.12)",
                border: "1px solid oklch(0.82 0.155 75 / 0.25)",
                color: "oklch(0.88 0.12 75)",
              }}
            >
              <LogIn size={12} />
              <span>Sign In</span>
            </a>
          ) : null}

          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(o => !o)}
            className="flex flex-col gap-1 p-2 rounded-lg transition-all"
            style={{ color: drawerOpen ? "oklch(0.88 0.14 75)" : "oklch(0.62 0.04 65)" }}
            aria-label="Open navigation menu"
          >
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* ── Full-width drawer ─────────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-40 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          top: "52px",
          maxHeight: drawerOpen ? "420px" : "0px",
          opacity: drawerOpen ? 1 : 0,
          background: DRAWER_BG,
          borderBottom: drawerOpen ? `1px solid ${DRAWER_BORDER}` : "none",
          backdropFilter: isWarm ? "blur(40px) saturate(0.6)" : "blur(20px)",
          transition: "background 0.4s ease",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-5">
          <div className="grid grid-cols-5 gap-6">

            {/* NAVIGATE */}
            <div>
              <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}` }}>
                Navigate
              </div>
              <div className="space-y-0.5">
                {DRAWER_NAVIGATE.map(item => renderDrawerItem(item))}
              </div>
            </div>

            {/* CREATE */}
            <div>
              <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}` }}>
                Create
              </div>
              <div className="space-y-0.5">
                {DRAWER_CREATE.map(item => renderDrawerItem(item))}
              </div>
            </div>

            {/* DISCOVER */}
            <div>
              <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}` }}>
                Discover
              </div>
              <div className="space-y-0.5">
                {DRAWER_DISCOVER.map(item => renderDrawerItem(item))}
              </div>
            </div>

            {/* ACCOUNT */}
            <div>
              <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}` }}>
                Account
              </div>
              <div className="space-y-0.5">
                {DRAWER_ACCOUNT.map(item => renderDrawerItem(item))}
                <button
                  onClick={() => { setWhatsNewOpen(true); setDrawerOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all"
                  style={{ color: "oklch(0.55 0.02 280)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(0.20 0.02 280 / 0.6)"; (e.currentTarget as HTMLElement).style.color = "oklch(0.85 0.02 280)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "oklch(0.55 0.02 280)"; }}
                >
                  <Sparkles size={13} className="flex-shrink-0" />
                  <span className="text-[12px] font-body flex-1">What's New</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "oklch(0.84 0.155 85 / 0.12)", color: "oklch(0.75 0.12 85)" }}>v2.24</span>
                </button>
              </div>
            </div>

            {/* USER CARD */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-[9px] font-heading tracking-[0.15em] uppercase mb-3 pb-2"
                  style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}` }}>
                  {user ? "Signed In As" : "Platform"}
                </div>
                {!authLoading && user ? (
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: "oklch(0.14 0.04 270 / 60%)", border: "1px solid oklch(0.28 0.04 270 / 50%)" }}
                    onClick={() => goTo("/profile")}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
                          boxShadow: hasWid ? "0 0 0 2px #D4AF37" : "none",
                        }}
                      >
                        {avatar
                          ? <img src={avatar} alt="avatar" className="w-full h-full object-cover rounded-full" style={{ objectPosition: user?.avatarObjectPosition ?? "50% 50%" }} />
                          : displayName.charAt(0).toUpperCase()
                        }
                      </div>
                      {hasWid && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#E8A830" }}>
                          <CheckCircle2 size={9} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium truncate" style={{ color: "oklch(0.90 0.02 280)" }}>{displayName}</div>
                      {hasWid ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Fingerprint size={9} style={{ color: "#D4AF37" }} />
                          <span className="text-[9px] font-heading tracking-wider" style={{ color: "#D4AF37" }}>WITNESSED</span>
                        </div>
                      ) : (
                        <div className="text-[10px] mt-0.5" style={{ color: "oklch(0.45 0.02 280)" }}>Creator</div>
                      )}
                    </div>
                    <ChevronRight size={13} style={{ color: "oklch(0.40 0.02 280)", flexShrink: 0 }} />
                  </div>
                ) : !authLoading ? (
                  <a
                    href={getLoginUrl()}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ background: "oklch(0.75 0.18 85 / 0.12)", border: "1px solid oklch(0.75 0.18 85 / 0.25)" }}
                  >
                    <LogIn size={16} style={{ color: "oklch(0.75 0.18 85)" }} />
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: "oklch(0.85 0.1 85)" }}>Sign In</div>
                      <div className="text-[11px]" style={{ color: "oklch(0.45 0.02 280)" }}>Upload &amp; earn tips</div>
                    </div>
                  </a>
                ) : null}
              </div>

              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-md w-full transition-all mt-3"
                  style={{ color: "oklch(0.50 0.10 25)", border: "1px solid oklch(0.50 0.10 25 / 0.20)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "oklch(0.50 0.10 25 / 0.10)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <LogOut size={13} className="flex-shrink-0" />
                  <span className="text-[12px] font-body">Log Out</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* What's New Modal */}
      {whatsNewOpen && (
        <WhatsNewModal forceOpen={true} onClose={() => setWhatsNewOpen(false)} />
      )}
    </div>
  );
}
