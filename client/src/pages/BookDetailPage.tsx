/**
 * BookDetailPage — dedicated detail page for manuscript and comic/novel works.
 * Route: /book/:id
 * Layout: cover art + metadata left, inline document viewer right.
 * Completely separate from SongDetailPage (music/audio).
 */
import { useState, useEffect } from "react";
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
import { CinematicComicReader, type BookPage } from "@/components/reader/CinematicComicReader";
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
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState<Record<string, boolean>>({});
  const [purchaseOpen, setPurchaseOpen] = useState(false);

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

  const { data: purchaseData } = trpc.books.hasPurchased.useQuery(
    { songId: bookId },
    { enabled: bookId > 0 }
  );
  const hasPurchased = purchaseData?.purchased ?? false;
  const purchaseCheckoutMutation = trpc.books.createPurchaseCheckout.useMutation({
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (e: { message: string }) => toast.error(e.message),
  });

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
  const accentColor = isComic ? "var(--ln-ember)" : "var(--ln-seal-bright)";
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

  // Access control & commerce
  type ConsentSettings = { enabled: boolean; requireAgeAck: boolean; requireAiAck: boolean; requireNoRedistrib: boolean; customNote: string };
  const consentSettingsRaw = (song as any)?.consentSettingsJson as string | undefined;
  const consentSettings: ConsentSettings = (() => {
    const defaults: ConsentSettings = { enabled: false, requireAgeAck: false, requireAiAck: false, requireNoRedistrib: true, customNote: "" };
    if (!consentSettingsRaw) return defaults;
    try { return { ...defaults, ...JSON.parse(consentSettingsRaw) }; } catch { return defaults; }
  })();
  type ExternalLink = { platform: string; url: string; label?: string };
  const externalLinksRaw = (song as any)?.externalLinksJson as string | undefined;
  const externalLinks: ExternalLink[] = (() => {
    if (!externalLinksRaw) return [];
    try { return JSON.parse(externalLinksRaw) as ExternalLink[]; } catch { return []; }
  })();
  const readAccess = ((song as any)?.readAccess as string | undefined) ?? "open";
  const purchasePriceCents = (song as any)?.purchasePriceCents as number | null | undefined;
  const previewPageCount = ((song as any)?.previewPageCount as number | undefined) ?? 5;
  const hasPurchasePrice = purchasePriceCents != null && purchasePriceCents > 0;

  // Determine which pages are visible before purchase
  const visiblePages = readAccess === "preview"
    ? storyboardPages.slice(0, previewPageCount)
    : readAccess === "locked"
    ? []
    : storyboardPages;
  const isGated = (readAccess === "preview" || readAccess === "locked") && !isOwner && !hasPurchased;

  // Consent items to show
  const consentItems: { key: string; label: string }[] = [];
  if (consentSettings.enabled) {
    if (consentSettings.requireAgeAck) consentItems.push({ key: "age", label: "I confirm this content is age-appropriate for the intended reader." });
    if (consentSettings.requireAiAck) consentItems.push({ key: "ai", label: "I acknowledge this work may contain AI-assisted content." });
    if (consentSettings.requireNoRedistrib) consentItems.push({ key: "noredist", label: "I agree not to redistribute or reproduce this work without permission." });
    if (consentSettings.customNote) consentItems.push({ key: "custom", label: consentSettings.customNote });
  }
  const allConsentChecked = consentItems.length === 0 || consentItems.every(item => consentChecked[item.key]);

  function handleReadNow() {
    if (isGated && hasPurchasePrice) { setPurchaseOpen(true); return; }
    if (consentSettings.enabled && consentItems.length > 0) { setConsentOpen(true); return; }
    setReaderOpen(true);
  }

  function handleConsentConfirm() {
    if (!allConsentChecked) return;
    setConsentOpen(false);
    setReaderOpen(true);
  }

  // Handle Stripe return after purchase
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast.success("Purchase complete! Full access unlocked.");
      // Remove the query param without reloading
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-open the reader after a brief delay
      setTimeout(() => setReaderOpen(true), 800);
    }
  }, []);

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
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--ln-gold)", borderTopColor: "transparent" }} />
          <p className="text-sm font-heading" style={{ color: "var(--ln-smoke)" }}>Loading work…</p>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1E2D3A" }}>
        <div className="text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto opacity-30" style={{ color: "var(--ln-gold)" }} />
          <p className="font-heading text-lg" style={{ color: "var(--ln-parchment)" }}>Work not found</p>
          <Button onClick={() => navigate("/explore")} variant="outline" style={{ borderColor: "var(--ln-gold)", color: "var(--ln-gold)" }}>
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
        style={{ background: "linear-gradient(180deg, #1A2530 0%, rgba(26,37,48,0.92) 100%)", borderBottom: "1px solid rgba(196,154,40,0.08)", backdropFilter: "blur(12px)" }}>
        <button onClick={() => navigate(-1 as any)} className="flex items-center gap-2 text-sm transition-colors hover:text-[#C49A28]" style={{ color: "var(--ln-smoke)" }}>
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
              style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}>
              <BookOpen size={13} />
              Read
            </button>
          )}
          <button onClick={handleCopyLink} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--ln-smoke)" }} title="Copy link">
            {copied ? <Check size={16} style={{ color: "var(--ln-seal-bright)" }} /> : <Copy size={16} />}
          </button>
          <button className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--ln-smoke)" }} title="Share">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">

        {/* ── Hero row: cover + metadata ── */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Cover art — portrait 3:4 */}
          <div className="flex-shrink-0 w-full md:w-56">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "3/4", background: "var(--ln-coal)" }}>
              {song.coverArtUrl ? (
                <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-16 h-16 opacity-20" style={{ color: "var(--ln-gold)" }} />
                </div>
              )}
              {/* Gold rim overlay */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ border: "1px solid rgba(196,154,40,0.3)", boxShadow: "inset 0 0 24px rgba(196,154,40,0.04)" }} />
            </div>

            {/* Like + WID row under cover */}
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                onClick={(e) => toggleLike(e)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-pink-400" : "hover:text-pink-400"}`}
                style={{ color: liked ? undefined : "var(--ln-smoke)" }}
              >
                <Heart size={16} fill={liked ? "currentColor" : "none"} />
                <span className="text-xs font-heading">Like</span>
              </button>
              {song.witnessId && (
                <Link href={`/verify/${song.witnessId}`}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full font-heading tracking-wider"
                  style={{ background: "rgba(0,0,0,0.55)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.4)" }}>
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
                style={{ fontFamily: "'Cinzel', serif", background: "linear-gradient(135deg, #F5E6C8 0%, #C49A28 50%, #B8860B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {song.title}
              </h1>
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ln-smoke)" }}>
                <span>by</span>
                {(creator as any)?.id ? (
                  <Link href={`/creator/${(creator as any).id}`} className="hover:text-[#C49A28] transition-colors font-heading">
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
                    style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px solid rgba(196,154,40,0.2)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Caption / description */}
            {(song as any).caption && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif", fontSize: "15px" }}>
                {(song as any).caption}
              </p>
            )}

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3">
              {(song as any).albumName && (
                <div className="rounded-xl p-3" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.08)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(196,154,40,0.5)" }}>Series / Collection</p>
                  <p className="text-xs font-medium" style={{ color: "var(--ln-parchment)" }}>{(song as any).albumName}</p>
                </div>
              )}
              {(song as any).releaseDate && (
                <div className="rounded-xl p-3" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.08)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(196,154,40,0.5)" }}>Written / Completed</p>
                  <p className="text-xs font-medium" style={{ color: "var(--ln-parchment)" }}>{(song as any).releaseDate}</p>
                </div>
              )}
              {(song as any).isrc && (
                <div className="rounded-xl p-3" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.08)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(196,154,40,0.5)" }}>ISBN</p>
                  <p className="text-xs font-mono" style={{ color: "var(--ln-parchment)" }}>{(song as any).isrc}</p>
                </div>
              )}
              {(song as any).createdAt && (
                <div className="rounded-xl p-3" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.08)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-1" style={{ color: "rgba(196,154,40,0.5)" }}>Witnessed On</p>
                  <p className="text-xs font-medium" style={{ color: "var(--ln-parchment)" }}>
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
                <div className="rounded-xl p-4" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.08)" }}>
                  <p className="text-[9px] uppercase tracking-widest font-heading mb-3" style={{ color: "rgba(196,154,40,0.5)" }}>Credits</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {credits.map((c: { role: string; name: string }, i: number) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span
                          className="text-[9px] uppercase tracking-widest flex-shrink-0 px-1.5 py-0.5 rounded font-bold"
                          style={{
                            minWidth: "72px",
                            background: c.role.toLowerCase() === "publisher" ? "rgba(59,130,246,0.15)" : "rgba(196,154,40,0.12)",
                            color: c.role.toLowerCase() === "publisher" ? "#93C5FD" : "rgba(196,154,40,0.85)",
                          }}
                        >{c.role}</span>
                        <span className="text-sm" style={{ color: "var(--ln-parchment)" }}>{c.name}</span>
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
            {/* External Hosting Links */}
            {externalLinks.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.08)" }}>
                <p className="text-[9px] uppercase tracking-widest font-heading mb-3" style={{ color: "rgba(196,154,40,0.5)" }}>Also Available On</p>
                <div className="flex flex-wrap gap-2">
                  {externalLinks.map((link, i) => (
                    link.url && link.platform ? (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold tracking-wide transition-all hover:opacity-80"
                        style={{
                          background: "rgba(196,154,40,0.08)",
                          color: "var(--ln-gold)",
                          border: "1px solid rgba(196,154,40,0.25)",
                        }}
                      >
                        <ExternalLink size={11} />
                        {link.label || link.platform} ↗
                      </a>
                    ) : null
                  ))}
                </div>
              </div>
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
                    style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}>
                    <FileText size={14} />
                    Manage
                  </Link>
                </>
              )}
              <FlagContentButton workId={bookId} workType={isComic ? "comic" : "manuscript"} />
            </div>
          </div>
        </div>

        {/* ── SECTION 1: Origin Testimony ── */}
        {(song as any).caption && (
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ minHeight: "220px" }}
          >
            {/* Artwork as atmospheric background */}
            {song.coverArtUrl && (
              <img
                src={song.coverArtUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "brightness(0.55) saturate(0.8)", transform: "scale(1.04)" }}
              />
            )}
            {/* Bottom gradient */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.10) 100%)" }} />
            {/* Testimony content */}
            <div className="relative z-10 flex flex-col justify-end h-full px-6 py-6">
              <p className="text-[10px] uppercase tracking-widest font-heading mb-2" style={{ color: "rgba(196,154,40,0.7)" }}>Origin Testimony</p>
              <p
                className="text-lg md:text-xl leading-relaxed"
                style={{ color: "#F5F5F5", fontFamily: "'Cormorant Garamond', serif", opacity: 0.95, maxWidth: "720px" }}
              >
                {(song as any).caption}
              </p>
              {(song as any).description && (song as any).description !== (song as any).caption && (
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(232,223,200,0.7)", fontFamily: "'Cormorant Garamond', serif", maxWidth: "680px" }}>
                  {(song as any).description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 2: Reader Access (Cinematic Entry) ── */}
        {hasStoryboard && (
          <div
            className="rounded-2xl overflow-hidden relative group cursor-pointer"
            style={{ background: "#0D1419", border: "1px solid rgba(196,154,40,0.2)" }}
            onClick={handleReadNow}
          >
            {/* Hero: first page, clear and vibrant */}
            <div className="relative" style={{ aspectRatio: "16/9", overflow: "hidden" }}>
              <img
                src={storyboardPages[0].imageUrl}
                alt={`${song.title} — page 1`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                style={{ filter: "brightness(0.88)" }}
              />
              {/* Bottom gradient only */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.0) 80%)" }} />
              {/* Read Now button — centered */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="flex items-center gap-3 px-7 py-3.5 rounded-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    border: `1px solid rgba(196,154,40,0.55)`,
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 0 24px rgba(196,154,40,0.12)",
                  }}
                >
                  <BookOpen size={17} fill={accentColor} style={{ color: accentColor }} />
                  <span className="text-sm font-heading font-bold tracking-widest" style={{ color: accentColor }}>
                    READ NOW
                  </span>
                </div>
              </div>
              {/* Badges */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-heading font-bold tracking-wider"
                  style={{ background: "rgba(0,0,0,0.65)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}>
                  <BookOpen size={10} />
                  {storyboardPages.length} PAGES
                </span>
                {isGated && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-heading font-bold tracking-wider"
                    style={{ background: "rgba(0,0,0,0.65)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.35)" }}>
                    🔒 {readAccess === "preview" ? `Preview: ${previewPageCount} pages` : "Locked"}
                  </span>
                )}
              </div>
              {/* Mode hint */}
              <div className="absolute bottom-3 right-3 text-[9px] font-heading tracking-widest" style={{ color: "rgba(196,154,40,0.5)" }}>
                SINGLE · SPREAD · GUIDED · OVERVIEW
              </div>
            </div>
            {/* Footer strip */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}>
              <span className="text-xs font-heading tracking-widest" style={{ color: "var(--ln-smoke)" }}>
                CINEMATIC READER · ← → KEYS · PINCH TO ZOOM
              </span>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "var(--ln-smoke)" }}
                >
                  PDF ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Fallback Document Viewer (legacy PDF, no storyboard) ── */}
        {!hasStoryboard && fileUrl && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2530", border: "1px solid rgba(196,154,40,0.15)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}>
              <div className="flex items-center gap-2">
                <FileText size={15} style={{ color: accentColor }} />
                <span className="text-sm font-heading font-bold tracking-wide" style={{ color: "var(--ln-parchment)" }}>Document</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewerMode(v => v === "preview" ? "fullscreen" : "preview")}
                  className="hidden md:block text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "var(--ln-smoke)" }}>
                  {viewerMode === "preview" ? "EXPAND" : "COLLAPSE"}
                </button>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-heading tracking-wider px-2.5 py-1 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "var(--ln-smoke)" }}>
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
                <p className="text-sm text-center font-heading" style={{ color: "var(--ln-smoke)" }}>
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
                    style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}>
                    <Download size={14} />
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Consent Modal ── */}
        {consentOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
            <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4" style={{ background: "#1A2530", border: "1px solid rgba(196,154,40,0.25)" }}>
              <div className="flex items-center gap-3">
                <Shield size={20} style={{ color: "var(--ln-gold)" }} />
                <h2 className="text-base font-heading font-bold" style={{ color: "var(--ln-parchment)" }}>Before You Read</h2>
              </div>
              <p className="text-xs" style={{ color: "#94a3b8" }}>Please review and acknowledge the following before accessing this work.</p>
              <div className="flex flex-col gap-3">
                {consentItems.map(item => (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!consentChecked[item.key]}
                      onChange={e => setConsentChecked(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-yellow-500 flex-shrink-0"
                    />
                    <span className="text-sm" style={{ color: "#e2e8f0" }}>{item.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 text-sm"
                  onClick={() => setConsentOpen(false)}
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8", background: "transparent" }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-sm font-semibold"
                  onClick={handleConsentConfirm}
                  disabled={!allConsentChecked}
                  style={{
                    background: allConsentChecked ? "linear-gradient(135deg, #C49A28, #8B6914)" : "rgba(196,154,40,0.2)",
                    color: allConsentChecked ? "#000" : "#64748b",
                  }}
                >
                  I Agree — Open Book
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* ── Purchase Gate Modal ── */}
        {purchaseOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
            <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4" style={{ background: "#1A2530", border: "1px solid rgba(196,154,40,0.25)" }}>
              <div className="flex items-center gap-3">
                <BookOpen size={20} style={{ color: accentColor }} />
                <h2 className="text-base font-heading font-bold" style={{ color: "var(--ln-parchment)" }}>{song.title}</h2>
              </div>
              {readAccess === "preview" && (
                <p className="text-sm" style={{ color: "#94a3b8" }}>You've read the first {previewPageCount} pages. Purchase to unlock the full book.</p>
              )}
              {readAccess === "locked" && (
                <p className="text-sm" style={{ color: "#94a3b8" }}>This book requires a one-time purchase to read.</p>
              )}
              {hasPurchasePrice && (
                <div className="rounded-xl p-4 text-center" style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)" }}>
                  <p className="text-2xl font-heading font-bold" style={{ color: "var(--ln-gold)" }}>
                    ${(purchasePriceCents! / 100).toFixed(2)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#64748b" }}>One-time purchase · Permanent access</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-sm"
                  onClick={() => setPurchaseOpen(false)}
                  style={{ borderColor: "rgba(255,255,255,0.15)", color: "#94a3b8", background: "transparent" }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 text-sm font-semibold"
                  onClick={() => {
                    setPurchaseOpen(false);
                    purchaseCheckoutMutation.mutate({ songId: bookId, origin: window.location.origin });
                  }}
                  disabled={purchaseCheckoutMutation.isPending}
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)`, color: "#000" }}
                >
                  Purchase
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* ── Full-screen Reader Portal ── */}
        {readerOpen && hasStoryboard && (
          <CinematicComicReader
            pages={readAccess === "open" || isOwner ? storyboardPages : visiblePages}
            title={song.title}
            onClose={() => setReaderOpen(false)}
          />
        )}

        {/* ── Full Text Reader (lyricsText) ── */}
        {(song as any)?.lyricsText && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1A2530", border: "1px solid rgba(196,154,40,0.15)" }}>
            <button
              onClick={() => setShowFullText(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
              style={{ borderBottom: showFullText ? "1px solid rgba(196,154,40,0.08)" : "none" }}>
              <div className="flex items-center gap-2">
                <BookOpen size={15} style={{ color: "var(--ln-gold)" }} />
                <span className="text-sm font-heading font-bold tracking-wide" style={{ color: "var(--ln-parchment)" }}>Read Full Text</span>
              </div>
              <span className="text-xs font-heading" style={{ color: "var(--ln-smoke)" }}>{showFullText ? "COLLAPSE ▲" : "EXPAND ▼"}</span>
            </button>
            {showFullText && (
              <div className="px-5 py-6 prose prose-invert max-w-none" style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", lineHeight: "1.85" }}>
                {((song as any).lyricsText as string).split("\n").map((para: string, i: number) =>
                  para.trim() ? <p key={i} className="mb-4">{para}</p> : <br key={i} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 3: Resonance Field ── */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Reactions */}
          <div className="rounded-2xl p-4" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.15)" }}>
            <h3 className="text-sm font-semibold mb-3 font-heading" style={{ color: "var(--ln-parchment)" }}>Reactions</h3>
            <div className="flex flex-wrap gap-2">
              {REACTIONS.map(emoji => (
                <button key={emoji}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-110 active:scale-95"
                  style={{ background: "#1E2D3A", border: "1px solid rgba(196,154,40,0.15)" }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="rounded-2xl p-4" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.15)" }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 font-heading" style={{ color: "var(--ln-parchment)" }}>
              <MessageSquare size={14} />
              Comments
              {comments && comments.length > 0 && (
                <span className="text-xs font-normal" style={{ color: "var(--ln-smoke)" }}>{comments.length}</span>
              )}
            </h3>
            <div className="flex gap-2 mb-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: "#1E2D3A", color: "var(--ln-gold)" }}>
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
                  style={{ background: "#1E2D3A", border: "1px solid rgba(196,154,40,0.15)", color: "var(--ln-parchment)", fontSize: "13px" }}
                />
                {commentText.trim() && (
                  <Button size="sm"
                    onClick={() => commentMutation.mutate({ songId: bookId, content: commentText.trim(), authorName: user?.name || undefined })}
                    disabled={commentMutation.isPending}
                    style={{ background: "var(--ln-gold)", color: "#1E2D3A" }}>
                    Post
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {comments?.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "#1E2D3A", color: "var(--ln-gold)" }}>
                    {(c.authorName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--ln-gold)" }}>{c.authorName || "Anonymous"}</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--ln-parchment)" }}>{c.content}</p>
                  </div>
                </div>
              ))}
              {(!comments || comments.length === 0) && (
                <p className="text-xs text-center py-4" style={{ color: "var(--ln-iron)" }}>No comments yet. Be the first to respond.</p>
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
            style={{ borderBottom: "1px solid rgba(196,154,40,0.15)" }}
          >
            <div className="flex items-center gap-3">
              <BookOpen size={18} style={{ color: accentColor }} />
              <div>
                <p className="text-sm font-heading font-bold tracking-wide" style={{ color: "var(--ln-parchment)" }}>Edit Pages</p>
                <p className="text-[10px]" style={{ color: "#5A6A72" }}>{song?.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditPagesOpen(false); setEditedPagesJson(null); }}
                className="px-4 py-2 rounded-xl text-xs font-heading font-bold tracking-wide transition-all hover:bg-white/5"
                style={{ color: "var(--ln-smoke)", border: "1px solid rgba(255,255,255,0.10)" }}
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
