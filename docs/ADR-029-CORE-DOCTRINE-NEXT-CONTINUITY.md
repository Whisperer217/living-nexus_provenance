# ADR-029 — Core, Doctrine Pack, and Next Continuity

**Status:** Proposed — Keeper decision required before any repository split, historical checkout, rollback copy, domain change, database migration, or production routing action.

**Decision owner:** Doc Seraph Mercer, Keeper

**Scope:** Living Nexus Core recovery and a separate Living Nexus Next experimentation path.

## Decision

Living Nexus will not be destructively restarted. It will be treated as three continuous layers:

| Layer | Role | Authority |
|---|---|---|
| **Living Nexus Core** | Stable music registry and creator foundation: registration, metadata extraction, canonical audio, WID/provenance, creator identity, storage, payments, and public music discovery | Canonical product and record authority |
| **Living Nexus Doctrine Pack** | Versioned product law: creator sovereignty, WID and provenance invariants, capability boundaries, retention rules, vocabulary, visual tokens, acceptance tests, and ADRs | Governing contract for both engines |
| **Living Nexus Next** | Separate experimental engine for spatial interfaces, Creator Workspace evolution, local-first concepts, replaceable model adapters, and prototypes | May read approved projections; may not own or rewrite Core truth |

> **Continuity law:** New code may replace an interface only after it proves it preserves the Core contract. No capability, route, record, or doctrine asset is removed because a new surface appears more modern.

This decision separates **stable truth** from **experimental expression**. It does not authorize a production rollback, a repository clone, a domain switch, or a data migration.

## Why

The current system contains durable value that must not be confused with every current interface decision. The music registration contract, metadata helpers, tone derivation, waveform generation, Draft/Published intent, WID/provenance semantics, creator-owned storage pointers, creator confirmation gates, and append-only record posture are Core assets. The present friction sits largely in overlapping routes, orphaned surfaces, chat/workspace continuity, and experimental UI accumulation—not in the idea of a creator-owned music registry itself.[1] [2]

The version archaeology establishes a candidate history, not a rollback instruction. It identifies two useful recovery candidates:

| Candidate | Why it is relevant | What must be verified in an isolated copy |
|---|---|---|
| **Loop candidate `eab094a2`** | The Keeper identified this as the Loop music-provenance release with music registration, metadata, WID, tone, waveform, visual binding, and Draft/Publish gates. | Can a sample audio file complete metadata extraction, Draft save, WID seal, tone, waveform, and bound-visual validation without regression? |
| **Upload candidate `ef69e102`** | Historical checkpoint records a full-stack four-step upload/Witness ID flow with S3 upload, cover art, and AI-consent integration. | Does it retain the desired metadata behavior while fitting the current doctrine and schema contracts? |

Neither candidate may be placed under the production domain until it is copied, checked against preserved contracts, and reviewed by the Keeper. A historical interface is not automatically a valid present-day Core simply because it worked well at the time.

## Doctrine Pack Contents

The Doctrine Pack is a required, versioned dependency for both Core and Next. It cannot be conveyed only as a conversational prompt.

| Pack area | Required contents | Replacement rule |
|---|---|---|
| **Law and authority** | Authorized Agent Doctrine; Law V; creator confirmation; capability, Commission, and Ledger rules | No model, agent, or external bridge receives Core write authority by default |
| **Registry contract** | Music-first registration; canonical audio; metadata; participation axes; Draft/Published intent; WID, tone, waveform, witness/readiness rules | No Next surface may seal, publish, or invent provenance outside these contracts |
| **Creator workspace** | PNA thread ownership; private working state; Diary/archive distinction; Quiver custody; no automatic manifestation | Working state is not Chain-of-Record truth |
| **Product boundaries** | Explore is music-and-artist discovery; marketplace off Loop chrome; PNA is companion workspace; public versus private boundaries | A new route must declare its Core, Next, or projection status |
| **Design and language** | `--ln-*` tokens, typography, accessibility, mobile standards, the retained Loop spine, and canonical vocabulary | No hardcoded visual system or rename bypasses a vocabulary decision |
| **Acceptance suite** | Retain/replace/migrate/archive ledger; regression contracts; smoke scripts; migration gates; test fixtures | A replacement is blocked until the relevant Core contract passes |

