# ADR-024: Local-First Creative Workspace and Public Nexus Boundary

**Status:** Proposed — implementation requires Keeper approval.  
**Date:** 2026-08-14. **Author:** Manus AI.  
**Decision scope:** Architecture and migration planning only. No application code, database schema, storage object, production record, publication state, route, entitlement, or synchronization behavior was changed in preparing this document.

> **Decision in one sentence:** Living Nexus should become a two-environment system: an installable creator-owned workspace with a local database for private creative work, and the existing public Living Nexus network for creator-approved music manifestation; the two databases exchange selected records through an explicit, attributable synchronization boundary—not through automatic replication or direct database access.

## 1. Keeper direction and fixed boundaries

The submitted directive establishes a local-first creative workspace where creators can work privately with music, artwork, Quiver, Guides, provenance avatars, WIDs, provenance, playlists, and an Agent. Only deliberate outward manifestation should enter the public registry. The immediate public scope remains **music**.[1]

Two subsequent commands are binding for this assessment. **Explore stays** as the public songs-and-creators discovery surface. The architecture must also support a controlled exchange between a local database and the public database in both directions, without making the public database the authority over private work.[2]

| Boundary | Decision |
|---|---|
| **Public discovery** | Retain `/explore` as the public, music-only discovery surface. |
| **Private work** | Drafts, working files, Quiver assets, local WIDs, local provenance, creator memory, Guides, and avatar selections belong to the creator’s local workspace by default. |
| **Public registry** | Songs, public WIDs, public provenance, creators, witnesses, comments, playback, attribution, and support remain in the existing web platform when a creator elects to manifest them outward. |
| **Authority** | A creator, not the Agent and not an automatic sync process, confirms public manifestation, attachment, identity use, or consequential record change. |
| **Legal boundary** | This ADR describes technical data boundaries. It makes no determination about copyright, ownership, derivative rights, licensing, or commercial rights. Those remain legal-review questions. |

## 2. Current-state finding

Living Nexus already contains several elements of the desired first vertical slice, but they are implemented as a **managed public web workflow**, not as an installable local workspace.

| Area | Current implementation | Retain | Gap to Local-First |
|---|---|---|---|
| Music intake | `MusicEnvironment` accepts audio in the browser, extracts metadata/embedded art, allows creator review, and generates/remixes cover art. | Interaction sequence and pure metadata/tone helpers. | Files are uploaded to the web app’s S3 route before a record is saved; there is no creator-owned local file store or local database. [3] |
| WID and provenance | The browser hashes the selected audio, signs a WID payload, and sends the data into the server song flow. | Existing WID format, hash/signature concepts, and explicit confirmation. | The current WID is created in a browser session and is coupled to the managed submission flow; there is no separately durable Local WID record/event ledger. [3] [4] |
| Draft versus public | The music flow offers an explicit `Draft` or `Published` choice and enforces confirmation/WID/visual gates before submission. | The explicit state model and creator confirmation. | Both states currently live in the public platform’s `songs` table; “Draft” is not yet a local-only state. [3] [4] |
| Quiver | Protected Quiver procedures save creator-owned image records, including prompt, reference, optional Guide/WID context, title, remix status, and an owner-only gallery toggle. | Private-by-default lifecycle and lineage fields. | Quiver is a server-side table in the public web application, and its primary legacy UI path is orphaned. It is not yet a local shelf. [5] [6] |
| Guides and avatars | Guide records, upload/detail routes, avatar registry, catalog, and equip substrate remain present. | Existing identity/provenance assets; separate Guide-source and AVT-representation boundary. | There is no unified local identity shelf and no approved local-to-public representation claim model. [4] [6] |
| Agent | Current governed authority is limited to a creator-scoped music-Draft capability, explicit commissions, and an append-only Agent Ledger. | Capability/commission/ledger governance and explicit confirmation posture. | The examined PNA panel remains conversation-first; it does not yet operate against a local workspace service layer or a selected local creation context. [7] [8] |
| Context panel | ADR-023 provides strict canonical `explore`, `work`, `creator`, `provenance`, and `now-playing` references with only open/verify/play actions. | The reference contract and read-only context discipline. | It does not model Local Creation, Local Manifestation, Quiver Asset, local provenance, or local/public scope. [8] |
| Explore | The current page filters its feeds to audio, frames itself as songs-and-artists discovery, supports creator search/filtering, WID marks, and persistent playback. | Preserve unchanged as the public discovery destination. | It is not a private library and must not be asked to act as one. [9] |

