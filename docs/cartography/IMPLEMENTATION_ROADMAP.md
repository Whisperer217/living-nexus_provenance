# K. Implementation Roadmap — Deferred Pending Authorization

> **No item below is approved implementation.** The roadmap sequences findings to avoid page-level optimization before registry, claim, and doctrine alignment.

## P0 — Foundational: Truth, Claim, and Registry Integrity

| ID | Change class | Objective | Evidence / dependency | Debt risk if rushed |
|---|---|---|---|---|
| P0-1 | Foundational | Reconcile canonical discovery / Creator Domain route law and publish an explicit amendment or precedence record. | `F-001`; doctrine owners. | Competing redirects and fragmented public identity. |
| P0-2 | Foundational | Trace every WID issuance, update, signature, timestamp, witness, version, verify, and export path; compare public crypto wording. | `F-002`; code and historic data sample. | False cryptographic or immutability claims. |
| P0-3 | Foundational | Establish a governed Claim Registry workflow: owner, source, evidence, review date, public-use status, counsel gate, and deprecation. | `CLAIM_BOUNDARY_REGISTRY.json`; policy owner. | Repeated unsupported UI/marketing claims. |
| P0-4 | Foundational | Define canonical record/event/evidence schema and mutation/supersession rules before more WID, witness, or agent work. | Registry specification; migration design. | Irreversible record-model fragmentation. |
| P0-5 | Foundational | Map actual data classification, retention, deletion, export, backup, and provider boundaries. | Schema, storage, policy, provider contracts, counsel. | Privacy and permanence statements diverge from reality. |

## P1 — Required: Creator-Meaningful Registry and Rights-Safe Flows

| ID | Change class | Objective | Success evidence |
|---|---|---|---|
| P1-1 | Corrective / foundational | Implement a canonical Living Object display schema in Human, Expert, and machine-readable modes. | Consistent object envelope across Work, Creator, Verify, Archive, and export. |
| P1-2 | Required | Add typed evidence/source classes and visible declaration labels. | Creator declaration, system record, witness, external source, and unresolved status are distinguishable. |
| P1-3 | Required | Define explicit version/supersession and no-silent-modification API/event behavior. | Audited mutation tests and visible chain links. |
| P1-4 | Required | Complete support/payment/licensing state model with fees, recipient, fulfillment, failure, cancellation, and receipt truth. | End-to-end state/reconciliation tests; claims approved. |
| P1-5 | Required | Produce export/recovery specification and restoration drill. | Independently inspectable export plus recovery evidence. |

## P2 — Valuable: Interoperability, Access, and Documentation

| ID | Change class | Objective | Success evidence |
|---|---|---|
| P2-1 | Foundational extension | Evaluate C2PA or other standards interoperability as a design proposal, including signer/trust/privacy implications. | ADR, threat model, sample validator path; no premature claim. |
| P2-2 | Corrective | Publish a provenance-bearing Doctrine / Documentation surface with source, status, implementation, legal boundary, and revision history. | Documentation object schema and claim links. |
| P2-3 | Corrective | Resolve reported refinery drift through a global surface-parity plan after canonical object vocabulary exists. | Token/accessibility/attribution parity evidence. |
| P2-4 | Required | Define contributor, witness, moderation, dispute, and appeal workflow. | Policy + API + event + visibility specification. |

## P3 — Future: Network and Agentic Maturity

| ID | Change class | Objective | Precondition |
|---|---|---|---|
| P3-1 | Future | Expand Authorized Agent capability menu beyond music drafts. | P0 Claim/Registry/Governance controls and P1 confirmation/event rules. |
| P3-2 | Future | Implement Knowledge Records, provenance retrieval, Bridge inventory, and vendor/local reasoning controls. | Privacy, portability, consent, economics, and external-provider analysis. |
| P3-3 | Future | Grow partner, distributor, verifier, and institutional adoption paths. | Stable exports, object schema, policy/counsel review, demonstrated creator value. |

## Decision Gate

Before each roadmap item is authorized, create or update an ADR that specifies:

1. Current code truth.
2. Doctrine requirement and amendment status.
3. Ethical impact across all six architecture layers.
4. Registry record/event effect.
5. Creator value and reciprocal platform value.
6. Source evidence and claim-registry changes.
7. Classification: foundational, corrective, or cosmetic.
8. Debt risk, migration, rollback, tests, and counsel gate.

