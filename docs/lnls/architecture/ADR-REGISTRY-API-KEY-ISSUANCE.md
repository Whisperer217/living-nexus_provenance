# ADR — Registry API and Scoped Key Issuance

**Status:** Proposed — implementation requires Keeper approval  
**Date:** 2026-09-11  
**Decision owner:** Living Nexus Keeper  
**Scope:** A dedicated integration boundary for Registry data. This is **not** direct database access.

## Decision

Living Nexus will expose Registry information through a new, versioned, service-owned API surface, proposed as **`/api/registry/v1`**. The API will return typed, field-allowlisted projections produced by Registry services; it will never expose database connectivity, SQL, table-shaped records, private storage keys, signing keys, or arbitrary query capability.

The existing `apiKeys` foundation will be evolved into a scoped credential system. Keys will be high-entropy bearer secrets displayed exactly once, stored only as hashes, linked to an accountable creator or approved integration, constrained by explicit scopes, expiry, lifecycle state, rate policy, and append-only audit evidence. A key will be an authorization credential for a narrow API capability; it will never be a creator's provenance private key, a substitute for OAuth-based delegated access, or a permission to modify a WID or testimony.

> **Registry rule:** A connection may read a governed projection of a record or submit a governed registration request. It may not access or mutate the Registry database itself.

## Current-State Findings

Living Nexus already has a useful but fragmented foundation. The canonical `GET /api/work/:wid` route is read-only, carries an explicit `WID/1.0` protocol header, rejects mutation methods, and applies a public-visibility gate before it returns a work record. The existing broader `/api/v1` surface, however, mixes catalog, streaming, creator, verification, registration, and machine-consumer endpoints. Its routes do not yet use one common Registry projection or one uniform visibility policy. Some endpoints query `songs` directly and expose fields that should be reviewed before they become a formal integration promise.

The present `apiKeys` record stores an owner, bcrypt hash, non-secret display prefix, tier, daily counters, active/revoked state, and timestamps. Creator-facing procedures already support create, list, and revoke, and `POST /api/v1/works/register` validates a bearer key. The current model has **no scopes, expiry, integration identity, rotation lineage, issuer attribution, per-key access audit, or distributed rate-limit authority**. It must not simply be opened wider.

| Existing asset | Safe role in the future design | Gap to close |
|---|---|---|
| `server/routes/workRoute.ts` | Canonical public WID read policy and read-only posture | Extract its visibility and field policy into a reusable Registry projection service. |
| `server/routes/publicApiRoute.ts` | Compatibility surface for current integrations | Do not add new Registry capabilities here; deprecate unsafe or inconsistent projections only through a versioned migration. |
| `apiKeys` / `createApiKey` / `validateApiKey` | One-time secret issuance, bcrypt hashing, key prefix lookup, owner attribution | Add key IDs, scopes, expiry, rotation/revocation attribution, client identity, and audit. |
| `apiKeyRouter` | Creator-owned self-service key lifecycle shell | Add scope selection only from an allowlist and retain one-time secret display. |
| `adminControlPlane` / admin logs | Read-only operational observation | Keep it read-only; key approval or emergency revocation must be a separately authorized, audited control. |
| WID, provenance, testimony records | Source of truth for immutable evidence | Never grant key-based mutation of WID, evidence, signature, or testimony records. |

## Resource Boundary

The Registry API should describe resources, not database tables. Every endpoint must authenticate and authorize locally, validate input, and return a purpose-built response. HTTPS, per-endpoint authorization, input validation, appropriate HTTP status codes, generic error responses, and security-event audit logging are baseline API controls.[1] NIST likewise frames API protection as a lifecycle concern with both pre-runtime and runtime controls.[2]

| Resource class | Proposed route family | Access posture | Allowed data |
|---|---|---|---|
| **Public verification** | `GET /api/registry/v1/works/{wid}` | Public, rate-limited | Public WID identity, signed/provenance verification fields, public creator identity, declared public disclosure, canonical URLs. |
| **Public discovery** | `GET /api/registry/v1/works`, `GET /api/registry/v1/creators/{handle}/works` | Public, rate-limited | Published + `isPublic=true` projections only; cursor pagination; no raw storage URLs. |
| **Partner verified read** | Same resources with a scoped key | Key-authenticated | Same public fields plus carefully approved, documented enrichment where it is lawful and creator-authorized. Keys govern quota and attribution—not a bypass of visibility. |
| **Registration submission** | Future `POST /api/registry/v1/registration-requests` | `registry.registration.submit` only | Strictly validated submission to the existing registration authority; no arbitrary table writes and no direct WID mutation. |
| **Owner-private access** | Future, separate OAuth/delegated flow | OAuth/consent, not static key alone | Only a creator's explicitly consented private projection. This is out of the first Registry API slice. |
| **Administrative operations** | Internal control plane only | Strong admin authorization and audit | Client approval, emergency key revocation, incident response. Never exposed as a public Registry resource. |

