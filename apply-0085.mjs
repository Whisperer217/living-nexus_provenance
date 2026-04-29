import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

// Check current state
const [pe] = await conn.execute("SHOW TABLES LIKE 'provenanceEvents'");
const [at] = await conn.execute("SHOW TABLES LIKE 'aiTransforms'");
console.log('provenanceEvents exists:', pe.length > 0);
console.log('aiTransforms exists:', at.length > 0);

if (pe.length === 0) {
  console.log('Creating provenanceEvents table...');
  await conn.execute(`
    CREATE TABLE \`provenanceEvents\` (
      \`eventId\` varchar(64) NOT NULL,
      \`creatorId\` int NOT NULL,
      \`agentId\` int,
      \`actionType\` enum('draft','checkpoint','anchor','fork') NOT NULL,
      \`parentEventId\` varchar(64),
      \`origin\` json,
      \`payloadCanonical\` text NOT NULL,
      \`signature\` text,
      \`sessionLabel\` varchar(128),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`provenanceEvents_eventId\` PRIMARY KEY(\`eventId\`)
    )
  `);
  console.log('provenanceEvents created.');
} else {
  console.log('provenanceEvents already exists — skipped.');
}

if (at.length > 0) {
  console.log('Dropping aiTransforms table...');
  await conn.execute('DROP TABLE `aiTransforms`');
  console.log('aiTransforms dropped.');
} else {
  console.log('aiTransforms does not exist — skipped.');
}

await conn.end();
console.log('Migration 0085 complete.');
