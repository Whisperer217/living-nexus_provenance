/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ContextDrawer (Isomorphic Navigation System v2.0)
   Single-open overlay panel. Slides from left:72px.
   Width: 380px. One drawer at a time.
   220ms cubic-bezier(0.22,1,0.36,1) animation.

   CONTRACT:
   - Drawer is the ONLY navigation surface on desktop.
   - Rail opens this drawer; drawer handles all route changes.
   - Click outside → close. Escape → close. Route change → close.
   - Must NOT push layout (overlay only).
   - Independent scroll.
═══════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { X, ChevronRight } from "lucide-react";
import type { ContextDrawerMode } from "./LeftRail";
import { NAV_ITEM_MAP } from "@shared/navItems";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LogIn } from "lucide-react";

interface ContextDrawerProps {
  mode: ContextDrawerMode;
  onClose: () => void;
}

export default function ContextDrawer({ mode, onClose }: ContextDrawerProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const isOpen = mode !== null;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  // Close on route change
  useEffect(() => { onClose(); }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const navItem = mode ? NAV_ITEM_MAP[mode] : null;

  const handleNav = (path: string) => {
    // Special internal action: open What's New modal
    if (path === "/__whats-new__") {
      onClose();
      // Dispatch a custom event that MainLayout listens for
      window.dispatchEvent(new CustomEvent("ln:open-whats-new"));
      return;
    }
    navigate(path);
    onClose();
  };

  return createPortal(
    <>
      {/* Backdrop — click outside closes drawer */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 299,
          background: "rgba(0,0,0,0.35)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="hidden lg:flex flex-col"
        style={{
          position: "fixed",
          top: 0,
          left: 72,
          bottom: 0,
          width: 380,
          zIndex: 300,
          background: "rgba(12,11,9,0.98)",
          borderRight: "1px solid rgba(212,175,55,0.12)",
          backdropFilter: "blur(24px)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
          boxShadow: isOpen ? "8px 0 40px rgba(0,0,0,0.7), 2px 0 0 rgba(212,175,55,0.06)" : "none",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(212,175,55,0.08)" }}
        >
          <span
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ color: "rgba(212,175,55,0.7)" }}
          >
            {navItem?.label ?? ""}
          </span>
          <button
            onClick={onClose}
            className="transition-colors rounded-lg p-1"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
          >
            <X size={14} />
          </button>
        </div>

        {/* Nav list — scrollable, independent */}
        <div className="flex-1 overflow-y-auto py-3 px-3">
          {navItem?.subItems.map((sub) => {
            if (sub.authOnly && !user) return null;

            const isActive =
              sub.path === "/"
                ? location === "/" || location === "/home"
                : location === sub.path || location.startsWith(sub.path + "/");

            return (
              <button
                key={sub.path}
                onClick={() => handleNav(sub.path)}
                className="w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl mb-1 transition-all group"
                style={{
                  background: isActive ? "rgba(212,175,55,0.10)" : "transparent",
                  border: isActive
                    ? "1px solid rgba(212,175,55,0.18)"
                    : "1px solid transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.10)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] font-semibold leading-tight"
                    style={{ color: isActive ? "#D4AF37" : "rgba(255,255,255,0.85)" }}
                  >
                    {sub.label}
                    {sub.badge && (
                      <span
                        className="ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(212,175,55,0.12)", color: "rgba(212,175,55,0.8)" }}
                      >
                        {sub.badge}
                      </span>
                    )}
                  </div>
                  {sub.description && (
                    <div
                      className="text-[11px] mt-0.5 leading-snug"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {sub.description}
                    </div>
                  )}
                </div>
                <ChevronRight
                  size={12}
                  className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ color: "rgba(212,175,55,0.6)" }}
                />
              </button>
            );
          })}

          {/* Auth gate: show sign-in prompt for auth-only modes when not logged in */}
          {navItem?.authOnly && !user && (
            <div
              className="mx-1 mt-4 p-4 rounded-xl"
              style={{
                background: "rgba(212,175,55,0.05)",
                border: "1px solid rgba(212,175,55,0.15)",
              }}
            >
              <p className="text-[12px] mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
                Sign in to access {navItem.label}.
              </p>
              <a
                href={getLoginUrl()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  color: "#D4AF37",
                }}
              >
                <LogIn size={13} />
                Sign In
              </a>
            </div>
          )}
        </div>

        {/* Footer — mode label */}
        <div
          className="px-5 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(212,175,55,0.06)" }}
        >
          <p className="text-[9px] font-mono tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.18)" }}>
            Living Nexus · {navItem?.label ?? "Navigation"}
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}
