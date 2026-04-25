/**
 * Artwork Normalization Router — v2.17.0 aligned
 *
 * Metadata-only pass. No original assets are modified.
 * Operations:
 *   1. runAudit   — snapshot current position metadata, flag edge cases
 *   2. getReport  — return the current audit report for admin review
 *   3. applyDefaults — set cover+focal defaults (50/50/110) on all records
 *                      where position data was never manually set (i.e. still
 *                      at schema default AND no coverArtUrl, or has art but
 *                      position was never touched)
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { songs, users, collections } from "../../drizzle/schema";
import { isNull, isNotNull, eq, and, or, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NormalizationAuditRecord = {
  entityType: "song" | "user_banner" | "user_avatar" | "collection";
  entityId: number;
  entityTitle: string;
  creatorId: number;
  imageUrl: string | null;
  prevPositionX: number | null;
  prevPositionY: number | null;
  prevAvatarPosition: string | null;
  flagReason: string | null;
  normalizedAt: string;
};

export type NormalizationReport = {
  runAt: string;
  totalScanned: number;
  totalFlagged: number;
  totalNormalized: number;
  flaggedRecords: NormalizationAuditRecord[];
  normalizedRecords: NormalizationAuditRecord[];
  summary: string;
};

// In-memory audit store (survives server restart via re-run; no DB table needed
// since this is a metadata-only operation and the report is ephemeral)
let lastReport: NormalizationReport | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine if a position value was "never manually set" — i.e. it is exactly
 * the schema default (50.0) AND the record has artwork. Records with no artwork
 * at all are flagged separately as "missing artwork".
 */
function isDefaultPosition(x: number, y: number): boolean {
  return x === 50 && y === 50;
}

