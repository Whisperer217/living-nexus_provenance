import { and, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, aiTransforms, comments, downloads, licenses,
  slotPurchases, songs, tips, users
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
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
  artistHandle?: string; bio?: string; profilePhotoUrl?: string; bannerUrl?: string;
  bmiMemberNumber?: string; website?: string; twitterHandle?: string;
  instagramHandle?: string; youtubeHandle?: string;
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
  return db.select({
    id: users.id, name: users.name, artistHandle: users.artistHandle,
    bio: users.bio, profilePhotoUrl: users.profilePhotoUrl, bannerUrl: users.bannerUrl,
    licenseStatus: users.licenseStatus, songSlotsUsed: users.songSlotsUsed,
    stripeAccountStatus: users.stripeAccountStatus,
  }).from(users).orderBy(desc(users.createdAt));
}

// ─── Songs ────────────────────────────────────────────────────────────────────

export async function createSong(data: {
  userId: number; title: string; genre?: string; bpm?: number; keySignature?: string;
  moodTags?: string[]; lyricsHash?: string; coWriters?: string[]; albumName?: string;
  releaseDate?: string; isrc?: string;
  aiConsent: "prohibited" | "permitted_attribution" | "permitted";
  fileUrl?: string; fileKey?: string; coverArtUrl?: string; fileHash?: string;
  durationSeconds?: number; witnessId?: string; harmonicSignature?: number[];
  ecdsaPublicKey?: string; ecdsaSignature?: string; certificateUrl?: string; certificateKey?: string;
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
      stripeAccountId: users.stripeAccountId,
    },
  }).from(songs).leftJoin(users, eq(songs.userId, users.id))
    .where(and(eq(songs.id, id), eq(songs.isPublic, true))).limit(1);
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
  const conditions: ReturnType<typeof eq>[] = [eq(songs.isPublic, true) as ReturnType<typeof eq>];
  if (opts?.genre) conditions.push(eq(songs.genre, opts.genre) as ReturnType<typeof eq>);
  if (opts?.search) {
    conditions.push(or(
      like(songs.title, `%${opts.search}%`),
      like(songs.genre, `%${opts.search}%`),
    ) as unknown as ReturnType<typeof eq>);
  }
  return db.select({
    song: songs,
    creator: { id: users.id, name: users.name, artistHandle: users.artistHandle, profilePhotoUrl: users.profilePhotoUrl },
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

export async function getRelatedSongs(songId: number, genre?: string | null, limit = 6) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(songs.isPublic, true), ne(songs.id, songId)];
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
