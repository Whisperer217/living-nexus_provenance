/**
 * CollectionStudioPage
 *
 * Full album management studio. Accessible at /studio/collection/album/:id
 * Owner-only — redirects to home if the authenticated user does not own the collection.
 *
 * Panels:
 *  Left  — Cover art + metadata editor
 *  Center — Drag-and-drop track list (add / remove / replace)
 *  Right  — Version history log (collapsible on mobile)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
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
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  GripVertical,
  ImagePlus,
  Loader2,
  Music,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  History,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import type { Track as PlayerTrack } from "@/contexts/PlayerContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: number;
  title: string;
  genre?: string | null;
  coverArtUrl?: string | null;
  fileUrl?: string | null;
  witnessId?: string | null;
  durationSeconds?: number | null;
  trackOrder?: number | null;
  status?: string | null;
  contentType?: string | null;
}

// ─── Sortable Track Row ────────────────────────────────────────────────────────

function SortableTrackRow({
  track,
  index,
  onRemove,
  onReplace,
  isSaving,
}: {
  track: Track;
  index: number;
  onRemove: (id: number) => void;
  onReplace: (id: number) => void;
  isSaving: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const formatDuration = (secs?: number | null) => {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        isDragging
          ? "border-[var(--gold)] bg-[var(--void-2)] shadow-lg"
          : "border-border/40 bg-card/30 hover:border-border/70 hover:bg-card/50"
      }`}
    >
      {/* Drag handle */}
      <button
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Track number */}
      <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0 font-mono">
        {index + 1}
      </span>

      {/* Cover art */}
      <div className="w-10 h-10 rounded flex-shrink-0 overflow-hidden bg-muted/30">
        {track.coverArtUrl ? (
          <img
            src={track.coverArtUrl}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {track.genre && (
            <span className="text-xs text-muted-foreground">{track.genre}</span>
          )}
          {track.witnessId && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 border-[var(--gold)]/40 text-[var(--gold)] font-mono"
            >
              {track.witnessId}
            </Badge>
          )}
          {track.durationSeconds && (
            <span className="text-xs text-muted-foreground">
              {formatDuration(track.durationSeconds)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
          onClick={() => onReplace(track.id)}
          disabled={isSaving}
          title="Replace with another work"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(track.id)}
          disabled={isSaving}
          title="Remove from collection"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Track Picker Dialog ──────────────────────────────────────────────────────

function TrackPickerDialog({
  open,
  onClose,
  onSelect,
  title,
  description,
  collectionId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (songId: number) => void;
  title: string;
  description: string;
  collectionId: number;
}) {
  const [search, setSearch] = useState("");
  const { data: available = [], isLoading } = trpc.collectionStudio.getAvailableSongs.useQuery(
    { search: search || undefined },
    { enabled: open }
  );

  const filtered = search
    ? (available as Track[]).filter(
        (s) =>
          s.title?.toLowerCase().includes(search.toLowerCase()) ||
          s.genre?.toLowerCase().includes(search.toLowerCase())
      )
    : (available as Track[]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your archive…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <Separator />

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? "No works match your search." : "No available works found."}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((song) => (
                <button
                  key={song.id}
                  onClick={() => {
                    onSelect(song.id);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded flex-shrink-0 overflow-hidden bg-muted/30">
                    {song.coverArtUrl ? (
                      <img
                        src={song.coverArtUrl}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    {song.genre && (
                      <p className="text-xs text-muted-foreground">{song.genre}</p>
                    )}
                  </div>
                  {song.witnessId && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 border-[var(--gold)]/40 text-[var(--gold)] font-mono flex-shrink-0"
                    >
                      {song.witnessId}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Version History Panel ────────────────────────────────────────────────────

function VersionHistoryPanel({ collectionId }: { collectionId: number }) {
  const [expanded, setExpanded] = useState(true);
  const { data: history = [], isLoading } = trpc.collectionStudio.getVersionHistory.useQuery(
    { collectionId },
    { refetchInterval: 10_000 }
  );

  const eventLabel: Record<string, string> = {
    created: "Created",
    meta_updated: "Metadata updated",
    cover_updated: "Cover updated",
    track_added: "Track added",
    track_removed: "Track removed",
    track_replaced: "Track replaced",
    tracks_reordered: "Tracks reordered",
  };

  const eventColor: Record<string, string> = {
    created: "text-emerald-400",
    meta_updated: "text-blue-400",
    cover_updated: "text-purple-400",
    track_added: "text-emerald-400",
    track_removed: "text-red-400",
    track_replaced: "text-amber-400",
    tracks_reordered: "text-sky-400",
  };

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card/40 hover:bg-card/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--gold)]" />
          <span className="text-sm font-medium text-foreground">Version History</span>
          {(history as any[]).length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {(history as any[]).length}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (history as any[]).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No changes recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {(history as any[]).map((entry: any) => (
                <div key={entry.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium ${
                          eventColor[entry.eventType] ?? "text-foreground"
                        }`}
                      >
                        {eventLabel[entry.eventType] ?? entry.eventType}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <time className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CollectionStudioPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const collectionId = parseInt(id ?? "0", 10);

  // ── Data ──────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.collectionStudio.getCollection.useQuery(
    { collectionId },
    { enabled: !!user && collectionId > 0 }
  );

  // ── Local state ──────────────────────────────────────────────────────────
  const [tracks, setTracks] = useState<Track[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [coverMime, setCoverMime] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [metaDirty, setMetaDirty] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isSavingCover, setIsSavingCover] = useState(false);

  // Pickers
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<number | null>(null);

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
  const { playQueueAt } = usePlayer();

  const handlePlayAlbum = useCallback(() => {
    const playable = tracks.filter((t) => t.fileUrl);
    if (!playable.length) { toast.error("No playable tracks in this album."); return; }
    const col = (data?.collection as any);
    playQueueAt(playable.map((t) => ({
      id: String(t.id),
      title: t.title,
      artist: user?.artistHandle ?? user?.name ?? "Unknown",
      genre: t.genre ?? "",
      audioUrl: t.fileUrl ?? undefined,
      artUrl: t.coverArtUrl ?? undefined,
      witnessId: t.witnessId ?? undefined,
    } satisfies PlayerTrack)), 0, "PLAYLIST");
    toast.success(`Playing: ${col?.name ?? "Album"}`);
  }, [tracks, data, playQueueAt]);

  // ── Sync server data → local state ───────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const col = data.collection as any;
    setName(col.name ?? "");
    setDescription(col.description ?? "");
    setVisibility((col.visibility as any) ?? "public");
    setCoverPreview(col.coverArtUrl ?? null);
    setTracks((data.tracks as Track[]) ?? []);
    setMetaDirty(false);
    setOrderDirty(false);
  }, [data]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMeta = trpc.collectionStudio.updateMeta.useMutation({
    onSuccess: () => {
      utils.collectionStudio.getCollection.invalidate({ collectionId });
      utils.collectionStudio.getVersionHistory.invalidate({ collectionId });
      toast.success("Metadata saved.");
      setMetaDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadCover = trpc.collectionStudio.uploadCover.useMutation({
    onSuccess: (res) => {
      setCoverPreview((res as any).url);
      setCoverBase64(null);
      utils.collectionStudio.getCollection.invalidate({ collectionId });
      utils.collectionStudio.getVersionHistory.invalidate({ collectionId });
      toast.success("Cover art updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderTracks = trpc.collectionStudio.reorderTracks.useMutation({
    onSuccess: () => {
      utils.collectionStudio.getCollection.invalidate({ collectionId });
      utils.collectionStudio.getVersionHistory.invalidate({ collectionId });
      toast.success("Track order saved.");
      setOrderDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeTrack = trpc.collectionStudio.removeTrack.useMutation({
    onSuccess: () => {
      utils.collectionStudio.getCollection.invalidate({ collectionId });
      utils.collectionStudio.getVersionHistory.invalidate({ collectionId });
      toast.success("Track removed.");
    },
    onError: (e) => toast.error(e.message),
  });

  const addTrack = trpc.collectionStudio.addTrack.useMutation({
    onSuccess: () => {
      utils.collectionStudio.getCollection.invalidate({ collectionId });
      utils.collectionStudio.getVersionHistory.invalidate({ collectionId });
      toast.success("Track added to collection.");
    },
    onError: (e) => toast.error(e.message),
  });

  const replaceTrack = trpc.collectionStudio.replaceTrack.useMutation({
    onSuccess: () => {
      utils.collectionStudio.getCollection.invalidate({ collectionId });
      utils.collectionStudio.getVersionHistory.invalidate({ collectionId });
      toast.success("Track replaced.");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setTracks((prev) => {
        const oldIdx = prev.findIndex((t) => t.id === active.id);
        const newIdx = prev.findIndex((t) => t.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
      setOrderDirty(true);
    },
    []
  );

  // ── Cover art file input ──────────────────────────────────────────────────
  const handleCoverFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mime = file.type as "image/jpeg" | "image/png" | "image/webp";
    setCoverMime(mime);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      setCoverPreview(dataUrl);
      setCoverBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Save handlers ─────────────────────────────────────────────────────────
  const handleSaveMeta = async () => {
    setIsSavingMeta(true);
    try {
      await updateMeta.mutateAsync({ collectionId, name, description, visibility });
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleSaveCover = async () => {
    if (!coverBase64) return;
    setIsSavingCover(true);
    try {
      await uploadCover.mutateAsync({ collectionId, base64: coverBase64, mimeType: coverMime });
    } finally {
      setIsSavingCover(false);
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      await reorderTracks.mutateAsync({
        collectionId,
        orderedSongIds: tracks.map((t) => t.id),
      });
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    await removeTrack.mutateAsync({ collectionId, songId: removeTarget });
    setTracks((prev) => prev.filter((t) => t.id !== removeTarget));
    setRemoveTarget(null);
  };

  const handleAddTrack = async (songId: number) => {
    await addTrack.mutateAsync({ collectionId, songId });
  };

  const handleReplaceTrack = async (newSongId: number) => {
    if (!replaceTarget) return;
    await replaceTrack.mutateAsync({
      collectionId,
      oldSongId: replaceTarget,
      newSongId,
    });
    setReplaceTarget(null);
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to access the Collection Studio.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Collection not found or access denied.</p>
        <Button variant="outline" onClick={() => navigate("/archive?tab=collections")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Archive
        </Button>
      </div>
    );
  }

  const col = data.collection as any;
  const visibilityIcon =
    visibility === "public" ? (
      <Eye className="w-3.5 h-3.5" />
    ) : visibility === "unlisted" ? (
      <EyeOff className="w-3.5 h-3.5" />
    ) : (
      <Lock className="w-3.5 h-3.5" />
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/archive?tab=collections&collection=${collectionId}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Archive</span>
            </Link>
            <span className="text-muted-foreground/40 flex-shrink-0">/</span>
            <span className="text-sm font-medium truncate text-foreground">{col.name}</span>
            <Badge
              variant="outline"
              className="hidden sm:flex items-center gap-1 text-[10px] border-border/40 text-muted-foreground flex-shrink-0"
            >
              {visibilityIcon}
              {visibility}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handlePlayAlbum}
              disabled={tracks.filter((t) => t.fileUrl).length === 0}
              className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-black font-semibold"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Play Album</span>
            </Button>
            {(metaDirty || coverBase64) && (
              <span className="text-xs text-amber-400 hidden sm:inline">Unsaved changes</span>
            )}
            {orderDirty && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
                className="text-xs"
              >
                {isSavingOrder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span className="ml-1.5 hidden sm:inline">Save Order</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">

        {/* ── LEFT: Cover + Metadata ──────────────────────────────────── */}
        <div className="space-y-5">
          {/* Cover art */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Cover Art
            </label>
            <div
              className="relative aspect-square rounded-xl overflow-hidden bg-muted/20 border border-border/40 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Collection cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-xs">Upload cover art</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex flex-col items-center gap-1 text-white">
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs">Change cover</span>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverFile}
            />
            {coverBase64 && (
              <Button
                size="sm"
                className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold-glow)]"
                onClick={handleSaveCover}
                disabled={isSavingCover}
              >
                {isSavingCover ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                )}
                Save Cover
              </Button>
            )}
          </div>

          {/* Metadata form */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Metadata
            </label>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setMetaDirty(true); }}
                placeholder="Collection title"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setMetaDirty(true); }}
                placeholder="Describe this collection…"
                className="text-sm resize-none"
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Visibility</label>
              <Select
                value={visibility}
                onValueChange={(v) => {
                  setVisibility(v as any);
                  setMetaDirty(true);
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <span className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5" /> Public
                    </span>
                  </SelectItem>
                  <SelectItem value="unlisted">
                    <span className="flex items-center gap-2">
                      <EyeOff className="w-3.5 h-3.5" /> Unlisted
                    </span>
                  </SelectItem>
                  <SelectItem value="private">
                    <span className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" /> Private
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-[var(--gold)] text-black hover:bg-[var(--gold-glow)]"
              onClick={handleSaveMeta}
              disabled={!metaDirty || isSavingMeta}
            >
              {isSavingMeta ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Metadata
            </Button>
          </div>

          {/* Collection stats */}
          <div className="border border-border/30 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Stats
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tracks</span>
              <span className="font-medium">{tracks.length}</span>
            </div>
            {col.collectionWid && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">WID</span>
                <span className="font-mono text-[var(--gold)] text-xs">{col.collectionWid}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Track list ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Track List</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag rows to reorder. Changes are saved when you click "Save Order."
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddPickerOpen(true)}
              className="flex items-center gap-1.5 border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Work
            </Button>
          </div>

          {tracks.length === 0 ? (
            <div className="border border-dashed border-border/40 rounded-xl py-16 flex flex-col items-center gap-3 text-muted-foreground">
              <Music className="w-8 h-8 opacity-40" />
              <p className="text-sm">No tracks yet.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddPickerOpen(true)}
                className="mt-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add your first work
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={tracks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {tracks.map((track, index) => (
                    <SortableTrackRow
                      key={track.id}
                      track={track}
                      index={index}
                      onRemove={(id) => setRemoveTarget(id)}
                      onReplace={(id) => setReplaceTarget(id)}
                      isSaving={removeTrack.isPending || replaceTrack.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {orderDirty && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="text-xs text-amber-400">Track order has changed.</p>
              <Button
                size="sm"
                className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
              >
                {isSavingOrder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                Save Order
              </Button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Version history ──────────────────────────────────── */}
        <div className="space-y-4">
          <VersionHistoryPanel collectionId={collectionId} />
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}

      {/* Add track picker */}
      <TrackPickerDialog
        open={addPickerOpen}
        onClose={() => setAddPickerOpen(false)}
        onSelect={handleAddTrack}
        title="Add Work to Collection"
        description="Select a published work from your archive to add to this collection."
        collectionId={collectionId}
      />

      {/* Replace track picker */}
      <TrackPickerDialog
        open={replaceTarget !== null}
        onClose={() => setReplaceTarget(null)}
        onSelect={handleReplaceTrack}
        title="Replace Track"
        description="Select a work from your archive to replace the current track at this position."
        collectionId={collectionId}
      />

      {/* Remove confirm */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove track from collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the work from this collection only. The work itself remains intact in
              your archive and retains its WID and provenance record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
