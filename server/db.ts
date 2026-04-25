import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertEvent, InsertUser, agents, events, users, wids } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

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
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function setUserPublicKey(userId: number, publicKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ publicKey }).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Agent helpers ─────────────────────────────────────────────────────────────

export async function getOrCreateAgent(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(agents).values({
    userId,
    styleFingerprint: { tone: [], structure_patterns: [], common_transforms: [] },
    frozenTraits: { voice_constraints: [] },
  });
  const created = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
  return created[0];
}

export async function updateAgentFingerprint(
  agentId: number,
  styleFingerprint: { tone: string[]; structure_patterns: string[]; common_transforms: string[] },
  frozenTraits?: { voice_constraints: string[] }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { styleFingerprint };
  if (frozenTraits) updateData.frozenTraits = frozenTraits;
  await db.update(agents).set(updateData).where(eq(agents.id, agentId));
}

// ─── Event helpers ─────────────────────────────────────────────────────────────

/** Insert an event. Events are APPEND-ONLY — never update or delete. */
export async function insertEvent(event: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(events).values(event);
}

export async function getEventById(eventId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(events).where(eq(events.eventId, eventId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getEventsByCreator(creatorId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(events)
    .where(eq(events.creatorId, creatorId))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

export async function getLatestCheckpointByCreator(creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(events)
    .where(and(eq(events.creatorId, creatorId), eq(events.actionType, "checkpoint")))
    .orderBy(desc(events.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── WID helpers ──────────────────────────────────────────────────────────────

export async function insertWid(wid: {
  wid: string;
  eventId: string;
  contentHash: string;
  creatorId: number;
  signature?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(wids).values({
    wid: wid.wid,
    eventId: wid.eventId,
    contentHash: wid.contentHash,
    creatorId: wid.creatorId,
    signature: wid.signature ?? null,
  });
}

export async function getWidById(widId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(wids).where(eq(wids.wid, widId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWidWithEvent(widId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const widResult = await db.select().from(wids).where(eq(wids.wid, widId)).limit(1);
  if (widResult.length === 0) return null;
  const w = widResult[0];
  const eventResult = await db.select().from(events).where(eq(events.eventId, w.eventId)).limit(1);
  const userResult = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, w.creatorId)).limit(1);
  return {
    wid: w,
    event: eventResult.length > 0 ? eventResult[0] : null,
    creator: userResult.length > 0 ? userResult[0] : null,
  };
}
