/**
 * /api/admin/db-export
 *
 * Owner/admin-only endpoint that exports the full Living Nexus database
 * as a structured JSON file for migration purposes.
 *
 * Security:
 *  - Requires a valid session cookie with role === "admin"
 *  - Only the platform owner (OWNER_OPEN_ID) has admin role by default
 *  - Returns 401 if not authenticated, 403 if not admin
 *
 * Response:
 *  - Content-Type: application/json
 *  - Content-Disposition: attachment; filename="living-nexus-db-export-YYYY-MM-DD.json"
 *  - Body: { exportedAt, version, tables: { [tableName]: rows[] } }
 *
 * Usage:
 *  GET /api/admin/db-export
 *  (browser will auto-download the file)
 */

import { Router, type Request, type Response } from "express";
import { sdk } from "../_core/sdk";
import { getPool } from "../utils/db";

export const dbExportRouter = Router();

// All tables to export — ordered so FK parents come before children
const EXPORT_TABLES = [
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

dbExportRouter.get("/api/admin/db-export", async (req: Request, res: Response) => {
  // ── 1. Authenticate — must be admin ────────────────────────────────────────
  let user: any;
  try {
    user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") {
      res.status(403).json({ error: "Admin access required. Only the platform owner can export the database." });
      return;
    }
  } catch {
    res.status(401).json({ error: "Sign in as admin to export the database." });
    return;
  }

  // ── 2. Get DB connection ───────────────────────────────────────────────────
  const pool = await getPool();
  if (!pool) {
    res.status(503).json({ error: "Database unavailable. Try again in a moment." });
    return;
  }

  // ── 3. Export all tables ───────────────────────────────────────────────────
  const exportedAt = new Date().toISOString();
  const dateSlug = exportedAt.slice(0, 10);
  const tables: Record<string, any[]> = {};
  const errors: Record<string, string> = {};
  const stats: Record<string, number> = {};

  console.log(`[DB Export] Admin ${user.name} (${user.openId}) initiated full database export`);

  for (const tableName of EXPORT_TABLES) {
    try {
      // Use raw pool query to avoid Drizzle schema coupling
      const [rows] = await pool.query(
        `SELECT * FROM \`${tableName}\` LIMIT 500000`
      );
      const rowArray = Array.isArray(rows) ? rows : [];
      tables[tableName] = rowArray;
      stats[tableName] = rowArray.length;
    } catch (err: any) {
      // Table might not exist yet (schema migration lag) — log and skip
      const msg = err?.message || String(err);
      errors[tableName] = msg;
      tables[tableName] = [];
      stats[tableName] = 0;
      console.warn(`[DB Export] Skipped table ${tableName}: ${msg}`);
    }
  }

  const totalRows = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`[DB Export] Export complete — ${EXPORT_TABLES.length} tables, ${totalRows} total rows`);

  // ── 4. Build export payload ────────────────────────────────────────────────
  const payload = {
    exportedAt,
    exportedBy: {
      id: user.id,
      name: user.name,
      openId: user.openId,
    },
    version: "1.0",
    platform: "Living Nexus",
    stats,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    tables,
  };

  // ── 5. Stream as downloadable JSON ────────────────────────────────────────
  const filename = `living-nexus-db-export-${dateSlug}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(payload);
});
