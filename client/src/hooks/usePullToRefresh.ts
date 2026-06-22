/**
 * usePullToRefresh — v3
 *
 * Attaches pull-to-refresh touch gesture handling ONLY to the scroll container.
 * NO listeners are ever attached to `document` or `window`.
 *
 * Why this matters on Android Chrome:
 * - Attaching non-passive touchmove to `document` poisons the global touch
 *   pipeline for the entire page session.
 * - Attaching passive touchend to `document` with an async handler can suspend
 *   the touch event queue during await calls.
 * - Anonymous listeners (touchcancel) attached to `document` are never cleaned
 *   up on re-render, causing stacked listeners across navigations.
 *
 * All three problems are eliminated by scoping every listener to the container.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const PULL_THRESHOLD = 64;   // px of drag before release triggers refresh
const MAX_PULL = 96;          // px — indicator stops growing beyond this
const RESISTANCE = 0.45;      // drag resistance factor
const SAFETY_TIMEOUT = 8000;  // ms — force-reset if refresh hangs

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  /** Only activate on mobile viewports (default: true) */
  mobileOnly?: boolean;
  /** Custom scroll container selector (default: ".player-scroll-area") */
  containerSelector?: string;
  /** Disable the hook entirely */
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
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store the onRefresh callback in a ref so the effect doesn't re-run when it changes
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  const isMobile = useCallback((): boolean => {
    if (!mobileOnly) return true;
    return window.matchMedia("(max-width: 1024px)").matches || ("ontouchstart" in window);
  }, [mobileOnly]);

  useEffect(() => {
    if (disabled) return;

    const container = document.querySelector<HTMLElement>(containerSelector);
    if (!container) return;

    // ── Restore touch-action on the container ──
    const restoreTouchAction = () => {
      container.style.touchAction = "pan-y";
    };

    // ── Full reset ──
    const resetAll = () => {
      isRefreshingRef.current = false;
      isDragging.current = false;
      touchStartY.current = null;
      currentPull.current = 0;
      if (safetyTimer.current) {
        clearTimeout(safetyTimer.current);
        safetyTimer.current = null;
      }
      restoreTouchAction();
      setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
    };

    // ── touchstart ──
    const onTouchStart = (e: TouchEvent) => {
      if (!isMobile()) return;
      if (isRefreshingRef.current) return;
      // Only activate when scroll container is at the very top
      if (container.scrollTop > 2) return;
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = false;
    };

    // ── touchmove (non-passive — needed to call preventDefault) ──
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null) return;
      if (isRefreshingRef.current) return;
      // Re-check scroll position
      if (container.scrollTop > 2) {
        touchStartY.current = null;
        return;
      }
      const deltaY = e.touches[0].clientY - touchStartY.current!;
      if (deltaY <= 0) {
        // Scrolling up — not PTR
        touchStartY.current = null;
        return;
      }
      // Downward drag — engage PTR
      isDragging.current = true;
      // Disable pan-y so we can call preventDefault without conflict
      container.style.touchAction = "none";
      const pull = Math.min(deltaY * RESISTANCE, MAX_PULL);
      currentPull.current = pull;
      const progress = Math.min(pull / PULL_THRESHOLD, 1);
      const indicatorY = -80 + Math.min(pull, PULL_THRESHOLD) * (80 / PULL_THRESHOLD);
      setState(s => ({ ...s, pullProgress: progress, indicatorY }));
      // Prevent browser's native pull-to-reload
      if (pull > 4) e.preventDefault();
    };

    // ── touchend (synchronous — no async here, fire-and-forget the refresh) ──
    const onTouchEnd = () => {
      if (!isDragging.current || touchStartY.current === null) {
        touchStartY.current = null;
        isDragging.current = false;
        restoreTouchAction();
        return;
      }
      const pull = currentPull.current;
      // Reset drag tracking synchronously before any async work
      touchStartY.current = null;
      isDragging.current = false;
      currentPull.current = 0;
      restoreTouchAction();

      if (pull < PULL_THRESHOLD) {
        setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
        return;
      }

      // Threshold reached — trigger refresh (fire and forget, no await in event handler)
      isRefreshingRef.current = true;
      setState({ pullProgress: 1, isRefreshing: true, indicatorY: 8 });

      // Safety timeout
      safetyTimer.current = setTimeout(resetAll, SAFETY_TIMEOUT);

      // Run the refresh asynchronously, completely detached from the event handler
      Promise.resolve()
        .then(() => onRefreshRef.current())
        .catch((err) => console.warn("[PTR] onRefresh threw:", err))
        .finally(() => {
          if (safetyTimer.current) {
            clearTimeout(safetyTimer.current);
            safetyTimer.current = null;
          }
          isRefreshingRef.current = false;
          // Brief pause so user sees spinner complete
          return new Promise<void>(r => setTimeout(r, 400));
        })
        .then(() => {
          setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
        });
    };

    // ── touchcancel ──
    const onTouchCancel = () => {
      resetAll();
    };

    // Attach ALL listeners to the container only — never document
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);
      restoreTouchAction();
      if (safetyTimer.current) {
        clearTimeout(safetyTimer.current);
      }
    };
  }, [disabled, containerSelector, isMobile]);

  return state;
}
