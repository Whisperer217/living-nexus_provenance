/**
 * audioMetadataStrip.ts
 *
 * Strips all embedded metadata (ID3 tags, EXIF, cover art, comments, lyrics,
 * encoder info, etc.) from audio files before they are stored to S3.
 *
 * Strategy:
 *   1. Use ffmpeg to remux the audio stream into a clean container with
 *      -map_metadata -1  (discard all global metadata)
 *      -map_chapters -1  (discard chapter markers)
 *      -vn               (drop any embedded video/cover-art streams)
 *      -c:a copy         (copy audio codec — no re-encode, no quality loss)
 *
 * Supported formats: mp3, wav, flac, ogg, aac, m4a, webm, opus
 *
 * If ffmpeg is unavailable or the strip fails, the original buffer is returned
 * unchanged so the upload always succeeds (fail-open, log the error).
 */

import { spawn } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, readFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";

/** Map common MIME types to ffmpeg-friendly output format names */
const MIME_TO_FORMAT: Record<string, string> = {
  "audio/mpeg":      "mp3",
  "audio/mp3":       "mp3",
  "audio/wav":       "wav",
  "audio/x-wav":     "wav",
  "audio/flac":      "flac",
  "audio/x-flac":    "flac",
  "audio/ogg":       "ogg",
  "audio/vorbis":    "ogg",
  "audio/aac":       "adts",
  "audio/x-aac":     "adts",
  "audio/mp4":       "mp4",
  "audio/x-m4a":     "mp4",
  "audio/m4a":       "mp4",
  "audio/webm":      "webm",
  "audio/opus":      "ogg",
};

/**
 * Strip all metadata from an audio buffer using ffmpeg.
 *
 * @param input    - Raw audio bytes
 * @param mimeType - MIME type of the audio (e.g. "audio/mpeg")
 * @returns        - Clean audio bytes (same codec, no metadata)
 */
export async function stripAudioMetadata(
  input: Buffer,
  mimeType: string
): Promise<Buffer> {
  const format = MIME_TO_FORMAT[mimeType.toLowerCase().split(";")[0].trim()];
  if (!format) {
    // Unknown format — return as-is
    console.warn(`[audioStrip] Unknown MIME type "${mimeType}" — skipping metadata strip`);
    return input;
  }

  const id = randomBytes(8).toString("hex");
  const inPath  = join(tmpdir(), `ln-strip-in-${id}`);
  const outPath = join(tmpdir(), `ln-strip-out-${id}.${format === "adts" ? "aac" : format}`);

  try {
    await writeFile(inPath, input);

    await new Promise<void>((resolve, reject) => {
      const args = [
        "-y",                    // overwrite output
        "-i", inPath,            // input file
        "-map_metadata", "-1",   // strip all global metadata
        "-map_chapters", "-1",   // strip chapter markers
        "-vn",                   // drop embedded cover-art / video streams
        "-c:a", "copy",          // copy audio stream (no re-encode)
        "-f", format,            // output format
        outPath,
      ];

      const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      proc.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}. stderr: ${stderr.slice(-500)}`));
        }
      });
      proc.on("error", reject);
    });

    const stripped = await readFile(outPath);
    return stripped;
  } catch (err) {
    console.error("[audioStrip] Metadata strip failed — using original buffer:", err instanceof Error ? err.message : err);
    return input; // fail-open: upload original if strip fails
  } finally {
    // Clean up temp files (best-effort)
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}
