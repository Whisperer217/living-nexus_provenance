/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage (§9 Surface map)
   Songs & artists only. Skins / guides / non-music commerce live in PNA Store.
═══════════════════════════════════════════════════════════════════════════ */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useParams, useSearch } from "wouter";
import {
  Search, RefreshCw, Shield, Music, Eye, Flame,
  Sparkles, Star, ChevronRight, ChevronLeft, LayoutList,
  FileText, Users, X, Lock, ArrowDownAZ, CalendarArrowDown, UserRound,
  Play, FileAudio, File, Heart, Loader2, UserPlus, UserCheck,
} from "lucide-react";
import { WorkListRow, type WorkListRowItem } from "@/components/WorkListRow";
import { SupportCreatorDrawer, type SupportTarget } from "@/components/SupportCreatorDrawer";
import type { FeedRow } from "@shared/coreDataTypes";
import { toast } from "sonner";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { DepthAtmosphere } from "@/components/atmosphere/DepthAtmosphere";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function isAudioRow(row: FeedRow): boolean {
  return (row.song.contentType ?? "audio") === "audio";
}

// ── Discoverable work collections ─────────────────────────────────────────
const WORK_COLLECTION_KEYS = ["music"] as const;

// ── Supplemental rows (not columns — shown above the column rail) ─────────
const SUPPLEMENTAL_SECTIONS = [
  { key: "newManifestations" as const, title: "New This Week", icon: <Sparkles className="w-4 h-4" />, accentColor: "text-[var(--gold)]" },
  { key: "trending" as const, title: "Trending", icon: <Flame className="w-4 h-4" />, accentColor: "text-red-400" },
  { key: "recentlyWitnessed" as const, title: "Recently Witnessed", icon: <Eye className="w-4 h-4" />, accentColor: "text-teal-400" },
  { key: "hiddenGems" as const, title: "Hidden Gems", icon: <Star className="w-4 h-4" />, accentColor: "text-yellow-400" },
];

type SupplementalKey = typeof SUPPLEMENTAL_SECTIONS[number]["key"];
type ViewMode = "list" | "creators";
type WorkSort = "curated" | "newest" | "title" | "creator";
type CreatorSort = "newest" | "popular";

const WORK_SORT_OPTIONS: { value: WorkSort; label: string; icon: React.ReactNode }[] = [
  { value: "curated", label: "Registry order", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: "newest", label: "Newest", icon: <CalendarArrowDown className="h-3.5 w-3.5" /> },
  { value: "title", label: "Title A–Z", icon: <ArrowDownAZ className="h-3.5 w-3.5" /> },
  { value: "creator", label: "Creator A–Z", icon: <UserRound className="h-3.5 w-3.5" /> },
];

const CREATOR_SORT_OPTIONS: { value: CreatorSort; label: string; icon: React.ReactNode }[] = [
  { value: "newest", label: "Newest creators", icon: <CalendarArrowDown className="h-3.5 w-3.5" /> },
  { value: "popular", label: "Most popular", icon: <Flame className="h-3.5 w-3.5" /> },
];

function getInitialViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "creators") return "creators";
  // Legacy grid links intentionally resolve to the retained list view.
  return "list";
}

// Curated sections remain intentionally small. The complete Registry lives in
// the cursor-based Works index below, so no route starts by mounting its archive.
const CURATED_SECTION_LIMIT = 16;
const WORK_PAGE_SIZE = 36;

// ── Data hook ──────────────────────────────────────────────────────────────
function useExploreData(seed: number, randomize: boolean, enabled: boolean, creatorId?: number) {
  const { data, isLoading, error, refetch, isFetching } = trpc.songs.exploreIndex.useQuery(
    { seed, limit: CURATED_SECTION_LIMIT, randomize, ...(creatorId ? { creatorId } : {}) },
    { enabled, staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false }
  );
  return useMemo(() => ({
    featured: ((data?.featured ?? []) as FeedRow[]).filter(isAudioRow),
    newManifestations: ((data?.newManifestations ?? []) as FeedRow[]).filter(isAudioRow),
    music: ((data?.music ?? []) as FeedRow[]).filter(isAudioRow),
    recentlyWitnessed: ((data?.recentlyWitnessed ?? []) as FeedRow[]).filter(isAudioRow),
    hiddenGems: ((data?.hiddenGems ?? []) as FeedRow[]).filter(isAudioRow),
    trending: ((data?.trending ?? []) as FeedRow[]).filter(isAudioRow),
    isLoading,
    error,
    isRefreshing: isFetching && !isLoading,
    refetch,
  }), [data, error, isFetching, isLoading, refetch]);
}

