/**
 * GuildPage — /guild/:slug
 *
 * Sections:
 *  1. Hero banner (banner image, avatar, name, description, member count, join button)
 *  2. Guild Mix (shared track list with "added by" attribution, play all)
 *  3. Members grid (avatar, handle, role badge)
 */

import { useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users,
  Music,
  Play,
  Crown,
  Shield,
  User,
  ArrowLeft,
  Plus,
} from "lucide-react";

/* ── Role badge ─────────────────────────────────────────────────────────── */
const ROLE_BADGE: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  owner: {
    icon: <Crown size={10} />,
    label: "Owner",
    color: "oklch(0.84 0.155 85)",
  },
  admin: {
    icon: <Shield size={10} />,
    label: "Admin",
    color: "oklch(0.65 0.2 300)",
  },
  member: {
    icon: <User size={10} />,
    label: "Member",
    color: "oklch(0.55 0.03 280)",
  },
};

/* ── Guild mix track row ─────────────────────────────────────────────────── */
function GuildMixRow({
  track,
  idx,
  onPlay,
}: {
  track: any;
  idx: number;
  onPlay: () => void;
}) {
  return (
    <div
      onClick={onPlay}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer hover:brightness-110 group"
      style={{
        background: "oklch(0.115 0.055 278)",
        border: "1px solid oklch(0.18 0.015 280)",
      }}
    >
      {/* Position */}
      <span
        className="text-[11px] w-5 text-center flex-shrink-0 group-hover:hidden"
        style={{ color: "oklch(0.45 0.03 280)" }}
      >
        {idx + 1}
      </span>
      <Play
        size={11}
        className="hidden group-hover:block flex-shrink-0"
        style={{ color: "oklch(0.84 0.155 85)" }}
      />

      {/* Cover art */}
      <div
        className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
        style={{ background: "oklch(0.10 0.025 270)" }}
      >
        {track.coverArtUrl ? (
          <img src={track.coverArtUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={11} style={{ color: "oklch(0.84 0.155 85 / 0.4)" }} />
          </div>
        )}
      </div>

      {/* Title + WID */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] font-medium truncate"
          style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}
        >
          {track.title}
        </p>
        {track.witnessId && (
          <p className="text-[10px] font-mono truncate" style={{ color: "oklch(0.45 0.03 280)" }}>
            {track.witnessId}
          </p>
        )}
      </div>

      {/* Added by */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px]" style={{ color: "oklch(0.45 0.03 280)" }}>
          added by
        </span>
        <span className="text-[10px] font-medium" style={{ color: "oklch(0.65 0.2 300)" }}>
          {track.addedByHandle || track.addedByName || "Unknown"}
        </span>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function GuildPage() {
  const [, params] = useRoute("/guild/:slug");
  const slug = params?.slug ?? "";
  const { user, isAuthenticated } = useAuth();
  const { playQueueAt } = usePlayer();
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.guilds.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  const { data: mixData, isLoading: mixLoading } = trpc.guilds.getMix.useQuery(
    { guildId: data?.guild.id ?? 0 },
    { enabled: !!data?.guild.id }
  );

  const join = trpc.guilds.join.useMutation({
    onSuccess: () => {
      toast.success("You joined the guild!");
      utils.guilds.getBySlug.invalidate({ slug });
    },
    onError: (err) => toast.error(err.message || "Failed to join"),
  });

  const isMember = data?.members.some((m: any) => m.userId === user?.id);

  const handlePlayAll = () => {
    if (!mixData || mixData.length === 0) return;
    const tracks = mixData
      .filter((t: any) => t.fileUrl)
      .map((t: any) => ({
        id: String(t.songId),
        title: t.title ?? "Untitled",
        artist: t.addedByHandle || t.addedByName || "Unknown",
        audioUrl: t.fileUrl ?? "",
        coverArt: t.coverArtUrl ?? "",
        artUrl: t.coverArtUrl ?? undefined,
        witnessId: t.witnessId ?? "",
        genre: "",
        aiDisclosure: "original" as const,
        coverPositionX: 50,
        coverPositionY: 50,
      }));
    if (tracks.length === 0) {
      toast.error("No playable tracks in this guild mix");
      return;
    }
    playQueueAt(tracks, 0, "PLAYLIST");
    toast.success("Playing guild mix");
  };

  const handlePlayTrack = (idx: number) => {
    if (!mixData) return;
    const tracks = mixData
      .filter((t: any) => t.fileUrl)
      .map((t: any) => ({
        id: String(t.songId),
        title: t.title ?? "Untitled",
        artist: t.addedByHandle || t.addedByName || "Unknown",
        audioUrl: t.fileUrl ?? "",
        coverArt: t.coverArtUrl ?? "",
        artUrl: t.coverArtUrl ?? undefined,
        witnessId: t.witnessId ?? "",
        genre: "",
        aiDisclosure: "original" as const,
        coverPositionX: 50,
        coverPositionY: 50,
      }));
    const startIdx = Math.min(idx, tracks.length - 1);
    if (tracks.length === 0) return;
    playQueueAt(tracks, startIdx, "PLAYLIST");
  };

  /* Loading */
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.09 0.04 265)" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "oklch(0.84 0.155 85)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  /* Not found */
  if (error || !data) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "oklch(0.09 0.04 265)" }}
      >
        <p className="text-lg" style={{ color: "oklch(0.7 0.03 280)" }}>
          Guild not found
        </p>
        <Link href="/guilds">
          <Button variant="outline" size="sm">
            <ArrowLeft size={13} className="mr-1.5" /> All Guilds
          </Button>
        </Link>
      </div>
    );
  }

  const { guild, members } = data;

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.09 0.04 265)", paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div className="relative" style={{ height: "clamp(180px, 28vw, 240px)" }}>
        {/* Banner image */}
        {guild.bannerUrl ? (
          <img
            src={guild.bannerUrl}
            alt={guild.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: "brightness(0.55)" }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.18 0.08 265) 0%, oklch(0.12 0.04 280) 100%)",
            }}
          />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 40%, oklch(0.09 0.04 265) 100%)",
          }}
        />
        {/* Back button */}
        <Link href="/guilds">
          <button
            className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-all hover:opacity-80"
            style={{
              background: "oklch(0.09 0.04 265 / 0.7)",
              border: "1px solid oklch(0.25 0.02 280 / 0.5)",
              color: "oklch(0.7 0.03 280)",
              backdropFilter: "blur(8px)",
            }}
          >
            <ArrowLeft size={12} /> All Guilds
          </button>
        </Link>
        {/* Avatar */}
        <div
          className="absolute left-6 z-20"
          style={{ bottom: "-28px" }}
        >
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden"
            style={{
              border: "3px solid oklch(0.09 0.04 265)",
              background: "oklch(0.12 0.04 280)",
              boxShadow: "0 4px 20px oklch(0.84 0.155 85 / 0.2)",
            }}
          >
            {guild.avatarUrl ? (
              <img src={guild.avatarUrl} alt={guild.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users size={24} style={{ color: "oklch(0.84 0.155 85 / 0.5)" }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Guild identity + actions ─────────────────────────────────── */}
      <div className="container max-w-3xl mx-auto px-4 pt-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}
            >
              {guild.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Users size={12} style={{ color: "oklch(0.5 0.03 280)" }} />
              <span className="text-[12px]" style={{ color: "oklch(0.5 0.03 280)" }}>
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                background: guild.isPublic ? "oklch(0.65 0.18 145 / 0.12)" : "oklch(0.65 0.18 25 / 0.12)",
                color: guild.isPublic ? "oklch(0.65 0.18 145)" : "oklch(0.65 0.18 25)",
                border: `1px solid ${guild.isPublic ? "oklch(0.65 0.18 145 / 0.25)" : "oklch(0.65 0.18 25 / 0.25)"}`,
              }}>
                {guild.isPublic ? "Public" : "Private"}
              </span>
            </div>
            {guild.description && (
              <p className="text-[13px] mt-2 max-w-lg" style={{ color: "oklch(0.65 0.03 280)" }}>
                {guild.description}
              </p>
            )}
          </div>

          {/* Join / member badge */}
          {isAuthenticated && !isMember && (
            <Button
              size="sm"
              disabled={join.isPending}
              onClick={() => join.mutate({ guildId: guild.id })}
              style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
            >
              <Plus size={13} className="mr-1.5" /> Join Guild
            </Button>
          )}
          {isMember && (
            <span
              className="text-[11px] px-3 py-1.5 rounded-full font-medium"
              style={{
                background: "oklch(0.65 0.18 145 / 0.12)",
                color: "oklch(0.65 0.18 145)",
                border: "1px solid oklch(0.65 0.18 145 / 0.25)",
              }}
            >
              ✓ Member
            </span>
          )}
        </div>

        {/* ── Guild Mix ─────────────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}
            >
              Guild Mix
            </h2>
            {mixData && mixData.length > 0 && (
              <Button
                size="sm"
                onClick={handlePlayAll}
                style={{
                  background: "oklch(0.84 0.155 85 / 0.12)",
                  border: "1px solid oklch(0.84 0.155 85 / 0.25)",
                  color: "oklch(0.84 0.155 85)",
                }}
              >
                <Play size={12} className="mr-1.5" /> Play All
              </Button>
            )}
          </div>

          {mixLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl animate-pulse"
                  style={{ background: "oklch(0.115 0.055 278)" }}
                />
              ))}
            </div>
          )}

          {!mixLoading && (!mixData || mixData.length === 0) && (
            <div
              className="rounded-xl p-8 text-center"
              style={{
                background: "oklch(0.10 0.03 270 / 0.5)",
                border: "1px dashed oklch(0.22 0.02 280)",
              }}
            >
              <Music size={24} className="mx-auto mb-2 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
              <p className="text-[12px]" style={{ color: "oklch(0.5 0.03 280)" }}>
                No tracks in the guild mix yet.
                {isMember && " Add tracks from any song page."}
              </p>
            </div>
          )}

          {!mixLoading && mixData && mixData.length > 0 && (
            <div className="space-y-1.5">
              {mixData.map((track: any, idx: number) => (
                <GuildMixRow
                  key={track.id}
                  track={track}
                  idx={idx}
                  onPlay={() => handlePlayTrack(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Members ───────────────────────────────────────────────── */}
        <div className="mt-8">
          <h2
            className="text-base font-semibold mb-3"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}
          >
            Members
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {members.map((m: any) => {
              const badge = ROLE_BADGE[m.role] ?? ROLE_BADGE.member;
              return (
                <Link key={m.userId} href={`/creator/${m.handle || m.userId}`}>
                  <div
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:brightness-110 cursor-pointer"
                    style={{
                      background: "oklch(0.115 0.055 278)",
                      border: "1px solid oklch(0.18 0.015 280)",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden"
                      style={{ background: "oklch(0.10 0.025 270)" }}
                    >
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.handle || m.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={18} style={{ color: "oklch(0.84 0.155 85 / 0.4)" }} />
                        </div>
                      )}
                    </div>
                    {/* Name */}
                    <p
                      className="text-[11px] font-medium text-center truncate w-full"
                      style={{ color: "oklch(0.85 0.02 85)" }}
                    >
                      {m.handle || m.name || "Anonymous"}
                    </p>
                    {/* Role badge */}
                    <span
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        background: `${badge.color} / 0.12`,
                        color: badge.color,
                        border: `1px solid ${badge.color} / 0.25`,
                      }}
                    >
                      {badge.icon} {badge.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
