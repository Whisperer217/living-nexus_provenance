/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — SongDetailPage (v2)
   Living Nexus layout:
   • Left: cover art + player controls + lyrics panel
   • Right: comments + emoji reactions + related songs sidebar
   • AI Transform stub (coming soon)
   Divine Noir aesthetic — Orbitron/Cinzel, gold/cyan palette
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { triggerTaggedDownload } from "@/lib/downloadTrack";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Play, Pause, Share2, Copy, DollarSign, MessageSquare,
  Shield, Music, ChevronLeft, Download, Headphones,
  ExternalLink, Check, ChevronDown, ChevronUp, Twitter, Heart,
  Video, ImageIcon, History, Hash, FileText, Link2, StickyNote,
  BookOpen, ShieldCheck, Network, Pencil, AlertTriangle,
} from "lucide-react";
import { useLike } from "@/hooks/useLike";
import { useRef as _useRef } from "react";
import { useWaveformVisualizer } from "@/hooks/useWaveformVisualizer";
import { useHarmonic } from "@/contexts/HarmonicContext";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import AddToNamedPlaylistPopover from "@/components/AddToNamedPlaylistPopover";
import { WIDPanel } from "@/components/WIDPanel";
import { ActivationPanel } from "@/components/ActivationPanel";
import { ProvenanceTimeline } from "@/components/ProvenanceTimeline";
import { LineageGraph } from "@/components/LineageGraph";
import { WitnessesPanel } from "@/components/WitnessesPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { FlagContentButton } from "@/components/FlagContentButton";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";
import { safeAudioUrl } from "@shared/const";
import { getContentTypeColors } from "@/lib/contentTypeColors";
import { QRShareModal } from "@/components/QRIdentityCard";
import { CinematicComicReader, type BookPage } from "@/components/reader/CinematicComicReader";
import { CinematicSongHeader } from "@/components/CinematicSongHeader";
import { CreatorHandle } from "@/components/CreatorHandle";
import { CreativeDrawer } from "@/components/CreativeDrawer";
import {
  ArchiveFrame,
  ArtifactPanel,
  ArchiveSection,
  ClassificationStamp,
  WIDCertificate,
  MetadataRow,
  getArchiveIdentity,
} from "@/components/ArchiveLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SongDetailPageSkeleton } from "@/components/SongDetailPageSkeleton";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { SacredCanvas } from "@/components/SacredCanvas";

// Slug keys stored in DB (safe ASCII, no charset issues); emoji shown in UI
const REACTION_SLUGS = ["fire", "love", "wow", "clap", "thumbsup", "thumbsdown", "mindblown", "+"];
const REACTION_EMOJI: Record<string, string> = {
  fire: "🔥", love: "😍", wow: "😱", clap: "🙌",
  thumbsup: "👍", thumbsdown: "👎", mindblown: "🤯", "+": "+",
};

