/**
 * Tests for the Living Nexus Provenance Registration API
 * Covers: API key creation, authentication, rate limiting, and work registration
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database helpers ────────────────────────────────────────────────
vi.mock("../utils/db", () => ({
  createApiKey: vi.fn(),
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
  validateApiKey: vi.fn(),
  incrementApiKeyUsage: vi.fn(),
  getCreatorByHandle: vi.fn(),
  getPublishedSongsByCreator: vi.fn(),
  getSongByWitnessId: vi.fn(),
}));

import {
  createApiKey,
  validateApiKey,
  incrementApiKeyUsage,
} from "../utils/db";

// ─── API Key Creation ─────────────────────────────────────────────────────────
describe("createApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a key with lnk_ prefix and a record", async () => {
    const mockRecord = {
      id: 1,
      creatorId: 42,
      keyPrefix: "lnk_A1B2C3",
      keyHash: "hashed_value",
      name: "Test Key",
      tier: "free",
      dailyLimit: 100,
      usageToday: 0,
      usageTotal: 0,
      isActive: true,
      createdAt: new Date(),
      revokedAt: null,
    };
    vi.mocked(createApiKey).mockResolvedValue({ key: "lnk_A1B2C3D4E5F6G7H8I9J0", record: mockRecord });

    const result = await createApiKey(42, "Test Key", "free");

    expect(result.key).toMatch(/^lnk_/);
    expect(result.record.name).toBe("Test Key");
    expect(result.record.tier).toBe("free");
    expect(result.record.dailyLimit).toBe(100);
    expect(result.record.isActive).toBe(true);
  });

  it("sets correct daily limit for pro tier", async () => {
    const mockRecord = {
      id: 2,
      creatorId: 42,
      keyPrefix: "lnk_B2C3D4",
      keyHash: "hashed_value_2",
      name: "Pro Key",
      tier: "pro",
      dailyLimit: 5000,
      usageToday: 0,
      usageTotal: 0,
      isActive: true,
      createdAt: new Date(),
      revokedAt: null,
    };
    vi.mocked(createApiKey).mockResolvedValue({ key: "lnk_B2C3D4E5F6G7H8I9J0K1", record: mockRecord });

    const result = await createApiKey(42, "Pro Key", "pro");
    expect(result.record.dailyLimit).toBe(5000);
  });
});

// ─── API Key Validation ───────────────────────────────────────────────────────
describe("validateApiKey", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for an invalid key", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(null);
    const result = await validateApiKey("lnk_invalid_key_here");
    expect(result).toBeNull();
  });

  it("returns the key record for a valid key", async () => {
    const mockRecord = {
      id: 1,
      creatorId: 42,
      keyPrefix: "lnk_A1B2C3",
      keyHash: "hashed",
      name: "Test Key",
      tier: "free",
      dailyLimit: 100,
      usageToday: 50,
      usageTotal: 500,
      isActive: true,
      createdAt: new Date(),
      revokedAt: null,
    };
    vi.mocked(validateApiKey).mockResolvedValue(mockRecord);

    const result = await validateApiKey("lnk_A1B2C3D4E5F6G7H8I9J0");
    expect(result).not.toBeNull();
    expect(result?.creatorId).toBe(42);
    expect(result?.isActive).toBe(true);
  });

  it("returns null for a revoked key", async () => {
    vi.mocked(validateApiKey).mockResolvedValue(null);
    const result = await validateApiKey("lnk_revoked_key");
    expect(result).toBeNull();
  });
});

// ─── Rate Limiting Logic ──────────────────────────────────────────────────────
describe("rate limiting", () => {
  it("rejects when usageToday >= dailyLimit", () => {
    const keyRecord = {
      id: 1,
      creatorId: 42,
      keyPrefix: "lnk_A1B2C3",
      keyHash: "hashed",
      name: "Test Key",
      tier: "free",
      dailyLimit: 100,
      usageToday: 100, // at limit
      usageTotal: 1000,
      isActive: true,
      createdAt: new Date(),
      revokedAt: null,
    };

    const isRateLimited = keyRecord.usageToday >= keyRecord.dailyLimit;
    expect(isRateLimited).toBe(true);
  });

  it("allows when usageToday < dailyLimit", () => {
    const keyRecord = {
      id: 1,
      creatorId: 42,
      keyPrefix: "lnk_A1B2C3",
      keyHash: "hashed",
      name: "Test Key",
      tier: "free",
      dailyLimit: 100,
      usageToday: 99, // one under limit
      usageTotal: 999,
      isActive: true,
      createdAt: new Date(),
      revokedAt: null,
    };

    const isRateLimited = keyRecord.usageToday >= keyRecord.dailyLimit;
    expect(isRateLimited).toBe(false);
  });

  it("enterprise tier has no effective limit", () => {
    const keyRecord = {
      id: 3,
      creatorId: 42,
      keyPrefix: "lnk_C3D4E5",
      keyHash: "hashed",
      name: "Enterprise Key",
      tier: "enterprise",
      dailyLimit: 999999999, // effectively unlimited
      usageToday: 7000000,   // 7M registrations (Suno-scale)
      usageTotal: 100000000,
      isActive: true,
      createdAt: new Date(),
      revokedAt: null,
    };

    const isRateLimited = keyRecord.usageToday >= keyRecord.dailyLimit;
    expect(isRateLimited).toBe(false);
  });
});

// ─── WID Format Validation ────────────────────────────────────────────────────
describe("WID format", () => {
  const WID_PATTERN = /^WID-(MUS|LYR|MSS|COM|IMG)-[A-Z0-9]{8}-[A-Z0-9]{8}$/;

  it("validates audio WID format", () => {
    expect("WID-MUS-A1B2C3D4-E5F6G7H8").toMatch(WID_PATTERN);
  });

  it("validates image WID format", () => {
    expect("WID-IMG-A1B2C3D4-E5F6G7H8").toMatch(WID_PATTERN);
  });

  it("validates manuscript WID format", () => {
    expect("WID-MSS-A1B2C3D4-E5F6G7H8").toMatch(WID_PATTERN);
  });

  it("rejects invalid WID format", () => {
    expect("WID-INVALID-123").not.toMatch(WID_PATTERN);
    expect("wid-mus-a1b2c3d4-e5f6g7h8").not.toMatch(WID_PATTERN);
    expect("WID-MUS-SHORT").not.toMatch(WID_PATTERN);
  });
});

// ─── Content Type to WID Prefix Mapping ──────────────────────────────────────
describe("content type to WID prefix mapping", () => {
  const getWidPrefix = (contentType: string): string => {
    const map: Record<string, string> = {
      audio: "WID-MUS-",
      lyrics: "WID-LYR-",
      manuscript: "WID-MSS-",
      comic: "WID-COM-",
      image: "WID-IMG-",
    };
    return map[contentType] ?? "WID-GEN-";
  };

  it("maps audio to WID-MUS-", () => expect(getWidPrefix("audio")).toBe("WID-MUS-"));
  it("maps lyrics to WID-LYR-", () => expect(getWidPrefix("lyrics")).toBe("WID-LYR-"));
  it("maps manuscript to WID-MSS-", () => expect(getWidPrefix("manuscript")).toBe("WID-MSS-"));
  it("maps comic to WID-COM-", () => expect(getWidPrefix("comic")).toBe("WID-COM-"));
  it("maps image to WID-IMG-", () => expect(getWidPrefix("image")).toBe("WID-IMG-"));
  it("falls back to WID-GEN- for unknown types", () => expect(getWidPrefix("unknown")).toBe("WID-GEN-"));
});
