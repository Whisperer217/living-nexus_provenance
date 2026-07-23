/* ═══════════════════════════════════════════════════════════════════
   GCODE ENVIRONMENT — 3D Print / G-code Manifestation
   Guided 4-step flow: Upload → Details + License → Provenance → Publish
   The toolpath is the testimony. Every layer, witnessed.
═══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Printer, ChevronRight, ChevronLeft, Shield, ShieldCheck,
  Loader2, Sparkles, CheckCircle2, Layers, Clock, Package,
  DollarSign, Lock, Unlock, GitBranch, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell, ProvenanceIndicator, ReassuranceMessage } from "../StudioShell";

const atmosphere = ATMOSPHERES.gcode;

// ── Crypto helpers ──
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function generateECDSAKeypair() {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
}
async function signPayload(privateKey: CryptoKey, payload: string): Promise<string> {
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, new TextEncoder().encode(payload));
  let binary = ""; const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
async function exportPublicKeyJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y });
}

// ── License tier config ──
type LicenseTier = "open" | "paid" | "commission" | "witnessed";

const LICENSE_TIERS: {
  id: LicenseTier;
  label: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "open",
    label: "Free to Print",
    tagline: "G-code freely downloadable. WID proves original authorship.",
    icon: <Unlock size={18} />,
    color: "#4ADE80",
  },
  {
    id: "paid",
    label: "Pay to Print",
    tagline: "Stripe-gated download. You set the price. You keep the revenue.",
    icon: <DollarSign size={18} />,
    color: "#FB923C",
  },
  {
    id: "commission",
    label: "Commission a Print",
    tagline: "Buyers request a physical print from you directly.",
    icon: <Package size={18} />,
    color: "#60A5FA",
  },
  {
    id: "witnessed",
    label: "Provenance Record Only",
    tagline: "WID exists as proof of creation. File not publicly distributed.",
    icon: <Eye size={18} />,
    color: "#A78BFA",
  },
];

interface PrintStats {
  layerCount?: number;
  estimatedPrintTimeSeconds?: number;
  filamentUsedMm?: number;
  filamentUsedGrams?: number;
  nozzleDiameterMm?: number;
  bedSizeMm?: { x: number; y: number };
  slicerName?: string;
  slicerVersion?: string;
}

interface GcodeEnvironmentProps {
  onBack: () => void;
}

export function GcodeEnvironment({ onBack }: GcodeEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<StudioStep>("upload");

  // File state
  const [gcodeFile, setGcodeFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [printStats, setPrintStats] = useState<PrintStats | null>(null);
  const [uploadedGcodeUrl, setUploadedGcodeUrl] = useState<string>("");
  const [uploadedGcodeKey, setUploadedGcodeKey] = useState<string>("");
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string>("");
  const gcodeInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Metadata
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [caption, setCaption] = useState("");
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");

  // License
  const [licenseTier, setLicenseTier] = useState<LicenseTier>("open");
  const [priceDollars, setPriceDollars] = useState("5.00");

  // Provenance
  const [witnessData, setWitnessData] = useState<{
    wid: string; fileHash: string; publicKeyJWK: string; signature: string; timestamp: string;
  } | null>(null);
  const [generatingWid, setGeneratingWid] = useState(false);

  // Upload
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading-gcode" | "uploading-cover" | "publishing" | "done">("idle");

  // Cover preview
  useEffect(() => {
    if (coverFile) {
      const url = URL.createObjectURL(coverFile);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverPreview("");
  }, [coverFile]);

  const progress =
    step === "upload" ? (gcodeFile ? 25 : 5) :
    step === "metadata" ? (title ? 55 : 35) :
    step === "provenance" ? (witnessData ? 85 : 65) : 95;

  // ── tRPC mutation to get presigned S3 PUT URL (bypasses proxy size limit) ──
  const getPresignedUrl = trpc.songs.getGcodePresignedUploadUrl.useMutation();

  // ── Upload G-code directly to S3 via presigned URL (no proxy, no size limit) ──
  const uploadGcodeToS3 = async (file: File): Promise<{
    url: string; key: string; thumbnailUrl?: string; thumbnailKey?: string; printStats?: PrintStats;
  }> => {
    // Step 1: Get a presigned PUT URL from the server (small tRPC call, no file data)
    const { presignedUrl, publicUrl, key } = await getPresignedUrl.mutateAsync({
      filename: file.name,
      contentType: "text/x-gcode",
    });

    // Step 2: PUT the file directly to S3 — completely bypasses the reverse proxy
    const putRes = await fetch(presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/x-gcode" },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(`S3 upload failed (${putRes.status})`);
    }

    // Step 3: Extract print stats client-side (parse first 512 KB for slicer comments)
    let printStats: PrintStats | undefined;
    try {
      const chunk = await file.slice(0, 512 * 1024).arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: false }).decode(chunk);
      const stats: PrintStats = {};
      const layerMatch = text.match(/;\s*(?:LAYER_COUNT|total layer number)\s*[=:]\s*(\d+)/i);
      if (layerMatch) stats.layerCount = parseInt(layerMatch[1], 10);
      const timeMatch = text.match(/;\s*(?:estimated printing time|TIME)\s*[=:]\s*([^\n]+)/i);
      if (timeMatch) {
        const t = timeMatch[1].trim();
        const hm = t.match(/(\d+)h\s*(\d+)m/); const ms = t.match(/(\d+)m\s*(\d+)s/);
        const secOnly = t.match(/^(\d+)$/);
        if (hm) stats.estimatedPrintTimeSeconds = parseInt(hm[1]) * 3600 + parseInt(hm[2]) * 60;
        else if (ms) stats.estimatedPrintTimeSeconds = parseInt(ms[1]) * 60 + parseInt(ms[2]);
        else if (secOnly) stats.estimatedPrintTimeSeconds = parseInt(secOnly[1]);
      }
      const filMmMatch = text.match(/;\s*(?:filament used \[mm\]|Filament length)\s*[=:]\s*([\d.]+)/i);
      if (filMmMatch) stats.filamentUsedMm = parseFloat(filMmMatch[1]);
      const filGMatch = text.match(/;\s*(?:filament used \[g\]|Filament weight)\s*[=:]\s*([\d.]+)/i);
      if (filGMatch) stats.filamentUsedGrams = parseFloat(filGMatch[1]);
      const slicerMatch = text.match(/;\s*(?:Generated by|Slicer)\s*[=:]?\s*([^\n]+)/i);
      if (slicerMatch) { const parts = slicerMatch[1].trim().split(/\s+/); stats.slicerName = parts[0]; stats.slicerVersion = parts[1]; }
      if (Object.keys(stats).length > 0) printStats = stats;
    } catch { /* stats are optional */ }

    return { url: publicUrl, key, printStats };
  };

  const uploadCoverToS3 = async (file: File): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("type", "cover");
    formData.append("filename", file.name);
    formData.append("file", file);
    const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Upload failed (${res.status})`);
    }
    return res.json();
  };

  // ── Handle G-code file selection ──
  const handleGcodeSelect = async (file: File) => {
    setGcodeFile(file);
    setPrintStats(null);
    setUploadedGcodeUrl("");
    setUploadedGcodeKey("");
    setUploadedThumbnailUrl("");
    // Pre-upload the G-code immediately on selection so the user doesn't wait at publish time
    setUploadPhase("uploading-gcode");
    try {
      const result = await uploadGcodeToS3(file);
      setUploadedGcodeUrl(result.url);
      setUploadedGcodeKey(result.key);
      if (result.thumbnailUrl) setUploadedThumbnailUrl(result.thumbnailUrl);
      if (result.printStats) setPrintStats(result.printStats as PrintStats);
      toast.success("G-code uploaded. Toolpath ready.");
    } catch (err: any) {
      toast.error(err.message || "G-code upload failed");
    } finally {
      setUploadPhase("idle");
    }
  };

  // ── WID Generation ──
  const generateWID = async () => {
    if (!gcodeFile) return;
    setGeneratingWid(true);
    try {
      const buffer = await gcodeFile.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const keypair = await generateECDSAKeypair();
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const timestamp = new Date().toISOString();
      const wid = `WID-${fileHash.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const payload = JSON.stringify({ wid, fileHash, publicKeyJWK, timestamp });
      const signature = await signPayload(keypair.privateKey, payload);
      setWitnessData({ wid, fileHash, publicKeyJWK, signature, timestamp });
    } catch (err) {
      toast.error("WID generation failed. Please try again.");
    } finally {
      setGeneratingWid(false);
    }
  };

  // ── Publish mutation ──
  const uploadMutation = trpc.songs.upload.useMutation({
    onSuccess: (data: any) => {
      setUploadPhase("done");
      if (data?.witnessId && title) {
        addWIDSnapshot({
          wid: data.witnessId,
          title,
          creator: user?.name ?? "",
          contentType: "gcode",
          timestamp: Date.now(),
          verified: true,
        });
      }
      toast.success("Your object has been witnessed. The toolpath is now permanent.");
      if (data?.songId) navigate(`/gcode/${data.songId}`);
      else navigate("/dashboard");
    },
    onError: (e: { message: string }) => {
      toast.error(e.message);
      setUploadPhase("idle");
    },
  });

  const handlePublish = async () => {
    if (!title) { toast.error("Title is required"); return; }
    if (!uploadedGcodeUrl) { toast.error("G-code file is required"); return; }
    setUploadPhase("publishing");
    try {
      // Upload cover art if provided (and not already using the slicer thumbnail)
      let coverArtUrl: string | undefined = uploadedThumbnailUrl || undefined;
      if (coverFile) {
        setUploadPhase("uploading-cover");
        const { url } = await uploadCoverToS3(coverFile);
        coverArtUrl = url;
        setUploadPhase("publishing");
      }
      const priceCents = licenseTier === "paid" ? Math.round(parseFloat(priceDollars) * 100) : undefined;
      uploadMutation.mutate({
        fileUrl: uploadedGcodeUrl,
        fileKey: uploadedGcodeKey,
        coverArtUrl,
        title,
        genre: genre || undefined,
        aiConsent,
        ownershipStatus: "full",
        moodTags: [],
        coWriters: [],
        caption: caption || undefined,
        contentType: "gcode",
        fileHash: witnessData?.fileHash,
        witnessId: witnessData?.wid,
        ecdsaPublicKey: witnessData?.publicKeyJWK,
        ecdsaSignature: witnessData?.signature,
        gcodeUrl: uploadedGcodeUrl,
        gcodeKey: uploadedGcodeKey,
        printStatsJson: printStats ? JSON.stringify(printStats) : undefined,
        objectLicenseType: licenseTier,
        objectPriceCents: priceCents,
      } as any);
    } catch (err: any) {
      toast.error(err.message || "Publish failed");
      setUploadPhase("idle");
    }
  };

  const fmtTime = (seconds?: number) => {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // ── Left Panel ──
  const renderLeftPanel = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Upload Your G-code
              </h2>
              <p className="text-sm" style={{ color: "rgba(245,237,216,0.6)" }}>
                {atmosphere.language.filePrompt}
              </p>
            </div>

            {/* G-code drop zone */}
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:scale-[1.01]"
              style={{
                borderColor: gcodeFile ? atmosphere.colorPrimary : atmosphere.colorBorder,
                background: gcodeFile ? atmosphere.colorBg : "transparent",
              }}
              onClick={() => gcodeInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleGcodeSelect(f);
              }}
            >
              <input
                ref={gcodeInputRef}
                type="file"
                accept=".gcode,.gco,.nc,.3mf,.stl,.obj"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleGcodeSelect(f); }}
              />
              {uploadPhase === "uploading-gcode" ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin" style={{ color: atmosphere.colorPrimary }} />
                  <p className="text-sm" style={{ color: "rgba(245,237,216,0.7)" }}>Parsing toolpath...</p>
                </div>
              ) : gcodeFile ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 size={32} style={{ color: atmosphere.colorPrimary }} />
                  <p className="font-semibold" style={{ color: "var(--ln-parchment)" }}>{gcodeFile.name}</p>
                  <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>
                    {(gcodeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Printer size={32} style={{ color: atmosphere.colorBorder }} />
                  <p className="text-sm" style={{ color: "rgba(245,237,216,0.5)" }}>
                    Drop your .gcode, .3mf, or .stl file here
                  </p>
                  <p className="text-xs" style={{ color: "rgba(245,237,216,0.35)" }}>
                    Slicer thumbnails are auto-extracted as cover art
                  </p>
                </div>
              )}
            </div>

            {/* Print stats (auto-populated from parser) */}
            {printStats && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: atmosphere.colorBg, border: `1px solid ${atmosphere.colorBorder}` }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: atmosphere.colorPrimary }}>
                  Print Statistics
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {printStats.layerCount && (
                    <div className="flex items-center gap-2">
                      <Layers size={14} style={{ color: atmosphere.colorPrimary }} />
                      <span className="text-xs" style={{ color: "rgba(245,237,216,0.7)" }}>
                        {printStats.layerCount.toLocaleString()} layers
                      </span>
                    </div>
                  )}
                  {printStats.estimatedPrintTimeSeconds && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} style={{ color: atmosphere.colorPrimary }} />
                      <span className="text-xs" style={{ color: "rgba(245,237,216,0.7)" }}>
                        {fmtTime(printStats.estimatedPrintTimeSeconds)}
                      </span>
                    </div>
                  )}
                  {printStats.filamentUsedGrams && (
                    <div className="flex items-center gap-2">
                      <Package size={14} style={{ color: atmosphere.colorPrimary }} />
                      <span className="text-xs" style={{ color: "rgba(245,237,216,0.7)" }}>
                        {printStats.filamentUsedGrams.toFixed(1)}g filament
                      </span>
                    </div>
                  )}
                  {printStats.slicerName && (
                    <div className="flex items-center gap-2">
                      <GitBranch size={14} style={{ color: atmosphere.colorPrimary }} />
                      <span className="text-xs" style={{ color: "rgba(245,237,216,0.7)" }}>
                        {printStats.slicerName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Slicer thumbnail preview */}
            {uploadedThumbnailUrl && (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${atmosphere.colorBorder}` }}>
                <p className="text-xs px-3 py-2 font-semibold uppercase tracking-widest" style={{ color: atmosphere.colorPrimary, background: atmosphere.colorBg }}>
                  Slicer Thumbnail (auto-extracted)
                </p>
                <img src={uploadedThumbnailUrl} alt="Slicer thumbnail" className="w-full object-contain max-h-48" />
              </div>
            )}

            {/* Manual cover art override */}
            <div>
              <p className="text-xs mb-2 font-semibold" style={{ color: "rgba(245,237,216,0.5)" }}>
                {uploadedThumbnailUrl ? "Override cover art (optional)" : "Cover art (optional — or use slicer thumbnail)"}
              </p>
              <div
                className="border rounded-xl p-4 text-center cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: atmosphere.colorBorder, background: "transparent" }}
                onClick={() => coverInputRef.current?.click()}
              >
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }}
                />
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-full max-h-32 object-contain rounded-lg" />
                ) : (
                  <p className="text-xs" style={{ color: "rgba(245,237,216,0.4)" }}>Click to upload a custom cover image</p>
                )}
              </div>
            </div>

            <Button
              onClick={() => setStep("metadata")}
              disabled={!gcodeFile || uploadPhase === "uploading-gcode"}
              className="w-full gap-2"
              style={{ background: atmosphere.colorPrimary, color: "#000000" }}
            >
              Continue to Details <ChevronRight size={16} />
            </Button>
          </div>
        );

      case "metadata":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Name Your Object
              </h2>
              <p className="text-sm" style={{ color: "rgba(245,237,216,0.6)" }}>
                {atmosphere.language.metadataPrompt}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: atmosphere.colorPrimary }}>
                  Object Title *
                </label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Articulated Dragon v3"
                  className="bg-transparent border-opacity-40"
                  style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: atmosphere.colorPrimary }}>
                  Category (optional)
                </label>
                <Input
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  placeholder="e.g. Figurine, Functional, Mechanical, Art"
                  className="bg-transparent border-opacity-40"
                  style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: atmosphere.colorPrimary }}>
                  Description (optional)
                </label>
                <Textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="What is this object? What inspired it?"
                  rows={3}
                  className="bg-transparent border-opacity-40 resize-none"
                  style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}
                />
              </div>
            </div>

            {/* Licensing Tier Selector */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: atmosphere.colorPrimary }}>
                Distribution License
              </p>
              <div className="space-y-2">
                {LICENSE_TIERS.map(tier => (
                  <button
                    key={tier.id}
                    onClick={() => setLicenseTier(tier.id)}
                    className="w-full text-left rounded-xl p-3 transition-all border"
                    style={{
                      borderColor: licenseTier === tier.id ? tier.color : atmosphere.colorBorder,
                      background: licenseTier === tier.id ? `${tier.color}15` : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ color: tier.color }}>{tier.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: licenseTier === tier.id ? tier.color : "var(--ln-parchment)" }}>
                          {tier.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(245,237,216,0.5)" }}>
                          {tier.tagline}
                        </p>
                      </div>
                      {licenseTier === tier.id && <CheckCircle2 size={16} style={{ color: tier.color }} />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Price input for paid tier */}
              {licenseTier === "paid" && (
                <div className="mt-3">
                  <label className="text-xs font-semibold uppercase tracking-widest mb-1 block" style={{ color: "#FB923C" }}>
                    Price (USD)
                  </label>
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} style={{ color: "#FB923C" }} />
                    <Input
                      type="number"
                      min="0.50"
                      max="999.99"
                      step="0.01"
                      value={priceDollars}
                      onChange={e => setPriceDollars(e.target.value)}
                      className="bg-transparent border-opacity-40 w-32"
                      style={{ borderColor: "#FB923C", color: "var(--ln-parchment)" }}
                    />
                    <span className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>
                      Platform takes 10%. You keep 90%.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Consent */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: atmosphere.colorPrimary }}>
                AI Design Disclosure
              </p>
              <div className="space-y-2">
                {(["prohibited", "permitted_attribution", "permitted"] as const).map(val => (
                  <label key={val} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="aiConsent"
                      value={val}
                      checked={aiConsent === val}
                      onChange={() => setAiConsent(val)}
                      className="accent-orange-400"
                    />
                    <span className="text-xs" style={{ color: "rgba(245,237,216,0.7)" }}>
                      {val === "prohibited" ? "Human-designed only — no AI training permitted" :
                       val === "permitted_attribution" ? "AI training permitted with attribution" :
                       "AI training freely permitted"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={16} /> Back
              </Button>
              <Button
                onClick={() => setStep("provenance")}
                disabled={!title}
                className="flex-1 gap-2"
                style={{ background: atmosphere.colorPrimary, color: "#000000" }}
              >
                Continue to Provenance <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        );

      case "provenance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Seal Your Provenance
              </h2>
              <p className="text-sm" style={{ color: "rgba(245,237,216,0.6)" }}>
                {atmosphere.language.provenancePrompt}
              </p>
            </div>

            <ProvenanceIndicator
              atmosphere={atmosphere}
              status={generatingWid ? "generating" : witnessData ? "sealed" : "pending"}
              wid={witnessData?.wid}
            />
            {!witnessData && (
              <Button
                onClick={generateWID}
                disabled={generatingWid}
                className="w-full gap-2"
                style={{ background: atmosphere.colorPrimary, color: "#000000" }}
              >
                {generatingWid ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                {generatingWid ? "Generating Witness ID..." : "Generate Witness ID"}
              </Button>
            )}

            {witnessData && (
              <div className="rounded-xl p-4 space-y-2" style={{ background: atmosphere.colorBg, border: `1px solid ${atmosphere.colorBorder}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={14} style={{ color: atmosphere.colorPrimary }} />
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: atmosphere.colorPrimary }}>
                    Witness Record
                  </p>
                </div>
                <p className="text-xs font-mono break-all" style={{ color: "rgba(245,237,216,0.7)" }}>
                  WID: {witnessData.wid}
                </p>
                <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>
                  Sealed: {new Date(witnessData.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            <ReassuranceMessage message={atmosphere.language.completeMessage} atmosphere={atmosphere} />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("metadata")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={16} /> Back
              </Button>
              <Button
                onClick={() => setStep("publish")}
                disabled={!witnessData}
                className="flex-1 gap-2"
                style={{ background: atmosphere.colorPrimary, color: "#000000" }}
              >
                Continue to Publish <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        );

      case "publish":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Witness Your Object
              </h2>
              <p className="text-sm" style={{ color: "rgba(245,237,216,0.6)" }}>
                {atmosphere.language.publishPrompt}
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: atmosphere.colorBg, border: `1px solid ${atmosphere.colorBorder}` }}>
              <div className="flex items-center gap-3">
                {uploadedThumbnailUrl || coverPreview ? (
                  <img
                    src={coverPreview || uploadedThumbnailUrl}
                    alt="Cover"
                    className="w-16 h-16 rounded-lg object-contain"
                    style={{ background: "rgba(0,0,0,0.3)" }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <Printer size={24} style={{ color: atmosphere.colorBorder }} />
                  </div>
                )}
                <div>
                  <p className="font-semibold" style={{ color: "var(--ln-parchment)" }}>{title}</p>
                  <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>{gcodeFile?.name}</p>
                  {printStats?.layerCount && (
                    <p className="text-xs" style={{ color: atmosphere.colorPrimary }}>
                      {printStats.layerCount.toLocaleString()} layers · {fmtTime(printStats.estimatedPrintTimeSeconds)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1" style={{ borderTop: `1px solid ${atmosphere.colorBorder}` }}>
                {LICENSE_TIERS.find(t => t.id === licenseTier)?.icon}
                <span className="text-xs" style={{ color: "rgba(245,237,216,0.7)" }}>
                  {LICENSE_TIERS.find(t => t.id === licenseTier)?.label}
                  {licenseTier === "paid" && ` · $${priceDollars}`}
                </span>
              </div>
            </div>

            <Button
              onClick={handlePublish}
              disabled={uploadPhase !== "idle"}
              className="w-full gap-2 py-6 text-base font-semibold"
              style={{ background: "var(--ln-gold)", color: "#000000", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}
            >
              {uploadPhase !== "idle" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {uploadPhase === "uploading-cover" ? "Uploading cover..." : "Publishing..."}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Witness This Object
                </>
              )}
            </Button>

            <Button variant="outline" onClick={() => setStep("provenance")} className="w-full gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
              <ChevronLeft size={16} /> Back
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Right Panel ──
  const renderRightPanel = () => (
    <div className="space-y-6">
      {/* Toolpath preview placeholder */}
      <div
        className="rounded-xl flex items-center justify-center"
        style={{
          height: 280,
          background: "rgba(0,0,0,0.4)",
          border: `1px solid ${atmosphere.colorBorder}`,
        }}
      >
        {gcodeFile ? (
          <div className="text-center space-y-2">
            <Printer size={40} style={{ color: atmosphere.colorPrimary, margin: "0 auto" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>
              {gcodeFile.name}
            </p>
            <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>
              Interactive toolpath viewer available on the work page after publishing
            </p>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <Printer size={40} style={{ color: atmosphere.colorBorder, margin: "0 auto" }} />
            <p className="text-xs" style={{ color: "rgba(245,237,216,0.3)" }}>
              Toolpath preview will appear here
            </p>
          </div>
        )}
      </div>

      {/* Doctrine card */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: atmosphere.colorBg, border: `1px solid ${atmosphere.colorBorder}` }}>
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: atmosphere.colorPrimary }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: atmosphere.colorPrimary }}>
            The Toolpath is the Testimony
          </p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(245,237,216,0.6)" }}>
          The G-code file is the exact set of instructions a machine followed to manifest your object into the world. That is provenance in its purest form — the toolpath is the testimony.
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(245,237,216,0.6)" }}>
          Your WID proves you designed it. The license you choose determines who can print it. The platform never holds your work hostage.
        </p>
      </div>

      {/* License doctrine */}
      <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid rgba(255,255,255,0.06)` }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(245,237,216,0.4)" }}>
          Sovereignty Doctrine
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(245,237,216,0.4)" }}>
          The 3D viewer, the WID, and the G-code hosting are always free. Your licensing choice — open, paid, commission, or witnessed-only — is yours alone. The platform takes no position on how you distribute your work.
        </p>
      </div>
    </div>
  );

  return (
    <StudioShell
      atmosphere={atmosphere}
      currentStep={step}
      progress={progress}
      onBack={onBack}
      leftPanel={renderLeftPanel()}
      rightPanel={renderRightPanel()}
    />
  );
}
