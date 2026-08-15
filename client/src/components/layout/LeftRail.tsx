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
import { useLocation } from "wouter";
import { Home, Compass, Upload, Archive, ExternalLink, LayoutGrid } from "lucide-react";
import { LOOP_PRODUCT, DISCORD_COMMUNITY_URL } from "@/lib/loopProduct";
import { DiscordGlyph } from "@/components/icons/DiscordGlyph";

export type NavMode = "home" | "explore" | "upload" | "manage" | "archive";

const LOGO_URL =
  "/manus-storage/living-nexus-logo-2025_19c2d497.png";

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
  const [location] = useLocation();

  const isRouteActive = (path: string) => {
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  // Desktop: stopPropagation prevents ContextDrawer backdrop from closing on rail click
  const handleDesktopClick = (e: React.MouseEvent, mode: NavMode) => {
    e.stopPropagation();
    onRailClick(mode);
  };

  // Mobile: same as desktop — rail opens ContextDrawer; the drawer navigates.
  const handleMobileClick = (mode: NavMode) => {
    onRailClick(mode);
  };

  // ── Shared item renderer ──────────────────────────────────────────
  const renderItem = (
    { id, icon: Icon, label, path }: typeof RAIL_ITEMS[0],
    isMobile: boolean
  ) => {
    const routeActive = isRouteActive(path);
    const modeActive = activeMode === id;
    const active = (drawerOpen && modeActive) || routeActive;

    return (
      <button
        key={id}
        title={label}
        aria-label={label}
        onClick={isMobile
          ? () => handleMobileClick(id)
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
          ? () => handleMobileClick("home")
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
          color: "var(--ln-gold)",
          background: "transparent",
          textDecoration: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--ln-gold) 12%, transparent)";
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
        className="hidden lg:flex flex-col items-center py-3 gap-1 shrink-0"
        style={{
          position: "relative",
          width: 72,
          height: "100%",
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
          zIndex: 310,
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
