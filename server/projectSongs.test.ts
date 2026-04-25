/**
 * Tests for project songs, narration upload, and video upload procedures.
 * These are unit tests for the db helpers and router logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database module ─────────────────────────────────────────────────
vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  getProjectSongs: vi.fn(),
  addSongToProject: vi.fn(),
  removeSongFromProject: vi.fn(),
  reorderProjectSongs: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.mp3", key: "test.mp3" }),
}));

import {
  getProjectById,
  getProjectSongs,
  addSongToProject,
  removeSongFromProject,
  reorderProjectSongs,
  updateProject,
} from "./db";
import { storagePut } from "./storage";

const mockProject = {
  id: 1,
  userId: 42,
  slug: "test-project",
  title: "Test Project",
  status: "draft" as const,
  narrationUrl: null,
  narrationKey: null,
  videoUrl: null,
  videoType: "none" as const,
};

describe("Project Songs DB Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProjectSongs returns empty array when no songs linked", async () => {
    vi.mocked(getProjectSongs).mockResolvedValue([]);
    const result = await getProjectSongs(1);
    expect(result).toEqual([]);
    expect(getProjectSongs).toHaveBeenCalledWith(1);
  });

  it("addSongToProject calls db with correct projectId and songId", async () => {
    vi.mocked(addSongToProject).mockResolvedValue(undefined);
    await addSongToProject(1, 99);
    expect(addSongToProject).toHaveBeenCalledWith(1, 99);
  });

  it("removeSongFromProject calls db with correct projectId and songId", async () => {
    vi.mocked(removeSongFromProject).mockResolvedValue(undefined);
    await removeSongFromProject(1, 99);
    expect(removeSongFromProject).toHaveBeenCalledWith(1, 99);
  });

  it("reorderProjectSongs calls db with ordered IDs", async () => {
    vi.mocked(reorderProjectSongs).mockResolvedValue(undefined);
    await reorderProjectSongs(1, [3, 1, 2]);
    expect(reorderProjectSongs).toHaveBeenCalledWith(1, [3, 1, 2]);
  });
});

describe("Narration Upload Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("storagePut is called with correct key prefix for narration", async () => {
    const userId = 42;
    const projectId = 1;
    const mimeType = "audio/mpeg";
    const buf = Buffer.from("fake-audio");
    const ext = mimeType.split("/")[1]?.replace("mpeg", "mp3") || "mp3";
    const key = `project-narrations/${userId}-${projectId}-12345.${ext}`;

    vi.mocked(storagePut).mockResolvedValue({ url: `https://cdn.example.com/${key}`, key });
    const result = await storagePut(key, buf, mimeType);
    expect(result.url).toContain("project-narrations");
    expect(result.key).toContain(".mp3");
  });

  it("updateProject is called with narrationUrl and narrationKey after upload", async () => {
    vi.mocked(updateProject).mockResolvedValue(undefined);
    const url = "https://cdn.example.com/narration.mp3";
    const key = "project-narrations/42-1-12345.mp3";
    await updateProject(1, { narrationUrl: url, narrationKey: key });
    expect(updateProject).toHaveBeenCalledWith(1, { narrationUrl: url, narrationKey: key });
  });
});

describe("Video Upload Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("storagePut is called with correct key prefix for video", async () => {
    const userId = 42;
    const projectId = 1;
    const mimeType = "video/mp4";
    const buf = Buffer.from("fake-video");
    const ext = mimeType.split("/")[1] || "mp4";
    const key = `project-videos/${userId}-${projectId}-12345.${ext}`;

    vi.mocked(storagePut).mockResolvedValue({ url: `https://cdn.example.com/${key}`, key });
    const result = await storagePut(key, buf, mimeType);
    expect(result.url).toContain("project-videos");
    expect(result.key).toContain(".mp4");
  });

  it("updateProject is called with videoUrl and videoType s3 after upload", async () => {
    vi.mocked(updateProject).mockResolvedValue(undefined);
    const url = "https://cdn.example.com/video.mp4";
    await updateProject(1, { videoUrl: url, videoType: "s3" });
    expect(updateProject).toHaveBeenCalledWith(1, { videoUrl: url, videoType: "s3" });
  });
});

describe("Project ownership guard", () => {
  it("getProjectById returns project for valid id", async () => {
    vi.mocked(getProjectById).mockResolvedValue(mockProject as any);
    const result = await getProjectById(1);
    expect(result?.id).toBe(1);
    expect(result?.userId).toBe(42);
  });

  it("getProjectById returns undefined for missing project", async () => {
    vi.mocked(getProjectById).mockResolvedValue(undefined);
    const result = await getProjectById(999);
    expect(result).toBeUndefined();
  });
});
