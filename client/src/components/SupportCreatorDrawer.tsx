/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — SupportCreatorDrawer
   Participation surface for a registered work.
   Ontology: Gift · Witness · License · Share · Chain of Record
═══════════════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import {
  DollarSign,
  Heart,
  BookOpen,
  Shield,
  Share2,
  ExternalLink,
  ChevronRight,
  Crown,
  Users,
  X,
  Check,
  Link as LinkIcon,
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
  {
    id: "witness" as const,
    label: "Witness",
    description: "Follow the journey. Receive publication updates.",
    icon: <Heart className="w-4 h-4" />,
    free: true,
  },
  {
    id: "reserve" as const,
    label: "Reserve",
    description: "Priority access to new manifestations and early releases.",
    icon: <Crown className="w-4 h-4" />,
    free: false,
  },
  {
    id: "steward" as const,
    label: "Steward",
    description: "Deep patronage. Co-witness the creative process.",
    icon: <Shield className="w-4 h-4" />,
    free: false,
  },
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

  useEffect(() => {
    if (target) {
      setPanel("main");
      setCustomAmount("");
      setSelectedAmount(5);
      setCopied(false);
    }
  }, [target?.songId]);

  if (!target) return null;

  const requireAuth = (cb: () => void) => {
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    cb();
  };

  const handleTip = () => {
    requireAuth(() => {
      const raw = customAmount ? parseFloat(customAmount) : selectedAmount;
      if (!raw || isNaN(raw) || raw < 1) {
        toast.error("Minimum gift is $1");
        return;
      }
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
  const handle = target.creatorHandle ? `@${target.creatorHandle}` : target.creatorName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{
          background: "var(--ln-obsidian, var(--void-3, #111))",
          border: "1px solid color-mix(in srgb, var(--ln-gold, var(--gold)) 28%, transparent)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Imagery header — cover as atmosphere plane */}
        <div className="relative h-36 sm:h-40 overflow-hidden">
          {target.coverArtUrl ? (
            <img
              src={target.coverArtUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(196,154,40,0.28), transparent 65%), linear-gradient(160deg, #1a1408, #050505)",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 45%, rgba(10,8,6,0.96) 100%)",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
            style={{
              color: "color-mix(in srgb, var(--ln-parchment, #EDE5D0) 70%, transparent)",
              background: "rgba(0,0,0,0.35)",
            }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <p
              className="font-heading text-[10px] uppercase tracking-[0.28em] mb-1.5"
              style={{ color: "var(--ln-gold, var(--gold))" }}
            >
              Support creator
            </p>
            <h3
              className="font-heading text-xl sm:text-2xl leading-tight truncate"
              style={{ color: "var(--ln-parchment, #EDE5D0)" }}
            >
              {target.songTitle}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: "var(--ln-smoke, #9A9588)" }}>
              {handle}
            </p>
          </div>
        </div>

        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--ln-gold, var(--gold)) 55%, transparent), transparent)",
          }}
        />

        <div className="p-5 pt-4 max-h-[min(62vh,520px)] overflow-y-auto">
          {panel === "main" && (
            <MainPanel
              target={target}
              canTip={canTip}
              onTip={() => setPanel("tip")}
              onPatronage={() => setPanel("patronage")}
              onLicense={() => setPanel("license")}
              onShare={() => setPanel("share")}
              onProvenance={() => {
                if (target.songWid) navigate(`/verify/${target.songWid}`);
                onClose();
              }}
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
            <LicensePanel target={target} onBack={() => setPanel("main")} onClose={onClose} />
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
      </div>
    </div>
  );
}

function BackLink({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="font-heading flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] mb-4 transition-colors"
      style={{ color: "var(--ln-smoke, #9A9588)" }}
    >
      <ChevronRight className="w-3 h-3 rotate-180" /> Back
    </button>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <p
        className="font-heading text-lg mb-1"
        style={{ color: "var(--ln-parchment, #EDE5D0)" }}
      >
        {title}
      </p>
      <p className="font-body text-sm" style={{ color: "var(--ln-smoke, #9A9588)" }}>
        {subtitle}
      </p>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────
function MainPanel({
  target,
  canTip,
  onTip,
  onPatronage,
  onLicense,
  onShare,
  onProvenance,
}: {
  target: SupportTarget;
  canTip: boolean;
  onTip: () => void;
  onPatronage: () => void;
  onLicense: () => void;
  onShare: () => void;
  onProvenance: () => void;
}) {
  const actions = [
    {
      icon: <DollarSign className="w-5 h-5" />,
      label: "One-time gift",
      description: "Send a direct gift to this creator",
      accent: "#34D399",
      onClick: onTip,
      disabled: !canTip,
      disabledNote: "Creator hasn't enabled payments yet",
    },
    {
      icon: <Crown className="w-5 h-5" />,
      label: "Become a Witness",
      description: "Witness · Reserve · Steward — monthly patronage",
      accent: "var(--ln-gold, var(--gold))",
      onClick: onPatronage,
      disabled: false,
    },
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: "License this work",
      description: "Commercial or sync rights for this manifestation",
      accent: "#A78BFA",
      onClick: onLicense,
      disabled: false,
    },
    {
      icon: <Share2 className="w-5 h-5" />,
      label: "Share this work",
      description: "Copy link or carry it to social",
      accent: "#7DD3FC",
      onClick: onShare,
      disabled: false,
    },
    {
      icon: <Shield className="w-5 h-5" />,
      label: "Chain of Record",
      description: target.songWid
        ? `WID · ${target.songWid.slice(0, 22)}…`
        : "Provenance record",
      accent: "var(--ln-gold, var(--gold))",
      onClick: onProvenance,
      disabled: !target.songWid,
      disabledNote: "No WID assigned yet",
    },
  ];

  return (
    <div className="space-y-2">
      <p
        className="font-heading text-[10px] uppercase tracking-[0.22em] mb-3"
        style={{ color: "color-mix(in srgb, var(--ln-gold, var(--gold)) 80%, transparent)" }}
      >
        Ways to participate
      </p>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.disabled ? undefined : action.onClick}
          disabled={action.disabled}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left group transition-all duration-150"
          style={{
            opacity: action.disabled ? 0.4 : 1,
            cursor: action.disabled ? "not-allowed" : "pointer",
            background: action.disabled
              ? "rgba(255,255,255,0.02)"
              : `color-mix(in srgb, ${action.accent} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${action.accent} ${action.disabled ? 8 : 28}%, transparent)`,
          }}
        >
          <div className="flex-shrink-0" style={{ color: action.accent }}>
            {action.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-heading text-sm tracking-wide"
              style={{
                color: action.disabled
                  ? "var(--ln-smoke, #9A9588)"
                  : "var(--ln-parchment, #EDE5D0)",
              }}
            >
              {action.label}
            </p>
            <p className="font-body text-xs truncate" style={{ color: "var(--ln-smoke, #9A9588)" }}>
              {action.disabled && action.disabledNote ? action.disabledNote : action.description}
            </p>
          </div>
          {!action.disabled && (
            <ChevronRight
              className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-90"
              style={{ color: "var(--ln-parchment, #EDE5D0)" }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ── Tip panel ──────────────────────────────────────────────────────
function TipPanel({
  amounts,
  selected,
  custom,
  loading,
  onSelect,
  onCustom,
  onSubmit,
  onBack,
}: {
  amounts: number[];
  selected: number;
  custom: string;
  loading: boolean;
  onSelect: (n: number) => void;
  onCustom: (s: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <BackLink onBack={onBack} />
      <PanelTitle
        title="One-time gift"
        subtitle="100% goes to the creator minus payment processing fees."
      />

      <div className="grid grid-cols-4 gap-2 mb-3">
        {amounts.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => {
              onSelect(amt);
              onCustom("");
            }}
            className="font-heading py-2.5 rounded-lg text-sm border transition-all"
            style={
              selected === amt && !custom
                ? {
                    background: "var(--ln-gold, var(--gold))",
                    color: "#0A0806",
                    borderColor: "var(--ln-gold, var(--gold))",
                  }
                : {
                    background: "var(--ln-void, var(--void-4, #0a0a0a))",
                    color: "var(--ln-smoke, #9A9588)",
                    borderColor: "color-mix(in srgb, var(--ln-parchment) 12%, transparent)",
                  }
            }
          >
            ${amt}
          </button>
        ))}
      </div>

      <input
        type="number"
        placeholder="Custom amount ($)"
        value={custom}
        onChange={(e) => {
          onCustom(e.target.value);
          onSelect(0);
        }}
        className="font-body w-full rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none"
        style={{
          background: "var(--ln-void, var(--void-4, #0a0a0a))",
          border: "1px solid color-mix(in srgb, var(--ln-parchment) 12%, transparent)",
          color: "var(--ln-parchment, #EDE5D0)",
        }}
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="font-heading w-full py-3 rounded-xl text-sm tracking-wide transition-opacity disabled:opacity-50"
        style={{ background: "var(--ln-gold, var(--gold))", color: "#0A0806" }}
      >
        {loading ? "Opening checkout…" : `Gift $${custom || selected}`}
      </button>
    </div>
  );
}

// ── Patronage panel ────────────────────────────────────────────────
function PatronagePanel({
  tiers,
  loading,
  onSelect,
  onBack,
}: {
  tiers: typeof PATRONAGE_TIERS;
  loading: boolean;
  onSelect: (tier: "witness" | "reserve" | "steward") => void;
  onBack: () => void;
}) {
  return (
    <div>
      <BackLink onBack={onBack} />
      <PanelTitle
        title="Become a Witness"
        subtitle="Participate in the creator's journey — not just a like."
      />

      <div className="space-y-2">
        {tiers.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => onSelect(tier.id)}
            disabled={loading}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left group transition-all"
            style={{
              background: "var(--ln-void, var(--void-4, #0a0a0a))",
              border: "1px solid color-mix(in srgb, var(--ln-gold, var(--gold)) 18%, transparent)",
            }}
          >
            <div className="flex-shrink-0" style={{ color: "var(--ln-gold, var(--gold))" }}>
              {tier.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className="font-heading text-sm"
                  style={{ color: "var(--ln-parchment, #EDE5D0)" }}
                >
                  {tier.label}
                </p>
                {tier.free && (
                  <span
                    className="font-heading text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(52,211,153,0.15)",
                      color: "#34D399",
                    }}
                  >
                    Free
                  </span>
                )}
              </div>
              <p className="font-body text-xs" style={{ color: "var(--ln-smoke, #9A9588)" }}>
                {tier.description}
              </p>
            </div>
            <ChevronRight
              className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-90"
              style={{ color: "var(--ln-parchment, #EDE5D0)" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── License panel ──────────────────────────────────────────────────
function LicensePanel({
  target,
  onBack,
  onClose,
}: {
  target: SupportTarget;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div>
      <BackLink onBack={onBack} />
      <PanelTitle
        title="License this work"
        subtitle="Obtain rights to use this manifestation commercially or in sync."
      />

      <div className="space-y-2 mb-4">
        {[
          {
            label: "Personal / Non-commercial",
            desc: "Personal projects with no revenue generated",
            price: "Contact",
          },
          {
            label: "Commercial license",
            desc: "Commercial projects, advertising, or products",
            price: "Contact",
          },
          {
            label: "Sync license",
            desc: "Film, TV, YouTube, or other timed visual media",
            price: "Contact",
          },
        ].map((lic) => (
          <div
            key={lic.label}
            className="flex items-start gap-3 p-3 rounded-lg"
            style={{
              background: "var(--ln-void, var(--void-4, #0a0a0a))",
              border: "1px solid color-mix(in srgb, var(--ln-parchment) 10%, transparent)",
            }}
          >
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#A78BFA" }} />
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm" style={{ color: "var(--ln-parchment, #EDE5D0)" }}>
                {lic.label}
              </p>
              <p className="font-body text-xs" style={{ color: "var(--ln-smoke, #9A9588)" }}>
                {lic.desc}
              </p>
            </div>
            <span
              className="font-heading text-[11px] uppercase tracking-wider flex-shrink-0"
              style={{ color: "var(--ln-gold, var(--gold))" }}
            >
              {lic.price}
            </span>
          </div>
        ))}
      </div>

      <Link to={`/creator/${target.creatorId}`} onClick={onClose}>
        <button
          type="button"
          className="font-heading w-full py-3 rounded-xl text-sm tracking-wide flex items-center justify-center gap-2 transition-colors"
          style={{
            border: "1px solid color-mix(in srgb, var(--ln-gold, var(--gold)) 35%, transparent)",
            color: "var(--ln-gold, var(--gold))",
          }}
        >
          <Users className="w-4 h-4" />
          Contact creator
        </button>
      </Link>
    </div>
  );
}

// ── Share panel ────────────────────────────────────────────────────
function SharePanel({
  target,
  copied,
  onCopy,
  onBack,
}: {
  target: SupportTarget;
  copied: boolean;
  onCopy: () => void;
  onBack: () => void;
}) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/song/${target.songId}`;
  const text = `"${target.songTitle}" by ${target.creatorName} — registered on Living Nexus`;

  const socialLinks = [
    {
      label: "X / Twitter",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "LinkedIn",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div>
      <BackLink onBack={onBack} />
      <PanelTitle
        title="Share this work"
        subtitle="Every share extends the reach of this registered manifestation."
      />

      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-3"
        style={{
          background: "var(--ln-void, var(--void-4, #0a0a0a))",
          border: "1px solid color-mix(in srgb, var(--ln-parchment) 12%, transparent)",
        }}
      >
        <LinkIcon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-smoke, #9A9588)" }} />
        <span
          className="flex-1 text-xs truncate font-mono"
          style={{ color: "color-mix(in srgb, var(--ln-parchment) 70%, transparent)" }}
        >
          {url}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="font-heading flex-shrink-0 text-xs tracking-wide flex items-center gap-1"
          style={{ color: "var(--ln-gold, var(--gold))" }}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" /> Copied
            </>
          ) : (
            "Copy"
          )}
        </button>
      </div>

      <div className="space-y-2">
        {socialLinks.map((s) => (
          <a
            key={s.label}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg transition-all"
            style={{
              background: "var(--ln-void, var(--void-4, #0a0a0a))",
              border: "1px solid color-mix(in srgb, var(--ln-parchment) 10%, transparent)",
            }}
          >
            <ExternalLink className="w-4 h-4" style={{ color: "var(--ln-gold, var(--gold))" }} />
            <span className="font-heading text-sm" style={{ color: "var(--ln-parchment, #EDE5D0)" }}>
              Share on {s.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
