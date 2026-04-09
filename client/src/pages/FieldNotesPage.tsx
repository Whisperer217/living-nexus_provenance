import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ScrollText, Plus, Globe, Lock, Edit2, Trash2, X, ChevronDown, ChevronUp,
  BookOpen, Zap, Layers, FileText, Video, Eye, EyeOff,
} from "lucide-react";

const CATEGORIES = [
  { value: "doctrine", label: "Doctrine", color: "#D4AF37", icon: BookOpen },
  { value: "journal", label: "Journal", color: "#A78BFA", icon: ScrollText },
  { value: "update", label: "Update", color: "#60a5fa", icon: Zap },
  { value: "concept", label: "Concept", color: "#fb923c", icon: Layers },
] as const;

type Category = "doctrine" | "journal" | "update" | "concept";

interface FieldNote {
  id: number;
  title: string;
  body: string;
  category: Category;
  isPublic: boolean;
  videoUrl?: string | null;
  coverImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function CategoryBadge({ category }: { category: Category }) {
  const cat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[1];
  const Icon = cat.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-semibold tracking-wider uppercase"
      style={{ background: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}30` }}
    >
      <Icon size={9} />
      {cat.label}
    </span>
  );
}

function NoteCard({
  note,
  onEdit,
  onDelete,
  isOwner,
}: {
  note: FieldNote;
  onEdit: (note: FieldNote) => void;
  onDelete: (id: number) => void;
  isOwner: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = note.body.slice(0, 200);
  const hasMore = note.body.length > 200;

  return (
    <div
      className="rounded-2xl border transition-all"
      style={{ background: "oklch(0.10 0.04 280)", borderColor: "oklch(0.22 0.05 280)" }}
    >
      {/* Cover image */}
      {note.coverImageUrl && (
        <div className="w-full h-40 overflow-hidden rounded-t-2xl">
          <img
            src={note.coverImageUrl}
            alt={note.title}
            className="w-full h-full object-cover object-top"
          />
        </div>
      )}

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CategoryBadge category={note.category} />
              {isOwner && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body"
                  style={
                    note.isPublic
                      ? { background: "oklch(0.65 0.18 145 / 0.12)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.3)" }
                      : { background: "oklch(0.5 0.05 280 / 0.15)", color: "oklch(0.6 0.05 280)", border: "1px solid oklch(0.5 0.05 280 / 0.3)" }
                  }
                >
                  {note.isPublic ? <Globe size={8} /> : <Lock size={8} />}
                  {note.isPublic ? "Public" : "Private"}
                </span>
              )}
            </div>
            <h3 className="font-heading text-[15px] text-white/90 leading-snug">{note.title}</h3>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(note)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-[#D4AF37] hover:bg-white/[0.06] transition-all"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-lnx-red hover:bg-white/[0.06] transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="font-body text-[13px] text-white/65 leading-relaxed whitespace-pre-wrap">
          {expanded ? note.body : preview}
          {!expanded && hasMore && "…"}
        </div>

        {/* Video embed */}
        {note.videoUrl && expanded && (
          <div className="mt-3 rounded-xl overflow-hidden aspect-video bg-black/40">
            <iframe
              src={note.videoUrl.replace("watch?v=", "embed/")}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] font-body text-white/25">
            {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          {(hasMore || note.videoUrl) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] font-body text-white/40 hover:text-[#D4AF37] transition-colors"
            >
              {expanded ? <><ChevronUp size={11} /> Collapse</> : <><ChevronDown size={11} /> Read more</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: Partial<FieldNote>;
  onSave: (data: {
    title: string;
    body: string;
    category: Category;
    isPublic: boolean;
    videoUrl: string;
    coverImageUrl: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "journal");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const canSave = title.trim().length > 0 && body.trim().length > 0;

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: "oklch(0.11 0.05 280)", borderColor: "oklch(0.28 0.08 280)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-[#D4AF37]" />
          <span className="font-heading text-[14px] text-white/90 tracking-wide">
            {initial?.id ? "Edit Field Note" : "New Field Note"}
          </span>
        </div>
        <button type="button" onClick={onCancel} className="text-white/40 hover:text-white/70 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title…"
        className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 font-heading text-[14px]"
        maxLength={256}
      />

      {/* Category selector */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = category === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-body font-semibold tracking-wider uppercase transition-all"
              style={
                active
                  ? { background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}50` }
                  : { background: "oklch(0.158 0.030 50)", color: "oklch(0.55 0.04 280)", border: "1px solid oklch(0.25 0.04 280)" }
              }
            >
              <Icon size={10} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your field note, doctrine, or journal entry…"
        rows={7}
        className="bg-white/[0.05] border-white/[0.1] text-white/85 placeholder:text-white/30 font-body text-[13px] leading-relaxed resize-none"
      />

