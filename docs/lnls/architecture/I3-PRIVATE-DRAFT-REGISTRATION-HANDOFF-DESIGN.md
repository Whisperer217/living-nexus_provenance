# I3 Design — Private Commission Draft to Canonical Registration Handoff

**Status:** Approved for architecture design only; **not approved for implementation**  
**Date:** 2026-09-12  
**Scope:** A future, explicit handoff from an I2-confirmed private Core Ingestion Commission Draft into the existing Living Nexus registration experience.  
**Non-goals:** This design does not create a `songs` row, issue a WID, add an event to canonical provenance, publish, activate a worker schedule, invoke a provider, attach AI context, or change PNA/avatar/marketplace records.

## Decision

The I3 handoff must be a **creator-initiated reference bridge**, not an automatic promotion. It may prefill only a bounded local registration form with deterministic technical facts already measured by I1 and confirmed by the creator in I2. It must not create a canonical Work or imply that a private Draft has been registered, witnessed, published, or made AI-permitted.

> **Private preparation is not canonical registration.** A private Commission Draft is preparatory state in the creator’s domain. The existing Register flow remains the sole authority to create a Work and its existing WID/provenance/publication pathway remains the sole authority to make canonical changes.

## Current-to-target authority map

| Stage | Current record / authority | Future I3 behavior | Must not happen |
|---|---|---|---|
| I1 inspection | `coreIngestionCommissions`, jobs, and receipts; deterministic storage verification. | Supplies a verified asset hash and measured technical facts. | Create or mutate a Work, WID, provenance, publication, AI context, or PNA record. |
| I2 review | Receipt-bound proposal, confirmation digest, and `private_review` Commission Draft. | Allows the creator to explicitly elect to prepare a registration form. | Treat the Draft as a Work or infer title, authorship, testimony, rights, consent, or public visibility. |
| **I3 handoff** | New proposed reference-only handoff record. | Delivers a one-time, owner-bound handoff reference to the existing Register form. | Write to `songs`, call WID issuance, publish, or use a provider. |
| Existing Register | Existing canonical Work flow. | Receives a local prefill candidate and still requires all normal creator review, declarations, and explicit submit steps. | Bypass validation, creator intent, WID/provenance gates, or publication controls. |
| Existing WID/provenance/publication | Current canonical systems. | Run only when and if the existing Register process expressly does so. | Be triggered merely by Commission inspection, proposal, confirmation, or handoff. |

## Design principles

The handoff is governed by four rules. First, **upload remains distinct from registration**: the handoff cannot cause canonical persistence. Second, **technical evidence remains distinct from testimony**: root hash, MIME type, byte length, and inspection version can be prefills, but title, origin, participation, ownership, disclosure, consent, and publication are creator-entered/reviewed fields. Third, **private remains private**: the handoff does not broaden visibility or AI permission. Fourth, **a creator can stop**: withdrawal/revocation must be available before canonical submission without destroying I1/I2 evidence.

## Proposed I3 contract

### 1. Proposed handoff record

The future implementation should add a narrow `coreIngestionRegistrationHandoffs` record. It is not a Work, receipt, WID, or provenance event.

| Field | Purpose | Constraint |
|---|---|---|
| `handoffId` | Server-generated opaque identifier. | Never use as a WID or public identifier. |
| `creatorId` | Owner scope. | Must exactly match the confirmed private Draft owner. |
| `commissionId`, `privateDraftId`, `proposalId`, `confirmationId` | Source-reference chain. | Immutable once created; do not copy Draft content into canonical records. |
| `rootAssetHash`, `receiptHash`, `proposalHash` | Integrity bindings. | Must equal the source chain values at handoff creation and preflight. |
| `status` | `prepared`, `opened`, `revoked`, `expired`, `submitted_to_register`, or `cancelled`. | `submitted_to_register` means the user crossed into the existing registration process, not that a Work/WID/publication exists. |
| `tokenHash` | Digest of a short-lived opaque browser handoff token. | Store only SHA-256 digest; never log, display, or reuse the raw value. |
| `expiresAt`, `openedAt`, `revokedAt`, `submittedAt` | Lifecycle evidence. | No canonical effect by themselves. |
| `registrationReference` | Optional existing registration-session/draft reference, if the current Register implementation supports one. | Never store a guessed `songId`, WID, or publication claim. |

