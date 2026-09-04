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

  it("uses browser navigation for the external guest PNA sign-in URL", () => {
    const source = fs.readFileSync(topBarPath, "utf8");

    expect(source).toContain('window.location.assign(getLoginUrl("/pna"))');
    expect(source).not.toContain('goTo(getLoginUrl("/pna"))');
  });

  it("preserves the inline player while removing the competing TopBar search surface", () => {
    const source = fs.readFileSync(topBarPath, "utf8");

    expect(source).toContain("<InlinePlayer />");
    expect(source).toContain("max-w-[920px]");
    expect(source).not.toContain("Search works, creators, WIDs…");
    expect(source).not.toContain("trpc.search.global.useQuery");
  });
});
