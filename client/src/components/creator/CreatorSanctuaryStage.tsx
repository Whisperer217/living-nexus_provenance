/**
 * CreatorSanctuaryStage — 2.5D depth plane for creator pages.
 *
 * Architecture (back → front):
 *   L0 far haze / vignette
 *   L1 banner / identity imagery (slow ken + parallax)
 *   L2 mid atmospheric wash (harmonic hue)
 *   L3 canvas particles (dust / embers) — medium+ tiers
 *   L4 light shafts — medium+ tiers
 *   L5 real DOM content (children)
 *
 * Not a WebGL scene. Progressive: low tier skips particles/parallax/shafts.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import {
  useSanctuaryParallax,
  useSanctuaryQuality,
  type SanctuaryTier,
} from "@/hooks/useSanctuaryQuality";

interface Props {
  bannerUrl?: string | null;
  photoUrl?: string | null;
  bannerPositionX?: number | null;
  bannerPositionY?: number | null;
  hue?: number;
  sat?: number;
  playing?: boolean;
  perspective?: "creator" | "witness";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function SanctuaryParticles({
  hue,
  tier,
  playing,
}: {
  hue: number;
  tier: SanctuaryTier;
  playing: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (tier === "low") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;

    type Mote = {
      x: number;
      y: number;
      r: number;
      vx: number;
      vy: number;
      a: number;
      kind: "dust" | "ember";
    };

    const count = tier === "high" ? (playing ? 64 : 42) : playing ? 28 : 18;
    const motes: Mote[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, tier === "high" ? 2 : 1.25);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      motes.length = 0;
      for (let i = 0; i < count; i++) {
        const ember = Math.random() < (playing ? 0.28 : 0.12);
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: ember ? 1.2 + Math.random() * 1.6 : 0.5 + Math.random() * 1.1,
          vx: (Math.random() - 0.5) * (ember ? 8 : 4),
          vy: ember ? -(6 + Math.random() * 14) : -(2 + Math.random() * 6),
          a: ember ? 0.18 + Math.random() * 0.35 : 0.08 + Math.random() * 0.18,
          kind: ember ? "ember" : "dust",
        });
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -8) {
          m.y = h + 8;
          m.x = Math.random() * w;
        }
        if (m.x < -8) m.x = w + 8;
        if (m.x > w + 8) m.x = -8;

        if (m.kind === "ember") {
          ctx.fillStyle = `hsla(${hue.toFixed(1)}, 78%, 58%, ${m.a})`;
        } else {
          ctx.fillStyle = `hsla(${hue.toFixed(1)}, 35%, 78%, ${m.a})`;
        }
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    seed();
    raf = requestAnimationFrame(draw);
    const onResize = () => {
      resize();
      seed();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [hue, tier, playing]);

  if (tier === "low") return null;
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 3, opacity: playing ? 0.9 : 0.7 }}
      aria-hidden
    />
  );
}

export function CreatorSanctuaryStage({
  bannerUrl,
  photoUrl,
  bannerPositionX,
  bannerPositionY,
  hue = 43,
  sat = 62,
  playing = false,
  perspective = "witness",
  className = "",
  style,
  children,
}: Props) {
  const tier = useSanctuaryQuality();
  const parallaxOn = tier !== "low";
  const offset = useSanctuaryParallax(parallaxOn, tier === "high" ? 1 : 0.55);

  const image = bannerUrl || photoUrl || null;
  const posX = bannerPositionX ?? 50;
  const posY = bannerPositionY ?? 50;

  const farShift = {
    transform: `translate3d(${offset.x * -10}px, ${offset.y * -6}px, 0) scale(1.08)`,
  };
  const midShift = {
    transform: `translate3d(${offset.x * -22}px, ${offset.y * -14}px, 0) scale(1.12)`,
  };
  const shaftShift = {
    transform: `translate3d(${offset.x * 14}px, ${offset.y * 8}px, 0)`,
  };

  return (
    <section
      className={`relative min-h-[78vh] flex flex-col justify-end overflow-hidden ln-sanctuary ${className}`}
      data-tier={tier}
      data-perspective={perspective}
      style={{
        ...style,
        ["--ln-breath-hue" as string]: hue.toFixed(1),
        ["--ln-breath-sat" as string]: sat.toFixed(1),
      }}
    >
      {/* L0 — far vignette / architectural depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(ellipse 90% 70% at 50% 40%, #120e08 0%, #050403 55%, #000 100%)",
        }}
        aria-hidden
      />

      {/* L1 — identity imagery plane */}
      <div
        className="absolute inset-[-6%] will-change-transform"
        style={{
          zIndex: 1,
          ...farShift,
          backgroundImage: image
            ? `url(${image})`
            : "linear-gradient(145deg, #1a1408 0%, #050505 45%, #000 100%)",
          backgroundSize: "cover",
          backgroundPosition: `${posX}% ${posY}%`,
          filter: tier === "low" ? undefined : "saturate(1.08) contrast(1.06)",
          animation: tier === "low" ? undefined : "ln-sanctuary-ken 26s ease-in-out infinite alternate",
        }}
        aria-hidden
      />

      {/* L2 — atmospheric wash + read gradient */}
      <div
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{
          zIndex: 2,
          ...midShift,
          background: `
            linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.92) 82%, #000 100%),
            radial-gradient(ellipse 60% 45% at ${perspective === "creator" ? "80% 25%" : "18% 78%"},
              hsla(${hue}, ${sat}%, 48%, ${playing ? 0.28 : 0.16}), transparent 62%)
          `,
        }}
        aria-hidden
      />

      {/* L3 — particles */}
      <SanctuaryParticles hue={hue} tier={tier} playing={playing} />

      {/* L4 — light shafts */}
      {tier !== "low" && (
        <div
          className="absolute inset-0 pointer-events-none will-change-transform"
          style={{
            zIndex: 4,
            ...shaftShift,
            opacity: playing ? 0.55 : 0.32,
            background: `
              linear-gradient(118deg, transparent 38%, hsla(${hue}, 70%, 62%, 0.07) 46%, transparent 54%),
              linear-gradient(102deg, transparent 55%, hsla(${hue}, 65%, 58%, 0.05) 62%, transparent 70%)
            `,
            mixBlendMode: "screen",
          }}
          aria-hidden
        />
      )}

      {/* Soft bloom haze (CSS only — no blur filter on content) */}
      {tier === "high" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 4,
            background: `radial-gradient(ellipse 50% 35% at 50% 20%, hsla(${hue}, 70%, 60%, 0.10), transparent 70%)`,
            animation: "ln-breath-plane 14s ease-in-out infinite",
          }}
          aria-hidden
        />
      )}

      {/* L5 — real DOM */}
      <div className="relative z-10 w-full">{children}</div>
    </section>
  );
}
