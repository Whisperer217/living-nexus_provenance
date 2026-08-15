/* ===================================================================
   LIVING NEXUS -- MainLayout v7 (Unified Navigation Authority)

   NAVIGATION DOCTRINE:
   - The LeftRail is the sole navigation component across all viewports.
   - Mobile shows the same LeftRail off-canvas via transform only.
   - MobileNavDrawer is removed. overlayController is NOT used for nav.
   - The backdrop in LeftRail owns dismissal only — no body manipulation.

   Render Layer Ownership:
   - ContentLayer  : scrollable page content
   - PlayerLayer   : GlobalPlayer + TheaterPlayer
   - GuideLayer    : FloatingAvatar / KeeperAvatarWidget
   Desktop: in-flow LeftRail (72px) + ContextDrawer + MainColumn + RightRail
   Mobile:  LeftRail (off-canvas) + in-flow mobile header
=================================================================== */
import { useState, useCallback, useEffect } from "react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import LeftRail from "@/components/layout/LeftRail";
import type { NavMode } from "@/components/layout/LeftRail";
import RightRail from "@/components/layout/RightRail";
import ContextDrawer from "@/components/layout/ContextDrawer";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRightRail } from "@/contexts/RightRailContext";
import GlobalPlayer from "@/components/player/GlobalPlayer";
import WitnessSurfacePlayer from "@/components/player/WitnessSurfacePlayer";
import TheaterPlayer from "@/components/player/TheaterPlayer";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import SiteFooter from "@/components/layout/SiteFooter";
import TopBar from "@/components/layout/TopBar";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { Menu, X, Bell, Sparkles } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Z } from "@/lib/viewportLayers";
import { DISCORD_COMMUNITY_URL } from "@/lib/loopProduct";
import { DiscordGlyph as SharedDiscordGlyph } from "@/components/icons/DiscordGlyph";

const LOGO_URL = "/manus-storage/living-nexus-logo-2025_19c2d497.png";

function DiscordGlyph({ size = 18 }: { size?: number }) {
  return <SharedDiscordGlyph size={size} />;
}

