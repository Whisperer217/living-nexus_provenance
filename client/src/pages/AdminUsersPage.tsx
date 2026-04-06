/**
 * /admin — Platform Admin Panel
 * Two tabs: User Roster (grant license) + Promo Code Manager (create/deactivate codes)
 * Visible only to users with role = admin.
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown,
  Users, Shield, Tag, Plus, CheckCircle2, XCircle,
  Gift, RotateCcw, Copy, CreditCard, ExternalLink, History, Video, Play, CheckCircle, Crown, UserX, AlertTriangle,
  Trash2, Database, Globe, Lock, ArrowRight,
} from "lucide-react";
import { getLoginUrl } from "@/const";

type SortKey = "name" | "createdAt" | "trackCount" | "widCount" | "licenseStatus";
type SortDir = "asc" | "desc";
type Tab = "users" | "codes" | "stripe" | "embed" | "works" | "config" | "logs" | "billing" | "founders" | "media" | "moderation" | "data_rights";

const GOLD = "oklch(0.84 0.155 85)";
const BG = "oklch(0.08 0.015 280)";
const CARD = "oklch(0.12 0.015 280)";
const BORDER = "oklch(0.2 0.02 280)";
const MUTED = "#64748B";
const TEXT = "#E2E8F0";
const SUBTEXT = "#94A3B8";
const GREEN = "oklch(0.65 0.18 145)";
const RED = "oklch(0.65 0.18 25)";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3" style={{ color: GOLD }} />
    : <ArrowDown className="w-3 h-3" style={{ color: GOLD }} />;
}

// ── User Roster Tab ────────────────────────────────────────────────────────────
function UsersTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [grantingId, setGrantingId] = useState<number | null>(null);
  const [grantSlots, setGrantSlots] = useState<Record<number, string>>({});

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const { data: usersData, isLoading } = trpc.admin.getUsers.useQuery({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }, { retry: false });
  const users = usersData?.users;
  const totalUsers = usersData?.total ?? 0;
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  const grantLicense = trpc.admin.grantLicense.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`License granted — User ID ${vars.userId} now has ${vars.slotsGranted} upload slots.`);
      setGrantingId(null);
      utils.admin.getUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    return users.filter((u: any) =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.artistHandle ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "createdAt") { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      else if (typeof av === "string") { av = av.toLowerCase(); bv = (bv ?? "").toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalTracks = users?.reduce((s: number, u: any) => s + u.trackCount, 0) ?? 0;
  const totalWids = users?.reduce((s: number, u: any) => s + u.widCount, 0) ?? 0;
  const licensed = users?.filter((u: any) => u.licenseStatus === "licensed").length ?? 0;

  const thStyle = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:opacity-80 transition-opacity";
  const tdStyle = "px-4 py-3 text-sm";

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users", value: totalUsers },
          { label: "Total Tracks", value: totalTracks },
          { label: "Total WIDs", value: totalWids },
          { label: "Licensed", value: licensed },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ background: CARD, borderColor: BORDER }}>
            <div className="text-2xl font-bold mb-1" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>{value}</div>
            <div className="text-xs uppercase tracking-wider" style={{ color: MUTED }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
        <Input
          placeholder="Search by name, handle, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
          style={{ background: CARD, borderColor: BORDER, color: TEXT }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
                <tr>
                  {([
                    { key: "name" as SortKey, label: "User" },
                    { key: "createdAt" as SortKey, label: "Joined" },
                    { key: "trackCount" as SortKey, label: "Tracks" },
                    { key: "widCount" as SortKey, label: "WIDs" },
                    { key: "licenseStatus" as SortKey, label: "License" },
                  ]).map(({ key, label }) => (
                    <th key={key} className={thStyle} style={{ color: SUBTEXT }} onClick={() => handleSort(key)}>
                      <div className="flex items-center gap-1">{label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} /></div>
                    </th>
                  ))}
                  <th className={thStyle} style={{ color: SUBTEXT }}>Slots</th>
                  <th className={thStyle} style={{ color: SUBTEXT }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: MUTED }}>
                      {search ? "No users match your search." : "No users yet."}
                    </td>
                  </tr>
                ) : sorted.map((u: any, i: number) => (
                  <tr key={u.id} style={{
                    background: i % 2 === 0 ? "oklch(0.10 0.015 280)" : "oklch(0.11 0.015 280)",
                    borderBottom: `1px solid oklch(0.16 0.02 280)`,
                  }}>
                    <td className={tdStyle}>
                      <div className="font-medium" style={{ color: TEXT }}>{u.artistHandle ? `@${u.artistHandle}` : u.name ?? "—"}</div>
                      {u.artistHandle && u.name && <div className="text-xs mt-0.5" style={{ color: MUTED }}>{u.name}</div>}
                      {u.email && <div className="text-xs mt-0.5" style={{ color: MUTED }}>{u.email}</div>}
                      <div className="text-xs mt-0.5 font-mono" style={{ color: "oklch(0.5 0.02 280)" }}>ID: {u.id}</div>
                    </td>
                    <td className={tdStyle} style={{ color: SUBTEXT }}>{formatDate(u.createdAt)}</td>
                    <td className={tdStyle}>
                      <span className="font-mono font-semibold" style={{ color: u.trackCount > 0 ? GOLD : MUTED }}>{u.trackCount}</span>
                    </td>
                    <td className={tdStyle}>
                      <span className="font-mono font-semibold" style={{ color: u.widCount > 0 ? "oklch(0.75 0.18 145)" : MUTED }}>{u.widCount}</span>
                    </td>
                    <td className={tdStyle}>
                      <Badge style={u.licenseStatus === "licensed"
                        ? { background: "oklch(0.75 0.18 145 / 0.2)", color: "oklch(0.75 0.18 145)", border: "1px solid oklch(0.75 0.18 145 / 0.3)" }
                        : { background: "oklch(0.3 0.02 280)", color: MUTED, border: `1px solid oklch(0.25 0.02 280)` }}>
                        {u.licenseStatus === "licensed" ? "Licensed" : "Free"}
                      </Badge>
                    </td>
                    <td className={tdStyle}>
                      <span className="text-xs font-mono" style={{ color: SUBTEXT }}>{u.songSlotsUsed}/{u.songSlotsTotal}</span>
                    </td>
                    <td className={tdStyle}>
                      {grantingId === u.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={10000}
                            value={grantSlots[u.id] ?? "100"}
                            onChange={e => setGrantSlots(prev => ({ ...prev, [u.id]: e.target.value }))}
                            className="w-20 h-7 text-xs"
                            style={{ background: "oklch(0.15 0.015 280)", borderColor: BORDER, color: TEXT }}
                          />
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2"
                            style={{ background: GOLD, color: BG }}
                            disabled={grantLicense.isPending}
                            onClick={() => grantLicense.mutate({ userId: u.id, slotsGranted: parseInt(grantSlots[u.id] ?? "100") || 100 })}
                          >
                            {grantLicense.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-1" onClick={() => setGrantingId(null)}>
                            <XCircle className="w-3 h-3" style={{ color: MUTED }} />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          style={{ borderColor: GOLD, color: GOLD }}
                          onClick={() => setGrantingId(u.id)}
                        >
                          <Gift className="w-3 h-3 mr-1" /> Grant
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sorted.length > 0 && (
            <div className="px-4 py-3 text-xs border-t flex items-center justify-between" style={{ color: MUTED, borderColor: BORDER, background: "oklch(0.10 0.015 280)" }}>
              <span>Showing {sorted.length} of {totalUsers} users (page {page + 1} of {totalPages || 1})</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="h-7 px-2 text-xs">Previous</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 px-2 text-xs">Next</Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Promo Codes Tab ────────────────────────────────────────────────────────────
function PromoCodesTab() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", slotsGranted: "100", maxUses: "", expiresAt: "" });

  const { data: codes, isLoading } = trpc.admin.listCodes.useQuery(undefined, { retry: false });

  const createCode = trpc.admin.createPromoCode.useMutation({
    onSuccess: () => {
      toast.success(`${form.code.toUpperCase()} is ready to share.`);
      setForm({ code: "", description: "", slotsGranted: "100", maxUses: "", expiresAt: "" });
      setShowForm(false);
      utils.admin.listCodes.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateCode = trpc.admin.deactivateCode.useMutation({
    onSuccess: () => { toast.success("Code deactivated."); utils.admin.listCodes.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const reactivateCode = trpc.admin.reactivateCode.useMutation({
    onSuccess: () => { toast.success("Code reactivated."); utils.admin.listCodes.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`${code} copied to clipboard.`);
  }

  return (
    <div>
      {/* Create Code Button */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: SUBTEXT }}>Create codes to grant free Creator Licenses to users.</p>
        <Button
          size="sm"
          style={{ background: GOLD, color: BG }}
          onClick={() => setShowForm(v => !v)}
        >
          <Plus className="w-4 h-4 mr-1" /> New Code
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-xl border p-5 mb-6" style={{ background: CARD, borderColor: BORDER }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>Create Promo Code</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs mb-1 block" style={{ color: SUBTEXT }}>Code * (e.g. BDDT-FREE)</label>
              <Input
                placeholder="BDDT-FREE"
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: SUBTEXT }}>Description (internal note)</label>
              <Input
                placeholder="e.g. Veterans access — March 2026"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: SUBTEXT }}>Upload Slots Granted *</label>
              <Input
                type="number"
                min={1}
                max={10000}
                placeholder="100"
                value={form.slotsGranted}
                onChange={e => setForm(p => ({ ...p, slotsGranted: e.target.value }))}
                style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: SUBTEXT }}>Max Uses (blank = unlimited)</label>
              <Input
                type="number"
                min={1}
                placeholder="Unlimited"
                value={form.maxUses}
                onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
                style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: SUBTEXT }}>Expires At (blank = never)</label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              style={{ background: GOLD, color: BG }}
              disabled={!form.code || createCode.isPending}
              onClick={() => createCode.mutate({
                code: form.code,
                description: form.description || undefined,
                slotsGranted: parseInt(form.slotsGranted) || 100,
                maxUses: form.maxUses ? parseInt(form.maxUses) : null,
                expiresAt: form.expiresAt || null,
              })}
            >
              {createCode.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Code
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} style={{ borderColor: BORDER, color: SUBTEXT }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Codes Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : !codes || codes.length === 0 ? (
        <div className="rounded-xl border p-12 text-center" style={{ borderColor: BORDER, background: CARD }}>
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: GOLD }} />
          <p className="text-sm" style={{ color: MUTED }}>No promo codes yet. Create one above.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
                <tr>
                  {["Code", "Description", "Slots", "Uses", "Expires", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: SUBTEXT }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((c: any, i: number) => (
                  <tr key={c.id} style={{
                    background: i % 2 === 0 ? "oklch(0.10 0.015 280)" : "oklch(0.11 0.015 280)",
                    borderBottom: `1px solid oklch(0.16 0.02 280)`,
                  }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm" style={{ color: GOLD }}>{c.code}</span>
                        <button onClick={() => copyCode(c.code)} className="opacity-50 hover:opacity-100 transition-opacity">
                          <Copy className="w-3 h-3" style={{ color: SUBTEXT }} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-[200px]" style={{ color: SUBTEXT }}>
                      {c.description ?? <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: TEXT }}>{c.slotsGranted}</td>
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: SUBTEXT }}>
                      {c.usedCount}{c.maxUses !== null ? `/${c.maxUses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: SUBTEXT }}>
                      {c.expiresAt ? formatDate(c.expiresAt) : <span style={{ color: MUTED }}>Never</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge style={c.isActive
                        ? { background: "oklch(0.75 0.18 145 / 0.2)", color: "oklch(0.75 0.18 145)", border: "1px solid oklch(0.75 0.18 145 / 0.3)" }
                        : { background: "oklch(0.3 0.02 280)", color: MUTED, border: `1px solid oklch(0.25 0.02 280)` }}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {c.isActive ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          style={{ borderColor: "oklch(0.65 0.18 25)", color: "oklch(0.65 0.18 25)" }}
                          disabled={deactivateCode.isPending}
                          onClick={() => deactivateCode.mutate({ id: c.id })}>
                          <XCircle className="w-3 h-3 mr-1" /> Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs"
                          style={{ borderColor: "oklch(0.75 0.18 145)", color: "oklch(0.75 0.18 145)" }}
                          disabled={reactivateCode.isPending}
                          onClick={() => reactivateCode.mutate({ id: c.id })}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stripe Onboarding Recovery Tab ───────────────────────────────────────────
function EmbedVideoTab() {
  const [progress, setProgress] = useState<{ total: number; done: number; failed: number; running: boolean; log: string[] }>({
    total: 0, done: 0, failed: 0, running: false, log: [],
  });

  const countQuery = trpc.admin.embedVideoStatus.useQuery(undefined, { retry: false });

  const preGenMutation = trpc.admin.preGenerateEmbedVideos.useMutation({
    onSuccess: (result: { queued: number; message: string }) => {
      setProgress(p => ({ ...p, running: false, total: result.queued, done: result.queued, log: [...p.log, result.message] }));
      toast.success(result.message);
      countQuery.refetch();
    },
    onError: (e: { message: string }) => {
      setProgress(p => ({ ...p, running: false, log: [...p.log, `Error: ${e.message}`] }));
      toast.error(e.message);
    },
    onMutate: () => {
      setProgress({ total: 0, done: 0, failed: 0, running: true, log: ["Starting background generation..."] });
    },
  });

  const stats = countQuery.data;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Published", value: stats?.total ?? "—", color: GOLD },
          { label: "Embed Ready", value: stats?.withEmbed ?? "—", color: "oklch(0.65 0.18 145)" },
          { label: "Pending Generation", value: stats?.pending ?? "—", color: "oklch(0.65 0.18 25)" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "'Orbitron', sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: SUBTEXT }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action card */}
      <div className="rounded-xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold mb-1" style={{ color: TEXT, fontFamily: "'Cinzel', serif" }}>Pre-Generate Embed Videos</h3>
            <p className="text-sm" style={{ color: SUBTEXT }}>Generates a 30-second MP4 (cover art + audio) for every published song that doesn't have one yet. Videos are cached on S3 and enable Discord's inline video player when links are shared.</p>
          </div>
          <Button
            onClick={() => preGenMutation.mutate()}
            disabled={progress.running || preGenMutation.isPending}
            style={{ background: GOLD, color: BG, flexShrink: 0 }}
          >
            {progress.running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {progress.running ? "Running..." : "Start Generation"}
          </Button>
        </div>

        {/* Progress log */}
        {progress.log.length > 0 && (
          <div className="rounded-lg p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto" style={{ background: "oklch(0.10 0.02 55)", border: `1px solid ${BORDER}` }}>
            {progress.log.map((line, i) => (
              <p key={i} style={{ color: line.startsWith("Error") ? "oklch(0.65 0.18 25)" : "oklch(0.65 0.18 145)" }}>
                {line.startsWith("Error") ? "✗" : "✓"} {line}
              </p>
            ))}
            {progress.running && (
              <p style={{ color: GOLD }} className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Background generation in progress — check back in a few minutes
              </p>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl p-4" style={{ background: "oklch(0.10 0.015 280)", border: `1px solid ${BORDER}` }}>
        <div className="flex items-start gap-3">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.65 0.18 145)" }} />
          <div className="text-xs space-y-1" style={{ color: SUBTEXT }}>
            <p>Generation runs in the background — the page doesn't need to stay open.</p>
            <p>Each video takes ~30–60 seconds to generate. For 38 tracks, expect ~20–30 minutes total.</p>
            <p>Once generated, Discord will show the inline video player on the second scrape (usually within minutes of sharing).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StripeRecoveryTab() {
  const [userId, setUserId] = useState("");
  const [returnUrl, setReturnUrl] = useState(window.location.origin + "/dashboard");
  const [result, setResult] = useState<{ onboardingUrl: string; stripeAccountId: string } | null>(null);

  const regenerate = trpc.admin.regenerateStripeOnboarding.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("Onboarding link generated successfully.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl">
      <div className="rounded-xl border p-6 mb-6" style={{ background: CARD, borderColor: BORDER }}>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5" style={{ color: GOLD }} />
          <h3 className="text-sm font-semibold" style={{ color: GOLD, fontFamily: "'Cinzel', serif" }}>Regenerate Stripe Onboarding Link</h3>
        </div>
        <p className="text-xs mb-5" style={{ color: SUBTEXT }}>
          Use this when a creator started Stripe KYC verification but never completed it.
          This generates a fresh onboarding link for their existing Stripe account.
          Share the link with the creator so they can complete verification.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: SUBTEXT }}>User ID</label>
            <Input
              placeholder="e.g. 180001"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="font-mono"
              style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: SUBTEXT }}>Return URL (after onboarding)</label>
            <Input
              value={returnUrl}
              onChange={e => setReturnUrl(e.target.value)}
              style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
            />
          </div>
          <Button
            disabled={!userId.trim() || regenerate.isPending}
            onClick={() => regenerate.mutate({ userId: parseInt(userId), returnUrl })}
            style={{ background: GOLD, color: BG }}
          >
            {regenerate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Generate Link
          </Button>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border p-6" style={{ background: "oklch(0.65 0.18 145 / 0.06)", borderColor: "oklch(0.65 0.18 145 / 0.35)" }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5" style={{ color: "oklch(0.65 0.18 145)" }} />
            <span className="text-sm font-semibold" style={{ color: "oklch(0.65 0.18 145)" }}>Link Ready</span>
          </div>
          <p className="text-xs mb-2" style={{ color: SUBTEXT }}>Stripe Account: <span className="font-mono" style={{ color: TEXT }}>{result.stripeAccountId}</span></p>
          <div className="flex items-center gap-2 mt-3">
            <Input
              readOnly
              value={result.onboardingUrl}
              className="font-mono text-xs flex-1"
              style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER, color: TEXT }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => { navigator.clipboard.writeText(result.onboardingUrl); toast.success("Link copied to clipboard"); }}
              style={{ borderColor: BORDER, color: SUBTEXT }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(result.onboardingUrl, "_blank")}
              style={{ background: GOLD, color: BG }}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs mt-3" style={{ color: "oklch(0.45 0.03 280)" }}>
            This link expires after one use or after ~24 hours. Regenerate if needed.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("users");

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: GOLD }} />
        <p className="mb-4" style={{ color: TEXT }}>Sign in required.</p>
        <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: GOLD, color: BG }}>Sign In</Button>
      </div>
    </div>
  );

  if (user?.role !== "admin") return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="text-center max-w-sm">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "oklch(0.65 0.18 25)" }} />
        <p className="text-lg font-semibold mb-2" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>Access Denied</p>
        <p className="text-sm mb-6" style={{ color: SUBTEXT }}>This page is restricted to platform administrators.</p>
        <Button variant="outline" onClick={() => navigate("/")} style={{ borderColor: GOLD, color: GOLD }}>Back to Home</Button>
      </div>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "users", label: "User Roster", icon: <Users className="w-4 h-4" /> },
    { id: "codes", label: "Promo Codes", icon: <Tag className="w-4 h-4" /> },
    { id: "works", label: "Works / WIDs", icon: <Shield className="w-4 h-4" /> },
    { id: "config", label: "System Control", icon: <CheckCircle className="w-4 h-4" /> },
    { id: "billing", label: "Billing Reset", icon: <CreditCard className="w-4 h-4" /> },
    { id: "stripe", label: "Stripe Recovery", icon: <RotateCcw className="w-4 h-4" /> },
    { id: "embed", label: "Embed Videos", icon: <Video className="w-4 h-4" /> },
    { id: "logs", label: "Audit Log", icon: <History className="w-4 h-4" /> },
    { id: "founders", label: "Founder Control", icon: <Crown className="w-4 h-4" /> },
    { id: "media", label: "Media Generation", icon: <Video className="w-4 h-4" /> },
    { id: "moderation", label: "Covenant Moderation", icon: <Shield className="w-4 h-4" style={{ color: "oklch(0.65 0.18 30)" }} /> },
    { id: "data_rights", label: "Data Rights", icon: <Database className="w-4 h-4" style={{ color: "oklch(0.65 0.18 200)" }} /> },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="container py-10 max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-6 h-6" style={{ color: GOLD }} />
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
                LN Command Center
              </h1>
            </div>
            <p className="text-sm" style={{ color: SUBTEXT }}>Full platform governance — users, works, billing, system config, and audit trail.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}
            style={{ borderColor: BORDER, color: SUBTEXT }}>
            ← Back
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab === t.id
                ? { background: GOLD, color: BG }
                : { color: SUBTEXT, background: "transparent" }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "users" && <UsersTab />}
        {tab === "codes" && <PromoCodesTab />}
        {tab === "works" && <WorksModerationTab />}
        {tab === "config" && <SystemConfigTab />}
        {tab === "billing" && <BillingResetTab />}
        {tab === "stripe" && <StripeRecoveryTab />}
        {tab === "embed" && <EmbedVideoTab />}
        {tab === "logs" && <AuditLogTab />}
        {tab === "founders" && <FounderControlTab />}
        {tab === "media" && <MediaGenerationTab />}
        {tab === "moderation" && <ModerationQueueEmbed />}
        {tab === "data_rights" && <DataRightsTab />}
      </div>
    </div>
  );
}
// ── Works / WIDs Moderation Tab ───────────────────────────────────────────────
function WorksModerationTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"" | "clear" | "flagged" | "removed">("");
  const [flagReason, setFlagReason] = useState<Record<number, string>>({});
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const { data: works, isLoading } = trpc.admin.searchWorks.useQuery(
    { query: search || undefined, moderationStatus: filter || undefined, limit: 50 },
    { retry: false }
  );

  const flagWork = trpc.admin.flagWork.useMutation({
    onSuccess: () => { toast.success("Work flagged"); utils.admin.searchWorks.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const unflagWork = trpc.admin.unflagWork.useMutation({
    onSuccess: () => { toast.success("Flag cleared"); utils.admin.searchWorks.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const removeWork = trpc.admin.removeWork.useMutation({
    onSuccess: () => { toast.success("Work removed (WID preserved)"); setConfirmRemove(null); utils.admin.searchWorks.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const restoreWork = trpc.admin.restoreWork.useMutation({
    onSuccess: () => { toast.success("Work restored"); utils.admin.searchWorks.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, WID, or creator…"
            className="pl-9" style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as any)}
          className="px-3 py-2 rounded-md text-sm" style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="">All</option>
          <option value="clear">Clear</option>
          <option value="flagged">Flagged</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} /></div>}

      <div className="space-y-2">
        {(works ?? []).map((w: any) => (
          <div key={w.id} className="rounded-xl p-4 flex gap-4 items-start" style={{ background: CARD, border: `1px solid ${w.isFlagged ? "oklch(0.65 0.18 45)" : w.moderationStatus === "removed" ? "oklch(0.55 0.2 25)" : BORDER}` }}>
            {w.coverArtUrl && <img src={w.coverArtUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm" style={{ color: TEXT }}>{w.title}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: "oklch(0.15 0.04 85)", color: GOLD }}>{w.witnessId ?? "—"}</span>
                {w.isFlagged && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "oklch(0.2 0.05 45)", color: "oklch(0.75 0.15 45)" }}>FLAGGED</span>}
                {w.moderationStatus === "removed" && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "oklch(0.18 0.05 25)", color: "oklch(0.7 0.18 25)" }}>REMOVED</span>}
              </div>
              <div className="text-xs mt-1" style={{ color: SUBTEXT }}>
                {w.contentType?.toUpperCase()} · {w.status} · {w.playCount ?? 0} plays
                {w.flagReason && <span className="ml-2" style={{ color: "oklch(0.75 0.15 45)" }}>Reason: {w.flagReason}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              {!w.isFlagged && w.moderationStatus !== "removed" && (
                <div className="flex gap-1">
                  <Input value={flagReason[w.id] ?? ""} onChange={e => setFlagReason(r => ({ ...r, [w.id]: e.target.value }))}
                    placeholder="Flag reason…" className="w-32 h-7 text-xs" style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    style={{ borderColor: "oklch(0.65 0.18 45)", color: "oklch(0.75 0.15 45)" }}
                    disabled={!flagReason[w.id]}
                    onClick={() => flagWork.mutate({ songId: w.id, reason: flagReason[w.id] })}>
                    Flag
                  </Button>
                </div>
              )}
              {w.isFlagged && (
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  style={{ borderColor: BORDER, color: SUBTEXT }}
                  onClick={() => unflagWork.mutate({ songId: w.id })}>
                  Clear Flag
                </Button>
              )}
              {w.moderationStatus !== "removed" ? (
                confirmRemove === w.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs" style={{ background: "oklch(0.55 0.2 25)", color: "#fff" }}
                      onClick={() => removeWork.mutate({ songId: w.id })}>Confirm Remove</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" style={{ borderColor: BORDER, color: SUBTEXT }}
                      onClick={() => setConfirmRemove(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    style={{ borderColor: "oklch(0.55 0.2 25)", color: "oklch(0.7 0.18 25)" }}
                    onClick={() => setConfirmRemove(w.id)}>
                    Remove
                  </Button>
                )
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  style={{ borderColor: BORDER, color: SUBTEXT }}
                  onClick={() => restoreWork.mutate({ songId: w.id })}>
                  Restore
                </Button>
              )}
            </div>
          </div>
        ))}
        {!isLoading && (works ?? []).length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: SUBTEXT }}>No works found.</p>
        )}
      </div>
    </div>
  );
}

// ── System Config Tab ──────────────────────────────────────────────────────────
function SystemConfigTab() {
  const utils = trpc.useUtils();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: configs, isLoading } = trpc.admin.getSystemConfig.useQuery(undefined, { retry: false });

  const setConfig = trpc.admin.setSystemConfig.useMutation({
    onSuccess: () => { toast.success("Config updated"); utils.admin.getSystemConfig.invalidate(); setEditKey(null); setNewKey(""); setNewValue(""); setNewDesc(""); },
    onError: (e) => toast.error(e.message),
  });

  const DEFAULT_FLAGS = [
    { key: "feature.manuscript_upload", value: "true", description: "Enable manuscript upload flow" },
    { key: "feature.comic_upload", value: "true", description: "Enable comic/novel upload flow" },
    { key: "feature.ai_transforms", value: "true", description: "Enable AI transform feature" },
    { key: "feature.jukebox", value: "true", description: "Enable Jukebox mode" },
    { key: "feature.tips", value: "true", description: "Enable tip/gift payments" },
    { key: "platform.maintenance_mode", value: "false", description: "Put platform in maintenance mode" },
    { key: "platform.registration_open", value: "true", description: "Allow new user registrations" },
  ];

  return (
    <div className="space-y-6">
      {/* Quick-seed default flags */}
      <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <p className="text-xs font-semibold mb-3" style={{ color: GOLD }}>QUICK SEED DEFAULT FLAGS</p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_FLAGS.map(f => (
            <Button key={f.key} size="sm" variant="outline" className="text-xs h-7"
              style={{ borderColor: BORDER, color: SUBTEXT }}
              onClick={() => setConfig.mutate({ key: f.key, value: f.value, description: f.description })}>
              + {f.key}
            </Button>
          ))}
        </div>
      </div>

      {/* Add new config */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <p className="text-xs font-semibold" style={{ color: GOLD }}>ADD / UPDATE CONFIG KEY</p>
        <div className="flex gap-2 flex-wrap">
          <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="config.key"
            className="flex-1 min-w-[160px]" style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
          <Input value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="value"
            className="w-32" style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
          <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="description (optional)"
            className="flex-1 min-w-[160px]" style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
          <Button size="sm" disabled={!newKey || !newValue} style={{ background: GOLD, color: BG }}
            onClick={() => setConfig.mutate({ key: newKey, value: newValue, description: newDesc || undefined })}>
            Save
          </Button>
        </div>
      </div>

      {/* Existing configs */}
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} /></div>}
      <div className="space-y-2">
        {(configs ?? []).map((c: any) => (
          <div key={c.key} className="rounded-xl p-4 flex items-center gap-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm" style={{ color: GOLD }}>{c.key}</div>
              {c.description && <div className="text-xs mt-0.5" style={{ color: SUBTEXT }}>{c.description}</div>}
            </div>
            {editKey === c.key ? (
              <div className="flex gap-2">
                <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="w-32 h-7 text-xs"
                  style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
                <Button size="sm" className="h-7 text-xs" style={{ background: GOLD, color: BG }}
                  onClick={() => setConfig.mutate({ key: c.key, value: editValue, description: editDesc || c.description })}>Save</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" style={{ borderColor: BORDER, color: SUBTEXT }}
                  onClick={() => setEditKey(null)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm px-3 py-1 rounded" style={{ background: BG, color: c.value === "true" ? "var(--lnx-green)" : c.value === "false" ? "var(--lnx-red)" : TEXT }}>{c.value}</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" style={{ borderColor: BORDER, color: SUBTEXT }}
                  onClick={() => { setEditKey(c.key); setEditValue(c.value); setEditDesc(c.description ?? ""); }}>Edit</Button>
              </div>
            )}
          </div>
        ))}
        {!isLoading && (configs ?? []).length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: SUBTEXT }}>No config keys yet. Seed defaults above.</p>
        )}
      </div>
    </div>
  );
}

// ── Billing Reset Tab ──────────────────────────────────────────────────────────
function BillingResetTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [confirmReset, setConfirmReset] = useState<number | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [founderSearch, setFounderSearch] = useState("");
  const [confirmFounder, setConfirmFounder] = useState<number | null>(null);

  const { data: usersData, isLoading } = trpc.admin.getAllUsers.useQuery({ limit: 100 }, { retry: false });
  const users = usersData?.users ?? [];

  const resetBilling = trpc.admin.resetBilling.useMutation({
    onSuccess: () => { toast.success("Billing reset — Stripe subscription cancelled and local IDs cleared"); setConfirmReset(null); setResetReason(""); utils.admin.getAllUsers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = users.filter((u: any) => {
    const q = search.toLowerCase();
    return (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const grantFounderFree = trpc.livingArchive.grantFounderFree.useMutation({
    onSuccess: (data) => { toast.success(data.message); setConfirmFounder(null); utils.admin.getAllUsers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const { data: founderUsersData } = trpc.admin.getAllUsers.useQuery({ limit: 200 }, { retry: false });
  const founderUsers = founderUsersData?.users ?? [];
  const filteredFounder = founderUsers.filter((u: any) => {
    const q = founderSearch.toLowerCase();
    return (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">

      {/* ── Founder Free Tier Grant ── */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "oklch(0.12 0.03 85 / 0.4)", border: "1px solid oklch(0.4 0.1 85 / 0.4)" }}>
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: GOLD }}>👑 Grant Founder Free Tier</p>
          <p className="text-xs" style={{ color: SUBTEXT }}>Grants 100 permanent archive slots and Living Archive access at no charge. Use for founders, partners, and platform contributors. Logged to audit trail.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
          <Input value={founderSearch} onChange={e => setFounderSearch(e.target.value)} placeholder="Search users to grant…"
            className="pl-9" style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        {founderSearch.length > 1 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredFounder.slice(0, 10).map((u: any) => (
              <div key={u.id} className="rounded-lg p-3 flex items-center justify-between" style={{ background: BG, border: `1px solid ${BORDER}` }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: TEXT }}>{u.name ?? "—"}</div>
                  <div className="text-xs" style={{ color: SUBTEXT }}>{u.email ?? "no email"} · ID: {u.id}</div>
                  {(u as any).livingArchivePlan && (
                    <div className="text-xs mt-0.5" style={{ color: GOLD }}>Plan: {(u as any).livingArchivePlan}</div>
                  )}
                </div>
                {confirmFounder === u.id ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" style={{ background: GOLD, color: "oklch(0.08 0.015 280)" }}
                      onClick={() => grantFounderFree.mutate({ userId: u.id })}>
                      Confirm Grant
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" style={{ color: SUBTEXT }}
                      onClick={() => setConfirmFounder(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "oklch(0.22 0.04 85)", border: `1px solid ${GOLD}`, color: GOLD }}
                    onClick={() => setConfirmFounder(u.id)}>
                    <Gift className="w-3 h-3" /> Grant Free Tier
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4" style={{ background: "oklch(0.12 0.03 25)", border: "1px solid oklch(0.3 0.1 25)" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.75 0.15 25)" }}>⚠ Destructive Action</p>
        <p className="text-xs" style={{ color: SUBTEXT }}>Billing reset cancels the user's active Stripe subscription and clears their local Stripe customer/subscription IDs. The WID registry is never modified. Use only for refunds, fraud, or test account cleanup.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
          className="pl-9" style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>

      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} /></div>}

      <div className="space-y-2">
        {filtered.map((u: any) => (
          <div key={u.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: TEXT }}>{u.name ?? "—"}</div>
              <div className="text-xs" style={{ color: SUBTEXT }}>ID: {u.id} · {u.email ?? "no email"}</div>
              {(u as any).stripeCustomerId && (
                <div className="text-xs font-mono mt-0.5" style={{ color: MUTED }}>Stripe: {(u as any).stripeCustomerId}</div>
              )}
            </div>
            {confirmReset === u.id ? (
              <div className="flex gap-2 flex-wrap">
                <Input value={resetReason} onChange={e => setResetReason(e.target.value)} placeholder="Reason (optional)"
                  className="w-40 h-7 text-xs" style={{ background: BG, border: `1px solid ${BORDER}`, color: TEXT }} />
                <Button size="sm" className="h-7 text-xs" style={{ background: "oklch(0.55 0.2 25)", color: "#fff" }}
                  onClick={() => resetBilling.mutate({ userId: u.id, reason: resetReason || undefined })}>
                  Confirm Reset
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" style={{ borderColor: BORDER, color: SUBTEXT }}
                  onClick={() => setConfirmReset(null)}>Cancel</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs"
                style={{ borderColor: "oklch(0.55 0.2 25)", color: "oklch(0.7 0.18 25)" }}
                onClick={() => setConfirmReset(u.id)}>
                Reset Billing
              </Button>
            )}
          </div>
        ))}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center py-10 text-sm" style={{ color: SUBTEXT }}>No users found.</p>
        )}
      </div>
    </div>
  );
}

// ── Audit Log Tab ──────────────────────────────────────────────────────────────
function AuditLogTab() {
  const { data: logs, isLoading } = trpc.admin.getLogs.useQuery({ limit: 200 }, { retry: false });

  const ACTION_COLOR: Record<string, string> = {
    flag_work: "oklch(0.75 0.15 45)",
    unflag_work: "oklch(0.65 0.15 145)",
    remove_work: "oklch(0.7 0.18 25)",
    restore_work: "oklch(0.65 0.15 145)",
    set_system_config: GOLD,
    reset_billing: "oklch(0.7 0.18 25)",
    set_user_role: GOLD,
    grant_license: "oklch(0.65 0.15 145)",
    deactivate_code: "oklch(0.75 0.15 45)",
    reactivate_code: "oklch(0.65 0.15 145)",
  };

  return (
    <div className="space-y-2">
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} /></div>}
      {(logs ?? []).map((log: any) => (
        <div key={log.id} className="rounded-xl px-4 py-3 flex items-start gap-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: ACTION_COLOR[log.action] ?? MUTED }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold" style={{ color: ACTION_COLOR[log.action] ?? TEXT }}>{log.action}</span>
              <span className="text-xs" style={{ color: SUBTEXT }}>by {log.adminName ?? `Admin #${log.adminId}`}</span>
              {log.targetType && <span className="text-xs" style={{ color: MUTED }}>{log.targetType}:{log.targetId}</span>}
            </div>
            {log.details && Object.keys(log.details).length > 0 && (
              <div className="text-xs font-mono mt-0.5 truncate" style={{ color: MUTED }}>
                {JSON.stringify(log.details)}
              </div>
            )}
          </div>
          <div className="text-xs shrink-0" style={{ color: MUTED }}>
            {new Date(log.createdAt).toLocaleString()}
          </div>
        </div>
      ))}
      {!isLoading && (logs ?? []).length === 0 && (
        <p className="text-center py-10 text-sm" style={{ color: SUBTEXT }}>No admin actions logged yet.</p>
      )}
    </div>
  );
}

