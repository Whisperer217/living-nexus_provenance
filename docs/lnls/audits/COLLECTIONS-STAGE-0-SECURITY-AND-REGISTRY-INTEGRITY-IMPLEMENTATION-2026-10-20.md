# Collections Stage 0 — Security and Registry-Integrity Implementation

**Date:** 2026-10-20  
**Status:** Implemented and validated in a development checkpoint; not deployed or published  
**Scope:** Stage 0 only — private WID-ALB membership containment, named-playlist relationship integrity, and immutable origin-membership protection

## What was corrected

### 1. Private and unlisted WID-ALB membership no longer has a public path

Public album reads now require a public collection and return only public, Published, unflagged Works. The public Creator Domain collection list also uses a public-only collection projection. The direct public collection-track procedure is owner-aware: an owner may manage the complete collection; every other caller receives only a public, composition-matched, availability-filtered view. Private/unlisted collection metadata and member Works do not travel through the public WID-album routes.

Affected paths include `server/routers/songs.ts`, `server/utils/db.ts`, and `server/routes/downloadRoute.ts`.

### 2. WID-ALB origin membership cannot silently diverge

A new pure evaluator replays the historical WID-ALB algorithm: SHA-256 of sorted member Work WIDs joined by `|`, then the derived `WID-ALB-XXXXXXXX-XXXXXXXX` identifier. It does not write data, reissue a WID, alter a hash, delete a certificate, or modify a Work.

Every trust-bearing current-composition path now fails closed on a mismatch, missing member WID, stored count mismatch, hash mismatch, or stored WID mismatch:

- public album detail;
- public WID-ALB verification;
- creator certificate generation before `storagePut` or pointer update;
- album manifest export for Provenance Player; and
- album ZIP generation before any ZIP stream begins.

The existing Provenance Player media gateway remains current-eligibility-based. Stage 0 did not add a redundant per-track authorization regime.

### 3. Membership mutations now respect a sealed WID-ALB

Existing albums with a `collectionWid` or `collectiveHash` are treated as sealed origin membership records.

Server-side add, remove, and replace operations now reject before logging a member-change event. The same preflight occurs before single-Work registration into a sealed album and before metadata reassignment into or out of one, so a failed request does not persist a partial Work update.

Collection Studio retains these editorial operations for the same membership set:

- title, description, visibility, cover art, cover position, and default view;
- track order; and
- owner access to legacy records, including records already inconsistent with their old seal.

Stage 0 does **not** create a new edition, mutate membership snapshots, alter Work WIDs/HAAI/media, or remove historical records.

### 4. Named playlist operations are bound to their actual membership rows

Playlist removal now constrains both the membership row ID and its playlist ID. A foreign row cannot be removed by supplying it with another playlist’s ID.

Playlist reorder now accepts `orderedPlaylistTrackIds` rather than Work IDs. The server reads the current membership within one transaction, requires an exact unique set match, then writes each order update with both membership-row and playlist predicates. This preserves legal duplicate appearances of the same Work because each appearance has its own membership row ID. A stale, duplicate, omitted, or foreign row input produces a conflict rather than a partial reorder.

## Album identity and edition semantics

A legacy WID-ALB is an immutable **origin membership seal**, not a mutable current-edition identifier. It binds the original member Work-WID multiset only. It does not bind title, description, artwork, focal point, visibility, default view, current availability, or display ordering.

A creator may continue to edit those presentation fields and reorder the same membership set without changing the historical certificate. To alter membership, the pending explicitly authorized architecture is **Draft Release → Publish → new sealed WID-ALB Edition**. A new edition will preserve the earlier WID-ALB and historical certificate rather than overwrite them. That lifecycle was documented but was not implemented in Stage 0.

Existing legacy albums whose current members already disagree with their stored seal remain in owner management and historical storage. They are intentionally unavailable from trust-bearing public/verification/export paths until a separately reviewed edition or remediation workflow exists.

## Validation evidence

- `pnpm check` — passed.
- Focused Stage 0 suites — **8 files / 52 tests passed**:
  - origin seal algorithm and mismatch tests;
  - public/private/unlisted source-contract containment;
  - certificate, verification, manifest, ZIP, and assignment boundaries;
  - named-playlist row identity, duplicate, stale, empty, and foreign reorder policy;
  - existing collection and Provenance Player manifest continuity coverage.
- `pnpm test` — **140 test files passed, 1 intentionally skipped; 871 tests passed, 1 skipped**.
- `pnpm build` — passed. Vite reported existing large-chunk advisories only; no build failure.
- `git diff --check` — passed before final checkpoint preparation.
- `pnpm refine` — measured **70/100 (C)**. The report continues to identify broad pre-existing typography, doctrine, and design-drift debt outside Stage 0. No improvement is claimed from this security-focused slice.

## Remaining risks and deferred work

1. A legacy composition mismatch is fail-closed rather than repaired. That protects trust but means the creator needs the future explicit edition/remediation flow to publish a changed membership honestly.
2. The current album membership schema has no immutable snapshot table. Stage 0 therefore validates the stored historical seal against current rows; it does not reconstruct a missing historical snapshot.
3. Collection Studio remains owner-authorized and its established playback authority is unchanged. Browser UX for a future Draft → Publish → Sealed Edition workflow has not been designed or implemented.
4. No deployment, database migration, WID replacement, membership cleanup, asset deletion, or public publication was performed.
