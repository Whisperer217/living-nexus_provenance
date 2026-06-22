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
   Desktop: LeftRail (72px fixed) + ContextDrawer + MainColumn + RightRail
   Mobile:  LeftRail (off-canvas) + mobile header (hamburger + logo + bell)
=================================================================== */
import { useState, useCallback, useEffect } from "react";
import LeftRail from "@/components/layout/LeftRail";
import type { NavMode } from "@/components/layout/LeftRail";
import RightRail from "@/components/layout/RightRail";
import ContextDrawer from "@/components/layout/ContextDrawer";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRightRail } from "@/contexts/RightRailContext";
import GlobalPlayer from "@/components/player/GlobalPlayer";
import WitnessSurfacePlayer from "@/components/player/WitnessSurfacePlayer";
import TheaterPlayer from "@/components/player/TheaterPlayer";
import MarketplaceDrawer from "@/components/MarketplaceDrawer";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import TopBar from "@/components/layout/TopBar";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { trpc } from "@/lib/trpc";
import { useLightsMode } from "@/contexts/LightsModeContext";
import { Menu, X, Bell } from "lucide-react";
import { Z } from "@/lib/viewportLayers";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";

/** Routes where the RightRail is suppressed */
const CREATOR_FOCUS_ROUTES = [
  "/upload",
  "/batch-upload",
  "/dashboard",
  "/settings",
  "/profile",
  "/keeper-compose",
  "/admin",
  "/guides/upload",
  "/redeem",
  "/pricing",
  "/checkout",
  "/stripe-connect",
  "/payouts",
  "/creator-payouts",
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { state } = usePlayer();
  const isCreatorFocus = CREATOR_FOCUS_ROUTES.some(
    (r) => location === r || location.startsWith(r + "/") || location.startsWith(r + "?")
  ) || location.includes("/studio");
  const { user, loading: authLoading, logout } = useAuth();
  const { isOpen: rightRailOpen } = useRightRail();

  // ── Desktop: ContextDrawer two-state model ──────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<NavMode | null>(null);

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
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
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

  // ── Warm theme tokens ──────────────────────────────────────────────
  const { mode: lightsMode } = useLightsMode();
  const isWarm = lightsMode === "on";
  const MOBILE_HEADER_BG = isWarm ? "rgba(55,68,85,0.72)" : "rgba(0,0,0,0.97)";
  const MOBILE_HEADER_BORDER = isWarm ? "rgba(100,125,150,0.22)" : "rgba(196,154,40,0.16)";

  return (
    <div
      className="noise-overlay flex flex-col h-dvh overflow-hidden bg-background relative"
      style={{ overscrollBehavior: "none" }}
    >
      {/* ── LeftRail — unified navigation authority (desktop + mobile) ── */}
      <LeftRail
        drawerOpen={drawerOpen}
        activeMode={activeMode}
        onRailClick={handleRailClick}
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobileMenu}
      />

      {/* ── ContextDrawer — desktop only ── */}
      <ContextDrawer
        open={drawerOpen}
        activeMode={activeMode}
        onClose={() => setDrawerOpen(false)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
      />

      {/* ── TopBar — desktop only (hidden on mobile) ── */}
      <TopBar archiveSongCount={archiveSongCount} unreadCount={unreadCount as number} />

      {/* ==============================================
          MOBILE HEADER (< lg)
          Hamburger toggles LeftRail off-canvas state.
          No overlayController. No body lock.
      ============================================== */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 flex items-center gap-3 px-4 py-3"
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

      {/* ==============================================
          PAGE CONTENT
          Desktop: lg:pl-[72px] to clear LeftRail
          Mobile:  pt-14 (56px) to clear mobile header
      ============================================== */}
      <div
        className={`flex-1 flex overflow-hidden pt-14 lg:pt-[56px] ${drawerOpen ? "lg:pl-[372px]" : "lg:pl-[72px]"}`}
        style={{
          overscrollBehavior: "none",
          transition: "padding-left 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <main className="flex-1 flex overflow-hidden" style={{ overscrollBehavior: "none" }}>
          <style>{`
            @media (min-width: 1024px) { .player-scroll-area { padding-bottom: 130px !important; } }
            @media (min-width: 768px) and (max-width: 1023px) { .player-scroll-area { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; } }
            @media (max-width: 767px) { .player-scroll-area { padding-bottom: var(--bottom-stack) !important; } }
          `}</style>

          <div
            className={`flex-1 overflow-y-auto overflow-x-hidden player-scroll-area ${rightRailOpen && !isCreatorFocus ? "lg:pr-[300px]" : ""}`}
            style={{ overscrollBehaviorX: "none", overscrollBehaviorY: "none", touchAction: "pan-y" }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ── PLAYER LAYER ── */}
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
      <MarketplaceDrawer />
      <ScrollToTopButton />

      {whatsNewOpen && (
        <WhatsNewModal forceOpen={true} onClose={() => setWhatsNewOpen(false)} />
      )}
    </div>
  );
}
