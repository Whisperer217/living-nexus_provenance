import { createConnection } from "mysql2/promise";

const sql = `
CREATE TABLE IF NOT EXISTS \`userCollectionTracks\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`collectionId\` int NOT NULL,
  \`songId\` int NOT NULL,
  \`sortOrder\` int NOT NULL DEFAULT 0,
  \`addedAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`userCollectionTracks_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`userCollections\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`name\` varchar(128) NOT NULL,
  \`description\` text,
  \`coverUrl\` text,
  \`sortOrder\` int NOT NULL DEFAULT 0,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`userCollections_id\` PRIMARY KEY(\`id\`)
);

CREATE INDEX IF NOT EXISTS \`userCollectionTracks_collectionId_idx\` ON \`userCollectionTracks\` (\`collectionId\`);
CREATE INDEX IF NOT EXISTS \`userCollectionTracks_songId_idx\` ON \`userCollectionTracks\` (\`songId\`);
CREATE INDEX IF NOT EXISTS \`userCollections_userId_idx\` ON \`userCollections\` (\`userId\`);
`;

const addSortOrder = `ALTER TABLE \`likes\` ADD COLUMN IF NOT EXISTS \`sortOrder\` int NOT NULL DEFAULT 0;`;

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Connected to DB");

for (const stmt of sql.split(";").map(s => s.trim()).filter(Boolean)) {
  try {
    await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 60));
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR" || e.message?.includes("already exists")) {
      console.log("SKIP (already exists):", stmt.slice(0, 60));
    } else {
      console.error("ERR:", e.message, "\n  SQL:", stmt.slice(0, 80));
    }
  }
}

try {
  await conn.execute(addSortOrder);
  console.log("OK: ALTER TABLE likes ADD sortOrder");
} catch (e) {
  if (e.message?.includes("Duplicate column")) {
    console.log("SKIP: sortOrder already exists on likes");
  } else {
    console.error("ERR:", e.message);
  }
}

await conn.end();
console.log("Migration complete.");
