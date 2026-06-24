import { useState } from "react";
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
  const [hovered, setHovered] = useState(false);

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
        className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer snap-start"
        style={{
          width: "176px",
          background: "linear-gradient(160deg, #0e0c1c 0%, #13101e 100%)",
          border: `1px solid ${hovered ? "rgba(196,154,40,0.38)" : "rgba(196,154,40,0.18)"}`,
          boxShadow: hovered
            ? "0 4px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(196,154,40,0.12)"
            : "0 2px 16px rgba(0,0,0,0.5)",
          transition: "border-color 400ms ease, box-shadow 400ms ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Banner */}
        <div className="h-20 w-full overflow-hidden relative">
          {creator.bannerUrl ? (
            <img
              src={creator.bannerUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{
                transform: hovered ? "scale(1.04)" : "scale(1)",
                transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)",
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: "linear-gradient(135deg, #1a1228 0%, #0e1a2e 50%, #1a0e28 100%)" }}
            />
          )}
          {/* Gold shimmer overlay — slow fade in, not instant */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(196,154,40,0.10) 0%, transparent 60%)",
              opacity: hovered ? 1 : 0,
              transition: "opacity 500ms ease",
            }}
          />
        </div>

        {/* Avatar — overlaps banner */}
        <div className="absolute top-11 left-3">
          {creator.profilePhotoUrl ? (
            <img
              src={creator.profilePhotoUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover shadow-lg"
              style={{
                border: `2px solid ${hovered ? "rgba(196,154,40,0.5)" : "#0e0c1c"}`,
                transition: "border-color 400ms ease",
              }}
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
              style={{
                background: "linear-gradient(135deg, rgba(196,154,40,0.3), rgba(196,154,40,0.08))",
                border: `2px solid ${hovered ? "rgba(196,154,40,0.5)" : "#0e0c1c"}`,
                transition: "border-color 400ms ease",
              }}
            >
              <span style={{ color: "#C49A28", fontWeight: 700, fontSize: "18px" }}>{displayName[0]?.toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-8 pb-3 px-3">
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
          {bioSnippet && (
            <p
              className="text-[10.5px] leading-snug mt-1.5 line-clamp-2"
              style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-body, serif)" }}
            >
              {bioSnippet}
            </p>
          )}
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

        {/* Orbit ring — dashed gold ring that appears on hover */}
        {hovered && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%", zIndex: 20 }}
            aria-hidden="true"
          >
            <rect
              x="2" y="2"
              width="calc(100% - 4px)" height="calc(100% - 4px)"
              rx="10" ry="10"
              fill="none"
              stroke="rgba(196,154,40,0.28)"
              strokeWidth="1"
              strokeDasharray="8 5"
              style={{ animation: "orbit-ring-spin 14s linear infinite" }}
            />
          </svg>
        )}

        <style>{`
          @keyframes orbit-ring-spin {
            from { stroke-dashoffset: 0; }
            to   { stroke-dashoffset: -130; }
          }
        `}</style>
      </div>
    </Link>
  );
}
