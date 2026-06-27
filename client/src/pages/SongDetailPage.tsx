/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — SongDetailPage (Archive Layout v2 — Schematic v1.0)
   Grid: 1280px locked container, 12 columns, 24px gutter
   Modules: A.Header | B.Hero Media | C.Hero Info | D.About |
            E.Provenance Timeline | F.Manifestations | G.Witnesses |
            H.Comments | I.Technical Metadata | J.Footer Band
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from "react";
import { triggerTaggedDownload } from "@/lib/downloadTrack";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Play, Pause, Share2, Copy, MessageSquare,
  Music, ChevronLeft, Heart,
  ShieldCheck, Pencil, ChevronDown, ChevronUp,
  Twitter, MoreHorizontal, Lock, FileText, Users, Layers,
} from "lucide-react";
import { useLike } from "@/hooks/useLike";
import { useRef as _useRef } from "react";
import { useWaveformVisualizer } from "@/hooks/useWaveformVisualizer";
import { useHarmonic } from "@/contexts/HarmonicContext";
import { WitnessesPanel } from "@/components/WitnessesPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { VersionHistoryModal } from "@/components/VersionHistoryModal";
import { safeAudioUrl } from "@shared/const";
import { CinematicComicReader, type BookPage } from "@/components/reader/CinematicComicReader";
import { CreativeDrawer } from "@/components/CreativeDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SongDetailPageSkeleton } from "@/components/SongDetailPageSkeleton";
import { SacredCanvas } from "@/components/SacredCanvas";


