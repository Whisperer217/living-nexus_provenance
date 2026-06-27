/**
 * server/db/users.ts
 *
 * Users domain — extracted from server/utils/db.ts as Pass 2 of the data-layer refactor.
 *
 * Covers:
 *   - Core user CRUD (upsert, lookup by openId / id)
 *   - Name history
 *   - Profile & expression updates
 *   - Stripe account / license helpers
 *   - Creator listing & OG card
 *   - Admin user helpers (getAllUsersWithStats, adminSearchUsers, adminGrantLicense,
 *     resetUserBilling, getAllUsersAdmin, logAdminAction, getAdminLogs)
 *   - Platform Supporters (getSupporterByUserId, getAllSupporters, recordPlatformGift)
 *   - Activity delta & badge helpers
 *   - Living Archive subscription helpers
 *   - Founder system (MAX_FOUNDERS, countFounders, grantFounder, revokeFounder, listFounders,
 *     searchUsersForFounderPanel)
 *   - Data portability & deletion requests
 *   - Platform settings helpers
 *   - QR Identity Shares
 *   - Agents (getOrCreateAgent, updateAgentFingerprint)
 *   - Keypair (setUserPublicKey)
 *   - Creator Domain helpers (getDomainBlocks, saveDomainLayout, getDomainVersions)
 *   - Declaration Signature helpers
 *   - Onboarding Progress
 *   - Playback Settings
 *   - markWelcomeSeen, recordTosAcceptance
 *   - Provenance Events (insertProvenanceEvent, getProvenanceEventsByCreator,
 *     getLatestProvenanceCheckpoint)
 *   - Creator Analytics (getCreatorAnalytics)
 *   - Dashboard deltas (touchActivityVisit, touchDashboardVisit, getDashboardDeltas,
 *     getNewEventCountForCreator)
 *
 * No behaviour changes — this is a pure structural extraction.
 * server/utils/db.ts still exports all the same names; existing imports are unaffected.
 */

import {
  and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, like, ne, or, sql,
} from "drizzle-orm";
import {
  InsertUser,
  users,
  songs,
  nameHistory,
  expressionLineage,
  platformSupporters,
  events,
  platformSettings,
  qrShares,
  qrScans,
  agents,
  wids,
  provenanceEvents,
  domainBlocks,
  domainVersions,
  declarationSignatures,
  onboardingProgress,
  witnessTestimonies,
  songVersions,
  likes,
  tips,
  downloads,
  type InsertDeclarationSignature,
  type QrShare,
  type InsertQrShare,
  type OnboardingProgress,
  type InsertOnboardingProgress,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../utils/db";

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

// ─── Name History ─────────────────────────────────────────────────────────────

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
  return db.select().from(nameHistory).where(eq(nameHistory.userId, userId)).orderBy(desc(nameHistory.changedAt)).limit(100);
}

/** Return the earliest recorded name for a user (the name at WID issuance). */
export async function getOriginalName(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(nameHistory).where(eq(nameHistory.userId, userId)).orderBy(nameHistory.changedAt).limit(1);
  return rows.length > 0 ? rows[0].newName : null;
}

// ─── Profile & Expression Updates ─────────────────────────────────────────────

