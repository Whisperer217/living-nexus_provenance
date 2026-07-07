/**
 * VisualWorksPage.tsx
 *
 * Public browse page for Visual Works collections on Living Nexus.
 * Displays a masonry-style grid of published collections with provenance badges.
 *
 * Design language: sovereign cathedral — deep space, rose/pink accent (#FDA4AF),
 * sacred geometry, gold provenance marks, parchment text.
 */
import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

// ── Helpers ────────────────────────────────────────────────────────────────────

function WIDPill({ wid }: { wid: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(wid).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      title="Copy Witness ID"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider transition-all hover:opacity-80"
      style={{
        background: "rgba(253,164,175,0.10)",
        border: "1px solid rgba(253,164,175,0.30)",
        color: "#FDA4AF",
      }}
    >
      {copied ? "✓ Copied" : wid}
    </button>
  );
}

function CollectionCard({ collection, onClick }: {
  collection: {
    id: number;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    mediumType?: string | null;
    collectionWid?: string | null;
    status: string;
    createdAt: Date;
  };
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: "rgba(10,8,6,0.85)",
        border: "1px solid rgba(253,164,175,0.18)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Cover image */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "rgba(253,164,175,0.04)" }}>
        {collection.coverUrl ? (
          <img
            src={collection.coverUrl}
            alt={collection.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="21" stroke="#FDA4AF" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.4" />
              <path d="M24 10 L28 20 L24 24 Z" fill="#FDA4AF" opacity="0.18" />
              <path d="M38 14 L28 20 L24 24 Z" fill="#FDA4AF" opacity="0.18" />
              <path d="M38 34 L28 28 L24 24 Z" fill="#FDA4AF" opacity="0.18" />
              <path d="M24 38 L20 28 L24 24 Z" fill="#FDA4AF" opacity="0.18" />
              <path d="M10 34 L20 28 L24 24 Z" fill="#FDA4AF" opacity="0.18" />
              <path d="M10 14 L20 20 L24 24 Z" fill="#FDA4AF" opacity="0.18" />
              <circle cx="24" cy="24" r="14" stroke="#FDA4AF" strokeWidth="1.2" opacity="0.7" />
              <circle cx="24" cy="24" r="8" stroke="#FDA4AF" strokeWidth="0.8" opacity="0.5" />
              <circle cx="24" cy="24" r="3" fill="#FDA4AF" opacity="0.9" />
            </svg>
          </div>
        )}
        {/* Medium type badge */}
        {collection.mediumType && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-heading tracking-widest uppercase"
            style={{ background: "rgba(0,0,0,0.6)", color: "#FDA4AF", border: "1px solid rgba(253,164,175,0.3)" }}
          >
            {collection.mediumType}
          </div>
        )}
        {/* Provenance seal */}
        {collection.collectionWid && (
          <div
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
            title="Provenance Sealed"
            style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.5)" }}
          >
            <span style={{ fontSize: 10, color: "var(--ln-gold, #C49A28)" }}>✦</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <h3
          className="font-bold text-sm mb-1 line-clamp-2"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}
        >
          {collection.title}
        </h3>
        {collection.description && (
          <p className="text-xs line-clamp-2 mb-2" style={{ color: "#8B9BA3" }}>
            {collection.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          {collection.collectionWid ? (
            <WIDPill wid={collection.collectionWid} />
          ) : (
            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#5A6A72" }}>
              Draft
            </span>
          )}
          <span className="text-[9px]" style={{ color: "#5A6A72" }}>
            {new Date(collection.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function VisualWorksPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: publicCollections, isLoading } = trpc.visualWorks.getPublicCollections.useQuery({ limit: 60 });
  const { data: myCollections } = trpc.visualWorks.getMyCollections.useQuery(undefined, { enabled: !!user });

  const [activeTab, setActiveTab] = useState<"browse" | "mine">("browse");

  const displayCollections = activeTab === "mine" ? (myCollections ?? []) : (publicCollections ?? []);

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void, #0A0806)" }}>
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(253,164,175,0.08) 0%, transparent 100%)",
          borderBottom: "1px solid rgba(253,164,175,0.12)",
        }}
      >
        {/* Decorative ring */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(253,164,175,0.06) 0%, transparent 70%)" }}
        />
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-start justify-between gap-6">
            <div>
              {/* Breadcrumb */}
              <button
                onClick={() => navigate("/")}
                className="text-xs mb-4 flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ color: "#5A6A72" }}
              >
                ← Living Nexus
              </button>
              {/* Glyph + Title */}
              <div className="flex items-center gap-4 mb-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(253,164,175,0.10)", border: "1px solid rgba(253,164,175,0.30)" }}
                >
                  <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="21" stroke="#FDA4AF" strokeWidth="0.6" strokeDasharray="2 4" opacity="0.4" />
                    <path d="M24 10 L28 20 L24 24 Z" fill="#FDA4AF" opacity="0.22" />
                    <path d="M38 14 L28 20 L24 24 Z" fill="#FDA4AF" opacity="0.22" />
                    <path d="M38 34 L28 28 L24 24 Z" fill="#FDA4AF" opacity="0.22" />
                    <path d="M24 38 L20 28 L24 24 Z" fill="#FDA4AF" opacity="0.22" />
                    <path d="M10 34 L20 28 L24 24 Z" fill="#FDA4AF" opacity="0.22" />
                    <path d="M10 14 L20 20 L24 24 Z" fill="#FDA4AF" opacity="0.22" />
                    <circle cx="24" cy="24" r="14" stroke="#FDA4AF" strokeWidth="1.4" opacity="0.8" />
                    <circle cx="24" cy="24" r="8" stroke="#FDA4AF" strokeWidth="0.8" opacity="0.5" />
                    <circle cx="24" cy="24" r="3" fill="#FDA4AF" opacity="0.95" />
                    <circle cx="21" cy="21" r="1.2" fill="#FDA4AF" opacity="0.6" />
                  </svg>
                </div>
                <div>
                  <h1
                    className="text-2xl md:text-3xl font-bold"
                    style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment, #E8DFC8)" }}
                  >
                    Visual Works
                  </h1>
                  <p className="text-xs mt-0.5" style={{ color: "#FDA4AF", letterSpacing: "0.12em" }}>
                    THE 6TH MEDIUM · WITNESSED IMAGERY
                  </p>
                </div>
              </div>
              <p className="text-sm max-w-xl" style={{ color: "#8B9BA3" }}>
                Photography, painting, illustration, digital art — every image registered with a cryptographic Witness ID.
                Sovereignty through provenance.
              </p>
            </div>

            {/* Register CTA */}
            {user && (
              <button
                onClick={() => navigate("/visual-works/new")}
                className="flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hidden md:flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #FDA4AF 0%, #F43F5E 100%)", color: "#fff" }}
              >
                <span>+</span> Register Collection
              </button>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-6">
            <div>
              <span className="text-lg font-bold" style={{ color: "#FDA4AF" }}>
                {publicCollections?.length ?? "—"}
              </span>
              <span className="text-xs ml-1.5" style={{ color: "#5A6A72" }}>collections</span>
            </div>
            <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div>
              <span className="text-xs" style={{ color: "#5A6A72" }}>
                WID-VWC · WID-VIS provenance anchors
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6">
          {[
            { id: "browse" as const, label: "Browse" },
            ...(user ? [{ id: "mine" as const, label: "My Collections" }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.id ? "rgba(253,164,175,0.15)" : "transparent",
                color: activeTab === tab.id ? "#FDA4AF" : "#5A6A72",
                border: activeTab === tab.id ? "1px solid rgba(253,164,175,0.35)" : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {user && (
            <button
              onClick={() => navigate("/visual-works/new")}
              className="px-4 py-1.5 rounded-full text-xs font-medium transition-all md:hidden"
              style={{ background: "rgba(253,164,175,0.12)", color: "#FDA4AF", border: "1px solid rgba(253,164,175,0.30)" }}
            >
              + Register
            </button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden animate-pulse"
                style={{ background: "rgba(253,164,175,0.04)", border: "1px solid rgba(253,164,175,0.08)" }}
              >
                <div className="aspect-[4/3]" style={{ background: "rgba(253,164,175,0.06)" }} />
                <div className="p-4 space-y-2">
                  <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.06)", width: "70%" }} />
                  <div className="h-2 rounded" style={{ background: "rgba(255,255,255,0.04)", width: "50%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayCollections.length === 0 ? (
          <div className="text-center py-24">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(253,164,175,0.06)", border: "1px solid rgba(253,164,175,0.18)" }}
            >
              <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="14" stroke="#FDA4AF" strokeWidth="1.2" opacity="0.5" />
                <circle cx="24" cy="24" r="3" fill="#FDA4AF" opacity="0.7" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>
              {activeTab === "mine" ? "No collections yet" : "No published collections yet"}
            </p>
            <p className="text-xs mb-4" style={{ color: "#5A6A72" }}>
              {activeTab === "mine"
                ? "Register your first visual work to begin your provenance archive."
                : "Be the first to register visual works on Living Nexus."}
            </p>
            {user && (
              <button
                onClick={() => navigate("/visual-works/new")}
                className="px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #FDA4AF 0%, #F43F5E 100%)", color: "#fff" }}
              >
                Register a Collection
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayCollections.map((col: typeof displayCollections[number]) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onClick={() => navigate(`/visual-works/${col.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
