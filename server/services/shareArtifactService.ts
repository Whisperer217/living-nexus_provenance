/**
 * Share Artifact Service
 *
 * Generates precomputed, static share artifacts for every WID.
 * Write-once, serve-forever. No runtime React. No bot detection.
 * Called fire-and-forget at publish time.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { shareArtifacts, songs } from "../../drizzle/schema";

const SITE_URL = "https://www.livingnexus.org";

function buildHtmlSnapshot(params: {
  title: string;
  creatorName: string;
  imageUrl: string;
  wid: string;
  trackId: number;
}): string {
  const { title, creatorName, imageUrl, wid, trackId } = params;
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

function buildOembedJson(params: {
  title: string;
  creatorName: string;
  imageUrl: string;
}): object {
  return {
    version: "1.0",
    type: "link",
    title: params.title,
    author_name: params.creatorName,
    provider_name: "Living Nexus",
    provider_url: SITE_URL,
    thumbnail_url: params.imageUrl,
    thumbnail_width: 1200,
    thumbnail_height: 630,
  };
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function generateShareArtifact(wid: string): Promise<void> {
  const db = await getDb();

  // 1. Fetch the song by WID
  const [song] = await db
    .select({
      id: songs.id,
      title: songs.title,
      coverArtUrl: songs.coverArtUrl,
      creatorId: songs.userId,
    })
    .from(songs)
    .where(eq(songs.witnessId, wid))
    .limit(1);

  if (!song) {
    console.warn(`[ShareArtifact] No song found for WID: ${wid}`);
    return;
  }

  // 2. Fetch creator name
  const { users } = await import("../../drizzle/schema");
  const [creator] = await db
    .select({ name: users.name, artistHandle: users.artistHandle })
    .from(users)
    .where(eq(users.id, song.creatorId))
    .limit(1);

  const creatorName =
    creator?.artistHandle || creator?.name || "Unknown Creator";
  const title = song.title || "Untitled Work";
  const imageUrl =
    song.coverArtUrl ||
    "https://cdn.manus.space/living-nexus/default-cover.jpg";
  const shareUrl = `${SITE_URL}/share/${wid}`;

  // 3. Build artifacts
  const htmlSnapshot = buildHtmlSnapshot({
    title,
    creatorName,
    imageUrl,
    wid,
    trackId: song.id,
  });

  const oembedJson = buildOembedJson({ title, creatorName, imageUrl });

  // 4. Upsert into share_artifacts
  await db
    .insert(shareArtifacts)
    .values({
      wid,
      title,
      creatorName,
      imageUrl,
      shareUrl,
      trackId: song.id,
      htmlSnapshot,
      oembedJson,
      status: "ready",
    })
    .onDuplicateKeyUpdate({
      set: {
        title,
        creatorName,
        imageUrl,
        shareUrl,
        trackId: song.id,
        htmlSnapshot,
        oembedJson,
        status: "ready",
      },
    });

  console.log(`[ShareArtifact] Generated artifact for WID: ${wid}`);

  // 5. Fire-and-forget cache warm (do not await, do not block)
  fetch(`${SITE_URL}/share/${wid}?warm=1`).catch(() => {
    // intentionally ignored — warm request is best-effort
  });
}
