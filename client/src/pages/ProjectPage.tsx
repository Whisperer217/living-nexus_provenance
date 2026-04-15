import { useParams, Link, useLocation } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Heart, Users, Calendar, ShieldCheck, ChevronDown, ChevronUp,
  Pencil, Plus, Trash2, Image as ImageIcon, Video, Type, Quote,
  Minus, Check, X, Eye, Upload, ExternalLink, Rocket, Share2, Copy, Bell, BellOff, GripVertical,
  Mic, Music, Volume2, Play, Pause, Search, FileVideo,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { QRShareModal } from "@/components/QRIdentityCard";

// ── Share Modal ──────────────────────────────────────────────────────────────────

function ShareModal({ project, open, onClose }: {
  project: { title: string; slug: string };
  open: boolean;
  onClose: () => void;
}) {
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/project/${project.slug}`
    : `/project/${project.slug}`;
  const tweetText = encodeURIComponent(`Support "${project.title}" on Living Nexus`);
  const tweetUrl = encodeURIComponent(url);
  const twitterHref = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: project.title, text: `Support "${project.title}" on Living Nexus`, url });
      }
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d0d0d] border border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Share Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={url}
              className="bg-white/5 border-white/10 text-white/70 text-xs flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 shrink-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-semibold"
              onClick={() => window.open(twitterHref, "_blank", "noopener,noreferrer")}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Share on X (Twitter)
            </Button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button
                variant="outline"
                className="w-full border-white/20 bg-transparent text-white hover:bg-white/10"
                onClick={handleNativeShare}
              >
                <Share2 className="w-4 h-4 mr-2" /> Share via...
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}
function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = "text" | "image" | "video" | "divider" | "quote";
interface Block {
  id: string; // client-only uuid
  type: BlockType;
  position: number;
  content?: string;
  imageUrl?: string;
  imageKey?: string;
  imageCaption?: string;
  imageSize?: "small" | "medium" | "large" | "full";
  imageFocalX?: number; // 0-100
  imageFocalY?: number; // 0-100
  videoUrl?: string;
  videoType?: "youtube" | "vimeo" | "s3" | "none";
  videoCaption?: string;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Banner Drop Zone ─────────────────────────────────────────────────────────

function BannerDropZone({
  bannerUrl,
  title,
  status,
  editMode,
  isPending,
  onFile,
  bannerFileRef,
  positionX = 50,
  positionY = 50,
  onPositionChange,
  witnessId,
}: {
  bannerUrl: string | null;
  title: string;
  status: string;
  editMode: boolean;
  isPending: boolean;
  onFile: (file: File) => void;
  bannerFileRef: React.RefObject<HTMLInputElement | null>;
  positionX?: number;
  positionY?: number;
  onPositionChange?: (x: number, y: number) => void;
  witnessId?: string | null;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showFocalEditor, setShowFocalEditor] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    if (!editMode) return;
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
    else if (file) toast.error("Please drop an image file (JPG, PNG, WebP)");
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-[#111009] flex items-center justify-center"
      style={{ minHeight: "clamp(14rem, 42vw, 34rem)" }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt={title}
          className="w-full object-contain"
          style={{
            maxHeight: "clamp(14rem, 42vw, 34rem)",
            cursor: editMode ? (showFocalEditor ? "crosshair" : "default") : "zoom-in",
          }}
          onClick={() => !editMode && setLightboxOpen(true)}
        />
      ) : (
        <div className="w-full bg-gradient-to-br from-[#1a1025] via-[#0d0d1a] to-[#111009]" style={{ height: "clamp(14rem, 42vw, 34rem)" }} />
      )}
      {/* Lightbox */}
      {lightboxOpen && bannerUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl font-bold"
            onClick={() => setLightboxOpen(false)}
          >✕</button>
          <img
            src={bannerUrl}
            alt={title}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#111009]/40 to-[#111009]" />

      {/* Drag-over overlay */}
      {editMode && isDragOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
          style={{ background: "rgba(196,154,40,0.08)", backdropFilter: "blur(4px)", border: "2px dashed rgba(196,154,40,0.5)" }}
        >
          <Upload className="w-10 h-10" style={{ color: "var(--ln-gold)" }} />
          <p className="text-sm font-heading" style={{ color: "var(--ln-gold)" }}>Drop to set as banner</p>
        </div>
      )}

      {/* Provenance strip — bottom-left diagonal accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none"
        style={{
          background: witnessId
            ? "linear-gradient(to right, rgba(74,222,128,0.8), rgba(196,154,40,0.5), transparent)"
            : "linear-gradient(to right, rgba(196,154,40,0.3), transparent)",
        }}
      />

      {/* Top-right badges */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        {/* WID pill — green, matches player style */}
        {witnessId && (
          <a
            href={`/verify/${witnessId}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all hover:opacity-90"
            style={{
              background: "rgba(44,52,56,0.92)",
              border: "1px solid rgba(74,222,128,0.6)",
              color: "var(--ln-seal-bright)",
              backdropFilter: "blur(6px)",
              textDecoration: "none",
            }}
            title="Project cryptographically witnessed — click to verify"
          >
            <ShieldCheck className="w-3 h-3" />
            WID
          </a>
        )}
        {/* Status badge */}
        <Badge
          className="font-bold px-3 py-1 text-sm"
          style={{
            background: status === "draft"
              ? "rgba(44,52,56,0.9)"
              : status === "completed"
              ? "rgba(44,52,56,0.9)"
              : "rgba(170,142,100,0.9)",
            color: status === "draft" ? "var(--ln-smoke)" : status === "completed" ? "var(--ln-seal-bright)" : "var(--ln-coal)",
            border: status === "draft"
              ? "1px solid rgba(44,52,56,0.5)"
              : status === "completed"
              ? "1px solid rgba(74,222,128,0.4)"
              : "1px solid rgba(196,154,40,0.4)",
            backdropFilter: "blur(6px)",
          }}
        >
          {status === "draft" ? "Draft" : status === "completed" ? "✓ Completed" : "● Funding"}
        </Badge>
      </div>

      {/* Focal point dragger overlay (edit mode, when focal editor is active) */}
      {editMode && bannerUrl && showFocalEditor && onPositionChange && (
        <FocalPointDragger
          x={positionX}
          y={positionY}
          onChange={(x, y) => onPositionChange(x, y)}
        />
      )}

      {/* Banner upload controls (edit mode) */}
      {editMode && !isDragOver && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => bannerFileRef.current?.click()}
            className="flex items-center gap-2 bg-black/60 backdrop-blur border border-white/20 rounded-xl px-3 py-2 text-white/70 hover:text-white text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            {isPending ? "Uploading…" : bannerUrl ? "Change banner" : "Upload banner"}
          </button>
          {bannerUrl && onPositionChange && (
            <button
              onClick={() => setShowFocalEditor(f => !f)}
              className={`flex items-center gap-2 backdrop-blur border rounded-xl px-3 py-2 text-sm transition-colors ${
                showFocalEditor
                  ? "bg-[#d4a017]/80 border-[#d4a017] text-black font-semibold"
                  : "bg-black/60 border-white/20 text-white/70 hover:text-white"
              }`}
              title="Drag the crosshair to set the focal point for cropped views"
            >
              <ImageIcon className="w-4 h-4" />
              {showFocalEditor ? "Done — focal point set" : "Set focal point"}
            </button>
          )}
          {!bannerUrl && (
            <span className="text-white/50 text-xs">or drag &amp; drop an image here</span>
          )}
        </div>
      )}

      <input
        ref={bannerFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ── Video Hero ─────────────────────────────────────────────────────────────────────────────────────

function VideoHero({ videoUrl, videoType, bannerUrl, title }: {
  videoUrl: string | null;
  videoType: string | null;
  bannerUrl: string | null;
  title: string;
}) {
  if (videoUrl && videoType === "youtube") {
    const id = getYouTubeId(videoUrl);
    if (id) return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen className="w-full h-full"
        />
      </div>
    );
  }
  if (videoUrl && videoType === "vimeo") {
    const id = getVimeoId(videoUrl);
    if (id) return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`https://player.vimeo.com/video/${id}?color=d4a017&title=0&byline=0&portrait=0`}
          title={title} allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen className="w-full h-full"
        />
      </div>
    );
  }
  if (videoUrl && videoType === "s3") {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
        <video src={videoUrl} controls className="w-full h-full object-contain" />
      </div>
    );
  }
  if (bannerUrl) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
        <img src={bannerUrl} alt={title} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a1025] to-[#0a0812] flex items-center justify-center">
      <span className="text-white/45 text-6xl font-bold">{title[0]}</span>
    </div>
  );
}

