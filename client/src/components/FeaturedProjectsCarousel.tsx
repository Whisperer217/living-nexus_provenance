/**
 * LIVING NEXUS — FeaturedProjectsCarousel
 *
 * Horizontally scrollable row of compact project cards.
 * Card size matches the 160px track cards used throughout the platform.
 * Preserves the card system standard: prov-card-img-wrap 4:5 ratio,
 * WID badge bottom-left, NEW badge top-right, funding bar additive.
 */

import { useRef } from "react";
import { Link } from "wouter";
import { Fingerprint, Cpu, DollarSign, Heart, Sparkles } from "lucide-react";

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

export default function FeaturedProjectsCarousel({ projects, isAuthenticated }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = Date.now();

  const allItems: Array<ProjectCard | { __cta: true }> = [
    ...projects,
    ...(isAuthenticated ? [{ __cta: true as const }] : []),
  ];

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto pb-1 select-none"
      style={{
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {allItems.map((item) => {
        /* ── CTA card ─────────────────────────────────────── */
        if ("__cta" in item) {
          return (
            <Link key="cta" href="/my-projects">
              <div
                className="flex-shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl cursor-pointer transition-all hover:brightness-110 active:scale-[0.97]"
                style={{
                  width: "160px",
                  height: "200px",
                  scrollSnapAlign: "start",
                  background: "transparent",
                  border: "1.5px dashed rgba(203,177,131,0.3)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(203,177,131,0.10)",
                    border: "1px solid rgba(203,177,131,0.28)",
                  }}
                >
                  <span style={{ color: "#CBB183", fontSize: "20px", lineHeight: 1 }}>+</span>
                </div>
                <p
                  className="text-[11px] font-semibold text-center px-2"
                  style={{ color: "rgba(230,205,174,0.85)", fontFamily: "'Cinzel', serif" }}
                >
                  Start a Project
                </p>
                <p className="text-[9px] text-center px-3" style={{ color: "#AA8E64" }}>
                  Launch with a Witness ID
                </p>
              </div>
            </Link>
          );
        }

        /* ── Project card ─────────────────────────────────── */
        const project = item as ProjectCard;
        const pct =
          project.goalAmountCents && project.raisedAmountCents != null
            ? Math.min(100, Math.round((project.raisedAmountCents / project.goalAmountCents) * 100))
            : null;
        const isNew = project.createdAt
          ? now - new Date(project.createdAt).getTime() < SEVEN_DAYS_MS
          : false;

        return (
          <div
            key={project.id}
            className="flex-shrink-0"
            style={{ width: "160px", scrollSnapAlign: "start" }}
          >
            <Link href={`/project/${project.slug}`}>
              <div
                className="relative rounded-2xl overflow-hidden group cursor-pointer active:scale-[0.97] transition-transform"
                style={{
                  background: "#2C3438",
                  boxShadow: "0 4px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(203,177,131,0.08)",
                }}
              >
                {/* Image — locked 4:5 ratio, max 200px tall */}
                <div className="prov-card-img-wrap" style={{ paddingBottom: "125%", maxHeight: "200px" }}>
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
                        background: "linear-gradient(135deg, #2C3438, #2C3438)",
                      }}
                    >
                      <span
                        className="text-3xl font-bold"
                        style={{ color: "rgba(203,177,131,0.16)", fontFamily: "'Cinzel', serif" }}
                      >
                        {project.title?.[0] ?? "P"}
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, #2C3438 / 0.92) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
                    }}
                  />

                  {/* NEW badge — top-right */}
                  {isNew && (
                    <div
                      className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full z-10"
                      style={{ background: "rgba(74,222,128,0.9)", backdropFilter: "blur(4px)" }}
                    >
                      <Sparkles size={7} className="text-white" />
                      <span className="text-[8px] font-mono text-white font-bold">NEW</span>
                    </div>
                  )}

                  {/* WID badge — bottom-left (card system standard) */}
                  {project.linkedWitnessId && (
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(`/verify/${project.linkedWitnessId}`, "_self");
                      }}
                      className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[7px] font-bold px-1 py-0.5 rounded z-10 font-heading tracking-wider transition-opacity opacity-90 hover:opacity-100 cursor-pointer"
                      style={{
                        background: "rgba(0,0,0,0.72)",
                        color: "#F5C451",
                        border: "1px solid rgba(245,196,81,0.55)",
                      }}
                      title="Project cryptographically witnessed"
                    >
                      <Fingerprint size={7} />
                      <span>WID</span>
                    </button>
                  )}

                  {/* Title overlay at bottom of image */}
                  <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-4">
                    <p
                      className="text-[11px] font-semibold leading-tight line-clamp-2"
                      style={{ color: "#E6CDAE", fontFamily: "'Cinzel', serif" }}
                    >
                      {project.title}
                    </p>
                  </div>
                </div>

                {/* Info panel — below image, matches TrackCard p-3 standard */}
                <div className="p-3">
                  {/* Creator row */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[8px] font-bold"
                        style={{
                          background: "#2C3438",
                          border: "1px solid rgba(203,177,131,0.32)",
                        }}
                      >
                        {project.creatorAvatarUrl ? (
                          <img src={project.creatorAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span style={{ color: "#CBB183" }}>
                            {(project.creatorName || project.creatorHandle || "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] truncate" style={{ color: "#AA8E64" }}>
                        {project.creatorName || project.creatorHandle || "Creator"}
                      </p>
                    </div>

                    {/* Right badges */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {project.hasAiContent && (
                        <div
                          className="flex items-center gap-0.5 px-1 py-0.5 rounded-md"
                          style={{
                            background: "rgba(203,177,131,0.3)",
                            border: "1px solid rgba(203,177,131,0.5)",
                          }}
                        >
                          <Cpu size={7} style={{ color: "#CBB183" }} />
                        </div>
                      )}
                      <button
                        type="button"
                        className="p-0.5 rounded-md transition-all hover:scale-110"
                        style={{ color: "rgba(239,68,68,0.7)" }}
                        onClick={(e) => e.preventDefault()}
                      >
                        <Heart size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Funding progress bar — additive row, only when data present */}
                  {pct !== null && (
                    <div className="mt-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] font-mono" style={{ color: "rgba(230,205,174,0.75)" }}>
                          {pct}% funded
                        </span>
                        <DollarSign size={7} style={{ color: "rgba(203,177,131,0.55)" }} />
                      </div>
                      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(44,52,56,0.6)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: "linear-gradient(90deg, #AA8E64, #CBB183)",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
