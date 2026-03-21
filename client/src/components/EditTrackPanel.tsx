import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Upload, Shield, Lock } from "lucide-react";
import { toast } from "sonner";

const GENRES = [
  "Gospel", "Hip-Hop", "R&B", "Electronic", "Rock", "Classical",
  "Jazz", "Ambient", "Pop", "Country", "Latin", "Metal", "Folk",
  "Soul", "Funk", "Reggae", "Blues", "Indie", "Alternative", "Other",
];

const AI_CONSENT_LABELS: Record<string, string> = {
  prohibited: "Original — AI Training Prohibited",
  permitted_attribution: "AI-Assisted — Attribution Required",
  permitted: "AI-Generated — Permitted",
};

const STATUS_LABELS: Record<string, string> = {
  Published: "Published — Visible to everyone",
  Draft: "Draft — Hidden from public",
  Unlisted: "Unlisted — Only via direct link",
  Deleted: "Deleted — Removed from platform",
};

const STATUS_COLORS: Record<string, string> = {
  Published: "#22c55e",
  Draft: "#f59e0b",
  Unlisted: "#a855f7",
  Deleted: "#ef4444",
};

interface Song {
  id: number;
  title: string;
  genre?: string | null;
  caption?: string | null;
  collectionTag?: string | null;
  coverArtUrl?: string | null;
  aiConsent?: string | null;
  status: string;
  witnessId?: string | null;
}

