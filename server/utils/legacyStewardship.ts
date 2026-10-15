import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  legacyMemorialStatements,
  legacyStewardshipEvents,
  legacyStewardshipGrants,
  songs,
  users,
} from "../../drizzle/schema";
import { getDb, getPool } from "./db";

export const LEGACY_STEWARDSHIP_SCOPE = {
  viewRegistry: true,
  exportRecords: true,
  managePublicPresentation: true,
  appendMemorialStatement: true,
} as const;

export type LegacyStewardshipScope = typeof LEGACY_STEWARDSHIP_SCOPE;

export function legacyStewardshipActiveKey(creatorId: number, stewardId: number) {
  return `${creatorId}:${stewardId}`;
}

export async function getActiveLegacyStewardshipGrant(creatorId: number, stewardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const rows = await db
    .select()
    .from(legacyStewardshipGrants)
    .where(and(
      eq(legacyStewardshipGrants.creatorId, creatorId),
      eq(legacyStewardshipGrants.stewardId, stewardId),
      eq(legacyStewardshipGrants.status, "active"),
    ))
    .orderBy(desc(legacyStewardshipGrants.grantedAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function createLegacyStewardshipGrant(input: {
  creatorId: number;
  stewardId: number;
  grantedByUserId: number;
  reason: string;
  authorityReference: string;
  scope?: LegacyStewardshipScope;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await getActiveLegacyStewardshipGrant(input.creatorId, input.stewardId);
  if (existing) return { grant: existing, created: false };

  const scope = input.scope ?? LEGACY_STEWARDSHIP_SCOPE;
  const [result] = await db.insert(legacyStewardshipGrants).values({
    creatorId: input.creatorId,
    stewardId: input.stewardId,
    activeKey: legacyStewardshipActiveKey(input.creatorId, input.stewardId),
    status: "active",
    scopeJson: scope,
    reason: input.reason,
    authorityReference: input.authorityReference,
    grantedByUserId: input.grantedByUserId,
  });
  const grantId = Number(result.insertId);

  await db.insert(legacyStewardshipEvents).values({
    grantId,
    creatorId: input.creatorId,
    actorUserId: input.grantedByUserId,
    eventType: "granted",
    detailsJson: {
      stewardId: input.stewardId,
      reason: input.reason,
      authorityReference: input.authorityReference,
      scope,
    },
  });

  const grant = await getActiveLegacyStewardshipGrant(input.creatorId, input.stewardId);
  if (!grant) throw new Error("Legacy Stewardship grant could not be read after creation");
  return { grant, created: true };
}

export async function revokeLegacyStewardshipGrant(input: {
  grantId: number;
  revokedByUserId: number;
  revocationReason: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const rows = await db.select().from(legacyStewardshipGrants)
    .where(eq(legacyStewardshipGrants.id, input.grantId))
    .limit(1);
  const grant = rows[0];
  if (!grant || grant.status !== "active") return null;

  await db.update(legacyStewardshipGrants)
    .set({
      status: "revoked",
      activeKey: null,
      revokedByUserId: input.revokedByUserId,
      revokedAt: new Date(),
      revocationReason: input.revocationReason,
    })
    .where(eq(legacyStewardshipGrants.id, input.grantId));

  await db.insert(legacyStewardshipEvents).values({
    grantId: input.grantId,
    creatorId: grant.creatorId,
    actorUserId: input.revokedByUserId,
    eventType: "revoked",
    detailsJson: { reason: input.revocationReason },
  });

  return grant;
}

export async function getPublicLegacyMemorials(creatorId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    id: legacyMemorialStatements.id,
    body: legacyMemorialStatements.body,
    bodyHash: legacyMemorialStatements.bodyHash,
    createdAt: legacyMemorialStatements.createdAt,
    stewardName: users.name,
    stewardHandle: users.artistHandle,
  })
    .from(legacyMemorialStatements)
    .innerJoin(users, eq(legacyMemorialStatements.stewardId, users.id))
    .where(eq(legacyMemorialStatements.creatorId, creatorId))
    .orderBy(asc(legacyMemorialStatements.createdAt));
}

export async function appendLegacyMemorialStatement(input: {
  creatorId: number;
  stewardId: number;
  stewardshipGrantId: number;
  body: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const bodyHash = createHash("sha256").update(input.body, "utf8").digest("hex");
  const existing = await db.select({ id: legacyMemorialStatements.id })
    .from(legacyMemorialStatements)
    .where(eq(legacyMemorialStatements.bodyHash, bodyHash))
    .limit(1);
  if (existing[0]) return { id: Number(existing[0].id), bodyHash, created: false };

  const [result] = await db.insert(legacyMemorialStatements).values({
    creatorId: input.creatorId,
    stewardshipGrantId: input.stewardshipGrantId,
    stewardId: input.stewardId,
    body: input.body,
    bodyHash,
  });
  const id = Number(result.insertId);

  await db.insert(legacyStewardshipEvents).values({
    grantId: input.stewardshipGrantId,
    creatorId: input.creatorId,
    actorUserId: input.stewardId,
    eventType: "memorial_published",
    targetId: id,
    detailsJson: { bodyHash },
  });

  return { id, bodyHash, created: true };
}

export type CreatorRegistryReconciliation = {
  creatorId: number;
  creator: { id: number; name: string | null; artistHandle: string | null } | null;
  inspectedAt: string;
  totalWorks: number;
  publishedWorks: number;
  draftWorks: number;
  workIds: number[];
  works: Array<{
    id: number;
    title: string;
    witnessId: string | null;
    status: string;
    isPublic: boolean;
    collectionId: number | null;
  }>;
  canonicalWidCount: number;
  missingCanonicalWids: Array<{ id: number; title: string }>;
  malformedCanonicalWids: Array<{ id: number; title: string; witnessId: string | null }>;
  duplicateCanonicalWids: string[];
  auxiliaryWidRowCount: number;
  auxiliaryWidsNotAttachedToCurrentWorks: string[];
  snapshotSha256: string;
};

type RegistryWorkRow = {
  id: number;
  title: string;
  witnessId: string | null;
  status: string;
  isPublic: boolean;
  fileHash: string | null;
  storedArtifactHash: string | null;
  collectionId: number | null;
  createdAt: Date | null;
};

type AuxiliaryWidRow = {
  wid: string;
  contentHash: string;
  eventId: string;
};

export async function reconcileCreatorRegistry(creatorId: number): Promise<CreatorRegistryReconciliation> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [creator] = await db.select({ id: users.id, name: users.name, artistHandle: users.artistHandle })
    .from(users)
    .where(eq(users.id, creatorId))
    .limit(1);

  const works = (await db.select({
    id: songs.id,
    title: songs.title,
    witnessId: songs.witnessId,
    status: songs.status,
    isPublic: songs.isPublic,
    fileHash: songs.fileHash,
    storedArtifactHash: songs.storedArtifactHash,
    collectionId: songs.collectionId,
    createdAt: songs.createdAt,
  })
    .from(songs)
    .where(eq(songs.userId, creatorId))
    .orderBy(asc(songs.id))) as RegistryWorkRow[];

  // The historic `wids` table predates the reconciled Drizzle baseline. Read
  // its live, existing `widCode` index directly rather than altering that
  // table or treating its shape as the authority for current Work WIDs.
  const pool = await getPool();
  if (!pool) throw new Error("Database unavailable");
  const [auxiliaryRows] = await pool.query(
    "SELECT `widCode` AS `wid`, `fileHash` AS `contentHash`, `workType` AS `eventId` FROM `wids` WHERE `creatorId` = ? ORDER BY `widCode` ASC",
    [creatorId],
  ) as [AuxiliaryWidRow[], unknown];

  const canonicalWidPattern = /^WID-[A-Z0-9][A-Z0-9-]{2,63}$/;
  const missingCanonicalWids = works
    .filter((work) => !work.witnessId?.trim())
    .map((work) => ({ id: work.id, title: work.title }));
  const malformedCanonicalWids = works
    .filter((work) => Boolean(work.witnessId?.trim()) && !canonicalWidPattern.test(work.witnessId!.trim()))
    .map((work) => ({ id: work.id, title: work.title, witnessId: work.witnessId }));

  const witnessIds = works.flatMap((work) => work.witnessId?.trim() ? [work.witnessId.trim()] : []);
  const witnessIdCounts = new Map<string, number>();
  for (const wid of witnessIds) witnessIdCounts.set(wid, (witnessIdCounts.get(wid) ?? 0) + 1);
  const duplicateCanonicalWids = Array.from(witnessIdCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([wid]) => wid)
    .sort();
  const attachedWids = new Set(witnessIds);
  const auxiliaryWidsNotAttachedToCurrentWorks = auxiliaryRows
    .map((row) => row.wid)
    .filter((wid) => !attachedWids.has(wid));

  const snapshot = works.map((work) => ({
    id: work.id,
    title: work.title,
    witnessId: work.witnessId,
    status: work.status,
    isPublic: work.isPublic,
    fileHash: work.fileHash,
    storedArtifactHash: work.storedArtifactHash,
    collectionId: work.collectionId,
    createdAt: work.createdAt?.toISOString() ?? null,
  }));
  const snapshotSha256 = createHash("sha256")
    .update(JSON.stringify(snapshot), "utf8")
    .digest("hex");

  return {
    creatorId,
    creator: creator ?? null,
    inspectedAt: new Date().toISOString(),
    totalWorks: works.length,
    publishedWorks: works.filter((work) => work.status === "Published").length,
    draftWorks: works.filter((work) => work.status !== "Published").length,
    workIds: works.map((work) => work.id),
    works: works.map((work) => ({
      id: work.id,
      title: work.title,
      witnessId: work.witnessId,
      status: work.status,
      isPublic: work.isPublic,
      collectionId: work.collectionId,
    })),
    canonicalWidCount: witnessIds.length,
    missingCanonicalWids,
    malformedCanonicalWids,
    duplicateCanonicalWids,
    auxiliaryWidRowCount: auxiliaryRows.length,
    auxiliaryWidsNotAttachedToCurrentWorks,
    snapshotSha256,
  };
}

export async function recordLegacyReconciliation(input: {
  grantId: number;
  creatorId: number;
  actorUserId: number;
  reconciliation: CreatorRegistryReconciliation;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const summary = {
    totalWorks: input.reconciliation.totalWorks,
    publishedWorks: input.reconciliation.publishedWorks,
    draftWorks: input.reconciliation.draftWorks,
    canonicalWidCount: input.reconciliation.canonicalWidCount,
    missingCanonicalWidCount: input.reconciliation.missingCanonicalWids.length,
    malformedCanonicalWidCount: input.reconciliation.malformedCanonicalWids.length,
    duplicateCanonicalWidCount: input.reconciliation.duplicateCanonicalWids.length,
    auxiliaryWidRowCount: input.reconciliation.auxiliaryWidRowCount,
    auxiliaryWidNotAttachedCount: input.reconciliation.auxiliaryWidsNotAttachedToCurrentWorks.length,
    snapshotSha256: input.reconciliation.snapshotSha256,
  };
  const [result] = await db.insert(legacyStewardshipEvents).values({
    grantId: input.grantId,
    creatorId: input.creatorId,
    actorUserId: input.actorUserId,
    eventType: "reconciliation_recorded",
    detailsJson: summary,
  });

  return { id: Number(result.insertId), ...summary };
}

export async function getLegacyStewardshipEvents(creatorId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.select({
    id: legacyStewardshipEvents.id,
    eventType: legacyStewardshipEvents.eventType,
    detailsJson: legacyStewardshipEvents.detailsJson,
    createdAt: legacyStewardshipEvents.createdAt,
    actorName: users.name,
    actorHandle: users.artistHandle,
  })
    .from(legacyStewardshipEvents)
    .leftJoin(users, eq(legacyStewardshipEvents.actorUserId, users.id))
    .where(eq(legacyStewardshipEvents.creatorId, creatorId))
    .orderBy(desc(legacyStewardshipEvents.createdAt))
    .limit(limit);
  return rows;
}
