import { Link } from "wouter";
import { Music } from "lucide-react";

interface CreatorData {
  id: number;
  name?: string | null;
  artistHandle?: string | null;
  artistName?: string | null;
  profilePhotoUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  role?: string | null;
  publishedWorks?: number;
  publishedCount?: number;
  followerCount?: number;
}

interface StoreCreatorCardProps {
  creator: CreatorData;
}

export function StoreCreatorCard({ creator }: StoreCreatorCardProps) {
  // Filter out literal "NULL" strings stored in DB
  const handle = creator.artistHandle && creator.artistHandle !== "NULL" && creator.artistHandle !== "" ? creator.artistHandle : null;
  const artistName = creator.artistName && creator.artistName !== "NULL" ? creator.artistName : null;
  const displayName = artistName || creator.name || handle || `Creator ${creator.id}`;
  const workCount = creator.publishedWorks ?? creator.publishedCount ?? 0;

  return (
    <Link href={`/creator/${creator.id}`}>
      <div className="relative w-44 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group transition-transform duration-200 hover:scale-[1.03] hover:shadow-2xl bg-white/5 border border-white/10">
        {/* Banner */}
        <div className="h-20 w-full overflow-hidden">
          {creator.bannerUrl ? (
            <img
              src={creator.bannerUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
          )}
        </div>

        {/* Avatar */}
        <div className="absolute top-10 left-3">
          {creator.profilePhotoUrl ? (
            <img
              src={creator.profilePhotoUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#0a0a0f] shadow-lg"
              onError={(e) => {
                // Replace broken avatar with monogram fallback
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
                const parent = el.parentElement;
                if (parent) {
                  const fallback = document.createElement("div");
                  fallback.className = "w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 border-2 border-[#0a0a0f] flex items-center justify-center shadow-lg";
                  fallback.innerHTML = `<span class="text-[#C9A84C] font-bold text-lg">${displayName[0]?.toUpperCase() ?? "?"}</span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 border-2 border-[#0a0a0f] flex items-center justify-center shadow-lg">
              <span className="text-[#C9A84C] font-bold text-lg">{displayName[0]?.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-8 pb-3 px-3">
          <p className="text-white font-semibold text-sm leading-tight truncate">{displayName}</p>
          {handle && (
            <p className="text-white/40 text-xs truncate">@{handle}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {creator.role === "founder" && (
              <span className="text-[9px] text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded px-1.5 py-0.5 font-semibold tracking-wider uppercase">
                Founder
              </span>
            )}
            {workCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                <Music className="w-2.5 h-2.5" />
                {workCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
