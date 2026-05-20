/**
 * ProvenanceSystem — Progressive Provenance Reveal
 * ──────────────────────────────────────────────────
 * Manages the layered revelation of provenance depth.
 * Surface level shows minimal WID badge. Each interaction
 * reveals deeper layers: contributors → lineage → transformations → derivatives.
 * 
 * Architecture: progressive disclosure, never overwhelming.
 * Users pull depth on demand; the system never pushes complexity.
 */
import { useCallback, useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ProvenanceDepth = "surface" | "contributors" | "lineage" | "transformations" | "full";

const DEPTH_ORDER: ProvenanceDepth[] = ["surface", "contributors", "lineage", "transformations", "full"];

export interface Contributor {
  name: string;
  role: string;
  avatarUrl?: string;
  profileId?: number;
}

export interface Transformation {
  type: string;
  date: string;
  from?: string;
  description?: string;
}

export interface Derivative {
  title: string;
  id: string;
  type: string;
  thumbnailUrl?: string;
}

export interface ProvenanceRecord {
  witnessId?: string;
  createdAt?: string;
  creator?: string;
  creatorAvatarUrl?: string;
  contributors?: Contributor[];
  transformations?: Transformation[];
  derivatives?: Derivative[];
  consentType?: string;
  aiDisclosure?: string;
  registrationDate?: string;
  blockchainHash?: string;
}

export type ProvenanceState = {
  /** Current reveal depth */
  depth: ProvenanceDepth;
  /** Numeric depth index (0-4) */
  depthIndex: number;
  /** Maximum available depth based on data */
  maxAvailableDepth: ProvenanceDepth;
  /** Whether deeper layers exist beyond current */
  hasDeeper: boolean;
  /** The provenance data record */
  record: ProvenanceRecord;
  /** What's visible at current depth */
  visibleLayers: ProvenanceDepth[];
  /** Reveal next depth layer */
  revealNext: () => void;
  /** Collapse to specific depth */
  collapseTo: (depth: ProvenanceDepth) => void;
  /** Reset to surface */
  reset: () => void;
  /** Jump to full depth */
  revealAll: () => void;
  /** Check if a specific depth is currently visible */
  isVisible: (depth: ProvenanceDepth) => boolean;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface ProvenanceConfig {
  /** The provenance data to progressively reveal */
  record?: ProvenanceRecord;
  /** Initial depth (default: surface) */
  initialDepth?: ProvenanceDepth;
  /** Whether provenance system is enabled */
  enabled?: boolean;
}

export function useProvenanceSystem(config: ProvenanceConfig = {}): ProvenanceState {
  const {
    record = {},
    initialDepth = "surface",
    enabled = true,
  } = config;

  const [depth, setDepth] = useState<ProvenanceDepth>(initialDepth);

  // ── Compute max available depth based on data ────────────────────────────
  const maxAvailableDepth = useMemo((): ProvenanceDepth => {
    if (!enabled) return "surface";
    if (record.derivatives && record.derivatives.length > 0) return "full";
    if (record.transformations && record.transformations.length > 0) return "transformations";
    if (record.contributors && record.contributors.length > 0) return "lineage";
    if (record.creator || record.witnessId) return "contributors";
    return "surface";
  }, [record, enabled]);

  const depthIndex = DEPTH_ORDER.indexOf(depth);
  const maxIndex = DEPTH_ORDER.indexOf(maxAvailableDepth);
  const hasDeeper = depthIndex < maxIndex;

  const visibleLayers = useMemo(() => {
    return DEPTH_ORDER.slice(0, depthIndex + 1);
  }, [depthIndex]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const revealNext = useCallback(() => {
    const nextIdx = Math.min(depthIndex + 1, maxIndex);
    setDepth(DEPTH_ORDER[nextIdx]);
  }, [depthIndex, maxIndex]);

  const collapseTo = useCallback((target: ProvenanceDepth) => {
    const targetIdx = DEPTH_ORDER.indexOf(target);
    if (targetIdx >= 0 && targetIdx <= maxIndex) {
      setDepth(target);
    }
  }, [maxIndex]);

  const reset = useCallback(() => {
    setDepth("surface");
  }, []);

  const revealAll = useCallback(() => {
    setDepth(maxAvailableDepth);
  }, [maxAvailableDepth]);

  const isVisible = useCallback((target: ProvenanceDepth) => {
    return DEPTH_ORDER.indexOf(target) <= depthIndex;
  }, [depthIndex]);

  return {
    depth,
    depthIndex,
    maxAvailableDepth,
    hasDeeper,
    record,
    visibleLayers,
    revealNext,
    collapseTo,
    reset,
    revealAll,
    isVisible,
  };
}
