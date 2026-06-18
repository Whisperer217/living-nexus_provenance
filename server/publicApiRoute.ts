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
import { getPublicSongs, getSongWithCreator, getUserById, getDb } from "./db";

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

    const { songs, users } = await import("../drizzle/schema");
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
import { validateApiKey, registerWorkViaApi } from "./db";

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

    const database = await (await import("./db")).getDb();
    if (!database) { res.status(503).json({ error: "Database unavailable" }); return; }

    const { songs, users } = await import("../drizzle/schema");
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

    const database = await (await import("./db")).getDb();
    if (!database) { res.status(503).json({ error: "Database unavailable" }); return; }

    const { songs, users } = await import("../drizzle/schema");
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
