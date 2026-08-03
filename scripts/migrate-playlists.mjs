import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const url = process.env.DATABASE_URL;
// Parse the URL to extract connection params
const match = url.match(/mysql2?:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/([^?]+)(\?.*)?/);
if (!match) { console.error("Could not parse DATABASE_URL"); process.exit(1); }

const [, user, password, host, port, database] = match;

const conn = await createConnection({
  host,
  port: parseInt(port || "4000"),
  user,
  password,
  database,
  ssl: { rejectUnauthorized: false },
});

const alters = [
  "ALTER TABLE playlists ADD COLUMN shareSlug VARCHAR(64) NULL",
  "ALTER TABLE playlists ADD COLUMN moodTags JSON NULL",
  "ALTER TABLE playlists ADD COLUMN playCount INT NOT NULL DEFAULT 0",
];

for (const sql of alters) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.split("ADD COLUMN")[1]?.trim() || sql);
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("→ already exists:", sql.split("ADD COLUMN")[1]?.trim());
    } else {
      console.error("✗", e.message);
    }
  }
}

await conn.end();
console.log("Done.");
