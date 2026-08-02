import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { writeFileSync } from 'fs';

dotenv.config({ path: '/home/ubuntu/living-nexus/.env' });

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Pull creators with published works — only those with photos or bios
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
    COUNT(s.id) as workCount
  FROM users u
  LEFT JOIN songs s ON s.userId = u.id AND s.status = 'published'
  WHERE u.name IS NOT NULL AND u.name != ''
    AND (u.profilePhotoUrl IS NOT NULL OR u.bio IS NOT NULL)
  GROUP BY u.id
  HAVING workCount > 0
  ORDER BY workCount DESC, u.createdAt ASC
  LIMIT 8
`);

// Pull top 3 published songs per creator
const result = [];
for (const creator of creators) {
  const [songs] = await connection.execute(`
    SELECT 
      s.id,
      s.title,
      s.genre,
      s.coverArtUrl,
      s.witnessId,
      s.caption,
      s.durationSeconds,
      s.contentType,
      s.createdAt
    FROM songs s
    WHERE s.userId = ? AND s.status = 'published' AND s.coverArtUrl IS NOT NULL
    ORDER BY s.createdAt DESC
    LIMIT 3
  `, [creator.id]);
  
  result.push({
    ...creator,
    songs: songs
  });
}

writeFileSync('/home/ubuntu/creators-clean.json', JSON.stringify(result, null, 2));
console.log(`Extracted ${result.length} creators`);
result.forEach(c => console.log(`  - ${c.name} (${c.workCount} works, ${c.songs.length} songs with art)`));

await connection.end();
