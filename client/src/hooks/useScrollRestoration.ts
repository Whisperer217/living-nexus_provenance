/**
 * @domain  The Platform → Navigation → Scroll Restoration Manager
 * @impl    React Hook — Global scroll position manager for wouter-based routing
 *
 * Architectural principle (Slimdoggy report, 2026-07-21):
 *   A centralized Scroll Restoration Manager ensures every current and future
 *   page behaves consistently without requiring each page to implement its own
 *   scroll logic. This aligns with Living Nexus's design philosophy of shared
 *   platform services instead of duplicated page-specific behavior.
 *
 * Behavior:
 *   - Forward navigation (new page) → scroll to top of #main-scroll
 *   - Back/Forward navigation (browser history) → restore previous scroll position
 *
 * How it works:
 *   1. On every location change, save the current scroll position for the
 *      PREVIOUS path into a sessionStorage-backed Map.
 *   2. Check if the new path has a saved position (back/forward navigation).
 *      If yes → restore it. If no → scroll to top.
 *   3. Browser's native scrollRestoration is set to "manual" so the browser
 *      does not interfere with our controlled restoration.
 */

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const SCROLL_KEY = "ln_scroll_positions";
const SCROLL_CONTAINER_ID = "main-scroll";

/** Load the scroll position map from sessionStorage */
function loadPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save the scroll position map to sessionStorage */
function savePositions(positions: Record<string, number>): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(positions));
  } catch {
    // sessionStorage quota exceeded — ignore
  }
}

/** Get the scroll container element */
function getScrollContainer(): HTMLElement | null {
  return document.getElementById(SCROLL_CONTAINER_ID);
}

/**
 * useScrollRestoration — mount once in App.tsx.
 *
 * Manages scroll position across all route transitions:
 * - New forward navigation → scroll to top
 * - Back/Forward (history pop) → restore saved position
 */
export function useScrollRestoration(): void {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const isPopStateRef = useRef<boolean>(false);

  // Disable browser's native scroll restoration so we control it entirely
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    return () => {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "auto";
      }
    };
  }, []);

  // Track popstate (back/forward button) events
  useEffect(() => {
    const handlePopState = () => {
      isPopStateRef.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const prevPath = prevLocationRef.current;
    const nextPath = location;

    if (prevPath === nextPath) return;

    // Save the current scroll position for the page we're leaving
    const positions = loadPositions();
    positions[prevPath] = container.scrollTop;
    savePositions(positions);

    // Determine whether this is a back/forward navigation
    const isPopState = isPopStateRef.current;
    isPopStateRef.current = false; // reset for next navigation

    if (isPopState && positions[nextPath] !== undefined) {
      // Back/Forward: restore the saved position
      // Use requestAnimationFrame to wait for the new page to render
      const savedPosition = positions[nextPath];
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = getScrollContainer();
          if (el) el.scrollTop = savedPosition;
        });
      });
    } else {
      // Forward navigation to a new page: scroll to top immediately
      container.scrollTop = 0;
    }

    prevLocationRef.current = nextPath;
  }, [location]);
}