export async function updateUserProfile(userId: number, data: {
  name?: string; artistHandle?: string; bio?: string; profilePhotoUrl?: string; bannerUrl?: string;
  bmiMemberNumber?: string; website?: string; location?: string; twitterHandle?: string;
  instagramHandle?: string; youtubeHandle?: string;
  aiDisclosure?: "original" | "ai_assisted" | "ai_generated" | "human_authored_ai_instrument";
  primaryGenre?: string;
  avatarObjectPosition?: string;
  bannerPositionX?: number;
  bannerPositionY?: number;
  cashAppHandle?: string; paypalUsername?: string; venmoHandle?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function updateUserExpression(userId: number, data: {
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
  userInputBlocks?: string;
  sourcePlatform?: string;
  rawExternalPrompt?: string;
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
    .orderBy(desc(expressionLineage.generatedAt))
    .limit(50);
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

export async function setPinCreator(userId: number, isPinned: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isPinned }).where(eq(users.id, userId));
}

export async function getAllCreators() {
  const db = await getDb();
  if (!db) return [];
  const results = await db
    .select({
      id: users.id, name: users.name, artistHandle: users.artistHandle,
      bio: users.bio, profilePhotoUrl: users.profilePhotoUrl, bannerUrl: users.bannerUrl,
      licenseStatus: users.licenseStatus, songSlotsUsed: users.songSlotsUsed,
      stripeAccountStatus: users.stripeAccountStatus,
      isPinned: users.isPinned,
      role: users.role,
      publishedCount: sql<number>`count(${songs.id})`,
    })
    .from(users)
    .innerJoin(songs, and(eq(songs.userId, users.id), eq(songs.status, "Published")))
    .where(and(
      or(
        isNotNull(users.artistHandle),
        and(
          isNotNull(users.name),
          ne(users.name, ""),
          sql`${users.name} NOT REGEXP '^Creator[[:space:]][0-9]+$'`,
        )
      ),
    ))
    .groupBy(users.id)
    .having(sql`count(${songs.id}) > 0`)
    .orderBy(desc(users.createdAt))
    .limit(500);
  if (results.length === 0) return results.map((r: typeof results[number]) => ({ ...r, widCount: 0 }));
  const creatorIds = results.map((r: typeof results[number]) => r.id);
  const widCounts = await db
    .select({ userId: songs.userId, count: sql<number>`count(*)` })
    .from(songs)
    .where(and(
      isNotNull(songs.witnessId),
      ne(songs.status as any, "Deleted"),
      sql`${songs.userId} IN (${sql.raw(creatorIds.join(","))})`
    ))
    .groupBy(songs.userId);
  const widMap = new Map(widCounts.map((r: { userId: number | null; count: number }) => [r.userId, Number(r.count)]));
  return results.map((r: typeof results[number]) => ({ ...r, widCount: widMap.get(r.id) ?? 0 }));
}

// ─── Creator OG Nomination Card ───────────────────────────────────────────────

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

// ─── markWelcomeSeen / recordTosAcceptance ────────────────────────────────────

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

// ─── Admin User Helpers ───────────────────────────────────────────────────────

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
  const { licenses } = await import("../../drizzle/schema");
  await db.update(users).set({ licenseStatus: "licensed", songSlotsTotal: slotsGranted }).where(eq(users.id, userId));
  await db.insert(licenses).values({
    userId,
    stripePaymentIntentId: `admin-grant-${Date.now()}`,
    amountCents: 0,
    slotsGranted,
  });
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
    const { adminLogs } = await import("../../drizzle/schema");
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
  const { adminLogs } = await import("../../drizzle/schema");
  return db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt)).limit(limit);
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
  if (!db) return null;
  const result = await db.select().from(platformSupporters).where(eq(platformSupporters.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
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
  await db.update(users).set({ supporterTier: newTier }).where(eq(users.id, userId));
  return { totalGifted: newTotal, tier: newTier };
}

// ─── Activity Delta & Badge Helpers ──────────────────────────────────────────

/** Count events created after the user's lastVisitedActivityAt timestamp. */
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

/** Get aggregate activity counts for Dashboard stat card deltas. */
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
  const { witnesses } = await import("../../drizzle/schema");
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

// ─── Living Archive Subscription Helpers ─────────────────────────────────────

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
  const [existing] = await db.select({ founderWid: users.founderWid })
    .from(users).where(eq(users.id, userId)).limit(1);
  const founderWid = (existing as any)?.founderWid ?? `WID-FDR-${String(userId).padStart(4, '0')}-${Date.now()}`;
  await db.update(users)
    .set({ role: "founder" as any, slotLimit: null, founderWid, founderGrantedAt: new Date() } as any)
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
  }).from(users).where(eq(users.role, "founder" as any)).limit(200);
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
  const { stripeCustomerId, stripeAccountId, stripeSubscriptionId, ...safeUser } = user;
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

// ─── QR Identity Shares ───────────────────────────────────────────────────────

/** Create a new QR share record and return it. */
export async function createQrShare(data: InsertQrShare): Promise<QrShare | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(qrShares).values(data);
  const id = (result as any)[0]?.insertId as number;
  if (!id) return undefined;
  const rows = await db.select().from(qrShares).where(eq(qrShares.id, id)).limit(1);
  return rows[0];
}

/** Get a QR share by ID. */
export async function getQrShareById(id: number): Promise<QrShare | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(qrShares).where(eq(qrShares.id, id)).limit(1);
  return rows[0];
}

/** Get all QR shares created by a user (sharer). */
export async function getQrSharesByUser(sharerId: number): Promise<QrShare[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qrShares)
    .where(eq(qrShares.sharerId, sharerId))
    .orderBy(desc(qrShares.createdAt));
}

