# Living Nexus — Product Map & Registry Architecture
## Figma Export Specification v1.0

**Status:** Design specification — ready to translate into Figma / FigJam; does not itself create a Figma file.  
**Date:** 2026-10-16  
**Human authority:** Living Nexus product stewardship  
**Construction provenance:** Prepared from current Living Nexus LNLS, route map, schema declarations, and accepted architecture records. It is a design and communication artifact, not a database migration, legal instrument, publication decision, or authority to alter any Registry record.

---

## 1. Purpose

This specification defines the first **Figma product-architecture file** for Living Nexus. Its purpose is to give creators, builders, and future collaborators one shared visual map of:

1. what Living Nexus is;
2. how its public and creator-facing systems relate;
3. where a Work moves from registration to discovery, support, and legacy;
4. how the Registry verifies and preserves a Work without overwriting its history; and
5. which parts are **implemented**, **in-progress**, or **directional**.

> **Prime Directive**  
> Every design decision, database schema, API endpoint, and user interaction must increase the permanence, discoverability, attribution, and supportability of human creative contribution. If a feature optimizes engagement while diminishing those four qualities, it must be redesigned.

### 1.1 The critical Figma boundary

Figma is the **visual architecture and interaction reference**. It is not the system of record.

| Source of truth | Authority it carries | What Figma may show |
|---|---|---|
| Living Nexus database, WID records, signed hashes, append-only events | Canonical operational records | A visual explanation or projection only |
| Server authorization and tRPC/API procedures | Who may read or act | Gates, roles, and safe states |
| LNLS, ADRs, audit records | Doctrine and approved decisions | Product rules, labels, and state notes |
| Figma Product Map | Design alignment and review | Page structure, journeys, component behavior, future concepts |

**Figma must never state that a component or flow is live unless it is labeled `IMPLEMENTED`.**

---

## 2. Figma File Setup

### 2.1 File identity

| Field | Specification |
|---|---|
| **Figma file name** | `Living Nexus — Product Map & Registry Architecture` |
| **Description** | `Creator-first product map, Registry architecture, journeys, states, and Cathedral design rules. Source: LNLS v1.0 and accepted ADRs.` |
| **Primary reviewers** | Product steward, Registry steward, design steward, engineering steward |
| **Review cadence** | Before any cross-system feature, schema migration, route expansion, or major navigation change |
| **Change discipline** | Add dated decision notes; never silently revise a node that represents an accepted Registry policy |

### 2.2 File pages

Create the following Figma pages in this order.

| # | Figma page | Purpose | Default view |
|---:|---|---|---|
| `00` | **Read Me — Authority & Legend** | Prime Directive, legend, source hierarchy, review rules | Cover / orientation |
| `01` | **Product Constellation** | Top-level services and their boundaries | Platform map |
| `02` | **Public Experience Map** | Discovery, Work experience, Creator Domain, Witnessing, Support | Public journey map |
| `03` | **Creator Registration & Archive** | Creator Domain establishment, Ingest → Confirm → Register → Publish → Archive | Creator journey |
| `04` | **Registry Architecture** | Provenance Object, WID, verification, versions, lineage, ambiguity behavior | Technical/conceptual map |
| `05` | **Roles, Authority & Legacy** | Creator, Witness, Steward, Keeper, custodian scope | Authority/custody map |
| `06` | **States & Exception Paths** | Draft/public/archive, missing data, duplicate WID, privacy and error states | State matrix |
| `07` | **Design System & Components** | Cathedral tokens, type, cards, provenance surfaces, responsive grammar | Component reference |
| `08` | **Roadmap / Explicitly Not Live** | Directional systems, paused services, deferred decisions | Risk and scope lane |

### 2.3 Status legend

Use status chips on every system, flow, and component group.

| Chip | Meaning | Visual treatment |
|---|---|---|
| **IMPLEMENTED** | Present in the current application and backed by a verified route, procedure, or schema | Gold outline + parchment label |
| **IN PROGRESS** | Active implementation exists but is not complete or should not be represented as production-ready | Gold-dim outline + `Work in Progress` note |
| **DIRECTIONAL** | Approved product direction or architecture, not an implementation claim | Dashed bone outline |
| **PAUSED** | Intentionally disabled; no interactive promise | Smoke/ash surface + lock glyph |
| **REQUIRES AUTHORIZATION** | Cannot proceed without an explicit human/policy decision | Ember-accent boundary, no action CTA |
| **EXCEPTION / AMBIGUOUS** | Truth-preserving state where the system must not choose or infer | High-contrast parchment text + amber warning edge |