The raw handoff token should be 256-bit random, Base64URL encoded, valid for no more than **15 minutes**, and bound to the creator, handoff, private Draft, asset hash, receipt hash, and proposal hash. The browser retains it in page memory only. The server stores the token digest and compares it in constant time. A new token revokes any unconsumed token for the same handoff.

### 2. Preconditions for preparing a handoff

The server must enforce all preconditions. UI visibility is not a security control.

| Required precondition | Server enforcement |
|---|---|
| Authenticated creator owns the private Draft. | Owner-filter every lookup by `creatorId`; return a non-enumerating missing response for other creators. |
| Commission is still associated with the Draft source chain. | Match `commissionId`, `privateDraftId`, `proposalId`, `confirmationId`, `rootAssetHash`, `receiptHash`, and `proposalHash`. |
| I1 inspection succeeded. | Commission is `inspection_ready`; receipt succeeded; the hash matches the Commission asset hash. |
| I2 proposal is confirmed and not superseded. | Proposal state is `confirmed`; private Draft state is `private_review`; no terminal revocation. |
| No existing terminal successor handoff exists. | Enforce a unique source-chain relation and explicit idempotency behavior. |
| Explicit creator request. | A protected mutation, clear confirmation language, and a separate action from I2 private-Draft confirmation. |
| No accidental public/AI escalation. | Handoff payload has no default public flag, no AI-context field, no provider/model action, and no testimony declaration. |

### 3. Allowed handoff payload

I3 should create a **bounded local form prefill** rather than a canonical update. The future form may receive only the following derived fields.

| Allowed local prefill | Source | UI treatment |
|---|---|---|
| Asset storage reference / durable asset reference | I1 Commission, owner scoped. | Reviewable; must still pass current Register validation. |
| Asset SHA-256 | I1 receipt / Commission. | Read-only technical evidence; not a WID. |
| MIME type and byte length | I1 measured facts. | Reviewable technical fields. |
| Duration/sample rate/bit depth only if a deterministic future inspection actually measures them | Future receipt schema. | Read-only and clearly labeled as measured evidence. |
| Inspection receipt/reference hashes and versions | I1/I2 source chain. | Internal preparation reference; do not show as a public provenance claim. |

The handoff must **not** prefill or infer title, creator name, authorship, split, origin/testimony, genre, participation, rights, license, AI disclosure, AI permission, publish state, public visibility, pricing, avatar/portrait state, marketplace entitlement, PNA material, or any creator-private thread/Quiver content. These remain creator-controlled fields in the existing Register flow.

### 4. Browser and API sequence

```text
Confirmed I2 private Commission Draft
  → Creator selects “Prepare for Register”
  → protected I3 prepareHandoff verifies full source chain
  → server writes reference-only handoff + returns opaque 15-minute token once
  → browser opens existing /manifest route with handoff ID only
  → existing Register page calls protected I3 resolveHandoff
  → server validates digest, owner, expiry, and chain; returns bounded local prefill
  → Register form remains editable and requires normal creator review
  → creator explicitly invokes existing registration action
  → existing register/WID/provenance/publication logic runs unchanged
  → only after its own success may I3 record `submitted_to_register` with a safe existing-registration reference
```

The browser URL must contain only a non-secret handoff ID, never the raw token. The token must travel in a request body/header over the existing authenticated first-party connection and must be removed from page state on navigation, timeout, mutation success, error, logout, or explicit cancellation.

## Creator control and withdrawal

Before the existing canonical registration submit, the creator may cancel the Register form, revoke the handoff, or create a new handoff after expiry. These actions may mark only the I3 handoff state. They must not delete the I1 receipt or I2 private Draft, revoke an unrelated WID, alter Work provenance, remove storage, or erase later creator-entered canonical data.

