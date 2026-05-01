/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ContextDrawer v3 (Spec-Aligned)
   Unified navigation drawer — desktop only.
   Slides in from left:72px, overlays MainColumn.

   Structure (per spec):
   ┌─────────────────────────────────┐
   │ [Avatar] Name                   │
   │ @WITNESSED                      │
   ├─────────────────────────────────┤
   │ Home                            │
   │ Explore                         │
   │ Profile                         │
   │ Upload                          │
   ├─────────────────────────────────┤
   │ CREATOR TOOLS                   │
   │ Upload                          │
   │ Dashboard                       │
   │ LNA — Archive          [49]     │
   ├─────────────────────────────────┤
   │ What's New             v2.43.0  │
   │ Log Out                         │
   └─────────────────────────────────┘
═══════════════════════════════════════════════════════════════════ */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Home, Compass, User, Upload, LayoutDashboard, Archive,
  X, LogIn, LogOut, Sparkles,
} from "lucide-react";

// Version string — keep in sync with WhatsNewModal
export const WHATS_NEW_VERSION = "v2.43.0";

export type NavMode = "home" | "explore" | "profile" | "upload" | "archive";

const MODE_LABELS: Record<NavMode, string> = {
  home:    "Home",
  explore: "Explore",
  profile: "Profile",
  upload:  "Upload",
  archive: "Archive",
};

interface ContextDrawerProps {
  open: boolean;
  activeMode: NavMode | null;
  onClose: () => void;
  archiveSongCount?: number;
  onOpenWhatsNew?: () => void;
}

const NAV_PRIMARY = [
  { label: "Home",    icon: Home,    path: "/"        },
  { label: "Explore", icon: Compass, path: "/explore" },
  { label: "Profile", icon: User,    path: "/profile", authOnly: true },
  { label: "Upload",  icon: Upload,  path: "/upload",  authOnly: true },
];

const NAV_CREATOR_TOOLS = [
  { label: "Upload",        icon: Upload,          path: "/upload",    authOnly: true },
  { label: "Dashboard",     icon: LayoutDashboard, path: "/dashboard", authOnly: true },
  { label: "LNA — Archive", icon: Archive,         path: "/archive",   authOnly: true, archiveBadge: true, gold: true },
];

export default function ContextDrawer({
  open,
  activeMode,
  onClose,
  archiveSongCount = 0,
  onOpenWhatsNew,
}: ContextDrawerProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  // Close on route change
  useEffect(() => {
    if (open) onClose();
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isActive = (path: string) => {
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  const goTo = (path: string) => { navigate(path); onClose(); };

  const handleLogout = async () => {
    try { await logout(); } finally { onClose(); navigate("/"); }
  };

  const handleWhatsNew = () => {
    onClose();
    if (onOpenWhatsNew) {
      onOpenWhatsNew();
    } else {
      window.dispatchEvent(new CustomEvent("ln:open-whats-new"));
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 299,
          background: "rgba(0,0,0,0.40)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Drawer panel */}
      <div
        className="hidden lg:flex flex-col"
        style={{
          position: "fixed",
          top: 0,
          left: 72,
          bottom: 0,
          width: 280,
          zIndex: 300,
          background: "rgba(12,11,9,0.98)",
          borderRight: "1px solid rgba(212,175,55,0.12)",
          backdropFilter: "blur(20px)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.65), 2px 0 0 rgba(212,175,55,0.06)" : "none",
          pointerEvents: open ? "auto" : "none",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <span className="font-display text-[10px] tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.45)" }}>
            {activeMode ? MODE_LABELS[activeMode] : "Navigation"}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg transition-all"
            style={{ padding: 6, color: "rgba(255,255,255,0.30)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.70)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.30)"}
            aria-label="Close navigation"
          >
            <X size={15} />
          </button>
        </div>

        {/* User profile header */}
        {user ? (
          <div
            className="mx-3 mb-3 rounded-xl px-3 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.10)" }}
          >
            <div
              className="flex-shrink-0 rounded-full flex items-center justify-center font-display text-sm"
              style={{
                width: 38, height: 38,
                background: "rgba(212,175,55,0.14)",
                border: "1.5px solid rgba(212,175,55,0.30)",
                color: "#D4AF37",
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm truncate" style={{ color: "rgba(255,255,255,0.88)" }}>
                {user.name || "Creator"}
              </p>
              <span
                className="inline-flex items-center gap-1 text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded mt-0.5"
                style={{ background: "rgba(212,175,55,0.10)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.18)" }}
              >
                ◎ WITNESSED
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-3 mb-3 flex-shrink-0">
            <a
              href={getLoginUrl()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-body"
              style={{ background: "rgba(212,175,55,0.08)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.15)" }}
            >
              <LogIn size={14} />
              Sign In
            </a>
          </div>
        )}

        {/* Divider */}
        <div className="mx-3 mb-1 h-px flex-shrink-0" style={{ background: "rgba(212,175,55,0.08)" }} />

        {/* Primary nav */}
        <div className="px-2 mb-1 flex-shrink-0">
          {NAV_PRIMARY.map(({ label, icon: Icon, path, authOnly }) => {
            if (authOnly && !user) return null;
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => goTo(path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-body"
                style={{
                  background: active ? "rgba(212,175,55,0.08)" : "transparent",
                  color: active ? "#D4AF37" : "rgba(255,255,255,0.70)",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon size={16} style={{ color: active ? "#D4AF37" : "rgba(255,255,255,0.40)", flexShrink: 0 }} />
                <span className="flex-1 text-left">{label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#D4AF37" }} />}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 my-2 h-px flex-shrink-0" style={{ background: "rgba(212,175,55,0.08)" }} />

        {/* Creator Tools */}
        <div className="px-2 flex-shrink-0">
          <p className="px-3 mb-1 text-[9px] font-bold tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.40)" }}>
            Creator Tools
          </p>
          {NAV_CREATOR_TOOLS.map(({ label, icon: Icon, path, authOnly, archiveBadge, gold }) => {
            if (authOnly && !user) return null;
            const active = isActive(path);
            const badge = archiveBadge && archiveSongCount > 0
              ? (archiveSongCount > 99 ? "99+" : String(archiveSongCount))
              : null;
            return (
              <button
                key={path}
                onClick={() => goTo(path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-body"
                style={{
                  background: active ? "rgba(212,175,55,0.08)" : "transparent",
                  color: active ? "#D4AF37" : gold ? "rgba(196,154,40,0.75)" : "rgba(255,255,255,0.70)",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Icon size={16} style={{ color: active ? "#D4AF37" : gold ? "rgba(196,154,40,0.55)" : "rgba(255,255,255,0.40)", flexShrink: 0 }} />
                <span className="flex-1 text-left">{label}</span>
                {badge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0"
                    style={{ background: "rgba(212,175,55,0.14)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.22)" }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Divider */}
        <div className="mx-3 mb-1 h-px flex-shrink-0" style={{ background: "rgba(212,175,55,0.08)" }} />

        {/* Footer: What's New + Log Out */}
        <div className="px-2 pb-4 flex-shrink-0">
          <button
            onClick={handleWhatsNew}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-body"
            style={{ color: "rgba(255,255,255,0.50)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            <Sparkles size={15} style={{ color: "rgba(212,175,55,0.45)", flexShrink: 0 }} />
            <span className="flex-1 text-left">What's New</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "rgba(212,175,55,0.10)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.18)" }}
            >
              {WHATS_NEW_VERSION}
            </span>
          </button>

          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-body"
              style={{ color: "rgba(255,255,255,0.38)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <LogOut size={15} style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0 }} />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
