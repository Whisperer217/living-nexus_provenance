/**
 * server/db/visualWorks.ts
 *
 * Data-layer helpers for the Visual Works medium.
 * All functions return raw Drizzle rows — no business logic here.
 */
import { getDb } from "../utils/db";
import { visualWorks, visualItems } from "../../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";

// ─── Visual Works (Collections) ───────────────────────────────────────────────

export async function createVisualWork(data: {
  creatorId: number;
  title: string;
  description?: string;
  mediumType?: string;
  style?: string;
  subject?: string;
  keywords?: string;
  license?: string;
  copyright?: string;
  coverUrl?: string;
  haaiDisclosure?: string;
  originStory?: string;
  collectionWid?: string;
}) {
  const db = await getDb();
  const [result] = await db.insert(visualWorks).values({
    ...data,
    status: "draft",
  });
  return result;
}

export async function getVisualWorkById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(visualWorks).where(eq(visualWorks.id, id));
  return row ?? null;
}

export async function getVisualWorksByCreator(creatorId: number) {
  const db = await getDb();
  return db
    .select()
    .from(visualWorks)
    .where(eq(visualWorks.creatorId, creatorId))
    .orderBy(desc(visualWorks.createdAt));
}

export async function getPublicVisualWorks(limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(visualWorks)
    .where(eq(visualWorks.status, "published"))
    .orderBy(desc(visualWorks.createdAt))
    .limit(limit);
}

export async function updateVisualWork(
  id: number,
  creatorId: number,
  data: Partial<{
    title: string;
    description: string;
    mediumType: string;
    style: string;
    subject: string;
    keywords: string;
    license: string;
    copyright: string;
    coverUrl: string;
    haaiDisclosure: string;
    originStory: string;
    status: string;
  }>
) {
  const db = await getDb();
  await db
    .update(visualWorks)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(visualWorks.id, id), eq(visualWorks.creatorId, creatorId)));
}

export async function publishVisualWork(id: number, creatorId: number, collectionWid: string) {
  const db = await getDb();
  await db
    .update(visualWorks)
    .set({ status: "published", collectionWid, updatedAt: new Date() })
    .where(and(eq(visualWorks.id, id), eq(visualWorks.creatorId, creatorId)));
}

export async function deleteVisualWork(id: number, creatorId: number) {
  const db = await getDb();
  await db
    .delete(visualWorks)
    .where(and(eq(visualWorks.id, id), eq(visualWorks.creatorId, creatorId)));
}

// ─── Visual Items ─────────────────────────────────────────────────────────────

export async function createVisualItem(data: {
  collectionId: number;
  creatorId: number;
  imageUrl: string;
  imageKey?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  mediumType?: string;
  style?: string;
  subject?: string;
  dimensions?: string;
  resolution?: string;
  aspectRatio?: string;
  colorProfile?: string;
  cameraInfo?: string;
  haaiDisclosure?: string;
  creationDate?: string;
  license?: string;
  copyright?: string;
  keywords?: string;
  versionLabel?: string;
  displayOrder?: number;
  contentHash?: string;
  witnessId?: string;
}) {
  const db = await getDb();
  const [result] = await db.insert(visualItems).values(data);
  return result;
}

export async function getVisualItemsByCollection(collectionId: number) {
  const db = await getDb();
  return db
    .select()
    .from(visualItems)
    .where(eq(visualItems.collectionId, collectionId))
    .orderBy(asc(visualItems.displayOrder), asc(visualItems.createdAt));
}

export async function getVisualItemById(id: number) {
  const db = await getDb();
  const [row] = await db.select().from(visualItems).where(eq(visualItems.id, id));
  return row ?? null;
}

export async function getVisualItemByWid(witnessId: string) {
  const db = await getDb();
  const [row] = await db.select().from(visualItems).where(eq(visualItems.witnessId, witnessId));
  return row ?? null;
}

export async function updateVisualItem(
  id: number,
  creatorId: number,
  data: Partial<{
    title: string;
    description: string;
    mediumType: string;
    style: string;
    subject: string;
    dimensions: string;
    resolution: string;
    aspectRatio: string;
    colorProfile: string;
    cameraInfo: string;
    haaiDisclosure: string;
    creationDate: string;
    license: string;
    copyright: string;
    keywords: string;
    versionLabel: string;
    displayOrder: number;
    thumbnailUrl: string;
  }>
) {
  const db = await getDb();
  await db
    .update(visualItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(visualItems.id, id), eq(visualItems.creatorId, creatorId)));
}

export async function deleteVisualItem(id: number, creatorId: number) {
  const db = await getDb();
  await db
    .delete(visualItems)
    .where(and(eq(visualItems.id, id), eq(visualItems.creatorId, creatorId)));
}

export async function countVisualItemsInCollection(collectionId: number): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ id: visualItems.id })
    .from(visualItems)
    .where(eq(visualItems.collectionId, collectionId));
  return rows.length;
}
