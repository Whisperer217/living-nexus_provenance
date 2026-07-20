/**
 * @domain   The Covenant → Economy → Reciprocity
 * @impl     Server Service — Payment provider registry abstracting Stripe, Bitcoin, Lightning, and USDC
 */
/**
 * server/payments/registry.ts
 *
 * Payment Provider Registry — the central factory for Living Nexus payments.
 *
 * Usage:
 *   import { getProvider, getEnabledProvidersForCreator, registry } from "./registry";
 *
 *   // Get a specific provider
 *   const stripe = getProvider("stripe");
 *   const checkout = await stripe.createCheckout(params);
 *
 *   // Get the best provider for a creator
 *   const provider = await getBestProviderForCreator(creatorUserId, "tip");
 *   const checkout = await provider.createCheckout(params);
 */

import type { PaymentProvider, ProviderId, CreatorPaymentSettings, CreatorProviderConfig } from "./types";
import { StripeProvider } from "./providers/stripe";
import { BitcoinProvider } from "./providers/bitcoin";
import { LightningProvider } from "./providers/lightning";
import { UsdcProvider } from "./providers/usdc";

// ─── Provider Registry ────────────────────────────────────────────────────────

class PaymentRegistry {
  private providers = new Map<ProviderId, PaymentProvider>();

  register(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider);
    console.log(`[PaymentRegistry] Registered provider: ${provider.id} (${provider.name})`);
  }

  get(id: ProviderId): PaymentProvider | undefined {
    return this.providers.get(id);
  }

  getOrThrow(id: ProviderId): PaymentProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`[PaymentRegistry] Unknown provider: ${id}`);
    return provider;
  }

  getAll(): PaymentProvider[] {
    return Array.from(this.providers.values());
  }

  getConfigured(): PaymentProvider[] {
    return this.getAll().filter(p => p.isConfigured());
  }

  /**
   * Get all providers that are configured AND enabled for a specific creator.
   */
  getEnabledForCreator(settings: CreatorPaymentSettings): PaymentProvider[] {
    return this.getConfigured().filter(p => {
      const config = settings.providers[p.id];
      return config?.enabled === true;
    });
  }

  /**
   * Get the best provider for a creator given an intent type.
   * Priority: creator's default → first enabled configured provider → platform default (Stripe).
   */
  getBestProvider(
    settings: CreatorPaymentSettings | null,
    intentType: string,
    preferredProviderId?: ProviderId
  ): PaymentProvider {
    // If a specific provider is requested, use it
    if (preferredProviderId) {
      const p = this.providers.get(preferredProviderId);
      if (p && p.isConfigured()) return p;
    }

    // Use creator's settings if available
    if (settings) {
      const enabled = this.getEnabledForCreator(settings);

      // Use creator's default if set and capable
      if (settings.defaultProvider) {
        const def = enabled.find(p => p.id === settings.defaultProvider);
        if (def) return def;
      }

      // For micropayments, prefer Lightning
      if (intentType === "tip") {
        const lightning = enabled.find(p => p.id === "lightning" && p.capabilities.micropayments);
        if (lightning) return lightning;
      }

      // Use first enabled provider
      if (enabled.length > 0) return enabled[0];
    }

    // Platform default: Stripe
    const stripe = this.providers.get("stripe");
    if (stripe && stripe.isConfigured()) return stripe;

    throw new Error("[PaymentRegistry] No configured payment provider available");
  }
}

// ─── Singleton Registry ───────────────────────────────────────────────────────

export const registry = new PaymentRegistry();

// Register all providers
registry.register(new StripeProvider());
registry.register(new BitcoinProvider());
registry.register(new LightningProvider());
registry.register(new UsdcProvider());

// ─── Convenience exports ──────────────────────────────────────────────────────

export function getProvider(id: ProviderId): PaymentProvider {
  return registry.getOrThrow(id);
}

export function getConfiguredProviders(): PaymentProvider[] {
  return registry.getConfigured();
}

export function getBestProviderForCreator(
  settings: CreatorPaymentSettings | null,
  intentType: string,
  preferredProviderId?: ProviderId
): PaymentProvider {
  return registry.getBestProvider(settings, intentType, preferredProviderId);
}

/**
 * Get all providers enabled for a creator, with their configs.
 * Returns an array of { provider, config } pairs.
 */
export function getEnabledProvidersForCreator(
  settings: CreatorPaymentSettings
): Array<{ provider: PaymentProvider; config: CreatorProviderConfig }> {
  return registry.getEnabledForCreator(settings).map(provider => ({
    provider,
    config: settings.providers[provider.id]!,
  }));
}
