/**
 * Harmonic Signature Route
 * GET /api/harmonic/:songId/audio  → streams a .wav file derived from the song's harmonic frequencies
 * GET /api/harmonic/:songId/image  → streams a waveform .png derived from the same frequencies
 *
 * These are the downloadable "sonic fingerprint" files for each registered artifact.
 * The frequencies are derived from the SHA-256 file hash at upload time — deterministic and unique.
 *
 * NOTE: PNG generation uses jimp (pure JS) — no native binaries required for deployment.
 */

import { Router } from "express";
import { Jimp } from "jimp";
import { getDb } from "./db.js";
import { songs } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

export const harmonicRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a 16-bit PCM WAV buffer from an array of frequencies.
 *  Each frequency is played as a pure sine wave, all mixed together.
 *  Duration: 4 seconds. Sample rate: 44100 Hz.
 */
function buildWavBuffer(frequencies: number[]): Buffer {
  const SAMPLE_RATE = 44100;
  const DURATION_S  = 4;
  const NUM_SAMPLES = SAMPLE_RATE * DURATION_S;
  const NUM_CHANNELS = 1;
  const BITS_PER_SAMPLE = 16;
  const BYTE_RATE = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const BLOCK_ALIGN = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const DATA_SIZE = NUM_SAMPLES * BLOCK_ALIGN;
  const HEADER_SIZE = 44;

  const buf = Buffer.alloc(HEADER_SIZE + DATA_SIZE);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + DATA_SIZE, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);           // PCM chunk size
  buf.writeUInt16LE(1, 20);            // PCM format
  buf.writeUInt16LE(NUM_CHANNELS, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(BYTE_RATE, 28);
  buf.writeUInt16LE(BLOCK_ALIGN, 32);
  buf.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(DATA_SIZE, 40);

  // Mix all frequencies as sine waves with equal amplitude
  const amplitude = 0.8 / Math.max(frequencies.length, 1);
  const TWO_PI = 2 * Math.PI;

  for (let i = 0; i < NUM_SAMPLES; i++) {
    let sample = 0;
    const t = i / SAMPLE_RATE;

    // Fade in first 0.1s, fade out last 0.3s
    let envelope = 1.0;
    if (t < 0.1) envelope = t / 0.1;
    else if (t > DURATION_S - 0.3) envelope = (DURATION_S - t) / 0.3;

    for (const freq of frequencies) {
      sample += Math.sin(TWO_PI * freq * t) * amplitude * envelope;
    }

    // Clamp and convert to 16-bit signed int
    const clamped = Math.max(-1, Math.min(1, sample));
    const int16 = Math.round(clamped * 32767);
    buf.writeInt16LE(int16, HEADER_SIZE + i * 2);
  }

  return buf;
}

