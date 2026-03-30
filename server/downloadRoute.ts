/**
 * Living Nexus — WID-Tagged Download Route
 * =========================================
 * Serves audio files with Witness ID + creator metadata embedded as ID3 tags.
 * Every downloaded file carries its own cryptographic proof of origin — forever.
 *
 * Route: GET /api/download/:songId
 *
 * Flow:
 *  1. Validate download permission (free / tipped gate)
 *  2. Fetch audio bytes from S3 via Forge storage proxy
 *  3. Fetch cover art bytes (if available)
 *  4. Write ID3 tags: title, artist, album, year, WID, verify URL, platform attribution
 *  5. Stream tagged buffer as audio/mpeg download
 *
 * Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework
 */

import { Router, Request, Response } from "express";
import NodeID3 from "node-id3";
import JSZip from "jszip";
import { getSongWithCreator, getUserTipTotalForSong, recordDownload, getSongsByUser } from "./db";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import type { Song } from "../drizzle/schema";

export const downloadRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim();
}

// ── Download Endpoint ─────────────────────────────────────────────────────────

downloadRouter.get("/api/download/:songId", async (req: Request, res: Response) => {
  const songId = parseInt(req.params.songId, 10);
  if (isNaN(songId)) {
    res.status(400).json({ error: "Invalid song ID" });
    return;
  }

  // 1. Load song + creator
  const record = await getSongWithCreator(songId);
  if (!record?.song?.fileUrl) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  const { song, creator } = record;

  // 2. Enforce download permission gate
  const perm = song.downloadPermission as string | undefined;
  if (!perm || perm === "none") {
    res.status(403).json({ error: "Downloads are not enabled for this track." });
    return;
  }

  if (perm === "tipped") {
    // Parse session cookie to get userId (same pattern as tRPC context)
    let userId: number | undefined;
    try {
      const user = await sdk.authenticateRequest(req);
      userId = user?.id;
    } catch {
      // ignore
    }
    if (!userId) {
      res.status(401).json({ error: "Sign in to download this track." });
      return;
    }
    const thresholdCents = song.downloadTipThresholdCents ?? 179;
    const userTipTotal = await getUserTipTotalForSong(userId, songId);
    if (userTipTotal < thresholdCents) {
      res.status(403).json({ error: `Tip $${(thresholdCents / 100).toFixed(2)} to unlock this download.` });
      return;
    }
  }

  // 3. Fetch audio bytes from S3
  const audioBuffer = await fetchBytes(song.fileUrl);
  if (!audioBuffer) {
    res.status(502).json({ error: "Could not fetch audio file from storage." });
    return;
  }

  // 4. Fetch cover art bytes (optional)
  let coverBuffer: Buffer | null = null;
  if (song.coverArtUrl) {
    coverBuffer = await fetchBytes(song.coverArtUrl);
  }

  // 5. Build ID3 tags
  const creatorName = creator?.artistHandle
    ? `@${creator.artistHandle}`
    : (creator?.name ?? "Unknown Artist");

  const witnessId = song.witnessId ?? "UNWITNESSED";
  const verifyUrl = `https://www.livingnexus.org/verify/${witnessId}`;
  const year = new Date(song.createdAt).getFullYear().toString();

  const tags: NodeID3.Tags = {
    title: song.title,
    artist: creatorName,
    album: song.albumName || "Living Nexus",
    year,
    genre: song.genre || undefined,
    comment: {
      language: "eng",
      text: `Witness ID: ${witnessId}`,
    },
    userDefinedText: [
      { description: "LNWID",          value: witnessId },
      { description: "LN_CREATOR",     value: creatorName },
      { description: "LN_TIMESTAMP",   value: song.createdAt.toISOString() },
      { description: "LN_VERIFY_URL",  value: verifyUrl },
      { description: "LN_PLATFORM",    value: "Living Nexus — Sovereign Music" },
      { description: "LN_DOCTRINE",    value: "Command Domains LLC · BDDT Publishing · Genesis Day March 20 2026" },
      { description: "LN_AI_CONSENT",  value: song.aiConsent ?? "prohibited" },
    ],
  };

  if (coverBuffer) {
    tags.image = {
      mime: "image/jpeg",
      type: { id: 3, name: "front cover" },
      description: "Cover Art",
      imageBuffer: coverBuffer,
    };
  }

  // 6. Write ID3 tags into audio buffer
  const taggedBuffer = NodeID3.write(tags, audioBuffer);

  // 7. Record download in DB
    try {
      let userId: number | undefined;
      try {
        const user = await sdk.authenticateRequest(req);
        userId = user?.id;
      } catch { /* anonymous download */ }
      await recordDownload({ songId, userId });
    } catch { /* non-fatal */ }

  // 8. Build filename: "Title - Artist [WID-MUS-XXXXXXXX].mp3"
  const widShort = witnessId.length > 8 ? witnessId.slice(0, 20) : witnessId;
  const safeTitle = sanitizeFilename(song.title);
  const safeArtist = sanitizeFilename(creatorName.replace(/^@/, ""));
  const filename = `${safeTitle} - ${safeArtist} [${widShort}].mp3`;

  // 9. Stream to client
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", taggedBuffer.length.toString());
  res.setHeader("Cache-Control", "no-store");
  res.end(taggedBuffer);
});

