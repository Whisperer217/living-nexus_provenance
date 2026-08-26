import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("client/src/components/CinematicSplash.tsx", "utf-8");
const styles = readFileSync("client/src/index.css", "utf-8");

describe("CinematicSplash entrance video contract", () => {
  it("uses the approved durable asset as a decorative, non-interactive background", () => {
    expect(source).toContain('/manus-storage/dark-gold-vault_1238ee74.mp4');
    expect(source).toContain('aria-hidden="true"');
    expect(styles).toContain(".ln-cinematic-splash__vault-film");
    expect(styles).toContain("pointer-events: none");
    expect(source).toContain("autoPlay");
    expect(source).toContain("loop");
    expect(source).toContain("muted");
    expect(source).toContain("playsInline");
    expect(source).toContain("preload=\"metadata\"");
    expect(source).not.toMatch(/<video[\s\S]*?\bcontrols\b/);
  });

  it("preserves an existing ceremonial fallback for reduced-motion visitors", () => {
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("!prefersReducedMotion && (");
    expect(source).toContain("!prefersReducedMotion && <ParticleField />");
    expect(source).toContain("var(--ln-void");
  });

  it("retains existing exit and keyboard-entry surfaces above the film", () => {
    expect(source).toContain("Skip Intro");
    expect(source).toContain("Enter the Archive");
    expect(source).toContain("aria-label=\"Skip cinematic introduction and enter the archive\"");
    expect(source).toContain("zIndex: 3");
  });
});
