# ADR — Registry Duplicate-WID Adjudication Design

**Status:** Design only — approved by Doc on 2026-09-14.  
**Program position:** B, after C/C0.1 evidence review and before D sitemap policy.  
**Decision:** Establish a future **append-only adjudication case system** for the five confirmed public duplicate-WID groups. Do not determine ownership, alter a WID, or repair a Work in this design pass.

## Context and custody boundary

The Registry integrity diagnostic established five WID groups containing ten public-published Works, with one additional deleted historical row among those groups. Their distinct public Work pages can have different titles, artwork, audio, and page URLs. This is a public identity collision and a resulting projection discrepancy; it is **not** evidence that one public Work should overwrite another. [1]

The preceding C0.1 compatibility preflight also established that the deployed `wids` and `provenanceEvents` tables are empty. That absence forbids the system from deriving historic anchor, event, signature, or ownership evidence from those tables. A duplicate-WID decision must therefore remain an explicit new stewardship act, supported by independently supplied and reviewed evidence, rather than a retrospective database inference. [2]

> **The WID is a seal, not an instruction to erase.** A collision case may add an accountable record about a contested relationship; it may not silently replace the original chain of record.

This ADR creates no table, route, job, notification, public surface, credential, or data record. It is a design for a future separately authorized implementation.

## Decision summary

| Decision | Future behavior | Preservation rule |
|---|---|---|
| Case creation | One immutable case ID per detected WID collision, linking only stable WID and Work references. | Creating a case does not modify any candidate Work or WID. |
| Public collision behavior | Maintain an explicit ambiguity result for a WID-only public lookup; do not silently choose a candidate. | Do not enumerate candidate Works or private evidence through the public API. |
| Evidence | Record a redacted evidence manifest and cryptographic content digest, with protected source custody outside the public response. | A digest proves a submitted packet is unchanged after intake; it does not prove the packet’s assertions. |
| Decision authority | Creators attest to their own testimony; the Keeper approves, declines, or records an inconclusive outcome. | No algorithm, timestamp, LLM, or route order chooses ownership. |
| Outcome recording | Every case state transition and any final conclusion is appended as a new signed/attributed case event. | Original WID, Work, media, creator declarations, and historical provenance are never rewritten. |
| Corrective action | Any later Work visibility, WID lifecycle, or public presentation change requires a distinct authorization. | An adjudication conclusion is not self-executing. |

## Current public behavior to preserve

Option A already makes the legacy WID Protocol refuse to select between multiple public candidates by returning `409 WID_AMBIGUOUS` with a lower-bound count. That behavior should remain the safe default through all B work. A numeric `/song/:id` route continues to render its specific Work; it is not a WID ownership determination. [3]

| Surface | Current safe behavior | B design requirement |
|---|---|---|
| Legacy WID Protocol | `409 WID_AMBIGUOUS` for multiple public candidates. | Retain until a separately approved public-policy change. |
| Public Work page | Renders a specific Work by numeric ID. | Do not label its WID as exclusively resolved merely because the page loads. |
| Registry R1 work lookup | Existing WID projection behavior is a read model, not adjudication. | Do not treat any selection order as evidence of ownership. |
| Creator/private review | No collision workflow currently exists. | Add only a governed, access-controlled case surface if separately approved. |

## Collision case state model

The case state is neutral. It describes the status of review, never the worth, legitimacy, or authorship of a creator or Work.

