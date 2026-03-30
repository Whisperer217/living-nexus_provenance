import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Music, X, CheckCircle, Loader2, AlertCircle, Disc, ChevronRight, Library, ExternalLink, Download } from "lucide-react";

// ── WID helpers (same as UploadPage) ─────────────────────────────────────────
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

// ── Types ─────────────────────────────────────────────────────────────────────
interface TrackEntry {
  id: string;
  file: File;
  title: string;
  status: "pending" | "hashing" | "ready" | "uploading" | "done" | "error";
  wid?: string;
  fileHash?: string;
  harmonicSignature?: number[];
  ecdsaPublicKey?: string;
  ecdsaSignature?: string;
  errorMsg?: string;
}

const GENRES = ["Gospel", "Classical", "Rock", "Hip-Hop", "Electronic", "R&B", "Ambient", "Jazz", "Folk", "Pop", "Metal", "Country", "Blues", "Soul", "Reggae", "Latin", "World", "Spoken Word", "Other"];
const AI_CONSENT_OPTIONS = [
  { value: "prohibited", label: "Prohibited — No AI use" },
  { value: "permitted_attribution", label: "Permitted with attribution" },
  { value: "permitted", label: "Permitted — Open AI use" },
];

export default function BatchUploadPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Album metadata
  const [albumName, setAlbumName] = useState("");
  const [genre, setGenre] = useState<string>("");
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Tracks
  const [tracks, setTracks] = useState<TrackEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const batchUpload = trpc.songs.batchUpload.useMutation();
  const generateCollectionCert = trpc.songs.generateCollectionCertificate.useMutation();

  // Collection result state
  const [collectionResult, setCollectionResult] = useState<{
    collectionId: number;
    collectionWid: string;
    collectiveHash: string;
    trackCount: number;
    pdfUrl?: string;
  } | null>(null);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Sign in to upload music</p>
        <Button onClick={() => { window.location.href = getLoginUrl("/batch-upload"); }} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.02 280)" }}>
          Sign In
        </Button>
      </div>
    );
  }

  // ── File handling ─────────────────────────────────────────────────────────
  const addFiles = useCallback((files: File[]) => {
    const audioFiles = files.filter(f => f.type.startsWith("audio/") || f.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|webm)$/i));
    if (!audioFiles.length) { toast.error("No audio files found. Please select MP3, WAV, FLAC, or other audio files."); return; }
    const newTracks: TrackEntry[] = audioFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").trim(),
      status: "pending",
    }));
    setTracks(prev => [...prev, ...newTracks]);
    // Auto-generate WIDs for all new tracks
    newTracks.forEach(track => generateWID(track));
  }, []);

  const generateWID = async (track: TrackEntry) => {
    setTracks(prev => prev.map(t => t.id === track.id ? { ...t, status: "hashing" } : t));
    try {
      const buffer = await track.file.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const wid = formatWID(fileHash);
      const harmonicSignature = deriveHarmonicFrequencies(fileHash);
      const keypair = await generateECDSAKeypair();
      const ecdsaPublicKey = await exportPublicKeyJWK(keypair.publicKey);
      const payload = JSON.stringify({ wid, fileHash, title: track.title, timestamp: Date.now() });
      const ecdsaSignature = await signPayload(keypair.privateKey, payload);
      setTracks(prev => prev.map(t => t.id === track.id ? {
        ...t, status: "ready", wid, fileHash, harmonicSignature, ecdsaPublicKey, ecdsaSignature,
      } : t));
    } catch {
      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, status: "error", errorMsg: "WID generation failed" } : t));
    }
  };

  const removeTrack = (id: string) => setTracks(prev => prev.filter(t => t.id !== id));

  const updateTitle = (id: string, title: string) => setTracks(prev => prev.map(t => t.id === id ? { ...t, title } : t));

  const handleCoverChange = (file: File) => {
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = e => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  // ── Submit ────────────────────────────────────────────────────────────────
  // Helper: upload a single file via multipart POST to /api/upload-file
  const uploadFileToS3 = async (file: File, type: "audio" | "cover" | "video"): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("filename", file.name);
    const res = await fetch("/api/upload-file", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    return res.json();
  };

  const handleSubmit = async () => {
    if (!albumName.trim()) { toast.error("Album name is required"); return; }
    const readyTracks = tracks.filter(t => t.status === "ready");
    if (!readyTracks.length) { toast.error("No tracks ready. Wait for WID generation to complete."); return; }

    setIsUploading(true);
    setTracks(prev => prev.map(t => t.status === "ready" ? { ...t, status: "uploading" } : t));

    try {
      // Upload cover art via multipart (no base64 encoding)
      let coverArtUrl: string | undefined;
      if (coverFile) {
        toast.loading("Uploading cover art…", { id: "batch-cover" });
        const { url } = await uploadFileToS3(coverFile, "cover");
        coverArtUrl = url;
        toast.dismiss("batch-cover");
      }

      // Upload each audio file via multipart, sequentially to show per-track progress
      const trackPayloads = [];
      for (const track of readyTracks) {
        toast.loading(`Uploading ${track.title}…`, { id: `batch-track-${track.id}` });
        const { url: fileUrl, key: fileKey } = await uploadFileToS3(track.file, "audio");
        toast.dismiss(`batch-track-${track.id}`);
        trackPayloads.push({
          fileUrl,
          fileKey,
          title: track.title,
          fileHash: track.fileHash,
          witnessId: track.wid,
          harmonicSignature: track.harmonicSignature,
          ecdsaPublicKey: track.ecdsaPublicKey,
          ecdsaSignature: track.ecdsaSignature,
        });
      }

      // Now call tRPC with only metadata + S3 URLs (no large binary data)
      const result = await batchUpload.mutateAsync({
        albumName: albumName.trim(),
        genre: genre || undefined,
        aiConsent,
        coverArtUrl,
        tracks: trackPayloads,
      });

      setTracks(prev => prev.map(t => t.status === "uploading" ? { ...t, status: "done" } : t));
      setUploadDone(true);
      toast.success(`Album uploaded! ${result.trackCount} track${result.trackCount !== 1 ? "s" : ""} with individual WIDs.`);

      // Store collection info and auto-generate certificate
      if (result.collectionWid && result.collectionId) {
        setCollectionResult({
          collectionId: result.collectionId,
          collectionWid: result.collectionWid,
          collectiveHash: result.collectiveHash ?? "",
          trackCount: result.trackCount,
        });
        // Auto-generate the collection certificate HTML → S3
        setIsGeneratingCert(true);
        try {
          const cert = await generateCollectionCert.mutateAsync({ collectionWid: result.collectionWid });
          setCollectionResult(prev => prev ? { ...prev, pdfUrl: cert.pdfUrl } : null);
        } catch {
          // Certificate generation is non-blocking — collection WID still valid
        } finally {
          setIsGeneratingCert(false);
        }
      }
    } catch (err: any) {
      setTracks(prev => prev.map(t => t.status === "uploading" ? { ...t, status: "error", errorMsg: err.message } : t));
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const readyCount = tracks.filter(t => t.status === "ready").length;
  const hashingCount = tracks.filter(t => t.status === "hashing" || t.status === "pending").length;
  const doneCount = tracks.filter(t => t.status === "done").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1" style={{ color: "oklch(0.55 0.04 280)" }}>
          <span className="text-xs uppercase tracking-widest">BDDT Publishing / Command Domains LLC</span>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
          Batch Album Upload
        </h1>
        <p className="text-sm" style={{ color: "oklch(0.55 0.04 280)" }}>
          Upload multiple tracks as one album. Each track receives its own cryptographic Witness ID. One cover art, one genre, shared across all tracks.
        </p>
      </div>

      {uploadDone ? (
        // ── Success state ──────────────────────────────────────────────────
        <div className="space-y-5">
          {/* ── Main success card ── */}
          <div className="rounded-2xl p-10 text-center" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.75 0.18 85 / 0.3)" }}>
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "oklch(0.84 0.155 85)" }} />
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              Album Published
            </h2>
            <p className="mb-2" style={{ color: "oklch(0.65 0.04 280)" }}>
              <strong style={{ color: "oklch(0.85 0.02 85)" }}>{albumName}</strong> — {doneCount} track{doneCount !== 1 ? "s" : ""} uploaded with individual Witness IDs
            </p>
            <div className="flex flex-col gap-2 mt-2 mb-6 max-w-sm mx-auto">
              {tracks.filter(t => t.status === "done").map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "oklch(0.14 0.04 280)" }}>
                  <span className="text-sm truncate" style={{ color: "oklch(0.8 0.02 85)" }}>{t.title}</span>
                  {t.wid && <Badge className="ml-2 shrink-0 text-xs" style={{ background: "oklch(0.75 0.18 85 / 0.2)", color: "oklch(0.84 0.155 85)", fontSize: "9px" }}>{t.wid.slice(0, 18)}…</Badge>}
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/archive")} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.02 280)" }}>
                View Archive <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="outline" onClick={() => { setTracks([]); setAlbumName(""); setGenre(""); setCoverFile(null); setCoverPreview(null); setUploadDone(false); setCollectionResult(null); }} style={{ borderColor: "oklch(0.3 0.02 280)", color: "oklch(0.7 0.04 280)" }}>
                Upload Another Album
              </Button>
            </div>
          </div>

          {/* ── Collection Certificate block ── */}
          {collectionResult && (
            <div className="rounded-2xl p-6" style={{ background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Library className="w-5 h-5" style={{ color: "oklch(0.84 0.155 85)" }} />
                <p className="font-bold text-sm" style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}>
                  Collection Certificate Generated
                </p>
                {isGeneratingCert && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" style={{ color: "oklch(0.84 0.155 85 / 0.6)" }} />}
              </div>
              <p className="text-xs mb-3" style={{ color: "oklch(0.5 0.03 280)" }}>
                All {collectionResult.trackCount} works are now collectively witnessed as a single origin record.
              </p>
              {/* Collection WID */}
              <div className="rounded-lg px-3 py-2 mb-2" style={{ background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.02 280)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "oklch(0.5 0.03 280)" }}>Collection WID</p>
                <p className="text-sm font-mono font-bold" style={{ color: "oklch(0.84 0.155 85)" }}>{collectionResult.collectionWid}</p>
              </div>
              {/* Collective hash */}
              <div className="rounded-lg px-3 py-2 mb-4" style={{ background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.02 280)" }}>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: "oklch(0.5 0.03 280)" }}>Collective Hash (SHA-256)</p>
                <p className="text-[10px] font-mono break-all" style={{ color: "oklch(0.6 0.04 280)" }}>{collectionResult.collectiveHash}</p>
              </div>
              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {collectionResult.pdfUrl ? (
                  <a
                    href={collectionResult.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold"
                    style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.02 280)", fontFamily: "'Cinzel', serif" }}
                  >
                    <Download className="w-4 h-4" /> Download Certificate
                  </a>
                ) : isGeneratingCert ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm" style={{ background: "oklch(0.84 0.155 85 / 0.15)", color: "oklch(0.84 0.155 85 / 0.6)" }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating certificate…
                  </span>
                ) : null}
                <a
                  href={`/verify/${encodeURIComponent(collectionResult.collectionWid)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold"
                  style={{ border: "1px solid oklch(0.84 0.155 85 / 0.5)", color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}
                >
                  <ExternalLink className="w-4 h-4" /> Verify Collection
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Track list + dropzone */}
          <div className="flex flex-col gap-4">
            {/* Dropzone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{
                background: isDragging ? "oklch(0.14 0.06 280)" : "oklch(0.115 0.055 278)",
                border: `2px dashed ${isDragging ? "oklch(0.84 0.155 85)" : "oklch(0.25 0.02 280)"}`,
              }}
            >
              <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: isDragging ? "oklch(0.84 0.155 85)" : "oklch(0.4 0.03 280)" }} />
              <p className="font-semibold mb-1" style={{ color: "oklch(0.75 0.04 280)" }}>Drop audio files here</p>
              <p className="text-xs" style={{ color: "oklch(0.45 0.03 280)" }}>MP3, WAV, FLAC, OGG, AAC, M4A — up to 50 tracks</p>
              <input ref={fileInputRef} type="file" multiple accept="audio/*" className="hidden" onChange={e => addFiles(Array.from(e.target.files || []))} />
            </div>

            {/* Track list */}
            {tracks.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.2 0.015 280)" }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: "oklch(0.12 0.04 280)", borderBottom: "1px solid oklch(0.2 0.015 280)" }}>
                  <span className="text-sm font-semibold" style={{ color: "oklch(0.75 0.04 280)" }}>
                    {tracks.length} track{tracks.length !== 1 ? "s" : ""}
                    {hashingCount > 0 && <span className="ml-2 text-xs" style={{ color: "oklch(0.6 0.04 280)" }}>— generating {hashingCount} WID{hashingCount !== 1 ? "s" : ""}…</span>}
                    {readyCount > 0 && hashingCount === 0 && <span className="ml-2 text-xs" style={{ color: "oklch(0.65 0.15 150)" }}>— {readyCount} ready</span>}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setTracks([])} className="text-xs h-7 px-2" style={{ color: "oklch(0.5 0.03 280)" }}>
                    Clear all
                  </Button>
                </div>
                <div className="divide-y divide-white/5">
                  {tracks.map((track, idx) => (
                    <div key={track.id} className="flex items-center gap-3 px-4 py-3" style={{ background: "oklch(0.09 0.04 280)" }}>
                      {/* Track number */}
                      <span className="text-xs w-5 text-right shrink-0" style={{ color: "oklch(0.4 0.03 280)" }}>{idx + 1}</span>

                      {/* Status icon */}
                      <div className="shrink-0">
                        {track.status === "hashing" || track.status === "pending" ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.65 0.15 200)" }} />
                        ) : track.status === "ready" ? (
                          <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.15 150)" }} />
                        ) : track.status === "uploading" ? (
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.84 0.155 85)" }} />
                        ) : track.status === "done" ? (
                          <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85)" }} />
                        ) : (
                          <AlertCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.18 25)" }} />
                        )}
                      </div>

                      {/* Title input */}
                      <Input
                        value={track.title}
                        onChange={e => updateTitle(track.id, e.target.value)}
                        disabled={isUploading || track.status === "done"}
                        className="flex-1 h-8 text-sm"
                        style={{ background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.02 280)", color: "oklch(0.85 0.02 85)" }}
                        placeholder="Track title"
                      />

                      {/* WID badge */}
                      {track.wid && (
                        <Badge className="shrink-0 hidden sm:flex text-xs" style={{ background: "oklch(0.75 0.18 85 / 0.15)", color: "oklch(0.84 0.155 85)", fontSize: "9px" }}>
                          {track.wid.slice(0, 14)}…
                        </Badge>
                      )}

                      {/* File size */}
                      <span className="text-xs shrink-0 hidden md:block" style={{ color: "oklch(0.4 0.03 280)" }}>
                        {(track.file.size / 1024 / 1024).toFixed(1)}MB
                      </span>

                      {/* Remove */}
                      {!isUploading && track.status !== "done" && (
                        <button onClick={() => removeTrack(track.id)} className="shrink-0 p-1 rounded hover:bg-white/5">
                          <X className="w-3.5 h-3.5" style={{ color: "oklch(0.5 0.03 280)" }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {tracks.length === 0 && (
              <div className="text-center py-6" style={{ color: "oklch(0.4 0.03 280)" }}>
                <Music className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No tracks added yet</p>
              </div>
            )}
          </div>

          {/* Right: Album metadata */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
              <h2 className="text-sm font-bold mb-4 uppercase tracking-widest" style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}>
                Album Details
              </h2>

              {/* Cover art */}
              <div className="mb-4">
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>COVER ART</label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all hover:opacity-80"
                  style={{ background: "oklch(0.14 0.04 280)", border: "1px dashed oklch(0.25 0.02 280)" }}
                >
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Disc className="w-10 h-10 mx-auto mb-2" style={{ color: "oklch(0.35 0.03 280)" }} />
                      <p className="text-xs" style={{ color: "oklch(0.45 0.03 280)" }}>Click to add cover art</p>
                    </div>
                  )}
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleCoverChange(e.target.files[0])} />
              </div>

              {/* Collection name */}
              <div className="mb-3">
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>COLLECTION NAME <span style={{ color: "oklch(0.65 0.18 25)" }}>*</span></label>
                <p className="text-xs mb-1.5" style={{ color: "oklch(0.45 0.03 280)" }}>This name appears on your Collection Certificate and verify page.</p>
                <Input
                  value={albumName}
                  onChange={e => setAlbumName(e.target.value)}
                  placeholder="e.g. Erasing The Witness, Vol. 1…"
                  style={{ background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.02 280)", color: "oklch(0.85 0.02 85)" }}
                />
              </div>

              {/* Genre */}
              <div className="mb-3">
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>GENRE</label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger style={{ background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.02 280)", color: genre ? "oklch(0.85 0.02 85)" : "oklch(0.45 0.03 280)" }}>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Consent */}
              <div className="mb-5">
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "oklch(0.6 0.04 280)" }}>AI CONSENT</label>
                <Select value={aiConsent} onValueChange={v => setAiConsent(v as any)}>
                  <SelectTrigger style={{ background: "oklch(0.13 0.04 280)", border: "1px solid oklch(0.22 0.02 280)", color: "oklch(0.85 0.02 85)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_CONSENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={isUploading || tracks.length === 0 || !albumName.trim() || hashingCount > 0}
                className="w-full font-bold"
                style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.02 280)" }}
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</>
                ) : hashingCount > 0 ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating WIDs…</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload {readyCount > 0 ? `${readyCount} Track${readyCount !== 1 ? "s" : ""}` : "Album"}</>
                )}
              </Button>

              {tracks.length > 0 && (
                <p className="text-xs text-center mt-2" style={{ color: "oklch(0.45 0.03 280)" }}>
                  Each track gets its own Witness ID — cryptographic provenance established in-browser
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
