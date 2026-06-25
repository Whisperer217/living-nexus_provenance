/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  EDIT CHAPEL — Living Nexus                                             ║
  ║  A sacred, unified track-editing experience.                            ║
  ║  "Editing a work should feel like stepping into a private chapel —      ║
  ║   calm, intentional, and reverent."                                     ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
import {
  X,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Music,
  Flame,
  BookOpen,
  Shield,
  ChevronDown,
  ChevronUp,
  ImageIcon,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface ChapelSong {
  id: number;
  title: string;
  genre?: string | null;
  caption?: string | null;
  coverArtUrl?: string | null;
  aiConsent?: string | null;
  status: string;
  lyricsText?: string | null;
  haaiOriginStory?: string | null;
  aiDisclosure?: string | null;
  contentType?: string | null;
  releaseDate?: string | null;
}

interface EditChapelProps {
  song: ChapelSong;
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
  { value: "Published", label: "Published", desc: "Visible to everyone", color: "#22c55e" },
  { value: "Draft",     label: "Draft",     desc: "Hidden from public",   color: "#f59e0b" },
  { value: "Unlisted",  label: "Unlisted",  desc: "Only via direct link", color: "#a855f7" },
];

const DISCLOSURE_OPTIONS = [
  { value: "original",                    label: "Human-Made — Original Work",            icon: "🕊️" },
  { value: "human_authored_ai_instrument",label: "Human-Authored, AI as Instrument",      icon: "🎹" },
  { value: "ai_assisted",                 label: "AI-Assisted — Human Direction",         icon: "🤝" },
  { value: "ai_generated",               label: "AI-Generated",                           icon: "🤖" },
];

const AI_CONSENT_OPTIONS = [
  { value: "prohibited",             label: "No AI Training",           desc: "Human-Made — prohibit all AI training use" },
  { value: "permitted_attribution",  label: "Attribution Required",     desc: "AI-Assisted — training permitted with credit" },
  { value: "permitted",              label: "Open Training",            desc: "AI-Assisted Manifestation — open training" },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const GOLD = "#D4AF37";
const GOLD_DIM = "rgba(212,175,55,0.18)";
const GOLD_BORDER = "rgba(212,175,55,0.25)";
const SURFACE = "rgba(10,8,18,0.98)";
const SURFACE2 = "rgba(18,14,30,0.95)";
const TEXT_MUTED = "rgba(255,255,255,0.45)";

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.3))" }} />
      <span className="text-xs tracking-[0.2em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.3), transparent)" }} />
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <Label className="text-xs tracking-[0.15em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
        {children}
      </Label>
      {hint && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{hint}</p>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function EditChapel({ song, onClose, onSaved }: EditChapelProps) {
  const utils = trpc.useUtils();

  /* ── Form state ── */
  const [title, setTitle]               = useState(song.title ?? "");
  const [genre, setGenre]               = useState(song.genre ?? "");
  const [caption, setCaption]           = useState(song.caption ?? "");
  const [status, setStatus]             = useState<string>(song.status ?? "Published");
  const [aiConsent, setAiConsent]       = useState<string>(song.aiConsent ?? "prohibited");
  const [aiDisclosure, setAiDisclosure] = useState<string>(song.aiDisclosure ?? "original");
  const [originStory, setOriginStory]   = useState(song.haaiOriginStory ?? "");
  const [lyrics, setLyrics]             = useState(song.lyricsText ?? "");
  const [creationDate, setCreationDate] = useState(
    song.releaseDate ? song.releaseDate.slice(0, 10) : ""
  );

  /* ── Cover art ── */
  const [coverUrl, setCoverUrl]         = useState(song.coverArtUrl ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  /* ── UI state ── */
  const [lyricsExpanded, setLyricsExpanded]         = useState(false);
  const [disclosureExpanded, setDisclosureExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm]           = useState(false);
  const [saving, setSaving]                         = useState(false);
  const [deleting, setDeleting]                     = useState(false);
  const [saved, setSaved]                           = useState(false);
  const [lyricsSaving, setLyricsSaving]             = useState(false);

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

  /* ── Cover art upload ── */
  async function handleCoverUpload(file: File) {
    if (!file) return;
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("type", "image");
      fd.append("filename", file.name);
      fd.append("file", file);
      const res = await fetch("/api/upload-file", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setCoverUrl(url);
      // Immediately persist cover art
      await updateMetadata.mutateAsync({ songId: song.id, coverArtUrl: url });
      toast.success("Cover art updated");
    } catch (e: any) {
      toast.error(e.message || "Cover upload failed");
    } finally {
      setCoverUploading(false);
    }
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
      status: status as any,
      aiConsent: aiConsent as any,
      aiDisclosure: aiDisclosure as any,
      haaiOriginStory: originStory || null,
      releaseDate: creationDate || null,
    } as any);
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

  /* ── Keyboard & scroll lock ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    overlayOpen("edit-track", "light");
    return () => overlayClose("edit-track");
  }, []);

  /* ── Entrance animation ── */
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: 9000 }}
      aria-modal="true"
      role="dialog"
      aria-label="Edit Chapel"
    >
      {/* ── Backdrop ── */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: "radial-gradient(ellipse at 60% 40%, rgba(30,15,50,0.85) 0%, rgba(0,0,0,0.92) 100%)",
          opacity: visible ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* ── Drawer ── */}
      <div
        className="absolute top-0 right-0 h-full flex flex-col"
        style={{
          width: "min(520px, 100vw)",
          background: SURFACE,
          borderLeft: `1px solid ${GOLD_BORDER}`,
          boxShadow: `-24px 0 80px rgba(0,0,0,0.7), -4px 0 24px rgba(212,175,55,0.06)`,
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.38s cubic-bezier(0.22,1,0.36,1)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4"
          style={{
            background: `linear-gradient(180deg, ${SURFACE} 80%, transparent)`,
            borderBottom: `1px solid ${GOLD_BORDER}`,
            zIndex: 10,
          }}
        >
          <div>
            <p className="text-xs tracking-[0.25em] uppercase mb-0.5" style={{ color: GOLD, fontFamily: "'Cinzel', serif", opacity: 0.7 }}>
              Edit Chapel
            </p>
            <h2 className="text-base font-semibold truncate max-w-[320px]" style={{ color: "rgba(255,255,255,0.9)", fontFamily: "'Cinzel', serif" }}>
              {song.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-all"
            style={{ color: TEXT_MUTED, background: "rgba(255,255,255,0.04)" }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 px-6 pb-8 pt-6 space-y-0">

          {/* ═══ COVER ART ═══════════════════════════════════════════════ */}
          <div className="flex gap-5 items-start mb-8">
            {/* Cover preview */}
            <div
              className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group"
              style={{
                width: 120,
                height: 120,
                background: SURFACE2,
                border: `1px solid ${GOLD_BORDER}`,
                boxShadow: coverUrl ? `0 0 24px rgba(212,175,55,0.12)` : "none",
              }}
              onClick={() => coverInputRef.current?.click()}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="Cover art" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                  <Music className="w-8 h-8" style={{ color: "rgba(212,175,55,0.3)" }} />
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>No Art</span>
                </div>
              )}
              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.65)" }}
              >
                {coverUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" style={{ color: GOLD }} />
                    <span className="text-xs" style={{ color: GOLD }}>Replace</span>
                  </>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <FieldLabel>Title</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Work title"
                className="text-base font-semibold"
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "'Cinzel', serif",
                  fontSize: "1.05rem",
                }}
              />
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
              />
              <button
                onClick={() => coverInputRef.current?.click()}
                className="mt-2 text-xs flex items-center gap-1.5 transition-opacity hover:opacity-100 opacity-60"
                style={{ color: GOLD }}
              >
                <Upload className="w-3 h-3" />
                {coverUrl ? "Replace cover art" : "Add cover art"}
              </button>
            </div>
          </div>

          {/* ═══ CORE METADATA ═══════════════════════════════════════════ */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Genre */}
            <div>
              <FieldLabel>Genre</FieldLabel>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger style={{ background: SURFACE2, border: `1px solid ${GOLD_BORDER}`, color: "rgba(255,255,255,0.8)" }}>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent style={{ background: "#0d0b18", border: `1px solid ${GOLD_BORDER}` }}>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g} style={{ color: "rgba(255,255,255,0.8)" }}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <FieldLabel>Visibility</FieldLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger style={{ background: SURFACE2, border: `1px solid ${GOLD_BORDER}`, color: "rgba(255,255,255,0.8)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "#0d0b18", border: `1px solid ${GOLD_BORDER}` }}>
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
            <FieldLabel hint="When was this work originally created? (Not the upload date)">Original Creation Date</FieldLabel>
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

          {/* Caption */}
          <div className="mb-6">
            <FieldLabel hint="A short note visible on your work's page">Caption</FieldLabel>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="A brief note about this work…"
              style={{
                background: SURFACE2,
                border: `1px solid ${GOLD_BORDER}`,
                color: "rgba(255,255,255,0.8)",
                resize: "none",
              }}
            />
          </div>

          {/* ═══ ORIGIN STORY ════════════════════════════════════════════ */}
          <SectionDivider label="Origin Story" />

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4" style={{ color: GOLD }} />
              <FieldLabel>Where did this work come from?</FieldLabel>
            </div>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.38)", fontStyle: "italic" }}>
              What was the spark, the moment, the train of thought that brought this work into being?
              What human experience, emotion, or revelation birthed it?
              This is living testimony — not metadata.
            </p>
            <Textarea
              value={originStory}
              onChange={(e) => setOriginStory(e.target.value)}
              rows={6}
              placeholder="Write the origin story of this work…"
              style={{
                background: "rgba(20,14,36,0.9)",
                border: `1px solid rgba(212,175,55,0.3)`,
                color: "rgba(255,255,255,0.88)",
                resize: "vertical",
                lineHeight: "1.7",
                fontSize: "0.9rem",
                boxShadow: originStory ? `0 0 16px rgba(212,175,55,0.06) inset` : "none",
                transition: "box-shadow 0.4s ease",
              }}
            />
            <p className="text-xs mt-1.5 text-right" style={{ color: TEXT_MUTED }}>
              {originStory.length} / 5000
            </p>
          </div>

          {/* ═══ LYRICS ══════════════════════════════════════════════════ */}
          <SectionDivider label="Lyrics" />

          <div className="mb-6">
            <button
              className="w-full flex items-center justify-between py-2 transition-opacity hover:opacity-80"
              onClick={() => setLyricsExpanded((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-xs tracking-[0.15em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
                  {lyrics ? "Edit Lyrics" : "Add Lyrics"}
                </span>
              </div>
              {lyricsExpanded ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />}
            </button>

            {lyricsExpanded && (
              <div className="mt-3">
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={12}
                  placeholder="Verse 1&#10;…&#10;&#10;Chorus&#10;…"
                  style={{
                    background: "rgba(14,10,26,0.95)",
                    border: `1px solid ${GOLD_BORDER}`,
                    color: "rgba(255,255,255,0.85)",
                    resize: "vertical",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    lineHeight: "1.8",
                  }}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveLyrics}
                    disabled={lyricsSaving}
                    style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, color: GOLD }}
                  >
                    {lyricsSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Save Lyrics
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ CREATION DISCLOSURE ═════════════════════════════════════ */}
          <SectionDivider label="Creation Disclosure" />

          <div className="mb-6">
            <button
              className="w-full flex items-center justify-between py-2 transition-opacity hover:opacity-80"
              onClick={() => setDisclosureExpanded((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: GOLD }} />
                <span className="text-xs tracking-[0.15em] uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
                  AI Disclosure &amp; Training Consent
                </span>
              </div>
              {disclosureExpanded ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} /> : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />}
            </button>

            {disclosureExpanded && (
              <div className="mt-4 space-y-5">
                {/* Creation method */}
                <div>
                  <FieldLabel hint="How was this work created?">Creation Method</FieldLabel>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {DISCLOSURE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAiDisclosure(opt.value)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                        style={{
                          background: aiDisclosure === opt.value ? GOLD_DIM : "rgba(255,255,255,0.03)",
                          border: `1px solid ${aiDisclosure === opt.value ? GOLD_BORDER : "rgba(255,255,255,0.08)"}`,
                          color: aiDisclosure === opt.value ? GOLD : "rgba(255,255,255,0.6)",
                        }}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span className="text-sm">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Training consent */}
                <div>
                  <FieldLabel hint="Can this work be used to train AI models?">AI Training Consent</FieldLabel>
                  <div className="space-y-2 mt-2">
                    {AI_CONSENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAiConsent(opt.value)}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                        style={{
                          background: aiConsent === opt.value ? GOLD_DIM : "rgba(255,255,255,0.03)",
                          border: `1px solid ${aiConsent === opt.value ? GOLD_BORDER : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <div
                          className="mt-0.5 w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{
                            border: `2px solid ${aiConsent === opt.value ? GOLD : "rgba(255,255,255,0.3)"}`,
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
            className="rounded-xl p-4 mb-6"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}
          >
            {!deleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}>Remove This Work</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(239,68,68,0.55)" }}>This cannot be undone. The testimony will be lost.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteConfirm(true)}
                  style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444", background: "transparent" }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
                  <p className="text-sm font-semibold" style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}>
                    Are you certain? This cannot be undone.
                  </p>
                </div>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(239,68,68,0.65)" }}>
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
                    style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", background: "transparent" }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Footer / Save Bar ── */}
        <div
          className="sticky bottom-0 px-6 py-4 flex items-center justify-between gap-3"
          style={{
            background: `linear-gradient(0deg, ${SURFACE} 70%, transparent)`,
            borderTop: `1px solid ${GOLD_BORDER}`,
          }}
        >
          <button
            onClick={onClose}
            className="text-sm transition-opacity hover:opacity-80"
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
                ? "rgba(34,197,94,0.18)"
                : `linear-gradient(135deg, rgba(212,175,55,0.22), rgba(212,175,55,0.12))`,
              border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : GOLD_BORDER}`,
              color: saved ? "#22c55e" : GOLD,
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.1em",
              minWidth: 140,
              transition: "all 0.3s ease",
              boxShadow: saved ? "0 0 20px rgba(34,197,94,0.15)" : "0 0 20px rgba(212,175,55,0.08)",
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
