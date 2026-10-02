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

interface QueueCompletion {
  songId?: number;
  witnessId?: string;
  title: string;
}

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
  const [mp3Queue, setMp3Queue] = useState<File[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueCompletions, setQueueCompletions] = useState<QueueCompletion[]>([]);
  const [queueComplete, setQueueComplete] = useState(false);
  const { consumePendingWork, consumePendingQueue } = usePendingWork();

  const clearQueue = () => {
    setMp3Queue([]);
    setQueueIndex(0);
    setQueueCompletions([]);
    setQueueComplete(false);
  };

  useEffect(() => {
    const queue = consumePendingQueue();
    if (queue.length > 0) {
      // The engine handoff is MP3-only. Every queued source still enters the
      // existing review-and-seal state machine as its own Work.
      setKeeperPrefill(null);
      setMp3Queue(queue.map((work) => work.file));
      setQueueIndex(0);
      setQueueCompletions([]);
      setQueueComplete(false);
      setPendingFile(queue[0].file);
      setEntered(true);
      return;
    }

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

  if (queueComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(180deg, #050505, #000)" }}>
        <section className="w-full max-w-xl rounded-sm border p-6 text-center" style={{ borderColor: "rgba(196,154,40,0.35)", background: "rgba(10,10,10,0.88)" }}>
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>MP3 queue complete</p>
          <h1 className="mt-3 text-2xl font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
            {queueCompletions.length} {queueCompletions.length === 1 ? "Work" : "Works"} registered separately
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>
            Each completed record passed through its own review, participation declaration, attestation, and Witness ID seal. No disclosure or WID was shared across the queue.
          </p>
          <ol className="mt-5 max-h-48 space-y-2 overflow-y-auto text-left">
            {queueCompletions.map((item, index) => (
              <li key={`${item.witnessId ?? item.title}-${index}`} className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "rgba(196,154,40,0.18)", color: "var(--ln-parchment)" }}>
                <span>{index + 1}. {item.title}</span>
                {item.witnessId && <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--ln-gold)" }}>{item.witnessId}</span>}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => { clearQueue(); setEntered(false); }} className="min-h-11 rounded-sm border px-4 text-sm" style={{ borderColor: "rgba(196,154,40,0.4)", color: "var(--ln-parchment)" }}>
              Register more MP3s
            </button>
            <button type="button" onClick={() => { clearQueue(); window.location.assign("/manage"); }} className="min-h-11 rounded-sm px-4 text-sm font-semibold" style={{ background: "var(--ln-gold)", color: "#000" }}>
              Open Manage
            </button>
          </div>
        </section>
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
        onFileReady={(file) => { clearQueue(); setPendingFile(file); }}
        onMp3QueueReady={(files) => {
          setKeeperPrefill(null);
          setMp3Queue(files);
          setQueueIndex(0);
          setQueueCompletions([]);
          setQueueComplete(false);
          setPendingFile(files[0] ?? null);
          setEntered(true);
        }}
      />
    );
  }

  return (
    <MusicEnvironment
      key={mp3Queue.length > 0 ? `mp3-queue-${queueIndex}` : `single-${pendingFile?.name ?? "manual"}`}
      onBack={() => {
        setEntered(false);
        setPendingFile(null);
        setKeeperPrefill(null);
        clearQueue();
      }}
      keeperPrefill={keeperPrefill ?? undefined}
      pendingFile={pendingFile ?? undefined}
      queueProgress={mp3Queue.length > 0 ? { current: queueIndex + 1, total: mp3Queue.length, completed: queueCompletions.length } : undefined}
      onRegistered={mp3Queue.length > 0 ? (data, registeredTitle) => {
        setQueueCompletions((current) => [...current, {
          songId: data?.songId,
          witnessId: data?.witnessId,
          title: registeredTitle,
        }]);
        const nextIndex = queueIndex + 1;
        if (nextIndex < mp3Queue.length) {
          setQueueIndex(nextIndex);
          setPendingFile(mp3Queue[nextIndex]);
        } else {
          setQueueComplete(true);
        }
        return true;
      } : undefined}
    />
  );
}
