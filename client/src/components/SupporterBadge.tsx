/**
 * SupporterBadge — displays a Founder's Era tier badge inline.
 * Used on creator profile pages and the Supporters Wall.
 *
 * Tiers:
 *   covenant  → 🔐 Covenant Partner  (gold border, deep glow)
 *   patron    → ⟡  Patron            (silver/violet)
 *   supporter → ✦  Supporter         (subtle gold)
 */

import { Link } from "wouter";

type Tier = "covenant" | "patron" | "supporter";

interface SupporterBadgeProps {
  tier: Tier;
  /** If true, wraps the badge in a link to /founders */
  linkToFounders?: boolean;
  /** Extra CSS classes */
  className?: string;
}

const TIER_CONFIG: Record<Tier, { icon: string; label: string; style: React.CSSProperties; borderColor: string }> = {
  covenant: {
    icon: "🔐",
    label: "Covenant Partner",
    borderColor: "rgba(232,223,200,0.6)",
    style: {
      background: "rgba(196,154,40,0.08)",
      color: "var(--ln-gold)",
      border: "1px solid rgba(196,154,40,0.6)",
      boxShadow: "0 0 8px rgba(196,154,40,0.2)",
    },
  },
  patron: {
    icon: "⟡",
    label: "Patron",
    borderColor: "rgba(196,154,40,0.5)",
    style: {
      background: "rgba(196,154,40,0.09)",
      color: "var(--ln-gold)",
      border: "1px solid rgba(196,154,40,0.5)",
    },
  },
  supporter: {
    icon: "✦",
    label: "Supporter",
    borderColor: "rgba(196,154,40,0.3)",
    style: {
      background: "rgba(230,205,174,0.07)",
      color: "rgba(230,205,174,0.85)",
      border: "1px solid rgba(196,154,40,0.3)",
    },
  },
};

export default function SupporterBadge({ tier, linkToFounders = false, className = "" }: SupporterBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.supporter;

  const badge = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${className}`}
      style={config.style}
      title={`Founder's Era — ${config.label}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );

  if (linkToFounders) {
    return (
      <Link href="/founders" onClick={(e) => e.stopPropagation()}>
        {badge}
      </Link>
    );
  }

  return badge;
}
