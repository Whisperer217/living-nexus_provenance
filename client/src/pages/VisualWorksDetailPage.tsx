/**
 * VisualWorksDetailPage.tsx
 *
 * Detail view for a single Visual Works collection.
 * Shows hero metadata, provenance WID, and a masonry image grid.
 */
import React, { useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

const ACCENT = "#FDA4AF";
const ACCENT_BG = "rgba(253,164,175,0.08)";
const ACCENT_BORDER = "rgba(253,164,175,0.25)";

function WIDPill({ wid, prefix }: { wid: string; prefix?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(wid).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider transition-all hover:opacity-80"
      style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT }}
    >
      {prefix && <span style={{ opacity: 0.6 }}>{prefix} </span>}
      {copied ? "✓ Copied" : wid}
    </button>
  );
}

export default function VisualWorksDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const { user } = useAuth();

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const { data, isLoading, error } = trpc.visualWorks.getCollection.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void, #0A0806)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void, #0A0806)" }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: "#8B9BA3" }}>Collection not found.</p>
          <button onClick={() => navigate("/visual-works")} className="text-xs hover:underline" style={{ color: ACCENT }}>
            ← Back to Visual Works
          </button>
        </div>
      </div>
    );
  }

  const { collection, items } = data;
  const isOwner = !!user && user.id === (collection as any).creatorId;

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void, #0A0806)" }}>
      {/* Lightbox */}
      {lightboxIdx !== null && items[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-sm hover:opacity-70"
            style={{ color: "#8B9BA3" }}
            onClick={() => setLightboxIdx(null)}
          >
            ✕ Close
          </button>
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl hover:opacity-70"
              style={{ color: ACCENT }}
              onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              ‹
            </button>
          )}
          {lightboxIdx < items.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl hover:opacity-70"
              style={{ color: ACCENT }}
              onClick={e => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              ›
            </button>
          )}
          <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3 px-4" onClick={e => e.stopPropagation()}>
            <img
              src={items[lightboxIdx].imageUrl}
              alt={items[lightboxIdx].title ?? ""}
              className="max-h-[75vh] max-w-full rounded-xl object-contain"
              style={{ border: `1px solid ${ACCENT_BORDER}` }}
            />
            <div className="text-center">
              {items[lightboxIdx].title && (
                <p className="text-sm font-medium" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>{items[lightboxIdx].title}</p>
              )}
              {items[lightboxIdx].witnessId && (
                <WIDPill wid={items[lightboxIdx].witnessId!} prefix="WID-VIS" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3"
        style={{ background: "rgba(10,8,6,0.92)", borderBottom: `1px solid ${ACCENT_BORDER}`, backdropFilter: "blur(12px)" }}
      >
        <button onClick={() => navigate("/visual-works")} className="text-xs hover:opacity-70" style={{ color: "#5A6A72" }}>
          ← Visual Works
        </button>
        <div className="flex-1" />
        {collection.collectionWid && (
          <WIDPill wid={collection.collectionWid} prefix="WID-VWC" />
        )}
      </div>

      {/* Hero */}
      <div
        className="relative"
        style={{ background: "linear-gradient(180deg, rgba(253,164,175,0.06) 0%, transparent 100%)", borderBottom: `1px solid ${ACCENT_BORDER}` }}
      >
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col md:flex-row gap-8">
          {/* Cover — aspect-ratio preserving */}
          <div
            className="w-full md:w-56 rounded-2xl overflow-hidden flex-shrink-0 relative"
            style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
          >
            {collection.coverUrl ? (
              <div className="relative w-full">
                {/* Blurred backdrop halo */}
                <img
                  src={collection.coverUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  style={{
                    objectFit: "cover",
                    filter: "blur(20px) saturate(0.5) brightness(0.3)",
                    transform: "scale(1.1)",
                  }}
                />
                {/* Primary artwork — object-contain preserves full composition */}
                <img
                  src={collection.coverUrl}
                  alt={collection.title}
                  className="relative w-full block"
                  style={{
                    objectFit: "contain",
                    maxHeight: "clamp(200px, 40vw, 400px)",
                    filter: "drop-shadow(0 2px 16px rgba(0,0,0,0.5))",
                  }}
                />
              </div>
            ) : (
              <div className="w-full flex items-center justify-center" style={{ height: 224 }}>
                <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="14" stroke={ACCENT} strokeWidth="1.2" opacity="0.6" />
                  <circle cx="24" cy="24" r="3" fill={ACCENT} opacity="0.9" />
                </svg>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0">
            {collection.mediumType && (
              <p className="text-[9px] font-heading tracking-widest uppercase mb-1" style={{ color: ACCENT }}>
                {collection.mediumType}
              </p>
            )}
            <h1
              className="text-2xl md:text-3xl font-bold mb-2"
              style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}
            >
              {collection.title}
            </h1>
            {collection.description && (
              <p className="text-sm mb-3" style={{ color: "#8B9BA3" }}>{collection.description}</p>
            )}

            {/* Tags row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {collection.style && (
                <span className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}>
                  {collection.style}
                </span>
              )}
              {collection.subject && (
                <span className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: ACCENT_BG, color: ACCENT, border: `1px solid ${ACCENT_BORDER}` }}>
                  {collection.subject}
                </span>
              )}
              {collection.haaiDisclosure && collection.haaiDisclosure !== "none" && (
                <span className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                  AI {collection.haaiDisclosure}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs" style={{ color: "#5A6A72" }}>
              <span>{items.length} image{items.length !== 1 ? "s" : ""}</span>
              {collection.license && <span>· {collection.license}</span>}
              {collection.copyright && <span>· {collection.copyright}</span>}
              <span>· {new Date(collection.createdAt).toLocaleDateString()}</span>
            </div>

            {/* WID + Share row */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {collection.collectionWid && (
                <WIDPill wid={collection.collectionWid} prefix="WID-VWC" />
              )}
              <button
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url).then(() => toast.success("Collection link copied!"));
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT }}
              >
                <Share2 size={11} />
                Share Collection
              </button>
            </div>



            {/* Origin story */}
            {collection.originStory && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.15)" }}>
                <p className="text-[9px] font-heading tracking-widest uppercase mb-1" style={{ color: "var(--ln-gold, #C49A28)" }}>Origin Story</p>
                <p className="text-xs" style={{ color: "#8B9BA3" }}>{collection.originStory}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image grid */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "#5A6A72" }}>No images in this collection yet.</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {items.map((item: typeof items[number], idx: number) => (
              <div
                key={item.id}
                className="break-inside-avoid rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02]"
                style={{ border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_BG }}
                onClick={() => setLightboxIdx(idx)}
              >
                <div className="relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title ?? `Image ${idx + 1}`}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }}
                  >
                    <div className="flex items-end justify-between">
                      <div>
                        {item.witnessId && (
                          <p className="text-[8px] font-mono" style={{ color: ACCENT }}>{item.witnessId}</p>
                        )}
                        {item.versionLabel && (
                          <p className="text-[8px]" style={{ color: "#8B9BA3" }}>{item.versionLabel}</p>
                        )}
                      </div>
                      {/* Per-item share */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = item.witnessId
                            ? `${window.location.origin}/share/${encodeURIComponent(item.witnessId)}`
                            : window.location.href;
                          navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"));
                        }}
                        className="p-1 rounded-full transition-colors hover:bg-white/20"
                        title="Share this image"
                      >
                        <Share2 size={11} style={{ color: "rgba(255,255,255,0.8)" }} />
                      </button>
                    </div>
                  </div>
                  {/* AI badge */}
                  {item.haaiDisclosure && item.haaiDisclosure !== "none" && (
                    <div
                      className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[8px]"
                      style={{ background: "rgba(0,0,0,0.6)", color: "#F87171", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      AI
                    </div>
                  )}
                </div>
                {item.title && (
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-medium line-clamp-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>{item.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
