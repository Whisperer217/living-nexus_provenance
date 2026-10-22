# Witness Registry Search — Implementation Record

**Date:** 2026-10-22  
**Base checkpoint:** `83ae5a73` — Public Portable Witness access for eligible individual Works  
**Scope:** One searchable, server-paginated public Witness Registry.  
**Deployment/publication:** Not authorized and not performed.

## Decision

The existing `/witness-registry` page is now the single public discovery path for published, WID-bearing Registry records. It can find an existing record by:

- Creator display name;
- Creator handle, with or without the display-only `@` prefix;
- Work title; or
- Witness ID / WID.

This is not a new Registry, a second search index, a creator directory, or a manifest database. It extends the existing `witnessRegistry.list` procedure and its cursor pagination. Search results retain the current canonical links: Work (`/song/:id`), Creator (`/creator/:id`), and verification (`/verify/:wid`).

## What changed

| Layer | Change | Authority retained |
|---|---|---|
| Public API | `witnessRegistry.list` accepts an optional, trimmed query up to 120 characters. | The existing public procedure, offset cursor, result limit, and Registry projection remain authoritative. |
| Database read | The existing Registry reader matches Work title, Witness ID, Creator name, or creator handle. An initial `@` is normalized only for matching, and SQL wildcard characters are escaped. | The existing `Published` and WID-bearing conditions remain in place. No visibility rule or historical record was rewritten. |
| Registry page | Adds a debounced 300 ms search input, clear action, accessible progress announcement, focused no-match language, and pagination reset for a new query or category. | The existing one-page, one-route Registry UI and its Work/Creator/WID links remain canonical. |
| Regression coverage | Adds `witnessRegistrySearch.contract.test.ts`. | The test confirms no new protected search route, write call, or separate global search integration was introduced. |

## User flow

1. Open **Witness Registry** at `/witness-registry`.
2. Type a Creator name, `@handle`, Work title, or WID.
3. After a short debounce, the page requests the first bounded matching page from the same Registry procedure.
4. Select the canonical destination already attached to each record: Work, Creator, or WID verification.
5. Clear the input to return to the existing category view.

The page does not download media, copy a manifest, start Provenance Player, alter the Global Player queue, create a Registry record, or persist a search term.

## Files changed

| File | Change |
|---|---|
| `client/src/pages/WitnessRegistryPage.tsx` | Adds the responsive accessible search control, 300 ms debouncing, pagination reset, and search-specific empty state. |
| `server/routers/witnessRegistry.ts` | Adds a bounded optional `query` input to the existing public list procedure. |
| `server/utils/db.ts` | Adds safe matching for title, WID, Creator name, and handle to the existing Registry reader. |
| `server/tests/witnessRegistrySearch.contract.test.ts` | Adds contract coverage for server pagination, query boundaries, search fields, and the one-page input. |
| `refinement/lessons/lessons-log.json` | Adds `LESSON-080`, the server-paginated Registry discovery pattern. |

## Validation

| Check | Result |
|---|---|
| Focused Registry, API, public-projection, and manifest-boundary contracts | **4 files, 19 passed** |
| TypeScript | `pnpm check` **passed** |
| Full regression | `pnpm test` **149 files passed, 919 tests passed; 1 intentionally skipped** |
| Production build | `pnpm build` **passed** |
| Whitespace | `git diff --check` **passed** |
| Direct database read-only check | A selected public Registry Work was found by Creator handle, `@handle`, title fragment, and WID prefix; an impossible query returned zero rows. No write was issued. |
| Local public-browser check | The canonical `/witness-registry` page rendered the field and results while signed out. A specific title query narrowed the page to **three** matching Works and their WIDs. |
| Mobile presentation | A 375 px local capture showed the search field contained within the viewport with readable tabs and rows. |
| Refinement | Existing **70/100 C** baseline unchanged. |

The direct read-only database check used current public data only. For the sampled `@slimdoggyAIMusic` handle, equivalent Creator and `@handle` queries returned the selected Registry Work; the Work-title fragment `SILENCE! (Proverbs 17)` narrowed to three matching Works; and a deliberately impossible query returned none.

## Safeguards and explicit non-changes

- No Work, WID, Creator, declaration, provenance event, media object, or Registry history changed.
- No schema or migration changed, and no database write was made.
- No manifest schema, manifest endpoint, Portable Witness eligibility rule, media gateway, or creator permission rule changed.
- No new index, background worker, cache, persistence layer, or external service was introduced.
- No Global Player, PlayerContext, audio instance, queue, or playback behavior changed.
- No deployment, publication, or release-status change occurred.

## Release boundary

This is a discoverability-only improvement. It does **not** clear the remaining public-release gates established in the readiness evaluation and stabilization records, including the unresolved PWA activation diagnosis and the outstanding authenticated creator-journey/staging acceptance work. The platform remains **NO-GO for deployment** until those separate gates are satisfied and a deployment is explicitly authorized.
