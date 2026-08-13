# Living Nexus Current State Report

> **Audit status:** Evidence map, not an implementation plan.
>
> **Boundary:** This report states what was located in the current repository. It does not decide ownership, copyrightability, compliance, enforceability, or legal effect.

## 1. Technical Topology Located

Living Nexus has a routed React client, a compositional tRPC server router, and a Drizzle/MySQL schema. The current API root assembles distinct namespaces for music, profile, witness/provenance, payments, admin, Keeper/AI, collections, sessions, and platform functions. This establishes that the platform is broader than the presently frozen, music-first Loop surface; it does **not** establish that every namespace is complete, public, or within current product scope.

| Technical area | Current code evidence | Audit status |
|---|---|---|
| Client route shell | `client/src/App.tsx` places most application routes within `MainLayout`; `/verify`, shared playlists, downloads, and the diagnostic page are standalone. | **EXISTS** |
| Loop public spine | `/` → `HomePage`; `/explore` → `ExplorePage`; `/manifest` → `ManifestationStudio`; `/song/:id` → `SongDetailPage`; `/creator/:id` → `CreatorProfilePage`; `/manage` → `LoopManagePage`; `/verify/:witnessId` → `VerifyPage`; `/pna` → `PNAShellPage`. | **EXISTS** |
| Creator Domain route | `/@:handle` → `CreatorDomainShell`; `/setup-domain` → `SetupDomainPage`. | **EXISTS** |
| Legacy/non-spine routing | `/store` and `/marketplace` redirect to `/avatar-registry`; several non-music routes redirect to `/explore` or `/manage`. | **EXISTS** |
| Server API topology | `server/routers/index.ts` mounts dedicated namespaces including `songs`, `provenance`, `agents`, `wids`, `witness`, `tips`, `licenses`, `marketplace`, `audit`, `keeper`, `platform`, and `sessions`. | **EXISTS** |
| Database canonical model | `drizzle/schema.ts` defines users, agents, WIDs, songs, provenance-related records, payments, archive records, and other domains. | **EXISTS** |

### Route-Doctrine Observation

The current client redirects `/discover` to `/`, while the Creator Domain implementation specification describes `/discover` as a public Discovery surface. The current Loop specification instead names Home `/` as the orientation porch and Explore `/explore` as songs-and-artists discovery. This is not an implementation instruction. It is a **foundational terminology and routing-alignment finding candidate**: the audit must determine which currently authorized doctrine controls the canonical public naming before any routing change is considered.

## 2. Registry and Work Records Located

| Record or mechanism | Current technical fact | Boundary / limitation |
|---|---|---|
| User / Creator profile | `users` stores identity, profile, author-facing metadata, AI disclosure defaults, payment identifiers, origin and doctrine statements, public key, and state fields. | Stored fields are not independent proof that a person, biography, role, or rights claim is true. |
| Music work | `songs` stores title, audio metadata/assets, participation axes, status, AI disclosure, HAAI fields, visual provenance fields, WID-related references, lineage pointers, support counters, and moderation fields. | A row demonstrates recorded platform data, not legal authorship, clearance, or ownership. |
| Multi-medium retention | `songs.contentType` still permits `audio`, `lyrics`, `manuscript`, `comic`, `game`, `image`, `gcode`, and `3dmodel`; current public routes redirect several non-Loop paths to `/explore`. | The schema preserving non-audio records is consistent with retention, but display/ownership/export behavior remains a separate verification question. |
| WID table | `wids` stores WID, event identifier, content hash, creator identifier, optional signature, and timestamp. | The table alone does not prove how every WID was generated, which version was displayed, or legal validity. |
| Provenance canonicalization | `server/services/provenance.ts` normalizes content, computes SHA-256 hex, supports Ed25519 signing/verification, and returns an anchor payload. In that service, the MVP WID equals the content hash. | This describes the inspected service—not necessarily every historic registration path or the legal sufficiency of any WID. |
| Agent foundation | `agentCapabilityAuthorities`, `agentCommissions`, and `agentLedgerEntries` exist beside WID/provenance records. Their implemented capability enum currently contains only `music_draft`; ledger actions are currently capability enable/disable and commission issue. | This is a narrow foundation, not evidence that the full Authorized Agent Doctrine, Bridge model, local reasoning, continuity model, or multi-capability UI exists. |

## 3. Public-Claim Boundary Observed

The public Terms page says a WID is a timestamped cryptographic record and explicitly says it supports—but does not replace—official copyright registration. It also disclaims representations that a WID is copyright, trademark, or patent protection. Those are **public platform claims and disclaimers**, not legal conclusions made by this audit.

