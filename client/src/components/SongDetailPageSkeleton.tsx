import React from "react";
/**
 * SongDetailPageSkeleton
 * ─────────────────────────────────────────────────────────────────────────────
 * A pixel-accurate shimmer skeleton for SongDetailPage.
 *
 * Layout mirrors the real page exactly:
 *   • max-w-6xl two-column grid  (lg: 420px | 1fr)
 *   • Left  — square cover art block + play button + stats row
 *   • Right — title + creator handle + genre chips + reactions panel +
 *             activity panel + WID/provenance panel
 *
 * The shimmer animation uses the Living Nexus gold/coal palette so it
 * feels native to the design system rather than a generic grey flash.
 */

export function SongDetailPageSkeleton() {
  return (
    <div
      className="min-h-screen pb-8"
      style={{ background: "var(--ln-coal)" }}
      aria-hidden="true"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">

        {/* ── Back button ghost ── */}
        <div className="flex items-center gap-2 mb-6">
          <Bone className="w-4 h-4" />
          <Bone className="w-24 h-4" />
        </div>

        {/* ══ TWO-COLUMN GRID ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 mb-8">

          {/* ── LEFT: Cover art + CTA ── */}
          <div className="flex flex-col gap-4">
            {/* Square cover art */}
            <Bone className="w-full rounded-2xl" style={{ aspectRatio: "1/1" }} />

            {/* Play button */}
            <Bone className="w-full h-12 rounded-xl" />

            {/* Stats row */}
            <div className="flex items-center justify-center gap-5">
              <Bone className="w-12 h-3 rounded" />
              <Bone className="w-10 h-3 rounded" />
              <Bone className="w-10 h-3 rounded" />
            </div>
          </div>

          {/* ── RIGHT: Metadata + panels ── */}
          <div className="flex flex-col gap-5">

            {/* Title */}
            <div className="space-y-3">
              <Bone className="w-3/4 h-9 rounded-lg" />
              <Bone className="w-1/2 h-5 rounded" />

              {/* Genre chips */}
              <div className="flex flex-wrap gap-1.5">
                <Bone className="w-16 h-5 rounded-full" />
                <Bone className="w-24 h-5 rounded-full" />
                <Bone className="w-14 h-5 rounded-full" />
              </div>
            </div>

            {/* Reactions panel */}
            <div
              className="p-4 rounded"
              style={{ border: "1px solid rgba(196,154,40,0.15)", background: "rgba(196,154,40,0.02)" }}
            >
              <div className="flex flex-wrap gap-2 justify-center">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Bone key={i} className="w-12 h-8 rounded-full" />
                ))}
              </div>
            </div>

            {/* Activity / comments panel */}
            <div
              className="p-4 rounded"
              style={{ border: "1px solid rgba(196,154,40,0.15)", background: "rgba(196,154,40,0.02)" }}
            >
              {/* Panel header */}
              <div className="flex items-center gap-2 mb-4">
                <Bone className="w-4 h-4 rounded" />
                <Bone className="w-20 h-4 rounded" />
              </div>
              {/* Comment input ghost */}
              <div className="flex gap-2 mb-4">
                <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
                <Bone className="flex-1 h-8 rounded-lg" />
              </div>
              {/* Comment rows */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-2 mb-3">
                  <Bone className="w-7 h-7 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="w-24 h-3 rounded" />
                    <Bone className="w-full h-3 rounded" />
                    <Bone className="w-2/3 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* WID / Provenance panel */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(196,154,40,0.03)",
                border: "1px solid rgba(196,154,40,0.2)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2.5 px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
              >
                <Bone className="w-4 h-4 rounded" />
                <Bone className="w-32 h-4 rounded" />
              </div>
              {/* Body rows */}
              <div className="px-5 py-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Bone className="w-3 h-3 rounded flex-shrink-0" />
                    <Bone className="w-20 h-3 rounded" />
                    <Bone className="flex-1 h-3 rounded" />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Bone — a single shimmer block.
   Accepts className for sizing/shape and an optional inline style for
   anything that can't be expressed as a Tailwind class (e.g. aspectRatio).
───────────────────────────────────────────────────────────────────────────── */
function Bone({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`ln-skeleton ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
