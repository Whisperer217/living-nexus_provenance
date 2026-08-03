/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ContextDrawer v4 (Mode-Driven)
   ─────────────────────────────────────────────────────────────────
   Contract:
   • Rail selects a mode → drawer opens and renders ONLY that mode's panel
   • Each mode has its own panel: header + contextual links + actions
   • No universal nav list. No mixed content. One mode. One panel.
   • Drawer slides in from left:72px (right of LeftRail)
   • Player stays dominant (z-9000+). Drawer is z-300.
   • Close on: backdrop click, Escape key, route change
═══════════════════════════════════════════════════════════════════ */
import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Home, Compass, BookOpen as BookOpenIcon, Upload, Archive,
  Music, FileText, BookOpen, Image, Users, User,
  Star, TrendingUp, Sparkles, ShoppingBag,
  FolderOpen, Settings, LogOut, LogIn,
  Shield, BookMarked,
  LayoutGrid, LayoutDashboard, X, ExternalLink,
  Download, PenTool, Palette,
  ScrollText, Scale, Heart, Library,
} from "lucide-react";
import { PLATFORM_VERSION } from "@/platformVersion";

// ── Types ─────────────────────────────────────────────────────────

export type NavMode = "home" | "explore" | "guide" | "compose" | "upload" | "archive";

// Re-export so callers that previously imported WHATS_NEW_VERSION still work.
export const WHATS_NEW_VERSION = PLATFORM_VERSION;

interface PanelLink {
  icon: React.ReactNode;
  label: string;
  path: string;
  description?: string;
  badge?: string | number;
  authOnly?: boolean;
  gold?: boolean;
  danger?: boolean;
}

interface PanelSection {
  heading?: string;
  links: PanelLink[];
}

interface ModePanel {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  sections: PanelSection[];
}

// ── Mode-specific panel definitions ───────────────────────────────