The initial Registry API must be **read-only**. Existing registration by key remains a compatibility concern and must be separately migrated behind an explicit `registry.registration.submit` scope only after its WID/provenance contract is re-tested. Read API delivery should not add a new WID-issuing path.

## Scope Model

Scopes are fixed server-owned strings. A request must pass three tests: valid active credential, requested scope, and resource-level policy. A scope cannot override public visibility, creator ownership, publication state, testimony custody, or Registry immutability.

| Scope | Intended holder | Capability | Explicit exclusions |
|---|---|---|---|
| `registry.public.read` | Approved partner or service | Higher governed quota for public WID lookup and discovery | No drafts, unlisted/deleted records, private testimony, raw files, database access. |
| `registry.verify.read` | Verifier, bridge, archive client | Canonical public WID/evidence verification | No search harvest beyond its rate policy; no mutation. |
| `registry.search.read` | Discovery partner | Cursor-paginated public discovery | No arbitrary SQL/filtering, no full database export. |
| `registry.registration.submit` | Creator-owned tool after review | Submit a strict registration request through the existing authority | No direct WID/provenance edit, publication bypass, creator impersonation, or arbitrary asset/storage write. |
| `registry.webhook.receive` | Future trusted integration | Receive a narrow signed event stream after explicit consent | No read or write authority by itself. |

There is deliberately **no** scope such as `database.read`, `database.write`, `wid.write`, `provenance.write`, `testimony.write`, `admin`, or `all`. High-value or sensitive resources must not rely exclusively on an API key.[1] A future server-to-server integration that needs stronger assurance than a scoped key should use an approved confidential-client flow with application permissions or certificate/federated credentials; application identities must receive their own direct authorization rather than impersonate a creator.[3]

## Key Issuance and Lifecycle

The first implementation should retain the creator-facing Developer Keys concept but make issuance explicit and reviewable.

1. **Create an integration identity.** The creator names the tool, selects only eligible scopes, states intended use, and acknowledges the data boundary. Partner/service keys require Keeper approval before activation.
2. **Issue a secret once.** Generate at least 256 bits of cryptographic randomness. Return a key formatted with a non-secret key ID and environment marker, for example `lnr_live_k_<key-id>_<secret>`. The response displays the secret once; only its bcrypt or Argon2id hash is stored. The secret never appears in list, audit, support, analytics, browser URL, or logs.
3. **Persist policy.** Store key ID, integration/client ID, owner or approving actor, granted scopes, active state, issued/expiry/last-used/revoked timestamps, quotas, optional server-to-server allowlist policy, and rotation predecessor. A normalized `api_key_scopes` table is preferred over free-form JSON for queryability and constraint enforcement.
4. **Validate every protected call.** Parse only `Authorization: Bearer`, look up exact key ID, verify the hash, check active/revoked/expiry state, enforce requested scope and resource policy, apply a shared rate limit, then attach a minimal principal object. No key is passed to downstream URLs or client JavaScript.
5. **Rotate safely.** Issue a successor key with a short overlap window, then revoke the predecessor. Emergency revoke is immediate and propagates before the next protected call. Revocation never alters a Work, WID, provenance event, or creator record.
6. **Audit without secret leakage.** Record issuance, scope grant/denial, activation, rotation, revocation, material policy changes, and request outcomes. Store key ID—not key material—plus actor, integration, requested route/scope, correlation ID, timestamp, outcome class, and privacy-minimized network metadata. Security-related events should be logged before and after they occur, with log data sanitized.[1]

| Lifecycle state | Meaning | Request behavior |
|---|---|---|
| `pending_approval` | Requested but not activated | Deny. |
| `active` | Current permitted credential | Allow only within scopes, policy, and quota. |
| `rotating` | Successor exists during overlap | Existing and successor are independently scoped/audited until predecessor revocation. |
| `expired` | Time bound reached | Deny with a non-sensitive reissue instruction. |
| `revoked` | Owner or authorized steward ended access | Deny immediately; preserve audit evidence. |
| `suspended` | Incident/risk hold | Deny until explicit resolution; retain reason and actor in audit. |

## Proposed Data Model — Approval Gate Only

No schema change is authorized by this ADR. If approved, the smallest migration should extend, not replace, the existing `apiKeys` table and add separate child/event tables.