### What this means in plain language

The first music workflow is worth preserving; it already takes a creator from a selected audio file through metadata, participation, a WID, artwork, waveform, and an intentional Draft/Published choice. However, its current behavior sends the audio and derivative media to public-platform storage before the song record exists. That does **not** satisfy “create locally first, publish by consent later.” It is a valuable template for the local vertical slice, not the local vertical slice itself.[3]

The forensic inventory also remains true: Quiver, image generation, Guides, avatars, and their records were not lost. The work is to give them a clear local Studio home and a safe path to public manifestation, rather than recreate them.[10]

## 3. Architectural decision

### 3.1 Two databases, two authority scopes

The requested back-and-forth database behavior must be implemented through an **application synchronization service**, not by letting a local app connect directly to the public MySQL database and not by turning either database into an uncontrolled mirror.

```text
┌──────────────────────────────────────┐
│ Living Nexus Local                    │
│ Creator-owned installable workspace   │
│                                      │
│ Local SQLite database                 │
│ Local media / asset store             │
│ Local Agent tool layer                │
│ Outbox + Inbox + conflict queue       │
└───────────────┬──────────────────────┘
                │
                │ Explicit creator-approved publish / attributable pull
                │ Idempotent records · scoped API · signed identity
                ▼
┌──────────────────────────────────────┐
│ Publication and Sync Service          │
│ Public API boundary                   │
│ Validates authority, version, scope,  │
│ hashes, event ordering, and intent    │
└───────────────┬──────────────────────┘
                ▼
┌──────────────────────────────────────┐
│ Living Nexus Public                   │
│ Existing managed web platform         │
│ Public MySQL + S3 + public registry   │
│ Explore · Song · Creator · Verify     │
└──────────────────────────────────────┘
```

| Database | Authoritative for | It must not authoritatively control |
|---|---|---|
| **Local workspace database** | Private creations, manifestations, local asset pointers, local metadata revisions, local WIDs, local provenance events, private Quiver, local playlists, Guide/Avatar working context, creator settings, and pending sync actions. | Public witness activity, public support/payment outcomes, or public registry moderation state. |
| **Public Nexus database** | Publicly manifested song records, public WIDs/provenance, public playback/discovery, witnesses, comments, creator profiles, support, public claims, and public registry state. | A creator’s unmanifested drafts, private Quiver assets, local prompts, local memory, or private working files. |

### 3.2 Exchange contract: back and forth without silent overwrite

The future transport should operate with an **outbox/inbox event contract**. A local change first commits to the local database and emits a local append-oriented event. A creator may then select a manifestable Creation or Manifestation and explicitly enqueue a public manifestation request. The public service validates the identity, authority, event order, local WID/hash, and requested visibility; it then creates or updates only the public projection that the creator approved.

Public changes can return to the local workspace as separately typed updates: public registry status, canonical public WID, public URL, witness count, comments allowed for display, support state, or public-record correction notices. They must be stored as **public projections**, never written over private working records or creator declarations.

