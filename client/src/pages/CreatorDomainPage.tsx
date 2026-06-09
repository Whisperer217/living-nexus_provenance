/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — CreatorDomainPage (Phase 194.3)
   Creator Domain Command Center — unified hub for managing and
   previewing the creator's public domain.

   Sections:
     Overview   — quick stats + "View Public Domain" CTA
     Identity   — IdentityEditor (artist identity fields)
     Layout     — DomainEditor (block-based domain layout)
     Shelves    — link to ManifestationShelf view (public preview)
     Works      — link to upload + list of registered works
     Testimony  — testimony management
     Analytics  — myAnalytics data
     Public     — live preview of /creator/:id in an iframe-like embed

   Edit ↔ Preview toggle: switches between management panels and
   a full-width live preview of the public creator page.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  User, LayoutGrid, BookOpen, Music, FileText, BarChart2,
  Globe, ExternalLink, Eye, Edit3, ChevronRight, Loader2,
  Shield, Headphones, Heart, DollarSign, Upload, Layers,
  Sparkles, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IdentityEditor } from "@/components/IdentityEditor";
import { DomainEditor } from "@/components/domain/DomainEditor";
import { DomainRenderer } from "@/components/domain/DomainRenderer";
import { Helmet } from "react-helmet-async";

// ─── Section IDs ──────────────────────────────────────────────────
type SectionId =
  | "overview"
  | "identity"
  | "layout"
  | "shelves"
  | "works"
  | "testimony"
  | "analytics"
  | "public";

interface NavItem {
  id: SectionId;
  icon: React.ElementType;
  label: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview",   icon: Layers,       label: "Domain Overview",  description: "Stats, quick actions, public link" },
  { id: "identity",   icon: User,         label: "Identity",         description: "Artist name, bio, avatar, sigil" },
  { id: "layout",     icon: LayoutGrid,   label: "Domain Layout",    description: "Block-based domain composition" },
  { id: "shelves",    icon: Music,        label: "Shelves",          description: "Albums, collections, media racks" },
  { id: "works",      icon: Shield,       label: "Manifestations",   description: "Registered works & Witness IDs" },
  { id: "testimony",  icon: FileText,     label: "Testimony",        description: "Witnessed statements & declarations" },
  { id: "analytics",  icon: BarChart2,    label: "Analytics",        description: "Plays, likes, gifts, downloads" },
  { id: "public",     icon: Globe,        label: "Public Domain",    description: "Live visitor view of your domain" },
];

