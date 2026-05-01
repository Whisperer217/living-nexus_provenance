/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ContextDrawer (System Architecture v1.0)
   Single-open overlay panel. Slides from left:72px.
   Width: 380px. One drawer at a time.
   220ms cubic-bezier(0.22,1,0.36,1) animation.
   Click outside → close.
═══════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import type { ContextDrawerMode } from "./LeftRail";

interface ContextDrawerProps {
  mode: ContextDrawerMode;
  onClose: () => void;
}

const DRAWER_TITLES: Record<NonNullable<ContextDrawerMode>, string> = {
  HOME:        "Home",
  EXPLORE:     "Explore",
  PROJECTS:    "Projects",
  MARKETPLACE: "Marketplace",
  UPLOAD:      "Upload",
  DASHBOARD:   "Dashboard",
  ARCHIVE:     "Archive",
  BUILD:       "Build",
};

export default function ContextDrawer({ mode, onClose }: ContextDrawerProps) {
  const [, navigate] = useLocation();
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
  const [location] = useLocation();
  useEffect(() => { onClose(); }, [location]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
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
        background: "rgba(12,11,9,0.97)",
        borderRight: "1px solid rgba(212,175,55,0.12)",
        backdropFilter: "blur(20px)",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
        boxShadow: isOpen ? "8px 0 32px rgba(0,0,0,0.6), 2px 0 0 rgba(212,175,55,0.06)" : "none",
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(212,175,55,0.08)" }}
      >
        <span
          className="text-[11px] font-bold tracking-widest"
          style={{ color: "rgba(212,175,55,0.7)" }}
        >
          {mode ? DRAWER_TITLES[mode] : ""}
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

      {/* Content area — scrollable */}
      <div className="flex-1 overflow-y-auto p-5">
        {mode === "BUILD" && (
          <div className="flex flex-col gap-2">
            {[
              { label: "Prompt Generator", path: "" },
              { label: "LN Command",       path: "/admin" },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { if (item.path) { navigate(item.path); onClose(); } }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                style={{
                  background: "rgba(212,175,55,0.05)",
                  border: "1px solid rgba(212,175,55,0.10)",
                  color: "rgba(255,255,255,0.75)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,175,55,0.10)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,175,55,0.05)")}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* For other modes the drawer just navigates — content is a placeholder */}
        {mode && mode !== "BUILD" && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Context panel for {DRAWER_TITLES[mode]}.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
