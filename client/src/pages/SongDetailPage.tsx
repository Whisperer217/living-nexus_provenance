/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — SongDetailPage (v2)
   Living Nexus layout:
   • Left: cover art + player controls + lyrics panel
   • Right: comments + emoji reactions + related songs sidebar
   • AI Transform stub (coming soon)
   Divine Noir aesthetic — Orbitron/Cinzel, gold/cyan palette
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from "react";
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
  Wand2, ExternalLink, Check, ChevronDown, ChevronUp, Twitter, Heart,
  Video, ImageIcon, History,
} from "lucide-react";
import { useLike } from "@/hooks/useLike";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import { WIDPanel } from "@/components/WIDPanel";
import { FlagContentButton } from "@/components/FlagContentButton";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";
import { safeAudioUrl } from "@shared/const";
import { QRShareModal } from "@/components/QRIdentityCard";

const REACTIONS = ["🔥", "😍", "😱", "🙌", "👍", "👎", "🤯", "+"];

function RelatedCard({ item }: { item: any }) {
  const song = item.song;
  const creator = item.creator;
  return (
    <Link href={`/song/${song.id}`}>
      <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/[0.04] transition-all group">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "oklch(0.84 0.05 75)" }}>
          {song.coverArtUrl
            ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
            : <Music className="w-5 h-5 opacity-30" style={{ color: "oklch(0.84 0.155 85)" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
          <p className="text-xs truncate" style={{ color: "oklch(0.5 0.03 280)" }}>
            {creator?.artistHandle || creator?.name || "Unknown"}
          </p>
        </div>
        <Play className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" style={{ color: "oklch(0.84 0.155 85)" }} />
      </div>
    </Link>
  );
}

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addAndPlay, state: playerState, currentTrackId, openNowPlayingPanel } = usePlayer();
  const songId = parseInt(id || "0");

  const [tipOpen, setTipOpen] = useState(false);
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
    onError: (_err, _vars, ctx: any) => {
      if (ctx?.prev) utils.songs.getReactions.setData({ songId }, ctx.prev);
    },
    onSettled: () => {
      utils.songs.getReactions.invalidate({ songId });
    },
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  // Derive play state from global player — this page is a remote control only
  const isThisTrackActive = currentTrackId === `song-${songId}`;
  const isPlaying = isThisTrackActive && playerState.isPlaying;
  const { liked: isLiked, toggle: toggleLike } = useLike(songId);
  const { data: likeCountData } = trpc.songs.getLikeCount.useQuery(
    { songId },
    { enabled: songId > 0 }
  );
  const likeCount = likeCountData?.count ?? 0;
  const [showVideo, setShowVideo] = useState(false);
  const videoDetailRef = useRef<HTMLVideoElement>(null);

  const [aiTransformOpen, setAiTransformOpen] = useState(false);
  const [transformPrompt, setTransformPrompt] = useState("");
  const [transformStyle, setTransformStyle] = useState("");
  const [transformTags, setTransformTags] = useState<string[]>([]);
  const [activeTransformId, setActiveTransformId] = useState<number | null>(null);
  const [transformResult, setTransformResult] = useState<{ outputUrl: string; prompt: string } | null>(null);
  const [transformPhase, setTransformPhase] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [transformError, setTransformError] = useState("");

  const aiTransformMutation = trpc.songs.aiTransform.useMutation({
    onSuccess: (data) => {
      setActiveTransformId(data.transformId);
      setTransformPhase("processing");
    },
    onError: (err) => {
      setTransformPhase("error");
      setTransformError(err.message);
    },
  });

  const { data: transformStatus } = trpc.songs.getTransformStatus.useQuery(
    { transformId: activeTransformId! },
    {
      enabled: !!activeTransformId && transformPhase === "processing",
      refetchInterval: 4000,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!transformStatus) return;
    if (transformStatus.status === "success" && transformStatus.outputUrl) {
      setTransformResult({ outputUrl: transformStatus.outputUrl, prompt: transformStatus.prompt });
      setTransformPhase("done");
      setActiveTransformId(null);
    } else if (transformStatus.status === "failed") {
      setTransformPhase("error");
      setTransformError(transformStatus.errorMessage || "Generation failed");
      setActiveTransformId(null);
    }
  }, [transformStatus]);

  const { data: songData, isLoading } = trpc.songs.getById.useQuery(
    { id: songId },
    { enabled: !!songId, refetchOnWindowFocus: false }
  );
  const { data: comments, refetch: refetchComments } = trpc.comments.list.useQuery(
    { songId },
    { enabled: !!songId }
  );
  const { data: eventThread, refetch: refetchEvents } = trpc.events.getByWork.useQuery(
    { workId: songId },
    { enabled: !!songId }
  );
  const { data: relatedData } = trpc.songs.getRelated.useQuery(
    { songId, genre: songData?.song?.genre || undefined },
    { enabled: !!songId && !!songData }
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
  // WID-tagged download: permission check via tRPC, then trigger /api/download/:songId
  function triggerTaggedDownload(id: number) {
    const a = document.createElement("a");
    a.href = `/api/download/${id}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: (_d: { url: string }, vars: { songId: number }) => {
      triggerTaggedDownload(vars.songId);
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

  const utils = trpc.useUtils();

  // Handle Stripe tip/download success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("tip") === "success") {
      toast.success("🙏 Your gift was sent! The creator receives 90% directly.");
      // Invalidate ticker so it refreshes with the new tip
      utils.tips.recentTips.invalidate();
      utils.events.getByWork.invalidate({ workId: songId });
      window.history.replaceState({}, "", window.location.pathname);
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
      // Track is already loaded — just toggle play/pause in global player
      // PlayerContext togglePlay is available via audioRef; use addAndPlay to re-trigger
      addAndPlay({
        id: `song-${song.id}`,
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
      });
    } else {
      // New track — load into global player and start playing
      addAndPlay({
        id: `song-${song.id}`,
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
      });
      playMutation.mutate({ songId });
      openNowPlayingPanel();
    }
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

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#DACAAA" }}>
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl mx-auto animate-pulse" style={{ background: "oklch(0.75 0.18 85 / 0.2)" }} />
        <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>Loading track...</p>
      </div>
    </div>
  );

  if (!song || !songData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#DACAAA" }}>
      <div className="text-center">
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Song not found.</p>
        <Link href="/"><Button className="mt-4" style={{ background: "oklch(0.84 0.155 85)", color: "#1E1020" }}>Go Home</Button></Link>
      </div>
    </div>
  );

  const tipsEnabled = creator?.stripeAccountStatus === "enabled";
  const artistName = creator?.artistHandle || creator?.name || "Unknown Artist";
  const pageTitle = `${song.title} — ${artistName} | Living Nexus`;
  const pageDesc = song.genre
    ? `${song.genre} · ${artistName}${song.witnessId ? " · WID Verified" : ""}${(song as any).bpm ? ` · ${(song as any).bpm} BPM` : ""} — Listen on Living Nexus`
    : `Listen to ${song.title} by ${artistName} on Living Nexus`;
  const pageImage = song.coverArtUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";
  const pageUrl = `https://www.livingnexus.org/song/${songId}`;
  const audioFileUrl = song.fileUrl ? safeAudioUrl(song.fileUrl) : undefined;
  const embedVideoUrl = (song as any).embedVideoUrl as string | undefined;

  return (
    <div className="min-h-screen pb-8" style={{ background: "#DACAAA" }}>
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <Link href={creator ? `/creator/${creator.id}` : "/"}>
          <button type="button" className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity mb-6" style={{ color: "#E2E8F0" }}>
            <ChevronLeft className="w-4 h-4" />
            {creator?.artistHandle || creator?.name || "Back"}
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">
            {/* Cover + Meta */}
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Art / Video block */}
              <div className="relative w-full sm:w-56 flex-shrink-0">
                {/* Full-width video player (only when videoUrl present) */}
                {(song as any).videoUrl && (
                  <div
                    className="w-full rounded-2xl overflow-hidden mb-3"
                    style={{ aspectRatio: "16/9", background: "#DACAAA" }}
                  >
                    {showVideo ? (
                      <video
                        ref={videoDetailRef}
                        src={(song as any).videoUrl}
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                        autoPlay={isPlaying}
                        muted={false}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center cursor-pointer group"
                        onClick={() => setShowVideo(true)}
                        style={{ background: "oklch(0.10 0.02 275)" }}
                      >
                        {song.coverArtUrl
                          ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                          : <Music className="w-16 h-16 opacity-10" style={{ color: "oklch(0.84 0.155 85)" }} />}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                            style={{ background: "oklch(0.84 0.155 85)", color: "#DACAAA" }}>
                            <Video size={14} /> Watch Video
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Toggle button */}
                {(song as any).videoUrl && (
                  <button
                    onClick={() => setShowVideo(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg mb-3 transition-all"
                    style={{
                      background: showVideo ? "oklch(0.84 0.155 85 / 0.15)" : "oklch(0.14 0.02 280)",
                      color: showVideo ? "oklch(0.84 0.155 85)" : "oklch(0.55 0.04 280)",
                      border: `1px solid ${showVideo ? "oklch(0.84 0.155 85 / 0.4)" : "#8A6A2A"}`,
                    }}
                  >
                    {showVideo ? <><ImageIcon size={12} /> Cover Art</> : <><Video size={12} /> Music Video</>}
                  </button>
                )}
                {/* Cover art with play/pause overlay (only shown when no video or video is hidden) */}
                {!(song as any).videoUrl && (
                  <div
                    className="relative w-full sm:w-56 h-56 rounded-2xl overflow-hidden flex items-center justify-center group cursor-pointer"
                    style={{ background: "linear-gradient(135deg, oklch(0.125 0.028 52), oklch(0.13 0.04 290))" }}
                    onClick={song.fileUrl ? handlePlay : undefined}
                  >
                    {song.coverArtUrl
                      ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                      : <Music className="w-20 h-20 opacity-10" style={{ color: "oklch(0.84 0.155 85)" }} />}
                    {/* Play/pause overlay — always visible when active, hover-visible otherwise */}
                    {song.fileUrl && (
                      <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                        isThisTrackActive ? "bg-black/30" : "bg-black/0 group-hover:bg-black/40"
                      }`}>
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                            isThisTrackActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90"
                          }`}
                          style={{ background: "oklch(0.84 0.155 85)", color: "#1E1020" }}
                        >
                          {isPlaying
                            ? <Pause className="w-6 h-6" />
                            : <Play className="w-6 h-6 ml-0.5" />}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2"
                    style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
                    {song.title}
                  </h1>
                  {creator && (
                    <Link href={`/creator/${creator.id}`}>
                      <div className="flex items-center gap-2 mb-3 hover:opacity-80 cursor-pointer">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                          style={{ background: "oklch(0.2 0.04 280)" }}>
                          {creator.profilePhotoUrl
                            ? <img src={creator.profilePhotoUrl} alt={creator.name ?? ""} className="w-full h-full object-cover" />
                            : <span style={{ color: "oklch(0.84 0.155 85)" }}>{(creator.artistHandle || creator.name || "?").charAt(0)}</span>}
                        </div>
                        <span className="text-sm font-medium" style={{ color: "oklch(0.75 0.04 280)" }}>
                          {creator.artistHandle || creator.name}
                        </span>
                      </div>
                    </Link>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {song.genre && <Badge style={{ background: "oklch(0.84 0.05 75)", color: "oklch(0.6 0.04 280)", border: "1px solid #8A6A2A", fontSize: "11px" }}>{song.genre}</Badge>}
                    {song.bpm && <Badge style={{ background: "oklch(0.84 0.05 75)", color: "oklch(0.6 0.04 280)", border: "1px solid #8A6A2A", fontSize: "11px" }}>{song.bpm} BPM</Badge>}
                    {song.keySignature && <Badge style={{ background: "oklch(0.84 0.05 75)", color: "oklch(0.6 0.04 280)", border: "1px solid #8A6A2A", fontSize: "11px" }}>{song.keySignature}</Badge>}
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
                    {(() => {
                      const disc = (song as any).aiDisclosure || creator?.aiDisclosure;
                      if (!disc || disc === "original") return null;
                      const map: Record<string, { label: string; bg: string; fg: string; border: string }> = {
                        ai_generated: { label: "AI-Generated", bg: "oklch(0.55 0.18 25 / 0.15)", fg: "oklch(0.75 0.18 25)", border: "oklch(0.55 0.18 25 / 0.4)" },
                        ai_assisted: { label: "AI-Assisted", bg: "oklch(0.60 0.18 55 / 0.15)", fg: "oklch(0.80 0.18 55)", border: "oklch(0.60 0.18 55 / 0.4)" },
                        human_authored_ai_instrument: { label: "HAAI — Human-Authored", bg: "oklch(0.7 0.18 280 / 0.12)", fg: "oklch(0.84 0.155 85)", border: "oklch(0.7 0.18 280 / 0.35)" },
                      };
                      const style = map[disc];
                      if (!style) return null;
                      return (
                        <Badge style={{ background: style.bg, color: style.fg, border: `1px solid ${style.border}`, fontSize: "11px" }}>
                          {style.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: "#E2E8F0" }}>
                    <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" />{song.playCount || 0} plays</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{comments?.length || 0} comments</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {!isOwner && (
                    <Button size="sm" variant="outline" onClick={e => toggleLike(e)}
                       style={isLiked
                         ? { borderColor: "oklch(0.65 0.22 350 / 0.6)", color: "oklch(0.75 0.22 350)" }
                         : { borderColor: "#3D2440", color: "oklch(0.65 0.04 280)" }}>
                       <Heart className="w-3.5 h-3.5 mr-1" fill={isLiked ? "currentColor" : "none"} />
                       {isLiked ? "Liked" : "Like"}
                       {likeCount > 0 && (
                         <span className="ml-1 text-[11px] tabular-nums opacity-70">{likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}</span>
                       )}
                     </Button>
                  )}
                  {!isOwner && (
                    <AddToPlaylistButton songId={song.id} variant="full" />
                  )}
                  {/* Download button — permission-aware */}
                  {(() => {
                    const dlPerm = (song as any).downloadPermission as string | undefined;
                    const tipCents = (song as any).downloadTipThresholdCents as number | undefined;
                    if (!dlPerm || dlPerm === "none") return null;
                    if (dlPerm === "free") return (
                      <Button size="sm" variant="outline" onClick={() => downloadMutation.mutate({ songId: song.id })}
                        disabled={downloadMutation.isPending}
                        style={{ borderColor: "#3D2440", color: "oklch(0.65 0.04 280)" }}>
                        <Download className="w-3.5 h-3.5 mr-1" />{downloadMutation.isPending ? "…" : "Download"}
                      </Button>
                    );
                    if (dlPerm === "tipped") return (
                      <Button size="sm" variant="outline"
                        onClick={() => tipDownloadMutation.mutate({ songId: song.id, origin: window.location.origin })}
                        disabled={tipDownloadMutation.isPending}
                        title={`Tip $${((tipCents ?? 179) / 100).toFixed(2)} to unlock download`}
                        style={{ borderColor: "oklch(0.75 0.18 85 / 0.4)", color: "oklch(0.84 0.155 85)" }}>
                        <Download className="w-3.5 h-3.5 mr-1" />{tipDownloadMutation.isPending ? "Processing…" : `Download ($${((tipCents ?? 179) / 100).toFixed(2)} tip)`}
                      </Button>
                    );
                    return null;
                  })()}
                  <Button size="sm" variant="outline" onClick={() => setVersionHistoryOpen(true)}
                    style={{ borderColor: "oklch(0.84 0.155 85 / 0.3)", color: "oklch(0.84 0.155 85)" }}>
                    <History className="w-3.5 h-3.5 mr-1" />Versions
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}
                    style={{ borderColor: "#3D2440", color: "oklch(0.65 0.04 280)" }}>
                    <Share2 className="w-3.5 h-3.5 mr-1" />Share
                  </Button>
                  {song && (
                    <QRShareModal
                      entity={{
                        type: "song",
                        id: song.id,
                        slug: String(song.id),
                        name: song.title,
                        subtitle: song.artistHandle || song.creatorName || undefined,
                        description: song.description ?? undefined,
                        thumbnailUrl: song.coverArtUrl ?? undefined,
                      }}
                      trigger={
                        <Button size="sm" variant="outline"
                          style={{ borderColor: "oklch(0.75 0.18 85 / 0.3)", color: "oklch(0.84 0.155 85 / 0.7)" }}
                          className="gap-1.5"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <path d="M14 14h2v2h-2zm4 0h3v3h-3zm0 4v3h-3v-3"/>
                          </svg>
                          ID Card
                        </Button>
                      }
                    />
                  )}
                  <Button size="sm" variant="outline" onClick={() => setAiTransformOpen(true)}
                    style={{ borderColor: "oklch(0.65 0.2 300 / 0.4)", color: "oklch(0.65 0.2 300)" }}>
                    <Wand2 className="w-3.5 h-3.5 mr-1" />AI Transform
                  </Button>
                  {!isOwner && (
                    <FlagContentButton
                      workId={song.id}
                      workType="audio"
                      workTitle={song.title}
                      size="sm"
                      className="px-2 py-1 rounded border border-zinc-800 hover:border-red-800/60"
                    />
                  )}
                </div>
              </div>
            </div>



            {/* ── PROMINENT TIP PANEL ── */}
            {tipsEnabled && !isOwner && (
              <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, oklch(0.13 0.04 60 / 0.6), oklch(0.11 0.02 280))", border: "1px solid oklch(0.84 0.155 85 / 0.35)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85)" }} />
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}>
                    Gift {creator?.artistHandle || creator?.name}
                  </p>
                  <span className="text-xs ml-auto" style={{ color: "oklch(0.55 0.04 280)" }}>90% goes directly to the artist</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["1", "2", "5", "10", "25"].map(amt => (
                    <button
                      key={amt}
                      onClick={() => { setTipAmount(amt); tipMutation.mutate({ songId: song.id, amountCents: Math.round(parseFloat(amt) * 100), origin: window.location.origin }); }}
                      disabled={tipMutation.isPending}
                      className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                      style={{ background: "oklch(0.84 0.155 85)", color: "#1E1020" }}
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setTipOpen(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    style={{ background: "oklch(0.84 0.05 75)", color: "oklch(0.75 0.04 280)", border: "1px solid #3D2440" }}
                  >
                    Custom
                  </button>
                </div>
              </div>
            )}

            {/* Witness ID */}
            {song.witnessId && (
              <div id="witness-records" className="rounded-2xl p-5" style={{ background: "oklch(0.65 0.2 300 / 0.06)", border: "1px solid oklch(0.65 0.2 300 / 0.25)" }}>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.2 300)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.65 0.2 300)" }}>Witness ID Certified</p>
                    <p className="text-xs font-mono break-all" style={{ color: "#E2E8F0" }}>{song.witnessId}</p>
                    {song.createdAt && (
                      <p className="text-xs mt-1" style={{ color: "#E2E8F0" }}>
                        Registered {new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                    {song.certificateUrl && (
                      <a href={song.certificateUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs mt-2 hover:underline" style={{ color: "oklch(0.65 0.2 300)" }}>
                        <ExternalLink className="w-3 h-3" />View Certificate
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sovereign Stamp Badge — shown when stamp has been applied */}
            {(song as any).sovereignStampId && (
              <div className="rounded-2xl p-5" style={{ background: "oklch(0.84 0.155 85 / 0.05)", border: "1px solid oklch(0.84 0.155 85 / 0.35)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>🔏</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}>Sovereign Stamp Applied</p>
                    <p className="text-xs font-mono break-all" style={{ color: "#E2E8F0" }}>{(song as any).sovereignStampId}</p>
                    {(song as any).sovereignStampedAt && (
                      <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.03 280)" }}>
                        Stamped {new Date((song as any).sovereignStampedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: "oklch(0.55 0.03 280)" }}>
                      Near-ultrasonic tone embedded in audio — 17 U.S.C. § 102(a)
                    </p>
                    {(song as any).certificateUrl && (
                      <a
                        href={(song as any).certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs mt-2 hover:underline"
                        style={{ color: "oklch(0.84 0.155 85)" }}
                      >
                        <ExternalLink className="w-3 h-3" />View Provenance Certificate
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* HAAI Authorship Declaration — shown when song has HAAI disclosure */}
            {(song as any).aiDisclosure === "human_authored_ai_instrument" && (
              <div className="rounded-2xl p-5" style={{ background: "oklch(0.14 0.025 280)", border: "1px solid oklch(0.84 0.155 85 / 0.2)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.84 0.155 85 / 0.15)" }}>
                    <span style={{ color: "oklch(0.84 0.155 85)", fontSize: "14px" }}>✍</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}>HAAI Authorship Declaration</p>
                    <p className="text-[11px]" style={{ color: "oklch(0.55 0.03 280)" }}>Human-Authored via AI Instrument — directorial intent on record</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {((() => {
                    const ct = (song as any).contentType as string | undefined;
                    if (ct === "manuscript") return [
                      { key: "haaiVisualConcept", label: "Structural Concept" },
                      { key: "haaiStyleLanguage", label: "Narrative Voice" },
                      { key: "haaiInstrumentation", label: "Thematic Elements" },
                      { key: "haaiVocalConveyance", label: "Pacing & Flow" },
                      { key: "haaiLyricalInspiration", label: "Core Subject / Thesis" },
                      { key: "haaiEmotionalTone", label: "Emotional Resonance" },
                    ];
                    if (ct === "lyrics") return [
                      { key: "haaiVisualConcept", label: "Imagery & Metaphor" },
                      { key: "haaiStyleLanguage", label: "Poetic Form & Style" },
                      { key: "haaiInstrumentation", label: "Rhythmic Mechanics" },
                      { key: "haaiVocalConveyance", label: "Intended Delivery" },
                      { key: "haaiLyricalInspiration", label: "Foundational Concept" },
                      { key: "haaiEmotionalTone", label: "Emotional Tone" },
                    ];
                    if (ct === "comic") return [
                      { key: "haaiVisualConcept", label: "Composition & Framing" },
                      { key: "haaiStyleLanguage", label: "Aesthetic & Medium" },
                      { key: "haaiInstrumentation", label: "Color Palette & Lighting" },
                      { key: "haaiVocalConveyance", label: "Action & Movement" },
                      { key: "haaiLyricalInspiration", label: "Subject & Character" },
                      { key: "haaiEmotionalTone", label: "Atmosphere & Mood" },
                    ];
                    return [
                      { key: "haaiVisualConcept", label: "Visual Concept" },
                      { key: "haaiStyleLanguage", label: "Style" },
                      { key: "haaiInstrumentation", label: "Instrumentation" },
                      { key: "haaiVocalConveyance", label: "Vocal Conveyance" },
                      { key: "haaiLyricalInspiration", label: "Lyrical Inspiration" },
                      { key: "haaiEmotionalTone", label: "Emotional Tone" },
                    ];
                  })() as { key: string; label: string }[]).map(({ key, label }) => {
                    const val = (song as any)[key] as string | null | undefined;
                    if (!val) return null;
                    return (
                      <div key={key}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.84 0.155 85 / 0.6)" }}>{label}</p>
                        <p className="text-xs leading-relaxed" style={{ color: "oklch(0.78 0.03 280)" }}>{val}</p>
                      </div>
                    );
                  })}
                </div>
                {(song as any).haaiDeclaredAt && (
                  <p className="text-[10px] mt-4 pt-3" style={{ color: "oklch(0.42 0.03 280)", borderTop: "1px solid #8A6A2A" }}>
                    Declaration sealed {new Date((song as any).haaiDeclaredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">
            {/* Emoji Reactions */}
            <div className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid #8A6A2A" }}>
              <div className="flex flex-wrap gap-2 justify-center">
                {REACTIONS.map(emoji => (
                  <button type="button" key={emoji} onClick={() => handleReaction(emoji)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: myReactionsSet.has(emoji) ? "oklch(0.75 0.18 85 / 0.2)" : "oklch(0.84 0.05 75)",
                      border: `1px solid ${myReactionsSet.has(emoji) ? "oklch(0.75 0.18 85 / 0.4)" : "#8A6A2A"}`,
                    }}>
                    <span>{emoji}</span>
                    {reactionCounts[emoji] ? <span className="text-xs" style={{ color: "oklch(0.6 0.04 280)" }}>{reactionCounts[emoji]}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            {/* Unified Interaction Thread */}
            <div className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid #8A6A2A" }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 flex-wrap" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.8 0.02 85)" }}>
                <MessageSquare className="w-4 h-4" />
                Activity
                {eventThread && eventThread.length > 0 && (
                  <span className="text-xs font-normal" style={{ color: "oklch(0.45 0.03 280)" }}>{eventThread.length}</span>
                )}
                {song.witnessId && (
                  <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "oklch(0.65 0.2 300 / 0.12)", color: "oklch(0.65 0.2 300)", border: "1px solid oklch(0.65 0.2 300 / 0.3)" }}>
                    WID-linked
                  </span>
                )}
              </h3>

              {/* Comment input */}
              <div className="flex gap-2 mb-4">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                  style={{ background: "oklch(0.2 0.04 280)" }}>
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
                        commentMutation.mutate({ songId: song.id, content: commentText.trim(), authorName: user?.name || undefined });
                      }
                    }}
                    style={{ background: "oklch(0.09 0.01 280)", border: "1px solid #8A6A2A", color: "oklch(0.85 0.02 280)", fontSize: "13px" }} />
                  {commentText.trim() && (
                    <Button size="sm"
                      onClick={() => commentMutation.mutate({ songId: song.id, content: commentText.trim(), authorName: user?.name || undefined })}
                      disabled={commentMutation.isPending}
                      style={{ background: "oklch(0.84 0.155 85)", color: "#1E1020" }}>
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
                            style={{ background: "oklch(0.18 0.03 280)" }}>
                            <span style={{ color: "oklch(0.65 0.04 280)" }}>{initial}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium" style={{ color: "oklch(0.7 0.04 280)" }}>{c.authorName || "Anonymous"}</span>
                              <span className="text-[10px] ml-auto" style={{ color: "oklch(0.35 0.02 280)" }}>{timeStr}</span>
                            </div>
                            <p className="text-sm" style={{ color: "oklch(0.7 0.03 280)" }}>{c.content}</p>
                            <button
                              onClick={() => { setReplyingTo(isReplying ? null : { id: c.id, authorName: c.authorName || "Anonymous" }); setReplyText(""); }}
                              className="text-[10px] mt-1 transition-colors"
                              style={{ color: isReplying ? "oklch(0.80 0.145 82)" : "oklch(0.40 0.02 280)" }}
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
                              style={{ background: "oklch(0.2 0.04 280)" }}>
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
                                    replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim(), authorName: user?.name || undefined });
                                  }
                                  if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                                }}
                                style={{ background: "oklch(0.09 0.01 280)", border: "1px solid #8A6A2A", color: "oklch(0.85 0.02 280)", fontSize: "12px", height: "32px" }}
                                autoFocus
                              />
                              {replyText.trim() && (
                                <Button size="sm"
                                  onClick={() => replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim(), authorName: user?.name || undefined })}
                                  disabled={replyMutation.isPending}
                                  className="h-6 text-[11px] px-2"
                                  style={{ background: "oklch(0.84 0.155 85)", color: "#1E1020" }}>
                                  Post reply
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Nested replies */}
                        {c.replies?.length > 0 && (
                          <div className="ml-9 mt-2 space-y-2 pl-3" style={{ borderLeft: "1px solid #8A6A2A" }}>
                            {(c.replies as any[]).map((r: any) => (
                              <div key={r.id} className="flex gap-2">
                                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                                  style={{ background: "oklch(0.16 0.025 280)" }}>
                                  <span style={{ color: "oklch(0.55 0.04 280)" }}>{(r.authorName || "A").charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[11px] font-medium" style={{ color: "oklch(0.65 0.04 280)" }}>{r.authorName || "Anonymous"}</span>
                                    <span className="text-[9px] ml-auto" style={{ color: "oklch(0.30 0.02 280)" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs" style={{ color: "oklch(0.62 0.03 280)" }}>{r.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-center py-4" style={{ color: "oklch(0.4 0.03 280)" }}>Be the first to comment</p>
                )}
              </div>
            </div>

            {/* Related */}
            {relatedData && relatedData.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid #8A6A2A" }}>
                <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.8 0.02 85)" }}>Related</h3>
                <div className="space-y-1">
                  {relatedData.map((item: any) => <RelatedCard key={item.song.id} item={item} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── LYRICS — full width, bottom of page, collapsed by default ── */}
        {song.lyricsText && (
          <div className="mt-6 rounded-2xl overflow-hidden" style={{ background: "oklch(0.11 0.015 280)", border: `1px solid ${song.isLyricsOnly ? "oklch(0.75 0.18 85 / 0.35)" : "#8A6A2A"}` }}>
            <button type="button" className="w-full flex items-center justify-between px-5 py-4" onClick={() => setShowLyrics(!showLyrics)}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.8 0.02 85)" }}>Lyrics</span>
                {song.isLyricsOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "oklch(0.75 0.18 85 / 0.15)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.75 0.18 85 / 0.4)", letterSpacing: "0.06em" }}>
                    <Shield className="w-2.5 h-2.5" /> LYRICS PROTECTED — Audio Not Yet Attached
                  </span>
                )}
                <span className="text-xs ml-2" style={{ color: "oklch(0.45 0.03 280)" }}>{showLyrics ? "Tap to collapse" : "Tap to expand"}</span>
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
                <pre className="text-sm leading-7 whitespace-pre-wrap font-sans" style={{ color: "oklch(0.75 0.03 280)" }}>
                  {song.lyricsText}
                </pre>
                {song.witnessId && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid oklch(0.2 0.015 280)" }}>
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
          <div className="mt-4 rounded-2xl overflow-hidden" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid #8A6A2A" }}>
            <div className="px-5 py-4">
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.8 0.02 85)" }}>Credits</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {allCredits.map((c: { role: string; name: string }, i: number) => (
                  <div key={i} className="flex items-baseline gap-2">
                    <span className="text-[10px] uppercase tracking-widest flex-shrink-0" style={{ color: "oklch(0.45 0.04 280)", minWidth: "80px" }}>{c.role}</span>
                    <span className="text-sm" style={{ color: "oklch(0.78 0.03 280)" }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Gift Modal */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent style={{ background: "oklch(0.12 0.015 280)", border: "1px solid #3D2440" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              Gift {creator?.artistHandle || creator?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "oklch(0.6 0.04 280)" }}>90% goes directly to the artist. 10% supports Living Nexus.</p>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(amt => (
                <button type="button" key={amt} onClick={() => setTipAmount(amt)} className="py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: tipAmount === amt ? "oklch(0.84 0.155 85)" : "oklch(0.84 0.05 75)", color: tipAmount === amt ? "#1E1020" : "oklch(0.7 0.04 280)", border: "1px solid #3D2440" }}>
                  ${amt}
                </button>
              ))}
            </div>
            <Input type="number" placeholder="Custom amount ($)" value={tipAmount} onChange={e => setTipAmount(e.target.value)} min="1" step="0.01"
              style={{ background: "oklch(0.14 0.015 280)", border: "1px solid #3D2440", color: "oklch(0.9 0.01 280)" }} />
            <Button className="w-full" onClick={handleTip} disabled={tipMutation.isPending}
              style={{ background: "oklch(0.84 0.155 85)", color: "#1E1020" }}>
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

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent style={{ background: "oklch(0.12 0.015 280)", border: "1px solid #3D2440", maxWidth: "480px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Share Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Embed preview — shows how the link looks in Discord/iMessage */}
            <div>
              <p className="text-[10px] font-semibold mb-2 tracking-widest" style={{ color: "oklch(0.5 0.04 280)", fontFamily: "'Orbitron', sans-serif" }}>EMBED PREVIEW</p>
              <div className="rounded-xl overflow-hidden" style={{ background: "oklch(0.17 0.02 280)", border: "3px solid #8A6A2A", borderLeft: "4px solid #8A6A2A" }}>
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
                    <p className="text-[10px] font-bold mb-0.5" style={{ color: "#8A6A2A", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.06em" }}>LIVING NEXUS</p>
                    <p className="text-sm font-bold truncate" style={{ color: "oklch(0.92 0.02 85)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
                    <p className="text-xs truncate" style={{ color: "oklch(0.65 0.04 280)" }}>{creator?.artistHandle || creator?.name || "Unknown Artist"}</p>
                    {song.genre && <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.5 0.04 280)" }}>{song.genre}{song.witnessId ? " · WID Protected" : ""}</p>}
                  </div>
                </div>
                {(song as any).embedVideoUrl ? (
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "oklch(0.65 0.18 145)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      Video embed ready — Discord will show inline player
                    </div>
                  </div>
                ) : (
                  <div className="px-3 pb-2">
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "oklch(0.65 0.04 280)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      Image embed — video generating in background
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: "oklch(0.4 0.03 280)" }}>This is how your link will appear in Discord, iMessage, Telegram, and Slack.</p>
            </div>

            {/* Copy link */}
            <div className="flex gap-2">
              <Input value={window.location.href} readOnly
                style={{ background: "oklch(0.14 0.015 280)", border: "1px solid #3D2440", color: "oklch(0.7 0.03 280)", fontSize: "12px" }} />
              <Button onClick={copyLink} style={{ background: "oklch(0.84 0.155 85)", color: "#1E1020", flexShrink: 0 }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Platform share buttons */}
            <div className="grid grid-cols-2 gap-2">
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Listening to "${song.title}" on Living Nexus`)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noreferrer" className="block">
                <Button variant="outline" className="w-full" style={{ borderColor: "#3D2440", color: "oklch(0.65 0.04 280)" }}>
                  <Twitter className="w-4 h-4 mr-2" />Share on X
                </Button>
              </a>
              <Button variant="outline" className="w-full"
                style={{ borderColor: "#3D2440", color: "oklch(0.65 0.04 280)" }}
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

      {/* AI Transform Modal */}
      <Dialog open={aiTransformOpen} onOpenChange={(open) => {
        if (!open && transformPhase === "processing") return;
        setAiTransformOpen(open);
        if (!open) {
          setTransformPhase("idle"); setTransformResult(null);
          setTransformError(""); setTransformPrompt("");
          setTransformStyle(""); setTransformTags([]);
        }
      }}>
        <DialogContent style={{ background: "oklch(0.80 0.05 75)", border: "1px solid oklch(0.65 0.2 300 / 0.5)", maxWidth: "520px" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.65 0.2 300)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Wand2 className="w-5 h-5" />AI Transform
            </DialogTitle>
          </DialogHeader>

          {transformPhase === "idle" && (
            <div className="space-y-4 py-2">
              {!user && (
                <p className="text-sm text-center" style={{ color: "#E2E8F0" }}>Sign in to transform tracks.</p>
              )}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "oklch(0.65 0.2 300)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em" }}>DESCRIBE THE TRANSFORMATION</label>
                <Textarea
                  value={transformPrompt}
                  onChange={e => setTransformPrompt(e.target.value)}
                  placeholder="e.g. Transform into a lo-fi hip hop beat with rain sounds and vinyl crackle"
                  rows={3}
                  maxLength={500}
                  style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.3 0.04 280)", color: "oklch(0.85 0.02 280)", resize: "none" }}
                />
                <p className="text-xs mt-1" style={{ color: "oklch(0.4 0.03 280)" }}>{transformPrompt.length}/500</p>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: "oklch(0.65 0.2 300)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em" }}>STYLE PRESET (OPTIONAL)</label>
                <Input
                  value={transformStyle}
                  onChange={e => setTransformStyle(e.target.value)}
                  placeholder="e.g. cinematic, dark ambient, jazz"
                  style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.3 0.04 280)", color: "oklch(0.85 0.02 280)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "oklch(0.65 0.2 300)", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em" }}>QUICK TAGS</label>
                <div className="flex flex-wrap gap-2">
                  {["lo-fi", "jazz", "cinematic", "dark ambient", "trap", "acoustic", "orchestral", "electronic"].map(tag => (
                    <button
                      key={tag}
                      onClick={() => setTransformTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                      className="px-2 py-0.5 rounded text-xs transition-all"
                      style={{
                        background: transformTags.includes(tag) ? "oklch(0.65 0.2 300 / 0.25)" : "oklch(0.16 0.015 280)",
                        border: `1px solid ${transformTags.includes(tag) ? "oklch(0.65 0.2 300 / 0.7)" : "oklch(0.28 0.03 280)"}`,
                        color: transformTags.includes(tag) ? "oklch(0.65 0.2 300)" : "oklch(0.55 0.04 280)",
                      }}
                    >{tag}</button>
                  ))}
                </div>
              </div>
              <p className="text-xs" style={{ color: "oklch(0.38 0.03 280)" }}>
                All AI transforms are linked to the original Witness ID. Generation takes ~60-90 seconds.
              </p>
              <Button
                className="w-full font-semibold"
                disabled={!user || !transformPrompt.trim() || aiTransformMutation.isPending}
                onClick={() => aiTransformMutation.mutate({
                  songId,
                  prompt: transformPrompt.trim(),
                  style: transformStyle.trim() || undefined,
                  tags: transformTags.length > 0 ? transformTags : undefined,
                })}
                style={{ background: "oklch(0.65 0.2 300)", color: "#DACAAA", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.08em" }}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {aiTransformMutation.isPending ? "SUBMITTING..." : "GENERATE TRANSFORM"}
              </Button>
            </div>
          )}

          {transformPhase === "processing" && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center animate-pulse"
                style={{ background: "oklch(0.65 0.2 300 / 0.15)", border: "2px solid oklch(0.65 0.2 300 / 0.4)" }}>
                <Wand2 className="w-8 h-8" style={{ color: "oklch(0.65 0.2 300)" }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.85 0.02 280)" }}>Generating Transform...</p>
                <p className="text-sm" style={{ color: "oklch(0.5 0.04 280)" }}>The AI is reimagining your track. This takes 60-90 seconds.</p>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 280)" }}>
                <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: "oklch(0.65 0.2 300)" }} />
              </div>
              <p className="text-xs" style={{ color: "oklch(0.38 0.03 280)" }}>Do not close this dialog</p>
            </div>
          )}

          {transformPhase === "done" && transformResult && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3"
                  style={{ background: "oklch(0.55 0.2 145 / 0.15)", border: "2px solid oklch(0.55 0.2 145 / 0.5)" }}>
                  <Check className="w-6 h-6" style={{ color: "oklch(0.55 0.2 145)" }} />
                </div>
                <p className="font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.85 0.02 280)" }}>Transform Complete</p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.5 0.04 280)" }}>Prompt: {transformResult.prompt}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.3 0.04 280)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.65 0.2 300)", fontFamily: "'Orbitron', sans-serif" }}>TRANSFORMED TRACK</p>
                <audio controls src={transformResult.outputUrl} className="w-full" style={{ height: "36px" }} />
              </div>
              <div className="flex gap-2">
                <a href={transformResult.outputUrl} download className="flex-1">
                  <Button variant="outline" className="w-full text-xs" style={{ borderColor: "oklch(0.3 0.04 280)", color: "oklch(0.7 0.04 280)" }}>Download</Button>
                </a>
                <Button
                  className="flex-1 text-xs"
                  onClick={() => { setTransformPhase("idle"); setTransformResult(null); setTransformPrompt(""); setTransformStyle(""); setTransformTags([]); }}
                  style={{ background: "oklch(0.65 0.2 300 / 0.2)", color: "oklch(0.65 0.2 300)", border: "1px solid oklch(0.65 0.2 300 / 0.4)" }}
                >New Transform</Button>
              </div>
            </div>
          )}

          {transformPhase === "error" && (
            <div className="py-6 text-center space-y-3">
              <p className="font-semibold" style={{ color: "oklch(0.65 0.2 25)" }}>Transform Failed</p>
              <p className="text-sm" style={{ color: "#E2E8F0" }}>{transformError}</p>
              <Button
                onClick={() => { setTransformPhase("idle"); setTransformError(""); }}
                style={{ background: "oklch(0.65 0.2 300 / 0.2)", color: "oklch(0.65 0.2 300)", border: "1px solid oklch(0.65 0.2 300 / 0.4)" }}
              >Try Again</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