/** Get all QR shares for a specific entity (creator/project/song). */
export async function getQrSharesByEntity(
  entityType: "creator" | "project" | "song",
  entityId: number
): Promise<QrShare[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qrShares)
    .where(and(eq(qrShares.entityType, entityType), eq(qrShares.entityId, entityId)))
    .orderBy(desc(qrShares.createdAt));
}

/** Log a QR scan event and increment the scanCount on the share. */
export async function logQrScan(data: {
  shareId: number;
  refHandle?: string | null;
  campaign?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(qrScans).values({
    shareId: data.shareId,
    refHandle: data.refHandle ?? null,
    campaign: data.campaign ?? null,
    ipHash: data.ipHash ?? null,
    userAgent: data.userAgent ?? null,
  });
  await db.execute(sql`UPDATE qrShares SET scanCount = scanCount + 1 WHERE id = ${data.shareId}`);
}

/** Get scan stats for a share (total scans + recent 20 events). */
export async function getQrScanStats(shareId: number): Promise<{
  total: number;
  recent: Array<{ refHandle: string | null; campaign: string | null; scannedAt: Date }>;
}> {
  const db = await getDb();
  if (!db) return { total: 0, recent: [] };
  const share = await getQrShareById(shareId);
  const total = share?.scanCount ?? 0;
  const recent = await db.select({
    refHandle: qrScans.refHandle,
    campaign: qrScans.campaign,
    scannedAt: qrScans.scannedAt,
  })
    .from(qrScans)
    .where(eq(qrScans.shareId, shareId))
    .orderBy(desc(qrScans.scannedAt))
    .limit(20);
  return { total, recent };
}

// ─── Agents (Personal Nexus Agent) ───────────────────────────────────────────

export async function getOrCreateAgent(userId: number) {
  const db = await getDb();
  const existing = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(agents).values({ userId });
  const created = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
  return created[0]!;
}

export async function updateAgentFingerprint(
  agentId: number,
  styleFingerprint: { tone: string[]; structure_patterns: string[]; common_transforms: string[] },
  frozenTraits?: { voice_constraints: string[] }
) {
  const db = await getDb();
  const update: Record<string, unknown> = { styleFingerprint };
  if (frozenTraits) update.frozenTraits = frozenTraits;
  await db.update(agents).set(update).where(eq(agents.id, agentId));
}

// ─── Keypair ──────────────────────────────────────────────────────────────────

export async function setUserPublicKey(userId: number, publicKeyHex: string) {
  const db = await getDb();
  await db.update(users).set({ publicKey: publicKeyHex }).where(eq(users.id, userId));
}

// ─── Creator Domain Helpers ───────────────────────────────────────────────────

export async function getDomainBlocks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(domainBlocks)
    .where(eq(domainBlocks.userId, userId))
    .orderBy(asc(domainBlocks.position));
}

export async function saveDomainLayout(
  userId: number,
  blocks: Array<{
    blockType: string;
    position: number;
    visible: boolean;
    size: "small" | "medium" | "large" | "full";
    config: Record<string, unknown> | null;
  }>,
  changeNote?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(domainBlocks).where(eq(domainBlocks.userId, userId));
  if (blocks.length > 0) {
    await db.insert(domainBlocks).values(
      blocks.map((b) => ({
        userId,
        blockType: b.blockType,
        position: b.position,
        visible: b.visible,
        size: b.size,
        config: b.config ?? undefined,
      }))
    );
  }
  const [versionRow] = await db
    .select({ maxVersion: sql<number>`MAX(\`versionNumber\`)` })
    .from(domainVersions)
    .where(eq(domainVersions.userId, userId));
  const nextVersion = (versionRow?.maxVersion ?? 0) + 1;
  await db.insert(domainVersions).values({
    userId,
    versionNumber: nextVersion,
    layoutSnapshot: blocks.map((b) => ({
      blockType: b.blockType,
      position: b.position,
      visible: b.visible,
      size: b.size,
      config: b.config ?? {},
    })),
    changeNote: changeNote ?? null,
  });
  return nextVersion;
}

