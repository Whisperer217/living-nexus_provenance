/**
 * usePullToRefresh
 *
 * Attaches pull-to-refresh touch gesture handling to a scroll container.
 * Uses the `.player-scroll-area` class (MainLayout's main scroll div) by default.
 *
 * Bug fixes (v2):
 * 1. SCROLL LOCK: The previous version attached touchmove with { passive: false }
 *    to document. On Android Chrome, calling e.preventDefault() on a non-passive
 *    touchmove listener that is attached to `document` suppresses ALL subsequent
 *    touch events — including taps on the hamburger menu — until the next full
 *    page reload. Fix: attach the non-passive listener to the scroll container
 *    itself, not document. The container's touchmove can call preventDefault()
 *    safely without poisoning the global touch event pipeline.
 *
 * 2. STUCK STATE: If onRefresh() throws or the component unmounts mid-refresh,
 *    isRefreshingRef stays true forever, blocking all future PTR attempts.
 *    Fix: always reset in the finally block + add a safety timeout.
 *
 * 3. TOUCH ACTION CONFLICT: The .player-scroll-area has `touchAction: "pan-y"`.
 *    Calling e.preventDefault() on its touchmove overrides that, which is correct
 *    during a PTR drag but must be released immediately after. The new approach
 *    temporarily sets `touch-action: none` on the container during the drag and
 *    restores `pan-y` on touchend/cancel.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const PULL_THRESHOLD = 64;   // px of drag before release triggers refresh
const MAX_PULL = 96;          // px — indicator stops growing beyond this
const RESISTANCE = 0.45;      // drag resistance factor (lower = harder to pull)
const SAFETY_TIMEOUT = 8000;  // ms — force-reset if refresh hangs

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
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getContainer = useCallback((): HTMLElement | null => {
    return document.querySelector<HTMLElement>(containerSelector);
  }, [containerSelector]);

  const isMobile = useCallback((): boolean => {
    if (!mobileOnly) return true;
    return window.matchMedia("(max-width: 768px)").matches ||
      ("ontouchstart" in window);
  }, [mobileOnly]);

  /** Restore the container's touch-action after a drag ends */
  const restoreTouchAction = useCallback(() => {
    const container = getContainer();
    if (container) {
      container.style.touchAction = "pan-y";
    }
  }, [getContainer]);

  const resetState = useCallback(() => {
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
  }, [restoreTouchAction]);

  useEffect(() => {
    if (disabled) return;

    // ── touchstart: attached to document (passive OK — no preventDefault needed) ──
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

    // ── touchmove: attached to the CONTAINER (not document) ──
    // This is the critical fix: calling e.preventDefault() on a non-passive
    // listener attached to document permanently poisons the touch pipeline on
    // Android Chrome. Attaching to the container scopes the preventDefault()
    // to that element only, leaving all other touch targets unaffected.
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
      const deltaY = e.touches[0].clientY - touchStartY.current!;
      if (deltaY <= 0) {
        // Scrolling up — not a pull-to-refresh gesture
        touchStartY.current = null;
        return;
      }
      // It's a downward drag — engage PTR
      isDragging.current = true;
      // Temporarily disable pan-y so we can call preventDefault without conflict
      container.style.touchAction = "none";
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
        // Not a PTR drag — just clean up
        touchStartY.current = null;
        isDragging.current = false;
        restoreTouchAction();
        return;
      }
      const pull = currentPull.current;
      // Reset drag tracking immediately so new touches aren't blocked
      touchStartY.current = null;
      isDragging.current = false;
      currentPull.current = 0;
      restoreTouchAction();

      if (pull < PULL_THRESHOLD) {
        // Didn't pull far enough — snap back
        setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
        return;
      }

      // Threshold reached — trigger refresh
      isRefreshingRef.current = true;
      setState({ pullProgress: 1, isRefreshing: true, indicatorY: 8 });

      // Safety timeout — force reset if refresh hangs for >8s
      safetyTimer.current = setTimeout(() => {
        resetState();
      }, SAFETY_TIMEOUT);

      try {
        await onRefresh();
      } catch (err) {
        console.warn("[PTR] onRefresh threw:", err);
      } finally {
        if (safetyTimer.current) {
          clearTimeout(safetyTimer.current);
          safetyTimer.current = null;
        }
        isRefreshingRef.current = false;
        // Brief pause so user sees the spinner complete
        await new Promise(r => setTimeout(r, 400));
        setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
      }
    };

    const container = getContainer();

    // touchstart on document (passive) — safe, no preventDefault needed
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    // touchcancel on document (passive) — clean up if OS cancels the touch
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", () => {
      touchStartY.current = null;
      isDragging.current = false;
      currentPull.current = 0;
      restoreTouchAction();
      setState({ pullProgress: 0, isRefreshing: false, indicatorY: -80 });
    }, { passive: true });

    // touchmove on CONTAINER (non-passive) — scoped, safe to call preventDefault
    if (container) {
      container.addEventListener("touchmove", onTouchMove, { passive: false });
    }

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      if (container) {
        container.removeEventListener("touchmove", onTouchMove);
      }
      restoreTouchAction();
      if (safetyTimer.current) {
        clearTimeout(safetyTimer.current);
      }
    };
  }, [disabled, onRefresh, getContainer, isMobile, restoreTouchAction, resetState]);

  return state;
}
