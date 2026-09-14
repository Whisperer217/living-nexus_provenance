# Registry Schema and Index Reconciliation Design

**Status:** Design only — approved by Doc on 2026-09-14.  
**Program order:** C → B → D.  
**Implementation status:** **Not authorized. No schema, data, index, route, credential, or publication change has been made by this document.**

## Executive decision

The deployed `wids` table is a legacy WID-anchor table, while `drizzle/schema.ts` declares a newer provenance-link table using the same physical table name. The Registry R1 provenance reader currently uses the newer declaration against the legacy physical table and fails on the absent `wids.wid` column. The immediate reconciliation should be a **read-only compatibility adapter**, not an in-place table rewrite, silent backfill, WID reissue, or inferred provenance reconstruction.

> **A WID anchor may be projected truthfully from verified legacy fields; provenance links, signatures, and hashes that are absent must remain absent.**

This design separates two future implementation steps: a source-only compatibility repair that restores controlled read availability, and an optional additive provenance-link structure for records that have independently verified linkage evidence. Neither step is approved by this design authorization.

## Current evidence

The declared schema defines `wids` as a provenance-link record with `wid` as its primary key plus `eventId`, `contentHash`, `creatorId`, `signature`, and timestamp fields. The deployed table instead has an integer primary key and a unique `widCode`, with legacy contextual fields (`workType`, `title`, `fileHash`, `metadata`) and a bigint `createdAt`. The deployed `provenanceEvents` table matches the declared append-only event shape. The incompatibility is therefore **localized to the WID-anchor table and its reader**, rather than a global provenance-event migration failure. [1] [2]

| Logical datum | Declared `wids` model | Deployed `wids` column | Status | Safe interpretation |
|---|---|---|---|---|
| WID value | `wid` `varchar(64)` primary key | `widCode` `varchar(64)` unique | Name/key mismatch | `widCode` is the legacy anchor identifier. |
| Record identity | None beyond WID | `id` `int` primary key | Additional legacy identity | Internal only; do not expose as a new public WID. |
| Creator reference | `creatorId` `int` | `creatorId` `int` | Compatible | Can support consistency checking, not ownership adjudication. |
| Work type | None | `workType` `varchar(32)` | Legacy-only | Public projection metadata only. |
| Title | None | `title` nullable `varchar(256)` | Legacy-only | Non-canonical display hint; canonical public title remains `songs.title`. |
| Content hash | `contentHash` `varchar(64)` required | `fileHash` nullable `varchar(128)` | Semantic/type mismatch | May be projected only as legacy file-hash evidence, never asserted as canonical Registry `contentHash` without validation. |
| Provenance event link | `eventId` `varchar(64)` required | None | Missing | Must remain `null`; do not infer from song, title, creator, or timestamp. |
| Signature | nullable `signature` | None | Missing | Must remain `null`; do not fabricate or reuse unrelated signatures. |
| Metadata | None | nullable JSON `metadata` | Legacy-only | Inspect structure only in a redacted preflight; never treat it as testimony. |
| Record establishment time | timestamp | `createdAt` bigint | Representation mismatch | Unit must be proven before conversion or public display. |

The legacy table has a primary key on `id` and a unique index on `widCode`. No declared `eventId` or provenance-link index exists in the deployed table because those columns do not exist. [2]

The managed migration directory contains historical Drizzle snapshots through `0133`, but the tracked SQL migrations currently present do not contain a `wids` create/alter declaration. The legacy-versus-declared WID divergence must therefore be treated as **unverified migration lineage**, not as permission to reconstruct, drop, or overwrite the live table. [4]

## Architecture alignment

| Living Nexus layer | Design effect | Guardrail |
|---|---|---|
| Identity | Preserves the historical WID string as recorded. | Never rename, reissue, or select a WID owner by projection order. |
| Registry | Restores a truthful public read boundary. | Missing chain fields remain unknown, not inferred. |
| Stewardship | Distinguishes legacy anchor evidence from sealed provenance evidence. | No destructive migration or force schema push. |
| Legacy | Keeps the existing table intact and queryable. | Add only verified linkage in a separate append-only store, if later authorized. |

