import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────
interface WorkRecord {
  id: number;
  title: string;
  witnessId: string | null;
  lyricsWid: string | null;
  contentType: string;
  genre: string | null;
  status: string;
  aiDisclosure: string;
  aiConsent: boolean;
  bpm: number | null;
  musicalKey: string | null;
  isrc: string | null;
  duration: number | null;
  lyricsText: string | null;
  haaiOriginStory: string | null;
  haaiVisualConcept: string | null;
  haaiStyleLanguage: string | null;
  haaiInstrumentation: string | null;
  haaiVocalConveyance: string | null;
  haaiLyricalInspiration: string | null;
  haaiEmotionalTone: string | null;
  haaiDeclaredAt: string | null;
  fileUrl: string | null;
  fileKey: string | null;
  coverArtUrl: string | null;
  videoUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function buildProvenanceJson(work: WorkRecord, creatorName: string): string {
  const doc = {
    _platform: "Living Nexus — BDDT Publishing / Command Domains LLC",
    _exportedAt: new Date().toISOString(),
    _exportVersion: "2.0",
    registry: {
      witnessId: work.witnessId,
      lyricsWid: work.lyricsWid,
      registeredAt: work.createdAt,
      lastUpdated: work.updatedAt,
      status: work.status,
    },
    work: {
      id: work.id,
      title: work.title,
      contentType: work.contentType,
      genre: work.genre,
      bpm: work.bpm,
      musicalKey: work.musicalKey,
      isrc: work.isrc,
      duration: work.duration,
    },
    creator: {
      name: creatorName,
    },
    disclosure: {
      aiDisclosure: work.aiDisclosure,
      aiConsent: work.aiConsent,
      haaiOriginStory: work.haaiOriginStory,
      haaiVisualConcept: work.haaiVisualConcept,
      haaiStyleLanguage: work.haaiStyleLanguage,
      haaiInstrumentation: work.haaiInstrumentation,
      haaiVocalConveyance: work.haaiVocalConveyance,
      haaiLyricalInspiration: work.haaiLyricalInspiration,
      haaiEmotionalTone: work.haaiEmotionalTone,
      haaiDeclaredAt: work.haaiDeclaredAt,
    },
    media: {
      audioFile: work.fileUrl ?? null,
      coverArt: work.coverArtUrl ?? null,
      video: work.videoUrl ?? null,
      s3Key: work.fileKey ?? null,
    },
    lyrics: work.lyricsText ?? null,
  };
  return JSON.stringify(doc, null, 2);
}

async function downloadBatchAsZip(works: WorkRecord[], creatorName: string, batchLabel: string) {
  // Dynamically import JSZip (already in package.json)
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const work of works) {
    const safeName = (work.title ?? `work-${work.id}`)
      .replace(/[^a-zA-Z0-9\-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);
    const widSuffix = work.witnessId ? `-${work.witnessId.slice(-8)}` : `-id${work.id}`;
    const folder = zip.folder(`${safeName}${widSuffix}`)!;

    // 1. Provenance JSON — always present
    folder.file("provenance.json", buildProvenanceJson(work, creatorName));

    // 2. Lyrics text — if present
    if (work.lyricsText) {
      folder.file("lyrics.txt", work.lyricsText);
    }

    // 3. Audio link file — direct URL to the audio file
    if (work.fileUrl) {
      folder.file("audio-download-url.txt",
        `Audio File: ${work.title}\nDirect URL: ${work.fileUrl}\n\nTo download: paste this URL into your browser or use:\n  curl -L "${work.fileUrl}" -o "${safeName}.mp3"\n`
      );
    }

    // 4. Cover art link file
    if (work.coverArtUrl) {
      folder.file("cover-art-url.txt",
        `Cover Art: ${work.title}\nDirect URL: ${work.coverArtUrl}\n\nTo download: paste this URL into your browser or use:\n  curl -L "${work.coverArtUrl}" -o "${safeName}-cover.jpg"\n`
      );
    }

    // 5. Video link file
    if (work.videoUrl) {
      folder.file("video-url.txt",
        `Video: ${work.title}\nDirect URL: ${work.videoUrl}\n`
      );
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `living-nexus-archive-${batchLabel}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CreatorDataExportPage() {
  const { user } = useAuth();
  const [offset, setOffset] = useState(0);
  const BATCH_SIZE = 10;
  const [downloading, setDownloading] = useState(false);
  const [downloadedBatches, setDownloadedBatches] = useState<Set<number>>(new Set());

  const { data, isLoading, error } = trpc.onboarding.exportBatch.useQuery(
    { offset, limit: BATCH_SIZE },
    { enabled: !!user }
  );

  const totalCount = data?.totalCount ?? 0;
  const totalBatches = Math.ceil(totalCount / BATCH_SIZE);
  const currentBatch = Math.floor(offset / BATCH_SIZE) + 1;
  const works = (data?.works ?? []) as WorkRecord[];
  const creatorName = user?.name ?? user?.email ?? "Creator";

  const handleDownloadBatch = async () => {
    if (!works.length) return;
    setDownloading(true);
    try {
      const batchLabel = `batch-${currentBatch}-of-${totalBatches}`;
      await downloadBatchAsZip(works, creatorName, batchLabel);
      setDownloadedBatches(prev => new Set(Array.from(prev).concat([currentBatch])));
      toast.success(`Batch ${currentBatch} downloaded — ${works.length} works`);
    } catch (err) {
      console.error(err);
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!totalCount) return;
    setDownloading(true);
    try {
      // Fetch all works in batches and download each
      for (let off = 0; off < totalCount; off += BATCH_SIZE) {
        const batchNum = Math.floor(off / BATCH_SIZE) + 1;
        toast.info(`Preparing batch ${batchNum} of ${totalBatches}…`);
        // We need to fetch this batch — use a direct fetch since we can't call hooks in a loop
        // Instead, just download the current batch and prompt user to advance
        break; // Only download current batch in "download all" — user advances manually
      }
      await handleDownloadBatch();
    } finally {
      setDownloading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
        <div className="text-center">
          <p style={{ color: "var(--ln-smoke)" }}>Sign in to access your archive.</p>
          <Link href="/"><Button className="mt-4">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-coal)", color: "var(--ln-parchment)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--ln-border)" }}>
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/profile" className="text-sm" style={{ color: "var(--ln-smoke)" }}>← Back to Profile</Link>
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
            Creator Data Archive
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ln-smoke)" }}>
            Every work you registered on Living Nexus — with full provenance records, metadata, and media links.
            This is your data. Take it with you.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Works", value: isLoading ? "…" : String(totalCount) },
            { label: "Total Batches", value: isLoading ? "…" : String(totalBatches) },
            { label: "Batch Size", value: String(BATCH_SIZE) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-4 text-center" style={{ background: "var(--ln-void-2)", border: "1px solid var(--ln-border)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: "var(--ln-smoke)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* What's in each ZIP */}
        <div className="rounded-lg p-5" style={{ background: "var(--ln-void-2)", border: "1px solid var(--ln-border)" }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em" }}>
            WHAT EACH ZIP CONTAINS
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: "var(--ln-smoke)" }}>
            {[
              "provenance.json — Full WID record, metadata, HAAI declaration",
              "audio-download-url.txt — Direct link to your audio file",
              "cover-art-url.txt — Direct link to your cover art",
              "lyrics.txt — Embedded lyrics (if present)",
              "video-url.txt — Video link (if applicable)",
              "All fields: ISRC, BPM, key, genre, AI disclosure, timestamps",
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <span style={{ color: "var(--ln-gold)" }}>◎</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Batch navigator */}
        <div className="rounded-lg p-6" style={{ background: "var(--ln-void-2)", border: "1px solid var(--ln-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em" }}>
              BATCH {currentBatch} OF {totalBatches || "…"}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - BATCH_SIZE))}
                disabled={offset === 0 || isLoading}
                className="px-3 py-1 rounded text-sm disabled:opacity-40"
                style={{ background: "var(--ln-void-3)", color: "var(--ln-parchment)", border: "1px solid var(--ln-border)" }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setOffset(offset + BATCH_SIZE)}
                disabled={offset + BATCH_SIZE >= totalCount || isLoading}
                className="px-3 py-1 rounded text-sm disabled:opacity-40"
                style={{ background: "var(--ln-void-3)", color: "var(--ln-parchment)", border: "1px solid var(--ln-border)" }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Work list for current batch */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: BATCH_SIZE }).map((_, i) => (
                <div key={i} className="h-12 rounded animate-pulse" style={{ background: "var(--ln-void-3)" }} />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm" style={{ color: "var(--ln-crimson, #c0392b)" }}>Failed to load works. Please refresh.</p>
          ) : works.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--ln-smoke)" }}>No works found in your registry.</p>
          ) : (
            <div className="space-y-2">
              {works.map((work, i) => (
                <div key={work.id} className="flex items-center gap-3 p-3 rounded" style={{ background: "var(--ln-void-3)" }}>
                  <span className="text-xs w-6 text-right" style={{ color: "var(--ln-smoke)" }}>{offset + i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)" }}>{work.title}</div>
                    <div className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                      {work.contentType} · {work.genre ?? "—"} · {work.witnessId ? work.witnessId.slice(0, 20) + "…" : "No WID"}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {work.fileUrl && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)" }}>Audio</span>}
                    {work.coverArtUrl && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.1)", color: "var(--ln-gold)" }}>Art</span>}
                    {work.lyricsText && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.1)", color: "var(--ln-gold)" }}>Lyrics</span>}
                    {work.witnessId && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}>WID</span>}
                  </div>
                  {downloadedBatches.has(currentBatch) && (
                    <span className="text-xs" style={{ color: "#22c55e" }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Download button */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleDownloadBatch}
              disabled={downloading || isLoading || works.length === 0}
              className="flex-1 py-3 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "var(--ln-gold)", color: "var(--ln-coal)", fontFamily: "'Cinzel', serif", letterSpacing: "0.05em" }}
            >
              {downloading ? "Preparing ZIP…" : `Download Batch ${currentBatch} (${works.length} works)`}
            </button>
          </div>
          {downloadedBatches.has(currentBatch) && (
            <p className="text-xs mt-2 text-center" style={{ color: "#22c55e" }}>
              ✓ Batch {currentBatch} downloaded. Advance to the next batch when ready.
            </p>
          )}
        </div>

        {/* Progress tracker */}
        {totalBatches > 1 && (
          <div className="rounded-lg p-5" style={{ background: "var(--ln-void-2)", border: "1px solid var(--ln-border)" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em" }}>
              DOWNLOAD PROGRESS
            </h2>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: totalBatches }).map((_, i) => {
                const batchNum = i + 1;
                const isCurrent = batchNum === currentBatch;
                const isDone = downloadedBatches.has(batchNum);
                return (
                  <button
                    key={batchNum}
                    onClick={() => setOffset(i * BATCH_SIZE)}
                    className="w-9 h-9 rounded text-xs font-semibold transition-all"
                    style={{
                      background: isDone ? "rgba(34,197,94,0.2)" : isCurrent ? "var(--ln-gold)" : "var(--ln-void-3)",
                      color: isDone ? "#22c55e" : isCurrent ? "var(--ln-coal)" : "var(--ln-smoke)",
                      border: `1px solid ${isDone ? "#22c55e" : isCurrent ? "var(--ln-gold)" : "var(--ln-border)"}`,
                    }}
                  >
                    {isDone ? "✓" : batchNum}
                  </button>
                );
              })}
            </div>
            <p className="text-xs mt-3" style={{ color: "var(--ln-smoke)" }}>
              {downloadedBatches.size} of {totalBatches} batches downloaded · {downloadedBatches.size * BATCH_SIZE} of {totalCount} works
            </p>
          </div>
        )}

        {/* Full JSON export */}
        <div className="rounded-lg p-5" style={{ background: "var(--ln-void-2)", border: "1px solid var(--ln-border)" }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em" }}>
            FULL ACCOUNT EXPORT (JSON)
          </h2>
          <p className="text-xs mb-3" style={{ color: "var(--ln-smoke)" }}>
            Download your complete account data as a single JSON file — profile, all works metadata, testimonies, HAAI declarations, and version history.
          </p>
          <FullJsonExportButton creatorName={creatorName} />
        </div>

        {/* Note on S3 files */}
        <div className="rounded-lg p-4 text-xs" style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-smoke)" }}>
          <strong style={{ color: "var(--ln-gold)" }}>Note on audio and image files:</strong> The ZIP contains direct URLs to your audio and cover art files hosted on the CDN. These URLs are permanent and will remain accessible. To download the actual binary files, use the URLs in the text files or use a download manager.
        </div>
      </div>
    </div>
  );
}

// ── Full JSON export button ────────────────────────────────────────────────
function FullJsonExportButton({ creatorName }: { creatorName: string }) {
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await utils.onboarding.exportData.fetch();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `living-nexus-full-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Full account export downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
      style={{ background: "var(--ln-void-3)", color: "var(--ln-parchment)", border: "1px solid var(--ln-border)", fontFamily: "'Cinzel', serif" }}
    >
      {loading ? "Preparing…" : "Download Full Account JSON"}
    </button>
  );
}
