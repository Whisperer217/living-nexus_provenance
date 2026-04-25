import { createConnection } from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';

const conn = await createConnection(process.env.DATABASE_URL);

// Get all applied hashes
const [appliedRows] = await conn.execute('SELECT hash FROM __drizzle_migrations');
const appliedHashes = new Set(appliedRows.map(r => r.hash));

// Get all SQL migration files in order
const migDir = '/home/ubuntu/living-nexus/drizzle';
const files = readdirSync(migDir)
  .filter(f => f.match(/^\d{4}_.*\.sql$/))
  .sort();

let applied = 0;
let skipped = 0;

for (const file of files) {
  const content = readFileSync(`${migDir}/${file}`, 'utf8');
  const hash = createHash('sha256').update(content).digest('hex');
  
  if (appliedHashes.has(hash)) {
    console.log(`SKIP ${file} (already applied)`);
    skipped++;
    continue;
  }
  
  console.log(`APPLY ${file}...`);
  
  // Split on drizzle statement-breakpoint comments
  const statements = content
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let ok = true;
  for (const stmt of statements) {
    const clean = stmt.trim();
    if (!clean || clean.startsWith('--')) continue;
    try {
      await conn.execute(clean);
    } catch (e) {
      if (e.sqlMessage && (
        e.sqlMessage.includes('Duplicate column') ||
        e.sqlMessage.includes('already exists') ||
        e.sqlMessage.includes('Duplicate key name')
      )) {
        console.log(`  WARN: ${e.sqlMessage} (skipping statement)`);
      } else {
        console.error(`  ERROR: ${e.sqlMessage}`);
        console.error(`  SQL: ${clean.slice(0, 200)}`);
        ok = false;
      }
    }
  }
  
  if (ok) {
    // Record migration as applied
    await conn.execute(
      'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      [hash, Date.now()]
    );
    console.log(`  OK`);
    applied++;
  }
}

await conn.end();
console.log(`\nDone: ${applied} applied, ${skipped} skipped`);