| Direction | Permitted data classes | Creator confirmation | Conflict policy |
|---|---|---|---|
| **Local → Public** | Approved music Creation/Manifestation, selected artwork, metadata snapshot, local WID/hash/signature, approved provenance events, and explicit publication intent. | Required for every first manifestation and every material public update. | Reject unsafe/ambiguous requests; retain local truth; surface a resolution card. No last-write-wins provenance rewrite. |
| **Public → Local** | Public record ID/URL, canonical public WID, verification result, public status, public witness/support/discovery projection, and public event acknowledgements. | Automatic pull is permitted only after the creator connects that public record to their local workspace; user can disable it. | Store beside the local object as a public projection; never overwrite private metadata or history. |
| **Local-only** | Private media files, raw prompts, unselected Quiver assets, local memory, local notes, private Guide context, and unpublished drafts. | No public transfer. | Remain local unless a later explicit action selects them. |

Every transfer needs a globally unique event ID, local object ID, public object ID when available, causal parent/version, schema version, content hash where a file is involved, creator identity, explicit intent, timestamp, acknowledgement state, and error/conflict information. Repeated delivery must be idempotent. Provenance corrections must append a superseding event; they must not mutate prior history.

## 4. Local data model

The local model should preserve the directive’s distinction between an authored work and a particular file.

```text
Creator
  └── Creation                         (authored music work)
        ├── Manifestation               (a specific audio file/version)
        ├── MetadataSnapshot            (creator-confirmed metadata)
        ├── LocalWID                    (local Nexus identity)
        ├── ProvenanceEvent[]           (append-oriented history)
        ├── Asset[]                     (cover art, waveform, Quiver items)
        ├── GuideLink[]                 (optional creator-context link)
        └── PublicProjection?           (only after public connection)
```

| Local table / service | Minimum responsibility | Existing source to retain or translate |
|---|---|---|
| `creators` | Local profile identity, local public-key reference, appearance preferences. | Existing creator fields and public-key concept in `users`. [4] |
| `creations` | The authored music object independent of a file. | Existing song identity and WID relationships, separated from public status. [4] |
| `manifestations` | File name, MIME type, local path, SHA-256, duration, sample data, media state. | Existing upload/hash/waveform behavior. [3] [4] |
| `metadata_snapshots` | Creator-confirmed metadata revisions. | Existing metadata, participation, tone, and HAAI fields. [3] [4] |
| `local_wids` | Local WID plus signature/key reference, separate from public registration. | Existing client hash/signature/WID construction; do not replace without evidence. [3] |
| `provenance_events` | Append-oriented local history with actor and canonical payload. | Existing public provenance and Agent Ledger posture. [4] [7] |
| `assets` / `quiver_items` | Local media pointer, generation/reference lineage, private lifecycle. | Current protected Quiver model. [5] |
| `guides` / `avatars` | Identity context and authorized representation state. | Existing Guide and avatar/skin fields; no automatic conversion. [4] [10] |
| `sync_outbox` / `sync_inbox` / `sync_conflicts` | Consent, delivery/retry, acknowledgement, and human resolution. | New tables; they must be additive and do not replace WID/provenance tables. |

Large media remains outside relational columns. The local database stores path/key, media type, size, SHA-256, creation time, and ownership/scope metadata. SQLite supports a durable embedded database and versioned migrations in a native desktop package; the Tauri SQL plugin documents SQLite support, transaction-backed migrations, and explicit permissions. [11]

## 5. Viable delivery approaches

The two options below are technically viable. The first is the recommended end-state because the directive requires a creator’s **installable, independent creative home** with local media and a local database.

| Approach | What the creator experiences | Tradeoffs | Cost | Setup complexity |
|---|---|---|---|---|
| **A. Native local companion plus retained public web** **(recommended)** | A Living Nexus Local desktop application runs on the creator’s computer, owns a SQLite database and local media library, and synchronizes selected records to the existing public site. | Requires packaging, local migrations, a native file-access boundary, and a new synchronization API. The public web app remains separate. | Uses the creator’s hardware for private work; existing public hosting continues. | Higher, but it genuinely satisfies local-first. |
| **B. Installable offline web workspace** | The existing React app is made installable and stores structured records/assets in browser-managed storage with offline support. | Faster UI reuse, but storage remains tied to a browser origin and quota; persistent storage can be denied or cleared by a user, so it is weaker as a sovereign archive. | No separate desktop packaging. | Lower, but it is a proving ground—not the final independence model. |