| Model | Minimal responsibility |
|---|---|
| `api_keys` (extend existing) | Immutable key ID and display prefix; secret hash; owner/integration; active lifecycle; expiry; quotas; last use; rotation lineage; issuance/revocation actor fields. |
| `api_key_scopes` | One server-allowlisted scope per key. No arbitrary scope text accepted from the client. |
| `api_clients` | Named integration identity, owner/partner relationship, approval state, optional public client metadata, policy version. |
| `api_key_audit_events` | Append-only lifecycle and access-decision evidence; no secret material or raw sensitive payload. |
| shared rate-limit store | Counter/window state outside the primary Registry tables; implementation choice remains open until hosting constraints are confirmed. |

## Required Service Design

The implementation must create a small Registry service layer rather than let Express routes query `songs`, `users`, events, or storage tables directly. The service owns: WID format validation, public visibility predicates, creator-safe field projection, provenance/event projection, cursor pagination, response schema version, and no-store/cache policy per resource class.

Compatibility routes may delegate into that service during migration. The existing `/api/work/:wid` behavior is the reference for canonical public visibility, but its data contract must be reviewed against the narrower `RegistryWorkProjection` before it becomes the new API representation. In particular, raw file/storage URLs, private origin/testimony, internal identifiers, unpublished state, and database-shaped records do not belong in a general Registry response.

## Controls and Non-Negotiables

| Control | Required behavior |
|---|---|
| Transport | HTTPS only; no secrets in query strings.[1] |
| CORS | Public read resources may use documented public CORS. Key-protected browser routes must use a strict allowlist; server-to-server consumers do not need permissive browser CORS. |
| Authentication | Bearer key only in header for scoped keys; OAuth/consent for future delegated private access. |
| Authorization | Scope **and** resource policy on every protected endpoint. No scope bypasses publication/visibility or ownership predicates. |
| Input/output | Zod schema for every request; exact response DTOs; size limits; no arbitrary metadata/table filtering. |
| Rate limiting | Shared/edge-backed policy keyed by credential and IP/client context; separate public and partner budgets. |
| Idempotency | Registration submissions require a client idempotency key and server-side workflow-state validation; replay must not issue another WID. |
| Observability | Correlation IDs, sanitized security audit events, response status metrics, alerting for deny spikes/revocations. |
| Secrets | One-time display; hash at rest; no logs, URLs, browser storage, analytics, or client bundle inclusion. |
| Custody | API keys never become provenance keys. WID, testimony, evidence, and creator declaration authority remain as they are. |

## Rollout Sequence

| Phase | Deliverable | Gate |
|---|---|---|
| R0 — inventory | Contract inventory, field classification, OpenAPI drift review, threat model | Keeper approves the public/partner/private matrix. |
| R1 — read-only Registry API | `registry/v1` service, canonical public work/creator/search projections, cursor pagination, tests | No key issuance changes; legacy endpoints unchanged. |
| R2 — scoped key lifecycle | Add migration, issuance/revoke/rotate flows, audit, shared limits, Developer Keys UX | Security review; no private/delegated scopes. |
| R3 — compatibility migration | Route current registration API through scope enforcement and idempotent submission authority | Byte-for-byte WID/provenance behavior and no duplicate-WID proof. |
| R4 — consented private integrations | OAuth/delegated capability design | Separate ADR and explicit creator-consent model. |

## Risks and Rejected Alternatives

| Alternative | Decision | Reason |
|---|---|---|
| Direct database credentials or SQL endpoint | Rejected | Destroys field, visibility, audit, tenancy, and custody boundaries. |
| One global integration secret | Rejected | Cannot attribute, scope, revoke selectively, or rotate safely. |
| Reuse creator session cookie as API credential | Rejected | Browser sessions and machine integrations have different exposure, expiry, and consent properties. |
| Static key for private creator data | Deferred/rejected for first slice | Private access needs consented delegated authorization and narrower resource policy. |
| Allow every existing `/api/v1` route to inherit scopes | Rejected | Existing route policies are not uniform enough to be a Registry contract. |
| Key permits WID/testimony/provenance mutation | Rejected | Conflicts with Registry immutability and creator custody. |

## Validation Required Before Implementation Is Declared Complete

The future implementation must include migration tests, one-time secret tests, hash/non-disclosure tests, scope allow/deny matrices, expiry/revocation/rotation tests, shared-rate-limit tests, public-visibility and deleted/unlisted suppression tests, request schema tests, no-secret-in-audit/log tests, idempotent-registration/no-duplicate-WID tests, OpenAPI contract tests, admin and creator authorization tests, and endpoint-level threat tests. It must also pass `pnpm check`, full regression, production build, refinement without score decrease, and a manually reviewed partner key flow in a non-production environment.

## References

[1]: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html "OWASP REST Security Cheat Sheet"
[2]: https://csrc.nist.gov/pubs/sp/800/228/ipd "NIST SP 800-228 — Guidelines for API Protection for Cloud-Native Systems"
[3]: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow "OAuth 2.0 client credentials flow — Microsoft Identity Platform"