| State | Entered by | Meaning | Allowed next state | Forbidden inference |
|---|---|---|---|---|
| `DETECTED` | Integrity steward / controlled discovery | A WID has at least two public-published candidate Works. | `EVIDENCE_OPEN`, `CLOSED_NO_ACTION` | A collision does not prove fault. |
| `EVIDENCE_OPEN` | Keeper | Minimal packet is ready for creator notice. | `CREATOR_NOTICE_PENDING`, `INCONCLUSIVE` | Presence of system facts does not establish ownership. |
| `CREATOR_NOTICE_PENDING` | System acting on Keeper-approved case | Notices prepared for each reachable affected creator. | `RESPONSE_WINDOW`, `INCONCLUSIVE` | Notice delivery is not testimony. |
| `RESPONSE_WINDOW` | System | Creators may submit an attestation or decline. | `REVIEW_READY`, `INCONCLUSIVE` | Silence is not admission or waiver. |
| `REVIEW_READY` | Evidence steward | Required system facts and available attestations have been preserved. | `PROPOSED_OUTCOME`, `INCONCLUSIVE` | Review readiness is not a conclusion. |
| `PROPOSED_OUTCOME` | Keeper or delegated policy role | A non-executing conclusion is proposed with reasons and limitations. | `KEEPER_CONFIRMED`, `INCONCLUSIVE`, `WITHDRAWN` | A proposal does not change a public record. |
| `KEEPER_CONFIRMED` | Keeper | Append-only final case conclusion is recorded. | `CORRECTION_REQUESTED`, `CLOSED_NO_ACTION` | Confirmation does not auto-change any Work/WID. |
| `CORRECTION_REQUESTED` | Keeper after separate authorization | A separately governed correction request is queued outside the case record. | `CLOSED_NO_ACTION` | Case outcome cannot execute a correction itself. |
| `INCONCLUSIVE` | Keeper | Evidence cannot support a truthful conclusion. | `EVIDENCE_OPEN`, `CLOSED_NO_ACTION` | Inconclusive does not mean either Work is invalid. |
| `CLOSED_NO_ACTION` | Keeper | Case is ended without an operational correction. | Reopen only with new evidence. | Closure does not erase collision evidence. |
| `WITHDRAWN` | Authorized submitting actor / Keeper | A proposed outcome was withdrawn. | `EVIDENCE_OPEN`, `INCONCLUSIVE` | Withdrawal does not delete prior submissions. |

## Evidence model and thresholds

The system must distinguish **record facts**, **creator testimony**, and **analysis**. These categories must never be flattened into one confidence score.

| Evidence class | Examples | Admissible purpose | Insufficient / prohibited use |
|---|---|---|---|
| System record facts | WID string, immutable Work reference, public-state snapshot, route response class, collision detection time. | Establish that a collision exists and identify reviewed candidates. | Does not establish who owns a shared WID. |
| Creator attestation | Creator-approved statement about the Work’s registration context, signed/attributed by the authenticated creator. | State the creator’s own testimony and requested outcome. | Does not alter another creator’s testimony or record. |
| Custody evidence | Creator-approved references to independently controlled registration receipts, signed records, or original source artifacts, held with access controls. | Support a limited case conclusion after authenticity/authority review. | Do not publish raw files, private text, or sensitive asset locations. |
| Corroborating platform evidence | Verified historical event created independently of the collision process, if later available. | Support chronology or linkage with explicit limitations. | Do not infer absent provenance from currently empty `wids`/`provenanceEvents` tables. |
| Contextual metadata | Title similarity, artwork/audio URL differences, upload times, declared historical dates, genre, or description. | Explain why projection drift is observable. | Never use as ownership ranking or auto-resolution evidence. |
| Analysis | Human steward analysis or AI-assisted organization of explicitly approved evidence. | Organize material and identify unanswered questions. | Never treat as creator testimony, cryptographic proof, or binding outcome. |
| Prohibited decision factors | Earliest row, route ordering, listener counts, popularity, creator prominence, public visibility, or silence. | None. | Must not determine ownership, priority, or correction. |

### Minimum evidence threshold by action

| Future action | Minimum threshold | Decision authority | Does not authorize |
|---|---|---|---|
| Open a case | Verified public collision: same WID, at least two public-published Work references. | Integrity steward under Keeper policy. | Any WID or Work change. |
| Notify a creator | Case record and verified creator-to-Work association. | Keeper or delegated steward. | Sharing another creator’s private evidence. |
| Record a creator position | Authenticated creator attestation with immutable receipt/digest. | The attesting creator. | A conclusion about a different creator. |
| Propose a conclusion | System facts plus all available creator positions, stated gaps, and preservation impact assessment. | Keeper or formally delegated review role. | An automatic correction. |
| Confirm an outcome | Keeper approval with the conclusion’s limits and evidence manifest reference. | Keeper. | Mutation of Work, WID, provenance, asset, or public visibility. |
| Request an operational correction | Confirmed case outcome **and** a new separately scoped implementation authorization. | Keeper. | Bundling a destructive or irreversible action into B. |

## Roles and authority separation

