import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicCreatorCardSchema, publicCreatorIdentitySchema } from "../../shared/publicCreatorProfile";
import { toPublicPlaylistMembership, toPublicWork } from "../utils/db";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const privateKeys = ["email", "openId", "loginMethod", "role", "songSlotsUsed", "stripeAccountId", "stripeCustomerId", "licenseStatus", "publicKey"];

describe("P0 public Creator profile privacy", () => {
  it("keeps private account fields out of both anonymous DTOs", () => {
    const identityKeys = Object.keys(publicCreatorIdentitySchema.shape);
    const cardKeys = Object.keys(publicCreatorCardSchema.shape);
    for (const key of privateKeys) {
      expect(identityKeys).not.toContain(key);
      expect(cardKeys).not.toContain(key);
    }
    expect(identityKeys).toContain("publishedWorkCount");
    expect(cardKeys).toContain("publishedWorkCount");
  });

  it("strips representative private sentinels from an anonymous identity response", () => {
    const parsed = publicCreatorIdentitySchema.parse({
      id: 77,
      name: "Public Creator",
      artistHandle: "public-creator",
      bio: null,
      profilePhotoUrl: null,
      primaryGenre: null,
      originStatement: null,
      activeMediums: null,
      sigilUrl: null,
      founderWid: null,
      publishedWorkCount: 2,
      bannerUrl: null,
      bannerPositionX: null,
      bannerPositionY: null,
      creativeMission: null,
      creativePhilosophy: null,
      creativeDoctrine: null,
      archiveContinuity: null,
      officialArtistName: null,
      localizedName: null,
      labelName: null,
      producerCredits: null,
      dspSpotifyUrl: null,
      dspAppleMusicUrl: null,
      dspTikTokHandle: null,
      website: null,
      location: null,
      twitterHandle: null,
      instagramHandle: null,
      youtubeHandle: null,
      tipsEnabled: false,
      email: "private@example.test",
      openId: "private-open-id",
      role: "admin",
      stripeAccountId: "acct_private",
    });
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("openId");
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("stripeAccountId");
  });

  it("strips private Work storage, signature, moderation, and membership-actor sentinels", () => {
    const work = toPublicWork({
      id: 101,
      title: "Public Work",
      fileUrl: "https://gateway.example.test/stream/101",
      witnessId: "WID-MUS-TEST",
      fileKey: "private/audio/101.mp3",
      ecdsaPrivateKey: "private-key",
      ecdsaSignature: "signature",
      fileHash: "internal-hash",
      isFlagged: false,
      externalDisplayRevokedAt: new Date(),
    });
    const membership = toPublicPlaylistMembership({
      id: 55,
      playlistId: 3,
      songId: 101,
      position: 0,
      addedByUserId: 999,
      addedAt: new Date(),
    });
    for (const forbidden of ["fileKey", "ecdsaPrivateKey", "ecdsaSignature", "fileHash", "isFlagged", "externalDisplayRevokedAt"]) {
      expect(work).not.toHaveProperty(forbidden);
    }
    expect(membership).not.toHaveProperty("addedByUserId");
    expect(work).toMatchObject({ id: 101, title: "Public Work", witnessId: "WID-MUS-TEST" });
    expect(membership).toMatchObject({ id: 55, playlistId: 3, songId: 101, position: 0 });
  });

  it("uses a positive public selection and counts only Published public Works", () => {
    const db = read("server/utils/db.ts");
    const start = db.indexOf("function getPublicCreatorSelections()");
    const end = db.indexOf("/** Bounded creator-handle lookup", start);
    const projection = db.slice(start, end);
    expect(projection).toContain("publicCreatorIdentitySelection");
    expect(projection).toContain("${songs.status} = 'Published'");
    expect(projection).toContain("${songs.isPublic} = true");
    for (const key of privateKeys) expect(projection).not.toContain(`users.${key}`);
  });

  it("provides anonymous safe routes while retaining profile.me as protected", () => {
    const router = read("server/routers/profile.ts");
    const publicRoutes = router.slice(router.indexOf("getById:"), router.indexOf("/** Resolve a creator by artistHandle"));
    expect(publicRoutes).toContain("getPublicById: publicProcedure");
    expect(publicRoutes).toContain("getPublicByHandle: publicProcedure");
    expect(publicRoutes).toContain("getPublicCreatorIdentityById");
    expect(publicRoutes).toContain("getPublicCreatorIdentityByHandle");
    expect(publicRoutes).not.toContain("getUserById(input.userId)");
    expect(router).toContain("me: protectedProcedure");
  });

  it("keeps Creator Mini public and free of roles or operational slots", () => {
    const router = read("server/routers/profile.ts");
    const mini = router.slice(router.indexOf("getCreatorMini:"), router.indexOf("update: protectedProcedure"));
    expect(mini).toContain("getPublicCreatorCardById");
    expect(mini).not.toContain("role:");
    expect(mini).not.toContain("songSlotsUsed");
  });

  it("routes every P0 legacy public creator surface through allowlisted projections", () => {
    const profile = read("server/routers/profile.ts");
    const playlists = read("server/routers/playlists.ts");
    const songs = read("server/routers/songs.ts");
    const collections = read("server/routers/collections.ts");
    const db = read("server/utils/db.ts");
    const creatorDetail = profile.slice(profile.indexOf("getCreator: publicProcedure"), profile.indexOf("generateTagline: publicProcedure"));
    const creatorCollection = profile.slice(profile.indexOf("getCreatorCollection: publicProcedure"));
    const publicAlbum = songs.slice(songs.indexOf("getPublicAlbum: publicProcedure"), songs.indexOf("copyProvenancePlayerAlbumManifest:"));
    const publicPlaylist = playlists.slice(playlists.indexOf("getBySlug: publicProcedure"));
    expect(creatorDetail).toContain("getPublicCreatorIdentityById");
    expect(creatorDetail).not.toContain("getUserById(input.creatorId)");
    expect(creatorCollection).toContain("getPublicCreatorIdentityByHandle");
    expect(creatorCollection).toContain("getPublicCreatorIdentityById");
    expect(creatorCollection).not.toContain("Awaited<ReturnType<typeof getUserById>>");
    expect(publicAlbum).toContain("getPublicCreatorCardById");
    expect(publicAlbum).not.toContain("getUserById(collection.creatorId)");
    expect(publicPlaylist).toContain("getPublicCreatorCardById");
    expect(publicPlaylist).toContain("toPublicCreatorAttribution");
    expect(publicPlaylist).not.toContain("return { playlist, tracks, owner };");
    const publicCollection = collections.slice(collections.indexOf("getBySlug: publicProcedure"), collections.indexOf("listPublic: publicProcedure"));
    expect(publicCollection).toContain("toPublicPlaylistMembership");
    expect(publicCollection).toContain("toPublicWork");
    expect(publicCollection).not.toContain("return { ...row, tracks, following };");
    expect(db).not.toContain("stripeAccountId: users.stripeAccountId, aiDisclosure: users.aiDisclosure");
    expect(db).not.toContain("stripeAccountStatus: users.stripeAccountStatus, role: users.role");
    expect(db).toContain("export function toPublicWork");
    expect(db).toContain("toPublicWork(row.song)");
  });

  it("keeps public directories and search free of account role, licensing, payout, slot, and pin fields", () => {
    const db = read("server/utils/db.ts");
    const directories = db.slice(db.indexOf("export async function getAllCreators"), db.indexOf("// ─── Songs"));
    const search = db.slice(db.indexOf("// ── Creators"), db.indexOf("// ── Songs / Artifacts"));
    for (const forbidden of ["licenseStatus: users.licenseStatus", "songSlotsUsed: users.songSlotsUsed", "stripeAccountStatus: users.stripeAccountStatus", "role: users.role"]) {
      expect(directories).not.toContain(forbidden);
    }
    expect(search).not.toContain("role: users.role");
  });

});
