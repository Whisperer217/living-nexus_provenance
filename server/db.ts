import { alias } from "drizzle-orm/mysql-core";
import { and, desc, eq, isNotNull, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, aiTransforms, comments, downloads, licenses,
  slotPurchases, songs, tips, users, events
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 20,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });
      _db = drizzle(_pool as any);
      console.log("[Database] Connection pool initialized (limit: 20)");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: {
  name?: string; artistHandle?: string; bio?: string; profilePhotoUrl?: string; bannerUrl?: string;
  bmiMemberNumber?: string; website?: string; location?: string; twitterHandle?: string;
  instagramHandle?: string; youtubeHandle?: string;
  aiDisclosure?: "original" | "ai_assisted" | "ai_generated";
  primaryGenre?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserStripeAccount(userId: number, data: {
  stripeAccountId?: string;
  stripeAccountStatus?: "pending" | "restricted" | "enabled" | "disabled";
  stripeCustomerId?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserLicense(userId: number, data: {
  licenseStatus?: "free" | "licensed"; songSlotsTotal?: number; songSlotsUsed?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getAllCreators() {
  const db = await getDb();
  if (!db) return [];
  // Only return creators who have a non-empty name AND at least one Published track
  const results = await db
    .select({
      id: users.id, name: users.name, artistHandle: users.artistHandle,
      bio: users.bio, profilePhotoUrl: users.profilePhotoUrl, bannerUrl: users.bannerUrl,
      licenseStatus: users.licenseStatus, songSlotsUsed: users.songSlotsUsed,
      stripeAccountStatus: users.stripeAccountStatus,
      publishedCount: sql<number>`count(${songs.id})`,
    })
    .from(users)
    .innerJoin(songs, and(eq(songs.userId, users.id), eq(songs.status, "Published")))
    .where(and(
      isNotNull(users.name),
      ne(users.name, ""),
    ))
    .groupBy(users.id)
    .having(sql`count(${songs.id}) > 0`)
    .orderBy(desc(users.createdAt));
  return results;
}

// ─── Songs ────────────────────────────────────────────────────────────────────

export async function createSong(data: {
  userId: number; title: string; genre?: string; bpm?: number; keySignature?: string;
  moodTags?: string[]; lyricsText?: string; lyricsHash?: string; coWriters?: string[]; albumName?: string;
  releaseDate?: string; isrc?: string;
  aiConsent: "prohibited" | "permitted_attribution" | "permitted";
  fileUrl?: string; fileKey?: string; coverArtUrl?: string; fileHash?: string;
  durationSeconds?: number; witnessId?: string; harmonicSignature?: number[];
  ecdsaPublicKey?: string; ecdsaSignature?: string; certificateUrl?: string; certificateKey?: string;
  isLyricsOnly?: boolean;
  caption?: string;
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
    },
  }).from(songs).leftJoin(users, eq(songs.userId, users.id))
    .where(and(eq(songs.id, id), eq(songs.isPublic, true), eq(songs.status, "Published"))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSongsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(songs).where(eq(songs.userId, userId)).orderBy(desc(songs.createdAt));
}

export async function getPublicSongs(opts?: { genre?: string; search?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 50;
  const conditions: ReturnType<typeof eq>[] = [eq(songs.isPublic, true) as ReturnType<typeof eq>, eq(songs.status, "Published") as ReturnType<typeof eq>];
  if (opts?.genre) conditions.push(eq(songs.genre, opts.genre) as ReturnType<typeof eq>);
  if (opts?.search) {
    conditions.push(or(
      like(songs.title, `%${opts.search}%`),
      like(songs.genre, `%${opts.search}%`),
    ) as unknown as ReturnType<typeof eq>);
  }
  return db.select({
    song: songs,
    creator: { id: users.id, name: users.name, artistHandle: users.artistHandle, profilePhotoUrl: users.profilePhotoUrl, aiDisclosure: users.aiDisclosure, primaryGenre: users.primaryGenre },
  }).from(songs).leftJoin(users, eq(songs.userId, users.id))
    .where(and(...conditions)).orderBy(desc(songs.createdAt)).limit(limit);
}

export async function incrementPlayCount(songId: number) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE songs SET playCount = playCount + 1 WHERE id = ${songId}`);
}

export async function deleteSong(songId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(songs).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
  await db.execute(sql`UPDATE users SET songSlotsUsed = GREATEST(songSlotsUsed - 1, 0) WHERE id = ${userId}`);
}

export async function updateSongStatus(
  songId: number,
  userId: number,
  status: "Draft" | "Published" | "Unlisted" | "Deleted"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ status, updatedAt: new Date() }).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
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
    status?: "Draft" | "Published" | "Unlisted" | "Deleted";
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
  if (fields.status !== undefined) updateSet.status = fields.status;
  await db.update(songs).set(updateSet).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getCommentsBySong(songId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(eq(comments.songId, songId)).orderBy(desc(comments.createdAt)).limit(100);
}

export async function addComment(data: { songId: number; userId?: number; authorName?: string; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.insert(comments).values(data);
}

// ─── Tips ─────────────────────────────────────────────────────────────────────

export async function recordTip(data: { songId: number; tipperUserId?: number; amountCents: number; stripePaymentIntentId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(tips).values(data);
  await db.execute(sql`UPDATE songs SET tipCount = tipCount + 1 WHERE id = ${data.songId}`);
}

export async function getTipsBySong(songId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tips).where(eq(tips.songId, songId)).orderBy(desc(tips.createdAt)).limit(50);
}

// ─── Downloads ────────────────────────────────────────────────────────────────

export async function recordDownload(data: { songId: number; userId?: number; ipAddress?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(downloads).values(data);
}

// ─── Licenses & Slots ─────────────────────────────────────────────────────────

export async function recordLicense(data: { userId: number; stripePaymentIntentId?: string; amountCents: number; slotsGranted: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(licenses).values(data);
  await db.update(users).set({ licenseStatus: "licensed", songSlotsTotal: data.slotsGranted }).where(eq(users.id, data.userId));
}

export async function recordSlotPurchase(data: { userId: number; stripePaymentIntentId?: string; slotsPurchased: number; amountCents: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(slotPurchases).values(data);
  await db.execute(sql`UPDATE users SET songSlotsTotal = songSlotsTotal + ${data.slotsPurchased} WHERE id = ${data.userId}`);
}

export async function updateSongLyrics(songId: number, userId: number, lyricsText: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ lyricsText, updatedAt: new Date() }).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
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

// ─── AI Transforms ────────────────────────────────────────────────────────────

export async function createAiTransform(data: {
  originalSongId: number;
  userId: number;
  prompt: string;
  style?: string;
  tags?: string[];
  originalWitnessId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(aiTransforms).values({
    ...data,
    tags: data.tags as unknown as string[],
    status: "pending",
  });
  return result;
}

export async function updateAiTransform(id: number, data: {
  sonautoTaskId?: string;
  status?: "pending" | "processing" | "success" | "failed";
  errorMessage?: string;
  outputUrl?: string;
  outputKey?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(aiTransforms).set(data).where(eq(aiTransforms.id, id));
}

export async function getAiTransformsByInsertId(insertId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiTransforms).where(eq(aiTransforms.id, insertId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAiTransformsBySong(songId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiTransforms)
    .where(and(eq(aiTransforms.originalSongId, songId), eq(aiTransforms.status, "success")))
    .orderBy(desc(aiTransforms.createdAt))
    .limit(20);
}

export async function getAiTransformById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiTransforms).where(eq(aiTransforms.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAiTransformsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: aiTransforms.id,
      originalSongId: aiTransforms.originalSongId,
      originalSongTitle: songs.title,
      originalWitnessId: aiTransforms.originalWitnessId,
      prompt: aiTransforms.prompt,
      style: aiTransforms.style,
      tags: aiTransforms.tags,
      status: aiTransforms.status,
      outputUrl: aiTransforms.outputUrl,
      errorMessage: aiTransforms.errorMessage,
      createdAt: aiTransforms.createdAt,
    })
    .from(aiTransforms)
    .leftJoin(songs, eq(aiTransforms.originalSongId, songs.id))
    .where(eq(aiTransforms.userId, userId))
    .orderBy(desc(aiTransforms.createdAt))
    .limit(50);
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

export async function getTransformsByWitnessId(witnessId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: aiTransforms.id,
      prompt: aiTransforms.prompt,
      style: aiTransforms.style,
      status: aiTransforms.status,
      outputUrl: aiTransforms.outputUrl,
      createdAt: aiTransforms.createdAt,
    })
    .from(aiTransforms)
    .where(and(eq(aiTransforms.originalWitnessId, witnessId), eq(aiTransforms.status, "success")))
    .orderBy(desc(aiTransforms.createdAt))
    .limit(20);
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function getLikedSongs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { likes } = await import("../drizzle/schema");
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
  const { likes } = await import("../drizzle/schema");
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
  const { likes } = await import("../drizzle/schema");
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
  const { likes } = await import("../drizzle/schema");
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(likes)
    .where(eq(likes.songId, songId));
  return Number(result[0]?.count ?? 0);
}

// ─── Jukebox Queue ────────────────────────────────────────────────────────────

export async function getJukeboxQueue(roomCode: string) {
  const db = await getDb();
  if (!db) return [];
  const { jukeboxQueue, songs, users } = await import("../drizzle/schema");
  return db
    .select({
      id: jukeboxQueue.id,
      roomCode: jukeboxQueue.roomCode,
      songId: jukeboxQueue.songId,
      tipperId: jukeboxQueue.tipperId,
      tipperName: jukeboxQueue.tipperName,
      tipAmountCents: jukeboxQueue.tipAmountCents,
      position: jukeboxQueue.position,
      playedAt: jukeboxQueue.playedAt,
      skippedAt: jukeboxQueue.skippedAt,
      createdAt: jukeboxQueue.createdAt,
      // Song fields
      songTitle: songs.title,
      songCoverArtUrl: songs.coverArtUrl,
      songWitnessId: songs.witnessId,
      songFileUrl: songs.fileUrl,
      songDurationSeconds: songs.durationSeconds,
      // Creator fields
      creatorId: users.id,
      creatorName: users.name,
      creatorArtistHandle: users.artistHandle,
      creatorStripeAccountId: users.stripeAccountId,
    })
    .from(jukeboxQueue)
    .innerJoin(songs, eq(jukeboxQueue.songId, songs.id))
    .innerJoin(users, eq(songs.userId, users.id))
    .where(
      and(
        eq(jukeboxQueue.roomCode, roomCode),
        sql`${jukeboxQueue.playedAt} IS NULL`,
        sql`${jukeboxQueue.skippedAt} IS NULL`,
      )
    )
    .orderBy(jukeboxQueue.position, jukeboxQueue.createdAt);
}

export async function addToJukeboxQueue(data: {
  roomCode: string;
  songId: number;
  tipperId: number;
  tipperName: string;
  tipAmountCents: number;
  stripeSessionId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { jukeboxQueue } = await import("../drizzle/schema");
  // Get current max position for this room
  const maxResult = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${jukeboxQueue.position}), -1)` })
    .from(jukeboxQueue)
    .where(
      and(
        eq(jukeboxQueue.roomCode, data.roomCode),
        sql`${jukeboxQueue.playedAt} IS NULL`,
        sql`${jukeboxQueue.skippedAt} IS NULL`,
      )
    );
  const nextPos = Number(maxResult[0]?.maxPos ?? -1) + 1;
  const [result] = await db.insert(jukeboxQueue).values({
    roomCode: data.roomCode,
    songId: data.songId,
    tipperId: data.tipperId,
    tipperName: data.tipperName,
    tipAmountCents: data.tipAmountCents,
    stripeSessionId: data.stripeSessionId,
    position: nextPos,
  });
  return result;
}

export async function markJukeboxItemPlayed(id: number) {
  const db = await getDb();
  if (!db) return;
  const { jukeboxQueue } = await import("../drizzle/schema");
  await db.update(jukeboxQueue).set({ playedAt: new Date() }).where(eq(jukeboxQueue.id, id));
}

export async function markJukeboxItemSkipped(id: number) {
  const db = await getDb();
  if (!db) return;
  const { jukeboxQueue } = await import("../drizzle/schema");
  await db.update(jukeboxQueue).set({ skippedAt: new Date() }).where(eq(jukeboxQueue.id, id));
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

// ─── Playlist ─────────────────────────────────────────────────────────────────

export async function getPlaylist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { playlistItems } = await import("../drizzle/schema");
  return db
    .select({
      id: playlistItems.id,
      position: playlistItems.position,
      addedAt: playlistItems.createdAt,
      song: {
        id: songs.id,
        title: songs.title,
        genre: songs.genre,
        fileUrl: songs.fileUrl,
        coverArtUrl: songs.coverArtUrl,
        witnessId: songs.witnessId,
        durationSeconds: songs.durationSeconds,
        playCount: songs.playCount,
        tipCount: songs.tipCount,
        status: songs.status,
      },
      creator: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
        aiDisclosure: users.aiDisclosure,
      },
    })
    .from(playlistItems)
    .innerJoin(songs, and(eq(playlistItems.songId, songs.id), eq(songs.status, "Published")))
    .leftJoin(users, eq(songs.userId, users.id))
    .where(eq(playlistItems.userId, userId))
    .orderBy(playlistItems.position, playlistItems.createdAt)
    .limit(200);
}

export async function addToPlaylist(userId: number, songId: number): Promise<{ added: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { playlistItems } = await import("../drizzle/schema");
  // Idempotent: if already in playlist, return added: false
  const existing = await db
    .select({ id: playlistItems.id })
    .from(playlistItems)
    .where(and(eq(playlistItems.userId, userId), eq(playlistItems.songId, songId)))
    .limit(1);
  if (existing.length > 0) return { added: false };
  // Get next position
  const maxResult = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${playlistItems.position}), -1)` })
    .from(playlistItems)
    .where(eq(playlistItems.userId, userId));
  const nextPos = Number(maxResult[0]?.maxPos ?? -1) + 1;
  await db.insert(playlistItems).values({ userId, songId, position: nextPos });
  return { added: true };
}

export async function removeFromPlaylist(userId: number, songId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { playlistItems } = await import("../drizzle/schema");
  await db.delete(playlistItems).where(and(eq(playlistItems.userId, userId), eq(playlistItems.songId, songId)));
}

export async function isInPlaylist(userId: number, songId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { playlistItems } = await import("../drizzle/schema");
  const result = await db
    .select({ id: playlistItems.id })
    .from(playlistItems)
    .where(and(eq(playlistItems.userId, userId), eq(playlistItems.songId, songId)))
    .limit(1);
  return result.length > 0;
}

// ─── Creator OG Nomination Card ───────────────────────────────────────────────
/**
 * Fetch all data needed to build a creator profile OG nomination card.
 * Returns the creator's identity fields plus their published song count
 * and WID count (songs that have a witnessId set).
 */
export async function getCreatorForOg(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const userResult = await db
    .select({
      id: users.id,
      name: users.name,
      artistHandle: users.artistHandle,
      bio: users.bio,
      profilePhotoUrl: users.profilePhotoUrl,
      bannerUrl: users.bannerUrl,
      primaryGenre: users.primaryGenre,
      location: users.location,
      twitterHandle: users.twitterHandle,
      instagramHandle: users.instagramHandle,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) return undefined;
  const creator = userResult[0];

  const songCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songs)
    .where(and(eq(songs.userId, userId), eq(songs.status, "Published")));
  const publishedCount = Number(songCountResult[0]?.count ?? 0);

  const widCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(songs)
    .where(and(
      eq(songs.userId, userId),
      eq(songs.status, "Published"),
      isNotNull(songs.witnessId),
    ));
  const widCount = Number(widCountResult[0]?.count ?? 0);

  return { creator, publishedCount, widCount };
}

// ─── Download Permission Helpers ───────────────────────────────────────────────

/** Get total amount a specific user has tipped on a specific song (in cents) */
export async function getUserTipTotalForSong(userId: number, songId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${tips.amountCents}), 0)` })
    .from(tips)
    .where(and(eq(tips.songId, songId), eq(tips.tipperUserId, userId)));
  return Number(result[0]?.total ?? 0);
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

