import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT hash FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 15');
await conn.end();

const hashes = new Set(rows.map(r => r.hash));

const files = [
  '/home/ubuntu/living-nexus/drizzle/0080_ownership_disclaimer.sql',
  '/home/ubuntu/living-nexus/drizzle/0080_easy_pride.sql',
  '/home/ubuntu/living-nexus/drizzle/0081_keeper_skins.sql',
];

for (const f of files) {
  try {
    const content = readFileSync(f, 'utf8');
    const hash = createHash('sha256').update(content).digest('hex');
    const applied = hashes.has(hash);
    console.log(`${f.split('/').pop()}: hash=${hash.slice(0,12)}... applied=${applied}`);
  } catch { console.log(`${f.split('/').pop()}: NOT FOUND`); }
}
