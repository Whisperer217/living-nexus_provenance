/**
 * server/payments/providers/bitcoin.ts
 *
 * Bitcoin on-chain payment provider.
 *
 * Philosophy: Non-custodial by default. The creator provides their own
 * Bitcoin address. Living Nexus generates a payment request and monitors
 * for on-chain confirmation via a configurable block explorer API.
 *
 * Phase 1: Static address + QR code generation + manual confirmation.
 * Phase 2: xpub-based address derivation (unique address per payment),
 *           BTCPay Server integration, Electrum wallet connect.
 *
 * Custody model: NON-CUSTODIAL — Living Nexus never holds BTC.
 * The platform generates payment requests; the creator receives directly.
 */

import type {
  PaymentProvider,
  ProviderCapabilities,
  CheckoutParams,
  CheckoutResult,
  VerifyParams,
  PaymentRecord,
  WebhookEvent,
  CreatorProviderConfig,
} from "../types";

// Satoshis per BTC
const SATS_PER_BTC = 100_000_000;

export class BitcoinProvider implements PaymentProvider {
  readonly id = "bitcoin" as const;
  readonly name = "Bitcoin";

  readonly capabilities: ProviderCapabilities = {
    oneTimePayments: true,
    subscriptions: false,
    tips: true,
    micropayments: false,  // on-chain fees make sub-$5 impractical
    refunds: false,        // Bitcoin transactions are irreversible
    payouts: false,        // non-custodial — platform doesn't hold funds
    webhooks: false,       // polling-based confirmation
    qrCode: true,
    anonymous: true,       // Bitcoin payments are pseudonymous
    custodyModel: "non_custodial",
    settlementSpeed: "minutes",  // 1 confirmation ~10 min
    paymentType: "crypto",
    minAmountUsdCents: 500,  // $5 minimum to cover typical on-chain fees
    supportedCurrencies: ["BTC", "SATS"],
  };

  isConfigured(): boolean {
    // Bitcoin provider is always available — no platform-level API key needed.
    // Creator must provide their own BTC address in their settings.
    return true;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    // For Bitcoin, the "checkout" is a BIP-21 payment URI + QR code.
    // The creator's BTC address comes from their provider config (passed via metadata).
    const btcAddress = params.metadata.btcAddress;
    if (!btcAddress) {
      throw new Error("[Bitcoin] Creator BTC address not provided in checkout params");
    }

    // Convert amount: params.amountSmallestUnit is in sats if currency=BTC,
    // or cents if currency=USD (we convert to BTC for the URI)
    let btcAmount: number;
    let displayCurrency = params.currency;

    if (params.currency === "BTC" || params.currency === "SATS") {
      const sats = params.currency === "BTC"
        ? params.amountSmallestUnit * SATS_PER_BTC
        : params.amountSmallestUnit;
      btcAmount = sats / SATS_PER_BTC;
    } else {
      // USD cents → BTC (approximate, using a fixed rate placeholder)
      // In production, fetch live BTC/USD rate from a price oracle
      const usdAmount = params.amountSmallestUnit / 100;
      const btcPriceUsd = await this.getBtcPriceUsd();
      btcAmount = usdAmount / btcPriceUsd;
      displayCurrency = "BTC";
    }

    // BIP-21 URI: bitcoin:ADDRESS?amount=BTC_AMOUNT&label=LABEL&message=MESSAGE
    const btcAmountStr = btcAmount.toFixed(8);
    const label = encodeURIComponent(`Living Nexus: ${params.description}`);
    const message = encodeURIComponent(params.description);
    const bip21Uri = `bitcoin:${btcAddress}?amount=${btcAmountStr}&label=${label}&message=${message}`;

    // Generate a unique payment ID for tracking
    const providerPaymentId = `btc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // QR code data URI (the BIP-21 URI encoded as QR)
    const qrCodeDataUri = await this.generateQrDataUri(bip21Uri);

    return {
      providerPaymentId,
      providerId: this.id,
      paymentAddress: btcAddress,
      qrCodeDataUri,
      amountSmallestUnit: Math.round(btcAmount * SATS_PER_BTC),
      currency: "SATS",
      // Bitcoin payments don't expire, but we suggest 30 min for UX
      expiresAt: Date.now() + 30 * 60 * 1000,
      raw: { bip21Uri, btcAddress, btcAmount: btcAmountStr },
    };
  }

  async verifyPayment(params: VerifyParams): Promise<PaymentRecord> {
    // Phase 1: Manual verification — creator confirms receipt.
    // Phase 2: Query block explorer API (Blockstream, mempool.space) for txHash.
    //
    // For now, return a "pending" record. The webhook/polling system
    // will update this when the transaction is confirmed on-chain.
    return {
      providerPaymentId: params.providerPaymentId,
      providerId: this.id,
      status: "pending",
      amountSmallestUnit: 0,
      currency: "SATS",
      intentType: "unknown",
      metadata: {},
      raw: { note: "Bitcoin on-chain verification requires block explorer polling" },
    };
  }

  async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent> {
    // Phase 1: No webhook — Bitcoin uses polling.
    // Phase 2: BTCPay Server sends webhooks; this will handle them.
    throw new Error("[Bitcoin] Webhook handling not yet implemented — use polling");
  }

  async validateCreatorConfig(config: Record<string, string | boolean | number>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const address = config.btcAddress as string;
    if (!address) {
      errors.push("Bitcoin address is required");
    } else if (!this.isValidBtcAddress(address)) {
      errors.push(`Invalid Bitcoin address format: ${address}`);
    }

    if (!config.btcAddress) {
      warnings.push("Consider using an xpub for unique-per-payment addresses (better privacy)");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private isValidBtcAddress(address: string): boolean {
    // Basic format validation for P2PKH (1...), P2SH (3...), and Bech32 (bc1...)
    return /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{6,87})$/.test(address);
  }

  private async getBtcPriceUsd(): Promise<number> {
    try {
      const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot");
      const data = await res.json() as any;
      return parseFloat(data.data?.amount || "50000");
    } catch {
      // Fallback price — in production, use a reliable price oracle
      return 50000;
    }
  }

  private async generateQrDataUri(data: string): Promise<string> {
    // Return a placeholder — in production, use the 'qrcode' npm package
    // or generate server-side with canvas
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="8">BTC QR</text><text y="65" font-size="4">${data.slice(0, 30)}...</text></svg>`
    ).toString("base64")}`;
  }
}
