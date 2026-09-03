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
      expect(surface).toContain("Album placement");
      expect(surface).toContain("No album — keep this Work unassigned");
      expect(surface).toContain("collectionId");
    }
    expect(register).toContain("does not change this Work’s WID, signature, dates, or publication state");
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

  it("keeps collection placement out of the WID serializer and out of public provenance writing", () => {
    const prepared = read("shared/preparedWorkRegistration.ts");
    const router = read("server/routers/songs.ts");
    const metadata = router.slice(router.indexOf("updateMetadata: protectedProcedure"), router.indexOf("// Legacy play counter"));

    const serializer = prepared.slice(prepared.indexOf("serializePreparedWorkWidPayload"), prepared.indexOf("PreparedWorkUploadContext"));
    expect(serializer).not.toContain("collectionId");
    expect(metadata).toContain("if (dateChanges.length > 0)");
    expect(metadata).toContain('eventType: "creator_historical_dates_revised"');
  });
});