Do **not** use green as a generic “good” indicator for Registry truth. Use a WID seal / gold provenance treatment for verified records and reserve status color for clearly labeled operational state.

---

## 3. Global Product Constellation

### 3.1 Root visual statement

Place this at the center of page `01`:

```text
LIVING NEXUS
The living registry of human creative contribution.

PRESERVE  ·  ATTRIBUTE  ·  DISCOVER  ·  SUPPORT
```

The map must read as a **cathedral of related systems**, not a funnel, social feed, or media storefront.

### 3.2 Product-map node inventory

Arrange six primary nodes clockwise around the Living Nexus root. Use arrows only where data or a creator journey actually travels; avoid decorative arrows.

| Node | Product role | Current boundary | Primary entry surfaces | Status |
|---|---|---|---|---|
| **Creator Identity & Domain** | A creator’s persistent public and private home | Identity, profile, handle, Creator Domain, testimony | `/:@handle` canonical domain route, creator profile surfaces, `/profile` | IMPLEMENTED, with legacy route consolidation still needed |
| **Manifestation Studio** | Registration workspace for a Work | Ingests files, detects/collects record fields, supports review and registration | `/manifest`, `/batch-upload`, `/ingestion/review` | IMPLEMENTED for current supported flows; universal all-media ingestion is DIRECTIONAL |
| **Registry & Verification** | Public truth/inspection layer | WID, current Work projection, verification, version and provenance presentation | `/verify/:witnessId`, public Work routes, Registry API | IMPLEMENTED with known ambiguity protections |
| **Explore & Discovery** | Intentional discovery of public Works and Creators | Universal public index, creator directory, filters, audio queue behavior | `/explore`, `/search` | IMPLEMENTED |
| **Relationship & Support** | Witnessing, Signals, correspondence, support and commerce | Witnessing Circle, public Signals, creator support; private correspondence is consent-gated | Creator/Work surfaces, Circle panel, support drawer | IMPLEMENTED with correspondence safeguards; payment/patronage scope varies by capability |
| **Archive & Legacy** | Preservation, export, versions, continuity | Creator archive, exports, version records, scoped legacy stewardship | `/archive`, `/my-archive/export`, Creator Domain legacy panel | IMPLEMENTED in current scopes; self-service legacy designation is DIRECTIONAL |

### 3.3 System relationship map — FigJam build order

Create these exact boxes and connectors on page `01`.

```text
                                  ┌──────────────────────────────┐
                                  │       LIVING NEXUS           │
                                  │ Preserve · Attribute ·       │
                                  │ Discover · Support           │
                                  └──────────────┬───────────────┘
                                                 │
      ┌──────────────────────────┐               │              ┌──────────────────────────┐
      │ Creator Identity & Domain│───────────────┼─────────────▶│ Manifestation Studio     │
      │ Creator, handle, profile │               │              │ Ingest · Confirm ·       │
      │ testimony, Creator Domain│               │              │ Register · Publish       │
      └──────────────┬───────────┘               │              └──────────────┬───────────┘
                     │                           │                             │
                     │                           ▼                             ▼
                     │              ┌──────────────────────────────┐
                     └─────────────▶│ Registry & Verification       │◀──────────┘
                                    │ WID · provenance · versions  │
                                    │ lineage · public verification│
                                    └───────┬───────────┬──────────┘
                                            │           │
                        ┌───────────────────┘           └───────────────────┐
                        ▼                                                       ▼
      ┌──────────────────────────┐                         ┌──────────────────────────┐
      │ Explore & Discovery      │                         │ Archive & Legacy         │
      │ Public Works + Creators  │                         │ Export · preservation    │
      │ contextual discovery     │                         │ scoped stewardship       │
      └──────────────┬───────────┘                         └──────────────┬───────────┘
                     │                                                      │
                     └────────────────────┬─────────────────────────────────┘
                                          ▼
                          ┌──────────────────────────┐
                          │ Relationship & Support   │
                          │ Witness · Signal ·       │
                          │ correspondence · support │
                          └──────────────────────────┘
```

**Connector semantics**

