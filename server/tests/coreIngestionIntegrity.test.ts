import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const batchPagePath = path.resolve(process.cwd(), "client/src/pages/BatchUploadPage.tsx");
const leftRailPath = path.resolve(process.cwd(), "client/src/components/layout/LeftRail.tsx");
const topBarPath = path.resolve(process.cwd(), "client/src/components/layout/TopBar.tsx");
const songsRouterPath = path.resolve(process.cwd(), "server/routers/songs.ts");
const visualWorkerPath = path.resolve(process.cwd(), "server/workers/visualQueue.ts");
const visualSchedulePath = path.resolve(process.cwd(), "server/routes/visualQueueScheduleRoute.ts");

describe("Core ingestion and canonical registration integrity", () => {
  it("keeps the Batch Upload auth gate after hook declarations", () => {
    const source = fs.readFileSync(batchPagePath, "utf8");
    expect(source.indexOf("const updateCard = useCallback")).toBeLessThan(
      source.indexOf("if (!authLoading && !isAuthenticated)")
    );
  });

  it("sends both primary Register controls to canonical /manifest", () => {
    const leftRail = fs.readFileSync(leftRailPath, "utf8");
    const topBar = fs.readFileSync(topBarPath, "utf8");

    expect(leftRail).toContain('navigate("/manifest")');
    expect(leftRail).toContain('getLoginUrl("/manifest")');
    expect(leftRail).not.toContain("useUploadEngine");
    expect(topBar).toContain('goTo("/manifest")');
    expect(topBar).toContain('getLoginUrl("/manifest")');
    expect(topBar).not.toContain("useUploadEngine");
  });

  it("gives supplied single-track lyrics the same WID-LYR persistence as batch", () => {
    const source = fs.readFileSync(songsRouterPath, "utf8");
    const singleStart = source.indexOf("upload: protectedProcedure");
    const batchStart = source.indexOf("batchUpload: protectedProcedure");
    const singleUpload = source.slice(singleStart, batchStart);

    expect(singleUpload).toContain("[Upload] WID-LYR generation failed");
    expect(singleUpload).toContain("updateSongLyricsWithWid(songId, ctx.user.id");
    expect(singleUpload).toContain("WID-LYR-");
  });

  it("uses a scheduler-authenticated worker callback rather than in-process polling", () => {
    const worker = fs.readFileSync(visualWorkerPath, "utf8");
    const schedule = fs.readFileSync(visualSchedulePath, "utf8");

    expect(worker).toContain("export async function processVisualQueueBatch");
    expect(worker).not.toContain("setInterval(() => {");
    expect(schedule).toContain('post("/api/scheduled/visual-queue"');
    expect(schedule).toContain("user.isCron");
    expect(schedule).toContain("processVisualQueueBatch");
  });
});
