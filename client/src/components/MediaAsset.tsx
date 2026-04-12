/**
 * MediaAsset — Unified Media Rendering System (MRS)
 *
 * The single source of truth for how a work's cover art renders across every surface.
 * Three render modes:
 *
 *   "card"      — Fixed-ratio smart crop using focal point. Used in grids/lists.
 *   "player"    — Background anchor with bottom gradient for readability. Used in player bar.
 *   "cinematic" — Full-bleed with Ken Burns zoom, gradient overlay, mouse parallax (desktop),
 *                 gyro tilt (mobile). Used in expanded/cinematic player views.
 *
 * Props:
 *   src           — Image URL (required)
 *   alt           — Alt text
 *   aspectRatio   — "1:1" | "4:5" | "16:9" | null (null → defaults to "1:1" for cards)
 *   focalX        — Focal point X as percentage 0–100 (default 50)
 *   focalY        — Focal point Y as percentage 0–100 (default 50)
 *   mode          — "card" | "player" | "cinematic"
 *   emoji         — Fallback emoji when no src
 *   bg            — Fallback background color (CSS value)
 *   className     — Additional classes on the outer wrapper
 *   style         — Additional styles on the outer wrapper
 *   children      — Overlay content (badges, controls, etc.)
 *   kenBurns      — Enable Ken Burns animation in cinematic mode (default true)
 *   showGradient  — Show bottom gradient overlay (default true for player/cinematic)
 *   videoUrl      — Optional video URL; rendered as full-bleed behind image in cinematic mode
 *   showVideo     — Whether to show video (fades image out when true)
 *   videoRef      — Ref for the video element
 */

