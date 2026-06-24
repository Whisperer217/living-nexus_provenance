/**
 * Sovereign Stamp — API Route
 * Phase 3 — server/stampRoute.ts
 *
 * Issued by: BDDT Publishing / Command Domains LLC
 * Platform: Living Nexus — livingnexus.org
 *
 * POST /api/stamp-song
 * Authenticates the request, runs the full stamp pipeline, and updates the
 * database row.
 *
 * Audio content (audio): tone injection + hash + certificate
 * Non-audio content (manuscript, comic, lyrics): hash-only + certificate
 *   — no file mutation; the stamp IS the cryptographic proof of the original.
 *
 * Auth: requires valid session cookie (same pattern as uploadRoute.ts)
 */

import { Router, Request, Response } from "express";
import * as crypto from "crypto";
import { sdk } from "../_core/sdk";
import { getSongById, updateSongStamp } from "../utils/db";
import { storagePut } from "../utils/storage";
import { generateStampId, injectTone } from "../services/sovereignStamp";
import { generateCertificate } from "../services/stampCertificate";

const router = Router();

/**
 * POST /api/stamp-song
 * Body (JSON): { songId: number }
 *
 * Returns: { success: true, stampId, stampedFileUrl, certificateUrl }
 */
router.post("/api/stamp-song", async (req: Request, res: Response) => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // ── Input validation ──────────────────────────────────────────────────────
  const { songId } = req.body as { songId?: unknown };
  if (!songId || typeof songId !== "number" || !Number.isInteger(songId)) {
    res.status(400).json({ error: "songId must be an integer" });
    return;
  }

  // ── Fetch song row ────────────────────────────────────────────────────────
  const song = await getSongById(songId);
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  if (song.userId !== user.id) {
    res.status(403).json({ error: "Forbidden — this work does not belong to you" });
    return;
  }

  // ── Guard: missing file ───────────────────────────────────────────────────
  if (!song.fileUrl) {
    res.status(400).json({ error: "This work has no file attached — cannot stamp" });
    return;
  }

  // ── Guard: already stamped ────────────────────────────────────────────────
  if (song.sovereignStampId) {
    res.status(409).json({
      error: "This work is already stamped",
      stampId: song.sovereignStampId,
      stampedFileUrl: song.stampedFileUrl,
    });
    return;
  }

  // ── Detect content type ───────────────────────────────────────────────────
  const isAudio = !song.contentType || song.contentType === "audio";

  console.log(`[SovereignStamp] Starting stamp pipeline for song ${songId} (user ${user.id}, type: ${song.contentType ?? "audio"})`);

  try {
    // ── Step 1: Download original file ────────────────────────────────────────
    const fileResponse = await fetch(song.fileUrl);
    if (!fileResponse.ok) {
      res.status(502).json({ error: `Failed to fetch file: ${fileResponse.status}` });
      return;
    }
    const fileArrayBuffer = await fileResponse.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // ── Step 2: Compute original file hash ────────────────────────────────────
    const originalHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    // ── Step 3: Generate Stamp ID ─────────────────────────────────────────────
    // Format: SS-{songId}-{userId}-{timestamp8hex}-{hash8hex}
    const ts = Date.now().toString(16).slice(-8).toUpperCase();
    const hashSeg = originalHash.slice(0, 8).toUpperCase();
    const stampId = `SS-${songId}-${user.id}-${ts}-${hashSeg}`;

    console.log(`[SovereignStamp] Stamp ID: ${stampId}`);

    let stampedFileUrl: string;
    let stampedFileKey: string;
    let stampedHash: string;

    if (isAudio) {
      // ── Audio path: inject near-ultrasonic tone ──────────────────────────────
      console.log(`[SovereignStamp] Running tone injection...`);
      const stampedBuffer = await injectTone(fileBuffer, stampId);

      stampedHash = crypto
        .createHash("sha256")
        .update(stampedBuffer)
        .digest("hex");

      const originalFilename = (song.fileKey ?? song.fileUrl)
        .split("/")
        .pop() ?? "audio.wav";
      const stampedKey = `audio/${user.id}/stamped-${Date.now()}-${originalFilename}`;

      console.log(`[SovereignStamp] Uploading stamped audio to ${stampedKey}...`);
      const uploaded = await storagePut(stampedKey, stampedBuffer, "audio/wav");
      stampedFileUrl = uploaded.url;
      stampedFileKey = uploaded.key;
    } else {
      // ── Non-audio path: hash-only stamp ──────────────────────────────────────
      // Manuscripts, comics, and lyrics are stamped by cryptographic hash alone.
      // The original file is the provenance artifact — no mutation needed.
      console.log(`[SovereignStamp] Non-audio content — hash-only stamp path.`);
      stampedHash = originalHash;
      stampedFileUrl = song.fileUrl;
      stampedFileKey = song.fileKey ?? "";
    }

    // ── Step 4: Generate and upload certificate ───────────────────────────────
    console.log(`[SovereignStamp] Generating certificate...`);
    const { certificateUrl, certificateKey } = await generateCertificate({
      stampId,
      song,
      stampedFileHash: stampedHash,
      stampedAt: new Date(),
    });

    // ── Step 5: Update database row ───────────────────────────────────────────
    // Do NOT return success before this completes.
    console.log(`[SovereignStamp] Updating database row for song ${songId}...`);
    await updateSongStamp(songId, {
      sovereignStampId: stampId,
      sovereignStampedAt: new Date(),
      stampedFileUrl,
      stampedFileKey,
      stampedFileHash: stampedHash,
      certificateUrl,
      certificateKey,
    });

    console.log(`[SovereignStamp] Pipeline complete for song ${songId}. Stamp: ${stampId}`);

    res.json({
      success: true,
      stampId,
      stampedFileUrl,
      certificateUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[SovereignStamp] Pipeline error for song ${songId}:`, err);
    res.status(500).json({ error: `Stamp pipeline failed: ${message}` });
  }
});

export { router as stampRouter };
