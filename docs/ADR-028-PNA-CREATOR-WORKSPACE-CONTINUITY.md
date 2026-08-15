# ADR-028 — PNA Creator Workspace Continuity

**Status:** Proposed — implementation requires Keeper approval  
**Date:** 2026-08-15  
**Scope:** PNA private creator workspace only. It does not merge Draft PR #22 or #23, change the public Loop, register a WID, publish a Quiver asset, or alter the Chain of Record.

## Decision

Living Nexus will evolve PNA from a transient chat shell into a **durable creator workspace**. A creator will work inside one addressable thread where conversation, Working State, generated-image proposals, private Quiver assets, and selected music-Draft context remain reachable together. The workspace will expose a private Quiver shelf and asset-detail route inside PNA. It will offer image-aware reflection as an explicitly labeled AI proposal, not as a claim about the creator, an audience, a work’s provenance, or a WID.

> **PNA may retrieve, organize, reflect, and propose. The creator alone confirms saving, revising, attaching, registering, sealing, synchronizing, or publishing.**

The decision fixes a product-continuity problem. PNA can now generate a private image, but the current system does not keep a durable active conversation, make Quiver visibly reachable from PNA, or turn a generated image into an inspectable artifact with a clear revision path. Existing data and services are retained; their routing and lifecycle are unified.

## Current State: What Exists and Why It Feels Broken

The deployed `/pna` surface keeps messages, visual proposals, and mode state in component memory. It passes a short caller-supplied history to the protected chat procedure, but has no server-side active-thread identity. A creator can save an explicit diary snapshot and later reopen it through a one-time session handoff, but cannot simply return to the same living conversation. [1](../client/src/pages/PNAShellPage.tsx) [2](../server/routers/keeper.ts)

The image path is real. A Vision prompt produces a protected private proposal and an explicit creator action can save it to the owner-scoped Quiver. The Quiver router already supplies owner-scoped list, delete, title, and publication operations. What is absent is PNA-facing browse, asset detail, and deep linking. [3](../client/src/components/PNAVisualProposalCard.tsx) [4](../server/routers/quiver.ts)

| Existing foundation | Current failure | ADR-028 correction |
|---|---|---|
| Protected `keeper.chat` and active PNA shell | Chat is page-local and cannot resume after reload | A durable, owner-scoped `PNAThread` and append-only working messages |
| `keeperChatArchives` / WID-CNV diary sealing | Archive snapshots are not an active conversation | A diary opens as a clearly labeled **forked working thread**; the archived/sealed source is never rewritten |
| Protected private Vision proposal and `quiver.save` | Saved images have no obvious PNA destination | PNA Quiver shelf plus a private asset-detail route |
| `keeper.analyzeImage` | No structured visual reflection occurs after generation | A model-neutral reflection proposal card with editable revision options |
| `NexusContextRef` and Working State rules | Context can be mistaken for provenance | Typed, display-only context snapshots; only explicit registry actions may create permanent provenance |

## Creator Experience

The creator has one home, not a series of escape hatches.

| Workspace region | Desktop role | Mobile role | Authority boundary |
|---|---|---|---|
| **Threads** | Narrow left list of active/recent private creator threads | Sheet opened from the PNA header | Selecting or creating a thread changes Working State only |
| **Conversation** | Center timeline and composer | Primary full-screen surface | Messages are private working records, never WID evidence by default |
| **Active artifact** | Right context column for generated image, Quiver asset, Work, or Creator | Bottom sheet / full-screen inspector | Displays source labels and actions; no automatic mutation |
| **Quiver** | PNA navigation item and shelf route | PNA navigation item and full-screen shelf | Owner-scoped private assets only; public promotion stays explicit |

The normal cover-art sequence becomes: **describe → generate privately → inspect → receive optional reflection → request a revision or save intentionally → open the saved asset from Quiver → choose a separate attachment or registry action later.** No action in this sequence seals provenance or publishes a work.

## Canonical Routes

The PNA shell remains the owner of creator chat and private visual work. The retired `/keeper-compose` route remains retired; it must not be revived as a competing image tool.

