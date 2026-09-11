import { and, asc, eq, isNotNull, like, or, sql } from "drizzle-orm";
import { provenanceEvents, songs, users, wids } from "../../drizzle/schema";
import { getDb } from "../utils/db";

const MAX_LIMIT = 50;

export type RegistryCursorPage<T> = { items: T[]; nextCursor: string | null };

export type PublicRegistryWork = {
  wid: string;
  title: string;
  contentType: string;
  genre: string | null;
  registeredAt: Date;
  creator: { handle: string | null; name: string | null };
  canonicalUrl: string;
  verificationUrl: string;
};

function normalizeHandle(handle: string) {
  return handle.replace(/^@/, "").trim();
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isInteger(payload.offset) && payload.offset >= 0 ? payload.offset : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function boundedLimit(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : 20;
}

function toPublicWork(row: { song: typeof songs.$inferSelect; creator: { name: string | null; artistHandle: string | null } | null }): PublicRegistryWork {
  const wid = row.song.witnessId!;
  return {
    wid,
    title: row.song.title,
    contentType: row.song.contentType,
    genre: row.song.genre ?? null,
    registeredAt: row.song.createdAt,
    creator: { handle: row.creator?.artistHandle ?? null, name: row.creator?.name ?? null },
    canonicalUrl: `https://www.livingnexus.org/verify/${wid}`,
    verificationUrl: `https://www.livingnexus.org/verify/${wid}`,
  };
}

async function selectPublicWorks(whereConditions: any[], limit: number, offset: number) {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  return db.select({
    song: songs,
    creator: { name: users.name, artistHandle: users.artistHandle },
  }).from(songs)
    .leftJoin(users, eq(songs.userId, users.id))
    .where(and(
      eq(songs.status, "Published"),
      eq(songs.isPublic, true),
      isNotNull(songs.witnessId),
      ...whereConditions,
    ))
    .orderBy(asc(songs.createdAt))
    .limit(limit)
    .offset(offset) as Promise<Array<{ song: typeof songs.$inferSelect; creator: { name: string | null; artistHandle: string | null } | null }>>;
}

export async function searchPublicRegistryWorks(input: { q?: string; type?: string; cursor?: string; limit?: unknown }): Promise<RegistryCursorPage<PublicRegistryWork>> {
  const offset = decodeCursor(input.cursor);
  const limit = boundedLimit(input.limit);
  const conditions: any[] = [];
  const query = input.q?.trim();
  if (query) {
    const pattern = `%${query.slice(0, 120)}%`;
    conditions.push(or(like(songs.title, pattern), like(songs.genre, pattern), like(users.artistHandle, pattern)));
  }
  if (input.type) {
    const allowedTypes = ["audio", "lyrics", "manuscript", "comic", "game", "image", "gcode", "3dmodel"];
    if (!allowedTypes.includes(input.type)) return { items: [], nextCursor: null };
    conditions.push(eq(songs.contentType, input.type as typeof songs.contentType.enumValues[number]));
  }
  const rows = await selectPublicWorks(conditions, limit + 1, offset);
  const items = rows.slice(0, limit).map(toPublicWork);
  return { items, nextCursor: rows.length > limit ? encodeCursor(offset + limit) : null };
}

export async function findPublicRegistryWork(wid: string): Promise<PublicRegistryWork | null> {
  const rows = await selectPublicWorks([eq(songs.witnessId, wid.trim().toUpperCase())], 1, 0);
  return rows[0] ? toPublicWork(rows[0]) : null;
}

export async function getPublicRegistryCreator(handle: string) {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const canonicalHandle = normalizeHandle(handle);
  const [creator] = await db.select({ id: users.id, name: users.name, artistHandle: users.artistHandle, profilePhotoUrl: users.profilePhotoUrl })
    .from(users)
    .where(sql`LOWER(${users.artistHandle}) = ${canonicalHandle.toLowerCase()}`)
    .limit(1);
  if (!creator) return null;
  const [count] = await db.select({ value: sql<number>`count(*)` }).from(songs).where(and(
    eq(songs.userId, creator.id),
    eq(songs.status, "Published"),
    eq(songs.isPublic, true),
    isNotNull(songs.witnessId),
  ));
  if (!Number(count?.value ?? 0)) return null;
  return {
    handle: creator.artistHandle,
    name: creator.name,
    avatarUrl: creator.profilePhotoUrl ?? null,
    canonicalUrl: creator.artistHandle
      ? `https://www.livingnexus.org/creator/${creator.artistHandle}`
      : `https://www.livingnexus.org/verify`,
    publicRegisteredWorkCount: Number(count?.value ?? 0),
  };
}

export async function listPublicRegistryCreatorWorks(input: { handle: string; cursor?: string; limit?: unknown }): Promise<RegistryCursorPage<PublicRegistryWork> | null> {
  const creator = await getPublicRegistryCreator(input.handle);
  if (!creator?.handle) return null;
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const [user] = await db.select({ id: users.id }).from(users).where(sql`LOWER(${users.artistHandle}) = ${creator.handle.toLowerCase()}`).limit(1);
  if (!user) return null;
  const offset = decodeCursor(input.cursor);
  const limit = boundedLimit(input.limit);
  const rows = await selectPublicWorks([eq(songs.userId, user.id)], limit + 1, offset);
  return { items: rows.slice(0, limit).map(toPublicWork), nextCursor: rows.length > limit ? encodeCursor(offset + limit) : null };
}

export async function getPublicRegistryProvenance(widValue: string) {
  const work = await findPublicRegistryWork(widValue);
  if (!work) return null;
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const [wid] = await db.select().from(wids).where(eq(wids.wid, work.wid)).limit(1);
  if (!wid) return null;
  const [event] = await db.select().from(provenanceEvents).where(eq(provenanceEvents.eventId, wid.eventId)).limit(1);
  return {
    wid: work.wid,
    registeredAt: wid.createdAt,
    contentHash: wid.contentHash,
    signature: wid.signature ?? null,
    event: event ? {
      eventId: event.eventId,
      actionType: event.actionType,
      parentEventId: event.parentEventId ?? null,
      originType: event.origin?.origin_type ?? null,
      transformationType: event.origin?.transformation_type ?? null,
      createdAt: event.createdAt,
    } : null,
  };
}

export async function getPublicRegistryPermissions(wid: string) {
  const work = await findPublicRegistryWork(wid);
  if (!work) return null;
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const [song] = await db.select({ aiConsent: songs.aiConsent, downloadPermission: songs.downloadPermission, isPublic: songs.isPublic, status: songs.status, witnessId: songs.witnessId })
    .from(songs).where(eq(songs.witnessId, work.wid)).limit(1);
  if (!song) return null;
  return {
    wid: work.wid,
    states: {
      public: song.isPublic && song.status === "Published",
      registered: Boolean(song.witnessId),
      aiUse: song.aiConsent,
      attachedToContext: "NOT_CONNECTED" as const,
    },
    downloads: song.downloadPermission,
    delegatedUserAuthorizationRequiredFor: ["private_queue", "private_library", "creator_testimony", "creator_corpus"],
  };
}

export function registryCapabilities() {
  return {
    supported: ["public_registered_work", "public_creator_identity", "public_wid", "public_provenance_references", "public_permission_summary"],
    notConnected: ["private_queue", "private_library", "creator_testimony", "creator_corpus", "registration", "policy_mutation"],
    delegatedAuthorization: "Required in addition to a service key for all private creator material.",
  };
}
