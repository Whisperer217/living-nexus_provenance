import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, ArrowLeft, ExternalLink, Copy, Check,
  Star, Layers, Users, Zap, BookOpen
} from "lucide-react";
import { useState } from "react";

export default function GuideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: guide, isLoading } = trpc.guides.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const copyWid = () => {
    if (guide?.widCode) {
      navigator.clipboard.writeText(guide.widCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080600] p-8">
        <Skeleton className="h-96 bg-[#111008] rounded-xl mb-6" />
        <Skeleton className="h-48 bg-[#111008] rounded-xl" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-[#080600] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-[#2a2010] mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Guide Not Found</h2>
          <p className="text-[#6b5f3e] text-sm mb-6">This guide may not be published yet or does not exist.</p>
          <Link href="/guides">
            <Button variant="outline" className="border-[#2a2010] text-[#e8d5a3] gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const symbols: Array<{ name: string; icon?: string }> = (() => {
    try {
      const rawJson = typeof guide.symbolsJson === "string" ? guide.symbolsJson : JSON.stringify(guide.symbolsJson ?? []);
      const raw = JSON.parse(rawJson);
      return Array.isArray(raw) ? raw.map((s: any) =>
        typeof s === "string" ? { name: s } : s
      ) : [];
    } catch { return []; }
  })();

  const rights: Record<string, string> = (() => {
    try { return JSON.parse(typeof guide.rightsJson === "string" ? guide.rightsJson : JSON.stringify(guide.rightsJson ?? {})); } catch { return {}; }
  })();

  const protections: Record<string, boolean> = (() => {
    try { return JSON.parse(typeof (guide as any).derivativePermissionsJson === "string" ? (guide as any).derivativePermissionsJson : JSON.stringify((guide as any).derivativePermissionsJson ?? {})); } catch { return {}; }
  })();

  const isOwner = user && guide.creatorId === (user as any).id;

  return (
    <div className="min-h-screen bg-[#080600] text-[#e8d5a3]">
      {/* Back nav */}
      <div className="border-b border-[#1e1a0e] bg-[#0a0800] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/guides">
            <button className="flex items-center gap-2 text-[#6b5f3e] hover:text-[#C9A84C] transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Guide Directory
            </button>
          </Link>
          {isOwner && (
            <Badge className="bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/40 text-xs">
              Your Guide
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — Cover art */}
          <div className="lg:col-span-1">
            <div className="relative rounded-xl overflow-hidden bg-[#111008] border border-[#2a2010] aspect-[3/4]">
              {guide.artworkUrl ? (
                <img
                  src={guide.artworkUrl}
                  alt={guide.canonicalName ?? "Guide"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Shield className="w-24 h-24 text-[#2a2010]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080600] via-transparent to-transparent" />
              {/* Status badge */}
              <div className="absolute top-4 left-4">
                <Badge className="bg-green-900/70 text-green-400 border border-green-700/40 text-xs gap-1">
                  <Shield className="w-3 h-3" />
                  PROVENANCE VERIFIED
                </Badge>
              </div>
            </div>

            {/* WID block */}
            {guide.widCode && (
              <div className="mt-4 bg-[#0d0b06] border border-[#2a2010] rounded-xl p-4">
                <div className="text-[#6b5f3e] text-xs mb-1 tracking-wider">CANONICAL WID</div>
                <div className="flex items-center gap-2">
                  <code className="text-[#C9A84C] font-mono text-sm flex-1 truncate">{guide.widCode}</code>
                  <button onClick={copyWid} className="text-[#6b5f3e] hover:text-[#C9A84C] transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Symbols */}
            {symbols.length > 0 && (
              <div className="mt-4 bg-[#0d0b06] border border-[#2a2010] rounded-xl p-4">
                <div className="text-[#6b5f3e] text-xs mb-3 tracking-wider">SYMBOLS & ICONOGRAPHY</div>
                <div className="flex flex-wrap gap-2">
                  {symbols.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 bg-[#111008] border border-[#2a2010] rounded-lg p-3 min-w-[64px]">
                      {s.icon && <span className="text-xl">{s.icon}</span>}
                      <span className="text-[#e8d5a3] text-xs text-center">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-4xl font-bold text-white leading-tight">
                  {guide.canonicalName ?? "Unnamed Guide"}
                </h1>
              </div>
              {guide.role && (
                <p className="text-[#C9A84C] text-lg font-medium mb-1">{guide.role}</p>
              )}
              {guide.tagline && (
                <p className="text-[#6b5f3e] text-sm">{guide.tagline}</p>
              )}
            </div>

            {/* Identity table */}
            <div className="bg-[#0d0b06] border border-[#2a2010] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#1e1a0e]">
                <span className="text-[#C9A84C] text-xs font-bold tracking-wider">GUIDE IDENTITY</span>
              </div>
              <table className="w-full">
                <tbody>
                  {[
                    ["TYPE", guide.archetypeType ?? "Guide Character / Archetype"],
                    ["ROLE", guide.role],
                    ["ALIGNMENT", guide.alignment],
                    ["DOMAIN", guide.domain],
                    ["FIRST MANIFESTED", guide.firstManifested],
                    ["WID", guide.widCode],
                    ["STATUS", guide.canonicalStatus?.toUpperCase()],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <tr key={label as string} className="border-b border-[#1e1a0e] last:border-0">
                      <td className="px-5 py-3 text-[#6b5f3e] text-xs font-bold tracking-wider w-40">{label}</td>
                      <td className="px-5 py-3 text-[#e8d5a3] text-sm">
                        {label === "STATUS" ? (
                          <Badge className="bg-green-900/40 text-green-400 border border-green-700/40 text-xs">
                            {value}
                          </Badge>
                        ) : label === "WID" ? (
                          <code className="text-[#C9A84C] font-mono text-xs">{value}</code>
                        ) : value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Testimony */}
            {guide.testimony && (
              <div className="bg-[#0d0b06] border border-[#2a2010] rounded-xl p-5">
                <div className="text-[#C9A84C] text-xs font-bold tracking-wider mb-3">TESTIMONY OF ORIGIN</div>
                <blockquote className="text-[#e8d5a3] text-sm leading-relaxed italic border-l-2 border-[#C9A84C]/40 pl-4">
                  {guide.testimony}
                </blockquote>
              </div>
            )}

            {/* Description */}
            {guide.loreDescription && (
              <div className="bg-[#0d0b06] border border-[#2a2010] rounded-xl p-5">
                <div className="text-[#C9A84C] text-xs font-bold tracking-wider mb-3">DESCRIPTION</div>
                <p className="text-[#e8d5a3] text-sm leading-relaxed">{guide.loreDescription}</p>
              </div>
            )}

            {/* Rights */}
            {Object.keys(rights).length > 0 && (
              <div className="bg-[#0d0b06] border border-[#2a2010] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1e1a0e]">
                  <span className="text-[#C9A84C] text-xs font-bold tracking-wider">RIGHTS SETTINGS</span>
                </div>
                <div className="p-5 space-y-2">
                  {Object.entries(rights).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[#e8d5a3] text-sm">{key}</span>
                      <Badge
                        className={
                          value === "Retained"
                            ? "bg-blue-900/40 text-blue-400 border border-blue-700/40"
                            : value === "Granted"
                            ? "bg-green-900/40 text-green-400 border border-green-700/40"
                            : "bg-[#1e1a0e] text-[#6b5f3e] border border-[#2a2010]"
                        }
                      >
                        {value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue split */}
            {guide.revenueCreatorPct != null && (
              <div className="bg-[#0d0b06] border border-[#2a2010] rounded-xl p-5">
                <div className="text-[#C9A84C] text-xs font-bold tracking-wider mb-4">REVENUE SPLIT</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#e8d5a3] text-sm">Creator (You)</span>
                    <span className="text-white font-bold">{guide.revenueCreatorPct}%</span>
                  </div>
                  <div className="w-full bg-[#1e1a0e] rounded-full h-2">
                    <div
                      className="bg-[#C9A84C] h-2 rounded-full"
                      style={{ width: `${guide.revenueCreatorPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b5f3e] text-sm">Living Nexus Platform</span>
                    <span className="text-[#6b5f3e] font-bold">{100 - (guide.revenueCreatorPct ?? 90)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Protections */}
            {Object.keys(protections).length > 0 && (
              <div className="bg-[#0d0b06] border border-[#2a2010] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1e1a0e]">
                  <span className="text-[#C9A84C] text-xs font-bold tracking-wider">CANONICAL PROTECTIONS</span>
                </div>
                <div className="p-5 space-y-3">
                  {Object.entries(protections).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[#e8d5a3] text-sm">{key}</span>
                      <div className={`w-10 h-5 rounded-full flex items-center ${value ? "bg-[#C9A84C] justify-end" : "bg-[#1e1a0e] justify-start"} px-0.5 transition-all`}>
                        <div className="w-4 h-4 rounded-full bg-white shadow" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Public URL */}
            <div className="bg-[#0d0b06] border border-[#2a2010] rounded-xl p-5">
              <div className="text-[#C9A84C] text-xs font-bold tracking-wider mb-3">PUBLIC URL</div>
              <div className="flex items-center gap-2">
                <code className="text-[#e8d5a3] text-sm bg-[#111008] border border-[#2a2010] rounded px-3 py-2 flex-1 truncate">
                  {window.location.origin}/guide/{guide.id}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/guide/${guide.id}`);
                  }}
                  className="text-[#6b5f3e] hover:text-[#C9A84C] transition-colors p-2"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e1a0e] bg-[#0a0800] py-6 mt-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-[#3a3020]">
          <span>LIVING NEXUS PROVENANCE PROTOCOL v1.0</span>
          <span>TRUTH · CREATION · PROTECTION · LEGACY</span>
          <span>YOU CANNOT PROTECT CREATION WITHOUT PROTECTING THE CREATOR.</span>
        </div>
      </div>
    </div>
  );
}
