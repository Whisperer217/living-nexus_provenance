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

import { useState, useEffect, useRef, useMemo, useCallback } from "react"; // useRef/useCallback used in AnimatedCounter and WIDTrustLayer
import { Helmet } from "react-helmet-async";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/_core/hooks/useAuth";
import TipModal from "@/components/TipModal";
// Card width is now responsive via CSS variable --card-pan-w (see index.css)
import { Sparkles, ShieldCheck, Upload, Compass, Star, Lock, Fingerprint, Shield, Users, Play, Pause, Heart, DollarSign, Cpu, CheckCircle2, ChevronLeft, ChevronRight, Send, Flame } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CosmicMediumIcon } from "@/components/CosmicMediumIcon"; // used in WIDTrustLayer
import { ShowcaseRow } from "@/components/ShowcaseRow";
import { StoreTrackCard } from "@/components/StoreTrackCard";
import { StoreCreatorCard } from "@/components/StoreCreatorCard";

import { ConstellationReveal } from "@/components/ConstellationReveal";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";

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
  const { addAndPlay, playQueueAt, togglePlay, openNowPlayingPanel, currentTrackId, state } = usePlayer();

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
    // If this track is already active, toggle play/pause instead of restarting
    if (currentTrackId === String(songId)) {
      togglePlay();
      openNowPlayingPanel();
      return;
    }
    if (voiceQueue.length > 1) {
      const startIdx = voiceQueue.findIndex((t: { id: string }) => t.id === String(songId));
      playQueueAt(voiceQueue, startIdx >= 0 ? startIdx : 0, "HOME");
    } else if (voiceQueue.length === 1) {
      addAndPlay(voiceQueue[0]);
    }
    openNowPlayingPanel();
  };

  return (
    <div className="px-6 pt-4 pb-6 space-y-4 overflow-hidden">
      {/* ── Animated WID counter ── */}
      <div
        className="flex items-center gap-4 rounded-2xl px-5 py-4"
        style={{
          background: "#000000",
          border: "1px solid rgba(196,154,40,0.20)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.50)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.22)" }}
        >
          <Shield size={18} style={{ color: "#C49A28" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="museum-section-title mb-0.5">
            Works Witnessed
          </p>
          <p className="font-display text-[22px] leading-none" style={{ color: "#E8DFC8" }}>
            <AnimatedCounter target={total} />
            <span className="text-[14px] ml-1.5 font-body" style={{ color: "#6B6555" }}>and counting</span>
          </p>
        </div>
        <Link href="/verify">
          <button
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-heading tracking-wide transition-all hover:brightness-110"
            style={{
              background: "rgba(196,154,40,0.06)",
              border: "1px solid rgba(196,154,40,0.22)",
              color: "#C49A28",
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
          background: "#000000",
          border: "1px solid rgba(196,154,40,0.15)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.50)",
        }}
      >
        {/* Deep space background shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(196,154,40,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(196,154,40,0.03) 0%, transparent 60%)",
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
              <span className="text-[11px] font-body cursor-pointer transition-colors hover:text-[#C49A28]" style={{ color: "#6B6555" }}>
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
                  background: "#000000",
                  border: "1px solid rgba(196,154,40,0.12)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.70)",
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
                    style={{ background: "#000000" }}>
                    <Fingerprint size={28} style={{ color: "rgba(196,154,40,0.25)" }} />
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
                    background: "rgba(196,154,40,0.10)",
                    border: "1px solid rgba(196,154,40,0.35)",
                    color: "#C49A28",
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
                    style={{ border: "1.5px solid rgba(196,154,40,0.35)" }}
                  />
                )}

                {/* Play/Pause button — center, appears on hover/tap or when active */}
                {(() => {
                  const isVoiceActive = currentTrackId === String(v.songId);
                  const isVoicePlaying = isVoiceActive && state.isPlaying;
                  return (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleVoicePlay(v.songId);
                      }}
                      className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-200 ${
                        isVoiceActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      style={{ background: "rgba(0,0,0,0.15)" }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-90"
                        style={{
                          background: isVoiceActive ? "rgba(196,154,40,0.22)" : "#0A0A0A",
                          border: isVoiceActive ? "2px solid rgba(196,154,40,0.9)" : "none",
                          boxShadow: isVoiceActive ? "0 0 0 6px rgba(196,154,40,0.15), 0 0 24px rgba(196,154,40,0.4)" : "0 0 24px rgba(196,154,40,0.30)",
                          animation: isVoicePlaying ? "pulse-gold 1.8s ease-in-out infinite" : "none",
                        }}
                      >
                        {isVoicePlaying ? (
                          <div className="live-wave scale-[0.65]"><span /><span /><span /></div>
                        ) : (
                          <Play size={20} fill="#C9A84C" style={{ color: "#C9A84C", marginLeft: "2px" }} />
                        )}
                      </div>
                    </button>
                  );
                })()}

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
                        style={{ background: "rgba(196,154,40,0.15)" }} />
                    )}
                    <p className="font-body text-[9px] truncate" style={{ color: "#6B6555" }}>
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
    <div className="px-6 pb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="museum-section-title">
          <Users size={13} className="inline mr-1.5 opacity-70" />
          Creators
        </h2>
        <Link href="/explore">
          <span className="text-[11px] font-body cursor-pointer transition-colors hover:text-[#C49A28]" style={{ color: "#6B6555" }}>
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
                background: "#0A0A0A",
                border: "1px solid rgba(196,154,40,0.12)",
              }}
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "2px solid rgba(196,154,40,0.20)" }}>
                {creator.profilePhotoUrl ? (
                  <img src={creator.profilePhotoUrl} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[16px] font-bold"
                    style={{ background: "rgba(196,154,40,0.10)", color: "#C49A28" }}>
                    {(creator.artistHandle || creator.name || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="font-heading text-[10px] truncate w-full" style={{ color: "#E8DFC8" }}>
                  {creator.artistHandle || creator.name}
                </p>
                <p className="font-body text-[9px] mt-0.5" style={{ color: "#6B6555" }}>
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
    <div className="px-6 pb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="museum-section-title">
          <Sparkles size={13} className="inline mr-1.5" style={{ color: "var(--ln-seal-bright)" }} />
          New Voices
        </h2>
        <Link href="/explore">
          <span className="text-[11px] font-body cursor-pointer transition-colors hover:text-[#C49A28]" style={{ color: "#6B6555" }}>
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
                background: "rgba(17,16,9,0.7)",
                border: "1px solid rgba(58,138,86,0.15)",
              }}
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "2px solid rgba(74,222,128,0.35)" }}>
                {creator.profilePhotoUrl ? (
                  <img src={creator.profilePhotoUrl} alt={creator.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[16px] font-bold"
                    style={{ background: "rgba(58,138,86,0.15)", color: "var(--ln-seal-bright)" }}>
                    {(creator.artistHandle || creator.name || "?")[0].toUpperCase()}
                  </div>
                )}
                {/* NEW badge */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: "var(--ln-seal-bright)", border: "1.5px solid #000000" }}>
                  <Sparkles size={8} style={{ color: "#000000" }} />
                </div>
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="font-heading text-[10px] truncate w-full" style={{ color: "#E8DFC8" }}>
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
function ShowcaseSection() {
  const newInput = useMemo(() => ({ limit: 16 }), []);
  const { data: newRaw } = trpc.songs.newThisWeek.useQuery(newInput, { staleTime: 60_000, refetchOnWindowFocus: false });
  const trendInput = useMemo(() => ({ limit: 16 }), []);
  const { data: trendRaw } = trpc.songs.trending.useQuery(trendInput, { staleTime: 60_000, refetchOnWindowFocus: false });
  const { data: creators } = trpc.profile.featuredCreators.useQuery(undefined, { staleTime: 120_000, refetchOnWindowFocus: false });
  const { data: voicesRaw } = trpc.songs.getWitnessedVoices.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: false });

  const newSongs = useMemo(() => (newRaw ?? []).map(mapToSongData), [newRaw]);
  const trendSongs = useMemo(() => (trendRaw ?? []).map(mapToSongData), [trendRaw]);
  // getWitnessedVoices now returns canonical FeedRow { song, creator } — same shape as newRaw/trendRaw
  const voiceSongs = useMemo(() => (voicesRaw ?? []).map(mapToSongData), [voicesRaw]);

  const hasNew = newSongs.length > 0;
  const hasTrend = trendSongs.length > 0;
  const hasCreators = (creators ?? []).length > 0;
  const hasVoices = voiceSongs.length > 0;

  if (!hasNew && !hasTrend && !hasCreators && !hasVoices) return null;

  return (
    <div className="px-4 pt-10 pb-6">
      {hasNew && (
        <ShowcaseRow title="New Arrivals" seeAllHref="/explore?sort=new">
          {newSongs.map((song: ReturnType<typeof mapToSongData>, idx: number) => (
            <StoreTrackCard key={song.id} song={song} size="md" allSongs={newSongs} songIndex={idx} isNew />
          ))}
        </ShowcaseRow>
      )}
      {hasTrend && (
        <ShowcaseRow title="Trending This Week" seeAllHref="/explore">
          {trendSongs.map((song: ReturnType<typeof mapToSongData>, idx: number) => (
            <StoreTrackCard key={song.id} song={song} size="md" allSongs={trendSongs} songIndex={idx} />
          ))}
        </ShowcaseRow>
      )}
      {hasCreators && (
        <ShowcaseRow title="Featured Creators" seeAllHref="/explore?view=creators">
          {(creators as any[]).map((creator: any) => (
            <StoreCreatorCard key={creator.id} creator={creator} />
          ))}
        </ShowcaseRow>
      )}
      {hasVoices && (
        <ShowcaseRow title="Recently Witnessed" seeAllHref="/explore">
          {voiceSongs.map((song: (typeof voiceSongs)[number], idx: number) => (
            <StoreTrackCard key={song.id} song={song} size="md" allSongs={voiceSongs} songIndex={idx} />
          ))}
        </ShowcaseRow>
      )}
    </div>
  );
}

