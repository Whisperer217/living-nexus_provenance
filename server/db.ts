import { alias } from "drizzle-orm/mysql-core";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  InsertUser, aiTransforms, comments, downloads, licenses, likes,
  slotPurchases, songs, tips, users, events,
  jukeboxOfferings, jukeboxPlayEvents,
  promoCodes, promoRedemptions,
  nameHistory,
  collections,
  platformSupporters,
  audioVersions,
  playEvents,
  witnessTestimonies,
  expressionLineage,
  contentFlags, declarationSignatures,
  songVersions,
  platformSettings,
  projects, projectUpdates, projectDonations, projectBlocks, projectFollowers,
  type InsertContentFlag, type InsertDeclarationSignature,
  type InsertSongVersion,
  type Project, type InsertProject,
  type ProjectUpdate,
  type ProjectDonation,
  type ProjectBlock,
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

// ─── Name History ────────────────────────────────────────────────────────────

/** Record an initial registration name (oldName = null) or a name change. */
export async function recordNameChange(userId: number, oldName: string | null, newName: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(nameHistory).values({ userId, oldName, newName });
}

/** Return the full name history for a user, newest first. */
export async function getNameHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(nameHistory).where(eq(nameHistory.userId, userId)).orderBy(desc(nameHistory.changedAt));
}

/** Return the earliest recorded name for a user (the name at WID issuance). */
export async function getOriginalName(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(nameHistory).where(eq(nameHistory.userId, userId)).orderBy(nameHistory.changedAt).limit(1);
  return rows.length > 0 ? rows[0].newName : null;
}

