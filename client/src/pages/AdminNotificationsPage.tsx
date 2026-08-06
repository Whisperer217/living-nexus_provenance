/**
 * Admin Notifications Composer
 * Owner-only page at /admin/notifications
 * Compose and send custom notifications to all users, segments, or specific users.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Megaphone, Sparkles, AlertTriangle, Trophy,
  Shield, Users, Wrench, Gift, Send, Loader2,
  CheckCircle2, Clock, User, Globe, ChevronDown,
  Bell, Eye, X,
} from "lucide-react";

// ─── Icon config ──────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { value: "announcement", label: "Announcement", icon: Megaphone, color: "#C9A84C" },
  { value: "feature", label: "New Feature", icon: Sparkles, color: "#8B5CF6" },
  { value: "alert", label: "Alert", icon: AlertTriangle, color: "#EF4444" },
  { value: "milestone", label: "Milestone", icon: Trophy, color: "#F59E0B" },
  { value: "provenance", label: "Provenance", icon: Shield, color: "#059669" },
  { value: "community", label: "Community", icon: Users, color: "#3B82F6" },
  { value: "maintenance", label: "Maintenance", icon: Wrench, color: "#6B7280" },
  { value: "reward", label: "Reward", icon: Gift, color: "#EC4899" },
] as const;

const SEGMENT_OPTIONS = [
  { value: "all", label: "All Users", icon: Globe, desc: "Every registered user on the platform" },
  { value: "creators", label: "Creators", icon: Users, desc: "Users who have published at least one work" },
  { value: "witnesses", label: "Witnesses", icon: Eye, desc: "Users who have witnessed at least one work" },
  { value: "specific", label: "Specific User", icon: User, desc: "Send to a single user by ID" },
] as const;

type IconType = typeof ICON_OPTIONS[number]["value"];
type SegmentType = typeof SEGMENT_OPTIONS[number]["value"];

// ─── Preview ──────────────────────────────────────────────────────────────────

function NotificationPreview({ title, body, ctaLabel, iconType }: {
  title: string; body: string; ctaLabel?: string; iconType: IconType;
}) {
  const iconConfig = ICON_OPTIONS.find(i => i.value === iconType) ?? ICON_OPTIONS[0];
  const IconComp = iconConfig.icon;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(196,154,40,0.15)" }}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(196,154,40,0.5)", letterSpacing: "0.1em", marginBottom: 8 }}>
        PREVIEW
      </div>
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconConfig.color}18`, border: `1px solid ${iconConfig.color}44` }}
        >
          <IconComp size={14} style={{ color: iconConfig.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "#E8D5A3", fontWeight: 600, marginBottom: 4 }}>
            {title || "Notification title..."}
          </p>
          {body && (
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              {body}
            </p>
          )}
          {ctaLabel && (
            <div
              className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded"
              style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.25)", fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "#C9A84C" }}
            >
              {ctaLabel}
            </div>
          )}
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
            just now
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sent history row ─────────────────────────────────────────────────────────

function SentRow({ notif }: { notif: any }) {
  const iconConfig = ICON_OPTIONS.find(i => i.value === notif.iconType) ?? ICON_OPTIONS[0];
  const IconComp = iconConfig.icon;

  return (
    <div
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconConfig.color}18`, border: `1px solid ${iconConfig.color}33` }}
      >
        <IconComp size={12} style={{ color: iconConfig.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#E8D5A3" }} className="truncate">
            {notif.title}
          </p>
          <span
            className="px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.25)", fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "#059669" }}
          >
            {notif.sentCount} sent
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)" }}>
            → {notif.targetSegment.toUpperCase()}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.2)" }}>
            {notif.sentAt ? new Date(notif.sentAt).toLocaleString() : "Pending"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [iconType, setIconType] = useState<IconType>("announcement");
  const [targetSegment, setTargetSegment] = useState<SegmentType>("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [sent, setSent] = useState<{ count: number; id: number } | null>(null);

  const { data: sentHistory = [], refetch: refetchHistory } = trpc.notifications.adminList.useQuery(undefined, {
    staleTime: 30_000,
  });

  const sendMutation = trpc.notifications.adminSend.useMutation({
    onSuccess: (result) => {
      setSent({ count: result.sentCount, id: result.adminNotifId });
      toast.success(`Notification sent to ${result.sentCount} user${result.sentCount !== 1 ? "s" : ""}.`);
      refetchHistory();
      // Reset form
      setTitle(""); setBody(""); setCtaLabel(""); setCtaUrl("");
      setIconType("announcement"); setTargetSegment("all"); setTargetUserId("");
    },
    onError: (e) => toast.error(e.message ?? "Failed to send notification"),
  });

  // Auth gate — admin only
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" style={{ color: "#C9A84C" }} />
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "founder")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Shield size={32} style={{ color: "rgba(196,154,40,0.3)" }} />
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>
          Access restricted to platform administrators.
        </p>
      </div>
    );
  }

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    if (targetSegment === "specific" && !targetUserId.trim()) {
      toast.error("Enter a target user ID for specific targeting.");
      return;
    }
    sendMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      ctaLabel: ctaLabel.trim() || undefined,
      ctaUrl: ctaUrl.trim() || undefined,
      iconType,
      targetSegment,
      targetUserId: targetSegment === "specific" ? parseInt(targetUserId, 10) : undefined,
    });
  };

  const currentSegment = SEGMENT_OPTIONS.find(s => s.value === targetSegment) ?? SEGMENT_OPTIONS[0];
  const SegmentIcon = currentSegment.icon;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(196,154,40,0.12)", border: "1px solid rgba(196,154,40,0.3)" }}
          >
            <Bell size={15} style={{ color: "#C9A84C" }} />
          </div>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.1rem", color: "#C9A84C", letterSpacing: "0.06em" }}>
            Notification Composer
          </h1>
        </div>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.4)" }}>
          Compose and send custom notifications to platform users. All notifications appear in the user's Signal inbox.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Composer */}
        <div className="flex flex-col gap-5">
          {/* Icon type */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
              NOTIFICATION TYPE
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(opt => {
                const Ic = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setIconType(opt.value)}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: iconType === opt.value ? `${opt.color}12` : "rgba(255,255,255,0.03)",
                      border: iconType === opt.value ? `1px solid ${opt.color}55` : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <Ic size={14} style={{ color: iconType === opt.value ? opt.color : "rgba(255,255,255,0.4)" }} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: iconType === opt.value ? opt.color : "rgba(255,255,255,0.4)" }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              TITLE <span style={{ color: "rgba(239,68,68,0.7)" }}>*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Platform announcement title..."
              maxLength={256}
              className="w-full rounded-lg px-3 py-2.5 outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,154,40,0.2)",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.6rem",
                color: "#E8D5A3",
              }}
            />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.2)", marginTop: 3, textAlign: "right" }}>
              {title.length}/256
            </div>
          </div>

          {/* Body */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              BODY <span style={{ color: "rgba(239,68,68,0.7)" }}>*</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Full notification message. This is what users will read in their inbox..."
              rows={4}
              className="w-full rounded-lg px-3 py-2.5 outline-none resize-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(196,154,40,0.2)",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.55rem",
                color: "#E8D5A3",
                lineHeight: 1.7,
              }}
            />
          </div>

          {/* CTA (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                CTA LABEL <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
              </label>
              <input
                value={ctaLabel}
                onChange={e => setCtaLabel(e.target.value)}
                placeholder="e.g. View Release"
                maxLength={64}
                className="w-full rounded-lg px-3 py-2 outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.55rem",
                  color: "#E8D5A3",
                }}
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                CTA URL <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
              </label>
              <input
                value={ctaUrl}
                onChange={e => setCtaUrl(e.target.value)}
                placeholder="/explore or https://..."
                maxLength={512}
                className="w-full rounded-lg px-3 py-2 outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.55rem",
                  color: "#E8D5A3",
                }}
              />
            </div>
          </div>

          {/* Target segment */}
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em", display: "block", marginBottom: 8 }}>
              TARGET AUDIENCE
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SEGMENT_OPTIONS.map(seg => {
                const Ic = seg.icon;
                return (
                  <button
                    key={seg.value}
                    onClick={() => setTargetSegment(seg.value)}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all hover:opacity-80"
                    style={{
                      background: targetSegment === seg.value ? "rgba(196,154,40,0.08)" : "rgba(255,255,255,0.03)",
                      border: targetSegment === seg.value ? "1px solid rgba(196,154,40,0.4)" : "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <Ic size={13} style={{ color: targetSegment === seg.value ? "#C9A84C" : "rgba(255,255,255,0.4)", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", color: targetSegment === seg.value ? "#C9A84C" : "rgba(255,255,255,0.6)" }}>
                        {seg.label}
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.3)", marginTop: 2, lineHeight: 1.5 }}>
                        {seg.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {targetSegment === "specific" && (
              <div className="mt-3">
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  TARGET USER ID
                </label>
                <input
                  value={targetUserId}
                  onChange={e => setTargetUserId(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 180001"
                  className="w-full rounded-lg px-3 py-2 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(196,154,40,0.3)",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "0.55rem",
                    color: "#E8D5A3",
                  }}
                />
              </div>
            )}
          </div>

          {/* Send button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: "#C49A28", color: "#0A0806", fontFamily: "'Cinzel', serif", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em" }}
            >
              {sendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              SEND NOTIFICATION
            </button>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "rgba(255,255,255,0.3)" }}>
              → {currentSegment.label}
            </span>
          </div>

          {/* Success confirmation */}
          {sent && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{ background: "rgba(5,150,105,0.08)", border: "1px solid rgba(5,150,105,0.3)" }}
            >
              <CheckCircle2 size={16} style={{ color: "#059669", flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#059669" }}>
                  Notification delivered to {sent.count} user{sent.count !== 1 ? "s" : ""}.
                </p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  Admin Notification ID: {sent.id}
                </p>
              </div>
              <button onClick={() => setSent(null)} className="ml-auto hover:opacity-70">
                <X size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
              </button>
            </div>
          )}
        </div>

        {/* Right panel: Preview + History */}
        <div className="flex flex-col gap-5">
          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>
                LIVE PREVIEW
              </span>
              <button
                onClick={() => setShowPreview(v => !v)}
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.3)" }}
              >
                {showPreview ? "HIDE" : "SHOW"}
              </button>
            </div>
            {showPreview && (
              <NotificationPreview
                title={title}
                body={body}
                ctaLabel={ctaLabel}
                iconType={iconType}
              />
            )}
          </div>

          {/* Sent history */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={12} style={{ color: "rgba(196,154,40,0.5)" }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.7)", letterSpacing: "0.08em" }}>
                SENT HISTORY
              </span>
            </div>
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {sentHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Bell size={20} style={{ color: "rgba(196,154,40,0.2)" }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.25)" }}>
                    No notifications sent yet
                  </span>
                </div>
              ) : (
                <div className="px-4">
                  {[...sentHistory].reverse().slice(0, 10).map((n: any) => (
                    <SentRow key={n.id} notif={n} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