| Connector label | Meaning | Direction |
|---|---|---|
| `Creator establishes / owns` | A Creator is visibly connected to their Domain and registered Work | Creator Identity → Manifestation / Registry |
| `Registers` | Confirmed Work data becomes a Registry record and receives a WID | Manifestation Studio → Registry |
| `Projects publicly` | Registry-eligible public Work becomes discoverable | Registry → Explore |
| `Preserves / exports` | Work history remains available to the creator and future stewardship within scope | Registry → Archive & Legacy |
| `Creates relationships` | Discovery can lead to Witnessing or Support; neither changes authorship | Explore ↔ Relationship & Support |
| `Never changes authorship` | Witnessing, Signals, support, correspondence, and legacy presentation do not change Creator or WID authority | Attach as a boundary annotation |

---

## 4. Public Experience Map

Build page `02` as four landscape journey lanes. The left-to-right order represents a person’s comprehension, not a forced conversion funnel.

### 4.1 Lane A — Arrival and orientation

| Frame | Purpose | Required information | Main action | Do not do |
|---|---|---|---|---|
| **Welcome / Home** | Explain Living Nexus in seconds | Creator-first purpose, four pillars, a featured Creator + Work + WID + support path | Explore or Register Work | Bury the Creator behind generic media cards |
| **Explore** | Discover public Works and Creator Domains intentionally | List/card modes, filter context, WID, creator identity, medium, support and quick actions | Open Work, open Creator Domain, play eligible audio | Present as infinite engagement feed |
| **Creator Domain** | Make a creator’s body of work and identity legible | Identity, statement/testimony, Works, collections, Witnessing, support, legacy note if applicable | Play Works, Witness, Support, inspect Creator Domain | Treat it as a profile shell without authorship context |

### 4.2 Lane B — Work experience

```text
Discover Work
  → Open canonical Work page
  → Understand Creator + title + WID + primary media
  → Read Story / participation / versions / evidence where present
  → Verify WID OR Signal this Work OR Support Creator
```

**Core Work-frame anatomy**

1. **Identity first:** Creator avatar/name/handle and creator-to-Work relationship.
2. **Artifact second:** Title, medium, primary media, primary interaction (play/read/view).
3. **Registry seal:** WID is visible, read-only, linkable to verification.
4. **Context below:** Story, participation/disclosure, registration and versions, relationships, media, public Signals.
5. **One obvious support path:** Support Creator. Never position support as a generic like.

### 4.3 Lane C — Witnessing and correspondence

```text
Creator Domain / Work
  → Witness Creator
  → Witnessing Circle
  → optional correspondence request
  → recipient accepts
  → private participant-only thread
```

**Mandatory visual boundary:**

> A Signal is public and attached to a Work.  
> Correspondence is private to accepted human participants.  
> Neither means contribution, endorsement, co-authorship, license, ownership, or Registry authority.

### 4.4 Lane D — Verification and support

```text
WID from a Work, card, QR, shared link, or API response
  → /verify/{wid}
  → resolved / not found / ambiguous / read unavailable
  → creator identity + timestamp + signature/status where projected
  → return to Work or Creator Domain when safe
```

When a WID is ambiguous, Figma must show an **ambiguity response**, not a selected Work:

```text
WID AMBIGUOUS
This identifier currently corresponds to more than one public record.
Living Nexus will not infer ownership from route order, popularity, or metadata.
```

---

## 5. Creator Registration & Archive Map

Build page `03` as a journey that distinguishes **current implementation** from the desired universal model.

### 5.1 Canonical lifecycle

```text
Create → Ingest → Verify → Witness → Register → Publish → Version / Derive → Archive
```

| Stage | Creator-visible meaning | Registry effect | Figma status |
|---|---|---|---|
| **Create** | Creative work begins outside or inside a documented creative process | No Registry claim yet | IMPLEMENTED conceptually; optional Session model is DIRECTIONAL |
| **Ingest** | Creator supplies supported material; available record data is extracted | Hash/metadata can be reviewed, not silently rewritten | IMPLEMENTED for active flows; universal extraction is DIRECTIONAL |
| **Verify** | Creator confirms/corrects discoverable record fields and participation | Confirmation informs registration; does not manufacture evidence | IMPLEMENTED in supported registration surfaces |
| **Witness** | Registry acknowledges the record | WID/signature/timestamp behavior under supported path | IMPLEMENTED in current Work registration flows |
| **Register** | Work receives canonical platform identity | Work/WID record is stored | IMPLEMENTED |
| **Publish** | Creator elects public discoverability | Public state controls public projections | IMPLEMENTED |
| **Version / Derive** | New manifestation relates to but does not overwrite prior record | Version/lineage relationship is recorded | IMPLEMENTED in defined Work flows; full cross-media graph remains DIRECTIONAL |
| **Archive** | Work remains preserved and exportable | Archive/export/continuity records | IMPLEMENTED in current scopes |