// ── Focal Point Dragger ─────────────────────────────────────────────────────

function FocalPointDragger({ x, y, onChange }: {
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const calcPosition = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const ny = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    onChange(Math.round(nx), Math.round(ny));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    calcPosition(e.clientX, e.clientY);
    e.preventDefault();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    calcPosition(e.clientX, e.clientY);
  };
  const handleMouseUp = () => { isDragging.current = false; };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    const t = e.touches[0];
    calcPosition(t.clientX, t.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const t = e.touches[0];
    calcPosition(t.clientX, t.clientY);
  };
  const handleTouchEnd = () => { isDragging.current = false; };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Focal point crosshair */}
      <div
        className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${x}%`, top: `${y}%` }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/70 -translate-x-1/2" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/70 -translate-y-1/2" />
      </div>
    </div>
  );
}

// ── Block Renderer (view mode) ────────────────────────────────────────────────

function BlockView({ block }: { block: Block }) {
  if (block.type === "divider") {
    return <hr className="border-white/10 my-2" />;
  }
  if (block.type === "text") {
    return (
      <p className="text-white/75 text-base leading-relaxed whitespace-pre-wrap">
        {block.content || ""}
      </p>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote className="border-l-4 border-[#d4a017]/60 pl-4 py-1 italic text-white/60 text-base leading-relaxed">
        {block.content || ""}
      </blockquote>
    );
  }
  if (block.type === "image" && block.imageUrl) {
    const sizeClass = {
      small: "max-w-xs mx-auto",
      medium: "max-w-md mx-auto",
      large: "max-w-2xl mx-auto",
      full: "w-full",
    }[block.imageSize ?? "full"];
    const maxH = {
      small: "max-h-48",
      medium: "max-h-64",
      large: "max-h-96",
      full: "max-h-[480px]",
    }[block.imageSize ?? "full"];
    const focalX = block.imageFocalX ?? 50;
    const focalY = block.imageFocalY ?? 50;
    return (
      <figure className="space-y-2">
        <div className={`${sizeClass} ${maxH} overflow-hidden rounded-xl`}>
          <img
            src={block.imageUrl}
            alt={block.imageCaption || ""}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${focalX}% ${focalY}%` }}
          />
        </div>
        {block.imageCaption && (
          <figcaption className="text-white/40 text-xs text-center">{block.imageCaption}</figcaption>
        )}
      </figure>
    );
  }
  if (block.type === "video") {
    if (block.videoType === "youtube" && block.videoUrl) {
      const id = getYouTubeId(block.videoUrl);
      if (id) return (
        <div className="aspect-video rounded-xl overflow-hidden">
          <iframe src={`https://www.youtube.com/embed/${id}?rel=0`} title="Video" allowFullScreen className="w-full h-full" />
        </div>
      );
    }
    if (block.videoType === "vimeo" && block.videoUrl) {
      const id = getVimeoId(block.videoUrl);
      if (id) return (
        <div className="aspect-video rounded-xl overflow-hidden">
          <iframe src={`https://player.vimeo.com/video/${id}`} title="Video" allowFullScreen className="w-full h-full" />
        </div>
      );
    }
    if (block.videoType === "s3" && block.videoUrl) {
      return <video src={block.videoUrl} controls className="w-full rounded-xl" />;
    }
    return null;
  }
  return null;
}

// ── Block Editor (edit mode) ──────────────────────────────────────────────────

