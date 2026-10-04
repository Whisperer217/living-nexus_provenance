import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PNAWorkspaceRail } from "../../client/src/components/pna/PNAWorkspaceRail";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.resolve(root, relativePath), "utf8");
const noop = vi.fn();
const defaultProps = {
  mobile: true,
  onSurfaceChange: noop,
  threadId: "thread-1",
  envelope: null,
  entries: [],
  profile: null,
  context: null,
  suggestion: null,
  nowPlaying: null,
  artifacts: [],
  artifactSources: [],
  actionReceipts: [],
  useReceipts: [],
  useEntries: [],
  onAttachNowPlaying: noop,
  onDetachContext: noop,
  onOpenContextReference: noop,
  onVerifyContext: noop,
  onPlayContext: noop,
  onReviewArtifact: noop,
  onPreserveArtifact: noop,
  onDiscardArtifact: noop,
  onOpenQuiver: noop,
  onOpenStewardshipSettings: noop,
};

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

  it("keeps inspection sources private and Artifact review behind explicit creator decisions", () => {
    const rail = read("client/src/components/pna/PNAWorkspaceRail.tsx");
    const card = read("client/src/components/pna/PNAArtifactReviewCard.tsx");

    expect(rail).toContain("NexusContextPanel");
    expect(rail).toContain("Context Envelope");
    expect(rail).toContain("Route not permitted");
    expect(rail).toContain("A private Artifact is not a Work, Witness ID, testimony, or publication.");
    expect(rail).toContain("No source is attached to this private thread.");
    expect(card).toContain("MARK REVIEWED");
    expect(card).toContain("PRESERVE PRIVATELY");
    expect(card).toContain("No Work, WID, or public page changed.");
    expect(rail).not.toContain("mutateAsync");
    expect(rail).not.toContain("setPublished");
  });

  it("renders explicit Envelope and Artifact review states", () => {
    const contextHtml = renderToStaticMarkup(createElement(PNAWorkspaceRail, {
      ...defaultProps,
      surface: "context",
    }));
    const artifactsHtml = renderToStaticMarkup(createElement(PNAWorkspaceRail, {
      ...defaultProps,
      surface: "artifacts",
      artifacts: [{
        id: "artifact-1",
        createdAt: new Date("2026-10-03T00:00:00.000Z"),
        profileId: "vision",
        kind: "image_proposal",
        title: "Private cover-art proposal",
        summary: "Private visual proposal. Review before preserving it in Quiver.",
        state: "draft",
        payloadJson: { url: "https://example.test/private-proposal.png", prompt: "A private cover-art proposal" },
      }],
    }));

    expect(contextHtml).toContain("No source is attached to this private thread.");
    expect(contextHtml).toContain("ATTACH NOW-PLAYING WORK");
    expect(artifactsHtml).toContain("Private Artifact");
    expect(artifactsHtml).toContain("MARK REVIEWED");
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
