# ADR — Witness Terminology Alignment

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

All public relationship language for creators, collections, and projects uses the Living Nexus witness vocabulary:

| Prior generic label | Canonical public label |
|---|---|
| Follow | Witness |
| Following | Witnessing |
| Follower / Followers | Witness / Witnesses |
| Subscribe / Subscribed | Establish Witness / Witnessing |
| Unfollow / Unsubscribe | Withdraw Witness / Witness removed |

A witness is an intentional acknowledgement of a creator, manifestation, collection, or project. It is not a generic feed subscription.

## Scope

This decision updates user-facing labels, aria labels, tooltips, notifications, empty states, activity language, and historical update copy that describe Living Nexus relationships. It includes the Explore creator directory, creator profile, creator identity rail, manifestation header, collections, projects, the support drawer, activity rail, profile notifications, design-system example, and What’s New copy.

The following remain unchanged:

- tRPC procedure names, database fields, event codes, and migration history such as `subscribe`, `unsubscribe`, `follow`, `following`, `followerCount`, and `FOLLOW`.
- Payment, billing, or third-party platform subscriptions, which retain their ordinary commercial meaning.
- Explanatory comparison tables that explicitly contrast external vocabulary with canonical Living Nexus vocabulary.

## Architectural alignment

- **Relationship:** Reframes the connection as an act of acknowledgement rather than passive consumption.
- **Stewardship:** Makes ongoing attention to a creative record explicit.
- **Legacy:** Keeps a coherent, durable witness vocabulary across discovery and support surfaces.

## Risks and controls

Changing persisted procedure or database names would create needless compatibility and migration risk. This is therefore a presentation and accessible-language change only; existing relationship behavior, permissions, and tiers remain intact.

## Verification

- TypeScript check
- Focused relationship-language contracts
- Production build and whitespace check
- Browser smoke of public creator-card labels
