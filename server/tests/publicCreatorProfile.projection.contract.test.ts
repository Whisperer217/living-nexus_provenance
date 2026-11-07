import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { publicCreatorCardSchema, publicCreatorIdentitySchema } from "../../shared/publicCreatorProfile";

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
});