interface EditTrackPanelProps {
  song: Song;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTrackPanel({ song, onClose, onSaved }: EditTrackPanelProps) {
  const [caption, setCaption] = useState(song.caption ?? "");
  const [genre, setGenre] = useState(song.genre ?? "");
  const [collectionTag, setCollectionTag] = useState(song.collectionTag ?? "");
  const [coverArtUrl, setCoverArtUrl] = useState(song.coverArtUrl ?? "");
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">(
    (song.aiConsent as any) ?? "prohibited"
  );
  const [status, setStatus] = useState<"Draft" | "Published" | "Unlisted" | "Deleted">(
    (song.status as any) ?? "Published"
  );
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const updateMetadata = trpc.songs.updateMetadata.useMutation({
    onSuccess: () => {
      utils.songs.mySongs.invalidate();
      toast.success("Track updated");
      onSaved();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save changes");
      setSaving(false);
    },
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const uploadCoverArt = trpc.songs.uploadCoverArt.useMutation({
    onSuccess: (data) => {
      setCoverArtUrl(data.url);
      setCoverUploading(false);
      toast.success("Cover art updated");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Cover upload failed");
      setCoverUploading(false);
    },
  });

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Cover art must be under 5MB"); return; }
    setCoverUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadCoverArt.mutateAsync({
        songId: song.id,
        coverBase64: base64,
        coverMimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    await updateMetadata.mutateAsync({
      songId: song.id,
      caption: caption.trim() || null,
      genre: genre || null,
      collectionTag: collectionTag.trim() || null,
      coverArtUrl: coverArtUrl || null,
      aiConsent,
      status,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative ml-auto w-full max-w-md flex flex-col"
        style={{
          height: "100dvh",
          background: "linear-gradient(180deg, #0d1520 0%, #080d14 100%)",
          borderLeft: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.6)",
          minWidth: 0,
          overflowY: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 sticky top-0 z-10"
          style={{ background: "#0d1520", borderBottom: "1px solid rgba(212,175,55,0.15)" }}
        >
          <div>
            <h2 className="text-white font-semibold text-lg leading-tight">Edit Track</h2>
            <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>
              {song.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: "#94a3b8" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* WID immutability notice */}
        <div
          className="mx-4 sm:mx-6 mt-4 px-4 py-3 rounded-lg flex items-start gap-3"
          style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)" }}
        >
          <Lock size={16} style={{ color: "#D4AF37", marginTop: 2, flexShrink: 0 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#D4AF37" }}>WID IS IMMUTABLE</p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              Editing metadata never changes the cryptographic proof. The Witness ID{song.witnessId ? ` (${song.witnessId.slice(0, 12)}…)` : ""} is permanently locked.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 space-y-6" style={{ WebkitOverflowScrolling: "touch" }}>

          {/* Cover Art */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">Cover Art</Label>
            <div className="flex flex-col items-start gap-3">
              <div
                className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                style={{ border: "1px solid rgba(212,175,55,0.3)", background: "#0a0f1a" }}
              >
                {coverArtUrl ? (
                  <img src={coverArtUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Upload size={20} style={{ color: "#475569" }} />
                  </div>
                )}
              </div>
              <div className="w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={coverUploading}
                  className="w-full text-sm"
                  style={{ borderColor: "rgba(212,175,55,0.3)", color: "#D4AF37", background: "transparent" }}
                >
                  {coverUploading ? "Uploading…" : "Replace Cover Art"}
                </Button>
                <p className="text-xs mt-1.5" style={{ color: "#64748b" }}>JPG or PNG, max 5MB</p>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">Caption / Description</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption or description for this track…"
              maxLength={2000}
              rows={3}
              className="resize-none text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f1f5f9",
              }}
            />
            <p className="text-xs text-right" style={{ color: "#475569" }}>{caption.length}/2000</p>
          </div>

          {/* Genre */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">Genre</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger
                className="text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: genre ? "#f1f5f9" : "#64748b",
                }}
              >
                <SelectValue placeholder="Select genre…" />
              </SelectTrigger>
              <SelectContent style={{ background: "#0d1520", border: "1px solid rgba(212,175,55,0.2)" }}>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g} className="text-white hover:bg-white/10">
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collection Tag */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">Collection / Grouping Tag</Label>
            <Input
              value={collectionTag}
              onChange={(e) => setCollectionTag(e.target.value)}
              placeholder="e.g. Summer EP, Mixtape Vol. 1, Unreleased…"
              maxLength={128}
              className="text-sm"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f1f5f9",
              }}
            />
            <p className="text-xs" style={{ color: "#64748b" }}>Groups tracks together in your archive and creator profile.</p>
          </div>

          {/* AI Disclosure */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <Shield size={14} style={{ color: "#D4AF37" }} />
              AI Disclosure
            </Label>
            <Select value={aiConsent} onValueChange={(v) => setAiConsent(v as any)}>
              <SelectTrigger
                className="text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f1f5f9",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#0d1520", border: "1px solid rgba(212,175,55,0.2)" }}>
                <SelectItem value="prohibited" className="text-white hover:bg-white/10">
                  Original — AI Training Prohibited
                </SelectItem>
                <SelectItem value="permitted_attribution" className="text-white hover:bg-white/10">
                  AI-Assisted — Attribution Required
                </SelectItem>
                <SelectItem value="permitted" className="text-white hover:bg-white/10">
                  AI-Generated — Permitted
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visibility */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">Track Visibility</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger
                className="text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${STATUS_COLORS[status] ?? "rgba(255,255,255,0.12)"}40`,
                  color: STATUS_COLORS[status] ?? "#f1f5f9",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#0d1520", border: "1px solid rgba(212,175,55,0.2)" }}>
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val} className="text-white hover:bg-white/10">
                    <span style={{ color: STATUS_COLORS[val] }}>{label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-4 sm:px-6 py-4 flex gap-3"
          style={{
            background: "#0d1520",
            borderTop: "1px solid rgba(212,175,55,0.15)",
            paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          }}
        >
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8", background: "transparent" }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 font-semibold"
            onClick={handleSave}
            disabled={saving || coverUploading}
            style={{
              background: "linear-gradient(135deg, #D4AF37, #b8941f)",
              color: "#000",
              boxShadow: saving ? "none" : "0 0 16px rgba(212,175,55,0.4)",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
