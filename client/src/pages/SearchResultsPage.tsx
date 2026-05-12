/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Search Results Page
   Creator-aware · WID-aware · Witness Artifact-aware
   Route: /search?q=<query>
═══════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import type { SearchResults } from "@shared/searchTypes";
import {
  Search, Music, BookOpen, FileText, User, Layers, Zap, ExternalLink,
  ChevronRight, AlertCircle, Loader2, ShieldCheck,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function useSearchQuery(): string {
  const search = useSearch(); // wouter v3 returns the raw query string e.g. "q=slimdoggy"
  const params = new URLSearchParams(search ?? "");
  return params.get("q") ?? "";
}

function WIDBadge({ wid }: { wid: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider shrink-0"
      style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.30)", color: "var(--ln-gold)" }}
    >
      <ShieldCheck size={8} />
      {wid}
    </span>
  );
}

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: "var(--ln-gold)" }}>{icon}</span>
      <h2 className="text-xs font-heading tracking-widest uppercase" style={{ color: "var(--ln-parchment)" }}>{label}</h2>
      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(196,154,40,0.12)", color: "var(--ln-gold-dim)" }}>{count}</span>
    </div>
  );
}

function ArtworkThumb({ url, alt, size = 40 }: { url?: string | null; alt: string; size?: number }) {
  return (
    <div
      className="shrink-0 rounded overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.12)" }}
    >
      {url
        ? <img src={url} alt={alt} className="w-full h-full object-cover" />
        : <Music size={size * 0.4} style={{ color: "rgba(196,154,40,0.3)" }} />
      }
    </div>
  );
}

