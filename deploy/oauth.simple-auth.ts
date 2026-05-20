/**
 * Living Nexus — Simple Email/Password Auth
 * ─────────────────────────────────────────
 * Drop-in replacement for server/_core/oauth.ts
 * Replaces Manus OAuth with local bcrypt email/password authentication.
 *
 * DEPLOYMENT INSTRUCTIONS:
 *   1. cp deploy/oauth.simple-auth.ts server/_core/oauth.ts
 *   2. Add password_hash column: see deploy/add-password-hash.sql
 *   3. Install bcryptjs: pnpm add bcryptjs && pnpm add -D @types/bcryptjs
 *   4. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (first admin account)
 *   5. Rebuild: pnpm build
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { broadcastEvent } from "../sse";
import crypto from "crypto";

// ─── Helper ──────────────────────────────────────────────────────────────────

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getBodyParam(req: Request, key: string): string | undefined {
  const value = req.body?.[key];
  return typeof value === "string" ? value.trim() : undefined;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerOAuthRoutes(app: Express) {

  // ── POST /api/auth/register ──────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const email = getBodyParam(req, "email");
    const password = getBodyParam(req, "password");
    const name = getBodyParam(req, "name") ?? "Member";

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "password must be at least 8 characters" });
      return;
    }

    try {
      // Check if email already registered
      const existing = await db.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "email already registered" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const openId = `local_${crypto.randomBytes(16).toString("hex")}`;

      const isNewMember = true;
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "email",
        lastSignedIn: new Date(),
        // @ts-ignore — password_hash added via migration
        passwordHash,
      });

      if (isNewMember) {
        broadcastEvent("new_member", {
          name,
          joinedAt: Date.now(),
        });
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ ok: true, name });
    } catch (err) {
      console.error("[Auth] Register error:", err);
      res.status(500).json({ error: "registration failed" });
    }
  });

  // ── POST /api/auth/login ─────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const email = getBodyParam(req, "email");
    const password = getBodyParam(req, "password");

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: "invalid email or password" });
        return;
      }

      // @ts-ignore — password_hash added via migration
      const hash = user.passwordHash as string | null;
      if (!hash) {
        res.status(401).json({ error: "account not set up for password login" });
        return;
      }

      const valid = await bcrypt.compare(password, hash);
      if (!valid) {
        res.status(401).json({ error: "invalid email or password" });
        return;
      }

      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ ok: true, name: user.name });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      res.status(500).json({ error: "login failed" });
    }
  });

  // ── GET /api/auth/logout ─────────────────────────────────────────────────
  app.get("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.redirect(302, "/");
  });

  // ── Legacy OAuth callback — redirect to login page ───────────────────────
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.redirect(302, "/login");
  });
}
