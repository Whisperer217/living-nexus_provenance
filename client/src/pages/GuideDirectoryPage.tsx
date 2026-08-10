import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Plus, Search, Star, Users, Zap, BookOpen, Sparkles } from "lucide-react";
import { GUIDE_PRODUCT } from "@/lib/loopProduct";
// ── Stock Living Nexus Canon Guides ─────────────────────────────────────────
const STOCK_GUIDES = [
  {
    id: "witness",
    canonicalName: "The Witness",
    role: "Provenance Companion",
    alignment: "Truth · Testimony · Emotional Depth",
    domain: "Provenance · Emotional Truth · Testimony",
    description: "Provenance-aware creative companion. Speaks with quiet authority and poetic precision.",
    badge: "Testimony",
    accentColor: "#7C3AED",
    capabilities: ["testimony", "emotional-depth", "provenance"],
  },
  {
    id: "conductor",
    canonicalName: "The Conductor",
    role: "Structure Architect",
    alignment: "Structure · Arrangement · Architecture",
    domain: "Composition · Architecture · Direction",
    description: "Master of structure and arrangement. Builds the architecture that lets your work breathe.",
    badge: "Direction",
    accentColor: "#2563EB",
    capabilities: ["structure", "arrangement", "architecture"],
  },
  {
    id: "archivist",
    canonicalName: "The Archivist",
    role: "Semantic Analyst",
    alignment: "Archive · Semantics · Corpus Analysis",
    domain: "Archive · Patterns · Provenance",
    description: "Deep reader and semantic analyst. Finds patterns across your full corpus.",
    badge: "Archive",
    accentColor: "#D97706",
    capabilities: ["archive", "semantics", "corpus-analysis"],
  },
  {
    id: "sovereign",
    canonicalName: "The Sovereign",
    role: "IP Guardian",
    alignment: "IP Protection · Provenance · Legacy",
    domain: "IP · Rights · Legacy",
    description: "Guardian of your creative legacy and IP. Understands WIDs, provenance events, and the Living Nexus system deeply.",
    badge: "Sovereignty",
    accentColor: "#059669",
    capabilities: ["ip-protection", "provenance", "legacy"],
  },
  {
    id: "cipher",
    canonicalName: "The Cipher",
    role: "Boundary Pusher",
    alignment: "Experimentation · Identity · Edge",
    domain: "Experimentation · Boundary · Identity",
    description: "Experimental and boundary-pushing. Explores the edges of your creative identity.",
    badge: "Cipher",
    accentColor: "#DC2626",
    capabilities: ["experimentation", "boundary-pushing", "identity"],
  },
];