export async function updateUserProfile(userId: number, data: {
  name?: string; artistHandle?: string; bio?: string; profilePhotoUrl?: string; bannerUrl?: string;
  bmiMemberNumber?: string; website?: string; location?: string; twitterHandle?: string;
  instagramHandle?: string; youtubeHandle?: string;
  aiDisclosure?: "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument";
  primaryGenre?: string;
  avatarObjectPosition?: string;
  bannerPositionX?: number;
  bannerPositionY?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserExpression(userId: number, data: {
  expressionId: string;
  expressionPrompt: string;
  expressionStyleTags: string;
  expressionComposerNote: string;
  expressionGeneratedAt: Date;
  toneFrequencyNote?: string;
  dominantKey?: string;
  tempoRange?: string;
  energyProfile?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function insertExpressionLineage(data: {
  userId: number;
  eid: string;
  version: number;
  prompt: string;
  styleTags?: string;
  composerNote?: string;
  toneFrequencyNote?: string;
  dominantKey?: string;
  tempoRange?: string;
  energyProfile?: string;
  lyricsSnapshot?: string;
  songCount: number;
  promptMode?: "identity_regen" | "style_prompt" | "import_anchor";
  promptType?: string;
  userInputBlocks?: string; // JSON string of [{label, content}]
  sourcePlatform?: string; // for import_anchor: Suno | Udio | etc.
  rawExternalPrompt?: string; // for import_anchor: original pasted prompt
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(expressionLineage).values({
    userId: data.userId,
    eid: data.eid,
    version: data.version,
    prompt: data.prompt,
    styleTags: data.styleTags ?? null,
    composerNote: data.composerNote ?? null,
    toneFrequencyNote: data.toneFrequencyNote ?? null,
    dominantKey: data.dominantKey ?? null,
    tempoRange: data.tempoRange ?? null,
    energyProfile: data.energyProfile ?? null,
    lyricsSnapshot: data.lyricsSnapshot ?? null,
    songCount: data.songCount,
    promptMode: (data.promptMode ?? "identity_regen") as any,
    promptType: data.promptType ?? null,
    userInputBlocks: data.userInputBlocks ?? null,
    sourcePlatform: data.sourcePlatform ?? null,
    rawExternalPrompt: data.rawExternalPrompt ?? null,
    generatedAt: new Date(),
  });
}

export async function getExpressionLineageByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(expressionLineage)
    .where(eq(expressionLineage.userId, userId))
    .orderBy(desc(expressionLineage.generatedAt));
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
      isPinned: users.isPinned,
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
  creditsJson?: string;
  releaseDate?: string; isrc?: string;
  aiConsent: "prohibited" | "permitted_attribution" | "permitted";
  fileUrl?: string; fileKey?: string; coverArtUrl?: string; fileHash?: string;
  durationSeconds?: number; sampleRate?: number; bitDepth?: number;
  witnessId?: string; harmonicSignature?: number[];
  ecdsaPublicKey?: string; ecdsaSignature?: string; certificateUrl?: string; certificateKey?: string;
  isLyricsOnly?: boolean;
  contentType?: "audio" | "lyrics" | "manuscript" | "comic";
  caption?: string | null;
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
    // Allow published OR public songs — OG tags should work for any accessible song
    .where(and(eq(songs.id, id), eq(songs.isPublic, true))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSongsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Sort by creator's explicit displayOrder first; fall back to upload date for unset (0) entries
  return db.select().from(songs).where(eq(songs.userId, userId)).orderBy(asc(songs.displayOrder), asc(songs.createdAt));
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

export async function getPublicSongs(opts?: { genre?: string; search?: string; limit?: number; offset?: number; randomize?: boolean; seed?: number; contentType?: "audio" | "lyrics" | "manuscript" | "comic" }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const conditions: ReturnType<typeof eq>[] = [eq(songs.isPublic, true) as ReturnType<typeof eq>, eq(songs.status, "Published") as ReturnType<typeof eq>];
  if (opts?.contentType) conditions.push(eq(songs.contentType, opts.contentType) as ReturnType<typeof eq>);
  if (opts?.genre) conditions.push(eq(songs.genre, opts.genre) as ReturnType<typeof eq>);
  if (opts?.search) {
    conditions.push(or(
      like(songs.title, `%${opts.search}%`),
      like(songs.genre, `%${opts.search}%`),
    ) as unknown as ReturnType<typeof eq>);
  }
  // When a specific creator is filtered (via creatorId option), respect their displayOrder.
  // For global/mixed feeds, use newest-first unless randomized.
  const orderExpr = opts?.randomize
    ? (opts.seed !== undefined ? sql`RAND(${opts.seed})` : sql`RAND()`)
    : (opts as any)?.creatorId
      ? sql`${songs.displayOrder} ASC, ${songs.createdAt} ASC`
      : desc(songs.createdAt);
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
  await db.update(songs).set(updateSet).where(and(eq(songs.id, songId), eq(songs.userId, userId)));
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getCommentsBySong(songId: number) {
  const db = await getDb();
  if (!db) return [];
  // Fetch all comments for the song (top-level + replies), oldest first for threading
  const allComments = await db
    .select()
    .from(comments)
    .where(eq(comments.songId, songId))
    .orderBy(comments.createdAt)
    .limit(200);
  // Build threaded structure: top-level comments with nested replies
  type CommentRow = typeof allComments[0];
  type CommentWithReplies = CommentRow & { replies: CommentRow[] };
  const topLevel: CommentWithReplies[] = [];
  const replyMap = new Map<number, CommentRow[]>();
  for (const c of allComments) {
    if (c.parentId == null) {
      topLevel.push({ ...c, replies: [] });
    } else {
      const arr = replyMap.get(c.parentId) ?? [];
      arr.push(c);
      replyMap.set(c.parentId, arr);
    }
  }
  for (const c of topLevel) {
    c.replies = replyMap.get(c.id) ?? [];
  }
  // Return newest top-level first
  return topLevel.reverse();
}
export async function addComment(data: { songId: number; userId?: number; authorName?: string; content: string; parentId?: number | null }) {
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
    .set({ ...fields, updatedAt: new Date() })
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
  const { likes } = await import("../drizzle/schema");

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

/** Return all users with per-user track count and WID count (owner-only use). */
export async function getAllUsersWithStats(limit: number = 50, offset: number = 0): Promise<{ users: Array<{
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
}>, total: number }> {
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
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(users);
  const total = Number(totalResult[0]?.count ?? 0);

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

  const trackMap = new Map(trackCounts.map((r: { userId: number | null; count: number }) => [r.userId, Number(r.count)]));
  const widMap = new Map(widCounts.map((r: { userId: number | null; count: number }) => [r.userId, Number(r.count)]));

  return {
    users: allUsers.map((u: typeof allUsers[number]) => ({
      ...u,
      trackCount: trackMap.get(u.id) ?? 0,
      widCount: widMap.get(u.id) ?? 0,
    })),
    total,
  };
}

// ─── Events (Unified Interaction Ledger) ─────────────────────────────────────

/**
 * Write a new event to the ledger.
 * Events is the primary write target — tips and comments still write to their
 * own tables for finance/query purposes, but events is the source of truth
 * for the unified interaction thread.
 */
export async function createEvent(data: {
  type: "TIP" | "COMMENT" | "LIKE" | "FOLLOW" | "WITNESS_REGISTERED" | "WITNESS_VERIFIED" | "WORK_REFERENCED" | "SYSTEM_UPDATE" | "PRESERVATION_MODE" | "PROJECT_PUBLISHED" | "PROJECT_FUNDED";
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
  const { isNull, inArray, or } = await import("drizzle-orm");
  // Get all song IDs for this creator
  const creatorSongs = await db
    .select({ id: songs.id, title: songs.title, coverArtUrl: songs.coverArtUrl, coverPositionX: songs.coverPositionX, coverPositionY: songs.coverPositionY })
    .from(songs)
    .where(eq(songs.userId, creatorId));
  const songIds = creatorSongs.map((s: { id: number; title: string | null; coverArtUrl: string | null; coverPositionX: number; coverPositionY: number }) => s.id);
  const songMap: Record<number, { id: number; title: string | null; coverArtUrl: string | null; coverPositionX: number; coverPositionY: number }> = Object.fromEntries(
    creatorSongs.map((s: { id: number; title: string | null; coverArtUrl: string | null; coverPositionX: number; coverPositionY: number }) => [s.id, s])
  );
  // Get all project IDs + slugs for this creator
  const creatorProjects = await db
    .select({ id: projects.id, title: projects.title, slug: projects.slug, bannerUrl: projects.bannerUrl })
    .from(projects)
    .where(eq(projects.userId, creatorId));
  const projectIds = creatorProjects.map((p: { id: number; title: string; slug: string; bannerUrl: string | null }) => p.id);
  const projectMap: Record<number, { id: number; title: string; slug: string; bannerUrl: string | null }> = Object.fromEntries(
    creatorProjects.map((p: { id: number; title: string; slug: string; bannerUrl: string | null }) => [p.id, p])
  );
  // Build where clause — include both song and project events
  const allIds = [...songIds, ...projectIds];
  if (!allIds.length) return [];
  const evts = await db
    .select()
    .from(events)
    .where(and(inArray(events.workId, allIds), isNull(events.deletedAt)))
    .orderBy(desc(events.createdAt))
    .limit(limit);
  // Attach song/project title and link info to each event for display
  return evts.map((e: typeof evts[number]) => ({
    ...e,
    songTitle: songMap[e.workId]?.title ?? projectMap[e.workId]?.title ?? null,
    songCoverArtUrl: songMap[e.workId]?.coverArtUrl ?? projectMap[e.workId]?.bannerUrl ?? null,
    songCoverPositionX: songMap[e.workId]?.coverPositionX ?? 50,
    songCoverPositionY: songMap[e.workId]?.coverPositionY ?? 50,
    // Link helpers: songLink = /song/:id, projectSlug = slug for /project/:slug
    songLink: songMap[e.workId] ? `/song/${e.workId}` : null,
    projectSlug: projectMap[e.workId]?.slug ?? null,
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

/** Record TOS acceptance with version stamp (idempotent — always updates to latest). */
export async function recordTosAcceptance(userId: number, version: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ tosAcceptedAt: new Date(), tosVersion: version, updatedAt: new Date() })
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

// ─── Witness Network ──────────────────────────────────────────────────────────

export async function witnessCreator(witnesserId: number, witnessedId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { witnesses } = await import("../drizzle/schema");
  try {
    await (db as any).insert(witnesses).values({ witnesserId, witnessedId });
  } catch (_e) { /* duplicate — already witnessing */ }
}

export async function unwatchCreator(witnesserId: number, witnessedId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { witnesses } = await import("../drizzle/schema");
  await (db as any)
    .delete(witnesses)
    .where(and(eq(witnesses.witnesserId, witnesserId), eq(witnesses.witnessedId, witnessedId)));
}

export async function isWitnessing(witnesserId: number, witnessedId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { witnesses } = await import("../drizzle/schema");
  const rows = await (db as any)
    .select({ id: witnesses.id })
    .from(witnesses)
    .where(and(eq(witnesses.witnesserId, witnesserId), eq(witnesses.witnessedId, witnessedId)))
    .limit(1);
  return rows.length > 0;
}

export async function getWitnessCount(witnessedId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { witnesses } = await import("../drizzle/schema");
  const rows = await (db as any)
    .select({ id: witnesses.id })
    .from(witnesses)
    .where(eq(witnesses.witnessedId, witnessedId));
  return rows.length;
}

export async function getWitnessedByCount(witnesserId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { witnesses } = await import("../drizzle/schema");
  const rows = await (db as any)
    .select({ id: witnesses.id })
    .from(witnesses)
    .where(eq(witnesses.witnesserId, witnesserId));
  return rows.length;
}

export async function getWitnessNetwork(userId: number) {
  const db = await getDb();
  if (!db) return { witnessing: [], witnessedBy: [] };
  const { witnesses } = await import("../drizzle/schema");
  const witnessing = await (db as any)
    .select({
      id: users.id,
      name: users.name,
      artistHandle: users.artistHandle,
      profilePhotoUrl: users.profilePhotoUrl,
      licenseStatus: users.licenseStatus,
      witnessedAt: witnesses.createdAt,
    })
    .from(witnesses)
    .innerJoin(users, eq(users.id, witnesses.witnessedId))
    .where(eq(witnesses.witnesserId, userId))
    .orderBy(witnesses.createdAt);
  const witnessedBy = await (db as any)
    .select({
      id: users.id,
      name: users.name,
      artistHandle: users.artistHandle,
      profilePhotoUrl: users.profilePhotoUrl,
      licenseStatus: users.licenseStatus,
      witnessedAt: witnesses.createdAt,
    })
    .from(witnesses)
    .innerJoin(users, eq(users.id, witnesses.witnesserId))
    .where(eq(witnesses.witnessedId, userId))
    .orderBy(witnesses.createdAt);
  return { witnessing, witnessedBy };
}

export async function createReference(
  fromUserId: number,
  opts: { toUserId?: number; toSongId?: number; context?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { creativeReferences } = await import("../drizzle/schema");
  const [result] = await (db as any).insert(creativeReferences).values({
    fromUserId,
    toUserId: opts.toUserId ?? null,
    toSongId: opts.toSongId ?? null,
    context: opts.context ?? null,
  });
  return result;
}

export async function getReferencesForSong(songId: number) {
  const db = await getDb();
  if (!db) return [];
  const { creativeReferences } = await import("../drizzle/schema");
  return (db as any)
    .select({
      id: creativeReferences.id,
      context: creativeReferences.context,
      createdAt: creativeReferences.createdAt,
      fromUser: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
    })
    .from(creativeReferences)
    .innerJoin(users, eq(users.id, creativeReferences.fromUserId))
    .where(eq(creativeReferences.toSongId, songId))
    .orderBy(creativeReferences.createdAt);
}

export async function getReferencesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { creativeReferences } = await import("../drizzle/schema");
  return (db as any)
    .select({
      id: creativeReferences.id,
      context: creativeReferences.context,
      createdAt: creativeReferences.createdAt,
      toSongId: creativeReferences.toSongId,
      fromUser: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
    })
    .from(creativeReferences)
    .innerJoin(users, eq(users.id, creativeReferences.fromUserId))
    .where(eq(creativeReferences.toUserId, userId))
    .orderBy(creativeReferences.createdAt);
}

// ─── Playlists ────────────────────────────────────────────────────────────────

export async function createPlaylist(data: {
  ownerId: number; name: string; description?: string;
  isPublic?: boolean; isCollaborative?: boolean;
}) {
  const db = await getDb();
  if (!db) return null;
  const { playlists } = await import("../drizzle/schema");
  const [result] = await (db as any).insert(playlists).values({
    ownerId: data.ownerId,
    name: data.name,
    description: data.description ?? null,
    isPublic: data.isPublic ?? false,
    isCollaborative: data.isCollaborative ?? false,
  });
  return result.insertId as number;
}

export async function getPlaylistsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { playlists, playlistCollaborators } = await import("../drizzle/schema");
  // Own playlists
  const owned = await (db as any)
    .select().from(playlists)
    .where(eq(playlists.ownerId, userId))
    .orderBy(desc(playlists.updatedAt));
  // Collaborated playlists
  const collabRows = await (db as any)
    .select({ playlist: playlists })
    .from(playlistCollaborators)
    .innerJoin(playlists, eq(playlists.id, playlistCollaborators.playlistId))
    .where(and(eq(playlistCollaborators.userId, userId), isNotNull(playlistCollaborators.acceptedAt)));
  const collab = collabRows.map((r: any) => r.playlist);
  // Deduplicate
  const seen = new Set(owned.map((p: any) => p.id));
  const all = [...owned, ...collab.filter((p: any) => !seen.has(p.id))];
  return all;
}

export async function getPlaylistById(playlistId: number) {
  const db = await getDb();
  if (!db) return null;
  const { playlists } = await import("../drizzle/schema");
  const rows = await (db as any).select().from(playlists).where(eq(playlists.id, playlistId)).limit(1);
  return rows[0] ?? null;
}

export async function updatePlaylist(playlistId: number, data: {
  name?: string; description?: string; isPublic?: boolean;
  isCollaborative?: boolean; coverArtUrl?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { playlists } = await import("../drizzle/schema");
  await (db as any).update(playlists).set(data).where(eq(playlists.id, playlistId));
}

export async function deletePlaylist(playlistId: number) {
  const db = await getDb();
  if (!db) return;
  const { playlists, playlistTracks, playlistCollaborators } = await import("../drizzle/schema");
  await (db as any).delete(playlistTracks).where(eq(playlistTracks.playlistId, playlistId));
  await (db as any).delete(playlistCollaborators).where(eq(playlistCollaborators.playlistId, playlistId));
  await (db as any).delete(playlists).where(eq(playlists.id, playlistId));
}

export async function getPlaylistTracks(playlistId: number) {
  const db = await getDb();
  if (!db) return [];
  const { playlistTracks } = await import("../drizzle/schema");
  const rows = await (db as any)
    .select({
      id: playlistTracks.id,
      position: playlistTracks.position,
      addedByUserId: playlistTracks.addedByUserId,
      createdAt: playlistTracks.createdAt,
      song: {
        id: songs.id,
        title: songs.title,
        genre: songs.genre,
        coverArtUrl: songs.coverArtUrl,
        fileUrl: songs.fileUrl,
        witnessId: songs.witnessId,
        playCount: songs.playCount,
        userId: songs.userId,
      },
      addedBy: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
    })
    .from(playlistTracks)
    .innerJoin(songs, eq(songs.id, playlistTracks.songId))
    .innerJoin(users, eq(users.id, playlistTracks.addedByUserId))
    .where(eq(playlistTracks.playlistId, playlistId))
    .orderBy(playlistTracks.position);
  return rows;
}

export async function addTrackToPlaylist(playlistId: number, songId: number, addedByUserId: number) {
  const db = await getDb();
  if (!db) return;
  const { playlistTracks } = await import("../drizzle/schema");
  // Get next position
  const existing = await (db as any).select({ pos: playlistTracks.position })
    .from(playlistTracks).where(eq(playlistTracks.playlistId, playlistId))
    .orderBy(desc(playlistTracks.position)).limit(1);
  const nextPos = existing.length > 0 ? existing[0].pos + 1 : 0;
  await (db as any).insert(playlistTracks).values({ playlistId, songId, addedByUserId, position: nextPos });
}

export async function removeTrackFromPlaylist(playlistTrackId: number) {
  const db = await getDb();
  if (!db) return;
  const { playlistTracks } = await import("../drizzle/schema");
  await (db as any).delete(playlistTracks).where(eq(playlistTracks.id, playlistTrackId));
}

export async function getPlaylistCollaborators(playlistId: number) {
  const db = await getDb();
  if (!db) return [];
  const { playlistCollaborators } = await import("../drizzle/schema");
  return (db as any)
    .select({
      id: playlistCollaborators.id,
      role: playlistCollaborators.role,
      acceptedAt: playlistCollaborators.acceptedAt,
      createdAt: playlistCollaborators.createdAt,
      user: {
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        profilePhotoUrl: users.profilePhotoUrl,
      },
    })
    .from(playlistCollaborators)
    .innerJoin(users, eq(users.id, playlistCollaborators.userId))
    .where(eq(playlistCollaborators.playlistId, playlistId));
}

export async function inviteCollaborator(playlistId: number, userId: number, invitedByUserId: number) {
  const db = await getDb();
  if (!db) return;
  const { playlistCollaborators } = await import("../drizzle/schema");
  // Check not already invited
  const existing = await (db as any).select().from(playlistCollaborators)
    .where(and(eq(playlistCollaborators.playlistId, playlistId), eq(playlistCollaborators.userId, userId))).limit(1);
  if (existing.length > 0) return;
  await (db as any).insert(playlistCollaborators).values({ playlistId, userId, invitedByUserId, role: "editor" });
}

export async function acceptPlaylistInvite(playlistId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { playlistCollaborators } = await import("../drizzle/schema");
  await (db as any).update(playlistCollaborators)
    .set({ acceptedAt: new Date() })
    .where(and(eq(playlistCollaborators.playlistId, playlistId), eq(playlistCollaborators.userId, userId)));
}

export async function removeCollaborator(playlistId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { playlistCollaborators } = await import("../drizzle/schema");
  await (db as any).delete(playlistCollaborators)
    .where(and(eq(playlistCollaborators.playlistId, playlistId), eq(playlistCollaborators.userId, userId)));
}

export async function isPlaylistMember(playlistId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const { playlists, playlistCollaborators } = await import("../drizzle/schema");
  const owned = await (db as any).select({ id: playlists.id }).from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.ownerId, userId))).limit(1);
  if (owned.length > 0) return true;
  const collab = await (db as any).select({ id: playlistCollaborators.id }).from(playlistCollaborators)
    .where(and(
      eq(playlistCollaborators.playlistId, playlistId),
      eq(playlistCollaborators.userId, userId),
      isNotNull(playlistCollaborators.acceptedAt)
    )).limit(1);
  return collab.length > 0;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: number; type: string; title: string; body?: string;
  actorId?: number; actorName?: string; actorAvatarUrl?: string;
  refId?: number; refType?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { notifications } = await import("../drizzle/schema");
  await (db as any).insert(notifications).values({
    userId: data.userId,
    type: data.type as any,
    title: data.title,
    body: data.body ?? null,
    actorId: data.actorId ?? null,
    actorName: data.actorName ?? null,
    actorAvatarUrl: data.actorAvatarUrl ?? null,
    refId: data.refId ?? null,
    refType: data.refType ?? null,
  });
}

export async function getNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const { notifications, songs, users } = await import("../drizzle/schema");
  const rows = await (db as any)
    .select({
      // notification fields
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      actorId: notifications.actorId,
      actorName: notifications.actorName,
      actorAvatarUrl: notifications.actorAvatarUrl,
      refId: notifications.refId,
      refType: notifications.refType,
      isRead: notifications.isRead,
      archivedAt: notifications.archivedAt,
      createdAt: notifications.createdAt,
      // song metadata (only populated for comment/like/tip signals with refType=song)
      songTitle: songs.title,
      songCoverArtUrl: songs.coverArtUrl,
      songFileUrl: songs.fileUrl,
      songArtistName: users.name,
      songCreatorId: songs.userId,
    })
    .from(notifications)
    .leftJoin(songs, and(
      eq(notifications.refId, songs.id),
      sql`${notifications.refType} = 'song'`
    ))
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(eq(notifications.userId, userId), sql`${notifications.archivedAt} IS NULL`))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows;
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { notifications } = await import("../drizzle/schema");
  await (db as any).update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  const { notifications } = await import("../drizzle/schema");
  await (db as any).update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function archiveNotification(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { notifications } = await import("../drizzle/schema");
  await (db as any).update(notifications)
    .set({ archivedAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { notifications } = await import("../drizzle/schema");
  const rows = await (db as any)
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
      sql`${notifications.archivedAt} IS NULL`
    ));
  return Number(rows[0]?.count ?? 0);
}

export async function getNotificationById(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const { notifications } = await import("../drizzle/schema");
  const rows = await (db as any)
    .select().from(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Witness Registry ──────────────────────────────────────────────────────────
/** Public ledger of all issued WIDs across the platform.
 *  type: "all" | "full_works" (has audio) | "lyrics" (lyricsText only, no audio)
 */
export async function getWitnessRegistry({
  type,
  offset,
  limit,
}: {
  type: "all" | "full_works" | "lyrics";
  offset: number;
  limit: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const baseConditions = [
    eq(songs.status, "Published"),
    sql`${songs.witnessId} IS NOT NULL`,
  ];
  const typeCondition =
    type === "full_works"
      ? sql`${songs.fileUrl} IS NOT NULL AND ${songs.isLyricsOnly} = 0`
      : type === "lyrics"
      ? sql`${songs.isLyricsOnly} = 1 OR (${songs.lyricsText} IS NOT NULL AND ${songs.fileUrl} IS NULL)`
      : undefined;
  const whereClause = typeCondition
    ? and(...baseConditions, typeCondition)
    : and(...baseConditions);
  const rows = await db
    .select({
      id: songs.id,
      title: songs.title,
      witnessId: songs.witnessId,
      coverArtUrl: songs.coverArtUrl,
      fileUrl: songs.fileUrl,
      videoUrl: songs.videoUrl,
      lyricsText: songs.lyricsText,
      isLyricsOnly: songs.isLyricsOnly,
      genre: songs.genre,
      createdAt: songs.createdAt,
      userId: songs.userId,
      creatorName: users.name,
      artistHandle: users.artistHandle,
    })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(whereClause)
    .orderBy(desc(songs.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    witnessId: r.witnessId,
    coverArtUrl: r.coverArtUrl,
    hasAudio: !!r.fileUrl && !r.isLyricsOnly,
    hasVideo: !!r.videoUrl,
    hasLyrics: !!r.lyricsText,
    isLyricsOnly: r.isLyricsOnly,
    genre: r.genre,
    createdAt: r.createdAt,
    userId: r.userId,
    creatorName: r.creatorName,
    artistHandle: r.artistHandle,
  }));
}

// ─── Jukebox Offerings ────────────────────────────────────────────────────────

export async function createJukeboxOffering(data: {
  roomCode: string;
  gifterId: number;
  amountCents: number;
  stripePaymentIntentId?: string;
  status?: "pending" | "completed" | "failed";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(jukeboxOfferings).values({
    roomCode: data.roomCode,
    gifterId: data.gifterId,
    amountCents: data.amountCents,
    stripePaymentIntentId: data.stripePaymentIntentId ?? null,
    status: data.status ?? "pending",
  });
  return result;
}

export async function updateJukeboxOfferingStatus(
  stripePaymentIntentId: string,
  status: "pending" | "completed" | "failed"
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(jukeboxOfferings)
    .set({ status })
    .where(eq(jukeboxOfferings.stripePaymentIntentId, stripePaymentIntentId));
}

export async function getOfferingsForRoom(roomCode: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(jukeboxOfferings)
    .where(and(eq(jukeboxOfferings.roomCode, roomCode), eq(jukeboxOfferings.status, "completed")))
    .orderBy(desc(jukeboxOfferings.createdAt));
}

// ─── Jukebox Play Events ──────────────────────────────────────────────────────

export async function recordJukeboxPlayEvent(data: {
  roomCode: string;
  songId: number;
  creatorId: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(jukeboxPlayEvents).values({
    roomCode: data.roomCode,
    songId: data.songId,
    creatorId: data.creatorId,
  });
}

export async function getPlayEventsForRoom(roomCode: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(jukeboxPlayEvents)
    .where(eq(jukeboxPlayEvents.roomCode, roomCode))
    .orderBy(desc(jukeboxPlayEvents.playedAt));
}

/**
 * Returns each creator's proportional earnings from jukebox offerings in rooms
 * where their songs played. Earnings = (creatorPlayCount / totalPlays) * totalOfferings.
 * Only counts completed offerings.
 */
export async function getJukeboxEarningsForCreator(creatorId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get all rooms where this creator's songs played
  const playRows = await db
    .select({
      roomCode: jukeboxPlayEvents.roomCode,
      songId: jukeboxPlayEvents.songId,
    })
    .from(jukeboxPlayEvents)
    .where(eq(jukeboxPlayEvents.creatorId, creatorId));

  if (playRows.length === 0) return [];

  const roomCodes = Array.from(new Set(playRows.map((r: { roomCode: string }) => r.roomCode)));
  const results: Array<{
    roomCode: string;
    creatorPlays: number;
    totalPlays: number;
    totalOfferingsCents: number;
    earnedCents: number;
  }> = [];

  for (const roomCode of roomCodes) {
    const rc = roomCode as string;
    // Total plays in this room
    const allPlays = await db
      .select()
      .from(jukeboxPlayEvents)
      .where(eq(jukeboxPlayEvents.roomCode, rc));
    // Creator's plays in this room
    const creatorPlays = allPlays.filter(
      (p: { creatorId: number }) => p.creatorId === creatorId
    ).length;
    // Total completed offerings in this room
    const offerings = await db
      .select()
      .from(jukeboxOfferings)
      .where(sql`${jukeboxOfferings.roomCode} = ${rc} AND ${jukeboxOfferings.status} = 'completed'`);
    const totalOfferingsCents = offerings.reduce(
      (sum: number, o: { amountCents: number }) => sum + o.amountCents,
      0
    );
    const totalPlays = allPlays.length;
    const earnedCents = totalPlays > 0
      ? Math.floor((creatorPlays / totalPlays) * totalOfferingsCents)
      : 0;
    if (totalOfferingsCents > 0 || creatorPlays > 0) {
      results.push({
        roomCode: rc,
        creatorPlays,
        totalPlays,
        totalOfferingsCents,
        earnedCents,
      });
    }
  }

  return results.sort((a, b) => b.earnedCents - a.earnedCents);
}

// ─── Admin Helpers ────────────────────────────────────────────────────────────

/** Search users by name, handle, or email (admin only) */
export async function adminSearchUsers(query: string) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return db
    .select({
      id: users.id,
      name: users.name,
      artistHandle: users.artistHandle,
      email: users.email,
      role: users.role,
      licenseStatus: users.licenseStatus,
      songSlotsTotal: users.songSlotsTotal,
      songSlotsUsed: users.songSlotsUsed,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(or(like(users.name, q), like(users.artistHandle, q), like(users.email, q)))
    .limit(20);
}

/** Directly grant a Creator License + slots to a user (admin only) */
export async function adminGrantLicense(userId: number, slotsGranted: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ licenseStatus: "licensed", songSlotsTotal: slotsGranted }).where(eq(users.id, userId));
  await db.insert(licenses).values({
    userId,
    stripePaymentIntentId: `admin-grant-${Date.now()}`,
    amountCents: 0,
    slotsGranted,
  });
}

// ─── Promo Code Helpers ───────────────────────────────────────────────────────

/** Create a new promo code */
export async function createPromoCode(data: {
  code: string;
  description?: string;
  slotsGranted: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(promoCodes).values({
    code: data.code.toUpperCase().trim(),
    description: data.description ?? null,
    slotsGranted: data.slotsGranted,
    maxUses: data.maxUses ?? null,
    expiresAt: data.expiresAt ?? null,
    createdByUserId: data.createdByUserId,
    isActive: true,
  });
}

/** List all promo codes */
export async function listPromoCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

/** Deactivate a promo code */
export async function deactivatePromoCode(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(promoCodes).set({ isActive: false }).where(eq(promoCodes.id, id));
}

/** Reactivate a promo code */
export async function reactivatePromoCode(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(promoCodes).set({ isActive: true }).where(eq(promoCodes.id, id));
}

/** Redeem a promo code for a user */
export async function redeemPromoCode(userId: number, code: string): Promise<{
  success: boolean;
  message: string;
  slotsGranted?: number;
  totalSlots?: number;
}> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database unavailable." };
  const upperCode = code.toUpperCase().trim();

  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, upperCode)).limit(1);
  if (!promo) return { success: false, message: "Code not found. Please check and try again." };
  if (!promo.isActive) return { success: false, message: "This code has been deactivated." };
  if (promo.expiresAt && promo.expiresAt < new Date()) return { success: false, message: "This code has expired." };
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return { success: false, message: "This code has reached its maximum number of uses." };

  const [existing] = await db
    .select().from(promoRedemptions)
    .where(and(eq(promoRedemptions.userId, userId), eq(promoRedemptions.promoCodeId, promo.id)))
    .limit(1);
  if (existing) return { success: false, message: "You have already redeemed this code." };

  // Get current user to calculate new slot total (ADD to existing, never overwrite)
  const [currentUser] = await db.select({ songSlotsTotal: users.songSlotsTotal, licenseStatus: users.licenseStatus }).from(users).where(eq(users.id, userId)).limit(1);
  const currentSlots = currentUser?.songSlotsTotal ?? 0;
  const newSlots = currentSlots + promo.slotsGranted;
  const alreadyLicensed = currentUser?.licenseStatus === "licensed";
  // Always set to licensed; if already licensed this is a slot top-up
  await db.update(users).set({ licenseStatus: "licensed", songSlotsTotal: newSlots }).where(eq(users.id, userId));
  await db.insert(licenses).values({ userId, stripePaymentIntentId: `promo-${promo.code}-${Date.now()}`, amountCents: 0, slotsGranted: promo.slotsGranted });
  await db.insert(promoRedemptions).values({ userId, promoCodeId: promo.id });
  await db.update(promoCodes).set({ usedCount: promo.usedCount + 1 }).where(eq(promoCodes.id, promo.id));

  const message = alreadyLicensed
    ? `${promo.slotsGranted} slots added! You now have ${newSlots} total upload slots.`
    : `License activated! You now have ${newSlots} upload slots.`;
  return { success: true, message, slotsGranted: promo.slotsGranted, totalSlots: newSlots };
}

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
  return db.select().from(songs)
    .where(eq(songs.collectionId, collectionId))
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

/** Get all collections by a creator. */
export async function getCollectionsByCreator(creatorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collections).where(eq(collections.creatorId, creatorId)).orderBy(desc(collections.createdAt));
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

// ─── Creator Analytics ────────────────────────────────────────────────────────
export async function getCreatorAnalytics(creatorId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // All songs by creator
  const creatorSongs = await db
    .select({ id: songs.id, title: songs.title, playCount: songs.playCount, tipCount: songs.tipCount })
    .from(songs)
    .where(eq(songs.userId, creatorId));

  const songIds = creatorSongs.map((s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => s.id);
  const empty = {
    totalPlays: 0, playsThisWeek: 0, playsThisMonth: 0,
    totalLikes: 0, likesThisWeek: 0,
    totalGiftsReceived: 0, totalAmountReceived: 0, giftsThisMonth: 0,
    totalDownloads: 0,
    playsByTrack: [] as { trackId: string; title: string; plays: number; trend: "up" | "down" | "flat" }[],
    likesByTrack: [] as { trackId: string; title: string; likes: number }[],
    giftsByTrack: [] as { trackId: string; title: string; giftCount: number; totalAmount: number }[],
    downloadsByTrack: [] as { trackId: string; title: string; downloads: number }[],
    playTrend: [] as { date: string; plays: number }[],
  };
  if (songIds.length === 0) return empty;

  // Likes
  const allLikes = await db
    .select({ songId: likes.songId, createdAt: likes.createdAt })
    .from(likes)
    .where(inArray(likes.songId, songIds));
  const totalLikes = allLikes.length;
  const likesThisWeek = allLikes.filter((l: { songId: number; createdAt: Date }) => l.createdAt >= weekAgo).length;
  const likesByTrack = creatorSongs.map((s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => ({
    trackId: String(s.id),
    title: s.title,
    likes: allLikes.filter((l: { songId: number; createdAt: Date }) => l.songId === s.id).length,
  }));

  // Tips
  const allTips = await db
    .select({ songId: tips.songId, amountCents: tips.amountCents, createdAt: tips.createdAt })
    .from(tips)
    .where(inArray(tips.songId, songIds));
  const totalGiftsReceived = allTips.length;
  const totalAmountReceived = allTips.reduce((sum: number, t: { songId: number; amountCents: number | null; createdAt: Date }) => sum + (t.amountCents ?? 0), 0);
  const giftsThisMonth = allTips.filter((t: { songId: number; amountCents: number | null; createdAt: Date }) => t.createdAt >= monthAgo).length;
  const giftsByTrack = creatorSongs.map((s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => {
    const trackTips = allTips.filter((t: { songId: number; amountCents: number | null; createdAt: Date }) => t.songId === s.id);
    return {
      trackId: String(s.id),
      title: s.title,
      giftCount: trackTips.length,
      totalAmount: trackTips.reduce((sum: number, t: { songId: number; amountCents: number | null; createdAt: Date }) => sum + (t.amountCents ?? 0), 0),
    };
  });

  // Downloads
  const allDownloads = await db
    .select({ songId: downloads.songId, createdAt: downloads.createdAt })
    .from(downloads)
    .where(inArray(downloads.songId, songIds));
  const totalDownloads = allDownloads.length;
  const downloadsByTrack = creatorSongs.map((s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => ({
    trackId: String(s.id),
    title: s.title,
    downloads: allDownloads.filter((d: { songId: number; createdAt: Date }) => d.songId === s.id).length,
  }));

  // Plays by track (from songs.playCount — source of truth)
  const totalPlays = creatorSongs.reduce((sum: number, s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => sum + (s.playCount ?? 0), 0);
  const playsByTrack = creatorSongs.map((s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => ({
    trackId: String(s.id),
    title: s.title,
    plays: s.playCount ?? 0,
    trend: "flat" as "up" | "down" | "flat",
  }));

  // 30-day activity trend — bucket events (likes, tips, comments) by day
  const recentEvents = await db
    .select({ workId: events.workId, createdAt: events.createdAt })
    .from(events)
    .where(and(inArray(events.workId, songIds), gte(events.createdAt, monthAgo)));
  const trendMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    trendMap[d.toISOString().slice(0, 10)] = 0;
  }
  recentEvents.forEach((e: { workId: number; createdAt: Date }) => {
    const key = e.createdAt.toISOString().slice(0, 10);
    if (key in trendMap) trendMap[key]++;
  });
  const playTrend = Object.entries(trendMap).map(([date, plays]) => ({ date, plays }));

  return {
    totalPlays,
    playsThisWeek: 0, // playCount is a running total; no per-play event table
    playsThisMonth: 0,
    totalLikes,
    likesThisWeek,
    totalGiftsReceived,
    totalAmountReceived,
    giftsThisMonth,
    totalDownloads,
    playsByTrack,
    likesByTrack,
    giftsByTrack,
    downloadsByTrack,
    playTrend,
  };
}

// ─── Platform Supporters (Founder's Era) ─────────────────────────────────────

/** Compute tier from total gifted amount */
function computeTier(totalGifted: number): "supporter" | "patron" | "covenant" {
  if (totalGifted >= 100) return "covenant";
  if (totalGifted >= 25) return "patron";
  return "supporter";
}

/** Get a single supporter record by userId */
export async function getSupporterByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(platformSupporters).where(eq(platformSupporters.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Get all supporters ordered by totalGifted desc (for Supporters Wall) */
export async function getAllSupporters() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: platformSupporters.id,
      userId: platformSupporters.userId,
      totalGifted: platformSupporters.totalGifted,
      tier: platformSupporters.tier,
      firstGiftAt: platformSupporters.firstGiftAt,
      lastGiftAt: platformSupporters.lastGiftAt,
      name: users.name,
      artistHandle: users.artistHandle,
      avatarUrl: users.profilePhotoUrl,
    })
    .from(platformSupporters)
    .leftJoin(users, eq(platformSupporters.userId, users.id))
    .orderBy(desc(platformSupporters.totalGifted));
}

/**
 * Upsert a supporter record after a successful platform gift payment.
 * Adds the amount to totalGifted, recomputes tier, updates stripePaymentIntentId.
 * Also denormalizes supporterTier onto the users table for fast badge rendering.
 */
export async function recordPlatformGift(userId: number, amountUsd: number, stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await getSupporterByUserId(userId);
  const newTotal = (existing?.totalGifted ?? 0) + amountUsd;
  const newTier = computeTier(newTotal);

  if (existing) {
    await db.update(platformSupporters)
      .set({
        totalGifted: newTotal,
        tier: newTier,
        lastGiftAt: new Date(),
        stripePaymentIntentId,
      })
      .where(eq(platformSupporters.userId, userId));
  } else {
    await db.insert(platformSupporters).values({
      userId,
      totalGifted: newTotal,
      tier: newTier,
      firstGiftAt: new Date(),
      lastGiftAt: new Date(),
      stripePaymentIntentId,
    });
  }

  // Denormalize tier onto users table for fast badge rendering
  await db.update(users).set({ supporterTier: newTier }).where(eq(users.id, userId));

  return { totalGifted: newTotal, tier: newTier };
}

// ─── Activity Delta & Badge Helpers ──────────────────────────────────────────

/** Count events created after the user's lastVisitedActivityAt timestamp.
 *  Returns the number of new events since last visit (for the Activity tab badge). */
export async function getNewEventCountForCreator(creatorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { inArray: inArr, isNull: isNl, gt } = await import("drizzle-orm");
  const userRow = await db.select({ lastVisitedActivityAt: users.lastVisitedActivityAt })
    .from(users).where(eq(users.id, creatorId)).limit(1);
  const lastVisit = userRow[0]?.lastVisitedActivityAt;
  const creatorSongs = await db.select({ id: songs.id }).from(songs).where(eq(songs.userId, creatorId));
  if (!creatorSongs.length) return 0;
  const songIds = creatorSongs.map((s: { id: number }) => s.id);
  const conds: any[] = [inArr(events.workId, songIds), isNl(events.deletedAt)];
  if (lastVisit) conds.push(gt(events.createdAt, lastVisit));
  const rows = await db.select({ count: sql<number>`count(*)` }).from(events).where(and(...conds));
  return Number(rows[0]?.count ?? 0);
}

/** Mark the user as having visited the Activity tab now. */
export async function touchActivityVisit(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastVisitedActivityAt: new Date() }).where(eq(users.id, userId));
}

/** Mark the user as having visited the Dashboard now. */
export async function touchDashboardVisit(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastVisitedDashboardAt: new Date() }).where(eq(users.id, userId));
}

/** Get aggregate activity counts for Dashboard stat card deltas.
 *  Returns new plays, new tips, new comments, new witnesses since lastVisitedDashboardAt. */
export async function getDashboardDeltas(creatorId: number): Promise<{
  newPlays: number; newTips: number; newComments: number; newWitnesses: number;
}> {
  const db = await getDb();
  if (!db) return { newPlays: 0, newTips: 0, newComments: 0, newWitnesses: 0 };
  const { inArray: inArr2, isNull: isNl2, gt: gt2 } = await import("drizzle-orm");
  const userRow = await db.select({ lastVisitedDashboardAt: users.lastVisitedDashboardAt })
    .from(users).where(eq(users.id, creatorId)).limit(1);
  const lastVisit = userRow[0]?.lastVisitedDashboardAt;
  const creatorSongs = await db.select({ id: songs.id }).from(songs).where(eq(songs.userId, creatorId));
  if (!creatorSongs.length) return { newPlays: 0, newTips: 0, newComments: 0, newWitnesses: 0 };
  const songIds = creatorSongs.map((s: { id: number }) => s.id);
  const buildCond = (type: string) => {
    const conds: any[] = [inArr2(events.workId, songIds), isNl2(events.deletedAt), eq(events.type, type as any)];
    if (lastVisit) conds.push(gt2(events.createdAt, lastVisit));
    return and(...conds);
  };
  const [playsRow, tipsRow, commentsRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(events).where(buildCond("LIKE")),
    db.select({ count: sql<number>`count(*)` }).from(events).where(buildCond("TIP")),
    db.select({ count: sql<number>`count(*)` }).from(events).where(buildCond("COMMENT")),
  ]);
  const { witnesses } = await import("../drizzle/schema");
  const witnessConds: any[] = [eq(witnesses.witnessedId, creatorId)];
  if (lastVisit) witnessConds.push(gt2(witnesses.createdAt, lastVisit));
  const witnessRow = await db.select({ count: sql<number>`count(*)` })
    .from(witnesses).where(and(...witnessConds));
  return {
    newPlays: Number(playsRow[0]?.count ?? 0),
    newTips: Number(tipsRow[0]?.count ?? 0),
    newComments: Number(commentsRow[0]?.count ?? 0),
    newWitnesses: Number(witnessRow[0]?.count ?? 0),
  };
}

// ─── Song Reactions ───────────────────────────────────────────────────────────

/** Get reaction counts per emoji for a song, plus the current user's selections */
export async function getSongReactions(songId: number, userId?: number) {
  const db = await getDb();
  if (!db) return { counts: {} as Record<string, number>, mine: [] as string[] };
  const { songReactions } = await import("../drizzle/schema");

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
  const { songReactions } = await import("../drizzle/schema");

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
// Score: playCount * 1 + likeCount * 3 + recency bonus (7d=+50, 30d=+20)
export async function getTrendingWorks(opts?: { genre?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 20;
  const conditions: ReturnType<typeof eq>[] = [
    eq(songs.isPublic, true) as ReturnType<typeof eq>,
    eq(songs.status, "Published") as ReturnType<typeof eq>,
  ];
  if (opts?.genre) conditions.push(eq(songs.genre, opts.genre) as ReturnType<typeof eq>);

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
    likeCount: sql<number>`(SELECT COUNT(*) FROM likes WHERE likes.songId = ${songs.id})`,
  })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(...conditions))
    .limit(limit * 5);

  const now = Date.now();
  const DAY = 86_400_000;
  type RowType = (typeof rows)[number];
  type ScoredRow = RowType & { score: number };
  const scored: ScoredRow[] = rows.map((r: RowType) => {
    const age = now - new Date(r.song.createdAt).getTime();
    const recency = age < 7 * DAY ? 50 : age < 30 * DAY ? 20 : 0;
    const score = (r.song.playCount ?? 0) * 1 + (Number(r.likeCount) ?? 0) * 3 + recency;
    return { ...r, score };
  });
  scored.sort((a: ScoredRow, b: ScoredRow) => b.score - a.score);
  return scored.slice(0, limit).map(({ score: _score, ...rest }: ScoredRow) => rest);
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

// ─── Admin Helpers ────────────────────────────────────────────────────────────

/** Write an immutable admin action log entry. Never throws — failures are silently swallowed. */
export async function logAdminAction(data: {
  adminId: number;
  adminName?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { adminLogs } = await import("../drizzle/schema");
    await db.insert(adminLogs).values({
      adminId: data.adminId,
      adminName: data.adminName ?? null,
      action: data.action,
      targetType: data.targetType ?? null,
      targetId: data.targetId ?? null,
      details: data.details ? JSON.stringify(data.details) : null,
    });
  } catch {
    // Audit log failures must never crash the main operation
  }
}

/** Fetch the most recent admin log entries. */
export async function getAdminLogs(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  const { adminLogs } = await import("../drizzle/schema");
  return db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
}

/** Flag a song for moderation without touching its WID or provenance. */
export async function flagSong(songId: number, reason: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ isFlagged: true, flagReason: reason, moderationStatus: "flagged" }).where(eq(songs.id, songId));
}

/** Clear a flag from a song. */
export async function unflagSong(songId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ isFlagged: false, flagReason: null, moderationStatus: "clear" }).where(eq(songs.id, songId));
}

/** Admin-remove a song from public visibility. NEVER deletes the WID — provenance is preserved. */
export async function adminRemoveSong(songId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ moderationStatus: "removed", isPublic: false, status: "Unlisted" }).where(eq(songs.id, songId));
}

/** Restore a previously removed song to public visibility. */
export async function adminRestoreSong(songId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(songs).set({ moderationStatus: "clear", isPublic: true, status: "Published", isFlagged: false, flagReason: null }).where(eq(songs.id, songId));
}

/** Search works for the admin panel — returns songs with creator info. */
export async function adminSearchWorks(opts: {
  query?: string;
  moderationStatus?: "clear" | "flagged" | "removed";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const conditions: any[] = [];
  if (opts.query) {
    conditions.push(or(
      like(songs.title, `%${opts.query}%`),
      like(songs.witnessId, `%${opts.query}%`),
    ));
  }
  if (opts.moderationStatus) {
    conditions.push(eq(songs.moderationStatus, opts.moderationStatus));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select({
      id: songs.id, title: songs.title, witnessId: songs.witnessId,
      contentType: songs.contentType, status: songs.status, isPublic: songs.isPublic,
      isFlagged: songs.isFlagged, flagReason: songs.flagReason, moderationStatus: songs.moderationStatus,
      createdAt: songs.createdAt,
      creatorId: users.id, creatorName: users.name, creatorHandle: users.artistHandle,
    })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(whereClause)
    .orderBy(desc(songs.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Get all system config entries. */
export async function getAllSystemConfig() {
  const db = await getDb();
  if (!db) return [];
  const { systemConfig } = await import("../drizzle/schema");
  return db.select().from(systemConfig);
}

/** Get a single system config value by key. Returns null if not found. */
export async function getSystemConfigValue(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const { systemConfig } = await import("../drizzle/schema");
  const rows = await db.select({ value: systemConfig.value }).from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

/** Upsert a system config key-value pair. */
export async function setSystemConfigValue(key: string, value: string, description?: string, updatedByUserId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const { systemConfig } = await import("../drizzle/schema");
  await db.insert(systemConfig).values({ key, value, description: description ?? null, updatedByUserId: updatedByUserId ?? null })
    .onDuplicateKeyUpdate({ set: { value, updatedByUserId: updatedByUserId ?? null } });
}

/** Reset a user's Stripe billing state — clears stripeCustomerId. */
export async function resetUserBilling(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ stripeCustomerId: null } as any).where(eq(users.id, userId));
}

/** Get all users for admin panel — ordered by newest first. */
export async function getAllUsersAdmin(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

// ─── Witness Testimony Helpers ────────────────────────────────────────────────

/** Create an immutable witness testimony. Returns the inserted row. */
export async function createTestimony(data: {
  wid: string;
  creatorId: number;
  content: string;
  linkedWorks?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(witnessTestimonies).values({
    wid: data.wid,
    creatorId: data.creatorId,
    content: data.content,
    linkedWorks: (data.linkedWorks ?? null) as unknown as string[],
  });
  // Return the newly created testimony
  const rows = await db.select().from(witnessTestimonies)
    .where(eq(witnessTestimonies.wid, data.wid)).limit(1);
  return rows[0] ?? null;
}

/** Get all testimonies for a creator, newest first. */
export async function getTestimoniesByCreator(creatorId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(witnessTestimonies)
    .where(eq(witnessTestimonies.creatorId, creatorId))
    .orderBy(desc(witnessTestimonies.createdAt))
    .limit(limit);
}

/** Get a single testimony by its WID. */
export async function getTestimonyByWid(wid: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(witnessTestimonies)
    .where(eq(witnessTestimonies.wid, wid)).limit(1);
  return rows[0] ?? null;
}

/** Get testimony count for a creator (for profile stats). */
export async function getTestimonyCount(creatorId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(witnessTestimonies)
    .where(eq(witnessTestimonies.creatorId, creatorId));
  return Number(result[0]?.count ?? 0);
}


// ─── Living Archive Subscription Helpers ─────────────────────────────────────

/** Activate a Living Archive subscription for a user.
 *  Adds slotsPerPeriod to their total and sets subscription metadata.
 */
export async function activateLivingArchive(userId: number, opts: {
  plan: "quarterly" | "annual" | "founder_free";
  stripeSubscriptionId?: string;
  expiresAt: Date;
  slotsToAdd: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const [current] = await db.select({ songSlotsTotal: users.songSlotsTotal })
    .from(users).where(eq(users.id, userId)).limit(1);
  const newTotal = (current?.songSlotsTotal ?? 0) + opts.slotsToAdd;
  await db.update(users).set({
    livingArchivePlan: opts.plan,
    livingArchiveActive: true,
    livingArchiveExpiresAt: opts.expiresAt,
    stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
    songSlotsTotal: newTotal,
    licenseStatus: "licensed",
  } as any).where(eq(users.id, userId));
}

/** Deactivate a Living Archive subscription (on cancellation / expiry).
 *  Does NOT remove slots already granted — they remain permanently.
 */
export async function deactivateLivingArchive(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    livingArchivePlan: "none",
    livingArchiveActive: false,
    livingArchiveExpiresAt: null,
    stripeSubscriptionId: null,
  } as any).where(eq(users.id, userId));
}

/** Grant a Founder Free Tier — 100 slots, no expiry, no Stripe subscription. */
export async function grantFounderFreeTier(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const [current] = await db.select({ songSlotsTotal: users.songSlotsTotal })
    .from(users).where(eq(users.id, userId)).limit(1);
  const newTotal = (current?.songSlotsTotal ?? 0) + 100;
  // Set expiry 100 years in the future (effectively permanent)
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 100);
  await db.update(users).set({
    livingArchivePlan: "founder_free",
    livingArchiveActive: true,
    livingArchiveExpiresAt: farFuture,
    songSlotsTotal: newTotal,
    licenseStatus: "licensed",
  } as any).where(eq(users.id, userId));
}

/** Get Living Archive status for a user. */
export async function getLivingArchiveStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select({
    livingArchivePlan: users.livingArchivePlan,
    livingArchiveActive: users.livingArchiveActive,
    livingArchiveExpiresAt: users.livingArchiveExpiresAt,
    stripeSubscriptionId: users.stripeSubscriptionId,
    songSlotsTotal: users.songSlotsTotal,
    songSlotsUsed: users.songSlotsUsed,
  }).from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

/** Find a user by their Stripe subscription ID (for webhook handling). */
export async function getUserByStripeSubscriptionId(subscriptionId: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(users)
    .where(eq(users.stripeSubscriptionId as any, subscriptionId)).limit(1);
  return row ?? null;
}

// ─── Founder System ───────────────────────────────────────────────────────────
/** Maximum number of founders allowed on the platform. Hard enforced. */
export const MAX_FOUNDERS = 10;

/** Count current founders (role = "founder"). */
export async function countFounders(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql`count(*)` })
    .from(users)
    .where(eq(users.role, "founder" as any));
  return Number(rows[0]?.count ?? 0);
}

/** Grant founder status to a user. Throws if MAX_FOUNDERS would be exceeded. */
export async function grantFounder(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await countFounders();
  if (current >= MAX_FOUNDERS) {
    throw new Error(`Max founders reached (${MAX_FOUNDERS}). Revoke a founder first.`);
  }
  await db.update(users)
    .set({ role: "founder" as any, slotLimit: null })
    .where(eq(users.id, userId));
}

/** Revoke founder status — demotes back to "user" and restores default slot cap. */
export async function revokeFounder(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [user] = await db.select({ songSlotsTotal: users.songSlotsTotal })
    .from(users).where(eq(users.id, userId)).limit(1);
  const restoredLimit = user?.songSlotsTotal ?? 1;
  await db.update(users)
    .set({ role: "user" as any, slotLimit: restoredLimit })
    .where(eq(users.id, userId));
}

/** List all current founders. */
export async function listFounders() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    artistHandle: users.artistHandle,
    profilePhotoUrl: users.profilePhotoUrl,
    createdAt: users.createdAt,
    songSlotsUsed: users.songSlotsUsed,
  }).from(users).where(eq(users.role, "founder" as any));
}

/** Search users for the Founder Control panel (any role). */
export async function searchUsersForFounderPanel(query: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    artistHandle: users.artistHandle,
    profilePhotoUrl: users.profilePhotoUrl,
    role: users.role,
    slotLimit: users.slotLimit,
    songSlotsUsed: users.songSlotsUsed,
    songSlotsTotal: users.songSlotsTotal,
    createdAt: users.createdAt,
  }).from(users)
    .where(
      query.trim().length > 0
        ? or(
            like(users.name as any, q),
            like(users.email as any, q),
            like(users.artistHandle as any, q),
          )
        : sql`1=1`
    )
    .orderBy(desc(users.createdAt))
    .limit(limit);
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

