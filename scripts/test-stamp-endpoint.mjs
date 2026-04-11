/**
 * Phase 3 Diagnostic — Test /api/stamp-song endpoint
 * Finds a stamp-eligible song and makes a direct DB check.
 * Run: node scripts/test-stamp-endpoint.mjs
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find 3 stamp-eligible songs (witnessId set, sovereignStampId null, fileUrl not null)
const [rows] = await conn.execute(
  `SELECT id, title, userId, witnessId, sovereignStampId, fileUrl, fileHash
   FROM songs
   WHERE witnessId IS NOT NULL
     AND sovereignStampId IS NULL
     AND fileUrl IS NOT NULL
     AND status != 'Deleted'
   LIMIT 3`
);

console.log("\n=== Stamp-eligible songs (sample) ===");
console.log(JSON.stringify(rows, null, 2));

if (rows.length === 0) {
  console.log("No stamp-eligible songs found.");
  await conn.end();
  process.exit(0);
}

// Also verify the 5 new columns exist
const [cols] = await conn.execute(
  `SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE
   FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_NAME = 'songs'
     AND COLUMN_NAME IN (
       'sovereignStampId', 'sovereignStampedAt',
       'stampedFileUrl', 'stampedFileKey', 'stampedFileHash'
     )
   ORDER BY COLUMN_NAME`
);

console.log("\n=== Sovereign Stamp columns on live songs table ===");
console.log(JSON.stringify(cols, null, 2));

await conn.end();
console.log("\nDiagnostic complete.");
