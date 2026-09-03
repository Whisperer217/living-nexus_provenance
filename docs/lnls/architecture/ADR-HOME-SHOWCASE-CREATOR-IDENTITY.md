# ADR — Home Showcase Creator Identity

**Status:** Approved for bounded implementation under Doc’s standing release direction.

## Decision

Every Home limited-showcase Work card will visibly identify its creator through the existing public profile image as a small circular orb and an explicit creator name/handle link. Both paths navigate to the existing creator-domain route when a usable public creator handle is present.

## Data and fallback

The feature reuses only the public `profilePhotoUrl`, `artistHandle`, `artistName`, and existing Work identity already returned by the showcase projection. A missing public image receives the existing initial-based visual fallback; a missing handle remains readable static text rather than an invented or broken route.

## Interaction rule

Creator identity controls will be siblings of the existing Work-card navigation, never nested inside a Work link. This preserves independent keyboard and touch targets for the Work and creator destination.

## Exclusions

This change does not create profiles, alter creator metadata, change Work selection/ranking, modify support behavior, or write WID/provenance/publication records.