## Options considered

| Option | Description | Benefits | Risks | Recommendation |
|---|---|---|---|---|
| **C0 — Read-only compatibility adapter** | Introduce a separate, explicitly named legacy-WID read mapping used only by Registry provenance projection. Read `widCode`, `fileHash`, and legacy timestamp; expose no event/signature when absent. | No database mutation; immediately matches production facts; easy rollback. | Requires careful API semantics to avoid calling `fileHash` a canonical content hash. | **Recommended first implementation, separately authorized.** |
| **C1 — Align the declared Drizzle table in place to legacy columns** | Change the existing `wids` declaration to reflect live physical columns. | Removes table-shape mismatch broadly. | Can destabilize current issuance/admin code that accepts the newer `wid`/`eventId`/`contentHash` shape; does not create missing provenance links. | Not first; requires full writer and admin blast-radius review. |
| **C2 — Add a new immutable provenance-link table** | Add a distinct table keyed by WID anchor, containing only independently verified event/hash/signature linkage. | Supports gradual, auditable convergence without altering historical anchors. | Requires schema migration and a separately governed evidence intake process. | Recommended only after C0 validation and collision policy B design. |
| **C3 — Rewrite the live `wids` table to match the declared model** | Rename/drop/add/backfill the legacy table in place. | Superficial schema uniformity. | High risk of losing legacy data, inventing provenance, or disrupting existing writers. | **Rejected.** |

## Recommended staged implementation plan

### Gate C0.1 — Read-only compatibility preflight

Before source or schema changes, run only bounded aggregate checks. Confirm the legacy timestamp unit, exact overlap between `wids.widCode` and `songs.witnessId`, null rates for `fileHash`/`metadata`, and whether any WID anchor has a verified pre-existing event reference elsewhere. Do not inspect private creator text, raw metadata payloads, lyrics, or files.

| Check | Expected output | Failure response |
|---|---|---|
| `widCode` uniqueness | Zero duplicate legacy anchors, consistent with unique index. | Stop; classify index corruption separately. |
| Timestamp-unit range | Clear milliseconds-versus-seconds determination from aggregates. | Keep `registeredAt` unavailable rather than converting uncertain units. |
| Public Work overlap | Count of public-published `songs.witnessId` values matching legacy `widCode`. | Do not infer anchors for nonmatching Works. |
| `fileHash` completeness | Aggregate only. | Project absent hash as absent; no backfill. |
| Event linkage evidence | Aggregate on independently stored key only. | Do not derive event ID from content/title/creator. |

**C0.1 result (2026-09-14):** the deployed `wids` and `provenanceEvents` tables are both empty. All 702 public-published Works have a non-empty `songs.witnessId`, but zero values join to `wids.widCode`. Consequently, timestamp units, anchor file-hash completeness, and provenance-link values cannot be established from this environment. **C0 compatibility implementation is held:** it cannot return any Registry provenance fact without inventing it. The typed unavailable response remains correct. [6]

### Gate C0.2 — Source-only compatibility implementation

Subject to a separate explicit authorization, add an isolated `legacyWidAnchorReadService` or equivalent local adapter. The Registry provenance projection should return a controlled fact set:

```json
{
  "wid": "WID-MUS-…",
  "registeredAt": "only if timestamp unit is verified",
  "legacyFileHash": "only if present",
  "signature": null,
  "event": null,
  "provenanceLinkState": "LEGACY_ANCHOR_WITHOUT_VERIFIED_EVENT_LINK"
}
```

The public response must not claim a sealed event, canonical hash, or signature that the source table cannot prove. Existing `503 REGISTRY_READ_UNAVAILABLE` behavior remains the safe fallback until C0 is verified.

### Gate C0.3 — Staging verification

Verify representative cases against a controlled staging copy or read-only production queries: a normal legacy anchor, an anchor with no file hash, an unknown WID, a public collision from B’s future cohort, and a WID whose `createdAt` is outside expected range. Confirm `200` only for supported legacy facts, `404` for no public Work, `409` for public WID ambiguity, and controlled `503` only for actual dependency failure.

