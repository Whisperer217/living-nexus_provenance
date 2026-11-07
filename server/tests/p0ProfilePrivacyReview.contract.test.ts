import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("P0 profile privacy review visualizer", () => {
  it("is development-only and contains no live tRPC data request", () => {
    const app = read("client/src/App.tsx");
    const page = read("client/src/pages/review/P0ProfilePrivacyReviewPage.tsx");
    expect(app).toContain('import.meta.env.DEV && <Route path="/review/p0-profile-privacy"');
    expect(page).not.toContain("trpc.");
    expect(page).not.toContain("useQuery");
    expect(page).toContain("no live user query");
  });
});
