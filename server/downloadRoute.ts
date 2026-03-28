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
import { getSongWithCreator, getUserTipTotalForSong, recordDownload } from "./db";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

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
