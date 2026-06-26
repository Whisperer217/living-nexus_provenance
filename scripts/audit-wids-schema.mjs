/**
 * Audit script: check wids table structure and find album WID data.
 * Run: node scripts/audit-wids-schema.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check wids table columns
const [cols] = await conn.execute("DESCRIBE wids");
console.log("=== wids table columns ===");
for (const c of cols) console.log(`  ${c.Field} (${c.Type})`);

// Check songs table for any album-related columns
const [songCols] = await conn.execute("DESCRIBE songs");
console.log("\n=== songs table columns (album-related) ===");
for (const c of songCols) {
  if (/album|collection|batch|group|lp/i.test(c.Field)) {
    console.log(`  ${c.Field} (${c.Type})`);
  }
}

// Sample a few songs with NULL collectionId to see what data they have
const [sample] = await conn.execute(`
  SELECT id, title, status, collectionId, genre, createdAt
  FROM songs 
  WHERE collectionId IS NULL AND status != 'Deleted'
  ORDER BY createdAt DESC
  LIMIT 5
`);
console.log("\n=== Sample live songs with NULL collectionId ===");
for (const s of sample) console.log("  " + JSON.stringify(s));

// Check if there's a batchUploadId or similar field
const [batchCheck] = await conn.execute(`
  SELECT id, title, collectionId, createdAt
  FROM songs
  WHERE status != 'Deleted' AND collectionId IS NULL
  ORDER BY createdAt DESC
  LIMIT 3
`);
console.log("\n=== Most recently uploaded live songs without collection ===");
for (const s of batchCheck) console.log("  " + JSON.stringify(s));

await conn.end();
console.log("\n=== Done ===");
