import { alias } from "drizzle-orm/mysql-core";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, like, ne, or, sql } from "drizzle-orm";
import {
  activationContributions,
  audioVersions,
  collections,
  events,
  likes,
  playEvents,
  playlistItems,
  playlistTracks,
  playlists,
  songReactions,
  songs,
  songVersions,
  tips,
  trackDownloadGrants,
  type ActivationContribution,
  type InsertSongVersion,
  type InsertWorkEvidence,
  type WorkEvidence,
  userCollections,
  userCollectionTracks,
  users,
  workEvents,
  workEvidence,
  workLineage,
  workWitnesses,
} from "../../drizzle/schema";
import { getDb } from "../utils/db";

// ─── Songs ────────────────────────────────────────────────────────────────────

/** Returns the next available displayOrder slot for a creator (MAX + 1, or 1 if none set). */
export async function getNextDisplayOrder(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const rows = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${songs.displayOrder}), 0)` })
    .from(songs)
    .where(eq(songs.userId, userId));
  return (rows[0]?.maxOrder ?? 0) + 1;
}

export async function createSong(data: {
  userId: number; title: string; genre?: string; bpm?: number; keySignature?: string;
  moodTags?: string[]; lyricsText?: string; lyricsHash?: string; coWriters?: string[]; albumName?: string;
  creditsJson?: string;
  releaseDate?: string; isrc?: string;
  aiConsent: "prohibited" | "permitted_attribution" | "permitted";
  ownershipStatus?: "full" | "partial";
  fileUrl?: string; fileKey?: string; coverArtUrl?: string; fileHash?: string;
  durationSeconds?: number; sampleRate?: number; bitDepth?: number;
  witnessId?: string; harmonicSignature?: number[];
  ecdsaPublicKey?: string; ecdsaSignature?: string; certificateUrl?: string; certificateKey?: string;
  isLyricsOnly?: boolean;
  contentType?: "audio" | "lyrics" | "manuscript" | "comic" | "game";
  caption?: string | null;
  displayOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(songs).values({
    ...data,
    moodTags: data.moodTags as unknown as string[],
    coWriters: data.coWriters as unknown as string[],
    harmonicSignature: data.harmonicSignature as unknown as number[],
  });
  await db.execute(sql`UPDATE users SET songSlotsUsed = songSlotsUsed + 1 WHERE id = ${data.userId}`);
  return result;
}

export async function getSongById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSongWithCreator(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    song: songs,
    creator: {
      id: users.id, name: users.name, artistHandle: users.artistHandle,
      profilePhotoUrl: users.profilePhotoUrl, stripeAccountStatus: users.stripeAccountStatus,
      stripeAccountId: users.stripeAccountId, aiDisclosure: users.aiDisclosure, primaryGenre: users.primaryGenre,
      // canonical CreatorSummary field — must match FeedRow.creator shape (coreDataTypes.ts)
      role: users.role,
    },
  }).from(songs).leftJoin(users, eq(songs.userId, users.id))
    // Allow published OR public songs — OG tags should work for any accessible song
    .where(and(eq(songs.id, id), eq(songs.isPublic, true))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSongsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Sort by creator's explicit displayOrder first; fall back to upload date for unset (0) entries
  return db.select().from(songs).where(eq(songs.userId, userId)).orderBy(asc(songs.displayOrder), asc(songs.createdAt)).limit(1000); // Safety cap per creator
}

/** Bulk-update displayOrder for a creator's songs. orderedIds must all belong to userId. */
export async function reorderSongs(userId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) return;
  // Update each song's displayOrder to its 1-based position in the array
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(songs)
        .set({ displayOrder: index + 1 })
        .where(and(eq(songs.id, id), eq(songs.userId, userId)))
    )
  );
}

export async function getPublicSongs(opts?: { genre?: string; search?: string; limit?: number; offset?: number; randomize?: boolean; seed?: number; contentType?: "audio" | "lyrics" | "manuscript" | "comic" | "written" | "game" }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const conditions: ReturnType<typeof eq>[] = [eq(songs.isPublic, true) as ReturnType<typeof eq>, eq(songs.status, "Published") as ReturnType<typeof eq>];
  if (opts?.contentType === "written") {
    // "written" is a virtual type that matches both manuscript and comic
    conditions.push(or(eq(songs.contentType, "manuscript"), eq(songs.contentType, "comic")) as unknown as ReturnType<typeof eq>);
  } else if (opts?.contentType) {
    conditions.push(eq(songs.contentType, opts.contentType) as ReturnType<typeof eq>);
  }
  if (opts?.genre) conditions.push(eq(songs.genre, opts.genre) as ReturnType<typeof eq>);
  if (opts?.search) {
    conditions.push(or(
      like(songs.title, `%${opts.search}%`),
      like(songs.genre, `%${opts.search}%`),
    ) as unknown as ReturnType<typeof eq>);
  }
  // When a specific creator is filtered (via creatorId option), respect their displayOrder.
  // For global/mixed feeds, sort by creator-inputted releaseDate first, fall back to createdAt.
  const orderExpr = opts?.randomize
    ? (opts.seed !== undefined ? sql`RAND(${opts.seed})` : sql`RAND()`)
    : (opts as any)?.creatorId
      ? sql`${songs.displayOrder} ASC, ${songs.createdAt} ASC`
      : sql`COALESCE(${songs.releaseDate}, DATE(${songs.createdAt})) DESC, ${songs.createdAt} DESC`;
  return db.select({
    song: songs,
    creator: { id: users.id, name: users.name, artistHandle: users.artistHandle, profilePhotoUrl: users.profilePhotoUrl, aiDisclosure: users.aiDisclosure, primaryGenre: users.primaryGenre, stripeAccountStatus: users.stripeAccountStatus, role: users.role },
  }).from(songs).leftJoin(users, eq(songs.userId, users.id))
    .where(and(...conditions)).orderBy(orderExpr).limit(limit).offset(offset);
}

export async function incrementPlayCount(songId: number) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE songs SET playCount = playCount + 1 WHERE id = ${songId}`);
}

// ─── Play Audit ──────────────────────────────────────────────────────────────
// Minimum seconds a listener must hear before the play is counted as qualified.
export const MIN_PLAY_SECONDS = 30;

export interface RecordPlayEventInput {
  songId: number;
  witnessId?: string | null;
  sessionId: string;          // client-generated UUID, stable per listening session
  userId?: number | null;
  durationSeconds: number;    // how long they have listened so far
  totalDurationSeconds?: number; // full track length (for completed calculation)
  ipHash?: string | null;     // SHA-256 of IP address (never raw IP)
}

/**
 * Record a qualified play event.
 * Rules:
 *   1. durationSeconds must be >= MIN_PLAY_SECONDS (30 s) to count.
 *   2. Each sessionId is only recorded once — duplicate calls are ignored.
 *   3. If the play qualifies, songs.playCount is also incremented.
 * Returns { recorded: boolean; reason?: string }
 */
export async function recordPlayEvent(input: RecordPlayEventInput): Promise<{ recorded: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) return { recorded: false, reason: "db_unavailable" };

  // Rule 1: minimum threshold
  if (input.durationSeconds < MIN_PLAY_SECONDS) {
    return { recorded: false, reason: "below_threshold" };
  }

  // Rule 2: session deduplication — check if this sessionId was already recorded
  const [existing] = await db
    .select({ id: playEvents.id })
    .from(playEvents)
    .where(eq(playEvents.sessionId, input.sessionId))
    .limit(1);
  if (existing) {
    return { recorded: false, reason: "duplicate_session" };
  }

  // Rule 3: record the event
  const completed =
    input.totalDurationSeconds != null && input.totalDurationSeconds > 0
      ? input.durationSeconds >= input.totalDurationSeconds * 0.8
      : false;

  await db.insert(playEvents).values({
    songId: input.songId,
    witnessId: input.witnessId ?? null,
    sessionId: input.sessionId,
    userId: input.userId ?? null,
    durationSeconds: Math.floor(input.durationSeconds),
    completed,
    ipHash: input.ipHash ?? null,
  });

  // Increment the denormalized playCount on songs
  await db.execute(sql`UPDATE songs SET playCount = playCount + 1 WHERE id = ${input.songId}`);

  return { recorded: true };
}