// ── Prompt Drafts ─────────────────────────────────────────────────────────────
/** Save a new prompt draft for a user. */
export async function savePromptDraft(data: {
  userId: number;
  name: string;
  promptMode: "identity_regen" | "style_prompt" | "import_anchor";
  promptType: string;
  targetPlatform?: string;
  expressionId?: string;
  prompt: string;
  styleTags?: string;
  composerNote?: string;
  userInputBlocks?: string;
  shareToken?: string;
  shareUrl?: string;
}): Promise<{ id: number }> {
  const db = await getDb();
  const { promptDrafts } = await import("../drizzle/schema");
  const [result] = await db.insert(promptDrafts).values(data);
  return { id: (result as any).insertId };
}

/** Get all prompt drafts for a user, newest first. */
export async function getPromptDraftsByUser(userId: number) {
  const db = await getDb();
  const { promptDrafts } = await import("../drizzle/schema");
  return db.select().from(promptDrafts)
    .where(eq(promptDrafts.userId, userId))
    .orderBy(desc(promptDrafts.createdAt));
}

/** Get a single prompt draft by ID. */
export async function getPromptDraftById(id: number) {
  const db = await getDb();
  const { promptDrafts } = await import("../drizzle/schema");
  const [row] = await db.select().from(promptDrafts).where(eq(promptDrafts.id, id));
  return row ?? null;
}