A progressive web app can use IndexedDB for asynchronous structured/binary client data and Cache Storage for network resources, but storage is origin-scoped and subject to browser persistence/quota behavior. It is appropriate for an early offline prototype, not as the only long-term custody model for a creator archive. [12] [13]

The recommended native companion can use Tauri with SQLite. Tauri documents SQL access through supported SQLite drivers, local app-config database paths, atomic migrations, and explicit permissions. This does not authorize implementation yet; it establishes that the selected technical direction is feasible.[11]

## 6. Workspace design: retain the good, change the metaphor

The public Loop navigation remains fixed: **Home · Explore · Register · Manage · Archive**. Explore continues to expose music discovery, creators, WIDs, and playback—not private local inventory.[9]

The local workspace needs a distinct shell:

```text
┌────────────────┬───────────────────────────────────┬──────────────────┐
│ LOCAL NAV      │ CREATION WORKSPACE                 │ CONTEXT          │
│ My Works       │ Current Creation / Agent assistance│ Creation         │
│ Drafts         │ Creation cards / player            │ Manifestation    │
│ Quiver         │ + Add Music / Generate Art         │ Local WID        │
│ Guides         │                                   │ Provenance       │
│ Avatars        │                                   │ Public state     │
│ Sync Queue     │                                   │                  │
└────────────────┴───────────────────────────────────┴──────────────────┘
```

The Agent belongs **inside** this workspace, not as the workspace itself. The existing `NexusContextRef` contract already offers the correct safety posture: typed references, source labeling, and only user-initiated open/verify/play actions. It should be extended in a later approved ADR with `local-creation`, `local-manifestation`, `quiver-asset`, and `sync-status` references rather than accepting arbitrary Agent payloads.[8]

The existing PNA chat panel should be treated as a companion implementation to refactor, not the primary Local UI metaphor. It currently owns conversation state, calls chat mutations directly, and offers shortcut buttons; it does not yet bind a selected local creation to stable application services.[7]

## 7. What can be retained versus what must be built

| Retain or extract | Do not reuse unchanged | New capability required |
|---|---|---|
| Pure music helpers for hash, metadata assistance, embedded-cover extraction, tone derivation, waveform generation, participation disclosure, and visual lineage. [3] | `MusicEnvironment` as the local data source: it directly posts files to the public `/api/upload-file` endpoint and mutates public songs. [3] | Local ingestion service, local file store, local media/player index, and local database migrations. |
| WID format, signature intent, WID display, and append-only evidence posture. [3] [4] | The public `songs` table as a local Draft table. | Local WID / provenance event services and an explicit mapping to public registry IDs. |
| Quiver’s creator-owner rule, prompt/reference lineage, and private-by-default behavior. [5] | The current `registeredAsWid` gallery toggle as a substitute for creator-confirmed public manifestation. | Local Quiver library plus Attach to Creation, Discard, and Manifest/Publish actions. |
| Agent capability, commission, and append-only ledger foundation. [7] | An unscoped chat prompt as authoritative context. | Local Agent tool contracts that retrieve application facts and require confirmation for consequences. |
| `NexusContextPanel` typed reference contract. [8] | Its current public-only vocabulary. | Local/public scope, creation/manifestation/asset/sync context kinds and resolver services. |
| Public Explore, Work, Creator, Verify, and Global Player. [9] | Making Explore show private drafts, Quiver, Guides, or unpublished assets. | A local public-projection marker so creators can see what was manifested without mixing libraries. |

## 8. Smallest safe vertical slice

