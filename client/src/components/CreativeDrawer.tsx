/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  CREATIVE CHAPEL — Living Nexus                                         ║
  ║  A sacred edit experience for creators. Tending to testimony.           ║
  ║                                                                         ║
  ║  FREEZE FIX v3 (permanent):                                             ║
  ║  • overlayController REMOVED — was causing body.overflow reflow cascade ║
  ║  • Scroll-lock targets .player-scroll-area div (not body)               ║
  ║  • Mobile fallback: locks body.overflow if div not found                ║
  ║  • Backdrop uses onPointerDown + target===currentTarget guard           ║
  ║  • 120ms backdropActive delay prevents same-click-close                 ║
  ║  • drawerContainerEl state (not ref) ensures Radix portals get          ║
  ║    live DOM node — fixes dropdown-behind-drawer on all devices          ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  X, Upload, Loader2, CheckCircle2, AlertCircle, Trash2,
  Music, Flame, BookOpen, Shield, ChevronDown, ChevronUp,
  ImageIcon, Eye, Video, Sparkles, Hash, FileText,
  ExternalLink, Plus, Pencil, Download,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface CreativeDrawerSong {
  id: number;
  title: string;
  genre?: string | null;
  caption?: string | null;
  description?: string | null;
  coverArtUrl?: string | null;
  aiConsent?: string | null;
  status: string;
  lyricsText?: string | null;
  haaiOriginStory?: string | null;
  externalLinksJson?: string | null;
  aiDisclosure?: string | null;
  contentType?: string | null;
  releaseDate?: string | null;
  witnessId?: string | null;
  videoUrl?: string | null;
  videoWitnessId?: string | null;
  downloadPermission?: string | null;
  downloadTipThresholdCents?: number | null;
}

interface CreativeDrawerProps {
  song: CreativeDrawerSong;
  onClose: () => void;
  onSaved: () => void;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const GENRES = [
  "Hip-Hop", "R&B / Soul", "Gospel / Worship", "Jazz", "Blues",
  "Rock", "Alternative", "Electronic / EDM", "Pop", "Folk / Acoustic",
  "Classical", "Spoken Word / Poetry", "Ambient", "Cinematic / Score",
  "World / Cultural", "Experimental", "Other",
];

const STATUS_OPTIONS = [
  { value: "Published", label: "Published", desc: "Visible to everyone",  color: "#22c55e" },
  { value: "Draft",     label: "Draft",     desc: "Hidden from public",    color: "#f59e0b" },
  { value: "Unlisted",  label: "Unlisted",  desc: "Only via direct link",  color: "#a855f7" },
];

const DISCLOSURE_OPTIONS = [
  { value: "original",                     label: "Human-Made — Original Work",           icon: "🕊️" },
  { value: "human_authored_ai_instrument", label: "Human-Authored, AI as Instrument",     icon: "🎹" },
  { value: "ai_assisted",                  label: "AI-Assisted — Human Direction",        icon: "🤝" },
  { value: "ai_generated",                 label: "AI-Generated",                         icon: "🤖" },
];

const AI_CONSENT_OPTIONS = [
  { value: "prohibited",            label: "No AI Training",        desc: "Human-Made — prohibit all AI training use" },
  { value: "permitted_attribution", label: "Attribution Required",  desc: "AI-Assisted — training permitted with credit" },
  { value: "permitted",             label: "Open Training",         desc: "AI-Assisted Manifestation — open training" },
];

/* ─── Design Tokens ──────────────────────────────────────────────────────── */

const GOLD        = "#D4AF37";
const GOLD_BRIGHT = "#E8C84A";
const GOLD_DIM    = "rgba(212,175,55,0.14)";
const GOLD_BORDER = "rgba(212,175,55,0.26)";
const GOLD_GLOW   = "rgba(212,175,55,0.07)";
const SURFACE     = "rgba(6,4,14,0.99)";
const SURFACE2    = "rgba(14,10,26,0.97)";
const SURFACE3    = "rgba(20,14,36,0.95)";
const TEXT_MUTED  = "rgba(255,255,255,0.40)";
const TEXT_DIM    = "rgba(255,255,255,0.24)";

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionDivider({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-9">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.28))" }} />
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: GOLD, opacity: 0.65 }}>{icon}</span>}
        <span className="text-xs tracking-[0.26em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.28), transparent)" }} />
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5">
      <Label className="text-xs tracking-[0.16em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
        {children}
      </Label>
      {hint && <p className="text-xs mt-1 leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>}
    </div>
  );
}

