/**
 * CreatorCollectionPage.tsx
 *
 * Dedicated collection browsing page for a single creative medium within a Creator Domain.
 * Route: /creator/:handle/:medium
 *   e.g. /creator/solange/music
 *        /creator/solange/albums
 *        /creator/solange/books
 *        /creator/solange/lyrics
 *        /creator/solange/games
 *        /creator/solange/visual
 *        /creator/solange/playlists
 *
 * Design: sovereign cathedral — deep space, gold accents, parchment text.
 * Architecture: one medium, one page, one responsibility.
 */
import React, { useState, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  Music2, FileText, BookOpen, Layers, Gamepad2, ListMusic,
  Album, Image, ChevronLeft, ChevronRight, Play, Search, SortAsc, SortDesc,
  Clock, Hash, Loader2, AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlayer, type Track, type QueueContext } from "@/contexts/PlayerContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Medium configuration ─────────────────────────────────────────────────────
type Medium = "music" | "albums" | "books" | "lyrics" | "games" | "visual" | "playlists";

interface MediumConfig {
  label: string;
  pluralLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  emptyMessage: string;
  emptyOwnerCTA: string;
  emptyOwnerHref: string;
}

const MEDIUM_CONFIG: Record<Medium, MediumConfig> = {
  music: {
    label: "Music",
    pluralLabel: "Tracks",
    icon: Music2,
    color: "#C49A28",
    emptyMessage: "No tracks published yet.",
    emptyOwnerCTA: "Register your first track",
    emptyOwnerHref: "/upload",
  },
  albums: {
    label: "Albums",
    pluralLabel: "Albums",
    icon: Album,
    color: "#A78BFA",
    emptyMessage: "No albums published yet.",
    emptyOwnerCTA: "Create your first album",
    emptyOwnerHref: "/upload",
  },
  books: {
    label: "Books & Comics",
    pluralLabel: "Books & Comics",
    icon: BookOpen,
    color: "#F97316",
    emptyMessage: "No books or comics published yet.",
    emptyOwnerCTA: "Register your first manuscript",
    emptyOwnerHref: "/upload?type=manuscript",
  },
  lyrics: {
    label: "Lyrics",
    pluralLabel: "Lyrics",
    icon: FileText,
    color: "#60A5FA",
    emptyMessage: "No lyrics published yet.",
    emptyOwnerCTA: "Register your first lyrics",
    emptyOwnerHref: "/upload?type=lyrics",
  },
  games: {
    label: "Games",
    pluralLabel: "Games",
    icon: Gamepad2,
    color: "#FBBF24",
    emptyMessage: "No games published yet.",
    emptyOwnerCTA: "Register your first game",
    emptyOwnerHref: "/upload?type=game",
  },
  visual: {
    label: "Visual Works",
    pluralLabel: "Visual Collections",
    icon: Image,
    color: "#FDA4AF",
    emptyMessage: "No visual works published yet.",
    emptyOwnerCTA: "Register your first collection",
    emptyOwnerHref: "/visual-works/new",
  },
  playlists: {
    label: "Playlists",
    pluralLabel: "Playlists",
    icon: ListMusic,
    color: "#34D399",
    emptyMessage: "No public playlists yet.",
    emptyOwnerCTA: "Build your first playlist",
    emptyOwnerHref: "/playlists",
  },
};

const VALID_MEDIUMS = new Set<string>(Object.keys(MEDIUM_CONFIG));

