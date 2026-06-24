/**
 * Living Nexus — Public REST API v1
 * ==================================
 * Plex / Jellyfin / external client integration layer.
 * All endpoints are public (no auth required) unless noted.
 *
 * Base path: /api/v1
 *
 * Endpoints:
 *   GET /api/v1/catalog          — paginated public track listing
 *   GET /api/v1/track/:id        — single track detail
 *   GET /api/v1/stream/:id       — presigned stream URL (redirect)
 *   GET /api/v1/verify/:witnessId — WID verification
 *   GET /api/v1/creator/:id      — creator profile
 *   GET /api/v1/plex/manifest    — static Plex channel manifest (XML)
 *   GET /api/v1/health           — health check
 *
 * Rate limiting: 100 requests / minute per IP (in-memory, resets on restart)
 *
 * Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework
 */

import { Router, Request, Response, NextFunction } from "express";
import { getPublicSongs, getSongWithCreator, getUserById, getDb } from "../utils/db";

export const publicApiRouter = Router();

// ── Simple in-memory rate limiter (100 req/min per IP) ───────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const window = 60_000; // 1 minute
  const limit = 100;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + window });
    return next();
  }
  entry.count++;
  if (entry.count > limit) {
    res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
    res.status(429).json({ error: "Rate limit exceeded. Max 100 requests per minute." });
    return;
  }
  next();
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, ip) => {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  });
}, 5 * 60_000);

// Apply rate limiting to all /api/v1 routes
publicApiRouter.use("/api/v1", rateLimit);

// ── CORS headers for external clients ────────────────────────────────────────
publicApiRouter.use("/api/v1", (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  next();
});

// ── Health Check ──────────────────────────────────────────────────────────────
publicApiRouter.get("/api/v1/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    platform: "Living Nexus",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    doctrine: "Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework",
  });
});

