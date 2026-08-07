/* ═══════════════════════════════════════════════════════════════════
   TYPE GATEWAY — Immersive manifestation type selector
   Drop a file to auto-detect type and extract provenance.
   Or select a type manually from the cards below.
═══════════════════════════════════════════════════════════════════ */

import { useState, useCallback, useRef } from "react";
import { Music, PenTool, BookOpen, Film, Palette, Printer, Upload, Sparkles, Loader2 } from "lucide-react";
import { extractFileMetadata } from "@/lib/uploadPipeline";
import { type ManifestationType, ATMOSPHERES } from "./types";
import type { KeeperPrefill } from "./ManifestationStudio";

const TYPE_ICONS: Record<ManifestationType, typeof Music> = {
  music: Music,
  lyrics: PenTool,
  comic: Palette,
  manuscript: BookOpen,
  video: Film,
  gcode: Printer,
};

function detectType(file: File): ManifestationType {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("audio/") || ["mp3","flac","wav","ogg","aac","m4a","opus","aiff"].includes(ext)) return "music";
  if (mime.startsWith("video/") || ["mp4","mov","webm","mkv","avi"].includes(ext)) return "video";
  if (["pdf","doc","docx","txt","rtf","md","epub"].includes(ext) || mime.includes("pdf") || mime.includes("word")) return "manuscript";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","webp","tiff","psd","svg"].includes(ext)) return "comic";
  if (["gcode","g","nc","ngc"].includes(ext)) return "gcode";
  return "manuscript";
}

const AI_LABELS: Record<string, string> = {
  suno: "Suno", udio: "Udio", midjourney: "Midjourney",
  stable_diffusion: "Stable Diffusion", flux: "Flux", chatgpt: "ChatGPT",
  claude: "Claude", gemini: "Gemini", runway: "Runway",
  elevenlabs: "ElevenLabs", firefly: "Adobe Firefly", leonardo: "Leonardo AI",
};

interface TypeGatewayProps {
  onSelect: (type: ManifestationType) => void;
  onSelectWithPrefill?: (type: ManifestationType, prefill: KeeperPrefill) => void;
}

