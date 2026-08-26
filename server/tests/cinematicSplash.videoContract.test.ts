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

  it("keeps the vault visibly composed and the splash hierarchy intentionally scaled", () => {
    expect(styles).toContain("opacity: 1;");
    expect(styles).toContain("var(--ln-void, var(--void)) 22%");
    expect(source).toContain("ln-cinematic-splash__logo-copy");
    expect(source).toContain("clamp(2.15rem, 4.8vw, 3.5rem)");
    expect(source).toContain("ln-cinematic-splash__process-card");
    expect(source).toContain("var(--font-editorial)");
    expect(source).toContain("var(--font-body)");
  });

  it("preserves the vault-first reference composition before manual process entry", () => {
    expect(source).toContain('"awakening" | "frequency" | "vault" | "process"');
    expect(source).toContain('setTimeout(() => setPhase("vault"), 3000)');
    expect(source).toContain('data-phase={phase}');
    expect(source).toContain('className="ln-cinematic-splash__vault-actions"');
    expect(source).toContain('Explore the process');
    expect(source).toContain('{phase === "process" && <div style={{');
    expect(source).toContain('const openProcess = useCallback');
    expect(source).not.toContain('style={{ position: "relative", zIndex: 3 }}');
    expect(styles).toContain('.ln-cinematic-splash[data-phase="vault"]');
    expect(styles).toContain('.ln-cinematic-splash__skip');
    expect(styles).toContain('z-index: 4');
  });

  it("keeps the mobile foreground system compact, transparent, and separate from the film", () => {
    expect(source).toContain('className="ln-cinematic-splash__process-stage"');
    expect(source).toContain('className="ln-cinematic-splash__process-card"');
    expect(source).toContain('className="ln-cinematic-splash__card-title"');
    expect(source).toContain('className="ln-cinematic-splash__card-description"');
    expect(source).toContain('className="ln-cinematic-splash__process-arrow"');
    expect(source).toContain('className="ln-cinematic-splash__archive-entry"');
    expect(styles).toContain('backdrop-filter: blur(18px) saturate(116%)');
    expect(styles).toContain('.ln-cinematic-splash__process-card::before');
    expect(styles).toContain('position: fixed;');
    expect(styles).toContain('env(safe-area-inset-top, 0px) + 0.625rem');
    expect(styles).toContain('.ln-cinematic-splash__card-description');
  });

  it("provides resumable looping entrance audio with explicit mute and volume controls", () => {
    expect(source).toContain('/manus-storage/VaultofGold_68340573.mp3');
    expect(source).toContain('loop preload="auto"');
    expect(source).toContain('localStorage.getItem(SPLASH_AUDIO_POSITION_KEY)');
    expect(source).toContain('localStorage.setItem(SPLASH_AUDIO_POSITION_KEY');
    expect(source).toContain('audio.play()');
    expect(source).toContain('audio.muted = true');
    expect(source).toContain('aria-pressed={muted}');
    expect(source).toContain('aria-label="Entrance volume"');
    expect(source).toContain('className="ln-cinematic-splash__audio"');
    expect(styles).toContain('.ln-cinematic-splash__audio');
    expect(styles).toContain('.ln-cinematic-splash__audio-volume input');
  });
});
