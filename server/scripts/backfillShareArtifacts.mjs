/**
 * Backfill Share Artifacts for all published works.
 *
 * Run once after deployment:
 *   node server/scripts/backfillShareArtifacts.mjs
 *
 * Queries all songs with a witnessId and status='published',
 * then calls generateShareArtifact for each with a 200ms delay.
 */
import "dotenv/config";
import { createConnection } from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("[Backfill] DATABASE_URL not set");
  process.exit(1);
}

const SITE_URL = "https://www.livingnexus.org";

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtmlSnapshot({ title, creatorName, imageUrl, wid, trackId }) {
  const shareUrl = `${SITE_URL}/share/${wid}`;
  const songUrl = `${SITE_URL}/song/${trackId}`;
  const description = `By ${creatorName} — Witnessed on Living Nexus`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:image" content="${escapeAttr(imageUrl)}" />
  <meta property="og:url" content="${escapeAttr(shareUrl)}" />
  <meta property="og:type" content="music.song" />
  <meta property="og:site_name" content="Living Nexus" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${escapeAttr(imageUrl)}" />
  <link rel="alternate" type="application/json+oembed" href="${SITE_URL}/api/oembed?wid=${encodeURIComponent(wid)}" title="${escapeAttr(title)}" />
  <meta http-equiv="refresh" content="0; url=${escapeAttr(songUrl)}" />
</head>
<body></body>
</html>`;
}

function buildOembedJson({ title, creatorName, imageUrl }) {
  return JSON.stringify({
    version: "1.0",
    type: "link",
    title,
    author_name: creatorName,
    provider_name: "Living Nexus",
    provider_url: SITE_URL,
    thumbnail_url: imageUrl,
    thumbnail_width: 1200,
    thumbnail_height: 630,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // Parse the DATABASE_URL (mysql2 format)
  const url = new URL(DB_URL);
  const conn = await createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  console.log("[Backfill] Connected to database");

  // Fetch all published songs with a witnessId
  const [rows] = await conn.execute(`
    SELECT s.id, s.title, s.witnessId, s.coverArtUrl, s.userId,
           u.artistHandle, u.name as user_name
    FROM songs s
    LEFT JOIN users u ON u.id = s.userId
    WHERE s.witnessId IS NOT NULL
      AND s.witnessId != ''
      AND s.status = 'published'
    ORDER BY s.id ASC
  `);

  console.log(`[Backfill] Found ${rows.length} published songs with WIDs`);

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    const wid = row.witnessId;
    const title = row.title || "Untitled Work";
    const creatorName = row.artistHandle || row.user_name || "Unknown Creator";
    const imageUrl =
      row.coverArtUrl ||
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";
    const shareUrl = `${SITE_URL}/share/${wid}`;
    const trackId = row.id;

    try {
      const htmlSnapshot = buildHtmlSnapshot({ title, creatorName, imageUrl, wid, trackId });
      const oembedJson = buildOembedJson({ title, creatorName, imageUrl });

      await conn.execute(`
        INSERT INTO shareArtifacts (wid, title, creatorName, imageUrl, shareUrl, trackId, htmlSnapshot, oembedJson, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          creatorName = VALUES(creatorName),
          imageUrl = VALUES(imageUrl),
          shareUrl = VALUES(shareUrl),
          trackId = VALUES(trackId),
          htmlSnapshot = VALUES(htmlSnapshot),
          oembedJson = VALUES(oembedJson),
          status = 'ready',
          updatedAt = NOW()
      `, [wid, title, creatorName, imageUrl, shareUrl, trackId, htmlSnapshot, oembedJson]);

      console.log(`[Backfill] ✓ ${wid} — "${title}" by ${creatorName}`);
      success++;
    } catch (err) {
      console.error(`[Backfill] ✗ ${wid} — Error:`, err.message);
      failed++;
    }

    await sleep(200);
  }

  await conn.end();
  console.log(`\n[Backfill] Complete. Success: ${success} | Failed: ${failed}`);
}

main().catch((err) => {
  console.error("[Backfill] Fatal error:", err);
  process.exit(1);
});