export function TypeGateway({ onSelect, onSelectWithPrefill }: TypeGatewayProps) {
  const [hovered, setHovered] = useState<ManifestationType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const types = Object.values(ATMOSPHERES);

  const handleFile = useCallback(async (file: File) => {
    setExtracting(true);
    setExtractedFile(file.name);
    setExtractError(null);
    try {
      const meta = await extractFileMetadata(file);
      const type = detectType(file);
      const prefill: KeeperPrefill = {};
      if (meta.music?.title) prefill.title = meta.music.title;
      if (meta.music?.genre) prefill.genre = meta.music.genre;
      if (meta.music?.lyrics) prefill.lyrics = meta.music.lyrics;
      if (meta.image?.iptcTitle && !prefill.title) prefill.title = meta.image.iptcTitle;
      if (meta.ai.detected) {
        const platform = AI_LABELS[meta.ai.platform ?? ""] ?? meta.ai.platform ?? "AI";
        const model = meta.ai.model ? ` (${meta.ai.model})` : "";
        prefill.aiDisclosure = `${platform}${model}`;
        if (meta.ai.prompt) prefill.haaiOriginStory = `Generated with prompt: "${meta.ai.prompt}"`;
      }
      if (meta.provenance.embeddedAttribution.creator && !prefill.description) {
        prefill.description = `Created by ${meta.provenance.embeddedAttribution.creator}`;
      }
      setExtracting(false);
      if (onSelectWithPrefill && Object.keys(prefill).length > 0) {
        onSelectWithPrefill(type, prefill);
      } else {
        onSelect(type);
      }
    } catch {
      setExtracting(false);
      setExtractError("Could not extract metadata. Select a type manually below.");
    }
  }, [onSelect, onSelectWithPrefill]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <p
          className="text-[10px] uppercase tracking-[0.25em] mb-3"
          style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
        >
          Living Nexus Manifestation Studio
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold mb-3"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
        >
          What Are You Manifesting?
        </h1>
        <p
          className="text-sm md:text-base"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)", lineHeight: 1.6 }}
        >
          Drop your file to begin — provenance is extracted automatically.
          Or choose your medium below.
        </p>
      </div>

      {/* ── Provenance Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !extracting && fileInputRef.current?.click()}
        className="w-full max-w-4xl mb-8 rounded-2xl flex flex-col items-center justify-center py-8 px-6 cursor-pointer transition-all duration-300"
        style={{
          border: `2px dashed ${isDragging ? "#D4AF37" : extracting ? "#A78BFA" : "rgba(212,175,55,0.22)"}`,
          background: isDragging ? "rgba(212,175,55,0.06)" : extracting ? "rgba(167,139,250,0.04)" : "rgba(255,255,255,0.01)",
          boxShadow: isDragging ? "0 0 40px rgba(212,175,55,0.12)" : "none",
        }}
      >
        {extracting ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: "#A78BFA" }} />
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "#A78BFA", letterSpacing: "0.10em" }}>
              EXTRACTING PROVENANCE
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              {extractedFile}
            </div>
            <div style={{ fontSize: 10, color: "rgba(167,139,250,0.50)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
              Reading metadata · Detecting AI participation · Assembling provenance object
            </div>
          </div>
        ) : extractError ? (
          <div className="flex flex-col items-center gap-2">
            <div style={{ fontSize: 12, color: "#EF4444" }}>{extractError}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>Select a type manually below</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,175,55,0.10)", border: "1px solid rgba(212,175,55,0.25)" }}
              >
                <Upload size={18} style={{ color: "#D4AF37" }} />
              </div>
              <div className="text-left">
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "#D4AF37", letterSpacing: "0.10em" }}>
                  DROP A FILE TO BEGIN
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontFamily: "monospace" }}>
                  Audio · Video · Image · Document · Code · 3D
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Sparkles size={11} style={{ color: "rgba(212,175,55,0.50)" }} />
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.25)",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: "italic",
                }}
              >
                Type, metadata, AI participation, and origin are detected automatically from the file
              </span>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full max-w-4xl mb-8">
        <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.10)" }} />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontFamily: "monospace", letterSpacing: "0.12em" }}>
          OR SELECT MANUALLY
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(212,175,55,0.10)" }} />
      </div>

      {/* Type Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {types.map((atm) => {
          const Icon = TYPE_ICONS[atm.type];
          const isHovered = hovered === atm.type;

          return (
            <button
              key={atm.type}
              onClick={() => onSelect(atm.type)}
              onMouseEnter={() => setHovered(atm.type)}
              onMouseLeave={() => setHovered(null)}
              className="group relative flex flex-col items-start p-6 rounded-2xl text-left transition-all duration-300"
              style={{
                background: isHovered ? atm.colorBg : "rgba(17,16,9,0.8)",
                border: `1px solid ${isHovered ? atm.colorBorder : "rgba(196,154,40,0.12)"}`,
                boxShadow: isHovered ? `0 8px 32px ${atm.colorGlow}, inset 0 0 40px ${atm.colorBg}` : "none",
                transform: isHovered ? "translateY(-4px) scale(1.02)" : "none",
              }}
            >
              {isHovered && (
                <div
                  className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
                  style={{ background: atm.gradient }}
                />
              )}
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isHovered ? `${atm.colorPrimary}20` : "rgba(196,154,40,0.06)",
                    border: `1px solid ${isHovered ? atm.colorPrimary : "rgba(196,154,40,0.15)"}`,
                  }}
                >
                  <Icon size={20} style={{ color: isHovered ? atm.colorPrimary : "rgba(196,154,40,0.6)" }} />
                </div>
                <div>
                  <h3
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Cinzel', serif", color: isHovered ? atm.colorPrimary : "var(--ln-parchment)" }}
                  >
                    {atm.label}
                  </h3>
                  <p
                    className="text-[11px] italic"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: isHovered ? atm.colorPrimary : "rgba(245,237,216,0.5)" }}
                  >
                    {atm.tagline}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed relative z-10" style={{ color: "rgba(245,237,216,0.6)" }}>
                {atm.description}
              </p>
              <div
                className="absolute bottom-0 left-6 right-6 h-px transition-all duration-300"
                style={{
                  background: isHovered
                    ? `linear-gradient(90deg, transparent, ${atm.colorPrimary}, transparent)`
                    : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>

      <p
        className="mt-8 text-[11px] text-center"
        style={{ color: "rgba(245,237,216,0.4)", fontFamily: "'Cormorant Garamond', serif" }}
      >
        Every manifestation type uses the same provenance infrastructure —
        your work is cryptographically sealed regardless of medium.
      </p>
    </div>
  );
}
