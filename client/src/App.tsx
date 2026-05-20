import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import MainLayout from "./components/layout/MainLayout";
import QueueLoader from "./components/QueueLoader";
import { WhatsNewModal } from "./components/WhatsNewModal";
import WelcomeModal from "./components/WelcomeModal";
import { TosAcceptanceModal } from "./components/TosAcceptanceModal";
import { CommunityToastProvider } from "./components/CommunityToast";
import { AmbientPlayerProvider } from "./contexts/AmbientPlayerContext";
import AmbientWidget from "./components/AmbientWidget";
import KeeperAvatarWidget from "./components/KeeperAvatarWidget";
import { useQrScanLogger } from "./hooks/useQrScanLogger";
import { overlayCloseAll } from "@/lib/overlayController";

/** Logs QR scan events when ?qr= param is present in the URL. */
function QrScanLogger() {
  useQrScanLogger();
  return null;
}

// Lazy-loaded page components — each becomes its own JS chunk
// This cuts initial bundle size significantly; pages load on first visit only
const HomePage = lazy(() => import("./pages/HomePage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const BatchUploadPage = lazy(() => import("./pages/BatchUploadPage"));
const LikedPage = lazy(() => import("./pages/LikedPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const TrackPage = lazy(() => import("./pages/TrackPage"));
const SongDetailPage = lazy(() => import("./pages/SongDetailPage"));
const CreatorProfilePage = lazy(() => import("./pages/CreatorProfilePage"));
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
const SelfImprovementPage = lazy(() => import("./pages/SelfImprovementPage"));
const PaymentIntegrityPage = lazy(() => import("./pages/PaymentIntegrityPage"));
const TrustPage = lazy(() => import("./pages/TrustPage"));
const RedeemPage = lazy(() => import("./pages/RedeemPage"));
const PricingCovenantPage = lazy(() => import("./pages/PricingCovenantPage"));
const FieldNotesPage = lazy(() => import("./pages/FieldNotesPage"));
const WIDSpecPage = lazy(() => import("./pages/WIDSpecPage"));
const LexiconPage = lazy(() => import("./pages/LexiconPage"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const WitnessRegistryPage = lazy(() => import("./pages/WitnessRegistryPage"));
const DownloadPage = lazy(() => import("./pages/DownloadPage"));
const FoundersPage = lazy(() => import("./pages/FoundersPage"));
const FounderEraPage = lazy(() => import("./pages/FounderEraPage"));
const ArtworkNormalizationPage = lazy(() => import("./pages/ArtworkNormalizationPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const WitnessFlowPage = lazy(() => import("./pages/WitnessFlowPage"));
const LivingArchiveBillingPage = lazy(() => import("./pages/LivingArchiveBillingPage"));
const SharedPromptPage = lazy(() => import("./pages/SharedPromptPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const TosComparePage = lazy(() => import("./pages/TosComparePage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ProjectPage = lazy(() => import("./pages/ProjectPage"));
const MyProjectsPage = lazy(() => import("./pages/MyProjectsPage"));
const ProjectsDiscoveryPage = lazy(() => import("./pages/ProjectsDiscoveryPage"));
const BookDetailPage = lazy(() => import("./pages/BookDetailPage"));
const CreatorStudioPage = lazy(() => import("./pages/CreatorStudioPage"));
const KeeperPage = lazy(() => import("./pages/KeeperPage"));
const KeeperComposePage = lazy(() => import("./pages/KeeperComposePage"));
const FirstWitnessPage = lazy(() => import("./pages/FirstWitnessPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const CreatorSurface = lazy(() => import("./pages/CreatorSurface"));
const GuideUploadWizard = lazy(() => import("./pages/GuideUploadWizard"));
const GuideDirectoryPage = lazy(() => import("./pages/GuideDirectoryPage"));
const GuideDetailPage = lazy(() => import("./pages/GuideDetailPage"));
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage"));

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
function OverlayRouteGuard() {
  const [location] = useLocation();
  // useLayoutEffect fires before paint — ensures scroll lock is cleared
  // before the new page renders, preventing a single-frame frozen-scroll flash on mobile
  useLayoutEffect(() => {
    overlayCloseAll();
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
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public standalone pages — no MainLayout/PlayerBar */}
        <Route path="/verify" component={VerifyPage} />
        <Route path="/verify/:witnessId" component={VerifyPage} />
        <Route path="/download" component={DownloadPage} />

        {/* App pages inside MainLayout */}
        <Route>
          <MainLayout>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/home" component={HomePage} />
                <Route path="/discover"><Redirect to="/" /></Route>
                <Route path="/explore" component={ExplorePage} />
                <Route path="/search" component={SearchResultsPage} />
                <Route path="/upload" component={UploadPage} />
                <Route path="/batch-upload" component={BatchUploadPage} />
                <Route path="/liked" component={LikedPage} />
                <Route path="/archive" component={ArchivePage} />
                <Route path="/song/:id" component={SongDetailPage} />
                <Route path="/book/:id" component={BookDetailPage} />
                <Route path="/book/:id/studio" component={CreatorStudioPage} />
                <Route path="/songs/:id" component={SongDetailPage} />
                <Route path="/track/:id" component={TrackPage} />
                <Route path="/creator/:id" component={CreatorProfilePage} />
                <Route path="/dashboard" component={DashboardPage} />
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
                <Route path="/admin" component={AdminUsersPage} />
                <Route path="/trust" component={TrustPage} />
                <Route path="/redeem" component={RedeemPage} />
                <Route path="/pricing" component={PricingCovenantPage} />
                <Route path="/field-notes" component={FieldNotesPage} />
                <Route path="/doctrine/wid-spec" component={WIDSpecPage} />
                <Route path="/lexicon" component={LexiconPage} />
                <Route path="/learn" component={LearnPage} />
                <Route path="/playlists" component={PlaylistsPage} />
                <Route path="/notifications" component={NotificationsPage} />
                <Route path="/witness-registry" component={WitnessRegistryPage} />
                <Route path="/witness-flow/:witnessId" component={WitnessFlowPage} />
                <Route path="/witness-flow/song/:songId" component={WitnessFlowPage} />
                <Route path="/founders" component={FoundersPage} />
                <Route path="/founder-era" component={FounderEraPage} />
                <Route path="/settings/billing" component={LivingArchiveBillingPage} />
                <Route path="/prompt/:token" component={SharedPromptPage} />
                <Route path="/terms/compare" component={TosComparePage} />
                <Route path="/terms" component={TermsPage} />
                <Route path="/privacy" component={PrivacyPage} />
                <Route path="/projects" component={ProjectsDiscoveryPage} />
                <Route path="/project/:slug" component={ProjectPage} />
                <Route path="/projects/:slug">{({ slug }: { slug: string }) => <Redirect to={`/project/${slug}`} />}</Route>
                <Route path="/my-projects" component={MyProjectsPage} />
                <Route path="/keeper" component={KeeperPage} />
                <Route path="/keeper-compose" component={KeeperComposePage} />
                <Route path="/first-witness" component={FirstWitnessPage} />
                <Route path="/marketplace" component={MarketplacePage} />
                <Route path="/creator-surface" component={CreatorSurface} />
                <Route path="/guides" component={GuideDirectoryPage} />
                <Route path="/guides/upload" component={GuideUploadWizard} />
                <Route path="/guide/:id" component={GuideDetailPage} />
                {/* ── Stability redirects — dead routes → canonical destinations ── */}
                <Route path="/prompt-studio"><Redirect to="/keeper-compose" /></Route>
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
          </MainLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <PlayerProvider>
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
            <QrScanLogger />
            <AmbientWidget />
            <KeeperAvatarWidget />
            <Router />
            </AmbientPlayerProvider>
          </PlayerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