/* ─── Cinematic Hero — live trending work, golden-ratio height ─────────────── */
const FALLBACK_HERO_IMG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663123503966/CikRjojXDGlVnusc.png";

function CinematicHero({ isAuthenticated, getLoginUrl: getLogin }: { isAuthenticated: boolean; getLoginUrl: (path?: string) => string }) {
  const heroInput = useMemo(() => ({ limit: 1 }), []);
  const { data: trendingRaw } = trpc.songs.trending.useQuery(heroInput, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
  const { addAndPlay } = usePlayer();

  const hero = useMemo(() => {
    const row = (trendingRaw ?? [])[0];
    if (!row) return null;
    const song = (row as any).song ?? row;
    const creator = (row as any).creator ?? null;
    return {
      id: song.id as number,
      title: song.title as string ?? "Untitled Work",
      coverArtUrl: (song.coverArtUrl as string | null) ?? null,
      fileUrl: (song.fileUrl as string | null) ?? null,
      genre: (song.genre as string | null) ?? null,
      witnessId: (song.witnessId as string | null) ?? null,
      contentType: (song.contentType as string) ?? "audio",
      artistHandle: creator?.artistHandle ?? null,
      artistName: creator?.name ?? null,
      profilePhotoUrl: creator?.profilePhotoUrl ?? null,
      userId: song.userId as number | null ?? null,
    };
  }, [trendingRaw]);

  const imgSrc = hero?.coverArtUrl ?? FALLBACK_HERO_IMG;
  const hasAudio = !!hero?.fileUrl;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!hero || !hasAudio) return;
    addAndPlay({
      id: String(hero.id),
      title: hero.title,
      artist: hero.artistHandle || hero.artistName || "Unknown",
      genre: hero.genre || "",
      audioUrl: hero.fileUrl || undefined,
      artUrl: hero.coverArtUrl || undefined,
      witnessId: hero.witnessId || undefined,
      creatorHandle: hero.artistHandle || undefined,
      creatorId: hero.userId || undefined,
      contentType: (hero.contentType as any) || "audio",
    });
  };

  return (
    <div
      className="hero-phi relative overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Full-bleed artwork */}
      <div className="absolute inset-0">
        <img
          src={imgSrc}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.58) saturate(1.22)", transform: "scale(1.04)", transformOrigin: "center center" }}
        />
      </div>

      {/* Layered scrims — deeper cinematic left-heavy + bottom */}
      <div
        className="absolute inset-0 pointer-events-none hero-cinematic-scrim"
      />

      {/* Sacred geometry border frame — stronger gold corona */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(196,154,40,0.14), inset 0 0 120px rgba(196,154,40,0.08), inset 0 0 240px rgba(196,154,40,0.03)",
        }}
      />

      {/* Corner vignette — deeper */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 110% 110% at 50% 50%, transparent 28%, rgba(0,0,0,0.40) 68%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Sacred corner brackets — all four corners */}
      {/* Top-left */}
      <div className="absolute top-5 left-5 z-20 pointer-events-none" style={{ width: 28, height: 28, borderTop: "1.5px solid rgba(196,154,40,0.55)", borderLeft: "1.5px solid rgba(196,154,40,0.55)" }} />
      {/* Top-right */}
      <div className="absolute top-5 right-5 z-20 pointer-events-none" style={{ width: 28, height: 28, borderTop: "1.5px solid rgba(196,154,40,0.55)", borderRight: "1.5px solid rgba(196,154,40,0.55)" }} />
      {/* Bottom-left */}
      <div className="absolute bottom-5 left-5 z-20 pointer-events-none" style={{ width: 28, height: 28, borderBottom: "1.5px solid rgba(196,154,40,0.55)", borderLeft: "1.5px solid rgba(196,154,40,0.55)" }} />
      {/* Bottom-right */}
      <div className="absolute bottom-5 right-5 z-20 pointer-events-none" style={{ width: 28, height: 28, borderBottom: "1.5px solid rgba(196,154,40,0.55)", borderRight: "1.5px solid rgba(196,154,40,0.55)" }} />

      {/* Content — anchored to lower 38.2% (golden ratio) */}
      <div className="hero-phi-content relative z-20">
        {/* Work title — dominant */}
        {hero ? (
          <>
            {/* Eyebrow — content type + genre */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[9px] font-heading tracking-[0.22em] uppercase px-2 py-0.5 rounded"
                style={{
                  background: "rgba(196,154,40,0.12)",
                  border: "1px solid rgba(196,154,40,0.28)",
                  color: "#C49A28",
                }}
              >
                {hero.contentType === "audio" ? "Music" :
                 hero.contentType === "lyrics" ? "Lyrics" :
                 hero.contentType === "manuscript" ? "Manuscript" :
                 hero.contentType === "comic" ? "Comic" : hero.contentType}
              </span>
              {hero.genre && (
                <span className="text-[9px] font-heading tracking-[0.15em] uppercase" style={{ color: "rgba(196,154,40,0.55)" }}>
                  {hero.genre}
                </span>
              )}
              {hero.witnessId && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                  background: "rgba(196,154,40,0.14)",
                  border: "1px solid rgba(196,154,40,0.55)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 14px rgba(196,154,40,0.22), 0 0 0 1px rgba(196,154,40,0.08), inset 0 1px 0 rgba(255,220,100,0.24)",
                  }}
                >
                  <Shield className="w-3 h-3" style={{ color: "#D4A843", filter: "drop-shadow(0 0 5px rgba(196,154,40,0.65))" }} />
                  <span className="text-[9px] font-heading tracking-[0.20em] uppercase" style={{ color: "#D4A843", textShadow: "0 0 10px rgba(196,154,40,0.60)" }}>
                    WID Witnessed
                  </span>
                </div>
              )}
            </div>

            {/* Work title — the creation, dominant */}
            <h1
              className="font-display leading-tight mb-2"
              style={{
                fontSize: "clamp(1.6rem, 5vw, 3rem)",
                color: "#F0EAD8",
                textShadow: "0 2px 32px rgba(0,0,0,0.70)",
                maxWidth: "22ch",
              }}
            >
              {hero.title}
            </h1>

            {/* Creator — secondary, whispered */}
            <div className="flex items-center gap-2 mb-5">
              {hero.profilePhotoUrl ? (
                <img
                  src={hero.profilePhotoUrl}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                  style={{ border: "1px solid rgba(196,154,40,0.25)" }}
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{ background: "rgba(196,154,40,0.10)", border: "1px solid rgba(196,154,40,0.18)" }}
                />
              )}
              <span
                className="font-heading text-[11px] tracking-[0.08em]"
                style={{ color: "rgba(196,154,40,0.70)" }}
              >
                {hero.artistHandle ? `@${hero.artistHandle}` : (hero.artistName || "Unknown Creator")}
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              {hasAudio && (
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                  style={{ background: "#C49A28", color: "#0A0806", boxShadow: "0 2px 20px rgba(196,154,40,0.38), inset 0 1px 0 rgba(255,240,160,0.20)" }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play Now
                </button>
              )}
              <Link href={`/song/${hero.id}`}>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                  style={{
                    background: "rgba(196,154,40,0.10)",
                    border: "1px solid rgba(196,154,40,0.45)",
                    color: "#D4A843",
                    boxShadow: "0 0 16px rgba(196,154,40,0.14), inset 0 1px 0 rgba(255,220,100,0.18)",
                  }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Witness This Work
                </button>
              </Link>
              <Link href={isAuthenticated ? "/upload" : getLogin("/upload")}>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading font-bold text-[12px] tracking-wide transition-all active:scale-95 hover:brightness-110"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(220,210,190,0.70)" }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Register Yours
                </button>
              </Link>
            </div>
          </>
        ) : (
          /* Skeleton while loading */
          <>
            <div className="h-3 w-24 rounded mb-3 animate-pulse" style={{ background: "rgba(196,154,40,0.12)" }} />
            <div className="h-10 w-64 rounded mb-2 animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-4 w-40 rounded mb-5 animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            <div className="flex gap-3">
              <div className="h-10 w-28 rounded-xl animate-pulse" style={{ background: "rgba(196,154,40,0.10)" }} />
              <div className="h-10 w-28 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
          </>
        )}
      </div>

      {/* "Trending #1" badge — top right */}
      {hero && (
        <div
          className="absolute top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(196,154,40,0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Flame className="w-3 h-3" style={{ color: "#C49A28" }} />
          <span className="text-[10px] font-heading tracking-[0.12em] uppercase" style={{ color: "rgba(196,154,40,0.85)" }}>
            Trending #1
          </span>
        </div>
      )}
    </div>
  );
}

