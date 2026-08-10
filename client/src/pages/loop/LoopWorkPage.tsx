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
import { LOOP_PRODUCT } from "@/lib/loopProduct";
import { trpc } from "@/lib/trpc";

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

  const song = songData?.song;
  const creator = songData?.creator;

  useEffect(() => {
    if (songId > 0) playMutation.mutate({ songId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

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
    <div className="min-h-screen relative">
      <Helmet>
        <title>{`${song.title} — ${LOOP_PRODUCT.fullName}`}</title>
        <meta name="description" content={origin?.slice(0, 160) || `${song.title} by ${artistName}`} />
        <meta property="og:title" content={song.title} />
        <meta property="og:image" content={cover || ""} />
      </Helmet>

      {/* Full-bleed hero plane */}
      <section className="relative min-h-[88vh] flex flex-col justify-end overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: cover
              ? `url(${cover})`
              : "linear-gradient(135deg, #1a1408 0%, #000 55%, #050505 100%)",
            backgroundSize: "cover",
            backgroundPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%`,
            transform: "scale(1.04)",
            animation: "loopKen 18s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.92) 78%, #000 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 70% 30%, rgba(196,154,40,0.12), transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-14 pt-28">
          <p
            className="text-[11px] uppercase tracking-[0.32em] mb-4"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            {LOOP_PRODUCT.name}
          </p>
          <h1
            className="text-4xl sm:text-6xl md:text-7xl leading-[0.95] mb-4 max-w-4xl"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            {song.title}
          </h1>
          <p
            className="text-lg sm:text-xl mb-8 max-w-xl"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: "rgba(237,229,208,0.78)",
            }}
          >
            {origin
              ? origin.slice(0, 140) + (origin.length > 140 ? "…" : "")
              : `Registered music by ${artistName}. Provenance sealed in the WID engine.`}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: "var(--ln-gold)", color: "#0A0806" }}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isPlaying ? "Pause" : "Listen"}
            </button>
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
                color: liked ? "var(--ln-gold)" : "rgba(237,229,208,0.7)",
              }}
              aria-label="Like"
            >
              <Heart size={16} fill={liked ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={share}
              className="p-3 rounded-full"
              style={{ border: "1px solid rgba(196,154,40,0.25)", color: "rgba(237,229,208,0.7)" }}
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

      {/* Provenance + creator */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-12">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
            >
              Provenance
            </p>
            <h2
              className="text-2xl sm:text-3xl mb-4"
              style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
            >
              Chain of record
            </h2>
            {wid ? (
              <div
                className="flex flex-wrap items-center gap-3 mb-6 py-4"
                style={{ borderTop: "1px solid rgba(196,154,40,0.2)", borderBottom: "1px solid rgba(196,154,40,0.2)" }}
              >
                <ShieldCheck size={18} style={{ color: "#4ADE80" }} />
                <code className="font-mono text-sm sm:text-base" style={{ color: "var(--ln-gold)" }}>
                  {wid}
                </code>
                <button type="button" onClick={copyWid} className="p-1.5 opacity-70 hover:opacity-100" aria-label="Copy WID">
                  <Copy size={14} style={{ color: "var(--ln-parchment)" }} />
                </button>
                <Link href={`/verify/${wid}`} className="text-xs underline" style={{ color: "rgba(237,229,208,0.6)" }}>
                  Verify
                </Link>
              </div>
            ) : (
              <p className="mb-6 text-sm" style={{ color: "rgba(237,229,208,0.5)" }}>
                WID pending — register completion seals this work.
              </p>
            )}
            {origin && (
              <blockquote
                className="text-xl sm:text-2xl leading-relaxed"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "rgba(237,229,208,0.88)",
                  borderLeft: "2px solid rgba(196,154,40,0.45)",
                  paddingLeft: 16,
                }}
              >
                {origin}
              </blockquote>
            )}
            {(song.genre || song.bpm) && (
              <div className="flex flex-wrap gap-4 mt-8 text-xs uppercase tracking-[0.14em]" style={{ color: "rgba(237,229,208,0.45)" }}>
                {song.genre && <span>{song.genre}</span>}
                {song.bpm && <span>{song.bpm} BPM</span>}
              </div>
            )}
            {song.lyricsText && (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => setShowLyrics((v) => !v)}
                  className="text-[11px] uppercase tracking-[0.18em] mb-3"
                  style={{ color: "var(--ln-gold)" }}
                >
                  {showLyrics ? "Hide lyrics" : "Show lyrics"}
                </button>
                {showLyrics && (
                  <pre
                    className="whitespace-pre-wrap text-sm leading-relaxed"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "rgba(237,229,208,0.75)",
                      fontSize: 17,
                    }}
                  >
                    {song.lyricsText}
                  </pre>
                )}
              </div>
            )}
          </div>

          <aside>
            <p
              className="text-[11px] uppercase tracking-[0.22em] mb-3"
              style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
            >
              Creator
            </p>
            <Link href={creator?.id ? `/creator/${creator.id}` : "#"}>
              <div className="flex items-center gap-4 mb-4 group">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                  style={{ outline: "1px solid rgba(196,154,40,0.35)" }}
                >
                  {creator?.profilePhotoUrl ? (
                    <img src={creator.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-xl"
                      style={{ background: "#111", color: "var(--ln-gold)" }}
                    >
                      {(artistName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div
                    className="text-xl group-hover:underline"
                    style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                  >
                    {artistName}
                  </div>
                  {creator?.artistHandle && (
                    <div className="text-sm" style={{ color: "rgba(237,229,208,0.5)" }}>
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
                className="w-full py-3 rounded-full text-sm font-semibold"
                style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.35)", color: "var(--ln-gold)" }}
              >
                Support {artistName}
              </button>
            )}
          </aside>
        </div>
      </section>

      {/* Related works */}
      {related.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-28">
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
                    <p className="text-sm truncate" style={{ color: "rgba(237,229,208,0.5)" }}>
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

      <style>{`
        @keyframes loopKen {
          from { transform: scale(1.02); }
          to { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
