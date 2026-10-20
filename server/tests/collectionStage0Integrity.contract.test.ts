import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

function between(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return source.slice(startIndex, endIndex === -1 ? source.length : endIndex);
}

describe("Stage 0 WID-ALB confidentiality and origin-seal integrity", () => {
  it("uses one pure historical sorted-WID seal evaluator and never rewrites its stored evidence", () => {
    const seal = read("server/domains/collections/collectionCompositionSeal.ts");
    expect(seal).toContain('[...witnessIds].sort().join("|")');
    expect(seal).toContain('createHash("sha256")');
    expect(seal).toContain("collectionWidFromCollectiveHash");
    expect(seal).not.toContain(".update(collections)");
    expect(seal).not.toContain("createCollection");
  });

  it("does not disclose private or unlisted WID-album membership through public reads", () => {
    const router = read("server/routers/songs.ts");
    const publicAlbum = between(router, "getPublicAlbum: publicProcedure", "copyProvenancePlayerAlbumManifest:");
    const publicTracks = between(router, "getCollectionTracks: publicProcedure", "// ── Update Collection Cover Position");
    const publicCreatorCollections = between(router, "getCollectionsByCreator: publicProcedure", "getCollectionTracks: publicProcedure");

    expect(publicAlbum).toContain('collection.visibility !== "public"');
    expect(publicAlbum).toContain("collectionCompositionSealMatches(collection, currentMembership)");
    expect(publicAlbum).toContain("getPublicSongsByCollectionId(collection.id)");
    expect(publicTracks).toContain("collection.creatorId === ctx.user?.id");
    expect(publicTracks).toContain('collection.visibility !== "public"');
    expect(publicTracks).toContain("getPublicSongsByCollectionId(input.collectionId)");
    expect(publicCreatorCollections).toContain("getPublicCollectionsByCreator(input.creatorId)");

    const db = read("server/utils/db.ts");
    const publicSongReader = between(db, "getPublicSongsByCollectionId", "getProvenancePlayerAlbumTrackSources");
    const publicCollectionReader = between(db, "getPublicCollectionsByCreator", "updateCollectionCover");
    expect(publicSongReader).toContain("eq(songs.isPublic, true)");
    expect(publicSongReader).toContain('eq(songs.status, "Published")');
    expect(publicSongReader).toContain("eq(songs.isFlagged, false)");
    expect(publicCollectionReader).toContain('eq(collections.visibility, "public")');
  });

  it("fails closed before verification, certificate overwrite, companion export, and album ZIP streaming on seal mismatch", () => {
    const router = read("server/routers/songs.ts");
    const verify = between(router, "verifyCollection: publicProcedure", "getCollectionForSong:");
    const certificate = between(router, "generateCollectionCertificate:", "getMyCollections:");
    const manifest = between(router, "copyProvenancePlayerAlbumManifest:", "  });");
    const download = between(
      read("server/routes/downloadRoute.ts"),
      'downloadRouter.get("/api/download/album/:collectionWid"',
      "// ── APK Download Route",
    );

    for (const scope of [verify, certificate]) {
      expect(scope).toContain("collectionCompositionSealMatches(collection, tracks)");
      expect(scope).toContain('code: "CONFLICT"');
      expect(scope).toContain("Collection composition cannot be verified.");
    }
    expect(certificate.indexOf("collectionCompositionSealMatches")).toBeLessThan(certificate.indexOf("storagePut("));
    expect(manifest).toContain("collectionCompositionSealMatches(collection, rows.map((row: any) => row.song))");
    expect(manifest).toContain("ProvenancePlayerManifestUnavailableError");
    expect(download).toContain('collection.visibility !== "public"');
    expect(download).toContain("collectionCompositionSealMatches(collection, allTracks)");
    expect(download.indexOf("collectionCompositionSealMatches(collection, allTracks)")).toBeLessThan(download.indexOf("res.setHeader(\"Content-Type\""));
  });

  it("holds only WID-ALB membership changes while retaining presentation and same-member ordering paths", () => {
    const collectionDb = read("server/db/songs.ts");
    const studio = read("server/routers/collectionStudio.ts");
    const songsRouter = read("server/routers/songs.ts");

    for (const helper of ["removeFromCollectionById", "addToCollectionById", "replaceInCollectionById"]) {
      const helperSource = between(collectionDb, `export async function ${helper}`, "\n/**");
      expect(helperSource).toContain("await assertCollectionCompositionMutable(collectionId)");
    }
    const reorder = between(collectionDb, "export async function reorderCollectionTracks", "export async function removeFromCollectionById");
    expect(reorder).not.toContain("assertCollectionCompositionMutable");
    expect(between(studio, "updateMeta: protectedProcedure", "uploadCover:")).not.toContain("requireMutableCollectionComposition");
    expect(between(studio, "removeTrack: protectedProcedure", "getVersionHistory:")).toContain("requireMutableCollectionComposition(input.collectionId)");

    const upload = between(songsRouter, "upload: protectedProcedure", "batchUpload:");
    const metadata = between(songsRouter, "updateMetadata: protectedProcedure", "// Legacy play counter");
    expect(upload.indexOf("requireMutableCollectionComposition(input.collectionId)")).toBeLessThan(upload.indexOf("createSong({"));
    expect(metadata.indexOf("requireMutableCollectionComposition(existing.collectionId)")).toBeLessThan(metadata.indexOf("updateSongMetadata(songId"));
    expect(metadata.indexOf("requireMutableCollectionComposition(collectionId)")).toBeLessThan(metadata.indexOf("updateSongMetadata(songId"));
  });
});

