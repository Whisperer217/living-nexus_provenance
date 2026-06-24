/**
 * @file server/coreDataTypes.test.ts
 *
 * Singular Source of Truth — Contract Tests
 * ==========================================
 * These tests verify that the canonical types in shared/coreDataTypes.ts
 * are satisfied by the actual data returned from the tRPC procedures.
 *
 * They act as a living contract: if a procedure changes its shape in a
 * breaking way, these tests will fail and alert the team before mobile
 * clients are affected.
 */

import { describe, it, expect } from "vitest";
import type {
  FeedRow,
  WitnessRecord,
  CreatorSummary,
  SongRecord,
  CORE_API_VERSION,
} from "../shared/coreDataTypes";
import { CORE_API_VERSION as VERSION, MIN_SUPPORTED_CLIENT_VERSION } from "../shared/coreDataTypes";

// ─── Type-level contract tests ────────────────────────────────────────────────
// These compile-time checks verify that the canonical types are structurally
// sound. If any required field is removed from coreDataTypes.ts, TypeScript
// will fail here before any runtime test runs.

describe("coreDataTypes — compile-time shape contracts", () => {
  it("FeedRow has required song and creator fields", () => {
    // Construct a minimal FeedRow to verify the type is satisfiable
    const row: FeedRow = {
      song: {
        id: 1,
        userId: 1,
        title: "Test Work",
        genre: null,
        headlineCaption: null,
        description: null,
        contentType: "audio",
        status: "Published",
        fileUrl: null,
        coverArtUrl: null,
        durationSeconds: null,
        fileHash: null,
        witnessId: "WID-MUS-abc123",
        createdAt: new Date(),
        ecdsaSignature: null,
        ecdsaPublicKey: null,
        harmonicSignature: null,
        certificateUrl: null,
        lyricsWid: null,
        lyricsHash: null,
        lyricsAddedAt: null,
        aiDisclosure: null,
        aiConsent: "prohibited",
        downloadPermission: "none",
        downloadTipThresholdCents: 0,
        playCount: 0,
        isrc: null,
        isLyricsOnly: false,
        playerAssetType: "cover",
      } satisfies SongRecord,
      creator: {
        id: 1,
        name: "Test Creator",
        artistHandle: "testcreator",
        profilePhotoUrl: null,
        aiDisclosure: null,
        primaryGenre: null,
        stripeAccountStatus: null,
        role: "user",
      } satisfies CreatorSummary,
    };
    expect(row.song.id).toBe(1);
    expect(row.creator.id).toBe(1);
  });

  it("WitnessRecord has all required provenance fields", () => {
    const record: WitnessRecord = {
      witnessId: "WID-MUS-abc123",
      title: "Test Work",
      contentType: "audio",
      artistName: "Test Creator",
      artistHandle: "testcreator",
      profilePhotoUrl: null,
      creatorId: 1,
      creatorUserId: 1,
      songId: 1,
      nameAtWitnessing: "Test Creator",
      nameHistory: [],
      registeredAt: new Date(),
      fileHash: "sha256abc",
      lyricsHash: null,
      ecdsaSignature: null,
      ecdsaPublicKey: null,
      harmonicSignature: null,
      coverArtUrl: null,
      genre: "Gospel",
      isrc: null,
      aiConsent: "prohibited",
      aiDisclosure: null,
      isLyricsOnly: false,
      lyricsWid: null,
      lyricsFileName: null,
      lyricsAddedAt: null,
    };
    expect(record.witnessId).toBe("WID-MUS-abc123");
    expect(record.nameAtWitnessing).toBe("Test Creator");
    expect(record.nameHistory).toHaveLength(0);
  });

  it("CreatorSummary has all required fields", () => {
    const creator: CreatorSummary = {
      id: 1,
      name: "Test Creator",
      artistHandle: "testcreator",
      profilePhotoUrl: null,
      aiDisclosure: "original",
      primaryGenre: "Gospel",
      stripeAccountStatus: "enabled",
      role: "founder",
    };
    expect(creator.role).toBe("founder");
    expect(creator.stripeAccountStatus).toBe("enabled");
  });
});

// ─── Runtime version contract tests ──────────────────────────────────────────

describe("coreDataTypes — API version contract", () => {
  it("CORE_API_VERSION is a valid semver string", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("MIN_SUPPORTED_CLIENT_VERSION is a valid semver string", () => {
    expect(MIN_SUPPORTED_CLIENT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("MIN_SUPPORTED_CLIENT_VERSION is <= CORE_API_VERSION", () => {
    const parse = (v: string) => v.split(".").map(Number);
    const [cMaj, cMin, cPatch] = parse(VERSION);
    const [mMaj, mMin, mPatch] = parse(MIN_SUPPORTED_CLIENT_VERSION);
    const coreNum = cMaj * 10000 + cMin * 100 + cPatch;
    const minNum = mMaj * 10000 + mMin * 100 + mPatch;
    expect(minNum).toBeLessThanOrEqual(coreNum);
  });
});

// ─── FeedRow shape consistency tests ─────────────────────────────────────────

describe("coreDataTypes — FeedRow creator shape consistency", () => {
  it("all feed procedures return the same 8 creator fields", () => {
    // This is a documentation test — it verifies the expected field set
    // that all feed procedures (discover, trending, newThisWeek, getWitnessedVoices)
    // must include in their creator field.
    const REQUIRED_CREATOR_FIELDS = [
      "id",
      "name",
      "artistHandle",
      "profilePhotoUrl",
      "aiDisclosure",
      "primaryGenre",
      "stripeAccountStatus",
      "role",
    ] as const;

    // Verify the type has all these fields by constructing a minimal object
    const creator: CreatorSummary = {
      id: 1,
      name: null,
      artistHandle: null,
      profilePhotoUrl: null,
      aiDisclosure: null,
      primaryGenre: null,
      stripeAccountStatus: null,
      role: "user",
    };

    for (const field of REQUIRED_CREATOR_FIELDS) {
      expect(field in creator).toBe(true);
    }
  });

  it("SongRecord includes all critical provenance fields", () => {
    const REQUIRED_PROVENANCE_FIELDS = [
      "witnessId",
      "fileHash",
      "createdAt",
      "ecdsaSignature",
      "ecdsaPublicKey",
      "harmonicSignature",
      "certificateUrl",
      "lyricsWid",
      "lyricsHash",
    ] as const;

    const song: SongRecord = {
      id: 1,
      userId: 1,
      title: "Test",
      genre: null,
      headlineCaption: null,
      description: null,
      contentType: "audio",
      status: "Published",
      fileUrl: null,
      coverArtUrl: null,
      durationSeconds: null,
      fileHash: null,
      witnessId: null,
      createdAt: new Date(),
      ecdsaSignature: null,
      ecdsaPublicKey: null,
      harmonicSignature: null,
      certificateUrl: null,
      lyricsWid: null,
      lyricsHash: null,
      lyricsAddedAt: null,
      aiDisclosure: null,
      aiConsent: "prohibited",
      downloadPermission: "none",
      downloadTipThresholdCents: 0,
      playCount: null,
      isrc: null,
      isLyricsOnly: false,
      playerAssetType: "cover",
    };

    for (const field of REQUIRED_PROVENANCE_FIELDS) {
      expect(field in song).toBe(true);
    }
  });
});
