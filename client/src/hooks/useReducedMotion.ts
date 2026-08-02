/**
 * useReducedMotion — returns true when the user has requested reduced motion
 * via their OS accessibility settings (prefers-reduced-motion: reduce).
 *
 * Use this in canvas-based or JS-driven animations that cannot be controlled
 * by the CSS @media (prefers-reduced-motion) rule alone.
 *
 * @example
 *   const reduced = useReducedMotion();
 *   useEffect(() => {
 *     if (reduced) return; // skip rAF loop
 *     const id = requestAnimationFrame(tick);
 *     return () => cancelAnimationFrame(id);
 *   }, [reduced]);
 */
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
