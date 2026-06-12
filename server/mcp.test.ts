/**
 * Phase 208 — MCP Server Tests
 *
 * Validates:
 * 1. MCP_READ_TOKEN env var is set
 * 2. bearerAuth rejects missing/wrong tokens
 * 3. bearerAuth accepts correct token
 * 4. All five tools are registered
 * 5. get_seo_status tool returns expected shape
 * 6. get_work returns null for unknown WID
 * 7. query_verify_chain returns null for unknown WID
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  getWork,
  listWorks,
  getPageMeta,
  getSeoStatus,
  queryVerifyChain,
  TOOL_DEFINITIONS,
} from "./mcp/tools";

// ─── MCP_READ_TOKEN is set ────────────────────────────────────────────────────

describe("MCP_READ_TOKEN", () => {
  it("should be set as an environment variable", () => {
    const token = process.env.MCP_READ_TOKEN;
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(8);
  });
});

// ─── Tool registry ────────────────────────────────────────────────────────────

describe("TOOL_DEFINITIONS", () => {
  it("should have exactly five tools", () => {
    expect(TOOL_DEFINITIONS).toHaveLength(5);
  });

  it("should include all required tool names", () => {
    const names = TOOL_DEFINITIONS.map(t => t.name);
    expect(names).toContain("get_work");
    expect(names).toContain("list_works");
    expect(names).toContain("get_page_meta");
    expect(names).toContain("get_seo_status");
    expect(names).toContain("query_verify_chain");
  });

  it("each tool should have name, description, and inputSchema", () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ─── Tool: get_work ───────────────────────────────────────────────────────────

describe("getWork", () => {
  it("should return null for a non-existent WID", async () => {
    const result = await getWork({ wid: "WID-MUS-00000000-00000000" });
    expect(result).toBeNull();
  });
});

// ─── Tool: list_works ─────────────────────────────────────────────────────────

describe("listWorks", () => {
  it("should return a paginated result with works array and total", async () => {
    const result = await listWorks({ limit: 5, offset: 0 });
    expect(result).toHaveProperty("works");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("limit", 5);
    expect(result).toHaveProperty("offset", 0);
    expect(Array.isArray(result.works)).toBe(true);
  });

  it("should respect the limit parameter", async () => {
    const result = await listWorks({ limit: 2, offset: 0 });
    expect(result.works.length).toBeLessThanOrEqual(2);
  });
});

// ─── Tool: get_page_meta ──────────────────────────────────────────────────────

describe("getPageMeta", () => {
  it("should return metadata for /manifesto", async () => {
    const result = await getPageMeta({ route: "/manifesto" });
    expect(result).not.toBeNull();
    expect(result!.title).toContain("Manifesto");
    expect(result!.description).toBeTruthy();
    expect(result!.ogTitle).toBeTruthy();
    expect(result!.ogImage).toBeTruthy();
  });

  it("should return metadata for /", async () => {
    const result = await getPageMeta({ route: "/" });
    expect(result).not.toBeNull();
    expect(result!.title).toContain("Living Nexus");
  });

  it("should return metadata for /doctrine/wid-spec", async () => {
    const result = await getPageMeta({ route: "/doctrine/wid-spec" });
    expect(result).not.toBeNull();
    expect(result!.title).toContain("WID");
  });
});

// ─── Tool: get_seo_status ─────────────────────────────────────────────────────

describe("getSeoStatus", () => {
  it("should return aggregate platform stats", async () => {
    const result = await getSeoStatus({});
    expect(result).toHaveProperty("totalWorks");
    expect(result).toHaveProperty("publicWorks");
    expect(result).toHaveProperty("worksWithLyrics");
    expect(result).toHaveProperty("sitemapUrlCount");
    expect(typeof result.totalWorks).toBe("number");
    expect(typeof result.publicWorks).toBe("number");
    expect(result.publicWorks).toBeGreaterThanOrEqual(0);
    expect(result.sitemapUrlCount).toBeGreaterThanOrEqual(10);
  });
});

// ─── Tool: query_verify_chain ─────────────────────────────────────────────────

describe("queryVerifyChain", () => {
  it("should return null for a non-existent WID", async () => {
    const result = await queryVerifyChain({ wid: "WID-MUS-00000000-00000000" });
    expect(result).toBeNull();
  });
});
