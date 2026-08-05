/**
 * ExperienceColumn — ACT III
 *
 * The primary reading, listening, and viewing experience for every artifact.
 * Seven independently expandable/collapsible sections:
 *
 *   1. Overview     — description, tags, genre, runtime, registration date, primary media
 *   2. Story        — creator notes, background, inspiration, intent (HAAI origin story)
 *   3. Primary      — type-aware content renderer (lyrics, pages, excerpt, gallery, etc.)
 *   4. Media        — images, videos, audio, attachments gallery
 *   5. Versions     — current version, history, forks, derivatives
 *   6. Dev Notes    — AI sessions, HAAI disclosure, build notes, future plans
 *   7. Comments     — threaded comments + emoji reactions (existing logic preserved)
 *
 * Design: maximum reading width, generous whitespace, museum-exhibit feel.
 * Desktop: expands naturally. Tablet: reduced spacing. Mobile: single column.
 */

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, MessageSquare, BookOpen, Layers, Music, FileText, Image as ImageIcon, Video, Hash, ExternalLink, Clock, Calendar, Tag, Fingerprint, Shield, Heart, Download, StickyNote, Link2, FileText as FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Section wrapper ────────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
  empty?: boolean;
}

function ExperienceSection({ id, title, icon, defaultOpen = true, badge, children, empty }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (empty) return null;
  return (
    <section
      id={`exp-${id}`}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(8,6,16,0.97)",
        border: "1px solid rgba(196,154,40,0.12)",
      }}
    >
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: "rgba(196,154,40,0.65)" }}>{icon}</span>
          <span
            className="text-sm font-semibold tracking-[0.06em] uppercase"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            {title}
          </span>
          {badge !== undefined && badge !== 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full tabular-nums"
              style={{ background: "rgba(196,154,40,0.10)", color: "rgba(196,154,40,0.65)", border: "1px solid rgba(196,154,40,0.18)" }}
            >
              {badge}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp size={14} style={{ color: "rgba(196,154,40,0.45)", flexShrink: 0 }} />
          : <ChevronDown size={14} style={{ color: "rgba(196,154,40,0.45)", flexShrink: 0 }} />}
      </button>

      {/* Body */}
      {open && (
        <div
          className="px-5 pb-6"
          style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}
        >
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function SectionDivider() {
  return <div style={{ height: 1, background: "rgba(196,154,40,0.08)", margin: "1.25rem 0" }} />;
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.45)" }}>{icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>{label}</span>
        <span className="text-sm" style={{ color: "var(--ln-smoke)" }}>{value}</span>
      </div>
    </div>
  );
}

// ─── Primary Content Renderer (type-aware) ──────────────────────────────────