/** Get a prompt draft by share token (public). */
export async function getPromptDraftByShareToken(shareToken: string) {
  const db = await getDb();
  const { promptDrafts } = await import("../drizzle/schema");
  const [row] = await db.select().from(promptDrafts).where(eq(promptDrafts.shareToken, shareToken));
  return row ?? null;
}

/** Update share token and URL on a draft, and mark it as shared. */
export async function updatePromptDraftShare(id: number, shareToken: string, shareUrl: string): Promise<void> {
  const db = await getDb();
  const { promptDrafts } = await import("../drizzle/schema");
  await db.update(promptDrafts).set({ shareToken, shareUrl, isShared: true }).where(eq(promptDrafts.id, id));
}

/** Revoke a share link — clears token, URL, and isShared flag. */
export async function revokePromptDraftShare(id: number, userId: number): Promise<void> {
  const db = await getDb();
  const { promptDrafts } = await import("../drizzle/schema");
  await db.update(promptDrafts)
    .set({ shareToken: null, shareUrl: null, isShared: false })
    .where(and(eq(promptDrafts.id, id), eq(promptDrafts.userId, userId)));
}

/** Delete a prompt draft (owner only — caller must verify ownership). */
export async function deletePromptDraft(id: number, userId: number): Promise<void> {
  const db = await getDb();
  const { promptDrafts } = await import("../drizzle/schema");
  await db.delete(promptDrafts).where(and(eq(promptDrafts.id, id), eq(promptDrafts.userId, userId)));
}

