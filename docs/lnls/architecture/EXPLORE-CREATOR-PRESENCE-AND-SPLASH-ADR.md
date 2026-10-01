# ADR — Explore Creator Presence, Semantic Type & Cinematic Veil Restoration

**Status:** Accepted for local implementation  
**Date:** 2026-10-01  
**Scope:** Explore’s visible creator presence and typography, `WorkListRow` support affordance, and the cinematic splash CSS contract.

## Context

The Platform Steward report identifies three active issues on Explore:

1. **Discoverability:** the public creator query already includes creator-written `bio`, but `ExplorePage` reduces each record to a name, handle, image, and work count. A visitor cannot understand a creator’s testimony before leaving the directory.
2. **Support:** Explore list rows have a `SupportCreatorDrawer`, but its action is hidden on mobile and hover-gated on larger screens. The Creator directory has no direct support path.
3. **Typography:** Explore still uses arbitrary 9–11px classes and inline font-size declarations in a high-traffic public surface instead of the Cathedral semantic type roles.

The full test suite also has one failure in `cinematicSplash.videoContract.test.ts`. Source history shows the test asserts the approved **lineage veil**: a narrow gold axis at 49.8% / 50% / 50.2% and a screen-blended architectural overlay. A later CSS rollback removed those visual rules while leaving the contract in place. The test failure is therefore a genuine source/test divergence, not a test to delete.

## Decision

1. **Preserve real creator testimony in Explore’s Creator directory.**
   - Extend the existing local Explore creator mapping to retain the already-returned public `bio` and support readiness.
   - Present the creator’s own bio as a bounded, optional excerpt in the directory card. Do not generate or infer a story when none is supplied.

2. **Make support discoverable without creating an alternate support system.**
   - Keep the existing canonical `SupportCreatorDrawer`.
   - On a directory-card Support Creator action, resolve one published Registry work for that specific creator only after the explicit click, then open the existing drawer. This keeps creator-view arrival lightweight and supplies the Work identity required by current support/tip contracts.
   - Keep the list-row support trigger visible instead of hover-only; use the existing drawer and target shape.

3. **Replace Explore arbitrary microtype with existing semantic roles.**
   - Use `ln-overline`, `ln-page-title`, `ln-editorial`, `ln-caption`, `ln-mono`, and Tailwind scale utilities where appropriate.
   - Do not introduce new font families, hard-coded colors, or a parallel styling system.

4. **Restore the documented cinematic veil rather than weakening the contract.**
   - Restore the narrow lineage axis and non-interactive `::after` screen overlay as CSS-only visual planes.
   - Preserve reduced-motion logic, video controls, source URL, component phase logic, and mobile film rule.

## Architectural alignment

| Layer | Effect |
|---|---|
| Identity | Creator name, handle, image, and creator-declared bio appear together in Explore’s directory. |
| Manifestation | Semantic typography and the restored ceremonial veil improve legibility and intentional presentation. |
| Relationship | A visible Support Creator action reaches the existing participation drawer without duplicating commerce logic. |
| Registry | Support lookup resolves a published Registry work only after a visitor requests it; no secondary Work index is created. |
| Stewardship | The directory remains light on arrival and retains a truthful empty-bio state rather than synthesizing testimony. |
| Legacy | The tested, approved visual lineage axis is restored with its source history intact. |

## Alternatives rejected

| Alternative | Reason rejected |
|---|---|
| Generate creator descriptions | Would invent testimony and weaken creator sovereignty. |
| Eagerly fetch every creator’s Works to prepare support targets | Recreates the known eager-loading and payload problem. |
| Build a second creator-only payment drawer | Duplicates a current support flow and would obscure Work identity. |
| Delete or relax the cinematic test | Masks a verified divergence from the approved CSS composition. |
| Restore a static cinematic fallback image | Conflicts with the existing reduced-motion/video doctrine. |

## Affected files

- `client/src/pages/ExplorePage.tsx`
- `client/src/components/WorkListRow.tsx`
- `client/src/index.css`
- `server/tests/exploreSurfaceContract.test.ts`
- `server/tests/cinematicSplash.videoContract.test.ts` (verification only unless the contract itself proves incorrect)
- targeted new Explore creator-presence contract test

## Data, risk, and rollback

No database schema, Work, WID, provenance, publication, storage, or payment data changes are required.

The directory support lookup is deliberately click-gated and has an explicit unavailable state. Rollback is source-only: remove the card action/lookup, semantic class substitutions, visible row action, and restored veil rules.

## Creator Domain benchmark boundary

The Creator Domain shell defines nine section identifiers. Public visitors can access **Home**, **Works**, **Collections**, and **Witnesses**; five owner-only sections require an authenticated owner session. The benchmark will measure all public sections on a known public creator and will report owner-only sections as authentication-blocked rather than fabricate private-memory measurements. The benchmark is a deterministic browser loop, not a research fan-out.

## Validation

- TypeScript and full test suite.
- Focused Explore support/typography and cinematic splash tests.
- Browser checks of public Creator directory: creator-declared bio, direct support action, and preserved domain navigation.
- Lighthouse-style runtime benchmark with DOM, JS heap (where browser-exposed), resource payload, and request/error counts for each accessible Creator Domain view.
- Refinement scan; score must not decrease.

## Release boundary

This ADR permits local source implementation and validation only. It does not lift the project-wide checkpoint, deployment, or publication hold.
