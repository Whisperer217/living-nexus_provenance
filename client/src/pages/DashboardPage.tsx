import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Music, Upload, DollarSign, Shield, Trash2, ExternalLink,
  BarChart2, CheckCircle, AlertCircle, Wand2, Clock, CheckCircle2,
  XCircle, Download, Play, Activity, MessageCircle, Zap
} from "lucide-react";

type Tab = "songs" | "transforms" | "activity";

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("songs");

  const { data: songs, refetch: refetchSongs } = trpc.songs.mySongs.useQuery(undefined, { enabled: isAuthenticated });
  const { data: transforms } = trpc.songs.getMyTransforms.useQuery(undefined, { enabled: isAuthenticated && activeTab === "transforms" });
  const { data: activityEvents, isLoading: activityLoading } = trpc.events.getForCreator.useQuery(
    { limit: 200 },
    { enabled: isAuthenticated && activeTab === "activity", refetchInterval: 30_000 }
  );
  const { data: licenseData } = trpc.licenses.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const { data: connectData } = trpc.tips.connectStatus.useQuery(undefined, { enabled: isAuthenticated });

  const deleteMutation = trpc.songs.delete.useMutation({
    onSuccess: () => { toast.success("Song deleted"); refetchSongs(); setDeletingId(null); },
    onError: (e: { message: string }) => { toast.error(e.message); setDeletingId(null); },
  });
  const updateStatusMutation = trpc.songs.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetchSongs(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const statusColor = (s: string) => ({
    Draft: "oklch(0.65 0.18 45)",
    Published: "oklch(0.65 0.18 145)",
    Unlisted: "oklch(0.65 0.2 300)",
    Deleted: "oklch(0.65 0.18 25)",
  }[s] ?? "oklch(0.5 0.03 280)");
  const licenseMutation = trpc.licenses.purchaseLicense.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) window.open(data.url, "_blank"); toast.info("Redirecting to checkout..."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const slotsMutation = trpc.licenses.purchaseSlots.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) window.open(data.url, "_blank"); toast.info("Redirecting to checkout..."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const connectMutation = trpc.tips.connectOnboarding.useMutation({
    onSuccess: (data: { url: string }) => {
      // Same-window redirect so Stripe Connect return_url works on mobile
      window.location.href = data.url;
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center">
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Please sign in to access your dashboard.</p>
        <Link href="/"><Button className="mt-4" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>Go Home</Button></Link>
      </div>
    </div>
  );

  const slotsUsed = licenseData?.songSlotsUsed ?? 0;
  const slotsTotal = licenseData?.songSlotsTotal ?? 1;
  const slotsPercent = Math.min(100, Math.round((slotsUsed / slotsTotal) * 100));
  const isLicensed = licenseData?.licenseStatus === "licensed";
  const tipsEnabled = connectData?.status === "enabled";

  const transformStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.65 0.18 145)" }} />;
      case "failed": return <XCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.18 25)" }} />;
      case "processing": return <Clock className="w-4 h-4" style={{ color: "oklch(0.65 0.18 45)" }} />;
      default: return <Clock className="w-4 h-4" style={{ color: "#E2E8F0" }} />;
    }
  };

  const transformStatusLabel = (status: string) => {
    switch (status) {
      case "success": return { label: "Complete", color: "oklch(0.65 0.18 145)" };
      case "failed": return { label: "Failed", color: "oklch(0.65 0.18 25)" };
      case "processing": return { label: "Processing", color: "oklch(0.65 0.18 45)" };
      default: return { label: "Pending", color: "#E2E8F0" };
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="container py-10" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>Creator Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: "#E2E8F0" }}>Welcome back, {user?.name || "Creator"}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/creator/${user?.id}`}>
              <Button size="sm" variant="outline" style={{ borderColor: "oklch(0.3 0.02 280)", color: "oklch(0.7 0.04 280)" }}>
                <ExternalLink className="w-3 h-3 mr-1" /> View Profile
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="sm" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>
                <Upload className="w-3 h-3 mr-1" /> Upload Track
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Songs Published", value: songs?.length ?? 0, icon: Music, color: "oklch(0.84 0.155 85)" },
            { label: "Total Plays", value: (songs ?? []).reduce((a: number, s: any) => a + (s.playCount || 0), 0), icon: BarChart2, color: "oklch(0.65 0.2 300)" },
            { label: "Song Slots", value: `${slotsUsed}/${slotsTotal}`, icon: Shield, color: "oklch(0.65 0.18 145)" },
            { label: "Tips Received", value: (songs ?? []).reduce((a: number, s: any) => a + (s.tipCount || 0), 0), icon: DollarSign, color: "oklch(0.65 0.18 45)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs" style={{ color: "#E2E8F0" }}>{label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color, fontFamily: "'Cinzel', serif" }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* License Status */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Creator License</h3>
            </div>
            {isLicensed ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.18 145)" }} />
                <span className="text-sm" style={{ color: "oklch(0.65 0.18 145)" }}>Licensed — Commercial Rights Active</span>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>Unlock 100 song slots, commercial license, and Witness ID provenance certificates.</p>
                <p className="text-lg font-bold mb-3" style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Cinzel', serif" }}>$89.98 <span className="text-xs font-normal" style={{ color: "#E2E8F0" }}>one-time</span></p>
                <Button size="sm" className="w-full" onClick={() => licenseMutation.mutate({ origin: window.location.origin })} disabled={licenseMutation.isPending} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>
                  {licenseMutation.isPending ? "Processing..." : "Purchase License"}
                </Button>
              </>
            )}
          </div>

          {/* Song Slots */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-4 h-4" style={{ color: "oklch(0.65 0.2 300)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Song Slots</h3>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: "#E2E8F0" }}>
                <span>{slotsUsed} used</span><span>{slotsTotal} total</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.15 0.05 275)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${slotsPercent}%`, background: slotsPercent >= 90 ? "oklch(0.65 0.18 25)" : "oklch(0.65 0.2 300)" }} />
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>Need more? Add slots at $0.99 each.</p>
            <Button size="sm" className="w-full" variant="outline" onClick={() => slotsMutation.mutate({ slots: 10, origin: window.location.origin })} disabled={slotsMutation.isPending} style={{ borderColor: "oklch(0.65 0.2 300 / 0.5)", color: "oklch(0.65 0.2 300)" }}>
              {slotsMutation.isPending ? "Processing..." : "Buy 10 Slots ($9.90)"}
            </Button>
          </div>

          {/* Tips / Stripe Connect */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4" style={{ color: "oklch(0.65 0.18 45)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Tip Payments</h3>
            </div>
            {tipsEnabled ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.18 145)" }} />
                <span className="text-sm" style={{ color: "oklch(0.65 0.18 145)" }}>Tips Enabled — 90% to you</span>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>
                  {connectData?.status === "pending" ? "Stripe verification in progress. Complete your account setup." : "Enable tips to receive direct payments from fans. 90% goes to you, 10% to the platform."}
                </p>
                {connectData?.status === "pending" && (
                  <div className="flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3 h-3" style={{ color: "oklch(0.65 0.18 45)" }} />
                    <span className="text-xs" style={{ color: "oklch(0.65 0.18 45)" }}>Pending verification</span>
                  </div>
                )}
                <Button size="sm" className="w-full" variant="outline" onClick={() => connectMutation.mutate({ returnUrl: `${window.location.origin}/dashboard` })} disabled={connectMutation.isPending} style={{ borderColor: "oklch(0.65 0.18 145 / 0.5)", color: "oklch(0.65 0.18 145)" }}>
                  {connectMutation.isPending ? "Loading..." : connectData?.status === "pending" ? "Continue Setup" : "Enable Tips"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}>
          <button
            onClick={() => setActiveTab("songs")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "songs" ? "oklch(0.84 0.155 85)" : "transparent",
              color: activeTab === "songs" ? "oklch(0.08 0.015 280)" : "oklch(0.6 0.04 280)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Music className="w-4 h-4" />
            My Songs
            {songs?.length ? <span className="text-xs opacity-70">({songs.length})</span> : null}
          </button>
          <button
            onClick={() => setActiveTab("transforms")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "transforms" ? "oklch(0.65 0.2 300)" : "transparent",
              color: activeTab === "transforms" ? "white" : "oklch(0.6 0.04 280)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Wand2 className="w-4 h-4" />
            My Transforms
            {transforms?.length ? <span className="text-xs opacity-70">({transforms.length})</span> : null}
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "activity" ? "oklch(0.65 0.18 45)" : "transparent",
              color: activeTab === "activity" ? "oklch(0.08 0.015 280)" : "oklch(0.6 0.04 280)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Activity className="w-4 h-4" />
            Activity
            {activityEvents?.length ? <span className="text-xs opacity-70">({activityEvents.length})</span> : null}
          </button>
        </div>

        {/* My Songs Tab */}
        {activeTab === "songs" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>My Songs</h2>
              <Link href="/upload">
                <Button size="sm" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>
                  <Upload className="w-3 h-3 mr-1" /> Upload New
                </Button>
              </Link>
            </div>
            {!songs?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
                <Music className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
                <p className="text-sm mb-4" style={{ color: "#E2E8F0" }}>No songs yet. Upload your first track to get started.</p>
                <Link href="/upload">
                  <Button style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>Upload Your First Track</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {songs.map((song: any, idx: number) => (
                  <div key={song.id} className="p-3 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    {/* Top row: index + cover + title + actions */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: "#E2E8F0", minWidth: "20px" }}>{idx + 1}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "oklch(0.11 0.025 270)" }}>
                        {song.coverArtUrl ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" /> : <Music className="w-4 h-4 opacity-40" style={{ color: "oklch(0.84 0.155 85)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif", fontSize: "13px" }}>{song.title}</p>
                        {song.genre && (
                          <p className="text-xs truncate mt-0.5" style={{ color: "#E2E8F0", fontSize: "12px" }}>{song.genre}</p>
                        )}
                      </div>
                      {/* Action buttons — always visible */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Link href={`/song/${song.id}`}>
                          <button className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" title="View song page">
                            <ExternalLink className="w-3 h-3" style={{ color: "oklch(0.65 0.2 300)" }} />
                          </button>
                        </Link>
                        <button
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/10"
                          title="Delete song"
                          onClick={() => { setDeletingId(song.id); deleteMutation.mutate({ songId: song.id }); }}
                          disabled={deletingId === song.id}
                        >
                          <Trash2 className="w-3 h-3" style={{ color: deletingId === song.id ? "oklch(0.5 0.03 280)" : "oklch(0.65 0.18 25)" }} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom row: metadata grid */}
                    <div className="mt-2 ml-[52px] flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {/* Play count */}
                      <span style={{ color: "#E2E8F0", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {song.playCount || 0} plays
                      </span>
                      {/* Tip count */}
                      <span style={{ color: "#E2E8F0", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {song.tipCount || 0} tips
                      </span>
                      {/* WID badge */}
                      {song.witnessId && (
                        <Badge className="px-1.5 py-0" style={{ background: "oklch(0.65 0.2 300 / 0.2)", color: "oklch(0.65 0.2 300)", fontSize: "10px" }}>WID</Badge>
                      )}
                      {/* AI badge */}
                      {song.aiConsent === "prohibited" && (
                        <Badge className="px-1.5 py-0" style={{ background: "oklch(0.65 0.18 25 / 0.2)", color: "oklch(0.65 0.18 25)", fontSize: "10px" }}>AI OFF</Badge>
                      )}
                      {/* Status dropdown */}
                      <select
                        value={song.status ?? "Published"}
                        onChange={e => updateStatusMutation.mutate({ songId: song.id, status: e.target.value as any })}
                        disabled={updateStatusMutation.isPending}
                        title="Track status"
                        style={{
                          background: "oklch(0.13 0.04 270)",
                          color: statusColor(song.status ?? "Published"),
                          border: `1px solid ${statusColor(song.status ?? "Published")}44`,
                          borderRadius: "6px",
                          fontSize: "12px",
                          padding: "2px 8px",
                          cursor: "pointer",
                          outline: "none",
                          minWidth: "90px",
                        }}
                      >
                        {["Draft", "Published", "Unlisted", "Deleted"].map(s => (
                          <option key={s} value={s} style={{ background: "oklch(0.13 0.04 270)", color: statusColor(s) }}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Feed Tab */}
        {activeTab === "activity" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Activity Feed</h2>
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>All interactions on your songs — tips, comments, and witnesses. Auto-refreshes every 30s.</p>
              </div>
            </div>
            {activityLoading ? (
              <div className="text-center py-16">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "oklch(0.84 0.155 85)", borderTopColor: "transparent" }} />
              </div>
            ) : !activityEvents?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
                <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No activity yet.</p>
                <p className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>Tips, comments, and witnesses on your songs will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(activityEvents as any[]).map((evt) => {
                  const isTip = evt.type === "TIP";
                  const isComment = evt.type === "COMMENT";
                  const payload = evt.payload as any ?? {};
                  const accentColor = isTip ? "oklch(0.84 0.155 85)" : isComment ? "oklch(0.65 0.2 300)" : "oklch(0.65 0.18 145)";
                  return (
                    <div
                      key={evt.id}
                      className="rounded-xl p-3 flex gap-3 items-start"
                      style={{
                        background: isTip ? "oklch(0.84 0.155 85 / 0.06)" : "oklch(0.115 0.055 278)",
                        border: `1px solid ${isTip ? "oklch(0.84 0.155 85 / 0.25)" : "oklch(0.18 0.015 280)"}`,
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}
                      >
                        {isTip ? <DollarSign className="w-4 h-4" style={{ color: accentColor }} /> :
                         isComment ? <MessageCircle className="w-4 h-4" style={{ color: accentColor }} /> :
                         <Zap className="w-4 h-4" style={{ color: accentColor }} />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold" style={{ color: accentColor }}>
                            {isTip ? `$${((payload.amount ?? 0) / 100).toFixed(2)} Tip` :
                             isComment ? "Comment" : evt.type.replace(/_/g, " ")}
                          </span>
                          {evt.actorName && (
                            <span className="text-xs" style={{ color: "oklch(0.7 0.03 280)" }}>by {evt.actorName}</span>
                          )}
                          {evt.songTitle && (
                            <Link href={`/song/${evt.workId}`}>
                              <span className="text-xs hover:underline truncate" style={{ color: "oklch(0.55 0.04 280)" }}>on "{evt.songTitle}"</span>
                            </Link>
                          )}
                        </div>
                        {(payload.message || payload.text) && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#E2E8F0" }}>
                            {payload.message || payload.text}
                          </p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.38 0.02 280)" }}>
                          {new Date(evt.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {/* Cover art thumbnail */}
                      {evt.songCoverArtUrl && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden">
                          <img src={evt.songCoverArtUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* My Transforms Tab */}
        {activeTab === "transforms" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>My AI Transforms</h2>
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>AI-generated derivatives of your songs, linked to their original Witness IDs.</p>
              </div>
            </div>
            {!transforms?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.65 0.2 300)" }} />
                <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No AI transforms yet.</p>
                <p className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>Open any song page and use the AI Transform button to create a derivative.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transforms.map((t: any) => {
                  const { label, color } = transformStatusLabel(t.status);
                  return (
                    <div key={t.id} className="rounded-xl p-4" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.18 0.015 280)" }}>
                      <div className="flex items-start gap-4">
                        {/* Status icon */}
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.11 0.025 270)" }}>
                          {transformStatusIcon(t.status)}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>
                              Transform of "{t.originalSongTitle || `Song #${t.originalSongId}`}"
                            </p>
                            <Badge className="text-xs px-1.5 py-0 flex-shrink-0" style={{ background: `${color}20`, color, fontSize: "9px" }}>
                              {label}
                            </Badge>
                          </div>
                          <p className="text-xs mb-1 line-clamp-2" style={{ color: "oklch(0.6 0.04 280)" }}>
                            <span style={{ color: "#E2E8F0" }}>Prompt: </span>{t.prompt}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {t.style && (
                              <span className="text-xs" style={{ color: "#E2E8F0" }}>Style: {t.style}</span>
                            )}
                            {t.originalWitnessId && (
                              <Link href={`/verify/${t.originalWitnessId}`}>
                                <span className="text-xs cursor-pointer hover:underline" style={{ color: "oklch(0.65 0.2 300)" }}>
                                  WID: {t.originalWitnessId.slice(0, 12)}…
                                </span>
                              </Link>
                            )}
                            <span className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {t.status === "failed" && t.errorMessage && (
                            <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.18 25)" }}>Error: {t.errorMessage}</p>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {t.outputUrl && (
                            <>
                              <a href={t.outputUrl} target="_blank" rel="noopener noreferrer">
                                <button
                                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                                  title="Play transform"
                                >
                                  <Play className="w-3 h-3" style={{ color: "oklch(0.84 0.155 85)" }} />
                                </button>
                              </a>
                              <a href={t.outputUrl} download>
                                <button
                                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                                  title="Download transform"
                                >
                                  <Download className="w-3 h-3" style={{ color: "oklch(0.65 0.2 300)" }} />
                                </button>
                              </a>
                            </>
                          )}
                          <Link href={`/song/${t.originalSongId}`}>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                              title="View original song"
                            >
                              <ExternalLink className="w-3 h-3" style={{ color: "#E2E8F0" }} />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
