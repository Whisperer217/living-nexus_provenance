import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import React, { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Route, Switch, Redirect, useLocation, useParams } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import MainLayout from "./components/layout/MainLayout";
import QueueLoader from "./components/QueueLoader";
import { WhatsNewModal } from "./components/WhatsNewModal";
import WelcomeModal from "./components/WelcomeModal";
import { TosAcceptanceModal } from "./components/TosAcceptanceModal";
import { CommunityToastProvider } from "./components/CommunityToast";
import { AmbientPlayerProvider } from "./contexts/AmbientPlayerContext";
import { HarmonicProvider } from "./contexts/HarmonicContext";
import KeeperAvatarWidget from "./components/KeeperAvatarWidget";
import ProvenanceUploadEngine from "./components/ProvenanceUploadEngine";
import { useQrScanLogger } from "./hooks/useQrScanLogger";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { overlayCloseAll } from "@/lib/overlayController";
import { useWorkEditorActions } from "./contexts/WorkEditorContext";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import CinematicSplash, { shouldShowSplash } from "./components/CinematicSplash";

/** Logs QR scan events when ?qr= param is present in the URL. */
function QrScanLogger() {
  useQrScanLogger();
  return null;
}

/** Redirects legacy /track/:id URLs to the canonical /song/:id route. */
function TrackRedirect() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (id) navigate(`/song/${id}`, { replace: true });
  }, [id, navigate]);
  return null;
}

