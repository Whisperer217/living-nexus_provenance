/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — LikedPage
   Divine Noir: Collection of liked/saved tracks
═══════════════════════════════════════════════════════════════════ */

import { usePlayer } from "@/contexts/PlayerContext";
import TrackCard from "@/components/TrackCard";
import { Heart } from "lucide-react";

export default function LikedPage() {
  const { state, allTracks } = usePlayer();
  const tracks = allTracks();
  const likedTracks = tracks.filter(t => state.liked.has(t.id));

  return (
    <div className="animate-fade-up px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)" }}>
          <Heart size={18} className="text-white" fill="white" />
        </div>
        <div>
          <h1 className="font-heading text-xl text-white/90 tracking-wider">Liked Songs</h1>
          <p className="text-[12px] text-white/35 font-body">{likedTracks.length} tracks saved</p>
        </div>
      </div>

      {likedTracks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {likedTracks.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              index={tracks.indexOf(track)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-white/30">
          <div className="text-6xl mb-4">💜</div>
          <div className="font-heading text-[18px] text-white/50 mb-2">No liked songs yet</div>
          <div className="text-[13px] font-body text-white/30">
            Heart a track to save it to your collection
          </div>
        </div>
      )}
    </div>
  );
}