### 5.2 Registration workspace frames

Create these frames in sequence, each with a matching mobile frame beneath it.

| Frame ID | Figma frame title | Screen purpose | Required content |
|---|---|---|---|
| `R-01` | **Creator Domain Established** | First-Work orientation | Creator name, Domain, stewardship principles, continuation path |
| `R-02` | **Ingest Provenance** | Select/drop an eligible asset or batch | Current file constraints; no promise of unsupported media |
| `R-03` | **Detected Record** | Review extracted facts | Filename/title, date, artist, album, ISRC, media/cover, evidence source chip |
| `R-04` | **Participation & Testimony** | Declare Creator purpose and participation | “Who participated?” not “Was AI used?”; HAAI/participation context and origin story |
| `R-05` | **Relationship Review** | Associate collection/album/project where applicable | Existing relationship or explicitly no relationship; never force a container |
| `R-06` | **Seal & Register** | Final review before WID issuance | Immutable-after-witnessing language, WID preview only if technically valid, exact publication choice |
| `R-07` | **Registration Receipt** | Confirm record creation | WID, creator, timestamp, verification link, next choices: publish, view Work, archive |
| `R-08` | **Archive / Version History** | Preservation and continuity | Current Work, earlier version(s), export path, lineage link when available |

### 5.3 Batch path

```text
Batch intake
  → queue ordered Works
  → inspect each Work
  → apply explicit bulk metadata where chosen
  → review per-Work provenance
  → register each Work
  → optional collection/album WID for the set
```

**Batch rules for the map**

- A batch does not erase per-Work identity.
- A collection WID binds an eligible set; each Work retains its own WID.
- Bulk entry is a creator convenience, not automatic proof.
- A creator must be able to see which values were extracted, bulk-applied, manually edited, or absent.

---

## 6. Registry Architecture Map

Build page `04` as the visual heart of the file. Use the main diagram below and create zoom-in sections for **Registration**, **Verification**, **Lineage**, **Public Projection**, and **Legacy Custody**.

### 6.1 Conceptual Registry object graph

```text
Creator (Person with a registered Work)
│
├── Creator Domain / Identity
│   ├── name, handle, public profile
│   ├── testimony and stated purpose
│   └── stewardship / legacy scope where explicitly authorized
│
└── Work
    ├── Manifestation identity
    │   ├── title, medium, status, registration/publication chronology
    │   └── primary media references
    │
    ├── Provenance Object — conceptual aggregate, not a standalone database table
    │   ├── Registry: WID, timestamp, signature, status
    │   ├── Metadata: declared + extracted facts, hashes, identifiers
    │   ├── Media: file / cover / video / attachments where present
    │   ├── Participation: Creator and declared human/AI roles
    │   ├── Relationships: collection, version, derivative, fork, remix
    │   └── Publication: public/unlisted/private and external-display decisions
    │
    ├── Evidence & Timeline
    │   ├── Work events
    │   ├── evidence references
    │   ├── creator testimony
    │   └── version history
    │
    └── Public Projections
        ├── Work page
        ├── Creator Domain
        ├── Explore / Search
        ├── Verify page / API
        └── Archive / export (authorized scopes only)
```

### 6.2 Implementation translation — data model annotation

This is **not** a proposal to merge tables. It explains the current aggregate across existing records.

| Provenance Object area | Current implementation anchors | Figma annotation |
|---|---|---|
| **Creator / identity** | `users` and Creator Domain projections | “Creator remains visible on every Work surface.” |
| **Current Work** | `songs` with `witnessId`, media references, declared metadata, content type, publication fields | “A Work projection. Not all fields are immutable.” |
| **Cryptographic WID record** | `wids` (`wid`, `eventId`, `contentHash`, `creatorId`, `signature`) | “Canonical anchor when populated; verification must use server authority.” |
| **Work-level record** | `songs.witnessId`, `ecdsaPublicKey`, `ecdsaSignature`, hash fields | “Do not reconstruct trust client-side.” |
| **Event chronology** | `workEvents`, `provenanceEvents` | “Append / record corrections; never silently rewrite claimed history.” |
| **Version preservation** | `audioVersions`, `songVersions` | “A replacement is a new version relationship, not loss of the prior record.” |
| **Relationships** | `collections`, `collectionTracks`, `workLineage`, `workWitnesses` | “Relationship changes do not change creator identity or a WID.” |
| **Evidence** | `workEvidence` | “Evidence supports a record; it does not automatically settle authorship.” |
| **Testimony** | `witnessTestimonies`, Origin Story / Work editorial fields | “Creator testimony is editorial/human context, separately labeled.” |
| **Legacy continuity** | `legacyStewardshipGrants`, `legacyStewardshipEvents`, `legacyMemorialStatements` | “Scoped custody, no transfer of authorship/ownership/legal authority.” |

