/**
 * server/routers/payments.ts
 *
 * Provider-agnostic payment router.
 * Handles creator payment settings, provider discovery, and transaction logging.
 * Stripe-specific checkout flows remain in server/routers/stripe.ts for backward compat.
 */

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../utils/db";
import { creatorPaymentSettings, paymentTransactions } from "../../drizzle/schema";
import { registry } from "../payments/registry";
import type { ProviderId as PaymentProviderId } from "../payments/types";

// ─── Supported Provider IDs ───────────────────────────────────────────────────
const PROVIDER_IDS = ["stripe", "bitcoin", "lightning", "usdc"] as const;
type ProviderId = (typeof PROVIDER_IDS)[number];

// ─── Router ───────────────────────────────────────────────────────────────────
export const paymentsRouter = router({

  // ── List available providers with capabilities ─────────────────────────────
  listProviders: publicProcedure.query(async () => {
    return PROVIDER_IDS.map((id) => {
      const provider = registry.get(id);
      if (!provider) return null;
      return {
        id,
        name: provider.name,
        capabilities: provider.capabilities,
        isConfigured: provider.isConfigured(),
      };
    }).filter(Boolean);
  }),

  // ── Get a creator's payment settings (all providers) ──────────────────────
  getCreatorSettings: protectedProcedure
    .input(z.object({ creatorUserId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const targetId = input.creatorUserId ?? ctx.user.id;
      void targetId;

      // Only the creator themselves or an admin can view settings
      if (targetId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const settings = await db
        .select()
        .from(creatorPaymentSettings)
        .where(eq(creatorPaymentSettings.creatorUserId, targetId))
        .orderBy(creatorPaymentSettings.displayOrder) as Array<typeof creatorPaymentSettings.$inferSelect>;

      // Return settings merged with provider metadata
      return PROVIDER_IDS.map((id) => {
        const provider = registry.get(id);
        const saved = settings.find((s) => s.providerId === id);
        return {
          providerId: id,
          providerName: provider?.name ?? id,
          capabilities: provider?.capabilities ?? null,
          enabled: saved ? saved.enabled === 1 : false,
          verified: saved ? saved.verified === 1 : false,
          verifiedAt: saved?.verifiedAt ?? null,
          displayOrder: saved?.displayOrder ?? 0,
          config: saved ? (() => {
            try { return JSON.parse(saved.config); } catch { return {}; }
          })() : {},
        };
      });
    }),

  // ── Save/update a single provider's settings ──────────────────────────────
  saveProviderSettings: protectedProcedure
    .input(z.object({
      providerId: z.enum(PROVIDER_IDS),
      enabled: z.boolean(),
      config: z.record(z.string(), z.any()),
      displayOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const provider = registry.get(input.providerId as PaymentProviderId);

      if (!provider) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown provider: ${input.providerId}` });
      }

      // Validate config if enabling
      let verified = false;
      let validationErrors: string[] = [];
      let validationWarnings: string[] = [];

      if (input.enabled && provider.validateCreatorConfig) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await provider.validateCreatorConfig(input.config as Record<string, string | number | boolean>);
        verified = result.valid;
        validationErrors = result.errors;
        validationWarnings = result.warnings;

        if (!result.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Provider config invalid: ${result.errors.join("; ")}`,
          });
        }
      }

      const configJson = JSON.stringify(input.config);
      const now = new Date();

      // Upsert: check if row exists
      const existing = await db
        .select({ id: creatorPaymentSettings.id })
        .from(creatorPaymentSettings)
        .where(
          and(
            eq(creatorPaymentSettings.creatorUserId, ctx.user.id),
            eq(creatorPaymentSettings.providerId, input.providerId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(creatorPaymentSettings)
          .set({
            enabled: input.enabled ? 1 : 0,
            config: configJson,
            verified: verified ? 1 : 0,
            verifiedAt: verified ? now : undefined,
            displayOrder: input.displayOrder ?? 0,
            updatedAt: now,
          })
          .where(
            and(
              eq(creatorPaymentSettings.creatorUserId, ctx.user.id),
              eq(creatorPaymentSettings.providerId, input.providerId)
            )
          );
      } else {
        await db.insert(creatorPaymentSettings).values({
          creatorUserId: ctx.user.id,
          providerId: input.providerId,
          enabled: input.enabled ? 1 : 0,
          config: configJson,
          verified: verified ? 1 : 0,
          verifiedAt: verified ? now : undefined,
          displayOrder: input.displayOrder ?? 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        success: true,
        verified,
        warnings: validationWarnings,
      };
    }),

  // ── Get enabled providers for a creator (public — for fan checkout) ────────
  getEnabledProviders: publicProcedure
    .input(z.object({ creatorUserId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const settings = await db
        .select()
        .from(creatorPaymentSettings)
        .where(
          and(
            eq(creatorPaymentSettings.creatorUserId, input.creatorUserId),
            eq(creatorPaymentSettings.enabled, 1)
          )
        )
        .orderBy(creatorPaymentSettings.displayOrder);

      return settings.map((s: typeof creatorPaymentSettings.$inferSelect) => {
        const provider = registry.get(s.providerId as PaymentProviderId);
        return {
          providerId: s.providerId,
          providerName: provider?.name ?? s.providerId,
          capabilities: provider?.capabilities ?? null,
          // Return safe public config only (no API keys)
          publicConfig: (() => {
            try {
              const cfg = JSON.parse(s.config);
              // Strip sensitive fields
              const { apiKey, secretKey, coinbaseCommerceApiKey, strikeApiKey, ...safe } = cfg;
              return safe;
            } catch { return {}; }
          })(),
        };
      });
    }),

  // ── Transaction history for a creator ─────────────────────────────────────
  getTransactionHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().default(0),
      providerId: z.enum(PROVIDER_IDS).optional(),
      status: z.enum(["pending", "confirmed", "failed", "expired", "refunded"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [eq(paymentTransactions.creatorUserId, ctx.user.id)];
      if (input.providerId) {
        conditions.push(eq(paymentTransactions.providerId, input.providerId));
      }
      if (input.status) {
        conditions.push(eq(paymentTransactions.status, input.status));
      }

      const rows = await db
        .select()
        .from(paymentTransactions)
        .where(conditions.length === 1 ? conditions[0] : and(conditions[0], ...conditions.slice(1)))
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(input.limit)
        .offset(input.offset) as Array<typeof paymentTransactions.$inferSelect>;

      return rows.map((r: typeof paymentTransactions.$inferSelect) => ({
        ...r,
        metadata: (() => { try { return JSON.parse(r.metadata ?? "{}"); } catch { return {}; } })(),
        raw: undefined, // strip raw from client response
      }));
    }),

  // ── Log a transaction (called internally by provider handlers) ─────────────
  // This is an internal procedure — not exposed to the public client directly.
  // Provider webhook handlers call this via server-side tRPC caller.
  logTransaction: protectedProcedure
    .input(z.object({
      providerId: z.enum(PROVIDER_IDS),
      providerPaymentId: z.string(),
      intentType: z.string(),
      status: z.enum(["pending", "confirmed", "failed", "expired", "refunded"]),
      amountSmallestUnit: z.number(),
      currency: z.string(),
      amountUsdCents: z.number().optional(),
      payerUserId: z.number().optional(),
      creatorUserId: z.number(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      txHash: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = new Date();

      await db.insert(paymentTransactions).values({
        providerId: input.providerId,
        providerPaymentId: input.providerPaymentId,
        intentType: input.intentType,
        status: input.status,
        amountSmallestUnit: input.amountSmallestUnit,
        currency: input.currency,
        amountUsdCents: input.amountUsdCents,
        payerUserId: input.payerUserId,
        creatorUserId: input.creatorUserId,
        metadata: JSON.stringify(input.metadata ?? {}),
        txHash: input.txHash,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true };
    }),
});
