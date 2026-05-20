/* ═══════════════════════════════════════════════════════════════════
   MANIFESTATION STUDIO — Main Orchestrator
   Replaces the old UploadPage with a guided, medium-aware publishing
   environment. Each type has its own atmosphere and flow.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { type ManifestationType } from "./types";
import { TypeGateway } from "./TypeGateway";
import { MusicEnvironment } from "./environments/MusicEnvironment";
import { LyricsEnvironment } from "./environments/LyricsEnvironment";
import { ComicEnvironment } from "./environments/ComicEnvironment";
import { ManuscriptEnvironment } from "./environments/ManuscriptEnvironment";
import { VideoEnvironment } from "./environments/VideoEnvironment";

export default function ManifestationStudio() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedType, setSelectedType] = useState<ManifestationType | null>(null);

  // Check for ?type= query param to pre-select type
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type") as ManifestationType | null;
    if (typeParam && ["music", "lyrics", "comic", "manuscript", "video"].includes(typeParam)) {
      setSelectedType(typeParam);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#111009" }}>
        <div className="text-center max-w-md px-6">
          <p className="text-lg mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Sign in to begin manifesting
          </p>
          <p className="text-sm mb-6" style={{ color: "rgba(245,237,216,0.6)" }}>
            Your creative work deserves provenance. Sign in to access the Manifestation Studio.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: "var(--ln-gold)",
              color: "#111009",
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
            }}
          >
            Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  // Type gateway (initial selection)
  if (!selectedType) {
    return <TypeGateway onSelect={setSelectedType} />;
  }

  // Render the selected environment
  const handleBack = () => setSelectedType(null);

  switch (selectedType) {
    case "music":
      return <MusicEnvironment onBack={handleBack} />;
    case "lyrics":
      return <LyricsEnvironment onBack={handleBack} />;
    case "comic":
      return <ComicEnvironment onBack={handleBack} />;
    case "manuscript":
      return <ManuscriptEnvironment onBack={handleBack} />;
    case "video":
      return <VideoEnvironment onBack={handleBack} />;
    default:
      return <TypeGateway onSelect={setSelectedType} />;
  }
}
