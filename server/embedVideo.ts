/**
 * Embed Video Generator
 *
 * Generates a short MP4 "embed video" per song track:
 *   - Cover art image looped as video (400×400, H.264)
 *   - Audio track from the song's CDN URL (AAC, capped at 30 seconds)
 *
 * The MP4 is cached on S3 at embed-videos/{songId}.mp4 and the URL is
 * stored in songs.embedVideoUrl so it is only generated once per song.
 *
 * Discord does NOT support og:audio but DOES render og:video with video/mp4.
 * iMessage auto-plays og:video pointing to a direct .mp4 file.
 * Telegram renders og:video as an inline video player.
 *
 * IMPORTANT: ffmpeg cannot stream audio directly from CloudFront URLs that
 * contain spaces or special characters. We download both assets to temp files
 * first, then encode locally.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { storagePut } from "./storage";
import { getDb } from "./db";
import { songs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const execFileAsync = promisify(execFile);

/** Maximum audio duration to include in the embed video (seconds). 30s is enough for a preview. */
const MAX_DURATION_SECS = 30;

/** Output video dimensions — square works best across all platforms. */
const VIDEO_SIZE = "400:400";

/** ffmpeg encode timeout in ms — 3 minutes should be more than enough for 30s clip */
const FFMPEG_TIMEOUT_MS = 180_000;

export interface EmbedVideoInput {
  songId: number;
  coverArtUrl: string | null | undefined;
  fileUrl: string | null | undefined;
  /** Pre-cached embed video URL from DB — skip generation if present. */
  embedVideoUrl?: string | null | undefined;
}

/**
 * Returns the embed video URL for a song.
 * If one is already cached in the DB, returns it immediately.
 * Otherwise generates it with ffmpeg, uploads to S3, caches in DB, and returns the URL.
 */
export async function getOrGenerateEmbedVideo(input: EmbedVideoInput): Promise<string | null> {
  const { songId, coverArtUrl, fileUrl, embedVideoUrl } = input;

  // Return cached URL if available
  if (embedVideoUrl && embedVideoUrl.trim().length > 0) {
    return embedVideoUrl.trim();
  }

  // Need both cover art and audio to generate
  if (!coverArtUrl || !fileUrl) {
    return null;
  }

  try {
    const url = await generateEmbedVideo({ songId, coverArtUrl, fileUrl });
    // Cache in DB so we never regenerate
    await cacheEmbedVideoUrl(songId, url);
    return url;
  } catch (err) {
    console.error(`[EmbedVideo] Failed to generate embed video for song ${songId}:`, err);
    return null;
  }
}

async function downloadToTempFile(url: string, ext: string, tmpDir: string): Promise<string> {
  const filePath = path.join(tmpDir, `input${ext}`);
  const response = await fetch(url, {
    headers: { "User-Agent": "LivingNexus-EmbedBot/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function generateEmbedVideo(opts: {
  songId: number;
  coverArtUrl: string;
  fileUrl: string;
}): Promise<string> {
  const { songId, coverArtUrl, fileUrl } = opts;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `embed-${songId}-`));
  const outPath = path.join(tmpDir, "embed.mp4");

  try {
    console.log(`[EmbedVideo] Downloading assets for song ${songId}...`);

    // Determine image extension from URL
    const imgExt = coverArtUrl.toLowerCase().includes(".png") ? ".png"
      : coverArtUrl.toLowerCase().includes(".webp") ? ".webp"
      : ".jpg";

    // Determine audio extension from URL
    const audioExt = fileUrl.toLowerCase().includes(".m4a") ? ".m4a"
      : fileUrl.toLowerCase().includes(".wav") ? ".wav"
      : fileUrl.toLowerCase().includes(".ogg") ? ".ogg"
      : ".mp3";

    // Download both assets to temp files (avoids ffmpeg issues with spaces/special chars in URLs)
    const [imgPath, audioPath] = await Promise.all([
      downloadToTempFile(coverArtUrl, imgExt, tmpDir),
      downloadToTempFile(fileUrl, audioExt, tmpDir),
    ]);

    console.log(`[EmbedVideo] Encoding MP4 for song ${songId}...`);

    // ffmpeg args:
    //  -loop 1 -i <cover_art>       → loop the cover art image as video input
    //  -i <audio>                   → audio input
    //  -t MAX_DURATION_SECS         → cap duration at 30 seconds
    //  -c:v libx264                 → H.264 video codec (broad compatibility)
    //  -c:a aac                     → AAC audio codec
    //  -vf scale=400:400,setsar=1   → square output, correct SAR
    //  -pix_fmt yuv420p             → broad compatibility (Discord, iMessage, Telegram)
    //  -movflags +faststart         → moov atom at front for streaming
    //  -shortest                    → end when shortest stream ends
    const args = [
      "-y",
      "-loop", "1",
      "-i", imgPath,
      "-i", audioPath,
      "-t", String(MAX_DURATION_SECS),
      "-c:v", "libx264",
      "-c:a", "aac",
      "-b:a", "128k",
      "-vf", `scale=${VIDEO_SIZE},setsar=1`,
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-shortest",
      outPath,
    ];

    await execFileAsync("ffmpeg", args, { timeout: FFMPEG_TIMEOUT_MS });

    // Read the generated MP4
    const data = await fs.readFile(outPath);
    console.log(`[EmbedVideo] Generated ${(data.length / 1024).toFixed(1)}KB MP4 for song ${songId}`);

    // Upload to S3
    const s3Key = `embed-videos/${songId}.mp4`;
    const { url } = await storagePut(s3Key, data, "video/mp4");
    console.log(`[EmbedVideo] Uploaded to S3: ${url}`);

    return url;
  } finally {
    // Clean up temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function cacheEmbedVideoUrl(songId: number, url: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ embedVideoUrl: url }).where(eq(songs.id, songId));
}
