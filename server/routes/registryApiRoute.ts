import { createHash, randomBytes } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import {
  authorizeRegistryCredential,
  authenticateRegistryCredential,
  consumeRegistryCredentialQuota,
  recordRegistryApiAuditEvent,
  type RegistryCredentialPrincipal,
} from "../registry/credentialService";
import { getRegistryCredentialPepper } from "../registry/credentialCrypto";
import {
  findPublicRegistryWork,
  getPublicRegistryCreator,
  getPublicRegistryPermissions,
  getPublicRegistryProvenance,
  listPublicRegistryCreatorWorks,
  registryCapabilities,
  searchPublicRegistryWorks,
} from "../registry/readService";
import type { RegistryR1Scope } from "../registry/scopes";

export const registryApiRouter = Router();
const BASE_PATH = "/api/registry/v1";

type RegistryRequest = Request & { registry?: { requestId: string; principal?: RegistryCredentialPrincipal; requiredScopes?: RegistryR1Scope[]; startedAt: number } };

function envelope(requestId: string, data: unknown, options?: { provenanceRefs?: string[]; nextCursor?: string | null; error?: { code: string; message: string } }) {
  return {
    apiVersion: "registry.v1",
    requestId,
    source: "living_nexus_registry",
    data,
    provenanceRefs: options?.provenanceRefs ?? [],
    nextCursor: options?.nextCursor ?? null,
    ...(options?.error ? { error: options.error } : {}),
  };
}

function requestId() { return `req_${randomBytes(12).toString("base64url")}`; }
function auditHash(value: string | undefined) { return value ? createHash("sha256").update(value, "utf8").digest("hex") : null; }

async function audit(req: RegistryRequest, eventType: "ACCESS_ALLOWED" | "ACCESS_DENIED", decision: "ALLOW" | "DENY", reasonCode: string, httpStatus: number) {
  try {
    const registry = req.registry;
    await recordRegistryApiAuditEvent({
      eventType,
      decision,
      reasonCode,
      httpStatus,
      requestId: registry?.requestId,
      credentialId: registry?.principal?.credentialId ?? null,
      clientId: registry?.principal?.clientId ?? null,
      ownerUserId: registry?.principal?.ownerUserId ?? null,
      routeId: `${req.method} ${req.route?.path ?? req.path}`,
      requiredScope: registry?.requiredScopes?.[0] ?? null,
      latencyMs: registry ? Date.now() - registry.startedAt : null,
      rateLimitBucket: registry?.principal ? `credential:${registry.principal.credentialId}:daily` : null,
      queryHash: auditHash(typeof req.query.q === "string" ? req.query.q : undefined),
      ipHash: auditHash(req.ip),
      userAgentHash: auditHash(req.get("user-agent")),
    });
  } catch (error) {
    console.error("[Registry R1] sanitized audit write failed", { message: error instanceof Error ? error.message : "unknown" });
  }
}

function respond(req: RegistryRequest, res: Response, status: number, data: unknown, options?: { provenanceRefs?: string[]; nextCursor?: string | null; error?: { code: string; message: string } }) {
  return res.status(status).json(envelope(req.registry?.requestId ?? requestId(), data, options));
}

function requireRegistryScopes(requiredScopes: RegistryR1Scope[], mode: "required" | "optional" = "required") {
  return async (req: RegistryRequest, res: Response, next: NextFunction) => {
    req.registry = { requestId: requestId(), requiredScopes, startedAt: Date.now() };
    const header = req.get("authorization") ?? "";
    const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!raw && mode === "optional") return next();
    if (!raw) {
      await audit(req, "ACCESS_DENIED", "DENY", "missing_credential", 401);
      return respond(req, res, 401, null, { error: { code: "UNAUTHORIZED", message: "A Registry service credential is required." } });
    }
    let principal: RegistryCredentialPrincipal | undefined;
    for (const scope of requiredScopes) {
      const decision = await authorizeRegistryCredential(raw, scope);
      if (!decision.ok) {
        await audit(req, "ACCESS_DENIED", "DENY", decision.reasonCode, decision.httpStatus);
        return respond(req, res, decision.httpStatus, null, { error: { code: decision.reasonCode.toUpperCase(), message: "Registry credential access was denied." } });
      }
      principal = decision.principal;
    }
    const quota = await consumeRegistryCredentialQuota(principal!);
    if (!quota.ok) {
      await audit(req, "ACCESS_DENIED", "DENY", quota.reasonCode, quota.httpStatus);
      return respond(req, res, quota.httpStatus, null, { error: { code: quota.reasonCode.toUpperCase(), message: "Registry credential quota was exceeded." } });
    }
    req.registry.principal = principal;
    next();
  };
}

