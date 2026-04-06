import { useParams, Link, useLocation } from "wouter";
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
  Minus, Check, X, Eye, Upload, ExternalLink, Rocket, Share2, Copy,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

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
}: {
  bannerUrl: string | null;
  title: string;
  status: string;
  editMode: boolean;
  isPending: boolean;
  onFile: (file: File) => void;
  bannerFileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

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
      className="relative w-full h-56 md:h-80 overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {bannerUrl ? (
        <img src={bannerUrl} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#1a1025] via-[#0d0d1a] to-[#080d14]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080d14]/40 to-[#080d14]" />

      {/* Drag-over overlay */}
      {editMode && isDragOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
          style={{ background: "oklch(0.84 0.155 85 / 0.15)", backdropFilter: "blur(4px)", border: "2px dashed oklch(0.84 0.155 85 / 0.6)" }}
        >
          <Upload className="w-10 h-10" style={{ color: "oklch(0.84 0.155 85)" }} />
          <p className="text-sm font-heading" style={{ color: "oklch(0.84 0.155 85)" }}>Drop to set as banner</p>
        </div>
      )}

      {/* Funding badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Badge className="bg-[#d4a017]/90 text-black font-bold px-3 py-1 text-sm">
          {status === "draft" ? "Draft" : status === "completed" ? "Completed" : "Funding"}
        </Badge>
      </div>

      {/* Banner upload controls (edit mode) */}
      {editMode && !isDragOver && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <button
            onClick={() => bannerFileRef.current?.click()}
            className="flex items-center gap-2 bg-black/60 backdrop-blur border border-white/20 rounded-xl px-3 py-2 text-white/70 hover:text-white text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            {isPending ? "Uploading…" : bannerUrl ? "Change banner" : "Upload banner"}
          </button>
          {!bannerUrl && (
            <span className="text-white/30 text-xs">or drag &amp; drop an image here</span>
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
      <span className="text-white/20 text-6xl font-bold">{title[0]}</span>
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
    return (
      <figure className="space-y-2">
        <img src={block.imageUrl} alt={block.imageCaption || ""} className="w-full rounded-xl object-cover max-h-[480px]" />
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

function BlockEditor({ block, projectId, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  block: Block;
  projectId: number;
  onChange: (updated: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
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
    <div className="group relative bg-white/[0.04] border border-white/10 rounded-xl p-4 space-y-3">
      {/* Block type badge + controls */}
      <div className="flex items-center justify-between">
        <span className="text-white/30 text-xs uppercase tracking-widest font-mono">{block.type}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isFirst && (
            <button onClick={onMoveUp} className="p-1 text-white/40 hover:text-white transition-colors" title="Move up">
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {!isLast && (
            <button onClick={onMoveDown} className="p-1 text-white/40 hover:text-white transition-colors" title="Move down">
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          <button onClick={onDelete} className="p-1 text-red-400/60 hover:text-red-400 transition-colors" title="Delete block">
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
          className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none min-h-[120px]"
          rows={5}
        />
      )}

      {block.type === "image" && (
        <div className="space-y-3">
          {block.imageUrl ? (
            <div className="relative">
              <img src={block.imageUrl} alt="" className="w-full rounded-lg max-h-64 object-cover" />
              <button
                onClick={() => onChange({ ...block, imageUrl: undefined, imageKey: undefined })}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white/70 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
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
                  <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
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
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
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
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
          />
          <Input
            value={block.videoCaption || ""}
            onChange={(e) => onChange({ ...block, videoCaption: e.target.value })}
            placeholder="Caption (optional)"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
          />
        </div>
      )}

      {block.type === "divider" && (
        <div className="flex items-center gap-3 py-2">
          <hr className="flex-1 border-white/10" />
          <span className="text-white/20 text-xs">— divider —</span>
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
          <button onClick={() => setOpen(false)} className="ml-2 text-white/30 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-dashed border-white/15 text-white/30 hover:border-[#d4a017]/50 hover:text-[#d4a017]/70 transition-all text-sm"
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
                <button key={p} onClick={() => setAmount(String(p))}
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
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none" rows={3} maxLength={500} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="anon" checked={anonymous} onCheckedChange={(v) => setAnonymous(!!v)} className="border-white/20" />
            <Label htmlFor="anon" className="text-white/60 text-sm cursor-pointer">Donate anonymously</Label>
          </div>
          <p className="text-white/30 text-xs">10% platform fee applies. Stripe processes payment securely.</p>
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
        <span className={value ? "" : "text-white/25 italic"}>{value || placeholder}</span>
        <Pencil className="w-3 h-3 text-white/20 group-hover:text-[#d4a017]/60 absolute -right-5 top-1 transition-colors" />
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
          className={`bg-white/5 border-[#d4a017]/40 text-white placeholder:text-white/25 resize-none ${className}`}
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`bg-white/5 border-[#d4a017]/40 text-white placeholder:text-white/25 ${className}`}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [donateOpen, setDonateOpen] = useState(false);
  const [updatesExpanded, setUpdatesExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Local editable state for header fields
  const [localTitle, setLocalTitle] = useState("");
  const [localTagline, setLocalTagline] = useState("");
  const [localGoal, setLocalGoal] = useState("");
  const [localVideoUrl, setLocalVideoUrl] = useState("");
  const [localVideoType, setLocalVideoType] = useState<"youtube" | "vimeo" | "s3" | "none">("none");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocksDirty, setBlocksDirty] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.projects.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
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

  // Sync header fields when data loads
  useEffect(() => {
    if (data?.project) {
      setLocalTitle(data.project.title);
      setLocalTagline(data.project.tagline || "");
      setLocalGoal(data.project.goalAmountCents ? String(data.project.goalAmountCents / 100) : "");
      setLocalVideoUrl(data.project.videoUrl || "");
      setLocalVideoType((data.project.videoType as any) || "none");
    }
  }, [data?.project]);

  const isOwner = !!user && !!data?.project && user.id === data.project.userId;

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

  const urlParams = new URLSearchParams(window.location.search);
  const donationSuccess = urlParams.get("donation") === "success";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading project…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-center gap-4">
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
    <div className="min-h-screen bg-[#080d14] text-white">
      {/* ── Banner (drag-and-drop in edit mode) ── */}
      <BannerDropZone
        bannerUrl={project.bannerUrl ?? null}
        title={project.title}
        status={project.status}
        editMode={editMode}
        isPending={uploadBanner.isPending}
        onFile={handleBannerFile}
        bannerFileRef={bannerFileRef}
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
              <Button size="sm" onClick={() => setEditMode(true)} className="bg-white/10 hover:bg-white/20 text-white text-xs h-8">
                <Pencil className="w-3 h-3 mr-1" /> Edit Project
              </Button>
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
                    <button key={vt} onClick={() => setLocalVideoType(vt)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                        localVideoType === vt ? "bg-[#d4a017] text-black border-[#d4a017]" : "bg-white/5 text-white/50 border-white/10 hover:border-[#d4a017]/40"
                      }`}
                    >{vt === "s3" ? "Direct URL" : vt === "none" ? "None" : vt.charAt(0).toUpperCase() + vt.slice(1)}</button>
                  ))}
                </div>
                {localVideoType !== "none" && (
                  <Input value={localVideoUrl} onChange={(e) => setLocalVideoUrl(e.target.value)}
                    placeholder={localVideoType === "youtube" ? "https://www.youtube.com/watch?v=…" : localVideoType === "vimeo" ? "https://vimeo.com/…" : "https://…/video.mp4"}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm" />
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

            {/* Quick donate under video */}
            {project.status === "active" && !editMode && (
              <Button onClick={() => setDonateOpen(true)} className="w-full bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold py-3 text-base">
                <Heart className="w-4 h-4 mr-2" /> Donate
              </Button>
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
              <p className="text-white/30 text-xs flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                WID will be generated when you publish
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#d4a017] font-bold text-lg">{formatCents(project.raisedAmountCents)}</p>
                <p className="text-white/40 text-xs">raised</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#d4a017] font-bold text-lg">{project.donorCount}</p>
                <p className="text-white/40 text-xs">supporters</p>
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
                className="p-1.5 text-white/30 hover:text-[#d4a017] transition-colors rounded-lg"
                title="Copy project link"
                onClick={async () => {
                  const url = `${window.location.origin}/project/${project.slug}`;
                  try {
                    if (navigator.share) { await navigator.share({ title: project.title, url }); return; }
                  } catch {}
                  try { await navigator.clipboard.writeText(url); toast.success("Link copied!"); } catch {}
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Content Blocks ── */}
        <div className="space-y-6 mb-10">
          {blocks.length === 0 && !editMode && (
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-8 text-center text-white/30 text-sm">
                The creator hasn't added content yet.
              </CardContent>
            </Card>
          )}
          {editMode ? (
            <>
              {blocks.map((block, idx) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  projectId={project.id}
                  onChange={(updated) => updateBlock(block.id, updated)}
                  onDelete={() => deleteBlock(block.id)}
                  onMoveUp={() => moveBlock(block.id, -1)}
                  onMoveDown={() => moveBlock(block.id, 1)}
                  isFirst={idx === 0}
                  isLast={idx === blocks.length - 1}
                />
              ))}
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
                    <p className="text-white/30 text-xs mt-3">{formatDate(u.createdAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {updates.length > 2 && (
              <button onClick={() => setUpdatesExpanded(!updatesExpanded)}
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
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white/60 hover:text-white hover:border-white/40 bg-transparent"
                onClick={async () => {
                  const url = `${window.location.origin}/project/${project.slug}`;
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: project.title, text: `Support "${project.title}" on Living Nexus`, url });
                      return;
                    }
                  } catch {}
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copied!");
                  } catch {}
                }}
              >
                <Share2 className="w-4 h-4 mr-1" /> Share
              </Button>
            </div>
          </div>
        )}
      </div>

      <DonateDialog
        project={{ id: project.id, title: project.title, slug: project.slug }}
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
      />
    </div>
  );
}
