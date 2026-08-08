import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (...segments: string[]) =>
  readFileSync(path.resolve(process.cwd(), ...segments), "utf8");

describe("mobile cinematic entry guardrails", () => {
  it("uses a dynamic viewport, a bounded overlay scroll path, and safe-area tokens", () => {
    const splash = projectFile("client", "src", "components", "CinematicSplash.tsx");
    const styles = projectFile("client", "src", "index.css");
    const document = projectFile("client", "index.html");

    expect(splash).toContain('className="ln-cinematic-splash"');
    expect(splash).toContain('minHeight: "100dvh"');
    expect(splash).toContain('overflowY: "auto"');
    expect(styles).toContain(".ln-cinematic-splash");
    expect(styles).toContain("env(safe-area-inset-top, 0px)");
    expect(styles).toContain("env(safe-area-inset-bottom, 0px)");
    expect(document).toContain("viewport-fit=cover");
  });

  it("keeps an immediate, accessible bypass available throughout the cinematic sequence", () => {
    const splash = projectFile("client", "src", "components", "CinematicSplash.tsx");
    const styles = projectFile("client", "src", "index.css");

    expect(splash).toContain("const handleSkip = useCallback");
    expect(splash).toContain('className="ln-cinematic-splash__skip"');
    expect(splash).toContain('aria-label="Skip cinematic introduction and enter the archive"');
    expect(splash).toContain("onClick={handleSkip}");
    expect(styles).toContain(".ln-cinematic-splash__skip");
  });
});
