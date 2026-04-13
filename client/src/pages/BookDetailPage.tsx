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
  FileText, Download, ExternalLink, MessageSquare, Check,
} from "lucide-react";
import { useLike } from "@/hooks/useLike";
import { WIDPanel } from "@/components/WIDPanel";
import { FlagContentButton } from "@/components/FlagContentButton";

const REACTIONS = ["🔥", "😍", "😱", "🙌", "👍", "👎", "🤯", "+"];

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id ?? "0", 10);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [copied, setCopied] = useState(false);
  const [viewerMode, setViewerMode] = useState<"preview" | "fullscreen">("preview");

  const { data: songData, isLoading } = trpc.songs.getById.useQuery(
    { id: bookId },
    { enabled: !!bookId, refetchOnWindowFocus: false }
  );
  const { data: comments, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId: bookId },
    { enabled: !!bookId }
  );

  const commentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { setCommentText(""); refetchComments(); toast.success("Comment posted!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const { liked, toggle: toggleLike } = useLike(bookId);

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

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
                <Link href={`/dashboard`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
                  style={{ background: "rgba(203,177,131,0.10)", color: "#CBB183", border: "1px solid rgba(203,177,131,0.30)" }}>
                  <FileText size={14} />
                  Manage
                </Link>
              )}
              <FlagContentButton workId={bookId} workType={isComic ? "comic" : "manuscript"} />
            </div>
          </div>
        </div>

        {/* ── Document Viewer ── */}
        {fileUrl && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2530", border: "1px solid rgba(203,177,131,0.18)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(203,177,131,0.12)" }}>
              <div className="flex items-center gap-2">
                <FileText size={15} style={{ color: accentColor }} />
                <span className="text-sm font-heading font-bold tracking-wide" style={{ color: "#E6CDAE" }}>Document Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewerMode(v => v === "preview" ? "fullscreen" : "preview")}
                  className="text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "#AA8E64" }}>
                  {viewerMode === "preview" ? "EXPAND" : "COLLAPSE"}
                </button>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "#AA8E64" }}>
                  OPEN ↗
                </a>
              </div>
            </div>

            {isPdf ? (
              /* PDF inline viewer */
              <div style={{ height: viewerMode === "fullscreen" ? "80vh" : "520px" }}>
                <iframe
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full"
                  title={song.title}
                  style={{ border: "none", background: "#1A2530" }}
                />
              </div>
            ) : (
              /* Non-PDF: show download prompt */
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <FileText className="w-14 h-14 opacity-25" style={{ color: "#CBB183" }} />
                <p className="text-sm font-heading" style={{ color: "#AA8E64" }}>
                  This document format requires a dedicated viewer.
                </p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-heading font-bold tracking-wide transition-all hover:opacity-90"
                  style={{ background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }}>
                  <Download size={14} />
                  Download Document
                </a>
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
    </div>
  );
}
