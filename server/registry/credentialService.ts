import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  registryApiAuditEvents,
  registryApiClientScopes,
  registryApiClients,
  registryApiCredentialScopes,
  registryApiCredentials,
  type RegistryApiClient,
  type RegistryApiCredential,
} from "../../drizzle/schema";
import { getDb } from "../utils/db";
import {
  generateRegistryCredentialKeyId,
  generateRegistryCredentialMaterial,
  parseRegistryCredential,
  registryCredentialDigestsMatch,
} from "./credentialCrypto";
import {
  assertScopeSubset,
  getRegistryClientPolicy,
  type RegistryClientEnvironment,
  type RegistryClientType,
  type RegistryR1Scope,
} from "./scopes";

const ROTATION_OVERLAP_MS = 15 * 60 * 1000;
const MAX_CREDENTIAL_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

type CredentialStatus = RegistryApiCredential["status"];

export type RegistryCredentialPrincipal = {
  credentialId: number;
  clientId: number;
  ownerUserId: number;
  keyId: string;
  environment: RegistryClientEnvironment;
  scopes: RegistryR1Scope[];
  dailyLimit: number;
};

export type RegistryCredentialDecision =
  | { ok: true; principal: RegistryCredentialPrincipal }
  | { ok: false; httpStatus: 401 | 403 | 429; reasonCode: string };

export type RegistryCredentialMetadata = Omit<RegistryApiCredential, "secretHash">;

function withoutCredentialDigest(credential: RegistryApiCredential): RegistryCredentialMetadata {
  const { secretHash: _secretHash, ...metadata } = credential;
  return metadata;
}

type RegistryAuditInput = {
  eventType: "ISSUED" | "ROTATED" | "REVOKED" | "ACCESS_ALLOWED" | "ACCESS_DENIED";
  decision: "ALLOW" | "DENY";
  reasonCode: string;
  httpStatus: number;
  credentialId?: number | null;
  clientId?: number | null;
  ownerUserId?: number | null;
  actorUserId?: number | null;
  requestId?: string | null;
  routeId?: string | null;
  requiredScope?: RegistryR1Scope | null;
  latencyMs?: number | null;
  rateLimitBucket?: string | null;
  queryHash?: string | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
};

function extractInsertId(result: unknown): number {
  const rows = result as Array<{ insertId?: number }>;
  const insertId = rows?.[0]?.insertId;
  if (!insertId) throw new Error("Registry database insert did not return an identifier");
  return Number(insertId);
}

function assertExpiry(expiresAt: Date, now = new Date()): void {
  const lifetime = expiresAt.getTime() - now.getTime();
  if (lifetime <= 0 || lifetime > MAX_CREDENTIAL_LIFETIME_MS) {
    throw new Error("Registry credential expiry must be in the next 365 days");
  }
}

function activeCredentialStatus(status: CredentialStatus, rotationGraceExpiresAt: Date | null, now: Date): boolean {
  if (status === "ACTIVE") return true;
  return status === "ROTATING" && Boolean(rotationGraceExpiresAt && rotationGraceExpiresAt.getTime() > now.getTime());
}

export async function recordRegistryApiAuditEvent(input: RegistryAuditInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  await db.insert(registryApiAuditEvents).values({
    eventType: input.eventType,
    decision: input.decision,
    reasonCode: input.reasonCode,
    httpStatus: input.httpStatus,
    credentialId: input.credentialId ?? null,
    clientId: input.clientId ?? null,
    ownerUserId: input.ownerUserId ?? null,
    actorUserId: input.actorUserId ?? null,
    requestId: input.requestId ?? null,
    routeId: input.routeId ?? null,
    requiredScope: input.requiredScope ?? null,
    latencyMs: input.latencyMs ?? null,
    rateLimitBucket: input.rateLimitBucket ?? null,
    queryHash: input.queryHash ?? null,
    ipHash: input.ipHash ?? null,
    userAgentHash: input.userAgentHash ?? null,
  });
}

