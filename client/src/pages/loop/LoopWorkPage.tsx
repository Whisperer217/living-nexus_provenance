/**
 * Loop Work — Music provenance work surface
 * Product flow: listen → provenance → creator → support
 * Hero budget: brand, title, one line, CTAs, dominant cover art.
 */

import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "wouter";
import {
  Copy,
  DollarSign,
  Download,
  Heart,
  Loader2,
  Music,
  Pause,
  Pencil,
  Play,
  Share2,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { SupportCreatorDrawer } from "@/components/SupportCreatorDrawer";
import { usePlayer } from "@/contexts/PlayerContext";
import { useWorkEditorActions } from "@/contexts/WorkEditorContext";
import { useLike } from "@/hooks/useLike";
import { useHarmonicSignature } from "@/hooks/useHarmonicSignature";
import { LOOP_PRODUCT } from "@/lib/loopProduct";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

export default function LoopWorkPage() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id || "0", 10);
  const { user } = useAuth();
  const { addAndPlay, togglePlay, state: playerState, currentTrackId } = usePlayer();
  const { openEditor } = useWorkEditorActions();
  const [supportOpen, setSupportOpen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  const { data: songData, isLoading, isError } = trpc.songs.getById.useQuery(
    { id: songId },
    { enabled: songId > 0, staleTime: 30_000 }
  );
  const { data: relatedData } = trpc.songs.getRelated.useQuery(
    { songId, genre: (songData as any)?.song?.genre ?? undefined },
    { enabled: songId > 0, staleTime: 60_000 }
  );
  const playMutation = trpc.songs.play.useMutation();
  const { liked, toggle: toggleLike } = useLike(songId);

  const deliverDownload = (data: any) => {
    if (!data?.url) return;
    const a = document.createElement("a");
    a.href = data.url;
    a.download = data.filename || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: deliverDownload,
  });
  const tipDownloadMutation = trpc.tips.createTipDownloadCheckout.useMutation({
    onSuccess: (data: any) => {
      if (data?.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message || "Checkout unavailable"),
  });

  const song = songData?.song;
  const creator = songData?.creator;
  const widForBreath = (song?.witnessId as string | null | undefined) ?? null;
  const breath = useHarmonicSignature(widForBreath, null);

  const stripDownloadReturnFlag = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("download");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const runFreeDownload = async () => {
    try {
      await downloadMutation.mutateAsync({ songId });
    } catch (err: any) {
      toast.error(err?.message || "Download unavailable");
    }
  };

  const runPaidDownload = async () => {
    try {
      // Already-unlocked supporters download immediately instead of paying twice.
      await downloadMutation.mutateAsync({ songId });
    } catch (err: any) {
      const code = err?.data?.code ?? err?.shape?.data?.code;
      if (code !== "FORBIDDEN") {
        toast.error(err?.message || "Download unavailable");
        return;
      }
      tipDownloadMutation.mutate({ songId, origin: window.location.origin });
    }
  };

  useEffect(() => {
    if (songId > 0) playMutation.mutate({ songId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  useEffect(() => {
    if (!song || !user || new URLSearchParams(window.location.search).get("download") !== "unlocked") {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const claimDownload = async () => {
      try {
        await downloadMutation.mutateAsync({ songId: song.id });
        if (!cancelled) stripDownloadReturnFlag();
      } catch {
        attempt += 1;
        if (!cancelled && attempt < 4) {
          // Stripe webhook delivery can trail the browser redirect briefly.
          timer = setTimeout(claimDownload, 1200 * attempt);
        } else if (!cancelled) {
          stripDownloadReturnFlag();
          toast.info("Payment received. Click Download again if the file did not begin.");
        }
      }
    };

    void claimDownload();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // Mutations are intentionally excluded; this is a one-time checkout return handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id, user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  if (isError || !songData || !song) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Work not found
          </h1>
          <Link href="/explore" className="text-sm" style={{ color: "var(--ln-gold)" }}>
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  if ((song as any).status === "Deleted") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Work removed
          </h1>
          {song.witnessId && (
            <p className="font-mono text-xs mb-4" style={{ color: "var(--ln-gold)" }}>
              {song.witnessId}
            </p>
          )}
          <Link href="/explore" className="text-sm" style={{ color: "var(--ln-gold)" }}>
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = !!user && !!creator && user.id === creator.id;
  const isThisTrack = currentTrackId === String(songId);
  const isPlaying = isThisTrack && playerState.isPlaying;
  const artistName = creator?.artistHandle || creator?.name || "Unknown creator";
  const cover = song.coverArtUrl;
  const audioUrl = song.fileUrl || "";
  const origin = song.haaiOriginStory || song.description || song.caption || "";
  const wid = song.witnessId as string | null;

  const handlePlay = () => {
    if (isThisTrack) {
      togglePlay();
      return;
    }
    if (!audioUrl) {
      toast.error("No audio available for this work");
      return;
    }
    addAndPlay({
      id: String(song.id),
      title: song.title,
      artist: artistName,
      genre: song.genre || "",
      artUrl: cover || undefined,
      audioUrl,
      witnessId: wid || undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
      creatorHandle: creator?.artistHandle || undefined,
      downloadPermission: (song as any).downloadPermission ?? null,
      downloadTipThresholdCents: (song as any).downloadTipThresholdCents ?? null,
    });
  };

  const copyWid = () => {
    if (!wid) return;
    navigator.clipboard.writeText(wid);
    toast.success("WID copied");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: song.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  const related = (relatedData ?? []) as any[];

  return (
    <div
      className={`min-h-screen relative ln-breath-shell ${isPlaying ? "ln-breath-edge--playing" : "ln-breath-edge"}`}
      style={{
        ["--ln-breath-hue" as string]: breath.hue.toFixed(1),
        ["--ln-breath-sat" as string]: breath.saturation.toFixed(1),
      }}
    >
      <Helmet>
        <title>{`${song.title} — ${LOOP_PRODUCT.fullName}`}</title>
        <meta name="description" content={origin?.slice(0, 160) || `${song.title} by ${artistName}`} />
        <meta property="og:title" content={song.title} />
        <meta property="og:image" content={cover || ""} />
      </Helmet>

      {/* Full-bleed hero plane */}
      <section className="relative min-h-[88vh] flex flex-col justify-end overflow-hidden">
        <div
          className={`absolute inset-0 ln-breath-ken ${isPlaying ? "ln-breath-ken--playing" : ""}`}
          style={{
            backgroundImage: cover
              ? `url(${cover})`
              : "linear-gradient(135deg, #1a1408 0%, #000 55%, #050505 100%)",
            backgroundSize: "cover",
            backgroundPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.48) 38%, rgba(0,0,0,0.88) 76%, #000 100%)",
          }}
        />
        <div
          className={`absolute inset-0 pointer-events-none ln-breath-plane ${isPlaying ? "ln-breath-plane--playing" : ""}`}
          aria-hidden
        />

        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-14 pt-28">
          <p
            className="text-[11px] uppercase tracking-[0.32em] mb-4 ln-breath-reveal"
            style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}
          >
            {LOOP_PRODUCT.name}
          </p>
          <h1
            className="text-4xl sm:text-6xl md:text-7xl leading-[0.95] mb-4 max-w-4xl ln-breath-reveal ln-breath-reveal-d1"
            style={{
              fontFamily: "'Cinzel', serif",
              color: "var(--ln-parchment)",
              textShadow: "0 2px 32px rgba(0,0,0,0.55)",
            }}
          >
            {song.title}
          </h1>
          <p
            className="font-body text-lg sm:text-xl mb-8 max-w-xl ln-breath-reveal ln-breath-reveal-d2"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: "color-mix(in srgb, var(--ln-parchment) 88%, transparent)",
            }}
          >
            {/* Hero keeps a compact teaser only — full origin lives in Testimony column */}
            {origin
              ? origin.slice(0, 140) + (origin.length > 140 ? "…" : "")
              : `Registered music by ${artistName}. Provenance sealed in the WID engine.`}
          </p>

          <div className="flex flex-wrap items-center gap-3 ln-breath-reveal ln-breath-reveal-d3">
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: "var(--ln-gold)", color: "#0A0806" }}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isPlaying ? "Pause" : "Listen"}
            </button>
            {(() => {
              const dlPerm = (song as any).downloadPermission as string | undefined;
              const tipCents = ((song as any).downloadTipThresholdCents as number | undefined) ?? 179;
              if (!dlPerm || dlPerm === "none") return null;
              if (dlPerm === "free") {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        window.location.href = getLoginUrl();
                        return;
                      }
                      void runFreeDownload();
                    }}
                    disabled={downloadMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm"
                    style={{
                      border: "1px solid rgba(34,197,94,0.45)",
                      color: "rgba(74,222,128,0.95)",
                      background: "rgba(34,197,94,0.08)",
                    }}
                  >
                    <Download size={15} />
                    {downloadMutation.isPending ? "…" : "Free Download"}
                  </button>
                );
              }
              if (dlPerm === "tipped") {
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        window.location.href = getLoginUrl();
                        return;
                      }
                      void runPaidDownload();
                    }}
                    disabled={tipDownloadMutation.isPending}
                    title={`Gift $${(tipCents / 100).toFixed(2)} to unlock download`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold"
                    style={{
                      border: "1px solid rgba(196,154,40,0.55)",
                      color: "var(--ln-gold-hot, var(--ln-gold))",
                      background: "rgba(196,154,40,0.12)",
                      boxShadow: "0 0 22px rgba(196,154,40,0.12)",
                    }}
                  >
                    <Download size={15} />
                    {tipDownloadMutation.isPending
                      ? "Opening checkout…"
                      : `Download — $${(tipCents / 100).toFixed(2)}`}
                  </button>
                );
              }
              return null;
            })()}
            {creator?.id && (
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm"
                style={{
                  border: "1px solid rgba(196,154,40,0.4)",
                  color: "var(--ln-parchment)",
                  background: "rgba(0,0,0,0.35)",
                }}
              >
                <DollarSign size={15} /> Support
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleLike()}
              className="p-3 rounded-full"
              style={{
                border: "1px solid rgba(196,154,40,0.25)",
                color: liked ? "var(--ln-gold)" : "color-mix(in srgb, var(--ln-parchment) 70%, transparent)",
              }}
              aria-label="Like"
            >
              <Heart size={16} fill={liked ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={share}
              className="p-3 rounded-full"
              style={{ border: "1px solid rgba(196,154,40,0.25)", color: "color-mix(in srgb, var(--ln-parchment) 70%, transparent)" }}
              aria-label="Share"
            >
              <Share2 size={16} />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() =>
                  openEditor({
                    id: song.id,
                    title: song.title,
                    genre: song.genre ?? null,
                    caption: song.caption ?? null,
                    coverArtUrl: song.coverArtUrl ?? null,
                    aiConsent: song.aiConsent ?? null,
                    status: song.status ?? "Published",
                    lyricsText: song.lyricsText ?? null,
                    haaiOriginStory: song.haaiOriginStory ?? null,
                    aiDisclosure: song.aiDisclosure ?? null,
                    contentType: "audio",
                    releaseDate: song.releaseDate ?? null,
                    description: song.description ?? null,
                    witnessId: song.witnessId ?? null,
                    videoUrl: null,
                    videoWitnessId: null,
                    externalLinksJson: song.externalLinksJson ?? null,
                    downloadPermission: song.downloadPermission ?? null,
                    downloadTipThresholdCents: song.downloadTipThresholdCents ?? null,
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm"
                style={{ color: "var(--ln-gold)" }}
              >
                <Pencil size={14} /> Edit
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Three columns: Testimony | Provenance | Creator */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 ln-breath-reveal ln-breath-reveal-d4">
        <div className="ln-breath-accent-line mb-10" aria-hidden />
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr_0.9fr] lg:gap-8 xl:gap-12">
          {/* ── Left: Testimony (kept) ── */}
          <div>
            <p
              className="font-heading text-[11px] uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}
            >
              Testimony
            </p>
            <h2
              className="font-heading text-2xl sm:text-3xl mb-6"
              style={{ color: "var(--ln-parchment)" }}
            >
              Origin
            </h2>
            {origin ? (
              <blockquote
                className="font-body text-xl sm:text-2xl leading-relaxed ln-breath-rule"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "color-mix(in srgb, var(--ln-parchment) 92%, transparent)",
                  borderLeft: `2px solid hsla(${breath.hue.toFixed(1)}, 65%, 55%, 0.65)`,
                  paddingLeft: 16,
                }}
              >
                {origin}
              </blockquote>
            ) : (
              <p className="font-body text-base" style={{ color: "color-mix(in srgb, var(--ln-parchment) 50%, transparent)" }}>
                No origin testimony recorded for this work yet.
              </p>
            )}
            {(song.genre || song.bpm) && (
              <div
                className="flex flex-wrap gap-4 mt-8 text-xs uppercase tracking-[0.14em]"
                style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}
              >
                {song.genre && <span>{song.genre}</span>}
                {song.bpm && <span>{song.bpm} BPM</span>}
              </div>
            )}
          </div>

          {/* ── Center: Chain of record ── */}
          <div>
            <p
              className="font-heading text-[11px] uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}
            >
              Provenance
            </p>
            <h2
              className="font-heading text-2xl sm:text-3xl mb-4"
              style={{ color: "var(--ln-parchment)" }}
            >
              Chain of record
            </h2>
            {wid ? (
              <div
                className="flex flex-wrap items-center gap-3 mb-6 py-4"
                style={{ borderTop: "1px solid rgba(196,154,40,0.2)", borderBottom: "1px solid rgba(196,154,40,0.2)" }}
              >
                <ShieldCheck size={18} style={{ color: "#4ADE80" }} />
                <code className="font-mono text-sm" style={{ color: "var(--ln-gold)" }}>
                  {wid}
                </code>
                <button type="button" onClick={copyWid} className="p-1.5 opacity-70 hover:opacity-100" aria-label="Copy WID">
                  <Copy size={14} style={{ color: "var(--ln-parchment)" }} />
                </button>
                <Link href={`/verify/${wid}`} className="text-xs underline" style={{ color: "color-mix(in srgb, var(--ln-parchment) 60%, transparent)" }}>
                  Verify
                </Link>
              </div>
            ) : (
              <p className="mb-6 text-sm font-body" style={{ color: "color-mix(in srgb, var(--ln-parchment) 50%, transparent)" }}>
                WID pending — register completion seals this work.
              </p>
            )}

            <div
              className="flex flex-wrap gap-4 mb-6 text-xs uppercase tracking-[0.12em]"
              style={{ color: "color-mix(in srgb, var(--ln-parchment) 70%, transparent)" }}
            >
              <span>Music · {(song as any).participationMusic ?? "—"}</span>
              <span>Lyrics · {(song as any).participationLyrics ?? "—"}</span>
              <span>Voice · {(song as any).participationVoice ?? "—"}</span>
            </div>

            {(() => {
              let toneLabel = "";
              try {
                const tp = (song as any).toneProfileJson ? JSON.parse((song as any).toneProfileJson) : null;
                toneLabel = tp?.label || "";
              } catch { /* ignore */ }
              return toneLabel ? (
                <p className="mb-4 text-sm" style={{ color: "var(--ln-gold)" }}>
                  Tone · {toneLabel}
                </p>
              ) : null;
            })()}

            {(song as any).waveformUrl && (
              <a
                href={(song as any).waveformUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
                style={{ color: "color-mix(in srgb, var(--ln-parchment) 75%, transparent)" }}
              >
                Download waveform
              </a>
            )}
          </div>

          {/* ── Right: Creator tab + Support + Share + Lyrics ── */}
          <aside
            className="rounded-2xl p-5 h-fit"
            style={{
              background: "color-mix(in srgb, var(--ln-obsidian) 92%, transparent)",
              border: "1px solid var(--ln-panel-border)",
            }}
          >
            <p
              className="font-heading text-[11px] uppercase tracking-[0.22em] mb-4"
              style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}
            >
              Creator
            </p>
            <Link href={creator?.id ? `/creator/${creator.id}` : "#"}>
              <div className="flex items-center gap-3 mb-5 group">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                  style={{ outline: "1px solid rgba(196,154,40,0.35)" }}
                >
                  {creator?.profilePhotoUrl ? (
                    <img src={creator.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-lg"
                      style={{ background: "var(--ln-void)", color: "var(--ln-gold)" }}
                    >
                      {(artistName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className="font-heading text-lg truncate group-hover:underline"
                    style={{ color: "var(--ln-parchment)" }}
                  >
                    {artistName}
                  </div>
                  {creator?.artistHandle && (
                    <div className="text-sm truncate" style={{ color: "var(--ln-smoke)" }}>
                      @{creator.artistHandle}
                    </div>
                  )}
                </div>
              </div>
            </Link>

            {creator?.id && (
              <button
                type="button"
                onClick={() => setSupportOpen(true)}
                className="font-heading w-full py-3 rounded-full text-sm mb-3"
                style={{
                  background: "rgba(196,154,40,0.12)",
                  border: "1px solid rgba(196,154,40,0.35)",
                  color: "var(--ln-gold)",
                }}
              >
                Support {artistName}
              </button>
            )}

            {creator?.id && (
              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/creator/${creator.artistHandle || creator.id}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Creator link copied");
                  } catch {
                    toast.error("Could not copy link");
                  }
                }}
                className="font-heading w-full py-2.5 rounded-full text-xs mb-5 inline-flex items-center justify-center gap-2"
                style={{
                  border: "1px solid color-mix(in srgb, var(--ln-parchment) 14%, transparent)",
                  color: "color-mix(in srgb, var(--ln-parchment) 75%, transparent)",
                }}
              >
                <Share2 size={12} /> Share creator
              </button>
            )}

            {song.lyricsText && (
              <div
                className="pt-4"
                style={{ borderTop: "1px solid color-mix(in srgb, var(--ln-gold) 18%, transparent)" }}
              >
                <button
                  type="button"
                  onClick={() => setShowLyrics((v) => !v)}
                  className="font-heading text-[11px] uppercase tracking-[0.18em] mb-3 w-full text-left flex items-center justify-between"
                  style={{ color: "var(--ln-gold)" }}
                >
                  <span>{showLyrics ? "Hide lyrics" : "Lyrics"}</span>
                  <span style={{ opacity: 0.7 }}>{showLyrics ? "−" : "+"}</span>
                </button>
                {showLyrics && (
                  <pre
                    className="whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto"
                    style={{
                      fontFamily: "var(--font-editorial, 'Cormorant Garamond', serif)",
                      color: "color-mix(in srgb, var(--ln-parchment) 75%, transparent)",
                      fontSize: 15,
                    }}
                  >
                    {song.lyricsText}
                  </pre>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Related works */}
      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-28">
          <p
            className="text-[11px] uppercase tracking-[0.22em] mb-3"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            More from the registry
          </p>
          <h2
            className="text-2xl mb-8"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            Related works
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((item: any) => {
              const rSong = item.song ?? item;
              const rCreator = item.creator;
              return (
                <Link key={rSong.id} href={`/song/${rSong.id}`}>
                  <article className="group">
                    <div
                      className="aspect-square mb-3 overflow-hidden"
                      style={{ background: "#111" }}
                    >
                      {rSong.coverArtUrl ? (
                        <img
                          src={rSong.coverArtUrl}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music style={{ color: "var(--ln-gold)", opacity: 0.4 }} />
                        </div>
                      )}
                    </div>
                    <h3
                      className="truncate"
                      style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                    >
                      {rSong.title}
                    </h3>
                    <p className="text-sm truncate" style={{ color: "color-mix(in srgb, var(--ln-parchment) 50%, transparent)" }}>
                      {rCreator?.artistHandle || rCreator?.name || ""}
                    </p>
                    {rSong.witnessId && (
                      <p className="font-mono text-[10px] mt-1 truncate" style={{ color: "var(--ln-gold)" }}>
                        <Shield size={9} className="inline mr-1" />
                        {rSong.witnessId}
                      </p>
                    )}
                  </article>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <SupportCreatorDrawer
        target={
          supportOpen && creator
            ? {
                songId: song.id,
                songTitle: song.title,
                songWid: wid,
                creatorId: creator.id,
                creatorName: artistName,
                creatorHandle: creator.artistHandle,
                coverArtUrl: cover,
                contentType: "audio",
                stripeAccountStatus: creator.stripeAccountStatus,
              }
            : null
        }
        onClose={() => setSupportOpen(false)}
      />
    </div>
  );
}
