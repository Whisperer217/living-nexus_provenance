/**
 * BatchUploadPage — Phase 82
 * Per-track upload cards: each card has its own audio drop zone, cover art slot,
 * title, genre, and AI consent. A "Batch Fill" panel pushes shared values to all
 * cards at once. Cards can be added one at a time or via multi-file drop.
 */
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, Music, X, CheckCircle, Loader2, AlertCircle,
  Plus, ChevronDown, ChevronUp, Image as ImageIcon,
  Library, ExternalLink, Layers, Fingerprint, Sparkles, Copy,
} from "lucide-react";

import { EDIT_GENRES as GENRES } from "@shared/contentTypes";
import { useAudioMetadata } from "@/hooks/useAudioMetadata";
// ── WID crypto helpers ────────────────────────────────────────────────────────
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hashBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}
async function generateECDSAKeypair() {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
}
async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, enc.encode(payload));
  const sigBytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < sigBytes.length; i++) binary += String.fromCharCode(sigBytes[i]);
  return btoa(binary);
}
async function exportPublicKeyJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y });
}
function deriveHarmonicFrequencies(hashHex: string): number[] {
  const BASE_FREQS = [110, 220, 330, 440, 550, 660];
  return BASE_FREQS.map((base, i) => {
    const chunk = parseInt(hashHex.slice(i * 8, i * 8 + 8), 16);
    const ratio = (chunk % 1000) / 1000;
    return Math.round(base * (0.85 + ratio * 0.3) * 10) / 10;
  });
}
function formatWID(hashHex: string, mode = "audio"): string {
  const prefix = mode === "lyrics" ? "WID-LYR" : mode === "manuscript" ? "WID-MAN" : mode === "comic" ? "WID-COM" : "WID-MUS";
  return `${prefix}-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AI_OPTIONS = [
  { value: "prohibited", label: "Prohibited — No AI use" },
  { value: "permitted_attribution", label: "Permitted with attribution" },
  { value: "permitted", label: "Permitted — Open AI use" },
] as const;

// ── Track card state ──────────────────────────────────────────────────────────
interface TrackCard {
  id: string;
  audioFile: File | null;
  audioStatus: "empty" | "hashing" | "ready" | "uploading" | "done" | "error";
  uploadProgress?: number; // 0-100 during "uploading" status
  errorMsg?: string;
  wid?: string;
  fileHash?: string;
  harmonicSignature?: number[];
  ecdsaPublicKey?: string;
  ecdsaSignature?: string;
  coverFile: File | null;
  coverPreview: string | null;
  coverUrl?: string;
  title: string;
  genre: string;
  aiConsent: "prohibited" | "permitted_attribution" | "permitted";
  expanded: boolean;
  audioDragging: boolean;
  coverDragging: boolean;
  fileType: "full_mix" | "vocal_stem" | "instrumental_stem" | "bass_stem" | "drum_stem" | "other_stem";
  // New provenance fields from batch upload sketch
  releaseDate: string;
  aiDisclosure: "original" | "ai_assisted" | "human_authored_ai_instrument" | "ai_generated";
  aiToolSuno: boolean;
  aiToolUdio: boolean;
  aiToolSonato: boolean;
  aiToolOther: boolean;
  aiToolOtherName: string;
  lyricsText: string;
  lyricsExpanded: boolean;
}

/** Strip leading track-number prefix from a filename-derived title.
 * Handles: "14 The Pipes", "14. The Pipes", "14 - The Pipes", "14_The_Pipes" etc.
 */
function stripTrackPrefix(raw: string): string {
  return raw
    .replace(/^\d{1,3}[\s._\-]+/, "") // remove leading number + separator
    .replace(/[_-]/g, " ")             // replace remaining underscores/hyphens
    .trim();
}

function makeEmptyCard(overrides?: Partial<TrackCard>): TrackCard {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fileType: "full_mix",
    releaseDate: "",
    aiDisclosure: "original",
    aiToolSuno: false,
    aiToolUdio: false,
    aiToolSonato: false,
    aiToolOther: false,
    aiToolOtherName: "",
    lyricsText: "",
    lyricsExpanded: false,
    audioFile: null,
    audioStatus: "empty",
    coverFile: null,
    coverPreview: null,
    title: "",
    genre: "",
    aiConsent: "prohibited",
    expanded: true,
    audioDragging: false,
    coverDragging: false,
    ...overrides,
  };
}

// ── S3 upload helper ──────────────────────────────────────────────────────────
async function uploadFileToS3(
  file: File,
  type: "audio" | "cover",
  onProgress?: (pct: number) => void
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  formData.append("filename", file.name);
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload-file");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded * 100) / e.total));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error("Invalid server response")); }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error((err as { error?: string }).error || `Upload failed (${xhr.status})`));
          } catch { reject(new Error(`Upload failed (${xhr.status})`)); }
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }
  const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `Upload failed (${res.status})`);
  }
  return res.json() as Promise<{ url: string; key: string }>;
}

// ── TrackCard component ───────────────────────────────────────────────────────
function TrackCardUI({
  card, index, total, onChange, onRemove, onGenerateWid, onAddMultiple,
}: {
  card: TrackCard;
  index: number;
  total: number;
  onChange: (id: string, patch: Partial<TrackCard>) => void;
  onRemove: (id: string) => void;
  onGenerateWid: (id: string, file: File) => void;
  onAddMultiple: (files: File[]) => void;
}) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { extractMetadata } = useAudioMetadata();

  const MAX_BATCH_AUDIO_MB = 200;
  const handleAudioFile = (file: File) => {
    if (file.size > MAX_BATCH_AUDIO_MB * 1024 * 1024) {
      toast.error(`File too large: ${(file.size / 1024 / 1024).toFixed(0)} MB. Batch upload limit is ${MAX_BATCH_AUDIO_MB} MB per track. For files over ${MAX_BATCH_AUDIO_MB} MB, use Single Upload.`);
      return;
    }
    const fallbackTitle = stripTrackPrefix(file.name.replace(/\.[^.]+$/, ""));
    // Auto-detect stem type from filename
    const nameLower = file.name.toLowerCase();
    const detectedType: TrackCard["fileType"] =
      nameLower.includes("vocal") ? "vocal_stem" :
      nameLower.includes("instrument") ? "instrumental_stem" :
      nameLower.includes("bass") ? "bass_stem" :
      nameLower.includes("drum") || nameLower.includes("perc") ? "drum_stem" :
      "full_mix";
    onChange(card.id, { audioFile: file, title: card.title || fallbackTitle, audioStatus: "hashing", fileType: detectedType });
    onGenerateWid(card.id, file);
    // Auto-populate card fields from embedded ID3 metadata
    extractMetadata(file).then(meta => {
      const patch: Partial<TrackCard> = {};
      if (meta.title) patch.title = meta.title;
      if (meta.genre && !card.genre) patch.genre = meta.genre;
      if (meta.coverArtBlob && !card.coverFile) {
        const ext = meta.coverArtBlob.type.includes("png") ? "png" : "jpg";
        patch.coverFile = new File([meta.coverArtBlob], `cover.${ext}`, { type: meta.coverArtBlob.type });
        patch.coverPreview = undefined; // will be set below via FileReader
        const reader = new FileReader();
        reader.onload = ev => onChange(card.id, { coverPreview: ev.target?.result as string });
        reader.readAsDataURL(meta.coverArtBlob);
      }
      if (Object.keys(patch).length > 0) onChange(card.id, patch);
    });
  };

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onChange(card.id, { audioDragging: false });
    const file = Array.from(e.dataTransfer.files).find(
      f => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a|webm)$/i.test(f.name)
    );
    if (!file) { toast.error("Drop an audio file here"); return; }
    handleAudioFile(file);
  };

  const handleCoverFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = ev => onChange(card.id, { coverFile: file, coverPreview: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onChange(card.id, { coverDragging: false });
    const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith("image/"));
    if (!file) { toast.error("Drop an image file here"); return; }
    handleCoverFile(file);
  };

  const statusColor = {
    empty: "var(--ln-coal)",
    hashing: "var(--ln-gold)",
    ready: "var(--ln-seal-bright)",
    uploading: "var(--ln-gold)",
    done: "var(--ln-seal-bright)",
    error: "var(--ln-ember)",
  }[card.audioStatus];

  const statusLabel = {
    empty: "Drop audio",
    hashing: "Generating WID...",
    ready: "Ready",
    uploading: "Uploading...",
    done: "Uploaded",
    error: card.errorMsg ?? "Error",
  }[card.audioStatus];

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--ln-coal)",
        border: `1px solid ${card.audioStatus === "done" ? "rgba(74,222,128,0.5)" : "var(--ln-gold)"}`,
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ background: "rgba(44,52,56,0.6)" }}
        onClick={() => onChange(card.id, { expanded: !card.expanded })}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: card.title ? "#FFFFFF" : "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
          >
            {card.title || "Untitled Track"}
          </p>
          {card.wid && (
            <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: "rgba(232,223,200,0.6)" }}>
              {card.wid}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(card.audioStatus === "hashing" || card.audioStatus === "uploading") && (
            <Loader2 size={14} className="animate-spin" style={{ color: statusColor }} />
          )}
          {card.audioStatus === "done" && <CheckCircle size={14} style={{ color: statusColor }} />}
          {card.audioStatus === "error" && <AlertCircle size={14} style={{ color: statusColor }} />}
          {card.audioStatus === "ready" && <Fingerprint size={14} style={{ color: statusColor }} />}
          <span className="text-[10px] font-mono" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {card.expanded
            ? <ChevronUp size={14} style={{ color: "var(--ln-parchment)" }} />
            : <ChevronDown size={14} style={{ color: "var(--ln-parchment)" }} />}
          {total > 1 && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(card.id); }}
              className="p-1 rounded-md hover:bg-white/[0.08] transition-colors ml-1"
              style={{ color: "var(--ln-parchment)" }}
              title="Remove track"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      {card.expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
            {/* Left: audio + metadata */}
            <div className="space-y-3">
              {/* Audio drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); onChange(card.id, { audioDragging: true }); }}
                onDragLeave={() => onChange(card.id, { audioDragging: false })}
                onDrop={handleAudioDrop}
                onClick={() => !card.audioFile && audioInputRef.current?.click()}
                className="relative rounded-xl flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                style={{
                  background: card.audioDragging ? "rgba(196,154,40,0.05)" : "var(--ln-coal)",
                  border: `1.5px dashed ${card.audioDragging
                    ? "rgba(232,223,200,0.6)"
                    : card.audioFile ? "rgba(74,222,128,0.5)" : "#C3AB7D"}`,
                }}
              >
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg,.aac,.m4a,.webm"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 1) {
                      handleAudioFile(files[0]);
                    } else if (files.length > 1) {
                      onAddMultiple(files);
                    }
                    e.target.value = "";
                  }}
                />
                {card.audioStatus === "hashing"
                  ? <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                  : card.audioFile
                    ? <Music size={18} className="flex-shrink-0" style={{ color: "var(--ln-seal-bright)" }} />
                    : <Upload size={18} className="flex-shrink-0" style={{ color: "var(--ln-parchment)" }} />}
                <div className="flex-1 min-w-0">
                  {card.audioFile
                    ? <p className="text-sm truncate" style={{ color: "#FFFFFF" }}>{card.audioFile.name}</p>
                    : <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>Drop audio or click to browse</p>}
                  {card.audioFile && (
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--ln-parchment)" }}>
                      {(card.audioFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
                {card.audioFile && card.audioStatus !== "done" && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onChange(card.id, { audioFile: null, audioStatus: "empty", wid: undefined, fileHash: undefined });
                    }}
                    className="p-1 rounded-md hover:bg-white/[0.08]"
                    style={{ color: "var(--ln-parchment)" }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Upload progress bar — shown during audio upload */}
              {card.audioStatus === "uploading" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]" style={{ color: "rgba(184,168,138,0.8)" }}>
                    <span>Uploading{card.audioFile && card.audioFile.size > 50 * 1024 * 1024 ? ` (${(card.audioFile.size / 1024 / 1024).toFixed(0)} MB — please wait)` : ""}…</span>
                    <span style={{ color: "var(--ln-gold)" }}>{card.uploadProgress ?? 0}%</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: "rgba(196,154,40,0.12)" }}>
                    <div
                      className="h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${card.uploadProgress ?? 0}%`, background: "linear-gradient(90deg, #C49A28, #D4AF37)" }}
                    />
                  </div>
                </div>
              )}

              {/* WID display */}
              {card.wid && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.15)" }}
                >
                  <Fingerprint size={13} style={{ color: "var(--ln-gold)" }} />
                  <span className="text-[11px] font-mono flex-1 truncate" style={{ color: "var(--ln-gold)" }}>
                    {card.wid}
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(card.wid!); toast.success("WID copied"); }}
                    className="p-1 rounded hover:bg-white/[0.08]"
                    style={{ color: "var(--ln-smoke)" }}
                  >
                    <Copy size={11} />
                  </button>
                </div>
              )}

              {/* Title */}
              <Input
                placeholder="Track title"
                value={card.title}
                onChange={e => onChange(card.id, { title: e.target.value })}
                className="h-9 text-sm"
                style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#FFFFFF" }}
              />

              {/* File Type */}
              <div>
                <label className="text-[10px] font-heading tracking-widest uppercase mb-1 block" style={{ color: "rgba(232,223,200,0.6)" }}>File Type</label>
                <Select value={card.fileType} onValueChange={v => onChange(card.id, { fileType: v as TrackCard["fileType"] })}>
                  <SelectTrigger className="h-9 text-xs" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#FFFFFF" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-parchment)" }}>
                    <SelectItem value="full_mix" style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>Full Mix</SelectItem>
                    <SelectItem value="vocal_stem" style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>Vocal Stem</SelectItem>
                    <SelectItem value="instrumental_stem" style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>Instrumental Stem</SelectItem>
                    <SelectItem value="bass_stem" style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>Bass Stem</SelectItem>
                    <SelectItem value="drum_stem" style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>Drum Stem</SelectItem>
                    <SelectItem value="other_stem" style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>Other Stem</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Genre + AI consent */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={card.genre} onValueChange={v => onChange(card.id, { genre: v })}>
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{
                      background: "var(--ln-coal)",
                      border: "1px solid #C49A28",
                      color: card.genre ? "#FFFFFF" : "var(--ln-iron)",
                    }}
                  >
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "#E8DFC8", maxHeight: 220, overflowY: "auto" }}>
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g} style={{ color: "#E8DFC8", fontSize: "12px" }}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={card.aiConsent}
                  onValueChange={v => onChange(card.id, { aiConsent: v as TrackCard["aiConsent"] })}
                >
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#FFFFFF" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-parchment)" }}>
                    {AI_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              {/* Release Date */}
              <div>
                <label className="text-[10px] font-heading tracking-widest uppercase mb-1 block" style={{ color: "#E8DFC8" }}>Original Creation Date</label>
                <Input
                  type="date"
                  value={card.releaseDate}
                  onChange={e => onChange(card.id, { releaseDate: e.target.value })}
                  className="h-9 text-sm"
                  style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: card.releaseDate ? "#FFFFFF" : "var(--ln-iron)", colorScheme: "dark" }}
                />
              </div>

              {/* AI Disclosure */}
              <div>
                <label className="text-[10px] font-heading tracking-widest uppercase mb-2 block" style={{ color: "var(--ln-parchment)" }}>Creation Disclosure</label>
                <div className="flex flex-col gap-1.5">
                  {([
                    { value: "original", label: "Original" },
                    { value: "human_authored_ai_instrument", label: "HAAI" },
                    { value: "ai_assisted", label: "Assisted Manifestation" },
                    { value: "ai_generated", label: "AI-Assisted Manifestation" },
                  ] as const).map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`aiDisclosure-${card.id}`}
                        value={opt.value}
                        checked={card.aiDisclosure === opt.value}
                        onChange={() => onChange(card.id, { aiDisclosure: opt.value })}
                        className="accent-yellow-500"
                      />
                      <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* AI Tool Toggles */}
              {(card.aiDisclosure === "ai_assisted" || card.aiDisclosure === "human_authored_ai_instrument" || card.aiDisclosure === "ai_generated") && (
                <div>
                  <label className="text-[10px] font-heading tracking-widest uppercase mb-2 block" style={{ color: "var(--ln-parchment)" }}>Tools Used</label>
                  <div className="flex flex-col gap-1.5">
                    {([
                      { key: "aiToolSuno" as const, label: "Suno 5+" },
                      { key: "aiToolUdio" as const, label: "Udio" },
                      { key: "aiToolSonato" as const, label: "Sonato" },
                      { key: "aiToolOther" as const, label: "Other" },
                    ]).map(tool => (
                      <label key={tool.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={card[tool.key]}
                          onChange={e => onChange(card.id, { [tool.key]: e.target.checked })}
                          className="accent-yellow-500"
                        />
                        <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{tool.label}</span>
                      </label>
                    ))}
                    {card.aiToolOther && (
                      <Input
                        placeholder="Name the tool"
                        value={card.aiToolOtherName}
                        onChange={e => onChange(card.id, { aiToolOtherName: e.target.value })}
                        className="h-8 text-xs mt-1"
                        style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#FFFFFF" }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

              {/* Lyrics section */}
              <div>
                <button
                  type="button"
                  onClick={() => onChange(card.id, { lyricsExpanded: !card.lyricsExpanded })}
                  className="flex items-center gap-2 text-[10px] font-heading tracking-widest uppercase transition-colors hover:opacity-80"
                  style={{ color: card.lyricsText.trim() ? "var(--ln-gold)" : "var(--ln-parchment)" }}
                >
                  {card.lyricsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  Lyrics
                  {card.lyricsText.trim() && (
                    <span className="text-[9px] font-mono ml-1" style={{ color: "rgba(196,154,40,0.7)" }}>
                      {card.lyricsText.trim().split(/\s+/).length}w
                    </span>
                  )}
                </button>
                {card.lyricsExpanded && (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      value={card.lyricsText}
                      onChange={e => onChange(card.id, { lyricsText: e.target.value })}
                      placeholder="Paste lyrics here — a WID-LYR will be generated automatically on upload..."
                      rows={6}
                      className="w-full text-xs rounded-lg px-3 py-2 resize-y font-mono leading-relaxed"
                      style={{
                        background: "var(--ln-coal)",
                        border: "1px solid rgba(196,154,40,0.4)",
                        color: "#FFFFFF",
                        outline: "none",
                        minHeight: 96,
                      }}
                    />
                    {card.lyricsText.trim() && (
                      <p className="text-[9px]" style={{ color: "rgba(196,154,40,0.6)" }}>
                        WID-LYR will be generated server-side and tied to this track's WID on upload.
                      </p>
                    )}
                  </div>
                )}
              </div>
          </div>

            {/* Right: per-track cover art */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>
                Cover Art
              </p>
              <div
                onDragOver={e => { e.preventDefault(); onChange(card.id, { coverDragging: true }); }}
                onDragLeave={() => onChange(card.id, { coverDragging: false })}
                onDrop={handleCoverDrop}
                onClick={() => coverInputRef.current?.click()}
                className="relative rounded-xl overflow-hidden cursor-pointer transition-all flex-1"
                style={{
                  minHeight: 120,
                  background: card.coverPreview ? "transparent" : "var(--ln-coal)",
                  border: `1.5px dashed ${card.coverDragging
                    ? "rgba(232,223,200,0.6)"
                    : card.coverPreview ? "rgba(74,222,128,0.4)" : "#C3AB7D"}`,
                }}
              >
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverFile(file);
                    e.target.value = "";
                  }}
                />
                {card.coverPreview ? (
                  <>
                    <img src={card.coverPreview} alt="Cover" className="w-full h-full object-cover absolute inset-0" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <ImageIcon size={20} className="text-white" />
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onChange(card.id, { coverFile: null, coverPreview: null, coverUrl: undefined });
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(44,52,56,0.8)" }}
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <ImageIcon size={20} style={{ color: "var(--ln-smoke)" }} />
                    <p className="text-[9px] text-center px-2" style={{ color: "var(--ln-parchment)" }}>
                      {card.coverDragging ? "Drop image" : "Drop or click"}
                    </p>
                  </div>
                )}
              </div>
              {!card.coverPreview && (
                <p className="text-[9px] text-center" style={{ color: "var(--ln-smoke)" }}>
                  Falls back to album art
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BatchUploadPage() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [albumName, setAlbumName] = useState("");
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [albumCoverPreview, setAlbumCoverPreview] = useState<string | null>(null);
  const [albumCoverUrl, setAlbumCoverUrl] = useState<string | undefined>();

  const [batchFillOpen, setBatchFillOpen] = useState(false);
  const [batchGenre, setBatchGenre] = useState("");
  const [batchAiConsent, setBatchAiConsent] = useState<TrackCard["aiConsent"]>("prohibited");

  // Album-level sketch options
  const [albumArtAcrossAll, setAlbumArtAcrossAll] = useState(true);
  const [albumArtIsAi, setAlbumArtIsAi] = useState(false);
  const [batchReleaseDate, setBatchReleaseDate] = useState("");
  const [batchAiDisclosure, setBatchAiDisclosure] = useState<TrackCard["aiDisclosure"]>("original");
  const [batchAiToolSuno, setBatchAiToolSuno] = useState(false);
  const [batchAiToolUdio, setBatchAiToolUdio] = useState(false);
  const [batchAiToolSonato, setBatchAiToolSonato] = useState(false);
  const [batchAiToolOther, setBatchAiToolOther] = useState(false);
  const [batchAiToolOtherName, setBatchAiToolOtherName] = useState("");

  const [cards, setCards] = useState<TrackCard[]>([makeEmptyCard()]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
  const globalDropRef = useRef<HTMLDivElement>(null);
  const albumCoverRef = useRef<HTMLInputElement>(null);

  const [collectionResult, setCollectionResult] = useState<{
    collectionId: number;
    collectionWid: string;
    collectiveHash: string;
    trackCount: number;
  } | null>(null);

  const batchUpload = trpc.songs.batchUpload.useMutation();

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p style={{ color: "var(--ln-smoke)" }}>Sign in to register music</p>
        <Button
          onClick={() => { window.location.href = getLoginUrl("/batch-upload"); }}
          style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
        >
          Sign In
        </Button>
      </div>
    );
  }

  const updateCard = useCallback((id: string, patch: Partial<TrackCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const addCard = () => setCards(prev => [...prev, makeEmptyCard({ expanded: true })]);

  const generateWID = useCallback(async (cardId: string, file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      // Non-blocking duplicate check
      try {
        const dupRes = await fetch(`/api/trpc/songs.checkDuplicate?input=${encodeURIComponent(JSON.stringify({ fileHash }))}`, { credentials: "include" });
        if (dupRes.ok) {
          const dupJson = await dupRes.json();
          const dupCheck = dupJson?.result?.data as { duplicate: boolean; isOwnWork?: boolean; existingTitle?: string; existingWid?: string; existingCreator?: string } | undefined;
          if (dupCheck?.duplicate) {
            const msg = dupCheck.isOwnWork
              ? `"${file.name}" already exists in your archive as "${dupCheck.existingTitle}".`
              : `"${file.name}" matches a file registered by ${dupCheck.existingCreator} ("${dupCheck.existingTitle}").`;
            toast.warning(msg, { duration: 7000 });
          }
        }
      } catch { /* advisory */ }
      const wid = formatWID(fileHash);
      const harmonicSignature = deriveHarmonicFrequencies(fileHash);
      const keypair = await generateECDSAKeypair();
      const ecdsaPublicKey = await exportPublicKeyJWK(keypair.publicKey);
      const payload = JSON.stringify({ wid, fileHash, timestamp: Date.now() });
      const ecdsaSignature = await signPayload(keypair.privateKey, payload);
      setCards(p => p.map(c => c.id === cardId ? {
        ...c, audioStatus: "ready", wid, fileHash, harmonicSignature, ecdsaPublicKey, ecdsaSignature,
      } : c));
    } catch {
      setCards(p => p.map(c =>
        c.id === cardId ? { ...c, audioStatus: "error", errorMsg: "WID generation failed" } : c
      ));
    }
  }, []);

  const handleAddMultiple = useCallback((files: File[]) => {
    const audioFiles = files.filter(
      f => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a|webm)$/i.test(f.name)
    );
    if (!audioFiles.length) { toast.error("No audio files found"); return; }
    const newCards: TrackCard[] = audioFiles.map(file => makeEmptyCard({
      audioFile: file,
      title: stripTrackPrefix(file.name.replace(/\.[^.]+$/, "")),
      audioStatus: "hashing",
    }));
    setCards(prev => {
      const filled = prev.filter(c => c.audioFile !== null);
      return [...filled, ...newCards];
    });
    newCards.forEach(c => generateWID(c.id, c.audioFile!));
    toast.success(`Added ${audioFiles.length} track${audioFiles.length > 1 ? "s" : ""}`);
  }, [generateWID]);

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGlobal(false);
    const audioFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a|webm)$/i.test(f.name)
    );
    if (!audioFiles.length) { toast.error("No audio files found"); return; }
    const newCards: TrackCard[] = audioFiles.map(file => makeEmptyCard({
      audioFile: file,
      title: stripTrackPrefix(file.name.replace(/\.[^.]+$/, "")),
      audioStatus: "hashing",
    }));
    setCards(prev => {
      const filled = prev.filter(c => c.audioFile !== null);
      return [...filled, ...newCards];
    });
    newCards.forEach(c => generateWID(c.id, c.audioFile!));
    toast.success(`Added ${audioFiles.length} track${audioFiles.length > 1 ? "s" : ""}`);
  }, [generateWID]);

  const applyBatchFill = () => {
    setCards(prev => prev.map(c => ({
      ...c,
      genre: batchGenre || c.genre,
      aiConsent: batchAiConsent,
      releaseDate: batchReleaseDate || c.releaseDate,
      aiDisclosure: batchAiDisclosure,
      aiToolSuno: batchAiToolSuno,
      aiToolUdio: batchAiToolUdio,
      aiToolSonato: batchAiToolSonato,
      aiToolOther: batchAiToolOther,
      aiToolOtherName: batchAiToolOtherName,
    })));
    toast.success("Batch fill applied to all tracks");
    setBatchFillOpen(false);
  };

  const repeatDisclosureAcrossAll = () => {
    setCards(prev => prev.map(c => ({
      ...c,
      aiDisclosure: batchAiDisclosure,
      aiToolSuno: batchAiToolSuno,
      aiToolUdio: batchAiToolUdio,
      aiToolSonato: batchAiToolSonato,
      aiToolOther: batchAiToolOther,
      aiToolOtherName: batchAiToolOtherName,
    })));
    toast.success("AI disclosure repeated across all tracks");
  };

  const handleSubmit = async () => {
    if (!albumName.trim()) { toast.error("Album / collection name is required"); return; }
    const readyCards = cards.filter(c => c.audioStatus === "ready" && c.audioFile);
    if (!readyCards.length) { toast.error("No tracks ready — wait for WID generation"); return; }
    setIsUploading(true);
    try {
      let resolvedAlbumCoverUrl = albumCoverUrl;
      if (albumCoverFile && !resolvedAlbumCoverUrl) {
        toast.loading("Uploading album cover...", { id: "album-cover" });
        const { url } = await uploadFileToS3(albumCoverFile, "cover");
        resolvedAlbumCoverUrl = url;
        setAlbumCoverUrl(url);
        toast.dismiss("album-cover");
      }

      const trackPayloads: {
        fileUrl: string; fileKey: string; coverArtUrl?: string;
        title: string; genre?: string; aiConsent: TrackCard["aiConsent"];
        fileHash?: string; witnessId?: string;
        harmonicSignature?: number[]; ecdsaPublicKey?: string; ecdsaSignature?: string;
        releaseDate?: string;
        aiDisclosure?: TrackCard["aiDisclosure"];
        aiToolSuno?: boolean; aiToolUdio?: boolean; aiToolSonato?: boolean;
        aiToolOther?: boolean; aiToolOtherName?: string;
        fileType?: string;
        lyricsText?: string;
      }[] = [];

      for (const card of readyCards) {
        updateCard(card.id, { audioStatus: "uploading", uploadProgress: 0 });
        const { url: audioUrl, key: audioKey } = await uploadFileToS3(
          card.audioFile!,
          "audio",
          (pct) => updateCard(card.id, { uploadProgress: pct })
        );
        let trackCoverUrl: string | undefined;
        if (card.coverFile) {
          const { url } = await uploadFileToS3(card.coverFile, "cover");
          trackCoverUrl = url;
          updateCard(card.id, { coverUrl: url });
        }
        trackPayloads.push({
          fileUrl: audioUrl, fileKey: audioKey,
          coverArtUrl: trackCoverUrl,
          title: card.title || card.audioFile!.name.replace(/\.[^.]+$/, ""),
          genre: card.genre || undefined,
          aiConsent: card.aiConsent,
          fileHash: card.fileHash,
          witnessId: card.wid,
          harmonicSignature: card.harmonicSignature,
          ecdsaPublicKey: card.ecdsaPublicKey,
          ecdsaSignature: card.ecdsaSignature,
          // New provenance fields from batch upload sketch
          releaseDate: card.releaseDate || undefined,
          aiDisclosure: card.aiDisclosure,
          aiToolSuno: card.aiToolSuno,
          aiToolUdio: card.aiToolUdio,
          aiToolSonato: card.aiToolSonato,
          aiToolOther: card.aiToolOther,
          aiToolOtherName: card.aiToolOtherName || undefined,
          fileType: card.fileType,
          lyricsText: card.lyricsText.trim() || undefined,
        });
      }

      const result = await batchUpload.mutateAsync({
        albumName: albumName.trim(),
        genre: batchGenre || undefined,
        aiConsent: batchAiConsent,
        coverArtUrl: resolvedAlbumCoverUrl,
        tracks: trackPayloads,
      });

      readyCards.forEach(c => updateCard(c.id, { audioStatus: "done" }));
      const trackCount = result.trackCount ?? result.results?.length ?? readyCards.length;
      setCollectionResult({
        collectionId: result.collectionId ?? 0,
        collectionWid: result.collectionWid ?? "",
        collectiveHash: result.collectiveHash ?? "",
        trackCount,
      });
      toast.success(`${trackCount} track${trackCount > 1 ? "s" : ""} witnessed and archived`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
      setCards(p => p.map(c =>
        c.audioStatus === "uploading" ? { ...c, audioStatus: "error", errorMsg: "Upload failed" } : c
      ));
    } finally {
      setIsUploading(false);
    }
  };

  const readyCount = cards.filter(c => c.audioStatus === "ready").length;
  const totalFilled = cards.filter(c => c.audioFile !== null).length;

  // ── Collection result screen ──────────────────────────────────────────────
  if (collectionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
            style={{ background: "rgba(58,138,86,0.15)", border: "2px solid rgba(74,222,128,0.4)" }}
          >
            <CheckCircle size={32} style={{ color: "var(--ln-seal-bright)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>
            Collection Witnessed
          </h1>
          <p style={{ color: "var(--ln-smoke)" }}>
            {collectionResult.trackCount} track{collectionResult.trackCount > 1 ? "s" : ""} registered to the Living Nexus Archive
          </p>
        </div>
        <div className="p-6 space-y-4" style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-parchment)" }}>
          <div>
            <p className="text-[10px] font-heading tracking-widest uppercase mb-1" style={{ color: "var(--ln-parchment)" }}>
              Collection WID
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono" style={{ color: "var(--ln-gold)" }}>{collectionResult.collectionWid}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(collectionResult.collectionWid); toast.success("Copied"); }}
                className="p-1 rounded hover:bg-white/[0.06]"
                style={{ color: "var(--ln-smoke)" }}
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-heading tracking-widest uppercase mb-1" style={{ color: "var(--ln-parchment)" }}>
              Collective Hash
            </p>
            <p className="text-xs font-mono break-all" style={{ color: "var(--ln-parchment)" }}>
              {collectionResult.collectiveHash}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/archive")}
            className="flex-1 gap-2"
            style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
          >
            <Library size={16} /> View Archive
          </Button>
          <Button
            onClick={() => navigate(`/verify/${collectionResult.collectionWid}`)}
            variant="outline"
            className="flex-1 gap-2"
            style={{ border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
          >
            <ExternalLink size={16} /> Verify Collection
          </Button>
          <Button
            onClick={() => {
              setCollectionResult(null);
              setCards([makeEmptyCard()]);
              setAlbumName("");
              setAlbumCoverFile(null);
              setAlbumCoverPreview(null);
              setAlbumCoverUrl(undefined);
            }}
            variant="outline"
            className="flex-1 gap-2"
            style={{ border: "1px solid #C3AB7D", color: "var(--ln-smoke)" }}
          >
            <Upload size={16} /> New Batch
          </Button>
        </div>
      </div>
    );
  }

  // ── Main upload UI ────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-3xl mx-auto px-4 py-8 space-y-6"
      ref={globalDropRef}
      onDragOver={e => { e.preventDefault(); setIsDraggingGlobal(true); }}
      onDragLeave={e => {
        if (!globalDropRef.current?.contains(e.relatedTarget as Node)) setIsDraggingGlobal(false);
      }}
      onDrop={handleGlobalDrop}
    >
      {/* Global drag overlay */}
      {isDraggingGlobal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(44,52,56,0.85)", backdropFilter: "blur(4px)" }}
        >
          <div className="text-center space-y-3">
            <Upload size={48} style={{ color: "var(--ln-gold)", margin: "0 auto" }} />
            <p className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>
              Drop all audio files here
            </p>
            <p style={{ color: "var(--ln-smoke)" }}>Each file gets its own track card</p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Layers size={20} style={{ color: "var(--ln-gold)" }} />
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>
            Batch Register
          </h1>
          <Badge
            className="text-[9px] font-mono"
            style={{
              background: "rgba(196,154,40,0.08)",
              color: "var(--ln-gold)",
              border: "1px solid rgba(196,154,40,0.25)",
            }}
          >
            {totalFilled}/{cards.length} tracks
          </Badge>
        </div>
        <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>
          Each track gets its own cover art, WID, and metadata. Drop multiple files anywhere to auto-fill cards.
        </p>
      </div>

      {/* Album info */}
      <div
        className="p-4 space-y-3"
        style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-parchment)" }}
      >
        <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>
          Collection / Album
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
          <div className="space-y-2">
            <Input
              placeholder="Album or collection name *"
              value={albumName}
              onChange={e => setAlbumName(e.target.value)}
              className="h-10"
              style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#FFFFFF" }}
            />
            <p className="text-[10px]" style={{ color: "var(--ln-parchment)" }}>
              Shared collection name. Individual tracks can override genre and AI consent below.
            </p>
          </div>
          {/* Album cover */}
          <div
            onClick={() => albumCoverRef.current?.click()}
            className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              minHeight: 80,
              background: albumCoverPreview ? "transparent" : "var(--ln-coal)",
              border: `1.5px dashed ${albumCoverPreview ? "rgba(74,222,128,0.4)" : "#C3AB7D"}`,
            }}
          >
            <input
              ref={albumCoverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setAlbumCoverFile(file);
                const reader = new FileReader();
                reader.onload = ev => setAlbumCoverPreview(ev.target?.result as string);
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            {albumCoverPreview ? (
              <>
                <img src={albumCoverPreview} alt="Album cover" className="w-full h-full object-cover absolute inset-0" />
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setAlbumCoverFile(null);
                    setAlbumCoverPreview(null);
                    setAlbumCoverUrl(undefined);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(44,52,56,0.8)" }}
                >
                  <X size={10} className="text-white" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <ImageIcon size={18} style={{ color: "var(--ln-smoke)" }} />
                <p className="text-[9px]" style={{ color: "var(--ln-parchment)" }}>Album art</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Album-level sketch options */}
      <div
        className="p-4 space-y-3"
        style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-parchment)" }}
      >
        <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>Album Options</p>
        <div className="flex flex-wrap gap-6">
          {/* Album Art Across All */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setAlbumArtAcrossAll(v => !v)}
              className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: albumArtAcrossAll ? "#C49A28" : "#3a3a3a" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: albumArtAcrossAll ? "translateX(22px)" : "translateX(2px)" }}
              />
            </div>
            <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>Album Art Across All</span>
          </label>
          {/* Album Art AI/Original */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setAlbumArtIsAi(v => !v)}
              className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: albumArtIsAi ? "#C49A28" : "#3a3a3a" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: albumArtIsAi ? "translateX(22px)" : "translateX(2px)" }}
              />
            </div>
            <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>
              Album Art: <span style={{ color: albumArtIsAi ? "#C49A28" : "#4ade80" }}>{albumArtIsAi ? "AI" : "Original"}</span>
            </span>
          </label>
        </div>
      </div>

      {/* Batch fill panel */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-parchment)" }}
      >
        <button
          onClick={() => setBatchFillOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        >
          <Sparkles size={15} style={{ color: "var(--ln-gold)" }} />
          <span className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>Batch Fill</span>
          <span className="text-xs ml-1" style={{ color: "var(--ln-parchment)" }}>
            — push shared values to all tracks
          </span>
          <div className="ml-auto">
            {batchFillOpen
              ? <ChevronUp size={14} style={{ color: "var(--ln-parchment)" }} />
              : <ChevronDown size={14} style={{ color: "var(--ln-parchment)" }} />}
          </div>
        </button>
        {batchFillOpen && (
          <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--ln-gold)" }}>
            <p className="text-[10px] pt-3" style={{ color: "var(--ln-parchment)" }}>
              Set values here, then click Apply — they will be pushed to every track card. Individual cards can still be edited after.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] mb-1 font-heading tracking-widest uppercase" style={{ color: "#E8DFC8" }}>Original Creation Date</p>
                <Input
                  type="date"
                  value={batchReleaseDate}
                  onChange={e => setBatchReleaseDate(e.target.value)}
                  className="h-9 text-xs"
                  style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: batchReleaseDate ? "#FFFFFF" : "var(--ln-iron)", colorScheme: "dark" }}
                />
              </div>
              <div>
                <p className="text-[10px] mb-1 font-heading tracking-widest uppercase" style={{ color: "#E8DFC8" }}>Genre</p>
                <Select value={batchGenre} onValueChange={setBatchGenre}>
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{
                      background: "var(--ln-coal)",
                      border: "1px solid #C49A28",
                      color: batchGenre ? "#FFFFFF" : "var(--ln-parchment)",
                    }}
                  >
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "#E8DFC8", maxHeight: 220, overflowY: "auto" }}>
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g} style={{ color: "#E8DFC8", fontSize: "12px" }}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[10px] mb-1 font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>Training Consent</p>
                <Select value={batchAiConsent} onValueChange={v => setBatchAiConsent(v as TrackCard["aiConsent"])}>
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#FFFFFF" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0A0A0A", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-parchment)" }}>
                    {AI_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} style={{ color: "var(--ln-parchment)", fontSize: "12px" }}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Creation Disclosure batch */}
            <div className="border-t pt-3" style={{ borderColor: "rgba(196,154,40,0.2)" }}>
              <p className="text-[10px] mb-2 font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>Creation Disclosure (Repeat Across Tracks)</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {([
                  { value: "original", label: "Original" },
                  { value: "human_authored_ai_instrument", label: "HAAI" },
                  { value: "ai_assisted", label: "Assisted Manifestation" },
                  { value: "ai_generated", label: "AI-Assisted Manifestation" },
                ] as const).map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="batchAiDisclosure"
                      value={opt.value}
                      checked={batchAiDisclosure === opt.value}
                      onChange={() => setBatchAiDisclosure(opt.value)}
                      className="accent-yellow-500"
                    />
                    <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{opt.label}</span>
                  </label>
                ))}
              </div>
              {(batchAiDisclosure === "ai_assisted" || batchAiDisclosure === "human_authored_ai_instrument" || batchAiDisclosure === "ai_generated") && (
                <div className="flex flex-wrap gap-3 mb-2">
                  {([
                    { key: "batchAiToolSuno" as const, setter: setBatchAiToolSuno, val: batchAiToolSuno, label: "Suno 5+" },
                    { key: "batchAiToolUdio" as const, setter: setBatchAiToolUdio, val: batchAiToolUdio, label: "Udio" },
                    { key: "batchAiToolSonato" as const, setter: setBatchAiToolSonato, val: batchAiToolSonato, label: "Sonato" },
                    { key: "batchAiToolOther" as const, setter: setBatchAiToolOther, val: batchAiToolOther, label: "Other" },
                  ]).map(tool => (
                    <label key={tool.key} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={tool.val} onChange={e => tool.setter(e.target.checked)} className="accent-yellow-500" />
                      <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{tool.label}</span>
                    </label>
                  ))}
                  {batchAiToolOther && (
                    <Input
                      placeholder="Name the tool"
                      value={batchAiToolOtherName}
                      onChange={e => setBatchAiToolOtherName(e.target.value)}
                      className="h-7 text-xs w-full"
                      style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "#FFFFFF" }}
                    />
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={applyBatchFill}
              size="sm"
              className="gap-2"
              style={{
                background: "rgba(196,154,40,0.08)",
                color: "var(--ln-gold)",
                border: "1px solid rgba(196,154,40,0.25)",
              }}
            >
              <Sparkles size={13} /> Apply All to Tracks
            </Button>
          </div>
        )}
      </div>

      {/* Track cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>
            Tracks — {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
          {readyCount > 0 && (
            <Badge
              className="text-[9px]"
              style={{
                background: "rgba(58,138,86,0.15)",
                color: "var(--ln-seal-bright)",
                border: "1px solid rgba(58,138,86,0.3)",
              }}
            >
              {readyCount} ready
            </Badge>
          )}
        </div>

        {cards.map((card, i) => (
          <TrackCardUI
            key={card.id}
            card={card}
            index={i}
            total={cards.length}
            onChange={updateCard}
            onRemove={removeCard}
            onGenerateWid={generateWID}
            onAddMultiple={handleAddMultiple}
          />
        ))}

        {/* Add track button */}
        <button
          onClick={addCard}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all hover:bg-white/[0.04]"
          style={{ border: "1.5px dashed rgba(196,154,40,0.18)", color: "var(--ln-parchment)" }}
        >
          <Plus size={16} />
          <span className="text-sm">Add Track</span>
        </button>
      </div>

      {/* Sticky submit bar */}
      <div
        className="sticky bottom-4 p-4 flex items-center gap-4"
        style={{
          background: "rgba(44,52,56,0.95)",
          border: "1px solid rgba(196,154,40,0.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
            {readyCount > 0
              ? `${readyCount} track${readyCount > 1 ? "s" : ""} ready to witness`
              : "Add audio files to begin"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--ln-parchment)" }}>
            {albumName ? `"${albumName}"` : "Set a collection name above"}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isUploading || readyCount === 0 || !albumName.trim()}
          className="gap-2 px-6"
          style={{
            background: readyCount > 0 && albumName.trim() ? "var(--ln-gold)" : "#C3AB7D",
            color: readyCount > 0 && albumName.trim() ? "var(--ln-coal)" : "var(--ln-iron)",
          }}
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
          {isUploading
            ? "Witnessing..."
            : `Witness ${readyCount > 0 ? readyCount : ""} Track${readyCount !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}
