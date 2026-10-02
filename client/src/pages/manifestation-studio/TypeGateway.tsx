/* ═══════════════════════════════════════════════════════════════════
   LOOP TYPE GATEWAY — Music-only provenance entry
   Drop audio → extract metadata → enter Music Environment.
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useRef } from "react";
import { Music, Upload, Loader2, Shield, Layers, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { extractFileMetadata } from "@/lib/uploadPipeline";
import { describeLoopMp3QueueIntake, isLoopMusicFile, LOOP_MP3_QUEUE_LIMIT, LOOP_PRODUCT, prepareLoopMp3Queue, type LoopMp3QueueIntakeNotice } from "@/lib/loopProduct";
import type { KeeperPrefill } from "./ManifestationStudio";
import { RegistrationAssetCard } from "./RegistrationAssetCard";

const AI_LABELS: Record<string, string> = {
  suno: "Suno", udio: "Udio", midjourney: "Midjourney",
  stable_diffusion: "Stable Diffusion", flux: "Flux", chatgpt: "ChatGPT",
  claude: "Claude", gemini: "Gemini", runway: "Runway",
  elevenlabs: "ElevenLabs", firefly: "Adobe Firefly", leonardo: "Leonardo AI",
};

interface TypeGatewayProps {
  onSelect: (type: "music") => void;
  onSelectWithPrefill?: (type: "music", prefill: KeeperPrefill) => void;
  onFileReady?: (file: File) => void;
  onMp3QueueReady?: (files: File[], intakeNotice?: LoopMp3QueueIntakeNotice) => void;
}

export function TypeGateway({ onSelect, onSelectWithPrefill, onFileReady, onMp3QueueReady }: TypeGatewayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [queueIntakeNotice, setQueueIntakeNotice] = useState<LoopMp3QueueIntakeNotice | null>(null);
  const [intakeMode, setIntakeMode] = useState<"single" | "mp3-queue">("single");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setQueueIntakeNotice(null);
    if (!isLoopMusicFile(file)) {
      setExtractError("Loop accepts audio only — MP3, WAV, FLAC, AAC, OGG, M4A.");
      return;
    }
    setExtracting(true);
    setExtractedFile(file.name);
    setExtractError(null);
    try {
      const meta = await extractFileMetadata(file);
      const prefill: KeeperPrefill = {};
      if (meta.music?.title) prefill.title = meta.music.title;
      if (meta.music?.genre) prefill.genre = meta.music.genre;
      if (meta.music?.lyrics) prefill.lyrics = meta.music.lyrics;
      if (meta.ai.detected) {
        const platform = AI_LABELS[meta.ai.platform ?? ""] ?? meta.ai.platform ?? "AI";
        const model = meta.ai.model ? ` (${meta.ai.model})` : "";
        prefill.aiDisclosure = `${platform}${model}`;
        if (meta.ai.prompt) prefill.haaiOriginStory = `Generated with prompt: "${meta.ai.prompt}"`;
      }
      if (meta.provenance.embeddedAttribution.creator && !prefill.description) {
        prefill.description = `Created by ${meta.provenance.embeddedAttribution.creator}`;
      }
      onFileReady?.(file);
      setExtracting(false);
      if (onSelectWithPrefill) {
        onSelectWithPrefill("music", prefill);
      } else {
        onSelect("music");
      }
    } catch {
      setExtracting(false);
      setExtractError("Could not extract metadata. Continue to register manually.");
      onFileReady?.(file);
      onSelect("music");
    }
  }, [onSelect, onSelectWithPrefill, onFileReady]);

  const handleQueueFiles = useCallback((files: File[]) => {
    const selection = prepareLoopMp3Queue(files);
    const notice = describeLoopMp3QueueIntake(selection);
    setQueueIntakeNotice(notice);

    if (selection.accepted.length === 0) {
      const emptyQueueNotice: LoopMp3QueueIntakeNotice = notice ?? {
        title: "Choose MP3 records",
        message: "Choose one or more .mp3 files to begin a review queue.",
      };
      setQueueIntakeNotice(emptyQueueNotice);
      toast.error(emptyQueueNotice.title, { description: emptyQueueNotice.message, duration: 7500 });
      return;
    }

    setExtractError(null);
    if (notice) toast.error(notice.title, { description: notice.message, duration: 7500 });
    setExtractedFile(`${selection.accepted.length} MP3 ${selection.accepted.length === 1 ? "record" : "records"}`);
    onMp3QueueReady?.(selection.accepted, notice ?? undefined);
  }, [onMp3QueueReady]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (intakeMode === "mp3-queue") handleQueueFiles(files);
    else if (files[0]) handleFile(files[0]);
  }, [handleFile, handleQueueFiles, intakeMode]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(196,154,40,0.14), transparent 55%), linear-gradient(180deg, #050505, #000)",
        }}
      />

      <div className="relative text-center mb-10 max-w-xl">
        <p
          className="text-xs uppercase tracking-[0.3em] mb-3 inline-flex items-center gap-2"
          style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
        >
          <Shield size={12} /> {LOOP_PRODUCT.fullName}
        </p>
        <h1
          className="text-3xl md:text-5xl font-bold mb-4"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
        >
          Register music
        </h1>
        <p
          className="text-base md:text-lg"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)", lineHeight: 1.6 }}
        >
          {LOOP_PRODUCT.supporting}
        </p>
      </div>

      <div className="relative mb-8 w-full max-w-lg">
        <div className="mb-3 grid grid-cols-2 rounded-sm border p-1" role="radiogroup" aria-label="Registration intake mode" style={{ borderColor: "rgba(196,154,40,0.28)", background: "rgba(0,0,0,0.24)" }}>
          <button
            type="button"
            role="radio"
            aria-checked={intakeMode === "single"}
            onClick={() => { setIntakeMode("single"); setExtractError(null); setQueueIntakeNotice(null); }}
            className="min-h-11 rounded-sm px-3 text-xs font-semibold transition-colors"
            style={{ background: intakeMode === "single" ? "rgba(196,154,40,0.16)" : "transparent", color: intakeMode === "single" ? "var(--ln-gold-hot)" : "var(--ln-bone)" }}
          >
            One record
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={intakeMode === "mp3-queue"}
            onClick={() => { setIntakeMode("mp3-queue"); setExtractError(null); setQueueIntakeNotice(null); }}
            className="min-h-11 rounded-sm px-3 text-xs font-semibold transition-colors"
            style={{ background: intakeMode === "mp3-queue" ? "rgba(196,154,40,0.16)" : "transparent", color: intakeMode === "mp3-queue" ? "var(--ln-gold-hot)" : "var(--ln-bone)" }}
          >
            <Layers aria-hidden="true" className="mr-1 inline size-3.5" /> MP3 queue
          </button>
        </div>
        <RegistrationAssetCard
          id="gateway-canonical-audio"
          sectionNumber="01"
          eyebrow="Canonical artifact"
          title={intakeMode === "mp3-queue" ? "Build an MP3 review queue" : "Choose canonical audio"}
          description={intakeMode === "mp3-queue"
            ? `Choose up to ${LOOP_MP3_QUEUE_LIMIT} MP3 records. Each opens separately for metadata review, participation disclosure, attestation, WID sealing, and draft/publish choice.`
            : "Select the exact track you intend to witness. We read embedded metadata before you confirm the Work."}
          status={intakeMode === "mp3-queue"
            ? "Queue order is local to this browser. Nothing is uploaded or registered until you complete each Work."
            : extracting ? `Reading ${extractedFile ?? "audio"}…` : "Audio metadata is read before registration; nothing is published from this step."}
          action={
            <button
              type="button"
              onClick={() => (intakeMode === "mp3-queue" ? queueInputRef.current : fileInputRef.current)?.click()}
              disabled={extracting}
              className="min-h-11 w-full rounded-sm border px-4 text-sm font-medium transition-colors hover:border-[var(--ln-gold-hot)] hover:text-[var(--ln-gold-hot)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              style={{ borderColor: "rgba(196,154,40,0.45)", color: "var(--ln-parchment)" }}
            >
              Choose audio
            </button>
          }
        >
            <label
            htmlFor={intakeMode === "mp3-queue" ? "gateway-mp3-queue-files" : "gateway-canonical-audio-file"}
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border border-dashed px-6 py-8 text-center transition-all duration-300"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            style={{
              borderColor: isDragging ? "rgba(196,154,40,0.7)" : "rgba(196,154,40,0.28)",
              background: isDragging ? "rgba(196,154,40,0.08)" : "rgba(0,0,0,0.2)",
              boxShadow: isDragging ? "0 0 28px rgba(196,154,40,0.12)" : "none",
            }}
          >
              <input
              id="gateway-canonical-audio-file"
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.flac,.wav,.ogg,.aac,.m4a,.opus,.aiff"
              className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <input
                id="gateway-mp3-queue-files"
                ref={queueInputRef}
                type="file"
                accept=".mp3,audio/mpeg,audio/mp3"
                multiple
                className="sr-only"
                onChange={(e) => {
                  handleQueueFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              {extracting ? (
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--ln-gold)" }} />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.3)" }}>
                {isDragging ? <Upload className="h-5 w-5" style={{ color: "var(--ln-gold)" }} /> : <Music className="h-5 w-5" style={{ color: "var(--ln-gold)" }} />}
              </div>
            )}
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
                  {extracting
                    ? `Reading ${extractedFile ?? "audio"}…`
                    : isDragging
                      ? "Release to begin"
                      : intakeMode === "mp3-queue"
                        ? "Drop MP3 records for review"
                        : "Drop canonical audio"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "rgba(245,237,216,0.54)" }}>
                  {intakeMode === "mp3-queue" ? `MP3 only · maximum ${LOOP_MP3_QUEUE_LIMIT} records · review one Work at a time` : "MP3 · WAV · FLAC · AAC · OGG · M4A"}
                </p>
              </div>
          </label>
        </RegistrationAssetCard>
      </div>

      {queueIntakeNotice && (
        <section
          role="alert"
          aria-live="assertive"
          className="relative mb-6 flex w-full max-w-lg gap-3 rounded-sm border px-4 py-3 text-left"
          style={{ borderColor: "color-mix(in srgb, var(--destructive) 64%, transparent)", background: "color-mix(in srgb, var(--destructive) 12%, var(--ln-coal))" }}
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" style={{ color: "var(--destructive)" }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--destructive-foreground)", fontFamily: "'Cinzel', serif" }}>{queueIntakeNotice.title}</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ln-bone)" }}>{queueIntakeNotice.message}</p>
          </div>
        </section>
      )}

      {extractError && (
        <p className="relative text-xs mb-6 text-center max-w-md" style={{ color: "#F87171" }}>
          {extractError}
        </p>
      )}

      {intakeMode === "single" && (
        <button
          type="button"
          onClick={() => onSelect("music")}
          className="relative text-sm underline underline-offset-4 transition-opacity hover:opacity-100 opacity-70"
          style={{ color: "var(--ln-gold)", fontFamily: "'Cormorant Garamond', serif", fontSize: 17 }}
        >
          Continue without a file
        </button>
      )}
    </div>
  );
}
