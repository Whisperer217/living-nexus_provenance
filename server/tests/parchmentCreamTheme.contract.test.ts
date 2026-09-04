import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { THEME_META } from "../../client/src/lib/theme-dom";

const styles = readFileSync("client/src/index.css", "utf-8");
const documentHead = readFileSync("client/index.html", "utf-8");
const switcher = readFileSync("client/src/components/ThemeSwitcher.tsx", "utf-8");
const mainLayout = readFileSync("client/src/components/layout/MainLayout.tsx", "utf-8");
const leftRail = readFileSync("client/src/components/layout/LeftRail.tsx", "utf-8");
const rightRail = readFileSync("client/src/components/layout/RightRail.tsx", "utf-8");
const contextDrawer = readFileSync("client/src/components/layout/ContextDrawer.tsx", "utf-8");
const topBar = readFileSync("client/src/components/layout/TopBar.tsx", "utf-8");
const playlistDrawer = readFileSync("client/src/components/player/PlaylistDrawer.tsx", "utf-8");
const liveActivityPanel = readFileSync("client/src/components/layout/LiveActivityPanel.tsx", "utf-8");

describe("Parchment Cream theme contract", () => {
  it("uses a layered museum parchment palette instead of flat near-white cream", () => {
    expect(styles).toContain('--background:          #F1E5D0');
    expect(styles).toContain('--foreground:          #24170F');
    expect(styles).toContain('--card:                #F8EEDC');
    expect(styles).toContain('--popover:             #FFF7EA');
    expect(styles).toContain('--muted-foreground:    #66513C');
    expect(styles).toContain('--ln-panel:         rgba(255, 247, 234, 0.97)');
    expect(styles).toContain('--ln-panel-border:  rgba(143, 100, 24, 0.28)');
    expect(styles).not.toContain('--background:          #F7F1E6');
    expect(styles).not.toContain('--card:                #FFFCFA');
  });

  it("keeps theme metadata, pre-paint chrome, and picker swatches aligned", () => {
    expect(THEME_META["parchment-cream"]).toMatchObject({
      accent: "#8F6418",
      description: "Warm museum parchment with espresso ink and aged gold",
      scheme: "light",
    });
    expect(documentHead).toContain('light ? "#F1E5D0" : "#000000"');
    expect(switcher).toContain('bg: "#F1E5D0"');
    expect(switcher).toContain('accent: "#8F6418"');
    expect(switcher).toContain('secondary: "#E7D6BA"');
    expect(switcher).toContain('color: "var(--ln-smoke)"');
  });

  it("owns shared app chrome, rails, drawers, and ambient effects through theme tokens", () => {
    expect(styles).toContain("--ln-surface-rail:      rgba(246, 236, 217, 0.98)");
    expect(styles).toContain("--ln-surface-rail-active: #E4CFAB");
    expect(styles).toContain("--ln-surface-field:     rgba(255, 247, 234, 0.72)");
    expect(styles).toContain("--ln-ambient-page:");
    expect(styles).toContain("--ln-ambient-overlay: rgba(58, 40, 26, 0.22)");
    expect(styles).toContain("--ln-breath-hue: 38");

    for (const source of [mainLayout, leftRail, rightRail, contextDrawer, topBar, playlistDrawer, liveActivityPanel]) {
      expect(source).toContain("var(--ln-surface-rail");
    }
    expect(mainLayout).toContain("var(--ln-ambient-page, var(--background))");
    expect(leftRail).toContain("var(--ln-ambient-overlay)");
    expect(contextDrawer).toContain("var(--ln-ambient-shadow)");
    expect(topBar).toContain("var(--ln-surface-rail)");
  });
});
