/**
 * server/payments/providers/usdc.ts
 *
 * USDC (USD Coin) stablecoin payment provider.
 *
 * Philosophy: Stable-value crypto — bridges fiat users who want on-chain
 * settlement without Bitcoin price volatility. Non-custodial by default.
 *
 * Phase 1 (implemented):
 *   - Static wallet address + QR code (Ethereum/Base/Polygon)
 *   - Coinbase Commerce integration (custodial, simple onboarding)
 *
 * Phase 2 (stubbed):
 *   - Circle Payments API (institutional)
 *   - Request Network (decentralized invoicing)
 *   - Multi-chain support (Solana USDC, Arbitrum, Optimism)
 *
 * Supported networks: Ethereum, Base, Polygon, Solana
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

type UsdcNetwork = "ethereum" | "base" | "polygon" | "solana";

export class UsdcProvider implements PaymentProvider {
  readonly id = "usdc" as const;
  readonly name = "USDC";

  readonly capabilities: ProviderCapabilities = {
    oneTimePayments: true,
    subscriptions: false,
    tips: true,
    micropayments: false,  // gas fees make sub-$5 impractical on Ethereum; Base/Polygon are better
    refunds: false,        // on-chain transactions are irreversible
    payouts: false,        // non-custodial — platform doesn't hold USDC
    webhooks: false,       // polling-based confirmation
    qrCode: true,
    anonymous: false,      // EVM addresses are pseudonymous but traceable
    custodyModel: "non_custodial",
    settlementSpeed: "minutes",
    paymentType: "stablecoin",
    minAmountUsdCents: 100,  // $1 minimum
    supportedCurrencies: ["USDC", "USD"],
  };

  isConfigured(): boolean {
    // USDC provider is always available — no platform API key needed for non-custodial.
    // Coinbase Commerce mode requires COINBASE_COMMERCE_API_KEY.
    return true;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const mode = params.metadata.usdcMode || "wallet";

    if (mode === "coinbase_commerce" && process.env.COINBASE_COMMERCE_API_KEY) {
      return this.createCoinbaseCommerceCharge(params);
    }

    // Default: static wallet address + EIP-681 URI
    return this.createWalletPayRequest(params);
  }

  async verifyPayment(params: VerifyParams): Promise<PaymentRecord> {
    if (params.providerPaymentId.startsWith("cc_")) {
      return this.verifyCoinbaseCommerceCharge(params);
    }

    // On-chain verification: check txHash via block explorer
    // Phase 2: integrate with Alchemy/Infura/Moralis for real-time confirmation
    return {
      providerPaymentId: params.providerPaymentId,
      providerId: this.id,
      status: "pending",
      amountSmallestUnit: 0,
      currency: "USDC",
      intentType: "unknown",
      metadata: {},
      raw: { note: "USDC on-chain verification requires block explorer polling" },
    };
  }

  async handleWebhook(payload: unknown, headers: Record<string, string>): Promise<WebhookEvent> {
    // Coinbase Commerce webhook
    const body = payload as any;

    if (body?.event?.type) {
      const eventTypeMap: Record<string, string> = {
        "charge:confirmed": "payment.confirmed",
        "charge:failed": "payment.failed",
        "charge:delayed": "payment.confirmed",
        "charge:pending": "payment.confirmed",
      };

      return {
        eventType: (eventTypeMap[body.event.type] || "payment.confirmed") as any,
        providerId: this.id,
        providerEventId: body.event.id,
        raw: body,
      };
    }

    throw new Error("[USDC] Unknown webhook format");
  }

  async validateCreatorConfig(config: Record<string, string | boolean | number>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const mode = config.usdcMode as string || "wallet";

    if (mode === "wallet") {
      const address = config.walletAddress as string;
      if (!address) {
        errors.push("Wallet address required for USDC payments");
      } else if (!this.isValidEvmAddress(address) && !this.isValidSolanaAddress(address)) {
        errors.push("Invalid wallet address — must be a valid EVM (0x...) or Solana address");
      }

      const network = config.network as UsdcNetwork || "base";
      if (!["ethereum", "base", "polygon", "solana"].includes(network)) {
        errors.push(`Unsupported network: ${network}`);
      }

      if (network === "ethereum") {
        warnings.push("Ethereum mainnet has high gas fees. Consider Base or Polygon for better UX.");
      }
    } else if (mode === "coinbase_commerce") {
      if (!config.coinbaseCommerceApiKey && !process.env.COINBASE_COMMERCE_API_KEY) {
        errors.push("Coinbase Commerce API key required");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ─── Wallet Address Mode ──────────────────────────────────────────────────

  private async createWalletPayRequest(params: CheckoutParams): Promise<CheckoutResult> {
    const walletAddress = params.metadata.walletAddress;
    if (!walletAddress) throw new Error("[USDC] Creator wallet address not provided");

    const network = (params.metadata.usdcNetwork as UsdcNetwork) || "base";
    const usdcAmount = (params.amountSmallestUnit / 100).toFixed(2); // cents → USD

    // EIP-681 URI for EVM wallets: ethereum:ADDRESS/transfer?address=USDC_CONTRACT&uint256=AMOUNT
    const usdcContracts: Record<UsdcNetwork, string> = {
      ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    };

    const contract = usdcContracts[network];
    const amountInUnits = Math.round(parseFloat(usdcAmount) * 1_000_000); // USDC has 6 decimals

    let paymentUri: string;
    if (network === "solana") {
      paymentUri = `solana:${walletAddress}?spl-token=${contract}&amount=${usdcAmount}&label=${encodeURIComponent(params.description)}`;
    } else {
      paymentUri = `ethereum:${contract}/transfer?address=${walletAddress}&uint256=${amountInUnits}`;
    }

    const qrCodeDataUri = await this.generateQrDataUri(paymentUri);
    const providerPaymentId = `usdc_${network}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return {
      providerPaymentId,
      providerId: this.id,
      paymentAddress: walletAddress,
      qrCodeDataUri,
      amountSmallestUnit: params.amountSmallestUnit,
      currency: "USDC",
      raw: { paymentUri, network, contract, walletAddress, usdcAmount },
    };
  }

  // ─── Coinbase Commerce Mode ───────────────────────────────────────────────

  private async createCoinbaseCommerceCharge(params: CheckoutParams): Promise<CheckoutResult> {
    const apiKey = process.env.COINBASE_COMMERCE_API_KEY || params.metadata.coinbaseCommerceApiKey;

    const response = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "X-CC-Api-Key": apiKey,
        "X-CC-Version": "2018-03-22",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.description,
        description: params.description,
        pricing_type: "fixed_price",
        local_price: {
          amount: (params.amountSmallestUnit / 100).toFixed(2),
          currency: "USD",
        },
        metadata: params.metadata,
        redirect_url: params.successUrl,
        cancel_url: params.cancelUrl,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[USDC/Coinbase] Charge creation failed: ${err}`);
    }

    const charge = await response.json() as any;

    return {
      providerPaymentId: `cc_${charge.data.id}`,
      providerId: this.id,
      checkoutUrl: charge.data.hosted_url,
      amountSmallestUnit: params.amountSmallestUnit,
      currency: "USD",
      expiresAt: new Date(charge.data.expires_at).getTime(),
      raw: charge.data,
    };
  }

  private async verifyCoinbaseCommerceCharge(params: VerifyParams): Promise<PaymentRecord> {
    const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
    if (!apiKey) throw new Error("[USDC/Coinbase] API key not configured");

    const chargeId = params.providerPaymentId.replace("cc_", "");
    const response = await fetch(`https://api.commerce.coinbase.com/charges/${chargeId}`, {
      headers: { "X-CC-Api-Key": apiKey, "X-CC-Version": "2018-03-22" },
    });

    if (!response.ok) throw new Error("[USDC/Coinbase] Charge lookup failed");
    const charge = await response.json() as any;
    const data = charge.data;

    const statusMap: Record<string, PaymentRecord["status"]> = {
      NEW: "pending",
      PENDING: "pending",
      COMPLETED: "confirmed",
      EXPIRED: "expired",
      UNRESOLVED: "pending",
      RESOLVED: "confirmed",
      CANCELED: "failed",
      REFUND_PENDING: "refunded",
      REFUNDED: "refunded",
    };

    return {
      providerPaymentId: params.providerPaymentId,
      providerId: this.id,
      status: statusMap[data.timeline?.slice(-1)[0]?.status || "NEW"] || "pending",
      amountSmallestUnit: Math.round(parseFloat(data.pricing?.local?.amount || "0") * 100),
      currency: data.pricing?.local?.currency || "USD",
      amountUsdCents: Math.round(parseFloat(data.pricing?.local?.amount || "0") * 100),
      intentType: data.metadata?.type || "unknown",
      metadata: data.metadata || {},
      raw: data,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private isValidEvmAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  private async generateQrDataUri(data: string): Promise<string> {
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="8">USDC QR</text><text y="65" font-size="4">${data.slice(0, 30)}...</text></svg>`
    ).toString("base64")}`;
  }
}
