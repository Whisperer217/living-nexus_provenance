/**
 * Open Graph meta tag injection for /song/:id and /creator/:id routes.
 *
 * Social crawlers (Discord, X/Twitter, Slack, iMessage) do NOT execute
 * JavaScript. They fetch the raw HTML and read <meta> tags. Since this app
 * is a React SPA, we must intercept these routes on the Express layer, query
 * the DB, and inject OG tags into the HTML before it reaches the client.
 *
 * Creator profile pages act as PUBLIC NOMINATION CARDS — sharing a creator
 * URL on any platform unfurls their banner, avatar, artist name, bio, genre,
 * WID count, and track count. The link carries the creator's full visual
 * identity and provenance chain.
 */

import { type Express } from "express";
import fs from "fs";
import path from "path";
import { getSongWithCreator, getCreatorForOg, getCollectionByWid, getUserById, getProjectBySlug, getSongByWitnessId, getManifestedCollectionBySlug } from "../utils/db";
import { getOrGenerateEmbedVideo } from "../services/embedVideo";

/** Canonical production origin — always use this for og:url */
const CANONICAL_ORIGIN = "https://www.livingnexus.org";

/** Fallback cover art (platform logo) when a song/creator has no image */
const FALLBACK_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

/** Escape a string for safe use inside an HTML attribute value. */
function escAttr(s: string | null | undefined | number): string {
  if (s == null) return "";
  const str = typeof s === "string" ? s : String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build the OG + Twitter <meta> block for a song. */
function buildSongOgTags(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  /** Direct CDN URL of the audio file — kept for Telegram og:audio support */
  audioUrl?: string | null;
  /** MIME type of the audio file, e.g. "audio/mpeg" or "audio/mp4" */
  audioType?: string | null;
  /**
   * S3 CDN URL of the pre-generated embed MP4 (cover art loop + audio).
   * Kept for iMessage inline playback (iMessage reads og:video pointing to .mp4 directly).
   */
  embedVideoUrl?: string | null;
  /**
   * Song ID — used to build the /embed/song/:id iframe URL for Discord inline player.
   * Discord requires og:video:url pointing to an iframe page with og:video:type="text/html"
   * (the YouTube pattern). Raw .mp4 URLs do NOT trigger inline playback in Discord.
   */
  songId?: number | null;
}): string {
  const { title, description, image, url, siteName, audioUrl, audioType, embedVideoUrl, songId } = opts;

  // Always use video.other when we have an embed iframe — required for Discord inline player
  const hasEmbed = !!songId;
  const ogType = hasEmbed ? "video.other" : "music.song";

  // The iframe embed URL — Discord renders this as an inline player
  const embedIframeUrl = songId
    ? `${CANONICAL_ORIGIN}/embed/song/${songId}`
    : null;

  const tags = [
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:site_name" content="${escAttr(siteName)}" />`,
    `<meta property="og:title" content="${escAttr(title)}" />`,
    `<meta property="og:description" content="${escAttr(description)}" />`,
    `<meta property="og:image" content="${escAttr(image)}" />`,
    `<meta property="og:image:secure_url" content="${escAttr(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escAttr(title)}" />`,
    `<meta property="og:url" content="${escAttr(url)}" />`,
    // Discord embed accent color — Living Nexus gold
    `<meta name="theme-color" content="#D4AF37" />`,
  ];

  // og:video pointing to the iframe embed page — the YouTube/Discord pattern
  // Discord renders this as an inline player when og:video:type="text/html"
  if (embedIframeUrl) {
    tags.push(`<meta property="og:video" content="${escAttr(embedIframeUrl)}" />`);
    tags.push(`<meta property="og:video:secure_url" content="${escAttr(embedIframeUrl)}" />`);
    tags.push(`<meta property="og:video:type" content="text/html" />`);
    tags.push(`<meta property="og:video:width" content="480" />`);
    tags.push(`<meta property="og:video:height" content="270" />`);
    // Twitter player card — enables inline player on X/Twitter and Discord
    tags.push(`<meta name="twitter:card" content="player" />`);
    tags.push(`<meta name="twitter:player" content="${escAttr(embedIframeUrl)}" />`);
    tags.push(`<meta name="twitter:player:width" content="480" />`);
    tags.push(`<meta name="twitter:player:height" content="270" />`);
    // Also include the raw MP4 stream for iMessage / Telegram direct video playback
    if (embedVideoUrl && embedVideoUrl.trim().length > 0) {
      const vUrl = embedVideoUrl.trim();
      tags.push(`<meta name="twitter:player:stream" content="${escAttr(vUrl)}" />`);
      tags.push(`<meta name="twitter:player:stream:content_type" content="video/mp4" />`);
    }
  } else {
    // No song ID — fall back to summary_large_image
    tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  }

  tags.push(`<meta name="twitter:title" content="${escAttr(title)}" />`);
  tags.push(`<meta name="twitter:description" content="${escAttr(description)}" />`);
  tags.push(`<meta name="twitter:image" content="${escAttr(image)}" />`);

  // og:audio — Telegram reads this; Discord ignores it but it doesn't hurt
  if (audioUrl && audioUrl.trim().length > 0) {
    const mime = audioType || deriveAudioMime(audioUrl);
    tags.push(`<meta property="og:audio" content="${escAttr(audioUrl)}" />`);
    tags.push(`<meta property="og:audio:secure_url" content="${escAttr(audioUrl)}" />`);
    tags.push(`<meta property="og:audio:type" content="${escAttr(mime)}" />`);
  }

  return tags.join("\n    ");
}

/** Derive a MIME type from a file URL extension. */
function deriveAudioMime(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".ogg") || lower.endsWith(".oga")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".aac")) return "audio/aac";
  return "audio/mpeg"; // safe default
}

/**
 * Build the OG + Twitter <meta> block for a creator profile nomination card.
 *
 * Uses og:type="profile" and includes twitter:creator if the creator has
 * a Twitter handle set on their profile.
 */