/** Update tone/frequency profile fields on a user. */
export async function updateUserToneFrequency(userId: number, data: {
  toneFrequencyNote?: string;
  dominantKey?: string;
  tempoRange?: string;
  energyProfile?: string;
}): Promise<void> {
  const db = await getDb();
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ─── Jukebox: list active rooms ─────────────────────────────────────────────
/**
 * Returns distinct room codes that have pending (unplayed, unskipped) queue
 * items created within the last 2 hours, along with the first pending song
 * and the host (tipper of the oldest pending item) for display in the
 * Live Activity panel.
 */
export async function listActiveJukeboxRooms(): Promise<Array<{
  roomCode: string;
  pendingCount: number;
  nowPlayingTitle: string | null;
  nowPlayingArtist: string | null;
  nowPlayingCoverArtUrl: string | null;
  hostName: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  const { jukeboxQueue, songs: songsTable, users: usersTable } = await import("../drizzle/schema");

  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const rows = await db
    .select({
      roomCode: jukeboxQueue.roomCode,
      position: jukeboxQueue.position,
      createdAt: jukeboxQueue.createdAt,
      tipperName: jukeboxQueue.tipperName,
      songTitle: songsTable.title,
      songCoverArtUrl: songsTable.coverArtUrl,
      creatorName: usersTable.name,
      creatorArtistHandle: usersTable.artistHandle,
    })
    .from(jukeboxQueue)
    .innerJoin(songsTable, eq(jukeboxQueue.songId, songsTable.id))
    .innerJoin(usersTable, eq(songsTable.userId, usersTable.id))
    .where(
      and(
        sql`${jukeboxQueue.playedAt} IS NULL`,
        sql`${jukeboxQueue.skippedAt} IS NULL`,
        sql`${jukeboxQueue.createdAt} >= ${cutoff}`,
      )
    )
    .orderBy(jukeboxQueue.roomCode, jukeboxQueue.position, jukeboxQueue.createdAt);

  // Group by roomCode
  const roomMap = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!roomMap.has(row.roomCode)) roomMap.set(row.roomCode, []);
    roomMap.get(row.roomCode)!.push(row);
  }

  return Array.from(roomMap.entries()).map(([roomCode, items]) => {
    const first = items[0];
    return {
      roomCode,
      pendingCount: items.length,
      nowPlayingTitle: first?.songTitle ?? null,
      nowPlayingArtist: first?.creatorArtistHandle || first?.creatorName || null,
      nowPlayingCoverArtUrl: first?.songCoverArtUrl ?? null,
      hostName: first?.tipperName ?? null,
    };
  });
}

