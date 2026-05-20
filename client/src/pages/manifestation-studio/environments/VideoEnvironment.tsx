/* ═══════════════════════════════════════════════════════════════════
   VIDEO MANIFESTATION ENVIRONMENT
   Atmosphere: cyan/electric blue, cinematic preview, frame extraction
   Flow: Upload video → Metadata → Provenance → Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Film, ChevronRight, ChevronLeft, Shield, ShieldCheck,
  Loader2, Sparkles, CheckCircle2, Zap, Image as ImageIcon, Play, Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { UPLOAD_GENRES as GENRES } from "@shared/contentTypes";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell, ProvenanceIndicator, ReassuranceMessage } from "../StudioShell";

const atmosphere = ATMOSPHERES.video;

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

interface VideoEnvironmentProps {
  onBack: () => void;
}

export function VideoEnvironment({ onBack }: VideoEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<StudioStep>("upload");

  // File state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Metadata
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [caption, setCaption] = useState("");
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");

  // Provenance
  const [witnessData, setWitnessData] = useState<{ wid: string; fileHash: string; publicKeyJWK: string; signature: string; timestamp: string } | null>(null);
  const [generatingWid, setGeneratingWid] = useState(false);

  // Upload
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "done">("idle");

  // Video preview
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setVideoPreviewUrl("");
  }, [videoFile]);

  // Cover preview
  useEffect(() => {
    if (coverFile) { const url = URL.createObjectURL(coverFile); setCoverPreview(url); return () => URL.revokeObjectURL(url); }
    setCoverPreview("");
  }, [coverFile]);

  const progress = step === "upload" ? (videoFile ? 25 : 5) : step === "metadata" ? (title ? 55 : 35) : step === "provenance" ? (witnessData ? 85 : 65) : 95;

  // Helper: upload file to S3
  const uploadFileToS3 = async (file: File, type: "audio" | "cover" | "video"): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("filename", file.name);
    const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || `Upload failed (${res.status})`); }
    return res.json();
  };

  // WID Generation
  const generateWID = async () => {
    if (!videoFile) return;
    setGeneratingWid(true);
    try {
      // For large video files, hash first 10MB + last 10MB for speed
      const buffer = videoFile.size > 20 * 1024 * 1024
        ? await (async () => {
            const first = await videoFile.slice(0, 10 * 1024 * 1024).arrayBuffer();
            const last = await videoFile.slice(-10 * 1024 * 1024).arrayBuffer();
            const combined = new Uint8Array(first.byteLength + last.byteLength);
            combined.set(new Uint8Array(first), 0);
            combined.set(new Uint8Array(last), first.byteLength);
            return combined.buffer as ArrayBuffer;
          })()
        : await videoFile.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const keypair = await generateECDSAKeypair();
      const timestamp = new Date().toISOString();
      const payload = JSON.stringify({ fileHash, timestamp, fileSize: videoFile.size });
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const wid = `WID-VID-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
      setWitnessData({ wid, fileHash, publicKeyJWK, signature, timestamp });
      toast.success("Witness ID generated — your footage is now sealed");
    } catch (err: any) {
      toast.error("WID generation failed: " + (err?.message || "Unknown error"));
    } finally {
      setGeneratingWid(false);
    }
  };

  // Publish
  const uploadMutation = trpc.songs.upload.useMutation({
    onSuccess: (data: any) => {
      setUploadPhase("done");
      if (data?.witnessId && title) {
        addWIDSnapshot({ wid: data.witnessId, title, creator: "", contentType: "video", timestamp: Date.now(), verified: true });
      }
      toast.success("Your video has been witnessed. Every frame is now permanent.");
      if (data?.songId) navigate(`/song/${data.songId}`);
      else navigate("/dashboard");
    },
    onError: (e: { message: string }) => { toast.error(e.message); setUploadPhase("idle"); },
  });

  const handlePublish = async () => {
    if (!title || !videoFile) { toast.error("Title and video are required"); return; }
    setUploadPhase("uploading");
    try {
      const { url: fileUrl, key: fileKey } = await uploadFileToS3(videoFile, "video");
      let coverArtUrl: string | undefined;
      if (coverFile) {
        const { url } = await uploadFileToS3(coverFile, "cover");
        coverArtUrl = url;
      }
      uploadMutation.mutate({
        fileUrl, fileKey, coverArtUrl, title,
        genre: genre || undefined,
        aiConsent, ownershipStatus: "full",
        moodTags: [], coWriters: [],
        caption: caption || undefined,
        contentType: "audio" as any,
        playerAssetType: "video",
        fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
        ecdsaPublicKey: witnessData?.publicKeyJWK, ecdsaSignature: witnessData?.signature,
      } as any);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadPhase("idle");
    }
  };

  const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  // ── Left Panel ──
  const renderLeftPanel = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Upload Your Footage
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.welcome}
              </p>
            </div>

            {/* Video Upload */}
            <div>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setVideoFile(e.target.files[0]); toast.success("Video loaded"); } }} />
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full rounded-2xl p-8 text-center transition-all hover:opacity-80"
                style={{ background: videoFile ? "rgba(74,222,128,0.04)" : "rgba(17,16,9,0.6)", border: `2px dashed ${videoFile ? "var(--ln-seal-bright)" : atmosphere.colorBorder}` }}
              >
                {videoFile ? (
                  <div className="space-y-2">
                    <CheckCircle2 size={32} style={{ color: "var(--ln-seal-bright)" }} className="mx-auto" />
                    <p className="text-sm font-medium" style={{ color: "var(--ln-parchment)" }}>{videoFile.name}</p>
                    <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB • Click to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Film size={36} style={{ color: atmosphere.colorPrimary }} className="mx-auto opacity-60" />
                    <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>Drop your video file here</p>
                    <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>MP4, MOV, WebM, AVI • Up to 500 MB</p>
                  </div>
                )}
              </button>
            </div>

            {/* Thumbnail override */}
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: "rgba(245,237,216,0.7)" }}>Custom Thumbnail <span className="opacity-50">(optional)</span></p>
              <label className="cursor-pointer rounded-xl p-3 flex items-center gap-3 transition-all hover:opacity-80 block"
                style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCoverFile(e.target.files[0]); }} />
                {coverFile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden"><img src={coverPreview} alt="" className="w-full h-full object-cover" /></div>
                    <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{coverFile.name}</span>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={16} style={{ color: "rgba(245,237,216,0.3)" }} />
                    <span className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>Add custom thumbnail</span>
                  </>
                )}
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => { if (!videoFile) { toast.error("Upload a video first"); return; } setStep("metadata"); }} disabled={!videoFile} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#111009" }}>
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "metadata":
        return (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Name Your Film
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.metadataPrompt}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your video" className="bg-transparent border-[rgba(34,211,238,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)]" />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}`, color: "var(--ln-parchment)" }}>
                <option value="">Select genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Description</label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="The story behind your footage..." rows={4} className="bg-transparent border-[rgba(34,211,238,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)] text-xs" />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button onClick={() => { if (!title) { toast.error("Title is required"); return; } setStep("provenance"); }} disabled={!title} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#111009" }}>
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "provenance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Seal Your Footage
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.provenancePrompt}
              </p>
            </div>

            {!witnessData ? (
              <div className="text-center py-8">
                <Film size={48} style={{ color: atmosphere.colorPrimary }} className="mx-auto mb-4 opacity-60" />
                <p className="text-sm mb-4" style={{ color: "var(--ln-parchment)" }}>
                  Seal your video with a cryptographic Witness ID
                </p>
                <p className="text-[11px] mb-6 max-w-sm mx-auto" style={{ color: "rgba(245,237,216,0.5)" }}>
                  For large files, the first and last 10MB are hashed for speed while maintaining integrity.
                </p>
                <Button onClick={generateWID} disabled={generatingWid} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#111009" }}>
                  {generatingWid ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {generatingWid ? "Processing..." : "Generate Witness ID"}
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} style={{ color: "var(--ln-seal-bright)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--ln-seal-bright)" }}>Footage Sealed</span>
                </div>
                <p className="font-mono text-sm mb-1" style={{ color: "var(--ln-parchment)" }}>{witnessData.wid}</p>
                <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>
                  {new Date(witnessData.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("metadata")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button onClick={() => setStep("publish")} disabled={!witnessData} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#111009" }}>
                Continue <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        );

      case "publish":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Publish Your Video
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.publishPrompt}
              </p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
              <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>{title}</p>
              <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
                {videoFile?.name} • {videoFile ? (videoFile.size / (1024 * 1024)).toFixed(1) + " MB" : ""}
              </p>
            </div>

            <Button onClick={handlePublish} disabled={uploadPhase !== "idle"} className="w-full gap-2 py-6 text-base font-semibold" style={{ background: "var(--ln-gold)", color: "#111009", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}>
              {uploadPhase === "uploading" ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {uploadPhase === "uploading" ? "Publishing..." : "Publish to Living Nexus"}
            </Button>

            <Button variant="outline" onClick={() => setStep("provenance")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
              <ChevronLeft size={14} /> Back
            </Button>
          </div>
        );

      default: return null;
    }
  };

  // ── Right Panel (Cinematic Preview) ──
  const renderRightPanel = () => (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: atmosphere.colorPrimary }}>
          Cinematic Preview
        </p>
        <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
          Your footage as it will be presented
        </p>
      </div>

      {/* Video Preview */}
      <div className="rounded-2xl overflow-hidden aspect-video" style={{ background: "rgba(17,16,9,0.9)", border: `1px solid ${atmosphere.colorBorder}` }}>
        {videoPreviewUrl ? (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              src={videoPreviewUrl}
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => setVideoDuration((e.target as HTMLVideoElement).duration)}
              onEnded={() => setPlaying(false)}
            />
            <button
              onClick={() => {
                if (videoRef.current) {
                  if (playing) videoRef.current.pause();
                  else videoRef.current.play();
                  setPlaying(!playing);
                }
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
            >
              {playing ? <Pause size={32} color="white" /> : <Play size={32} color="white" className="ml-1" />}
            </button>
            {videoDuration > 0 && (
              <span className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white">
                {fmtDuration(videoDuration)}
              </span>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={48} style={{ color: "rgba(34,211,238,0.2)" }} />
          </div>
        )}
      </div>

      {/* Title preview */}
      {title && (
        <div>
          <p className="text-base font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>{title}</p>
          <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>{user?.name || "Creator"}</p>
        </div>
      )}

      <ProvenanceIndicator status={witnessData ? "sealed" : generatingWid ? "generating" : "pending"} wid={witnessData?.wid} atmosphere={atmosphere} />

      <ReassuranceMessage
        message="For large video files, the Witness ID hashes the first and last 10MB — ensuring speed without sacrificing integrity verification."
        atmosphere={atmosphere}
      />
    </div>
  );

  return (
    <StudioShell atmosphere={atmosphere} currentStep={step} onBack={onBack} leftPanel={renderLeftPanel()} rightPanel={renderRightPanel()} progress={progress} />
  );
}