function useWorksIndex({
  creatorId,
  randomize,
  search,
  seed,
  sort,
  enabled,
}: {
  creatorId?: number;
  randomize: boolean;
  search: string;
  seed: number;
  sort: WorkSort;
  enabled: boolean;
}) {
  const registrySort = sort === "curated" ? undefined : sort;
  const registryRandomize = sort === "curated" && randomize;
  const query = trpc.songs.discoverInfinite.useInfiniteQuery(
    {
      contentType: "audio",
      creatorId,
      limit: WORK_PAGE_SIZE,
      randomize: registryRandomize,
      seed: registryRandomize ? seed : undefined,
      search: search.trim() || undefined,
      sort: registrySort,
    },
    {
      enabled,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const rows = useMemo(
    () => (query.data?.pages.flatMap((page) => page.items) ?? []) as FeedRow[],
    [query.data]
  );

  return { ...query, rows };
}

function feedRowToListItem(row: FeedRow): WorkListRowItem {
  return {
    song: {
      id: row.song.id, title: row.song.title, genre: row.song.genre,
      contentType: row.song.contentType, durationSeconds: row.song.durationSeconds,
      coverArtUrl: row.song.coverArtUrl, witnessId: row.song.witnessId,
      playCount: row.song.playCount, releaseDate: null, createdAt: row.song.createdAt,
      fileUrl: row.song.fileUrl, stripeAccountStatus: null, status: row.song.status,
    },
    creator: row.creator ? {
      id: row.creator.id, name: row.creator.name, artistHandle: row.creator.artistHandle,
      profilePhotoUrl: row.creator.profilePhotoUrl, stripeAccountStatus: row.creator.stripeAccountStatus,
    } : null,
  };
}

function feedRowToTrack(row: FeedRow): Track {
  const s = row.song;
  const c = row.creator;
  return {
    id: String(s.id),
    title: s.title,
    artist: c?.artistHandle ?? c?.name ?? "Unknown",
    genre: s.genre ?? "",
    audioUrl: s.fileUrl ?? undefined,
    artUrl: s.coverArtUrl ?? undefined,
    witnessId: s.witnessId ?? undefined,
    aiDisclosure: (s.aiDisclosure as Track["aiDisclosure"]) ?? undefined,
    creatorHandle: c?.artistHandle ?? c?.name ?? undefined,
    creatorId: c?.id ?? undefined,
    contentType: (s.contentType as Track["contentType"]) ?? "audio",
    downloadPermission: (s as any).downloadPermission ?? null,
    downloadTipThresholdCents: (s as any).downloadTipThresholdCents ?? null,
  };
}

function ContentTypeIcon({ contentType }: { contentType: string }) {
  switch (contentType) {
    case "audio": return <FileAudio className="w-3.5 h-3.5" />;
    case "lyrics": return <FileText className="w-3.5 h-3.5" />;
    default: return <File className="w-3.5 h-3.5" />;
  }
}

const CONTENT_ACTION: Record<string, { label: string; icon: React.ReactNode }> = {
  audio: { label: "Play", icon: <Play className="w-5 h-5 ml-0.5" fill="currentColor" /> },
};
function getContentAction(contentType?: string) {
  return CONTENT_ACTION[contentType ?? "audio"] ?? CONTENT_ACTION["audio"];
}

// ── Constellation Randomize Switch (unchanged) ────────────────────────────
function RandomizeSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const activeRef = useRef(value);
  const reducedMotion = useReducedMotion();
  useEffect(() => { activeRef.current = value; }, [value]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (reducedMotion) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = 56, H = 28;
      canvas.width = W; canvas.height = H;
      ctx.fillStyle = value ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, H / 2); ctx.fill();
      const thumbX = value ? W - H / 2 - 2 : H / 2 + 2;
      ctx.fillStyle = value ? "#D4AF37" : "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.arc(thumbX, H / 2, H / 2 - 3, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 56, H = 28;
    canvas.width = W; canvas.height = H;
    const stars = Array.from({ length: 18 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.2, pulse: Math.random() * Math.PI * 2,
    }));
    function draw() {
      if (!ctx) return;
      const on = activeRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = on ? "rgba(212,175,55,0.18)" : "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.roundRect(0, 0, W, H, H / 2); ctx.fill();
      if (on) {
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 16) {
              ctx.strokeStyle = `rgba(212,175,55,${0.15 * (1 - dist / 16)})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(stars[j].x, stars[j].y); ctx.stroke();
            }
          }
        }
        stars.forEach((s) => {
          s.pulse += 0.04;
          ctx.fillStyle = `rgba(212,175,55,${s.alpha * (0.7 + 0.3 * Math.sin(s.pulse))})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
          s.x += s.vx; s.y += s.vy;
          if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
          if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
        });
      }
      const thumbX = on ? W - H / 2 - 2 : H / 2 + 2;
      ctx.fillStyle = on ? "#D4AF37" : "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.arc(thumbX, H / 2, H / 2 - 3, 0, Math.PI * 2); ctx.fill();
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [reducedMotion, value]);
  return (
    <button onClick={() => onChange(!value)} title={value ? "Randomized — click for newest" : "Newest first — click to randomize"} aria-label={value ? "Randomized order: on — click for newest first" : "Newest first — click to randomize"} aria-pressed={value} className="flex-shrink-0 focus:outline-none">
      <canvas ref={canvasRef} width={56} height={28} className="rounded-full cursor-pointer block" />
    </button>
  );
}