// ─── Stat Card ────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "var(--ln-gold)" }: {
  icon: React.ElementType; label: string; value: string | number; color?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 p-4 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(196,154,40,0.1)" }}
    >
      <Icon className="w-4 h-4 mb-1" style={{ color }} />
      <span className="text-2xl font-bold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function CreatorDomainPage() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [previewMode, setPreviewMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: analytics, isLoading: analyticsLoading } = trpc.profile.myAnalytics.useQuery(undefined, {
    enabled: !!user && (activeSection === "analytics" || activeSection === "overview"),
    staleTime: 60_000,
  });
  const { data: myTestimonies = [] } = trpc.testimony.mine.useQuery(undefined, {
    enabled: !!user && activeSection === "testimony",
  });
  const { data: dbSongs = [] } = trpc.songs.mySongs.useQuery(undefined, {
    enabled: !!user && (activeSection === "works" || activeSection === "overview"),
    staleTime: 30_000,
  });

  const createTestimonyMutation = trpc.testimony.create.useMutation({
    onSuccess: () => {
      utils.testimony.mine.invalidate();
      toast.success("Testimony witnessed — WID-TST generated!");
    },
    onError: (e) => toast.error(e.message),
  });
  const utils = trpc.useUtils();

  const [testimonyContent, setTestimonyContent] = useState("");
  const [showAddTestimony, setShowAddTestimony] = useState(false);

  // Auth guard
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>Sign in to access your Creator Domain</p>
        <a href={getLoginUrl()} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
          Sign In
        </a>
      </div>
    );
  }

  const publicDomainUrl = `/creator/${user.id}`;
  const artistName = profile?.artistHandle || profile?.name || user.name || "Creator";
  const totalPlays = analytics?.totalPlays ?? 0;
  const totalLikes = analytics?.totalLikes ?? 0;
  const totalGifts = analytics?.totalGiftsReceived ?? 0;
  const totalDownloads = analytics?.totalDownloads ?? 0;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}${publicDomainUrl}`);
    toast.success("Public domain link copied!");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-void)" }}>
      <Helmet>
        <title>Creator Domain — {artistName} | Living Nexus</title>
      </Helmet>

      {/* ── Top Bar ── */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 gap-3"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(196,154,40,0.12)" }}
      >
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/profile")}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/[0.06]"
            style={{ border: "1px solid rgba(196,154,40,0.15)", color: "var(--ln-smoke)" }}
            title="Back to Profile"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase truncate" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
              Creator Domain
            </p>
            <p className="text-[11px] truncate" style={{ color: "var(--ln-smoke)" }}>{artistName}</p>
          </div>
        </div>

        {/* Center: Edit ↔ Preview toggle */}
        <div
          className="flex items-center rounded-lg p-0.5 gap-0.5 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,154,40,0.12)" }}
        >
          <button
            onClick={() => setPreviewMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!previewMode ? "text-black" : ""}`}
            style={!previewMode
              ? { background: "var(--ln-gold)", color: "#000" }
              : { color: "var(--ln-smoke)" }}
          >
            <Edit3 className="w-3 h-3" />
            <span className="hidden sm:inline">Manage</span>
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all`}
            style={previewMode
              ? { background: "var(--ln-gold)", color: "#000" }
              : { color: "var(--ln-smoke)" }}
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>

        {/* Right: View Public Domain */}
        <a
          href={publicDomainUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 transition-all hover:opacity-90"
          style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
          title="Open your public domain in a new tab"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">View Public Domain</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      {/* ── Preview Mode: full-width live domain view ── */}
      {previewMode ? (
        <div className="px-4 py-6">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(196,154,40,0.15)", background: "var(--ln-void)" }}
          >
            {/* Preview header */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ background: "rgba(196,154,40,0.06)", borderBottom: "1px solid rgba(196,154,40,0.1)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(196,154,40,0.4)" }} />
                <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>
                  Visitor view — {window.location.origin}{publicDomainUrl}
                </span>
              </div>
              <a
                href={publicDomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs transition-colors hover:opacity-80"
                style={{ color: "var(--ln-gold)" }}
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {/* Embedded DomainRenderer as visitor view */}
            <div className="p-4">
              <DomainRenderer userId={user.id} isOwner={false} />
            </div>
          </div>

          {/* Switch back to manage */}
          <div className="text-center mt-6">
            <button
              onClick={() => setPreviewMode(false)}
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "var(--ln-smoke)" }}
            >
              ← Back to management view
            </button>
          </div>
        </div>
      ) : (
        /* ── Management Mode: sidebar + content ── */
        <div className="flex min-h-[calc(100vh-57px)]">

          {/* ── Sidebar ── */}
          <aside
            className="hidden md:flex flex-col w-56 flex-shrink-0 py-4 gap-0.5"
            style={{ borderRight: "1px solid rgba(196,154,40,0.08)", background: "rgba(0,0,0,0.3)" }}
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-left transition-all"
                  style={isActive
                    ? { background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }
                    : { border: "1px solid transparent", color: "var(--ln-smoke)" }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                </button>
              );
            })}

            {/* Persistent public domain link at bottom of sidebar */}
            <div className="mt-auto mx-2 pt-4" style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}>
              <a
                href={publicDomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
              >
                <Globe className="w-3.5 h-3.5" />
                View Public Domain
                <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
              </a>
            </div>
          </aside>

          {/* ── Mobile section picker ── */}
          <div className="md:hidden w-full px-4 pt-3 pb-1">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all"
                    style={isActive
                      ? { background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }
                      : { border: "1px solid rgba(196,154,40,0.08)", color: "var(--ln-smoke)" }}
                  >
                    <Icon className="w-3 h-3" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Content Panel ── */}
          <main className="flex-1 min-w-0 px-4 md:px-8 py-6 overflow-y-auto">

            {/* ── Overview ── */}
            {activeSection === "overview" && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                      {artistName}
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
                      Your Creator Domain — the primary object of your presence
                    </p>
                  </div>
                  <a
                    href={publicDomainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: "var(--ln-gold)", color: "#000" }}
                  >
                    <Globe className="w-4 h-4" />
                    View Public Domain
                  </a>
                </div>

                {/* Stats grid */}
                {analyticsLoading ? (
                  <div className="flex items-center gap-2 py-4" style={{ color: "var(--ln-smoke)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <StatCard icon={Music}      label="Registered Works"  value={dbSongs.length} />
                    <StatCard icon={Headphones} label="Total Plays"       value={totalPlays >= 1000 ? `${(totalPlays/1000).toFixed(1)}k` : totalPlays} />
                    <StatCard icon={Heart}      label="Total Likes"       value={totalLikes} />
                    <StatCard icon={DollarSign} label="Gifts Received"    value={totalGifts} color="var(--ln-seal-bright)" />
                  </div>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: User,        label: "Edit Identity",      desc: "Name, bio, avatar, sigil",         section: "identity" as SectionId },
                    { icon: LayoutGrid,  label: "Edit Domain Layout",  desc: "Block-based domain composition",   section: "layout" as SectionId },
                    { icon: Music,       label: "Manage Shelves",      desc: "Albums, collections, media racks", section: "shelves" as SectionId },
                    { icon: Shield,      label: "Manifestations",      desc: "Registered works & Witness IDs",   section: "works" as SectionId },
                    { icon: FileText,    label: "Testimony",           desc: "Witnessed statements",             section: "testimony" as SectionId },
                    { icon: BarChart2,   label: "Analytics",           desc: "Plays, likes, gifts",              section: "analytics" as SectionId },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.section}
                        onClick={() => setActiveSection(item.section)}
                        className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:bg-white/[0.03] group"
                        style={{ border: "1px solid rgba(196,154,40,0.1)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.15)" }}
                        >
                          <Icon className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{item.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>{item.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                      </button>
                    );
                  })}
                </div>

                {/* Copy public link */}
                <div
                  className="mt-6 flex items-center gap-3 p-4 rounded-xl"
                  style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.12)" }}
                >
                  <Globe className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
                  <span className="text-xs flex-1 truncate font-mono" style={{ color: "var(--ln-smoke)" }}>
                    {window.location.origin}{publicDomainUrl}
                  </span>
                  <button
                    onClick={copyPublicLink}
                    className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all hover:opacity-80"
                    style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
                  >
                    Copy Link
                  </button>
                  <a
                    href={publicDomainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all hover:opacity-80 flex items-center gap-1"
                    style={{ background: "var(--ln-gold)", color: "#000" }}
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </section>
            )}

            {/* ── Identity ── */}
            {activeSection === "identity" && (
              <section>
                <SectionHeader
                  icon={User}
                  title="Identity"
                  description="Your artist identity — name, bio, avatar, sigil, origin statement, and distribution links."
                  publicDomainUrl={publicDomainUrl}
                />
                {profile ? (
                  <IdentityEditor profile={profile} />
                ) : (
                  <div className="flex items-center gap-2 py-4" style={{ color: "var(--ln-smoke)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                )}
              </section>
            )}

            {/* ── Domain Layout ── */}
            {activeSection === "layout" && (
              <section>
                <SectionHeader
                  icon={LayoutGrid}
                  title="Domain Layout"
                  description="Compose your domain using blocks — shelves, featured works, text, and more."
                  publicDomainUrl={publicDomainUrl}
                />
                <DomainEditor userId={user.id} onClose={() => setActiveSection("overview")} />
              </section>
            )}

            {/* ── Shelves ── */}
            {activeSection === "shelves" && (
              <section>
                <SectionHeader
                  icon={Music}
                  title="Shelves"
                  description="Your manifestation shelves — albums, singles, collections. Visitors browse these as horizontal racks."
                  publicDomainUrl={publicDomainUrl}
                />
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ border: "1px solid rgba(196,154,40,0.12)", background: "rgba(255,255,255,0.02)" }}
                >
                  <Music className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-gold)" }} />
                  <p className="text-sm mb-2" style={{ color: "var(--ln-parchment)" }}>
                    Shelves are built from your registered works.
                  </p>
                  <p className="text-xs mb-4" style={{ color: "var(--ln-smoke)" }}>
                    Group works into albums when uploading, or use the Domain Layout editor to add Shelf blocks.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Link href="/upload">
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: "var(--ln-gold)", color: "#000" }}
                      >
                        <Upload className="w-4 h-4" /> Register a Work
                      </button>
                    </Link>
                    <button
                      onClick={() => setActiveSection("layout")}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
                      style={{ border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
                    >
                      <LayoutGrid className="w-4 h-4" /> Edit Domain Layout
                    </button>
                    <button
                      onClick={() => setPreviewMode(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
                      style={{ border: "1px solid rgba(196,154,40,0.1)", color: "var(--ln-smoke)" }}
                    >
                      <Eye className="w-4 h-4" /> Preview Shelves
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ── Works / Manifestations ── */}
            {activeSection === "works" && (
              <section>
                <SectionHeader
                  icon={Shield}
                  title="Manifestations"
                  description="All registered works with Witness IDs. Each manifestation is a provenance-sealed object in your domain."
                  publicDomainUrl={publicDomainUrl}
                  action={
                    <Link href="/upload">
                      <button
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: "var(--ln-gold)", color: "#000" }}
                      >
                        <Upload className="w-3.5 h-3.5" /> Register Work
                      </button>
                    </Link>
                  }
                />
                {dbSongs.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-10" style={{ color: "var(--ln-gold)" }} />
                    <p className="text-sm mb-4" style={{ color: "var(--ln-smoke)" }}>No registered works yet.</p>
                    <Link href="/upload">
                      <button
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: "var(--ln-gold)", color: "#000" }}
                      >
                        Register Your First Work
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(dbSongs as any[]).map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/[0.02]"
                        style={{ border: "1px solid rgba(196,154,40,0.08)" }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: "rgba(255,255,255,0.04)" }}
                        >
                          {song.coverArtUrl && (
                            <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
                            {song.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {song.albumName && (
                              <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>{song.albumName}</span>
                            )}
                            {song.witnessId && (
                              <Badge className="text-[9px] px-1 py-0" style={{ background: "rgba(196,154,40,0.1)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}>
                                <Shield className="w-2 h-2 mr-0.5" /> WID
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--ln-smoke)" }}>
                          <Headphones className="w-3 h-3" /> {song.playCount || 0}
                        </div>
                        <Link href={`/song/${song.id}`}>
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.06]"
                            style={{ border: "1px solid rgba(196,154,40,0.1)", color: "var(--ln-smoke)" }}
                            title="View song page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Testimony ── */}
            {activeSection === "testimony" && (
              <section>
                <SectionHeader
                  icon={FileText}
                  title="Testimony"
                  description="Witnessed statements, declarations, and creative doctrine. Each testimony receives a WID-TST."
                  publicDomainUrl={publicDomainUrl}
                  action={
                    <button
                      onClick={() => setShowAddTestimony(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Add Testimony
                    </button>
                  }
                />

                {/* Add testimony form */}
                {showAddTestimony && (
                  <div
                    className="mb-4 p-4 rounded-xl"
                    style={{ border: "1px solid rgba(196,154,40,0.2)", background: "rgba(196,154,40,0.04)" }}
                  >
                    <p className="text-xs font-semibold mb-2" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>
                      New Testimony
                    </p>
                    <textarea
                      value={testimonyContent}
                      onChange={(e) => setTestimonyContent(e.target.value)}
                      placeholder="Write your testimony…"
                      rows={4}
                      className="w-full bg-transparent resize-none text-sm outline-none rounded-lg p-3"
                      style={{ border: "1px solid rgba(196,154,40,0.15)", color: "var(--ln-parchment)" }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          if (!testimonyContent.trim()) return;
                          createTestimonyMutation.mutate({ content: testimonyContent });
                          setTestimonyContent("");
                          setShowAddTestimony(false);
                        }}
                        disabled={createTestimonyMutation.isPending || !testimonyContent.trim()}
                        className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: "var(--ln-gold)", color: "#000" }}
                      >
                        {createTestimonyMutation.isPending ? "Witnessing…" : "Witness Testimony"}
                      </button>
                      <button
                        onClick={() => setShowAddTestimony(false)}
                        className="px-4 py-2 rounded-lg text-xs transition-all hover:opacity-80"
                        style={{ border: "1px solid rgba(196,154,40,0.1)", color: "var(--ln-smoke)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Testimony list */}
                {(myTestimonies as any[]).length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-10" style={{ color: "var(--ln-gold)" }} />
                    <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No testimonies yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(myTestimonies as any[]).map((t: any) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl"
                        style={{ border: "1px solid rgba(196,154,40,0.1)", background: "rgba(255,255,255,0.02)" }}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: "var(--ln-parchment)" }}>{t.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {t.witnessId && (
                            <Link href={`/verify/${t.witnessId}`}>
                              <Badge className="text-[9px] px-1.5 py-0.5 cursor-pointer hover:opacity-80" style={{ background: "rgba(196,154,40,0.1)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}>
                                <Shield className="w-2 h-2 mr-0.5" /> WID-TST
                              </Badge>
                            </Link>
                          )}
                          <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── Analytics ── */}
            {activeSection === "analytics" && (
              <section>
                <SectionHeader
                  icon={BarChart2}
                  title="Analytics"
                  description="Plays, likes, gifts, and downloads across all your registered works."
                  publicDomainUrl={publicDomainUrl}
                />
                {analyticsLoading ? (
                  <div className="flex items-center gap-2 py-4" style={{ color: "var(--ln-smoke)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
                  </div>
                ) : !analytics ? (
                  <div className="text-center py-12">
                    <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-10" style={{ color: "var(--ln-gold)" }} />
                    <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No analytics data yet.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <StatCard icon={Headphones} label="Total Plays"      value={analytics.totalPlays} />
                      <StatCard icon={Heart}      label="Total Likes"      value={analytics.totalLikes} />
                      <StatCard icon={DollarSign} label="Gifts Received"   value={analytics.totalGiftsReceived} color="var(--ln-seal-bright)" />
                      <StatCard icon={Music}      label="Downloads"        value={analytics.totalDownloads} />
                    </div>

                    {/* This week */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                      <StatCard icon={Headphones} label="Plays This Week"  value={analytics.playsThisWeek} />
                      <StatCard icon={Heart}      label="Likes This Week"  value={analytics.likesThisWeek} />
                      <StatCard icon={DollarSign} label="Gifts This Month" value={analytics.giftsThisMonth} color="var(--ln-seal-bright)" />
                    </div>

                    {/* Top tracks by plays */}
                    {analytics.playsByTrack && analytics.playsByTrack.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--ln-smoke)", fontFamily: "'Cinzel', serif" }}>
                          Top Works by Plays
                        </h3>
                        <div className="space-y-2">
                          {[...analytics.playsByTrack]
                            .sort((a, b) => b.plays - a.plays)
                            .slice(0, 10)
                            .map((track) => (
                              <div
                                key={track.trackId}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                                style={{ border: "1px solid rgba(196,154,40,0.08)" }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate" style={{ color: "var(--ln-parchment)" }}>{track.title}</p>
                                </div>
                                <div className="flex items-center gap-1 text-xs" style={{ color: "var(--ln-smoke)" }}>
                                  <Headphones className="w-3 h-3" /> {track.plays}
                                </div>
                                {track.trend === "up" && <span className="text-[10px] font-bold" style={{ color: "var(--ln-seal-bright)" }}>↑</span>}
                                {track.trend === "down" && <span className="text-[10px] font-bold" style={{ color: "var(--ln-ember)" }}>↓</span>}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* ── Public Domain ── */}
            {activeSection === "public" && (
              <section>
                <SectionHeader
                  icon={Globe}
                  title="Public Domain"
                  description="This is how visitors see your Creator Domain. Switch to Preview mode for a full-width view."
                  publicDomainUrl={publicDomainUrl}
                />
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <button
                    onClick={() => setPreviewMode(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: "var(--ln-gold)", color: "#000" }}
                  >
                    <Eye className="w-4 h-4" /> Enter Preview Mode
                  </button>
                  <a
                    href={publicDomainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{ border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}
                  >
                    <ExternalLink className="w-4 h-4" /> Open in New Tab
                  </a>
                  <button
                    onClick={copyPublicLink}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all hover:opacity-80"
                    style={{ border: "1px solid rgba(196,154,40,0.1)", color: "var(--ln-smoke)" }}
                  >
                    Copy Link
                  </button>
                </div>
                {/* Compact domain preview */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(196,154,40,0.12)" }}
                >
                  <div
                    className="px-4 py-2 flex items-center gap-2"
                    style={{ background: "rgba(196,154,40,0.06)", borderBottom: "1px solid rgba(196,154,40,0.08)" }}
                  >
                    <div className="flex gap-1">
                      {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full" style={{ background: "rgba(196,154,40,0.25)" }} />)}
                    </div>
                    <span className="text-xs font-mono" style={{ color: "var(--ln-smoke)" }}>
                      {window.location.origin}{publicDomainUrl}
                    </span>
                  </div>
                  <div className="p-4">
                    <DomainRenderer userId={user.id} isOwner={false} />
                  </div>
                </div>
              </section>
            )}

          </main>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────
function SectionHeader({
  icon: Icon, title, description, publicDomainUrl, action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  publicDomainUrl: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.15)" }}
        >
          <Icon className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            {title}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {action}
        <a
          href={publicDomainUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-gold)" }}
          title="View public domain"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">View Public</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </div>
  );
}