/** Map a { song, creator } row from the API into the flat SongData shape StoreTrackCard expects */
function mapToSongData(row: any) {
  const song = row.song ?? row;
  const creator = row.creator ?? null;
  return {
    id: typeof song.id === "string" ? parseInt(song.id, 10) : (song.id as number),
    title: song.title ?? "Untitled Work",
    coverArtUrl: song.coverArtUrl ?? null,
    artistName: creator?.artistHandle || creator?.name || "Unknown Creator",
    genre: song.genre ?? null,
    wid: song.witnessId ?? null,
    widShort: null,
    playCount: song.playCount ?? null,
    fileUrl: song.fileUrl ?? null,
    duration: song.durationSeconds ?? null,
    userId: song.userId ?? null,
    artistHandle: creator?.artistHandle ?? null,
    profilePhotoUrl: creator?.profilePhotoUrl ?? null,
    aiDisclosure: song.aiDisclosure ?? null,
    contentType: song.contentType ?? "audio",
    // Testimony fields
    description: song.description ?? null,
    lyricsText: song.lyricsText ?? null,
    totalFundingCents: song.totalFundingCents ?? null,
    tipCount: song.tipCount ?? null,
  };
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

  // Belt-and-suspenders: set document.title via JS so SEO tools that check
  // the JS-rendered title see the correct 30-60 char value
  useEffect(() => {
    document.title = "Living Nexus — Audio Provenance Platform for Creators";
  }, []);

  const [tipTarget, setTipTarget] = useState<any | null>(null);
  const [tipRect, setTipRect] = useState<DOMRect | null>(null);
  const tipTrack = tipTarget ?? null;

  // Pull-to-refresh — invalidates all home feed queries
  const utils = trpc.useUtils();
  const { pullProgress, isRefreshing, indicatorY } = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        utils.songs.trending.invalidate(),
        utils.songs.discover.invalidate(),
        utils.songs.newThisWeek.invalidate(),
        utils.songs.getWitnessedCount.invalidate(),
        utils.songs.getWitnessedVoices.invalidate(),
        utils.profile.featuredCreators.invalidate(),
      ]);
    },
  });

  return (
    <>
      <Helmet>
        <title>Living Nexus — Audio Provenance Platform for Creators</title>
        <meta name="description" content="Register your music, lyrics, manuscripts, and comics with cryptographic Witness IDs. Living Nexus anchors creative provenance so every work is witnessed, attributed, and protected." />
        <meta name="keywords" content="music provenance, witness ID, audio registration, creator platform, cryptographic provenance, music attribution, digital rights, creative ownership, WID, Living Nexus" />
      </Helmet>

      <PullToRefreshIndicator
        pullProgress={pullProgress}
        isRefreshing={isRefreshing}
        indicatorY={indicatorY}
      />

      <div className="cosmic-bg min-h-screen" style={{ position: "relative" }}>

        {/* ══════════════════════════════════════════════════════════════
            §1 — CINEMATIC HERO (φ-height: 61.8vh)
            Live trending work — creation dominant, creator secondary
        ══════════════════════════════════════════════════════════════ */}
        <CinematicHero isAuthenticated={isAuthenticated} getLoginUrl={getLoginUrl} />

        {/* SEO: visible H2 for crawlers */}
        <h2 className="sr-only">Discover and Register Creative Works on Living Nexus</h2>

        {/* ══════════════════════════════════════════════════════════════
            §2 — DISCOVERY SHOWCASE (Steam-style rows)
            New Arrivals · Trending · Featured Creators · Recently Witnessed
        ══════════════════════════════════════════════════════════════ */}
        <ShowcaseSection />

        {/* ── Sacred Geometry Divider ── */}
        <div className="sg-divider-wide px-6">
          <div className="sg-divider-wide-center"><div className="sg-divider-wide-center-dot" /></div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            §3 — WHAT IS LIVING NEXUS (compact, secondary, not preachy)
        ══════════════════════════════════════════════════════════════ */}
        <ConstellationReveal delay={120} dotCount={3} skipDots>
          <WIDExplainer />
        </ConstellationReveal>

        {/* ── Contributors Strip ── */}
        <ContributorsStrip />

        {/* Tip modal */}
        {tipTarget !== null && (
          <TipModal track={tipTrack} onClose={() => { setTipTarget(null); setTipRect(null); }} originRect={tipRect} />
        )}
      </div>
    </>
  );
}

