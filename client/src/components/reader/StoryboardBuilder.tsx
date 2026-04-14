/**
 * StoryboardBuilder
 * ─────────────────────────────────────────────────────────────────────────────
 * Upload-time page layout tool for comic / novel / manuscript works.
 *
 * Features:
 *  • Accepts individual image files (JPG/PNG/WEBP) via drag-drop or file picker
 *  • Displays pages as thumbnails in a reorderable grid
 *  • Drag-to-reorder using HTML5 drag API (no external deps)
 *  • Each page has an optional caption field (inline edit)
 *  • Cover page = page[0] (shown with a gold crown badge)
 *  • "Remove" button per page
 *  • Outputs a serialized pagesJson string on every change via onChange
 *  • Uploads each image to S3 via the /api/upload-file relay before serializing
 *
 * Props:
 *  onChange(pagesJson: string | null) — called whenever the page list changes
 *  disabled                           — disables all interactions during upload
 */

import { useCallback, useRef, useState } from "react";
import { GripVertical, X, Crown, Plus, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface StoryboardPage {
  pageNumber: number;
  imageUrl: string;
  caption?: string;
  /** local preview URL — not sent to server */
  _previewUrl?: string;
}

interface Props {
  onChange: (pagesJson: string | null) => void;
  disabled?: boolean;
  /** Pre-load existing pages (e.g. when editing after initial upload) */
  initialPages?: StoryboardPage[];
}

// ─── S3 upload helper (mirrors uploadPipeline.ts pattern) ────────────────────
async function uploadPageImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", "image");
  const res = await fetch("/api/upload-file", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const json = await res.json() as { url: string };
  return json.url;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StoryboardBuilder({ onChange, disabled = false, initialPages }: Props) {
  const [pages, setPages] = useState<StoryboardPage[]>(initialPages ?? []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-to-reorder state
  const dragSrcIdx = useRef<number | null>(null);

  // ── Emit serialized JSON on every change ────────────────────────────────────
  const emit = useCallback((updated: StoryboardPage[]) => {
    if (updated.length === 0) { onChange(null); return; }
    const clean = updated.map((p, i) => ({
      pageNumber: i + 1,
      imageUrl: p.imageUrl,
      ...(p.caption?.trim() ? { caption: p.caption.trim() } : {}),
    }));
    onChange(JSON.stringify(clean));
  }, [onChange]);

  // ── Add images ──────────────────────────────────────────────────────────────
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setUploading(true);
    try {
      const newPages: StoryboardPage[] = await Promise.all(
        arr.map(async (file, i) => {
          const previewUrl = URL.createObjectURL(file);
          const imageUrl = await uploadPageImage(file);
          return {
            pageNumber: pages.length + i + 1,
            imageUrl,
            _previewUrl: previewUrl,
          };
        })
      );
      setPages(prev => {
        const updated = [...prev, ...newPages].map((p, i) => ({ ...p, pageNumber: i + 1 }));
        emit(updated);
        return updated;
      });
    } catch (err) {
      toast.error("Failed to upload one or more pages. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [pages.length, emit]);

  // ── File input ──────────────────────────────────────────────────────────────
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  // ── Drop zone ───────────────────────────────────────────────────────────────
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  // ── Remove page ─────────────────────────────────────────────────────────────
  const removePage = (idx: number) => {
    setPages(prev => {
      const updated = prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, pageNumber: i + 1 }));
      emit(updated);
      return updated;
    });
  };

  // ── Caption edit ────────────────────────────────────────────────────────────
  const setCaption = (idx: number, caption: string) => {
    setPages(prev => {
      const updated = prev.map((p, i) => i === idx ? { ...p, caption } : p);
      emit(updated);
      return updated;
    });
  };

  // ── Drag-to-reorder ─────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, idx: number) => {
    dragSrcIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOverItem = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDropItem = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const src = dragSrcIdx.current;
    if (src === null || src === targetIdx) return;
    setPages(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(src, 1);
      updated.splice(targetIdx, 0, moved);
      const renumbered = updated.map((p, i) => ({ ...p, pageNumber: i + 1 }));
      emit(renumbered);
      return renumbered;
    });
    dragSrcIdx.current = null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-heading font-bold tracking-widest uppercase" style={{ color: "#CBB183" }}>
            Storyboard Builder
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#5A6A72" }}>
            Upload pages in order · drag to rearrange · first page becomes the cover
          </p>
        </div>
        {pages.length > 0 && (
          <span
            className="text-[10px] font-heading font-bold tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: "rgba(203,177,131,0.10)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.25)" }}
          >
            {pages.length} {pages.length === 1 ? "PAGE" : "PAGES"}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className="rounded-xl p-6 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragOver ? "#CBB183" : "rgba(203,177,131,0.22)"}`,
          background: dragOver ? "rgba(203,177,131,0.05)" : "#2C3438",
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#CBB183" }} />
            <p className="text-xs font-heading" style={{ color: "#AA8E64" }}>Uploading pages…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <ImagePlus className="w-8 h-8 opacity-40" style={{ color: "#CBB183" }} />
            <p className="text-xs font-heading font-bold" style={{ color: "#E6CDAE" }}>
              {pages.length === 0 ? "Drop page images here or click to browse" : "Add more pages"}
            </p>
            <p className="text-[10px]" style={{ color: "#5A6A72" }}>JPG · PNG · WEBP · up to 10 MB per page</p>
          </div>
        )}
      </div>

      {/* Page grid */}
      {pages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {pages.map((page, idx) => (
            <div
              key={`${page.imageUrl}-${idx}`}
              draggable={!disabled}
              onDragStart={e => onDragStart(e, idx)}
              onDragOver={onDragOverItem}
              onDrop={e => onDropItem(e, idx)}
              className="relative rounded-xl overflow-hidden group"
              style={{
                background: "#1A2530",
                border: idx === 0 ? "1px solid rgba(203,177,131,0.55)" : "1px solid rgba(255,255,255,0.08)",
                cursor: disabled ? "default" : "grab",
              }}
            >
              {/* Page image */}
              <div className="relative" style={{ aspectRatio: "3/4" }}>
                <img
                  src={page._previewUrl || page.imageUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {/* Overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  <GripVertical size={20} style={{ color: "#CBB183" }} />
                </div>
                {/* Cover badge */}
                {idx === 0 && (
                  <div
                    className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-heading font-bold tracking-wider"
                    style={{ background: "rgba(0,0,0,0.75)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.55)" }}
                  >
                    <Crown size={8} />
                    COVER
                  </div>
                )}
                {/* Page number badge */}
                <div
                  className="absolute bottom-1.5 left-1.5 text-[9px] font-heading font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.65)", color: "#AA8E64" }}
                >
                  {page.pageNumber}
                </div>
                {/* Remove button */}
                {!disabled && (
                  <button
                    onClick={e => { e.stopPropagation(); removePage(idx); }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(239,68,68,0.85)" }}
                  >
                    <X size={10} style={{ color: "#fff" }} />
                  </button>
                )}
              </div>
              {/* Caption input */}
              <div className="px-2 py-1.5">
                <input
                  type="text"
                  value={page.caption || ""}
                  onChange={e => setCaption(idx, e.target.value)}
                  placeholder="Caption…"
                  disabled={disabled}
                  maxLength={200}
                  className="w-full bg-transparent text-[10px] outline-none placeholder:opacity-40 font-heading"
                  style={{ color: "#DACAAA" }}
                />
              </div>
            </div>
          ))}

          {/* Add more tile */}
          {!disabled && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:border-[rgba(203,177,131,0.45)]"
              style={{
                aspectRatio: "3/4",
                border: "2px dashed rgba(203,177,131,0.18)",
                background: "transparent",
                color: "#5A6A72",
              }}
            >
              <Plus size={20} style={{ color: "#CBB183", opacity: 0.5 }} />
              <span className="text-[9px] font-heading tracking-wider" style={{ color: "#5A6A72" }}>ADD PAGE</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
