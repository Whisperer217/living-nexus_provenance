import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("mobile cross-page containment contract", () => {
  it("uses one under-lg header and mini-player safe-area reservation contract", () => {
    const layout = source("client/src/components/layout/MainLayout.tsx");
    const rail = source("client/src/components/layout/LeftRail.tsx");
    const css = source("client/src/index.css");
    const player = source("client/src/components/player/GlobalPlayer.tsx");

    expect(css).toContain("--ln-mobile-header-content-height: 56px");
    expect(css).toContain("--ln-safe-top: env(safe-area-inset-top, 0px)");
    expect(css).toContain("--ln-safe-bottom: max(env(safe-area-inset-bottom, 0px), 8px)");
    expect(css).toContain("--ln-mini-handle-height: 20px");
    expect(css).toContain("--ln-mini-progress-height: 2px");
    expect(css).toContain("--ln-mini-row-height: 52px");
    expect(css).toContain("--bottom-stack: var(--player-safe)");
    expect(css).toContain("--wsp-top: var(--ln-mobile-header-height, 56px)");
    expect(layout).toContain("ln-mobile-header lg:hidden fixed top-0");
    expect(layout).toContain("pt-[var(--ln-mobile-header-height)] lg:pt-[56px]");
    expect(layout).toContain("@media (max-width: 1023px) { .player-scroll-area { padding-bottom: var(--bottom-stack) !important; } }");
    expect(player).toContain("MINI: 74");
    expect(player).toContain("max(${playerHeight}px, var(--player-safe))");
    expect(player).toContain("paddingBottom: 0");
    expect(rail).toContain('id="mobile-nav-rail"');
    expect(rail).toContain('bottom: "var(--bottom-stack)"');
  });

  it("gives Related Works an explicit one-column mobile grid and local width containment", () => {
    const workPage = source("client/src/pages/loop/LoopWorkPage.tsx");

    expect(workPage).toContain("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3");
    expect(workPage).toContain('className="block min-w-0 w-full"');
    expect(workPage).toContain('className="group min-w-0 w-full"');
    expect(workPage).toContain('className="min-w-0 font-mono text-[10px] mt-1 truncate"');
  });

  it("removes list-only randomization from Creator browsing and gives creator cards a mobile action reflow", () => {
    const explore = source("client/src/pages/ExplorePage.tsx");
    const css = source("client/src/index.css");

    expect(explore).toContain('{viewMode === "list" && (');
    expect(explore).toContain("ln-explore-header-controls--creators");
    expect(explore).toContain("ln-creator-card__footer");
    expect(explore).toContain("ln-creator-card__actions");
    expect(css).toContain(".ln-creator-card__footer");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".ln-creator-card__actions .ln-creator-card__domain");
  });

  it("keeps the narrow header within five direct controls and retains collapsed actions in the rail", () => {
    const layout = source("client/src/components/layout/MainLayout.tsx");
    const rail = source("client/src/components/layout/LeftRail.tsx");
    const css = source("client/src/index.css");

    expect(layout).toContain("ln-mobile-header-secondary");
    expect(layout).not.toContain('onClick={() => navigate("/keeper-compose")}');
    expect(layout).toContain("min-h-11 min-w-11");
    expect(rail).toContain("!!user && isMobile && (");
    expect(rail).toContain('handleMobileClick("/keeper-compose", true)');
    expect(css).toContain(".ln-mobile-header-secondary");
    expect(css).toContain(".ln-mobile-wordmark");
  });

  it("moves Creator Domain quick actions below narrow Work rows without changing their authority", () => {
    const organizer = source("client/src/components/creator/SanctuaryWorksOrganizer.tsx");
    const css = source("client/src/index.css");

    expect(organizer).toContain("ln-sanctuary-work-row");
    expect(organizer).toContain("ln-sanctuary-work-actions");
    expect(organizer).toContain("CreatorWorkQuickActions");
    expect(css).toContain("@media (max-width: 479px)");
    expect(css).toContain(".ln-sanctuary-work-row .ln-sanctuary-work-actions");
    expect(css).toContain("flex: 1 0 100%");
  });

  it("applies wrapping only inside dynamic Creator Domain and memorial text surfaces", () => {
    const loopCreator = source("client/src/pages/loop/LoopCreatorPage.tsx");
    const domain = source("client/src/components/domain/DomainRenderer.tsx");
    const memorial = source("client/src/components/creator/LegacyMemorialSection.tsx");

    expect(loopCreator).toContain("break-words text-4xl");
    expect(domain).toContain("break-words text-sm text-white/50");
    expect(memorial).toContain("whitespace-pre-line break-words");
  });
});
