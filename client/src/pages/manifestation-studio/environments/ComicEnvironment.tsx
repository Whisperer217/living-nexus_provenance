/* ═══════════════════════════════════════════════════════════════════
   COMIC MANIFESTATION ENVIRONMENT
   Atmosphere: coral/crimson, panel grid animations, sequencing language
   Flow: Upload pages → Metadata → Provenance → Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Palette, ChevronRight, ChevronLeft, Shield, ShieldCheck,
  Loader2, Sparkles, CheckCircle2, Zap, Image as ImageIcon, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { COMIC_CATEGORIES } from "@shared/contentTypes";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell, ProvenanceIndicator, ReassuranceMessage } from "../StudioShell";

const atmosphere = ATMOSPHERES.comic;

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

interface ComicEnvironmentProps {
  onBack: () => void;
}

export function ComicEnvironment({ onBack }: ComicEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<StudioStep>("upload");

  // Pages state
  const [pages, setPages] = useState<{ file: File; preview: string }[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const pagesInputRef = useRef<HTMLInputElement>(null);

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

  const progress = step === "upload" ? (pages.length > 0 ? 25 : 5) : step === "metadata" ? (title ? 55 : 35) : step === "provenance" ? (witnessData ? 85 : 65) : 95;

  // Handle page uploads
  const handlePagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPages = files.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPages(prev => [...prev, ...newPages]);
    toast.success(`${files.length} page${files.length > 1 ? "s" : ""} added to sequence`);
  };

  const removePage = (idx: number) => {
    setPages(prev => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // WID Generation
  const generateWID = async () => {
    if (pages.length === 0 && !documentFile) return;
    setGeneratingWid(true);
    try {
      let fileHash: string;
      if (documentFile) {
        const buffer = await documentFile.arrayBuffer();
        fileHash = await sha256Hex(buffer);
      } else {
        // Hash all pages concatenated
        const buffers = await Promise.all(pages.map(p => p.file.arrayBuffer()));
        const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of buffers) { combined.set(new Uint8Array(buf), offset); offset += buf.byteLength; }
        fileHash = await sha256Hex(combined.buffer as ArrayBuffer);
      }
      const keypair = await generateECDSAKeypair();
      const timestamp = new Date().toISOString();
      const payload = JSON.stringify({ fileHash, timestamp, pageCount: pages.length });
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const wid = `WID-COM-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
      setWitnessData({ wid, fileHash, publicKeyJWK, signature, timestamp });
      toast.success("Witness ID generated — your visual narrative is sealed");
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
        addWIDSnapshot({ wid: data.witnessId, title, creator: "", contentType: "comic", timestamp: Date.now(), verified: true });
      }
      toast.success("Your comic has been witnessed. Every panel is now permanent.");
      if (data?.songId) navigate(`/song/${data.songId}`);
      else navigate("/dashboard");
    },
    onError: (e: { message: string }) => { toast.error(e.message); setUploadPhase("idle"); },
  });

  // Helper: upload file to S3 via multipart POST
  const uploadFileToS3 = async (file: File, type: "audio" | "cover" | "video"): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("filename", file.name);
    const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: formData });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || `Upload failed (${res.status})`); }
    return res.json();
  };

  const handlePublish = async () => {
    if (!title) { toast.error("Title is required"); return; }
    if (pages.length === 0 && !documentFile) { toast.error("Add pages or upload a document"); return; }
    setUploadPhase("uploading");
    try {
      let fileUrl: string | undefined;
      let fileKey: string | undefined;
      let coverArtUrl: string | undefined;
      if (documentFile) {
        const { url, key } = await uploadFileToS3(documentFile, "audio");
        fileUrl = url; fileKey = key;
      }
      if (coverFile) {
        const { url } = await uploadFileToS3(coverFile, "cover");
        coverArtUrl = url;
      } else if (pages.length > 0) {
        const { url } = await uploadFileToS3(pages[0].file, "cover");
        coverArtUrl = url;
      }
      uploadMutation.mutate({
        fileUrl, fileKey, coverArtUrl, title,
        genre: category || undefined,
        aiConsent, ownershipStatus: "full",
        moodTags: [], coWriters: [],
        caption: caption || undefined,
        contentType: "comic" as any,
        narrativeFormat: "comic",
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
                Upload Your Pages
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.welcome}
              </p>
            </div>

            {/* Page Upload */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "rgba(245,237,216,0.7)" }}>Comic Pages (images)</p>
              <input ref={pagesInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePagesSelect} />
              <button
                onClick={() => pagesInputRef.current?.click()}
                className="w-full rounded-2xl p-6 text-center transition-all hover:opacity-80"
                style={{ background: "rgba(17,16,9,0.6)", border: `2px dashed ${atmosphere.colorBorder}` }}
              >
                <Plus size={24} style={{ color: atmosphere.colorPrimary }} className="mx-auto mb-2" />
                <p className="text-xs" style={{ color: "var(--ln-parchment)" }}>Add pages to your sequence</p>
                <p className="text-[10px] mt-1" style={{ color: "rgba(245,237,216,0.4)" }}>JPG, PNG, WebP • Select multiple</p>
              </button>

              {/* Page thumbnails */}
              {pages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {pages.map((page, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden aspect-[3/4]" style={{ border: `1px solid ${atmosphere.colorBorder}` }}>
                      <img src={page.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => removePage(i)} className="p-1 rounded-full bg-red-500/80">
                          <Trash2 size={12} color="white" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 text-[9px] px-1 rounded bg-black/60 text-white">{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Or upload document */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "rgba(245,237,216,0.7)" }}>Or upload a document (PDF, CBZ)</p>
              <label className="cursor-pointer rounded-xl p-3 flex items-center gap-3 transition-all hover:opacity-80 block"
                style={{ background: "rgba(17,16,9,0.4)", border: `1px solid rgba(196,154,40,0.08)` }}>
                <input type="file" accept=".pdf,.cbz,.cbr" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setDocumentFile(e.target.files[0]); toast.success("Document loaded"); } }} />
                <ImageIcon size={16} style={{ color: "rgba(245,237,216,0.3)" }} />
                <span className="text-[11px]" style={{ color: "rgba(245,237,216,0.4)" }}>
                  {documentFile ? documentFile.name : "Upload PDF or CBZ file"}
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => { if (pages.length === 0 && !documentFile) { toast.error("Add pages or a document first"); return; } setStep("metadata"); }} disabled={pages.length === 0 && !documentFile} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#111009" }}>
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
                Name Your Creation
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.metadataPrompt}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your comic" className="bg-transparent border-[rgba(248,113,113,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)]" />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}`, color: "var(--ln-parchment)" }}>
                <option value="">Select category</option>
                {COMIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Description</label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="The story behind your visual narrative..." rows={3} className="bg-transparent border-[rgba(248,113,113,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)] text-xs" />
            </div>

            {/* Cover art override */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: "rgba(245,237,216,0.7)" }}>Cover Art <span className="opacity-50">(defaults to first page)</span></p>
              <label className="cursor-pointer rounded-xl p-3 flex items-center gap-3 transition-all hover:opacity-80 block"
                style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setCoverFile(e.target.files[0]); }} />
                {coverFile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden"><img src={coverPreview} alt="" className="w-full h-full object-cover" /></div>
                    <span className="text-xs" style={{ color: "var(--ln-parchment)" }}>{coverFile.name}</span>
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>Upload custom cover art</span>
                )}
              </label>
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
                Seal Your Sequence
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.provenancePrompt}
              </p>
            </div>

            {!witnessData ? (
              <div className="text-center py-8">
                <Palette size={48} style={{ color: atmosphere.colorPrimary }} className="mx-auto mb-4 opacity-60" />
                <p className="text-sm mb-4" style={{ color: "var(--ln-parchment)" }}>
                  Seal your {pages.length} page{pages.length !== 1 ? "s" : ""} with a Witness ID
                </p>
                <Button onClick={generateWID} disabled={generatingWid} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#111009" }}>
                  {generatingWid ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {generatingWid ? "Sequencing..." : "Generate Witness ID"}
                </Button>
              </div>
            ) : (
              <div className="p-4 rounded-xl" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.2)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck size={16} style={{ color: "var(--ln-seal-bright)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--ln-seal-bright)" }}>Sequence Sealed</span>
                </div>
                <p className="font-mono text-sm mb-1" style={{ color: "var(--ln-parchment)" }}>{witnessData.wid}</p>
                <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>
                  {pages.length} pages witnessed • {new Date(witnessData.timestamp).toLocaleString()}
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
                Publish Your Comic
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.publishPrompt}
              </p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
              <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>{title}</p>
              <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>{pages.length} pages • {category || "Uncategorized"}</p>
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

  // ── Right Panel (Page Spread Preview) ──
  const renderRightPanel = () => (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: atmosphere.colorPrimary }}>
          Panel Sequence
        </p>
        <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
          Your pages in cinematic reading order
        </p>
      </div>

      {/* Page spread preview */}
      {pages.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {pages.slice(0, 6).map((page, i) => (
            <div key={i} className="rounded-lg overflow-hidden aspect-[3/4]" style={{ border: `1px solid ${atmosphere.colorBorder}` }}>
              <img src={page.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
          {pages.length > 6 && (
            <div className="rounded-lg flex items-center justify-center aspect-[3/4]" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}` }}>
              <span className="text-sm" style={{ color: atmosphere.colorPrimary }}>+{pages.length - 6} more</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl p-8 flex items-center justify-center min-h-[200px]" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}` }}>
          <Palette size={48} style={{ color: "rgba(248,113,113,0.2)" }} />
        </div>
      )}

      {/* Stats */}
      {pages.length > 0 && (
        <div className="flex gap-3">
          <div className="text-center p-2 rounded-lg flex-1" style={{ background: `${atmosphere.colorPrimary}08`, border: `1px solid ${atmosphere.colorBorder}` }}>
            <p className="text-lg font-bold" style={{ color: atmosphere.colorPrimary }}>{pages.length}</p>
            <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(245,237,216,0.4)" }}>Pages</p>
          </div>
        </div>
      )}

      <ProvenanceIndicator status={witnessData ? "sealed" : generatingWid ? "generating" : "pending"} wid={witnessData?.wid} atmosphere={atmosphere} />

      <ReassuranceMessage
        message="Every page in your sequence is hashed together — the Witness ID proves the exact order and content of your visual narrative."
        atmosphere={atmosphere}
      />
    </div>
  );

  return (
    <StudioShell atmosphere={atmosphere} currentStep={step} onBack={onBack} leftPanel={renderLeftPanel()} rightPanel={renderRightPanel()} progress={progress} />
  );
}
