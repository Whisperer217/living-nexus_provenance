import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/ln-provenance/.env' });

const conn = await createConnection(process.env.DATABASE_URL);

const migrations = [
  // Collection & ordering
  "ALTER TABLE `songs` ADD `trackOrder` int DEFAULT 0 NOT NULL",
  "ALTER TABLE `songs` ADD `coverPositionX` float DEFAULT 50 NOT NULL",
  "ALTER TABLE `songs` ADD `coverPositionY` float DEFAULT 50 NOT NULL",
  "ALTER TABLE `songs` ADD `artAspectRatio` enum('1:1','4:5','16:9')",
  // Visual pipeline
  "ALTER TABLE `songs` ADD `visualReady` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `songs` ADD `status` enum('Draft','Published','Archived') DEFAULT 'Published' NOT NULL",
  // HAAI Declaration fields
  "ALTER TABLE `songs` ADD `haaiVisualConcept` text",
  "ALTER TABLE `songs` ADD `haaiStyleLanguage` text",
  "ALTER TABLE `songs` ADD `haaiInstrumentation` text",
  "ALTER TABLE `songs` ADD `haaiVocalConveyance` text",
  "ALTER TABLE `songs` ADD `haaiLyricalInspiration` text",
  "ALTER TABLE `songs` ADD `haaiEmotionalTone` text",
  "ALTER TABLE `songs` ADD `haaiDeclaredAt` timestamp",
  // Credits & lineage
  "ALTER TABLE `songs` ADD `creditsJson` text",
  "ALTER TABLE `songs` ADD `parentSongId` int",
  "ALTER TABLE `songs` ADD `displayOrder` int DEFAULT 0 NOT NULL",
  // Moderation
  "ALTER TABLE `songs` ADD `isFlagged` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `songs` ADD `flagReason` varchar(512)",
  "ALTER TABLE `songs` ADD `moderationStatus` enum('clear','flagged','removed') DEFAULT 'clear' NOT NULL",
  // Storyboard / Comic
  "ALTER TABLE `songs` ADD `pagesJson` text",
  "ALTER TABLE `songs` ADD `readAccess` enum('open','preview','locked') DEFAULT 'open' NOT NULL",
  "ALTER TABLE `songs` ADD `purchasePriceCents` int",
  "ALTER TABLE `songs` ADD `previewPageCount` int DEFAULT 5 NOT NULL",
  "ALTER TABLE `songs` ADD `consentSettingsJson` text",
  "ALTER TABLE `songs` ADD `externalLinksJson` text",
  // Ownership
  "ALTER TABLE `songs` ADD `ownershipStatus` enum('full','partial') DEFAULT 'full' NOT NULL",
  // Sovereign Stamp
  "ALTER TABLE `songs` ADD `stampedFileUrl` text",
  "ALTER TABLE `songs` ADD `stampedFileKey` text",
  "ALTER TABLE `songs` ADD `stampedFileHash` varchar(64)",
  // Stats
  "ALTER TABLE `songs` ADD `tipCount` int DEFAULT 0 NOT NULL",
  "ALTER TABLE `songs` ADD `isPublic` boolean DEFAULT true NOT NULL",
];

let applied = 0;
let skipped = 0;
for (const sql of migrations) {
  try {
    await conn.execute(sql);
    console.log('OK:', sql.slice(0, 70));
    applied++;
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('SKIP (exists):', sql.slice(0, 70));
      skipped++;
    } else {
      console.error('FAIL:', sql.slice(0, 70), '->', e.message);
    }
  }
}

await conn.end();
console.log(`\nDone: ${applied} applied, ${skipped} skipped`);
