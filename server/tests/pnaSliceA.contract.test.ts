import { describe, expect, it } from "vitest";
import type { TrpcContext } from "../_core/context";
import { appRouter } from "../routers/index";

function guestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("ADR-028 Slice A private workspace boundary", () => {
  it("denies a guest before listing a private thread or Quiver asset", async () => {
    const caller = appRouter.createCaller(guestContext());
    await expect(caller.pnaThread.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.quiver.get({ id: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps working threads separate from provenance and publication actions", () => {
    const fs = require("node:fs");
    const router = fs.readFileSync("server/routers/pnaThreads.ts", "utf8");
    const shell = fs.readFileSync("client/src/pages/PNAShellPage.tsx", "utf8");
    const quiver = fs.readFileSync("client/src/components/PNAQuiverWorkspace.tsx", "utf8");

    expect(router).toContain("protectedProcedure");
    expect(router).toContain("visualProposalJson");
    expect(router).not.toContain("insertWid");
    expect(router).not.toContain("setPublished");
    expect(shell).toContain("appendThreadMessage.mutateAsync");
    expect(shell).toContain("PNAQuiverWorkspace");
    expect(quiver).toContain("Nothing here is public by default.");
  });
});
