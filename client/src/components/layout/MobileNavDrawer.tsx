/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — MobileNavDrawer v2 (Mode-Driven)
   Full-screen drawer for mobile (≤1024px).
   Opened by Hamburger button in mobile TopBar.

   CONTRACT (Mobile):
   - Hamburger → opens this drawer (covers content, full-screen).
   - Drawer shows the same unified nav structure as ContextDrawer.
   - Select route → drawer closes → content updates.
   - Rail does NOT exist on mobile.
   - Player and AI Guide remain persistent (z-9000+).
═══════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { navLog, diagNoAnim } from "@/lib/navDiag";
import {
  X, LogIn, LogOut, Sparkles,
  Home, Compass, User, Archive,
  Music, FileText, BookOpen, Image, Users,
  Star,
  Settings,
  Shield, BookMarked, LayoutDashboard, LayoutGrid, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { WHATS_NEW_VERSION } from "@/components/layout/ContextDrawer";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";

// ── Unified nav structure (mirrors ContextDrawer PANELS) ──────────

interface NavLink {
  icon: React.ReactNode;
  label: string;
  path: string;
  description?: string;
  gold?: boolean;
  danger?: boolean;
  authOnly?: boolean;
}

interface NavSection {
  heading?: string;
  links: NavLink[];
}

const ALL_SECTIONS: NavSection[] = [
  {
    // Top-level navigation
    links: [
      { icon: <Home size={14} />, label: "Home", path: "/", description: "Featured works & creators" },
      { icon: <Compass size={14} />, label: "Explore", path: "/explore", description: "Browse the witnessed archive" },
    ],
  },
  {
    heading: "Explore by Medium",
    links: [
      { icon: <Music size={14} />, label: "Music", path: "/explore?medium=music" },
      { icon: <FileText size={14} />, label: "Lyrics", path: "/explore?medium=lyrics" },
      { icon: <BookOpen size={14} />, label: "Manuscripts", path: "/explore?medium=manuscripts" },
      { icon: <Image size={14} />, label: "Comics & Visual Art", path: "/explore?medium=comics" },
      { icon: <Users size={14} />, label: "All Creators", path: "/explore?filter=creators" },
    ],
  },
  {
    heading: "Creator Tools",
    links: [
      { icon: <Shield size={14} />, label: "Register Work", path: "/upload", gold: true, authOnly: true, description: "Issue a Witness ID" },
      { icon: <Sparkles size={14} />, label: "Compose", path: "/keeper-compose", description: "Image & music generation" },
      { icon: <Users size={14} />, label: "Guide Directory", path: "/guides", description: "Browse guide characters" },
      { icon: <Shield size={14} />, label: "Register Guide Character", path: "/guides/upload", gold: true, authOnly: true, description: "Register a guide entity" },
      { icon: <ExternalLink size={14} />, label: "Celestial Codex", path: "__external__https://bardsgrim-qmts67ka.manus.space/", gold: true, description: "Music wheel — spin the seals" },
    ],
  },
  {
    heading: "My Account",
    links: [
      { icon: <LayoutGrid size={14} />, label: "My Domain", path: "/domain", authOnly: true, gold: true, description: "Creator Domain Command Center" },
      { icon: <User size={14} />, label: "My Profile", path: "/profile", authOnly: true, description: "Public creator page" },
      { icon: <Archive size={14} />, label: "My Archive", path: "/archive", authOnly: true, description: "All your registered works" },
      { icon: <LayoutDashboard size={14} />, label: "Dashboard", path: "/dashboard", authOnly: true, description: "Analytics & slots" },
      { icon: <Settings size={14} />, label: "Settings", path: "/settings/billing", authOnly: true },
    ],
  },
  {
    heading: "Registry",
    links: [
      { icon: <BookMarked size={14} />, label: "Witness Registry", path: "/witness-registry", gold: true, description: "Public ledger of all registered works" },
      { icon: <Shield size={14} />, label: "Verify a WID", path: "/verify", description: "Check any Witness ID" },
      { icon: <Star size={14} />, label: "Founding Creators", path: "/founders", description: "View the founding registry" },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenWhatsNew?: () => void;
}

export default function MobileNavDrawer({ open, onClose, onOpenWhatsNew }: MobileNavDrawerProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── Diagnostic: log mount/unmount and animation lifecycle ──────────
  useEffect(() => {
    navLog("DRAWER_MOUNT", { open, bodyClass: document.body.className, dataScrollLocked: document.body.getAttribute("data-scroll-locked") });
    return () => {
      navLog("DRAWER_UNMOUNT", { open, bodyClass: document.body.className });
    };
  }, [open]);

  // Attach transitionstart / transitionend to the drawer panel element
  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    const onStart = (e: TransitionEvent) => navLog("DRAWER_ANIM_START", { property: e.propertyName, elapsedTime: e.elapsedTime });
    const onEnd   = (e: TransitionEvent) => navLog("DRAWER_ANIM_END",   { property: e.propertyName, elapsedTime: e.elapsedTime, bodyClass: document.body.className });
    el.addEventListener("transitionstart", onStart);
    el.addEventListener("transitionend",   onEnd);
    return () => {
      el.removeEventListener("transitionstart", onStart);
      el.removeEventListener("transitionend",   onEnd);
    };
  }, []);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // NOTE: Body scroll lock is handled by overlayController in MainLayout
  // (overlayOpen("menu") / overlayClose("menu")). Do NOT add a second
  // document.body.style.overflow here — it creates a race condition on close
  // that leaves the body locked on Android Chrome, freezing all touch events.

  const isActive = (path: string) => {
    if (path === "/" && (location === "/" || location === "/home")) return true;
    return location === path || (path !== "/" && location.startsWith(path + "/"));
  };

  const handleNav = (path: string) => {
    if (path.startsWith("__external__")) {
      window.open(path.replace("__external__", ""), "_blank", "noopener,noreferrer");
      onClose();
      return;
    }
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate("/");
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
        aria-hidden="true"
        className="lg:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 449,
          background: "rgba(0,0,0,0.65)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: diagNoAnim() ? "none" : "opacity 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Full-screen drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="lg:hidden flex flex-col"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(340px, 92vw)",
          zIndex: 450,
          // Solid background — no backdropFilter blur. blur(24px) is GPU-expensive on
          // Android mid-range chips (e.g. Pixel 6 Tensor G1) and can freeze the UI
          // when combined with the player's existing compositing layers.
          background: "#0a0812",
          borderRight: "1px solid rgba(196,154,40,0.14)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: diagNoAnim() ? "none" : "transform 220ms cubic-bezier(0.22,1,0.36,1)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.80)" : "none",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(212,175,55,0.10)" }}
        >
          <div className="flex items-center gap-2.5">
            <img src={LOGO_URL} alt="LN" style={{ width: 26, height: 26, borderRadius: 6 }} />
            <span
              className="text-[11px] font-bold tracking-[0.18em] uppercase"
              style={{ color: "rgba(212,175,55,0.75)", fontFamily: "'Cinzel', serif" }}
            >
              Living Nexus
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
            style={{ color: "rgba(255,255,255,0.35)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
            aria-label="Close navigation"
          >
            <X size={14} />
          </button>
        </div>

        {/* User profile card */}
        {user ? (
          <div
            className="mx-3 mt-3 rounded-xl px-3 py-2.5 flex items-center gap-3 flex-shrink-0"
            style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.10)" }}
          >
            <div
              className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                width: 36, height: 36,
                background: "rgba(212,175,55,0.14)",
                border: "1.5px solid rgba(212,175,55,0.30)",
                color: "#D4AF37",
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.88)" }}>
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
          <div className="mx-3 mt-3 flex-shrink-0">
            <a
              href={getLoginUrl()}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-sm"
              style={{ background: "rgba(212,175,55,0.08)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.15)" }}
            >
              <LogIn size={14} />
              Sign In to Living Nexus
            </a>
          </div>
        )}

        {/* Nav sections — scrollable */}
        <div className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: "none" }}>
          {ALL_SECTIONS.map((section, si) => {
            const visibleLinks = section.links.filter(l => !(l.authOnly && !user));
            if (visibleLinks.length === 0) return null;
            return (
              <div key={si} className={si > 0 ? "mt-4" : ""}>
                {section.heading && (
                  <div
                    className="px-5 pb-1.5 text-[9px] font-bold tracking-[0.22em] uppercase"
                    style={{ color: "rgba(212,175,55,0.40)" }}
                  >
                    {section.heading}
                  </div>
                )}
                {visibleLinks.map((link, li) => {
                  const active = isActive(link.path);
                  return (
                    <button
                      key={li}
                      onClick={() => handleNav(link.path)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors"
                      style={{
                        background: active ? "rgba(212,175,55,0.07)" : "transparent",
                        borderLeft: active ? "2px solid rgba(212,175,55,0.65)" : "2px solid transparent",
                      }}
                      onMouseEnter={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={e => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span
                        className="flex-shrink-0"
                        style={{
                          color: active
                            ? "rgba(212,175,55,0.85)"
                            : link.danger
                            ? "rgba(255,80,80,0.55)"
                            : link.gold
                            ? "rgba(212,175,55,0.60)"
                            : "rgba(255,255,255,0.32)",
                        }}
                      >
                        {link.icon}
                      </span>
                      <span
                        className="text-[13px] font-medium"
                        style={{
                          color: active
                            ? "rgba(212,175,55,0.95)"
                            : link.danger
                            ? "rgba(255,100,100,0.75)"
                            : link.gold
                            ? "rgba(212,175,55,0.85)"
                            : "rgba(255,255,255,0.72)",
                        }}
                      >
                        {link.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {/* paddingBottom accounts for MiniBar (--player-height ~64px) + BottomNavBar (--nav-total ~64px)
            so What's New and Log Out are never hidden behind the global player/nav stack.
            --bottom-stack = --nav-total + --player-height, defined in index.css */}
        <div
          className="flex-shrink-0 px-3 pt-2"
          style={{
            borderTop: "1px solid rgba(212,175,55,0.08)",
            paddingBottom: "calc(var(--bottom-stack, 128px) + 12px)",
          }}
        >
          <button
            onClick={handleWhatsNew}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <Sparkles size={14} style={{ color: "rgba(212,175,55,0.45)", flexShrink: 0 }} />
            <span className="flex-1 text-left text-[12px]">What's New</span>
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
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mt-1"
              style={{ color: "rgba(255,255,255,0.38)" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <LogOut size={14} style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0 }} />
              <span className="text-[12px]">Log Out</span>
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
