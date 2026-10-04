import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.resolve(root, relativePath), "utf8");

describe("PNA focused service shell", () => {
  it("routes main-domain PNA and the PNA subdomain through one service router", () => {
    const app = read("client/src/App.tsx");

    expect(app).toContain("function PNAServiceRouter()");
    expect(app).toContain("if (isPNASubdomain) {");
    expect(app).toContain("<PNAServiceRouter />");
    expect(app).toContain('<Route path="/pna">');
    expect(app).toContain('<Route path="/settings/stewardship">');
    expect(app).toContain("<MainLayout>");
    expect(app).not.toContain('<Route path="/pna" component={PNAShellPage} />');
    expect(app).not.toContain('<Route path="/settings/stewardship" component={PNASettingsPage} />');
  });

  it("suppresses public-shell overlays and global PNA collisions on focused service routes", () => {
    const app = read("client/src/App.tsx");

    expect(app).toContain("function isPNAServiceLocation(");
    expect(app).toContain("const isPNAService = isPNAServiceLocation(location, hostname);");
    expect(app).toContain("!isSpatialRegistryMock && !isPNAService && <WhatsNewModal />");
    expect(app).toContain("!isSpatialRegistryMock && !isPNAService && <KeeperAvatarWidget />");
    expect(app).toContain("!isSpatialRegistryMock && !isPNAService && <ProvenanceUploadEngine />");
    expect(app).toContain("!isSpatialRegistryMock && !isPNAService && <PWAInstallBanner />");
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
