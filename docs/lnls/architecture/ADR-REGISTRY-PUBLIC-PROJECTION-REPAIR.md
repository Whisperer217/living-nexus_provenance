# ADR — Registry Public Projection Repair

**Status:** Accepted by Doc — 2026-09-14  
**Decision scope:** Remediation mode **A** only: public projection and route resilience.  
**Out of scope:** Registry record adjudication, WID reassignment, provenance mutation, schema migration, sitemap policy, media/title synchronization, credential issuance, and publication.

## Context

The preservation-first Registry diagnostic confirmed that the legacy WID Protocol route (`GET /api/work/:wid`) can select a deleted or unlisted historical row before evaluating visibility. The route uses an unqualified WID lookup with `limit(1)`, while the Registry R1 work read model evaluates only public-published WID-bearing Works. As a result, 41 WIDs with exactly one public-published Work and an additional non-public historical Work returned a legacy-route 404 despite resolving through Registry R1.

The same diagnostic confirmed five WID groups with more than one public-published Work. A WID-only response cannot responsibly choose one of those public candidates as canonical without a separate append-only adjudication decision. Finally, the Registry provenance route propagated an incompatible WID-table read error, which terminated the local development process rather than returning a controlled service response.

## Decision

Introduce a **new public-only WID lookup** for the legacy WID Protocol route. It will filter at query time to `Published`, public, WID-bearing Work rows and return one of three states:

| State | Meaning | HTTP response |
|---|---|---|
| `resolved` | Exactly one public-published Work currently projects from the WID. | `200` canonical Work representation. |
| `not_found` | No public-published Work currently projects from the WID. | `404` without source-record disclosure. |
| `ambiguous` | More than one public-published Work currently projects from the WID. | `409 WID_AMBIGUOUS`; no candidate is chosen and no record is changed. |

The public WID response will order candidate reads deterministically by creation time and Work ID, but it will use that ordering only to detect multiple candidates—not to silently make an ownership decision. A single public candidate will remain readable even if deleted or unlisted historical rows share its WID.

The Registry provenance handler will treat a read-model failure as a controlled `503 REGISTRY_READ_UNAVAILABLE` response. It will not return a false `404`, expose database details, or allow an unhandled asynchronous error to terminate the service process.

## Alternatives rejected

| Alternative | Rejection reason |
|---|---|
| Reissue or overwrite duplicate WIDs | Violates WID immutability and requires separate collision adjudication. |
| Select the earliest or latest public duplicate as canonical | Creates an unapproved ownership determination from projection order. |
| Hide duplicate WIDs by returning an arbitrary `/song/:id` | Misrepresents ambiguity as resolved provenance. |
| Treat provenance-reader failure as `404` | Conflates unavailable infrastructure with absence of a public record. |
| Migrate or backfill the `wids` table now | This is mode C and has not been authorized. |

## Affected surfaces

| Surface | Intended change | Canonical data impact |
|---|---|---|
| `server/utils/db.ts` | Add a public-only, discriminated WID projection lookup. | Read-only. |
| `server/routes/workRoute.ts` | Use the new lookup; return `409` for public ambiguity. | Read-only. |
| `server/routes/registryApiRoute.ts` | Convert provenance read-model exceptions to a typed `503`. | Read-only. |
| Focused Vitest contracts | Verify public selection, ambiguity signaling, and error containment. | None. |

## Risks and rollback

The public WID route gains a new `409` state for the five unresolved public collisions. This is an intentional truth-preserving compatibility change: consumers previously received an arbitrary Work or an unreliable response. Rollback is source-only: restore the prior helper and route behavior from the checkpoint immediately preceding this decision. No database rollback exists because this change makes no data writes.

## Acceptance criteria

1. A WID with one public-published row and deleted/unlisted historical reuse returns `200` for the public row.
2. A WID with multiple public-published rows returns typed `409 WID_AMBIGUOUS` and never selects a candidate.
3. A WID with no public-published row returns `404` without exposing private/deleted state.
4. A provenance read failure returns a controlled typed `503`, not process termination, raw SQL, or false `404`.
5. Existing mutation denial remains `405`, and no Registry/Work/WID/provenance/creator/media/sitemap state is written.