### Gate C1 — Future append-only provenance-link structure

If C0 demonstrates the need for richer provenance data, create a **new table**, not an in-place rewrite of `wids`. A candidate shape is `registry_provenance_links` with a unique `widCode` reference, nullable verified `eventId`, nullable verified `contentHash`, nullable signature, evidence class, linker actor, and append-only creation time. Rows may be added only after verified evidence review; historical legacy anchors remain unchanged and unlinked when evidence is insufficient.

This phase requires its own data model review, reviewed generated migration, managed SQL application, authorization model, write audit, rollback plan, and user approval. It is deliberately sequenced after C0 and before operational collision adjudication B only if implementation is explicitly approved.

## Future implementation blast radius

| Area | C0 adapter impact | C1/C2 impact | Must remain unchanged |
|---|---|---|---|
| `server/registry/readService.ts` | Read mapping and response semantics. | Optional link lookup. | Public eligibility predicate and AI-permission boundaries. |
| `server/routes/registryApiRoute.ts` | Controlled typed responses only. | Optional versioned provenance fields. | Scopes, credential handling, audit privacy. |
| `server/utils/db.ts` | None required unless shared read helper is chosen. | May need typed accessors. | Public Work projection and WID ambiguity behavior from A. |
| `drizzle/schema.ts` | No change for C0. | Additive model only for C1. | Existing Works, WIDs, provenance events, and creator fields. |
| `server/routers/wids.ts` / issuance callers | No change for C0. | Dedicated future writer review. | No silent privilege gain or retroactive mutation. |

Current writer evidence confirms that `server/routers/wids.ts` accepts `wid`, `eventId`, and `contentHash` before calling the insert helper. Any C1 declaration alignment or C2 linkage writer must therefore be assessed as a registration/issuance blast-radius change—not merely a Registry-read repair. [5]

## Validation and rollback

| Stage | Required validation | Rollback |
|---|---|---|
| C0 compatibility adapter | Focused unit tests; representative route probes; no raw DB error in logs; existing A-route tests retained. | Source rollback to prior checkpoint; database untouched. |
| C1 additive schema | Generated migration review; read-only pre/post counts; staging test; explicit write authorization; production smoke test. | Disable link reads or deploy prior source; never delete link evidence as a rollback shortcut. |
| C3 in-place rewrite | Not permitted by this design. | Not applicable. |

## Explicit non-goals

This design does **not** adjudicate the five public WID collisions, determine creator ownership, repair work metadata, register the sitemap orphan, issue credentials, change any private/AI permission, or promote a public deployment. Those remain B and D program phases or separate authority decisions.

## Required next authorization

The next permitted action is a choice between:

1. **Approve C0.1 preflight only** — bounded aggregate evidence collection, no source or database mutation.
2. **Approve C0 compatibility implementation** — source-only adapter and tests, still no database mutation; only after C0.1 evidence is accepted.
3. **Hold C** — retain the controlled `503` provenance response and move no further.

### References

[1]: `../../../../drizzle/schema.ts` — declared `wids` and `provenanceEvents` models.
[2]: Live managed database `information_schema.columns` and `SHOW INDEX` inspection executed 2026-09-14 under the approved C-design read-only boundary.
[3]: `REGISTRY-INTEGRITY-DIAGNOSTIC-2026-09-14.md` — prior preservation-first diagnostic and anomaly classification.
[4]: `drizzle/meta/*_snapshot.json`, `drizzle/migrations/` — managed migration lineage inventory and no-match inspection for a tracked `wids` DDL declaration, 2026-09-14.
[5]: `server/routers/wids.ts` and `server/registry/readService.ts` — current writer and reader dependency inspection, 2026-09-14.
[6]: `REGISTRY-C0-1-COMPATIBILITY-PREFLIGHT-2026-09-14.md` — C0.1 aggregate evidence and hold decision.
