# ADR-025: Model-Agnostic PNA Ingestion Commission

**Status:** Proposed — requires Keeper approval before implementation.  
**Date:** 2026-08-14. **Author:** Manus AI.  
**Scope:** A model-agnostic, database-backed PNA workflow for creator file ingestion and sequential, creator-confirmed Draft preparation. This is a design record only. No runtime behavior, record, file, public registry state, schema, configuration, model connection, or entitlement has changed.

> **Decision:** PNA will be an orchestration layer rather than a model product. A selected local or hosted model may reason over creator-approved, typed context, but deterministic Living Nexus services retain control of files, database retrieval, metadata inspection, hashes, WIDs, provenance, Quiver, Draft records, synchronization, and publication. Every consequential action requires its own explicit creator confirmation.

## 1. What the Keeper asked for

The desired user experience is not a generic chat box. A creator should be able to attach a file and say:

> “PNA, ingest this as a private music Draft. Extract what you can, show me the proposed record, and ask before every consequential step.”

PNA should then retrieve authoritative information from the Living Nexus database and Studio services, inspect the supplied file through deterministic application services, prepare a sequential proposal, and ask the creator whether to carry out each next operation. The creator must not need an engineering command or an opaque prompt format.

The design must remain **model-agnostic**. A local model, a hosted model, or a future reasoning Bridge may be selected without changing the database schema, WID semantics, registry truth, provenance, confirmation rules, or creator authority. Models never receive database credentials and never write to the database directly.

## 2. Current-state finding

The present PNA is capable of hosted-model chat with personas and optional image URLs, and it has an intentionally narrow governed `music_draft` capability/Commission/Agent Ledger foundation. It does not yet have a tool gateway for typed database retrieval, file ingestion, staged proposals, provider selection, confirmation artifacts, or registry mutation through a sequential workflow.[1] [2]

The current model wrapper is also provider-bound in practice: `invokeLLM()` uses a fixed hosted default (`gemini-2.5-flash`), even though it accepts messages, structured output, and tool definitions.[3] The current Music Environment separately implements useful browser-side intake behavior—audio metadata assistance, file hashing, WID construction, visual generation/remix, waveform generation, and an explicit Draft/Published choice—but it uploads selected files to the managed `/api/upload-file` route before saving the song record.[4] This is valuable capability to extract, not a complete PNA ingestion workflow.

| Existing capability | Present condition | Design disposition |
|---|---|---|
| PNA conversation | Hosted model request with persona/history/image references. | Retain UI identity, but route all facts through typed tools and structured proposals. |
| Agent governance | Creator-scoped music-Draft capability, Commission, and append-only Agent Ledger. | Extend by a distinct `pna_ingestion` capability and action vocabulary; do not broaden existing authority silently. |
| Music registration | Browser audio intake, metadata assistance, WID/signature, waveform, visual lineage, explicit Draft/Published. | Extract deterministic helpers and reuse their contracts. |
| File upload | Authenticated streaming route to managed S3. | Retain for approved public/web flow; Local-first implementation stores/imports locally first under ADR-024. |
| Quiver | Creator-owned private image records and an explicit public-gallery toggle. | Retain private-by-default asset lineage; add proposal-mediated Attach to Creation rather than automatic publication. |
| Context panel | Typed, read-only references and deliberate open/verify/play actions. | Extend its vocabulary later with a Commission, local Creation, Manifestation, asset, and sync state. |

## 3. Architecture: models reason; services verify and act

```text
Creator
   │ attaches file / speaks naturally
   ▼
PNA Commission UI
   │ intent + explicit confirmation state
   ▼
PNA Orchestrator ───────────────► Confirmation Service
   │                                      │ creator approval artifact
   │                                      ▼
   ├──► Model Adapter (local OR hosted) ─► bounded tool requests
   │                                      │
   └──► Tool Gateway ────────────────────┤
          │                               │
          ├── Registry Retrieval Service  │
          ├── Studio / Quiver / Guide     │
          ├── File Inspection Service     │
          ├── Hash / WID / Provenance     │
          └── Draft / Sync / Publish      │
                  │                       │
                  └──► Living Nexus database + storage
```

