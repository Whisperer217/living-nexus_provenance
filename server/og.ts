/**
 * Open Graph meta tag injection for /song/:id routes.
 *
 * Social crawlers (Discord, X/Twitter, Slack, iMessage) do NOT execute
 * JavaScript. They fetch the raw HTML and read <meta> tags. Since this app
 * is a React SPA, we must intercept /song/:id on the Express layer, query
 * the DB, and inject OG tags into the HTML before it reaches the client.
 */

import { type Express } from "express";
import fs from "fs";
import path from "path";
import { getSongWithCreator } from "./db";

/** Canonical production origin — always use this for og:url */
const CANONICAL_ORIGIN = "https://www.livingnexus.org";

/** Fallback cover art (platform logo) when a song has no cover art */
const FALLBACK_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

/** Escape a string for safe use inside an HTML attribute value. */
function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build the OG + Twitter <meta> block for a song. */
function buildOgTags(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
}): string {
  const { title, description, image, url, siteName } = opts;
  return [
    `<meta property="og:type" content="music.song" />`,
    `<meta property="og:site_name" content="${escAttr(siteName)}" />`,
    `<meta property="og:title" content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(description)}" />`,
    `<meta property="og:image" content="${escAttr(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:url" content="${escAttr(url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escAttr(title)}" />`,
    `<meta name="twitter:description" content="${escAttr(description)}" />`,
    `<meta name="twitter:image" content="${escAttr(image)}" />`,
  ].join("\n    ");
}

/** Default OG tags used for all non-song pages. */
const DEFAULT_OG = buildOgTags({
  title: "Living Nexus — Sovereign Music Platform",
  description:
    "Discover, share, and experience music with cryptographic provenance. Every track carries a Witness ID — proof of creation that belongs to the artist.",
  image: FALLBACK_IMAGE,
  url: CANONICAL_ORIGIN,
  siteName: "Living Nexus",
});

/** Inject OG tags into an HTML string, replacing the <title> and adding meta tags. */
function injectOg(html: string, ogBlock: string, pageTitle: string): string {
  // Replace <title>
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(pageTitle)}</title>`);
  // Remove any existing og: / twitter: meta tags to avoid duplicates
  out = out.replace(/<meta\s+(property|name)="(og:|twitter:)[^"]*"[^>]*\/?>/gi, "");
  // Inject before </head>
  out = out.replace("</head>", `    ${ogBlock}\n  </head>`);
  return out;
}

/** Read the production index.html from disk (used in production serveStatic). */
function readIndexHtml(distPath: string): string {
  const indexPath = path.resolve(distPath, "index.html");
  if (!fs.existsSync(indexPath)) return "";
  return fs.readFileSync(indexPath, "utf-8");
}

/**
 * Detect social/link-preview crawlers by User-Agent.
 *
 * This list covers:
 * - Discord (Discordbot)
 * - Twitter/X (Twitterbot)
 * - Facebook (facebookexternalhit)
 * - LinkedIn (LinkedInBot)
 * - Slack (Slackbot-LinkExpanding)
 * - Telegram (TelegramBot)
 * - WhatsApp (WhatsApp)
 * - iMessage / Apple (Applebot, iMessage link preview uses "AppleNewsBot" or plain fetch)
 * - Signal (Signal)
 * - Google (Googlebot)
 * - Bing (bingbot)
 * - CLI tools (curl, wget, python-requests, Go-http-client)
 */
function isCrawler(ua: string): boolean {
  return /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Applebot|AppleNewsBot|Signal|Googlebot|bingbot|curl|wget|python-requests|Go-http-client|Iframely|Embedly|Prerender|OpenGraph|preview\.io|meta-externalagent/i.test(
    ua
  );
}

/**
 * Register the /song/:id OG middleware on the Express app.
 *
 * MUST be called BEFORE setupVite / serveStatic so this handler runs first.
 */
export function registerOgRoutes(app: Express) {
  app.get("/song/:id", async (req, res, next) => {
    const songId = parseInt(req.params.id, 10);
    if (isNaN(songId)) return next();

    // Only intercept requests from bots / crawlers.
    // Regular browsers get the normal SPA flow (Vite or static).
    const ua = req.headers["user-agent"] || "";
    if (!isCrawler(ua)) return next();

    try {
      const result = await getSongWithCreator(songId);
      if (!result) return next();

      const { song, creator } = result;

      // Prefer artistHandle (stage name) over display name
      const artistName =
        (creator as any)?.artistHandle?.trim() ||
        (creator as any)?.name?.trim() ||
        "Unknown Artist";

      // og:title — "Song Title — Artist Name | Living Nexus"
      const ogTitle = `${song.title} — ${artistName} | Living Nexus`;

      // og:description — exact spec format
      const ogDescription = `Listen to ${song.title} by ${artistName} on Living Nexus — WID Protected`;

      // og:image — cover art from CloudFront, fall back to platform logo
      const coverArt = (song as any).coverArtUrl?.trim();
      const ogImage = coverArt && coverArt.length > 0 ? coverArt : FALLBACK_IMAGE;

      // og:url — always canonical production URL (never sandbox/preview URLs)
      const ogUrl = `${CANONICAL_ORIGIN}/song/${songId}`;

      const ogBlock = buildOgTags({
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        url: ogUrl,
        siteName: "Living Nexus",
      });

      // In development, Vite transforms the HTML — we read the source template.
      // In production, we read the built index.html.
      const isDev = process.env.NODE_ENV === "development";
      let html: string;

      if (isDev) {
        const clientTemplate = path.resolve(
          import.meta.dirname,
          "..",
          "client",
          "index.html"
        );
        html = await fs.promises.readFile(clientTemplate, "utf-8");
      } else {
        const distPath = path.resolve(import.meta.dirname, "public");
        html = readIndexHtml(distPath);
      }

      if (!html) return next();

      const page = injectOg(html, ogBlock, ogTitle);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      console.error("[OG] Error generating meta tags for song", songId, err);
      next();
    }
  });
}
