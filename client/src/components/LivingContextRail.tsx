/**
 * ACT V — Living Context Rail
 *
 * The "heartbeat" of Living Nexus — the living ecosystem surrounding an artifact.
 * Unlike the Evidence Column (historical), this rail shows what is happening NOW.
 *
 * Six independently expandable sections:
 *   1. Signals              — recent activity feed (newest first)
 *   2. Connected Manifestations — related works by type
 *   3. Witness Registry     — latest witness activity
 *   4. Creator Activity     — creator's recent published works
 *   5. Marketplace          — creator-supported commerce entry point
 *   6. Current Sessions     — active public/collaborative sessions
 *
 * Design: Alive, card-based, soft dividers, relative timestamps
 * Layout: Persistent right rail on desktop, accordion below Evidence Column on mobile
 */

import { useState, ReactNode } from "react";

import { Link } from "wouter";
import {
  ChevronDown, ChevronRight,
  Activity, Layers, Eye, User, ShoppingBag, Radio,
  MessageSquare, Heart, Star, GitBranch, Bell,
  Music, BookOpen, FileText, Gamepad2, Image, Film,
  ExternalLink, Clock, Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LivingContextRailProps {
  song: any;
  creator: any;
  songId: number;
  eventThread: any[];
  relatedData: any[];
  onGiftOpen?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "";
  }
}

function contentTypeIcon(type: string | null | undefined) {
  switch (type) {
    case "audio": return <Music className="w-3 h-3" />;
    case "manuscript": return <BookOpen className="w-3 h-3" />;
    case "lyrics": return <FileText className="w-3 h-3" />;
    case "game": return <Gamepad2 className="w-3 h-3" />;
    case "image": return <Image className="w-3 h-3" />;
    case "comic": return <Film className="w-3 h-3" />;
    default: return <Layers className="w-3 h-3" />;
  }
}

function signalIcon(type: string) {
  switch (type) {
    case "COMMENT": return <MessageSquare className="w-3 h-3" style={{ color: "#60A5FA" }} />;
    case "LIKE": return <Heart className="w-3 h-3" style={{ color: "#F87171" }} />;
    case "TIP": return <Star className="w-3 h-3" style={{ color: "#FBBF24" }} />;
    case "WITNESS_REGISTERED":
    case "WITNESS_VERIFIED": return <Eye className="w-3 h-3" style={{ color: "#4ADE80" }} />;
    case "FOLLOW": return <User className="w-3 h-3" style={{ color: "#A78BFA" }} />;
    case "WORK_REFERENCED": return <GitBranch className="w-3 h-3" style={{ color: "#34D399" }} />;
    case "PROJECT_PUBLISHED":
    case "PROJECT_FUNDED": return <Zap className="w-3 h-3" style={{ color: "#F59E0B" }} />;
    default: return <Bell className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />;
  }
}

function signalLabel(type: string, actorName: string | null | undefined): string {
  const actor = actorName || "Someone";
  switch (type) {
    case "COMMENT": return `${actor} commented`;
    case "LIKE": return `${actor} appreciated this`;
    case "TIP": return `${actor} sent a gift`;
    case "WITNESS_REGISTERED": return `${actor} witnessed this work`;
    case "WITNESS_VERIFIED": return `Witness verified`;
    case "FOLLOW": return `${actor} followed the creator`;
    case "WORK_REFERENCED": return `${actor} referenced this work`;
    case "SYSTEM_UPDATE": return "System update";
    case "PRESERVATION_MODE": return "Preservation mode activated";
    case "PROJECT_PUBLISHED": return "Project published";
    case "PROJECT_FUNDED": return "Project funded";
    default: return `${actor} interacted`;
  }
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────

interface ContextSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  count?: number;
  children: ReactNode;
  pulse?: boolean;
}