// Lazy-loaded page components — each becomes its own JS chunk
// This cuts initial bundle size significantly; pages load on first visit only
const HomePage = lazy(() => import("./pages/HomePage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const ManifestationStudio = lazy(() => import("./pages/manifestation-studio/ManifestationStudio"));
const BatchUploadPage = lazy(() => import("./pages/BatchUploadPage"));
const LikedPage = lazy(() => import("./pages/LikedPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const CreatorDataExportPage = lazy(() => import("./pages/CreatorDataExportPage"));
// TrackPage deprecated — /track/:id now redirects to /song/:id
const SongDetailPage = lazy(() => import("./pages/loop/LoopWorkPage"));
const CreatorProfilePage = lazy(() => import("./pages/loop/LoopCreatorPage"));
const LoopManagePage = lazy(() => import("./pages/loop/LoopManagePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const VerifyPage = lazy(() => import("./pages/VerifyPage"));
const ContributorsPage = lazy(() => import("./pages/ContributorsPage"));
const PlaylistPage = lazy(() => import("./pages/PlaylistPage"));
const ManifestoPage = lazy(() => import("./pages/ManifestoPage"));
const AttributionPage = lazy(() => import("./pages/AttributionPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const ModerationQueuePage = lazy(() => import("./pages/admin/ModerationQueuePage"));
const CommentModerationPage = lazy(() => import("./pages/admin/CommentModerationPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const MissionControlPage = lazy(() => import("./pages/admin/MissionControlPage"));
const PhysicalDistributionPage = lazy(() => import("./pages/admin/PhysicalDistributionPage"));
const PhaseLedgerPage = lazy(() => import("./pages/admin/MissionControl"));
const GuideAccessRequestsPage = lazy(() => import("./pages/admin/GuideAccessRequestsPage"));
const AdminNotificationsPage = lazy(() => import("./pages/AdminNotificationsPage"));
const SelfImprovementPage = lazy(() => import("./pages/SelfImprovementPage"));
const PaymentIntegrityPage = lazy(() => import("./pages/PaymentIntegrityPage"));
const TrustPage = lazy(() => import("./pages/TrustPage"));
const RedeemPage = lazy(() => import("./pages/RedeemPage"));
const PricingCovenantPage = lazy(() => import("./pages/PricingCovenantPage"));
const FieldNotesPage = lazy(() => import("./pages/FieldNotesPage"));
const WIDSpecPage = lazy(() => import("./pages/WIDSpecPage"));
const DoctrineStackPage = lazy(() => import("./pages/DoctrineStackPage"));
const LexiconPage = lazy(() => import("./pages/LexiconPage"));
// GlossaryPage merged into LexiconPage — /glossary redirects to /lexicon
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const WitnessRegistryPage = lazy(() => import("./pages/WitnessRegistryPage"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const StripToBone = lazy(() => import("./pages/StripToBone"));
const FoundersPage = lazy(() => import("./pages/FoundersPage"));
const FounderEraPage = lazy(() => import("./pages/FounderEraPage"));
const ArtworkNormalizationPage = lazy(() => import("./pages/ArtworkNormalizationPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const WitnessFlowPage = lazy(() => import("./pages/WitnessFlowPage"));
const LivingArchiveBillingPage = lazy(() => import("./pages/LivingArchiveBillingPage"));
const PlaybackSettingsPage = lazy(() => import("./pages/PlaybackSettingsPage"));
const PaymentMethodsPage = lazy(() => import("./pages/PaymentMethodsPage"));
const SharedPromptPage = lazy(() => import("./pages/SharedPromptPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const TosComparePage = lazy(() => import("./pages/TosComparePage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const MyProjectsPage = lazy(() => import("./pages/MyProjectsPage"));
const ProjectsDiscoveryPage = lazy(() => import("./pages/ProjectsDiscoveryPage"));
const BookDetailPage = lazy(() => import("./pages/BookDetailPage"));
const GameDetailPage = lazy(() => import("./pages/GameDetailPage"));
const GcodeDetailPage = lazy(() => import("./pages/GcodeDetailPage"));
const PlatformGuidesPage = lazy(() => import("./pages/PlatformGuidesPage"));
const CreatorStudioPage = lazy(() => import("./pages/CreatorStudioPage"));
const KeeperPage = lazy(() => import("./pages/KeeperPage"));
const KeeperComposePage = lazy(() => import("./pages/KeeperComposePage"));
const FirstWitnessPage = lazy(() => import("./pages/FirstWitnessPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const AvatarMarketplacePage = lazy(() => import("./pages/AvatarMarketplacePage"));
const PNAShellPage = lazy(() => import("./pages/PNAShellPage"));
const CreatorSurface = lazy(() => import("./pages/CreatorSurface"));
const GuideUploadWizard = lazy(() => import("./pages/GuideUploadWizard"));
const GuideDirectoryPage = lazy(() => import("./pages/GuideDirectoryPage"));
const GuideDetailPage = lazy(() => import("./pages/GuideDetailPage"));
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage"));
const DistributionPage = lazy(() => import("./pages/DistributionPage"));
const CreatorIdentityPage = lazy(() => import("./pages/CreatorIdentityPage"));
const CreatorDomainPage = lazy(() => import("./pages/CreatorDomainPage"));
const CollectionPage = lazy(() => import("./pages/CollectionPage"));
const ConstellationPage = lazy(() => import("./pages/ConstellationPage"));
const OnboardingManifest = lazy(() => import("./pages/OnboardingManifest"));
const DeveloperDashboardPage = lazy(() => import("./pages/DeveloperDashboardPage"));
const DevelopersPage = lazy(() => import("./pages/DevelopersPage"));
const LicensedDownloadsPage = lazy(() => import("./pages/LicensedDownloadsPage"));
const VisualWorksPage = lazy(() => import("./pages/VisualWorksPage"));
const VisualWorksNewPage = lazy(() => import("./pages/VisualWorksNewPage"));
const VisualWorksDetailPage = lazy(() => import("./pages/VisualWorksDetailPage"));
const CreatorCollectionPage = lazy(() => import("./pages/CreatorCollectionPage"));
const CollectionStudioPage = lazy(() => import("./pages/CollectionStudioPage"));
const AlbumDetailPage = lazy(() => import("./pages/AlbumDetailPage"));
const DesignSystemPage = lazy(() => import("./pages/DesignSystemPage"));
const SetupDomainPage = lazy(() => import("./pages/SetupDomainPage"));
const CreatorDomainShell = lazy(() => import("./pages/CreatorDomainShell"));
const NewManifestationPage = lazy(() => import("./pages/NewManifestationPage"));
const ManifestationWorkspacePage = lazy(() => import("./pages/ManifestationWorkspacePage"));
const SessionsListPage = lazy(() => import("./pages/SessionsListPage"));
const SharedPlaylistPage = lazy(() => import("./pages/SharedPlaylistPage"));
// UploadVNextPage removed — replaced by ProvenanceUploadEngine (persistent panel)

// Minimal fallback shown while a page chunk loads (typically <200ms on CDN)
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--ln-gold)", borderTopColor: "transparent" }} />
    </div>
  );
}

/**
 * Closes all overlays on every route change.
 * Prevents stale scroll locks surviving navigation — critical on mobile.
 */
/**
 * Global Scroll Restoration Manager — mounted once, governs all pages.
 * New forward navigation → scroll to top.
 * Back/Forward (browser history) → restore saved position.
 * No per-page scroll logic needed anywhere else.
 */
function ScrollRestorationManager() {
  useScrollRestoration();
  return null;
}

function OverlayRouteGuard() {
  const [location] = useLocation();
  const { closeEditor } = useWorkEditorActions();
  // useLayoutEffect fires before paint — ensures scroll lock is cleared
  // before the new page renders, preventing a single-frame frozen-scroll flash on mobile.
  //
  // CRITICAL FIX (Edit Work freeze pathology):
  // overlayCloseAll() clears the overlay lock but does NOT unmount the CreativeDrawer.
  // The drawer's fixed inset-0 backdrop remains in the DOM (editingSong is still set
  // in WorkEditorContext) and intercepts ALL pointer events on the new page — perceived
  // as a complete platform freeze requiring a refresh.
  // Fix: call closeEditor() here so editingSong is cleared and the drawer unmounts.
  useLayoutEffect(() => {
    overlayCloseAll();
    closeEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);
  return null;
}

/**
 * Dynamically updates the <link rel="alternate" type="application/json+oembed">
 * tag in <head> to point to the current page URL.
 * This ensures Discord, X, and other oEmbed-aware platforms read the correct
 * song/creator/project metadata when a URL is shared — bypassing the CDN's
 * generic OG tag override which only affects HTML meta tags, not the oEmbed JSON.
 */
function OEmbedUpdater() {
  const [location] = useLocation();
  useEffect(() => {
    const CANONICAL_ORIGIN = "https://www.livingnexus.org";
    const pageUrl = `${CANONICAL_ORIGIN}${location}`;
    const oembedUrl = `/api/oembed?url=${encodeURIComponent(pageUrl)}`;

    // Update or create the oEmbed discovery link tag
    let link = document.querySelector<HTMLLinkElement>(
      'link[type="application/json+oembed"]'
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "alternate";
      link.type = "application/json+oembed";
      link.title = "Living Nexus oEmbed";
      document.head.appendChild(link);
    }
    link.href = oembedUrl;

    // Also update the canonical URL for Facebook/Messenger
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;
  }, [location]);
  return null;
}

function Router() {
  const [location] = useLocation();
  // Subdomain detection — pna.livingnexus.org serves the PNA creator workspace
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const subdomain = hostname.split(".")[0]?.toLowerCase();
  const isPNASubdomain = subdomain === "pna";
  const isAPISubdomain = subdomain === "api";
  const isDocsSubdomain = subdomain === "docs";

  // PNA subdomain — render creator workspace directly, no MainLayout
  if (isPNASubdomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <PNAShellPage />
      </Suspense>
    );
  }

  // API subdomain — redirect to developer dashboard
  if (isAPISubdomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route><Redirect to="/developers" /></Route>
        </Switch>
      </Suspense>
    );
  }

  // Docs subdomain — redirect to platform guides
  if (isDocsSubdomain) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route><Redirect to="/platform-guides" /></Route>
        </Switch>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public standalone pages — no MainLayout/PlayerBar */}
        <Route path="/p/:slug" component={SharedPlaylistPage} />
        <Route path="/verify" component={VerifyPage} />
        <Route path="/verify/:witnessId" component={VerifyPage} />
        <Route path="/download" component={DownloadPage} />
        {/* DIAGNOSTIC — Strip to Bone: zero nav infrastructure, raw React only */}
        <Route path="/diag/strip-to-bone" component={StripToBone} />

        {/* App pages inside MainLayout */}
        <Route>
          <MainLayout>
            <ErrorBoundary resetKey={location}>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/home" component={HomePage} />
                <Route path="/discover"><Redirect to="/" /></Route>
                <Route path="/explore" component={ExplorePage} />
                <Route path="/explore/:medium"><Redirect to="/explore" /></Route>
                <Route path="/search" component={SearchResultsPage} />
               <Route path="/upload"><Redirect to="/manifest" /></Route>
                <Route path="/manifest" component={ManifestationStudio} />
                <Route path="/batch-upload" component={BatchUploadPage} />
                <Route path="/liked" component={LikedPage} />
                <Route path="/archive" component={ArchivePage} />
          <Route path="/my-archive/export" component={CreatorDataExportPage} />
                <Route path="/studio/collection/:id" component={CollectionStudioPage} />
                <Route path="/licensed-downloads" component={LicensedDownloadsPage} />
                <Route path="/song/:id" component={SongDetailPage} />
                <Route path="/book/:id"><Redirect to="/explore" /></Route>
                <Route path="/game/:id"><Redirect to="/explore" /></Route>
                <Route path="/gcode/:id"><Redirect to="/explore" /></Route>
                <Route path="/platform-guides" component={PlatformGuidesPage} />
                <Route path="/book/:id/studio"><Redirect to="/manage" /></Route>
                <Route path="/songs/:id" component={SongDetailPage} />
                <Route path="/track/:id" component={TrackRedirect} />
                <Route path="/creator/:handle/:medium" component={CreatorCollectionPage} />
                <Route path="/creator/:id" component={CreatorProfilePage} />
                <Route path="/manage" component={LoopManagePage} />
                <Route path="/dashboard"><Redirect to="/manage" /></Route>
                <Route path="/profile" component={ProfilePage} />
                <Route path="/contributors" component={ContributorsPage} />
                <Route path="/playlist" component={PlaylistPage} />
                <Route path="/manifesto" component={ManifestoPage} />
                <Route path="/attribution" component={AttributionPage} />
                <Route path="/admin/users" component={AdminUsersPage} />
                <Route path="/admin/normalization" component={ArtworkNormalizationPage} />
                <Route path="/admin/moderation" component={ModerationQueuePage} />
                <Route path="/admin/comments" component={CommentModerationPage} />
                <Route path="/admin/audit" component={AuditLogPage} />
                <Route path="/admin/self-improve" component={SelfImprovementPage} />
                <Route path="/admin/payment-integrity" component={PaymentIntegrityPage} />
                <Route path="/admin/mission-control" component={MissionControlPage} />
                <Route path="/admin/physical" component={PhysicalDistributionPage} />
                <Route path="/admin/phase-ledger" component={PhaseLedgerPage} />
                <Route path="/admin/guide-access" component={GuideAccessRequestsPage} />
                <Route path="/admin/notifications" component={AdminNotificationsPage} />
                <Route path="/admin" component={AdminUsersPage} />
                <Route path="/trust" component={TrustPage} />
                <Route path="/redeem" component={RedeemPage} />
                <Route path="/pricing" component={PricingCovenantPage} />
                <Route path="/field-notes" component={FieldNotesPage} />
                <Route path="/doctrine" component={DoctrineStackPage} />
                <Route path="/doctrine/wid-spec" component={WIDSpecPage} />
                <Route path="/lexicon" component={LexiconPage} />
                <Route path="/glossary"><Redirect to="/lexicon" /></Route>
                <Route path="/learn" component={LearnPage} />
                <Route path="/playlists" component={PlaylistsPage} />
                <Route path="/notifications" component={NotificationsPage} />
                <Route path="/witness-registry" component={WitnessRegistryPage} />
                <Route path="/witness-flow/:witnessId" component={WitnessFlowPage} />
                <Route path="/witness-flow/song/:songId" component={WitnessFlowPage} />
                <Route path="/founders" component={FoundersPage} />
                <Route path="/founder-era" component={FounderEraPage} />
                <Route path="/settings"><Redirect to="/settings/billing" /></Route>
                <Route path="/settings/billing" component={LivingArchiveBillingPage} />
                <Route path="/settings/playback" component={PlaybackSettingsPage} />
                <Route path="/settings/payment-methods" component={PaymentMethodsPage} />
                <Route path="/prompt/:token" component={SharedPromptPage} />
                <Route path="/terms/compare" component={TosComparePage} />
                <Route path="/terms" component={TermsPage} />
                <Route path="/privacy" component={PrivacyPage} />
                <Route path="/projects"><Redirect to="/explore" /></Route>
                <Route path="/project/:slug"><Redirect to="/explore" /></Route>
                <Route path="/projects/:slug"><Redirect to="/explore" /></Route>
                <Route path="/my-projects"><Redirect to="/manage" /></Route>
                {/* ── Loop scope: non-music systems redirect into spine ── */}
                <Route path="/new-manifestation"><Redirect to="/manifest" /></Route>
                <Route path="/sessions"><Redirect to="/manage" /></Route>
                <Route path="/manifestation/:id"><Redirect to="/manage" /></Route>
                <Route path="/keeper" component={KeeperPage} />
                <Route path="/keeper-compose"><Redirect to="/pna" /></Route>
                <Route path="/first-witness" component={FirstWitnessPage} />
                <Route path="/store"><Redirect to="/avatar-registry" /></Route>
                <Route path="/marketplace"><Redirect to="/avatar-registry" /></Route>
                <Route path="/avatar-registry" component={AvatarMarketplacePage} />
                <Route path="/pna" component={PNAShellPage} />
                <Route path="/distribute" component={DistributionPage} />
                <Route path="/identity/:id" component={CreatorIdentityPage} />
                <Route path="/domain"><Redirect to="/manage" /></Route>
                <Route path="/creator-surface"><Redirect to="/pna" /></Route>
                <Route path="/onboarding" component={OnboardingManifest} />
                <Route path="/guides" component={GuideDirectoryPage} />
                <Route path="/guides/upload" component={GuideUploadWizard} />
                <Route path="/guide/:id" component={GuideDetailPage} />
                <Route path="/guides/:id" component={GuideDetailPage} />
                <Route path="/album/:collectionWid" component={AlbumDetailPage} />
                <Route path="/collection/:slug" component={CollectionPage} />
                <Route path="/constellation/:songId" component={ConstellationPage} />
                <Route path="/visual-works"><Redirect to="/explore" /></Route>
                <Route path="/visual-works/new"><Redirect to="/manifest" /></Route>
                <Route path="/visual-works/:id"><Redirect to="/explore" /></Route>
                <Route path="/developer" component={DeveloperDashboardPage} />
                <Route path="/design-system" component={DesignSystemPage} />
                <Route path="/developers" component={DevelopersPage} />
                {/* ── Creator Domain — Law VI: /@handle is the creator's persistent home ── */}
                <Route path="/setup-domain" component={SetupDomainPage} />
                <Route path="/@:handle" component={CreatorDomainShell} />
                {/* ── Stability redirects — dead routes → canonical destinations ── */}
                <Route path="/prompt-studio"><Redirect to="/manifest" /></Route>
                <Route path="/archive/mine"><Redirect to="/archive" /></Route>
                <Route path="/archive/favorites"><Redirect to="/archive" /></Route>
                <Route path="/archive/history"><Redirect to="/archive" /></Route>
                <Route path="/archive/collections"><Redirect to="/archive" /></Route>
                <Route path="/archive/ledger"><Redirect to="/witness-registry" /></Route>
                <Route path="/upload/drafts"><Redirect to="/archive" /></Route>
                <Route path="/upload/history"><Redirect to="/archive" /></Route>
                <Route path="/404" component={NotFound} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
            </ErrorBoundary>
          </MainLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(() => !shouldShowSplash());

  if (!splashDone) {
    return (
      <ErrorBoundary>
        <CinematicSplash onComplete={() => setSplashDone(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <HarmonicProvider>
          <AmbientPlayerProvider>
          <QueueLoader />
          <WhatsNewModal />
          <TosAcceptanceModal />
          <WelcomeModal />
          <CommunityToastProvider />
          <Toaster
            theme="dark"
            position="bottom-center"
            toastOptions={{
              duration: 5000,
              style: {
                background: "var(--ln-coal)",
                border: "1px solid rgba(196,154,40,0.10)",
                color: "var(--ln-parchment)",
                fontFamily: "'DM Sans', sans-serif",
              },
            }}
          />
          <OEmbedUpdater />
          <OverlayRouteGuard />
          <ScrollRestorationManager />
          <QrScanLogger />
          {/* PNA stewarded: Keeper Avatar on /pna · /keeper · /avatar-registry (and pna subdomain) — not Loop chrome */}
          <KeeperAvatarWidget />
          <ProvenanceUploadEngine />
          <PWAInstallBanner />
          <Router />
          </AmbientPlayerProvider>
        </HarmonicProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
