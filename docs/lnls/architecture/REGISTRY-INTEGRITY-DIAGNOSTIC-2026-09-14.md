# Registry Integrity Diagnostic — 2026-09-14

**Status:** Completed evidence-only diagnostic. **No remediation is authorized by this document.**

**Mission:** Classify the structured-publication audit’s reported public WID/API 404s, duplicate WID ownership, Registry-versus-public-Work projection drift, and sitemap orphan against current canonical implementation and bounded live read evidence.

**Authority boundary:** This diagnostic did **not** modify any Work, WID, provenance event, Registry record, creator declaration, media asset, credential, route, schema, or publication state. It did not read private creator content, and it did not issue or use Registry credentials. A production change requires separate, explicit authorization after a remediation mode is selected.

> A WID is immutable chain-of-record evidence. A collision, missing projection, or public-route disagreement is a condition to classify—not a reason to delete, reissue, silently overwrite, or infer creator testimony.

## Executive finding

The reported findings separate into **four different conditions**, not one Registry failure.

| Condition | Evidence-based classification | Confidence | Immediate safe action |
|---|---|---:|---|
| 41 reported WID API 404s | **Legacy WID Protocol selection defect caused by WID reuse across public and non-public Work rows.** The route selects one row by WID without deterministic public eligibility, then denies the selected deleted/unlisted row. | High | Design a read-only public-projection query; do not alter any WID or Work. |
| 5 WID groups / 10 public rows | **True public WID ownership collision.** One additional deleted row is present across the same five groups. | High | Governed, append-only adjudication; do not choose a winner automatically. |
| 5 URL, 5 artwork, 5 audio, 2 title mismatches | **Expected projection drift downstream of the five public WID collisions.** A WID-only projection deterministically selects the earliest public row while `/song/:id` renders the requested row. | High | Separate Work-instance projection from WID identity before reconciling any presentation. |
| `/song/840001` sitemap orphan | **Sitemap policy mismatch, not missing-index evidence.** The sitemap intentionally includes all public published Works; Registry R1 intentionally requires a WID. | High | Decide whether unregistered public Works belong in the sitemap; never fabricate a WID. |
| Registry provenance route failure | **Live schema/runtime contract divergence.** The current provenance reader expects columns absent from the deployed `wids` table and its request error terminated the development process during this diagnostic. | High | Reconcile schema and read model under a separate schema-first, no-data-mutation plan. |

## Evidence boundary and method

The supplied audit enumerated **703** public discovery/sitemap Works, of which **702** had WID strings; it explicitly retained all row actions as `read_only_audit`. Its final snapshot did not alter source records—it only enriched public media references. [1] [2]

This diagnostic then inspected the present code paths and ran bounded `SELECT` aggregates against the managed database. Public HTTP probes were limited to one representative public WID and the reported 41-WID cohort. No raw testimony, lyrics, private queues, creator corpus, private assets, credentials, or write-capable endpoints were accessed.

| Evidence ID | Source | What it establishes |
|---|---|---|
| E1 | Supplied audit snapshot | Baseline anomaly population: 703 public discovery Works, 702 public WID-bearing Works, 41 reported API 404s, 5 public duplicate WID groups, and one sitemap orphan. [1] [2] |
| E2 | Registry R1 read model | Registry R1 eligibility is exactly `status = Published`, `isPublic = true`, and non-null `witnessId`; its work lookup orders public candidates by creation time. [3] |
| E3 | WID Protocol route | `/api/work/:wid` selects one unqualified Work row by WID with `limit(1)`, then returns 404 if that selected row is deleted or non-public. [4] [5] |
| E4 | Sitemap route | `/sitemap.xml` includes all public published Works and merely lowers priority for entries without WIDs. [6] [7] |
| E5 | Controlled read-only database aggregates | The current database has 703 public published Work rows, 702 Registry-R1-eligible rows, and exactly one public published row without a WID: `song/840001`. |
| E6 | Bounded endpoint probes | All 41 reported WIDs currently return `404 Work is not publicly accessible` from the WID Protocol route, while all 41 return `200` from the Registry R1 work read model. One representative WID also returned those same divergent results from the public domain. |
| E7 | Controlled provenance-route probe and server log | The provenance reader issued a query against `wids.wid`, but the deployed table exposes the legacy `widCode` shape; the request caused a `DrizzleQueryError` and crashed the development process. The server was restarted; no data changed. [3] [8] |

## Current projection model

