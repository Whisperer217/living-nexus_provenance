/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage (Cathedral Edition v2)
   Controls: All Tracks slider · Randomize switch · Creator filter · View toggle
═══════════════════════════════════════════════════════════════════ */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Search, RefreshCw, Shield, Music, BookOpen, Eye, Flame,
  Sparkles, Film, Feather, Star, ChevronRight, LayoutList, LayoutGrid,
  Headphones, FileText, Image as ImageIcon, Users, X,
} from "lucide-react";
import { WorkListRow, type WorkListRowItem } from "@/components/WorkListRow";
import type { FeedRow } from "@shared/coreDataTypes";

// ── Section definitions ────────────────────────────────────────────
const SECTIONS = [
  { key: "newManifestations" as const, title: "New Manifestations", subtitle: "Recently registered works across all mediums", icon: <Sparkles className="w-5 h-5" />, accentColor: "text-[var(--gold)]", emptyMessage: "No new manifestations yet" },
  { key: "music" as const, title: "Music", subtitle: "Registered audio works — songs, albums, compositions", icon: <Music className="w-5 h-5" />, accentColor: "text-emerald-400", emptyMessage: "No music registered yet" },
  { key: "books" as const, title: "Books", subtitle: "Manuscripts, novels, and long-form written works", icon: <BookOpen className="w-5 h-5" />, accentColor: "text-amber-400", emptyMessage: "No books registered yet" },
  { key: "research" as const, title: "Research", subtitle: "Academic papers, essays, and written testimony", icon: <FileText className="w-5 h-5" />, accentColor: "text-sky-400", emptyMessage: "No research registered yet" },
  { key: "visualWorks" as const, title: "Visual Works", subtitle: "Artwork, photography, and visual creations", icon: <ImageIcon className="w-5 h-5" />, accentColor: "text-rose-400", emptyMessage: "No visual works registered yet" },
  { key: "film" as const, title: "Film", subtitle: "Video works, short films, and motion content", icon: <Film className="w-5 h-5" />, accentColor: "text-orange-400", emptyMessage: "No film works registered yet" },
  { key: "doctrine" as const, title: "Doctrine", subtitle: "Comics, sequential art, and illustrated works", icon: <Feather className="w-5 h-5" />, accentColor: "text-violet-400", emptyMessage: "No doctrine works registered yet" },
  { key: "recentlyWitnessed" as const, title: "Recently Witnessed", subtitle: "Works with active provenance chains and witness records", icon: <Eye className="w-5 h-5" />, accentColor: "text-teal-400", emptyMessage: "No witnessed works yet" },
  { key: "hiddenGems" as const, title: "Hidden Gems", subtitle: "Under-discovered creators deserving your attention", icon: <Star className="w-5 h-5" />, accentColor: "text-yellow-400", emptyMessage: "No hidden gems found" },
  { key: "trending" as const, title: "Trending", subtitle: "Works gaining momentum across the registry", icon: <Flame className="w-5 h-5" />, accentColor: "text-red-400", emptyMessage: "No trending works yet" },
];
type SectionKey = typeof SECTIONS[number]["key"];
type ViewMode = "list" | "grid" | "creator";
const LIMIT_STEPS = [12, 20, 40, 80, 120, 200];

// ── Data hook ──────────────────────────────────────────────────────
function useExploreData(seed: number, limit: number, randomize: boolean, creatorId?: number) {
  const { data, isLoading, error } = trpc.songs.exploreIndex.useQuery(
    { seed, limit, randomize, ...(creatorId ? { creatorId } : {}) },
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
    isLoading, error,
  };
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

// ── Constellation Randomize Switch ────────────────────────────────
function RandomizeSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const activeRef = useRef(value);
  useEffect(() => { activeRef.current = value; }, [value]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, H / 2);
      ctx.fill();
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
  }, []);
  return (
    <button onClick={() => onChange(!value)} title={value ? "Randomized — click for newest" : "Newest first — click to randomize"} className="flex-shrink-0 focus:outline-none">
      <canvas ref={canvasRef} width={56} height={28} className="rounded-full cursor-pointer block" />
    </button>
  );
}

// ── Tracks Slider ─────────────────────────────────────────────────
function TracksSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const idx = LIMIT_STEPS.indexOf(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--stone-shadow)] font-mono hidden sm:inline">Works</span>
      <input type="range" min={0} max={LIMIT_STEPS.length - 1} step={1} value={idx === -1 ? 1 : idx}
        onChange={(e) => onChange(LIMIT_STEPS[Number(e.target.value)])}
        className="w-20 sm:w-28 cursor-pointer" style={{ accentColor: "var(--gold)" }} />
      <span className="text-xs font-mono text-[var(--gold)] w-7 text-right flex-shrink-0">
        {value === 200 ? "All" : value}
      </span>
    </div>
  );
}

