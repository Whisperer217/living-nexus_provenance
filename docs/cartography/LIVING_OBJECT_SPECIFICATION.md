# D. Living Object Specification

> **Status:** Canonical display target derived from directive and existing doctrine. It is not implemented by this document.

## Object Model

```text
Living Object
├── Identity — who is represented and under what declared identity?
├── Manifestation — what artifact or expression is present?
├── Intent — why does the creator say it exists?
├── Declaration — what does the creator state about contribution and rights?
├── HAAI — what human and tool roles are disclosed?
├── Provenance — what system, creator, witness, or external records describe its path?
├── Witness — what was recorded or affirmed, by whom, and when?
├── Relationships — what collection, guide, version, contributor, or derivative relation exists?
├── Versions — what changed, what remains, and what supersedes what?
├── Rights and License — what permissions are stated, not inferred?
├── Support — how can a visitor reciprocally sustain the creator?
├── Archive — how is export, retention, and continuity represented?
└── Verification — what can a normal person and an expert independently check?
```

## Display Modes

| Mode | Audience | Required function |
|---|---|---|
| Human View | Listener, reader, supporter, creator | Plain-language story, status, support path, and visible uncertainty. |
| Expert View | Researcher, witness, developer, counsel | Identifiers, hashes, signatures, timestamps, versions, evidence source, and limitations. |
| Machine-readable View | Validator, export consumer, future registry | Stable identifiers, structured declarations, relationships, provenance event references, and version/supersession links. |

## Interaction Capabilities

`PLAY`, `READ`, `WATCH`, `INSPECT`, `WITNESS`, `SUPPORT`, `LICENSE`, `DOWNLOAD`, `COLLECT`, `RELATE`, `DERIVE`, `SHARE`, `VERIFY`, and `ARCHIVE` are **potential object capabilities**. Each must be permission-gated, attributed, logged where consequential, and distinguished from a statement of legal right.

## Display Rules

1. Present creator declarations as declarations.
2. Present platform-recorded events as technical records.
3. Present independent verification instructions with scope and failure conditions.
4. Never label a WID as a copyright registration or a declaration as an adjudication.
5. Where AI is involved, show the declared role, any system-recorded mechanism, and the boundary between both.
6. Preserve prior versions and supersession relationships instead of silently replacing lineage.