function BlockEditor({ block, projectId, onChange, onDelete }: {
  block: Block;
  projectId: number;
  onChange: (updated: Block) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = trpc.projects.uploadBlockImage.useMutation({
    onSuccess: (data) => {
      onChange({ ...block, imageUrl: data.url, imageKey: data.key });
      toast.success("Image uploaded");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImageFile = useCallback(async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(",")[1];
      uploadImage.mutate({ projectId, fileBase64: b64, mimeType: file.type, caption: block.imageCaption });
    };
    reader.readAsDataURL(file);
  }, [projectId, block.imageCaption, uploadImage]);

  return (
    <div ref={setNodeRef} style={style} className="group relative bg-white/[0.04] border border-white/10 rounded-xl p-4 space-y-3">
      {/* Block type badge + controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-white/45 hover:text-white/60 transition-colors cursor-grab active:cursor-grabbing touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="text-white/50 text-xs uppercase tracking-widest font-mono">{block.type}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onDelete} className="p-1 text-red-400/60 hover:text-red-400 transition-colors" title="Delete block">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content editors per type */}
      {(block.type === "text" || block.type === "quote") && (
        <Textarea
          value={block.content || ""}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
          placeholder={block.type === "quote" ? "Enter a quote or pull-out text…" : "Write your story here…"}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/45 resize-none min-h-[120px]"
          rows={5}
        />
      )}

      {block.type === "image" && (
        <div className="space-y-3">
          {block.imageUrl ? (
            <div className="space-y-3">
              {/* Image preview with focal point dragger */}
              <div className="relative rounded-lg overflow-hidden" style={{ height: 200 }}>
                <img
                  src={block.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ objectPosition: `${block.imageFocalX ?? 50}% ${block.imageFocalY ?? 50}%` }}
                />
                {/* Focal point drag overlay */}
                <FocalPointDragger
                  x={block.imageFocalX ?? 50}
                  y={block.imageFocalY ?? 50}
                  onChange={(x, y) => onChange({ ...block, imageFocalX: x, imageFocalY: y })}
                />
                <button
                  onClick={() => onChange({ ...block, imageUrl: undefined, imageKey: undefined })}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white/70 hover:text-red-400 transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-0.5 text-white/50 text-xs z-10">
                  Drag to set focal point
                </div>
              </div>
              {/* Size selector */}
              <div className="space-y-1">
                <p className="text-white/40 text-xs uppercase tracking-widest">Display Size</p>
                <div className="flex gap-2">
                  {(["small", "medium", "large", "full"] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => onChange({ ...block, imageSize: sz })}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        (block.imageSize ?? "full") === sz
                          ? "bg-[#d4a017] text-black border-[#d4a017]"
                          : "bg-white/5 text-white/50 border-white/10 hover:border-[#d4a017]/40"
                      }`}
                    >
                      {sz.charAt(0).toUpperCase() + sz.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-[#d4a017]/50 transition-colors"
            >
              {uploadImage.isPending ? (
                <p className="text-white/40 text-sm">Uploading…</p>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-white/45 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">Click to upload image (max 8 MB)</p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
          />
          <Input
            value={block.imageCaption || ""}
            onChange={(e) => onChange({ ...block, imageCaption: e.target.value })}
            placeholder="Caption (optional)"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/45 text-sm"
          />
        </div>
      )}

      {block.type === "video" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["youtube", "vimeo", "s3"] as const).map((vt) => (
              <button
                key={vt}
                onClick={() => onChange({ ...block, videoType: vt })}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  block.videoType === vt
                    ? "bg-[#d4a017] text-black border-[#d4a017]"
                    : "bg-white/5 text-white/50 border-white/10 hover:border-[#d4a017]/40"
                }`}
              >
                {vt === "s3" ? "Direct URL" : vt.charAt(0).toUpperCase() + vt.slice(1)}
              </button>
            ))}
          </div>
          <Input
            value={block.videoUrl || ""}
            onChange={(e) => onChange({ ...block, videoUrl: e.target.value })}
            placeholder={
              block.videoType === "youtube" ? "https://www.youtube.com/watch?v=…"
              : block.videoType === "vimeo" ? "https://vimeo.com/…"
              : "https://…/video.mp4"
            }
            className="bg-white/5 border-white/10 text-white placeholder:text-white/45 text-sm"
          />
          <Input
            value={block.videoCaption || ""}
            onChange={(e) => onChange({ ...block, videoCaption: e.target.value })}
            placeholder="Caption (optional)"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/45 text-sm"
          />
        </div>
      )}

      {block.type === "divider" && (
        <div className="flex items-center gap-3 py-2">
          <hr className="flex-1 border-white/10" />
          <span className="text-white/45 text-xs">— divider —</span>
          <hr className="flex-1 border-white/10" />
        </div>
      )}
    </div>
  );
}

// ── Add Block Toolbar ─────────────────────────────────────────────────────────

