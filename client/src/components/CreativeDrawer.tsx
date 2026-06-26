/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  CREATIVE DRAWER — Living Nexus                                         ║
  ║  A premium, sacred edit experience for creators.                        ║
  ║                                                                         ║
  ║  FREEZE FIX:                                                            ║
  ║  • Backdrop uses onPointerDown + e.target===e.currentTarget guard       ║
  ║    (prevents same-click-close from button click bubbling through portal)║
  ║  • 120ms mount delay before backdrop becomes interactive                ║
  ║  • Drawer panel stops pointer event propagation                         ║
  ║  • overlayOpen uses "light" mode (no position:fixed — avoids layout     ║
  ║    cascade that freezes the browser on SongDetailPage)                  ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
// overlayController intentionally removed — see FREEZE FIX v3 comment at top of file
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
  ExternalLink, Plus,
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
const GOLD_DIM    = "rgba(212,175,55,0.15)";
const GOLD_BORDER = "rgba(212,175,55,0.28)";
const GOLD_GLOW   = "rgba(212,175,55,0.08)";
const SURFACE     = "rgba(8,6,16,0.99)";
const SURFACE2    = "rgba(16,12,28,0.97)";
const SURFACE3    = "rgba(22,16,38,0.95)";
const TEXT_MUTED  = "rgba(255,255,255,0.42)";
const TEXT_DIM    = "rgba(255,255,255,0.28)";

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionDivider({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-7">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.22))" }} />
      <div className="flex items-center gap-1.5">
        {icon && <span style={{ color: GOLD, opacity: 0.7 }}>{icon}</span>}
        <span className="text-xs tracking-[0.22em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.22), transparent)" }} />
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <Label className="text-xs tracking-[0.14em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
        {children}
      </Label>
      {hint && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: TEXT_DIM }}>{hint}</p>}
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

  // External links — stored as JSON array of {platform: string, url: string}
  const parseLinks = (raw?: string | null): Array<{ platform: string; url: string }> => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };
  const [extLinks, setExtLinks] = useState<Array<{ platform: string; url: string }>>(
    parseLinks(song.externalLinksJson)
  );
  const addExtLink = () => setExtLinks(prev => [...prev, { platform: "", url: "" }]);
  const removeExtLink = (i: number) => setExtLinks(prev => prev.filter((_, idx) => idx !== i));
  const updateExtLink = (i: number, key: "platform" | "url", val: string) =>
    setExtLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  const [lyrics, setLyrics]             = useState(song.lyricsText ?? "");
  const [creationDate, setCreationDate] = useState(
    song.releaseDate ? song.releaseDate.slice(0, 10) : ""
  );

  /* ── Cover art ── */
  const [coverUrl, setCoverUrl]             = useState(song.coverArtUrl ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverHovered, setCoverHovered]     = useState(false);
  const coverInputRef                       = useRef<HTMLInputElement>(null);

  /* ── Video ── */
  const [videoUrl, setVideoUrl]         = useState(song.videoUrl ?? "");
  const [videoWid, setVideoWid]         = useState(song.videoWitnessId ?? "");
  const [videoFile, setVideoFile]       = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const videoInputRef                   = useRef<HTMLInputElement>(null);
  const drawerRootRef                    = useRef<HTMLDivElement>(null);

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
      title: title.trim(),
      genre: genre || undefined,
      workType: (song.contentType as any) || "audio",
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
      status: status as "Draft" | "Published" | "Unlisted",
      aiConsent: aiConsent as "prohibited" | "permitted_attribution" | "permitted",
      aiDisclosure: aiDisclosure as "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument",
      haaiOriginStory: originStory || null,
      externalLinksJson: extLinks.filter(l => l.platform && l.url).length > 0
        ? JSON.stringify(extLinks.filter(l => l.platform && l.url))
        : null,
      releaseDate: creationDate || null,
    });
  }

  /* ── Save lyrics separately ── */
  function handleSaveLyrics() {
    setLyricsSaving(true);
    updateLyrics.mutate({ songId: song.id, lyricsText: lyrics });
  }

  /* ── Delete ── */
  function handleDelete() {
    setDeleting(true);
    deleteSong.mutate({ songId: song.id });
  }

  /* ── FREEZE FIX: Stable onClose reference for Escape key ── */
  const stableOnClose = useCallback(() => onClose(), [onClose]);

  /* ── Keyboard ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") stableOnClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stableOnClose]);

  /* ── FREEZE FIX v3: Self-contained scroll lock on the actual scroll container ──
     MainLayout renders a scrollable <div class="player-scroll-area"> NOT window scroll.
     Locking body.overflow:hidden (what overlayController does) triggers a full browser
     layout reflow + fires SongDetailPage's window.scroll listener + React setState =
     main-thread lock (the freeze). Instead we lock the scroll container div directly.
     This is zero-reflow: the div's overflow is toggled, body is untouched. */
  useEffect(() => {
    const scrollArea = document.querySelector<HTMLElement>(".player-scroll-area");
    const prevOverflow = scrollArea?.style.overflowY ?? "";
    if (scrollArea) scrollArea.style.overflowY = "hidden";
    return () => {
      if (scrollArea) scrollArea.style.overflowY = prevOverflow;
    };
  }, []);

  /* ── Entrance animation ── */
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  /* ── FREEZE FIX: Backdrop pointer handler ── */
  const handleBackdropPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only close if the pointer landed directly on the backdrop (not on any child)
    if (!backdropActive) return;
    if (e.target === e.currentTarget) stableOnClose();
  }, [backdropActive, stableOnClose]);

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return createPortal(
    <div
      ref={drawerRootRef}
      className="fixed inset-0"
      style={{ zIndex: 9000 }}
      aria-modal="true"
      role="dialog"
      aria-label="Creative Drawer"
    >
      {/* ── FREEZE FIX: Backdrop uses onPointerDown + target guard ── */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: "radial-gradient(ellipse at 65% 35%, rgba(30,15,55,0.88) 0%, rgba(0,0,0,0.94) 100%)",
          opacity: visible ? 1 : 0,
          cursor: backdropActive ? "pointer" : "default",
        }}
        onPointerDown={handleBackdropPointerDown}
      />

      {/* ── FREEZE FIX: Drawer stops pointer propagation ── */}
      <div
        className="absolute top-0 right-0 h-full flex flex-col"
        style={{
          width: "min(620px, 100vw)",
          background: SURFACE,
          borderLeft: `1px solid ${GOLD_BORDER}`,
          boxShadow: `-32px 0 100px rgba(0,0,0,0.75), -4px 0 32px ${GOLD_GLOW}`,
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 flex items-center justify-between px-7 py-4"
          style={{
            background: `linear-gradient(180deg, ${SURFACE} 75%, transparent)`,
            borderBottom: `1px solid ${GOLD_BORDER}`,
            zIndex: 10,
          }}
        >
          <div>
            <p className="text-xs tracking-[0.28em] uppercase mb-0.5" style={{ color: GOLD, fontFamily: "'Cinzel', serif", opacity: 0.65 }}>
              Creative Drawer
            </p>
            <h2 className="text-sm font-semibold truncate max-w-[380px]" style={{ color: "rgba(255,255,255,0.88)", fontFamily: "'Cinzel', serif" }}>
              {song.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {song.witnessId && (
              <a
                href={`/song/${song.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-90"
                style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}
                title="View public page"
              >
                <Eye className="w-3 h-3" />
                Preview
              </a>
            )}
            <button
              onClick={stableOnClose}
              className="rounded-full p-2 transition-all hover:opacity-80"
              style={{ color: TEXT_MUTED, background: "rgba(255,255,255,0.05)" }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 pb-8">

          {/* ═══ HERO COVER ART ══════════════════════════════════════════ */}
          <div
            className="relative w-full overflow-hidden cursor-pointer"
            style={{ height: 240, background: SURFACE2, borderBottom: `1px solid ${GOLD_BORDER}` }}
            onClick={() => coverInputRef.current?.click()}
            onMouseEnter={() => setCoverHovered(true)}
            onMouseLeave={() => setCoverHovered(false)}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Cover art"
                className="w-full h-full object-cover"
                style={{ transition: "transform 0.5s ease", transform: coverHovered ? "scale(1.04)" : "scale(1)" }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}>
                  <Music className="w-10 h-10" style={{ color: GOLD, opacity: 0.45 }} />
                </div>
                <span className="text-sm tracking-widest uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
                  No Cover Art
                </span>
              </div>
            )}

            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0" style={{ height: 90, background: "linear-gradient(0deg, rgba(8,6,16,0.9) 0%, transparent 100%)" }} />

            {/* Hover overlay */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300"
              style={{ background: "rgba(0,0,0,0.55)", opacity: coverHovered ? 1 : 0 }}
            >
              {coverUploading ? (
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}>
                    <ImageIcon className="w-7 h-7" style={{ color: GOLD }} />
                  </div>
                  <span className="text-sm tracking-widest uppercase" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>
                    {coverUrl ? "Replace Art" : "Add Cover Art"}
                  </span>
                </>
              )}
            </div>

            {/* Bottom-left hint */}
            <div className="absolute bottom-3 left-5 flex items-center gap-1.5">
              <Upload className="w-3 h-3" style={{ color: GOLD, opacity: 0.6 }} />
              <span className="text-xs" style={{ color: GOLD, opacity: 0.6 }}>
                {coverUrl ? "Click to replace" : "Click to add cover art"}
              </span>
            </div>

            {/* Provenance stamp badge — bottom right */}
            {song.witnessId && (
              <div
                className="absolute bottom-3 right-5 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${GOLD_BORDER}` }}
              >
                <Hash className="w-2.5 h-2.5" style={{ color: GOLD }} />
                <span className="text-xs font-mono" style={{ color: GOLD, fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                  {song.witnessId.slice(0, 16)}…
                </span>
              </div>
            )}
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
          />

          {/* ── Content sections ── */}
          <div className="px-7 pt-7">

            {/* ═══ TITLE ═══════════════════════════════════════════════ */}
            <div className="mb-6">
              <FieldLabel>Song / Work Name</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Work title"
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.94)",
                  fontFamily: "'Cinzel', serif",
                  fontSize: "1.15rem",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  padding: "0.7rem 1rem",
                  height: "auto",
                  boxShadow: title ? `0 0 24px ${GOLD_GLOW} inset` : "none",
                  transition: "box-shadow 0.3s ease",
                }}
              />
            </div>

            {/* ═══ CORE METADATA ═══════════════════════════════════════ */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <FieldLabel>Genre</FieldLabel>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger style={{ background: SURFACE2, border: `1px solid ${GOLD_BORDER}`, color: "rgba(255,255,255,0.8)" }}>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent container={drawerRootRef.current} style={{ background: "#0d0b1a", border: `1px solid ${GOLD_BORDER}` }}>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g} style={{ color: "rgba(255,255,255,0.8)" }}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Visibility</FieldLabel>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger style={{ background: SURFACE2, border: `1px solid ${GOLD_BORDER}`, color: "rgba(255,255,255,0.8)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent container={drawerRootRef.current} style={{ background: "#0d0b1a", border: `1px solid ${GOLD_BORDER}` }}>
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
            <div className="mb-6">
              <FieldLabel hint="When was this work originally created?">Original Creation Date</FieldLabel>
              <Input
                type="date"
                value={creationDate}
                onChange={(e) => setCreationDate(e.target.value)}
                style={{ background: SURFACE2, border: `1px solid ${GOLD_BORDER}`, color: "rgba(255,255,255,0.8)", colorScheme: "dark" }}
              />
            </div>

            {/* ═══ AI CAPTION ══════════════════════════════════════════ */}
            <SectionDivider label="Caption" icon={<Sparkles className="w-3.5 h-3.5" />} />

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <FieldLabel hint="A short note visible on your work's public page">Caption</FieldLabel>
                <button
                  onClick={handleGenerateCaption}
                  disabled={captionGenerating || !title.trim()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}
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
                style={{ background: SURFACE2, border: `1px solid ${GOLD_BORDER}`, color: "rgba(255,255,255,0.8)", resize: "none" }}
              />
              <p className="text-xs mt-1 text-right" style={{ color: TEXT_DIM }}>{caption.length} chars</p>
            </div>

            {/* Description */}
            <div className="mb-2">
              <FieldLabel hint="Extended description shown on the work's detail page">Description</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell the story of this work in more depth…"
                style={{ background: SURFACE2, border: `1px solid ${GOLD_BORDER}`, color: "rgba(255,255,255,0.8)", resize: "vertical", lineHeight: "1.65" }}
              />
            </div>

            {/* ═══ ADD VIDEO ═══════════════════════════════════════════ */}
            <SectionDivider label="Video" icon={<Video className="w-3.5 h-3.5" />} />

            <div className="mb-6">
              <button
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl transition-all"
                style={{
                  background: videoExpanded ? GOLD_DIM : "rgba(255,255,255,0.03)",
                  border: `1px solid ${videoExpanded ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => setVideoExpanded((v) => !v)}
              >
                <div className="flex items-center gap-2.5">
                  <Video className="w-4 h-4" style={{ color: GOLD, opacity: 0.75 }} />
                  <span className="text-sm" style={{ color: videoExpanded ? GOLD : "rgba(255,255,255,0.6)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>
                    {videoUrl ? "Music Video Attached" : "Add Music Video"}
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
                    className="rounded-xl p-5 flex flex-col items-center gap-3 cursor-pointer transition-all hover:opacity-90"
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
                        <Upload className="w-8 h-8" style={{ color: GOLD, opacity: 0.5 }} />
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
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}>
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

            {/* ═══ ORIGIN STORY ════════════════════════════════════════ */}
            {/* ═══ EXTERNAL LINKS ═══════════════════════════════════ */}
            <SectionDivider label="Find It Elsewhere" icon={<ExternalLink className="w-3.5 h-3.5" />} />
            <div className="mb-6">
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.30)", fontStyle: "italic" }}>
                Link to this work on other platforms (Spotify, SoundCloud, Bandcamp, YouTube, etc.)
              </p>
              <div className="space-y-2 mb-3">
                {extLinks.map((link, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={link.platform}
                      onChange={e => updateExtLink(i, "platform", e.target.value)}
                      placeholder="Platform (e.g. Spotify)"
                      className="w-32 flex-shrink-0 text-xs h-8"
                      style={{ background: SURFACE3, border: `1px solid rgba(196,154,40,0.2)`, color: "rgba(255,255,255,0.85)", fontSize: "0.78rem" }}
                    />
                    <Input
                      value={link.url}
                      onChange={e => updateExtLink(i, "url", e.target.value)}
                      placeholder="https://..."
                      className="flex-1 text-xs h-8"
                      style={{ background: SURFACE3, border: `1px solid rgba(196,154,40,0.2)`, color: "rgba(255,255,255,0.85)", fontSize: "0.78rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeExtLink(i)}
                      className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors hover:bg-red-900/30"
                      style={{ border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.5)" }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addExtLink}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.2)", color: "rgba(196,154,40,0.65)" }}
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>
            <SectionDivider label="Origin Story" icon={<Flame className="w-3.5 h-3.5" />} />

            <div className="mb-6">
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.36)", fontStyle: "italic" }}>
                What was the spark, the moment, the train of thought that brought this work into being?
                What human experience, emotion, or revelation birthed it?
                This is living testimony — not metadata.
              </p>
              <Textarea
                value={originStory}
                onChange={(e) => setOriginStory(e.target.value)}
                rows={7}
                placeholder="Write the origin story of this work…"
                style={{
                  background: SURFACE3,
                  border: `1px solid rgba(212,175,55,0.25)`,
                  color: "rgba(255,255,255,0.88)",
                  resize: "vertical",
                  lineHeight: "1.75",
                  fontSize: "0.9rem",
                  boxShadow: originStory ? `0 0 20px rgba(212,175,55,0.05) inset` : "none",
                  transition: "box-shadow 0.4s ease",
                }}
              />
              <p className="text-xs mt-1.5 text-right" style={{ color: TEXT_DIM }}>{originStory.length} / 5000</p>
            </div>

            {/* ═══ LYRICS ══════════════════════════════════════════════ */}
            <SectionDivider label="Lyrics" icon={<BookOpen className="w-3.5 h-3.5" />} />

            <div className="mb-6">
              <button
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl transition-all"
                style={{
                  background: lyricsExpanded ? GOLD_DIM : "rgba(255,255,255,0.03)",
                  border: `1px solid ${lyricsExpanded ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => setLyricsExpanded((v) => !v)}
              >
                <div className="flex items-center gap-2.5">
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
                <div className="mt-3">
                  <Textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={14}
                    placeholder={"Verse 1\n…\n\nChorus\n…"}
                    style={{
                      background: "rgba(12,8,24,0.97)",
                      border: `1px solid ${GOLD_BORDER}`,
                      color: "rgba(255,255,255,0.85)",
                      resize: "vertical",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                      lineHeight: "1.85",
                    }}
                  />
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-xs" style={{ color: TEXT_DIM }}>Lyrics are saved separately.</span>
                    <Button
                      size="sm"
                      onClick={handleSaveLyrics}
                      disabled={lyricsSaving}
                      style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, color: GOLD, fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}
                    >
                      {lyricsSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : null}
                      Save Lyrics
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ PROVENANCE STAMP ════════════════════════════════════ */}
            <SectionDivider label="Provenance Stamp" icon={<Shield className="w-3.5 h-3.5" />} />

            <div className="mb-6 rounded-xl p-5" style={{ background: "rgba(212,175,55,0.04)", border: `1px solid ${GOLD_BORDER}` }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}>
                  <Shield className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>
                    Witness ID — Sovereign Stamp
                  </p>
                  {song.witnessId ? (
                    <>
                      <p className="text-xs font-mono break-all mb-2" style={{ color: "rgba(212,175,55,0.75)", lineHeight: 1.6 }}>
                        {song.witnessId}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
                        This cryptographic proof is permanently anchored. Editing metadata does not change the WID — only replacing the audio file generates a new stamp.
                      </p>
                      <a
                        href={`/verify/${song.witnessId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-xs hover:opacity-80 transition-opacity"
                        style={{ color: GOLD }}
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

            {/* ═══ CREATION DISCLOSURE ═════════════════════════════════ */}
            <SectionDivider label="Creation Disclosure" icon={<FileText className="w-3.5 h-3.5" />} />

            <div className="mb-6">
              <button
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl transition-all"
                style={{
                  background: disclosureExpanded ? GOLD_DIM : "rgba(255,255,255,0.03)",
                  border: `1px solid ${disclosureExpanded ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                }}
                onClick={() => setDisclosureExpanded((v) => !v)}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" style={{ color: GOLD, opacity: 0.75 }} />
                  <span className="text-sm" style={{ color: disclosureExpanded ? GOLD : "rgba(255,255,255,0.6)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}>
                    AI Disclosure &amp; Training Consent
                  </span>
                </div>
                {disclosureExpanded ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />}
              </button>

              {disclosureExpanded && (
                <div className="mt-5 space-y-6">
                  <div>
                    <FieldLabel hint="How was this work created?">Creation Method</FieldLabel>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {DISCLOSURE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAiDisclosure(opt.value)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                          style={{
                            background: aiDisclosure === opt.value ? GOLD_DIM : "rgba(255,255,255,0.03)",
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
                    <div className="space-y-2 mt-2">
                      {AI_CONSENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setAiConsent(opt.value)}
                          className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                          style={{
                            background: aiConsent === opt.value ? GOLD_DIM : "rgba(255,255,255,0.03)",
                            border: `1px solid ${aiConsent === opt.value ? GOLD_BORDER : "rgba(255,255,255,0.07)"}`,
                          }}
                        >
                          <div
                            className="mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ border: `2px solid ${aiConsent === opt.value ? GOLD : "rgba(255,255,255,0.25)"}`, background: aiConsent === opt.value ? GOLD : "transparent" }}
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

            {/* ═══ DANGER ZONE ═════════════════════════════════════════ */}
            <SectionDivider label="Danger Zone" />

            <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.16)" }}>
              {!deleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}>Remove This Work</p>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(239,68,68,0.5)" }}>This cannot be undone. The testimony will be lost.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(true)} style={{ borderColor: "rgba(239,68,68,0.35)", color: "#ef4444", background: "transparent" }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
                    <p className="text-sm font-semibold" style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}>Are you certain? This cannot be undone.</p>
                  </div>
                  <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(239,68,68,0.6)" }}>
                    Deleting this work will permanently remove it from the platform, including its Witness ID record, provenance chain, and all associated data.
                  </p>
                  <div className="flex gap-3">
                    <Button size="sm" onClick={handleDelete} disabled={deleting} style={{ background: "#ef4444", color: "#fff", border: "none" }}>
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                      Yes, Delete Forever
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(false)} style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", background: "transparent" }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>{/* end px-7 */}
        </div>

        {/* ── Footer / Save Bar ── */}
        <div
          className="sticky bottom-0 px-7 py-5 flex items-center justify-between gap-3"
          style={{ background: `linear-gradient(0deg, ${SURFACE} 65%, transparent)`, borderTop: `1px solid ${GOLD_BORDER}` }}
        >
          <button onClick={stableOnClose} className="text-sm transition-opacity hover:opacity-80" style={{ color: TEXT_MUTED }}>
            Cancel
          </button>
          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className="relative overflow-hidden"
            style={{
              background: saved ? "rgba(34,197,94,0.15)" : `linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.1))`,
              border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : GOLD_BORDER}`,
              color: saved ? "#22c55e" : GOLD,
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.1em",
              minWidth: 148,
              transition: "all 0.3s ease",
              boxShadow: saved ? "0 0 24px rgba(34,197,94,0.12)" : `0 0 24px ${GOLD_GLOW}`,
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
