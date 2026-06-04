import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(
  `SELECT s.id, s.title, s.fileUrl, s.downloadPermission, s.status, u.artistHandle
   FROM songs s
   LEFT JOIN users u ON s.userId = u.id
   WHERE s.id IN (1680008, 1680009, 1680015)
   ORDER BY s.id`
);

for (const row of rows) {
  console.log("---");
  console.log("ID:", row.id, "| Title:", row.title);
  console.log("Artist:", row.artistHandle, "| DL:", row.downloadPermission);
  console.log("FULL fileUrl:", row.fileUrl);
}

await conn.end();
process.exit(0);
