/**
 * CreatorDomainHub
 *
 * The hub architecture for the Creator Domain.
 * One screen. Zero hunting. Every module a one-tap portal.
 *
 * Design principles:
 *   • Desktop: cinematic grid — 4-col module cards with count badges and cover previews
 *   • Mobile: 2-col thumb-first grid
 *   • Creator Mode: all 11 modules visible; empty at 40% opacity with "Register" CTA
 *   • Visitor Mode: only modules with count > 0 are shown (no empty clutter)
 *   • Same-page sections: scrollIntoView (no hash navigation that resets the page)
 *   • Separate pages (Visual Works, etc.): real route navigation
 */
import { useLocation } from "wouter";
import {
  Music2, FileText, BookOpen, Layers, Gamepad2, ListMusic,
  Album, MessageSquareQuote, Users, Image, Activity,
  ChevronRight, Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Module definition ────────────────────────────────────────────────────────

type NavAction =
  | { type: "scroll"; sectionId: string }   // scrollIntoView on the same page
  | { type: "route"; path: string };         // wouter navigate to a different page

interface ModuleDef {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  nav: (creatorHandle: string) => NavAction;
  registerPath?: string;
  registerLabel?: string;
}

const MODULES: ModuleDef[] = [
  {
    key: "music",
    label: "Music",
    sublabel: "Tracks & singles",
    icon: Music2,
    color: "#C49A28",
    nav: () => ({ type: "scroll", sectionId: "section-music" }),
    registerPath: "/upload",
    registerLabel: "Register your first track",
  },
  {
    key: "collections",
    label: "Albums",
    sublabel: "Collections & albums",
    icon: Album,
    color: "#A78BFA",
    nav: () => ({ type: "scroll", sectionId: "section-collections" }),
    registerPath: "/upload",
    registerLabel: "Create your first album",
  },
  {
    key: "playlists",
    label: "Playlists",
    sublabel: "Curated sequences",
    icon: ListMusic,
    color: "#34D399",
    nav: () => ({ type: "scroll", sectionId: "section-playlists" }),
    registerPath: "/playlists/new",
    registerLabel: "Build your first playlist",
  },
  {
    key: "manuscripts",
    label: "Books",
    sublabel: "Manuscripts & prose",
    icon: BookOpen,
    color: "#F97316",
    nav: () => ({ type: "scroll", sectionId: "section-books" }),
    registerPath: "/upload?type=manuscript",
    registerLabel: "Register your first book",
  },
  {
    key: "comics",
    label: "Comics",
    sublabel: "Sequential art",
    icon: Layers,
    color: "#EC4899",
    nav: () => ({ type: "scroll", sectionId: "section-comics" }),
    registerPath: "/upload?type=comic",
    registerLabel: "Register your first comic",
  },
  {
    key: "lyrics",
    label: "Lyrics",
    sublabel: "Written works",
    icon: FileText,
    color: "#60A5FA",
    nav: () => ({ type: "scroll", sectionId: "section-lyrics" }),
    registerPath: "/upload?type=lyrics",
    registerLabel: "Register your first lyrics",
  },
  {
    key: "games",
    label: "Games",
    sublabel: "Interactive works",
    icon: Gamepad2,
    color: "#FBBF24",
    nav: () => ({ type: "scroll", sectionId: "section-games" }),
    registerPath: "/upload?type=game",
    registerLabel: "Register your first game",
  },
  {
    key: "visual",
    label: "Visual Works",
    sublabel: "Art & image collections",
    icon: Image,
    color: "#FDA4AF",
    nav: (handle) => ({ type: "route", path: `/visual-works?creator=${handle}` }),
    registerPath: "/visual-works/new",
    registerLabel: "Register your first collection",
  },
  {
    key: "testimony",
    label: "Testimony",
    sublabel: "Creator statements",
    icon: MessageSquareQuote,
    color: "#818CF8",
    nav: () => ({ type: "scroll", sectionId: "section-testimony" }),
    registerPath: "/testimony/new",
    registerLabel: "Write your first testimony",
  },
  {
    key: "witnesses",
    label: "Witnesses",
    sublabel: "Your witness community",
    icon: Users,
    color: "#6EE7B7",
    nav: () => ({ type: "scroll", sectionId: "section-witnesses" }),
  },
  {
    key: "activity",
    label: "Recent Activity",
    sublabel: "Latest manifestations",
    icon: Activity,
    color: "#94A3B8",
    nav: () => ({ type: "scroll", sectionId: "section-activity" }),
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubModule {
  count: number;
  previews: { id: number; title: string; coverArtUrl: string | null; wid: string | null }[];
}

interface HubData {
  totalPlays: number;
  modules: Record<string, HubModule>;
}

interface Props {
  creatorId: number;
  creatorHandle: string;
  isOwner: boolean;
}

// ─── Module Card ─────────────────────────────────────────────────────────────

function ModuleCard({
  def,
  mod,
  creatorHandle,
  isOwner,
}: {
  def: ModuleDef;
  mod: HubModule | undefined;
  creatorHandle: string;
  isOwner: boolean;
}) {
  const [, navigate] = useLocation();
  const count = mod?.count ?? 0;
  const previews = mod?.previews ?? [];
  const isEmpty = count === 0;
  const Icon = def.icon;

  const handleClick = () => {
    // Empty card + owner → go to registration page
    if (isEmpty && isOwner && def.registerPath) {
      navigate(def.registerPath);
      return;
    }

    const action = def.nav(creatorHandle);

    if (action.type === "scroll") {
      // Smooth scroll to the section on the same page — no page reset
      const el = document.getElementById(action.sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Navigate to a separate page
      navigate(action.path);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 active:scale-95"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid rgba(255,255,255,${isEmpty ? "0.06" : "0.10"})`,
        opacity: isEmpty ? 0.42 : 1,
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 50%, ${def.color}12 0%, transparent 70%)` }}
      />

      {/* Cover art strip — up to 3 thumbnails */}
      {previews.length > 0 && (
        <div className="flex h-16 sm:h-20 overflow-hidden">
          {previews.slice(0, 3).map((p, i) => (
            <div
              key={p.id}
              className="flex-1 relative"
              style={{ opacity: 1 - i * 0.15 }}
            >
              {p.coverArtUrl ? (
                <img
                  src={p.coverArtUrl}
                  alt={p.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: `${def.color}18` }}
                >
                  <Icon className="w-5 h-5 opacity-30" />
                </div>
              )}
            </div>
          ))}
          {/* Fill remaining slots with tinted empty divs */}
          {Array.from({ length: Math.max(0, 3 - previews.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex-1"
              style={{ background: `${def.color}08` }}
            />
          ))}
        </div>
      )}

      {/* Card body */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${def.color}18` }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div
                className="font-heading text-xs sm:text-sm font-semibold leading-tight"
                style={{ color: "rgba(255,255,255,0.92)" }}
              >
                {def.label}
              </div>
              <div className="text-xs mt-0.5 truncate hidden sm:block" style={{ color: "rgba(255,255,255,0.38)" }}>
                {def.sublabel}
              </div>
            </div>
          </div>

          {/* Count badge or Add CTA */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {isEmpty && isOwner && def.registerPath ? (
              <div
                className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: `${def.color}20`, color: def.color }}
              >
                <Plus className="w-3 h-3" />
              </div>
            ) : count > 0 ? (
              <div
                className="text-xs font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: `${def.color}15`,
                  color: def.color,
                  border: `1px solid ${def.color}30`,
                }}
              >
                {count}
              </div>
            ) : null}
            <ChevronRight
              className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all"
              style={{ color: def.color }}
            />
          </div>
        </div>

        {/* Empty owner CTA text */}
        {isEmpty && isOwner && def.registerLabel && (
          <p className="mt-1.5 text-xs" style={{ color: `${def.color}80` }}>
            {def.registerLabel}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Hub ─────────────────────────────────────────────────────────────────────

export function CreatorDomainHub({ creatorId, creatorHandle, isOwner }: Props) {
  const { data: hub, isLoading } = trpc.profile.creatorHub.useQuery(
    { creatorId },
    { staleTime: 60_000, enabled: creatorId > 0 }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        ))}
      </div>
    );
  }

  const modules = (hub as HubData | undefined)?.modules ?? {};
  const totalPlays = (hub as HubData | undefined)?.totalPlays ?? 0;

  // ── Visitor mode: hide empty modules ──────────────────────────────────────
  // Owners always see all modules (to manage and build their archive).
  // Visitors only see modules that have at least one published work.
  const visibleModules = isOwner
    ? MODULES
    : MODULES.filter((def) => (modules[def.key]?.count ?? 0) > 0);

  if (!isOwner && visibleModules.length === 0) {
    return null; // Nothing to show visitors yet
  }

  // Compute total registered works across content-type modules
  const totalWorks =
    (modules.music?.count ?? 0) +
    (modules.lyrics?.count ?? 0) +
    (modules.manuscripts?.count ?? 0) +
    (modules.comics?.count ?? 0) +
    (modules.games?.count ?? 0) +
    (modules.visual?.count ?? 0);

  return (
    <div className="space-y-4">
      {/* ── Quick stats strip ── */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
        {totalWorks > 0 && (
          <span>
            <span className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{totalWorks}</span>
            {" "}registered work{totalWorks !== 1 ? "s" : ""}
          </span>
        )}
        {totalPlays > 0 && (
          <span>
            <span className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
              {totalPlays.toLocaleString()}
            </span>
            {" "}plays
          </span>
        )}
        {(modules.witnesses?.count ?? 0) > 0 && (
          <span>
            <span className="font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
              {modules.witnesses!.count}
            </span>
            {" "}witness{modules.witnesses!.count !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      {/* ── Module grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {visibleModules.map((def) => (
          <ModuleCard
            key={def.key}
            def={def}
            mod={modules[def.key]}
            creatorHandle={creatorHandle}
            isOwner={isOwner}
          />
        ))}
      </div>
    </div>
  );
}
