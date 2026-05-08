import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Plus, Search, Star, Users, Zap } from "lucide-react";

export default function GuideDirectoryPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: guides, isLoading } = trpc.guides.listPublished.useQuery({ limit: 100 });

  const filtered = (guides ?? []).filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.canonicalName?.toLowerCase().includes(q) ||
      g.role?.toLowerCase().includes(q) ||
      g.alignment?.toLowerCase().includes(q) ||
      g.domain?.toLowerCase().includes(q)
    );
  });

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
              <h1 className="text-4xl font-bold text-white mb-2">Guide Directory</h1>
              <p className="text-[#6b5f3e] text-sm max-w-xl">
                Every guide character is provenance-verified and cryptographically linked to its creator.
                Derivatives, appearances, and lineage are tracked from origin.
              </p>
            </div>
            {user && (
              <Link href="/guides/upload">
                <Button className="bg-[#C9A84C] hover:bg-[#b8973b] text-black font-bold gap-2 shrink-0">
                  <Plus className="w-4 h-4" />
                  Upload New Guide
                </Button>
              </Link>
            )}
          </div>

          {/* Stats bar */}
          <div className="flex gap-8 mt-8 pt-6 border-t border-[#1e1a0e]">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white font-bold">{guides?.length ?? 0}</span>
              <span className="text-[#6b5f3e]">Canonical Guides</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-white font-bold">{guides?.length ?? 0}</span>
              <span className="text-[#6b5f3e]">Provenance Verified</span>
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

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 bg-[#111008] rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-[#111008] border border-[#2a2010] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#3a3020]" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              {search ? "No guides match your search" : "No guides published yet"}
            </h3>
            <p className="text-[#6b5f3e] text-sm mb-6">
              {search
                ? "Try a different search term."
                : "Be the first to upload a provenance-verified guide character."}
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
            {filtered.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        )}
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

function GuideCard({ guide }: { guide: any }) {
  const symbols: string[] = (() => {
    try { return JSON.parse(guide.symbolsJson ?? "[]"); } catch { return []; }
  })();

  return (
    <Link href={`/guide/${guide.id}`}>
      <div className="group bg-[#0d0b06] border border-[#1e1a0e] rounded-xl overflow-hidden hover:border-[#C9A84C]/40 transition-all duration-300 cursor-pointer">
        {/* Cover art */}
        <div className="relative h-52 bg-[#111008] overflow-hidden">
          {guide.coverArtUrl ? (
            <img
              src={guide.coverArtUrl}
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
          {guide.wid && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/40 text-[10px] font-mono">
                {guide.wid}
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
