/**
 * @domain  The Platform → Authentication → OAuth Callback
 * @impl    Server Route — Express GET /api/oauth/callback
 *
 * Bug fix (2026-07-21, Slimdoggy report):
 *   Previously, Law VI redirect always went to /@handle, discarding any
 *   returnPath encoded in the OAuth state. This caused 404s when the user
 *   authenticated from a deep route (e.g., /discover while playing audio).
 *
 * Fix: Read returnPath from state first. Fall back to /@handle (Law VI)
 *      only when no returnPath is present.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../utils/db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { broadcastEvent } from "../services/sse";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Decode the OAuth state parameter and extract returnPath.
 * State may be:
 *   - JSON base64: { redirectUri, returnPath }  (new format)
 *   - Plain base64 string: just the redirectUri  (legacy format)
 * Returns the returnPath string, or undefined if not present.
 */
function extractReturnPath(state: string): string | undefined {
  try {
    const decoded = Buffer.from(state, "base64").toString("utf8");
    if (decoded.startsWith("{")) {
      const parsed = JSON.parse(decoded);
      if (parsed.returnPath && typeof parsed.returnPath === "string") {
        // Only allow relative paths to prevent open redirect attacks
        const path = parsed.returnPath;
        if (path.startsWith("/") && !path.startsWith("//")) {
          return path;
        }
      }
    }
  } catch {
    // Malformed state — fall through to default
  }
  return undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a brand-new user before upserting
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewMember = !existingUser;

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Broadcast to all connected clients when a brand-new member joins
      if (isNewMember) {
        broadcastEvent("new_member", {
          name: userInfo.name || "A new member",
          joinedAt: Date.now(),
        });
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect priority (Law VI + returnPath preservation):
      //   1. returnPath from state — preserves the user's originating route
      //   2. /@handle — creator's domain (Law VI default for returning users)
      //   3. /setup-domain — first-time user, no handle set yet
      const returnPath = extractReturnPath(state);
      const freshUser = await db.getUserByOpenId(userInfo.openId);
      const handle = freshUser?.artistHandle;
      const domainDefault = handle ? `/@${handle}` : "/setup-domain";
      const destination = returnPath || domainDefault;

      console.log(`[OAuth] Redirect → ${destination} (returnPath=${returnPath ?? "none"}, handle=${handle ?? "none"})`);
      res.redirect(302, destination);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
