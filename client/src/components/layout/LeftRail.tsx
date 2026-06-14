/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LeftRail v5 (Interaction Boundary Fix)
   Desktop only (hidden on mobile). Fixed 72px column.

   Interaction contract:
   - All clicks call e.stopPropagation() to prevent bubbling to
     the ContextDrawer's outside-click handler.
   - Rail is marked data-rail="true" so ContextDrawer can include
     it in the "inside" check.
   - Buttons are 56px tall (full-width) for reliable hit area.
   - Toggle logic lives in MainLayout.handleRailClick:
       if (drawerOpen && activeMode === clickedMode) → close
       else → set activeMode = clickedMode, open
═══════════════════════════════════════════════════════════════════ */
import { useLocation } from "wouter";
import { Home, Compass, User, Upload, Archive, ExternalLink } from "lucide-react";

export type NavMode = "home" | "explore" | "profile" | "upload" | "archive";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";

const RAIL_ITEMS: Array<{ id: NavMode; icon: React.ElementType; label: string; path: string }> = [
  { id: "home",    icon: Home,    label: "Home",    path: "/"        },
  { id: "explore", icon: Compass, label: "Explore", path: "/explore" },
  { id: "profile", icon: User,    label: "Profile", path: "/profile" },
  { id: "upload",  icon: Upload,  label: "Register",  path: "/upload"  },
  { id: "archive", icon: Archive, label: "Archive", path: "/archive" },
];

interface LeftRailProps {
  drawerOpen: boolean;
  activeMode: NavMode | null;
  onRailClick: (mode: NavMode) => void;
}

export default function LeftRail({ drawerOpen, activeMode, onRailClick }: LeftRailProps) {
  const [location] = useLocation();

  const isRouteActive = (path: string) => {
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  /* stopPropagation wrapper — prevents click from bubbling to the
     ContextDrawer backdrop's outside-click handler, which would
     immediately close the drawer before the open logic fires. */
  const handleClick = (e: React.MouseEvent, mode: NavMode) => {
    e.stopPropagation();
    onRailClick(mode);
  };

  return (
    <aside
      /* data-rail="true" lets ContextDrawer include this element in
         its "inside the system" check so it doesn't close on rail clicks */
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
        zIndex: 310,  /* above drawer backdrop (299) and panel (300) — rail is always visible */
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Logo — opens drawer for current activeMode (or "home" if none) */}
      <button
        onClick={(e) => handleClick(e, activeMode ?? "home")}
        className="mb-3 flex items-center justify-center rounded-xl transition-all hover:bg-white/[0.04]"
        title="Navigation"
        aria-label="Open navigation"
        style={{ width: 56, height: 48 }}
      >
        <img src={LOGO_URL} alt="LN" style={{ width: 32, height: 32, borderRadius: 8 }} />
      </button>

      {/* Divider */}
      <div className="w-8 h-px mb-2" style={{ background: "rgba(196,154,40,0.12)" }} />

      {/* Nav icons — full-width 56px buttons for reliable hit area */}
      {RAIL_ITEMS.map(({ id, icon: Icon, label, path }) => {
        const routeActive = isRouteActive(path);
        const modeActive = activeMode === id;
        // Visually active if: drawer is open for this mode, OR route matches
        const active = (drawerOpen && modeActive) || routeActive;

        return (
          <button
            key={id}
            title={label}
            aria-label={label}
            onClick={(e) => handleClick(e, id)}
            className="relative flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl"
            style={{
              width: 60,   /* wider hit area — fills most of the 72px rail */
              height: 56,  /* taller hit area — easier to tap/click */
              background: active ? "rgba(212,175,55,0.10)" : "transparent",
              color: active ? "#D4AF37" : "rgba(255,255,255,0.40)",
              boxShadow: active
                ? "0 0 12px rgba(212,175,55,0.20), inset 0 0 8px rgba(212,175,55,0.05)"
                : "none",
            }}
            onMouseEnter={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.70)";
                (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)";
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.40)";
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
      })}

      {/* Divider before companion tools */}
      <div className="w-8 h-px mt-2 mb-2" style={{ background: "rgba(196,154,40,0.12)" }} />

      {/* Celestial Codex — companion external tool */}
      <a
        href="https://bardsgrim-qmts67ka.manus.space/"
        target="_blank"
        rel="noopener noreferrer"
        title="Celestial Codex"
        aria-label="Celestial Codex — open companion tool"
        onClick={e => e.stopPropagation()}
        className="relative flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl no-underline"
        style={{
          width: 60,
          height: 56,
          color: "rgba(212,175,55,0.45)",
          background: "transparent",
          textDecoration: "none",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.80)";
          (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.45)";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <ExternalLink size={15} />
        <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1, textAlign: "center" }}>
          CODEX
        </span>
      </a>
    </aside>
  );
}
