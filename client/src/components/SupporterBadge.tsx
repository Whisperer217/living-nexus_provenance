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
    borderColor: "oklch(0.84 0.155 85 / 0.7)",
    style: {
      background: "oklch(0.84 0.155 85 / 0.12)",
      color: "oklch(0.84 0.155 85)",
      border: "1px solid oklch(0.84 0.155 85 / 0.7)",
      boxShadow: "0 0 8px oklch(0.84 0.155 85 / 0.25)",
    },
  },
  patron: {
    icon: "⟡",
    label: "Patron",
    borderColor: "oklch(0.72 0.14 295 / 0.6)",
    style: {
      background: "oklch(0.72 0.14 295 / 0.1)",
      color: "oklch(0.78 0.12 295)",
      border: "1px solid oklch(0.72 0.14 295 / 0.6)",
    },
  },
  supporter: {
    icon: "✦",
    label: "Supporter",
    borderColor: "oklch(0.84 0.155 85 / 0.35)",
    style: {
      background: "oklch(0.84 0.155 85 / 0.07)",
      color: "oklch(0.84 0.155 85 / 0.85)",
      border: "1px solid oklch(0.84 0.155 85 / 0.35)",
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
