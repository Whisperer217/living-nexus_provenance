# ADR-026: PNA Visual Composer and Creator-Private Image Generation

**Status:** Proposed — requires Keeper approval before implementation.  
**Date:** 2026-08-14. **Author:** Manus AI.  
**Depends on:** ADR-016 (governed Agent foundation), ADR-022 (Guide/AVT representation boundary), ADR-024 (Local ↔ Public custody), and ADR-025 (model-agnostic PNA Ingestion Commission).

> **Decision:** Restore image generation as a first-class, **mobile-first** PNA Creator Studio capability. PNA will orchestrate a model-neutral **Visual Composer** that may use up to four creator-approved reference images, retrieves authorized music/registry/Quiver context through application tools, records prompt and reference lineage, and saves every generated asset to the creator-private Quiver. Artwork and reference previews will support two-finger pinch-to-zoom and pan inside their own bounded canvas, while preserving the phone’s native browser accessibility zoom for the rest of the page. PNA may offer an optional, clearly labeled *AI reflection* on the work’s intended emotional arc; it must never state what an image objectively means or how a viewer will respond. No generated asset is attached, registered, synchronized, or published without a separate, single-use creator confirmation.

This ADR is a design record. It makes **no** code, schema, service, database, storage, listing, account, or publication change.

## 1. Why this exists

The image generator, Quiver working shelf, prompt lineage, generation service, and current four-reference composer UI were preserved in the codebase but became unreachable when the old `/keeper-compose` path was redirected to PNA. The failure is an orphaned workflow—not absent product capability.[1] [2]

The restored capability must be more than a generic image button. The creator intent expressed in the submitted design discussion identifies the distinctive job of Living Nexus visual composition:

| Unique quality | Required product expression | Non-negotiable boundary |
|---|---|---|
| **Music-native composition** | PNA can retrieve an authorized song/Draft’s title, metadata, participation, Origin Story, WID state, and visual history as context. | A model cannot alter music metadata, WID, or provenance truth. |
| **Four-reference visual language** | Creator selects up to four images and declares each image’s role: subject, composition, light/material, palette/mood, or other creator-defined role. | References are creator-approved assets only; no unverified URL scraping or public-domain/legal conclusion. |
| **Prompt and source custody** | Every proposal distinguishes creator prompt, retrieved registry facts, creator reference assets, deterministic technical facts, and AI suggestions. | Prompt/ref provenance is not silently erased or represented as a legal ownership result. |
| **Emotional-arc reflection** | PNA can suggest an *intended emotional arc* based on creator language, prompt, style, and Origin Story, then invite the creator to edit/accept/reject it. | It is never presented as an objective meaning, mental-health assessment, audience prediction, or a claim about another person’s inner state. |
| **Private Quiver first** | Every result lands in the creator-owned working shelf with remix lineage and a clear next-action menu. | Generation does not publish, register a WID, set public gallery status, attach to music, or sync outward. |
| **Guided artistry, not a second autonomous persona** | PNA exposes an **Image Composer Lens**—a bounded capability of the authorized Agent—rather than inventing a new autonomous avatar/authority. | Guide/AVT identity and commercial representation remain governed by ADR-022. |
| **Sequential creator confirmation** | The product asks one consequential question at a time: save, remix, attach, register, sync, publish. | “Generate” never implies consent to any later operation. |

## 2. Direct current-state evidence

The current code already contains the raw substrate. `KeeperComposePage` handles prompt generation/remix and four reference-image slots, while the server image service accepts a prompt and optional original-image array. The Quiver router persists creator-owned images and includes list, save, title, delete, and public-gallery toggle procedures. Its current schema, however, preserves only one scalar `referenceImageUrl` rather than a complete multi-reference relationship. Songs have `coverArtUrl`, `visualSource`, `visualPrompt`, and `visualLineageJson`, but no typed Quiver-to-Draft attachment relation.[1] [2] [3] [4]

