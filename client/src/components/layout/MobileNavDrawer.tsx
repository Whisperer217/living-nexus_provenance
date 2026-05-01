/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobileNavDrawer (Isomorphic Navigation System v2.0)
   Full-screen drawer for mobile (≤1024px).
   Opened by Hamburger button in mobile TopBar.

   CONTRACT (Mobile):
   - Hamburger → opens this drawer (covers content).
   - Select route → drawer closes → content updates.
   - Same NAV_ITEMS as desktop ContextDrawer.
   - Rail does NOT exist on mobile.
═══════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { X, ChevronRight, LogIn, LogOut } from "lucide-react";
import {
  Home, Compass, Rocket, ShoppingBag,
  Upload, LayoutDashboard, Archive, Wrench,
} from "lucide-react";
import { NAV_ITEMS } from "@shared/navItems";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Compass, Rocket, ShoppingBag,
  Upload, LayoutDashboard, Archive, Wrench,
};

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenWhatsNew?: () => void;
}

export default function MobileNavDrawer({ open, onClose, onOpenWhatsNew }: MobileNavDrawerProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => { onClose(); }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleNav = (path: string) => {
    if (path === "/__whats-new__") {
      onClose();
      onOpenWhatsNew?.();
      return;
    }
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 449,
          background: "rgba(0,0,0,0.6)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
        className="lg:hidden"
      />

      {/* Full-screen drawer panel */}
      <div
        ref={drawerRef}
        className="lg:hidden flex flex-col"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(320px, 88vw)",
          zIndex: 450,
          background: "rgba(10,9,7,0.99)",
          borderRight: "1px solid rgba(212,175,55,0.12)",
          backdropFilter: "blur(24px)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.8), 2px 0 0 rgba(212,175,55,0.06)" : "none",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(212,175,55,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="LN" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span className="text-[12px] font-bold tracking-widest uppercase" style={{ color: "rgba(212,175,55,0.75)" }}>
              Living Nexus
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav items — scrollable */}
        <div className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_ITEMS.map((item) => {
            if (item.authOnly && !user) return null;
            const Icon = ICON_MAP[item.iconName] ?? Home;

            // Check if any sub-item matches current route
            const sectionActive = item.subItems.some(sub => {
              if (sub.path === "/") return location === "/" || location === "/home";
              return location === sub.path || location.startsWith(sub.path + "/");
            });

            return (
              <div key={item.id} className="mb-4">
                {/* Section header */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 mb-1"
                >
                  <Icon size={13} style={{ color: sectionActive ? "#D4AF37" : "rgba(255,255,255,0.35)" }} />
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: sectionActive ? "rgba(212,175,55,0.7)" : "rgba(255,255,255,0.3)" }}
                  >
                    {item.label}
                  </span>
                </div>

                {/* Sub-items */}
                {item.subItems.map((sub) => {
                  if (sub.authOnly && !user) return null;

                  const isActive =
                    sub.path === "/"
                      ? location === "/" || location === "/home"
                      : location === sub.path || location.startsWith(sub.path + "/");

                  return (
                    <button
                      key={sub.path}
                      onClick={() => handleNav(sub.path)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all group"
                      style={{
                        background: isActive ? "rgba(212,175,55,0.10)" : "transparent",
                        border: isActive ? "1px solid rgba(212,175,55,0.18)" : "1px solid transparent",
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.05)";
                      }}
                      onMouseLeave={e => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span
                        className="text-[13px] font-medium flex-1"
                        style={{ color: isActive ? "#D4AF37" : "rgba(255,255,255,0.75)" }}
                      >
                        {sub.label}
                      </span>
                      <ChevronRight
                        size={11}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity"
                        style={{ color: "rgba(212,175,55,0.6)" }}
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer — auth actions */}
        <div
          className="px-3 pb-4 pt-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(212,175,55,0.08)" }}
        >
          {!user ? (
            <a
              href={getLoginUrl()}
              className="flex items-center gap-3 px-4 py-3 rounded-xl w-full transition-all"
              style={{
                background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.20)",
              }}
            >
              <LogIn size={15} style={{ color: "#D4AF37" }} />
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "rgba(230,205,174,0.9)" }}>Sign In</div>
                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Upload &amp; earn tips</div>
              </div>
            </a>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl w-full transition-all"
              style={{ color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              <LogOut size={14} />
              <span className="text-[13px]">Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
