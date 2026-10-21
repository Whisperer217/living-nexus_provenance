import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  albumReleaseDraftRevisions,
  albumReleaseDraftTracks,
  albumReleaseDrafts,
  albumReleaseFamilies,
  collections,
  songs,
  users,
} from "../../drizzle/schema";
import { getDb } from "../utils/db";
import {
  assertDraftMembershipCandidates,
  assertEditableDraft,
  assertExactDraftMembershipIds,
  ReleaseDraftPolicyError,
} from "../domains/releases/releasePolicy";

export type DraftReleaseMetadata = {
  title: string;
  description?: string | null;
  coverArtUrl?: string | null;
  visibilityIntent?: "public" | "unlisted" | "private";
};

export type DraftReleaseTrack = {
  membershipId: number;
  songId: number;
  position: number;
  title: string;
  coverArtUrl: string | null;
  witnessId: string | null;
  durationSeconds: number | null;
  creatorName: string | null;
  creatorHandle: string | null;
};

function unavailable() {
  throw new ReleaseDraftPolicyError("DRAFT_UNAVAILABLE", "Draft release unavailable.");
}

function changed() {
  throw new ReleaseDraftPolicyError("DRAFT_CHANGED", "This draft changed. Reload, review, or retry.");
}

function affectedExactlyOne(result: unknown): boolean {
  const first = Array.isArray(result) ? result[0] : result;
  return Number((first as { affectedRows?: number } | undefined)?.affectedRows ?? 0) === 1;
}

async function selectDraftTracks(db: any, draftId: number): Promise<DraftReleaseTrack[]> {
  return db
    .select({
      membershipId: albumReleaseDraftTracks.id,
      songId: songs.id,
      position: albumReleaseDraftTracks.position,
      title: songs.title,
      coverArtUrl: songs.coverArtUrl,
      witnessId: songs.witnessId,
      durationSeconds: songs.durationSeconds,
      creatorName: users.name,
      creatorHandle: users.artistHandle,
    })
    .from(albumReleaseDraftTracks)
    .innerJoin(songs, eq(albumReleaseDraftTracks.songId, songs.id))
    .leftJoin(users, eq(songs.userId, users.id))
    .where(eq(albumReleaseDraftTracks.draftId, draftId))
    .orderBy(asc(albumReleaseDraftTracks.position));
}

async function getOwnedDraftIn(db: any, creatorId: number, draftId: number) {
  const [draft] = await db
    .select()
    .from(albumReleaseDrafts)
    .where(and(eq(albumReleaseDrafts.id, draftId), eq(albumReleaseDrafts.creatorId, creatorId)))
    .limit(1);
  return draft;
}

async function selectEligibleCandidates(db: any, songIds: number[]) {
  if (!songIds.length) return [];
  return db
    .select({
      id: songs.id,
      userId: songs.userId,
      status: songs.status,
      isPublic: songs.isPublic,
      contentType: songs.contentType,
      witnessId: songs.witnessId,
      fileUrl: songs.fileUrl,
    })
    .from(songs)
    .where(inArray(songs.id, songIds));
}

/**
 * Private draft history is evidence of an editable relationship, not a WID
 * claim. It stays inside the same transaction as its accepted draft revision.
 */
async function recordDraftRevision(
  tx: any,
  creatorId: number,
  draft: any,
  operation: "created" | "metadata_updated" | "membership_replaced" | "membership_reordered" | "archived" | "published",
) {
  const tracks = await selectDraftTracks(tx, draft.id);
  const snapshot = JSON.stringify({
    schema: "living-nexus:draft-release-revision:1",
    draft: {
      id: String(draft.id),
      releaseFamilyId: String(draft.releaseFamilyId),
      revision: draft.revision,
      title: draft.title,
      description: draft.description ?? null,
      coverArtUrl: draft.coverArtUrl ?? null,
      visibilityIntent: draft.visibilityIntent,
      status: draft.status,
    },
    members: tracks.map((track) => ({
      position: track.position,
      workId: String(track.songId),
      workWid: track.witnessId,
    })),
  });
  const snapshotHash = createHash("sha256").update(snapshot, "utf8").digest("hex");
  await tx.insert(albumReleaseDraftRevisions).values({
    draftId: draft.id,
    revision: draft.revision,
    actorUserId: creatorId,
    operation,
    canonicalSnapshot: snapshot,
    snapshotHash,
  });
}

