/**
 * BookDetailPage — dedicated detail page for manuscript and comic/novel works.
 * Route: /book/:id
 * Layout: cover art + metadata left, inline document viewer right.
 * Completely separate from SongDetailPage (music/audio).
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield, ChevronLeft, Share2, Copy, Heart, BookOpen,
  FileText, Download, ExternalLink, MessageSquare, Check, Play,
} from "lucide-react";
import { useLike } from "@/hooks/useLike";
import { WIDPanel } from "@/components/WIDPanel";
import { FlagContentButton } from "@/components/FlagContentButton";
import { HorizontalBookReader, type BookPage } from "@/components/reader/HorizontalBookReader";
import { StoryboardBuilder, type StoryboardPage } from "@/components/reader/StoryboardBuilder";

const REACTIONS = ["🔥", "😍", "😱", "🙌", "👍", "👎", "🤯", "+"];

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewerMode, setViewerMode] = useState<"preview" | "fullscreen">("preview");
  const [showFullText, setShowFullText] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [editPagesOpen, setEditPagesOpen] = useState(false);
  const [editedPagesJson, setEditedPagesJson] = useState<string | null>(null);

  const { data: songData, isLoading } = trpc.songs.getById.useQuery(
    { id: bookId },
    { enabled: bookId > 0, refetchOnWindowFocus: false }
  );
  const { data: comments, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: bookId },
    { enabled: bookId > 0 }
  );

  const commentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { setCommentText(""); refetchComments(); toast.success("Comment posted!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const { liked, toggle: toggleLike } = useLike(bookId);

  const updatePagesMutation = trpc.songs.updateMetadata.useMutation({
    onSuccess: () => {
      toast.success("Pages saved!");
      setEditPagesOpen(false);
      setEditedPagesJson(null);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  function handleSavePages() {
    if (editedPagesJson === null && storyboardPages.length > 0) {
      // No changes made — just close
      setEditPagesOpen(false);
      return;
    }
    updatePagesMutation.mutate({ songId: bookId, pagesJson: editedPagesJson });
  }

  const song = songData?.song;
  const creator = songData?.creator;
  const isOwner = user?.id === (creator as any)?.id;

  const artistName = (creator as any)?.artistHandle || (creator as any)?.name || "Unknown";
  const isComic = song?.contentType === "comic";
  const accentColor = isComic ? "#EF4444" : "#4ADE80";
  const typeLabel = isComic ? "Comic / Novel" : "Manuscript";
  const widPrefix = isComic ? "WID-CMX" : "WID-MAN";

  // Determine if the fileUrl is a PDF we can embed
  const fileUrl = (song as any)?.fileUrl as string | undefined;
  const isPdf = fileUrl?.toLowerCase().includes(".pdf") || fileUrl?.toLowerCase().includes("pdf");

  // Storyboard pages — parsed from pagesJson if available
  const pagesJson = (song as any)?.pagesJson as string | undefined;
  const storyboardPages: BookPage[] = (() => {
    if (!pagesJson) return [];
    try { return JSON.parse(pagesJson) as BookPage[]; } catch { return []; }
  })();
  const hasStoryboard = storyboardPages.length > 0;

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Guard: redirect immediately if the id segment is non-numeric, NaN, or not a positive integer
  // e.g. /book/abc, /book/-1, /book/0 all redirect to /explore
  if (!id || isNaN(bookId) || bookId <= 0) {
    navigate("/explore", { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1E2D3A" }}>
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "#CBB183", borderTopColor: "transparent" }} />
          <p className="text-sm font-heading" style={{ color: "#AA8E64" }}>Loading work…</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1E2D3A" }}>
        <div className="text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto opacity-30" style={{ color: "#CBB183" }} />
          <p className="font-heading text-lg" style={{ color: "#E6CDAE" }}>Work not found</p>
          <Button onClick={() => navigate("/explore")} variant="outline" style={{ borderColor: "#CBB183", color: "#CBB183" }}>
            Back to Explore
          </Button>
        </div>
      </div>
    );
  }

  // Redirect music/lyrics to SongDetailPage
  if (song.contentType === "audio" || song.contentType === "lyrics") {
    navigate(`/song/${bookId}`, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "linear-gradient(160deg, #1A2530 0%, #1E2D3A 40%, #232E35 100%)" }}>
      <Helmet>
        <title>{song.title} — {typeLabel} · Living Nexus</title>
        <meta name="description" content={`${song.title} by ${artistName} — ${typeLabel} witnessed on Living Nexus. ${song.witnessId ? `Witness ID: ${song.witnessId}` : ""}`} />
        {song.coverArtUrl && <meta property="og:image" content={song.coverArtUrl} />}
      </Helmet>

      {/* ── Top nav bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: "linear-gradient(180deg, #1A2530 0%, rgba(26,37,48,0.92) 100%)", borderBottom: "1px solid rgba(203,177,131,0.12)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => navigate(-1 as any)} className="flex items-center gap-2 text-sm transition-colors hover:text-[#CBB183]" style={{ color: "#AA8E64" }}>
          <ChevronLeft size={18} />
          <span className="font-heading tracking-wide text-xs">BACK</span>
        </button>
        <div className="flex items-center gap-1.5 text-[10px] font-heading tracking-widest font-bold px-3 py-1 rounded-full"
          style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}44` }}>
          <BookOpen size={10} />
          {typeLabel.toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-wide transition-all hover:opacity-90"
              style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }}>
              <Download size={13} />
              <span className="hidden sm:inline">Open PDF</span>
              <span className="sm:hidden">PDF</span>
            </a>
          )}
          {(song as any)?.lyricsText && (
            <button
              onClick={() => setShowFullText(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-wide transition-all hover:opacity-90"
              style={{ background: "rgba(203,177,131,0.12)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.35)" }}>
              <BookOpen size={13} />
              Read
            </button>
          )}
          <button onClick={handleCopyLink} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: "#AA8E64" }} title="Copy link">
            {copied ? <Check size={16} style={{ color: "#4ADE80" }} /> : <Copy size={16} />}
          </button>
          <button className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: "#AA8E64" }} title="Share">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* ── Hero row: cover + metadata ── */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Cover art — portrait 3:4 */}
          <div className="flex-shrink-0 w-full md:w-56">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "3/4", background: "#2C3438" }}>
              {song.coverArtUrl ? (
                <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-16 h-16 opacity-20" style={{ color: "#CBB183" }} />
                </div>
              )}
              {/* Gold rim overlay */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: "1px solid rgba(203,177,131,0.35)", boxShadow: "inset 0 0 24px rgba(203,177,131,0.06)" }} />
            </div>

            {/* Like + WID row under cover */}
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                onClick={(e) => toggleLike(e)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-pink-400" : "hover:text-pink-400"}`}
                style={{ color: liked ? undefined : "#AA8E64" }}
              >
                <Heart size={16} fill={liked ? "currentColor" : "none"} />
                <span className="text-xs font-heading">Like</span>
              </button>
              {song.witnessId && (
                <Link href={`/verify/${song.witnessId}`}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full font-heading tracking-wider"
                  style={{ background: "rgba(0,0,0,0.55)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.45)" }}>
                  <Shield size={9} />{widPrefix}
                </Link>
              )}
            </div>
          </div>

          {/* Metadata panel */}
          <div className="flex-1 space-y-4">
            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-1"
                style={{ fontFamily: "'Cinzel', serif", background: "linear-gradient(135deg, #F5E6C8 0%, #CBB183 50%, #D0A15F 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {song.title}
              </h1>
              <div className="flex items-center gap-2 text-sm" style={{ color: "#AA8E64" }}>
                <span>by</span>
                {(creator as any)?.id ? (
                  <Link href={`/creator/${(creator as any).id}`} className="hover:text-[#CBB183] transition-colors font-heading">
                    {artistName}
                  </Link>
                ) : (
                  <span className="font-heading">{artistName}</span>
                )}
              </div>
            </div>

            {/* Category chips */}
            {song.genre && (
              <div className="flex flex-wrap gap-2">
                {(song.genre as string).split(/[,/|]+/).map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                  <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full font-heading tracking-wide"
                    style={{ background: "#2C3438", color: "#AA8E64", border: "1px solid rgba(203,177,131,0.22)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Caption / description */}
            {(song as any).caption && (
              <p className="text-sm leading-relaxed" style={{ color: "#DACAAA", fontFamily: "'Cormorant Garamond', serif", fontSize: "15px" }}>
                {(song as any).caption}
              </p>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              {(song as any).albumName && (
                <div className="rounded-xl p-3" style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.12)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(203,177,131,0.55)" }}>Series / Collection</p>
                  <p className="text-xs font-medium" style={{ color: "#DACAAA" }}>{(song as any).albumName}</p>
                </div>
              )}
              {(song as any).releaseDate && (
                <div className="rounded-xl p-3" style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.12)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(203,177,131,0.55)" }}>Written / Completed</p>
                  <p className="text-xs font-medium" style={{ color: "#DACAAA" }}>{(song as any).releaseDate}</p>
                </div>
              )}
              {(song as any).isrc && (
                <div className="rounded-xl p-3" style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.12)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(203,177,131,0.55)" }}>ISBN</p>
                  <p className="text-xs font-mono" style={{ color: "#DACAAA" }}>{(song as any).isrc}</p>
                </div>
              )}
              {(song as any).createdAt && (
                <div className="rounded-xl p-3" style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.12)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(203,177,131,0.55)" }}>Witnessed On</p>
                  <p className="text-xs font-medium" style={{ color: "#DACAAA" }}>
                    {new Date((song as any).createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              )}
            </div>

            {/* Credits (Publisher, Author, etc.) */}
            {(() => {
              const rawCredits = (song as any)?.creditsJson;
              if (!rawCredits) return null;
              let credits: { role: string; name: string }[] = [];
              try { credits = JSON.parse(rawCredits); } catch { return null; }
              if (credits.length === 0) return null;
              return (
                <div className="rounded-xl p-4" style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.12)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-3" style={{ color: "rgba(203,177,131,0.55)" }}>Credits</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {credits.map((c: { role: string; name: string }, i: number) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span className="text-[10px] uppercase tracking-widest flex-shrink-0" style={{ color: "#3F4A50", minWidth: "72px" }}>{c.role}</span>
                        <span className="text-sm" style={{ color: "#DACAAA" }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* WID Panel */}
            {song.witnessId && (
              <WIDPanel witnessId={song.witnessId} />
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`, color: accentColor, border: `1px solid ${accentColor}55` }}>
                  <ExternalLink size={14} />
                  Open Full Document
                </a>
              )}
              {isOwner && (
                <>
                  <button
                    onClick={() => setEditPagesOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
                    style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}44` }}>
                    <BookOpen size={14} />
                    Edit Pages
                  </button>
                  <Link href={`/dashboard`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
                    style={{ background: "rgba(203,177,131,0.10)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.30)" }}>
                    <FileText size={14} />
                    Manage
                  </Link>
                </>
              )}
              <FlagContentButton workId={bookId} workType={isComic ? "comic" : "manuscript"} />
            </div>
          </div>
        </div>

        {/* ── Storyboard Reader (primary) ── */}
        {hasStoryboard && (
          <div
            className="rounded-2xl overflow-hidden relative group cursor-pointer"
            style={{ background: "#0D1419", border: "1px solid rgba(203,177,131,0.22)" }}
            onClick={() => setReaderOpen(true)}
          >
            {/* Preview: first page as hero */}
            <div className="relative" style={{ aspectRatio: "16/9", overflow: "hidden" }}>
              <img
                src={storyboardPages[0].imageUrl}
                alt={`${song.title} — page 1`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Dark overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)" }} />
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300 group-hover:scale-105"
                  style={{
                    background: "rgba(0,0,0,0.65)",
                    border: `1px solid ${accentColor}55`,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Play size={18} fill={accentColor} style={{ color: accentColor }} />
                  <span className="text-sm font-heading font-bold tracking-widest" style={{ color: accentColor }}>
                    READ NOW
                  </span>
                </div>
              </div>
              {/* Page count badge */}
              <div
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-heading font-bold tracking-wider"
                style={{ background: "rgba(0,0,0,0.65)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.35)" }}
              >
                <BookOpen size={10} />
                {storyboardPages.length} PAGES
              </div>
            </div>
            {/* Footer strip */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(203,177,131,0.12)" }}>
              <span className="text-xs font-heading tracking-widest" style={{ color: "#AA8E64" }}>
                HORIZONTAL READER · SWIPE OR CLICK TO NAVIGATE
              </span>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "#AA8E64" }}
                >
                  PDF ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Fallback Document Viewer (legacy PDF, no storyboard) ── */}
        {!hasStoryboard && fileUrl && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2530", border: "1px solid rgba(203,177,131,0.18)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(203,177,131,0.12)" }}>
              <div className="flex items-center gap-2">
                <FileText size={15} style={{ color: accentColor }} />
                <span className="text-sm font-heading font-bold tracking-wide" style={{ color: "#E6CDAE" }}>Document</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewerMode(v => v === "preview" ? "fullscreen" : "preview")}
                  className="hidden md:block text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "#AA8E64" }}>
                  {viewerMode === "preview" ? "EXPAND" : "COLLAPSE"}
                </button>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "#AA8E64" }}>
                  OPEN ↗
                </a>
              </div>
            </div>
            {isPdf && (
              <div className="hidden md:block" style={{ height: viewerMode === "fullscreen" ? "80vh" : "520px" }}>
                <iframe
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full"
                  title={song.title}
                  style={{ border: "none", background: "#1A2530" }}
                />
              </div>
            )}
            <div className={isPdf ? "md:hidden" : ""}>
              <div className="flex flex-col items-center justify-center py-10 gap-4 px-4">
                <FileText className="w-12 h-12 opacity-20" style={{ color: accentColor }} />
                <p className="text-sm text-center font-heading" style={{ color: "#AA8E64" }}>
                  {isPdf ? "Tap below to open the PDF in your browser or download it." : "This document format requires a dedicated viewer."}
                </p>
                <div className="flex gap-3 flex-wrap justify-center">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
                    style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }}>
                    <ExternalLink size={14} />
                    Open PDF
                  </a>
                  <a href={fileUrl} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
                    style={{ background: "rgba(203,177,131,0.10)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.30)" }}>
                    <Download size={14} />
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Full-screen Reader Portal ── */}
        {readerOpen && hasStoryboard && (
          <HorizontalBookReader
            pages={storyboardPages}
            title={song.title}
            onClose={() => setReaderOpen(false)}
          />
        )}

        {/* ── Full Text Reader (lyricsText) ── */}
        {(song as any)?.lyricsText && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2530", border: "1px solid rgba(203,177,131,0.18)" }}>
            <button
              onClick={() => setShowFullText(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
              style={{ borderBottom: showFullText ? "1px solid rgba(203,177,131,0.12)" : "none" }}>
              <div className="flex items-center gap-2">
                <BookOpen size={15} style={{ color: "#CBB183" }} />
                <span className="text-sm font-heading font-bold tracking-wide" style={{ color: "#E6CDAE" }}>Read Full Text</span>
              </div>
              <span className="text-xs font-heading" style={{ color: "#AA8E64" }}>{showFullText ? "COLLAPSE ▲" : "EXPAND ▼"}</span>
            </button>
            {showFullText && (
              <div className="px-5 py-6 prose prose-invert max-w-none" style={{ color: "#DACAAA", fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", lineHeight: "1.85" }}>
                {((song as any).lyricsText as string).split("\n").map((para: string, i: number) =>
                  para.trim() ? <p key={i} className="mb-4">{para}</p> : <br key={i} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Reactions + Comments ── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Reactions */}
          <div className="rounded-2xl p-4" style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.18)" }}>
            <h3 className="text-sm font-semibold mb-3 font-heading" style={{ color: "#DACAAA" }}>Reactions</h3>
            <div className="flex flex-wrap gap-2">
              {REACTIONS.map(emoji => (
                <button key={emoji}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-110 active:scale-95"
                  style={{ background: "#1E2D3A", border: "1px solid rgba(203,177,131,0.18)" }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="rounded-2xl p-4" style={{ background: "#2C3438", border: "1px solid rgba(203,177,131,0.18)" }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 font-heading" style={{ color: "#DACAAA" }}>
              <MessageSquare size={14} />
              Comments
              {comments && comments.length > 0 && (
                <span className="text-xs font-normal" style={{ color: "#AA8E64" }}>{comments.length}</span>
              )}
            </h3>
            <div className="flex gap-2 mb-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: "#1E2D3A", color: "#CBB183" }}>
                {user ? (user.name || "?").charAt(0).toUpperCase() : "?"}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                      e.preventDefault();
                      commentMutation.mutate({ songId: bookId, content: commentText.trim(), authorName: user?.name || undefined });
                    }
                  }}
                  style={{ background: "#1E2D3A", border: "1px solid rgba(203,177,131,0.20)", color: "#E6CDAE", fontSize: "13px" }}
                />
                {commentText.trim() && (
                  <Button size="sm"
                    onClick={() => commentMutation.mutate({ songId: bookId, content: commentText.trim(), authorName: user?.name || undefined })}
                    disabled={commentMutation.isPending}
                    style={{ background: "#CBB183", color: "#1E2D3A" }}>
                    Post
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {comments?.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "#1E2D3A", color: "#CBB183" }}>
                    {(c.authorName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium mb-0.5" style={{ color: "#CBB183" }}>{c.authorName || "Anonymous"}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#DACAAA" }}>{c.content}</p>
                  </div>
                </div>
              ))}
              {(!comments || comments.length === 0) && (
                <p className="text-xs text-center py-4" style={{ color: "#3F4A50" }}>No comments yet. Be the first to respond.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Pages Modal (owner only) ── */}
      {editPagesOpen && isOwner && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: "rgba(13,20,25,0.97)", backdropFilter: "blur(12px)" }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(203,177,131,0.18)" }}
          >
            <div className="flex items-center gap-3">
              <BookOpen size={18} style={{ color: accentColor }} />
              <div>
                <p className="text-sm font-heading font-bold tracking-wide" style={{ color: "#E6CDAE" }}>Edit Pages</p>
                <p className="text-[10px]" style={{ color: "#5A6A72" }}>{song?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditPagesOpen(false); setEditedPagesJson(null); }}
                className="px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-wide transition-all hover:bg-white/5"
                style={{ color: "#AA8E64", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePages}
                disabled={updatePagesMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-heading font-bold tracking-wide transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: accentColor, color: "#fff" }}
              >
                {updatePagesMutation.isPending ? "Saving…" : "Save Pages"}
              </button>
            </div>
          </div>
          {/* Builder scroll area */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <StoryboardBuilder
              initialPages={storyboardPages as StoryboardPage[]}
              onChange={setEditedPagesJson}
              disabled={updatePagesMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