| Current component | Reuse | Blocking gap to resolve |
|---|---|---|
| `server/_core/imageGeneration.ts` | Existing provider call and image-result contract. | Fixed Forge-provider assumption; no provider-neutral capability declaration, typed reference roles, or Commission linkage. |
| `client/src/pages/KeeperComposePage.tsx` | Four-slot reference UX, prompt/enrichment, remix initiation, and Quiver shelving behavior. | Orphaned route and competing full-screen surface; must be decomposed into a PNA Composer module rather than remounted unchanged. |
| `server/routers/quiver.ts` | Creator-scoped asset custody and shelf operations. | Single reference URL; no proposal/confirmation gate, no typed reference lineage, no direct creator-confirmed Draft attachment action. |
| `drizzle/schema.ts` | Quiver, WID, Agent Ledger, and music visual-lineage tables. | No normalized multi-reference rows, visual Commission, proposal, confirmation, or asset-to-Draft relation. |
| `client/src/pages/PNAShellPage.tsx` and `PNAWorkspacePanel.tsx` | Active PNA workspace/canvas, context-oriented interaction, and single chat owner. | No bounded Visual Composer trigger or panel. |
| `client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx` and `server/routers/songs.ts` | Existing Draft registration, cover handling, deterministic hash/WID process, and visual field persistence. | No PNA-mediated, confirmation-gated selection of a Quiver asset as Draft cover/visual attachment. |
| `server/routers/agents.ts` and ADR-025 | Current music-Draft Commission/Agent Ledger foundation and model-neutral Tool Gateway direction. | Current Agent authority remains too narrow and does not define `visual_composer` capability or image-action contracts. |

## 3. Architecture: PNA Visual Composer

```text
Creator
  │ chooses Image Composer Lens, writes intent, selects ≤4 references
  ▼
PNA Visual Composer panel
  │   ├─ shows selected model/image-provider, privacy, and context scope
  │   └─ creates bounded Visual Commission
  ▼
PNA Orchestrator
  ├── authorized read tools ──────► Registry / Draft / Quiver / Guide context
  ├── image-provider adapter ─────► local or hosted image provider
  └── deterministic services ─────► reference validation, storage, hashes, Quiver
                                     │
                                     ▼
                           Proposal + source labels + reflection
                                     │
                               creator confirms
                                     │
                                     ▼
                           Quiver-private asset record
                                     │
                  separate proposals: remix / attach / register / sync / publish
```

The model and image provider are **replaceable reasoning/generation adapters**. The database, Quiver, WID, provenance, access controls, confirmations, and public-manifestation rules remain application services. No model has database credentials or direct write access.

### 3.1 Capability declaration

The existing `music_draft` Agent capability should remain unchanged. The approved feature adds a distinct, default-off `visual_composer` capability with the following bounded authority:

| Allowed after capability grant | Still prohibited without further confirmation | Always prohibited |
|---|---|---|
| Inspect the current Commission file/reference assets; retrieve creator-owned Quiver/Drafts and public registry context; prepare prompts; call an approved image adapter; create a no-publicity Visual Proposal. | Save to Quiver; remix; attach to a Draft; add a private WID registration request; Local ↔ Public sync; public gallery/publication. Each needs a matching confirmation artifact. | Raw SQL/database credentials; cross-creator private retrieval except an explicitly authorized Keeper/admin tool; unlogged generation; silent public publication; deciding ownership/rights; altering an existing WID. |

### 3.2 Model and image-provider neutrality

The orchestration contract must distinguish **reasoning model** from **image provider**. A creator may select a compatible local or hosted reasoning model and a compatible image-generation provider, subject to available capabilities. The user-facing card identifies both separately:

| Capability | Model adapter | Image-provider adapter |
|---|---|---|
| Job | Interpret creator intent, retrieve bounded context, formulate a proposal, and phrase questions. | Generate or remix pixels from a validated visual brief and reference payload. |
| Location | Local companion or hosted Reasoning Bridge. | Local companion or hosted generation Bridge. |
| Minimum declaration | Structured output/tool support, vision support if reference analysis is enabled, execution location, availability. | Reference-image limit, remix/edit support, output types, execution location, availability. |
| Database/storage access | None. It receives typed tool results only. | None. It receives only validated, creator-approved prompt/reference payloads and returns image bytes/URLs to deterministic storage handling. |
| Cost/privacy disclosure | Displayed before use when hosted. | Displayed before use when hosted; any outgoing reference asset is listed by asset identity and role. |

The first web-platform slice may reuse the existing Forge image service behind a `HostedForgeImageProvider` adapter, but application code must not treat Forge as ontology. A local provider can follow through ADR-024’s Local Companion without changing the Commission, Quiver, tool, confirmation, or provenance contract.

## 4. Reference-image provenance policy

The feature honors the requested four-reference workflow through a normalized relationship—not a single URL or opaque array—so that every reference has a stable role and status.

