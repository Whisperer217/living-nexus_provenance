/**
 * NavigationSystem — Adaptive Traversal Architecture
 * ────────────────────────────────────────────────────
 * Shared navigation system that adapts its behavior based on
 * the active medium type. Comics navigate by page/panel,
 * manuscripts by chapter/section, video by timestamp, lore by entry.
 * 
 * The navigation system provides a unified interface while
 * each medium adapter configures its traversal semantics.
 */
import { useCallback, useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type TraversalUnit = "page" | "panel" | "chapter" | "section" | "entry" | "timestamp" | "segment";

export interface NavigationNode {
  id: string;
  label: string;
  /** Index in the flat traversal order */
  index: number;
  /** Parent node ID (for hierarchical nav) */
  parentId?: string;
  /** Thumbnail URL for visual nav */
  thumbnailUrl?: string;
  /** Whether this node is a boundary (chapter start, etc.) */
  isBoundary?: boolean;
  /** Metadata for this node */
  meta?: Record<string, unknown>;
}

export interface NavigationConfig {
  /** Total traversable units */
  totalUnits: number;
  /** The primary traversal unit for this medium */
  primaryUnit?: TraversalUnit;
  /** Secondary unit (e.g., panels within pages) */
  secondaryUnit?: TraversalUnit;
  /** Navigation nodes (for structured nav like chapters) */
  nodes?: NavigationNode[];
  /** Whether looping is enabled (end → start) */
  loop?: boolean;
  /** Step size for primary navigation (default: 1) */
  stepSize?: number;
  /** Callback when position changes */
  onPositionChange?: (position: number, unit: TraversalUnit) => void;
  /** Initial position */
  initialPosition?: number;
  /** Medium type (affects navigation semantics) */
  mediumType?: string;
}

export type NavigationState = {
  /** Current position in primary units */
  position: number;
  /** Total units */
  total: number;
  /** Progress as fraction (0-1) */
  progress: number;
  /** Primary traversal unit */
  primaryUnit: TraversalUnit;
  /** Secondary unit position (e.g., panel within page) */
  secondaryPosition: number;
  /** Whether we can advance */
  canAdvance: boolean;
  /** Whether we can retreat */
  canRetreat: boolean;
  /** Current node (if structured nav) */
  currentNode: NavigationNode | null;
  /** All nodes */
  nodes: NavigationNode[];
  /** Boundary nodes (chapter starts, etc.) */
  boundaries: NavigationNode[];
  /** Advance by one primary unit */
  advance: () => void;
  /** Retreat by one primary unit */
  retreat: () => void;
  /** Jump to specific position */
  jumpTo: (position: number) => void;
  /** Jump to specific node */
  jumpToNode: (nodeId: string) => void;
  /** Set secondary position */
  setSecondaryPosition: (pos: number) => void;
  /** Get nearest boundary before current position */
  nearestBoundary: () => NavigationNode | null;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useNavigationSystem(config: NavigationConfig): NavigationState {
  const {
    totalUnits,
    primaryUnit = "page",
    secondaryUnit,
    nodes = [],
    loop = false,
    stepSize = 1,
    onPositionChange,
    initialPosition = 0,
    mediumType,
  } = config;

  const [position, setPosition] = useState(initialPosition);
  const [secondaryPosition, setSecondaryPosition] = useState(0);

  const total = totalUnits;
  const progress = total > 1 ? position / (total - 1) : 0;
  const canAdvance = loop || position < total - 1;
  const canRetreat = loop || position > 0;

  // ── Structured navigation ────────────────────────────────────────────────
  const currentNode = useMemo(() => {
    return nodes.find(n => n.index === position) ?? null;
  }, [nodes, position]);

  const boundaries = useMemo(() => {
    return nodes.filter(n => n.isBoundary);
  }, [nodes]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const advance = useCallback(() => {
    setPosition(prev => {
      const next = prev + stepSize;
      if (next >= total) return loop ? 0 : total - 1;
      return next;
    });
    setSecondaryPosition(0);
    onPositionChange?.(position + stepSize, primaryUnit);
  }, [total, loop, stepSize, onPositionChange, position, primaryUnit]);

  const retreat = useCallback(() => {
    setPosition(prev => {
      const next = prev - stepSize;
      if (next < 0) return loop ? total - 1 : 0;
      return next;
    });
    setSecondaryPosition(0);
    onPositionChange?.(position - stepSize, primaryUnit);
  }, [total, loop, stepSize, onPositionChange, position, primaryUnit]);

  const jumpTo = useCallback((pos: number) => {
    const clamped = Math.max(0, Math.min(total - 1, pos));
    setPosition(clamped);
    setSecondaryPosition(0);
    onPositionChange?.(clamped, primaryUnit);
  }, [total, onPositionChange, primaryUnit]);

  const jumpToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) jumpTo(node.index);
  }, [nodes, jumpTo]);

  const nearestBoundary = useCallback((): NavigationNode | null => {
    let nearest: NavigationNode | null = null;
    for (const b of boundaries) {
      if (b.index <= position) {
        if (!nearest || b.index > nearest.index) nearest = b;
      }
    }
    return nearest;
  }, [boundaries, position]);

  return {
    position,
    total,
    progress,
    primaryUnit,
    secondaryPosition,
    canAdvance,
    canRetreat,
    currentNode,
    nodes,
    boundaries,
    advance,
    retreat,
    jumpTo,
    jumpToNode,
    setSecondaryPosition,
    nearestBoundary,
  };
}
