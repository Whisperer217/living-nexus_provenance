/**
 * Loop Creator Profile — 2.5D Creator Sanctuary
 * Brand-first hero over layered depth. Works + playlists for creator & witness.
 * Progressive rendering: low-power skips particles / parallax.
 */

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation, useParams } from "wouter";
import {
  LayoutGrid,
  Loader2,
  Play,
  Settings,
  Share2,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { CreatorSanctuaryStage } from "@/components/creator/CreatorSanctuaryStage";
import {
  SanctuaryPlaylists,
  SanctuaryWorksOrganizer,
  type SanctuaryPlaylist,
} from "@/components/creator/SanctuaryWorksOrganizer";
import { DomainEditor } from "@/components/domain/DomainEditor";
import { DomainRenderer } from "@/components/domain/DomainRenderer";
import { SupportCreatorDrawer } from "@/components/SupportCreatorDrawer";
import { usePlayer } from "@/contexts/PlayerContext";
import { useHarmonicSignature } from "@/hooks/useHarmonicSignature";
import { LOOP_PRODUCT } from "@/lib/loopProduct";
import { trpc } from "@/lib/trpc";
import { LOOP_DOMAIN_ALLOWED_BLOCKS } from "@shared/domainTypes";

export default function LoopCreatorPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { addAndPlay, playQueueAt, togglePlay, currentTrackId, state: playerState } = usePlayer();
  const [supportOpen, setSupportOpen] = useState(false);
  const [showDomainEditor, setShowDomainEditor] = useState(false);
  const [orgMode, setOrgMode] = useState<"all" | "sealed" | "unsealed">("all");

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
  const { data: testimonies = [] } = trpc.testimony.getByCreator.useQuery(
    { creatorId },
    { enabled: !!creatorId, staleTime: 60_000 }
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
    return list.filter((s) => {
      const ct = (s.contentType || "audio").toLowerCase();
      return ct === "audio" || ct === "music" || !s.contentType;
    });
  }, [data]);

  const playlists = useMemo(
    () => (((data as any)?.playlists ?? []) as SanctuaryPlaylist[]),
    [data]
  );

  const seedWid = songs.find((s) => s.witnessId)?.witnessId ?? null;
  const breath = useHarmonicSignature(seedWid, null);

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
  const perspective = isOwner ? "creator" : "witness";
  const displayName = creator.artistHandle || creator.name || "Creator";
  const bio = creator.bio || creator.originStatement || creator.tagline || "";
  const why = creator.originStatement || creator.creativeMission || creator.bio || "";
  const where = creator.location || "";
  const whenJoined = creator.createdAt
    ? new Date(creator.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })
    : "";
  const what = creator.primaryGenre || "Music";
  const witnessed = songs.filter((s) => !!s.witnessId).length;
  const isWitnessing = !!witnessStatus.data?.witnessing;
  const witnessCount =
    witnessStatus.data?.count ??
    publicWitnessCount.data?.count ??
    (data as any)?.witnessCount ??
    "—";

  const anyPlaying = playerState.isPlaying && songs.some((s) => String(s.id) === currentTrackId);

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

  const playOne = (song: any) => {
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

      <CreatorSanctuaryStage
        bannerUrl={creator.bannerUrl}
        photoUrl={creator.profilePhotoUrl}
        bannerPositionX={creator.bannerPositionX}
        bannerPositionY={creator.bannerPositionY}
        hue={breath.hue}
        sat={breath.saturation}
        playing={anyPlaying}
        perspective={perspective}
      >
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12 pt-24">
          <p
            className="text-[11px] uppercase tracking-[0.32em] mb-2"
            style={{ color: "var(--ln-gold-hot, var(--ln-gold))", fontFamily: "'Cinzel', serif" }}
          >
            {LOOP_PRODUCT.name}
          </p>
          <p
            className="text-[10px] uppercase tracking-[0.2em] mb-5"
            style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}
          >
            {isOwner ? "Creator sanctuary · your domain" : "Witness sanctuary · provenance hall"}
          </p>

          <div className="flex items-end gap-5 mb-5">
            <div
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden flex-shrink-0"
              style={{
                outline: "2px solid color-mix(in srgb, var(--ln-gold) 55%, transparent)",
                outlineOffset: 3,
                boxShadow: anyPlaying
                  ? `0 0 36px hsla(${breath.hue.toFixed(1)}, 65%, 50%, 0.35)`
                  : undefined,
              }}
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
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: "var(--ln-parchment)",
                  textShadow: "0 2px 28px rgba(0,0,0,0.55)",
                }}
              >
                {displayName}
              </h1>
              {creator.artistHandle && creator.name && creator.artistHandle !== creator.name && (
                <p className="mt-2 text-sm" style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)" }}>
                  {creator.name}
                </p>
              )}
            </div>
          </div>

          <p
            className="text-lg sm:text-xl max-w-2xl mb-4"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: "color-mix(in srgb, var(--ln-parchment) 88%, transparent)",
            }}
          >
            {why
              ? why.slice(0, 180) + (why.length > 180 ? "…" : "")
              : `${songs.length} registered work${songs.length === 1 ? "" : "s"} · ${witnessed} sealed with WID`}
          </p>
          <div
            className="flex flex-wrap gap-x-4 gap-y-1 mb-8 text-[11px] uppercase tracking-[0.14em]"
            style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}
          >
            <span>Who · {displayName}</span>
            <span>What · {what}</span>
            {whenJoined && <span>When · {whenJoined}</span>}
            {where && <span>Where · {where}</span>}
            <span>Why · {why ? "Testified" : "Pending"}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={playAll}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{
                background: "var(--ln-gold-hot, var(--ln-gold))",
                color: "#0A0806",
                boxShadow: "0 0 28px color-mix(in srgb, var(--ln-gold) 28%, transparent)",
              }}
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
              style={{
                border: "1px solid rgba(196,154,40,0.25)",
                color: "color-mix(in srgb, var(--ln-parchment) 70%, transparent)",
              }}
              aria-label="Share profile"
            >
              <Share2 size={16} />
            </button>
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDomainEditor((v) => !v)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm"
                  style={{
                    border: showDomainEditor
                      ? "1px solid rgba(196,154,40,0.5)"
                      : "1px solid rgba(196,154,40,0.25)",
                    color: "var(--ln-gold)",
                    background: showDomainEditor ? "rgba(196,154,40,0.12)" : "transparent",
                  }}
                >
                  <LayoutGrid size={14} />
                  {showDomainEditor ? "Close arrange" : "Arrange domain"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/manage")}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm"
                  style={{ color: "var(--ln-gold)" }}
                >
                  <Settings size={14} /> Manage
                </button>
              </>
            )}
          </div>
        </div>
      </CreatorSanctuaryStage>

      {/* Metrics */}
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-3 gap-4"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
      >
        {[
          { label: "Works", value: songs.length },
          { label: "WIDs", value: witnessed },
          { label: "Witnesses", value: witnessCount },
        ].map((m) => (
          <div key={m.label}>
            <div className="text-3xl tabular-nums" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
              {m.value}
            </div>
            <div
              className="text-[11px] uppercase tracking-[0.16em] mt-1"
              style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}
            >
              {m.label}
            </div>
          </div>
        ))}
      </section>

      {/* Testimonies */}
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 py-12"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.22em] mb-3"
          style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
        >
          Testimonies
        </p>
        <h2 className="text-3xl mb-8" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
          {isOwner ? "Why you are here" : "Why they are here"}
        </h2>
        {testimonies.length === 0 ? (
          <p
            style={{
              color: "color-mix(in srgb, var(--ln-parchment) 50%, transparent)",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18,
            }}
          >
            {isOwner
              ? "Add a testimony on your profile to become witness-ready for publishing."
              : "No testimonies published yet."}
          </p>
        ) : (
          <ul className="space-y-6">
            {(testimonies as any[]).slice(0, 6).map((t) => (
              <li key={t.id || t.wid}>
                <blockquote
                  className="text-xl leading-relaxed"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "color-mix(in srgb, var(--ln-parchment) 88%, transparent)",
                    borderLeft: `2px solid hsla(${breath.hue.toFixed(1)}, 65%, 55%, 0.55)`,
                    paddingLeft: 16,
                  }}
                >
                  {t.content}
                </blockquote>
              </li>
            ))}
          </ul>
        )}
        {isOwner && (
          <Link href="/profile">
            <span className="inline-block mt-6 text-sm" style={{ color: "var(--ln-gold)" }}>
              Edit identity & testimonies →
            </span>
          </Link>
        )}
      </section>

      {isOwner && showDomainEditor && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <DomainEditor
            userId={creator.id}
            allowedBlockTypes={LOOP_DOMAIN_ALLOWED_BLOCKS}
            onClose={() => setShowDomainEditor(false)}
          />
        </section>
      )}

      {/* Works + playlists */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14 pb-28">
        <SanctuaryWorksOrganizer
          works={songs}
          mode={orgMode}
          onModeChange={setOrgMode}
          currentTrackId={currentTrackId}
          isPlaying={playerState.isPlaying}
          onPlay={playOne}
          isOwner={isOwner}
          handle={creator.artistHandle}
        />

        <SanctuaryPlaylists
          playlists={playlists}
          isOwner={isOwner}
          handle={creator.artistHandle}
        />

        <div className="mt-16">
          <DomainRenderer
            userId={creator.id}
            isOwner={isOwner}
            allowedBlockTypes={LOOP_DOMAIN_ALLOWED_BLOCKS}
            omitBlockTypes={["hero", "bio", "shelf_music"]}
          />
        </div>
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
    </div>
  );
}