| Role | May do | May not do |
|---|---|---|
| **Integrity steward** | Detect a collision, create a neutral case packet, record public system facts, request review. | Decide WID ownership, change public records, or access unrelated private material. |
| **Affected creator** | View their own Work reference, submit/withdraw their own attestation, indicate a requested resolution. | Alter another creator’s case submission, WID, Work, or testimony. |
| **Evidence steward** | Verify packet integrity and access-control compliance; mark evidence as received or unavailable. | Convert private evidence into public content or make an ownership ruling. |
| **Keeper** | Approve state transitions, confirm an outcome, authorize a later correction request. | Rewrite historical evidence, erase an unfavorable attestation, or delegate a conclusion to an algorithm. |
| **System** | Enforce state transitions, access control, append-only storage, redacted auditing, and public ambiguity response. | Infer ownership, disclose sensitive evidence, or mutate a Work/WID from a case event. |
| **AI tool** | Summarize only explicitly approved case material and label output as non-authoritative analysis. | Receive private evidence without authorization; decide cases; write provenance. |

## Future append-only record design

Because the current Registry event tables are empty, the implementation must not overload them or pretend that a new case decision is historic registration evidence. A future migration should add **new, purpose-specific append-only tables** only after separate authorization.

| Candidate record | Core fields | Privacy and immutability rule |
|---|---|---|
| `wid_collision_cases` | `caseId`, `wid`, detection digest, created-by role, initial state, created timestamp. | Stores no raw testimony or media. Never updates or deletes the original registration/Work. |
| `wid_collision_case_candidates` | `caseId`, canonical Work reference, public-state snapshot digest, recorded timestamp. | References each candidate without copying title, media URL, or creator profile into the case record. |
| `wid_collision_evidence_manifests` | `manifestId`, case ID, class, digest, protected custody reference, submitter role, availability state. | Protected source material remains in controlled storage; a digest is not truth certification. |
| `wid_collision_creator_positions` | `positionId`, case ID, creator reference, requested disposition, attestation digest, submitted timestamp. | Each creator can append their own position; no editing of a previous position. |
| `wid_collision_case_events` | event ID, case ID, from/to state, actor role/reference, reason code, prior-event digest, timestamp. | Append only; reversal occurs through a new superseding event, not update/delete. |
| `wid_collision_outcomes` | outcome ID, case ID, conclusion class, limitations, evidence-manifest digest, Keeper approval reference, timestamp. | A non-executing conclusion. It cannot mutate linked Works/WIDs. |
| `wid_collision_correction_requests` | request ID, outcome ID, separately approved scope reference, current execution state. | Tracks authorization boundary only; no direct data writer in B. |

Every event must carry an actor reference, timestamp, reason code, previous-event digest where applicable, and a schema version. The application must reject direct `UPDATE`/`DELETE` paths for case facts and events. An appended `WITHDRAWN`, `SUPERSEDED`, or `CORRECTION_DECLINED` event provides the audit trail where a prior position must be retracted or corrected.

## Public, creator, and Keeper projections

| Projection | Allowed information | Not allowed |
|---|---|---|
| Public WID endpoint | Explicit ambiguity class; generic candidate-count lower bound; link to neutral explanation. | Candidate list, raw evidence, internal case ID, creator contact data, or ownership conclusion before approved public-policy publication. |
| Public Work page | Existing Work-specific content plus, only if explicitly approved later, a neutral unresolved-WID notice. | Claim that the current Work exclusively owns the WID; exposure of other candidate evidence. |
| Creator case view | Their Work reference, neutral collision description, their own submissions, authorized response controls, and redacted process status. | Other creator’s private testimony, media, contact details, or confidential attachments. |
| Keeper review view | Full authorized manifest inventory, case event sequence, redacted system facts, evidence availability status, and decision controls. | Browser-visible secrets, private content beyond case authorization, or hidden automatic recommendation as a decision. |

## Future implementation plan and gate

### B0 — No-mutation implementation preflight

Before code or migration work, repeat a bounded read-only collision inventory that identifies only the five WID values and candidate Work IDs; confirm they remain public-published; test the current `409` ambiguity behavior; and assess whether the active data store supports append-only constraints and protected evidence references. This inventory must not fetch raw creator content or assets.

