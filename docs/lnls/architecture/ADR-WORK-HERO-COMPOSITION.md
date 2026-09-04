# ADR — Work Hero Composition Recovery

**Status:** Implementing

## Context

At normal desktop geometry, the public Work page used an `88vh` hero with end-aligned content. That composition placed the title, primary work metadata, and action area at the extreme lower edge of the image plane. The first provenance and relationship panels consequently began below the primary viewport and appeared visually disconnected and undersized in comparison.

The reported 25% browser zoom makes the failure especially obvious, but it is not the cause: a viewport-relative hero with `justify-end` creates the same downshift at ordinary scale.

## Decision

The existing Work hero will remain full-bleed and image-led, but its content will use a bounded, centered vertical distribution with fluid typography. The page will reserve enough image presence for testimony while bringing the title, WID/metadata, actions, and first provenance context into a coherent first-screen composition.

The repair is limited to presentation geometry and responsive spacing. It does not alter Work retrieval, title values, lyrics, artwork, WID construction or verification, provenance history, creator ownership, player behavior, or publication state.

## Alternatives rejected

Keeping the existing `88vh` hero and compensating only with browser-zoom-specific CSS would preserve the underlying layout defect. Removing the hero would discard the Work page's intended visual testimony surface. A narrower, centered hero with a responsive content anchor preserves both image presence and record accessibility.

## Validation and rollback

Desktop and mobile screenshots must show the title and first record surface within a coherent initial composition, with no clipped controls or horizontal overflow. Existing Work route and provenance contracts must remain intact. Rollback is a single presentation-file revert.
