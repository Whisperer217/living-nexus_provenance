/**
 * AI Music Video Loop Service
 *
 * Pipeline:
 *   1. LLM reads track metadata (title, genre, mood, caption, lyrics) and generates
 *      a visual script: 6 cinematic frame descriptions that arc through the track's
 *      emotional journey.
 *   2. generateImage() produces each frame using the cover art as a style reference,
 *      so the visual language stays anchored to the creator's original artwork.
 *   3. ffmpeg stitches the 6 frames into a seamless looping MP4 with crossfade
 *      dissolves (1280×720, H.264, ~24s loop).
 *   4. The MP4 is uploaded to S3 and the URL + script are stored in the DB.
 *
 * Triggered by the visual queue worker after the embedVideo step completes.
 * Non-blocking — the upload flow never waits for this.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { getDb } from "../utils/db";
import { songs } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../utils/storage";

const execFileAsync = promisify(execFile);

/** Duration each frame is held in the output video (seconds). */
const FRAME_HOLD_SECS = 4;
/** Number of cinematic frames to generate. */
const FRAME_COUNT = 6;
/** Crossfade duration between frames (seconds). */
const CROSSFADE_SECS = 0.8;
/** Output video dimensions — 16:9 cinematic. */
const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;
/** ffmpeg timeout in ms — 5 minutes for 6 frames. */
const FFMPEG_TIMEOUT_MS = 300_000;
/** LLM timeout in ms. */
const LLM_TIMEOUT_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MusicVideoInput {
  songId: number;
  title: string;
  genre?: string | null;
  moodTags?: string[] | null;
  caption?: string | null;
  description?: string | null;
  lyricsText?: string | null;
  coverArtUrl?: string | null;
  /** Skip generation if already present. */
  musicVideoUrl?: string | null;
}

interface FrameScript {
  frame: number;
  scene: string;
  mood: string;
  visualPrompt: string;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Generate an AI music video loop for a song.
 * Returns the S3 URL of the generated MP4, or null on failure.
 */
export async function generateMusicVideo(input: MusicVideoInput): Promise<string | null> {
  const { songId } = input;

  // Skip if already generated
  if (input.musicVideoUrl?.trim()) {
    return input.musicVideoUrl.trim();
  }

  // Need cover art to anchor the visual style
  if (!input.coverArtUrl) {
    console.log(`[MusicVideo] Skipping song ${songId} — no cover art`);
    return null;
  }

  try {
    // Mark as generating in DB
    await updateMusicVideoStatus(songId, "generating");

    console.log(`[MusicVideo] Generating visual script for song ${songId}: "${input.title}"`);
    const script = await generateVisualScript(input);
    if (!script || script.length === 0) {
      throw new Error("LLM returned empty script");
    }

    // Save script to DB immediately so it's visible even if frame gen fails
    await saveMusicVideoScript(songId, JSON.stringify(script));

    console.log(`[MusicVideo] Generating ${FRAME_COUNT} frames for song ${songId}...`);
    const frameUrls = await generateFrames(script, input.coverArtUrl);
    if (frameUrls.length < 2) {
      throw new Error(`Only ${frameUrls.length} frames generated — need at least 2`);
    }

    console.log(`[MusicVideo] Assembling MP4 for song ${songId}...`);
    const mp4Url = await assembleVideo(songId, frameUrls);

    // Store final URL in DB
    await saveMusicVideoUrl(songId, mp4Url);
    console.log(`[MusicVideo] ✓ Complete for song ${songId}: ${mp4Url}`);
    return mp4Url;

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MusicVideo] ✗ Failed for song ${songId}:`, msg);
    await updateMusicVideoStatus(songId, "failed");
    return null;
  }
}

// ─── Step 1: LLM Visual Script ────────────────────────────────────────────────

async function generateVisualScript(input: MusicVideoInput): Promise<FrameScript[]> {
  const { title, genre, moodTags, caption, description, lyricsText } = input;

  const moodStr = moodTags?.length ? moodTags.join(", ") : "not specified";
  const lyricsPreview = lyricsText
    ? lyricsText.slice(0, 800).replace(/\n+/g, " ").trim()
    : "none provided";

  const systemPrompt = `You are a cinematic music video director. Given a track's metadata, you create a visual script: exactly ${FRAME_COUNT} still-frame scene descriptions that arc through the emotional journey of the song. Each frame should be a vivid, painterly image description — not a camera direction. The frames should flow from opening atmosphere → rising tension → emotional peak → resolution → reflection → closing image. Keep each visualPrompt under 120 words. Output valid JSON only.`;

  const userPrompt = `Track: "${title}"
Genre: ${genre || "unknown"}
Mood: ${moodStr}
Caption: ${caption || "none"}
Description: ${description || "none"}
Lyrics preview: ${lyricsPreview}

Generate a JSON array of exactly ${FRAME_COUNT} objects. Each object must have:
- "frame": integer 1–${FRAME_COUNT}
- "scene": one-line scene title (e.g. "Tunnel entrance, pre-dawn")
- "mood": one-word emotional tone (e.g. "anticipation")
- "visualPrompt": cinematic image description for AI image generation, referencing the cover art's visual style

Return ONLY the JSON array, no markdown, no explanation.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "music_video_script",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                frame: { type: "integer" },
                scene: { type: "string" },
                mood: { type: "string" },
                visualPrompt: { type: "string" },
              },
              required: ["frame", "scene", "mood", "visualPrompt"],
              additionalProperties: false,
            },
          },
        },
      } as any,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM returned no content");

    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    const frames: FrameScript[] = Array.isArray(parsed) ? parsed : parsed.items ?? [];

    // Validate and cap at FRAME_COUNT
    return frames
      .filter((f: any) => f.frame && f.visualPrompt)
      .slice(0, FRAME_COUNT)
      .map((f: any, i: number) => ({
        frame: i + 1,
        scene: f.scene ?? `Frame ${i + 1}`,
        mood: f.mood ?? "cinematic",
        visualPrompt: f.visualPrompt,
      }));

  } finally {
    clearTimeout(timeout);
  }
}

// ─── Step 2: AI Frame Generation ─────────────────────────────────────────────

async function generateFrames(
  script: FrameScript[],
  coverArtUrl: string,
): Promise<string[]> {
  const frameUrls: string[] = [];

  for (const frame of script) {
    try {
      console.log(`[MusicVideo] Generating frame ${frame.frame}/${script.length}: "${frame.scene}"`);

      // Enhance the prompt with cinematic framing instructions
      const enhancedPrompt = `${frame.visualPrompt}. Cinematic 16:9 composition, dramatic lighting, high contrast, film grain texture. Mood: ${frame.mood}. Style consistent with the reference cover art.`;

      const result = await generateImage({
        prompt: enhancedPrompt,
        originalImages: [
          {
            url: coverArtUrl,
            mimeType: "image/jpeg",
          },
        ],
      });

      if (result.url) {
        frameUrls.push(result.url);
        console.log(`[MusicVideo] Frame ${frame.frame} generated: ${result.url}`);
      } else {
        console.warn(`[MusicVideo] Frame ${frame.frame} returned no URL — skipping`);
      }
    } catch (err) {
      console.warn(`[MusicVideo] Frame ${frame.frame} failed:`, err instanceof Error ? err.message : err);
      // Continue — we can still make a video with fewer frames
    }
  }

  return frameUrls;
}

// ─── Step 3: ffmpeg Assembly ──────────────────────────────────────────────────

async function assembleVideo(songId: number, frameUrls: string[]): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `mv-${songId}-`));
  const outPath = path.join(tmpDir, "music-video.mp4");

  try {
    // Download all frames to temp files
    const framePaths: string[] = [];
    for (let i = 0; i < frameUrls.length; i++) {
      const filePath = path.join(tmpDir, `frame${i}.jpg`);
      const response = await fetch(frameUrls[i], {
        headers: { "User-Agent": "LivingNexus-MusicVideo/1.0" },
      });
      if (!response.ok) throw new Error(`Failed to download frame ${i}: HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      framePaths.push(filePath);
    }

