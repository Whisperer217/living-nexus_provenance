/**
 * IdentitySystem — Creator & Contributor Presence
 * ─────────────────────────────────────────────────
 * Maintains persistent creator identity across all viewing modes.
 * Shows creator sigils, contributor badges, and role indicators
 * without disrupting immersion.
 * 
 * Identity is always present but never dominant.
 * It whispers authorship; it doesn't shout it.
 */
import { useCallback, useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreatorPresence {
  id: number | string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  role: "creator" | "contributor" | "collaborator" | "curator";
  /** Specific contribution type */
  contributionType?: string;
  /** Whether this creator is verified */
  isVerified?: boolean;
  /** WID associated with this creator */
  witnessId?: string;
}

export type IdentityVisibility = "minimal" | "standard" | "expanded";

export type IdentityState = {
  /** Primary creator of this manifestation */
  primaryCreator: CreatorPresence | null;
  /** All contributors (including primary) */
  contributors: CreatorPresence[];
  /** Current visibility level */
  visibility: IdentityVisibility;
  /** Whether identity overlay is expanded */
  isExpanded: boolean;
  /** Formatted creator line (e.g., "by Doc Seraph Mercer") */
  creatorLine: string;
  /** Formatted contributor count */
  contributorCount: number;
  /** Set visibility level */
  setVisibility: (level: IdentityVisibility) => void;
  /** Toggle expanded state */
  toggleExpanded: () => void;
  /** Get contributor by role */
  getByRole: (role: CreatorPresence["role"]) => CreatorPresence[];
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface IdentityConfig {
  /** Primary creator info */
  creator?: {
    id?: number | string;
    name?: string;
    handle?: string;
    avatarUrl?: string;
    isVerified?: boolean;
    witnessId?: string;
  };
  /** Additional contributors */
  contributors?: Array<{
    name: string;
    role: string;
    avatarUrl?: string;
    profileId?: number;
  }>;
  /** Initial visibility */
  initialVisibility?: IdentityVisibility;
}

export function useIdentitySystem(config: IdentityConfig = {}): IdentityState {
  const {
    creator,
    contributors: rawContributors = [],
    initialVisibility = "minimal",
  } = config;

  const [visibility, setVisibility] = useState<IdentityVisibility>(initialVisibility);
  const [isExpanded, setIsExpanded] = useState(false);

  // ── Build presence list ──────────────────────────────────────────────────
  const primaryCreator = useMemo((): CreatorPresence | null => {
    if (!creator || !creator.name) return null;
    return {
      id: creator.id ?? 0,
      name: creator.name,
      handle: creator.handle,
      avatarUrl: creator.avatarUrl,
      role: "creator",
      isVerified: creator.isVerified,
      witnessId: creator.witnessId,
    };
  }, [creator]);

  const contributors = useMemo((): CreatorPresence[] => {
    const list: CreatorPresence[] = [];
    if (primaryCreator) list.push(primaryCreator);
    for (const c of rawContributors) {
      list.push({
        id: c.profileId ?? c.name,
        name: c.name,
        avatarUrl: c.avatarUrl,
        role: c.role === "creator" ? "creator" : c.role === "collaborator" ? "collaborator" : "contributor",
        contributionType: c.role,
      });
    }
    return list;
  }, [primaryCreator, rawContributors]);

  const creatorLine = useMemo(() => {
    if (!primaryCreator) return "";
    return `by ${primaryCreator.name}`;
  }, [primaryCreator]);

  const contributorCount = contributors.length;

  // ── Actions ──────────────────────────────────────────────────────────────
  const toggleExpanded = useCallback(() => {
    setIsExpanded(v => !v);
  }, []);

  const getByRole = useCallback((role: CreatorPresence["role"]): CreatorPresence[] => {
    return contributors.filter(c => c.role === role);
  }, [contributors]);

  return {
    primaryCreator,
    contributors,
    visibility,
    isExpanded,
    creatorLine,
    contributorCount,
    setVisibility,
    toggleExpanded,
    getByRole,
  };
}
