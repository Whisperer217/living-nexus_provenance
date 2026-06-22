/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LeftRail v6 (Unified Navigation Authority)

   THE SIDEBAR IS THE NAVIGATION AUTHORITY ACROSS ALL VIEWPORT SIZES.
   Mobile does not have a separate navigation system.
   Mobile behavior is achieved through presentation changes only
   (off-canvas transform), not through alternative components.

   Desktop: fixed 72px column, always visible, z-310
   Mobile:  off-canvas (translateX(-100%)), slides in when mobileOpen=true
            NO body lock, NO position:fixed on body, NO overlayController

   The backdrop is a dismissal surface only — it does not lock scroll,
   capture touch events globally, or manipulate the body in any way.
═══════════════════════════════════════════════════════════════════ */
import { useLocation, useRouter } from "wouter";
import { Home, Compass, User, Upload, Archive, ExternalLink } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export type NavMode = "home" | "explore" | "profile" | "upload" | "archive";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";

const RAIL_ITEMS: Array<{
  id: NavMode;
  icon: React.ElementType;
  label: string;
  path: string;
  authRequired?: boolean;
}> = [
  { id: "home",    icon: Home,    label: "Home",     path: "/"        },
  { id: "explore", icon: Compass, label: "Explore",  path: "/explore" },
  { id: "profile", icon: User,    label: "Profile",  path: "/profile", authRequired: true },
  { id: "upload",  icon: Upload,  label: "Register", path: "/upload",  authRequired: true },
  { id: "archive", icon: Archive, label: "Archive",  path: "/archive", authRequired: true },
];

interface LeftRailProps {
  // Desktop drawer state (unchanged)
  drawerOpen: boolean;
  activeMode: NavMode | null;
  onRailClick: (mode: NavMode) => void;
  // Mobile state — owned by MainLayout, passed down
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function LeftRail({
  drawerOpen,
  activeMode,
  onRailClick,
  mobileOpen = false,
  onMobileClose,
}: LeftRailProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const isRouteActive = (path: string) => {
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  // Desktop: stopPropagation prevents ContextDrawer backdrop from closing on rail click
  const handleDesktopClick = (e: React.MouseEvent, mode: NavMode) => {
    e.stopPropagation();
    onRailClick(mode);
  };

  // Mobile: navigate directly, then close the sidebar
  const handleMobileClick = (path: string, authRequired?: boolean) => {
    if (authRequired && !user) {
      window.location.href = getLoginUrl(path);
      return;
    }
    navigate(path);
    onMobileClose?.();
  };

  // ── Shared item renderer ──────────────────────────────────────────
  const renderItem = (
    { id, icon: Icon, label, path, authRequired }: typeof RAIL_ITEMS[0],
    isMobile: boolean
  ) => {
    const routeActive = isRouteActive(path);
    const modeActive = activeMode === id;
    const active = isMobile ? routeActive : ((drawerOpen && modeActive) || routeActive);

    return (
      <button
        key={id}
        title={label}
        aria-label={label}
        onClick={isMobile
          ? () => handleMobileClick(path, authRequired)
          : (e) => handleDesktopClick(e as React.MouseEvent, id)
        }
        className="relative flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl"
        style={{
          width: isMobile ? 72 : 60,
          height: 56,
          background: active ? "rgba(212,175,55,0.10)" : "transparent",
          color: active ? "#D4AF37" : "rgba(255,255,255,0.62)",
          boxShadow: active
            ? "0 0 12px rgba(212,175,55,0.20), inset 0 0 8px rgba(212,175,55,0.05)"
            : "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.70)";
            (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)";
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.62)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {/* Active indicator bar */}
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
            style={{ width: 3, height: 22, background: "#D4AF37" }}
          />
        )}
        <Icon size={18} />
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1 }}>
          {label.toUpperCase()}
        </span>
      </button>
    );
  };

  // ── Shared inner content (same icons, same labels, same hierarchy) ─
  const railContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <button
        onClick={isMobile
          ? () => handleMobileClick("/")
          : (e) => handleDesktopClick(e as React.MouseEvent, activeMode ?? "home")
        }
        className="mb-3 flex items-center justify-center rounded-xl transition-all hover:bg-white/[0.04]"
        title="Navigation"
        aria-label="Living Nexus home"
        style={{ width: 56, height: 48, WebkitTapHighlightColor: "transparent" }}
      >
        <img src={LOGO_URL} alt="LN" style={{ width: 32, height: 32, borderRadius: 8 }} />
      </button>

      {/* Divider */}
      <div className="w-8 h-px mb-2" style={{ background: "rgba(196,154,40,0.12)" }} />

      {/* Nav items */}
      {RAIL_ITEMS.map(item => renderItem(item, isMobile))}

      {/* Divider before companion tools */}
      <div className="w-8 h-px mt-2 mb-2" style={{ background: "rgba(196,154,40,0.12)" }} />

      {/* Celestial Codex */}
      <a
        href="https://bardsgrim-qmts67ka.manus.space/"
        target="_blank"
        rel="noopener noreferrer"
        title="Celestial Codex"
        aria-label="Celestial Codex — open companion tool"
        onClick={e => { e.stopPropagation(); if (isMobile) onMobileClose?.(); }}
        className="relative flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl no-underline"
        style={{
          width: isMobile ? 72 : 60,
          height: 56,
          color: "rgba(212,175,55,0.65)",
          background: "transparent",
          textDecoration: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.80)";
          (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.65)";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <ExternalLink size={15} />
        <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1, textAlign: "center" }}>
          CODEX
        </span>
      </a>
    </>
  );

  return (
    <>
      {/* ── DESKTOP RAIL (lg+): always visible, fixed 72px ── */}
      <aside
        data-rail="true"
        className="hidden lg:flex flex-col items-center py-3 gap-1"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 72,
          background: "rgba(0,0,0,0.98)",
          borderRight: "1px solid rgba(196,154,40,0.12)",
          zIndex: 310,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {railContent(false)}
      </aside>

      {/* ── MOBILE RAIL (< lg): off-canvas, slides in via transform only ── */}
      {/* Backdrop — dismissal surface ONLY. No body lock. No touch capture. */}
      <div
        aria-hidden="true"
        className="lg:hidden"
        onClick={onMobileClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 299,
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 220ms ease",
          // DOCTRINE: backdrop does NOT touch body, overflow, touch-action, or scroll position
        }}
      />

      {/* Sidebar panel — transform only, GPU-composited, no layout reflow */}
      <aside
        className="lg:hidden flex flex-col items-center py-3 gap-1"
        aria-label="Mobile navigation"
        aria-hidden={!mobileOpen}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 72,
          background: "rgba(0,0,0,0.98)",
          borderRight: "1px solid rgba(196,154,40,0.12)",
          zIndex: 300,
          overflowY: "auto",
          overflowX: "hidden",
          // Off-canvas transform — the ONLY mechanism for show/hide
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      >
        {railContent(true)}
      </aside>
    </>
  );
}
