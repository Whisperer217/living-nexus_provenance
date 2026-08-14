import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NexusContextPanel } from "../../client/src/components/NexusContextPanel";

describe("ADR-023 Nexus Context Canvas", () => {
  it("renders a source-labelled, read-only now-playing context with only Verify and Play actions", () => {
    const html = renderToStaticMarkup(createElement(NexusContextPanel, {
      context: { version: 1, kind: "now-playing" },
      suggestion: {
        ref: { version: 1, kind: "now-playing" },
        source: "agent-suggestion",
        confidence: "deterministic",
        label: "Current work",
      },
      nowPlaying: {
        id: 42,
        title: "Test Work",
        artist: "Test Creator",
        wid: "WID-MUS-42",
        isPlaying: true,
      },
      onClose: vi.fn(),
      onOpen: vi.fn(),
      onVerify: vi.fn(),
      onPlay: vi.fn(),
    }));

    expect(html).toContain("Context Canvas");
    expect(html).toContain("Agent-suggested · deterministic reference");
    expect(html).toContain("WID-MUS-42");
    expect(html).toContain("Verify WID");
    expect(html).toContain("Pause playback");
    expect(html).not.toContain("Support");
    expect(html).not.toContain("Publish");
    expect(html).not.toContain("Seal");
  });
});