export async function getDomainVersions(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(domainVersions)
    .where(eq(domainVersions.userId, userId))
    .orderBy(desc(domainVersions.versionNumber))
    .limit(limit);
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

// ─── Onboarding Progress ──────────────────────────────────────────────────────

export async function getOnboardingProgress(userId: number): Promise<OnboardingProgress | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertOnboardingProgress(
  userId: number,
  patch: Partial<Omit<InsertOnboardingProgress, 'id' | 'userId' | 'startedAt'>>
): Promise<OnboardingProgress | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getOnboardingProgress(userId);
  if (!existing) {
    await db.insert(onboardingProgress).values({ userId, ...patch });
  } else {
    await db.update(onboardingProgress).set(patch).where(eq(onboardingProgress.userId, userId));
  }
  return getOnboardingProgress(userId);
}

export type { OnboardingProgress, InsertOnboardingProgress };

// ─── Playback Settings ────────────────────────────────────────────────────────

export interface PlaybackSettings {
  transitionMode: "gapless" | "crossfade" | "fade_out_in" | "standard";
  crossfadeDuration: number;
  globalFadeIn: number;
  globalFadeOut: number;
  preBuffer: boolean;
  albumMode: boolean;
}

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  transitionMode: "standard",
  crossfadeDuration: 5,
  globalFadeIn: 0,
  globalFadeOut: 0,
  preBuffer: true,
  albumMode: false,
};

export async function getPlaybackSettings(userId: number): Promise<PlaybackSettings> {
  const db = await getDb();
  if (!db) return DEFAULT_PLAYBACK_SETTINGS;
  const result = await db.select({ playbackSettings: users.playbackSettings }).from(users).where(eq(users.id, userId)).limit(1);
  const raw = result[0]?.playbackSettings;
  if (!raw) return DEFAULT_PLAYBACK_SETTINGS;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return { ...DEFAULT_PLAYBACK_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_PLAYBACK_SETTINGS;
  }
}

export async function savePlaybackSettings(userId: number, settings: Partial<PlaybackSettings>): Promise<PlaybackSettings> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getPlaybackSettings(userId);
  const merged = { ...current, ...settings };
  await db.update(users).set({ playbackSettings: JSON.stringify(merged) } as any).where(eq(users.id, userId));
  return merged;
}

// ─── Provenance Events (CreatorSurface / Writer satchel) ─────────────────────

export async function insertProvenanceEvent(data: {
  eventId: string;
  creatorId: number;
  agentId?: number | null;
  actionType: "draft" | "checkpoint" | "anchor" | "fork";
  parentEventId?: string | null;
  origin?: {
    origin_type: "original" | "derived" | "assisted";
    source_refs: string[];
    transformation_type: "rewrite" | "remix" | "extension" | null;
  } | null;
  payloadCanonical: string;
  signature?: string | null;
  sessionLabel?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const { provenanceEvents: pe } = await import("../../drizzle/schema");
  await db.insert(pe).values({
    eventId: data.eventId,
    creatorId: data.creatorId,
    agentId: data.agentId ?? null,
    actionType: data.actionType,
    parentEventId: data.parentEventId ?? null,
    origin: data.origin ?? null,
    payloadCanonical: data.payloadCanonical,
    signature: data.signature ?? null,
    sessionLabel: data.sessionLabel ?? null,
  });
  return { eventId: data.eventId };
}

export async function getProvenanceEventsByCreator(creatorId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const { provenanceEvents: pe } = await import("../../drizzle/schema");
  return db
    .select()
    .from(pe)
    .where(eq(pe.creatorId, creatorId))
    .orderBy(desc(pe.createdAt))
    .limit(limit);
}

export async function getLatestProvenanceCheckpoint(creatorId: number) {
  const db = await getDb();
  if (!db) return null;
  const { provenanceEvents: pe } = await import("../../drizzle/schema");
  const rows = await db
    .select()
    .from(pe)
    .where(and(
      eq(pe.creatorId, creatorId),
      eq(pe.actionType, "checkpoint")
    ))
    .orderBy(desc(pe.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Creator Analytics ────────────────────────────────────────────────────────

export async function getCreatorAnalytics(creatorId: number) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
  const totalPlays = creatorSongs.reduce((sum: number, s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => sum + (s.playCount ?? 0), 0);
  const playsByTrack = creatorSongs.map((s: { id: number; title: string; playCount: number | null; tipCount: number | null }) => ({
    trackId: String(s.id),
    title: s.title,
    plays: s.playCount ?? 0,
    trend: "flat" as "up" | "down" | "flat",
  }));
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
    playsThisWeek: 0,
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
