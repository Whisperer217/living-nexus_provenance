import { beforeEach, describe, expect, it } from "vitest";
import {
  applyDocumentTheme,
  hasExplicitStoredTheme,
  normalizeTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  LIGHTS_STORAGE_KEY,
} from "../../client/src/lib/theme-dom";

type RootStub = {
  attributes: Record<string, string>;
  classes: Set<string>;
  setAttribute: (name: string, value: string) => void;
  classList: { add: (name: string) => void; remove: (name: string) => void };
};

function installDocumentStubs() {
  const root: RootStub = {
    attributes: {},
    classes: new Set(),
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    classList: {
      add(name) {
        root.classes.add(name);
      },
      remove(name) {
        root.classes.delete(name);
      },
    },
  };
  const storage = new Map<string, string>();
  const themeMeta = { content: "" };

  (globalThis as any).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  };
  (globalThis as any).document = {
    documentElement: root,
    querySelectorAll: () => [{ setAttribute: (_name: string, value: string) => { themeMeta.content = value; } }],
  };

  return { root, storage, themeMeta };
}

describe("theme DOM adapter", () => {
  beforeEach(() => {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).document;
  });

  it("normalizes legacy aliases without changing named dark themes", () => {
    expect(normalizeTheme("dark")).toBe("cathedral-dark");
    expect(normalizeTheme("cream")).toBe("parchment-cream");
    expect(normalizeTheme("crimson")).toBe("crimson");
    expect(normalizeTheme("illuminated-gold")).toBe("illuminated-gold");
  });

  it("prefers the single ln-theme value and uses Lights Mode only as a legacy cream fallback", () => {
    const { storage } = installDocumentStubs();
    storage.set(LIGHTS_STORAGE_KEY, "on");
    expect(hasExplicitStoredTheme()).toBe(false);
    storage.set(THEME_STORAGE_KEY, "crimson");
    expect(hasExplicitStoredTheme()).toBe(true);
    expect(readStoredTheme()).toBe("crimson");

    storage.delete(THEME_STORAGE_KEY);
    expect(readStoredTheme()).toBe("parchment-cream");
  });

  it("applies cream as light ink-on-paper and retains named dark themes as dark", () => {
    const { root, storage, themeMeta } = installDocumentStubs();
    applyDocumentTheme("parchment-cream");

    expect(root.attributes).toMatchObject({
      "data-theme": "parchment-cream",
      "data-scheme": "light",
    });
    expect(root.classes.has("dark")).toBe(false);
    expect(storage.get(THEME_STORAGE_KEY)).toBe("parchment-cream");
    expect(storage.get(LIGHTS_STORAGE_KEY)).toBe("on");
    expect(themeMeta.content).toBe("#F7F1E6");

    applyDocumentTheme("illuminated-gold");
    expect(root.attributes).toMatchObject({
      "data-theme": "illuminated-gold",
      "data-scheme": "dark",
    });
    expect(root.classes.has("dark")).toBe(true);
    expect(storage.get(THEME_STORAGE_KEY)).toBe("illuminated-gold");
    expect(storage.get(LIGHTS_STORAGE_KEY)).toBe("dim");
    expect(themeMeta.content).toBe("#000000");
  });
});
