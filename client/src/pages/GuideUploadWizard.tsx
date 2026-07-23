/* ═══════════════════════════════════════════════════════════════════
   GUIDE UPLOAD WIZARD — 6-Step Provenance Flow
   Mirrors the Manifestation Studio pattern:
   - Single step at a time (no multi-column grid)
   - StudioShell-style top bar with step progress
   - Split layout: left (guided form) / right (live preview)
   - Cathedral design: dark bg, Cinzel headings, amber/gold accents
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Sparkles, Loader2, Upload, ChevronLeft, Shield, Check,
  FileText, Image, Eye, Lock, Zap, Globe,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SymbolItem { name: string; label: string; iconUrl?: string }
interface ExtractedImage { url: string; filename: string }

interface GuideFormData {
  provenanceSheetUrl: string;
  artworkUrl: string;
  extractedImages: ExtractedImage[];
  canonicalName: string;
  tagline: string;
  archetypeType: string;
  role: string;
  alignment: string;
  domain: string;
  firstManifested: string;
  widCode: string;
  testimony: string;
  loreDescription: string;
  symbols: SymbolItem[];
  rightsOriginalOwnership: boolean;
  rightsPlatformUsage: boolean;
  rightsDerivativeAdaptation: boolean;
  rightsMerchandising: boolean;
  rightsCommercialization: boolean;
  rightsAttributionRequired: boolean;
  protectUnauthorizedUse: boolean;
  requireAttributionOnDerivatives: boolean;
  lockCanonicalIdentity: boolean;
  allowGuideAppearances: boolean;
  revenueCreatorPct: number;
  stripeConnected: boolean;
}

const DEFAULT_FORM: GuideFormData = {
  provenanceSheetUrl: "",
  artworkUrl: "",
  extractedImages: [],
  canonicalName: "",
  tagline: "",
  archetypeType: "",
  role: "",
  alignment: "",
  domain: "",
  firstManifested: "",
  widCode: "",
  testimony: "",
  loreDescription: "",
  symbols: [],
  rightsOriginalOwnership: true,
  rightsPlatformUsage: true,
  rightsDerivativeAdaptation: true,
  rightsMerchandising: true,
  rightsCommercialization: true,
  rightsAttributionRequired: true,
  protectUnauthorizedUse: true,
  requireAttributionOnDerivatives: true,
  lockCanonicalIdentity: true,
  allowGuideAppearances: true,
  revenueCreatorPct: 90,
  stripeConnected: false,
};

// ─── Step Definitions ─────────────────────────────────────────────────────────
const GUIDE_STEPS = [
  { num: 1, label: "SUBMIT SHEET",        sub: "Provenance sheet & artwork"   },
  { num: 2, label: "EXTRACT & PREVIEW",   sub: "AI extracts key details"      },
  { num: 3, label: "REVIEW & CONFIRM",    sub: "Confirm extracted info"       },
  { num: 4, label: "RIGHTS & PERMISSIONS",sub: "Usage rights & preferences"  },
  { num: 5, label: "CONNECT CREATOR",     sub: "Connect Stripe for payouts"  },
  { num: 6, label: "PUBLISH GUIDE",       sub: "Guide goes live"             },
];

const ATM = {
  gold:    "#C9A84C",
  glow:    "rgba(201,168,76,0.35)",
  border:  "rgba(201,168,76,0.18)",
  bg:      "#000000",
  bgPanel: "rgba(10,8,0,0.97)",
  bgCard:  "rgba(10,8,0,0.6)",
  text:    "#e8d5a0",
  textDim: "rgba(245,237,216,0.5)",
  textFaint:"rgba(245,237,216,0.35)",
};

// ─── Shell ────────────────────────────────────────────────────────────────────
function GuideShell({
  currentStep, onBack, leftPanel, rightPanel,
}: {
  currentStep: number;
  onBack: () => void;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}) {
  const progress = ((currentStep - 1) / (GUIDE_STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: ATM.bg }}>
      {/* Top Bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-20 backdrop-blur-sm flex-shrink-0"
        style={{ borderColor: ATM.border, background: ATM.bgPanel }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-opacity hover:opacity-70"
          style={{ color: ATM.gold }}
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: ATM.gold }}>✦</span>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: "'Cinzel', serif", color: ATM.gold }}>
              Upload Guide Character
            </p>
            <p className="text-[9px] italic" style={{ fontFamily: "'Cormorant Garamond', serif", color: ATM.textDim }}>
              From Provenance Sheet to Living Nexus Canon
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 ml-auto overflow-x-auto">
          {GUIDE_STEPS.map((s, i) => {
            const isActive = s.num === currentStep;
            const isDone   = s.num < currentStep;
            return (
              <div key={s.num} className="flex items-center gap-1 flex-shrink-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                  style={{
                    background: isDone || isActive ? ATM.gold : "rgba(201,168,76,0.08)",
                    color:      isDone || isActive ? "#000"    : "rgba(201,168,76,0.4)",
                    border:     `1px solid ${isDone || isActive ? ATM.gold : "rgba(201,168,76,0.15)"}`,
                    boxShadow:  isActive ? `0 0 12px ${ATM.glow}` : "none",
                  }}
                >
                  {isDone ? <Check size={10} /> : s.num}
                </div>
                <span
                  className="text-[10px] hidden lg:inline"
                  style={{ color: isActive ? ATM.gold : isDone ? "rgba(201,168,76,0.7)" : ATM.textFaint }}
                >
                  {s.label}
                </span>
                {i < GUIDE_STEPS.length - 1 && (
                  <div className="w-3 h-px mx-1 hidden lg:block" style={{ background: isDone ? ATM.gold : "rgba(201,168,76,0.12)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full flex-shrink-0" style={{ background: "rgba(201,168,76,0.08)" }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${ATM.gold}, #f5c451)`, boxShadow: `0 0 8px ${ATM.glow}` }}
        />
      </div>

      {/* Split layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left — form */}
        <div className="flex-1 lg:w-[58%] lg:flex-none overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${ATM.gold}40 transparent` }}>
          <div className="p-6 md:p-8 lg:p-10 max-w-2xl mx-auto">
            {leftPanel}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px flex-shrink-0" style={{ background: `linear-gradient(to bottom, transparent, ${ATM.border}, transparent)` }} />

        {/* Right — preview */}
        <div
          className="lg:w-[42%] lg:flex-none overflow-y-auto border-t lg:border-t-0"
          style={{
            borderColor: ATM.border,
            background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(30,26,14,0.95) 50%, rgba(10,8,0,1) 100%)",
            scrollbarWidth: "thin", scrollbarColor: `${ATM.gold}40 transparent`,
          }}
        >
          <div className="p-6 md:p-8 lg:p-10">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function StepHeader({ num, title, sub }: { num: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: ATM.gold, color: "#000", boxShadow: `0 0 16px ${ATM.glow}` }}>
        {num}
      </div>
      <div>
        <h2 className="text-lg font-bold tracking-widest uppercase" style={{ fontFamily: "'Cinzel', serif", color: ATM.gold }}>
          {title}
        </h2>
        <p className="text-sm mt-0.5" style={{ color: ATM.textDim }}>{sub}</p>
      </div>
    </div>
  );
}