/* Sacred pulsing ring — used behind cover art when no art is present */
function RelicRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 60 + i * 44,
            height: 60 + i * 44,
            border: `1px solid rgba(212,175,55,${0.18 - i * 0.04})`,
            animation: `pulse ${2.4 + i * 0.6}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function CreativeDrawer({ song, onClose, onSaved }: CreativeDrawerProps) {
  const utils = trpc.useUtils();

  /* ── Form state ── */
  const [title, setTitle]               = useState(song.title ?? "");
  const [genre, setGenre]               = useState(song.genre ?? "");
  const [caption, setCaption]           = useState(song.caption ?? "");
  const [description, setDescription]   = useState(song.description ?? "");
  const [status, setStatus]             = useState<string>(song.status ?? "Published");
  const [aiConsent, setAiConsent]       = useState<string>(song.aiConsent ?? "prohibited");
  const [aiDisclosure, setAiDisclosure] = useState<string>(song.aiDisclosure ?? "original");
  const [originStory, setOriginStory]   = useState(song.haaiOriginStory ?? "");

  const parseLinks = (raw?: string | null): Array<{ platform: string; url: string }> => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };
  const [extLinks, setExtLinks] = useState<Array<{ platform: string; url: string }>>(
    parseLinks(song.externalLinksJson)
  );
  const addExtLink    = () => setExtLinks(prev => [...prev, { platform: "", url: "" }]);
  const removeExtLink = (i: number) => setExtLinks(prev => prev.filter((_, idx) => idx !== i));
  const updateExtLink = (i: number, key: "platform" | "url", val: string) =>
    setExtLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

  const [lyrics, setLyrics]             = useState(song.lyricsText ?? "");
  const [creationDate, setCreationDate] = useState(
    song.releaseDate ? song.releaseDate.slice(0, 10) : ""
  );

  /* ── Download Settings ── */
  const [downloadPermission, setDownloadPermission] = useState<"none" | "free" | "tipped">(
    (song.downloadPermission as "none" | "free" | "tipped") ?? "none"
  );
  const [tipThresholdCents, setTipThresholdCents] = useState<number>(
    song.downloadTipThresholdCents ?? 179
  );
  const [tipThresholdInput, setTipThresholdInput] = useState<string>(
    ((song.downloadTipThresholdCents ?? 179) / 100).toFixed(2)
  );

  /* ── Cover art ── */
  const [coverUrl, setCoverUrl]             = useState(song.coverArtUrl ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverHovered, setCoverHovered]     = useState(false);
  const coverInputRef                       = useRef<HTMLInputElement>(null);

  /* ── Video ── */
  const [videoUrl, setVideoUrl]             = useState(song.videoUrl ?? "");
  const [videoWid, setVideoWid]             = useState(song.videoWitnessId ?? "");
  const [videoFile, setVideoFile]           = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const videoInputRef                       = useRef<HTMLInputElement>(null);

  /* ── Drawer container ref — used for Radix portal targeting ── */
  const drawerRootRef                                       = useRef<HTMLDivElement>(null);
  const [drawerContainerEl, setDrawerContainerEl]           = useState<HTMLDivElement | null>(null);

  /* ── AI Caption ── */
  const [captionGenerating, setCaptionGenerating] = useState(false);

  /* ── UI state ── */
  const [lyricsExpanded, setLyricsExpanded]         = useState(false);
  const [disclosureExpanded, setDisclosureExpanded] = useState(false);
  const [videoExpanded, setVideoExpanded]           = useState(false);
  const [deleteConfirm, setDeleteConfirm]           = useState(false);
  const [saving, setSaving]                         = useState(false);
  const [deleting, setDeleting]                     = useState(false);
  const [saved, setSaved]                           = useState(false);
  const [lyricsSaving, setLyricsSaving]             = useState(false);

  /* ── FREEZE FIX: 120ms delay before backdrop becomes interactive ── */
  const [backdropActive, setBackdropActive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBackdropActive(true), 120);
    return () => clearTimeout(t);
  }, []);

  /* ── T2 FIX: Set drawerContainerEl after mount so SelectContent portal has live node ── */
  useEffect(() => {
    if (drawerRootRef.current) setDrawerContainerEl(drawerRootRef.current);
  }, []);

  /* ── FREEZE FIX: Scroll-lock targets .player-scroll-area div (not body) ── */
  useEffect(() => {
    const scrollArea = document.querySelector<HTMLElement>(".player-scroll-area");
    if (scrollArea) {
      const prev = scrollArea.style.overflow;
      scrollArea.style.overflow = "hidden";
      return () => { scrollArea.style.overflow = prev; };
    } else {
      // Mobile Safari fallback: lock body if scroll area div not found
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, []);

  /* ── Stable onClose (prevents stale closure in backdrop handler) ── */
  const stableOnClose = useCallback(() => onClose(), [onClose]);

  /* ── Mutations ── */
  const updateMetadata = trpc.songs.updateMetadata.useMutation({
    onSuccess: () => {
      utils.songs.mySongs.invalidate();
      utils.songs.getById.invalidate({ id: song.id });
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
      toast.success("Work updated");
      onSaved();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save");
      setSaving(false);
    },
  });

  const updateLyrics = trpc.songs.updateLyrics.useMutation({
    onSuccess: () => {
      utils.songs.getById.invalidate({ id: song.id });
      setLyricsSaving(false);
      toast.success("Lyrics saved");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to save lyrics");
      setLyricsSaving(false);
    },
  });

  const deleteSong = trpc.songs.delete.useMutation({
    onSuccess: () => {
      utils.songs.mySongs.invalidate();
      toast.success("Work removed");
      onClose();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Failed to delete");
      setDeleting(false);
    },
  });

  const uploadVideoMutation = trpc.songs.uploadVideo.useMutation({
    onSuccess: (data: any) => {
      setVideoUrl(data.videoUrl);
      setVideoWid(data.videoWitnessId);
      setVideoFile(null);
      setVideoUploading(false);
      utils.songs.mySongs.invalidate();
      utils.songs.getById.invalidate({ id: song.id });
      toast.success("Video uploaded and witnessed!");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Video upload failed");
      setVideoUploading(false);
    },
  });

  const generateCaptionMutation = trpc.songs.generateCaption.useMutation({
    onSuccess: (data: { caption: string }) => {
      setCaption(data.caption);
      setCaptionGenerating(false);
      toast.success("Caption generated");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Caption generation failed");
      setCaptionGenerating(false);
    },
  });

  /* ── Cover art upload ── */
  async function handleCoverUpload(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Cover art must be under 5MB"); return; }
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("type", "cover");
      fd.append("filename", file.name);
      fd.append("file", file, file.name);
      const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Upload failed (${res.status})`);
      }
      const { url } = await res.json();
      setCoverUrl(url);
      await updateMetadata.mutateAsync({ songId: song.id, coverArtUrl: url });
      toast.success("Cover art updated");
    } catch (e: unknown) {
      toast.error((e as Error).message || "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
  }

  /* ── Video upload ── */
  async function handleVideoUpload() {
    if (!videoFile) return;
    setVideoUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = (ev.target?.result as string).split(",")[1];
        const videoBuf = await videoFile.arrayBuffer();
        const hashBuf  = await crypto.subtle.digest("SHA-256", videoBuf);
        const hashArr  = Array.from(new Uint8Array(hashBuf));
        const hashHex  = hashArr.map(b => b.toString(16).padStart(2, "0")).join("");
        const videoWitnessId = `WID-VID-${hashHex.slice(0, 8).toUpperCase()}-${hashHex.slice(8, 16).toUpperCase()}`;
        await uploadVideoMutation.mutateAsync({
          songId: song.id,
          videoBase64: base64,
          videoMimeType: videoFile.type || "video/mp4",
          videoFileName: videoFile.name,
          videoWitnessId,
        });
      } catch (e: unknown) {
        toast.error((e as Error).message || "Video upload failed");
        setVideoUploading(false);
      }
    };
    reader.readAsDataURL(videoFile);
  }

  /* ── AI Caption ── */
  function handleGenerateCaption() {
    if (!title.trim()) { toast.error("Add a title first"); return; }
    setCaptionGenerating(true);
    generateCaptionMutation.mutate({
      title,
      genre: genre || undefined,
    });
  }

  /* ── Save ── */
  function handleSave() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    updateMetadata.mutate({
      songId: song.id,
      title: title.trim(),
      genre: genre || null,
      caption: caption || null,
      description: description || null,
      status: status as "Published" | "Draft" | "Unlisted" | "Deleted",
      aiConsent: aiConsent as "prohibited" | "permitted_attribution" | "permitted",
      aiDisclosure: aiDisclosure as "original" | "human_authored_ai_instrument" | "ai_assisted" | "ai_generated",
      haaiOriginStory: originStory || null,
      externalLinksJson: extLinks.length > 0 ? JSON.stringify(extLinks) : null,
      releaseDate: creationDate || undefined,
      downloadPermission,
      downloadTipThresholdCents: downloadPermission === "tipped" ? tipThresholdCents : undefined,
    });
  }

  /* ── Save Lyrics ── */
  function handleSaveLyrics() {
    setLyricsSaving(true);
    updateLyrics.mutate({ songId: song.id, lyricsText: lyrics || "" });
  }

  /* ── Delete ── */
  function handleDelete() {
    setDeleting(true);
    deleteSong.mutate({ songId: song.id });
  }

  /* ── Keyboard close ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") stableOnClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [stableOnClose]);

  /* ─────────────────────────────────────────────────────────────────────── */
  /* RENDER                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */

  return createPortal(
    <div
      className="fixed inset-0 flex justify-end"
      style={{ zIndex: 9000 }}
      onPointerDown={(e) => {
        if (!backdropActive) return;
        if (e.target === e.currentTarget) stableOnClose();
      }}
    >
      {/* ── Backdrop ── */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(4,2,10,0.72)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* ── Drawer Panel ── */}
      <div
        ref={drawerRootRef}
        className="relative flex flex-col h-full overflow-hidden"
        style={{
          width: "min(640px, 100vw)",
          background: SURFACE,
          borderLeft: `1px solid ${GOLD_BORDER}`,
          boxShadow: `-24px 0 80px rgba(0,0,0,0.7), -4px 0 24px rgba(212,175,55,0.06)`,
          animation: "slideInRight 0.32s cubic-bezier(0.22,1,0.36,1)",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Sacred geometric background texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(212,175,55,0.025) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(212,175,55,0.018) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(212,175,55,0.012) 0%, transparent 70%)
            `,
            zIndex: 0,
          }}
        />

        {/* ── Header ── */}
        <div
          className="relative flex items-center justify-between px-7 py-5 flex-shrink-0"
          style={{
            borderBottom: `1px solid rgba(212,175,55,0.12)`,
            background: `linear-gradient(180deg, rgba(14,10,26,0.98) 0%, transparent 100%)`,
            zIndex: 1,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Sacred glyph — adapts to content type */}
            {(() => {
              const ct = song.contentType ?? "audio";
              const Icon = ct === "comic" ? BookOpen : ct === "manuscript" ? FileText : ct === "lyrics" ? Pencil : Music;
              const label = ct === "comic" ? "Comic Chapel" : ct === "manuscript" ? "Manuscript Chapel" : ct === "lyrics" ? "Lyrics Chapel" : "Creative Chapel";
              const subtitle = ct === "comic" ? "Tend to your visual testimony" : ct === "manuscript" ? "Tend to your written testimony" : ct === "lyrics" ? "Tend to your lyrical testimony" : "Tend to your testimony";
              return (
                <>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <h2
                      className="text-sm font-semibold tracking-[0.14em] uppercase"
                      style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}
                    >
                      {label}
                    </h2>
                    <p className="text-xs" style={{ color: TEXT_DIM }}>
                      {subtitle}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            {/* Preview link */}
            {song.witnessId && (
              <a
                href={`/song/${song.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}
              >
                <Eye className="w-3 h-3" />
                Preview
              </a>
            )}
            <button
              onClick={stableOnClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.1)`, color: TEXT_MUTED }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="relative flex-1 overflow-y-auto" style={{ zIndex: 1 }}>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ART HERO — The Majestic Centerpiece                            */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div
            className="relative w-full cursor-pointer overflow-hidden"
            style={{ height: 280, background: SURFACE2 }}
            onMouseEnter={() => setCoverHovered(true)}
            onMouseLeave={() => setCoverHovered(false)}
            onClick={() => coverInputRef.current?.click()}
          >
            {coverUrl ? (
              <>
                <img
                  src={coverUrl}
                  alt="Cover art"
                  className="w-full h-full object-cover"
                  style={{
                    transition: "transform 0.7s cubic-bezier(0.22,1,0.36,1)",
                    transform: coverHovered ? "scale(1.06)" : "scale(1)",
                  }}
                />
                {/* Vignette overlay — always present */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, rgba(6,4,14,0.2) 0%, transparent 35%, transparent 55%, rgba(6,4,14,0.85) 100%)",
                  }}
                />
                {/* Mobile tap hint — always visible on touch, hidden on hover-capable devices */}
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full pointer-events-none"
                  style={{
                    background: "rgba(4,2,10,0.7)",
                    border: `1px solid ${GOLD_BORDER}`,
                    opacity: coverHovered ? 0 : 1,
                    transition: "opacity 0.3s",
                  }}
                >
                  <ImageIcon className="w-3 h-3" style={{ color: GOLD, opacity: 0.7 }} />
                  <span className="text-xs" style={{ color: GOLD, opacity: 0.7, fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>Tap to replace</span>
                </div>
              </>
            ) : (
              <>
                {/* Sacred relic rings — empty state */}
                <RelicRings />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
                  >
                    <Music className="w-9 h-9" style={{ color: GOLD, opacity: 0.5 }} />
                  </div>
                  <span
                    className="text-sm tracking-[0.22em] uppercase"
                    style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}
                  >
                    Awaiting Art
                  </span>
                </div>
              </>
            )}

            {/* Hover overlay — ceremonial replace */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-400"
              style={{
                background: coverHovered ? "rgba(4,2,10,0.6)" : "transparent",
                opacity: coverHovered ? 1 : 0,
              }}
            >
              {coverUploading ? (
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: GOLD }} />
              ) : (
                <>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background: GOLD_DIM,
                      border: `1px solid ${GOLD_BORDER}`,
                      boxShadow: `0 0 32px rgba(212,175,55,0.2)`,
                    }}
                  >
                    <ImageIcon className="w-7 h-7" style={{ color: GOLD }} />
                  </div>
                  <div className="text-center">
                    <p
                      className="text-sm font-semibold tracking-[0.18em] uppercase"
                      style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}
                    >
                      {coverUrl ? "Replace Art" : "Consecrate Art"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "rgba(212,175,55,0.5)" }}>
                      JPG, PNG, WebP — max 5MB
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* WID badge — bottom right */}
            {song.witnessId && (
              <div
                className="absolute bottom-4 right-5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(4,2,10,0.8)", border: `1px solid ${GOLD_BORDER}` }}
              >
                <Hash className="w-2.5 h-2.5" style={{ color: GOLD }} />
                <span className="text-xs font-mono" style={{ color: GOLD, fontSize: "0.62rem", letterSpacing: "0.06em" }}>
                  {song.witnessId.slice(0, 16)}…
                </span>
              </div>
            )}

            {/* Upload hint — bottom left */}
            <div className="absolute bottom-4 left-5 flex items-center gap-1.5">
              <Upload className="w-3 h-3" style={{ color: GOLD, opacity: 0.5 }} />
              <span className="text-xs" style={{ color: "rgba(212,175,55,0.5)" }}>
                {coverUrl ? "Click to replace" : "Click to add cover art"}
              </span>
            </div>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
          />

          {/* ── Content sections ── */}
          <div className="px-8 pt-8">

            {/* ═══ TITLE — The Most Prominent Field ═══════════════════════ */}
            <div className="mb-8">
              <FieldLabel>Song / Work Name</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Work title"
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  borderBottom: `2px solid ${title ? GOLD : GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.96)",
                  fontFamily: "'Cinzel', serif",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "0.85rem 1.1rem",
                  height: "auto",
                  boxShadow: title ? `0 0 32px rgba(212,175,55,0.06) inset, 0 4px 24px rgba(212,175,55,0.04)` : "none",
                  transition: "all 0.35s ease",
                  borderRadius: "0.5rem",
                }}
              />
            </div>

            {/* ═══ CORE METADATA ═══════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">
              <div>
                <FieldLabel>Genre</FieldLabel>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger
                    style={{
                      background: SURFACE2,
                      border: `1px solid ${GOLD_BORDER}`,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent
                    container={drawerContainerEl}
                    style={{ background: "#0c0a1c", border: `1px solid ${GOLD_BORDER}` }}
                  >
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g} style={{ color: "rgba(255,255,255,0.8)" }}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Visibility</FieldLabel>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger
                    style={{
                      background: SURFACE2,
                      border: `1px solid ${GOLD_BORDER}`,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    container={drawerContainerEl}
                    style={{ background: "#0c0a1c", border: `1px solid ${GOLD_BORDER}` }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span style={{ color: s.color }}>{s.label}</span>
                        <span className="ml-2 text-xs" style={{ color: TEXT_MUTED }}>{s.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Creation Date */}
            <div className="mb-7">
              <FieldLabel hint="When was this work originally created?">Original Creation Date</FieldLabel>
              <Input
                type="date"
                value={creationDate}
                onChange={(e) => setCreationDate(e.target.value)}
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.8)",
                  colorScheme: "dark",
                }}
              />
            </div>

            {/* ═══ CAPTION & DESCRIPTION ═══════════════════════════════════ */}
            <SectionDivider label="Caption" icon={<Sparkles className="w-3.5 h-3.5" />} />

            <div className="mb-7">
              <div className="flex items-start justify-between mb-2.5">
                <FieldLabel hint="A short note visible on your work's public page">Caption</FieldLabel>
                <button
                  onClick={handleGenerateCaption}
                  disabled={captionGenerating || !title.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0 ml-3"
                  style={{
                    background: `linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.08))`,
                    border: `1px solid ${GOLD_BORDER}`,
                    color: GOLD,
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.08em",
                    boxShadow: `0 0 16px rgba(212,175,55,0.06)`,
                  }}
                >
                  {captionGenerating
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />
                  }
                  {captionGenerating ? "Generating…" : "AI Generate"}
                </button>
              </div>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="A brief note about this work, or click AI Generate above…"
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.82)",
                  resize: "none",
                  lineHeight: "1.65",
                }}
              />
              <p className="text-xs mt-1.5 text-right" style={{ color: TEXT_DIM }}>{caption.length} chars</p>
            </div>

            <div className="mb-7">
              <FieldLabel hint="Extended description shown on the work's detail page">Description</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell the story of this work in more depth…"
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.82)",
                  resize: "vertical",
                  lineHeight: "1.7",
                }}
              />
            </div>

            {/* ═══ ADD VIDEO ═══════════════════════════════════════════════ */}
            <SectionDivider label="Video" icon={<Video className="w-3.5 h-3.5" />} />

            <div className="mb-7">
              <button
                className="w-full flex items-center justify-between py-3 px-5 rounded-xl transition-all"
                style={{
                  background: videoExpanded ? GOLD_DIM : "rgba(255,255,255,0.025)",
                  border: `1px solid ${videoExpanded ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => setVideoExpanded((v) => !v)}
              >
                <div className="flex items-center gap-3">
                  <Video className="w-4 h-4" style={{ color: GOLD, opacity: 0.75 }} />
                  <span className="text-sm" style={{ color: videoExpanded ? GOLD : "rgba(255,255,255,0.6)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>
                    {(() => {
                      const ct = song.contentType ?? "audio";
                      if (videoUrl) return ct === "comic" ? "Trailer Attached" : ct === "manuscript" ? "Book Trailer Attached" : "Music Video Attached";
                      return ct === "comic" ? "Add Comic Trailer" : ct === "manuscript" ? "Add Book Trailer" : "Add Music Video";
                    })()}
                  </span>
                  {videoWid && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: GOLD_DIM, color: GOLD, fontSize: "0.6rem" }}>
                      {videoWid.slice(0, 12)}…
                    </span>
                  )}
                </div>
                {videoExpanded ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />}
              </button>

              {videoExpanded && (
                <div className="mt-4 space-y-4">
                  {videoUrl && (
                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${GOLD_BORDER}` }}>
                      <video src={videoUrl} controls className="w-full" style={{ maxHeight: 200, background: "#000" }} />
                    </div>
                  )}
                  <div
                    className="rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all hover:opacity-90"
                    style={{ background: SURFACE2, border: `2px dashed ${GOLD_BORDER}` }}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    {videoUploading ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
                        <p className="text-sm" style={{ color: TEXT_MUTED }}>Uploading & witnessing video…</p>
                      </>
                    ) : videoFile ? (
                      <>
                        <Video className="w-8 h-8" style={{ color: GOLD }} />
                        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{videoFile.name}</p>
                        <p className="text-xs" style={{ color: TEXT_MUTED }}>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleVideoUpload(); }}
                          style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontFamily: "'Cinzel', serif" }}
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Upload & Witness
                        </Button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8" style={{ color: GOLD, opacity: 0.45 }} />
                        <p className="text-sm" style={{ color: TEXT_MUTED }}>
                          {videoUrl ? "Click to replace video" : "Click to upload a music video"}
                        </p>
                        <p className="text-xs" style={{ color: TEXT_DIM }}>MP4, MOV, WebM — max 200MB</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f); }}
                  />
                  {videoWid && (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}>
                      <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: GOLD }}>Video Witness ID</p>
                        <p className="text-xs font-mono truncate" style={{ color: "rgba(212,175,55,0.7)" }}>{videoWid}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══ ORIGIN STORY — Living Testimony ════════════════════════ */}
            <SectionDivider label="Origin Story" icon={<Flame className="w-3.5 h-3.5" />} />

            <div className="mb-7 relative">
              {/* Faint flame watermark */}
              <div
                className="absolute right-3 top-8 pointer-events-none"
                style={{ color: GOLD, opacity: 0.04, fontSize: "5rem" }}
              >
                🔥
              </div>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.32)", fontStyle: "italic", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem" }}>
                What was the spark, the moment, the train of thought that brought this work into being?
                What human experience, emotion, or revelation birthed it?
                This is living testimony — not metadata.
              </p>
              <Textarea
                value={originStory}
                onChange={(e) => setOriginStory(e.target.value)}
                rows={8}
                placeholder="Write the origin story of this work…"
                style={{
                  background: SURFACE3,
                  border: `1px solid rgba(212,175,55,0.22)`,
                  borderLeft: `3px solid ${originStory ? GOLD : "rgba(212,175,55,0.15)"}`,
                  color: "rgba(255,255,255,0.88)",
                  resize: "vertical",
                  lineHeight: "1.8",
                  fontSize: "0.92rem",
                  fontFamily: "'Cormorant Garamond', serif",
                  boxShadow: originStory ? `0 0 28px rgba(212,175,55,0.06) inset` : "none",
                  transition: "all 0.4s ease",
                  padding: "1rem 1.1rem",
                }}
              />
              <p className="text-xs mt-2 text-right" style={{ color: TEXT_DIM }}>{originStory.length} / 5000</p>
            </div>

            {/* ═══ LYRICS ══════════════════════════════════════════════════ */}
            <SectionDivider label="Lyrics" icon={<BookOpen className="w-3.5 h-3.5" />} />

            <div className="mb-7">
              <button
                className="w-full flex items-center justify-between py-3 px-5 rounded-xl transition-all"
                style={{
                  background: lyricsExpanded ? GOLD_DIM : "rgba(255,255,255,0.025)",
                  border: `1px solid ${lyricsExpanded ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => setLyricsExpanded((v) => !v)}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="w-4 h-4" style={{ color: GOLD, opacity: 0.75 }} />
                  <span className="text-sm" style={{ color: lyricsExpanded ? GOLD : "rgba(255,255,255,0.6)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>
                    {lyrics ? "Edit Lyrics" : "Add Lyrics"}
                  </span>
                  {lyrics && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: GOLD_DIM, color: GOLD }}>
                      {lyrics.split("\n").length} lines
                    </span>
                  )}
                </div>
                {lyricsExpanded ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />}
              </button>

              {lyricsExpanded && (
                <div className="mt-4">
                  <Textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={14}
                    placeholder={"Verse 1\n…\n\nChorus\n…"}
                    style={{
                      background: "rgba(10,6,22,0.98)",
                      border: `1px solid ${GOLD_BORDER}`,
                      color: "rgba(255,255,255,0.85)",
                      resize: "vertical",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.84rem",
                      lineHeight: "1.9",
                    }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs" style={{ color: TEXT_DIM }}>Lyrics are saved separately.</span>
                    <Button
                      size="sm"
                      onClick={handleSaveLyrics}
                      disabled={lyricsSaving}
                      style={{
                        background: GOLD_DIM,
                        border: `1px solid ${GOLD_BORDER}`,
                        color: GOLD,
                        fontFamily: "'Cinzel', serif",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {lyricsSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                      Save Lyrics
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ FIND IT ELSEWHERE ═══════════════════════════════════════ */}
            <SectionDivider label="Find It Elsewhere" icon={<ExternalLink className="w-3.5 h-3.5" />} />

            <div className="mb-7">
              <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
                Link to this work on other platforms (Spotify, SoundCloud, Bandcamp, YouTube, etc.)
              </p>
              <div className="space-y-2.5 mb-4">
                {extLinks.map((link, i) => (
                  <div key={i} className="flex gap-2.5 items-center">
                    <Input
                      value={link.platform}
                      onChange={e => updateExtLink(i, "platform", e.target.value)}
                      placeholder="Platform"
                      className="w-32 flex-shrink-0 text-xs h-9"
                      style={{ background: SURFACE3, border: `1px solid rgba(212,175,55,0.18)`, color: "rgba(255,255,255,0.85)", fontSize: "0.78rem" }}
                    />
                    <Input
                      value={link.url}
                      onChange={e => updateExtLink(i, "url", e.target.value)}
                      placeholder="https://…"
                      className="flex-1 text-xs h-9"
                      style={{ background: SURFACE3, border: `1px solid rgba(212,175,55,0.18)`, color: "rgba(255,255,255,0.85)", fontSize: "0.78rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeExtLink(i)}
                      className="w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors hover:bg-red-900/30"
                      style={{ border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.5)" }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExtLink}
                className="flex items-center gap-2 text-xs px-4 py-2 rounded-full transition-all hover:opacity-80"
                style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.18)", color: "rgba(212,175,55,0.6)" }}
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>

            {/* ═══ PROVENANCE STAMP ════════════════════════════════════════ */}
            {/* ═══ DOWNLOAD SETTINGS ═══════════════════════════════════════════ */}
            <SectionDivider label="Distribution" icon={<Download className="w-3.5 h-3.5" />} />

            <div className="mb-7">
              <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
                Control how your work can be distributed. Downloads are off by default.
              </p>

              {/* Three sacred option cards */}
              <div className="flex flex-col gap-2.5 mb-5">
                {([
                  {
                    value: "none" as const,
                    label: "No Download",
                    desc: "Fans cannot download this work.",
                    color: "rgba(239,68,68,0.85)",
                    glow: "rgba(239,68,68,0.08)",
                  },
                  {
                    value: "free" as const,
                    label: "Free Download",
                    desc: "Anyone can download at no cost.",
                    color: "rgba(34,197,94,0.9)",
                    glow: "rgba(34,197,94,0.08)",
                  },
                  {
                    value: "tipped" as const,
                    label: "Paid Download",
                    desc: `Unlock after gifting $${(tipThresholdCents / 100).toFixed(2)}.`,
                    color: GOLD,
                    glow: GOLD_GLOW,
                  },
                ] as const).map(({ value, label, desc, color, glow }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDownloadPermission(value)}
                    className="w-full text-left rounded-xl px-4 py-3 transition-all"
                    style={{
                      background: downloadPermission === value ? glow : "rgba(255,255,255,0.025)",
                      border: `1px solid ${downloadPermission === value ? color : "rgba(255,255,255,0.07)"}`,
                      boxShadow: downloadPermission === value ? `0 0 18px ${glow} inset` : "none",
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-0.5">
                      {downloadPermission === value && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                      )}
                      <p
                        className="text-sm"
                        style={{
                          color: downloadPermission === value ? color : "rgba(255,255,255,0.65)",
                          fontFamily: "'Cinzel', serif",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {label}
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)", paddingLeft: downloadPermission === value ? "1.25rem" : "0" }}>{desc}</p>
                  </button>
                ))}
              </div>

              {/* Paid price input — only shown when tipped is selected */}
              {downloadPermission === "tipped" && (
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "rgba(212,175,55,0.04)",
                    border: `1px solid ${GOLD_BORDER}`,
                  }}
                >
                  <Label className="text-xs mb-2 block" style={{ color: "rgba(212,175,55,0.65)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>
                    Minimum Gift to Unlock (USD)
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>$</span>
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
                        const dollars = parseFloat(tipThresholdInput);
                        if (!isNaN(dollars) && dollars >= 0.5) {
                          setTipThresholdInput((Math.round(dollars * 100) / 100).toFixed(2));
                        } else {
                          setTipThresholdInput((tipThresholdCents / 100).toFixed(2));
                        }
                      }}
                      className="flex-1 rounded-lg px-3 py-2 text-sm"
                      style={{
                        background: "rgba(20,14,36,0.95)",
                        border: `1px solid rgba(212,175,55,0.26)`,
                        color: "rgba(255,255,255,0.85)",
                        outline: "none",
                        fontFamily: "'Cinzel', serif",
                      }}
                    />
                  </div>
                  <p className="text-xs mt-2" style={{ color: "rgba(212,175,55,0.35)" }}>
                    Minimum $0.50. Fans gift this amount to unlock the download.
                  </p>
                </div>
              )}
            </div>

            <SectionDivider label="Provenance Stamp" icon={<Shield className="w-3.5 h-3.5" />} />

            <div
              className="mb-7 rounded-xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.05) 0%, rgba(212,175,55,0.02) 100%)",
                border: `1px solid ${GOLD_BORDER}`,
                boxShadow: `0 0 32px rgba(212,175,55,0.04) inset`,
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
                >
                  <Shield className="w-4.5 h-4.5" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1.5" style={{ color: GOLD, fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}>
                    Witness ID — Sovereign Stamp
                  </p>
                  {song.witnessId ? (
                    <>
                      <p className="text-xs font-mono break-all mb-2.5" style={{ color: "rgba(212,175,55,0.72)", lineHeight: 1.65 }}>
                        {song.witnessId}
                      </p>
                      <p className="text-xs leading-relaxed mb-3" style={{ color: TEXT_MUTED }}>
                        This cryptographic proof is permanently anchored. Editing metadata does not change the WID — only replacing the audio file generates a new stamp.
                      </p>
                      <a
                        href={`/verify/${song.witnessId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
                        style={{ color: GOLD_BRIGHT }}
                      >
                        <Eye className="w-3 h-3" />
                        Verify on-chain →
                      </a>
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
                      No Witness ID yet. Upload an audio file to generate a cryptographic provenance stamp.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ CREATION DISCLOSURE ═════════════════════════════════════ */}
            <SectionDivider label="Creation Disclosure" icon={<FileText className="w-3.5 h-3.5" />} />

            <div className="mb-7">
              <button
                className="w-full flex items-center justify-between py-3 px-5 rounded-xl transition-all"
                style={{
                  background: disclosureExpanded ? GOLD_DIM : "rgba(255,255,255,0.025)",
                  border: `1px solid ${disclosureExpanded ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => setDisclosureExpanded((v) => !v)}
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4" style={{ color: GOLD, opacity: 0.75 }} />
                  <span className="text-sm" style={{ color: disclosureExpanded ? GOLD : "rgba(255,255,255,0.6)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>
                    AI Disclosure &amp; Training Consent
                  </span>
                </div>
                {disclosureExpanded ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />}
              </button>

              {disclosureExpanded && (
                <div className="mt-6 space-y-7">
                  <div>
                    <FieldLabel hint="How was this work created?">Creation Method</FieldLabel>
                    <div className="grid grid-cols-1 gap-2.5 mt-2.5">
                      {DISCLOSURE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAiDisclosure(opt.value)}
                          className="flex items-center gap-3.5 px-5 py-3.5 rounded-xl text-left transition-all"
                          style={{
                            background: aiDisclosure === opt.value ? GOLD_DIM : "rgba(255,255,255,0.025)",
                            border: `1px solid ${aiDisclosure === opt.value ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                            color: aiDisclosure === opt.value ? GOLD : "rgba(255,255,255,0.6)",
                          }}
                        >
                          <span className="text-lg">{opt.icon}</span>
                          <span className="text-sm">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <FieldLabel hint="Can this work be used to train AI models?">AI Training Consent</FieldLabel>
                    <div className="space-y-2.5 mt-2.5">
                      {AI_CONSENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAiConsent(opt.value)}
                          className="w-full flex items-start gap-3.5 px-5 py-3.5 rounded-xl text-left transition-all"
                          style={{
                            background: aiConsent === opt.value ? GOLD_DIM : "rgba(255,255,255,0.025)",
                            border: `1px solid ${aiConsent === opt.value ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                          }}
                        >
                          <div
                            className="mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{
                              border: `2px solid ${aiConsent === opt.value ? GOLD : "rgba(255,255,255,0.22)"}`,
                              background: aiConsent === opt.value ? GOLD : "transparent",
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium" style={{ color: aiConsent === opt.value ? GOLD : "rgba(255,255,255,0.75)" }}>{opt.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ DANGER ZONE ═════════════════════════════════════════════ */}
            <SectionDivider label="Danger Zone" />

            <div
              className="rounded-xl p-6 mb-8"
              style={{ background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.14)" }}
            >
              {!deleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}>Remove This Work</p>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(239,68,68,0.45)" }}>This cannot be undone. The testimony will be lost.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirm(true)}
                    style={{ borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", background: "transparent" }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
                    <p className="text-sm font-semibold" style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}>Are you certain? This cannot be undone.</p>
                  </div>
                  <p className="text-xs mb-5 leading-relaxed" style={{ color: "rgba(239,68,68,0.55)" }}>
                    Deleting this work will permanently remove it from the platform, including its Witness ID record, provenance chain, and all associated data.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ background: "#ef4444", color: "#fff", border: "none" }}
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                      Yes, Delete Forever
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(false)}
                      style={{ borderColor: "rgba(255,255,255,0.15)", color: TEXT_MUTED, background: "transparent" }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>{/* end px-8 */}
        </div>

        {/* ── Footer / Save Bar ── */}
        <div
          className="sticky bottom-0 px-8 py-6 flex items-center justify-between gap-4 flex-shrink-0"
          style={{
            background: `linear-gradient(0deg, ${SURFACE} 60%, transparent)`,
            borderTop: `1px solid rgba(212,175,55,0.12)`,
            zIndex: 2,
          }}
        >
          <button
            onClick={stableOnClose}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: TEXT_MUTED }}
          >
            Cancel
          </button>
          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className="relative overflow-hidden"
            style={{
              background: saved
                ? "rgba(34,197,94,0.12)"
                : `linear-gradient(135deg, rgba(212,175,55,0.24), rgba(212,175,55,0.1))`,
              border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : GOLD_BORDER}`,
              color: saved ? "#22c55e" : GOLD,
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.12em",
              minWidth: 160,
              padding: "0.65rem 1.5rem",
              transition: "all 0.35s ease",
              boxShadow: saved
                ? "0 0 28px rgba(34,197,94,0.1)"
                : `0 0 32px rgba(212,175,55,0.1), 0 0 8px rgba(212,175,55,0.06)`,
            }}
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="w-3.5 h-3.5 mr-2" />Saved</>
            ) : (
              "Save Work"
            )}
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
}
