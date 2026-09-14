# Structured Publication Repair Audit

**Status:** In progress — evidence comparison and current-source reconciliation  
**Evidence supplied by Doc:** `README.md`, `repair-report.initial.csv`, `repair-report.initial.json`, `repair-report.csv`, and `repair-report.json`  
**Audit target:** Public discovery, public registered Works, WID API projections, published `/song/` pages, and structured publication output.  
**Authority boundary:** The supplied report is evidence, not a command to alter individual creator records, adjudicate Registry conflicts, generate metadata, or change WIDs/provenance.

## Evidence preserved

The two report snapshots cover the same audit instant (`2026-09-14T15:39:10.542Z`) and the same 702 public registered Works. They report 703 public discovery Works, with one public sitemap Work lacking a WID reference (`/song/840001`). The final report enriches the same 702 rows with the public record’s artwork and audio reference values; it does not mark any source record as changed, and every row still records `actionTaken: read_only_audit`.

| Category | Initial report | Final report | Interpretation |
|---|---:|---:|---|
| Reported public registered Works | 702 | 702 | Same row set |
| Registration used as publication date | 639 | 639 | Unrepaired semantic publication-date defect |
| WID API 404 | 41 | 41 | Registry/page disagreement; cause not established by public evidence |
| Duplicate public WID rows | 10 across 5 WIDs | 10 across 5 WIDs | Requires Registry adjudication, not client/output rewriting |
| Registry/page URL mismatch | 5 | 5 | Unresolved Registry/page projection conflict |
| Registry artwork/audio mismatch | 5 / 5 | 5 / 5 | Unresolved projection conflict |
| Registry title mismatch | 2 | 2 | Unresolved projection conflict |
| Missing creator description | not enumerated | 437 | Newly surfaced absence, not new damage |
| Missing duration | not enumerated | 533 | Newly surfaced absence, not new damage |
| Missing artwork/audio | not enumerated | 2 / 3 | Newly surfaced absence, not new damage |

## Current-source finding

`server/services/og.ts` builds `/song/:id` structured output. It currently passes `song.createdAt` as `witnessDate`; that value is used as `MusicRecording.datePublished`. The same Work model already carries two creator-controlled historical fields:

| Field | Existing meaning | Correct structured-data role |
|---|---|---|
| `songs.releaseDate` | Creator-declared creation date | `dateCreated` when present |
| `songs.creatorReleaseDate` | Creator-declared original release date | `datePublished` when present |
| `songs.createdAt` | System record creation / registration-adjacent timestamp | Not publication; do not map it to `datePublished` |
| `songs.witnessId` / Registry state | Immutable proof identity and governed Registry projection | Identifier/verification only; never derived or rewritten by structured output |

The compatible repair is therefore confined to structured rendering semantics: render creator-declared fields only when present, retain system witness information as distinct witness information, and do not invent a creator date. This repair cannot resolve duplicate WIDs, WID API 404s, Registry/page mismatches, missing creator-supplied descriptions, missing technical duration, or unavailable media references. Those are separately governed data-quality or Registry-adjudication tracks.

## Provisional implementation boundary

1. Change the JSON-LD helper to accept and render distinct `dateCreated` and `datePublished` values.
2. Update the static no-JavaScript body block to distinguish creator-declared dates from `Witnessed` system evidence.
3. Pass `songs.releaseDate` and `songs.creatorReleaseDate` from the existing public Work record.
4. Add regression coverage for: both dates present; either date absent; a WID/system timestamp never substituted as a publication date; and no media/description/duration invention.
5. Do not change the database schema, any Work row, Registry record, WID, provenance event, PNA record, player, Nexus service, or provider boundary.

## Applied compatible repair

The compatible structured-output repair is now implemented in the current source and covered by a focused contract. It changes only the public presentation of already-stored creator declarations; it neither backfills nor alters a declaration.

| Current-source change | Result |
|---|---|
| `buildSongJsonLd()` accepts `creationDate` and `originalReleaseDate` | `MusicRecording.dateCreated` receives only `songs.releaseDate`; `MusicRecording.datePublished` receives only `songs.creatorReleaseDate`. |
| `/song/:id` source mapping | The existing public Work query now supplies the two creator-declared fields to the JSON-LD helper. `songs.createdAt` is no longer used as `datePublished`. |
| Static witness body block | Separately labels creator-declared creation date, creator-declared original release date, and the Living Nexus record-established date. It does not represent one as the other. |
| Calendar-date normalization | A persisted `YYYY-MM-DD` creator declaration remains that exact calendar day; valid date-time evidence is rendered safely; invalid values are omitted. |
| Regression contract | Covers both declarations, an absent-declaration omission path, WID identifier preservation, and exact calendar-day handling. |

The final report’s media enrichment is not a source repair: the initial and final report rows have the same Work set, reported actions, and retained issue categories. Final rows merely replace generic `registry_reference` evidence with the public artwork/audio URLs visible at audit time. This implementation deliberately does not write those URLs back to any record.

## Findings intentionally not applied

| Evidence finding | Why it remains separate |
|---|---|
| 5 duplicate public WID values across 10 public rows | Requires a Registry-level record adjudication protocol. Rewriting values would violate immutable provenance. |
| 41 public WID API 404 results | May be a Registry index/projection disagreement, historical revocation, route behavior, or audit query issue. Cause requires a bounded Registry diagnostic; no public HTML change can safely resolve it. |
| Registry/page title, URL, artwork, and audio mismatches | Each needs source-of-truth comparison and an append-only correction process; neither page output nor client code may silently overwrite the Registry. |
| One public sitemap page without WID | Requires Work-state and sitemap/publication investigation, not WID fabrication. |
| Missing descriptions, durations, artwork, and audio | These are missing creator declarations, missing technical extraction, or unavailable asset references. The platform must not invent them. Core Ingestion may later prepare deterministic technical evidence for creator review. |
| 639 historical registration-as-publication findings | The code repair prevents this mapping for future rendered HTML, but existing Work rows without a creator-declared original release date remain correctly without a `datePublished` value. It does not change their registration history. |

## Validation record

The date-semantic contract passes three focused assertions, and `pnpm check` and `pnpm build` passed. The full suite completed with **645 passing tests, one skipped test, and one failure**. That failure is the established unrelated `cinematicSplash.videoContract.test.ts` CSS-marker assertion for the literal `49.8%` / `50.2%` markers; this repair neither reads nor changes cinematic source. `pnpm refine` retained the established 70/100 platform-score baseline (the report also presents a separate 74/100 aggregate); no whitespace errors were reported by `git diff --check`.

## Sources

1. Doc-supplied `README.md` — Structured publication repair report, received 2026-09-14.
2. Doc-supplied `repair-report.initial.json` and `repair-report.json` — Initial and enriched public audit snapshots, received 2026-09-14.
3. Current source: `server/services/og.ts`; `server/db/songs.ts`.