// ── Creator Filter (unchanged) ─────────────────────────────────────────────
type CreatorSummary = {
  id: number;
  name: string | null;
  artistHandle: string | null;
  profilePhotoUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  stripeAccountStatus: string | null;
  publishedCount: number;
  totalPlays: number;
  createdAt: Date | string | null;
};
function CreatorFilter({ creators, selected, onSelect }: { creators: CreatorSummary[]; selected: number | null; onSelect: (id: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = useMemo(() => {
    if (!query) return creators.slice(0, 30);
    const q = query.toLowerCase();
    return creators.filter(c => (c.artistHandle ?? "").toLowerCase().includes(q) || (c.name ?? "").toLowerCase().includes(q)).slice(0, 20);
  }, [creators, query]);
  const sel = selected ? creators.find(c => c.id === selected) : null;
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selected ? "bg-[var(--gold)]/15 border-[var(--gold)]/40 text-[var(--gold)]" : "bg-transparent border-white/10 text-[var(--stone-shadow)] hover:border-[var(--gold)]/30 hover:text-[var(--stone-mid)]"}`}>
        {sel?.profilePhotoUrl ? <img src={sel.profilePhotoUrl} className="w-4 h-4 rounded-full object-cover" alt="" loading="lazy" decoding="async" /> : <Users className="w-3 h-3" />}
        <span className="hidden sm:inline max-w-[80px] truncate">{sel ? (sel.artistHandle ?? sel.name ?? "Creator") : "Creator"}</span>
        {selected && <X className="w-3 h-3 ml-0.5 hover:text-white" onClick={(e) => { e.stopPropagation(); onSelect(null); setOpen(false); }} />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-[var(--void-2)] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-white/5">
            <input type="text" placeholder="Search creators…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
              className="w-full bg-[var(--void-3)] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[var(--stone-light)] placeholder:text-[var(--stone-shadow)] focus:outline-none focus:border-[var(--gold)]/40" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            <button onClick={() => { onSelect(null); setOpen(false); setQuery(""); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${!selected ? "text-[var(--gold)]" : "text-[var(--stone-shadow)]"}`}>
              <Users className="w-3 h-3" /> All Creators
            </button>
            {filtered.map((c) => (
              <button key={c.id} onClick={() => { onSelect(c.id); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${selected === c.id ? "text-[var(--gold)]" : "text-[var(--stone-light)]"}`}>
                {c.profilePhotoUrl ? <img src={c.profilePhotoUrl} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" loading="lazy" decoding="async" /> : <div className="w-5 h-5 rounded-full bg-[var(--void-3)] flex items-center justify-center flex-shrink-0"><Users className="w-2.5 h-2.5 text-[var(--stone-shadow)]" /></div>}
                <span className="truncate">{c.artistHandle ?? c.name ?? "Unknown"}</span>
                <span className="ml-auto text-[var(--stone-shadow)] font-mono">{c.publishedCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Grid Card ──────────────────────────────────────────────────────────────
function GridCard({ row, queueTracks, queueIndex }: { row: FeedRow; queueTracks?: Track[]; queueIndex?: number }) {
  const { addAndPlay, playQueueAt } = usePlayer();
  const [, navigate] = useLocation();
  const isAudio = row.song.contentType === "audio";
  const hasFile = !!row.song.fileUrl;
  const action = getContentAction(row.song.contentType);

  function handleCardAction(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!isAudio) { navigate(`/song/${row.song.id}`); return; }
    if (!hasFile) { toast.info("No playable file for this work"); return; }
    if (queueTracks && queueTracks.length > 0 && queueIndex !== undefined) {
      playQueueAt(queueTracks, queueIndex, "EXPLORE"); return;
    }
    addAndPlay(feedRowToTrack(row));
  }

  return (
    <div className="group relative w-40 flex-shrink-0 overflow-hidden rounded-xl border border-white/8 bg-[var(--void-3)] transition-all hover:border-[var(--gold)]/30 sm:w-44 xl:w-[12rem]">
      <div className="aspect-square relative overflow-hidden cursor-pointer" onClick={handleCardAction} title={`${action.label} ${row.song.title}`}>
        {row.song.coverArtUrl
          ? <img src={row.song.coverArtUrl} alt={row.song.title} loading="lazy" decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; const fb = e.currentTarget.nextElementSibling as HTMLElement | null; if (fb) fb.style.display = "flex"; }} />
          : null}
        {!row.song.coverArtUrl && <div className="w-full h-full bg-[var(--void-2)] flex items-center justify-center"><Music className="w-8 h-8 text-[var(--stone-shadow)]" /></div>}
        {row.song.coverArtUrl && <div className="w-full h-full bg-[var(--void-2)] items-center justify-center hidden absolute inset-0"><Music className="w-8 h-8 text-[var(--stone-shadow)]" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button onClick={handleCardAction} className="w-12 h-12 rounded-full bg-[var(--gold)] text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform" aria-label={`${action.label} ${row.song.title}`}>{action.icon}</button>
        </div>
        {row.song.witnessId && (
          <div className="absolute top-2 right-2 bg-[var(--gold)]/20 border border-[var(--gold)]/40 rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-[var(--gold)]" /><span className="ln-mono text-[var(--gold)]">WID</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 border border-white/10 rounded-md px-1.5 py-0.5 flex items-center gap-1 text-[var(--stone-shadow)]">
          <ContentTypeIcon contentType={row.song.contentType} />
          <span className="ln-mono uppercase">{row.song.contentType}</span>
        </div>
      </div>
      <div className="p-3">
        <Link href={`/song/${row.song.id}`}>
          <p className="cursor-pointer truncate text-sm font-medium leading-tight text-[var(--stone-light)] transition-colors hover:text-[var(--gold)]">{row.song.title}</p>
        </Link>
        {row.creator ? (
          <Link href={`/creator/${row.creator.id}`}>
            <p className="mt-1 cursor-pointer truncate text-xs text-[var(--stone-shadow)] transition-colors hover:text-[var(--gold)]/70">{row.creator.artistHandle ?? row.creator.name ?? "Unknown"}</p>
          </Link>
        ) : <p className="mt-1 truncate text-xs text-[var(--stone-shadow)]">Unknown</p>}
      </div>
    </div>
  );
}

// ── Column skeleton ────────────────────────────────────────────────────────
function ColumnSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-40 flex-shrink-0 rounded-xl overflow-hidden" style={{ background: "var(--void-3)" }}>
          <div className="aspect-square" style={{ background: "var(--void-2)" }} />
          <div className="p-2.5 space-y-1.5">
            <div className="h-2.5 rounded" style={{ background: "var(--void-2)", width: "80%" }} />
            <div className="h-2 rounded" style={{ background: "var(--void-2)", width: "55%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Supplemental row (horizontal scroll strip) ────────────────────────────
function SupplementalRow({
  section, rows, likedMap, search,
}: {
  section: typeof SUPPLEMENTAL_SECTIONS[number];
  rows: FeedRow[];
  likedMap: Record<number, boolean>;
  search: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.song.title.toLowerCase().includes(q) ||
      (r.creator?.name ?? "").toLowerCase().includes(q) ||
      (r.creator?.artistHandle ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (filtered.length === 0) return null;

  const audioTracks = useMemo(() => filtered.filter(r => !!r.song.fileUrl).map(feedRowToTrack), [filtered]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 600 : -600, behavior: "smooth" });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className={`${section.accentColor}`}>{section.icon}</span>
        <h3 className="ln-subsection-header">{section.title}</h3>
        <span className="ln-mono text-[var(--stone-shadow)]">{filtered.length}</span>
        <div className="flex-1" />
        <button onClick={() => scroll("left")} className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[var(--stone-shadow)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all">
          <ChevronLeft className="w-3 h-3" />
        </button>
        <button onClick={() => scroll("right")} className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[var(--stone-shadow)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all">
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {filtered.map((row) => {
          const qIdx = audioTracks.findIndex(t => t.id === String(row.song.id));
          return <GridCard key={row.song.id} row={row} queueTracks={audioTracks} queueIndex={qIdx >= 0 ? qIdx : undefined} />;
        })}
      </div>
    </div>
  );
}

// ── View Toggle (list / creators) ─────────────────────────────────────────
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const modes: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    { key: "list",    icon: <LayoutList className="w-3.5 h-3.5" />, label: "List" },
    { key: "creators", icon: <Users className="w-3.5 h-3.5" />,       label: "Browse creators" },
  ];
  return (
    <div className="flex items-center gap-0.5 bg-[var(--void-3)] border border-white/8 rounded-xl p-0.5">
      {modes.map((m) => (
        <button key={m.key} onClick={() => onChange(m.key)} title={m.label} aria-label={`${m.label} view`} aria-pressed={value === m.key}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${value === m.key ? "bg-[var(--gold)] text-black" : "text-[var(--stone-shadow)] hover:text-[var(--stone-mid)]"}`}>
          {m.icon}
        </button>
      ))}
    </div>
  );
}

