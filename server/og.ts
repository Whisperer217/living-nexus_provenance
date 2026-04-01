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
import { getSongWithCreator, getCreatorForOg, getCollectionByWid, getUserById } from "./db";
import { getOrGenerateEmbedVideo } from "./embedVideo";

/** Canonical production origin — always use this for og:url */
const CANONICAL_ORIGIN = "https://www.livingnexus.org";

/** Fallback cover art (platform logo) when a song/creator has no image */
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
      "..",
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

      const coverArt = (song as any).coverArtUrl?.trim();
      const ogImage = coverArt && coverArt.length > 0 ? coverArt : FALLBACK_IMAGE;
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

      const page = injectOg(html, ogBlock, ogTitle);
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
      path: "/together",
      title: "Listen Together — Living Nexus Sanctuary",
      description: "Host or join a live music sanctuary. Queue songs, tip creators, and vibe in real-time with your community.",
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
      title: "Living Nexus — Sovereign Music Platform",
      description: "A platform that honors your work. Your lived witness. Your testimony. Every song carries a Witness ID — proof of origin that belongs to you before it belongs to anyone else.",
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

  for (const route of STATIC_OG_ROUTES) {
    app.get(route.path, async (req, res, next) => {
      const ua = req.headers["user-agent"] || "";
      if (!isCrawler(ua)) return next();
      try {
        const ogBlock = buildSongOgTags({
          title: route.title,
          description: route.description,
          image: route.image || FALLBACK_IMAGE,
          url: `${CANONICAL_ORIGIN}${route.path}`,
          siteName: "Living Nexus",
        });
        const html = await getHtmlTemplate(isDev);
        if (!html) return next();
        const page = injectOg(html, ogBlock, route.title);
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

    // Only handle WID-ALB- collection IDs here — individual WIDs fall through
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

      const page = injectOg(html, ogBlock, ogTitle);
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

      const page = injectOg(html, ogBlock, ogTitle);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (err) {
      console.error("[OG] Error generating meta tags for creator", creatorId, err);
      next();
    }
  });
}
