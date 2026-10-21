# Creator Studio Extraction Assessment

**Status:** Assessment only — no application, schema, migration, deployment, or publication change.

**Risk classification:** High. A separately deployed Creator Studio would handle authenticated owner reads, Work mutations, uploads, private drafts, and provenance-adjacent records. It must preserve the existing server as the sole authority for permissions, WIDs, historical evidence, media, and database writes.

**Execution governance:** This assessment follows the Development Execution Governance Amendment: existing research was reused; the only parallel work was three genuinely independent checks of client seams, identity/API boundaries, and deployment topology. Further work must be risk-proportionate, explicitly scoped, and stop at the stated conditions.

## Decision

A Creator Studio can be extracted as a separately built frontend **without duplicating business logic or creating a second database/runtime authority**. It is **not safe** to make it a direct browser client of the current Registry R1 API or the full cookie-authenticated tRPC router.

The Registry API remains public/scoped-read only. It is not a creator authoring API. Existing creator operations must continue to execute through Living Nexus server-owned ownership checks and domain services.

### Recommended first deployment shape

Use a separately built Studio frontend but serve it through the canonical Living Nexus origin at a path such as:

```text
https://www.livingnexus.org/studio/*
    -> separately built Studio static assets
    -> existing Living Nexus /api/* backend
    -> existing MySQL, storage, worker, and provenance services
```

This is the lowest operational-risk path because it preserves the host-only existing session cookie and relative `/api/*` calls. It permits a separately versioned frontend artifact while avoiding a second Node/Express process, a second database pool, duplicated background workers, credentialed CORS exposure, or cookie-domain widening.

The current Docker image is one Vite + Express deployable. Serving the Studio artifact through the existing host is the only option that demonstrably adds no second application runtime. Whether a separate static host/CDN has provider cost cannot be established from repository evidence; no cost promise is made.

### True separate-origin option — later, not a shortcut

A separate origin such as `https://studio.livingnexus.org` is feasible only after a deliberate identity and private-authoring boundary exists:

```text
Studio browser
  -> Studio BFF (Studio-domain session only)
  -> short-lived, audience-bound Living Nexus identity assertion
  -> allowlisted Living Nexus Creator Gateway
  -> existing server domain services and ownership checks
  -> existing MySQL/storage/provenance authority
```

The browser must never receive a Registry credential, internal service credential, database credential, or long-lived Living Nexus session token. The existing signed identity assertion/JWKS capability is a suitable starting primitive, but its current origin allowlist and audience are Nexus-specific and must not be broadened casually.

## Confirmed current constraints

1. **Creator Studio is not presently a live product boundary.** `CreatorStudioPage.tsx` exists but the current `/book/:id/studio` route redirects to `/manage`; it is not an active, supported Studio route. Treat extraction as rehabilitation plus extraction, not a simple route move.
2. **Current Studio client assumptions are same-origin.** The tRPC client uses relative `/api/trpc` calls with cookies. Upload editors post to relative `/api/upload-file`.
3. **Current authenticated cookie is host-only.** The login callback is fixed to `https://www.livingnexus.org/api/oauth/callback`, and the cookie does not declare a parent domain. A subdomain cannot simply reuse the session.
4. **Registry R1 is read-only by design.** It must remain a public/scoped Registry projection, not a write transport for creator actions.
5. **Current authoring needs a dedicated server DTO.** The dormant Studio reads the generic `songs.getById` return shape as though it were a flat Work object, and it uses UI declaration values that do not match the server mutation enum. These must be resolved centrally in an authoring contract, not translated independently by two clients.
6. **Existing uploads are creator-authenticated but not Work-bound.** A Studio extraction needs a Work-bound upload intent/completion capability, rather than a general cross-origin upload relay.

## Authoritative boundaries

| Keep authoritative in Living Nexus | May move/shared to Creator Studio |
| --- | --- |
| Authentication verification, owner authorization, Work/collection policy, registry/WID rules, media grants, uploads authorization, database access, audit/event writing, background workers | Studio shell, authoring workflow UI, editors, reader previews, design tokens, typed display components |
| Existing `songs`, `collectionStudio`, `releaseDrafts`, session, and upload domain rules | Shared UI package only after behavior is characterized |
| Registry R1 public read models | Public WID/provenance display through the existing safe public routes |

## Required private Creator Gateway before a separate origin

A narrow versioned surface such as `/api/studio/v1` must call extracted Living Nexus authoring services. It must not mirror the whole tRPC router.

Initial allowlisted contracts:

