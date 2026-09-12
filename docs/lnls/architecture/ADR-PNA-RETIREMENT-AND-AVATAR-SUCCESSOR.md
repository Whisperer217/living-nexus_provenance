# ADR — PNA Surface Retirement and Avatar Successor Preservation

**Status:** Proposed; documentation-only; no retirement action authorized
**Date:** 2026-09-12
**Decision owner:** Keeper / Doc Seraph Mercer
**Author:** Manus AI
**Scope:** The legacy Provenance Nexus Avatar (PNA) surface, its entry routes, its retained records, and the contract for a future distinct avatar/presence product.

> **Decision:** Retire PNA, when authorized, as a **surface transition** rather than a data deletion or identity migration. Preserve creator-private workspace records, sealed Chain-of-Record material, portraits, catalog/economic facts, selected-avatar state, Quiver assets, and independent Guide records. Establish any future avatar/presence product as a separate authority with explicit, creator-approved source references—not as a rename or silent absorption of PNA.

## 1. Authority boundary and non-goals

This ADR records a read-only audit. It neither retires PNA nor authorizes an implementation. It does **not** alter a route, database row, asset, WID, `AVT-*` identifier, entitlement, profile photo, skin, Guide, Quiver record, provider configuration, or deployment.

The term **PNA** currently describes a composite legacy creator experience, not one canonical avatar record. It includes an owner-scoped mutable workspace, optional Keeper diary sealing, private portrait state, marketplace skin/catalog state, explicit Quiver saves, player context, and a legacy private image-generation proposal flow. The correct retirement question is therefore not “how do we delete PNA?” It is “which records belong to which authority, and what access must persist after the PNA UI is no longer the active product?” [1] [2] [3]

The following remain out of scope until separately authorized: implementation of an archive or export UI; new feature flags; redirect activation; write disablement; successor schema or API design; marketplace entitlement repair; data migration; record suppression; deletion; provider integration; issuance of Registry credentials; and any Gemini implementation.

## 2. Current route and surface map

PNA is currently available both at the `pna` subdomain and at `/pna`. The subdomain renders `PNAShellPage` directly without the normal main application layout, while `/pna` renders the same shell through the application route tree. `/keeper-compose` and `/creator-surface` are legacy redirects to `/pna`. In contrast, `/store` and `/marketplace` already redirect to the distinct `/avatar-registry` surface. [1]

| Entry or adjacent surface | Current behavior | Preservation consequence | Post-retirement disposition |
|---|---|---|---|
| `pna.livingnexus.org` | Renders the PNA shell directly, without `MainLayout`. | It is a historical creator entry point. A sudden release or repurpose would sever access and links. | Preserve hostname continuity through an archive/retirement destination and durable explanation. |
| `/pna` | Renders the PNA shell within the main application. | It is the canonical in-app path. | Do not redirect until protected archive/export access has passed acceptance gates. |
| `/keeper-compose` | Redirects to `/pna`. | It has no independent data authority. | Follow the settled `/pna` archive or retirement destination. |
| `/creator-surface` | Redirects to `/pna`. | Same continuity requirement. | Follow the settled `/pna` archive or retirement destination. |
| `/keeper` | Separate Keeper surface. | It shares concepts with PNA but is not inherently part of PNA retirement. | Leave unchanged unless separately approved. |
| `/avatar-registry`, `/store`, `/marketplace` | Separate marketplace/catalog surface; the latter two redirect to the registry. | Catalog and economic state must not be retired with PNA. | Leave unchanged. |
| `/guides`, `/guide/:id`, `/platform-guides` | Separate Guide/product routes. | PNA “Guide” mode is not authority over Guide records. | Leave unchanged. |
| Quiver routes and procedures | Owner-scoped private asset reserve. | A PNA proposal is not a Quiver asset unless the creator explicitly saves it. | Leave unchanged; optionally link from the archive only after authorization. |

The current PNA shell uses protected PNA thread procedures, Keeper chat and diary procedures, private Quiver save, profile/active-skin state, a global player context, and a legacy image proposal capability. Its Guide, Conductor, Witness, Custodian, Archivist, Vision, and Research modes are interface/context modes; they do not independently establish a durable creator identity or a separate registry authority. [2] [3]

