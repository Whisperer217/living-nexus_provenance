import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Provenance Player copied-manifest boundary", () => {
  it("keeps the two export procedures owner-authorized, ordered, and fail-closed", () => {
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

    expect(db).toContain("orderBy(asc(playlistTracks.position)");
    expect(db).toContain("orderBy(asc(songs.trackOrder)");
    expect(db).toContain(".limit(501)");
  });

  it("uses a rechecked Living Nexus gateway rather than copied raw storage media", () => {
    const manifest = read("server/domains/provenancePlayer/manifest.ts");
    const mediaRoute = read("server/routes/provenancePlayerMediaRoute.ts");
    const server = read("server/_core/index.ts");

    expect(manifest).toContain("/api/provenance-player/media/${track.id}");
    expect(manifest).toContain("isCleanPublicHttpsUrl(track.fileUrl)");
    expect(manifest).toContain("externalDisplayRevokedAt !== null");
    expect(manifest).toContain('track.downloadPermission !== "free"');
    expect(manifest).not.toContain("audioUrl: track.fileUrl");

    expect(mediaRoute).toContain("buildProvenancePlayerManifest({ tracks:");
    expect(mediaRoute).toContain("hasAmbiguousProvenancePlayerWids");
    expect(mediaRoute).toContain('"Cache-Control": "no-store"');
    expect(mediaRoute).toContain('"Access-Control-Allow-Origin": "*"');
    expect(mediaRoute).toContain('res.redirect(302, source.song.fileUrl');
    expect(mediaRoute).toContain('json({ error: "Media unavailable" })');
    expect(server).toContain("app.use(provenancePlayerMediaRouter)");
  });

  it("wires only owner surfaces to copy or download JSON and never calls playback from those handlers", () => {
    const playlists = read("client/src/pages/PlaylistsPage.tsx");
    const album = read("client/src/pages/AlbumDetailPage.tsx");

    for (const source of [playlists, album]) {
      expect(source).toContain("copyProvenancePlayerManifest");
      expect(source).toContain("downloadProvenancePlayerManifest");
      expect(source).toContain("Copy manifest");
      expect(source).toContain("Download");
      expect(source).toContain("Add → LN manifest");
    }
    expect(playlists).toContain("utils.playlists.copyProvenancePlayerManifest.fetch");
    expect(album).toContain("utils.songs.copyProvenancePlayerAlbumManifest.fetch");
    expect(playlists).not.toMatch(/exportProvenancePlayerManifest[\s\S]{0,1200}playQueueAt\(/);
    expect(album).not.toMatch(/exportProvenancePlayerManifest[\s\S]{0,1200}playQueueAt\(/);
  });
});
