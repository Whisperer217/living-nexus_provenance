/**
 * Living Archive Subscription Products
 *
 * Two tiers — quarterly and annual — each granting +100 upload slots per period.
 * Slots are additive: a creator with 100 base slots who subscribes quarterly gets 200 total.
 *
 * Pricing:
 *   Quarterly: $12.99 / 3 months  (~$4.33/mo)
 *   Annual:    $44.99 / year       (~$3.75/mo)
 *
 * Framing: "Your WIDs are permanent. Your hosting is sustained."
 * The subscription covers the ongoing cost of keeping immutable WID records live.
 */

export const LIVING_ARCHIVE_PRODUCTS = {
  quarterly: {
    name: "Living Archive — Quarterly",
    description: "100 upload slots per quarter. Your WIDs are permanent. Your hosting is sustained.",
    priceCents: 1299,
    interval: "month" as const,
    intervalCount: 3,
    slotsPerPeriod: 100,
    stripePriceId: process.env.STRIPE_LIVING_ARCHIVE_QUARTERLY_PRICE_ID ?? "",
  },
  annual: {
    name: "Living Archive — Annual",
    description: "100 upload slots per year. Best value. Your WIDs are permanent. Your hosting is sustained.",
    priceCents: 4499,
    interval: "year" as const,
    intervalCount: 1,
    slotsPerPeriod: 100,
    stripePriceId: process.env.STRIPE_LIVING_ARCHIVE_ANNUAL_PRICE_ID ?? "",
  },
} as const;

export type LivingArchivePlan = keyof typeof LIVING_ARCHIVE_PRODUCTS;

/** Slots granted per period for each plan */
export const SLOTS_PER_PERIOD: Record<LivingArchivePlan, number> = {
  quarterly: 100,
  annual: 100,
};

/** Human-readable plan labels */
export const PLAN_LABELS: Record<string, string> = {
  none: "No subscription",
  quarterly: "Living Archive — Quarterly",
  annual: "Living Archive — Annual",
  founder_free: "Founder Free Tier",
};