function RelatedCard({ item }: { item: any }) {
  const song = item.song;
  const creator = item.creator;
  return (
    <Link href={`/song/${song.id}`}>
      <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-all group">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
          {song.coverArtUrl
            ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
            : <Music className="w-5 h-5 opacity-30" style={{ color: "var(--ln-gold)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
          <p className="text-xs truncate" style={{ color: "var(--ln-smoke)" }}>
            {creator?.artistHandle || creator?.name || "Unknown"}
          </p>
        </div>
        <Play className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
      </div>
    </Link>
  );
}

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addAndPlay, playQueueAt, togglePlay, state: playerState, currentTrackId, openNowPlayingPanel, audioRef } = usePlayer();
  const waveCanvasRef = _useRef<HTMLCanvasElement>(null);
  const songId = parseInt(id || "0");
  const utils = trpc.useUtils();

  const [tipOpen, setTipOpen] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [tipAmount, setTipAmount] = useState("5");
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: number; authorName: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [editingLyrics, setEditingLyrics] = useState(false);
  const [lyricsEdit, setLyricsEdit] = useState("");
  // Persistent reactions — backed by DB via tRPC
  const { data: reactionsData } = trpc.songs.getReactions.useQuery(
    { songId },
    { enabled: songId > 0 }
  );
  const reactionCounts: Record<string, number> = reactionsData?.counts ?? {};
  const myReactionsSet = new Set<string>(reactionsData?.mine ?? []);
  // Archive layout aliases (populated after evidenceItems is declared below)
  const toggleReactionMutation = trpc.songs.toggleReaction.useMutation({
    onMutate: async ({ type }) => {
      await utils.songs.getReactions.cancel({ songId });
      const prev = utils.songs.getReactions.getData({ songId });
      utils.songs.getReactions.setData({ songId }, (old) => {
        if (!old) return old;
        const counts = { ...old.counts };
        const mine = [...old.mine];
        if (mine.includes(type)) {
          counts[type] = Math.max((counts[type] ?? 1) - 1, 0);
          return { counts, mine: mine.filter((r) => r !== type) };
        } else {
          counts[type] = (counts[type] ?? 0) + 1;
          return { counts, mine: [...mine, type] };
        }
      });
      return { prev };
    },
    onError: (_err: any, _vars, ctx: any) => {
      if (ctx?.prev) utils.songs.getReactions.setData({ songId }, ctx.prev);
      toast.error("Reaction failed — please try again");
    },
    onSettled: () => {
      utils.songs.getReactions.invalidate({ songId });
    },
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  // Stable callbacks for EditTrackPanel — inline arrow functions would cause
  // the Escape-key useEffect to re-register on every parent re-render.
  const handleEditClose = useCallback(() => setEditingOpen(false), []);
  const handleEditSaved = useCallback(() => {
    setEditingOpen(false);
    utils.songs.getById.invalidate({ id: songId });
  }, [utils.songs.getById, songId]);
  // Derive play state from global player — this page is a remote control only
  const isThisTrackActive = currentTrackId === String(songId);
  const isPlaying = isThisTrackActive && playerState.isPlaying;

  // Live waveform visualizer — driven by the global audio element
  // Wire harmonic hue so the waveform reflects the song's unique soul color
  const { harmonicSig } = useHarmonic();
  useWaveformVisualizer(audioRef, waveCanvasRef, isThisTrackActive, isPlaying, false, harmonicSig.hue, harmonicSig.saturation);
  const { liked: isLiked, toggle: toggleLike } = useLike(songId);
  const { data: likeCountData } = trpc.songs.getLikeCount.useQuery(
    { songId },
    { enabled: songId > 0 }
  );
  const likeCount = likeCountData?.count ?? 0;
  const [showVideo, setShowVideo] = useState(false);
  const videoDetailRef = useRef<HTMLVideoElement>(null);
  const [showTipModal, setShowTipModal] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Scroll reveal — below-fold sections rise into view
  const scrollRevealRef = useScrollReveal<HTMLDivElement>({ threshold: 0.10, rootMargin: "0px 0px -30px 0px" });

  // Open the reader: if the work has storyboard pages use the in-page reader,
  // otherwise fall back to the BookDetailPage which handles raw PDFs.
  const handleReadNow = () => {
    const pagesJson = (song as any)?.pagesJson;
    let hasPages = false;
    try { hasPages = pagesJson ? JSON.parse(pagesJson).length > 0 : false; } catch {}
    if (hasPages) {
      setReaderOpen(true);
    } else {
      window.location.href = `/book/${song?.id}`;
    }
  };

  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      setHeaderCollapsed(heroRef.current.getBoundingClientRect().bottom < 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);




  const { data: songData, isLoading } = trpc.songs.getById.useQuery(
    { id: songId },
    { enabled: songId > 0, refetchOnWindowFocus: false }
  );
  const { data: comments, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId },
    { enabled: songId > 0 }
  );
  const { data: eventThread, refetch: refetchEvents } = trpc.events.getByWork.useQuery(
    { workId: songId },
    { enabled: songId > 0 }
  );
  const { data: relatedData } = trpc.songs.getRelated.useQuery(
    { songId, genre: songData?.song?.genre || undefined },
    { enabled: songId > 0 && !!songData }
  );
  // Evidence artifacts — inlined in right column
  const { data: evidenceItems = [] } = trpc.evidence.list.useQuery(
    { songId },
    { enabled: songId > 0, staleTime: 30_000 }
  );
  // Archive layout aliases
  const reactionData = reactionCounts;
  const myReactionData = Object.fromEntries(REACTION_SLUGS.map(s => [s, myReactionsSet.has(s)]));
  const reactMutation = toggleReactionMutation;
  const provenanceItems = evidenceItems;

  const song = songData?.song;
  const creator = songData?.creator;
  const isOwner = user?.id === creator?.id;

  const playMutation = trpc.songs.play.useMutation();
  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (d: { url: string | null }) => {
      if (d.url) { window.open(d.url, "_blank"); toast.info("Redirecting to checkout..."); }
      setTipOpen(false);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const tipDownloadMutation = trpc.tips.createTipDownloadCheckout.useMutation({
    onSuccess: (d: { url: string | null }) => {
      if (d.url) { window.open(d.url, "_blank"); toast.info("Redirecting to checkout — download unlocks after payment..."); }
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const commentMutation = trpc.comments.add.useMutation({
    onSuccess: () => { setCommentText(""); refetchComments(); refetchEvents(); toast.success("Comment posted!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const replyMutation = trpc.comments.addReply.useMutation({
    onSuccess: () => { setReplyText(""); setReplyingTo(null); refetchComments(); toast.success("Reply posted!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  // WID-tagged download: permission check via tRPC, then fetch+blob download
  // Uses fetch+blob to handle cross-origin S3 redirects (anchor a.download fails on cross-origin)
  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: async (_d: { url: string }, vars: { songId: number }) => {
      try {
        await triggerTaggedDownload(vars.songId);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Download failed");
      }
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const updateLyricsMutation = trpc.songs.updateLyrics.useMutation({
    onSuccess: () => { setEditingLyrics(false); toast.success("Lyrics saved!"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  useEffect(() => {
    if (song?.lyricsText) setLyricsEdit(song.lyricsText);
  }, [song?.lyricsText]);

  // Handle Stripe tip/download success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("tip") === "success") {
      setTipSuccess(true);
      toast.success("🙏 Your gift was sent! The creator receives 90% directly.", { duration: 8000 });
      // Invalidate ticker so it refreshes with the new tip
      utils.tips.recentTips.invalidate();
      utils.events.getByWork.invalidate({ workId: songId });
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-dismiss the in-page banner after 8 seconds
      setTimeout(() => setTipSuccess(false), 8000);
    }

    if (params.get("download") === "unlocked") {
      toast.loading("Payment received — unlocking download...", { id: "download-unlock" });
      window.history.replaceState({}, "", window.location.pathname);

      // Poll the permission endpoint until the webhook has recorded the tip (up to 30s).
      // The server now checks both the tips table AND the events table (written first by
      // the Stripe webhook), so unlock should succeed within the first 1-2 attempts.
      let attempts = 0;
      const maxAttempts = 15;
      let busy = false;
      // Small initial delay — give the Stripe webhook time to fire before first poll
      const startPoll = () => {
        const poll = setInterval(async () => {
          if (busy) return; // prevent overlapping calls
          attempts++;
          busy = true;
          try {
            // Force-refetch permission to bypass staleTime cache
            await utils.songDownload.getPermission.invalidate({ songId });
            // Attempt the download — will throw FORBIDDEN if tip not yet recorded
            await downloadMutation.mutateAsync({ songId });
            clearInterval(poll);
            toast.dismiss("download-unlock");
            toast.success("✅ Download started! Your WID-tagged file is saving.");
            // Refresh ticker and activity thread
            utils.tips.recentTips.invalidate();
            utils.events.getByWork.invalidate({ workId: songId });
          } catch (e: any) {
            if (attempts >= maxAttempts) {
              clearInterval(poll);
              toast.dismiss("download-unlock");
              toast.error("Download unlock is taking longer than expected. Refresh the page and try downloading again.");
            } else {
              console.warn(`[download-unlock] attempt ${attempts}/${maxAttempts}: ${e?.message}`);
            }
          } finally {
            busy = false;
          }
        }, 2000); // poll every 2 seconds
      };
      // Wait 1.5s before first poll to give Stripe webhook time to fire
      setTimeout(startPoll, 1500);
    }
  }, []);

  /** Route all playback through the global player — this page owns no audio. */
  const handlePlay = () => {
    if (!song) return;
    if (isThisTrackActive) {
      // Track is already loaded in the global player — just toggle play/pause, do NOT restart
      togglePlay();
      return;
    }
    // Build queue: this song + related songs as the immutable snapshot
    const thisTrack = {
      id: String(song.id),
      title: song.title,
      artist: creator?.artistHandle || creator?.name || "Unknown",
      genre: song.genre || "",
      audioUrl: safeAudioUrl(song.fileUrl),
      artUrl: song.coverArtUrl || undefined,
      witnessId: song.witnessId || undefined,
      aiDisclosure: (creator?.aiDisclosure as any) || undefined,
      creatorHandle: creator?.artistHandle || creator?.name || undefined,
      creatorId: creator?.id ?? undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
      visualReady: song.visualReady ?? false,
      autoVideoUrl: song.autoVideoUrl ?? undefined,
      creatorRole: song.creator?.role ?? undefined,
      downloadPermission: (song as any).downloadPermission ?? null,
      downloadTipThresholdCents: (song as any).downloadTipThresholdCents ?? null,
    };
    const relatedTracks = (relatedData ?? []).map((item: any) => ({
      id: String(item.song.id),
      title: item.song.title,
      artist: item.creator?.artistHandle || item.creator?.name || "Unknown",
      genre: item.song.genre || "",
      audioUrl: item.song.fileUrl ? safeAudioUrl(item.song.fileUrl) : undefined,
      artUrl: item.song.coverArtUrl || undefined,
      witnessId: item.song.witnessId || undefined,
      creatorHandle: item.creator?.artistHandle || item.creator?.name || undefined,
      creatorId: item.creator?.id ?? undefined,
      visualReady: item.song.visualReady ?? false,
      autoVideoUrl: item.song.autoVideoUrl ?? undefined,
      creatorRole: item.creator?.role ?? undefined,
    }));
    const queue = [thisTrack, ...relatedTracks.filter((t: any) => t.id !== thisTrack.id && !!t.audioUrl)];
    playQueueAt(queue, 0, "SONG_DETAIL");
    playMutation.mutate({ songId });
    openNowPlayingPanel();
  };

  const handleReaction = (emoji: string) => {
    if (emoji === "+") { toast.info("More reactions coming soon!"); return; }
    if (!user) { toast.info("Sign in to react"); return; }
    toggleReactionMutation.mutate({ songId, type: emoji });
  };

  const handleTip = () => {
    if (!song) return;
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum gift is $1.00"); return; }
    tipMutation.mutate({ songId: song.id, amountCents: cents, origin: window.location.origin });
  };

  const copyLink = () => {
    // PDL: copy /share/:wid when available — this URL carries song-specific OG tags for Discord/social
    const shareUrl = song?.witnessId
      ? `https://www.livingnexus.org/share/${encodeURIComponent(song.witnessId)}`
      : window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied!");
    setShareOpen(false);
  };

  if (isLoading) return <SongDetailPageSkeleton />;

  if (!song || !songData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
      <div className="text-center">
        <p style={{ color: "var(--ln-smoke)" }}>Song not found.</p>
        <Link href="/"><Button className="mt-4" style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>Go Home</Button></Link>
      </div>
    </div>
  );

  const tipsEnabled = creator?.stripeAccountStatus === "enabled";
  const artistName = creator?.artistHandle || creator?.name || "Unknown Artist";
  const pageTitle = `${song.title} — ${artistName} | Living Nexus`;
  const pageDesc = song.genre
    ? `${song.genre} · ${artistName}${song.witnessId ? " · WID Verified" : ""}${(song as any).bpm ? ` · ${(song as any).bpm} BPM` : ""} — Listen on Living Nexus`
    : `Listen to ${song.title} by ${artistName} on Living Nexus`;
  const pageImage = song.coverArtUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";
  const pageUrl = `https://www.livingnexus.org/song/${songId}`;
  const audioFileUrl = song.fileUrl ? safeAudioUrl(song.fileUrl) : undefined;
  const embedVideoUrl = (song as any).embedVideoUrl as string | undefined;

  return (
    <div
      className={`min-h-screen pb-8 transition-all duration-700 cathedral-enter ${isThisTrackActive ? "harmonic-resonance" : ""}`}
    >
      {/* ══ STICKY MOBILE MANIFESTATION HEADER (slides in after hero scrolls past) ══ */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          top: "var(--wsp-top, 56px)",
          left: 0,
          right: 0,
          zIndex: 200,
          background: "rgba(8,7,4,0.97)",
          borderBottom: "1px solid rgba(196,154,40,0.15)",
          backdropFilter: "blur(20px)",
          transform: headerCollapsed ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
        }}
      >
        <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 40, height: 40, background: "rgba(196,154,40,0.08)" }}>
          {song?.coverArtUrl
            ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center" style={{ color: "rgba(196,154,40,0.4)" }}><Music className="w-5 h-5" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.92)", fontFamily: "'Cinzel', serif" }}>{song?.title}</p>
          <p className="text-xs truncate" style={{ color: "rgba(196,154,40,0.7)" }}>{creator?.artistHandle || creator?.name}</p>
        </div>
        <button
          type="button"
          onClick={handlePlay}
          className="shrink-0 flex items-center justify-center rounded-full transition-all"
          style={{ width: 36, height: 36, background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.35)", color: "rgba(196,154,40,0.9)" }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
      </div>


      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        {/* Open Graph — Discord, Facebook, iMessage, Telegram, Slack */}
        <meta property="og:site_name" content="Living Nexus" />
        <meta property="og:type" content="music.song" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="1200" />
        <meta property="og:url" content={pageUrl} />
        {audioFileUrl && <meta property="og:audio" content={audioFileUrl} />}
        {audioFileUrl && <meta property="og:audio:type" content="audio/mpeg" />}
        {embedVideoUrl && <meta property="og:video" content={embedVideoUrl} />}
        {embedVideoUrl && <meta property="og:video:type" content="video/mp4" />}
        {embedVideoUrl && <meta property="og:video:width" content="1280" />}
        {embedVideoUrl && <meta property="og:video:height" content="720" />}
        {/* Twitter / X */}
        <meta name="twitter:card" content={embedVideoUrl ? "player" : "summary_large_image"} />
        <meta name="twitter:site" content="@LivingNexus" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={pageImage} />
        {embedVideoUrl && <meta name="twitter:player" content={embedVideoUrl} />}
        {embedVideoUrl && <meta name="twitter:player:width" content="1280" />}
        {embedVideoUrl && <meta name="twitter:player:height" content="720" />}
        {audioFileUrl && <meta name="twitter:player:stream" content={audioFileUrl} />}
        {audioFileUrl && <meta name="twitter:player:stream:content_type" content="audio/mpeg" />}
      </Helmet>
      {/* ── Procedural Sacred Canvas — deterministic per creator, 2–5% opacity ── */}
      {creator?.id != null && (
        <SacredCanvas seed={creator.id} parallax />
      )}
      {/* Ambient cathedral scrim — radial glow behind the hero */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: song?.coverArtUrl
            ? "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,154,40,0.07) 0%, transparent 70%)"
            : "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(196,154,40,0.05) 0%, transparent 60%)",
          maxHeight: "600px",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-4" ref={heroRef}>
        <Link href={creator ? `/creator/${creator.id}` : "/"}>
          <button
            type="button"
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-all mb-6 group"
            style={{ color: "rgba(196,154,40,0.65)" }}
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", fontSize: "12px" }}>
              {creator?.artistHandle || creator?.name || "Back"}
            </span>
          </button>
        </Link>

        {/* ── Tip success banner ── */}
        {tipSuccess && (
          <div
            className="mb-6 rounded-2xl p-5 text-center animate-fade-up"
            style={{
              background: "rgba(196,154,40,0.06)",
              border: "1px solid rgba(196,154,40,0.3)",
            }}
          >
            <div className="text-2xl mb-2">🙏</div>
            <p className="font-heading text-base mb-1" style={{ color: "var(--ln-gold)" }}>
              Gift received — thank you!
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              The creator receives 90% of your gift directly. Your support is recorded on Living Nexus.
            </p>
            <button
              type="button"
              onClick={() => setTipSuccess(false)}
              className="mt-3 text-xs opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: "var(--ln-gold)" }}
            >
              Dismiss ✕
            </button>
          </div>
        )}
        {/* ══════════════════════════════════════════════════════════════
             CINEMATIC SONG HEADER — unified single play surface
        ══════════════════════════════════════════════════════════════ */}
        {false && (
          <div
            className="relative w-full overflow-hidden rounded-2xl mb-8 cathedral-enter-art"
            style={{
              height: "clamp(220px, 36vw, 420px)",
              background: "linear-gradient(135deg, #0d0b08, #000000)",
              border: isThisTrackActive
                ? "1px solid rgba(196,154,40,0.45)"
                : "1px solid rgba(196,154,40,0.12)",
              boxShadow: isThisTrackActive
                ? "0 0 60px rgba(196,154,40,0.18), 0 8px 40px rgba(0,0,0,0.7)"
                : "0 8px 40px rgba(0,0,0,0.5)",
              transition: "box-shadow 0.7s ease, border-color 0.7s ease",
            }}
          >
            {/* Full-bleed art */}
            <img
              src={song.coverArtUrl}
              alt={song.title}
              className={`w-full h-full object-cover transition-transform duration-[14000ms] ease-in-out ${isThisTrackActive ? "scale-[1.04]" : "scale-100"}`}
              style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }}
            />
            {/* Cinematic gradient overlay — bottom fade */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 40%, rgba(8,7,4,0.82) 100%)" }}
            />
            {/* Genre badge — top right */}
            {song.genre && (
              <div
                className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs tracking-widest uppercase"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(196,154,40,0.25)",
                  color: "rgba(196,154,40,0.85)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.12em",
                }}
              >
                {song.genre}
              </div>
            )}
            {/* WID badge — top left */}
            {song.witnessId && (
              <div
                className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]"
                style={{
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(196,154,40,0.20)",
                  color: "rgba(196,154,40,0.75)",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                <ShieldCheck className="w-3 h-3" /> WID
              </div>
            )}
            {/* Bottom-left: title + artist overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
              <h1
                className="font-heading leading-tight mb-1"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: "clamp(1.4rem, 3.5vw, 2.4rem)",
                  color: "rgba(255,255,255,0.96)",
                  textShadow: "0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(196,154,40,0.15)",
                  letterSpacing: "0.03em",
                }}
              >
                {song.title}
              </h1>
              <p
                className="text-sm"
                style={{ color: "rgba(196,154,40,0.80)", fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}
              >
                {creator?.artistHandle || creator?.name || ""}
              </p>
            </div>
            {/* Play button — bottom right */}
            {song.fileUrl && (
              <button
                type="button"
                onClick={handlePlay}
                className="absolute bottom-5 right-5 flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                style={{
                  width: 52,
                  height: 52,
                  background: isThisTrackActive ? "rgba(196,154,40,0.25)" : "rgba(196,154,40,0.15)",
                  border: "1px solid rgba(196,154,40,0.50)",
                  color: "rgba(196,154,40,0.95)",
                  backdropFilter: "blur(8px)",
                  boxShadow: isThisTrackActive ? "0 0 24px rgba(196,154,40,0.35)" : "0 0 12px rgba(196,154,40,0.15)",
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying
                  ? <Pause size={22} fill="currentColor" />
                  : <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />}
              </button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
             CINEMATIC SONG HEADER — unified single play surface
        ══════════════════════════════════════════════════════════════ */}
        <CinematicSongHeader
          title={song.title}
          artistName={creator?.artistHandle ?? creator?.name ?? "Unknown Creator"}
          genre={song.genre}
          witnessId={song.witnessId}
          coverArtUrl={song.coverArtUrl}
          coverPositionX={song.coverPositionX}
          coverPositionY={song.coverPositionY}
          videoUrl={(song as any).videoUrl}
          hasAudio={song.contentType !== "comic" && song.contentType !== "manuscript"}
          contentType={song.contentType}
          isOwner={isOwner}
          isThisTrackActive={isThisTrackActive}
          isPlaying={isPlaying}
          playCount={song.playCount ?? 0}
          commentCount={0}
          likeCount={likeCount}
          waveCanvasRef={waveCanvasRef as React.RefObject<HTMLCanvasElement>}
          onPlay={handlePlay}
          onReadNow={handleReadNow}
          onEditArt={() => {}}
        />

        {/* ══════════════════════════════════════════════════════════════
             ARCHIVE LAYOUT — authenticated artifact inside the Living Nexus Archive
        ══════════════════════════════════════════════════════════════ */}
        {(() => {
          const archiveIdentity = getArchiveIdentity((song as any).contentType);
          return (
            <ArchiveFrame identity={archiveIdentity}>

              {/* ── ARTIFACT PANEL — unified record ── */}
              <ArtifactPanel identity={archiveIdentity}>
                <ClassificationStamp
                  identity={archiveIdentity}
                  witnessId={song.witnessId}
                  registeredAt={song.createdAt}
                />

                {/* Title */}
                <h1
                  className="leading-tight mb-3"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: "var(--ln-parchment)",
                    fontSize: "clamp(1.75rem, 4vw, 3rem)",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textShadow: isThisTrackActive
                      ? "0 0 40px rgba(196,154,40,0.35), 0 2px 8px rgba(0,0,0,0.8)"
                      : "0 2px 8px rgba(0,0,0,0.6)",
                    transition: "text-shadow 0.7s ease",
                  }}
                >
                  {song.title}
                </h1>

                {/* Creator */}
                {creator && (
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-px h-5" style={{ background: archiveIdentity.accentDim }} />
                    <CreatorHandle
                      userId={creator.id}
                      handle={creator.artistHandle}
                      displayName={creator.name}
                      role={(creator as any).role}
                      size="md"
                    />
                  </div>
                )}

                {/* Metadata table */}
                <div className="mb-5 space-y-0">
                  {song.genre && (
                    <MetadataRow
                      label="Genre"
                      value={song.genre}
                      accent={archiveIdentity.accentDim}
                    />
                  )}
                  {(song.bpm || song.keySignature) && (
                    <MetadataRow
                      label="Key / Tempo"
                      value={[song.keySignature, song.bpm ? `${song.bpm} BPM` : null].filter(Boolean).join(" · ")}
                      accent={archiveIdentity.accentDim}
                    />
                  )}
                  {song.createdAt && (
                    <MetadataRow
                      label="Registered"
                      value={new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      accent={archiveIdentity.accentDim}
                    />
                  )}
                  {(song as any).contentType && (
                    <MetadataRow
                      label="Classification"
                      value={archiveIdentity.classification}
                      accent={archiveIdentity.accentDim}
                    />
                  )}
                </div>

                {/* Caption / description */}
                {(song as any).caption && (
                  <p
                    className="text-base leading-relaxed mb-5"
                    style={{
                      color: "var(--ln-bone)",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: "italic",
                      fontSize: "1.05rem",
                      borderLeft: `2px solid ${archiveIdentity.accentDim}`,
                      paddingLeft: "1rem",
                    }}
                  >
                    {(song as any).caption}
                  </p>
                )}

                {/* WID Certificate */}
                {song.witnessId && (
                  <div className="mb-5">
                    <WIDCertificate
                      witnessId={song.witnessId}
                      creatorName={creator?.artistHandle || creator?.name || "Unknown Creator"}
                      registeredAt={song.createdAt}
                      certificateUrl={song.certificateUrl}
                      identity={archiveIdentity}
                    />
                  </div>
                )}

                {/* Action tools */}
                <div className="flex flex-wrap gap-2.5 pt-4" style={{ borderTop: `1px solid ${archiveIdentity.accentDim.replace(/[\d.]+\)$/, "0.12)")}` }}>
                  {!isOwner && (
                    <Button size="sm" variant="outline" onClick={e => toggleLike(e)}
                      style={isLiked
                        ? { borderColor: "rgba(239,68,68,0.6)", color: "var(--ln-ember)" }
                        : { borderColor: archiveIdentity.accentDim, color: "var(--ln-smoke)" }}>
                      <Heart className="w-3.5 h-3.5 mr-1" fill={isLiked ? "currentColor" : "none"} />
                      {isLiked ? "Liked" : "Like"}
                      {likeCount > 0 && <span className="ml-1 text-[11px] tabular-nums opacity-70">{likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}</span>}
                    </Button>
                  )}
                  {!isOwner && <AddToPlaylistButton songId={song.id} variant="full" />}
                  {!isOwner && <AddToNamedPlaylistPopover songId={song.id} songTitle={song.title} variant="full" />}
                  {/* Download */}
                  {(() => {
                    const dlPerm = (song as any).downloadPermission as string | undefined;
                    const tipCents = (song as any).downloadTipThresholdCents as number | undefined;
                    if (!dlPerm || dlPerm === "none") return null;
                    if (dlPerm === "free") return (
                      <Button size="sm" variant="outline"
                        onClick={() => {
                          if (!user) { toast.info("Sign in to download this track"); return; }
                          downloadMutation.mutate({ songId: song.id });
                        }}
                        disabled={downloadMutation.isPending}
                        style={{ borderColor: archiveIdentity.accentDim, color: "var(--ln-smoke)" }}>
                        <Download className="w-3.5 h-3.5 mr-1" />
                        {downloadMutation.isPending ? "…" : "Download"}
                      </Button>
                    );
                    if (dlPerm === "tip_required" && tipCents) return (
                      <Button size="sm" variant="outline"
                        onClick={() => {
                          if (!user) { toast.info("Sign in to download"); return; }
                          setTipOpen(true);
                        }}
                        style={{ borderColor: archiveIdentity.accentDim, color: "var(--ln-smoke)" }}>
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download (Gift ${(tipCents / 100).toFixed(2)}+)
                      </Button>
                    );
                    return null;
                  })()}
                  {/* Share */}
                  <Button size="sm" variant="outline"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
                    style={{ borderColor: archiveIdentity.accentDim, color: "var(--ln-smoke)" }}>
                    <Share2 className="w-3.5 h-3.5 mr-1" />Share
                  </Button>
                  {/* Gift */}
                  {!isOwner && (
                    <Button size="sm" variant="outline"
                      onClick={() => { if (!user) { toast.info("Sign in to gift"); return; } setTipOpen(true); }}
                      style={{ borderColor: archiveIdentity.accentDim, color: "var(--ln-smoke)" }}>
                      <DollarSign className="w-3.5 h-3.5 mr-1" />Gift
                    </Button>
                  )}
                  {/* Owner edit */}
                  {isOwner && (
                    <Button size="sm" variant="outline"
                      onClick={() => setDrawerOpen(true)}
                      style={{ borderColor: archiveIdentity.accentColor, color: archiveIdentity.accentColor }}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />Edit Record
                    </Button>
                  )}
                  <FlagContentButton workId={song.id} workType={(song as any).contentType === 'manuscript' ? 'manuscript' : (song as any).contentType === 'comic' ? 'comic' : (song as any).contentType === 'lyrics' ? 'lyrics' : 'audio'} />
                </div>
              </ArtifactPanel>

              {/* ── ORIGIN STORY ── */}
              {(() => {
                const hasOrigin = !!(song as any).originStory;
                const hasHaai = !!(song as any).haaiDisclosureLevel;
                if (!hasOrigin && !hasHaai) return null;
                const discInfo = (() => {
                  const level = (song as any).haaiDisclosureLevel;
                  if (!level) return null;
                  const map: Record<string, { label: string; desc: string }> = {
                    human_only: { label: "Human Only", desc: "This work was created entirely without AI assistance." },
                    ai_assisted: { label: "AI-Assisted", desc: "AI tools were used in the creation of this work." },
                    ai_generated: { label: "AI-Generated", desc: "This work was primarily generated by AI." },
                    haai: { label: "HAAI — Human-Authored, AI-Informed", desc: "The human is the author. AI served as a tool in service of the creator's vision." },
                  };
                  return map[level] ?? null;
                })();
                const haaiFields: { key: string; label: string }[] = [
                  { key: "haaiAiRole", label: "AI Role" },
                  { key: "haaiHumanContribution", label: "Human Contribution" },
                  { key: "haaiToolsUsed", label: "Tools Used" },
                  { key: "haaiCreativeProcess", label: "Creative Process" },
                ].filter(f => !!(song as any)[f.key]);
                return (
                  <ArchiveSection label="Origin Story" accent={archiveIdentity.accentDim}>
                    {hasOrigin && (
                      <p
                        className="text-base leading-relaxed mb-6"
                        style={{
                          color: "var(--ln-bone)",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: "1.05rem",
                          lineHeight: 1.85,
                        }}
                      >
                        {(song as any).originStory}
                      </p>
                    )}
                    {discInfo && (
                      <div className="rounded-sm px-4 py-3 mb-4" style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle }}>
                        <p className="text-[10px] tracking-[0.18em] uppercase mb-1" style={{ fontFamily: "'Cinzel', serif", color: archiveIdentity.accentColor }}>{discInfo.label}</p>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--ln-bone)", fontFamily: "'Cormorant Garamond', serif" }}>{discInfo.desc}</p>
                        {(song as any).haaiDeclaredAt && (
                          <p className="text-[10px] mt-2" style={{ color: archiveIdentity.accentDim, fontFamily: "'Space Mono', monospace" }}>
                            Declared {new Date((song as any).haaiDeclaredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        )}
                      </div>
                    )}
                    {haaiFields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {haaiFields.map(f => (
                          <div key={f.key} className="rounded-sm px-4 py-3" style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle }}>
                            <p className="text-[9px] tracking-[0.18em] uppercase mb-1.5" style={{ fontFamily: "'Cinzel', serif", color: archiveIdentity.accentDim }}>{f.label}</p>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--ln-bone)", fontFamily: "'Cormorant Garamond', serif" }}>{(song as any)[f.key]}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ArchiveSection>
                );
              })()}

              {/* ── PROVENANCE RECORD ── */}
              <ArchiveSection label="Provenance Record" accent={archiveIdentity.accentDim}>
                {/* Provenance items */}
                {provenanceItems && provenanceItems.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {provenanceItems.map((item: any) => {
                      const iconMap: Record<string, any> = { file: FileText, link: Link2, note: StickyNote };
                      const colorMap: Record<string, string> = { file: "rgba(196,154,40,0.8)", link: "rgba(96,165,250,0.8)", note: "rgba(167,243,208,0.8)" };
                      const Icon = iconMap[item.type] ?? FileText;
                      const color = colorMap[item.type] ?? archiveIdentity.accentColor;
                      return (
                        <div key={item.id} className="flex items-start gap-3 px-4 py-3 rounded-sm" style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle }}>
                          <div className="flex-shrink-0 mt-0.5 p-1.5 rounded" style={{ background: "rgba(196,154,40,0.07)" }}>
                            <Icon className="w-3.5 h-3.5" style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{item.title}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: "rgba(196,154,40,0.06)", color, border: `1px solid ${color.replace("0.8", "0.25")}` }}>{item.type}</span>
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
                              <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", color: "rgba(74,222,128,0.7)" }} title={`SHA-256: ${item.hash}`}>
                                <Hash className="w-2.5 h-2.5" />{item.hash.slice(0, 16)}…
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <ActivationPanel songId={songId} songTitle={song.title} />
                <div className="mt-6">
                  <ProvenanceTimeline songId={songId} ownerId={song.userId} />
                </div>
                <div className="mt-4">
                  <LineageGraph songId={songId} songTitle={song.title} ownerId={song.userId} />
                </div>
                <div className="mt-4">
                  <WitnessesPanel songId={songId} ownerId={song.userId} />
                </div>
                <div className="mt-4">
                  <EvidencePanel
                    songId={songId}
                    isOwner={isOwner}
                    manifestation={{
                      coverArtUrl: song.coverArtUrl,
                      fileUrl: song.fileUrl,
                      headlineCaption: (song as any).headlineCaption,
                      description: (song as any).description,
                      title: song.title,
                    }}
                  />
                </div>
                {/* Sovereign Stamp */}
                {(song as any).sovereignStampId && (
                  <div className="mt-4 rounded-sm px-4 py-3" style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle }}>
                    <div className="flex items-start gap-3">
                      <span style={{ fontSize: "18px", lineHeight: 1 }}>🔏</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: archiveIdentity.accentColor }}>Sovereign Stamp Applied</p>
                        <p className="text-xs font-mono break-all" style={{ color: "var(--ln-parchment)" }}>{(song as any).sovereignStampId}</p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--ln-smoke)" }}>Near-ultrasonic tone embedded — 17 U.S.C. § 102(a)</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Harmonic Signature downloads */}
                {isOwner && (song as any).harmonicSignature && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <a href={`/api/harmonic/${song.id}/audio`} download className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm hover:opacity-80 transition-opacity" style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle, color: archiveIdentity.accentColor }}>
                      <Download className="w-3 h-3" />Harmonic Tone (.wav)
                    </a>
                    <a href={`/api/harmonic/${song.id}/image`} download className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm hover:opacity-80 transition-opacity" style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle, color: archiveIdentity.accentColor }}>
                      <Download className="w-3 h-3" />Waveform Image (.png)
                    </a>
                  </div>
                )}
              </ArchiveSection>

              {/* ── FIND IT ELSEWHERE ── */}
              {(() => {
                const raw = (song as any).externalLinksJson;
                if (!raw) return null;
                let links: Array<{ platform: string; url: string }> = [];
                try { links = JSON.parse(raw); } catch { return null; }
                if (!links.length) return null;
                return (
                  <ArchiveSection label="Find It Elsewhere" accent={archiveIdentity.accentDim}>
                    <div className="flex flex-wrap gap-3">
                      {links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm text-sm font-medium transition-all hover:scale-[1.02]"
                          style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle, color: archiveIdentity.accentColor, fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }}>
                          <ExternalLink className="w-3.5 h-3.5" />
                          {link.platform}
                        </a>
                      ))}
                    </div>
                  </ArchiveSection>
                );
              })()}

              {/* ── GALLERY ── */}
              {(() => {
                const rawGallery = (song as any).galleryImagesJson;
                if (!rawGallery) return null;
                let gallery: { url: string; caption?: string }[] = [];
                try { gallery = typeof rawGallery === "string" ? JSON.parse(rawGallery) : rawGallery; } catch { return null; }
                if (!gallery.length) return null;
                return (
                  <ArchiveSection label="Gallery" accent={archiveIdentity.accentDim}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {gallery.map((img, i) => (
                        <div key={i} className="space-y-1">
                          <div className="overflow-hidden aspect-square" style={{ border: archiveIdentity.borderStyle }}>
                            <img src={img.url} alt={img.caption || `Gallery image ${i + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                              onClick={() => window.open(img.url, "_blank")} />
                          </div>
                          {img.caption && <p className="text-[10px] leading-tight px-1" style={{ color: "var(--ln-iron)" }}>{img.caption}</p>}
                        </div>
                      ))}
                    </div>
                  </ArchiveSection>
                );
              })()}

              {/* ── LYRICS ── */}
              {song.lyricsText && (
                <ArchiveSection label="Lyrics" accent={archiveIdentity.accentDim}>
                  <div
                    className="relative px-6 py-6 rounded-sm"
                    style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle, borderLeft: `3px solid ${archiveIdentity.accentDim}` }}
                    onCopy={e => {
                      const selected = window.getSelection()?.toString() ?? "";
                      const registeredDate = song.createdAt ? new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown";
                      const cert = song.witnessId ? [
                        "\n\n═══════════════════════════════",
                        "WITNESS ID CERTIFICATE",
                        `WID: ${song.witnessId}`,
                        `Creator: ${creator?.artistHandle || creator?.name || "Unknown Artist"}`,
                        `Registered: ${registeredDate}`,
                        `Verify: https://www.livingnexus.org/verify/${song.witnessId}`,
                        "═══════════════════════════════",
                      ].join("\n") : "";
                      e.clipboardData.setData("text/plain", selected + cert);
                      e.preventDefault();
                    }}
                  >
                    <pre className="text-sm leading-8 whitespace-pre-wrap font-sans" style={{ color: "var(--ln-parchment)" }}>
                      {song.lyricsText}
                    </pre>
                    {song.witnessId && (
                      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${archiveIdentity.accentDim.replace(/[\d.]+\)$/, "0.12)")}` }}>
                        <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: "var(--ln-smoke)" }}>{[
                          "═══════════════════════════════",
                          "WITNESS ID CERTIFICATE",
                          `WID: ${song.witnessId}`,
                          `Creator: ${creator?.artistHandle || creator?.name || "Unknown Artist"}`,
                          `Registered: ${song.createdAt ? new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown"}`,
                          `Verify: https://www.livingnexus.org/verify/${song.witnessId}`,
                          "═══════════════════════════════",
                        ].join("\n")}</pre>
                      </div>
                    )}
                    {(song as any).lyricsWid && (
                      <div className="mt-3 px-3 py-2 rounded flex items-center gap-2" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.15)" }}>
                        <Shield className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                        <div className="min-w-0">
                          <p className="text-[9px] font-heading tracking-widest uppercase mb-0.5" style={{ color: "rgba(196,154,40,0.6)" }}>Lyrics Witness ID (WID-LYR)</p>
                          <p className="text-[11px] font-mono truncate" style={{ color: "var(--ln-gold)" }}>{(song as any).lyricsWid}</p>
                          {(song as any).lyricsFileName && (
                            <p className="text-[9px] mt-0.5" style={{ color: "var(--ln-smoke)" }}>{(song as any).lyricsFileName}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ArchiveSection>
              )}

              {/* ── VOICES — Comments ── */}
              <ArchiveSection label="Voices" accent={archiveIdentity.accentDim}>
                {/* Emoji reactions */}
                {reactionData && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {REACTION_SLUGS.map(slug => {
                      const count = reactionData[slug] ?? 0;
                      const myReaction = myReactionData?.[slug] ?? false;
                      return (
                        <button key={slug} type="button"
                          onClick={() => reactMutation.mutate({ songId: song.id, type: slug })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-sm transition-all hover:scale-105"
                          style={{
                            background: myReaction ? archiveIdentity.headerBg : "rgba(255,255,255,0.03)",
                            border: myReaction ? archiveIdentity.borderStyle : "1px solid rgba(255,255,255,0.06)",
                            color: myReaction ? archiveIdentity.accentColor : "var(--ln-smoke)",
                          }}>
                          <span>{REACTION_EMOJI[slug]}</span>
                          {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Comment input */}
                <div className="mb-6">
                  {user ? (
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                        style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle, color: archiveIdentity.accentColor }}>
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Leave a voice on this record…"
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          rows={2}
                          style={{ background: "rgba(255,255,255,0.02)", border: archiveIdentity.borderStyle, color: "var(--ln-parchment)", fontSize: "13px", resize: "none", fontFamily: "'Cormorant Garamond', serif" }}
                        />
                        {commentText.trim() && (
                          <Button size="sm"
                            onClick={() => commentMutation.mutate({ songId: song.id, content: commentText.trim() })}
                            disabled={commentMutation.isPending}
                            style={{ background: archiveIdentity.accentColor, color: "var(--ln-void)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em", fontSize: "11px" }}>
                            {commentMutation.isPending ? "…" : "Record Voice"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-center py-3" style={{ color: "var(--ln-smoke)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                      Sign in to leave a voice on this record
                    </p>
                  )}
                </div>

                {/* Comment list */}
                <div className="space-y-4">
                  {comments && comments.length > 0 ? (
                    comments.map((c: any) => {
                      const isReplying = replyingTo?.id === c.id;
                      return (
                        <div key={c.id} className="space-y-2">
                          <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                              style={{ background: archiveIdentity.headerBg, border: archiveIdentity.borderStyle, color: archiveIdentity.accentColor }}>
                              {(c.authorName || "A").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{c.authorName || "Anonymous"}</span>
                                <span className="text-[9px]" style={{ color: "var(--ln-smoke)" }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: "var(--ln-bone)", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.97rem" }}>{c.content}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button type="button" onClick={() => { setReplyingTo(isReplying ? null : c); setReplyText(""); }}
                                  className="text-[10px] tracking-wide hover:underline"
                                  style={{ color: archiveIdentity.accentDim }}>
                                  {isReplying ? "Cancel" : `Reply · ${c.replies?.length ?? 0}`}
                                </button>
                              </div>
                            </div>
                          </div>
                          {isReplying && (
                            <div className="ml-10 flex gap-2">
                              <Input
                                placeholder={`Reply to ${c.authorName ?? "comment"}…`}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                                    e.preventDefault();
                                    replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim() });
                                  }
                                  if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                                }}
                                style={{ background: "rgba(255,255,255,0.02)", border: archiveIdentity.borderStyle, color: "var(--ln-parchment)", fontSize: "12px", height: "32px" }}
                                autoFocus
                              />
                              {replyText.trim() && (
                                <Button size="sm"
                                  onClick={() => replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim() })}
                                  disabled={replyMutation.isPending}
                                  className="h-8 text-[11px] px-2 flex-shrink-0"
                                  style={{ background: archiveIdentity.accentColor, color: "var(--ln-void)" }}>
                                  Post
                                </Button>
                              )}
                            </div>
                          )}
                          {c.replies?.length > 0 && (
                            <div className="ml-10 space-y-2 pl-3" style={{ borderLeft: `1px solid ${archiveIdentity.accentDim.replace(/[\d.]+\)$/, "0.20)")}` }}>
                              {(c.replies as any[]).map((r: any) => (
                                <div key={r.id} className="flex gap-2">
                                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                                    style={{ background: archiveIdentity.headerBg, color: archiveIdentity.accentDim }}>
                                    {(r.authorName || "A").charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="text-[10px] font-medium" style={{ color: "var(--ln-smoke)" }}>{r.authorName || "Anonymous"}</span>
                                      <span className="text-[9px]" style={{ color: "var(--ln-iron)" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>{r.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-center py-6" style={{ color: "var(--ln-iron)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                      No voices recorded yet. Be the first.
                    </p>
                  )}
                </div>
              </ArchiveSection>

              {/* ── RELATED WORKS ── */}
              {relatedData && relatedData.length > 0 && (
                <ArchiveSection label="Related Works" accent={archiveIdentity.accentDim}>
                  <div className="space-y-1">
                    {relatedData.map((item: any) => <RelatedCard key={item.song.id} item={item} />)}
                  </div>
                </ArchiveSection>
              )}

              {/* ── CREDITS ── */}
              {(() => {
                const rawCredits = (song as any)?.creditsJson;
                const coWriters: string[] = Array.isArray((song as any)?.coWriters) ? (song as any).coWriters : [];
                let credits: { role: string; name: string }[] = [];
                if (rawCredits) { try { credits = JSON.parse(rawCredits); } catch { /* ignore */ } }
                const allCredits = [...credits, ...coWriters.map((name: string) => ({ role: "Co-Writer", name }))];
                if (allCredits.length === 0) return null;
                return (
                  <ArchiveSection label="Credits" accent={archiveIdentity.accentDim}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {allCredits.map((c: { role: string; name: string }, i: number) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <span className="text-[9px] uppercase tracking-widest flex-shrink-0 px-1.5 py-0.5 rounded-sm"
                            style={{
                              background: c.role.toLowerCase() === "publisher" ? "rgba(59,130,246,0.18)" : archiveIdentity.headerBg,
                              color: c.role.toLowerCase() === "publisher" ? "#93C5FD" : archiveIdentity.accentColor,
                              border: `1px solid ${c.role.toLowerCase() === "publisher" ? "rgba(59,130,246,0.3)" : archiveIdentity.accentDim.replace(/[\d.]+\)$/, "0.25)")}`,
                              minWidth: "64px",
                              textAlign: "center",
                              fontFamily: "'Cinzel', serif",
                            }}
                          >{c.role}</span>
                          <span className="text-sm" style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif" }}>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </ArchiveSection>
                );
              })()}

            </ArchiveFrame>
          );
                })()}
      </div>
      {/* Gift Modal */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", maxHeight: "min(90dvh, 90vh)", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              Gift {creator?.artistHandle || creator?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>90% goes directly to the artist. 10% supports Living Nexus.</p>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(amt => (
                <button type="button" key={amt} onClick={() => setTipAmount(amt)} className="py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: tipAmount === amt ? "var(--ln-gold)" : "var(--ln-coal)", color: tipAmount === amt ? "var(--ln-parchment)" : "var(--ln-parchment)", border: "1px solid #C3AB7D" }}>
                  ${amt}
                </button>
              ))}
            </div>
            <Input type="number" placeholder="Custom amount ($)" value={tipAmount} onChange={e => setTipAmount(e.target.value)} min="1" step="0.01"
              style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", color: "var(--ln-parchment)" }} />
            <Button className="w-full" onClick={handleTip} disabled={tipMutation.isPending}
              style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
              {tipMutation.isPending ? "Processing..." : `Send $${tipAmount || "0"} Gift`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Modal */}
      {song && (
        <VersionHistoryModal
          songId={song.id}
          songTitle={song.title}
          isOwner={isOwner}
          open={versionHistoryOpen}
          onClose={() => setVersionHistoryOpen(false)}
        />
      )}

      {/* ── COMIC / MANUSCRIPT READER OVERLAY ── */}
      {readerOpen && song && (() => {
        const pages: BookPage[] = (() => {
          try { return (song as any).pagesJson ? JSON.parse((song as any).pagesJson) : []; } catch { return []; }
        })();
        // handleReadNow already redirected to /book/:id if no pages — this guard is a safety net
        if (pages.length === 0) return null;
        return (
          <div className="fixed inset-0 z-[200]">
            <CinematicComicReader
              pages={pages}
              title={song.title}
              onClose={() => setReaderOpen(false)}
            />
          </div>
        );
      })()}

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", maxWidth: "480px", maxHeight: "min(90dvh, 90vh)", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Share Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Embed preview — shows how the link looks in Discord/iMessage */}
            <div>
              <p className="text-[10px] font-semibold mb-2 tracking-widest" style={{ color: "var(--ln-iron)", fontFamily: "'Orbitron', sans-serif" }}>EMBED PREVIEW</p>
              <div className="rounded-xl overflow-hidden" style={{ background: "var(--ln-coal)", borderTop: "3px solid #C49A28", borderRight: "3px solid #C49A28", borderBottom: "3px solid #C49A28", borderLeft: "4px solid #C49A28" }}>
                <div className="flex gap-3 p-3">
                  {song.coverArtUrl && (
                    <img
                      src={song.coverArtUrl}
                      alt={song.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold mb-0.5" style={{ color: "var(--ln-gold)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.06em" }}>LIVING NEXUS</p>
                    <p className="text-sm font-bold truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
                    <p className="text-xs truncate" style={{ color: "var(--ln-smoke)" }}>{creator?.artistHandle || creator?.name || "Unknown Artist"}</p>
                    {song.genre && <p className="text-[10px] mt-0.5" style={{ color: "var(--ln-iron)" }}>{song.genre}{song.witnessId ? " · WID Protected" : ""}</p>}
                  </div>
                </div>
                {(song as any).embedVideoUrl ? (
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ln-seal-bright)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      Video embed ready — Discord will show inline player
                    </div>
                  </div>
                ) : (
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      Image embed — video generating in background
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "var(--ln-iron)" }}>This is how your link will appear in Discord, iMessage, Telegram, and Slack.</p>
            </div>

            {/* Copy link */}
            <div className="flex gap-2">
              <Input value={window.location.href} readOnly
                style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", color: "var(--ln-smoke)", fontSize: "12px" }} />
              <Button onClick={copyLink} style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)", flexShrink: 0 }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Platform share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Listening to "${song.title}" on Living Nexus`)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noreferrer" className="block">
                <Button variant="outline" className="w-full" style={{ borderColor: "#C3AB7D", color: "var(--ln-smoke)" }}>
                  <Twitter className="w-4 h-4 mr-2" />Share on X
                </Button>
              </a>
              <Button variant="outline" className="w-full"
                style={{ borderColor: "#C3AB7D", color: "var(--ln-smoke)" }}
                onClick={() => {
                  const discordMsg = `${song.title} — ${creator?.artistHandle || creator?.name || "Unknown"} | ${window.location.href}`;
                  navigator.clipboard.writeText(discordMsg);
                  toast.success("Discord message copied!");
                  setShareOpen(false);
                }}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.114 18.1.132 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                Copy for Discord
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Owner: Creative Drawer ── */}
      {(editingOpen || drawerOpen) && song && (
        <ErrorBoundary inline>
          <CreativeDrawer
            song={{
              id: song.id,
              title: song.title,
              genre: song.genre ?? null,
              caption: (song as any).caption ?? null,
              coverArtUrl: song.coverArtUrl ?? null,
              aiConsent: (song as any).aiConsent ?? null,
              status: (song as any).status ?? "Published",
              lyricsText: song.lyricsText ?? null,
              haaiOriginStory: (song as any).haaiOriginStory ?? null,
              aiDisclosure: (song as any).aiDisclosure ?? null,
              contentType: (song as any).contentType ?? "audio",
              releaseDate: (song as any).releaseDate ?? null,
              description: (song as any).description ?? null,
              witnessId: song.witnessId ?? null,
              videoUrl: (song as any).videoUrl ?? null,
              videoWitnessId: (song as any).videoWitnessId ?? null,
              externalLinksJson: (song as any).externalLinksJson ?? null,
              downloadPermission: (song as any).downloadPermission ?? null,
              downloadTipThresholdCents: (song as any).downloadTipThresholdCents ?? null,
            }}
            onClose={handleEditClose}
            onSaved={handleEditSaved}
          />
        </ErrorBoundary>
      )}

    </div>
  );
}