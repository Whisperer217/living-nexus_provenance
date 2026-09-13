# ADR — Nexus Gemini-First Convergence and No-Duplication Boundary

**Status:** Proposed architecture decision; implementation requires a separate approval.  
**Date:** 2026-09-13  
**Decision owner:** Doc Seraph Mercer / Keeper  
**Scope:** Reconcile the supplied Gemini-first AI Chat brief with the already deployed `ai.livingnexus.org` Nexus service.  
**Non-goal:** This ADR does not create another chat application, change the current provider key, enable image generation, change PNA, issue a Registry credential, or move creator assets.

## Decision

Living Nexus should retain one canonical **Nexus execution service** at `ai.livingnexus.org`, rather than building a second direct-provider chat application inside the main Living Nexus repository. Living Nexus Core remains the authority for identity, Works, WIDs, provenance, creator-private assets, registration, publication, and the canonical audio player. Nexus remains the separate, signed-session execution and interface plane for general chat, explicit Witness actions, governed discovery, and future creator-approved image actions.

This is not a rejection of the Gemini-first brief. The direct Gemini text adapter described there is already the correct narrow pattern and is live in the Nexus server boundary. The convergence decision is to **reuse that implementation and extend it**, not recreate it through a parallel `AIChatBox` path in the main application.

> **Nexus is the one AI workspace. Living Nexus is the one source of record.**

## Current alignment

| Brief objective | Existing Nexus state | Convergence decision |
|---|---|---|
| Authenticated AI route at `ai.livingnexus.org` | Live separate Nexus service uses a short-lived, signed Living Nexus session handoff. | Retain the subdomain and signed handoff. Add an intentional entry from Living Nexus rather than duplicate authentication or create a main-app chat engine. |
| Typed provider contract | Nexus has a server-only provider gateway with normalized capability, request/response hash, safety, usage, cost-state, and execution ID fields. [S1] | Keep the gateway as the shared provider seam. Add new providers or capabilities behind it, not in browser code or individual page components. |
| Direct Gemini text chat | Gemini general chat is server-only, bounded, rate/cost controlled, and intentionally has no Living Nexus record context by default. [S1] | Retain as the default **General chat** mode. It remains no-WID, typed-input-only, and truthful about the actual provider/model. |
| Explicit Work witness | Nexus has an explicit, permission-gated context attachment path separate from general chat. | Retain as a deliberate mode. Public discovery and playback cannot become Witness context automatically. |
| Public Work discovery and playback | Nexus can perform governed public discovery through a server-only Registry bridge and hand the selected WID to the canonical Living Nexus Work/player path. | Retain. Discovery and player handoff remain separate from provider input/context. |
| Gemini image generation/editing | The interface contains a disabled, explicit text-only image mode; no image model/provider action is enabled. | Implement only as a dedicated next slice with creator-approved assets, server-controlled storage, receipts, and no automatic Work/WID/provenance attachment. |
| Existing main-app image/PNA surfaces | Legacy Keeper/PNA image and Quiver behaviors exist under their own authority. | Do not silently absorb them. Treat any reuse as a separately governed asset-custody integration. |
| DeepSeek later | No DeepSeek route is active. | Add only as a server-side adapter to the same provider gateway after a provider-specific approval and receipt contract. |

## Ownership model

| Domain | Canonical owner | Nexus role | Explicitly prohibited |
|---|---|---|---|
| User identity and session | Living Nexus Core | Verify short-lived assertion; retain assertion only in tab memory. | Cookie copying, browser-held Core credentials, synthetic identity records. |
| Works, WIDs, provenance, testimony | Living Nexus Core / Registry | Read only approved, minimal context projections through governed APIs. | Direct database reads, WID issuance, provenance mutation, treating inference as testimony. |
| Audio playback | Living Nexus player | Hand selected Work back to Living Nexus. | Second audio engine, raw audio library, queue ownership, player state as AI context. |
| General conversation | Nexus durable execution store | Persist conversation/execution metadata only under its own scope and privacy contract. | Implicit creator corpus or record access. |
| Gemini key and provider calls | Nexus server-only configuration | Execute bounded configured calls and record normalized receipts. | Browser key exposure, source-control secrets, unbounded provider routing. |
| Creator-approved image inputs/outputs | **Living Nexus Core asset custody, proposed** | Request a scoped asset reference and display execution/receipt state. | Browser-provided arbitrary URLs, treating a generated output as saved before Core storage confirms it. |
| PNA threads, portraits, Quiver, legacy image proposals | Their existing authorities | None by default. | Automatic transfer to chat context, training, image prompting, registration, or an avatar successor. |

## Routing and user experience

The user-facing route remains **`https://ai.livingnexus.org/chat`**. The separate application boundary stays in place because it protects provider/server credentials and gives Nexus an execution lifecycle distinct from Work registration and publication. The main Living Nexus application should expose a clear, first-party entry such as **Open Nexus**, but it should not render a competing full chat engine.

