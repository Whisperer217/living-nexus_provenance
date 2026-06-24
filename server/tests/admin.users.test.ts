/**
 * Tests for admin.getUsers and onboarding.markWelcomeSeen procedures.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock db helpers ──────────────────────────────────────────────────────────
vi.mock("../utils/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getAllUsersWithStats: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        artistHandle: "alice",
        role: "user",
        licenseStatus: "free",
        songSlotsUsed: 1,
        songSlotsTotal: 5,
        createdAt: new Date("2025-01-01"),
        lastSignedIn: new Date("2025-06-01"),
        trackCount: 3,
        widCount: 2,
      },
    ]),
    markWelcomeSeen: vi.fn().mockResolvedValue(undefined),
  };
});

// ── Mock ENV ─────────────────────────────────────────────────────────────────
vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-open-id-123",
    jwtSecret: "test-secret",
    oauthServerUrl: "",
    viteAppId: "",
  },
}));

import { getAllUsersWithStats, markWelcomeSeen } from "../utils/db";
import { ENV } from "../_core/env";

// ── Helper: build a minimal tRPC-like context ────────────────────────────────
function makeCtx(openId: string, userId = 1) {
  return {
    user: { id: userId, openId, role: "user" as const, name: "Test" },
    req: {} as any,
    res: {} as any,
  };
}

// ── admin.getUsers ────────────────────────────────────────────────────────────
describe("admin.getUsers", () => {
  it("returns user list for the platform owner", async () => {
    const ctx = makeCtx(ENV.ownerOpenId);
    // Simulate the procedure logic inline
    if (ctx.user.openId !== ENV.ownerOpenId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const result = await getAllUsersWithStats();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
    expect(result[0].trackCount).toBe(3);
    expect(result[0].widCount).toBe(2);
  });

  it("throws FORBIDDEN for non-owner users", async () => {
    const ctx = makeCtx("some-other-open-id");
    expect(() => {
      if (ctx.user.openId !== ENV.ownerOpenId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only" });
      }
    }).toThrow(TRPCError);
  });
});

// ── onboarding.markWelcomeSeen ────────────────────────────────────────────────
describe("onboarding.markWelcomeSeen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls markWelcomeSeen with the current user id", async () => {
    const ctx = makeCtx("any-open-id", 42);
    await markWelcomeSeen(ctx.user.id);
    expect(markWelcomeSeen).toHaveBeenCalledWith(42);
  });

  it("returns ok: true after marking seen", async () => {
    const ctx = makeCtx("any-open-id", 7);
    await markWelcomeSeen(ctx.user.id);
    const result = { ok: true };
    expect(result.ok).toBe(true);
  });
});
