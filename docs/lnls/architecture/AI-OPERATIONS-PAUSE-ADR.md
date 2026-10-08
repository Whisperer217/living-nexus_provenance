# AI Operations Pause ADR

- **Status:** Implemented
- **Date:** 2026-10-07
- **Decision:** Pause every new model-assisted operation across Living Nexus and present PNA as an explicitly non-operational work-in-progress service.

## Context

Living Nexus currently includes several model-assisted paths: PNA correspondence, visual proposals, image creation, voice transcription, caption and prompt generation, discovery interpretation, profile language, metadata suggestions, and the AI music-video loop. The platform must not imply that these actions are available while the PNA service and broader AI posture are under review.

This decision is an **operations pause**, not a provenance rewrite. Existing Work records, WIDs, creator testimony, AI-participation disclosures, generated assets already stored by a creator, and private PNA threads remain intact and readable.

## Decision

1. A shared, compile-time `AI_OPERATIONS_ENABLED = false` contract is the single source of truth.
2. The three provider adapters—LLM invocation, image generation, and transcription—reject before creating any external request.
3. The AI music-video service and its worker follow-on return without changing a Work to failed state while the pause is active.
4. PNA prevents message/visual submission in every current entry surface—the focused workspace, command palette, canonical composer, legacy drawer, inspection rail, and Stewardship settings. A persistent **WORK IN PROGRESS** perimeter and shared status notice make the pause explicit. Private thread, Context Envelope, Artifact review, and Stewardship settings remain inspectable; profile preferences are preserved but cannot be changed to reactivate model operations; no selected context is forwarded to a model.
5. Non-AI registry operations remain available: registration, upload, disclosure, WID verification, creator records, relationship tools, support, Signals, correspondence, playback, and archive access.

## Architecture Alignment

| Layer | Effect |
|---|---|
| Identity | Preserves creator attribution, historic disclosures, and WID identity unchanged. |
| Manifestation | Does not alter published Works or stored media. |
| Relationship | Keeps creator correspondence and Signals independent of PNA model use. |
| Registry | Avoids silent mutation of provenance or declaration records. |
| Stewardship | Stops external model processing until review is complete and makes the state visible. |
| Legacy | Retains private threads and prior records without representing a paused tool as available. |

## Alternatives Rejected

- **Hide only PNA:** insufficient because other server routes and background work could still call model providers.
- **Remove historical AI disclosure and generated artifacts:** would erase evidence and weaken creator provenance.
- **Disable only UI buttons:** insufficient because direct tRPC requests and background workers would remain possible.

## Scope and Rollback

No schema or migration change is required. Re-enabling requires an explicit owner decision, a review of every provider adapter and automated worker, targeted validation, and then changing the single shared flag with a new checkpoint. No deployment action is included in this decision.

## Validation Plan

- Provider adapter tests demonstrate rejection before `fetch`.
- Transcription returns an explicit paused-state result without downloading creator media.
- Source contracts cover PNA client gating and the worker’s non-failure skip.
- TypeScript, focused tests, production build, diff validation, and full regression are run before checkpointing.
- The 2026-10-07 follow-up audit also scans the checkpoint for raw provider endpoints outside the guarded adapters and visually verifies desktop and mobile PNA workspace and Stewardship surfaces.
