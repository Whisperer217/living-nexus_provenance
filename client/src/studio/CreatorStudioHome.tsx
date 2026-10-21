import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import {
  Archive,
  ArrowRight,
  BookOpen,
  Download,
  ExternalLink,
  FilePlus2,
  FolderKanban,
  Landmark,
  LibraryBig,
  Loader2,
  Music2,
  Pencil,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useWorkEditorActions } from "@/contexts/WorkEditorContext";
import type { CreativeDrawerSong } from "@/components/CreativeDrawer";

const PROVENANCE_PLAYER_URL = "https://provenanceplayer.netlify.app/#/home";

function asCreativeDrawerSong(song: any): CreativeDrawerSong {
  return {
    id: song.id,
    title: song.title,
    genre: song.genre ?? null,
    caption: song.caption ?? null,
    coverArtUrl: song.coverArtUrl ?? null,
    aiConsent: song.aiConsent ?? null,
    status: song.status || "Published",
    lyricsText: song.lyricsText ?? null,
    haaiOriginStory: song.haaiOriginStory ?? null,
    aiDisclosure: song.aiDisclosure ?? null,
    participationMusic: song.participationMusic ?? null,
    participationLyrics: song.participationLyrics ?? null,
    participationVoice: song.participationVoice ?? null,
    contentType: song.contentType ?? "audio",
    releaseDate: song.releaseDate ?? null,
    creatorReleaseDate: song.creatorReleaseDate ?? null,
    description: song.description ?? null,
    witnessId: song.witnessId ?? null,
    videoUrl: song.videoUrl ?? null,
    videoWitnessId: song.videoWitnessId ?? null,
    externalLinksJson: song.externalLinksJson ?? null,
    downloadPermission: song.downloadPermission ?? null,
    downloadTipThresholdCents: song.downloadTipThresholdCents ?? null,
  };
}

function StudioLinkCard({
  href,
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
}: {
  href: string;
  icon: typeof Music2;
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
}) {
  return (
    <Link href={href}>
      <span
        className="group flex min-h-40 min-w-0 flex-col rounded-2xl border p-5 transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
        style={{
          borderColor: "rgba(196,154,40,0.25)",
          background: "linear-gradient(145deg, rgba(196,154,40,0.08), rgba(255,255,255,0.018))",
          boxShadow: "0 14px 35px rgba(0,0,0,0.16)",
        }}
      >
        <span className="flex items-start justify-between gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)", background: "rgba(196,154,40,0.08)" }}
          >
            <Icon size={19} aria-hidden />
          </span>
          <ArrowRight className="mt-1 transition-transform group-hover:translate-x-1" size={17} style={{ color: "var(--ln-gold)" }} aria-hidden />
        </span>
        <span className="mt-5 text-[10px] font-semibold tracking-[0.18em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
          {eyebrow}
        </span>
        <span className="mt-1 text-lg leading-tight" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
          {title}
        </span>
        <span className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
          {description}
        </span>
        {meta && <span className="mt-auto pt-4 text-xs" style={{ color: "color-mix(in srgb, var(--ln-gold) 70%, var(--ln-smoke))" }}>{meta}</span>}
      </span>
    </Link>
  );
}

/**
 * Same-origin Creator Studio composition root.
 *
 * This module intentionally owns no registry, persistence, playback, or
 * authorization logic. It is a separately lazy-loaded frontend surface that
 * uses the existing protected tRPC contracts and links to canonical editors.
 * Its module boundary is suitable for a later independent build only after a
 * separately reviewed cross-origin session and transport plan.
 */
