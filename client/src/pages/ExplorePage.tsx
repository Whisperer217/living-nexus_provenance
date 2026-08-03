/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage (Cathedral Edition v2)
   Controls: All Tracks slider · Randomize switch · Creator filter · View toggle
═══════════════════════════════════════════════════════════════════ */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  Search, RefreshCw, Shield, Music, BookOpen, Eye, Flame,
  Sparkles, Film, Feather, Star, ChevronRight, LayoutList, LayoutGrid,
  Headphones, FileText, Image as ImageIcon, Users, X, Lock, ShoppingBag, Check,
  Play, FileImage, FileVideo, FileAudio, File,
} from "lucide-react";
import { WorkListRow, type WorkListRowItem } from "@/components/WorkListRow";
import type { FeedRow } from "@shared/coreDataTypes";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { usePlayer, type Track } from "@/contexts/PlayerContext";

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
  const reducedMotion = useReducedMotion();
  useEffect(() => { activeRef.current = value; }, [value]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Respect prefers-reduced-motion — draw static state, skip rAF loop
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
  }, [reducedMotion, value]);
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
            <h2 className="font-heading font-semibold tracking-[0.06em] leading-none" style={{ fontSize: 'clamp(1.25rem,1.1rem+0.75vw,1.75rem)', color: 'var(--ln-parchment)' }}>{title}</h2>
            {count > 0 && <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border" style={{ color: 'var(--ln-smoke)', background: 'var(--void-3)', borderColor: 'rgba(255,255,255,0.08)' }}>{count} works</span>}
          </div>
          <p className="font-editorial italic leading-relaxed mt-1.5" style={{ fontSize: 'clamp(0.875rem,0.82rem+0.3vw,1rem)', color: 'var(--ln-smoke)' }}>{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ── Grid Card ─────────────────────────────────────────────────────
function GridCard({ row, queueTracks, queueIndex }: { row: FeedRow; queueTracks?: Track[]; queueIndex?: number }) {
  const { addAndPlay, playQueueAt } = usePlayer();
  const isAudio = row.song.contentType === "audio";
  const hasFile = !!row.song.fileUrl;

  function handlePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!hasFile) {
      toast.info("No playable file for this work");
      return;
    }
    // Use playQueueAt when a full section queue is available for sequential playback
    if (queueTracks && queueTracks.length > 0 && queueIndex !== undefined) {
      playQueueAt(queueTracks, queueIndex, "EXPLORE");
      return;
    }
    addAndPlay(feedRowToTrack(row));
  }

  return (
    <div className="group relative rounded-xl overflow-hidden bg-[var(--void-3)] border border-white/8 hover:border-[var(--gold)]/30 transition-all">
      {/* Cover art — clicking plays */}
      <div
        className="aspect-square relative overflow-hidden cursor-pointer"
        onClick={handlePlay}
        title={hasFile ? `Play ${row.song.title}` : "View work"}
      >
        {row.song.coverArtUrl
          ? <img src={row.song.coverArtUrl} alt={row.song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full bg-[var(--void-2)] flex items-center justify-center"><Music className="w-8 h-8 text-[var(--stone-shadow)]" /></div>
        }
        {/* Hover overlay with play button */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-[var(--gold)] text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            aria-label={`Play ${row.song.title}`}
          >
            <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
          </button>
        </div>
        {/* WID badge */}
        {row.song.witnessId && (
          <div className="absolute top-2 right-2 bg-[var(--gold)]/20 border border-[var(--gold)]/40 rounded-md px-1.5 py-0.5 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-[var(--gold)]" />
            <span className="text-[9px] font-mono text-[var(--gold)]">WID</span>
          </div>
        )}
        {/* Content type badge bottom-left */}
        <div className="absolute bottom-2 left-2 bg-black/60 border border-white/10 rounded-md px-1.5 py-0.5 flex items-center gap-1 text-[var(--stone-shadow)]">
          <ContentTypeIcon contentType={row.song.contentType} />
          <span className="text-[9px] font-mono uppercase">{row.song.contentType}</span>
        </div>
      </div>

      {/* Info row */}
      <div className="p-3">
        {/* Title — navigates to song page */}
        <Link href={`/song/${row.song.id}`}>
          <p className="text-sm font-medium text-[var(--stone-light)] truncate leading-tight hover:text-[var(--gold)] transition-colors cursor-pointer">
            {row.song.title}
          </p>
        </Link>
        {/* Creator name — navigates to creator profile */}
        {row.creator ? (
          <Link href={`/creator/${row.creator.id}`}>
            <p className="text-xs text-[var(--stone-shadow)] mt-0.5 truncate hover:text-[var(--gold)]/70 transition-colors cursor-pointer">
              {row.creator.artistHandle ?? row.creator.name ?? "Unknown"}
            </p>
          </Link>
        ) : (
          <p className="text-xs text-[var(--stone-shadow)] mt-0.5 truncate">Unknown</p>
        )}
        {row.song.genre && (
          <span className="inline-block mt-1.5 text-[10px] font-mono text-[var(--stone-shadow)] bg-[var(--void-2)] border border-white/5 px-1.5 py-0.5 rounded-full truncate max-w-full">
            {row.song.genre}
          </span>
        )}
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────
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
  };
}

function ContentTypeIcon({ contentType }: { contentType: string }) {
  switch (contentType) {
    case "audio": return <FileAudio className="w-3.5 h-3.5" />;
    case "video": return <FileVideo className="w-3.5 h-3.5" />;
    case "lyrics": return <FileText className="w-3.5 h-3.5" />;
    case "manuscript": return <BookOpen className="w-3.5 h-3.5" />;
    case "comic": return <FileImage className="w-3.5 h-3.5" />;
    default: return <File className="w-3.5 h-3.5" />;
  }
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
        {(() => {
          const audioTracks = rows.filter(r => !!r.song.fileUrl).map(feedRowToTrack);
          return rows.slice(0, 8).map((row) => {
            const qIdx = audioTracks.findIndex(t => t.id === String(row.song.id));
            return <GridCard key={row.song.id} row={row} queueTracks={audioTracks} queueIndex={qIdx >= 0 ? qIdx : undefined} />;
          });
        })()}
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

  // Build ordered queue of all audio tracks in this section for sequential playback
  const sectionAudioTracks = useMemo(() => filtered.filter(r => !!r.song.fileUrl).map(feedRowToTrack), [filtered]);

  if (viewMode === "grid") {
    return (<><CathedralDivider {...section} count={filtered.length} />{filtered.length === 0 ? <p className="text-sm text-[var(--stone-shadow)] pb-4">{section.emptyMessage}</p> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-4">{filtered.map((row) => { const qIdx = sectionAudioTracks.findIndex(t => t.id === String(row.song.id)); return <GridCard key={row.song.id} row={row} queueTracks={sectionAudioTracks} queueIndex={qIdx >= 0 ? qIdx : undefined} />; })}</div>}</>);
  }

  return (<><CathedralDivider {...section} count={filtered.length} />{filtered.length === 0 ? <p className="text-sm text-[var(--stone-shadow)] pb-4">{section.emptyMessage}</p> : <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5 mb-4">{filtered.map((row, i) => { const qIdx = sectionAudioTracks.findIndex(t => t.id === String(row.song.id)); return <WorkListRow key={row.song.id} item={feedRowToListItem(row)} index={i} queueTracks={sectionAudioTracks} queueIndex={qIdx >= 0 ? qIdx : undefined} queueContext="EXPLORE" />; })}</div>}</>);
}

function CathedralSkeleton() {
  return <div className="space-y-3 animate-pulse">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--void-3)]" />)}</div>;
}

// ── Keeper Skins Section ───────────────────────────────────────────
function KeeperSkinsSection() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [equippingId, setEquippingId] = useState<number | null>(null);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);

  const equippedAvatarItemId = (user as any)?.equippedAvatarItemId ?? null;

  const { data: marketplaceItems = [], isLoading: mktLoading } = trpc.marketplace.listItems.useQuery(
    { type: "skin", limit: 20 },
    { staleTime: 3 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // Also fetch all creator-uploaded portraits
  const { data: creatorPortraits = [], isLoading: portraitsLoading } = trpc.keeper.listCreatorPortraits.useQuery(
    { limit: 100 },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // Merge: marketplace items first, then creator portraits not already in marketplace
  const marketplaceArtworkUrls = new Set((marketplaceItems as any[]).map((i: any) => i.artworkUrl));
  const creatorCards = (creatorPortraits as any[])
    .filter((p: any) => !marketplaceArtworkUrls.has(p.portraitUrl))
    .map((p: any) => ({
      id: `creator-${p.userId}`,
      title: p.artistHandle ? `@${p.artistHandle}` : (p.creatorName ?? "Creator"),
      artworkUrl: p.portraitUrl,
      priceCents: 0,
      description: `Portrait uploaded by ${p.creatorName ?? "a creator"} on Living Nexus.`,
      artistCredit: p.artistHandle ? `@${p.artistHandle}` : null,
      artStyle: null,
      isCreatorPortrait: true,
    }));
  const items = [...(marketplaceItems as any[]), ...creatorCards];
  const isLoading = mktLoading || portraitsLoading;

  const equipAvatar = trpc.marketplace.equipAvatar.useMutation({
    onSuccess: () => {
      toast.success("Avatar equipped! Your Keeper portrait has been updated.");
      utils.marketplace.listItems.invalidate();
      utils.auth.me.invalidate();
      setEquippingId(null);
      setSelectedItem(null);
    },
    onError: (err) => { toast.error(err.message ?? "Equip failed."); setEquippingId(null); },
  });

  const createCheckout = trpc.marketplace.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      setPurchasingId(null);
    },
    onError: (err) => { toast.error(err.message ?? "Purchase failed."); setPurchasingId(null); },
  });

  const handleEquip = (item: any) => {
    if (!user) { window.location.href = getLoginUrl("/explore"); return; }
    setEquippingId(item.id);
    equipAvatar.mutate({ itemId: item.id });
  };

  const handleBuy = (item: any) => {
    if (!user) { window.location.href = getLoginUrl("/explore"); return; }
    if (item.priceCents === 0) {
      // Free item — equip directly
      handleEquip(item);
      return;
    }
    setPurchasingId(item.id);
    createCheckout.mutate({ itemId: item.id, origin: window.location.origin });
  };

  if (isLoading || items.length === 0) return null;

  return (
    <div className="pt-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[var(--gold)]" />
            <h2 className="font-heading font-bold tracking-wide text-lg text-[var(--ln-parchment)]">Keeper Skins</h2>
          </div>
          <p className="text-xs text-[var(--stone-shadow)] mt-0.5">Equip a portrait to your Keeper — each skin is a provenance-anchored identity</p>
        </div>
        <Link href="/marketplace" className="text-xs text-[var(--gold)] hover:underline flex items-center gap-1">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Skin grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {(items as any[]).map((item) => {
          const isEquipped = equippedAvatarItemId === item.id;
          const isFree = item.priceCents === 0;
          return (
            <div
              key={item.id}
              className="relative flex flex-col cursor-pointer group"
              style={{
                border: `1px solid ${isEquipped ? "var(--ln-gold)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8,
                background: isEquipped ? "rgba(196,154,40,0.06)" : "var(--ln-panel)",
                boxShadow: isEquipped ? "0 0 16px rgba(196,154,40,0.2)" : "none",
                transition: "all 0.2s",
              }}
              onClick={() => setSelectedItem(item)}
            >
              {/* Portrait */}
              <div className="relative overflow-hidden" style={{ aspectRatio: "3/4", borderRadius: "7px 7px 0 0" }}>
                <img
                  src={item.artworkUrl}
                  alt={item.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
                {/* Equipped badge */}
                {isEquipped && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--ln-gold)" }}>
                    <Check style={{ width: 10, height: 10, color: "#000" }} />
                  </div>
                )}
                {/* Price badge */}
                <div
                  className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{
                    background: isFree ? "rgba(34,197,94,0.2)" : "rgba(0,0,0,0.7)",
                    border: `1px solid ${isFree ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.15)"}`,
                    color: isFree ? "#4ade80" : "var(--ln-parchment)",
                    fontSize: "0.6rem",
                  }}
                >
                  {isFree ? "FREE" : `$${(item.priceCents / 100).toFixed(2)}`}
                </div>
              </div>
              {/* Name */}
              <div className="p-2">
                <div className="text-xs font-semibold truncate" style={{ color: "var(--ln-parchment)", fontSize: "0.65rem" }}>
                  {item.title.replace("Keeper Skin Pack — ", "")}
                </div>
                {item.artistCredit && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--stone-shadow)", fontSize: "0.55rem" }}>
                    {item.artistCredit}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail / Purchase modal */}
      {selectedItem && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            style={{ background: "var(--ln-panel)", border: "1px solid var(--ln-panel-border)", borderRadius: "12px", padding: "0", maxWidth: "480px", width: "100%", marginTop: "40px", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Portrait hero */}
            <div className="relative" style={{ aspectRatio: "16/9" }}>
              <img src={selectedItem.artworkUrl} alt={selectedItem.title} className="w-full h-full object-cover object-top" />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.9) 100%)" }} />
              <button
                onClick={() => setSelectedItem(null)}
                style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", color: "var(--ln-gold)", marginBottom: "4px", textTransform: "uppercase" }}>
                  Keeper Skin
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, color: "white", lineHeight: 1.2 }}>
                  {selectedItem.title.replace("Keeper Skin Pack — ", "")}
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: "20px" }}>
              {selectedItem.description && (
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: "16px" }}>
                  {selectedItem.description}
                </p>
              )}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                {selectedItem.artStyle && (
                  <span style={{ fontSize: "10px", fontFamily: "monospace", padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                    {selectedItem.artStyle}
                  </span>
                )}
                {selectedItem.artistCredit && (
                  <span style={{ fontSize: "10px", fontFamily: "monospace", padding: "3px 8px", borderRadius: 4, background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                    {selectedItem.artistCredit}
                  </span>
                )}
              </div>

              {/* Lock/Unlock state */}
              {equippedAvatarItemId === selectedItem.id ? (
                <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.3)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Check style={{ width: 16, height: 16, color: "var(--ln-gold)", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace" }}>Currently Equipped</span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  {selectedItem.priceCents === 0 ? (
                    <button
                      onClick={() => handleEquip(selectedItem)}
                      disabled={equippingId === selectedItem.id}
                      style={{
                        flex: 1, padding: "12px",
                        background: "var(--ln-gold)", color: "#000",
                        border: "none", borderRadius: 8,
                        fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: "12px",
                        letterSpacing: "0.08em", cursor: equippingId === selectedItem.id ? "wait" : "pointer",
                        opacity: equippingId === selectedItem.id ? 0.7 : 1,
                      }}
                    >
                      {equippingId === selectedItem.id ? "Equipping…" : "EQUIP FREE SKIN"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleBuy(selectedItem)}
                        disabled={purchasingId === selectedItem.id}
                        style={{
                          flex: 1, padding: "12px",
                          background: "var(--ln-gold)", color: "#000",
                          border: "none", borderRadius: 8,
                          fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: "12px",
                          letterSpacing: "0.08em", cursor: purchasingId === selectedItem.id ? "wait" : "pointer",
                          opacity: purchasingId === selectedItem.id ? 0.7 : 1,
                        }}
                      >
                        {purchasingId === selectedItem.id ? "Opening…" : `PURCHASE · $${(selectedItem.priceCents / 100).toFixed(2)}`}
                      </button>
                      <button
                        onClick={() => handleEquip(selectedItem)}
                        disabled={equippingId === selectedItem.id}
                        style={{
                          padding: "12px 16px",
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.6)",
                          borderRadius: 8,
                          fontFamily: "'Space Mono', monospace", fontSize: "11px",
                          cursor: equippingId === selectedItem.id ? "wait" : "pointer",
                        }}
                        title="Try equipping without purchase (free preview)"
                      >
                        {equippingId === selectedItem.id ? "…" : "Try"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Guides Section ───────────────────────────────────────────────
function GuidesSection() {
  const [selected, setSelected] = useState<any | null>(null);
  const { data: guides = [], isLoading } = trpc.guides.listPublished.useQuery(
    { limit: 20 },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  if (isLoading || guides.length === 0) return null;

  return (
    <div className="mt-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div
            className="text-xs uppercase tracking-widest mb-1"
            style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem" }}
          >
            Creator Guides
          </div>
          <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>
            Sovereign creative companions uploaded by creators — each anchored to a WID
          </p>
        </div>
        <a
          href="/guides"
          className="text-xs flex items-center gap-1 hover:underline"
          style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace" }}
        >
          View all <ChevronRight className="w-3 h-3" />
        </a>
      </div>

      {/* Guide cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {(guides as any[]).map((guide: any) => (
          <button
            key={guide.id}
            onClick={() => setSelected(guide)}
            className="text-left flex flex-col transition-all duration-200 hover:scale-[1.02]"
            style={{
              border: "1px solid var(--ln-panel-border)",
              borderRadius: 6,
              background: "var(--ln-panel)",
              overflow: "hidden",
            }}
          >
            {/* Artwork */}
            <div style={{ aspectRatio: "3/4", overflow: "hidden", background: "var(--ln-void)" }}>
              {guide.artworkUrl ? (
                <img
                  src={guide.artworkUrl}
                  alt={guide.canonicalName}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Shield className="w-8 h-8" style={{ color: "var(--ln-gold)", opacity: 0.4 }} />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-2">
              <div
                className="truncate font-semibold"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-parchment)" }}
              >
                {guide.canonicalName}
              </div>
              {guide.archetypeType && (
                <div
                  className="truncate mt-0.5"
                  style={{ fontSize: "0.55rem", color: "var(--ln-smoke)" }}
                >
                  {guide.archetypeType}
                </div>
              )}
              {guide.widCode && (
                <div
                  className="mt-1 inline-block px-1 py-0.5 rounded"
                  style={{ background: "var(--ln-gold)15", border: "1px solid var(--ln-gold)30", fontSize: "0.5rem", color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace" }}
                >
                  {guide.widCode}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: "var(--ln-panel)", border: "1px solid var(--ln-gold)40", borderRadius: 8, width: "100%", maxWidth: 560, padding: 24, position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              style={{ position: "absolute", top: 12, right: 12, color: "var(--ln-smoke)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}
            >×</button>

            <div className="flex gap-4">
              {selected.artworkUrl && (
                <div style={{ width: 120, flexShrink: 0, borderRadius: 6, overflow: "hidden", border: "1px solid var(--ln-panel-border)" }}>
                  <img src={selected.artworkUrl} alt={selected.canonicalName} className="w-full h-full object-cover" style={{ aspectRatio: "3/4" }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                  {selected.archetypeType ?? "Guide"}
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", color: "var(--ln-parchment)", fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
                  {selected.canonicalName}
                </h2>
                {selected.widCode && (
                  <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: "var(--ln-gold)15", border: "1px solid var(--ln-gold)30", fontSize: "0.6rem", color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", marginBottom: 12 }}>
                    {selected.widCode}
                  </div>
                )}
                {selected.role && (
                  <p style={{ fontSize: "0.75rem", color: "var(--ln-smoke)", marginBottom: 4 }}>{selected.role}</p>
                )}
                {selected.alignment && (
                  <p style={{ fontSize: "0.7rem", color: "var(--ln-gold)80" }}>{selected.alignment}</p>
                )}
              </div>
            </div>

            {selected.loreDescription && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: "var(--ln-void)", border: "1px solid var(--ln-panel-border)" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--ln-smoke)", lineHeight: 1.6 }}>{selected.loreDescription}</p>
              </div>
            )}

            {selected.testimony && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 6, background: "var(--ln-gold)08", border: "1px solid var(--ln-gold)20" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "var(--ln-gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Origin Testimony</div>
                <p style={{ fontSize: "0.78rem", color: "var(--ln-parchment)", lineHeight: 1.6, fontStyle: "italic" }}>"{selected.testimony}"</p>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <a
                href={`/guide/${selected.id}`}
                style={{ flex: 1, textAlign: "center", padding: "8px 12px", borderRadius: 4, background: "var(--ln-gold)", color: "#0a0a0a", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", fontWeight: 700, textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                View Guide
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
              <h1 className="font-heading font-bold tracking-[0.08em] leading-none" style={{ fontSize: 'clamp(1.75rem,1.5rem+1.5vw,2.75rem)', color: 'var(--ln-parchment)' }}>Explore</h1>
              <p className="font-editorial italic mt-1 hidden sm:block" style={{ fontSize: 'clamp(0.75rem,0.7rem+0.25vw,0.875rem)', color: 'var(--ln-smoke)', letterSpacing: '0.02em' }}>The Grand Hall of Human Creative Contribution</p>
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
            {activeFilter === "All" && !search && !selectedCreatorId && viewMode !== "creator" && (
              <KeeperSkinsSection />
            )}
            {activeFilter === "All" && !search && !selectedCreatorId && viewMode !== "creator" && (
              <GuidesSection />
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
