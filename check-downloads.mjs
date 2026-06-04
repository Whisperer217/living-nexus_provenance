import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(
  `SELECT s.id, s.title, s.status, s.downloadPermission,
          s.fileUrl, s.witnessId, u.artistHandle
   FROM songs s
   LEFT JOIN users u ON s.userId = u.id
   WHERE s.title LIKE '%Pride%'
      OR s.title LIKE '%Desruction%'
      OR s.title LIKE '%Destruction%'
      OR s.title LIKE '%Red Shirt%'
      OR s.title LIKE '%Bad Disease%'
   ORDER BY s.createdAt DESC
   LIMIT 20`
);

for (const row of rows) {
  console.log("---");
  console.log("ID:", row.id, "| Title:", row.title);
  console.log("Artist:", row.artistHandle);
  console.log("Status:", row.status, "| DL Permission:", row.downloadPermission);
  console.log("WID:", row.witnessId);
  console.log("fileUrl:", row.fileUrl ? row.fileUrl.substring(0, 100) + "..." : "NULL");
}

await conn.end();
