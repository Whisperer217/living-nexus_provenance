import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const seed = readFileSync(
  resolve(root, "scripts/seed-player-collections-staging.ts"),
  "utf8"
);
const startup = readFileSync(resolve(root, "server/_core/index.ts"), "utf8");
const profile = readFileSync(resolve(root, ".env.staging.example"), "utf8");
const packageJson = readFileSync(resolve(root, "package.json"), "utf8");

describe("isolated Player Collections staging safety", () => {
  it("requires explicit staging and synthetic-seed opt-ins", () => {
    expect(seed).toContain('process.env.NODE_ENV !== "staging"');
    expect(seed).toContain('process.env.LN_STAGING !== "true"');
    expect(seed).toContain('process.env.LN_ALLOW_SYNTHETIC_SEED !== "true"');
    expect(seed).toContain("production");
  });

  it("keeps synthetic records visibly separate from registry identity", () => {
    expect(seed).toContain("LN-STAGING-PLAYER-COLLECTIONS");
    expect(seed).toContain(
      "Synthetic staging Work; no registry WID is assigned."
    );
    expect(seed).not.toContain("insert(wids)");
  });

  it("seeds all three Player Collections relationships idempotently", () => {
    expect(seed).toContain("playerEditions");
    expect(seed).toContain("playerSubmissions");
    expect(seed).toContain("playerCurationEvents");
    expect(seed).toContain("existingSubmission");
    expect(seed).toContain("existingEvent");
  });

  it("disables all in-process workers when explicitly requested", () => {
    expect(startup).toContain('process.env.LN_DISABLE_WORKERS === "true"');
    expect(startup).toContain("Background workers disabled");
    expect(startup).toContain("return;");
  });

  it("documents the isolated staging profile and command", () => {
    expect(profile).toContain("NODE_ENV=staging");
    expect(profile).toContain("LN_DISABLE_WORKERS=true");
    expect(profile).toContain("LN_ALLOW_SYNTHETIC_SEED=true");
    expect(profile).toContain("<staging-host>");
    expect(packageJson).toContain("seed:player-collections:staging");
  });
});