The pack should be kept in a private versioned location that both repositories consume. The Keeper may choose either a dedicated private `living-nexus-doctrine` repository or a versioned shared package/subtree. The first option is clearer for independent engine histories; the second option has lower initial operational cost.

## Corrected Quiver Vocabulary

Quiver will no longer mean only “the image page.” It is the creator’s **private reserve of prepared creative assets and candidates**.

| Word | Canonical meaning | Authority boundary |
|---|---|---|
| **Quiver** | Private reserve of prepared creative assets: visuals, prompts, source materials, samples, candidates, and related working items | Private by default; never a public registry merely because an item exists |
| **Arrow** | One selected asset intended to carry force into a named work | A selection, not a publication event |
| **Fletching** | Deliberate refinement, preparation, or revision | May create a new working revision; must retain lineage |
| **Draw** | Creator chooses an Arrow for a named Draft or work | Explicit creator action; may require a confirmation card |
| **Release** | Creator-confirmed outward use or manifestation | Distinct from save, draw, WID seal, and public publication |

The short-term PNA route may be titled **Visual Quiver** where it shows images, while preserving Quiver as the broader Core concept. This is a vocabulary correction, not a data rewrite.

## Core Contract Boundary

Core owns the following:

| Core authority | Must remain canonical |
|---|---|
| Creator identity and authority | User identity, creator ownership, account/payment authority, and creator confirmation |
| Music registration | Audio intake, metadata extraction, participation, attestation, Draft/Published intent, validation, and storage references |
| Registry truth | WIDs, provenance events, witnesses, sealed/public state, append-only ledgers, and record supersession rules |
| Durable custody | S3/media references, private Quiver ownership, creator work/Draft associations, and existing historical records |
| Public projection | Explore, Work, Creator, Verify, and other explicit music-first public views |

Next must initially receive only a **read-only, typed projection**. It may display or spatially arrange data, but it may not directly connect to the Core database, issue WIDs, write ledger events, manage Core authentication, handle payments, or silently synchronize private assets.

The first Next contract should be intentionally small:

```text
CoreProjection.v1
  creator_summary
  public_work_summary
  work_provenance_state (sealed | unsealed; no inferred WID)
  public_lineage_edges
  permitted_visual_asset_summary
  projection_version
```

Private workspace integration comes later through creator-confirmed outbox/inbox events and idempotent projections, not shared writable tables.[3]

## Repository and Environment Posture

The target topology is **two Living Nexus repositories plus one shared versioned Doctrine Pack**.

| Repository/environment | Purpose | Production posture |
|---|---|---|
| `living-nexus-core` | Known-good recovery copy and future stable production engine | May retain or become the production domain only after the Keeper approves the verified candidate |
| `living-nexus-next` | Cursor/Three.js experimentation, spatial mock evolution, and fixture-first Creator Workspace experiments | Separate project/domain; no Core data writes during initial stages |
| `living-nexus-doctrine` or shared versioned package | Doctrine Pack shared by both engines | Private; immutable releases and review-required changes |

Before any fork, make a current full Task Data snapshot. Source-code history alone does not preserve database content, uploaded media, secrets, integrations, or hosted capability configuration.[4]

The correct sequence is:

1. Create and retain a full point-in-time Core backup, including the current database, uploaded files, configuration, and integrations.
2. Create a **private copy** of the current repository/project as Next or as a reference archive; do not alter the present production project during this copy.
3. Create a separate Core recovery copy from each candidate (`eab094a2` and `ef69e102`) in an isolated environment.
4. Run the same recorded music-registration scenario against each copy using safe test fixtures, not production creator work.
5. Produce a feature-diff ledger identifying what each candidate retains, what it lacks, and what must migrate forward from the present Core.
6. Let the Keeper select the Core candidate only after that evidence exists.
7. Keep Next fixture-first until a read-only CoreProjection.v1 contract passes conformance tests.

## Replacement Gates

