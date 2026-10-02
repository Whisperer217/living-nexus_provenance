import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isLoopMp3File, LOOP_MP3_QUEUE_LIMIT, prepareLoopMp3Queue } from "@shared/loopMp3Queue";

const root = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const file = (name: string, type = "audio/mpeg") => ({ name, type } as File);

describe("Loop MP3 queue intake", () => {
  it("accepts only an MP3 extension paired with a compatible browser MIME declaration", () => {
    expect(isLoopMp3File(file("work.mp3"))).toBe(true);
    expect(isLoopMp3File(file("work.mp3", ""))).toBe(true);
    expect(isLoopMp3File(file("work.wav", "audio/wav"))).toBe(false);
    expect(isLoopMp3File(file("work.mp3", "audio/wav"))).toBe(false);
  });

  it("caps a browser-memory queue without registering or sealing a Work", () => {
    const selected = Array.from({ length: LOOP_MP3_QUEUE_LIMIT + 2 }, (_, index) => file(`track-${index}.mp3`));
    const selection = prepareLoopMp3Queue(selected);
    expect(selection.accepted).toHaveLength(LOOP_MP3_QUEUE_LIMIT);
    expect(selection.overLimit).toHaveLength(2);
    expect(selection.rejected).toEqual([]);
  });

  it("keeps each queue record inside the existing review and sealing environment", () => {
    const gateway = read("client/src/pages/manifestation-studio/TypeGateway.tsx");
    const studio = read("client/src/pages/manifestation-studio/ManifestationStudio.tsx");
    const music = read("client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx");

    expect(gateway).toContain("MP3 queue");
    expect(gateway).toContain("prepareLoopMp3Queue");
    expect(studio).toContain("onMp3QueueReady");
    expect(studio).toContain("onRegistered");
    expect(music).toContain("MP3 Queue accepts .mp3 audio only");
    expect(music).toContain("Nothing is carried forward automatically.");
    expect(music).toContain('formData.append("loopIntake", "mp3-queue")');
  });

  it("requires server-side source verification when queue intake is marked", () => {
    const uploadRoute = read("server/routes/uploadRoute.ts");
    const verifier = read("server/services/mp3QueueVerification.ts");

    expect(uploadRoute).toContain('name === "loopIntake" && value === "mp3-queue"');
    expect(uploadRoute).toContain("assertLoopMp3QueueSource(sourceBuffer, safeFileName, mimeType)");
    expect(uploadRoute).toContain("ERR_LOOP_MP3_QUEUE_SOURCE");
    expect(verifier).toContain("parseBuffer");
    expect(verifier).toContain("container.includes(\"mpeg\")");
  });
});
