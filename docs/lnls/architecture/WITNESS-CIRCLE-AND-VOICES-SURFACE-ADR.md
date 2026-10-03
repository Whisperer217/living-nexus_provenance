# ADR — Witnessing Circle Panel, Voices Surface, and Dimensional Fields

**Status:** Accepted  
**Date:** 2026-10-03

## Decision

Living Nexus will surface the existing creator-witness relationship as an immediately available **Witnessing Circle** side panel. The panel is a convenience view over the canonical `witnessSubscriptions` record. It does not introduce a parallel social graph, a new subscription type, or a replacement for the full Profile → Witnessing directory.

Track commentary is presented as **Voices**: a visible, counted part of a Work’s living record. The existing comments and replies procedure remains canonical. The live `/song/:id` route exposes a direct Voices action and a persistent threaded Voices section; no duplicate activity feed or comment store is created.

Submitting a Voice is presented as **Send Signal**. The canonical `COMMENT` event and comment/reply records remain unchanged; the signal is the user-facing activity and notification interpretation of that event. When someone other than the Work’s creator sends a Signal, the existing notification record reaches the creator’s personal **Signals** alert surface.

The canonical public Work route is `client/src/pages/loop/LoopWorkPage.tsx` at `/song/:id`. Legacy `SongDetailPage` and `ExperienceColumn` components are not the canonical public music route and must not be treated as evidence that comments are visible on `/song/:id`.

A reusable dimensional-field treatment is added as a restrained platform grammar: layered surface, inset edge, light elevation, focus glow, and reduced-motion-safe transitions. It is first used for the Witnessing Circle search field and the Voices composer. It is not a blanket box-shadow retrofit.

## Interaction contract

| Surface | Behavior |
|---|---|
| Witness Sigil | Press feedback is supplied by the shared `ln-witness-sigil` class; motion respects reduced-motion preferences. |
| Witnessing Circle | Opens from the rail, mobile header, and account menu through one `ln:open-witnessing-circle` event. Search and sorting are local projections of the existing authenticated query. |
| Voices | Shows the true queried count, provides a direct header jump, remains expanded by default, and keeps existing reply/reaction/persistence paths intact. |
| Send Signal | Posts a Voice through the existing comment procedure, records its existing `COMMENT` activity event, and uses the personal Signals alert mechanism already attached to that event. |
| Dimensional fields | Add depth only to writable or filterable fields, preserving cathedral contrast and focus visibility. |

## Boundaries

- No migration, payment, role, or entitlement change.
- No new comment or follower tables.
- No claim that a comment is immutable testimony; it is a visible conversation around a Work.
- The full Profile → Witnessing page remains the detailed private directory.

## Verification

TypeScript check, focused relationship/comment contract test, production build, UI browser smoke, and a source-level scan for legacy direct navigation entries.
