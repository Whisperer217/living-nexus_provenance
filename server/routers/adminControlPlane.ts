import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { collections, provenanceEvents, songs, users, wids } from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";
import { getAdminLogs, getDb } from "../utils/db";

const CONTROL_PLANE_ROUTES = [
  { path: "/", label: "Home", group: "Public", purpose: "Platform orientation and discovery entry" },
  { path: "/explore", label: "Explore", group: "Public", purpose: "Public songs and creators discovery" },
  { path: "/manifest", label: "Register", group: "Creator", purpose: "Music work preparation and registration" },
  { path: "/batch-upload", label: "Batch Upload", group: "Creator", purpose: "Multi-work music preparation" },
  { path: "/manage", label: "Manage", group: "Creator", purpose: "Creator work ledger and management" },
  { path: "/song/:id", label: "Work", group: "Work", purpose: "Public work, testimony, and provenance surface" },
  { path: "/creator/:id", label: "Creator", group: "Work", purpose: "Creator sanctuary and published work surface" },
  { path: "/verify/:witnessId", label: "Verify", group: "Registry", purpose: "Read-only WID verification surface" },
  { path: "/admin", label: "Control Plane", group: "Admin", purpose: "Protected operational observation" },
] as const;

const SPECIALIZED_ADMIN_SURFACES = [
  { path: "/admin/users", label: "Users", purpose: "Existing user administration surface" },
  { path: "/admin/normalization", label: "Normalization", purpose: "Existing normalization review surface" },
  { path: "/admin/moderation", label: "Moderation", purpose: "Existing moderation surface" },
  { path: "/admin/comments", label: "Comments", purpose: "Existing comment review surface" },
  { path: "/admin/audit", label: "Engineering Audit", purpose: "Existing engineering audit records" },
  { path: "/admin/self-improve", label: "Self Improve", purpose: "Existing worker operations surface" },
  { path: "/admin/payment-integrity", label: "Payment Integrity", purpose: "Existing payment-integrity surface" },
  { path: "/admin/mission-control", label: "Mission Control", purpose: "Existing worker and queue telemetry" },
  { path: "/admin/physical", label: "Physical", purpose: "Existing physical fulfillment surface" },
  { path: "/admin/phase-ledger", label: "Phase Ledger", purpose: "Existing delivery ledger surface" },
  { path: "/admin/guide-access", label: "Guide Access", purpose: "Existing guide access surface" },
  { path: "/admin/notifications", label: "Notifications", purpose: "Existing notification surface" },
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
    area: entry.targetType ?? "platform",
    result: /fail|error|deny|reject/i.test(entry.action) ? "attention" : "recorded",
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

  getSystemOverview: adminProcedure.query(async () => {
    const db = await getDb();
    const observedAt = new Date();
    if (!db) {
      return {
        observedAt,
        availability: "unavailable" as const,
        metrics: [],
        recentActivity: [],
      };
    }

    const [creatorRows, activeWorkRows, publishedWorkRows, draftWorkRows, widRows, provenanceRows, collectionRows, recentActivity] = await Promise.all([
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(songs).where(ne(songs.status, "Deleted")),
      db.select({ total: count() }).from(songs).where(and(eq(songs.status, "Published"), eq(songs.isPublic, true))),
      db.select({ total: count() }).from(songs).where(eq(songs.status, "Draft")),
      db.select({ total: count() }).from(wids),
      db.select({ total: count() }).from(provenanceEvents),
      db.select({ total: count() }).from(collections),
      getAdminLogs(5),
    ]);

    return {
      observedAt,
      availability: "available" as const,
      metrics: [
        { id: "creator-identities", label: "Creator Identities", value: Number(creatorRows[0]?.total ?? 0), detail: "Existing user identity records" },
        { id: "active-works", label: "Active Works", value: Number(activeWorkRows[0]?.total ?? 0), detail: "Songs excluding Deleted status" },
        { id: "public-published-works", label: "Public Published Works", value: Number(publishedWorkRows[0]?.total ?? 0), detail: "Published songs with public visibility" },
        { id: "draft-works", label: "Draft Works", value: Number(draftWorkRows[0]?.total ?? 0), detail: "Songs currently in Draft status" },
        { id: "wids", label: "WIDs", value: Number(widRows[0]?.total ?? 0), detail: "Existing witness identifier records" },
        { id: "provenance-events", label: "Provenance Events", value: Number(provenanceRows[0]?.total ?? 0), detail: "Existing append-only event records" },
        { id: "collections", label: "Collections", value: Number(collectionRows[0]?.total ?? 0), detail: "Existing collection records" },
      ],
      recentActivity: recentActivity.map(redactAuditEntry),
    };
  }),

  getHealthStatus: adminProcedure.query(async () => {
    const checkedAt = new Date();
    const db = await getDb();
    let database: "healthy" | "degraded" | "unavailable" = "unavailable";
    if (db) {
      try {
        await db.execute("SELECT 1");
        database = "healthy";
      } catch {
        database = "degraded";
      }
    }

    return {
      checkedAt,
      checks: [
        { id: "api", label: "API", status: "healthy" as const, detail: "Current application process is serving this protected query" },
        { id: "database", label: "Database", status: database, detail: "Read-only SELECT 1 reachability probe" },
        { id: "storage", label: "Storage", status: "not-instrumented" as const, detail: "No safe storage-health probe is currently exposed" },
        { id: "worker", label: "Worker", status: "reachability-only" as const, detail: "Use the existing Worker Health diagnostic for its bounded response" },
        { id: "build", label: "Build", status: "not-instrumented" as const, detail: "No runtime build-status metadata is currently exposed" },
      ],
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

  getSpecializedAdmin: adminProcedure.query(() => SPECIALIZED_ADMIN_SURFACES),

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
