import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit2, Eye, ExternalLink, Heart, Users, Loader2, Upload, Image as ImageIcon, RotateCcw } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusColor(s: string) {
  switch (s) {
    case "active": return "border-green-500/40 text-green-400";
    case "completed": return "border-blue-500/40 text-blue-400";
    case "archived": return "border-white/20 text-white/30";
    default: return "border-yellow-500/40 text-yellow-400";
  }
}

// ── Create / Edit Project Dialog ──────────────────────────────────────────────

function ProjectFormDialog({
  open,
  onClose,
  editProject,
}: {
  open: boolean;
  onClose: (refetch?: boolean) => void;
  editProject?: {
    id: number;
    title: string;
    tagline: string | null;
    description: string | null;
    videoUrl: string | null;
    videoType: string | null;
    goalAmountCents: number | null;
    linkedWitnessId: string | null;
    status: string;
  } | null;
}) {
  const utils = trpc.useUtils();
  const isEdit = !!editProject;

  const [title, setTitle] = useState(editProject?.title ?? "");
  const [tagline, setTagline] = useState(editProject?.tagline ?? "");
  const [description, setDescription] = useState(editProject?.description ?? "");
  const [videoUrl, setVideoUrl] = useState(editProject?.videoUrl ?? "");
  const [videoType, setVideoType] = useState<"youtube" | "vimeo" | "s3" | "none">(
    (editProject?.videoType as any) ?? "none"
  );
  const [goalDollars, setGoalDollars] = useState(
    editProject?.goalAmountCents ? String(editProject.goalAmountCents / 100) : ""
  );
  const [linkedWitnessId, setLinkedWitnessId] = useState(editProject?.linkedWitnessId ?? "");
  const [status, setStatus] = useState<"draft" | "active" | "completed" | "archived">(
    (editProject?.status as any) ?? "draft"
  );

  const create = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created!");
      utils.projects.mine.invalidate();
      onClose(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated!");
      utils.projects.mine.invalidate();
      onClose(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const goalCents = goalDollars ? Math.round(parseFloat(goalDollars) * 100) : undefined;
    if (isEdit && editProject) {
      update.mutate({
        id: editProject.id,
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        videoType,
        goalAmountCents: goalCents ?? null,
        linkedWitnessId: linkedWitnessId.trim() || undefined,
        status,
      });
    } else {
      create.mutate({
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        videoType,
        goalAmountCents: goalCents,
        linkedWitnessId: linkedWitnessId.trim() || undefined,
      });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg bg-[#0d0d1a] border border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEdit ? "Edit Project" : "New Project"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70 text-sm">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Album Campaign"
              className="mt-1 bg-white/5 border-white/10 text-white"
              maxLength={256}
            />
          </div>
          <div>
            <Label className="text-white/70 text-sm">Tagline</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short compelling sentence"
              className="mt-1 bg-white/5 border-white/10 text-white"
              maxLength={512}
            />
          </div>
          <div>
            <Label className="text-white/70 text-sm">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell your story — why this project matters, what you're creating, how funds will be used…"
              className="mt-1 bg-white/5 border-white/10 text-white resize-none"
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-white/70 text-sm">Video Type</Label>
              <Select value={videoType} onValueChange={(v) => setVideoType(v as any)}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d1a] border-white/10">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="vimeo">Vimeo</SelectItem>
                  <SelectItem value="s3">Uploaded Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-sm">Goal Amount ($)</Label>
              <Input
                type="number"
                min="1"
                value={goalDollars}
                onChange={(e) => setGoalDollars(e.target.value)}
                placeholder="500"
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          {videoType !== "none" && (
            <div>
              <Label className="text-white/70 text-sm">Video URL</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={videoType === "youtube" ? "https://youtube.com/watch?v=..." : "https://vimeo.com/..."}
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>
          )}
          <div>
            <Label className="text-white/70 text-sm">Linked WID (optional)</Label>
            <Input
              value={linkedWitnessId}
              onChange={(e) => setLinkedWitnessId(e.target.value)}
              placeholder="WID-XXXX-XXXX"
              className="mt-1 bg-white/5 border-white/10 text-white"
            />
          </div>
          {isEdit && (
            <div>
              <Label className="text-white/70 text-sm">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d1a] border-white/10">
                  <SelectItem value="draft">Draft (not public)</SelectItem>
                  <SelectItem value="active">Active (accepting donations)</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? "Save Changes" : "Create Project")}
            </Button>
            <Button variant="outline" onClick={() => onClose()} className="border-white/20 text-white">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Post Update Dialog ────────────────────────────────────────────────────────

function PostUpdateDialog({
  projectId,
  open,
  onClose,
}: {
  projectId: number;
  open: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageKey, setImageKey] = useState<string | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const uploadImage = trpc.projects.uploadBlockImage.useMutation({
    onSuccess: (data) => { setImageUrl(data.url); setImageKey(data.key); toast.success("Image attached!"); },
    onError: (e) => toast.error(e.message),
  });

  const handleImageFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const b64 = dataUrl.split(",")[1];
      uploadImage.mutate({ projectId, fileBase64: b64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined); setImageKey(undefined); setImagePreview(undefined);
    if (imageFileRef.current) imageFileRef.current.value = "";
  };

  const addUpdate = trpc.projects.addUpdate.useMutation({
    onSuccess: () => {
      toast.success("Update posted!");
      utils.projects.mine.invalidate();
      setTitle(""); setBody(""); setImageUrl(undefined); setImageKey(undefined); setImagePreview(undefined);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0d0d1a] border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Post Progress Update</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70 text-sm">Update Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Week 3 — Recording complete"
              className="mt-1 bg-white/5 border-white/10 text-white"
              maxLength={256}
            />
          </div>
          <div>
            <Label className="text-white/70 text-sm">Update *</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your progress with your supporters…"
              className="mt-1 bg-white/5 border-white/10 text-white resize-none"
              rows={5}
            />
          </div>
          {/* Photo attachment */}
          <div>
            <Label className="text-white/70 text-sm">Photo (optional)</Label>
            {imagePreview ? (
              <div className="mt-2 relative rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Update preview" className="w-full max-h-44 object-cover" />
                {uploadImage.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-6 h-6 animate-spin text-[#d4a017]" />
                  </div>
                )}
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => imageFileRef.current?.click()}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 transition-all py-4 text-white/40 hover:text-white/60 text-sm"
              >
                <ImageIcon className="w-4 h-4" /> Attach a photo
              </button>
            )}
            <input
              ref={imageFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => addUpdate.mutate({ projectId, title: title.trim() || undefined, body: body.trim(), imageUrl, imageKey })}
              disabled={addUpdate.isPending || !body.trim() || uploadImage.isPending}
              className="flex-1 bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold"
            >
              {addUpdate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post Update"}
            </Button>
            <Button variant="outline" onClick={onClose} className="border-white/20 text-white">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

type ProjectRow = {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  bannerUrl: string | null;
  videoUrl: string | null;
  videoType: string | null;
  goalAmountCents: number | null;
  raisedAmountCents: number;
  donorCount: number;
  linkedWitnessId: string | null;
  status: string;
  createdAt: Date;
};

function ProjectCard({ project }: { project: ProjectRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const utils = trpc.useUtils();
  const restoreToDraft = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.mine.invalidate();
      toast.success("Project restored to draft.");
    },
    onError: (e) => toast.error(e.message),
  });
  const pct = project.goalAmountCents
    ? Math.min(100, Math.round((project.raisedAmountCents / project.goalAmountCents) * 100))
    : null;

  return (
    <Card className="bg-white/[0.03] border-white/10 hover:border-white/20 transition-colors">
      {project.bannerUrl && (
        <div className="relative h-32 overflow-hidden rounded-t-lg">
          <img src={project.bannerUrl} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#DACAAA] to-transparent" />
        </div>
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{project.title}</h3>
            {project.tagline && (
              <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{project.tagline}</p>
            )}
          </div>
          <Badge variant="outline" className={`text-xs shrink-0 ${statusColor(project.status)}`}>
            {project.status}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <Heart className="w-3 h-3 text-[#d4a017]" />
            <span>{formatCents(project.raisedAmountCents)} raised</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <Users className="w-3 h-3 text-[#d4a017]" />
            <span>{project.donorCount} supporters</span>
          </div>
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>{pct}%</span>
              <span>Goal: {formatCents(project.goalAmountCents!)}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Link href={`/project/${project.slug}`}>
            <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:text-white text-xs">
              <Eye className="w-3 h-3 mr-1" /> View
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="border-white/20 text-white/70 hover:text-white text-xs"
            onClick={() => setEditOpen(true)}
          >
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#d4a017]/30 text-[#d4a017]/70 hover:text-[#d4a017] text-xs"
            onClick={() => setUpdateOpen(true)}
          >
            <Plus className="w-3 h-3 mr-1" /> Post Update
          </Button>
          {project.status === "archived" && (
            <Button
              size="sm"
              variant="outline"
              className="border-green-500/30 text-green-400/70 hover:text-green-400 text-xs"
              disabled={restoreToDraft.isPending}
              onClick={() => restoreToDraft.mutate({ id: project.id, status: "draft" })}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {restoreToDraft.isPending ? "Restoring…" : "Restore to Draft"}
            </Button>
          )}
        </div>
      </CardContent>

      <ProjectFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editProject={project as any}
      />
      <PostUpdateDialog
        projectId={project.id}
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
      />
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects, isLoading } = trpc.projects.mine.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#DACAAA] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#d4a017]" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#DACAAA] text-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Projects</h1>
            <p className="text-white/50 text-sm mt-1">
              Crowdfund your creative work — 10% platform fee, 100% transparent.
            </p>
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Project grid */}
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p as any} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <Heart className="w-8 h-8 text-[#d4a017]/40" />
            </div>
            <p className="text-white/40 text-center max-w-xs">
              You haven't created any projects yet. Start one to let your community support your next work.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        )}
      </div>

      <ProjectFormDialog
        open={createOpen}
        onClose={(refetch) => setCreateOpen(false)}
        editProject={null}
      />
    </div>
  );
}