### 6.3 Registry flow: registration

```text
Supported asset / declared Work information
        │
        ▼
Ingest provenance
        │  extracts available technical facts and receives creator testimony
        ▼
Creator review and confirmation
        │  confirms / corrects; participation is declared as a chain
        ▼
Server-authorized registration
        │  validates ownership and current rules
        ▼
WID + signature / timestamp / Work record
        │
        ├── Public only after creator publication decision
        └── Archive/export retained within allowed scope
```

**Non-negotiable diagram annotation:**

> A WID records the platform’s witnessed identity of a registered Work. It is not a copyright registration, a legal ownership ruling, an automatic claim of external distribution rights, or evidence that a Work is universally copyrightable.

### 6.4 Registry flow: public verification

```text
A person supplies a WID
        │
        ▼
Server-side public projection resolves eligible public Work records
        │
        ├── exactly one eligible public Work → RESOLVED (200)
        ├── none → NOT FOUND (404)
        ├── multiple public candidates → AMBIGUOUS (409 WID_AMBIGUOUS)
        └── Registry read unavailable → UNAVAILABLE (503)
```

| Verify state | Figma content rule | Must not do |
|---|---|---|
| **Resolved** | Show authorized public record, Creator identity, WID, timestamp/status/signature fields as projected | Infer legal ownership beyond the Registry record |
| **Not found** | Explain absence without exposing private/deleted records | Reveal hidden record existence |
| **Ambiguous** | Explain that no candidate is selected; show neutral next-step policy language | Choose based on date, popularity, route order, title, AI analysis, or metadata |
| **Unavailable** | Controlled service-state message | Claim WID absence or expose infrastructure details |

### 6.5 Lineage and version map

```text
Original Work / WID-A
   │
   ├── Version → Work version / WID-B
   ├── Remaster → Work version / WID-C
   ├── Remix → Derivative Work / WID-D
   ├── Translation → Derived Work / WID-E
   └── Collection membership → Collection / WID-ALB (where issued)
```

Every arrow must carry a **relationship type** and a **visible boundary statement**:

> Relationship is context. It does not rewrite the parent Work, transfer Creator identity, or erase the original WID.

### 6.6 WID prefix panel

Use one compact reference panel. Treat it as a controlled list, not a design flourish.

| Prefix | Public label |
|---|---|
| `WID-MUS` | Music Work |
| `WID-LYR` | Lyrics Work |
| `WID-ALB` | Collection / Album Record |
| `WID-TST` | Testimony Record |
| `WID-VIS` / `WID-IMG` | Visual Work / Image |
| `WID-MAN` | Manuscript Work |
| `WID-CMX` / `WID-COM` | Comic / Sequential Work |
| `WID-VID` | Video Work |
| `WID-GAM` | Game Work |
| `WID-GCD` | G-Code / Fabrication Work |
| `WID-FDR` | Folder / Project Collection |

If an implementation has no verified public behavior for a listed type, display it as a **namespace reference**, not as a promise of a complete product flow.

---

## 7. Roles, Authority & Legacy Map

Build page `05` around **what an actor can witness, read, or do**—not generic user-role labels.

| Actor | May do | May not do | Figma treatment |
|---|---|---|---|
| **Visitor** | Explore public Work, open Creator Domains, verify a WID | Read private records, infer provenance beyond public projection | Public path lane |
| **Person / Witness** | Witness a Creator, leave a public Signal, support eligible creator paths | Change Work, WID, authorship, or public testimony | Relationship lane |
| **Creator** | Establish Creator Domain, register/publish/maintain own Work within policy | Rewrite prior WID history or another creator’s record | Creator authority lane |
| **Work Witness / collaborator** | Respond to explicitly scoped invitation and testimony/role workflow | Gain ownership or edit rights merely through a role | Contribution lane |
| **Steward** | Perform explicitly granted, auditable continuity actions | Become author/owner or access unrelated private material | Scoped custody lane |
| **Keeper** | Operate approved policy/review roles where formally authorized | Decide ownership from automated inference; rewrite history | Governance lane |
| **Legacy Steward** | View Registry/export/manage public memorial/append memorial only within active scope | Access credentials, payment data, private PNA, or alter Work/WID/hash/testimony | Locked scope card |

