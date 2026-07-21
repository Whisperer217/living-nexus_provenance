/**
 * @domain  The Creator → Domain → Persistent Workspace
 * @impl    React Page — Creator Domain Shell at /@:handle (Law VI)
 *
 * The creator's persistent home. Every creator lands here after login.
 * Authenticated owners see their full management workspace.
 * Visitors see the creator's public domain.
 *
 * Sections (owner view):
 *   Overview    — stats, quick actions, public link
 *   Artifacts   — full artifact library across all mediums
 *   Collections — curated groupings
 *   Drafts      — unpublished works
 *   Provenance  — Chain of Record for all works
 *   Analytics   — witness counts, discovery metrics
 *   Settings    — domain configuration
 *
 * Public view: creator profile with artifact grid
 */

import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import {
  Loader2, LayoutGrid, BookOpen, Music, FileText, BarChart2,
  Settings, Globe, ExternalLink, Upload, Shield, Eye,
  Layers, ChevronRight, AtSign, Star, Clock, Zap,
  Image, Video, Code2, FlaskConical, Gavel, Fingerprint,
  GitBranch, Archive, Users, Heart, Play, Download,
  PenLine, Sparkles, Lock, Unlock, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import ErrorBoundary from "@/components/ErrorBoundary";

// ─── Section definitions ────────────────────────────────────────────────────

type SectionId = "overview" | "artifacts" | "collections" | "drafts" | "provenance" | "analytics" | "settings";

interface NavSection {
  id: SectionId;
  icon: React.ElementType;
  label: string;
  description: string;
  ownerOnly?: boolean;
}

const SECTIONS: NavSection[] = [
  { id: "overview",     icon: Layers,       label: "Overview",     description: "Stats, quick actions, public link" },
  { id: "artifacts",    icon: Archive,       label: "Artifacts",    description: "All registered works" },
  { id: "collections",  icon: LayoutGrid,    label: "Collections",  description: "Curated groupings" },
  { id: "drafts",       icon: PenLine,       label: "Drafts",       description: "Unpublished works", ownerOnly: true },
  { id: "provenance",   icon: GitBranch,     label: "Provenance",   description: "Chain of Record", ownerOnly: true },
  { id: "analytics",    icon: BarChart2,     label: "Analytics",    description: "Witness & discovery metrics", ownerOnly: true },
  { id: "settings",     icon: Settings,      label: "Settings",     description: "Domain configuration", ownerOnly: true },
];

// ─── Medium icons ────────────────────────────────────────────────────────────

const MEDIUM_ICONS: Record<string, React.ElementType> = {
  music: Music,
  lyrics: FileText,
  book: BookOpen,
  comic: Image,
  video: Video,
  software: Code2,
  research: FlaskConical,
  doctrine: Gavel,
  ip: Fingerprint,
  visual: Image,
};

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent?: string }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-4"
      style={{ background: "var(--ln-surface-card)", border: "1px solid var(--ln-border-subtle)" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--ln-surface-panel)" }}>
        <Icon className="w-5 h-5" style={{ color: accent || "var(--ln-gold)" }} />
      </div>
      <div>
        <div className="text-xl font-bold" style={{ color: "var(--ln-text-primary)", fontFamily: "var(--ln-font-display)" }}>{value}</div>
        <div className="text-xs" style={{ color: "var(--ln-text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Artifact row ────────────────────────────────────────────────────────────

function ArtifactRow({ song, isOwner }: { song: any; isOwner: boolean }) {
  const MediumIcon = MEDIUM_ICONS[song.medium || "music"] || Music;
  const statusColor = song.songStatus === "Published" ? "var(--ln-status-active)"
    : song.songStatus === "Draft" ? "var(--ln-gold)"
    : song.songStatus === "Unlisted" ? "#a855f7"
    : "var(--ln-status-inactive)";

  return (
    <Link href={`/song/${song.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer group transition-all duration-150"
        style={{ background: "var(--ln-surface-card)", border: "1px solid var(--ln-border-subtle)" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--ln-border-gold)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--ln-border-subtle)")}>
        {/* Cover art */}
        <div className="w-10 h-10 rounded-md flex-shrink-0 overflow-hidden"
          style={{ background: "var(--ln-surface-panel)" }}>
          {song.coverArtUrl
            ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><MediumIcon className="w-4 h-4" style={{ color: "var(--ln-text-muted)" }} /></div>
          }
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate" style={{ color: "var(--ln-text-primary)" }}>{song.title}</div>
          <div className="text-xs truncate" style={{ color: "var(--ln-text-muted)" }}>
            {song.primaryGenre || song.medium || "Work"} · {song.witnessId ? `WID-${song.witnessId.slice(0, 8)}` : "No WID"}
          </div>
        </div>
        {/* Status (owner only) */}
        {isOwner && (
          <div className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>
            {song.songStatus || "Published"}
          </div>
        )}
        {/* Witness count */}
        <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: "var(--ln-text-muted)" }}>
          <Heart className="w-3 h-3" />
          <span>{song.witnessCount || 0}</span>
        </div>
        <ArrowUpRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--ln-gold)" }} />
      </div>
    </Link>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function CreatorDomainShell() {
  const { handle } = useParams<{ handle: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  // Resolve the creator by handle
  const creatorQuery = trpc.profile.getByHandle.useQuery(
    { handle: handle || "" },
    { enabled: Boolean(handle), retry: false }
  );

  // Determine if this is the owner viewing their own domain
  const isOwner = Boolean(user && creatorQuery.data && user.id === creatorQuery.data.id);

  // Load owner data (only when viewing own domain)
  const meQuery = trpc.profile.me.useQuery(undefined, { enabled: isOwner });
  const mySongsQuery = trpc.songs.mySongs.useQuery(undefined, { enabled: isOwner });
  const analyticsQuery = trpc.profile.myAnalytics.useQuery(undefined, { enabled: isOwner });

  // Load public creator data — use discover filtered by creator via profile.getCreatorMini
  const publicSongsQuery = trpc.songs.countByCreator.useQuery(
    { creatorId: creatorQuery.data?.id || 0 },
    { enabled: Boolean(creatorQuery.data?.id) && !isOwner }
  );

  // Redirect if handle not found
  useEffect(() => {
    if (!creatorQuery.isLoading && creatorQuery.error) {
      toast.error("Creator not found.");
      navigate("/explore", { replace: true });
    }
  }, [creatorQuery.isLoading, creatorQuery.error, navigate]);

  const creator = isOwner ? meQuery.data : creatorQuery.data;
  // For public view, songs list comes from the owner's public songs via discover
  // For now, public visitors see a count; full list requires the owner's mySongs
  const songs = isOwner ? (mySongsQuery.data || []) : [];
  const analytics = analyticsQuery.data;

  const publishedSongs = songs.filter((s: any) => s.songStatus === "Published" || !s.songStatus);
  const draftSongs = songs.filter((s: any) => s.songStatus === "Draft");

  const isLoading = creatorQuery.isLoading || (isOwner && meQuery.isLoading);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-surface-void)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ln-gold)]" />
      </div>
    );
  }

  if (!creatorQuery.data) return null;

  const displayName = (creator as any)?.name || (creator as any)?.artistHandle || handle;
  const bio = (creator as any)?.bio;
  const avatarUrl = (creator as any)?.profilePhotoUrl;
  const bannerUrl = (creator as any)?.bannerUrl;
  const keeperArchetype = (creator as any)?.keeperArchetype;

  const visibleSections = SECTIONS.filter(s => !s.ownerOnly || isOwner);

  return (
    <>
      <Helmet>
        <title>{displayName} — Living Nexus</title>
        <meta name="description" content={bio || `${displayName}'s creative domain on Living Nexus.`} />
      </Helmet>

      <div className="min-h-screen" style={{ background: "var(--ln-surface-void)" }}>
        {/* ── Banner ── */}
        <div className="relative h-48 md:h-64 overflow-hidden"
          style={{ background: bannerUrl ? undefined : "linear-gradient(135deg, var(--ln-surface-panel) 0%, var(--ln-surface-void) 100%)" }}>
          {bannerUrl && <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, var(--ln-surface-void) 100%)" }} />

          {/* Owner badge */}
          {isOwner && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid var(--ln-border-gold)", color: "var(--ln-gold)", backdropFilter: "blur(8px)" }}>
                <Lock className="w-3 h-3" />
                Your Domain
              </div>
              <Button
                size="sm"
                onClick={() => window.open(`/creator/${creatorQuery.data?.id}`, "_blank")}
                className="gap-1.5 text-xs"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid var(--ln-border-subtle)", color: "var(--ln-text-secondary)", backdropFilter: "blur(8px)" }}
              >
                <Globe className="w-3 h-3" />
                Public View
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* ── Identity header ── */}
        <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
          <div className="flex items-end gap-4 mb-6">
            {/* Avatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 ring-4"
              style={{ background: "var(--ln-surface-panel)", outline: "4px solid var(--ln-surface-void)" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ color: "var(--ln-gold)", fontFamily: "var(--ln-font-display)" }}>
                    {(displayName || "?")[0].toUpperCase()}
                  </div>
              }
            </div>
            {/* Name + handle */}
            <div className="pb-2 flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold truncate" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-text-primary)" }}>
                {displayName}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <span className="text-sm font-mono" style={{ color: "var(--ln-gold)" }}>@{handle}</span>
                {keeperArchetype && (
                  <Badge variant="outline" className="text-xs capitalize" style={{ borderColor: "var(--ln-border-gold)", color: "var(--ln-gold)" }}>
                    {keeperArchetype}
                  </Badge>
                )}
              </div>
              {bio && <p className="text-sm mt-2 line-clamp-2" style={{ color: "var(--ln-text-secondary)" }}>{bio}</p>}
            </div>
          </div>

          {/* ── Section navigation ── */}
          <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-none">
            {visibleSections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0"
                  style={{
                    background: isActive ? "var(--ln-gold)" : "var(--ln-surface-panel)",
                    color: isActive ? "var(--ln-surface-void)" : "var(--ln-text-secondary)",
                    border: isActive ? "none" : "1px solid var(--ln-border-subtle)",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </div>

          {/* ── Section content ── */}
          <ErrorBoundary>
            <div className="pb-24">

              {/* OVERVIEW */}
              {activeSection === "overview" && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="Artifacts" value={songs.length} icon={Archive} />
                    <StatCard label="Published" value={publishedSongs.length} icon={Globe} accent="var(--ln-status-active)" />
                    {isOwner && <StatCard label="Drafts" value={draftSongs.length} icon={PenLine} accent="var(--ln-gold)" />}
                    {analytics && <StatCard label="Total Plays" value={analytics.totalPlays || 0} icon={Play} accent="#60a5fa" />}
                  </div>

                  {/* Quick actions (owner only) */}
                  {isOwner && (
                    <div>
                      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--ln-text-muted)" }}>Quick Actions</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Upload Work", icon: Upload, href: "/upload", accent: "var(--ln-gold)" },
                          { label: "Batch Upload", icon: Layers, href: "/batch-upload", accent: "#60a5fa" },
                          { label: "Manifest Studio", icon: Sparkles, href: "/manifest", accent: "#a855f7" },
                          { label: "View Registry", icon: Shield, href: "/witness-registry", accent: "var(--ln-status-active)" },
                        ].map(action => {
                          const Icon = action.icon;
                          return (
                            <Link key={action.href} href={action.href}>
                              <div className="rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer group transition-all duration-150 text-center"
                                style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = action.accent)}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--ln-border-subtle)")}>
                                <Icon className="w-5 h-5" style={{ color: action.accent }} />
                                <span className="text-xs font-medium" style={{ color: "var(--ln-text-secondary)" }}>{action.label}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recent artifacts */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ln-text-muted)" }}>
                        {isOwner ? "Recent Works" : "Works"}
                      </h2>
                      {songs.length > 5 && (
                        <button onClick={() => setActiveSection("artifacts")} className="text-xs flex items-center gap-1" style={{ color: "var(--ln-gold)" }}>
                          View all <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {songs.slice(0, 5).map((song: any) => (
                        <ArtifactRow key={song.id} song={song} isOwner={isOwner} />
                      ))}
                      {songs.length === 0 && (
                        <div className="text-center py-12 rounded-xl" style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}>
                          <Archive className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--ln-text-muted)" }} />
                          <p className="text-sm" style={{ color: "var(--ln-text-muted)" }}>
                            {isOwner ? "No works yet. Upload your first artifact." : "No published works yet."}
                          </p>
                          {isOwner && (
                            <Link href="/upload">
                              <Button size="sm" className="mt-4" style={{ background: "var(--ln-gold)", color: "var(--ln-surface-void)" }}>
                                <Upload className="w-4 h-4 mr-2" /> Upload Work
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ARTIFACTS */}
              {activeSection === "artifacts" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-text-primary)" }}>
                      Artifact Library
                    </h2>
                    {isOwner && (
                      <Link href="/upload">
                        <Button size="sm" className="gap-2" style={{ background: "var(--ln-gold)", color: "var(--ln-surface-void)" }}>
                          <Upload className="w-4 h-4" /> Upload
                        </Button>
                      </Link>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(isOwner ? songs : publishedSongs).map((song: any) => (
                      <ArtifactRow key={song.id} song={song} isOwner={isOwner} />
                    ))}
                    {songs.length === 0 && (
                      <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}>
                        <Archive className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--ln-text-muted)" }} />
                        <p style={{ color: "var(--ln-text-muted)" }}>No artifacts registered yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COLLECTIONS */}
              {activeSection === "collections" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-text-primary)" }}>Collections</h2>
                    {isOwner && (
                      <Link href="/my-projects">
                        <Button size="sm" variant="outline" className="gap-2">
                          <LayoutGrid className="w-4 h-4" /> Manage
                        </Button>
                      </Link>
                    )}
                  </div>
                  <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}>
                    <LayoutGrid className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--ln-text-muted)" }} />
                    <p style={{ color: "var(--ln-text-muted)" }}>Collections coming soon.</p>
                    <Link href="/my-projects">
                      <Button size="sm" className="mt-4" variant="outline">View Projects</Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* DRAFTS (owner only) */}
              {activeSection === "drafts" && isOwner && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-text-primary)" }}>Drafts</h2>
                  <div className="space-y-2">
                    {draftSongs.map((song: any) => (
                      <ArtifactRow key={song.id} song={song} isOwner={true} />
                    ))}
                    {draftSongs.length === 0 && (
                      <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}>
                        <PenLine className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--ln-text-muted)" }} />
                        <p style={{ color: "var(--ln-text-muted)" }}>No drafts. All your works are published.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PROVENANCE (owner only) */}
              {activeSection === "provenance" && isOwner && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-text-primary)" }}>Chain of Record</h2>
                  <div className="rounded-xl p-6 text-center" style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}>
                    <GitBranch className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--ln-gold)" }} />
                    <p className="mb-4" style={{ color: "var(--ln-text-secondary)" }}>
                      Every artifact you register generates a cryptographic Witness ID anchored to your identity.
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Link href="/witness-registry">
                        <Button size="sm" style={{ background: "var(--ln-gold)", color: "var(--ln-surface-void)" }}>
                          <Shield className="w-4 h-4 mr-2" /> Witness Registry
                        </Button>
                      </Link>
                      <Link href="/verify">
                        <Button size="sm" variant="outline">
                          <Fingerprint className="w-4 h-4 mr-2" /> Verify a WID
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* ANALYTICS (owner only) */}
              {activeSection === "analytics" && isOwner && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-text-primary)" }}>Analytics</h2>
                  {analytics ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <StatCard label="Total Plays" value={analytics.totalPlays || 0} icon={Play} accent="#60a5fa" />
                      <StatCard label="Witnesses" value={analytics.totalLikes || 0} icon={Heart} accent="#f472b6" />
                      <StatCard label="Downloads" value={analytics.totalDownloads || 0} icon={Download} accent="#34d399" />
                      <StatCard label="Tips Received" value={`$${((analytics.totalAmountReceived || 0) / 100).toFixed(2)}`} icon={Zap} accent="var(--ln-gold)" />
                    </div>
                  ) : (
                    <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}>
                      <BarChart2 className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--ln-text-muted)" }} />
                      <p style={{ color: "var(--ln-text-muted)" }}>Analytics loading…</p>
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS (owner only) */}
              {activeSection === "settings" && isOwner && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold" style={{ fontFamily: "var(--ln-font-display)", color: "var(--ln-text-primary)" }}>Domain Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: "Edit Identity", description: "Name, bio, avatar, banner", href: "/profile", icon: AtSign },
                      { label: "Domain Layout", description: "Customize your public domain", href: "/domain", icon: LayoutGrid },
                      { label: "Billing & Subscription", description: "Living Archive plan", href: "/settings/billing", icon: Star },
                      { label: "Playback Settings", description: "Audio quality, autoplay", href: "/settings/playback", icon: Play },
                      { label: "Payment Methods", description: "Manage payment info", href: "/settings/payment-methods", icon: Zap },
                      { label: "Distribution", description: "DSP distribution settings", href: "/distribute", icon: Globe },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href}>
                          <div className="flex items-center gap-4 p-4 rounded-xl cursor-pointer group transition-all duration-150"
                            style={{ background: "var(--ln-surface-panel)", border: "1px solid var(--ln-border-subtle)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--ln-border-gold)")}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--ln-border-subtle)")}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "var(--ln-surface-card)" }}>
                              <Icon className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium" style={{ color: "var(--ln-text-primary)" }}>{item.label}</div>
                              <div className="text-xs" style={{ color: "var(--ln-text-muted)" }}>{item.description}</div>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--ln-gold)" }} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
