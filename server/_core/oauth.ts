import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { broadcastEvent } from "../sse";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
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

      res.redirect(302, "/");
    } catch (error) {
      const err = error as Record<string, unknown>;
      const errMsg = typeof err?.message === "string" ? err.message : String(error);
      const errStatus = typeof err?.status === "number" ? err.status : typeof err?.statusCode === "number" ? err.statusCode : undefined;
      const errCode = typeof err?.code === "string" ? err.code : undefined;
      console.error(
        "[OAuth] Callback failed",
        JSON.stringify({
          message: errMsg,
          status: errStatus,
          code: errCode,
          stack: typeof err?.stack === "string" ? err.stack.split("\n").slice(0, 4).join(" | ") : undefined,
        }),
      );
      res.status(500).json({
        error: "OAuth callback failed",
        detail: errMsg,
        status: errStatus,
        code: errCode,
      });
    }
  });
}