/**
 * Get play audit stats for a song (total qualified plays, completions, avg duration).
 */
export async function getPlayAuditStats(songId: number) {
  const db = await getDb();
  if (!db) return { total: 0, completions: 0, avgDuration: 0 };
  const [row] = await db.execute(sql`
    SELECT
      COUNT(*) as total,
      SUM(completed) as completions,
      AVG(durationSeconds) as avgDuration
    FROM playEvents
    WHERE songId = ${songId}
  `) as any;
  const r = Array.isArray(row) ? row[0] : row;
  return {
    total: Number(r?.total ?? 0),
    completions: Number(r?.completions ?? 0),
    avgDuration: Math.round(Number(r?.avgDuration ?? 0)),
  };
}

export async function deleteSong(songId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Soft delete — WID record is NEVER hard-deleted. Sets status='Deleted', isPublic=false.
  await db.update(songs)
    .set({ status: "Deleted", isPublic: false, updatedAt: new Date() })
    .where(and(eq(songs.id, songId), eq(songs.userId, userId)));
  await db.execute(sql`UPDATE users SET songSlotsUsed = GREATEST(songSlotsUsed - 1, 0) WHERE id = ${userId}`);
  // ── Cascade cleanup: remove this song from all join tables ──────────────────
  // 1. Personal user collection tracks
  await db.delete(userCollectionTracks).where(eq(userCollectionTracks.songId, songId));
  // 2. Named playlist tracks
  const { playlistTracks } = await import("../../drizzle/schema");
  await db.delete(playlistTracks).where(eq(playlistTracks.songId, songId));
  // 3. Personal playlistItems queue
  const { playlistItems } = await import("../../drizzle/schema");
  await db.delete(playlistItems).where(eq(playlistItems.songId, songId));
  // ── Auto-delete empty personal user collections ──────────────────────────────
  // Find all user collections owned by this user that now have zero tracks
  const userCollsForUser = await db
    .select({ id: userCollections.id })
    .from(userCollections)
    .where(eq(userCollections.userId, userId));
  if (userCollsForUser.length > 0) {
    const collIds = userCollsForUser.map((c: { id: number }) => c.id);
    const trackCounts = await db
      .select({ collectionId: userCollectionTracks.collectionId, cnt: sql<number>`count(*)` })
      .from(userCollectionTracks)
      .where(inArray(userCollectionTracks.collectionId, collIds))
      .groupBy(userCollectionTracks.collectionId);
    const nonEmptyIds = new Set(trackCounts.map((r: { collectionId: number }) => r.collectionId));
    const emptyCollIds = collIds.filter((id: number) => !nonEmptyIds.has(id));
    if (emptyCollIds.length > 0) {
      console.log(`[CollectionCleanup] Auto-deleting ${emptyCollIds.length} empty user collection(s): [${emptyCollIds.join(', ')}] after song ${songId} deleted`);
      await db.delete(userCollections).where(inArray(userCollections.id, emptyCollIds));
    }
  }
  // ── Auto-delete empty named playlists ────────────────────────────────────────
  const { playlists } = await import("../../drizzle/schema");
  const userPlaylists = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(eq(playlists.ownerId, userId));
  if (userPlaylists.length > 0) {
    const playlistIds = userPlaylists.map((p: { id: number }) => p.id);
    const playlistTrackCounts = await db
      .select({ playlistId: playlistTracks.playlistId, cnt: sql<number>`count(*)` })
      .from(playlistTracks)
      .where(inArray(playlistTracks.playlistId, playlistIds))
      .groupBy(playlistTracks.playlistId);
    const nonEmptyPlaylistIds = new Set(playlistTrackCounts.map((r: { playlistId: number }) => r.playlistId));
    const emptyPlaylistIds = playlistIds.filter((id: number) => !nonEmptyPlaylistIds.has(id));
    if (emptyPlaylistIds.length > 0) {
      console.log(`[CollectionCleanup] Auto-deleting ${emptyPlaylistIds.length} empty playlist(s): [${emptyPlaylistIds.join(', ')}] after song ${songId} deleted`);
      await db.delete(playlists).where(inArray(playlists.id, emptyPlaylistIds));
    }
  }
}

export async function reorderMySongs(userId: number, songIds: number[]) {
  const db = await getDb();
  if (!db) return;
  await Promise.all(
    songIds.map((id, index) =>
      db.update(songs)
        .set({ trackOrder: index, updatedAt: new Date() })
        .where(and(eq(songs.id, id), eq(songs.userId, userId)))
    )
  );
}