function buildCreatorOgTags(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  twitterHandle?: string | null;
}): string {
  const { title, description, image, url, siteName, twitterHandle } = opts;
  const tags = [
    `<meta property="og:type" content="profile" />`,
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
  ];
  // Add twitter:creator if the creator has a handle (prepend @ if missing)
  if (twitterHandle && twitterHandle.trim()) {
    const handle = twitterHandle.trim().startsWith("@")
      ? twitterHandle.trim()
      : `@${twitterHandle.trim()}`;
    tags.push(`<meta name="twitter:creator" content="${escAttr(handle)}" />`);
  }
  return tags.join("\n    ");
}

/** Default OG tags used for all non-song/non-creator pages. */
const DEFAULT_OG = buildSongOgTags({
  title: "Living Nexus — Sovereign Music Platform",
  description:
    "Discover, share, and experience music with cryptographic provenance. Every track carries a Witness ID — proof of creation that belongs to the artist.",
  image: FALLBACK_IMAGE,
  url: CANONICAL_ORIGIN,
  siteName: "Living Nexus",
});

/**
 * Build a visible static body block for the witness record (song pages).
 * Rendered before #root — crawlers and no-JS users read the real proof.
 * React removes it on mount via main.tsx.
 */
function buildWitnessBodyBlock(opts: {
  title: string;
  artistName: string;
  artistId?: number | null;
  genre?: string | null;
  witnessId: string | null;
  witnessDate?: Date | string | null;
  verifyUrl: string;
  lyrics?: string | null;
  playCount?: number;
  moodTags?: string | null;
  bpm?: number | null;
  keySignature?: string | null;
  releaseDate?: Date | string | null;
  isrc?: string | null;
  coverArtUrl?: string | null;
  songUrl?: string | null;
}): string {
  const { title, artistName, artistId, genre, witnessId, witnessDate, verifyUrl, lyrics } = opts;
  const artistHref = artistId
    ? `${CANONICAL_ORIGIN}/creator/${artistId}`
    : `${CANONICAL_ORIGIN}/explore`;
  const dateStr = witnessDate
    ? new Date(witnessDate).toISOString().split("T")[0]
    : "";
  const lyricsBlock =
    lyrics && lyrics.trim().length > 0
      ? `\n  <pre id="ln-witness-lyrics">${escAttr(lyrics.trim())}</pre>`
      : "";
  const { playCount, moodTags, bpm, keySignature, isrc } = opts;
  return (
    `<div id="ln-witness-record">` +
    `<h1>${escAttr(title)}</h1>` +
    `<p>Creator: <a href="${escAttr(artistHref)}">${escAttr(artistName)}</a></p>` +
    (genre ? `<p>Genre: ${escAttr(genre)}</p>` : "") +
    (witnessId ? `<p>Witness ID: ${escAttr(witnessId)}</p>` : "") +
    (dateStr ? `<p>Witnessed: ${escAttr(dateStr)}</p>` : "") +
    (bpm ? `<p>BPM: ${bpm}</p>` : "") +
    (keySignature ? `<p>Key: ${escAttr(keySignature)}</p>` : "") +
    (moodTags ? `<p>Mood: ${escAttr(moodTags)}</p>` : "") +
    (isrc ? `<p>ISRC: ${escAttr(isrc)}</p>` : "") +
    ((playCount ?? 0) > 0 ? `<p>Plays: ${playCount}</p>` : "") +
    `<p><a href="${escAttr(verifyUrl)}">Verify this work on Living Nexus</a></p>` +
    lyricsBlock +
    `</div>`
  );
}

/**
 * Build a schema.org/MusicRecording JSON-LD block for Google rich results.
 * Injected into <head> as <script type="application/ld+json">.
 */