// ── Founder Control Tab ───────────────────────────────────────────────────────
function FounderControlTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");

  const { data: foundersData, isLoading: loadingFounders } = trpc.admin.getFounders.useQuery(undefined, { retry: false });
  const { data: searchResults, isLoading: loadingSearch } = trpc.admin.searchUsersForFounder.useQuery(
    { query: search },
    { retry: false }
  );

  const grantFounder = trpc.admin.grantFounderRole.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Founder status granted — User ID ${vars.userId}`);
      utils.admin.getFounders.invalidate();
      utils.admin.searchUsersForFounder.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeFounder = trpc.admin.revokeFounderRole.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`Founder status revoked — User ID ${vars.userId}`);
      utils.admin.getFounders.invalidate();
      utils.admin.searchUsersForFounder.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const founderIds = new Set((foundersData?.founders ?? []).map((f: any) => f.id));
  const count = foundersData?.count ?? 0;
  const max = foundersData?.max ?? 10;
  const slotsLeft = max - count;

  return (
    <div className="space-y-8">
      {/* Header + Capacity */}
      <div className="rounded-xl p-6 border" style={{ background: CARD, borderColor: BORDER }}>
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-6 h-6" style={{ color: GOLD }} />
          <h2 className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
            Founder Control
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: SUBTEXT }}>
          Founders have <strong style={{ color: GOLD }}>infinite upload slots</strong> and are exempt from all slot enforcement.
          Maximum <strong style={{ color: GOLD }}>10 founders</strong> allowed on the platform at any time.
        </p>

        {/* Capacity bar */}
        <div className="mb-2 flex items-center justify-between text-xs" style={{ color: SUBTEXT }}>
          <span>Founder Seats Filled</span>
          <span style={{ color: slotsLeft === 0 ? "oklch(0.65 0.18 25)" : GOLD }}>{count} / {max}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 280)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(count / max) * 100}%`,
              background: slotsLeft === 0 ? "oklch(0.65 0.18 25)" : GOLD,
            }}
          />
        </div>
        {slotsLeft === 0 && (
          <p className="text-xs mt-2" style={{ color: "oklch(0.65 0.18 25)" }}>
            All founder seats are filled. Revoke a founder before granting a new one.
          </p>
        )}
      </div>

      {/* Current Founders */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: SUBTEXT }}>
          Current Founders ({count})
        </h3>
        {loadingFounders ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : (foundersData?.founders ?? []).length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={{ borderColor: BORDER }}>
            <Crown className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: GOLD }} />
            <p className="text-sm" style={{ color: SUBTEXT }}>No founders yet. Grant founder status below.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(foundersData?.founders ?? []).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between gap-4 rounded-xl p-4 border"
                style={{ background: "oklch(0.10 0.015 280)", borderColor: "oklch(0.25 0.12 85 / 0.4)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  {f.profilePhotoUrl ? (
                    <img src={f.profilePhotoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "oklch(0.25 0.12 85 / 0.3)" }}>
                      <Crown className="w-4 h-4" style={{ color: GOLD }} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate" style={{ color: TEXT }}>{f.name ?? "—"}</div>
                    {f.email && <div className="text-xs truncate" style={{ color: MUTED }}>{f.email}</div>}
                    <div className="text-xs font-mono" style={{ color: "oklch(0.5 0.02 280)" }}>
                      ID: {f.id} · {f.songSlotsUsed ?? 0} works uploaded
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 flex items-center gap-1.5 text-xs"
                  style={{ borderColor: "oklch(0.65 0.18 25 / 0.5)", color: "oklch(0.65 0.18 25)" }}
                  disabled={revokeFounder.isPending}
                  onClick={() => revokeFounder.mutate({ userId: f.id })}
                >
                  {revokeFounder.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grant Founder — Search */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: SUBTEXT }}>
          Grant Founder Status
        </h3>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
          <Input
            placeholder="Search users by name, handle, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            style={{ background: CARD, borderColor: BORDER, color: TEXT }}
          />
        </div>
        {loadingSearch ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : (
          <div className="space-y-2">
            {(searchResults ?? []).map((u: any) => {
              const isFounder = founderIds.has(u.id);
              return (
                <div key={u.id} className="flex items-center justify-between gap-4 rounded-xl p-4 border"
                  style={{ background: CARD, borderColor: isFounder ? "oklch(0.25 0.12 85 / 0.4)" : BORDER }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {u.profilePhotoUrl ? (
                      <img src={u.profilePhotoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "oklch(0.2 0.02 280)" }}>
                        <Users className="w-4 h-4" style={{ color: MUTED }} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: TEXT }}>
                          {u.artistHandle ? `@${u.artistHandle}` : u.name ?? "—"}
                        </span>
                        {isFounder && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: "oklch(0.25 0.12 85 / 0.3)", color: GOLD }}>
                            Founder
                          </span>
                        )}
                        {u.role === "admin" && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: "oklch(0.25 0.18 25 / 0.3)", color: "oklch(0.65 0.18 25)" }}>
                            Admin
                          </span>
                        )}
                      </div>
                      {u.email && <div className="text-xs truncate" style={{ color: MUTED }}>{u.email}</div>}
                      <div className="text-xs font-mono" style={{ color: "oklch(0.5 0.02 280)" }}>
                        ID: {u.id} · {u.songSlotsUsed ?? 0}/{u.songSlotsTotal ?? 1} slots used
                      </div>
                    </div>
                  </div>
                  {isFounder ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 flex items-center gap-1.5 text-xs"
                      style={{ borderColor: "oklch(0.65 0.18 25 / 0.5)", color: "oklch(0.65 0.18 25)" }}
                      disabled={revokeFounder.isPending}
                      onClick={() => revokeFounder.mutate({ userId: u.id })}
                    >
                      {revokeFounder.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                      Revoke
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="shrink-0 flex items-center gap-1.5 text-xs"
                      style={{ background: GOLD, color: BG }}
                      disabled={grantFounder.isPending || slotsLeft === 0 || u.role === "admin"}
                      onClick={() => grantFounder.mutate({ userId: u.id })}
                    >
                      {grantFounder.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                      Grant
                    </Button>
                  )}
                </div>
              );
            })}
            {(searchResults ?? []).length === 0 && search.trim().length > 0 && (
              <p className="text-sm text-center py-6" style={{ color: SUBTEXT }}>No users found for "{search}"</p>
            )}
            {(searchResults ?? []).length === 0 && search.trim().length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: SUBTEXT }}>Type a name, handle, or email to search users.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media Generation Tab ──────────────────────────────────────────────────────
