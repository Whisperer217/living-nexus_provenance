/**
 * Provenance Distribution Layer (PDL) — /share/:wid
 *
 * This is the canonical "share surface" for Living Nexus.
 * Every song carries a WID (Witness ID) — the cryptographic origin stamp.
 * When a creator shares a song to Discord, Twitter, Slack, iMessage, etc.,
 * they share this URL: https://www.livingnexus.org/share/:wid
 *
 * Why this works where /song/:id fails:
 * - The Manus Cloudflare CDN overrides OG tags for known page routes (/song/:id)
 * - /share/* is NOT a known static page route — the CDN forwards it to Express
 * - Express returns a server-rendered HTML page with the correct OG tags
 * - Discord, Slack, Twitter, iMessage all read those tags directly
 * - Browsers are immediately redirected to /song/:id for the full UI experience
 *
 * The WID is the provenance anchor. It survives external systems.
 */

import { Router } from "express";
import { getSongByWitnessId } from "../utils/db";
import { getDb } from "../utils/db";
import { shareArtifacts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const CANONICAL_ORIGIN = "https://www.livingnexus.org";
const FALLBACK_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

export const shareRouter = Router();

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

shareRouter.get("/share/:wid", async (req, res) => {
  const { wid } = req.params;

  if (!wid || wid.length < 3) {
    return res.redirect(302, "/");
  }

  // ── Fast path: serve precomputed HTML artifact if available ──────────────
  // This is the "write-once, serve-forever" optimization.
  // The artifact is generated at upload time and cached in the DB.
  // Skip cache warm requests (?warm=1) so the artifact is always fresh.
  if (!req.query.warm) {
    try {
      const db = await getDb();
      const [artifact] = await db
        .select({ htmlSnapshot: shareArtifacts.htmlSnapshot, status: shareArtifacts.status })
        .from(shareArtifacts)
        .where(eq(shareArtifacts.wid, wid))
        .limit(1);

      if (artifact?.status === "ready" && artifact.htmlSnapshot) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("X-Frame-Options", "ALLOWALL");
        res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
        res.setHeader("X-Share-Cache", "HIT");
        return res.status(200).end(artifact.htmlSnapshot);
      }
    } catch (cacheErr) {
      // Cache miss or DB error — fall through to live render
      console.warn("[PDL] Cache lookup failed, falling back to live render:", cacheErr);
    }
  }

  // ── Live render fallback ──────────────────────────────────────────────────
  try {
    const result = await getSongByWitnessId(wid);

    if (!result) {
      // WID not found — redirect to home with a note
      return res.redirect(302, `/?wid=${encodeURIComponent(wid)}`);
    }

    const { song, creator } = result;

    const artistName =
      (creator as any)?.artistHandle?.trim() ||
      (creator as any)?.name?.trim() ||
      "Unknown Artist";

    const title = `${song.title} — ${artistName}`;
    const genrePart = (song as any).genre ? ` · ${(song as any).genre}` : "";
    const description = `🎵 ${song.title} by ${artistName}${genrePart} · WID: ${wid} — Listen on Living Nexus`;

    const coverArt = (song as any).coverArtUrl?.trim();
    const thumbnailUrl = coverArt && coverArt.length > 0 ? coverArt : FALLBACK_IMAGE;

    const audioUrl = (song as any).fileUrl?.trim() || null;
    const embedVideoUrl = (song as any).embedVideoUrl?.trim() || null;

    const songPageUrl = `${CANONICAL_ORIGIN}/song/${song.id}`;
    const shareUrl = `${CANONICAL_ORIGIN}/share/${encodeURIComponent(wid)}`;
    const embedIframeUrl = `${CANONICAL_ORIGIN}/embed/song/${song.id}`;
    const oembedUrl = `${CANONICAL_ORIGIN}/api/oembed?wid=${encodeURIComponent(wid)}`;

    // Build the OG meta block
    const ogTags = [
      `<meta property="og:type" content="music.song" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(description)}" />`,
      `<meta property="og:url" content="${esc(shareUrl)}" />`,
      `<meta property="og:site_name" content="Living Nexus" />`,
      `<meta property="og:image" content="${esc(thumbnailUrl)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${esc(title)}" />`,
      audioUrl ? `<meta property="og:audio" content="${esc(audioUrl)}" />` : "",
      audioUrl ? `<meta property="og:audio:type" content="audio/mpeg" />` : "",
      // og:video as iframe embed (text/html) — YouTube pattern for inline players
      `<meta property="og:video" content="${esc(embedIframeUrl)}" />`,
      `<meta property="og:video:secure_url" content="${esc(embedIframeUrl)}" />`,
      `<meta property="og:video:type" content="text/html" />`,
      `<meta property="og:video:width" content="480" />`,
      `<meta property="og:video:height" content="270" />`,
      // Twitter / X card
      `<meta name="twitter:card" content="player" />`,
      `<meta name="twitter:title" content="${esc(title)}" />`,
      `<meta name="twitter:description" content="${esc(description)}" />`,
      `<meta name="twitter:image" content="${esc(thumbnailUrl)}" />`,
      `<meta name="twitter:player" content="${esc(embedIframeUrl)}" />`,
      `<meta name="twitter:player:width" content="480" />`,
      `<meta name="twitter:player:height" content="270" />`,
      embedVideoUrl ? `<meta name="twitter:player:stream" content="${esc(embedVideoUrl)}" />` : "",
      embedVideoUrl ? `<meta name="twitter:player:stream:content_type" content="video/mp4" />` : "",
      // Canonical
      `<link rel="canonical" href="${esc(shareUrl)}" />`,
      // oEmbed discovery — Discord reads this and calls /api/oembed directly on Express
      `<link rel="alternate" type="application/json+oembed" href="${esc(oembedUrl)}" title="${esc(title)}" />`,
    ].filter(Boolean).join("\n    ");

    // The share surface HTML:
    // - Full OG/Twitter meta tags for scrapers
    // - Instant redirect to /song/:id for real browsers
    // - Minimal fallback UI in case redirect is blocked
    const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} | Living Nexus</title>

  <!-- Provenance Distribution Layer — Living Nexus WID Share Surface -->
  <!-- WID: ${esc(wid)} -->
  ${ogTags}

  <!-- Instant browser redirect to full song page -->
  <meta http-equiv="refresh" content="0; url=${esc(songPageUrl)}" />

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #080d14;
      color: #e8d5a3;
      font-family: 'Cinzel', Georgia, serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .card {
      max-width: 480px;
      text-align: center;
    }
    .cover {
      width: 200px;
      height: 200px;
      border-radius: 8px;
      object-fit: cover;
      border: 2px solid #D4AF37;
      margin: 0 auto 1.5rem;
      display: block;
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #D4AF37;
      margin-bottom: 0.5rem;
      letter-spacing: 0.04em;
    }
    .artist {
      font-size: 0.95rem;
      color: #a89060;
      margin-bottom: 1rem;
    }
    .wid {
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.7rem;
      color: #4a5568;
      margin-bottom: 1.5rem;
      letter-spacing: 0.08em;
    }
    a {
      display: inline-block;
      background: #D4AF37;
      color: #080d14;
      text-decoration: none;
      padding: 0.75rem 2rem;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.06em;
    }
  </style>
</head>
<body>
  <div class="card">
    <img class="cover" src="${esc(thumbnailUrl)}" alt="${esc(title)}" />
    <h1>${esc(song.title)}</h1>
    <div class="artist">${esc(artistName)}</div>
    <div class="wid">${esc(wid)}</div>
    <a href="${esc(songPageUrl)}">▶ Listen on Living Nexus</a>
  </div>
  <script>
    // Immediate JS redirect as backup to meta refresh
    window.location.replace(${JSON.stringify(songPageUrl)});
  </script>
</body>
</html>`;

    // Set headers — allow iframing (for embed previews), no CDN caching of this route
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.status(200).end(html);
  } catch (err) {
    console.error("[PDL] Error serving /share/:wid", wid, err);
    return res.redirect(302, "/");
  }
});
