/**
 * Living Nexus — Assign Missing WIDs
 * scripts/assign-missing-wids.mjs
 *
 * One-time script to assign WID-MUS identifiers to songs that have
 * audio files but no witnessId set. Generates WIDs using the same
 * SHA-256 pattern as the production upload pipeline.
 *
 * Target songs (as of April 2026 batch diagnostic):
 *   - Song 1470007: Prayer Warrior (user 330007)
 *   - Song 1710016: Virus Prime Phase 2 Theme - Overclocked Beast (user 180001)
 *
 * Usage:
 *   DRY_RUN=true  node --import tsx/esm scripts/assign-missing-wids.mjs
 *   node --import tsx/esm scripts/assign-missing-wids.mjs
 */

import { createHash, randomBytes } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, isNull, isNotNull, ne, inArray } from "drizzle-orm";
import { songs } from "../drizzle/schema.js";

const DRY_RUN = process.env.DRY_RUN === "true";

// ── Target song IDs ─────────────────────────────────────────────────────────
const TARGET_IDS = [1470007, 1710016];

// ── WID generation (mirrors production pattern in routers.ts) ───────────────
function generateWid(fileHash, userId) {
  const combinedHash = createHash("sha256")
    .update(`${fileHash ?? randomBytes(16).toString("hex")}:${userId}:${Date.now()}`)
    .digest("hex");
  return `WID-MUS-${combinedHash.slice(0, 8).toUpperCase()}-${combinedHash.slice(8, 16).toUpperCase()}`;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Living Nexus — Assign Missing WIDs");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  // Fetch the target songs
  const targets = await db
    .select({
      id: songs.id,
      userId: songs.userId,
      title: songs.title,
      fileUrl: songs.fileUrl,
      fileHash: songs.fileHash,
      witnessId: songs.witnessId,
      status: songs.status,
    })
    .from(songs)
    .where(inArray(songs.id, TARGET_IDS));

  if (targets.length === 0) {
    console.log("No target songs found. Nothing to do.");
    await connection.end();
    return;
  }

  console.log(`Found ${targets.length} target song(s):\n`);

  const results = [];

  for (const song of targets) {
    console.log(`─── Song ${song.id}: "${song.title}" (user ${song.userId}) ───`);
    console.log(`    Status:     ${song.status}`);
    console.log(`    fileUrl:    ${song.fileUrl ? "✓ present" : "✗ missing"}`);
    console.log(`    fileHash:   ${song.fileHash ?? "null"}`);
    console.log(`    witnessId:  ${song.witnessId ?? "null (needs WID)"}`);

    if (song.witnessId) {
      console.log(`    → Already has WID: ${song.witnessId} — skipping.\n`);
      results.push({ songId: song.id, title: song.title, status: "skipped", reason: "already has WID", wid: song.witnessId });
      continue;
    }

    if (!song.fileUrl) {
      console.log(`    → No fileUrl — cannot assign WID without audio.\n`);
      results.push({ songId: song.id, title: song.title, status: "skipped", reason: "no fileUrl", wid: null });
      continue;
    }

    const newWid = generateWid(song.fileHash, song.userId);
    console.log(`    → Generated WID: ${newWid}`);

    if (DRY_RUN) {
      console.log(`    → DRY RUN: would UPDATE songs SET witnessId = '${newWid}' WHERE id = ${song.id}\n`);
      results.push({ songId: song.id, title: song.title, status: "dry_run", wid: newWid });
    } else {
      await db
        .update(songs)
        .set({ witnessId: newWid })
        .where(eq(songs.id, song.id));
      console.log(`    → ✓ WID assigned and written to DB.\n`);
      results.push({ songId: song.id, title: song.title, status: "success", wid: newWid });
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  for (const r of results) {
    console.log(`  Song ${r.songId} "${r.title}": ${r.status.toUpperCase()} — WID: ${r.wid ?? "N/A"}`);
  }

  if (!DRY_RUN) {
    console.log("\n  ✓ WIDs assigned. Run batch-stamp-registry.mjs to stamp these songs.");
  } else {
    console.log("\n  DRY RUN complete. Re-run without DRY_RUN=true to apply.");
  }

  await connection.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
