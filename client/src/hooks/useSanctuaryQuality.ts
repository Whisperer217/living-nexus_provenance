/**
 * Sanctuary quality tiers — progressive 2.5D rendering.
 * Low-power / reduced-motion devices get architectural depth without particles or parallax.
 */

import { useEffect, useState } from "react";

export type SanctuaryTier = "low" | "medium" | "high";

function detectTier(): SanctuaryTier {
  if (typeof window === "undefined") return "medium";

  const reduce =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (reduce) return "low";

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData) return "low";
  if (nav.connection?.effectiveType === "2g" || nav.connection?.effectiveType === "slow-2g") {
    return "low";
  }

  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const narrow = window.matchMedia?.("(max-width: 640px)")?.matches ?? false;

  if (cores <= 2 || mem <= 2) return "low";
  if (narrow || cores <= 4 || mem <= 4) return "medium";
  return "high";
}

export function useSanctuaryQuality(): SanctuaryTier {
  const [tier, setTier] = useState<SanctuaryTier>("medium");

  useEffect(() => {
    setTier(detectTier());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setTier(detectTier());
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return tier;
}

export function useSanctuaryParallax(enabled: boolean, strength = 1) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      setOffset({ x: 0, y: 0 });
      return;
    }

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const tick = () => {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      setOffset({ x: curX * strength, y: curY * strength });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (clientX: number, clientY: number) => {
      const nx = (clientX / window.innerWidth - 0.5) * 2;
      const ny = (clientY / window.innerHeight - 0.5) * 2;
      targetX = Math.max(-1, Math.min(1, nx));
      targetY = Math.max(-1, Math.min(1, ny));
    };

    const onPointer = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [enabled, strength]);

  return offset;
}
