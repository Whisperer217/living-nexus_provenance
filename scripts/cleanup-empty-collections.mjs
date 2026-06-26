/**
 * One-time cleanup script: remove all empty collections and playlists.
 * A collection/playlist is "empty" if it has zero live (non-Deleted) tracks.
 *
 * Run: node scripts/cleanup-empty-collections.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("=== Living Nexus — Empty Collection Cleanup ===\n");

// ── 1. Batch-upload WID-ALB collections ──────────────────────────────────────
// Find collections where ALL songs have status='Deleted' or no songs exist
const [emptyCollections] = await conn.execute(`
  SELECT c.id, c.name, c.collectionWid,
         COUNT(s.id) AS liveCount
  FROM collections c
  LEFT JOIN songs s ON s.collectionId = c.id AND s.status != 'Deleted'
  GROUP BY c.id
  HAVING liveCount = 0
`);

console.log(`Found ${emptyCollections.length} empty WID-ALB collection(s) to delete:`);
for (const col of emptyCollections) {
  console.log(`  - [${col.id}] "${col.name}" (${col.collectionWid})`);
}

if (emptyCollections.length > 0) {
  const ids = emptyCollections.map(c => c.id);
  const placeholders = ids.map(() => "?").join(",");
  await conn.execute(`DELETE FROM collections WHERE id IN (${placeholders})`, ids);
  console.log(`✓ Deleted ${emptyCollections.length} empty WID-ALB collection(s)\n`);
} else {
  console.log("  (none to delete)\n");
}

// ── 2. Personal user collections ─────────────────────────────────────────────
const [emptyUserColls] = await conn.execute(`
  SELECT uc.id, uc.name, uc.userId,
         COUNT(uct.id) AS trackCount
  FROM userCollections uc
  LEFT JOIN userCollectionTracks uct ON uct.collectionId = uc.id
  GROUP BY uc.id
  HAVING trackCount = 0
`);

console.log(`Found ${emptyUserColls.length} empty personal user collection(s) to delete:`);
for (const col of emptyUserColls) {
  console.log(`  - [${col.id}] "${col.name}" (userId: ${col.userId})`);
}

if (emptyUserColls.length > 0) {
  const ids = emptyUserColls.map(c => c.id);
  const placeholders = ids.map(() => "?").join(",");
  await conn.execute(`DELETE FROM userCollections WHERE id IN (${placeholders})`, ids);
  console.log(`✓ Deleted ${emptyUserColls.length} empty personal user collection(s)\n`);
} else {
  console.log("  (none to delete)\n");
}

// ── 3. Named playlists ────────────────────────────────────────────────────────
const [emptyPlaylists] = await conn.execute(`
  SELECT p.id, p.name, p.ownerId,
         COUNT(pt.id) AS trackCount
  FROM playlists p
  LEFT JOIN playlistTracks pt ON pt.playlistId = p.id
  GROUP BY p.id
  HAVING trackCount = 0
`);

console.log(`Found ${emptyPlaylists.length} empty named playlist(s) to delete:`);
for (const pl of emptyPlaylists) {
  console.log(`  - [${pl.id}] "${pl.name}" (ownerId: ${pl.ownerId})`);
}

if (emptyPlaylists.length > 0) {
  const ids = emptyPlaylists.map(p => p.id);
  const placeholders = ids.map(() => "?").join(",");
  // Delete collaborators first (FK constraint)
  await conn.execute(`DELETE FROM playlistCollaborators WHERE playlistId IN (${placeholders})`, ids);
  await conn.execute(`DELETE FROM playlists WHERE id IN (${placeholders})`, ids);
  console.log(`✓ Deleted ${emptyPlaylists.length} empty named playlist(s)\n`);
} else {
  console.log("  (none to delete)\n");
}

// ── 4. Orphaned userCollectionTracks (pointing to deleted songs) ──────────────
const [orphanedTracks] = await conn.execute(`
  SELECT uct.id
  FROM userCollectionTracks uct
  LEFT JOIN songs s ON s.id = uct.songId
  WHERE s.id IS NULL OR s.status = 'Deleted'
`);

console.log(`Found ${orphanedTracks.length} orphaned userCollectionTrack row(s) to clean up:`);
if (orphanedTracks.length > 0) {
  const ids = orphanedTracks.map(r => r.id);
  const placeholders = ids.map(() => "?").join(",");
  await conn.execute(`DELETE FROM userCollectionTracks WHERE id IN (${placeholders})`, ids);
  console.log(`✓ Deleted ${orphanedTracks.length} orphaned userCollectionTrack row(s)\n`);
} else {
  console.log("  (none to delete)\n");
}

// ── 5. Orphaned playlistTracks (pointing to deleted songs) ───────────────────
const [orphanedPlaylistTracks] = await conn.execute(`
  SELECT pt.id
  FROM playlistTracks pt
  LEFT JOIN songs s ON s.id = pt.songId
  WHERE s.id IS NULL OR s.status = 'Deleted'
`);

console.log(`Found ${orphanedPlaylistTracks.length} orphaned playlistTrack row(s) to clean up:`);
if (orphanedPlaylistTracks.length > 0) {
  const ids = orphanedPlaylistTracks.map(r => r.id);
  const placeholders = ids.map(() => "?").join(",");
  await conn.execute(`DELETE FROM playlistTracks WHERE id IN (${placeholders})`, ids);
  console.log(`✓ Deleted ${orphanedPlaylistTracks.length} orphaned playlistTrack row(s)\n`);
} else {
  console.log("  (none to delete)\n");
}

await conn.end();
console.log("=== Cleanup complete ===");