### 7.1 Legacy stewardship state map

```text
Explicit authority reference
   → scoped active grant
   → audit event recorded
   → allowed preservation action
   → append-only custody event
   → optional public memorial, attributed to named steward

Revocation
   → future actions denied
   → earlier custody evidence remains preserved
```

**Required note:** Legacy Stewardship is a platform-preservation authority. It does **not** transfer copyright, authorship, ownership, estate authority, account credentials, or legal rights.

### 7.2 Directional designation flow

Create this frame as **DIRECTIONAL — not self-service today**:

```text
Creator nominates custodian
  → custodian accepts
  → evidence / conditions recorded
  → authorized activation review
  → scoped, revocable Legacy Stewardship grant
  → append-only custody ledger
```

---

## 8. States & Exception Paths

Build page `06` as a state matrix for product and Registry review.

| Object / process | Normal state | Safe exception state | Required message principle |
|---|---|---|---|
| Work registration | Creator reviews and registers eligible Work | Missing data, duplicate hash signal, validation failure | State what is missing; do not fabricate evidence |
| Publication | Creator elects public visibility | Private/draft/unlisted | Do not project private Work into discovery |
| WID verification | One eligible public candidate resolves | Not found, ambiguous, unavailable | Never choose a candidate from weak evidence |
| Metadata extraction | Detected fact can be shown for review | Unavailable/uncertain extraction | Explain source/uncertainty and allow creator correction where policy allows |
| Participation | Creator confirms creation chain | Unclear / incomplete declared participation | Ask “Who participated?”; never use binary authorship claim |
| Signals | Public, attributed to a Work | Mention unresolved; moderation path | Mention does not create a contributor or endorsement claim |
| Correspondence | Accepted participants only | Pending, declined, blocked, report | Never disclose block/contact-policy reason |
| Legacy stewardship | Explicit active grant | Revoked or no scope | Deny safely; preserve historical custody events |
| AI / PNA | PNA shell and private record surfaces may be visible | **AI operations paused** | Show Work in Progress / read-only state; do not imply model access |

---

## 9. Cathedral Visual Grammar for Figma

Build page `07` as a shared library reference. Use component variants rather than one-off cards.

### 9.1 Color tokens

| Token | Value | Figma style name | Use |
|---|---:|---|---|
| `--ln-void` | `#0A0806` | `LN / Surface / Void` | Page ground |
| `--ln-coal` | `#000000` | `LN / Surface / Coal` | Primary card/body surface |
| `--ln-iron` | `#1C1A14` | `LN / Surface / Iron` | Elevated / hover surface |
| `--ln-ash` | `#2E2B22` | `LN / Border / Ash` | Dividers and secondary borders |
| `--ln-smoke` | `#6B6555` | `LN / Text / Smoke` | De-emphasized metadata |
| `--ln-bone` | `#C9C0A8` | `LN / Text / Bone` | Body copy |
| `--ln-parchment` | `#E8DFC8` | `LN / Text / Parchment` | Headings / high contrast |
| `--ln-gold` | `#C49A28` | `LN / Accent / Gold` | WID seals, active states, actions |
| `--ln-gold-hot` | `#E8B840` | `LN / Accent / Gold Hot` | Hero and attention accents |
| `--ln-gold-dim` | `#8B6914` | `LN / Accent / Gold Dim` | Secondary gold / subtle labels |

### 9.2 Typography styles

| Figma style | Font | Size range | Use |
|---|---|---:|---|
| `LN / Display / H1` | Cinzel | 32–56 | Page title / hero |
| `LN / Display / H2` | Cinzel | 26–36 | Section heading |
| `LN / Editorial / H3` | Cormorant Garamond | 22–28 | Panel heading / Work section |
| `LN / Editorial / H4` | Cormorant Garamond | 18–22 | Card title |
| `LN / Body / Base` | DM Sans | 15–17 | Body and instructions |
| `LN / Body / Meta` | DM Sans | 13–15 | Supporting metadata |
| `LN / Overline` | Cinzel | 11–12 | Uppercase section/authority labels, tracking `0.20em` |
| `LN / Registry / WID` | Space Mono | 11–13 | WID, hashes, technical verification fields |

