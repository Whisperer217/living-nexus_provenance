import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function between(sourceText: string, start: string, end: string) {
  const startIndex = sourceText.indexOf(start);
  const endIndex = sourceText.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return sourceText.slice(startIndex, endIndex);
}

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

  it("opens the existing Songs list at the bottom of the expanded player and retains direct Work actions", () => {
    const player = source("client/src/components/player/GlobalPlayer.tsx");
    const queue = source("client/src/components/player/PlayerQueuePanel.tsx");

    expect(player).toContain('setZone("EXPANDED")');
    expect(player).toContain("const queueSectionRef = useRef<HTMLDivElement>(null);");
    expect(player).toContain("function scrollPlayerSectionIntoView");
    expect(player).toContain("scrollPlayerSectionIntoView(queueSectionRef)");
    expect(player).toContain('behavior: reduceMotion ? "auto" : "smooth"');
    expect(player).toContain("<div ref={queueSectionRef} tabIndex={-1}>");
    expect(player).toContain('id="player-action-dock"');
    expect(player).toContain("const actionMenuDockRef = useRef<HTMLElement>(null);");
    expect(player).toContain("const [queueListRequest, setQueueListRequest] = useState(0);");
    expect(player).toContain("openListRequest={queueListRequest}");
    expect(player).toContain("View Songs");
    expect(player).toContain("const expandedLayoutActive = zone === \"EXPANDED\"");
    expect(player).toContain("if (expandedLayoutActive) {");
    expect(player).toContain("showContextMenu && contextMenuPos && !expandedLayoutActive");
    expect(queue).toContain("openListRequest?: number;");
    expect(queue).toContain('if (openListRequest > 0) setMode("list");');
    expect(queue).toContain('aria-label="Songs in the current queue"');
    expect(player).not.toContain('setShowContextMenu(false); navigate("/archive");');
    expect(player).toContain("Go to Song");
    expect(player).toContain("View Creator");
    expect(player).toContain("Share Artifact");
    expect(player).toContain("Add to My List");
    expect(player).toContain("Play Next");
    expect(player).toContain("triggerTaggedDownload");
  });

  it("offers the Provenance Player only as a separate-tab experimental companion without changing Living Nexus playback", () => {
    const player = source("client/src/components/player/GlobalPlayer.tsx");
    const dock = between(player, "const expandedActionDock", "/* ── Desktop:");
    const mobileExpandedContent = between(player, "{/* ── EXPANDED CONTENT ── */}", "{/* Provenance strip */}");
    const companion = between(dock, 'href={PROVENANCE_PLAYER_URL}', "</a>");
    const mobileCompanion = between(mobileExpandedContent, 'href={PROVENANCE_PLAYER_URL}', "</a>");

    expect(player).toContain('const PROVENANCE_PLAYER_URL = "https://provenanceplayer.netlify.app/#/home";');
    expect(companion).toContain('target="_blank"');
    expect(companion).toContain('rel="noopener noreferrer"');
    expect(companion).toContain("Open Provenance Player");
    expect(dock).toContain("Experimental companion");
    expect(dock).toContain("no Living Nexus account sync, WID verification, or shared playback");
    expect(companion).not.toMatch(/onClick|navigate|togglePlay|playTrack|playQueueAt|appendToQueue|playNext|setZone|setCinematic/);
    expect(mobileExpandedContent).toContain("!isDesktop && (");
    expect(mobileExpandedContent).toContain("ln-mobile-player-companion");
    expect(mobileExpandedContent).toContain("Experimental companion");
    expect(mobileCompanion).toContain('target="_blank"');
    expect(mobileCompanion).toContain('rel="noopener noreferrer"');
    expect(mobileCompanion).not.toMatch(/onClick|navigate|togglePlay|playTrack|playQueueAt|appendToQueue|playNext|setZone|setCinematic/);
  });
});