export async function updateSongStatus(
  songId: number,
  userId: number,
  status: "Draft" | "Published" | "Unlisted" | "Deleted"
) {
  const db = await getDb();
  if (!db) return;
  // Enforce publish gate: partial-rights works cannot be Published
  if (status === "Published") {
    const [row] = await db.select({ ownershipStatus: songs.ownershipStatus }).from(songs)
      .where(and(eq(songs.id, songId), eq(songs.userId, userId))).limit(1);
    if (row?.ownershipStatus === "partial") {
      throw new Error("This work cannot be published without full commercial ownership or a commercial license.");
    }
  }
  // Keep isPublic in sync: only Published songs are publicly visible in any feed
  const isPublic = status === "Published";
  await db.update(songs).set({ status, isPublic, updatedAt: new Date() }).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

export async function getSongByWitnessId(witnessId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      song: songs,
      creator: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
    })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(eq(songs.witnessId, witnessId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSongMetadata(
  songId: number,
  userId: number,
  fields: {
    caption?: string | null;
    genre?: string | null;
    collectionTag?: string | null;
    coverArtUrl?: string | null;
    aiConsent?: "prohibited" | "permitted_attribution" | "permitted";
    ownershipStatus?: "full" | "partial";
    status?: "Draft" | "Published" | "Unlisted" | "Deleted";
    coverPositionX?: number;
    coverPositionY?: number;
    // AI Disclosure & HAAI Declaration fields
    aiDisclosure?: "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument" | null;
    haaiVisualConcept?: string | null;
    haaiStyleLanguage?: string | null;
    haaiInstrumentation?: string | null;
    haaiVocalConveyance?: string | null;
    haaiLyricalInspiration?: string | null;
    haaiEmotionalTone?: string | null;
    haaiDeclaredAt?: Date | null;
    parentSongId?: number | null;
    pagesJson?: string | null;
    readAccess?: "open" | "preview" | "locked";
    purchasePriceCents?: number | null;
    previewPageCount?: number;
    consentSettingsJson?: string | null;
    externalLinksJson?: string | null;
    // Narrative Format
    narrativeFormat?: "comic" | "childrens" | "manuscript" | null;
    // Guided Reader: Panel Regions & Soundtrack Cues
    panelRegionsJson?: string | null;
    soundtrackCuesJson?: string | null;
    // Core metadata
    title?: string;
    description?: string | null;
    headlineCaption?: string | null;
    // Release / creation date
    releaseDate?: string | null;
    // HAAI Origin Story
    haaiOriginStory?: string | null;
    // Mood tags
    moodTags?: string[] | null;
    // Download Settings
    downloadPermission?: "none" | "free" | "tipped";
    downloadTipThresholdCents?: number;
  }
) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.caption !== undefined) updateSet.caption = fields.caption;
  if (fields.genre !== undefined) updateSet.genre = fields.genre;
  if (fields.collectionTag !== undefined) updateSet.collectionTag = fields.collectionTag;
  if (fields.coverArtUrl !== undefined) updateSet.coverArtUrl = fields.coverArtUrl;
  if (fields.aiConsent !== undefined) updateSet.aiConsent = fields.aiConsent;
  if (fields.ownershipStatus !== undefined) updateSet.ownershipStatus = fields.ownershipStatus;
  // Enforce publish gate: partial-rights works cannot be Published or monetized
  if (fields.status === "Published" && fields.ownershipStatus === "partial") {
    throw new Error("This work cannot be published without full commercial ownership or a commercial license.");
  }
  if (fields.status !== undefined) updateSet.status = fields.status;
  if (fields.coverPositionX !== undefined) updateSet.coverPositionX = fields.coverPositionX;
  if (fields.coverPositionY !== undefined) updateSet.coverPositionY = fields.coverPositionY;
  if (fields.aiDisclosure !== undefined) updateSet.aiDisclosure = fields.aiDisclosure;
  if (fields.haaiVisualConcept !== undefined) updateSet.haaiVisualConcept = fields.haaiVisualConcept;
  if (fields.haaiStyleLanguage !== undefined) updateSet.haaiStyleLanguage = fields.haaiStyleLanguage;
  if (fields.haaiInstrumentation !== undefined) updateSet.haaiInstrumentation = fields.haaiInstrumentation;
  if (fields.haaiVocalConveyance !== undefined) updateSet.haaiVocalConveyance = fields.haaiVocalConveyance;
  if (fields.haaiLyricalInspiration !== undefined) updateSet.haaiLyricalInspiration = fields.haaiLyricalInspiration;
  if (fields.haaiEmotionalTone !== undefined) updateSet.haaiEmotionalTone = fields.haaiEmotionalTone;
  if (fields.haaiDeclaredAt !== undefined) updateSet.haaiDeclaredAt = fields.haaiDeclaredAt;
  if (fields.parentSongId !== undefined) updateSet.parentSongId = fields.parentSongId;
  if (fields.pagesJson !== undefined) updateSet.pagesJson = fields.pagesJson;
  if (fields.readAccess !== undefined) updateSet.readAccess = fields.readAccess;
  if (fields.purchasePriceCents !== undefined) updateSet.purchasePriceCents = fields.purchasePriceCents;
  if (fields.previewPageCount !== undefined) updateSet.previewPageCount = fields.previewPageCount;
  if (fields.consentSettingsJson !== undefined) updateSet.consentSettingsJson = fields.consentSettingsJson;
  if (fields.externalLinksJson !== undefined) updateSet.externalLinksJson = fields.externalLinksJson;
  if (fields.narrativeFormat !== undefined) updateSet.narrativeFormat = fields.narrativeFormat;
  if (fields.panelRegionsJson !== undefined) updateSet.panelRegionsJson = fields.panelRegionsJson;
  if (fields.soundtrackCuesJson !== undefined) updateSet.soundtrackCuesJson = fields.soundtrackCuesJson;
  if (fields.title !== undefined) updateSet.title = fields.title;
  if (fields.description !== undefined) updateSet.description = fields.description;
  if (fields.headlineCaption !== undefined) updateSet.headlineCaption = fields.headlineCaption;
  if (fields.releaseDate !== undefined) updateSet.releaseDate = fields.releaseDate;
  if (fields.haaiOriginStory !== undefined) updateSet.haaiOriginStory = fields.haaiOriginStory;
  if (fields.moodTags !== undefined) updateSet.moodTags = fields.moodTags;
  if (fields.downloadPermission !== undefined) updateSet.downloadPermission = fields.downloadPermission;
  if (fields.downloadTipThresholdCents !== undefined) updateSet.downloadTipThresholdCents = fields.downloadTipThresholdCents;
  await db.update(songs).set(updateSet).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

// ─── Sovereign Stamp ─────────────────────────────────────────────────────────
// getSongById already exists above (line ~289) — no duplicate needed.

/**
 * Update the Sovereign Stamp fields on a song row.
 * Called after the tone injection pipeline completes.
 */
export async function updateSongStamp(
  id: number,
  data: {
    sovereignStampId: string;
    sovereignStampedAt: Date;
    stampedFileUrl: string;
    stampedFileKey: string;
    stampedFileHash: string;
    certificateUrl: string;
    certificateKey: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(songs)
    .set({
      sovereignStampId: data.sovereignStampId,
      sovereignStampedAt: data.sovereignStampedAt,
      stampedFileUrl: data.stampedFileUrl,
      stampedFileKey: data.stampedFileKey,
      stampedFileHash: data.stampedFileHash,
      certificateUrl: data.certificateUrl,
      certificateKey: data.certificateKey,
    })
        .where(eq(songs.id, id));
}

export async function updateSongLyrics(songId: number, userId: number, lyricsText: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ lyricsText, updatedAt: new Date() }).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}
export async function updateSongLyricsWithWid(
  songId: number,
  userId: number,
  fields: { lyricsText: string; lyricsWid: string; lyricsFileName: string; lyricsFileHash: string; lyricsAddedAt: Date }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ ...fields, updatedAt: new Date() }).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}
// ─── Audio Version History ────────────────────────────────────────────────────

/** Archive the current audio file as a historical version before replacing it. */
export async function archiveAudioVersion(data: {
  songId: number;
  witnessId: string;
  audioUrl: string;
  fileKey?: string | null;
  fileHash?: string | null;
  versionNote?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(audioVersions).values({
    songId: data.songId,
    witnessId: data.witnessId,
    audioUrl: data.audioUrl,
    fileKey: data.fileKey ?? null,
    fileHash: data.fileHash ?? null,
    versionNote: data.versionNote ?? null,
  });
}

/** Update the songs row with the new audio file and new WID-MUS. */
export async function replaceAudioFile(
  songId: number,
  userId: number,
  fields: {
    fileUrl: string;
    fileKey: string;
    fileHash: string;
    witnessId: string;
    durationSeconds?: number;
    sampleRate?: number;
    bitDepth?: number;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(songs)
    .set({ ...fields, isLyricsOnly: false, contentType: "audio", updatedAt: new Date() })
    .where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

/** Return all archived audio versions for a song, newest first. */
export async function getAudioVersions(songId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(audioVersions)
    .where(eq(audioVersions.songId, songId))
    .orderBy(desc(audioVersions.replacedAt));
}

export async function updateSongVideo(
  songId: number,
  userId: number,
  fields: { videoUrl: string | null; videoKey: string | null; videoWitnessId: string | null }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ ...fields, updatedAt: new Date() }).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

export async function getRelatedSongs(songId: number, genre?: string | null, limit = 6) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(songs.isPublic, true), eq(songs.status, "Published"), ne(songs.id, songId)];
  if (genre) conditions.push(eq(songs.genre, genre));
  return db.select({
    song: songs,
    creator: { id: users.id, name: users.name, artistHandle: users.artistHandle, profilePhotoUrl: users.profilePhotoUrl },
  }).from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(songs.playCount))
    .limit(limit);
}


// ─── Likes ────────────────────────────────────────────────────────────────────

export async function getLikedSongs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { likes } = await import("../../drizzle/schema");
  return db
    .select({
      song: songs,
      creator: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
      likedAt: likes.createdAt,
    })
    .from(likes)
    .innerJoin(songs, and(eq(likes.songId, songs.id), eq(songs.status, "Published")))
    .leftJoin(users, eq(songs.userId, users.id))
    .where(eq(likes.userId, userId))
    .orderBy(desc(likes.createdAt))
    .limit(100);
}

export async function toggleLike(userId: number, songId: number): Promise<{ liked: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { likes } = await import("../../drizzle/schema");
  const existing = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.songId, songId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.songId, songId)));
    return { liked: false };
  } else {
    await db.insert(likes).values({ userId, songId });
    return { liked: true };
  }
}

export async function getLikeStatus(userId: number, songId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { likes } = await import("../../drizzle/schema");
  const result = await db
    .select({ id: likes.id })
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.songId, songId)))
    .limit(1);
  return result.length > 0;
}

export async function getLikeCount(songId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { likes } = await import("../../drizzle/schema");
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(likes)
    .where(eq(likes.songId, songId));
  return Number(result[0]?.count ?? 0);
}

/**
 * Bulk fetch like statuses and counts for multiple songs in two queries.
 * Returns a map of songId -> { liked: boolean; count: number }.
 */