### 4.1 Creator-visible reference roles

| Role | Creator question | Stored meaning |
|---|---|---|
| `subject` | “What subject, figure, object, or identity anchor should this preserve?” | Creative direction only; does not establish rights or consent. |
| `composition` | “What framing, arrangement, or camera language should guide the result?” | Visual-language reference. |
| `light_material` | “What light, texture, material, or atmosphere matters?” | Visual-language reference. |
| `palette_mood` | “What color, temperature, mood, or energy should guide the result?” | Creative-intent reference. |
| `creator_defined` | “What does this reference mean to you?” | Free-text creator declaration. |

PNA can suggest a role, but the creator must be able to change or remove it. An external URL is never silently ingested as a reference. The first slice should accept only (a) an image uploaded to the current Commission or (b) an asset selected from the creator’s private Quiver. Any future shared/Guide/public-catalog reference requires its own access and rights policy.

### 4.2 Required reference record

```ts
interface VisualReferenceRecord {
  referenceId: string;
  visualCommissionId: string;
  sourceKind: "commission_upload" | "creator_quiver";
  sourceAssetId: string;
  immutableContentHash: string;
  creatorDeclaredRole: "subject" | "composition" | "light_material" | "palette_mood" | "creator_defined";
  creatorNote?: string;
  selectedByCreatorAt: number;
}
```

Each generated Quiver item stores an ordered collection of the exact validated reference IDs and hashes used for that generation. A later edit or remix creates a new Quiver item with a parent asset link; it does not overwrite the earlier prompt, references, result, or lineage.

## 5. Intended emotional arc: reflection, not diagnosis

The Visual Composer may offer a special optional form of contextual assistance:

> **“What emotional movement do you intend this image to carry—from entry, through tension or transformation, to release or residue?”**

This distinguishes an authored intention from an AI’s reading of the work. The creator can provide a free-text intended arc, accept/edit/reject an AI-proposed reflection, or leave it blank.

| Label visible in PNA | Origin | Allowed use | Forbidden interpretation |
|---|---|---|---|
| **Creator’s intended arc** | Creator authored/edited. | Prompt composition, Quiver context, Origin Story linkage, creator-private retrieval. | Objective fact about the image or audience. |
| **AI reflection — unconfirmed** | Model-generated from permitted context. | Private suggestion card, explicitly editable by creator. | Diagnosis, trauma/mental-health inference, personality judgment, audience prediction, or a public claim. |
| **Creator-confirmed reflection** | Creator explicitly accepted/edited. | Private visual-intent metadata and, only if separately selected, public accompanying text. | Substitution for authorship, testimony, or rights declaration. |

The supported movement vocabulary is intentionally expressive rather than clinical: **arrival → tension → fracture → attention → transformation → release → residue**. The creator can use, modify, reorder, or ignore it. No emotion tag becomes a WID fact or a registry truth claim.

## 6. PNA interaction design

The new experience belongs inside the active PNA shell, preserving PNA as the sole chat owner. It must not revive `/keeper-compose` as a competing independent route.

### 6.1 Entry and panel

PNA receives an **Image Composer** action in its existing capability/plus-action space. Opening it creates a bounded **Visual Composer panel** in the PNA workspace/context canvas, not a second floating chat and not a public gallery.

| Panel step | Creator sees | System action | No-action guarantee |
|---|---|---|---|
| **1. Intention** | Natural-language intent, optional linked music Draft/track, optional Origin Story selection. | Builds a typed contextual request from authorized record IDs. | No file or database write. |
| **2. References** | Up to four slots with creator-selected role and notes; privacy/provider notice. | Validates source ownership, MIME/size/hash, and provider/reference compatibility. | No provider call or public upload. |
| **3. Compose** | Model and image-provider card, privacy scope, prompt provenance preview, optional intended-arc editor. | Creates a Visual Commission and produces an explicit image-generation proposal. | No generation until the creator presses “Generate privately.” |
| **4. Result** | Generated result, prompt/source ledger, reference list, technical output facts, optional AI reflection separated from creator intent. | Stores temporary protected generation result and prepares Quiver save proposal. | No Quiver/cover/Draft/public state mutation. |
| **5. Keep** | “Save to Quiver privately” confirmation card. | Writes an immutable Quiver result and lineage after exact confirmation. | No music attachment or registry/publicity action. |
| **6. Continue** | Separate choices: remix, attach to named Draft, prepare private WID request, prepare Local ↔ Public manifest, or publish. | Prepares only the chosen next proposal. | Each choice uses a new single-use confirmation. |

