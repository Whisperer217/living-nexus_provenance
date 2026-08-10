/**
 * Loop Creator Profile — music provenance creator surface
 * Brand-first hero. One story. Works shelf. Witness + Support.
 */

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useParams } from "wouter";
import {
  Eye,
  Loader2,
  Music,
  Pause,
  Play,
  Settings,
  Share2,
  Shield,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { SupportCreatorDrawer } from "@/components/SupportCreatorDrawer";
import { usePlayer } from "@/contexts/PlayerContext";
import { LOOP_PRODUCT } from "@/lib/loopProduct";
import { trpc } from "@/lib/trpc";

export default function LoopCreatorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { addAndPlay, playQueueAt, togglePlay, currentTrackId, state: playerState } = usePlayer();
  const [supportOpen, setSupportOpen] = useState(false);

  const isNumeric = /^\d+$/.test(id || "");
  const numericId = isNumeric ? parseInt(id || "0", 10) : 0;

  const handleQuery = trpc.profile.getByHandle.useQuery(
    { handle: id || "" },
    { enabled: !isNumeric && !!id, staleTime: 60_000 }
  );
  const creatorId = isNumeric ? numericId : (handleQuery.data?.id ?? 0);

  const { data, isLoading } = trpc.profile.getCreator.useQuery(
    { creatorId },
    { enabled: !!creatorId, staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const witnessStatus = trpc.witness.status.useQuery(
    { creatorId },
    { enabled: !!creatorId && !!user, staleTime: 30_000 }
  );
  const publicWitnessCount = trpc.witness.count.useQuery(
    { creatorId },
    { enabled: !!creatorId && !user, staleTime: 60_000 }
  );
  const utils = trpc.useUtils();
  const witnessToggle = trpc.witness.toggle.useMutation({
    onSuccess: (res) => {
      utils.witness.status.invalidate({ creatorId });
      toast.success(res.witnessing ? "Now witnessing" : "Unwitnessed");
    },
    onError: (e) => toast.error(e.message),
  });

  const creator = (data as any)?.creator;
  const songs = useMemo(() => {
    const list = ((data as any)?.songs ?? []) as any[];
    // Loop is music-only — keep audio / music works
    return list.filter((s) => {
      const ct = (s.contentType || "audio").toLowerCase();
      return ct === "audio" || ct === "music" || !s.contentType;
    });
  }, [data]);

  if ((!isNumeric && handleQuery.isLoading) || isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl mb-2" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Creator not found
          </h1>
          <Link href="/explore" className="text-sm" style={{ color: "var(--ln-gold)" }}>
            Explore works
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = !!user && user.id === creator.id;
  const displayName = creator.artistHandle || creator.name || "Creator";
  const bio = creator.bio || creator.tagline || "";
  const witnessed = songs.filter((s) => !!s.witnessId).length;
  const isWitnessing = !!witnessStatus.data?.witnessing;

  const queue = songs
    .filter((s) => s.fileUrl)
    .map((s) => ({
      id: String(s.id),
      title: s.title,
      artist: displayName,
      genre: s.genre || "",
      artUrl: s.coverArtUrl || undefined,
      audioUrl: s.fileUrl || "",
      witnessId: s.witnessId || undefined,
      coverPositionX: s.coverPositionX ?? 50,
      coverPositionY: s.coverPositionY ?? 50,
      creatorHandle: creator.artistHandle || undefined,
    }));

  const playAll = () => {
    if (queue.length === 0) {
      toast.info("No playable works yet");
      return;
    }
    playQueueAt(queue, 0);
  };

  const playOne = (song: any, index: number) => {
    if (currentTrackId === String(song.id)) {
      togglePlay();
      return;
    }
    if (queue.length > 0) {
      const qi = queue.findIndex((q) => q.id === String(song.id));
      playQueueAt(queue, qi >= 0 ? qi : 0);
    } else if (song.fileUrl) {
      addAndPlay({
        id: String(song.id),
        title: song.title,
        artist: displayName,
        genre: song.genre || "",
        artUrl: song.coverArtUrl || undefined,
        audioUrl: song.fileUrl,
        witnessId: song.witnessId || undefined,
      });
    }
  };

  const shareProfile = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: displayName, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="min-h-screen relative">
      <Helmet>
        <title>{`${displayName} — ${LOOP_PRODUCT.fullName}`}</title>
        <meta name="description" content={bio?.slice(0, 160) || `${displayName} on ${LOOP_PRODUCT.name}`} />
        <meta property="og:title" content={displayName} />
        <meta property="og:image" content={creator.profilePhotoUrl || creator.bannerUrl || ""} />
      </Helmet>

      {/* Brand-first full-bleed hero */}
      <section className="relative min-h-[78vh] flex flex-col justify-end overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: creator.bannerUrl
              ? `url(${creator.bannerUrl})`
              : creator.profilePhotoUrl
                ? `url(${creator.profilePhotoUrl})`
                : "linear-gradient(145deg, #1a1408 0%, #050505 45%, #000 100%)",
            backgroundSize: "cover",
            backgroundPosition: `${creator.bannerPositionX ?? 50}% ${creator.bannerPositionY ?? 50}%`,
            animation: "loopDrift 22s ease-in-out infinite alternate",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.94) 82%, #000 100%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 40% at 15% 80%, rgba(196,154,40,0.16), transparent 55%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12 pt-24">
          <p
            className="text-[11px] uppercase tracking-[0.32em] mb-5"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            {LOOP_PRODUCT.name}
          </p>

          <div className="flex items-end gap-5 mb-5">
            <div
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex-shrink-0"
              style={{ outline: "2px solid rgba(196,154,40,0.55)", outlineOffset: 3 }}
            >
              {creator.profilePhotoUrl ? (
                <img src={creator.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl"
                  style={{ background: "#111", color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <h1
                className="text-4xl sm:text-6xl leading-[0.95] truncate"
                style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
              >
                {displayName}
              </h1>
              {creator.artistHandle && creator.name && creator.artistHandle !== creator.name && (
                <p className="mt-2 text-sm" style={{ color: "rgba(237,229,208,0.55)" }}>
                  {creator.name}
                </p>
              )}
            </div>
          </div>

          <p
            className="text-lg sm:text-xl max-w-2xl mb-8"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(237,229,208,0.8)" }}
          >
            {bio
              ? bio.slice(0, 160) + (bio.length > 160 ? "…" : "")
              : `${songs.length} registered work${songs.length === 1 ? "" : "s"} · ${witnessed} sealed with WID`}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={playAll}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: "var(--ln-gold)", color: "#0A0806" }}
            >
              <Play size={16} fill="currentColor" /> Play works
            </button>
            {!isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    toast.info("Sign in to witness this creator");
                    return;
                  }
                  witnessToggle.mutate({ creatorId });
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm"
                style={{
                  border: "1px solid rgba(196,154,40,0.4)",
                  color: "var(--ln-parchment)",
                  background: "rgba(0,0,0,0.35)",
                }}
              >
                {isWitnessing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                {isWitnessing ? "Witnessing" : "Witness"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm"
              style={{
                border: "1px solid rgba(196,154,40,0.4)",
                color: "var(--ln-gold)",
                background: "rgba(196,154,40,0.08)",
              }}
            >
              Support
            </button>
            <button
              type="button"
              onClick={shareProfile}
              className="p-3 rounded-full"
              style={{ border: "1px solid rgba(196,154,40,0.25)", color: "rgba(237,229,208,0.7)" }}
              aria-label="Share profile"
            >
              <Share2 size={16} />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => navigate("/manage")}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm"
                style={{ color: "var(--ln-gold)" }}
              >
                <Settings size={14} /> Manage
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Metrics — typographic, not cards */}
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-3 gap-4"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
      >
        {[
          { label: "Works", value: songs.length },
          { label: "WIDs", value: witnessed },
          { label: "Witnesses", value: witnessStatus.data?.count ?? publicWitnessCount.data?.count ?? "—" },
        ].map((m) => (
          <div key={m.label}>
            <div className="text-3xl tabular-nums" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
              {m.value}
            </div>
            <div className="text-[11px] uppercase tracking-[0.16em] mt-1" style={{ color: "rgba(237,229,208,0.45)" }}>
              {m.label}
            </div>
          </div>
        ))}
      </section>

      {/* Works */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 pb-28">
        <p
          className="text-[11px] uppercase tracking-[0.22em] mb-3"
          style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
        >
          Registered music
        </p>
        <h2
          className="text-3xl mb-10"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
        >
          Works
        </h2>

        {songs.length === 0 ? (
          <div className="py-16 text-center">
            <Music className="mx-auto mb-4 opacity-40" style={{ color: "var(--ln-gold)" }} />
            <p style={{ color: "rgba(237,229,208,0.55)", fontFamily: "'Cormorant Garamond', serif", fontSize: 20 }}>
              No registered works yet.
            </p>
            {isOwner && (
              <Link href="/manifest">
                <button
                  type="button"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{ background: "var(--ln-gold)", color: "#0A0806" }}
                >
                  Register a work
                </button>
              </Link>
            )}
          </div>
        ) : (
          <ul>
            {songs.map((song, index) => {
              const active = currentTrackId === String(song.id);
              const playing = active && playerState.isPlaying;
              return (
                <li
                  key={song.id}
                  className="group flex items-center gap-4 py-4"
                  style={{
                    borderBottom: "1px solid rgba(196,154,40,0.1)",
                    animation: "loopFadeUp 420ms ease both",
                    animationDelay: `${Math.min(index, 14) * 40}ms`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => playOne(song, index)}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 overflow-hidden"
                    style={{ background: "#111" }}
                  >
                    {song.coverArtUrl ? (
                      <img
                        src={song.coverArtUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{
                          objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%`,
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={18} style={{ color: "var(--ln-gold)", opacity: 0.45 }} />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                      {playing ? (
                        <Pause size={18} fill="currentColor" style={{ color: "var(--ln-gold)" }} />
                      ) : (
                        <Play size={18} fill="currentColor" style={{ color: "var(--ln-gold)" }} />
                      )}
                    </span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <Link href={`/song/${song.id}`}>
                      <span
                        className="block truncate text-lg hover:underline"
                        style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                      >
                        {song.title}
                      </span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs" style={{ color: "rgba(237,229,208,0.5)" }}>
                      {song.genre && <span>{song.genre}</span>}
                      {song.witnessId ? (
                        <Link href={`/verify/${song.witnessId}`}>
                          <span className="inline-flex items-center gap-1" style={{ color: "var(--ln-gold)" }}>
                            <Shield size={10} />
                            <span className="font-mono text-[10px] truncate max-w-[160px]">{song.witnessId}</span>
                          </span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Eye size={10} /> Unsealed
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SupportCreatorDrawer
        target={
          supportOpen
            ? {
                songId: songs[0]?.id ?? 0,
                songTitle: songs[0]?.title ?? displayName,
                songWid: songs[0]?.witnessId ?? "",
                creatorId: creator.id,
                creatorName: displayName,
                creatorHandle: creator.artistHandle,
                coverArtUrl: creator.profilePhotoUrl || songs[0]?.coverArtUrl,
                contentType: "audio",
                stripeAccountStatus: creator.stripeAccountStatus,
              }
            : null
        }
        onClose={() => setSupportOpen(false)}
      />

      <style>{`
        @keyframes loopDrift {
          from { transform: scale(1.02) translate3d(0,0,0); }
          to { transform: scale(1.07) translate3d(-1.5%, 1%, 0); }
        }
        @keyframes loopFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