function MediaGenerationTab() {
  const [enqueueId, setEnqueueId] = useState("");
  const FOUNDER_GOLD = "oklch(0.84 0.155 85)";
  const GREEN = "oklch(0.65 0.18 145)";
  const RED = "oklch(0.65 0.18 25)";
  const YELLOW = "oklch(0.78 0.14 85)";
  const BLUE = "oklch(0.65 0.18 230)";

  // Live pipeline stats — auto-refresh every 10s
  const statsQuery = trpc.admin.visualPipelineStats.useQuery(undefined, {
    retry: false,
    refetchInterval: 10_000,
  });
  const stats = statsQuery.data;

  // Recent queue jobs — auto-refresh every 10s
  const jobsQuery = trpc.admin.visualQueueJobs.useQuery({ limit: 50 }, {
    retry: false,
    refetchInterval: 10_000,
  });
  const jobs = jobsQuery.data ?? [];

  // Requeue failed jobs
  const requeueMutation = trpc.admin.requeueFailedVisuals.useMutation({
    onSuccess: (r) => {
      toast.success(`Requeued ${r.requeued} failed job(s)`);
      statsQuery.refetch();
      jobsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // Enqueue specific song
  const enqueueMutation = trpc.admin.enqueueVisualForSong.useMutation({
    onSuccess: () => {
      toast.success("Song enqueued for visual generation");
      setEnqueueId("");
      jobsQuery.refetch();
      statsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const completionPct = stats && stats.totalPublished > 0
    ? Math.round((stats.visualReady / stats.totalPublished) * 100)
    : 0;

  const statusColor = (s: string) => {
    if (s === "complete") return GREEN;
    if (s === "failed") return RED;
    if (s === "processing") return BLUE;
    return YELLOW;
  };
  const statusIcon = (s: string) => {
    if (s === "complete") return "✓";
    if (s === "failed") return "✗";
    if (s === "processing") return "⟳";
    return "·";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "'Cinzel', serif" }}>
            Visual Pipeline
          </h2>
          <p className="text-xs mt-0.5" style={{ color: SUBTEXT }}>
            Automatic visual generation — every work gets a looping MP4. Auto-refreshes every 10s.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { statsQuery.refetch(); jobsQuery.refetch(); }}
          style={{ borderColor: BORDER, color: SUBTEXT }}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Published", value: stats?.totalPublished ?? "—", color: TEXT },
          { label: "Visual Ready", value: stats?.visualReady ?? "—", color: GREEN },
          { label: "Pending", value: stats?.pending ?? "—", color: YELLOW },
          { label: "Processing", value: stats?.processing ?? "—", color: BLUE },
          { label: "Complete", value: stats?.complete ?? "—", color: GREEN },
          { label: "Failed", value: stats?.failed ?? "—", color: RED },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Orbitron', sans-serif" }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: SUBTEXT }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Completion progress bar */}
      {stats && (
        <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: TEXT }}>Pipeline Completion</span>
            <span className="text-xs font-bold" style={{ color: completionPct === 100 ? GREEN : FOUNDER_GOLD }}>
              {completionPct}%
            </span>
          </div>
          <div className="w-full rounded-full h-2" style={{ background: "oklch(0.15 0.015 280)" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${completionPct}%`,
                background: completionPct === 100
                  ? GREEN
                  : `linear-gradient(90deg, ${FOUNDER_GOLD}, ${GREEN})`,
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: SUBTEXT }}>
            {stats.visualReady} of {stats.totalPublished} published works have visuals.
            {stats.pending > 0 && ` ${stats.pending} job(s) queued.`}
            {stats.processing > 0 && ` ${stats.processing} currently processing.`}
          </p>
        </div>
      )}

      {/* Actions row */}
      <div className="flex flex-wrap gap-3 items-start">
        {/* Requeue failed */}
        <div className="rounded-xl p-4 flex-1 min-w-[220px]" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-semibold mb-1" style={{ color: TEXT }}>Requeue Failed Jobs</p>
          <p className="text-xs mb-3" style={{ color: SUBTEXT }}>
            Reset all failed jobs back to pending so the worker retries them automatically.
          </p>
          <Button
            size="sm"
            onClick={() => requeueMutation.mutate()}
            disabled={requeueMutation.isPending || (stats?.failed ?? 0) === 0}
            style={{ background: RED, color: "#fff" }}
          >
            {requeueMutation.isPending
              ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              : <RotateCcw className="w-3 h-3 mr-1" />}
            Retry Failed ({stats?.failed ?? 0})
          </Button>
        </div>

        {/* Enqueue specific song */}
        <div className="rounded-xl p-4 flex-1 min-w-[220px]" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs font-semibold mb-1" style={{ color: TEXT }}>Enqueue Song by ID</p>
          <p className="text-xs mb-3" style={{ color: SUBTEXT }}>
            Force-enqueue a specific song for visual generation with founder priority.
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Song ID"
              value={enqueueId}
              onChange={e => setEnqueueId(e.target.value)}
              className="h-8 text-xs w-28"
              style={{ background: "oklch(0.15 0.015 280)", borderColor: BORDER, color: TEXT }}
            />
            <Button
              size="sm"
              onClick={() => enqueueMutation.mutate({ songId: parseInt(enqueueId) })}
              disabled={!enqueueId || enqueueMutation.isPending}
              style={{ background: FOUNDER_GOLD, color: BG }}
            >
              {enqueueMutation.isPending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Play className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Live job queue table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "oklch(0.10 0.015 280)" }}>
          <span className="text-xs font-semibold" style={{ color: TEXT }}>Recent Queue Jobs</span>
          <span className="text-xs" style={{ color: SUBTEXT }}>{jobs.length} shown · live</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "oklch(0.09 0.01 280)", borderBottom: `1px solid ${BORDER}` }}>
                {["Job ID", "Song ID", "Title", "Status", "Priority", "Attempts", "Queued", "Completed"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: SUBTEXT }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center" style={{ color: SUBTEXT }}>
                    No queue jobs found.
                  </td>
                </tr>
              ) : jobs.map((job, i) => (
                <tr
                  key={job.id}
                  style={{
                    background: i % 2 === 0 ? CARD : "oklch(0.10 0.012 280)",
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <td className="px-3 py-2 font-mono" style={{ color: SUBTEXT }}>{job.id}</td>
                  <td className="px-3 py-2 font-mono" style={{ color: SUBTEXT }}>{job.songId}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: TEXT }}>{job.songTitle ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono"
                      style={{ color: statusColor(job.status), background: `${statusColor(job.status)}18` }}
                    >
                      {statusIcon(job.status)} {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: job.priority > 0 ? FOUNDER_GOLD : SUBTEXT }}>
                    {job.priority > 0 ? <Crown className="w-3 h-3 inline" /> : "—"}
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: job.attempts > 1 ? RED : SUBTEXT }}>{job.attempts}</td>
                  <td className="px-3 py-2" style={{ color: SUBTEXT }}>{formatDate(job.enqueuedAt)}</td>
                  <td className="px-3 py-2" style={{ color: SUBTEXT }}>{job.completedAt ? formatDate(job.completedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jobs.some(j => j.errorMessage) && (
          <div className="px-4 py-3 space-y-1" style={{ background: "oklch(0.09 0.01 280)", borderTop: `1px solid ${BORDER}` }}>
            <p className="text-xs font-semibold mb-1" style={{ color: RED }}>Error Details</p>
            {jobs.filter(j => j.errorMessage).map(j => (
              <p key={j.id} className="text-xs font-mono" style={{ color: RED }}>
                Job {j.id} (song {j.songId}): {j.errorMessage}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="rounded-xl p-4" style={{ background: "oklch(0.10 0.015 280)", border: `1px solid ${BORDER}` }}>
        <div className="flex items-start gap-3">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GREEN }} />
          <div className="text-xs space-y-1" style={{ color: SUBTEXT }}>
            <p>The visual worker runs every 15 seconds, processing 2 jobs per tick (non-blocking).</p>
            <p>Jobs are automatically enqueued on song creation, batch upload, and publish events.</p>
            <p>Founder works are always processed first (priority = 10 vs 0 for standard).</p>
            <p>A work is marked <strong style={{ color: GREEN }}>visualReady</strong> once its MP4 is stored on S3 and linked to the work record.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Covenant Moderation Tab (embedded) ───────────────────────────────────────
function ModerationQueueEmbed() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed_ok" | "removed_violation" | "escalated" | "all">("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<number, string>>({});

  const { data: flags = [], refetch } = trpc.moderation.listFlags.useQuery({ status: statusFilter });
  const { data: stats = [] } = trpc.moderation.stats.useQuery();

  const resolveMutation = trpc.moderation.resolveFlag.useMutation({
    onSuccess: (_, vars) => {
      const action = vars.resolution === "reviewed_ok" ? "Cleared" : vars.resolution === "removed_violation" ? "Removed" : "Escalated";
      toast.success(`${action} — flag resolved.`);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const statMap = Object.fromEntries(stats.map((s: { status: string; total: number }) => [s.status, s.total]));

  const REASON_LABELS: Record<string, string> = {
    dehumanization: "Dehumanization",
    csam: "Child Exploitation",
    facilitates_harm: "Facilitates Harm",
    harassment: "Harassment",
    spam: "Spam",
    other: "Other",
  };

  const REASON_SEVERITY: Record<string, string> = {
    csam: "critical",
    dehumanization: "critical",
    facilitates_harm: "high",
    harassment: "medium",
    spam: "low",
    other: "medium",
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Pending", key: "pending", color: "oklch(0.85 0.18 85)" },
          { label: "Cleared", key: "reviewed_ok", color: GREEN },
          { label: "Removed", key: "removed_violation", color: RED },
          { label: "Escalated", key: "escalated", color: "oklch(0.75 0.18 50)" },
        ].map(({ label, key, color }) => (
          <div key={key} className="rounded-xl p-4 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="text-2xl font-bold" style={{ color }}>{statMap[key] ?? 0}</div>
            <div className="text-xs mt-1" style={{ color: SUBTEXT }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase tracking-wider" style={{ color: SUBTEXT }}>Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="text-sm rounded-lg px-3 py-1.5 border"
          style={{ background: CARD, borderColor: BORDER, color: "oklch(0.92 0.02 85)" }}
        >
          <option value="pending">Pending Review</option>
          <option value="reviewed_ok">Cleared</option>
          <option value="removed_violation">Removed</option>
          <option value="escalated">Escalated</option>
          <option value="all">All Flags</option>
        </select>
        <span className="text-xs" style={{ color: SUBTEXT }}>{flags.length} result{flags.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Flag list */}
      {flags.length === 0 ? (
        <div className="text-center py-12" style={{ color: SUBTEXT }}>
          <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: GREEN }} />
          <p className="text-sm">No flags in this queue</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag: {
            id: number;
            workId: number;
            workType: string;
            workTitle: string | null;
            reporterId: number;
            reporterName: string;
            reason: string;
            details: string | null;
            status: string;
            adminNote: string | null;
            createdAt: Date;
            resolvedAt: Date | null;
          }) => {
            const severity = REASON_SEVERITY[flag.reason] ?? "medium";
            const isExpanded = expandedId === flag.id;
            return (
              <div key={flag.id} className="rounded-xl overflow-hidden" style={{ background: CARD, border: `1px solid ${severity === "critical" ? "oklch(0.45 0.18 25)" : BORDER}` }}>
                <button className="w-full text-left p-4 flex items-center gap-4" onClick={() => setExpandedId(isExpanded ? null : flag.id)}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: severity === "critical" ? RED : "oklch(0.85 0.18 85)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: severity === "critical" ? "oklch(0.25 0.1 25)" : "oklch(0.18 0.05 280)", color: severity === "critical" ? RED : SUBTEXT }}>
                        {REASON_LABELS[flag.reason] ?? flag.reason}
                      </span>
                      <span className="text-xs capitalize" style={{ color: SUBTEXT }}>{flag.workType}</span>
                      {flag.workTitle && <span className="text-xs truncate max-w-xs" style={{ color: "oklch(0.75 0.02 280)" }}>"{flag.workTitle}"</span>}
                    </div>
                    <div className="text-xs mt-1" style={{ color: SUBTEXT }}>
                      Reported by {flag.reporterName} · {new Date(flag.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "oklch(0.15 0.01 280)", color: flag.status === "pending" ? "oklch(0.85 0.18 85)" : flag.status === "reviewed_ok" ? GREEN : flag.status === "removed_violation" ? RED : "oklch(0.75 0.18 50)" }}>
                    {flag.status.replace("_", " ")}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-3" style={{ borderColor: BORDER }}>
                    {flag.details && (
                      <div>
                        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: SUBTEXT }}>Reporter's details</p>
                        <p className="text-sm rounded p-3" style={{ background: "oklch(0.09 0.01 280)", color: "oklch(0.82 0.02 280)" }}>{flag.details}</p>
                      </div>
                    )}
                    <p className="text-xs" style={{ color: SUBTEXT }}>Work ID: {flag.workId}</p>
                    {flag.status === "pending" && (
                      <div className="space-y-2">
                        <textarea
                          placeholder="Admin note (optional)"
                          value={adminNotes[flag.id] ?? ""}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [flag.id]: e.target.value }))}
                          rows={2}
                          className="w-full text-sm rounded-lg px-3 py-2 resize-none border"
                          style={{ background: "oklch(0.09 0.01 280)", borderColor: BORDER, color: "oklch(0.88 0.02 280)" }}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => resolveMutation.mutate({ flagId: flag.id, resolution: "reviewed_ok", adminNote: adminNotes[flag.id] })} disabled={resolveMutation.isPending} style={{ background: "oklch(0.25 0.08 145)", color: GREEN, border: `1px solid oklch(0.35 0.1 145)` }}>
                            ✓ Clear
                          </Button>
                          <Button size="sm" onClick={() => resolveMutation.mutate({ flagId: flag.id, resolution: "removed_violation", adminNote: adminNotes[flag.id] })} disabled={resolveMutation.isPending} style={{ background: "oklch(0.22 0.08 25)", color: RED, border: `1px solid oklch(0.35 0.1 25)` }}>
                            ✗ Remove
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ flagId: flag.id, resolution: "escalated", adminNote: adminNotes[flag.id] })} disabled={resolveMutation.isPending} style={{ borderColor: "oklch(0.35 0.1 50)", color: "oklch(0.75 0.18 50)" }}>
                            Escalate
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Data Rights Tab ───────────────────────────────────────────────────────────
function DataRightsTab() {
  const utils = trpc.useUtils();

  // ── Deletion Requests ──────────────────────────────────────────────────────
  const { data: deletionRequests, isLoading: loadingDeletions } =
    trpc.admin.getDeletionRequests.useQuery(undefined, { retry: false });

  const markProcessed = trpc.admin.markDeletionProcessed.useMutation({
    onSuccess: () => {
      toast.success("Deletion request marked as processed.");
      utils.admin.getDeletionRequests.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Sovereign Migration Status ─────────────────────────────────────────────
  const { data: migrationData, isLoading: loadingMigration } =
    trpc.admin.getSovereignMigrationStatus.useQuery(undefined, { retry: false });

  const [newStage, setNewStage] = useState<"hosted" | "migrating" | "sovereign">("hosted");
  const [migrationNotes, setMigrationNotes] = useState("");
  const [stageInitialized, setStageInitialized] = useState(false);

  // Sync newStage when data loads
  if (migrationData && !stageInitialized) {
    setNewStage(migrationData.stage);
    setMigrationNotes(migrationData.notes ?? "");
    setStageInitialized(true);
  }

  const updateMigration = trpc.admin.updateSovereignMigrationStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`Migration stage updated to: ${data.stage}`);
      utils.admin.getSovereignMigrationStatus.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const stageColors: Record<string, string> = {
    hosted: "oklch(0.65 0.18 50)",
    migrating: "oklch(0.65 0.18 200)",
    sovereign: "oklch(0.65 0.18 145)",
  };

  const stageLabels: Record<string, string> = {
    hosted: "Hosted (Third-Party Infrastructure)",
    migrating: "Migrating (Transition in Progress)",
    sovereign: "Sovereign (Independent Infrastructure)",
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Deletion Requests */}
      <div className="rounded-xl border p-6" style={{ background: CARD, borderColor: BORDER }}>
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-5 h-5" style={{ color: RED }} />
          <h2 className="text-lg font-bold" style={{ color: "oklch(0.95 0.02 85)", fontFamily: "'Cinzel', serif" }}>
            Data Deletion Requests
          </h2>
          {deletionRequests && deletionRequests.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.65 0.18 25 / 0.2)", color: RED, border: `1px solid oklch(0.65 0.18 25 / 0.4)` }}>
              {deletionRequests.length} pending
            </span>
          )}
        </div>
        <p className="text-sm mb-4" style={{ color: SUBTEXT }}>
          Creators who have submitted account deletion requests. Per the Privacy Policy, data must be deleted within 90 days of the request date. Mark as processed once the deletion is complete.
        </p>

        {loadingDeletions ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
          </div>
        ) : !deletionRequests || deletionRequests.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: MUTED }}>
            No pending deletion requests.
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
            <table className="w-full">
              <thead style={{ background: "oklch(0.10 0.015 280)", borderBottom: `1px solid ${BORDER}` }}>
                <tr>
                  {["Creator", "Email", "Requested On", "Days Elapsed", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: SUBTEXT }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deletionRequests.map((req, i) => {
                  const requestedAt = new Date(req.dataDeletionRequestedAt);
                  const daysElapsed = Math.floor((Date.now() - requestedAt.getTime()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysElapsed >= 80;
                  return (
                    <tr key={req.id} style={{
                      background: i % 2 === 0 ? "oklch(0.10 0.015 280)" : "oklch(0.11 0.015 280)",
                      borderBottom: `1px solid oklch(0.16 0.02 280)`,
                    }}>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium" style={{ color: TEXT }}>
                          {req.artistHandle ? `@${req.artistHandle}` : req.name ?? "—"}
                        </div>
                        {req.artistHandle && req.name && (
                          <div className="text-xs mt-0.5" style={{ color: MUTED }}>{req.name}</div>
                        )}
                        <div className="text-xs font-mono mt-0.5" style={{ color: "oklch(0.5 0.02 280)" }}>ID: {req.id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: SUBTEXT }}>{req.email ?? "—"}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: SUBTEXT }}>{formatDate(requestedAt)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-mono font-semibold" style={{ color: isUrgent ? RED : SUBTEXT }}>
                          {daysElapsed}d {isUrgent && "⚠ URGENT"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          disabled={markProcessed.isPending}
                          onClick={() => markProcessed.mutate({ userId: req.id })}
                          style={{ background: "oklch(0.25 0.08 145)", color: GREEN, border: `1px solid oklch(0.35 0.1 145)` }}
                        >
                          {markProcessed.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                          Mark Processed
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Sovereign Migration Status */}
      <div className="rounded-xl border p-6" style={{ background: CARD, borderColor: BORDER }}>
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5" style={{ color: "oklch(0.65 0.18 200)" }} />
          <h2 className="text-lg font-bold" style={{ color: "oklch(0.95 0.02 85)", fontFamily: "'Cinzel', serif" }}>
            Sovereign Infrastructure Migration
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: SUBTEXT }}>
          This status is displayed publicly on the <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.15 0.02 280)", color: GOLD }}>/privacy</code> page. Update it as the platform progresses toward sovereign infrastructure.
        </p>

        {/* Current Status Display */}
        {loadingMigration ? (
          <div className="flex items-center gap-2 mb-6">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
            <span className="text-sm" style={{ color: SUBTEXT }}>Loading current status…</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-6 p-4 rounded-xl border" style={{ background: "oklch(0.10 0.015 280)", borderColor: BORDER }}>
            <div className="w-3 h-3 rounded-full" style={{ background: stageColors[migrationData?.stage ?? "hosted"] }} />
            <div>
              <div className="text-sm font-semibold" style={{ color: TEXT }}>
                Current Stage: {stageLabels[migrationData?.stage ?? "hosted"]}
              </div>
              {migrationData?.notes && (
                <div className="text-xs mt-1" style={{ color: SUBTEXT }}>{migrationData.notes}</div>
              )}
            </div>
          </div>
        )}

        {/* Update Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: SUBTEXT }}>
              New Stage
            </label>
            <div className="flex gap-3 flex-wrap">
              {(["hosted", "migrating", "sovereign"] as const).map(stage => (
                <button
                  key={stage}
                  onClick={() => setNewStage(stage)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border"
                  style={newStage === stage
                    ? { background: stageColors[stage] + "33", color: stageColors[stage], borderColor: stageColors[stage] }
                    : { background: "transparent", color: SUBTEXT, borderColor: BORDER }}
                >
                  {stage === "hosted" && <Lock className="w-3.5 h-3.5" />}
                  {stage === "migrating" && <ArrowRight className="w-3.5 h-3.5" />}
                  {stage === "sovereign" && <Globe className="w-3.5 h-3.5" />}
                  {stageLabels[stage]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: SUBTEXT }}>
              Admin Notes (optional — displayed publicly)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 'DNS migration complete, database replication in progress…'"
              value={migrationNotes}
              onChange={e => setMigrationNotes(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2 resize-none border"
              style={{ background: "oklch(0.09 0.01 280)", borderColor: BORDER, color: TEXT }}
            />
          </div>

          <Button
            disabled={updateMigration.isPending || (newStage === migrationData?.stage && migrationNotes === (migrationData?.notes ?? ""))}
            onClick={() => updateMigration.mutate({ stage: newStage, notes: migrationNotes || undefined })}
            style={{ background: GOLD, color: BG }}
          >
            {updateMigration.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Migration Status
          </Button>
        </div>
      </div>
    </div>
  );
}