## 3. Record inventory and retention classes

The following counts were collected on 2026-09-12 with read-only aggregate database queries. No private message body, image, prompt, creator identity, or secret was retrieved.

| Record boundary | Count | Retention class | Current authority | Required preservation treatment |
|---|---:|---|---|---|
| `pnaThreads` | 7 | Mutable, creator-private working state | Owner-scoped PNA thread router. | Preserve creator access and relationship to messages; support export and/or authenticated read-only access before disabling writes. |
| `pnaThreadMessages` | 11 | Mutable, creator-private working state | Owner-scoped PNA thread router; may carry private visual-proposal metadata. | Preserve order, roles, timestamps, thread association, and privacy; do not publish or relabel as testimony. |
| `keeperChatArchives` | 0 | Private archive; potentially immutable when sealed | Keeper archive/seal flow. | Preserve all future archive records. Their absence today does not remove the need for an immutable-record policy. |
| Sealed `WID-CNV-*` archives | 0 | Immutable Chain-of-Record | Explicit creator seal, with payload integrity hash. | Never delete, rewrite, regenerate, or reissue. Restriction/supersession is not erasure. |
| `keeperSkins` | 9 | Private portrait/presentation state | Keeper profile/skin procedures. | Preserve portrait references and active/private state; do not silently discard portraits when PNA retires. |
| Custom Keeper skins | 0 | Private portrait subset | Keeper skin model. | Apply the same preservation policy to future custom portraits. |
| Marketplace items of type `skin` | 3 | Catalog/avatar representation | Marketplace/catalog authority. | Preserve listing, attribution, hash/version, license, and associated asset facts separately from PNA. |
| Active marketplace skins | 3 | Active catalog subset | Marketplace availability state. | Do not deactivate merely because PNA is retired. |
| Marketplace skin purchases | 0 | Economic/entitlement history | Marketplace purchase authority. | Preserve all future purchases, grants, refunds, and licenses as immutable economic facts. |
| Users with an equipped marketplace avatar | 1 | Current selection/profile projection | `users.equippedAvatarItemId`; equipment also affects profile-photo state. | Preserve linkage and ability to inspect/reverse it before a successor renderer is introduced. |
| Marketplace `avatar_wid` rows | 0 | Catalog-side avatar identifier | Marketplace `registerAvatar` creates an `AVT-*` value in this table. | Never portray this field as a core Registry WID or regenerate it during transition. |
| `guides` | 3 | Independent Guide/content records | Guide routes and Guide data authority. | Retain outside the PNA retirement scope. |
| Quiver images | 90 | Creator-private prepared assets | Owner-scoped Quiver authority. | Preserve private access and asset references. Do not automatically transfer a proposal or image to a successor. |

The inventory illustrates why the PNA UI cannot be treated as the owner of every record it displays. The workspace is mutable working context; a sealed diary is deliberate Chain-of-Record; a private Keeper skin is presentation state; a marketplace skin is a catalog/economic representation; a Quiver record is explicitly saved private creative material; and a Guide is an independent content/product record. [3] [4] [5] [6]

## 4. Provenance, privacy, and image-generation boundaries

PNA thread records do not issue a WID merely by being created. The Keeper archive flow may calculate a SHA-256 payload hash and, only after an explicit seal action, generate a `WID-CNV-*` record. This separates mutable creative/private work from an immutable, creator-authorized record. [3] [4]

The legacy PNA image flow is also a distinct boundary. It is a Living Nexus server-side proposal flow that returns a private result and requires an explicit Quiver-save action before an asset record exists. It does not automatically create a Work, public asset, WID, provenance record, creator-likeness permission, or AI context attachment. [2] [3] [7]

> **Preserved doctrine:** Public is not AI-permitted; playback is not AI context; uploading is not registration; AI inference is not creator testimony; Nexus is not a provider; and `UNSPECIFIED` is not permission.

Any future Nexus/Gemini capability must remain separate from this historical PNA image flow. Shared interface styling does not create shared asset custody, shared consent, or shared provenance.

## 5. Options considered