| Layer | Responsibilities | Must never do |
|---|---|---|
| **Model Adapter** | Normalize selected model capabilities, message format, structured output, tool-call syntax, and result/error semantics. | Connect to database, sign a WID, issue a Commission, upload/publish content, or interpret a model answer as authorization. |
| **PNA Orchestrator** | Translate creator language into a declared Commission and permitted tool sequence; maintain staged state; compose final explanatory output. | Convert ambiguous language into a consequential mutation; bypass confirmation. |
| **Tool Gateway** | Enforce creator/admin scope; execute typed read tools; validate structured arguments; issue proposed-action payloads. | Expose raw SQL, database credentials, unlimited record dumps, or unrestricted write tools. |
| **Deterministic services** | Inspect file, extract technical metadata, calculate SHA-256, create/sign WID payloads, store media, create Draft, append provenance/ledger events, and return verified IDs. | Treat model inference as a verified technical fact or creator declaration. |
| **Confirmation Service** | Bind a proposed action to actor, object, scope, payload hash, expiration, and one permitted operation. | Reuse approval after proposal/material data changes or make approval implicit. |

## 4. Model-agnostic adapter contract

The selected model is a replaceable **Reasoning Adapter**. A model choice changes the reasoning engine, availability, privacy posture, and cost, but not the business/registry contract. The PNA UI should display the selected adapter’s identity, execution location, tool-support status, data-scope warning, and whether its use is local or a billed hosted Bridge.

```ts
type ModelExecutionLocation = "local" | "hosted";

interface PnaModelAdapter {
  adapterId: string;                 // e.g., local-openai-compatible, hosted-forge
  executionLocation: ModelExecutionLocation;
  displayName: string;
  capabilities: {
    structuredOutput: boolean;
    toolCalls: boolean;
    vision: boolean;
    streaming: boolean;
  };
  complete(request: PnaModelRequest): Promise<PnaModelResult>;
}

interface PnaModelRequest {
  systemPolicy: string;
  creatorPrompt: string;
  approvedContext: PnaContextBundle;
  tools: PnaToolDefinition[];
  responseSchema: PnaResponseSchema;
}
```

The hosted adapter may use the existing project-side model helper only after it stops hard-coding a model and starts selecting from a provider-neutral capability declaration. The current helper already supports model calls, structured output, and tool definitions; the future adapter should make the requested model explicit, validate availability server-side, and preserve the wrapper’s credential boundary.[3] [5]

A local adapter should speak to a creator-selected local model runtime only through the local application/companion service defined in ADR-024. The public web server must never assume that a local runtime exists, and a local model must never receive public database credentials. If a selected model cannot support native tool calls, the adapter may use strictly validated structured-intent responses to request a tool; it must not fall back to executing prose.

| Adapter property | Local model adapter | Hosted model adapter |
|---|---|---|
| Execution | Creator computer/local companion. | Managed server-side Reasoning Bridge. |
| Model choice | Creator-controlled compatible local runtime and model. | Administrator-approved provider/model catalog. |
| Database access | None; receives only Tool Gateway responses. | None; receives only Tool Gateway responses. |
| Files | Local file inspection results and explicitly permitted thumbnails/text summaries. | Only creator-approved derived context or permitted asset references; never raw private files by default. |
| Costs | Creator hardware/runtime costs. | Explicit bridge-cost disclosure before selection/use if applicable. |
| Failure mode | Continue local Draft work; queue public operation. | Offer retry, model change, or continue without AI assistance. |

## 5. The PNA Ingestion Commission

A **PNA Ingestion Commission** is a bounded, creator-issued instruction to inspect and prepare one attached asset. It is not an open-ended agent mandate and it does not imply publication.

