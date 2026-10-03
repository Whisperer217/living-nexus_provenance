# ADR — Witness Tooltip and Profile Directory

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

The Explore creator-card **Witness** action will explain the relationship at the point of action:

> Witnessing acknowledges a creator’s continuing record. It is not a social follow; it connects a witness to future registered manifestations.

The authenticated `/profile` command center will receive a dedicated **Witnessing** tab. It will list only the creators reached through the same `witnessSubscriptions` records that the Explore action creates, upgrades, and removes.

## Architectural Alignment

| Layer | Effect |
|---|---|
| Identity | Makes the meaning of Witness visible at the decision point. |
| Relationship | Gives the witness a durable, inspectable view of creator relationships. |
| Registry | Ties the explanation to future registered manifestations, not generic content. |
| Stewardship | Preserves tier and establishment time without inventing a second social graph. |

## Data and API Boundary

- Add a read-only `getMyWitnessedCreators(witnessId)` helper that joins `witnessSubscriptions` to the existing `users` projection.
- Expose it as protected `witnessSubscription.myWitnessing`.
- Return creator identity, profile image, bio, tier, and relationship establishment time.
- No database migration: `witnessSubscriptions` already owns this relationship.
- No mutation is added. Existing `subscribe` and `unsubscribe` remain the only relationship authorities.

## UI Boundary

- The tooltip is added to the Explore creator-card Witness action, where the current user-facing button appears.
- When the current viewer already holds any `witnessSubscriptions` tier with a creator, the Explore card shows a non-interactive **WITNESSING** badge. It is a presentation of the existing relationship only: it makes no tier claim and invokes no separate relationship mutation.
- The Profile **Witnessing** tab is distinct from the legacy **Witness Network** tab. The latter continues to show the older network relationship; the new tab deliberately reports the subscription-backed relationship created by current creator-card actions.
- Empty state directs the user to Explore rather than inventing a separate onboarding path.

## Risks and Rollback

- **Risk:** Combining relationship systems could misstate a user’s relationship. **Mitigation:** keep the subscription-backed tab separate and label it clearly.
- **Risk:** query cost could grow with creator count. **Mitigation:** one scoped join for the authenticated witness; no per-card queries.
- **Rollback:** remove the read-only procedure and tab. Existing subscription data and Witness actions remain unchanged.

## Validation

- TypeScript check.
- Focused contracts for tooltip copy, protected procedure, helper join, and profile tab.
- Browser smoke for the Explore tooltip and profile tab rendering.
- Production build and whitespace check.