| Option | Description | Strength | Risk | Decision |
|---|---|---|---|---|
| **A. Surface-only decommission** | Replace PNA routes with a retirement/redirect destination while retaining private records elsewhere. | Simplifies routes and product map. | Unsafe if creators cannot access/export private material first. | Use only after archive access is proven. |
| **B. Fixed archive window** | Preserve PNA as a declared read-only archive for a fixed period, with creator export/handoff. | Highest confidence preservation path and transparent creator experience. | Requires a narrow archive surface and operational support window. | **Recommended first operational step.** |
| **C. Successor migration/bridge** | Establish a new avatar/presence product that references retained records through explicit, creator-approved source links. | Allows a real successor without pretending PNA remains active. | High authority risk if old records are copied, relabeled, or auto-enrolled. | **Recommended only after A+B and successor approval.** |
| **D. Immediate deletion or silent reroute** | Disable routes and remove or hide associated state. | No legitimate preservation benefit. | Breaks creator continuity, risks record loss, and confuses provenance/economic authority. | **Rejected.** |

## 6. Recommended decision: archive first; successor second

The recommended path is **B, then A, then C**. First establish protected preservation access and an archive window. Next retire the PNA surface to that durable archive/retirement destination. Only then establish a separate successor under its own approved authority contract.

### Stage 0 — Freeze the authority boundary

Record the intended scope, accountable owner, current aggregate inventory, route matrix, and rollback point. Do not yet change the UI, routes, writes, data, assets, profiles, catalog, or identifiers.

### Stage 1 — Deliver protected preservation access

Build an authenticated creator archive/export capability against existing owner-scoped records. It must let a creator inspect/export their own PNA thread/message history, preserve the distinction between working state and sealed material, and expose relevant private portrait references without exposing another creator’s records.

This surface must not create a WID, mark a message public, create a marketplace entitlement, attach content to AI context, create a Quiver entry, or assert that exported working material is creator testimony.

### Stage 2 — Operate a time-bounded read-only PNA archive window

After Stage 1 passes acceptance, PNA may enter a published, fixed archive window. New PNA thread/message creation, PNA chat/image generation, PNA-triggered Quiver saving, diary sealing, portrait mutation, skin registration, and equipment changes should be disabled **at the server boundary for PNA**, not merely hidden in the UI.

Independent Keeper, Quiver, Avatar Registry, Guide, Registry, and Work operations remain governed by their existing authorities. The archive must state an end date, export path, support path, what remains retained, what is not moving, and whether any successor exists. Silence or non-use is never consent to transfer identity, portrait rights, testimony, or economic history.

### Stage 3 — Retire PNA routes to a durable archive destination

Only after creator-access, export, and read-only enforcement gates pass should `pna.` and `/pna` resolve to an authenticated archive destination or explicit retirement page. `/keeper-compose` and `/creator-surface` should follow the same canonical path. The hostname must not be released or repurposed without an enduring continuity decision.

### Stage 4 — Establish a distinct avatar/presence successor

The successor must have a new product purpose, new canonical data model, and a separately approved authority contract. It may offer a **read-only compatibility bridge** to legacy marketplace skins or an explicit opt-in presentation selection, but it must not become canonical owner of PNA records merely by displaying them.

## 7. Route transition matrix

| Route/host | Archive window | After retirement | Rollback boundary |
|---|---|---|---|
| `pna.livingnexus.org` | Authenticated PNA archive/notice, export access, no new PNA writes. | Durable archive destination or retirement notice with protected access path. | Restore the old shell only by an approved code/config rollback; retained data remains untouched. |
| `/pna` | Same canonical archive behavior inside the main application. | Same settled archive/retirement path. | Restore route behavior only; no data re-import. |
| `/keeper-compose` | Redirect to `/pna` archive destination. | Redirect to settled PNA archival destination. | Restore the existing redirect independently. |
| `/creator-surface` | Redirect to `/pna` archive destination. | Redirect to settled PNA archival destination. | Restore the existing redirect independently. |
| `/keeper` | Unchanged. | Unchanged unless separately approved. | Not part of PNA rollback. |
| `/avatar-registry`, `/store`, `/marketplace` | Unchanged. | Unchanged, unless a later separate successor bridge is approved. | Independent marketplace/catalog rollback. |
| Guide routes | Unchanged. | Unchanged. | Independent Guide rollback. |
| Quiver routes/API | Unchanged; archive links only if explicitly approved. | Unchanged. | Independent creator-asset custody. |

