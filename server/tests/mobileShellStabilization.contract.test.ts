import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("mobile shell stabilization contract", () => {
  it("keeps LeftRail as the single navigation authority while presenting it as a readable drawer", () => {
    const rail = source("client/src/components/layout/LeftRail.tsx");
    const layers = source("client/src/lib/viewportLayers.ts");

    expect(rail).toContain("onMobileNavigate?: (path: string, authRequired?: boolean) => void");
    expect(rail).toContain('top: "var(--ln-mobile-header-height)"');
    expect(rail).toContain('bottom: "var(--bottom-stack)"');
    expect(rail).toContain('width: "min(21rem, calc(100vw - 2.5rem))"');
    expect(rail).toContain("ln-mobile-nav-item flex-row justify-start gap-3 px-4");
    expect(rail).toContain('data-mobile-nav-primary={isMobile ? "true" : undefined}');
    expect(rail).toContain("MOBILE_NAV_DRAWER");
    expect(rail).toContain("MOBILE_NAV_BACKDROP");
    expect(layers).toContain("MOBILE_NAV_BACKDROP: 9_100");
    expect(layers).toContain("MOBILE_NAV_DRAWER: 9_110");
  });

  it("coordinates drawer opening with the existing player without adding an audio owner", () => {
    const layout = source("client/src/components/layout/MainLayout.tsx");
    const player = source("client/src/components/player/GlobalPlayer.tsx");
    const witnessSurfacePlayer = source("client/src/components/player/WitnessSurfacePlayer.tsx");

    expect(layout).toContain('new CustomEvent("ln:player-collapse")');
    expect(layout).toContain('new CustomEvent("ln:close-right-drawers")');
    expect(layout).toContain("overflowY: mobileMenuOpen ? \"hidden\" : \"auto\"");
    expect(layout).toContain("touchAction: mobileMenuOpen ? \"none\" : \"pan-y\"");
    expect(player).toContain("window.visualViewport?.height ?? window.innerHeight");
    expect(player).toContain("visualViewport?.addEventListener(\"resize\", updateAvailableViewportHeight)");
    expect(player).toContain("Math.min(viewportH * 0.82, viewportH - 80, 700)");
    expect(player).toContain("zIndex: Z.GLOBAL_PLAYER");
    expect(player).toContain("zIndex: Z.GLOBAL_PLAYER_BACKDROP");
    expect(witnessSurfacePlayer).toContain("function SurfaceBar() {");
    expect(witnessSurfacePlayer).toContain("return null;");
    expect(player).not.toContain('document.createElement("audio")');
  });

  it("makes Escape and Android Back dismiss the drawer before route navigation", () => {
    const layout = source("client/src/components/layout/MainLayout.tsx");

    expect(layout).toContain("lnMobileMenu: true");
    expect(layout).toContain("window.history.pushState(");
    expect(layout).toContain("window.history.back()");
    expect(layout).toContain('event.key === "Escape" && mobileMenuOpen');
    expect(layout).toContain("window.addEventListener(\"popstate\", onPopState)");
    expect(layout).toContain("handleMobileNavigation");
    expect(layout).toContain("getLoginUrl(path)");
  });
});
