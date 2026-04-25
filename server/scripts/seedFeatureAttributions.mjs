import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check if already seeded
const [existing] = await conn.execute(
  "SELECT id FROM featureAttributions WHERE featureName = ?",
  ["Prompt Studio — Lyric Sheet to Instrumentation Cue Pipeline"]
);

if (existing.length > 0) {
  console.log("Already seeded. Record ID:", existing[0].id);
} else {
  const [result] = await conn.execute(
    `INSERT INTO featureAttributions (featureName, attributedTo, userId, description, recordedAt)
     VALUES (?, ?, ?, ?, NOW())`,
    [
      "Prompt Studio — Lyric Sheet to Instrumentation Cue Pipeline",
      "MoshAIMusic (Brandon Reedy)",
      780095,
      "The lyric sheet → instrumentation cue → timing map pipeline that powers the Prompt Studio generator was conceived from Brandon Reedy's description of his own creative process, shared in the Living Nexus creative-showcase Discord channel.",
    ]
  );
  console.log("Seeded successfully. Insert ID:", result.insertId);
}

const [rows] = await conn.execute("SELECT * FROM featureAttributions");
console.log("All attributions:", JSON.stringify(rows, null, 2));

await conn.end();