## 8. Successor invariants

| Invariant | Required behavior | Prohibited behavior |
|---|---|---|
| **Separate product authority** | Define a new purpose and canonical records. | Rename PNA and call the old records “migrated” without a contract. |
| **Traceable source reference** | Each opted-in bridge records source system, source identifier, creator authorization, and migration/connection timestamp. | Copy a record without provenance or present the copy as canonical. |
| **Identity sovereignty** | A creator explicitly chooses any displayed portrait/avatar and can withdraw that presentation choice. | Infer that a skin, PNA mode, or image equals verified creator identity. |
| **Portrait/likeness authority** | Preserve source/rights context and require explicit creator action before reuse. | Use a creator image for training, corporate gain, generated likeness, or unrelated presentation without authority. |
| **Provenance integrity** | Link existing WIDs or sealed `WID-CNV-*` records only as immutable references. | Rewrite, regenerate, import as successor-owned proof, or flatten Chain-of-Record into profile copy. |
| **Economic continuity** | Read legacy catalog/purchase facts from their authoritative records. | Invent, grant, revoke, duplicate, or backfill entitlement history through a UI migration. |
| **Private workspace custody** | Keep PNA threads/messages private, creator-scoped, and exportable. | Publish, train on, summarize into a profile, or auto-transfer private messages. |
| **AI permission boundary** | Require explicit, separate attachment consent for each AI context/asset action. | Treat public, played, uploaded, or archived material as AI-permitted. |
| **Asset custody** | Treat Quiver saves as deliberate creator actions. | Convert proposal JSON/generation output to public or successor assets automatically. |
| **Identifier restraint** | Preserve AVT catalog fields and core WIDs in their respective systems. | Issue replacement `AVT-*` values or WIDs to make a transition appear complete. |

## 9. Identified separate repair: avatar equipment entitlement

The present `equipAvatar` flow verifies that a marketplace item exists, is active, and is a `skin`, then sets `users.equippedAvatarItemId` and profile-photo state. It does not verify purchase or ownership entitlement in that procedure. [5]

This is an important hardening concern for a future avatar successor. It is **not** authorization to edit equipment, catalog, purchase history, or profile state during this audit. The repair requires its own approved ADR, entitlement definition, free/granted-item compatibility analysis, regression tests, migration/rollback strategy, and creator-impact review.

## 10. Zero-data-mutation transition sequence

| Order | Allowed action | Evidence required before next stage | Explicitly prohibited |
|---:|---|---|---|
| 1 | Create a signed/recorded inventory snapshot of schema, routes, aggregate counts, and non-content integrity references. | Snapshot contains no private content or secret. | Content scraping, mutation, deletion. |
| 2 | Build owner-scoped archive/export views against existing records. | Cross-owner isolation and export relationship tests pass. | WID/AVT issuance, public sharing, AI ingestion. |
| 3 | Add reversible, server-enforced PNA archive-mode controls. | Controls are separately observable and fully rollbackable. | One broad disable switch that turns off unrelated Keeper/Quiver/marketplace/Guide authorities. |
| 4 | Announce and operate the archive window. | Export/support/route acceptance gates pass. | Treat absence of response as consent to transfer portraits, identity, or content. |
| 5 | Route PNA to its archive destination after the approved deadline. | Rollback restores surface behavior without data migration. | Reuse/release `pna.` without continuity. |
| 6 | Build successor adapters as read-only source-reference bridges. | Successor invariants, explicit opt-in, and record authority are proven. | Bulk copying identity, portraits, private threads, AVT records, or entitlement claims. |
| 7 | Offer creator opt-in successor connections. | Each connection is auditable, reversible as a display link, and source-traceable. | Automatic enrollment or silent asset rehosting. |

## 11. Feature-flag and rollback requirements

Any future implementation requires distinct server-enforced controls for: PNA archive mode; new PNA threads/messages; PNA chat/image generation; PNA Quiver-save initiation; PNA diary sealing; PNA portrait/skin mutation; PNA equipment mutation; and PNA route retirement. A single generic “disable PNA” control is inadequate because it would erase vital authority distinctions and make safe rollback impossible.

