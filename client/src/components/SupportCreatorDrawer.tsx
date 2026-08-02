/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — SupportCreatorDrawer
   Cathedral-grade support action system.
   "Supporting should feel like participating in the creator's journey."
   ─────────────────────────────────────────────────────────────────
   Actions: One-time support · Monthly patronage · Purchase work
            License work · Follow creator · Share · View provenance
═══════════════════════════════════════════════════════════════════ */
import { useState } from "react";
import {
  DollarSign, Heart, BookOpen, Shield, Share2, ExternalLink,
  ChevronRight, Sparkles, Crown, Users, X, Check, Link as LinkIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";

// ── Types ──────────────────────────────────────────────────────────
export interface SupportTarget {
  songId: number;
  songTitle: string;
  songWid?: string | null;
  creatorId: number;
  creatorName: string;
  creatorHandle?: string | null;
  coverArtUrl?: string | null;
  contentType?: string;
  stripeAccountStatus?: string | null;
}

interface Props {
  target: SupportTarget | null;
  onClose: () => void;
}

// ── Support action definitions ─────────────────────────────────────
const GIFT_AMOUNTS = [1, 5, 10, 25];

const PATRONAGE_TIERS = [
  { id: "witness" as const, label: "Witness", description: "Follow the creator's journey. Receive publication updates.", icon: <Heart className="w-4 h-4" />, color: "text-[var(--gold)]", free: true },
  { id: "reserve" as const, label: "Reserve", description: "Priority access to new manifestations and early releases.", icon: <Crown className="w-4 h-4" />, color: "text-amber-400", free: false },
  { id: "steward" as const, label: "Steward", description: "Deep patronage. Co-witness the creative process.", icon: <Shield className="w-4 h-4" />, color: "text-violet-400", free: false },
];

type ActionPanel = "main" | "tip" | "patronage" | "license" | "share";

// ── Component ──────────────────────────────────────────────────────
export function SupportCreatorDrawer({ target, onClose }: Props) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [panel, setPanel] = useState<ActionPanel>("main");
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        toast.info("Redirecting to secure checkout…");
        window.open(data.url, "_blank", "noopener,noreferrer");
        onClose();
      }
    },
    onError: (err) => toast.error(err.message || "Checkout unavailable. Try again."),
  });

  const subscribeMutation = trpc.witnessSubscription.subscribe.useMutation({
    onSuccess: (data) => {
      toast.success(`You are now a ${data.tier} of ${target?.creatorName}`);
      onClose();
    },
    onError: (err) => toast.error(err.message || "Could not subscribe."),
  });

  if (!target) return null;

  const requireAuth = (cb: () => void) => {
    if (!user) { window.location.href = getLoginUrl(); return; }
    cb();
  };

  const handleTip = () => {
    requireAuth(() => {
      const raw = customAmount ? parseFloat(customAmount) : selectedAmount;
      if (!raw || isNaN(raw) || raw < 1) { toast.error("Minimum support is $1"); return; }
      const amountCents = Math.round(raw * 100);
      tipMutation.mutate({ songId: target.songId, amountCents, origin: window.location.origin });
    });
  };

  const handlePatronage = (tier: "witness" | "reserve" | "steward") => {
    requireAuth(() => {
      if (tier === "witness") {
        subscribeMutation.mutate({ creatorId: target.creatorId, tier });
      } else {
        toast.info("Paid patronage tiers coming soon. Join as a Witness for free now.");
        subscribeMutation.mutate({ creatorId: target.creatorId, tier: "witness" });
      }
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/song/${target.songId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const canTip = target.stripeAccountStatus === "enabled";

  // ── Render panels ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Drawer panel */}
      <div
        className="relative w-full sm:max-w-md bg-[var(--void-3)] border border-[var(--gold)]/20 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />

        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4">
          {target.coverArtUrl ? (
            <img src={target.coverArtUrl} alt={target.songTitle} className="w-14 h-14 rounded-lg object-cover border border-[var(--gold)]/30 flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-[var(--void-4)] border border-[var(--gold)]/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-[var(--gold-dim)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--gold)] font-mono uppercase tracking-widest mb-0.5">Support Creator</p>
            <h3 className="text-[var(--stone-light)] font-semibold text-base leading-tight truncate">{target.songTitle}</h3>
            <p className="text-[var(--stone-mid)] text-sm">
              {target.creatorHandle ? `@${target.creatorHandle}` : target.creatorName}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--stone-shadow)] hover:text-[var(--stone-light)] transition-colors mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gold rule */}
        <div className="h-px mx-5 bg-[var(--gold)]/15" />

        {/* Panel content */}
        <div className="p-5 pt-4">
          {panel === "main" && (
            <MainPanel
              target={target}
              canTip={canTip}
              onTip={() => setPanel("tip")}
              onPatronage={() => setPanel("patronage")}
              onLicense={() => setPanel("license")}
              onShare={() => setPanel("share")}
              onProvenance={() => { navigate(`/verify/${target.songWid}`); onClose(); }}
            />
          )}
          {panel === "tip" && (
            <TipPanel
              amounts={GIFT_AMOUNTS}
              selected={selectedAmount}
              custom={customAmount}
              loading={tipMutation.isPending}
              onSelect={setSelectedAmount}
              onCustom={setCustomAmount}
              onSubmit={handleTip}
              onBack={() => setPanel("main")}
            />
          )}
          {panel === "patronage" && (
            <PatronagePanel
              tiers={PATRONAGE_TIERS}
              loading={subscribeMutation.isPending}
              onSelect={handlePatronage}
              onBack={() => setPanel("main")}
            />
          )}
          {panel === "license" && (
            <LicensePanel
              target={target}
              onBack={() => setPanel("main")}
              onClose={onClose}
            />
          )}
          {panel === "share" && (
            <SharePanel
              target={target}
              copied={copied}
              onCopy={handleShare}
              onBack={() => setPanel("main")}
            />
          )}
        </div>

        {/* Bottom safe area */}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────
function MainPanel({ target, canTip, onTip, onPatronage, onLicense, onShare, onProvenance }: {
  target: SupportTarget; canTip: boolean;
  onTip: () => void; onPatronage: () => void; onLicense: () => void;
  onShare: () => void; onProvenance: () => void;
}) {
  const actions = [
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: "One-time Support",
      description: "Send a direct gift to this creator",
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
      borderColor: "border-emerald-400/20",
      onClick: onTip,
      disabled: !canTip,
      disabledNote: canTip ? undefined : "Creator hasn't enabled payments yet",
    },
    {
      icon: <Crown className="w-5 h-5" />,
      label: "Monthly Patronage",
      description: "Become a Witness, Reserve, or Steward",
      color: "text-[var(--gold)]",
      bgColor: "bg-[var(--gold)]/10",
      borderColor: "border-[var(--gold)]/20",
      onClick: onPatronage,
      disabled: false,
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: "License This Work",
      description: "Obtain a commercial or sync license",
      color: "text-violet-400",
      bgColor: "bg-violet-400/10",
      borderColor: "border-violet-400/20",
      onClick: onLicense,
      disabled: false,
    },
    {
      icon: <Share2 className="w-5 h-5" />,
      label: "Share",
      description: "Copy link or share to social",
      color: "text-sky-400",
      bgColor: "bg-sky-400/10",
      borderColor: "border-sky-400/20",
      onClick: onShare,
      disabled: false,
    },
    {
      icon: <Shield className="w-5 h-5" />,
      label: "View Full Provenance",
      description: target.songWid ? `WID: ${target.songWid.slice(0, 24)}…` : "Provenance record",
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/20",
      onClick: onProvenance,
      disabled: !target.songWid,
      disabledNote: target.songWid ? undefined : "No WID assigned yet",
    },
  ];

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.disabled ? undefined : action.onClick}
          disabled={action.disabled}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-150 text-left group ${
            action.disabled
              ? "opacity-40 cursor-not-allowed border-white/5 bg-white/2"
              : `${action.bgColor} ${action.borderColor} hover:brightness-110 cursor-pointer`
          }`}
        >
          <div className={`${action.color} flex-shrink-0`}>{action.icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${action.disabled ? "text-[var(--stone-shadow)]" : "text-[var(--stone-light)]"}`}>
              {action.label}
            </p>
            <p className="text-xs text-[var(--stone-shadow)] truncate">
              {action.disabled && action.disabledNote ? action.disabledNote : action.description}
            </p>
          </div>
          {!action.disabled && <ChevronRight className="w-4 h-4 text-[var(--stone-shadow)] group-hover:text-[var(--stone-mid)] flex-shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ── Tip panel ──────────────────────────────────────────────────────
function TipPanel({ amounts, selected, custom, loading, onSelect, onCustom, onSubmit, onBack }: {
  amounts: number[]; selected: number; custom: string; loading: boolean;
  onSelect: (n: number) => void; onCustom: (s: string) => void;
  onSubmit: () => void; onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--stone-shadow)] hover:text-[var(--stone-mid)] mb-4 transition-colors">
        <ChevronRight className="w-3 h-3 rotate-180" /> Back
      </button>
      <p className="text-[var(--stone-light)] font-semibold mb-1">One-time Support</p>
      <p className="text-xs text-[var(--stone-shadow)] mb-4">100% goes to the creator minus payment processing fees.</p>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {amounts.map((amt) => (
          <button
            key={amt}
            onClick={() => { onSelect(amt); onCustom(""); }}
            className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
              selected === amt && !custom
                ? "bg-[var(--gold)] text-black border-[var(--gold)]"
                : "bg-[var(--void-4)] text-[var(--stone-mid)] border-white/10 hover:border-[var(--gold)]/40"
            }`}
          >
            ${amt}
          </button>
        ))}
      </div>

      <input
        type="number"
        placeholder="Custom amount ($)"
        value={custom}
        onChange={(e) => { onCustom(e.target.value); onSelect(0); }}
        className="w-full bg-[var(--void-4)] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[var(--stone-light)] placeholder:text-[var(--stone-shadow)] focus:outline-none focus:border-[var(--gold)]/50 mb-4"
      />

      <button
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-[var(--gold)] text-black font-semibold text-sm hover:bg-[var(--gold-glow)] transition-colors disabled:opacity-50"
      >
        {loading ? "Opening checkout…" : `Support with $${custom || selected}`}
      </button>
    </div>
  );
}

// ── Patronage panel ────────────────────────────────────────────────
function PatronagePanel({ tiers, loading, onSelect, onBack }: {
  tiers: typeof PATRONAGE_TIERS; loading: boolean;
  onSelect: (tier: "witness" | "reserve" | "steward") => void; onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--stone-shadow)] hover:text-[var(--stone-mid)] mb-4 transition-colors">
        <ChevronRight className="w-3 h-3 rotate-180" /> Back
      </button>
      <p className="text-[var(--stone-light)] font-semibold mb-1">Monthly Patronage</p>
      <p className="text-xs text-[var(--stone-shadow)] mb-4">Participate in the creator's journey. Not just a like.</p>

      <div className="space-y-2">
        {tiers.map((tier) => (
          <button
            key={tier.id}
            onClick={() => onSelect(tier.id)}
            disabled={loading}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-white/10 bg-[var(--void-4)] hover:border-[var(--gold)]/30 transition-all text-left group"
          >
            <div className={`${tier.color} flex-shrink-0`}>{tier.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--stone-light)]">{tier.label}</p>
                {tier.free && <span className="text-[10px] bg-emerald-400/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">FREE</span>}
              </div>
              <p className="text-xs text-[var(--stone-shadow)]">{tier.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--stone-shadow)] group-hover:text-[var(--stone-mid)] flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── License panel ──────────────────────────────────────────────────
function LicensePanel({ target, onBack, onClose }: { target: SupportTarget; onBack: () => void; onClose: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--stone-shadow)] hover:text-[var(--stone-mid)] mb-4 transition-colors">
        <ChevronRight className="w-3 h-3 rotate-180" /> Back
      </button>
      <p className="text-[var(--stone-light)] font-semibold mb-1">License This Work</p>
      <p className="text-xs text-[var(--stone-shadow)] mb-4">Obtain rights to use this work commercially or in a sync context.</p>

      <div className="space-y-2 mb-4">
        {[
          { label: "Personal / Non-commercial", desc: "Use for personal projects, no revenue generated", price: "Contact creator" },
          { label: "Commercial License", desc: "Use in commercial projects, advertising, or products", price: "Contact creator" },
          { label: "Sync License", desc: "Use in film, TV, YouTube, or other video content", price: "Contact creator" },
        ].map((lic) => (
          <div key={lic.label} className="flex items-start gap-3 p-3 rounded-lg border border-white/8 bg-[var(--void-4)]">
            <Shield className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--stone-light)]">{lic.label}</p>
              <p className="text-xs text-[var(--stone-shadow)]">{lic.desc}</p>
            </div>
            <span className="text-xs text-[var(--gold)] font-mono flex-shrink-0">{lic.price}</span>
          </div>
        ))}
      </div>

      <Link to={`/creator/${target.creatorId}`} onClick={onClose}>
        <button className="w-full py-3 rounded-xl border border-[var(--gold)]/30 text-[var(--gold)] text-sm font-medium hover:bg-[var(--gold)]/10 transition-colors flex items-center justify-center gap-2">
          <Users className="w-4 h-4" />
          Contact Creator
        </button>
      </Link>
    </div>
  );
}

// ── Share panel ────────────────────────────────────────────────────
function SharePanel({ target, copied, onCopy, onBack }: {
  target: SupportTarget; copied: boolean; onCopy: () => void; onBack: () => void;
}) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/song/${target.songId}`;
  const text = `"${target.songTitle}" by ${target.creatorName} — registered on Living Nexus`;

  const socialLinks = [
    { label: "X / Twitter", url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, color: "text-sky-400" },
    { label: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, color: "text-blue-400" },
    { label: "LinkedIn", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, color: "text-blue-300" },
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--stone-shadow)] hover:text-[var(--stone-mid)] mb-4 transition-colors">
        <ChevronRight className="w-3 h-3 rotate-180" /> Back
      </button>
      <p className="text-[var(--stone-light)] font-semibold mb-1">Share This Work</p>
      <p className="text-xs text-[var(--stone-shadow)] mb-4">Every share extends the reach of this creator's registered work.</p>

      {/* Copy link */}
      <div className="flex items-center gap-2 bg-[var(--void-4)] border border-white/10 rounded-lg px-3 py-2.5 mb-3">
        <LinkIcon className="w-4 h-4 text-[var(--stone-shadow)] flex-shrink-0" />
        <span className="flex-1 text-xs text-[var(--stone-mid)] truncate font-mono">{url}</span>
        <button onClick={onCopy} className="flex-shrink-0 text-xs text-[var(--gold)] hover:text-[var(--gold-glow)] font-medium flex items-center gap-1">
          {copied ? <><Check className="w-3 h-3" /> Copied</> : "Copy"}
        </button>
      </div>

      {/* Social share */}
      <div className="space-y-2">
        {socialLinks.map((s) => (
          <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-white/8 bg-[var(--void-4)] hover:border-white/20 transition-all"
          >
            <ExternalLink className={`w-4 h-4 ${s.color}`} />
            <span className="text-sm text-[var(--stone-light)]">Share on {s.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
