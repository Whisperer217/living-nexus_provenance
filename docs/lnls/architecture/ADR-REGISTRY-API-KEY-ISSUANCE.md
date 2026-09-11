# ADR — Registry API and Scoped Key Issuance

**Status:** Proposed — implementation requires Keeper approval  
**Date:** 2026-09-11  
**Decision owner:** Living Nexus Keeper  
**Scope:** A dedicated integration boundary for Registry data. This is **not** direct database access.

## Decision

Living Nexus will expose Registry information through a new, versioned, service-owned API surface. Its canonical external base URL is **`https://api.livingnexus.org/registry/v1`**; the Living Nexus application may initially mount the same contract at **`/api/registry/v1`** behind an adapter or gateway. Clients must use configured base URLs rather than hard-coded application paths. The API will return typed, field-allowlisted projections produced by Registry services; it will never expose database connectivity, SQL, table-shaped records, private storage keys, signing keys, or arbitrary query capability.

The existing `apiKeys` foundation will be evolved additively into an **administratively created API-client and scoped-credential system**. An authorized Living Nexus administrator creates the Nexus client, assigns its maximum scopes and quota server-side, and controls its environment and lifecycle. The server generates each high-entropy bearer credential, displays it exactly once, and stores only its selector, prefix, keyed digest, client identity, allowed scopes, and expiry. A credential authorizes a narrow API capability; it is never a creator's provenance private key, a substitute for delegated Living Nexus user authorization, or a permission to modify a WID or testimony.

> **Registry rule:** R1 may read a governed public projection of a record. It may not access or mutate the Registry database itself. Registration and every other mutation remain outside R1.

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
| **Public verification** | `GET /health`, `GET /capabilities`, `GET /works/{wid}` | None or aggressively limited anonymous access | Health/capabilities and public WID identity, public provenance verification fields, public creator identity, declared public disclosure, canonical URLs. |
| **Registered catalog integration** | `GET /search`, `GET /autocomplete`, `GET /creators/{handle}`, `GET /creators/{handle}/works`, `GET /works/{wid}`, `GET /works/{wid}/provenance`, `GET /works/{wid}/permissions` | Scoped service key | Published + `isPublic=true` Registry projections only, cursor pagination, public artwork/permission summaries, and no raw storage URLs. Keys govern quota and attribution—not a bypass of visibility. |
| **Owner-private access** | Future, separate OAuth/delegated flow | OAuth/consent, not static key alone | Only a creator's explicitly consented private projection. This is out of the first Registry API slice. |
| **Administrative operations** | Internal control plane only | Strong admin authorization and audit | Client approval, emergency key revocation, incident response. Never exposed as a public Registry resource. |

Every Registry response uses the stable envelope `{ apiVersion, requestId, source, data, provenanceRefs, nextCursor }`, where `apiVersion` is `registry.v1` and `source` is `living_nexus_registry`. Search `type` is an allowlisted enum (`all`, `creator`, `work`, `wid`, `tag`, `genre`, or `style`); unsupported concepts produce a typed `NOT_CONNECTED` capability result rather than falling through to model inference. Public availability, registration, AI permission, and current/user context remain separate fields. A Registry response never asserts user-context membership without an authorized user-context service.

The initial Registry API is **read-only**. Existing registration-by-key behavior is frozen as a compatibility concern and must not silently gain Registry-read authority. A future registration submission capability requires a distinct ADR, explicit human authority, idempotency, and byte-for-byte WID/provenance regression proof.

## Scope Model

Scopes are fixed server-owned strings. A request must pass three tests: valid active credential, requested scope, and resource-level policy. A scope cannot override public visibility, creator ownership, publication state, testimony custody, or Registry immutability.

