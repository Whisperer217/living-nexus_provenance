import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_OPERATIONS_ENABLED,
  AI_OPERATIONS_PAUSE_MESSAGE,
  assertAiOperationsEnabled,
} from "../../shared/aiAvailability";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { transcribeAudio } from "../_core/voiceTranscription";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.resolve(root, relativePath), "utf8");

describe("AI operations pause", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses one disabled shared control plane", () => {
    expect(AI_OPERATIONS_ENABLED).toBe(false);
    expect(() => assertAiOperationsEnabled()).toThrow(AI_OPERATIONS_PAUSE_MESSAGE);
  });

  it("rejects LLM and image calls before any provider request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(invokeLLM({ messages: [{ role: "user", content: "hello" }] }))
      .rejects.toThrow(AI_OPERATIONS_PAUSE_MESSAGE);
    await expect(generateImage({ prompt: "a private proposal" }))
      .rejects.toThrow(AI_OPERATIONS_PAUSE_MESSAGE);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a paused result before transcription downloads creator media", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await transcribeAudio({ audioUrl: "https://example.test/private-audio.mp3" });

    expect(result).toMatchObject({
      error: AI_OPERATIONS_PAUSE_MESSAGE,
      code: "SERVICE_PAUSED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps PNA visibly paused and prevents automated AI visual follow-ons", () => {
    const composer = read("client/src/components/pna/PNAComposerBar.tsx");
    const shell = read("client/src/pages/PNAShellPage.tsx");
    const frame = read("client/src/components/pna/PNAServiceFrame.tsx");
    const worker = read("server/workers/visualQueue.ts");

    expect(composer).toContain("PNA is in active construction");
    expect(composer).toContain("isWorkInProgress");
    expect(shell).toContain("if (!AI_OPERATIONS_ENABLED)");
    expect(frame).toContain("WORK IN PROGRESS");
    expect(worker).toContain("AI_OPERATIONS_ENABLED && song.coverArtUrl");
  });
});
