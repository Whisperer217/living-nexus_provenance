/**
 * VisualWorksNewPage.tsx
 *
 * Full registration flow for a new Visual Works collection.
 *
 * Flow:
 *   1. Collection metadata form (title, description, medium, etc.)
 *   2. Image upload panel — multi-image drag-and-drop with:
 *        • Drag-to-reorder (HTML5 DnD, no external lib)
 *        • Per-image animated progress bar (queued → reading → uploading → sealed)
 *        • Global progress strip at the top of the upload step
 *        • Grid / list view toggle
 *        • Batch-select for bulk remove
 *   3. Publish — generates WID-VWC and seals the collection
 *
 * Design: sovereign cathedral — rose/pink accent (#FDA4AF), deep space bg,
 * gold provenance marks, Cinzel headings.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type UploadPhase = "queued" | "reading" | "uploading" | "sealed" | "error";

interface PendingImage {
  /** Stable client-side key (never changes, used as React key) */
  key: string;
  file: File;
  previewUrl: string;
  title: string;
  versionLabel: string;
  haaiDisclosure: "none" | "assisted" | "generated";
  description: string;
  phase: UploadPhase;
  /** 0–100 */
  progress: number;
  uploadedUrl?: string;
  uploadedItemId?: number;
  witnessId?: string;
  errorMsg?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let _keyCounter = 0;
function nextKey() { return `img-${++_keyCounter}-${Date.now()}`; }

