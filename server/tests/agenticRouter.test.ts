import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";

const foundation = vi.hoisted(() => ({
  getMusicDraftCapabilityAuthority: vi.fn(),
  setMusicDraftCapabilityAuthority: vi.fn(),
  issueMusicDraftCommission: vi.fn(),
  listMusicDraftCommissions: vi.fn(),
  listAgentLedgerEntries: vi.fn(),
}));

vi.mock("../services/agenticFoundation", () => foundation);

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 42): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `agentic-${userId}`,
    email: "creator@example.com",
    name: "Creator",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("agents music-Draft foundation procedures", () => {
  it("derives authority from the authenticated Creator Domain and forwards only the permitted Draft commission input", async () => {
    foundation.getMusicDraftCapabilityAuthority.mockResolvedValue({ enabled: false });
    foundation.setMusicDraftCapabilityAuthority.mockResolvedValue({ enabled: true, ledgerEntryId: "ledger-1" });
    foundation.issueMusicDraftCommission.mockResolvedValue({ commissionId: "commission-1", songId: 77, status: "active", ledgerEntryId: "ledger-2" });
    foundation.listMusicDraftCommissions.mockResolvedValue([]);
    foundation.listAgentLedgerEntries.mockResolvedValue([]);

    const caller = appRouter.createCaller(createAuthContext(42));
    await caller.agents.musicDraftCapability();
    await caller.agents.setMusicDraftCapability({ enabled: true });
    await caller.agents.issueMusicDraftCommission({ songId: 77, direction: "Prepare an arrangement note." });
    await caller.agents.musicDraftCommissions({ limit: 12 });
    await caller.agents.agentLedger({ limit: 12 });

    expect(foundation.getMusicDraftCapabilityAuthority).toHaveBeenCalledWith(42);
    expect(foundation.setMusicDraftCapabilityAuthority).toHaveBeenCalledWith(42, true);
    expect(foundation.issueMusicDraftCommission).toHaveBeenCalledWith(42, { songId: 77, direction: "Prepare an arrangement note." });
    expect(foundation.listMusicDraftCommissions).toHaveBeenCalledWith(42, 12);
    expect(foundation.listAgentLedgerEntries).toHaveBeenCalledWith(42, 12);
  });

  it("does not expose publish, seal, Bridge, or execution procedures in the first slice", () => {
    const source = require("node:fs").readFileSync("server/routers/agents.ts", "utf8");
    expect(source).toContain("issueMusicDraftCommission");
    expect(source).not.toContain("publish: z.");
    expect(source).not.toContain("publishMusicDraftCommission");
    expect(source).not.toContain("sealMusicDraftCommission");
    expect(source).not.toContain("executeMusicDraftCommission");
    expect(source).not.toContain("musicDraftBridge");
  });
});
