/**
 * server/payments/providers/lightning.ts
 *
 * Lightning Network payment provider.
 *
 * Philosophy: Sovereignty-first while remaining practical.
 * Creators choose their custody model — platform never forces one.
 *
 * Phase 1 (implemented):
 *   - Strike API (custodial) — instant onboarding, simple REST
 *   - LNURL-pay static addresses (non-custodial) — creator provides their LNURL
 *
 * Phase 2 (stubbed, ready for implementation):
 *   - BTCPay Server (self-hosted, non-custodial)
 *   - Nostr Wallet Connect (NWC) — sovereign, key-based
 *   - Native LNURL server (creator-run)
 *   - Self-hosted Lightning nodes (LND, CLN)
 *
 * Custody models supported:
 *   - "custodial"     → Strike API (creator has Strike account)
 *   - "non_custodial" → LNURL static address or BTCPay Server
 *   - "hybrid"        → NWC (key-based, wallet-agnostic)
 */

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

type LightningMode = "strike" | "lnurl" | "btcpay" | "nwc" | "lnd";

export class LightningProvider implements PaymentProvider {
  readonly id = "lightning" as const;
  readonly name = "Lightning Network";

  readonly capabilities: ProviderCapabilities = {
    oneTimePayments: true,
    subscriptions: false,  // Lightning subscriptions require NWC or recurring invoices
    tips: true,
    micropayments: true,   // Lightning is ideal for sub-$1 micropayments
    refunds: false,        // Lightning payments are irreversible
    payouts: false,        // non-custodial modes: platform doesn't hold funds
    webhooks: true,        // Strike supports webhooks; BTCPay does too
    qrCode: true,
    anonymous: true,       // Lightning is more private than on-chain
    custodyModel: "hybrid",
    settlementSpeed: "instant",
    paymentType: "crypto",
    minAmountUsdCents: 1,  // 1 cent minimum — Lightning enables true micropayments
    maxAmountUsdCents: 100000, // $1000 practical limit per invoice
    supportedCurrencies: ["SATS", "BTC", "USD"],  // Strike supports USD-denominated invoices
  };

  isConfigured(): boolean {
    // Lightning is available if Strike API key is present OR if creator provides LNURL
    return !!process.env.STRIKE_API_KEY || true; // LNURL mode always available
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const mode = this.detectMode(params.metadata);

    switch (mode) {
      case "strike":
        return this.createStrikeInvoice(params);
      case "lnurl":
        return this.createLnurlPayRequest(params);
      case "btcpay":
        return this.createBtcPayInvoice(params);
      case "nwc":
        return this.createNwcPayRequest(params);
      default:
        // Fallback: generate a static LNURL if creator has one, else error
        if (params.metadata.lnurlAddress) {
          return this.createLnurlPayRequest(params);
        }
        throw new Error("[Lightning] No Lightning payment method configured for this creator");
    }
  }

  async verifyPayment(params: VerifyParams): Promise<PaymentRecord> {
    const mode = this.detectModeFromId(params.providerPaymentId);

    if (mode === "strike") {
      return this.verifyStrikeInvoice(params);
    }

    // For LNURL/BTCPay/NWC — payment is self-verifying via preimage
    return {
      providerPaymentId: params.providerPaymentId,
      providerId: this.id,
      status: "pending",
      amountSmallestUnit: 0,
      currency: "SATS",
      intentType: "unknown",
      metadata: {},
    };
  }

  async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent> {
    // Strike webhook handling
    const body = payload as any;

    if (body?.entityId && body?.type) {
      // Strike webhook format
      const eventTypeMap: Record<string, string> = {
        "INVOICE.UPDATED": "payment.confirmed",
        "INVOICE.CREATED": "payment.confirmed",
      };

      return {
        eventType: (eventTypeMap[body.type] || "payment.confirmed") as any,
        providerId: this.id,
        providerEventId: body.id || body.entityId,
        raw: body,
      };
    }

    throw new Error("[Lightning] Unknown webhook format");
  }