// ── Accordion module ──────────────────────────────────────────────
function AccordionModule({
  icon, label, description, count, locked, children, defaultOpen = false,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  count?: number;
  locked?: boolean;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: "var(--ln-surface)",
      border: "1px solid var(--ln-border)",
      borderRadius: 2,
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 text-left transition-colors hover:bg-white/[0.02]"
        style={{ padding: "20px 24px" }}
      >
        <div style={{ color: "var(--ln-gold)", flexShrink: 0 }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 600, color: "var(--ln-text-1)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {label}
          </p>
          <p style={{ fontSize: 13, color: "var(--ln-text-3)", marginTop: 2 }}>{description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {locked && <Lock size={14} style={{ color: "var(--ln-text-3)" }} />}
          {count !== undefined && (
            <span style={{
              background: "var(--ln-surface-2)",
              border: "1px solid var(--ln-border)",
              borderRadius: 2,
              padding: "2px 10px",
              fontSize: 13,
              fontFamily: "'Cinzel', serif",
              color: "var(--ln-text-2)",
              minWidth: 32,
              textAlign: "center",
            }}>{count}</span>
          )}
          {open
            ? <ChevronUp size={16} style={{ color: "var(--ln-text-3)" }} />
            : <ChevronDown size={16} style={{ color: "var(--ln-text-3)" }} />}
        </div>
      </button>
      {open && children && (
        <div style={{ borderTop: "1px solid var(--ln-border)", padding: "24px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Inline provenance timeline (schematic style) ──────────────────
function SchematicProvenanceTimeline({ events }: { events: any[] }) {
  if (!events || events.length === 0) return (
    <p style={{ fontSize: 13, color: "var(--ln-text-3)", fontStyle: "italic" }}>No provenance events recorded yet.</p>
  );

  const ICON_MAP: Record<string, React.ReactNode> = {
    created: <FileText size={18} />,
    wid_assigned: <ShieldCheck size={18} />,
    published: <Music size={18} />,
    witnessed: <Users size={18} />,
    distributed: <Layers size={18} />,
  };

  const LABEL_MAP: Record<string, string> = {
    created: "REGISTERED",
    wid_assigned: "WID ASSIGNED",
    published: "PUBLIC RELEASE",
    witnessed: "FIRST WITNESS",
    distributed: "DISTRIBUTED",
  };

  const displayEvents = events.slice(0, 4);

  return (
    <div className="relative" style={{ overflowX: "auto" }}>
      {/* Horizontal connector line */}
      <div style={{
        position: "absolute",
        top: 28,
        left: 28,
        right: 28,
        height: 1,
        background: "linear-gradient(to right, var(--ln-gold-dim), var(--ln-gold), var(--ln-gold-dim))",
        zIndex: 0,
      }} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${displayEvents.length}, 1fr)`, gap: 16, position: "relative", zIndex: 1 }}>
        {displayEvents.map((ev: any, i: number) => {
          const label = LABEL_MAP[ev.eventType] || ev.eventType.replace(/_/g, " ").toUpperCase();
          const icon = ICON_MAP[ev.eventType] || <Music size={18} />;
          const date = new Date(ev.createdAt);
          return (
            <div key={i} className="flex flex-col items-center text-center" style={{ gap: 12 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--ln-surface-2)",
                border: "2px solid var(--ln-gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ln-gold)",
                flexShrink: 0,
              }}>
                {icon}
              </div>
              <div>
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: "var(--ln-text-2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {label}
                </p>
                <p style={{ fontSize: 12, color: "var(--ln-text-3)", marginTop: 4 }}>
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p style={{ fontSize: 11, color: "var(--ln-text-3)", marginTop: 2 }}>
                  {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} UTC
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Comments section ──────────────────────────────────────────────
function CommentsSection({
  comments, songId, user, commentText, setCommentText, commentMutation, replyingTo, setReplyingTo, replyText, setReplyText, replyMutation,
}: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Post comment */}
      {user ? (
        <div style={{ display: "flex", gap: 12 }}>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Leave a reflection on this work..."
            rows={3}
            style={{
              flex: 1,
              background: "var(--ln-surface-2)",
              border: "1px solid var(--ln-border)",
              borderRadius: 2,
              color: "var(--ln-text-1)",
              fontSize: 14,
              padding: "12px 16px",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!commentText.trim()) return;
              commentMutation.mutate({ songId, text: commentText });
            }}
            disabled={commentMutation.isPending || !commentText.trim()}
            style={{
              background: "var(--ln-gold)",
              color: "#050504",
              border: "none",
              borderRadius: 2,
              padding: "0 20px",
              fontFamily: "'Cinzel', serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
              flexShrink: 0,
              alignSelf: "flex-start",
              paddingTop: 12,
              paddingBottom: 12,
            }}
          >
            POST
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ln-text-3)", fontStyle: "italic" }}>Sign in to leave a reflection.</p>
      )}
      {/* Comment list */}
      {comments && comments.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {comments.map((c: any) => (
            <div key={c.id} style={{ background: "var(--ln-surface-2)", border: "1px solid var(--ln-border)", borderRadius: 2, padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "var(--ln-text-2)", fontWeight: 600 }}>
                  {c.authorName || "Anonymous"}
                </span>
                <span style={{ fontSize: 11, color: "var(--ln-text-3)" }}>
                  {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <p style={{ fontSize: 14, color: "var(--ln-text-1)", lineHeight: 1.6 }}>{c.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ln-text-3)", fontStyle: "italic" }}>No reflections yet. Be the first.</p>
      )}
    </div>
  );
}

// ── Technical metadata section ────────────────────────────────────
function TechnicalMetadata({ song }: { song: any }) {
  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Content Type", value: song.contentType },
    { label: "Genre", value: song.genre },
    { label: "BPM", value: (song as any).bpm ? String((song as any).bpm) : null },
    { label: "Key", value: (song as any).key },
    { label: "Duration", value: (song as any).duration ? `${Math.floor((song as any).duration / 60)}:${String((song as any).duration % 60).padStart(2, "0")}` : null },
    { label: "File Format", value: song.fileUrl ? song.fileUrl.split(".").pop()?.toUpperCase() : null },
    { label: "AI Consent", value: (song as any).aiConsent === true ? "Granted" : (song as any).aiConsent === false ? "Withheld" : null },
    { label: "Download", value: (song as any).downloadPermission === "free" ? "Free" : (song as any).downloadPermission === "tip_required" ? "Tip Required" : "Not Available" },
    { label: "Status", value: (song as any).status },
    { label: "Registered", value: song.createdAt ? new Date(song.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null },
    { label: "Witness ID", value: song.witnessId },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
      {rows.filter(r => r.value).map(r => (
        <div key={r.label} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--ln-border)" }}>
          <span style={{ fontSize: 12, color: "var(--ln-text-3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0, width: 120 }}>
            {r.label}
          </span>
          <span style={{ fontSize: 13, color: "var(--ln-text-2)", wordBreak: "break-all" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addAndPlay, playQueueAt, togglePlay, state: playerState, currentTrackId, openNowPlayingPanel, audioRef } = usePlayer();
  const waveCanvasRef = _useRef<HTMLCanvasElement>(null);
  const songId = parseInt(id || "0");
  const utils = trpc.useUtils();

  // ── State ─────────────────────────────────────────────────────────
  const [tipOpen, setTipOpen] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [tipAmount, setTipAmount] = useState("5");
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: number; authorName: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  // ── Stable callbacks ──────────────────────────────────────────────
  const handleEditClose = useCallback(() => setEditingOpen(false), []);
  const handleEditSaved = useCallback(() => {
    setEditingOpen(false);
    utils.songs.getById.invalidate({ id: songId });
  }, [utils.songs.getById, songId]);

  // ── Player state ──────────────────────────────────────────────────
  const isThisTrackActive = currentTrackId === String(songId);
  const isPlaying = isThisTrackActive && playerState.isPlaying;
  const { harmonicSig } = useHarmonic();
  useWaveformVisualizer(audioRef, waveCanvasRef, isThisTrackActive, isPlaying, false, harmonicSig.hue, harmonicSig.saturation);
  const { liked: isLiked, toggle: toggleLike } = useLike(songId);

  // ── Data queries ──────────────────────────────────────────────────
  const { data: reactionsData } = trpc.songs.getReactions.useQuery({ songId }, { enabled: songId > 0 });
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
    onSettled: () => { utils.songs.getReactions.invalidate({ songId }); },
  });

  const { data: likeCountData } = trpc.songs.getLikeCount.useQuery({ songId }, { enabled: songId > 0 });
  const likeCount = likeCountData?.count ?? 0;
  const { data: songData, isLoading } = trpc.songs.getById.useQuery({ id: songId }, { enabled: songId > 0, refetchOnWindowFocus: false });
  const { data: comments, refetch: refetchComments } = trpc.comments.list.useQuery({ songId }, { enabled: songId > 0 });
  const { data: eventThread, refetch: refetchEvents } = trpc.events.getByWork.useQuery({ workId: songId }, { enabled: songId > 0 });
  const { data: relatedData } = trpc.songs.getRelated.useQuery({ songId, genre: songData?.song?.genre || undefined }, { enabled: songId > 0 && !!songData });
  const { data: evidenceItems = [] } = trpc.evidence.list.useQuery({ songId }, { enabled: songId > 0, staleTime: 30_000 });

  // ── Early-access to song/creator for handlers (safe before guard — handlers only called after render) ──
  const song = songData?.song as any;
  const creator = (songData as any)?.creator;

  // ── Mutations ─────────────────────────────────────────────────────
  const playMutation = trpc.songs.play.useMutation();
  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (d: { url: string | null }) => {
      if (d.url) { window.open(d.url, "_blank"); toast.info("Redirecting to checkout..."); }
      setTipOpen(false);
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
  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: async (_d: { url: string }, vars: { songId: number }) => {
      try { await triggerTaggedDownload(vars.songId); }
      catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Download failed"); }
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ── Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      setHeaderCollapsed(heroRef.current.getBoundingClientRect().bottom < 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tip") === "success") {
      setTipSuccess(true);
      toast.success("🙏 Your gift was sent! The creator receives 90% directly.", { duration: 8000 });
      utils.tips.recentTips.invalidate();
      utils.events.getByWork.invalidate({ workId: songId });
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setTipSuccess(false), 8000);
    }
    if (params.get("download") === "unlocked") {
      toast.loading("Payment received — unlocking download...", { id: "download-unlock" });
      window.history.replaceState({}, "", window.location.pathname);
      let attempts = 0;
      const maxAttempts = 15;
      let busy = false;
      const startPoll = () => {
        const poll = setInterval(async () => {
          if (busy) return;
          attempts++;
          busy = true;
          try {
            await utils.songDownload.getPermission.invalidate({ songId });
            await downloadMutation.mutateAsync({ songId });
            clearInterval(poll);
            toast.dismiss("download-unlock");
            toast.success("✅ Download started!");
            utils.tips.recentTips.invalidate();
            utils.events.getByWork.invalidate({ workId: songId });
          } catch (e: any) {
            if (attempts >= maxAttempts) {
              clearInterval(poll);
              toast.dismiss("download-unlock");
              toast.error("Download unlock taking longer than expected. Refresh and try again.");
            }
          } finally { busy = false; }
        }, 2000);
      };
      setTimeout(startPoll, 1500);
    }
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────
  const handlePlay = () => {
    if (!song) return;
    if (isThisTrackActive) { togglePlay(); return; }
    const thisTrack = {
      id: String(song.id), title: song.title,
      artist: creator?.artistHandle || creator?.name || "Unknown",
      genre: song.genre || "", audioUrl: safeAudioUrl(song.fileUrl),
      artUrl: song.coverArtUrl || undefined, witnessId: song.witnessId || undefined,
      aiDisclosure: (creator?.aiDisclosure as any) || undefined,
      creatorHandle: creator?.artistHandle || creator?.name || undefined,
      creatorId: creator?.id ?? undefined,
      coverPositionX: song.coverPositionX ?? 50, coverPositionY: song.coverPositionY ?? 50,
      visualReady: song.visualReady ?? false, autoVideoUrl: song.autoVideoUrl ?? undefined,
      creatorRole: song.creator?.role ?? undefined,
      downloadPermission: (song as any).downloadPermission ?? null,
      downloadTipThresholdCents: (song as any).downloadTipThresholdCents ?? null,
    };
    const relatedTracks = (relatedData ?? []).map((item: any) => ({
      id: String(item.song.id), title: item.song.title,
      artist: item.creator?.artistHandle || item.creator?.name || "Unknown",
      genre: item.song.genre || "",
      audioUrl: item.song.fileUrl ? safeAudioUrl(item.song.fileUrl) : undefined,
      artUrl: item.song.coverArtUrl || undefined, witnessId: item.song.witnessId || undefined,
      creatorHandle: item.creator?.artistHandle || item.creator?.name || undefined,
      creatorId: item.creator?.id ?? undefined,
      visualReady: item.song.visualReady ?? false, autoVideoUrl: item.song.autoVideoUrl ?? undefined,
      creatorRole: item.creator?.role ?? undefined,
    }));
    const queue = [thisTrack, ...relatedTracks.filter((t: any) => t.id !== thisTrack.id && !!t.audioUrl)];
    playQueueAt(queue, 0, "SONG_DETAIL");
    playMutation.mutate({ songId });
    openNowPlayingPanel();
  };

  const handleReadNow = () => {
    const pagesJson = (song as any)?.pagesJson;
    let hasPages = false;
    try { hasPages = pagesJson ? JSON.parse(pagesJson).length > 0 : false; } catch {}
    if (hasPages) { setReaderOpen(true); }
    else { window.location.href = `/book/${song?.id}`; }
  };

  const handleTip = () => {
    if (!song) return;
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum gift is $1.00"); return; }
    tipMutation.mutate({ songId: song.id, amountCents: cents, origin: window.location.origin });
  };

  const copyLink = () => {
    const shareUrl = song?.witnessId
      ? `https://www.livingnexus.org/share/${encodeURIComponent(song.witnessId)}`
      : window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied!");
    setShareOpen(false);
  };

  // ── Loading / not found ───────────────────────────────────────────
  if (isLoading) return <SongDetailPageSkeleton />;
  if (!song || !songData) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void)" }}>
      <div className="text-center">
        <p style={{ color: "var(--ln-text-3)" }}>Work not found.</p>
        <Link href="/"><Button className="mt-4" style={{ background: "var(--ln-gold)", color: "#050504" }}>Go Home</Button></Link>
      </div>
    </div>
  );

  // ── Derived values ────────────────────────────────────────────────
  const song_ = song;
  const isOwner = user?.id === creator?.id;
  const tipsEnabled = creator?.stripeAccountStatus === "enabled";
  const artistName = creator?.artistHandle || creator?.name || "Unknown Artist";
  const pageTitle = `${song_.title} — ${artistName} | Living Nexus`;
  const pageDesc = song_.genre
    ? `${song_.genre} · ${artistName}${song_.witnessId ? " · WID Verified" : ""} — Listen on Living Nexus`
    : `Listen to ${song_.title} by ${artistName} on Living Nexus`;
  const pageImage = song_.coverArtUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";
  const pageUrl = `https://www.livingnexus.org/song/${songId}`;
  const audioFileUrl = song_.fileUrl ? safeAudioUrl(song_.fileUrl) : undefined;
  const embedVideoUrl = (song_ as any).embedVideoUrl as string | undefined;
  const description = (song_ as any).description as string | undefined;
  const haaiOriginStory = (song_ as any).haaiOriginStory as string | undefined;
  const genres = song_.genre ? song_.genre.split(/[,/]/).map((g: string) => g.trim()).filter(Boolean) : [];
  const commentCount = comments?.length ?? 0;
  const witnessCount = 0; // populated by WitnessesPanel
  const manifestationCount = evidenceItems.length;

  // ── CSS custom properties for the archive page ────────────────────
  const archiveVars: React.CSSProperties = {
    "--ln-surface": "#12110F",
    "--ln-surface-2": "#181613",
    "--ln-text-1": "#F5F3EC",
    "--ln-text-2": "#C8C3B3",
    "--ln-text-3": "#8E8876",
    "--ln-border": "#2A271F",
  } as React.CSSProperties;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div
      className={`min-h-screen transition-all duration-700 cathedral-enter ${isThisTrackActive ? "harmonic-resonance" : ""}`}
      style={{ background: "var(--ln-void)", ...archiveVars }}
    >
      {/* ── Helmet ── */}
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
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
        <meta name="twitter:card" content={embedVideoUrl ? "player" : "summary_large_image"} />
        <meta name="twitter:site" content="@LivingNexus" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={pageImage} />
      </Helmet>

      {/* ── Sacred Canvas (z-index 100 — background texture) ── */}
      {creator?.id != null && <SacredCanvas seed={creator.id} parallax />}

      {/* ── Sticky mobile mini-header ── */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: "var(--wsp-top, 56px)", left: 0, right: 0,
          zIndex: 400, background: "rgba(5,5,4,0.97)", borderBottom: "1px solid #2A271F",
          backdropFilter: "blur(20px)",
          transform: headerCollapsed ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 4, overflow: "hidden", background: "#181613", flexShrink: 0 }}>
          {song_.coverArtUrl
            ? <img src={song_.coverArtUrl} alt={song_.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--ln-gold)" }}><Music size={18} /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "#F5F3EC", fontWeight: 600 }} className="truncate">{song_.title}</p>
          <p style={{ fontSize: 12, color: "#8E8876" }} className="truncate">{artistName}</p>
        </div>
        <button type="button" onClick={handlePlay}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.35)", color: "var(--ln-gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
           LOCKED 1280px CONTAINER
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px" }} ref={heroRef}>

        {/* ── Back nav ── */}
        <div style={{ paddingTop: 24, paddingBottom: 16 }}>
          <Link href={creator ? `/creator/${creator.id}` : "/"}>
            <button type="button" className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              style={{ color: "var(--ln-text-3)", fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: "0.06em" }}>
              <ChevronLeft size={14} />
              {creator?.artistHandle || creator?.name || "Back"}
            </button>
          </Link>
        </div>

        {/* ── Tip success banner ── */}
        {tipSuccess && (
          <div style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.3)", borderRadius: 2, padding: "20px 24px", marginBottom: 24, textAlign: "center" }}>
            <p style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)", marginBottom: 4 }}>Gift received — thank you!</p>
            <p style={{ fontSize: 13, color: "var(--ln-text-3)" }}>The creator receives 90% of your gift directly.</p>
            <button type="button" onClick={() => setTipSuccess(false)} style={{ marginTop: 8, fontSize: 11, color: "var(--ln-text-3)", background: "none", border: "none", cursor: "pointer" }}>Dismiss ✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
             B + C — HERO ROW: 6/12 Media | 6/12 Info
        ══════════════════════════════════════════════════════════════ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          border: "1px solid #2A271F",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 32,
        }}>
          {/* B — HERO MEDIA (6/12) */}
          <div style={{ position: "relative", aspectRatio: "1/1", background: "#12110F", borderRight: "1px solid #2A271F" }}>
            {song_.coverArtUrl ? (
              <img
                src={song_.coverArtUrl}
                alt={song_.title}
                style={{
                  width: "100%", height: "100%", objectFit: "cover",
                  objectPosition: `${song_.coverPositionX ?? 50}% ${song_.coverPositionY ?? 50}%`,
                  display: "block",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: "rgba(196,154,40,0.2)" }}>
                <Music size={64} />
              </div>
            )}
            {/* WID badge */}
            {song_.witnessId && (
              <div style={{
                position: "absolute", top: 16, left: 16,
                background: "rgba(5,5,4,0.85)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(196,154,40,0.35)", borderRadius: 2,
                padding: "4px 10px", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "'Cinzel', serif", fontSize: 11, color: "var(--ln-gold)", letterSpacing: "0.08em",
              }}>
                <ShieldCheck size={12} /> WID
              </div>
            )}
          </div>

          {/* C — HERO INFO (6/12) */}
          <div style={{ background: "#0B0A09", padding: "40px 40px 32px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Title */}
            <div>
              <h1 style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "clamp(1.6rem, 2.8vw, 2.4rem)",
                fontWeight: 700,
                color: "#F5F3EC",
                lineHeight: 1.2,
                letterSpacing: "0.02em",
                marginBottom: 12,
              }}>
                {song_.title}
              </h1>

              {/* Creator byline */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 15, color: "#C8C3B3" }}>by </span>
                <Link href={creator ? `/creator/${creator.id}` : "/"}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, color: "var(--ln-gold)", cursor: "pointer" }} className="hover:opacity-80 transition-opacity">
                    {artistName}
                  </span>
                </Link>
                {song_.witnessId && <ShieldCheck size={16} style={{ color: "var(--ln-gold)" }} />}
              </div>

              {/* Genre tags */}
              {genres.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
                  {genres.map((g: string) => (
                    <span key={g} style={{
                      background: "rgba(196,154,40,0.08)",
                      border: "1px solid rgba(196,154,40,0.25)",
                      borderRadius: 2,
                      padding: "4px 12px",
                      fontSize: 12,
                      fontFamily: "'Cinzel', serif",
                      color: "var(--ln-gold)",
                      letterSpacing: "0.04em",
                    }}>{g}</span>
                  ))}
                </div>
              )}

              {/* PLAY TRACK button */}
              {(song_.contentType !== "comic" && song_.contentType !== "manuscript") && (
                <button
                  type="button"
                  onClick={handlePlay}
                  style={{
                    width: "100%",
                    background: isThisTrackActive && isPlaying ? "var(--ln-gold-hot)" : "var(--ln-gold)",
                    color: "#050504",
                    border: "none",
                    borderRadius: 2,
                    padding: "16px 24px",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    marginBottom: 16,
                    transition: "background 0.2s",
                  }}
                >
                  {isThisTrackActive && isPlaying
                    ? <><Pause size={18} fill="currentColor" /> Pause</>
                    : <><Play size={18} fill="currentColor" style={{ marginLeft: 2 }} /> Play Track</>}
                </button>
              )}
              {(song_.contentType === "comic" || song_.contentType === "manuscript") && (
                <button type="button" onClick={handleReadNow}
                  style={{
                    width: "100%", background: "var(--ln-gold)", color: "#050504",
                    border: "none", borderRadius: 2, padding: "16px 24px",
                    fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 700,
                    letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16,
                  }}>
                  Read Now
                </button>
              )}

              {/* Action row */}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShareOpen(true)}
                  style={{ flex: 1, background: "transparent", border: "1px solid #2A271F", borderRadius: 2, padding: "10px", color: "#8E8876", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", transition: "border-color 0.2s" }}
                  className="hover:border-[#C49A28] hover:text-[#C49A28]">
                  <Share2 size={14} /> Share
                </button>
                {tipsEnabled && (
                  <button type="button" onClick={() => setTipOpen(true)}
                    style={{ flex: 1, background: "transparent", border: "1px solid #2A271F", borderRadius: 2, padding: "10px", color: "#8E8876", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", transition: "border-color 0.2s" }}
                    className="hover:border-[#C49A28] hover:text-[#C49A28]">
                    Gift
                  </button>
                )}
                <button type="button" onClick={() => toggleLike()}
                  style={{ flex: 1, background: isLiked ? "rgba(196,154,40,0.08)" : "transparent", border: isLiked ? "1px solid rgba(196,154,40,0.35)" : "1px solid #2A271F", borderRadius: 2, padding: "10px", color: isLiked ? "var(--ln-gold)" : "#8E8876", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", transition: "all 0.2s" }}>
                  <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {isOwner && (
                  <button type="button" onClick={() => setEditingOpen(true)}
                    style={{ background: "transparent", border: "1px solid #2A271F", borderRadius: 2, padding: "10px 14px", color: "#8E8876", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" }}
                    className="hover:border-[#C49A28] hover:text-[#C49A28]">
                    <Pencil size={14} />
                  </button>
                )}
                <button type="button" onClick={() => setVersionHistoryOpen(true)}
                  style={{ background: "transparent", border: "1px solid #2A271F", borderRadius: 2, padding: "10px 14px", color: "#8E8876", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color 0.2s" }}
                  className="hover:border-[#C49A28] hover:text-[#C49A28]">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 32, paddingTop: 24, borderTop: "1px solid #2A271F", marginTop: 24 }}>
              {[
                { label: "PLAYS", value: song_.playCount ?? 0 },
                { label: "VOICES", value: commentCount },
                { label: "LOVED", value: likeCount },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 700, color: "#F5F3EC" }}>{stat.value}</p>
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: "#8E8876", letterSpacing: "0.1em", marginTop: 4 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
             D — ABOUT THIS WORK (full width)
        ══════════════════════════════════════════════════════════════ */}
        {(description || haaiOriginStory || song_.lyricsText) && (
          <div style={{
            background: "#12110F",
            border: "1px solid #2A271F",
            borderRadius: 2,
            padding: "28px 32px",
            marginBottom: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              {/* Quill icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ln-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 3C20 3 14 5 12 12C10 19 4 21 4 21C4 21 10 19 12 12C14 5 20 3 20 3Z"/>
                <path d="M12 12L8 16"/>
              </svg>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: "#8E8876", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                About This Work
              </span>
              <span style={{ fontSize: 11, color: "#8E8876", marginLeft: 4 }}>(Full width)</span>
            </div>
            <p style={{ fontSize: 16, color: "#C8C3B3", lineHeight: 1.75, maxWidth: 900 }}>
              {description || haaiOriginStory || song_.lyricsText}
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
             E — PROVENANCE TIMELINE (full width)
        ══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: "#12110F",
          border: "1px solid #2A271F",
          borderRadius: 2,
          padding: "28px 32px",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ShieldCheck size={18} style={{ color: "var(--ln-gold)" }} />
              <div>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: "#8E8876", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  E. Provenance Timeline
                </span>
                <span style={{ fontSize: 11, color: "#8E8876", marginLeft: 8 }}>(Full width)</span>
                <p style={{ fontSize: 13, color: "#8E8876", marginTop: 2 }}>Immutable record of origin and journey.</p>
              </div>
            </div>
            <button type="button" onClick={() => setVersionHistoryOpen(true)}
              style={{ fontSize: 12, color: "var(--ln-gold)", background: "none", border: "none", cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 6 }}
              className="hover:opacity-80 transition-opacity">
              View Full Timeline →
            </button>
          </div>
          <SchematicProvenanceTimeline events={eventThread ?? []} />
        </div>

        {/* ══════════════════════════════════════════════════════════════
             F–I — ACCORDION MODULES
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>

          {/* F — Manifestations */}
          <AccordionModule
            icon={<Layers size={18} />}
            label="F. Manifestations"
            description="Different releases, versions, and formats of this work."
            count={manifestationCount}
          >
            <EvidencePanel
              songId={song_.id}
              isOwner={isOwner}
              manifestation={{
                title: song_.title,
                fileUrl: song_.fileUrl ?? null,
                coverArtUrl: song_.coverArtUrl ?? null,
                contentType: song_.contentType ?? "audio",
                witnessId: song_.witnessId ?? null,
              }}
              onPlay={handlePlay}
              onOpenReader={handleReadNow}
            />
          </AccordionModule>

          {/* G — Witnesses */}
          <AccordionModule
            icon={<Users size={18} />}
            label="G. Witnesses"
            description="Those who have witnessed and verified this work."
            count={0}
          >
            <WitnessesPanel songId={song_.id} ownerId={creator?.id ?? 0} />
          </AccordionModule>

          {/* H — Comments */}
          <AccordionModule
            icon={<MessageSquare size={18} />}
            label="H. Comments"
            description="Community reflections and discussions."
            count={commentCount}
            defaultOpen={commentCount > 0}
          >
            <CommentsSection
              comments={comments}
              songId={song_.id}
              user={user}
              commentText={commentText}
              setCommentText={setCommentText}
              commentMutation={commentMutation}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              replyMutation={replyMutation}
            />
          </AccordionModule>

          {/* I — Technical Metadata */}
          <AccordionModule
            icon={<FileText size={18} />}
            label="I. Technical Metadata"
            description="File details, audio specs, and technical information."
            locked
          >
            <TechnicalMetadata song={song_} />
          </AccordionModule>

        </div>

        {/* ══════════════════════════════════════════════════════════════
             J — FOOTER BAND — Chain of Witness
        ══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: "#12110F",
          border: "1px solid #2A271F",
          borderRadius: 2,
          padding: "48px 40px",
          marginBottom: 48,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 40,
          alignItems: "center",
        }}>
          {/* Left: text */}
          <div>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: "#8E8876", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
              This work is part of
            </p>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(1.2rem, 2vw, 1.8rem)", fontWeight: 700, color: "#F5F3EC", lineHeight: 1.2, marginBottom: 20 }}>
              The Living Nexus<br />Chain of Witness
            </h2>
            <Link href="/about">
              <button type="button" style={{
                background: "transparent",
                border: "1px solid var(--ln-gold)",
                borderRadius: 2,
                padding: "10px 20px",
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ln-gold)",
                letterSpacing: "0.08em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "background 0.2s",
              }} className="hover:bg-[rgba(196,154,40,0.08)]">
                Learn More →
              </button>
            </Link>
          </div>

          {/* Center: LN seal */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: 120, height: 120,
              borderRadius: "50%",
              border: "2px solid rgba(196,154,40,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(196,154,40,0.04)",
            }}>
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png"
                alt="Living Nexus"
                style={{ width: 72, height: 72, objectFit: "contain", opacity: 0.8 }}
              />
            </div>
          </div>

          {/* Right: tagline */}
          <div style={{ textAlign: "right" }}>
            {["EVERY WORK.", "EVERY WITNESS.", "EVERY LINK.", "PRESERVED FOREVER."].map(line => (
              <p key={line} style={{ fontFamily: "'Cinzel', serif", fontSize: "clamp(0.9rem, 1.4vw, 1.2rem)", fontWeight: 700, color: "#C8C3B3", lineHeight: 1.8, letterSpacing: "0.04em" }}>
                {line}
              </p>
            ))}
          </div>
        </div>

      </div>{/* end 1280px container */}

      {/* ══════════════════════════════════════════════════════════════
           MODALS
      ══════════════════════════════════════════════════════════════ */}

      {/* Gift Modal */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent style={{ background: "#0B0A09", border: "1px solid #2A271F", maxHeight: "min(90dvh, 90vh)", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "#F5F3EC" }}>
              Gift {artistName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p style={{ fontSize: 14, color: "#8E8876" }}>90% goes directly to the artist. 10% supports Living Nexus.</p>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(amt => (
                <button type="button" key={amt} onClick={() => setTipAmount(amt)}
                  style={{ background: tipAmount === amt ? "var(--ln-gold)" : "#12110F", color: tipAmount === amt ? "#050504" : "#F5F3EC", border: "1px solid #2A271F", borderRadius: 2, padding: "10px", fontSize: 14, fontFamily: "'Cinzel', serif", cursor: "pointer" }}>
                  ${amt}
                </button>
              ))}
            </div>
            <Input type="number" placeholder="Custom amount ($)" value={tipAmount} onChange={e => setTipAmount(e.target.value)} min="1" step="0.01"
              style={{ background: "#12110F", border: "1px solid #2A271F", color: "#F5F3EC" }} />
            <Button className="w-full" onClick={handleTip} disabled={tipMutation.isPending}
              style={{ background: "var(--ln-gold)", color: "#050504", fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}>
              {tipMutation.isPending ? "Processing..." : `Send $${tipAmount || "0"} Gift`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Modal */}
      {song_ && (
        <VersionHistoryModal
          songId={song_.id}
          songTitle={song_.title}
          isOwner={isOwner}
          open={versionHistoryOpen}
          onClose={() => setVersionHistoryOpen(false)}
        />
      )}

      {/* Comic / Manuscript Reader Overlay */}
      {readerOpen && song_ && (() => {
        const pages: BookPage[] = (() => {
          try { return (song_ as any).pagesJson ? JSON.parse((song_ as any).pagesJson) : []; } catch { return []; }
        })();
        if (pages.length === 0) return null;
        return (
          <div className="fixed inset-0 z-[600]">
            <CinematicComicReader pages={pages} title={song_.title} onClose={() => setReaderOpen(false)} />
          </div>
        );
      })()}

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent style={{ background: "#0B0A09", border: "1px solid #2A271F", maxWidth: 480, maxHeight: "min(90dvh, 90vh)", overflowY: "auto", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "#F5F3EC" }}>Share Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={window.location.href} readOnly style={{ background: "#12110F", border: "1px solid #2A271F", color: "#8E8876", fontSize: 12 }} />
              <Button onClick={copyLink} style={{ background: "var(--ln-gold)", color: "#050504", flexShrink: 0 }}>
                <Copy size={16} />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Listening to "${song_.title}" on Living Nexus`)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noreferrer" className="block">
                <Button variant="outline" className="w-full" style={{ borderColor: "#2A271F", color: "#8E8876" }}>
                  <Twitter size={16} className="mr-2" />Share on X
                </Button>
              </a>
              <Button variant="outline" className="w-full" style={{ borderColor: "#2A271F", color: "#8E8876" }}
                onClick={() => {
                  navigator.clipboard.writeText(`${song_.title} — ${artistName} | ${window.location.href}`);
                  toast.success("Discord message copied!");
                  setShareOpen(false);
                }}>
                Copy for Discord
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Creative Drawer */}
      {(editingOpen || drawerOpen) && song_ && (
        <ErrorBoundary inline>
          <CreativeDrawer
            song={{
              id: song_.id, title: song_.title, genre: song_.genre ?? null,
              caption: (song_ as any).caption ?? null, coverArtUrl: song_.coverArtUrl ?? null,
              aiConsent: (song_ as any).aiConsent ?? null, status: (song_ as any).status ?? "Published",
              lyricsText: song_.lyricsText ?? null, haaiOriginStory: (song_ as any).haaiOriginStory ?? null,
              aiDisclosure: (song_ as any).aiDisclosure ?? null, contentType: (song_ as any).contentType ?? "audio",
              releaseDate: (song_ as any).releaseDate ?? null, description: (song_ as any).description ?? null,
              witnessId: song_.witnessId ?? null, videoUrl: (song_ as any).videoUrl ?? null,
              videoWitnessId: (song_ as any).videoWitnessId ?? null,
              externalLinksJson: (song_ as any).externalLinksJson ?? null,
              downloadPermission: (song_ as any).downloadPermission ?? null,
              downloadTipThresholdCents: (song_ as any).downloadTipThresholdCents ?? null,
            }}
            onClose={handleEditClose}
            onSaved={handleEditSaved}
          />
        </ErrorBoundary>
      )}

    </div>
  );
}
