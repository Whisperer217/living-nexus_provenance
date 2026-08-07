/* ═══════════════════════════════════════════════════════════════════
   PENDING WORK CONTEXT
   Carries File objects and extracted metadata across navigation
   from ProvenanceUploadEngine → ManifestationStudio environments.
   Files cannot survive URL params — they live here in memory.
═══════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface PendingWork {
  /** The raw File object — survives navigation in memory */
  file: File;
  /** Detected manifestation type */
  type: "music" | "lyrics" | "comic" | "manuscript" | "video" | "gcode";
  /** All extracted metadata */
  meta: {
    title?: string;
    genre?: string;
    lyrics?: string;
    description?: string;
    aiDisclosure?: "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument";
    aiPlatform?: string;
    aiModel?: string;
    aiPrompt?: string;
    haaiOriginStory?: string;
    moodTags?: string[];
    bpm?: number;
    keySignature?: string;
    isrc?: string;
    durationSeconds?: number;
    sampleRate?: number;
    fileHash?: string;
    coverFile?: File;
  };
}

interface PendingWorkContextValue {
  pendingWork: PendingWork | null;
  setPendingWork: (work: PendingWork | null) => void;
  consumePendingWork: () => PendingWork | null;
}

const PendingWorkContext = createContext<PendingWorkContextValue | null>(null);

export function PendingWorkProvider({ children }: { children: ReactNode }) {
  const [pendingWork, setPendingWorkState] = useState<PendingWork | null>(null);

  const setPendingWork = useCallback((work: PendingWork | null) => {
    setPendingWorkState(work);
  }, []);

  // Consume clears the pending work after reading — one-shot
  const consumePendingWork = useCallback((): PendingWork | null => {
    const work = pendingWork;
    setPendingWorkState(null);
    return work;
  }, [pendingWork]);

  return (
    <PendingWorkContext.Provider value={{ pendingWork, setPendingWork, consumePendingWork }}>
      {children}
    </PendingWorkContext.Provider>
  );
}

export function usePendingWork() {
  const ctx = useContext(PendingWorkContext);
  if (!ctx) throw new Error("usePendingWork must be used inside PendingWorkProvider");
  return ctx;
}