### 6.2 Source labels

The result panel must visibly separate these categories:

| Category | Example |
|---|---|
| **Creator direction** | “Cover for ‘RUN AWAY’; three figures in flight; heat and blue dusk.” |
| **Retrieved registry context** | Current Draft title, creator identity, visible WID state, creator-selected Origin Story excerpt. |
| **Creator reference assets** | Four asset cards with role, hash prefix, Quiver/Commission origin, and creator note. |
| **Measured technical facts** | MIME, file dimensions, output hash, generation timestamp, provider adapter identity. |
| **AI suggestion** | Prompt enrichment or optional intended-arc reflection, always editable/rejectable. |

### 6.3 Mobile-first canvas and gesture contract

The first design target is a narrow mobile viewport with the global player and navigation present. Desktop enhances this design; it does not define it. PNA’s existing shell already uses a `100dvh` workspace and has fixed mobile presentation layers, so the Visual Composer must join its panel hierarchy rather than establish competing full-screen geometry.[7]

| Interaction | Mobile contract | Desktop and accessibility equivalent |
|---|---|---|
| **Inspect reference or generated artwork** | Two-finger pinch zooms a bounded image canvas from 1× to a capped inspection scale; one finger pans only while the canvas is magnified. `touch-action` is limited to the canvas so the rest of PNA preserves normal scroll/browser gestures. | Mouse wheel/trackpad zoom plus drag pan; visible zoom in/out/reset buttons; keyboard-operable controls. |
| **Return to composition** | A visible **Reset view** control recenters and returns to 1×; closing the panel always clears gesture state. | Same control and Escape handling. |
| **Choose references** | Four compact, ordered slots with a role chip, remove control, and tap target sized for touch. No hover-only information or action. | Drag ordering may enhance the ordered list but never replace button-based reorder controls. |
| **Confirm action** | One full-width, plain-language confirmation card at a time; explicit cancel/return route. | Same confirmation contract; no shortcut bypass. |
| **Panel geometry** | Visual Composer is a portal-mounted, fixed panel constrained above the mobile navigation/player stack, with `dvh` sizing and safe-area padding. | Docked/resizable panel may enhance workspace without changing content order. |
| **Motion and performance** | `prefers-reduced-motion` disables nonessential canvas transitions; gesture transforms use `transform`, not layout properties. Reference thumbnails are decoded lazily and only the active inspection image is high-resolution. | Same reduced-motion setting and bounded asset behavior. |

The image canvas must never disable the browser’s global pinch zoom through a viewport restriction. The scoped two-finger gesture exists only to inspect creative imagery, and it must release immediately when the interaction moves outside the canvas. Opening the Visual Composer must preserve the platform’s bottom stack: content cannot hide behind player/navigation, panel scroll cannot leak into the page, and close/unmount must restore all scroll/gesture state.[8]

## 7. Sequential creator confirmation

ADR-025’s `PnaConfirmation` contract applies unchanged. This feature adds visual action types:

```text
generate_private_visual
save_quiver_asset
remix_quiver_asset
attach_quiver_asset_to_draft
prepare_private_visual_wid
register_private_visual_wid
queue_local_to_public_manifestation
publish_visual_manifestation
```

`generate_private_visual` may be treated as a creator-initiated, non-public compute operation once the preview discloses data scope/provider choice. Every persistent or externally consequential action—especially Quiver save, attachment, registration, sync, or publication—requires a new confirmation bound to the exact canonical proposal hash, creator, asset hash, and expiration.

## 8. Required additive data model and migration plan

The approved implementation must favor additive models and immutable lineage over retrofitting a single mutable URL field.

