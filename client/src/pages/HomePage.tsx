/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — HomePage
   Divine Noir: Hero banner + genre filters + track discovery grid
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import TrackCard from "@/components/TrackCard";
import TipModal from "@/components/TipModal";
import { Sparkles } from "lucide-react";

const GENRE_CARDS = [
  { label: "All",       icon: null,    color: "#A78BFA" },
  { label: "Ambient",   icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-book_038e31c9.png",      color: "#7dd3fc" },
  { label: "Gospel",   icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-cross_39407625.png",     color: "#fbbf24" },
  { label: "Jazz",     icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-lyre_40247746.png",      color: "#c4b5fd" },
  { label: "Electronic",icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-fire-lyre_42893087.png", color: "#f97316" },
  { label: "Hip-Hop",  icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-eye_0e10b572.png",      color: "#fb923c" },
  { label: "Rock",     icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-guitar_41a22a6e.png",    color: "#f87171" },
  { label: "R&B",      icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/icon-feather_40dcaa6d.png",   color: "#a78bfa" },
];

const GENRES = GENRE_CARDS.map(g => g.label);

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-hero-76TJneE6NXajYSDJWHEXPg.webp";

export default function HomePage() {
  const { state, allTracks, playTrack } = usePlayer();
  const [activeGenre, setActiveGenre] = useState("All");
  const [tipTarget, setTipTarget] = useState<number | null>(null);

  const tracks = allTracks();
  const filtered = activeGenre === "All"
    ? tracks
    : tracks.filter(t => t.genre === activeGenre);

  const tipTrack = tipTarget !== null ? tracks[tipTarget] : null;

  return (
    <div className="animate-fade-up cosmic-bg min-h-screen">
      {/* ── Hero Banner ── */}
      <div className="relative h-[220px] overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Living Nexus"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.085_0.022_255)] via-[oklch(0.085_0.022_255)]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.085_0.022_255)] via-transparent to-transparent" />
        {/* Radial depth: dark center bleeding to deep purple/blue edge */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 0%, oklch(0.09 0.04 265 / 0.4) 40%, oklch(0.07 0.08 290 / 0.75) 100%)" }} />
        <div className="absolute inset-0 flex flex-col justify-end px-6 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-[#D4AF37]" />
            <span className="text-[10px] font-heading tracking-[0.2em] uppercase text-[#D4AF37]">
              Featured Today
            </span>
          </div>
          <h1 className="font-display text-3xl gold-shimmer mb-1">Living Nexus</h1>
          <p className="text-[13px] font-body max-w-[380px]" style={{ color: "#E2E8F0" }}>
            Where divine sound meets the cosmos. Discover, share, and ascend.
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* ── Genre icon cards ── */}
        <div className="mb-7">
          <h2 className="font-heading text-[13px] tracking-[0.14em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>Browse Genres</h2>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {GENRE_CARDS.map(g => (
              <button
                key={g.label}
                onClick={() => setActiveGenre(g.label)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border group
                  ${activeGenre === g.label
                    ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.07]"
                    : "border-white/[0.06] bg-[oklch(0.14_0.013_280)] hover:border-white/[0.14] hover:bg-white/[0.04]"
                  }`}
              >
                {g.icon ? (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={g.icon}
                      alt={g.label}
                      className={`w-full h-full object-contain transition-all duration-200
                        ${activeGenre === g.label ? "scale-110 drop-shadow-lg" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"}`}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #7C3AED)" }}>
                    <span className="text-[11px] font-heading font-bold text-black">ALL</span>
                  </div>
                )}
                <span
                  className="text-[10px] font-body truncate w-full text-center transition-colors"
                  style={{ color: activeGenre === g.label ? g.color : "rgba(255,255,255,0.75)" }}
                >
                  {g.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Featured section ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-[16px] tracking-wider text-white">
            {activeGenre === "All" ? "Discover Tracks" : activeGenre}
          </h2>
          <span className="text-[12px] text-[#A78BFA] cursor-pointer hover:text-[#D4AF37] transition-colors font-body">
            See all
          </span>
        </div>

        {/* ── Track grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
          {filtered.map((track, i) => (
            <TrackCard
              key={track.id}
              track={track}
              index={tracks.indexOf(track)}
              onTip={setTipTarget}
            />
          ))}
        </div>

        {/* ── Trending section — real tracks only ── */}
        {tracks.length > 0 && (
          <>
            <div className="gold-divider mb-6" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-[16px] tracking-wider text-white">Trending Now</h2>
            </div>
            <div className="space-y-2">
              {tracks.slice(0, 5).map((track, i) => {
                const idx = tracks.indexOf(track);
                const isActive = state.currentIdx === idx;
                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group
                      ${isActive ? "bg-white/[0.06] border border-[#D4AF37]/20" : "hover:bg-white/[0.03] border border-transparent"}`}
                    onClick={() => playTrack(idx)}
                  >
                    <span className="text-[13px] font-heading text-white/60 w-5 text-center">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden rounded-lg"
                      style={{ background: "oklch(0.16 0.02 280)" }}>
                      {track.artUrl
                        ? <img src={track.artUrl} alt={track.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white/60 text-lg">🎵</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-body text-white truncate">{track.title}</div>
                    <div className="text-[11px] truncate" style={{ color: "#E2E8F0" }}>{track.artist}</div>
                    </div>
                    <div className="text-[11px] font-body hidden sm:block" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {(track.plays || 0).toLocaleString()} plays
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Tip modal */}
      {tipTarget !== null && (
        <TipModal track={tipTrack} onClose={() => setTipTarget(null)} />
      )}
    </div>
  );
}
