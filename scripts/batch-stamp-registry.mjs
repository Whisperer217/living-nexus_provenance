/**
 * Sovereign Stamp — Batch Registry Script
 * Phase 4 — scripts/batch-stamp-registry.mjs
 *
 * Issued by: BDDT Publishing / Command Domains LLC
 * Platform: Living Nexus — livingnexus.org
 *
 * Processes all stamp-eligible songs in the registry:
 *   - witnessId IS NOT NULL
 *   - sovereignStampId IS NULL
 *   - fileUrl IS NOT NULL
 *   - status != 'Deleted'
 *
 * Per-song pipeline:
 *   1. Download original audio
 *   2. Compute original SHA-256 hash
 *   3. Generate Stamp ID (SS-{songId}-{userId}-{ts8hex}-{hash8hex})
 *   4. Inject near-ultrasonic tone via ffmpeg
 *   5. Compute stamped SHA-256 hash
 *   6. Upload stamped WAV to S3
 *   7. Generate and upload provenance certificate
 *   8. Update DB row (sovereignStampId, sovereignStampedAt, stampedFileUrl,
 *      stampedFileKey, stampedFileHash, certificateUrl, certificateKey)
 *
 * Safety:
 *   - 500ms delay between songs to avoid S3/DB thundering-herd
 *   - Per-song try/catch — one failure does NOT abort the batch
 *   - Dry-run mode: set DRY_RUN=true to query eligible songs and exit
 *
 * Usage:
 *   node --import tsx/esm scripts/batch-stamp-registry.mjs
 *   DRY_RUN=true node --import tsx/esm scripts/batch-stamp-registry.mjs
 *
 * Output:
 *   scripts/batch-stamp-report-{timestamp}.json
 */

import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Resolve __dirname for ESM ─────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ────────────────────────────────────────────────────────────────────
const DRY_RUN = process.env.DRY_RUN === "true";
const DELAY_MS = 500;
const BATCH_SIZE = 100; // fetch in pages to avoid huge result sets

// ── Lazy-import server modules (require tsx loader) ───────────────────────────
const { injectTone, generateStampId } = await import("../server/sovereignStamp.ts");
const { storagePut } = await import("../server/storage.ts");
const { generateCertificate } = await import("../server/stampCertificate.ts");

// ── DB connection ─────────────────────────────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ── Report state ──────────────────────────────────────────────────────────────
const reportTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = path.join(
  __dirname,
  `batch-stamp-report-${reportTimestamp}.json`
);