// ─── Content Moderation Helpers ───────────────────────────────────────────────
export async function createContentFlag(data: InsertContentFlag) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(contentFlags).values(data);
  return result;
}

export async function listContentFlags(status?: "pending" | "reviewed_ok" | "removed_violation" | "escalated") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(contentFlags).where(eq(contentFlags.status, status)).orderBy(desc(contentFlags.createdAt));
  }
  return db.select().from(contentFlags).orderBy(desc(contentFlags.createdAt));
}

export async function resolveContentFlag(
  flagId: number,
  adminId: number,
  resolution: "reviewed_ok" | "removed_violation" | "escalated",
  adminNote?: string,
) {
  const db = await getDb();
  if (!db) return;
  await db.update(contentFlags)
    .set({
      status: resolution,
      resolvedById: adminId,
      resolvedAt: new Date(),
      adminNote: adminNote ?? null,
    })
    .where(eq(contentFlags.id, flagId));
}

export async function getContentFlagStats() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ status: contentFlags.status, total: count() })
    .from(contentFlags)
    .groupBy(contentFlags.status);
}

// ─── Declaration Signature Helpers ────────────────────────────────────────────
export async function signDeclaration(data: InsertDeclarationSignature) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db
    .select({ id: declarationSignatures.id })
    .from(declarationSignatures)
    .where(
      and(
        eq(declarationSignatures.userId, data.userId),
        eq(declarationSignatures.declarationVersion, data.declarationVersion ?? "1.0"),
      )
    )
    .limit(1);
  if (existing.length > 0) return { alreadySigned: true };
  await db.insert(declarationSignatures).values(data);
  return { alreadySigned: false };
}

