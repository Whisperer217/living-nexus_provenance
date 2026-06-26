/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  EDIT CHAPEL — Living Nexus                                             ║
  ║  A sacred, unified track-editing experience.                            ║
  ║  "Editing a work should feel like stepping into a private chapel —      ║
  ║   calm, intentional, and reverent."                                     ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

import { useState, useEffect, useRef } from "react";
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
  Eye,
} from "lucide-react";
import { EDIT_GENRES as GENRES } from "@shared/contentTypes";

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
  description?: string | null;
  witnessId?: string | null;
}

interface EditChapelProps {
  song: ChapelSong;
  onClose: () => void;
  onSaved: () => void;
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

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
        <span
          className="text-xs tracking-[0.22em] uppercase"
          style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}
        >
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
      <Label
        className="text-xs tracking-[0.14em] uppercase"
        style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}
      >
        {children}
      </Label>
      {hint && (
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: TEXT_DIM }}>
          {hint}
        </p>
      )}
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
  const [description, setDescription]   = useState(song.description ?? "");
  const [status, setStatus]             = useState<string>(song.status ?? "Published");
  const [aiConsent, setAiConsent]       = useState<string>(song.aiConsent ?? "prohibited");
  const [aiDisclosure, setAiDisclosure] = useState<string>(song.aiDisclosure ?? "original");
  const [originStory, setOriginStory]   = useState(song.haaiOriginStory ?? "");
  const [lyrics, setLyrics]             = useState(song.lyricsText ?? "");
  const [creationDate, setCreationDate] = useState(
    song.releaseDate ? song.releaseDate.slice(0, 10) : ""
  );

  /* ── Cover art ── */
  const [coverUrl, setCoverUrl]             = useState(song.coverArtUrl ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef                       = useRef<HTMLInputElement>(null);

  /* ── UI state ── */
  const [lyricsExpanded, setLyricsExpanded]         = useState(false);
  const [disclosureExpanded, setDisclosureExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm]           = useState(false);
  const [saving, setSaving]                         = useState(false);
  const [deleting, setDeleting]                     = useState(false);
  const [saved, setSaved]                           = useState(false);
  const [lyricsSaving, setLyricsSaving]             = useState(false);
  const [coverHovered, setCoverHovered]             = useState(false);

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
    } catch (e: unknown) {
      toast.error((e as Error).message || "Cover upload failed");
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
      description: description || null,
      status: status as "Draft" | "Published" | "Unlisted",
      aiConsent: aiConsent as "prohibited" | "permitted_attribution" | "permitted",
      aiDisclosure: aiDisclosure as "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument",
      haaiOriginStory: originStory || null,
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
          background: "radial-gradient(ellipse at 65% 35%, rgba(30,15,55,0.88) 0%, rgba(0,0,0,0.94) 100%)",
          opacity: visible ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* ── Drawer ── */}
      <div
        className="absolute top-0 right-0 h-full flex flex-col"
        style={{
          width: "min(600px, 100vw)",
          background: SURFACE,
          borderLeft: `1px solid ${GOLD_BORDER}`,
          boxShadow: `-32px 0 100px rgba(0,0,0,0.75), -4px 0 32px ${GOLD_GLOW}`,
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
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
            <p
              className="text-xs tracking-[0.28em] uppercase mb-0.5"
              style={{ color: GOLD, fontFamily: "'Cinzel', serif", opacity: 0.65 }}
            >
              Edit Chapel
            </p>
            <h2
              className="text-sm font-semibold truncate max-w-[380px]"
              style={{ color: "rgba(255,255,255,0.88)", fontFamily: "'Cinzel', serif" }}
            >
              {song.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {song.witnessId && (
              <a
                href={`/song/${song.witnessId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-90"
                style={{
                  background: GOLD_DIM,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: GOLD,
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.08em",
                }}
                title="View public page"
              >
                <Eye className="w-3 h-3" />
                Preview
              </a>
            )}
            <button
              onClick={onClose}
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
            style={{
              height: 220,
              background: SURFACE2,
              borderBottom: `1px solid ${GOLD_BORDER}`,
            }}
            onClick={() => coverInputRef.current?.click()}
            onMouseEnter={() => setCoverHovered(true)}
            onMouseLeave={() => setCoverHovered(false)}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Cover art"
                className="w-full h-full object-cover"
                style={{ transition: "transform 0.5s ease", transform: coverHovered ? "scale(1.03)" : "scale(1)" }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
                >
                  <Music className="w-8 h-8" style={{ color: GOLD, opacity: 0.5 }} />
                </div>
                <span className="text-sm tracking-widest uppercase" style={{ color: TEXT_MUTED, fontFamily: "'Cinzel', serif" }}>
                  No Cover Art
                </span>
              </div>
            )}

            {/* Gradient overlay always present at bottom */}
            <div
              className="absolute inset-x-0 bottom-0"
              style={{ height: 80, background: "linear-gradient(0deg, rgba(8,6,16,0.85) 0%, transparent 100%)" }}
            />

            {/* Hover overlay */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity duration-300"
              style={{
                background: "rgba(0,0,0,0.55)",
                opacity: coverHovered ? 1 : 0,
              }}
            >
              {coverUploading ? (
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: GOLD }} />
              ) : (
                <>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
                  >
                    <ImageIcon className="w-6 h-6" style={{ color: GOLD }} />
                  </div>
                  <span
                    className="text-sm tracking-widest uppercase"
                    style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}
                  >
                    {coverUrl ? "Replace Art" : "Add Cover Art"}
                  </span>
                </>
              )}
            </div>

            {/* Bottom-left: upload hint */}
            <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
              <Upload className="w-3 h-3" style={{ color: GOLD, opacity: 0.6 }} />
              <span className="text-xs" style={{ color: GOLD, opacity: 0.6 }}>
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
          <div className="px-7 pt-7">

            {/* ═══ TITLE ═══════════════════════════════════════════════ */}
            <div className="mb-6">
              <FieldLabel>Title</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Work title"
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.94)",
                  fontFamily: "'Cinzel', serif",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  padding: "0.65rem 0.9rem",
                  height: "auto",
                  boxShadow: title ? `0 0 20px ${GOLD_GLOW} inset` : "none",
                  transition: "box-shadow 0.3s ease",
                }}
              />
            </div>

            {/* ═══ CORE METADATA ═══════════════════════════════════════ */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Genre */}
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
                  <SelectContent style={{ background: "#0d0b1a", border: `1px solid ${GOLD_BORDER}` }}>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g} style={{ color: "rgba(255,255,255,0.8)" }}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
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
                  <SelectContent style={{ background: "#0d0b1a", border: `1px solid ${GOLD_BORDER}` }}>
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
              <FieldLabel hint="When was this work originally created? (Not the upload date)">
                Original Creation Date
              </FieldLabel>
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
              <FieldLabel hint="A short note visible on your work's public page">Caption</FieldLabel>
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

            {/* Description */}
            <div className="mb-2">
              <FieldLabel hint="Extended description shown on the work's detail page">Description</FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Tell the story of this work in more depth…"
                style={{
                  background: SURFACE2,
                  border: `1px solid ${GOLD_BORDER}`,
                  color: "rgba(255,255,255,0.8)",
                  resize: "vertical",
                  lineHeight: "1.65",
                }}
              />
            </div>

            {/* ═══ ORIGIN STORY ════════════════════════════════════════ */}
            <SectionDivider label="Origin Story" icon={<Flame className="w-3.5 h-3.5" />} />

            <div className="mb-6">
              <p
                className="text-sm mb-4 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.36)", fontStyle: "italic" }}
              >
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
              <p className="text-xs mt-1.5 text-right" style={{ color: TEXT_DIM }}>
                {originStory.length} / 5000
              </p>
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
                  <span
                    className="text-sm"
                    style={{ color: lyricsExpanded ? GOLD : "rgba(255,255,255,0.6)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}
                  >
                    {lyrics ? "Edit Lyrics" : "Add Lyrics"}
                  </span>
                  {lyrics && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: GOLD_DIM, color: GOLD }}>
                      {lyrics.split("\n").length} lines
                    </span>
                  )}
                </div>
                {lyricsExpanded
                  ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />
                }
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
                    <span className="text-xs" style={{ color: TEXT_DIM }}>
                      Lyrics are saved separately from the main work metadata.
                    </span>
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

            {/* ═══ CREATION DISCLOSURE ═════════════════════════════════ */}
            <SectionDivider label="Creation Disclosure" icon={<Shield className="w-3.5 h-3.5" />} />

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
                  <span
                    className="text-sm"
                    style={{ color: disclosureExpanded ? GOLD : "rgba(255,255,255,0.6)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}
                  >
                    AI Disclosure &amp; Training Consent
                  </span>
                </div>
                {disclosureExpanded
                  ? <ChevronUp className="w-4 h-4" style={{ color: TEXT_MUTED }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: TEXT_MUTED }} />
                }
              </button>

              {disclosureExpanded && (
                <div className="mt-5 space-y-6">
                  {/* Creation method */}
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

                  {/* AI Training consent */}
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
                            style={{
                              border: `2px solid ${aiConsent === opt.value ? GOLD : "rgba(255,255,255,0.25)"}`,
                              background: aiConsent === opt.value ? GOLD : "transparent",
                            }}
                          />
                          <div>
                            <p
                              className="text-sm font-medium"
                              style={{ color: aiConsent === opt.value ? GOLD : "rgba(255,255,255,0.75)" }}
                            >
                              {opt.label}
                            </p>
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

            <div
              className="rounded-xl p-5 mb-6"
              style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.16)" }}
            >
              {!deleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="text-sm font-medium mb-0.5"
                      style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}
                    >
                      Remove This Work
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(239,68,68,0.5)" }}>
                      This cannot be undone. The testimony will be lost.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirm(true)}
                    style={{ borderColor: "rgba(239,68,68,0.35)", color: "#ef4444", background: "transparent" }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "#ef4444", fontFamily: "'Cinzel', serif" }}
                    >
                      Are you certain? This cannot be undone.
                    </p>
                  </div>
                  <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(239,68,68,0.6)" }}>
                    Deleting this work will permanently remove it from the platform, including its Witness ID record,
                    provenance chain, and all associated data.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ background: "#ef4444", color: "#fff", border: "none" }}
                    >
                      {deleting
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        : <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      }
                      Yes, Delete Forever
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(false)}
                      style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)", background: "transparent" }}
                    >
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
          className="sticky bottom-0 px-7 py-4 flex items-center justify-between gap-3"
          style={{
            background: `linear-gradient(0deg, ${SURFACE} 65%, transparent)`,
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
                ? "rgba(34,197,94,0.15)"
                : `linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.1))`,
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