/** Convert RGBA components (0–255 each) to a 32-bit RGBA integer for jimp. */
function rgba(r: number, g: number, b: number, a: number): number {
  return ((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff);
}

/** Frequency palette — gold gradient, 6 entries */
const FREQ_PALETTE = [
  rgba(196, 154,  40, 230),
  rgba(251, 191,  36, 191),
  rgba(245, 158,  11, 166),
  rgba(234, 179,   8, 140),
  rgba(161,  98,   7, 128),
  rgba(120,  53,  15, 115),
];

/**
 * Build a waveform PNG from an array of frequencies using jimp (pure JS).
 * Renders a multi-frequency waveform visualization on a dark background.
 */
async function buildWaveformPng(frequencies: number[], _songTitle: string): Promise<Buffer> {
  const WIDTH  = 800;   // reduced from 1200 — jimp pixel-by-pixel is slower
  const HEIGHT = 300;

  // Create dark background (#0D0B07)
  const img = new Jimp({ width: WIDTH, height: HEIGHT, color: rgba(13, 11, 7, 255) });

  // Draw subtle horizontal grid lines
  const gridColor = rgba(196, 154, 40, 20);
  for (let y = 0; y <= HEIGHT; y += Math.floor(HEIGHT / 4)) {
    for (let x = 0; x < WIDTH; x++) img.setPixelColor(gridColor, x, y);
  }
  // Draw subtle vertical grid lines
  for (let x = 0; x <= WIDTH; x += Math.floor(WIDTH / 8)) {
    for (let y = 0; y < HEIGHT; y++) img.setPixelColor(gridColor, x, y);
  }

  // Draw center line
  const centerLineColor = rgba(196, 154, 40, 51);
  const cy = Math.floor(HEIGHT / 2);
  for (let x = 0; x < WIDTH; x++) img.setPixelColor(centerLineColor, x, cy);

  const AMPLITUDE = HEIGHT * 0.35;
  const TWO_PI    = 2 * Math.PI;
  const lowestFreq = Math.min(...frequencies, 110);
  const CYCLES = 3;
  const TIME_WINDOW = CYCLES / lowestFreq;

  // Draw each frequency as a sine wave (anti-aliased via vertical line segments)
  frequencies.forEach((freq, idx) => {
    const color = FREQ_PALETTE[idx % FREQ_PALETTE.length];
    const lineWidth = idx === 0 ? 2 : 1;

    for (let px = 0; px < WIDTH; px++) {
      const t = (px / WIDTH) * TIME_WINDOW;
      const yf = HEIGHT / 2 - Math.sin(TWO_PI * freq * t) * AMPLITUDE * (1 - idx * 0.08);
      const y = Math.round(yf);

      // Draw a vertical segment of `lineWidth` pixels for thickness
      for (let dy = -Math.floor(lineWidth / 2); dy <= Math.floor(lineWidth / 2); dy++) {
        const py = y + dy;
        if (py >= 0 && py < HEIGHT) img.setPixelColor(color, px, py);
      }
    }
  });

  // Dominant frequency glow (first freq, wider stroke, semi-transparent gold)
  if (frequencies.length > 0) {
    const glowColor = rgba(196, 154, 40, 102);
    const freq = frequencies[0];
    for (let px = 0; px < WIDTH; px++) {
      const t = (px / WIDTH) * TIME_WINDOW;
      const yf = HEIGHT / 2 - Math.sin(TWO_PI * freq * t) * AMPLITUDE;
      const y = Math.round(yf);
      for (let dy = -2; dy <= 2; dy++) {
        const py = y + dy;
        if (py >= 0 && py < HEIGHT) img.setPixelColor(glowColor, px, py);
      }
    }
  }

  return img.getBuffer("image/png");
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /api/harmonic/:songId/audio — download the harmonic signature as a .wav file */
harmonicRouter.get("/:songId/audio", async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    if (isNaN(songId)) return res.status(400).json({ error: "Invalid song ID" });

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const [song] = await db.select({
      id: songs.id,
      title: songs.title,
      harmonicSignature: songs.harmonicSignature,
      witnessId: songs.witnessId,
    }).from(songs).where(eq(songs.id, songId)).limit(1);

    if (!song) return res.status(404).json({ error: "Song not found" });

    const frequencies = (song.harmonicSignature as number[] | null) ?? [];
    if (frequencies.length === 0) {
      return res.status(404).json({ error: "No harmonic signature found for this artifact" });
    }

    const wavBuffer = buildWavBuffer(frequencies);
    const safeName  = (song.title || "harmonic").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const widSlug   = song.witnessId ? `_${song.witnessId.replace(/[^a-z0-9]/gi, "_")}` : "";
    const filename  = `${safeName}${widSlug}_harmonic.wav`;

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", wavBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(wavBuffer);
  } catch (err) {
    console.error("[harmonicRoute] audio error:", err);
    res.status(500).json({ error: "Failed to generate harmonic audio" });
  }
});

/** GET /api/harmonic/:songId/image — download the waveform visualization as a .png file */
harmonicRouter.get("/:songId/image", async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    if (isNaN(songId)) return res.status(400).json({ error: "Invalid song ID" });

    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const [song] = await db.select({
      id: songs.id,
      title: songs.title,
      harmonicSignature: songs.harmonicSignature,
      witnessId: songs.witnessId,
    }).from(songs).where(eq(songs.id, songId)).limit(1);

    if (!song) return res.status(404).json({ error: "Song not found" });

    const frequencies = (song.harmonicSignature as number[] | null) ?? [];
    if (frequencies.length === 0) {
      return res.status(404).json({ error: "No harmonic signature found for this artifact" });
    }

    const pngBuffer = await buildWaveformPng(frequencies, song.title || "Untitled");
    const safeName  = (song.title || "harmonic").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const widSlug   = song.witnessId ? `_${song.witnessId.replace(/[^a-z0-9]/gi, "_")}` : "";
    const filename  = `${safeName}${widSlug}_waveform.png`;

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pngBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(pngBuffer);
  } catch (err) {
    console.error("[harmonicRoute] image error:", err);
    res.status(500).json({ error: "Failed to generate waveform image" });
  }
});