| Scope | Intended holder | Capability | Explicit exclusions |
|---|---|---|---|
| `registry:capabilities:read` | R1 service client | Read supported Registry capability declarations | No inference, mutation, or access to private context. |
| `registry:search:read` | R1 service client | Search and autocomplete public catalog projections | No arbitrary SQL/filtering, no full database export. |
| `registry:creators:read` | R1 service client | Resolve public creator and public creator-Work projections | No private creator corpus, drafts, or user context. |
| `registry:works:read` | R1 service client | Resolve public Work projection | No unlisted/deleted records, raw files, or database access. |
| `registry:wids:read` | R1 service client | Resolve canonical public WID data | No WID issuance, mutation, or signing-key access. |
| `registry:provenance:read` | R1 service client | Resolve public provenance references | No private testimony, private evidence, or provenance mutation. |
| `registry:permissions:read` | R1 service client | Resolve public permission summaries | No policy mutation or private entitlement disclosure. |

There is deliberately **no** R1 write scope and no scope such as `database.read`, `database.write`, `wid.write`, `provenance.write`, `testimony.write`, `queue:read`, `queue:write`, `library:read`, `creator-corpus:read`, `admin`, or `all`. Private queue, library, testimony, or creator-corpus access requires both the service-client identity and delegated Living Nexus user authorization in a future design. High-value or sensitive resources must not rely exclusively on an API key.[1] A future server-to-server integration that needs stronger assurance than a scoped key should use an approved confidential-client flow with application permissions or certificate/federated credentials; application identities must receive their own direct authorization rather than impersonate a creator.[3]

## Key Issuance and Lifecycle

R1 credentials are issued for an **administratively created Nexus API client**. This does not authorize self-service elevation by an authenticated user. Creator-facing Developer Keys may remain as a separate legacy/compatibility surface, but existing Work-registration keys must not silently gain any Registry R1 scope.

1. **Create the Nexus API client administratively.** The server assigns its client type, environment, maximum scope ceiling, quota policy, and lifecycle status. The caller may not self-select an elevated tier or scope ceiling.
2. **Issue a credential once.** Generate 32 random bytes, then return a versioned value such as `lnr_live_<key-id>_<32-byte-random-secret>` exactly once. Store the public `key_id`, display prefix, client ID, granted scope subset, expiry, and `HMAC-SHA-256` digest using a server-held pepper. Existing bcrypt version-1 credentials may remain valid only during an explicit bounded migration; new R1 credentials use version 2.
3. **Place the secret only in the Nexus server secret store.** The first-party Nexus backend stores it as `LN_REGISTRY_API_KEY`; it is never embedded in browser JavaScript, returned by a Nexus API, placed in a URL, or logged.
4. **Record non-secret issuance evidence.** Record the administrator/owner actor, client, key ID, granted scopes, expiry, environment, quota policy reference, and issuance decision—never the raw key.
5. **Validate every protected call in a fixed order.** Apply the enforcement order in the R1 plan below and attach only a minimal principal to downstream code.
6. **Rotate safely.** Issue a linked successor through `rotated_from_id`, permit only a short explicit overlap window, and revoke the predecessor at window close. Emergency revocation invalidates caches immediately and never alters a Work, WID, provenance event, or creator record.
7. **Audit without protected-material leakage.** Record lifecycle changes and request outcomes using hashes and route identifiers. Never retain raw search terms, response bodies, testimony, lyrics, private context, or secret material. Security events are sanitized before persistence.[1]

| Lifecycle state | Meaning | Request behavior |
|---|---|---|
| `pending_approval` | Requested but not activated | Deny. |
| `active` | Current permitted credential | Allow only within scopes, policy, and quota. |
| `rotating` | Successor exists during overlap | Existing and successor are independently scoped/audited until predecessor revocation. |
| `expired` | Time bound reached | Deny with a non-sensitive reissue instruction. |
| `revoked` | Owner or authorized steward ended access | Deny immediately; preserve audit evidence. |
| `suspended` | Incident/risk hold | Deny until explicit resolution; retain reason and actor in audit. |

## Locked R1 Implementation Contract

R1 is a public-read and scoped-service-read boundary. The first Nexus credential is a **first-party live client** with only the seven R1 read scopes and a finite expiry. It is a new version-2 credential, not a repurposed Work-registration key. Nexus calls the Registry from its server adapter using `LN_REGISTRY_API_BASE_URL`, `LN_REGISTRY_API_KEY`, `LN_REGISTRY_API_TIMEOUT_MS`, and `LN_REGISTRY_API_KEY_VERSION`; the Living Nexus UI calls Nexus, never the Registry with this service secret.