```text
Creator intent
  └── Ingestion Commission
        ├── approved file reference + immutable content hash
        ├── selected model adapter + declared data scope
        ├── tool invocation log
        ├── proposed metadata and provenance summary
        ├── confirmation artifacts per consequential action
        ├── append-only Agent/Provenance events
        └── final private/public outcome references
```

### Commission state machine

| State | Meaning | Mutation permitted? |
|---|---|---|
| `awaiting_file` | Creator has not attached a file. | No. |
| `inspecting` | Deterministic services are calculating technical facts; model may organize suggestions. | Temporary protected inspection record only. |
| `proposal_ready` | PNA presents a typed private-Draft proposal, confidence/disclosure, and source distinctions. | No durable Creation/Draft yet. |
| `awaiting_confirm_save` | Creator has reviewed the proposed private Draft. | Only the exact displayed save may proceed after confirmation. |
| `private_draft_saved` | Creator-approved Draft and local/protected asset references exist. | Further actions need separate confirmation. |
| `awaiting_confirm_attach` | PNA has proposed a Quiver/visual/Guide attachment. | Only the exact attachment may proceed after confirmation. |
| `awaiting_confirm_register` | PNA has prepared WID/provenance registration payload. | Only local or web registration selected by the creator may proceed. |
| `registered_private` | Local/protected record exists with WID/provenance evidence. | Public sync/publish remains unavailable until separately approved. |
| `awaiting_confirm_sync` | PNA displays exact Local-to-Public payload. | Only explicit sync/manifest action may proceed. |
| `awaiting_confirm_publish` | Public visibility conditions are displayed. | Only explicit public publication may proceed. |
| `completed`, `cancelled`, `failed` | Terminal state, with append-oriented audit result. | No. |

## 6. Tool contracts: authoritative database access without raw database exposure

The Agent must retrieve registry facts from application services, not from the browser and not by direct SQL. Each tool has a narrow input/output schema, access classification, pagination/size limit, and immutable audit record.

| Tool | Scope | Read or proposed action | Example verified result |
|---|---|---|---|
| `get_creator_context` | Current creator; broader authorized view for Keeper/admin. | Read | Profile, rights settings, active Draft count, selected Guide/avatar context. |
| `search_music_registry` | Public records plus creator-owned Drafts. | Read | Song IDs, title, creator, status, WID presence, limited metadata. |
| `get_creation_record` | Creator-owned or public authorized record. | Read | Typed song/Creation, Manifestations, metadata snapshots, public projection. |
| `get_provenance_chain` | Authorized WID/record. | Read | WID, hashes, append-oriented events, witness/verification projection. |
| `get_quiver_candidates` | Current creator only. | Read | Private asset IDs, prompts, lineage, usage/attachment state; no bulk raw prompt export. |
| `get_guides_and_avatars` | Current creator plus published representation catalog. | Read | Guide identity, WID, published state, authorized avatar representation. |
| `inspect_attached_file` | Attached file owned by current Commission. | Read | MIME, size, checksum, embedded metadata, duration/sample technical facts, optional cover extraction. |
| `prepare_draft_proposal` | Current Commission only. | Proposed action | Schema-valid metadata, participation questions, recommended next steps, and source labels. |
| `prepare_wid_payload` | Current creator/Commission only. | Proposed action | Canonical payload/hash/key requirements before a WID operation. |
| `prepare_quiver_attachment` | Current creator/Commission only. | Proposed action | Exact image/Creation/relationship change. |
| `prepare_public_manifestation` | Current creator/Commission only. | Proposed action | Exact public payload, visibility, assets, warnings, and gates. |

Only deterministic services may execute `save_private_draft`, `attach_quiver_asset`, `register_private_wid`, `sync_public_manifestation`, and `publish_public_manifestation`. These are **not** model-callable mutation tools. The model can request preparation of a proposal; PNA presents the proposal; the creator confirms; the server validates the confirmation artifact; then the deterministic service acts.

## 7. Sequential confirmation contract

Every confirmation becomes a short-lived, single-use `PnaConfirmation` record:

