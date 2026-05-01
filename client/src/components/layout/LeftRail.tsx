/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LeftRail (System Architecture v1.0)
   72px icon-only mode switcher. Always visible on desktop.
   Click → opens corresponding ContextDrawer.
   Active mode: gold glow.
═══════════════════════════════════════════════════════════════════ */
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Home, Compass, Rocket, ShoppingBag,
  Upload, LayoutDashboard, Archive, Wrench,
} from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

export type ContextDrawerMode =
  | "HOME"
  | "EXPLORE"
  | "PROJECTS"
  | "MARKETPLACE"
  | "UPLOAD"
  | "DASHBOARD"
  | "ARCHIVE"
  | "BUILD"
  | null;

interface RailItem {
  mode: ContextDrawerMode;
  icon: React.ElementType;
  label: string;
  path?: string;           // if set, clicking navigates instead of opening drawer
  authOnly?: boolean;
}

const RAIL_ITEMS: RailItem[] = [
  { mode: "HOME",        icon: Home,            label: "Home",        path: "/"            },
  { mode: "EXPLORE",     icon: Compass,         label: "Explore",     path: "/explore"     },
  { mode: "PROJECTS",    icon: Rocket,          label: "Projects",    path: "/projects"    },
  { mode: "MARKETPLACE", icon: ShoppingBag,     label: "Marketplace", path: "/marketplace" },
  { mode: "UPLOAD",      icon: Upload,          label: "Upload",      path: "/upload",     authOnly: true },
  { mode: "DASHBOARD",   icon: LayoutDashboard, label: "Dashboard",   path: "/dashboard",  authOnly: true },
  { mode: "ARCHIVE",     icon: Archive,         label: "Archive",     path: "/archive",    authOnly: true },
  { mode: "BUILD",       icon: Wrench,          label: "Build",                            authOnly: true },
];

interface LeftRailProps {
  activeDrawer: ContextDrawerMode;
  onDrawerToggle: (mode: ContextDrawerMode) => void;
}

export default function LeftRail({ activeDrawer, onDrawerToggle }: LeftRailProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  const isActive = (item: RailItem) => {
    if (!item.path) return activeDrawer === item.mode;
    if (item.path === "/" && (location === "/" || location === "/home")) return true;
    return location === item.path || (item.path !== "/" && location.startsWith(item.path + "/"));
  };

  return (
    <aside
      className="hidden lg:flex flex-col items-center py-3 gap-1 flex-shrink-0"
      style={{
        width: 72,
        background: "rgba(10,9,7,0.95)",
        borderRight: "1px solid rgba(212,175,55,0.08)",
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate("/")}
        className="mb-3 flex items-center justify-center"
        title="Living Nexus"
        style={{ width: 40, height: 40 }}
      >
        <img src={LOGO_URL} alt="LN" style={{ width: 32, height: 32, borderRadius: 8 }} />
      </button>

      {/* Mode items */}
      {RAIL_ITEMS.map((item) => {
        if (item.authOnly && !user) return null;
        const Icon = item.icon;
        const active = isActive(item);
        const drawerOpen = activeDrawer === item.mode;

        return (
          <button
            key={item.mode}
            title={item.label}
            onClick={() => {
              if (item.path) {
                navigate(item.path);
                onDrawerToggle(null); // close drawer on direct navigation
              } else {
                onDrawerToggle(drawerOpen ? null : item.mode);
              }
            }}
            className="relative flex flex-col items-center justify-center gap-1 transition-all duration-150 rounded-xl"
            style={{
              width: 52,
              height: 52,
              background: active || drawerOpen ? "rgba(212,175,55,0.10)" : "transparent",
              color: active || drawerOpen ? "#D4AF37" : "rgba(255,255,255,0.45)",
              boxShadow: active || drawerOpen
                ? "0 0 12px rgba(212,175,55,0.25), inset 0 0 8px rgba(212,175,55,0.06)"
                : "none",
            }}
            onMouseEnter={e => {
              if (!active && !drawerOpen) {
                (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.75)";
                (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)";
              }
            }}
            onMouseLeave={e => {
              if (!active && !drawerOpen) {
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)";
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }
            }}
          >
            <Icon size={18} />
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1 }}>
              {item.label.toUpperCase()}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