    console.log(`[MusicVideo] Downloaded ${framePaths.length} frames for song ${songId}, assembling...`);

    // Build ffmpeg filter_complex for crossfade dissolve between frames
    // Each frame is held for FRAME_HOLD_SECS, with CROSSFADE_SECS overlap
    // Strategy: use concat with xfade filter
    const n = framePaths.length;
    const holdMs = FRAME_HOLD_SECS * 1000;

    // Build input args: each frame as a still image looped for FRAME_HOLD_SECS
    const inputArgs: string[] = [];
    for (const fp of framePaths) {
      inputArgs.push("-loop", "1", "-t", String(FRAME_HOLD_SECS + CROSSFADE_SECS), "-i", fp);
    }

    // Build filter_complex: scale each input, then chain xfade dissolves
    const filterParts: string[] = [];

    // Scale all inputs to target resolution
    for (let i = 0; i < n; i++) {
      filterParts.push(
        `[${i}:v]scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},setsar=1,fps=24[v${i}]`
      );
    }

    // Chain xfade dissolves
    // xfade offset = cumulative hold time of previous frames
    let prevLabel = "v0";
    let cumulativeOffset = FRAME_HOLD_SECS; // first xfade starts at end of first frame hold
    for (let i = 1; i < n; i++) {
      const outLabel = i === n - 1 ? "vout" : `xf${i}`;
      filterParts.push(
        `[${prevLabel}][v${i}]xfade=transition=dissolve:duration=${CROSSFADE_SECS}:offset=${cumulativeOffset}[${outLabel}]`
      );
      prevLabel = outLabel;
      cumulativeOffset += FRAME_HOLD_SECS;
    }

    const filterComplex = filterParts.join("; ");

    const args = [
      "-y",
      ...inputArgs,
      "-filter_complex", filterComplex,
      "-map", "[vout]",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-an", // no audio — cinematic mode plays the track's audio separately
      outPath,
    ];

    await execFileAsync("ffmpeg", args, { timeout: FFMPEG_TIMEOUT_MS });

    const data = await fs.readFile(outPath);
    console.log(`[MusicVideo] Generated ${(data.length / 1024 / 1024).toFixed(2)}MB MP4 for song ${songId}`);

    // Upload to S3
    const s3Key = `music-videos/${songId}-${Date.now()}.mp4`;
    const { url } = await storagePut(s3Key, data, "video/mp4");
    console.log(`[MusicVideo] Uploaded to S3: ${url}`);
    return url;

  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────

async function updateMusicVideoStatus(
  songId: number,
  status: "pending" | "generating" | "complete" | "failed",
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ musicVideoStatus: status }).where(eq(songs.id, songId));
}

async function saveMusicVideoScript(songId: number, script: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ musicVideoScript: script }).where(eq(songs.id, songId));
}

async function saveMusicVideoUrl(songId: number, url: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({
    musicVideoUrl: url,
    musicVideoStatus: "complete",
  }).where(eq(songs.id, songId));
}
