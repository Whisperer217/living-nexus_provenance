/**
 * /licensed-downloads
 *
 * Shows all tracks the current user has been explicitly granted download access to.
 * Users can select multiple tracks (up to 20) and trigger a single ZIP download.
 * Creators can also see grants they have issued and revoke them from here.
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Download, Package, Shield, CheckSquare, Square, Loader2,
  ChevronRight, AlertTriangle, Music, User, Clock, X, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReceivedGrant {
  id: number;
  songId: number;
  grantedByUserId: number;
  note: string | null;
  expiresAt: Date | null;
  grantedAt: Date;
  song: {
    id: number;
    title: string;
    witnessId: string | null;
    coverArtUrl: string | null;
    genre: string | null;
  } | null;
  grantedBy: {
    id: number;
    name: string | null;
    artistHandle: string | null;
    profilePhotoUrl: string | null;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function formatExpiry(expiresAt: Date | null): string {
  if (!expiresAt) return "No expiry";
  const d = new Date(expiresAt);
  if (d < new Date()) return `Expired ${format(d, "MMM d, yyyy")}`;
  return `Expires ${format(d, "MMM d, yyyy")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LicensedDownloadsPage() {
  const { user } = useAuth();
  const authLoading = false; // useAuth resolves synchronously from tRPC cache
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: grants, isLoading, refetch } = trpc.songDownload.listReceivedGrants.useQuery(
    undefined,
    { enabled: !!user }
  );

  const bulkDownloadMutation = trpc.songDownload.bulkDownload.useMutation();

  // Only active (non-expired) grants
  const activeGrants = useMemo(
    () => (grants as ReceivedGrant[] | undefined)?.filter(g => !isExpired(g.expiresAt)) ?? [],
    [grants]
  );
  const expiredGrants = useMemo(
    () => (grants as ReceivedGrant[] | undefined)?.filter(g => isExpired(g.expiresAt)) ?? [],
    [grants]
  );

  const selectedSongIds = useMemo(
    () => activeGrants.filter(g => selected.has(g.id)).map(g => g.songId),
    [activeGrants, selected]
  );

  function toggleGrant(grantId: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(grantId)) {
        next.delete(grantId);
      } else {
        if (next.size >= 20) {
          toast.warning("Maximum 20 tracks per ZIP download.");
          return prev;
        }
        next.add(grantId);
      }
      return next;
    });
  }

  function selectAll() {
    const ids = activeGrants.slice(0, 20).map(g => g.id);
    setSelected(new Set(ids));
    if (activeGrants.length > 20) toast.info("First 20 tracks selected (ZIP limit).");
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleBulkDownload() {
    if (selectedSongIds.length === 0) return;
    setIsDownloading(true);
    try {
      const result = await bulkDownloadMutation.mutateAsync({ songIds: selectedSongIds });
      // Trigger the ZIP download via a temporary anchor
      const a = document.createElement("a");
      a.href = result.downloadUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(
        `Downloading ${result.trackCount} track${result.trackCount !== 1 ? "s" : ""} as ZIP…`,
        { duration: 5000 }
      );
      clearSelection();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  }

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "#0a0a0f" }}>
        <Shield className="w-12 h-12" style={{ color: "var(--ln-gold)" }} />
        <h2 className="text-xl font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
          Sign in to view your licensed downloads
        </h2>
        <a href={getLoginUrl("/licensed-downloads")}>
          <Button style={{ background: "var(--ln-gold)", color: "#000" }}>Sign In</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto" style={{ background: "#0a0a0f" }}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-2">
        <Package className="w-7 h-7" style={{ color: "var(--ln-gold)" }} />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
        >
          Licensed Downloads
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--ln-smoke)" }}>
        Tracks that creators have explicitly authorized you to download. Select up to 20 and
        download them as a single ZIP with a provenance manifest.
      </p>

      {/* ── Bulk action bar ── */}
      {activeGrants.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 mb-6 p-3 rounded-lg border"
          style={{ background: "rgba(196,154,40,0.06)", borderColor: "rgba(196,154,40,0.2)" }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--ln-parchment)" }}>
            {selected.size > 0 ? `${selected.size} selected` : "Select tracks to download"}
          </span>
          <div className="flex gap-2 ml-auto flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              disabled={activeGrants.length === 0}
              style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-smoke)" }}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              Select All
            </Button>
            {selected.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
                style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-smoke)" }}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleBulkDownload}
              disabled={selected.size === 0 || isDownloading}
              style={{
                background: selected.size > 0 ? "var(--ln-gold)" : "rgba(196,154,40,0.2)",
                color: selected.size > 0 ? "#000" : "var(--ln-smoke)",
              }}
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1" />
              )}
              {isDownloading ? "Preparing ZIP…" : `Download ZIP (${selected.size})`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ln-gold)" }} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && activeGrants.length === 0 && expiredGrants.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-xl border text-center"
          style={{ borderColor: "rgba(196,154,40,0.15)", background: "rgba(196,154,40,0.03)" }}
        >
          <Music className="w-12 h-12 mb-4 opacity-30" style={{ color: "var(--ln-gold)" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
            No licensed downloads yet
          </h3>
          <p className="text-sm max-w-xs" style={{ color: "var(--ln-smoke)" }}>
            When a creator grants you download access to one of their tracks, it will appear here.
          </p>
        </div>
      )}

      {/* ── Active grants list ── */}
      {!isLoading && activeGrants.length > 0 && (
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ln-gold)" }}>
              Active Grants ({activeGrants.length})
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              style={{ color: "var(--ln-smoke)" }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>

          {activeGrants.map((grant) => {
            const isSelected = selected.has(grant.id);
            const creatorName = grant.grantedBy?.artistHandle ?? grant.grantedBy?.name ?? "Unknown Creator";

            return (
              <div
                key={grant.id}
                onClick={() => toggleGrant(grant.id)}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                style={{
                  background: isSelected ? "rgba(196,154,40,0.1)" : "rgba(255,255,255,0.02)",
                  borderColor: isSelected ? "rgba(196,154,40,0.5)" : "rgba(255,255,255,0.08)",
                }}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
                  ) : (
                    <Square className="w-5 h-5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  )}
                </div>

                {/* Cover art */}
                <div
                  className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "rgba(196,154,40,0.1)" }}
                >
                  {grant.song?.coverArtUrl ? (
                    <img
                      src={grant.song.coverArtUrl}
                      alt={grant.song.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-medium text-sm truncate"
                      style={{ color: "var(--ln-parchment)" }}
                    >
                      {grant.song?.title ?? `Song #${grant.songId}`}
                    </span>
                    {grant.song?.witnessId && (
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0"
                        style={{ borderColor: "rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
                      >
                        WID
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--ln-smoke)" }}>
                      <User className="w-3 h-3" />
                      {creatorName}
                    </span>
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--ln-smoke)" }}>
                      <Clock className="w-3 h-3" />
                      {formatExpiry(grant.expiresAt)}
                    </span>
                    {grant.note && (
                      <span className="text-xs italic truncate max-w-[200px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                        "{grant.note}"
                      </span>
                    )}
                  </div>
                </div>

                {/* View track link */}
                <Link
                  href={`/song/${grant.songId}`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  className="flex-shrink-0 p-1.5 rounded hover:bg-white/5 transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Expired grants (collapsed) ── */}
      {!isLoading && expiredGrants.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.3)" }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            Expired Grants ({expiredGrants.length})
          </h2>
          <div className="space-y-1.5 opacity-50">
            {expiredGrants.map((grant) => (
              <div
                key={grant.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border"
                style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
              >
                <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Music className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm line-through" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {grant.song?.title ?? `Song #${grant.songId}`}
                  </span>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {formatExpiry(grant.expiresAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── How it works ── */}
      <div
        className="mt-10 p-4 rounded-xl border"
        style={{ borderColor: "rgba(196,154,40,0.15)", background: "rgba(196,154,40,0.03)" }}
      >
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
          <Shield className="w-4 h-4" />
          How Licensed Downloads Work
        </h3>
        <ul className="text-xs space-y-1.5" style={{ color: "var(--ln-smoke)" }}>
          <li>• A creator must explicitly grant you download access to each track.</li>
          <li>• Grants may have an expiry date set by the creator.</li>
          <li>• Each ZIP includes a <code className="px-1 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.07)" }}>manifest.json</code> with Witness ID and license information for every track.</li>
          <li>• Downloads are rate-limited to 5 ZIP requests per 10 minutes.</li>
          <li>• Maximum 20 tracks per ZIP bundle.</li>
        </ul>
      </div>
    </div>
  );
}
