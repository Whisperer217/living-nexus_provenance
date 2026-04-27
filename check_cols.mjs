import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/ln-provenance/.env' });

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SHOW COLUMNS FROM songs');
const cols = rows.map(r => r.Field);

const schemaExpected = ['trackOrder', 'coverPositionX', 'coverPositionY', 'artAspectRatio', 
  'visualReady', 'status', 'haaiVisualConcept', 'haaiStyleLanguage', 'haaiInstrumentation',
  'haaiVocalConveyance', 'haaiLyricalInspiration', 'haaiEmotionalTone', 'haaiDeclaredAt',
  'creditsJson', 'parentSongId', 'displayOrder', 'isFlagged', 'flagReason', 'moderationStatus',
  'pagesJson', 'readAccess', 'purchasePriceCents', 'previewPageCount', 'consentSettingsJson',
  'externalLinksJson', 'ownershipStatus', 'sovereignStampId', 'sovereignStampedAt', 'stampedFileUrl',
  'stampedFileKey', 'stampedFileHash', 'description', 'tipCount', 'playCount', 'updatedAt', 'createdAt',
  'isPublic', 'displayOrder'];

const missing = schemaExpected.filter(c => !cols.includes(c));
console.log('Missing columns:', JSON.stringify(missing));
await conn.end();