If a Register form is open but has not submitted, cancellation returns the creator to the private Draft and leaves no public/registered state. If the existing registration procedure has already succeeded, any later correction must use the ordinary existing Work revision/provenance policy; an I3 handoff cannot “undo” or overwrite canonical history.

## Idempotency, race handling, and failure policy

| Situation | Required behavior |
|---|---|
| Duplicate prepare click | Return the same active handoff metadata or create no duplicate; do not issue multiple usable tokens. |
| Replayed/expired token | Fail closed with a non-content error; do not reveal another creator’s state. |
| Asset/receipt/proposal hash mismatch | Fail closed; display that the prepared record must be reviewed again. |
| Draft source is revoked or no longer owner-scoped | Fail closed. |
| User opens Register in two tabs | First valid consumption creates an `opened` state; the second must revalidate and either be refused or return the same non-secret local state without duplicating a canonical write. |
| Register submit retries | Existing canonical registration idempotency rules govern canonical writes. I3 must not implement a second Work/WID issuance path. |
| Existing Register path fails after handoff | Leave the I3 handoff as `opened` or an audited non-terminal state; do not label it registered/published. |

## Proposed procedure surface

All procedures must be protected, owner scoped, and non-public.

| Procedure | Input | Output | Authority limit |
|---|---|---|---|
| `coreIngestion.prepareRegistrationHandoff` | Confirmed `privateDraftId`; explicit intent. | `handoffId`, raw token once, expiry, bounded status. | Does not write a Work or call registration. |
| `coreIngestion.resolveRegistrationHandoff` | `handoffId`, raw token. | Bounded local form prefill and source references. | Does not submit a Work or issue a WID. |
| `coreIngestion.revokeRegistrationHandoff` | `handoffId`. | Revoked status. | Revokes only the unconsumed I3 bridge. |
| `coreIngestion.markHandoffSubmitted` | Internal/server-side call after existing registration returns success. | Safe status/reference update. | Cannot be client-invoked; does not create registration itself. |

No procedure should accept caller-provided `creatorId`, `songId`, WID, publication status, public flag, AI consent, title, origin, or a raw receipt payload. These are either established server-side from owner-bound records or remain in the existing creator-reviewed Register flow.

## Provenance and WID rules

I3 must preserve a clear interpretation boundary.

| Statement | Required interpretation |
|---|---|
| `private_review` Draft exists | The creator has a private preparation record, not a registered Work. |
| Handoff is `prepared` or `opened` | The creator chose to prefill a form, not to create a WID or publish. |
| Existing Register succeeds | The existing registration system—not I3—creates any canonical Work/WID/provenance result according to its own rules. |
| I3 stores source hashes | They are technical preparation references, not new provenance testimony or a substitute WID. |
| Existing WID/provenance record exists | It cannot be rewritten by I3. Any forward link from canonical registration to a Commission source must be additive, factual, and explicit. |

The first implementation must not silently add I1/I2 technical hashes to public Work pages or Registry responses. A separate approved provenance-extension design would be required to decide whether, where, and how an inspection receipt reference becomes visible or canonical.

## PNA, avatar, Nexus, and worker insulation

I3 has no read or write path to PNA threads/messages, sealed Keeper archives, Keeper portraits, Quiver assets, Guide records, marketplace skins, equipped-avatar selection, purchase/entitlement facts, Nexus conversations, Registry API credentials, or provider credentials. A future handoff is not an AI context attachment and must not turn a registered Work into AI-permitted content.

The worker schedule remains inactive. I3 relies only on previously completed I1 evidence. It must not enqueue, activate, or retry an inspection job as a side effect of form handoff.

## Implementation sequence and rollback

