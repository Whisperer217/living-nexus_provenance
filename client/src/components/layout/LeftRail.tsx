/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LeftRail (Isomorphic Navigation System v2.0)
   72px icon-only trigger layer. Always visible on desktop (≥1024px).

   CONTRACT:
   - Rail NEVER navigates directly.
   - Every click opens the ContextDrawer for that mode.
   - Drawer handles all navigation.
═══════════════════════════════════════════════════════════════════ */
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Home, Compass, Rocket, ShoppingBag,
  Upload, LayoutDashboard, Archive, Wrench,
} from "lucide-react";
import { NAV_ITEMS } from "@shared/navItems";
import type { NavMode } from "@shared/navItems";

export type ContextDrawerMode = NavMode;

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

/** Map iconName strings to Lucide components */
const ICON_MAP: Record<string, React.ElementType> = {
  Home, Compass, Rocket, ShoppingBag,
  Upload, LayoutDashboard, Archive, Wrench,
};

interface LeftRailProps {
  activeDrawer: ContextDrawerMode;
  onDrawerToggle: (mode: ContextDrawerMode) => void;
}

export default function LeftRail({ activeDrawer, onDrawerToggle }: LeftRailProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

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
        borderRight: "1px solid rgba(212,175,55,0.10)",
        zIndex: 200,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Logo — navigates home directly (not a mode) */}
      <button
        onClick={() => navigate("/")}
        className="mb-3 flex items-center justify-center"
        title="Living Nexus — Home"
        style={{ width: 40, height: 40 }}
      >
        <img src={LOGO_URL} alt="LN" style={{ width: 32, height: 32, borderRadius: 8 }} />
      </button>

      {/* Mode items — each opens ContextDrawer, NEVER navigates directly */}
      {NAV_ITEMS.map((item) => {
        if (item.authOnly && !user) return null;
        const Icon = ICON_MAP[item.iconName] ?? Home;
        const drawerOpen = activeDrawer === item.id;

        // Active state: drawer is open for this mode OR current route matches any sub-item
        const routeActive = item.subItems.some(sub => {
          if (sub.path === "/") return location === "/" || location === "/home";
          return location === sub.path || location.startsWith(sub.path + "/") || location.startsWith(sub.path + "?");
        });
        const active = drawerOpen || routeActive;

        return (
          <button
            key={item.id}
            title={item.label}
            onClick={() => onDrawerToggle(drawerOpen ? null : item.id)}
            className="relative flex flex-col items-center justify-center gap-1 transition-all duration-150 rounded-xl"
            style={{
              width: 52,
              height: 52,
              background: active ? "rgba(212,175,55,0.10)" : "transparent",
              color: active ? "#D4AF37" : "rgba(255,255,255,0.45)",
              boxShadow: active
                ? "0 0 12px rgba(212,175,55,0.25), inset 0 0 8px rgba(212,175,55,0.06)"
                : "none",
            }}
            onMouseEnter={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.color = "rgba(212,175,55,0.75)";
                (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)";
              }
            }}
            onMouseLeave={e => {
              if (!active) {
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
