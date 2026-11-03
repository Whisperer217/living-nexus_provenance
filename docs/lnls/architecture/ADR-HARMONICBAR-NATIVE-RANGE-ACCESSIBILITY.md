# ADR — HarmonicBar Native Range Accessibility

- **Status:** Accepted for the bounded shared-component implementation
- **Date:** 2026-10-29
- **Decision scope:** `HarmonicBar` interaction semantics, focused client test slice, and Design System acceptance surface

## Context

`HarmonicBar` currently uses a click-only `div[role="slider"]`. It has no keyboard operation, a manually declared role, a compact visual target that is too small for the platform touch standard, and no single source of truth between controlled progress, rendered state, time text, and callbacks.

The development-only Visual Lab previously contained an illustrative HarmonicBar, but its P0 repair removed all player-state simulation. The static Icon Kit ADR prohibits restoring that component, a timeline, or a player-shaped substitute to `client/src/visual-dev/**`.

## Decision

1. When `onSeek` is provided, `HarmonicBar` renders one native controlled `<input type="range">` as the sole interactive and accessibility authority.
2. `progress` is normalized to a finite `0…1` value once and drives fill, playhead, native value, key candidates, accessible value text, and all emissions. The native range uses `min=0`, `max=100`, and `step="any"`; continuous controlled precision is retained.
3. `onChange` and the handled keyboard keys share one normalized emission gateway. Arrow keys step 1 percentage point, Page keys 10 points, and Home/End use bounds. A clamped no-op emits no duplicate callback.
4. Interactive time is derived from normalized progress and a finite positive duration. The native control announces a spoken, truthful current/duration value; invalid duration announces rounded percentage progress.
5. Interactive HarmonicBars use an unclipped 44 px target with the visual 2–6 px harmonic line centered within it. Decorative layers are pointer-inert and `aria-hidden`; a restrained gold focus ring appears from `:focus-visible`; reduced motion disables visual transitions.
6. Without `onSeek`, HarmonicBar remains a compact visual-only bar with no input, role, tab stop, pointer cursor, or playback state claim.
7. Root server Vitest and the development-only Visual Lab test slice remain unchanged. A third focused JSDOM configuration tests this shared client primitive, followed by a real-browser Design System smoke.

## Consequences

### Positive

- Native semantics provide keyboard and assistive-technology support without reconstructing ARIA slider behavior.
- The Design System gains a precise, low-strain 44 px interaction target while retaining the Cathedral’s quiet harmonic visual language.
- Pointer, drag, touch, and keyboard behavior converge on one normalized contract.
- The static Visual Lab boundary remains intact: no application player or simulated playback state returns.

### Constraints

- JSDOM validates structure, values, keyboard events, and focus-contract classes, but physical drag/touch, zoom, and rendered focus visibility require a real-browser smoke.
- The focused test harness adds only `jsdom`, Testing Library React, and Testing Library user-event; it does not broaden server test environment behavior.
- No player provider, audio element, route, Registry/WID record, authentication, server, database, or persisted Visual Lab preset changes are authorized.

## Validation and rollback

Required validation: typecheck; server suite; Visual Lab suite; focused HarmonicBar JSDOM suite; production build; Design System browser smoke for keyboard, pointer/touch, 200% zoom, and reduced motion; refinement with no score decrease.

Rollback is a reversion of the dedicated HarmonicBar commit. It requires no migration, cache invalidation, data repair, Registry work, or server rollback; reverting restores the prior visual implementation and reopens the known keyboard P1.