| Route | Purpose | Visibility |
|---|---|---|
| `/pna` | Resolves to the creator’s last active thread or creates an empty working thread on first intentional message | Protected, private |
| `/pna/thread/:threadId` | Canonical durable conversation route | Protected, owner-scoped |
| `/pna/quiver` | Private creator image shelf | Protected, owner-scoped |
| `/pna/quiver/:assetId` | Private image detail, prompt lineage, reflection, revision, and future attachment choices | Protected, owner-scoped |
| `/keeper` | Archive, notes, diary, avatar, and management entry; it deep-links into PNA rather than copying text to an orphaned route | Protected, owner-scoped |

The docked PNA panel remains a companion. It may show the current thread and its most recent artifact, but **Full Workspace** is the single escape route for thread history, Quiver browse, and asset detail. This prevents feature-parity duplication between a compact panel and the primary workspace.

## Data Contract

The implementation uses additive working-state records. It does not repurpose WID, registry, diary-seal, or public-gallery tables.

| Record | Minimum fields | Meaning |
|---|---|---|
| `pna_threads` | `id`, `userId`, `title`, `mode`, `workingContextVersion`, `workingContextJson`, `activeArtifactRef`, `forkedFromArchiveId?`, timestamps | A creator-owned, resumable **Working State** container |
| `pna_thread_messages` | `id`, `threadId`, `ordinal`, `role`, `kind`, `content`, `artifactRef?`, `modelDisclosure?`, `createdAt` | Append-only private conversation and artifact references |
| `quiver_images` additive links | `threadId?`, `parentQuiverImageId?`, `generationCommissionId?` | Optional link to its originating thread and revision lineage, never a WID assertion |
| `pna_image_reflections` | `id`, `assetRef`, `threadId`, `modelDisclosure`, `reflectionJson`, `createdAt`, `creatorAcceptedAt?` | Optional AI proposal about a visual; acceptance is separate from saving or revising |

All Working State records are owner-scoped. Thread text and reflection are private by default. Deleting a private thread or asset must not erase an already sealed diary, an issued WID, or any Chain-of-Record evidence.

## Image Reflection Contract

The reflection service receives the generated image reference, the creator’s prompt, any creator-entered intention, and a narrow, typed Working State reference. It does **not** infer legal ownership, emotional diagnosis, creator biography, audience reaction, WID status, or provenance.