| Route | Credential | Required scope | Contract |
|---|---|---|---|
| `GET /health` | None | None | Operational health only; no store, key, or Registry record disclosure. |
| `GET /capabilities` | None or limited key | `registry:capabilities:read` when authenticated | Returns supported Registry concepts and typed `NOT_CONNECTED` responses for unsupported concepts. |
| `GET /search?q=&type=&cursor=&limit=` | Service key | `registry:search:read` | Cursor-paginated public catalog search over allowlisted types only. |
| `GET /autocomplete?q=&type=&limit=` | Service key | `registry:search:read` | Bounded public autocomplete; no raw search-term retention. |
| `GET /creators/:handle` | Service key | `registry:creators:read` | Public creator projection only. |
| `GET /creators/:handle/works?cursor=&limit=` | Service key | `registry:creators:read` and `registry:works:read` | Published + public Work projections only. |
| `GET /works/:wid` | None or service key | `registry:works:read` and `registry:wids:read` when authenticated | Canonical public Work/WID projection. |
| `GET /works/:wid/provenance` | None or service key | `registry:provenance:read` when authenticated | Public provenance references only. |
| `GET /works/:wid/permissions` | Service key | `registry:permissions:read` | Public permission/AI-use summary only. |

The implementation must use a single Registry response envelope:

```json
{
  "apiVersion": "registry.v1",
  "requestId": "req_...",
  "source": "living_nexus_registry",
  "data": {},
  "provenanceRefs": [],
  "nextCursor": null
}
```

No R1 route accepts a mutation method. `POST`, `PUT`, `PATCH`, and `DELETE` on R1 resources must fail closed with a typed method/feature response. No route returns an ORM row, raw database identifier unless it is already a public Registry identifier, storage credential, raw search term, private queue, private library, private testimony, creator corpus, or policy-edit control.

### Credential v2 Schema Lock

The migration is additive. It preserves existing `apiKeys` and bcrypt version-1 validation during a bounded compatibility window, while R1 requires the following new concepts.

| Table or extension | Required fields and constraints |
|---|---|
| `api_clients` | `id`, `owner_user_id`, `name`, `client_type` (`FIRST_PARTY`, `PARTNER`, `PERSONAL`), `environment` (`TEST`, `LIVE`), `status` (`ACTIVE`, `SUSPENDED`, `REVOKED`), server-owned maximum-scope policy, quota-policy reference, `created_at`, `updated_at`. Creation and ceiling assignment are administrative. |
| `api_credentials` or additive `api_keys` v2 fields | `id`, public unique `key_id`, `client_id`, `key_prefix`, version-2 `secret_hash` (HMAC-SHA-256 with server-held pepper), `expires_at`, `last_used_at`, `revoked_at`, `rotated_from_id`, `created_by_user_id`, `created_at`. The full secret is never persisted. |
| `api_key_scopes` | Credential foreign key plus a fixed, server-allowlisted R1 scope. Grant must be a subset of the parent client's maximum scope policy. |
| `api_access_events` | `request_id`, `occurred_at`, `credential_id`, `client_id`, `owner_user_id`, `route_id`, `required_scope`, `decision`, `reason_code`, `http_status`, `latency_ms`, `rate_limit_bucket`, `query_hash`, `ip_hash`, `user_agent_hash`. No raw search, response, lyrics, testimony, private context, or secret. |

### Enforcement Order

Every protected request follows this order. Authentication, authorization, quota accounting, and audit are separate outcomes; a rate-limited valid credential receives `429`, not an indistinguishable authentication failure.

```text
TLS / canonical host boundary
→ parse credential version and public key_id from Authorization: Bearer
→ indexed credential lookup
→ constant-time keyed-digest comparison
→ client and credential lifecycle status
→ expiry
→ route-required scope
→ rate and abuse policy
→ public resource visibility and creator policy
→ execute the typed Registry read model
→ write sanitized ALLOW or DENY access event
→ return the typed response
```

The audit writer must be best-effort and must not return raw error material. However, an audit-write failure is itself an operational event and must be observable through monitored server logs/metrics without breaking public WID verification.