export async function createRegistryApiClient(input: {
  actorUserId: number;
  ownerUserId: number;
  name: string;
  clientType: RegistryClientType;
  environment: RegistryClientEnvironment;
  maximumScopes: RegistryR1Scope[];
  dailyLimit?: number;
}): Promise<{ client: RegistryApiClient; maximumScopes: RegistryR1Scope[] }> {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const policy = getRegistryClientPolicy(input.clientType);
  assertScopeSubset(input.maximumScopes, policy.permittedScopes);
  const dailyLimit = input.dailyLimit ?? policy.dailyLimit;
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > policy.dailyLimit) {
    throw new Error("Registry client quota exceeds the server policy ceiling");
  }

  const result = await db.insert(registryApiClients).values({
    ownerUserId: input.ownerUserId,
    name: input.name,
    clientType: input.clientType,
    environment: input.environment,
    status: "ACTIVE",
    dailyLimit,
  });
  const clientId = extractInsertId(result);
  await db.insert(registryApiClientScopes).values(input.maximumScopes.map((scope) => ({ clientId, scope })));
  const [client] = await db.select().from(registryApiClients).where(eq(registryApiClients.id, clientId)).limit(1);
  if (!client) throw new Error("Registry client creation failed");
  await recordRegistryApiAuditEvent({
    eventType: "ISSUED",
    decision: "ALLOW",
    reasonCode: "client_created",
    httpStatus: 201,
    clientId,
    ownerUserId: input.ownerUserId,
    actorUserId: input.actorUserId,
  });
  return { client, maximumScopes: input.maximumScopes };
}

export async function listRegistryApiClients(): Promise<Array<RegistryApiClient & { maximumScopes: RegistryR1Scope[] }>> {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const clients = await db.select().from(registryApiClients).orderBy(desc(registryApiClients.createdAt)) as RegistryApiClient[];
  if (clients.length === 0) return [];
  const scopes = await db.select().from(registryApiClientScopes).where(inArray(registryApiClientScopes.clientId, clients.map((client: RegistryApiClient) => client.id))) as Array<{ clientId: number; scope: string }>;
  const scopesByClient = new Map<number, RegistryR1Scope[]>();
  for (const scope of scopes) scopesByClient.set(scope.clientId, [...(scopesByClient.get(scope.clientId) ?? []), scope.scope as RegistryR1Scope]);
  return clients.map((client: RegistryApiClient) => ({ ...client, maximumScopes: scopesByClient.get(client.id) ?? [] }));
}

async function getRegistryClientWithScopes(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const [client] = await db.select().from(registryApiClients).where(eq(registryApiClients.id, clientId)).limit(1);
  if (!client) throw new Error("Registry client not found");
  const scopeRows = await db.select().from(registryApiClientScopes).where(eq(registryApiClientScopes.clientId, clientId)) as Array<{ scope: string }>;
  return { client, maximumScopes: scopeRows.map((row: { scope: string }) => row.scope as RegistryR1Scope) };
}

async function getCredentialScopes(credentialId: number): Promise<RegistryR1Scope[]> {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const rows = await db.select().from(registryApiCredentialScopes).where(eq(registryApiCredentialScopes.credentialId, credentialId)) as Array<{ scope: string }>;
  return rows.map((row: { scope: string }) => row.scope as RegistryR1Scope);
}