### 9.3 Required components

| Component | Variants | Must communicate |
|---|---|---|
| **WID Seal** | resolved / incomplete / ambiguous / unavailable | Read-only Registry identity, not a decorative tag |
| **Creator Identity Block** | Work / Explorer / Creator Domain / Verify | Creator first, always linkable where public |
| **Work Artifact Card** | list / tile / featured / compact | Title, Creator, WID, medium, one obvious action |
| **Provenance Section** | standard / warning / private / unavailable | What is known, source/status, clear boundary |
| **Participation Chain** | declared / incomplete / unavailable | Human and AI roles without binary authorship claim |
| **Relationship Edge** | version / remix / derivative / collection / witness | Type of relation and non-transfer boundary |
| **Support Action** | default / eligible / unavailable | Support creator, not generic engagement |
| **Status Chip** | implemented / in-progress / directional / paused / authorization required | Honest maturity state |
| **Custody Scope Card** | active / revoked / no access | Named scope and explicit prohibitions |
| **Registry Exception Card** | not found / ambiguous / unavailable | Safe state, not false certainty |

### 9.4 Responsive rules

| Breakpoint | Product-map behavior | Work/Registry detail behavior |
|---|---|---|
| Desktop | Three-column public layouts may use left navigation, main artifact, right context | Registry panels may be side-by-side with sticky identity where appropriate |
| Tablet | Collapse to two-column / stacked sections with preserved hierarchy | Keep WID and Creator identity above fold |
| Mobile | One dominant task per surface; panels become accessible sheets or order-preserving sections | Never hide WID/status behind hover; use 44px minimum action targets |

Use reduced-motion variants for flow transitions; diagram arrows must never be the only way to communicate relationship direction or state.

---

## 10. Product Route Inventory for Figma Labels

Use canonical labels in the map. Preserve redirects/legacy routes only in a small “compatibility” appendix, not the primary map.

| User-facing node | Canonical route / current entry | Figma label |
|---|---|---|
| Home | `/` | **Living Nexus** |
| Explore | `/explore` | **Explore Works & Creators** |
| Register | `/manifest` | **Manifestation Studio — Register Work** |
| Batch registration | `/batch-upload` | **Batch Registration Queue** |
| Ingestion review | `/ingestion/review` | **Detected Record Review** |
| Work | `/song/:id` | **Work / Artifact Experience** |
| Verify | `/verify/:witnessId` | **Verify WID** |
| Creator persistent home | `/:@handle` route configured as `creatorHandleDomainRoute` | **Creator Domain** |
| Creator profile compatibility surface | `/creator/:id` | **Creator Profile — Compatibility Surface** |
| Archive | `/archive` | **My Archive** |
| Creator export | `/my-archive/export` | **Creator Record Export** |
| Witnessing Circle | Global panel; profile witnessing tab | **Witnessing Circle** |
| PNA | `/pna` | **PNA — Work in Progress / AI Operations Paused** |
| PNA stewardship settings | `/settings/stewardship` | **PNA Stewardship — Work in Progress** |

---

## 11. Figma Review Protocol

### 11.1 Every review must answer these seven questions

1. Does this increase trust?
2. Does authorship feel visible?
3. Does provenance feel tangible?
4. Can the Creator’s story be understood in seconds?
5. Can someone support the Creator with one obvious action?
6. Does this screen preserve context instead of hiding it?
7. Is the Work treated like a living artifact rather than just a file?

If any answer is “no,” the frame is not ready to guide implementation.

### 11.2 Decision notation inside Figma

Use a visible note component with these fields:

```text
Decision ID: LN-FIG-###
Status: Proposed | Accepted | Superseded
Owner: [named human steward]
Date: YYYY-MM-DD
Applies to: [page / frame / system]
Source record: [LNLS / ADR / issue / checkpoint]
Implementation consequence: [route / component / schema / none]
```

A visual adjustment that changes a Registry claim, authority, or public WID behavior requires an ADR and engineering authorization outside Figma.

---

## 12. Explicitly Not To Promise in Figma

Do not make a polished mock-up create a false product promise. Include the following on page `08`.

