import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/ln-provenance/.env' });

const conn = await createConnection(process.env.DATABASE_URL);

const migrations = [
  // Core profile fields that may be missing
  "ALTER TABLE `users` ADD `profilePhotoUrl` text",
  "ALTER TABLE `users` ADD `bio` text",
  "ALTER TABLE `users` ADD `website` text",
  "ALTER TABLE `users` ADD `location` varchar(128)",
  "ALTER TABLE `users` ADD `bannerUrl` text",
  "ALTER TABLE `users` ADD `avatarObjectPosition` varchar(32) DEFAULT '50% 50%'",
  "ALTER TABLE `users` ADD `bannerPositionX` float DEFAULT 50 NOT NULL",
  "ALTER TABLE `users` ADD `bannerPositionY` float DEFAULT 50 NOT NULL",
  "ALTER TABLE `users` ADD `isPinned` boolean DEFAULT false NOT NULL",
  // Enum fields - need to be careful with these
  "ALTER TABLE `users` ADD `aiDisclosure` enum('original','ai_assisted','ai_generated','human_authored_ai_instrument') DEFAULT 'original'",
  "ALTER TABLE `users` ADD `lightsMode` enum('dim','on') DEFAULT 'dim' NOT NULL",
  // Timestamps and flags
  "ALTER TABLE `users` ADD `hasSeenWelcome` boolean DEFAULT false NOT NULL",
  "ALTER TABLE `users` ADD `tosAcceptedAt` timestamp NULL",
  "ALTER TABLE `users` ADD `tosVersion` varchar(16)",
  "ALTER TABLE `users` ADD `dataDeletionRequestedAt` timestamp NULL",
  "ALTER TABLE `users` ADD `lastVisitedActivityAt` timestamp NULL",
  "ALTER TABLE `users` ADD `lastVisitedDashboardAt` timestamp NULL",
  "ALTER TABLE `users` ADD `founderWid` varchar(64)",
  "ALTER TABLE `users` ADD `founderGrantedAt` timestamp NULL",
  "ALTER TABLE `users` ADD `publicKey` text",
  "ALTER TABLE `users` ADD `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP",
  // Fix enum columns that were added as varchar in previous migration
  // (these will fail with ER_DUP_FIELDNAME if already exist - that's OK)
  "ALTER TABLE `users` ADD `loginMethod` varchar(64)",
  "ALTER TABLE `users` ADD `email` varchar(320)",
  "ALTER TABLE `users` ADD `name` text",
  "ALTER TABLE `users` ADD `openId` varchar(64)",
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
