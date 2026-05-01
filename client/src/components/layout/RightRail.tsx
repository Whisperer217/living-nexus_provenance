/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — RightRail (System Architecture v1.0)
   300px sticky signals layer. Desktop only (hidden below lg).
   Modules: Signals · Provenance Verified · Witness Registry
   Uses only confirmed tRPC procedures:
     - notifications.list (protected)
     - songs.trending (public, limit 3 for provenance-verified)
     - witnessRegistry.list (public, limit 5)
═══════════════════════════════════════════════════════════════════ */
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Shield, Eye, Zap, CheckCircle2 } from "lucide-react";

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function RightRail() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Signals — user's notification inbox (5 most recent)
  const { data: signals } = trpc.notifications.list.useQuery(
    { limit: 5 },
    { enabled: !!user, staleTime: 30_000, refetchInterval: 60_000 }
  );

  // Provenance Verified — trending works (all have WIDs by definition of trending)
  const { data: trendingData } = trpc.songs.trending.useQuery(
    { limit: 3 },
    { staleTime: 60_000, refetchInterval: 120_000 }
  );

  // Witness Registry — recent witnessed works
  const { data: registryData } = trpc.witnessRegistry.list.useQuery(
    { type: "all", cursor: 0, limit: 5 },
    { staleTime: 120_000 }
  );

  const provenanceTracks = (trendingData as any[] | undefined) ?? [];
  const registryItems = (registryData as any)?.items ?? [];
  const totalWitnesses = registryItems.length > 0
    ? (registryData as any)?.total ?? registryItems.length
    : null;

  return (
    <aside
      className="hidden lg:flex flex-col flex-shrink-0 overflow-y-auto"
      style={{
        width: 300,
        background: "rgba(10,9,7,0.92)",
        borderLeft: "1px solid rgba(212,175,55,0.08)",
        zIndex: 90,
      }}
    >
      <div className="flex flex-col gap-4 p-4 pb-32">

        {/* ── Signals ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-widest" style={{ color: "rgba(212,175,55,0.6)" }}>
              SIGNALS
            </span>
            <button
              onClick={() => navigate("/notifications")}
              className="text-[10px] transition-colors"
              style={{ color: "rgba(212,175,55,0.45)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#D4AF37")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.45)")}
            >
              VIEW ALL
            </button>
          </div>

          {!user && (
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Sign in to see your signals.
            </p>
          )}

          {user && signals && (signals as any[]).length === 0 && (
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              No signals yet.
            </p>
          )}

          {user && (signals as any[] | undefined)?.map((sig: any) => (
            <div
              key={sig.id}
              className="flex items-start gap-2 py-2 border-b cursor-pointer transition-opacity hover:opacity-80"
              style={{ borderColor: "rgba(212,175,55,0.06)" }}
              onClick={() => sig.linkUrl && navigate(sig.linkUrl)}
            >
              <Zap size={12} style={{ color: "#D4AF37", marginTop: 2, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {sig.body ?? sig.title ?? "New signal"}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {sig.createdAt ? timeAgo(typeof sig.createdAt === "number" ? sig.createdAt : new Date(sig.createdAt).getTime()) : ""}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Provenance Verified ──────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-widest" style={{ color: "rgba(212,175,55,0.6)" }}>
              PROVENANCE VERIFIED
            </span>
            <button
              onClick={() => navigate("/witness-registry")}
              className="text-[10px] transition-colors"
              style={{ color: "rgba(212,175,55,0.45)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#D4AF37")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,175,55,0.45)")}
            >
              VIEW ALL
            </button>
          </div>

          {provenanceTracks.slice(0, 3).map((w: any) => (
            <div
              key={w.id}
              className="flex items-center gap-2 py-2 border-b cursor-pointer transition-opacity hover:opacity-80"
              style={{ borderColor: "rgba(212,175,55,0.06)" }}
              onClick={() => navigate(`/song/${w.id}`)}
            >
              {w.coverArtUrl || w.artworkUrl
                ? <img src={w.coverArtUrl ?? w.artworkUrl} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(212,175,55,0.12)", flexShrink: 0 }} />
              }
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                  {w.title}
                </p>
                <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {w.artistName ?? w.creatorName ?? w.userName ?? ""}
                </p>
              </div>
              <CheckCircle2 size={12} style={{ color: "#D4AF37", flexShrink: 0 }} />
            </div>
          ))}

          {provenanceTracks.length === 0 && (
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>No verified works yet.</p>
          )}
        </section>

        {/* ── Witness Registry Stats ───────────────────────────────── */}
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Eye size={11} style={{ color: "rgba(212,175,55,0.6)" }} />
            <span className="text-[10px] font-bold tracking-widest" style={{ color: "rgba(212,175,55,0.6)" }}>
              WITNESS REGISTRY
            </span>
          </div>

          <div
            className="rounded-xl p-3 cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "rgba(212,175,55,0.05)", border: "1px solid rgba(212,175,55,0.12)" }}
            onClick={() => navigate("/witness-registry")}
          >
            <p className="text-2xl font-bold" style={{ color: "#D4AF37" }}>
              {registryItems.length > 0 ? (totalWitnesses ?? registryItems.length).toLocaleString() : "—"}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Total Witnesses<br />Across all works
            </p>
          </div>

          {/* Recent registry entries */}
          <div className="mt-2 flex flex-col gap-1">
            {registryItems.slice(0, 3).map((item: any) => (
              <div
                key={item.id ?? item.witnessId}
                className="flex items-center gap-2 py-1.5 cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => navigate(`/song/${item.songId ?? item.id}`)}
              >
                <Shield size={10} style={{ color: "rgba(212,175,55,0.5)", flexShrink: 0 }} />
                <p className="text-[10px] truncate flex-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {item.title ?? item.songTitle ?? "Untitled"}
                </p>
                <p className="text-[9px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {item.createdAt ? timeAgo(typeof item.createdAt === "number" ? item.createdAt : new Date(item.createdAt).getTime()) : ""}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </aside>
  );
}
