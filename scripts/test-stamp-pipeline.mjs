/**
 * Phase 3 Integration Test — Sovereign Stamp Pipeline
 * Calls the stamp pipeline functions directly (bypasses HTTP auth).
 * Tests against song ID 1 ("Fix DA Server") — userId 1, WID confirmed.
 *
 * Run: node --loader tsx/esm scripts/test-stamp-pipeline.mjs
 * Or:  npx tsx scripts/test-stamp-pipeline.mjs
 */

import "dotenv/config";
import crypto from "crypto";
import mysql from "mysql2/promise";

const SONG_ID = 1;
const USER_ID = 1;
const FILE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/audio/1/1773721443170-Fix DA Server.mp3";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── Pre-check: confirm not already stamped ────────────────────────────────────
const [[song]] = await conn.execute(
  "SELECT id, sovereignStampId, fileUrl, fileHash FROM songs WHERE id = ?",
  [SONG_ID]
);

if (song.sovereignStampId) {
  console.log(`Song ${SONG_ID} is already stamped: ${song.sovereignStampId}`);
  await conn.end();
  process.exit(0);
}

console.log(`\n[Step 1] Downloading audio from: ${FILE_URL}`);
const response = await fetch(FILE_URL);
if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
const audioArrayBuffer = await response.arrayBuffer();
const audioBuffer = Buffer.from(audioArrayBuffer);
console.log(`  Downloaded ${audioBuffer.length} bytes`);

// ── Step 2: Compute original hash ─────────────────────────────────────────────
const originalHash = crypto.createHash("sha256").update(audioBuffer).digest("hex");
console.log(`\n[Step 2] Original hash: ${originalHash}`);

// ── Step 3: Generate Stamp ID ─────────────────────────────────────────────────
const ts = Date.now().toString(16).slice(-8).toUpperCase();
const hashSeg = originalHash.slice(0, 8).toUpperCase();
const stampId = `SS-${SONG_ID}-${USER_ID}-${ts}-${hashSeg}`;
console.log(`\n[Step 3] Stamp ID: ${stampId}`);

// ── Step 4: Derive tone frequency ─────────────────────────────────────────────
const hex = stampId.slice(-4);
const val = parseInt(hex, 16);
const freq = 18000 + (val % 2000);
console.log(`\n[Step 4] Tone frequency: ${freq} Hz`);

// ── Step 5: Inject tone via ffmpeg ────────────────────────────────────────────
// Import the compiled TS module via tsx
const { injectTone } = await import("../server/sovereignStamp.ts");
console.log(`\n[Step 5] Injecting tone...`);
const stampedBuffer = await injectTone(audioBuffer, stampId);
console.log(`  Stamped buffer: ${stampedBuffer.length} bytes`);

// ── Step 6: Compute stamped hash ──────────────────────────────────────────────
const stampedHash = crypto.createHash("sha256").update(stampedBuffer).digest("hex");
console.log(`\n[Step 6] Stamped hash: ${stampedHash}`);
console.log(`  Hash changed: ${originalHash !== stampedHash ? "YES (correct)" : "NO (unexpected)"}`);

// ── Step 7: Upload stamped audio ──────────────────────────────────────────────
const { storagePut } = await import("../server/storage.ts");
const stampedKey = `audio/${USER_ID}/stamped-${Date.now()}-Fix-DA-Server.wav`;
console.log(`\n[Step 7] Uploading stamped audio to key: ${stampedKey}`);
const { url: stampedFileUrl, key: stampedFileKey } = await storagePut(
  stampedKey,
  stampedBuffer,
  "audio/wav"
);
console.log(`  Stamped file URL: ${stampedFileUrl}`);

// ── Step 8: Generate certificate ──────────────────────────────────────────────
const { generateCertificate } = await import("../server/stampCertificate.ts");
console.log(`\n[Step 8] Generating certificate...`);
const { certificateUrl, certificateKey, certificateText } = await generateCertificate({
  stampId,
  song: {
    id: SONG_ID,
    userId: USER_ID,
    title: "Fix DA Server",
    witnessId: "WID-MUS-C1FCC012-70E4B7CC",
    fileHash: originalHash,
    aiDisclosure: null,
    haaiVisualConcept: null,
    haaiStyleLanguage: null,
    haaiInstrumentation: null,
    haaiVocalConveyance: null,
    haaiLyricalInspiration: null,
    haaiEmotionalTone: null,
    haaiDeclaredAt: null,
  },
  stampedFileHash: stampedHash,
  stampedAt: new Date(),
});
console.log(`  Certificate URL: ${certificateUrl}`);
console.log(`\n--- Certificate Preview ---`);
console.log(certificateText.split("\n").slice(0, 12).join("\n"));
console.log("...");

// ── Step 9: Update DB row ─────────────────────────────────────────────────────
console.log(`\n[Step 9] Updating database row for song ${SONG_ID}...`);
await conn.execute(
  `UPDATE songs SET
     sovereignStampId = ?,
     sovereignStampedAt = NOW(),
     stampedFileUrl = ?,
     stampedFileKey = ?,
     stampedFileHash = ?,
     certificateUrl = ?,
     certificateKey = ?
   WHERE id = ?`,
  [stampId, stampedFileUrl, stampedFileKey, stampedHash, certificateUrl, certificateKey, SONG_ID]
);

// ── Step 10: Verify DB row ────────────────────────────────────────────────────
const [[updated]] = await conn.execute(
  "SELECT sovereignStampId, sovereignStampedAt, stampedFileUrl, stampedFileHash FROM songs WHERE id = ?",
  [SONG_ID]
);
console.log(`\n[Step 10] DB row after update:`);
console.log(JSON.stringify(updated, null, 2));

await conn.end();

console.log(`\n✓ Phase 3 pipeline test COMPLETE`);
console.log(`  Stamp ID:        ${stampId}`);
console.log(`  Stamped audio:   ${stampedFileUrl}`);
console.log(`  Certificate:     ${certificateUrl}`);
console.log(`  Tone frequency:  ${freq} Hz`);