const CONTENT_TYPE_ICON: Record<string, React.ReactNode> = {
  audio:      <Music size={12} />,
  lyrics:     <FileText size={12} />,
  manuscript: <BookOpen size={12} />,
  comic:      <Layers size={12} />,
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  audio:      "Audio",
  lyrics:     "Lyrics",
  manuscript: "Manuscript",
  comic:      "Comic",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SearchResultsPage() {
  const [, navigate] = useLocation();
  const rawQ = useSearchQuery();
  const [inputVal, setInputVal] = useState(rawQ);

  // Sync input when URL changes
  useEffect(() => { setInputVal(rawQ); }, [rawQ]);

  const { data, isLoading, error } = trpc.search.global.useQuery(
    { q: rawQ },
    { enabled: rawQ.length > 0, staleTime: 30_000 }
  );

  // WID direct redirect — if there's an exact WID match, navigate immediately
  useEffect(() => {
    if (data?.widMatch) {
      navigate(data.widMatch.url);
    }
  }, [data?.widMatch, navigate]);

  // Group songs by contentType
  const grouped = useMemo(() => {
    if (!data?.songs) return { audio: [], lyrics: [], manuscript: [], comic: [] };
    const out: Record<string, typeof data.songs> = { audio: [], lyrics: [], manuscript: [], comic: [] };
    for (const s of data.songs) {
      const ct = s.contentType ?? "audio";
      if (!out[ct]) out[ct] = [];
      out[ct].push(s);
    }
    return out;
  }, [data?.songs]);

  const totalResults = (data?.creators.length ?? 0)
    + (data?.songs.length ?? 0)
    + (data?.guides.length ?? 0)
    + (data?.collections.length ?? 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputVal.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ln-void)", paddingTop: "72px" }}
    >
      {/* ── Search bar ── */}
      <div
        className="sticky top-[56px] z-10 px-6 py-3"
        style={{ background: "rgba(10,8,6,0.95)", borderBottom: "1px solid rgba(196,154,40,0.12)", backdropFilter: "blur(12px)" }}
      >
        <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-2xl mx-auto">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,154,40,0.25)" }}
          >
            <Search size={14} style={{ color: "var(--ln-gold)", flexShrink: 0 }} />
            <input
              autoFocus
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Search creators, works, WIDs…"
              className="flex-1 bg-transparent outline-none text-white/80 placeholder:text-white/25"
              style={{ fontSize: "13px" }}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: "#C49A28", color: "#0A0806" }}
          >
            Search
          </button>
        </form>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Empty query */}
        {!rawQ && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Search size={40} style={{ color: "rgba(196,154,40,0.25)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Enter a search term above to find creators, works, and WIDs.</p>
          </div>
        )}

        {/* Loading */}
        {rawQ && isLoading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--ln-gold)" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Searching the Nexus…</span>
          </div>
        )}

        {/* Error */}
        {rawQ && error && (
          <div className="flex items-center gap-3 py-12 justify-center">
            <AlertCircle size={18} style={{ color: "var(--ln-ember)" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Search failed. Try again.</span>
          </div>
        )}

        {/* WID redirect notice */}
        {rawQ && data?.widMatch && (
          <div className="flex items-center gap-3 py-12 justify-center">
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--ln-gold)" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>WID match found — redirecting…</span>
          </div>
        )}

        {/* No results */}
        {rawQ && !isLoading && !error && data && !data.widMatch && totalResults === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Search size={36} style={{ color: "rgba(196,154,40,0.18)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              No results found for <span style={{ color: "var(--ln-parchment)" }}>"{rawQ}"</span>
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              Try a creator name, song title, genre, or paste a full WID (e.g. WID-MUS-XXXXXXXX-XXXXXXXX)
            </p>
          </div>
        )}

        {/* Results */}
        {rawQ && !isLoading && data && !data.widMatch && totalResults > 0 && (
          <div className="space-y-8">

            {/* ── Result count ── */}
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {totalResults} result{totalResults !== 1 ? "s" : ""} for <span style={{ color: "var(--ln-parchment)" }}>"{rawQ}"</span>
            </p>

            {/* ── Creators ── */}
            {data.creators.length > 0 && (
              <section>
                <SectionHeader icon={<User size={14} />} label="Creators" count={data.creators.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.creators.map((c: SearchResults["creators"][number]) => (
                    <Link key={c.id} href={`/creator/${c.id}`}>
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,154,40,0.10)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.28)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.10)"}
                      >
                        <div
                          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden"
                          style={{ background: "linear-gradient(135deg,#1C1A14,#3D3A2E)", border: "1px solid rgba(196,154,40,0.2)" }}
                        >
                          {c.profilePhotoUrl
                            ? <img src={c.profilePhotoUrl} alt={c.name ?? ""} className="w-full h-full object-cover" />
                            : (c.name ?? c.artistHandle ?? "?").charAt(0).toUpperCase()
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--ln-parchment)" }}>
                            {c.artistHandle ? `@${c.artistHandle}` : c.name ?? "Unknown Creator"}
                          </p>
                          {c.name && c.artistHandle && (
                            <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{c.name}</p>
                          )}
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {c.publishedCount} work{c.publishedCount !== 1 ? "s" : ""}
                            {c.role === "founder" && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)" }}>Founder</span>}
                          </p>
                        </div>
                        <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Audio ── */}
            {grouped.audio.length > 0 && (
              <section>
                <SectionHeader icon={<Music size={14} />} label="Audio Works" count={grouped.audio.length} />
                <div className="space-y-1.5">
                  {grouped.audio.map((s: SearchResults["songs"][number]) => (
                    <Link key={s.id} href={`/song/${s.id}`}>
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,154,40,0.08)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.22)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.08)"}
                      >
                        <ArtworkThumb url={s.coverArtUrl} alt={s.title} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{s.title}</p>
                          <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {s.creatorHandle ? `@${s.creatorHandle}` : (s.creatorName ?? "Unknown")}{s.genre ? ` · ${s.genre}` : ""}
                          </p>
                        </div>
                        {s.witnessId && <WIDBadge wid={s.witnessId} />}
                        <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Comics ── */}
            {grouped.comic.length > 0 && (
              <section>
                <SectionHeader icon={<Layers size={14} />} label="Comics" count={grouped.comic.length} />
                <div className="space-y-1.5">
                  {grouped.comic.map((s: SearchResults["songs"][number]) => (
                    <Link key={s.id} href={`/book/${s.id}`}>
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,154,40,0.08)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.22)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.08)"}
                      >
                        <ArtworkThumb url={s.coverArtUrl} alt={s.title} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{s.title}</p>
                          <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {s.creatorHandle ? `@${s.creatorHandle}` : (s.creatorName ?? "Unknown")}{s.genre ? ` · ${s.genre}` : ""}
                          </p>
                        </div>
                        {s.witnessId && <WIDBadge wid={s.witnessId} />}
                        <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Manuscripts ── */}
            {grouped.manuscript.length > 0 && (
              <section>
                <SectionHeader icon={<BookOpen size={14} />} label="Manuscripts" count={grouped.manuscript.length} />
                <div className="space-y-1.5">
                  {grouped.manuscript.map((s: SearchResults["songs"][number]) => (
                    <Link key={s.id} href={`/song/${s.id}`}>
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,154,40,0.08)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.22)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.08)"}
                      >
                        <ArtworkThumb url={s.coverArtUrl} alt={s.title} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{s.title}</p>
                          <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {s.creatorHandle ? `@${s.creatorHandle}` : (s.creatorName ?? "Unknown")}{s.genre ? ` · ${s.genre}` : ""}
                          </p>
                        </div>
                        {s.witnessId && <WIDBadge wid={s.witnessId} />}
                        <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Lyrics ── */}
            {grouped.lyrics.length > 0 && (
              <section>
                <SectionHeader icon={<FileText size={14} />} label="Lyric Works" count={grouped.lyrics.length} />
                <div className="space-y-1.5">
                  {grouped.lyrics.map((s: SearchResults["songs"][number]) => (
                    <Link key={s.id} href={`/song/${s.id}`}>
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,154,40,0.08)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.22)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.08)"}
                      >
                        <ArtworkThumb url={s.coverArtUrl} alt={s.title} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{s.title}</p>
                          <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {s.creatorHandle ? `@${s.creatorHandle}` : (s.creatorName ?? "Unknown")}{s.genre ? ` · ${s.genre}` : ""}
                          </p>
                        </div>
                        {s.witnessId && <WIDBadge wid={s.witnessId} />}
                        <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Guides ── */}
            {data.guides.length > 0 && (
              <section>
                <SectionHeader icon={<Zap size={14} />} label="Guide Characters" count={data.guides.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.guides.map((g: SearchResults["guides"][number]) => (
                    <Link key={g.id} href={`/guides/${g.id}`}>
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,154,40,0.10)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.28)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.10)"}
                      >
                        <ArtworkThumb url={g.artworkUrl} alt={g.canonicalName} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--ln-parchment)" }}>{g.canonicalName}</p>
                          {g.archetypeType && (
                            <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{g.archetypeType}</p>
                          )}
                          {g.widCode && <WIDBadge wid={g.widCode} />}
                        </div>
                        <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ── Collections ── */}
            {data.collections.length > 0 && (
              <section>
                <SectionHeader icon={<Layers size={14} />} label="Collections / Albums" count={data.collections.length} />
                <div className="space-y-1.5">
                  {data.collections.map((col: SearchResults["collections"][number]) => (
                    <Link key={col.id} href={`/verify/${col.collectionWid}`}>
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(196,154,40,0.08)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.22)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.08)"}
                      >
                        <ArtworkThumb url={col.coverArtUrl} alt={col.name} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{col.name}</p>
                          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{col.trackCount} track{col.trackCount !== 1 ? "s" : ""}</p>
                        </div>
                        <WIDBadge wid={col.collectionWid} />
                        <ExternalLink size={12} style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