### B1 — Additive case ledger migration

Only with specific authorization, add the new case tables and indexes. The migration must be reviewed as generated SQL, applied through the managed workflow, and verified with empty-table/read-only schema inspection. It must contain no migration that changes `songs`, existing WIDs, legacy anchors, `provenanceEvents`, creator testimony, media URLs, status, visibility, or WID values.

### B2 — Restricted Keeper and creator workflow

Add protected procedures with explicit role checks, case-level ownership checks, input validation, and redacted audit logging. There must be no client-side direct database access, browser-held Registry key, automatic WID assignment, or AI provider call. The implementation should use new case routes/surfaces, not retrofit the existing registration path.

### B3 — Public projection alignment

Only after a policy review, optionally project a neutral case state through existing public WID surfaces. Default remains `409 WID_AMBIGUOUS`. Any candidate enumeration or public outcome disclosure requires separate explicit approval and privacy review.

### B4 — Separately authorized correction execution

Only after Keeper-confirmed outcome and an additional bounded authorization may an operational correction be designed. Such work could be a new relationship assertion, a visibility-policy request, or another append-only correction artifact. It may not silently delete, reissue, replace, or change a WID.

## Validation requirements for a future B implementation

| Area | Required contract |
|---|---|
| Collision detection | Cases open only when a WID has at least two public-published candidates. |
| Public safety | Ambiguous WID returns `409`; candidate references and evidence are never exposed publicly. |
| Creator isolation | One creator cannot read or mutate another creator’s position/evidence. |
| Append-only integrity | Update/delete attempts against case events, attestation records, and outcomes are refused; supersession appends a new event. |
| Keeper authority | No outcome confirmation or correction request without an authorized Keeper role and recorded approval event. |
| No self-executing correction | Confirming an outcome changes no Work, WID, public state, media field, or provenance record. |
| AI boundary | AI output is labeled non-authoritative and cannot transition case state or create a binding outcome. |
| Regression | Existing A route contracts for single-public, absent, and ambiguous WIDs remain green. |
| Operational audit | Audit events retain route/case identifiers and outcome classes, but no raw testimony, raw searches, secrets, or protected evidence. |

## Rollback and reversibility

Source changes may be rolled back to the prior managed checkpoint. Case entries, once created, are not deleted in response to a rollout issue: an append-only `SYSTEM_CORRECTION`, `WITHDRAWN`, or `SUPERSEDED` event records the reversal, while feature access can be disabled. An application rollback must never be used to conceal a prior case action.

## Rejected alternatives

| Alternative | Why it is rejected |
|---|---|
| Choose earliest-created public Work | Creation order is an implementation artifact, not ownership evidence. |
| Select the Work returned by an existing route | Route selection is a read-model behavior, not an adjudication authority. |
| Copy title/artwork/audio from one Work to the other | This would erase Work-specific manifestation differences and create new false provenance. |
| Delete, reissue, or overwrite duplicate WIDs | Violates immutable chain-of-record and creator sovereignty. |
| Infer outcome from dates, popularity, AI analysis, or silence | These are not adequate authority or evidence. |
| Store raw private evidence in a public Registry response | Violates custody, privacy, and purpose limitation. |

## Required next authorization

The B-design is complete when this ADR is checkpointed. The next action in the agreed program is either:

1. **Approve B0 preflight only** — a fresh bounded collision inventory and current-route verification; no schema, source, or record change.
2. **Approve B1–B3 implementation planning** — a detailed implementation proposal and migration review package, still with no applied migration; this is a new scope decision.
3. **Hold B and move to D policy review** — retain public ambiguity behavior and proceed only to the sitemap question.

### References

[1]: `REGISTRY-INTEGRITY-DIAGNOSTIC-2026-09-14.md` — canonical read-only collision and projection-drift classification.
[2]: `REGISTRY-C0-1-COMPATIBILITY-PREFLIGHT-2026-09-14.md` — zero-row WID/provenance evidence and C0 hold decision.
[3]: `server/domains/registry/publicWitnessProjection.ts` — current public ambiguity projection contract introduced under Option A.
[4]: `server/routers/satchel.ts` — existing append-only provenance-event pattern; considered as a conceptual precedent only, not an authorized collision-adjudication writer.
