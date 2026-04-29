import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`keeperCharacterSheets\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`presetId\` varchar(64) NOT NULL DEFAULT 'the-witness',
    \`name\` varchar(128) NOT NULL DEFAULT 'The Witness',
    \`persona\` text NOT NULL,
    \`attributes\` json NOT NULL,
    \`mediumContext\` json NOT NULL,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`keeperCharacterSheets_pk\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`keeperChatArchives\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`title\` varchar(256) NOT NULL,
    \`messages\` json NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`keeperChatArchives_pk\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of statements) {
  const tableName = sql.match(/`(\w+)`/)[1];
  try {
    await conn.execute(sql);
    console.log(`✓ Created table: ${tableName}`);
  } catch (e) {
    if (e.code === "ER_TABLE_EXISTS_ERROR") {
      console.log(`→ Already exists: ${tableName}`);
    } else {
      console.error(`✗ Failed: ${tableName}`, e.message);
    }
  }
}

await conn.end();
console.log("Done.");
