import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const journal = JSON.parse(readFileSync('/home/ubuntu/living-nexus/drizzle/meta/_journal.json', 'utf8').replace(/<<<<<<[\s\S]*?>>>>>>>[^\n]*/g, ''));
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT hash FROM __drizzle_migrations ORDER BY created_at DESC');
await conn.end();

const appliedHashes = new Set(rows.map(r => r.hash));
console.log('Total applied migrations:', appliedHashes.size);
console.log('Last 5 journal entries:');
journal.entries.slice(-5).forEach(e => console.log(e.idx, e.tag, e.when));
