import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const db = vi.hoisted(() => ({
  getDb: vi.fn(),
  getAdminLogs: vi.fn(),
}));

vi.mock("../utils/db", async importOriginal => {
  const actual = await importOriginal<typeof import("../utils/db")>();
  return {
    ...actual,
    getDb: db.getDb,
    getAdminLogs: db.getAdminLogs,
  };
});

import { appRouter } from "../routers/index";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function contextFor(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function user(role: "admin" | "user"): AuthenticatedUser {
  return {
    id: role === "admin" ? 1 : 2,
    openId: `control-plane-${role}`,
    email: `${role}@example.com`,
    name: role === "admin" ? "Administrator" : "Creator",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

describe("Admin Control Plane Stage 1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.getDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue([{ ok: 1 }]) });
    db.getAdminLogs.mockResolvedValue([
      {
        id: 7,
        adminId: 1,
        adminName: "Administrator",
        action: "existing_action",
        targetType: "existing_target",
        targetId: "42",
        details: JSON.stringify({ private: "redact" }),
        createdAt: new Date("2026-08-18T00:00:00.000Z"),
      },
    ]);
  });

  it("denies guests and non-admin users at the server procedure boundary", async () => {
    await expect(appRouter.createCaller(contextFor(null)).adminControlPlane.getOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(contextFor(user("user"))).adminControlPlane.getRouteStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getDb).not.toHaveBeenCalled();
  });

  it("returns only bounded read-only health, declared routes, diagnostics, and redacted action history to an admin", async () => {
    const caller = appRouter.createCaller(contextFor(user("admin")));
    const [overview, routes, diagnostics, auditLog] = await Promise.all([
      caller.adminControlPlane.getOverview(),
      caller.adminControlPlane.getRouteStatus(),
      caller.adminControlPlane.getDiagnostics(),
      caller.adminControlPlane.getAuditLog({ limit: 25 }),
    ]);

    expect(overview.application.status).toBe("healthy");
    expect(overview.database.status).toBe("healthy");
    expect(routes.verification).toBe("declared-route-contract");
    expect(routes.routes.map(route => route.path)).toEqual(["/", "/explore", "/manifest", "/manage", "/admin"]);
    expect(diagnostics.map(diagnostic => diagnostic.href)).toEqual(["/admin/mission-control", "/api/worker/health"]);
    expect(auditLog.entries[0]).toMatchObject({ id: 7, action: "existing_action", targetId: "42" });
    expect(auditLog.entries[0]).not.toHaveProperty("details");
    expect(db.getAdminLogs).toHaveBeenCalledWith(25);
  });

  it("contains no Stage 1 mutation procedure or forbidden control-plane integration", () => {
    const routerSource = fs.readFileSync("server/routers/adminControlPlane.ts", "utf8");
    const pageSource = fs.readFileSync("client/src/pages/admin/AdminControlPlanePage.tsx", "utf8");
    const appRouterSource = fs.readFileSync("server/routers/index.ts", "utf8");

    expect(routerSource).not.toContain(".mutation");
    expect(pageSource).not.toContain("useMutation");
    expect(routerSource).not.toContain("setSystemConfig");
    expect(routerSource).not.toContain("setPlatformSetting");
    expect(routerSource).not.toContain("updateSong");
    expect(routerSource).not.toContain("insertProvenance");
    expect(routerSource).not.toContain("stripe");
    expect(appRouterSource).toContain("adminControlPlane:  adminControlPlaneRouter");
  });

  it("uses the protected route, dashboard shell, and server-owned fixed route manifest", () => {
    const appSource = fs.readFileSync("client/src/App.tsx", "utf8");
    const pageSource = fs.readFileSync("client/src/pages/admin/AdminControlPlanePage.tsx", "utf8");

    expect(appSource).toContain('path="/admin" component={AdminControlPlanePage}');
    expect(pageSource).toContain("<DashboardLayout title=\"Control Plane\"");
    expect(pageSource).toContain("const isAdmin = user?.role === \"admin\"");
    expect(pageSource).toContain("Server-authorized administrator access");
    expect(pageSource).toContain("This view accepts no host, URL, query, or outbound target input.");
  });
});
