/**
 * Restoration script: create missing collection records for songs grouped by albumName.
 * Groups all live songs with albumName set but collectionId = NULL.
 * Creates a collections record for each unique albumName, then updates songs.collectionId.
 *
 * Run: node scripts/restore-collections.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import crypto from "crypto";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Helper: generate a WID-ALB code
function generateAlbumWid() {
  const a = crypto.randomBytes(4).toString("hex").toUpperCase();
  const b = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `WID-ALB-${a}-${b}`;
}

// 1. Get all unique albumNames for live songs with NULL collectionId
const [groups] = await conn.execute(`
  SELECT albumName, 
         MIN(userId) AS creatorUserId,
         COUNT(*) AS songCount,
         MIN(createdAt) AS firstCreated,
         GROUP_CONCAT(id ORDER BY trackOrder, createdAt SEPARATOR ',') AS songIds
  FROM songs
  WHERE collectionId IS NULL 
    AND status != 'Deleted' 
    AND albumName IS NOT NULL 
    AND albumName != ''
    AND albumName NOT IN ('Single')
  GROUP BY albumName
  ORDER BY firstCreated DESC
`);

console.log(`Found ${groups.length} album groups to restore.\n`);

let created = 0;
let skipped = 0;

for (const group of groups) {
  const { albumName, creatorUserId, songCount, songIds } = group;
  const ids = songIds.split(",").map(Number);

  // Check if a collection with this name already exists for this creator
  const [existing] = await conn.execute(
    `SELECT id FROM collections WHERE name = ? AND creatorId = ? LIMIT 1`,
    [albumName, creatorUserId]
  );

  if (existing.length > 0) {
    // Collection already exists — just link the songs
    const existingId = existing[0].id;
    const placeholders = ids.map(() => "?").join(",");
    await conn.execute(
      `UPDATE songs SET collectionId = ? WHERE id IN (${placeholders}) AND collectionId IS NULL`,
      [existingId, ...ids]
    );
    console.log(`  LINKED "${albumName}" → existing collection [${existingId}] (${songCount} songs)`);
    skipped++;
    continue;
  }

  // Create new collection record
  const widCode = generateAlbumWid();
  const now = new Date();

  // Generate a placeholder collectiveHash (will be recalculated on next WID event)
  const placeholderHash = crypto.randomBytes(32).toString("hex");
  const [result] = await conn.execute(
    `INSERT INTO collections (name, creatorId, collectionWid, collectiveHash, trackCount, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [albumName, creatorUserId, widCode, placeholderHash, ids.length, now]
  );
  const newCollectionId = result.insertId;

  // Link all songs to the new collection
  const placeholders = ids.map(() => "?").join(",");
  await conn.execute(
    `UPDATE songs SET collectionId = ? WHERE id IN (${placeholders})`,
    [newCollectionId, ...ids]
  );

  console.log(`  CREATED "${albumName}" → [${newCollectionId}] ${widCode} (${songCount} songs)`);
  created++;
}

console.log(`\n=== Restoration complete ===`);
console.log(`  Created: ${created} new collection records`);
console.log(`  Linked to existing: ${skipped}`);

// Verify final state
const [finalCount] = await conn.execute(`
  SELECT COUNT(DISTINCT c.id) AS collCount,
         SUM(CASE WHEN s.status != 'Deleted' THEN 1 ELSE 0 END) AS liveTrackCount
  FROM collections c
  LEFT JOIN songs s ON s.collectionId = c.id
`);
console.log(`\n  Total collections now: ${finalCount[0].collCount}`);
console.log(`  Total live tracks in collections: ${finalCount[0].liveTrackCount}`);

await conn.end();