registryApiRouter.use(BASE_PATH, (_req, res, next) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
    "Cache-Control": "no-store",
  });
  next();
});

registryApiRouter.options(`${BASE_PATH}/*`, (_req, res) => res.status(204).end());

registryApiRouter.get(`${BASE_PATH}/health`, (req: RegistryRequest, res) => {
  req.registry = { requestId: requestId(), startedAt: Date.now() };
  try {
    getRegistryCredentialPepper();
    return respond(req, res, 200, { status: "ok", service: "registry", credentialDigest: "ready" });
  } catch {
    return respond(req, res, 503, { status: "unavailable", service: "registry" }, { error: { code: "REGISTRY_CREDENTIAL_DIGEST_UNAVAILABLE", message: "Registry credential digest service is unavailable." } });
  }
});

registryApiRouter.get(`${BASE_PATH}/capabilities`, requireRegistryScopes(["registry:capabilities:read"], "optional"), async (req: RegistryRequest, res) => {
  await audit(req, "ACCESS_ALLOWED", "ALLOW", "capabilities_read", 200);
  return respond(req, res, 200, registryCapabilities());
});

registryApiRouter.get(`${BASE_PATH}/search`, requireRegistryScopes(["registry:search:read"]), async (req: RegistryRequest, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return respond(req, res, 400, null, { error: { code: "INVALID_QUERY", message: "Search requires at least two characters." } });
  const page = await searchPublicRegistryWorks({ q, type: typeof req.query.type === "string" ? req.query.type : undefined, cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined, limit: req.query.limit });
  await audit(req, "ACCESS_ALLOWED", "ALLOW", "public_search", 200);
  return respond(req, res, 200, { items: page.items }, { nextCursor: page.nextCursor });
});

registryApiRouter.get(`${BASE_PATH}/autocomplete`, requireRegistryScopes(["registry:search:read"]), async (req: RegistryRequest, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return respond(req, res, 400, null, { error: { code: "INVALID_QUERY", message: "Autocomplete requires at least two characters." } });
  const page = await searchPublicRegistryWorks({ q, type: typeof req.query.type === "string" ? req.query.type : undefined, limit: Math.min(Number(req.query.limit ?? 8), 8) });
  await audit(req, "ACCESS_ALLOWED", "ALLOW", "public_autocomplete", 200);
  return respond(req, res, 200, { suggestions: page.items.map((item) => ({ wid: item.wid, title: item.title, creator: item.creator })) });
});

registryApiRouter.get(`${BASE_PATH}/creators/:handle`, requireRegistryScopes(["registry:creators:read"]), async (req: RegistryRequest, res) => {
  const creator = await getPublicRegistryCreator(req.params.handle);
  if (!creator) {
    await audit(req, "ACCESS_DENIED", "DENY", "resource_not_found", 404);
    return respond(req, res, 404, null, { error: { code: "NOT_FOUND", message: "Public Registry creator not found." } });
  }
  await audit(req, "ACCESS_ALLOWED", "ALLOW", "public_creator_read", 200);
  return respond(req, res, 200, creator);
});

registryApiRouter.get(`${BASE_PATH}/creators/:handle/works`, requireRegistryScopes(["registry:creators:read", "registry:works:read"]), async (req: RegistryRequest, res) => {
  const page = await listPublicRegistryCreatorWorks({ handle: req.params.handle, cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined, limit: req.query.limit });
  if (!page) {
    await audit(req, "ACCESS_DENIED", "DENY", "resource_not_found", 404);
    return respond(req, res, 404, null, { error: { code: "NOT_FOUND", message: "Public Registry creator not found." } });
  }
  await audit(req, "ACCESS_ALLOWED", "ALLOW", "public_creator_works_read", 200);
  return respond(req, res, 200, { items: page.items }, { nextCursor: page.nextCursor });
});

