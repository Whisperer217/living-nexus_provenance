# Living Nexus — Manus Handoff Wireframe

**Created:** 2026-11-05  
**Purpose:** Transfer the essential project context, operating boundaries, current review state, and next actions to another Manus instance.

## 1. Working relationship and user intent

The owner is building Living Nexus as a creator-first provenance platform for music and other creative Works. The platform exists to preserve human testimony, creator attribution, Work IDs (WIDs), disclosure, registry history, and discoverability. The owner values a usable and reproducible Easter-egg philosophy over theoretical perfection, but does not want that simplicity to weaken provenance or permissions.

Use plain English, be direct, and distinguish clearly between implemented, tested, checkpointed, merged, deployed, and published. Do not claim an action occurred unless there is direct evidence.

## 2. Non-negotiable project boundary

Living Nexus application work is separate from independent Jellyfin development.

```text
Living Nexus
└── living-nexus/main or app/main
      ├── application commits
      ├── World Saves
      └── LN releases

Jellyfin integration
└── jellyfin-ln/main
      ├── Jellyfin upstream
      ├── LN plugin/integration
      └── playback patches

Shared integration
└── explicit integration branch only when LN intentionally consumes Jellyfin changes
```

Do not merge mixed Jellyfin lineage into the Living Nexus application branch unless the owner explicitly authorizes that exact merge. Do not deploy, publish, migrate, or modify production data without explicit authorization.

## 3. Architectural doctrine

Follow the Sovereign Cathedral and Living Nexus Architecture Steward principles:

- Creator-first and provenance-first.
- Preserve canonical Work IDs, WIDs, creator attribution, HAAI disclosures, media permissions, and append-only historical evidence.
- Reuse existing routes, procedures, PlayerContext, collection authorities, and design tokens before creating parallel systems.
- A visual refinement must not silently change registry meaning or data authority.
- Every feature must be assessed across Identity, Manifestation, Relationship, Registry, Stewardship, and Legacy.
- Prefer additive, reversible slices with focused regression coverage.
- Keep AI integrations disabled unless the owner separately authorizes reactivation.

## 4. Current repository and PR state

Repository: `https://github.com/Whisperer217/living-nexus_provenance`

Current review worktree:

```text
/tmp/living-nexus-player-collections-review
```

Current branch:

```text
review/player-collections-ac12fe90
```

Current HEAD:

```text
650ffda8c3bdf6815ec8be778f8b789fdd2d361a
```

PR:

```text
https://github.com/Whisperer217/living-nexus_provenance/pull/30
```

PR #30 targets isolated `app/main` and is open. It contains the Player Collections Edition Cabinet implementation plus isolated staging-fixture and worker-gate support.

The application base branch was created from the preserved Living Nexus World Save commit `ee98767f5f21e631deb899b5b160bd2a9dd405e9`. PR #29 was previously retargeted to `app/main`; do not confuse PR #29 and PR #30.

The canonical workspace is `/home/ubuntu/living-nexus`. Avoid mixing uncommitted canonical-workspace changes with the disposable PR worktree.

## 5. What PR #30 contains

Player Collections implementation:

- Player Collections database migration `0142` for `playerEditions`, `playerSubmissions`, and `playerCurationEvents`.
- Player Collections routes, procedures, contracts, and UI.
- Living Nexus Edition Cabinet visual system with editorial typography, gold rims, artifact cards, registry metadata, and responsive behavior.
- Canonical PlayerContext playback indicators, track durations, selected-work previews, technical-detail disclosure, and Edition Selection terminology.
- No second audio engine or playback authority.

Staging support added in commit `650ffda8`:

- `scripts/seed-player-collections-staging.ts`
- `.env.staging.example`
- `server/tests/stagingPreviewSafety.contract.test.ts`
- `LN_DISABLE_WORKERS=true` startup gate in `server/_core/index.ts`
- `seed:player-collections:staging` package script

The seed is guarded by all of:

```env
NODE_ENV=staging
LN_STAGING=true
LN_ALLOW_SYNTHETIC_SEED=true
```

It also rejects production-looking database targets and does not create WIDs or alter Registry records.

