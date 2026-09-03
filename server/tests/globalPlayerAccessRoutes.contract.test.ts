import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("global player normal-zoom access and action-route contract", () => {
  it("does not reserve stale desktop bottom-player space and keeps an expanded player within the visual viewport", () => {
    const layout = source("client/src/components/layout/MainLayout.tsx");
    const player = source("client/src/components/player/GlobalPlayer.tsx");

    expect(layout).not.toContain(".player-scroll-area { padding-bottom: 130px !important; }");
    expect(player).toContain('height: "min(780px, calc(100dvh - 96px))"');
    expect(player).toContain("minHeight: 0,");
  });

  it("uses PlayerContext as the one shuffle and repeat authority in the desktop TopBar", () => {
    const topBar = source("client/src/components/layout/TopBar.tsx");

    expect(topBar).toContain("toggleMute, toggleShuffle, toggleRepeat");
    expect(topBar).toContain("onClick={toggleShuffle}");
    expect(topBar).toContain("onClick={toggleRepeat}");
    expect(topBar).toContain("state.isShuffle");
    expect(topBar).toContain("state.isRepeat");
    expect(topBar).not.toContain("const [shuffle, setShuffle]");
    expect(topBar).not.toContain("const [repeat, setRepeat]");
  });

  it("opens the existing queue and retains direct song, creator, download, list, and share actions", () => {
    const player = source("client/src/components/player/GlobalPlayer.tsx");

    expect(player).toContain('setZone("EXPANDED")');
    expect(player).toContain("const queueSectionRef = useRef<HTMLDivElement>(null);");
    expect(player).toContain("queueSectionRef.current?.scrollIntoView");
    expect(player).toContain("<div ref={queueSectionRef} tabIndex={-1}>");
    expect(player).toContain("View Queue");
    expect(player).not.toContain('setShowContextMenu(false); navigate("/archive");');
    expect(player).toContain("Go to Song");
    expect(player).toContain("View Creator");
    expect(player).toContain("Share Artifact");
    expect(player).toContain("Add to My List");
    expect(player).toContain("Play Next");
    expect(player).toContain("triggerTaggedDownload");
  });
});
