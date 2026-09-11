export const REGISTRY_R1_SCOPES = [
  "registry:capabilities:read",
  "registry:search:read",
  "registry:creators:read",
  "registry:works:read",
  "registry:wids:read",
  "registry:provenance:read",
  "registry:permissions:read",
] as const;

export type RegistryR1Scope = (typeof REGISTRY_R1_SCOPES)[number];
export type RegistryClientType = "FIRST_PARTY" | "PARTNER" | "PERSONAL";
export type RegistryClientEnvironment = "TEST" | "LIVE";

const CLIENT_POLICIES: Record<RegistryClientType, { dailyLimit: number; permittedScopes: readonly RegistryR1Scope[] }> = {
  FIRST_PARTY: { dailyLimit: 10_000, permittedScopes: REGISTRY_R1_SCOPES },
  PARTNER: { dailyLimit: 1_000, permittedScopes: REGISTRY_R1_SCOPES },
  PERSONAL: { dailyLimit: 500, permittedScopes: ["registry:capabilities:read", "registry:search:read", "registry:creators:read", "registry:works:read", "registry:wids:read", "registry:provenance:read", "registry:permissions:read"] },
};

export function isRegistryR1Scope(value: string): value is RegistryR1Scope {
  return (REGISTRY_R1_SCOPES as readonly string[]).includes(value);
}

export function getRegistryClientPolicy(clientType: RegistryClientType) {
  return CLIENT_POLICIES[clientType];
}

export function assertScopeSubset(requestedScopes: readonly RegistryR1Scope[], permittedScopes: readonly RegistryR1Scope[]): void {
  if (requestedScopes.length === 0 || requestedScopes.some((scope) => !permittedScopes.includes(scope))) {
    throw new Error("Requested Registry scopes exceed the client policy");
  }
}