The server uses a vision-capable model behind an adapter and requests strict structured output. Structured schemas make the result safe to render as distinct UI fields instead of treating arbitrary prose as a command. [5](https://developers.openai.com/api/docs/guides/structured-outputs) [6](https://ai.google.dev/gemini-api/docs/structured-output)

```ts
type PNAImageReflection = {
  disclosure: "AI visual reflection — proposal, not registry fact";
  conciseRead: string;
  visibleElements: string[];
  compositionNotes: string[];
  paletteAndLightNotes: string[];
  alignmentToCreatorIntent: string[];
  revisionSuggestions: Array<{
    id: string;
    label: string;
    rationale: string;
    proposedPromptDelta: string;
  }>;
  limitations: string[];
};
```

The card may offer **Use this revision idea**. That action only copies an editable prompt delta into the composer. It does not generate, remix, overwrite, save, attach, or publish without the next explicit creator action.

## Durable Thread Contract

Every active PNA conversation has a stable, server-owned thread ID. The client loads its thread history on route entry and debounces append mutations after each user/assistant/artifact event. Thread state is addressable across reloads and devices. This follows the durable-identifier principle used by modern conversation APIs, while keeping Living Nexus—not a model vendor—the owner of the creator’s records. [7](https://developers.openai.com/api/docs/guides/conversation-state)

The model remains stateless from a sovereignty standpoint. The server constructs each model call from the selected thread window, typed Working State, and creator-approved artifact references. The thread database is the source of interaction continuity; no model-provider conversation ID is required for correctness, and no external model holds registry authority.

Existing diary behavior changes only on an explicit reopen: **Open in PNA** creates or resumes a working thread marked `forkedFromArchiveId`; it never mutates the archive, removes its seal, or represents the new working thread as the original diary.

## Working State Is Not Chain of Record

| Category | What it may contain | What it may never do |
|---|---|---|
| Working State | Current route, mode, player facts, selected Quiver image, unsealed status, creator prompts, AI suggestions | Claim a WID exists where it does not, generate a seal, publish an asset, or rewrite origin |
| Private Quiver | Generated/uploaded image, prompt lineage, reflection, private revision relationship | Become public or registry truth by saving alone |
| Diary / WID-CNV | Creator-selected archived conversation and its existing seal | Become a mutable active thread or be overwritten by PNA |
| Registry / WID | Explicitly registered creative work and verified provenance fields | Be invented from chat, a visual suggestion, or player context |

If a selected work is unsealed, the only permitted provenance display is **“Unsealed — no WID.”** Silence is correct when no verified provenance fact exists.

## Phased Delivery

| Slice | Creator-visible outcome | Why it comes in this order |
|---|---|---|
| **A — Continuity and reachability** | A PNA thread persists; Quiver is visibly reachable; saved image opens in private detail | Repairs the immediate “where did my work go?” failure before adding interpretation |
| **B — Artifact continuity** | Generated proposal is attached to its thread; saved asset records thread/revision lineage; archive reopen forks safely | Connects chat, generation, and saved work without public promotion |
| **C — Reflection and revision** | Image detail and fresh result card show structured, editable AI suggestions | Adds value only after the creator can reach and retain the image |
| **D — Creator-confirmed attachment** | A private Quiver image may be attached to one named music Draft through a separate confirmation | Connects Studio to music while retaining Draft and registry boundaries |

**Recommended first implementation:** Slice A. It provides the traditional-chat and private-shelf behavior the creator can immediately feel, while avoiding an uncontrolled addition of AI interpretation, media attachment, or provenance mutation.

## Six-Layer Alignment

| Layer | Strengthened by this decision | Guardrail |
|---|---|---|
| Identity | Creator-owned thread and asset routes make authorship visible | No AI-assigned authorship |
| Manifestation | One coherent workspace presents work intentionally | No generic chat dashboard or duplicate Composer |
| Relationship | Creator can revisit and continue their own creative process | No forced sharing or public exposure |
| Registry | WID remains a deliberate registry action | Working State and Quiver do not imply WID truth |
| Stewardship | Private work survives refreshes and route changes | Owner scoping and explicit deletion behavior |
| Legacy | Sealed diaries remain immutable while work continues by fork | Never rewrite historical archives or provenance |

## Risks and Controls

| Risk | Control |
|---|---|
| Thread persistence becomes an accidental evidence record | Label Working State, retain explicit diary/archive sealing, and keep registry actions separate |
| Reflection claims more than the image supports | Fixed schema, proposal disclosure, visible-elements grounding, and no claims about people or provenance |
| Quiver creates a second confusing Studio | One PNA-owned route and one asset-detail contract; `/keeper-compose` remains retired |
| Mobile panes fight the player or each other | PNA owns a mutually exclusive sheet state; use the existing player z-index hierarchy and safe-area rules |
| Conversation growth increases model cost/context | Store full private history, send a bounded recent window plus explicit creator-selected artifacts, and later add transparent summaries |
| Existing diaries are damaged by continuity work | Fork on reopen; keep `keeperChatArchives` and WID-CNV immutable |

## Test and Rollback Requirements

The first implementation must add behavioral coverage for owner-only thread access, reload/resume, no cross-thread leakage, forked diary immutability, Quiver list/detail ownership, generated-asset thread reference, and no WID/publication side effect. It must validate desktop and narrow mobile PNA with the player visible, the Quiver shelf reachable, a safe back path to the thread, and no fixed-layer overlap.

**Public-entry observation (2026-08-15):** desktop and 375px mobile checks of `/pna` reached the intentional unauthenticated splash gate. They did not expose owner-only thread or Quiver state and therefore do not substitute for the authenticated Slice A smoke listed above.

Rollback removes the new routes and hides the new workspace navigation while retaining additive private records. It never deletes Quiver assets, thread records, archive records, or sealed evidence. Threads remain exportable as private working data even if the UI is temporarily withdrawn.

## References

[1]: ../client/src/pages/PNAShellPage.tsx "PNA shell — current transient chat, Vision, diary, and result-card handling"
[2]: ../server/routers/keeper.ts "Keeper router — protected chat, image analysis, notes, and diary archive contracts"
[3]: ../client/src/components/PNAVisualProposalCard.tsx "Private generated-image proposal and explicit Quiver save control"
[4]: ../server/routers/quiver.ts "Owner-scoped private Quiver operations"
[5]: https://developers.openai.com/api/docs/guides/structured-outputs "Structured model outputs"
[6]: https://ai.google.dev/gemini-api/docs/structured-output "Gemini structured outputs"
[7]: https://developers.openai.com/api/docs/guides/conversation-state "Conversation state and durable identifiers"