- `GET /session`: minimal Studio identity and capabilities.
- `GET /works/:workId`: owner-only `StudioWork` DTO.
- `PATCH /works/:workId`: owner-only, revision-guarded structured patch; excludes WID, signatures, ownership, certificates, media keys, and registry timestamps.
- `POST /works/:workId/assets/uploads`: owner- and Work-bound short-lived upload capability and completion/binding.
- `GET /works/:workId/provenance`: explicitly marks immutable Registry evidence separately from mutable editorial metadata.

The implementation should extract a server-only `workAuthoringService` from current mutation logic. Existing tRPC procedures then remain thin adapters to that service, preserving current Living Nexus behavior without duplicated policy.

## Migration sequence

### Phase A — Characterize and make the Studio boundary real, same-origin

1. Decide the supported Studio routes and retire/repair the dormant route behavior explicitly.
2. Add characterization tests for current owner checks, Work DTO shape, editable metadata, HAAI declaration vocabulary, story/page/panel/cue schemas, and error behavior.
3. Extract `workAuthoringService` behind existing tRPC handlers; no registry, WID, or database ownership change.
4. Add a Studio-only Vite entry/router served under the main Living Nexus origin.
5. Reuse server-owned session/tRPC during this phase; do not add cross-origin CORS.
6. Add Work-bound asset upload intent/binding and structured JSON validation before bringing upload-capable Studio pages live.

### Phase B — Optional independent-origin deployment

Only after Phase A passes parity/security tests:

1. Add a Studio-specific audience and exact allowlist to the existing short-lived assertion system.
2. Add a Studio BFF that validates JWKS, issuer, audience, expiry, nonce, and replay protection, then creates only a Studio-domain HttpOnly session.
3. Add a server-authenticated Creator Gateway with an explicit operation allowlist, audit records, rate limits, idempotency for writes, and per-operation schema validation.
4. Keep Registry credentials and Creator Gateway credentials server-side.
5. Give uploads a direct Work-bound authorization mechanism; do not route large media through an unrestricted double proxy.
6. Move Studio static assets to `studio.livingnexus.org` only after authenticated flows pass.

## Security and validation gates

Before any authenticated separate-origin launch, prove:

- unauthenticated access is denied without leaking private Work data;
- OAuth/identity handoff returns to the precise Studio route through an exact allowlist, never an arbitrary redirect;
- every authoring read/write/upload checks asserted identity against Work ownership server-side;
- no WID, signature, certificate, historical event, HAAI declaration history, creator relationship, or media authority is writable through Studio metadata endpoints;
- malformed page/panel/cue JSON, stale revisions, mismatched asset bindings, cross-origin CSRF attempts, foreign Work IDs, and replayed assertions are rejected;
- public Registry/WID reads remain public-only and private Works remain absent;
- existing Living Nexus tRPC clients continue to pass regression tests;
- no duplicated worker starts, migrations, DB pools, or storage credentials are introduced.

## Rollback

- **Phase A:** route/feature flag rollback restores the current main application route; no data migration is required for a frontend-only Studio build.
- **Authoring-service extraction:** retain the existing tRPC procedures as adapters; rollback the new Studio endpoint/route without changing stored Works.
- **Phase B:** disable Studio origin at ingress and revoke its BFF/service credential and assertion audience/origin entry. Existing Living Nexus sessions, routes, database, media, WIDs, and registry records remain untouched.

## Explicit no-go boundaries

Do not:

- grant direct database access to Studio;
- expose Registry keys, existing API keys, storage credentials, or service secrets in browser code;
- add wildcard credentialed CORS or expose the entire tRPC router cross-origin;
- share the existing long-lived `www` session cookie by broadening cookie scope as a shortcut;
- start a second Express runtime that duplicates workers, migrations, or business logic;
- treat legacy `/api/v1` Work/WID endpoints as a private-authoring or privacy authority until their public filtering is reconciled;
- imply that mutable Studio edits revise WIDs or historical Registry evidence.

## Stop conditions

Stop and return for explicit design review if implementation requires: changing WID or signature semantics; moving database authority; loosening owner checks; passing server credentials to the browser; changing cookie scope; enabling broad credentialed CORS; migrating existing Work/provenance records; or introducing a second worker/runtime deployment.

## Sources inspected

- `client/src/pages/CreatorStudioPage.tsx`
- `client/src/App.tsx`
- `client/src/main.tsx`
- `client/src/const.ts`
- `client/src/_core/hooks/useAuth.ts`
- `server/_core/oauth.ts`
- `server/_core/cookies.ts`
- `server/_core/context.ts`
- `server/_core/trpc.ts`
- `server/_core/index.ts`
- `server/routers/index.ts`
- `server/routers/songs.ts`
- `server/routes/uploadRoute.ts`
- `server/routes/registryApiRoute.ts`
- `server/routes/nexusIdentityRoute.ts`
- `server/nexus/assertionService.ts`
- `server/routes/workRoute.ts`
- `Dockerfile`
