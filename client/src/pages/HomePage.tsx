/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — HomePage v3
   Layout hierarchy:
     1. Hero — emotional headline + CTAs
     2. Founder's Era block
     3. WID Trust Layer — counter + Witnessed Voices (8 panels, 2×4 grid)
     4. Featured Creators — horizontal panning carousel
     5. Genre filters
     6. Discover Tracks — side-pane horizontal scroll (2 rows × 12)
     7. Trending Now — side-pane horizontal scroll (2 rows × 12)
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import TrackCard from "@/components/TrackCard";
import BookCard from "@/components/BookCard";
import TipModal from "@/components/TipModal";
import { CARD_PAN_W } from "@/lib/cardTokens";
import { Sparkles, ShieldCheck, Upload, Compass, Star, Lock, Fingerprint, Shield, Users, Play, Heart, DollarSign, Cpu, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { WIDPanel } from "@/components/WIDPanel";
import FeaturedProjectsCarousel from "@/components/FeaturedProjectsCarousel";
import { WorkCarousel } from "@/components/WorkCarousel";
import { CosmicMediumIcon } from "@/components/CosmicMediumIcon";

/** Animated counter that counts up from 0 to `target` over ~1.2 s */
function AnimatedCounter({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const duration = 1200;
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);
  return <span>{display.toLocaleString()}</span>;
}

/** WID Trust Layer — animated counter + Witnessed Voices (horizontal scroll) */
function WIDTrustLayer() {
  const { data: countData } = trpc.songs.getWitnessedCount.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: voices } = trpc.songs.getWitnessedVoices.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: mediumCounts } = trpc.songs.getCountsByContentType.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const { addAndPlay, playQueueAt, openNowPlayingPanel } = usePlayer();

  const total = countData?.count ?? 0;

  // Build a stable queue from all witnessed voices for ordered playback
  const voiceQueue = (voices ?? []).slice(0, 10).map((v: any) => ({
    id: String(v.songId),
    title: v.title,
    artist: v.artistHandle || v.userName,
    artUrl: v.coverArtUrl || undefined,
    audioUrl: v.fileUrl || "",
    witnessId: v.witnessId || undefined,
    genre: v.genre || "",
  }));

  const handleVoicePlay = (songId: number) => {
    if (voiceQueue.length > 1) {
      const startIdx = voiceQueue.findIndex((t: { id: string }) => t.id === String(songId));
      playQueueAt(voiceQueue, startIdx >= 0 ? startIdx : 0, "HOME");
    } else if (voiceQueue.length === 1) {
      addAndPlay(voiceQueue[0]);
    }
    openNowPlayingPanel();
  };

  return (
    <div className="px-6 pt-4 pb-6 space-y-4">
      {/* ── Animated WID counter ── */}
      <div
        className="flex items-center gap-4 rounded-2xl px-5 py-4"
        style={{
          background: "#2C3438",
          border: "1px solid rgba(203,177,131,0.32)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.30)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(203,177,131,0.12)", border: "1px solid rgba(203,177,131,0.35)" }}
        >
          <Shield size={18} style={{ color: "#CBB183" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="museum-section-title mb-0.5">
            Works Witnessed
          </p>
          <p className="font-display text-[22px] leading-none" style={{ color: "#E6CDAE" }}>
            <AnimatedCounter target={total} />
            <span className="text-[14px] ml-1.5 font-body" style={{ color: "#AA8E64" }}>and counting</span>
          </p>
        </div>
        <Link href="/verify">
          <button
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-heading tracking-wide transition-all hover:brightness-110"
            style={{
              background: "rgba(203,177,131,0.12)",
              border: "1px solid rgba(203,177,131,0.40)",
              color: "#CBB183",
            }}
          >
            <Fingerprint size={12} />
            Verify WID
          </button>
        </Link>
      </div>

      {/* ── Witnessed Works by Medium — Cosmic Edition ── */}
      <div
        className="rounded-2xl px-5 py-4 relative overflow-hidden"
        style={{
          background: "#2C3438",
          border: "1px solid rgba(203,177,131,0.28)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.30)",
        }}
      >
        {/* Deep space background shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(203,177,131,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(208,161,95,0.04) 0%, transparent 60%)",
          }}
        />
        <p
          className="museum-section-title mb-3 relative"
        >
          Witnessed Works
        </p>
        <div className="grid grid-cols-2 gap-2 relative">
          {([
            { medium: "audio"      as const, count: mediumCounts?.audio      ?? 0 },
            { medium: "lyrics"     as const, count: mediumCounts?.lyrics     ?? 0 },
            { medium: "manuscript" as const, count: mediumCounts?.manuscript ?? 0 },
            { medium: "comic"      as const, count: mediumCounts?.comic      ?? 0 },
          ]).map(({ medium, count }) => (
            <CosmicMediumIcon
              key={medium}
              medium={medium}
              size={36}
              card
              count={count > 0 ? count.toLocaleString() : "—"}
            />
          ))}
        </div>
        <p className="text-[10px] mt-3 relative museum-caption" style={{ fontSize: "0.6875rem" }}>
          Every medium. One registry. Your proof of origin — sealed at the moment of creation.
        </p>
      </div>

      {/* ── Witnessed Voices — horizontal scroll row ── */}
      {voices && voices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="museum-section-title">
              Witnessed Voices
            </p>
            <Link href="/explore">
              <span className="text-[11px] font-body cursor-pointer transition-colors hover:text-[#CBB183]" style={{ color: "#AA8E64" }}>
                See all
              </span>
            </Link>
          </div>
          {/* Horizontal scroll container — negative margin to break out of px-6 padding */}
          <div
            className="museum-pan-row -mx-6 px-6"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {voices.slice(0, 10).map((v: any) => (
              <div
                key={v.songId}
                className="relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer group"
                style={{
                  width: "148px",
                  height: "196px",
                  background: "#2C3438",
                  border: "1px solid rgba(203,177,131,0.25)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.50)",
                }}
              >
                {/* Cover art */}
                {v.coverArtUrl ? (
                  <img
                    src={v.coverArtUrl}
                    alt={v.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "#2C3438" }}>
                    <Fingerprint size={28} style={{ color: "rgba(203,177,131,0.35)" }} />
                  </div>
                )}

                {/* Gradient overlay — bottom 65% */}
                <div className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)" }}
                />

                {/* WID badge — top left */}
                <div
                  className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-mono font-bold z-10"
                  style={{
                    background: "rgba(203,177,131,0.18)",
                    border: "1px solid rgba(203,177,131,0.50)",
                    color: "#CBB183",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <Fingerprint size={8} />
                  WID
                </div>

                {/* Creator avatar — top right */}
                {v.profilePhotoUrl && (
                  <img
                    src={v.profilePhotoUrl}
                    alt={v.artistHandle || v.userName}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full object-cover z-10"
                    style={{ border: "1.5px solid rgba(203,177,131,0.55)" }}
                  />
                )}

                {/* Play button — center, appears on hover/tap */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVoicePlay(v.songId);
                  }}
                  className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "rgba(0,0,0,0.15)" }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90"
                    style={{
                      background: "#3F4A50",
                      boxShadow: "0 0 24px rgba(203,177,131,0.45)",
                    }}
                  >
                    <Play size={20} fill="#2C3438" style={{ color: "#2C3438", marginLeft: "2px" }} />
                  </div>
                </button>

                {/* Navigate to song page on card tap */}
                <Link href={`/song/${v.songId}`}>
                  <div className="absolute inset-0 z-10" />
                </Link>

                {/* Title + creator name — bottom */}
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 z-20 pointer-events-none">
                  <p className="font-heading text-[11px] leading-tight truncate text-white">
                    {v.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {!v.profilePhotoUrl && (
                      <div className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ background: "rgba(203,177,131,0.25)" }} />
                    )}
                    <p className="font-body text-[9px] truncate" style={{ color: "#AA8E64" }}>
                      {v.artistHandle || v.userName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Featured Creators horizontal carousel */
function FeaturedCreatorsCarousel() {
  const { data: creators } = trpc.profile.featuredCreators.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  if (!creators || creators.length === 0) return null;

  return (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="museum-section-title">
          <Users size={13} className="inline mr-1.5 opacity-70" />
          Creators
        </h2>
        <Link href="/explore">
          <span className="text-[11px] font-body cursor-pointer transition-colors hover:text-[#CBB183]" style={{ color: "#AA8E64" }}>
            See all
          </span>
        </Link>
      </div>
      <div
        className="museum-pan-row"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {creators.map((creator: any) => (
          <Link key={creator.id} href={`/creator/${creator.id}`}>
            <div
              className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all hover:scale-105"
              style={{
                width: "88px",
                background: "#3F4A50",
                border: "1px solid rgba(203,177,131,0.18)",
              }}
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "2px solid rgba(203,177,131,0.28)" }}>
                {creator.profilePhotoUrl ? (
                  <img src={creator.profilePhotoUrl} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[16px] font-bold"
                    style={{ background: "rgba(203,177,131,0.18)", color: "#CBB183" }}>
                    {(creator.artistHandle || creator.name || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="font-heading text-[10px] truncate w-full" style={{ color: "#E6CDAE" }}>
                  {creator.artistHandle || creator.name}
                </p>
                <p className="font-body text-[9px] mt-0.5" style={{ color: "#AA8E64" }}>
                  {creator.publishedCount ?? 0} tracks
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** New Voices — recently joined creators who have published at least one track.
 *  Excludes any creator already shown in FeaturedCreatorsCarousel to prevent duplicates. */
function NewVoicesCarousel() {
  const { data: allRecent } = trpc.profile.recentCreators.useQuery(
    { limit: 20 },
    { staleTime: 120_000, refetchOnWindowFocus: false }
  );
  const { data: featured } = trpc.profile.featuredCreators.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
  // Build a set of IDs already shown in the Featured row
  const featuredIds = new Set((featured ?? []).map((c: any) => c.id as number));
  // Only show creators NOT already in the Featured row, capped at 10
  const creators = (allRecent ?? []).filter((c: any) => !featuredIds.has(c.id)).slice(0, 10);
  if (creators.length === 0) return null;
  return (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="museum-section-title">
          <Sparkles size={13} className="inline mr-1.5" style={{ color: "#4ADE80" }} />
          New Voices
        </h2>
        <Link href="/explore">
          <span className="text-[11px] font-body cursor-pointer transition-colors hover:text-[#CBB183]" style={{ color: "#AA8E64" }}>
            See all
          </span>
        </Link>
      </div>
      <div
        className="museum-pan-row"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {creators.map((creator: any) => (
          <Link key={creator.id} href={`/creator/${creator.id}`}>
            <div
              className="flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all hover:scale-105"
              style={{
                width: "88px",
                background: "rgba(63,74,80,0.7)",
                border: "1px solid rgba(74,222,128,0.15)",
              }}
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "2px solid rgba(74,222,128,0.35)" }}>
                {creator.profilePhotoUrl ? (
                  <img src={creator.profilePhotoUrl} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[16px] font-bold"
                    style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80" }}>
                    {(creator.artistHandle || creator.name || "?")[0].toUpperCase()}
                  </div>
                )}
                {/* NEW badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: "#4ADE80", border: "1.5px solid #2C3438" }}>
                  <Sparkles size={8} style={{ color: "#2C3438" }} />
                </div>
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="font-heading text-[10px] truncate w-full" style={{ color: "#E6CDAE" }}>
                  {creator.artistHandle || creator.name}
                </p>
                <p className="font-body text-[9px] mt-0.5" style={{ color: "rgba(74,222,128,0.75)" }}>New</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Horizontal 2-row track grid — accepts pre-fetched like data to avoid per-card queries */
function HorizontalTrackGrid({
  tracks,
  loading,
  onTip,
  emptyMessage = "No tracks yet",
  likeMap,
}: {
  tracks: any[];
  loading?: boolean;
  onTip?: (track: any, rect: DOMRect) => void;
  emptyMessage?: string;
  likeMap?: Record<number, { liked: boolean; count: number }>;
}) {
  const { playQueueAt, openNowPlayingPanel } = usePlayer();
  const handleSectionPlay = (clickedTrack: any) => {
    const queue = tracks.filter((t: any) => !!t.audioUrl);
    if (queue.length >= 1) {
      const startIdx = queue.findIndex((t: any) => t.id === clickedTrack.id);
      playQueueAt(queue, startIdx >= 0 ? startIdx : 0, "HOME");
    }
    openNowPlayingPanel();
  };
  if (loading) {
    return (
      <div
        className="museum-pan-row"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 rounded-2xl animate-pulse"
            style={{ width: CARD_PAN_W, height: 220, background: "#2C3438" }}
          />
        ))}
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 rounded-2xl mb-4"
        style={{ background: "rgba(44,52,56,0.7)", border: "1px dashed rgba(203,177,131,0.20)" }}
      >
        <p className="font-heading text-[14px] mb-1" style={{ color: "#AA8E64" }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Split tracks into two rows of up to 12 each
  const row1 = tracks.slice(0, 12);
  const row2 = tracks.slice(12, 24);

  const getPrefetch = (track: any) => {
    if (!likeMap) return {};
    const n = typeof track.id === "string" ? parseInt(track.id, 10) : track.id;
    const entry = likeMap[n];
    if (!entry) return {};
    return { prefetchedLiked: entry.liked, prefetchedLikeCount: entry.count };
  };

  return (
    <div className="space-y-4">
      {/* Row 1 */}
      <div
        className="museum-pan-row"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {row1.map((track, idx) => (
          <div key={track.id} className="flex-shrink-0" style={{ width: CARD_PAN_W }}>
            {(track.contentType === "manuscript" || track.contentType === "comic") ? (
              <BookCard
                item={{ song: { id: track.songId ?? parseInt(track.id, 10), title: track.title, coverArtUrl: track.artUrl, witnessId: track.witnessId, genre: track.genre, contentType: track.contentType }, creator: { id: track.creatorId, name: track.artist, artistHandle: track.artistHandle } }}
                {...getPrefetch(track)}
              />
            ) : (
              <TrackCard track={track} index={idx} onTip={onTip} onPlay={handleSectionPlay} {...getPrefetch(track)} />
            )}
          </div>
        ))}
      </div>

      {/* Row 2 — only shown if there are enough tracks */}
      {row2.length > 0 && (
        <div
          className="museum-pan-row"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {row2.map((track, idx) => (
            <div key={track.id} className="flex-shrink-0" style={{ width: CARD_PAN_W }}>
              {(track.contentType === "manuscript" || track.contentType === "comic") ? (
                <BookCard
                  item={{ song: { id: track.songId ?? parseInt(track.id, 10), title: track.title, coverArtUrl: track.artUrl, witnessId: track.witnessId, genre: track.genre, contentType: track.contentType }, creator: { id: track.creatorId, name: track.artist, artistHandle: track.artistHandle } }}
                  {...getPrefetch(track)}
                />
              ) : (
                <TrackCard track={track} index={12 + idx} onTip={onTip} onPlay={handleSectionPlay} {...getPrefetch(track)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Trending horizontal scroll — 2 rows × 12 cards using TrackCard */
function TrendingHorizontalGrid({
  tracks,
  onTip,
  likeMap,
}: {
  tracks: any[];
  onTip?: (track: any, rect: DOMRect) => void;
  likeMap?: Record<number, { liked: boolean; count: number }>;
}) {
  const { playQueueAt, openNowPlayingPanel } = usePlayer();
  const handleTrendingPlay = (clickedTrack: any) => {
    const queue = tracks.filter((t: any) => !!t.audioUrl);
    if (queue.length >= 1) {
      const startIdx = queue.findIndex((t: any) => t.id === clickedTrack.id);
      playQueueAt(queue, startIdx >= 0 ? startIdx : 0, "HOME");
    }
    openNowPlayingPanel();
  };
  if (tracks.length === 0) return null;

  const row1 = tracks.slice(0, 12);
  const row2 = tracks.slice(12, 24);

  const getPrefetch = (track: any) => {
    if (!likeMap) return {};
    const n = typeof track.id === "string" ? parseInt(track.id, 10) : track.id;
    const entry = likeMap[n];
    if (!entry) return {};
    return { prefetchedLiked: entry.liked, prefetchedLikeCount: entry.count };
  };

  return (
    <div className="space-y-4">
      <div
        className="museum-pan-row"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {row1.map((track, idx) => (
          <div key={track.id} className="flex-shrink-0" style={{ width: CARD_PAN_W }}>
            <TrackCard track={track} index={idx} onTip={onTip} onPlay={handleTrendingPlay} {...getPrefetch(track)} />
          </div>
        ))}
      </div>
      {row2.length > 0 && (
        <div
          className="museum-pan-row"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {row2.map((track, idx) => (
            <div key={track.id} className="flex-shrink-0" style={{ width: CARD_PAN_W }}>
              <TrackCard track={track} index={12 + idx} onTip={onTip} onPlay={handleTrendingPlay} {...getPrefetch(track)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const GENRE_CARDS = [
  { label: "All",        icon: null,    color: "#A78BFA" },
  { label: "Ambient",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-book_038e31c9.png",      color: "#7dd3fc" },
  { label: "Gospel",    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-cross_39407625.png",     color: "#fbbf24" },
  { label: "Jazz",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-lyre_40247746.png",      color: "#c4b5fd" },
  { label: "Electronic",icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-fire-lyre_42893087.png", color: "#f97316" },
  { label: "Hip-Hop",   icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-eye_0e10b572.png",      color: "#fb923c" },
  { label: "Rock",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#f87171" },
  { label: "R&B",       icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-feather_40dcaa6d.png",   color: "#a78bfa" },
  { label: "Metal",     icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#ef4444" },
];

const HERO_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663123503966/CikRjojXDGlVnusc.png";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const [activeGenre, setActiveGenre] = useState("All");
  const [tipTarget, setTipTarget] = useState<any | null>(null);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);

  const discoverInput = useMemo(() => ({
    genre: activeGenre === "All" ? undefined : activeGenre,
    limit: 24,
  }), [activeGenre]);

  const { data: discoverData, isLoading: discoverLoading } = trpc.songs.discover.useQuery(
    discoverInput,
    { staleTime: 30_000 }
  );

  const trendingInput = useMemo(() => ({ limit: 24 }), []);
  const { data: trendingRaw } = trpc.songs.trending.useQuery(
    trendingInput,
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  const mapSong = (s: any) => {
    const song = s.song ?? s;
    const creator = s.creator ?? null;
    return {
      id: String(song.id),
      title: song.title ?? "Untitled Work",
      artist: creator?.artistHandle || creator?.name || "Unknown Creator",
      artUrl: song.coverArtUrl ?? undefined,
      audioUrl: song.fileUrl ?? "",
      genre: song.genre ?? undefined,
      plays: song.playCount ?? 0,
      witnessId: song.witnessId ?? undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
        visualReady: song.visualReady ?? false,
        autoVideoUrl: song.autoVideoUrl ?? undefined,
        creatorRole: song.creator?.role ?? undefined,
      artAspectRatio: song.artAspectRatio ?? "1:1",
      userId: song.userId,
      artistHandle: creator?.artistHandle ?? undefined,
      profilePhotoUrl: creator?.profilePhotoUrl ?? undefined,
      creatorId: creator?.id ?? undefined,
      contentType: song.contentType ?? "audio",
      songId: song.id,
    };
  };

  const tracks = useMemo(() => (discoverData ?? []).map(mapSong), [discoverData]);
  const trendingTracks = useMemo(() => (trendingRaw ?? []).map(mapSong), [trendingRaw]);

  // Collect all unique song IDs from both lists for a SINGLE bulk like-status fetch.
  // This replaces up to 48 individual getLikeStatus + getLikeCount queries that were
  // causing HTTP 414 URI Too Long errors when batched into one GET request.
  const allSongIds = useMemo(() => {
    const ids = new Set<number>();
    const toId = (t: any) => {
      const n = typeof t.id === "string" ? parseInt(t.id, 10) : t.id;
      if (!isNaN(n) && n > 0) ids.add(n);
    };
    tracks.forEach(toId);
    trendingTracks.forEach(toId);
    return Array.from(ids);
  }, [tracks, trendingTracks]);

  const { data: bulkLikes } = trpc.songs.getBulkLikeStatuses.useQuery(
    { songIds: allSongIds },
    { enabled: allSongIds.length > 0, staleTime: 30_000 }
  );
  const { data: publicProjects = [] } = trpc.projects.listPublic.useQuery(
    { limit: 12 },
    { staleTime: 60_000 }
  );

  const tipTrack = tipTarget ?? null;
  const handleTip = (track: any, rect: DOMRect) => { setTipTarget(track); setTipRect(rect); };

  return (
    <div className="animate-fade-up cosmic-bg min-h-screen">

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: "420px" }}>
        <img
          src={HERO_IMG}
          alt="Living Nexus"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "saturate(1.2) contrast(1.08) brightness(1.0)" }}
        />
        {/* Left text-legibility scrim — only covers the text area, image breathes on the right */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,10,30,0.82) 0%, rgba(30,16,40,0.55) 38%, rgba(40,20,50,0.10) 65%, transparent 100%)" }} />
        {/* Bottom scrim — anchors content, lighter than before */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(20,10,30,0.75) 0%, rgba(30,16,40,0.20) 35%, transparent 100%)" }} />
        {/* Warm gold radial — subtle lantern glow, doesn't kill image color */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 55% at 28% 52%, rgba(203,177,131,0.08) 0%, transparent 65%)" }} />
        {/* Edge vignette — lighter, just frames the corners */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(44,52,56,0.35) 80%, rgba(44,52,56,0.65) 100%)" }} />

        <div className="relative z-10 flex flex-col justify-end px-6 pb-10 pt-16 max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={13} className="text-[#CBB183]" />
            <span className="text-[10px] font-heading tracking-[0.22em] uppercase text-[#CBB183]">
              Living Nexus — Creative Provenance Platform
            </span>
          </div>

          <h1
            className="font-display leading-tight mb-3"
            style={{
              fontSize: "clamp(1.9rem, 5vw, 3rem)",
              color: "#E6CDAE",
              textShadow: "0 2px 24px rgba(0,0,0,0.60)",
            }}
          >
            Your work deserves to be<br />
            <span style={{ color: "#CBB183" }}>witnessed.</span>
          </h1>

          <p className="font-body text-[14px] leading-relaxed mb-6 max-w-md" style={{ color: "#DACAAA" }}>
            Every work — music, lyrics, manuscripts, comics, video — carries a Witness ID. Cryptographic proof of origin that belongs to you before it belongs to anyone else.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href={isAuthenticated ? "/upload" : getLoginUrl("/upload")}>
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "#CBB183",
                  color: "#1E1020",
                  boxShadow: "0 2px 16px rgba(203,177,131,0.30)",
                }}
              >
                <Upload size={13} />
                Register Your Work
              </button>
            </Link>
            <Link href="/explore">
              <button
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "rgba(203,177,131,0.08)",
                  border: "1px solid rgba(203,177,131,0.22)",
                  color: "#E6CDAE",
                }}
              >
                <Compass size={13} />
                Explore Works
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FOUNDER'S ERA BLOCK
      ══════════════════════════════════════════════════════════════ */}
      <div className="px-6 py-5">
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #3F4A50 0%, #2C3438 100%)",
            border: "1px solid rgba(203,177,131,0.22)",
          }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5"
            style={{ background: "radial-gradient(circle, rgba(203,177,131,0.5) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(203,177,131,0.12)", border: "1px solid rgba(203,177,131,0.32)" }}>
                <Star size={12} style={{ color: "#CBB183" }} />
              </div>
              <span className="text-[10px] font-heading tracking-[0.2em] uppercase" style={{ color: "#CBB183" }}>
                Founder's Era
              </span>
            </div>

            <h2 className="font-display text-[18px] leading-tight mb-3" style={{ color: "#E6CDAE" }}>
              The First Witnesses
            </h2>

              <p className="text-[13px] font-body leading-relaxed mb-4" style={{ color: "#DACAAA" }}>
                Founder's Era creators are the architects of this platform's provenance foundation —
                establishing the first anchors of a cryptographically-verified creative record that cannot
                be altered, disputed, or erased.
              </p>

              <p className="text-[13px] font-body leading-relaxed mb-4" style={{ color: "#DACAAA" }}>
                In an era where AI systems train on uncredited work and platforms routinely strip creator
                metadata, a Founder's Era WID is a timestamped declaration of origin. It says:{" "}
                <em style={{ color: "#CBB183" }}>
                  "I was here. This is mine. The record proves it."
                </em>
              </p>

              <div className="museum-grid mt-2">
                {([
                  {
                    Icon: ShieldCheck,
                    title: "Immutable Proof",
                    desc: "Your WID is written to a permanent ledger. No platform, no algorithm, no third party can overwrite it.",
                  },
                  {
                    Icon: Lock,
                    title: "Ownership on Record",
                    desc: "Founding creators receive the earliest registry timestamps — the strongest possible claim to authorship.",
                  },
                  {
                    Icon: Star,
                    title: "Founding Status",
                    desc: "Founder's Era creators are permanently distinguished in the registry as the builders of this platform's provenance foundation.",
                  },
                ] as const).map(p => (
                  <div
                    key={p.title}
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(44,52,56,0.7)",
                      border: "1px solid rgba(203,177,131,0.18)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "#CBB183" }}>
                      <p.Icon size={14} />
                      <span className="text-[11px] font-heading tracking-wide">{p.title}</span>
                    </div>
                    <p className="text-[11px] font-body leading-relaxed" style={{ color: "#AA8E64" }}>
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={isAuthenticated ? "/upload" : getLoginUrl("/upload")}>
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                    style={{
                      background: "rgba(203,177,131,0.10)",
                      border: "1px solid rgba(203,177,131,0.35)",
                      color: "#CBB183",
                    }}
                  >
                    <Upload size={13} />
                    Claim Your Founder's Era WID
                  </button>
                </Link>
                <Link href="/founders">
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                    style={{
                      background: "rgba(44,52,56,0.7)",
                      border: "1px solid rgba(203,177,131,0.18)",
                      color: "#AA8E64",
                    }}
                  >
                    <Users size={13} />
                    View Founding Creators
                  </button>
                </Link>
                <Link href="/founder-era">
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                    style={{
                      background: "rgba(44,52,56,0.7)",
                      border: "1px solid rgba(203,177,131,0.22)",
                      color: "rgba(203,177,131,0.80)",
                    }}
                  >
                    <Heart size={13} />
                    Support the Era
                  </button>
                </Link>
              </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TRUST LAYER — WID counter + Witnessed Voices (8 panels)
      ══════════════════════════════════════════════════════════════ */}
      <WIDTrustLayer />

      {/* ══════════════════════════════════════════════════════════════
          WID CLARITY — what it proves vs. what it does not replace
      ══════════════════════════════════════════════════════════════ */}
      <div className="px-6 pb-2">
        <div
          className="rounded-2xl p-5 relative overflow-hidden sg-hero-frame"
          style={{
            background: "linear-gradient(135deg, #3F4A50 0%, #2C3438 100%)",
            border: "1px solid rgba(203,177,131,0.25)",
            boxShadow: "0 0 40px rgba(203,177,131,0.06)",
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(203,177,131,0.07) 0%, transparent 70%)",
            }}
          />
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4 relative">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" style={{ color: "#CBB183" }} />
            <span
              className="font-heading text-[11px] tracking-[0.2em] uppercase"
              style={{ color: "#CBB183" }}
            >
              What a Witness ID Is — and Is Not
            </span>
          </div>
          {/* Core statement */}
          <blockquote
            className="font-body text-[14px] leading-relaxed mb-4 pl-4 relative"
            style={{
              color: "#E6CDAE",
              borderLeft: "3px solid rgba(203,177,131,0.50)",
            }}
          >
            Witness IDs help creators preserve verifiable proof of authorship, creation date, and work integrity — supporting, but not replacing, official copyright registration.
          </blockquote>
          {/* Three-column breakdown */}
          <div className="museum-grid mb-4 relative">
            {([
              {
                icon: "✓",
                color: "#4ade80",
                bg: "rgba(74,222,128,0.06)",
                border: "rgba(74,222,128,0.18)",
                title: "What a WID Proves",
                points: [
                  "You created this work",
                  "The exact timestamp of creation",
                  "The content has not been altered since registration",
                  "Your AI disclosure intent at time of upload",
                ],
              },
              {
                icon: "◎",
                color: "#F5C451",
                bg: "rgba(245,196,81,0.06)",
                border: "rgba(245,196,81,0.18)",
                title: "What a WID Supports",
                points: [
                  "Copyright registration applications",
                  "Dispute resolution and prior art claims",
                  "Licensing negotiations and provenance audits",
                  "AI training consent documentation",
                ],
              },
              {
                icon: "✗",
                color: "rgba(255,255,255,0.35)",
                bg: "rgba(255,255,255,0.03)",
                border: "rgba(255,255,255,0.08)",
                title: "What a WID Does Not Replace",
                points: [
                  "Official copyright registration (U.S. Copyright Office)",
                  "Trademark or patent filings",
                  "Legal representation or counsel",
                  "Enforcement action against infringement",
                ],
              },
            ] as const).map(({ icon, color, bg, border, title, points }) => (
              <div
                key={title}
                className="rounded-xl p-4"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="font-mono text-[15px]" style={{ color }}>{icon}</span>
                  <h4 className="font-heading font-bold text-[11px] tracking-wide" style={{ color: "rgba(255,255,255,0.9)" }}>{title}</h4>
                </div>
                <ul className="space-y-1">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-1.5 text-[11px] font-body leading-snug" style={{ color: "rgba(229,231,235,0.7)" }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color }}>·</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Disclaimer footer */}
          <p
            className="text-[11px] font-body leading-relaxed relative"
            style={{ color: "#AA8E64" }}
          >
            Living Nexus is operated by BDDT Publishing, a DBA of Command Domains LLC. Witness IDs are cryptographic provenance records issued by this platform and do not constitute legal copyright registration. For official copyright protection, visit{" "}
            <a
              href="https://www.copyright.gov/registration/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#CBB183] transition-colors"
              style={{ color: "#CBB183" }}
            >
              copyright.gov/registration
            </a>
            .
          </p>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════
          FEATURED CREATORS — horizontal panning carousel
      ══════════════════════════════════════════════════════════════ */}
      <FeaturedCreatorsCarousel />

      {/* ── Sacred Geometry Divider ── */}
      <div className="sg-divider-wide px-6">
        <div className="sg-divider-wide-center">
          <div className="sg-divider-wide-center-dot" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          NEW VOICES — recently joined creators
      ══════════════════════════════════════════════════════════════ */}
      <NewVoicesCarousel />

      {/* ── Sacred Geometry Divider ── */}
      <div className="sg-divider-wide px-6">
        <div className="sg-divider-wide-center">
          <div className="sg-divider-wide-center-dot" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FEATURED PROJECTS — wireframe redesign (Phase 81)
          Cards: banner + artist avatar/name + AI/$/♥/WID badges
      ══════════════════════════════════════════════════════════════ */}
      {(isAuthenticated || (publicProjects as any[]).length > 0) && (
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="museum-section-header">Featured Projects</h2>
            <Link href="/projects">
              <span className="text-[11px] font-body cursor-pointer transition-colors hover:text-[#CBB183]" style={{ color: "#AA8E64" }}>See all</span>
            </Link>
          </div>

          {/* Swipeable 2×2 paged carousel */}
          <FeaturedProjectsCarousel
            projects={(publicProjects as any[])}
            isAuthenticated={isAuthenticated}
          />
          {/* sg-divider inside featured projects */}
          <div className="sg-divider mt-4"><div className="sg-divider-pip" /></div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════
          GENRE FILTERS + DISCOVER TRACKS (side-pane horizontal scroll)
      ══════════════════════════════════════════════════════════════ */}
      {/* ── Sacred Geometry Divider ── */}
      <div className="sg-divider-wide px-6">
        <div className="sg-divider-wide-center">
          <div className="sg-divider-wide-center-dot" />
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Genre icon cards */}
        <div className="mb-7">
          <h2 className="museum-section-title mb-3">Browse Genres</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {GENRE_CARDS.map(g => (
              <button
                key={g.label}
                onClick={() => setActiveGenre(g.label)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border group
                  ${activeGenre === g.label
                    ? "border-[#CBB183]/40 bg-[#3F4A50]/[0.07]"
                    : "border-[rgba(203,177,131,0.12)] bg-[#3F4A50] hover:border-[rgba(203,177,131,0.25)] hover:bg-[#4A5560]"
                  }`}
              >
                {g.icon ? (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={g.icon}
                      alt={g.label}
                      className={`w-full h-full object-contain transition-all duration-200
                        ${activeGenre === g.label ? "scale-110 drop-shadow-lg" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"}`}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(135deg, #CBB183, #7C3AED)" }}>
                    <span className="text-[11px] font-heading font-bold text-black">ALL</span>
                  </div>
                )}
                <span
                  className="text-[10px] font-body truncate w-full text-center transition-colors"
                  style={{ color: activeGenre === g.label ? g.color : "rgba(255,255,255,0.75)" }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Discover Tracks header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="museum-section-header">
            {activeGenre === "All" ? "Discover Tracks" : activeGenre}
          </h2>
          <Link href="/explore">
            <span className="text-[12px] text-[#A78BFA] cursor-pointer hover:text-[#CBB183] transition-colors font-body">
              See all
            </span>
          </Link>
        </div>

        {/* Discover — horizontal 2-row scroll */}
        <div className="mb-8">
          <HorizontalTrackGrid
            tracks={tracks}
            loading={discoverLoading}
            onTip={handleTip}
            emptyMessage="Be the first to upload a witnessed creation."
            likeMap={bulkLikes}
          />
        </div>

        {/* ── Sacred Geometry Divider ── */}
        <div className="sg-divider"><div className="sg-divider-pip" /></div>

        {/* ── Trending section ── */}
        {trendingTracks.length > 0 && (
          <>
            <div className="gold-divider mb-6" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="museum-section-header">Trending Now</h2>
              <span className="text-[10px] font-body uppercase tracking-widest" style={{ color: "#AA8E64" }}>By plays + likes + recency</span>
            </div>

            {/* Trending — horizontal 2-row scroll */}
            <div className="mb-8">
              <TrendingHorizontalGrid
                tracks={trendingTracks}
                onTip={handleTip}
                likeMap={bulkLikes}
              />
            </div>
          </>
        )}

        {/* ── Medium Sections ────────────────────────────────────────────────────────── */}
        <div className="gold-divider mb-6" />
        <div className="space-y-8 mb-8">
          <WorkCarousel
            type="audio"
            title="Witnessed Music"
            limit={12}
            viewAllHref="/explore?medium=audio"
          />
          <WorkCarousel
            type="lyrics"
            title="Witnessed Lyrics"
            limit={12}
            viewAllHref="/explore?medium=lyrics"
          />
          <WorkCarousel
            type="manuscript"
            title="Witnessed Manuscripts"
            limit={12}
            viewAllHref="/explore?medium=manuscript"
          />
          <WorkCarousel
            type="comic"
            title="Witnessed Comics"
            limit={12}
            viewAllHref="/explore?medium=comic"
          />
        </div>

        {/* ── Prompt Studio: Workflow Attribution ───────────────────────────── */}
        <div className="gold-divider mb-8" />
        <div
          className="mb-10 rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(14,12,28,0.97) 0%, rgba(20,16,42,0.99) 100%)",
            border: "1px solid rgba(245,196,81,0.18)",
            boxShadow: "0 0 40px rgba(245,196,81,0.05), inset 0 1px 0 rgba(245,196,81,0.08)",
          }}
        >
          {/* Ambient radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 55% 60% at 8% 50%, rgba(124,58,237,0.08) 0%, transparent 70%)" }}
          />
          <div className="relative flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            <Link href="/creator/780095">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/avatars/780095-1774641904221.jpg"
                alt="MoshAIMusic"
                className="w-14 h-14 rounded-full flex-shrink-0 object-cover cursor-pointer hover:brightness-110 transition-all"
                style={{
                  border: "2px solid rgba(245,196,81,0.4)",
                  boxShadow: "0 0 20px rgba(245,196,81,0.15)",
                }}
              />
            </Link>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p
                  className="text-xs font-mono tracking-widest uppercase"
                  style={{ color: "rgba(245,196,81,0.55)" }}
                >
                  Prompt Studio &mdash; workflow architecture
                </p>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Link href="/creator/780095">
                  <span
                    className="text-sm font-bold tracking-wide cursor-pointer hover:brightness-110 transition-all"
                    style={{ fontFamily: "'Cinzel', serif", color: "#F5C451" }}
                  >
                    MoshAIMusic
                  </span>
                </Link>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-mono tracking-widest"
                  style={{ background: "rgba(245,196,81,0.1)", color: "rgba(245,196,81,0.65)", border: "1px solid rgba(245,196,81,0.2)" }}
                >
                  WORKFLOW ARCHITECT
                </span>
              </div>
              <p
                className="text-sm leading-relaxed mb-3"
                style={{ color: "rgba(229,231,235,0.82)" }}
              >
                The lyric sheet &rarr; instrumentation cue &rarr; timing map pipeline that powers this generator was conceived from Brandon&rsquo;s description of his own creative process.
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <Shield className="w-3 h-3" style={{ color: "rgba(245,196,81,0.45)" }} />
                <span className="text-[10px] font-mono" style={{ color: "rgba(245,196,81,0.45)" }}>Workflow attribution recorded on Living Nexus</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Prompt Studio CTA ───────────────────────────────────────────────── */}
        <div className="gold-divider mb-8" />
        <div
          className="mb-10 rounded-2xl p-6 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(14,12,28,0.97) 60%, rgba(20,16,42,0.99) 100%)",
            border: "1px solid rgba(124,58,237,0.25)",
            boxShadow: "0 0 40px rgba(124,58,237,0.06), inset 0 1px 0 rgba(124,58,237,0.1)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 40% 70% at 95% 50%, rgba(245,196,81,0.05) 0%, transparent 70%)" }}
          />
          <div className="relative flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div
              className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(245,196,81,0.2))", border: "1px solid rgba(124,58,237,0.4)" }}
            >
              <Sparkles className="w-7 h-7" style={{ color: "#A78BFA" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: "rgba(167,139,250,0.6)" }}>AI Tool</p>
              <h3 className="font-heading text-[18px] font-bold text-white mb-1">Prompt Studio</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(229,231,235,0.75)" }}>
                Turn your lyrics into a production-ready AI music prompt. The generator builds a lyric sheet &rarr; instrumentation cue &rarr; timing map pipeline — then pre-fills your upload form so you can register the work immediately.
              </p>
            </div>
            <Link href={(user as any)?.id ? `/creator/${(user as any).id}?openPromptStudio=1` : getLoginUrl()}>
              <button
                className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-heading font-bold text-[13px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(167,139,250,0.3))",
                  border: "1px solid rgba(124,58,237,0.5)",
                  color: "#E9D5FF",
                  boxShadow: "0 0 20px rgba(124,58,237,0.2)",
                }}
              >
                <Sparkles size={14} />
                Open Prompt Studio
              </button>
            </Link>
          </div>
          <p className="text-[10px] font-mono mt-4" style={{ color: "rgba(167,139,250,0.4)" }}>
            Prompt Studio is available on any creator profile page. Visit your profile or any creator&rsquo;s page to access it.
          </p>
        </div>

        {/* ── Why Work With Us / Competitor Comparison ────────────────────────── */}
        <div className="gold-divider mb-8" />
        <div className="mb-12">
          <div className="text-center mb-8">
            <p className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: "rgba(245,196,81,0.55)" }}>The Registry Difference</p>
            <h2 className="font-heading text-[24px] sm:text-[28px] font-bold text-white mb-3">Why Work With Living Nexus?</h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: "rgba(229,231,235,0.65)" }}>
              Every platform stores your music. Only Living Nexus witnesses it — issuing a cryptographic timestamp that functions as a deed of creative origin.
            </p>
          </div>

          {/* Comparison table */}
          <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(245,196,81,0.12)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(14,12,28,0.98)", borderBottom: "1px solid rgba(245,196,81,0.15)" }}>
                  <th className="text-left px-5 py-4 font-mono text-[11px] tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)", minWidth: 180 }}>Feature</th>
                  <th className="px-5 py-4 font-mono text-[11px] tracking-widest uppercase text-center" style={{ color: "rgba(255,255,255,0.35)" }}>Spotify / Apple</th>
                  <th className="px-5 py-4 font-mono text-[11px] tracking-widest uppercase text-center" style={{ color: "rgba(255,255,255,0.35)" }}>SoundCloud / Bandcamp</th>
                  <th className="px-5 py-4 font-mono text-[11px] tracking-widest uppercase text-center" style={{ color: "#F5C451", background: "rgba(245,196,81,0.06)" }}>Living Nexus</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["Cryptographic WID provenance", "✗", "✗", "✓"],
                  ["Creator owns the timestamp", "✗", "Partial", "✓"],
                  ["Multi-medium registry (music, lyrics, manuscript, comic)", "✗", "✗", "✓"],
                  ["AI Prompt Studio (lyric → production prompt)", "✗", "✗", "✓"],
                  ["Direct tipping / creator commerce", "✗", "Partial", "✓"],
                  ["OG-optimized share pipeline (Discord / X)", "✓", "Partial", "✓"],
                  ["Platform takes revenue cut", "Yes (30%+)", "Yes (15%+)", "10% tip fee only"],
                  ["Independent creator focus", "✗", "✓", "✓"],
                ] as [string, string, string, string][]).map(([feature, col1, col2, col3], i) => (
                  <tr
                    key={feature}
                    style={{
                      background: i % 2 === 0 ? "rgba(14,12,28,0.92)" : "rgba(20,16,42,0.85)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <td className="px-5 py-3.5 font-body" style={{ color: "rgba(229,231,235,0.82)" }}>{feature}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-[13px]" style={{ color: col1 === "✓" ? "#4ade80" : col1 === "✗" ? "rgba(255,255,255,0.25)" : "rgba(245,196,81,0.7)" }}>{col1}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-[13px]" style={{ color: col2 === "✓" ? "#4ade80" : col2 === "✗" ? "rgba(255,255,255,0.25)" : "rgba(245,196,81,0.7)" }}>{col2}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-[13px]" style={{ color: col3 === "✓" ? "#4ade80" : col3 === "✗" ? "rgba(255,255,255,0.25)" : "rgba(245,196,81,0.7)", background: "rgba(245,196,81,0.04)" }}>{col3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Three value pillars */}
          <div className="museum-grid mt-6">
            {[
              { icon: Fingerprint, color: "#F5C451", bg: "rgba(245,196,81,0.08)", border: "rgba(245,196,81,0.2)", title: "Your Work, Witnessed", body: "Every upload receives a Witness ID — a cryptographic timestamp that proves you created it first. Not a certificate. A deed." },
              { icon: ShieldCheck, color: "#4ade80", bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.18)", title: "Creator-First Commerce", body: "Direct tipping and Living Archive subscriptions. The platform takes 10% on tips only. Everything else is yours." },
              { icon: Sparkles, color: "#A78BFA", bg: "rgba(167,139,250,0.06)", border: "rgba(167,139,250,0.18)", title: "AI Tools That Serve You", body: "Prompt Studio turns your lyrics into a production-ready AI music prompt. The WID goes on the output — you stay the origin." },
            ].map(({ icon: Icon, color, bg, border, title, body }) => (
              <div
                key={title}
                className="rounded-xl p-5"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <Icon className="w-6 h-6 mb-3" style={{ color }} />
                <h4 className="font-heading font-bold text-white text-[14px] mb-2">{title}</h4>
                <p className="text-[13px] leading-relaxed" style={{ color: "rgba(229,231,235,0.7)" }}>{body}</p>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/upload">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-bold text-[13px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #F5C451, #CBB183)",
                  color: "#0a0812",
                  boxShadow: "0 0 24px rgba(245,196,81,0.25)",
                }}
              >
                <Upload size={14} />
                Register Your First Work
              </button>
            </Link>
            <Link href="/learn">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-bold text-[13px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                style={{
                  background: "rgba(14,12,28,0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(229,231,235,0.8)",
                }}
              >
                <ShieldCheck size={14} />
                How WIDs Work
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tip modal */}
      {tipTarget !== null && (
        <TipModal track={tipTrack} onClose={() => { setTipTarget(null); setTipRect(null); }} originRect={tipRect} />
      )}
    </div>
  );
}