There is a technical-claim verification question: the Terms page describes a SHA-256 file hash, **ECDSA P-256** signature, and harmonic fingerprint, while the inspected canonical provenance service imports and uses **Ed25519** for its anchor signing utility. The audit cannot conclude that the page is inaccurate until it traces the active WID issuance paths and any separate ECDSA implementation. It records the mismatch as a **foundational claim-alignment candidate**, because cryptographic method names are externally verifiable technical statements.

## 4. Agent Doctrine Implementation Boundary

The authorized-agent doctrine names Creator Domain, Authorized Agent, Capability, Instrument, Bridge, Commission, Domain Continuity, Knowledge Record, Agent Ledger, and local-first reasoning as an ontology. Current schema evidence establishes only the narrow Music Draft authority / commission / ledger beachhead. The following remain **UNKNOWN or PLANNED pending direct implementation evidence**:

| Doctrine element | Current audit classification |
|---|---|
| Broader capability matrix beyond `music_draft` | **PLANNED / PARTIAL** |
| Knowledge Record model and provenance retrieval | **REFERENCED BUT NOT IMPLEMENTED** in the reviewed schema section |
| Bridge inventory, authority, and billing boundary | **REFERENCED BUT NOT IMPLEMENTED** in reviewed materials |
| Local reasoning provider | **UNKNOWN** — requires source and deployment review |
| Explicit confirm-before-seal procedure for agent output | **UNKNOWN** — requires procedure-level trace |
| Full Agent Ledger normative fields (sources, bridge, engine, result, witness, authority) | **PARTIAL** — current table is narrower than doctrine’s normative shape |

## 5. Current Platform Steward Scan

The non-invasive refinement scan recorded a platform score of **69/100 (C)**, a drift score of **100**, and ten open debt items. Its reported highest-priority concerns include attribution/discoverability doctrine violations on `SongDetailPage`, `ExplorePage`, `ArchivePage`, `HomePage`, and `DashboardPage`; large page monoliths; typography-token drift; accessibility and animation findings; and inconsistent error vocabulary. The scan is a **diagnostic source**, not an order to fix individual pages before the canonical map is complete.

## 6. Preliminary Findings Register (Not Implementation Work)

| ID | Finding | Classification | Evidence status | Why implementation is held |
|---|---|---|---|---|
| `F-001` | Discovery naming and Creator-Domain law have multiple stated route models (`/discover`, `/`, `/explore`). | Foundational | Direct doctrine and current route evidence located. | A route change before hierarchy resolution could deepen navigation drift. |
| `F-002` | Public WID cryptography language requires issuance-path trace against the inspected Ed25519 anchor service. | Foundational / claim boundary | Direct public claim and direct service evidence located; complete path not yet traced. | Changing language or code before trace could create a new inaccurate claim. |
| `F-003` | Authorized-agent doctrine is ahead of the implemented music-draft authority/commission/ledger beachhead. | Foundational | Doctrine and schema evidence located. | Expanding UI or agency before the continuity, Bridge, confirmation, and ledger target are mapped would create debt. |
| `F-004` | Retained multi-medium schema and music-first public insulation coexist. | Corrective architecture question | Schema and current route evidence located. | Hard cleanup or surface expansion must await registry/export/legacy map. |
| `F-005` | The refinement scan identifies widespread surface-level drift, but its output does not supersede the canonical architecture audit. | Corrective, not cosmetic | Diagnostic report located. | Page-by-page remediation now would optimize symptoms before architecture. |

## 7. Evidence Sources

| ID | Source |
|---|---|
| `CS-01` | `client/src/App.tsx`, lines 265–396 |
| `CS-02` | `server/routers/index.ts`, lines 1–194 |
| `CS-03` | `drizzle/schema.ts`, inspected identity/agent/WID/song definitions beginning at lines 10–570 |
| `CS-04` | `server/services/provenance.ts`, lines 1–142 |
| `CS-05` | `ARCHITECTURAL_LAWS.md`, particularly Laws I–VI and the Creator Domain specification |
| `CS-06` | `docs/LOOP_PRODUCT_SPEC.md`, especially §§1–10 |
| `CS-07` | `docs/AUTHORIZED_AGENT_DOCTRINE.md`, especially §§0–13 |
| `CS-08` | `client/src/pages/TermsPage.tsx`, lines 131–301 |
| `CS-09` | `refinement/reports/2026-08-13-steward-report.json` and `pnpm refine` output from the audit start |

