/**
 * Audit script: find live songs for the three missing albums and their collectionIds.
 * Run: node scripts/audit-missing-collections.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Show all current collections with live track counts
const [allCollections] = await conn.execute(`
  SELECT c.id, c.name, c.collectionWid,
         COUNT(s.id) AS liveCount
  FROM collections c
  LEFT JOIN songs s ON s.collectionId = c.id AND s.status != 'Deleted'
  GROUP BY c.id
  ORDER BY c.id DESC
  LIMIT 30
`);
console.log("=== Current collections with live track counts ===");
for (const c of allCollections) {
  console.log(`  [${c.id}] "${c.name}" — ${c.liveCount} live tracks (${c.collectionWid})`);
}

// 2. Find songs with collectionId pointing to a deleted/missing collection
const [orphanedSongs] = await conn.execute(`
  SELECT s.id, s.title, s.status, s.collectionId, s.isPublic
  FROM songs s
  LEFT JOIN collections c ON c.id = s.collectionId
  WHERE s.collectionId IS NOT NULL AND c.id IS NULL AND s.status != 'Deleted'
  ORDER BY s.collectionId, s.trackOrder
  LIMIT 200
`);
console.log("\n=== Live songs with orphaned collectionId (collection was deleted) ===");
const byCollId = {};
for (const r of orphanedSongs) {
  const key = String(r.collectionId);
  if (!byCollId[key]) byCollId[key] = [];
  byCollId[key].push(r);
}
for (const [collId, songs] of Object.entries(byCollId)) {
  console.log(`  collectionId ${collId}: ${songs.length} live songs`);
  for (const s of songs) {
    console.log(`    - [${s.id}] "${s.title}" (${s.status})`);
  }
}

// 3. Show all live songs with NULL collectionId (not in any collection)
const [noCollection] = await conn.execute(`
  SELECT COUNT(*) AS cnt FROM songs WHERE collectionId IS NULL AND status != 'Deleted'
`);
console.log(`\n=== Live songs with no collectionId: ${noCollection[0].cnt} ===`);

await conn.end();
console.log("\n=== Audit complete ===");
