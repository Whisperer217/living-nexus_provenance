# A. Living Nexus Canonical Doctrine Map

> **Purpose:** Preserve the hierarchy, source, and status of doctrine without converting it into a technical or legal guarantee.

## Doctrine Hierarchy

| Tier | Doctrine family | Primary source | Status | Distinct responsibility |
|---|---|---|---|---|
| 1 | Mission and Prime Directive | `ARCHITECTURE.md` §§Purpose–Prime Directive | Reference architecture | Preserve, attribute, discover, and support human creative contribution. |
| 1 | Architectural Laws | `ARCHITECTURAL_LAWS.md` Laws I–VI | Canonical doctrine | Domain identity, domain supremacy, explicit declaration, Chain immutability, and Creator Domain primacy. |
| 1 | Loop Product Law | `docs/LOOP_PRODUCT_SPEC.md` | Solid implementation authority | Music-first public spine, non-destructive retention, and PNA/Guide insulation. |
| 1 | Authorized Agent Doctrine | `docs/AUTHORIZED_AGENT_DOCTRINE.md` | Solid implementation authority | Creator-scoped authority, replaceable agents, Commission, capability, and ledger law. |
| 2 | LNLS language and ontology | `docs/lnls/README.md` and children | Canonical vocabulary/reference | Keeps the platform’s language from collapsing domain identity into software jargon. |
| 2 | Public policy surfaces | `TermsPage.tsx`, `PrivacyPage.tsx`, `AttributionPage.tsx` | Public policy/claim surfaces | State current user-facing promises and limitations. They require claim-boundary review. |
| 3 | ADRs, implementation briefs, knowledge notes | `docs/ADR-*`, `docs/knowledge/*`, phased briefs | Decision records / contextual direction | Preserve local decision provenance; do not outrank Tier 1 law absent explicit enactment. |

## Core Concepts Must Remain Separate

| Concept | Doctrine meaning | Must not be silently equated with |
|---|---|---|
| Creator Domain | Persistent creator environment and locus of meaning. | An ordinary SaaS account or tenancy claim. |
| Manifestation | A registered creative work as a living artifact. | A raw uploaded file. |
| Creator Declaration | A creator’s recorded statement of participation, intent, or rights. | Adjudicated fact or legal clearance. |
| WID | A platform provenance identifier and record anchor. | Copyright registration, ownership title, trademark, or patent. |
| Chain of Record | Append-only domain history; correction occurs through supersession. | A claim that every database field is technically immutable. |
| Witnessing | A platform act of recording, affirmation, or testimony. | Independent legal authentication or proof of a legal claim. |
| HAAI | Human-authored / AI-informed disclosure and origin context. | Copyrightability determination. |
| Capability | Authority granted by a Creator Domain to an Authorized Agent. | A model-owned skill or unrestricted permission. |
| Bridge | Provenance-crossing connection to an external system. | Platform sovereignty or a guaranteed external right. |
| Domain Continuity | Attributable creator knowledge preserved under Law V. | Undifferentiated AI memory. |

## Doctrine-to-Implementation Relationship

The Architectural Laws explicitly subordinate software ontology to domain ontology. Therefore, a documented doctrine can be valid as doctrine while implementation remains **PARTIAL**, **PLANNED**, or **UNKNOWN**. Conversely, code can implement a behavior that lacks a current canonical doctrine. Both conditions are evidence to map, not permission to silently change either layer.

## Doctrine Governance Rules

| Rule | Cartography application |
|---|---|
| Preserve original provenance | Every doctrine entry retains original source path, status, author/source where stated, and amendment history where available. |
| Do not overstate immutability | “Immutable” is doctrine until the precise technical record, mutation boundary, and export behavior are evidenced. |
| Do not equate declaration with adjudication | Participant, HAAI, rights, and intent fields are creator declarations unless independently verified. |
| Use newer, more specific law carefully | The current Loop specification can govern its music-first surface without silently deleting broader reference architecture. Any conflict is a finding. |
| Require explicit amendment | No technical convenience, route migration, or UI refactor amends Tier 1 doctrine. |

## Open Doctrine Reconciliation Questions

1. Which authorized source governs the canonical public discovery name and emphasis where Law VI names `/discover`, while current Loop law names Home `/` and Explore `/explore`?
2. Which concepts are permanent domain law, which are product-scope constraints, and which are time-bounded implementation strategy?
3. What is the explicit amendment process for a “canonical and immutable” architectural law when later product law specifies a different public surface?
4. What doctrine governs source-verifiable public claim wording and its review cadence?

## Internal Sources

- `ARCHITECTURE.md`
- `ARCHITECTURAL_LAWS.md`
- `docs/LOOP_PRODUCT_SPEC.md`
- `docs/AUTHORIZED_AGENT_DOCTRINE.md`
- `docs/lnls/README.md`
- `client/src/pages/TermsPage.tsx`
- `client/src/pages/PrivacyPage.tsx`

