# ADR-016 — Music-Draft Agentic Foundation

**Status:** Approved by creator direction  
**Date:** 2026-08-12  
**Doctrine:** `docs/AUTHORIZED_AGENT_DOCTRINE.md`; `ARCHITECTURAL_LAWS.md`, Law V  
**Scope:** Commission → Capability Authority → Agent Ledger for owned music drafts only

## Decision

Living Nexus will introduce a narrowly scoped agentic foundation for a Creator Domain. The first slice permits a creator to enable or disable the **Music Draft** capability for their named Personal Nexus Agent, issue a Commission bound to exactly one owned audio work in `Draft` status, and write a consequential, append-only Agent Ledger event for that commission or a subsequently permitted draft action.

The slice does **not** execute model inference, use an external Bridge, publish, seal, register a WID, distribute, alter a public work, or coordinate multiple agents. It does not turn a Commission into a standing delegation.

## Data Contracts

| Primitive | Minimum contract | Boundary |
|---|---|---|
| **Capability Authority** | Creator, Agent, capability `music_draft`, enabled flag, timestamps | Only the creator can toggle it. It grants no publish or seal authority. |
| **Commission** | Stable identifier, Creator, Agent, owned audio Draft song, direction, status, timestamps | One song; one Creator Domain; Draft-only. It can be revoked or completed, but its issuance remains ledgered. |
| **Agent Ledger** | Stable hash identifier, Creator, Agent, Commission, song, capability, action, canonical payload, timestamp | Insert-only. No application mutation or deletion endpoint. Each row records a consequential authorization or action. |

## Authority Flow

```text
Creator enables Music Draft capability
  → Creator issues one Commission for one owned audio Draft
  → Capability and Draft ownership are re-checked
  → Commission issuance is appended to Agent Ledger
  → future permitted Draft-only action appends its own Agent Ledger entry
```

## Enforcement Rules

1. A target song must have `userId === creatorId`, `contentType === "audio"`, `status === "Draft"`, and `isPublic === false`.
2. No route in this slice accepts `Published`, `Unlisted`, `Deleted`, non-audio, or foreign-owned works.
3. The capability authority is explicit and may be turned off by the creator. Capability disablement blocks new Commissions and new actions; it does not erase existing ledger evidence.
4. Commission status is operational state. Agent Ledger entries and recorded Chain-of-Record facts remain append-only under Law V; access may be restricted and later records may supersede earlier records.
5. The Agent Ledger is distinct from `provenanceEvents`. It records authorization and action accountability without changing the existing WID/provenance event semantics.
6. Publishing, sealing, external Bridges, model selection, billing, and any WID creation remain out of scope.

## Affected Surfaces

| Surface | Change |
|---|---|
| `drizzle/schema.ts` | Add authority, commission, and append-only ledger tables. |
| `drizzle/` | Additive migration with insert-only Agent Ledger protection. |
| `server/db/` | Creator-scoped helpers for capability authority, commission issuance, and ledger append/list. |
| `server/routers/agents.ts` | Protected creator procedures for capability state, Commission issuance, and ledger review. |
| `server/routers/index.ts` | No new namespace required; retain the existing `agents` namespace. |
| `server/tests/` | Ownership, Draft-only, disabled-capability, append-only, and regression coverage. |

## Alternatives Rejected

| Alternative | Rejection reason |
|---|---|
| Add agent actions directly to `provenanceEvents` | It would overload the existing WID-oriented event vocabulary and make authorization history ambiguous. |
| Default capability authority to enabled | It conflicts with granted authority and risks silent expansion. |
| Support all work types now | It violates the music-first beachhead and broadens authority before the first boundary is proven. |
| Add publish or seal permission now | The doctrine explicitly forbids silent publish/seal; those require a later, confirmation-centered slice. |

## Risk and Rollback

The migration is additive. New tables are isolated from existing music and provenance data. Rollback disables the new procedures and hides their UI; it does not delete Agent Ledger records. The database-level insert-only guard remains intact so Law V evidence is never removed.

## Validation

The implementation must prove: only the owner can manage authority; a Commission requires enabled authority and one owned audio Draft; a foreign, public, published, or non-audio work is rejected; every Commission issuance produces one immutable ledger entry; and no endpoint updates or deletes the Agent Ledger.
