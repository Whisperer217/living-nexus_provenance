/**
 * usePullToRefresh
 *
 * Attaches pull-to-refresh touch gesture handling to a scroll container.
 * Uses the `.player-scroll-area` class (MainLayout's main scroll div) by default,
 * or a custom containerRef if provided.
 *
 * Returns:
 *   pullProgress  0–1   how far the user has dragged (for animating the indicator)
 *   isRefreshing  bool  true while the onRefresh callback is in-flight
 *   indicatorY    number  px offset to translate the indicator down as user drags
 *
 * Usage:
 *   const { pullProgress, isRefreshing, indicatorY } = usePullToRefresh({
 *     onRefresh: async () => { await refetch(); }
 *   });
 */

import { useState, useEffect, useRef, useCallback } from "react";

const PULL_THRESHOLD = 64;   // px of drag before release triggers refresh
const MAX_PULL = 96;          // px — indicator stops growing beyond this
const RESISTANCE = 0.45;      // drag resistance factor (lower = harder to pull)

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  /** Optional: only activate on mobile viewports (default: true) */
  mobileOnly?: boolean;
  /** Optional: custom scroll container selector (default: ".player-scroll-area") */
  containerSelector?: string;
  /** Optional: disable the hook entirely */
  disabled?: boolean;
}

interface PullToRefreshState {
  pullProgress: number;   // 0–1
  isRefreshing: boolean;
  indicatorY: number;     // px, for CSS translateY on the indicator
}

export function usePullToRefresh({
  onRefresh,
  mobileOnly = true,
  containerSelector = ".player-scroll-area",
  disabled = false,
}: UsePullToRefreshOptions): PullToRefreshState {
  const [state, setState] = useState<PullToRefreshState>({
    pullProgress: 0,
    isRefreshing: false,
    indicatorY: -80,
  });

  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef(false);
  const isRefreshingRef = useRef(false);
  const currentPull = useRef(0);

  const getContainer = useCallback((): HTMLElement | null => {
    return document.querySelector<HTMLElement>(containerSelector);
  }, [containerSelector]);

  const isMobile = useCallback((): boolean => {
    if (!mobileOnly) return true;
    return window.matchMedia("(max-width: 768px)").matches ||
      ("ontouchstart" in window);
  }, [mobileOnly]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (!isMobile()) return;
      if (isRefreshingRef.current) return;
      const container = getContainer();
      if (!container) return;
      // Only activate when the scroll container is at the very top
      if (container.scrollTop > 2) return;
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      if (isRefreshingRef.current) return;
      const container = getContainer();
      if (!container) return;
      // Re-check scroll position — user may have scrolled since touchstart
      if (container.scrollTop > 2) {
        touchStartY.current = null;
        return;
      }
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY <= 0) {
        // Scrolling up — not a pull-to-refresh gesture
        touchStartY.current = null;
        return;
      }
      // It's a downward drag — engage PTR
      isDragging.current = true;
      // Apply resistance so it feels natural
      const pull = Math.min(deltaY * RESISTANCE, MAX_PULL);
      currentPull.current = pull;
      const progress = Math.min(pull / PULL_THRESHOLD, 1);
      // Translate indicator from -80px (hidden above) to 0 (fully visible)
      const indicatorY = -80 + Math.min(pull, PULL_THRESHOLD) * (80 / PULL_THRESHOLD);
      setState(s => ({ ...s, pullProgress: progress, indicatorY }));
      // Prevent the browser's native pull-to-reload on Android Chrome
      if (pull > 4) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!isDragging.current || touchStartY.current === null) {
        touchStartY.current = null;
        isDragging.current = false;
        return;
      }
      touchStartY.current = null;
      isDragging.current = false;
      const pull = currentPull.current;
      currentPull.current = 0;
      if (pull < PULL_THRESHOLD) {
        // Didn't pull far enough — snap back
        setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
        return;
      }
      // Threshold reached — trigger refresh
      isRefreshingRef.current = true;
      setState({ pullProgress: 1, isRefreshing: true, indicatorY: 8 });
      try {
        await onRefresh();
      } finally {
        isRefreshingRef.current = false;
        // Brief pause so user sees the spinner complete
        await new Promise(r => setTimeout(r, 400));
        setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
      }
    };

    // Attach to the document so we catch touches that start anywhere on the page
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [disabled, onRefresh, getContainer, isMobile]);

  return state;
}