function WorkSortControl({ value, onChange }: { value: WorkSort; onChange: (value: WorkSort) => void }) {
  const selected = WORK_SORT_OPTIONS.find((option) => option.value === value) ?? WORK_SORT_OPTIONS[0];
  const isRegistryOrder = value === "curated";
  return (
    <Tooltip>
      <label
        className={`group flex min-h-11 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-[background-color,border-color,color,box-shadow] duration-200 hover:border-[var(--ln-gold-hot)]/75 hover:bg-[var(--ln-gold)]/20 focus-within:border-[var(--ln-gold-hot)] focus-within:ring-2 focus-within:ring-[var(--ln-gold)]/25 sm:min-h-0 sm:gap-1.5 sm:px-2.5 ${
          isRegistryOrder
            ? "border-[var(--ln-gold)]/55 bg-[var(--ln-gold)]/15 text-[var(--ln-parchment)]"
            : "border-white/10 bg-[var(--void-3)] text-[var(--ln-bone)]"
        }`}
      >
        <span className={`transition-colors duration-200 ${isRegistryOrder ? "text-[var(--ln-gold-hot)] group-hover:text-[var(--ln-gold-flame)]" : "text-[var(--ln-gold)] group-hover:text-[var(--ln-gold-hot)]"}`} aria-hidden="true">{selected.icon}</span>
        <TooltipTrigger asChild>
          <select
            aria-label="Sort works"
            value={value}
            onChange={(event) => onChange(event.target.value as WorkSort)}
            className={`min-h-11 min-w-[8.75rem] origin-left cursor-pointer touch-manipulation appearance-none bg-transparent pr-1 text-xs font-medium outline-none transition-[color,transform] duration-150 ease-out group-hover:text-[var(--ln-gold-flame)] active:scale-[0.985] active:text-[var(--ln-gold-hot)] focus-visible:ring-2 focus-visible:ring-[var(--ln-gold-hot)]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ln-void)] motion-reduce:active:scale-100 sm:min-h-0 sm:min-w-0 sm:max-w-none ${
              isRegistryOrder
                ? "text-[var(--ln-parchment)] group-hover:animate-[ln-registry-order-text-pulse_1.8s_ease-in-out_infinite] motion-reduce:group-hover:animate-none"
                : "text-[var(--ln-bone)]"
            }`}
            style={{ colorScheme: "dark" }}
          >
            {WORK_SORT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                style={{ background: "var(--ln-coal)", color: "var(--ln-parchment)" }}
              >
                {option.label}
              </option>
            ))}
          </select>
        </TooltipTrigger>
      </label>
      <TooltipContent
        side="bottom"
        sideOffset={8}
        className="max-w-[16rem] text-xs leading-relaxed"
        style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-gold-dim)", color: "var(--ln-parchment)" }}
      >
        Registry order keeps the public Works index in its curated discovery sequence.
      </TooltipContent>
    </Tooltip>
  );
}

