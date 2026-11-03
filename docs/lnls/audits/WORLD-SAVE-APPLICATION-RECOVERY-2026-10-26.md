# Living Nexus — Application World Save and Recovery Verification

**World Save date:** 2026-10-26
**Scope:** Current Living Nexus application only
**Result:** **PRESERVED AND RECOVERY-VERIFIED**
**Deployment, publication, schema migration, or production-data change:** **Not performed**

## 1. Scope and boundary

This World Save preserves the current Living Nexus application: its source tree, configured database snapshot, migration lineage, active website routes, reusable components, server/API composition, design-system dependencies, and recovery evidence.

It explicitly excludes independently developed Jellyfin source code, hosts, databases, releases, and future work. Living Nexus contains local public-catalog and companion-media integration boundaries; those are recorded only as application dependencies. This World Save does not reconcile, modify, rebuild, or assume stewardship of any separate Jellyfin project.

## 2. Source preservation and the aborted upstream merge

The repository was checked before the attempted `user_github/main` reconciliation and again after the abort.

| Check | Result |
| --- | --- |
| Working branch | `review/global-player-cinematic-phase1` |
| Pre-merge application commit | `ee98767f5f21e631deb899b5b160bd2a9dd405e9` |
| Post-abort application commit | `ee98767f5f21e631deb899b5b160bd2a9dd405e9` |
| Pre-/post-abort Git tree | `3fbd88deb9a89b114210324519235b3c3ded094b` — identical |
| Tracked source changes relative to pre-merge state | None |
| Staged changes after abort | None |
| Untracked files after abort | None |
| Merge operation trace | Git reflog records a `rebase (start)` to `user_github/main` followed by `rebase (abort)` returning to this branch. |

The incoming paths visible during the paused reconciliation were exclusively upstream Jellyfin metadata/package/doc changes plus the associated lesson/refinement records. They were excluded by the user’s clarified World Save boundary. No legitimate Living Nexus application modification was present in the working tree before the merge, and none was discarded by the abort.

**Current tracked lineages, intentionally not reconciled in this World Save:**

- Current saved application branch: `ee98767f5f21e631deb899b5b160bd2a9dd405e9`
- `origin/main`: `1d868414a6021cfe06eb40db5f3d6e0c40bbd603`
- `user_github/main`: `936fb32af10c6424d45a73792fb97199dcbcd617`

This records divergence; it is not authorization to merge, rebase, push, deploy, or publish any lineage.

## 3. Fresh database preservation snapshot

A new full logical snapshot was taken using a TiDB transaction snapshot. The earlier 2026-10-21 recovery backup remains intact; this record does not overwrite it.

| Attribute | Verified value |
| --- | --- |
| Configured application database | `7kHkqvMBX9Ci3pQfWTqqQr` |
| Snapshot capture time | `2026-10-26T15:55:53.761Z` |
| TiDB snapshot timestamp | `470032096619921480` |
| Backup format | `living-nexus-tidb-logical-backup/v1` |
| Base tables captured | 157 |
| Views / triggers captured | 0 / 0 |
| Total rows captured | 359,111 |
| Compressed snapshot size | 6,274,324 bytes |
| SHA-256 | `4aef073994371ed1be5d8652382a0ed8b19b329680f7e00d4302e93b71165216` |
| Gzip validation | Passed |

The local recovery vault is permission-restricted. A second byte-for-byte private Drive copy was created in a dedicated World Save folder. It has one permission: the connected owner account; no public or shared link was created. The Drive copy was downloaded once into a temporary protected directory and compared against the local snapshot. Its SHA-256 matched exactly, and the downloaded gzip passed readability validation.

The private snapshot package contains:

1. The compressed logical database export.
2. A source snapshot manifest listing every table and row count.
3. `SHA256SUMS`.
4. The isolated restoration validation report.
5. Local execution metadata kept outside the source repository.

Private storage identifiers and account metadata are deliberately omitted from this repository document.

## 4. Recovery rehearsal — completed safely

The exact new snapshot was restored into a freshly initialized MariaDB instance bound only to a Unix socket with networking disabled. The instance received no production credentials and never connected to the production database. After validation, the local server and restored data directory were stopped and removed.

| Restore check | Result |
| --- | --- |
| Restored tables | 157 / 157 |
| Missing tables | 0 |
| Unexpected tables | 0 |
| Per-table row-count mismatches | 0 |
| Draft without Release Family | 0 |
| Draft track without Draft | 0 |
| Draft track without Work | 0 |
| Draft revision without Draft | 0 |
| Edition publication without Edition | 0 |
| Edition publication event without Edition | 0 |
| Album-edition WID binding without Edition | 0 |
| Isolated restore verdict | **Passed** |
| Temporary restored database after test | Removed |

This is recovery verification, not merely backup creation.

## 5. Schema and migration preservation

The local Drizzle journal contains 141 entries and ends at:

```text
0137_magenta_newton_destine
0138_panoramic_satana
0139_dapper_iron_patriot
0140_outgoing_ink
0141_shiny_betty_brant
```

