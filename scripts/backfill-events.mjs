/**
 * Backfill existing tips and comments into the events table.
 * Idempotent: checks for legacyId in payload before inserting to avoid duplicates.
 * Run once after creating the events table.
 */
import mysql2 from "mysql2/promise";
import { config } from "dotenv";

config();

async function run() {
  const conn = await mysql2.createConnection(process.env.DATABASE_URL);

  try {
    // ─── Backfill Tips ────────────────────────────────────────────────────────
    const [existingTipEvents] = await conn.query(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(payload, '$.legacyId')) as legacyId FROM events WHERE type = 'TIP' AND JSON_EXTRACT(payload, '$.legacyId') IS NOT NULL`
    );
    const backfilledTipIds = new Set(existingTipEvents.map(r => String(r.legacyId)));

    const [allTips] = await conn.query(
      `SELECT t.id, t.songId, t.tipperUserId, t.amountCents, t.stripePaymentIntentId, t.createdAt, u.name as tipperName
       FROM tips t
       LEFT JOIN users u ON t.tipperUserId = u.id
       ORDER BY t.createdAt ASC`
    );

    let tipInserted = 0;
    let tipSkipped = 0;
    for (const tip of allTips) {
      if (backfilledTipIds.has(String(tip.id))) {
        tipSkipped++;
        continue;
      }
      const payload = JSON.stringify({
        amountCents: tip.amountCents,
        stripePaymentIntentId: tip.stripePaymentIntentId || null,
        legacyId: tip.id,
        legacyType: "tip",
      });
      await conn.query(
        `INSERT INTO events (type, workId, actorId, actorName, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        ["TIP", tip.songId, tip.tipperUserId || null, tip.tipperName || null, payload, tip.createdAt]
      );
      tipInserted++;
    }
    console.log(`✓ Tips: ${tipInserted} backfilled, ${tipSkipped} already present`);

    // ─── Backfill Comments ────────────────────────────────────────────────────
    const [existingCommentEvents] = await conn.query(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(payload, '$.legacyId')) as legacyId FROM events WHERE type = 'COMMENT' AND JSON_EXTRACT(payload, '$.legacyId') IS NOT NULL`
    );
    const backfilledCommentIds = new Set(existingCommentEvents.map(r => String(r.legacyId)));

    const [allComments] = await conn.query(
      `SELECT id, songId, userId, authorName, content, createdAt FROM comments ORDER BY createdAt ASC`
    );

    let commentInserted = 0;
    let commentSkipped = 0;
    for (const comment of allComments) {
      if (backfilledCommentIds.has(String(comment.id))) {
        commentSkipped++;
        continue;
      }
      const payload = JSON.stringify({
        content: comment.content,
        legacyId: comment.id,
      });
      await conn.query(
        `INSERT INTO events (type, workId, actorId, actorName, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        ["COMMENT", comment.songId, comment.userId || null, comment.authorName || null, payload, comment.createdAt]
      );
      commentInserted++;
    }
    console.log(`✓ Comments: ${commentInserted} backfilled, ${commentSkipped} already present`);

    // ─── Summary ──────────────────────────────────────────────────────────────
    const [total] = await conn.query(`SELECT COUNT(*) as count FROM events`);
    console.log(`\n✅ Backfill complete. Total events in ledger: ${total[0].count}`);
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
