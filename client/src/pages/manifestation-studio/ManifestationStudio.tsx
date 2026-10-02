/* ═══════════════════════════════════════════════════════════════════
   LOOP MANIFESTATION STUDIO — Music provenance registration
   WID engine entry. Non-music mediums removed from product scope.
════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CircleAlert, GripVertical, ListOrdered, Pause, Play, Trash2, X } from "lucide-react";
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
  previewUrl: string;
  reviewTitle: string;
}

interface QueueBulkMetadata {
  officialArtistName?: string;
  albumName?: string;
  publisherName?: string;
  creatorReleaseDate?: string;
}

const EMPTY_QUEUE_BULK_DRAFT = {
  officialArtistName: "",
  albumName: "",
  publisherName: "",
  creatorReleaseDate: "",
};

function toQueuedMp3(file: File, index: number): QueuedMp3 {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    file,
    previewUrl: URL.createObjectURL(file),
    reviewTitle: file.name.replace(/\.[^.]+$/, ""),
  };
}

function queueSourceTitle(file: File): string {
  return file.name.replace(/\.[^.]+$/, "");
}

function formatQueuePreviewTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function SortableQueuedMp3({
  item,
  position,
  isPreviewing,
  isPreviewReady,
  previewPosition,
  previewDuration,
  isSelected,
  onPreview,
  onSeek,
  onSelect,
  onRename,
  onRemove,
}: {
  item: QueuedMp3;
  position: number;
  isPreviewing: boolean;
  isPreviewReady: boolean;
  previewPosition: number;
  previewDuration: number;
  isSelected: boolean;
  onPreview: (item: QueuedMp3) => void;
  onSeek: (seconds: number) => void;
  onSelect: (id: string) => void;
  onRename: (id: string, reviewTitle: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const sourceTitle = queueSourceTitle(item.file);
  const titleEdited = item.reviewTitle.trim() !== sourceTitle;
  const safePreviewDuration = previewDuration > 0 ? previewDuration : 0;
  const safePreviewPosition = Math.min(Math.max(previewPosition, 0), safePreviewDuration || 0);

  return (
    <li
      ref={setNodeRef}
      className="flex min-h-12 items-center gap-2 rounded-sm border px-2 py-2 transition-[background-color,border-color,box-shadow] duration-200 sm:px-3"
      aria-current={isSelected ? true : undefined}
      onClick={() => onSelect(item.id)}
      onFocusCapture={() => onSelect(item.id)}
      style={{
        borderColor: isDragging || isSelected ? "color-mix(in srgb, var(--ln-gold) 70%, transparent)" : "color-mix(in srgb, var(--ln-gold) 22%, transparent)",
        background: isDragging || isSelected ? "color-mix(in srgb, var(--ln-gold) 14%, var(--ln-coal))" : "color-mix(in srgb, var(--ln-coal) 90%, var(--ln-gold))",
        boxShadow: isDragging
          ? "0 10px 28px color-mix(in srgb, var(--ln-gold) 18%, transparent)"
          : isSelected
            ? "0 0 0 2px color-mix(in srgb, var(--ln-gold-hot) 82%, transparent), 0 0 20px color-mix(in srgb, var(--ln-gold) 24%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--ln-gold-hot) 25%, transparent)"
            : "none",
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
      <div className="min-w-0 flex-1">
        <label className="mb-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }} htmlFor={`queue-title-${item.id}`}>
          <span>Review title</span>
          {isSelected && <span className="rounded-full border px-1.5 py-0.5 text-[10px] tracking-[0.1em]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold-hot) 64%, transparent)", color: "var(--ln-gold-hot)" }}>Active</span>}
          <span className="rounded-full border px-1.5 py-0.5 text-[10px] tracking-[0.1em]" style={{ borderColor: titleEdited ? "color-mix(in srgb, var(--ln-gold-hot) 54%, transparent)" : "color-mix(in srgb, var(--ln-smoke) 42%, transparent)", color: titleEdited ? "var(--ln-gold-hot)" : "var(--ln-smoke)" }}>
            {titleEdited ? "Edited for review" : "From source filename"}
          </span>
        </label>
        <input
          id={`queue-title-${item.id}`}
          value={item.reviewTitle}
          onChange={(event) => onRename(item.id, event.target.value)}
          className="w-full rounded-sm border bg-transparent px-2 py-1 text-sm outline-none transition-colors focus-visible:border-[var(--ln-gold-hot)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ln-gold)_28%,transparent)]"
          style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 22%, transparent)", color: "var(--ln-parchment)" }}
          aria-describedby={`queue-source-${item.id}`}
        />
        <p id={`queue-source-${item.id}`} className="mt-1 break-all text-xs" style={{ color: "var(--ln-smoke)" }}>Source file: {item.file.name}</p>
        {isPreviewReady && (
          <div className="mt-2 rounded-sm border px-2 py-2" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 20%, transparent)", background: "color-mix(in srgb, var(--ln-gold) 7%, transparent)" }}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
              <span>{isPreviewing ? "Previewing" : safePreviewPosition > 0 ? "Preview paused" : "Preview ready"}</span>
              <span style={{ color: "var(--ln-bone)" }}>{formatQueuePreviewTime(safePreviewPosition)} / {formatQueuePreviewTime(safePreviewDuration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={safePreviewDuration || 0.01}
              step="0.01"
              value={safePreviewPosition}
              disabled={safePreviewDuration <= 0}
              aria-label={`Preview position for ${item.reviewTitle || item.file.name}`}
              aria-valuetext={`${formatQueuePreviewTime(safePreviewPosition)} of ${formatQueuePreviewTime(safePreviewDuration)}`}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="h-2 w-full cursor-pointer accent-[var(--ln-gold-hot)] disabled:cursor-not-allowed disabled:opacity-45"
              style={{ accentColor: "var(--ln-gold-hot)" }}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label={`${isPreviewing ? "Pause" : "Preview"} ${item.reviewTitle || item.file.name}`}
        onClick={() => onPreview(item)}
        className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm border transition-colors hover:border-[var(--ln-gold-hot)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ln-gold-hot)]"
        style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 42%, transparent)", color: "var(--ln-gold-hot)", background: isPreviewing ? "color-mix(in srgb, var(--ln-gold) 16%, transparent)" : "transparent" }}
      >
        {isPreviewing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
      </button>
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
  const [previewingQueueId, setPreviewingQueueId] = useState<string | null>(null);
  const [previewQueueId, setPreviewQueueId] = useState<string | null>(null);
  const [previewPositionSeconds, setPreviewPositionSeconds] = useState(0);
  const [previewDurationSeconds, setPreviewDurationSeconds] = useState(0);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [queueBulkDraft, setQueueBulkDraft] = useState(EMPTY_QUEUE_BULK_DRAFT);
  const [queueBulkMetadata, setQueueBulkMetadata] = useState<QueueBulkMetadata>({});
  const { consumePendingWork, consumePendingQueue } = usePendingWork();
  const queuePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const queueSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const stopQueuePreview = (clearSource = true) => {
    const audio = queuePreviewAudioRef.current;
    if (audio) {
      audio.pause();
      if (clearSource) {
        audio.currentTime = 0;
        audio.src = "";
        queuePreviewAudioRef.current = null;
      }
    }
    setPreviewingQueueId(null);
    if (clearSource) {
      setPreviewQueueId(null);
      setPreviewPositionSeconds(0);
      setPreviewDurationSeconds(0);
    }
  };

  const clearQueue = () => {
    stopQueuePreview();
    setMp3Queue((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    setQueueIndex(0);
    setQueueCompletions([]);
    setQueueComplete(false);
    setQueueReviewStarted(false);
    setQueueIntakeNotice(null);
    setSelectedQueueId(null);
    setQueueBulkDraft(EMPTY_QUEUE_BULK_DRAFT);
    setQueueBulkMetadata({});
  };

  useEffect(() => () => {
    const audio = queuePreviewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
  }, []);

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
      setQueueBulkDraft(EMPTY_QUEUE_BULK_DRAFT);
      setQueueBulkMetadata({});
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

  useEffect(() => {
    if (mp3Queue.length === 0) {
      if (selectedQueueId) setSelectedQueueId(null);
      return;
    }
    if (!selectedQueueId || !mp3Queue.some((item) => item.id === selectedQueueId)) {
      setSelectedQueueId(mp3Queue[0].id);
    }
  }, [mp3Queue, selectedQueueId]);

  useEffect(() => {
    if (!entered || !isAuthenticated || mp3Queue.length === 0 || queueReviewStarted) return;

    const handleQueueShortcut = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        event.metaKey || event.ctrlKey || event.altKey ||
        target?.closest("input, textarea, select, button, [role=slider], [contenteditable=true]")
      ) return;

      const currentIndex = Math.max(0, mp3Queue.findIndex((item) => item.id === selectedQueueId));
      if (event.code === "Space") {
        event.preventDefault();
        const selectedItem = mp3Queue[currentIndex];
        if (selectedItem) toggleQueuePreview(selectedItem);
        return;
      }

      const direction = event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
      if (!direction) return;

      event.preventDefault();
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), mp3Queue.length - 1);
      setSelectedQueueId(mp3Queue[nextIndex].id);
    };

    window.addEventListener("keydown", handleQueueShortcut);
    return () => window.removeEventListener("keydown", handleQueueShortcut);
  // Selection, source queue, and review mode intentionally rebind this local-only handler.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, isAuthenticated, mp3Queue, queueReviewStarted, selectedQueueId]);

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
          setQueueBulkDraft(EMPTY_QUEUE_BULK_DRAFT);
          setQueueBulkMetadata({});
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
    if (previewingQueueId === id) stopQueuePreview();
    const next = mp3Queue.filter((item) => item.id !== id);
    const removed = mp3Queue.find((item) => item.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    if (next.length === 0) {
      clearQueue();
      setPendingFile(null);
      setEntered(false);
      return;
    }
    if (selectedQueueId === id) setSelectedQueueId(next[0]?.id ?? null);
    setMp3Queue(next);
  };

  const renameQueuedMp3 = (id: string, reviewTitle: string) => {
    setMp3Queue((current) => current.map((item) => item.id === id ? { ...item, reviewTitle } : item));
  };

  const applyQueueBulkMetadata = () => {
    const officialArtistName = queueBulkDraft.officialArtistName.trim();
    const albumName = queueBulkDraft.albumName.trim();
    const publisherName = queueBulkDraft.publisherName.trim();
    const creatorReleaseDate = queueBulkDraft.creatorReleaseDate;
    setQueueBulkMetadata({
      ...(officialArtistName ? { officialArtistName } : {}),
      ...(albumName ? { albumName } : {}),
      ...(publisherName ? { publisherName } : {}),
      ...(creatorReleaseDate ? { creatorReleaseDate } : {}),
    });
  };

  const toggleQueuePreview = (item: QueuedMp3) => {
    const currentAudio = queuePreviewAudioRef.current;
    if (previewQueueId === item.id && currentAudio) {
      if (currentAudio.paused) {
        setPreviewingQueueId(item.id);
        void currentAudio.play().catch(() => {
          if (queuePreviewAudioRef.current === currentAudio) setPreviewingQueueId(null);
        });
      } else {
        currentAudio.pause();
        setPreviewingQueueId(null);
      }
      return;
    }

    stopQueuePreview();
    const audio = new Audio(item.previewUrl);
    queuePreviewAudioRef.current = audio;
    setPreviewQueueId(item.id);
    setPreviewPositionSeconds(0);
    setPreviewDurationSeconds(0);
    audio.addEventListener("loadedmetadata", () => {
      if (queuePreviewAudioRef.current === audio) setPreviewDurationSeconds(Number.isFinite(audio.duration) ? audio.duration : 0);
    });
    audio.addEventListener("timeupdate", () => {
      if (queuePreviewAudioRef.current === audio) setPreviewPositionSeconds(audio.currentTime);
    });
    audio.addEventListener("ended", () => {
      if (queuePreviewAudioRef.current === audio) {
        audio.currentTime = 0;
        setPreviewPositionSeconds(0);
        setPreviewingQueueId(null);
      }
    }, { once: true });
    audio.addEventListener("error", () => {
      if (queuePreviewAudioRef.current === audio) stopQueuePreview();
    }, { once: true });
    setPreviewingQueueId(item.id);
    void audio.play().catch(() => {
      if (queuePreviewAudioRef.current === audio) stopQueuePreview();
    });
  };

  const seekQueuePreview = (seconds: number) => {
    const audio = queuePreviewAudioRef.current;
    if (!audio || !previewQueueId || !Number.isFinite(seconds)) return;
    audio.currentTime = seconds;
    setPreviewPositionSeconds(seconds);
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

          <section className="mt-5 rounded-sm border px-3 py-3 sm:px-4" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 28%, transparent)", background: "color-mix(in srgb, var(--ln-gold) 6%, var(--ln-coal))" }} aria-labelledby="queue-bulk-metadata-heading">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p id="queue-bulk-metadata-heading" className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>Queue metadata proposal</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ln-bone)" }}>Propose artist, album, publisher, or Original Release Date for each unstarted review. Each Work remains editable, chronology-checked, and separately attested before sealing.</p>
              </div>
              {Object.keys(queueBulkMetadata).length > 0 && <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.1em]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold-hot) 52%, transparent)", color: "var(--ln-gold-hot)" }}>Proposal active</span>}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
                Artist
                <input value={queueBulkDraft.officialArtistName} onChange={(event) => setQueueBulkDraft((current) => ({ ...current, officialArtistName: event.target.value }))} placeholder="Artist for queued reviews" className="min-h-10 rounded-sm border bg-transparent px-3 text-sm normal-case tracking-normal outline-none transition-colors focus-visible:border-[var(--ln-gold-hot)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ln-gold)_28%,transparent)]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 24%, transparent)", color: "var(--ln-parchment)" }} />
              </label>
              <label className="grid gap-1 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
                Album
                <input value={queueBulkDraft.albumName} onChange={(event) => setQueueBulkDraft((current) => ({ ...current, albumName: event.target.value }))} placeholder="Album for queued reviews" className="min-h-10 rounded-sm border bg-transparent px-3 text-sm normal-case tracking-normal outline-none transition-colors focus-visible:border-[var(--ln-gold-hot)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ln-gold)_28%,transparent)]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 24%, transparent)", color: "var(--ln-parchment)" }} />
              </label>
              <label className="grid gap-1 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
                Publisher
                <input value={queueBulkDraft.publisherName} onChange={(event) => setQueueBulkDraft((current) => ({ ...current, publisherName: event.target.value }))} placeholder="Publisher or label for queued reviews" className="min-h-10 rounded-sm border bg-transparent px-3 text-sm normal-case tracking-normal outline-none transition-colors focus-visible:border-[var(--ln-gold-hot)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ln-gold)_28%,transparent)]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 24%, transparent)", color: "var(--ln-parchment)" }} />
              </label>
              <label className="grid gap-1 text-xs uppercase tracking-[0.12em]" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
                Original Release Date
                <input type="date" value={queueBulkDraft.creatorReleaseDate} onChange={(event) => setQueueBulkDraft((current) => ({ ...current, creatorReleaseDate: event.target.value }))} className="min-h-10 rounded-sm border bg-transparent px-3 text-sm normal-case tracking-normal outline-none transition-colors focus-visible:border-[var(--ln-gold-hot)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--ln-gold)_28%,transparent)]" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 24%, transparent)", color: "var(--ln-parchment)", colorScheme: "dark" }} />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" onClick={applyQueueBulkMetadata} disabled={!queueBulkDraft.officialArtistName.trim() && !queueBulkDraft.albumName.trim() && !queueBulkDraft.publisherName.trim() && !queueBulkDraft.creatorReleaseDate} className="min-h-10 rounded-sm border px-3 text-xs font-semibold uppercase tracking-[0.1em] transition-colors enabled:hover:border-[var(--ln-gold-hot)] disabled:cursor-not-allowed disabled:opacity-45" style={{ borderColor: "color-mix(in srgb, var(--ln-gold) 52%, transparent)", color: "var(--ln-gold-hot)" }}>Apply to all pending reviews</button>
              {Object.keys(queueBulkMetadata).length > 0 && <button type="button" onClick={() => { setQueueBulkMetadata({}); setQueueBulkDraft(EMPTY_QUEUE_BULK_DRAFT); }} className="min-h-10 rounded-sm border px-3 text-xs uppercase tracking-[0.1em] transition-colors hover:border-[var(--destructive)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--destructive)]" style={{ borderColor: "color-mix(in srgb, var(--ln-smoke) 52%, transparent)", color: "var(--ln-bone)" }}>Clear proposal</button>}
              <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>Publisher is saved as a Work credit; date validity is checked again by the registration server. No WID, source metadata, or completed record changes here.</span>
            </div>
          </section>

          <p id="mp3-queue-order-help" className="mt-5 text-xs" style={{ color: "var(--ln-smoke)" }}>Drag the handle to reorder, preview a selected source locally, and set its review title. Select a queue card, then use Space to play or pause and ←/↑ or →/↓ to move the active record. Source filenames and file bytes remain unchanged until each Work is verified in review.</p>
          <DndContext sensors={queueSensors} collisionDetection={closestCenter} onDragEnd={handleQueueDragEnd}>
            <SortableContext items={mp3Queue.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <ol aria-label="MP3 Queue review order" aria-describedby="mp3-queue-order-help" aria-keyshortcuts="Space ArrowLeft ArrowRight ArrowUp ArrowDown" className="mt-3 space-y-2">
                {mp3Queue.map((item, index) => (
                  <SortableQueuedMp3
                    key={item.id}
                    item={item}
                    position={index + 1}
                    isPreviewing={previewingQueueId === item.id}
                    isPreviewReady={previewQueueId === item.id}
                    previewPosition={previewQueueId === item.id ? previewPositionSeconds : 0}
                    previewDuration={previewQueueId === item.id ? previewDurationSeconds : 0}
                    isSelected={selectedQueueId === item.id}
                    onPreview={toggleQueuePreview}
                    onSeek={seekQueuePreview}
                    onSelect={setSelectedQueueId}
                    onRename={renameQueuedMp3}
                    onRemove={removeQueuedMp3}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => { clearQueue(); setPendingFile(null); setEntered(false); }} className="min-h-11 rounded-sm border px-4 text-sm transition-colors hover:border-[var(--destructive)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--destructive)]" style={{ borderColor: "color-mix(in srgb, var(--destructive) 56%, transparent)", color: "var(--ln-parchment)" }}>Clear all</button>
            <button type="button" onClick={() => { stopQueuePreview(); mp3Queue.forEach((item) => URL.revokeObjectURL(item.previewUrl)); setQueueReviewStarted(true); setQueueIndex(0); setPendingFile(mp3Queue[0].file); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ln-gold-hot)]" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}><Play aria-hidden="true" className="size-4" /> Begin review</button>
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
      queueReviewTitle={mp3Queue.length > 0 ? mp3Queue[queueIndex]?.reviewTitle : undefined}
      queueBulkMetadata={mp3Queue.length > 0 ? queueBulkMetadata : undefined}
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