const PANELS: Record<NavMode, ModePanel> = {
  home: {
    icon: <Home size={17} />,
    title: "Home",
    subtitle: "Your creative provenance hub",
    sections: [
      {
        links: [
          { icon: <LayoutGrid size={14} />, label: "Discover", path: "/", description: "Featured works & creators" },
          { icon: <Star size={14} />, label: "New Arrivals", path: "/explore?mode=new", description: "Recently registered works" },
          { icon: <TrendingUp size={14} />, label: "Trending", path: "/explore?sort=trending", description: "Most played this week" },
        ],
      },
      {
        heading: "Platform",
        links: [
          { icon: <ScrollText size={14} />, label: "Manifesto", path: "/manifesto", description: "The Living Nexus doctrine" },
          { icon: <Scale size={14} />, label: "Code of Ethics & Terms", path: "/terms", description: "Platform principles and terms" },
          { icon: <Shield size={14} />, label: "Privacy Policy", path: "/privacy", description: "How we protect your data" },
          { icon: <Heart size={14} />, label: "Attribution", path: "/attribution", description: "Contributors & builders" },
          { icon: <Library size={14} />, label: "Platform Lexicon", path: "/lexicon", description: "Every term, concept & phrase — newcomer guide" },
          { icon: <Users size={14} />, label: "Founding Creators", path: "/founders", description: "The first witnesses" },
        ],
      },
      {
        heading: "Founder's Era",
        links: [
          { icon: <Shield size={14} />, label: "Founder's Era", path: "/founder-era", description: "Earliest provenance anchors" },
          { icon: <Users size={14} />, label: "Founding Creators", path: "/founders", description: "View the founding registry" },
        ],
      },
      {
        heading: "Companion Tools",
        links: [
          { icon: <ExternalLink size={14} />, label: "Celestial Codex", path: "__external__https://bardsgrim-qmts67ka.manus.space/", description: "Music wheel — spin the seals", gold: true },
        ],
      },
    ],
  },

  explore: {
    icon: <Compass size={17} />,
    title: "Explore",
    subtitle: "Browse the witnessed archive",
    sections: [
      {
        heading: "By Medium",
        links: [
          { icon: <Music size={14} />, label: "Music", path: "/explore?medium=music" },
          { icon: <FileText size={14} />, label: "Lyrics", path: "/explore?medium=lyrics" },
          { icon: <BookOpen size={14} />, label: "Manuscripts", path: "/explore?medium=manuscripts" },
          { icon: <Image size={14} />, label: "Comics & Visual Art", path: "/explore?medium=comics" },
          { icon: <Palette size={14} />, label: "Visual Works", path: "/visual-works", description: "Photography, art & imagery" },
        ],
      },
      {
        heading: "By Creator",
        links: [
          { icon: <Users size={14} />, label: "All Creators", path: "/explore?filter=creators" },
          { icon: <Star size={14} />, label: "Founding Creators", path: "/founders", description: "View the founding registry" },
        ],
      },
      {
        heading: "Creator Guides",
        links: [
          { icon: <BookOpen size={14} />, label: "Nexus Avatar Directory", path: "/guides", description: "Browse all creator-uploaded Personal Nexus Avatars", gold: true },
          { icon: <ShoppingBag size={14} />, label: "Marketplace", path: "/marketplace", description: "Keeper skins, albums & creator goods" },
        ],
      },
    ],
  },

  guide: {
    icon: <BookOpenIcon size={17} />,
    title: "Guide",
    subtitle: "Pre-Creation Declaration & Creative Process",
    sections: [
      {
        heading: "Pre-Creation Declaration",
        links: [
          { icon: <BookOpenIcon size={14} />, label: "Create a Guide", path: "/guides/upload", description: "Establish your creative intent before generating", authOnly: true, gold: true },
          { icon: <Users size={14} />, label: "Guide Directory", path: "/guides", description: "Browse all creator guides & Nexus Avatars" },
        ],
      },
      {
        heading: "The Registry",
        links: [
          { icon: <Shield size={14} />, label: "Verify a WID", path: "/verify", description: "Check any Witness ID — confirm authorship", gold: true },
          { icon: <BookMarked size={14} />, label: "Witness Registry", path: "/witness-registry", description: "Public ledger of all registered works" },
          { icon: <BookOpen size={14} />, label: "WID Specification", path: "/doctrine/wid-spec", description: "How Witness IDs work" },
        ],
      },
      {
        heading: "Your Creative Domain",
        links: [
          { icon: <LayoutGrid size={14} />, label: "My Domain", path: "/domain", description: "Creator Domain Command Center", authOnly: true },
          { icon: <User size={14} />, label: "My Profile", path: "__my_public_profile__", description: "Your public domain", authOnly: true },
          { icon: <Music size={14} />, label: "My Works", path: "/profile?tab=works", description: "Your registered works ledger", authOnly: true },
          { icon: <LayoutDashboard size={14} />, label: "Dashboard", path: "/dashboard", description: "Creator analytics & slots", authOnly: true },
        ],
      },
      {
        heading: "Keeper & Identity",
        links: [
          { icon: <Sparkles size={14} />, label: "My Nexus Avatar", path: "/keeper", description: "Equip & customise your Personal Nexus Avatar", authOnly: true },
          { icon: <Settings size={14} />, label: "Settings", path: "/settings/billing", authOnly: true },
          { icon: <LogOut size={14} />, label: "Log Out", path: "__logout__", authOnly: true, danger: true },
        ],
      },
    ],
  },

  compose: {
    icon: <PenTool size={17} />,
    title: "Compose",
    subtitle: "Create & craft your work",
    sections: [
      {
        links: [
          { icon: <Sparkles size={14} />, label: "AI Compose", path: "/compose", description: "Generate images, music & more", authOnly: true, gold: true },
          { icon: <Sparkles size={14} />, label: "Nexus Compose", path: "/keeper-compose", description: "Lyrics \u2192 AI music prompt" },
          { icon: <BookOpen size={14} />, label: "Book Studio", path: "/book-studio", description: "Write & illustrate your book", authOnly: true },
        ],
      },
    ],
  },

  upload: {
    icon: <Upload size={17} />,
    title: "Register",
    subtitle: "Register your creative work",
    sections: [
      {
        links: [
          { icon: <Shield size={14} />, label: "Register Work", path: "/manifest", description: "Issue a Witness ID", authOnly: true, gold: true },
          { icon: <Palette size={14} />, label: "Register Visual Works", path: "/visual-works/new", description: "Photography, art & imagery", authOnly: true },
          { icon: <Sparkles size={14} />, label: "Nexus Compose", path: "/keeper-compose", description: "Lyrics \u2192 AI music prompt" },
        ],
      },
      {
        heading: "Personal Nexus Avatars",
        links: [
          { icon: <Users size={14} />, label: "Nexus Avatar Directory", path: "/guides", description: "Browse all Personal Nexus Avatars" },
          { icon: <Shield size={14} />, label: "Register Personal Nexus Avatar", path: "/guides/upload", description: "Register your Personal Nexus Avatar", authOnly: true, gold: true },
        ],
      },
      {
        heading: "Platform Store",
        links: [
          { icon: <Star size={14} />, label: "Platform Store", path: "/store", description: "Creator tools, upgrades & resources", gold: true },
          { icon: <BookOpen size={14} />, label: "Platform Guides & Tutorials", path: "/platform-guides", description: "Learn how Living Nexus works" },
        ],
      },
      {
        heading: "Your Registrations",
        links: [
          { icon: <Archive size={14} />, label: "My Archive", path: "/archive", description: "All your registered works", authOnly: true },
          { icon: <LayoutDashboard size={14} />, label: "Dashboard", path: "/dashboard", description: "Creator analytics & slots", authOnly: true },
        ],
      },
    ],
  },

  archive: {
    icon: <Archive size={17} />,
    title: "Registry",
    subtitle: "The permanent provenance ledger",
    sections: [
      {
        links: [
          { icon: <BookMarked size={14} />, label: "Witness Registry", path: "/witness-registry", description: "Public ledger of all registered works", gold: true },
          { icon: <Archive size={14} />, label: "My Works", path: "/archive", description: "Your personally registered works", authOnly: true },
          { icon: <Download size={14} />, label: "Licensed Downloads", path: "/licensed-downloads", description: "Bulk download tracks you're licensed for", authOnly: true },
          { icon: <LayoutDashboard size={14} />, label: "Dashboard", path: "/dashboard", description: "Creator analytics & slots", authOnly: true },
        ],
      },
      {
        heading: "Verify & Learn",
        links: [
          { icon: <Shield size={14} />, label: "Verify a WID", path: "/verify", description: "Check any Witness ID" },
          { icon: <BookOpen size={14} />, label: "WID Specification", path: "/doctrine/wid-spec", description: "How Witness IDs work" },
        ],
      },
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────

interface ContextDrawerProps {
  open: boolean;
  activeMode: NavMode | null;
  onClose: () => void;
  onOpenWhatsNew?: () => void;
}

export default function ContextDrawer({
  open,
  activeMode,
  onClose,
  onOpenWhatsNew,
}: ContextDrawerProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  // Close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/" && (location === "/" || location === "/home")) return true;
      return location === path || (path !== "/" && location.startsWith(path + "/"));
    },
    [location]
  );

  const handleLinkClick = useCallback(
    (path: string) => {
      if (path === "__logout__") {
        logout().finally(() => { onClose(); navigate("/"); });
        return;
      }
      if (path === "__my_public_profile__") {
        // Route to the creator's actual public domain page
        // Prefer artistHandle slug (e.g. /creator/slimdoggyaimusic) for a clean URL;
        // fall back to numeric id if handle is not set yet.
        const dest = user
          ? `/creator/${user.artistHandle || user.id}`
          : "/profile";
        navigate(dest);
        onClose();
        return;
      }
      if (path.startsWith("__external__")) {
        window.open(path.replace("__external__", ""), "_blank", "noopener,noreferrer");
        onClose();
        return;
      }
      navigate(path);
      onClose();
    },
    [navigate, onClose, logout, user]
  );

  const handleWhatsNew = useCallback(() => {
    onClose();
    if (onOpenWhatsNew) {
      onOpenWhatsNew();
    } else {
      window.dispatchEvent(new CustomEvent("ln:open-whats-new"));
    }
  }, [onClose, onOpenWhatsNew]);

  const panel = activeMode ? PANELS[activeMode] : null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 72,   /* rail width — backdrop never covers the rail */
          right: 0,
          bottom: 0,
          zIndex: 299,
          background: "rgba(0,0,0,0.40)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      />

      {/* Drawer panel — desktop only */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={panel ? `${panel.title} navigation` : "Navigation"}
        className="hidden lg:flex flex-col"
        style={{
          position: "fixed",
          top: 0,
          left: 72,
          bottom: 0,
          width: 300,
          zIndex: 300,
          background: "rgba(0,0,0,0.99)",
          borderRight: "1px solid rgba(196,154,40,0.14)",
          backdropFilter: "blur(20px)",
          /* Close: push fully off-screen left past the rail so no artifact bleeds into the 72px rail zone */
          transform: open ? "translateX(0)" : "translateX(calc(-100% - 72px))",
          transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
          boxShadow: open ? "8px 0 40px rgba(0,0,0,0.65)" : "none",
          pointerEvents: open ? "auto" : "none",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        {panel ? (
          <>
            {/* Mode header */}
            <div
              className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(212,175,55,0.10)" }}
            >
              <div className="flex items-center gap-3">
                <span style={{ color: "rgba(212,175,55,0.80)" }}>{panel.icon}</span>
                <div>
                  <div
                    className="text-[11px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: "rgba(212,175,55,0.90)", fontFamily: "'Cinzel', serif" }}
                  >
                    {panel.title}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {panel.subtitle}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
                aria-label="Close drawer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Mode-specific sections */}
            <div className="flex-1 py-3">
              {panel.sections.map((section, si) => {
                const visibleLinks = section.links.filter(
                  link => !(link.authOnly && !user)
                );
                if (visibleLinks.length === 0) return null;
                return (
                  <div key={si} className={si > 0 ? "mt-5" : ""}>
                    {section.heading && (
                      <div
                        className="px-5 pb-2 text-[9px] font-bold tracking-[0.22em] uppercase"
                        style={{ color: "rgba(212,175,55,0.40)" }}
                      >
                        {section.heading}
                      </div>
                    )}
                    {visibleLinks.map((link, li) => {
                      const active = link.path !== "__logout__" && !link.path.startsWith("__external__") && isActive(link.path);
                      return (
                        <button
                          key={li}
                          onClick={() => handleLinkClick(link.path)}
                          className="w-full flex items-start gap-3 px-5 py-3 text-left transition-colors"
                          style={{
                            background: active ? "rgba(212,175,55,0.07)" : "transparent",
                            borderLeft: active
                              ? "2px solid rgba(212,175,55,0.65)"
                              : "2px solid transparent",
                          }}
                          onMouseEnter={e => {
                            if (!active)
                              (e.currentTarget as HTMLElement).style.background =
                                "rgba(255,255,255,0.04)";
                          }}
                          onMouseLeave={e => {
                            if (!active)
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          <span
                            className="mt-0.5 flex-shrink-0"
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
                          <div className="flex-1 min-w-0">
                            <div
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
                            </div>
                            {link.description && (
                              <div
                                className="text-[11px] mt-0.5 truncate"
                                style={{ color: "rgba(255,255,255,0.28)" }}
                              >
                                {link.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer — What's New + sign-in prompt for guests */}
            <div
              className="flex-shrink-0 px-3 pb-5 pt-2"
              style={{ borderTop: "1px solid rgba(212,175,55,0.08)" }}
            >
              <button
                onClick={handleWhatsNew}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm"
                style={{ color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)")
                }
                onMouseLeave={e =>
                  ((e.currentTarget as HTMLElement).style.background = "transparent")
                }
              >
                <Sparkles size={14} style={{ color: "rgba(212,175,55,0.45)", flexShrink: 0 }} />
                <span className="flex-1 text-left text-[12px]">What's New</span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background: "rgba(212,175,55,0.10)",
                    color: "#D4AF37",
                    border: "1px solid rgba(212,175,55,0.18)",
                  }}
                >
                  {WHATS_NEW_VERSION}
                </span>
              </button>

              {!user && (
                <a
                  href={getLoginUrl()}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm mt-1"
                  style={{ color: "rgba(212,175,55,0.80)" }}
                  onMouseEnter={e =>
                    ((e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)")
                  }
                  onMouseLeave={e =>
                    ((e.currentTarget as HTMLElement).style.background = "transparent")
                  }
                >
                  <LogIn size={14} style={{ flexShrink: 0 }} />
                  <span className="text-[12px]">Sign In</span>
                </a>
              )}
            </div>
          </>
        ) : (
          /* Fallback: drawer open but no mode selected (shouldn't happen) */
          <div className="flex items-center justify-center flex-1">
            <span style={{ color: "rgba(255,255,255,0.20)", fontSize: 12 }}>Select a mode</span>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