The canonical Nexus composer remains one persistent surface. General chat is the default and requires no WID because it receives only typed text. Witness a Work is a separate mode requiring the creator/user to explicitly attach a permitted Work. Discovery selects a public catalog item for the player or a future explicit context action; it never attaches context on selection. Image creation, when approved, belongs in the same composer mode system but keeps its own receipt and private asset lifecycle.

## Provider contract

Every provider capability uses the same server-only contract shape:

| Field | Requirement |
|---|---|
| `providerId` and `modelId` | Actual configured provider/model, returned truthfully to the UI. |
| `capability` | `GENERAL_TEXT`, `TEXT_WITNESS`, `IMAGE_GENERATION`, or later explicitly approved capabilities. |
| Input authority | Typed user content by default; approved asset/context references only when an action’s separate policy permits them. |
| Receipt | Execution ID, normalized status, request/response hashes, safety outcome, usage, cost state, and provider request ID when available. |
| Error behavior | A provider failure creates a truthful failed receipt. It does not fabricate generated content, a saved asset, provenance, or publication. |
| Secrets | Server-only deployment configuration; never browser, Git, screenshots, logs, receipts, or client-visible status payloads. |

The live Gemini gateway already demonstrates the correct General chat pattern: a fixed non-custodial system policy plus the current typed prompt, bounded output, safety settings, timeout, and normalized receipt. It explicitly rejects the claim that it can see Works, testimony, player state, uploads, Registry records, or prior context unless another separately authorized boundary supplies them. [S1]

## Image-generation convergence: the next safe design

The brief correctly identifies that an image result is not a saved creator asset merely because a provider returned it. The next approved image slice should therefore use this sequence:

1. A creator starts an explicit image request in Nexus and chooses text-only creation or a creator-approved Core asset reference.
2. Nexus requests a scoped, authenticated reference from Living Nexus Core. The browser does not submit an arbitrary result URL as proof of custody.
3. Nexus invokes the approved image adapter and records an `IMAGE_GENERATION` receipt. Every output is visibly labelled **AI-generated interpretation**.
4. Nexus submits the generated bytes or a short-lived server-to-server transfer to a Core-owned asset intake endpoint. Core validates size/type/ownership, stores bytes under a stable private key, and returns an owned asset identifier.
5. Only after Core storage confirms success may Nexus show **Saved privately**. Failure remains a recoverable receipt state, not a silent orphan.
6. Registration, Work attachment, WID issuance, provenance, public sharing, and Quiver association each remain separate explicit creator actions.

This design repairs the brief’s noted custody gap without making Nexus a second canonical storage system or expanding PNA authority.

## Persistent history and DeepSeek

The current Nexus store already supports execution records; a future authenticated conversation-history slice should define retention, export, deletion, owner isolation, and execution-to-message linking before displaying durable history. The historical transcript must distinguish creator-authored text, provider output, explicit Witness references, and system receipt data. It may not represent AI output as creator testimony.

DeepSeek remains a future provider adapter, not another application. It must implement the same normalized capability/receipt contract and pass the same server-only secret, scope, rate, safety, retention, and explicit-context gates before it can be selectable.

## Implementation sequence

| Sequence | Implementation | Required gate |
|---:|---|---|
| 1 | Add a Living Nexus **Open Nexus** entry that launches the existing signed handoff. | UI-only approval; no new provider scope. |
| 2 | Define creator-private Core asset intake/reference APIs for image tasks, including byte-level access checks and stable asset IDs. | Storage/custody design approval. |
| 3 | Enable Gemini image generation through the existing Nexus provider gateway, with text-only first and strict receipt/cost limits. | Separate image-provider approval and bounded live test. |
| 4 | Add server-to-server private asset save confirmation and recoverable failure states. | Core/Nexus storage integration approval. |
| 5 | Add authenticated Nexus history with owner isolation, export/retention controls, and receipt linkage. | Data-retention/privacy approval. |
| 6 | Add a DeepSeek adapter only after Gemini text/image behavior and costs are measured. | Separate provider approval. |

## Acceptance gates

No convergence slice is complete until it proves that the same signed-in user can access their permitted conversation or asset state while another user cannot; actual provider/model values are visible without exposing credentials; image byte custody is verified at the storage layer; generated assets remain private and unregistered by default; player/discovery never auto-attach AI context; and provider errors do not masquerade as saved or published material.

## Explicitly rejected paths

The platform must not install a second LibreChat/Open WebUI-style product for this slice, create a parallel direct-Gemini browser client, reuse PNA/Quiver URLs as unsafeguarded provider inputs, or silently turn the main site’s `AIChatBox` presentation component into a competing production AI authority. The existing component may be reused only for a bounded entry/preview surface if it consumes the same Nexus contracts rather than creating its own provider execution path.

## Evidence sources

[S1]: [Nexus Gemini provider gateway — `nexus-service/src/provider-gateway.mjs`](../../../nexus-service/src/provider-gateway.mjs)

[S2]: [Doc-supplied Gemini-first implementation brief — `pasted_content_2.txt`](../../../upload/pasted_content_2.txt)

[S3]: [PNA retirement and avatar successor preservation ADR](ADR-PNA-RETIREMENT-AND-AVATAR-SUCCESSOR.md)
