/**
 * Directly applies the events table migration and registers it in __drizzle_migrations.
 * This bypasses the drizzle-kit migrate command which fails due to a broken snapshot chain
 * from historical migrations that were applied outside the standard flow.
 */
import mysql2 from "mysql2/promise";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { config } from "dotenv";

config();

const MIGRATION_FILE = "drizzle/0004_true_the_anarchist.sql";
const sql = readFileSync(MIGRATION_FILE, "utf8");
const hash = createHash("sha256").update(sql).digest("hex");

async function run() {
  const conn = await mysql2.createConnection(process.env.DATABASE_URL);

  try {
    // Check if events table already exists
    const [tables] = await conn.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events'"
    );

    if (tables.length > 0) {
      console.log("✓ events table already exists — skipping CREATE TABLE");
    } else {
      // Apply just the events table creation part
      const createEventsSQL = `CREATE TABLE \`events\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`type\` enum('TIP','COMMENT','LIKE','FOLLOW','WITNESS_REGISTERED','WITNESS_VERIFIED','WORK_REFERENCED','SYSTEM_UPDATE','PRESERVATION_MODE') NOT NULL,
  \`workId\` int NOT NULL,
  \`actorId\` int,
  \`actorName\` varchar(128),
  \`payload\` json,
  \`deletedAt\` timestamp,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`events_id\` PRIMARY KEY(\`id\`)
)`;
      await conn.query(createEventsSQL);
      console.log("✓ Created events table");
    }

    // Check if hasSeenWelcome column already exists on users
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hasSeenWelcome'"
    );

    if (cols.length > 0) {
      console.log("✓ hasSeenWelcome column already exists — skipping ALTER TABLE");
    } else {
      await conn.query("ALTER TABLE `users` ADD `hasSeenWelcome` boolean DEFAULT false NOT NULL");
      console.log("✓ Added hasSeenWelcome column to users");
    }

    // Register this migration in __drizzle_migrations so drizzle-kit knows it's been applied
    const [existing] = await conn.query(
      "SELECT id FROM __drizzle_migrations WHERE hash = ?",
      [hash]
    );

    if (existing.length > 0) {
      console.log("✓ Migration already registered in __drizzle_migrations");
    } else {
      await conn.query(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
        [hash, Date.now()]
      );
      console.log("✓ Registered migration in __drizzle_migrations with hash:", hash);
    }

    console.log("\n✅ Events table migration complete.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
