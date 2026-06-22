import { getDb } from "../server/db.js";
import { songs } from "../drizzle/schema.js";
import { isNotNull } from "drizzle-orm";

const db = await getDb();
const rows = await db
  .select({ id: songs.id, title: songs.title, harmonicSignature: songs.harmonicSignature })
  .from(songs)
  .where(isNotNull(songs.harmonicSignature))
  .limit(8);

rows.forEach(r =>
  console.log(JSON.stringify({ id: r.id, title: r.title, sig: r.harmonicSignature }))
);
process.exit(0);
