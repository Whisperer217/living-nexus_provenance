/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — App.tsx
   Divine Noir: Art Deco × Cosmic Mysticism
   Dark theme, Cinzel + DM Sans, Gold + Violet palette
═══════════════════════════════════════════════════════════════════ */

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
import ProfilePage from "./pages/ProfilePage";
import UploadPage from "./pages/UploadPage";
import LikedPage from "./pages/LikedPage";
import TrackPage from "./pages/TrackPage";
import MusicWitnessIDPage from "./pages/MusicWitnessIDPage";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/together" component={TogetherPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/upload" component={UploadPage} />
        <Route path="/liked" component={LikedPage} />
        <Route path="/track/:id" component={TrackPage} />
        <Route path="/artist/:name" component={ProfilePage} />
        <Route path="/music-witness-id" component={MusicWitnessIDPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <PlayerProvider>
            <Toaster
              theme="dark"
              toastOptions={{
                style: {
                  background: "oklch(0.14 0.013 280)",
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