| Change | Minimum structure | Why it is required |
|---|---|---|
| `visual_commissions` | Creator/agent/capability, linked music Draft optional, model/image-provider adapter IDs, declared data scope, state, timestamps. | Bounded audit trail from PNA intent to result. |
| `quiver_image_references` | Quiver result or Commission, ordered reference asset ID, hash, source kind, role, creator note, selected timestamp. | Preserves four-reference lineage and roles relationally. |
| `quiver_image_lineage` | Child Quiver ID, parent Quiver ID, relationship (`remix`, `variation`, `attachment_candidate`), source proposal/Commission. | Makes remix ancestry explicit without rewriting prior records. |
| `visual_intent_records` | Commission/Quiver ID, creator intended arc, AI suggestion, creator-confirmed text, source-label metadata. | Separates creator declaration from AI reflection. |
| `pna_action_proposals` / `pna_confirmations` | Reuse or extend ADR-025’s additive shared records with visual action types. | Enforces one approval per consequential action. |
| `draft_visual_attachments` | Draft/Creation ID, Quiver ID, relationship (`cover`, `supporting_visual`), proposed/confirmed actor/event/time. | Replaces manual URL copying with attributable attachment. |

The existing scalar `referenceImageUrl` remains supported for legacy Quiver items. It must not be reinterpreted as a complete multi-reference record; migrations backfill at most one `legacy_reference` row when safely identifiable, otherwise preserve the legacy field untouched. Existing Quiver records, WIDs, and public gallery visibility must remain unchanged.

### Implementation order

1. Add feature-specific schema, migration, database helpers, and creator-owner authorization tests.
2. Extract a provider-neutral image adapter contract around the existing Forge generator; ship the hosted adapter only if its capability/data-scope disclosure is visible.
3. Add protected PNA Visual Commission/read/proposal routes and tool schemas; no mutation route can be model-called directly.
4. Add PNA Visual Composer panel and four-reference intake; use existing PNA Context Canvas and gold-token design patterns.
5. Add Quiver private save confirmation and immutable multi-reference lineage.
6. Add a creator-confirmed Quiver-to-Draft cover attachment; retain current manual upload path until parity is proven.
7. Implement private visual WID and Local ↔ Public/publication proposals only after the prior slices pass authorization and confirmation tests.
8. Add a local image-provider adapter in the Local Companion after the shared contract is proven.

## 9. Six-layer alignment

| Layer | Strengthened by this design | Constraint that prevents degradation |
|---|---|---|
| **Identity** | Creator direction, reference selection, intended arc, and HAAI labels are attributed. | AI reflection cannot replace creator declaration. |
| **Manifestation** | Music-linked, intentional image composition restores visual craft to the Studio. | PNA panel uses cathedral tokens and does not create a generic gallery/application skin. |
| **Relationship** | A work’s visual language can be deliberately linked to its song and testimony. | No public audience targeting or emotional manipulation claim. |
| **Registry** | Hashes, references, prompts, lineage, confirmation, and WID requests become explicit records. | No WID rewrite, automatic seal, or model-authored registry fact. |
| **Stewardship** | Private Quiver-first custody, explicit provider disclosure, and additive migration protect creator work. | No silent upload, external processing, or publication. |
| **Legacy** | Remix lineage and source-labelled visual intent preserve future interpretability. | Legacy single-reference records remain historically intact. |

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Creator believes a generated prompt/reflection is an ownership or legal rights conclusion. | Visible source labels; creator declaration versus AI suggestion separation; legal-review boundary; no rights determination UI. |
| Reference images leave the creator’s custody unexpectedly. | Provider/location disclosure before Generate; local provider option; no external URL scraping; explicit outbound asset list. |
| Model or provider can mutate registry data. | Models receive only bounded tools; mutations are deterministic services gated by one-time confirmations. |
| Four references cause ambiguous or unstable output. | Creator-selectable role per reference; prompt preview; reference order retained; provider-limit validation before request. |
| A PNA visual panel recreates competing chat/legacy navigation. | One PNA owner; bounded workspace/context panel; `/keeper-compose` stays redirected/decommissioned after migration parity. |
| Quiver bloat or accidental public exposure. | Private-by-default save; explicit lifecycle states; no publication default; retention/usage data available to creator. |
| Existing artwork loses lineage during migration. | Additive tables; no destructive backfill; legacy reference remains a preserved historical field. |
| Canvas gesture prevents page navigation or leaves mobile scroll locked. | Bound `touch-action` and pointer state to the image canvas only; use portal/fixed panel discipline; reset gesture/scroll state on close and unmount; verify iOS Safari and Android Chrome. |
| Player or mobile navigation obscures a confirmation/action. | Use the platform bottom-stack/safe-area tokens, full-width actions, and mobile screenshot/interaction tests with the player both absent and present. |

## 11. Test, validation, and rollback plan

