import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const avatarWidgetPath = path.resolve(projectRoot, "client/src/components/KeeperAvatarWidget.tsx");
const pnaShellPath = path.resolve(projectRoot, "client/src/pages/PNAShellPage.tsx");
const keeperPath = path.resolve(projectRoot, "client/src/pages/KeeperPage.tsx");

describe("unified PNA chat surface", () => {
  it("keeps the floating Keeper out of the PNA route and subdomain", () => {
    const source = fs.readFileSync(avatarWidgetPath, "utf8");

    expect(source).toContain('const FLOATING_AVATAR_PATHS = ["/avatar-registry"]');
    expect(source).toContain("if (isPnaSubdomain()) return false;");
    expect(source).toContain('if (location === "/pna" || location.startsWith("/pna/")) return false;');
  });

  it("uses shared site tokens and the Keeper NOTES handoff instead of local chat skins", () => {
    const source = fs.readFileSync(pnaShellPath, "utf8");
    const keeperSource = fs.readFileSync(keeperPath, "utf8");

    expect(source).toContain('const ACCENT = "var(--ln-gold)"');
    expect(source).toContain('const LS_OPEN_NOTES = "ln-keeper-notes-open"');
    expect(source).toContain("const modeTabs = (");
    expect(source).not.toContain("CHAT_BG_SKINS");
    expect(source).not.toContain("LS_CHAT_BG");
    expect(keeperSource).toContain('sessionStorage.getItem("ln-keeper-notes-open") === "1"');
    expect(keeperSource).toContain('setNotesTab("diaries")');
  });
});