## 6. Validation already completed

PR #30 review validation reported:

- Focused Player Collections tests passed.
- Full suite: 951 passed, 1 skipped across 157 files.
- `pnpm check` passed.
- `pnpm build` passed.
- `git diff --check` passed.
- Migration/schema parity for the three Player Collections tables was audited.
- Desktop and true 390px mobile mock/preview walkthrough evidence was captured.
- PR review preview was run with synthetic mock data.

The review branch is clean at handoff time. No production deployment occurred as part of the staging-support update.

## 7. Database reality and safety

The generic environment currently exposes `DATABASE_URL` and `DRIZZLE_DATABASE_URL`, but their target must not be assumed to be staging. A separately named staging variable was not available at the last check. Do not use generic variables for synthetic seeding or staging migration unless the target is independently verified as non-production.

A dedicated staging database/schema is required for:

1. Running migration `0142` outside production.
2. Seeding synthetic creators, Works, Editions, submissions, and curation events.
3. Running an authenticated browser walkthrough against those records.

A deployment URL alone does not provide database access. Legitimate access requires one of:

- A managed secret containing a dedicated staging connection string.
- An explicitly authorized read-only production connection for export.
- A database backup/dump supplied by the owner.
- An authorized application export endpoint.

Never copy production records into a new database by guessing or regenerating WIDs. A future portable migration must preserve Work IDs, WIDs, creator relationships, disclosures, collection relationships, registry evidence, media references, and checksums.

## 8. Worker isolation

The intended staging profile is:

```env
NODE_ENV=staging
LN_STAGING=true
LN_DISABLE_WORKERS=true
LN_ALLOW_SYNTHETIC_SEED=true
PORT=4174
DATABASE_URL=<dedicated staging connection>
```

With `LN_DISABLE_WORKERS=true`, server startup must log:

```text
[Runtime] Background workers disabled by LN_DISABLE_WORKERS=true
```

and must not call visual backfill, visual worker startup, self-improvement worker startup, or payment-integrity worker startup.

The previous smoke attempt did not start because no database/runtime environment was supplied. Do not interpret that as a successful staging boot.

## 9. Exact next safe sequence

When the owner provides or enables a dedicated staging secret:

1. Verify the variable is present without printing its value.
2. Verify host/database identity is non-production; do not expose credentials.
3. Export it only into the staging process as `DATABASE_URL`.
4. Set `NODE_ENV=staging`, `LN_STAGING=true`, `LN_DISABLE_WORKERS=true`, and `LN_ALLOW_SYNTHETIC_SEED=true`.
5. Run the reviewed migration set against staging only.
6. Verify migration ledger entries and table existence.
7. Run `pnpm seed:player-collections:staging`.
8. Verify seeded row counts and synthetic-only identifiers.
9. Start the isolated PR #30 preview with workers disabled.
10. Run the automated desktop and 390px mobile browser walkthrough.
11. Capture runtime console output, layout/overflow checks, Edition Cabinet visibility, selected-work behavior, and playback continuity.
12. Report results and rollback steps.

If no staging URL is available, stop. Do not use production.

## 10. Publication boundary

Another Manus instance may handle publication of the reviewed application branch through the established WebDev path, but publication does not create database ownership or staging access. PR review, merge, checkpoint, deployment, migration, seeding, and public publication are separate states.

Before publication, require:

- PR review/approval.
- Correct base branch: `app/main`.
- No mixed Jellyfin lineage.
- Passing typecheck, focused tests, full suite, build, and diff checks.
- Explicit approval for any production migration.
- Clear statement whether the deployed frontend includes the Player Collections UI.

## 11. Handoff instruction to receiving Manus

Begin by reading this wireframe and verifying the current PR #30 head. Do not repeat broad research. Do not make code changes until the staging target is confirmed. Do not expose secrets. Do not run migration `0142` or the synthetic seed against generic `DATABASE_URL` or any target that cannot be proven non-production.

The immediate objective is not to redesign Living Nexus. It is to safely validate the already reviewed Player Collections implementation in an isolated staging environment, preserve Registry authority, and provide evidence before publication.