/* ─── WID Explainer — compact, secondary, not preachy ──────────────────────── */
function WIDExplainer() {
  const { data: countData } = trpc.songs.getWitnessedCount.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
  const total = countData?.count ?? 0;

  return (
    <section
      className="px-4 md:px-8 py-16"
      style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Section label */}
        <div className="flex items-center gap-3 mb-8">
          <div className="gold-divider flex-1" />
          <span className="text-[9px] font-heading tracking-[0.22em] uppercase flex-shrink-0" style={{ color: "rgba(196,154,40,0.45)" }}>
            What is Living Nexus
          </span>
          <div className="gold-divider flex-1" />
        </div>

        {/* 3-column explainer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {([
            {
              icon: <Fingerprint className="w-5 h-5" style={{ color: "#C49A28" }} />,
              title: "Witness ID",
              body: "Every registered work receives a cryptographic timestamp — a permanent, tamper-evident record of origin issued the moment you upload.",
            },
            {
              icon: <ShieldCheck className="w-5 h-5" style={{ color: "#C49A28" }} />,
              title: "Creator Owned",
              body: "Your work stays yours. Living Nexus records provenance without claiming rights. The registry is a witness, not a gatekeeper.",
            },
            {
              icon: <Compass className="w-5 h-5" style={{ color: "#C49A28" }} />,
              title: "Open Discovery",
              body: "Browse music, lyrics, manuscripts, and comics from independent creators. Every play is a direct acknowledgment of the work.",
            },
          ] as const).map(({ icon, title, body }) => (
            <div key={title} className="flex flex-col gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.16)" }}
              >
                {icon}
              </div>
              <h3 className="font-heading text-[13px] tracking-wide" style={{ color: "#E8DFC8" }}>
                {title}
              </h3>
              <p className="font-body text-[12px] leading-relaxed" style={{ color: "#7A7060" }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Compact counter + CTA row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6" style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(196,154,40,0.50)" }} />
            <span className="font-body text-[12px]" style={{ color: "#5A5040" }}>
              {total > 0 ? (
                <><span className="font-heading text-[14px]" style={{ color: "#C49A28" }}>{total.toLocaleString()}</span> works witnessed and counting</>
              ) : (
                "Works witnessed and counting"
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/verify">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-heading tracking-wide transition-all hover:brightness-110"
                style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.18)", color: "#C49A28" }}
              >
                <Fingerprint className="w-3 h-3" />
                Verify a WID
              </button>
            </Link>
            <Link href="/explore">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-heading tracking-wide transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(200,190,170,0.60)" }}
              >
                <Compass className="w-3 h-3" />
                Explore Works
              </button>
            </Link>
          </div>
        </div>

        {/* Disclaimer — minimal */}
        <p className="text-[10px] font-body leading-relaxed mt-6" style={{ color: "#3A3428" }}>
          Living Nexus is operated by BDDT Publishing, a DBA of Command Domains LLC. Witness IDs are cryptographic provenance records and do not constitute legal copyright registration.{" "}
          <a href="https://www.copyright.gov/registration/" target="_blank" rel="noopener noreferrer" className="underline transition-colors" style={{ color: "rgba(196,154,40,0.35)" }}>
            copyright.gov/registration
          </a>
        </p>
      </div>
    </section>
  );
}

