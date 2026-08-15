/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ContextDrawer v4 (Mode-Driven)
   ─────────────────────────────────────────────────────────────────
   Contract:
   • Rail selects a mode → drawer opens and renders ONLY that mode's panel
   • Each mode has its own panel: header + contextual links + actions
   • No universal nav list. No mixed content. One mode. One panel.
   • Desktop: in-flow GPT-style sidebar (class .ln-context-drawer--open)
   • Mobile: overlay slide from the 72px rail
   • Close on: mobile backdrop, Escape. Desktop persists across navigation.
═══════════════════════════════════════════════════════════════════ */
import { useEffect, useCallback } from "react";
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
  Layers, Plus, GitBranch,
} from "lucide-react";
import { PLATFORM_VERSION } from "@/platformVersion";
import { usePlayer } from "@/contexts/PlayerContext";
import { provenanceFromWid } from "@shared/provenanceWorkingState";

// ── Types ─────────────────────────────────────────────────────────

export type NavMode = "home" | "explore" | "upload" | "manage" | "archive";

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

// ── Mode-specific panel definitions — Loop music provenance spine ─

const PANELS: Record<NavMode, ModePanel> = {
  home: {
    icon: <Home size={17} />,
    title: "Loop",
    subtitle: "Music provenance hub",
    sections: [
      {
        links: [
          { icon: <LayoutGrid size={14} />, label: "Discover", path: "/", description: "Featured works & creators" },
          { icon: <Star size={14} />, label: "New Arrivals", path: "/explore?mode=new", description: "Recently registered tracks" },
          { icon: <TrendingUp size={14} />, label: "Trending", path: "/explore?sort=trending", description: "Most played this week" },
        ],
      },
      {
        heading: "Registry",
        links: [
          { icon: <Shield size={14} />, label: "Verify a WID", path: "/verify", description: "Confirm authorship", gold: true },
          { icon: <BookMarked size={14} />, label: "Witness Registry", path: "/witness-registry", description: "Public ledger of sealed works" },
          { icon: <ScrollText size={14} />, label: "WID Specification", path: "/doctrine/wid-spec", description: "How Witness IDs work" },
        ],
      },
      {
        heading: "Platform",
        links: [
          { icon: <ScrollText size={14} />, label: "Manifesto", path: "/manifesto", description: "Living Nexus doctrine" },
          { icon: <Library size={14} />, label: "Lexicon", path: "/lexicon", description: "Platform language" },
          { icon: <Scale size={14} />, label: "Terms", path: "/terms", description: "Code of ethics & terms" },
        ],
      },
    ],
  },

  explore: {
    icon: <Compass size={17} />,
    title: "Explore",
    subtitle: "Browse registered music",
    sections: [
      {
        links: [
          { icon: <Music size={14} />, label: "All Music", path: "/explore", gold: true },
          { icon: <Star size={14} />, label: "New Arrivals", path: "/explore?mode=new" },
          { icon: <TrendingUp size={14} />, label: "Trending", path: "/explore?sort=trending" },
        ],
      },
      {
        heading: "Creators",
        links: [
          { icon: <Users size={14} />, label: "Browse Creators", path: "/explore?filter=creators" },
          { icon: <Star size={14} />, label: "Founding Creators", path: "/founders", description: "Earliest provenance anchors" },
        ],
      },
      {
        heading: "Verify",
        links: [
          { icon: <Shield size={14} />, label: "Verify WID", path: "/verify", description: "Confirm a Witness ID" },
        ],
      },
    ],
  },

  upload: {
    icon: <Upload size={17} />,
    title: "Register",
    subtitle: "Seal music with a Witness ID",
    sections: [
      {
        links: [
          { icon: <Shield size={14} />, label: "Register Music", path: "/manifest", description: "Issue a WID via the Loop engine", authOnly: true, gold: true },
          { icon: <Upload size={14} />, label: "Batch Register", path: "/batch-upload", description: "Register multiple tracks", authOnly: true },
        ],
      },
      {
        heading: "Your record",
        links: [
          { icon: <LayoutGrid size={14} />, label: "Manage Works", path: "/manage", description: "Status, edit, provenance", authOnly: true },
          { icon: <Archive size={14} />, label: "Archive", path: "/archive", description: "Personal listening archive", authOnly: true },
        ],
      },
    ],
  },

  manage: {
    icon: <LayoutDashboard size={17} />,
    title: "Manage",
    subtitle: "Works & creator stewardship",
    sections: [
      {
        links: [
          { icon: <LayoutGrid size={14} />, label: "Works Ledger", path: "/manage", description: "Publish, draft, unlisted", authOnly: true, gold: true },
          { icon: <User size={14} />, label: "Public Profile", path: "__my_public_profile__", description: "How witnesses see you", authOnly: true },
          { icon: <Settings size={14} />, label: "Identity Settings", path: "/profile", description: "Bio, photo, handle", authOnly: true },
        ],
      },
      {
        heading: "Archive & export",
        links: [
          { icon: <Archive size={14} />, label: "My Archive", path: "/archive", authOnly: true },
          { icon: <Download size={14} />, label: "Export Data", path: "/my-archive/export", description: "Download your provenance record", authOnly: true },
        ],
      },
      {
        heading: "Account",
        links: [
          { icon: <Shield size={14} />, label: "Billing", path: "/settings/billing", authOnly: true },
          { icon: <LogOut size={14} />, label: "Log Out", path: "__logout__", authOnly: true, danger: true },
        ],
      },
    ],
  },

  archive: {
    icon: <Archive size={17} />,
    title: "Archive",
    subtitle: "Your listening & provenance record",
    sections: [
      {
        links: [
          { icon: <Archive size={14} />, label: "My Archive", path: "/archive", description: "Saved & owned works", authOnly: true, gold: true },
          { icon: <Download size={14} />, label: "Export Archive", path: "/my-archive/export", description: "Download ZIP + provenance JSON", authOnly: true },
          { icon: <Shield size={14} />, label: "Witness Registry", path: "/witness-registry", description: "Public ledger" },
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
  const { state: playerState } = usePlayer();
  const boundTrack = playerState.currentIdx >= 0 ? playerState.tracks[playerState.currentIdx] : null;
  const boundWid = boundTrack?.witnessId?.trim() || null;
  const boundProvenance = boundTrack ? provenanceFromWid(boundWid) : "idle";

  const persistDesktopSidebar = () =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

  // Close on Escape (collapses the GPT-style sidebar)
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
        logout().finally(() => { if (!persistDesktopSidebar()) onClose(); navigate("/"); });
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
        if (!persistDesktopSidebar()) onClose();
        return;
      }
      if (path.startsWith("__external__")) {
        window.open(path.replace("__external__", ""), "_blank", "noopener,noreferrer");
        if (!persistDesktopSidebar()) onClose();
        return;
      }
      navigate(path);
      if (!persistDesktopSidebar()) onClose();
    },
    [navigate, onClose, logout, user]
  );

  const handleWhatsNew = useCallback(() => {
    if (!persistDesktopSidebar()) onClose();
    if (onOpenWhatsNew) {
      onOpenWhatsNew();
    } else {
      window.dispatchEvent(new CustomEvent("ln:open-whats-new"));
    }
  }, [onClose, onOpenWhatsNew]);

  const panel = activeMode ? PANELS[activeMode] : null;

  return (
    <>
      <div
        className={`ln-context-drawer__backdrop${open ? " ln-context-drawer__backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        id="context-drawer"
        data-context={activeMode ?? "loop"}
        role="navigation"
        aria-label={panel ? `${panel.title} navigation` : "Navigation"}
        aria-hidden={!open}
        className={`ln-context-drawer${open ? " ln-context-drawer--open" : ""}`}
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
                  <div className="text-[10px] mt-0.5" style={{ color: "color-mix(in srgb, var(--ln-parchment) 35%, transparent)" }}>
                    {panel.subtitle}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                style={{ color: "color-mix(in srgb, var(--ln-parchment) 35%, transparent)" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--ln-parchment) 75%, transparent)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "color-mix(in srgb, var(--ln-parchment) 35%, transparent)")}
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
                                "color-mix(in srgb, var(--ln-parchment) 4%, transparent)";
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
                                : "color-mix(in srgb, var(--ln-parchment) 32%, transparent)",
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
                                  : "color-mix(in srgb, var(--ln-parchment) 72%, transparent)",
                              }}
                            >
                              {link.label}
                            </div>
                            {link.description && (
                              <div
                                className="text-[11px] mt-0.5 truncate"
                                style={{ color: "color-mix(in srgb, var(--ln-parchment) 28%, transparent)" }}
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

            {boundTrack && (
              <div
                className="flex-shrink-0 mx-3 mb-2 px-3 py-2.5 rounded-xl"
                data-bound-work="true"
                data-provenance-state={boundProvenance}
                style={{
                  border: "1px solid rgba(212,175,55,0.18)",
                  background: "rgba(212,175,55,0.05)",
                }}
              >
                <div style={{ fontSize: 9, letterSpacing: "0.16em", color: "rgba(212,175,55,0.55)", fontFamily: "'Space Mono', monospace" }}>
                  BOUND WORK
                </div>
                <div className="truncate mt-1" style={{ fontSize: 13, color: "rgba(212,175,55,0.95)" }}>
                  {boundTrack.title}
                </div>
                <div className="truncate" style={{ fontSize: 11, color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}>
                  {boundTrack.artist || "Unknown"}
                </div>
                {boundProvenance === "sealed" && boundWid ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/verify/${encodeURIComponent(boundWid)}`)}
                    className="mt-1.5 text-left"
                    style={{ fontSize: 10, color: "rgba(212,175,55,0.85)", fontFamily: "'Space Mono', monospace" }}
                  >
                    Sealed · {boundWid} · Verify
                  </button>
                ) : (
                  <div style={{ fontSize: 10, color: "color-mix(in srgb, var(--ln-parchment) 40%, transparent)", marginTop: 6, lineHeight: 1.45 }}>
                    Unsealed — this hearing has no WID. Register to give it a record. Do not invent lineage here.
                  </div>
                )}
              </div>
            )}

            {/* Footer — What's New + sign-in prompt for guests */}
            <div
              className="flex-shrink-0 px-3 pb-5 pt-2"
              style={{ borderTop: "1px solid rgba(212,175,55,0.08)" }}
            >
              <button
                onClick={handleWhatsNew}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm"
                style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}
                onMouseEnter={e =>
                  ((e.currentTarget as HTMLElement).style.background = "color-mix(in srgb, var(--ln-parchment) 4%, transparent)")
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
            <span style={{ color: "color-mix(in srgb, var(--ln-parchment) 20%, transparent)", fontSize: 12 }}>Select a mode</span>
          </div>
        )}
      </aside>
    </>
  );
}