/** Routes where the RightRail is suppressed */
const CREATOR_FOCUS_ROUTES = [
  "/upload",
  "/batch-upload",
  "/manifest",
  "/manage",
  "/dashboard",
  "/settings",
  "/profile",
  "/admin",
  "/redeem",
  "/pricing",
  "/checkout",
  "/stripe-connect",
  "/payouts",
  "/creator-payouts",
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const isCreatorFocus = CREATOR_FOCUS_ROUTES.some(
    (r) => location === r || location.startsWith(r + "/") || location.startsWith(r + "?")
  ) || location.includes("/studio");
  const { user, loading: authLoading, logout } = useAuth();
  const { isOpen: rightRailOpen } = useRightRail();

  // GPT-style: desktop sidebar starts open (Home panel). Mobile starts closed.
  const [drawerOpen, setDrawerOpen] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  const [activeMode, setActiveMode] = useState<NavMode | null>(
    () => (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches ? "home" : null),
  );

  const handleRailClick = useCallback((mode: NavMode) => {
    setActiveMode(mode);
    if (drawerOpen && activeMode === mode) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(true);
      window.dispatchEvent(new CustomEvent("ln:close-right-drawers"));
    }
  }, [drawerOpen, activeMode]);

  // ── Mobile: sidebar open state ─────────────────────────────────────
  // DOCTRINE: This is pure React state. No overlayController. No body lock.
  // The LeftRail component handles the off-canvas transform presentation.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setDrawerOpen(false);
  }, []);

  // Mobile overlay dismisses on route change. Desktop GPT sidebar stays open.
  useEffect(() => {
    setMobileMenuOpen(false);
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
      setDrawerOpen(false);
    }
  }, [location]);

  // ── What's New modal ───────────────────────────────────────────────
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  useEffect(() => {
    const handler = () => setWhatsNewOpen(true);
    window.addEventListener("ln:open-whats-new", handler);
    return () => window.removeEventListener("ln:open-whats-new", handler);
  }, []);

  // ── Notification badge count ───────────────────────────────────────
  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // ── Archive badge count ────────────────────────────────────────────
  const { data: mySongs } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const archiveSongCount = mySongs ? mySongs.filter((s: any) => s.status !== "Deleted").length : 0;

  // ── Global pull-to-refresh ─────────────────────────────────────────
  // Mounted once in MainLayout so every page gets PTR for free.
  // Uses window.location.reload() as the generic refresh action so it works
  // on any page without needing to know which tRPC queries are active.
  const { pullProgress, isRefreshing, indicatorY } = usePullToRefresh({
    onRefresh: async () => {
      await new Promise<void>((resolve) => {
        // Brief pause so the spinner is visible before reload
        setTimeout(() => {
          window.location.reload();
          resolve();
        }, 300);
      });
    },
  });

  // ── Light-scheme chrome tokens (follow ThemeProvider, not lights preference alone)
  const { scheme } = useTheme();
  const isWarm = scheme === "light";
  const MOBILE_HEADER_BG = isWarm
    ? "color-mix(in srgb, var(--ln-coal) 92%, transparent)"
    : "rgba(0,0,0,0.97)";
  const MOBILE_HEADER_BORDER = isWarm ? "var(--ln-panel-border)" : "rgba(196,154,40,0.16)";

  return (
    <div
      className="noise-overlay flex h-dvh overflow-hidden bg-background relative"
      style={{ overscrollBehavior: "none" }}
    >
      {/* ── LeftRail — unified navigation authority (desktop + mobile) ── */}
      <LeftRail
        drawerOpen={drawerOpen}
        activeMode={activeMode}
        onRailClick={handleRailClick}
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobileMenu}
        archiveSongCount={archiveSongCount}
      />

      <ContextDrawer
        open={drawerOpen}
        activeMode={activeMode}
        onClose={() => setDrawerOpen(false)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* ── TopBar — in-flow player strip lives here (desktop/tablet) ── */}
      <TopBar archiveSongCount={archiveSongCount} unreadCount={unreadCount as number} />

      {/* ==============================================
          MOBILE HEADER (< lg)
          Hamburger toggles LeftRail off-canvas state.
          No overlayController. No body lock.
      ============================================== */}
      <div
        className="lg:hidden flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          zIndex: Z.MOBILE_HEADER,
          background: MOBILE_HEADER_BG,
          borderBottom: `1px solid ${MOBILE_HEADER_BORDER}`,
          transition: "background 0.4s ease",
        }}
      >
        {/* Hamburger — toggles LeftRail mobile state only */}
        <button
          onClick={mobileMenuOpen ? closeMobileMenu : openMobileMenu}
          className="p-2 rounded-lg transition-all"
          style={{ color: "rgba(255,255,255,0.6)", WebkitTapHighlightColor: "transparent" }}
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-rail"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo + wordmark */}
        <div className="flex items-center gap-2 flex-1">
          <img src={LOGO_URL} alt="LN" className="w-7 h-7 object-contain" />
          <span className="font-display text-base gold-shimmer">Living Nexus</span>
        </div>

        {/* Discord — always available on mobile */}
        <a
          href={DISCORD_COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-lg transition-all"
          style={{ minWidth: 44, minHeight: 44, color: "var(--ln-gold)", WebkitTapHighlightColor: "transparent" }}
          aria-label="Join Discord"
          title="Join Living Nexus on Discord"
        >
          <SharedDiscordGlyph size={18} />
        </a>

        {/* Compose shortcut — mobile only */}
        {!!user && (
          <button
            onClick={() => navigate("/keeper-compose")}
            className="flex items-center justify-center rounded-lg transition-all"
            style={{ minWidth: 44, minHeight: 44, color: "rgba(255,255,255,0.4)", WebkitTapHighlightColor: "transparent" }}
            aria-label="Compose"
          >
            <Sparkles size={18} />
          </button>
        )}

        {/* Theme Switcher — mobile */}
        <ThemeSwitcher compact />

        {/* Bell */}
        {!!user && (
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex items-center justify-center rounded-lg transition-all"
            style={{ minWidth: 44, minHeight: 44, color: "rgba(255,255,255,0.4)", WebkitTapHighlightColor: "transparent" }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {(unreadCount as number) > 0 && (
              <span
                className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--ln-ember)" }}
              />
            )}
          </button>
        )}
      </div>

      {/* ── WSP (Witness Surface Player) — mobile only ── */}
      <WitnessSurfacePlayer />

      <div
        className="flex-1 flex overflow-hidden min-h-0"
        style={{ overscrollBehavior: "none" }}
      >
        <main className="flex-1 flex overflow-hidden" data-region="content" style={{ overscrollBehavior: "none" }}>
          <style>{`
            @media (min-width: 1024px) { .player-scroll-area { padding-bottom: 24px !important; } }
            @media (min-width: 768px) and (max-width: 1023px) { .player-scroll-area { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; } }
            @media (max-width: 767px) { .player-scroll-area { padding-bottom: var(--bottom-stack) !important; } }
          `}</style>

          <PullToRefreshIndicator
            pullProgress={pullProgress}
            isRefreshing={isRefreshing}
            indicatorY={indicatorY}
          />

          <div
            id="main-scroll"
            className={`flex-1 overflow-y-auto overflow-x-hidden player-scroll-area ${rightRailOpen && !isCreatorFocus ? "lg:pr-[300px]" : ""}`}
            style={{ overscrollBehaviorX: "none", overscrollBehaviorY: "none", touchAction: "pan-y" }}
          >
            {children}
            <SiteFooter />
          </div>
        </main>
      </div>
      </div>

      {/* ── PLAYER LAYER — expanded / theater only; desktop mini lives in TopBar ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          contain: "layout paint",
          willChange: "transform",
          zIndex: 0,
        }}
      >
        <div style={{ pointerEvents: "auto" }}><GlobalPlayer /></div>
        <div style={{ pointerEvents: "auto" }}><TheaterPlayer /></div>
      </div>

      {/* ── RIGHT RAIL ── */}
      <RightRail />

      {/* ── DRAWER LAYER ── */}
      {/* Marketplace / skins commerce lives on PNA Store (/avatar-registry) — not Loop chrome */}
      <ScrollToTopButton />

      {whatsNewOpen && (
        <WhatsNewModal forceOpen={true} onClose={() => setWhatsNewOpen(false)} />
      )}
    </div>
  );
}
