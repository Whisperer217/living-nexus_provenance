import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch, Redirect } from "wouter";
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

// Lazy-loaded page components — each becomes its own JS chunk
// This cuts initial bundle size significantly; pages load on first visit only
const HomePage = lazy(() => import("./pages/HomePage"));
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const TogetherPage = lazy(() => import("./pages/TogetherPage"));
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
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const ModerationQueuePage = lazy(() => import("./pages/admin/ModerationQueuePage"));
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
const GuildPage = lazy(() => import("./pages/GuildPage"));
const GuildsListPage = lazy(() => import("./pages/GuildsListPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const WitnessFlowPage = lazy(() => import("./pages/WitnessFlowPage"));
const LivingArchiveBillingPage = lazy(() => import("./pages/LivingArchiveBillingPage"));
const SharedPromptPage = lazy(() => import("./pages/SharedPromptPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const TosComparePage = lazy(() => import("./pages/TosComparePage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));

// Minimal fallback shown while a page chunk loads (typically <200ms on CDN)
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "oklch(0.84 0.155 85)", borderTopColor: "transparent" }} />
    </div>
  );
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
                <Route path="/together" component={TogetherPage} />
                <Route path="/together/:roomCode" component={TogetherPage} />
                <Route path="/upload" component={UploadPage} />
                <Route path="/batch-upload" component={BatchUploadPage} />
                <Route path="/liked" component={LikedPage} />
                <Route path="/archive" component={ArchivePage} />
                <Route path="/listen-together" component={TogetherPage} />
                <Route path="/song/:id" component={SongDetailPage} />
                <Route path="/songs/:id" component={SongDetailPage} />
                <Route path="/track/:id" component={TrackPage} />
                <Route path="/creator/:id" component={CreatorProfilePage} />
                <Route path="/dashboard" component={DashboardPage} />
                <Route path="/profile" component={ProfilePage} />
                <Route path="/contributors" component={ContributorsPage} />
                <Route path="/playlist" component={PlaylistPage} />
                <Route path="/manifesto" component={ManifestoPage} />
                <Route path="/admin/users" component={AdminUsersPage} />
                <Route path="/admin/normalization" component={ArtworkNormalizationPage} />
                <Route path="/admin/moderation" component={ModerationQueuePage} />
                <Route path="/admin" component={AdminUsersPage} />
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
                <Route path="/guilds" component={GuildsListPage} />
                <Route path="/prompt/:token" component={SharedPromptPage} />
                <Route path="/guild/:slug" component={GuildPage} />
                <Route path="/terms/compare" component={TosComparePage} />
                <Route path="/terms" component={TermsPage} />
                <Route path="/privacy" component={PrivacyPage} />
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
              toastOptions={{
                style: {
                  background: "oklch(0.095 0.028 275)",
                  border: "1px solid oklch(1 0 0 / 12%)",
                  color: "oklch(0.94 0.006 280)",
                  fontFamily: "'DM Sans', sans-serif",
                },
              }}
            />
            <AmbientWidget />
            <Router />
            </AmbientPlayerProvider>
          </PlayerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