The three public surfaces are governed by **different eligibility and selection rules**. That distinction explains why public discovery, R1 Registry lookup, WID Protocol lookup, and a `/song/:id` page can disagree without any Work having disappeared.

| Surface | Key / selection | Eligibility | Primary output |
|---|---|---|---|
| Public Work page | Numeric `/song/:id` | The page reads that specific Work record; deleted records render as removed. | Current title, cover, audio URL, and Work-specific page URL. [7] |
| Sitemap | Numeric `/song/:id` | `Published` and `isPublic`; WID is not required. | Every eligible public Work URL; WID affects priority only. [6] |
| Registry R1 work read | WID | `Published`, `isPublic`, non-empty WID; ascending `createdAt`, limit one. | WID, title, genre, creator summary, and `/verify/:wid` URL. [3] |
| WID Protocol `/api/work/:wid` | WID | First matching row, then a second public-access check. The initial lookup is unqualified and unordered. | Work-specific page URL and cover/audio fields if the selected row passes access. [4] [5] |

## Finding A — the 41 reported WID API 404s

### Current evidence

All **41** report-listed WIDs exist in the current song table and each has exactly one public-published Work row. Every member of the cohort also has more than one row sharing the same WID. **Thirty-eight** have exactly one public-published row plus one deleted row; **one** has one public-published row plus one unlisted row; and **two** have one public-published row plus two deleted rows.

The WID Protocol’s lookup does not constrain its initial selection to public/published rows and has no ordering. It can therefore select a historical deleted or unlisted row for a reused WID, after which its visibility guard returns `404 Work is not publicly accessible`. This exact response was observed for all 41 report-listed WIDs. [4] [5]

By contrast, Registry R1 explicitly selects only public published WID-bearing rows. All 41 report-listed WIDs returned `200` from that model in the bounded local recheck. A representative public-domain probe also returned `404` from `/api/work/:wid` and `200` from `/api/registry/v1/works/:wid`.

### Classification

| Current evidence | Likely cause | Confidence | Safe remediation options |
|---|---|---:|---|
| 41/41 WID Protocol 404s resolve in Registry R1; all 41 have a reused WID with non-public history. | The legacy WID Protocol’s unqualified `LIMIT 1` lookup selects the wrong historical row, not an absent WID. | High | **Projection-only repair:** select the public-published Work deterministically for a WID. **Collision-aware repair:** return an explicit ambiguity response when more than one public Work shares the WID. Neither option alters source records. |

The 41-WID cohort has **zero overlap** with the five WID groups that have multiple public-published rows. That distinction matters: the first cohort is an old/non-public-history selection problem; the second is an unresolved public ownership collision.

## Finding B — duplicate public WID ownership and projection drift

### Current evidence

The current database confirms **five** WID groups with **ten** public-published Work rows, matching the supplied report. Across those groups there are **eleven** total rows because one group also contains a deleted historical row. Registry R1 selects a single public projection by ascending creation time. The public Work page instead renders by numeric Work ID, including its own title, cover art, audio URL, and page URL. [3] [7]

The audit’s five URL, five artwork, five audio, and two title mismatches are therefore an observable consequence of resolving a single WID to one member of a multi-public-row group and comparing it with another member’s `/song/:id` surface. This is a **projection disagreement caused by unresolved identity collision**, not evidence that page data should overwrite a Registry record. [1] [2]

| Current evidence | Likely cause | Confidence | Safe remediation options |
|---|---|---:|---|
| 5 WIDs map to 10 public-published Works; the public projections differ by Work-specific title and/or media/page references. | Non-unique WID ownership plus a WID-only public projection that chooses one row. | High | **Append-only adjudication design:** establish an evidence packet per collision, preserve all rows, and record any relationship/correction as new provenance. **Projection-only design:** clearly identify the selected Work instance without asserting it replaces another. |
| 2 title mismatches, but 5 URL/artwork/audio mismatches. | Some colliding rows retain equivalent titles while their Work-specific media/page references differ. | High | Do not normalize titles or copy media URLs across rows. Require creator/keeper evidence before any Work-instance relationship is recorded. |

No duplicate WID is to be deleted, reassigned, replaced, or silently deduplicated under this diagnostic. The correct next step is adjudication design, not a cleanup query.

## Finding C — sitemap orphan `/song/840001`

The current database confirms that Work `840001` is `Published` and public, but has no WID and no supplied cover or audio URL. The sitemap includes it because the sitemap’s documented contract is public publication, not Registry eligibility; Registry R1 excludes it because its contract requires a WID. [6] [7]

