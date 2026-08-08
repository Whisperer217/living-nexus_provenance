import { describe, expect, it } from "vitest";
import { ensurePreviewReactBootstrap } from "../_core/vitePreamble";

describe("managed preview React bootstrap", () => {
  it("adds the Vite client and React refresh preamble before the client module", () => {
    const html = '<html><head><title>Living Nexus</title></head><body><script type="module" src="/src/main.tsx"></script></body></html>';
    const result = ensurePreviewReactBootstrap(html);

    expect(result).toContain('src="/@vite/client"');
    expect(result).toContain("__vite_plugin_react_preamble_installed__");
    expect(result.indexOf("__vite_plugin_react_preamble_installed__")).toBeLessThan(result.indexOf('src="/src/main.tsx"'));
  });

  it("does not duplicate an existing plugin-react preamble", () => {
    const html = `<html><head><script>window.__vite_plugin_react_preamble_installed__ = true;</script></head><body></body></html>`;
    const result = ensurePreviewReactBootstrap(html);

    expect(result).toBe(html);
  });
});
