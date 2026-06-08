/* ═══════════════════════════════════════════════════════════════════
   LYRICS MANIFESTATION ENVIRONMENT
   Atmosphere: amber/parchment, quill animations, inscription language
   Flow: Write lyrics → Metadata → Provenance → Publish
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  PenTool, ChevronRight, ChevronLeft, Shield, ShieldCheck,
  Loader2, Sparkles, CheckCircle2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { addWIDSnapshot } from "@/lib/lnxCache";
import { UPLOAD_GENRES as GENRES, MOODS } from "@shared/contentTypes";
import { ATMOSPHERES, type StudioStep } from "../types";
import { StudioShell, ProvenanceIndicator, ReassuranceMessage } from "../StudioShell";

const atmosphere = ATMOSPHERES.lyrics;

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

interface LyricsEnvironmentProps {
  onBack: () => void;
}

export function LyricsEnvironment({ onBack }: LyricsEnvironmentProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState<StudioStep>("upload");

  // Content state
  const [lyrics, setLyrics] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  // Metadata
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">("prohibited");
  const [caption, setCaption] = useState("");

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

  const progress = step === "upload" ? (lyrics.length > 20 ? 25 : 5) : step === "metadata" ? (title ? 55 : 35) : step === "provenance" ? (witnessData ? 85 : 65) : 95;

  // WID Generation (hash the lyrics text)
  const generateWID = async () => {
    if (!lyrics.trim()) return;
    setGeneratingWid(true);
    try {
      const buffer = new TextEncoder().encode(lyrics).buffer as ArrayBuffer;
      const fileHash = await sha256Hex(buffer);
      const keypair = await generateECDSAKeypair();
      const timestamp = new Date().toISOString();
      const payload = JSON.stringify({ fileHash, timestamp });
      const signature = await signPayload(keypair.privateKey, payload);
      const publicKeyJWK = await exportPublicKeyJWK(keypair.publicKey);
      const wid = `WID-LYR-${fileHash.slice(0, 8).toUpperCase()}-${fileHash.slice(8, 16).toUpperCase()}`;
      setWitnessData({ wid, fileHash, publicKeyJWK, signature, timestamp });
      toast.success("Witness ID inscribed — your words are now sealed");
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
        addWIDSnapshot({ wid: data.witnessId, title, creator: "", contentType: "lyrics", timestamp: Date.now(), verified: true });
      }
      toast.success("Your lyrics have been witnessed. Authorship is now permanent.");
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
    if (!title || !lyrics.trim()) { toast.error("Title and lyrics are required"); return; }
    setUploadPhase("uploading");
    try {
      let coverArtUrl: string | undefined;
      if (coverFile) {
        const { url } = await uploadFileToS3(coverFile, "cover");
        coverArtUrl = url;
      }
      uploadMutation.mutate({
        coverArtUrl, title, genre: genre || undefined,
        aiConsent, ownershipStatus: "full",
        moodTags: selectedMoods, coWriters: [],
        caption: caption || undefined,
        contentType: "lyrics" as any,
        lyrics,
        fileHash: witnessData?.fileHash, witnessId: witnessData?.wid,
        ecdsaPublicKey: witnessData?.publicKeyJWK, ecdsaSignature: witnessData?.signature,
      } as any);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      setUploadPhase("idle");
    }
  };

  // Verse count
  const verseCount = lyrics.split(/\n\s*\n/).filter(v => v.trim()).length;
  const lineCount = lyrics.split("\n").filter(l => l.trim()).length;
  const wordCount = lyrics.split(/\s+/).filter(w => w).length;

  // ── Left Panel ──
  const renderLeftPanel = () => {
    switch (step) {
      case "upload":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Inscribe Your Words
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.welcome}
              </p>
            </div>

            {/* Lyrics Input */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "rgba(245,237,216,0.7)" }}>Your Lyrics *</label>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder={"Write your lyrics here...\n\nSeparate verses with blank lines.\nEach verse becomes a witnessed block."}
                rows={16}
                className="bg-transparent text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)] text-sm leading-relaxed"
                style={{ border: `1px solid ${atmosphere.colorBorder}`, fontFamily: "'Cormorant Garamond', serif", fontSize: "15px" }}
              />
              <div className="flex gap-4 mt-2">
                <span className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>{wordCount} words</span>
                <span className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>{lineCount} lines</span>
                <span className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>{verseCount} verses</span>
              </div>
            </div>

            {/* Cover Art (optional) */}
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
                  <span className="text-xs" style={{ color: "rgba(245,237,216,0.5)" }}>Add cover art for display</span>
                )}
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => { if (!lyrics.trim()) { toast.error("Write some lyrics first"); return; } setStep("metadata"); }} disabled={!lyrics.trim()} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
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
                Name Your Inscription
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.metadataPrompt}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name your lyrics" className="bg-transparent border-[rgba(245,196,81,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)]" />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(17,16,9,0.8)", border: `1px solid ${atmosphere.colorBorder}`, color: "var(--ln-parchment)" }}>
                <option value="">Select genre</option>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: "rgba(245,237,216,0.7)" }}>Mood Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.slice(0, 12).map(m => (
                  <button key={m} onClick={() => setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
                    className="px-2.5 py-1 rounded-full text-[10px] transition-all"
                    style={{ background: selectedMoods.includes(m) ? `${atmosphere.colorPrimary}20` : "rgba(17,16,9,0.6)", border: `1px solid ${selectedMoods.includes(m) ? atmosphere.colorPrimary : "rgba(196,154,40,0.12)"}`, color: selectedMoods.includes(m) ? atmosphere.colorPrimary : "rgba(245,237,216,0.5)" }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "rgba(245,237,216,0.7)" }}>Description</label>
              <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="The story behind these words..." rows={3} className="bg-transparent border-[rgba(245,196,81,0.2)] text-[var(--ln-parchment)] placeholder:text-[rgba(245,237,216,0.3)] text-xs" />
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
                Seal Your Inscription
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.provenancePrompt}
              </p>
            </div>

            {!witnessData ? (
              <div className="text-center py-8">
                <PenTool size={48} style={{ color: atmosphere.colorPrimary }} className="mx-auto mb-4 opacity-60" />
                <p className="text-sm mb-4" style={{ color: "var(--ln-parchment)" }}>
                  Seal your lyrics with a cryptographic Witness ID
                </p>
                <p className="text-[11px] mb-6 max-w-sm mx-auto" style={{ color: "rgba(245,237,216,0.5)" }}>
                  This hashes your exact lyrics text and signs it — proving you authored these words at this moment.
                </p>
                <Button onClick={generateWID} disabled={generatingWid} className="gap-2" style={{ background: atmosphere.colorPrimary, color: "#000000" }}>
                  {generatingWid ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {generatingWid ? "Inscribing..." : "Generate Witness ID"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} style={{ color: "var(--ln-seal-bright)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--ln-seal-bright)" }}>Inscription Sealed</span>
                  </div>
                  <p className="font-mono text-sm mb-1" style={{ color: "var(--ln-parchment)" }}>{witnessData.wid}</p>
                  <p className="text-[10px]" style={{ color: "rgba(245,237,216,0.4)" }}>
                    {wordCount} words witnessed • {new Date(witnessData.timestamp).toLocaleString()}
                  </p>
                </div>
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
                Publish Your Inscription
              </h2>
              <p className="text-sm italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}>
                {atmosphere.language.publishPrompt}
              </p>
            </div>

            <div className="p-3 rounded-lg" style={{ background: "rgba(17,16,9,0.6)", border: `1px solid ${atmosphere.colorBorder}` }}>
              <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>{title}</p>
              <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>{wordCount} words • {verseCount} verses</p>
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

  // ── Right Panel (Live Verse Preview) ──
  const renderRightPanel = () => (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: atmosphere.colorPrimary }}>
          Archival Preview
        </p>
        <p className="text-[11px]" style={{ color: "rgba(245,237,216,0.5)" }}>
          Your lyrics rendered in archival typography
        </p>
      </div>

      {/* Verse Preview */}
      <div className="rounded-2xl p-6 min-h-[300px]" style={{ background: "rgba(17,16,9,0.9)", border: `1px solid ${atmosphere.colorBorder}` }}>
        {lyrics.trim() ? (
          <div className="space-y-4">
            {title && <p className="text-base font-bold text-center mb-4" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>{title}</p>}
            {lyrics.split(/\n\s*\n/).filter(v => v.trim()).map((verse, i) => (
              <div key={i} className="pb-3 border-b last:border-b-0" style={{ borderColor: "rgba(245,196,81,0.08)" }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: atmosphere.colorPrimary }}>
                  Verse {i + 1}
                </p>
                {verse.split("\n").map((line, j) => (
                  <p key={j} className="text-sm leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif", color: "var(--ln-parchment)" }}>
                    {line || <span>&nbsp;</span>}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full opacity-30">
            <PenTool size={48} style={{ color: atmosphere.colorPrimary }} />
          </div>
        )}
      </div>

      {/* Stats */}
      {lyrics.trim() && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Words", value: wordCount },
            { label: "Lines", value: lineCount },
            { label: "Verses", value: verseCount },
          ].map((stat, i) => (
            <div key={i} className="text-center p-2 rounded-lg" style={{ background: `${atmosphere.colorPrimary}08`, border: `1px solid ${atmosphere.colorBorder}` }}>
              <p className="text-lg font-bold" style={{ color: atmosphere.colorPrimary }}>{stat.value}</p>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(245,237,216,0.4)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <ProvenanceIndicator status={witnessData ? "sealed" : generatingWid ? "generating" : "pending"} wid={witnessData?.wid} atmosphere={atmosphere} />

      <ReassuranceMessage
        message={step === "upload" ? "Your lyrics are processed entirely in your browser. Nothing is sent until you publish." : "Each word is part of the cryptographic hash — changing even a comma creates a different Witness ID."}
        atmosphere={atmosphere}
      />
    </div>
  );

  return (
    <StudioShell atmosphere={atmosphere} currentStep={step} onBack={onBack} leftPanel={renderLeftPanel()} rightPanel={renderRightPanel()} progress={progress} />
  );
}
