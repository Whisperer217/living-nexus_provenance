/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage (§9 Surface map)
   Songs & artists only. Skins / guides / non-music commerce live in PNA Store.
═══════════════════════════════════════════════════════════════════════════ */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useParams, useSearch } from "wouter";
import {
  Search, RefreshCw, Shield, Music, Eye, Flame,
  Sparkles, Star, ChevronRight, ChevronLeft, LayoutList,
  FileText, Users, X, Lock,
  Play, FileAudio, File,
} from "lucide-react";
import { WorkListRow, type WorkListRowItem } from "@/components/WorkListRow";
import type { FeedRow } from "@shared/coreDataTypes";
import { toast } from "sonner";
import { usePlayer, type Track } from "@/contexts/PlayerContext";
import { DepthAtmosphere } from "@/components/atmosphere/DepthAtmosphere";

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

function getInitialViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  const view = new URLSearchParams(window.location.search).get("view");
  if (view === "creators") return "creators";
  // Legacy grid links intentionally resolve to the retained list view.
  return "list";
}

// Keep every returned work available for local search and the playback queue.
const MAX_LIMIT = 700;
const WORKS_BATCH_SIZE = 32;

// ── Data hook ──────────────────────────────────────────────────────────────
function useExploreData(seed: number, randomize: boolean, creatorId?: number) {
  const { data, isLoading, error } = trpc.songs.exploreIndex.useQuery(
    { seed, limit: MAX_LIMIT, randomize, ...(creatorId ? { creatorId } : {}) },
    { staleTime: 2 * 60 * 1000, refetchOnWindowFocus: false }
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
  }), [data, error, isLoading]);
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
type CreatorSummary = { id: number; name: string | null; artistHandle: string | null; profilePhotoUrl: string | null; publishedCount: number };
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
            <Shield className="w-2.5 h-2.5 text-[var(--gold)]" /><span className="text-[9px] font-mono text-[var(--gold)]">WID</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 border border-white/10 rounded-md px-1.5 py-0.5 flex items-center gap-1 text-[var(--stone-shadow)]">
          <ContentTypeIcon contentType={row.song.contentType} />
          <span className="text-[9px] font-mono uppercase">{row.song.contentType}</span>
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

  const audioTracks = useMemo(() => filtered.filter(r => !!r.song.fileUrl).map(feedRowToTrack), [filtered]);
  const queuePositions = useMemo(() => new Map(audioTracks.map((track, index) => [track.id, index])), [audioTracks]);

  if (filtered.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 600 : -600, behavior: "smooth" });
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className={`${section.accentColor}`}>{section.icon}</span>
        <h3 className="font-heading font-semibold text-sm tracking-wide text-[var(--ln-parchment)]">{section.title}</h3>
        <span className="text-[10px] font-mono text-[var(--stone-shadow)]">{filtered.length}</span>
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
          const qIdx = queuePositions.get(String(row.song.id));
          return <GridCard key={row.song.id} row={row} queueTracks={audioTracks} queueIndex={qIdx} />;
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