function Reassurance({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg mt-4"
      style={{ background: "rgba(201,168,76,0.06)", border: `1px solid ${ATM.border}` }}>
      <span className="text-sm flex-shrink-0 mt-0.5" style={{ color: ATM.gold }}>✦</span>
      <p className="text-[11px] italic leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif", color: ATM.textDim }}>
        {text}
      </p>
    </div>
  );
}

function ProvenanceStatus({ wid, active }: { wid?: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: wid ? "rgba(74,222,128,0.06)" : "rgba(201,168,76,0.04)", border: `1px solid ${wid ? "rgba(74,222,128,0.25)" : ATM.border}` }}>
      <Shield size={14} style={{ color: wid ? "#4ade80" : active ? ATM.gold : "rgba(201,168,76,0.3)" }} className={active && !wid ? "animate-pulse" : ""} />
      <div>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: wid ? "#4ade80" : ATM.textDim }}>
          {wid ? "Provenance Sealed" : active ? "Sealing Provenance…" : "Awaiting Provenance"}
        </p>
        {wid && <p className="text-[11px] font-mono" style={{ color: "#4ade80" }}>{wid}</p>}
      </div>
    </div>
  );
}

// ─── Step 1: Submit Sheet ─────────────────────────────────────────────────────
function Step1Upload({ form, setForm, onNext }: { form: GuideFormData; setForm: (f: GuideFormData) => void; onNext: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [sheetFile, setSheetFile] = useState<{ name: string; size: string } | null>(null);
  const [artMode, setArtMode] = useState<"upload" | "generate">("upload");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const sheetRef = useRef<HTMLInputElement>(null);
  const artRef   = useRef<HTMLInputElement>(null);
  const generateImageMutation = trpc.guides.generateImage.useMutation();

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "cover");
    fd.append("filename", file.name);
    const res = await fetch("/api/upload-file", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url as string;
  };

  const handleSheetChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm({ ...form, provenanceSheetUrl: url });
      setSheetFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + " MB" });
      toast.success("Provenance sheet uploaded");
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  }, [form, setForm]);

  const handleArtChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm({ ...form, artworkUrl: url });
      toast.success("Artwork uploaded");
    } catch { toast.error("Artwork upload failed"); } finally { setUploading(false); }
  }, [form, setForm]);

  const handleGenerateArt = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const result = await generateImageMutation.mutateAsync({ prompt: aiPrompt });
      if (result.url) {
        setForm({ ...form, artworkUrl: result.url });
        toast.success("Artwork generated");
      }
    } catch { toast.error("Generation failed"); } finally { setAiGenerating(false); }
  };

  return (
    <div>
      <StepHeader num={1} title="Submit Provenance Sheet" sub="Upload your character's provenance sheet and artwork to begin." />

      {/* Sheet drop zone */}
      <div className="space-y-3 mb-8">
        <Label className="text-xs font-bold tracking-widest uppercase block" style={{ color: "rgba(201,168,76,0.8)" }}>
          Provenance Sheet <span style={{ color: ATM.gold }}>*</span>
        </Label>
        <div
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
          style={{ borderColor: form.provenanceSheetUrl ? ATM.gold : "rgba(201,168,76,0.2)", background: form.provenanceSheetUrl ? "rgba(201,168,76,0.04)" : "rgba(10,8,0,0.4)" }}
          onDragOver={e => e.preventDefault()}
          onDrop={async e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (!file) return;
            setUploading(true);
            try { const url = await uploadFile(file); setForm({ ...form, provenanceSheetUrl: url }); setSheetFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + " MB" }); toast.success("Uploaded"); } catch { toast.error("Upload failed"); } finally { setUploading(false); }
          }}
          onClick={() => sheetRef.current?.click()}
        >
          {sheetFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={20} style={{ color: ATM.gold }} />
              <div className="text-left">
                <div className="text-sm font-medium" style={{ color: ATM.text }}>{sheetFile.name}</div>
                <div className="text-xs" style={{ color: ATM.textFaint }}>{sheetFile.size}</div>
              </div>
              <Check size={16} className="text-green-400 ml-2" />
            </div>
          ) : (
            <div>
              <FileText size={32} className="mx-auto mb-3" style={{ color: "rgba(201,168,76,0.35)" }} />
              <p className="text-sm font-medium mb-1" style={{ color: ATM.textDim }}>Drop your provenance sheet here or click to upload</p>
              <p className="text-xs" style={{ color: ATM.textFaint }}>PNG, JPG, PDF · Max 50MB</p>
            </div>
          )}
          <input ref={sheetRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleSheetChange} />
        </div>
      </div>

      {/* Artwork */}
      <div className="space-y-3 mb-8">
        <Label className="text-xs font-bold tracking-widest uppercase block" style={{ color: "rgba(201,168,76,0.8)" }}>Character Artwork</Label>
        <div className="flex gap-2 mb-3">
          {(["upload", "generate"] as const).map(mode => (
            <button key={mode} onClick={() => setArtMode(mode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: artMode === mode ? "rgba(201,168,76,0.15)" : "transparent", border: `1px solid ${artMode === mode ? "rgba(201,168,76,0.6)" : "rgba(201,168,76,0.15)"}`, color: artMode === mode ? ATM.gold : ATM.textFaint }}>
              {mode === "upload" ? <Upload size={12} /> : <Sparkles size={12} />}
              {mode === "upload" ? "Upload Image" : "Generate with AI"}
            </button>
          ))}
        </div>

        {artMode === "upload" ? (
          <div className="border rounded-xl p-6 text-center cursor-pointer transition-all"
            style={{ borderColor: form.artworkUrl ? ATM.gold : "rgba(201,168,76,0.15)", background: "rgba(10,8,0,0.4)" }}
            onClick={() => artRef.current?.click()}>
            {form.artworkUrl ? (
              <img src={form.artworkUrl} alt="Artwork" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div>
                <Image size={28} className="mx-auto mb-2" style={{ color: "rgba(201,168,76,0.35)" }} />
                <p className="text-sm" style={{ color: ATM.textDim }}>Click to upload artwork image</p>
                <p className="text-xs mt-1" style={{ color: ATM.textFaint }}>PNG, JPG, WEBP · Max 50MB</p>
              </div>
            )}
            <input ref={artRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={handleArtChange} />
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="Describe your guide character's appearance, style, and essence… e.g. 'A cloaked archivist with glowing amber eyes, surrounded by floating ancient scrolls, dark fantasy oil painting style'"
              className="min-h-[100px] text-sm resize-none"
              style={{ background: "rgba(10,8,0,0.6)", borderColor: "rgba(201,168,76,0.2)", color: ATM.text }} />
            <Button onClick={handleGenerateArt} disabled={aiGenerating || !aiPrompt.trim()} className="w-full font-semibold"
              style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.5)", color: ATM.gold }}>
              {aiGenerating ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Generating…</span> : <span className="flex items-center gap-2"><Sparkles size={14} /> Generate Character Artwork</span>}
            </Button>
            {form.artworkUrl && <img src={form.artworkUrl} alt="Generated" className="w-full max-h-64 object-contain rounded-lg border" style={{ borderColor: "rgba(201,168,76,0.2)" }} />}
          </div>
        )}
      </div>

      <Reassurance text="Your provenance sheet is the origin document — it anchors your character's identity to a moment in time. Upload it here and we'll extract the key details automatically." />

      <Button className="w-full mt-8 py-3 text-base font-bold" style={{ background: ATM.gold, color: "#000" }}
        disabled={!form.provenanceSheetUrl || uploading} onClick={onNext}>
        {uploading ? "Uploading…" : "Continue to Extract →"}
      </Button>
    </div>
  );
}