/* ─── Contributors Strip ─────────────────────────────────────────────────── */
const STRIP_CONTRIBUTORS = [
  { handle: "Doc Seraph Mercer", role: "Founder", initial: "D" },
  { handle: "Slimdoggy", role: "QA · Bug Hunter", initial: "S" },
  { handle: "thiiirdgenkill", role: "QA · Feature Requests", initial: "T" },
];

function ContributorsStrip() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-10">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(139,105,20,0.70)" }}>
          Built with
        </p>
        <div className="flex items-center gap-6 flex-wrap justify-center">
          {STRIP_CONTRIBUTORS.map(({ handle, role, initial }) => (
            <Link key={handle} href="/attribution">
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold transition-all group-hover:scale-105"
                  style={{
                    background: "rgba(196,154,40,0.08)",
                    border: "1px solid rgba(196,154,40,0.18)",
                    color: "#C49A28",
                  }}
                >
                  {initial}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-semibold" style={{ color: "#E8DFC8" }}>{handle}</p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(100,116,139,0.8)" }}>{role}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/attribution">
          <span
            className="text-[10px] uppercase tracking-[0.15em] transition-opacity hover:opacity-80 cursor-pointer"
            style={{ color: "rgba(139,105,20,0.65)" }}
          >
            View full attribution →
          </span>
        </Link>
      </div>
    </div>
  );
}