export async function getBulkLikeStatuses(
  userId: number | null,
  songIds: number[]
): Promise<Record<number, { liked: boolean; count: number }>> {
  if (songIds.length === 0) return {};
  const db = await getDb();
  if (!db) return {};
  const { likes } = await import("../../drizzle/schema");

  // One query for all counts
  const countRows = await db
    .select({ songId: likes.songId, count: sql<number>`count(*)` })
    .from(likes)
    .where(inArray(likes.songId, songIds))
    .groupBy(likes.songId);

  // One query for user's liked songs (only if logged in)
  const likedSet = new Set<number>();
  if (userId !== null) {
    const likedRows = await db
      .select({ songId: likes.songId })
      .from(likes)
      .where(and(eq(likes.userId, userId), inArray(likes.songId, songIds)));
    likedRows.forEach((r: { songId: number }) => likedSet.add(r.songId));
  }

  const countMap: Record<number, number> = {};
  countRows.forEach((r: { songId: number; count: number }) => { countMap[r.songId] = Number(r.count); });

  const result: Record<number, { liked: boolean; count: number }> = {};
  for (const id of songIds) {
    result[id] = { liked: likedSet.has(id), count: countMap[id] ?? 0 };
  }
  return result;
}


// ─── Recent Tips (for ticker) ─────────────────────────────────────────────────

export async function getRecentTips(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const tipper = alias(users, "tipper");
  const creator = alias(users, "creator");
  const rows = await db
    .select({
      id: tips.id,
      amountCents: tips.amountCents,
      createdAt: tips.createdAt,
      songTitle: songs.title,
      fanName: tipper.name,
      creatorName: creator.name,
      creatorHandle: creator.artistHandle,
    })
    .from(tips)
    .innerJoin(songs, eq(tips.songId, songs.id))
    .innerJoin(creator, eq(songs.userId, creator.id))
    .leftJoin(tipper, eq(tips.tipperUserId, tipper.id))
    .orderBy(desc(tips.createdAt))
    .limit(limit);
  return rows;
}

// ─── Download Permission Helpers ───────────────────────────────────────────────

