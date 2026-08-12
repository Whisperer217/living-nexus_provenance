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
import { Home, Compass, Upload, Archive, ExternalLink, Shield, LayoutGrid } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useUploadEngine } from "@/contexts/UploadEngineContext";
import { LOOP_PRODUCT, DISCORD_COMMUNITY_URL } from "@/lib/loopProduct";

export type NavMode = "home" | "explore" | "upload" | "manage" | "archive";

const LOGO_URL =
  "/manus-storage/living-nexus-logo-2025_19c2d497.png";

function DiscordGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const RAIL_ITEMS: Array<{
  id: NavMode;
  icon: React.ElementType;
  label: string;
  path: string;
  authRequired?: boolean;
}> = [
  { id: "home",    icon: Home,       label: "Home",    path: "/"        },
  { id: "explore", icon: Compass,    label: "Explore", path: "/explore" },
  { id: "upload",  icon: Upload,     label: "Register",path: "/manifest", authRequired: true },
  { id: "manage",  icon: LayoutGrid, label: "Manage",  path: "/manage",   authRequired: true },
  { id: "archive", icon: Archive,    label: "Archive", path: "/archive",  authRequired: true },
];

interface LeftRailProps {
  // Desktop drawer state (unchanged)
  drawerOpen: boolean;
  activeMode: NavMode | null;
  onRailClick: (mode: NavMode) => void;
  // Mobile state — owned by MainLayout, passed down
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  // Badge counts
  archiveSongCount?: number;
}

export default function LeftRail({
  drawerOpen,
  activeMode,
  onRailClick,
  mobileOpen = false,
  onMobileClose,
  archiveSongCount = 0,
}: LeftRailProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { openEngine } = useUploadEngine();

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
    // Upload item opens the engine instead of navigating
    if (path === "/manifest") { openEngine(); onMobileClose?.(); return; }
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
          color: active ? "var(--ln-gold)" : "var(--ln-smoke)",
          boxShadow: active
            ? "0 0 12px color-mix(in srgb, var(--ln-gold) 20%, transparent), inset 0 0 8px color-mix(in srgb, var(--ln-gold) 5%, transparent)"
            : "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "var(--ln-gold)";
            (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--ln-gold) 8%, transparent)";
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.color = "var(--ln-smoke)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {/* Active indicator bar */}
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
            style={{ width: 3, height: 22, background: "var(--ln-gold)" }}
          />
        )}
        <div className="relative">
          <Icon size={18} />
          {id === "archive" && archiveSongCount > 0 && (
            <span
              className="absolute -top-1.5 -right-2 flex items-center justify-center rounded-full"
              style={{
                minWidth: 14,
                height: 14,
                fontSize: 8,
                fontWeight: 700,
                lineHeight: 1,
                padding: "0 3px",
                background: "rgba(196,154,40,0.85)",
                color: "#0A0806",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {archiveSongCount > 99 ? "99+" : archiveSongCount}
            </span>
          )}
        </div>
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
        aria-label={`${LOOP_PRODUCT.name} home`}
        style={{ width: 56, height: 48, WebkitTapHighlightColor: "transparent" }}
      >
        <img src={LOGO_URL} alt={LOOP_PRODUCT.name} style={{ width: 32, height: 32, borderRadius: 8 }} />
      </button>

      {/* Divider */}
      <div className="w-8 h-px mb-2" style={{ background: "rgba(196,154,40,0.12)" }} />

      {/* Nav items */}
      {RAIL_ITEMS.map(item => renderItem(item, isMobile))}

      {/* Divider before companion tools */}
      <div className="w-8 h-px mt-2 mb-2" style={{ background: "rgba(196,154,40,0.12)" }} />

      {/* Discord community */}
      <a
        href={DISCORD_COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Join Discord"
        aria-label="Join Living Nexus on Discord"
        onClick={e => { e.stopPropagation(); if (isMobile) onMobileClose?.(); }}
        className="relative flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl no-underline"
        style={{
          width: isMobile ? 72 : 60,
          height: 56,
          color: "#A5B4FC",
          background: "transparent",
          textDecoration: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "rgba(88,101,242,0.12)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <DiscordGlyph size={15} />
        <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1, textAlign: "center" }}>
          DISCORD
        </span>
      </a>

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
          background: "var(--ln-panel)",
          borderRight: "1px solid var(--ln-panel-border)",
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
          background: "var(--ln-panel)",
          borderRight: "1px solid var(--ln-panel-border)",
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
