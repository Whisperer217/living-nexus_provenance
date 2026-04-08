/**
 * LIVING NEXUS — FeaturedProjectsCarousel
 *
 * Horizontally swipeable paged carousel of Featured Project cards.
 * Each page shows a 2×2 grid (4 cards). Swipe left/right or use the
 * dot indicators to navigate between pages.
 *
 * Features:
 * - 5-second auto-advance timer (pauses on touch/hover)
 * - Project title + funding % overlaid on the banner image
 * - "New" badge on projects created within the last 7 days
 * - "Start a Project" CTA card for authenticated users
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { Fingerprint, CheckCircle2, Cpu, DollarSign, Heart, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface ProjectCard {
  id: number;
  slug: string;
  title: string;
  bannerUrl?: string | null;
  linkedWitnessId?: string | null;
  isVerified?: boolean;
  hasAiContent?: boolean;
  goalAmountCents?: number | null;
  raisedAmountCents?: number | null;
  creatorHandle?: string | null;
  creatorId?: number | null;
  creatorName?: string | null;
  creatorAvatarUrl?: string | null;
  createdAt?: string | number | null;
}

interface Props {
  projects: ProjectCard[];
  isAuthenticated?: boolean;
}

const PAGE_SIZE = 4; // 2×2

export default function FeaturedProjectsCarousel({ projects, isAuthenticated }: Props) {
  const allItems: Array<ProjectCard | { __cta: true }> = [
    ...projects,
    ...(isAuthenticated ? [{ __cta: true as const }] : []),
  ];

  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const isPaused = useRef(false);

  const goTo = useCallback(
    (p: number) => setPage(Math.max(0, Math.min(totalPages - 1, p))),
    [totalPages]
  );

  // ── Auto-advance timer ──────────────────────────────────────────
  useEffect(() => {
    if (totalPages <= 1) return;
    const id = setInterval(() => {
      if (!isPaused.current) {
        setPage(p => (p + 1) % totalPages);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [totalPages]);

  // ── Touch / swipe tracking ──────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isPaused.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      isDragging.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (isDragging.current && Math.abs(dx) > 40) {
      goTo(dx < 0 ? page + 1 : page - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
    isDragging.current = false;
    // Resume auto-advance after 8 seconds of inactivity
    setTimeout(() => { isPaused.current = false; }, 8000);
  };

  const pageItems = allItems.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const now = Date.now();

  return (
    <div
      className="select-none"
      onMouseEnter={() => { isPaused.current = true; }}
      onMouseLeave={() => { isPaused.current = false; }}
    >
      {/* Carousel viewport */}
      <div
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          {pageItems.map((item, idx) => {
            if ("__cta" in item) {
              return (
                <Link key="cta" href="/my-projects">
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer transition-all hover:brightness-110 active:scale-[0.97]"
                    style={{
                      background: "transparent",
                      border: "1.5px dashed oklch(0.84 0.155 85 / 0.30)",
                      minHeight: "220px",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: "oklch(0.84 0.155 85 / 0.10)",
                        border: "1px solid oklch(0.84 0.155 85 / 0.28)",
                      }}
                    >
                      <span style={{ color: "oklch(0.84 0.155 85)", fontSize: "22px", lineHeight: 1 }}>+</span>
                    </div>
                    <p
                      className="text-[12px] font-semibold text-center px-2"
                      style={{ color: "oklch(0.84 0.155 85 / 0.85)", fontFamily: "'Cinzel', serif" }}
                    >
                      Start a Project
                    </p>
                    <p className="text-[10px] text-center px-3" style={{ color: "oklch(0.50 0.03 280)" }}>
                      Launch your campaign with a Witness ID
                    </p>
                  </div>
                </Link>
              );
            }

            const project = item as ProjectCard;
            const pct =
              project.goalAmountCents && project.raisedAmountCents != null
                ? Math.min(100, Math.round((project.raisedAmountCents / project.goalAmountCents) * 100))
                : null;

            // "New" badge: created within the last 7 days
            const isNew = project.createdAt
              ? now - new Date(project.createdAt).getTime() < SEVEN_DAYS_MS
              : false;

            return (
              <Link key={project.id} href={`/project/${project.slug}`}>
                <div
                  className="relative rounded-2xl overflow-hidden group cursor-pointer active:scale-[0.97] transition-transform"
                  style={{
                    background: "oklch(0.11 0.025 270)",
                    boxShadow: "0 4px 28px oklch(0 0 0 / 0.55), 0 0 0 1px oklch(0.84 0.155 85 / 0.08)",
                  }}
                >
                  {/* Banner with overlaid content */}
                  <div className="relative w-full overflow-hidden" style={{ height: "180px" }}>
                    {project.bannerUrl ? (
                      <img
                        src={project.bannerUrl}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, oklch(0.14 0.04 280), oklch(0.10 0.02 270))",
                        }}
                      >
                        <span
                          className="text-5xl font-bold"
                          style={{ color: "oklch(0.84 0.155 85 / 0.18)", fontFamily: "'Cinzel', serif" }}
                        >
                          {project.title?.[0] ?? "P"}
                        </span>
                      </div>
                    )}

                    {/* Gradient overlay — stronger at bottom for text legibility */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, oklch(0.08 0.02 275 / 0.97) 0%, oklch(0 0 0 / 0.35) 55%, transparent 100%)",
                      }}
                    />

                    {/* Top-right badges */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {isNew && (
                        <div
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "oklch(0.55 0.22 145 / 0.90)",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          <Sparkles size={8} className="text-white" />
                          <span className="text-[9px] font-mono text-white font-bold">NEW</span>
                        </div>
                      )}
                      {project.linkedWitnessId && (
                        <div
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "oklch(0.22 0.08 145 / 0.92)",
                            border: "1px solid oklch(0.55 0.18 145 / 0.5)",
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          <Fingerprint size={8} style={{ color: "oklch(0.82 0.18 145)" }} />
                          <span className="text-[9px] font-mono font-bold" style={{ color: "oklch(0.82 0.18 145)" }}>WID</span>
                        </div>
                      )}
                    </div>

                    {/* Top-left verified */}
                    {project.isVerified && (
                      <div className="absolute top-2 left-2">
                        <CheckCircle2 size={15} style={{ color: "oklch(0.84 0.155 85)" }} />
                      </div>
                    )}

                    {/* Bottom overlay: title + creator + funding */}
                    <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6">
                      {/* Title */}
                      <p
                        className="text-[12px] font-semibold leading-tight truncate"
                        style={{ color: "oklch(0.97 0.01 280)", fontFamily: "'Cinzel', serif" }}
                      >
                        {project.title}
                      </p>

                      {/* Creator + badges row */}
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Mini avatar */}
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[9px] font-bold"
                            style={{
                              background: "oklch(0.22 0.05 280)",
                              border: "1px solid oklch(0.84 0.155 85 / 0.35)",
                            }}
                          >
                            {project.creatorAvatarUrl ? (
                              <img src={project.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span style={{ color: "oklch(0.84 0.155 85)" }}>
                                {(project.creatorName || project.creatorHandle || "?")[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] truncate" style={{ color: "oklch(0.70 0.04 280)" }}>
                            {project.creatorName || project.creatorHandle || "Creator"}
                          </p>
                        </div>

                        {/* Right badges */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {project.hasAiContent && (
                            <div
                              className="flex items-center gap-0.5 px-1 py-0.5 rounded-md"
                              style={{
                                background: "oklch(0.55 0.18 280 / 0.30)",
                                border: "1px solid oklch(0.55 0.18 280 / 0.5)",
                              }}
                            >
                              <Cpu size={8} style={{ color: "oklch(0.72 0.18 280)" }} />
                            </div>
                          )}
                          <button
                            className="p-0.5 rounded-md transition-all hover:scale-110"
                            style={{ color: "oklch(0.65 0.18 0 / 0.7)" }}
                            onClick={e => e.preventDefault()}
                          >
                            <Heart size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Funding progress bar */}
                      {pct !== null && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-mono" style={{ color: "oklch(0.84 0.155 85 / 0.75)" }}>
                              {pct}% funded
                            </span>
                            <DollarSign size={8} style={{ color: "oklch(0.84 0.155 85 / 0.6)" }} />
                          </div>
                          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "oklch(0.25 0.02 280 / 0.6)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: "linear-gradient(90deg, oklch(0.62 0.18 55), oklch(0.84 0.155 85))",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Navigation: prev/next arrows + dot indicators */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-1 mb-2">
          <button
            onClick={() => { goTo(page - 1); isPaused.current = true; setTimeout(() => { isPaused.current = false; }, 8000); }}
            disabled={page === 0}
            className="p-1 rounded-full transition-all disabled:opacity-20 hover:opacity-70 active:scale-90"
            style={{ color: "oklch(0.84 0.155 85 / 0.6)" }}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i); isPaused.current = true; setTimeout(() => { isPaused.current = false; }, 8000); }}
                className="transition-all rounded-full"
                style={{
                  width: i === page ? "18px" : "6px",
                  height: "6px",
                  background:
                    i === page
                      ? "oklch(0.84 0.155 85)"
                      : "oklch(0.84 0.155 85 / 0.25)",
                }}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => { goTo(page + 1); isPaused.current = true; setTimeout(() => { isPaused.current = false; }, 8000); }}
            disabled={page === totalPages - 1}
            className="p-1 rounded-full transition-all disabled:opacity-20 hover:opacity-70 active:scale-90"
            style={{ color: "oklch(0.84 0.155 85 / 0.6)" }}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
