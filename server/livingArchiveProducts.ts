/**
 * Living Nexus — One-Time Payment Products
 *
 * No subscriptions. No monthly fees. Pay once, own it forever.
 *
 * Tiers:
 *   Founder Unlimited    — $88.88 (early), $288.88 (after 10 founders claimed)
 *   Creator License      — $88.88 one-time, 100 slots included
 *   Slot Packages (bulk) — 100 / 300 / 500 slots
 *   Micro Packages       — 10 / 30 / 50 slots
 *
 * Slot unit price: $0.88 each (bulk packages priced accordingly)
 */

// ── Founder tier ──────────────────────────────────────────────────────────────
export const FOUNDER_PRICE_EARLY_CENTS = 8888;   // $88.88 — first 10 founders
export const FOUNDER_PRICE_LATE_CENTS  = 28888;  // $288.88 — after 10 founders claimed
export const FOUNDER_THRESHOLD        = 10;       // price increases after this many founders

// ── Creator License ───────────────────────────────────────────────────────────
export const LICENSE_PRICE_CENTS = 8888;  // $88.88 one-time, includes 100 slots
export const LICENSE_SLOTS       = 100;

// ── Slot packages ─────────────────────────────────────────────────────────────
export const SLOT_PACKAGES = [
  { id: "micro_10",  label: "Micro",    slots: 10,  priceCents: 880,   description: "10 upload slots" },
  { id: "micro_30",  label: "Micro",    slots: 30,  priceCents: 2640,  description: "30 upload slots" },
  { id: "micro_50",  label: "Micro",    slots: 50,  priceCents: 4400,  description: "50 upload slots" },
  { id: "bulk_100",  label: "Standard", slots: 100, priceCents: 8800,  description: "100 upload slots" },
  { id: "bulk_300",  label: "Value",    slots: 300, priceCents: 26400, description: "300 upload slots — save 0%" },
  { id: "bulk_500",  label: "Pro",      slots: 500, priceCents: 44000, description: "500 upload slots" },
] as const;

export type SlotPackageId = typeof SLOT_PACKAGES[number]["id"];

/** Look up a slot package by id */
export function getSlotPackage(id: SlotPackageId) {
  return SLOT_PACKAGES.find(p => p.id === id)!;
}

/** Human-readable tier labels (for admin display) */
export const TIER_LABELS: Record<string, string> = {
  none:         "No license",
  license:      "Creator License",
  founder:      "Founder — Unlimited",
  founder_free: "Founder Free Tier",
};