export async function getDeclarationSignature(userId: number, version = "1.0") {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(declarationSignatures)
    .where(
      and(
        eq(declarationSignatures.userId, userId),
        eq(declarationSignatures.declarationVersion, version),
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function countDeclarationSigners(version = "1.0") {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ total: count() })
    .from(declarationSignatures)
    .where(eq(declarationSignatures.declarationVersion, version));
  return rows[0]?.total ?? 0;
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

// ─── Data Portability & Deletion Request ─────────────────────────────────────

/** Collect all data for a user for GDPR/CCPA-style JSON export. */
export async function exportUserData(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [account, userSongs, testimonies, songVers] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(songs).where(eq(songs.userId, userId)).orderBy(desc(songs.createdAt)),
    db.select().from(witnessTestimonies).where(eq(witnessTestimonies.creatorId, userId)).orderBy(desc(witnessTestimonies.createdAt)),
    db.select().from(songVersions).where(eq(songVersions.creatorId, userId)).orderBy(desc(songVersions.createdAt)),
  ]);

  const user = account[0];
  if (!user) return null;

  // Strip sensitive internal fields before export
  const { stripeCustomerId, stripeAccountId, stripeSubscriptionId, ...safeUser } = user;

  // Build HAAI declarations from songs that have them
  type SongRow = typeof userSongs[number];
  type VersionRow = typeof songVers[number];
  const haaiDeclarations = userSongs
    .filter((s: SongRow) => s.aiDisclosure === "human_authored_ai_instrument" && s.haaiDeclaredAt)
    .map((s: SongRow) => ({
      songId: s.id,
      songTitle: s.title,
      witnessId: s.witnessId,
      declaredAt: s.haaiDeclaredAt,
      visualConcept: s.haaiVisualConcept,
      styleLanguage: s.haaiStyleLanguage,
      instrumentation: s.haaiInstrumentation,
      vocalConveyance: s.haaiVocalConveyance,
      lyricalInspiration: s.haaiLyricalInspiration,
      emotionalTone: s.haaiEmotionalTone,
    }));

  return {
    exportedAt: new Date().toISOString(),
    exportVersion: "1.0",
    platform: "Living Nexus — BDDT Publishing / Command Domains LLC",
    account: safeUser,
    songs: userSongs.map((s: SongRow) => ({
      id: s.id, title: s.title, genre: s.genre, witnessId: s.witnessId,
      lyricsWid: s.lyricsWid, aiDisclosure: s.aiDisclosure, aiConsent: s.aiConsent,
      status: s.status, contentType: s.contentType, createdAt: s.createdAt,
    })),
    witnessTestimonies: testimonies,
    haaiDeclarations,
    songVersionHistory: songVers.map((v: VersionRow) => ({
      id: v.id, songId: v.songId, versionNumber: v.versionNumber,
      witnessId: v.witnessId, createdAt: v.createdAt,
    })),
  };
}

/** Record a data deletion request for a user. */
export async function requestDataDeletion(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ dataDeletionRequestedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Platform Settings helpers ────────────────────────────────────────────────

/** Get a platform setting by key. Returns null if not found. */
export async function getPlatformSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

/** Set (upsert) a platform setting. */
export async function setPlatformSetting(
  key: string,
  value: string,
  updatedBy?: number,
  description?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(platformSettings)
      .set({ value, updatedBy: updatedBy ?? null, updatedAt: new Date() })
      .where(eq(platformSettings.key, key));
  } else {
    await db.insert(platformSettings).values({
      key,
      value,
      description: description ?? null,
      updatedBy: updatedBy ?? null,
    });
  }
}

// ─── Admin: Deletion Requests helpers ─────────────────────────────────────────

