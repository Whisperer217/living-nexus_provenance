/**
 * VisualWorksNewPage.tsx
 *
 * Full registration flow for a new Visual Works collection.
 *
 * Flow:
 *   1. Collection metadata form (title, description, medium, etc.)
 *   2. Image upload panel — multi-image drag-and-drop
 *   3. Per-image metadata (title, versionLabel, haaiDisclosure)
 *   4. Publish — generates WID-VWC and seals the collection
 *
 * Design: sovereign cathedral — rose/pink accent (#FDA4AF), deep space bg,
 * gold provenance marks, Cinzel headings.
 */
import React, { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PendingImage {
  file: File;
  previewUrl: string;
  title: string;
  versionLabel: string;
  haaiDisclosure: "none" | "assisted" | "generated";
  description: string;
  uploading: boolean;
  uploadedUrl?: string;
  uploadedItemId?: number;
  witnessId?: string;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VisualWorksNewPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Step state
  const [step, setStep] = useState<"meta" | "images" | "publish" | "done">("meta");

  // Collection metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediumType, setMediumType] = useState("");
  const [style, setStyle] = useState("");
  const [subject, setSubject] = useState("");
  const [keywords, setKeywords] = useState("");
  const [license, setLicense] = useState("");
  const [copyright, setCopyright] = useState("");
  const [haaiDisclosure, setHaaiDisclosure] = useState<"none" | "assisted" | "generated">("none");
  const [originStory, setOriginStory] = useState("");

  // Collection ID (created after step 1)
  const [collectionId, setCollectionId] = useState<number | null>(null);

  // Images
  const [images, setImages] = useState<PendingImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Published WID
  const [publishedWid, setPublishedWid] = useState<string | null>(null);

  // tRPC mutations
  const createCollection = trpc.visualWorks.createCollection.useMutation();
  const uploadItem = trpc.visualWorks.uploadItem.useMutation();
  const publishCollection = trpc.visualWorks.publishCollection.useMutation();

  // ── Redirect if not logged in ──────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void, #0A0806)" }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: "#8B9BA3" }}>You must be logged in to register visual works.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ background: "rgba(253,164,175,0.12)", color: "#FDA4AF", border: "1px solid rgba(253,164,175,0.3)" }}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Create collection ──────────────────────────────────────────────
  const handleCreateCollection = async () => {
    if (!title.trim()) { toast.error("Collection title is required"); return; }
    try {
      const result = await createCollection.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        mediumType: mediumType || undefined,
        style: style.trim() || undefined,
        subject: subject.trim() || undefined,
        keywords: keywords.trim() || undefined,
        license: license.trim() || undefined,
        copyright: copyright.trim() || undefined,
        haaiDisclosure: haaiDisclosure,
        originStory: originStory.trim() || undefined,
      });
      setCollectionId(result.id);
      setStep("images");
      toast.success("Collection created — now add your images");
    } catch {
      toast.error("Failed to create collection");
    }
  };

  // ── Image handling ─────────────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter(f => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} exceeds 20 MB limit`); return false; }
      return true;
    });
    const newImages: PendingImage[] = valid.map(f => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      title: f.name.replace(/\.[^/.]+$/, ""),
      versionLabel: "",
      haaiDisclosure: "none",
      description: "",
      uploading: false,
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const updateImage = (idx: number, patch: Partial<PendingImage>) => {
    setImages(prev => prev.map((img, i) => i === idx ? { ...img, ...patch } : img));
  };

  const removeImage = (idx: number) => {
    setImages(prev => {
      const img = prev[idx];
      if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Step 2: Upload all images ──────────────────────────────────────────────
  const handleUploadAll = async () => {
    if (!collectionId) return;
    if (images.length === 0) { toast.error("Add at least one image"); return; }

    let allOk = true;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.uploadedItemId) continue; // already uploaded
      updateImage(i, { uploading: true, error: undefined });
      try {
        const imageData = await fileToBase64(img.file);
        const result = await uploadItem.mutateAsync({
          collectionId,
          imageData,
          mimeType: img.file.type,
          fileName: img.file.name,
          title: img.title.trim() || undefined,
          description: img.description.trim() || undefined,
          haaiDisclosure: img.haaiDisclosure,
          versionLabel: img.versionLabel.trim() || undefined,
          displayOrder: i,
        });
        updateImage(i, {
          uploading: false,
          uploadedItemId: result.id,
          uploadedUrl: result.imageUrl,
          witnessId: result.witnessId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateImage(i, { uploading: false, error: msg });
        allOk = false;
      }
    }

    if (allOk) {
      setStep("publish");
      toast.success("All images uploaded — ready to seal the collection");
    } else {
      toast.error("Some images failed to upload — fix errors and retry");
    }
  };

  // ── Step 3: Publish ────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!collectionId) return;
    try {
      const result = await publishCollection.mutateAsync({ collectionId });
      setPublishedWid(result.collectionWid);
      setStep("done");
      toast.success("Collection sealed with provenance!");
    } catch {
      toast.error("Failed to publish collection");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const ACCENT = "#FDA4AF";
  const ACCENT_BG = "rgba(253,164,175,0.08)";
  const ACCENT_BORDER = "rgba(253,164,175,0.25)";

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void, #0A0806)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(10,8,6,0.92)", borderBottom: "1px solid rgba(253,164,175,0.12)", backdropFilter: "blur(12px)" }}
      >
        <button onClick={() => navigate("/visual-works")} className="text-xs hover:opacity-70" style={{ color: "#5A6A72" }}>
          ← Visual Works
        </button>
        <div className="flex-1" />
        <span className="text-xs font-heading tracking-widest uppercase" style={{ color: ACCENT }}>
          Register Collection
        </span>
      </div>

      {/* Step indicator */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-2">
        <div className="flex items-center gap-2 mb-8">
          {[
            { id: "meta", label: "1. Details" },
            { id: "images", label: "2. Images" },
            { id: "publish", label: "3. Seal" },
          ].map((s, i) => {
            const isActive = step === s.id;
            const isDone = (step === "images" && i === 0) || (step === "publish" && i < 2) || step === "done";
            return (
              <React.Fragment key={s.id}>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: isActive ? ACCENT_BG : "transparent",
                    color: isActive ? ACCENT : isDone ? "#5A6A72" : "#3A4A52",
                    border: isActive ? `1px solid ${ACCENT_BORDER}` : "1px solid transparent",
                  }}
                >
                  {isDone && !isActive ? "✓ " : ""}{s.label}
                </div>
                {i < 2 && <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Step: meta ── */}
        {step === "meta" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}>
                Collection Details
              </h2>
              <p className="text-xs" style={{ color: "#5A6A72" }}>
                These details describe the entire collection and will be sealed into the WID-VWC provenance record.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>
                Collection Title <span style={{ color: ACCENT }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Portraits of the Sovereign, Urban Geometry Series..."
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this collection represent? What story does it tell?"
                rows={3}
                className="w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Medium Type</label>
                <select
                  value={mediumType}
                  onChange={e => setMediumType(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: mediumType ? "var(--ln-parchment, #E8DFC8)" : "#5A6A72" }}
                >
                  <option value="">Select (optional)</option>
                  <option value="Photography">Photography</option>
                  <option value="Painting">Painting</option>
                  <option value="Illustration">Illustration</option>
                  <option value="Digital Art">Digital Art</option>
                  <option value="AI-Generated">AI-Generated</option>
                  <option value="Mixed Media">Mixed Media</option>
                  <option value="Concept Art">Concept Art</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Wallpaper">Wallpaper</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>AI Disclosure</label>
                <select
                  value={haaiDisclosure}
                  onChange={e => setHaaiDisclosure(e.target.value as "none" | "assisted" | "generated")}
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                >
                  <option value="none">None — 100% human-made</option>
                  <option value="assisted">AI-Assisted</option>
                  <option value="generated">AI-Generated</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Style</label>
                <input
                  type="text"
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  placeholder="Abstract, Realism, Surrealism..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Portrait, Landscape, Architecture..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Keywords</label>
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="Comma-separated: nature, black and white, urban..."
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>License</label>
                <input
                  type="text"
                  value={license}
                  onChange={e => setLicense(e.target.value)}
                  placeholder="All Rights Reserved, CC BY-NC..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Copyright</label>
                <input
                  type="text"
                  value={copyright}
                  onChange={e => setCopyright(e.target.value)}
                  placeholder="© 2025 Your Name"
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>
                Origin Story <span style={{ color: "#5A6A72" }}>(optional)</span>
              </label>
              <textarea
                value={originStory}
                onChange={e => setOriginStory(e.target.value)}
                placeholder="What inspired this collection? What moment, feeling, or vision gave it life?"
                rows={3}
                className="w-full rounded-xl px-4 py-2.5 text-sm resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
              />
            </div>

            <button
              onClick={handleCreateCollection}
              disabled={createCollection.isPending || !title.trim()}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #F43F5E 100%)`, color: "#fff" }}
            >
              {createCollection.isPending ? "Creating…" : "Continue — Add Images →"}
            </button>
          </div>
        )}

        {/* ── Step: images ── */}
        {step === "images" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}>
                Add Images
              </h2>
              <p className="text-xs" style={{ color: "#5A6A72" }}>
                Each image will receive a unique WID-VIS provenance anchor. Drag and drop or click to browse.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragging ? ACCENT : ACCENT_BORDER}`,
                background: dragging ? ACCENT_BG : "rgba(255,255,255,0.02)",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); }}
              />
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
                <span style={{ color: ACCENT, fontSize: 18 }}>+</span>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>
                Drop images here or click to browse
              </p>
              <p className="text-xs mt-1" style={{ color: "#5A6A72" }}>JPEG, PNG, WebP, GIF — max 20 MB each</p>
            </div>

            {/* Image list */}
            {images.length > 0 && (
              <div className="space-y-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl p-3 flex gap-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${img.error ? "rgba(239,68,68,0.3)" : ACCENT_BORDER}` }}
                  >
                    {/* Preview */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: ACCENT_BG }}>
                      <img src={img.previewUrl} alt={img.title} className="w-full h-full object-cover" />
                    </div>
                    {/* Fields */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        type="text"
                        value={img.title}
                        onChange={e => updateImage(idx, { title: e.target.value })}
                        placeholder="Image title"
                        className="w-full rounded-lg px-3 py-1.5 text-xs"
                        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={img.versionLabel}
                          onChange={e => updateImage(idx, { versionLabel: e.target.value })}
                          placeholder="Version (Sketch, Draft, Final…)"
                          className="flex-1 rounded-lg px-3 py-1.5 text-xs"
                          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                        />
                        <select
                          value={img.haaiDisclosure}
                          onChange={e => updateImage(idx, { haaiDisclosure: e.target.value as "none" | "assisted" | "generated" })}
                          className="rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
                        >
                          <option value="none">Human</option>
                          <option value="assisted">AI-Assisted</option>
                          <option value="generated">AI-Generated</option>
                        </select>
                      </div>
                      {img.witnessId && (
                        <p className="text-[9px] font-mono" style={{ color: ACCENT }}>✦ {img.witnessId}</p>
                      )}
                      {img.error && (
                        <p className="text-[9px]" style={{ color: "#F87171" }}>⚠ {img.error}</p>
                      )}
                    </div>
                    {/* Status / remove */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {img.uploading ? (
                        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
                      ) : img.uploadedItemId ? (
                        <span style={{ color: "var(--ln-seal-bright, #4ADE80)", fontSize: 14 }}>✓</span>
                      ) : (
                        <button
                          onClick={() => removeImage(idx)}
                          className="text-xs hover:opacity-70"
                          style={{ color: "#5A6A72" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleUploadAll}
              disabled={images.length === 0 || uploadItem.isPending || images.some(i => i.uploading)}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #F43F5E 100%)`, color: "#fff" }}
            >
              {images.some(i => i.uploading) ? "Uploading…" : `Upload ${images.length} Image${images.length !== 1 ? "s" : ""} →`}
            </button>
          </div>
        )}

        {/* ── Step: publish ── */}
        {step === "publish" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}>
                Seal the Collection
              </h2>
              <p className="text-xs" style={{ color: "#5A6A72" }}>
                Publishing generates a WID-VWC — a cryptographic Witness ID anchored to all {images.length} image{images.length !== 1 ? "s" : ""} in this collection.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
              <p className="text-xs font-heading tracking-widest uppercase" style={{ color: ACCENT }}>Collection Summary</p>
              <p className="text-sm font-bold" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>{title}</p>
              {mediumType && <p className="text-xs" style={{ color: "#8B9BA3" }}>{mediumType}</p>}
              <p className="text-xs" style={{ color: "#5A6A72" }}>{images.length} image{images.length !== 1 ? "s" : ""} · {images.filter(i => i.witnessId).length} WID-VIS anchors</p>
            </div>

            <div className="rounded-xl p-4" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.2)" }}>
              <p className="text-xs font-heading tracking-widest uppercase mb-2" style={{ color: "var(--ln-gold, #C49A28)" }}>
                ✦ Provenance Seal
              </p>
              <p className="text-xs" style={{ color: "#8B9BA3" }}>
                Publishing is permanent. The WID-VWC will be derived from all individual WID-VIS anchors in this collection,
                creating an immutable provenance chain. You can still add new images after publishing, but the original seal
                will remain as a historical record.
              </p>
            </div>

            <button
              onClick={handlePublish}
              disabled={publishCollection.isPending}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #C49A28 0%, #F5C451 100%)", color: "#0A0806" }}
            >
              {publishCollection.isPending ? "Sealing…" : "✦ Seal with Provenance"}
            </button>
          </div>
        )}

        {/* ── Step: done ── */}
        {step === "done" && publishedWid && (
          <div className="text-center py-8 space-y-6">
            {/* Seal animation */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(196,154,40,0.12)", border: "2px solid rgba(196,154,40,0.5)" }}
            >
              <span style={{ fontSize: 32 }}>✦</span>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}>
                Collection Sealed
              </h2>
              <p className="text-xs" style={{ color: "#8B9BA3" }}>
                Your visual works are now registered with cryptographic provenance.
              </p>
            </div>
            {/* WID display */}
            <div className="rounded-xl p-4" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.3)" }}>
              <p className="text-[9px] font-heading tracking-widest uppercase mb-1" style={{ color: "var(--ln-gold, #C49A28)" }}>
                Witness ID — Collection
              </p>
              <p className="font-mono text-sm font-bold break-all" style={{ color: "var(--ln-gold, #C49A28)" }}>
                {publishedWid}
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(publishedWid).catch(() => {}); toast.success("WID copied"); }}
                className="mt-2 text-xs hover:underline"
                style={{ color: "#8B9BA3" }}
              >
                Copy WID
              </button>
            </div>
            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/visual-works")}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}
              >
                Browse Visual Works
              </button>
              {collectionId && (
                <button
                  onClick={() => navigate(`/visual-works/${collectionId}`)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #F43F5E 100%)`, color: "#fff" }}
                >
                  View Collection →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
