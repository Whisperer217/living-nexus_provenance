/**
 * OG Image Generation Service
 *
 * Generates a 1200×630 PNG for og:image embeds.
 *
 * Design principle: ART FIRST.
 * The artwork is full-bleed. Living Nexus is the quiet validator in the corner.
 * Hierarchy: artwork → subtle gradient → WID (bottom-left) → badge (bottom-right)
 *
 * No logo. No wordmark. No card frame. No heavy branding.
 */

import { Jimp } from "jimp";
import { Resvg } from "@resvg/resvg-js";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/** aiDisclosure DB value → badge short label + colors */
const DISCLOSURE_MAP: Record<string, { label: string; bg: string; text: string }> = {
  original:                     { label: "HM",   bg: "#059669", text: "#FFFFFF" }, // emerald — Human-Made
  ai_assisted:                  { label: "AI+",  bg: "#7C3AED", text: "#FFFFFF" }, // violet
  ai_generated:                 { label: "AI",   bg: "#6B7280", text: "#FFFFFF" }, // gray
  human_authored_ai_instrument: { label: "HAAI", bg: "#D97706", text: "#FFFFFF" }, // amber
};

/** Resolve aiDisclosure DB value to badge config (null = no badge) */
function resolveBadge(aiDisclosure: string | null): { label: string; bg: string; text: string } | null {
  if (!aiDisclosure) return null;
  return DISCLOSURE_MAP[aiDisclosure] ?? null;
}

/** Escape XML special characters for safe SVG embedding */
function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Truncate a string to maxLen chars with ellipsis */
function trunc(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "…";
}

/**
 * Build the SVG overlay layer:
 * - Bottom gradient (transparent → black, 35% height)
 * - WID text bottom-left
 * - AI disclosure badge bottom-right
 *
 * This SVG is rendered at 1200×630 and composited over the artwork.
 */
function buildOverlaySvg(opts: {
  wid: string | null;
  badgeCfg: { label: string; bg: string; text: string } | null;
}): string {
  const { wid, badgeCfg } = opts;
  const w = OG_WIDTH;
  const h = OG_HEIGHT;

  // Gradient: covers bottom 35% of image
  const gradientStartY = Math.round(h * 0.65);

  // WID text — bottom-left, small monospace, low opacity
  const widText = wid ? escXml(trunc(wid, 24)) : null;

  // Badge pill — bottom-right
  const badgeLabel = badgeCfg ? escXml(badgeCfg.label) : null;
  const badgeBg = badgeCfg?.bg ?? "#7C3AED";
  const badgeTextColor = badgeCfg?.text ?? "#FFFFFF";

  const badgePillWidth = badgeCfg?.label === "HUMAN" ? 72 : 52;
  const badgePillHeight = 24;
  const badgePillX = w - badgePillWidth - 20;
  const badgePillY = h - badgePillHeight - 20;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.55"/>
    </linearGradient>
  </defs>

  <!-- Bottom gradient for text readability -->
  <rect x="0" y="${gradientStartY}" width="${w}" height="${h - gradientStartY}" fill="url(#bottomFade)"/>

  ${widText ? `
  <!-- WID — bottom-left, monospace, subtle -->
  <text
    x="20"
    y="${h - 22}"
    font-family="'Courier New', Courier, monospace"
    font-size="13"
    fill="white"
    fill-opacity="0.65"
    letter-spacing="0.5"
  >${widText}</text>
  ` : ""}

  ${badgeLabel && badgeCfg ? `
  <!-- AI disclosure badge — bottom-right -->
  <rect
    x="${badgePillX}"
    y="${badgePillY}"
    width="${badgePillWidth}"
    height="${badgePillHeight}"
    rx="12"
    ry="12"
    fill="${badgeBg}"
    fill-opacity="0.88"
  />
  <text
    x="${badgePillX + badgePillWidth / 2}"
    y="${badgePillY + badgePillHeight / 2 + 5}"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="11"
    font-weight="700"
    fill="${badgeTextColor}"
    letter-spacing="0.8"
  >${badgeLabel}</text>
  ` : ""}
</svg>`;
}

/**
 * Fetch an image from a URL and return a Buffer.
 * Returns null on failure so callers can fall back to the platform logo.
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/**
 * Generate a 1200×630 PNG provenance card for a song.
 *
 * Returns a Buffer containing the PNG bytes.
 */
export async function generateSongOgImage(opts: {
  coverArtUrl: string | null;
  wid: string | null;
  badge: string | null;
  fallbackImageUrl: string;
}): Promise<Buffer> {
  const { coverArtUrl, wid, badge, fallbackImageUrl } = opts;

  // ── 1. Fetch cover art ────────────────────────────────────────────────────
  const artUrl = coverArtUrl?.trim() || fallbackImageUrl;
  let artBuf = await fetchImageBuffer(artUrl);
  if (!artBuf && artUrl !== fallbackImageUrl) {
    artBuf = await fetchImageBuffer(fallbackImageUrl);
  }

  // ── 2. Resize + crop to 1200×630 (cover behavior) ────────────────────────
  let baseImage: InstanceType<typeof Jimp>;

  if (artBuf) {
    const src = await Jimp.fromBuffer(artBuf);
    const srcW = src.width;
    const srcH = src.height;

    // Scale so the image covers 1200×630 (no letterboxing)
    const scaleX = OG_WIDTH / srcW;
    const scaleY = OG_HEIGHT / srcH;
    const scale = Math.max(scaleX, scaleY);

    const scaledW = Math.round(srcW * scale);
    const scaledH = Math.round(srcH * scale);

    src.resize({ w: scaledW, h: scaledH });

    // Center-crop to 1200×630
    const cropX = Math.round((scaledW - OG_WIDTH) / 2);
    const cropY = Math.round((scaledH - OG_HEIGHT) / 2);
    src.crop({ x: cropX, y: cropY, w: OG_WIDTH, h: OG_HEIGHT });

    baseImage = src as any;
  } else {
    // Fallback: solid dark background
    baseImage = new Jimp({ width: OG_WIDTH, height: OG_HEIGHT, color: 0x111111ff }) as any;
  }

  // ── 3. Render SVG overlay to PNG via resvg ────────────────────────────────
  const badgeCfg = resolveBadge(badge);
  const overlaySvg = buildOverlaySvg({ wid, badgeCfg });
  const resvg = new Resvg(overlaySvg, {
    fitTo: { mode: "width" as const, value: OG_WIDTH },
  });
  const overlayPng = resvg.render().asPng();
  const overlayImage = await Jimp.fromBuffer(overlayPng) as any;

  // ── 4. Composite overlay over artwork ────────────────────────────────────
  baseImage.composite(overlayImage, 0, 0);

  // ── 5. Return PNG buffer ──────────────────────────────────────────────────
  return await baseImage.getBuffer("image/png") as Buffer;
}
