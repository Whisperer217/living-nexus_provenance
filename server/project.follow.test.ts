import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getProjectById: vi.fn(),
  getUserById: vi.fn(),
  followProject: vi.fn(),
  unfollowProject: vi.fn(),
  isFollowingProject: vi.fn(),
  getProjectFollowerCount: vi.fn(),
  getProjectFollowerUserIds: vi.fn(),
  createNotification: vi.fn(),
}));

import {
  getProjectById,
  followProject,
  unfollowProject,
  isFollowingProject,
  getProjectFollowerCount,
} from "./db";

const mockGetProjectById = getProjectById as ReturnType<typeof vi.fn>;
const mockFollowProject = followProject as ReturnType<typeof vi.fn>;
const mockUnfollowProject = unfollowProject as ReturnType<typeof vi.fn>;
const mockIsFollowing = isFollowingProject as ReturnType<typeof vi.fn>;
const mockFollowerCount = getProjectFollowerCount as ReturnType<typeof vi.fn>;

describe("projects.follow / unfollow helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("followProject is called with correct args", async () => {
    mockFollowProject.mockResolvedValue(undefined);
    await followProject(42, 7);
    expect(mockFollowProject).toHaveBeenCalledWith(42, 7);
  });

  it("unfollowProject is called with correct args", async () => {
    mockUnfollowProject.mockResolvedValue(undefined);
    await unfollowProject(42, 7);
    expect(mockUnfollowProject).toHaveBeenCalledWith(42, 7);
  });

  it("isFollowingProject returns false when not following", async () => {
    mockIsFollowing.mockResolvedValue(false);
    const result = await isFollowingProject(42, 7);
    expect(result).toBe(false);
  });

  it("isFollowingProject returns true when following", async () => {
    mockIsFollowing.mockResolvedValue(true);
    const result = await isFollowingProject(42, 7);
    expect(result).toBe(true);
  });

  it("getProjectFollowerCount returns correct count", async () => {
    mockFollowerCount.mockResolvedValue(13);
    const count = await getProjectFollowerCount(42);
    expect(count).toBe(13);
  });

  it("getProjectById returns null for unknown project", async () => {
    mockGetProjectById.mockResolvedValue(null);
    const project = await getProjectById(9999);
    expect(project).toBeNull();
  });
});