/** Return all users with per-user track count and WID count (owner-only use). */
export async function getAllUsersWithStats(): Promise<Array<{
  id: number;
  name: string | null;
  email: string | null;
  artistHandle: string | null;
  role: string;
  licenseStatus: string;
  songSlotsUsed: number;
  songSlotsTotal: number;
  createdAt: Date;
  lastSignedIn: Date;
  trackCount: number;
  widCount: number;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      artistHandle: users.artistHandle,
      role: users.role,
      licenseStatus: users.licenseStatus,
      songSlotsUsed: users.songSlotsUsed,
      songSlotsTotal: users.songSlotsTotal,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Fetch per-user track and WID counts in two queries
  const trackCounts = await db
    .select({ userId: songs.userId, count: sql<number>`count(*)` })
    .from(songs)
    .where(ne(songs.status as any, "Deleted"))
    .groupBy(songs.userId);

  const widCounts = await db
    .select({ userId: songs.userId, count: sql<number>`count(*)` })
    .from(songs)
    .where(and(isNotNull(songs.witnessId), ne(songs.status as any, "Deleted")))
    .groupBy(songs.userId);

  const trackMap = new Map(trackCounts.map(r => [r.userId, Number(r.count)]));
  const widMap = new Map(widCounts.map(r => [r.userId, Number(r.count)]));

  return allUsers.map(u => ({
    ...u,
    trackCount: trackMap.get(u.id) ?? 0,
    widCount: widMap.get(u.id) ?? 0,
  }));
}