| Test category | Required proof |
|---|---|
| Reference ownership | A creator cannot select another creator’s private Quiver asset or use more than four references. |
| Source integrity | Stored reference order, role, asset ID, and hash match the confirmed proposal; legacy records remain unchanged. |
| Provider neutrality | Hosted fixture and local-adapter fixture return the same schema-valid proposal/result contract; unavailable/unsupported adapters fail before a provider call. |
| Data containment | Model/image-provider request receives only the approved context/assets; no database credential, raw private registry dump, or unapproved file is present. |
| Emotional-arc language | UI clearly labels creator declaration, AI reflection, and confirmed text; model output cannot be persisted as creator-authored without confirmation. |
| Confirmation | Save, remix, attach, WID request, sync, and publish all reject missing, stale, mismatched, or replayed confirmation records. |
| Draft attachment | A confirmed Quiver attachment creates a typed relation to the selected creator-owned Draft and never silently changes a public song. |
| Public safety | Generate/save/attach flows leave gallery/public records unchanged; public action needs a separate proposal and confirmation. |
| Regression | Existing PNA, Music Environment, Quiver, generation, WID, Explore, player, and theme tests remain green; no PNA duplicate-chat or mobile/drawer regression. |
| Visual/accessibility | Keyboard reference management, focus restoration, reduced-motion behavior, image alt/source labels, responsive panel layout, and theme-token contrast pass. |
| Mobile gesture/stack | On iOS Safari and Android Chrome: page retains native browser zoom; two fingers zoom/pan only inside the artwork canvas; single-finger panel scrolling still works at 1×; reset/close clears transform state; no content is hidden behind navigation/player; no viewport-floor void or leaked body scroll occurs. |

Rollback disables the `visual_composer` capability and adapter availability, leaving existing PNA chat, Quiver, and Music registration untouched. All Commission/proposal/confirmation/audit rows remain append-oriented records. No rollback deletes creator imagery, prior Quiver records, or WIDs.

## 12. Decisions required before code

1. Approve **Visual Composer** as a capability of PNA—not a new autonomous avatar or an independent `/keeper-compose` surface.
2. Approve the first slice: four creator-owned references, hosted adapter behind a provider-neutral interface, generation to **private Quiver only**, and no public sync/publication.
3. Confirm whether the first user-facing image adapter may send creator-selected reference images to the existing hosted Forge service, with clear disclosure, while a local adapter is built afterward.
4. Approve the optional `intended emotional arc` feature under the labels and non-diagnostic/non-predictive boundary above.
5. Approve the first PNA-to-music action after Quiver save: **attach as a cover to one named private Draft** only.

## References

[1]: [`server/_core/imageGeneration.ts`](../server/_core/imageGeneration.ts) — existing Forge-backed generation service and optional original-image array.

[2]: [`client/src/pages/KeeperComposePage.tsx`](../client/src/pages/KeeperComposePage.tsx) — preserved four-reference image-composition, prompt, remix, and Quiver workflow.

[3]: [`server/routers/quiver.ts`](../server/routers/quiver.ts) and [`drizzle/schema.ts`](../drizzle/schema.ts) — existing creator-owned Quiver lifecycle and single-reference storage limitation.

[4]: [`client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx`](../client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx) and [`server/routers/songs.ts`](../server/routers/songs.ts) — existing music Draft, cover, hash/WID, and visual-lineage mechanics.

[5]: [`docs/ADR-025-MODEL-AGNOSTIC-PNA-INGESTION-COMMISSION.md`](ADR-025-MODEL-AGNOSTIC-PNA-INGESTION-COMMISSION.md) — model-neutral Tool Gateway, Commission, confirmation, and deterministic-service boundary.

[6]: [`docs/ADR-024-LOCAL-FIRST-CREATIVE-WORKSPACE.md`](ADR-024-LOCAL-FIRST-CREATIVE-WORKSPACE.md) — Local ↔ Public custody, local execution, and consent-based synchronization direction.

[7]: [`client/src/pages/PNAShellPage.tsx`](../client/src/pages/PNAShellPage.tsx) and [`client/src/components/PNAWorkspacePanel.tsx`](../client/src/components/PNAWorkspacePanel.tsx) — active PNA shell/workspace viewport, fixed-layer, and scrolling seams.

[8]: [`/home/ubuntu/skills/mobile-layout-triage/SKILL.md`](../../skills/mobile-layout-triage/SKILL.md) — mobile viewport floor, bottom-stack, panel, and scroll-lock design guidance applied to this proposal.
