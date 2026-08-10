/* ═══════════════════════════════════════════════════════════════════
   LOOP TYPE GATEWAY — Music-only provenance entry
   Drop audio → extract metadata → enter Music Environment.
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useRef } from "react";
import { Music, Upload, Loader2, Shield } from "lucide-react";
import { extractFileMetadata } from "@/lib/uploadPipeline";
import { isLoopMusicFile, LOOP_PRODUCT } from "@/lib/loopProduct";
import type { KeeperPrefill } from "./ManifestationStudio";

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
}

export function TypeGateway({ onSelect, onSelectWithPrefill, onFileReady }: TypeGatewayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

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
          className="text-[11px] uppercase tracking-[0.3em] mb-3 inline-flex items-center gap-2"
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

      <div
        className="relative w-full max-w-lg mb-8 rounded-sm transition-all duration-300"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        style={{
          border: isDragging
            ? "1px solid rgba(196,154,40,0.7)"
            : "1px dashed rgba(196,154,40,0.28)",
          background: isDragging ? "rgba(196,154,40,0.08)" : "rgba(196,154,40,0.03)",
          boxShadow: isDragging ? "0 0 40px rgba(196,154,40,0.12)" : "none",
        }}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={extracting}
          className="w-full flex flex-col items-center justify-center gap-3 px-6 py-14 cursor-pointer"
        >
          {extracting ? (
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ln-gold)" }} />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.3)" }}
            >
              {isDragging ? <Upload className="w-6 h-6" style={{ color: "var(--ln-gold)" }} /> : <Music className="w-6 h-6" style={{ color: "var(--ln-gold)" }} />}
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
              {extracting
                ? `Reading ${extractedFile ?? "audio"}…`
                : isDragging
                  ? "Release to begin"
                  : "Drop your track"}
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(245,237,216,0.45)" }}>
              MP3 · WAV · FLAC · AAC · OGG · M4A
            </p>
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.flac,.wav,.ogg,.aac,.m4a,.opus,.aiff"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {extractError && (
        <p className="relative text-xs mb-6 text-center max-w-md" style={{ color: "#F87171" }}>
          {extractError}
        </p>
      )}

      <button
        type="button"
        onClick={() => onSelect("music")}
        className="relative text-sm underline underline-offset-4 transition-opacity hover:opacity-100 opacity-70"
        style={{ color: "var(--ln-gold)", fontFamily: "'Cormorant Garamond', serif", fontSize: 17 }}
      >
        Continue without a file
      </button>
    </div>
  );
}