function CreatorSortControl({ value, onChange }: { value: CreatorSort; onChange: (value: CreatorSort) => void }) {
  const selected = CREATOR_SORT_OPTIONS.find((option) => option.value === value) ?? CREATOR_SORT_OPTIONS[0];
  return (
    <label className="group flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ln-gold)]/35 bg-[var(--ln-gold)]/10 px-3 py-1.5 text-xs text-[var(--ln-parchment)] transition-[background-color,border-color] duration-200 hover:border-[var(--ln-gold-hot)]/75 hover:bg-[var(--ln-gold)]/15 focus-within:border-[var(--ln-gold-hot)] focus-within:ring-2 focus-within:ring-[var(--ln-gold)]/25 sm:min-h-0 sm:gap-1.5 sm:px-2.5">
      <span className="text-[var(--ln-gold-hot)]" aria-hidden="true">{selected.icon}</span>
      <select
        aria-label="Sort creators"
        value={value}
        onChange={(event) => onChange(event.target.value as CreatorSort)}
        className="min-h-11 min-w-[8.75rem] cursor-pointer touch-manipulation appearance-none bg-transparent pr-1 text-xs font-medium text-[var(--ln-parchment)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ln-gold-hot)]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ln-void)] sm:min-h-0 sm:min-w-0"
        style={{ colorScheme: "dark" }}
      >
        {CREATOR_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} style={{ background: "var(--ln-coal)", color: "var(--ln-parchment)" }}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── All-works list view (progressive Registry index) ───────────────────────
function AllWorksListView({
  rows,
  likedMap,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  rows: FeedRow[];
  likedMap: Record<number, boolean>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const audioTracks = useMemo(() => rows.filter(r => !!r.song.fileUrl).map(feedRowToTrack), [rows]);

  if (rows.length === 0) {
    return (
      <div className="pt-24 text-center">
        <Search className="w-10 h-10 text-[var(--stone-shadow)] mx-auto mb-4" />
        <p className="text-[var(--stone-light)] font-medium">No works found</p>
        <p className="text-sm text-[var(--stone-shadow)] mt-1">Try a different title, creator, or genre.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5">
        {rows.map((row, i) => {
          const qIdx = audioTracks.findIndex(t => t.id === String(row.song.id));
          return <WorkListRow key={row.song.id} item={feedRowToListItem(row)} index={i} queueTracks={audioTracks} queueIndex={qIdx >= 0 ? qIdx : undefined} queueContext="EXPLORE" prefetchedLiked={likedMap[row.song.id] ?? false} />;
        })}
      </div>
      {hasNextPage && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          className="mx-auto flex items-center gap-2 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-4 py-2.5 text-sm text-[var(--gold)] transition-colors hover:bg-[var(--gold)]/20 disabled:cursor-wait disabled:opacity-60"
        >
          <ChevronRight className={`h-4 w-4 ${isFetchingNextPage ? "animate-pulse" : ""}`} aria-hidden="true" />
          {isFetchingNextPage ? "Opening more works…" : "Continue through Registry"}
        </button>
      )}
    </div>
  );
}

// ── Creator view (public creator directory; independent of the track feed) ─
type CreatorSubscriptionTier = "witness" | "reserve" | "steward" | null;

function CreatorDirectoryCard({
  creator,
  followTier,
  viewerId,
  followPending,
  onFollowToggle,
}: {
  creator: CreatorSummary;
  followTier: CreatorSubscriptionTier;
  viewerId?: number;
  followPending: boolean;
  onFollowToggle: (creatorId: number, creatorName: string) => void;
}) {
  const identity = creator.name ?? creator.artistHandle ?? `Creator ${creator.id}`;
  const handleLabel = creator.artistHandle ? `@${creator.artistHandle}` : "Creator domain";
  const routeIdentity = creator.artistHandle || creator.id;
  const followsByWitnessTier = followTier === "witness";
  const hasManagedSubscription = followTier === "reserve" || followTier === "steward";
  const followLabel = followTier === "witness" ? "Following" : followTier ? "Subscribed" : "Follow";
  const canFollowCreator = viewerId !== creator.id;
  const [supportRequested, setSupportRequested] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [bannerLoaded, setBannerLoaded] = useState(!creator.bannerUrl);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(!creator.profilePhotoUrl);
  const supportQuery = trpc.songs.discoverInfinite.useInfiniteQuery(
    { creatorId: creator.id, limit: 1 },
    {
      enabled: supportRequested,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );
  const supportRow = supportQuery.data?.pages[0]?.items[0] as FeedRow | undefined;
  const supportTarget: SupportTarget | null = supportRow ? {
    songId: supportRow.song.id,
    songTitle: supportRow.song.title,
    songWid: supportRow.song.witnessId,
    creatorId: creator.id,
    creatorName: creator.name ?? identity,
    creatorHandle: creator.artistHandle,
    coverArtUrl: supportRow.song.coverArtUrl,
    contentType: supportRow.song.contentType,
    stripeAccountStatus: creator.stripeAccountStatus,
  } : null;

  useEffect(() => {
    if (supportRequested && supportTarget) setSupportOpen(true);
  }, [supportRequested, supportTarget]);

  useEffect(() => {
    if (supportRequested && supportQuery.isError) {
      toast.error("The creator’s published work could not be opened for support.");
      setSupportRequested(false);
    }
  }, [supportQuery.isError, supportRequested]);

  useEffect(() => {
    setBannerFailed(false);
    setBannerLoaded(!creator.bannerUrl);
    setAvatarFailed(false);
    setAvatarLoaded(!creator.profilePhotoUrl);
  }, [creator.bannerUrl, creator.profilePhotoUrl]);

  return (
    <article className="group relative aspect-[5/4] min-h-72 min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-[var(--void-3)] transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.012] hover:border-[var(--gold)]/35 hover:shadow-[0_16px_36px_rgba(0,0,0,0.28)] focus-within:ring-2 focus-within:ring-[var(--gold)]/45 motion-reduce:transform-none motion-reduce:transition-none">
      {creator.bannerUrl && !bannerFailed && (
        <img
          src={creator.bannerUrl}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.035] ${bannerLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setBannerLoaded(true)}
          onError={() => { setBannerFailed(true); setBannerLoaded(true); }}
        />
      )}
      {creator.bannerUrl && !bannerLoaded && !bannerFailed && (
        <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-[linear-gradient(120deg,var(--void-3),var(--void-2),var(--void-3))]" />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/30 to-[var(--ln-coal)]/95"
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col p-5 sm:p-6">
        <Link href={`/creator/${routeIdentity}`} className="flex min-h-0 flex-1 flex-col rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/75">
          <div className="flex items-center gap-3 min-w-0">
            {creator.profilePhotoUrl && !avatarFailed ? (
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-[var(--gold)]/35 bg-[var(--void-2)]">
                {!avatarLoaded && <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-[var(--void-1)]" />}
                <img
                  src={creator.profilePhotoUrl}
                  alt=""
                  className={`h-full w-full object-cover transition-opacity duration-300 ${avatarLoaded ? "opacity-100" : "opacity-0"}`}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setAvatarLoaded(true)}
                  onError={() => { setAvatarFailed(true); setAvatarLoaded(true); }}
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/20 bg-[var(--void-2)]"><Users className="h-5 w-5 text-[var(--stone-shadow)]" /></div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="ln-subsection-header truncate text-[var(--ln-parchment)] transition-colors group-hover:text-[var(--gold-hot)]" title={identity}>{identity}</h2>
              <p className="ln-mono mt-0.5 truncate text-[var(--ln-bone)]">{handleLabel}</p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--ln-bone)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--gold)]" aria-hidden="true" />
          </div>
          {creator.bio ? (
            <div className="mt-5">
              <p className="ln-overline text-[var(--gold-hot)]">Creator statement</p>
              <p className="ln-editorial mt-1 line-clamp-3 text-[var(--ln-bone)]">{creator.bio}</p>
            </div>
          ) : (
            <p className="ln-caption mt-5 line-clamp-3 text-[var(--ln-bone)]">Explore this creator’s registered works and provenance record.</p>
          )}
        </Link>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
          <span className="ln-caption text-[var(--ln-bone)]">{creator.publishedCount} published work{creator.publishedCount === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            {canFollowCreator && (
              <button
                type="button"
                onClick={() => onFollowToggle(creator.id, identity)}
                disabled={followPending || hasManagedSubscription}
                title={hasManagedSubscription ? "This creator is already managed through a higher subscription tier." : "Follow keeps you informed when this creator publishes."}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  followsByWitnessTier || hasManagedSubscription
                    ? "border-[var(--gold)]/45 bg-[var(--gold)]/15 text-[var(--gold-hot)]"
                    : "border-white/15 bg-black/10 text-[var(--ln-bone)] hover:border-[var(--gold)]/35 hover:text-[var(--gold-hot)]"
                }`}
                aria-label={`${followLabel} ${identity}`}
              >
                {followPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : followsByWitnessTier || hasManagedSubscription ? <UserCheck className="h-3 w-3" aria-hidden="true" /> : <UserPlus className="h-3 w-3" aria-hidden="true" />}
                {followLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSupportRequested(true)}
              disabled={supportRequested && !supportTarget}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-2.5 py-1 text-xs font-medium text-[var(--gold-hot)] transition-colors hover:bg-[var(--gold)]/20 disabled:cursor-wait disabled:opacity-60"
              aria-label={`Support ${identity}`}
            >
              {supportRequested && !supportTarget ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Heart className="h-3 w-3" aria-hidden="true" />}
              Support
            </button>
            <Link href={`/creator/${routeIdentity}`} className="ln-mono uppercase text-[var(--gold-hot)] hover:text-[var(--ln-gold-flame)]">Visit domain</Link>
          </div>
        </div>
      </div>
      {supportOpen && supportTarget && (
        <SupportCreatorDrawer
          target={supportTarget}
          onClose={() => { setSupportOpen(false); setSupportRequested(false); }}
        />
      )}
    </article>
  );
}

function CreatorDirectorySkeleton() {
  return (
    <section className="pt-6" aria-label="Loading public creator domains" aria-busy="true">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-[var(--void-3)]" />
          <div className="h-8 w-48 animate-pulse rounded bg-[var(--void-3)]" />
          <div className="h-4 w-64 animate-pulse rounded bg-[var(--void-3)]" />
        </div>
        <div className="h-4 w-20 animate-pulse rounded bg-[var(--void-3)]" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="relative aspect-[5/4] min-h-72 overflow-hidden rounded-2xl border border-white/8 bg-[var(--void-3)]" aria-hidden="true">
            <div className="absolute inset-0 animate-pulse bg-[linear-gradient(120deg,var(--void-3),var(--void-2),var(--void-3))]" />
            <div className="relative flex h-full flex-col p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-full bg-[var(--void-1)]" /><div className="space-y-2"><div className="h-4 w-32 rounded bg-[var(--void-1)]" /><div className="h-3 w-20 rounded bg-[var(--void-1)]" /></div></div>
              <div className="mt-5 space-y-2"><div className="h-3 w-24 rounded bg-[var(--void-1)]" /><div className="h-4 w-full rounded bg-[var(--void-1)]" /><div className="h-4 w-4/5 rounded bg-[var(--void-1)]" /></div>
              <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-3"><div className="h-3 w-24 rounded bg-[var(--void-1)]" /><div className="h-8 w-24 rounded-lg bg-[var(--void-1)]" /></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AllCreatorsView({
  creators,
  search,
  selectedCreatorId,
  sort,
  subscriptionTiers,
  viewerId,
  followingCreatorId,
  onFollowToggle,
}: {
  creators: CreatorSummary[];
  search: string;
  selectedCreatorId: number | null;
  sort: CreatorSort;
  subscriptionTiers: Record<number, CreatorSubscriptionTier>;
  viewerId?: number;
  followingCreatorId: number | null;
  onFollowToggle: (creatorId: number, creatorName: string) => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = creators.filter((creator) => {
      if (selectedCreatorId && creator.id !== selectedCreatorId) return false;
      if (!q) return true;
      return [creator.name, creator.artistHandle, creator.bio]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(q));
    });
    return matched.sort((a, b) => {
      if (sort === "popular") {
        const playDelta = b.totalPlays - a.totalPlays;
        return playDelta || b.publishedCount - a.publishedCount || a.id - b.id;
      }
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated || b.id - a.id;
    });
  }, [creators, search, selectedCreatorId, sort]);

  return (
    <section className="pt-6" aria-labelledby="browse-creators-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="ln-overline">Creator directory</p>
          <h2 id="browse-creators-heading" className="ln-section-header mt-1">Browse creators</h2>
          <p className="mt-1 text-sm text-[var(--stone-shadow)]">Public creator domains with published works.</p>
        </div>
        <p className="ln-mono text-[var(--stone-shadow)]">{filtered.length} creator{filtered.length === 1 ? "" : "s"}</p>
      </div>
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((creator) => (
            <CreatorDirectoryCard
              key={creator.id}
              creator={creator}
              followTier={subscriptionTiers[creator.id] ?? null}
              viewerId={viewerId}
              followPending={followingCreatorId === creator.id}
              onFollowToggle={onFollowToggle}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-[var(--void-3)] px-5 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-[var(--stone-shadow)]" />
          <p className="mt-3 font-medium text-[var(--stone-light)]">No public creators match this search.</p>
          <p className="mt-1 text-sm text-[var(--stone-shadow)]">Try a creator name or handle.</p>
        </div>
      )}
    </section>
  );
}

// ── Main ExplorePage ───────────────────────────────────────────────────────
export default function ExplorePage() {
  const params = useParams<{ medium?: string }>();
  const routeSearch = useSearch();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const mediumParam = params.medium?.toLowerCase();
  // Legacy medium segments redirect to the music-first Explore surface.
  void mediumParam; // /explore/:medium redirects to /explore in App

  const [seed] = useState(() => Math.floor(Math.random() * 999999));
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  // Launcher deep links may change the query while Explore stays mounted.
  useEffect(() => {
    const view = new URLSearchParams(routeSearch ?? "").get("view");
    if (view === "creators" || view === "list") setViewMode(view);
  }, [routeSearch]);
  const [randomize, setRandomize] = useState(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const [workSort, setWorkSort] = useState<WorkSort>("curated");
  const [creatorSort, setCreatorSort] = useState<CreatorSort>("newest");
  const [subscriptionOverrides, setSubscriptionOverrides] = useState<Record<number, CreatorSubscriptionTier>>({});

  const creatorsQuery = trpc.profile.allCreators.useQuery(undefined, { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false });
  const creatorsRaw = creatorsQuery.data;
  const creators: CreatorSummary[] = useMemo(() => (creatorsRaw ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    artistHandle: c.artistHandle,
    profilePhotoUrl: c.profilePhotoUrl,
    bannerUrl: c.bannerUrl ?? null,
    bio: c.bio ?? null,
    stripeAccountStatus: c.stripeAccountStatus ?? null,
    publishedCount: c.publishedCount ?? 0,
    totalPlays: c.totalPlays ?? 0,
    createdAt: c.createdAt ?? null,
  })), [creatorsRaw]);

  const isListView = viewMode === "list";
  const creatorIds = useMemo(() => creators.map((creator) => creator.id), [creators]);
  const subscriptionStatusQuery = trpc.witnessSubscription.getSubscriptions.useQuery(
    { creatorIds },
    {
      enabled: !isListView && isAuthenticated && creatorIds.length > 0,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );
  const subscriptionTiers = useMemo<Record<number, CreatorSubscriptionTier>>(() => {
    const tiers: Record<number, CreatorSubscriptionTier> = {};
    for (const subscription of subscriptionStatusQuery.data ?? []) tiers[subscription.creatorId] = subscription.tier;
    return { ...tiers, ...subscriptionOverrides };
  }, [subscriptionOverrides, subscriptionStatusQuery.data]);
  const subscribeMutation = trpc.witnessSubscription.subscribe.useMutation({
    onSuccess: (result, variables) => {
      setSubscriptionOverrides((current) => ({ ...current, [variables.creatorId]: result.tier }));
      void utils.witnessSubscription.getSubscriptions.invalidate();
      toast.success("Following creator — publication notices are enabled.");
    },
    onError: (error) => toast.error(error.message),
  });
  const unsubscribeMutation = trpc.witnessSubscription.unsubscribe.useMutation({
    onSuccess: (_, variables) => {
      setSubscriptionOverrides((current) => ({ ...current, [variables.creatorId]: null }));
      void utils.witnessSubscription.getSubscriptions.invalidate();
      toast.success("Unfollowed creator — publication notices are off.");
    },
    onError: (error) => toast.error(error.message),
  });
  const followingCreatorId = subscribeMutation.isPending
    ? subscribeMutation.variables?.creatorId ?? null
    : unsubscribeMutation.isPending ? unsubscribeMutation.variables?.creatorId ?? null : null;
  const handleFollowToggle = useCallback((creatorId: number, creatorName: string) => {
    if (!user) {
      toast.info("Sign in to follow creators and receive publication notices.");
      return;
    }
    const tier = subscriptionTiers[creatorId] ?? null;
    if (tier === "reserve" || tier === "steward") {
      toast.info(`${creatorName} is already managed through your ${tier} subscription.`);
      return;
    }
    if (tier === "witness") {
      unsubscribeMutation.mutate({ creatorId });
      return;
    }
    subscribeMutation.mutate({ creatorId, tier: "witness" });
  }, [subscribeMutation, subscriptionTiers, unsubscribeMutation, user]);
  const data = useExploreData(seed, randomize, isListView, selectedCreatorId ?? undefined);
  const worksIndex = useWorksIndex({
    creatorId: selectedCreatorId ?? undefined,
    randomize,
    search,
    seed,
    sort: workSort,
    enabled: isListView,
  });

  // ── Bulk like status fetch ────────────────────────────────────────
  const allSongIds = useMemo(() => {
    if (!isListView) return [];
    return worksIndex.rows.map((row) => row.song.id).slice(0, 500);
  }, [isListView, worksIndex.rows]);
  const getBulkLikes = trpc.songs.getBulkLikeStatuses.useMutation();
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (!isListView) {
      setLikedMap({});
      return;
    }
    if (allSongIds.length === 0) return;
    getBulkLikes.mutate({ songIds: allSongIds }, {
      onSuccess: (result) => {
        const boolMap: Record<number, boolean> = {};
        Object.entries(result).forEach(([id, val]) => { boolMap[Number(id)] = (val as { liked: boolean }).liked; });
        setLikedMap(boolMap);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSongIds.join(","), isListView]);

  const isLoading = isListView ? data.isLoading || worksIndex.isLoading : creatorsQuery.isLoading;
  const isRefreshing = isListView
    ? data.isRefreshing || worksIndex.isRefetching
    : creatorsQuery.isFetching && !creatorsQuery.isLoading;
  const loadError = isListView ? data.error ?? worksIndex.error : creatorsQuery.error;
  const handleRefresh = useCallback(() => {
    if (isListView) {
      void data.refetch();
      void worksIndex.refetch();
    }
    else void creatorsQuery.refetch();
  }, [creatorsQuery, data, isListView, worksIndex]);
  const handleRandomizeToggle = useCallback((v: boolean) => { setRandomize(v); }, []);
  const handleViewChange = useCallback((nextView: ViewMode) => {
    setViewMode(nextView);
    const url = new URL(window.location.href);
    if (nextView === "creators") url.searchParams.set("view", "creators");
    else url.searchParams.set("view", "list");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <DepthAtmosphere className="min-h-screen" hue={43} variant="page">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 border-b"
        style={{
          background: "color-mix(in srgb, var(--ln-void, var(--void)) 88%, transparent)",
          borderColor: "color-mix(in srgb, var(--ln-gold) 14%, transparent)",
          backdropFilter: "saturate(1.1)",
        }}
      >
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
          {/* Row 1: Title + controls */}
          <div className="flex items-center justify-between pt-4 pb-2 gap-3 flex-wrap">
            <div className="flex-shrink-0">
              <p
                className="ln-overline mb-1"
                style={{ color: "var(--ln-gold)" }}
              >
                Living Nexus · Square
              </p>
              <h1 className="ln-page-title">Explore</h1>
              <p className="ln-editorial mt-1 hidden sm:block">Songs & artists — music provenance discovery</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="flex items-center gap-1.5">
                <span className="ln-mono hidden text-[var(--stone-shadow)] sm:inline">{randomize ? "Random" : "Newest"}</span>
                <RandomizeSwitch value={randomize} onChange={handleRandomizeToggle} />
              </div>
              {viewMode === "list" && <WorkSortControl value={workSort} onChange={setWorkSort} />}
              {viewMode === "creators" && <CreatorSortControl value={creatorSort} onChange={setCreatorSort} />}
              <ViewToggle value={viewMode} onChange={handleViewChange} />
              <button onClick={handleRefresh} disabled={isRefreshing} title="Refresh discovery" className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 text-[var(--stone-shadow)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all text-xs flex-shrink-0 disabled:cursor-wait disabled:opacity-60">
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} /><span className="hidden sm:inline">{isRefreshing ? "Refreshing" : "Refresh"}</span>
              </button>
            </div>
          </div>
          {/* Row 2: contextual discovery search + creator filter */}
          <div className="flex items-center gap-2 pb-3">
            <div className="relative flex-shrink-0 w-40 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--stone-shadow)]" />
              <input type="text" aria-label={viewMode === "creators" ? "Search public creators" : "Search works, creators, or genres"} placeholder={viewMode === "creators" ? "Find creators, handles, statements…" : "Search works, creators, genres…"} value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--void-3)] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--stone-light)] placeholder:text-[var(--stone-shadow)] focus:outline-none focus:border-[var(--gold)]/40 transition-colors" />
            </div>
            {search && (
              <button onClick={() => setSearch("")} className="flex items-center gap-1 text-xs text-[var(--stone-shadow)] hover:text-[var(--gold)] transition-colors">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <div className="flex-1" />
            {creators.length > 0 && <CreatorFilter creators={creators} selected={selectedCreatorId} onSelect={setSelectedCreatorId} />}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1360px] px-4 pb-32 sm:px-6">
        {/* Loading state */}
        {isLoading && (viewMode === "creators" ? (
          <CreatorDirectorySkeleton />
        ) : (
          <div className="pt-8 space-y-6">
            {/* Supplemental row skeletons */}
            {[0, 1].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-32 rounded mb-3" style={{ background: "var(--void-3)" }} />
                <div className="flex gap-3 overflow-hidden"><ColumnSkeleton /></div>
              </div>
            ))}
            {/* List-view skeleton */}
            <div className="space-y-2 rounded-xl border border-white/5 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg" style={{ background: "var(--void-3)" }} />
              ))}
            </div>
          </div>
        ))}

        {/* Error state */}
        {loadError && !isLoading && (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-[var(--gold)]/20 bg-[var(--void-3)] p-6 text-center shadow-xl">
            <Shield className="mx-auto h-7 w-7 text-[var(--gold)]" aria-hidden="true" />
            <h2 className="mt-3 font-heading text-lg text-[var(--ln-parchment)]">The registry could not be reached</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--stone-shadow)]">Your discovery controls are intact. Retry the public record request without leaving Explore.</p>
            <button onClick={handleRefresh} disabled={isRefreshing} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-4 py-2 text-sm text-[var(--gold)] transition-colors hover:bg-[var(--gold)]/20 disabled:cursor-wait disabled:opacity-60">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Retrying…" : "Retry registry request"}
            </button>
          </div>
        )}

        {/* Content */}
        {!isLoading && !loadError && (
          <>
            {/* ── Supplemental horizontal strips (always shown) ── */}
            {!search && !selectedCreatorId && viewMode === "list" && (
              <div className="pt-6">
                {SUPPLEMENTAL_SECTIONS.map(section => (
                  <SupplementalRow key={section.key} section={section} rows={data[section.key]} likedMap={likedMap} search={search} />
                ))}
              </div>
            )}

            {/* ── List view (flat, all types) ── */}
            {viewMode === "list" && (
              <div className="pt-6">
                <AllWorksListView
                  rows={worksIndex.rows}
                  likedMap={likedMap}
                  hasNextPage={Boolean(worksIndex.hasNextPage)}
                  isFetchingNextPage={worksIndex.isFetchingNextPage}
                  onLoadMore={() => void worksIndex.fetchNextPage()}
                />
              </div>
            )}

            {/* ── Creator view ── */}
            {viewMode === "creators" && (
              <AllCreatorsView
                creators={creators}
                search={search}
                selectedCreatorId={selectedCreatorId}
                sort={creatorSort}
                subscriptionTiers={subscriptionTiers}
                viewerId={user?.id}
                followingCreatorId={followingCreatorId}
                onFollowToggle={handleFollowToggle}
              />
            )}

            {/* Footer */}
            <div className="py-16 text-center border-t border-white/5 mt-8">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent mx-auto mb-6" />
              <p className="text-xs font-mono text-[var(--stone-shadow)] uppercase tracking-widest mb-2">Living Nexus</p>
              <p className="text-sm text-[var(--stone-shadow)] max-w-sm mx-auto leading-relaxed">Every track is a preserved manifestation. Every artist is a steward. Every discovery is intentional.</p>
            </div>
          </>
        )}
      </div>
    </DepthAtmosphere>
  );
}
