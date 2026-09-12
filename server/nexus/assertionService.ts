import { createPrivateKey, createPublicKey, randomUUID } from "node:crypto";
import { importPKCS8, SignJWT, type JWK } from "jose";
import type { User } from "../../drizzle/schema";
import { ENV } from "../_core/env";

const ASSERTION_ALGORITHM = "EdDSA";
const ASSERTION_KID = "ln-nexus-staging-2026-09";
const ASSERTION_TTL_SECONDS = 300;

let privateKeyPromise: ReturnType<typeof importPKCS8> | null = null;
let publicJwkPromise: Promise<JWK> | null = null;

export function normalizeNexusAssertionPrivateKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.includes("-----BEGIN PRIVATE KEY-----")) return trimmed;
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed)) return trimmed;

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8").trim();
    return decoded.includes("-----BEGIN PRIVATE KEY-----") ? decoded : trimmed;
  } catch {
    return trimmed;
  }
}

function getPrivateKey(): ReturnType<typeof importPKCS8> {
  if (!ENV.nexusAssertionPrivateKey.trim()) {
    return Promise.reject(new Error("Living Nexus Nexus assertion private key is not configured"));
  }
  privateKeyPromise ??= importPKCS8(
    normalizeNexusAssertionPrivateKey(ENV.nexusAssertionPrivateKey),
    ASSERTION_ALGORITHM
  );
  return privateKeyPromise;
}

export async function getNexusAssertionJwks(): Promise<{ keys: JWK[] }> {
  publicJwkPromise ??= Promise.resolve().then(() => {
    const pem = normalizeNexusAssertionPrivateKey(ENV.nexusAssertionPrivateKey);
    if (!pem.includes("-----BEGIN PRIVATE KEY-----")) {
      throw new Error("Living Nexus Nexus assertion private key is not configured");
    }
    const publicJwk = createPublicKey(createPrivateKey(pem)).export({ format: "jwk" }) as JWK;
    return {
      ...publicJwk,
      alg: ASSERTION_ALGORITHM,
      kid: ASSERTION_KID,
      use: "sig",
    };
  });
  return { keys: [await publicJwkPromise] };
}

export async function createNexusAssertion(user: Pick<User, "id" | "openId" | "name">): Promise<string> {
  const privateKey = await getPrivateKey();
  return new SignJWT({
    ln_user_id: user.id,
    ln_name: user.name ?? "",
  })
    .setProtectedHeader({ alg: ASSERTION_ALGORITHM, kid: ASSERTION_KID, typ: "JWT" })
    .setIssuer(ENV.nexusAssertionIssuer)
    .setAudience(ENV.nexusAssertionAudience)
    .setSubject(user.openId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ASSERTION_TTL_SECONDS}s`)
    .sign(privateKey);
}

export async function getNexusAssertionReadiness(): Promise<"ready" | "unavailable"> {
  try {
    await getNexusAssertionJwks();
    return "ready";
  } catch {
    return "unavailable";
  }
}

export const NEXUS_ASSERTION = {
  audience: ENV.nexusAssertionAudience,
  issuer: ENV.nexusAssertionIssuer,
  kid: ASSERTION_KID,
  ttlSeconds: ASSERTION_TTL_SECONDS,
} as const;
