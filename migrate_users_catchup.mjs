import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/ln-provenance/.env' });

const conn = await createConnection(process.env.DATABASE_URL);

// Get all current columns in users table
const [rows] = await conn.execute('SHOW COLUMNS FROM users');
const existing = new Set(rows.map(r => r.Field));
console.log('Existing users columns:', [...existing].join(', '));

const migrations = [
  // Artist/creator profile fields
  "ALTER TABLE `users` ADD `artistHandle` varchar(64)",
  "ALTER TABLE `users` ADD `artistBio` text",
  "ALTER TABLE `users` ADD `artistGenre` varchar(255)",
  "ALTER TABLE `users` ADD `artistLocation` varchar(255)",
  "ALTER TABLE `users` ADD `artistWebsite` varchar(512)",
  "ALTER TABLE `users` ADD `artistSocialLinks` text",
  // Song slots
  "ALTER TABLE `users` ADD `songSlotsUsed` int DEFAULT 0 NOT NULL",
  "ALTER TABLE `users` ADD `songSlotsTotal` int DEFAULT 10 NOT NULL",
  "ALTER TABLE `users` ADD `slotLimit` int",
  // Stripe
  "ALTER TABLE `users` ADD `stripeCustomerId` varchar(128)",
  "ALTER TABLE `users` ADD `stripeAccountId` varchar(128)",
  "ALTER TABLE `users` ADD `stripeAccountStatus` varchar(64)",
  "ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(128)",
  // Living Archive
  "ALTER TABLE `users` ADD `livingArchivePlan` varchar(64)",
  "ALTER TABLE `users` ADD `livingArchiveExpiresAt` timestamp",
  "ALTER TABLE `users` ADD `livingArchiveActive` boolean DEFAULT false NOT NULL",
  // Supporter
  "ALTER TABLE `users` ADD `supporterTier` varchar(64)",
  // Social handles
  "ALTER TABLE `users` ADD `twitterHandle` varchar(128)",
  "ALTER TABLE `users` ADD `instagramHandle` varchar(128)",
  "ALTER TABLE `users` ADD `youtubeHandle` varchar(128)",
  // Profile
  "ALTER TABLE `users` ADD `primaryGenre` varchar(255)",
  "ALTER TABLE `users` ADD `licenseStatus` varchar(64)",
  "ALTER TABLE `users` ADD `bmiMemberNumber` varchar(64)",
  // Role
  "ALTER TABLE `users` ADD `role` enum('user','admin','founder') DEFAULT 'user' NOT NULL",
  // Expression
  "ALTER TABLE `users` ADD `expressionId` varchar(64)",
  "ALTER TABLE `users` ADD `expressionPrompt` text",
  "ALTER TABLE `users` ADD `expressionStyleTags` text",
  "ALTER TABLE `users` ADD `expressionComposerNote` text",
  "ALTER TABLE `users` ADD `expressionGeneratedAt` timestamp",
  // Tone
  "ALTER TABLE `users` ADD `toneFrequencyNote` varchar(64)",
  "ALTER TABLE `users` ADD `dominantKey` varchar(16)",
  "ALTER TABLE `users` ADD `tempoRange` varchar(64)",
  "ALTER TABLE `users` ADD `energyProfile` varchar(64)",
  // Stats
  "ALTER TABLE `users` ADD `playCount` int DEFAULT 0 NOT NULL",
  "ALTER TABLE `users` ADD `likeCount` int DEFAULT 0 NOT NULL",
  "ALTER TABLE `users` ADD `commentCount` int DEFAULT 0 NOT NULL",
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
