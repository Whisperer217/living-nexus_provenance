# Living Nexus Cartography Audit

> **Status:** In progress — architecture audit and implementation hold.
>
> **Scope:** This artifact maps present code, documents, declarations, evidence, and unresolved legal boundaries. It does not create legal conclusions, alter doctrine, or authorize product implementation.

## Governing Boundary

| Layer | Meaning in this audit | Permitted conclusion |
|---|---|---|
| **Doctrine** | What Living Nexus believes, intends, or requires of itself | Record the doctrine and its source without treating it as law or proof of implementation. |
| **Technical Fact** | What current code, deployed configuration, test, or deterministic behavior records or performs | State only what the evidence demonstrates, with a source location. |
| **Creator Declaration** | A creator’s statement about their work, participation, intent, or rights | Preserve and label it as a declaration; do not adjudicate it. |
| **Evidence** | Material that can be independently inspected or reproduced | Name the evidence source, verification method, and limitation. |
| **Legal Claim** | A conclusion about rights, ownership, compliance, enforceability, registration, or liability | Mark **UNRESOLVED — QUALIFIED COUNSEL REQUIRED** unless supported by a qualified legal determination. |

> **Legal review boundary:** Living Nexus documentation is not legal advice. The audit must not alter doctrine to fit assumed law or alter law to fit doctrine. It preserves both and makes the boundary visible.

## Evidence and Status Rules

The codebase is the implementation source of truth. Product documentation is a source for stated intent and public claims, not proof that a capability exists. Tests demonstrate the behavior they actually execute, not legal effect or universal reliability. External sources establish only the facts published by their authoritative issuer.

| Status | Audit meaning |
|---|---|
| **EXISTS** | Implemented and located in current code or configuration. |
| **PARTIAL** | Some required records, routes, controls, or displays exist, but the full stated capability is not evidenced. |
| **PLANNED** | Explicitly intended in a dated doctrine, ADR, or roadmap but not located in implementation. |
| **REFERENCED BUT NOT IMPLEMENTED** | Named in code or documentation without evidence of a working implementation. |
| **DEPRECATED** | Superseded, redirected, delisted, or retained only for compatibility. |
| **UNKNOWN** | The audit does not yet have sufficient source evidence. |

## Source Hierarchy

1. **Current deployed behavior, database schema, server procedures, and deterministic tests** establish technical fact.
2. **Versioned architecture documents, ADRs, authorized doctrine, policies, and specifications** establish stated doctrine, policy, or intention.
3. **Creator-entered declarations and registered metadata** establish a creator declaration, not an adjudicated fact.
4. **Official agencies, standards bodies, and primary external publishers** establish external regulatory or technical context.
5. **Secondary sources and platform marketing** may identify questions, but cannot alone close a claim boundary.

## Implementation Hold

No product code, database migration, API expansion, design optimization, or claim-language promotion is authorized by this audit. If inspection exposes a defect, it is entered as a finding with: code truth, doctrine requirement, ethics requirement, registry requirement, creator need, evidence, classification, architectural-debt risk, and a proposed sequence. A later authorization is required to implement it.

## Audit Workstreams

| Workstream | Primary outputs |
|---|---|
| Codebase Truth | System, model, route, API, data-flow, and UI status matrix. |
| Doctrine and Ethics | Canonical doctrine taxonomy, origin, author/source, status, and implementation relationship. |
| Registry | Actual Creator → Intent → Manifestation → Declaration → WID → Evidence → Timeline → Relationships → Rights → Distribution → Archive map. |
| Claim Boundaries | Claim registry separating fact, technical capability, creator declaration, doctrine, aspiration, and unresolved legal position. |
| External Context | Official regulatory, standards, and comparative-system evidence with limitations. |
| Canonical Architecture | Evidence-bound target architecture, findings register, and P0–P3 sequence; no implementation. |

## Initial Primary Sources

| Source | Audit role | Boundary note |
|---|---|---|
| `ARCHITECTURE.md` | Reference architecture, stated platform pillars, layers, intended schema map, and WID vocabulary | Architecture is doctrine/design intent unless corroborated by schema, API, UI, and behavior. |
| `drizzle/schema.ts` | Database representation and mutability constraints | Technical fact for represented tables and columns; not proof of public behavior, legal effect, or immutability without enforcement evidence. |
| `server/routers/index.ts` | Assembled tRPC topology | Technical fact for mounted namespaces; not proof that each procedure is complete or reachable without procedure and auth review. |
| `client/src/App.tsx` | Routed public and authenticated surfaces | Technical fact for declared client routes; not proof of content quality, authorization, or external fulfillment. |
| `docs/AUTHORIZED_AGENT_DOCTRINE.md` and `docs/LOOP_PRODUCT_SPEC.md` | Authorized-agent and Loop doctrine | Doctrine/requirements; must be compared against current implementation. |
| `ARCHITECTURAL_LAWS.md` | Governance and preservation constraints | Doctrine/policy; technical enforcement must be separately evidenced. |
| Cartography Directive supplied by Doc Seraph Mercer | Audit scope and methodology | Governing task directive, not a statement of present implementation. |

## Findings Format

Each finding must use this record:

| Field | Required content |
|---|---|
| ID and title | Stable audit identifier and concise issue statement. |
| Current code does | Evidence-bound technical fact. |
| Doctrine requires | Quoted or linked doctrine requirement. |
| Ethics requires | Explicit ethical commitment and source. |
| Registry requires | Identity, evidence, mutability, visibility, or lineage boundary. |
| Creator need | Concrete creator-facing outcome and reciprocity implication. |
| Evidence | Source locations, reproducible observation, or authoritative URL. |
| Classification | Foundational, corrective, or cosmetic. |
| Claim boundary | What may be said now; what must not be said; what needs evidence, adoption, counsel, or enforcement. |
| Debt risk | Whether implementation now would create architectural debt and why. |
| Recommendation | Sequenced proposal only; **not authorized implementation**. |

