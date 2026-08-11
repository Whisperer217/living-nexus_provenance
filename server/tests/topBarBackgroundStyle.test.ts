import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const topBarPath = path.resolve(process.cwd(), "client/src/components/layout/TopBar.tsx");

describe("TopBar harmonic background style", () => {
  it("uses explicit backgroundColor alongside the optional harmonic backgroundImage", () => {
    const source = fs.readFileSync(topBarPath, "utf8");

    expect(source).toContain("backgroundColor: NAV_BG");
    expect(source).toContain("backgroundImage: harmonicTint");
    expect(source).not.toContain("background: NAV_BG");
    expect(source).toContain("background-color 0.4s ease");
  });
});

