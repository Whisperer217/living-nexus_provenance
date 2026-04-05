/**
 * Requeue failed visual jobs by calling the running server's internal DB directly.
 * Run with: node scripts/requeue-failed.mjs
 */
import { createPool } from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = createPool({ uri: DATABASE_URL, connectionLimit: 2 });

try {
  // Show current counts
  const [counts] = await pool.query(
    "SELECT status, COUNT(*) as cnt FROM visualQueue GROUP BY status"
  );
  console.log("Current visualQueue status counts:", counts);

  // Requeue all failed jobs
  const [result] = await pool.query(
    "UPDATE visualQueue SET status='pending', attempts=0, errorMessage=NULL, startedAt=NULL, completedAt=NULL WHERE status='failed'"
  );
  console.log(`Requeued ${result.affectedRows} failed jobs`);

  // Verify
  const [after] = await pool.query(
    "SELECT status, COUNT(*) as cnt FROM visualQueue GROUP BY status"
  );
  console.log("After requeue:", after);
} finally {
  await pool.end();
}
