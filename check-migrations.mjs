import { createConnection } from 'mysql2/promise';
const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 10');
console.log(JSON.stringify(rows, null, 2));
await conn.end();