| Field | Purpose |
|---|---|
| `confirmationId` | Single-use, opaque confirmation identifier. |
| `commissionId` / `creatorId` | Binds the action to the person and bounded request. |
| `actionType` | `save_private_draft`, `attach_asset`, `register_private_wid`, `sync_public`, or `publish_public`. |
| `proposalCanonical` / `proposalHash` | Exact reviewed action, object IDs, asset hashes, scope, and visible labels. |
| `presentedAt` / `expiresAt` / `confirmedAt` | Prevents stale or replayed approval. |
| `confirmedBy` | Creator identity; preserves an attributable consent event. |
| `resultEventId` | Links completed outcome to Agent Ledger/provenance event. |

PNA must phrase uncertainty correctly. Technical facts are labeled as **measured** (for example, file hash or duration). Registry facts are labeled as **retrieved**. Text supplied by a creator is labeled as a **creator declaration**. Model-generated candidates are labeled as **AI suggestions**. Neither a model summary nor a metadata extraction may be presented as legal or ownership determination.

## 8. WID, provenance, and data flow

The file pipeline is deterministic and works regardless of selected model:

1. The creator attaches a file to a bounded Commission.
2. `inspect_attached_file` computes file hash and technical metadata. The model may receive only this inspected representation unless the creator authorizes more.
3. PNA retrieves creator-owned registry context and asks factual gaps: title, participation, disclosure, rights/declaration fields, and intent.
4. The model returns a schema-validated **proposal**, not a record mutation.
5. The creator confirms `save_private_draft`; the deterministic service stores the Draft/asset references and appends an event.
6. PNA prepares the WID payload. The creator separately confirms registration; the deterministic WID service creates the signed record and appends provenance.
7. Quiver/Guide/avatar links are always distinct proposals and confirmations.
8. Any Local-to-Public sync or public publication uses ADR-024’s scope, outbox/inbox, idempotency, and conflict rules; it cannot be implied by a previous private-Draft approval.[6]

## 9. Required additive data model

No current table should be repurposed as an implicit Commission or consent store. The approved implementation must add isolated, additive tables or local equivalents:

| Entity | Minimum fields | Purpose |
|---|---|---|
| `pna_model_adapters` | `adapterId`, execution location, capability declaration, availability state, display metadata; **no provider secrets**. | Registers compatible local/hosted adapter types. |
| `pna_ingestion_commissions` | Commission ID, creator, agent, attached asset ref/hash, selected adapter, state, declared data scope, timestamps. | Bounded sequential workflow. |
| `pna_tool_invocations` | Commission, tool name, sanitized args/result hash, authorization outcome, timestamps. | Audit and troubleshooting without persisting raw private content unnecessarily. |
| `pna_action_proposals` | Commission, action type, canonical proposal/hash, source labels, expiry, status. | Exact reviewable change statement. |
| `pna_confirmations` | Single-use confirmation ID, proposal hash, creator, expiry, result link. | Enforces explicit step-by-step consent. |
| `pna_ingestion_events` | Append-only normalized status/failure/actor event. | Operational history distinct from WID/provenance truth. |

The existing Agent Ledger should retain its governed authority evidence. It may record capability/Commission state changes and confirmed consequential actions, but PNA operational events must not be mistaken for or overwrite WID provenance.[2]

## 10. Minimal first implementation slice

The first implementation should not attempt local-runtime support, all media, public synchronization, or publication in one release. The disciplined web-platform beachhead is:

| Included | Explicitly excluded |
|---|---|
| Creator uploads one audio file through the existing authenticated upload boundary. | Automatic public publishing or public sync. |
| PNA creates an Ingestion Commission and displays file/technical inspection facts. | Direct raw database access by the model. |
| Tool Gateway retrieves the current creator, matching creator-owned Drafts, public WID collision candidates, and current Quiver candidates. | Broad raw database dumps, cross-creator private search, or unbounded Agent memory. |
| Selected **hosted** adapter returns a strict structured Draft proposal. | Local model execution; it follows after the adapter interface is proven. |
| Creator individually confirms save as private web Draft, attachment of an existing Quiver item, and WID registration. | Sync or publication; they remain separate later approvals. |
| Agent Ledger/proposal/confirmation/test evidence is recorded. | Agent self-approval or unchecked bulk actions. |

