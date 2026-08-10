/**
 * Creator Guide growth — signal personality derived from platform actions.
 * Leveling is stewardship activity, not Register chrome.
 */

export const GUIDE_DEFAULT_SLOTS = 3;

export const GUIDE_GROWTH_EVENT_TYPES = [
  "track_linked",
  "contact",
  "witness_ack",
] as const;

export type GuideGrowthEventType = (typeof GUIDE_GROWTH_EVENT_TYPES)[number];

/** XP weights — tracks and witness acks weigh heavier than contact pulses. */
export const GUIDE_GROWTH_XP: Record<GuideGrowthEventType, number> = {
  track_linked: 3,
  contact: 1,
  witness_ack: 2,
};

export const GUIDE_SLOT_PACKAGES = [
  { id: "guide_1", label: "+1 Guide Slot", slots: 1, priceCents: 888, description: "One additional Living Nexus Guide slot" },
  { id: "guide_3", label: "+3 Guide Slots", slots: 3, priceCents: 2222, description: "Three additional Guide slots" },
  { id: "guide_5", label: "+5 Guide Slots", slots: 5, priceCents: 3333, description: "Five additional Guide slots" },
] as const;

export type GuideSlotPackageId = (typeof GUIDE_SLOT_PACKAGES)[number]["id"];

export function getGuideSlotPackage(id: GuideSlotPackageId) {
  return GUIDE_SLOT_PACKAGES.find((p) => p.id === id)!;
}

export type SignalPersonalityKind = "nascent" | "resonance" | "bridge" | "archive";

export interface GuideSignalPersonality {
  kind: SignalPersonalityKind;
  label: string;
  summary: string;
  level: number;
  xp: number;
  counts: {
    track_linked: number;
    contact: number;
    witness_ack: number;
  };
}

export function deriveGuideSignalPersonality(counts: {
  track_linked: number;
  contact: number;
  witness_ack: number;
}): GuideSignalPersonality {
  const xp =
    counts.track_linked * GUIDE_GROWTH_XP.track_linked +
    counts.contact * GUIDE_GROWTH_XP.contact +
    counts.witness_ack * GUIDE_GROWTH_XP.witness_ack;
  const level = Math.max(1, 1 + Math.floor(xp / 10));

  const total = counts.track_linked + counts.contact + counts.witness_ack;
  let kind: SignalPersonalityKind = "nascent";
  if (total === 0) {
    kind = "nascent";
  } else if (counts.track_linked >= counts.contact && counts.track_linked >= counts.witness_ack) {
    kind = "resonance";
  } else if (counts.contact >= counts.witness_ack) {
    kind = "bridge";
  } else {
    kind = "archive";
  }

  const labels: Record<SignalPersonalityKind, { label: string; summary: string }> = {
    nascent: {
      label: "Nascent",
      summary: "Awaiting first platform signals — upload, contact, or acknowledge to awaken this guide.",
    },
    resonance: {
      label: "Resonance",
      summary: "Personality shaped by bound works — the guide echoes the creator’s registered tracks.",
    },
    bridge: {
      label: "Bridge",
      summary: "Personality shaped by contact — the guide carries relationships across the platform.",
    },
    archive: {
      label: "Archive",
      summary: "Personality shaped by witness acknowledgments — the guide remembers other creators’ signals.",
    },
  };

  return {
    kind,
    label: labels[kind].label,
    summary: labels[kind].summary,
    level,
    xp,
    counts: { ...counts },
  };
}
