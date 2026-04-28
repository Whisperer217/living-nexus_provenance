/**
 * Migration: fix songReactions column schema drift
 * Live DB has column `emoji` (varchar 10, utf8mb4) with a composite unique index
 * Drizzle schema expects column `type` (varchar 16)
 * 
 * Steps:
 * 1. Show indexes on the table
 * 2. Drop the composite index that covers emoji
 * 3. Drop the emoji column
 * 4. Widen `type` to varchar(32) and remove DEFAULT
 * 5. Add the unique index on (userId, songId, type)
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);
console.log("Connected.");

// Show all indexes
const [indexes] = await conn.execute(`SHOW INDEX FROM songReactions`);
console.log("Current indexes:", indexes.map(i => ({ name: i.Key_name, col: i.Column_name })));

// Drop any index that covers the emoji column
const emojiIndexes = indexes.filter(i => i.Column_name === 'emoji' && i.Key_name !== 'PRIMARY');
for (const idx of emojiIndexes) {
  console.log(`Dropping index: ${idx.Key_name}`);
  await conn.execute(`ALTER TABLE songReactions DROP INDEX \`${idx.Key_name}\``);
}

// Drop the emoji column
await conn.execute(`ALTER TABLE songReactions DROP COLUMN emoji`);
console.log("Dropped emoji column.");

// Widen type to varchar(32) and remove DEFAULT
await conn.execute(
  `ALTER TABLE songReactions MODIFY COLUMN \`type\` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL`
);
console.log("Widened type column to varchar(32) utf8mb4.");

// Add unique index if not exists
const [idxAfter] = await conn.execute(`SHOW INDEX FROM songReactions`);
const hasTypeIdx = idxAfter.some(i => i.Key_name === 'songReactions_user_song_type_idx');
if (!hasTypeIdx) {
  await conn.execute(
    `ALTER TABLE songReactions ADD UNIQUE KEY songReactions_user_song_type_idx (userId, songId, \`type\`)`
  );
  console.log("Added unique index on (userId, songId, type).");
} else {
  console.log("Unique index already exists.");
}

// Final state
const [finalCols] = await conn.execute(
  `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS WHERE TABLE_NAME = 'songReactions' ORDER BY ORDINAL_POSITION`
);
console.log("Final columns:", finalCols);

const [finalIdx] = await conn.execute(`SHOW INDEX FROM songReactions`);
console.log("Final indexes:", finalIdx.map(i => ({ name: i.Key_name, col: i.Column_name })));

await conn.end();
console.log("Migration complete.");
