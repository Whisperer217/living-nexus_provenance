/**
 * Payment Integrity Monitor Worker
 *
 * Runs every 15 minutes. Polls Stripe for all completed checkout sessions in the
 * last 24 hours, cross-checks each one against the database, and auto-reconciles
 * any session that was never credited (missed webhook, key mismatch, server restart, etc.).
 *
 * Supported payment types:
 *   - project_donation  → projectDonations table + projects.raisedAmountCents
 *   - tip               → tips table + songs.tipCount
 *   - license           → licenses table + users.licenseStatus/songSlotsTotal
 *   - slot              → slotPurchases table + users.songSlotsTotal
 *   - subscription      → users.livingArchivePlan (logged only, not auto-credited)
 *
 * Every session inspected is logged to paymentReconciliationLog.
 * The owner is notified via notifyOwner() when any reconciliation occurs.
 */

import Stripe from "stripe";
import { getDb } from "../utils/db";
import { recordProjectDonation, recordTip, recordLicense, recordSlotPurchase } from "../utils/db";
import { notifyOwner } from "../_core/notification";
import { eq } from "drizzle-orm";

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const LOOKBACK_HOURS = 24;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

// ─── DB helpers for the reconciliation log ────────────────────────────────────

async function logReconciliation(data: {
  stripeSessionId: string;
  paymentType: string;
  amountCents: number;
  currency: string;
  status: "ok" | "reconciled" | "skipped" | "failed";
  notes?: string;
  reconciledAt?: Date;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { paymentReconciliationLog } = await import("../drizzle/schema");
    // Upsert — if we've already logged this session (from a previous run), update it
    await db
      .insert(paymentReconciliationLog)
      .values({
        stripeSessionId: data.stripeSessionId,
        paymentType: data.paymentType,
        amountCents: data.amountCents,
        currency: data.currency,
        status: data.status,
        notes: data.notes ?? null,
        reconciledAt: data.reconciledAt ?? null,
      })
      .onDuplicateKeyUpdate({
        set: {
          status: data.status,
          notes: data.notes ?? null,
          reconciledAt: data.reconciledAt ?? null,
          checkedAt: new Date(),
        },
      });
  } catch (err) {
    console.error("[PaymentIntegrity] Failed to write reconciliation log:", err);
  }
}

