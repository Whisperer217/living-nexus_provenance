import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("legacy WID-ALB recovery and public projection", () => {
  const repository = read("server/db/albumReleases.ts");
  const router = read("server/routers/releaseDrafts.ts");
  const db = read("server/utils/db.ts");
  const profile = read("server/routers/profile.ts");
  const workspace = read("client/src/pages/CollectionsWorkspacePage.tsx");
  const album = read("client/src/pages/AlbumDetailPage.tsx");

  it("clones only an owner’s current eligible Work relationships into a separate private draft", () => {
    expect(repository).toContain("createDraftReleaseFromLegacyCollection");
    expect(repository).toContain("eq(collections.id, legacyCollectionId)");
    expect(repository).toContain("eq(collections.creatorId, creatorId)");
    expect(repository).toContain("assertDraftMembershipCandidates(creatorId, songIdsInOrder, candidates)");
    expect(repository).toContain('sourceKind: "legacy_collection"');
    expect(repository).toContain("legacyCollectionId: legacy.id");
    expect(repository).toContain("legacyCollectionWidSnapshot: legacy.collectionWid");
    expect(repository).toContain("albumReleaseDraftTracks");
  });

  it("does not mutate legacy album membership, hashes, certificates, Work records, or WIDs during recovery", () => {
    const start = repository.indexOf("export async function createDraftReleaseFromLegacyCollection");
    const end = repository.indexOf("export async function updateDraftReleaseMetadata", start);
    const recovery = repository.slice(start, end);
    expect(recovery).not.toContain("tx.update(collections)");
    expect(recovery).not.toContain("tx.update(songs)");
    expect(recovery).not.toContain("collectiveHash:");
    expect(recovery).not.toContain("collectionWid:");
    expect(recovery).not.toContain("witnessId:");
  });

  it("exposes recovery only through a protected mutation and one owner workspace action", () => {
    expect(router).toContain("createFromLegacyCollection: protectedProcedure");
    expect(router).toContain("legacyCollectionId: z.number().int().positive()");
    expect(workspace).toContain("releaseDrafts.createFromLegacyCollection.useMutation");
    expect(workspace).toContain("Create Draft from Current Works");
    expect(album).toContain('href="/creator/collections"');
    expect(album).toContain("Manage Collections");
  });

  it("filters public Creator Domain album cards through the exact current-membership seal before presenting them", () => {
    expect(db).toContain("export async function getPublicCollectionsByCreator");
    expect(db).toContain("collectionCompositionSealMatches(row.collection");
    expect(profile).toContain("getPublicCollectionsByCreator(input.creatorId)");
    expect(profile).toContain("const collectionRows = await getPublicCollectionsByCreator(creatorId)");
    expect(profile).toContain("const cols = await getPublicCollectionsByCreator(creatorId)");
  });
});
