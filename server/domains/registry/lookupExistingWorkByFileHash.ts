import { getDb, getUserById } from "../../utils/db";

type ExistingWorkRow = {
  id: number;
  title: string;
  witnessId: string | null;
  userId: number;
  createdAt: Date;
};

type CreatorIdentity = {
  artistHandle?: string | null;
  name?: string | null;
} | null;

export type DuplicateWorkLookupSource = {
  findByFileHash: (fileHash: string) => Promise<ExistingWorkRow | null>;
  getCreatorById: (userId: number) => Promise<CreatorIdentity>;
};

export type DuplicateWorkLookupResult =
  | { duplicate: false }
  | {
      duplicate: true;
      isOwnWork: boolean;
      existingTitle: string;
      existingWid: string | null;
      existingCreator: string;
      existingCreatedAt: Date;
    };

const databaseDuplicateWorkLookup: DuplicateWorkLookupSource = {
  async findByFileHash(fileHash) {
    const db = await getDb();
    const { songs } = await import("../../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const existing = await db
      .select({
        id: songs.id,
        title: songs.title,
        witnessId: songs.witnessId,
        userId: songs.userId,
        createdAt: songs.createdAt,
      })
      .from(songs)
      .where(eq(songs.fileHash, fileHash))
      .limit(1);

    return existing[0] ?? null;
  },
  getCreatorById: getUserById,
};

/**
 * Read-only duplicate-work lookup used by the existing protected songs.checkDuplicate facade.
 * It returns the established public preflight shape and never creates or updates a Work,
 * WID, provenance record, asset, or playback/payment state.
 */
export async function lookupExistingWorkByFileHash(
  fileHash: string,
  requesterId: number,
  source: DuplicateWorkLookupSource = databaseDuplicateWorkLookup
): Promise<DuplicateWorkLookupResult> {
  const match = await source.findByFileHash(fileHash);
  if (!match) return { duplicate: false as const };

  const owner = await source.getCreatorById(match.userId);
  return {
    duplicate: true as const,
    isOwnWork: match.userId === requesterId,
    existingTitle: match.title,
    existingWid: match.witnessId,
    existingCreator: owner?.artistHandle ?? owner?.name ?? "Unknown",
    existingCreatedAt: match.createdAt,
  };
}
