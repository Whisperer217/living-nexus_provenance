import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("public Work share surface contract", () => {
  it("renders WID share cards from the current public projection rather than a stale HTML artifact cache", () => {
    const shareRoute = source("server/routes/shareRoute.ts");

    expect(shareRoute).toContain('import { getPublicSongByWitnessId } from "../utils/db";');
    expect(shareRoute).toContain('publicWork.state !== "resolved"');
    expect(shareRoute).toContain("/api/og/image/song/${song.id}");
    expect(shareRoute).not.toContain("shareArtifacts.htmlSnapshot");
    expect(shareRoute).not.toContain("X-Share-Cache");
  });

  it("uses the rendered provenance card and existing public embed route for oEmbed", () => {
    const oembedRoute = source("server/routes/oembedRoute.ts");

    expect(oembedRoute).toContain("getPublicSongByWitnessId");
    expect(oembedRoute).toContain("/api/og/image/song/${song.id}");
    expect(oembedRoute).toContain("/embed/song/${song.id}");
    expect(oembedRoute).toContain("/embed/song/${songId}");
  });

  it("shares WID-first public URLs from support and every player share control", () => {
    const player = source("client/src/components/player/GlobalPlayer.tsx");
    const supportDrawer = source("client/src/components/SupportCreatorDrawer.tsx");

    expect(player).toContain("const canonicalSharePath = visTrack?.witnessId");
    expect(player).toContain("/share/${encodeURIComponent(visTrack.witnessId)}");
    expect(player).toContain("${window.location.origin}${canonicalSharePath}");
    expect(supportDrawer).toContain("target.songWid");
    expect(supportDrawer).toContain("/share/${encodeURIComponent(target.songWid)}");
  });

  it("keeps expanded player identity and controls on a deliberate contrast floor", () => {
    const player = source("client/src/components/player/GlobalPlayer.tsx");
    const css = source("client/src/index.css");

    expect(player).toContain('className="ln-global-player"');
    expect(player).toContain('data-expanded={isExpanded ? "true" : "false"}');
    expect(css).toContain('.ln-global-player[data-expanded="true"]');
    expect(css).toContain("Global Player contrast floor");
  });
});
