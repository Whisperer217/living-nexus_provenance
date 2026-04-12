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
function formatWID(hashHex: string): string {
  return `WID-MUS-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const GENRES = [
  "Gospel", "Classical", "Rock", "Hip-Hop", "Electronic", "R&B", "Ambient",
  "Jazz", "Folk", "Pop", "Metal", "Country", "Blues", "Soul", "Reggae",
  "Latin", "World", "Spoken Word", "Other",
];
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
}

function makeEmptyCard(overrides?: Partial<TrackCard>): TrackCard {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
async function uploadFileToS3(file: File, type: "audio" | "cover"): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", type);
  formData.append("filename", file.name);
  const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `Upload failed (${res.status})`);
  }
  return res.json() as Promise<{ url: string; key: string }>;
}

// ── TrackCard component ───────────────────────────────────────────────────────
function TrackCardUI({
  card, index, total, onChange, onRemove, onGenerateWid,
}: {
  card: TrackCard;
  index: number;
  total: number;
  onChange: (id: string, patch: Partial<TrackCard>) => void;
  onRemove: (id: string) => void;
  onGenerateWid: (id: string, file: File) => void;
}) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAudioFile = (file: File) => {
    const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim();
    onChange(card.id, { audioFile: file, title: card.title || title, audioStatus: "hashing" });
    onGenerateWid(card.id, file);
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
    empty: "oklch(0.35 0.02 280)",
    hashing: "oklch(0.75 0.12 85)",
    ready: "oklch(0.65 0.18 160)",
    uploading: "oklch(0.75 0.12 85)",
    done: "oklch(0.65 0.18 160)",
    error: "oklch(0.65 0.22 25)",
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
        background: "oklch(0.125 0.028 52)",
        border: `1px solid ${card.audioStatus === "done" ? "oklch(0.65 0.18 160 / 0.5)" : "#4A2C2A"}`,
      }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ background: "oklch(0.10 0.04 270 / 60%)" }}
        onClick={() => onChange(card.id, { expanded: !card.expanded })}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: "oklch(0.84 0.155 85 / 0.15)", color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: card.title ? "#FFFFFF" : "oklch(0.72 0.04 280)", fontFamily: "'Cinzel', serif" }}
          >
            {card.title || "Untitled Track"}
          </p>
          {card.wid && (
            <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: "oklch(0.84 0.155 85 / 0.7)" }}>
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
            ? <ChevronUp size={14} style={{ color: "oklch(0.72 0.04 280)" }} />
            : <ChevronDown size={14} style={{ color: "oklch(0.72 0.04 280)" }} />}
          {total > 1 && (
            <button
              onClick={e => { e.stopPropagation(); onRemove(card.id); }}
              className="p-1 rounded-md hover:bg-white/[0.08] transition-colors ml-1"
              style={{ color: "oklch(0.72 0.04 280)" }}
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
                  background: card.audioDragging ? "oklch(0.84 0.155 85 / 0.08)" : "oklch(0.09 0.03 270)",
                  border: `1.5px dashed ${card.audioDragging
                    ? "oklch(0.84 0.155 85 / 0.7)"
                    : card.audioFile ? "oklch(0.65 0.18 160 / 0.5)" : "#5C3530"}`,
                }}
              >
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.flac,.ogg,.aac,.m4a,.webm"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleAudioFile(file);
                    e.target.value = "";
                  }}
                />
                {card.audioStatus === "hashing"
                  ? <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: "oklch(0.84 0.155 85)" }} />
                  : card.audioFile
                    ? <Music size={18} className="flex-shrink-0" style={{ color: "oklch(0.65 0.18 160)" }} />
                    : <Upload size={18} className="flex-shrink-0" style={{ color: "oklch(0.72 0.04 280)" }} />}
                <div className="flex-1 min-w-0">
                  {card.audioFile
                    ? <p className="text-sm truncate" style={{ color: "#FFFFFF" }}>{card.audioFile.name}</p>
                    : <p className="text-sm" style={{ color: "oklch(0.78 0.04 280)" }}>Drop audio or click to browse</p>}
                  {card.audioFile && (
                    <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.72 0.04 280)" }}>
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
                    style={{ color: "oklch(0.72 0.04 280)" }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* WID display */}
              {card.wid && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "oklch(0.84 0.155 85 / 0.06)", border: "1px solid oklch(0.84 0.155 85 / 0.2)" }}
                >
                  <Fingerprint size={13} style={{ color: "oklch(0.84 0.155 85)" }} />
                  <span className="text-[11px] font-mono flex-1 truncate" style={{ color: "oklch(0.84 0.155 85)" }}>
                    {card.wid}
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(card.wid!); toast.success("WID copied"); }}
                    className="p-1 rounded hover:bg-white/[0.08]"
                    style={{ color: "oklch(0.6 0.04 280)" }}
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
                style={{ background: "oklch(0.09 0.03 270)", border: "1px solid #4A2C2A", color: "#FFFFFF" }}
              />

              {/* Genre + AI consent */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={card.genre} onValueChange={v => onChange(card.id, { genre: v })}>
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{
                      background: "oklch(0.09 0.03 270)",
                      border: "1px solid #4A2C2A",
                      color: card.genre ? "#FFFFFF" : "oklch(0.4 0.02 280)",
                    }}
                  >
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent style={{ background: "oklch(0.14 0.015 280)", border: "1px solid #4A2C2A" }}>
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g} className="text-xs" style={{ color: "#FFFFFF" }}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={card.aiConsent}
                  onValueChange={v => onChange(card.id, { aiConsent: v as TrackCard["aiConsent"] })}
                >
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{ background: "oklch(0.09 0.03 270)", border: "1px solid #4A2C2A", color: "#FFFFFF" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "oklch(0.14 0.015 280)", border: "1px solid #4A2C2A" }}>
                    {AI_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs" style={{ color: "#FFFFFF" }}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right: per-track cover art */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "oklch(0.72 0.04 280)" }}>
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
                  background: card.coverPreview ? "transparent" : "oklch(0.09 0.03 270)",
                  border: `1.5px dashed ${card.coverDragging
                    ? "oklch(0.84 0.155 85 / 0.7)"
                    : card.coverPreview ? "oklch(0.65 0.18 160 / 0.4)" : "#5C3530"}`,
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
                      style={{ background: "oklch(0.10 0.04 270 / 80%)" }}
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <ImageIcon size={20} style={{ color: "oklch(0.65 0.04 280)" }} />
                    <p className="text-[9px] text-center px-2" style={{ color: "oklch(0.72 0.04 280)" }}>
                      {card.coverDragging ? "Drop image" : "Drop or click"}
                    </p>
                  </div>
                )}
              </div>
              {!card.coverPreview && (
                <p className="text-[9px] text-center" style={{ color: "oklch(0.68 0.04 280)" }}>
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
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Sign in to upload music</p>
        <Button
          onClick={() => { window.location.href = getLoginUrl("/batch-upload"); }}
          style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.02 280)" }}
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

  const handleGlobalDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGlobal(false);
    const audioFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a|webm)$/i.test(f.name)
    );
    if (!audioFiles.length) { toast.error("No audio files found"); return; }
    const newCards: TrackCard[] = audioFiles.map(file => makeEmptyCard({
      audioFile: file,
      title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim(),
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
    })));
    toast.success("Batch fill applied to all tracks");
    setBatchFillOpen(false);
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
      }[] = [];

      for (const card of readyCards) {
        updateCard(card.id, { audioStatus: "uploading" });
        const { url: audioUrl, key: audioKey } = await uploadFileToS3(card.audioFile!, "audio");
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
            style={{ background: "oklch(0.65 0.18 160 / 0.15)", border: "2px solid oklch(0.65 0.18 160 / 0.4)" }}
          >
            <CheckCircle size={32} style={{ color: "oklch(0.65 0.18 160)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>
            Collection Witnessed
          </h1>
          <p style={{ color: "oklch(0.6 0.04 280)" }}>
            {collectionResult.trackCount} track{collectionResult.trackCount > 1 ? "s" : ""} registered to the Living Nexus Archive
          </p>
        </div>
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "oklch(0.125 0.028 52)", border: "1px solid #4A2C2A" }}>
          <div>
            <p className="text-[10px] font-heading tracking-widest uppercase mb-1" style={{ color: "oklch(0.72 0.04 280)" }}>
              Collection WID
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono" style={{ color: "oklch(0.84 0.155 85)" }}>{collectionResult.collectionWid}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(collectionResult.collectionWid); toast.success("Copied"); }}
                className="p-1 rounded hover:bg-white/[0.06]"
                style={{ color: "oklch(0.6 0.04 280)" }}
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-heading tracking-widest uppercase mb-1" style={{ color: "oklch(0.72 0.04 280)" }}>
              Collective Hash
            </p>
            <p className="text-xs font-mono break-all" style={{ color: "oklch(0.78 0.04 280)" }}>
              {collectionResult.collectiveHash}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/archive")}
            className="flex-1 gap-2"
            style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.02 280)" }}
          >
            <Library size={16} /> View Archive
          </Button>
          <Button
            onClick={() => navigate(`/verify/${collectionResult.collectionWid}`)}
            variant="outline"
            className="flex-1 gap-2"
            style={{ border: "1px solid oklch(0.84 0.155 85 / 0.4)", color: "oklch(0.84 0.155 85)" }}
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
            style={{ border: "1px solid #5C3530", color: "oklch(0.6 0.04 280)" }}
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
          style={{ background: "oklch(0.08 0.04 270 / 85%)", backdropFilter: "blur(4px)" }}
        >
          <div className="text-center space-y-3">
            <Upload size={48} style={{ color: "oklch(0.84 0.155 85)", margin: "0 auto" }} />
            <p className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>
              Drop all audio files here
            </p>
            <p style={{ color: "oklch(0.6 0.04 280)" }}>Each file gets its own track card</p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Layers size={20} style={{ color: "oklch(0.84 0.155 85)" }} />
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "#FFFFFF" }}>
            Batch Upload
          </h1>
          <Badge
            className="text-[9px] font-mono"
            style={{
              background: "oklch(0.84 0.155 85 / 0.15)",
              color: "oklch(0.84 0.155 85)",
              border: "1px solid oklch(0.84 0.155 85 / 0.3)",
            }}
          >
            {totalFilled}/{cards.length} tracks
          </Badge>
        </div>
        <p className="text-sm" style={{ color: "oklch(0.78 0.04 280)" }}>
          Each track gets its own cover art, WID, and metadata. Drop multiple files anywhere to auto-fill cards.
        </p>
      </div>

      {/* Album info */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "oklch(0.125 0.028 52)", border: "1px solid #4A2C2A" }}
      >
        <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "oklch(0.72 0.04 280)" }}>
          Collection / Album
        </p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
          <div className="space-y-2">
            <Input
              placeholder="Album or collection name *"
              value={albumName}
              onChange={e => setAlbumName(e.target.value)}
              className="h-10"
              style={{ background: "oklch(0.09 0.03 270)", border: "1px solid #4A2C2A", color: "#FFFFFF" }}
            />
            <p className="text-[10px]" style={{ color: "oklch(0.72 0.04 280)" }}>
              Shared collection name. Individual tracks can override genre and AI consent below.
            </p>
          </div>
          {/* Album cover */}
          <div
            onClick={() => albumCoverRef.current?.click()}
            className="relative rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              minHeight: 80,
              background: albumCoverPreview ? "transparent" : "oklch(0.09 0.03 270)",
              border: `1.5px dashed ${albumCoverPreview ? "oklch(0.65 0.18 160 / 0.4)" : "#5C3530"}`,
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
                  style={{ background: "oklch(0.10 0.04 270 / 80%)" }}
                >
                  <X size={10} className="text-white" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <ImageIcon size={18} style={{ color: "oklch(0.65 0.04 280)" }} />
                <p className="text-[9px]" style={{ color: "oklch(0.72 0.04 280)" }}>Album art</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch fill panel */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "oklch(0.125 0.028 52)", border: "1px solid #4A2C2A" }}
      >
        <button
          onClick={() => setBatchFillOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        >
          <Sparkles size={15} style={{ color: "oklch(0.84 0.155 85)" }} />
          <span className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>Batch Fill</span>
          <span className="text-xs ml-1" style={{ color: "oklch(0.75 0.04 280)" }}>
            — push shared values to all tracks
          </span>
          <div className="ml-auto">
            {batchFillOpen
              ? <ChevronUp size={14} style={{ color: "oklch(0.72 0.04 280)" }} />
              : <ChevronDown size={14} style={{ color: "oklch(0.72 0.04 280)" }} />}
          </div>
        </button>
        {batchFillOpen && (
          <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "#4A2C2A" }}>
            <p className="text-[10px] pt-3" style={{ color: "oklch(0.75 0.04 280)" }}>
              Set values here, then click Apply — they will be pushed to every track card. Individual cards can still be edited after.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] mb-1 font-heading tracking-widest uppercase" style={{ color: "oklch(0.72 0.04 280)" }}>Genre</p>
                <Select value={batchGenre} onValueChange={setBatchGenre}>
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{
                      background: "oklch(0.09 0.03 270)",
                      border: "1px solid #4A2C2A",
                      color: batchGenre ? "#FFFFFF" : "oklch(0.75 0.04 280)",
                    }}
                  >
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent style={{ background: "oklch(0.14 0.015 280)", border: "1px solid #4A2C2A" }}>
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g} className="text-xs" style={{ color: "#FFFFFF" }}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[10px] mb-1 font-heading tracking-widest uppercase" style={{ color: "oklch(0.72 0.04 280)" }}>AI Consent</p>
                <Select value={batchAiConsent} onValueChange={v => setBatchAiConsent(v as TrackCard["aiConsent"])}>
                  <SelectTrigger
                    className="h-9 text-xs"
                    style={{ background: "oklch(0.09 0.03 270)", border: "1px solid #4A2C2A", color: "#FFFFFF" }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "oklch(0.14 0.015 280)", border: "1px solid #4A2C2A" }}>
                    {AI_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs" style={{ color: "#FFFFFF" }}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={applyBatchFill}
              size="sm"
              className="gap-2"
              style={{
                background: "oklch(0.84 0.155 85 / 0.15)",
                color: "oklch(0.84 0.155 85)",
                border: "1px solid oklch(0.84 0.155 85 / 0.3)",
              }}
            >
              <Sparkles size={13} /> Apply to All Tracks
            </Button>
          </div>
        )}
      </div>

      {/* Track cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "oklch(0.72 0.04 280)" }}>
            Tracks — {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
          {readyCount > 0 && (
            <Badge
              className="text-[9px]"
              style={{
                background: "oklch(0.65 0.18 160 / 0.15)",
                color: "oklch(0.65 0.18 160)",
                border: "1px solid oklch(0.65 0.18 160 / 0.3)",
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
          />
        ))}

        {/* Add track button */}
        <button
          onClick={addCard}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl transition-all hover:bg-white/[0.04]"
          style={{ border: "1.5px dashed oklch(0.35 0.02 280)", color: "oklch(0.75 0.04 280)" }}
        >
          <Plus size={16} />
          <span className="text-sm">Add Track</span>
        </button>
      </div>

      {/* Sticky submit bar */}
      <div
        className="sticky bottom-4 rounded-2xl p-4 flex items-center gap-4"
        style={{
          background: "oklch(0.12 0.05 270 / 95%)",
          border: "1px solid oklch(0.84 0.155 85 / 0.25)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "#FFFFFF" }}>
            {readyCount > 0
              ? `${readyCount} track${readyCount > 1 ? "s" : ""} ready to witness`
              : "Add audio files to begin"}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "oklch(0.75 0.04 280)" }}>
            {albumName ? `"${albumName}"` : "Set a collection name above"}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isUploading || readyCount === 0 || !albumName.trim()}
          className="gap-2 px-6"
          style={{
            background: readyCount > 0 && albumName.trim() ? "oklch(0.84 0.155 85)" : "#5C3530",
            color: readyCount > 0 && albumName.trim() ? "oklch(0.08 0.02 280)" : "oklch(0.45 0.02 280)",
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
