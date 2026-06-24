/**
 * oEmbed API endpoint — /api/oembed
 *
 * Discord (and other platforms) support oEmbed discovery. When a URL is pasted,
 * Discord reads the page HTML for a <link rel="alternate" type="application/json+oembed">
 * discovery tag, then fetches that endpoint to get rich embed metadata.
 *
 * This endpoint is served under /api/* which the Manus Cloudflare CDN forwards
 * directly to the Express server — bypassing the CDN's static OG tag override.
 *
 * oEmbed spec: https://oembed.com/
 * Discord oEmbed support: Discord reads the "rich" type response and uses
 * title, author_name, thumbnail_url, and the html field for inline players.
 */

import { Router } from "express";
import { getSongWithCreator, getCreatorForOg, getProjectBySlug } from "../utils/db";

const CANONICAL_ORIGIN = "https://www.livingnexus.org";
const FALLBACK_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

export const oembedRouter = Router();

/**
 * GET /api/oembed?url=https://www.livingnexus.org/song/123
 *
 * Returns an oEmbed JSON response for the given URL.
 * Discord reads this after discovering the endpoint via the <link> tag in index.html.
 */
oembedRouter.get("/api/oembed", async (req, res) => {
  const url = req.query.url as string;
  const wid = req.query.wid as string;

  // Support both ?wid=WID-XXX (PDL share surface) and ?url=https://... (legacy)
  if (!url && !wid) {
    return res.status(400).json({ error: "url or wid parameter required" });
  }

  // If wid= is provided directly, look up the song by WID
  if (wid) {
    try {
      const { getSongByWitnessId } = await import("../utils/db");
      const songResult = await getSongByWitnessId(wid);

      if (!songResult) {
        return res.status(404).json({ error: "WID not found" });
      }

      const { song, creator } = songResult;
      const artistName =
        (creator as any)?.artistHandle?.trim() ||
        (creator as any)?.name?.trim() ||
        "Unknown Artist";

      const title = `${song.title} \u2014 ${artistName}`;
      const genrePart = (song as any).genre ? ` \u00b7 ${(song as any).genre}` : "";
      const description = `\uD83C\uDFB5 ${song.title} by ${artistName}${genrePart} \u00b7 WID: ${wid} \u2014 Listen on Living Nexus`;

      const coverArt = (song as any).coverArtUrl?.trim();
      const thumbnailUrl = coverArt && coverArt.length > 0 ? coverArt : FALLBACK_IMAGE;
      const embedIframeUrl = `${CANONICAL_ORIGIN}/embed/song/${song.id}`;
      const songUrl = `${CANONICAL_ORIGIN}/song/${song.id}`;
      const shareUrl = `${CANONICAL_ORIGIN}/share/${encodeURIComponent(wid)}`;

      const response = {
        version: "1.0",
        type: "rich",
        title,
        author_name: artistName,
        author_url: `${CANONICAL_ORIGIN}/creator/${(creator as any)?.id || ""}`,
        provider_name: "Living Nexus",
        provider_url: CANONICAL_ORIGIN,
        thumbnail_url: thumbnailUrl,
        thumbnail_width: 1200,
        thumbnail_height: 630,
        url: shareUrl,
        description,
        html: `<iframe width="480" height="270" src="${embedIframeUrl}" frameborder="0" allowfullscreen allow="autoplay"></iframe>`,
        width: 480,
        height: 270,
      };

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json+oembed");
      return res.json(response);
    } catch (err) {
      console.error("[oEmbed] WID lookup error:", err);
      return res.status(500).json({ error: "internal server error" });
    }
  }

  try {
    // Parse the URL to determine what type of page it is
    let urlPath: string;
    try {
      const parsed = new URL(url);
      urlPath = parsed.pathname;
    } catch {
      return res.status(400).json({ error: "invalid url" });
    }

    // ── Song page: /song/:id ────────────────────────────────────────────────
    const songMatch = urlPath.match(/^\/song\/(\d+)/);
    if (songMatch) {
      const songId = parseInt(songMatch[1], 10);
      const result = await getSongWithCreator(songId);

      if (!result) {
        return res.status(404).json({ error: "song not found" });
      }

      const { song, creator } = result;
      const artistName =
        (creator as any)?.artistHandle?.trim() ||
        (creator as any)?.name?.trim() ||
        "Unknown Artist";

      const title = `${song.title} — ${artistName}`;
      const genrePart = (song as any).genre ? ` · ${(song as any).genre}` : "";
      const widPart = (song as any).witnessId ? ` · WID: ${(song as any).witnessId}` : "";
      const description = `🎵 ${song.title} by ${artistName}${genrePart}${widPart} — Listen on Living Nexus`;

      const coverArt = (song as any).coverArtUrl?.trim();
      const thumbnailUrl = coverArt && coverArt.length > 0 ? coverArt : FALLBACK_IMAGE;

      const embedVideoUrl = (song as any).embedVideoUrl?.trim() || null;
      const audioUrl = (song as any).fileUrl?.trim() || null;
      const songUrl = `${CANONICAL_ORIGIN}/song/${songId}`;
      const embedIframeUrl = `${CANONICAL_ORIGIN}/embed/song/${songId}`;

      // Build the oEmbed response
      // Discord uses "rich" type with html field for inline players
      // The html field contains an iframe that Discord renders inline
      const response: Record<string, unknown> = {
        version: "1.0",
        type: "rich",
        title,
        author_name: artistName,
        author_url: `${CANONICAL_ORIGIN}/creator/${(creator as any)?.id || ""}`,
        provider_name: "Living Nexus",
        provider_url: CANONICAL_ORIGIN,
        thumbnail_url: thumbnailUrl,
        thumbnail_width: 1200,
        thumbnail_height: 630,
        url: songUrl,
        description,
        // The iframe embed — Discord renders this inline if the domain is trusted
        // Even without whitelist, Discord shows the thumbnail + title from oEmbed
        html: `<iframe width="480" height="270" src="${embedIframeUrl}" frameborder="0" allowfullscreen allow="autoplay"></iframe>`,
        width: 480,
        height: 270,
      };

      // Set CORS headers so Discord can fetch this from any origin
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json+oembed");
      return res.json(response);
    }

    // ── Creator page: /creator/:id ──────────────────────────────────────────
    const creatorMatch = urlPath.match(/^\/creator\/(\d+)/);
    if (creatorMatch) {
      const creatorId = parseInt(creatorMatch[1], 10);
      const result = await getCreatorForOg(creatorId);

      if (!result) {
        return res.status(404).json({ error: "creator not found" });
      }

      const { creator, publishedCount, widCount } = result;
      const displayName =
        creator.artistHandle?.trim() || creator.name?.trim() || "Unknown Artist";

      const bannerUrl = creator.bannerUrl?.trim();
      const avatarUrl = creator.profilePhotoUrl?.trim();
      const thumbnailUrl =
        (bannerUrl && bannerUrl.length > 0 ? bannerUrl : null) ??
        (avatarUrl && avatarUrl.length > 0 ? avatarUrl : null) ??
        FALLBACK_IMAGE;

      const bioSnippet = creator.bio?.trim()
        ? creator.bio.trim().slice(0, 160)
        : `${publishedCount} tracks · ${widCount} WID Protected`;

      const response = {
        version: "1.0",
        type: "rich",
        title: `${displayName} | Living Nexus Creator`,
        author_name: displayName,
        author_url: `${CANONICAL_ORIGIN}/creator/${creatorId}`,
        provider_name: "Living Nexus",
        provider_url: CANONICAL_ORIGIN,
        thumbnail_url: thumbnailUrl,
        thumbnail_width: 1200,
        thumbnail_height: 630,
        url: `${CANONICAL_ORIGIN}/creator/${creatorId}`,
        description: bioSnippet,
      };

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json+oembed");
      return res.json(response);
    }

    // ── Project page: /project/:slug ─────────────────────────────────────
    const projectMatch = urlPath.match(/^\/project\/([^/]+)/);
    if (projectMatch) {
      const slug = decodeURIComponent(projectMatch[1]);
      const project = await getProjectBySlug(slug);

      if (!project) {
        return res.status(404).json({ error: "project not found" });
      }

      const creatorName =
        (project as any).creatorHandle?.trim() ||
        (project as any).creatorName?.trim() ||
        "Unknown Creator";

      const raisedDollars = Math.floor(((project as any).raisedAmountCents || 0) / 100);
      const goalDollars = (project as any).goalAmountCents
        ? Math.floor((project as any).goalAmountCents / 100)
        : null;
      const fundingLine = goalDollars
        ? `$${raisedDollars} raised of $${goalDollars} goal · ${
            (project as any).donorCount || 0
          } supporters`
        : `$${raisedDollars} raised · ${(project as any).donorCount || 0} supporters`;
      const taglinePart = (project as any).tagline?.trim()
        ? `${(project as any).tagline.trim()} — `
        : "";
      const description = `${taglinePart}${fundingLine} — Support this project on Living Nexus`;

      const bannerUrl = (project as any).bannerUrl?.trim();
      const thumbnailUrl =
        bannerUrl && bannerUrl.length > 0 ? bannerUrl : FALLBACK_IMAGE;

      const projectUrl = `${CANONICAL_ORIGIN}/project/${slug}`;
      const creatorId = (project as any).creatorId || "";

      const response = {
        version: "1.0",
        type: "rich",
        title: `${project.title} — ${creatorName} | Living Nexus Project`,
        author_name: creatorName,
        author_url: `${CANONICAL_ORIGIN}/creator/${creatorId}`,
        provider_name: "Living Nexus",
        provider_url: CANONICAL_ORIGIN,
        thumbnail_url: thumbnailUrl,
        thumbnail_width: 1200,
        thumbnail_height: 630,
        url: projectUrl,
        description,
      };

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json+oembed");
      return res.json(response);
    }

    // ── Fallback: generic site response ────────────────────────────────────
    const fallback = {
      version: "1.0",
      type: "rich",
      title: "Living Nexus — Sovereign Music Platform",
      author_name: "Living Nexus",
      provider_name: "Living Nexus",
      provider_url: CANONICAL_ORIGIN,
      thumbnail_url: FALLBACK_IMAGE,
      thumbnail_width: 1200,
      thumbnail_height: 630,
      url: CANONICAL_ORIGIN,
    };

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json+oembed");
    return res.json(fallback);
  } catch (err) {
    console.error("[oEmbed] Error:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});
