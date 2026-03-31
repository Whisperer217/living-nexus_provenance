import { useState, useEffect, useRef } from "react";
import { ImagePositioner } from "@/components/ImagePositioner";
import { EditTrackPanel } from "@/components/EditTrackPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Music, Upload, DollarSign, Shield, Trash2, ExternalLink,
  BarChart2, CheckCircle, AlertCircle, Wand2, Clock, CheckCircle2,
  XCircle, Download, Play, Activity, MessageCircle, Zap, Gift,
  Library, RefreshCw, FileArchive, PackageOpen, Camera, X,
  TrendingUp, Heart, LineChart, Pencil
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

type Tab = "songs" | "transforms" | "activity" | "earnings" | "collections" | "archive" | "analytics";

interface BatchTrack {
  id: number;
  title: string;
  witnessId: string | null;
  hasCertificate: boolean;
  hasAudio: boolean;
}

interface BatchInfo {
  index: number;
  start: number;
  end: number;
  trackCount: number;
  tracks: BatchTrack[];
}

interface BatchInfoResponse {
  totalTracks: number;
  batchSize: number;
  batches: BatchInfo[];
}

// Pre-onboarding checklist items creators need to have ready
const ONBOARDING_CHECKLIST = [
  { icon: "🪪", label: "Government-issued photo ID", detail: "Passport, driver's license, or state ID" },
  { icon: "🏦", label: "Bank account details", detail: "Routing number + checking account number" },
  { icon: "🔢", label: "Last 4 digits of your SSN", detail: "Or full SSN/Tax ID for higher volume accounts" },
  { icon: "📍", label: "Your home address", detail: "Street, city, state, ZIP" },
  { icon: "📱", label: "Phone number", detail: "For identity verification" },
  { icon: "📧", label: "Email address", detail: "Already pre-filled from your Living Nexus account" },
];

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("songs");
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);

  const { data: songs, refetch: refetchSongs } = trpc.songs.mySongs.useQuery(undefined, { enabled: isAuthenticated });
  const { data: transforms } = trpc.songs.getMyTransforms.useQuery(undefined, { enabled: isAuthenticated && activeTab === "transforms" });
  const { data: activityEvents, isLoading: activityLoading } = trpc.events.getForCreator.useQuery(
    { limit: 200 },
    { enabled: isAuthenticated && activeTab === "activity", refetchInterval: 30_000 }
  );
  const { data: licenseData } = trpc.licenses.myStatus.useQuery(undefined, { enabled: isAuthenticated });
  const { data: connectData } = trpc.tips.connectStatus.useQuery(undefined, { enabled: isAuthenticated });
  const { data: earningsData, isLoading: earningsLoading } = trpc.jukebox.getMyEarnings.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "earnings" }
  );
  const { data: myCollections, isLoading: collectionsLoading, refetch: refetchCollections } = trpc.songs.getMyCollections.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "collections" }
  );
  const { data: analyticsData, isLoading: analyticsLoading } = trpc.profile.myAnalytics.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "analytics" }
  );

  const regenCertMutation = trpc.songs.generateCollectionCertificate.useMutation({
    onSuccess: (data: { pdfUrl: string; collectionWid: string }) => {
      toast.success("Certificate regenerated!");
      window.open(data.pdfUrl, "_blank");
      refetchCollections();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ── Collection cover art state ──────────────────────────────────────────
  const [collectionCoverState, setCollectionCoverState] = useState<{
    collectionId: number;
    currentUrl: string | null;
    pendingUrl: string | null;
    position: { x: number; y: number };
  } | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const uploadCollectionCover = trpc.songs.uploadCollectionCover.useMutation({
    onSuccess: () => { refetchCollections(); toast.success("Collection cover updated"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const updateCollectionCoverPosition = trpc.songs.updateCollectionCoverPosition.useMutation({
    onSuccess: () => { refetchCollections(); toast.success("Collection cover position saved"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  async function handleCollectionCoverFile(e: React.ChangeEvent<HTMLInputElement>, collectionId: number, currentUrl: string | null, currentPos: { x: number; y: number }) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Cover must be under 5MB"); return; }
    const objectUrl = URL.createObjectURL(file);
    setCollectionCoverState({ collectionId, currentUrl, pendingUrl: objectUrl, position: currentPos });
    (coverInputRef.current as any)._pendingFile = file;
    (coverInputRef.current as any)._collectionId = collectionId;
  }
  async function confirmCollectionCoverUpload(pos: { x: number; y: number }) {
    const file = (coverInputRef.current as any)?._pendingFile as File | undefined;
    const colId = (coverInputRef.current as any)?._collectionId as number | undefined;
    if (!file || !colId) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadCollectionCover.mutateAsync({ collectionId: colId, base64, mimeType: file.type });
      await updateCollectionCoverPosition.mutateAsync({ collectionId: colId, coverPositionX: pos.x, coverPositionY: pos.y });
    };
    reader.readAsDataURL(file);
    if (collectionCoverState?.pendingUrl) URL.revokeObjectURL(collectionCoverState.pendingUrl);
    setCollectionCoverState(null);
  }
  async function saveCollectionCoverPosition(pos: { x: number; y: number }) {
    if (!collectionCoverState) return;
    await updateCollectionCoverPosition.mutateAsync({ collectionId: collectionCoverState.collectionId, coverPositionX: pos.x, coverPositionY: pos.y });
    setCollectionCoverState(null);
  }

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

        {/* Pre-Onboarding Checklist Modal */}
        <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
          <DialogContent style={{ background: "oklch(0.1 0.03 280)", border: "1px solid oklch(0.25 0.03 280)", color: "oklch(0.95 0.02 85)" }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}>
                Before You Start — Have These Ready
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm mb-4" style={{ color: "oklch(0.7 0.04 280)" }}>
              Stripe's verification takes about 5 minutes. Having these items ready prevents interruptions.
            </p>
            <div className="space-y-3">
              {ONBOARDING_CHECKLIST.map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "oklch(0.13 0.04 280)" }}>
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "oklch(0.9 0.02 85)" }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.6 0.04 280)" }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" style={{ background: "oklch(0.2 0.02 280)" }} />
            <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.04 280)" }}>
              Living Nexus uses Stripe Connect for secure payouts. Your information goes directly to Stripe — we never store your SSN or bank details.
            </p>
            <Button
              className="w-full font-bold"
              onClick={() => { setShowChecklist(false); connectMutation.mutate({ returnUrl: `${window.location.origin}/dashboard` }); }}
              disabled={connectMutation.isPending}
              style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
            >
              {connectMutation.isPending ? "Opening Stripe..." : "I'm Ready — Start Setup"}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Stripe Setup Banner — shown when gifts account is pending or not connected */}
        {(connectData?.status === "pending" || connectData?.status === "not_connected") && (
          <div
            className="w-full rounded-xl mb-6 overflow-hidden"
            style={{ border: "1px solid oklch(0.75 0.18 85)" }}
          >
            {/* Top row: main call to action */}
            <div
              className="flex items-center justify-between gap-4 px-4 py-3"
              style={{ background: "oklch(0.84 0.155 85)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.15 0.03 280)" }} />
                <span className="text-sm font-semibold leading-snug" style={{ color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}>
                  {connectData?.status === "pending"
                    ? "Your gift account is incomplete. Finish setup to receive gifts."
                    : "Enable gifts to start receiving direct payments from fans."}
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => connectData?.status === "not_connected" ? setShowChecklist(true) : connectMutation.mutate({ returnUrl: `${window.location.origin}/dashboard` })}
                disabled={connectMutation.isPending}
                className="flex-shrink-0 font-bold text-sm"
                style={{ background: "oklch(0.08 0.015 280)", color: "oklch(0.84 0.155 85)", border: "none" }}
              >
                {connectMutation.isPending ? "Loading..." : connectData?.status === "pending" ? "Complete Setup" : "Enable Gifts"}
              </Button>
            </div>
            {/* Bottom row: plain-English requirements when pending */}
            {connectData?.status === "pending" && connectData?.requirementsLabels && connectData.requirementsLabels.length > 0 && (
              <div className="px-4 py-3" style={{ background: "oklch(0.1 0.03 280)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.65 0.18 45)" }}>Still needed to activate your account:</p>
                <div className="flex flex-wrap gap-2">
                  {(connectData.requirementsLabels as string[]).map((label: string) => (
                    <span
                      key={label}
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ background: "oklch(0.65 0.18 45 / 0.15)", color: "oklch(0.75 0.15 45)", border: "1px solid oklch(0.65 0.18 45 / 0.3)" }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Songs Published", value: songs?.length ?? 0, icon: Music, color: "oklch(0.84 0.155 85)" },
            { label: "Total Plays", value: (songs ?? []).reduce((a: number, s: any) => a + (s.playCount || 0), 0), icon: BarChart2, color: "oklch(0.65 0.2 300)" },
            { label: "Song Slots", value: `${slotsUsed}/${slotsTotal}`, icon: Shield, color: "oklch(0.65 0.18 145)" },
            { label: "Gifts Received", value: (songs ?? []).reduce((a: number, s: any) => a + (s.tipCount || 0), 0), icon: Gift, color: "oklch(0.55 0.18 160)" },
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
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Gift Payments</h3>
            </div>
            {tipsEnabled ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.18 145)" }} />
                <span className="text-sm" style={{ color: "oklch(0.65 0.18 145)" }}>Gifts Enabled — 90% to you</span>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>
                  {connectData?.status === "pending"
                    ? "Stripe verification in progress."
                    : "Enable gifts to receive direct payments from fans. 90% goes to you, 10% to the platform."}
                </p>
                {/* Show specific missing requirements when pending */}
                {connectData?.status === "pending" && connectData?.requirementsLabels && connectData.requirementsLabels.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold mb-1" style={{ color: "oklch(0.65 0.18 45)" }}>Still needed:</p>
                    <ul className="space-y-0.5">
                      {(connectData.requirementsLabels as string[]).slice(0, 3).map((label: string) => (
                        <li key={label} className="text-xs flex items-center gap-1" style={{ color: "oklch(0.7 0.12 45)" }}>
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />{label}
                        </li>
                      ))}
                      {(connectData.requirementsLabels as string[]).length > 3 && (
                        <li className="text-xs" style={{ color: "oklch(0.55 0.04 280)" }}>+{(connectData.requirementsLabels as string[]).length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <Button
                  size="sm" className="w-full" variant="outline"
                  onClick={() => connectData?.status === "not_connected" ? setShowChecklist(true) : connectMutation.mutate({ returnUrl: `${window.location.origin}/dashboard` })}
                  disabled={connectMutation.isPending}
                  style={{ borderColor: "oklch(0.65 0.18 145 / 0.5)", color: "oklch(0.65 0.18 145)" }}
                >
                  {connectMutation.isPending ? "Loading..." : connectData?.status === "pending" ? "Continue Setup" : "Enable Gifts"}
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
          <button
            onClick={() => setActiveTab("earnings")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "earnings" ? "oklch(0.55 0.18 160)" : "transparent",
              color: activeTab === "earnings" ? "white" : "oklch(0.6 0.04 280)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Gift className="w-4 h-4" />
            Jukebox Earnings
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "collections" ? "oklch(0.84 0.155 85 / 0.15)" : "transparent",
              color: activeTab === "collections" ? "oklch(0.84 0.155 85)" : "oklch(0.6 0.04 280)",
              border: activeTab === "collections" ? "1px solid oklch(0.84 0.155 85 / 0.4)" : "1px solid transparent",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Library className="w-4 h-4" />
            Collections
            {myCollections?.length ? <span className="text-xs opacity-70">({myCollections.length})</span> : null}
          </button>
          <button
            onClick={() => setActiveTab("archive")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "archive" ? "oklch(0.55 0.18 220 / 0.2)" : "transparent",
              color: activeTab === "archive" ? "oklch(0.7 0.15 220)" : "oklch(0.6 0.04 280)",
              border: activeTab === "archive" ? "1px solid oklch(0.55 0.18 220 / 0.4)" : "1px solid transparent",
              fontFamily: "'Cinzel', serif",
            }}
          >
             <FileArchive className="w-4 h-4" />
            Archive
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "analytics" ? "oklch(0.55 0.18 260 / 0.2)" : "transparent",
              color: activeTab === "analytics" ? "oklch(0.75 0.15 260)" : "oklch(0.6 0.04 280)",
              border: activeTab === "analytics" ? "1px solid oklch(0.55 0.18 260 / 0.4)" : "1px solid transparent",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <LineChart className="w-4 h-4" />
            Analytics
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
                        {song.coverArtUrl ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${(song as any).coverPositionX ?? 50}% ${(song as any).coverPositionY ?? 50}%` }} /> : <Music className="w-4 h-4 opacity-40" style={{ color: "oklch(0.84 0.155 85)" }} />}
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
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#D4AF37]/10"
                          title="Edit track (cover art, metadata, position)"
                          onClick={() => setEditingSong(song)}
                        >
                          <Pencil className="w-3 h-3" style={{ color: "oklch(0.84 0.155 85)" }} />
                        </button>
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
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>All interactions on your songs — gifts, comments, and witnesses. Auto-refreshes every 30s.</p>
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
                <p className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>Gifts, comments, and witnesses on your songs will appear here.</p>
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
                            {isTip ? `$${((payload.amount ?? 0) / 100).toFixed(2)} Gift` :
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
        {/* Jukebox Earnings Tab */}
        {activeTab === "earnings" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Jukebox Earnings</h2>
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>Your proportional share from offerings left in jukebox rooms where your songs played.</p>
              </div>
            </div>
            {earningsLoading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
              </div>
            ) : !earningsData?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.55 0.18 160)" }} />
                <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No jukebox earnings yet.</p>
                <p className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>When fans leave offerings in rooms where your songs play, your share appears here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary */}
                <div className="rounded-xl p-4 mb-2" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.55 0.18 160 / 0.3)" }}>
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5" style={{ color: "oklch(0.55 0.18 160)" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
                        Total Earned: ${((earningsData as any[]).reduce((sum: number, r: any) => sum + r.earnedCents, 0) / 100).toFixed(2)}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.6 0.04 280)" }}>
                        Across {(earningsData as any[]).length} room{(earningsData as any[]).length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Per-room rows */}
                {(earningsData as any[]).map((row: any) => (
                  <div key={row.roomCode} className="rounded-xl p-4" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
                          Room #{row.roomCode}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.6 0.04 280)" }}>
                          {row.creatorPlays} of {row.totalPlays} plays · ${(row.totalOfferingsCents / 100).toFixed(2)} total offerings
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold" style={{ color: "oklch(0.55 0.18 160)", fontFamily: "'Cinzel', serif" }}>
                          +${(row.earnedCents / 100).toFixed(2)}
                        </p>
                        <p className="text-[10px]" style={{ color: "oklch(0.4 0.03 280)" }}>
                          {row.totalPlays > 0 ? Math.round((row.creatorPlays / row.totalPlays) * 100) : 0}% of room
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-[11px] text-center mt-4" style={{ color: "oklch(0.4 0.03 280)" }}>
                  Payouts are processed monthly. Connect Stripe to receive direct transfers.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>My Collections</h2>
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>Albums and batch-registered works with a collective Witness ID binding all tracks together.</p>
              </div>
              <Link href="/batch-upload">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}
                >
                  <Upload className="w-3 h-3" /> New Collection
                </button>
              </Link>
            </div>
            {collectionsLoading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
              </div>
            ) : !myCollections?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
                <Library className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
                <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No collections yet.</p>
                <p className="text-xs mb-4" style={{ color: "oklch(0.4 0.03 280)" }}>Upload an album or batch of songs to generate a Collection WID that binds all works into one origin record.</p>
                <Link href="/batch-upload">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}
                  >
                    Upload Your First Collection
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Hidden file input for collection cover upload */}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const col = (coverInputRef.current as any)?._activeCol;
                    if (col) handleCollectionCoverFile(e, col.id, col.coverArtUrl ?? null, { x: col.coverPositionX ?? 50, y: col.coverPositionY ?? 50 });
                  }}
                />
                {(myCollections as any[]).map((col: any) => (
                  <div
                    key={col.id}
                    className="rounded-xl p-5"
                    style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.84 0.155 85 / 0.25)" }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Cover art thumbnail */}
                      <div
                        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group relative cursor-pointer"
                        style={{ border: "1px solid oklch(0.84 0.155 85 / 0.3)", background: "oklch(0.09 0.02 280)" }}
                        onClick={() => {
                          if (col.coverArtUrl) {
                            setCollectionCoverState({ collectionId: col.id, currentUrl: col.coverArtUrl, pendingUrl: null, position: { x: col.coverPositionX ?? 50, y: col.coverPositionY ?? 50 } });
                          } else {
                            (coverInputRef.current as any)._activeCol = col;
                            coverInputRef.current?.click();
                          }
                        }}
                      >
                        {col.coverArtUrl ? (
                          <>
                            <img
                              src={col.coverArtUrl}
                              alt={col.name}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: `${col.coverPositionX ?? 50}% ${col.coverPositionY ?? 50}%` }}
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
                              <Camera className="w-3.5 h-3.5 text-white" />
                              <span className="text-white text-[8px]">Edit</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                            <Camera className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85 / 0.5)" }} />
                            <span className="text-[8px]" style={{ color: "oklch(0.84 0.155 85 / 0.5)" }}>Add Cover</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
                          {col.name}
                        </p>
                        <p className="text-xs font-mono mb-2" style={{ color: "oklch(0.84 0.155 85)" }}>
                          {col.collectionWid}
                        </p>
                        <p className="text-xs mb-3" style={{ color: "oklch(0.5 0.04 280)" }}>
                          {col.trackCount ?? "?"} tracks &middot; Registered {new Date(col.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] font-mono break-all" style={{ color: "oklch(0.38 0.02 280)" }}>
                          Hash: {col.collectiveHash?.slice(0, 32)}…
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {col.coverArtUrl && (
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                            style={{ border: "1px solid oklch(0.84 0.155 85 / 0.3)", color: "oklch(0.84 0.155 85 / 0.8)", background: "transparent" }}
                            onClick={() => { (coverInputRef.current as any)._activeCol = col; coverInputRef.current?.click(); }}
                          >
                            <Camera className="w-3 h-3" /> Change Cover
                          </button>
                        )}
                        <a href={`/verify/${col.collectionWid}`} target="_blank" rel="noopener noreferrer">
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                            style={{ border: "1px solid oklch(0.84 0.155 85 / 0.5)", color: "oklch(0.84 0.155 85)", background: "transparent" }}
                          >
                            <ExternalLink className="w-3 h-3" /> Verify
                          </button>
                        </a>
                        {col.pdfUrl && (
                          <a href={col.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                              style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
                            >
                              <Download className="w-3 h-3" /> Certificate
                            </button>
                          </a>
                        )}
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                          style={{ border: "1px solid oklch(0.3 0.02 280)", color: "oklch(0.55 0.04 280)", background: "transparent" }}
                          onClick={() => regenCertMutation.mutate({ collectionWid: col.collectionWid })}
                          disabled={regenCertMutation.isPending}
                          title="Regenerate Certificate"
                        >
                          <RefreshCw className={`w-3 h-3 ${regenCertMutation.isPending ? 'animate-spin' : ''}`} />
                          {regenCertMutation.isPending ? "Regenerating…" : "↻ Regen Cert"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Collection cover inline repositioner */}
            {collectionCoverState && (collectionCoverState.pendingUrl || collectionCoverState.currentUrl) && (
              <ImagePositioner
                imageUrl={(collectionCoverState.pendingUrl || collectionCoverState.currentUrl)!}
                initialX={collectionCoverState.position.x}
                initialY={collectionCoverState.position.y}
                previewHeight="12rem"
                label={collectionCoverState.pendingUrl ? "Set Collection Cover Position" : "Reposition Collection Cover"}
                onSave={collectionCoverState.pendingUrl ? confirmCollectionCoverUpload : saveCollectionCoverPosition}
                onCancel={() => {
                  if (collectionCoverState.pendingUrl) URL.revokeObjectURL(collectionCoverState.pendingUrl);
                  setCollectionCoverState(null);
                }}
              />
            )}
          </div>
        )}

        {/* Archive Tab */}
        {activeTab === "archive" && (
          <ArchiveTab />
        )}
        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Creator Analytics</h2>
              <p className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>All-time data · Updated in real time</p>
            </div>
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "oklch(0.75 0.15 260)", borderTopColor: "transparent" }} />
              </div>
            ) : !analyticsData ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
                <LineChart className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.75 0.15 260)" }} />
                <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>No analytics data available yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Plays", value: analyticsData.totalPlays, icon: Play, color: "oklch(0.84 0.155 85)" },
                    { label: "Total Likes", value: analyticsData.totalLikes, icon: Heart, color: "oklch(0.65 0.2 25)" },
                    { label: "Gifts Received", value: analyticsData.totalGiftsReceived, icon: Gift, color: "oklch(0.55 0.18 160)" },
                    { label: "Downloads", value: analyticsData.totalDownloads, icon: Download, color: "oklch(0.65 0.18 220)" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-xl p-4" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.02 280)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>{label}</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color }}>{value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                {/* 30-day activity trend */}
                <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.02 280)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.75 0.15 260)" }} />
                    <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>30-Day Activity Trend</h3>
                    <span className="text-xs ml-auto" style={{ color: "oklch(0.5 0.03 280)" }}>Likes · Gifts · Comments · Witnesses</span>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={analyticsData.playTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.75 0.15 260)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="oklch(0.75 0.15 260)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0.02 280)" />
                      <XAxis dataKey="date" tick={{ fill: "oklch(0.45 0.03 280)", fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fill: "oklch(0.45 0.03 280)", fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "oklch(0.1 0.03 280)", border: "1px solid oklch(0.25 0.02 280)", borderRadius: "8px", color: "oklch(0.9 0.02 85)" }} />
                      <Area type="monotone" dataKey="plays" stroke="oklch(0.75 0.15 260)" fill="url(#analyticsGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Plays by track */}
                {analyticsData.playsByTrack.filter((t: { plays: number }) => t.plays > 0).length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.02 280)" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Play className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85)" }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Plays by Track</h3>
                    </div>
                    <div className="space-y-2">
                      {[...analyticsData.playsByTrack].sort((a, b) => b.plays - a.plays).slice(0, 10).map((track) => (
                        <div key={track.trackId} className="flex items-center gap-3">
                          <span className="text-xs flex-1 truncate" style={{ color: "oklch(0.7 0.04 280)" }}>{track.title}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, Math.round((track.plays / Math.max(...analyticsData.playsByTrack.map((t: { plays: number }) => t.plays), 1)) * 120))}px`, background: "oklch(0.84 0.155 85)" }} />
                            <span className="text-xs font-mono w-8 text-right" style={{ color: "oklch(0.84 0.155 85)" }}>{track.plays}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Likes by track */}
                {analyticsData.likesByTrack.filter((t: { likes: number }) => t.likes > 0).length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.02 280)" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-4 h-4" style={{ color: "oklch(0.65 0.2 25)" }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Likes by Track</h3>
                    </div>
                    <div className="space-y-2">
                      {[...analyticsData.likesByTrack].sort((a, b) => b.likes - a.likes).slice(0, 10).map((track) => (
                        <div key={track.trackId} className="flex items-center gap-3">
                          <span className="text-xs flex-1 truncate" style={{ color: "oklch(0.7 0.04 280)" }}>{track.title}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, Math.round((track.likes / Math.max(...analyticsData.likesByTrack.map((t: { likes: number }) => t.likes), 1)) * 120))}px`, background: "oklch(0.65 0.2 25)" }} />
                            <span className="text-xs font-mono w-8 text-right" style={{ color: "oklch(0.65 0.2 25)" }}>{track.likes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Gifts by track */}
                {analyticsData.giftsByTrack.filter((t: { giftCount: number }) => t.giftCount > 0).length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.02 280)" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Gift className="w-4 h-4" style={{ color: "oklch(0.55 0.18 160)" }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Gifts by Track</h3>
                    </div>
                    <div className="space-y-2">
                      {[...analyticsData.giftsByTrack].sort((a, b) => b.giftCount - a.giftCount).slice(0, 10).map((track) => (
                        <div key={track.trackId} className="flex items-center gap-3">
                          <span className="text-xs flex-1 truncate" style={{ color: "oklch(0.7 0.04 280)" }}>{track.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: "oklch(0.55 0.18 160)" }}>{track.giftCount} gift{track.giftCount !== 1 ? 's' : ''}</span>
                            <span className="text-xs font-mono" style={{ color: "oklch(0.65 0.18 145)" }}>${(track.totalAmount / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Total gifts revenue */}
                {analyticsData.totalAmountReceived > 0 && (
                  <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: "oklch(0.55 0.18 160 / 0.08)", border: "1px solid oklch(0.55 0.18 160 / 0.3)" }}>
                    <DollarSign className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.55 0.18 160)" }} />
                    <div>
                      <p className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>Total Gift Revenue (gross)</p>
                      <p className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.65 0.18 145)" }}>${(analyticsData.totalAmountReceived / 100).toFixed(2)}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>Your cut (90%)</p>
                      <p className="text-lg font-bold" style={{ color: "oklch(0.84 0.155 85)" }}>${(analyticsData.totalAmountReceived * 0.9 / 100).toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* ── Edit Track Panel ───────────────────────────────────────── */}
      {editingSong && (
        <EditTrackPanel
          song={editingSong}
          onClose={() => setEditingSong(null)}
          onSaved={() => {
            setEditingSong(null);
            refetchSongs();
          }}
        />
      )}
    </div>
   );
}
// ─── Archive Tab Component ────────────────────────────────────────────────────
function ArchiveTab() {
  const [batchInfo, setBatchInfo] = useState<BatchInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

  // Fetch batch info on mount
  useEffect(() => {
    fetch("/api/download/batch-info", { credentials: "include" })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.error ?? "Failed to load archive"));
        return r.json();
      })
      .then((data: BatchInfoResponse) => { setBatchInfo(data); setLoading(false); })
      .catch((e: string) => { setError(e); setLoading(false); });
  });

  const downloadBatch = async (batchIndex: number) => {
    setDownloading(batchIndex);
    try {
      const resp = await fetch(`/api/download/batch/${batchIndex}`, { credentials: "include" });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Download failed" }));
        throw new Error(err.error ?? "Download failed");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = resp.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] ?? `LivingNexus_Archive_Batch${batchIndex + 1}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Download failed";
      alert(msg);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return (
    <div className="text-center py-16">
      <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
      <p className="text-sm mt-3" style={{ color: "oklch(0.6 0.04 280)" }}>Loading your archive…</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.65 0.18 25 / 0.4)" }}>
      <FileArchive className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "oklch(0.65 0.18 25)" }} />
      <p className="text-sm" style={{ color: "oklch(0.65 0.18 25)" }}>{error}</p>
    </div>
  );

  if (!batchInfo || batchInfo.totalTracks === 0) return (
    <div className="text-center py-16 rounded-xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px dashed oklch(0.25 0.02 280)" }}>
      <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "oklch(0.7 0.15 220)" }} />
      <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No tracks in your archive yet.</p>
      <p className="text-xs" style={{ color: "oklch(0.4 0.03 280)" }}>Upload songs to build your archive. Each batch of up to 10 tracks can be downloaded as a ZIP with ID3-tagged audio and WID certificates.</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Download My Archive</h2>
          <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>
            {batchInfo.totalTracks} track{batchInfo.totalTracks !== 1 ? "s" : ""} across {batchInfo.batches.length} batch{batchInfo.batches.length !== 1 ? "es" : ""}.
            Each ZIP includes ID3-tagged audio with embedded WID metadata and provenance certificates.
          </p>
        </div>
      </div>

      {/* Info callout */}
      <div
        className="rounded-xl p-4 mb-6 flex gap-3 items-start"
        style={{ background: "oklch(0.55 0.18 220 / 0.08)", border: "1px solid oklch(0.55 0.18 220 / 0.25)" }}
      >
        <FileArchive className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.7 0.15 220)" }} />
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: "oklch(0.85 0.08 220)", fontFamily: "'Cinzel', serif" }}>Your WID travels with every file</p>
          <p className="text-xs" style={{ color: "oklch(0.6 0.04 280)" }}>
            Every downloaded MP3 has your Witness ID embedded in its ID3 tags (TXXX:LNWID, TXXX:LN_VERIFY_URL).
            The ZIP also includes your WID certificate PDFs so provenance is always bundled with the music.
          </p>
        </div>
      </div>

      {/* Batch list */}
      <div className="space-y-4">
        {batchInfo.batches.map((batch) => (
          <div
            key={batch.index}
            className="rounded-xl overflow-hidden"
            style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.2 0.015 280)" }}
          >
            {/* Batch header row */}
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(0.55 0.18 220 / 0.15)", border: "1px solid oklch(0.55 0.18 220 / 0.3)" }}
                >
                  <FileArchive className="w-5 h-5" style={{ color: "oklch(0.7 0.15 220)" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
                    Batch {batch.index + 1}
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.55 0.04 280)" }}>
                    Tracks {batch.start}–{batch.end} &middot; {batch.trackCount} file{batch.trackCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: "oklch(0.55 0.04 280)", background: "transparent" }}
                  onClick={() => setExpandedBatch(expandedBatch === batch.index ? null : batch.index)}
                >
                  {expandedBatch === batch.index ? "▲ Hide" : "▼ Tracks"}
                </button>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: downloading === batch.index ? "oklch(0.55 0.18 220 / 0.3)" : "oklch(0.55 0.18 220)",
                    color: "white",
                    fontFamily: "'Cinzel', serif",
                    opacity: downloading !== null && downloading !== batch.index ? 0.5 : 1,
                    cursor: downloading !== null && downloading !== batch.index ? "not-allowed" : "pointer",
                  }}
                  onClick={() => downloadBatch(batch.index)}
                  disabled={downloading !== null}
                >
                  {downloading === batch.index ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Zipping…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download ZIP
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Expandable track list */}
            {expandedBatch === batch.index && (
              <div style={{ borderTop: "1px solid oklch(0.18 0.015 280)" }}>
                {batch.tracks.map((track, ti) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      borderBottom: ti < batch.tracks.length - 1 ? "1px solid oklch(0.15 0.01 280)" : "none",
                    }}
                  >
                    <span className="text-xs w-5 text-right flex-shrink-0" style={{ color: "oklch(0.38 0.02 280)" }}>
                      {batch.start + ti}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "oklch(0.85 0.02 85)" }}>{track.title}</p>
                      {track.witnessId && (
                        <p className="text-[10px] font-mono" style={{ color: "oklch(0.84 0.155 85 / 0.7)" }}>{track.witnessId}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {track.hasAudio && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.55 0.18 145 / 0.15)", color: "oklch(0.65 0.18 145)" }}>MP3</span>
                      )}
                      {track.hasCertificate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "oklch(0.84 0.155 85 / 0.12)", color: "oklch(0.84 0.155 85)" }}>WID</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
   );
}
// ─── Archive Tab Component