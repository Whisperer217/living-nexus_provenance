import { describe, expect, it } from "vitest";
import { shouldRenderVisualLab } from "./visualLabGate";

describe("shouldRenderVisualLab", () => {
  it("requires development mode, an explicit flag, and the exact path", () => {
    expect(shouldRenderVisualLab({ dev: true, enabled: "1", pathname: "/dev/visual-lab" })).toBe(true);
    expect(shouldRenderVisualLab({ dev: false, enabled: "1", pathname: "/dev/visual-lab" })).toBe(false);
    expect(shouldRenderVisualLab({ dev: true, enabled: undefined, pathname: "/dev/visual-lab" })).toBe(false);
    expect(shouldRenderVisualLab({ dev: true, enabled: "0", pathname: "/dev/visual-lab" })).toBe(false);
  });

  it("rejects near-match pathnames while leaving query state to the local tool", () => {
    expect(shouldRenderVisualLab({ dev: true, enabled: "1", pathname: "/dev/visual-lab/" })).toBe(false);
    expect(shouldRenderVisualLab({ dev: true, enabled: "1", pathname: "/dev/visual-lab?preview=1" })).toBe(false);
    expect(shouldRenderVisualLab({ dev: true, enabled: "1", pathname: "/dev/visual-laboratory" })).toBe(false);
  });
});