/** Private owner-only drafts, newest first. No edition or public state is inferred. */
export async function listOwnedDraftReleases(creatorId: number) {
  const db = await getDb();
  if (!db) return [];
  const drafts: Array<{ id: number; [key: string]: unknown }> = await db
    .select()
    .from(albumReleaseDrafts)
    .where(and(eq(albumReleaseDrafts.creatorId, creatorId), eq(albumReleaseDrafts.status, "draft")))
    .orderBy(desc(albumReleaseDrafts.updatedAt));
  if (!drafts.length) return [];
  const tracks: Array<{ draftId: number }> = await db
    .select({ draftId: albumReleaseDraftTracks.draftId })
    .from(albumReleaseDraftTracks)
    .where(inArray(albumReleaseDraftTracks.draftId, drafts.map((draft) => draft.id)));
  const counts = new Map<number, number>();
  tracks.forEach((track) => counts.set(track.draftId, (counts.get(track.draftId) ?? 0) + 1));
  return drafts.map((draft: { id: number; [key: string]: unknown }) => ({ ...draft, trackCount: counts.get(draft.id) ?? 0 }));
}

/** Existing published audio Works that this creator can place in a new private Draft Release. */
export async function listEligibleDraftReleaseWorks(creatorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: songs.id,
      title: songs.title,
      coverArtUrl: songs.coverArtUrl,
      witnessId: songs.witnessId,
      durationSeconds: songs.durationSeconds,
      genre: songs.genre,
    })
    .from(songs)
    .where(and(
      eq(songs.userId, creatorId),
      eq(songs.status, "Published"),
      eq(songs.isPublic, true),
      eq(songs.contentType, "audio"),
      isNotNull(songs.witnessId),
      isNotNull(songs.fileUrl),
    ))
    .orderBy(asc(songs.title))
    .limit(500);
}

export async function getOwnedDraftRelease(creatorId: number, draftId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const draft = await getOwnedDraftIn(db, creatorId, draftId);
  if (!draft) return undefined;
  const tracks = await selectDraftTracks(db, draft.id);
  return { draft, tracks };
}

export async function createDraftRelease(
  creatorId: number,
  createRequestId: string,
  metadata: DraftReleaseMetadata,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return (db as any).transaction(async (tx: any) => {
    const [existing] = await tx
      .select()
      .from(albumReleaseDrafts)
      .where(and(
        eq(albumReleaseDrafts.creatorId, creatorId),
        eq(albumReleaseDrafts.createRequestId, createRequestId),
      ))
      .limit(1);
    if (existing) return { draft: existing, created: false };

    const familyResult = await tx.insert(albumReleaseFamilies).values({ creatorId });
    const releaseFamilyId = Number(familyResult.insertId);
    const draftResult = await tx.insert(albumReleaseDrafts).values({
      releaseFamilyId,
      creatorId,
      title: metadata.title,
      description: metadata.description ?? null,
      coverArtUrl: metadata.coverArtUrl ?? null,
      visibilityIntent: metadata.visibilityIntent ?? "public",
      createRequestId,
    });
    const draftId = Number(draftResult.insertId);
    const [draft] = await tx.select().from(albumReleaseDrafts).where(eq(albumReleaseDrafts.id, draftId)).limit(1);
    if (!draft) throw new Error("Draft creation did not return a record");
    await recordDraftRevision(tx, creatorId, draft, "created");
    return { draft, created: true };
  });
}

/**
 * Creates a new, private editable release relationship from an owner's current
 * legacy-album members. The legacy WID-ALB record is an observational source
 * only: this never edits its membership, collective hash, certificate, Work
 * WIDs, media, or participation declarations.
 */
