/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExplorePage
   Divine Noir: Full exploration grid with search
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import TrackCard from "@/components/TrackCard";
import TipModal from "@/components/TipModal";
import { Search } from "lucide-react";

const DISCOVER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-discover-4BDchKkmG3vEtUQgZzwK6E.webp";

export default function ExplorePage() {
  const { allTracks } = usePlayer();
  const [query, setQuery] = useState("");
  const [tipTarget, setTipTarget] = useState<number | null>(null);

  const tracks = allTracks();
  const filtered = query.trim()
    ? tracks.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.artist.toLowerCase().includes(query.toLowerCase()) ||
        t.genre.toLowerCase().includes(query.toLowerCase())
      )
    : tracks;

  const tipTrack = tipTarget !== null ? tracks[tipTarget] : null;

  return (
    <div className="animate-fade-up">
      {/* Header with discover image */}
      <div className="relative h-[160px] overflow-hidden">
        <img src={DISCOVER_IMG} alt="Explore" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-[oklch(0.08_0.01_280)/50] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h1 className="font-heading text-2xl text-white/90 tracking-wider">Explore the Cosmos</h1>
          <p className="text-[12px] text-white/40 font-body mt-1">Every sound in the universe, at your fingertips</p>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            placeholder="Search tracks, artists, genres…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13.5px] font-body text-white/80
              bg-[oklch(0.14_0.013_280)] border border-white/[0.08] outline-none
              focus:border-[#A78BFA]/50 transition-colors placeholder:text-white/20
              max-w-[480px]"
          />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[13px] font-body text-white/40">
            {filtered.length} {filtered.length === 1 ? "track" : "tracks"} found
          </span>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                index={tracks.indexOf(track)}
                onTip={setTipTarget}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-4">🔮</div>
            <div className="font-heading text-[17px] text-white/50 mb-2">No tracks found</div>
            <div className="text-[13px] font-body">Try a different search term</div>
          </div>
        )}
      </div>

      {tipTarget !== null && (
        <TipModal track={tipTrack} onClose={() => setTipTarget(null)} />
      )}
    </div>
  );
}
