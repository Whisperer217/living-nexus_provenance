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
  ExternalLink, Check, ChevronDown, ChevronUp, Twitter, Heart,
  Video, ImageIcon, History,
} from "lucide-react";
import { useLike } from "@/hooks/useLike";
import AddToPlaylistButton from "@/components/AddToPlaylistButton";
import { WIDPanel } from "@/components/WIDPanel";
import { FlagContentButton } from "@/components/FlagContentButton";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";
import { safeAudioUrl } from "@shared/const";
import { getContentTypeColors } from "@/lib/contentTypeColors";
import { QRShareModal } from "@/components/QRIdentityCard";
import { CreatorHandle } from "@/components/CreatorHandle";

const REACTIONS = ["🔥", "😍", "😱", "🙌", "👍", "👎", "🤯", "+"];

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
  const { addAndPlay, state: playerState, currentTrackId, openNowPlayingPanel } = usePlayer();
  const songId = parseInt(id || "0");

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl mx-auto animate-pulse" style={{ background: "rgba(196,154,40,0.15)" }} />
        <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>Loading track...</p>
      </div>
    </div>
  );

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
  const pageImage = song.coverArtUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";
  const pageUrl = `https://www.livingnexus.org/song/${songId}`;
  const audioFileUrl = song.fileUrl ? safeAudioUrl(song.fileUrl) : undefined;
  const embedVideoUrl = (song as any).embedVideoUrl as string | undefined;

  return (
    <div className="min-h-screen pb-8" style={{ background: "var(--ln-coal)" }}>
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
                    style={{ aspectRatio: "16/9", background: "var(--ln-coal)" }}
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
                        style={{ background: "var(--ln-coal)" }}
                      >
                        {song.coverArtUrl
                          ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                          : <Music className="w-16 h-16 opacity-10" style={{ color: "var(--ln-gold)" }} />}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                            style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}>
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
                      background: showVideo ? "rgba(196,154,40,0.08)" : "var(--ln-coal)",
                      color: showVideo ? "var(--ln-gold)" : "var(--ln-iron)",
                      border: `1px solid ${showVideo ? "rgba(196,154,40,0.3)" : "var(--ln-gold)"}`,
                    }}
                  >
                    {showVideo ? <><ImageIcon size={12} /> Cover Art</> : <><Video size={12} /> Music Video</>}
                  </button>
                )}
                {/* Cover art with play/pause overlay (only shown when no video or video is hidden) */}
                {!(song as any).videoUrl && (
                  <div
                    className="relative w-full sm:w-56 h-56 rounded-2xl overflow-hidden flex items-center justify-center group cursor-pointer"
                    style={{ background: "linear-gradient(135deg, var(--ln-coal), #111009)" }}
                    onClick={song.fileUrl ? handlePlay : undefined}
                  >
                    {song.coverArtUrl
                      ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%` }} />
                      : <Music className="w-20 h-20 opacity-10" style={{ color: "var(--ln-gold)" }} />}
                    {/* Play/pause overlay — always visible when active, hover-visible otherwise */}
                    {song.fileUrl && (
                      <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                        isThisTrackActive ? "bg-black/30" : "bg-black/0 group-hover:bg-black/40"
                      }`}>
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                            isThisTrackActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90"
                          }`}
                          style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
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
                    style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                    {song.title}
                  </h1>
                  {creator && (
                    <div className="mb-3">
                      <CreatorHandle
                        userId={creator.id}
                        handle={creator.artistHandle}
                        displayName={creator.name}
                        role={(creator as any).role}
                        size="md"
                      />
                    </div>
                  )}
                  {(() => { const _ctc = getContentTypeColors((song as any).contentType ?? "audio"); return (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge style={{ background: _ctc.chipBg, color: _ctc.text, border: `1px solid ${_ctc.chipBorder}`, fontSize: "11px" }}>{_ctc.icon} {_ctc.label}</Badge>
                    {song.genre && <Badge style={{ background: _ctc.chipBg, color: _ctc.text, border: `1px solid ${_ctc.chipBorder}`, fontSize: "11px" }}>{song.genre}</Badge>}
                    {song.bpm && <Badge style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px solid #C49A28", fontSize: "11px" }}>{song.bpm} BPM</Badge>}
                    {song.keySignature && <Badge style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px solid #C49A28", fontSize: "11px" }}>{song.keySignature}</Badge>}
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
                        ai_generated: { label: "AI-Generated", bg: "rgba(196,68,10,0.15)", fg: "var(--ln-ember)", border: "rgba(239,68,68,0.4)" },
                        ai_assisted: { label: "AI-Assisted", bg: "rgba(170,142,100,0.15)", fg: "var(--ln-parchment)", border: "rgba(170,142,100,0.4)" },
                        human_authored_ai_instrument: { label: "HAAI — Human-Authored", bg: "rgba(196,154,40,0.08)", fg: "var(--ln-gold)", border: "rgba(196,154,40,0.3)" },
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
                  ); })()}
                  <div className="flex items-center gap-4 text-xs" style={{ color: "#E2E8F0" }}>
                    <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" />{song.playCount || 0} plays</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{comments?.length || 0} comments</span>
                  </div>
                  {(song as any).caption && (
                    <p className="text-sm leading-relaxed mt-3"
                      style={{ color: "var(--ln-smoke)", fontFamily: "'Lato', sans-serif", borderLeft: "2px solid rgba(196,154,40,0.35)", paddingLeft: "12px" }}>
                      {(song as any).caption}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {!isOwner && (
                    <Button size="sm" variant="outline" onClick={e => toggleLike(e)}
                       style={isLiked
                         ? { borderColor: "rgba(239,68,68,0.6)", color: "var(--ln-ember)" }
                         : { borderColor: "#C3AB7D", color: "var(--ln-smoke)" }}>
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
                        style={{ borderColor: "#C3AB7D", color: "var(--ln-smoke)" }}>
                        <Download className="w-3.5 h-3.5 mr-1" />{downloadMutation.isPending ? "…" : "Download"}
                      </Button>
                    );
                    if (dlPerm === "tipped") return (
                      <Button size="sm" variant="outline"
                        onClick={() => tipDownloadMutation.mutate({ songId: song.id, origin: window.location.origin })}
                        disabled={tipDownloadMutation.isPending}
                        title={`Tip $${((tipCents ?? 179) / 100).toFixed(2)} to unlock download`}
                        style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                        <Download className="w-3.5 h-3.5 mr-1" />{tipDownloadMutation.isPending ? "Processing…" : `Download ($${((tipCents ?? 179) / 100).toFixed(2)} tip)`}
                      </Button>
                    );
                    return null;
                  })()}
                  <Button size="sm" variant="outline" onClick={() => setVersionHistoryOpen(true)}
                    style={{ borderColor: "rgba(196,154,40,0.25)", color: "var(--ln-gold)" }}>
                    <History className="w-3.5 h-3.5 mr-1" />Versions
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}
                    style={{ borderColor: "#C3AB7D", color: "var(--ln-smoke)" }}>
                    <Share2 className="w-3.5 h-3.5 mr-1" />Share Artifact
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
                          style={{ borderColor: "rgba(196,154,40,0.25)", color: "rgba(232,223,200,0.6)" }}
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



            {/* ── HEADLINE CAPTION + DESCRIPTION ── */}
            {((song as any).headlineCaption || (song as any).description) && (
              <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(196,154,40,0.03)", border: "1px solid rgba(196,154,40,0.15)" }}>
                {(song as any).headlineCaption && (
                  <p className="text-base font-semibold leading-snug" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                    {(song as any).headlineCaption}
                  </p>
                )}
                {(song as any).description && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ln-smoke)", fontFamily: "'Lato', sans-serif" }}>
                    {(song as any).description}
                  </p>
                )}
              </div>
            )}

            {/* ── GALLERY ── */}
            {(() => {
              const rawGallery = (song as any).galleryImagesJson;
              if (!rawGallery) return null;
              let gallery: { url: string; caption?: string }[] = [];
              try { gallery = typeof rawGallery === 'string' ? JSON.parse(rawGallery) : rawGallery; } catch { return null; }
              if (!gallery.length) return null;
              return (
                <div className="space-y-3">
                  <p className="text-[10px] font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>Gallery</p>
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
                </div>
              );
            })()}

            {/* ── PROMINENT TIP PANEL ── */}
            {tipsEnabled && !isOwner && (
              <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(44,52,56,0.6), #111009)", border: "1px solid rgba(196,154,40,0.3)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                  <p className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
                    Gift {creator?.artistHandle || creator?.name}
                  </p>
                  <span className="text-xs ml-auto" style={{ color: "var(--ln-iron)" }}>90% goes directly to the artist</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["1", "2", "5", "10", "25"].map(amt => (
                    <button
                      key={amt}
                      onClick={() => { setTipAmount(amt); tipMutation.mutate({ songId: song.id, amountCents: Math.round(parseFloat(amt) * 100), origin: window.location.origin }); }}
                      disabled={tipMutation.isPending}
                      className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                      style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setTipOpen(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    style={{ background: "var(--ln-coal)", color: "var(--ln-parchment)", border: "1px solid #C3AB7D" }}
                  >
                    Custom
                  </button>
                </div>
              </div>
            )}

            {/* Witness ID */}
            {song.witnessId && (
              <div id="witness-records" className="rounded-2xl p-5" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.2)" }}>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>Witness ID Certified</p>
                    <p className="text-xs font-mono break-all" style={{ color: "#E2E8F0" }}>{song.witnessId}</p>
                    {song.createdAt && (
                      <p className="text-xs mt-1" style={{ color: "#E2E8F0" }}>
                        Registered {new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                    {song.certificateUrl && (
                      <a href={song.certificateUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs mt-2 hover:underline" style={{ color: "var(--ln-gold)" }}>
                        <ExternalLink className="w-3 h-3" />View Certificate
                      </a>
                    )}
                    {/* Harmonic Signature Downloads */}
                    {(song as any).harmonicSignature && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <a
                          href={`/api/harmonic/${song.id}/audio`}
                          download
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
                        >
                          <Download className="w-3 h-3" />
                          Harmonic Tone (.wav)
                        </a>
                        <a
                          href={`/api/harmonic/${song.id}/image`}
                          download
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                          style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
                        >
                          <Download className="w-3 h-3" />
                          Waveform Image (.png)
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sovereign Stamp Badge — shown when stamp has been applied */}
            {(song as any).sovereignStampId && (
              <div className="rounded-2xl p-5" style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.3)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center">
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>🔏</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>Sovereign Stamp Applied</p>
                    <p className="text-xs font-mono break-all" style={{ color: "#E2E8F0" }}>{(song as any).sovereignStampId}</p>
                    {(song as any).sovereignStampedAt && (
                      <p className="text-xs mt-1" style={{ color: "var(--ln-smoke)" }}>
                        Stamped {new Date((song as any).sovereignStampedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: "var(--ln-smoke)" }}>
                      Near-ultrasonic tone embedded in audio — 17 U.S.C. § 102(a)
                    </p>
                    {(song as any).certificateUrl && (
                      <a
                        href={(song as any).certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs mt-2 hover:underline"
                        style={{ color: "var(--ln-gold)" }}
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
              <div className="rounded-2xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.15)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(196,154,40,0.08)" }}>
                    <span style={{ color: "var(--ln-gold)", fontSize: "14px" }}>✍</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>HAAI Authorship Declaration</p>
                    <p className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>Human-Authored via AI Instrument — directorial intent on record</p>
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
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(196,154,40,0.5)" }}>{label}</p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--ln-parchment)" }}>{val}</p>
                      </div>
                    );
                  })}
                </div>
                {(song as any).haaiDeclaredAt && (
                  <p className="text-[10px] mt-4 pt-3" style={{ color: "var(--ln-iron)", borderTop: "1px solid #C49A28" }}>
                    Declaration sealed {new Date((song as any).haaiDeclaredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">
            {/* Emoji Reactions */}
            <div className="p-4" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
              <div className="flex flex-wrap gap-2 justify-center">
                {REACTIONS.map(emoji => (
                  <button type="button" key={emoji} onClick={() => handleReaction(emoji)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-110 active:scale-95"
                    style={{
                      background: myReactionsSet.has(emoji) ? "rgba(196,154,40,0.15)" : "var(--ln-coal)",
                      border: `1px solid ${myReactionsSet.has(emoji) ? "rgba(196,154,40,0.3)" : "var(--ln-gold)"}`,
                    }}>
                    <span>{emoji}</span>
                    {reactionCounts[emoji] ? <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{reactionCounts[emoji]}</span> : null}
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
                        commentMutation.mutate({ songId: song.id, content: commentText.trim(), authorName: user?.artistHandle || user?.name || undefined });
                      }
                    }}
                    style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-parchment)", fontSize: "13px" }} />
                  {commentText.trim() && (
                    <Button size="sm"
                      onClick={() => commentMutation.mutate({ songId: song.id, content: commentText.trim(), authorName: user?.artistHandle || user?.name || undefined })}
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
                                    replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim(), authorName: user?.artistHandle || user?.name || undefined });
                                  }
                                  if (e.key === "Escape") { setReplyingTo(null); setReplyText(""); }
                                }}
                                style={{ background: "var(--ln-coal)", border: "1px solid #C49A28", color: "var(--ln-parchment)", fontSize: "12px", height: "32px" }}
                                autoFocus
                              />
                              {replyText.trim() && (
                                <Button size="sm"
                                  onClick={() => replyMutation.mutate({ songId: song.id, parentId: c.id, content: replyText.trim(), authorName: user?.artistHandle || user?.name || undefined })}
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
        <DialogContent style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D" }}>
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

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", maxWidth: "480px" }}>
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

    </div>
  );
}