/* ═══════════════════════════════════════════════════════════════════
   LOOP MANIFESTATION STUDIO — Music provenance registration
   WID engine entry. Non-music mediums removed from product scope.
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CircleAlert, GripVertical, ListOrdered, Play, Trash2 } from "lucide-react";
import { usePendingWork } from "@/contexts/PendingWorkContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LOOP_PRODUCT, reorderLoopMp3Queue, type LoopMp3QueueIntakeNotice } from "@/lib/loopProduct";
import { TypeGateway } from "./TypeGateway";
import { MusicEnvironment } from "./environments/MusicEnvironment";

interface QueueCompletion {
  songId?: number;
  witnessId?: string;
  title: string;
}

interface QueuedMp3 {
  id: string;
  file: File;
}

function toQueuedMp3(file: File, index: number): QueuedMp3 {
  return { id: `${file.name}-${file.size}-${file.lastModified}-${index}`, file };
}

function SortableQueuedMp3({ item, position, onRemove }: { item: QueuedMp3; position: number; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      className="flex min-h-12 items-center gap-2 rounded-sm border px-2 py-2 sm:px-3"
      style={{
        borderColor: isDragging ? "color-mix(in srgb, var(--ln-gold) 70%, transparent)" : "color-mix(in srgb, var(--ln-gold) 22%, transparent)",
        background: isDragging ? "color-mix(in srgb, var(--ln-gold) 14%, var(--ln-coal))" : "color-mix(in srgb, var(--ln-coal) 90%, var(--ln-gold))",
        boxShadow: isDragging ? "0 10px 28px color-mix(in srgb, var(--ln-gold) 18%, transparent)" : "none",
        opacity: isDragging ? 0.92 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        aria-label={`Reorder ${item.file.name}`}
        title="Drag or use the keyboard to reorder"
        className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-[color-mix(in_srgb,var(--ln-gold)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ln-gold-hot)]"
        style={{ color: "var(--ln-gold)" }}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ color: "var(--ln-coal)", background: "var(--ln-gold)" }}>{position}</span>
      <span className="min-w-0 flex-1 break-all text-sm" style={{ color: "var(--ln-parchment)" }}>{item.file.name}</span>
      <button
        type="button"
        aria-label={`Remove ${item.file.name} from the MP3 queue`}
        onClick={() => onRemove(item.id)}
        className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--destructive)]"
        style={{ color: "var(--destructive)" }}
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
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
  const [mp3Queue, setMp3Queue] = useState<QueuedMp3[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueCompletions, setQueueCompletions] = useState<QueueCompletion[]>([]);
  const [queueComplete, setQueueComplete] = useState(false);
  const [queueReviewStarted, setQueueReviewStarted] = useState(false);
  const [queueIntakeNotice, setQueueIntakeNotice] = useState<LoopMp3QueueIntakeNotice | null>(null);
  const { consumePendingWork, consumePendingQueue } = usePendingWork();
  const queueSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const clearQueue = () => {
    setMp3Queue([]);
    setQueueIndex(0);
    setQueueCompletions([]);
    setQueueComplete(false);
    setQueueReviewStarted(false);
    setQueueIntakeNotice(null);
  };

  useEffect(() => {
    const queue = consumePendingQueue();
    if (queue.length > 0) {
      // The engine handoff is MP3-only. Every queued source still enters the
      // existing review-and-seal state machine as its own Work.
      setKeeperPrefill(null);
      setMp3Queue(queue.map((work, index) => toQueuedMp3(work.file, index)));
      setQueueIndex(0);
      setQueueCompletions([]);
      setQueueComplete(false);
      setQueueReviewStarted(false);
      setPendingFile(null);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
        <div className="text-center max-w-md px-6">
          <p className="text-[11px] uppercase tracking-[0.28em] mb-3" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
            {LOOP_PRODUCT.name}
          </p>
          <p className="text-lg mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Sign in to register music
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--ln-bone)" }}>
            {LOOP_PRODUCT.supporting}
          </p>
          <a
            href={getLoginUrl("/manifest")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "var(--ln-gold)", color: "var(--ln-coal)", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}
          >
            Sign In to Continue
          </a>
        </div>
      </div>
    );
  }

  if (queueComplete) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12" style={{ background: "linear-gradient(180deg, var(--ln-void), var(--ln-coal))" }}>
        <section className="w-full max-w-xl rounded-sm border p-6 text-center" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 35%, transparent)", background: "color-mix(in srgb, var(--ln-coal) 92%, var(--ln-gold))" }}>
          <p className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>MP3 queue complete</p>
          <h1 className="mt-3 text-2xl font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
            {queueCompletions.length} {queueCompletions.length === 1 ? "Work" : "Works"} registered separately
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>
            Each completed record passed through its own review, participation declaration, attestation, and Witness ID seal. No disclosure or WID was shared across the queue.
          </p>
          <ol className="mt-5 max-h-48 space-y-2 overflow-y-auto text-left">
            {queueCompletions.map((item, index) => (
              <li key={`${item.witnessId ?? item.title}-${index}`} className="rounded-sm border px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 18%, transparent)", color: "var(--ln-parchment)" }}>
                <span>{index + 1}. {item.title}</span>
                {item.witnessId && <span className="ml-2 font-mono text-[10px]" style={{ color: "var(--ln-gold)" }}>{item.witnessId}</span>}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => { clearQueue(); setEntered(false); }} className="min-h-11 rounded-sm border px-4 text-sm" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 40%, transparent)", color: "var(--ln-parchment)" }}>
              Register more MP3s
            </button>
            <button type="button" onClick={() => { clearQueue(); window.location.assign("/manage"); }} className="min-h-11 rounded-sm px-4 text-sm font-semibold" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>
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
        onMp3QueueReady={(files, intakeNotice) => {
          setKeeperPrefill(null);
          setMp3Queue(files.map(toQueuedMp3));
          setQueueIndex(0);
          setQueueCompletions([]);
          setQueueComplete(false);
          setQueueReviewStarted(false);
          setQueueIntakeNotice(intakeNotice ?? null);
          setPendingFile(null);
          setEntered(true);
        }}
      />
    );
  }

  const handleQueueDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setMp3Queue((current) => reorderLoopMp3Queue(current, String(active.id), String(over.id)));
  };

  const removeQueuedMp3 = (id: string) => {
    const next = mp3Queue.filter((item) => item.id !== id);
    if (next.length === 0) {
      clearQueue();
      setPendingFile(null);
      setEntered(false);
      return;
    }
    setMp3Queue(next);
  };

  if (mp3Queue.length > 0 && !queueReviewStarted) {
    return (
      <div className="min-h-[80vh] px-4 py-10" style={{ background: "linear-gradient(180deg, var(--ln-void), var(--ln-coal))" }}>
        <section className="mx-auto w-full max-w-2xl rounded-sm border p-4 sm:p-6" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 36%, transparent)", background: "color-mix(in srgb, var(--ln-coal) 92%, var(--ln-gold))" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}><ListOrdered aria-hidden="true" className="size-3.5" /> MP3 Queue</p>
              <h1 className="mt-2 text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Arrange review order</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>Arrange the order before review begins. Each record still receives its own metadata review, participation disclosure, attestation, Witness ID, and draft or publish choice.</p>
            </div>
            <span className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 40%, transparent)", color: "var(--ln-gold-hot)" }}>{mp3Queue.length} {mp3Queue.length === 1 ? "record" : "records"}</span>
          </div>

          {queueIntakeNotice && (
            <section role="alert" className="mt-5 flex gap-3 rounded-sm border px-4 py-3" style={{ borderColor: "color-mix(in srgb, var(--destructive) 64%, transparent)", background: "color-mix(in srgb, var(--destructive) 12%, var(--ln-coal))" }}>
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" style={{ color: "var(--destructive)" }} />
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--destructive-foreground)", fontFamily: "'Cinzel', serif" }}>{queueIntakeNotice.title}</p><p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ln-bone)" }}>{queueIntakeNotice.message}</p></div>
            </section>
          )}

          <p id="mp3-queue-order-help" className="mt-5 text-xs" style={{ color: "var(--ln-smoke)" }}>Drag the handle to reorder, or focus it and use keyboard sorting. Removing a record only removes it from this local queue.</p>
          <DndContext sensors={queueSensors} collisionDetection={closestCenter} onDragEnd={handleQueueDragEnd}>
            <SortableContext items={mp3Queue.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <ol aria-label="MP3 Queue review order" aria-describedby="mp3-queue-order-help" className="mt-3 space-y-2">
                {mp3Queue.map((item, index) => <SortableQueuedMp3 key={item.id} item={item} position={index + 1} onRemove={removeQueuedMp3} />)}
              </ol>
            </SortableContext>
          </DndContext>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => { clearQueue(); setPendingFile(null); setEntered(false); }} className="min-h-11 rounded-sm border px-4 text-sm transition-colors hover:border-[var(--ln-gold-hot)]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 38%, transparent)", color: "var(--ln-parchment)" }}>Choose different files</button>
            <button type="button" onClick={() => { setQueueReviewStarted(true); setQueueIndex(0); setPendingFile(mp3Queue[0].file); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ln-gold-hot)]" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}><Play aria-hidden="true" className="size-4" /> Begin review</button>
          </div>
        </section>
      </div>
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
      queueProgress={mp3Queue.length > 0 ? {
        current: queueIndex + 1,
        total: mp3Queue.length,
        completed: queueCompletions.length,
        remaining: Math.max(mp3Queue.length - queueIndex - 1, 0),
      } : undefined}
      onRegistered={mp3Queue.length > 0 ? (data, registeredTitle) => {
        setQueueCompletions((current) => [...current, {
          songId: data?.songId,
          witnessId: data?.witnessId,
          title: registeredTitle,
        }]);
        const nextIndex = queueIndex + 1;
        if (nextIndex < mp3Queue.length) {
          setQueueIndex(nextIndex);
          setPendingFile(mp3Queue[nextIndex].file);
        } else {
          setQueueComplete(true);
        }
        return true;
      } : undefined}
    />
  );
}
