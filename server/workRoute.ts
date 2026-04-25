/**
 * WID Protocol — Canonical Work API
 * GET /api/work/:wid
 *
 * Returns a read-only, immutable JSON record of a work's origin, creator,
 * timestamp, hash, license, and lineage. This is the machine-readable
 * source of truth for any creation registered on Living Nexus.
 *
 * Design rules:
 *  - READ ONLY. No POST, PUT, PATCH, DELETE ever allowed.
 *  - Immutable response — data reflects the original registration record.
 *  - CORS open — any external app may call this endpoint.
 *  - Cache-Control: public, max-age=300 — data is stable by design.
 *  - X-WID-Protocol: 1.0 — protocol version header for consumers.
 */

import { Router } from "express";
import { getSongByWitnessId } from "./db";

export const workRouter = Router();

// ─── GET /api/work/:wid ───────────────────────────────────────────────────────
workRouter.get("/:wid", async (req, res) => {
  const { wid } = req.params;

  if (!wid || typeof wid !== "string" || wid.trim().length === 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: "WID parameter is required.",
      protocol: "WID/1.0",
    });
  }

  try {
    const record = await getSongByWitnessId(wid.trim());

    if (!record) {
      return res.status(404).json({
        error: "Not Found",
        message: `No work registered under WID: ${wid}`,
        protocol: "WID/1.0",
      });
    }

    const { song, creator } = record;

    // Only serve publicly visible works
    if (song.status === "Deleted" || (!song.isPublic && song.status !== "Published")) {
      return res.status(404).json({
        error: "Not Found",
        message: `Work is not publicly accessible.`,
        protocol: "WID/1.0",
      });
    }

    const artistName = creator?.artistHandle || creator?.name || "Unknown Artist";
    const creatorProfileUrl = creator?.id
      ? `https://www.livingnexus.org/creator/${creator.id}`
      : null;

    // ── Canonical Work Record ─────────────────────────────────────────────────
    const workRecord = {
      // Protocol metadata
      protocol: "WID/1.0",
      schema: "https://www.livingnexus.org/api/work/schema",

      // Identity
      wid: song.witnessId,
      title: song.title,
      platform: "Living Nexus",
      platformUrl: "https://www.livingnexus.org",
      canonicalUrl: `https://www.livingnexus.org/share/${song.witnessId}`,
      songUrl: `https://www.livingnexus.org/song/${song.id}`,

      // Creator
      creator: {
        name: artistName,
        profileUrl: creatorProfileUrl,
        avatarUrl: creator?.profilePhotoUrl || null,
      },

      // Temporal provenance
      registeredAt: song.createdAt,
      updatedAt: song.updatedAt,

      // Content metadata
      genre: song.genre || null,
      bpm: song.bpm || null,
      keySignature: song.keySignature || null,
      moodTags: song.moodTags || [],
      albumName: song.albumName || null,
      releaseDate: song.releaseDate || null,
      isrc: song.isrc || null,
      durationSeconds: song.durationSeconds || null,

      // AI disclosure
      aiDisclosure: song.aiConsent,

      // Cryptographic provenance
      hash: {
        fileHash: song.fileHash || null,
        lyricsHash: song.lyricsHash || null,
        ecdsaPublicKey: song.ecdsaPublicKey || null,
        ecdsaSignature: song.ecdsaSignature || null,
        harmonicSignature: song.harmonicSignature || null,
      },

      // Media surfaces
      media: {
        coverArtUrl: song.coverArtUrl || null,
        audioUrl: song.fileUrl || null,
        videoUrl: song.videoUrl || null,
        embedPlayerUrl: `https://www.livingnexus.org/embed/song/${song.id}`,
        certificateUrl: song.certificateUrl || null,
      },

      // License
      license: {
        downloadPermission: song.downloadPermission,
        aiConsent: song.aiConsent,
        coWriters: song.coWriters || [],
      },

      // Stats (read-only snapshot)
      stats: {
        playCount: song.playCount,
        tipCount: song.tipCount,
      },

      // Lineage — reserved for future derivative work tracking
      lineage: [],
    };

    // ── Response headers ──────────────────────────────────────────────────────
    res.set({
      "Content-Type": "application/json; charset=utf-8",
      "X-WID-Protocol": "1.0",
      "X-Content-Type-Options": "nosniff",
      // CORS — open for external consumers
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      // Cache — stable data, 5 min public cache
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    });

    return res.status(200).json(workRecord);
  } catch (err) {
    console.error("[WID Protocol] Error fetching work:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve work record.",
      protocol: "WID/1.0",
    });
  }
});

// ─── Block all mutation methods ───────────────────────────────────────────────
const METHOD_NOT_ALLOWED = (_req: any, res: any) =>
  res.status(405).set("Allow", "GET, OPTIONS").json({
    error: "Method Not Allowed",
    message: "The WID Protocol is read-only. Mutation of origin records is not permitted.",
    protocol: "WID/1.0",
  });

workRouter.post("/:wid", METHOD_NOT_ALLOWED);
workRouter.put("/:wid", METHOD_NOT_ALLOWED);
workRouter.patch("/:wid", METHOD_NOT_ALLOWED);
workRouter.delete("/:wid", METHOD_NOT_ALLOWED);

// ─── OPTIONS preflight ────────────────────────────────────────────────────────
workRouter.options("/:wid", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  }).status(204).end();
});
