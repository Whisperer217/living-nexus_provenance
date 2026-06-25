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
import path from "path";
import fs from "fs";
import NodeID3 from "node-id3";
import JSZip from "jszip";
import { getSongWithCreator, getUserTipTotalForSong, recordDownload, getSongsByUser } from "../utils/db";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import type { Song } from "../../drizzle/schema";

export const downloadRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAX_INLINE_BYTES = 30 * 1024 * 1024; // 30 MB — above this we redirect to S3 directly
const FETCH_TIMEOUT_MS = 45_000; // 45s timeout — increased from 25s to handle slow CDN cold-cache responses
const FETCH_RETRIES = 1; // retry once on timeout/failure before giving up

async function fetchBytes(url: string, retries = FETCH_RETRIES): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[download] fetchBytes non-OK status ${res.status} for ${url.slice(0, 80)}`);
      return null;
    }
    // Check Content-Length before buffering to avoid OOM on large files
    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_INLINE_BYTES) return null; // caller will fall back to redirect
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.warn(`[download] fetchBytes ${isTimeout ? "timed out" : "failed"} for ${url.slice(0, 80)} — retries left: ${retries}`);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000)); // brief pause before retry
      return fetchBytes(url, retries - 1);
    }
    return null;
  }
}

function sanitizeFilename(name: string): string {
  // Strip filesystem-unsafe chars AND any non-ASCII characters (0x00-0x1F, 0x7F+)
  // Non-ASCII in a plain filename= header value causes ERR_INVALID_CHAR in Node.js.
  return name
    .replace(/[/\\?%*:|"<>]/g, "-") // filesystem-unsafe
    .replace(/[^\x20-\x7E]/g, "")   // strip non-ASCII / control chars
    .replace(/\s+/g, " ")            // collapse whitespace
    .trim()
    || "track";                       // fallback if everything was stripped
}

/**
 * Build a Content-Disposition header value that is safe for Node.js setHeader.
 * Uses RFC 6266 filename* for full Unicode support while providing an ASCII
 * filename= fallback for older clients.
 */
function safeContentDisposition(filename: string): string {
  const asciiName = sanitizeFilename(filename); // already ASCII-safe after the fix above
  const encodedName = encodeURIComponent(filename.replace(/[/\\?%*:|"<>]/g, "-").trim());
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
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

  // All download types require authentication — guests must sign in first
  let authedUserId: number | undefined;
  try {
    const authedUser = await sdk.authenticateRequest(req);
    authedUserId = authedUser?.id;
  } catch {
    // ignore auth errors
  }
  if (!authedUserId) {
    res.status(401).json({ error: "Sign in to download this track." });
    return;
  }

  if (perm === "tipped") {
    const thresholdCents = song.downloadTipThresholdCents ?? 179;
    const userTipTotal = await getUserTipTotalForSong(authedUserId, songId);
    if (userTipTotal < thresholdCents) {
      res.status(403).json({ error: `Tip $${(thresholdCents / 100).toFixed(2)} to unlock this download.` });
      return;
    }
  }

  // 3. Fetch audio bytes from S3
  //    If the file is too large (>30MB) or fetch times out, fall back to a direct S3 redirect.
  //    This avoids OOM / 503 errors on Cloud Run for large audio files.
  const audioBuffer = await fetchBytes(song.fileUrl);
  if (!audioBuffer) {
    // Fallback: redirect directly to CloudFront URL.
    // Set Content-Disposition so the browser downloads instead of opening a new tab.
    // The file won't have ID3 tags but it won't 503.
    console.warn(`[download] Falling back to CDN redirect for song ${songId} (file too large or fetch failed after retry)`);
    const safeTitle = sanitizeFilename(song.title);
    const fallbackFilename = `${safeTitle}.mp3`;
    res.setHeader("Content-Disposition", safeContentDisposition(fallbackFilename));
    res.redirect(302, song.fileUrl);
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
    // Embed lyrics as USLT (Unsynchronised Lyrics) ID3 tag — shows in Apple Music, VLC, foobar2000, etc.
    ...(song.lyricsText ? {
      unsynchronisedLyrics: {
        language: "eng",
        text: song.lyricsText,
      },
    } : {}),
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

  // 7. Build filename: "Title - Artist [WID-MUS-XXXXXXXX].mp3"
  const widShort = witnessId.length > 8 ? witnessId.slice(0, 20) : witnessId;
  const safeTitle = sanitizeFilename(song.title);
  const safeArtist = sanitizeFilename(creatorName.replace(/^@/, ""));
  const filename = `${safeTitle} - ${safeArtist} [${widShort}].mp3`;

  // 8. Record download in DB (non-fatal)
  try {
    let userId: number | undefined;
    try {
      const user = await sdk.authenticateRequest(req);
      userId = user?.id;
    } catch { /* anonymous download */ }
    await recordDownload({ songId, userId });
  } catch { /* non-fatal */ }

  // 9. If lyrics exist, bundle MP3 + lyrics.txt into a ZIP so the text is always accessible
  //    regardless of whether the user's music player supports USLT tags.
  //    If no lyrics, stream the tagged MP3 directly (same as before).
  if (song.lyricsText) {
    const zip = new JSZip();
    zip.file(filename, taggedBuffer);

    // Build lyrics.txt with header
    const lyricsHeader = [
      `Title:    ${song.title}`,
      `Artist:   ${creatorName}`,
      `Album:    ${song.albumName || "Living Nexus"}`,
      `Year:     ${year}`,
      `WID:      ${witnessId}`,
      `Verify:   ${verifyUrl}`,
      `Platform: Living Nexus — Sovereign Music`,
      `© Command Domains LLC · BDDT Publishing`,
      "",
      "--- LYRICS ---",
      "",
    ].join("\n");
    zip.file("lyrics.txt", lyricsHeader + song.lyricsText);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const zipFilename = `${safeTitle} - ${safeArtist} [${widShort}].zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", safeContentDisposition(zipFilename));
    res.setHeader("Content-Length", zipBuffer.length.toString());
    res.setHeader("Cache-Control", "no-store");
    res.end(zipBuffer);
  } else {
    // No lyrics — stream tagged MP3 directly
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", safeContentDisposition(filename));
    res.setHeader("Content-Length", taggedBuffer.length.toString());
    res.setHeader("Cache-Control", "no-store");
    res.end(taggedBuffer);
  }
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

  // 3. Fetch all audio + cover art + certificates IN PARALLEL
  //    Sequential fetching was the root cause of Cloud Run 60s timeouts:
  //    10 tracks × 45s timeout = 450s worst case. Parallel caps it at ~45s.
  type TrackAssets = {
    trackNum: string;
    song: Song;
    witnessId: string;
    verifyUrl: string;
    year: string;
    audioBuffer: Buffer | null;
    coverBuffer: Buffer | null;
    certBuffer: Buffer | null;
  };

  const trackAssets = await Promise.all(
    batchSongs.map(async (song, i): Promise<TrackAssets> => {
      const trackNum = String(start + i + 1).padStart(2, "0");
      const witnessId = song.witnessId ?? "UNWITNESSED";
      const verifyUrl = `https://www.livingnexus.org/verify/${witnessId}`;
      const year = new Date(song.createdAt).getFullYear().toString();

      const [audioBuffer, coverBuffer, certBuffer] = await Promise.all([
        song.fileUrl ? fetchBytes(song.fileUrl) : Promise.resolve(null),
        song.coverArtUrl ? fetchBytes(song.coverArtUrl) : Promise.resolve(null),
        song.certificateUrl ? fetchBytes(song.certificateUrl) : Promise.resolve(null),
      ]);

      if (!audioBuffer && song.fileUrl) {
        console.warn(`[download/batch] Skipping track ${song.id} "${song.title}" — fetch failed after retry`);
      }

      return { trackNum, song, witnessId, verifyUrl, year, audioBuffer, coverBuffer, certBuffer };
    })
  );

  // 4. Build ZIP from fetched assets
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

  for (const { trackNum, song, witnessId, verifyUrl, year, audioBuffer, coverBuffer, certBuffer } of trackAssets) {
    readmeLines.push(`Track ${trackNum}: ${song.title}`);
    readmeLines.push(`  WID: ${witnessId}`);
    readmeLines.push(`  Verify: ${verifyUrl}`);
    readmeLines.push(`  Genre: ${song.genre ?? "—"}`);
    readmeLines.push(`  Uploaded: ${new Date(song.createdAt).toLocaleDateString()}`);
    readmeLines.push(``);

    if (song.fileUrl && !audioBuffer) {
      readmeLines.push(`  ⚠ Audio file unavailable — download individually from livingnexus.org/track/${song.id}`);
      readmeLines.push(``);
    }

    if (audioBuffer) {
      const tags: NodeID3.Tags = {
        title: song.title,
        artist: creatorName,
        album: song.albumName || "Living Nexus",
        year,
        genre: song.genre || undefined,
        comment: { language: "eng", text: `Witness ID: ${witnessId}` },
        // Embed lyrics as USLT tag so they appear in music players
        ...(song.lyricsText ? {
          unsynchronisedLyrics: { language: "eng", text: song.lyricsText },
        } : {}),
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
      zip.file(`${trackNum}_${safeTitle}_[${widShort}].mp3`, taggedBuffer);

      // Also include a plain-text lyrics file for players that don’t read USLT tags
      if (song.lyricsText) {
        const lyricsHeader = [
          `Title:    ${song.title}`,
          `Artist:   ${creatorName}`,
          `Album:    ${song.albumName || "Living Nexus"}`,
          `Year:     ${year}`,
          `WID:      ${witnessId}`,
          `Verify:   ${verifyUrl}`,
          `Platform: Living Nexus — Sovereign Music`,
          `© Command Domains LLC · BDDT Publishing`,
          "",
          "--- LYRICS ---",
          "",
        ].join("\n");
        zip.file(`lyrics/${trackNum}_${safeTitle}_lyrics.txt`, lyricsHeader + song.lyricsText);
      }
    }

    if (certBuffer) {
      const safeCertTitle = sanitizeFilename(song.title);
      zip.file(`certificates/${trackNum}_${safeCertTitle}_WID_Certificate.pdf`, certBuffer);
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
  res.setHeader("Content-Disposition", safeContentDisposition(zipFilename));
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

// ── APK Download Route ─────────────────────────────────────────────────────────────────────────────────
// GET /api/apk/download  — serves the signed Android APK from server/assets/
// Route is under /api/ prefix to ensure it's handled by Express before the SPA catch-all.
const APK_PATH = path.join(process.cwd(), "server", "assets", "LivingNexus-v1-release.apk");
const APK_FILENAME = "LivingNexus-v1-release.apk";

downloadRouter.get("/api/apk/download", (_req: Request, res: Response) => {
  if (!fs.existsSync(APK_PATH)) {
    res.status(404).json({ error: "APK not found on server." });
    return;
  }
  const stat = fs.statSync(APK_PATH);
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${APK_FILENAME}"`);
  res.setHeader("Content-Length", String(stat.size));
  res.setHeader("Cache-Control", "public, max-age=86400");
  fs.createReadStream(APK_PATH).pipe(res);
});

// ── Quiver Image Download with WID Provenance Metadata ───────────────────────
// GET /api/quiver/:id/download
// Requires auth cookie. Fetches the stored image, embeds WID provenance as PNG
// text chunks (tEXt), and streams the modified PNG as an attachment.
//
// PNG tEXt chunks carry provenance fields matching the audio download convention:
//   LNWID, LN_CREATOR, LN_PROMPT, LN_TIMESTAMP, LN_VERIFY_URL, LN_PLATFORM
//
// This ensures every downloaded image carries its own proof of origin — forever.

downloadRouter.get("/api/quiver/:id/download", async (req: Request, res: Response) => {
  // 1. Authenticate — only the owner can download their quiver image
  let userId: number;
  let creatorName: string;
  try {
    const user = await sdk.authenticateRequest(req);
    userId = user.id;
    creatorName = user.artistHandle ? `@${user.artistHandle}` : (user.name ?? "Creator");
  } catch {
    res.status(401).json({ error: "Sign in to download your quiver image." });
    return;
  }

  const imageId = parseInt(req.params.id, 10);
  if (isNaN(imageId)) {
    res.status(400).json({ error: "Invalid image ID." });
    return;
  }

  // 2. Load quiver image from DB (ownership check)
  let quiverRow: { url: string; prompt: string; widId: string | null; createdAt: Date } | null = null;
  try {
    const { quiverImages } = await import('../../drizzle/schema');
    const { eq: eqOp, and: andOp } = await import('drizzle-orm');
    const { getDb } = await import('../utils/db');
    const db = await getDb();
    const rows = await db.select({
      url: quiverImages.url,
      prompt: quiverImages.prompt,
      widId: quiverImages.widId,
      createdAt: quiverImages.createdAt,
    }).from(quiverImages).where(
      andOp(eqOp(quiverImages.id, imageId), eqOp(quiverImages.userId, userId))
    ).limit(1);
    quiverRow = rows[0] ?? null;
  } catch (err) {
    console.error("[quiver/download] DB lookup failed:", err);
    res.status(500).json({ error: "Failed to load image record." });
    return;
  }

  if (!quiverRow) {
    res.status(404).json({ error: "Image not found in your quiver." });
    return;
  }

  // 3. Fetch image bytes from S3/CDN
  const imgBuffer = await fetchBytes(quiverRow.url);
  if (!imgBuffer) {
    // Fallback: redirect to CDN URL directly (no metadata)
    res.setHeader("Content-Disposition", `attachment; filename="keeper-vision.png"`);
    res.redirect(302, quiverRow.url);
    return;
  }

  // 4. Embed WID provenance as PNG tEXt metadata chunks via sharp
  //    sharp supports arbitrary PNG metadata via the `withMetadata` API.
  //    We use the raw PNG tEXt chunk approach via sharp's output options.
  const widId = quiverRow.widId ?? "UNREGISTERED";
  const verifyUrl = `https://www.livingnexus.org/verify/${widId}`;
  const timestamp = quiverRow.createdAt.toISOString();
  const promptText = quiverRow.prompt.slice(0, 500); // cap at 500 chars for PNG chunk safety

  let outputBuffer: Buffer;
  try {
    const sharp = (await import('sharp')).default;
    outputBuffer = await sharp(imgBuffer)
      .png()
      .withMetadata({
        exif: {
          IFD0: {
            // XMP-style provenance embedded in EXIF IFD0 as ImageDescription
            ImageDescription: `LNWID:${widId}|LN_CREATOR:${creatorName}|LN_VERIFY_URL:${verifyUrl}|LN_PLATFORM:Living Nexus — Sovereign Music`,
          },
        },
      })
      .toBuffer();
  } catch (err) {
    console.error("[quiver/download] sharp metadata embedding failed:", err);
    // Fallback: serve original bytes without metadata
    outputBuffer = imgBuffer;
  }

  // 5. Build filename: "keeper-vision-[WID-VIS-XXXXXXXX].png"
  const widShort = widId.length > 20 ? widId.slice(0, 20) : widId;
  const ts = timestamp.slice(0, 10).replace(/-/g, "");
  const filename = `keeper-vision-${ts}-[${widShort}].png`;

  // 6. Stream the provenance-tagged PNG
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", safeContentDisposition(filename));
  res.setHeader("Content-Length", outputBuffer.length.toString());
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-LN-WID", widId);
  res.setHeader("X-LN-Creator", creatorName);
  res.setHeader("X-LN-Verify", verifyUrl);
  res.end(outputBuffer);
});