// ── Creator Filter ─────────────────────────────────────────────────
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
        {sel?.profilePhotoUrl ? <img src={sel.profilePhotoUrl} className="w-4 h-4 rounded-full object-cover" alt="" /> : <Users className="w-3 h-3" />}
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
                {c.profilePhotoUrl ? <img src={c.profilePhotoUrl} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" /> : <div className="w-5 h-5 rounded-full bg-[var(--void-3)] flex items-center justify-center flex-shrink-0"><Users className="w-2.5 h-2.5 text-[var(--stone-shadow)]" /></div>}
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

// ── View Toggle ───────────────────────────────────────────────────
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const modes: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    { key: "list", icon: <LayoutList className="w-3.5 h-3.5" />, label: "List" },
    { key: "grid", icon: <LayoutGrid className="w-3.5 h-3.5" />, label: "Grid" },
    { key: "creator", icon: <Users className="w-3.5 h-3.5" />, label: "Creator" },
  ];
  return (
    <div className="flex items-center gap-0.5 bg-[var(--void-3)] border border-white/8 rounded-xl p-0.5">
      {modes.map((m) => (
        <button key={m.key} onClick={() => onChange(m.key)} title={m.label}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${value === m.key ? "bg-[var(--gold)] text-black" : "text-[var(--stone-shadow)] hover:text-[var(--stone-mid)]"}`}>
          {m.icon}
        </button>
      ))}
    </div>
  );
}

// ── Cathedral Divider ─────────────────────────────────────────────
function CathedralDivider({ title, subtitle, icon, accentColor, count }: { title: string; subtitle: string; icon: React.ReactNode; accentColor: string; count: number }) {
  return (
    <div className="relative py-10">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent mb-8" />
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--void-3)] border border-[var(--gold)]/20 flex items-center justify-center ${accentColor}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-2xl font-serif text-[var(--stone-light)] tracking-tight leading-none">{title}</h2>
            {count > 0 && <span className="text-xs font-mono text-[var(--stone-shadow)] bg-[var(--void-3)] border border-white/8 px-2 py-0.5 rounded-full">{count} works</span>}
          </div>
          <p className="text-sm text-[var(--stone-shadow)] mt-1.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────
function GridCard({ row }: { row: FeedRow }) {
  return (
    <Link href={`/song/${row.song.id}`}>
      <div className="group relative rounded-xl overflow-hidden bg-[var(--void-3)] border border-white/8 hover:border-[var(--gold)]/30 transition-all cursor-pointer">
        <div className="aspect-square relative overflow-hidden">
          {row.song.coverArtUrl ? <img src={row.song.coverArtUrl} alt={row.song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full bg-[var(--void-2)] flex items-center justify-center"><Music className="w-8 h-8 text-[var(--stone-shadow)]" /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {row.song.witnessId && <div className="absolute top-2 right-2 bg-[var(--gold)]/20 border border-[var(--gold)]/40 rounded-md px-1.5 py-0.5 flex items-center gap-1"><Shield className="w-2.5 h-2.5 text-[var(--gold)]" /><span className="text-[9px] font-mono text-[var(--gold)]">WID</span></div>}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-[var(--stone-light)] truncate leading-tight">{row.song.title}</p>
          <p className="text-xs text-[var(--stone-shadow)] mt-0.5 truncate">{row.creator?.artistHandle ?? row.creator?.name ?? "Unknown"}</p>
          {row.song.genre && <span className="inline-block mt-1.5 text-[10px] font-mono text-[var(--stone-shadow)] bg-[var(--void-2)] border border-white/5 px-1.5 py-0.5 rounded-full truncate max-w-full">{row.song.genre}</span>}
        </div>
      </div>
    </Link>
  );
}

// ── Creator Card ──────────────────────────────────────────────────
function CreatorCard({ creator, works }: { creator: NonNullable<FeedRow["creator"]>; works: FeedRow[] }) {
  return (
    <div className="bg-[var(--void-3)] border border-white/8 rounded-2xl overflow-hidden hover:border-[var(--gold)]/20 transition-all">
      <div className="p-4 flex items-center gap-3 border-b border-white/5">
        {creator.profilePhotoUrl ? <img src={creator.profilePhotoUrl} alt={creator.name ?? ""} className="w-10 h-10 rounded-full object-cover border border-[var(--gold)]/30" /> : <div className="w-10 h-10 rounded-full bg-[var(--void-2)] border border-white/10 flex items-center justify-center"><Users className="w-5 h-5 text-[var(--stone-shadow)]" /></div>}
        <div className="flex-1 min-w-0">
          <Link href={`/creator/${creator.id}`}><p className="text-sm font-semibold text-[var(--stone-light)] truncate hover:text-[var(--gold)] transition-colors cursor-pointer">{creator.artistHandle ?? creator.name ?? "Unknown"}</p></Link>
          <p className="text-xs text-[var(--stone-shadow)]">{works.length} work{works.length !== 1 ? "s" : ""} shown</p>
        </div>
      </div>
      <div className="divide-y divide-white/5">
        {works.slice(0, 5).map((row) => <WorkListRow key={row.song.id} item={feedRowToListItem(row)} />)}
      </div>
      {works.length > 5 && (
        <Link href={`/creator/${creator.id}`}>
          <div className="px-4 py-3 flex items-center justify-center gap-1.5 text-xs text-[var(--gold)] hover:text-[var(--gold-glow)] transition-colors cursor-pointer border-t border-white/5">
            <span>View all {works.length} works</span><ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      )}
    </div>
  );
}

// ── Featured Strip ────────────────────────────────────────────────
function FeaturedStrip({ rows }: { rows: FeedRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--gold)]/30 to-transparent" />
        <span className="text-xs font-mono text-[var(--gold)] uppercase tracking-widest px-2">Featured</span>
        <div className="h-px flex-1 bg-gradient-to-l from-[var(--gold)]/30 to-transparent" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.slice(0, 8).map((row) => <GridCard key={row.song.id} row={row} />)}
      </div>
    </div>
  );
}

// ── Section renderer ───────────────────────────────────────────────
function CathedralSection({ section, rows, search, viewMode }: { section: typeof SECTIONS[number]; rows: FeedRow[]; search: string; viewMode: ViewMode }) {
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.song.title.toLowerCase().includes(q) || (r.creator?.name ?? "").toLowerCase().includes(q) || (r.creator?.artistHandle ?? "").toLowerCase().includes(q) || (r.song.genre ?? "").toLowerCase().includes(q));
  }, [rows, search]);
  if (filtered.length === 0 && search) return null;

  if (viewMode === "creator") {
    const byCreator = new Map<number, { creator: NonNullable<FeedRow["creator"]>; works: FeedRow[] }>();
    filtered.forEach((row) => { if (!row.creator) return; const e = byCreator.get(row.creator.id); if (e) e.works.push(row); else byCreator.set(row.creator.id, { creator: row.creator, works: [row] }); });
    const groups = Array.from(byCreator.values());
    return (<><CathedralDivider {...section} count={filtered.length} />{groups.length === 0 ? <p className="text-sm text-[var(--stone-shadow)] pb-4">{section.emptyMessage}</p> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">{groups.map(({ creator, works }) => <CreatorCard key={creator.id} creator={creator} works={works} />)}</div>}</>);
  }

  if (viewMode === "grid") {
    return (<><CathedralDivider {...section} count={filtered.length} />{filtered.length === 0 ? <p className="text-sm text-[var(--stone-shadow)] pb-4">{section.emptyMessage}</p> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">{filtered.map((row) => <GridCard key={row.song.id} row={row} />)}</div>}</>);
  }

  return (<><CathedralDivider {...section} count={filtered.length} />{filtered.length === 0 ? <p className="text-sm text-[var(--stone-shadow)] pb-4">{section.emptyMessage}</p> : <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5 mb-4">{filtered.map((row) => <WorkListRow key={row.song.id} item={feedRowToListItem(row)} />)}</div>}</>);
}

function CathedralSkeleton() {
  return <div className="space-y-3 animate-pulse">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--void-3)]" />)}</div>;
}

const FILTER_CHIPS_DEF = [
  { label: "All", icon: <LayoutList className="w-3 h-3" /> },
  { label: "Music", icon: <Headphones className="w-3 h-3" /> },
  { label: "Books", icon: <BookOpen className="w-3 h-3" /> },
  { label: "Research", icon: <FileText className="w-3 h-3" /> },
  { label: "Visual", icon: <ImageIcon className="w-3 h-3" /> },
  { label: "Film", icon: <Film className="w-3 h-3" /> },
  { label: "Doctrine", icon: <Feather className="w-3 h-3" /> },
];

export default function ExplorePage() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [randomize, setRandomize] = useState(true);
  const [limitIdx, setLimitIdx] = useState(1);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const limit = LIMIT_STEPS[limitIdx];

  const { data: creatorsRaw } = trpc.profile.allCreators.useQuery(undefined, { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false });
  const creators: CreatorSummary[] = (creatorsRaw ?? []).map((c: any) => ({ id: c.id, name: c.name, artistHandle: c.artistHandle, profilePhotoUrl: c.profilePhotoUrl, publishedCount: c.publishedCount ?? 0 }));

  const data = useExploreData(seed, limit, randomize, selectedCreatorId ?? undefined);

  const handleRefresh = useCallback(() => { setSeed(Math.floor(Math.random() * 999999)); setSearch(""); }, []);
  const handleRandomizeToggle = useCallback((v: boolean) => { setRandomize(v); setSeed(Math.floor(Math.random() * 999999)); }, []);

  const visibleSections = useMemo(() => {
    if (activeFilter === "All") return SECTIONS;
    const map: Record<string, SectionKey> = { Music: "music", Books: "books", Research: "research", Visual: "visualWorks", Film: "film", Doctrine: "doctrine" };
    const key = map[activeFilter];
    return key ? SECTIONS.filter(s => s.key === key) : SECTIONS;
  }, [activeFilter]);

  return (
    <div className="min-h-screen bg-[var(--void)]">
      {/* ── Cathedral Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[var(--void)]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Row 1: Title + controls */}
          <div className="flex items-center justify-between pt-5 pb-2 gap-3 flex-wrap">
            <div className="flex-shrink-0">
              <h1 className="text-3xl sm:text-4xl font-serif text-[var(--stone-light)] tracking-tight leading-none">Explore</h1>
              <p className="text-[10px] text-[var(--stone-shadow)] mt-0.5 font-mono uppercase tracking-widest hidden sm:block">The Grand Hall of Human Creative Contribution</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-[var(--stone-shadow)] hidden sm:inline">{randomize ? "Random" : "Newest"}</span>
                <RandomizeSwitch value={randomize} onChange={handleRandomizeToggle} />
              </div>
              <TracksSlider value={limit} onChange={(v) => setLimitIdx(LIMIT_STEPS.indexOf(v))} />
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <button onClick={handleRefresh} title="Refresh" className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-white/10 text-[var(--stone-shadow)] hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition-all text-xs flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
          {/* Row 2: Search + type chips + creator filter */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <div className="relative flex-shrink-0 w-36 sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--stone-shadow)]" />
              <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--void-3)] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--stone-light)] placeholder:text-[var(--stone-shadow)] focus:outline-none focus:border-[var(--gold)]/40 transition-colors" />
            </div>
            {FILTER_CHIPS_DEF.map((chip) => (
              <button key={chip.label} onClick={() => setActiveFilter(chip.label)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all border ${activeFilter === chip.label ? "bg-[var(--gold)] text-black border-[var(--gold)]" : "bg-transparent text-[var(--stone-shadow)] border-white/10 hover:border-[var(--gold)]/30 hover:text-[var(--stone-mid)]"}`}>
                {chip.icon}<span className="hidden sm:inline">{chip.label}</span>
              </button>
            ))}
            {creators.length > 0 && <CreatorFilter creators={creators} selected={selectedCreatorId} onSelect={setSelectedCreatorId} />}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-32">
        {data.isLoading && <div className="pt-8"><CathedralSkeleton /></div>}
        {data.error && !data.isLoading && (
          <div className="pt-16 text-center">
            <p className="text-[var(--stone-shadow)] text-sm">Could not load the registry. Please try again.</p>
            <button onClick={handleRefresh} className="mt-4 text-[var(--gold)] text-sm hover:underline">Refresh</button>
          </div>
        )}
        {!data.isLoading && !data.error && (
          <>
            {activeFilter === "All" && !search && !selectedCreatorId && viewMode !== "creator" && (
              <div className="pt-8"><FeaturedStrip rows={data.featured} /></div>
            )}
            {visibleSections.map((section) => (
              <CathedralSection key={section.key} section={section} rows={data[section.key]} search={search} viewMode={viewMode} />
            ))}
            {search && visibleSections.every(s => { const q = search.toLowerCase(); return !data[s.key].some((r: FeedRow) => r.song.title.toLowerCase().includes(q) || (r.creator?.name ?? "").toLowerCase().includes(q) || (r.creator?.artistHandle ?? "").toLowerCase().includes(q)); }) && (
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
              <p className="text-sm text-[var(--stone-shadow)] max-w-sm mx-auto leading-relaxed">Every work is a preserved manifestation. Every creator is a steward. Every discovery is intentional.</p>
              <button onClick={handleRefresh} className="mt-6 flex items-center gap-2 text-xs text-[var(--gold)] hover:text-[var(--gold-glow)] transition-colors mx-auto">
                <RefreshCw className="w-3 h-3" />Discover something new
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
