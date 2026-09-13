# Living Nexus — Managed Contributor Guide

**Status:** Canonical managed-project guidance  
**Supersedes:** Draft GitHub PR #9 / `d0ab548782978be3828ebb8cd012c1468195c572`  
**Applies to:** `/home/ubuntu/living-nexus`

## Purpose

Living Nexus is a managed full-stack project with a shared canonical source, managed database, managed secrets, and connected GitHub source. This guide distinguishes a bounded local experiment from changes that can affect creator records, assets, provenance, credentials, or production behavior.

> **Do not create a second authority.** Living Nexus Core owns identity, Works, WIDs, provenance, registration, publication, creator assets, and the canonical player. The separate Nexus service owns its signed-session AI workspace and must consume Core only through approved boundaries.

## Source and collaboration

The current working tree is shared. Before editing, inspect current files and preserve changes from other sessions. Do not use `git reset --hard`, force-push, ad-hoc branch rewrites, or manual checkout recovery. Use managed checkpoints for recovery and inspect conflicts before resolving them.

Use `pnpm` from this project root. The supported checks are:

```bash
pnpm check
pnpm test
pnpm build
pnpm refine
```

Run the smallest relevant test set first, then expand only when the change warrants it. A known unrelated CinematicSplash CSS-marker test has historically required separate diagnosis; do not alter cinematic behavior merely to silence an unrelated assertion.

## Database and migrations

Schema is authoritative in `drizzle/schema.ts`; committed migration files are historical evidence. For an approved schema change, update the schema, generate and inspect the migration, apply reviewed SQL through the managed database workflow, and verify only the intended result.

**Never run `drizzle-kit push --force` against a managed, staging, or production database.** Do not use an unreviewed schema push to repair migration drift. Do not destroy, rewrite, or seed creator, Work, WID, provenance, payment, PNA, avatar, or entitlement records.

## Secrets and external services

Do not create or commit `.env` files, placeholder production credentials, raw database URLs, Registry keys, provider keys, assertions, OAuth tokens, or storage secrets. Managed project secrets must be requested through the project secret workflow and are never copied into browser code, Git history, logs, screenshots, or test fixtures.

The separate Nexus service lives outside this repository. It is a server-only execution workspace with its own root-owned cloud configuration. It may not receive Core database access, browser-visible Registry/provider credentials, private corpus access, or implicit player context.

## Custody invariants

The following distinctions are mandatory:

| Distinction | Rule |
|---|---|
| Public vs. AI-permitted | Public visibility alone does not grant AI context. |
| Playing vs. AI context | Playback never attaches a Work to AI context. |
| Uploading vs. registration | An uploaded asset is not registered or issued a WID. |
| AI inference vs. testimony | AI output is never creator testimony or provenance. |
| Nexus vs. provider | Nexus owns the policy and receipt boundary; a model provider does not. |
| UNSPECIFIED vs. allow | An unknown permission always denies protected context. |

PNA, Keeper portraits, private threads, Quiver assets, marketplace avatars, creator testimony, WIDs, entitlement records, and sealed archives require their own explicit preservation or successor authorization. Do not silently transfer any of them into an AI prompt, a workflow, or a new product.

## UI and product changes

Use the current design tokens and existing components before creating substitutes. Preserve the global PlayerProvider and its single audio ownership. Any Nexus entry is a signed handoff to `ai.livingnexus.org`, not a competing embedded AI runtime. Do not introduce a second audio engine, queue, provenance writer, or provider client in the browser.

For changes to a public route, validate desktop and mobile behavior, keyboard access, empty/error states, and the relevant authority boundary. For player, discovery, Registry, provider, PNA, registration, publication, or payments, add focused regression coverage before broader validation.

## Checkpoint and deployment discipline

Review `todo-yto2wiwz.md` before a checkpoint and mark only completed work as complete. Save a checkpoint after a coherent bounded change. A checkpoint is not a claim that a public deployment succeeded. Publishing remains a separate Keeper decision through the managed interface.

For a separate Nexus service deployment, document the exact source revision, health result, redacted configuration state, rollback path, and whether Registry/provider capabilities are actually enabled. Never claim a live model, Registry scope, or generated asset without testing the deployed boundary.

## PR #9 supersession

Draft PR #9 correctly identified a need for contributor setup guidance, but its August 2026 local Docker, placeholder-secret, and force-schema-push guidance does not match this managed project. This guide replaces that content. Do not merge PR #9’s archived `AGENTS.md` verbatim.
