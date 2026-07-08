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
 *   • Navigation: every card is a real <a> link — one card, one destination, zero JS
 *   • Same-page sections: href="#section-id" — browser handles scroll natively
 *   • Separate pages (Visual Works, Playlists, etc.): real route hrefs
 *
 * Root cause of previous bug: scrollIntoView targeted IDs that did not exist in the DOM.
 * Fix: use native <a href="#section-id"> anchors. The browser finds the element by ID
 * and scrolls to it reliably. No JS, no navigate(), no DOM queries.
 */
import { Link } from "wouter";
import {
  Music2, FileText, BookOpen, Layers, Gamepad2, ListMusic,
  Album, MessageSquareQuote, Users, Image, Activity,
  ChevronRight, Plus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Module definition ────────────────────────────────────────────────────────

interface ModuleDef {
  key: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  /**
   * href(creatorHandle) returns the navigation destination.
   *
   * For sections on the creator profile page: "#section-id"
   * For separate pages: "/route?params"
   *
   * Using plain href strings means the browser handles navigation natively —
   * no JS, no navigate(), no scrollIntoView(), no DOM queries.
   */
  href: (creatorHandle: string) => string;
  registerHref?: string;
  registerLabel?: string;
}

const MODULES: ModuleDef[] = [
  {
    key: "music",
    label: "Music",
    sublabel: "Tracks & singles",
    icon: Music2,
    color: "#C49A28",
    href: () => "#section-music",
    registerHref: "/upload",
    registerLabel: "Register your first track",
  },
  {
    key: "collections",
    label: "Albums",
    sublabel: "Collections & albums",
    icon: Album,
    color: "#A78BFA",
    href: () => "#section-albums",
    registerHref: "/upload",
    registerLabel: "Create your first album",
  },
  {
    key: "playlists",
    label: "Playlists",
    sublabel: "Curated sequences",
    icon: ListMusic,
    color: "#34D399",
    href: () => "/playlists",
    registerHref: "/playlists/new",
    registerLabel: "Build your first playlist",
  },
  {
    key: "manuscripts",
    label: "Books",
    sublabel: "Manuscripts & prose",
    icon: BookOpen,
    color: "#F97316",
    href: () => "#section-books",
    registerHref: "/upload?type=manuscript",
    registerLabel: "Register your first book",
  },
  {
    key: "comics",
    label: "Comics",
    sublabel: "Sequential art",
    icon: Layers,
    color: "#EC4899",
    href: () => "#section-books",
    registerHref: "/upload?type=comic",
    registerLabel: "Register your first comic",
  },
  {
    key: "lyrics",
    label: "Lyrics",
    sublabel: "Written works",
    icon: FileText,
    color: "#60A5FA",
    href: () => "#section-standalone",
    registerHref: "/upload?type=lyrics",
    registerLabel: "Register your first lyrics",
  },
  {
    key: "games",
    label: "Games",
    sublabel: "Interactive works",
    icon: Gamepad2,
    color: "#FBBF24",
    href: () => "#section-games",
    registerHref: "/upload?type=game",
    registerLabel: "Register your first game",
  },
  {
    key: "visual",
    label: "Visual Works",
    sublabel: "Art & image collections",
    icon: Image,
    color: "#FDA4AF",
    href: (handle) => `/visual-works?creator=${handle}`,
    registerHref: "/visual-works/new",
    registerLabel: "Register your first collection",
  },
  {
    key: "testimony",
    label: "Testimony",
    sublabel: "Creator statements",
    icon: MessageSquareQuote,
    color: "#818CF8",
    href: () => "#section-testimony",
    registerHref: "/testimony/new",
    registerLabel: "Write your first testimony",
  },
  {
    key: "witnesses",
    label: "Witnesses",
    sublabel: "Your witness community",
    icon: Users,
    color: "#6EE7B7",
    href: (handle) => `/creator/${handle}#section-testimony`,
  },
  {
    key: "activity",
    label: "Recent Activity",
    sublabel: "Latest manifestations",
    icon: Activity,
    color: "#94A3B8",
    href: () => "#section-music",
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
  const count = mod?.count ?? 0;
  const previews = mod?.previews ?? [];
  const isEmpty = count === 0;
  const Icon = def.icon;

  // Determine the navigation destination.
  // Empty card + owner → go to registration page.
  // Otherwise → go to the module's content destination.
  const destination = isEmpty && isOwner && def.registerHref
    ? def.registerHref
    : def.href(creatorHandle);

  const cardContent = (
    <>
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
            {isEmpty && isOwner && def.registerHref ? (
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
    </>
  );

  const cardClassName =
    "group relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 active:scale-95 block";

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: `1px solid rgba(255,255,255,${isEmpty ? "0.06" : "0.10"})`,
    opacity: isEmpty ? 0.42 : 1,
    textDecoration: "none",
  };

  // Hash anchors (#section-id) work as plain <a> tags — browser scrolls natively.
  // External routes use wouter <Link> for client-side navigation.
  if (destination.startsWith("#")) {
    return (
      <a
        href={destination}
        className={cardClassName}
        style={cardStyle}
        onClick={(e) => {
          // Smooth scroll for same-page anchors
          const targetId = destination.slice(1);
          const el = document.getElementById(targetId);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          // If element not found, let the browser handle the hash navigation naturally
        }}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={destination} className={cardClassName} style={cardStyle}>
      {cardContent}
    </Link>
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
