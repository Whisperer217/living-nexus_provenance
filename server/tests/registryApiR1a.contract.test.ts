import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  digestRegistryCredentialSecret,
  generateRegistryCredentialMaterial,
  parseRegistryCredential,
  registryCredentialDigestsMatch,
} from "../registry/credentialCrypto";
import {
  REGISTRY_R1_SCOPES,
  assertScopeSubset,
  getRegistryClientPolicy,
} from "../registry/scopes";

const root = path.resolve(import.meta.dirname, "../..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("Registry API R1a credential foundation", () => {
  it("creates a version-2 one-time credential whose keyed digest verifies without revealing its secret", () => {
    const pepper = "a".repeat(64);
    const original = generateRegistryCredentialMaterial("test", "registryTestId_123");
    const digest = digestRegistryCredentialSecret(original.key, pepper);

    expect(original.key).toMatch(/^lnr_test_registryTestId_123_[a-f0-9]{64}$/);
    expect(registryCredentialDigestsMatch(digest, original.key, pepper)).toBe(true);
    expect(registryCredentialDigestsMatch(digest, `${original.key}tampered`, pepper)).toBe(false);
    expect(parseRegistryCredential(original.key)).toEqual({ environment: "test", keyId: "registryTestId_123" });
    expect(JSON.stringify({ keyId: "registryTestId_123", digest })).not.toContain(original.key);
  });

  it("locks R1 to the seven approved read scopes and rejects a scope outside a client ceiling", () => {
    expect(REGISTRY_R1_SCOPES).toEqual([
      "registry:capabilities:read",
      "registry:search:read",
      "registry:creators:read",
      "registry:works:read",
      "registry:wids:read",
      "registry:provenance:read",
      "registry:permissions:read",
    ]);
    expect(() => assertScopeSubset(["registry:works:read"], getRegistryClientPolicy("FIRST_PARTY").permittedScopes)).not.toThrow();
    expect(() => assertScopeSubset(["registry:works:read", "registry:registration:submit" as never], getRegistryClientPolicy("FIRST_PARTY").permittedScopes)).toThrow(/exceed/i);
  });

  it("keeps Registry client and credential authority separate from legacy Work-registration keys", () => {
    const legacyRouter = read("server/routers/apiKey.ts");
    const legacyHelper = read("server/utils/db.ts");
    const r1Service = read("server/registry/credentialService.ts");
    const r1AdminRouter = read("server/routers/registryApiAdmin.ts");
    const migration = read("drizzle/0138_registry_api_r1a_credentials.sql");

    expect(legacyRouter).not.toMatch(/tier:\s*z\.enum/);
    expect(legacyHelper).toMatch(/const tier = "free" as const/);
    expect(r1AdminRouter).toMatch(/adminProcedure/);
    expect(r1Service).toMatch(/withoutCredentialDigest/);
    expect(r1Service).toMatch(/credential_rotated_out/);
    expect(r1Service).not.toMatch(/registry\.registration\.submit|wid\.write|provenance\.write|testimony\.write/);
    expect(migration).toContain("CREATE TABLE `registryApiClients`");
    expect(migration).toContain("CREATE TABLE `registryApiCredentials`");
    expect(migration).toContain("CREATE TABLE `registryApiAuditEvents`");
    expect(migration).not.toMatch(/ALTER TABLE `apiKeys`/);
    expect(r1Service).toMatch(/dailyLimit \?\? policy\.dailyLimit/);
    expect(r1Service).toMatch(/Registry client quota exceeds the server policy ceiling/);
    expect(r1Service).toMatch(/revokeRegistryApiClient/);
  });

  it("requires immediate lifecycle checks before scope and only consumes quota after authorization", () => {
    const service = read("server/registry/credentialService.ts");
    const authentication = service.indexOf("export async function authenticateRegistryCredential");
    const authorization = service.indexOf("export async function authorizeRegistryCredential");
    const quota = service.indexOf("export async function consumeRegistryCredentialQuota");

    expect(authentication).toBeGreaterThan(-1);
    expect(authorization).toBeGreaterThan(-1);
    expect(quota).toBeGreaterThan(authorization);
    expect(service.slice(authentication, authorization)).toMatch(/credential\.expiresAt/);
    expect(service.slice(authorization, quota)).toMatch(/scope_denied/);
    expect(service.slice(quota)).toMatch(/quota_exceeded/);
    expect(service.slice(quota)).toMatch(/usageToday\} < \$\{registryApiCredentials\.dailyLimit\}/);
  });
});