Rollback restores only the prior **surface**. It must not replay exports into the database, recreate identifiers, modify marketplace listings, overwrite a later creator selection, or undo a successor choice. The operational ledger must distinguish UI rollback from a data/provenance rollback.

## 12. Acceptance gates

| Gate | Required proof |
|---|---|
| Owner isolation | Automated tests prove a creator cannot list, read, or export another creator’s PNA thread/message, private portrait, or Quiver-reference data. |
| Export completeness | Fixtures preserve thread IDs, message ordering, role, time semantics, visual-proposal metadata, and sealed/archive distinction. |
| No new authority | Archive/export creates no WID, `AVT-*`, publication, listing, purchase, profile update, Quiver record, AI context, or successor record. |
| Route continuity | Browser/route tests cover `/pna`, `pna.` host handling, `/keeper-compose`, and `/creator-surface` for authenticated and logged-out paths. |
| Read-only enforcement | Server procedures deny selected PNA writes while archive mode is active; disabled buttons alone are insufficient. |
| Independent-system insulation | Tests prove Keeper, Quiver, Avatar Registry, marketplace purchase data, Guides, Work/WID verification, and Player remain reachable under their own authorities. |
| Economic preservation | Marketplace skin/catalog and purchase counts stay stable; existing equipment selections are neither cleared nor replaced. |
| Provenance preservation | Existing core WIDs, sealed `WID-CNV-*` records, hashes, and marketplace avatar fields are unchanged. |
| Privacy/AI boundary | Private PNA content appears in no public view, browser log, telemetry, prompt, model request, or successor payload without explicit creator approval. |
| Reversibility | A tested configuration rollback restores current PNA behavior without restoring/recreating records. |

## 13. Six-layer alignment

| Living Nexus layer | Preservation result |
|---|---|
| **Identity** | Separates creator identity from a selected portrait, catalog skin, UI mode, or model inference. |
| **Manifestation** | Permits an old presentation surface to retire without altering Works, Guides, or Creator Domains. |
| **Relationship** | Protects private creative context and offers an honest archive path rather than a dead end. |
| **Registry** | Retains WIDs, sealed diary WIDs, hashes, and marketplace avatar fields in their correct authorities. |
| **Stewardship** | Requires preservation, export, and rollback before retirement rather than after loss. |
| **Legacy** | Keeps historical route/record interpretation while allowing the old product to stop being the future product. |

## 14. Approval gate

PNA remains live and unchanged unless Doc explicitly selects one of the following bounded next steps:

1. **Archive-surface design only:** produce the implementation architecture/UI/procedure plan; no runtime or route change.
2. **Archive-window implementation:** build protected export/read-only capability and flags, but do not activate retirement.
3. **Successor-product contract only:** define a separate avatar/presence authority and source-reference model; do not alter PNA.
4. **Full staged transition:** authorize implementation only after reviewing the final detailed plan, test evidence, and an explicit retirement date.

Until that approval, no route redirect, write disablement, archive/export UI, schema/data migration, successor bridge, entitlement repair, record suppression, or deletion may occur.

## References

[1]: [PNA routes and subdomain behavior — `client/src/App.tsx`](../../../client/src/App.tsx)

[2]: [PNA shell modes, integrations, and private proposal behavior — `client/src/pages/PNAShellPage.tsx`](../../../client/src/pages/PNAShellPage.tsx)

[3]: [Keeper archive/seal, profile/skin, and legacy image-generation procedures — `server/routers/keeper.ts`](../../../server/routers/keeper.ts)

[4]: [Owner-scoped mutable PNA workspace procedures — `server/routers/pnaThreads.ts`](../../../server/routers/pnaThreads.ts)

[5]: [Marketplace avatar catalog, equipment, and AVT procedures — `server/routers/marketplace.ts`](../../../server/routers/marketplace.ts)

[6]: [Schema boundaries for users, skins, archives, PNA threads, marketplace records, and purchases — `drizzle/schema.ts`](../../../drizzle/schema.ts)

[7]: [Owner-scoped private Quiver procedures — `server/routers/quiver.ts`](../../../server/routers/quiver.ts)

[8]: Read-only aggregate inventory query, 2026-09-12; no creator identity or private content retrieved.