export async function createDraftReleaseFromLegacyCollection(
  creatorId: number,
  createRequestId: string,
  legacyCollectionId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return (db as any).transaction(async (tx: any) => {
    const [existing] = await tx
      .select()
      .from(albumReleaseDrafts)
      .where(and(
        eq(albumReleaseDrafts.creatorId, creatorId),
        eq(albumReleaseDrafts.createRequestId, createRequestId),
      ))
      .limit(1);
    if (existing) return { draft: existing, created: false };

    const [legacy] = await tx
      .select()
      .from(collections)
      .where(and(
        eq(collections.id, legacyCollectionId),
        eq(collections.creatorId, creatorId),
      ))
      .limit(1);
    if (!legacy) unavailable();

    const sourceMembers = await tx
      .select({ id: songs.id })
      .from(songs)
      .where(and(
        eq(songs.collectionId, legacy.id),
        sql`${songs.status} != 'Deleted'`,
      ))
      .orderBy(asc(songs.trackOrder), asc(songs.id));
    const songIdsInOrder: number[] = sourceMembers.map((member: { id: number }) => member.id);
    const candidates = await selectEligibleCandidates(tx, songIdsInOrder);
    // Validate the whole current set before creating a family or a draft so a
    // partial relationship cannot be represented as an edition candidate.
    assertDraftMembershipCandidates(creatorId, songIdsInOrder, candidates);

    const familyResult = await tx.insert(albumReleaseFamilies).values({
      creatorId,
      sourceKind: "legacy_collection",
      legacyCollectionId: legacy.id,
      legacyCollectionWidSnapshot: legacy.collectionWid,
    });
    const releaseFamilyId = Number(familyResult.insertId);
    const draftResult = await tx.insert(albumReleaseDrafts).values({
      releaseFamilyId,
      creatorId,
      title: legacy.name,
      description: legacy.description ?? null,
      coverArtUrl: legacy.coverArtUrl ?? null,
      visibilityIntent: legacy.visibility,
      createRequestId,
    });
    const draftId = Number(draftResult.insertId);
    await tx.insert(albumReleaseDraftTracks).values(songIdsInOrder.map((songId: number, position: number) => ({
      draftId,
      songId,
      position,
      addedByUserId: creatorId,
    })));
    const [draft] = await tx.select().from(albumReleaseDrafts).where(eq(albumReleaseDrafts.id, draftId)).limit(1);
    if (!draft) throw new Error("Draft creation did not return a record");
    await recordDraftRevision(tx, creatorId, draft, "created");
    const tracks = await selectDraftTracks(tx, draftId);
    return { draft, tracks, created: true };
  });
}

export async function updateDraftReleaseMetadata(
  creatorId: number,
  draftId: number,
  expectedRevision: number,
  metadata: DraftReleaseMetadata,
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return (db as any).transaction(async (tx: any) => {
    const draft = await getOwnedDraftIn(tx, creatorId, draftId);
    assertEditableDraft(draft, creatorId, expectedRevision);
    const result = await tx.update(albumReleaseDrafts).set({
      title: metadata.title,
      description: metadata.description ?? null,
      coverArtUrl: metadata.coverArtUrl ?? null,
      visibilityIntent: metadata.visibilityIntent ?? "public",
      revision: expectedRevision + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(albumReleaseDrafts.id, draftId),
      eq(albumReleaseDrafts.creatorId, creatorId),
      eq(albumReleaseDrafts.status, "draft"),
      eq(albumReleaseDrafts.revision, expectedRevision),
    ));
    if (!affectedExactlyOne(result)) changed();
    const updatedDraft = await getOwnedDraftIn(tx, creatorId, draftId);
    if (!updatedDraft) unavailable();
    await recordDraftRevision(tx, creatorId, updatedDraft, "metadata_updated");
    const tracks = await selectDraftTracks(tx, draftId);
    return { draft: updatedDraft, tracks };
  });
}

