# ADR — Explore Creator Card Readability

**Status:** Accepted  
**Date:** 2026-10-02

## Decision

Creator directory cards use a stable **charcoal reading veil** above optional creator-owned banners.

- **Creator name and testimony:** `--ln-parchment` — the highest-contrast editorial ink.
- **Creator handle and directional emphasis:** `--ln-gold-hot` — reserved accent, not the principal reading color.
- **Counts and supporting information:** `--ln-bone`.
- **Optional banner:** remains atmosphere behind the veil; it is not allowed to determine text contrast.

The veil is darker at the upper identity area, remains legible through the statement area, and resolves into the Cathedral coal surface at the action rail. A restrained ink shadow supports the text without competing with the creator’s banner.

## Why

The existing card correctly preserves creator-owned imagery, but a lightly shaded banner can leave names, handles, and testimony vulnerable to variable image contrast. Creator identity must remain legible in seconds across every registered banner and every supported theme.

## Alternatives rejected

| Alternative | Reason rejected |
|---|---|
| Gold for all text | Gold is an accent and action signal; using it as body copy weakens hierarchy. |
| Full opaque panel | Guarantees contrast but hides the creator’s visual identity and makes the card feel administrative. |
| Per-banner color extraction | Adds unreliable inference and makes the creator’s presentation depend on image analysis. |

## Scope

Presentation-only change to Explore creator cards. No data, routing, permissions, registry, or creator-owned imagery changes.

## Follow action and mobile extension

The Follow action uses parchment as its readable label in every state. Gold-hot belongs to its active witness mark, border, and hover uplift; it does not replace readable action text. On narrow viewports, the handle, supporting copy, domain action, and both creator-card actions rise to the established `--text-sm` tier, while action targets expand to the 44px mobile touch floor.

## Verification

- Keep existing banner and avatar loading/error behavior.
- Preserve reduced-motion behavior.
- Verify creator directory renders with title, handle, statement, counts, Follow, Support, and domain action legible over both bright and dark banners.
- Run TypeScript, focused creator-card contracts, production build, and browser smoke.