export async function issueRegistryApiCredential(input: {
  actorUserId: number;
  clientId: number;
  name: string;
  scopes: RegistryR1Scope[];
  expiresAt: Date;
  rotatedFromId?: number;
}): Promise<{ credential: RegistryCredentialMetadata; scopes: RegistryR1Scope[]; key: string }> {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const now = new Date();
  assertExpiry(input.expiresAt, now);
  const { client, maximumScopes } = await getRegistryClientWithScopes(input.clientId);
  if (client.status !== "ACTIVE") throw new Error("Registry client is not active");
  assertScopeSubset(input.scopes, maximumScopes);
  const keyId = generateRegistryCredentialKeyId();
  const environment = client.environment === "LIVE" ? "live" : "test";
  const material = generateRegistryCredentialMaterial(environment, keyId);
  const result = await db.insert(registryApiCredentials).values({
    keyId,
    clientId: client.id,
    name: input.name,
    credentialVersion: 2,
    keyPrefix: material.keyPrefix,
    secretHash: material.secretHash,
    status: "ACTIVE",
    dailyLimit: client.dailyLimit,
    expiresAt: input.expiresAt,
    rotatedFromId: input.rotatedFromId ?? null,
    createdByUserId: input.actorUserId,
  });
  const credentialId = extractInsertId(result);
  await db.insert(registryApiCredentialScopes).values(input.scopes.map((scope) => ({ credentialId, scope })));
  const [credential] = await db.select().from(registryApiCredentials).where(eq(registryApiCredentials.id, credentialId)).limit(1);
  if (!credential) throw new Error("Registry credential issuance failed");
  await recordRegistryApiAuditEvent({
    eventType: input.rotatedFromId ? "ROTATED" : "ISSUED",
    decision: "ALLOW",
    reasonCode: input.rotatedFromId ? "credential_rotated" : "credential_issued",
    httpStatus: 201,
    credentialId,
    clientId: client.id,
    ownerUserId: client.ownerUserId,
    actorUserId: input.actorUserId,
  });
  return { credential: withoutCredentialDigest(credential), scopes: input.scopes, key: material.key };
}

export async function rotateRegistryApiCredential(input: { actorUserId: number; credentialId: number; expiresAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const [predecessor] = await db.select().from(registryApiCredentials).where(eq(registryApiCredentials.id, input.credentialId)).limit(1);
  if (!predecessor || predecessor.status === "REVOKED") throw new Error("Registry credential not found or revoked");
  const scopes = await getCredentialScopes(predecessor.id);
  const successor = await issueRegistryApiCredential({
    actorUserId: input.actorUserId,
    clientId: predecessor.clientId,
    name: `${predecessor.name} (rotated)`,
    scopes,
    expiresAt: input.expiresAt,
    rotatedFromId: predecessor.id,
  });
  await db.update(registryApiCredentials).set({
    status: "ROTATING",
    rotationGraceExpiresAt: new Date(Date.now() + ROTATION_OVERLAP_MS),
  }).where(eq(registryApiCredentials.id, predecessor.id));
  return successor;
}

export async function revokeRegistryApiCredential(input: { actorUserId: number; credentialId: number }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const [credential] = await db.select().from(registryApiCredentials).where(eq(registryApiCredentials.id, input.credentialId)).limit(1);
  if (!credential) throw new Error("Registry credential not found");
  await db.update(registryApiCredentials).set({ status: "REVOKED", revokedAt: new Date() }).where(eq(registryApiCredentials.id, credential.id));
  const { client } = await getRegistryClientWithScopes(credential.clientId);
  await recordRegistryApiAuditEvent({
    eventType: "REVOKED",
    decision: "ALLOW",
    reasonCode: "credential_revoked",
    httpStatus: 200,
    credentialId: credential.id,
    clientId: credential.clientId,
    ownerUserId: client.ownerUserId,
    actorUserId: input.actorUserId,
  });
}

export async function revokeRegistryApiClient(input: { actorUserId: number; clientId: number }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Registry database unavailable");
  const [client] = await db.select().from(registryApiClients).where(eq(registryApiClients.id, input.clientId)).limit(1);
  if (!client) throw new Error("Registry client not found");
  const now = new Date();
  await db.update(registryApiClients).set({ status: "REVOKED" }).where(eq(registryApiClients.id, client.id));
  await db.update(registryApiCredentials).set({ status: "REVOKED", revokedAt: now }).where(eq(registryApiCredentials.clientId, client.id));
  await recordRegistryApiAuditEvent({
    eventType: "REVOKED",
    decision: "ALLOW",
    reasonCode: "client_revoked",
    httpStatus: 200,
    clientId: client.id,
    ownerUserId: client.ownerUserId,
    actorUserId: input.actorUserId,
  });
}

export async function authenticateRegistryCredential(rawCredential: string): Promise<RegistryCredentialDecision> {
  const parsed = parseRegistryCredential(rawCredential);
  if (!parsed) return { ok: false, httpStatus: 401, reasonCode: "invalid_credential" };
  const db = await getDb();
  if (!db) return { ok: false, httpStatus: 401, reasonCode: "credential_service_unavailable" };
  const [credential] = await db.select().from(registryApiCredentials).where(eq(registryApiCredentials.keyId, parsed.keyId)).limit(1);
  if (!credential || !registryCredentialDigestsMatch(credential.secretHash, rawCredential)) {
    return { ok: false, httpStatus: 401, reasonCode: "invalid_credential" };
  }
  const [client] = await db.select().from(registryApiClients).where(eq(registryApiClients.id, credential.clientId)).limit(1);
  const now = new Date();
  if (credential.status === "ROTATING" && credential.rotationGraceExpiresAt && credential.rotationGraceExpiresAt.getTime() <= now.getTime()) {
    await db.update(registryApiCredentials).set({ status: "REVOKED", revokedAt: now }).where(eq(registryApiCredentials.id, credential.id));
    return { ok: false, httpStatus: 401, reasonCode: "credential_rotated_out" };
  }
  if (!client || client.status !== "ACTIVE" || !activeCredentialStatus(credential.status, credential.rotationGraceExpiresAt, now) || credential.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, httpStatus: 401, reasonCode: "credential_inactive" };
  }
  const scopes = await getCredentialScopes(credential.id);
  return {
    ok: true,
    principal: {
      credentialId: credential.id,
      clientId: client.id,
      ownerUserId: client.ownerUserId,
      keyId: credential.keyId,
      environment: client.environment,
      scopes,
      dailyLimit: credential.dailyLimit,
    },
  };
}

