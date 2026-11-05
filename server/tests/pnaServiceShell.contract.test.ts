import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.resolve(root, relativePath), "utf8");

describe("PNA focused service shell", () => {
  it("retires PNA entry points into the curated player page", () => {
    const app = read("client/src/App.tsx");
    expect(app).not.toContain("<PNAServiceRouter />");
    expect(app).toContain('<Route path="/pna"><Redirect to="/player-collections" /></Route>');
    expect(app).toContain('<Route path="/avatar-registry"><Redirect to="/player-collections" /></Route>');
    expect(app).toContain('<Route path="/player-collections" component={PlayerCollectionsPage} />');
    expect(app).not.toContain("&& <KeeperAvatarWidget />");
    const launcher = read("client/src/components/layout/launcherDestinations.ts");
    expect(launcher).not.toContain('label: "Nexus AI"');
  });

  it("keeps an error boundary and an explicit return path inside the PNA service", () => {
    const frame = read("client/src/components/pna/PNAServiceFrame.tsx");
    const settings = read("client/src/pages/PNASettingsPage.tsx");

    expect(frame).toContain("<ErrorBoundary resetKey={location}>");
    expect(frame).toContain("function pnaReturnHref(search: string)");
    expect(frame).toContain("href={workspaceHref}");
    expect(frame).toContain("Return to workspace");
    expect(frame).toContain("Living Nexus");
    expect(settings).not.toContain("function SettingsSubNav()");
    expect(settings).not.toContain('"Billing"');
    expect(settings).toContain("PNA Stewardship");
  });

  it("leaves PNA governance and Registry/WID authority outside the shell repair", () => {
    const app = read("client/src/App.tsx");
    const frame = read("client/src/components/pna/PNAServiceFrame.tsx");

    expect(app).not.toContain("drizzle-kit");
    expect(frame).not.toContain("insertWid");
    expect(frame).not.toContain("setPublished");
    expect(frame).not.toContain("generateArtwork");
  });
});
