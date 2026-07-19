/**
 * PaymentMethodsPage.tsx
 *
 * Creator payment provider settings.
 * Allows creators to enable/configure any supported payment provider:
 * Stripe, Bitcoin, Lightning (Strike/LNURL), USDC.
 *
 * Route: /settings/payment-methods
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  CreditCard, Bitcoin, Zap, Coins,
  ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, ExternalLink, Shield, Info,
  ArrowLeft, Settings2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD    = "#C49A28";
const SMOKE   = "#9CA3AF";
const SURFACE = "rgba(255,255,255,0.03)";
const BORDER  = "rgba(255,255,255,0.08)";

// ─── Provider definitions ─────────────────────────────────────────────────────
type ProviderId = "stripe" | "bitcoin" | "lightning" | "usdc";

interface ProviderDef {
  id: ProviderId;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  phase: "live" | "beta" | "phase2";
  type: "fiat" | "crypto" | "hybrid";
  fields: FieldDef[];
  learnMoreUrl?: string;
}

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "password" | "url";
  hint?: string;
  required?: boolean;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "stripe",
    name: "Stripe",
    tagline: "Card payments, Apple Pay, Google Pay — the fastest way to accept fiat.",
    icon: <CreditCard size={22} />,
    phase: "live",
    type: "fiat",
    learnMoreUrl: "https://stripe.com/connect",
    fields: [
      {
        key: "accountId",
        label: "Stripe Connected Account ID",
        placeholder: "acct_1234567890",
        hint: "Your Stripe Connect account ID. Found in your Stripe Dashboard → Settings → Account.",
        required: true,
      },
    ],
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    tagline: "On-chain Bitcoin payments. Sovereign, permissionless, final.",
    icon: <Bitcoin size={22} />,
    phase: "live",
    type: "crypto",
    learnMoreUrl: "https://bitcoin.org",
    fields: [
      {
        key: "address",
        label: "Bitcoin Address",
        placeholder: "bc1q...",
        hint: "Your Bitcoin receiving address (Legacy, SegWit, or Taproot). Payments go directly to this address.",
        required: true,
      },
      {
        key: "xpub",
        label: "Extended Public Key (xpub) — optional",
        placeholder: "xpub6...",
        hint: "Optional: provide an xpub to generate a fresh address per payment (enhanced privacy).",
      },
      {
        key: "minConfirmations",
        label: "Minimum Confirmations",
        placeholder: "1",
        hint: "Number of on-chain confirmations before a payment is considered complete. Default: 1.",
      },
    ],
  },
  {
    id: "lightning",
    name: "Lightning Network",
    tagline: "Instant, near-zero fee Bitcoin payments. Ideal for tips and micropayments.",
    icon: <Zap size={22} />,
    phase: "live",
    type: "crypto",
    learnMoreUrl: "https://lightning.network",
    fields: [
      {
        key: "mode",
        label: "Lightning Mode",
        placeholder: "strike",
        hint: "strike = Strike API (custodial, easy setup). lnurl = your own node/BTCPay (sovereign). Default: strike.",
      },
      {
        key: "strikeHandle",
        label: "Strike Handle (for Strike mode)",
        placeholder: "yourhandle",
        hint: "Your Strike username. Payments are sent to $yourhandle on Strike. Get one at strike.me.",
      },
      {
        key: "strikeApiKey",
        label: "Strike API Key (for Strike mode)",
        placeholder: "sk_...",
        type: "password",
        hint: "Your Strike API key. Found in Strike Dashboard → API. Required to generate payment invoices.",
      },
      {
        key: "lnurlEndpoint",
        label: "LNURL-pay Endpoint (for LNURL/BTCPay mode)",
        placeholder: "https://your-btcpay.example.com/api/v1/invoices",
        type: "url",
        hint: "Your LNURL-pay or BTCPay Server endpoint. Used when mode = lnurl.",
      },
    ],
  },
  {
    id: "usdc",
    name: "USDC",
    tagline: "Stable-value crypto. Dollar-denominated, on-chain settlement.",
    icon: <Coins size={22} />,
    phase: "live",
    type: "crypto",
    learnMoreUrl: "https://www.circle.com/usdc",
    fields: [
      {
        key: "network",
        label: "Network",
        placeholder: "ethereum",
        hint: "Supported: ethereum, polygon, base, solana. Default: base (low fees).",
      },
      {
        key: "walletAddress",
        label: "Wallet Address",
        placeholder: "0x...",
        hint: "Your USDC-receiving wallet address on the selected network.",
        required: true,
      },
      {
        key: "coinbaseCommerceApiKey",
        label: "Coinbase Commerce API Key — optional",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        type: "password",
        hint: "Optional: connect Coinbase Commerce for hosted checkout pages and automatic confirmation.",
      },
    ],
  },
];

// ─── Phase badge ──────────────────────────────────────────────────────────────
function PhaseBadge({ phase }: { phase: ProviderDef["phase"] }) {
  if (phase === "live") return (
    <Badge style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)", fontSize: "10px" }}>
      Live
    </Badge>
  );
  if (phase === "beta") return (
    <Badge style={{ background: "rgba(196,154,40,0.15)", color: GOLD, border: `1px solid rgba(196,154,40,0.3)`, fontSize: "10px" }}>
      Beta
    </Badge>
  );
  return (
    <Badge style={{ background: "rgba(156,163,175,0.15)", color: SMOKE, border: "1px solid rgba(156,163,175,0.2)", fontSize: "10px" }}>
      Phase 2
    </Badge>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: ProviderDef["type"] }) {
  const label = type === "fiat" ? "Fiat" : type === "crypto" ? "Crypto" : "Hybrid";
  const color = type === "fiat" ? "#60A5FA" : type === "crypto" ? "#F59E0B" : "#A78BFA";
  return (
    <Badge style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: "10px" }}>
      {label}
    </Badge>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────
interface ProviderCardProps {
  def: ProviderDef;
  savedConfig: Record<string, string>;
  savedEnabled: boolean;
  savedVerified: boolean;
  onSave: (providerId: ProviderId, enabled: boolean, config: Record<string, string>) => Promise<void>;
  isSaving: boolean;
}

function ProviderCard({ def, savedConfig, savedEnabled, savedVerified, onSave, isSaving }: ProviderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(savedEnabled);
  const [config, setConfig] = useState<Record<string, string>>(savedConfig);
  const [dirty, setDirty] = useState(false);

  const handleToggle = (val: boolean) => {
    setEnabled(val);
    setDirty(true);
  };

  const handleFieldChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    await onSave(def.id, enabled, config);
    setDirty(false);
  };

  const iconColor = def.type === "fiat" ? "#60A5FA" : def.type === "crypto" ? "#F59E0B" : "#A78BFA";

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${savedEnabled ? "rgba(196,154,40,0.25)" : BORDER}`,
      borderRadius: "12px",
      overflow: "hidden",
      transition: "border-color 0.2s",
    }}>
      {/* Header row */}
      <div
        style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "14px" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{
          width: 40, height: 40, borderRadius: "10px",
          background: `${iconColor}18`, border: `1px solid ${iconColor}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: iconColor, flexShrink: 0,
        }}>
          {def.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ color: "#F9FAFB", fontWeight: 600, fontSize: "15px" }}>{def.name}</span>
            <PhaseBadge phase={def.phase} />
            <TypeBadge type={def.type} />
            {savedVerified && (
              <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#22C55E", fontSize: "12px" }}>
                <CheckCircle2 size={12} /> Verified
              </span>
            )}
          </div>
          <p style={{ color: SMOKE, fontSize: "13px", marginTop: "2px", lineHeight: 1.4 }}>{def.tagline}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            onClick={e => e.stopPropagation()}
          />
          {expanded ? <ChevronUp size={16} color={SMOKE} /> : <ChevronDown size={16} color={SMOKE} />}
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px" }}>
          <div style={{ display: "grid", gap: "16px" }}>
            {def.fields.map(field => (
              <div key={field.key}>
                <Label style={{ color: "#D1D5DB", fontSize: "13px", marginBottom: "6px", display: "block" }}>
                  {field.label}
                  {field.required && <span style={{ color: "#F87171", marginLeft: "4px" }}>*</span>}
                </Label>
                <Input
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={config[field.key] ?? ""}
                  onChange={e => handleFieldChange(field.key, e.target.value)}
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${BORDER}`,
                    color: "#F9FAFB",
                    fontSize: "13px",
                  }}
                />
                {field.hint && (
                  <p style={{ color: SMOKE, fontSize: "12px", marginTop: "4px", lineHeight: 1.4 }}>
                    {field.hint}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "20px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {def.learnMoreUrl && (
                <a
                  href={def.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "4px", color: SMOKE, fontSize: "12px", textDecoration: "none" }}
                >
                  <ExternalLink size={12} /> Learn more
                </a>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={!dirty || isSaving}
              size="sm"
              style={{
                background: dirty ? `rgba(196,154,40,0.15)` : "transparent",
                border: `1px solid ${dirty ? "rgba(196,154,40,0.4)" : BORDER}`,
                color: dirty ? GOLD : SMOKE,
                fontSize: "13px",
              }}
            >
              {isSaving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PaymentMethodsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [savingProvider, setSavingProvider] = useState<ProviderId | null>(null);

  const { data: settings = [], refetch } = trpc.payments.getCreatorSettings.useQuery(
    { creatorUserId: user?.id },
    { enabled: !!user }
  );

  const saveSettings = trpc.payments.saveProviderSettings.useMutation({
    onSuccess: (result, variables) => {
      refetch();
      if (result.verified) {
        toast.success(`${variables.providerId} configured and verified`);
      } else {
        toast.success(`${variables.providerId} settings saved`);
      }
      if (result.warnings?.length) {
        result.warnings.forEach(w => toast.warning(w));
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSave = async (providerId: ProviderId, enabled: boolean, config: Record<string, string>) => {
    setSavingProvider(providerId);
    try {
      await saveSettings.mutateAsync({ providerId, enabled, config });
    } finally {
      setSavingProvider(null);
    }
  };

  const enabledCount = settings.filter(s => s.enabled).length;

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: SMOKE }}>Please log in to manage payment methods.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div style={{ minHeight: "100vh", background: "#0A0A0F", color: "#F9FAFB" }}>
        {/* Header */}
        <div style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <button
            onClick={() => navigate("/settings/billing")}
            style={{ background: "none", border: "none", color: SMOKE, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
          >
            <ArrowLeft size={16} /> Settings
          </button>
          <Separator orientation="vertical" style={{ height: "16px", background: BORDER }} />
          <Settings2 size={18} color={GOLD} />
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#F9FAFB", margin: 0 }}>Payment Methods</h1>
            <p style={{ fontSize: "12px", color: SMOKE, margin: 0 }}>Configure how fans can support you</p>
          </div>
          {enabledCount > 0 && (
            <Badge style={{ marginLeft: "auto", background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}>
              {enabledCount} active
            </Badge>
          )}
        </div>

        {/* Content */}
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 24px" }}>

          {/* Philosophy banner */}
          <div style={{
            background: `rgba(196,154,40,0.06)`,
            border: `1px solid rgba(196,154,40,0.2)`,
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "32px",
            display: "flex",
            gap: "12px",
          }}>
            <Shield size={20} color={GOLD} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ color: GOLD, fontWeight: 600, fontSize: "14px", margin: "0 0 4px" }}>Sovereign Payment Infrastructure</p>
              <p style={{ color: "#D1D5DB", fontSize: "13px", lineHeight: 1.5, margin: 0 }}>
                Enable any combination of payment providers. Fans see all your active methods at checkout.
                Switch providers at any time — your storefront, profile, and APIs remain unchanged.
                Living Nexus does not take a cut of direct crypto payments.
              </p>
            </div>
          </div>

          {/* Provider cards */}
          <div style={{ display: "grid", gap: "12px" }}>
            {PROVIDERS.map(def => {
              const saved = settings.find(s => s.providerId === def.id);
              return (
                <ProviderCard
                  key={def.id}
                  def={def}
                  savedConfig={(saved?.config ?? {}) as Record<string, string>}
                  savedEnabled={saved?.enabled ?? false}
                  savedVerified={saved?.verified ?? false}
                  onSave={handleSave}
                  isSaving={savingProvider === def.id}
                />
              );
            })}
          </div>

          {/* Phase 2 preview */}
          <div style={{
            marginTop: "32px",
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: "12px",
            padding: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Info size={16} color={SMOKE} />
              <span style={{ color: SMOKE, fontSize: "13px", fontWeight: 600 }}>Coming in Phase 2</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {["PayPal", "Square", "ACH / Bank Transfer", "LNURL (Self-hosted)", "BTCPay Server", "Nostr Wallet Connect", "Apple Pay Direct", "Google Pay Direct"].map(name => (
                <Badge key={name} style={{ background: "rgba(156,163,175,0.08)", color: SMOKE, border: `1px solid ${BORDER}`, fontSize: "11px" }}>
                  {name}
                </Badge>
              ))}
            </div>
            <p style={{ color: SMOKE, fontSize: "12px", marginTop: "12px", lineHeight: 1.5 }}>
              All Phase 2 providers will plug into the same interface — no changes to your storefront or existing configuration required.
            </p>
          </div>

          {/* Transaction history link */}
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button
              onClick={() => navigate("/profile?tab=overview")}
              style={{ background: "none", border: "none", color: SMOKE, fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
            >
              View transaction history in your profile
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
