/* ===================================================================
   LIVING NEXUS -- MainLayout v6 (Render Layer Separation + Isomorphic Nav)

   Render Layer Ownership (no shared layout dependencies):
   - ContentLayer  : scrollable page content (contain: layout paint)
   - PlayerLayer   : GlobalPlayer + TheaterPlayer (contain: layout paint)
   - GuideLayer    : FloatingAvatar / KeeperAvatarWidget (contain: layout paint)
   - DrawerLayer   : ContextDrawer + MobileNavDrawer (portal, contain: layout paint)
   Each layer: will-change: transform; position: fixed or isolated stacking context
   Desktop: LeftRail (72px fixed) + ContextDrawer + MainColumn + RightRail
   Mobile:  Hamburger + MobileNavDrawer (full-screen portal)

   Navigation Contract:
   - Desktop: Rail icon → ContextDrawer → navigate
   - Mobile:  Hamburger → MobileNavDrawer → navigate
   - TopBar:  NO navigation links (search + actions only)
   - Single NAV_ITEMS source of truth (shared/navItems.ts)
=================================================================== */
import { useState, useCallback, useEffect, useRef } from "react";
import LeftRail from "@/components/layout/LeftRail";
import type { NavMode } from "@/components/layout/LeftRail";
import RightRail from "@/components/layout/RightRail";
import ContextDrawer from "@/components/layout/ContextDrawer";
import MobileNavDrawer from "@/components/layout/MobileNavDrawer";
import { useLocation } from "wouter";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import GlobalPlayer from "@/components/player/GlobalPlayer";
import WitnessSurfacePlayer from "@/components/player/WitnessSurfacePlayer";
import TheaterPlayer from "@/components/player/TheaterPlayer";
import PlaylistDrawer from "@/components/player/PlaylistDrawer";
import MarketplaceDrawer from "@/components/MarketplaceDrawer";
import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import TopBar from "@/components/layout/TopBar";
import LiveActivityPanel from "@/components/layout/LiveActivityPanel";
import { WhatsNewModal } from "@/components/WhatsNewModal";
import { trpc } from "@/lib/trpc";
import { useLightsMode } from "@/contexts/LightsModeContext";
import { Menu, X, Bell } from "lucide-react";
import { overlayOpen, overlayClose } from "@/lib/overlayController";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { state } = usePlayer();
  const { user, loading: authLoading, logout } = useAuth();

  // ── Desktop: ContextDrawer two-state model ──────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<NavMode | null>(null);
  const drawerOpenRef = useRef(drawerOpen);
  const activeModeRef = useRef(activeMode);
  drawerOpenRef.current = drawerOpen;
  activeModeRef.current = activeMode;
  // Rail click: set activeMode + open drawer; clicking same mode toggles visibility
  // Exclusivity guard: opening the context drawer closes all right-side drawers
  // (PlaylistDrawer, MarketplaceDrawer) via a custom event so they can self-close.
  const handleRailClick = useCallback((mode: NavMode) => {
    const wasOpen = drawerOpenRef.current;
    const wasMode = activeModeRef.current;
    setActiveMode(mode);
    // If already open on the same mode → close; otherwise open + close right drawers
    if (wasOpen && wasMode === mode) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(true);
      // Signal right-side drawers to close so only one drawer surface is active at a time
      window.dispatchEvent(new CustomEvent("ln:close-right-drawers"));
    }
  }, []);

  // ── Mobile: MobileNavDrawer state ─────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
    overlayOpen("menu");
  }, []);
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    overlayClose("menu");
  }, []);

  // ── What's New modal ───────────────────────────────────────────────
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);

  // Listen for ln:open-whats-new custom event (dispatched by ContextDrawer / MobileNavDrawer)
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

  // ── Warm theme tokens (mobile chrome only) ─────────────────────────
  const { mode: lightsMode } = useLightsMode();
  const isWarm = lightsMode === "on";
  const MOBILE_HEADER_BG = isWarm ? "rgba(55,68,85,0.72)" : "var(--ln-coal)";
  const MOBILE_HEADER_BORDER = isWarm ? "rgba(100,125,150,0.22)" : "rgba(44,52,56,0.35)";

  return (
    <div
      className="noise-overlay flex flex-col h-dvh overflow-hidden bg-[#111009] relative"
      style={{ overscrollBehavior: "none" }}
    >
      {/* ── LeftRail -- fixed 72px column, desktop only ── */}
      <LeftRail drawerOpen={drawerOpen} activeMode={activeMode} onRailClick={handleRailClick} />

      {/* ── ContextDrawer -- portaled overlay, desktop only ── */}
      <ContextDrawer
        open={drawerOpen}
        activeMode={activeMode}
        onClose={() => setDrawerOpen(false)}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
      />

      {/* ── TopBar -- desktop only (hidden on mobile) ── */}
      <TopBar archiveSongCount={archiveSongCount} unreadCount={unreadCount as number} />

      {/* ── LiveActivityPanel -- desktop only, self-contained ── */}
      <LiveActivityPanel />

      {/* ==============================================
          MOBILE HEADER (< lg)
          Hamburger + Logo + Bell
      ============================================== */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-[400] flex items-center gap-3 px-4 py-3"
        style={{
          background: MOBILE_HEADER_BG,
          borderBottom: `1px solid ${MOBILE_HEADER_BORDER}`,
          transition: "background 0.4s ease",
        }}
      >
        {/* Hamburger -- opens MobileNavDrawer */}
        <button
          onClick={mobileMenuOpen ? closeMobileMenu : openMobileMenu}
          className="p-2 rounded-lg transition-all"
          style={{ color: "rgba(255,255,255,0.6)" }}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Logo + wordmark */}
        <div className="flex items-center gap-2 flex-1">
          <img src={LOGO_URL} alt="LN" className="w-7 h-7 object-contain" />
          <span className="font-display text-base gold-shimmer">Living Nexus</span>
        </div>

        {/* Bell -- opens What's New modal */}
        {!!user && (
          <button
            onClick={() => setWhatsNewOpen(true)}
            className="relative flex items-center justify-center rounded-lg transition-all"
            style={{ minWidth: 44, minHeight: 44, color: "rgba(255,255,255,0.4)" }}
            aria-label="What's New"
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

      {/* ── MobileNavDrawer -- full-screen, portal-based, mobile only ── */}
      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        onOpenWhatsNew={() => setWhatsNewOpen(true)}
      />

      {/* ── WSP (Witness Surface Player) -- top-anchored, under navbar ── */}
      <WitnessSurfacePlayer />

      {/* ==============================================
          PAGE CONTENT
          Desktop: lg:pl-[72px] to clear LeftRail
          Mobile:  pt-14 + 60px WSP to clear mobile header + surface bar
      ============================================== */}
      <div
        className={`flex-1 flex overflow-hidden pt-[116px] lg:pt-[56px] ${drawerOpen ? "lg:pl-[372px]" : "lg:pl-[72px]"}`}
        style={{
          overscrollBehavior: "none",
          transition: "padding-left 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <main className="flex-1 flex overflow-hidden" style={{ overscrollBehavior: "none" }}>
          <style>{`
            /* Desktop: player spans MainColumn only, 110px bottom clearance */
            @media (min-width: 1024px) { .player-scroll-area { padding-bottom: 130px !important; } }
            /* Tablet md: full-width player, 72px clearance */
            @media (min-width: 768px) and (max-width: 1023px) { .player-scroll-area { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important; } }
            /* Mobile: nav (56px + safe-area) + mini player (64px) = full bottom stack */
            @media (max-width: 767px) { .player-scroll-area { padding-bottom: var(--bottom-stack) !important; } }
          `}</style>

          {/* MainColumn -- fluid, scrollable. lg:pr-[300px] reserves space for the fixed RightRail */}
          <div
            className="flex-1 overflow-y-auto player-scroll-area lg:pr-[300px]"
            style={{ overscrollBehaviorX: "none", overscrollBehaviorY: "none", touchAction: "pan-y" }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* ==============================================
          PLAYER LAYER -- isolated, no layout dependency
          GlobalPlayer is kept for audio engine only (hidden UI).
          WitnessSurfacePlayer (WSP) provides all visible UI.
          TheaterPlayer remains for desktop theater mode.
      ============================================== */}
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
        {/* Theater Player */}
        <div style={{ pointerEvents: "auto" }}>
          <TheaterPlayer />
        </div>
      </div>

       {/* ============================================
          RIGHT RAIL -- fixed, right: 0, z-index: 80
          Anchored independently so ContextDrawer (z:300) always wins.
          Content area has lg:pr-[300px] to prevent overlap.
      ============================================ */}
      <RightRail />

      {/* ============================================
          DRAWER LAYER -- portal-based, isolated
      ============================================ */}
      {/* Playlist Drawer */}
      <PlaylistDrawer />

      {/* Marketplace Drawer */}
      <MarketplaceDrawer />

      {/* Scroll to top */}
      <ScrollToTopButton />

      {/* What's New Modal */}
      {whatsNewOpen && (
        <WhatsNewModal forceOpen={true} onClose={() => setWhatsNewOpen(false)} />
      )}
    </div>
  );
}