// ─── Work Card (songs / lyrics / books / games) ───────────────────────────────
function WorkCard({ work, onPlay }: { work: any; onPlay?: (work: any) => void }) {
  const canPlay = work.contentType === "audio" || !work.contentType;
  return (
    <Link href={`/song/${work.id}`}>
      <div
        className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Cover art */}
        <div className="aspect-square relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
          {work.coverArtUrl ? (
            <img
              src={work.coverArtUrl}
              alt={work.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="w-8 h-8 opacity-20" style={{ color: "#C49A28" }} />
            </div>
          )}
          {canPlay && onPlay && (
            <button
              onClick={(e) => { e.preventDefault(); onPlay(work); }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <Play className="w-8 h-8" style={{ color: "#C49A28" }} fill="#C49A28" />
            </button>
          )}
        </div>
        {/* Meta */}
        <div className="p-3">
          <p
            className="text-sm font-semibold truncate"
        style={{ color: "var(--ln-parchment, #F5EFD7)", fontFamily: "'Cinzel', serif" }}
              >
                {work.title}
              </p>
              {work.genre && (
                <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {work.genre as string}
                </p>
              )}
              {work.wid && (
                <p className="text-[9px] font-mono mt-1 truncate" style={{ color: "rgba(196,154,40,0.6)" }}>
                  {work.wid as string}
                </p>
              )}
        </div>
      </div>
    </Link>
  );
}

// ─── Album Card ───────────────────────────────────────────────────────────────
function AlbumCard({ collection }: { collection: any }) {
  return (
    <Link href={`/album/${collection.collectionWid}`}>
      <div
        className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(167,139,250,0.15)",
        }}
      >
        <div className="aspect-square relative overflow-hidden" style={{ background: "rgba(167,139,250,0.06)" }}>
          {collection.coverArtUrl ? (
            <img
              src={collection.coverArtUrl}
              alt={collection.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Album className="w-8 h-8 opacity-20" style={{ color: "#A78BFA" }} />
            </div>
          )}
        </div>
        <div className="p-3">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--ln-parchment, #F5EFD7)", fontFamily: "'Cinzel', serif" }}
          >
            {collection.name}
          </p>
          {collection.trackCount != null && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              {collection.trackCount} track{collection.trackCount !== 1 ? "s" : ""}
            </p>
          )}
          {collection.collectionWid && (
            <p className="text-[9px] font-mono mt-1 truncate" style={{ color: "rgba(167,139,250,0.6)" }}>
              {collection.collectionWid}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Visual Card ──────────────────────────────────────────────────────────────
function VisualCard({ item }: { item: any }) {
  return (
    <Link href={`/visual-works/${item.id}`}>
      <div
        className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(253,164,175,0.15)",
        }}
      >
        <div className="aspect-square relative overflow-hidden" style={{ background: "rgba(253,164,175,0.06)" }}>
          {item.coverUrl ? (
            <img
              src={item.coverUrl}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-8 h-8 opacity-20" style={{ color: "#FDA4AF" }} />
            </div>
          )}
        </div>
        <div className="p-3">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--ln-parchment, #F5EFD7)", fontFamily: "'Cinzel', serif" }}
          >
            {item.title}
          </p>
          {item.mediumType && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
              {item.mediumType}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Playlist Card ────────────────────────────────────────────────────────────
function PlaylistCard({ playlist }: { playlist: any }) {
  return (
    <Link href={`/playlist?id=${playlist.id}`}>
      <div
        className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(52,211,153,0.15)",
        }}
      >
        <div className="aspect-square relative overflow-hidden" style={{ background: "rgba(52,211,153,0.06)" }}>
          {playlist.coverArtUrl ? (
            <img
              src={playlist.coverArtUrl}
              alt={playlist.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ListMusic className="w-8 h-8 opacity-20" style={{ color: "#34D399" }} />
            </div>
          )}
        </div>
        <div className="p-3">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--ln-parchment, #F5EFD7)", fontFamily: "'Cinzel', serif" }}
          >
            {playlist.name}
          </p>
          {playlist.description && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
              {playlist.description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CreatorCollectionPage() {
  const { handle, medium } = useParams<{ handle: string; medium: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { playQueueAt } = usePlayer();

  const [search, setSearch] = useState("");
  type SortMode = "newest" | "oldest" | "alpha";
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const PAGE_SIZE = 200;
  const [page, setPage] = useState(0);

  const isValidMedium = VALID_MEDIUMS.has(medium ?? "");
  const med = (medium ?? "music") as Medium;
  const config = MEDIUM_CONFIG[med] ?? MEDIUM_CONFIG.music;
  const Icon = config.icon;

  // Single round-trip: pass handle directly to the server procedure.
  // The server resolves handle → creator internally, eliminating the
  // two-step client-side race condition that caused "Creator not found".
  const isNumericHandle = /^\d+$/.test(handle ?? "");
  const { data, isLoading } = trpc.profile.getCreatorCollection.useQuery(
    isNumericHandle
      ? { creatorId: Number(handle), medium: med, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
      : { handle: handle ?? "", medium: med, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    {
      enabled: !!handle && isValidMedium,
      staleTime: 60_000,
    }
  );

  const creator = data?.creator;
  const resolvedCreatorId = creator?.id ?? 0;
  const isOwner = user?.id === resolvedCreatorId;
  const creatorHandle = creator?.artistHandle || handle || String(resolvedCreatorId);

  // Filter + sort works
  // ── Sort helpers ─────────────────────────────────────────────────────────
  function applySortWorks(arr: any[]) {
    if (sortMode === "alpha") return [...arr].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    if (sortMode === "oldest") return [...arr].reverse();
    return arr; // newest — server already returns newest-first
  }
  function applySortCols(arr: any[]) {
    if (sortMode === "alpha") return [...arr].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sortMode === "oldest") return [...arr].reverse();
    return arr;
  }
  function applySortPlaylists(arr: any[]) {
    if (sortMode === "alpha") return [...arr].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sortMode === "oldest") return [...arr].reverse();
    return arr;
  }

  const displayWorks = useMemo(() => {
    const works = data?.works ?? [];
    const filtered = search
      ? works.filter((w: any) =>
          (w.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (w.genre ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : works;
    return applySortWorks(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.works, search, sortMode]);

  const displayCollections = useMemo(() => {
    const cols = data?.collections ?? [];
    const filtered = search
      ? cols.filter((c: any) =>
          (c.name ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : cols;
    return applySortCols(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.collections, search, sortMode]);

  const displayPlaylists = useMemo(() => {
    const pls = data?.playlists ?? [];
    const filtered = search
      ? pls.filter((p: any) =>
          (p.name ?? "").toLowerCase().includes(search.toLowerCase())
        )
      : pls;
    return applySortPlaylists(filtered);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.playlists, search, sortMode]);

  // Server-provided total (for paginated mediums); fall back to local count for albums/playlists
  const serverTotalCount = (data as any)?.totalCount as number | undefined;
  const totalCount =
    serverTotalCount ?? (displayWorks.length + displayCollections.length + displayPlaylists.length);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  // Reset to page 0 when search or sort changes
  const prevSearch = React.useRef(search);
  const prevSort = React.useRef(sortMode);
  if (prevSearch.current !== search || prevSort.current !== sortMode) {
    prevSearch.current = search;
    prevSort.current = sortMode;
    if (page !== 0) setPage(0);
  }

  // Handle play all (music only)
  const handlePlayAll = () => {
    if (!displayWorks.length) return;
    const queue: Track[] = displayWorks
      .filter((w: any) => w.contentType === "audio" || !w.contentType)
      .map((w: any) => ({
        id: String(w.id),
        title: w.title ?? "Untitled",
        artist: creator?.artistHandle ?? creator?.name ?? "Unknown",
        genre: w.genre ?? "",
        artUrl: w.coverArtUrl ?? undefined,
        audioUrl: w.fileUrl ?? undefined,
        witnessId: w.witnessId ?? undefined,
        contentType: w.contentType ?? "audio",
        creatorId: w.userId,
        creatorRole: creator?.role ?? undefined,
        creatorHandle: creator?.artistHandle ?? undefined,
      }));
    if (queue.length) playQueueAt(queue, 0, "CREATOR_PAGE");
  };

  // Loading state — single query now, no two-step resolution
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ln-void, #0A0806)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#C49A28" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Loading {config.pluralLabel.toLowerCase()}...
          </p>
        </div>
      </div>
    );
  }

  // Not found
  if (!data || !creator) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ln-void, #0A0806)" }}
      >
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 mx-auto" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p style={{ color: "rgba(255,255,255,0.5)" }}>Creator not found.</p>
          <Link href="/">
            <Button style={{ background: "#C49A28", color: "#0A0806" }}>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void, #0A0806)" }}>
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 backdrop-blur-md"
        style={{
          background: "rgba(10,8,6,0.92)",
          borderBottom: `1px solid ${config.color}22`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 min-w-0">
          {/* ── Back to Creator Domain breadcrumb ── */}
          <Link href={`/creator/${creatorHandle}`}>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95 flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.65)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="max-w-[120px] truncate">
                {creator.artistHandle ?? creator.name ?? "Creator"}
              </span>
            </button>
          </Link>

          {/* Separator */}
          <span className="flex-shrink-0" style={{ color: "rgba(255,255,255,0.18)" }}>/</span>

          {/* Medium label */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Icon className="w-4 h-4" style={{ color: config.color }} />
            <span
              className="text-sm font-semibold hidden sm:inline"
              style={{ color: config.color, fontFamily: "'Cinzel', serif" }}
            >
              {config.label}
            </span>
          </div>

          {/* Count badge */}
          {totalCount > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: `${config.color}18`,
                color: config.color,
                border: `1px solid ${config.color}30`,
              }}
            >
              {totalCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Hero strip ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${config.color}10 0%, transparent 100%)`,
          borderBottom: `1px solid ${config.color}18`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Creator avatar */}
            <div
              className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
              style={{ border: `2px solid ${config.color}40` }}
            >
              {creator.profilePhotoUrl ? (
                <img
                  src={creator.profilePhotoUrl}
                  alt={creator.name ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: `${config.color}18` }}
                >
                  <Icon className="w-6 h-6" style={{ color: config.color }} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {creator.artistHandle ? `@${creator.artistHandle}` : creator.name}
              </p>
              <h1
                className="text-2xl md:text-3xl font-bold leading-tight"
                style={{ color: "var(--ln-parchment, #F5EFD7)", fontFamily: "'Cinzel', serif" }}
              >
                {config.label}
              </h1>
              {totalCount > 0 && (
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {totalCount} {config.pluralLabel.toLowerCase()}
                </p>
              )}
            </div>
            {/* Play all (music only) */}
            {med === "music" && displayWorks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                style={{ background: "#C49A28", color: "#0A0806" }}
              >
                <Play className="w-4 h-4" fill="#0A0806" />
                Play All
              </button>
            )}
            {/* Owner CTA for empty state */}
            {isOwner && totalCount === 0 && (
              <Link href={config.emptyOwnerHref}>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
                  style={{ background: config.color, color: "#0A0806" }}
                >
                  {config.emptyOwnerCTA}
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      {totalCount > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${config.pluralLabel.toLowerCase()}...`}
              className="pl-8 h-8 text-xs bg-transparent border-white/10 text-white placeholder:text-white/30 focus:border-white/20"
            />
          </div>
          {/* ── Sort dropdown ── */}
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger
              className="h-8 w-[110px] text-xs border-white/10 focus:ring-0"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              style={{
                background: "#141210",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <SelectItem
                value="newest"
                className="text-xs focus:bg-white/10"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Newest
                </span>
              </SelectItem>
              <SelectItem
                value="oldest"
                className="text-xs focus:bg-white/10"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                <span className="flex items-center gap-1.5">
                  <SortAsc className="w-3 h-3" />
                  Oldest
                </span>
              </SelectItem>
              <SelectItem
                value="alpha"
                className="text-xs focus:bg-white/10"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3" />
                  A → Z
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Content grid ── */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        {/* Empty state */}
        {!isLoading && totalCount === 0 && (
          <div
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <Icon className="w-12 h-12 mb-4 opacity-20" style={{ color: config.color }} />
            <p className="text-base mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              {config.emptyMessage}
            </p>
            {isOwner && (
              <Link href={config.emptyOwnerHref}>
                <button
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: config.color, color: "#0A0806" }}
                >
                  {config.emptyOwnerCTA}
                </button>
              </Link>
            )}
          </div>
        )}

        {/* Works grid (music, lyrics, books, games) */}
        {displayWorks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {displayWorks.map((work: any) => (
              <WorkCard
                key={work.id}
                work={work}
                onPlay={med === "music" ? (w) => {
                  const t: Track = {
                    id: String(w.id),
                    title: w.title ?? "Untitled",
                    artist: creator?.artistHandle ?? creator?.name ?? "Unknown",
                    genre: w.genre ?? "",
                    artUrl: w.coverArtUrl ?? undefined,
                    audioUrl: w.fileUrl ?? undefined,
                    witnessId: w.witnessId ?? undefined,
                    contentType: w.contentType ?? "audio",
                    creatorId: w.userId,
                    creatorRole: creator?.role ?? undefined,
                    creatorHandle: creator?.artistHandle ?? undefined,
                  };
                  playQueueAt([t], 0, "CREATOR_PAGE");
                } : undefined}
              />
            ))}
          </div>
        )}

        {/* Collections grid (albums) */}
        {displayCollections.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {displayCollections.map((col: any) => (
              <AlbumCard key={col.id} collection={col} />
            ))}
          </div>
        )}

        {/* Visual grid */}
        {med === "visual" && displayWorks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {displayWorks.map((item: any) => (
              <VisualCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Playlists grid */}
        {displayPlaylists.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {displayPlaylists.map((pl: any) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        )}

        {/* ── Pagination controls ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-8 pb-4">
            <button
              onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={!hasPrev}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={!hasNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.7)' }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
