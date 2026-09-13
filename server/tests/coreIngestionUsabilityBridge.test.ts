import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const servicePath = path.resolve(process.cwd(), "server/services/coreIngestion.ts");
const routerPath = path.resolve(process.cwd(), "server/routers/coreIngestion.ts");
const pagePath = path.resolve(process.cwd(), "client/src/pages/CoreIngestionReviewPage.tsx");

function sourceWithoutComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
}

describe("Core Ingestion creator usability bridge", () => {
  it("lists only the authenticated creator’s persisted audio assets with a valid audio storage key", () => {
    const service = sourceWithoutComments(fs.readFileSync(servicePath, "utf8"));
    const section = service.slice(
      service.indexOf("export async function listOwnedCoreIngestionAudioAssets"),
      service.indexOf("async function getOwnedCoreIngestionAudioAsset"),
    );

    expect(section).toContain("eq(songs.userId, creatorId)");
    expect(section).toContain('eq(songs.contentType, "audio")');
    expect(section).toContain("row.fileKey!.startsWith(`audio/${creatorId}/`)");
    expect(section).not.toMatch(/\b(?:db\.update\(songs\)|db\.insert\(songs\)|db\.delete\(songs\))\b/);
  });

  it("starts from a selected owned audio asset only by reusing I1 start and attach boundaries", () => {
    const service = sourceWithoutComments(fs.readFileSync(servicePath, "utf8"));
    const section = service.slice(
      service.indexOf("export async function startCoreIngestionFromOwnedAudioAsset"),
      service.indexOf("export async function attachCoreIngestionAsset"),
    );

    expect(section).toContain("getOwnedCoreIngestionAudioAsset");
    expect(section).toContain("startCoreIngestionCommission");
    expect(section).toContain("attachCoreIngestionAsset");
    expect(section).not.toMatch(/\b(?:createSong|insertWid|addWorkEvent|publish|invokeLLM|processCoreIngestionBatch)\b/);
  });

  it("exposes list and start-from-owned-audio only through protected Core Ingestion procedures", () => {
    const router = sourceWithoutComments(fs.readFileSync(routerPath, "utf8"));

    expect(router).toContain("listOwnedAudioAssets: protectedProcedure");
    expect(router).toContain("startFromOwnedAudioAsset: protectedProcedure");
    expect(router).toContain("sourceSongId: z.number().int().positive()");
    expect(router).not.toContain("listOwnedAudioAssets: publicProcedure");
    expect(router).not.toContain("startFromOwnedAudioAsset: publicProcedure");
  });

  it("presents the asset selection as private preparation and keeps worker activation separate", () => {
    const page = fs.readFileSync(pagePath, "utf8");

    expect(page).toContain("Start from your existing audio");
    expect(page).toContain("Queue private inspection");
    expect(page).toContain("The worker schedule is intentionally inactive");
    expect(page).toContain("It will not alter that Work, create a new Work, issue a WID, publish, or grant AI context.");
    expect(page).not.toContain("createHeartbeatJob");
    expect(page).not.toContain("songs.upload");
  });
});