import React, { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";

export type ArtAspectRatio = "1:1" | "4:5" | "16:9" | null;
export type RenderMode = "card" | "player" | "cinematic";

export interface MediaAssetProps {
  src?: string | null;
  alt?: string;
  aspectRatio?: ArtAspectRatio;
  focalX?: number;
  focalY?: number;
  mode: RenderMode;
  emoji?: string | null;
  bg?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  kenBurns?: boolean;
  showGradient?: boolean;
  videoUrl?: string | null;
  showVideo?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

// ── Aspect ratio → CSS padding-bottom (for card mode intrinsic sizing) ──────
const RATIO_TO_PADDING: Record<NonNullable<ArtAspectRatio>, string> = {
  "1:1": "100%",
  "4:5": "125%",
  "16:9": "56.25%",
};

// ── Ken Burns keyframes injected once into the document ──────────────────────
let kenBurnsInjected = false;
function ensureKenBurnsKeyframes() {
  if (kenBurnsInjected || typeof document === "undefined") return;
  kenBurnsInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes mrs-ken-burns {
      0%   { transform: scale(1.0) translate(0%, 0%); }
      25%  { transform: scale(1.06) translate(-1.5%, -1%); }
      50%  { transform: scale(1.1) translate(1%, 1.5%); }
      75%  { transform: scale(1.06) translate(-0.5%, 1%); }
      100% { transform: scale(1.0) translate(0%, 0%); }
    }
    @keyframes mrs-ken-burns-alt {
      0%   { transform: scale(1.08) translate(1%, 0.5%); }
      50%  { transform: scale(1.02) translate(-1%, -1%); }
      100% { transform: scale(1.08) translate(1%, 0.5%); }
    }
  `;
  document.head.appendChild(style);
}

// ── Card Mode ─────────────────────────────────────────────────────────────────
function CardMedia({
  src, alt, aspectRatio, focalX, focalY, emoji, bg, children,
}: Pick<MediaAssetProps, "src" | "alt" | "aspectRatio" | "focalX" | "focalY" | "emoji" | "bg" | "children">) {
  const ratio = aspectRatio ?? "1:1";
  const paddingBottom = RATIO_TO_PADDING[ratio];
  const objectPosition = `${focalX ?? 50}% ${focalY ?? 50}%`;

  return (
    <div className="relative w-full overflow-hidden" style={{ paddingBottom }}>
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition }}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-4xl"
          style={{ background: bg ?? "oklch(0.12 0.06 270)" }}
        >
          {emoji ?? <Music className="w-1/3 h-1/3 opacity-20 text-white" />}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Player Mode ─────────────────────────────────────────────────────────────────────────────────
function PlayerMedia({
  src, alt, focalX, focalY, emoji, bg, showGradient, children,
  videoUrl, showVideo, videoRef,
}: Pick<MediaAssetProps, "src" | "alt" | "focalX" | "focalY" | "emoji" | "bg" | "showGradient" | "children" | "videoUrl" | "showVideo" | "videoRef">) {
  const vRef = videoRef as React.RefObject<HTMLVideoElement> | undefined;
  const objectPosition = `${focalX ?? 50}% ${focalY ?? 50}%`;
  const [videoError, setVideoError] = useState(false);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "#2D1B2E" }}
    >
      {/* Blurred background fill */}
      {src && (
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: objectPosition,
            filter: "blur(16px) brightness(0.35) saturate(1.2)",
            transform: "scale(1.1)",
          }}
        />
      )}
      {/* Video layer */}
      {videoUrl && !videoError && (
        <video
          ref={vRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 z-10"
          style={{ opacity: showVideo ? 1 : 0 }}
          muted loop playsInline preload="metadata"
          onError={() => setVideoError(true)}
        />
      )}
      {/* Cover art — contain so full artwork is always visible */}
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          className="relative z-10 transition-opacity duration-500"
          style={{
            objectFit: "contain",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            opacity: videoUrl && showVideo && !videoError ? 0 : 1,
          }}
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-5xl z-10"
          style={{ background: bg ?? "oklch(0.12 0.06 270)" }}
        >
          {emoji ?? "🎵"}
        </div>
      )}
      {/* Bottom gradient for readability */}
      {showGradient !== false && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 pointer-events-none"
          style={{ height: "60%", background: "linear-gradient(to top, #2D1B2E 0%, transparent 100%)" }}
        />
      )}
      {children && <div className="absolute inset-0 z-30">{children}</div>}
    </div>
  );
}

// ── Cinematic Mode ────────────────────────────────────────────────────────────
function CinematicMedia({
  src, alt, focalX, focalY, emoji, bg, showGradient, children, kenBurns,
  videoUrl, showVideo, videoRef,
}: Pick<MediaAssetProps, "src" | "alt" | "focalX" | "focalY" | "emoji" | "bg" | "showGradient" | "children" | "kenBurns" | "videoUrl" | "showVideo" | "videoRef">) {
  const vRef = videoRef as React.RefObject<HTMLVideoElement> | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const gyroRef = useRef<{ beta: number; gamma: number }>({ beta: 0, gamma: 0 });
  // Track video load error — fall back to cover art if video fails
  const [videoError, setVideoError] = useState(false);

  // Ken Burns keyframes
  useEffect(() => {
    if (kenBurns !== false) ensureKenBurnsKeyframes();
  }, [kenBurns]);

  // Mouse parallax (desktop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 to 0.5
      const cy = (e.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x: cx * 8, y: cy * 6 }); // max 8px / 6px shift
    };
    const onLeave = () => setParallax({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Gyro tilt (mobile)
  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      const beta = Math.max(-15, Math.min(15, e.beta ?? 0));   // tilt front/back
      const gamma = Math.max(-15, Math.min(15, e.gamma ?? 0)); // tilt left/right
      gyroRef.current = { beta, gamma };
      setParallax({ x: gamma * 0.4, y: beta * 0.3 });
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  const objectPosition = `${focalX ?? 50}% ${focalY ?? 50}%`;
  const kbAnimation = kenBurns !== false
    ? "mrs-ken-burns 28s ease-in-out infinite"
    : undefined;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: bg ?? "oklch(0.05 0.02 270)" }}
    >
      {/* Video layer — full bleed, always cover */}
      {videoUrl && !videoError && (
        <video
          ref={vRef}
          src={videoUrl}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-10"
          style={{ opacity: showVideo ? 1 : 0 }}
          muted loop playsInline preload="metadata"
          onError={() => setVideoError(true)}
        />
      )}

      {/* Cover art — full bleed with Ken Burns + parallax */}
      {/* Always visible if no video, or if video failed to load */}
      {src ? (
        <img
          src={src}
          alt={alt ?? ""}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-0"
          style={{
            objectPosition,
            opacity: videoUrl && showVideo && !videoError ? 0 : 1,
            animation: kbAnimation,
            transform: `translate(${parallax.x}px, ${parallax.y}px)`,
            transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.7s ease",
            willChange: "transform",
          }}
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-6xl z-0"
          style={{ background: bg ?? "oklch(0.12 0.06 270)" }}
        >
          {emoji ?? "🎵"}
        </div>
      )}

      {/* Vignette + gradient overlay for readability */}
      {showGradient !== false && (
        <>
          {/* Bottom gradient — darkens lower 60% for controls/text */}
          <div
            className="absolute inset-x-0 bottom-0 z-20 pointer-events-none"
            style={{ height: "70%", background: "linear-gradient(to top, oklch(0.04 0.02 270 / 0.95) 0%, oklch(0.04 0.02 270 / 0.4) 50%, transparent 100%)" }}
          />
          {/* Top vignette — subtle darkening for header area */}
          <div
            className="absolute inset-x-0 top-0 z-20 pointer-events-none"
            style={{ height: "30%", background: "linear-gradient(to bottom, oklch(0.04 0.02 270 / 0.7) 0%, transparent 100%)" }}
          />
          {/* Edge vignette */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ boxShadow: "inset 0 0 80px oklch(0 0 0 / 0.5)" }}
          />
        </>
      )}

      {/* Overlay content (badges, controls, etc.) */}
      {children && <div className="absolute inset-0 z-30">{children}</div>}
    </div>
  );
}

// ── Main MediaAsset export ────────────────────────────────────────────────────
export function MediaAsset({
  src,
  alt,
  aspectRatio,
  focalX = 50,
  focalY = 50,
  mode,
  emoji,
  bg,
  className,
  style,
  children,
  kenBurns = true,
  showGradient,
  videoUrl,
  showVideo,
  videoRef,
}: MediaAssetProps) {
  const sharedProps = { src, alt, focalX, focalY, emoji, bg, children, videoUrl, showVideo, videoRef };

  if (mode === "card") {
    return (
      <div className={className} style={style}>
        <CardMedia {...sharedProps} aspectRatio={aspectRatio} />
      </div>
    );
  }

  if (mode === "player") {
    return (
      <div className={`relative overflow-hidden ${className ?? ""}`} style={style}>
        <PlayerMedia {...sharedProps} showGradient={showGradient} />
      </div>
    );
  }

  // cinematic
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={style}>
      <CinematicMedia {...sharedProps} showGradient={showGradient} kenBurns={kenBurns} />
    </div>
  );
}

export default MediaAsset;