This web beachhead proves the contract. The first local adapter then reuses its Model Adapter, Tool Gateway, Commission, confirmation, and response schemas through the Local Companion described in ADR-024. The only difference is where the model and private Draft/file reside, not how authorization or registry truth works.

## 11. Test and rollback requirements

| Test category | Required proof |
|---|---|
| Authorization | A creator cannot inspect another creator’s private Drafts, Quiver assets, Guides, attachments, proposals, confirmations, or Commission history. |
| Provider neutrality | A fixture adapter and hosted adapter produce equivalent schema-valid proposal outcomes; unsupported tool-calling models cannot trigger mutation paths. |
| Data containment | Model request payloads contain only approved/typed context; logs do not contain raw secrets, database credentials, or unapproved file bytes. |
| Confirmation | Each action fails without a valid matching, unexpired, single-use confirmation. Replays and proposal-hash changes fail. |
| File/WID integrity | Hashes are stable; WID payload derives from canonical inspected data; model outputs cannot alter a hash/signature. |
| Sequential state | Out-of-order commands are rejected; cancel stops the Commission; retry resumes only safe stages. |
| Registry safety | Private save does not publish; no existing public song, WID, Quiver, Guide, or avatar record is altered by proposal generation. |
| Regression | Existing Register, Explore, PNA, Quiver, WID verification, player, and music-Draft Commission tests remain green. |

Rollback consists of disabling the `pna_ingestion` capability/adapter availability while retaining append-only audit records. Because the first slice is additive and separate from publication, it can be disabled without touching existing public works, WIDs, or the baseline registration flow.

## 12. Decisions required before implementation

1. Approve `pna_ingestion` as a new, separate capability beside the current `music_draft` capability.
2. Approve the first slice as **private web Draft only**, with public sync/publication explicitly excluded.
3. Confirm whether an initial local-model adapter must ship in the first slice or whether the first slice proves the adapter contract with a hosted adapter and a tested local-adapter simulator.
4. Confirm the allowed first-slice database retrieval scope: current creator plus public registry only, or Keeper/admin cross-creator private retrieval with enhanced audit/role restrictions.
5. Approve the visible command phrase and UX: **“Ingest as private Draft”** followed by separate confirmation cards for save, attach, register, sync, and publish.

## References

[1]: [`server/routers/keeper.ts`](../server/routers/keeper.ts) — current protected Keeper/PNA chat procedure, persona/history/image input, and hosted `invokeLLM` call.

[2]: [`server/routers/agents.ts`](../server/routers/agents.ts) and [`docs/ADR-016-MUSIC-DRAFT-AGENTIC-FOUNDATION.md`](ADR-016-MUSIC-DRAFT-AGENTIC-FOUNDATION.md) — current music-Draft capability, Commission, and Agent Ledger boundaries.

[3]: [`server/_core/llm.ts`](../server/_core/llm.ts) — current model wrapper, structured-output/tool fields, and fixed hosted default model.

[4]: [`client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx`](../client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx) and [`server/routes/uploadRoute.ts`](../server/routes/uploadRoute.ts) — current browser audio/WID/metadata workflow and authenticated streaming upload route.

[5]: [`/home/ubuntu/skills/builtin-llm-models/SKILL.md`](../../skills/builtin-llm-models/SKILL.md) — live model catalog, server-side selection, structured output, tool-call, and provider-specific request-shape guidance.

[6]: [`docs/ADR-024-LOCAL-FIRST-CREATIVE-WORKSPACE.md`](ADR-024-LOCAL-FIRST-CREATIVE-WORKSPACE.md) — local/public database authority, explicit sync, outbox/inbox, and public-projection requirements.