| Current evidence | Likely cause | Confidence | Safe remediation options |
|---|---|---:|---|
| One sitemap URL has no WID; it is a public-published Work. | Intentional but divergent eligibility criteria between discovery sitemap and Registry R1. | High | **Policy decision:** retain non-registered public discovery entries, exclude them from the sitemap, or publish separate registered/unregistered sitemap partitions. Any change requires authorization; WID issuance is not a repair mechanism. |

## Finding D — Registry provenance read-model contract drift

The deployed database’s `wids` table presently uses a legacy shape (`widCode`, `fileHash`, metadata, and bigint creation time). The current Drizzle model and `getPublicRegistryProvenance()` instead request `wid`, `eventId`, `contentHash`, `creatorId`, `signature`, and timestamp fields. The provenance endpoint consequently attempted to query an absent `wids.wid` column and the unhandled failure terminated the development process during a single read-only probe. [3] [8]

This is **not** the causal explanation for the 41 WID Protocol 404s—the WID Protocol reads `songs` directly—but it is a separate blocker for Registry R1 provenance projection and any claim that the current `wids` table is being read through the declared schema.

| Current evidence | Likely cause | Confidence | Safe remediation options |
|---|---|---:|---|
| Provenance route queries columns absent from the deployed table; the table has zero current `widCode` rows. | Unreconciled schema evolution between deployed database and current Drizzle Registry model. | High | **Schema-first reconciliation design:** inventory authoritative historical tables, choose an additive adapter or reviewed migration, add read-model error containment, and validate against a cloned/staging schema before touching production records. |

## Preservation-first remediation modes

The following are **choices for later authorization**, not actions taken here.

| Mode | Scope | Preserves | Explicitly does not do |
|---|---|---|---|
| **A. Public projection repair only** | Repair WID Protocol selection, collision signaling, and provenance-route error handling. | Existing Work rows, WIDs, creator declarations, and provenance. | No data repair, reissue, backfill, title/media synchronization, or sitemap-policy change. |
| **B. Append-only collision adjudication** | Evidence packet and Keeper/creator review for each of five public collision groups. | Every original Work and WID; creates only governed additional correction/relationship evidence if later approved. | No automatic winner selection, deletion, replacement, or silent “dedupe.” |
| **C. Registry index / schema reconciliation** | Reconcile the deployed WID table with the Registry R1 provenance read model and build repeatable integrity checks. | Existing database records and confidentiality boundaries. | No force schema push, destructive migration, production backfill, or credential issuance. |
| **D. Discovery policy decision** | Decide whether public non-registered Works such as `840001` belong in sitemap discovery. | The existing public Work and its lack of Registry status. | No fabricated WID, automatic registration, or inferred media metadata. |

## Required authorization gates

Before any mode is implemented, the following gates remain mandatory.

| Gate | Required decision |
|---|---|
| Public API behavior | Whether duplicated public WIDs return a chosen public projection, an explicit ambiguity response, or a collection of candidate Work references. |
| Collision adjudication | Who may supply/approve evidence for each WID group and which append-only provenance event, if any, records the outcome. |
| Schema authority | Which deployed WID/provenance table is authoritative, whether an adapter is sufficient, and whether an additive migration is approved. |
| Sitemap policy | Whether unregistered public Works remain discoverable in the sitemap. |
| Validation | Route contracts for public/published, deleted, unlisted, single-WID, duplicate-public-WID, and absent-WID cases; no browser or service credential exposure. |

## Non-actions recorded

No Registry/WID/Work/provenance/creator row was changed. No title, page URL, artwork URL, audio URL, date, description, duration, or media field was copied or inferred. No credential was issued, rotated, exposed, or used. No publication or public deployment occurred. The development server was restarted only to restore the local development process after the diagnostic provenance-route probe; this did not modify source or database state.

## Sources

[1]: ./STRUCTURED-PUBLICATION-REPAIR-AUDIT.md "Structured Publication Repair Audit"
[2]: ../../../upload/README.md "Doc-supplied structured-publication repair report README"
[3]: ../../../server/registry/readService.ts "Registry R1 public read model"
[4]: ../../../server/routes/workRoute.ts "WID Protocol public route"
[5]: ../../../server/db/songs.ts "Canonical Work lookup helper"
[6]: ../../../server/routes/sitemapRoute.ts "Dynamic sitemap route"
[7]: ../../../client/src/pages/loop/LoopWorkPage.tsx "Public Work projection"
[8]: ../../../drizzle/schema.ts "Current Drizzle Registry and Work schema declaration"
