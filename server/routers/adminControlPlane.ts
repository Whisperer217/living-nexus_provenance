import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getAdminLogs, getDb } from "../utils/db";

const CONTROL_PLANE_ROUTES = [
  { path: "/", label: "Home", surface: "public" },
  { path: "/explore", label: "Explore", surface: "public" },
  { path: "/manifest", label: "Register", surface: "public" },
  { path: "/manage", label: "Manage", surface: "authenticated" },
  { path: "/admin", label: "Control Plane", surface: "admin" },
] as const;

const CONTROL_PLANE_DIAGNOSTICS = [
  {
    id: "mission-control",
    label: "Mission Control",
    description: "Existing worker and queue telemetry.",
    href: "/admin/mission-control",
  },
  {
    id: "worker-health",
    label: "Worker Health Endpoint",
    description: "Bounded backend worker reachability response.",
    href: "/api/worker/health",
  },
] as const;

function redactAuditEntry(entry: Awaited<ReturnType<typeof getAdminLogs>>[number]) {
  return {
    id: entry.id,
    adminId: entry.adminId,
    adminName: entry.adminName,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    createdAt: entry.createdAt,
  };
}

/**
 * Stage 1 is deliberately query-only. It observes a narrow operational slice
 * and never shares the broader legacy admin router's mutation authority.
 */
export const adminControlPlaneRouter = router({
  getOverview: adminProcedure.query(async () => {
    const checkedAt = new Date();
    const db = await getDb();
    let databaseStatus: "healthy" | "degraded" | "unavailable" = "unavailable";

    if (db) {
      try {
        await db.execute("SELECT 1");
        databaseStatus = "healthy";
      } catch {
        databaseStatus = "degraded";
      }
    }

    return {
      checkedAt,
      application: { status: "healthy" as const, uptimeSeconds: Math.floor(process.uptime()) },
      database: { status: databaseStatus },
      worker: { status: "inspect-specialized-diagnostics" as const },
    };
  }),

  getRouteStatus: adminProcedure.query(() => ({
    checkedAt: new Date(),
    verification: "declared-route-contract" as const,
    routes: CONTROL_PLANE_ROUTES.map(route => ({
      ...route,
      expectedStatus: 200,
      status: "declared" as const,
    })),
  })),

  getDiagnostics: adminProcedure.query(() => CONTROL_PLANE_DIAGNOSTICS),

  getAuditLog: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 25;
      const entries = await getAdminLogs(limit);
      return {
        entries: entries.map(redactAuditEntry),
        limit,
      };
    }),
});
