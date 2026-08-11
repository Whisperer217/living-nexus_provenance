import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pnaShellPath = path.resolve(process.cwd(), "client/src/pages/PNAShellPage.tsx");

describe("PNA quick actions", () => {
  it("uses each navigation route exactly once and retains Notes & Diaries as the Keeper entry", () => {
    const source = fs.readFileSync(pnaShellPath, "utf8");
    const definition = source.match(/const QUICK_ACTIONS = \[([\s\S]*?)\n\];/);

    expect(definition?.[1]).toBeTruthy();
    const hrefs = [...definition![1].matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);

    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs.filter((href) => href === "/keeper")).toHaveLength(1);
    expect(definition![1]).toContain('label: "Notes & Diaries"');
  });
});