export default function GuideDirectoryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: guides, isLoading } = trpc.guides.listPublished.useQuery({ limit: 100 });
  const { data: mine } = trpc.guides.listMine.useQuery(undefined, { enabled: !!user });
  const { data: slots } = trpc.guides.mySlots.useQuery(undefined, { enabled: !!user });
  const buySlots = trpc.guides.createSlotCheckout.useMutation({
    onSuccess: (res) => {
      if (res.url) window.location.href = res.url;
    },
    onError: (e) => toast.error(e.message),
  });

  const q = search.toLowerCase().trim();

  const filteredUser = (guides ?? []).filter((g) => {
    if (!q) return true;
    return (
      g.canonicalName?.toLowerCase().includes(q) ||
      g.role?.toLowerCase().includes(q) ||
      g.alignment?.toLowerCase().includes(q) ||
      g.domain?.toLowerCase().includes(q)
    );
  });

  const filteredStock = STOCK_GUIDES.filter((g) => {
    if (!q) return true;
    return (
      g.canonicalName.toLowerCase().includes(q) ||
      g.role.toLowerCase().includes(q) ||
      g.alignment.toLowerCase().includes(q) ||
      g.domain.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  const totalCount = (guides?.length ?? 0) + STOCK_GUIDES.length;
  const remaining = slots?.remaining ?? 0;
  const canUpload = !user || remaining > 0;

  return (
    <div className="min-h-screen bg-[#080600] text-[#e8d5a3]">
      {/* Header */}
      <div className="border-b border-[#1e1a0e] bg-[#0a0800]">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#C9A84C]" />
                </div>
                <span className="text-[#C9A84C] text-xs tracking-[0.3em] font-bold uppercase">Living Nexus Canon</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{GUIDE_PRODUCT.fullName}</h1>
              <p className="text-[#6b5f3e] text-sm max-w-xl">
                Creator-owned guide characters for the platform. {GUIDE_PRODUCT.tagline}
                Drafts keep the full provenance pipeline. Guides level through uploads, contact, and witness acknowledgments.
              </p>
            </div>
            {user && (
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-xs text-[#6b5f3e]">
                  Slots{" "}
                  <span className="text-[#C9A84C] font-bold">
                    {slots ? `${slots.used}/${slots.total}` : "—"}
                  </span>
                  {slots != null && (
                    <span className="ml-2">({remaining} free)</span>
                  )}
                </div>
                {canUpload ? (
                  <Link href="/guides/upload">
                    <Button className="bg-[#C9A84C] hover:bg-[#b8973b] text-black font-bold gap-2">
                      <Plus className="w-4 h-4" />
                      Upload New Guide
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="bg-[#C9A84C] hover:bg-[#b8973b] text-black font-bold gap-2"
                    disabled={buySlots.isPending}
                    onClick={() =>
                      buySlots.mutate({
                        packageId: "guide_3",
                        origin: window.location.origin,
                      })
                    }
                  >
                    Buy more slots
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="flex gap-8 mt-8 pt-6 border-t border-[#1e1a0e]">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white font-bold">{totalCount}</span>
              <span className="text-[#6b5f3e]">Canonical Guides</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white font-bold">{STOCK_GUIDES.length}</span>
              <span className="text-[#6b5f3e]">LN Canon Guides</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white font-bold">Active</span>
              <span className="text-[#6b5f3e]">Derivative Tracking</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b5f3e]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides by name, role, or domain…"
            className="pl-10 bg-[#0d0b06] border-[#2a2010] text-[#e8d5a3] placeholder:text-[#4a4030] focus:border-[#C9A84C]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-20 space-y-12">

        {/* ── My Guides (creator steward surface) ── */}
        {user && mine && mine.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#C9A84C]" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">My Guides</h2>
                  <p className="text-[#6b5f3e] text-xs">
                    Drafts and published — {slots ? `${slots.used} of ${slots.total} slots used` : "loading slots…"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(slots?.packages ?? []).map((pkg) => (
                  <Button
                    key={pkg.id}
                    variant="outline"
                    size="sm"
                    className="border-[#2a2010] text-[#C9A84C] text-xs"
                    disabled={buySlots.isPending}
                    onClick={() =>
                      buySlots.mutate({
                        packageId: pkg.id as "guide_1" | "guide_3" | "guide_5",
                        origin: window.location.origin,
                      })
                    }
                  >
                    {pkg.label} · ${(pkg.priceCents / 100).toFixed(2)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {mine.map((g) => (
                <Link key={g.id} href={`/guide/${g.id}`}>
                  <div className="rounded-xl border border-[#2a2010] bg-[#0a0800] p-4 hover:border-[#C9A84C]/40 transition-colors cursor-pointer h-full">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-[#1e1a0e] text-[#C9A84C] border-0 text-[10px] uppercase">
                        {g.canonicalStatus}
                      </Badge>
                      <span className="text-[10px] text-[#6b5f3e]">Lv {g.growthLevel ?? 1}</span>
                    </div>
                    <h3 className="text-white font-bold truncate">{g.canonicalName}</h3>
                    <p className="text-[#6b5f3e] text-xs mt-1 truncate">{g.role || g.tagline || "Untitled draft"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Living Nexus Canon Stock Guides ── */}
        {filteredStock.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#C9A84C]" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Living Nexus Canon</h2>
                <p className="text-[#6b5f3e] text-xs">Official guide archetypes built into the Living Nexus system</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {filteredStock.map((guide) => (
                <StockGuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          </section>
        )}

        {/* ── Creator-Uploaded Guides ── */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#1e1a0e] border border-[#2a2010] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#e8d5a3]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Creator Guides</h2>
              <p className="text-[#6b5f3e] text-xs">Provenance-verified Personal Nexus Avatars uploaded by creators</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72 bg-[#111008] rounded-xl" />
              ))}
            </div>
          ) : filteredUser.length === 0 ? (
            <div className="text-center py-16 border border-[#1e1a0e] rounded-xl bg-[#0a0800]">
              <div className="w-16 h-16 rounded-full bg-[#111008] border border-[#2a2010] flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#3a3020]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">
                {search ? "No creator guides match your search" : "No creator guides published yet"}
              </h3>
              <p className="text-[#6b5f3e] text-sm mb-6">
                {search
                  ? "Try a different search term."
                  : "Be the first to upload a provenance-verified Personal Nexus Avatar."}
              </p>
              {user && !search && (
                <Link href="/guides/upload">
                  <Button className="bg-[#C9A84C] hover:bg-[#b8973b] text-black font-bold gap-2">
                    <Plus className="w-4 h-4" />
                    Upload First Guide
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredUser.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer doctrine */}
      <div className="border-t border-[#1e1a0e] bg-[#0a0800] py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-[#3a3020]">
          <span>LIVING NEXUS PROVENANCE PROTOCOL v1.0</span>
          <span>TRUTH · CREATION · PROTECTION · LEGACY</span>
          <span>YOU CANNOT PROTECT CREATION WITHOUT PROTECTING THE CREATOR.</span>
        </div>
      </div>
    </div>
  );
}

// ── Stock Guide Card (LN Canon) ───────────────────────────────────────────────
function StockGuideCard({ guide }: { guide: typeof STOCK_GUIDES[number] }) {
  return (
    <Link href={`/guides/keeper/${guide.id}`}>
      <div className="group bg-[#0d0b06] border border-[#1e1a0e] rounded-xl overflow-hidden hover:border-[#C9A84C]/40 transition-all duration-300 cursor-pointer h-full">
        {/* Color band header */}
        <div
          className="relative h-28 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${guide.accentColor}22, ${guide.accentColor}08)` }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center border-2"
            style={{ borderColor: `${guide.accentColor}60`, background: `${guide.accentColor}18` }}
          >
            <Sparkles className="w-7 h-7" style={{ color: guide.accentColor }} />
          </div>
          {/* LN Canon badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/40 text-[10px] font-mono">
              LN CANON
            </Badge>
          </div>
          {/* Specialty badge */}
          <div className="absolute top-3 right-3">
            <Badge
              className="text-[10px] border"
              style={{
                background: `${guide.accentColor}22`,
                color: guide.accentColor,
                borderColor: `${guide.accentColor}40`,
              }}
            >
              {guide.badge}
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-white font-bold text-sm leading-tight mb-1 group-hover:text-[#C9A84C] transition-colors">
            {guide.canonicalName}
          </h3>
          <p className="text-xs mb-2" style={{ color: guide.accentColor }}>{guide.role}</p>
          <p className="text-[#6b5f3e] text-xs mb-3 line-clamp-2">{guide.description}</p>

          {/* Capabilities */}
          <div className="flex flex-wrap gap-1">
            {guide.capabilities.slice(0, 2).map((cap) => (
              <span key={cap} className="text-[10px] bg-[#1e1a0e] text-[#6b5f3e] px-2 py-0.5 rounded-full">
                {cap}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Creator Guide Card ────────────────────────────────────────────────────────
function GuideCard({ guide }: { guide: any }) {
  const symbols: string[] = (() => {
    try { return JSON.parse(guide.symbolsJson ?? "[]"); } catch { return []; }
  })();

  // Field name mapping: schema uses artworkUrl + widCode
  const coverUrl = guide.artworkUrl ?? guide.coverArtUrl ?? null;
  const wid = guide.widCode ?? guide.wid ?? null;

  return (
    <Link href={`/guide/${guide.id}`}>
      <div className="group bg-[#0d0b06] border border-[#1e1a0e] rounded-xl overflow-hidden hover:border-[#C9A84C]/40 transition-all duration-300 cursor-pointer">
        {/* Cover art */}
        <div className="relative h-52 bg-[#111008] overflow-hidden">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={guide.canonicalName ?? "Guide"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Shield className="w-16 h-16 text-[#2a2010]" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b06] via-transparent to-transparent" />
          {/* WID badge */}
          {wid && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/40 text-[10px] font-mono">
                {wid}
              </Badge>
            </div>
          )}
          {/* Provenance badge */}
          <div className="absolute top-3 left-3">
            <Badge className="bg-green-900/60 text-green-400 border border-green-700/40 text-[10px] gap-1">
              <Shield className="w-2.5 h-2.5" />
              PROVENANCE VERIFIED
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="text-white font-bold text-sm leading-tight mb-1 group-hover:text-[#C9A84C] transition-colors">
            {guide.canonicalName ?? "Unnamed Guide"}
          </h3>
          {guide.role && (
            <p className="text-[#C9A84C] text-xs mb-2">{guide.role}</p>
          )}
          {guide.alignment && (
            <p className="text-[#6b5f3e] text-xs mb-3 line-clamp-2">{guide.alignment}</p>
          )}

          {/* Symbols */}
          {symbols.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {symbols.slice(0, 3).map((s: string, i: number) => (
                <span key={i} className="text-[10px] bg-[#1e1a0e] text-[#6b5f3e] px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Creator */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#1e1a0e]">
            <div className="w-5 h-5 rounded-full bg-[#1e1a0e] flex items-center justify-center">
              <Star className="w-2.5 h-2.5 text-[#C9A84C]" />
            </div>
            <span className="text-[#4a4030] text-[10px]">Creator-owned · Revenue tracked</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