// ── All-works list view (flat, searchable) ────────────────────────────────
function AllWorksListView({ data, search, likedMap }: { data: ReturnType<typeof useExploreData>; search: string; likedMap: Record<number, boolean> }) {
  const allRows = useMemo(() => {
    const seen = new Set<number>();
    const out: FeedRow[] = [];
    WORK_COLLECTION_KEYS.forEach(key => {
      (data[key] as FeedRow[]).forEach(r => { if (!seen.has(r.song.id)) { seen.add(r.song.id); out.push(r); } });
    });
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    if (!search) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(r =>
      r.song.title.toLowerCase().includes(q) ||
      (r.creator?.name ?? "").toLowerCase().includes(q) ||
      (r.creator?.artistHandle ?? "").toLowerCase().includes(q) ||
      (r.song.genre ?? "").toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const audioTracks = useMemo(() => filtered.filter(r => !!r.song.fileUrl).map(feedRowToTrack), [filtered]);
  const queuePositions = useMemo(() => new Map(audioTracks.map((track, index) => [track.id, index])), [audioTracks]);
  const [range, setRange] = useState({ search, count: WORKS_BATCH_SIZE });
  const visibleCount = range.search === search ? range.count : WORKS_BATCH_SIZE;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || filtered.length <= visibleCount || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRange(previous => ({
          search,
          count: Math.min(filtered.length, (previous.search === search ? previous.count : WORKS_BATCH_SIZE) + WORKS_BATCH_SIZE),
        }));
      }
    }, { root: document.querySelector("#main-scroll"), rootMargin: "600px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [filtered.length, search, visibleCount]);

  if (filtered.length === 0) {
    return (
      <div className="pt-24 text-center">
        <Search className="w-10 h-10 text-[var(--stone-shadow)] mx-auto mb-4" />
        <p className="text-[var(--stone-light)] font-medium">No works found{search ? ` for "${search}"` : ""}</p>
        <p className="text-sm text-[var(--stone-shadow)] mt-1">Try a different title, creator, or genre.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5 rounded-xl border border-white/5">
      {filtered.slice(0, visibleCount).map((row, i) => {
        const qIdx = queuePositions.get(String(row.song.id));
        return <div key={row.song.id} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 91px" }}>
          <WorkListRow item={feedRowToListItem(row)} index={i} queueTracks={audioTracks} queueIndex={qIdx} queueContext="EXPLORE" prefetchedLiked={likedMap[row.song.id] ?? false} />
        </div>;
      })}
      {filtered.length > visibleCount && (
        <div ref={loadMoreRef} className="flex justify-center py-5">
          <button type="button" onClick={() => setRange({ search, count: Math.min(filtered.length, visibleCount + WORKS_BATCH_SIZE) })}
            className="rounded-lg border border-white/15 px-4 py-2 text-xs text-[var(--stone-light)] hover:border-[var(--gold)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gold)]">
            Show more works ({visibleCount} of {filtered.length})
          </button>
        </div>
      )}
    </div>
  );
}

// ── Creator view (public creator directory; independent of the track feed) ─
function CreatorDirectoryCard({ creator }: { creator: CreatorSummary }) {
  const identity = creator.artistHandle ?? creator.name ?? `Creator ${creator.id}`;
  const routeIdentity = creator.artistHandle || creator.id;

  return (
    <Link href={`/creator/${routeIdentity}`}>
      <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-[var(--void-3)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/35 hover:bg-[var(--void-2)] focus-within:ring-2 focus-within:ring-[var(--gold)]/45">
        <div className="flex items-center gap-3 min-w-0">
          {creator.profilePhotoUrl ? (
            <img src={creator.profilePhotoUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-full border border-[var(--gold)]/35 object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/20 bg-[var(--void-2)]"><Users className="h-5 w-5 text-[var(--stone-shadow)]" /></div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-[var(--stone-light)] transition-colors group-hover:text-[var(--gold)]" title={identity}>{identity}</h2>
            <p className="mt-0.5 truncate text-xs text-[var(--stone-shadow)]">{creator.artistHandle ? `@${creator.artistHandle}` : "Creator domain"}</p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--stone-shadow)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--gold)]" aria-hidden="true" />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-[var(--stone-shadow)]">
          <span>{creator.publishedCount} published work{creator.publishedCount === 1 ? "" : "s"}</span>
          <span className="font-mono uppercase tracking-[0.14em] text-[var(--gold)]">Visit domain</span>
        </div>
      </article>
    </Link>
  );
}

function AllCreatorsView({ creators, search, selectedCreatorId }: { creators: CreatorSummary[]; search: string; selectedCreatorId: number | null }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creators.filter((creator) => {
      if (selectedCreatorId && creator.id !== selectedCreatorId) return false;
      if (!q) return true;
      return (creator.name ?? "").toLowerCase().includes(q) || (creator.artistHandle ?? "").toLowerCase().includes(q);
    });
  }, [creators, search, selectedCreatorId]);

  return (
    <section className="pt-6" aria-labelledby="browse-creators-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">Creator directory</p>
          <h2 id="browse-creators-heading" className="font-heading mt-1 text-xl text-[var(--ln-parchment)]">Browse creators</h2>
          <p className="mt-1 text-sm text-[var(--stone-shadow)]">Public creator domains with published works.</p>
        </div>
        <p className="font-mono text-[11px] text-[var(--stone-shadow)]">{filtered.length} creator{filtered.length === 1 ? "" : "s"}</p>
      </div>
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((creator) => <CreatorDirectoryCard key={creator.id} creator={creator} />)}
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

  const { data: creatorsRaw } = trpc.profile.allCreators.useQuery(undefined, { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false });
  const creators: CreatorSummary[] = (creatorsRaw ?? []).map((c: any) => ({ id: c.id, name: c.name, artistHandle: c.artistHandle, profilePhotoUrl: c.profilePhotoUrl, publishedCount: c.publishedCount ?? 0 }));

  const data = useExploreData(seed, randomize, selectedCreatorId ?? undefined);

  // ── Bulk like status fetch ────────────────────────────────────────
  const allSongIds = useMemo(() => {
    const ids = new Set<number>();
    WORK_COLLECTION_KEYS.forEach(key => { (data[key] as FeedRow[]).forEach(r => ids.add(r.song.id)); });
    SUPPLEMENTAL_SECTIONS.forEach(s => { (data[s.key] as FeedRow[]).forEach(r => ids.add(r.song.id)); });
    return Array.from(ids).slice(0, 500);
  }, [data]);
  const getBulkLikes = trpc.songs.getBulkLikeStatuses.useMutation();
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (allSongIds.length === 0) return;
    getBulkLikes.mutate({ songIds: allSongIds }, {
      onSuccess: (result) => {
        const boolMap: Record<number, boolean> = {};
        Object.entries(result).forEach(([id, val]) => { boolMap[Number(id)] = (val as { liked: boolean }).liked; });
        setLikedMap(boolMap);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSongIds.join(",")]);

  const handleRefresh = useCallback(() => { window.location.reload(); }, []);
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
                className="font-heading text-[10px] uppercase tracking-[0.28em] mb-1"
                style={{ color: "var(--ln-gold)" }}
              >
                Living Nexus · Square
              </p>
              <h1 className="font-heading font-bold leading-none tracking-[0.08em]" style={{ fontSize: "clamp(2.25rem,1.8rem + 2vw,3.25rem)", color: "var(--ln-parchment)" }}>Explore</h1>
              <p className="font-editorial mt-1 hidden italic sm:block" style={{ fontSize: "0.95rem", color: "var(--ln-smoke)", letterSpacing: "0.02em" }}>Songs & artists — music provenance discovery</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-[var(--stone-shadow)] hidden sm:inline">{randomize ? "Random" : "Newest"}</span>
                <RandomizeSwitch value={randomize} onChange={handleRandomizeToggle} />
              </div>
              <ViewToggle value={viewMode} onChange={handleViewChange} />
              <button onClick={handleRefresh} title="Refresh" className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 text-[var(--stone-shadow)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all text-xs flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
          {/* Row 2: Search + creator filter */}
          <div className="flex items-center gap-2 pb-3">
            <div className="relative flex-shrink-0 w-40 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--stone-shadow)]" />
              <input type="text" placeholder="Search works, creators, genres…" value={search} onChange={(e) => setSearch(e.target.value)}
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
        {data.isLoading && (
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
        )}

        {/* Error state */}
        {data.error && !data.isLoading && (
          <div className="pt-16 text-center">
            <p className="text-[var(--stone-shadow)] text-sm">Could not load the registry. Please try again.</p>
            <button onClick={handleRefresh} className="mt-4 text-[var(--gold)] text-sm hover:underline">Refresh</button>
          </div>
        )}

        {/* Content */}
        {!data.isLoading && !data.error && (
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
                <AllWorksListView data={data} search={search} likedMap={likedMap} />
              </div>
            )}

            {/* ── Creator view ── */}
            {viewMode === "creators" && (
              <AllCreatorsView creators={creators} search={search} selectedCreatorId={selectedCreatorId} />
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