/** List all users who have requested data deletion, ordered by request date. */
export async function listDeletionRequests(): Promise<Array<{
  id: number;
  name: string | null;
  email: string | null;
  artistHandle: string | null;
  dataDeletionRequestedAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      artistHandle: users.artistHandle,
      dataDeletionRequestedAt: users.dataDeletionRequestedAt,
    })
    .from(users)
    .where(isNotNull(users.dataDeletionRequestedAt))
    .orderBy(users.dataDeletionRequestedAt);
  return rows.filter((r: typeof rows[0]) => r.dataDeletionRequestedAt !== null) as Array<{
    id: number;
    name: string | null;
    email: string | null;
    artistHandle: string | null;
    dataDeletionRequestedAt: Date;
  }>;
}

/** Clear the deletion request flag for a user (mark as processed). */
export async function clearDeletionRequest(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ dataDeletionRequestedAt: null })
    .where(eq(users.id, userId));
}

// ─── Projects (Crowdfunding) ──────────────────────────────────────────────────

export async function createProject(data: InsertProject): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(projects).values(data);
  return (result as any)[0].insertId as number;
}

// getProjectBySlug moved below with creatorId field

export async function getProjectById(id: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function getProjectByWid(wid: string): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(projects).where(eq(projects.linkedWitnessId, wid)).limit(1);
  return rows.length > 0 ? rows[0] : undefined;
}

export async function getProjectsByUser(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
}

export async function updateProject(id: number, data: Partial<InsertProject>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(projects).set({ ...data, updatedAt: new Date() }).where(eq(projects.id, id));
}

export async function getProjectUpdates(projectId: number): Promise<ProjectUpdate[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectUpdates).where(eq(projectUpdates.projectId, projectId)).orderBy(desc(projectUpdates.createdAt));
}

export async function addProjectUpdate(data: { projectId: number; userId: number; title?: string; body: string; imageUrl?: string | null; imageKey?: string | null }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(projectUpdates).values(data);
}

export async function getProjectDonations(projectId: number): Promise<ProjectDonation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectDonations).where(eq(projectDonations.projectId, projectId)).orderBy(desc(projectDonations.createdAt));
}

export async function recordProjectDonation(data: {
  projectId: number;
  donorUserId?: number;
  donorName?: string;
  donorEmail?: string;
  amountCents: number;
  message?: string;
  anonymous?: boolean;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(projectDonations).values(data);
  // Update project totals
  await db.execute(sql`
    UPDATE projects
    SET raisedAmountCents = raisedAmountCents + ${data.amountCents},
        donorCount = donorCount + 1
    WHERE id = ${data.projectId}
  `);
}

export async function listActiveProjects(): Promise<(Project & { creatorName: string | null; creatorHandle: string | null; creatorAvatar: string | null })[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      slug: projects.slug,
      title: projects.title,
      tagline: projects.tagline,
      description: projects.description,
      bannerUrl: projects.bannerUrl,
      bannerKey: projects.bannerKey,
      videoUrl: projects.videoUrl,
      videoType: projects.videoType,
      goalAmountCents: projects.goalAmountCents,
      raisedAmountCents: projects.raisedAmountCents,
      donorCount: projects.donorCount,
      status: projects.status,
      linkedWitnessId: projects.linkedWitnessId,
      linkedSongId: projects.linkedSongId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      creatorName: users.name,
      creatorHandle: users.artistHandle,
      creatorAvatar: users.profilePhotoUrl,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.status, "active"))
    .orderBy(desc(projects.createdAt));
  return rows as any;
}

// ─── Project Blocks (Inline Canvas) ──────────────────────────────────────────

export async function getProjectBlocks(projectId: number): Promise<ProjectBlock[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectBlocks)
    .where(eq(projectBlocks.projectId, projectId))
    .orderBy(projectBlocks.position);
}

export async function saveProjectBlocks(projectId: number, blocks: Array<{
  id?: number;
  type: "text" | "image" | "video" | "divider" | "quote";
  position: number;
  content?: string;
  imageUrl?: string | null;
  imageKey?: string | null;
  imageCaption?: string | null;
  imageSize?: "small" | "medium" | "large" | "full" | null;
  imageFocalX?: number | null;
  imageFocalY?: number | null;
  videoUrl?: string | null;
  videoType?: "youtube" | "vimeo" | "s3" | "none" | null;
  videoCaption?: string | null;
}>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete all existing blocks for this project and re-insert (simple replace strategy)
  await db.delete(projectBlocks).where(eq(projectBlocks.projectId, projectId));
  if (blocks.length === 0) return;
  await db.insert(projectBlocks).values(
    blocks.map((b, i) => ({
      projectId,
      type: b.type,
      position: b.position ?? i,
      content: b.content ?? null,
      imageUrl: b.imageUrl ?? null,
      imageKey: b.imageKey ?? null,
      imageCaption: b.imageCaption ?? null,
      imageSize: b.imageSize ?? null,
      imageFocalX: b.imageFocalX ?? null,
      imageFocalY: b.imageFocalY ?? null,
      videoUrl: b.videoUrl ?? null,
      videoType: (b.videoType ?? "none") as any,
      videoCaption: b.videoCaption ?? null,
    }))
  );
}

export async function getProjectBySlug(slug: string): Promise<(Project & {
  creatorName: string | null;
  creatorHandle: string | null;
  creatorAvatar: string | null;
  creatorId: number;
}) | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      id: projects.id,
      userId: projects.userId,
      slug: projects.slug,
      title: projects.title,
      tagline: projects.tagline,
      description: projects.description,
      bannerUrl: projects.bannerUrl,
      bannerKey: projects.bannerKey,
      videoUrl: projects.videoUrl,
      videoType: projects.videoType,
      goalAmountCents: projects.goalAmountCents,
      raisedAmountCents: projects.raisedAmountCents,
      donorCount: projects.donorCount,
      status: projects.status,
      linkedWitnessId: projects.linkedWitnessId,
      linkedSongId: projects.linkedSongId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      creatorName: users.name,
      creatorHandle: users.artistHandle,
      creatorAvatar: users.profilePhotoUrl,
      creatorId: users.id,
    })
    .from(projects)
    .leftJoin(users, eq(projects.userId, users.id))
    .where(eq(projects.slug, slug))
    .limit(1);
  return rows.length > 0 ? (rows[0] as any) : undefined;
}

export async function getProjectsByCreator(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), ne(projects.status as any, "archived")))
    .orderBy(desc(projects.updatedAt));
}

// ─── Project Followers ────────────────────────────────────────────────────────

export async function followProject(projectId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Insert or ignore if already following (idempotent)
  await db.execute(
    sql`INSERT IGNORE INTO projectFollowers (projectId, userId, createdAt) VALUES (${projectId}, ${userId}, NOW())`
  );
}

export async function unfollowProject(projectId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectFollowers).where(
    and(eq(projectFollowers.projectId, projectId), eq(projectFollowers.userId, userId))
  );
}

export async function isFollowingProject(projectId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: projectFollowers.id })
    .from(projectFollowers)
    .where(and(eq(projectFollowers.projectId, projectId), eq(projectFollowers.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function getProjectFollowerCount(projectId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ cnt: sql<number>`count(*)` })
    .from(projectFollowers)
    .where(eq(projectFollowers.projectId, projectId));
  return Number(rows[0]?.cnt ?? 0);
}

/** Return all follower userIds for a project (for sending notifications). */
export async function getProjectFollowerUserIds(projectId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ userId: projectFollowers.userId })
    .from(projectFollowers)
    .where(eq(projectFollowers.projectId, projectId));
  return rows.map((r: { userId: number }) => r.userId);
}

// ─── Competitive Edge Helpers (Phase 80) ─────────────────────────────────────

/** Return up to `limit` creators who joined in the last 30 days and have at least 1 published track. */
export async function getRecentCreators(limit = 8) {
  const db = await getDb();
  if (!db) return [];
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const results = await db
    .select({
      id: users.id,
      name: users.name,
      artistHandle: users.artistHandle,
      profilePhotoUrl: users.profilePhotoUrl,
      primaryGenre: users.primaryGenre,
      createdAt: users.createdAt,
      publishedCount: sql<number>`count(${songs.id})`,
    })
    .from(users)
    .innerJoin(songs, and(eq(songs.userId, users.id), eq(songs.status, "Published")))
    .where(and(
      isNotNull(users.name),
      ne(users.name, ""),
      sql`${users.createdAt} >= ${fourteenDaysAgo}`,
    ))
    .groupBy(users.id)
    .having(sql`count(${songs.id}) > 0`)
    .orderBy(desc(users.createdAt))
    .limit(limit);
  return results;
}

/** Return top `limit` published songs uploaded in the last 7 days, ranked by play count. */
export async function getNewThisWeek(opts?: { genre?: string; contentType?: "audio" | "lyrics" | "manuscript" | "comic"; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 24;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const conditions: ReturnType<typeof eq>[] = [
    eq(songs.isPublic, true) as ReturnType<typeof eq>,
    eq(songs.status, "Published") as ReturnType<typeof eq>,
    sql`${songs.createdAt} >= ${sevenDaysAgo}` as unknown as ReturnType<typeof eq>,
  ];
  if (opts?.genre) conditions.push(eq(songs.genre, opts.genre) as ReturnType<typeof eq>);
  if (opts?.contentType) conditions.push(eq(songs.contentType, opts.contentType) as ReturnType<typeof eq>);
  return db.select({
    song: songs,
    creator: {
      id: users.id, name: users.name, artistHandle: users.artistHandle,
      profilePhotoUrl: users.profilePhotoUrl, aiDisclosure: users.aiDisclosure,
      primaryGenre: users.primaryGenre, stripeAccountStatus: users.stripeAccountStatus,
      role: users.role,
    },
  })
    .from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(songs.playCount), desc(songs.createdAt))
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
