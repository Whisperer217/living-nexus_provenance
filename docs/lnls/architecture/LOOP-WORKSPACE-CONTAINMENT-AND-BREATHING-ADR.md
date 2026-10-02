# ADR — Loop Workspace Containment and Breathing Room

**Status:** Accepted  
**Date:** 2026-10-02

## Context

At desktop zoom, the Loop multi-Work review was rendered inside `MainLayout`’s page-level scroll surface while `StudioShell` also requested a viewport-derived height. The workspace could therefore inherit a stale outer scroll position after the queue arrangement step, place its own header above the visible region, and reveal the site footer while a Work was still being reviewed. The compact asset grammar was correct in relationship language but too dense for sustained record review.

## Decision

`/manifest` is a focused registration workspace, not a conventional document page. Its content area will be contained by the existing `MainLayout` viewport after global navigation, with only the Studio’s left and right panels responsible for scrolling. `SiteFooter` will not render inside this active registration workspace; the Studio’s existing Back action remains the clear escape path.

The Studio will use the inherited content height rather than calculating its own browser-viewport height. The top ceremony receives a stable height and clearer step labels. The left review surface gains a wider editorial measure and more deliberate section spacing; the preview surface gains a visible Work-preview context and calmer proportional spacing.

For queued MP3 review, the progress notice becomes a compact, accurate orientation panel. It names queue proposals as reviewable prefill, while preserving the distinction that participation disclosure, attestation, and the Witness ID remain specific to each Work.

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Keep the outer page scroll and merely scroll to top after each phase | Does not prevent footer intrusion or resolve competing viewport height ownership. |
| Hide the footer globally on all creator-focused routes | Would change normal page navigation outside registration and exceed the observed blast radius. |
| Make the Studio entirely fixed-positioned | Risks conflict with the global player, overlays, and responsive browser chrome. |

## Affected surfaces

- `client/src/components/layout/MainLayout.tsx` — `/manifest` outer-scroll and footer boundary.
- `client/src/pages/manifestation-studio/StudioShell.tsx` — inherited-height, panel hierarchy, and reading measure.
- `client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx` — queue orientation and Work-preview presentation.
- Presentation contracts for containment and typography.

## Data and registry impact

None. No schema, procedure, cache, file bytes, source metadata, participation disclosure, or Witness ID construction changes.

## Risks and rollback

The change is limited to the Manifest route and visual hierarchy. Reverting the three UI files restores the former page-scroll behavior. The regression contract ensures `/manifest` retains contained panel scrolling and remains the only route that suppresses the footer.

## Validation

TypeScript, focused Loop presentation contracts, production build, responsive visual review at 100% desktop zoom, full-suite boundary, refinement scan, and diff integrity check.
