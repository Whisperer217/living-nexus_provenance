import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getWIDSnapshots, clearWIDSnapshots, type WIDSnapshot } from "@/lib/lnxCache";
import { DashboardErrorCard } from "@/components/DashboardErrorCard";
import { WIDPanel } from "@/components/WIDPanel";
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
  TrendingUp, Heart, LineChart, Pencil, Fingerprint, BookOpen, FileText, Image, Bell
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

type Tab = "songs" | "transforms" | "activity" | "collections" | "archive" | "analytics" | "widcache" | "discord";

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

  const { data: songs, refetch: refetchSongs, error: songsError } = trpc.songs.mySongs.useQuery(undefined, { enabled: isAuthenticated, retry: 1 });
  const { data: transforms, error: transformsError, refetch: refetchTransforms } = trpc.songs.getMyTransforms.useQuery(undefined, { enabled: isAuthenticated && activeTab === "transforms", retry: 1 });
  const { data: activityEvents, isLoading: activityLoading, error: activityError, refetch: refetchActivity } = trpc.events.getForCreator.useQuery(
    { limit: 200 },
    { enabled: isAuthenticated && activeTab === "activity", refetchInterval: 30_000, retry: 1 }
  );
  const { data: licenseData, error: licenseError, refetch: refetchLicense } = trpc.licenses.myStatus.useQuery(undefined, { enabled: isAuthenticated, retry: 1 });
  const { data: connectData, error: connectError, refetch: refetchConnect } = trpc.tips.connectStatus.useQuery(undefined, { enabled: isAuthenticated, retry: 1 });
  const { data: myCollections, isLoading: collectionsLoading, refetch: refetchCollections, error: collectionsError } = trpc.songs.getMyCollections.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "collections", retry: 1 }
  );
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError, refetch: refetchAnalytics } = trpc.profile.myAnalytics.useQuery(
    undefined,
    { enabled: isAuthenticated && activeTab === "analytics", retry: 1 }
  );

  // Living Pulse — activity deltas and unread counts
  const { data: dashboardDeltas, refetch: refetchDeltas } = trpc.notifications.dashboardDeltas.useQuery(
    undefined, { enabled: isAuthenticated, staleTime: 30_000 }
  );
  const { data: newEventCount = 0, refetch: refetchEventCount } = trpc.notifications.newEventCount.useQuery(
    undefined, { enabled: isAuthenticated, staleTime: 30_000 }
  );
  const touchActivityMutation = trpc.notifications.touchActivity.useMutation({
    onSuccess: () => { refetchEventCount(); }
  });
  const touchDashboardMutation = trpc.notifications.touchDashboard.useMutation({
    onSuccess: () => { refetchDeltas(); }
  });

  // Touch dashboard on first load to reset deltas (runs once when authenticated)
  const dashboardTouchedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !dashboardTouchedRef.current) {
      dashboardTouchedRef.current = true;
      const t = setTimeout(() => touchDashboardMutation.mutate(), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

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
    Draft: "var(--lnx-orange)",
    Published: "var(--lnx-green)",
    Unlisted: "var(--ln-gold)",
    Deleted: "var(--lnx-red)",
  }[s] ?? "var(--ln-smoke)");
  const licenseMutation = trpc.livingArchive.purchaseLicenseOneTime.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) window.open(data.url, "_blank"); toast.info("Redirecting to checkout..."); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const slotsMutation = trpc.livingArchive.purchaseSlotPackage.useMutation({
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#111009" }}>
      <div className="text-center">
        <p style={{ color: "var(--ln-smoke)" }}>Please sign in to access your dashboard.</p>
        <Link href="/"><Button className="mt-4" style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>Go Home</Button></Link>
      </div>
    </div>
  );

  // Top-level no-works onboarding: songs loaded (not undefined) and is empty
  const songsLoaded = songs !== undefined && !songsError;
  const hasNoWorks = songsLoaded && songs.length === 0;

  const slotsUsed = licenseData?.songSlotsUsed ?? 0;
  const slotsTotal = licenseData?.songSlotsTotal ?? 1;
  const slotsPercent = Math.min(100, Math.round((slotsUsed / slotsTotal) * 100));
  const isLicensed = licenseData?.licenseStatus === "licensed";
  const tipsEnabled = connectData?.status === "enabled";

  const transformStatusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 className="w-4 h-4" style={{ color: "var(--lnx-green)" }} />;
      case "failed": return <XCircle className="w-4 h-4" style={{ color: "var(--lnx-red)" }} />;
      case "processing": return <Clock className="w-4 h-4" style={{ color: "var(--lnx-orange)" }} />;
      default: return <Clock className="w-4 h-4" style={{ color: "#E2E8F0" }} />;
    }
  };

  const transformStatusLabel = (status: string) => {
    switch (status) {
      case "success": return { label: "Complete", color: "var(--lnx-green)" };
      case "failed": return { label: "Failed", color: "var(--lnx-red)" };
      case "processing": return { label: "Processing", color: "var(--lnx-orange)" };
      default: return { label: "Pending", color: "#E2E8F0" };
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#111009" }}>
      {/* ── Hero Banner ─────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden" style={{ height: "200px" }}>
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663123503966/QMYidsbNvjTIbevK.png"
          alt="Dashboard hero"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: "saturate(1.2) contrast(1.08)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(20,10,30,0.82) 0%, rgba(30,16,40,0.45) 45%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(53,62,67,0.85) 0%, rgba(53,62,67,0.15) 40%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 p-6">
          <p className="text-xs mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)", letterSpacing: "0.18em" }}>LIVING NEXUS</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)", textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>Creator Dashboard</h1>
        </div>
      </div>
      <div className="container py-10" style={{ paddingBottom: "calc(100px + env(safe-area-inset-bottom, 0px))" }}>

        {/* ── 3-Step Onboarding Checklist (shown when user has no works) ── */}
        {hasNoWorks && (() => {
          const hasHandle = !!(user as any)?.artistHandle;
          const steps = [
            {
              num: 1,
              label: "Sign in to Living Nexus",
              done: true,
              cta: null as React.ReactNode,
            },
            {
              num: 2,
              label: "Set your artist handle",
              done: hasHandle,
              cta: !hasHandle ? (
                <Link href="/profile">
                  <button
                    type="button"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:brightness-110 flex-shrink-0"
                    style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}
                  >
                    Set Handle
                  </button>
                </Link>
              ) : null,
            },
            {
              num: 3,
              label: "Upload your first work and receive your WID",
              done: false,
              cta: (
                <Link href="/upload">
                  <button
                    type="button"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:brightness-110 flex-shrink-0"
                    style={{ background: "var(--ln-gold)", color: "var(--ln-coal)", border: "none" }}
                  >
                    Upload &amp; Witness
                  </button>
                </Link>
              ),
            },
          ];
          return (
            <div
              className="mb-8 rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(196,154,40,0.06), rgba(17,16,9,0.9))",
                border: "1px solid rgba(196,154,40,0.22)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Shield size={14} style={{ color: "var(--ln-gold)" }} />
                <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--ln-gold)" }}>Getting Started</p>
              </div>
              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.num}
                    className="flex items-center gap-4 rounded-xl px-4 py-3"
                    style={{
                      background: step.done ? "rgba(196,154,40,0.06)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${step.done ? "rgba(196,154,40,0.2)" : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        background: step.done ? "rgba(196,154,40,0.18)" : "rgba(255,255,255,0.06)",
                        color: step.done ? "var(--ln-gold)" : "#6b7280",
                        border: `1px solid ${step.done ? "rgba(196,154,40,0.35)" : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      {step.done ? <CheckCircle size={13} /> : step.num}
                    </div>
                    <p
                      className="flex-1 text-sm"
                      style={{ color: step.done ? "var(--ln-smoke)" : "var(--ln-parchment)", textDecoration: step.done ? "line-through" : "none" }}
                    >
                      {step.label}
                    </p>
                    {!step.done && step.cta}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: "#4b5563" }}>
                Every work you upload receives a cryptographic Witness ID — your permanent, immutable proof of origin.
              </p>
            </div>
          );
        })()}

        {/* Action buttons */}
        <div className="flex items-center justify-end mb-8 gap-2">
            <Link href={`/creator/${user?.id}`}>
              <Button size="sm" variant="outline" style={{ borderColor: "var(--ln-iron)", color: "var(--ln-parchment)" }}>
                <ExternalLink className="w-3 h-3 mr-1" /> View Profile
              </Button>
            </Link>
            <Link href="/upload">
              <Button size="sm" style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
                <Upload className="w-3 h-3 mr-1" /> Upload Track
              </Button>
            </Link>
          </div>

        {/* Pre-Onboarding Checklist Modal */}
        <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
          <DialogContent style={{ background: "var(--ln-coal)", border: "1px solid #111009", color: "var(--ln-parchment)" }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
                Before You Start — Have These Ready
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm mb-4" style={{ color: "var(--ln-parchment)" }}>
              Stripe's verification takes about 5 minutes. Having these items ready prevents interruptions.
            </p>
            <div className="space-y-3">
              {ONBOARDING_CHECKLIST.map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--ln-coal)" }}>
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>{item.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" style={{ background: "var(--ln-coal)" }} />
            <p className="text-xs mb-4" style={{ color: "var(--ln-iron)" }}>
              Living Nexus uses Stripe Connect for secure payouts. Your information goes directly to Stripe — we never store your SSN or bank details.
            </p>
            <Button
              className="w-full font-bold"
              onClick={() => { setShowChecklist(false); connectMutation.mutate({ returnUrl: `${window.location.origin}/dashboard` }); }}
              disabled={connectMutation.isPending}
              style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
            >
              {connectMutation.isPending ? "Opening Stripe..." : "I'm Ready — Start Setup"}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Stripe Setup Banner — shown when gifts account is pending or not connected */}
        {(connectData?.status === "pending" || connectData?.status === "not_connected") && (
          <div
            className="w-full rounded-xl mb-6 overflow-hidden"
            style={{ border: "1px solid #C49A28" }}
          >
            {/* Top row: main call to action */}
            <div
              className="flex items-center justify-between gap-4 px-4 py-3"
              style={{ background: "var(--ln-gold)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ln-coal)" }} />
                <span className="text-sm font-semibold leading-snug" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
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
                style={{ background: "#111009", color: "var(--ln-gold)", border: "none" }}
              >
                {connectMutation.isPending ? "Loading..." : connectData?.status === "pending" ? "Complete Setup" : "Enable Gifts"}
              </Button>
            </div>
            {/* Bottom row: plain-English requirements when pending */}
            {connectData?.status === "pending" && connectData?.requirementsLabels && connectData.requirementsLabels.length > 0 && (
              <div className="px-4 py-3" style={{ background: "var(--ln-coal)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--lnx-orange)" }}>Still needed to activate your account:</p>
                <div className="flex flex-wrap gap-2">
                  {(connectData.requirementsLabels as string[]).map((label: string) => (
                    <span
                      key={label}
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ background: "color-mix(in srgb, var(--lnx-orange) 15%, transparent)", color: "var(--lnx-orange-soft)", border: "1px solid color-mix(in srgb, var(--lnx-orange) 30%, transparent)" }}
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
            { label: "Songs Published", value: songs?.length ?? 0, icon: Music, color: "var(--ln-gold)", delta: null },
            { label: "Total Plays", value: (songs ?? []).reduce((a: number, s: any) => a + (s.playCount || 0), 0), icon: BarChart2, color: "var(--ln-gold)", delta: (dashboardDeltas as any)?.newPlays ?? 0 },
            { label: "Song Slots", value: `${slotsUsed}/${slotsTotal}`, icon: Shield, color: slotsUsed > slotsTotal ? "var(--lnx-red)" : "var(--lnx-green)", delta: null },
            { label: "Gifts Received", value: (songs ?? []).reduce((a: number, s: any) => a + (s.tipCount || 0), 0), icon: Gift, color: "var(--ln-seal-bright)", delta: (dashboardDeltas as any)?.newTips ?? 0 },
          ].map(({ label, value, icon: Icon, color, delta }) => (
            <div key={label} className="p-4 relative" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs" style={{ color: "#E2E8F0" }}>{label}</span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold" style={{ color, fontFamily: "'Cinzel', serif" }}>{value}</p>
                {delta != null && delta > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-0.5 flex items-center gap-0.5"
                    style={{ background: "color-mix(in srgb, var(--lnx-red) 20%, transparent)", color: "var(--lnx-orange-soft)", border: "1px solid color-mix(in srgb, var(--lnx-red) 40%, transparent)" }}
                  >
                    <TrendingUp className="w-2.5 h-2.5" />
                    +{delta} new
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* License Status */}
          <div className="rounded-xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Creator License</h3>
            </div>
            {isLicensed ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "var(--lnx-green)" }} />
                <span className="text-sm" style={{ color: "var(--lnx-green)" }}>Licensed — Commercial Rights Active</span>
              </div>
            ) : (
              <>
                <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>Unlock 100 song slots, commercial license, and Witness ID provenance certificates.</p>
                <p className="text-lg font-bold mb-3" style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}>$89.98 <span className="text-xs font-normal" style={{ color: "#E2E8F0" }}>one-time</span></p>
                <Button size="sm" className="w-full" onClick={() => licenseMutation.mutate({ origin: window.location.origin })} disabled={licenseMutation.isPending} style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
                  {licenseMutation.isPending ? "Processing..." : "Purchase License"}
                </Button>
              </>
            )}
          </div>

          {/* Song Slots */}
          <div className="rounded-xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Music className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Song Slots</h3>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: "#E2E8F0" }}>
                <span>{slotsUsed} used</span><span>{slotsTotal} total</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ln-coal)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${slotsPercent}%`, background: slotsPercent >= 90 ? "var(--lnx-red)" : "var(--ln-gold)" }} />
              </div>
            </div>
            <p className="text-xs mb-3" style={{ color: "#E2E8F0" }}>Need more? Choose a package — one-time, no subscription.</p>
            <div className="grid grid-cols-3 gap-1 mb-2">
              {(["micro_10", "micro_30", "micro_50"] as const).map((pkg) => (
                <Button key={pkg} size="sm" variant="outline" onClick={() => slotsMutation.mutate({ packageId: pkg, origin: window.location.origin })} disabled={slotsMutation.isPending} style={{ borderColor: "rgba(196,154,40,0.4)", color: "var(--ln-gold)", fontSize: "11px", padding: "4px 2px" }}>
                  {pkg === "micro_10" ? "10 · $8.80" : pkg === "micro_30" ? "30 · $26.40" : "50 · $44"}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(["bulk_100", "bulk_300", "bulk_500"] as const).map((pkg) => (
                <Button key={pkg} size="sm" variant="outline" onClick={() => slotsMutation.mutate({ packageId: pkg, origin: window.location.origin })} disabled={slotsMutation.isPending} style={{ borderColor: "rgba(196,154,40,0.4)", color: "var(--ln-gold)", fontSize: "11px", padding: "4px 2px" }}>
                  {pkg === "bulk_100" ? "100 · $88" : pkg === "bulk_300" ? "300 · $264" : "500 · $440"}
                </Button>
              ))}
            </div>
          </div>

          {/* Tips / Stripe Connect */}
          <div className="rounded-xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4" style={{ color: "var(--lnx-orange)" }} />
              <h3 className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Gift Payments</h3>
            </div>
            {tipsEnabled ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" style={{ color: "var(--lnx-green)" }} />
                <span className="text-sm" style={{ color: "var(--lnx-green)" }}>Gifts Enabled — 90% to you</span>
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
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--lnx-orange)" }}>Still needed:</p>
                    <ul className="space-y-0.5">
                      {(connectData.requirementsLabels as string[]).slice(0, 3).map((label: string) => (
                        <li key={label} className="text-xs flex items-center gap-1" style={{ color: "var(--ln-smoke)" }}>
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />{label}
                        </li>
                      ))}
                      {(connectData.requirementsLabels as string[]).length > 3 && (
                        <li className="text-xs" style={{ color: "var(--ln-iron)" }}>+{(connectData.requirementsLabels as string[]).length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
                <Button
                  size="sm" className="w-full" variant="outline"
                  onClick={() => connectData?.status === "not_connected" ? setShowChecklist(true) : connectMutation.mutate({ returnUrl: `${window.location.origin}/dashboard` })}
                  disabled={connectMutation.isPending}
                  style={{ borderColor: "rgba(58,138,86,0.4)", color: "var(--lnx-green)" }}
                >
                  {connectMutation.isPending ? "Loading..." : connectData?.status === "pending" ? "Continue Setup" : "Enable Gifts"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}>
          <button
            onClick={() => setActiveTab("songs")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "songs" ? "var(--ln-gold)" : "transparent",
              color: activeTab === "songs" ? "var(--ln-parchment)" : "var(--ln-smoke)",
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
              background: activeTab === "transforms" ? "var(--ln-gold)" : "transparent",
              color: activeTab === "transforms" ? "white" : "var(--ln-smoke)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Wand2 className="w-4 h-4" />
            My Transforms
            {transforms?.length ? <span className="text-xs opacity-70">({transforms.length})</span> : null}
          </button>
          <button
            onClick={() => { setActiveTab("activity"); touchActivityMutation.mutate(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative"
            style={{
              background: activeTab === "activity" ? "var(--lnx-orange)" : "transparent",
              color: activeTab === "activity" ? "var(--ln-parchment)" : "var(--ln-smoke)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Activity className="w-4 h-4" />
            Activity
            {(newEventCount as number) > 0 && activeTab !== "activity" ? (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse"
                style={{ background: "var(--ln-ember)", color: "white" }}
              >{(newEventCount as number) > 99 ? "99+" : String(newEventCount)}</span>
            ) : activityEvents?.length ? (
              <span className="text-xs opacity-70">({activityEvents.length})</span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "collections" ? "rgba(196,154,40,0.08)" : "transparent",
              color: activeTab === "collections" ? "var(--ln-gold)" : "var(--ln-smoke)",
              border: activeTab === "collections" ? "1px solid rgba(196,154,40,0.3)" : "1px solid transparent",
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
              background: activeTab === "archive" ? "rgba(56,189,248,0.2)" : "transparent",
              color: activeTab === "archive" ? "#38BDF8" : "var(--ln-smoke)",
              border: activeTab === "archive" ? "1px solid rgba(56,189,248,0.4)" : "1px solid transparent",
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
              background: activeTab === "analytics" ? "rgba(56,189,248,0.2)" : "transparent",
              color: activeTab === "analytics" ? "#38BDF8" : "var(--ln-smoke)",
              border: activeTab === "analytics" ? "1px solid rgba(56,189,248,0.4)" : "1px solid transparent",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <LineChart className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("widcache")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "widcache" ? "rgba(196,154,40,0.08)" : "transparent",
              color: activeTab === "widcache" ? "var(--ln-gold)" : "var(--ln-smoke)",
              border: activeTab === "widcache" ? "1px solid rgba(196,154,40,0.3)" : "1px solid transparent",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Fingerprint className="w-4 h-4" />
            Witness Cache
          </button>
          <button
            onClick={() => setActiveTab("discord")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === "discord" ? "rgba(196,154,40,0.17)" : "transparent",
              color: activeTab === "discord" ? "var(--ln-gold)" : "var(--ln-smoke)",
              border: activeTab === "discord" ? "1px solid rgba(196,154,40,0.34)" : "1px solid transparent",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <Bell className="w-4 h-4" />
            Discord
          </button>
        </div>
        {/* My Songs Tab */}
        {activeTab === "songs" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>My Songs</h2>
              <Link href="/upload">
                <Button size="sm" style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
                  <Upload className="w-3 h-3 mr-1" /> Upload New
                </Button>
              </Link>
            </div>
            {songsError ? (
              <DashboardErrorCard
                section="your songs"
                error={songsError}
                onRetry={() => refetchSongs()}
                route="/dashboard#songs"
              />
            ) : !songs?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed #C3AB7D" }}>
                <Music className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-gold)" }} />
                <p className="text-sm mb-2" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Upload your first piece and get your WID</p>
                <p className="text-xs mb-4" style={{ color: "var(--ln-smoke)" }}>Every work you upload receives a cryptographic Witness ID — your permanent proof of origin.</p>
                <Link href="/upload">
                  <Button style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>Upload &amp; Witness Your Work</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {songs.map((song: any, idx: number) => (
                  <div key={song.id} className="p-3 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                    {/* Top row: index + cover + title + actions */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: "#E2E8F0", minWidth: "20px" }}>{idx + 1}</span>
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
                        {song.coverArtUrl ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" style={{ objectPosition: `${(song as any).coverPositionX ?? 50}% ${(song as any).coverPositionY ?? 50}%` }} /> : <Music className="w-4 h-4 opacity-40" style={{ color: "var(--ln-gold)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif", fontSize: "13px" }}>{song.title}</p>
                        {song.genre && (
                          <p className="text-xs truncate mt-0.5" style={{ color: "#E2E8F0", fontSize: "12px" }}>{song.genre}</p>
                        )}
                      </div>
                      {/* Action buttons — always visible */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Link href={`/song/${song.id}`}>
                          <button type="button" className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" title="View song page">
                            <ExternalLink className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
                          </button>
                        </Link>
                        <button
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#1C1A14]/10"
                          title="Edit track (cover art, metadata, position)"
                          onClick={() => setEditingSong(song)}
                        >
                          <Pencil className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
                        </button>
                        <button
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/10"
                          title="Delete song"
                          onClick={() => { setDeletingId(song.id); deleteMutation.mutate({ songId: song.id }); }}
                          disabled={deletingId === song.id}
                        >
                          <Trash2 className="w-3 h-3" style={{ color: deletingId === song.id ? "var(--ln-smoke)" : "var(--lnx-red)" }} />
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
                         <WIDPanel
                           witnessId={song.witnessId}
                           songTitle={song.title}
                           creatorName={user?.name ?? undefined}
                           registeredAt={song.createdAt}
                           coverArtUrl={song.coverArtUrl ?? undefined}
                           compact
                         />
                       )}
                      {/* AI badge */}
                      {song.aiConsent === "prohibited" && (
                        <Badge className="px-1.5 py-0" style={{ background: "color-mix(in srgb, var(--lnx-red) 20%, transparent)", color: "var(--lnx-red)", fontSize: "10px" }}>AI OFF</Badge>
                      )}
                      {/* Status dropdown */}
                      <select
                        value={song.status ?? "Published"}
                        onChange={e => updateStatusMutation.mutate({ songId: song.id, status: e.target.value as any })}
                        disabled={updateStatusMutation.isPending}
                        title="Track status"
                        style={{
                          background: "var(--ln-coal)",
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
                          <option key={s} value={s} style={{ background: "var(--ln-coal)", color: statusColor(s) }}>{s}</option>
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
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Activity Feed</h2>
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>All interactions on your songs — gifts, comments, and witnesses. Auto-refreshes every 30s.</p>
              </div>
            </div>
            {activityError ? (
              <DashboardErrorCard
                section="your activity feed"
                error={activityError}
                onRetry={() => refetchActivity()}
                route="/dashboard#activity"
              />
            ) : activityLoading ? (
              <div className="text-center py-16">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: "var(--ln-gold)", borderTopColor: "transparent" }} />
              </div>
            ) : !activityEvents?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed #C3AB7D" }}>
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-gold)" }} />
                <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No activity yet.</p>
                <p className="text-xs" style={{ color: "var(--ln-iron)" }}>Gifts, comments, and witnesses on your songs will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(activityEvents as any[]).map((evt) => {
                  const isTip = evt.type === "TIP";
                  const isComment = evt.type === "COMMENT";
                  const payload = evt.payload as any ?? {};
                  const accentColor = isTip ? "var(--ln-gold)" : isComment ? "var(--ln-gold)" : "var(--lnx-green)";
                  return (
                    <div
                      key={evt.id}
                      className="p-3 flex gap-3 items-start"
                      style={{
                        background: isTip ? "rgba(196,154,40,0.04)" : "var(--ln-coal)",
                        border: `1px solid ${isTip ? "rgba(196,154,40,0.2)" : "var(--ln-gold)"}`,
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
                            <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>by {evt.actorName}</span>
                          )}
                          {evt.songTitle && (
                            <Link href={(evt as any).projectSlug ? `/project/${(evt as any).projectSlug}` : ((evt as any).songLink ?? `/song/${evt.workId}`)}>
                              <span className="text-xs hover:underline truncate" style={{ color: "var(--ln-iron)" }}>on "{evt.songTitle}"</span>
                            </Link>
                          )}
                        </div>
                        {(payload.message || payload.text) && (
                          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#E2E8F0" }}>
                            {payload.message || payload.text}
                          </p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: "var(--ln-iron)" }}>
                          {new Date(evt.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {/* Cover art thumbnail */}
                      {evt.songCoverArtUrl && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-md overflow-hidden">
                          <img src={evt.songCoverArtUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${(evt as any).songCoverPositionX ?? 50}% ${(evt as any).songCoverPositionY ?? 50}%` }} />
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
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>My AI Transforms</h2>
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>AI-generated derivatives of your songs, linked to their original Witness IDs.</p>
              </div>
            </div>
            {transformsError ? (
              <DashboardErrorCard
                section="your AI transforms"
                error={transformsError}
                onRetry={() => refetchTransforms()}
                route="/dashboard#transforms"
              />
            ) : !transforms?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed #C3AB7D" }}>
                <Wand2 className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-gold)" }} />
                <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No AI transforms yet.</p>
                <p className="text-xs" style={{ color: "var(--ln-iron)" }}>Open any song page and use the AI Transform button to create a derivative.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transforms.map((t: any) => {
                  const { label, color } = transformStatusLabel(t.status);
                  return (
                    <div key={t.id} className="p-4" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                      <div className="flex items-start gap-4">
                        {/* Status icon */}
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--ln-coal)" }}>
                          {transformStatusIcon(t.status)}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
                              Transform of "{t.originalSongTitle || `Song #${t.originalSongId}`}"
                            </p>
                            <Badge className="text-xs px-1.5 py-0 flex-shrink-0" style={{ background: `${color}20`, color, fontSize: "9px" }}>
                              {label}
                            </Badge>
                          </div>
                          <p className="text-xs mb-1 line-clamp-2" style={{ color: "var(--ln-smoke)" }}>
                            <span style={{ color: "#E2E8F0" }}>Prompt: </span>{t.prompt}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            {t.style && (
                              <span className="text-xs" style={{ color: "#E2E8F0" }}>Style: {t.style}</span>
                            )}
                            {t.originalWitnessId && (
                              <Link href={`/verify/${t.originalWitnessId}`}>
                                <span className="text-xs cursor-pointer hover:underline" style={{ color: "var(--ln-gold)" }}>
                                  WID: {t.originalWitnessId.slice(0, 12)}…
                                </span>
                              </Link>
                            )}
                            <span className="text-xs" style={{ color: "var(--ln-iron)" }}>
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {t.status === "failed" && t.errorMessage && (
                            <p className="text-xs mt-1" style={{ color: "var(--lnx-red)" }}>Error: {t.errorMessage}</p>
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
                                  <Play className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
                                </button>
                              </a>
                              <a href={t.outputUrl} download>
                                <button
                                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
                                  title="Download transform"
                                >
                                  <Download className="w-3 h-3" style={{ color: "var(--ln-gold)" }} />
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

                {/* Collections Tab */}
        {activeTab === "collections" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>My Collections</h2>
                <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>Albums and batch-registered works with a collective Witness ID binding all tracks together.</p>
              </div>
              <Link href="/batch-upload">
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
                >
                  <Upload className="w-3 h-3" /> New Collection
                </button>
              </Link>
            </div>
            {collectionsError ? (
              <DashboardErrorCard
                section="your collections"
                error={collectionsError}
                onRetry={() => refetchCollections()}
                route="/dashboard#collections"
              />
            ) : collectionsLoading ? (
              <div className="text-center py-16">
                <div className="w-8 h-8 border-2 border-[#C49A28]/30 border-t-[#C49A28] rounded-full animate-spin mx-auto" />
              </div>
            ) : !myCollections?.length ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed #C3AB7D" }}>
                <Library className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-gold)" }} />
                <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No collections yet.</p>
                <p className="text-xs mb-4" style={{ color: "var(--ln-iron)" }}>Upload an album or batch of songs to generate a Collection WID that binds all works into one origin record.</p>
                <Link href="/batch-upload">
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}
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
                    style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Cover art thumbnail */}
                      <div
                        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group relative cursor-pointer"
                        style={{ border: "1px solid rgba(196,154,40,0.25)", background: "var(--ln-coal)" }}
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
                            <Camera className="w-4 h-4" style={{ color: "rgba(196,154,40,0.4)" }} />
                            <span className="text-[8px]" style={{ color: "rgba(196,154,40,0.4)" }}>Add Cover</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                          {col.name}
                        </p>
                        <p className="text-xs font-mono mb-2" style={{ color: "var(--ln-gold)" }}>
                          {col.collectionWid}
                        </p>
                        <p className="text-xs mb-3" style={{ color: "var(--ln-iron)" }}>
                          {col.trackCount ?? "?"} tracks &middot; Registered {new Date(col.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] font-mono break-all" style={{ color: "var(--ln-iron)" }}>
                          Hash: {col.collectiveHash?.slice(0, 32)}…
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {col.coverArtUrl && (
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                            style={{ border: "1px solid rgba(196,154,40,0.25)", color: "rgba(196,154,40,0.64)", background: "transparent" }}
                            onClick={() => { (coverInputRef.current as any)._activeCol = col; coverInputRef.current?.click(); }}
                          >
                            <Camera className="w-3 h-3" /> Change Cover
                          </button>
                        )}
                        <a href={`/verify/${col.collectionWid}`} target="_blank" rel="noopener noreferrer">
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                            style={{ border: "1px solid rgba(196,154,40,0.4)", color: "var(--ln-gold)", background: "transparent" }}
                          >
                            <ExternalLink className="w-3 h-3" /> Verify
                          </button>
                        </a>
                        {col.pdfUrl && (
                          <a href={col.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <button
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                              style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
                            >
                              <Download className="w-3 h-3" /> Certificate
                            </button>
                          </a>
                        )}
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors w-full"
                          style={{ border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-iron)", background: "transparent" }}
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
            {/* Collection cover inline repositioner — direct manipulation: drag, scroll, double-click, keyboard */}
            {collectionCoverState && (collectionCoverState.pendingUrl || collectionCoverState.currentUrl) && (
              <ImagePositioner
                imageUrl={(collectionCoverState.pendingUrl || collectionCoverState.currentUrl)!}
                initialX={collectionCoverState.position.x}
                initialY={collectionCoverState.position.y}
                initialZoom={110}
                previewHeight="12rem"
                roundedTop={true}
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
              <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Creator Analytics</h2>
              <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>All-time data · Updated in real time</p>
            </div>
            {analyticsError ? (
              <DashboardErrorCard
                section="your analytics"
                error={analyticsError}
                onRetry={() => refetchAnalytics()}
                route="/dashboard#analytics"
              />
            ) : analyticsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#38BDF8", borderTopColor: "transparent" }} />
              </div>
            ) : !analyticsData ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed #C3AB7D" }}>
                <LineChart className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "#38BDF8" }} />
                <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No analytics data available yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Plays", value: analyticsData.totalPlays, icon: Play, color: "var(--ln-gold)" },
                    { label: "Total Likes", value: analyticsData.totalLikes, icon: Heart, color: "var(--ln-ember)" },
                    { label: "Gifts Received", value: analyticsData.totalGiftsReceived, icon: Gift, color: "var(--ln-seal-bright)" },
                    { label: "Downloads", value: analyticsData.totalDownloads, icon: Download, color: "#38BDF8" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="p-4" style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{label}</span>
                      </div>
                      <p className="text-2xl font-bold" style={{ fontFamily: "'Cinzel', serif", color }}>{value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                {/* 30-day activity trend */}
                <div className="rounded-xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4" style={{ color: "#38BDF8" }} />
                    <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>30-Day Activity Trend</h3>
                    <span className="text-xs ml-auto" style={{ color: "var(--ln-smoke)" }}>Likes · Gifts · Comments · Witnesses</span>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={analyticsData.playTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ln-coal)" />
                      <XAxis dataKey="date" tick={{ fill: "var(--ln-smoke)", fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fill: "var(--ln-smoke)", fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", borderRadius: "8px", color: "var(--ln-parchment)" }} />
                      <Area type="monotone" dataKey="plays" stroke="#38BDF8" fill="url(#analyticsGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Plays by track */}
                {analyticsData.playsByTrack.filter((t: { plays: number }) => t.plays > 0).length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Play className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Plays by Track</h3>
                    </div>
                    <div className="space-y-2">
                      {[...analyticsData.playsByTrack].sort((a, b) => b.plays - a.plays).slice(0, 10).map((track) => (
                        <div key={track.trackId} className="flex items-center gap-3">
                          <span className="text-xs flex-1 truncate" style={{ color: "var(--ln-parchment)" }}>{track.title}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, Math.round((track.plays / Math.max(...analyticsData.playsByTrack.map((t: { plays: number }) => t.plays), 1)) * 120))}px`, background: "var(--ln-gold)" }} />
                            <span className="text-xs font-mono w-8 text-right" style={{ color: "var(--ln-gold)" }}>{track.plays}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Likes by track */}
                {analyticsData.likesByTrack.filter((t: { likes: number }) => t.likes > 0).length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-4 h-4" style={{ color: "var(--ln-ember)" }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Likes by Track</h3>
                    </div>
                    <div className="space-y-2">
                      {[...analyticsData.likesByTrack].sort((a, b) => b.likes - a.likes).slice(0, 10).map((track) => (
                        <div key={track.trackId} className="flex items-center gap-3">
                          <span className="text-xs flex-1 truncate" style={{ color: "var(--ln-parchment)" }}>{track.title}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, Math.round((track.likes / Math.max(...analyticsData.likesByTrack.map((t: { likes: number }) => t.likes), 1)) * 120))}px`, background: "var(--ln-ember)" }} />
                            <span className="text-xs font-mono w-8 text-right" style={{ color: "var(--ln-ember)" }}>{track.likes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Gifts by track */}
                {analyticsData.giftsByTrack.filter((t: { giftCount: number }) => t.giftCount > 0).length > 0 && (
                  <div className="rounded-xl p-5" style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Gift className="w-4 h-4" style={{ color: "var(--ln-seal-bright)" }} />
                      <h3 className="text-sm font-semibold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Gifts by Track</h3>
                    </div>
                    <div className="space-y-2">
                      {[...analyticsData.giftsByTrack].sort((a, b) => b.giftCount - a.giftCount).slice(0, 10).map((track) => (
                        <div key={track.trackId} className="flex items-center gap-3">
                          <span className="text-xs flex-1 truncate" style={{ color: "var(--ln-parchment)" }}>{track.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: "var(--ln-seal-bright)" }}>{track.giftCount} gift{track.giftCount !== 1 ? 's' : ''}</span>
                            <span className="text-xs font-mono" style={{ color: "var(--lnx-green)" }}>${(track.totalAmount / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Total gifts revenue */}
                {analyticsData.totalAmountReceived > 0 && (
                  <div className="p-4 flex items-center gap-4" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(58,138,86,0.3)" }}>
                    <DollarSign className="w-5 h-5 flex-shrink-0" style={{ color: "var(--ln-seal-bright)" }} />
                    <div>
                      <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>Total Gift Revenue (gross)</p>
                      <p className="text-xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--lnx-green)" }}>${(analyticsData.totalAmountReceived / 100).toFixed(2)}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>Your cut (90%)</p>
                      <p className="text-lg font-bold" style={{ color: "var(--ln-gold)" }}>${(analyticsData.totalAmountReceived * 0.9 / 100).toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      {/* WID Witness Cache Tab */}
      {activeTab === "widcache" && <WIDCacheTab />}
      {/* Discord Integration Tab */}
      {activeTab === "discord" && <DiscordIntegrationTab />}
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
// ─── Discord Integration Tab ─────────────────────────────────────────────────
const DISCORD_EVENTS = [
  {
    key: "wid_minted" as const,
    label: "WID Minted",
    description: "Fires when a new Witness ID is issued for a track",
    icon: "🔐",
    color: "var(--ln-gold)",
  },
  {
    key: "track_upload" as const,
    label: "Track Uploaded",
    description: "Fires when a new track is successfully uploaded",
    icon: "🎵",
    color: "var(--ln-seal-bright)",
  },
  {
    key: "tip_received" as const,
    label: "Tip Received",
    description: "Fires when a fan sends you a gift on one of your tracks",
    icon: "💛",
    color: "var(--ln-gold)",
  },
  {
    key: "like_surge" as const,
    label: "Like Surge",
    description: "Fires when a track hits 10, 50, 100, or 500 likes",
    icon: "🔥",
    color: "var(--ln-ember)",
  },
] as const;

type DiscordEventKey = typeof DISCORD_EVENTS[number]["key"];

function DiscordIntegrationTab() {
  const { data: webhooks, refetch } = trpc.discord.getWebhooks.useQuery();
  const saveWebhook = trpc.discord.saveWebhook.useMutation({ onSuccess: () => { toast.success("Webhook saved"); refetch(); } });
  const toggleWebhook = trpc.discord.toggleWebhook.useMutation({ onSuccess: () => refetch() });
  const deleteWebhook = trpc.discord.deleteWebhook.useMutation({ onSuccess: () => { toast.success("Webhook removed"); refetch(); } });
  const testWebhook = trpc.discord.testWebhook.useMutation({
    onSuccess: (data) => {
      if (data.ok) toast.success("Test message sent to Discord!");
      else toast.error(`Test failed: ${data.error}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const [urls, setUrls] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);

  // Populate URL inputs from saved webhooks
  useEffect(() => {
    if (!webhooks) return;
    const map: Record<string, string> = {};
    for (const wh of webhooks) map[wh.event] = wh.webhookUrl;
    setUrls(map);
  }, [webhooks]);

  const getWebhook = (key: DiscordEventKey) => webhooks?.find((w: { event: string }) => w.event === key);

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex items-start gap-4 p-5 rounded-xl" style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.26)" }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "rgba(196,154,40,0.17)" }}>🔔</div>
        <div>
          <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Discord Webhook Integration</h2>
          <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>Get real-time notifications in your Discord server when platform events happen. Paste a Discord webhook URL for each event you want to track.</p>
          <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noopener noreferrer" className="text-xs mt-2 inline-flex items-center gap-1" style={{ color: "var(--ln-gold)" }}>
            <ExternalLink className="w-3 h-3" /> How to create a Discord webhook
          </a>
        </div>
      </div>

      {/* Event rows */}
      {DISCORD_EVENTS.map(ev => {
        const saved = getWebhook(ev.key);
        const url = urls[ev.key] ?? "";
        const isDirty = url !== (saved?.webhookUrl ?? "");
        return (
          <div key={ev.key} className="p-5 rounded-xl" style={{ background: "rgba(44,52,56,0.6)", border: "1px solid #111009" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ev.icon}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: ev.color }}>{ev.label}</p>
                  <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>{ev.description}</p>
                </div>
              </div>
              {saved && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{saved.enabled ? "Enabled" : "Disabled"}</span>
                  <div
                    className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                    style={{ background: saved.enabled ? ev.color : "var(--ln-coal)" }}
                    onClick={() => toggleWebhook.mutate({ event: ev.key, enabled: !saved.enabled })}
                  >
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: saved.enabled ? "translateX(22px)" : "translateX(2px)" }} />
                  </div>
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={url}
                onChange={e => setUrls(prev => ({ ...prev, [ev.key]: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "#111009",
                  border: "1px solid #111009",
                  color: "var(--ln-parchment)",
                  fontFamily: "monospace",
                }}
              />
              <Button
                size="sm"
                disabled={!url || !isDirty || saveWebhook.isPending}
                onClick={() => saveWebhook.mutate({ event: ev.key, webhookUrl: url, enabled: saved?.enabled ?? true })}
                style={{ background: isDirty && url ? ev.color : "var(--ln-coal)", color: "var(--ln-parchment)", opacity: (!url || !isDirty) ? 0.5 : 1 }}
              >
                {saveWebhook.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Save
              </Button>
              {saved && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testing === ev.key || testWebhook.isPending}
                    onClick={async () => {
                      setTesting(ev.key);
                      await testWebhook.mutateAsync({ event: ev.key, webhookUrl: saved.webhookUrl });
                      setTesting(null);
                    }}
                    style={{ borderColor: "var(--ln-coal)", color: "var(--ln-parchment)" }}
                  >
                    {testing === ev.key ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteWebhook.mutate({ event: ev.key })}
                    style={{ borderColor: "rgba(239,68,68,0.4)", color: "var(--ln-ember)" }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
            {saved && (
              <p className="text-xs mt-2" style={{ color: "var(--ln-smoke)" }}>
                Last updated: {new Date(saved.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        );
      })}

      {/* Rate limit note */}
      <p className="text-xs text-center" style={{ color: "var(--ln-smoke)" }}>
        Webhooks are rate-limited to 30 requests per minute per event. Failures are silent and will not affect platform operations.
      </p>
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
  }, []); // mount-only: fetch batch info once on open

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
      <div className="w-8 h-8 border-2 border-[#C49A28]/30 border-t-[#C49A28] rounded-full animate-spin mx-auto" />
      <p className="text-sm mt-3" style={{ color: "var(--ln-smoke)" }}>Loading your archive…</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed rgba(239,68,68,0.4)" }}>
      <FileArchive className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--lnx-red)" }} />
      <p className="text-sm" style={{ color: "var(--lnx-red)" }}>{error}</p>
    </div>
  );

  if (!batchInfo || batchInfo.totalTracks === 0) return (
    <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed #C3AB7D" }}>
      <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "#38BDF8" }} />
      <p className="text-sm mb-2" style={{ color: "#E2E8F0" }}>No tracks in your archive yet.</p>
      <p className="text-xs" style={{ color: "var(--ln-iron)" }}>Upload songs to build your archive. Each batch of up to 10 tracks can be downloaded as a ZIP with ID3-tagged audio and WID certificates.</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Download My Archive</h2>
          <p className="text-xs mt-0.5" style={{ color: "#E2E8F0" }}>
            {batchInfo.totalTracks} track{batchInfo.totalTracks !== 1 ? "s" : ""} across {batchInfo.batches.length} batch{batchInfo.batches.length !== 1 ? "es" : ""}.
            Each ZIP includes ID3-tagged audio with embedded WID metadata and provenance certificates.
          </p>
        </div>
      </div>

      {/* Info callout */}
      <div
        className="p-4 mb-6 flex gap-3 items-start"
        style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)" }}
      >
        <FileArchive className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#38BDF8" }} />
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>Your WID travels with every file</p>
          <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>
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
            style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.12)" }}
          >
            {/* Batch header row */}
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.3)" }}
                >
                  <FileArchive className="w-5 h-5" style={{ color: "#38BDF8" }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                    Batch {batch.index + 1}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ln-iron)" }}>
                    Tracks {batch.start}–{batch.end} &middot; {batch.trackCount} file{batch.trackCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{ color: "var(--ln-iron)", background: "transparent" }}
                  onClick={() => setExpandedBatch(expandedBatch === batch.index ? null : batch.index)}
                >
                  {expandedBatch === batch.index ? "▲ Hide" : "▼ Tracks"}
                </button>
                <button
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: downloading === batch.index ? "rgba(56,189,248,0.3)" : "#38BDF8",
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
              <div style={{ borderTop: "1px solid #C49A28" }}>
                {batch.tracks.map((track, ti) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                    style={{
                      borderBottom: ti < batch.tracks.length - 1 ? "1px solid #111009" : "none",
                    }}
                  >
                    <span className="text-xs w-5 text-right flex-shrink-0" style={{ color: "var(--ln-iron)" }}>
                      {batch.start + ti}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: "var(--ln-parchment)" }}>{track.title}</p>
                      {track.witnessId && (
                        <p className="text-[10px] font-mono" style={{ color: "rgba(232,223,200,0.6)" }}>{track.witnessId}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {track.hasAudio && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(58,138,86,0.15)", color: "var(--lnx-green)" }}>MP3</span>
                      )}
                      {track.hasCertificate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)" }}>WID</span>
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
// ─── WID Witness Cache Tab ────────────────────────────────────────────────────
function WIDCacheTab() {
  const [snapshots, setSnapshots] = useState<WIDSnapshot[]>(() => getWIDSnapshots());

  const handleClear = () => {
    clearWIDSnapshots();
    setSnapshots([]);
    toast.success("Local witness cache cleared");
  };

  const MEDIUM_ICON: Record<string, React.ElementType> = {
    audio: Music,
    lyrics: FileText,
    manuscript: BookOpen,
    comic: Image,
  };

  const MEDIUM_LABEL: Record<string, string> = {
    audio: "WID-MUS",
    lyrics: "WID-LYR",
    manuscript: "WID-MAN",
    comic: "WID-CMX",
  };

  const MEDIUM_COLOR: Record<string, string> = {
    audio: "var(--ln-gold)",
    lyrics: "var(--ln-gold)",
    manuscript: "var(--lnx-orange)",
    comic: "#38BDF8",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
            Witness Cache
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
            Local offline proof memory · Stored on this device · 24-hour TTL · Max 50 entries
          </p>
        </div>
        {snapshots.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClear}
            className="text-xs"
            style={{ borderColor: "var(--ln-iron)", color: "var(--ln-smoke)" }}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear Cache
          </Button>
        )}
      </div>

      {snapshots.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px dashed #C3AB7D" }}>
          <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-gold)" }} />
          <p className="text-sm mb-1" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>No witness records cached</p>
          <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>
            After you publish a work, its WID will appear here as an offline proof record.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((snap) => {
            const Icon = MEDIUM_ICON[snap.contentType] ?? Fingerprint;
            const label = MEDIUM_LABEL[snap.contentType] ?? "WID";
            const color = MEDIUM_COLOR[snap.contentType] ?? "var(--ln-gold)";
            return (
              <div
                key={snap.wid}
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: "var(--ln-coal)", border: "1px solid #111009" }}
              >
                {/* Medium icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}44` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded"
                      style={{ background: `${color}18`, color, fontFamily: "'Cinzel', serif" }}
                    >
                      {label}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--lnx-green)" }} />
                    <span className="text-[10px]" style={{ color: "var(--lnx-green)" }}>Verified</span>
                  </div>
                  <p className="text-sm font-semibold truncate mb-1" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>
                    {snap.title}
                  </p>
                  <p className="text-[10px] font-mono break-all mb-1" style={{ color: "var(--ln-iron)" }}>
                    {snap.wid}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                    Witnessed {new Date(snap.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Verify link */}
                <a
                  href={`/verify/${snap.wid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}44`, fontFamily: "'Cinzel', serif" }}
                >
                  <ExternalLink className="w-3 h-3" />
                  Verify
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
