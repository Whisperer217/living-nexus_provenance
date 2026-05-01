import type { CSSProperties } from "react";

/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Persistent Multi-Layer Interaction System
   Layer constants: z-index hierarchy + CSS containment contract

   Layers are RESTING, not competing.
   Each layer owns its stacking context. No shared layout dependencies.

   Z-Index Hierarchy (locked):
   ─────────────────────────────────────────────────────────────────
   ContentLayer     z: 0    — scrollable page content
   DrawerLayer      z: 20   — ContextDrawer + MobileNavDrawer
   PlayerLayer      z: 40   — GlobalPlayer + TheaterPlayer
   GuideLayer       z: 50   — FloatingAvatar / KeeperAvatarWidget
   CinematicOverlay z: 100  — full-screen cinematic / theater mode

   CSS Containment Contract:
   ─────────────────────────────────────────────────────────────────
   Apply `contain: layout paint` + `will-change: transform` ONLY to
   the OUTER SHELL of each layer. Inner components retain natural layout.

   Player Architecture:
   ─────────────────────────────────────────────────────────────────
   .player-layer  → position: fixed; bottom: 0; left: 0; right: 0;
                    pointer-events: none; contain: layout paint;
   .player-shell  → will-change: transform; pointer-events: auto;
                    translateY moves THIS, not the outer container.
                    max-width: 1100px; margin: 0 auto;
═══════════════════════════════════════════════════════════════════ */

export const LAYERS = {
  CONTENT:          0,
  DRAWER:          20,
  PLAYER:          40,
  GUIDE:           50,
  CINEMATIC:      100,
} as const;

export type LayerName = keyof typeof LAYERS;

/** CSS class names for each layer's outer shell */
export const LAYER_CLASS = {
  CONTENT:  "ln-content-layer",
  DRAWER:   "ln-drawer-layer",
  PLAYER:   "ln-player-layer",
  GUIDE:    "ln-guide-layer",
  CINEMATIC: "ln-cinematic-layer",
} as const;

/** Inline style for a layer's outer fixed shell (apply to outermost div only) */
export function layerShellStyle(layer: LayerName): CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    contain: "layout paint",
    zIndex: LAYERS[layer],
  };
}

/** Adaptive blur: full glass when paused, degraded when playing */
export function adaptiveBlur(isPlaying: boolean): string {
  return isPlaying ? "blur(4px)" : "blur(16px)";
}

/** Desktop glass background */
export const GLASS_BG = {
  PAUSED:  "rgba(0,0,0,0.82)",
  PLAYING: "rgba(0,0,0,0.72)",
} as const;
