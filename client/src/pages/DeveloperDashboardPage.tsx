import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Key, Plus, Trash2, Copy, Check, Code2, Zap, Shield, Globe,
  ChevronRight, Terminal, BookOpen, ExternalLink
} from "lucide-react";
import { Link } from "wouter";

const TIER_COLORS: Record<string, string> = {
  free: "bg-zinc-700 text-zinc-200",
  pro: "bg-indigo-700 text-indigo-100",
  enterprise: "bg-amber-700 text-amber-100",
};

const TIER_LIMITS: Record<string, string> = {
  free: "100 registrations / day",
  pro: "5,000 registrations / day",
  enterprise: "Unlimited",
};

export default function DeveloperDashboardPage() {
  const { user } = useAuth();
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const { data: keys = [], refetch } = trpc.apiKey.list.useQuery(undefined, { enabled: !!user });

  const createMutation = trpc.apiKey.create.useMutation({
    onSuccess: (data) => {
      setRevealedKey(data.key);
      setNewKeyName("");
      refetch();
      toast.success("API key created", { description: "Copy it now — it will not be shown again." });
    },
    onError: (err) => toast.error("Error", { description: err.message }),
  });

  const revokeMutation = trpc.apiKey.revoke.useMutation({
    onSuccess: () => { refetch(); toast.success("Key revoked"); },
    onError: (err) => toast.error("Error", { description: err.message }),
  });

  const copyToClipboard = async (text: string, id?: number) => {
    await navigator.clipboard.writeText(text);
    if (id !== undefined) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const activeKeys = keys.filter((k) => k.isActive);
  const revokedKeys = keys.filter((k) => !k.isActive);

  const codeSnippet = `// Register a work with Living Nexus Provenance API
const response = await fetch("https://www.livingnexus.org/api/v1/works/register", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
  },
  body: JSON.stringify({
    title: "My Track",
    contentType: "audio",       // audio | lyrics | manuscript | comic | image
    fileUrl: "https://...",     // optional: S3/CDN URL of the file
    aiDisclosure: "ai_generated" // original | ai_assisted | ai_generated
  })
});

const { wid, verifyUrl, badge } = await response.json();
// wid → "WID-MUS-A1B2C3D4-E5F6G7H8"
// verifyUrl → "https://www.livingnexus.org/verify/WID-MUS-..."
// badge.badgeUrl → SVG badge for embedding`;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Key className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <CardTitle className="text-white">Developer API Access</CardTitle>
            <CardDescription className="text-zinc-400">Sign in to generate API keys and integrate Living Nexus provenance into your tools.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Link href="/login">
              <Button className="bg-amber-600 hover:bg-amber-500 text-black font-semibold">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <Terminal className="w-5 h-5 text-amber-500" />
            <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Living Nexus</span>
            <ChevronRight className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-400 font-mono">Developer API</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Provenance Registration API</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Register creative works and receive WIDs programmatically. Every registered work enters the Living Nexus provenance chain.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-amber-400">{activeKeys.length}</div>
              <div className="text-xs text-zinc-500 mt-1">Active Keys</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-green-400">
                {activeKeys.reduce((sum, k) => sum + (k.usageTotal ?? 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Total Registrations</div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-indigo-400">
                {activeKeys.reduce((sum, k) => sum + (k.usageToday ?? 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Today's Registrations</div>
            </CardContent>
          </Card>
        </div>

        {/* Revealed key banner */}
        {revealedKey && (
          <Card className="bg-amber-950/40 border-amber-700/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-amber-300 font-semibold text-sm mb-2">Copy your API key now — it will not be shown again.</p>
                  <div className="flex items-center gap-2 bg-black/50 rounded px-3 py-2 font-mono text-xs text-amber-200 break-all">
                    <span className="flex-1">{revealedKey}</span>
                    <button onClick={() => copyToClipboard(revealedKey)} className="shrink-0 text-amber-400 hover:text-amber-200">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="mt-3 text-zinc-400 hover:text-white" onClick={() => setRevealedKey(null)}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create new key */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-amber-500" />
              Generate New API Key
            </CardTitle>
            <CardDescription className="text-zinc-400">Free tier: 100 registrations/day. Contact us for Pro or Enterprise access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="key-name" className="text-zinc-300 text-xs mb-1.5 block">Key name (e.g. "Suno Integration", "My App")</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="My Integration"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  onKeyDown={(e) => e.key === "Enter" && newKeyName.trim() && createMutation.mutate({ name: newKeyName.trim(), tier: "free" })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => createMutation.mutate({ name: newKeyName.trim(), tier: "free" })}
                  disabled={!newKeyName.trim() || createMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-500 text-black font-semibold"
                >
                  {createMutation.isPending ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active keys list */}
        {activeKeys.length > 0 && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Key className="w-4 h-4 text-green-500" />
                Active Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeKeys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 bg-zinc-800/60 rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">{k.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-mono ${TIER_COLORS[k.tier ?? "free"]}`}>{k.tier}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="font-mono">{k.keyPrefix}••••••••••••••••••••••</span>
                      <span>·</span>
                      <span>{TIER_LIMITS[k.tier ?? "free"]}</span>
                      <span>·</span>
                      <span>{(k.usageToday ?? 0)} today / {(k.usageTotal ?? 0)} total</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyToClipboard(k.keyPrefix + "...", k.id)}
                      className="text-zinc-500 hover:text-zinc-200 transition-colors"
                      title="Copy prefix"
                    >
                      {copiedId === k.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Revoke "${k.name}"? This cannot be undone.`)) revokeMutation.mutate({ id: k.id }); }}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Integration snippet */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Code2 className="w-4 h-4 text-indigo-400" />
              Quick Integration
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Drop this into any AI tool, script, or backend to register works and receive WIDs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-black/60 rounded-lg p-4 text-xs text-green-300 font-mono overflow-x-auto leading-relaxed whitespace-pre">
                {codeSnippet}
              </pre>
              <button
                onClick={() => copyToClipboard(codeSnippet)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 transition-colors"
                title="Copy snippet"
              >
                {copiedSnippet ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint reference */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-blue-400" />
              Endpoint Reference
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { method: "POST", path: "/api/v1/works/register", auth: true, desc: "Register a work and receive a WID" },
              { method: "GET", path: "/api/v1/works/:wid", auth: false, desc: "Look up a registered work by WID" },
              { method: "GET", path: "/api/v1/creator/:handle/works", auth: false, desc: "List all registered works for a creator" },
              { method: "GET", path: "/api/v1/verify/:wid", auth: false, desc: "Verify a WID (legacy endpoint)" },
              { method: "GET", path: "/api/v1/badge/:wid", auth: false, desc: "SVG badge for embedding" },
              { method: "GET", path: "/api/v1/catalog", auth: false, desc: "Paginated public catalog (Plex/Jellyfin)" },
              { method: "GET", path: "/api/v1/health", auth: false, desc: "Health check" },
            ].map((ep) => (
              <div key={ep.path} className="flex items-start gap-3">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 mt-0.5 ${ep.method === "POST" ? "bg-green-900 text-green-300" : "bg-blue-900 text-blue-300"}`}>
                  {ep.method}
                </span>
                <div className="flex-1 min-w-0">
                  <code className="text-amber-300 text-xs font-mono">{ep.path}</code>
                  <p className="text-zinc-400 text-xs mt-0.5">{ep.desc}</p>
                </div>
                {ep.auth && (
                  <span className="text-xs text-zinc-500 shrink-0 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Auth required
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tier comparison */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-amber-400" />
              API Tiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { tier: "Free", color: "zinc", limit: "100 / day", price: "$0", note: "For personal projects and testing" },
                { tier: "Pro", color: "indigo", limit: "5,000 / day", price: "Contact us", note: "For production integrations" },
                { tier: "Enterprise", color: "amber", limit: "Unlimited", price: "Contact us", note: "Platform-scale integrations (Suno, Udio, etc.)" },
              ].map((t) => (
                <div key={t.tier} className={`rounded-lg border border-${t.color}-800/50 bg-${t.color}-950/30 p-4`}>
                  <div className={`text-${t.color === "zinc" ? "zinc-200" : t.color + "-300"} font-bold text-sm mb-1`}>{t.tier}</div>
                  <div className="text-white text-lg font-bold mb-1">{t.limit}</div>
                  <div className="text-zinc-500 text-xs">{t.note}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Docs link */}
        <div className="flex items-center justify-between py-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <BookOpen className="w-4 h-4" />
            Full API documentation and SDK coming soon.
          </div>
          <Link href="/developers">
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:text-white gap-2">
              View Docs <ExternalLink className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {/* Revoked keys (collapsed) */}
        {revokedKeys.length > 0 && (
          <details className="group">
            <summary className="text-zinc-500 text-xs cursor-pointer hover:text-zinc-300 list-none flex items-center gap-2">
              <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
              {revokedKeys.length} revoked key{revokedKeys.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-3 space-y-2">
              {revokedKeys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 bg-zinc-900/40 rounded px-4 py-2 opacity-50">
                  <span className="text-zinc-500 text-sm line-through">{k.name}</span>
                  <span className="text-zinc-600 font-mono text-xs">{k.keyPrefix}••••</span>
                  <span className="text-zinc-600 text-xs ml-auto">
                    Revoked {k.revokedAt ? new Date(k.revokedAt).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