  async getBalance(creatorUserId: number, config: CreatorProviderConfig): Promise<BalanceResult> {
    const mode = config.config.mode as LightningMode || "lnurl";

    if (mode === "strike") {
      return this.getStrikeBalance(config);
    }

    // Non-custodial modes: platform cannot query balance
    throw new Error("[Lightning] Balance query not available for non-custodial Lightning");
  }

  async validateCreatorConfig(config: Record<string, string | boolean | number>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const mode = (config.mode as LightningMode) || "lnurl";

    switch (mode) {
      case "strike":
        if (!config.strikeHandle && !config.strikeApiKey) {
          errors.push("Strike handle or API key required for Strike mode");
        }
        break;
      case "lnurl":
        if (!config.lnurlAddress) {
          errors.push("LNURL address required (e.g. you@wallet.com or lnurl1...)");
        } else if (!this.isValidLnurlAddress(config.lnurlAddress as string)) {
          errors.push("Invalid LNURL address format");
        }
        break;
      case "btcpay":
        if (!config.btcpayServerUrl) errors.push("BTCPay Server URL required");
        if (!config.btcpayStoreId) errors.push("BTCPay Store ID required");
        if (!config.btcpayApiKey) errors.push("BTCPay API key required");
        break;
      case "nwc":
        if (!config.nwcConnectionString) {
          errors.push("Nostr Wallet Connect connection string required");
        }
        break;
    }

    if (mode !== "strike") {
      warnings.push("Non-custodial Lightning: Living Nexus cannot verify payment receipt automatically");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ─── Strike API (Phase 1 — Custodial) ────────────────────────────────────

  private async createStrikeInvoice(params: CheckoutParams): Promise<CheckoutResult> {
    const apiKey = process.env.STRIKE_API_KEY || params.metadata.strikeApiKey;
    if (!apiKey) throw new Error("[Lightning/Strike] STRIKE_API_KEY not configured");

    const strikeHandle = params.metadata.strikeHandle;
    if (!strikeHandle) throw new Error("[Lightning/Strike] Creator Strike handle not provided");

    // Strike API: create invoice for a specific user
    const response = await fetch(`https://api.strike.me/v1/invoices`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        correlationId: `ln_${Date.now()}`,
        description: params.description,
        amount: {
          currency: "USD",
          amount: (params.amountSmallestUnit / 100).toFixed(2),
        },
        receiverId: strikeHandle,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[Lightning/Strike] Invoice creation failed: ${err}`);
    }

    const invoice = await response.json() as any;

    // Get the BOLT11 invoice string
    const quoteResponse = await fetch(`https://api.strike.me/v1/invoices/${invoice.invoiceId}/quote`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    let bolt11: string | undefined;
    if (quoteResponse.ok) {
      const quote = await quoteResponse.json() as any;
      bolt11 = quote.lnInvoice;
    }

    const qrCodeDataUri = bolt11 ? await this.generateLightningQr(bolt11) : undefined;

    return {
      providerPaymentId: `strike_${invoice.invoiceId}`,
      providerId: this.id,
      lightningInvoice: bolt11,
      qrCodeDataUri,
      amountSmallestUnit: params.amountSmallestUnit,
      currency: "USD",
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      raw: invoice,
    };
  }

  private async verifyStrikeInvoice(params: VerifyParams): Promise<PaymentRecord> {
    const apiKey = process.env.STRIKE_API_KEY;
    if (!apiKey) throw new Error("[Lightning/Strike] STRIKE_API_KEY not configured");

    const invoiceId = params.providerPaymentId.replace("strike_", "");
    const response = await fetch(`https://api.strike.me/v1/invoices/${invoiceId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) throw new Error("[Lightning/Strike] Invoice lookup failed");
    const invoice = await response.json() as any;

    const statusMap: Record<string, PaymentRecord["status"]> = {
      UNPAID: "pending",
      PENDING: "pending",
      PAID: "confirmed",
      CANCELLED: "failed",
      EXPIRED: "expired",
    };

    return {
      providerPaymentId: params.providerPaymentId,
      providerId: this.id,
      status: statusMap[invoice.state] || "pending",
      amountSmallestUnit: Math.round(parseFloat(invoice.amount?.amount || "0") * 100),
      currency: invoice.amount?.currency || "USD",
      amountUsdCents: Math.round(parseFloat(invoice.amount?.amount || "0") * 100),
      intentType: "unknown",
      metadata: {},
      confirmedAt: invoice.state === "PAID" ? new Date() : undefined,
      raw: invoice,
    };
  }

  private async getStrikeBalance(config: CreatorProviderConfig): Promise<BalanceResult> {
    const apiKey = config.config.strikeApiKey as string || process.env.STRIKE_API_KEY;
    if (!apiKey) throw new Error("[Lightning/Strike] No API key");

    const response = await fetch("https://api.strike.me/v1/balances", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!response.ok) throw new Error("[Lightning/Strike] Balance query failed");
    const balances = await response.json() as any[];

    const usd = balances.find((b: any) => b.currency === "USD");
    return {
      providerId: this.id,
      available: parseFloat(usd?.available || "0") * 100,
      pending: parseFloat(usd?.pending || "0") * 100,
      currency: "USD",
      availableUsdCents: parseFloat(usd?.available || "0") * 100,
    };
  }

  // ─── LNURL-pay (Phase 1 — Non-Custodial) ─────────────────────────────────

  private async createLnurlPayRequest(params: CheckoutParams): Promise<CheckoutResult> {
    const lnurlAddress = params.metadata.lnurlAddress;
    if (!lnurlAddress) throw new Error("[Lightning/LNURL] No LNURL address provided");

    // LNURL-pay: encode the address as a QR code
    // The fan's wallet scans the QR and handles the payment flow
    const qrCodeDataUri = await this.generateLightningQr(lnurlAddress);

    return {
      providerPaymentId: `lnurl_${Date.now()}`,
      providerId: this.id,
      lnurlPay: lnurlAddress,
      qrCodeDataUri,
      amountSmallestUnit: params.amountSmallestUnit,
      currency: params.currency,
      raw: { lnurlAddress },
    };
  }

  // ─── BTCPay Server (Phase 2 stub) ────────────────────────────────────────

  private async createBtcPayInvoice(params: CheckoutParams): Promise<CheckoutResult> {
    // Phase 2 implementation
    // BTCPay Server REST API: POST /api/v1/stores/{storeId}/invoices
    throw new Error("[Lightning/BTCPay] BTCPay Server integration coming in Phase 2");
  }

  // ─── Nostr Wallet Connect (Phase 2 stub) ─────────────────────────────────

  private async createNwcPayRequest(params: CheckoutParams): Promise<CheckoutResult> {
    // Phase 2 implementation
    // NWC: nostr+walletconnect://... connection string
    // Uses Nostr relay to communicate payment requests to creator's wallet
    throw new Error("[Lightning/NWC] Nostr Wallet Connect integration coming in Phase 2");
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private detectMode(metadata: Record<string, string>): LightningMode {
    if (metadata.strikeHandle || metadata.strikeApiKey) return "strike";
    if (metadata.lnurlAddress) return "lnurl";
    if (metadata.btcpayServerUrl) return "btcpay";
    if (metadata.nwcConnectionString) return "nwc";
    return "lnurl";
  }

  private detectModeFromId(id: string): LightningMode {
    if (id.startsWith("strike_")) return "strike";
    if (id.startsWith("lnurl_")) return "lnurl";
    if (id.startsWith("btcpay_")) return "btcpay";
    return "lnurl";
  }

  private isValidLnurlAddress(address: string): boolean {
    // Lightning address format: user@domain.com
    // OR bech32-encoded LNURL: lnurl1...
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address)
      || /^lnurl1[a-z0-9]+$/i.test(address);
  }

  private async generateLightningQr(data: string): Promise<string> {
    // Placeholder — in production use 'qrcode' npm package
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="8">⚡ LN QR</text><text y="65" font-size="4">${data.slice(0, 30)}...</text></svg>`
    ).toString("base64")}`;
  }
}
