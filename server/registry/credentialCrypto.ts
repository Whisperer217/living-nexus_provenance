import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { ENV } from "../_core/env";

export const REGISTRY_CREDENTIAL_VERSION = 2;
export const REGISTRY_CREDENTIAL_SECRET_BYTES = 32;
export const REGISTRY_CREDENTIAL_KEY_ID_BYTES = 12;

export function getRegistryCredentialPepper(): string {
  if (ENV.registryApiPepper.length < 32) {
    throw new Error("Registry credential digest service is unavailable");
  }
  return ENV.registryApiPepper;
}

export function digestRegistryCredentialSecret(rawCredential: string, pepper = getRegistryCredentialPepper()): string {
  return createHmac("sha256", pepper).update(rawCredential, "utf8").digest("hex");
}

export function registryCredentialDigestsMatch(expectedDigest: string, rawCredential: string, pepper = getRegistryCredentialPepper()): boolean {
  const expected = Buffer.from(expectedDigest, "hex");
  const actual = Buffer.from(digestRegistryCredentialSecret(rawCredential, pepper), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function generateRegistryCredentialMaterial(environment: "live" | "test", keyId: string): { key: string; keyPrefix: string; secretHash: string } {
  const secret = randomBytes(REGISTRY_CREDENTIAL_SECRET_BYTES).toString("hex");
  const key = `lnr_${environment}_${keyId}_${secret}`;
  return {
    key,
    keyPrefix: key.slice(0, Math.min(key.length, 20)),
    secretHash: digestRegistryCredentialSecret(key),
  };
}

export function generateRegistryCredentialKeyId(): string {
  return randomBytes(REGISTRY_CREDENTIAL_KEY_ID_BYTES).toString("base64url");
}

export function parseRegistryCredential(rawCredential: string): { environment: "live" | "test"; keyId: string } | null {
  const match = /^lnr_(live|test)_([A-Za-z0-9_-]{12,64})_([a-f0-9]{64})$/.exec(rawCredential);
  if (!match) return null;
  return { environment: match[1] as "live" | "test", keyId: match[2] };
}
