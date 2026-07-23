/**
 * GcodeDetailPage — Work detail page for contentType = "gcode" | "3dmodel"
 *
 * Renders the interactive G-code toolpath viewer alongside provenance metadata,
 * print statistics, and creator information in the cathedral's dark aesthetic.
 */

import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronLeft, Copy, Share2, Download, Shield,
  Layers, Printer, FileCode2, History,
} from "lucide-react";
import { QRShareModal, type QRCardEntity } from "@/components/QRIdentityCard";
import { CreatorHandle } from "@/components/CreatorHandle";
import { GCodeViewer } from "@/components/GCodeViewer";

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "Unknown";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtFileSize(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GcodeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id ?? "0", 10);
  const [idCardOpen, setIdCardOpen] = useState(false);

  const { data: songData, isLoading } = trpc.songs.getById.useQuery(
    { id: songId },
    { enabled: !!songId }
  );

  const { data: versionsData } = trpc.versions.list.useQuery(
    { songId },
    { enabled: !!songId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--ln-gold)] border-t-transparent" />
      </div>
    );
  }

  const song = (songData as any)?.song ?? songData;

  if (!song || (song.contentType !== "gcode" && song.contentType !== "3dmodel")) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--ln-coal)" }}>
        <Printer className="w-16 h-16 text-[var(--ln-gold)] opacity-40" />
        <p className="text-white/60">3D work not found.</p>
        <Link href="/explore">
          <Button variant="outline" className="border-[var(--ln-gold)] text-[var(--ln-gold)]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Explore
          </Button>
        </Link>
      </div>
    );
  }

  const creator = (songData as any)?.creator;
  const gcodeUrl = song.gcodeUrl ?? song.fileUrl;
  const printStats = (() => {
    try { return song.printStatsJson ? JSON.parse(song.printStatsJson) : null; } catch { return null; }
  })();
  const widLabel = song.witnessId ?? (song.contentType === "gcode" ? "WID-GCD-UNREGISTERED" : "WID-3DM-UNREGISTERED");
  const isGcode = song.contentType === "gcode";
  const typeLabel = isGcode ? "G-CODE" : "3D MODEL";
  const TypeIcon = isGcode ? FileCode2 : Printer;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: song.title, url: window.location.href }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const qrEntity: QRCardEntity = {
    id: song.id,
    type: "song",
    slug: song.witnessId ?? String(song.id),
    name: song.title,
    subtitle: creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name ?? "Unknown Creator"),
    thumbnailUrl: song.coverArtUrl ?? undefined,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-coal)" }}>
      {/* Top nav */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: "var(--ln-coal)" }}
      >
        <Link href={creator ? `/creator/${creator.artistHandle ?? creator.id}` : "/explore"}>
          <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" />
            {creator?.artistHandle ?? "Back"}
          </button>
        </Link>
        <span
          className="text-xs font-mono tracking-widest uppercase flex items-center gap-1"
          style={{ color: "var(--ln-gold)" }}
        >
          <TypeIcon className="w-3.5 h-3.5" /> {typeLabel}
        </span>
        <div className="flex items-center gap-2">
          {gcodeUrl && (
            <a href={gcodeUrl} download>
              <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" title="Download G-code file">
                <Download className="w-4 h-4" />
              </Button>
            </a>
          )}
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={handleCopyLink}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Header: title + creator */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-white leading-tight" style={{ fontFamily: "'Cinzel', serif" }}>
              {song.title}
            </h1>
            <span
              className="flex-shrink-0 text-xs font-mono px-2 py-1 rounded"
              style={{
                background: "rgba(196,154,40,0.1)",
                border: "1px solid rgba(196,154,40,0.3)",
                color: "rgba(196,154,40,0.8)",
              }}
            >
              {typeLabel}
            </span>
          </div>
          {creator && (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">by</span>
              <CreatorHandle
                userId={creator.id}
                handle={creator.artistHandle}
                displayName={creator.name}
                role={creator.role}
                size="sm"
              />
            </div>
          )}
        </div>

        {/* G-code viewer */}
        {gcodeUrl ? (
          <GCodeViewer
            gcodeUrl={gcodeUrl}
            printStats={printStats}
            title={song.title}
          />
        ) : (
          /* No G-code file — show cover art fallback */
          song.coverArtUrl ? (
            <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <div
                className="absolute inset-0 scale-110 blur-2xl opacity-40"
                style={{ backgroundImage: `url(${song.coverArtUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <img
                src={song.coverArtUrl}
                alt={song.title}
                className="relative w-full h-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-full rounded-xl flex flex-col items-center justify-center gap-3 py-16"
              style={{ background: "rgba(196,154,40,0.04)", border: "1px dashed rgba(196,154,40,0.2)" }}
            >
              <TypeIcon className="w-12 h-12" style={{ color: "rgba(196,154,40,0.3)" }} />
              <p className="text-sm" style={{ color: "rgba(196,154,40,0.4)", fontFamily: "'Cinzel', serif" }}>
                No viewer available
              </p>
            </div>
          )
        )}

        {/* Description / caption */}
        {(song.description || song.caption) && (
          <div className="space-y-2">
            {song.headlineCaption && (
              <p className="text-lg text-white/80 font-medium" style={{ fontFamily: "'Cinzel', serif" }}>
                {song.headlineCaption}
              </p>
            )}
            {(song.description || song.caption) && (
              <p className="text-white/60 text-sm leading-relaxed">
                {song.description ?? song.caption}
              </p>
            )}
          </div>
        )}

        {/* Print stats summary row */}
        {printStats && (
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {printStats.layerCount != null && (
              <StatCard label="Layers" value={printStats.layerCount.toLocaleString()} icon={<Layers className="w-4 h-4" />} />
            )}
            {printStats.estimatedPrintTime && (
              <StatCard label="Est. Time" value={printStats.estimatedPrintTime} icon={<Printer className="w-4 h-4" />} />
            )}
            {printStats.filamentUsedG != null && (
              <StatCard label="Filament" value={`${printStats.filamentUsedG.toFixed(1)} g`} icon={<FileCode2 className="w-4 h-4" />} />
            )}
            {printStats.slicer && (
              <StatCard label="Slicer" value={`${printStats.slicer}${printStats.slicerVersion ? ` ${printStats.slicerVersion}` : ""}`} icon={<Shield className="w-4 h-4" />} />
            )}
          </div>
        )}

        {/* Provenance section */}
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.15)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
              Witnessed Object
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <ProvenanceRow label="Witness ID" value={widLabel} mono />
            <ProvenanceRow label="Registered" value={fmtDate(song.createdAt)} />
            {song.fileHash && <ProvenanceRow label="File Hash" value={song.fileHash.slice(0, 16) + "…"} mono />}
            {creator?.artistHandle && <ProvenanceRow label="Creator" value={creator.artistHandle} />}
          </div>

          <button
            onClick={() => setIdCardOpen(true)}
            className="mt-2 text-xs flex items-center gap-1.5 transition-colors"
            style={{ color: "rgba(196,154,40,0.6)" }}
          >
            <Shield className="w-3 h-3" />
            View Identity Card
          </button>
        </div>

        {/* Version history */}
        {versionsData && versionsData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
                Version History
              </span>
            </div>
            <div className="space-y-1">
              {versionsData.map((v: any, i: number) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-white/50">v{versionsData.length - i}</span>
                  <span className="text-white/40 text-xs">{fmtDate(v.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Identity Card modal */}
      {idCardOpen && (
        <QRShareModal
          entity={qrEntity}
          trigger={
            <button
              id="gcode-qr-trigger"
              style={{ display: "none" }}
              onClick={() => setIdCardOpen(false)}
            />
          }
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)" }}
    >
      <div className="flex items-center gap-1.5" style={{ color: "rgba(196,154,40,0.5)" }}>
        {icon}
        <span className="text-xs uppercase tracking-wide" style={{ fontFamily: "'Cinzel', serif" }}>{label}</span>
      </div>
      <p className="text-white font-semibold text-sm truncate">{value}</p>
    </div>
  );
}

function ProvenanceRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide" style={{ color: "rgba(196,154,40,0.4)", fontFamily: "'Cinzel', serif" }}>
        {label}
      </span>
      <span
        className={`text-white/70 text-sm truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
