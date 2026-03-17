import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Music, Upload, DollarSign, Shield, Trash2, ExternalLink, BarChart2, CheckCircle, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: songs, refetch: refetchSongs } = trpc.songs.mySongs.useQuery(undefined, { enabled: isAuthenticated });
  const { data: licenseData } = trpc.licenses.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const { data: connectData } = trpc.tips.connectStatus.useQuery(undefined, { enabled: isAuthenticated });

  const deleteMutation = trpc.songs.delete.useMutation({
    onSuccess: () => { toast.success("Song deleted"); refetchSongs(); setDeletingId(null); },
    onError: (e: { message: string }) => { toast.error(e.message); setDeletingId(null); },
  });
  const licenseMutation = trpc.licenses.purchaseLicense.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) window.open(data.url, "_blank"); toast.info("Redirecting to checkout..."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const slotsMutation = trpc.licenses.purchaseSlots.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) window.open(data.url, "_blank"); toast.info("Redirecting to checkout..."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const connectMutation = trpc.tips.connectOnboarding.useMutation({
    onSuccess: (data: { url: string }) => { window.open(data.url, "_blank"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center">
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Please sign in to access your dashboard.</p>
        <Link href="/"><Button className="mt-4" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>Go Home</Button></Link>
      </div>
    </div>
  );

  const slotsUsed = licenseData?.songSlotsUsed ?? 0;
  const slotsTotal = licenseData?.songSlotsTotal ?? 1;
  const slotsPercent = Math.min(100, Math.round((slotsUsed / slotsTotal) * 100));
  const isLicensed = licenseData?.licenseStatus === "licensed";
  const tipsEnabled = connectData?.status === "enabled";

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="container py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>Creator Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.04 280)" }}>Welcome back, {user?.name || "Creator"}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/creator/${user?.id}`}>
              <Button size="sm" variant="outline" style={{ borderColor: "oklch(0.3 0.02 280)", color: "oklch(0.7 0.04 280)" }}>
                <ExternalLink className="w-3 h-3 mr-1" /> View Profile
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="sm" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
                <Upload className="w-3 h-3 mr-1" /> Upload Track
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Songs Published", value: songs?.length ?? 0, icon: Music, color: "oklch(0.75 0.18 85)" },
            { label: "Total Plays", value: (songs ?? []).reduce((a: number, s: any) => a + (s.playCount || 0), 0), icon: BarChart2, color: "oklch(0.65 0.2 300)" },
            { label: "Song Slots", value: `${slotsUsed}/${slotsTotal}`, icon: Shield, color: "oklch(0.65 0.18 145)" },
            { label: "Tips Received", value: (songs ?? []).reduce((a: number, s: any) => a + (s.tipCount || 0), 0), icon: DollarSign, color: "oklch(0.65 0.18 45)" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs" style={{ color: "oklch(0.55 0.04 280)" }}>{label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color, fontFamily: "'Cinzel', serif" }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* License Status */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: "oklch(0.75 0.18 85)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Creator License</h3>
            </div>
            {isLicensed ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.18 145)" }} />
                <span className="text-sm" style={{ color: "oklch(0.65 0.18 145)" }}>Licensed — Commercial Rights Active</span>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.04 280)" }}>Unlock 100 song slots, commercial license, and Witness ID provenance certificates.</p>
                <p className="text-lg font-bold mb-3" style={{ color: "oklch(0.75 0.18 85)", fontFamily: "'Cinzel', serif" }}>$89.98 <span className="text-xs font-normal" style={{ color: "oklch(0.55 0.04 280)" }}>one-time</span></p>
                <Button size="sm" className="w-full" onClick={() => licenseMutation.mutate({ origin: window.location.origin })} disabled={licenseMutation.isPending} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
                  {licenseMutation.isPending ? "Processing..." : "Purchase License"}
                </Button>
              </>
            )}
          </div>

          {/* Song Slots */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-4 h-4" style={{ color: "oklch(0.65 0.2 300)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Song Slots</h3>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: "oklch(0.55 0.04 280)" }}>
                <span>{slotsUsed} used</span><span>{slotsTotal} total</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 280)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${slotsPercent}%`, background: slotsPercent >= 90 ? "oklch(0.65 0.18 25)" : "oklch(0.65 0.2 300)" }} />
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.04 280)" }}>Need more? Add slots at $0.99 each.</p>
            <Button size="sm" className="w-full" variant="outline" onClick={() => slotsMutation.mutate({ slots: 10, origin: window.location.origin })} disabled={slotsMutation.isPending} style={{ borderColor: "oklch(0.65 0.2 300 / 0.5)", color: "oklch(0.65 0.2 300)" }}>
              {slotsMutation.isPending ? "Processing..." : "Buy 10 Slots ($9.90)"}
            </Button>
          </div>

          {/* Tips / Stripe Connect */}
          <div className="rounded-xl p-5" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
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
                <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.04 280)" }}>
                  {connectData?.status === "pending" ? "Stripe verification in progress. Complete your account setup." : "Enable tips to receive direct payments from fans. 90% goes to you, 10% to the platform."}
                </p>
                {connectData?.status === "pending" && (
                  <div className="flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3 h-3" style={{ color: "oklch(0.65 0.18 45)" }} />
                    <span className="text-xs" style={{ color: "oklch(0.65 0.18 45)" }}>Pending verification</span>
                  </div>
                )}
                <Button size="sm" className="w-full" variant="outline" onClick={() => connectMutation.mutate({ returnUrl: window.location.href })} disabled={connectMutation.isPending} style={{ borderColor: "oklch(0.65 0.18 145 / 0.5)", color: "oklch(0.65 0.18 145)" }}>
                  {connectMutation.isPending ? "Loading..." : connectData?.status === "pending" ? "Continue Setup" : "Enable Tips"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Song Catalog */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>My Songs</h2>
            <Link href="/upload">
              <Button size="sm" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
                <Upload className="w-3 h-3 mr-1" /> Upload New
              </Button>
            </Link>
          </div>
          {!songs?.length ? (
            <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.11 0.015 280)", border: "1px dashed oklch(0.25 0.02 280)" }}>
              <Music className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.75 0.18 85)" }} />
              <p className="text-sm mb-4" style={{ color: "oklch(0.5 0.03 280)" }}>No songs yet. Upload your first track to get started.</p>
              <Link href="/upload">
                <Button style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>Upload Your First Track</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {songs.map((song: any, idx: number) => (
                <div key={song.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                  <span className="text-xs w-5 text-center" style={{ color: "oklch(0.45 0.03 280)" }}>{idx + 1}</span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "oklch(0.16 0.02 280)" }}>
                    {song.coverArtUrl ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" /> : <Music className="w-4 h-4 opacity-40" style={{ color: "oklch(0.75 0.18 85)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {song.genre && <span className="text-xs" style={{ color: "oklch(0.55 0.04 280)" }}>{song.genre}</span>}
                      {song.witnessId && <Badge className="text-xs px-1 py-0" style={{ background: "oklch(0.65 0.2 300 / 0.2)", color: "oklch(0.65 0.2 300)", fontSize: "9px" }}>WID</Badge>}
                      {song.aiConsent === "prohibited" && <Badge className="text-xs px-1 py-0" style={{ background: "oklch(0.65 0.18 25 / 0.2)", color: "oklch(0.65 0.18 25)", fontSize: "9px" }}>AI PROHIBITED</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>
                    <span>{song.playCount || 0} plays</span>
                    <span>{song.tipCount || 0} tips</span>
                  </div>
                  <div className="flex items-center gap-1">
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
