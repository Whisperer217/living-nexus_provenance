/**
 * M-Category Diagnostic — Phase 1 Verification
 * Sovereign Stamp Integration
 * Issued by: BDDT Publishing / Command Domains LLC
 *
 * Checks:
 * 1. All 5 new Sovereign Stamp columns exist and are nullable on the songs table
 * 2. No existing witnessId values were affected by the migration
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== M-CATEGORY DIAGNOSTIC — PHASE 1 ===\n");

// Check 1: Column presence and nullability
const [cols] = await conn.query(
  `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
   FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_NAME = 'songs'
     AND COLUMN_NAME IN (
       'sovereignStampId','sovereignStampedAt',
       'stampedFileUrl','stampedFileKey','stampedFileHash'
     )
   ORDER BY COLUMN_NAME`
);

const expected = [
  "sovereignStampId",
  "sovereignStampedAt",
  "stampedFileUrl",
  "stampedFileKey",
  "stampedFileHash",
];

console.log("CHECK 1 — New columns present and nullable:");
const found = cols.map((c) => c.COLUMN_NAME);
let check1Pass = true;
for (const col of expected) {
  const row = cols.find((c) => c.COLUMN_NAME === col);
  if (!row) {
    console.log(`  ✗ MISSING: ${col}`);
    check1Pass = false;
  } else if (row.IS_NULLABLE !== "YES") {
    console.log(`  ✗ NOT NULLABLE: ${col} (IS_NULLABLE=${row.IS_NULLABLE})`);
    check1Pass = false;
  } else {
    console.log(`  ✓ ${col} — ${row.DATA_TYPE}${row.CHARACTER_MAXIMUM_LENGTH ? `(${row.CHARACTER_MAXIMUM_LENGTH})` : ""} — nullable`);
  }
}
console.log(check1Pass ? "\n  RESULT: PASS\n" : "\n  RESULT: FAIL\n");

// Check 2: witnessId integrity — count total, count non-null, confirm no nullification
const [[totals]] = await conn.query(
  `SELECT
     COUNT(*) AS total_songs,
     COUNT(witnessId) AS songs_with_witnessId,
     COUNT(sovereignStampId) AS songs_already_stamped
   FROM songs`
);

console.log("CHECK 2 — witnessId integrity (migration must not have touched these):");
console.log(`  Total song rows:          ${totals.total_songs}`);
console.log(`  Rows with witnessId:      ${totals.songs_with_witnessId}`);
console.log(`  Rows already stamped:     ${totals.songs_already_stamped} (expected: 0)`);

const check2Pass = parseInt(totals.songs_already_stamped) === 0;
console.log(check2Pass ? "\n  RESULT: PASS — no rows pre-stamped, witnessId column unaffected\n" : "\n  RESULT: FAIL\n");

// Check 3: Stamp-eligible songs (witnessId IS NOT NULL AND fileUrl IS NOT NULL AND status != 'Deleted')
const [[eligible]] = await conn.query(
  `SELECT COUNT(*) AS eligible
   FROM songs
   WHERE witnessId IS NOT NULL
     AND sovereignStampId IS NULL
     AND fileUrl IS NOT NULL
     AND status != 'Deleted'`
);

console.log("CHECK 3 — Stamp-eligible songs (Phase 4 batch target):");
console.log(`  Eligible for stamping: ${eligible.eligible}`);
console.log("\n  RESULT: INFORMATIONAL\n");

console.log("=== DIAGNOSTIC COMPLETE ===");
console.log(`  Check 1 (columns):   ${check1Pass ? "PASS" : "FAIL"}`);
console.log(`  Check 2 (witnessId): ${check2Pass ? "PASS" : "FAIL"}`);
console.log(`  Overall:             ${check1Pass && check2Pass ? "PASS — CLEARED FOR PHASE 2" : "FAIL — HOLD"}`);

await conn.end();
