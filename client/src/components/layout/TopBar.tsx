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
  Home, Compass, User, Upload, Shield,
  LayoutDashboard, Archive, Sparkles, Terminal,
  BookOpen, Star, Heart, Eye, Fingerprint, Scale,
  LogIn, LogOut, Bell, Menu, X, ChevronRight,
  CheckCircle2, Zap, Rocket, ShoppingBag,
} from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

// ── Core nav items (always visible in top bar) ─────────────────────
const CORE_NAV = [
  { label: "Home",            icon: Home,          path: "/"          },
  { label: "Explore",         icon: Compass,       path: "/explore"   },
  { label: "Projects",        icon: Rocket,        path: "/projects"  },
  { label: "Marketplace",     icon: ShoppingBag,   path: "/marketplace", gold: true },
  { label: "Upload",          icon: Upload,        path: "/upload"    },
  { label: "Dashboard",       icon: LayoutDashboard, path: "/dashboard", authOnly: true },
  { label: "Archive",         icon: Archive,       path: "/archive",  authOnly: true, archiveBadge: true },
];

// ── Drawer sections ────────────────────────────────────────────────
const DRAWER_NAVIGATE = [
  { label: "Home",        icon: Home,        path: "/"           },
  { label: "Explore",     icon: Compass,     path: "/explore"    },
  { label: "Projects",    icon: Rocket,      path: "/projects"   },
  { label: "Marketplace", icon: ShoppingBag, path: "/marketplace", gold: true },
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

  // LN Identity Palette v2.31 — coal background, gold accent hierarchy
  const NAV_BG = isWarm ? "rgba(55,68,85,0.72)" : "rgba(10,8,6,0.97)";       /* --ln-void @ 97% */
  const NAV_BORDER = isWarm ? "rgba(100,125,150,0.22)" : "rgba(196,154,40,0.22)"; /* --ln-gold bottom accent */
  const DRAWER_BG = isWarm ? "rgba(42,55,70,0.80)" : "rgba(17,16,9,0.98)";   /* --ln-coal @ 98% */
  const DRAWER_BORDER = isWarm ? "rgba(100,125,150,0.18)" : "rgba(196,154,40,0.15)";
  const NAV_TEXT = isWarm ? "rgba(200,212,228,0.85)" : "#D4C9B0";            /* --ln-bone — brighter for near-black bg */
  const NAV_TEXT_MUTED = isWarm ? "rgba(148,165,185,0.60)" : "#A89880";      /* --ln-smoke — lifted for near-black bg */
  const NAV_SECTION_LABEL = isWarm ? "rgba(148,165,185,0.45)" : "rgba(196,154,40,0.75)"; /* --ln-gold muted */
  const NAV_SECTION_BORDER = isWarm ? "rgba(100,125,150,0.15)" : "rgba(46,43,34,0.80)";  /* --ln-ash */
  const NAV_ACTIVE_BG = isWarm ? "rgba(100,125,150,0.18)" : "rgba(196,154,40,0.10)";     /* --ln-gold @ 10% */
  const NAV_ACTIVE_BORDER = isWarm ? "rgba(120,148,178,0.32)" : "rgba(196,154,40,0.30)"; /* --ln-gold @ 30% */
  const NAV_ACTIVE_TEXT = isWarm ? "rgba(180,202,230,0.95)" : "#E8B840";     /* --ln-gold-hot */
  const LOGO_DIVIDER = isWarm ? "rgba(100,125,150,0.20)" : "rgba(46,43,34,0.80)";  /* --ln-ash */
  const RIGHT_DIVIDER = isWarm ? "rgba(100,125,150,0.20)" : "rgba(46,43,34,0.80)";

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
        style={{ background: "rgba(74,222,128,0.2)", color: "var(--ln-seal-bright)", border: "1px solid rgba(58,138,86,0.3)" }}>
        LIVE
      </span>
    ) : item.archiveBadge && archiveSongCount > 0 ? (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto min-w-[18px] text-center"
        style={{ background: "rgba(196,154,40,0.12)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}>
        {archiveSongCount > 99 ? "99+" : archiveSongCount}
      </span>
    ) : item.notifBadge && unreadCount > 0 ? (
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto min-w-[18px] text-center animate-pulse"
        style={{ background: "var(--ln-ember)", color: "white" }}>
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
          fontFamily: "'Cinzel', serif",
          fontSize: "11px",
          letterSpacing: "0.05em",
        }}
        onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = isWarm ? "rgba(120,145,170,0.18)" : "rgba(63,74,80,0.5)"; (e.currentTarget as HTMLElement).style.color = "var(--ln-parchment)"; } }}
        onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = NAV_TEXT_MUTED; } }}
      >
        <Icon size={13} className="flex-shrink-0" style={{ color: active ? "#E8B840" : "#B08840" }} />
        <span className="flex-1">{item.label}</span>
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
        <div className="flex items-center gap-2.5 px-4 flex-shrink-0 cursor-pointer"
          style={{ borderRight: `1px solid ${LOGO_DIVIDER}`, height: "100%", paddingRight: "16px" }}
          onClick={() => goTo("/")}
        >
          <img src={LOGO_URL} alt="Living Nexus" className="w-8 h-8 object-contain" />
          <div>
            <div className="font-display text-sm gold-shimmer leading-tight" style={{ letterSpacing: "0.04em" }}>Living Nexus</div>
            <div className="text-[8px] tracking-[0.18em] font-heading" style={{ color: "#8B6914" }}>CREATIVE PROVENANCE</div>
          </div>
        </div>

        {/* Core nav pills */}
        <nav className="flex items-center gap-0.5 px-3 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CORE_NAV.map(item => {
            if (item.authOnly && !user && !authLoading) return null;
            const active = isActive(item.path);
            const isGold = !!(item as any).gold;
            const archiveBadge = item.archiveBadge && archiveSongCount > 0
              ? (archiveSongCount > 99 ? "99+" : String(archiveSongCount))
              : null;

            // Gold Marketplace pill — always has gold border, glows on active/hover
            if (isGold) {
              return (
                <button
                  key={item.label}
                  onClick={() => goTo(item.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0 relative"
                  style={{
                    fontSize: "11px",
                    fontFamily: "'Cinzel', serif",
                    fontWeight: active ? 700 : 600,
                    letterSpacing: "0.08em",
                    background: active
                      ? "linear-gradient(135deg, rgba(196,154,40,0.22), rgba(232,184,64,0.12))"
                      : "linear-gradient(135deg, rgba(196,154,40,0.10), rgba(140,100,20,0.06))",
                    border: active
                      ? "1px solid rgba(232,184,64,0.65)"
                      : "1px solid rgba(196,154,40,0.40)",
                    color: active ? "#FFD060" : "#E8B840",
                    boxShadow: active
                      ? "0 0 14px rgba(196,154,40,0.30), inset 0 0 8px rgba(196,154,40,0.08)"
                      : "0 0 6px rgba(196,154,40,0.12)",
                    textShadow: active ? "0 0 10px rgba(255,208,96,0.5)" : "none",
                    marginLeft: 4,
                    marginRight: 4,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = "#FFD060";
                    el.style.borderColor = "rgba(232,184,64,0.65)";
                    el.style.boxShadow = "0 0 14px rgba(196,154,40,0.30), inset 0 0 8px rgba(196,154,40,0.08)";
                    el.style.textShadow = "0 0 10px rgba(255,208,96,0.4)";
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.color = "#E8B840";
                      el.style.borderColor = "rgba(196,154,40,0.40)";
                      el.style.boxShadow = "0 0 6px rgba(196,154,40,0.12)";
                      el.style.textShadow = "none";
                    }
                  }}
                >
                  <item.icon size={13} style={{ color: "inherit" }} />
                  <span>{item.label}</span>
                  {/* shimmer underline always visible for gold pill */}
                  <span className="absolute bottom-0 left-3 right-3 h-[1px]"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(196,154,40,0.6), transparent)" }} />
                </button>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => goTo(item.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0 group relative"
                style={{
                  fontSize: "11px",
                  fontFamily: "'Cinzel', serif",
                  fontWeight: active ? 600 : 500,
                  letterSpacing: "0.06em",
                  background: active ? NAV_ACTIVE_BG : "transparent",
                  border: active ? `1px solid ${NAV_ACTIVE_BORDER}` : "1px solid transparent",
                  color: active ? "var(--ln-parchment)" : NAV_TEXT,
                  textShadow: active ? "0 0 12px rgba(196,154,40,0.3)" : "none",
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = "var(--ln-parchment)"; (e.currentTarget as HTMLElement).style.textShadow = "0 0 10px rgba(196,154,40,0.2)"; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = NAV_TEXT; (e.currentTarget as HTMLElement).style.textShadow = "none"; } }}
              >
                <item.icon size={13} style={{ color: active ? "#E8B840" : "#C49A28" }} />
                <span>{item.label}</span>
                {/* gold underline on active */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #C49A28, transparent)" }} />
                )}
                {archiveBadge && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                    style={{ background: "rgba(230,205,174,0.18)", color: "#E8A830" }}>
                    {archiveBadge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right zone */}
        <div className="flex items-center gap-2 px-4 flex-shrink-0"
          style={{ borderLeft: `1px solid ${RIGHT_DIVIDER}`, height: "100%", paddingLeft: "16px" }}
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
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--ln-parchment)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--ln-gold)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.2)"; }}
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
              fontSize: "11px", fontWeight: 700,
              background: "#C49A28",
              color: "#0A0806",
              border: "none",
              borderRadius: "2px",
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
              style={{ color: "#6B6555", minWidth: 44, minHeight: 44, padding: "0 10px" }}
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
                  background: "linear-gradient(135deg, #1C1A14, #3D3A2E)",
                  boxShadow: hasWid ? "0 0 0 2px #C49A28, 0 0 10px rgba(196,154,40,0.25)" : "none",
                }}
              >
                {avatar
                  ? <img src={avatar} alt="avatar" className="w-full h-full object-cover rounded-full" style={{ objectPosition: user?.avatarObjectPosition ?? "50% 50%" }} />
                  : displayName.charAt(0).toUpperCase()
                }
              </div>
              {hasWid && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "#C49A28" }}>
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
              background: "rgba(196,154,40,0.08)",
              border: "1px solid rgba(196,154,40,0.20)",
              color: "#C9C0A8",
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
            style={{ color: drawerOpen ? "#E8B840" : "#6B6555" }}
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
              <div className="text-[9px] font-heading tracking-[0.18em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}`, fontFamily: "'Cinzel', serif", letterSpacing: "0.18em" }}>
                Navigate
              </div>
              <div className="space-y-0.5">
                {DRAWER_NAVIGATE.map(item => renderDrawerItem(item))}
              </div>
            </div>

            {/* CREATE */}
            <div>
              <div className="text-[9px] font-heading tracking-[0.18em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}`, fontFamily: "'Cinzel', serif", letterSpacing: "0.18em" }}>
                Create
              </div>
              <div className="space-y-0.5">
                {DRAWER_CREATE.map(item => renderDrawerItem(item))}
              </div>
            </div>

            {/* DISCOVER */}
            <div>
              <div className="text-[9px] font-heading tracking-[0.18em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}`, fontFamily: "'Cinzel', serif", letterSpacing: "0.18em" }}>
                Discover
              </div>
              <div className="space-y-0.5">
                {DRAWER_DISCOVER.map(item => renderDrawerItem(item))}
              </div>
            </div>

            {/* ACCOUNT */}
            <div>
              <div className="text-[9px] font-heading tracking-[0.18em] uppercase mb-3 pb-2"
                style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}`, fontFamily: "'Cinzel', serif", letterSpacing: "0.18em" }}>
                Account
              </div>
              <div className="space-y-0.5">
                {DRAWER_ACCOUNT.map(item => renderDrawerItem(item))}
                <button
                  onClick={() => { setWhatsNewOpen(true); setDrawerOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition-all"
                  style={{ color: "var(--ln-iron)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(44,52,56,0.6)"; (e.currentTarget as HTMLElement).style.color = "var(--ln-parchment)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--ln-iron)"; }}
                >
                  <Sparkles size={13} className="flex-shrink-0" />
                  <span className="text-[12px] font-body flex-1">What's New</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)" }}>v2.24</span>
                </button>
              </div>
            </div>

            {/* USER CARD */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="text-[9px] font-heading tracking-[0.18em] uppercase mb-3 pb-2"
                  style={{ color: NAV_SECTION_LABEL, borderBottom: `1px solid ${NAV_SECTION_BORDER}`, fontFamily: "'Cinzel', serif", letterSpacing: "0.18em" }}>
                  {user ? "Signed In As" : "Platform"}
                </div>
                {!authLoading && user ? (
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: "rgba(44,52,56,0.6)", border: "1px solid rgba(44,52,56,0.5)" }}
                    onClick={() => goTo("/profile")}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
                        style={{
                          background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
                          boxShadow: hasWid ? "0 0 0 2px #C49A28" : "none",
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
                      <div className="text-[13px] font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{displayName}</div>
                      {hasWid ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Fingerprint size={9} style={{ color: "var(--ln-gold)" }} />
                          <span className="text-[9px] font-heading tracking-wider" style={{ color: "var(--ln-gold)" }}>WITNESSED</span>
                        </div>
                      ) : (
                        <div className="text-[10px] mt-0.5" style={{ color: "var(--ln-iron)" }}>Creator</div>
                      )}
                    </div>
                    <ChevronRight size={13} style={{ color: "var(--ln-iron)", flexShrink: 0 }} />
                  </div>
                ) : !authLoading ? (
                  <a
                    href={getLoginUrl()}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)" }}
                  >
                    <LogIn size={16} style={{ color: "var(--ln-gold)" }} />
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: "var(--ln-parchment)" }}>Sign In</div>
                      <div className="text-[11px]" style={{ color: "var(--ln-iron)" }}>Upload &amp; earn tips</div>
                    </div>
                  </a>
                ) : null}
              </div>

              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-md w-full transition-all mt-3"
                  style={{ color: "var(--ln-smoke)", border: "1px solid rgba(63,74,80,0.2)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(170,142,100,0.1)"; }}
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
