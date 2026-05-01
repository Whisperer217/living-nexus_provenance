/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LeftRail v4 (Two-State Drawer Model)
   Desktop only (hidden on mobile). Fixed 72px column.

   Two-state contract:
   - drawerOpen: boolean  → controls visibility
   - activeMode: NavMode  → controls meaning / section highlight
   
   Clicking an icon:
   - If activeMode !== icon.id → set activeMode = icon.id, open drawer
   - If activeMode === icon.id → toggle drawerOpen (close if open, open if closed)
   
   Rail never navigates directly. Drawer handles all routing.
═══════════════════════════════════════════════════════════════════ */
import { useLocation } from "wouter";
import { Home, Compass, User, Upload, Archive } from "lucide-react";

export type NavMode = "home" | "explore" | "profile" | "upload" | "archive";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

const RAIL_ITEMS: Array<{ id: NavMode; icon: React.ElementType; label: string; path: string }> = [
  { id: "home",    icon: Home,    label: "Home",    path: "/"        },
  { id: "explore", icon: Compass, label: "Explore", path: "/explore" },
  { id: "profile", icon: User,    label: "Profile", path: "/profile" },
  { id: "upload",  icon: Upload,  label: "Upload",  path: "/upload"  },
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

  return (
    <aside
      className="hidden lg:flex flex-col items-center py-3 gap-1"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        width: 72,
        background: "rgba(10,9,7,0.97)",
        borderRight: "1px solid rgba(212,175,55,0.08)",
        zIndex: 200,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Logo — opens drawer for current activeMode (or "home" if none) */}
      <button
        onClick={() => onRailClick(activeMode ?? "home")}
        className="mb-3 flex items-center justify-center rounded-xl transition-all hover:bg-white/[0.04]"
        title="Navigation"
        aria-label="Open navigation"
        style={{ width: 40, height: 40 }}
      >
        <img src={LOGO_URL} alt="LN" style={{ width: 32, height: 32, borderRadius: 8 }} />
      </button>

      {/* Divider */}
      <div className="w-8 h-px mb-2" style={{ background: "rgba(196,154,40,0.12)" }} />

      {/* Nav icons */}
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
            onClick={() => onRailClick(id)}
            className="relative flex flex-col items-center justify-center gap-0.5 transition-all duration-150 rounded-xl"
            style={{
              width: 52,
              height: 52,
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
    </aside>
  );
}
