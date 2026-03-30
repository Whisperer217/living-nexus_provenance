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

