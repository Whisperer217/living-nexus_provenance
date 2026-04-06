/**
 * /api/og/* — CDN-bypass OG HTML endpoints
 *
 * The Manus Cloudflare CDN intercepts all page routes (e.g. /song/1, /project/slug)
 * and serves the pre-built static bundle, overriding any OG meta tags the Express
 * server would inject. However, /api/* routes are ALWAYS forwarded to Express.
 *
 * These endpoints return fully OG-injected HTML pages that Facebook, Messenger,
 * and other crawlers can scrape directly via:
 *   https://www.livingnexus.org/api/og/song/1
 *   https://www.livingnexus.org/api/og/creator/1
 *   https://www.livingnexus.org/api/og/project/my-project-slug
 *
 * Usage:
 * - Share /api/og/song/:id instead of /song/:id on Facebook/Messenger for rich previews
 * - The React app updates the canonical <link> tag on navigation so crawlers follow it
 *
 * Platform support:
 * - Facebook / Messenger: reads og:title, og:description, og:image, og:url from HTML
 * - Discord: reads oEmbed discovery link → /api/oembed?url=... (already working)
 * - X/Twitter: reads twitter:card, twitter:title, twitter:image from HTML
 * - iMessage/Applebot: reads og:image, og:title from HTML
 */

import { Router } from "express";
import fs from "fs";
import path from "path";
import {
  getSongWithCreator,
  getCreatorForOg,
  getProjectBySlug,
} from "./db";

const CANONICAL_ORIGIN = "https://www.livingnexus.org";
const FALLBACK_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildOgHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
  twitterCard?: string;
  embedIframeUrl?: string | null;
}): string {
  const {
    title,
    description,
    image,
    url,
    type = "website",
    twitterCard = "summary_large_image",
    embedIframeUrl,
  } = opts;

  const oembedUrl = `${CANONICAL_ORIGIN}/api/oembed?url=${encodeURIComponent(url)}`;

  const metaTags = [
    `<meta property="og:type" content="${escAttr(type)}" />`,
    `<meta property="og:site_name" content="Living Nexus" />`,
    `<meta property="og:title" content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(description)}" />`,
    `<meta property="og:image" content="${escAttr(image)}" />`,
    `<meta property="og:image:secure_url" content="${escAttr(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escAttr(title)}" />`,
    `<meta property="og:url" content="${escAttr(url)}" />`,
    `<meta name="theme-color" content="#D4AF37" />`,
    `<meta name="twitter:card" content="${twitterCard}" />`,
    `<meta name="twitter:site" content="@LivingNexus" />`,
    `<meta name="twitter:title" content="${escAttr(title)}" />`,
    `<meta name="twitter:description" content="${escAttr(description)}" />`,
    `<meta name="twitter:image" content="${escAttr(image)}" />`,
  ];

  if (embedIframeUrl) {
    metaTags.push(`<meta property="og:video" content="${escAttr(embedIframeUrl)}" />`);
    metaTags.push(`<meta property="og:video:secure_url" content="${escAttr(embedIframeUrl)}" />`);
    metaTags.push(`<meta property="og:video:type" content="text/html" />`);
    metaTags.push(`<meta property="og:video:width" content="480" />`);
    metaTags.push(`<meta property="og:video:height" content="270" />`);
    metaTags.push(`<meta name="twitter:player" content="${escAttr(embedIframeUrl)}" />`);
    metaTags.push(`<meta name="twitter:player:width" content="480" />`);
    metaTags.push(`<meta name="twitter:player:height" content="270" />`);
  }

  // Minimal HTML shell — just enough for crawlers to read meta tags
  // Includes a JS redirect so if a human visits this URL they land on the real page
  return `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escAttr(title)}</title>
  ${metaTags.join("\n  ")}
  <link rel="alternate" type="application/json+oembed" href="${escAttr(oembedUrl)}" title="Living Nexus oEmbed" />
  <link rel="canonical" href="${escAttr(url)}" />
  <script>
    // Redirect humans to the real SPA page; crawlers don't execute JS
    if (typeof window !== 'undefined' && !navigator.userAgent.match(/bot|crawler|spider|facebook|discord|twitter|slack|telegram|whatsapp|apple/i)) {
      window.location.replace(${JSON.stringify(url)});
    }
  </script>
</head>
<body>
  <noscript>
    <h1>${escAttr(title)}</h1>
    <p>${escAttr(description)}</p>
    <img src="${escAttr(image)}" alt="${escAttr(title)}" width="1200" height="630" />
    <a href="${escAttr(url)}">View on Living Nexus</a>
  </noscript>
</body>
</html>`;
}

export const ogApiRouter = Router();

