export type NexusRegistryAdapterConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  credentialVersion: string;
};

export function getNexusRegistryAdapterConfig(): NexusRegistryAdapterConfig | null {
  const baseUrl = process.env.LN_REGISTRY_API_BASE_URL?.trim() ?? "";
  const apiKey = process.env.LN_REGISTRY_API_KEY?.trim() ?? "";
  const timeoutMs = Number.parseInt(process.env.LN_REGISTRY_API_TIMEOUT_MS ?? "5000", 10);
  const credentialVersion = process.env.LN_REGISTRY_API_KEY_VERSION?.trim() ?? "2";
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey, timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 5000, credentialVersion };
}

/** Server-only contract. Living Nexus browser code never receives the Nexus key. */
export async function nexusRegistryFetch(path: string, init: RequestInit = {}) {
  const config = getNexusRegistryAdapterConfig();
  if (!config) throw new Error("Nexus Registry adapter is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    return await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${config.apiKey}`, "X-Registry-Credential-Version": config.credentialVersion },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
