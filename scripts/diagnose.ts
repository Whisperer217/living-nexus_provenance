import { getDb } from '../server/utils/db';
import { visualQueue, songs } from '../drizzle/schema';
import { eq, sql, and } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('No DB connection'); process.exit(1); }

  // 1. Visual queue status
  const queueStatus = await db
    .select({ 
      status: visualQueue.status, 
      count: sql<number>`count(*)`,
      avgAttempts: sql<number>`avg(attempts)` 
    })
    .from(visualQueue)
    .groupBy(visualQueue.status);
  console.log('\n=== Visual Queue Status ===');
  console.table(queueStatus);

  // 2. Image coverage on published songs
  const coverage = await db.select({
    total: sql<number>`count(*)`,
    noCover: sql<number>`sum(case when coverArtUrl is null or coverArtUrl='' then 1 else 0 end)`,
    noVideo: sql<number>`sum(case when autoVideoUrl is null or autoVideoUrl='' then 1 else 0 end)`,
    visualReady: sql<number>`sum(case when visualReady=1 then 1 else 0 end)`,
  }).from(songs).where(and(eq(songs.status, 'Published'), eq(songs.isPublic, true)));
  console.log('\n=== Published Songs Image Coverage ===');
  console.table(coverage);

  // 3. Failed jobs with error messages
  const failedJobs = await db.select({
    songId: visualQueue.songId,
    attempts: visualQueue.attempts,
    error: visualQueue.errorMessage,
  }).from(visualQueue).where(eq(visualQueue.status, 'failed')).limit(10);
  console.log('\n=== Failed Visual Jobs ===');
  console.table(failedJobs);

  // 4. Pending jobs count
  const pending = await db.select({
    count: sql<number>`count(*)`,
  }).from(visualQueue).where(eq(visualQueue.status, 'pending'));
  console.log('\n=== Pending Jobs ===');
  console.table(pending);

  // 5. Songs with cover art but no autoVideoUrl (visual pipeline issue)
  const noVideoSongs = await db.select({
    id: songs.id,
    title: songs.title,
    coverArtUrl: songs.coverArtUrl,
    autoVideoUrl: songs.autoVideoUrl,
    visualReady: songs.visualReady,
  }).from(songs).where(
    and(
      eq(songs.status, 'Published'),
      eq(songs.isPublic, true),
      sql`(coverArtUrl IS NOT NULL AND coverArtUrl != '')`,
      sql`(autoVideoUrl IS NULL OR autoVideoUrl = '')`
    )
  ).limit(10);
  console.log('\n=== Songs with Cover Art but No Auto Video ===');
  console.table(noVideoSongs);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