describe("Stage 0 named playlist relationship integrity", () => {
  it("binds removal to both membership row and playlist container", () => {
    const db = read("server/utils/db.ts");
    const router = read("server/routers/playlists.ts");
    const helper = between(db, "export async function removeTrackFromPlaylist", "export class PlaylistMembershipIntegrityError");
    const remove = between(router, "removeTrack: protectedProcedure", "invite: protectedProcedure");

    expect(helper).toContain("and(eq(playlistTracks.id, playlistTrackId), eq(playlistTracks.playlistId, playlistId))");
    expect(remove).toContain("removeTrackFromPlaylist(input.playlistTrackId, input.playlistId)");
    expect(remove).toContain('code: "NOT_FOUND"');
  });

  it("uses exact unique membership IDs, a transaction, and scoped writes for playlist reorder", () => {
    const db = read("server/utils/db.ts");
    const router = read("server/routers/playlists.ts");
    const caller = read("client/src/components/MyListsTab.tsx");
    const helper = between(db, "export async function reorderPlaylistMembership", "export async function getPlaylistCollaborators");
    const reorder = between(router, "reorder: protectedProcedure", "saveVersion: protectedProcedure");
    const policy = read("server/domains/playlists/playlistMembershipIntegrity.ts");

    expect(helper).toContain("await (db as any).transaction");
    expect(helper).toContain("assertExactPlaylistMembershipIds(currentIds, orderedPlaylistTrackIds)");
    expect(helper).toContain("eq(playlistTracks.id, orderedPlaylistTrackIds[position])");
    expect(helper).toContain("eq(playlistTracks.playlistId, playlistId)");
    expect(policy).toContain("new Set(orderedMembershipIds)");
    expect(policy).toContain("currentMembershipIds.length === orderedMembershipIds.length");
    expect(reorder).toContain("orderedPlaylistTrackIds");
    expect(reorder).toContain('code: "CONFLICT"');
    expect(reorder).not.toContain("orderedSongIds");
    expect(caller).toContain("id: t.id");
    expect(caller).toContain("orderedPlaylistTrackIds: reordered.map((t: any) => t.id)");
  });
});
