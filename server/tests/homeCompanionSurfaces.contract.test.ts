import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("client/src/pages/HomePage.tsx", "utf8");

describe("homepage companion surfaces", () => {
  it("exposes the Manifest Theatre and Provenance Player destinations", () => {
    expect(home).toContain("https://fabulous-concha-fe39e4.netlify.app/");
    expect(home).toContain("https://provenanceplayer.netlify.app/#/home");
    expect(home).toContain("Manifest Theatre");
    expect(home).toContain("Provenance Player");
  });

  it("keeps external previews sandboxed and opens full experiences separately", () => {
    expect(home).toContain(
      'sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"'
    );
    expect(home).toContain('loading="lazy"');
    expect(home).toContain('target="_blank"');
    expect(home).toContain('rel="noopener noreferrer"');
  });

  it("does not imply shared Living Nexus authority", () => {
    expect(home).toContain("do not");
    expect(home).toContain("account sync");
    expect(home).toMatch(/WID\s+verification/);
    expect(home).toContain("shared playback");
    expect(home).toContain("Living Nexus remains the registry authority");
  });
});
