/**
 * DepthAtmosphere — shared 2.5D shell for Explore / Chapel / surfaces.
 * Progressive: low tier = static planes only.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  useSanctuaryParallax,
  useSanctuaryQuality,
  type SanctuaryTier,
} from "@/hooks/useSanctuaryQuality";

function Motesh({
  hue,
  tier,
  density = 1,
}: {
  hue: number;
  tier: SanctuaryTier;
  density?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (tier === "low") return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;
    const n = Math.round((tier === "high" ? 48 : 22) * density);
    const motes = Array.from({ length: n }, () => ({
      x: 0,
      y: 0,
      r: 0.5,
      vx: 0,
      vy: -4,
      a: 0.12,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, tier === "high" ? 1.75 : 1.25);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const m of motes) {
        m.x = Math.random() * w;
        m.y = Math.random() * h;
        m.r = 0.5 + Math.random() * 1.4;
        m.vx = (Math.random() - 0.5) * 5;
        m.vy = -(2 + Math.random() * 8);
        m.a = 0.06 + Math.random() * 0.18;
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -6) {
          m.y = h + 6;
          m.x = Math.random() * w;
        }
        ctx.fillStyle = `hsla(${hue}, 55%, 68%, ${m.a})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [hue, tier, density]);

  if (tier === "low") return null;
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden />;
}

interface Props {
  hue?: number;
  sat?: number;
  imageUrl?: string | null;
  variant?: "page" | "drawer";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function DepthAtmosphere({
  hue = 43,
  sat = 58,
  imageUrl,
  variant = "page",
  className = "",
  style,
  children,
}: Props) {
  const tier = useSanctuaryQuality();
  const offset = useSanctuaryParallax(tier !== "low", tier === "high" ? 0.9 : 0.5);
  const isDrawer = variant === "drawer";

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      data-tier={tier}
      style={{
        ...style,
        isolation: "isolate",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: isDrawer
            ? "radial-gradient(ellipse 80% 60% at 70% 0%, #16100a 0%, #080604 55%, #040208 100%)"
            : "radial-gradient(ellipse 90% 70% at 50% 0%, #141008 0%, #070604 50%, #000 100%)",
        }}
        aria-hidden
      />

      {imageUrl && (
        <div
          className="absolute inset-[-8%] pointer-events-none will-change-transform opacity-35"
          style={{
            zIndex: 1,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "saturate(1.05) contrast(1.05)",
            transform: `translate3d(${offset.x * -16}px, ${offset.y * -10}px, 0) scale(1.1)`,
            animation: tier === "low" ? undefined : "ln-depth-ken 28s ease-in-out infinite alternate",
          }}
          aria-hidden
        />
      )}

      <div
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{
          zIndex: 2,
          transform: `translate3d(${offset.x * -8}px, ${offset.y * -5}px, 0)`,
          background: `
            linear-gradient(180deg, rgba(0,0,0,${isDrawer ? 0.25 : 0.2}) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%),
            radial-gradient(ellipse 55% 40% at 15% 20%, hsla(${hue}, ${sat}%, 48%, 0.18), transparent 65%),
            radial-gradient(ellipse 40% 35% at 90% 80%, hsla(${hue}, ${sat}%, 42%, 0.10), transparent 70%)
          `,
        }}
        aria-hidden
      />

      <div className="absolute inset-0" style={{ zIndex: 3 }} aria-hidden>
        <Motesh hue={hue} tier={tier} density={isDrawer ? 0.7 : 1} />
      </div>

      {tier !== "low" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 4,
            opacity: 0.35,
            transform: `translate3d(${offset.x * 10}px, ${offset.y * 6}px, 0)`,
            background: `linear-gradient(115deg, transparent 40%, hsla(${hue}, 70%, 60%, 0.07) 48%, transparent 58%)`,
            mixBlendMode: "screen",
          }}
          aria-hidden
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
