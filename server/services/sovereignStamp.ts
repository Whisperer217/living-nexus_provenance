/**
 * Sovereign Stamp — Tone Injection Engine
 * Phase 2 — server/sovereignStamp.ts
 *
 * Issued by: BDDT Publishing / Command Domains LLC
 * Platform: Living Nexus — livingnexus.org
 *
 * Injects a deterministic near-ultrasonic sine tone into an audio buffer.
 * The tone frequency is derived from the Stamp ID — 18–20 kHz range,
 * mixed at -40 dBFS so it is present in the signal but not perceptible
 * to most listeners.
 *
 * The tone constitutes a human-authored expressive element under
 * 17 U.S.C. § 102(a) — the deliberate act of selection and embedding
 * is the creative decision.
 */

import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Derive a deterministic tone frequency from a Stamp ID.
 * Result is in the 18,000–19,999 Hz range (near-ultrasonic).
 */
export function deriveToneFrequency(stampId: string): number {
  // Take the last 4 hex characters of the stamp ID
  const hex = stampId.slice(-4);
  const val = parseInt(hex, 16);
  return 18000 + (val % 2000);
}

/**
 * Generate a Stamp ID from song and user identifiers.
 * Format: SS-{songId}-{userId}-{timestamp8hex}-{hash8hex}
 */
export function generateStampId(
  songId: number,
  userId: number,
  fileHash: string
): string {
  const ts = Date.now().toString(16).slice(-8).toUpperCase();
  const hashSeg = fileHash.slice(0, 8).toUpperCase();
  return `SS-${songId}-${userId}-${ts}-${hashSeg}`;
}

/**
 * Inject a Sovereign Stamp tone into an audio buffer.
 *
 * @param audioBuffer - Raw audio file bytes (WAV or MP3)
 * @param stampId     - The Stamp ID (used to derive tone frequency)
 * @returns           - Stamped audio buffer (WAV format)
 */
export async function injectTone(
  audioBuffer: Buffer,
  stampId: string
): Promise<Buffer> {
  const freq = deriveToneFrequency(stampId);
  const tmpDir = os.tmpdir();
  const uid = crypto.randomBytes(8).toString("hex");
  const inputPath = path.join(tmpDir, `ss-input-${uid}`);
  const outputPath = path.join(tmpDir, `ss-output-${uid}.wav`);

  // Write input buffer to temp file
  await fs.promises.writeFile(inputPath, audioBuffer);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        // Generate sine tone at derived frequency for the full track duration
        .input(`sine=frequency=${freq}:sample_rate=44100`)
        .inputFormat("lavfi")
        .complexFilter([
          // Mix original audio with the tone at -40 dBFS
          // volume=0.01 ≈ -40 dBFS
          `[1:a]volume=0.01[tone]`,
          `[0:a][tone]amix=inputs=2:duration=first:dropout_transition=2[out]`,
        ])
        .outputOptions(["-map [out]", "-ar 44100", "-ac 2"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    const stampedBuffer = await fs.promises.readFile(outputPath);
    return stampedBuffer;
  } finally {
    // Clean up temp files — always, even on error
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
  }
}