Every existing surface must be classified before it can be changed:

| Classification | Meaning | Required evidence |
|---|---|---|
| **Retain** | Continues unchanged because it protects Core truth or a proven workflow | Contract test and owner affirmation |
| **Replace** | A Next surface may supersede the interface while preserving behavior and authority | Old/new behavior matrix; accessibility and regression proof |
| **Migrate** | Data or capability moves with a reversible, attributable mapping | Migration plan, backfill reconciliation, rollback procedure |
| **Archive** | Historical material leaves active navigation but remains retrievable and attributable | Archive path, access policy, provenance record |

The following replacements are prohibited without explicit Keeper approval: WID issuance, provenance events, Agent Ledger records, creator authority, public publication, private-to-public synchronization, Quiver custody, and payment behavior.

## First Three Core–Next Gates

| Gate | Next action | Pass condition | Prohibited action |
|---|---|---|---|
| **Gate 0 — Preservation** | Snapshot and catalog current Core and doctrine assets | Full backup exists; capability ledger is signed off by Keeper | Deleting routes, records, or repositories |
| **Gate 1 — Recovery proof** | Start two isolated candidate Core copies | A fixture song completes upload → metadata → Draft → WID/tone/waveform checks | Production domain switch or live data write |
| **Gate 2 — Read-only Next** | Connect spatial Next to a fixture or typed Core projection | Next renders selected Core facts and displays unsealed state without inventing lineage | Direct Core database write, auth/payment reuse, background sync |

Only after these gates may the Keeper authorize a narrow creator-confirmed write bridge.

## Six-Layer Alignment

| Layer | Strengthened by this decision | Guardrail |
|---|---|---|
| Identity | Creator Domain stays canonical in Core | Next cannot substitute model or interface identity for creator authority |
| Manifestation | Spatial interface can improve presentation | A visual system never becomes registry truth |
| Relationship | PNA and Next can improve creator/work continuity | No private working state leaks to public discovery |
| Registry | Music/WID/provenance contracts remain stable | No bulk rewrite or inferred lineage |
| Stewardship | Backup, retention, and explicit migration gates protect creators | No silent retirement or irreversible import |
| Legacy | Doctrine Pack and archive classifications retain institutional memory | Old systems remain attributable before replacement |

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| A rollback copy loses current data, files, configuration, or integrations | Create a current complete Task Data snapshot before any copy or restoration decision; never rely on source code alone.[4] |
| Cursor builds a visually compelling but doctrine-incompatible engine | Require Doctrine Pack version pinning, CoreProjection.v1 conformance, and replacement gates before any integration |
| Experimental code gains write authority too early | Begin fixture-first, then read-only projection, then explicit creator-confirmed outbox events only |
| New UI silently retires a valuable capability | Maintain retain/replace/migrate/archive ledger and require Keeper signoff for every active-surface change |
| Private Quiver or PNA data becomes public by accident | Preserve owner scope, private-by-default custody, and separate public manifestation actions |
| A historic commit is mistaken for the full recovery state | Test candidate copies with current doctrine acceptance criteria; do not equate old UI health with present Core completeness |

## Decision Requests

The Keeper need not authorize a rollback yet. The next decisions are limited to:

1. Approve the **two-engine plus Doctrine Pack** topology in principle.
2. Authorize a **read-only candidate recovery comparison** of `eab094a2` and `ef69e102` in isolated copies, with no production domain or database action.
3. Choose whether the Doctrine Pack should be a **separate private repository** or a **versioned shared package/subtree** shared by Core and Next.

No repository, production, domain, data, or rollback action proceeds from this ADR without those decisions.

## References

[1]: ./LOOP_PRODUCT_SPEC.md "Living Nexus Loop Product Specification"
[2]: ./AUTHORIZED_AGENT_DOCTRINE.md "Authorized Agent Doctrine"
[3]: ./ADR-024-LOCAL-FIRST-CREATIVE-WORKSPACE.md "Local-First Creative Workspace"
[4]: ../skills/data-backup-restoration/references/websites.md "Websites During the August 2026 Data Separation"
