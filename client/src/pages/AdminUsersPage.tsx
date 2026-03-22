/**
 * /admin/users — Platform owner roster
 * Shows all registered users with display name, join date, track count,
 * WID count, and license status. Visible only to the platform owner.
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, Users, Shield } from "lucide-react";
import { getLoginUrl } from "@/const";

type SortKey = "name" | "createdAt" | "trackCount" | "widCount" | "licenseStatus";
type SortDir = "asc" | "desc";

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3" style={{ color: "oklch(0.84 0.155 85)" }} />
    : <ArrowDown className="w-3 h-3" style={{ color: "oklch(0.84 0.155 85)" }} />;
}

export default function AdminUsersPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: users, isLoading, error } = trpc.admin.getUsers.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    return users.filter(u =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.artistHandle ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === "createdAt") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      } else if (typeof av === "string") {
        av = av.toLowerCase();
        bv = (bv ?? "").toLowerCase();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.84 0.155 85)" }} />
    </div>
  );

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "oklch(0.84 0.155 85)" }} />
        <p className="mb-4" style={{ color: "#E2E8F0" }}>Sign in required.</p>
        <Button onClick={() => window.location.href = getLoginUrl()} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>Sign In</Button>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center max-w-sm">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: "oklch(0.65 0.18 25)" }} />
        <p className="text-lg font-semibold mb-2" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>Access Denied</p>
        <p className="text-sm mb-6" style={{ color: "#94A3B8" }}>This page is restricted to the platform owner.</p>
        <Button variant="outline" onClick={() => navigate("/")} style={{ borderColor: "oklch(0.84 0.155 85)", color: "oklch(0.84 0.155 85)" }}>Back to Home</Button>
      </div>
    </div>
  );

  const totalTracks = users?.reduce((s, u) => s + u.trackCount, 0) ?? 0;
  const totalWids = users?.reduce((s, u) => s + u.widCount, 0) ?? 0;
  const licensed = users?.filter(u => u.licenseStatus === "licensed").length ?? 0;

  const thStyle = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:opacity-80 transition-opacity";
  const tdStyle = "px-4 py-3 text-sm";

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="container py-10 max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users className="w-6 h-6" style={{ color: "oklch(0.84 0.155 85)" }} />
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
                User Roster
              </h1>
            </div>
            <p className="text-sm" style={{ color: "#94A3B8" }}>Platform owner view — all registered accounts</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}
            style={{ borderColor: "oklch(0.3 0.02 280)", color: "#94A3B8" }}>
            ← Back
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: users?.length ?? "—" },
            { label: "Total Tracks", value: totalTracks },
            { label: "Total WIDs", value: totalWids },
            { label: "Licensed", value: licensed },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4 border"
              style={{ background: "oklch(0.12 0.015 280)", borderColor: "oklch(0.2 0.02 280)" }}>
              <div className="text-2xl font-bold mb-1" style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}>{value}</div>
              <div className="text-xs uppercase tracking-wider" style={{ color: "#64748B" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#64748B" }} />
          <Input
            placeholder="Search by name, handle, or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            style={{ background: "oklch(0.12 0.015 280)", borderColor: "oklch(0.2 0.02 280)", color: "#E2E8F0" }}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "oklch(0.84 0.155 85)" }} />
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: "oklch(0.2 0.02 280)" }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: "oklch(0.12 0.015 280)", borderBottom: "1px solid oklch(0.2 0.02 280)" }}>
                  <tr>
                    {([
                      { key: "name" as SortKey, label: "User" },
                      { key: "createdAt" as SortKey, label: "Joined" },
                      { key: "trackCount" as SortKey, label: "Tracks" },
                      { key: "widCount" as SortKey, label: "WIDs" },
                      { key: "licenseStatus" as SortKey, label: "License" },
                    ]).map(({ key, label }) => (
                      <th key={key} className={thStyle} style={{ color: "#94A3B8" }} onClick={() => handleSort(key)}>
                        <div className="flex items-center gap-1">
                          {label}
                          <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                        </div>
                      </th>
                    ))}
                    <th className={thStyle} style={{ color: "#94A3B8" }}>Slots</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "#64748B" }}>
                        {search ? "No users match your search." : "No users yet."}
                      </td>
                    </tr>
                  ) : sorted.map((u, i) => (
                    <tr key={u.id}
                      style={{
                        background: i % 2 === 0 ? "oklch(0.10 0.015 280)" : "oklch(0.11 0.015 280)",
                        borderBottom: "1px solid oklch(0.16 0.02 280)",
                      }}>
                      {/* User */}
                      <td className={tdStyle}>
                        <div className="font-medium" style={{ color: "#E2E8F0" }}>
                          {u.artistHandle ? `@${u.artistHandle}` : u.name ?? "—"}
                        </div>
                        {u.artistHandle && u.name && (
                          <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{u.name}</div>
                        )}
                        {u.email && (
                          <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{u.email}</div>
                        )}
                      </td>
                      {/* Joined */}
                      <td className={tdStyle} style={{ color: "#94A3B8" }}>{formatDate(u.createdAt)}</td>
                      {/* Tracks */}
                      <td className={tdStyle}>
                        <span className="font-mono font-semibold" style={{ color: u.trackCount > 0 ? "oklch(0.84 0.155 85)" : "#64748B" }}>
                          {u.trackCount}
                        </span>
                      </td>
                      {/* WIDs */}
                      <td className={tdStyle}>
                        <span className="font-mono font-semibold" style={{ color: u.widCount > 0 ? "oklch(0.75 0.18 145)" : "#64748B" }}>
                          {u.widCount}
                        </span>
                      </td>
                      {/* License */}
                      <td className={tdStyle}>
                        <Badge
                          style={u.licenseStatus === "licensed"
                            ? { background: "oklch(0.75 0.18 145 / 0.2)", color: "oklch(0.75 0.18 145)", border: "1px solid oklch(0.75 0.18 145 / 0.3)" }
                            : { background: "oklch(0.3 0.02 280)", color: "#64748B", border: "1px solid oklch(0.25 0.02 280)" }
                          }>
                          {u.licenseStatus === "licensed" ? "Licensed" : "Free"}
                        </Badge>
                      </td>
                      {/* Slots */}
                      <td className={tdStyle}>
                        <span className="text-xs font-mono" style={{ color: "#94A3B8" }}>
                          {u.songSlotsUsed}/{u.songSlotsTotal}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sorted.length > 0 && (
              <div className="px-4 py-3 text-xs border-t" style={{ color: "#64748B", borderColor: "oklch(0.2 0.02 280)", background: "oklch(0.10 0.015 280)" }}>
                Showing {sorted.length} of {users?.length ?? 0} users
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
