/**
 * QR Identity Share Router
 * Handles generation, scan logging, and stats for context-aware QR shares.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import {
  createQrShare,
  getQrShareById,
  getQrSharesByUser,
  getQrSharesByEntity,
  logQrScan,
  getQrScanStats,
} from "../db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the canonical URL for a QR share, with attribution params. */
function buildShareUrl(
  origin: string,
  entityType: "creator" | "project" | "song",
  entitySlug: string,
  shareId: number,
  sharerHandle: string | null | undefined,
  campaign: string | null | undefined
): string {
  const base = origin.replace(/\/$/, "");
  let path: string;
  switch (entityType) {
    case "creator": path = `/creator/${entitySlug}`; break;
    case "project": path = `/projects/${entitySlug}`; break;
    case "song":    path = `/song/${entitySlug}`; break;
  }
  const params = new URLSearchParams();
  params.set("qr", String(shareId));
  if (sharerHandle) params.set("ref", sharerHandle);
  if (campaign) params.set("context", campaign);
  params.set("ts", String(Date.now()));
  return `${base}${path}?${params.toString()}`;
}

/** Hash an IP address for anonymised storage. */
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "ln-salt-2025").digest("hex").slice(0, 32);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const qrRouter = router({
  /**
   * Generate a new QR share for a creator, project, or song.
   * Returns the share record + the canonical URL to encode in the QR.
   */
  generate: protectedProcedure
    .input(z.object({
      entityType: z.enum(["creator", "project", "song"]),
      entityId: z.number().int().positive(),
      entitySlug: z.string().min(1).max(128),
      campaign: z.string().max(128).optional(),
      tag: z.string().max(64).optional(),
      origin: z.string().url(), // window.location.origin from frontend
    }))
    .mutation(async ({ ctx, input }) => {
      const sharerHandle = ctx.user.artistHandle ?? ctx.user.name ?? null;
      const share = await createQrShare({
        entityType: input.entityType,
        entityId: input.entityId,
        entitySlug: input.entitySlug,
        sharerId: ctx.user.id,
        sharerHandle,
        campaign: input.campaign ?? null,
        tag: input.tag ?? null,
      });
      if (!share) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create QR share" });
      const url = buildShareUrl(
        input.origin,
        input.entityType,
        input.entitySlug,
        share.id,
        sharerHandle,
        input.campaign ?? null
      );
      return { share, url };
    }),

  /**
   * Log a scan event when a QR-linked URL is visited.
   * Called from the frontend when ?qr= param is detected on page load.
   * Public procedure — no auth required (scanners may not be logged in).
   */
  logScan: publicProcedure
    .input(z.object({
      shareId: z.number().int().positive(),
      refHandle: z.string().max(64).optional(),
      campaign: z.string().max(128).optional(),
      userAgent: z.string().max(512).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify share exists
      const share = await getQrShareById(input.shareId);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "QR share not found" });
      // Hash IP for anonymised storage
      const rawIp = (ctx as any).req?.ip ?? (ctx as any).req?.socket?.remoteAddress ?? "";
      const ipHash = rawIp ? hashIp(rawIp) : null;
      await logQrScan({
        shareId: input.shareId,
        refHandle: input.refHandle ?? null,
        campaign: input.campaign ?? null,
        ipHash,
        userAgent: input.userAgent ?? null,
      });
      return { ok: true };
    }),

  /**
   * Get scan stats for a specific share (owner only).
   */
  getStats: protectedProcedure
    .input(z.object({ shareId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const share = await getQrShareById(input.shareId);
      if (!share) throw new TRPCError({ code: "NOT_FOUND", message: "QR share not found" });
      if (share.sharerId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your share" });
      }
      return getQrScanStats(input.shareId);
    }),

  /**
   * List all QR shares created by the current user.
   */
  myShares: protectedProcedure
    .query(async ({ ctx }) => {
      return getQrSharesByUser(ctx.user.id);
    }),

  /**
   * List all QR shares for a specific entity (public — for share count display).
   */
  entityShares: publicProcedure
    .input(z.object({
      entityType: z.enum(["creator", "project", "song"]),
      entityId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const shares = await getQrSharesByEntity(input.entityType, input.entityId);
      // Return only public-safe fields
      return shares.map(s => ({
        id: s.id,
        sharerHandle: s.sharerHandle,
        campaign: s.campaign,
        tag: s.tag,
        scanCount: s.scanCount,
        createdAt: s.createdAt,
      }));
    }),
});
