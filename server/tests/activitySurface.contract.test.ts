import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("activity surface contract", () => {
  it("keeps RightRail as the single mounted activity authority", () => {
    const layout = source("client/src/components/layout/MainLayout.tsx");
    const rail = source("client/src/components/layout/RightRail.tsx");

    expect(layout).toContain('import RightRail from "@/components/layout/RightRail"');
    expect(layout).toContain("<RightRail />");
    expect(layout).not.toContain("<LiveActivityPanel");
    expect(rail).toContain('data-activity-surface="right-rail"');
    expect(rail).toContain('aria-label="Signals, connected manifestations, and Witness Registry"');
  });

  it("exposes an accessible rail toggle and preserves the player-stack boundary", () => {
    const rail = source("client/src/components/layout/RightRail.tsx");
    const css = source("client/src/index.css");

    expect(rail).toContain('aria-controls="ln-right-rail-panel"');
    expect(rail).toContain("aria-expanded={isOpen}");
    expect(rail).toContain('bottom: "var(--bottom-stack, 64px)"');
    expect(rail).toContain('overscrollBehavior: "contain"');
    expect(rail).toContain('isolation: "isolate"');
    expect(css).toContain(".ln-activity-surface {");
    expect(css).toContain("scrollbar-gutter: stable;");
    expect(css).toContain(".ln-activity-surface__toggle:focus-visible");
    expect(css).toContain(".ln-activity-surface { transition: none; }");
  });

  it("retains the narrow-viewport containment rule", () => {
    const css = source("client/src/index.css");

    expect(css).toContain("@media (max-width: 1279px)");
    expect(css).toContain(".ln-right-rail-desktop { display: none !important; }");
  });

  it("labels the existing activity categories for assistive technology and future disclosure", () => {
    const rail = source("client/src/components/layout/RightRail.tsx");

    expect(rail).toContain('data-mobile-disclosure="desktop-rail-hidden-below-lg"');
    expect(rail).toContain('data-activity-category={(user ? "signals" : "live-activity") satisfies ActivityCategory}');
    expect(rail).toContain('data-activity-category="manifestations"');
    expect(rail).toContain('data-activity-category="registry"');
    expect(rail).toContain('data-activity-category="recently-witnessed"');
    expect(rail).toContain('aria-labelledby="ln-activity-signals-heading"');
    expect(rail).toContain('aria-labelledby="ln-activity-manifestations-heading"');
    expect(rail).toContain('aria-labelledby="ln-activity-registry-heading"');
    expect(rail).toContain('aria-labelledby="ln-activity-recent-heading"');
  });
});