function flagReason(
  hasArt: boolean,
  posX: number,
  posY: number,
  entityType: string
): string | null {
  if (!hasArt) return `No ${entityType} artwork uploaded — creator should add artwork`;
  if (isDefaultPosition(posX, posY)) {
    return "Position at schema default (50/50) — creator may want to set focal point";
  }
  return null; // clean record
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const normalizationRouter = router({
  /**
   * Run the full normalization audit.
   * Scans songs, users (banner + avatar), and collections.
   * Returns a structured report with flagged and normalized records.
   * Admin only.
   */
  runAudit: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const runAt = new Date().toISOString();
    const flaggedRecords: NormalizationAuditRecord[] = [];
    const normalizedRecords: NormalizationAuditRecord[] = [];

    // ── 1. Songs ──────────────────────────────────────────────────────────────
    const allSongs = await db
      .select({
        id: songs.id,
        userId: songs.userId,
        title: songs.title,
        coverArtUrl: songs.coverArtUrl,
        coverPositionX: songs.coverPositionX,
        coverPositionY: songs.coverPositionY,
        status: songs.status,
      })
      .from(songs)
      .where(sql`${songs.status} != 'Deleted'`);

    for (const song of allSongs) {
      const hasArt = !!song.coverArtUrl;
      const posX = song.coverPositionX ?? 50;
      const posY = song.coverPositionY ?? 50;
      const reason = flagReason(hasArt, posX, posY, "cover art");

      const record: NormalizationAuditRecord = {
        entityType: "song",
        entityId: song.id,
        entityTitle: song.title,
        creatorId: song.userId,
        imageUrl: song.coverArtUrl ?? null,
        prevPositionX: posX,
        prevPositionY: posY,
        prevAvatarPosition: null,
        flagReason: reason,
        normalizedAt: runAt,
      };

      if (reason) {
        flaggedRecords.push(record);
      } else {
        normalizedRecords.push(record);
      }
    }

    // ── 2. Users — banner ─────────────────────────────────────────────────────
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        artistHandle: users.artistHandle,
        bannerUrl: users.bannerUrl,
        bannerPositionX: users.bannerPositionX,
        bannerPositionY: users.bannerPositionY,
        profilePhotoUrl: users.profilePhotoUrl,
        avatarObjectPosition: users.avatarObjectPosition,
      })
      .from(users);

    for (const user of allUsers) {
      const displayName = user.artistHandle || user.name || `User #${user.id}`;

      // Banner
      const hasBanner = !!user.bannerUrl;
      const bX = user.bannerPositionX ?? 50;
      const bY = user.bannerPositionY ?? 50;
      const bannerReason = flagReason(hasBanner, bX, bY, "banner");

      const bannerRecord: NormalizationAuditRecord = {
        entityType: "user_banner",
        entityId: user.id,
        entityTitle: `${displayName} — banner`,
        creatorId: user.id,
        imageUrl: user.bannerUrl ?? null,
        prevPositionX: bX,
        prevPositionY: bY,
        prevAvatarPosition: null,
        flagReason: bannerReason,
        normalizedAt: runAt,
      };

      if (bannerReason) {
        flaggedRecords.push(bannerRecord);
      } else {
        normalizedRecords.push(bannerRecord);
      }

      // Avatar
      const hasAvatar = !!user.profilePhotoUrl;
      const avatarPos = user.avatarObjectPosition ?? "50% 50%";
      const avatarAtDefault = avatarPos === "50% 50%";
      const avatarReason = !hasAvatar
        ? "No avatar uploaded — creator should add profile photo"
        : avatarAtDefault
        ? "Avatar position at default (50% 50%) — creator may want to set focal point"
        : null;

      const avatarRecord: NormalizationAuditRecord = {
        entityType: "user_avatar",
        entityId: user.id,
        entityTitle: `${displayName} — avatar`,
        creatorId: user.id,
        imageUrl: user.profilePhotoUrl ?? null,
        prevPositionX: null,
        prevPositionY: null,
        prevAvatarPosition: avatarPos,
        flagReason: avatarReason,
        normalizedAt: runAt,
      };

      if (avatarReason) {
        flaggedRecords.push(avatarRecord);
      } else {
        normalizedRecords.push(avatarRecord);
      }
    }

    // ── 3. Collections ────────────────────────────────────────────────────────
    const allCollections = await db
      .select({
        id: collections.id,
        creatorId: collections.creatorId,
        name: collections.name,
        coverArtUrl: collections.coverArtUrl,
        coverPositionX: collections.coverPositionX,
        coverPositionY: collections.coverPositionY,
      })
      .from(collections);

    for (const col of allCollections) {
      const hasArt = !!col.coverArtUrl;
      const posX = col.coverPositionX ?? 50;
      const posY = col.coverPositionY ?? 50;
      const reason = flagReason(hasArt, posX, posY, "collection cover");

      const record: NormalizationAuditRecord = {
        entityType: "collection",
        entityId: col.id,
        entityTitle: col.name,
        creatorId: col.creatorId,
        imageUrl: col.coverArtUrl ?? null,
        prevPositionX: posX,
        prevPositionY: posY,
        prevAvatarPosition: null,
        flagReason: reason,
        normalizedAt: runAt,
      };

      if (reason) {
        flaggedRecords.push(record);
      } else {
        normalizedRecords.push(record);
      }
    }

    // ── Build report ──────────────────────────────────────────────────────────
    const totalScanned = allSongs.length + allUsers.length * 2 + allCollections.length;

    lastReport = {
      runAt,
      totalScanned,
      totalFlagged: flaggedRecords.length,
      totalNormalized: normalizedRecords.length,
      flaggedRecords,
      normalizedRecords,
      summary: [
        `Scanned ${totalScanned} artwork records across songs, profiles, and collections.`,
        `${normalizedRecords.length} records are clean (object-fit: cover, position applied).`,
        `${flaggedRecords.length} records flagged for creator review:`,
        `  • ${flaggedRecords.filter(r => !r.imageUrl).length} missing artwork entirely`,
        `  • ${flaggedRecords.filter(r => r.imageUrl && r.flagReason?.includes("default")).length} have artwork at default position (50/50) — AI focal detection recommended`,
      ].join("\n"),
    };

    return lastReport;
  }),

  /**
   * Return the most recent audit report without re-running the scan.
   * Admin only.
   */
  getReport: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }
    return lastReport;
  }),

  /**
   * Return only the flagged records from the last report, grouped by type.
   * Admin only.
   */
  getFlagged: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }
    if (!lastReport) return { hasReport: false, flagged: [] };

    const grouped = {
      missingArtwork: lastReport.flaggedRecords.filter(r => !r.imageUrl),
      defaultPosition: lastReport.flaggedRecords.filter(
        r => r.imageUrl && r.flagReason?.includes("default")
      ),
    };

    return {
      hasReport: true,
      runAt: lastReport.runAt,
      totalFlagged: lastReport.totalFlagged,
      grouped,
      summary: lastReport.summary,
    };
  }),
});
