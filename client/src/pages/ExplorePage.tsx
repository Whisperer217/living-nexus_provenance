/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage (Column Edition v3)
   Layout: horizontal scroll rail with one column per content type.
   Each column shows all available works — no global slider.
   Per-column "Load more" if the backend returns a full page.
═══════════════════════════════════════════════════════════════════════════ */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { trpc } from "@/lib/trpc";
import { Link, useLocation, useParams } from "wouter";
import {
  Search, RefreshCw, Shield, Music, BookOpen, Eye, Flame,
  Sparkles, Film, Feather, Star, ChevronRight, ChevronLeft, LayoutList, LayoutGrid,
  Headphones, FileText, Image as ImageIcon, Users, X, Lock,
  Play, FileImage, FileVideo, FileAudio, File,
} from "lucide-react";
import { WorkListRow, type WorkListRowItem } from "@/components/WorkListRow";
import type { FeedRow } from "@shared/coreDataTypes";
import { toast } from "sonner";
import { usePlayer, type Track } from "@/contexts/PlayerContext";

// ── Column definitions (one per content type) ─────────────────────────────
const COLUMNS = [
  {
    key: "music" as const,
    title: "Music",
    subtitle: "Songs, albums, compositions",
    icon: <Music className="w-4 h-4" />,
    accentColor: "text-emerald-400",
    borderColor: "border-emerald-400/30",
    glowColor: "rgba(52,211,153,0.12)",
    emptyMessage: "No music registered yet",
  },
  {
    key: "books" as const,
    title: "Books",
    subtitle: "Manuscripts & long-form works",
    icon: <BookOpen className="w-4 h-4" />,
    accentColor: "text-amber-400",
    borderColor: "border-amber-400/30",
    glowColor: "rgba(251,191,36,0.12)",
    emptyMessage: "No books registered yet",
  },
  {
    key: "research" as const,
    title: "Research",
    subtitle: "Papers, essays, written testimony",
    icon: <FileText className="w-4 h-4" />,
    accentColor: "text-sky-400",
    borderColor: "border-sky-400/30",
    glowColor: "rgba(56,189,248,0.12)",
    emptyMessage: "No research registered yet",
  },
  {
    key: "visualWorks" as const,
    title: "Visual",
    subtitle: "Artwork, photography, images",
    icon: <ImageIcon className="w-4 h-4" />,
    accentColor: "text-rose-400",
    borderColor: "border-rose-400/30",
    glowColor: "rgba(251,113,133,0.12)",
    emptyMessage: "No visual works registered yet",
  },
  {
    key: "film" as const,
    title: "Film",
    subtitle: "Video works & motion content",
    icon: <Film className="w-4 h-4" />,
    accentColor: "text-orange-400",
    borderColor: "border-orange-400/30",
    glowColor: "rgba(251,146,60,0.12)",
    emptyMessage: "No film works registered yet",
  },
  {
    key: "doctrine" as const,
    title: "Doctrine",
    subtitle: "Comics & sequential art",
    icon: <Feather className="w-4 h-4" />,
    accentColor: "text-violet-400",
    borderColor: "border-violet-400/30",
    glowColor: "rgba(167,139,250,0.12)",
    emptyMessage: "No doctrine works registered yet",
  },
];

// ── Supplemental rows (not columns — shown above the column rail) ─────────
const SUPPLEMENTAL_SECTIONS = [
  { key: "newManifestations" as const, title: "New This Week", icon: <Sparkles className="w-4 h-4" />, accentColor: "text-[var(--gold)]" },
  { key: "trending" as const, title: "Trending", icon: <Flame className="w-4 h-4" />, accentColor: "text-red-400" },
  { key: "recentlyWitnessed" as const, title: "Recently Witnessed", icon: <Eye className="w-4 h-4" />, accentColor: "text-teal-400" },
  { key: "hiddenGems" as const, title: "Hidden Gems", icon: <Star className="w-4 h-4" />, accentColor: "text-yellow-400" },
];

type ColumnKey = typeof COLUMNS[number]["key"];
type SupplementalKey = typeof SUPPLEMENTAL_SECTIONS[number]["key"];
type ViewMode = "columns" | "list" | "grid";

// Max works to load — always show everything the server has
const MAX_LIMIT = 700;

