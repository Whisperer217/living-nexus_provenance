import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("Creator Collections workspace", () => {
  const workspace = read("client/src/pages/CollectionsWorkspacePage.tsx");
  const app = read("client/src/App.tsx");
  const archive = read("client/src/pages/ArchivePage.tsx");
  const drafts = read("server/routers/releaseDrafts.ts");
  const repository = read("server/db/albumReleases.ts");

  it("uses one owner workspace route before generic Creator Domain matching", () => {
    expect(app.indexOf('path="/creator/collections"')).toBeGreaterThan(-1);
    expect(app.indexOf('path="/creator/collections"')).toBeLessThan(app.indexOf('path="/creator/:id"'));
    expect(archive).toContain('href="/creator/collections"');
  });

  it("distinguishes editable drafts, preserved legacy albums, and mutable playlists", () => {
    expect(workspace).toContain("PRIVATE DRAFT RELEASE");
    expect(workspace).toContain("Legacy WID-ALB Sealed Albums");
    expect(workspace).toContain("Named Playlists");
    expect(workspace).toContain('href="/playlists"');
    expect(workspace).not.toContain("playQueueAt(");
    expect(workspace).not.toContain("setQueue(");
  });

  it("holds WID-ALB2 sealing without presenting a fake publication action", () => {
    expect(workspace).toContain("WID-ALB2 sealed edition");
    expect(workspace).toContain("RELEASE_SIGNING_HOLD");
    expect(drafts).toContain("sealReadiness");
    expect(drafts).toContain("ready: false as const");
    expect(drafts).not.toContain("albumEditions).values");
  });

  it("keeps every private draft mutation owner-scoped, revision-checked, and ledgered", () => {
    expect(drafts).toContain("protectedProcedure");
    expect(drafts).toContain("expectedRevision");
    expect(repository).toContain("recordDraftRevision");
    expect(repository).toContain("albumReleaseDraftRevisions");
    expect(repository).toContain("assertExactDraftMembershipIds");
  });

  it("keeps ordinary Draft Release membership independent from legacy albums while allowing the explicit recovery snapshot", () => {
    expect(repository).toContain("albumReleaseDraftTracks");
    expect(repository).not.toContain("updateSongMetadata");
    const ordinaryDraftOperations = repository.slice(
      repository.indexOf("export async function createDraftRelease("),
      repository.indexOf("export async function createDraftReleaseFromLegacyCollection("),
    );
    expect(ordinaryDraftOperations).not.toContain("songs.collectionId");
  });

  it("lets only the owner create a separate private draft from a preserved legacy album", () => {
    expect(drafts).toContain("createFromLegacyCollection: protectedProcedure");
    expect(workspace).toContain("Create Draft from Current Works");
    expect(repository).toContain("createDraftReleaseFromLegacyCollection");
    expect(repository).toContain('sourceKind: "legacy_collection"');
    expect(repository).toContain("legacyCollectionWidSnapshot: legacy.collectionWid");
    expect(repository).toContain("assertDraftMembershipCandidates(creatorId, songIdsInOrder, candidates)");
    expect(repository).toContain("never edits its membership, collective hash, certificate, Work");
  });

  it("opens created, recovered, and reopened drafts through the private route with clear feedback", () => {
    expect(app).toContain('path="/studio/release/:id"');
    expect(workspace).toContain("const openDraft = (draftId: number)");
    expect(workspace).toContain("navigate(`/studio/release/${draftId}`)");
    expect(workspace).toContain("Opening its private workspace.");
    expect(workspace).toContain("useEffect(() => {");
    expect(workspace).toContain("setActiveDraftId((current) => current === nextDraftId ? current : nextDraftId)");
    expect(workspace).toContain("onClick={() => openDraft(draft.id)}");
    expect(workspace).toContain('navigate("/creator/collections")');
  });
});
