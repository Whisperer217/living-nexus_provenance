import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Sparkles } from "lucide-react";
import { PNAThreadRail } from "../../client/src/components/pna/PNAThreadRail";
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

  it("uses a thread-first private rail and a single composer profile control", () => {
    const shell = read("client/src/pages/PNAShellPage.tsx");
    const rail = read("client/src/components/pna/PNAThreadRail.tsx");
    const composer = read("client/src/components/pna/PNAComposerBar.tsx");
    const html = renderToStaticMarkup(createElement(PNAThreadRail, {
      threads: [{ id: "thread-1", title: "Armor of Light review", activeMode: "guide", updatedAt: new Date("2026-10-04T00:00:00.000Z") }],
      activeThreadId: "thread-1",
      activeMode: "guide",
      modes: [{ id: "guide", label: "Guide", desc: "Creative direction and intent", icon: Sparkles }],
      contextCount: 1,
      onCreateThread: noop,
      onSelectThread: noop,
      onOpenCommand: noop,
      onNavigate: noop,
    }));

    expect(shell).toContain("PNAThreadRail");
    expect(shell).toContain("PNAComposerBar");
    expect(shell).toContain("mobileRailOpen");
    expect(shell).not.toContain("const modeTabs");
    expect(shell).not.toContain("AVATARS");
    expect(rail).toContain("Quick reference");
    expect(rail).toContain("Recent threads");
    expect(rail).toContain("Private library");
    expect(composer).toContain("Active Stewardship Profile");
    expect(composer).toContain("PNA does not register or publish from this thread.");
    expect(html).toContain("Armor of Light review");
    expect(html).toContain("1 selected source");
  });

  it("uses readable text tiers instead of microtype in the canonical PNA workspace", () => {
    const shell = read("client/src/pages/PNAShellPage.tsx");
    const composer = read("client/src/components/pna/PNAComposerBar.tsx");

    expect(shell).toContain('text-[var(--text-base)]');
    expect(shell).toContain('text-[var(--text-h3)]');
    expect(shell).not.toContain('fontSize: "0.38rem"');
    expect(shell).not.toContain('fontSize: "0.4rem"');
    expect(composer).toContain('text-[var(--text-base)]');
    expect(composer).toContain('fontSize: "var(--text-xs)"');
  });
});
