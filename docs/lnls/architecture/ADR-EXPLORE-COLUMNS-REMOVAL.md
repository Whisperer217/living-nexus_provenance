# ADR — Explore Columns Removal

## Decision

Remove the legacy **Columns view** control and its presentation state from Explore. Preserve the tracks-first **List** view and the public **Browse creators** directory as the only discovery modes.

## Evidence

The authenticated browser audit on 2026-09-04 confirmed that the TopBar search surface is already absent while the page-local Explore filter remains present. It also confirmed a distinct visible **Columns view** control alongside List and Browse creators. The Columns control is the requested removal target.

## Boundaries

This is a presentation and URL-state simplification only. The existing Explore filter, randomized/newest ordering, refresh, public visibility rules, Work cards, creator directory, player behavior, WIDs, provenance, and publication procedures remain unchanged. Legacy `view=grid` deep links will resolve to the retained List presentation rather than produce an invalid view.

## Validation

Focused contracts will assert that the Columns control and grid URL state are absent, List and Browse creators remain present, and page-local search is retained. Browser and preview checks will confirm the removal on the current local source before the change is checkpointed for separate public publication.
