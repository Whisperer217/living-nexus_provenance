/**
 * Database Export Routes — Admin Only
 *
 * GET /api/admin/db-export/manifest
 *   Returns row counts per table so the UI knows the full scope.
 *
 * GET /api/admin/db-export/batch?table=songs&offset=0&limit=500
 *   Returns a single paginated batch of rows from one table.
 *
 * GET /api/admin/db-export (legacy — full single-file dump)
 */
import { Router, type Request, type Response } from "express";
import { sdk } from "../_core/sdk";
import { getPool } from "../utils/db";

export const dbExportRouter = Router();

// All tables to export — ordered so FK parents come before children
export const EXPORT_TABLES = [
  "users",
  "agents",
  "wids",
  "songs",
  "audioVersions",
  "songVersions",
  "activationContributions",
  "comments",
  "commentReports",
  "tips",
  "downloads",
  "licenses",
  "slotPurchases",
  "likes",
  "playlists",
  "playlistItems",
  "playlistTracks",
  "playlistCollaborators",
  "playlistVersions",
  "externalPlaylists",
  "events",
  "fieldNotes",
  "witnesses",
  "witnessTestimonies",
  "creativeReferences",
  "expressionLineage",
  "notifications",
  "promoCodes",
  "promoRedemptions",
  "nameHistory",
  "collections",
  "platformSupporters",
  "playEvents",
  "onboardingProgress",
  "visualQueue",
  "shareArtifacts",
  "featureAttributions",
  "promptDrafts",
  "contentFlags",
  "declarationSignatures",
  "songReactions",
  "adminLogs",
  "systemConfig",
  "discordWebhooks",
  "platformSettings",
  "projects",
  "projectUpdates",
  "projectDonations",
  "projectBlocks",
  "projectFollowers",
  "projectSongs",
  "platformAuditLogs",
  "qrShares",
  "qrScans",
  "selfImprovementRuns",
  "selfImprovementFindings",
  "paymentReconciliationLog",
  "bookPurchases",
  "keeperSkins",
  "marketplaceItems",
];

// ── Auth helper ──────────────────────────────────────────────────────────────
async function requireAdmin(req: Request, res: Response): Promise<any | null> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return null;
    }
    return user;
  } catch {
    res.status(401).json({ error: "Sign in as admin to access export." });
    return null;
  }
}

// ── MANIFEST — row counts per table ─────────────────────────────────────────
dbExportRouter.get("/api/admin/db-export/manifest", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const pool = await getPool();
  if (!pool) { res.status(503).json({ error: "Database unavailable." }); return; }

  console.log(`[DB Export] Admin ${user.name} requested manifest`);

  const tables: Record<string, { rowCount: number }> = {};
  let totalRows = 0;

  for (const tableName of EXPORT_TABLES) {
    try {
      const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      const cnt = Number((rows as any[])[0]?.cnt ?? 0);
      tables[tableName] = { rowCount: cnt };
      totalRows += cnt;
    } catch {
      tables[tableName] = { rowCount: 0 };
    }
  }

  res.json({
    tables,
    tableNames: EXPORT_TABLES,
    totalRows,
    generatedAt: new Date().toISOString(),
  });
});

// ── BATCH — paginated rows from one table ────────────────────────────────────
dbExportRouter.get("/api/admin/db-export/batch", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const tableName = String(req.query.table ?? "");
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10));
  const limit = Math.min(10000, Math.max(1, parseInt(String(req.query.limit ?? "500"), 10)));

  // Validate table name against allow-list to prevent SQL injection
  if (!EXPORT_TABLES.includes(tableName)) {
    res.status(400).json({ error: `Unknown table: ${tableName}` });
    return;
  }

  const pool = await getPool();
  if (!pool) { res.status(503).json({ error: "Database unavailable." }); return; }

  try {
    const [rows] = await pool.query(
      `SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const rowArray = Array.isArray(rows) ? rows : [];
    res.json({
      table: tableName,
      offset,
      limit,
      rowCount: rowArray.length,
      hasMore: rowArray.length === limit,
      rows: rowArray,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Query failed" });
  }
});

// ── LEGACY full dump ─────────────────────────────────────────────────────────
dbExportRouter.get("/api/admin/db-export", async (req: Request, res: Response) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const pool = await getPool();
  if (!pool) { res.status(503).json({ error: "Database unavailable." }); return; }

  const exportedAt = new Date().toISOString();
  const dateSlug = exportedAt.slice(0, 10);
  const tables: Record<string, any[]> = {};
  const stats: Record<string, number> = {};

  console.log(`[DB Export] Admin ${user.name} (${user.openId}) initiated full database export`);

  for (const tableName of EXPORT_TABLES) {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT 500000`);
      const rowArray = Array.isArray(rows) ? rows : [];
      tables[tableName] = rowArray;
      stats[tableName] = rowArray.length;
    } catch (err: any) {
      tables[tableName] = [];
      stats[tableName] = 0;
      console.warn(`[DB Export] Skipped table ${tableName}: ${err?.message}`);
    }
  }

  const totalRows = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`[DB Export] Export complete — ${EXPORT_TABLES.length} tables, ${totalRows} total rows`);

  const payload = {
    exportedAt,
    exportedBy: { id: user.id, name: user.name, openId: user.openId },
    version: "1.0",
    platform: "Living Nexus",
    stats,
    tables,
  };

  const filename = `living-nexus-db-export-${dateSlug}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(payload);
});