registryApiRouter.get(`${BASE_PATH}/works/:wid`, requireRegistryScopes(["registry:works:read", "registry:wids:read"], "optional"), async (req: RegistryRequest, res) => {
  const work = await findPublicRegistryWork(req.params.wid);
  if (!work) return respond(req, res, 404, null, { error: { code: "NOT_FOUND", message: "Public Registry Work not found." } });
  if (req.registry?.principal) await audit(req, "ACCESS_ALLOWED", "ALLOW", "public_work_read", 200);
  return respond(req, res, 200, work, { provenanceRefs: [work.verificationUrl] });
});

registryApiRouter.get(`${BASE_PATH}/works/:wid/provenance`, requireRegistryScopes(["registry:provenance:read"], "optional"), async (req: RegistryRequest, res) => {
  const provenance = await getPublicRegistryProvenance(req.params.wid);
  if (!provenance) return respond(req, res, 404, null, { error: { code: "NOT_FOUND", message: "Public Registry provenance not found." } });
  if (req.registry?.principal) await audit(req, "ACCESS_ALLOWED", "ALLOW", "public_provenance_read", 200);
  return respond(req, res, 200, provenance, { provenanceRefs: [`https://www.livingnexus.org/verify/${provenance.wid}`] });
});

registryApiRouter.get(`${BASE_PATH}/works/:wid/permissions`, requireRegistryScopes(["registry:permissions:read"]), async (req: RegistryRequest, res) => {
  const permissions = await getPublicRegistryPermissions(req.params.wid);
  if (!permissions) {
    await audit(req, "ACCESS_DENIED", "DENY", "resource_not_found", 404);
    return respond(req, res, 404, null, { error: { code: "NOT_FOUND", message: "Public Registry Work not found." } });
  }
  await audit(req, "ACCESS_ALLOWED", "ALLOW", "public_permissions_read", 200);
  return respond(req, res, 200, permissions);
});

registryApiRouter.all(`${BASE_PATH}/*`, async (req: RegistryRequest, res) => {
  req.registry = req.registry ?? { requestId: requestId(), startedAt: Date.now() };
  const deniedSegments = ["registration", "register", "queue", "library", "testimony", "corpus", "policy"];
  if (deniedSegments.some((segment) => req.path.toLowerCase().includes(segment))) {
    const header = req.get("authorization") ?? "";
    const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!raw) {
      await audit(req, "ACCESS_DENIED", "DENY", "missing_credential", 401);
      return respond(req, res, 401, null, { error: { code: "UNAUTHORIZED", message: "A Registry service credential is required." } });
    }
    const authenticated = await authenticateRegistryCredential(raw);
    if (!authenticated.ok) {
      await audit(req, "ACCESS_DENIED", "DENY", authenticated.reasonCode, authenticated.httpStatus);
      return respond(req, res, authenticated.httpStatus, null, { error: { code: authenticated.reasonCode.toUpperCase(), message: "Registry credential access was denied." } });
    }
    const quota = await consumeRegistryCredentialQuota(authenticated.principal);
    if (!quota.ok) {
      await audit(req, "ACCESS_DENIED", "DENY", quota.reasonCode, quota.httpStatus);
      return respond(req, res, quota.httpStatus, null, { error: { code: quota.reasonCode.toUpperCase(), message: "Registry credential quota was exceeded." } });
    }
    req.registry.principal = authenticated.principal;
    await audit(req, "ACCESS_DENIED", "DENY", "delegated_authorization_required", 403);
    return respond(req, res, 403, null, { error: { code: "DELEGATED_AUTHORIZATION_REQUIRED", message: "Private creator material and Registry authority require delegated Living Nexus user authorization outside R1." } });
  }
  await audit(req, "ACCESS_DENIED", "DENY", "method_or_feature_not_available", 405);
  return respond(req, res, 405, null, { error: { code: "METHOD_NOT_ALLOWED", message: "Registry R1 is read-only." } });
});

registryApiRouter.use(BASE_PATH, async (error: unknown, req: RegistryRequest, res: Response, _next: NextFunction) => {
  req.registry = req.registry ?? { requestId: requestId(), startedAt: Date.now() };
  await audit(req, "ACCESS_DENIED", "DENY", "internal_error", 500);
  console.error("[Registry R1] request failed", { requestId: req.registry.requestId, message: error instanceof Error ? error.message : "unknown" });
  return respond(req, res, 500, null, { error: { code: "INTERNAL_ERROR", message: "Registry request could not be completed." } });
});