| Item | Current design status | Figma instruction |
|---|---|---|
| Universal all-media registration | Directional; active flows retain medium/validation limits | Use dashed DIRECTIONAL frames, not primary navigation claims |
| One physical `provenanceObjects` table | Conceptual aggregate only | Show as an aggregate layer, annotate “assembled across records” |
| PNA model generation / AI chat | AI operations intentionally paused | Use PAUSED chips and read-only workspace examples only |
| Self-service custodian designation | Directional | Show as proposed flow, no “Activate” action |
| Duplicate-WID resolution | Requires separate append-only adjudication authority | Show ambiguity safety state; no “Fix WID” or auto-select UI |
| End-to-end encrypted correspondence | Not implemented | Do not use an encryption claim or shield icon implying it |
| Copyright, estate, or ownership decision | Outside platform authority | Use legal-boundary note; do not label WID as legal ownership proof |
| Public listing of private/draft records | Forbidden | No discovery card or search result variant for private data |

---

## 13. Source Ledger

The Figma file should store this ledger in page `00` so reviewers can trace design claims to their governing record.

| ID | Source | Authority / relevance |
|---|---|---|
| `S1` | `ARCHITECTURE.md` | Prime Directive, four pillars, six-layer architecture, WID namespaces, transports |
| `S2` | `docs/lnls/ui-language/README.md` | Canonical labels and prohibited language |
| `S3` | `docs/lnls/ontology/README.md` | First-class object model and relationship definitions |
| `S4` | `docs/lnls/objects/README.md` | Work, Provenance Object, Participation Chain, Session, Testimony definitions |
| `S5` | `docs/lnls/registry/README.md` | Registry and WID lifecycle intent |
| `S6` | `docs/lnls/workflows/README.md` | Creator lifecycle, verification, and Witness workflow |
| `S7` | `drizzle/schema.ts` | Current implementation anchors for Work, WID, evidence, events, lineage, custody |
| `S8` | `client/src/App.tsx` | Current route inventory and PNA service boundary |
| `S9` | `docs/lnls/architecture/ADR-REGISTRY-PUBLIC-PROJECTION-REPAIR.md` | Resolved/not-found/ambiguous/unavailable public verification safety |
| `S10` | `docs/lnls/architecture/ADR-REGISTRY-DUPLICATE-WID-ADJUDICATION-DESIGN.md` | Duplicate-WID limitations and future custody-first adjudication design |
| `S11` | `docs/lnls/architecture/LEGACY-STEWARDSHIP-AND-MEMORIAL-ADR.md` | Scoped legacy custody boundary |
| `S12` | `docs/lnls/architecture/AI-OPERATIONS-PAUSE-ADR.md` | PNA / AI operations pause boundary |

---

## 14. Delivery Checklist for the Figma Build

Before considering the Figma Product Map ready:

- [ ] Every page contains a legend and a status-label convention.
- [ ] The **Creator → Work → Provenance → WID → Relationship → Discovery/Support → Archive/Legacy** spine is readable at 100% zoom.
- [ ] The map visibly distinguishes **implemented** features from **directional** design.
- [ ] Every public Work frame places **Creator identity** and **WID** above fold or in the immediate identity cluster.
- [ ] The Verify flow has resolved, not-found, ambiguous, and unavailable states.
- [ ] The duplicate-WID state never selects a candidate or implies ownership adjudication.
- [ ] The PNA area is visibly marked **Work in Progress / AI operations paused**.
- [ ] Legacy Stewardship is scoped, revocable, and explicitly non-transfer-of-authorship/ownership/legal-authority.
- [ ] “Follow,” “Subscriber,” “Content Creator,” “Upload,” and other prohibited labels are absent from final frames unless preserved as an annotated legacy technical term.
- [ ] Desktop, tablet, and mobile hierarchy variants exist for Work, Creator Domain, Registry verification, and Manifestation Studio.
- [ ] Every design decision that affects an API, schema, WID, public verification state, or authority boundary is linked back to an ADR or marked `REQUIRES AUTHORIZATION`.

---

## 15. Figma Handoff Note

There is no Figma connector configured in the current workspace. This document is the **source package for a manual Figma/FigJam build today** and for a connector-backed transfer when Figma access is enabled.

When Figma access is available, create the file in the page order in Section 2, build page `01` and page `04` first, and link accepted frame decisions back to the source ledger above. Do not replace the LNLS, schema, ADRs, or Registry records with Figma artifacts.