// ── Catalog ───────────────────────────────────────────────────────────────────
// GET /api/v1/catalog?genre=&search=&limit=50&offset=0
publicApiRouter.get("/api/v1/catalog", async (req: Request, res: Response) => {
  try {
    const genre = req.query.genre as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string || "50", 10), 200);
    const offset = parseInt(req.query.offset as string || "0", 10);

    const songs = await getPublicSongs({ genre, search, limit: limit + offset });
    const paginated = songs.slice(offset, offset + limit);

    res.json({
      total: songs.length,
      limit,
      offset,
      tracks: paginated.map(({ song, creator }: { song: any; creator: any }) => ({
        id: song.id,
        title: song.title,
        artist: creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name ?? "Unknown"),
        artistId: creator?.id,
        genre: song.genre,
        albumName: song.albumName,
        bpm: song.bpm,
        keySignature: song.keySignature,
        moodTags: song.moodTags,
        durationSeconds: song.durationSeconds,
        playCount: song.playCount,
        coverArtUrl: song.coverArtUrl,
        witnessId: song.witnessId,
        aiConsent: song.aiConsent,
        createdAt: song.createdAt,
        streamUrl: `/api/v1/stream/${song.id}`,
        detailUrl: `/api/v1/track/${song.id}`,
        verifyUrl: song.witnessId ? `/api/v1/verify/${song.witnessId}` : null,
      })),
    });
  } catch (err) {
    console.error("[API] /catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Single Track ──────────────────────────────────────────────────────────────
// GET /api/v1/track/:id
publicApiRouter.get("/api/v1/track/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid track ID" }); return; }

    const record = await getSongWithCreator(id);
    if (!record) { res.status(404).json({ error: "Track not found" }); return; }

    const { song, creator } = record;
    res.json({
      id: song.id,
      title: song.title,
      artist: creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name ?? "Unknown"),
      artistId: creator?.id,
      genre: song.genre,
      albumName: song.albumName,
      bpm: song.bpm,
      keySignature: song.keySignature,
      moodTags: song.moodTags,
      durationSeconds: song.durationSeconds,
      playCount: song.playCount,
      coverArtUrl: song.coverArtUrl,
      witnessId: song.witnessId,
      aiConsent: song.aiConsent,
      lyricsText: song.lyricsText,
      isrc: song.isrc,
      createdAt: song.createdAt,
      streamUrl: `/api/v1/stream/${song.id}`,
      downloadPermission: song.downloadPermission,
      verifyUrl: song.witnessId ? `/api/v1/verify/${song.witnessId}` : null,
      widTaggedDownloadUrl: song.downloadPermission === "free" ? `/api/download/${song.id}` : null,
    });
  } catch (err) {
    console.error("[API] /track error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Stream (redirect to S3 URL) ───────────────────────────────────────────────
// GET /api/v1/stream/:id
// Redirects to the S3 audio URL for direct streaming by Plex/Jellyfin
publicApiRouter.get("/api/v1/stream/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid track ID" }); return; }

    const record = await getSongWithCreator(id);
    if (!record?.song?.fileUrl) { res.status(404).json({ error: "Track not found" }); return; }

    // Redirect to S3 URL — Plex/Jellyfin will follow the redirect and stream directly
    res.redirect(302, record.song.fileUrl);
  } catch (err) {
    console.error("[API] /stream error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── WID Verification ──────────────────────────────────────────────────────────
// GET /api/v1/verify/:witnessId
publicApiRouter.get("/api/v1/verify/:witnessId", async (req: Request, res: Response) => {
  try {
    const { witnessId } = req.params;
    if (!witnessId) { res.status(400).json({ error: "Missing witnessId" }); return; }

    const database = await getDb();
    if (!database) { res.status(503).json({ error: "Database unavailable" }); return; }

    const { songs, users } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const result = await database.select({
      song: songs,
      creator: { id: users.id, name: users.name, artistHandle: users.artistHandle },
    }).from(songs)
      .leftJoin(users, eq(songs.userId, users.id))
      .where(eq(songs.witnessId, witnessId))
      .limit(1);

    if (!result.length) {
      res.status(404).json({
        verified: false,
        witnessId,
        error: "No track found with this Witness ID",
      });
      return;
    }

    const { song, creator } = result[0];
    res.json({
      verified: true,
      witnessId,
      track: {
        id: song.id,
        title: song.title,
        artist: creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name ?? "Unknown"),
        genre: song.genre,
        createdAt: song.createdAt,
        coverArtUrl: song.coverArtUrl,
        aiConsent: song.aiConsent,
        platform: "Living Nexus — Sovereign Music",
        doctrine: "Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework",
      },
    });
  } catch (err) {
    console.error("[API] /verify error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Creator Profile ───────────────────────────────────────────────────────────
// GET /api/v1/creator/:id
publicApiRouter.get("/api/v1/creator/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid creator ID" }); return; }

    const user = await getUserById(id);
    if (!user) { res.status(404).json({ error: "Creator not found" }); return; }

    const songs = await getPublicSongs({ limit: 200 });
    const creatorSongs = songs.filter((s: { song: any; creator: any }) => s.creator?.id === id);

    res.json({
      id: user.id,
      name: user.name,
      artistHandle: user.artistHandle,
      profilePhotoUrl: user.profilePhotoUrl,
      primaryGenre: user.primaryGenre,
      aiDisclosure: user.aiDisclosure,
      trackCount: creatorSongs.length,
      tracks: creatorSongs.map(({ song }: { song: any }) => ({
        id: song.id,
        title: song.title,
        genre: song.genre,
        coverArtUrl: song.coverArtUrl,
        witnessId: song.witnessId,
        durationSeconds: song.durationSeconds,
        streamUrl: `/api/v1/stream/${song.id}`,
      })),
    });
  } catch (err) {
    console.error("[API] /creator error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Plex Channel Manifest ─────────────────────────────────────────────────────
// GET /api/v1/plex/manifest
// Returns a static XML manifest for Plex Media Server channel plugin
publicApiRouter.get("/api/v1/plex/manifest", (_req: Request, res: Response) => {
  const baseUrl = "https://www.livingnexus.org";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MediaContainer size="1" title1="Living Nexus" title2="Sovereign Music Platform">
  <Channel
    key="/api/v1/catalog"
    title="Living Nexus"
    summary="Sovereign music platform. Every track carries a Witness ID — cryptographic proof of origin. Command Domains LLC · BDDT Publishing."
    art="${baseUrl}/plex-art.jpg"
    thumb="${baseUrl}/plex-thumb.jpg"
    type="music"
    hasPrefs="0"
    pluginIdentifier="com.livingnexus.plex"
    identifier="com.livingnexus.plex"
    mediaTagVersion="1"
    allowSync="1"
    apiUrl="${baseUrl}/api/v1"
    catalogUrl="${baseUrl}/api/v1/catalog"
    streamUrlTemplate="${baseUrl}/api/v1/stream/{id}"
    verifyUrlTemplate="${baseUrl}/api/v1/verify/{witnessId}"
  />
</MediaContainer>`;

  res.setHeader("Content-Type", "application/xml");
  res.send(xml);
});

// ── Jellyfin / Navidrome compatible metadata endpoint ────────────────────────
// GET /api/v1/jellyfin/catalog
// Returns catalog in a format compatible with Jellyfin's music library import
publicApiRouter.get("/api/v1/jellyfin/catalog", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || "100", 10), 500);
    const songs = await getPublicSongs({ limit });

    res.json({
      Items: songs.map(({ song, creator }: { song: any; creator: any }) => ({
        Id: `ln-${song.id}`,
        Name: song.title,
        Type: "Audio",
        Artists: [creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name ?? "Unknown")],
        Album: song.albumName || "Living Nexus",
        Genres: song.genre ? [song.genre] : [],
        RunTimeTicks: song.durationSeconds ? song.durationSeconds * 10_000_000 : null,
        ImageTags: song.coverArtUrl ? { Primary: song.coverArtUrl } : {},
        MediaSources: [{
          Id: `ln-stream-${song.id}`,
          Type: "Default",
          Path: `/api/v1/stream/${song.id}`,
          Protocol: "Http",
          Container: "mp3",
          IsRemote: true,
        }],
        ProviderIds: {
          LivingNexusWID: song.witnessId || "",
          LivingNexusId: song.id.toString(),
        },
        ExtraData: {
          witnessId: song.witnessId,
          aiConsent: song.aiConsent,
          verifyUrl: song.witnessId ? `/api/v1/verify/${song.witnessId}` : null,
          doctrine: "Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework",
        },
      })),
      TotalRecordCount: songs.length,
      StartIndex: 0,
    });
  } catch (err) {
    console.error("[API] /jellyfin/catalog error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE REGISTRATION API  (key-authenticated)
// ═══════════════════════════════════════════════════════════════════════════════
import { validateApiKey, registerWorkViaApi } from "../utils/db";

// CORS: allow POST and Authorization header for the registration endpoints
publicApiRouter.use("/api/v1/works", (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") { res.status(204).end(); return; }
  next();
});

/** Middleware: extract and validate Bearer API key. */
async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] ?? "";
  const rawKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!rawKey) {
    res.status(401).json({ error: "Missing API key. Pass Authorization: Bearer ln_..." });
    return;
  }
  const keyRecord = await validateApiKey(rawKey);
  if (!keyRecord) {
    res.status(401).json({ error: "Invalid or revoked API key, or daily rate limit exceeded." });
    return;
  }
  (req as any).apiKeyUserId = keyRecord.userId;
  (req as any).apiKeyTier = keyRecord.tier;
  next();
}

// ── POST /api/v1/works/register ───────────────────────────────────────────────
/**
 * Register a creative work and receive a WID (Work Identity Document).
 *
 * Body (JSON):
 *   title        string  required
 *   contentType  "audio" | "lyrics" | "manuscript" | "comic" | "image"  required
 *   fileUrl      string  optional — S3/CDN URL of the primary file
 *   coverArtUrl  string  optional
 *   description  string  optional
 *   aiDisclosure "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument"
 *   externalId   string  optional — your tool's internal ID (for deduplication)
 *   metadata     object  optional — arbitrary key/value pairs (stored, not indexed)
 *
 * Returns:
 *   { wid, songId, registeredAt, verifyUrl, provenanceUrl }
 */
publicApiRouter.post("/api/v1/works/register", requireApiKey, async (req: Request, res: Response) => {
  try {
    const { title, contentType, fileUrl, coverArtUrl, description, aiDisclosure, externalId, metadata } = req.body ?? {};

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      res.status(400).json({ error: "title is required" }); return;
    }
    const validTypes = ["audio", "lyrics", "manuscript", "comic", "image"];
    if (!contentType || !validTypes.includes(contentType)) {
      res.status(400).json({ error: `contentType must be one of: ${validTypes.join(", ")}` }); return;
    }

    const userId = (req as any).apiKeyUserId as number;
    const result = await registerWorkViaApi({
      userId,
      title: title.trim(),
      contentType,
      fileUrl: typeof fileUrl === "string" ? fileUrl : undefined,
      coverArtUrl: typeof coverArtUrl === "string" ? coverArtUrl : undefined,
      description: typeof description === "string" ? description : undefined,
      aiDisclosure: aiDisclosure ?? "original",
      externalId: typeof externalId === "string" ? externalId : undefined,
      metadata: typeof metadata === "object" ? metadata : undefined,
    });

    const base = "https://www.livingnexus.org";
    res.status(201).json({
      wid: result.wid,
      songId: result.songId,
      registeredAt: result.registeredAt,
      verifyUrl: `${base}/api/v1/verify/${result.wid}`,
      provenanceUrl: `${base}/verify/${result.wid}`,
      badge: {
        label: "Registered on Living Nexus",
        widShort: result.wid.slice(-9),
        badgeUrl: `${base}/api/v1/badge/${result.wid}`,
      },
      platform: "Living Nexus — Provenance Engine",
      doctrine: "Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework",
    });
  } catch (err) {
    console.error("[API] /works/register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/v1/works/:wid ────────────────────────────────────────────────────
/**
 * Look up a registered work by its WID.
 * Public endpoint — no API key required.
 */
publicApiRouter.get("/api/v1/works/:wid", async (req: Request, res: Response) => {
  try {
    const { wid } = req.params;
    if (!wid || !wid.startsWith("WID-")) {
      res.status(400).json({ error: "Invalid WID format. Expected WID-XXX-XXXXXXXX-XXXXXXXX" }); return;
    }

    const database = await (await import("../utils/db")).getDb();
    if (!database) { res.status(503).json({ error: "Database unavailable" }); return; }

    const { songs, users } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const result = await database
      .select({
        song: songs,
        creator: {
          id: users.id,
          name: users.name,
          artistHandle: users.artistHandle,
          profilePhotoUrl: users.profilePhotoUrl,
        },
      })
      .from(songs)
      .leftJoin(users, eq(songs.userId, users.id))
      .where(eq(songs.witnessId, wid))
      .limit(1);

    if (!result.length) {
      res.status(404).json({ verified: false, wid, error: "No work found with this WID" }); return;
    }

    const { song, creator } = result[0];
    res.json({
      verified: true,
      wid,
      work: {
        id: song.id,
        title: song.title,
        contentType: song.contentType,
        artist: creator?.artistHandle ? `@${creator.artistHandle}` : (creator?.name ?? "Unknown"),
        artistId: creator?.id,
        genre: (song as any).genre,
        coverArtUrl: song.coverArtUrl,
        fileUrl: (song as any).downloadPermission === "free" ? (song as any).fileUrl : undefined,
        aiDisclosure: song.aiDisclosure,
        registeredAt: song.createdAt,
        streamUrl: `/api/v1/stream/${song.id}`,
        verifyUrl: `https://www.livingnexus.org/verify/${wid}`,
      },
      platform: "Living Nexus — Provenance Engine",
      doctrine: "Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework",
    });
  } catch (err) {
    console.error("[API] /works/:wid error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/v1/creator/:handle/works ────────────────────────────────────────
/**
 * List all registered works for a creator by their @handle.
 * Public endpoint — no API key required.
 * Query params: limit (max 100), offset, contentType
 */
publicApiRouter.get("/api/v1/creator/:handle/works", async (req: Request, res: Response) => {
  try {
    const { handle } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string || "50", 10), 100);
    const offset = parseInt(req.query.offset as string || "0", 10);
    const contentTypeFilter = req.query.contentType as string | undefined;

    const database = await (await import("../utils/db")).getDb();
    if (!database) { res.status(503).json({ error: "Database unavailable" }); return; }

    const { songs, users } = await import("../../drizzle/schema");
    const { eq, and, isNotNull } = await import("drizzle-orm");

    // Find creator by handle
    const creatorRows = await database
      .select({ id: users.id, name: users.name, artistHandle: users.artistHandle, profilePhotoUrl: users.profilePhotoUrl })
      .from(users)
      .where(eq(users.artistHandle, handle))
      .limit(1);

    if (!creatorRows.length) {
      res.status(404).json({ error: `Creator @${handle} not found` }); return;
    }
    const creator = creatorRows[0];

    // Build where clause
    const conditions: any[] = [
      eq(songs.userId, creator.id),
      eq(songs.status, "Published" as any),
      eq(songs.isPublic, true),
      isNotNull(songs.witnessId),
    ];
    if (contentTypeFilter) {
      conditions.push(eq(songs.contentType, contentTypeFilter as any));
    }

    const works = await database
      .select({
        id: songs.id,
        title: songs.title,
        contentType: songs.contentType,
        witnessId: songs.witnessId,
        coverArtUrl: songs.coverArtUrl,
        aiDisclosure: songs.aiDisclosure,
        createdAt: songs.createdAt,
      })
      .from(songs)
      .where(and(...conditions))
      .orderBy(songs.createdAt)
      .limit(limit)
      .offset(offset);

    res.json({
      creator: {
        id: creator.id,
        handle: `@${creator.artistHandle}`,
        name: creator.name,
        profilePhotoUrl: creator.profilePhotoUrl,
      },
      total: works.length,
      limit,
      offset,
      works: works.map((w: any) => ({
        id: w.id,
        title: w.title,
        contentType: w.contentType,
        wid: w.witnessId,
        coverArtUrl: w.coverArtUrl,
        aiDisclosure: w.aiDisclosure,
        registeredAt: w.createdAt,
        verifyUrl: w.witnessId ? `https://www.livingnexus.org/verify/${w.witnessId}` : null,
        widLookupUrl: w.witnessId ? `/api/v1/works/${w.witnessId}` : null,
      })),
      platform: "Living Nexus — Provenance Engine",
    });
  } catch (err) {
    console.error("[API] /creator/:handle/works error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/v1/badge/:wid ────────────────────────────────────────────────────
/**
 * Returns an SVG badge for embedding in third-party tools.
 * "Registered on Living Nexus · WID-MUS-XXXXXXXX"
 */
publicApiRouter.get("/api/v1/badge/:wid", (req: Request, res: Response) => {
  const { wid } = req.params;
  const widShort = wid?.slice(-9) ?? "UNKNOWN";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="20">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <rect rx="3" width="220" height="20" fill="#555"/>
  <rect rx="3" x="140" width="80" height="20" fill="#c8a84b"/>
  <rect rx="3" width="220" height="20" fill="url(#s)"/>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="70" y="15" fill="#010101" fill-opacity=".3">Living Nexus</text>
    <text x="70" y="14">Living Nexus</text>
    <text x="180" y="15" fill="#010101" fill-opacity=".3">${widShort}</text>
    <text x="180" y="14">${widShort}</text>
  </g>
</svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(svg);
});


// ── GET /api/v1/wid/:wid — Canonical provenance record ───────────────────────
/**
 * Single canonical lookup endpoint. Returns the full provenance record for a WID.
 * Used by Custom GPTs, MCP servers, and connector integrations.
 */
publicApiRouter.get("/api/v1/wid/:wid", async (req: Request, res: Response) => {
  try {
    const { wid } = req.params;
    if (!wid) { res.status(400).json({ error: "Missing WID" }); return; }

    const database = await getDb();
    if (!database) { res.status(503).json({ error: "Database unavailable" }); return; }

    const { songs, users } = await import("../../drizzle/schema");
    const { eq, or } = await import("drizzle-orm");

    // Accept both witnessId (WID-MUS-...) and numeric song id
    const isNumeric = /^\d+$/.test(wid);
    const condition = isNumeric
      ? eq(songs.id, parseInt(wid, 10))
      : or(eq(songs.witnessId, wid), eq(songs.witnessId, wid.toUpperCase()));

    const result = await database.select({
      song: songs,
      creator: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
    }).from(songs)
      .leftJoin(users, eq(songs.userId, users.id))
      .where(condition!)
      .limit(1);

    if (!result.length) {
      res.status(404).json({
        status: "not_found",
        wid,
        error: "No work found with this identifier",
      });
      return;
    }

    const { song, creator } = result[0];
    const base = `${req.protocol}://${req.get("host")}`;

    res.json({
      wid: song.witnessId ?? null,
      status: "active",
      verificationStatus: song.witnessId ? "verified" : "unverified",
      creator: {
        id: creator?.id,
        name: creator?.name ?? "Unknown",
        handle: creator?.artistHandle ? `@${creator.artistHandle}` : null,
        avatarUrl: creator?.profilePhotoUrl ?? null,
        profileUrl: creator?.artistHandle ? `${base}/creator/${creator.artistHandle}` : null,
      },
      work: {
        id: song.id,
        title: song.title,
        contentType: song.contentType ?? "audio",
        genre: song.genre ?? null,
        status: song.status ?? null,
        coverArtUrl: song.coverArtUrl ?? null,
        fileUrl: song.fileUrl ?? null,
        aiDisclosure: song.aiConsent ?? null,
      },
      provenance: {
        registeredAt: song.createdAt,
        platform: "Living Nexus",
        doctrine: "Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework",
        badgeUrl: song.witnessId ? `${base}/api/v1/badge/${song.witnessId}` : null,
        verifyUrl: song.witnessId ? `${base}/api/v1/verify/${song.witnessId}` : null,
      },
    });
  } catch (err) {
    console.error("[API] /wid error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/v1/search — Registry search ─────────────────────────────────────
/**
 * Search the Living Nexus registry by title, creator handle, or genre.
 * Query params: q (required), contentType, limit (max 50), offset
 */
publicApiRouter.get("/api/v1/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) {
      res.status(400).json({ error: "Query parameter 'q' must be at least 2 characters" });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    const contentTypeFilter = req.query.contentType as string | undefined;

    const database = await getDb();
    if (!database) { res.status(503).json({ error: "Database unavailable" }); return; }

    const { songs, users } = await import("../../drizzle/schema");
    const { eq, like, or, and } = await import("drizzle-orm");

    const searchPattern = `%${q}%`;
    const conditions: any[] = [
      or(
        like(songs.title, searchPattern),
        like(users.artistHandle, searchPattern),
        like(users.name, searchPattern),
        like(songs.genre, searchPattern),
      ),
      eq(songs.status, "Published"),
    ];

    if (contentTypeFilter) {
      conditions.push(eq(songs.contentType, contentTypeFilter as any));
    }

    const results = await database.select({
      song: {
        id: songs.id,
        title: songs.title,
        witnessId: songs.witnessId,
        contentType: songs.contentType,
        genre: songs.genre,
        coverArtUrl: songs.coverArtUrl,
        createdAt: songs.createdAt,
      },
      creator: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
      },
    }).from(songs)
      .leftJoin(users, eq(songs.userId, users.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    const base = `${req.protocol}://${req.get("host")}`;

    res.json({
      query: q,
      total: results.length,
      limit,
      offset,
      results: results.map((r: typeof results[0]) => ({
        wid: r.song.witnessId,
        title: r.song.title,
        contentType: r.song.contentType,
        genre: r.song.genre,
        coverArtUrl: r.song.coverArtUrl,
        registeredAt: r.song.createdAt,
        creator: {
          name: r.creator?.name ?? "Unknown",
          handle: r.creator?.artistHandle ? `@${r.creator.artistHandle}` : null,
        },
        verifyUrl: r.song.witnessId ? `${base}/api/v1/verify/${r.song.witnessId}` : null,
        widUrl: r.song.witnessId ? `${base}/api/v1/wid/${r.song.witnessId}` : null,
      })),
    });
  } catch (err) {
    console.error("[API] /search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/v1/openapi.json — OpenAPI 3.1.0 Specification ───────────────────
/**
 * Machine-readable OpenAPI spec. Used by Custom GPTs, MCP servers, and developer tools.
 * Hosted at a stable URL so integrations can reference it directly.
 */
publicApiRouter.get("/api/v1/openapi.json", (req: Request, res: Response) => {
  const base = `${req.protocol}://${req.get("host")}`;

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Living Nexus Provenance API",
      version: "1.0.0",
      description: "Register, verify, and discover creative works on the Living Nexus provenance registry. Every registered work receives a Witness ID (WID) — a permanent, verifiable record of authorship and creation.",
      contact: {
        name: "Living Nexus Developer Support",
        url: `${base}/developers`,
      },
      license: {
        name: "Proprietary",
        url: `${base}/developers`,
      },
    },
    servers: [{ url: base, description: "Living Nexus Production" }],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key (lnk_...)",
          description: "API key obtained from the Living Nexus Developer Dashboard at /developer",
        },
      },
      schemas: {
        ProvenanceRecord: {
          type: "object",
          properties: {
            wid: { type: "string", example: "WID-MUS-A1B2C3D4", description: "Witness ID — permanent provenance identifier" },
            status: { type: "string", enum: ["active", "revoked"], description: "Current status of the provenance record" },
            verificationStatus: { type: "string", enum: ["verified", "unverified"] },
            creator: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                handle: { type: "string", example: "@slimdoggy" },
                profileUrl: { type: "string", format: "uri" },
              },
            },
            work: {
              type: "object",
              properties: {
                id: { type: "integer" },
                title: { type: "string" },
                contentType: { type: "string", enum: ["audio", "lyrics", "manuscript", "comic", "image", "video"] },
                genre: { type: "string" },
                coverArtUrl: { type: "string", format: "uri" },
                aiDisclosure: { type: "string" },
              },
            },
            provenance: {
              type: "object",
              properties: {
                registeredAt: { type: "string", format: "date-time" },
                platform: { type: "string", example: "Living Nexus" },
                badgeUrl: { type: "string", format: "uri" },
                verifyUrl: { type: "string", format: "uri" },
              },
            },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["title", "contentType", "creatorHandle"],
          properties: {
            title: { type: "string", description: "Title of the creative work" },
            contentType: { type: "string", enum: ["audio", "lyrics", "manuscript", "comic", "image", "video"], description: "Type of creative work" },
            fileUrl: { type: "string", format: "uri", description: "URL to the work file (optional — URL is stored as provenance reference)" },
            creatorHandle: { type: "string", description: "Creator's Living Nexus handle (without @)" },
            genre: { type: "string", description: "Genre or category" },
            aiDisclosure: { type: "string", description: "AI tool disclosure (e.g., 'Generated with Suno AI')" },
            metadata: { type: "object", description: "Additional metadata key-value pairs" },
          },
        },
        RegisterResponse: {
          type: "object",
          properties: {
            wid: { type: "string", example: "WID-MUS-A1B2C3D4" },
            title: { type: "string" },
            contentType: { type: "string" },
            registeredAt: { type: "string", format: "date-time" },
            verifyUrl: { type: "string", format: "uri" },
            badgeUrl: { type: "string", format: "uri" },
            badgeHtml: { type: "string", description: "Ready-to-embed HTML badge" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    paths: {
      "/api/v1/health": {
        get: {
          operationId: "healthCheck",
          summary: "API health check",
          description: "Returns platform status and version. No authentication required.",
          security: [],
          responses: {
            "200": {
              description: "Platform is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      platform: { type: "string", example: "Living Nexus" },
                      version: { type: "string", example: "1.0.0" },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/works/register": {
        post: {
          operationId: "registerWork",
          summary: "Register a creative work",
          description: "Register a creative work on the Living Nexus provenance registry. Returns a Witness ID (WID) that permanently anchors the work's authorship and creation timestamp. Requires an API key.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Work registered successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/RegisterResponse" },
                },
              },
            },
            "400": { description: "Invalid request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { description: "Missing or invalid API key", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "429": { description: "Rate limit exceeded", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/v1/works/{wid}": {
        get: {
          operationId: "getWorkByWid",
          summary: "Get a registered work by WID",
          description: "Retrieve a registered work's provenance record using its Witness ID. No authentication required.",
          security: [],
          parameters: [{ name: "wid", in: "path", required: true, schema: { type: "string" }, description: "Witness ID (e.g., WID-MUS-A1B2C3D4)" }],
          responses: {
            "200": { description: "Work found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProvenanceRecord" } } } },
            "404": { description: "Work not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/v1/wid/{wid}": {
        get: {
          operationId: "getCanonicalRecord",
          summary: "Canonical provenance lookup",
          description: "Single canonical endpoint for retrieving a complete provenance record. Accepts WID or numeric song ID. Returns full creator, work, and provenance metadata. No authentication required.",
          security: [],
          parameters: [{ name: "wid", in: "path", required: true, schema: { type: "string" }, description: "Witness ID or numeric song ID" }],
          responses: {
            "200": { description: "Provenance record found", content: { "application/json": { schema: { $ref: "#/components/schemas/ProvenanceRecord" } } } },
            "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/v1/verify/{witnessId}": {
        get: {
          operationId: "verifyWid",
          summary: "Verify a Witness ID",
          description: "Verify that a Witness ID exists and is active in the Living Nexus registry. Returns verification status and creator attribution. No authentication required.",
          security: [],
          parameters: [{ name: "witnessId", in: "path", required: true, schema: { type: "string" }, description: "Witness ID to verify" }],
          responses: {
            "200": {
              description: "Verification result",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      verified: { type: "boolean" },
                      witnessId: { type: "string" },
                      track: { type: "object" },
                    },
                  },
                },
              },
            },
            "404": { description: "WID not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/v1/creator/{handle}/works": {
        get: {
          operationId: "getCreatorWorks",
          summary: "Get all works by a creator",
          description: "Retrieve all published works registered by a creator on Living Nexus. No authentication required.",
          security: [],
          parameters: [
            { name: "handle", in: "path", required: true, schema: { type: "string" }, description: "Creator's Living Nexus handle (without @)" },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": { description: "Creator works list" },
            "404": { description: "Creator not found" },
          },
        },
      },
      "/api/v1/search": {
        get: {
          operationId: "searchRegistry",
          summary: "Search the provenance registry",
          description: "Search published works by title, creator handle, or genre. No authentication required.",
          security: [],
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 }, description: "Search query" },
            { name: "contentType", in: "query", schema: { type: "string", enum: ["audio", "lyrics", "manuscript", "comic", "image", "video"] } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 50 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": { description: "Search results" },
            "400": { description: "Invalid query" },
          },
        },
      },
      "/api/v1/badge/{wid}": {
        get: {
          operationId: "getWidBadge",
          summary: "Get SVG badge for a WID",
          description: "Returns an SVG badge for embedding in third-party tools, websites, or documentation. No authentication required.",
          security: [],
          parameters: [{ name: "wid", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "SVG badge",
              content: { "image/svg+xml": { schema: { type: "string" } } },
            },
          },
        },
      },
    },
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(spec);
});
