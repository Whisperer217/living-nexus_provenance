import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Provenance Player copied-manifest boundary", () => {
  it("keeps individual Work export public-eligible while playlist and album exports remain owner-authorized, ordered where applicable, and fail-closed", () => {
    const playlistRouter = read("server/routers/playlists.ts");
    const songsRouter = read("server/routers/songs.ts");
    const db = read("server/utils/db.ts");

    expect(playlistRouter).toContain("copyProvenancePlayerManifest: protectedProcedure");
    expect(playlistRouter).toContain("playlist.ownerId !== ctx.user.id");
    expect(playlistRouter).toContain("getProvenancePlayerPlaylistTrackSources");
    expect(playlistRouter).toContain("hasAmbiguousProvenancePlayerWids");
    expect(playlistRouter).toContain("Manifest unavailable");

    expect(songsRouter).toContain("copyProvenancePlayerAlbumManifest: protectedProcedure");
    expect(songsRouter).toContain("collection.creatorId !== ctx.user.id");
    expect(songsRouter).toContain('collection.visibility !== "public"');
    expect(songsRouter).toContain("getProvenancePlayerAlbumTrackSources");
    expect(songsRouter).toContain("hasAmbiguousProvenancePlayerWids");
    expect(songsRouter).toContain("copyProvenancePlayerWorkManifest: publicProcedure");
    expect(songsRouter).toContain("getProvenancePlayerTrackSourceById(input.songId)");
    expect(songsRouter).not.toContain("source.song.userId !== ctx.user.id");

    expect(db).toContain("orderBy(asc(playlistTracks.position)");
    expect(db).toContain("orderBy(asc(songs.trackOrder)");
    expect(db).toContain(".limit(501)");
    const playlistManifestReader = db.slice(
      db.indexOf("getProvenancePlayerPlaylistTrackSources"),
      db.indexOf("export async function addTrackToPlaylist"),
    );
    const manifestReaders = db.slice(db.indexOf("getProvenancePlayerAlbumTrackSources"), db.indexOf("hasAmbiguousProvenancePlayerWids"));
    expect(playlistManifestReader).toContain("id: users.id");
    // Album, individual Work, and catalog candidates all supply a non-null
    // Creator identity to the shared adapter. The catalog reader is the same
    // safe source shape reused by remote companion discovery.
    expect(manifestReaders.match(/id: users\.id/g)).toHaveLength(3);
    expect(manifestReaders).toContain("getProvenancePlayerCatalogCandidates");
    expect(manifestReaders).not.toContain("externalDisplayRightsConfirmed");
    expect(manifestReaders).not.toContain("externalDisplayAuthorizedAt");
    expect(manifestReaders).not.toContain("downloadPermission");
  });

  it("ignores only Deleted historical WID rows when checking current manifest identity ambiguity", () => {
    const db = read("server/utils/db.ts");
    const reader = db.slice(db.indexOf("export async function getAmbiguousProvenancePlayerWids"), db.indexOf("/** Get the collection a song belongs"));
    const helper = db.slice(db.indexOf("export async function hasAmbiguousProvenancePlayerWids"), db.indexOf("/** Get the collection a song belongs"));

    expect(reader).toContain('inArray(songs.witnessId, normalized)');
    expect(reader).toContain('ne(songs.status, "Deleted")');
    expect(reader).toContain("return new Set(Array.from(counts.entries())");
    expect(helper).toContain("getAmbiguousProvenancePlayerWids(witnessIds)");
    expect(helper).toContain(".size > 0");
  });

  it("uses a rechecked Living Nexus gateway rather than copied raw storage media", () => {
    const manifest = read("server/domains/provenancePlayer/manifest.ts");
    const mediaRoute = read("server/routes/provenancePlayerMediaRoute.ts");
    const server = read("server/_core/index.ts");

    expect(manifest).toContain("/api/provenance-player/media/${track.id}");
    expect(manifest).toContain("isCleanPublicHttpsUrl(track.fileUrl)");
    expect(manifest).toContain("externalDisplayRevokedAt !== null");
    expect(manifest).not.toContain("externalDisplayRightsConfirmed");
    expect(manifest).not.toContain("externalDisplayAuthorizedAt");
    expect(manifest).not.toContain("track.downloadPermission");
    expect(manifest).not.toContain("audioUrl: track.fileUrl");

    expect(mediaRoute).toContain("buildProvenancePlayerManifest({ tracks:");
    expect(mediaRoute).toContain("hasAmbiguousProvenancePlayerWids");
    expect(mediaRoute).toContain('"Cache-Control": "no-store"');
    expect(mediaRoute).toContain('"Access-Control-Allow-Origin": "*"');
    expect(mediaRoute).toContain('res.redirect(302, source.song.fileUrl');
    expect(mediaRoute).toContain('json({ error: "Media unavailable" })');
    expect(server).toContain("app.use(provenancePlayerMediaRouter)");
  });

  it("wires owner collection surfaces and the public canonical Work surface to copy or download JSON without calling playback", () => {
    const playlists = read("client/src/pages/PlaylistsPage.tsx");
    const album = read("client/src/pages/AlbumDetailPage.tsx");
    const work = read("client/src/pages/loop/LoopWorkPage.tsx");
    const legacyWork = read("client/src/pages/SongDetailPage.tsx");

    for (const source of [playlists, album, work]) {
      expect(source).toContain("copyProvenancePlayerManifest");
      expect(source).toContain("downloadProvenancePlayerManifest");
      expect(source).toContain("Copy manifest");
      expect(source).toContain("Download");
      expect(source).toContain("Add → LN manifest");
    }
    expect(playlists).toContain("utils.playlists.copyProvenancePlayerManifest.fetch");
    expect(album).toContain("utils.songs.copyProvenancePlayerAlbumManifest.fetch");
    expect(work).toContain("utils.songs.copyProvenancePlayerWorkManifest.fetch");
    expect(work).toContain("{wid && (");
    expect(work).not.toContain("{isOwner && wid && (");
    expect(work).toContain("Portable Witness Record");
    expect(legacyWork).not.toContain("copyProvenancePlayerWorkManifest");
    expect(playlists).not.toMatch(/exportProvenancePlayerManifest[\s\S]{0,1200}playQueueAt\(/);
    expect(album).not.toMatch(/exportProvenancePlayerManifest[\s\S]{0,1200}playQueueAt\(/);
    expect(work).not.toMatch(/exportProvenancePlayerManifest[\s\S]{0,1200}playQueueAt\(/);
  });
});
