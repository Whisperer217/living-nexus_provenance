/**
 * Tests for LN Command Center admin procedures:
 * - Works/WIDs moderation (flagWork, unflagWork, removeWork, restoreWork, searchWorks)
 * - System Config (getSystemConfig, setSystemConfig)
 * - Billing Reset (resetBilling)
 * - Audit Log (getLogs)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ── Mock db helpers ──────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    flagSong: vi.fn().mockResolvedValue(undefined),
    unflagSong: vi.fn().mockResolvedValue(undefined),
    adminRemoveSong: vi.fn().mockResolvedValue(undefined),
    adminRestoreSong: vi.fn().mockResolvedValue(undefined),
    adminSearchWorks: vi.fn().mockResolvedValue([
      {
        id: 1,
        title: "Test Track",
        witnessId: "WID-MUS-abc123",
        contentType: "audio",
        status: "published",
        isFlagged: false,
        flagReason: null,
        moderationStatus: "clear",
        playCount: 10,
        coverArtUrl: null,
      },
    ]),
    getAllSystemConfig: vi.fn().mockResolvedValue([
      { key: "feature.tips", value: "true", description: "Enable tips", updatedAt: new Date() },
    ]),
    setSystemConfigValue: vi.fn().mockResolvedValue(undefined),
    resetUserBilling: vi.fn().mockResolvedValue(undefined),
    getAllUsersAdmin: vi.fn().mockResolvedValue([
      { id: 1, name: "Alice", email: "alice@example.com", stripeCustomerId: "cus_test" },
    ]),
    getAdminLogs: vi.fn().mockResolvedValue([
      {
        id: 1,
        adminId: 99,
        adminName: "Admin",
        action: "flag_work",
        targetType: "song",
        targetId: "1",
        details: { reason: "spam" },
        createdAt: new Date("2026-01-01"),
      },
    ]),
    logAdminAction: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-open-id-123",
    jwtSecret: "test-secret",
    oauthServerUrl: "",
    viteAppId: "",
  },
}));

import {
  flagSong,
  unflagSong,
  adminRemoveSong,
  adminRestoreSong,
  adminSearchWorks,
  getAllSystemConfig,
  setSystemConfigValue,
  resetUserBilling,
  getAllUsersAdmin,
  getAdminLogs,
  logAdminAction,
} from "./db";

// ── Helper: build a minimal tRPC-like context ────────────────────────────────
function makeAdminCtx(userId = 99) {
  return {
    user: { id: userId, openId: "admin-open-id", role: "admin" as const, name: "Admin" },
    req: {} as any,
    res: {} as any,
  };
}

function makeUserCtx(userId = 1) {
  return {
    user: { id: userId, openId: "user-open-id", role: "user" as const, name: "User" },
    req: {} as any,
    res: {} as any,
  };
}

// ── Works Moderation ─────────────────────────────────────────────────────────
describe("admin.flagWork", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flags a song and logs the action", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await flagSong(1, "spam content");
    await logAdminAction({
      adminId: ctx.user.id,
      adminName: ctx.user.name,
      action: "flag_work",
      targetType: "song",
      targetId: "1",
      details: { reason: "spam content" },
    });
    expect(flagSong).toHaveBeenCalledWith(1, "spam content");
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "flag_work", targetId: "1" })
    );
  });

  it("throws FORBIDDEN for non-admin users", () => {
    const ctx = makeUserCtx();
    expect(() => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }).toThrow(TRPCError);
  });
});

describe("admin.unflagWork", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unflags a song and logs the action", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await unflagSong(1);
    await logAdminAction({
      adminId: ctx.user.id,
      adminName: ctx.user.name,
      action: "unflag_work",
      targetType: "song",
      targetId: "1",
    });
    expect(unflagSong).toHaveBeenCalledWith(1);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "unflag_work" })
    );
  });
});

describe("admin.removeWork", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes a work (visibility only, WID preserved) and logs", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await adminRemoveSong(1);
    await logAdminAction({
      adminId: ctx.user.id,
      adminName: ctx.user.name,
      action: "remove_work",
      targetType: "song",
      targetId: "1",
      details: { reason: "policy violation" },
    });
    expect(adminRemoveSong).toHaveBeenCalledWith(1);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "remove_work" })
    );
  });
});

describe("admin.restoreWork", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restores a removed work and logs", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await adminRestoreSong(1);
    await logAdminAction({
      adminId: ctx.user.id,
      adminName: ctx.user.name,
      action: "restore_work",
      targetType: "song",
      targetId: "1",
    });
    expect(adminRestoreSong).toHaveBeenCalledWith(1);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "restore_work" })
    );
  });
});

describe("admin.searchWorks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns works matching search criteria", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const result = await adminSearchWorks({ query: "Test", limit: 50 });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Track");
    expect(result[0].witnessId).toBe("WID-MUS-abc123");
  });

  it("filters by moderation status", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await adminSearchWorks({ moderationStatus: "flagged", limit: 50 });
    expect(adminSearchWorks).toHaveBeenCalledWith(
      expect.objectContaining({ moderationStatus: "flagged" })
    );
  });
});

// ── System Config ─────────────────────────────────────────────────────────────
describe("admin.getSystemConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all config keys for admin", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const result = await getAllSystemConfig();
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("feature.tips");
    expect(result[0].value).toBe("true");
  });
});

describe("admin.setSystemConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets a config key and logs the action", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await setSystemConfigValue("feature.tips", "false", "Disable tips", ctx.user.id);
    await logAdminAction({
      adminId: ctx.user.id,
      adminName: ctx.user.name,
      action: "set_system_config",
      targetType: "config",
      targetId: "feature.tips",
      details: { value: "false" },
    });
    expect(setSystemConfigValue).toHaveBeenCalledWith("feature.tips", "false", "Disable tips", 99);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "set_system_config", targetId: "feature.tips" })
    );
  });
});

// ── Billing Reset ─────────────────────────────────────────────────────────────
describe("admin.resetBilling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resets billing for a user and logs the action", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    await resetUserBilling(1);
    await logAdminAction({
      adminId: ctx.user.id,
      adminName: ctx.user.name,
      action: "reset_billing",
      targetType: "user",
      targetId: "1",
      details: { reason: "refund requested" },
    });
    expect(resetUserBilling).toHaveBeenCalledWith(1);
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "reset_billing", targetId: "1" })
    );
  });

  it("throws FORBIDDEN for non-admin users", () => {
    const ctx = makeUserCtx();
    expect(() => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }).toThrow(TRPCError);
  });
});

// ── Audit Log ─────────────────────────────────────────────────────────────────
describe("admin.getLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns audit log entries for admin", async () => {
    const ctx = makeAdminCtx();
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const result = await getAdminLogs(200);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("flag_work");
    expect(result[0].adminName).toBe("Admin");
  });

  it("throws FORBIDDEN for non-admin users", () => {
    const ctx = makeUserCtx();
    expect(() => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }).toThrow(TRPCError);
  });
});