The first implementation should be a local-only music loop with a visible future publication path. It must not start by synchronizing every historical public record, rebuilding the PNA, or replacing Explore.

| Step | Local behavior | Public behavior | Creator confirmation |
|---|---|---|---|
| 1. Add music | Select an audio file/folder; copy or reference it under explicit local-library policy. | None. | Select source and storage policy. |
| 2. Inspect | Extract metadata, show artwork, calculate hash, allow edits. | None. | Confirm metadata/participation. |
| 3. Record | Create `Creation`, `Manifestation`, Local WID, and append provenance events. | None. | Seal local record. |
| 4. Work | Play locally; generate or select art; save to Quiver; attach art to the Creation. | None. | Save/attach each asset. |
| 5. Review | Show a Context Panel with local WID, file hash, provenance, artwork, and Draft state. | None. | No action required to remain private. |
| 6. Manifest later | Place an explicit publish action in the Sync Queue. | Public API creates the approved public music record only after validation. | Confirm exact payload, selected assets, and public visibility. |
| 7. Discover | Public record becomes eligible for existing public routes. | Explore may display it once public registry criteria are satisfied. | Public manifestation confirmation already captured. |

### First-slice acceptance criteria

The first slice is complete only when a creator can install or run the local application, select music, see the local record in the workspace, play it, edit creator-confirmed metadata, obtain a Local WID, inspect append-oriented provenance, save/attach art in Quiver, remain private indefinitely, and see—but not accidentally trigger—a clear public manifestation path. The Agent may explain the selected record using typed local context, but may not publish, seal, sync, or invent attribution.

## 9. Risks, controls, and rollback

| Risk | Why it matters | Required control |
|---|---|---|
| Treating local and public records as one mutable row | Private edits could leak; public activity could overwrite author testimony. | Separate local objects from public projections, with explicit ID mapping and scope labels. |
| Direct database connectivity | Exposes database credentials and bypasses creator authority/business rules. | Use a scoped application API with authorization, idempotency, and audit events. |
| Auto-syncing Quiver/Guides/prompts | Private assets and creative context could be exposed without consent. | Default deny; creator selects exact asset/object and visibility for every outward action. |
| Last-write-wins provenance | Violates append-only Chain-of-Record truth and loses evidence. | Append superseding events; create conflict cards for human resolution. |
| Starting with a broad migration | Risks destroying working public registry, WIDs, storage links, and public routes. | Build the new Local vertical slice beside the web app; no bulk migration in the first release. |
| Agent becomes a hidden sync actor | Undermines creator sovereignty. | Agent receives typed read scopes; sync, attachment, publication, and external actions are confirmation-gated. |
| Browser-only archive dependence | Browser quota/origin storage may not satisfy a long-term local-custody claim. | Treat PWA as a prototype option; use a native local store for the intended sovereignty model. [12] [13] |

Rollback is simple in the first slice because Local runs beside Public. A local feature can be disabled without altering public records; public synchronization remains unavailable until its separate API contract, migrations, and acceptance tests are approved. Original local media, local events, and public records must be retained independently.

## 10. Six-layer architectural alignment

| Layer | Strengthened by this direction | Guardrail |
|---|---|---|
| **Identity** | Local Creator, Guide, avatar, Local WID, and public projection remain attributable. | Never collapse creator identity into an Agent persona or a generic skin. |
| **Manifestation** | One workspace makes music, art, and provenance legible without turning Explore into private inventory. | Preserve cathedral design tokens; do not create a generic dashboard. |
| **Relationship** | Explore remains a deliberate public discovery relationship; Agent aids the creator in local context. | No public relationship is created through background sync. |
| **Registry** | Local WID/provenance and public WID/provenance become connected but distinct records. | No provenance overwrite or direct database coupling. |
| **Stewardship** | Creator can keep work private, work offline, and inspect what leaves the machine. | No hidden extraction, upload, or Agent publication. |
| **Legacy** | Durable local media references plus explicit public projections improve recovery and continuity. | No clean-slate migration or deletion of surviving public records. |

