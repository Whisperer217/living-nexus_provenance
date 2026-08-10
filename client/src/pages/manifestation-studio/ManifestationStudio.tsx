/* ═══════════════════════════════════════════════════════════════════
   LOOP MANIFESTATION STUDIO — Music provenance registration
   WID engine entry. Non-music mediums removed from product scope.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { usePendingWork } from "@/contexts/PendingWorkContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LOOP_PRODUCT } from "@/lib/loopProduct";
import { TypeGateway } from "./TypeGateway";
import { MusicEnvironment } from "./environments/MusicEnvironment";

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
  const { isAuthenticated } = useAuth();
  const [entered, setEntered] = useState(false);
  const [keeperPrefill, setKeeperPrefill] = useState<KeeperPrefill | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { consumePendingWork } = usePendingWork();

  useEffect(() => {
    const work = consumePendingWork();
    if (work) {
      // Loop is music-only — coerce any pending work into music registration
      setPendingFile(work.file);
      setEntered(true);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    if (typeParam || params.get("title") || params.get("genre")) {
      setEntered(true);
      const prefill: KeeperPrefill = {};
      const title = params.get("title"); if (title) prefill.title = title;
      const genre = params.get("genre"); if (genre) prefill.genre = genre;
      const lyrics = params.get("lyrics"); if (lyrics) prefill.lyrics = lyrics;
      const description = params.get("description"); if (description) prefill.description = description;
      const caption = params.get("caption"); if (caption) prefill.caption = caption;
      const aiDisclosure = params.get("aiDisclosure"); if (aiDisclosure) prefill.aiDisclosure = aiDisclosure;
      const moodTags = params.get("moodTags"); if (moodTags) prefill.moodTags = moodTags.split(",").filter(Boolean);
      const haaiInstrumentation = params.get("haaiInstrumentation"); if (haaiInstrumentation) prefill.haaiInstrumentation = haaiInstrumentation;
      const haaiEmotionalTone = params.get("haaiEmotionalTone"); if (haaiEmotionalTone) prefill.haaiEmotionalTone = haaiEmotionalTone;
      const haaiOriginStory = params.get("haaiOriginStory"); if (haaiOriginStory) prefill.haaiOriginStory = haaiOriginStory;
      const haaiVisualConcept = params.get("haaiVisualConcept"); if (haaiVisualConcept) prefill.haaiVisualConcept = haaiVisualConcept;
      const haaiStyleLanguage = params.get("haaiStyleLanguage"); if (haaiStyleLanguage) prefill.haaiStyleLanguage = haaiStyleLanguage;
      const haaiVocalConveyance = params.get("haaiVocalConveyance"); if (haaiVocalConveyance) prefill.haaiVocalConveyance = haaiVocalConveyance;
      const parentGuideWid = params.get("parentGuideWid"); if (parentGuideWid) prefill.parentGuideWid = parentGuideWid;
      if (Object.keys(prefill).length > 0) setKeeperPrefill(prefill);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000000" }}>
        <div className="text-center max-w-md px-6">
          <p className="text-[11px] uppercase tracking-[0.28em] mb-3" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
            {LOOP_PRODUCT.name}
          </p>
          <p className="text-lg mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Sign in to register music
          </p>
          <p className="text-sm mb-6" style={{ color: "rgba(245,237,216,0.6)" }}>
            {LOOP_PRODUCT.supporting}
          </p>
          <a
            href={getLoginUrl("/manifest")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105"
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

  if (!entered) {
    return (
      <TypeGateway
        onSelect={() => setEntered(true)}
        onSelectWithPrefill={(_type, prefill) => {
          setKeeperPrefill(prefill);
          setEntered(true);
        }}
        onFileReady={(file) => setPendingFile(file)}
      />
    );
  }

  return (
    <MusicEnvironment
      onBack={() => {
        setEntered(false);
        setPendingFile(null);
        setKeeperPrefill(null);
      }}
      keeperPrefill={keeperPrefill ?? undefined}
      pendingFile={pendingFile ?? undefined}
    />
  );
}