// ─── Events (Unified Interaction Ledger) ─────────────────────────────────────

/**
 * Write a new event to the ledger.
 * Events is the primary write target — tips and comments still write to their
 * own tables for finance/query purposes, but events is the source of truth
 * for the unified interaction thread.
 */
export async function createEvent(data: {
  type: "TIP" | "COMMENT" | "LIKE" | "FOLLOW" | "WITNESS_REGISTERED" | "WITNESS_VERIFIED" | "WORK_REFERENCED" | "SYSTEM_UPDATE" | "PRESERVATION_MODE";
  workId: number;
  actorId?: number;
  actorName?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Events] DB unavailable, event not recorded"); return; }
  await db.insert(events).values({
    type: data.type,
    workId: data.workId,
    actorId: data.actorId ?? null,
    actorName: data.actorName ?? null,
    payload: data.payload ?? null,
  });
}

/**
 * Fetch all non-deleted events for a given work (song), ordered newest first.
 * Used to render the unified interaction thread on the song detail page.
 */
export async function getEventsByWork(workId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const { isNull } = await import("drizzle-orm");
  return db
    .select()
    .from(events)
    .where(and(eq(events.workId, workId), isNull(events.deletedAt)))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

/** Fetch all events across all songs owned by a creator, ordered newest first. */
export async function getEventsForCreator(creatorId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  const { isNull, inArray } = await import("drizzle-orm");
  // First get all song IDs for this creator
  const creatorSongs = await db
    .select({ id: songs.id, title: songs.title, coverArtUrl: songs.coverArtUrl })
    .from(songs)
    .where(eq(songs.userId, creatorId));
  if (!creatorSongs.length) return [];
  const songIds = creatorSongs.map((s: { id: number; title: string | null; coverArtUrl: string | null }) => s.id);
  const songMap: Record<number, { id: number; title: string | null; coverArtUrl: string | null }> = Object.fromEntries(
    creatorSongs.map((s: { id: number; title: string | null; coverArtUrl: string | null }) => [s.id, s])
  );
  const evts = await db
    .select()
    .from(events)
    .where(and(inArray(events.workId, songIds), isNull(events.deletedAt)))
    .orderBy(desc(events.createdAt))
    .limit(limit);
  // Attach song title/cover to each event for display
  return evts.map((e: typeof evts[number]) => ({
    ...e,
    songTitle: songMap[e.workId]?.title ?? null,
    songCoverArtUrl: songMap[e.workId]?.coverArtUrl ?? null,
  }));
}

/** Mark that a user has seen the welcome modal (idempotent). */
export async function markWelcomeSeen(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ hasSeenWelcome: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Field Notes ──────────────────────────────────────────────────────────────
export async function createFieldNote(data: {
  userId: number;
  title: string;
  body: string;
  category: "doctrine" | "journal" | "update" | "concept";
  isPublic: boolean;
  videoUrl?: string;
  coverImageUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { fieldNotes } = await import("../drizzle/schema");
  const [result] = await (db as any).insert(fieldNotes).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return (result as any).insertId as number;
}

export async function getFieldNotesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { fieldNotes } = await import("../drizzle/schema");
  const { isNull } = await import("drizzle-orm");
  return (db as any)
    .select()
    .from(fieldNotes)
    .where(and(eq(fieldNotes.userId, userId), isNull(fieldNotes.deletedAt)))
    .orderBy(desc(fieldNotes.createdAt));
}

export async function getPublicFieldNotes(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const { fieldNotes } = await import("../drizzle/schema");
  const { isNull } = await import("drizzle-orm");
  return (db as any)
    .select()
    .from(fieldNotes)
    .where(and(eq(fieldNotes.isPublic, true), isNull(fieldNotes.deletedAt)))
    .orderBy(desc(fieldNotes.createdAt))
    .limit(limit);
}

export async function updateFieldNote(id: number, userId: number, data: {
  title?: string;
  body?: string;
  category?: "doctrine" | "journal" | "update" | "concept";
  isPublic?: boolean;
  videoUrl?: string | null;
  coverImageUrl?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { fieldNotes } = await import("../drizzle/schema");
  await (db as any)
    .update(fieldNotes)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(fieldNotes.id, id), eq(fieldNotes.userId, userId)));
}

export async function deleteFieldNote(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { fieldNotes } = await import("../drizzle/schema");
  await (db as any)
    .update(fieldNotes)
    .set({ deletedAt: new Date() })
    .where(and(eq(fieldNotes.id, id), eq(fieldNotes.userId, userId)));
}
