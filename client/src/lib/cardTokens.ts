/**
 * Living Nexus — Card Token System
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for card dimensions used across the platform.
 *
 * Visual standard: matches the Explore page museum-card / museum-grid system.
 *
 *  Pan-row cards  → fixed width CARD_PAN_W, image capped at CARD_IMG_MAX_H
 *  Grid cards     → fluid (museum-grid handles columns), same image cap
 *
 * Usage:
 *   import { CARD_PAN_W, CARD_IMG_MAX_H, CARD_ASPECT } from "@/lib/cardTokens";
 *   <div style={{ width: CARD_PAN_W }}>…</div>
 */

/** Fixed pixel width for cards inside horizontal pan-row carousels */
export const CARD_PAN_W = 160;

/** Maximum pixel height of the cover-art image zone */
export const CARD_IMG_MAX_H = 200;

/** Default aspect ratio for cover art */
export const CARD_ASPECT = "4:5" as const;

/** CSS string for pan-row card wrapper */
export const CARD_PAN_STYLE = { width: `${CARD_PAN_W}px` } as const;

// ── Visual tokens added in redesign v2.31 ──
export const CARD_BORDER_COLOR   = 'rgba(196, 154, 40, 0.15)' as const;  // --ln-gold @ 15%
export const CARD_BG_COLOR       = '#111009' as const;                    // --ln-coal
export const CARD_HOVER_BG       = '#1C1A14' as const;                    // --ln-iron
export const WID_BADGE_BG        = '#C49A28' as const;                    // --ln-gold
export const WID_BADGE_TEXT      = '#0A0806' as const;                    // --ln-void