function AddBlockBar({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  const types: { type: BlockType; icon: React.ReactNode; label: string }[] = [
    { type: "text", icon: <Type className="w-4 h-4" />, label: "Text" },
    { type: "quote", icon: <Quote className="w-4 h-4" />, label: "Quote" },
    { type: "image", icon: <ImageIcon className="w-4 h-4" />, label: "Image" },
    { type: "video", icon: <Video className="w-4 h-4" />, label: "Video" },
    { type: "divider", icon: <Minus className="w-4 h-4" />, label: "Divider" },
  ];
  return (
    <div className="flex justify-center">
      {open ? (
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
          {types.map((t) => (
            <button
              key={t.type}
              onClick={() => { onAdd(t.type); setOpen(false); }}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-white/50 hover:text-[#d4a017] hover:bg-white/5 transition-all text-xs"
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} className="ml-2 text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-dashed border-white/15 text-white/50 hover:border-[#d4a017]/50 hover:text-[#d4a017]/70 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Add block
        </button>
      )}
    </div>
  );
}

// ── Donate Dialog ─────────────────────────────────────────────────────────────

function DonateDialog({ project, open, onClose }: {
  project: { id: number; title: string; slug: string };
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const presets = [5, 10, 25, 50, 100];

  const donate = trpc.projects.donate.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout — opening Stripe in a new tab.");
        window.open(data.url, "_blank");
        onClose();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 100) { toast.error("Minimum donation is $1"); return; }
    donate.mutate({ projectId: project.id, amountCents: cents, message: message || undefined, anonymous, origin: window.location.origin });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0d0d1a] border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Support this project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70 text-sm mb-2 block">Choose an amount</Label>
            <div className="flex gap-2 flex-wrap mb-3">
              {presets.map((p) => (
                <button type="button" key={p} onClick={() => setAmount(String(p))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    amount === String(p) ? "bg-[#d4a017] text-black border-[#d4a017]" : "bg-white/5 text-white/70 border-white/10 hover:border-[#d4a017]/50"
                  }`}
                >${p}</button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
              <Input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-white/5 border-white/10 text-white" placeholder="Custom amount" />
            </div>
          </div>
          <div>
            <Label className="text-white/70 text-sm mb-2 block">Message (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a note for the creator…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/50 resize-none" rows={3} maxLength={500} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="anon" checked={anonymous} onCheckedChange={(v) => setAnonymous(!!v)} className="border-white/20" />
            <Label htmlFor="anon" className="text-white/60 text-sm cursor-pointer">Donate anonymously</Label>
          </div>
          <p className="text-white/50 text-xs">10% platform fee applies. Stripe processes payment securely.</p>
          <Button onClick={handleSubmit} disabled={donate.isPending} className="w-full bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold">
            {donate.isPending ? "Processing…" : `Support with $${amount || "0"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Inline Editable Header Field ──────────────────────────────────────────────

function InlineEdit({ value, onChange, placeholder, multiline, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(value); setEditing(true); }}
        className={`group cursor-text relative ${className}`}
      >
        <span className={value ? "" : "text-white/45 italic"}>{value || placeholder}</span>
        <Pencil className="w-3 h-3 text-white/45 group-hover:text-[#d4a017]/60 absolute -right-5 top-1 transition-colors" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {multiline ? (
        <Textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`bg-white/5 border-[#d4a017]/40 text-white placeholder:text-white/45 resize-none ${className}`}
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`bg-white/5 border-[#d4a017]/40 text-white placeholder:text-white/45 ${className}`}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
        />
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={commit} className="bg-[#d4a017] text-black h-7 px-3 text-xs">
          <Check className="w-3 h-3 mr-1" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} className="text-white/50 h-7 px-3 text-xs">
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Narration Player ─────────────────────────────────────────────────────────

function NarrationPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  return (
    <div className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-full bg-[#d4a017]/20 border border-[#d4a017]/40 flex items-center justify-center text-[#d4a017] hover:bg-[#d4a017]/30 transition-colors shrink-0"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className="flex-1 space-y-1">
        <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Creator Narration</p>
        <div
          className="h-1.5 bg-white/10 rounded-full cursor-pointer"
          onClick={(e) => {
            const a = audioRef.current;
            if (!a || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            a.currentTime = pct * duration;
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <Mic className="w-4 h-4 text-[#d4a017]/60 shrink-0" />
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

// ── Narration Upload Panel ─────────────────────────────────────────────────────

function NarrationUploadPanel({ projectId, currentUrl, onUploaded }: {
  projectId: number;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}) {
  const narrationRef = useRef<HTMLInputElement>(null);
  const upload = trpc.projects.uploadNarration.useMutation({
    onSuccess: (data) => { onUploaded(data.url); toast.success("Narration uploaded!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast.error("Max 50 MB for narration"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(",")[1];
      upload.mutate({ projectId, fileBase64: b64, mimeType: file.type, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 bg-white/[0.04] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-[#d4a017]" />
        <p className="text-white/60 text-xs uppercase tracking-widest font-medium">Narration Audio</p>
      </div>
      {currentUrl && (
        <NarrationPlayer url={currentUrl} />
      )}
      <button
        onClick={() => narrationRef.current?.click()}
        disabled={upload.isPending}
        className="flex items-center gap-2 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white/60 hover:text-white hover:border-white/30 text-sm transition-colors w-full justify-center"
      >
        <Upload className="w-4 h-4" />
        {upload.isPending ? "Uploading narration…" : currentUrl ? "Replace narration" : "Upload narration (MP3, WAV, M4A — max 50 MB)"}
      </button>
      <input
        ref={narrationRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/m4a,audio/mp4,audio/ogg,audio/webm"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ── Video Upload Panel ─────────────────────────────────────────────────────────

function VideoUploadPanel({ projectId, onUploaded }: {
  projectId: number;
  onUploaded: (url: string) => void;
}) {
  const videoRef = useRef<HTMLInputElement>(null);
  const upload = trpc.projects.uploadVideo.useMutation({
    onSuccess: (data) => { onUploaded(data.url); toast.success("Video uploaded!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = (file: File) => {
    if (file.size > 500 * 1024 * 1024) { toast.error("Max 500 MB for video"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(",")[1];
      upload.mutate({ projectId, fileBase64: b64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onClick={() => !upload.isPending && videoRef.current?.click()}
      className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center cursor-pointer hover:border-[#d4a017]/50 transition-colors"
    >
      {upload.isPending ? (
        <div className="space-y-2">
          <FileVideo className="w-8 h-8 text-[#d4a017]/60 mx-auto animate-pulse" />
          <p className="text-white/40 text-sm">Uploading video…</p>
        </div>
      ) : (
        <>
          <FileVideo className="w-8 h-8 text-white/45 mx-auto mb-2" />
          <p className="text-white/40 text-sm">Click to upload video (MP4, MOV, WebM — max 500 MB)</p>
          <p className="text-white/45 text-xs mt-1">Stored securely on CDN</p>
        </>
      )}
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ── Sortable Song Row ─────────────────────────────────────────────────────────

function SortableSongRow({ item, onRemove, editMode }: {
  item: { id: number; songId: number; sortOrder: number; song: { id: number; title: string; coverArtUrl?: string | null; fileUrl?: string | null; durationSeconds?: number | null; genre?: string | null } | null };
  onRemove: () => void;
  editMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  const song = item.song;
  const dur = song?.durationSeconds
    ? `${Math.floor(song.durationSeconds / 60)}:${String(Math.floor(song.durationSeconds % 60)).padStart(2, "0")}`
    : null;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 group">
      {editMode && (
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-white/45 hover:text-white/60 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {song?.coverArtUrl ? (
        <img src={song.coverArtUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
          <Music className="w-4 h-4 text-white/50" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{song?.title ?? "Unknown track"}</p>
        {song?.genre && <p className="text-white/40 text-xs">{song.genre}</p>}
      </div>
      {dur && <span className="text-white/50 text-xs shrink-0">{dur}</span>}
      {editMode && (
        <button
          onClick={onRemove}
          className="p-1 text-red-400/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── Project Songs Panel ─────────────────────────────────────────────────────────

function ProjectSongsPanel({ projectId, editMode, userId }: {
  projectId: number;
  editMode: boolean;
  userId: number;
}) {
  const utils = trpc.useUtils();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const { data: linkedSongs = [] } = trpc.projects.getSongs.useQuery({ projectId });

  // Load the creator's own songs for the picker
  const { data: mySongsRaw } = trpc.songs.mySongs.useQuery(
    undefined,
    { enabled: showPicker }
  );
  const mySongs = mySongsRaw
    ? (searchQuery
        ? mySongsRaw.filter((s: { title: string }) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : mySongsRaw)
    : undefined;

  const addSong = trpc.projects.addSong.useMutation({
    onSuccess: () => { utils.projects.getSongs.invalidate({ projectId }); toast.success("Track added"); },
    onError: (e) => toast.error(e.message),
  });
  const removeSong = trpc.projects.removeSong.useMutation({
    onSuccess: () => utils.projects.getSongs.invalidate({ projectId }),
    onError: (e) => toast.error(e.message),
  });
  const reorderSongs = trpc.projects.reorderSongs.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = (linkedSongs as Array<{ id: number }>).findIndex((s) => s.id === active.id);
    const newIdx = (linkedSongs as Array<{ id: number }>).findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(linkedSongs as any[], oldIdx, newIdx);
    // Optimistic update via invalidate after mutation
    reorderSongs.mutate(
      { projectId, orderedIds: reordered.map((s: any) => s.id) },
      { onSuccess: () => utils.projects.getSongs.invalidate({ projectId }) }
    );
  };

  const linkedSongIds = new Set((linkedSongs as Array<{ songId: number }>).map((s) => s.songId));

  if (!editMode && linkedSongs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <Music className="w-5 h-5 text-[#d4a017]" /> Tracks
          <Badge variant="outline" className="border-white/20 text-white/50 text-xs">{linkedSongs.length}</Badge>
        </h2>
        {editMode && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPicker(!showPicker)}
            className="border-white/20 bg-transparent text-white/70 hover:text-white hover:border-white/40 text-xs h-8"
          >
            <Plus className="w-3 h-3 mr-1" /> Add track
          </Button>
        )}
      </div>

      {/* Song picker (edit mode) */}
      {editMode && showPicker && (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your tracks…"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/45 text-sm"
            />
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {(mySongs ?? []).map((s: { id: number; title: string; coverArtUrl?: string | null; genre?: string | null }) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  linkedSongIds.has(s.id)
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-white/5"
                }`}
                onClick={() => {
                  if (linkedSongIds.has(s.id)) return;
                  addSong.mutate({ projectId, songId: s.id });
                }}
              >
                {s.coverArtUrl ? (
                  <img src={s.coverArtUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                    <Music className="w-3 h-3 text-white/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{s.title}</p>
                  {s.genre && <p className="text-white/40 text-xs">{s.genre}</p>}
                </div>
                {linkedSongIds.has(s.id) ? (
                  <Check className="w-4 h-4 text-[#d4a017]/60 shrink-0" />
                ) : (
                  <Plus className="w-4 h-4 text-white/50 shrink-0" />
                )}
              </div>
            ))}
            {showPicker && (!mySongs || mySongs.length === 0) && (
              <p className="text-white/50 text-sm text-center py-4">No tracks found</p>
            )}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="text-white/50 hover:text-white text-xs w-full text-center transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Linked songs list */}
      {linkedSongs.length > 0 && (
        editMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={(linkedSongs as Array<{ id: number }>).map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {(linkedSongs as any[]).map((item) => (
                  <SortableSongRow
                    key={item.id}
                    item={item}
                    editMode={editMode}
                    onRemove={() => removeSong.mutate({ projectId, songId: item.songId })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-2">
            {(linkedSongs as any[]).map((item) => (
              <SortableSongRow
                key={item.id}
                item={item}
                editMode={false}
                onRemove={() => {}}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [donateOpen, setDonateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [updatesExpanded, setUpdatesExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Local editable state for header fields
  const [localTitle, setLocalTitle] = useState("");
  const [localTagline, setLocalTagline] = useState("");
  const [localGoal, setLocalGoal] = useState("");
  const [localVideoUrl, setLocalVideoUrl] = useState("");
  const [localVideoType, setLocalVideoType] = useState<"youtube" | "vimeo" | "s3" | "none">("none");
  const [localBannerPosX, setLocalBannerPosX] = useState(50);
  const [localBannerPosY, setLocalBannerPosY] = useState(50);
  const [localNarrationUrl, setLocalNarrationUrl] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocksDirty, setBlocksDirty] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error, refetch: refetchProject } = trpc.projects.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  // After returning from Stripe checkout with ?donation=success:
  // Call confirmDonation immediately — idempotent fallback for when the webhook is delayed.
  // This ensures raisedAmountCents updates even in test/dev environments without webhooks.
  const confirmDonationMutation = trpc.projects.confirmDonation.useMutation({
    onSuccess: (result) => {
      if (result.credited) {
        // Donation recorded — refetch quickly to show updated total
        setTimeout(() => refetchProject(), 800);
      } else {
        // Webhook may still be in flight — refetch after 3s
        setTimeout(() => refetchProject(), 3000);
      }
    },
    onError: () => {
      // Fallback: just refetch after 3s
      setTimeout(() => refetchProject(), 3000);
    },
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("donation") !== "success") return;
    const sessionId = params.get("session_id");
    const projectId = data?.project?.id;
    if (sessionId && projectId) {
      // Confirm via Stripe session — idempotent, safe even if webhook already fired
      confirmDonationMutation.mutate({ sessionId, projectId });
    } else if (!sessionId) {
      // No session_id in URL — fall back to timed refetch
      const timer = setTimeout(() => refetchProject(), 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.project?.id]);
  const { data: rawBlocks } = trpc.projects.getBlocks.useQuery(
    { projectId: data?.project.id ?? 0 },
    { enabled: !!data?.project.id }
  );

  // Sync server blocks into local state
  useEffect(() => {
    if (rawBlocks) {
      setBlocks(rawBlocks.map((b: any) => ({ ...b, id: makeId() })));
    }
  }, [rawBlocks]);

  // Sync header fields when data loads — only when NOT in edit mode to avoid overwriting
  // in-progress edits. Use stable primitives (id + updatedAt) instead of the full object
  // reference so this doesn't fire on every re-render.
  useEffect(() => {
    if (data?.project && !editMode) {
      setLocalTitle(data.project.title);
      setLocalTagline(data.project.tagline || "");
      setLocalGoal(data.project.goalAmountCents ? String(data.project.goalAmountCents / 100) : "");
      setLocalVideoUrl(data.project.videoUrl || "");
      setLocalVideoType((data.project.videoType as any) || "none");
      setLocalBannerPosX(data.project.bannerPositionX ?? 50);
      setLocalBannerPosY(data.project.bannerPositionY ?? 15);
      setLocalNarrationUrl((data.project as any).narrationUrl ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.project?.id, (data?.project as any)?.updatedAt]);

  const isOwner = !!user && !!data?.project && user.id === data.project.userId;

  // Follow state
  const { data: followStatus, refetch: refetchFollow } = trpc.projects.getFollowStatus.useQuery(
    { projectId: data?.project.id ?? 0 },
    { enabled: !!data?.project.id }
  );
  const followMutation = trpc.projects.follow.useMutation({
    onSuccess: () => { refetchFollow(); toast.success("Following project — you'll be notified of updates!"); },
    onError: (e) => toast.error(e.message),
  });
  const unfollowMutation = trpc.projects.unfollow.useMutation({
    onSuccess: () => { refetchFollow(); toast.success("Unfollowed project"); },
    onError: (e) => toast.error(e.message),
  });

  const handleFollowToggle = () => {
    if (!user) { toast.error("Sign in to follow this project"); return; }
    if (!data?.project) return;
    if (followStatus?.isFollowing) {
      unfollowMutation.mutate({ projectId: data.project.id });
    } else {
      followMutation.mutate({ projectId: data.project.id });
    }
  };

  // Mutations
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => { utils.projects.getBySlug.invalidate({ slug: slug ?? "" }); toast.success("Project saved"); },
    onError: (e) => toast.error(e.message),
  });
  const saveBlocks = trpc.projects.saveBlocks.useMutation({
    onSuccess: () => { utils.projects.getBlocks.invalidate({ projectId: data?.project.id }); setBlocksDirty(false); toast.success("Content saved"); },
    onError: (e) => toast.error(e.message),
  });
  const publishProject = trpc.projects.publish.useMutation({
    onSuccess: (res) => {
      utils.projects.getBySlug.invalidate({ slug: slug ?? "" });
      toast.success(`Project published! WID: ${res.wid}`);
      setEditMode(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const archiveProject = trpc.projects.archive.useMutation({
    onSuccess: () => {
      utils.projects.getBySlug.invalidate({ slug: slug ?? "" });
      utils.projects.mine.invalidate();
      toast.success("Project archived. It is no longer visible to the public.");
      setEditMode(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const unpublishProject = trpc.projects.unpublish.useMutation({
    onSuccess: () => {
      utils.projects.getBySlug.invalidate({ slug: slug ?? "" });
      utils.projects.mine.invalidate();
      toast.success("Project moved back to draft. Only you can see it.");
      setEditMode(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const uploadBanner = trpc.projects.uploadBlockImage.useMutation({
    onSuccess: (data) => {
      if (!project) return;
      updateProject.mutate({ id: project.id, bannerUrl: data.url, bannerKey: data.key });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSaveAll = () => {
    if (!data?.project) return;
    const goalCents = localGoal ? Math.round(parseFloat(localGoal) * 100) : undefined;
    updateProject.mutate({
      id: data.project.id,
      title: localTitle || undefined,
      tagline: localTagline || undefined,
      goalAmountCents: goalCents,
      videoUrl: localVideoUrl || undefined,
      videoType: localVideoType !== "none" ? localVideoType : undefined,
      bannerPositionX: localBannerPosX,
      bannerPositionY: localBannerPosY,
    });
    if (blocksDirty) {
      saveBlocks.mutate({
        projectId: data.project.id,
        blocks: blocks.map((b, i) => ({ ...b, position: i })),
      });
    }
  };

  const handleBannerFile = (file: File) => {
    if (!data?.project) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(",")[1];
      uploadBanner.mutate({ projectId: data.project.id, fileBase64: b64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const addBlock = (type: BlockType) => {
    setBlocks((prev) => [...prev, { id: makeId(), type, position: prev.length, videoType: type === "video" ? "youtube" : undefined }]);
    setBlocksDirty(true);
  };
  const updateBlock = (id: string, updated: Block) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? updated : b));
    setBlocksDirty(true);
  };
  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setBlocksDirty(true);
  };
  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    setBlocksDirty(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIdx = prev.findIndex((b) => b.id === active.id);
      const newIdx = prev.findIndex((b) => b.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
    setBlocksDirty(true);
  };

  const urlParams = new URLSearchParams(window.location.search);
  const donationSuccess = urlParams.get("donation") === "success";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111009] flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading project…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#111009] flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">Project not found.</p>
        <Link href="/"><Button variant="outline" className="border-white/20 text-white">Go Home</Button></Link>
      </div>
    );
  }

  const { project, updates, donations } = data;
  const pct = project.goalAmountCents
    ? Math.min(100, Math.round((project.raisedAmountCents / project.goalAmountCents) * 100))
    : null;
  const visibleDonors = donations.filter((d: any) => !d.anonymous).slice(0, 8);
  const displayedUpdates = updatesExpanded ? updates : updates.slice(0, 2);

  return (
    <div className="min-h-screen bg-[#111009] text-white">
      {/* ── Banner (drag-and-drop in edit mode) ── */}
      <BannerDropZone
        bannerUrl={project.bannerUrl ?? null}
        title={project.title}
        status={project.status}
        editMode={editMode}
        isPending={uploadBanner.isPending}
        onFile={handleBannerFile}
        bannerFileRef={bannerFileRef}
        positionX={editMode ? localBannerPosX : (project.bannerPositionX ?? 50)}
        positionY={editMode ? localBannerPosY : (project.bannerPositionY ?? 15)}
        onPositionChange={editMode ? (x, y) => { setLocalBannerPosX(x); setLocalBannerPosY(y); } : undefined}
        witnessId={project.linkedWitnessId}
      />

      {/* ── Owner toolbar ── */}
      {isOwner && (
        <div className="sticky top-0 z-40 bg-[#0d0d1a]/95 backdrop-blur border-b border-white/10 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Pencil className="w-4 h-4 text-[#d4a017]" />
            {editMode ? "Editing project — click any field to change it" : "Your project"}
          </div>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} className="text-white/50 text-xs h-8">
                  <Eye className="w-3 h-3 mr-1" /> Preview
                </Button>
                <Button size="sm" onClick={handleSaveAll}
                  disabled={updateProject.isPending || saveBlocks.isPending}
                  className="bg-[#d4a017] text-black text-xs h-8 font-bold">
                  <Check className="w-3 h-3 mr-1" />
                  {updateProject.isPending || saveBlocks.isPending ? "Saving…" : "Save"}
                </Button>
                {project.status === "draft" && (
                  <Button size="sm" onClick={() => publishProject.mutate({ projectId: project.id })}
                    disabled={publishProject.isPending}
                    className="bg-green-600 hover:bg-green-500 text-white text-xs h-8 font-bold">
                    <Rocket className="w-3 h-3 mr-1" />
                    {publishProject.isPending ? "Publishing…" : "Publish + Get WID"}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setEditMode(true)} className="bg-white/10 hover:bg-white/20 text-white text-xs h-8">
                  <Pencil className="w-3 h-3 mr-1" /> Edit Project
                </Button>
                {project.status === "active" && (
                  <Button size="sm" variant="ghost"
                    onClick={() => { if (confirm("Move this project back to draft? It will be hidden from the public.")) unpublishProject.mutate({ projectId: project.id }); }}
                    disabled={unpublishProject.isPending}
                    className="text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-400/10 text-xs h-8">
                    Unpublish
                  </Button>
                )}
                {project.status !== "archived" && (
                  <Button size="sm" variant="ghost"
                    onClick={() => { if (confirm("Archive this project? It will be removed from all public listings.")) archiveProject.mutate({ projectId: project.id }); }}
                    disabled={archiveProject.isPending}
                    className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10 text-xs h-8">
                    Archive
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Donation success */}
        {donationSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-900/30 border border-green-500/30 text-green-300 text-sm">
            Thank you for your support! Your donation has been received.
          </div>
        )}

        {/* ── Hero grid: video + project info ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
          {/* Video / cinematic panel */}
          <div className="lg:col-span-3 space-y-4">
            {editMode ? (
              <div className="space-y-3 bg-white/[0.04] border border-white/10 rounded-xl p-4">
                <p className="text-white/40 text-xs uppercase tracking-widest">Hero Video</p>
                <div className="flex gap-2">
                  {(["youtube", "vimeo", "s3", "none"] as const).map((vt) => (
                    <button type="button" key={vt} onClick={() => setLocalVideoType(vt)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        localVideoType === vt ? "bg-[#d4a017] text-black border-[#d4a017]" : "bg-white/5 text-white/50 border-white/10 hover:border-[#d4a017]/40"
                      }`}
                    >{vt === "s3" ? "Upload Video" : vt === "none" ? "None" : vt.charAt(0).toUpperCase() + vt.slice(1)}</button>
                  ))}
                </div>
                {localVideoType !== "none" && localVideoType !== "s3" && (
                  <Input value={localVideoUrl} onChange={(e) => setLocalVideoUrl(e.target.value)}
                    placeholder={localVideoType === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://vimeo.com/…"}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/45 text-sm" />
                )}
                {localVideoType === "s3" && (
                  localVideoUrl ? (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      <FileVideo className="w-4 h-4 text-[#d4a017]" />
                      <span className="text-white/60 text-sm flex-1 truncate">Video uploaded</span>
                      <button type="button" onClick={() => { setLocalVideoUrl(""); setLocalVideoType("none"); }} className="text-red-400/60 hover:text-red-400 text-xs">Remove</button>
                    </div>
                  ) : (
                    <VideoUploadPanel
                      projectId={project.id}
                      onUploaded={(url) => { setLocalVideoUrl(url); }}
                    />
                  )
                )}
                {localVideoType !== "none" && localVideoUrl && (
                  <div className="rounded-xl overflow-hidden">
                    <VideoHero videoUrl={localVideoUrl} videoType={localVideoType} bannerUrl={null} title={localTitle} />
                  </div>
                )}
              </div>
            ) : (
              <VideoHero videoUrl={project.videoUrl} videoType={project.videoType} bannerUrl={project.bannerUrl} title={project.title} />
            )}

            {/* Quick donate + follow under video */}
            {project.status === "active" && !editMode && (
              <div className="flex gap-2">
                <Button onClick={() => setDonateOpen(true)} className="flex-1 bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold py-3 text-base">
                  <Heart className="w-4 h-4 mr-2" /> Donate
                </Button>
                {!isOwner && (
                  <Button
                    variant="outline"
                    onClick={handleFollowToggle}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                    className={`py-3 px-4 border font-semibold transition-all ${
                      followStatus?.isFollowing
                        ? "border-[#d4a017] text-[#d4a017] bg-[#d4a017]/10 hover:bg-[#d4a017]/20"
                        : "border-white/20 text-white/70 bg-transparent hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {followStatus?.isFollowing
                      ? <><BellOff className="w-4 h-4 mr-1.5" /> Following</>  
                      : <><Bell className="w-4 h-4 mr-1.5" /> Follow</>}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Project info panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* Creator bubble */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-[#d4a017]/40">
                <AvatarImage src={(project as any).creatorAvatar ?? undefined} />
                <AvatarFallback className="bg-[#1a1025] text-[#d4a017] text-sm font-bold">
                  {((project as any).creatorHandle || (project as any).creatorName || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium text-sm leading-tight">
                  {(project as any).creatorHandle || (project as any).creatorName || "Creator"}
                </p>
                <Link href={`/creator/${project.userId}`}>
                  <span className="text-[#d4a017]/70 text-xs hover:text-[#d4a017] transition-colors cursor-pointer">View profile →</span>
                </Link>
              </div>
            </div>

            {/* Title + tagline (inline editable) */}
            <div className="space-y-1">
              {editMode ? (
                <>
                  <InlineEdit value={localTitle} onChange={setLocalTitle} placeholder="Project title" className="text-2xl font-bold text-white" />
                  <InlineEdit value={localTagline} onChange={setLocalTagline} placeholder="Short tagline…" className="text-white/60 text-sm" />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-white leading-tight">{project.title}</h1>
                  {project.tagline && <p className="text-white/60 text-sm leading-relaxed">{project.tagline}</p>}
                </>
              )}
            </div>

            {/* WID pill */}
            {project.linkedWitnessId && (
              <Link href={`/verify/${project.linkedWitnessId}`}>
                <Badge variant="outline" className="border-[#d4a017]/40 text-[#d4a017]/80 text-xs cursor-pointer hover:border-[#d4a017] transition-colors">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  WID: {project.linkedWitnessId.slice(0, 16)}…
                </Badge>
              </Link>
            )}
            {editMode && !project.linkedWitnessId && (
              <p className="text-white/50 text-xs flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                WID will be generated when you publish
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#d4a017] font-bold text-lg">{formatCents(project.raisedAmountCents)}</p>
                <p className="text-white/40 text-xs">raised</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#d4a017] font-bold text-lg">{project.donorCount}</p>
                <p className="text-white/40 text-xs">supporters</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#d4a017] font-bold text-lg">{followStatus?.followerCount ?? 0}</p>
                <p className="text-white/40 text-xs">followers</p>
              </div>
            </div>

            {/* Goal (editable) */}
            {editMode ? (
              <div className="space-y-1">
                <Label className="text-white/40 text-xs">Funding goal (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                  <Input type="number" min="0" value={localGoal} onChange={(e) => setLocalGoal(e.target.value)}
                    placeholder="e.g. 500" className="pl-7 bg-white/5 border-white/10 text-white text-sm" />
                </div>
              </div>
            ) : pct !== null ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-white/50">
                  <span>{pct}% funded</span>
                  <span>Goal: {formatCents(project.goalAmountCents!)}</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ) : null}

            {/* Status */}
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Calendar className="w-3 h-3" />
              <span>Started {formatDate(project.createdAt)}</span>
              <Badge variant="outline" className={`ml-auto text-xs ${
                project.status === "active" ? "border-green-500/40 text-green-400"
                : project.status === "completed" ? "border-blue-500/40 text-blue-400"
                : "border-white/20 text-white/40"
              }`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>
              <button
                className="p-1.5 text-white/50 hover:text-[#d4a017] transition-colors rounded-lg"
                title="Share project"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Narration Player (public view) ── */}
        {!editMode && localNarrationUrl && (
          <div className="mb-6">
            <NarrationPlayer url={localNarrationUrl} />
          </div>
        )}

        {/* ── Narration Upload (edit mode) ── */}
        {editMode && (
          <div className="mb-6">
            <NarrationUploadPanel
              projectId={project.id}
              currentUrl={localNarrationUrl}
              onUploaded={(url) => setLocalNarrationUrl(url)}
            />
          </div>
        )}

        {/* ── Content Blocks ── */}
        <div className="space-y-6 mb-10">
          {blocks.length === 0 && !editMode && (
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-8 text-center text-white/50 text-sm">
                The creator hasn't added content yet.
              </CardContent>
            </Card>
          )}
          {editMode ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      projectId={project.id}
                      onChange={(updated) => updateBlock(block.id, updated)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <AddBlockBar onAdd={addBlock} />
            </>
          ) : (
            blocks.map((block) => (
              <div key={block.id}>
                <BlockView block={block} />
              </div>
            ))
          )}
        </div>

        {/* ── Project Songs / Linked Tracks ── */}
        <div className="mb-10">
          <ProjectSongsPanel
            projectId={project.id}
            editMode={editMode}
            userId={project.userId}
          />
        </div>

        {/* ── Progress updates ── */}
        {updates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              Progress Updates
              <Badge variant="outline" className="border-white/20 text-white/50 text-xs">{updates.length}</Badge>
            </h2>
            <div className="space-y-4">
              {displayedUpdates.map((u: any) => (
                <Card key={u.id} className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-5">
                    {u.title && <h3 className="text-white font-medium mb-2">{u.title}</h3>}
                    <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{u.body}</p>
                    {u.imageUrl && <img src={u.imageUrl} alt="Update" className="mt-3 rounded-lg max-h-64 object-cover w-full" />}
                    <p className="text-white/50 text-xs mt-3">{formatDate(u.createdAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {updates.length > 2 && (
              <button type="button" onClick={() => setUpdatesExpanded(!updatesExpanded)}
                className="mt-3 flex items-center gap-1 text-[#d4a017]/70 hover:text-[#d4a017] text-sm transition-colors">
                {updatesExpanded ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show {updates.length - 2} more updates</>}
              </button>
            )}
          </div>
        )}

        {/* ── Supporters wall ── */}
        {visibleDonors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#d4a017]" /> Supporters
            </h2>
            <div className="flex flex-wrap gap-2">
              {visibleDonors.map((d: any) => (
                <div key={d.id} className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 text-sm">
                  <span className="text-white/70">{d.donorName || "Supporter"}</span>
                  <span className="text-[#d4a017]/70 text-xs">{formatCents(d.amountCents)}</span>
                </div>
              ))}
              {donations.length > 8 && (
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 text-sm text-white/40">
                  +{donations.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom donate CTA ── */}
        {project.status === "active" && !editMode && (
          <div className="sticky bottom-6 flex justify-center">
            <div className="bg-[#0d0d1a]/95 backdrop-blur border border-white/10 rounded-2xl p-4 flex items-center gap-6 shadow-2xl">
              <div className="text-center">
                <p className="text-[#d4a017] font-bold text-lg leading-none">{formatCents(project.raisedAmountCents)}</p>
                {project.goalAmountCents && (
                  <p className="text-white/40 text-xs">of {formatCents(project.goalAmountCents)} goal</p>
                )}
              </div>
              {pct !== null && (
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              )}
              <Button onClick={() => setDonateOpen(true)} className="bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold px-6">
                Donate
              </Button>
              {!isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  className={`border font-semibold transition-all ${
                    followStatus?.isFollowing
                      ? "border-[#d4a017] text-[#d4a017] bg-[#d4a017]/10 hover:bg-[#d4a017]/20"
                      : "border-white/20 text-white/60 bg-transparent hover:text-white hover:border-white/40"
                  }`}
                >
                  {followStatus?.isFollowing
                    ? <><BellOff className="w-3.5 h-3.5 mr-1" /> Following</>
                    : <><Bell className="w-3.5 h-3.5 mr-1" /> Follow</>}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white/60 hover:text-white hover:border-white/40 bg-transparent"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="w-4 h-4 mr-1" /> Share
              </Button>
              {project && (
                <QRShareModal
                  entity={{
                    type: "project",
                    id: project.id,
                    slug: project.slug,
                    name: project.title,
                    subtitle: project.tagline ?? undefined,
                    description: project.description ?? undefined,
                    thumbnailUrl: project.bannerUrl ?? undefined,
                  }}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-amber-700/40 text-amber-400/70 hover:text-amber-300 hover:border-amber-600/60 bg-transparent gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1"/>
                        <rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/>
                        <path d="M14 14h2v2h-2zm4 0h3v3h-3zm0 4v3h-3v-3"/>
                      </svg>
                      ID Card
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>

      <DonateDialog
        project={{ id: project.id, title: project.title, slug: project.slug }}
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
      />
      <ShareModal
        project={{ title: project.title, slug: project.slug }}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