      {/* Visibility toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsPublic(!isPublic)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px] font-body transition-all"
          style={
            isPublic
              ? { background: "oklch(0.65 0.18 145 / 0.12)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.3)" }
              : { background: "oklch(0.158 0.030 50)", color: "oklch(0.55 0.04 280)", border: "1px solid oklch(0.25 0.04 280)" }
          }
        >
          {isPublic ? <><Eye size={11} /> Public — visible to all</> : <><EyeOff size={11} /> Private — only you</>}
        </button>
      </div>

      {/* Advanced (video / cover image) */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-[11px] font-body text-white/35 hover:text-white/60 transition-colors"
      >
        <Video size={11} />
        {showAdvanced ? "Hide advanced" : "Add video or cover image"}
        {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {showAdvanced && (
        <div className="space-y-3">
          <Input
            value={videoUrl as string}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube URL (optional)…"
            className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 font-body text-[12px]"
          />
          <Input
            value={coverImageUrl as string}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="Cover image CDN URL (optional)…"
            className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-white/30 font-body text-[12px]"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button
          onClick={() => onSave({ title, body, category, isPublic, videoUrl: videoUrl as string, coverImageUrl: coverImageUrl as string })}
          disabled={!canSave || isSaving}
          className="flex-1 font-heading text-[13px] tracking-wider"
          style={{ background: "linear-gradient(135deg, #D4AF37, #B8960C)", color: "#0a0a0f" }}
        >
          {isSaving ? "Saving…" : initial?.id ? "Update Note" : "Publish Note"}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="font-body text-[12px] border-white/[0.12] text-white/60 hover:text-white/80"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function FieldNotesPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: myNotes = [], isLoading } = trpc.fieldNotes.mine.useQuery(undefined, {
    enabled: !!user,
  });

  const createMutation = trpc.fieldNotes.create.useMutation({
    onSuccess: () => {
      utils.fieldNotes.mine.invalidate();
      setShowForm(false);
      toast.success("Field Note saved — published to your log.");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.fieldNotes.update.useMutation({
    onSuccess: () => {
      utils.fieldNotes.mine.invalidate();
      setEditingNote(null);
      toast.success("Note updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.fieldNotes.delete.useMutation({
    onSuccess: () => {
      utils.fieldNotes.mine.invalidate();
      toast.success("Note deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<FieldNote | null>(null);
  const [activeFilter, setActiveFilter] = useState<Category | "all">("all");

  const filtered = (myNotes as FieldNote[]).filter(
    (n) => activeFilter === "all" || n.category === activeFilter
  );

  const handleCreate = (data: { title: string; body: string; category: Category; isPublic: boolean; videoUrl: string; coverImageUrl: string }) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: { title: string; body: string; category: Category; isPublic: boolean; videoUrl: string; coverImageUrl: string }) => {
    if (!editingNote) return;
    updateMutation.mutate({ id: editingNote.id, ...data });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this field note? This cannot be undone.")) return;
    deleteMutation.mutate({ id });
  };

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.04 280)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScrollText size={18} className="text-[#D4AF37]" />
              <h1 className="font-heading text-[22px] text-white/95 tracking-wide">Field Notes</h1>
            </div>
            <p className="font-body text-[12px] text-white/40">
              Your doctrine, journal, and system philosophy — your voice and authority layer.
            </p>
          </div>
          {user && !showForm && !editingNote && (
            <Button
              onClick={() => setShowForm(true)}
              size="sm"
              className="flex items-center gap-1.5 font-heading text-[12px] tracking-wider"
              style={{ background: "linear-gradient(135deg, #D4AF37, #B8960C)", color: "#0a0a0f" }}
            >
              <Plus size={13} />
              New Note
            </Button>
          )}
        </div>

        {/* Create form */}
        {showForm && !editingNote && (
          <div className="mb-6">
            <NoteForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              isSaving={createMutation.isPending}
            />
          </div>
        )}

        {/* Edit form */}
        {editingNote && (
          <div className="mb-6">
            <NoteForm
              initial={editingNote}
              onSave={handleUpdate}
              onCancel={() => setEditingNote(null)}
              isSaving={updateMutation.isPending}
            />
          </div>
        )}

        {/* Category filter */}
        {(myNotes as FieldNote[]).length > 0 && (
          <div className="flex gap-2 flex-wrap mb-5">
            <button
              onClick={() => setActiveFilter("all")}
              className="px-3 py-1 rounded-xl text-[11px] font-body font-semibold tracking-wider uppercase transition-all"
              style={
                activeFilter === "all"
                  ? { background: "#D4AF3722", color: "#D4AF37", border: "1px solid #D4AF3750" }
                  : { background: "oklch(0.158 0.030 50)", color: "oklch(0.55 0.04 280)", border: "1px solid oklch(0.25 0.04 280)" }
              }
            >
              All
            </button>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = (myNotes as FieldNote[]).filter((n) => n.category === cat.value).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveFilter(cat.value)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-body font-semibold tracking-wider uppercase transition-all"
                  style={
                    activeFilter === cat.value
                      ? { background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}50` }
                      : { background: "oklch(0.158 0.030 50)", color: "oklch(0.55 0.04 280)", border: "1px solid oklch(0.25 0.04 280)" }
                  }
                >
                  <Icon size={9} />
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Notes list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: "oklch(0.13 0.04 280)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText size={32} className="mx-auto mb-4 text-white/10" />
            <p className="font-heading text-[16px] text-white/30 mb-2">
              {activeFilter === "all" ? "No field notes yet" : `No ${activeFilter} notes`}
            </p>
            <p className="font-body text-[12px] text-white/20 mb-6">
              {activeFilter === "all"
                ? "Start your doctrine, journal, or system log. This is your voice and authority layer."
                : `Switch to a different category or create your first ${activeFilter} note.`}
            </p>
            {!showForm && user && activeFilter === "all" && (
              <Button
                onClick={() => setShowForm(true)}
                size="sm"
                className="font-heading text-[12px] tracking-wider"
                style={{ background: "linear-gradient(135deg, #D4AF37, #B8960C)", color: "#0a0a0f" }}
              >
                <Plus size={13} className="mr-1.5" />
                Write Your First Note
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={(n) => { setEditingNote(n); setShowForm(false); }}
                onDelete={handleDelete}
                isOwner={!!user}
              />
            ))}
          </div>
        )}

        {/* Not logged in */}
        {!user && (
          <div className="text-center py-16">
            <ScrollText size={32} className="mx-auto mb-4 text-white/10" />
            <p className="font-body text-[13px] text-white/40">Sign in to write and manage your Field Notes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
