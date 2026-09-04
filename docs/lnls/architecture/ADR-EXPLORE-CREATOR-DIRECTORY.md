# ADR — Explore Creator Directory

## Status

Approved for the bounded repair after direct Explore inspection.

## Observed problem

The Explore control labelled **Creators** selected `viewMode = "grid"`, but the resulting surface constructed its creator cards by grouping the current `songs.exploreIndex` rows. Each card therefore led with up to five track rows. It was not a true creator directory, and it could omit an otherwise eligible public creator whose Work was absent from the current randomized or limited track response.

During local interactive verification, My Browser timed out on the Explore toggle and the browser console contained a prior maximum-update-depth record. The record predates the final Explore HMR update and could not be reproduced in the isolated screenshot renderer; it is not treated as a confirmed current creator-directory render-loop cause. The isolated renderer established the actual visible defect: Explore continued to render **New This Week** and other track strips above the creator directory when `view=creators`, leaving the user on a tracks-first screen after explicitly choosing creator discovery.

## Decision

The Creators mode will render from the existing public `profile.allCreators` projection rather than grouping the Explore music feed. Each card will show only existing public identity data: profile image or neutral fallback, display name/handle, published Work count, and a direct creator-domain link. Search will match name and handle. The mode will explicitly identify itself as **Browse creators**, making the interaction intelligible rather than leaving a person to infer it from an icon.

Track supplemental strips are hidden in this dedicated directory mode, so the first content below the Explore controls is the creator directory itself. They remain present in the existing tracks-first column mode.

## Authority boundary

This is a read-only discovery projection. It does not change profile eligibility, creator records, Work records, ordering, WID, provenance, publication, playback, or support behavior. Its public visibility is bounded by the existing `profile.allCreators` reader; if that reader requires a visibility correction, that change must be separately justified and tested.

## Deferred scope

This does not redesign the rest of Explore, add following/social systems, rank creators algorithmically, fabricate activity, add workers, or change the music-only discovery doctrine.

## Validation

The repair requires focused creator-directory and public eligibility contracts, creator-domain route verification, desktop/mobile containment checks, and regression/build validation.