// ── Data hook ──────────────────────────────────────────────────────────────
function useExploreData(seed: number, randomize: boolean, creatorId?: number) {
  const { data, isLoading, error } = trpc.songs.exploreIndex.useQuery(
    { seed, limit: MAX_LIMIT, randomize, ...(creatorId ? { creatorId } : {}) },
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

const CONTENT_ACTION: Record<string, { label: string; icon: React.ReactNode }> = {
  audio:      { label: "Play",  icon: <Play className="w-5 h-5 ml-0.5" fill="currentColor" /> },
  lyrics:     { label: "Read",  icon: <FileText className="w-5 h-5" /> },
  manuscript: { label: "Read",  icon: <BookOpen className="w-5 h-5" /> },
  comic:      { label: "Read",  icon: <BookOpen className="w-5 h-5" /> },
  image:      { label: "View",  icon: <ImageIcon className="w-5 h-5" /> },
  game:       { label: "Watch", icon: <Film className="w-5 h-5" /> },
  gcode:      { label: "View",  icon: <Eye className="w-5 h-5" /> },
  "3dmodel":  { label: "View",  icon: <Eye className="w-5 h-5" /> },
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
    <div className="group relative rounded-xl overflow-hidden bg-[var(--void-3)] border border-white/8 hover:border-[var(--gold)]/30 transition-all w-40 flex-shrink-0">
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
      <div className="p-2.5">
        <Link href={`/song/${row.song.id}`}>
          <p className="text-xs font-medium text-[var(--stone-light)] truncate leading-tight hover:text-[var(--gold)] transition-colors cursor-pointer">{row.song.title}</p>
        </Link>
        {row.creator ? (
          <Link href={`/creator/${row.creator.id}`}>
            <p className="text-[10px] text-[var(--stone-shadow)] mt-0.5 truncate hover:text-[var(--gold)]/70 transition-colors cursor-pointer">{row.creator.artistHandle ?? row.creator.name ?? "Unknown"}</p>
          </Link>
        ) : <p className="text-[10px] text-[var(--stone-shadow)] mt-0.5 truncate">Unknown</p>}
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

// ── Content Column ─────────────────────────────────────────────────────────
// A single vertically-scrollable column for one content type.
function ContentColumn({
  col, rows, search, likedMap, isLoading,
}: {
  col: typeof COLUMNS[number];
  rows: FeedRow[];
  search: string;
  likedMap: Record<number, boolean>;
  isLoading: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_SHOW = 40;

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.song.title.toLowerCase().includes(q) ||
      (r.creator?.name ?? "").toLowerCase().includes(q) ||
      (r.creator?.artistHandle ?? "").toLowerCase().includes(q) ||
      (r.song.genre ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const displayed = showAll ? filtered : filtered.slice(0, INITIAL_SHOW);
  const hasMore = filtered.length > INITIAL_SHOW && !showAll;

  const audioTracks = useMemo(() => filtered.filter(r => !!r.song.fileUrl).map(feedRowToTrack), [filtered]);

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        width: "clamp(280px, 22vw, 340px)",
        minHeight: 0,
      }}
    >
      {/* Column header */}
      <div
        className={`flex items-center gap-2 mb-3 pb-3 border-b ${col.borderColor}`}
        style={{ borderBottomColor: col.glowColor.replace("0.12", "0.35") }}
      >
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${col.accentColor}`}
          style={{ background: col.glowColor }}
        >
          {col.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className={`font-heading font-bold text-sm tracking-wide ${col.accentColor}`}>{col.title}</h2>
            {!isLoading && filtered.length > 0 && (
              <span className="text-[10px] font-mono text-[var(--stone-shadow)]">{filtered.length}</span>
            )}
          </div>
          <p className="text-[10px] text-[var(--stone-shadow)] truncate">{col.subtitle}</p>
        </div>
      </div>

      {/* Works list */}
      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg" style={{ background: "var(--void-3)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${col.accentColor}`} style={{ background: col.glowColor }}>
            {col.icon}
          </div>
          <p className="text-xs text-[var(--stone-shadow)]">{col.emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
          <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5">
            {displayed.map((row, i) => {
              const qIdx = audioTracks.findIndex(t => t.id === String(row.song.id));
              return (
                <WorkListRow
                  key={row.song.id}
                  item={feedRowToListItem(row)}
                  index={i}
                  queueTracks={audioTracks}
                  queueIndex={qIdx >= 0 ? qIdx : undefined}
                  queueContext="EXPLORE"
                  prefetchedLiked={likedMap[row.song.id]}
                />
              );
            })}
          </div>
          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className={`w-full mt-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${col.accentColor} border-white/10 hover:border-current/40`}
              style={{ background: col.glowColor }}
            >
              Load {filtered.length - INITIAL_SHOW} more
            </button>
          )}
        </div>
      )}
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
          const qIdx = audioTracks.findIndex(t => t.id === String(row.song.id));
          return <GridCard key={row.song.id} row={row} queueTracks={audioTracks} queueIndex={qIdx >= 0 ? qIdx : undefined} />;
        })}
      </div>
    </div>
  );
}