## 11. Approval gates before implementation

Before code begins, the Keeper must decide:

1. **End-state package:** approve a native local companion as the target, with a browser-installed workspace permitted only as a prototype/bridge.
2. **Local storage policy:** should import copy audio into the local library by default, reference the original file by default, or offer both with the creator choosing each time?
3. **Public return flow:** which public projections should return automatically after a record is linked—registry status/WID only, or also witness/support/comment projections?
4. **First local Agent scope:** read-only explain/retrieve only, or read/write local Draft assistance through the already-governed commission model?
5. **First manifestation command:** should it initially create a **public Draft** for review or publish directly only after the same explicit gates the web flow uses?

## 12. Validation plan after approval

Implementation begins only with a dedicated local schema ADR, a migration plan, and a synced/public API contract. Each vertical slice must pass local database migration tests, file/hash integrity tests, WID/provenance append-only tests, sync idempotency/conflict tests, explicit-publication tests, access-control tests, public Explore regression tests, player continuity tests, reduced-motion/accessibility tests, `pnpm check`, full tests, and `pnpm refine` with no score decrease.

## References

[1]: [Keeper-submitted “Living Nexus — Local-First Creative Workspace & Public Nexus” directive](../../upload/pasted_content.txt) — mission, Local/Public model, local data model, agent authority, first vertical slice, and non-destructive development order.

[2]: [`docs/LOCAL_FIRST_DIRECTIVE_INTAKE.md`](LOCAL_FIRST_DIRECTIVE_INTAKE.md) — recorded Keeper clarifications retaining Explore and requiring a local/public two-database exchange.

[3]: [`client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx`](../client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx) — current audio intake, metadata, WID, artwork, S3 upload, waveform, and Draft/Published flow.

[4]: [`drizzle/schema.ts`](../drizzle/schema.ts) — present public MySQL user, song, WID, agent authority/commission/ledger, Guide, Quiver, marketplace, and provenance entities.

[5]: [`server/routers/quiver.ts`](../server/routers/quiver.ts) — protected, creator-owned Quiver lifecycle and fields.

[6]: [`docs/LIVING_NEXUS_0_1_FORENSIC_INVENTORY.md`](LIVING_NEXUS_0_1_FORENSIC_INVENTORY.md) — preserved/orphaned Creator Studio evidence and non-destructive recovery boundary.

[7]: [`server/routers/agents.ts`](../server/routers/agents.ts) and [`client/src/components/PNAWorkspacePanel.tsx`](../client/src/components/PNAWorkspacePanel.tsx) — current Agent authority surface and chat-first panel behavior.

[8]: [`client/src/lib/nexusContext.ts`](../client/src/lib/nexusContext.ts) and [`client/src/components/NexusContextPanel.tsx`](../client/src/components/NexusContextPanel.tsx) — ADR-023 typed, read-only context contract.

[9]: [`client/src/pages/ExplorePage.tsx`](../client/src/pages/ExplorePage.tsx) — retained music-only public discovery experience.

[10]: [`docs/ADR-022-GUIDE-AVATAR-SHOP-CONVERSION.md`](ADR-022-GUIDE-AVATAR-SHOP-CONVERSION.md) — existing Guide-to-AVT separation and rights-sensitive representation boundary.

[11]: [Tauri SQL plugin documentation](https://v2.tauri.app/plugin/sql/) — supported SQLite driver, app-config path, migrations, transactions, and explicit permissions.

[12]: [web.dev: Offline data](https://web.dev/learn/pwa/offline-data) — IndexedDB, Cache Storage, origin-scoped storage, quotas, and persistence considerations for PWAs.

[13]: [Microsoft Edge: Store data on the device](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/offline) — PWA local storage options, File System Access, quota, and eviction considerations.
