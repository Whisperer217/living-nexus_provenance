import { Link } from "wouter";
import { Music, Shield } from "lucide-react";

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
  widCount?: number;
}

interface StoreCreatorCardProps {
  creator: CreatorData;
}

export function StoreCreatorCard({ creator }: StoreCreatorCardProps) {
  const handle = creator.artistHandle && creator.artistHandle !== "NULL" && creator.artistHandle !== "" ? creator.artistHandle : null;
  const artistName = creator.artistName && creator.artistName !== "NULL" ? creator.artistName : null;
  const displayName = artistName || creator.name || handle || `Creator ${creator.id}`;
  const workCount = creator.publishedWorks ?? creator.publishedCount ?? 0;
  const widCount = creator.widCount ?? 0;
  const bioSnippet = creator.bio
    ? creator.bio.replace(/\s+/g, " ").trim().slice(0, 90) + (creator.bio.length > 90 ? "…" : "")
    : null;
  const isFounder = creator.role === "founder" || creator.role === "admin";

  return (
    <Link href={`/creator/${creator.id}`}>
      <div
        className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl"
        style={{
          width: "176px",
          background: "linear-gradient(160deg, #0e0c1c 0%, #13101e 100%)",
          border: "1px solid rgba(196,154,40,0.18)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
        }}
      >
        {/* Banner */}
        <div className="h-20 w-full overflow-hidden relative">
          {creator.bannerUrl ? (
            <img
              src={creator.bannerUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: "linear-gradient(135deg, #1a1228 0%, #0e1a2e 50%, #1a0e28 100%)" }}
            />
          )}
          {/* Gold shimmer overlay on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "linear-gradient(135deg, rgba(196,154,40,0.08) 0%, transparent 60%)" }}
          />
        </div>

        {/* Avatar — overlaps banner */}
        <div className="absolute top-11 left-3">
          {creator.profilePhotoUrl ? (
            <img
              src={creator.profilePhotoUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover shadow-lg"
              style={{ border: "2px solid #0e0c1c" }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
                const parent = el.parentElement;
                if (parent) {
                  const fallback = document.createElement("div");
                  fallback.style.cssText = "width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,rgba(196,154,40,0.3),rgba(196,154,40,0.08));border:2px solid #0e0c1c;display:flex;align-items:center;justify-content:center;";
                  fallback.innerHTML = `<span style="color:#C49A28;font-weight:700;font-size:18px">${displayName[0]?.toUpperCase() ?? "?"}</span>`;
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(196,154,40,0.3), rgba(196,154,40,0.08))", border: "2px solid #0e0c1c" }}
            >
              <span style={{ color: "#C49A28", fontWeight: 700, fontSize: "18px" }}>{displayName[0]?.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-8 pb-3 px-3">
          {/* Name */}
          <p
            className="font-heading text-[13px] font-semibold leading-tight truncate"
            style={{ color: "var(--ln-parchment, #F5ECD7)" }}
          >
            {displayName}
          </p>
          {handle && (
            <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(196,154,40,0.7)", fontFamily: "monospace" }}>
              @{handle}
            </p>
          )}

          {/* Bio snippet */}
          {bioSnippet && (
            <p
              className="text-[10.5px] leading-snug mt-1.5 line-clamp-2"
              style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-body, serif)" }}
            >
              {bioSnippet}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isFounder && (
              <span
                className="text-[8px] tracking-widest uppercase font-bold px-1.5 py-0.5 rounded"
                style={{ color: "#C49A28", background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.25)" }}
              >
                Founder
              </span>
            )}
            {workCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>
                <Music className="w-2.5 h-2.5" />
                {workCount}
              </span>
            )}
            {widCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "rgba(74,222,128,0.7)" }}>
                <Shield className="w-2.5 h-2.5" />
                {widCount} WID{widCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
