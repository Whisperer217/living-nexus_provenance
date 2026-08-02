/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage (Cathedral Edition)
   "Not a feed. The grand hall of human creative contribution."
   ─────────────────────────────────────────────────────────────────
   Architecture:
     I.   Cathedral Header — search, filter, refresh
     II.  Featured Collections (grid)
     III. New Manifestations
     IV.  Music
     V.   Books
     VI.  Research
     VII. Visual Works
     VIII.Film
     IX.  Doctrine
     X.   Recently Witnessed
     XI.  Hidden Gems
     XII. Trending
═══════════════════════════════════════════════════════════════════ */
import React, { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Search, RefreshCw, Shield, Music, BookOpen, Eye, Flame,
  Sparkles, Film, Feather, Star, ChevronRight, LayoutList,
  Headphones, FileText, Image as ImageIcon,
} from "lucide-react";
import { WorkListRow, type WorkListRowItem } from "@/components/WorkListRow";
import type { FeedRow } from "@shared/coreDataTypes";

// ── Section definitions ────────────────────────────────────────────
const SECTIONS = [
  {
    key: "newManifestations" as const,
    title: "New Manifestations",
    subtitle: "Recently registered works across all mediums",
    icon: <Sparkles className="w-5 h-5" />,
    accentColor: "text-[var(--gold)]",
    emptyMessage: "No new manifestations yet",
  },
  {
    key: "music" as const,
    title: "Music",
    subtitle: "Registered audio works — songs, albums, compositions",
    icon: <Music className="w-5 h-5" />,
    accentColor: "text-emerald-400",
    emptyMessage: "No music registered yet",
  },
  {
    key: "books" as const,
    title: "Books",
    subtitle: "Manuscripts, novels, and long-form written works",
    icon: <BookOpen className="w-5 h-5" />,
    accentColor: "text-amber-400",
    emptyMessage: "No books registered yet",
  },
  {
    key: "research" as const,
    title: "Research",
    subtitle: "Academic papers, essays, and written testimony",
    icon: <FileText className="w-5 h-5" />,
    accentColor: "text-sky-400",
    emptyMessage: "No research registered yet",
  },
  {
    key: "visualWorks" as const,
    title: "Visual Works",
    subtitle: "Artwork, photography, and visual creations",
    icon: <ImageIcon className="w-5 h-5" />,
    accentColor: "text-rose-400",
    emptyMessage: "No visual works registered yet",
  },
  {
    key: "film" as const,
    title: "Film",
    subtitle: "Video works, short films, and motion content",
    icon: <Film className="w-5 h-5" />,
    accentColor: "text-orange-400",
    emptyMessage: "No film works registered yet",
  },
  {
    key: "doctrine" as const,
    title: "Doctrine",
    subtitle: "Comics, sequential art, and illustrated works",
    icon: <Feather className="w-5 h-5" />,
    accentColor: "text-violet-400",
    emptyMessage: "No doctrine works registered yet",
  },
  {
    key: "recentlyWitnessed" as const,
    title: "Recently Witnessed",
    subtitle: "Works with active provenance chains and witness records",
    icon: <Eye className="w-5 h-5" />,
    accentColor: "text-teal-400",
    emptyMessage: "No witnessed works yet",
  },
  {
    key: "hiddenGems" as const,
    title: "Hidden Gems",
    subtitle: "Under-discovered creators deserving your attention",
    icon: <Star className="w-5 h-5" />,
    accentColor: "text-yellow-400",
    emptyMessage: "No hidden gems found",
  },
  {
    key: "trending" as const,
    title: "Trending",
    subtitle: "Works gaining momentum across the registry",
    icon: <Flame className="w-5 h-5" />,
    accentColor: "text-red-400",
    emptyMessage: "No trending works yet",
  },
];

type SectionKey = typeof SECTIONS[number]["key"];

// ── Data hook ──────────────────────────────────────────────────────
function useExploreData(seed: number) {
  const { data, isLoading, error, refetch } = trpc.songs.exploreIndex.useQuery(
    { seed },
    { staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false }
  );
  return {
    featured: (data?.featured ?? []) as FeedRow[],
    newManifestations: (data?.newManifestations ?? []) as FeedRow[],
    music: (data?.music ?? []) as FeedRow[],
    books: (data?.books ?? []) as FeedRow[],
    research: (data?.research ?? []) as FeedRow[],
    visualWorks: (data?.visualWorks ?? []) as FeedRow[],
    film: (data?.film ?? []) as FeedRow[],
    doctrine: (data?.doctrine ?? []) as FeedRow[],
    recentlyWitnessed: (data?.recentlyWitnessed ?? []) as FeedRow[],
    hiddenGems: (data?.hiddenGems ?? []) as FeedRow[],
    trending: (data?.trending ?? []) as FeedRow[],
    isLoading,
    error,
    refetch,
  };
}

