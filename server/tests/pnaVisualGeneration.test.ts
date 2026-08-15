import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const imageService = vi.hoisted(() => ({
  generateImage: vi.fn(),
  PRIMARY_IMAGE_MODEL: "MODEL_GPT_IMAGE_2",
}));
const storage = vi.hoisted(() => ({ storagePut: vi.fn() }));

vi.mock("../_core/imageGeneration", () => imageService);
vi.mock("../utils/storage", () => storage);

import { appRouter } from "../routers/index";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function contextFor(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function creator(id = 42): AuthenticatedUser {
  return {
    id,
    openId: `pna-visual-${id}`,
    email: "creator@example.com",
    name: "Creator",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

describe("PNA private visual generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imageService.generateImage.mockResolvedValue({ url: "https://provider.example/generated.png" });
    storage.storagePut.mockResolvedValue({ url: "https://storage.example/keeper-artwork/42/result.png" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) }));
  });

  it("requires an authenticated creator and persists a generated proposal to protected storage", async () => {
    const caller = appRouter.createCaller(contextFor(creator(42)));
    const result = await caller.keeper.generateArtwork({ prompt: "A gold and midnight-blue cover for a testimony song" });

    expect(imageService.generateImage).toHaveBeenCalledWith({
      prompt: "A gold and midnight-blue cover for a testimony song",
      model: "MODEL_GPT_IMAGE_2",
    });
    expect(storage.storagePut).toHaveBeenCalledWith(
      expect.stringMatching(/^keeper-artwork\/42\//),
      expect.any(Uint8Array),
      "image/png",
    );
    expect(result).toEqual({ url: "https://storage.example/keeper-artwork/42/result.png" });
  });

  it("denies a guest before image generation can run", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.keeper.generateArtwork({ prompt: "Private cover art" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(imageService.generateImage).not.toHaveBeenCalled();
  });

  it("contains a provider failure without creating stored artwork or a Quiver asset", async () => {
    imageService.generateImage.mockRejectedValueOnce(new Error("provider unavailable"));
    const caller = appRouter.createCaller(contextFor(creator(42)));

    await expect(caller.keeper.generateArtwork({ prompt: "Private cover art" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "PNA image generation is temporarily unavailable. Nothing was saved to Quiver. Please retry.",
    });
    expect(storage.storagePut).not.toHaveBeenCalled();
  });

  it("keeps Quiver persistence behind an explicit result-card confirmation", () => {
    const fs = require("node:fs");
    const pnaShell = fs.readFileSync("client/src/pages/PNAShellPage.tsx", "utf8");
    const panel = fs.readFileSync("client/src/components/PNAWorkspacePanel.tsx", "utf8");
    const card = fs.readFileSync("client/src/components/PNAVisualProposalCard.tsx", "utf8");

    for (const source of [pnaShell, panel]) {
      expect(source).toContain('activeMode === "vision"');
      expect(source).toContain("generateArtwork.mutateAsync");
      expect(source).toContain("saveQuiverAsset.mutateAsync");
    }
    expect(card).toContain("SAVE TO QUIVER PRIVATELY");
    expect(card).toContain("Nothing has been attached, registered, or published.");
  });
});
