# Registry C0.1 Compatibility Preflight

**Status:** Completed evidence-only preflight.  
**Authority:** Doc-approved C0.1, 2026-09-14.  
**Boundary:** Aggregate reads only. No source, schema, index, record, provenance, credential, sitemap, publication, or deployment change occurred.

## Decision

**Do not authorize C0 source-only compatibility implementation from this evidence.** The deployed legacy `wids` table is structurally present but contains **zero anchor rows**. The deployed `provenanceEvents` table likewise contains **zero events**. All 702 public-published Works have a `witnessId`, but none joins to a legacy `wids.widCode` row. There is therefore no truth-preserving legacy anchor payload from which a Registry provenance endpoint can project `registeredAt`, legacy file-hash evidence, signature, or event data. [1]

> A public Work WID demonstrates the Work’s current identifier field. It does not, by itself, prove a corresponding Registry anchor row, event, hash, signature, or registration timestamp.

The existing controlled `503 REGISTRY_READ_UNAVAILABLE` provenance response remains the correct behavior. Replacing it with a successful synthetic projection from `songs.witnessId` would overstate evidence and violate the approved preservation boundary.

## Aggregate evidence

| Preflight measure | Result | Interpretation |
|---|---:|---|
| Legacy `wids` rows | 0 | No legacy anchor payload exists to project. |
| Distinct `wids.widCode` values | 0 | Unique-index semantics cannot be empirically exercised on current data. |
| Legacy timestamp minimum / maximum | `NULL` / `NULL` | The `createdAt` unit cannot be established because there are no rows. |
| Plausible epoch-seconds rows | `NULL` | No timestamp evidence. |
| Plausible epoch-milliseconds rows | `NULL` | No timestamp evidence. |
| Missing `fileHash` / null `metadata` | `NULL` / `NULL` | Completeness cannot be assessed because the table is empty. |
| Public-published Works with a non-empty `witnessId` | 702 | Current public Work projection has WID-shaped identifier values. |
| Public-published Work `witnessId` values matching `wids.widCode` | 0 | No canonical public Work joins to a deployed legacy anchor. |
| Public-published Work WIDs without a legacy anchor | 702 | Every public WID lacks an anchor-table join in this environment. |
| `provenanceEvents` rows | 0 | No append-only Registry event evidence exists in the deployed event table. |
| Direct `provenanceEvents.eventId = wids.widCode` links | 0 | No independently stored direct event-to-anchor linkage exists. |

## Assessment of C0 eligibility

| Proposed C0 fact | Evidence status | Safe public behavior |
|---|---|---|
| WID string | Present only in `songs.witnessId`. | Continue to expose through canonical Work routes subject to A’s public-selection/ambiguity rules. |
| Legacy anchor registration time | No anchor row. | Do not project. |
| Legacy file-hash evidence | No anchor row. | Do not project. |
| Registry provenance event | No event row or link. | Do not project. |
| Signature | No anchor row or event row. | Do not project. |
| Timestamp-unit conversion | No timestamp values. | Do not infer. |

## Implication for the governed sequence

The C-design gate is complete, and C0.1 has shown that C0 cannot repair Registry provenance availability without inventing chain-of-record facts. The next governed action should therefore be **B design only**: an append-only duplicate-WID adjudication design for the five public collision groups. It must remain separate from any later decision on how verified Registry anchor data is re-established or linked.

The sitemap policy review (**D**) remains last. It must not treat the absence of an anchor-table row as permission to auto-register, auto-hide, or fabricate a WID.

## Explicit non-actions

No Work WID was deleted, changed, reissued, or backfilled. No creator testimony, metadata payload, media asset, private content, raw event payload, or credential was read. No migration, index operation, source edit, or deployment was performed.

### References

[1]: Managed database aggregate queries executed 2026-09-14 under Doc-approved C0.1: counts/ranges for `wids`, public-published `songs.witnessId` joins, and `provenanceEvents` action-type totals. No row-level creator content was retrieved.
[2]: `REGISTRY-SCHEMA-INDEX-RECONCILIATION-DESIGN.md` — approved C design and its C0/C1/C2/C3 decision boundary.
[3]: `REGISTRY-INTEGRITY-DIAGNOSTIC-2026-09-14.md` — initial read-only anomaly classification.
