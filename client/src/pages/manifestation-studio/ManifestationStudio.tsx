/* ═══════════════════════════════════════════════════════════════════
   MANIFESTATION STUDIO — Main Orchestrator
   Replaces the old UploadPage with a guided, medium-aware publishing
   environment. Each type has its own atmosphere and flow.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { usePendingWork } from "@/contexts/PendingWorkContext";
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
import { GcodeEnvironment } from "./environments/GcodeEnvironment";

// Keeper registration prefill shape
export interface KeeperPrefill {
  title?: string;
  genre?: string;
  lyrics?: string;
  description?: string;
  caption?: string;
  aiDisclosure?: string;
  moodTags?: string[];
  haaiInstrumentation?: string;
  haaiEmotionalTone?: string;
  haaiOriginStory?: string;
  haaiVisualConcept?: string;
  haaiStyleLanguage?: string;
  haaiVocalConveyance?: string;
  parentGuideWid?: string;
}

export default function ManifestationStudio() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedType, setSelectedType] = useState<ManifestationType | null>(null);
  const [keeperPrefill, setKeeperPrefill] = useState<KeeperPrefill | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { consumePendingWork } = usePendingWork();

  // Consume any pending work from the ProvenanceUploadEngine on mount
  useEffect(() => {
    const work = consumePendingWork();
    if (work) {
      setPendingFile(work.file);
      setSelectedType(work.type);
      const prefill: KeeperPrefill = {};
      if (work.meta.title) prefill.title = work.meta.title;
      if (work.meta.genre) prefill.genre = work.meta.genre;
      if (work.meta.lyrics) prefill.lyrics = work.meta.lyrics;
      if (work.meta.aiDisclosure) prefill.aiDisclosure = work.meta.aiDisclosure;
      if (work.meta.haaiOriginStory) prefill.haaiOriginStory = work.meta.haaiOriginStory;
      if (Object.keys(prefill).length > 0) setKeeperPrefill(prefill);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for ?type= query param and Keeper prefill fields
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type") as ManifestationType | null;
    if (typeParam && ["music", "lyrics", "comic", "manuscript", "video", "gcode"].includes(typeParam)) {
      setSelectedType(typeParam);
      // Extract Keeper prefill fields
      const prefill: KeeperPrefill = {};
      const title = params.get('title'); if (title) prefill.title = title;
      const genre = params.get('genre'); if (genre) prefill.genre = genre;
      const lyrics = params.get('lyrics'); if (lyrics) prefill.lyrics = lyrics;
      const description = params.get('description'); if (description) prefill.description = description;
      const caption = params.get('caption'); if (caption) prefill.caption = caption;
      const aiDisclosure = params.get('aiDisclosure'); if (aiDisclosure) prefill.aiDisclosure = aiDisclosure;
      const moodTags = params.get('moodTags'); if (moodTags) prefill.moodTags = moodTags.split(',').filter(Boolean);
      const haaiInstrumentation = params.get('haaiInstrumentation'); if (haaiInstrumentation) prefill.haaiInstrumentation = haaiInstrumentation;
      const haaiEmotionalTone = params.get('haaiEmotionalTone'); if (haaiEmotionalTone) prefill.haaiEmotionalTone = haaiEmotionalTone;
      const haaiOriginStory = params.get('haaiOriginStory'); if (haaiOriginStory) prefill.haaiOriginStory = haaiOriginStory;
      const haaiVisualConcept = params.get('haaiVisualConcept'); if (haaiVisualConcept) prefill.haaiVisualConcept = haaiVisualConcept;
      const haaiStyleLanguage = params.get('haaiStyleLanguage'); if (haaiStyleLanguage) prefill.haaiStyleLanguage = haaiStyleLanguage;
      const haaiVocalConveyance = params.get('haaiVocalConveyance'); if (haaiVocalConveyance) prefill.haaiVocalConveyance = haaiVocalConveyance;
      const parentGuideWid = params.get('parentGuideWid'); if (parentGuideWid) prefill.parentGuideWid = parentGuideWid;
      if (Object.keys(prefill).length > 0) setKeeperPrefill(prefill);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Auth gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000000" }}>
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
              color: "#000000",
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
    return (
      <TypeGateway
        onSelect={setSelectedType}
        onSelectWithPrefill={(type, prefill) => {
          setKeeperPrefill(prefill);
          setSelectedType(type);
        }}
      />
    );
  }

  // Render the selected environment
  const handleBack = () => setSelectedType(null);

  switch (selectedType) {
    case "music":
      return <MusicEnvironment onBack={handleBack} keeperPrefill={keeperPrefill ?? undefined} pendingFile={pendingFile ?? undefined} />;
    case "lyrics":
      return <LyricsEnvironment onBack={handleBack} />;
    case "comic":
      return <ComicEnvironment onBack={handleBack} />;
    case "manuscript":
      return <ManuscriptEnvironment onBack={handleBack} />;
    case "video":
      return <VideoEnvironment onBack={handleBack} />;
    case "gcode":
      return <GcodeEnvironment onBack={handleBack} />;
    default:
      return <TypeGateway onSelect={setSelectedType} />;
  }
}
