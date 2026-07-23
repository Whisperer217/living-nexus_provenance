/**
 * Platform Guides Page — /platform-guides
 * Public: browse & read published how-to articles
 * Owner: create, edit, publish/unpublish, delete guides
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  BookOpen, Plus, Edit3, Eye, EyeOff, Trash2,
  Clock, ChevronRight, ArrowLeft, Save, Loader2, Sparkles,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  "registration": "Registration",
  "keeper-avatar": "Keeper & Avatar",
  "store": "The Store",
  "provenance": "Provenance & WIDs",
  "3d-print": "3D Print / G-code",
  "music": "Music & Audio",
  "general": "General",
};

const CATEGORY_ICONS: Record<string, string> = {
  "getting-started": "◈",
  "registration": "⊕",
  "keeper-avatar": "◉",
  "store": "✦",
  "provenance": "⬡",
  "3d-print": "⬢",
  "music": "♪",
  "general": "○",
};

// ─── Guide Card ───────────────────────────────────────────────────────────────
function GuideCard({
  guide,
  isOwner,
  onEdit,
  onTogglePublished,
  onDelete,
  onClick,
}: {
  guide: any;
  isOwner: boolean;
  onEdit?: () => void;
  onTogglePublished?: () => void;
  onDelete?: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--ln-panel)",
        border: "1px solid var(--ln-panel-border)",
        borderRadius: "12px",
        padding: "20px",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s",
        position: "relative",
        opacity: guide.published ? 1 : 0.65,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--ln-gold)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--ln-panel-border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Category badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <span style={{ fontSize: "14px", color: "var(--ln-gold)" }}>
          {CATEGORY_ICONS[guide.category] ?? "○"}
        </span>
        <span style={{
          fontFamily: "var(--font-display)",
          fontSize: "9px",
          letterSpacing: "0.12em",
          color: "var(--ln-gold)",
          textTransform: "uppercase",
        }}>
          {CATEGORY_LABELS[guide.category] ?? guide.category}
        </span>
        {isOwner && !guide.published && (
          <span style={{
            marginLeft: "auto",
            fontFamily: "var(--font-display)",
            fontSize: "9px",
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            background: "rgba(255,255,255,0.06)",
            padding: "2px 8px",
            borderRadius: "4px",
          }}>
            Draft
          </span>
        )}
      </div>

      {/* Cover image */}
      {guide.coverImageUrl && (
        <div style={{
          width: "100%",
          aspectRatio: "16/9",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "14px",
        }}>
          <img
            src={guide.coverImageUrl}
            alt={guide.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Title */}
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: "15px",
        fontWeight: 700,
        color: "var(--ln-parchment)",
        marginBottom: "6px",
        lineHeight: 1.3,
      }}>
        {guide.title}
      </div>

      {/* Summary */}
      {guide.summary && (
        <div style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.5,
          marginBottom: "12px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {guide.summary}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
          <Clock size={11} />
          <span>{guide.readingTimeMinutes ?? 3} min read</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--ln-gold)", fontSize: "11px" }}>
          <span>Read guide</span>
          <ChevronRight size={11} />
        </div>
      </div>

      {/* Owner actions */}
      {isOwner && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            display: "flex",
            gap: "6px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            title="Edit"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "6px",
              padding: "5px 7px",
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={onTogglePublished}
            title={guide.published ? "Unpublish" : "Publish"}
            style={{
              background: guide.published ? "rgba(255,200,50,0.12)" : "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "6px",
              padding: "5px 7px",
              cursor: "pointer",
              color: guide.published ? "var(--ln-gold)" : "rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {guide.published ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            style={{
              background: "rgba(255,80,80,0.1)",
              border: "none",
              borderRadius: "6px",
              padding: "5px 7px",
              cursor: "pointer",
              color: "rgba(255,100,100,0.7)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Guide Reader ─────────────────────────────────────────────────────────────
function GuideReader({ slug, onBack }: { slug: string; onBack: () => void }) {
  const { data: guide, isLoading } = trpc.platformGuides.getBySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
        <Loader2 size={24} style={{ color: "var(--ln-gold)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!guide) return null;

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 20px 60px" }}>
      <button
        onClick={onBack}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.45)", fontSize: "12px",
          fontFamily: "var(--font-display)", letterSpacing: "0.08em",
          marginBottom: "32px", padding: "0",
        }}
      >
        <ArrowLeft size={13} /> Back to Guides
      </button>

      {/* Category */}
      <div style={{
        fontFamily: "var(--font-display)", fontSize: "10px",
        letterSpacing: "0.15em", color: "var(--ln-gold)",
        textTransform: "uppercase", marginBottom: "10px",
      }}>
        {CATEGORY_ICONS[guide.category]} {CATEGORY_LABELS[guide.category]}
      </div>

      {/* Title */}
      <h1 style={{
        fontFamily: "var(--font-display)", fontSize: "clamp(22px, 4vw, 32px)",
        fontWeight: 800, color: "var(--ln-parchment)", marginBottom: "12px",
        lineHeight: 1.2,
      }}>
        {guide.title}
      </h1>

      {/* Meta */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "28px", color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Clock size={11} /> {guide.readingTimeMinutes ?? 3} min read
        </span>
      </div>

      {/* Cover image */}
      {guide.coverImageUrl && (
        <div style={{
          width: "100%", aspectRatio: "16/9", borderRadius: "12px",
          overflow: "hidden", marginBottom: "32px",
        }}>
          <img src={guide.coverImageUrl} alt={guide.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* Summary */}
      {guide.summary && (
        <div style={{
          background: "rgba(255,200,50,0.06)", border: "1px solid rgba(255,200,50,0.15)",
          borderRadius: "8px", padding: "16px 20px", marginBottom: "28px",
          fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.6,
          fontStyle: "italic",
        }}>
          {guide.summary}
        </div>
      )}

      {/* Body */}
      <div
        style={{
          fontSize: "14px", color: "rgba(255,255,255,0.75)", lineHeight: 1.8,
          whiteSpace: "pre-wrap",
        }}
      >
        {guide.body || <span style={{ color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>No content yet.</span>}
      </div>
    </div>
  );
}

// ─── Guide Editor (owner only) ────────────────────────────────────────────────
function GuideEditor({
  guide,
  onSaved,
  onCancel,
}: {
  guide?: any;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    slug: guide?.slug ?? "",
    title: guide?.title ?? "",
    summary: guide?.summary ?? "",
    body: guide?.body ?? "",
    coverImageUrl: guide?.coverImageUrl ?? "",
    category: guide?.category ?? "general",
    readingTimeMinutes: guide?.readingTimeMinutes ?? 3,
    featured: guide?.featured ?? false,
  });
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const createMutation = trpc.platformGuides.create.useMutation({
    onSuccess: () => {
      toast.success("Guide created.");
      utils.platformGuides.listAll.invalidate();
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.platformGuides.update.useMutation({
    onSuccess: () => {
      toast.success("Guide saved.");
      utils.platformGuides.listAll.invalidate();
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title is required."); return; }
    if (!form.slug.trim()) { toast.error("Slug is required."); return; }
    if (guide?.id) {
      updateMutation.mutate({ id: guide.id, ...form });
    } else {
      createMutation.mutate(form as any);
    }
  };

  const handleUploadCover = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "image");
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (data.url) setForm((f) => ({ ...f, coverImageUrl: data.url }));
      else toast.error("Upload failed.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) { toast.error("Enter a prompt first."); return; }
    setGeneratingImage(true);
    try {
      const res = await fetch("/api/trpc/keeper.generatePortrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ json: { prompt: aiPrompt, style: "cinematic" } }),
      });
      const data = await res.json();
      const url = data?.result?.data?.json?.url;
      if (url) {
        setForm((f) => ({ ...f, coverImageUrl: url }));
        toast.success("Cover image generated.");
      } else {
        toast.error("Image generation failed.");
      }
    } catch {
      toast.error("Image generation failed.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 20px 60px" }}>
      <button
        onClick={onCancel}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.45)", fontSize: "12px",
          fontFamily: "var(--font-display)", letterSpacing: "0.08em",
          marginBottom: "28px", padding: "0",
        }}
      >
        <ArrowLeft size={13} /> Cancel
      </button>

      <div style={{
        fontFamily: "var(--font-display)", fontSize: "10px",
        letterSpacing: "0.15em", color: "var(--ln-gold)",
        textTransform: "uppercase", marginBottom: "20px",
      }}>
        {guide?.id ? "Edit Guide" : "New Platform Guide"}
      </div>

      {/* Form fields */}
      {[
        { label: "Title", key: "title", placeholder: "How to Register Your First Work", type: "text" },
        { label: "Slug (URL)", key: "slug", placeholder: "register-first-work", type: "text" },
        { label: "Summary (shown in cards)", key: "summary", placeholder: "A brief description…", type: "textarea" },
      ].map(({ label, key, placeholder, type }) => (
        <div key={key} style={{ marginBottom: "18px" }}>
          <label style={{
            display: "block", fontFamily: "var(--font-display)", fontSize: "10px",
            letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase", marginBottom: "6px",
          }}>
            {label}
          </label>
          {type === "textarea" ? (
            <textarea
              value={(form as any)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              rows={3}
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
                padding: "10px 14px", color: "var(--ln-parchment)", fontSize: "13px",
                resize: "vertical", fontFamily: "inherit",
              }}
            />
          ) : (
            <input
              type="text"
              value={(form as any)[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
                padding: "10px 14px", color: "var(--ln-parchment)", fontSize: "13px",
              }}
            />
          )}
        </div>
      ))}

      {/* Category + reading time */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
        <div>
          <label style={{
            display: "block", fontFamily: "var(--font-display)", fontSize: "10px",
            letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase", marginBottom: "6px",
          }}>
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
              padding: "10px 14px", color: "var(--ln-parchment)", fontSize: "13px",
            }}
          >
            {Object.entries(CATEGORY_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{
            display: "block", fontFamily: "var(--font-display)", fontSize: "10px",
            letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase", marginBottom: "6px",
          }}>
            Reading Time (min)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={form.readingTimeMinutes}
            onChange={(e) => setForm((f) => ({ ...f, readingTimeMinutes: parseInt(e.target.value) || 3 }))}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
              padding: "10px 14px", color: "var(--ln-parchment)", fontSize: "13px",
            }}
          />
        </div>
      </div>

      {/* Cover image */}
      <div style={{ marginBottom: "18px" }}>
        <label style={{
          display: "block", fontFamily: "var(--font-display)", fontSize: "10px",
          letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase", marginBottom: "6px",
        }}>
          Cover Image
        </label>
        {form.coverImageUrl && (
          <div style={{
            width: "100%", aspectRatio: "16/9", borderRadius: "8px",
            overflow: "hidden", marginBottom: "10px",
          }}>
            <img src={form.coverImageUrl} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <label style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
            fontSize: "12px", color: "rgba(255,255,255,0.6)",
            display: "flex", alignItems: "center", gap: "6px",
            opacity: uploading ? 0.5 : 1,
          }}>
            {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : null}
            {uploading ? "Uploading…" : "Upload Image"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadCover(file);
              }}
            />
          </label>
          <div style={{ display: "flex", gap: "6px", flex: 1, minWidth: "200px" }}>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe image to generate…"
              style={{
                flex: 1, background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
                padding: "8px 12px", color: "var(--ln-parchment)", fontSize: "12px",
              }}
            />
            <button
              onClick={handleGenerateImage}
              disabled={generatingImage || !aiPrompt.trim()}
              style={{
                background: "rgba(255,200,50,0.12)", border: "1px solid rgba(255,200,50,0.25)",
                borderRadius: "8px", padding: "8px 12px", cursor: "pointer",
                color: "var(--ln-gold)", fontSize: "12px",
                display: "flex", alignItems: "center", gap: "5px",
                opacity: generatingImage ? 0.6 : 1,
              }}
            >
              {generatingImage
                ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                : <Sparkles size={12} />}
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{
          display: "block", fontFamily: "var(--font-display)", fontSize: "10px",
          letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase", marginBottom: "6px",
        }}>
          Content (supports plain text or markdown)
        </label>
        <textarea
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          placeholder="Write your guide content here…"
          rows={16}
          style={{
            width: "100%", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
            padding: "12px 14px", color: "var(--ln-parchment)", fontSize: "13px",
            resize: "vertical", fontFamily: "var(--font-mono, monospace)",
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* Featured toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
        <input
          type="checkbox"
          id="featured"
          checked={form.featured}
          onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
          style={{ accentColor: "var(--ln-gold)", width: "14px", height: "14px" }}
        />
        <label htmlFor="featured" style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
          Feature this guide (shown prominently at the top)
        </label>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        style={{
          background: "var(--ln-gold)", border: "none", borderRadius: "10px",
          padding: "13px 28px", cursor: "pointer",
          fontFamily: "var(--font-display)", fontSize: "11px",
          letterSpacing: "0.12em", fontWeight: 700,
          color: "#0a0a0a", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: "8px",
          opacity: isSaving ? 0.7 : 1,
        }}
      >
        {isSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
        {isSaving ? "Saving…" : "Save Guide"}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlatformGuidesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const isOwner = !!user;

  // Owner sees all (including drafts); public sees only published
  const { data: allGuides = [], refetch } = trpc.platformGuides.listAll.useQuery(undefined, {
    enabled: isOwner,
  });
  const { data: publicGuides = [] } = trpc.platformGuides.list.useQuery(
    activeCategory !== "all" ? { category: activeCategory as any } : undefined,
    { enabled: !isOwner }
  );

  const guides = isOwner ? allGuides : publicGuides;

  const utils = trpc.useUtils();

  const togglePublished = trpc.platformGuides.togglePublished.useMutation({
    onSuccess: () => {
      utils.platformGuides.listAll.invalidate();
      toast.success("Visibility updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteGuide = trpc.platformGuides.delete.useMutation({
    onSuccess: () => {
      utils.platformGuides.listAll.invalidate();
      toast.success("Guide deleted.");
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter by category for owner view
  const filteredGuides = activeCategory === "all"
    ? guides
    : guides.filter((g: any) => g.category === activeCategory);

  if (activeSlug) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ln-bg)", padding: "40px 0" }}>
        <GuideReader slug={activeSlug} onBack={() => setActiveSlug(null)} />
      </div>
    );
  }

  if (isCreating || editing) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ln-bg)", padding: "40px 0" }}>
        <GuideEditor
          guide={editing ?? undefined}
          onSaved={() => { setIsCreating(false); setEditing(null); refetch(); }}
          onCancel={() => { setIsCreating(false); setEditing(null); }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ln-bg)", padding: "40px 20px 80px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "36px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: "10px",
              letterSpacing: "0.15em", color: "var(--ln-gold)",
              textTransform: "uppercase", marginBottom: "8px",
            }}>
              Living Nexus
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(24px, 5vw, 36px)",
              fontWeight: 800, color: "var(--ln-parchment)", margin: 0,
            }}>
              Platform Guides
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: "8px", marginBottom: 0 }}>
              Learn how to use every feature of Living Nexus — from registration to provenance.
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setIsCreating(true)}
              style={{
                background: "var(--ln-gold)", border: "none", borderRadius: "10px",
                padding: "11px 20px", cursor: "pointer",
                fontFamily: "var(--font-display)", fontSize: "10px",
                letterSpacing: "0.12em", fontWeight: 700,
                color: "#0a0a0a", textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: "7px",
              }}
            >
              <Plus size={14} /> New Guide
            </button>
          )}
        </div>

        {/* Category filter tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px" }}>
          {["all", ...Object.keys(CATEGORY_LABELS)].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? "rgba(255,200,50,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${activeCategory === cat ? "rgba(255,200,50,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "20px",
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "var(--font-display)",
                fontSize: "10px",
                letterSpacing: "0.08em",
                color: activeCategory === cat ? "var(--ln-gold)" : "rgba(255,255,255,0.45)",
                textTransform: "uppercase",
                transition: "all 0.15s",
              }}
            >
              {cat === "all" ? "All Guides" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Guides grid */}
        {filteredGuides.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            color: "rgba(255,255,255,0.25)",
          }}>
            <BookOpen size={32} style={{ marginBottom: "16px", opacity: 0.4 }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: "13px", letterSpacing: "0.1em" }}>
              {isOwner ? "No guides yet — create your first one." : "No guides published yet."}
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "20px",
          }}>
            {filteredGuides.map((guide: any) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                isOwner={isOwner}
                onClick={() => guide.published || isOwner ? setActiveSlug(guide.slug) : undefined}
                onEdit={() => setEditing(guide)}
                onTogglePublished={() => togglePublished.mutate({ id: guide.id, published: !guide.published })}
                onDelete={() => {
                  if (confirm("Delete this guide permanently?")) {
                    deleteGuide.mutate({ id: guide.id });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
