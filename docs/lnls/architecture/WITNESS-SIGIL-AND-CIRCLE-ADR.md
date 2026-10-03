# ADR — Witness Sigil and Witnessing Circle

**Status:** Accepted  
**Date:** 2026-10-03

## Decision

Living Nexus uses a dedicated **Witness Sigil** wherever a person establishes, holds, or views a witness relationship. The sigil is a pair of acknowledgement marks holding a central record: it is not an eye, notification bell, heart, generic person-plus icon, or a social-network mark.

The sigil is a visual affordance only. It does **not** introduce a new relationship type, table, API, or follow graph. Creator witnessing continues to use the existing persisted `witnessSubscriptions` relationship and its `witness`, `reserve`, and `steward` tiers.

## Global path

Authenticated people reach their witnessed-creator list through **Witnessing** in the unified navigation rail and the signed-in account menu. Both open:

```
/profile?tab=witnessing
```

That profile tab is the existing subscription-backed directory: a private, friend-list-like view of the creators whose future registered manifestations the person has chosen to witness.

## Application

The shared `WitnessSigil` component appears on active witness controls and states across Explore, Creator Profile, Loop Creator, artifact identity, collections, projects, and the witnessing directory path. Both desktop and mobile navigation include a direct path to the same directory. Hosts retain their existing labels, ARIA descriptions, and active/inactive colors so a sigil never substitutes for readable relationship state.

## Boundaries

- Do not call witnessing a follow, subscription, notification, or like in user-facing copy.
- Do not use the sigil to imply that a Work's WID or registry verification has been completed.
- Do not replace existing persisted relationship semantics solely to standardize the icon.
- Do not create a second list or graph; route to the existing `myWitnessing` directory.
