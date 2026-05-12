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

// ─── Types ────────────────────────────────────────────────────────────────────

interface SymbolItem { name: string; label: string; iconUrl?: string }
interface ExtractedImage { url: string; filename: string }

interface GuideFormData {
  // Step 1
  provenanceSheetUrl: string;
  artworkUrl: string;
  extractedImages: ExtractedImage[];
  // Step 2 — AI extracted
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
  // Step 4 — Rights
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
  // Step 5 — Stripe
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

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "UPLOAD SHEET", sub: "Upload provenance sheet & artwork" },
  { num: 2, label: "EXTRACT & PREVIEW", sub: "We extract the key details" },
  { num: 3, label: "REVIEW & CONFIRM", sub: "Confirm extracted information" },
  { num: 4, label: "RIGHTS & PERMISSIONS", sub: "Set usage rights & preferences" },
  { num: 5, label: "CONNECT CREATOR", sub: "Connect Stripe for payouts" },
  { num: 6, label: "PUBLISH GUIDE", sub: "Guide goes live on Living Nexus" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-between w-full px-2 py-4">
      {STEPS.map((step, idx) => {
        const isActive = step.num === current;
        const isDone = step.num < current;
        return (
          <div key={step.num} className="flex items-center flex-1">
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0
                ${isActive ? "bg-[#C9A84C] border-[#C9A84C] text-black" : isDone ? "bg-[#C9A84C]/30 border-[#C9A84C]/60 text-[#C9A84C]" : "bg-transparent border-[#4a4030] text-[#6b5f3e]"}`}>
                {isDone ? "✓" : step.num}
              </div>
              <div className="mt-1 text-center hidden md:block">
                <div className={`text-[10px] font-bold tracking-wider ${isActive ? "text-[#C9A84C]" : isDone ? "text-[#C9A84C]/70" : "text-[#6b5f3e]"}`}>
                  {step.label}
                </div>
                <div className="text-[9px] text-[#5a4f38] max-w-[100px] leading-tight">{step.sub}</div>
              </div>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-4 ${isDone ? "bg-[#C9A84C]/60" : "bg-[#3a3020]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Upload Sheet ─────────────────────────────────────────────────────

function Step1Upload({
  form, setForm, onNext,
}: { form: GuideFormData; setForm: (f: GuideFormData) => void; onNext: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [sheetFile, setSheetFile] = useState<{ name: string; size: string } | null>(null);
  const [artFile, setArtFile] = useState<{ name: string; size: string } | null>(null);
  const sheetRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "cover");
    fd.append("filename", file.name);
    const res = await fetch("/api/upload-file", { method: "POST", body: fd });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[GuideUpload] Upload failed:", res.status, errBody);
      throw new Error("Upload failed");
    }
    const data = await res.json();
    return data.url as string;
  };

  const handleSheetDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm({ ...form, provenanceSheetUrl: url });
      setSheetFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + " MB" });
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  }, [form, setForm]);

  const handleSheetChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm({ ...form, provenanceSheetUrl: url });
      setSheetFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + " MB" });
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const handleArtChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file);
      setForm({ ...form, artworkUrl: url });
      setArtFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(1) + " MB" });
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  return (
    <div className="wizard-panel">
      <div className="panel-header">
        <span className="step-badge">1</span>
        <div>
          <h2 className="panel-title">UPLOAD PROVENANCE SHEET</h2>
          <p className="panel-sub">Upload your provenance sheet and character artwork.</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-[#4a3f20] rounded-lg p-8 text-center cursor-pointer hover:border-[#C9A84C]/60 transition-colors bg-[#1a1508]/40"
        onDragOver={e => e.preventDefault()}
        onDrop={handleSheetDrop}
        onClick={() => sheetRef.current?.click()}
      >
        <div className="text-4xl mb-3 text-[#4a3f20]">📄</div>
        <p className="text-[#C9A84C]/80 text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-[#6b5f3e] text-xs mt-1">PNG, JPG, PDF (Max 50MB)</p>
        <input ref={sheetRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleSheetChange} />
      </div>

      {/* Uploaded files list */}
      <div className="mt-4 space-y-2">
        {sheetFile && (
          <div className="flex items-center gap-3 bg-[#1e1a0e] border border-[#3a3020] rounded-lg px-4 py-3">
            <span className="text-[#C9A84C] text-lg">📋</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[#e8d5a0] truncate">{sheetFile.name}</div>
              <div className="text-xs text-[#6b5f3e]">{sheetFile.size}</div>
            </div>
            <span className="text-green-400 text-lg">✓</span>
          </div>
        )}
        {artFile && (
          <div className="flex items-center gap-3 bg-[#1e1a0e] border border-[#3a3020] rounded-lg px-4 py-3">
            <span className="text-[#C9A84C] text-lg">🖼</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[#e8d5a0] truncate">{artFile.name}</div>
              <div className="text-xs text-[#6b5f3e]">{artFile.size}</div>
            </div>
            <span className="text-green-400 text-lg">✓</span>
          </div>
        )}
      </div>

      {/* Artwork upload */}
      <div className="mt-4">
        <Label className="text-[#C9A84C]/80 text-xs font-semibold tracking-wider uppercase mb-2 block">Character Artwork</Label>
        <div
          className="border border-[#3a3020] rounded-lg p-4 text-center cursor-pointer hover:border-[#C9A84C]/40 transition-colors bg-[#1a1508]/20"
          onClick={() => artRef.current?.click()}
        >
          {form.artworkUrl ? (
            <img src={form.artworkUrl} alt="Artwork preview" className="max-h-48 mx-auto rounded object-contain" />
          ) : (
            <div className="text-[#6b5f3e] text-sm py-4">Click to upload artwork image</div>
          )}
          <input ref={artRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={handleArtChange} />
        </div>
      </div>

      <div className="mt-2 text-xs text-[#6b5f3e]">Supported files: PDF, PNG, JPG &nbsp;·&nbsp; Max file size: 50MB</div>

      {/* Uploaded preview */}
      {form.artworkUrl && (
        <div className="mt-4">
          <div className="text-xs text-[#C9A84C]/60 uppercase tracking-wider mb-2">Uploaded Preview</div>
          <img src={form.artworkUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border border-[#3a3020]" />
        </div>
      )}

      <Button
        className="w-full mt-6 btn-gold"
        disabled={!form.provenanceSheetUrl || uploading}
        onClick={onNext}
      >
        {uploading ? "Uploading…" : "Continue to Extract →"}
      </Button>
    </div>
  );
}

// ─── Step 2: Extract & Preview ────────────────────────────────────────────────

function Step2Extract({
  form, setForm, guideId, onNext, onBack,
}: { form: GuideFormData; setForm: (f: GuideFormData) => void; guideId: number; onNext: () => void; onBack: () => void }) {
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const extract = trpc.guides.extractFromSheet.useMutation();

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const result = await extract.mutateAsync({
        guideId,
        fileUrl: form.provenanceSheetUrl,
      });
      if (result.guide) {
        const g = result.guide;
        setForm({
          ...form,
          canonicalName: (g.canonicalName as string) || form.canonicalName,
          tagline: (g.tagline as string) || "",
          archetypeType: (g.archetypeType as string) || "",
          role: (g.role as string) || "",
          alignment: (g.alignment as string) || "",
          domain: (g.domain as string) || "",
          firstManifested: (g.firstManifested as string) || "",
          widCode: (g.widCode as string) || "",
          testimony: (g.testimony as string) || "",
          loreDescription: (g.loreDescription as string) || "",
          symbols: (g.symbolsJson as SymbolItem[]) || [],
        });
      }
      setExtracted(true);
      toast.success("Extraction complete");
    } catch (err) {
      toast.error("Extraction failed — you can fill in details manually");
      setExtracted(true);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="wizard-panel">
      <div className="panel-header">
        <span className="step-badge">2</span>
        <div>
          <h2 className="panel-title">EXTRACT & PREVIEW</h2>
          <p className="panel-sub">We've extracted the following information.</p>
        </div>
      </div>

      {!extracted ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚙️</div>
          <p className="text-[#C9A84C]/80 mb-2">AI extraction engine ready</p>
          <p className="text-[#6b5f3e] text-sm mb-6">Click below to analyze your provenance sheet and extract guide details automatically.</p>
          <Button className="btn-gold" onClick={handleExtract} disabled={extracting}>
            {extracting ? (
              <span className="flex items-center gap-2"><span className="animate-spin">⚙</span> Extracting…</span>
            ) : "Extract Information"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Character header */}
          <div className="bg-[#1e1a0e] border border-[#3a3020] rounded-lg p-4">
            <h3 className="text-[#C9A84C] font-bold text-lg">{form.canonicalName || "—"}</h3>
            <p className="text-[#a89060] text-sm">{form.tagline || "—"}</p>
          </div>

          {/* Extracted fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "TYPE", value: form.archetypeType },
              { label: "ROLE", value: form.role },
              { label: "ALIGNMENT", value: form.alignment },
              { label: "DOMAIN", value: form.domain },
              { label: "FIRST MANIFESTED", value: form.firstManifested },
              { label: "WID", value: form.widCode },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#1a1508]/60 border border-[#2a2010] rounded p-3">
                <div className="text-[#6b5f3e] text-[10px] font-bold tracking-wider uppercase mb-1">{label}</div>
                <div className="text-[#e8d5a0] text-sm">{value || "—"}</div>
              </div>
            ))}
          </div>

          {/* Status badge */}
          {form.widCode && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded text-xs font-bold bg-green-900/40 text-green-400 border border-green-700/40">
                PROVENANCE VERIFIED
              </span>
            </div>
          )}

          {/* Testimony */}
          {form.testimony && (
            <div className="bg-[#1e1a0e] border border-[#3a3020] rounded-lg p-4">
              <div className="text-[#6b5f3e] text-[10px] font-bold tracking-wider uppercase mb-2">TESTIMONY OF ORIGIN</div>
              <p className="text-[#c8b87a] text-sm italic leading-relaxed line-clamp-4">"{form.testimony}"</p>
            </div>
          )}

          {/* Extracted images */}
          {form.artworkUrl && (
            <div>
              <div className="text-[#6b5f3e] text-[10px] font-bold tracking-wider uppercase mb-2">EXTRACTED IMAGES</div>
              <div className="flex gap-3">
                <img src={form.artworkUrl} alt="Artwork" className="w-28 h-28 object-cover rounded border border-[#3a3020]" />
              </div>
            </div>
          )}

          {/* Symbols */}
          {form.symbols.length > 0 && (
            <div>
              <div className="text-[#6b5f3e] text-[10px] font-bold tracking-wider uppercase mb-2">SYMBOLS & ICONOGRAPHY</div>
              <div className="flex gap-3 flex-wrap">
                {form.symbols.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 bg-[#1a1508]/60 border border-[#2a2010] rounded p-3 min-w-[64px]">
                    <span className="text-2xl">✦</span>
                    <span className="text-[#a89060] text-[10px] text-center">{s.label || s.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1 border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]" onClick={onBack}>← Back</Button>
        <Button className="flex-1 btn-gold" disabled={!extracted} onClick={onNext}>Continue to Review →</Button>
      </div>
    </div>
  );
}

// ─── Step 3: Review & Confirm ─────────────────────────────────────────────────

function Step3Review({
  form, setForm, guideId, onNext, onBack,
}: { form: GuideFormData; setForm: (f: GuideFormData) => void; guideId: number; onNext: () => void; onBack: () => void }) {
  const update = trpc.guides.update.useMutation();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({
        guideId,
        canonicalName: form.canonicalName,
        tagline: form.tagline,
        archetypeType: form.archetypeType,
        role: form.role,
        alignment: form.alignment,
        domain: form.domain,
        firstManifested: form.firstManifested,
        testimony: form.testimony,
        loreDescription: form.loreDescription,
        widCode: form.widCode,
        symbolsJson: form.symbols,
      });
      onNext();
    } catch { toast.error("Failed to save — please try again"); } finally { setSaving(false); }
  };

  const field = (label: string, key: keyof GuideFormData, multiline = false) => (
    <div className="space-y-1">
      <Label className="text-[#6b5f3e] text-[10px] font-bold tracking-wider uppercase">{label}</Label>
      {multiline ? (
        <Textarea
          value={form[key] as string}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          className="bg-[#1a1508] border-[#3a3020] text-[#e8d5a0] text-sm resize-none focus:border-[#C9A84C]/60"
          rows={3}
        />
      ) : (
        <Input
          value={form[key] as string}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          className="bg-[#1a1508] border-[#3a3020] text-[#e8d5a0] text-sm focus:border-[#C9A84C]/60"
        />
      )}
    </div>
  );

  return (
    <div className="wizard-panel">
      <div className="panel-header">
        <span className="step-badge">3</span>
        <div>
          <h2 className="panel-title">REVIEW & CONFIRM</h2>
          <p className="panel-sub">Review and confirm the extracted details.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase">GUIDE DETAILS</h3>
          <Button variant="outline" size="sm" className="text-xs border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]">Edit</Button>
        </div>

        {field("Guide Name", "canonicalName")}
        {field("Tagline", "tagline")}
        {field("Role", "role")}
        {field("Alignment", "alignment")}
        {field("Domain", "domain")}
        {field("First Manifested", "firstManifested")}

        <div className="flex items-center justify-between mt-2">
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase">DESCRIPTION</h3>
          <Button variant="outline" size="sm" className="text-xs border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]">Edit</Button>
        </div>
        {field("Lore Description", "loreDescription", true)}
        {field("Testimony of Origin", "testimony", true)}

        {/* Symbols preview */}
        {form.symbols.length > 0 && (
          <div>
            <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-2">SYMBOLS & ICONOGRAPHY</h3>
            <div className="flex gap-3 flex-wrap">
              {form.symbols.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1 bg-[#1a1508]/60 border border-[#2a2010] rounded p-3 min-w-[64px]">
                  <span className="text-2xl">✦</span>
                  <span className="text-[#a89060] text-[10px] text-center">{s.label || s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1 border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]" onClick={onBack}>← Back</Button>
        <Button className="flex-1 btn-gold" onClick={handleSave} disabled={saving || !form.canonicalName}>
          {saving ? "Saving…" : "Continue to Rights →"}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Rights & Permissions ────────────────────────────────────────────

function Step4Rights({
  form, setForm, guideId, onNext, onBack,
}: { form: GuideFormData; setForm: (f: GuideFormData) => void; guideId: number; onNext: () => void; onBack: () => void }) {
  const update = trpc.guides.update.useMutation();

  const toggle = (key: keyof GuideFormData) => setForm({ ...form, [key]: !form[key] });

  const RightRow = ({ label, key, value }: { label: string; key: keyof GuideFormData; value: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b border-[#2a2010]">
      <div className="flex items-center gap-2">
        <span className={`w-4 h-4 rounded-sm flex items-center justify-center text-xs ${value ? "bg-[#C9A84C]/20 text-[#C9A84C]" : "bg-[#2a2010] text-[#6b5f3e]"}`}>
          {value ? "✓" : ""}
        </span>
        <span className="text-[#e8d5a0] text-sm">{label}</span>
      </div>
      <span className="text-[#a89060] text-xs">{value ? "Retained ▾" : "Not Set"}</span>
    </div>
  );

  const ProtectionRow = ({ label, key, value }: { label: string; key: keyof GuideFormData; value: boolean }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-[#e8d5a0] text-sm">{label}</span>
      <Switch
        checked={value}
        onCheckedChange={() => toggle(key)}
        className="data-[state=checked]:bg-[#C9A84C]"
      />
    </div>
  );

  const handleContinue = async () => {
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
        },
        revenueCreatorPct: form.revenueCreatorPct,
        derivativePermissionsJson: {
          protectUnauthorizedUse: form.protectUnauthorizedUse,
          requireAttributionOnDerivatives: form.requireAttributionOnDerivatives,
          lockCanonicalIdentity: form.lockCanonicalIdentity,
          allowGuideAppearances: form.allowGuideAppearances,
        },
      });
      onNext();
    } catch { toast.error("Failed to save rights"); }
  };

  return (
    <div className="wizard-panel">
      <div className="panel-header">
        <span className="step-badge">4</span>
        <div>
          <h2 className="panel-title">RIGHTS & PERMISSIONS</h2>
          <p className="panel-sub">Define usage rights and permissions.</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Rights Settings */}
        <div>
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">RIGHTS SETTINGS</h3>
          <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg px-4 py-2">
            <RightRow label="Original Creator Ownership" key="rightsOriginalOwnership" value={form.rightsOriginalOwnership} />
            <RightRow label="Platform Usage (Display)" key="rightsPlatformUsage" value={form.rightsPlatformUsage} />
            <RightRow label="Derivative Adaptation Rights" key="rightsDerivativeAdaptation" value={form.rightsDerivativeAdaptation} />
            <RightRow label="Merchandising Rights" key="rightsMerchandising" value={form.rightsMerchandising} />
            <RightRow label="Commercialization" key="rightsCommercialization" value={form.rightsCommercialization} />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm flex items-center justify-center text-xs bg-[#C9A84C]/20 text-[#C9A84C]">✓</span>
                <span className="text-[#e8d5a0] text-sm">Attribution Requirement</span>
              </div>
              <span className="text-[#a89060] text-xs">Mandatory ▾</span>
            </div>
          </div>
        </div>

        {/* Revenue Split */}
        <div>
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">REVENUE SPLIT</h3>
          <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#e8d5a0] text-sm">Creator (You)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={50} max={100}
                  value={form.revenueCreatorPct}
                  onChange={e => setForm({ ...form, revenueCreatorPct: Number(e.target.value) })}
                  className="w-16 bg-[#1a1508] border border-[#3a3020] text-[#e8d5a0] text-sm rounded px-2 py-1 text-right"
                />
                <span className="text-[#a89060] text-sm">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#e8d5a0] text-sm">Living Nexus Platform</span>
              <span className="text-[#a89060] text-sm">{100 - form.revenueCreatorPct} %</span>
            </div>
            <p className="text-[#6b5f3e] text-xs">This applies to derivative sales and commercial usage.</p>
          </div>
        </div>

        {/* Canonical Protections */}
        <div>
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">CANONICAL PROTECTIONS</h3>
          <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg px-4 py-2 divide-y divide-[#2a2010]">
            <ProtectionRow label="Protect from Unauthorized Use" key="protectUnauthorizedUse" value={form.protectUnauthorizedUse} />
            <ProtectionRow label="Require Attribution on Derivatives" key="requireAttributionOnDerivatives" value={form.requireAttributionOnDerivatives} />
            <ProtectionRow label="Lock Canonical Identity" key="lockCanonicalIdentity" value={form.lockCanonicalIdentity} />
            <ProtectionRow label="Allow Guide Appearances" key="allowGuideAppearances" value={form.allowGuideAppearances} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1 border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]" onClick={onBack}>← Back</Button>
        <Button className="flex-1 btn-gold" onClick={handleContinue}>Continue to Creator Connect →</Button>
      </div>
    </div>
  );
}

// ─── Step 5: Connect Creator (Stripe) ────────────────────────────────────────

function Step5Connect({
  form, setForm, user, onNext, onBack,
}: { form: GuideFormData; setForm: (f: GuideFormData) => void; user: { name?: string; username?: string; avatarUrl?: string; stripeConnectId?: string }; onNext: () => void; onBack: () => void }) {
  const isConnected = !!user?.stripeConnectId || form.stripeConnected;

  const handleConnect = () => {
    // In production this would redirect to Stripe Connect OAuth
    // For now, show a toast and mark as connected for demo
    toast.info("Stripe Connect integration — redirecting to Stripe…");
    setTimeout(() => {
      setForm({ ...form, stripeConnected: true });
      toast.success("Stripe account connected (demo mode)");
    }, 1500);
  };

  return (
    <div className="wizard-panel">
      <div className="panel-header">
        <span className="step-badge">5</span>
        <div>
          <h2 className="panel-title">CONNECT CREATOR</h2>
          <p className="panel-sub">Connect your Stripe account for payouts.</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Creator Profile */}
        <div>
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">CREATOR PROFILE</h3>
          <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg p-4 flex items-center gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-[#C9A84C]/40" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#3a3020] flex items-center justify-center text-[#C9A84C] font-bold text-lg">
                {user?.name?.[0] ?? "C"}
              </div>
            )}
            <div>
              <div className="text-[#e8d5a0] font-semibold">{user?.name ?? "Creator"}</div>
              <div className="text-[#a89060] text-sm">@{user?.username ?? "creator"}</div>
              <div className="text-green-400 text-xs mt-1">Creator on Living Nexus</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-green-400 text-xs">✓</span>
                <span className="text-green-400 text-xs font-medium">Verified Creator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Connect */}
        <div>
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">STRIPE CONNECT</h3>
          <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-[#635bff]" style={{ fontFamily: "system-ui" }}>stripe</div>
              <span className="text-[#a89060] text-sm">Secure payouts powered by Stripe.</span>
            </div>

            {isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">Connected</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-[#6b5f3e]">Account</div>
                  <div className="text-[#e8d5a0]">acct_••••••••••1234</div>
                  <div className="text-[#6b5f3e]">Payout Currency</div>
                  <div className="text-[#e8d5a0]">USD</div>
                  <div className="text-[#6b5f3e]">Payout Schedule</div>
                  <div className="text-[#e8d5a0]">Automatic (Monthly)</div>
                </div>
                <Button variant="outline" size="sm" className="text-xs border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]">
                  Manage Stripe Account ↗
                </Button>
              </div>
            ) : (
              <Button className="w-full btn-gold" onClick={handleConnect}>
                Connect Stripe Account
              </Button>
            )}
          </div>
        </div>

        {/* Payout Summary */}
        {isConnected && (
          <div>
            <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">PAYOUT SUMMARY</h3>
            <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#6b5f3e]">Your Share</span><span className="text-[#e8d5a0] font-semibold">90%</span></div>
              <div className="flex justify-between"><span className="text-[#6b5f3e]">Platform Share</span><span className="text-[#e8d5a0]">10%</span></div>
              <div className="flex justify-between"><span className="text-[#6b5f3e]">Payout Method</span><span className="text-green-400">Stripe Connected</span></div>
              <div className="flex justify-between"><span className="text-[#6b5f3e]">Next Payout</span><span className="text-[#e8d5a0]">End of Month</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1 border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]" onClick={onBack}>← Back</Button>
        <Button className="flex-1 btn-gold" onClick={onNext}>Continue to Publish →</Button>
      </div>
    </div>
  );
}

// ─── Step 6: Publish Guide ────────────────────────────────────────────────────

function Step6Publish({
  form, guideId, onBack,
}: { form: GuideFormData; guideId: number; onBack: () => void }) {
  const [, navigate] = useLocation();
  const publish = trpc.guides.publish.useMutation();
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await publish.mutateAsync({ guideId });
      setPublished(true);
      toast.success("Guide published to Living Nexus!");
    } catch (err) {
      toast.error("Publish failed — please try again");
    } finally {
      setPublishing(false);
    }
  };

  const publicUrl = `/guide/${form.widCode || guideId}`;

  return (
    <div className="wizard-panel">
      <div className="panel-header">
        <span className="step-badge">6</span>
        <div>
          <h2 className="panel-title">PUBLISH GUIDE</h2>
          <p className="panel-sub">Your guide character is ready to go live.</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Publish Preview */}
        <div>
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">PUBLISH PREVIEW</h3>
          <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg overflow-hidden">
            {form.artworkUrl && (
              <img src={form.artworkUrl} alt="Guide" className="w-full h-40 object-cover" />
            )}
            <div className="p-4">
              <h3 className="text-[#C9A84C] font-bold text-base">{form.canonicalName || "Untitled Guide"}</h3>
              <p className="text-[#a89060] text-sm">{form.tagline || form.role}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30 text-xs">Guide Character</Badge>
                {published && <Badge className="bg-green-900/40 text-green-400 border-green-700/40 text-xs">PROVENANCE VERIFIED</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Public URL */}
        <div>
          <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-2">PUBLIC URL PREVIEW</h3>
          <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-[#a89060] text-sm font-mono truncate">livingnexus.app{publicUrl}</span>
            <span className="text-[#6b5f3e] text-lg ml-2">↗</span>
          </div>
        </div>

        {/* What's Next */}
        {published && (
          <div>
            <h3 className="text-[#C9A84C]/70 text-xs font-bold tracking-wider uppercase mb-3">WHAT'S NEXT?</h3>
            <div className="bg-[#1a1508]/60 border border-[#2a2010] rounded-lg p-4 space-y-2">
              {[
                "Guide is now live on Living Nexus",
                "Available in Guide Directory",
                "Usable in creator overlays & realms",
                "Eligible for derivative creation",
                "Revenue tracking is active",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#e8d5a0]">
                  <span className="text-[#C9A84C]">◉</span> {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        {!published && (
          <Button variant="outline" className="flex-1 border-[#3a3020] text-[#a89060] hover:bg-[#2a2010]" onClick={onBack}>← Back</Button>
        )}
        {published ? (
          <Button className="flex-1 btn-gold" onClick={() => navigate("/guides")}>
            View Guide Page →
          </Button>
        ) : (
          <Button className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold text-base py-3" onClick={handlePublish} disabled={publishing}>
            {publishing ? "Publishing…" : "Publish Guide"}
          </Button>
        )}
      </div>
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
    } catch {
      toast.error("Failed to create guide draft");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d0b06] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#C9A84C] text-xl font-bold mb-2">Sign in required</div>
          <p className="text-[#6b5f3e] text-sm">You must be signed in to upload a guide character.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0b06] text-[#e8d5a0]">
      {/* Top bar */}
      <div className="border-b border-[#2a2010] bg-[#0d0b06]/95 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-[#C9A84C] font-black text-lg tracking-tight">
              <span className="border-2 border-[#C9A84C] rounded px-2 py-0.5 mr-2 text-sm">LN</span>
              LIVING NEXUS
            </button>
            <span className="text-[#3a3020]">|</span>
            <span className="text-[#6b5f3e] text-sm">CREATE. CONNECT. RESONATE.</span>
          </div>
          <div className="text-center">
            <h1 className="text-[#e8d5a0] font-bold text-lg tracking-wide">
              UPLOAD NEW <span className="text-[#C9A84C]">GUIDE</span> CHARACTER
            </h1>
            <p className="text-[#6b5f3e] text-xs">From Provenance Sheet to Living Nexus Canon</p>
          </div>
          <div className="w-48" />
        </div>

        {/* Step indicator */}
        <div className="max-w-7xl mx-auto px-4 pb-2">
          <StepIndicator current={step} />
        </div>
      </div>

      {/* Main content — 6 column grid showing all panels */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {/* Step 1 */}
          <div className={`lg:col-span-1 ${step === 1 ? "ring-2 ring-[#C9A84C]/40 rounded-xl" : "opacity-40 pointer-events-none"}`}>
            {step === 1 ? (
              <Step1Upload form={form} setForm={setForm} onNext={handleStep1Next} />
            ) : (
              <div className="wizard-panel-mini">
                <div className="step-badge-mini">1</div>
                <div className="text-[#C9A84C]/60 text-xs font-bold mt-2">UPLOAD SHEET</div>
                {form.provenanceSheetUrl && <span className="text-green-400 text-xs mt-1 block">✓ Uploaded</span>}
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className={`lg:col-span-1 ${step === 2 ? "ring-2 ring-[#C9A84C]/40 rounded-xl" : step > 2 ? "opacity-40 pointer-events-none" : "opacity-20 pointer-events-none"}`}>
            {step === 2 && guideId ? (
              <Step2Extract form={form} setForm={setForm} guideId={guideId} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            ) : (
              <div className="wizard-panel-mini">
                <div className="step-badge-mini">2</div>
                <div className="text-[#C9A84C]/60 text-xs font-bold mt-2">EXTRACT & PREVIEW</div>
                {step > 2 && form.canonicalName && <span className="text-green-400 text-xs mt-1 block">✓ {form.canonicalName}</span>}
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className={`lg:col-span-1 ${step === 3 ? "ring-2 ring-[#C9A84C]/40 rounded-xl" : step > 3 ? "opacity-40 pointer-events-none" : "opacity-20 pointer-events-none"}`}>
            {step === 3 && guideId ? (
              <Step3Review form={form} setForm={setForm} guideId={guideId} onNext={() => setStep(4)} onBack={() => setStep(2)} />
            ) : (
              <div className="wizard-panel-mini">
                <div className="step-badge-mini">3</div>
                <div className="text-[#C9A84C]/60 text-xs font-bold mt-2">REVIEW & CONFIRM</div>
                {step > 3 && <span className="text-green-400 text-xs mt-1 block">✓ Confirmed</span>}
              </div>
            )}
          </div>

          {/* Step 4 */}
          <div className={`lg:col-span-1 ${step === 4 ? "ring-2 ring-[#C9A84C]/40 rounded-xl" : step > 4 ? "opacity-40 pointer-events-none" : "opacity-20 pointer-events-none"}`}>
            {step === 4 && guideId ? (
              <Step4Rights form={form} setForm={setForm} guideId={guideId} onNext={() => setStep(5)} onBack={() => setStep(3)} />
            ) : (
              <div className="wizard-panel-mini">
                <div className="step-badge-mini">4</div>
                <div className="text-[#C9A84C]/60 text-xs font-bold mt-2">RIGHTS & PERMISSIONS</div>
                {step > 4 && <span className="text-green-400 text-xs mt-1 block">✓ Set</span>}
              </div>
            )}
          </div>

          {/* Step 5 */}
          <div className={`lg:col-span-1 ${step === 5 ? "ring-2 ring-[#C9A84C]/40 rounded-xl" : step > 5 ? "opacity-40 pointer-events-none" : "opacity-20 pointer-events-none"}`}>
            {step === 5 ? (
              <Step5Connect form={form} setForm={setForm} user={user as any} onNext={() => setStep(6)} onBack={() => setStep(4)} />
            ) : (
              <div className="wizard-panel-mini">
                <div className="step-badge-mini">5</div>
                <div className="text-[#C9A84C]/60 text-xs font-bold mt-2">CONNECT CREATOR</div>
                {step > 5 && <span className="text-green-400 text-xs mt-1 block">✓ Connected</span>}
              </div>
            )}
          </div>

          {/* Step 6 */}
          <div className={`lg:col-span-1 ${step === 6 ? "ring-2 ring-[#C9A84C]/40 rounded-xl" : "opacity-20 pointer-events-none"}`}>
            {step === 6 && guideId ? (
              <Step6Publish form={form} guideId={guideId} onBack={() => setStep(5)} />
            ) : (
              <div className="wizard-panel-mini">
                <div className="step-badge-mini">6</div>
                <div className="text-[#C9A84C]/60 text-xs font-bold mt-2">PUBLISH GUIDE</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom info strip */}
        <div className="mt-12 border-t border-[#2a2010] pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* How the system works */}
            <div className="md:col-span-1">
              <h3 className="text-[#C9A84C] text-xs font-bold tracking-wider uppercase mb-4">HOW THE SYSTEM WORKS</h3>
              <div className="flex items-start gap-2 flex-wrap">
                {[
                  { icon: "📄", label: "Upload Provenance Sheet\nYou upload your sheet and artwork" },
                  { icon: "⚙️", label: "AI Extracts Information\nWe extract key data and imagery" },
                  { icon: "✓", label: "You Review & Confirm\nYou choose how to confirm the extracted data" },
                  { icon: "⚖️", label: "Set Rights & Permissions\nYou choose how your guide can be used" },
                  { icon: "💳", label: "Connect Stripe\nSecure payouts for you automatically" },
                  { icon: "🌐", label: "Guide Goes Live\nYour guide becomes part of the Living Nexus" },
                ].map((item, i, arr) => (
                  <div key={i} className="flex items-start gap-1">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded bg-[#1e1a0e] border border-[#3a3020] flex items-center justify-center text-sm">{item.icon}</div>
                      <div className="text-[#6b5f3e] text-[9px] text-center mt-1 max-w-[60px] leading-tight whitespace-pre-line">{item.label}</div>
                    </div>
                    {i < arr.length - 1 && <span className="text-[#3a3020] mt-2 mx-1">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Derivative Example Flow */}
            <div className="md:col-span-1">
              <h3 className="text-[#C9A84C] text-xs font-bold tracking-wider uppercase mb-4">DERIVATIVE EXAMPLE FLOW</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {["Original Guide", "Comic Appearance", "Animated Variant", "Collectible Figure", "Game Appearance"].map((label, i, arr) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded bg-[#1e1a0e] border border-[#3a3020] flex items-center justify-center text-2xl">
                        {["🧙", "📖", "🎬", "🏺", "🎮"][i]}
                      </div>
                      <div className="text-[#6b5f3e] text-[9px] text-center mt-1 max-w-[56px] leading-tight">{label}</div>
                    </div>
                    {i < arr.length - 1 && <span className="text-[#3a3020]">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Built on Provenance */}
            <div className="md:col-span-1">
              <h3 className="text-[#C9A84C] text-xs font-bold tracking-wider uppercase mb-4">BUILT ON PROVENANCE</h3>
              <p className="text-[#6b5f3e] text-xs mb-3">Every guide, derivative, and manifestation is cryptographically linked to its origin.</p>
              {["Immutable Lineage", "Creator Protection", "Transparent Attribution", "Fair Revenue Distribution"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[#a89060] text-xs mb-2">
                  <span className="text-[#C9A84C]">✓</span> {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#2a2010] mt-8 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#6b5f3e] text-xs">
            <span className="text-[#C9A84C]">🔒</span>
            <span>LIVING NEXUS PROVENANCE PROTOCOL v1.0</span>
          </div>
          <div className="text-[#4a3f20] text-xs tracking-widest">
            TRUTH · CREATION · PROTECTION · LEGACY
          </div>
          <div className="text-[#6b5f3e] text-xs italic">
            YOU CANNOT PROTECT CREATION WITHOUT PROTECTING THE CREATOR.
          </div>
        </div>
      </div>
    </div>
  );
}
