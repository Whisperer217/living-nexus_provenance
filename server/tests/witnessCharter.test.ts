import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const keeperPath = path.resolve(process.cwd(), "server/routers/keeper.ts");
const doctrinePath = path.resolve(process.cwd(), "docs/AUTHORIZED_AGENT_DOCTRINE.md");

describe("Witness operating charter", () => {
  it("refuses decoration, extraction, and borrowed sacred images", () => {
    const keeper = fs.readFileSync(keeperPath, "utf8");
    const witness = keeper.slice(keeper.indexOf("witness: `"), keeper.indexOf("custodian: `"));

    expect(witness).toContain("not here to decorate the interface");
    expect(witness).toContain("extraction algorithms");
    expect(witness).toContain("stubbornly intact");
    expect(witness).toContain("never exploit, sensationalize, or borrow another creator's sacred images");
    expect(witness).not.toContain("ambulance");
    expect(witness).not.toContain("808");
    expect(witness).not.toContain("E minor");

    const doctrine = fs.readFileSync(doctrinePath, "utf8");
    expect(doctrine).toContain("Witness mode must not decorate, perform, or extract");
  });
});
