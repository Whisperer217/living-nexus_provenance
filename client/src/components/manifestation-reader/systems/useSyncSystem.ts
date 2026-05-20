/**
 * SyncSystem — Atmospheric Soundtrack Synchronization
 * ─────────────────────────────────────────────────────
 * Subtle, optional soundtrack synchronization that functions
 * as atmospheric enhancement rather than forced cinematic playback.
 * 
 * The system suggests audio transitions; it never forces them.
 * Users can disable sync entirely while retaining all other systems.
 * 
 * Sync cues are page/panel-aware and trigger soft crossfades
 * rather than abrupt track changes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncCue {
  /** Page index (0-based) */
  page: number;
  /** Optional panel/region ID for guided mode precision */
  region?: string;
  /** Track ID to sync with */
  trackId: string;
  /** Start time in seconds within the track */
  startTime: number;
  /** Optional fade duration in ms (default: 2000) */
  fadeDuration?: number;
  /** Optional label for the cue (shown subtly in UI) */
  label?: string;
  /** Whether this is a mood shift (triggers atmosphere change) */
  isMoodShift?: boolean;
  /** Associated mood profile ID */
  moodId?: string;
}

export type SyncState = {
  /** Whether sync is enabled (user preference) */
  enabled: boolean;
  /** Current active cue (if any) */
  activeCue: SyncCue | null;
  /** Whether a sync transition is in progress */
  isTransitioning: boolean;
  /** All registered cues */
  cues: SyncCue[];
  /** Pending cue (suggested but not yet applied) */
  pendingCue: SyncCue | null;
  /** Enable/disable sync */
  setEnabled: (enabled: boolean) => void;
  /** Notify the system of a page change */
  onPageChange: (pageIdx: number) => void;
  /** Notify the system of a panel change */
  onPanelChange: (pageIdx: number, regionId?: string) => void;
  /** Accept a pending cue suggestion */
  acceptPending: () => void;
  /** Dismiss a pending cue */
  dismissPending: () => void;
  /** Get cue for a specific page (preview) */
  getCueForPage: (pageIdx: number) => SyncCue | undefined;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface SyncConfig {
  /** Soundtrack cues for this manifestation */
  cues?: SyncCue[];
  /** Whether sync starts enabled */
  initiallyEnabled?: boolean;
  /** Callback when a cue should be applied (integrate with player) */
  onCueActivate?: (cue: SyncCue) => void;
  /** Callback when sync suggests a mood change */
  onMoodSuggestion?: (moodId: string) => void;
}

export function useSyncSystem(config: SyncConfig = {}): SyncState {
  const {
    cues = [],
    initiallyEnabled = true,
    onCueActivate,
    onMoodSuggestion,
  } = config;

  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [activeCue, setActiveCue] = useState<SyncCue | null>(null);
  const [pendingCue, setPendingCue] = useState<SyncCue | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cue lookup ───────────────────────────────────────────────────────────
  const cueMap = useMemo(() => {
    const map = new Map<string, SyncCue>();
    for (const cue of cues) {
      const key = cue.region ? `${cue.page}:${cue.region}` : `${cue.page}`;
      map.set(key, cue);
    }
    return map;
  }, [cues]);

  const getCueForPage = useCallback((pageIdx: number): SyncCue | undefined => {
    return cueMap.get(`${pageIdx}`);
  }, [cueMap]);

  // ── Page/Panel change handlers ───────────────────────────────────────────
  const activateCue = useCallback((cue: SyncCue) => {
    if (!enabled) return;
    
    setIsTransitioning(true);
    const fadeDuration = cue.fadeDuration ?? 2000;
    
    // Set as active
    setActiveCue(cue);
    onCueActivate?.(cue);
    
    // Mood suggestion (atmospheric, not forced)
    if (cue.isMoodShift && cue.moodId) {
      onMoodSuggestion?.(cue.moodId);
    }
    
    // Clear transition state after fade
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      setIsTransitioning(false);
    }, fadeDuration);
  }, [enabled, onCueActivate, onMoodSuggestion]);

  const onPageChange = useCallback((pageIdx: number) => {
    if (!enabled || cues.length === 0) return;
    
    const cue = cueMap.get(`${pageIdx}`);
    if (!cue) return;
    
    // If same track already playing, don't interrupt
    if (activeCue && activeCue.trackId === cue.trackId && !cue.region) return;
    
    // Subtle: suggest rather than force
    if (activeCue) {
      setPendingCue(cue);
    } else {
      activateCue(cue);
    }
  }, [enabled, cues, cueMap, activeCue, activateCue]);

  const onPanelChange = useCallback((pageIdx: number, regionId?: string) => {
    if (!enabled || cues.length === 0 || !regionId) return;
    
    const cue = cueMap.get(`${pageIdx}:${regionId}`);
    if (cue) {
      activateCue(cue);
    }
  }, [enabled, cues, cueMap, activateCue]);

  // ── Pending cue management ───────────────────────────────────────────────
  const acceptPending = useCallback(() => {
    if (pendingCue) {
      activateCue(pendingCue);
      setPendingCue(null);
    }
  }, [pendingCue, activateCue]);

  const dismissPending = useCallback(() => {
    setPendingCue(null);
  }, []);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (transitionTimer.current) clearTimeout(transitionTimer.current); };
  }, []);

  return {
    enabled,
    activeCue,
    isTransitioning,
    cues,
    pendingCue,
    setEnabled,
    onPageChange,
    onPanelChange,
    acceptPending,
    dismissPending,
    getCueForPage,
  };
}
