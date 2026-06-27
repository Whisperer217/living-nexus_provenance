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

        {/* ── TESTIMONY CHAMBER — single-column layout below the header ── */}
        <div className="flex flex-col gap-10 mb-10">

          {/* HIDDEN: old left column sentinel — kept for diff clarity */}
          {false && <div className="flex flex-col gap-5 cathedral-enter-art">
            {/* Cover art — large, square, sticky on desktop */}
            <div>
              {/* Video player */}
              {(song as any).videoUrl && (
                <div className="w-full rounded-2xl overflow-hidden mb-3" style={{ aspectRatio: "16/9", background: "var(--ln-coal)" }}>
                  {showVideo ? (
                    <video ref={videoDetailRef} src={(song as any).videoUrl} className="w-full h-full object-contain" controls playsInline autoPlay={isPlaying} muted={false} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center cursor-pointer group relative" onClick={() => setShowVideo(true)} style={{ background: "var(--ln-coal)" }}>
                      {song.coverArtUrl
                        ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                        : <Music className="w-16 h-16 opacity-10" style={{ color: "var(--ln-gold)" }} />}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>
                          <Video size={14} /> Watch Video
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(song as any).videoUrl && (
                <button onClick={() => setShowVideo(v => !v)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg mb-3 transition-all"
                  style={{ background: showVideo ? "rgba(196,154,40,0.08)" : "var(--ln-coal)", color: showVideo ? "var(--ln-gold)" : "var(--ln-iron)", border: `1px solid ${showVideo ? "rgba(196,154,40,0.3)" : "var(--ln-gold)"}` }}>
                  {showVideo ? <><ImageIcon size={12} /> Cover Art</> : <><Video size={12} /> Music Video</>}
                </button>
              )}
              {/* T2: Luminous Glow Ring wrapper — outer animated ring around cover art */}
              <div
                className={isThisTrackActive ? "glow-ring-active" : "glow-ring-idle"}
                style={{ borderRadius: "1.35rem", display: "block" }}
              >
              {/* Cover art — full-bleed cathedral sanctuary */}
              <div
                className={`relative w-full overflow-hidden group cursor-pointer sg-hero-frame transition-all duration-700 ${isThisTrackActive ? "witness-card sacred-active" : ""}`}
                style={{
                  aspectRatio: "1/1",
                  background: "linear-gradient(135deg, #0d0b08, #000000)",
                  borderRadius: "1.25rem",
                  border: isThisTrackActive
                    ? "1px solid rgba(196,154,40,0.55)"
                    : "1px solid rgba(196,154,40,0.18)",
                }}
                onClick={song.fileUrl ? handlePlay : ((song as any).contentType === "comic" || (song as any).contentType === "manuscript") ? handleReadNow : undefined}
              >
                {song.coverArtUrl
                  ? <img src={song.coverArtUrl} alt={song.title} className={`w-full h-full object-cover ${song.fileUrl ? "cover-art-breathe" : ""}`} style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                  : (
                    /* Missing Art Sanctuary — sacred void, three relic rings, animated breathe */
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-6 missing-art-void"
                      style={{
                        background: "linear-gradient(160deg, #130f1e 0%, #0a0812 45%, #060409 100%)",
                      }}
                    >
                      {/* Sacred geometry ornament — three concentric relic rings */}
                      <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                        {/* Outer ring — slow breathe */}
                        <div
                          className="absolute inset-0 rounded-full relic-ring-outer"
                          style={{ border: "1px solid rgba(196,154,40,0.20)", boxShadow: "0 0 20px rgba(196,154,40,0.06)" }}
                        />
                        {/* Middle ring */}
                        <div
                          className="absolute inset-[14px] rounded-full relic-ring-inner"
                          style={{ border: "1px solid rgba(196,154,40,0.14)" }}
                        />
                        {/* Inner ring — tightest */}
                        <div
                          className="absolute inset-[28px] rounded-full"
                          style={{ border: "1px solid rgba(196,154,40,0.08)" }}
                        />
                        {/* Center icon */}
                        <Music
                          className="relic-icon"
                          style={{ width: 30, height: 30, color: "rgba(196,154,40,0.40)", filter: "drop-shadow(0 0 8px rgba(196,154,40,0.22))" }}
                        />
                      </div>
                      <div className="text-center px-8">
                        <p
                          className="font-heading tracking-[0.18em] uppercase mb-2"
                          style={{ fontSize: "0.78rem", color: "rgba(196,154,40,0.52)", textShadow: "0 0 20px rgba(196,154,40,0.18)" }}
                        >
                          Awaiting Visual Testimony
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "rgba(255,255,255,0.18)", lineHeight: 1.6 }}
                        >
                          This work has not yet received its cover art
                        </p>
                      </div>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setEditingOpen(true); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 btn-gold-glow"
                          style={{
                            background: "rgba(196,154,40,0.10)",
                            border: "1px solid rgba(196,154,40,0.42)",
                            color: "var(--ln-gold)",
                            fontFamily: "'Cinzel', serif",
                            letterSpacing: "0.06em",
                            boxShadow: "0 0 16px rgba(196,154,40,0.12)",
                          }}
                        >
                          <ImageIcon size={14} /> Bestow Cover Art
                        </button>
                      )}
                    </div>
                  )}
                {/* Waveform canvas — now moved to dedicated strip below art (see waveform-strip below) */}
                {/* Play/pause overlay */}
                {song.fileUrl && (
                  <div className={`absolute inset-0 flex items-center justify-center transition-all ${ isThisTrackActive ? "bg-black/25" : "bg-black/0 group-hover:bg-black/40" }`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${ isThisTrackActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90" }`}
                      style={{ background: "rgba(196,154,40,0.92)", boxShadow: "0 0 40px rgba(196,154,40,0.4)" }}>
                      {isPlaying ? <Pause className="w-8 h-8" style={{ color: "#0A0B08" }} /> : <Play className="w-8 h-8 ml-1" style={{ color: "#0A0B08" }} />}
                    </div>
                  </div>
                )}
                {/* READ NOW overlay for comics/manuscripts */}
                {!song.fileUrl && ((song as any).contentType === "comic" || (song as any).contentType === "manuscript") && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all">
                    <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 px-6 py-3 rounded-full" style={{ background: "rgba(196,154,40,0.92)", boxShadow: "0 0 40px rgba(196,154,40,0.4)" }}>
                      <BookOpen className="w-5 h-5" style={{ color: "#0A0B08" }} />
                      <span className="text-sm font-heading font-bold tracking-widest" style={{ color: "#0A0B08" }}>READ NOW</span>
                    </div>
                  </div>
                )}
                {/* Live indicator */}
                {isThisTrackActive && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(196,154,40,0.4)" }}>
                    <div className="live-wave scale-75"><span /><span /><span /><span /><span /></div>
                    <span className="text-[9px] font-heading tracking-widest" style={{ color: "rgba(196,154,40,0.8)" }}>LIVE</span>
                  </div>
                )}
              </div>
              </div>{/* end glow-ring wrapper */}

              {/* T7: Waveform Strip — dedicated strip below cover art */}
              {song.fileUrl && (
                <div className="waveform-strip mt-1" style={{ background: "rgba(0,0,0,0.55)", borderRadius: "0.75rem", border: "1px solid rgba(196,154,40,0.10)" }}>
                  <canvas
                    ref={waveCanvasRef}
                    width={800}
                    height={80}
                    className={`waveform-strip-canvas${isPlaying ? " playing" : ""}`}
                    style={{ height: "80px", opacity: isPlaying ? 0.9 : 0.35 }}
                  />
                </div>
              )}

              {/* Primary CTA button — below art */}
              {(() => {
                const isReadable = (song as any).contentType === "comic" || (song as any).contentType === "manuscript";
                return (
                  <div className="mt-4 flex flex-col gap-2">
                    {isReadable ? (
                      /* Comics/manuscripts: READ NOW is primary, audio play is secondary if available */
                      <>
                        <button type="button" onClick={handleReadNow}
                          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-heading font-bold tracking-widest text-sm living-btn living-btn-primary"
                          style={{ background: "rgba(196,154,40,0.92)", border: "1px solid rgba(196,154,40,0.6)", color: "#0A0B08", boxShadow: "0 4px 24px rgba(196,154,40,0.2)" }}>
                          <BookOpen size={16} style={{ color: "#0A0B08" }} />
                          READ NOW
                        </button>
                        {song.fileUrl && (
                          <button type="button" onClick={handlePlay}
                            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl font-heading font-bold tracking-widest text-xs living-btn"
                            style={{ background: isPlaying ? "rgba(196,154,40,0.15)" : "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.35)", color: isPlaying ? "rgba(196,154,40,0.9)" : "rgba(196,154,40,0.7)" }}>
                            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            {isPlaying ? "NOW PLAYING" : "LISTEN"}
                          </button>
                        )}
                      </>
                    ) : (
                      /* Audio/lyrics: PLAY NOW is primary */
                      song.fileUrl && (
                        <button type="button" onClick={handlePlay}
                          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-heading font-bold tracking-widest text-sm living-btn living-btn-primary"
                          style={{ background: isPlaying ? "rgba(196,154,40,0.15)" : "rgba(196,154,40,0.92)", border: "1px solid rgba(196,154,40,0.6)", color: isPlaying ? "rgba(196,154,40,0.9)" : "#0A0B08", boxShadow: "0 4px 24px rgba(196,154,40,0.2)" }}>
                          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                          {isPlaying ? "NOW PLAYING" : "PLAY NOW"}
                        </button>
                      )
                    )}
                  </div>
                );
              })()}
              {/* Stats row — sacred living metrics */}
              <div className="flex items-center justify-center gap-6 pt-2" style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}>
                <div className="living-stat flex flex-col items-center gap-0.5" title={`${song.playCount || 0} plays`}>
                  <span className="living-stat-value text-base font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{song.playCount || 0}</span>
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>Plays</span>
                </div>
                <div className="w-px h-6" style={{ background: "rgba(196,154,40,0.12)" }} />
                <div className="living-stat flex flex-col items-center gap-0.5" title={`${comments?.length || 0} voices`}>
                  <span className="living-stat-value text-base font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{comments?.length || 0}</span>
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>Voices</span>
                </div>
                <div className="w-px h-6" style={{ background: "rgba(196,154,40,0.12)" }} />
                <div className="living-stat flex flex-col items-center gap-0.5" title={`${likeCount} loved`}>
                  <span className="living-stat-value text-base font-bold" style={{ color: likeCount > 0 ? "var(--ln-ember)" : "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>{likeCount}</span>
                  <span className="text-[10px] tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>Loved</span>
                </div>
              </div>
            </div>
          </div>}
          {/* ── Testimony Chamber ── */}
          <div className="flex flex-col gap-6">

            {/* ══ TITLE SANCTUARY ══ */}
            <div className="space-y-4 cathedral-enter-title">
              {/* Luminous title */}
              <h1
                className="leading-tight"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: "var(--ln-parchment)",
                  fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
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

              {/* Creator whisper */}
              {creator && (
                <div className="flex items-center gap-3">
                  <div className="w-px h-5" style={{ background: "rgba(196,154,40,0.3)" }} />
                  <CreatorHandle userId={creator.id} handle={creator.artistHandle} displayName={creator.name} role={(creator as any).role} size="md" />
                </div>
              )}

              {/* Content type + genre + BPM chips */}
              {(() => { const _ctc = getContentTypeColors((song as any).contentType ?? "audio"); return (
                <div className="flex flex-wrap gap-1.5">
                  <Badge style={{ background: _ctc.chipBg, color: _ctc.text, border: `1px solid ${_ctc.chipBorder}`, fontSize: "11px" }}>{_ctc.icon} {_ctc.label}</Badge>
                  {song.genre && song.genre.split(",").map((g: string) => g.trim()).filter(Boolean).map((g: string, i: number) => (
                    <Badge key={i} style={{ background: _ctc.chipBg, color: _ctc.text, border: `1px solid ${_ctc.chipBorder}`, fontSize: "11px" }}>{g}</Badge>
                  ))}
                  {song.bpm && <Badge style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px solid #C49A28", fontSize: "11px" }}>{song.bpm} BPM</Badge>}
                  {song.keySignature && <Badge style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px solid #C49A28", fontSize: "11px" }}>{song.keySignature}</Badge>}
                </div>
              ); })()}

              {/* Caption / description */}
              {(song as any).caption && (
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: "var(--ln-smoke)",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    fontSize: "1rem",
                    borderLeft: "2px solid rgba(196,154,40,0.35)",
                    paddingLeft: "14px",
                  }}
                >
                  {(song as any).caption}
                </p>
              )}

              {/* Sacred geometry divider */}
              <div className="sg-divider"><div className="sg-divider-pip" /></div>
            </div>

            {/* ══ WITNESSED WORK — Sacred Provenance Seal ══ */}
            <div
              className={`rounded-2xl overflow-hidden transition-all duration-700 cathedral-enter-wid ${song.witnessId ? "wid-origin-glow" : ""}`}
              style={{
                background: "rgba(196,154,40,0.03)",
                border: song.witnessId ? "1px solid rgba(196,154,40,0.4)" : "1px solid rgba(196,154,40,0.15)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2.5 px-5 py-4"
                style={{
                  borderBottom: "1px solid rgba(196,154,40,0.12)",
                  background: "linear-gradient(90deg, rgba(196,154,40,0.06) 0%, transparent 100%)",
                }}
              >
                <ShieldCheck className="w-5 h-5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.9)" }} />
                <span className="text-base font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", letterSpacing: "0.04em" }}>Witnessed Work</span>
                {evidenceItems.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded ml-1" style={{ background: "rgba(196,154,40,0.1)", color: "rgba(196,154,40,0.7)", border: "1px solid rgba(196,154,40,0.2)" }}>
                    {evidenceItems.length} artifact{evidenceItems.length !== 1 ? "s" : ""}
                  </span>
                )}
                {song.witnessId && (
                  <WIDPanel
                    witnessId={song.witnessId}
                    songTitle={song.title}
                    creatorName={creator?.artistHandle || creator?.name}
                    registeredAt={song.createdAt}
                    coverArtUrl={song.coverArtUrl}
                    certificateUrl={song.certificateUrl}
                    haaiVisualConcept={(song as any).haaiVisualConcept}
                    haaiStyleLanguage={(song as any).haaiStyleLanguage}
                    haaiInstrumentation={(song as any).haaiInstrumentation}
                    haaiVocalConveyance={(song as any).haaiVocalConveyance}
                    haaiLyricalInspiration={(song as any).haaiLyricalInspiration}
                    haaiEmotionalTone={(song as any).haaiEmotionalTone}
                    haaiDeclaredAt={(song as any).haaiDeclaredAt}
                  />
                )}
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* WID hash + content type inline */}
                <div className="flex flex-wrap gap-2">
                  {song.witnessId && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full font-mono" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <Hash size={10} style={{ color: "rgba(74,222,128,0.7)" }} />
                      <span className="text-[11px]" style={{ color: "rgba(74,222,128,0.7)" }}>{song.witnessId.slice(0, 24)}…</span>
                    </div>
                  )}
                  {song.witnessId && song.createdAt && (
                    <span className="text-[11px] flex items-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Registered {new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>

                {/* Testimony excerpt */}
                {((song as any).headlineCaption || (song as any).description) && (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ln-smoke)", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
                    "{((song as any).headlineCaption || (song as any).description || "").slice(0, 220)}{(((song as any).headlineCaption || (song as any).description || "").length > 220 ? "…" : "")}"
                  </p>
                )}

                {/* Framing statement */}
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                  The manifestation itself is the primary evidence of this work's existence and authorship. Supplementary proof artifacts can be attached by the creator.
                </p>

                {/* ── Supplementary Artifacts — inline list ── */}
                {evidenceItems.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.5)" }}>Proof Artifacts</p>
                    {evidenceItems.map((item: any) => {
                      const iconMap: Record<string, any> = { file: FileText, link: Link2, note: StickyNote };
                      const colorMap: Record<string, string> = { file: "rgba(196,154,40,0.8)", link: "rgba(96,165,250,0.8)", note: "rgba(167,243,208,0.8)" };
                      const labelMap: Record<string, string> = { file: "File", link: "Link", note: "Note" };
                      const Icon = iconMap[item.type] ?? FileText;
                      const color = colorMap[item.type] ?? "rgba(196,154,40,0.8)";
                      return (
                        <div key={item.id} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,154,40,0.1)" }}>
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
                              <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", color: "rgba(74,222,128,0.7)" }} title={`SHA-256: ${item.hash}`}>
                                <Hash className="w-2.5 h-2.5" />{item.hash.slice(0, 16)}…
                              </div>
                            )}
                            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Added {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Certificate link */}
                {song.certificateUrl && (
                  <a href={song.certificateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs hover:underline" style={{ color: "var(--ln-gold)" }}>
                    <ExternalLink className="w-3 h-3" />View Provenance Certificate
                  </a>
                )}
              </div>
            </div>

            {/* ── Sacred Tools ── */}
            <div className="flex flex-wrap gap-2.5 cathedral-enter-tools">
              {!isOwner && (
                <Button size="sm" variant="outline" onClick={e => toggleLike(e)}
                  style={isLiked ? { borderColor: "rgba(239,68,68,0.6)", color: "var(--ln-ember)" } : { borderColor: "#C3AB7D", color: "var(--ln-smoke)" }}>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!user) { toast.info("Sign in to download this track"); return; }
                      downloadMutation.mutate({ songId: song.id });
                    }}
                    disabled={downloadMutation.isPending}
                    className="living-btn transition-all"
                    style={{
                      borderColor: "rgba(34,197,94,0.45)",
                      color: "rgba(34,197,94,0.9)",
                      background: "rgba(34,197,94,0.06)",
                      boxShadow: "0 0 12px rgba(34,197,94,0.08)",
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />{downloadMutation.isPending ? "…" : "Free Download"}
                  </Button>
                );
                if (dlPerm === "tipped") return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!user) { toast.info("Sign in to download this track"); return; }
                      tipDownloadMutation.mutate({ songId: song.id, origin: window.location.origin });
                    }}
                    disabled={tipDownloadMutation.isPending}
                    title={`Gift $${((tipCents ?? 179) / 100).toFixed(2)} to unlock download`}
                    className="living-btn transition-all"
                    style={{
                      borderColor: "rgba(212,175,55,0.45)",
                      color: "rgba(212,175,55,0.95)",
                      background: "rgba(212,175,55,0.07)",
                      boxShadow: "0 0 14px rgba(212,175,55,0.10)",
                    }}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />{tipDownloadMutation.isPending ? "Processing…" : `Download — $${((tipCents ?? 179) / 100).toFixed(2)}`}
                  </Button>
                );
                return null;
              })()}
              <Button
                size="sm" variant="outline"
                onClick={() => setVersionHistoryOpen(true)}
                className="gap-1.5 transition-all hover:scale-105 active:scale-95"
                style={{ borderColor: "rgba(196,154,40,0.35)", color: "var(--ln-gold)", background: "rgba(196,154,40,0.04)" }}
              >
                <History className="w-3.5 h-3.5" />Versions
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => setShareOpen(true)}
                className="gap-1.5 transition-all hover:scale-105 active:scale-95"
                style={{ borderColor: "rgba(196,154,40,0.2)", color: "var(--ln-smoke)", background: "rgba(255,255,255,0.02)" }}
              >
                <Share2 className="w-3.5 h-3.5" />Share
              </Button>
              {song && (
                <Link href={`/constellation/${song.id}`}>
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 transition-all hover:scale-105 active:scale-95"
                    style={{ borderColor: "rgba(138,43,226,0.45)", color: "rgba(192,132,252,0.9)", background: "rgba(138,43,226,0.04)" }}
                  >
                    <Network className="w-3.5 h-3.5" />Cosmos
                  </Button>
                </Link>
              )}
              {song && (
                <QRShareModal entity={{ type: "song", id: song.id, slug: String(song.id), name: song.title, subtitle: song.artistHandle || song.creatorName || undefined, description: song.description ?? undefined, thumbnailUrl: song.coverArtUrl ?? undefined }}
                  trigger={
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 transition-all hover:scale-105 active:scale-95"
                      style={{ borderColor: "rgba(196,154,40,0.25)", color: "rgba(232,223,200,0.65)", background: "rgba(196,154,40,0.03)" }}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zm4 0h3v3h-3zm0 4v3h-3v-3"/></svg>
                      ID Card
                    </Button>
                  }
                />
              )}
              {!isOwner && (
                <FlagContentButton workId={song.id} workType="audio" workTitle={song.title} size="sm" className="px-2 py-1 rounded border border-zinc-800 hover:border-red-800/60" />
              )}
              {isOwner && (
                <Button
                  size="sm"
                  onClick={() => setEditingOpen(true)}
                  className="gap-1.5 btn-gold-glow transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(196,154,40,0.12)",
                    border: "1px solid rgba(196,154,40,0.5)",
                    color: "var(--ln-gold)",
                    fontFamily: "'Cinzel', serif",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  <Pencil size={13} />
                  Edit Work
                </Button>
              )}
            </div>

            {/* ── Missing cover art alert (owner only) ── */}
            {isOwner && !song.coverArtUrl && (
              <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.35)" }}>
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#eab308" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#eab308", fontFamily: "'Cinzel', serif" }}>Missing Cover Art</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(234,179,8,0.7)" }}>This work has no cover art. Add one so it displays correctly across the platform.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingOpen(true)}
                  style={{ borderColor: "rgba(234,179,8,0.4)", color: "#eab308", flexShrink: 0, fontSize: "11px" }}>
                  Add Art
                </Button>
              </div>
            )}

            {/* ── Tip panel ── */}
            {tipsEnabled && !isOwner && (
              <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(44,52,56,0.6), #000000)", border: "1px solid rgba(196,154,40,0.3)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>Gift {creator?.artistHandle || creator?.name}</p>
                  <span className="text-xs ml-auto" style={{ color: "var(--ln-iron)" }}>90% to artist</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["1", "2", "5", "10", "25"].map(amt => (
                    <button key={amt} onClick={() => { setTipAmount(amt); tipMutation.mutate({ songId: song.id, amountCents: Math.round(parseFloat(amt) * 100), origin: window.location.origin }); }} disabled={tipMutation.isPending}
                      className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                      style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>${amt}</button>
                  ))}
                  <button onClick={() => setTipOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95" style={{ background: "var(--ln-coal)", color: "var(--ln-parchment)", border: "1px solid #C3AB7D" }}>Custom</button>
                </div>
              </div>
            )}

            {/* ── Sovereign Stamp ── */}
            {(song as any).sovereignStampId && (
              <div className="rounded-2xl p-4" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.3)" }}>
                <div className="flex items-start gap-3">
                  <span style={{ fontSize: "18px", lineHeight: 1 }}>🔏</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>Sovereign Stamp Applied</p>
                    <p className="text-xs font-mono break-all" style={{ color: "#E2E8F0" }}>{(song as any).sovereignStampId}</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--ln-smoke)" }}>Near-ultrasonic tone embedded — 17 U.S.C. § 102(a)</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Find It Elsewhere — External Links (elevated sacred section) ── */}
            {(() => {
              const raw = (song as any).externalLinksJson;
              if (!raw) return null;
              let links: Array<{ platform: string; url: string }> = [];
              try { links = JSON.parse(raw); } catch { return null; }
              if (!links.length) return null;
              return (
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, rgba(196,154,40,0.04) 0%, rgba(8,6,16,0.98) 100%)",
                    border: "1px solid rgba(196,154,40,0.22)",
                  }}
                >
                  {/* Section header */}
                  <div
                    className="flex items-center gap-3 px-5 py-4"
                    style={{
                      borderBottom: "1px solid rgba(196,154,40,0.10)",
                      background: "linear-gradient(90deg, rgba(196,154,40,0.06) 0%, transparent 100%)",
                    }}
                  >
                    <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(196,154,40,0.7)" }} />
                    <span
                      className="text-sm font-semibold tracking-[0.08em] uppercase"
                      style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", letterSpacing: "0.06em" }}
                    >
                      Find It Elsewhere
                    </span>
                  </div>
                  {/* Platform links */}
                  <div className="px-5 py-5 flex flex-wrap gap-3">
                    {links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.03] active:scale-[0.97]"
                        style={{
                          background: "rgba(196,154,40,0.08)",
                          border: "1px solid rgba(196,154,40,0.28)",
                          color: "rgba(212,175,55,0.90)",
                          fontFamily: "'Cinzel', serif",
                          letterSpacing: "0.04em",
                          boxShadow: "0 2px 12px rgba(196,154,40,0.08)",
                        }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {link.platform}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* ── Harmonic Signature ── creator-only download buttons */}
            {isOwner && (song as any).harmonicSignature && (
              <div className="flex flex-wrap gap-2">
                <a href={`/api/harmonic/${song.id}/audio`} download className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity" style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                  <Download className="w-3 h-3" />Harmonic Tone (.wav)
                </a>
                <a href={`/api/harmonic/${song.id}/image`} download className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity" style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                  <Download className="w-3 h-3" />Waveform Image (.png)
                </a>
              </div>
            )}

            {/* ══ RESONANCE FIELD — Reactions, Activity, Related ══ */}
            {/* ══ RESONANCE FIELD — Reactions (right column, desktop) ══ */}
            {/* Emoji Reactions */}
            <div className="p-4" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
              <div className="flex flex-wrap gap-2 justify-center">
                {REACTION_SLUGS.map((slug: string) => (
                  <button type="button" key={slug} onClick={() => handleReaction(slug)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: myReactionsSet.has(slug) ? "rgba(196,154,40,0.15)" : "var(--ln-coal)",
                      border: `1px solid ${myReactionsSet.has(slug) ? "rgba(196,154,40,0.3)" : "var(--ln-gold)"}`,
                    }}>
                    <span>{REACTION_EMOJI[slug] ?? slug}</span>
                    {reactionCounts[slug] ? <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{reactionCounts[slug]}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Unified Interaction Thread */}
            <div className="p-4" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 flex-wrap" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                <MessageSquare className="w-4 h-4" />
                Activity
                {eventThread && eventThread.length > 0 && (
                  <span className="text-xs font-normal" style={{ color: "var(--ln-smoke)" }}>{eventThread.length}</span>
                )}
                {song.witnessId && (
                  <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}>
                    WID-linked
                  </span>
                )}
              </h3>

              {/* Comment input */}
              <div className="flex gap-2 mb-4">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--ln-coal)" }}>
                  {user ? (user.name || "?").charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex-1 space-y-2">
                  <Input placeholder="Write a comment..." value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    onPaste={(e) => {
                      // Strip WID certificate block that gets appended when copying from the lyrics panel
                      const raw = e.clipboardData.getData("text/plain");
                      const widIdx = raw.indexOf("\n═══");
                      if (widIdx !== -1) {
                        e.preventDefault();
                        const clean = raw.slice(0, widIdx).trim();
                        setCommentText(prev => prev + clean);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && commentText.trim()) {
                        e.preventDefault();
                        commentMutation.mutate({ songId: song.id, content: commentText.trim() });
                      }
                    }}
                    style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-parchment)", fontSize: "13px" }} />
                  {commentText.trim() && (
                    <Button size="sm"
                      onClick={() => commentMutation.mutate({ songId: song.id, content: commentText.trim() })}
                      disabled={commentMutation.isPending}
                      style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
                      Post
                    </Button>
                  )}
                </div>
              </div>

              {/* Threaded comment list — from comments.list (supports replies) */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {comments && comments.length > 0 ? (
                  (comments as any[]).map((c: any) => {
                    const initial = (c.authorName || "A").charAt(0).toUpperCase();
                    const timeStr = new Date(c.createdAt).toLocaleDateString();
                    const isReplying = replyingTo?.id === c.id;
                    return (
                      <div key={c.id}>
                        {/* Top-level comment */}
                        <div className="flex gap-2">
                          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                            style={{ background: "var(--ln-coal)" }}>
                            <span style={{ color: "var(--ln-smoke)" }}>{initial}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium" style={{ color: "var(--ln-parchment)" }}>{c.authorName || "Anonymous"}</span>
                              <span className="text-[10px] ml-auto" style={{ color: "var(--ln-coal)" }}>{timeStr}</span>
                            </div>
                            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>{c.content}</p>
                            <button
                              onClick={() => { setReplyingTo(isReplying ? null : { id: c.id, authorName: c.authorName || "Anonymous" }); setReplyText(""); }}
                              className="text-[10px] mt-1 transition-colors"
                              style={{ color: isReplying ? "var(--ln-gold)" : "var(--ln-iron)" }}
                            >
                              {isReplying ? "Cancel" : `Reply`}
                              {c.replies?.length > 0 && !isReplying && ` · ${c.replies.length} ${c.replies.length === 1 ? "reply" : "replies"}`}
                            </button>
                          </div>
                        </div>

                        {/* Inline reply input */}
                        {isReplying && (
                          <div className="ml-9 mt-2 flex gap-2">
                            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                              style={{ background: "var(--ln-coal)" }}>
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
                                    replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim() });
                                  }
                                  if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                                }}
                                style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-parchment)", fontSize: "12px", height: "32px" }}
                                autoFocus
                              />
                              {replyText.trim() && (
                                <Button size="sm"
                                  onClick={() => replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim() })}
                                  disabled={replyMutation.isPending}
                                  className="h-6 text-[11px] px-2"
                                  style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
                                  Post reply
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Nested replies */}
                        {c.replies?.length > 0 && (
                          <div className="ml-9 mt-2 space-y-2 pl-3" style={{ borderLeft: "1px solid #C49A28" }}>
                            {(c.replies as any[]).map((r: any) => (
                              <div key={r.id} className="flex gap-2">
                                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: "var(--ln-coal)" }}>
                                  <span style={{ color: "var(--ln-iron)" }}>{(r.authorName || "A").charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[11px] font-medium" style={{ color: "var(--ln-smoke)" }}>{r.authorName || "Anonymous"}</span>
                                    <span className="text-[9px] ml-auto" style={{ color: "var(--ln-coal)" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
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
                  <p className="text-xs text-center py-4" style={{ color: "var(--ln-iron)" }}>Be the first to comment</p>
                )}
              </div>
            </div>

            {/* Related */}
            {relatedData && relatedData.length > 0 && (
              <div className="p-4" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Related</h3>
                <div className="space-y-1">
                  {relatedData.map((item: any) => <RelatedCard key={item.song.id} item={item} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ BELOW FOLD: Full-width sections ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6" ref={scrollRevealRef}>
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-0">

            {/* ══ RESONANCE ACTIVITY STRIP — near playback ══ */}
            {eventThread && eventThread.length > 0 && (
              <div
                className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-2 mb-8"
                style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.12)" }}
              >
                <span className="text-[9px] font-heading tracking-widest uppercase flex-shrink-0" style={{ color: "rgba(196,154,40,0.45)" }}>Resonance</span>
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                  {(eventThread as any[]).slice(0, 5).map((ev: any, i: number) => {
                    const isComment = ev.type === "comment";
                    const isTip = ev.type === "tip";
                    const isReaction = ev.type === "reaction";
                    return (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-smoke)", border: "1px solid rgba(196,154,40,0.12)" }}>
                        {isTip && <span style={{ color: "var(--ln-gold)" }}>$</span>}
                        {isReaction && <span>{ev.emoji ?? "✨"}</span>}
                        {isComment && <span style={{ color: "rgba(196,154,40,0.5)" }}>"</span>}
                        <span className="truncate max-w-[120px]">{ev.authorName || ev.creatorName || "Witness"}</span>
                        {isTip && ev.amountCents && (
                          <span style={{ color: "var(--ln-gold)" }}>${(ev.amountCents / 100).toFixed(0)}</span>
                        )}
                      </span>
                    );
                  })}
                  {eventThread.length > 5 && (
                    <span className="text-[10px]" style={{ color: "rgba(196,154,40,0.4)" }}>+{eventThread.length - 5} more</span>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                 T1 — TESTIMONY SANCTUARY — Origin Story as the heavy piece
                 Full-width, Cormorant Garamond, gold left pillar, breathing room
            ══════════════════════════════════════════════════════════════ */}
            {(song as any).haaiOriginStory && (
              <section
                className="phi-section-lg scroll-reveal scroll-reveal-delay-1"
                style={{
                  borderTop: "1px solid rgba(196,154,40,0.10)",
                  paddingTop: "var(--phi-5)",
                  paddingBottom: "var(--phi-5)",
                }}
              >
                {/* Section overline */}
                <div className="flex items-center gap-3 mb-8">
                  <span
                    className="text-xs tracking-[0.20em] uppercase"
                    style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}
                  >
                    Testimony
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.12)" }} />
                </div>

                {/* Testimony card — gold left pillar, Cormorant Garamond, flame watermark */}
                <div
                  className="relative overflow-hidden rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(196,154,40,0.04) 0%, rgba(8,6,16,0.98) 60%)",
                    border: "1px solid rgba(196,154,40,0.22)",
                    boxShadow: "0 4px 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(196,154,40,0.03)",
                  }}
                >
                  {/* Flame watermark — faint sacred geometry behind the text */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: "radial-gradient(ellipse 55% 65% at 85% 50%, rgba(196,154,40,0.06) 0%, transparent 70%)",
                    }}
                  />
                  {/* Gold left pillar */}
                  <div
                    className="absolute left-0 top-0 bottom-0"
                    style={{
                      width: "3px",
                      background: "linear-gradient(to bottom, transparent 0%, rgba(196,154,40,0.7) 20%, rgba(196,154,40,0.9) 50%, rgba(196,154,40,0.7) 80%, transparent 100%)",
                    }}
                  />
                  <div className="relative px-8 py-8 pl-10">
                    {/* Opening quote mark */}
                    <div
                      className="mb-4"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "4rem",
                        lineHeight: 0.8,
                        color: "rgba(196,154,40,0.20)",
                        userSelect: "none",
                      }}
                    >
                      &#8220;
                    </div>
                    <p
                      className="leading-[1.85] whitespace-pre-wrap"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "clamp(1.05rem, 2vw, 1.22rem)",
                        color: "var(--ln-bone)",
                        fontWeight: 500,
                        letterSpacing: "0.015em",
                      }}
                    >
                      {(song as any).haaiOriginStory}
                    </p>
                    {/* Creator attribution */}
                    <div className="mt-6 flex items-center gap-3">
                      <div style={{ width: 28, height: 1, background: "rgba(196,154,40,0.4)" }} />
                      <span
                        className="text-sm"
                        style={{
                          fontFamily: "'Cinzel', serif",
                          color: "rgba(196,154,40,0.65)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {creator?.artistHandle || creator?.name || "The Creator"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ══ SACRED DIVIDER ══ */}
            {(song as any).haaiOriginStory && (
              <div className="sg-divider-wide" style={{ margin: "0 0 0 0" }}>
                <div className="sg-divider-wide-center">
                  <div className="sg-divider-wide-center-dot" />
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                 T2 — HAAI DISCLOSURE — Always visible, never collapsed
                 Human-Authored, AI-Informed — act of integrity, not shame
            ══════════════════════════════════════════════════════════════ */}
            {(() => {
              const disc = (song as any).aiDisclosure || creator?.aiDisclosure;
              const hasHaai = disc === "human_authored_ai_instrument";
              const hasAiDisc = disc && disc !== "original";
              const discMap: Record<string, { label: string; desc: string }> = {
                ai_generated: {
                  label: "AI-Assisted Manifestation",
                  desc: "This work was created with significant AI generation. The creator shaped the vision, direction, and curation.",
                },
                ai_assisted: {
                  label: "AI-Assisted",
                  desc: "AI tools were used in the creation of this work. The creator remains the primary author.",
                },
                human_authored_ai_instrument: {
                  label: "HAAI — Human-Authored, AI-Informed",
                  desc: "The human is the author. AI served as an instrument — a tool in service of the creator's sovereign vision. The testimony, the intent, and the meaning are entirely human.",
                },
              };
              const haaiFields = [
                { key: "haaiVisualConcept", label: "Visual Concept" },
                { key: "haaiStyleLanguage", label: "Style Language" },
                { key: "haaiInstrumentation", label: "Instrumentation" },
                { key: "haaiVocalConveyance", label: "Vocal Conveyance" },
                { key: "haaiLyricalInspiration", label: "Lyrical Inspiration" },
                { key: "haaiEmotionalTone", label: "Emotional Tone" },
              ].filter(f => (song as any)[f.key]);

              if (!hasAiDisc && haaiFields.length === 0) return null;
              const discInfo = discMap[disc] ?? { label: disc, desc: "" };

              return (
                <section
                  className="scroll-reveal scroll-reveal-delay-2"
                  style={{
                    paddingTop: "var(--phi-5)",
                    paddingBottom: "var(--phi-5)",
                    borderTop: "1px solid rgba(196,154,40,0.08)",
                  }}
                >
                  {/* Section overline */}
                  <div className="flex items-center gap-3 mb-8">
                    <span
                      className="text-xs tracking-[0.20em] uppercase"
                      style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}
                    >
                      Authorship Disclosure
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.12)" }} />
                  </div>

                  {/* HAAI banner */}
                  <div
                    className="rounded-2xl p-6 mb-6"
                    style={{
                      background: hasHaai
                        ? "linear-gradient(135deg, rgba(196,154,40,0.07) 0%, rgba(8,6,16,0.97) 100%)"
                        : "rgba(196,154,40,0.03)",
                      border: hasHaai
                        ? "1px solid rgba(196,154,40,0.30)"
                        : "1px solid rgba(196,154,40,0.12)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: "rgba(196,154,40,0.10)", border: "1px solid rgba(196,154,40,0.25)" }}
                      >
                        <ShieldCheck className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-base font-semibold mb-2"
                          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", letterSpacing: "0.03em" }}
                        >
                          {discInfo.label}
                        </p>
                        {discInfo.desc && (
                          <p className="text-sm leading-relaxed" style={{ color: "var(--ln-smoke)", fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem" }}>
                            {discInfo.desc}
                          </p>
                        )}
                        {(song as any).haaiDeclaredAt && (
                          <p className="text-[11px] mt-3" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Space Mono', monospace" }}>
                            Declared {new Date((song as any).haaiDeclaredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* HAAI structured fields — only for HAAI works */}
                  {hasHaai && haaiFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {haaiFields.map(f => (
                        <div
                          key={f.key}
                          className="rounded-xl p-4"
                          style={{
                            background: "rgba(196,154,40,0.03)",
                            border: "1px solid rgba(196,154,40,0.12)",
                          }}
                        >
                          <p
                            className="text-[10px] tracking-[0.18em] uppercase mb-2"
                            style={{ fontFamily: "'Cinzel', serif", color: "rgba(196,154,40,0.50)" }}
                          >
                            {f.label}
                          </p>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "var(--ln-bone)", fontFamily: "'Cormorant Garamond', serif", fontSize: "0.97rem" }}
                          >
                            {(song as any)[f.key]}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BPM / Key metadata — inline with HAAI, not a separate footnote */}
                  {(song.bpm || song.keySignature) && (
                    <div className="flex flex-wrap gap-2 mt-5">
                      {song.bpm && (
                        <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: "rgba(196,154,40,0.06)", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.15)" }}>
                          {song.bpm} BPM
                        </span>
                      )}
                      {song.keySignature && (
                        <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: "rgba(196,154,40,0.06)", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.15)" }}>
                          {song.keySignature}
                        </span>
                      )}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* ── GALLERY ── */}
            {(() => {
              const rawGallery = (song as any).galleryImagesJson;
              if (!rawGallery) return null;
              let gallery: { url: string; caption?: string }[] = [];
              try { gallery = typeof rawGallery === 'string' ? JSON.parse(rawGallery) : rawGallery; } catch { return null; }
              if (!gallery.length) return null;
              return (
                <section style={{ paddingTop: "var(--phi-4)", paddingBottom: "var(--phi-4)", borderTop: "1px solid rgba(196,154,40,0.08)" }}>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xs tracking-[0.20em] uppercase" style={{ fontFamily: "'Cinzel', serif", color: "rgba(212,175,55,0.55)" }}>Gallery</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(212,175,55,0.12)" }} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gallery.map((img, i) => (
                      <div key={i} className="space-y-1">
                        <div className="rounded-xl overflow-hidden aspect-square bg-black/30">
                          <img
                            src={img.url}
                            alt={img.caption || `Gallery image ${i + 1}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={() => window.open(img.url, '_blank')}
                          />
                        </div>
                        {img.caption && (
                          <p className="text-[10px] leading-tight px-1" style={{ color: "var(--ln-iron)" }}>{img.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        </div>

        {/* ── ACTIVATION — stage-based funding progress ── */}
        <ActivationPanel songId={songId} songTitle={song.title} />
        {/* ── PROVENANCE TIMELINE ── */}
        <ProvenanceTimeline
          songId={songId}
          ownerId={song.userId}
          className="mt-6"
        />
        {/* ── LINEAGE GRAPH ── */}
        <LineageGraph
          songId={songId}
          songTitle={song.title}
          ownerId={song.userId}
          className="mt-4"
        />
        {/* ── WITNESSES PANEL ── */}
        <WitnessesPanel
          songId={songId}
          ownerId={song.userId}
          className="mt-4"
        />
        {/* ── WITNESSED WORK — proof attachment layer ── */}
        <EvidencePanel
          songId={songId}
          isOwner={isOwner}
          manifestation={{
            coverArtUrl: song.coverArtUrl,
            fileUrl: song.fileUrl,
            headlineCaption: (song as any).headlineCaption,
            description: (song as any).description,
            witnessId: song.witnessId,
            title: song.title,
            contentType: (song as any).contentType ?? "audio",
            pagesJson: (song as any).pagesJson,
          }}
          onPlay={handlePlay}
          onOpenReader={handleReadNow}
        />

        {/* ── LYRICS — full width, bottom of page, collapsed by default ── */}
        {song.lyricsText && (
          <div className="mt-6 rounded-2xl overflow-hidden" style={{ background: "var(--ln-coal)", border: `1px solid ${song.isLyricsOnly ? "rgba(196,154,40,0.3)" : "var(--ln-gold)"}` }}>
            <button type="button" className="w-full flex items-center justify-between px-5 py-4" onClick={() => setShowLyrics(!showLyrics)}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Lyrics</span>
                {song.isLyricsOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)", letterSpacing: "0.06em" }}>
                    <Shield className="w-2.5 h-2.5" /> LYRICS PROTECTED — Audio Not Yet Attached
                  </span>
                )}
                <span className="text-xs ml-2" style={{ color: "var(--ln-smoke)" }}>{showLyrics ? "Tap to collapse" : "Tap to expand"}</span>
              </div>
              {showLyrics
                ? <ChevronUp className="w-4 h-4" style={{ color: "#E2E8F0" }} />
                : <ChevronDown className="w-4 h-4" style={{ color: "#E2E8F0" }} />}
            </button>
            {showLyrics && (
              <div className="px-5 pb-5"
                onCopy={e => {
                  if (!song.witnessId) return;
                  const selected = window.getSelection()?.toString() || "";
                  if (!selected.trim()) return;
                  const registeredDate = song.createdAt
                    ? new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                    : "Unknown date";
                  const creatorName = creator?.artistHandle || creator?.name || "Unknown Artist";
                  const cert = [
                    "",
                    "═══════════════════════════════",
                    "WITNESS ID CERTIFICATE",
                    `WID: ${song.witnessId}`,
                    `Creator: ${creatorName}`,
                    `Registered: ${registeredDate}`,
                    `Verify: https://www.livingnexus.org/verify/${song.witnessId}`,
                    "═══════════════════════════════",
                  ].join("\n");
                  e.clipboardData.setData("text/plain", selected + cert);
                  e.preventDefault();
                }}>
                <pre className="text-sm leading-7 whitespace-pre-wrap font-sans" style={{ color: "var(--ln-parchment)" }}>
                  {song.lyricsText}
                </pre>
                {song.witnessId && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(196,154,40,0.12)" }}>
                    <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: "#E2E8F0" }}>{[
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
                  <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.15)" }}>
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
            )}
          </div>
        )}
      </div>

      {/* ── CREDITS ── */}
      {(() => {
        const rawCredits = (song as any)?.creditsJson;
        const coWriters: string[] = Array.isArray((song as any)?.coWriters) ? (song as any).coWriters : [];
        let credits: { role: string; name: string }[] = [];
        if (rawCredits) {
          try { credits = JSON.parse(rawCredits); } catch { /* ignore */ }
        }
        const coWriterCredits = coWriters.map((name: string) => ({ role: "Co-Writer", name }));
        const allCredits = [...credits, ...coWriterCredits];
        if (allCredits.length === 0) return null;
        return (
          <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Credits</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {allCredits.map((c: { role: string; name: string }, i: number) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      className="text-[9px] uppercase tracking-widest flex-shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        background: c.role.toLowerCase() === "publisher" ? "rgba(59,130,246,0.18)" : "rgba(196,154,40,0.12)",
                        color: c.role.toLowerCase() === "publisher" ? "#93C5FD" : "rgba(196,154,40,0.85)",
                        border: `1px solid ${c.role.toLowerCase() === "publisher" ? "rgba(59,130,246,0.3)" : "rgba(196,154,40,0.2)"}`,
                        minWidth: "64px",
                        textAlign: "center",
                      }}
                    >{c.role}</span>
                    <span className="text-sm" style={{ color: "var(--ln-parchment)" }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

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
      {editingOpen && song && (
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