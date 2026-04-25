import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows1] = await conn.execute("SHOW TABLES LIKE 'provenanceEvents'");
console.log('provenanceEvents exists:', rows1.length > 0);

const [rows2] = await conn.execute("SHOW TABLES LIKE 'aiTransforms'");
console.log('aiTransforms exists:', rows2.length > 0);

await conn.end();
