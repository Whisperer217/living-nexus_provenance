import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const drawerPath = path.resolve(projectRoot, "client/src/components/layout/ContextDrawer.tsx");
const railPath = path.resolve(projectRoot, "client/src/components/layout/LeftRail.tsx");
const layoutPath = path.resolve(projectRoot, "client/src/components/layout/MainLayout.tsx");

describe("ContextDrawer open-state visibility", () => {
  it("does not force display:none below lg; open drives transform and pointer-events", () => {
    const source = fs.readFileSync(drawerPath, "utf8");

    expect(source).not.toContain("hidden lg:flex");
    expect(source).toContain('className="flex flex-col"');
    expect(source).toContain('transform: open ? "translateX(0)" : "translateX(calc(-100% - 72px))"');
    expect(source).toContain('pointerEvents: open ? "auto" : "none"');
    expect(source).toContain("opacity: open ? 1 : 0");
    expect(source).toContain('pointerEvents: open ? "auto" : "none"');
    expect(source).toContain("aria-hidden={!open}");
  });

  it("lets the mobile rail open the drawer instead of navigating away", () => {
    const rail = fs.readFileSync(railPath, "utf8");
    const layout = fs.readFileSync(layoutPath, "utf8");

    expect(rail).toContain("onRailClick(mode)");
    expect(rail).not.toContain("navigate(path)");
    expect(rail).not.toContain("openEngine()");
    expect(layout).toContain("setDrawerOpen(false)");
    expect(layout).toContain("<ContextDrawer");
  });
});
