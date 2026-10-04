import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PNAWorkspaceRail } from "../../client/src/components/pna/PNAWorkspaceRail";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.resolve(root, relativePath), "utf8");
const noop = vi.fn();

describe("PNA workspace foundations", () => {
  it("uses the owner-scoped thread list in the command palette without adding a new authority surface", () => {
    const shell = read("client/src/pages/PNAShellPage.tsx");
    const palette = read("client/src/components/pna/PNACommandPalette.tsx");

    expect(shell).toContain("trpc.pnaThread.list.useQuery");
    expect(shell).toContain("utils.pnaThread.list.invalidate");
    expect(shell).toContain("PNACommandPalette");
    expect(palette).toContain("CommandDialog");
    expect(palette).toContain("Private thread history");
    expect(palette).toContain("Stewardship profiles");
    expect(palette).toContain("Inspect context and sources");
    expect(palette).not.toContain("setPublished");
    expect(palette).not.toContain("insertWid");
  });

  it("keeps inspection sources read-only and private artifacts behind explicit Quiver preservation", () => {
    const rail = read("client/src/components/pna/PNAWorkspaceRail.tsx");

    expect(rail).toContain("NexusContextPanel");
    expect(rail).toContain("PNAVisualProposalCard");
    expect(rail).toContain("Active sources");
    expect(rail).toContain("A private artifact is not a Work, WID, or publication.");
    expect(rail).toContain("No source is attached to this private thread.");
    expect(rail).not.toContain("mutateAsync");
    expect(rail).not.toContain("setPublished");
  });

  it("renders explicit empty context and private artifact states", () => {
    const contextHtml = renderToStaticMarkup(createElement(PNAWorkspaceRail, {
      mobile: true,
      surface: "context",
      onSurfaceChange: noop,
      context: null,
      suggestion: null,
      nowPlaying: null,
      artifacts: [],
      onOpenNowPlaying: noop,
      onCloseContext: noop,
      onOpenContextReference: noop,
      onVerifyContext: noop,
      onPlayContext: noop,
      onSaveArtifact: noop,
      onOpenQuiver: noop,
    }));

    const artifactsHtml = renderToStaticMarkup(createElement(PNAWorkspaceRail, {
      mobile: true,
      surface: "artifacts",
      onSurfaceChange: noop,
      context: null,
      suggestion: null,
      nowPlaying: null,
      artifacts: [{
        id: "proposal-1",
        createdAt: new Date("2026-10-03T00:00:00.000Z"),
        mode: "vision",
        proposal: { url: "https://example.test/private-proposal.png", prompt: "A private cover-art proposal" },
      }],
      onOpenNowPlaying: noop,
      onCloseContext: noop,
      onOpenContextReference: noop,
      onVerifyContext: noop,
      onPlayContext: noop,
      onSaveArtifact: noop,
      onOpenQuiver: noop,
    }));

    expect(contextHtml).toContain("No source is attached to this private thread.");
    expect(contextHtml).toContain("OPEN NOW-PLAYING CONTEXT");
    expect(artifactsHtml).toContain("PRIVATE VISUAL PROPOSAL");
    expect(artifactsHtml).toContain("SAVE TO QUIVER PRIVATELY");
  });

  it("defines a mobile conversation, context, and artifacts switch without a squeezed desktop rail", () => {
    const shell = read("client/src/pages/PNAShellPage.tsx");

    expect(shell).toContain("const mobileSurfaceNavigation");
    expect(shell).toContain('["conversation", "Conversation", Sparkles]');
    expect(shell).toContain('["context", "Context", Layers]');
    expect(shell).toContain('["artifacts", "Artifacts", Image]');
    expect(shell).toContain("xl:hidden");
    expect(shell).toContain("min-h-11");
  });
});