async function isSessionAlreadyLogged(sessionId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const { paymentReconciliationLog } = await import("../drizzle/schema");
    const rows = await db
      .select({ id: paymentReconciliationLog.id, status: paymentReconciliationLog.status })
      .from(paymentReconciliationLog)
      .where(eq(paymentReconciliationLog.stripeSessionId, sessionId))
      .limit(1);
    // If it was already reconciled or confirmed ok, skip re-processing
    if (rows.length > 0 && (rows[0].status === "ok" || rows[0].status === "reconciled")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Cross-check helpers ───────────────────────────────────────────────────────

async function isDonationCredited(sessionId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const { projectDonations } = await import("../drizzle/schema");
    const rows = await db
      .select({ id: projectDonations.id })
      .from(projectDonations)
      .where(eq(projectDonations.stripeSessionId, sessionId))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function isTipCredited(paymentIntentId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const { tips } = await import("../drizzle/schema");
    const rows = await db
      .select({ id: tips.id })
      .from(tips)
      .where(eq(tips.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function isLicenseCredited(paymentIntentId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const { licenses } = await import("../drizzle/schema");
    const rows = await db
      .select({ id: licenses.id })
      .from(licenses)
      .where(eq(licenses.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function isSlotPurchaseCredited(paymentIntentId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const { slotPurchases } = await import("../drizzle/schema");
    const rows = await db
      .select({ id: slotPurchases.id })
      .from(slotPurchases)
      .where(eq(slotPurchases.stripePaymentIntentId, paymentIntentId))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

// ─── Reconciliation handlers ───────────────────────────────────────────────────

async function reconcileDonation(session: Stripe.Checkout.Session): Promise<"reconciled" | "failed"> {
  try {
    const projectId = session.metadata?.project_id ? parseInt(session.metadata.project_id) : null;
    if (!projectId) return "failed";
    const amountCents = session.amount_total ?? 0;
    const donorEmail = session.customer_details?.email ?? session.metadata?.customer_email ?? undefined;
    const donorName = session.customer_details?.name ?? session.metadata?.customer_name ?? undefined;
    const donorUserId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : undefined;
    await recordProjectDonation({
      projectId,
      donorUserId,
      donorName,
      donorEmail,
      amountCents,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    });
    return "reconciled";
  } catch (err) {
    console.error("[PaymentIntegrity] reconcileDonation failed:", err);
    return "failed";
  }
}

async function reconcileTip(session: Stripe.Checkout.Session): Promise<"reconciled" | "failed"> {
  try {
    const songId = session.metadata?.song_id ? parseInt(session.metadata.song_id) : null;
    if (!songId) return "failed";
    const amountCents = session.amount_total ?? 0;
    const tipperUserId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : undefined;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
    await recordTip({ songId, tipperUserId, amountCents, stripePaymentIntentId: paymentIntentId });
    return "reconciled";
  } catch (err) {
    console.error("[PaymentIntegrity] reconcileTip failed:", err);
    return "failed";
  }
}

async function reconcileLicense(session: Stripe.Checkout.Session): Promise<"reconciled" | "failed"> {
  try {
    const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
    if (!userId) return "failed";
    const amountCents = session.amount_total ?? 0;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
    await recordLicense({ userId, stripePaymentIntentId: paymentIntentId, amountCents, slotsGranted: 100 });
    return "reconciled";
  } catch (err) {
    console.error("[PaymentIntegrity] reconcileLicense failed:", err);
    return "failed";
  }
}

async function reconcileSlot(session: Stripe.Checkout.Session): Promise<"reconciled" | "failed"> {
  try {
    const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
    if (!userId) return "failed";
    const amountCents = session.amount_total ?? 0;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
    // Calculate slots from amount: $0.99 per slot
    const slotsPurchased = Math.max(1, Math.round(amountCents / 99));
    await recordSlotPurchase({ userId, stripePaymentIntentId: paymentIntentId, slotsPurchased, amountCents });
    return "reconciled";
  } catch (err) {
    console.error("[PaymentIntegrity] reconcileSlot failed:", err);
    return "failed";
  }
}

// ─── Main run function ─────────────────────────────────────────────────────────

export async function runPaymentIntegrityCheck(): Promise<{
  checked: number;
  reconciled: number;
  skipped: number;
  failed: number;
}> {
  const stripe = getStripe();
  if (!stripe) {
    console.warn("[PaymentIntegrity] No Stripe key configured — skipping run.");
    return { checked: 0, reconciled: 0, skipped: 0, failed: 0 };
  }

  const stats = { checked: 0, reconciled: 0, skipped: 0, failed: 0 };
  const reconciledSummary: string[] = [];

  try {
    // Fetch all completed checkout sessions from the last LOOKBACK_HOURS hours
    const since = Math.floor((Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000) / 1000);
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const params: Stripe.Checkout.SessionListParams = {
        limit: 100,
        created: { gte: since },
      };
      if (startingAfter) params.starting_after = startingAfter;

      const page = await stripe.checkout.sessions.list(params);
      hasMore = page.has_more;
      if (page.data.length > 0) {
        startingAfter = page.data[page.data.length - 1].id;
      } else {
        hasMore = false;
      }

      for (const session of page.data) {
        // Only process paid sessions
        if (session.payment_status !== "paid") continue;

        stats.checked++;
        const paymentType = session.metadata?.type ?? "unknown";
        const amountCents = session.amount_total ?? 0;
        const currency = session.currency ?? "usd";
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : "";

        // Skip test events
        if (session.id.startsWith("cs_test_") && process.env.NODE_ENV === "production") {
          await logReconciliation({ stripeSessionId: session.id, paymentType, amountCents, currency, status: "skipped", notes: "Test session in production" });
          stats.skipped++;
          continue;
        }

        // Skip if already confirmed ok or reconciled in a previous run
        const alreadyLogged = await isSessionAlreadyLogged(session.id);
        if (alreadyLogged) {
          stats.skipped++;
          continue;
        }

        let status: "ok" | "reconciled" | "skipped" | "failed" = "ok";
        let notes: string | undefined;

        // ── Project donation ──
        if (paymentType === "project_donation") {
          const credited = await isDonationCredited(session.id);
          if (credited) {
            status = "ok";
          } else {
            console.log(`[PaymentIntegrity] Missed donation detected: ${session.id} ($${(amountCents / 100).toFixed(2)})`);
            const result = await reconcileDonation(session);
            status = result;
            if (result === "reconciled") {
              reconciledSummary.push(`Donation $${(amountCents / 100).toFixed(2)} (session ${session.id})`);
              stats.reconciled++;
            } else {
              stats.failed++;
            }
          }
        }
        // ── Tip ──
        else if (paymentType === "tip") {
          const credited = paymentIntentId ? await isTipCredited(paymentIntentId) : false;
          if (credited) {
            status = "ok";
          } else {
            console.log(`[PaymentIntegrity] Missed tip detected: ${session.id} ($${(amountCents / 100).toFixed(2)})`);
            const result = await reconcileTip(session);
            status = result;
            if (result === "reconciled") {
              reconciledSummary.push(`Tip $${(amountCents / 100).toFixed(2)} (session ${session.id})`);
              stats.reconciled++;
            } else {
              stats.failed++;
            }
          }
        }
        // ── License ──
        else if (paymentType === "license") {
          const credited = paymentIntentId ? await isLicenseCredited(paymentIntentId) : false;
          if (credited) {
            status = "ok";
          } else {
            console.log(`[PaymentIntegrity] Missed license detected: ${session.id}`);
            const result = await reconcileLicense(session);
            status = result;
            if (result === "reconciled") {
              reconciledSummary.push(`License purchase (session ${session.id})`);
              stats.reconciled++;
            } else {
              stats.failed++;
            }
          }
        }
        // ── Slot purchase ──
        else if (paymentType === "slot_purchase") {
          const credited = paymentIntentId ? await isSlotPurchaseCredited(paymentIntentId) : false;
          if (credited) {
            status = "ok";
          } else {
            console.log(`[PaymentIntegrity] Missed slot purchase detected: ${session.id}`);
            const result = await reconcileSlot(session);
            status = result;
            if (result === "reconciled") {
              reconciledSummary.push(`Slot purchase (session ${session.id})`);
              stats.reconciled++;
            } else {
              stats.failed++;
            }
          }
        }
        // ── Subscription / other — log only, don't auto-credit ──
        else {
          status = "skipped";
          notes = `Unhandled payment type: ${paymentType} — manual review required`;
          stats.skipped++;
        }

        await logReconciliation({
          stripeSessionId: session.id,
          paymentType,
          amountCents,
          currency,
          status,
          notes,
          reconciledAt: status === "reconciled" ? new Date() : undefined,
        });
      }
    }

    // Notify owner if any reconciliations occurred
    if (reconciledSummary.length > 0) {
      await notifyOwner({
        title: `[Payment Integrity] ${reconciledSummary.length} missed payment(s) auto-reconciled`,
        content: `The payment integrity worker detected and reconciled ${reconciledSummary.length} payment(s) that were not credited by the webhook:\n\n${reconciledSummary.join("\n")}\n\nChecked: ${stats.checked} | Reconciled: ${stats.reconciled} | Skipped: ${stats.skipped} | Failed: ${stats.failed}`,
      });
    }

    console.log(`[PaymentIntegrity] Run complete — checked: ${stats.checked}, reconciled: ${stats.reconciled}, skipped: ${stats.skipped}, failed: ${stats.failed}`);
  } catch (err) {
    console.error("[PaymentIntegrity] Worker run failed:", err);
  }

  return stats;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export function startPaymentIntegrityWorker(): void {
  console.log("[PaymentIntegrity] Worker started — checking every 15 minutes.");
  // Run immediately on startup to catch any missed payments since last deploy
  setTimeout(() => {
    runPaymentIntegrityCheck().catch((err) =>
      console.error("[PaymentIntegrity] Initial run error:", err)
    );
  }, 30_000); // 30s delay to let DB connection stabilise

  setInterval(() => {
    runPaymentIntegrityCheck().catch((err) =>
      console.error("[PaymentIntegrity] Scheduled run error:", err)
    );
  }, INTERVAL_MS);
}