| Step | Future implementation action | Required gate | Rollback |
|---:|---|---|---|
| 1 | Add the handoff table and additive migration. | Schema review; no canonical table changes. | Leave unused table; no data reversal. |
| 2 | Add owner-scoped prepare/resolve/revoke service and procedures. | Token/digest, TTL, source-chain, idempotency, and enumeration tests. | Disable I3 procedures/flag; retain private records. |
| 3 | Add the explicit `Prepare for Register` action to the I2 review surface. | UX verifies creator sees “private preparation” and no automatic promise. | Hide feature flag; I2 Draft remains intact. |
| 4 | Add bounded local prefill capability to the existing Register form. | Existing Register tests pass unchanged; form still requires creator review. | Disable resolution/prefill; direct Register remains untouched. |
| 5 | Add internal completion marker after canonical registration returns success. | Canonical registration/WID/publication tests and idempotency pass. | Stop marking I3 status; never roll back canonical Work/WID/provenance. |
| 6 | Optional future provenance-reference decision. | Separate ADR and explicit approval. | Do not expose or backfill any source reference. |

## Acceptance gates

Before any I3 implementation is approved, all of the following must pass.

| Gate | Evidence |
|---|---|
| Owner isolation | Creator A cannot prepare, resolve, revoke, or enumerate Creator B’s Draft/handoff. |
| Source integrity | Commission, private Draft, proposal, confirmation, asset hash, receipt hash, and proposal hash must all agree. |
| Explicitness | No I2 confirmation automatically creates an I3 handoff; no I3 handoff automatically submits registration. |
| One-time custody | Raw handoff value is returned once, never persisted/logged/rendered, expires, and rejects replay. |
| Bounded prefill | Only allowed deterministic technical fields reach local Register state. |
| Canonical insulation | No handoff mutation writes `songs`, WIDs, provenance, publication, public/AI permissions, or PNA/avatar/economic data. |
| Register compatibility | Existing register behavior, validation, WID issuance, provenance append, and publication gates remain unchanged in regression tests. |
| Rollback | Feature flag disables I3 actions without deleting I1/I2 evidence or altering an existing Work. |
| Privacy | No private Draft payload, Quiver/PNA data, token, provider/Registry secret, or raw creator content appears in public responses, telemetry, or browser logs. |

## Six-layer alignment

| Living Nexus layer | I3 protection |
|---|---|
| **Identity** | The creator, not a technical receipt, supplies authorship and identity declarations. |
| **Manifestation** | A Work comes into being only through the canonical Register flow, not a background worker. |
| **Relationship** | The review screen makes the next consequence understandable and reversible before submission. |
| **Registry** | I3 cannot issue, rewrite, or impersonate a WID/provenance record. |
| **Stewardship** | Source-chain checks, expiration, revocation, and rollback prevent quiet conversion of private preparation into public claims. |
| **Legacy** | I1/I2 evidence stays interpretable as preparation, while canonical Work history remains independently durable. |

## Explicit next authorization

The I3 **design** is complete. The next valid authorization is one of the following:

1. **Approve I3 implementation** — additive handoff record/procedures and local Register-form prefill only; still no automatic registration, WID, publication, worker activation, provider, or PNA change.
2. **Approve worker-schedule activation planning** — a separate operational plan only.
3. **Hold** — retain I1/I2 preparation and I3 design without changing the runtime.

## Evidence sources

[S1]: [I1/I2 Core Ingestion service — `server/services/coreIngestion.ts`](../../../server/services/coreIngestion.ts)

[S2]: [I1/I2 Core Ingestion procedures — `server/routers/coreIngestion.ts`](../../../server/routers/coreIngestion.ts)

[S3]: [I1/I2 schema — `drizzle/schema.ts`](../../../drizzle/schema.ts)

[S4]: [Existing canonical song/Work domain — `server/routers/songs.ts`](../../../server/routers/songs.ts)

[S5]: [Current-to-target Work preparation map — `docs/WORK_PREPARATION_REGISTRATION_PUBLICATION_CURRENT_TO_TARGET.md`](../../WORK_PREPARATION_REGISTRATION_PUBLICATION_CURRENT_TO_TARGET.md)

[S6]: [Core Ingestion, Nexus Adapter, and PNA Preservation Specification](LN-CORE-INGESTION-NEXUS-ADAPTER-PNA-PRESERVATION-SPEC.md)
