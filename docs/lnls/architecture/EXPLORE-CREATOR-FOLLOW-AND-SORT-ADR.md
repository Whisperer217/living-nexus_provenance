# ADR — Explore Creator Follow and Sort

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

The public Explore creator directory exposes a **Follow** action by reusing the existing `witnessSubscriptions` record at its free `witness` tier. This is the platform's canonical persisted relationship for receiving a creator's future publication notices.

The directory does **not** create a second follower table or repurpose the older directional `witnesses` network table. The existing subscription relationship already has the intended publication-notice behavior and supports future Reserve and Steward tiers.

A batched authenticated status procedure accepts the currently displayed creator IDs and returns the viewer's existing subscription tier for those records. This avoids one protected read per card.

## Interaction

- **Follow** creates a `witness`-tier publication subscription.
- **Following** removes a `witness`-tier subscription.
- Existing `reserve` or `steward` subscriptions are shown as **Subscribed** and are not downgraded from this lightweight browsing control.
- The creator's own card has no Follow action.
- Guests are invited to sign in rather than receiving a simulated local-only state.

## Sort semantics

The creator sort is presentation-only and applies to the existing public `profile.allCreators` result:

| Selection | Metric |
|---|---|
| Newest | Creator account creation timestamp, descending |
| Most popular | Sum of public published Work play counts, descending; published Work count breaks ties |

No hidden ranking, private data, or additional broad discovery query is introduced.

## Consequences

- `profile.allCreators` includes public creation timestamp and total public plays, in addition to its existing published Work count.
- No database schema or migration changes are required.
- The Follow affordance has real persisted, server-backed behavior and clear tier boundaries.