// ── /api/og/song/:id ────────────────────────────────────────────────────────
ogApiRouter.get("/api/og/song/:id", async (req, res) => {
  const songId = parseInt(req.params.id, 10);
  if (isNaN(songId)) return res.status(400).send("Invalid song ID");

  try {
    const result = await getSongWithCreator(songId);
    if (!result) return res.status(404).send("Song not found");

    const { song, creator } = result;
    const artistName =
      (creator as any)?.artistHandle?.trim() ||
      (creator as any)?.name?.trim() ||
      "Unknown Artist";

    const title = `${song.title} — ${artistName} | Living Nexus`;
    const genrePart = (song as any).genre ? ` · ${(song as any).genre}` : "";
    const widPart = (song as any).witnessId
      ? ` · WID: ${(song as any).witnessId}`
      : " · WID Protected";
    const description = `🎵 ${song.title} by ${artistName}${genrePart}${widPart} — Listen on Living Nexus`;

    const coverArt = (song as any).coverArtUrl?.trim();
    const image = coverArt && coverArt.length > 0 ? coverArt : FALLBACK_IMAGE;
    const url = `${CANONICAL_ORIGIN}/song/${songId}`;
    const embedIframeUrl = `${CANONICAL_ORIGIN}/embed/song/${songId}`;

    const html = buildOgHtml({
      title,
      description,
      image,
      url,
      type: "video.other",
      twitterCard: "player",
      embedIframeUrl,
    });

    res.status(200).set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    }).end(html);
  } catch (err) {
    console.error("[OG API] Error for song", songId, err);
    res.status(500).send("Internal server error");
  }
});

// ── /api/og/creator/:id ─────────────────────────────────────────────────────
ogApiRouter.get("/api/og/creator/:id", async (req, res) => {
  const creatorId = parseInt(req.params.id, 10);
  if (isNaN(creatorId)) return res.status(400).send("Invalid creator ID");

  try {
    const result = await getCreatorForOg(creatorId);
    if (!result) return res.status(404).send("Creator not found");

    const { creator, publishedCount, widCount } = result;
    const displayName =
      creator.artistHandle?.trim() || creator.name?.trim() || "Unknown Artist";

    const title = `${displayName} | Living Nexus Creator`;
    const bioSnippet = creator.bio?.trim()
      ? creator.bio.trim().slice(0, 160) + (creator.bio.trim().length > 160 ? "…" : "")
      : null;
    const statsLine = `${publishedCount} track${publishedCount !== 1 ? "s" : ""} · ${widCount} WID Protected`;
    const description = bioSnippet
      ? `${bioSnippet} — ${statsLine}`
      : `${displayName} on Living Nexus — ${statsLine}`;

    const bannerUrl = creator.bannerUrl?.trim();
    const avatarUrl = creator.profilePhotoUrl?.trim();
    const image =
      (bannerUrl && bannerUrl.length > 0 ? bannerUrl : null) ??
      (avatarUrl && avatarUrl.length > 0 ? avatarUrl : null) ??
      FALLBACK_IMAGE;

    const url = `${CANONICAL_ORIGIN}/creator/${creatorId}`;

    const html = buildOgHtml({
      title,
      description,
      image,
      url,
      type: "profile",
    });

    res.status(200).set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    }).end(html);
  } catch (err) {
    console.error("[OG API] Error for creator", creatorId, err);
    res.status(500).send("Internal server error");
  }
});

// ── /api/og/project/:slug ───────────────────────────────────────────────────
ogApiRouter.get("/api/og/project/:slug", async (req, res) => {
  const slug = decodeURIComponent(req.params.slug?.trim() || "");
  if (!slug) return res.status(400).send("Invalid project slug");

  try {
    const project = await getProjectBySlug(slug);
    if (!project) return res.status(404).send("Project not found");

    const creatorName =
      (project as any).creatorHandle?.trim() ||
      (project as any).creatorName?.trim() ||
      "Unknown Creator";

    const title = `${project.title} — ${creatorName} | Living Nexus Project`;
    const raisedDollars = Math.floor((project.raisedAmountCents || 0) / 100);
    const goalDollars = project.goalAmountCents
      ? Math.floor(project.goalAmountCents / 100)
      : null;
    const fundingLine = goalDollars
      ? `$${raisedDollars} raised of $${goalDollars} goal · ${project.donorCount || 0} supporters`
      : `$${raisedDollars} raised · ${project.donorCount || 0} supporters`;
    const taglinePart = project.tagline?.trim() ? `${project.tagline.trim()} — ` : "";
    const description = `${taglinePart}${fundingLine} — Support this project on Living Nexus`;

    const bannerUrl = project.bannerUrl?.trim();
    const image = (bannerUrl && bannerUrl.length > 0 ? bannerUrl : null) ?? FALLBACK_IMAGE;
    const url = `${CANONICAL_ORIGIN}/project/${slug}`;

    const html = buildOgHtml({ title, description, image, url });

    res.status(200).set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    }).end(html);
  } catch (err) {
    console.error("[OG API] Error for project", slug, err);
    res.status(500).send("Internal server error");
  }
});
