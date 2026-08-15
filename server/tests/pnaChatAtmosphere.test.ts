import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bindNowPlayingContext,
  LS_PNA_CHAT_THEME,
  normalizePnaChatTheme,
  persistPnaChatTheme,
  PNA_AVATARS,
  PNA_CHAT_THEMES,
  pnaAvatarById,
  readPnaChatTheme,
} from "../../client/src/lib/pnaChatAtmosphere";

const projectRoot = process.cwd();
const pnaShellPath = path.resolve(projectRoot, "client/src/pages/PNAShellPage.tsx");
const atmosphereCssPath = path.resolve(projectRoot, "client/src/index.css");
const atmosphereComponentPath = path.resolve(projectRoot, "client/src/components/pna/PnaChatAtmosphere.tsx");

function installLocalStorage() {
  const storage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  };
  return storage;
}

describe("PNA chat atmosphere catalog", () => {
  beforeEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("ships Illuminated Vine free and Ember Stream as a paid stub", () => {
    expect(PNA_CHAT_THEMES.map((theme) => theme.id)).toEqual(["vine", "ember"]);
    expect(PNA_CHAT_THEMES[0]).toMatchObject({ id: "vine", paid: false });
    expect(PNA_CHAT_THEMES[1]).toMatchObject({ id: "ember", paid: true });
    expect(normalizePnaChatTheme("ember")).toBe("ember");
    expect(normalizePnaChatTheme("unknown")).toBe("vine");
  });

  it("persists the chat theme under LS_PNA_CHAT_THEME", () => {
    const storage = installLocalStorage();
    persistPnaChatTheme("ember");
    expect(storage.get(LS_PNA_CHAT_THEME)).toBe("ember");
    expect(readPnaChatTheme()).toBe("ember");
  });

  it("maps each avatar to a capability and stewardship mode", () => {
    expect(PNA_AVATARS.map((avatar) => avatar.id)).toEqual([
      "hooded-scholar",
      "conductor",
      "witness",
      "archivist",
      "cipher",
    ]);
    expect(pnaAvatarById("conductor")).toMatchObject({
      mode: "conductor",
      capability: "Compose · structure · flow",
      locked: true,
    });
    expect(pnaAvatarById("hooded-scholar")?.locked).toBe(false);
  });

  it("binds now-playing into the API payload without inventing provenance", () => {
    const bound = bindNowPlayingContext("Help me with the hook.", {
      title: "Witness Song",
      artist: "Maria",
      wid: "WID-1",
    });
    expect(bound).toContain("Creator message:");
    expect(bound).toContain("Help me with the hook.");
    expect(bound).toContain("Witness Song");
    expect(bound).toContain("WID-1");
    expect(bound).toContain("do not invent provenance");
    expect(bindNowPlayingContext("plain", null)).toBe("plain");
  });
});

describe("PNA chat atmosphere wiring", () => {
  it("wraps the PNA shell chat in the vine/ember field and LN stream seal", () => {
    const source = fs.readFileSync(pnaShellPath, "utf8");
    const css = fs.readFileSync(atmosphereCssPath, "utf8");
    const component = fs.readFileSync(atmosphereComponentPath, "utf8");

    expect(source).toContain("PnaChatAtmosphere");
    expect(source).toContain("PnaStreamSeal");
    expect(source).toContain("bindNowPlayingContext(text, nowPlaying)");
    expect(source).toContain("unlockSkin.mutateAsync");
    expect(source).toContain("PNA_AVATARS");
    expect(source).toContain("PNA_CHAT_THEMES");
    expect(source).toContain('setActiveMode(catalog.mode)');
    expect(source).not.toContain("CHAT_BG_SKINS");
    expect(source).not.toContain("LS_CHAT_BG");
    expect(source).not.toContain("AVATAR_SKINS");

    const activate = source.slice(
      source.indexOf("const handleActivateSkin"),
      source.indexOf("const handleChatTheme"),
    );
    expect(activate).toContain("unlockSkin");
    expect(activate).not.toContain("navigate(\"/keeper\")");

    const send = source.slice(source.indexOf("const handleSend"), source.indexOf("const handleSaveVisualProposal"));
    expect(send).toContain("generateArtwork.mutateAsync({ prompt: text })");
    expect(send).toContain("bindNowPlayingContext(text, nowPlaying)");

    expect(component).toContain("ln-pna-chat--${theme}");
    expect(component).toContain("ln-pna-seal");
    expect(css).toContain(".ln-pna-chat--ember");
    expect(css).toContain(".ln-pna-chat--vine");
    expect(css).toContain(".ln-pna-chat--playing");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".ln-pna-seal__bob");
    const atmosphereCss = css.slice(css.indexOf("PNA CHAT ATMOSPHERE"));
    expect(atmosphereCss.length).toBeGreaterThan(200);
    expect(atmosphereCss).not.toContain("blur(");
    expect(atmosphereCss).not.toContain("filter:");
  });
});
