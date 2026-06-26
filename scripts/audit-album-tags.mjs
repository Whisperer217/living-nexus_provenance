/**
 * Audit: check albumName and collectionTag for songs with NULL collectionId.
 * Run: node scripts/audit-album-tags.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Group live songs by albumName where collectionId is NULL
const [byAlbum] = await conn.execute(`
  SELECT albumName, collectionTag, COUNT(*) AS cnt,
         MIN(createdAt) AS firstUpload, MAX(createdAt) AS lastUpload,
         GROUP_CONCAT(id ORDER BY trackOrder, createdAt SEPARATOR ',') AS songIds
  FROM songs
  WHERE collectionId IS NULL AND status != 'Deleted' AND albumName IS NOT NULL AND albumName != ''
  GROUP BY albumName, collectionTag
  ORDER BY lastUpload DESC
  LIMIT 50
`);

console.log("=== Live songs grouped by albumName (collectionId IS NULL) ===");
for (const r of byAlbum) {
  console.log(`  "${r.albumName}" | tag: ${r.collectionTag} | ${r.cnt} songs | ids: ${r.songIds}`);
}

// Also check how many have NULL albumName
const [nullAlbum] = await conn.execute(`
  SELECT COUNT(*) AS cnt FROM songs WHERE collectionId IS NULL AND status != 'Deleted' AND (albumName IS NULL OR albumName = '')
`);
console.log(`\n  Songs with NULL/empty albumName AND NULL collectionId: ${nullAlbum[0].cnt}`);

// Check the batchUpload procedure to see what it sets for albumName
const [batchSample] = await conn.execute(`
  SELECT id, title, albumName, collectionTag, collectionId, createdAt
  FROM songs
  WHERE albumName IS NOT NULL AND albumName != '' AND collectionId IS NULL AND status != 'Deleted'
  ORDER BY createdAt DESC
  LIMIT 5
`);
console.log("\n=== Sample songs with albumName but no collectionId ===");
for (const s of batchSample) console.log("  " + JSON.stringify(s));

await conn.end();
console.log("\n=== Done ===");