The configured database has 133 recorded Drizzle migrations. The previously reconciled Stage 1 records are present in order:

| Migration | Database ledger ID | Recorded hash |
| --- | ---: | --- |
| `0140_outgoing_ink` | 2309861 | `3e3463fbf4ceff7d24809b499b6283548c6e45a99c6e2a27dc18b89192512905` |
| `0141_shiny_betty_brant` | 2309862 | `3a62b32e6125b6ee3cd1d69e1c5269a46c3ea5b4b2f09fd04d904533c89717cc` |

The snapshot includes the populated Stage 1 private-release state: 5 Release Families, 5 Draft Releases, 98 Draft membership rows, and 16 Draft revisions. It does not rewrite or reseal any historical Work, WID, declaration, legacy album, media asset, or provenance event.

## 6. Current application validation

The World Save validation operated on the preserved application tree, without code changes before these documentation records.

| Validation | Result |
| --- | --- |
| TypeScript | `pnpm check` passed |
| Regression suite | 153 test files passed; 930 tests passed; 1 file / 1 test intentionally skipped |
| Production build | `pnpm build` passed |
| Git whitespace check | Passed |
| Main local SPA route entry smoke test | 11 of 11 routes returned HTTP 200 |
| LSP / managed project diagnostics | No TypeScript errors reported |

The production build continues to emit an existing Vite chunk-size warning for the main entry. This is retained performance/planning debt, not a failed build or a World Save corruption signal.

The managed development log also retains historical `VisualQueue` startup/backfill database-access failures dated 2026-10-24. They were not reproduced by the fresh snapshot, isolated restore, current TypeScript check, full test suite, or build. They are preserved as an unresolved runtime-configuration observation for a later evidence-led operational check; this World Save does not classify them as a verified production defect or attempt a speculative repair.

## 7. Current application preservation map

The authoritative application dependency map is maintained alongside this record:

- [Living Nexus Application Dependency Map — 2026-10-26](../architecture/APPLICATION-DEPENDENCY-MAP-2026-10-26.md)

It maps the source/runtime layers, principal route families, database domains, canonical authority boundaries, operations dependencies, existing external-integration touchpoints, and the separate-project exclusion.

## 8. Known release and recovery limits retained, not erased

A World Save preserves truth; it does not declare a launch ready or resolve untested workflows. The following evidence-backed conditions remain in effect:

1. **PWA update activation:** the user-facing failure path is known, but its worker-side root cause remains unproven. Do not apply speculative service-worker fixes. See [`RELEASE-STABILIZATION-ARCHIVE-DRAFT-AND-PWA-2026-10-21.md`](RELEASE-STABILIZATION-ARCHIVE-DRAFT-AND-PWA-2026-10-21.md).
2. **Authenticated creator acceptance:** controlled staging-safe journeys remain necessary for Studio, Draft Releases, HAAI corrections, manifest actions, archive export, and comment continuity. This World Save did not create or alter production records.
3. **Managed production startup rehearsal:** remains a separately authorized operational activity with its own safeguards and rollback plan.
4. **WID-ALB2 editions and creator signing keys:** remain intentionally deferred pending their approved security lifecycle.
5. **AI operations:** remain paused by the shared application control plane.
6. **Local-versus-live identity:** this World Save validates the current application branch and database snapshot. It does not make a deployment claim or identify an exact live production server commit.

## 9. Safe recovery instructions

1. Start with the exact source commit recorded in Section 2; do not recover into an unrelated branch.
2. Verify the snapshot SHA-256 before any restoration.
3. Restore only into an isolated, non-production MySQL/TiDB-compatible target first.
4. Compare every table count with the stored snapshot manifest and rerun the relationship checks in Section 4.
5. Verify the Drizzle journal and the database ledger before considering a production recovery.
6. Never use this document as authorization to run `pnpm db:push`, `drizzle-kit migrate`, deploy, publish, or overwrite production data.
7. Preserve current production until an explicit, independently approved recovery runbook authorizes a controlled action.

## 10. Next-session handoff

The next session may focus on the existing Living Nexus product identity, information architecture, UX/UI flows, visual hierarchy, responsive experience, and main webpages. It must begin from this preserved branch, map, backup evidence, and known-gates list.

It should treat the following as non-negotiable until separately changed under approval:

- one canonical application database and Registry authority;
- preserved Work, WID, creator, provenance, declaration, media, and historical-event records;
- same-origin Creator Studio authority;
- one canonical Global Player / PlayerContext queue authority;
- the existing mobile shell’s one `LeftRail` navigation authority;
- AI pause; and
- the boundary between Living Nexus application work and independently developed Jellyfin work.

## 11. No-deployment conclusion

This World Save produced documentation, a private verified database snapshot, a safe restoration rehearsal, and a dependency handoff. It did **not** deploy, publish, migrate, alter production data, alter stored media, modify Registry evidence, create a public backup link, or merge the excluded upstream Jellyfin lineage.