### Migration, Deployment, and Rollback

| Step | Change | Safety gate |
|---|---|---|
| 1 | Freeze and test current registration-key behavior. | Existing keys retain no implicit R1 scope. |
| 2 | Add `api_clients`, credential-v2 extensions, scope relation, and access-event migrations. | Additive migration; no existing credential/data rewrite. |
| 3 | Implement validator v2 beside validator v1. | Versioned parsing/validation tests prove v1 compatibility is unchanged. |
| 4 | Extract existing public Work/WID/provenance visibility predicates into typed Registry read services. | Direct route-to-service parity tests; no public/private leakage. |
| 5 | Mount R1 read routes, cursor pagination, search/autocomplete limits, response envelope, and capability replies. | OpenAPI/DTO and method-denial contracts pass. |
| 6 | Add administrative API-client/credential issuance, one-time secret display, rotation, revoke, rate policy, and access audit. | No raw credential in browser persistence, URL, logs, or audit. |
| 7 | Issue a **test** first-party Nexus credential. | Scope, expiry, quota, revocation, enumeration, and audit tests pass. |
| 8 | Configure the Nexus server adapter against the Registry base URL. | UI remains key-free; adapter timeout and error behavior pass. |
| 9 | Issue a live Nexus credential only after the test acceptance suite passes. | Explicit Keeper approval and secret-store confirmation. |

Rollback is layered: remove Nexus adapter traffic first; revoke the live credential immediately; disable R1 route exposure at the gateway/application boundary; leave append-only access evidence intact; retain the additive schema for forensic compatibility; and keep legacy registration-key validation unchanged. Rollback never deletes WIDs, provenance, Works, creator testimony, or access events.

### R1 Acceptance Gate

A Nexus server holding a scoped **test** key must autocomplete a public creator, resolve one public registered Work, and inspect only its public provenance and permission summary. The same key must receive `403` for registration, a private queue, private testimony, creator corpus, and policy mutation; revocation must take effect immediately; a finite expiry must deny after expiry; a valid over-quota credential must return `429`; and every decision must produce a sanitized audit event without raw content. No database credential, raw secret, private material, WID, or provenance record may be altered.

## Proposed Data Model — Approval Gate Only

No schema change is authorized by this ADR. If approved, the smallest migration should extend, not replace, the existing `apiKeys` table and add separate child/event tables.

| Model | Minimal responsibility |
|---|---|
| `api_keys` (extend existing) | Preserve version-1 bcrypt compatibility; add immutable public `key_id`, client relation, version, keyed SHA-256 digest for version 2, display prefix, expiry, last use, rotation lineage, and issuance/revocation actor fields. |
| `api_key_scopes` | One server-allowlisted scope per key. No arbitrary scope text accepted from the client. |
| `api_clients` | Administratively created integration identity: owner user, name, `FIRST_PARTY`/`PARTNER`/`PERSONAL` type, `TEST`/`LIVE` environment, status, server-assigned maximum scope ceiling, and quota policy. |
| `api_key_audit_events` | Append-only lifecycle and access-decision evidence: request ID, occurred time, credential/client/owner IDs, route ID, required scope, allow/deny decision, reason code, status, latency, rate bucket, and only query/IP/user-agent hashes. No secret material or raw sensitive payload. |
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
| R0 — freeze/inventory | Document current Work-registration-key behavior, field classification, OpenAPI drift review, and threat model | Keeper approves the public/partner/private matrix and exact R1 contract. |
| R1a — credential foundation | Add client, credential, scope, and access-event migrations; validator v2 alongside validator v1 | No existing key silently receives Registry access. |
| R1b — read-only Registry service | Extract public Work/WID/provenance projections, routes, search/autocomplete indexes, cursors, response envelope, and capability contract | Read-only only; no WID issuance or registration path. |
| R1c — controlled issuance | Add administrative client/credential issuance UI, one-time key display, rotation/revoke controls, audit, and rate policy | Issue a test first-party Nexus credential and pass acceptance tests before any live credential. |
| R2 — delegated private integrations | Design user consent and delegated authorization for private queue, library, testimony, and creator corpus | Separate ADR and explicit creator/user-consent model. |

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
