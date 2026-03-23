import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import MainLayout from "./components/layout/MainLayout";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import TogetherPage from "./pages/TogetherPage";
import UploadPage from "./pages/UploadPage";
import BatchUploadPage from "./pages/BatchUploadPage";
import LikedPage from "./pages/LikedPage";
import ArchivePage from "./pages/ArchivePage";
import TrackPage from "./pages/TrackPage";
import SongDetailPage from "./pages/SongDetailPage";
import CreatorProfilePage from "./pages/CreatorProfilePage";
import DashboardPage from "./pages/DashboardPage";
import DiscoverPage from "./pages/DiscoverPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import VerifyPage from "./pages/VerifyPage";
import ContributorsPage from "./pages/ContributorsPage";
import PlaylistPage from "./pages/PlaylistPage";
import ManifestoPage from "./pages/ManifestoPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import PricingCovenantPage from "./pages/PricingCovenantPage";
import QueueLoader from "./components/QueueLoader";
import { WhatsNewModal } from "./components/WhatsNewModal";
import WelcomeModal from "./components/WelcomeModal";

function Router() {
  return (
    <Switch>
      {/* Public standalone pages — no MainLayout/PlayerBar */}
      <Route path="/verify" component={VerifyPage} />
      <Route path="/verify/:witnessId" component={VerifyPage} />

      {/* App pages inside MainLayout */}
      <Route>
        <MainLayout>
          <Switch>
            <Route path="/" component={DiscoverPage} />
            <Route path="/home" component={HomePage} />
            <Route path="/explore" component={ExplorePage} />
            <Route path="/together" component={TogetherPage} />
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
            <Route path="/pricing" component={PricingCovenantPage} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <PlayerProvider>
            <QueueLoader />
            <WhatsNewModal />
            <WelcomeModal />
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
            <Router />
          </PlayerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