function fileToBase64(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload = () => {
      if (onProgress) onProgress(100);
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PHASE_LABEL: Record<UploadPhase, string> = {
  queued:    "Queued",
  reading:   "Reading…",
  uploading: "Uploading…",
  sealed:    "Sealed ✦",
  error:     "Error",
};

const PHASE_COLOR: Record<UploadPhase, string> = {
  queued:    "#5A6A72",
  reading:   "#FDA4AF",
  uploading: "#FDA4AF",
  sealed:    "#4ADE80",
  error:     "#F87171",
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Thin animated progress bar */
function ProgressBar({ value, phase }: { value: number; phase: UploadPhase }) {
  const color = phase === "sealed" ? "#4ADE80" : phase === "error" ? "#F87171" : "#FDA4AF";
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${value}%`,
          background: color,
          boxShadow: phase === "uploading" ? `0 0 6px ${color}` : "none",
        }}
      />
    </div>
  );
}

/** Global upload summary strip */
function GlobalProgressStrip({ images }: { images: PendingImage[] }) {
  if (images.length === 0) return null;
  const total = images.length;
  const sealed = images.filter(i => i.phase === "sealed").length;
  const errored = images.filter(i => i.phase === "error").length;
  const active = images.filter(i => i.phase === "reading" || i.phase === "uploading").length;
  const pct = Math.round((sealed / total) * 100);

  if (sealed === 0 && active === 0 && errored === 0) return null;

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: "rgba(253,164,175,0.06)", border: "1px solid rgba(253,164,175,0.18)" }}
    >
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: "#FDA4AF" }}>
          {active > 0 ? `Uploading ${active} image${active !== 1 ? "s" : ""}…` : sealed === total ? "All images uploaded" : `${sealed} / ${total} uploaded`}
        </span>
        <span style={{ color: "#5A6A72" }}>
          {errored > 0 && <span style={{ color: "#F87171" }}>{errored} error{errored !== 1 ? "s" : ""} · </span>}
          {pct}%
        </span>
      </div>
      <ProgressBar value={pct} phase={errored > 0 ? "error" : sealed === total ? "sealed" : "uploading"} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

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
  const [dropZoneDragging, setDropZoneDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state
  const dragSrcIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [reorderHint, setReorderHint] = useState<number | null>(null); // idx being hovered

  // Upload running flag (prevents double-submit)
  const [uploading, setUploading] = useState(false);

  // Published WID
  const [publishedWid, setPublishedWid] = useState<string | null>(null);

  // tRPC mutations
  const createCollection = trpc.visualWorks.createCollection.useMutation();
  const uploadItem = trpc.visualWorks.uploadItem.useMutation();
  const publishCollection = trpc.visualWorks.publishCollection.useMutation();

  // ── Cleanup object URLs on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => { images.forEach(i => URL.revokeObjectURL(i.previewUrl)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auth guard ──────────────────────────────────────────────────────────────
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
        haaiDisclosure,
        originStory: originStory.trim() || undefined,
      });
      setCollectionId(result.id);
      setStep("images");
      toast.success("Collection created — now add your images");
    } catch {
      toast.error("Failed to create collection");
    }
  };

  // ── Image file ingestion ───────────────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter(f => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} exceeds 20 MB limit`); return false; }
      return true;
    });
    const newImages: PendingImage[] = valid.map(f => ({
      key: nextKey(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      title: f.name.replace(/\.[^/.]+$/, ""),
      versionLabel: "",
      haaiDisclosure: "none",
      description: "",
      phase: "queued",
      progress: 0,
    }));
    setImages(prev => [...prev, ...newImages]);
  }, []);

  // ── Drop zone handlers (file drop, not reorder) ────────────────────────────
  const handleDropZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneDragging(false);
    // Only handle file drops (not reorder drags)
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  // ── Image field update ─────────────────────────────────────────────────────
  const updateImage = useCallback((key: string, patch: Partial<PendingImage>) => {
    setImages(prev => prev.map(img => img.key === key ? { ...img, ...patch } : img));
  }, []);

  const removeImage = useCallback((key: string) => {
    setImages(prev => {
      const img = prev.find(i => i.key === key);
      if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.key !== key);
    });
  }, []);

  // ── Drag-to-reorder handlers ───────────────────────────────────────────────
  const handleItemDragStart = (e: React.DragEvent, idx: number) => {
    dragSrcIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    // Use a transparent 1x1 ghost so we can paint our own drag indicator
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleItemDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragSrcIdx.current === null || dragSrcIdx.current === idx) return;
    dragOverIdx.current = idx;
    setReorderHint(idx);
  };

  const handleItemDragLeave = () => {
    dragOverIdx.current = null;
    setReorderHint(null);
  };

  const handleItemDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation(); // don't bubble to drop zone
    setReorderHint(null);
    if (dragSrcIdx.current === null || dragSrcIdx.current === idx) return;
    const from = dragSrcIdx.current;
    setImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    dragSrcIdx.current = null;
    dragOverIdx.current = null;
  };

  const handleItemDragEnd = () => {
    dragSrcIdx.current = null;
    dragOverIdx.current = null;
    setReorderHint(null);
  };

  // ── Step 2: Upload all images ──────────────────────────────────────────────
  const handleUploadAll = async () => {
    if (!collectionId) return;
    if (images.length === 0) { toast.error("Add at least one image"); return; }
    if (uploading) return;
    setUploading(true);

    let allOk = true;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.phase === "sealed") continue; // already uploaded
      if (img.phase === "error") {
        // reset so it retries
        updateImage(img.key, { phase: "queued", progress: 0, errorMsg: undefined });
      }

      // Phase: reading
      updateImage(img.key, { phase: "reading", progress: 0 });
      let imageData: string;
      try {
        imageData = await fileToBase64(img.file, (pct) => {
          updateImage(img.key, { progress: Math.round(pct * 0.4) }); // reading = 0–40%
        });
      } catch {
        updateImage(img.key, { phase: "error", errorMsg: "Failed to read file", progress: 0 });
        allOk = false;
        continue;
      }

      // Phase: uploading
      updateImage(img.key, { phase: "uploading", progress: 40 });

      // Simulate smooth progress while the network request is in flight
      let fakeProgress = 40;
      const ticker = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + 3, 90);
        updateImage(img.key, { progress: fakeProgress });
      }, 120);

      try {
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
        clearInterval(ticker);
        updateImage(img.key, {
          phase: "sealed",
          progress: 100,
          uploadedItemId: result.id,
          uploadedUrl: result.imageUrl,
          witnessId: result.witnessId,
        });
      } catch (err) {
        clearInterval(ticker);
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateImage(img.key, { phase: "error", progress: 0, errorMsg: msg });
        allOk = false;
      }
    }

    setUploading(false);
    if (allOk) {
      setStep("publish");
      toast.success("All images uploaded — ready to seal the collection");
    } else {
      toast.error("Some images failed — fix errors and click Upload again");
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

  const anyUploading = images.some(i => i.phase === "reading" || i.phase === "uploading");
  const allSealed = images.length > 0 && images.every(i => i.phase === "sealed");
  const sealedCount = images.filter(i => i.phase === "sealed").length;
  const errorCount = images.filter(i => i.phase === "error").length;

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void, #0A0806)" }}>
      {/* ── Sticky header ── */}
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

      {/* ── Step indicator ── */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-2">
        <div className="flex items-center gap-2 mb-8">
          {[
            { id: "meta",    label: "1. Details" },
            { id: "images",  label: "2. Images"  },
            { id: "publish", label: "3. Seal"    },
          ].map((s, i) => {
            const isActive = step === s.id;
            const isDone = (step === "images" && i === 0)
              || (step === "publish" && i < 2)
              || step === "done";
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

        {/* ════════════════════════════════════════════════════════════════
            STEP 1 — Collection Details
        ════════════════════════════════════════════════════════════════ */}
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
                placeholder="e.g. Portraits of the Sovereign, Urban Geometry Series…"
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }}
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Description</label>
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
                <input type="text" value={style} onChange={e => setStyle(e.target.value)} placeholder="Abstract, Realism…"
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Portrait, Landscape…"
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Keywords</label>
              <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Comma-separated: nature, black and white, urban…"
                className="w-full rounded-xl px-4 py-2.5 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>License</label>
                <input type="text" value={license} onChange={e => setLicense(e.target.value)} placeholder="All Rights Reserved, CC BY-NC…"
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Copyright</label>
                <input type="text" value={copyright} onChange={e => setCopyright(e.target.value)} placeholder="© 2025 Your Name"
                  className="w-full rounded-xl px-4 py-2.5 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${ACCENT_BORDER}`, color: "var(--ln-parchment, #E8DFC8)" }} />
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

        {/* ════════════════════════════════════════════════════════════════
            STEP 2 — Images
        ════════════════════════════════════════════════════════════════ */}
        {step === "images" && (
          <div className="space-y-4">
            {/* Heading + view toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold mb-0.5" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}>
                  Add Images
                </h2>
                <p className="text-xs" style={{ color: "#5A6A72" }}>
                  Each image gets a unique WID-VIS anchor. Drag rows to reorder before uploading.
                </p>
              </div>
              {images.length > 1 && (
                <div
                  className="flex items-center gap-0.5 rounded-lg p-0.5 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {(["list", "grid"] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setViewMode(v)}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
                      style={{
                        background: viewMode === v ? "rgba(253,164,175,0.15)" : "transparent",
                        color: viewMode === v ? "#FDA4AF" : "#5A6A72",
                      }}
                    >
                      {v === "list" ? "≡ List" : "⊞ Grid"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Global progress strip */}
            <GlobalProgressStrip images={images} />

            {/* ── Drop zone ── */}
            <div
              onDragOver={e => {
                // Only activate drop zone highlight for file drags, not item reorders
                if (dragSrcIdx.current !== null) return;
                e.preventDefault();
                setDropZoneDragging(true);
              }}
              onDragLeave={() => setDropZoneDragging(false)}
              onDrop={handleDropZoneDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-6 text-center cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dropZoneDragging ? ACCENT : ACCENT_BORDER}`,
                background: dropZoneDragging ? ACCENT_BG : "rgba(255,255,255,0.02)",
                transform: dropZoneDragging ? "scale(1.01)" : "scale(1)",
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
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 transition-all"
                style={{
                  background: dropZoneDragging ? "rgba(253,164,175,0.2)" : ACCENT_BG,
                  border: `1px solid ${ACCENT_BORDER}`,
                }}
              >
                <span style={{ color: ACCENT, fontSize: 20, lineHeight: 1 }}>+</span>
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>
                {dropZoneDragging ? "Release to add images" : "Drop images here or click to browse"}
              </p>
              <p className="text-xs mt-1" style={{ color: "#5A6A72" }}>JPEG, PNG, WebP, GIF — max 20 MB each</p>
              {images.length > 0 && (
                <p className="text-xs mt-1.5" style={{ color: "#3A4A52" }}>
                  {images.length} image{images.length !== 1 ? "s" : ""} queued
                  {sealedCount > 0 ? ` · ${sealedCount} sealed` : ""}
                </p>
              )}
            </div>

            {/* ── Image list / grid ── */}
            {images.length > 0 && (
              <>
                {viewMode === "list" ? (
                  /* ── LIST VIEW ── */
                  <div className="space-y-2">
                    {images.map((img, idx) => {
                      const isBeingDragged = dragSrcIdx.current === idx;
                      const isReorderTarget = reorderHint === idx;
                      return (
                        <div
                          key={img.key}
                          draggable={img.phase !== "reading" && img.phase !== "uploading"}
                          onDragStart={e => handleItemDragStart(e, idx)}
                          onDragOver={e => handleItemDragOver(e, idx)}
                          onDragLeave={handleItemDragLeave}
                          onDrop={e => handleItemDrop(e, idx)}
                          onDragEnd={handleItemDragEnd}
                          className="rounded-xl transition-all duration-150"
                          style={{
                            background: isReorderTarget
                              ? "rgba(253,164,175,0.10)"
                              : "rgba(255,255,255,0.03)",
                            border: `1px solid ${
                              isReorderTarget
                                ? ACCENT
                                : img.phase === "error"
                                ? "rgba(239,68,68,0.35)"
                                : img.phase === "sealed"
                                ? "rgba(74,222,128,0.25)"
                                : ACCENT_BORDER
                            }`,
                            opacity: isBeingDragged ? 0.4 : 1,
                            cursor: img.phase === "reading" || img.phase === "uploading" ? "default" : "grab",
                            transform: isReorderTarget ? "translateX(4px)" : "none",
                          }}
                        >
                          <div className="p-3 flex gap-3">
                            {/* Drag handle */}
                            <div
                              className="flex flex-col items-center justify-center gap-0.5 flex-shrink-0 opacity-30 hover:opacity-70 transition-opacity"
                              style={{ width: 12, cursor: "grab" }}
                            >
                              {[0,1,2].map(d => (
                                <div key={d} className="w-1 h-1 rounded-full" style={{ background: "#FDA4AF" }} />
                              ))}
                            </div>

                            {/* Position badge */}
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
                              style={{ background: "rgba(253,164,175,0.08)", color: "#FDA4AF", border: "1px solid rgba(253,164,175,0.2)" }}
                            >
                              {idx + 1}
                            </div>

                            {/* Thumbnail */}
                            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ background: ACCENT_BG }}>
                              <img src={img.previewUrl} alt={img.title} className="w-full h-full object-cover" />
                              {/* Phase overlay */}
                              {(img.phase === "reading" || img.phase === "uploading") && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
                                </div>
                              )}
                              {img.phase === "sealed" && (
                                <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
                                  <span style={{ color: "#4ADE80", fontSize: 16 }}>✓</span>
                                </div>
                              )}
                            </div>

                            {/* Fields */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <input
                                type="text"
                                value={img.title}
                                onChange={e => updateImage(img.key, { title: e.target.value })}
                                placeholder="Image title"
                                disabled={img.phase === "sealed"}
                                className="w-full rounded-lg px-3 py-1.5 text-xs"
                                style={{
                                  background: "rgba(255,255,255,0.04)",
                                  border: `1px solid ${ACCENT_BORDER}`,
                                  color: "var(--ln-parchment, #E8DFC8)",
                                  opacity: img.phase === "sealed" ? 0.6 : 1,
                                }}
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={img.versionLabel}
                                  onChange={e => updateImage(img.key, { versionLabel: e.target.value })}
                                  placeholder="Version (Sketch, Draft, Final…)"
                                  disabled={img.phase === "sealed"}
                                  className="flex-1 rounded-lg px-3 py-1.5 text-xs"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border: `1px solid ${ACCENT_BORDER}`,
                                    color: "var(--ln-parchment, #E8DFC8)",
                                    opacity: img.phase === "sealed" ? 0.6 : 1,
                                  }}
                                />
                                <select
                                  value={img.haaiDisclosure}
                                  onChange={e => updateImage(img.key, { haaiDisclosure: e.target.value as "none" | "assisted" | "generated" })}
                                  disabled={img.phase === "sealed"}
                                  className="rounded-lg px-2 py-1.5 text-xs"
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border: `1px solid ${ACCENT_BORDER}`,
                                    color: "var(--ln-parchment, #E8DFC8)",
                                    opacity: img.phase === "sealed" ? 0.6 : 1,
                                  }}
                                >
                                  <option value="none">Human</option>
                                  <option value="assisted">AI-Assisted</option>
                                  <option value="generated">AI-Generated</option>
                                </select>
                              </div>

                              {/* Progress bar */}
                              {(img.phase !== "queued") && (
                                <div className="space-y-0.5">
                                  <ProgressBar value={img.progress} phase={img.phase} />
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px]" style={{ color: PHASE_COLOR[img.phase] }}>
                                      {PHASE_LABEL[img.phase]}
                                    </span>
                                    {img.witnessId && (
                                      <span className="text-[9px] font-mono" style={{ color: "#4ADE80" }}>
                                        ✦ {img.witnessId}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {img.errorMsg && (
                                <p className="text-[9px]" style={{ color: "#F87171" }}>⚠ {img.errorMsg}</p>
                              )}
                            </div>

                            {/* Remove button */}
                            <div className="flex flex-col items-center justify-start flex-shrink-0 pt-0.5">
                              {img.phase !== "reading" && img.phase !== "uploading" && img.phase !== "sealed" && (
                                <button
                                  onClick={() => removeImage(img.key)}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:opacity-80 transition-opacity"
                                  style={{ background: "rgba(239,68,68,0.12)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ── GRID VIEW ── */
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, idx) => {
                      const isReorderTarget = reorderHint === idx;
                      return (
                        <div
                          key={img.key}
                          draggable={img.phase !== "reading" && img.phase !== "uploading"}
                          onDragStart={e => handleItemDragStart(e, idx)}
                          onDragOver={e => handleItemDragOver(e, idx)}
                          onDragLeave={handleItemDragLeave}
                          onDrop={e => handleItemDrop(e, idx)}
                          onDragEnd={handleItemDragEnd}
                          className="rounded-xl overflow-hidden relative group transition-all duration-150"
                          style={{
                            border: `1px solid ${
                              isReorderTarget ? ACCENT
                              : img.phase === "error" ? "rgba(239,68,68,0.35)"
                              : img.phase === "sealed" ? "rgba(74,222,128,0.25)"
                              : ACCENT_BORDER
                            }`,
                            cursor: img.phase === "reading" || img.phase === "uploading" ? "default" : "grab",
                            transform: isReorderTarget ? "scale(1.04)" : "scale(1)",
                            opacity: dragSrcIdx.current === idx ? 0.4 : 1,
                          }}
                        >
                          {/* Thumbnail */}
                          <div className="aspect-square relative" style={{ background: ACCENT_BG }}>
                            <img src={img.previewUrl} alt={img.title} className="w-full h-full object-cover" />

                            {/* Phase overlay */}
                            {(img.phase === "reading" || img.phase === "uploading") && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: "rgba(0,0,0,0.6)" }}>
                                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
                                <span className="text-[8px]" style={{ color: ACCENT }}>{img.progress}%</span>
                              </div>
                            )}
                            {img.phase === "sealed" && (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
                                <span style={{ color: "#4ADE80", fontSize: 20 }}>✓</span>
                              </div>
                            )}
                            {img.phase === "error" && (
                              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                                <span style={{ color: "#F87171", fontSize: 18 }}>⚠</span>
                              </div>
                            )}

                            {/* Position badge */}
                            <div
                              className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                              style={{ background: "rgba(0,0,0,0.6)", color: "#FDA4AF" }}
                            >
                              {idx + 1}
                            </div>

                            {/* Remove on hover */}
                            {img.phase !== "reading" && img.phase !== "uploading" && img.phase !== "sealed" && (
                              <button
                                onClick={() => removeImage(img.key)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: "rgba(239,68,68,0.8)", color: "#fff" }}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Progress bar at bottom */}
                          {img.phase !== "queued" && (
                            <div style={{ height: 3 }}>
                              <ProgressBar value={img.progress} phase={img.phase} />
                            </div>
                          )}

                          {/* Title */}
                          <div className="px-2 py-1.5">
                            <p className="text-[9px] font-medium line-clamp-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>
                              {img.title || "Untitled"}
                            </p>
                            {img.witnessId && (
                              <p className="text-[8px] font-mono line-clamp-1" style={{ color: "#4ADE80" }}>✦ {img.witnessId}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reorder hint */}
                {images.length > 1 && !anyUploading && !allSealed && (
                  <p className="text-[10px] text-center" style={{ color: "#3A4A52" }}>
                    ↕ Drag rows to reorder — order is preserved in the provenance seal
                  </p>
                )}
              </>
            )}

            {/* ── Upload / retry button ── */}
            <button
              onClick={handleUploadAll}
              disabled={images.length === 0 || anyUploading || allSealed}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #F43F5E 100%)`, color: "#fff" }}
            >
              {anyUploading
                ? `Uploading… ${sealedCount}/${images.length}`
                : allSealed
                ? "✓ All Images Uploaded — Continue to Seal →"
                : errorCount > 0
                ? `Retry ${errorCount} Failed Image${errorCount !== 1 ? "s" : ""}`
                : `Upload ${images.length} Image${images.length !== 1 ? "s" : ""} →`}
            </button>

            {/* Continue to seal when all done */}
            {allSealed && (
              <button
                onClick={() => setStep("publish")}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #C49A28 0%, #F5C451 100%)", color: "#0A0806" }}
              >
                ✦ Continue to Provenance Seal →
              </button>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STEP 3 — Publish / Seal
        ════════════════════════════════════════════════════════════════ */}
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

            {/* Summary card */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}>
              <p className="text-xs font-heading tracking-widest uppercase" style={{ color: ACCENT }}>Collection Summary</p>
              <p className="text-sm font-bold" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>{title}</p>
              {mediumType && <p className="text-xs" style={{ color: "#8B9BA3" }}>{mediumType}</p>}
              <p className="text-xs" style={{ color: "#5A6A72" }}>
                {images.length} image{images.length !== 1 ? "s" : ""} · {images.filter(i => i.witnessId).length} WID-VIS anchors
              </p>
            </div>

            {/* Thumbnail strip */}
            {images.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <div
                    key={img.key}
                    className="relative flex-shrink-0 rounded-lg overflow-hidden"
                    style={{ width: 52, height: 52, border: "1px solid rgba(74,222,128,0.25)" }}
                  >
                    <img src={img.previewUrl} alt={img.title} className="w-full h-full object-cover" />
                    <div
                      className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.55)", height: 14 }}
                    >
                      <span className="text-[7px] font-bold" style={{ color: "#4ADE80" }}>#{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl p-4" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.2)" }}>
              <p className="text-xs font-heading tracking-widest uppercase mb-2" style={{ color: "var(--ln-gold, #C49A28)" }}>
                ✦ Provenance Seal
              </p>
              <p className="text-xs" style={{ color: "#8B9BA3" }}>
                Publishing is permanent. The WID-VWC is derived from all individual WID-VIS anchors in the order shown above,
                creating an immutable provenance chain. You can add new images after publishing, but the original seal
                remains as a historical record.
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

        {/* ════════════════════════════════════════════════════════════════
            STEP 4 — Done
        ════════════════════════════════════════════════════════════════ */}
        {step === "done" && publishedWid && (
          <div className="text-center py-8 space-y-6">
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