// ── FeedRow → WorkListRowItem ──────────────────────────────────────
function feedRowToListItem(row: FeedRow): WorkListRowItem {
  return {
    song: {
      id: row.song.id,
      title: row.song.title,
      genre: row.song.genre,
      contentType: row.song.contentType,
      durationSeconds: row.song.durationSeconds,
      coverArtUrl: row.song.coverArtUrl,
      witnessId: row.song.witnessId,
      playCount: row.song.playCount,
      releaseDate: null,
      createdAt: row.song.createdAt,
      fileUrl: row.song.fileUrl,
      stripeAccountStatus: null,
      status: row.song.status,
    },
    creator: row.creator ? {
      id: row.creator.id,
      name: row.creator.name,
      artistHandle: row.creator.artistHandle,
      profilePhotoUrl: row.creator.profilePhotoUrl,
      stripeAccountStatus: row.creator.stripeAccountStatus,
    } : null,
  };
}

// ── Cathedral Section Divider ──────────────────────────────────────
function CathedralDivider({ title, subtitle, icon, accentColor, count }: {
  title: string; subtitle: string; icon: React.ReactNode;
  accentColor: string; count: number;
}) {
  return (
    <div className="relative py-10">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent mb-8" />
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--void-3)] border border-[var(--gold)]/20 flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-2xl font-serif text-[var(--stone-light)] tracking-tight leading-none">
              {title}
            </h2>
            {count > 0 && (
              <span className="text-xs font-mono text-[var(--stone-shadow)] bg-[var(--void-3)] border border-white/8 px-2 py-0.5 rounded-full">
                {count} works
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--stone-shadow)] mt-1.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ── Section list ───────────────────────────────────────────────────
function CathedralSection({ section, rows, search }: {
  section: typeof SECTIONS[number]; rows: FeedRow[]; search: string;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.song.title.toLowerCase().includes(q) ||
      (r.creator?.name ?? "").toLowerCase().includes(q) ||
      (r.creator?.artistHandle ?? "").toLowerCase().includes(q) ||
      (r.song.genre ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (filtered.length === 0 && !search) return null;

  return (
    <section>
      <CathedralDivider
        title={section.title}
        subtitle={section.subtitle}
        icon={section.icon}
        accentColor={section.accentColor}
        count={filtered.length}
      />
      {filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-[var(--stone-shadow)]">{section.emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {/* Column headers — desktop only */}
          <div className="hidden xl:flex items-center gap-3 px-3 pb-2 text-[10px] font-mono text-[var(--stone-shadow)] uppercase tracking-widest border-b border-white/5 mb-1">
            <div className="w-8 flex-shrink-0" />
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1">Title / Creator</div>
            <div className="w-20 flex-shrink-0">Type</div>
            <div className="hidden md:block w-24 flex-shrink-0">Genre</div>
            <div className="hidden lg:block w-14 flex-shrink-0 text-right">Duration</div>
            <div className="w-28 flex-shrink-0 text-right">Date</div>
            <div className="w-20 flex-shrink-0">WID</div>
            <div className="w-28 flex-shrink-0" />
          </div>
          {filtered.map((row, idx) => (
            <WorkListRow key={row.song.id} item={feedRowToListItem(row)} index={idx} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Featured grid ──────────────────────────────────────────────────
function FeaturedStrip({ rows }: { rows: FeedRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[var(--gold)]" />
        <span className="text-xs font-mono text-[var(--gold)] uppercase tracking-widest">Featured</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.slice(0, 8).map((row) => (
          <Link key={row.song.id} to={`/song/${row.song.id}`}>
            <div className="group relative rounded-xl overflow-hidden border border-white/8 bg-[var(--void-3)] hover:border-[var(--gold)]/30 transition-all cursor-pointer aspect-square">
              {row.song.coverArtUrl ? (
                <img src={row.song.coverArtUrl} alt={row.song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-[var(--void-4)] flex items-center justify-center">
                  <Music className="w-8 h-8 text-[var(--stone-shadow)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <p className="text-xs font-medium text-white truncate">{row.song.title}</p>
                <p className="text-[10px] text-white/60 truncate">
                  {row.creator?.artistHandle ? `@${row.creator.artistHandle}` : row.creator?.name}
                </p>
              </div>
              {row.song.witnessId && (
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5 text-[var(--gold)]" />
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────
function CathedralSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-8 h-4 bg-white/5 rounded flex-shrink-0" />
          <div className="w-10 h-10 bg-white/5 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-white/5 rounded w-48" />
            <div className="h-2.5 bg-white/5 rounded w-32" />
          </div>
          <div className="hidden sm:block w-16 h-5 bg-white/5 rounded-full" />
          <div className="hidden md:block w-20 h-3 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function ExplorePage() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const data = useExploreData(seed);

  const handleRefresh = useCallback(() => {
    setSeed(Math.floor(Math.random() * 999999));
    setSearch("");
  }, []);

  const FILTER_CHIPS = [
    { label: "All",       icon: <LayoutList className="w-3 h-3" /> },
    { label: "Music",     icon: <Headphones className="w-3 h-3" /> },
    { label: "Books",     icon: <BookOpen className="w-3 h-3" /> },
    { label: "Research",  icon: <FileText className="w-3 h-3" /> },
    { label: "Visual",    icon: <ImageIcon className="w-3 h-3" /> },
    { label: "Film",      icon: <Film className="w-3 h-3" /> },
    { label: "Doctrine",  icon: <Feather className="w-3 h-3" /> },
  ];

  const visibleSections = useMemo(() => {
    if (activeFilter === "All") return SECTIONS;
    const map: Record<string, SectionKey> = {
      Music: "music", Books: "books", Research: "research",
      Visual: "visualWorks", Film: "film", Doctrine: "doctrine",
    };
    const key = map[activeFilter];
    return key ? SECTIONS.filter(s => s.key === key) : SECTIONS;
  }, [activeFilter]);

  return (
    <div className="min-h-screen bg-[var(--void)]">
      {/* ── Cathedral Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[var(--void)]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between pt-6 pb-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-serif text-[var(--stone-light)] tracking-tight leading-none">
                Explore
              </h1>
              <p className="text-xs text-[var(--stone-shadow)] mt-1 font-mono uppercase tracking-widest">
                The Grand Hall of Human Creative Contribution
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-[var(--stone-shadow)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
          <div className="flex items-center gap-3 pb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--stone-shadow)]" />
              <input
                type="text"
                placeholder="Search works, creators, genres…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--void-3)] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--stone-light)] placeholder:text-[var(--stone-shadow)] focus:outline-none focus:border-[var(--gold)]/40 transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => setActiveFilter(chip.label)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all border ${
                    activeFilter === chip.label
                      ? "bg-[var(--gold)] text-black border-[var(--gold)]"
                      : "bg-transparent text-[var(--stone-shadow)] border-white/10 hover:border-[var(--gold)]/30 hover:text-[var(--stone-mid)]"
                  }`}
                >
                  {chip.icon}
                  <span className="hidden sm:inline">{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32">
        {data.isLoading && (
          <div className="pt-8"><CathedralSkeleton /></div>
        )}
        {data.error && !data.isLoading && (
          <div className="pt-16 text-center">
            <p className="text-[var(--stone-shadow)] text-sm">Could not load the registry. Please try again.</p>
            <button onClick={handleRefresh} className="mt-4 text-[var(--gold)] text-sm hover:underline">Refresh</button>
          </div>
        )}
        {!data.isLoading && !data.error && (
          <>
            {activeFilter === "All" && !search && (
              <div className="pt-8">
                <FeaturedStrip rows={data.featured} />
              </div>
            )}
            {visibleSections.map((section) => (
              <CathedralSection
                key={section.key}
                section={section}
                rows={data[section.key]}
                search={search}
              />
            ))}
            {search && visibleSections.every(s => {
              const q = search.toLowerCase();
              return !data[s.key].some((r: FeedRow) =>
                r.song.title.toLowerCase().includes(q) ||
                (r.creator?.name ?? "").toLowerCase().includes(q) ||
                (r.creator?.artistHandle ?? "").toLowerCase().includes(q)
              );
            }) && (
              <div className="pt-24 text-center">
                <Search className="w-10 h-10 text-[var(--stone-shadow)] mx-auto mb-4" />
                <p className="text-[var(--stone-light)] font-medium">No works found for "{search}"</p>
                <p className="text-sm text-[var(--stone-shadow)] mt-1">Try a different title, creator, or genre.</p>
                <button onClick={() => setSearch("")} className="mt-4 text-[var(--gold)] text-sm hover:underline">Clear search</button>
              </div>
            )}
            <div className="py-16 text-center border-t border-white/5 mt-8">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent mx-auto mb-6" />
              <p className="text-xs font-mono text-[var(--stone-shadow)] uppercase tracking-widest mb-2">Living Nexus</p>
              <p className="text-sm text-[var(--stone-shadow)] max-w-sm mx-auto leading-relaxed">
                Every work is a preserved manifestation. Every creator is a steward.
                Every discovery is intentional.
              </p>
              <button
                onClick={handleRefresh}
                className="mt-6 flex items-center gap-2 text-xs text-[var(--gold)] hover:text-[var(--gold-glow)] transition-colors mx-auto"
              >
                <RefreshCw className="w-3 h-3" />
                Discover something new
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
