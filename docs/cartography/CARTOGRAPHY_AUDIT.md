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

## External Evidence Logged for Claim-Boundary Review

| Source | Independently verifiable external fact | Cartography boundary |
|---|---|---|
| [U.S. Copyright Office — Copyright and Artificial Intelligence](https://www.copyright.gov/ai/) | The Office’s AI initiative links Part 2, *Copyrightability* (published January 29, 2025), and its registration guidance for works containing AI-generated materials. | Does not establish an individual work’s authorship, ownership, or registrability. |
| [U.S. Copyright Office NewsNet 1060](https://www.copyright.gov/newsnet/2025/1060.html) | The Office states that copyright can protect generative-AI outputs only where a human author determined sufficient expressive elements; human-authored material, creative arrangement, or creative modification can be relevant, while prompting alone is not sufficient under the Office’s stated analysis. | HAAI metadata or a WID may record a declaration and provenance facts; neither is a copyright determination. |
| [Copyright Registration Guidance, 88 FR 16190](https://www.govinfo.gov/content/pkg/FR-2023-03-16/pdf/2023-05321.pdf) | The Office’s policy guidance addresses disclosure and disclaimer of AI-generated material in registration applications and describes a case-specific human-authorship inquiry. | Platform disclosure fields cannot substitute for registration disclosure, counsel, or Copyright Office review. |
| [European Commission — Article 50 transparency guidance](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations) | The Commission states Article 50 applies from August 2, 2026 and describes transparency obligations for certain AI providers and deployers, including direct AI interactions and machine-readable marking for certain generated/manipulated content. | Applicability to Living Nexus depends on jurisdiction, actor role, system functionality, audience, and facts requiring counsel. |
| [AI Act Service Desk — Article 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50) | The Service Desk reproduces Article 50 text and identifies provider/deployer transparency duties, while noting that its summaries are not legally binding. | Do not state compliance or non-compliance without a scoped legal review and technical evidence of applicable controls. |
| [USPTO — Revised inventorship guidance for AI-assisted inventions](https://www.uspto.gov/subscription-center/2025/revised-inventorship-guidance-ai-assisted-inventions) | The USPTO states that the same inventorship standard applies regardless of AI use and that only natural persons may be named as inventors; it characterizes AI systems as tools that may assist human inventors. | This is patent-inventorship guidance. It does not establish copyright authorship, platform ownership, or the legal status of any Living Nexus record. |
| [C2PA Technical Specification 2.4](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html) | C2PA describes an opt-in provenance architecture with assertions, claims, content binding, signatures, a trust model, and validation; it expressly frames provenance as trust signals rather than a value judgment that data is “good” or “bad.” | C2PA is an external technical comparator. Living Nexus cannot imply C2PA adoption, interoperability, or legal ownership without implementation and validation evidence. |
| [DOI Foundation — DOI System](https://www.doi.org/) | The DOI Foundation describes a DOI as a persistent digital identifier for an object, designed for human and machine use. | A persistent identifier is not ownership, accuracy, or a legal right. |
| [Crossref — Constructing DOIs](https://www.crossref.org/documentation/member-setup/constructing-your-dois/) | Crossref explains that a DOI identifies/locates a record but does not signify the value or accuracy of what it locates; metadata carries contextual information. | This is a direct registry design lesson: WID identifiers must not be presented as a truth or rights determination absent separately validated record context. |
| [Bandcamp — About](https://bandcamp.com/about) | Bandcamp describes a direct artist–fan music-store/community model and publishes its stated average artist/label payment share. | This is a commerce-model comparison, not evidence of Living Nexus payout performance or fee fairness. |
| [Creative Commons — Technology Platforms](https://creativecommons.org/share-your-work/platform/) | Creative Commons describes platform license integration as a combination of terms alignment, interface choices, and clear license communication. | A license selector or stored enum does not establish that a creator has rights to license a work or that a license is enforceable in context. |
| [FTC — Advertising and Marketing Basics](https://www.ftc.gov/business-guidance/advertising-marketing) | The FTC states that advertising claims must be truthful, not deceptive or unfair, and evidence-based. | Specific legal duties and enforcement exposure require counsel; the principle supports an evidence-bound public-claim review process. |