function buildSongJsonLd(opts: {
  title: string;
  artistName: string;
  artistId?: number | null;
  genre?: string | null;
  witnessId?: string | null;
  witnessDate?: Date | string | null;
  songUrl: string;
  coverArtUrl?: string | null;
  audioUrl?: string | null;
  duration?: number | null; // seconds
  bpm?: number | null;
  keySignature?: string | null;
  isrc?: string | null;
  playCount?: number;
}): string {
  const { title, artistName, artistId, genre, witnessId, witnessDate, songUrl, coverArtUrl, audioUrl, duration, bpm, keySignature, isrc, playCount } = opts;
  const artistUrl = artistId
    ? `${CANONICAL_ORIGIN}/creator/${artistId}`
    : `${CANONICAL_ORIGIN}/explore`;
  const datePublished = witnessDate
    ? new Date(witnessDate).toISOString().split("T")[0]
    : undefined;

  // ISO 8601 duration from seconds (e.g. PT3M45S)
  const isoDuration = duration && duration > 0
    ? `PT${Math.floor(duration / 60)}M${Math.floor(duration % 60)}S`
    : undefined;

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: title,
    byArtist: {
      "@type": "MusicGroup",
      name: artistName,
      url: artistUrl,
    },
    url: songUrl,
    ...(genre ? { genre } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(coverArtUrl ? { image: coverArtUrl } : {}),
    ...(audioUrl ? { contentUrl: audioUrl } : {}),
    ...(isoDuration ? { duration: isoDuration } : {}),
    ...(bpm ? { "schema:tempo": bpm } : {}),
    ...(keySignature ? { "schema:musicalKey": keySignature } : {}),
    ...(isrc ? { isrcCode: isrc } : {}),
    ...(witnessId ? {
      identifier: [
        { "@type": "PropertyValue", name: "Witness ID", value: witnessId },
      ],
    } : {}),
    ...(playCount && playCount > 0 ? { interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/ListenAction",
      userInteractionCount: playCount,
    }} : {}),
    publisher: {
      "@type": "Organization",
      name: "Living Nexus",
      url: CANONICAL_ORIGIN,
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

/**
 * Build a visible static body block for doctrine/static pages.
 * Rendered before #root — crawlers and no-JS users read the content.
 * React removes it on mount via main.tsx.
 */
function buildStaticBodyBlock(opts: {
  title: string;
  description: string;
  canonicalUrl: string;
  subheading?: string;
}): string {
  const { title, description, canonicalUrl, subheading } = opts;
  return (
    `<div id="ln-static-content">` +
    `<h1>${escAttr(title)}</h1>` +
    (subheading ? `<h2>${escAttr(subheading)}</h2>` : "") +
    `<p>${escAttr(description)}</p>` +
    `<p><a href="${escAttr(canonicalUrl)}">View on Living Nexus</a></p>` +
    `</div>`
  );
}

/** Inject OG tags into an HTML string, replacing the <title> and adding meta tags. */
function injectOg(
  html: string,
  ogBlock: string,
  pageTitle: string,
  canonicalUrl?: string,
  opts?: {
    /** Visible static body block inserted before #root (removed by React on mount) */
    bodyBlock?: string;
    /** Per-page meta description — replaces generic homepage boilerplate */
    metaDescription?: string;
    /** JSON-LD structured data block (schema.org) injected into <head> */
    jsonLd?: string;
  }
): string {
  // Replace <title>
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escAttr(pageTitle)}</title>`);
  // Remove any existing og: / twitter: meta tags to avoid duplicates
  out = out.replace(/<meta\s+(property|name)="(og:|twitter:)[^"]*"[^>]*\/?>/gi, "");
  // If we have a canonical URL, also inject a per-page oEmbed discovery link
  // This overrides the generic one in index.html with the exact song/creator URL
  // Discord reads this and calls /api/oembed?url={canonicalUrl} directly on the Express server
  let extraLinks = "";
  if (canonicalUrl) {
    const oembedUrl = `${CANONICAL_ORIGIN}/api/oembed?url=${encodeURIComponent(canonicalUrl)}`;
    extraLinks = `\n    <link rel="canonical" href="${escAttr(canonicalUrl)}" />`;
    extraLinks += `\n    <link rel="alternate" type="application/json+oembed" href="${escAttr(oembedUrl)}" title="Living Nexus oEmbed" />`;
  }
  // Remove any stale canonical tags that may have been injected by a previous pass
  out = out.replace(/<link\s+rel="canonical"[^>]*\/?>/gi, "");
  // Inject before </head>
  out = out.replace("</head>", `    ${ogBlock}${extraLinks}\n  </head>`);

  // Swap per-page meta description (replaces generic homepage boilerplate)
  if (opts?.metaDescription) {
    const escaped = escAttr(opts.metaDescription);
    // Replace existing <meta name="description" ...> if present
    if (/<meta\s+name="description"[^>]*>/i.test(out)) {
      out = out.replace(
        /<meta\s+name="description"[^>]*>/i,
        `<meta name="description" content="${escaped}" />`
      );
    } else {
      // Insert before </head> if not present
      out = out.replace("</head>", `    <meta name="description" content="${escaped}" />\n  </head>`);
    }
  }

  // Inject JSON-LD structured data into <head> (schema.org rich results)
  if (opts?.jsonLd) {
    out = out.replace("</head>", `    ${opts.jsonLd}\n  </head>`);
  }

  // Inject visible body block before <div id="root"> (removed by React on mount)
  if (opts?.bodyBlock) {
    out = out.replace(
      /<div\s+id="root"[^>]*>/,
      `${opts.bodyBlock}\n<div id="root">`
    );
  }

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
 * - iMessage / Apple (Applebot, AppleNewsBot)
 * - Signal (Signal)
 * - Google (Googlebot)
 * - Bing (bingbot)
 * - CLI tools (curl, wget, python-requests, Go-http-client)
 * - Preview services (Iframely, Embedly, Prerender, meta-externalagent)
 */
function isCrawler(ua: string): boolean {
  return /Discordbot|Twitterbot|facebookexternalhit|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Applebot|AppleNewsBot|Signal|Googlebot|bingbot|curl|wget|python-requests|Go-http-client|Iframely|Embedly|Prerender|OpenGraph|preview\.io|meta-externalagent/i.test(
    ua
  );
}

/** Resolve the HTML template (dev: source, prod: built). */
async function getHtmlTemplate(isDev: boolean): Promise<string> {
  if (isDev) {
    const clientTemplate = path.resolve(
      import.meta.dirname,
      "../..",
      "client",
      "index.html"
    );
    return fs.promises.readFile(clientTemplate, "utf-8");
  } else {
    const distPath = path.resolve(import.meta.dirname, "public");
    return readIndexHtml(distPath);
  }
}

/**
 * Register the /song/:id and /creator/:id OG middleware on the Express app.
 *
 * MUST be called BEFORE setupVite / serveStatic so this handler runs first.
 */
export function registerOgRoutes(app: Express) {
  const isDev = process.env.NODE_ENV === "development";

  // The managed preview must be served through Vite so its client transform and
  // React bootstrap can mount the application. Production continues to receive
  // the server-rendered OG and provenance body blocks used by crawlers.
  if (isDev) return;

  // ── /track/:id → /song/:id permanent redirect ────────────────────────────
  // /track/:id is a legacy URL pattern. Google Search Console flagged it as
  // "Duplicate, Google chose different canonical than user" because the page
  // returns 200 with no canonical tag. A 301 redirect to /song/:id tells Google
  // definitively which URL is canonical and consolidates link equity.
  app.get("/track/:id", (req, res) => {
    const id = req.params.id;
    res.redirect(301, `${CANONICAL_ORIGIN}/song/${id}`);
  });

  // ── /song/:id ──────────────────────────────────────────────────────────────
  // NOTE: We serve OG-injected HTML for ALL requests (not just crawlers) because
  // the Manus platform CDN intercepts bot requests at the Cloudflare layer and
  // generates its own OG tags from whatever HTML the page returns for normal
  // browser requests. By always injecting OG tags server-side, the CDN picks up
  // the song-specific metadata regardless of the User-Agent it uses.
  app.get("/song/:id", async (req, res, next) => {
    const songId = parseInt(req.params.id, 10);
    if (isNaN(songId)) return next();

    try {
      const result = await getSongWithCreator(songId);
      if (!result) return next();
      const { song, creator } = result;

      const artistName =
        (creator as any)?.artistHandle?.trim() ||
        (creator as any)?.name?.trim() ||
        "Unknown Artist";

      const ogTitle = `${song.title} — ${artistName} | Living Nexus`;

      // Richer description: genre + WID status + play count
      const genrePart = (song as any).genre ? ` · ${(song as any).genre}` : "";
      const widPart = (song as any).witnessId ? ` · WID: ${(song as any).witnessId}` : " · WID Protected";
      const playPart = (song as any).playCount > 0 ? ` · ${(song as any).playCount} plays` : "";
      const ogDescription = `🎵 ${song.title} by ${artistName}${genrePart}${widPart}${playPart} — Listen on Living Nexus`;

      // Use the generated provenance card image (full-bleed art + WID + badge overlay)
      // Falls back to raw cover art if the generated endpoint is unavailable
      const ogImage = `${CANONICAL_ORIGIN}/api/og/image/song/${songId}`;
      const ogUrl = `${CANONICAL_ORIGIN}/song/${songId}`;

      // Audio file URL — kept for Telegram og:audio
      const audioUrl = (song as any).fileUrl?.trim() || null;

      // Embed video (og:video MP4) — the ONLY way to get inline players on Discord + iMessage
      // Strategy: return cached URL instantly if available; otherwise fire generation in the
      // background and serve an image-only embed on this first visit.
      // Discord re-scrapes links within minutes, so the second paste will have the video.
      const cachedEmbedUrl = (song as any).embedVideoUrl?.trim() || null;
      let embedVideoUrl: string | null = cachedEmbedUrl;

      if (!cachedEmbedUrl && audioUrl) {
        // Fire-and-forget: generate in background, don't block this response
        getOrGenerateEmbedVideo({
          songId,
          coverArtUrl: (song as any).coverArtUrl?.trim() || null,
          fileUrl: audioUrl,
          embedVideoUrl: null,
        }).catch((err) => {
          console.error(`[OG] Background embed video generation failed for song ${songId}:`, err);
        });
      }

      const ogBlock = buildSongOgTags({
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        url: ogUrl,
        siteName: "Living Nexus",
        audioUrl,
        embedVideoUrl,
        songId, // enables /embed/song/:id iframe URL for Discord inline player
      });

      const html = await getHtmlTemplate(isDev);
      if (!html) return next();

      // Build visible witness body block — crawlers and no-JS users read the real proof
      const witnessId = (song as any).witnessId as string | null;
      const witnessDate = (song as any).createdAt ?? null;
      const lyricsText = (song as any).lyricsText as string | null;
      const isPublic = (song as any).status === "published";
      const downloadPermission = (song as any).downloadPermission as boolean | null;
      const creatorUserId = (creator as any)?.id as number | null;

      // Always build a visible body block — even for songs without a WID.
      // Songs without a WID still get a minimal block so Google can index title/artist/genre.
      const bodyBlock = buildWitnessBodyBlock({
        title: song.title,
        artistName,
        artistId: creatorUserId,
        genre: (song as any).genre ?? null,
        witnessId: witnessId ?? null,
        witnessDate,
        verifyUrl: witnessId
          ? `${CANONICAL_ORIGIN}/verify/${encodeURIComponent(witnessId)}`
          : `${CANONICAL_ORIGIN}/explore`,
        lyrics: isPublic && downloadPermission ? lyricsText : null,
        playCount: (song as any).playCount ?? 0,
        moodTags: (song as any).moodTags ?? null,
        bpm: (song as any).bpm ?? null,
        keySignature: (song as any).keySignature ?? null,
        releaseDate: (song as any).releaseDate ?? null,
        isrc: (song as any).isrc ?? null,
        coverArtUrl: (song as any).coverArtUrl?.trim() || null,
        songUrl: ogUrl,
      });

      // JSON-LD: schema.org/MusicRecording — Google rich results for music
      const musicRecordingLd = buildSongJsonLd({
        title: song.title,
        artistName,
        artistId: creatorUserId,
        genre: (song as any).genre ?? null,
        witnessId: witnessId ?? null,
        witnessDate,
        songUrl: ogUrl,
        coverArtUrl: (song as any).coverArtUrl?.trim() || null,
        audioUrl: audioUrl ?? null,
        duration: (song as any).durationSeconds ?? null,
        bpm: (song as any).bpm ?? null,
        keySignature: (song as any).keySignature ?? null,
        isrc: (song as any).isrc ?? null,
        playCount: (song as any).playCount ?? 0,
      });

      // BreadcrumbList: Home > Creator > Song — teaches Google the site hierarchy
      const creatorUrl = creatorUserId ? `${CANONICAL_ORIGIN}/creator/${creatorUserId}` : `${CANONICAL_ORIGIN}/explore`;
      const breadcrumbLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Living Nexus", item: CANONICAL_ORIGIN },
          { "@type": "ListItem", position: 2, name: artistName, item: creatorUrl },
          { "@type": "ListItem", position: 3, name: song.title, item: ogUrl },
        ],
      });
      const jsonLd = musicRecordingLd + `\n    <script type="application/ld+json">${breadcrumbLd}</script>`;

      const page = injectOg(html, ogBlock, ogTitle, ogUrl, {
        bodyBlock,
        metaDescription: ogDescription,
        jsonLd,
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      console.error("[OG] Error generating meta tags for song", songId, err);
      next();
    }
  });

  // ── Static page OG routes ──────────────────────────────────────────────────
  // Each static page gets its own specific title, description, and image so
  // sharing any Living Nexus URL shows the right preview on Discord/iMessage/etc.
  const STATIC_OG_ROUTES: Array<{
    path: string;
    title: string;
    description: string;
    image?: string;
  }> = [
    {
      path: "/field-notes",
      title: "Field Notes — Living Nexus",
      description: "Doctrine, journals, and creative testimony from Living Nexus creators. The voice and authority layer of the platform.",
    },
    {
      path: "/lexicon",
      title: "Living Nexus Lexicon — Platform Language Guide",
      description: "A legend that translates standard internet terms into Living Nexus language. Follow = Witness. Profile = Identity. Like = Acknowledge.",
    },
    {
      path: "/doctrine/wid-spec",
      title: "WID Public Specification v1.0 — Living Nexus",
      description: "The public specification for the Witness Identity Document (WID) system — a sovereign creative registry that proves origin before a work touches any platform.",
    },
    {
      path: "/manifesto",
      title: "The Manifesto — Living Nexus",
      description: "The founding doctrine of Living Nexus. Why sovereign music provenance matters and what we are building to protect it.",
    },
    {
      path: "/pricing",
      title: "Creator License — Living Nexus ($88.88)",
      description: "The Living Nexus Creator License. Protect your catalog, register your works, and own your provenance chain. $88.88 per year.",
    },
    {
      path: "/verify",
      title: "Verify a Witness ID — Living Nexus",
      description: "Look up any Witness ID (WID) to verify the origin, creator, and provenance chain of a work registered on Living Nexus.",
    },
    {
      path: "/explore",
      title: "Explore Music — Living Nexus",
      description: "Discover independent artists and WID-protected music on Living Nexus. Every track carries a Witness ID — proof of creation that belongs to the artist.",
    },
    {
      path: "/",
      title: "Living Nexus — The Creative Provenance Registry",
      description: "Living Nexus is the sovereign creative registry for independent creators. Register music, lyrics, manuscripts, and visual works with cryptographic Witness IDs — timestamped, attributed, and protected before your work touches any other platform.",
    },
    {
      path: "/profile",
      title: "My Identity — Living Nexus",
      description: "Your sovereign creative identity on Living Nexus. Your works, your Witness records, your provenance chain.",
    },
    {
      path: "/dashboard",
      title: "Creator Dashboard — Living Nexus",
      description: "Manage your catalog, track your earnings, and monitor your Witness ID records on Living Nexus.",
    },
    {
      path: "/archive",
      title: "My Archive (LNA) — Living Nexus",
      description: "Your Living Nexus Archive — every work you have uploaded, protected, and registered with a Witness ID.",
    },
    {
      path: "/upload",
      title: "Upload & Register — Living Nexus",
      description: "Upload your music and register it with a Witness ID on Living Nexus. Prove your origin before your work touches any other platform.",
    },
    {
      path: "/my-works",
      title: "My Works — Living Nexus",
      description: "Your complete catalog of WID-protected works on Living Nexus.",
    },
    {
      path: "/field-notes/new",
      title: "New Field Note — Living Nexus",
      description: "Write and publish a new Field Note — doctrine, journal entry, or creative testimony on Living Nexus.",
    },
  ];

  // Doctrine routes that get ln-static-content body injection
  // The homepage ("/") is included so SEO audit tools and search crawlers
  // that do NOT execute JavaScript see a real H1 and H2 in the static HTML.
  const DOCTRINE_PATHS = new Set(["/", "/manifesto", "/doctrine/wid-spec", "/lexicon"]);

  for (const route of STATIC_OG_ROUTES) {
    app.get(route.path, async (req, res, next) => {
      // For the homepage, serve OG-injected HTML for ALL requests so that
      // SEO audit tools (which use headless browsers / non-crawler UAs) see
      // the correct <title>, <meta keywords>, H1, and H2 in the static HTML.
      // For all other static routes, only intercept crawler UAs.
      const ua = req.headers["user-agent"] || "";
      if (route.path !== "/" && !isCrawler(ua)) return next();

      const canonicalUrl = `${CANONICAL_ORIGIN}${route.path === "/" ? "" : route.path}`;
      const finalCanonical = route.path === "/" ? `${CANONICAL_ORIGIN}/` : canonicalUrl;
      try {
        const ogBlock = buildSongOgTags({
          title: route.title,
          description: route.description,
          image: route.image || FALLBACK_IMAGE,
          url: finalCanonical,
          siteName: "Living Nexus",
        });
        const html = await getHtmlTemplate(isDev);
        if (!html) return next();

        // Inject visible static body block for doctrine pages and homepage
        // The homepage gets a subheading (H2) for richer SEO signal
        const bodyBlock = DOCTRINE_PATHS.has(route.path)
          ? buildStaticBodyBlock({
              title: route.title,
              description: route.description,
              canonicalUrl: finalCanonical,
              subheading: route.path === "/"
                ? "The sovereign creative registry — timestamp, attribute, and protect your works before they touch any other platform"
                : undefined,
            })
          : undefined;

        // Homepage gets Organization + Founder + WebSite JSON-LD for Google entity recognition
        let jsonLd: string | undefined;
        if (route.path === "/") {
          const orgLd = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${CANONICAL_ORIGIN}/#organization`,
                name: "Living Nexus",
                alternateName: ["LN", "Living Nexus Registry", "Living Nexus Creative Provenance Registry"],
                url: CANONICAL_ORIGIN,
                logo: {
                  "@type": "ImageObject",
                  url: FALLBACK_IMAGE,
                  width: 512,
                  height: 512,
                },
                description: "Living Nexus is the sovereign creative registry for independent creators — providing cryptographic Witness ID (WID) provenance infrastructure for music, lyrics, manuscripts, visual works, and all creative output.",
                foundingDate: "2024",
                founder: {
                  "@type": "Person",
                  "@id": `${CANONICAL_ORIGIN}/#founder`,
                  name: "Doc",
                  jobTitle: "Founder & Keeper",
                  url: `${CANONICAL_ORIGIN}/founder`,
                  sameAs: [`${CANONICAL_ORIGIN}/founder`],
                },
                sameAs: [
                  CANONICAL_ORIGIN,
                  "https://livingnexus.manus.space",
                ],
                knowsAbout: [
                  "Creative Provenance",
                  "Witness ID",
                  "Music Attribution",
                  "Digital Rights",
                  "Independent Creator Infrastructure",
                  "AI-era Creative Registry",
                ],
              },
              {
                "@type": "WebSite",
                "@id": `${CANONICAL_ORIGIN}/#website`,
                url: CANONICAL_ORIGIN,
                name: "Living Nexus",
                description: "The sovereign creative provenance registry for independent creators.",
                publisher: { "@id": `${CANONICAL_ORIGIN}/#organization` },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${CANONICAL_ORIGIN}/explore?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ],
          };
          jsonLd = `<script type="application/ld+json">${JSON.stringify(orgLd)}</script>`;
        }

        const page = injectOg(html, ogBlock, route.title, finalCanonical, {
          bodyBlock,
          metaDescription: route.description,
          jsonLd,
        });
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (err) {
        console.error("[OG] Error generating meta tags for", route.path, err);
        next();
      }
    });
  }

  // ── /creator/:id ───────────────────────────────────────────────────────────
  // Creator profile pages are PUBLIC NOMINATION CARDS.
  // When a fan shares a creator URL on X, Discord, iMessage, or any platform,
  // the unfurl shows the creator's banner, avatar, name, bio, genre, WID count,
  // and track count — the link carries the creator's full visual identity and
  // provenance chain of custody.
  // ── /verify/:witnessId ──────────────────────────────────────────────────────────────────────────────
  // Handles both WID-ALB-* (collection) and WID-MUS-* (individual track) verify pages.
  // For WID-ALB- prefixes: query the collection and build a rich collection share card.
  // For WID-MUS- prefixes: fall through to the React SPA (no server-side data needed
  //   beyond what the static /verify OG route already provides).
  app.get("/verify/:witnessId", async (req, res, next) => {
    const witnessId = decodeURIComponent(req.params.witnessId || "").trim();
    if (!witnessId) return next();

    // ── WID-MUS individual track: inject canonical + OG, point Google at /song/:id ──
    if (witnessId.startsWith("WID-MUS-")) {
      try {
        const result = await getSongByWitnessId(witnessId);
        const ogUrl = `${CANONICAL_ORIGIN}/verify/${encodeURIComponent(witnessId)}`;
        let ogBlock: string;
        let pageTitle: string;
        if (result) {
          const { song, creator } = result;
          const artistName =
            (creator as any)?.artistHandle?.trim() ||
            (creator as any)?.name?.trim() ||
            "Unknown Artist";
          pageTitle = `${song.title} — ${artistName} | Living Nexus`;
          const description = `Witness ID verified. "${song.title}" by ${artistName} — cryptographic provenance on Living Nexus. WID: ${witnessId}`;
          const image = (song.coverArtUrl?.trim()) || FALLBACK_IMAGE;
          ogBlock = buildSongOgTags({
            title: pageTitle,
            description,
            image,
            url: ogUrl,
            siteName: "Living Nexus",
            songId: song.id,
          });
        } else {
          pageTitle = `Verify Witness ID | Living Nexus`;
          ogBlock = buildSongOgTags({
            title: pageTitle,
            description: `Look up any Witness ID to verify the origin and provenance of a work on Living Nexus.`,
            image: FALLBACK_IMAGE,
            url: ogUrl,
            siteName: "Living Nexus",
          });
        }
        const html = await getHtmlTemplate(isDev);
        if (!html) return next();
        const page = injectOg(html, ogBlock, pageTitle, ogUrl);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (err) {
        console.error("[OG] Error generating meta tags for WID-MUS", witnessId, err);
        next();
      }
      return;
    }

    // Only handle WID-ALB- collection IDs below — other prefixes fall through
    if (!witnessId.startsWith("WID-ALB-")) return next();

    try {
      const collection = await getCollectionByWid(witnessId);
      if (!collection) return next();

      const creator = await getUserById(collection.creatorId);
      const creatorName =
        (creator as any)?.artistHandle?.trim() ||
        (creator as any)?.name?.trim() ||
        "Unknown Artist";

      const ogTitle = `${collection.name} — ${creatorName} | Living Nexus Collection`;
      const ogDescription = `${collection.trackCount} work${collection.trackCount !== 1 ? "s" : ""} collectively witnessed under one Collection WID. Sovereign Shutter™ — ${witnessId}`;
      const coverArt = (collection as any).coverArtUrl?.trim();
      const ogImage = coverArt && coverArt.length > 0 ? coverArt : FALLBACK_IMAGE;
      const ogUrl = `${CANONICAL_ORIGIN}/verify/${encodeURIComponent(witnessId)}`;

      const ogBlock = buildSongOgTags({
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        url: ogUrl,
        siteName: "Living Nexus",
      });

      const html = await getHtmlTemplate(isDev);
      if (!html) return next();

      const page = injectOg(html, ogBlock, ogTitle, ogUrl);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      console.error("[OG] Error generating meta tags for collection", witnessId, err);
      next();
    }
  });

  // ── /creator/:id ──────────────────────────────────────────────────────────────────────────────
  // Creator profile pages are PUBLIC NOMINATION CARDS.
  // When a fan shares a creator URL on X, Discord, iMessage, or any platform,
  // the unfurl shows the creator's banner, avatar, name, bio, genre, WID count,
  // and track count — the link carries the creator's full visual identity and
  // provenance chain of custody.
  app.get("/creator/:id", async (req, res, next) => {
    const creatorId = parseInt(req.params.id, 10);
    if (isNaN(creatorId)) return next();

    try {
      const result = await getCreatorForOg(creatorId);
      if (!result) return next();

      const { creator, publishedCount, widCount } = result;

      // Prefer stage name (artistHandle) over display name
      const displayName =
        creator.artistHandle?.trim() ||
        creator.name?.trim() ||
        "Unknown Artist";

      // og:title — "Artist Name | Living Nexus Creator"
      const ogTitle = `${displayName} | Living Nexus Creator`;

      // og:description — bio (truncated) + stats line
      const bioSnippet = creator.bio?.trim()
        ? creator.bio.trim().slice(0, 160) + (creator.bio.trim().length > 160 ? "…" : "")
        : null;

      const genrePart = creator.primaryGenre ? ` · ${creator.primaryGenre}` : "";
      const locationPart = creator.location ? ` · ${creator.location}` : "";
      const statsLine = `${publishedCount} track${publishedCount !== 1 ? "s" : ""} · ${widCount} WID Protected${genrePart}${locationPart}`;

      const ogDescription = bioSnippet
        ? `${bioSnippet} — ${statsLine}`
        : `${displayName} on Living Nexus — ${statsLine}`;

      // og:image — prefer banner (wide, ideal for summary_large_image),
      // fall back to profile photo, then platform logo
      const bannerUrl = creator.bannerUrl?.trim();
      const avatarUrl = creator.profilePhotoUrl?.trim();
      const ogImage =
        (bannerUrl && bannerUrl.length > 0 ? bannerUrl : null) ??
        (avatarUrl && avatarUrl.length > 0 ? avatarUrl : null) ??
        FALLBACK_IMAGE;

      // og:url — always canonical production URL
      const ogUrl = `${CANONICAL_ORIGIN}/creator/${creatorId}`;

      const ogBlock = buildCreatorOgTags({
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        url: ogUrl,
        siteName: "Living Nexus",
        twitterHandle: creator.twitterHandle,
      });

      const html = await getHtmlTemplate(isDev);
      if (!html) return next();

      // JSON-LD: schema.org/MusicGroup for creator profiles
      const creatorJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: displayName,
        url: ogUrl,
        ...(creator.bio?.trim() ? { description: creator.bio.trim().slice(0, 500) } : {}),
        ...(ogImage !== FALLBACK_IMAGE ? { image: ogImage } : {}),
        ...(creator.primaryGenre ? { genre: creator.primaryGenre } : {}),
        ...(creator.location ? { foundingLocation: creator.location } : {}),
        ...(publishedCount > 0 ? { numberOfTracks: publishedCount } : {}),
        sameAs: [
          ogUrl,
          ...(creator.twitterHandle ? [`https://twitter.com/${creator.twitterHandle.replace(/^@/, "")}`] : []),
        ],
        publisher: { "@type": "Organization", name: "Living Nexus", url: CANONICAL_ORIGIN },
      });
      // BreadcrumbList: Home > Creator — teaches Google the site hierarchy
      const creatorBreadcrumbLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Living Nexus", item: CANONICAL_ORIGIN },
          { "@type": "ListItem", position: 2, name: displayName, item: ogUrl },
        ],
      });
      const creatorJsonLdBlock =
        `<script type="application/ld+json">${creatorJsonLd}</script>` +
        `\n    <script type="application/ld+json">${creatorBreadcrumbLd}</script>`;

      // Visible body block for crawlers
      const creatorBodyBlock =
        `<div id="ln-witness-record">` +
        `<h1>${escAttr(displayName)}</h1>` +
        (bioSnippet ? `<p>${escAttr(bioSnippet)}</p>` : "") +
        `<p>${publishedCount} track${publishedCount !== 1 ? "s" : ""} · ${widCount} WID Protected</p>` +
        (creator.primaryGenre ? `<p>Genre: ${escAttr(creator.primaryGenre)}</p>` : "") +
        `<p><a href="${escAttr(ogUrl)}">View ${escAttr(displayName)} on Living Nexus</a></p>` +
        `</div>`;

      const page = injectOg(html, ogBlock, ogTitle, ogUrl, {
        bodyBlock: creatorBodyBlock,
        metaDescription: ogDescription,
        jsonLd: creatorJsonLdBlock,
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      console.error("[OG] Error generating meta tags for creator", creatorId, err);
      next();
    }
  });

  // ── /project/:slug ────────────────────────────────────────────────────────
  // Creator project pages — crowdfunding campaigns with WID provenance.
  // Sharing a project URL unfurls the banner, title, tagline, creator name,
  // funding progress, and WID badge.
  app.get("/project/:slug", async (req, res, next) => {
    const slug = req.params.slug?.trim();
    if (!slug) return next();

    try {
      const project = await getProjectBySlug(slug);
      if (!project) return next();

      const creatorName =
        (project as any).creatorHandle?.trim() ||
        (project as any).creatorName?.trim() ||
        "Unknown Creator";

      const ogTitle = `${project.title} — ${creatorName} | Living Nexus Project`;

      const raisedDollars = Math.floor((project.raisedAmountCents || 0) / 100);
      const goalDollars = project.goalAmountCents ? Math.floor(project.goalAmountCents / 100) : null;
      const fundingLine = goalDollars
        ? `$${raisedDollars} raised of $${goalDollars} goal · ${project.donorCount || 0} supporters`
        : `$${raisedDollars} raised · ${project.donorCount || 0} supporters`;
      const widLine = project.linkedWitnessId ? ` · WID: ${project.linkedWitnessId}` : "";
      const taglinePart = project.tagline?.trim() ? `${project.tagline.trim()} — ` : "";
      const ogDescription = `${taglinePart}${fundingLine}${widLine} — Support this project on Living Nexus`;

      const bannerUrl = project.bannerUrl?.trim();
      const ogImage = (bannerUrl && bannerUrl.length > 0 ? bannerUrl : null) ?? FALLBACK_IMAGE;
      const ogUrl = `${CANONICAL_ORIGIN}/project/${slug}`;

      const ogBlock = buildCreatorOgTags({
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        url: ogUrl,
        siteName: "Living Nexus",
      });

      const html = await getHtmlTemplate(isDev);
      if (!html) return next();

      // JSON-LD: schema.org/CreativeWork + FundingScheme for project pages
      const projectJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: project.title,
        description: project.tagline?.trim() || ogDescription,
        url: ogUrl,
        ...(bannerUrl ? { image: bannerUrl } : {}),
        ...(project.linkedWitnessId ? {
          identifier: [{ "@type": "PropertyValue", name: "Witness ID", value: project.linkedWitnessId }],
        } : {}),
        author: {
          "@type": "Person",
          name: creatorName,
          url: (project as any).creatorId ? `${CANONICAL_ORIGIN}/creator/${(project as any).creatorId}` : CANONICAL_ORIGIN,
        },
        publisher: { "@type": "Organization", name: "Living Nexus", url: CANONICAL_ORIGIN },
        datePublished: project.createdAt ? new Date(project.createdAt).toISOString().split("T")[0] : undefined,
      });
      const projectJsonLdBlock = `<script type="application/ld+json">${projectJsonLd}</script>`;

      const projectBodyBlock =
        `<div id="ln-witness-record">` +
        `<h1>${escAttr(project.title)}</h1>` +
        (project.tagline?.trim() ? `<p>${escAttr(project.tagline.trim())}</p>` : "") +
        `<p>${fundingLine}</p>` +
        (project.linkedWitnessId ? `<p>Witness ID: ${escAttr(project.linkedWitnessId)}</p>` : "") +
        `<p>Creator: ${escAttr(creatorName)}</p>` +
        `<p><a href="${escAttr(ogUrl)}">View project on Living Nexus</a></p>` +
        `</div>`;

      const page = injectOg(html, ogBlock, ogTitle, ogUrl, {
        bodyBlock: projectBodyBlock,
        metaDescription: ogDescription,
        jsonLd: projectJsonLdBlock,
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      console.error("[OG] Error generating meta tags for project", slug, err);
      next();
    }
  });

  // ── /collection/:slug ─────────────────────────────────────────────────────
  // Manifested Collection pages — curated sets of works with a WID-COL provenance ID.
  // Exposes MusicAlbum JSON-LD so Google can index collections as album entities.
  app.get("/collection/:slug", async (req, res, next) => {
    const slug = req.params.slug?.trim();
    if (!slug) return next();

    try {
      const row = await getManifestedCollectionBySlug(slug);
      if (!row || !row.collection.isPublic) return next();

      const { collection, owner } = row;
      const creatorName =
        (owner as any)?.artistHandle?.trim() ||
        (owner as any)?.name?.trim() ||
        "Unknown Curator";
      const creatorId = (owner as any)?.id;

      const ogTitle = `${collection.name} — ${creatorName} | Living Nexus Collection`;
      const descParts: string[] = [];
      if (collection.description?.trim()) descParts.push(collection.description.trim().slice(0, 120));
      descParts.push(`${collection.trackCount} work${collection.trackCount !== 1 ? "s" : ""} · ${collection.followerCount} follower${collection.followerCount !== 1 ? "s" : ""}`);
      if (collection.wid) descParts.push(`WID: ${collection.wid}`);
      const ogDescription = descParts.join(" — ");

      const coverArt = collection.coverArtUrl?.trim();
      const ogImage = (coverArt && coverArt.length > 0 ? coverArt : null) ?? FALLBACK_IMAGE;
      const ogUrl = `${CANONICAL_ORIGIN}/collection/${slug}`;
      const creatorUrl = creatorId ? `${CANONICAL_ORIGIN}/creator/${creatorId}` : CANONICAL_ORIGIN;

      const ogBlock = buildCreatorOgTags({
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        url: ogUrl,
        siteName: "Living Nexus",
      });

      const html = await getHtmlTemplate(isDev);
      if (!html) return next();

      // JSON-LD: schema.org/MusicAlbum for collection pages
      const collectionJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "MusicAlbum",
        name: collection.name,
        url: ogUrl,
        ...(collection.description?.trim() ? { description: collection.description.trim().slice(0, 500) } : {}),
        ...(ogImage !== FALLBACK_IMAGE ? { image: ogImage } : {}),
        numTracks: collection.trackCount,
        byArtist: {
          "@type": "MusicGroup",
          name: creatorName,
          url: creatorUrl,
        },
        ...(collection.wid ? {
          identifier: [{ "@type": "PropertyValue", name: "Collection Witness ID", value: collection.wid }],
        } : {}),
        ...(collection.forkedFromWid ? {
          isBasedOn: { "@type": "MusicAlbum", identifier: collection.forkedFromWid },
        } : {}),
        datePublished: new Date(collection.createdAt).toISOString().split("T")[0],
        publisher: { "@type": "Organization", name: "Living Nexus", url: CANONICAL_ORIGIN },
      });
      const collectionJsonLdBlock = `<script type="application/ld+json">${collectionJsonLd}</script>`;

      const collectionBodyBlock =
        `<div id="ln-witness-record">` +
        `<h1>${escAttr(collection.name)}</h1>` +
        (collection.description?.trim() ? `<p>${escAttr(collection.description.trim().slice(0, 300))}</p>` : "") +
        `<p>${collection.trackCount} work${collection.trackCount !== 1 ? "s" : ""} · curated by ${escAttr(creatorName)}</p>` +
        (collection.wid ? `<p>Collection Witness ID: ${escAttr(collection.wid)}</p>` : "") +
        `<p><a href="${escAttr(creatorUrl)}">View curator on Living Nexus</a></p>` +
        `<p><a href="${escAttr(ogUrl)}">View collection on Living Nexus</a></p>` +
        `</div>`;

      const page = injectOg(html, ogBlock, ogTitle, ogUrl, {
        bodyBlock: collectionBodyBlock,
        metaDescription: ogDescription,
        jsonLd: collectionJsonLdBlock,
      });
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      console.error("[OG] Error generating meta tags for collection", slug, err);
      next();
    }
  });
}