export async function authorizeRegistryCredential(rawCredential: string, requiredScope: RegistryR1Scope): Promise<RegistryCredentialDecision> {
  const authenticated = await authenticateRegistryCredential(rawCredential);
  if (!authenticated.ok) return authenticated;
  if (!authenticated.principal.scopes.includes(requiredScope)) {
    return { ok: false, httpStatus: 403, reasonCode: "scope_denied" };
  }
  return authenticated;
}

export async function consumeRegistryCredentialQuota(principal: RegistryCredentialPrincipal): Promise<RegistryCredentialDecision> {
  const db = await getDb();
  if (!db) return { ok: false, httpStatus: 401, reasonCode: "credential_service_unavailable" };
  const [credential] = await db.select().from(registryApiCredentials).where(eq(registryApiCredentials.id, principal.credentialId)).limit(1);
  if (!credential) return { ok: false, httpStatus: 401, reasonCode: "invalid_credential" };
  const now = new Date();
  const resetAt = credential.resetAt;
  if (!resetAt || now.getTime() - resetAt.getTime() >= 86_400_000) {
    await db.update(registryApiCredentials).set({ usageToday: 0, resetAt: now }).where(eq(registryApiCredentials.id, credential.id));
    credential.usageToday = 0;
  }
  if (credential.usageToday >= credential.dailyLimit) return { ok: false, httpStatus: 429, reasonCode: "quota_exceeded" };
  const updateResult = await db.update(registryApiCredentials).set({
    usageToday: credential.usageToday + 1,
    usageTotal: credential.usageTotal + 1,
    lastUsedAt: now,
  }).where(and(
    eq(registryApiCredentials.id, credential.id),
    sql`${registryApiCredentials.usageToday} < ${registryApiCredentials.dailyLimit}`,
  ));
  if (((updateResult as Array<{ affectedRows?: number }>)[0]?.affectedRows ?? 0) === 0) {
    return { ok: false, httpStatus: 429, reasonCode: "quota_exceeded" };
  }
  return { ok: true, principal };
}
