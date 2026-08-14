import { describe, expect, it } from "vitest";
import { appRouter } from "../routers/index";
import type { TrpcContext } from "../_core/context";
import {
  CANONICAL_TIP_DOWNLOAD_ORIGIN,
  tipDownloadCheckoutInput,
} from "../services/tipDownloadCheckout";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "tip-download-checkout-user",
      email: "creator@example.com",
      name: "Creator",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("tip-download checkout payment lock", () => {
  it("denies checkout creation without an authenticated Living Nexus user", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.tips.createTipDownloadCheckout({
        songId: 1,
        origin: CANONICAL_TIP_DOWNLOAD_ORIGIN,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("accepts only the canonical Living Nexus checkout return origin", () => {
    expect(
      tipDownloadCheckoutInput.parse({
        songId: 1,
        origin: CANONICAL_TIP_DOWNLOAD_ORIGIN,
      }),
    ).toEqual({ songId: 1, origin: CANONICAL_TIP_DOWNLOAD_ORIGIN });

    expect(() =>
      tipDownloadCheckoutInput.parse({ songId: 1, origin: "https://evil.example" }),
    ).toThrow();
  });

  it("rejects a noncanonical checkout origin before payment or registry work begins", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    await expect(
      caller.tips.createTipDownloadCheckout({
        songId: 1,
        origin: "https://livingnexus.org",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