const report = {
  startedAt: new Date().toISOString(),
  completedAt: null,
  dryRun: DRY_RUN,
  totalEligible: 0,
  processed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  results: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sleep for ms milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch all stamp-eligible songs in paginated batches */
async function fetchEligibleSongs() {
  const songs = [];
  let offset = 0;
  while (true) {
    const [rows] = await conn.execute(
      `SELECT id, userId, title, witnessId, fileUrl, fileKey, fileHash,
              aiDisclosure,
              haaiVisualConcept, haaiStyleLanguage, haaiInstrumentation,
              haaiVocalConveyance, haaiLyricalInspiration, haaiEmotionalTone,
              haaiDeclaredAt
       FROM songs
       WHERE witnessId IS NOT NULL
         AND sovereignStampId IS NULL
         AND fileUrl IS NOT NULL
         AND status != 'Deleted'
       ORDER BY id ASC
       LIMIT ? OFFSET ?`,
      [BATCH_SIZE, offset]
    );
    if (rows.length === 0) break;
    songs.push(...rows);
    offset += rows.length;
    if (rows.length < BATCH_SIZE) break;
  }
  return songs;
}

/** Process a single song through the full stamp pipeline */
async function stampSong(song) {
  const result = {
    songId: song.id,
    userId: song.userId,
    title: song.title,
    witnessId: song.witnessId,
    stampId: null,
    toneFrequencyHz: null,
    originalHash: null,
    stampedHash: null,
    stampedFileUrl: null,
    certificateUrl: null,
    status: "pending",
    error: null,
    durationMs: null,
  };

  const t0 = Date.now();

  try {
    // ── Step 1: Download original audio ────────────────────────────────────
    const audioResponse = await fetch(song.fileUrl);
    if (!audioResponse.ok) {
      throw new Error(`Audio fetch failed: HTTP ${audioResponse.status} for ${song.fileUrl}`);
    }
    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    // ── Step 2: Compute original hash ──────────────────────────────────────
    const originalHash = crypto
      .createHash("sha256")
      .update(audioBuffer)
      .digest("hex");
    result.originalHash = originalHash;

    // ── Step 3: Generate Stamp ID ──────────────────────────────────────────
    const stampId = generateStampId(song.id, song.userId, originalHash);
    result.stampId = stampId;

    // ── Step 3b: Derive tone frequency for report ──────────────────────────
    const hex = stampId.slice(-4);
    const val = parseInt(hex, 16);
    result.toneFrequencyHz = 18000 + (val % 2000);

    // ── Step 4: Inject tone ────────────────────────────────────────────────
    const stampedBuffer = await injectTone(audioBuffer, stampId);

    // ── Step 5: Compute stamped hash ───────────────────────────────────────
    const stampedHash = crypto
      .createHash("sha256")
      .update(stampedBuffer)
      .digest("hex");
    result.stampedHash = stampedHash;

    // ── Step 6: Upload stamped audio ───────────────────────────────────────
    const originalFilename =
      (song.fileKey ?? song.fileUrl).split("/").pop() ?? "audio.wav";
    const stampedKey = `audio/${song.userId}/stamped-${Date.now()}-${originalFilename}`;
    const { url: stampedFileUrl, key: stampedFileKey } = await storagePut(
      stampedKey,
      stampedBuffer,
      "audio/wav"
    );
    result.stampedFileUrl = stampedFileUrl;

    // ── Step 7: Generate and upload certificate ────────────────────────────
    const { certificateUrl, certificateKey } = await generateCertificate({
      stampId,
      song,
      stampedFileHash: stampedHash,
      stampedAt: new Date(),
    });
    result.certificateUrl = certificateUrl;

    // ── Step 8: Update DB row ──────────────────────────────────────────────
    await conn.execute(
      `UPDATE songs SET
         sovereignStampId    = ?,
         sovereignStampedAt  = NOW(),
         stampedFileUrl      = ?,
         stampedFileKey      = ?,
         stampedFileHash     = ?,
         certificateUrl      = ?,
         certificateKey      = ?
       WHERE id = ?`,
      [
        stampId,
        stampedFileUrl,
        stampedFileKey,
        stampedHash,
        certificateUrl,
        certificateKey,
        song.id,
      ]
    );

    result.status = "success";
  } catch (err) {
    result.status = "failed";
    result.error = err instanceof Error ? err.message : String(err);
  }

  result.durationMs = Date.now() - t0;
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════════════════════");
console.log("  SOVEREIGN STAMP — BATCH REGISTRY");
console.log("  Issued by: BDDT Publishing / Command Domains LLC");
console.log("  Platform:  Living Nexus — livingnexus.org");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`  Mode:      ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
console.log(`  Delay:     ${DELAY_MS}ms between songs`);
console.log(`  Report:    ${reportPath}`);
console.log("───────────────────────────────────────────────────────────────\n");

// ── Fetch eligible songs ──────────────────────────────────────────────────────
console.log("[Batch] Querying stamp-eligible songs...");
const songs = await fetchEligibleSongs();
report.totalEligible = songs.length;

console.log(`[Batch] Found ${songs.length} stamp-eligible songs.\n`);

if (DRY_RUN) {
  console.log("[DRY RUN] Eligible song IDs:");
  songs.forEach((s) =>
    console.log(`  Song ${s.id} — "${s.title}" (user ${s.userId}) | WID: ${s.witnessId}`)
  );
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n[DRY RUN] Report written to: ${reportPath}`);
  await conn.end();
  process.exit(0);
}

if (songs.length === 0) {
  console.log("[Batch] No eligible songs to process. Exiting.");
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  await conn.end();
  process.exit(0);
}

// ── Process songs ─────────────────────────────────────────────────────────────
for (let i = 0; i < songs.length; i++) {
  const song = songs[i];
  const progress = `[${i + 1}/${songs.length}]`;

  console.log(`${progress} Stamping song ${song.id} — "${song.title}" (user ${song.userId})`);

  const result = await stampSong(song);
  report.results.push(result);
  report.processed++;

  if (result.status === "success") {
    report.succeeded++;
    console.log(
      `  ✓ ${result.stampId} | ${result.toneFrequencyHz} Hz | ${result.durationMs}ms`
    );
  } else {
    report.failed++;
    console.error(`  ✗ FAILED: ${result.error}`);
  }

  // Write incremental report after every song so partial progress is never lost
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // 500ms delay between songs (skip after last)
  if (i < songs.length - 1) {
    await sleep(DELAY_MS);
  }
}

// ── Final summary ─────────────────────────────────────────────────────────────
report.completedAt = new Date().toISOString();
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

await conn.end();

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  BATCH COMPLETE");
console.log(`  Total eligible: ${report.totalEligible}`);
console.log(`  Processed:      ${report.processed}`);
console.log(`  Succeeded:      ${report.succeeded}`);
console.log(`  Failed:         ${report.failed}`);
console.log(`  Report:         ${reportPath}`);
console.log("═══════════════════════════════════════════════════════════════\n");

if (report.failed > 0) {
  console.warn(`[Batch] ${report.failed} song(s) failed. Review report for details.`);
  process.exit(1);
} else {
  process.exit(0);
}
