import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("creator album assignment contracts", () => {
  it("uses only the existing owner-scoped legacy album list in Register and both Edit Work surfaces", () => {
    const register = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const drawer = read("client/src/components/CreativeDrawer.tsx");
    const chapel = read("client/src/components/EditChapel.tsx");

    for (const surface of [register, drawer, chapel]) {
      expect(surface).toContain("trpc.collectionStudio.listMine.useQuery");
      expect(surface).toContain("No album — keep this Work unassigned");
      expect(surface).toContain("collectionId");
    }
    expect(register).toContain("Living Nexus Collection placement");
    expect(drawer).toContain("Album placement");
    expect(chapel).toContain("Album placement");
    expect(register).toContain("does not change this Work’s WID, signature, dates, or publication state");
  });

  it("refreshes album options after a save and resynchronizes Edit Chapel with the canonical Work", () => {
    const register = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const drawer = read("client/src/components/CreativeDrawer.tsx");
    const chapel = read("client/src/components/EditChapel.tsx");

    expect(register).toContain("void utils.collectionStudio.listMine.invalidate();");
    expect(register).toContain("void utils.songs.mySongs.invalidate();");
    expect(drawer).toContain("utils.collectionStudio.listMine.invalidate();");
    expect(chapel).toContain("snapshotFromChapelSong(song)");
    expect(chapel).toContain("setCollectionId(incoming.collectionId)");
    expect(chapel).toContain("switchedWork");
    expect(chapel).toContain("syncedSnapshotRef");
  });

  it("validates selected albums against the authenticated creator and reuses existing link/unlink helpers", () => {
    const router = read("server/routers/songs.ts");
    const upload = router.slice(router.indexOf("upload: protectedProcedure"), router.indexOf("updateMetadata: protectedProcedure"));
    const metadata = router.slice(router.indexOf("updateMetadata: protectedProcedure"), router.indexOf("// Legacy play counter"));

    expect(upload).toContain("collectionId: z.number().int().positive().nullable().optional()");
    expect(upload).toContain("collection.creatorId !== ctx.user.id");
    expect(upload).toContain("addToCollectionById(input.collectionId, songId, ctx.user.id)");
    expect(metadata).toContain("collectionId: z.number().int().positive().nullable().optional()");
    expect(metadata).toContain("collection.creatorId !== ctx.user.id");
    expect(metadata).toContain("removeFromCollectionById(existing.collectionId, songId, ctx.user.id)");
    expect(metadata).toContain("addToCollectionById(collectionId, songId, ctx.user.id)");
  });

  it("keeps album counts truthful and allows Studio to open empty owner albums", () => {
    const songsDb = read("server/db/songs.ts");
    const studio = read("server/routers/collectionStudio.ts");
    expect(songsDb).toContain("The Work could not be attached to this album.");
    expect(songsDb).toContain("affectedRows");
    expect(studio).toContain("getCollectionById");
    expect(studio).toContain("col.creatorId !== callerId");
    expect(studio).not.toContain("getCollectionsByCreator(callerId)");
  });

  it("keeps creator dates and Work discussion visible after publication", () => {
    const register = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const chapel = read("client/src/components/EditChapel.tsx");
    const work = read("client/src/pages/SongDetailPage.tsx");
    const prepared = read("shared/preparedWorkRegistration.ts");
    expect(register).toContain("creatorReleaseDate");
    expect(prepared).toContain("creatorReleaseDate");
    expect(chapel).toContain("song.creatorReleaseDate ? song.creatorReleaseDate.slice(0, 10) : \"\"");
    expect(work).toContain("comments.length");
    expect(work).toContain('color: "var(--ln-iron)"');
  });

  it("requires explicit creator context and rights confirmation, then records authorization and revocation events", () => {
    const router = read("server/routers/songs.ts");
    const edit = read("client/src/components/EditChapel.tsx");
    const schema = read("drizzle/schema.ts");
    expect(router).toContain("EXTERNAL_DISPLAY_AUTHORIZED");
    expect(router).toContain("EXTERNAL_DISPLAY_REVOKED");
    expect(router).toContain("at least 20 characters");
    expect(router).toContain("rights necessary to authorize this Work");
    expect(router).toContain('platformScope: "approved_display_surfaces"');
    expect(router).toContain("mediaDistribution: false");
    expect(edit).toContain("Authorize external display for this Work");
    expect(edit).toContain("I confirm I have the rights necessary");
    expect(edit).toContain("Media distribution and monetization require separate authorization");
    expect(schema).toContain("externalDisplayAuthorizedAt");
    expect(schema).toContain("externalDisplayRightsConfirmed");
  });

  it("keeps collection placement out of the WID serializer and out of public provenance writing", () => {
    const prepared = read("shared/preparedWorkRegistration.ts");
    const router = read("server/routers/songs.ts");
    const metadata = router.slice(router.indexOf("updateMetadata: protectedProcedure"), router.indexOf("// Legacy play counter"));

    const serializer = prepared.slice(prepared.indexOf("serializePreparedWorkWidPayload"), prepared.indexOf("PreparedWorkUploadContext"));
    expect(serializer).not.toContain("collectionId");
    expect(metadata).toContain("if (dateChanges.length > 0)");
    expect(metadata).toContain('eventType: "creator_historical_dates_revised"');
  });

  it("refreshes owner Work and album projections after registration or edits without overwriting dirty forms", () => {
    const register = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");
    const drawer = read("client/src/components/CreativeDrawer.tsx");
    const chapel = read("client/src/components/EditChapel.tsx");

    expect(register).toContain("utils.collectionStudio.listMine.invalidate()");
    expect(register).toContain("utils.songs.mySongs.invalidate()");
    expect(register).toContain("utils.collectionStudio.getCollection.invalidate()");
    for (const surface of [drawer, chapel]) {
      expect(surface).toContain("utils.collectionStudio.listMine.invalidate()");
      expect(surface).toContain("utils.songs.getCollectionTracks.invalidate()");
      expect(surface).toContain("markCurrentFormSaved()");
      expect(surface).toContain("switchedWork");
      expect(surface).toContain("incomingChanged");
    }
  });
});