function PrimaryContentRenderer({ song, isOwner, onCopyLyrics }: { song: any; isOwner: boolean; onCopyLyrics?: () => void }) {
  const contentType = song.contentType ?? "audio";

  // Music → Lyrics
  if (contentType === "audio" || contentType === "lyrics") {
    if (!song.lyricsText) {
      return (
        <p className="text-sm py-4 text-center" style={{ color: "var(--ln-iron)" }}>
          {contentType === "lyrics" ? "Lyrics protected — audio not yet attached." : "No lyrics registered for this work."}
        </p>
      );
    }
    return (
      <div>
        {song.isLyricsOnly && (
          <div className="flex items-center gap-1.5 mb-4 px-3 py-2 rounded-lg" style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.18)" }}>
            <Shield size={12} style={{ color: "var(--ln-gold)" }} />
            <span className="text-[11px]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>Lyrics Protected — Audio Not Yet Attached</span>
          </div>
        )}
        <pre
          className="whitespace-pre-wrap leading-[1.9] text-sm font-normal select-text"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)",
            color: "var(--ln-bone)",
            letterSpacing: "0.01em",
          }}
          onCopy={e => {
            if (!song.witnessId) return;
            const selected = window.getSelection()?.toString() || "";
            if (!selected.trim()) return;
            const registeredDate = song.createdAt
              ? new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
              : "Unknown date";
            const attribution = `\n\n— "${song.title}" by ${song.artistHandle || song.creatorName || "Unknown"}\n   WID: ${song.witnessId}\n   Registered: ${registeredDate}\n   © ${new Date(song.createdAt ?? Date.now()).getFullYear()} Living Nexus Registry`;
            e.clipboardData.setData("text/plain", selected + attribution);
            e.preventDefault();
            toast.success("Lyrics copied with attribution");
          }}
        >
          {song.lyricsText}
        </pre>
      </div>
    );
  }

  // Manuscript / Book → pages from pagesJson
  if (contentType === "manuscript") {
    const pages = (() => {
      try { return JSON.parse(song.pagesJson ?? "[]"); } catch { return []; }
    })();
    if (!pages.length) return <p className="text-sm py-4 text-center" style={{ color: "var(--ln-iron)" }}>No pages registered for this manuscript.</p>;
    return (
      <div className="space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>{pages.length} page{pages.length !== 1 ? "s" : ""} registered</p>
        <div className="grid grid-cols-4 gap-2">
          {pages.slice(0, 8).map((p: any, i: number) => (
            <div key={i} className="aspect-[3/4] rounded-lg overflow-hidden" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
              {p.imageUrl && <img src={p.imageUrl} alt={`Page ${p.pageNumber ?? i + 1}`} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
        {pages.length > 8 && <p className="text-[11px] text-center" style={{ color: "var(--ln-iron)" }}>+{pages.length - 8} more pages</p>}
      </div>
    );
  }

  // Comic → pages
  if (contentType === "comic") {
    const pages = (() => {
      try { return JSON.parse(song.pagesJson ?? "[]"); } catch { return []; }
    })();
    if (!pages.length) return <p className="text-sm py-4 text-center" style={{ color: "var(--ln-iron)" }}>No pages registered for this comic.</p>;
    return (
      <div className="space-y-2">
        <p className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>{pages.length} page{pages.length !== 1 ? "s" : ""} in this comic</p>
        <div className="grid grid-cols-3 gap-2">
          {pages.slice(0, 6).map((p: any, i: number) => (
            <div key={i} className="aspect-[2/3] rounded-lg overflow-hidden" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
              {p.imageUrl && <img src={p.imageUrl} alt={`Page ${p.pageNumber ?? i + 1}`} className="w-full h-full object-cover" />}
            </div>
          ))}
        </div>
        {pages.length > 6 && <p className="text-[11px] text-center" style={{ color: "var(--ln-iron)" }}>+{pages.length - 6} more pages</p>}
      </div>
    );
  }

  // Image → gallery
  if (contentType === "image") {
    const gallery = (() => {
      try { return JSON.parse(song.galleryImagesJson ?? "[]"); } catch { return []; }
    })();
    if (!gallery.length && song.coverArtUrl) {
      return (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(196,154,40,0.12)" }}>
          <img src={song.coverArtUrl} alt={song.title} className="w-full object-contain" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-2">
        {gallery.map((img: any, i: number) => (
          <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(196,154,40,0.12)" }}>
            <img src={img.url} alt={img.caption || `Image ${i + 1}`} className="w-full object-cover" loading="lazy" />
            {img.caption && <p className="text-[10px] px-2 py-1" style={{ color: "var(--ln-iron)" }}>{img.caption}</p>}
          </div>
        ))}
      </div>
    );
  }

  // Game → creator notes / overview
  if (contentType === "game") {
    if (!song.creatorNotes && !song.description) {
      return <p className="text-sm py-4 text-center" style={{ color: "var(--ln-iron)" }}>No documentation registered for this game.</p>;
    }
    return (
      <div className="space-y-4">
        {song.description && <p className="text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{song.description}</p>}
        {song.creatorNotes && (
          <div>
            <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>Designer Notes</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ln-smoke)" }}>{song.creatorNotes}</p>
          </div>
        )}
      </div>
    );
  }

  // Default fallback
  return (
    <p className="text-sm py-4 text-center" style={{ color: "var(--ln-iron)" }}>
      No primary content registered for this work.
    </p>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ExperienceColumnProps {
  song: any;
  creator: any;
  isOwner: boolean;
  songId: number;
  // Comments / reactions (passed from SongDetailPage to preserve existing logic)
  comments: any[];
  commentText: string;
  setCommentText: (v: string) => void;
  commentMutation: any;
  replyMutation: any;
  replyingTo: any;
  setReplyingTo: (v: any) => void;
  replyText: string;
  setReplyText: (v: string) => void;
  reactionCounts: Record<string, number>;
  myReactionsSet: Set<string>;
  handleReaction: (slug: string) => void;
  REACTION_SLUGS: string[];
  REACTION_EMOJI: Record<string, string>;
  eventThread: any[];
  relatedData: any[];
  // Evidence
  evidenceItems: any[];
  // Actions
  isLiked: boolean;
  likeCount: number;
  toggleLike: (e: React.MouseEvent) => void;
  handleShare: () => void;
  // Version history
  versionHistoryOpen: boolean;
  setVersionHistoryOpen: (v: boolean) => void;
}

export function ExperienceColumn({
  song,
  creator,
  isOwner,
  songId,
  comments,
  commentText,
  setCommentText,
  commentMutation,
  replyMutation,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  reactionCounts,
  myReactionsSet,
  handleReaction,
  REACTION_SLUGS,
  REACTION_EMOJI,
  eventThread,
  relatedData,
  evidenceItems,
  isLiked,
  likeCount,
  toggleLike,
  handleShare,
  versionHistoryOpen,
  setVersionHistoryOpen,
}: ExperienceColumnProps) {
  const { user } = useAuth();
  const contentType = song.contentType ?? "audio";

  // ── OVERVIEW data ──────────────────────────────────────────────────────────
  const description = (song as any).description || (song as any).headlineCaption;
  const tags: string[] = (() => {
    try { return JSON.parse((song as any).tagsJson ?? "[]"); } catch { return []; }
  })();
  const genre = song.genre;
  const durationSec = song.durationSeconds;
  const runtime = durationSec
    ? `${Math.floor(durationSec / 60)}:${String(Math.round(durationSec % 60)).padStart(2, "0")}`
    : null;
  const registrationDate = song.createdAt
    ? new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const externalLinks: Array<{ platform: string; url: string }> = (() => {
    try { return JSON.parse((song as any).externalLinksJson ?? "[]"); } catch { return []; }
  })();
  const hasOverview = !!(description || tags.length || genre || runtime || registrationDate || externalLinks.length);

  // ── STORY data ─────────────────────────────────────────────────────────────
  const originStory = (song as any).haaiOriginStory;
  const hasStory = !!originStory;

  // ── PRIMARY CONTENT ────────────────────────────────────────────────────────
  const hasPrimary = !!(
    song.lyricsText ||
    (song as any).pagesJson ||
    (song as any).galleryImagesJson ||
    (song as any).creatorNotes ||
    description
  );

  // ── MEDIA data ─────────────────────────────────────────────────────────────
  const gallery: Array<{ url: string; caption?: string }> = (() => {
    try { return JSON.parse((song as any).galleryImagesJson ?? "[]"); } catch { return []; }
  })();
  const videoUrl = (song as any).videoUrl;
  const hasMedia = !!(gallery.length || videoUrl || song.coverArtUrl);

  // ── DEV NOTES data ─────────────────────────────────────────────────────────
  const aiDisclosure = (song as any).aiDisclosure || creator?.aiDisclosure;
  const haaiFields = [
    { key: "haaiVisualConcept", label: "Visual Concept" },
    { key: "haaiStyleLanguage", label: "Style Language" },
    { key: "haaiInstrumentation", label: "Instrumentation" },
    { key: "haaiVocalConveyance", label: "Vocal Conveyance" },
    { key: "haaiLyricalInspiration", label: "Lyrical Inspiration" },
    { key: "haaiEmotionalTone", label: "Emotional Tone" },
  ].filter(f => (song as any)[f.key]);
  const hasDevNotes = !!(aiDisclosure || haaiFields.length || originStory);

  // ── VERSIONS data ──────────────────────────────────────────────────────────
  const witnessId = song.witnessId;
  const hasVersions = !!(witnessId || evidenceItems.length);

  // ── COMMENTS data ─────────────────────────────────────────────────────────
  const commentCount = comments?.length ?? 0;

  const disclosureMap: Record<string, { label: string; color: string; desc: string }> = {
    original: { label: "Original Human Authored", color: "rgba(134,239,172,0.9)", desc: "This work is original content authored entirely by the human creator. No AI generation was used." },
    ai_assisted: { label: "AI-Assisted", color: "rgba(196,154,40,0.9)", desc: "AI tools were used in the creation of this work. The creator remains the primary author." },
    human_authored_ai_instrument: { label: "HAAI — Human-Authored, AI-Informed", color: "rgba(196,154,40,0.9)", desc: "The human is the author. AI served as an instrument — a tool in service of the creator's sovereign vision." },
    ai_generated: { label: "AI-Assisted Manifestation", color: "rgba(167,139,250,0.9)", desc: "This work was created with significant AI generation. The creator shaped the vision, direction, and curation." },
  };

  return (
    <div className="flex flex-col gap-4 w-full">

      {/* ═══════════════════════════════════════════════════════════
          1. OVERVIEW
      ═══════════════════════════════════════════════════════════ */}
      <ExperienceSection
        id="overview"
        title="Overview"
        icon={<Tag size={14} />}
        defaultOpen={true}
        empty={!hasOverview}
      >
        <div className="pt-4 space-y-5">
          {/* Description */}
          {description && (
            <p
              className="leading-[1.8] text-base"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1rem, 1.5vw, 1.15rem)",
                color: "var(--ln-bone)",
                borderLeft: "2px solid rgba(196,154,40,0.35)",
                paddingLeft: "1rem",
              }}
            >
              {description}
            </p>
          )}

          {/* Meta grid */}
          {(genre || runtime || registrationDate) && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {genre && <MetaRow icon={<Music size={12} />} label="Genre" value={genre} />}
              {runtime && <MetaRow icon={<Clock size={12} />} label="Runtime" value={runtime} />}
              {registrationDate && <MetaRow icon={<Calendar size={12} />} label="Registered" value={registrationDate} />}
              {song.bpm && <MetaRow icon={<Fingerprint size={12} />} label="BPM" value={String(song.bpm)} />}
              {song.keySignature && <MetaRow icon={<Music size={12} />} label="Key" value={song.keySignature} />}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t: string, i: number) => (
                <Badge key={i} style={{ background: "rgba(196,154,40,0.06)", color: "rgba(196,154,40,0.75)", border: "1px solid rgba(196,154,40,0.18)", fontSize: "10px" }}>
                  {t}
                </Badge>
              ))}
            </div>
          )}

          {/* Genre chips */}
          {genre && (
            <div className="flex flex-wrap gap-1.5">
              {genre.split(",").map((g: string) => g.trim()).filter(Boolean).map((g: string, i: number) => (
                <Badge key={i} style={{ background: "rgba(196,154,40,0.06)", color: "rgba(196,154,40,0.75)", border: "1px solid rgba(196,154,40,0.18)", fontSize: "10px" }}>
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {/* External links */}
          {externalLinks.length > 0 && (
            <>
              <SectionDivider />
              <div>
                <p className="text-[9px] tracking-widest uppercase mb-2.5" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>Find It Elsewhere</p>
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:scale-[1.03]"
                      style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.22)", color: "rgba(212,175,55,0.85)", fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }}
                    >
                      <ExternalLink size={10} />
                      {link.platform}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ExperienceSection>

      {/* ═══════════════════════════════════════════════════════════
          2. STORY
      ═══════════════════════════════════════════════════════════ */}
      <ExperienceSection
        id="story"
        title="Story"
        icon={<BookOpen size={14} />}
        defaultOpen={true}
        empty={!hasStory}
      >
        <div className="pt-4">
          {/* Origin story — Cormorant Garamond, gold pillar */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(196,154,40,0.04) 0%, rgba(8,6,16,0.98) 60%)",
              border: "1px solid rgba(196,154,40,0.18)",
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{ width: "3px", background: "linear-gradient(to bottom, transparent 0%, rgba(196,154,40,0.7) 20%, rgba(196,154,40,0.9) 50%, rgba(196,154,40,0.7) 80%, transparent 100%)" }}
            />
            <div className="px-6 py-6 pl-8">
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "3rem", lineHeight: 0.8, color: "rgba(196,154,40,0.18)", userSelect: "none", marginBottom: "0.75rem" }}>
                &#8220;
              </div>
              <p
                className="leading-[1.85] whitespace-pre-wrap"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1rem, 1.5vw, 1.15rem)", color: "var(--ln-bone)", fontWeight: 500, letterSpacing: "0.015em" }}
              >
                {originStory}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div style={{ width: 24, height: 1, background: "rgba(196,154,40,0.4)" }} />
                <span className="text-xs" style={{ fontFamily: "'Cinzel', serif", color: "rgba(196,154,40,0.6)", letterSpacing: "0.06em" }}>
                  {creator?.artistHandle || creator?.name || "The Creator"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </ExperienceSection>

      {/* ═══════════════════════════════════════════════════════════
          3. PRIMARY CONTENT
      ═══════════════════════════════════════════════════════════ */}
      <ExperienceSection
        id="primary"
        title={
          contentType === "audio" || contentType === "lyrics" ? "Lyrics" :
          contentType === "manuscript" ? "Pages" :
          contentType === "comic" ? "Comic" :
          contentType === "game" ? "Documentation" :
          contentType === "image" ? "Gallery" :
          "Content"
        }
        icon={
          contentType === "audio" || contentType === "lyrics" ? <FileText size={14} /> :
          contentType === "manuscript" || contentType === "comic" ? <BookOpen size={14} /> :
          contentType === "image" ? <ImageIcon size={14} /> :
          contentType === "game" ? <Layers size={14} /> :
          <FileText size={14} />
        }
        defaultOpen={true}
        empty={!hasPrimary}
      >
        <div className="pt-4">
          <PrimaryContentRenderer song={song} isOwner={isOwner} />
        </div>
      </ExperienceSection>

      {/* ═══════════════════════════════════════════════════════════
          4. MEDIA
      ═══════════════════════════════════════════════════════════ */}
      <ExperienceSection
        id="media"
        title="Media"
        icon={<ImageIcon size={14} />}
        defaultOpen={false}
        badge={gallery.length || undefined}
        empty={!hasMedia}
      >
        <div className="pt-4 space-y-4">
          {/* Video */}
          {videoUrl && (
            <div>
              <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>Video</p>
              <div className="rounded-xl overflow-hidden" style={{ aspectRatio: "16/9", background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
                <video src={videoUrl} className="w-full h-full object-contain" controls playsInline />
              </div>
            </div>
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <div>
              <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>Gallery</p>
              <div className="grid grid-cols-2 gap-2">
                {gallery.map((img, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(196,154,40,0.12)" }}>
                    <img
                      src={img.url}
                      alt={img.caption || `Gallery image ${i + 1}`}
                      className="w-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                      loading="lazy"
                      onClick={() => window.open(img.url, "_blank")}
                    />
                    {img.caption && <p className="text-[10px] px-2 py-1" style={{ color: "var(--ln-iron)" }}>{img.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cover art (if no other media) */}
          {!gallery.length && !videoUrl && song.coverArtUrl && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(196,154,40,0.12)" }}>
              <img src={song.coverArtUrl} alt={song.title} className="w-full object-cover" />
            </div>
          )}
        </div>
      </ExperienceSection>

      {/* ═══════════════════════════════════════════════════════════
          5. VERSIONS
      ═══════════════════════════════════════════════════════════ */}
      <ExperienceSection
        id="versions"
        title="Versions"
        icon={<Hash size={14} />}
        defaultOpen={false}
        empty={!hasVersions}
      >
        <div className="pt-4 space-y-4">
          {/* Current version / WID */}
          {witnessId && (
            <div className="rounded-xl px-4 py-3" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.18)" }}>
              <p className="text-[9px] tracking-widest uppercase mb-1.5" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>Current Version</p>
              <div className="flex items-center gap-2">
                <Shield size={12} style={{ color: "var(--ln-gold)" }} />
                <span className="text-xs font-mono break-all" style={{ color: "var(--ln-smoke)" }}>{witnessId}</span>
              </div>
              {song.createdAt && (
                <p className="text-[10px] mt-1" style={{ color: "var(--ln-iron)" }}>
                  Registered {new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
          )}

          {/* Evidence / proof artifacts */}
          {evidenceItems.length > 0 && (
            <div>
              <p className="text-[9px] tracking-widest uppercase mb-2" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>Proof Artifacts</p>
              <div className="space-y-2">
                {evidenceItems.map((item: any) => {
                  const iconMap: Record<string, any> = { file: FileTextIcon, link: Link2, note: StickyNote };
                  const colorMap: Record<string, string> = { file: "rgba(196,154,40,0.8)", link: "rgba(96,165,250,0.8)", note: "rgba(167,243,208,0.8)" };
                  const labelMap: Record<string, string> = { file: "File", link: "Link", note: "Note" };
                  const Icon = iconMap[item.type] ?? FileTextIcon;
                  const color = colorMap[item.type] ?? "rgba(196,154,40,0.8)";
                  return (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,154,40,0.10)" }}>
                      <div className="flex-shrink-0 mt-0.5 p-1.5 rounded-lg" style={{ background: "rgba(196,154,40,0.07)" }}>
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{item.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: "rgba(196,154,40,0.06)", color, border: `1px solid ${color.replace("0.8", "0.25")}` }}>{labelMap[item.type] ?? item.type}</span>
                        </div>
                        {item.type === "note" && item.noteBody && (
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{item.noteBody}</p>
                        )}
                        {item.url && item.type !== "note" && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs mt-1 hover:underline" style={{ color: "rgba(96,165,250,0.8)" }}>
                            <ExternalLink className="w-3 h-3" />
                            {item.type === "file" ? "View file" : item.url.slice(0, 48) + (item.url.length > 48 ? "…" : "")}
                          </a>
                        )}
                        {item.hash && (
                          <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", color: "rgba(74,222,128,0.7)" }}>
                            <Hash className="w-2.5 h-2.5" />{item.hash.slice(0, 16)}…
                          </div>
                        )}
                        <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Added {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Version history button */}
          <button
            type="button"
            onClick={() => setVersionHistoryOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs transition-all hover:opacity-80"
            style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.15)", color: "rgba(196,154,40,0.65)", fontFamily: "'Cinzel', serif", letterSpacing: "0.05em" }}
          >
            <Clock size={11} /> View Full Version History
          </button>
        </div>
      </ExperienceSection>

      {/* ═══════════════════════════════════════════════════════════
          6. DEVELOPMENT NOTES
      ═══════════════════════════════════════════════════════════ */}
      <ExperienceSection
        id="devnotes"
        title="Development Notes"
        icon={<Layers size={14} />}
        defaultOpen={false}
        empty={!hasDevNotes}
      >
        <div className="pt-4 space-y-4">
          {/* AI Disclosure badge */}
          {aiDisclosure && disclosureMap[aiDisclosure] && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.18)" }}>
              <Shield size={14} style={{ color: disclosureMap[aiDisclosure].color, flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: disclosureMap[aiDisclosure].color, fontFamily: "'Cinzel', serif" }}>
                  {disclosureMap[aiDisclosure].label}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
                  {disclosureMap[aiDisclosure].desc}
                </p>
              </div>
            </div>
          )}

          {/* HAAI fields */}
          {haaiFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>HAAI Declaration</p>
              {haaiFields.map(f => (
                <div key={f.key} className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,154,40,0.10)" }}>
                  <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>{f.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{(song as any)[f.key]}</p>
                </div>
              ))}
            </div>
          )}

          {/* Sovereign stamp */}
          {(song as any).sovereignStampId && (
            <div className="rounded-xl p-4" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.3)" }}>
              <div className="flex items-start gap-3">
                <span style={{ fontSize: "16px", lineHeight: 1 }}>🔏</span>
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>Sovereign Stamp Applied</p>
                  <p className="text-[11px] font-mono break-all" style={{ color: "#E2E8F0" }}>{(song as any).sovereignStampId}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--ln-smoke)" }}>Near-ultrasonic tone embedded — 17 U.S.C. § 102(a)</p>
                </div>
              </div>
            </div>
          )}

          {/* Harmonic signature downloads (owner only) */}
          {isOwner && (song as any).harmonicSignature && (
            <div className="flex flex-wrap gap-2">
              <a href={`/api/harmonic/${songId}/audio`} download className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity" style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                <Download className="w-3 h-3" />Harmonic Tone (.wav)
              </a>
              <a href={`/api/harmonic/${songId}/image`} download className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity" style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                <Download className="w-3 h-3" />Waveform Image (.png)
              </a>
            </div>
          )}
        </div>
      </ExperienceSection>

      {/* ═══════════════════════════════════════════════════════════
          7. COMMENTS
      ═══════════════════════════════════════════════════════════ */}
      <ExperienceSection
        id="comments"
        title="Comments"
        icon={<MessageSquare size={14} />}
        defaultOpen={true}
        badge={commentCount || undefined}
      >
        <div className="pt-4 space-y-4">
          {/* Emoji Reactions */}
          <div className="flex flex-wrap gap-2">
            {REACTION_SLUGS.map((slug: string) => (
              <button
                type="button"
                key={slug}
                onClick={() => handleReaction(slug)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-110 active:scale-95"
                style={{
                  background: myReactionsSet.has(slug) ? "rgba(196,154,40,0.15)" : "var(--ln-coal)",
                  border: `1px solid ${myReactionsSet.has(slug) ? "rgba(196,154,40,0.3)" : "var(--ln-gold)"}`,
                }}
              >
                <span>{REACTION_EMOJI[slug] ?? slug}</span>
                {reactionCounts[slug] ? <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{reactionCounts[slug]}</span> : null}
              </button>
            ))}
          </div>

          <SectionDivider />

          {/* Comment input */}
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: "var(--ln-coal)" }}>
              {user ? (user.name || "?").charAt(0).toUpperCase() : "?"}
            </div>
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder={user ? "Write a comment…" : "Sign in to comment"}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                disabled={!user}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                    e.preventDefault();
                    commentMutation.mutate({ songId, content: commentText.trim() });
                  }
                }}
                style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-parchment)", fontSize: "13px", height: "36px" }}
              />
              {commentText.trim() && (
                <Button
                  size="sm"
                  onClick={() => commentMutation.mutate({ songId, content: commentText.trim() })}
                  disabled={commentMutation.isPending}
                  className="h-7 text-[11px] px-3"
                  style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
                >
                  Post
                </Button>
              )}
            </div>
          </div>

          {/* Comment list */}
          <div className="space-y-3">
            {comments && comments.length > 0 ? (
              (comments as any[]).map((c: any) => {
                const isReplying = replyingTo?.id === c.id;
                return (
                  <div key={c.id} className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,154,40,0.08)" }}>
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: "var(--ln-coal)" }}>
                        <span style={{ color: "var(--ln-iron)" }}>{(c.authorName || "A").charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium" style={{ color: "var(--ln-smoke)" }}>{c.authorName || "Anonymous"}</span>
                          <span className="text-[9px] ml-auto" style={{ color: "var(--ln-iron)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }}>{c.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          {user && (
                            <button
                              type="button"
                              className="text-[10px] hover:opacity-80 transition-opacity"
                              style={{ color: "rgba(196,154,40,0.55)" }}
                              onClick={() => setReplyingTo(isReplying ? null : { id: c.id, authorName: c.authorName })}
                            >
                              {isReplying ? "Cancel" : "Reply"}
                            </button>
                          )}
                          {c.replies?.length > 0 && (
                            <span className="text-[10px]" style={{ color: "var(--ln-iron)" }}>
                              {c.replies.length} {c.replies.length === 1 ? "reply" : "replies"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline reply input */}
                    {isReplying && (
                      <div className="ml-9 mt-2 flex gap-2">
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--ln-coal)" }}>
                          {user ? (user.name || "?").charAt(0).toUpperCase() : "?"}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <Input
                            placeholder={`Reply to ${replyingTo?.authorName ?? "comment"}…`}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                                e.preventDefault();
                                replyMutation.mutate({ songId, parentId: c.id, content: replyText.trim() });
                              }
                              if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                            }}
                            style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-parchment)", fontSize: "12px", height: "32px" }}
                            autoFocus
                          />
                          {replyText.trim() && (
                            <Button
                              size="sm"
                              onClick={() => replyMutation.mutate({ songId, parentId: c.id, content: replyText.trim() })}
                              disabled={replyMutation.isPending}
                              className="h-6 text-[11px] px-2"
                              style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
                            >
                              Post reply
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Nested replies */}
                    {c.replies?.length > 0 && (
                      <div className="ml-9 mt-2 space-y-2 pl-3" style={{ borderLeft: "1px solid rgba(196,154,40,0.15)" }}>
                        {(c.replies as any[]).map((r: any) => (
                          <div key={r.id} className="flex gap-2">
                            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--ln-coal)" }}>
                              <span style={{ color: "var(--ln-iron)" }}>{(r.authorName || "A").charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[11px] font-medium" style={{ color: "var(--ln-smoke)" }}>{r.authorName || "Anonymous"}</span>
                                <span className="text-[9px] ml-auto" style={{ color: "var(--ln-iron)" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-center py-4" style={{ color: "var(--ln-iron)" }}>Be the first to comment</p>
            )}
          </div>

          {/* Related works */}
          {relatedData && relatedData.length > 0 && (
            <>
              <SectionDivider />
              <div>
                <p className="text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>Related Works</p>
                <div className="space-y-1">
                  {relatedData.map((item: any) => (
                    <div key={item.song.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => window.location.href = `/song/${item.song.id}`}>
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--ln-coal)" }}>
                        {item.song.coverArtUrl && <img src={item.song.coverArtUrl} alt={item.song.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--ln-smoke)" }}>{item.song.title}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--ln-iron)" }}>{item.song.artistHandle || item.song.creatorName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ExperienceSection>
    </div>
  );
}
