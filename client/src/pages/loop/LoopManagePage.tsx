/**
 * Loop Manage — Creator works & profile management hub
 * One job: manage registered music works and creator identity.
 */

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "wouter";
import {
  Archive,
  Download,
  ExternalLink,
  Loader2,
  Music,
  Pencil,
  Play,
  Plus,
  Settings,
  Shield,
  BookOpen,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import { useWorkEditorActions } from "@/contexts/WorkEditorContext";
import { LOOP_PRODUCT, GUIDE_PRODUCT, PNA_PRODUCT } from "@/lib/loopProduct";
import { trpc } from "@/lib/trpc";

type StatusFilter = "all" | "Published" | "Draft" | "Unlisted";

function statusColor(status: string) {
  if (status === "Published") return "#4ADE80";
  if (status === "Draft") return "#D4A84B";
  if (status === "Unlisted") return "#C8B98A";
  return "color-mix(in srgb, var(--ln-parchment) 45%, transparent)";
}

export default function LoopManagePage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { addAndPlay } = usePlayer();
  const { openEditor } = useWorkEditorActions();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const utils = trpc.useUtils();

  const { data: songs, isLoading, refetch } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const updateStatus = trpc.songs.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
      utils.songs.discover.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const works = useMemo(() => {
    const list = (songs ?? []) as any[];
    if (filter === "all") return list;
    return list.filter((s) => (s.status || "Published") === filter);
  }, [songs, filter]);

  const published = (songs ?? []).filter((s: any) => (s.status || "Published") === "Published").length;
  const drafts = (songs ?? []).filter((s: any) => s.status === "Draft").length;
  const withWid = (songs ?? []).filter((s: any) => !!s.witnessId).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p
            className="text-[11px] uppercase tracking-[0.28em] mb-3"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            {LOOP_PRODUCT.name}
          </p>
          <h1
            className="text-3xl mb-3"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            Manage your works
          </h1>
          <p className="mb-8" style={{ color: "color-mix(in srgb, var(--ln-parchment) 65%, transparent)", fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
            Sign in to register music, edit provenance, and steward your archive.
          </p>
          <a
            href={getLoginUrl("/manage")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
            style={{ background: "var(--ln-gold)", color: "#0A0806" }}
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  const handle = user?.artistHandle || user?.name || "creator";
  const profileHref = user?.id ? `/creator/${user.id}` : "/profile";

  return (
    <div className="min-h-screen relative overflow-hidden">
      <Helmet>
        <title>Manage — {LOOP_PRODUCT.fullName}</title>
      </Helmet>

      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% -10%, rgba(196,154,40,0.14), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 20%, rgba(196,154,40,0.06), transparent 50%), linear-gradient(180deg, #050505 0%, #000 40%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-28">
        {/* Header */}
        <header className="mb-10">
          <p
            className="text-[11px] uppercase tracking-[0.3em] mb-3"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            {LOOP_PRODUCT.name} · Management
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1
                className="text-4xl sm:text-5xl leading-tight mb-2"
                style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
              >
                Your works
              </h1>
              <p
                style={{
                  color: "color-mix(in srgb, var(--ln-parchment) 65%, transparent)",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  maxWidth: 420,
                }}
              >
                Register music. Seal provenance. Keep the record.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/manifest">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-transform hover:scale-[1.02]"
                  style={{ background: "var(--ln-gold)", color: "#0A0806" }}
                >
                  <Plus size={16} /> Register work
                </button>
              </Link>
              <Link href={profileHref}>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm"
                  style={{
                    border: "1px solid rgba(196,154,40,0.35)",
                    color: "var(--ln-parchment)",
                    background: "rgba(196,154,40,0.06)",
                  }}
                >
                  View profile
                </button>
              </Link>
            </div>
          </div>
        </header>

        {/* Stats strip — not cards; typographic metrics */}
        <div
          className="grid grid-cols-3 gap-6 mb-10 py-6"
          style={{ borderTop: "1px solid rgba(196,154,40,0.15)", borderBottom: "1px solid rgba(196,154,40,0.15)" }}
        >
          {[
            { label: "Published", value: published },
            { label: "Drafts", value: drafts },
            { label: "WIDs sealed", value: withWid },
          ].map((s) => (
            <div key={s.label}>
              <div
                className="text-3xl sm:text-4xl tabular-nums"
                style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}
              >
                {s.value}
              </div>
              <div
                className="text-[11px] uppercase tracking-[0.18em] mt-1"
                style={{ color: "color-mix(in srgb, var(--ln-parchment) 45%, transparent)" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          {[
            { href: "/archive", icon: Archive, label: "Archive" },
            { href: "/my-archive/export", icon: Download, label: "Export" },
            { href: "/profile", icon: Settings, label: "Identity" },
            { href: GUIDE_PRODUCT.path, icon: BookOpen, label: GUIDE_PRODUCT.name },
            { href: PNA_PRODUCT.path, icon: Sparkles, label: PNA_PRODUCT.name },
            { href: "/settings/billing", icon: Shield, label: "Billing" },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <span
                className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-100 opacity-75"
                style={{ color: "var(--ln-parchment)" }}
                title={a.href === GUIDE_PRODUCT.path ? GUIDE_PRODUCT.fullName : a.href === PNA_PRODUCT.path ? PNA_PRODUCT.fullName : undefined}
              >
                <a.icon size={14} style={{ color: "var(--ln-gold)" }} />
                {a.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(["all", "Published", "Draft", "Unlisted"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors"
              style={{
                color: filter === f ? "var(--ln-gold)" : "color-mix(in srgb, var(--ln-parchment) 45%, transparent)",
                borderBottom: filter === f ? "1px solid var(--ln-gold)" : "1px solid transparent",
              }}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* Works list */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin" style={{ color: "var(--ln-gold)" }} />
          </div>
        ) : works.length === 0 ? (
          <div className="py-20 text-center">
            <Music className="mx-auto mb-4 opacity-40" size={36} style={{ color: "var(--ln-gold)" }} />
            <p
              className="text-xl mb-2"
              style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
            >
              No works yet
            </p>
            <p className="mb-6" style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)", fontFamily: "'Cormorant Garamond', serif", fontSize: 18 }}>
              Drop a track into {LOOP_PRODUCT.name} and seal its provenance.
            </p>
            <Link href="/manifest">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--ln-gold)", color: "#0A0806" }}
              >
                <Upload size={16} /> Register your first work
              </button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-0">
            {works.map((song: any, index: number) => {
              const status = song.status || "Published";
              return (
                <li
                  key={song.id}
                  className="group flex items-center gap-3 sm:gap-4 py-4"
                  style={{
                    borderBottom: "1px solid rgba(196,154,40,0.1)",
                    animation: `loopFadeUp 420ms ease both`,
                    animationDelay: `${Math.min(index, 12) * 35}ms`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!song.fileUrl) return;
                      addAndPlay({
                        id: String(song.id),
                        title: song.title,
                        artist: handle,
                        genre: song.genre || "",
                        artUrl: song.coverArtUrl || undefined,
                        audioUrl: song.fileUrl || "",
                        witnessId: song.witnessId || undefined,
                      });
                    }}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 overflow-hidden rounded-sm"
                    style={{ background: "#111" }}
                    aria-label={`Play ${song.title}`}
                  >
                    {song.coverArtUrl ? (
                      <img
                        src={song.coverArtUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${song.coverPositionX ?? 50}% ${song.coverPositionY ?? 50}%`,
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={18} style={{ color: "var(--ln-gold)", opacity: 0.5 }} />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={16} fill="currentColor" style={{ color: "var(--ln-gold)" }} />
                    </span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <Link href={`/song/${song.id}`}>
                      <span
                        className="block truncate text-base sm:text-lg hover:underline"
                        style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                      >
                        {song.title}
                      </span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--ln-parchment) 50%, transparent)" }}>
                      <span style={{ color: statusColor(status) }}>{status}</span>
                      {song.genre && <span>{song.genre}</span>}
                      {song.witnessId && (
                        <Link href={`/verify/${song.witnessId}`}>
                          <span className="inline-flex items-center gap-1" style={{ color: "var(--ln-gold)" }}>
                            <Shield size={10} />
                            <span className="font-mono text-[10px] truncate max-w-[140px]">{song.witnessId}</span>
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <select
                      value={status}
                      onChange={(e) =>
                        updateStatus.mutate({ songId: song.id, status: e.target.value as any })
                      }
                      className="hidden sm:block text-[11px] bg-transparent px-2 py-1 outline-none"
                      style={{
                        color: "color-mix(in srgb, var(--ln-parchment) 70%, transparent)",
                        border: "1px solid rgba(196,154,40,0.2)",
                      }}
                      aria-label="Work status"
                    >
                      <option value="Published">Published</option>
                      <option value="Draft">Draft</option>
                      <option value="Unlisted">Unlisted</option>
                    </select>
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
                          status,
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
                      className="p-2 rounded-full hover:bg-white/[0.06]"
                      title="Edit work"
                    >
                      <Pencil size={14} style={{ color: "var(--ln-gold)" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/song/${song.id}`)}
                      className="p-2 rounded-full hover:bg-white/[0.06]"
                      title="Open work"
                    >
                      <ExternalLink size={14} style={{ color: "color-mix(in srgb, var(--ln-parchment) 55%, transparent)" }} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <style>{`
        @keyframes loopFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
