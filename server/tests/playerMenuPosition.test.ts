import { describe, expect, it } from "vitest";
import { placePlayerMenu } from "../../client/src/lib/playerMenuPosition";

describe("global player action menu placement", () => {
  it("opens above a compact player near the bottom edge", () => {
    const menu = placePlayerMenu({ top: 650, bottom: 680, right: 780 }, { width: 800, height: 720 }, 260);
    expect(menu.top).toBe(382);
    expect(menu.maxHeight).toBe(260);
  });

  it("opens below the expanded player's top row when it fits", () => {
    const menu = placePlayerMenu({ top: 150, bottom: 180, right: 780 }, { width: 800, height: 720 }, 260);
    expect(menu.top).toBe(188);
    expect(menu.maxHeight).toBe(260);
  });

  it("keeps all actions scrollable inside a short viewport", () => {
    const menu = placePlayerMenu({ top: 170, bottom: 200, right: 372 }, { width: 390, height: 320 }, 260);
    expect(menu.top).toBeGreaterThanOrEqual(8);
    expect(menu.top + menu.maxHeight).toBeLessThanOrEqual(312);
    expect(menu.maxHeight).toBeLessThan(260);
    expect(menu.right).toBeGreaterThanOrEqual(8);
  });
});
