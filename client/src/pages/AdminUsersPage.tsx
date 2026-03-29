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
  Gift, RotateCcw, Copy, CreditCard, ExternalLink, History,
} from "lucide-react";
import { getLoginUrl } from "@/const";

type SortKey = "name" | "createdAt" | "trackCount" | "widCount" | "licenseStatus";
type SortDir = "asc" | "desc";
type Tab = "users" | "codes" | "stripe";

const GOLD = "oklch(0.84 0.155 85)";
const BG = "oklch(0.08 0.015 280)";
const CARD = "oklch(0.12 0.015 280)";
const BORDER = "oklch(0.2 0.02 280)";
const MUTED = "#64748B";
const TEXT = "#E2E8F0";
const SUBTEXT = "#94A3B8";

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
    { id: "stripe", label: "Stripe Recovery", icon: <CreditCard className="w-4 h-4" /> },
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
                Admin Panel
              </h1>
            </div>
            <p className="text-sm" style={{ color: SUBTEXT }}>Manage users, grant licenses, and create access codes.</p>
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
        {tab === "stripe" && <StripeRecoveryTab />}

      </div>
    </div>
  );
}
