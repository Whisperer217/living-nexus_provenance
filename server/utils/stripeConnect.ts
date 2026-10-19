const PRODUCTION_ORIGINS = new Set([
  "https://www.livingnexus.org",
  "https://livingnexus.org",
  "https://livingnexus.manus.space",
  "https://livingnexus-7khkqvmb.manus.space",
]);

const SANDBOX_PREVIEW_HOST = /^\d+-iuccvnrqtspyquz91ta3j-a7b87da8\.us1\.manus\.computer$/i;

export const CANONICAL_PAYOUT_PATH = "/settings/payouts";
export const DEFAULT_PAYOUT_ORIGIN = "https://www.livingnexus.org";

/**
 * Account Link callbacks must return to a Living Nexus route we own. Callers may
 * suggest their current origin for an official preview or production surface,
 * but never a path, query, or arbitrary host.
 */
export function resolveTrustedPayoutOrigin(candidate: string | undefined): string {
  if (!candidate) return DEFAULT_PAYOUT_ORIGIN;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return DEFAULT_PAYOUT_ORIGIN;
  }

  const isExactOrigin = candidate === parsed.origin;
  const trustedHost = PRODUCTION_ORIGINS.has(parsed.origin) || SANDBOX_PREVIEW_HOST.test(parsed.hostname);
  if (
    parsed.protocol !== "https:" ||
    !trustedHost ||
    !isExactOrigin ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    return DEFAULT_PAYOUT_ORIGIN;
  }

  return parsed.origin;
}

export function resolvePayoutCallbackUrl(candidate: string | undefined): string {
  return new URL(CANONICAL_PAYOUT_PATH, resolveTrustedPayoutOrigin(candidate)).toString();
}

export function buildCreatorBusinessProfileUrl(origin: string, artistHandle: string | null | undefined, creatorId: number): string {
  const handleOrId = artistHandle?.trim() || String(creatorId);
  return new URL(`/creator/${encodeURIComponent(handleOrId)}`, origin).toString();
}