export async function replaceDraftReleaseMembership(
  creatorId: number,
  draftId: number,
  expectedRevision: number,
  songIdsInOrder: number[],
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return (db as any).transaction(async (tx: any) => {
    const draft = await getOwnedDraftIn(tx, creatorId, draftId);
    assertEditableDraft(draft, creatorId, expectedRevision);
    const candidates = await selectEligibleCandidates(tx, songIdsInOrder);
    assertDraftMembershipCandidates(creatorId, songIdsInOrder, candidates);

    const revisionResult = await tx.update(albumReleaseDrafts).set({
      revision: expectedRevision + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(albumReleaseDrafts.id, draftId),
      eq(albumReleaseDrafts.creatorId, creatorId),
      eq(albumReleaseDrafts.status, "draft"),
      eq(albumReleaseDrafts.revision, expectedRevision),
    ));
    if (!affectedExactlyOne(revisionResult)) changed();

    await tx.delete(albumReleaseDraftTracks).where(eq(albumReleaseDraftTracks.draftId, draftId));
    await tx.insert(albumReleaseDraftTracks).values(songIdsInOrder.map((songId, position) => ({
      draftId,
      songId,
      position,
      addedByUserId: creatorId,
    })));
    const refreshed = await selectDraftTracks(tx, draftId);
    const updatedDraft = await getOwnedDraftIn(tx, creatorId, draftId);
    if (!updatedDraft) unavailable();
    await recordDraftRevision(tx, creatorId, updatedDraft, "membership_replaced");
    return { draft: updatedDraft, tracks: refreshed };
  });
}

export async function reorderDraftReleaseMembership(
  creatorId: number,
  draftId: number,
  expectedRevision: number,
  membershipIdsInOrder: number[],
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return (db as any).transaction(async (tx: any) => {
    const draft = await getOwnedDraftIn(tx, creatorId, draftId);
    assertEditableDraft(draft, creatorId, expectedRevision);
    const current = await tx
      .select({ id: albumReleaseDraftTracks.id })
      .from(albumReleaseDraftTracks)
      .where(eq(albumReleaseDraftTracks.draftId, draftId));
    assertExactDraftMembershipIds(current.map((row: { id: number }) => row.id), membershipIdsInOrder);

    const revisionResult = await tx.update(albumReleaseDrafts).set({
      revision: expectedRevision + 1,
      updatedAt: new Date(),
    }).where(and(
      eq(albumReleaseDrafts.id, draftId),
      eq(albumReleaseDrafts.creatorId, creatorId),
      eq(albumReleaseDrafts.status, "draft"),
      eq(albumReleaseDrafts.revision, expectedRevision),
    ));
    if (!affectedExactlyOne(revisionResult)) changed();

    for (let position = 0; position < membershipIdsInOrder.length; position++) {
      const membershipId = membershipIdsInOrder[position];
      const result = await tx.update(albumReleaseDraftTracks).set({ position: position + membershipIdsInOrder.length + 1 })
        .where(and(eq(albumReleaseDraftTracks.id, membershipId), eq(albumReleaseDraftTracks.draftId, draftId)));
      if (!affectedExactlyOne(result)) unavailable();
    }
    for (let position = 0; position < membershipIdsInOrder.length; position++) {
      const membershipId = membershipIdsInOrder[position];
      const result = await tx.update(albumReleaseDraftTracks).set({ position })
        .where(and(eq(albumReleaseDraftTracks.id, membershipId), eq(albumReleaseDraftTracks.draftId, draftId)));
      if (!affectedExactlyOne(result)) unavailable();
    }

    const tracks = await selectDraftTracks(tx, draftId);
    const updatedDraft = await getOwnedDraftIn(tx, creatorId, draftId);
    if (!updatedDraft) unavailable();
    await recordDraftRevision(tx, creatorId, updatedDraft, "membership_reordered");
    return { draft: updatedDraft, tracks };
  });
}

export async function abandonDraftRelease(creatorId: number, draftId: number, expectedRevision: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (db as any).transaction(async (tx: any) => {
    const draft = await getOwnedDraftIn(tx, creatorId, draftId);
    assertEditableDraft(draft, creatorId, expectedRevision);
    const result = await tx.update(albumReleaseDrafts).set({
      status: "abandoned",
      revision: expectedRevision + 1,
      archivedByUserId: creatorId,
      archivedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(albumReleaseDrafts.id, draftId),
      eq(albumReleaseDrafts.creatorId, creatorId),
      eq(albumReleaseDrafts.status, "draft"),
      eq(albumReleaseDrafts.revision, expectedRevision),
    ));
    if (!affectedExactlyOne(result)) changed();
    const archivedDraft = await getOwnedDraftIn(tx, creatorId, draftId);
    if (!archivedDraft) unavailable();
    await recordDraftRevision(tx, creatorId, archivedDraft, "archived");
    return { ok: true };
  });
}
