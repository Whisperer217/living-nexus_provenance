import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LAUNCHER_ITEMS } from "../../client/src/components/layout/launcherDestinations";

describe("Living Nexus launcher destinations", () => {
  it("has unique named tiles and sends every internal link to a declared site route", () => {
    const app = fs.readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(LAUNCHER_ITEMS).toHaveLength(12);
    expect(new Set(LAUNCHER_ITEMS.map(item => item.id)).size).toBe(LAUNCHER_ITEMS.length);
    for (const item of LAUNCHER_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      if (item.destination === "route") {
        const pathname = new URL(item.path!, "https://www.livingnexus.org").pathname;
        expect(app, `${item.label} route ${pathname} must exist`).toContain(`<Route path="${pathname}"`);
      } else if (item.destination === "external") {
        expect(item.path).toMatch(/^https:\/\//);
      } else {
        expect(item.path, `${item.label} must not imply a connected route`).toBeUndefined();
      }
    }
  });

  it("keeps Nexus and messaging visibly unconnected until their services exist", () => {
    for (const id of ["nexus", "messages"]) {
      expect(LAUNCHER_ITEMS.find(item => item.id === id)?.destination).toBe("unavailable");
    }
    expect(LAUNCHER_ITEMS.find(item => item.id === "player")?.destination).toBe("player");
  });

  it("shows only the mobile header below the desktop layout breakpoint", () => {
    const topBar = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/layout/TopBar.tsx"), "utf8");
    const mainLayout = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/layout/MainLayout.tsx"), "utf8");
    expect(topBar).toContain('className="hidden lg:block"');
    expect(mainLayout).toContain('className="lg:hidden fixed top-0');
  });
});