// ── View Toggle (columns / list / grid) ───────────────────────────────────
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const modes: { key: ViewMode; icon: React.ReactNode; label: string }[] = [
    { key: "columns", icon: <LayoutGrid className="w-3.5 h-3.5" />, label: "Columns" },
    { key: "list",    icon: <LayoutList className="w-3.5 h-3.5" />, label: "List" },
    { key: "grid",    icon: <Users className="w-3.5 h-3.5" />,       label: "Creators" },
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

// ── Creator view (grouped by creator) ─────────────────────────────────────
function CreatorCard({ creator, works }: { creator: NonNullable<FeedRow["creator"]>; works: FeedRow[] }) {
  return (
    <div className="bg-[var(--void-3)] border border-white/8 rounded-2xl overflow-hidden hover:border-[var(--gold)]/20 transition-all">
      <div className="p-4 flex items-center gap-3 border-b border-white/5">
        {creator.profilePhotoUrl ? <img src={creator.profilePhotoUrl} alt={creator.name ?? ""} className="w-10 h-10 rounded-full object-cover border border-[var(--gold)]/30" loading="lazy" decoding="async" /> : <div className="w-10 h-10 rounded-full bg-[var(--void-2)] border border-white/10 flex items-center justify-center"><Users className="w-5 h-5 text-[var(--stone-shadow)]" /></div>}
        <div className="flex-1 min-w-0">
          <Link href={`/creator/${creator.id}`}><p className="text-sm font-semibold text-[var(--stone-light)] truncate hover:text-[var(--gold)] transition-colors cursor-pointer">{creator.artistHandle ?? creator.name ?? "Unknown"}</p></Link>
          <p className="text-xs text-[var(--stone-shadow)]">{works.length} work{works.length !== 1 ? "s" : ""}</p>
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

// ── All-works list view (flat, searchable) ────────────────────────────────
function AllWorksListView({ data, search, likedMap }: { data: ReturnType<typeof useExploreData>; search: string; likedMap: Record<number, boolean> }) {
  const allRows = useMemo(() => {
    const seen = new Set<number>();
    const out: FeedRow[] = [];
    COLUMNS.forEach(col => {
      (data[col.key] as FeedRow[]).forEach(r => { if (!seen.has(r.song.id)) { seen.add(r.song.id); out.push(r); } });
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
    <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5">
      {filtered.map((row, i) => {
        const qIdx = audioTracks.findIndex(t => t.id === String(row.song.id));
        return <WorkListRow key={row.song.id} item={feedRowToListItem(row)} index={i} queueTracks={audioTracks} queueIndex={qIdx >= 0 ? qIdx : undefined} queueContext="EXPLORE" prefetchedLiked={likedMap[row.song.id]} />;
      })}
    </div>
  );
}

// ── Creator view (all works grouped by creator) ───────────────────────────
function AllCreatorsView({ data, search }: { data: ReturnType<typeof useExploreData>; search: string }) {
  const allRows = useMemo(() => {
    const seen = new Set<number>();
    const out: FeedRow[] = [];
    COLUMNS.forEach(col => { (data[col.key] as FeedRow[]).forEach(r => { if (!seen.has(r.song.id)) { seen.add(r.song.id); out.push(r); } }); });
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    if (!search) return allRows;
    const q = search.toLowerCase();
    return allRows.filter(r => r.song.title.toLowerCase().includes(q) || (r.creator?.name ?? "").toLowerCase().includes(q) || (r.creator?.artistHandle ?? "").toLowerCase().includes(q));
  }, [allRows, search]);

  const byCreator = useMemo(() => {
    const map = new Map<number, { creator: NonNullable<FeedRow["creator"]>; works: FeedRow[] }>();
    filtered.forEach(row => {
      if (!row.creator) return;
      const e = map.get(row.creator.id);
      if (e) e.works.push(row); else map.set(row.creator.id, { creator: row.creator, works: [row] });
    });
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {byCreator.map(({ creator, works }) => <CreatorCard key={creator.id} creator={creator} works={works} />)}
    </div>
  );
}

// ── Main ExplorePage ───────────────────────────────────────────────────────
export default function ExplorePage() {
  const params = useParams<{ medium?: string }>();
  const mediumParam = params.medium?.toLowerCase();
  // Map URL segment to column key
  const MEDIUM_MAP: Record<string, ColumnKey> = {
    music: "music", audio: "music", songs: "music",
    books: "books", book: "books", manuscripts: "books",
    research: "research", papers: "research", essays: "research",
    visual: "visualWorks", visuals: "visualWorks", images: "visualWorks", art: "visualWorks",
    film: "film", video: "film", videos: "film",
    doctrine: "doctrine", comics: "doctrine",
  };
  const focusedColumn = mediumParam ? MEDIUM_MAP[mediumParam] ?? null : null;

  const [seed] = useState(() => Math.floor(Math.random() * 999999));
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("columns");
  const [randomize, setRandomize] = useState(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);

  const { data: creatorsRaw } = trpc.profile.allCreators.useQuery(undefined, { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false });
  const creators: CreatorSummary[] = (creatorsRaw ?? []).map((c: any) => ({ id: c.id, name: c.name, artistHandle: c.artistHandle, profilePhotoUrl: c.profilePhotoUrl, publishedCount: c.publishedCount ?? 0 }));

  const data = useExploreData(seed, randomize, selectedCreatorId ?? undefined);

  // ── Bulk like status fetch ────────────────────────────────────────
  const allSongIds = useMemo(() => {
    const ids = new Set<number>();
    COLUMNS.forEach(col => { (data[col.key] as FeedRow[]).forEach(r => ids.add(r.song.id)); });
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

  return (
    <div className="min-h-screen bg-[var(--void)]">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[var(--void)]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
          {/* Row 1: Title + controls */}
          <div className="flex items-center justify-between pt-4 pb-2 gap-3 flex-wrap">
            <div className="flex-shrink-0">
              <h1 className="font-heading font-bold tracking-[0.08em] leading-none" style={{ fontSize: "clamp(1.5rem,1.3rem+1vw,2.25rem)", color: "var(--ln-parchment)" }}>Explore</h1>
              <p className="font-editorial italic mt-0.5 hidden sm:block" style={{ fontSize: "0.8rem", color: "var(--ln-smoke)", letterSpacing: "0.02em" }}>The Grand Hall of Human Creative Contribution</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-[var(--stone-shadow)] hidden sm:inline">{randomize ? "Random" : "Newest"}</span>
                <RandomizeSwitch value={randomize} onChange={handleRandomizeToggle} />
              </div>
              <ViewToggle value={viewMode} onChange={setViewMode} />
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
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pb-32">
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
            {/* Column skeletons */}
            <div className="flex gap-5 overflow-hidden pt-4">
              {COLUMNS.map(col => (
                <div key={col.key} className="flex-shrink-0" style={{ width: "clamp(280px, 22vw, 340px)" }}>
                  <div className="h-12 rounded-lg mb-3 animate-pulse" style={{ background: "var(--void-3)" }} />
                  <ColumnSkeleton />
                </div>
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
            {!search && !selectedCreatorId && (
              <div className="pt-6">
                {SUPPLEMENTAL_SECTIONS.map(section => (
                  <SupplementalRow key={section.key} section={section} rows={data[section.key]} likedMap={likedMap} search={search} />
                ))}
              </div>
            )}

            {/* ── Divider before columns ── */}
            {!search && !selectedCreatorId && viewMode === "columns" && (
              <div className="flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--gold)]/30 to-transparent" />
                <span className="text-[10px] font-mono text-[var(--gold)] uppercase tracking-widest px-2">By Type</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--gold)]/30 to-transparent" />
              </div>
            )}

            {/* ── Column view ── */}
            {viewMode === "columns" && (
              <div
                className="flex gap-5 overflow-x-auto pb-4"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(212,175,55,0.2) transparent", alignItems: "flex-start" }}
              >
                {COLUMNS.map(col => (
                  <ContentColumn
                    key={col.key}
                    col={col}
                    rows={data[col.key]}
                    search={search}
                    likedMap={likedMap}
                    isLoading={false}
                  />
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
            {viewMode === "grid" && (
              <div className="pt-6">
                <AllCreatorsView data={data} search={search} />
              </div>
            )}

            {/* Footer */}
            <div className="py-16 text-center border-t border-white/5 mt-8">
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent mx-auto mb-6" />
              <p className="text-xs font-mono text-[var(--stone-shadow)] uppercase tracking-widest mb-2">Living Nexus</p>
              <p className="text-sm text-[var(--stone-shadow)] max-w-sm mx-auto leading-relaxed">Every work is a preserved manifestation. Every creator is a steward. Every discovery is intentional.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
