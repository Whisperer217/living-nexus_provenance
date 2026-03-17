/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — HomePage
   Divine Noir: Hero banner + genre filters + track discovery grid
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { usePlayer, DEMO_TRACKS } from "@/contexts/PlayerContext";
import TrackCard from "@/components/TrackCard";
import TipModal from "@/components/TipModal";
import { Sparkles } from "lucide-react";

const GENRES = ["All", "Electronic", "Lo-fi", "Ambient", "Hip-Hop", "R&B", "House", "Trap", "Indie", "Jazz"];

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
    <div className="animate-fade-up">
      {/* ── Hero Banner ── */}
      <div className="relative h-[220px] overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Living Nexus"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.08_0.01_280)] via-[oklch(0.08_0.01_280)/60] to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end px-6 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-[#E8C547]" />
            <span className="text-[10px] font-heading tracking-[0.2em] uppercase text-[#E8C547]">
              Featured Today
            </span>
          </div>
          <h1 className="font-display text-3xl gold-shimmer mb-1">Living Nexus</h1>
          <p className="text-[13px] text-white/50 font-body max-w-[380px]">
            Where divine sound meets the cosmos. Discover, share, and ascend.
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* ── Genre filters ── */}
        <div className="flex gap-2 flex-wrap mb-6">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => setActiveGenre(g)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-body transition-all border
                ${activeGenre === g
                  ? "bg-[#A78BFA]/15 border-[#A78BFA] text-[#A78BFA]"
                  : "bg-[oklch(0.14_0.013_280)] border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/70"
                }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* ── Featured section ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-[16px] tracking-wider text-white/80">
            {activeGenre === "All" ? "Discover Tracks" : activeGenre}
          </h2>
          <span className="text-[12px] text-[#A78BFA] cursor-pointer hover:text-[#E8C547] transition-colors font-body">
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

        {/* ── Trending section ── */}
        <div className="gold-divider mb-6" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-[16px] tracking-wider text-white/80">Trending Now</h2>
        </div>
        <div className="space-y-2">
          {DEMO_TRACKS.slice(0, 5).map((track, i) => {
            const idx = tracks.indexOf(track);
            const isActive = state.currentIdx === idx;
            return (
              <div
                key={track.id}
                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all group
                  ${isActive ? "bg-white/[0.06] border border-[#E8C547]/20" : "hover:bg-white/[0.03] border border-transparent"}`}
                onClick={() => playTrack(idx)}
              >
                <span className="text-[13px] font-heading text-white/20 w-5 text-center">{i + 1}</span>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
                  style={{ background: track.bg || "oklch(0.18 0.014 280)" }}>
                  {track.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-body text-white/80 truncate">{track.title}</div>
                  <div className="text-[11px] text-white/30 truncate">{track.artist}</div>
                </div>
                <div className="text-[11px] text-white/25 font-body tabular-nums">{track.dur}</div>
                <div className="text-[11px] text-white/20 font-body hidden sm:block">
                  {(track.plays || 0).toLocaleString()} plays
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tip modal */}
      {tipTarget !== null && (
        <TipModal track={tipTrack} onClose={() => setTipTarget(null)} />
      )}
    </div>
  );
}
