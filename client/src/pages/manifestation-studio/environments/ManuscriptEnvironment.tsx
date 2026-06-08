/* ═══════════════════════════════════════════════════════════════════
   MANUSCRIPT MANIFESTATION ENVIRONMENT
   Atmosphere: emerald/sage, archival typography, chapter organization
   Flow: Upload document → Metadata → Provenance → Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BookOpen, ChevronRight, ChevronLeft, Shield, ShieldCheck,
  Loader2, Sparkles, CheckCircle2, Zap, FileText, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { MANUSCRIPT_CATEGORIES } from "@shared/contentTypes";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell, ProvenanceIndicator, ReassuranceMessage } from "../StudioShell";

const atmosphere = ATMOSPHERES.manuscript;

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

interface ManuscriptEnvironmentProps {
  onBack: () => void;
}

export function ManuscriptEnvironment({ onBack }: ManuscriptEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<StudioStep>("upload");

  // File state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const docInputRef = useRef<HTMLInputElement>(null);

  // Metadata
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [caption, setCaption] = useState("");
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");

  // Provenance
  const [witnessData, setWitnessData] = useState<{ wid: string; fileHash: string; publicKeyJWK: string; signature: string; timestamp: string } | null>(null);
  const [generatingWid, setGeneratingWid] = useState(false);

  // Upload
  const [uploadPhase, setUploadPhase] = useState<"idle" | "uploading" | "done">("idle");

  // Cover preview
  useEffect(() => {
    if (coverFile) { const url = URL.createObjectURL(coverFile); setCoverPreview(url); return () => URL.revokeObjectURL(url); }
    setCoverPreview("");
  }, [coverFile]);

  const progress = step === "upload" ? (documentFile ? 25 : 5) : step === "metadata" ? (title ? 55 : 35) : step === "provenance" ? (witnessData ? 85 : 65) : 95;

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
    if (!documentFile) return;
    setGeneratingWid(true);
    try {
      const buffer = await documentFile.arrayBuffer();
      const fileHash = await sha256Hex(buffer);
      const keypair = await generateECDSAKeypair();
      const timestamp = new Date().toISOString();
      const payload = JSON.stringify({ fileHash, timestamp });
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const wid = `WID-MAN-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
      setWitnessData({ wid, fileHash, publicKeyJWK, signature, timestamp });
      toast.success("Witness ID generated — your manuscript is now archived");
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
        addWIDSnapshot({ wid: data.witnessId, title, creator: "", contentType: "manuscript", timestamp: Date.now(), verified: true });
      }
      toast.success("Your manuscript has been witnessed. Authorship is permanent.");
      if (data?.songId) navigate(`/song/${data.songId}`);
      else navigate("/dashboard");
    },
    onError: (e: { message: string }) => { toast.error(e.message); setUploadPhase("idle"); },
  });

  const handlePublish = async () => {
    if (!title || !documentFile) { toast.error("Title and document are required"); return; }
    setUploadPhase("uploading");
    try {
      const { url: fileUrl, key: fileKey } = await uploadFileToS3(documentFile, "audio");
      let coverArtUrl: string | undefined;
      if (coverFile) {
        const { url } = await uploadFileToS3(coverFile, "cover");
        coverArtUrl = url;
      }
      uploadMutation.mutate({
        fileUrl, fileKey, coverArtUrl, title,
        genre: category || undefined,
        aiConsent, ownershipStatus: "full",
        moodTags: [], coWriters: [],
        caption: caption || undefined,
        contentType: "manuscript" as any,
        narrativeFormat: "manuscript",
        fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
        ecdsaPublicKey: witnessData?.publicKeyJWK, ecdsaSignature: witnessData?.signature,
      } as any);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadPhase("idle");
    }
  };

  // ── Left Panel ──
  const renderLeftPanel = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Submit Your Manuscript
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.welcome}
              </p>
            </div>

            {/* Document Upload */}
            <div>
              <input ref={docInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.epub,.rtf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setDocumentFile(e.target.files[0]); toast.success("Manuscript received"); } }} />
              <button
                onClick={() => docInputRef.current?.click()}
                className="w-full rounded-2xl p-8 text-center transition-all hover:opacity-80"
                style={{ background: documentFile ? "rgba(74,222,128,0.04)" : "rgba(17,16,9,0.6)", border: `2px dashed ${documentFile ? "var(--ln-seal-bright)" : atmosphere.colorBorder}` }}
              >
                {documentFile ? (
                  <div className="space-y-2">
                    <CheckCircle2 size={32} style={{ color: "var(--ln-seal-bright)" }} className="mx-auto" />
                    <p className="text-sm font-medium" style={{ color: "var(--ln-parchment)" }}>{documentFile.name}</p>
                    <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
                      {(documentFile.size / (1024 * 1024)).toFixed(1)} MB • Click to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <BookOpen size={36} style={{ color: atmosphere.colorPrimary }} className="mx-auto opacity-60" />
                    <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>Drop your manuscript here</p>
                    <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>PDF, DOCX, TXT, EPUB, RTF • Up to 200 MB</p>
                  </div>
                )}
              </button>
            </div>

            {/* Cover Art */}
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: "rgba(245,237,216,0.7)" }}>Cover Art <span className="opacity-50">(optional)</span></p>
              <label className="cursor-pointer rounded-xl p-3 flex items-center gap-3 transition-all hover:opacity-80 block"
                style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCoverFile(e.target.files[0]); }} />
                {coverFile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden"><img src={coverPreview} alt="" className="w-full h-full object-cover" /></div>
                    <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{coverFile.name}</span>
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>Add book cover art</span>
                )}
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => { if (!documentFile) { toast.error("Upload a document first"); return; } setStep("metadata"); }} disabled={!documentFile} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
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
                Catalog Your Work
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.metadataPrompt}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your manuscript" className="bg-transparent border-[rgba(52,211,153,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)]" />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}`, color: "var(--ln-parchment)" }}>
                <option value="">Select category</option>
                {MANUSCRIPT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Description</label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What is this manuscript about?" rows={4} className="bg-transparent border-[rgba(52,211,153,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)] text-xs" />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1" style={{ borderColor: atmosphere.colorBorder, color: "var(--ln-parchment)" }}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button onClick={() => { if (!title) { toast.error("Title is required"); return; } setStep("provenance"); }} disabled={!title} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
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
                Seal Your Archive
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.provenancePrompt}
              </p>
            </div>

            {!witnessData ? (
              <div className="text-center py-8">
                <BookOpen size={48} style={{ color: atmosphere.colorPrimary }} className="mx-auto mb-4 opacity-60" />
                <p className="text-sm mb-4" style={{ color: "var(--ln-parchment)" }}>
                  Seal your manuscript with a cryptographic Witness ID
                </p>
                <p className="text-[11px] mb-6 max-w-sm mx-auto" style={{ color: "rgba(245,237,216,0.5)" }}>
                  This creates a SHA-256 hash of your document — proving you possessed this exact manuscript at this moment.
                </p>
                <Button onClick={generateWID} disabled={generatingWid} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
                  {generatingWid ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {generatingWid ? "Archiving..." : "Generate Witness ID"}
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} style={{ color: "var(--ln-seal-bright)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--ln-seal-bright)" }}>Archive Sealed</span>
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
              <Button onClick={() => setStep("publish")} disabled={!witnessData} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
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
                Publish Your Manuscript
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.publishPrompt}
              </p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
              <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>{title}</p>
              <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>{documentFile?.name} • {category || "Uncategorized"}</p>
            </div>

            <Button onClick={handlePublish} disabled={uploadPhase !== "idle"} className="w-full gap-2 py-6 text-base font-semibold" style={{ background: "var(--ln-gold)", color: "#000000", boxShadow: "0 4px 20px rgba(212,175,55,0.3)" }}>
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

  // ── Right Panel ──
  const renderRightPanel = () => (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: atmosphere.colorPrimary }}>
          Archival Preview
        </p>
        <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
          Your manuscript as it will be cataloged
        </p>
      </div>

      {/* Document Preview */}
      <div className="rounded-2xl p-6 min-h-[250px] flex items-center justify-center" style={{ background: "rgba(17,16,9,0.9)", border: `1px solid ${atmosphere.colorBorder}` }}>
        {coverPreview ? (
          <img src={coverPreview} alt="Cover" className="max-h-[300px] rounded-lg shadow-xl" />
        ) : documentFile ? (
          <div className="text-center space-y-3">
            <FileText size={48} style={{ color: atmosphere.colorPrimary }} className="mx-auto opacity-60" />
            <p className="text-sm" style={{ color: "var(--ln-parchment)" }}>{documentFile.name}</p>
            <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>
              {(documentFile.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
        ) : (
          <BookOpen size={48} style={{ color: "rgba(52,211,153,0.2)" }} />
        )}
      </div>

      {/* Title preview */}
      {title && (
        <div className="text-center">
          <p className="text-base font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>{title}</p>
          <p className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>{user?.name || "Author"}</p>
        </div>
      )}

      <ProvenanceIndicator status={witnessData ? "sealed" : generatingWid ? "generating" : "pending"} wid={witnessData?.wid} atmosphere={atmosphere} />

      <ReassuranceMessage
        message="Your manuscript is hashed byte-for-byte. The Witness ID proves you possessed this exact document at the recorded timestamp."
        atmosphere={atmosphere}
      />
    </div>
  );

  return (
    <StudioShell atmosphere={atmosphere} currentStep={step} onBack={onBack} leftPanel={renderLeftPanel()} rightPanel={renderRightPanel()} progress={progress} />
  );
}
