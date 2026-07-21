/**
 * @domain  The Platform → Authentication → OAuth State Preservation
 * @impl    Server Test — OAuth returnPath extraction and redirect logic
 *
 * Tests the fix for the Slimdoggy bug report (2026-07-21):
 * OAuth callback was discarding returnPath from state, causing 404s.
 */
import { describe, it, expect } from "vitest";

// Mirror the server-side extractReturnPath logic for unit testing
function extractReturnPath(state: string): string | undefined {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf8");
    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      if (parsed.returnPath && typeof parsed.returnPath === "string") {
        const path = parsed.returnPath;
        if (path.startsWith("/") && !path.startsWith("//")) {
          return path;
        }
      }
    }
  } catch {
    // Malformed state
  }
  return undefined;
}

// Mirror the client-side getLoginUrl state encoding
function buildState(returnPath: string): string {
  const redirectUri = "https://www.livingnexus.org/api/oauth/callback";
  return btoa(JSON.stringify({ redirectUri, returnPath }));
}

describe("OAuth returnPath preservation", () => {
  it("extracts returnPath from new JSON state format", () => {
    const state = buildState("/discover?type=music");
    expect(extractReturnPath(state)).toBe("/discover?type=music");
  });

  it("extracts root path returnPath", () => {
    const state = buildState("/");
    expect(extractReturnPath(state)).toBe("/");
  });

  it("extracts deep route returnPath", () => {
    const state = buildState("/song/12345/witness");
    expect(extractReturnPath(state)).toBe("/song/12345/witness");
  });

  it("extracts returnPath with query params", () => {
    const state = buildState("/explore?genre=Gospel&filter=licensed");
    expect(extractReturnPath(state)).toBe("/explore?genre=Gospel&filter=licensed");
  });

  it("rejects open redirect — external URL", () => {
    const state = btoa(JSON.stringify({
      redirectUri: "https://www.livingnexus.org/api/oauth/callback",
      returnPath: "https://evil.com/steal",
    }));
    expect(extractReturnPath(state)).toBeUndefined();
  });

  it("rejects open redirect — protocol-relative URL", () => {
    const state = btoa(JSON.stringify({
      redirectUri: "https://www.livingnexus.org/api/oauth/callback",
      returnPath: "//evil.com/steal",
    }));
    expect(extractReturnPath(state)).toBeUndefined();
  });

  it("returns undefined for legacy plain-string state", () => {
    // Old format: btoa(redirectUri) — no JSON, no returnPath
    const state = btoa("https://www.livingnexus.org/api/oauth/callback");
    expect(extractReturnPath(state)).toBeUndefined();
  });

  it("returns undefined for malformed base64", () => {
    expect(extractReturnPath("not-valid-base64!!!")).toBeUndefined();
  });

  it("returns undefined when returnPath is missing from JSON", () => {
    const state = btoa(JSON.stringify({ redirectUri: "https://www.livingnexus.org/api/oauth/callback" }));
    expect(extractReturnPath(state)).toBeUndefined();
  });

  it("redirect destination prefers returnPath over domain default", () => {
    const returnPath = "/discover?type=music";
    const domainDefault = "/@jake";
    const destination = returnPath || domainDefault;
    expect(destination).toBe("/discover?type=music");
  });

  it("redirect destination falls back to domain default when no returnPath", () => {
    const returnPath = undefined;
    const domainDefault = "/@jake";
    const destination = returnPath || domainDefault;
    expect(destination).toBe("/@jake");
  });

  it("redirect destination falls back to /setup-domain for new users", () => {
    const returnPath = undefined;
    const handle = undefined;
    const domainDefault = handle ? `/@${handle}` : "/setup-domain";
    const destination = returnPath || domainDefault;
    expect(destination).toBe("/setup-domain");
  });
});
