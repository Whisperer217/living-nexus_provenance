# ADR — Normal-Scale Explore Composition

**Status:** Accepted

## Context

At a browser zoom near 150%, Explore acquired a clearer reading rhythm: the discovery column was visually bounded, track artwork was large enough to read, and the header player did not compete with a search field. At normal desktop scale, the full-width Explore shell and the redundant TopBar search field made the same page feel comparatively sparse while constricting the inline player.

## Decision

Remove only the **TopBar** autocomplete search field and its query observer. Preserve the inline TopBar player, PlayerContext, expanded player, queue, and all playback controls.

Use a bounded Explore reading plane at normal desktop scale, approximately matching the effective content width of the approved 150% reference. Keep the existing responsive full-width behavior below the desktop breakpoint, and retain Explore's local search and creator filter as the discovery controls.

## Boundaries

This is presentation-only. It does not change search routes outside the removed TopBar surface, Explore data ordering, creator/public eligibility, Work data, WID, provenance, publication, music playback, or the global player.

## Validation

Validate normal desktop, a constrained desktop approximation, and mobile. Confirm the TopBar player remains operable, Explore local search remains present, track cards retain their direct Work routes, and no TopBar search observer remains mounted.
