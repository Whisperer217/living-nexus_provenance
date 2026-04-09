import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { ImagePositioner } from "@/components/ImagePositioner";
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
import { X, Upload, Shield, Lock, Download, FileText, Video, BookOpen, RotateCcw, History, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const GENRES = [
  "Gospel", "Hip-Hop", "R&B", "Electronic", "Rock", "Classical",
  "Jazz", "Ambient", "Pop", "Country", "Latin", "Metal", "Folk",
  "Soul", "Funk", "Reggae", "Blues", "Indie", "Alternative", "Other",
];

const AI_CONSENT_LABELS: Record<string, string> = {
  prohibited: "Human-Made — No AI Training",
  permitted_attribution: "AI-Assisted — Attribution Required",
  permitted: "AI-Generated — Open Training",
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
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  aiConsent?: string | null;
  status: string;
  witnessId?: string | null;
  downloadPermission?: string | null;
  downloadTipThresholdCents?: number | null;
  lyricsText?: string | null;
  lyricsWid?: string | null;
  lyricsFileName?: string | null;
  lyricsAddedAt?: Date | string | null;
  videoUrl?: string | null;
  videoWitnessId?: string | null;
  creditsJson?: string | null;
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
  const [coverPos, setCoverPos] = useState({ x: song.coverPositionX ?? 50, y: song.coverPositionY ?? 50 });
  const [showCoverPositioner, setShowCoverPositioner] = useState(false);
  const [pendingCoverUrl, setPendingCoverUrl] = useState<string | null>(null);
  const [aiConsent, setAiConsent] = useState<"prohibited" | "permitted_attribution" | "permitted">(
    (song.aiConsent as any) ?? "prohibited"
  );
  const [status, setStatus] = useState<"Draft" | "Published" | "Unlisted" | "Deleted">(
    (song.status as any) ?? "Published"
  );
  const [coverUploading, setCoverUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadPermission, setDownloadPermission] = useState<"none" | "free" | "tipped">(
    (song.downloadPermission as any) ?? "none"
  );
  const [tipThresholdCents, setTipThresholdCents] = useState<number>(
    song.downloadTipThresholdCents ?? 179
  );
  // String state for the input field so backspace / free-form typing works
  const [tipThresholdInput, setTipThresholdInput] = useState<string>(
    ((song.downloadTipThresholdCents ?? 179) / 100).toFixed(2)
  );
  const [dlSaving, setDlSaving] = useState(false);
  const [lyrics, setLyrics] = useState(song.lyricsText ?? "");
  const [lyricsSaving, setLyricsSaving] = useState(false);
  const [lyricsFile, setLyricsFile] = useState<File | null>(null);
  const [lyricsWid, setLyricsWid] = useState<string | null>(song.lyricsWid ?? null);
  const [lyricsFileName, setLyricsFileName] = useState<string | null>(song.lyricsFileName ?? null);
  const [lyricsAddedAt, setLyricsAddedAt] = useState<Date | string | null>(song.lyricsAddedAt ?? null);
  const [lyricsWidLoading, setLyricsWidLoading] = useState(false);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(song.videoUrl ?? null);
  const [currentVideoWid, setCurrentVideoWid] = useState<string | null>(song.videoWitnessId ?? null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Replace Audio state
  const [replaceAudioFile, setReplaceAudioFile] = useState<File | null>(null);
  const [replaceAudioNote, setReplaceAudioNote] = useState("");
  const [replaceAudioLoading, setReplaceAudioLoading] = useState(false);
  const [currentWitnessId, setCurrentWitnessId] = useState<string | null>(song.witnessId ?? null);
  const replaceAudioInputRef = useRef<HTMLInputElement>(null);

  // Credits state
  type CreditEntry = { role: string; name: string };
  const parseCredits = (json: string | null | undefined): CreditEntry[] => {
    if (!json) return [];
    try { return JSON.parse(json); } catch { return []; }
  };
  const [credits, setCredits] = useState<CreditEntry[]>(() => parseCredits(song.creditsJson));

  const utils = trpc.useUtils();
  const updateDownloadPermission = trpc.songDownload.updatePermission.useMutation({
    onSuccess: () => {
      toast.success("Download permission updated");
      utils.songs.mySongs.invalidate();
      setDlSaving(false);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to update download permission");
      setDlSaving(false);
    },
  });

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

  // Separate mutation for position-only saves — does NOT close the panel
  const saveCoverPositionMutation = trpc.songs.updateMetadata.useMutation({
    onSuccess: () => {
      utils.songs.mySongs.invalidate();
      toast.success("Cover position saved");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save position");
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

  const uploadVideoMutation = trpc.songs.uploadVideo.useMutation({
    onSuccess: (data: any) => {
      setCurrentVideoUrl(data.videoUrl);
      setCurrentVideoWid(data.videoWitnessId);
      setVideoFile(null);
      setVideoUploading(false);
      toast.success("Music video uploaded and witnessed!");
      utils.songs.mySongs.invalidate();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Video upload failed");
      setVideoUploading(false);
    },
  });

  async function handleVideoUpload() {
    if (!videoFile) return;
    setVideoUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      // Compute SHA-256 witness for the video file
      const videoBuf = await videoFile.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", videoBuf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      const videoWitnessId = `WID-VID-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;
      await uploadVideoMutation.mutateAsync({
        songId: song.id,
        videoBase64: base64,
        videoMimeType: videoFile.type || "video/mp4",
        videoFileName: videoFile.name,
        videoWitnessId,
      });
    };
    reader.readAsDataURL(videoFile);
  }

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
    // Show local preview for repositioning before uploading
    const objectUrl = URL.createObjectURL(file);
    setPendingCoverUrl(objectUrl);
    setShowCoverPositioner(true);
    (coverInputRef.current as any)._pendingFile = file;
  }
  async function confirmCoverUpload(pos: { x: number; y: number }) {
    const file = (coverInputRef.current as any)?._pendingFile as File | undefined;
    if (!file) return;
    setCoverPos(pos);
    setShowCoverPositioner(false);
    setCoverUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadCoverArt.mutateAsync({
        songId: song.id,
        coverBase64: base64,
        coverMimeType: file.type,
      });
      // Also save the position (use position-only mutation so panel stays open)
      await saveCoverPositionMutation.mutateAsync({
        songId: song.id,
        coverPositionX: pos.x,
        coverPositionY: pos.y,
      });
    };
    reader.readAsDataURL(file);
    if (pendingCoverUrl) URL.revokeObjectURL(pendingCoverUrl);
    setPendingCoverUrl(null);
  }
  async function saveCoverPosition(pos: { x: number; y: number }) {
    setCoverPos(pos);
    setShowCoverPositioner(false);
    await saveCoverPositionMutation.mutateAsync({
      songId: song.id,
      coverPositionX: pos.x,
      coverPositionY: pos.y,
    });
  }

  async function handleSave() {
    setSaving(true);
    const validCredits = credits.filter(c => c.role.trim() || c.name.trim());
    await updateMetadata.mutateAsync({
      songId: song.id,
      caption: caption.trim() || null,
      genre: genre || null,
      collectionTag: collectionTag.trim() || null,
      coverArtUrl: coverArtUrl || null,
      aiConsent,
      status,
      creditsJson: validCredits.length > 0 ? JSON.stringify(validCredits) : null,
    });
    setSaving(false);
  }

  const addLyricsWithWid = trpc.songs.addLyricsWithWid.useMutation({
    onSuccess: (data: { lyricsWid: string; lyricsAddedAt: Date }) => {
      setLyricsWid(data.lyricsWid);
      setLyricsAddedAt(data.lyricsAddedAt);
      setLyricsFile(null);
      setLyricsWidLoading(false);
      toast.success("Lyrics witnessed — WID-LYR generated!");
      utils.songs.mySongs.invalidate();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to witness lyrics");
      setLyricsWidLoading(false);
    },
  });

  async function handleWitnessLyrics() {
    if (!lyricsFile) return;
    setLyricsWidLoading(true);
    try {
      // Read file as text
      const text = await lyricsFile.text();
      // Compute SHA-256 of the raw file bytes
      const buf = await lyricsFile.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      setLyricsFileName(lyricsFile.name);
      await addLyricsWithWid.mutateAsync({
        songId: song.id,
        lyricsText: text,
        lyricsFileName: lyricsFile.name,
        lyricsFileHash: hashHex,
      });
    } catch (e: any) {
      toast.error(e?.message || "Failed to read lyrics file");
      setLyricsWidLoading(false);
    }
  }

  const updateLyrics = trpc.songs.updateLyrics.useMutation({
    onSuccess: () => {
      toast.success("Lyrics saved");
      utils.songs.mySongs.invalidate();
      setLyricsSaving(false);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save lyrics");
      setLyricsSaving(false);
    },
  });

  async function handleSaveLyrics() {
    setLyricsSaving(true);
    await updateLyrics.mutateAsync({ songId: song.id, lyricsText: lyrics });
  }

  const replaceAudioMutation = trpc.songs.replaceAudio.useMutation({
    onSuccess: (data: { fileUrl: string; witnessId: string }) => {
      setCurrentWitnessId(data.witnessId);
      setReplaceAudioFile(null);
      setReplaceAudioNote("");
      setReplaceAudioLoading(false);
      toast.success("Audio replaced — new WID-MUS generated!");
      utils.songs.mySongs.invalidate();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to replace audio");
      setReplaceAudioLoading(false);
    },
  });

  const { data: audioVersions } = trpc.songs.getAudioVersions.useQuery(
    { songId: song.id },
    { staleTime: 30_000 }
  );

  async function handleReplaceAudio() {
    if (!replaceAudioFile) return;
    setReplaceAudioLoading(true);
    try {
      const buf = await replaceAudioFile.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await replaceAudioMutation.mutateAsync({
          songId: song.id,
          audioBase64: base64,
          audioMimeType: replaceAudioFile.type || "audio/mpeg",
          audioFileName: replaceAudioFile.name,
          fileHash: hashHex,
          versionNote: replaceAudioNote.trim() || undefined,
        });
      };
      reader.readAsDataURL(replaceAudioFile);
    } catch (e: any) {
      toast.error(e?.message || "Failed to read audio file");
      setReplaceAudioLoading(false);
    }
  }

  async function handleSaveDownloadPermission() {
    setDlSaving(true);
    await updateDownloadPermission.mutateAsync({
      songId: song.id,
      permission: downloadPermission,
      tipThresholdCents,
    });
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
                className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 group relative cursor-pointer"
                style={{ border: "1px solid rgba(212,175,55,0.3)", background: "#0a0f1a" }}
                onClick={() => coverArtUrl && setShowCoverPositioner(true)}
              >
                {coverArtUrl ? (
                  <>
                    <img
                      src={coverArtUrl}
                      alt="Cover"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `${coverPos.x}% ${coverPos.y}%` }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[9px] font-medium">Reposition</span>
                    </div>
                  </>
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
                <p className="text-xs mt-1.5" style={{ color: "#64748b" }}>JPG or PNG, max 5MB • Click cover to reposition</p>
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
          {/* Cover Art inline repositioner — direct manipulation: drag, scroll, double-click, keyboard */}
          {showCoverPositioner && (pendingCoverUrl || coverArtUrl) && (
            <ImagePositioner
              imageUrl={(pendingCoverUrl || coverArtUrl)!}
              initialX={coverPos.x}
              initialY={coverPos.y}
              initialZoom={110}
              previewHeight="12rem"
              roundedTop={true}
              label={pendingCoverUrl ? "Set Cover Position" : "Reposition Cover Art"}
              onSave={pendingCoverUrl ? confirmCoverUpload : saveCoverPosition}
              onCancel={() => {
                setShowCoverPositioner(false);
                if (pendingCoverUrl) { URL.revokeObjectURL(pendingCoverUrl); setPendingCoverUrl(null); }
              }}
            />
          )}

          {/* Caption */}
          <div className="space-y-2.5">
            <Label className="text-white text-sm font-medium">Caption / Description</Label>
            <Textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                // Auto-grow height
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${t.scrollHeight}px`;
              }}
              placeholder="Add a caption or description for this track…"
              maxLength={2000}
              rows={3}
              className="resize-none text-sm overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f1f5f9",
                minHeight: "4.5rem",
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
                  Human-Made — No AI Training
                </SelectItem>
                <SelectItem value="permitted_attribution" className="text-white hover:bg-white/10">
                  AI-Assisted — Attribution Required
                </SelectItem>
                <SelectItem value="permitted" className="text-white hover:bg-white/10">
                  AI-Generated — Open Training
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

          {/* ── Download Permission ─────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <Download size={14} style={{ color: "#60a5fa" }} />
              Download Permission
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Controls whether fans can download this track. Defaults to <strong style={{ color: "#94a3b8" }}>off</strong> on every upload.
            </p>

            {/* Three option buttons */}
            <div className="flex flex-col gap-2">
              {([
                { value: "none",   label: "No Download",           desc: "Fans cannot download this track.",                         color: "#ef4444" },
                { value: "free",   label: "Free Download",          desc: "Anyone can download at no cost.",                         color: "#22c55e" },
                { value: "tipped", label: "Gift-Gated Download",     desc: `Unlock after gifting $${(tipThresholdCents / 100).toFixed(2)}.`, color: "#f59e0b" },
              ] as const).map(({ value, label, desc, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDownloadPermission(value)}
                  className="w-full text-left rounded-lg px-3 py-2.5 transition-all"
                  style={{
                    background: downloadPermission === value ? `${color}18` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${downloadPermission === value ? color : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: downloadPermission === value ? color : "#f1f5f9" }}>
                    {label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{desc}</p>
                </button>
              ))}
            </div>

            {/* Tip threshold input — only shown when tipped is selected */}
            {downloadPermission === "tipped" && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs" style={{ color: "#94a3b8" }}>Minimum gift to unlock (cents)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "#64748b" }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="1.79"
                    value={tipThresholdInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTipThresholdInput(raw);
                      const dollars = parseFloat(raw);
                      if (!isNaN(dollars) && dollars >= 0.5) {
                        setTipThresholdCents(Math.round(dollars * 100));
                      }
                    }}
                    onBlur={() => {
                      // Normalise display on blur
                      const dollars = parseFloat(tipThresholdInput);
                      if (!isNaN(dollars) && dollars >= 0.5) {
                        setTipThresholdInput((Math.round(dollars * 100) / 100).toFixed(2));
                      } else {
                        setTipThresholdInput((tipThresholdCents / 100).toFixed(2));
                      }
                    }}
                    className="flex-1 rounded-md px-3 py-1.5 text-sm"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#f1f5f9",
                      outline: "none",
                    }}
                  />
                </div>
                <p className="text-xs" style={{ color: "#64748b" }}>Minimum $0.50 · Default $1.79 per track</p>
              </div>
            )}

            {/* Save download permission button */}
            <Button
              size="sm"
              onClick={handleSaveDownloadPermission}
              disabled={dlSaving}
              className="w-full text-sm font-semibold"
              style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}
            >
              {dlSaving ? "Saving…" : "Save Download Setting"}
            </Button>
          </div>

          {/* ── Lyrics Editor ──────────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <FileText size={14} style={{ color: "#D4AF37" }} />
              Lyrics
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Add or update the lyrics for this track. Lyrics are displayed in the Now Playing panel and serve as a timestamped record of your words.
            </p>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste or type your lyrics here…"
              rows={10}
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-y"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,175,55,0.2)",
                color: "#e2e8f0",
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                lineHeight: "1.8",
                minHeight: "160px",
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#475569" }}>
                {lyrics.length} / 10,000 characters
              </span>
              <Button
                size="sm"
                onClick={handleSaveLyrics}
                disabled={lyricsSaving}
                className="text-sm font-semibold"
                style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.3)" }}
              >
                {lyricsSaving ? "Saving…" : "Save Lyrics"}
              </Button>
            </div>
          </div>

          {/* ── Lyrics WID (WID-LYR) ─────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <BookOpen size={14} style={{ color: "#D4AF37" }} />
              Lyrics Witness ID <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}>WID-LYR</span>
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Upload your lyrics as a <strong style={{ color: "#94a3b8" }}>.txt</strong> file to generate a cryptographic Witness ID (WID-LYR) — a separate provenance proof for your words, independent of the audio WID.
            </p>

            {/* Existing WID-LYR badge */}
            {lyricsWid && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
                  style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37" }}>
                  <span>🔐</span>
                  <span className="flex-1 break-all">{lyricsWid}</span>
                </div>
                {lyricsFileName && (
                  <p className="text-xs" style={{ color: "#475569" }}>File: {lyricsFileName}{lyricsAddedAt ? ` · ${new Date(lyricsAddedAt).toLocaleDateString()}` : ""}</p>
                )}
              </div>
            )}

            {/* File drop zone */}
            <div
              onClick={() => lyricsFileInputRef.current?.click()}
              className="rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-white/5"
              style={{
                border: `2px dashed ${lyricsFile ? "#D4AF37" : "rgba(212,175,55,0.2)"}`,
                background: lyricsFile ? "rgba(212,175,55,0.05)" : "transparent",
              }}
            >
              <input
                ref={lyricsFileInputRef}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 500 * 1024) { toast.error("Lyrics file must be under 500 KB"); e.target.value = ""; return; }
                  setLyricsFile(f);
                }}
              />
              {lyricsFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={14} style={{ color: "#D4AF37" }} />
                  <span className="text-sm" style={{ color: "#D4AF37" }}>{lyricsFile.name}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>({(lyricsFile.size / 1024).toFixed(1)} KB)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setLyricsFile(null); }} className="text-xs hover:underline ml-1" style={{ color: "#94a3b8" }}>Remove</button>
                </div>
              ) : (
                <>
                  <BookOpen size={20} className="mx-auto mb-1" style={{ color: "#D4AF37", opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{lyricsWid ? "Replace lyrics file" : "Upload lyrics .txt file"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>.txt — max 500 KB</p>
                </>
              )}
            </div>

            {lyricsFile && (
              <Button
                size="sm"
                onClick={handleWitnessLyrics}
                disabled={lyricsWidLoading}
                className="w-full text-sm font-semibold"
                style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.4)" }}
              >
                {lyricsWidLoading ? "Witnessing…" : "Witness Lyrics & Generate WID-LYR"}
              </Button>
            )}
          </div>

          {/* ── Replace Audio (Version History) ──────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.18)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <RotateCcw size={14} style={{ color: "#D4AF37" }} />
              Replace Audio
              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(212,175,55,0.12)", color: "#D4AF37" }}>WID-MUS</span>
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Upload a new master or mix. The current audio is archived with its WID-MUS intact — nothing is lost. A new Witness ID is generated for the replacement.
            </p>

            {/* Current WID badge */}
            {currentWitnessId && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
                style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", color: "#D4AF37" }}>
                <span>🔐</span>
                <span className="flex-1 break-all">Current: {currentWitnessId}</span>
              </div>
            )}

            {/* Version history */}
            {audioVersions && audioVersions.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                  <History size={12} />
                  <span>{audioVersions.length} archived version{audioVersions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {audioVersions.map((v: any, i: number) => (
                    <div key={v.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: "#475569" }}>v{audioVersions.length - i}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono truncate" style={{ color: "#64748b" }}>{v.witnessId}</p>
                        {v.versionNote && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{v.versionNote}</p>}
                        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{new Date(v.replacedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version note */}
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: "#94a3b8" }}>Version note (optional)</Label>
              <input
                type="text"
                placeholder="e.g. Rough mix, Final master, Radio edit…"
                value={replaceAudioNote}
                onChange={e => setReplaceAudioNote(e.target.value)}
                maxLength={255}
                className="w-full rounded-md px-3 py-1.5 text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(212,175,55,0.2)",
                  color: "#f1f5f9",
                  outline: "none",
                }}
              />
            </div>

            {/* File drop zone */}
            <div
              onClick={() => replaceAudioInputRef.current?.click()}
              className="rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-white/5"
              style={{
                border: `2px dashed ${replaceAudioFile ? "#D4AF37" : "rgba(212,175,55,0.2)"}`,
                background: replaceAudioFile ? "rgba(212,175,55,0.05)" : "transparent",
              }}
            >
              <input
                ref={replaceAudioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 200 * 1024 * 1024) { toast.error(`File too large (${(f.size/1024/1024).toFixed(0)} MB). Max 200 MB.`); e.target.value = ""; return; }
                  setReplaceAudioFile(f);
                }}
              />
              {replaceAudioFile ? (
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw size={14} style={{ color: "#D4AF37" }} />
                  <span className="text-sm" style={{ color: "#D4AF37" }}>{replaceAudioFile.name}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>({(replaceAudioFile.size/1024/1024).toFixed(1)} MB)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setReplaceAudioFile(null); }} className="text-xs hover:underline ml-1" style={{ color: "#94a3b8" }}>Remove</button>
                </div>
              ) : (
                <>
                  <RotateCcw size={20} className="mx-auto mb-1" style={{ color: "#D4AF37", opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: "#94a3b8" }}>Upload replacement audio file</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>MP3, WAV, FLAC, AAC — max 200 MB</p>
                </>
              )}
            </div>

            {replaceAudioFile && (
              <Button
                size="sm"
                onClick={handleReplaceAudio}
                disabled={replaceAudioLoading}
                className="w-full text-sm font-semibold"
                style={{ background: "rgba(212,175,55,0.15)", color: "#D4AF37", border: "1px solid rgba(212,175,55,0.4)" }}
              >
                {replaceAudioLoading ? "Replacing & Witnessing…" : "Replace Audio & Generate New WID-MUS"}
              </Button>
            )}
          </div>

          {/* ── Music Video Upload ──────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="space-y-3 rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Label className="text-white text-sm font-medium flex items-center gap-2">
              <Video size={14} style={{ color: "oklch(0.65 0.18 200)" }} />
              Music Video
            </Label>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Attach a music video to this track. The video gets its own Witness ID alongside the audio. MP4 or MOV, max 500 MB.
            </p>

            {/* Current video preview */}
            {currentVideoUrl && (
              <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "16/9", background: "#0a0f1a" }}>
                <video src={currentVideoUrl} className="w-full h-full object-contain" controls playsInline />
              </div>
            )}

            {/* Current video WID */}
            {currentVideoWid && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                style={{ background: "oklch(0.65 0.18 200 / 0.08)", border: "1px solid oklch(0.65 0.18 200 / 0.25)", color: "oklch(0.65 0.18 200)" }}>
                🔐 Video WID: {currentVideoWid}
              </div>
            )}

            {/* File picker */}
            <div
              onClick={() => videoInputRef.current?.click()}
              className="rounded-xl p-4 text-center cursor-pointer transition-all hover:bg-white/5"
              style={{
                border: `2px dashed ${videoFile ? "oklch(0.65 0.18 200)" : "rgba(255,255,255,0.12)"}`,
                background: videoFile ? "oklch(0.65 0.18 200 / 0.05)" : "transparent",
              }}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/mov,.mp4,.mov"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 500 * 1024 * 1024) { toast.error(`Video too large (${(f.size/1024/1024).toFixed(0)} MB). Max 500 MB.`); e.target.value = ""; return; }
                  setVideoFile(f);
                }}
              />
              {videoFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Video size={14} style={{ color: "oklch(0.65 0.18 200)" }} />
                  <span className="text-sm" style={{ color: "oklch(0.65 0.18 200)" }}>{videoFile.name}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>({(videoFile.size/1024/1024).toFixed(1)} MB)</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setVideoFile(null); }} className="text-xs hover:underline ml-1" style={{ color: "#94a3b8" }}>Remove</button>
                </div>
              ) : (
                <>
                  <Video size={20} className="mx-auto mb-1" style={{ color: "oklch(0.65 0.18 200)", opacity: 0.4 }} />
                  <p className="text-sm" style={{ color: "#94a3b8" }}>{currentVideoUrl ? "Replace video" : "Upload music video"}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>MP4, MOV — max 500 MB</p>
                </>
              )}
            </div>

            {videoFile && (
              <Button
                size="sm"
                onClick={handleVideoUpload}
                disabled={videoUploading}
                className="w-full text-sm font-semibold"
                style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "oklch(0.65 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}
              >
                {videoUploading ? "Uploading video…" : "Upload & Witness Video"}
              </Button>
            )}
          </div>

          {/* ── Credits ──────────────────────────────────────────────────────────────────────────────────────────── */}
          <div
            className="rounded-xl p-4 sm:p-5"
            style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "#D4AF37" }}>Credits</h3>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Add producers, engineers, co-writers, and featured artists.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                style={{ borderColor: "rgba(212,175,55,0.3)", color: "#D4AF37", background: "transparent" }}
                onClick={() => setCredits(prev => [...prev, { role: "", name: "" }])}
              >
                <Plus size={12} /> Add
              </Button>
            </div>
            {credits.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: "#475569" }}>No credits yet. Hit Add to give collaborators recognition.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {credits.map((c, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Role (e.g. Producer)"
                      value={c.role}
                      onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                      className="flex-1 h-8 text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                    />
                    <Input
                      placeholder="Name"
                      value={c.name}
                      onChange={e => setCredits(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="flex-1 h-8 text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
                    />
                    <button
                      onClick={() => setCredits(prev => prev.filter((_, j) => j !== i))}
                      className="p-1 rounded hover:bg-red-900/30 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={13} style={{ color: "#ef4444" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs mt-2" style={{ color: "#475569" }}>Credits are saved when you click Save Changes below.</p>
          </div>

        </div>{/* end Form */}

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
