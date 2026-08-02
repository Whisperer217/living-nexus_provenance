import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load env from the living-nexus project
dotenv.config({ path: '/home/ubuntu/living-nexus/.env' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

// Pull creators with published works
const [creators] = await connection.execute(`
  SELECT 
    u.id,
    u.name,
    u.artistHandle,
    u.bio,
    u.location,
    u.profilePhotoUrl,
    u.bannerUrl,
    u.twitterHandle,
    u.instagramHandle,
    u.website,
    u.createdAt,
    COUNT(s.id) as workCount
  FROM users u
  LEFT JOIN songs s ON s.userId = u.id AND s.status = 'published'
  WHERE u.name IS NOT NULL AND u.name != ''
  GROUP BY u.id
  ORDER BY workCount DESC, u.createdAt ASC
  LIMIT 12
`);

console.log('CREATORS:', JSON.stringify(creators, null, 2));

// Pull published songs for each creator
const creatorIds = creators.map(c => c.id);
if (creatorIds.length > 0) {
  const placeholders = creatorIds.map(() => '?').join(',');
  const [songs] = await connection.execute(`
    SELECT 
      s.id,
      s.userId,
      s.title,
      s.genre,
      s.coverArtUrl,
      s.witnessId,
      s.contentType,
      s.status,
      s.durationSeconds,
      s.bpm,
      s.keySignature,
      s.caption,
      s.createdAt,
      s.lyricsText
    FROM songs s
    WHERE s.userId IN (${placeholders}) AND s.status = 'published'
    ORDER BY s.userId, s.createdAt DESC
  `, creatorIds);
  
  console.log('SONGS:', JSON.stringify(songs, null, 2));
}

await connection.end();
