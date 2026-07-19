/**
 * server/payments/providers/stripe.ts
 *
 * Stripe payment provider — wraps the existing Stripe integration
 * into the PaymentProvider interface.
 *
 * This provider handles: tips, licenses, slots, subscriptions, platform gifts.
 * Existing Stripe webhook handling in stripeWebhook.ts is preserved and
 * continues to work — this provider adds the abstraction layer on top.
 */

import Stripe from "stripe";
import type {
  PaymentProvider,
  ProviderCapabilities,
  CheckoutParams,
  CheckoutResult,
  VerifyParams,
  PaymentRecord,
  WebhookEvent,
  BalanceResult,
  CreatorProviderConfig,
} from "../types";

export class StripeProvider implements PaymentProvider {
  readonly id = "stripe" as const;
  readonly name = "Stripe";

  readonly capabilities: ProviderCapabilities = {
    oneTimePayments: true,
    subscriptions: true,
    tips: true,
    micropayments: false,
    refunds: true,
    payouts: true,
    webhooks: true,
    qrCode: false,
    anonymous: false,
    custodyModel: "custodial",
    settlementSpeed: "days",
    paymentType: "fiat",
    minAmountUsdCents: 50,
    maxAmountUsdCents: 99999999,
    supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
  };

  private getClient(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("[Stripe] STRIPE_SECRET_KEY not configured");
    return new Stripe(key, { apiVersion: "2024-06-20" as any });
  }

  isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const stripe = this.getClient();

    if (params.intentType === "subscription" && params.interval) {
      // Create a Stripe Checkout Session for subscriptions
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: { name: params.description },
            unit_amount: params.amountSmallestUnit,
            recurring: { interval: params.interval === "quarter" ? "month" : params.interval, interval_count: params.interval === "quarter" ? 3 : 1 },
          },
          quantity: 1,
        }],
        metadata: params.metadata,
        success_url: params.successUrl || `${process.env.VITE_APP_URL || ""}/`,
        cancel_url: params.cancelUrl || `${process.env.VITE_APP_URL || ""}/`,
      });

      return {
        providerPaymentId: session.id,
        providerId: this.id,
        checkoutUrl: session.url || undefined,
        amountSmallestUnit: params.amountSmallestUnit,
        currency: params.currency,
        raw: session,
      };
    }

    // One-time payment intent
    const intent = await stripe.paymentIntents.create({
      amount: params.amountSmallestUnit,
      currency: params.currency.toLowerCase(),
      metadata: {
        ...params.metadata,
        type: params.intentType,
        ...(params.payerUserId ? { userId: String(params.payerUserId) } : {}),
      },
      description: params.description,
      automatic_payment_methods: { enabled: true },
    });

    return {
      providerPaymentId: intent.id,
      providerId: this.id,
      amountSmallestUnit: intent.amount,
      currency: intent.currency.toUpperCase(),
      raw: intent,
    };
  }

  async verifyPayment(params: VerifyParams): Promise<PaymentRecord> {
    const stripe = this.getClient();
    const intent = await stripe.paymentIntents.retrieve(params.providerPaymentId);

    const statusMap: Record<string, PaymentRecord["status"]> = {
      succeeded: "confirmed",
      canceled: "failed",
      requires_payment_method: "pending",
      processing: "pending",
      requires_action: "pending",
      requires_confirmation: "pending",
      requires_capture: "pending",
    };

    return {
      providerPaymentId: intent.id,
      providerId: this.id,
      status: statusMap[intent.status] || "pending",
      amountSmallestUnit: intent.amount,
      currency: intent.currency.toUpperCase(),
      amountUsdCents: intent.currency === "usd" ? intent.amount : undefined,
      intentType: (intent.metadata?.type as string) || "unknown",
      metadata: intent.metadata as Record<string, string>,
      confirmedAt: intent.status === "succeeded" ? new Date() : undefined,
      raw: intent,
    };
  }

  async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent> {
    const stripe = this.getClient();
    const sig = headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload as string | Buffer, sig, webhookSecret);
    } catch (err: any) {
      throw new Error(`[Stripe] Webhook signature verification failed: ${err.message}`);
    }

    const eventTypeMap: Record<string, string> = {
      "payment_intent.succeeded": "payment.confirmed",
      "payment_intent.payment_failed": "payment.failed",
      "payment_intent.canceled": "payment.failed",
      "customer.subscription.created": "subscription.created",
      "customer.subscription.updated": "subscription.renewed",
      "customer.subscription.deleted": "subscription.cancelled",
      "invoice.payment_failed": "subscription.payment_failed",
    };

    const mappedType = eventTypeMap[event.type] || "payment.confirmed";

    return {
      eventType: mappedType as any,
      providerId: this.id,
      providerEventId: event.id,
      raw: event,
    };
  }

  async getBalance(creatorUserId: number, config: CreatorProviderConfig): Promise<BalanceResult> {
    const stripe = this.getClient();
    const accountId = config.config.accountId as string;
    if (!accountId) throw new Error("[Stripe] No connected account ID in creator config");

    const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
    const available = balance.available.find(b => b.currency === "usd");
    const pending = balance.pending.find(b => b.currency === "usd");

    return {
      providerId: this.id,
      available: available?.amount || 0,
      pending: pending?.amount || 0,
      currency: "USD",
      availableUsdCents: available?.amount || 0,
    };
  }

  async validateCreatorConfig(config: Record<string, string | boolean | number>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.accountId) {
      warnings.push("No Stripe Connect account ID — creator cannot receive payouts");
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
