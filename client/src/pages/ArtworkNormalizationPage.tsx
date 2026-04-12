/**
 * LIVING NEXUS — Artwork Normalization Admin Panel
 * v2.17.0 aligned — metadata-only pass, no asset modification
 *
 * Surfaces flagged records for creator review:
 *   • Missing artwork (no image uploaded)
 *   • Default position (50/50 — never manually set, AI focal detection recommended)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ScanLine, AlertTriangle, CheckCircle2, ImageOff, Crosshair,
  RefreshCw, ChevronDown, ChevronRight, ExternalLink,
  Music, User, LayoutGrid, ArrowLeft
} from "lucide-react";

type FlaggedRecord = {
  entityType: "song" | "user_banner" | "user_avatar" | "collection";
  entityId: number;
  entityTitle: string;
  creatorId: number;
  imageUrl: string | null;
  prevPositionX: number | null;
  prevPositionY: number | null;
  prevAvatarPosition: string | null;
  flagReason: string | null;
  normalizedAt: string;
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  song: <Music size={13} />,
  user_banner: <User size={13} />,
  user_avatar: <User size={13} />,
  collection: <LayoutGrid size={13} />,
};

const ENTITY_LABELS: Record<string, string> = {
  song: "Track",
  user_banner: "Banner",
  user_avatar: "Avatar",
  collection: "Collection",
};

function RecordRow({ record }: { record: FlaggedRecord }) {
  const [expanded, setExpanded] = useState(false);
  const isMissing = !record.imageUrl;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "#2C3438",
        border: `1px solid ${isMissing ? "rgba(239,68,68,0.35)" : "rgba(170,142,100,0.25)"}`,
      }}
    >
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Entity type badge */}
        <span
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-heading tracking-wide flex-shrink-0"
          style={{
            background: "#2C3438",
            color: "#AA8E64",
          }}
        >
          {ENTITY_ICONS[record.entityType]}
          {ENTITY_LABELS[record.entityType]}
        </span>

        {/* Title */}
        <span className="flex-1 text-[13px] font-body text-white/85 truncate">{record.entityTitle}</span>

        {/* Flag type */}
        <span
          className="flex items-center gap-1 text-[11px] flex-shrink-0"
          style={{ color: isMissing ? "#EF4444" : "#CBB183" }}
        >
          {isMissing ? <ImageOff size={12} /> : <Crosshair size={12} />}
          {isMissing ? "Missing artwork" : "Default position"}
        </span>

        {/* Expand */}
        <span className="text-white/30 flex-shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 pt-1 border-t"
          style={{ borderColor: "#2C3438" }}
        >
          <div className="flex gap-4 items-start">
            {/* Thumbnail */}
            <div
              className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{
                background: "#2C3438",
                border: `1px solid ${isMissing ? "rgba(239,68,68,0.3)" : "rgba(170,142,100,0.2)"}`,
              }}
            >
              {record.imageUrl ? (
                <img
                  src={record.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: record.prevAvatarPosition
                      ?? `${record.prevPositionX ?? 50}% ${record.prevPositionY ?? 50}%`,
                  }}
                />
              ) : (
                <ImageOff size={20} style={{ color: "rgba(239,68,68,0.6)" }} />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-[11px] font-body" style={{ color: "#3F4A50" }}>
                {record.flagReason}
              </div>

              {record.prevPositionX !== null && (
                <div className="text-[11px] font-mono" style={{ color: "#3F4A50" }}>
                  Position: {record.prevPositionX}% × {record.prevPositionY}%
                </div>
              )}
              {record.prevAvatarPosition && (
                <div className="text-[11px] font-mono" style={{ color: "#3F4A50" }}>
                  Avatar position: {record.prevAvatarPosition}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {/* Link to entity */}
                {record.entityType === "song" && (
                  <Link href={`/song/${record.entityId}`}>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 gap-1">
                      <ExternalLink size={10} /> View Track
                    </Button>
                  </Link>
                )}
                {(record.entityType === "user_banner" || record.entityType === "user_avatar") && (
                  <Link href={`/creator/${record.creatorId}`}>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 gap-1">
                      <ExternalLink size={10} /> View Profile
                    </Button>
                  </Link>
                )}
                {record.entityType === "collection" && (
                  <span className="text-[11px]" style={{ color: "#3F4A50" }}>
                    Collection #{record.entityId}
                  </span>
                )}

                <span className="text-[10px] ml-auto" style={{ color: "#3F4A50" }}>
                  Creator #{record.creatorId}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArtworkNormalizationPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [activeGroup, setActiveGroup] = useState<"missing" | "default">("missing");

  const reportQuery = trpc.normalization.getReport.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const flaggedQuery = trpc.normalization.getFlagged.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const runAudit = trpc.normalization.runAudit.useMutation({
    onSuccess: () => {
      reportQuery.refetch();
      flaggedQuery.refetch();
      setRunning(false);
      toast.success("Normalization audit complete");
    },
    onError: (err) => {
      setRunning(false);
      toast.error(`Audit failed: ${err.message}`);
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white/40 font-body text-sm">Admin access required.</p>
      </div>
    );
  }

  const report = reportQuery.data;
  const flagged = flaggedQuery.data;
  const missingRecords = flagged?.grouped?.missingArtwork ?? [];
  const defaultRecords = flagged?.grouped?.defaultPosition ?? [];

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin">
          <button type="button" className="flex items-center gap-1.5 text-[12px] mb-4 hover:opacity-80 transition-opacity"
            style={{ color: "#3F4A50" }}>
            <ArrowLeft size={13} /> Back to Admin
          </button>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl tracking-wider mb-1"
              style={{ color: "#CBB183" }}>
              Artwork Normalization
            </h1>
            <p className="text-[13px] font-body" style={{ color: "#3F4A50" }}>
              v2.17.0 aligned — metadata-only pass. No original assets modified.
              Flags records where position data was never manually set or artwork is missing.
            </p>
          </div>

          <Button
            onClick={() => { setRunning(true); runAudit.mutate(); }}
            disabled={running}
            className="flex-shrink-0 gap-2 font-heading tracking-wide text-[12px]"
            style={{
              background: running ? "#2C3438" : "rgba(203,177,131,0.12)",
              color: "#CBB183",
              border: "1px solid rgba(203,177,131,0.35)",
            }}
          >
            {running ? <RefreshCw size={13} className="animate-spin" /> : <ScanLine size={13} />}
            {running ? "Scanning…" : "Run Audit"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Records Scanned", value: report.totalScanned, icon: <ScanLine size={16} />, color: "#AA8E64" },
            { label: "Clean", value: report.totalNormalized, icon: <CheckCircle2 size={16} />, color: "#4ADE80" },
            { label: "Flagged", value: report.totalFlagged, icon: <AlertTriangle size={16} />, color: "#E6CDAE" },
          ].map(card => (
            <div key={card.label} className="rounded-xl p-4"
              style={{ background: "#2C3438", border: "1px solid #2C3438" }}>
              <div className="flex items-center gap-2 mb-2" style={{ color: card.color }}>
                {card.icon}
                <span className="text-[11px] font-heading tracking-wide uppercase">{card.label}</span>
              </div>
              <div className="text-2xl font-heading" style={{ color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Summary text */}
      {report && (
        <div className="rounded-xl p-4 mb-8 font-mono text-[11px] whitespace-pre-wrap leading-relaxed"
          style={{
            background: "#2C3438",
            border: "1px solid #2C3438",
            color: "#3F4A50",
          }}>
          {report.summary}
          {"\n\nLast run: "}{new Date(report.runAt).toLocaleString()}
        </div>
      )}

      {/* No report yet */}
      {!report && !running && (
        <div className="text-center py-20">
          <ScanLine size={32} className="mx-auto mb-4 opacity-20" />
          <p className="text-[14px] font-body" style={{ color: "#3F4A50" }}>
            No audit has been run yet. Click "Run Audit" to scan all artwork records.
          </p>
        </div>
      )}

      {/* Flagged records */}
      {flagged?.hasReport && (flagged.totalFlagged ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} style={{ color: "#E6CDAE" }} />
            <h2 className="font-heading text-sm tracking-wider" style={{ color: "#E6CDAE" }}>
              Flagged Records — {flagged.totalFlagged} requiring creator attention
            </h2>
          </div>

          {/* Group tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { key: "missing" as const, label: `Missing Artwork (${missingRecords.length})`, icon: <ImageOff size={12} /> },
              { key: "default" as const, label: `Default Position (${defaultRecords.length})`, icon: <Crosshair size={12} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveGroup(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-heading tracking-wide transition-all"
                style={{
                  background: activeGroup === tab.key ? "rgba(203,177,131,0.12)" : "#2C3438",
                  color: activeGroup === tab.key ? "#CBB183" : "#3F4A50",
                  border: `1px solid ${activeGroup === tab.key ? "rgba(203,177,131,0.28)" : "#2C3438"}`,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Records list */}
          <div className="space-y-2">
            {(activeGroup === "missing" ? missingRecords : defaultRecords).map((record, i) => (
              <RecordRow key={`${record.entityType}-${record.entityId}-${i}`} record={record} />
            ))}
            {(activeGroup === "missing" ? missingRecords : defaultRecords).length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: "rgba(74,222,128,0.5)" }} />
                <p className="text-[13px] font-body" style={{ color: "#3F4A50" }}>
                  No {activeGroup === "missing" ? "missing artwork" : "default position"} records found.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All clean */}
      {flagged?.hasReport && (flagged.totalFlagged ?? 0) === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 size={40} className="mx-auto mb-4" style={{ color: "rgba(74,222,128,0.6)" }} />
          <h3 className="font-heading text-lg mb-2" style={{ color: "#4ADE80" }}>
            All Records Normalized
          </h3>
          <p className="text-[13px] font-body" style={{ color: "#3F4A50" }}>
            Every artwork record has an image and a manually-set focal position.
          </p>
        </div>
      )}
    </div>
  );
}
