# ADR — Creator Workflow Friction Repair

**Status:** Accepted and implemented in this slice  
**Date:** 2026-10-07  
**Scope:** Creator-declared date selection, participation disclosure, Signal detail handoff, and creator Work quick actions

## Context

Four independent friction points shared one cause: correct information or action existed, but was too hard to reach or could not be truthfully expressed.

1. The shared historical date field required repeated arrow navigation across months and years.
2. Music registration could only state `Human`, `AI`, or `Both` for every axis, which falsely implied lyrics and vocals exist on an instrumental Work.
3. Signal notifications stopped at a Work hero instead of opening the corresponding Voices section.
4. Creator Work cards required an extra navigation step for reactions, playlists, and entitled downloads. Their hover-only controls were inaccessible on touch.

## Decision

- Use the installed calendar’s `dropdown` caption mode with bounded month and year selectors inside the existing date popover. Persist only the existing date-only string.
- Add `None` as an additive participation enum value. It means no contribution exists on that axis; it is not a claim about authorship, endorsement, WID, or AI participation. The Music registration UI exposes it only for **Lyrics** and **Voice**, with plain-language labels.
- Link Signal notifications to `/song/:id#voices` and use readable type / reachable targets in the right rail.
- Add a reusable, touch-visible creator Work action group for heart, playlist, and permitted download. It reuses the established persistent like, playlist, and WID-tagged download paths; unavailable downloads are omitted rather than bypassed.

## Layer alignment

| Layer | Strengthened by |
|---|---|
| Identity | Creator cards retain an explicit path to the canonical Work page, creator, and WID. |
| Manifestation | Date and instrumental declarations become clear, readable Work context. |
| Relationship | Signals lead directly to the public discussion they reference. |
| Registry | No WID, source hash, publication, or historical timestamp mutation is introduced. |
| Stewardship | Instrumental creators can state absence truthfully; download permissions remain enforced. |
| Legacy | The new enum is a monotonic, journaled schema evolution. |

## Alternatives rejected

| Alternative | Reason rejected |
|---|---|
| Add a free-text notes field for instrumental status | It would make the registry query-inconsistent and leave the existing false participation indicator intact. |
| Use `N/A` as the stored value | Ambiguous: it can mean unknown, inapplicable, or deliberately omitted. `None` precisely means no contribution on the axis. |
| Make the whole creator card a download button | It would obscure navigation, bypass discoverability of the canonical record, and create accidental downloads. |
| Add a separate Signal detail page | The authoritative public context is already the Work’s Voices section. |

## Migration and rollback

`None` requires a generated additive migration after the active `0137` baseline. Existing values and defaults remain unchanged. Rollback before wider publication is a source rollback plus a forward migration restoring the prior enum only after verifying no `None` records have been created; never rewrite creator declarations silently.

## Validation

Completed on 2026-10-07:

- The shared historical date popover now offers bounded month and year selectors while retaining its existing date-only value.
- The generated `0138_panoramic_satana.sql` migration adds the `None` participation enum value. The development database migration and ledger reconciliation were completed earlier in this slice; no production migration or deployment was initiated.
- Signal alerts in the right rail and Notifications now target `/song/:id#voices`. A browser check caught an initial hydration race where the hash remained but the page stayed at the hero. The Work page now retries the scroll after its Work data hydrates; a repeat unauthenticated browser check landed at the **Voices** landmark.
- The live `/creator/:id` route uses `LoopCreatorPage` and `SanctuaryWorksOrganizer`, not the legacy `CreatorProfilePage`. The final quick-action implementation was corrected to that active route. Browser DOM inspection of `/creator/6330001` found 12 visible Work action groups (36 labeled heart, playlist, and permitted-download controls).
- Signal cards and ordering controls use a larger reading tier. The action controls retain focus styles, touch-visible availability, and reduced-motion-safe transitions.

Validation passed: `pnpm check`; 4 focused suites / 27 tests; `pnpm build`; `git diff --check`; manual unauthenticated browser inspection of the active creator Work surface and a populated public Voices surface.

The full `pnpm test` baseline remains **758 passed, 1 skipped, 4 failed**. The four failures predate this slice and are missing historic migration-file contract paths: `0139_core_ingestion_commission_i1.sql`, `0140_core_ingestion_review_i2.sql`, `migrations/0135_add_creative_cathedral_workspace.sql`, and `0138_registry_api_r1a_credentials.sql`. No deployment is included in this decision.