// ─── Step 1 Right Panel ───────────────────────────────────────────────────────
function Step1Preview({ form }: { form: GuideFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Cinzel', serif", color: "rgba(201,168,76,0.6)" }}>How the System Works</p>
        <div className="space-y-4">
          {[
            { icon: "1", label: "Submit Provenance Sheet", desc: "You submit your sheet and artwork" },
            { icon: "→", label: "System Extracts Information", desc: "We extract key data and imagery" },
            { icon: "✓", label: "You Review & Confirm", desc: "You choose how to confirm the extracted data" },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: "rgba(201,168,76,0.15)", color: ATM.gold, border: "1px solid rgba(201,168,76,0.3)" }}>{item.icon}</div>
              <div>
                <div className="text-xs font-semibold" style={{ color: ATM.text }}>{item.label}</div>
                <div className="text-xs mt-0.5" style={{ color: ATM.textDim }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-6" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "'Cinzel', serif", color: "rgba(201,168,76,0.6)" }}>Derivative Example Flow</p>
        <div className="grid grid-cols-3 gap-2">
          {[{ label: "Original Guide", emoji: "📜" }, { label: "Comic Appearance", emoji: "🎨" }, { label: "Animated Variant", emoji: "🎬" }].map(item => (
            <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)" }}>
              <div className="text-2xl mb-1">{item.emoji}</div>
              <div className="text-[10px]" style={{ color: ATM.textDim }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-6" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ fontFamily: "'Cinzel', serif", color: "rgba(201,168,76,0.6)" }}>Built on Provenance</p>
        <div className="space-y-2">
          {["Immutable Lineage", "Creator Protection", "Transparent Attribution", "Fair Revenue Distribution"].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs" style={{ color: ATM.textDim }}>
              <Check size={12} style={{ color: ATM.gold }} /> {item}
            </div>
          ))}
        </div>
      </div>

      <ProvenanceStatus wid={undefined} active={!!form.provenanceSheetUrl} />
    </div>
  );
}

// ─── Step 2: Extract & Preview ────────────────────────────────────────────────
function Step2Extract({ form, setForm, guideId, onNext, onBack }: { form: GuideFormData; setForm: (f: GuideFormData) => void; guideId: number; onNext: () => void; onBack: () => void }) {
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const extract = trpc.guides.extractFromSheet.useMutation();

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const result = await extract.mutateAsync({ guideId, fileUrl: form.provenanceSheetUrl });
      if (result.guide) {
        const g = result.guide;
        setForm({
          ...form,
          canonicalName:   (g.canonicalName   as string) || form.canonicalName,
          tagline:         (g.tagline         as string) || "",
          archetypeType:   (g.archetypeType   as string) || "",
          role:            (g.role            as string) || "",
          alignment:       (g.alignment       as string) || "",
          domain:          (g.domain          as string) || "",
          firstManifested: (g.firstManifested as string) || "",
          widCode:         (g.widCode         as string) || "",
          testimony:       (g.testimony       as string) || "",
          loreDescription: (g.loreDescription as string) || "",
          symbols:         (g.symbolsJson     as SymbolItem[]) || [],
        });
      }
      setExtracted(true);
      toast.success("Extraction complete");
    } catch {
      toast.error("Extraction failed — you can fill in details manually");
      setExtracted(true);
    } finally { setExtracting(false); }
  };

  return (
    <div>
      <StepHeader num={2} title="Extract & Preview" sub="Our system reads your provenance sheet and extracts the key details." />

      {!extracted ? (
        <div className="space-y-6">
          <div className="rounded-xl p-6 text-center" style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
            <Sparkles size={32} className="mx-auto mb-3" style={{ color: ATM.gold }} />
            <p className="text-sm font-medium mb-1" style={{ color: ATM.text }}>Ready to Extract</p>
            <p className="text-xs" style={{ color: ATM.textDim }}>We'll analyze your provenance sheet and extract the canonical name, archetype, testimony, symbols, and more.</p>
          </div>
          <Reassurance text="The extraction reads your provenance sheet as the source of truth. You'll be able to review and edit everything in the next step." />
          <Button className="w-full py-3 text-base font-bold" style={{ background: ATM.gold, color: "#000" }} onClick={handleExtract} disabled={extracting}>
            {extracting ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Extracting Provenance…</span> : <span className="flex items-center gap-2"><Sparkles size={16} /> Extract from Provenance Sheet</span>}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Check size={16} className="text-green-400" />
            <span className="text-sm font-semibold text-green-400">Extraction Complete</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "CANONICAL NAME", value: form.canonicalName },
              { label: "ARCHETYPE",      value: form.archetypeType },
              { label: "ROLE",           value: form.role },
              { label: "ALIGNMENT",      value: form.alignment },
              { label: "DOMAIN",         value: form.domain },
              { label: "FIRST MANIFESTED", value: form.firstManifested },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: ATM.bgCard, border: "1px solid rgba(201,168,76,0.12)" }}>
                <div className="text-[10px] font-bold tracking-wider uppercase mb-1" style={{ color: "rgba(201,168,76,0.5)" }}>{label}</div>
                <div className="text-sm" style={{ color: ATM.text }}>{value || "—"}</div>
              </div>
            ))}
          </div>
          {form.testimony && (
            <div className="rounded-lg p-4" style={{ background: ATM.bgCard, border: "1px solid rgba(201,168,76,0.12)" }}>
              <div className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color: "rgba(201,168,76,0.5)" }}>TESTIMONY OF ORIGIN</div>
              <p className="text-sm italic leading-relaxed line-clamp-4" style={{ color: "#c8b87a" }}>"{form.testimony}"</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <Button variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        <Button className="flex-1 py-3 font-bold" style={{ background: ATM.gold, color: "#000" }} disabled={!extracted} onClick={onNext}>
          Continue to Review →
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Review & Confirm ─────────────────────────────────────────────────
function Step3Review({ form, setForm, guideId, onNext, onBack }: { form: GuideFormData; setForm: (f: GuideFormData) => void; guideId: number; onNext: () => void; onBack: () => void }) {
  const update = trpc.guides.update.useMutation();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({ guideId, canonicalName: form.canonicalName, tagline: form.tagline, archetypeType: form.archetypeType, role: form.role, alignment: form.alignment, domain: form.domain, firstManifested: form.firstManifested, testimony: form.testimony, loreDescription: form.loreDescription, widCode: form.widCode, symbolsJson: form.symbols });
      onNext();
    } catch { toast.error("Failed to save — please try again"); } finally { setSaving(false); }
  };

  const field = (label: string, key: keyof GuideFormData, multiline = false) => (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(201,168,76,0.7)" }}>{label}</Label>
      {multiline ? (
        <Textarea value={form[key] as string} onChange={e => setForm({ ...form, [key]: e.target.value })} className="text-sm resize-none" style={{ background: ATM.bgCard, borderColor: "rgba(201,168,76,0.2)", color: ATM.text }} rows={3} />
      ) : (
        <Input value={form[key] as string} onChange={e => setForm({ ...form, [key]: e.target.value })} className="text-sm" style={{ background: ATM.bgCard, borderColor: "rgba(201,168,76,0.2)", color: ATM.text }} />
      )}
    </div>
  );

  return (
    <div>
      <StepHeader num={3} title="Review & Confirm" sub="Review the extracted details and make any corrections before proceeding." />
      <div className="space-y-4">
        {field("Canonical Name", "canonicalName")}
        {field("Tagline", "tagline")}
        {field("Archetype Type", "archetypeType")}
        {field("Role", "role")}
        {field("Alignment", "alignment")}
        {field("Domain", "domain")}
        {field("First Manifested", "firstManifested")}
        {field("Testimony of Origin", "testimony", true)}
        {field("Lore Description", "loreDescription", true)}
      </div>
      <Reassurance text="These details form the canonical record of your guide character. They will be sealed into the provenance chain and cannot be changed after publishing." />
      <div className="flex gap-3 mt-8">
        <Button variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        <Button className="flex-1 py-3 font-bold" style={{ background: ATM.gold, color: "#000" }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Confirm & Continue →"}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Rights & Permissions ─────────────────────────────────────────────
function Step4Rights({ form, setForm, guideId, onNext, onBack }: { form: GuideFormData; setForm: (f: GuideFormData) => void; guideId: number; onNext: () => void; onBack: () => void }) {
  const update = trpc.guides.update.useMutation();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({
        guideId,
        rightsJson: {
          originalOwnership: form.rightsOriginalOwnership,
          platformUsage: form.rightsPlatformUsage,
          derivativeAdaptation: form.rightsDerivativeAdaptation,
          merchandising: form.rightsMerchandising,
          commercialization: form.rightsCommercialization,
          attributionRequired: form.rightsAttributionRequired,
          protectUnauthorizedUse: form.protectUnauthorizedUse,
          requireAttributionOnDerivatives: form.requireAttributionOnDerivatives,
          lockCanonicalIdentity: form.lockCanonicalIdentity,
          allowGuideAppearances: form.allowGuideAppearances,
        },
        revenueCreatorPct: form.revenueCreatorPct,
      });
      onNext();
    } catch { toast.error("Failed to save rights"); } finally { setSaving(false); }
  };

  const RightsRow = ({ label, desc, field }: { label: string; desc: string; field: keyof GuideFormData }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b" style={{ borderColor: "rgba(201,168,76,0.08)" }}>
      <div className="flex-1">
        <div className="text-sm font-medium" style={{ color: ATM.text }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: ATM.textDim }}>{desc}</div>
      </div>
      <Switch checked={form[field] as boolean} onCheckedChange={() => setForm({ ...form, [field]: !form[field] })} className="flex-shrink-0" />
    </div>
  );

  return (
    <div>
      <StepHeader num={4} title="Rights & Permissions" sub="Define how your guide character can be used, adapted, and monetised." />
      <div className="space-y-0 mb-6">
        <RightsRow label="Original Ownership"             desc="I confirm I am the original creator of this character"              field="rightsOriginalOwnership" />
        <RightsRow label="Platform Usage"                 desc="Allow Living Nexus to display and promote this guide"               field="rightsPlatformUsage" />
        <RightsRow label="Derivative Adaptation"          desc="Allow creators to make derivative works based on this guide"        field="rightsDerivativeAdaptation" />
        <RightsRow label="Merchandising Rights"           desc="Allow physical and digital merchandise featuring this guide"        field="rightsMerchandising" />
        <RightsRow label="Commercialisation"              desc="Allow commercial use of this guide in creator projects"             field="rightsCommercialization" />
        <RightsRow label="Attribution Required"           desc="Require attribution when this guide is used or referenced"         field="rightsAttributionRequired" />
        <RightsRow label="Protect Unauthorised Use"       desc="Flag and protect against unauthorised commercial use"              field="protectUnauthorizedUse" />
        <RightsRow label="Attribution on Derivatives"     desc="Require attribution on all derivative works"                       field="requireAttributionOnDerivatives" />
        <RightsRow label="Lock Canonical Identity"        desc="Prevent others from altering the canonical identity"               field="lockCanonicalIdentity" />
        <RightsRow label="Allow Guide Appearances"        desc="Allow this guide to appear in other creators' realms"              field="allowGuideAppearances" />
      </div>
      <div className="space-y-2 mb-6">
        <Label className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(201,168,76,0.7)" }}>
          Creator Revenue Split: {form.revenueCreatorPct}%
        </Label>
        <input type="range" min={50} max={95} step={5} value={form.revenueCreatorPct}
          onChange={e => setForm({ ...form, revenueCreatorPct: parseInt(e.target.value) })}
          className="w-full accent-[#C9A84C]" />
        <div className="flex justify-between text-xs" style={{ color: ATM.textFaint }}>
          <span>50% Creator</span><span>Platform: {100 - form.revenueCreatorPct}%</span><span>95% Creator</span>
        </div>
      </div>
      <div className="flex gap-3 mt-8">
        <Button variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        <Button className="flex-1 py-3 font-bold" style={{ background: ATM.gold, color: "#000" }} onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Continue to Connect →"}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5: Connect Creator ──────────────────────────────────────────────────
function Step5Connect({ form, setForm, user, onNext, onBack }: { form: GuideFormData; setForm: (f: GuideFormData) => void; user: { stripeAccountId?: string | null; stripeAccountStatus?: string | null }; onNext: () => void; onBack: () => void }) {
  const [connecting, setConnecting] = useState(false);
  const isConnected = !!(user?.stripeAccountId) || form.stripeConnected;

  const handleConnect = async () => {
    setConnecting(true);
    // Stripe Connect onboarding — marks connected for now
    setTimeout(() => {
      setForm({ ...form, stripeConnected: true });
      toast.success("Stripe account connected");
      setConnecting(false);
    }, 1200);
  };

  return (
    <div>
      <StepHeader num={5} title="Connect Creator" sub="Connect your Stripe account to receive revenue from guide usage and derivatives." />
      {isConnected ? (
        <div className="rounded-xl p-6 text-center space-y-3" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)" }}>
          <Check size={32} className="mx-auto text-green-400" />
          <p className="text-base font-semibold text-green-400">Stripe Connected</p>
          <p className="text-sm" style={{ color: ATM.textDim }}>You're ready to receive revenue from your guide character.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)" }}>
            <Zap size={28} className="mb-3" style={{ color: ATM.gold }} />
            <p className="text-sm font-medium mb-2" style={{ color: ATM.text }}>Connect Stripe for Payouts</p>
            <p className="text-xs leading-relaxed" style={{ color: ATM.textDim }}>Connect your Stripe account to receive your share of revenue when creators use your guide character in their projects, derivatives, and appearances.</p>
          </div>
          <Button className="w-full py-3 text-base font-bold" style={{ background: ATM.gold, color: "#000" }} onClick={handleConnect} disabled={connecting}>
            {connecting ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Connecting…</span> : "Connect Stripe Account"}
          </Button>
          <button onClick={() => { setForm({ ...form, stripeConnected: false }); onNext(); }} className="w-full text-center text-xs underline" style={{ color: ATM.textFaint }}>
            Skip for now — connect later
          </button>
        </div>
      )}
      <div className="flex gap-3 mt-8">
        <Button variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        {isConnected && (
          <Button className="flex-1 py-3 font-bold" style={{ background: ATM.gold, color: "#000" }} onClick={onNext}>
            Continue to Publish →
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step 6: Publish Guide ────────────────────────────────────────────────────
function Step6Publish({ form, guideId, onBack }: { form: GuideFormData; guideId: number; onBack: () => void }) {
  const [, navigate] = useLocation();
  const publish = trpc.guides.publish.useMutation();
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publish.mutateAsync({ guideId });
      setPublished(true);
      toast.success("Guide published to Living Nexus!");
    } catch { toast.error("Publish failed — please try again"); } finally { setPublishing(false); }
  };

  return (
    <div>
      <StepHeader num={6} title="Publish Guide" sub="Your guide character is ready to go live on Living Nexus." />
      {published ? (
        <div className="space-y-6">
          <div className="rounded-xl p-8 text-center" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <Globe size={40} className="mx-auto mb-3 text-green-400" />
            <p className="text-xl font-bold text-green-400 mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Guide Published</p>
            <p className="text-sm" style={{ color: ATM.textDim }}>Your character is now live on Living Nexus.</p>
          </div>
          <div className="space-y-2">
            {["Guide is now live on Living Nexus", "Available in Guide Directory", "Usable in creator overlays & realms", "Eligible for derivative creation", "Revenue tracking is active"].map(item => (
              <div key={item} className="flex items-center gap-2 text-sm" style={{ color: ATM.text }}>
                <Check size={14} style={{ color: ATM.gold }} /> {item}
              </div>
            ))}
          </div>
          <Button className="w-full py-3 text-base font-bold" style={{ background: ATM.gold, color: "#000" }} onClick={() => navigate("/guides")}>
            View in Guide Directory →
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
            {form.artworkUrl && <img src={form.artworkUrl} alt="Guide" className="w-full h-48 object-cover" />}
            <div className="p-4" style={{ background: "rgba(10,8,0,0.8)" }}>
              <h3 className="font-bold text-base" style={{ fontFamily: "'Cinzel', serif", color: ATM.gold }}>{form.canonicalName || "Untitled Guide"}</h3>
              <p className="text-sm mt-1" style={{ color: ATM.textDim }}>{form.tagline || form.role}</p>
              <div className="flex gap-2 mt-3">
                <Badge style={{ background: "rgba(201,168,76,0.15)", color: ATM.gold, border: "1px solid rgba(201,168,76,0.3)" }}>Guide Character</Badge>
              </div>
            </div>
          </div>
          <Reassurance text="Once published, your guide character enters the Living Nexus canon. The provenance record is sealed and permanent." />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
            <Button className="flex-1 py-3 text-base font-bold" style={{ background: "#16a34a", color: "#fff" }} onClick={handlePublish} disabled={publishing}>
              {publishing ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Publishing…</span> : "Publish Guide"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Right Panel: Live Preview (Steps 2–6) ────────────────────────────────────
function LivePreview({ form, step }: { form: GuideFormData; step: number }) {
  return (
    <div className="space-y-6 sticky top-8">
      <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ fontFamily: "'Cinzel', serif", color: "rgba(201,168,76,0.6)" }}>Live Preview</p>

      {/* Character card */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,168,76,0.18)" }}>
        {form.artworkUrl ? (
          <img src={form.artworkUrl} alt="Character" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 flex items-center justify-center" style={{ background: "rgba(201,168,76,0.04)" }}>
            <span className="text-4xl opacity-30" style={{ color: ATM.gold }}>✦</span>
          </div>
        )}
        <div className="p-4" style={{ background: "rgba(10,8,0,0.9)" }}>
          <h3 className="font-bold text-sm" style={{ fontFamily: "'Cinzel', serif", color: ATM.gold }}>{form.canonicalName || "Character Name"}</h3>
          {form.tagline && <p className="text-xs mt-1" style={{ color: ATM.textDim }}>{form.tagline}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            {form.archetypeType && <Badge className="text-[10px]" style={{ background: "rgba(201,168,76,0.1)", color: "rgba(201,168,76,0.8)", border: "1px solid rgba(201,168,76,0.2)" }}>{form.archetypeType}</Badge>}
            {form.alignment && <Badge className="text-[10px]" style={{ background: "rgba(201,168,76,0.06)", color: ATM.textDim, border: "1px solid rgba(201,168,76,0.12)" }}>{form.alignment}</Badge>}
          </div>
        </div>
      </div>

      <ProvenanceStatus wid={form.widCode} active={step >= 2} />

      {form.testimony && (
        <div className="rounded-lg p-4" style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(201,168,76,0.5)" }}>Testimony of Origin</p>
          <p className="text-xs italic leading-relaxed line-clamp-4" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#c8b87a" }}>"{form.testimony}"</p>
        </div>
      )}

      {step >= 4 && (
        <div className="rounded-lg p-4" style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.1)" }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(201,168,76,0.5)" }}>Rights Summary</p>
          <div className="space-y-1">
            {[
              { label: "Derivatives",          val: form.rightsDerivativeAdaptation },
              { label: "Commercialisation",     val: form.rightsCommercialization },
              { label: "Attribution Required",  val: form.rightsAttributionRequired },
              { label: "Identity Locked",       val: form.lockCanonicalIdentity },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span style={{ color: ATM.textDim }}>{label}</span>
                <span style={{ color: val ? "#4ade80" : ATM.textFaint }}>{val ? "✓ Yes" : "✗ No"}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: "rgba(201,168,76,0.1)" }}>
              <span style={{ color: ATM.textDim }}>Creator Revenue</span>
              <span style={{ color: ATM.gold }}>{form.revenueCreatorPct}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function GuideUploadWizard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<GuideFormData>(DEFAULT_FORM);
  const [guideId, setGuideId] = useState<number | null>(null);
  const createGuide = trpc.guides.create.useMutation();

  const handleStep1Next = async () => {
    try {
      const guide = await createGuide.mutateAsync({
        canonicalName: "Untitled Guide",
        provenanceSheetUrl: form.provenanceSheetUrl || undefined,
        artworkUrl: form.artworkUrl || undefined,
      });
      setGuideId(guide.id);
      setStep(2);
    } catch { toast.error("Failed to create guide draft"); }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: ATM.bg }}>
        <div className="text-center">
          <p className="text-lg font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: ATM.gold }}>Sign In Required</p>
          <p className="text-sm" style={{ color: ATM.textDim }}>You must be signed in to upload a guide character.</p>
        </div>
      </div>
    );
  }

  const renderLeft = () => {
    switch (step) {
      case 1: return <Step1Upload form={form} setForm={setForm} onNext={handleStep1Next} />;
      case 2: return <Step2Extract form={form} setForm={setForm} guideId={guideId!} onNext={() => setStep(3)} onBack={() => setStep(1)} />;
      case 3: return <Step3Review form={form} setForm={setForm} guideId={guideId!} onNext={() => setStep(4)} onBack={() => setStep(2)} />;
      case 4: return <Step4Rights form={form} setForm={setForm} guideId={guideId!} onNext={() => setStep(5)} onBack={() => setStep(3)} />;
      case 5: return <Step5Connect form={form} setForm={setForm} user={user as { stripeAccountId?: string | null; stripeAccountStatus?: string | null }} onNext={() => setStep(6)} onBack={() => setStep(4)} />;
      case 6: return <Step6Publish form={form} guideId={guideId!} onBack={() => setStep(5)} />;
      default: return null;
    }
  };

  const renderRight = () => step === 1 ? <Step1Preview form={form} /> : <LivePreview form={form} step={step} />;

  return (
    <GuideShell
      currentStep={step}
      onBack={step === 1 ? () => navigate("/guides") : () => setStep(step - 1)}
      leftPanel={renderLeft()}
      rightPanel={renderRight()}
    />
  );
}