/** Get total amount a specific user has tipped on a specific song (in cents) */
export async function getUserTipTotalForSong(userId: number, songId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Primary: check tips table (final reconciled record)
  const tipsResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${tips.amountCents}), 0)` })
    .from(tips)
    .where(and(eq(tips.songId, songId), eq(tips.tipperUserId, userId)));
  const tipsTotal = Number(tipsResult[0]?.total ?? 0);
  if (tipsTotal > 0) return tipsTotal;
  // Fallback: check events table (written FIRST by Stripe webhook, before tips table).
  // This resolves the race condition where the webhook has fired and written the TIP event
  // but the secondary tips table write hasn't committed yet when the user polls for unlock.
  const eventsResult = await db
    .select({ total: sql<number>`COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(${events.payload}, '$.amountCents')) AS UNSIGNED)), 0)` })
    .from(events)
    .where(
      and(
        eq(events.type, "TIP"),
        eq(events.workId, songId),
        eq(events.actorId, userId)
      )
    );
  return Number(eventsResult[0]?.total ?? 0);
}

/** Update a song's download permission (creator only — caller must verify ownership) */
export async function updateSongDownloadPermission(
  songId: number,
  userId: number,
  permission: "none" | "free" | "tipped",
  tipThresholdCents: number = 179
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(songs)
    .set({ downloadPermission: permission, downloadTipThresholdCents: tipThresholdCents, updatedAt: new Date() })
    .where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

// ─── Admin ────────────────────────────────────────────────────────────────────

// ─── Collections (Album WID) ─────────────────────────────────────────────────

/** Create a new collection record after a batch upload completes. */
export async function createCollection(data: {
  creatorId: number;
  name: string;
  collectionWid: string;
  collectiveHash: string;
  coverArtUrl?: string;
  trackCount: number;
  pdfUrl?: string;
  pdfKey?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(collections).values({
    creatorId: data.creatorId,
    name: data.name,
    collectionWid: data.collectionWid,
    collectiveHash: data.collectiveHash,
    coverArtUrl: data.coverArtUrl ?? null,
    trackCount: data.trackCount,
    pdfUrl: data.pdfUrl ?? null,
    pdfKey: data.pdfKey ?? null,
  });
  return result;
}

/** Attach a PDF URL to an existing collection after generation. */
export async function updateCollectionPdf(collectionId: number, pdfUrl: string, pdfKey: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(collections).set({ pdfUrl, pdfKey }).where(eq(collections.id, collectionId));
}

/** Set collectionId on a batch of song rows. */
export async function linkSongsToCollection(songIds: number[], collectionId: number) {
  const db = await getDb();
  if (!db) return;
  // Update each song row individually, preserving upload order via trackOrder
  for (let i = 0; i < songIds.length; i++) {
    await db.update(songs).set({ collectionId, trackOrder: i }).where(eq(songs.id, songIds[i]));
  }
}

/** Get a collection by its WID-ALB identifier. */
export async function getCollectionByWid(collectionWid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(collections).where(eq(collections.collectionWid, collectionWid)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Get a collection by its numeric id. */
export async function getCollectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Get all songs that belong to a collection, ordered by trackOrder (upload sequence). */
export async function getSongsByCollectionId(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  // Only return live (non-deleted) tracks — soft-deleted songs must not appear in the collection view
  return db.select().from(songs)
    .where(and(eq(songs.collectionId, collectionId), sql`${songs.status} != 'Deleted'`))
    .orderBy(songs.trackOrder, songs.createdAt); // trackOrder preserves batch upload sequence; createdAt as tiebreaker
}

/** Get the collection a song belongs to (if any). */
export async function getCollectionForSong(songId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [song] = await db.select({ collectionId: songs.collectionId }).from(songs).where(eq(songs.id, songId)).limit(1);
  if (!song?.collectionId) return undefined;
  return getCollectionById(song.collectionId);
}

/** Get all collections by a creator — only returns collections with at least one live (non-deleted) track. */
export async function getCollectionsByCreator(creatorId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join to songs to get live track count; exclude collections where all tracks have been deleted
  const rows = await db
    .select({
      collection: collections,
      liveTrackCount: sql<number>`count(${songs.id})`,
    })
    .from(collections)
    .leftJoin(songs, and(
      eq(songs.collectionId, collections.id),
      sql`${songs.status} != 'Deleted'`,
    ))
    .where(eq(collections.creatorId, creatorId))
    .groupBy(collections.id)
    .orderBy(desc(collections.createdAt));
  // Filter out empty shells (all tracks deleted) and attach live count
  return rows
    .filter((r: { liveTrackCount: number }) => Number(r.liveTrackCount) > 0)
    .map((r: { collection: typeof collections.$inferSelect; liveTrackCount: number }) => ({
      ...r.collection,
      trackCount: Number(r.liveTrackCount),
    }));
}

/** Update collection cover art URL and/or position. */
export async function updateCollectionCover(
  collectionId: number,
  creatorId: number,
  data: { coverArtUrl?: string; coverPositionX?: number; coverPositionY?: number }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(collections).set(data).where(
    and(eq(collections.id, collectionId), eq(collections.creatorId, creatorId))
  );
}


// ─── Song Reactions ───────────────────────────────────────────────────────────

/** Get reaction counts per emoji for a song, plus the current user's selections */
export async function getSongReactions(songId: number, userId?: number) {
  const db = await getDb();
  if (!db) return { counts: {} as Record<string, number>, mine: [] as string[] };
  const { songReactions } = await import("../../drizzle/schema");

  // All reactions for this song
  const rows = await db
    .select()
    .from(songReactions)
    .where(eq(songReactions.songId, songId));

  // Aggregate counts
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.type] = (counts[row.type] ?? 0) + 1;
  }

  // Current user's selected reactions
  const mine: string[] = userId
    ? rows.filter((r: any) => r.userId === userId).map((r: any) => r.type as string)
    : [];

  return { counts, mine };
}

/** Toggle a reaction: if the user already has it, remove it; otherwise add it */
export async function toggleSongReaction(
  songId: number,
  userId: number,
  type: string
): Promise<"added" | "removed"> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { songReactions } = await import("../../drizzle/schema");

  // Check if reaction already exists
  const existing = await db
    .select({ id: songReactions.id })
    .from(songReactions)
    .where(
      and(
        eq(songReactions.userId, userId),
        eq(songReactions.songId, songId),
        eq(songReactions.type, type)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Remove it
    await (db as any)
      .delete(songReactions)
      .where(
        and(
          eq(songReactions.userId, userId),
          eq(songReactions.songId, songId),
          eq(songReactions.type, type)
        )
      );
    return "removed";
  } else {
    // Add it
    await db.insert(songReactions).values({ userId, songId, type });
    return "added";
  }
}

// ── Trending Works ─────────────────────────────────────────────────────────
// Score: weeklyPlays×3 + weeklyLikes×5 + allTimePlays×0.1
// Uses playEvents table for a true 7-day windowed play count.
// Falls back gracefully: tracks with no play events still appear via allTimePlays tiebreaker.
export async function getTrendingWorks(opts?: { genre?: string; limit?: number; contentType?: string }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 500;
  const conditions: ReturnType<typeof sql>[] = [
    eq(songs.isPublic, true),
    eq(songs.status, "Published"),
  ];
  if (opts?.genre) conditions.push(eq(songs.genre, opts.genre));
  if (opts?.contentType === "written") {
    conditions.push(or(eq(songs.contentType, "manuscript"), eq(songs.contentType, "comic")) as unknown as ReturnType<typeof sql>);
  } else if (opts?.contentType) {
    conditions.push(eq(songs.contentType, opts.contentType as "audio" | "lyrics" | "manuscript" | "comic"));
  }

  // 7-day cutoff for windowed counts
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await db.select({
    song: songs,
    creator: {
      id: users.id,
      name: users.name,
      artistHandle: users.artistHandle,
      profilePhotoUrl: users.profilePhotoUrl,
      aiDisclosure: users.aiDisclosure,
      primaryGenre: users.primaryGenre,
      stripeAccountStatus: users.stripeAccountStatus,
    },
    // Weekly plays: distinct play events in the last 7 days
    weeklyPlays: sql<number>`(
      SELECT COUNT(*) FROM playEvents
      WHERE playEvents.songId = ${songs.id}
      AND playEvents.createdAt >= ${sevenDaysAgo}
    )`,
    // Weekly likes: likes created in the last 7 days
    weeklyLikes: sql<number>`(
      SELECT COUNT(*) FROM likes
      WHERE likes.songId = ${songs.id}
      AND likes.createdAt >= ${sevenDaysAgo}
    )`,
    // All-time like count for display in the UI
    likeCount: sql<number>`(SELECT COUNT(*) FROM likes WHERE likes.songId = ${songs.id})`,
  })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(...conditions))
    .limit(limit * 5);

  type RowType = (typeof rows)[number];
  type ScoredRow = RowType & { score: number };
  const scored: ScoredRow[] = rows.map((r: RowType) => {
    const weeklyPlays = Number(r.weeklyPlays) || 0;
    const weeklyLikes = Number(r.weeklyLikes) || 0;
    const allTimePlays = r.song.playCount ?? 0;
    // Scoring: weekly engagement is the primary signal, but all-time plays provide a meaningful
    // baseline so the trending list never looks empty on a quiet week.
    // - weeklyPlays * 3: a song played 5 times this week scores 15
    // - weeklyLikes * 5: likes are higher-intent signals
    // - allTimePlays * 0.1: a song with 100 all-time plays adds 10 to its score as a quality signal
    // This means a song with 0 weekly activity but 100 all-time plays (score: 10) ranks below
    // a song with 1 weekly play (score: 3+0.1), but still appears rather than sinking to the bottom.
    const score = weeklyPlays * 3 + weeklyLikes * 5 + allTimePlays * 0.1;
    return { ...r, score };
  });
  scored.sort((a: ScoredRow, b: ScoredRow) => b.score - a.score);
  return scored.slice(0, limit).map(({ score: _score, weeklyPlays: _wp, weeklyLikes: _wl, ...rest }: ScoredRow) => rest);
}

/** Returns all published songs that don't yet have an embedVideoUrl, for batch pre-generation. */
export async function getSongsWithoutEmbedVideo(): Promise<Array<{ id: number; coverArtUrl: string | null; fileUrl: string | null; embedVideoUrl: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  const { isNull } = await import("drizzle-orm");
  const rows = await db
    .select({ id: songs.id, coverArtUrl: songs.coverArtUrl, fileUrl: songs.fileUrl, embedVideoUrl: songs.embedVideoUrl })
    .from(songs)
    .where(and(eq(songs.status, "Published"), eq(songs.isPublic, true), isNull(songs.embedVideoUrl)));
  return rows;
}


// ─── Auto Video Engine ────────────────────────────────────────────────────────
/**
 * Returns songs that need an auto-generated loop video.
 * Priority: founders first, then regular users.
 * Filters: Published, public, has coverArtUrl + fileUrl, no autoVideoUrl yet.
 */
export async function getSongsNeedingAutoVideo(limit = 100): Promise<Array<{
  id: number;
  userId: number;
  title: string;
  coverArtUrl: string | null;
  fileUrl: string | null;
  autoVideoUrl: string | null;
  isFounder: boolean;
}>> {
  const db = await getDb();
  if (!db) return [];
  const { isNull, isNotNull } = await import("drizzle-orm");
  // Fetch songs needing auto video, join users to get role for priority sorting
  const rows = await db
    .select({
      id: songs.id,
      userId: songs.userId,
      title: songs.title,
      coverArtUrl: songs.coverArtUrl,
      fileUrl: songs.fileUrl,
      autoVideoUrl: songs.autoVideoUrl,
      role: users.role,
    })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(
      eq(songs.status, "Published"),
      eq(songs.isPublic, true),
      isNull(songs.autoVideoUrl),
      isNotNull(songs.coverArtUrl),
      isNotNull(songs.fileUrl),
    ))
    .limit(limit);
  // Sort: founders first
  type RowItem = (typeof rows)[number];
  type MappedRow = RowItem & { isFounder: boolean };
  return rows
    .map((r: RowItem): MappedRow => ({ ...r, isFounder: r.role === "founder" }))
    .sort((a: MappedRow, b: MappedRow) => (b.isFounder ? 1 : 0) - (a.isFounder ? 1 : 0));
}

/** Cache the generated auto video URL + key on a song. */
export async function cacheAutoVideoUrl(songId: number, url: string, key: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ autoVideoUrl: url, autoVideoKey: key }).where(eq(songs.id, songId));
}

/** Get auto video generation stats for the admin panel. */
export async function getAutoVideoStats(): Promise<{ total: number; withAutoVideo: number; pending: number }> {
  const db = await getDb();
  if (!db) return { total: 0, withAutoVideo: 0, pending: 0 };
  const { isNull, isNotNull } = await import("drizzle-orm");
  const [totalRow] = await db.select({ count: sql`count(*)` }).from(songs)
    .where(and(eq(songs.status, "Published"), eq(songs.isPublic, true)));
  const [withRow] = await db.select({ count: sql`count(*)` }).from(songs)
    .where(and(eq(songs.status, "Published"), eq(songs.isPublic, true), isNotNull(songs.autoVideoUrl)));
  const total = Number(totalRow?.count ?? 0);
  const withAutoVideo = Number(withRow?.count ?? 0);
  return { total, withAutoVideo, pending: total - withAutoVideo };
}


// ─── Song Versions ────────────────────────────────────────────────────────────

/** Create a new version record for a song. */
export async function createSongVersion(data: InsertSongVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(songVersions).values(data);
}

/** Get all versions for a song, newest first. */
export async function getSongVersions(songId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(songVersions)
    .where(eq(songVersions.songId, songId))
    .orderBy(desc(songVersions.versionNumber));
}

/** Get the latest version number for a song (0 if no versions yet). */
export async function getLatestVersionNumber(songId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ maxVersion: sql<number>`MAX(${songVersions.versionNumber})` })
    .from(songVersions)
    .where(eq(songVersions.songId, songId));
  return rows[0]?.maxVersion ?? 0;
}

/** Get a single version by its ID. */
export async function getSongVersionById(versionId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(songVersions)
    .where(eq(songVersions.id, versionId))
    .limit(1);
  return rows[0] ?? null;
}


export async function getNewThisWeek(opts?: { genre?: string; contentType?: "audio" | "lyrics" | "manuscript" | "comic" | "written" | "game"; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 24;
  // Use a 180-day window; fall back to most-recent works if nothing falls in the window.
  // The platform is still growing — a strict window returns nothing when uploads are sparse.
  // 180 days ensures the catalog always feels populated while still surfacing recent work first.
  const windowStart = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const creatorFields = {
    id: users.id, name: users.name, artistHandle: users.artistHandle,
    profilePhotoUrl: users.profilePhotoUrl, aiDisclosure: users.aiDisclosure,
    primaryGenre: users.primaryGenre, stripeAccountStatus: users.stripeAccountStatus,
    role: users.role,
  };
  const baseConditions: ReturnType<typeof eq>[] = [
    eq(songs.isPublic, true) as ReturnType<typeof eq>,
    eq(songs.status, "Published") as ReturnType<typeof eq>,
  ];
  if (opts?.genre) baseConditions.push(eq(songs.genre, opts.genre) as ReturnType<typeof eq>);
  if (opts?.contentType === "written") {
    baseConditions.push(or(eq(songs.contentType, "manuscript"), eq(songs.contentType, "comic")) as unknown as ReturnType<typeof eq>);
  } else if (opts?.contentType) {
    baseConditions.push(eq(songs.contentType, opts.contentType) as ReturnType<typeof eq>);
  }
  // Sort by creator-inputted releaseDate (VARCHAR 'YYYY-MM-DD') first, fall back to createdAt.
  // COALESCE(releaseDate, DATE(createdAt)) gives a consistent date string for ordering.
  const creatorDateSort = sql`COALESCE(${songs.releaseDate}, DATE(${songs.createdAt})) DESC, ${songs.createdAt} DESC`;
  // First attempt: 180-day window, newest creator date first
  const windowConditions = [
    ...baseConditions,
    sql`COALESCE(${songs.releaseDate}, DATE(${songs.createdAt})) >= DATE(${windowStart})` as unknown as ReturnType<typeof eq>,
  ];
  const windowResults = await db.select({ song: songs, creator: creatorFields })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(...windowConditions))
    .orderBy(creatorDateSort)
    .limit(limit);
  if (windowResults.length > 0) return windowResults;
  // Fallback: return the most recently created works (no time restriction)
  return db.select({ song: songs, creator: creatorFields })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(...baseConditions))
    .orderBy(creatorDateSort)
    .limit(limit);
}

/** Update the creditsJson field for a song (owner only — enforced in router). */
export async function updateSongCredits(songId: number, creditsJson: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(songs).set({ creditsJson }).where(eq(songs.id, songId));
}

/** Get total play count for a creator (sum of all their published songs). */
export async function getCreatorTotalPlays(creatorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ total: sql<number>`COALESCE(SUM(${songs.playCount}), 0)` })
    .from(songs)
    .where(and(eq(songs.userId, creatorId), eq(songs.status, "Published"), eq(songs.isPublic, true)));
  return Number(rows[0]?.total ?? 0);
}


// ─── Likes Reorder ────────────────────────────────────────────────────────────

export async function getLikedSongsOrdered(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      likeId: likes.id,
      sortOrder: likes.sortOrder,
      song: songs,
      creator: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
      likedAt: likes.createdAt,
    })
    .from(likes)
    .innerJoin(songs, and(eq(likes.songId, songs.id), eq(songs.status, "Published")))
    .leftJoin(users, eq(songs.userId, users.id))
    .where(eq(likes.userId, userId))
    .orderBy(asc(likes.sortOrder), desc(likes.createdAt))
    .limit(200);
}

export async function reorderLikes(userId: number, orderedSongIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (let i = 0; i < orderedSongIds.length; i++) {
    await db.update(likes)
      .set({ sortOrder: i })
      .where(and(eq(likes.userId, userId), eq(likes.songId, orderedSongIds[i])));
  }
}

// ─── Global Activity Feed ─────────────────────────────────────────────────────

// ─── Activation (Stage-Based Funding) ──────────────────────────────────────

export interface ActivationStage {
  id: string;
  label: string;
  goalCents: number;
  reachedAt: string | null;
}

/** Return the activation state for a song (stages + funding total). */
export interface RecentContributor {
  userId: number | null;
  name: string;
  image: string | null;
  stageId: string;
  amountCents: number;
  createdAt: Date;
  anonymous: boolean;
}

export async function getActivationForSong(songId: number): Promise<{
  activationEnabled: boolean;
  totalFundingCents: number;
  stages: ActivationStage[];
  recentContributors: RecentContributor[];
} | null> {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        activationEnabled: songs.activationEnabled,
        totalFundingCents: songs.totalFundingCents,
        activationStagesJson: songs.activationStagesJson,
      })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);
    if (!rows.length) return null;
    const row = rows[0];
    let stages: ActivationStage[] = [];
    if (row.activationStagesJson) {
      try { stages = JSON.parse(row.activationStagesJson); } catch { stages = []; }
    }
    // Fetch recent contributors with user info (LEFT JOIN so anonymous contributions are included)
    const contribRows = await db
      .select({
        userId: activationContributions.userId,
        stageId: activationContributions.stageId,
        amountCents: activationContributions.amountCents,
        contributorName: activationContributions.contributorName,
        anonymous: activationContributions.anonymous,
        createdAt: activationContributions.createdAt,
        userName: users.name,
        userImage: users.profilePhotoUrl,
      })
      .from(activationContributions)
      .leftJoin(users, eq(activationContributions.userId, users.id))
      .where(eq(activationContributions.songId, songId))
      .orderBy(desc(activationContributions.createdAt))
      .limit(15);
    const recentContributors: RecentContributor[] = contribRows.map((c: any) => ({
      userId: c.userId ?? null,
      name: c.anonymous ? 'Anonymous' : (c.userName ?? c.contributorName ?? 'Contributor'),
      image: c.anonymous ? null : ((c.userImage as string | null) ?? null),
      stageId: c.stageId,
      amountCents: c.amountCents,
      createdAt: c.createdAt,
      anonymous: Boolean(c.anonymous),
    }));
    return {
      activationEnabled: Boolean(row.activationEnabled),
      totalFundingCents: Number(row.totalFundingCents ?? 0),
      stages,
      recentContributors,
    };
  } catch {
    return null;
  }
}

/** Record a completed activation contribution and increment the song's totalFundingCents. */
export async function recordActivationContribution(data: {
  songId: number;
  userId?: number | null;
  stageId: string;
  amountCents: number;
  contributorName?: string;
  message?: string;
  anonymous?: boolean;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<void> {
  const db = await getDb();
  // Insert contribution row
  await db.insert(activationContributions).values({
    songId: data.songId,
    userId: data.userId ?? null,
    stageId: data.stageId,
    amountCents: data.amountCents,
    contributorName: data.contributorName ?? null,
    message: data.message ?? null,
    anonymous: data.anonymous ?? false,
    stripeSessionId: data.stripeSessionId ?? null,
    stripePaymentIntentId: data.stripePaymentIntentId ?? null,
  });
  // Increment totalFundingCents on the song
  await db
    .update(songs)
    .set({ totalFundingCents: sql`totalFundingCents + ${data.amountCents}` })
    .where(eq(songs.id, data.songId));
  // Check if any stage goal has been reached and mark reachedAt
  const songRow = await db
    .select({ activationStagesJson: songs.activationStagesJson, totalFundingCents: songs.totalFundingCents })
    .from(songs)
    .where(eq(songs.id, data.songId))
    .limit(1);
  if (songRow.length && songRow[0].activationStagesJson) {
    try {
      const stages: ActivationStage[] = JSON.parse(songRow[0].activationStagesJson);
      const total = Number(songRow[0].totalFundingCents ?? 0);
      let cumulative = 0;
      let changed = false;
      for (const stage of stages) {
        cumulative += stage.goalCents;
        if (!stage.reachedAt && total >= cumulative) {
          stage.reachedAt = new Date().toISOString();
          changed = true;
        }
      }
      if (changed) {
        await db
          .update(songs)
          .set({ activationStagesJson: JSON.stringify(stages) })
          .where(eq(songs.id, data.songId));
      }
    } catch { /* ignore parse errors */ }
  }
}

/** Get recent contributions for a song (for the supporter list). */
export async function getActivationContributions(songId: number, limit = 20): Promise<ActivationContribution[]> {
  try {
    const db = await getDb();
    return await db
      .select()
      .from(activationContributions)
      .where(eq(activationContributions.songId, songId))
      .orderBy(desc(activationContributions.createdAt))
      .limit(limit);
  } catch {
    return [];
  }
}

/** Set activation config on a song (owner-only, verified in router). */
export async function configureSongActivation(songId: number, data: {
  activationEnabled: boolean;
  stages: ActivationStage[];
}): Promise<void> {
  const db = await getDb();
  await db
    .update(songs)
    .set({
      activationEnabled: data.activationEnabled,
      activationStagesJson: JSON.stringify(data.stages),
    })
    .where(eq(songs.id, songId));
}

/** Verify that a user owns a song (returns true if they do). */
export async function verifySongOwnership(songId: number, userId: number): Promise<boolean> {
  try {
    const db = await getDb();
    const rows = await db
      .select({ userId: songs.userId })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);
    return rows.length > 0 && rows[0].userId === userId;
  } catch {
    return false;
  }
}

// ─── Work Evidence Helpers ────────────────────────────────────────────────────

export async function getEvidenceForSong(songId: number): Promise<WorkEvidence[]> {
  const db = await getDb();
  return db
    .select()
    .from(workEvidence)
    .where(eq(workEvidence.songId, songId))
    .orderBy(desc(workEvidence.createdAt));
}

export async function addEvidence(data: InsertWorkEvidence): Promise<WorkEvidence> {
  const db = await getDb();
  const [result] = await db.insert(workEvidence).values(data);
  const id = (result as any).insertId;
  const [row] = await db.select().from(workEvidence).where(eq(workEvidence.id, id));
  return row;
}

export async function deleteEvidence(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.select().from(workEvidence).where(eq(workEvidence.id, id));
  if (!row || row.addedByUserId !== userId) return false;
  await db.delete(workEvidence).where(eq(workEvidence.id, id));
  return true;
}


// ─── Physical Distribution Export ─────────────────────────────────────────────
/**
 * Fetch songs by IDs (with creator info) for physical export.
 * When songIds is empty and includeAll is true, returns all published songs (with optional search).
 */
export async function getSongsByIds(
  songIds: number[],
  opts?: { search?: string; limit?: number; offset?: number; includeAll?: boolean }
) {
  const db = await getDb();
  if (!db) return [];

  const limit = opts?.limit ?? 100;
  const offset = opts?.offset ?? 0;

  const conditions: any[] = [];

  if (songIds.length > 0) {
    conditions.push(inArray(songs.id, songIds));
  } else if (opts?.includeAll) {
    conditions.push(ne(songs.status, "Deleted"));
  } else {
    return [];
  }

  if (opts?.search) {
    conditions.push(or(
      like(songs.title, `%${opts.search}%`),
      like(songs.witnessId, `%${opts.search}%`),
    ));
  }

  return db.select({
    song: songs,
    creator: {
      id: users.id,
      name: users.name,
      artistHandle: users.artistHandle,
      profilePhotoUrl: users.profilePhotoUrl,
    },
  })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(songs.createdAt))
    .limit(limit)
    .offset(offset);
}


export async function updateSongFade(songId: number, userId: number, fadeInSeconds: number | null, fadeOutSeconds: number | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(songs).set({ fadeInSeconds, fadeOutSeconds } as any).where(eq(songs.id, songId));
}

// ─── Provenance: Work Events ──────────────────────────────────────────────────

export async function getWorkEvents(songId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(workEvents)
    .where(eq(workEvents.songId, songId))
    .orderBy(asc(workEvents.occurredAt));
  return rows;
}

export async function addWorkEvent(data: {
  songId: number;
  eventType: string;
  eventLabel?: string;
  eventData?: Record<string, unknown>;
  actorId?: number;
  actorName?: string;
  platformName?: string;
  platformUrl?: string;
  isSystemEvent?: boolean;
  occurredAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(workEvents).values({
    songId: data.songId,
    eventType: data.eventType,
    eventLabel: data.eventLabel,
    eventData: data.eventData as any,
    actorId: data.actorId,
    actorName: data.actorName,
    platformName: data.platformName,
    platformUrl: data.platformUrl,
    isSystemEvent: data.isSystemEvent ?? false,
    occurredAt: data.occurredAt ?? new Date(),
  } as any);
  return result;
}

// ─── Provenance: Work Lineage ─────────────────────────────────────────────────

export async function getWorkLineage(songId: number) {
  const db = await getDb();
  if (!db) return { parents: [], children: [] };

  const parentSong = alias(songs, 'parentSong');
  const childSong  = alias(songs, 'childSong');
  const parentUser = alias(users, 'parentUser');
  const childUser  = alias(users, 'childUser');

  const parents = await db
    .select({
      id: workLineage.id,
      parentSongId: workLineage.parentSongId,
      childSongId: workLineage.childSongId,
      relationshipType: workLineage.relationshipType,
      versionLabel: workLineage.versionLabel,
      notes: workLineage.notes,
      createdAt: workLineage.createdAt,
      parentTitle: parentSong.title,
      parentArtistHandle: parentUser.artistHandle,
    })
    .from(workLineage)
    .leftJoin(parentSong, eq(parentSong.id, workLineage.parentSongId))
    .leftJoin(parentUser, eq(parentUser.id, parentSong.userId))
    .where(eq(workLineage.childSongId, songId))
    .orderBy(asc(workLineage.createdAt));

  const children = await db
    .select({
      id: workLineage.id,
      parentSongId: workLineage.parentSongId,
      childSongId: workLineage.childSongId,
      relationshipType: workLineage.relationshipType,
      versionLabel: workLineage.versionLabel,
      notes: workLineage.notes,
      createdAt: workLineage.createdAt,
      childTitle: childSong.title,
      childArtistHandle: childUser.artistHandle,
    })
    .from(workLineage)
    .leftJoin(childSong, eq(childSong.id, workLineage.childSongId))
    .leftJoin(childUser, eq(childUser.id, childSong.userId))
    .where(eq(workLineage.parentSongId, songId))
    .orderBy(asc(workLineage.createdAt));

  return { parents, children };
}

export async function addLineageRelationship(data: {
  parentSongId: number;
  childSongId: number;
  relationshipType: string;
  versionLabel?: string;
  notes?: string;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(workLineage).values(data as any);
}

// ─── Provenance: Work Witnesses ───────────────────────────────────────────────

export async function getWorkWitnesses(songId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(workWitnesses)
    .where(eq(workWitnesses.songId, songId))
    .orderBy(asc(workWitnesses.invitedAt));
  return rows;
}

export async function inviteWitness(data: {
  songId: number;
  invitedByUserId: number;
  role: string;
  customRole?: string;
  contributionPercent?: number;
  inviteEmail?: string;
  inviteeName?: string;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { randomUUID } = await import("crypto");
  const token = randomUUID();
  const expiresAt = data.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(workWitnesses).values({
    ...data,
    inviteToken: token,
    expiresAt,
    status: "pending",
  } as any);
  return token;
}

export async function acceptWitnessInvite(token: string, witnessUserId: number, testimony?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .select()
    .from(workWitnesses)
    .where(eq(workWitnesses.inviteToken, token))
    .limit(1);
  if (!row) throw new Error("Invite not found");
  if (row.status !== "pending") throw new Error("Invite already used");
  if (row.expiresAt && row.expiresAt < new Date()) throw new Error("Invite expired");
  await db
    .update(workWitnesses)
    .set({
      witnessUserId,
      status: "accepted",
      testimony: testimony ?? null,
      witnessedAt: new Date(),
    } as any)
    .where(eq(workWitnesses.inviteToken, token));
  // Add a provenance event for the witness acceptance
  await addWorkEvent({
    songId: row.songId,
    eventType: "witnessed",
    eventLabel: `Witnessed by ${row.inviteeName ?? "a collaborator"} as ${row.role}`,
    actorId: witnessUserId,
    actorName: row.inviteeName ?? undefined,
    isSystemEvent: false,
  });
  return row;
}

// ─── Witness Subscription Helpers ────────────────────────────────────────────

/** Subscribe (or upgrade tier) a user to a creator's publication feed. */

export async function registerWorkViaApi(params: {
  userId: number;
  title: string;
  contentType: "audio" | "lyrics" | "manuscript" | "comic" | "image";
  fileUrl?: string;
  coverArtUrl?: string;
  description?: string;
  aiDisclosure?: "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument";
  externalId?: string; // third-party tool's own ID for deduplication
  metadata?: Record<string, unknown>;
}): Promise<{ songId: number; wid: string; registeredAt: string }> {
  const db = await getDb();
  const { randomBytes, createHash } = await import("crypto");

  // Generate WID based on content type prefix
  const prefixMap: Record<string, string> = {
    audio: "MUS", lyrics: "LYR", manuscript: "MSS", comic: "COM", image: "IMG",
  };
  const prefix = prefixMap[params.contentType] ?? "WRK";
  const seed = `${params.userId}-${params.title}-${Date.now()}-${randomBytes(8).toString("hex")}`;
  const hash = createHash("sha256").update(seed).digest("hex");
  const wid = `WID-${prefix}-${hash.slice(0, 8).toUpperCase()}-${hash.slice(8, 16).toUpperCase()}`;

  // Insert the song record
  const result = await db.insert(songs).values({
    userId: params.userId,
    title: params.title,
    contentType: params.contentType as any,
    fileUrl: params.fileUrl ?? null,
    coverArtUrl: params.coverArtUrl ?? null,
    description: params.description ?? null,
    aiDisclosure: (params.aiDisclosure as any) ?? "original",
    witnessId: wid,
    status: "Published",
    isPublic: true,
    registeredViaApi: true,
  } as any);

  const songId = (result as any).insertId as number;
  const registeredAt = new Date().toISOString();

  return { songId, wid, registeredAt };
}

/** Return the number of Published works for a given user. Used by CreatorCard. */
export async function getPublishedCountByUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(songs)
    .where(and(eq(songs.userId, userId), eq(songs.status, "Published")));
  return Number(result[0]?.count ?? 0);
}

// ─── Track Download Grants ────────────────────────────────────────────────────


/**
 * Grant a specific user download access to a specific track.
 * Creator must own the song (caller must verify ownership before calling).
 * Returns the new grant record.
 */
export async function grantTrackDownload(data: {
  songId: number;
  grantedByUserId: number;
  grantedToUserId: number;
  note?: string;
  expiresAt?: Date;
}): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(trackDownloadGrants).values({
    songId: data.songId,
    grantedByUserId: data.grantedByUserId,
    grantedToUserId: data.grantedToUserId,
    note: data.note ?? null,
    expiresAt: data.expiresAt ?? null,
  });
  return { id: Number(result[0].insertId) };
}

/**
 * Check whether a user has an active (non-revoked, non-expired) download grant
 * for a specific song. Also returns true if the user IS the song owner.
 */
export async function hasTrackDownloadGrant(
  userId: number,
  songId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Check ownership first (owner always has access)
  const song = await db.select({ userId: songs.userId }).from(songs).where(eq(songs.id, songId)).limit(1);
  if (song[0]?.userId === userId) return true;
  // Check for active grant
  const now = new Date();
  const grants = await db
    .select({ id: trackDownloadGrants.id })
    .from(trackDownloadGrants)
    .where(
      and(
        eq(trackDownloadGrants.songId, songId),
        eq(trackDownloadGrants.grantedToUserId, userId),
        isNull(trackDownloadGrants.revokedAt),
        or(
          isNull(trackDownloadGrants.expiresAt),
          gt(trackDownloadGrants.expiresAt, now)
        )
      )
    )
    .limit(1);
  return grants.length > 0;
}

/**
 * Check download grant status for multiple songs at once.
 * Returns a map of songId → { granted: boolean; grantId?: number; expiresAt?: Date }.
 * Songs owned by the user are always marked granted.
 */
export async function getBulkDownloadGrantStatus(
  userId: number,
  songIds: number[]
): Promise<Map<number, { granted: boolean; grantId?: number; expiresAt?: Date | null }>> {
  const db = await getDb();
  const result = new Map<number, { granted: boolean; grantId?: number; expiresAt?: Date | null }>();
  if (!db || songIds.length === 0) {
    songIds.forEach(id => result.set(id, { granted: false }));
    return result;
  }
  // Fetch song ownership
  const ownedSongs = await db
    .select({ id: songs.id })
    .from(songs)
    .where(and(inArray(songs.id, songIds), eq(songs.userId, userId)));
  const ownedIds = new Set(ownedSongs.map((s: { id: number }) => s.id));
  // Fetch active grants
  const now = new Date();
  const grants = await db
    .select({
      id: trackDownloadGrants.id,
      songId: trackDownloadGrants.songId,
      expiresAt: trackDownloadGrants.expiresAt,
    })
    .from(trackDownloadGrants)
    .where(
      and(
        inArray(trackDownloadGrants.songId, songIds),
        eq(trackDownloadGrants.grantedToUserId, userId),
        isNull(trackDownloadGrants.revokedAt),
        or(
          isNull(trackDownloadGrants.expiresAt),
          gt(trackDownloadGrants.expiresAt, now)
        )
      )
    );
  const grantMap = new Map<number, { id: number; songId: number; expiresAt: Date | null }>(grants.map((g: { id: number; songId: number; expiresAt: Date | null }) => [g.songId, g]));
  for (const id of songIds) {
    if (ownedIds.has(id)) {
      result.set(id, { granted: true });
    } else {
      const grant = grantMap.get(id);
      result.set(id, grant
        ? { granted: true, grantId: grant.id, expiresAt: grant.expiresAt }
        : { granted: false }
      );
    }
  }
  return result;
}

/**
 * Revoke a download grant (soft delete). Only the granting creator can revoke.
 */
export async function revokeTrackDownloadGrant(
  grantId: number,
  grantedByUserId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(trackDownloadGrants)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(trackDownloadGrants.id, grantId),
        eq(trackDownloadGrants.grantedByUserId, grantedByUserId),
        isNull(trackDownloadGrants.revokedAt)
      )
    );
  return (result[0].affectedRows ?? 0) > 0;
}

/**
 * List all active download grants issued by a creator (for their dashboard).
 */
export async function getGrantsIssuedByCreator(
  grantedByUserId: number,
  limit = 100
): Promise<Array<{
  id: number;
  songId: number;
  songTitle: string;
  grantedToUserId: number;
  grantedToName: string | null;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: trackDownloadGrants.id,
      songId: trackDownloadGrants.songId,
      songTitle: songs.title,
      grantedToUserId: trackDownloadGrants.grantedToUserId,
      grantedToName: users.name,
      note: trackDownloadGrants.note,
      expiresAt: trackDownloadGrants.expiresAt,
      createdAt: trackDownloadGrants.createdAt,
    })
    .from(trackDownloadGrants)
    .innerJoin(songs, eq(trackDownloadGrants.songId, songs.id))
    .innerJoin(users, eq(trackDownloadGrants.grantedToUserId, users.id))
    .where(
      and(
        eq(trackDownloadGrants.grantedByUserId, grantedByUserId),
        isNull(trackDownloadGrants.revokedAt)
      )
    )
    .orderBy(desc(trackDownloadGrants.createdAt))
    .limit(limit);
  return rows;
}

/**
 * List all active download grants received by a user (for their downloads page).
 */
export async function getGrantsReceivedByUser(
  grantedToUserId: number,
  limit = 100
): Promise<Array<{
  id: number;
  songId: number;
  songTitle: string;
  grantedByUserId: number;
  grantedByName: string | null;
  note: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select({
      id: trackDownloadGrants.id,
      songId: trackDownloadGrants.songId,
      songTitle: songs.title,
      grantedByUserId: trackDownloadGrants.grantedByUserId,
      grantedByName: users.name,
      note: trackDownloadGrants.note,
      expiresAt: trackDownloadGrants.expiresAt,
      createdAt: trackDownloadGrants.createdAt,
    })
    .from(trackDownloadGrants)
    .innerJoin(songs, eq(trackDownloadGrants.songId, songs.id))
    .innerJoin(users, eq(trackDownloadGrants.grantedByUserId, users.id))
    .where(
      and(
        eq(trackDownloadGrants.grantedToUserId, grantedToUserId),
        isNull(trackDownloadGrants.revokedAt),
        or(
          isNull(trackDownloadGrants.expiresAt),
          gt(trackDownloadGrants.expiresAt, now)
        )
      )
    )
    .orderBy(desc(trackDownloadGrants.createdAt))
    .limit(limit);
  return rows;
}
