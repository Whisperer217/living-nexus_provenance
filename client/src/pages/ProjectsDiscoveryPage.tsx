/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — /projects Discovery Page
   Full grid of all published creator projects with search + filter
═══════════════════════════════════════════════════════════════════ */

import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Shield, Compass, Search, Rocket, Users, DollarSign, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type StatusFilter = "all" | "active" | "funded" | "completed";

function ProjectCard({ project }: { project: any }) {
  const goalCents: number = project.goalAmountCents ?? 0;
  const raisedCents: number = project.raisedAmountCents ?? 0;
  const pct = goalCents > 0 ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : null;
  const raisedDollars = (raisedCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const goalDollars = goalCents > 0 ? (goalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : null;

  return (
    <Link href={`/project/${project.slug}`}>
      <div
        className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
        style={{
          background: "#DACAAA",
          border: "1px solid oklch(0.84 0.155 85 / 0.08)",
          boxShadow: "0 4px 24px oklch(0 0 0 / 0.4)",
        }}
      >
        {/* Banner — 4:5 locked, object-cover, always-on gradient (CARD_STANDARDS) */}
        <div className="prov-card-img-wrap">
          {project.bannerUrl ? (
            <img
              src={project.bannerUrl}
              alt={project.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, oklch(0.14 0.06 280), oklch(0.10 0.04 270), oklch(0.12 0.05 300))",
              }}
            >
              <span
                className="text-7xl font-bold select-none"
                style={{ color: "oklch(0.84 0.155 85 / 0.12)", fontFamily: "'Cinzel', serif" }}
              >
                {project.title?.[0] ?? "P"}
              </span>
            </div>
          )}
          {/* Gradient overlay — always-on bottom fade */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.82) 100%)" }}
          />
          {/* WID badge — bottom-left (matches TrackCard) */}
          {project.linkedWitnessId && (
            <button
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `/verify/${project.linkedWitnessId}`; }}
              className="absolute bottom-2 left-2 flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded z-10 font-heading tracking-wider transition-opacity opacity-90 hover:opacity-100 cursor-pointer"
              style={{
                background: "rgba(0,0,0,0.72)",
                color: "#F5C451",
                border: "1px solid rgba(245,196,81,0.55)",
              }}
              title="Project cryptographically witnessed"
            >
              <Shield size={8} />
              <span>WID</span>
            </button>
          )}
          {/* Status badge — top-right */}
          <div
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-heading tracking-wider uppercase z-10"
            style={{
              background: project.status === "funded"
                ? "oklch(0.55 0.18 145 / 0.85)"
                : project.status === "completed"
                ? "oklch(0.55 0.15 250 / 0.85)"
                : "oklch(0.84 0.155 85 / 0.85)",
              backdropFilter: "blur(8px)",
              color: project.status === "active" ? "oklch(0.15 0.04 60)" : "white",
            }}
          >
            {project.status}
          </div>
        </div>

        {/* Content — p-3 matches TrackCard */}
        <div className="p-3">
          <h3
            className="font-heading text-[13px] leading-tight mb-1 truncate tracking-wide"
            style={{ color: "oklch(0.95 0.01 280)", fontFamily: "'Cinzel', serif" }}
          >
            {project.title}
          </h3>
          {project.tagline && (
            <p className="text-[11px] mb-1.5 line-clamp-2" style={{ color: "oklch(0.55 0.03 280)" }}>
              {project.tagline}
            </p>
          )}

          {/* Creator — gap-1.5 matches TrackCard */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 overflow-hidden"
              style={{ background: "oklch(0.84 0.155 85 / 0.15)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}
            >
              {project.creatorPhotoUrl ? (
                <img src={project.creatorPhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: "oklch(0.84 0.155 85)" }}>
                  {(project.creatorName || project.creatorHandle || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-[11px] truncate" style={{ color: "oklch(0.6 0.04 280)" }}>
              {project.creatorName || project.creatorHandle || "Creator"}
            </span>
          </div>

          {/* Funding progress */}
          {goalCents > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono" style={{ color: "oklch(0.84 0.155 85)" }}>
                  {raisedDollars} raised
                </span>
                <span className="text-[11px] font-mono font-bold" style={{ color: "oklch(0.84 0.155 85)" }}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 280)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, oklch(0.75 0.18 85), oklch(0.84 0.155 85))",
                  }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: "oklch(0.45 0.03 280)" }}>
                of {goalDollars} goal
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <DollarSign size={11} style={{ color: "oklch(0.84 0.155 85)" }} />
              <span className="text-[11px]" style={{ color: "oklch(0.84 0.155 85)" }}>
                {raisedDollars} raised
              </span>
              <span className="text-[10px]" style={{ color: "oklch(0.45 0.03 280)" }}>· open goal</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsDiscoveryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: projects = [], isLoading } = trpc.projects.listPublic.useQuery(
    { limit: 100 },
    { staleTime: 30_000 }
  );

  const filtered = useMemo(() => {
    return (projects as any[]).filter((p: any) => {
      const matchesSearch =
        !search ||
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.tagline?.toLowerCase().includes(search.toLowerCase()) ||
        p.creatorName?.toLowerCase().includes(search.toLowerCase()) ||
        p.creatorHandle?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "funded", label: "Funded" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen cosmic-bg">
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, oklch(0.08 0.04 270) 0%, oklch(0.06 0.03 270) 100%)",
          borderBottom: "1px solid oklch(0.84 0.155 85 / 0.08)",
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 80% at 50% 0%, oklch(0.84 0.155 85 / 0.04) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.84 0.155 85 / 0.12)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}
            >
              <Compass size={20} style={{ color: "oklch(0.84 0.155 85)" }} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-heading" style={{ color: "oklch(0.84 0.155 85 / 0.6)" }}>
                Living Nexus
              </p>
              <h1 className="font-display text-[28px] leading-none" style={{ color: "oklch(0.95 0.01 280)", fontFamily: "'Cinzel', serif" }}>
                Creator Projects
              </h1>
            </div>
          </div>
          <p className="text-[14px] max-w-lg" style={{ color: "oklch(0.55 0.03 280)" }}>
            Campaigns from independent creators. Every project is provenance-sealed with a Witness ID at launch.
            Support directly — 90% goes to the creator.
          </p>

          {/* CTA for logged-in creators */}
          {user && (
            <Link href="/my-projects">
              <Button
                className="mt-5 flex items-center gap-2 font-heading tracking-wide text-[12px]"
                style={{
                  background: "oklch(0.84 0.155 85)",
                  color: "oklch(0.12 0.04 60)",
                  border: "none",
                }}
              >
                <Rocket size={14} />
                Launch Your Project
              </Button>
            </Link>
          )}
          {!user && (
            <a href={getLoginUrl("/my-projects")}>
              <Button
                className="mt-5 flex items-center gap-2 font-heading tracking-wide text-[12px]"
                style={{
                  background: "oklch(0.84 0.155 85)",
                  color: "oklch(0.12 0.04 60)",
                  border: "none",
                }}
              >
                <Rocket size={14} />
                Launch Your Project
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "oklch(0.45 0.03 280)" }} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects or creators…"
              className="pl-9 text-[13px] h-9"
              style={{
                background: "oklch(0.12 0.03 270)",
                border: "1px solid oklch(0.84 0.155 85 / 0.12)",
                color: "oklch(0.85 0.02 280)",
              }}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter size={12} style={{ color: "oklch(0.45 0.03 280)" }} />
            <div className="flex gap-1.5">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-heading tracking-wide transition-all"
                  style={{
                    background: statusFilter === opt.value ? "oklch(0.84 0.155 85)" : "oklch(0.12 0.03 270)",
                    color: statusFilter === opt.value ? "oklch(0.12 0.04 60)" : "oklch(0.55 0.03 280)",
                    border: `1px solid ${statusFilter === opt.value ? "oklch(0.84 0.155 85)" : "oklch(0.84 0.155 85 / 0.12)"}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden animate-pulse"
                style={{ background: "#DACAAA", height: "340px" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(0.84 0.155 85 / 0.08)", border: "1px solid oklch(0.84 0.155 85 / 0.15)" }}
            >
              <Rocket size={28} style={{ color: "oklch(0.84 0.155 85 / 0.4)" }} />
            </div>
            <p className="font-heading text-[16px] mb-2" style={{ color: "oklch(0.6 0.03 280)" }}>
              {search || statusFilter !== "all" ? "No projects match your filters" : "No projects yet"}
            </p>
            <p className="text-[13px] max-w-xs" style={{ color: "oklch(0.4 0.02 280)" }}>
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Be the first to launch a project on Living Nexus."}
            </p>
            {!search && statusFilter === "all" && (
              <Link href="/my-projects">
                <Button
                  className="mt-6 font-heading tracking-wide text-[12px]"
                  style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.12 0.04 60)", border: "none" }}
                >
                  Launch Your Project
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              <Users size={13} style={{ color: "oklch(0.55 0.03 280)" }} />
              <span className="text-[12px]" style={{ color: "oklch(0.55 0.03 280)" }}>
                {filtered.length} project{filtered.length !== 1 ? "s" : ""}
                {statusFilter !== "all" ? ` · ${statusFilter}` : ""}
                {search ? ` matching "${search}"` : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((project: any) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
