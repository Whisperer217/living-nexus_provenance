import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';

config();

const conn = await createConnection(process.env.DATABASE_URL);

const statements = [
  // 1. publicKey column on users (idempotent via IF NOT EXISTS equivalent)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS publicKey text`,

  // 2. agents table
  `CREATE TABLE IF NOT EXISTS agents (
    id INT AUTO_INCREMENT NOT NULL,
    userId INT NOT NULL,
    fingerprint VARCHAR(128),
    label VARCHAR(128),
    model VARCHAR(64),
    createdAt BIGINT NOT NULL,
    updatedAt BIGINT NOT NULL,
    CONSTRAINT agents_pk PRIMARY KEY (id)
  )`,

  // 3. wids table
  `CREATE TABLE IF NOT EXISTS wids (
    id INT AUTO_INCREMENT NOT NULL,
    widCode VARCHAR(64) NOT NULL,
    creatorId INT NOT NULL,
    workType VARCHAR(32) NOT NULL,
    title VARCHAR(256),
    fileHash VARCHAR(128),
    metadata JSON,
    createdAt BIGINT NOT NULL,
    CONSTRAINT wids_pk PRIMARY KEY (id),
    CONSTRAINT wids_widCode_unique UNIQUE (widCode)
  )`,

  // 4. provenanceEvents table
  `CREATE TABLE IF NOT EXISTS provenanceEvents (
    id INT AUTO_INCREMENT NOT NULL,
    eventId VARCHAR(64) NOT NULL,
    creatorId INT NOT NULL,
    actionType ENUM('checkpoint','anchor','fork','draft') NOT NULL DEFAULT 'draft',
    payloadCanonical TEXT NOT NULL,
    signature VARCHAR(256),
    sessionLabel VARCHAR(128),
    origin JSON,
    createdAt BIGINT NOT NULL,
    CONSTRAINT provenanceEvents_pk PRIMARY KEY (id),
    CONSTRAINT provenanceEvents_eventId_unique UNIQUE (eventId)
  )`,

  // 5. Drop aiTransforms (now unused)
  `DROP TABLE IF EXISTS aiTransforms`,
];

for (const sql of statements) {
  const label = sql.trim().split('\n')[0].substring(0, 60);
  try {
    await conn.execute(sql);
    console.log(`✓ ${label}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
      console.log(`⚠ Already exists (skipped): ${label}`);
    } else {
      console.error(`✗ ${label}\n  ${err.message}`);
    }
  }
}

await conn.end();
console.log('\nDone.');