// ── Batch Archive Download ────────────────────────────────────────────────────
// GET /api/download/batch/:batchIndex
// Requires auth cookie. Streams a ZIP of 10 tracks (with ID3 tags + certs + README).

const BATCH_SIZE = 10;

downloadRouter.get("/api/download/batch/:batchIndex", async (req: Request, res: Response) => {
  // 1. Authenticate — only the creator can download their own archive
  let userId: number;
  let creatorName: string;
  try {
    const user = await sdk.authenticateRequest(req);
    userId = user.id;
    creatorName = user.artistHandle ? `@${user.artistHandle}` : (user.name ?? "Creator");
  } catch {
    res.status(401).json({ error: "Sign in to download your archive." });
    return;
  }

  const batchIndex = parseInt(req.params.batchIndex, 10);
  if (isNaN(batchIndex) || batchIndex < 0) {
    res.status(400).json({ error: "Invalid batch index." });
    return;
  }

  // 2. Load all creator's songs (ordered by createdAt asc for consistent numbering)
  const allSongs = await getSongsByUser(userId);
  const activeSongs = (allSongs as Song[])
    .filter((s: Song) => s.status !== "Deleted")
    .sort((a: Song, b: Song) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const start = batchIndex * BATCH_SIZE;
  const batchSongs = activeSongs.slice(start, start + BATCH_SIZE);

  if (batchSongs.length === 0) {
    res.status(404).json({ error: "No tracks in this batch." });
    return;
  }

  // 3. Build ZIP
  const zip = new JSZip();
  const readmeLines: string[] = [
    `Living Nexus — Creator Archive`,
    `Creator: ${creatorName}`,
    `Batch: ${batchIndex + 1} (Tracks ${start + 1}–${start + batchSongs.length})`,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `Command Domains LLC · BDDT Publishing · Sovereign Shutter Framework`,
    `He is before all things, and in him all things hold together. — Colossians 1:17`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
  ];

  for (let i = 0; i < batchSongs.length; i++) {
    const song = batchSongs[i];
    const trackNum = String(start + i + 1).padStart(2, "0");
    const witnessId = song.witnessId ?? "UNWITNESSED";
    const verifyUrl = `https://www.livingnexus.org/verify/${witnessId}`;
    const year = new Date(song.createdAt).getFullYear().toString();

    // Add README entry
    readmeLines.push(`Track ${trackNum}: ${song.title}`);
    readmeLines.push(`  WID: ${witnessId}`);
    readmeLines.push(`  Verify: ${verifyUrl}`);
    readmeLines.push(`  Genre: ${song.genre ?? "—"}`);
    readmeLines.push(`  Uploaded: ${new Date(song.createdAt).toLocaleDateString()}`);
    readmeLines.push(``);

    // Fetch and tag audio
    if (song.fileUrl) {
      const audioBuffer = await fetchBytes(song.fileUrl);
      if (audioBuffer) {
        // Fetch cover art
        let coverBuffer: Buffer | null = null;
        if (song.coverArtUrl) coverBuffer = await fetchBytes(song.coverArtUrl);

        // Build ID3 tags
        const tags: NodeID3.Tags = {
          title: song.title,
          artist: creatorName,
          album: song.albumName || "Living Nexus",
          year,
          genre: song.genre || undefined,
          comment: { language: "eng", text: `Witness ID: ${witnessId}` },
          userDefinedText: [
            { description: "LNWID",         value: witnessId },
            { description: "LN_CREATOR",    value: creatorName },
            { description: "LN_TIMESTAMP",  value: song.createdAt.toISOString() },
            { description: "LN_VERIFY_URL", value: verifyUrl },
            { description: "LN_PLATFORM",   value: "Living Nexus — Sovereign Music" },
            { description: "LN_DOCTRINE",   value: "Command Domains LLC · BDDT Publishing · Genesis Day March 20 2026" },
            { description: "LN_AI_CONSENT", value: song.aiConsent ?? "prohibited" },
          ],
        };
        if (coverBuffer) {
          tags.image = {
            mime: "image/jpeg",
            type: { id: 3, name: "front cover" },
            description: "Cover Art",
            imageBuffer: coverBuffer,
          };
        }

        const taggedBuffer = NodeID3.write(tags, audioBuffer);
        const safeTitle = sanitizeFilename(song.title);
        const widShort = witnessId.length > 20 ? witnessId.slice(0, 20) : witnessId;
        const audioFilename = `${trackNum}_${safeTitle}_[${widShort}].mp3`;
        zip.file(audioFilename, taggedBuffer);
      }
    }

    // Add WID certificate PDF if available
    if (song.certificateUrl) {
      const certBuffer = await fetchBytes(song.certificateUrl);
      if (certBuffer) {
        const safeCertTitle = sanitizeFilename(song.title);
        zip.file(`certificates/${trackNum}_${safeCertTitle}_WID_Certificate.pdf`, certBuffer);
      }
    }
  }

  zip.file("README.txt", readmeLines.join("\n"));

  // 4. Generate and stream ZIP
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const batchLabel = `Batch_${batchIndex + 1}_Tracks_${start + 1}-${start + batchSongs.length}`;
  const safeCreator = sanitizeFilename(creatorName.replace(/^@/, ""));
  const zipFilename = `LivingNexus_${safeCreator}_${batchLabel}.zip`;

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
  res.setHeader("Content-Length", zipBuffer.length.toString());
  res.setHeader("Cache-Control", "no-store");
  res.end(zipBuffer);
});

// ── Batch Info Endpoint ───────────────────────────────────────────────────────
// GET /api/download/batch-info
// Returns batch metadata for the authenticated creator (no file downloads).

downloadRouter.get("/api/download/batch-info", async (req: Request, res: Response) => {
  let userId: number;
  try {
    const user = await sdk.authenticateRequest(req);
    userId = user.id;
  } catch {
    res.status(401).json({ error: "Sign in to view your archive." });
    return;
  }

  const allSongs = await getSongsByUser(userId);
  const activeSongs = (allSongs as Song[])
    .filter((s: Song) => s.status !== "Deleted")
    .sort((a: Song, b: Song) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const batches = [];
  for (let i = 0; i < activeSongs.length; i += BATCH_SIZE) {
    const slice = activeSongs.slice(i, i + BATCH_SIZE);
    batches.push({
      index: Math.floor(i / BATCH_SIZE),
      start: i + 1,
      end: i + slice.length,
      trackCount: slice.length,
      tracks: slice.map((s) => ({
        id: s.id,
        title: s.title,
        witnessId: s.witnessId ?? null,
        hasCertificate: !!s.certificateUrl,
        hasAudio: !!s.fileUrl,
      })),
    });
  }

  res.json({ totalTracks: activeSongs.length, batchSize: BATCH_SIZE, batches });
});
