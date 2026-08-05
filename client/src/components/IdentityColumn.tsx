/**
 * IdentityColumn — ACT II
 *
 * Sticky left identity panel for SongDetailPage.
 * Sections:
 *   1. Creator Card (avatar, name, handle, bio, mission)
 *   2. Portfolio (work counts by type)
 *   3. Follow / Message
 *   4. Organizations (label, BMI)
 *   5. Collections (album-style)
 *   6. Followers / Following (stub — follow system pending)
 *   7. Creator Links (website, Twitter, Instagram)
 *
 * Desktop: sticky top-24, normal flow on mobile.
 * Uses the Living Nexus design system (--ln-* tokens, Cinzel headings).
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  UserPlus,
  UserCheck,
  MessageSquare,
  Globe,
  Twitter,
  Instagram,
  Music,
  BookOpen,
  FileText,
  BookMarked,
  Layers,
  Users,
  Building2,
  ExternalLink,
  ChevronRight,
  Fingerprint,
} from "lucide-react";

interface IdentityColumnProps {
  creatorId: number | null;
  creatorName: string;
  creatorHandle: string | null;
  creatorAvatarUrl: string | null;
  isOwner: boolean;
  songId: number;
}

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  music:       <Music size={12} />,
  lyrics:      <FileText size={12} />,
  manuscripts: <BookOpen size={12} />,
  comics:      <BookMarked size={12} />,
  games:       <Layers size={12} />,
  playlists:   <Layers size={12} />,
  collections: <Layers size={12} />,
  visual:      <Layers size={12} />,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  music:       "Music",
  lyrics:      "Lyrics",
  manuscripts: "Manuscripts",
  comics:      "Comics",
  games:       "Games",
  playlists:   "Playlists",
  collections: "Collections",
  visual:      "Visual",
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  music:       "#D4AF37",
  lyrics:      "#A78BFA",
  manuscripts: "#FCD34D",
  comics:      "#60A5FA",
  games:       "#6EE7B7",
  playlists:   "#F9A8D4",
  collections: "#C8B98A",
  visual:      "#FCA5A5",
};

export function IdentityColumn({
  creatorId,
  creatorName,
  creatorHandle,
  creatorAvatarUrl,
  isOwner,
  songId,
}: IdentityColumnProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  // Fetch full creator profile
  const { data: creatorData } = trpc.profile.getCreator.useQuery(
    { creatorId: creatorId! },
    { enabled: !!creatorId }
  );

  // Fetch creator hub (portfolio counts + collections)
  const { data: hubData } = trpc.profile.creatorHub.useQuery(
    { creatorId: creatorId! },
    { enabled: !!creatorId }
  );

  const creator = creatorData?.creator as any;
  const modules = hubData?.modules as any;

  // Portfolio modules with non-zero counts
  const portfolioItems = modules
    ? Object.entries(modules as Record<string, { count: number; previews: any[] }>)
        .filter(([, v]) => v.count > 0)
        .sort(([a], [b]) => {
          const order = ["music", "lyrics", "manuscripts", "comics", "games", "playlists", "collections", "visual"];
          return order.indexOf(a) - order.indexOf(b);
        })
    : [];

  // Collections preview
  const collections = modules?.collections?.previews ?? [];

  // Social links
  const website = creator?.website;
  const twitter = creator?.twitterHandle;
  const instagram = creator?.instagramHandle;
  const hasLinks = website || twitter || instagram;

  // Organizations
  const labelName = creator?.labelName;
  const bmiNumber = creator?.bmiMemberNumber;
  const hasOrgs = labelName || bmiNumber;

  // Handle follow (stub — follow system not yet built)
  function handleFollow() {
    if (!user) {
      toast.error("Sign in to follow creators");
      return;
    }
    setIsFollowing(f => !f);
    toast.success(isFollowing ? `Unfollowed ${creatorName}` : `Following ${creatorName}`);
  }

  // Handle message (stub)
  function handleMessage() {
    if (!user) {
      toast.error("Sign in to send messages");
      return;
    }
    toast.info("Messaging coming soon");
  }

  const displayHandle = creatorHandle
    ? (creatorHandle.startsWith("@") ? creatorHandle : `@${creatorHandle}`)
    : null;

  const profileUrl = creatorId ? `/creator/${creatorId}` : null;

  return (
    <aside
      className="flex flex-col gap-4 w-full"
      style={{ position: "sticky", top: "6rem", alignSelf: "start" }}
    >
      {/* ── 1. CREATOR CARD ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(196,154,40,0.06) 0%, rgba(8,6,16,0.98) 100%)",
          border: "1px solid rgba(196,154,40,0.18)",
        }}
      >
        {/* Banner strip */}
        <div
          className="w-full h-14"
          style={{
            background: "linear-gradient(135deg, rgba(196,154,40,0.12) 0%, rgba(8,6,16,0.8) 100%)",
            borderBottom: "1px solid rgba(196,154,40,0.10)",
          }}
        />

        {/* Avatar + identity */}
        <div className="px-4 pb-4">
          {/* Avatar — overlaps banner */}
          <div className="flex items-end gap-3 -mt-7 mb-3">
            {profileUrl ? (
              <Link href={profileUrl}>
                <div
                  className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
                  style={{ border: "2px solid rgba(196,154,40,0.45)", background: "var(--ln-coal)" }}
                >
                  {creatorAvatarUrl ? (
                    <img src={creatorAvatarUrl} alt={creatorName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold"
                      style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: "2px solid rgba(196,154,40,0.45)", background: "var(--ln-coal)" }}
              >
                {creatorAvatarUrl ? (
                  <img src={creatorAvatarUrl} alt={creatorName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold"
                    style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
                    {creatorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Name + handle */}
          {profileUrl ? (
            <Link href={profileUrl} className="block group">
              <p
                className="text-sm font-bold leading-tight group-hover:opacity-80 transition-opacity"
                style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
              >
                {creatorName}
              </p>
              {displayHandle && (
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(196,154,40,0.55)" }}>
                  {displayHandle}
                </p>
              )}
            </Link>
          ) : (
            <>
              <p className="text-sm font-bold leading-tight" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                {creatorName}
              </p>
              {displayHandle && (
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(196,154,40,0.55)" }}>
                  {displayHandle}
                </p>
              )}
            </>
          )}

          {/* Bio */}
          {creator?.bio && (
            <p
              className="text-[11px] leading-relaxed mt-2 line-clamp-3"
              style={{ color: "var(--ln-smoke)" }}
            >
              {creator.bio}
            </p>
          )}

          {/* Creative Mission */}
          {creator?.creativeMission && (
            <div
              className="mt-3 px-3 py-2 rounded-lg"
              style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.12)" }}
            >
              <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>
                Mission
              </p>
              <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--ln-smoke)" }}>
                {creator.creativeMission}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. FOLLOW / MESSAGE ── */}
      {!isOwner && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleFollow}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: isFollowing ? "rgba(196,154,40,0.15)" : "rgba(196,154,40,0.08)",
              border: `1px solid ${isFollowing ? "rgba(196,154,40,0.50)" : "rgba(196,154,40,0.25)"}`,
              color: isFollowing ? "rgba(196,154,40,0.95)" : "rgba(196,154,40,0.65)",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.06em",
            }}
          >
            {isFollowing ? <><UserCheck size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
          </button>
          <button
            type="button"
            onClick={handleMessage}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--ln-smoke)",
            }}
            aria-label="Message creator"
          >
            <MessageSquare size={13} />
          </button>
        </div>
      )}

      {/* ── 3. PORTFOLIO ── */}
      {portfolioItems.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(8,6,16,0.95)",
            border: "1px solid rgba(196,154,40,0.12)",
          }}
        >
          <p className="text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>
            Portfolio
          </p>
          <div className="flex flex-col gap-1.5">
            {portfolioItems.map(([type, data]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: CONTENT_TYPE_COLORS[type] ?? "var(--ln-gold)" }}>
                    {CONTENT_TYPE_ICONS[type] ?? <Layers size={12} />}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>
                    {CONTENT_TYPE_LABELS[type] ?? type}
                  </span>
                </div>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: CONTENT_TYPE_COLORS[type] ?? "var(--ln-gold)" }}
                >
                  {(data as any).count}
                </span>
              </div>
            ))}
          </div>
          {profileUrl && (
            <Link href={profileUrl}>
              <div
                className="mt-3 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all hover:opacity-80"
                style={{
                  background: "rgba(196,154,40,0.05)",
                  border: "1px solid rgba(196,154,40,0.12)",
                  color: "rgba(196,154,40,0.65)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.05em",
                }}
              >
                View Full Archive <ChevronRight size={10} />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── 4. COLLECTIONS ── */}
      {collections.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(8,6,16,0.95)",
            border: "1px solid rgba(196,154,40,0.12)",
          }}
        >
          <p className="text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>
            Collections
          </p>
          <div className="flex flex-col gap-2">
            {collections.slice(0, 4).map((col: any) => (
              <div key={col.id} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-md flex-shrink-0 overflow-hidden"
                  style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.15)" }}
                >
                  {col.coverArtUrl ? (
                    <img src={col.coverArtUrl} alt={col.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers size={12} style={{ color: "rgba(196,154,40,0.35)" }} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] truncate flex-1" style={{ color: "var(--ln-smoke)" }}>
                  {col.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. FOLLOWERS / FOLLOWING (stub) ── */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(8,6,16,0.95)",
          border: "1px solid rgba(196,154,40,0.12)",
        }}
      >
        <p className="text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>
          Community
        </p>
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold tabular-nums" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>—</span>
            <span className="text-[10px]" style={{ color: "var(--ln-iron)" }}>Followers</span>
          </div>
          <div className="w-px" style={{ background: "rgba(196,154,40,0.12)" }} />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold tabular-nums" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>—</span>
            <span className="text-[10px]" style={{ color: "var(--ln-iron)" }}>Following</span>
          </div>
          <div className="w-px" style={{ background: "rgba(196,154,40,0.12)" }} />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-bold tabular-nums" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
              {hubData?.totalPlays ?? "—"}
            </span>
            <span className="text-[10px]" style={{ color: "var(--ln-iron)" }}>Plays</span>
          </div>
        </div>
      </div>

      {/* ── 6. ORGANIZATIONS ── */}
      {hasOrgs && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(8,6,16,0.95)",
            border: "1px solid rgba(196,154,40,0.12)",
          }}
        >
          <p className="text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>
            Organizations
          </p>
          <div className="flex flex-col gap-2">
            {labelName && (
              <div className="flex items-center gap-2">
                <Building2 size={12} style={{ color: "rgba(196,154,40,0.55)", flexShrink: 0 }} />
                <span className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>{labelName}</span>
              </div>
            )}
            {bmiNumber && (
              <div className="flex items-center gap-2">
                <Fingerprint size={12} style={{ color: "rgba(196,154,40,0.55)", flexShrink: 0 }} />
                <span className="text-[11px]" style={{ color: "var(--ln-smoke)" }}>BMI #{bmiNumber}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 7. CREATOR LINKS ── */}
      {hasLinks && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(8,6,16,0.95)",
            border: "1px solid rgba(196,154,40,0.12)",
          }}
        >
          <p className="text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(196,154,40,0.45)", fontFamily: "'Cinzel', serif" }}>
            Links
          </p>
          <div className="flex flex-col gap-2">
            {website && (
              <a
                href={website.startsWith("http") ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group"
              >
                <Globe size={12} style={{ color: "rgba(196,154,40,0.55)", flexShrink: 0 }} />
                <span
                  className="text-[11px] truncate group-hover:opacity-80 transition-opacity"
                  style={{ color: "var(--ln-smoke)" }}
                >
                  {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
                <ExternalLink size={9} style={{ color: "rgba(196,154,40,0.35)", flexShrink: 0 }} />
              </a>
            )}
            {twitter && (
              <a
                href={`https://twitter.com/${twitter.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group"
              >
                <Twitter size={12} style={{ color: "rgba(196,154,40,0.55)", flexShrink: 0 }} />
                <span
                  className="text-[11px] group-hover:opacity-80 transition-opacity"
                  style={{ color: "var(--ln-smoke)" }}
                >
                  @{twitter.replace(/^@/, "")}
                </span>
              </a>
            )}
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 group"
              >
                <Instagram size={12} style={{ color: "rgba(196,154,40,0.55)", flexShrink: 0 }} />
                <span
                  className="text-[11px] group-hover:opacity-80 transition-opacity"
                  style={{ color: "var(--ln-smoke)" }}
                >
                  @{instagram.replace(/^@/, "")}
                </span>
              </a>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
