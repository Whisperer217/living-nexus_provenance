import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const drawerPath = path.resolve(projectRoot, "client/src/components/layout/ContextDrawer.tsx");
const railPath = path.resolve(projectRoot, "client/src/components/layout/LeftRail.tsx");
const layoutPath = path.resolve(projectRoot, "client/src/components/layout/MainLayout.tsx");
const topBarPath = path.resolve(projectRoot, "client/src/components/layout/TopBar.tsx");
const cssPath = path.resolve(projectRoot, "client/src/index.css");
const pnaPath = path.resolve(projectRoot, "client/src/pages/PNAShellPage.tsx");

describe("GPT-style Loop shell", () => {
  it("drives the drawer with open classes, not perma-closed inline transforms", () => {
    const source = fs.readFileSync(drawerPath, "utf8");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(source).toContain("ln-context-drawer--open");
    expect(source).toContain('id="context-drawer"');
    expect(source).toContain("data-context=");
    expect(source).not.toContain("createPortal");
    expect(source).not.toContain('transform: open ? "translateX(0)"');
    expect(source).not.toContain("pointerEvents: open");
    expect(source).toContain("persistDesktopSidebar");

    expect(css).toContain(".ln-context-drawer--open");
    expect(css).toContain("pointer-events: auto");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain("translateX(calc(-100% - 72px))");
  });

  it("opens the desktop sidebar by default and keeps it through navigation", () => {
    const layout = fs.readFileSync(layoutPath, "utf8");
    const rail = fs.readFileSync(railPath, "utf8");

    expect(layout).toContain('window.matchMedia("(min-width: 1024px)").matches');
    expect(layout).toContain('? "home" : null');
    expect(layout).toContain("Desktop GPT sidebar stays open");
    expect(layout).not.toContain("lg:pl-[372px]");
    expect(layout).not.toContain("lg:pt-[56px]");
    expect(rail).toContain('position: "relative"');
    expect(rail).toContain("onRailClick(mode)");
  });

  it("keeps the global player in the main column with content-aware data attributes", () => {
    const topBar = fs.readFileSync(topBarPath, "utf8");
    const pna = fs.readFileSync(pnaPath, "utf8");

    expect(topBar).toContain('id="global-player"');
    expect(topBar).toContain("data-track-id=");
    expect(topBar).toContain("data-provenance-state=");
    expect(topBar).not.toContain('className="fixed top-0 z-[400] flex items-center"');
    expect(pna).toContain('id="chat"');
    expect(pna).toContain('data-role={isUser ? "user" : "assistant"}');
    expect(pna).toContain('data-context="pna"');
    expect(pna).toContain("data-provenance-state=");
  });
});
