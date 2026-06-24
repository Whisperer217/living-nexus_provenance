/**
 * server/routes/bulkDownloadRoute.ts
 *
 * GET /api/bulk-download/:token
 *
 * Streams a ZIP file containing all licensed tracks for the requesting user.
 * The token is a short-lived JWT (15 min) issued by songDownload.bulkDownload
 * after verifying that the user holds an active download grant for every track.
 *
 * ZIP contents:
 *   living-nexus-bundle/
 *     manifest.json          — Witness ID + license info for every track
 *     01 - Artist - Title.mp3
 *     02 - Artist - Title.mp3
 *     ...
 */

import { Router, Request, Response } from "express";
import { createRequire } from "module";
import type { ArchiverOptions, ZipArchive } from "archiver";
import { jwtVerify } from "jose";
import { getSongsByIds } from "../utils/db";
const _require = createRequire(import.meta.url);
const createArchive = _require("archiver") as (format: string, opts?: ArchiverOptions) => InstanceType<typeof ZipArchive>;

export const bulkDownloadRouter = Router();

// Sanitise a string for use as a filename component
function sanitizeFilename(str: string): string {
  return str
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

bulkDownloadRouter.get("/api/bulk-download/:token", async (req: Request, res: Response) => {
  const { token } = req.params;

  // ── 1. Verify the signed token ─────────────────────────────────────────────
  let userId: number;
  let songIds: number[];
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "fallback");
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.userId !== "number" ||
      !Array.isArray(payload.songIds) ||
      payload.songIds.length === 0 ||
      payload.songIds.length > 20
    ) {
      res.status(400).json({ error: "Invalid download token payload" });
      return;
    }
    userId = payload.userId as number;
    songIds = payload.songIds as number[];
  } catch {
    res.status(401).json({ error: "Download token is invalid or has expired. Please request a new download link." });
    return;
  }

  // ── 2. Fetch song metadata ─────────────────────────────────────────────────
  let rows: Awaited<ReturnType<typeof getSongsByIds>>;
  try {
    rows = await getSongsByIds(songIds);
  } catch (err) {
    console.error("[BulkDownload] DB error fetching songs:", err);
    res.status(500).json({ error: "Failed to fetch track metadata" });
    return;
  }

  if (rows.length === 0) {
    res.status(404).json({ error: "No tracks found for the requested IDs" });
    return;
  }

  // ── 3. Set response headers ────────────────────────────────────────────────
  const bundleFilename = `living-nexus-bundle-${Date.now()}.zip`;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${bundleFilename}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");

  // ── 4. Stream the ZIP ──────────────────────────────────────────────────────
  const archive = createArchive("zip", { zlib: { level: 6 } });

  archive.on("error", (err: Error) => {
    console.error("[BulkDownload] Archiver error:", err);
    // Headers already sent — can't change status; just destroy the stream
    res.destroy(err);
  });

  archive.pipe(res);

  // Build manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    requestedBy: userId,
    platform: "Living Nexus Creative Provenance",
    tracks: rows.map((r: (typeof rows)[number], idx: number) => ({
      index: idx + 1,
      id: r.song.id,
      title: r.song.title,
      witnessId: r.song.witnessId ?? null,
      creator: r.creator?.artistHandle ?? r.creator?.name ?? "Unknown",
      genre: r.song.genre ?? null,
      aiConsent: r.song.aiConsent ?? null,
      isPublic: r.song.isPublic,
      createdAt: r.song.createdAt,
      license: {
        type: "explicit_grant",
        grantedTo: userId,
        note: "Download authorized by creator via Living Nexus licensed download grant system.",
      },
    })),
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: "living-nexus-bundle/manifest.json" });

  // Fetch and append each audio file
  for (let i = 0; i < rows.length; i++) {
    const { song, creator } = rows[i];
    const audioUrl = song.fileUrl;
    if (!audioUrl) {
      console.warn(`[BulkDownload] Song ${song.id} has no fileUrl — skipping`);
      continue;
    }

    const artistName = sanitizeFilename(creator?.artistHandle ?? creator?.name ?? "Unknown");
    const trackTitle = sanitizeFilename(song.title ?? `Track ${song.id}`);
    const trackNum = String(i + 1).padStart(2, "0");
    const filename = `living-nexus-bundle/${trackNum} - ${artistName} - ${trackTitle}.mp3`;

    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        console.warn(`[BulkDownload] Failed to fetch audio for song ${song.id}: HTTP ${response.status}`);
        continue;
      }
      if (!response.body) {
        console.warn(`[BulkDownload] No response body for song ${song.id}`);
        continue;
      }
      // Convert Web ReadableStream to Node.js Readable
      const { Readable } = await import("stream");
      const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
      archive.append(nodeStream, { name: filename });
    } catch (err) {
      console.error(`[BulkDownload] Error fetching song ${song.id}:`, err);
      // Continue with remaining tracks — partial ZIP is better than a crash
    }
  }

  await archive.finalize();
});