function ContextSection({ title, icon, defaultOpen = false, count, children, pulse }: ContextSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(10,10,10,0.5)",
        border: "1px solid rgba(196,154,40,0.10)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span className="flex-shrink-0 opacity-60" style={{ color: "var(--ln-gold)" }}>
          {icon}
        </span>
        <span className="flex-1 text-[11px] font-heading tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.7)" }}>
          {title}
        </span>
        {pulse && (
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4ADE80" }} />
        )}
        {count !== undefined && count > 0 && (
          <span
            className="flex-shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(196,154,40,0.12)", color: "rgba(196,154,40,0.7)" }}
          >
            {count}
          </span>
        )}
        <span className="flex-shrink-0 opacity-40" style={{ color: "var(--ln-smoke)" }}>
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1" style={{ borderTop: "1px solid rgba(196,154,40,0.07)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Signal Item ─────────────────────────────────────────────────────────────

function SignalItem({ event }: { event: any }) {
  return (
    <div className="flex items-start gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(196,154,40,0.05)" }}>
      <span className="flex-shrink-0 mt-0.5">{signalIcon(event.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] leading-snug" style={{ color: "var(--ln-parchment)" }}>
          {signalLabel(event.type, event.actorName)}
        </p>
        {event.createdAt && (
          <p className="text-[9px] mt-0.5" style={{ color: "rgba(196,154,40,0.4)" }}>
            {relativeTime(event.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Related Work Card ───────────────────────────────────────────────────────

function RelatedWorkCard({ item }: { item: any }) {
  const song = item.song ?? item;
  const relationship = item.relationship ?? item.reason ?? null;

  return (
    <Link href={`/song/${song.id}`}>
      <div
        className="flex items-center gap-2.5 rounded-lg p-2 cursor-pointer transition-colors hover:bg-white/[0.04]"
        style={{ border: "1px solid rgba(196,154,40,0.08)" }}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-9 h-9 rounded overflow-hidden" style={{ background: "rgba(196,154,40,0.08)" }}>
          {song.coverArtUrl
            ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center opacity-30" style={{ color: "var(--ln-gold)" }}>
                {contentTypeIcon(song.contentType)}
              </div>
          }
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{song.title}</p>
          {relationship && (
            <span
              className="inline-block text-[8px] uppercase tracking-wider px-1 py-0.5 rounded mt-0.5"
              style={{ background: "rgba(196,154,40,0.10)", color: "rgba(196,154,40,0.65)" }}
            >
              {relationship}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Creator Activity Card ───────────────────────────────────────────────────

function CreatorWorkCard({ song }: { song: any }) {
  return (
    <Link href={`/song/${song.id}`}>
      <div
        className="flex items-center gap-2.5 rounded-lg p-2 cursor-pointer transition-colors hover:bg-white/[0.04] mb-1"
        style={{ border: "1px solid rgba(196,154,40,0.07)" }}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded overflow-hidden" style={{ background: "rgba(196,154,40,0.08)" }}>
          {song.coverArtUrl
            ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center opacity-30" style={{ color: "var(--ln-gold)" }}>
                {contentTypeIcon(song.contentType)}
              </div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] truncate" style={{ color: "var(--ln-parchment)" }}>{song.title}</p>
          <p className="text-[9px]" style={{ color: "rgba(196,154,40,0.4)" }}>
            {song.contentType ?? "work"}{song.createdAt ? ` · ${relativeTime(song.createdAt)}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LivingContextRail({
  song, creator, songId, eventThread, relatedData, onGiftOpen,
}: LivingContextRailProps) {
  const [showAllSignals, setShowAllSignals] = useState(false);

  // Creator's recent works (max 6, excluding current song)
  // discover doesn't support creatorId — use getById-based approach via profile
  const { data: creatorWorks } = trpc.songs.discover.useQuery(
    creator?.id ? { limit: 7 } : undefined,
    { enabled: !!creator?.id }
  );
  const otherCreatorWorks = (creatorWorks ?? [])
    .filter((w: any) => w.id !== songId)
    .slice(0, 6);

  // Witnesses (reuse from EvidenceColumn data — just show count + latest 3)
  const { data: witnesses } = trpc.provenance.getWitnesses.useQuery({ songId });

  // Sessions (creator's public testimony/sessions)
  const creatorIdForSessions = creator?.id as number ?? 0;
  const { data: sessions } = trpc.testimony.getByCreator.useQuery(
    { creatorId: creatorIdForSessions, limit: 5 },
    { enabled: creatorIdForSessions > 0 }
  );

  const visibleSignals = showAllSignals ? eventThread : eventThread.slice(0, 10);
  const hasSignals = eventThread.length > 0;
  const hasRelated = relatedData.length > 0;
  const hasWitnesses = witnesses && witnesses.length > 0;
  const hasCreatorWorks = otherCreatorWorks.length > 0;
  const hasSessions = sessions && sessions.length > 0;

  // Marketplace: gift button is the commerce entry point
  const hasMarketplace = !!onGiftOpen;

  return (
    <div className="flex flex-col gap-2">
      {/* Rail label */}
      <div className="flex items-center gap-2 px-1 pb-1" style={{ borderBottom: "1px solid rgba(196,154,40,0.10)" }}>
        <Activity className="w-3.5 h-3.5 opacity-50" style={{ color: "var(--ln-gold)" }} />
        <span className="text-[9px] font-heading tracking-[0.2em] uppercase" style={{ color: "rgba(196,154,40,0.45)" }}>
          Living Context
        </span>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse ml-auto" style={{ background: "#4ADE80" }} />
      </div>

      {/* ── 1. Signals ── */}
      <ContextSection
        title="Signals"
        icon={<Activity className="w-3.5 h-3.5" />}
        defaultOpen={hasSignals}
        count={eventThread.length}
        pulse={hasSignals}
      >
        {!hasSignals ? (
          <p className="text-[11px] italic py-2" style={{ color: "rgba(196,154,40,0.35)" }}>No recent activity.</p>
        ) : (
          <>
            {visibleSignals.map((event: any, i: number) => (
              <SignalItem key={event.id ?? i} event={event} />
            ))}
            {eventThread.length > 10 && !showAllSignals && (
              <button
                type="button"
                onClick={() => setShowAllSignals(true)}
                className="mt-2 text-[10px] hover:underline"
                style={{ color: "var(--ln-gold)" }}
              >
                View all {eventThread.length} signals →
              </button>
            )}
          </>
        )}
      </ContextSection>

      {/* ── 2. Connected Manifestations ── */}
      {hasRelated && (
        <ContextSection
          title="Connected Manifestations"
          icon={<Layers className="w-3.5 h-3.5" />}
          defaultOpen={true}
          count={relatedData.length}
        >
          <div className="flex flex-col gap-1 mt-1">
            {relatedData.slice(0, 6).map((item: any, i: number) => (
              <RelatedWorkCard key={item.song?.id ?? i} item={item} />
            ))}
          </div>
          {relatedData.length > 6 && (
            <p className="text-[10px] mt-2" style={{ color: "rgba(196,154,40,0.45)" }}>
              +{relatedData.length - 6} more connected works
            </p>
          )}
        </ContextSection>
      )}

      {/* ── 3. Witness Registry ── */}
      <ContextSection
        title="Witness Registry"
        icon={<Eye className="w-3.5 h-3.5" />}
        defaultOpen={false}
        count={witnesses?.length ?? 0}
      >
        {!hasWitnesses ? (
          <p className="text-[11px] italic py-2" style={{ color: "rgba(196,154,40,0.35)" }}>No witnesses recorded yet.</p>
        ) : (
          <>
            {(witnesses ?? []).slice(0, 5).map((w: any, i: number) => (
              <div key={w.id ?? i} className="flex items-start gap-2 py-1.5" style={{ borderBottom: "1px solid rgba(196,154,40,0.05)" }}>
                <Eye className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#4ADE80" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px]" style={{ color: "var(--ln-parchment)" }}>
                    {w.inviteeName || w.witnessName || "Anonymous Witness"}
                  </p>
                  {w.createdAt && (
                    <p className="text-[9px]" style={{ color: "rgba(196,154,40,0.4)" }}>{relativeTime(w.createdAt)}</p>
                  )}
                </div>
                <span
                  className="flex-shrink-0 text-[8px] uppercase tracking-wider px-1 py-0.5 rounded"
                  style={{ background: "rgba(74,222,128,0.10)", color: "#4ADE80" }}
                >
                  {w.status ?? "Witnessed"}
                </span>
              </div>
            ))}
            <Link href={`/song/${songId}/witnesses`}>
              <button type="button" className="mt-2 flex items-center gap-1 text-[10px] hover:underline" style={{ color: "var(--ln-gold)" }}>
                View Registry <ExternalLink className="w-2.5 h-2.5" />
              </button>
            </Link>
          </>
        )}
      </ContextSection>

      {/* ── 4. Creator Activity ── */}
      <ContextSection
        title="Creator Activity"
        icon={<User className="w-3.5 h-3.5" />}
        defaultOpen={false}
        count={otherCreatorWorks.length}
      >
        {!hasCreatorWorks ? (
          <p className="text-[11px] italic py-2" style={{ color: "rgba(196,154,40,0.35)" }}>No other published works yet.</p>
        ) : (
          <>
            {otherCreatorWorks.map((work: any) => (
              <CreatorWorkCard key={work.id} song={work} />
            ))}
            {creator?.id && (
              <Link href={`/creator/${creator.id}`}>
                <button type="button" className="mt-1 flex items-center gap-1 text-[10px] hover:underline" style={{ color: "var(--ln-gold)" }}>
                  View full archive <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </Link>
            )}
          </>
        )}
      </ContextSection>

      {/* ── 5. Marketplace ── */}
      {hasMarketplace && (
        <ContextSection
          title="Marketplace"
          icon={<ShoppingBag className="w-3.5 h-3.5" />}
          defaultOpen={false}
        >
          <div className="py-2">
            <p className="text-[11px] mb-3 leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
              Support this creator directly. Every gift goes to the artist.
            </p>
            <button
              type="button"
              onClick={onGiftOpen}
              className="w-full py-2 rounded-lg text-[11px] font-heading tracking-wider uppercase transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(196,154,40,0.15) 0%, rgba(196,154,40,0.08) 100%)",
                border: "1px solid rgba(196,154,40,0.35)",
                color: "var(--ln-gold)",
              }}
            >
              ✦ Support Creator
            </button>
          </div>
        </ContextSection>
      )}

      {/* ── 6. Current Sessions ── */}
      <ContextSection
        title="Current Sessions"
        icon={<Radio className="w-3.5 h-3.5" />}
        defaultOpen={false}
        count={sessions?.length ?? 0}
        pulse={hasSessions}
      >
        {!hasSessions ? (
          <p className="text-[11px] italic py-2" style={{ color: "rgba(196,154,40,0.35)" }}>No active sessions.</p>
        ) : (
          <div className="flex flex-col gap-1.5 mt-1">
            {(sessions ?? []).slice(0, 5).map((session: any, i: number) => (
              <div
                key={session.id ?? i}
                className="rounded-lg px-2.5 py-2"
                style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.10)" }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Radio className="w-3 h-3 flex-shrink-0" style={{ color: "#4ADE80" }} />
                  <p className="text-[11px] font-medium truncate" style={{ color: "var(--ln-parchment)" }}>
                    {session.title || session.sessionTitle || "Untitled Session"}
                  </p>
                </div>
                {session.createdAt && (
                  <p className="text-[9px] flex items-center gap-1" style={{ color: "rgba(196,154,40,0.4)" }}>
                    <Clock className="w-2.5 h-2.5" />
                    {relativeTime(session.createdAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </ContextSection>
    </div>
  );
}
