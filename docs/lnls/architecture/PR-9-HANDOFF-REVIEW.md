# PR #9 Handoff Review — Cloud Development Setup Instructions

**Review status:** Complete; no patch applied, merged, or deployed  
**Archive reviewed:** `Living-Nexus-PR-9-handoff.zip`  
**GitHub PR:** [Whisperer217/living-nexus_provenance#9](https://github.com/Whisperer217/living-nexus_provenance/pull/9)  
**PR head:** `d0ab548782978be3828ebb8cd012c1468195c572`  
**Review date:** 2026-09-13

## Scope and integrity

The supplied archive is a four-file portable handoff containing a patch, an mbox, a handoff note, and a manifest. The manifest identifies a single documentation change: creation of root `AGENTS.md`. The supplied patch and mbox SHA-256 values both matched their manifest values exactly.

| Item | Verified value |
|---|---|
| Patch SHA-256 | `e61f6298a1b7a7ee7da948330bfb875f3f0cc265c66b24ff3a0b74b4019c4afb` |
| Mbox SHA-256 | `cb7ee07f3c1c972a4ab8d281ff1cd9af824027b9b8ec62cd71780e42f5e25a6b` |
| Changed files | `AGENTS.md` only |
| PR base | `8c7f7639916521c87a698f0f2819b374d5101376` |
| Current managed source | `3df89a7ed356caa5216dab2f4a6b7eaa8ac2c697` |
| Non-destructive merge-tree result | No conflict markers |

The PR is open and draft. Its head targets an older `cursor/theme-persist-typography-0e97` base, not the current managed source head. The GitHub merge state reports clean, but that is not an authorization to merge.

## What PR #9 contributes

PR #9 adds an older Cursor Cloud-oriented development guide. It documents a local MySQL/Redis/Docker workflow, environment-variable examples, expected local limitations, and suggested test commands. It does not add runtime code, schema, migrations, credentials, deployment configuration, or production behavior.

## Compatibility assessment

The file could merge mechanically because it is new at the current repository root. However, it should **not be copied verbatim** into the managed Living Nexus project.

| PR #9 instruction | Current managed project reality | Review finding |
|---|---|---|
| Use `pnpm dev` | Current project uses `NODE_ENV=development tsx watch server/_core/index.ts`. | Broadly compatible. |
| Use a local Docker MySQL/Redis setup | Managed Living Nexus has a platform-managed database/service environment. | Not appropriate as canonical repository guidance. |
| Use `pnpm exec drizzle-kit push --force` on a fresh database | Current scripts define `db:push` as `drizzle-kit generate && drizzle-kit migrate`; managed schema changes must go through reviewed migrations and the managed SQL workflow. | **Do not adopt.** A force schema push risks divergence and bypasses migration review. |
| Local `.env` with placeholder OAuth/Forge secrets | Managed project secrets are platform-controlled and must not be documented as substitutable production values. | Keep only in a clearly isolated local-contributor guide, never as active deployment guidance. |
| Approximate test count and architecture details from August 2026 | Current source, tests, registry, PNA audit, Core Ingestion, and separate Nexus service have changed materially. | Stale; requires rewrite rather than merge. |

## Architecture boundary

The PR’s proposed root `AGENTS.md` concerns a generic local development environment. It does not address the current separate Nexus service, server-only Gemini key, persistent TEST Registry discovery credential, short-lived assertion handoff, PNA preservation, Core Ingestion control plane, or managed deployment rules. Adopting it without reconciliation would create contradictory instructions beside the current cloud service notes and managed-project operating rules.

> The correct outcome is to preserve PR #9 as historical handoff evidence while producing a **current managed-contributor guide** that distinguishes local experimentation from managed schema, secret, Registry, provider, and deployment operations.

## Recommendation

Do **not merge PR #9 as-is**. Its useful contribution is the intent to document cloud/local development onboarding. The safe next step is one of the following:

| Choice | Effect |
|---|---|
| **A. Preserve only** | Leave PR #9 draft/open and retain this review as the reconciliation record. No source change. |
| **B. Replace with current guide** | Create a new, reviewed `AGENTS.md` or contributor guide tailored to the managed Living Nexus project, explicitly prohibiting destructive schema pushes and browser/provider secrets. Then close PR #9 as superseded. |
| **C. Merge documentation only** | Cherry-pick/merge the existing file with a full human-reviewed rewrite in the same approved change. This is not recommended because its stale and hazardous lines are the main content. |

Choice **B** is recommended. It gives future contributors the useful setup orientation while preserving the current custody and deployment architecture.

## Approval gate

No action should be taken on PR #9 until Doc chooses A, B, or C. This review does not approve a merge, a force schema push, Docker installation, environment replacement, credential handling, or deployment.