export default function CreatorStudioHome() {
  const { user, loading, isAuthenticated } = useAuth();
  const { openEditor } = useWorkEditorActions();
  const worksQuery = trpc.songs.mySongs.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const draftReleasesQuery = trpc.releaseDrafts.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const playlistsQuery = trpc.playlists.mine.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center" aria-label="Loading Creator Studio">
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--ln-gold)" }} aria-hidden />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <p className="text-[11px] font-semibold tracking-[0.22em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>CREATOR STUDIO</p>
        <h1 className="mt-3 text-3xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Steward your Creator Domain</h1>
        <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
          Sign in to manage your registered Works, private Draft Releases, named playlists, identity, and archive records.
        </p>
        <a
          href={getLoginUrl("/studio")}
          className="mt-7 inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2"
          style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
        >
          Sign in to Creator Studio
        </a>
      </main>
    );
  }

  const works = (worksQuery.data ?? []) as any[];
  const recentWorks = works.filter((work) => work.status !== "Deleted").slice(0, 5);
  const publishedWorkCount = works.filter((work) => (work.status || "Published") === "Published").length;
  const draftReleases = draftReleasesQuery.data ?? [];
  const playlists = playlistsQuery.data ?? [];
  const creatorHref = user.id ? `/creator/${user.id}` : "/profile";

  return (
    <main className="relative min-h-screen overflow-hidden pb-32">
      <Helmet>
        <title>Creator Studio — Living Nexus</title>
      </Helmet>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]"
        style={{ background: "radial-gradient(ellipse 70% 55% at 20% 0%, rgba(196,154,40,0.14), transparent 72%), radial-gradient(ellipse 45% 45% at 90% 8%, rgba(121,73,33,0.12), transparent 72%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
        <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--ln-smoke)" }}>
          <Link href={creatorHref} className="hover:underline" style={{ color: "var(--ln-gold)" }}>Creator Domain</Link>
          <span aria-hidden>/</span>
          <span>Creator Studio</span>
        </nav>

        <header className="max-w-3xl">
          <p className="text-[11px] font-semibold tracking-[0.24em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>LIVING NEXUS · CREATOR STUDIO</p>
          <h1 className="mt-3 text-3xl leading-tight sm:text-5xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>One creator workspace. One canonical record.</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: "var(--ln-smoke)", fontFamily: "'Cormorant Garamond', serif" }}>
            Organize your existing Works and relationships without duplicating media, changing Witness IDs, or creating a second registry. Each destination remains the established Living Nexus authority for that part of your record.
          </p>
        </header>

        <section aria-labelledby="studio-overview-heading" className="mt-10">
          <h2 id="studio-overview-heading" className="sr-only">Creator Studio destinations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StudioLinkCard href="/manifest" icon={FilePlus2} eyebrow="REGISTER" title="Register a Work" description="Begin a witnessed Work record through the canonical registration flow." />
            <StudioLinkCard href="/creator/collections" icon={LibraryBig} eyebrow="ORGANIZE" title="Collections" description="Shape private Draft Releases and named playlists from existing Works." meta={`${draftReleases.length} draft release${draftReleases.length === 1 ? "" : "s"} · ${playlists.length} playlist${playlists.length === 1 ? "" : "s"}`} />
            <StudioLinkCard href="/profile?tab=identity" icon={Settings} eyebrow="IDENTITY" title="Identity & Domain" description="Tend to your creator biography, testimony, links, and public Creator Domain." />
            <StudioLinkCard href="/my-archive/export" icon={Download} eyebrow="PRESERVE" title="Archive Export" description="Retrieve your records and references through the existing creator export process." />
            <StudioLinkCard href="/settings/payouts" icon={Landmark} eyebrow="SUPPORT" title="Creator Payouts" description="Review the canonical Stripe Connect setup for receiving eligible support." />
            <StudioLinkCard href="/archive?tab=collections" icon={Archive} eyebrow="HISTORY" title="Archive" description="Open historic collections and the existing recovery path for preserved legacy records." />
          </div>
        </section>

        <section aria-labelledby="studio-works-heading" className="mt-12 rounded-2xl border p-4 sm:p-6" style={{ borderColor: "rgba(196,154,40,0.22)", background: "rgba(0,0,0,0.18)" }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>WORKS</p>
              <h2 id="studio-works-heading" className="mt-1 text-2xl" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Tend to recent Works</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
                {publishedWorkCount} published Work{publishedWorkCount === 1 ? "" : "s"}. Editing opens the existing Creator Chapel; it does not create a separate Work or modify playback.
              </p>
            </div>
            <Link href="/manage" className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm focus-visible:outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.28)", color: "var(--ln-gold)" }}>
              <FolderKanban size={15} /> All Works
            </Link>
          </div>

          {worksQuery.isLoading ? (
            <div className="mt-6 h-36 animate-pulse rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
          ) : recentWorks.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed p-6 text-sm" style={{ borderColor: "rgba(196,154,40,0.22)", color: "var(--ln-smoke)" }}>
              No registered Works are available here yet. <Link href="/manifest" className="underline" style={{ color: "var(--ln-gold)" }}>Register your first Work.</Link>
            </div>
          ) : (
            <ul className="mt-6 divide-y" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {recentWorks.map((work) => (
                <li key={work.id} className="flex min-w-0 flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: "rgba(196,154,40,0.09)" }}>
                    {work.coverArtUrl ? <img src={work.coverArtUrl} alt="" className="h-full w-full object-cover" /> : <Music2 className="m-3" size={24} style={{ color: "var(--ln-gold)" }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm sm:text-base" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{work.title}</p>
                    <p className="mt-1 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-xs" style={{ color: "var(--ln-smoke)" }}>
                      <span>{work.status || "Published"}</span>
                      {work.witnessId && <span className="max-w-full truncate font-mono" style={{ color: "rgba(196,154,40,0.68)" }}>{work.witnessId}</span>}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Link href={`/song/${work.id}`} className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs focus-visible:outline-none focus-visible:ring-2" style={{ color: "var(--ln-smoke)" }}>Open</Link>
                    <button
                      type="button"
                      onClick={() => openEditor(asCreativeDrawerSong(work))}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs focus-visible:outline-none focus-visible:ring-2"
                      style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)", background: "rgba(196,154,40,0.05)" }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="studio-boundary-heading" className="mt-8 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "rgba(196,154,40,0.2)", background: "rgba(196,154,40,0.04)" }}>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em]" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}><ShieldCheck size={14} /> ONE AUTHORITY</p>
            <h2 id="studio-boundary-heading" className="mt-2 text-lg" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>The record stays in Living Nexus.</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>The companion player remains an external experimental listening surface. It does not synchronize accounts, verify WIDs, or replace the Living Nexus queue.</p>
          </div>
          <a href={PROVENANCE_PLAYER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm focus-visible:outline-none focus-visible:ring-2" style={{ borderColor: "rgba(196,154,40,0.34)", color: "var(--ln-gold)" }}>
            <Sparkles size={15} /> Open Provenance Player <ExternalLink size={13} aria-hidden />
          </a>
        </section>
      </div>
    </main>
  );
}
