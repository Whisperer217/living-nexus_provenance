# Living Nexus — Full Platform Readiness Evaluation

**Audit date:** 2026-10-21
**Target:** Public launch on 2027-01-01
**Decision:** **NO-GO at this audit point.** The public frontend now includes the latest same-origin Creator Studio checkpoint, but the configured production database has a material Drizzle migration-ledger discrepancy. A routine deployment currently risks failing before application startup. No migration, deployment, source change, data change, publication, or checkpoint was performed by this audit.

## 1. Scope, method, and status vocabulary

This was a bounded, read-only evaluation. It reused the governing architecture decision, implementation records, current source, current test suite, a fresh local build, read-only SQL, and non-destructive public and authenticated production browser observations. It did **not** create a Work, Draft Release, playlist, comment, export archive, payment, upload, PWA update, or AI request.

Status meanings used below:

- **VERIFIED WORKING** — current production observation and/or current executable validation directly supports the implemented behavior; this is not a claim that every edge case has been accepted.
- **PARTIALLY WORKING** — the core route/contract is implemented and supported, but a required workflow stage, production acceptance action, scope, or edge case remains unverified or incomplete.
- **BROKEN** — a deterministic defect was observed, or current code makes the promised flow fail.
- **NOT IMPLEMENTED** — no active implementation was found for the requested scope.
- **DEFERRED** — intentionally held behind an approved architecture or security gate.
- **UNTESTED** — implementation may exist, but the required production/interaction evidence was not safely obtained in this read-only audit.

Historic implementation reports correctly described their state as “not deployed” when they were written. They are not treated as current deployment truth where newer live evidence supersedes them.

## 2. Platform truth: checkpoint versus production

| Question | Evidence | Determination |
| --- | --- | --- |
| Latest local checkpoint | Git `HEAD` is `57f0d199082e18aef90642e873fdd41528bf86c0`, dated `2026-10-21T16:20:25Z`, subject **Creator Studio same-origin consolidation**. The working branch is `review/global-player-cinematic-phase1`. `git status --short --branch` was clean before this report file was written. | **Verified local checkpoint.** |
| Current source validation | Fresh `pnpm check` completed successfully. Fresh full `pnpm test` completed with **146 passed test files, 903 passed tests, 1 intentional skip**. Fresh `pnpm build` completed successfully. A focused readiness subset passed **11 files / 51 tests**. | **Verified current local validation.** The pnpm command emitted a package-configuration deprecation warning; it was not a TypeScript or test failure. |
| Public production frontend | `https://www.livingnexus.org/` served `assets/index-D3Sq1o9T.js`. Its SHA-256 exactly matched the fresh checkpoint build: `003e636ca0e4f9417274c2c3565209f449b82c5041514a925764ccd508178601`. Production `CreatorStudioHome-iUwblpGw.js` exactly matched the fresh checkpoint build: `a3e7fa2b2313ea42b8094f171ad7fefb1ebfd6aec9a725ed1c4482dbf15dee1a`. | **The latest Studio frontend checkpoint is live.** |
| Exact deployed server commit | Static assets do not expose a full Git SHA, and there is no audited production version endpoint. Only the main bundle and Studio lazy bundle were byte-compared. | **Not determinable.** Do not claim the entire server/runtime is at `57f0d199` solely from the matched frontend assets. |
| Live production Studio | Authenticated production browser observation at `/studio` loaded a creator workspace with 52 published Works, three Draft Releases, three playlists, identity, Archive Export, Creator Payouts, Archive, and the external companion boundary. | **Verified working as a live authenticated landing surface.** |
| Production database schema | Read-only SQL confirmed the expected Stage 1 Release/Draft/Future-Edition table family exists. Current aggregate state: 5 release families, 5 Draft Releases, 98 Draft membership rows, 16 Draft revisions, 0 sealed editions, 0 edition-publication records/events, and 0 WID resource bindings. | **Schema exists; Draft Release data exists; sealing has not occurred.** |
| Migration ledger | The local Drizzle journal has entries through `0141_shiny_betty_brant`; the configured database has 131 migration ledger records and **zero** records at or after the `0140`/`0141` journal timestamps. The Stage 1 SQL is non-idempotent `CREATE TABLE`, `ALTER TABLE`, index, and constraint DDL. Production startup runs `drizzle-kit migrate && NODE_ENV=production node dist/index.js`. | **P0 release blocker — schema and migration history are not reconciled.** A normal deployment could attempt DDL for objects that already exist and fail before server start. |

### Production observations made during this audit

- A signed-out visit to `/song/60001` loaded the public Work **PUSH FORWARD**, its WID (`WID-MUS-F61EC526-F2E36FBC`), participation declaration, provenance history, Creator link, Voices section, related Works, and listener-facing download/support entry points.
- A signed-in visit to `/creator/collections` loaded three private Draft Releases, four preserved legacy WID-ALB albums, and three named playlists without revealing Draft Releases in the earlier signed-out control.
- A signed-in visit to `/settings/payouts` loaded **Payouts are ready** and clearly stated that Stripe owns identity, tax, and bank-detail collection.
- A signed-in visit to `/my-archive/export` loaded 71 Works in eight ten-Work batches and offered a batch archive plus full account JSON. No archive download was initiated.
- A signed-in visit to `/pna` visibly labeled the service **WORK IN PROGRESS** and **MODEL OPERATIONS PAUSED** while retaining private thread/context/artifact inspection.

## 3. Migration integrity finding — release stop condition

The Stage 1 migration scripts are present in the checkpoint:

- `drizzle/0140_outgoing_ink.sql:1-104` creates the Release Family, Draft Release, Draft membership, Future Edition, Edition member, and Edition artifact tables and indexes.
- `drizzle/0141_shiny_betty_brant.sql:1-73` creates Draft revision, Edition publication/event, and typed WID resource-binding tables; it also alters existing Stage 1 tables and adds unique constraints.

The database has the resulting tables and active Draft data, but it does not show ledger records for the Stage 1 migration timestamps. Because the Docker runtime executes Drizzle migrations before Node starts, this is not documentation debt: it is a deploy/startup hazard.

**What this audit did not do:** it did not invoke `drizzle-kit migrate`, edit the journal, insert migration metadata, retry a migration, back up data, or change database schema. That is deliberate. Reconciliation is a high-risk change involving production history and must be separately designed, backed up, dry-run against an equivalent database, and explicitly approved.

## 4. Capability readiness matrix

### Public platform, registry, playback, and PNA

| Capability | Status | Evidence and qualification |
| --- | --- | --- |
| Public Work page, Creator attribution, WID display, and read-only provenance presentation | **VERIFIED WORKING** | Guest production observation of `/song/60001` rendered Work, WID, participation, provenance, creator, related Works, and Voices. Public selection hardening is covered by `server/tests/registryPublicProjection.contract.test.ts`. |
| Public WID resolver / verification endpoint | **PARTIALLY WORKING** | Current source fails closed for ambiguous public WID projections (`server/routes/workRoute.ts:34-50`) and the public registry handler returns a typed 503 rather than a raw failure. The dedicated live `/verify/:wid` submission was not exercised in this audit. |
| Canonical Living Nexus playback queue | **PARTIALLY WORKING** | `client/src/contexts/PlayerContext.tsx:234-270` holds the main module-level audio singleton; the active Global Player uses it. Current tests pass, and player controls were visible in production, but no continuous end-to-end playback/queue-advance run was performed. |
| Global Player comment target continuity | **PARTIALLY WORKING** | `GlobalPlayer` snapshots the comment target and submits the captured `songId` (`client/src/components/player/GlobalPlayer.tsx:506-565`); relevant current contracts passed. An authenticated production A → B → submit acceptance action was intentionally not performed because it would publish a comment. |
| Dormant alternate player comment surfaces | **UNTESTED** | `PlayerBar.tsx` and `MobilePlayerPanel.tsx` have no active imports. `WitnessSurfacePlayer` is mounted but its surface and expanded panels return `null` (`WitnessSurfacePlayer.tsx:101-106`, `301-307`). `TheaterPlayer` is mounted but has no discovered normal `openTheater()` caller; it still contains a current-track comment submit path. These must not be reactivated without target-snapshot parity tests. They are not evidence that the active Global Player repair is broken. |
| External ambient audio | **PARTIALLY WORKING** | `AmbientPlayerContext` is an explicit, separate external-media player (`client/src/contexts/AmbientPlayerContext.tsx:59-125`) used by the External Playlists surface. It intentionally does not mutate the Living Nexus queue, but it means “one audio element everywhere” is not literally true. Its concurrent-audio behavior was not accepted in this audit. |
| PWA installation/update lifecycle | **BROKEN** | The production update banner was present. Current source has a client-side 8-second activation limit (`client/src/main.tsx:154-257`); failure falls back to the generic “The update did not finish” message (`PWAInstallBanner.tsx:142-150`). The follow-up audit confirms the actual worker-side cause remains unknown and normal browser refresh is the only supported recovery. |
| PNA private service shell, threads, Context Envelope, and artifact inspection | **VERIFIED WORKING** | Authenticated production `/pna` rendered the private workspace and inspection rails. Service-router, error-boundary, and mobile-surface contracts pass. |
| AI/LLM, image-generation, and transcription operations | **DEFERRED** | The shared control plane sets `AI_OPERATIONS_ENABLED = false` (`shared/aiAvailability.ts:8-24`). Current pause contracts prove LLM/image calls are rejected before provider fetch and transcription does not download media; live PNA explicitly states model operations are paused. This is an intentional safety and cost hold, not an AI feature pass. |
| PNA Quiver preservation actions | **UNTESTED** | Private Quiver and review flow source/contracts exist, but no private asset was created, reviewed, preserved, or discarded in this audit. AI-generated proposals are unavailable while operations are paused. |

### Creator Studio and creator workflow

| Capability | Status | Evidence and qualification |
| --- | --- | --- |
| Same-origin Creator Studio navigation and authenticated access | **VERIFIED WORKING** | Production `/studio` loaded for the authenticated creator and presented all intended destinations, Works, Draft/playlist count metadata, and companion boundary. Guest source gate is explicit in `CreatorStudioHome.tsx:130-154`; queries are guarded by authenticated state at `117-128`. |
| Creator Domain and Manage entry into Studio | **PARTIALLY WORKING** | Source and contracts show owner entry points from the canonical Creator Domain and `/manage`; production Studio breadcrumb rendered Creator Domain. This audit did not click each origin and return path. |
| Recent Works listing and canonical Work edit handoff | **PARTIALLY WORKING** | Production Studio displayed recent Works and Edit controls. The code delegates to `WorkEditorContext` (`CreatorStudioHome.tsx:20-53`, `238-241`), not a second mutation route. Editing and saving were not invoked. |
| Canonical music registration and embedded metadata review | **PARTIALLY WORKING** | `/manifest` is the canonical destination. The active Loop gateway is intentionally **music-only** and extracts/requests review of supported audio metadata (`TypeGateway.tsx:1-4, 39-54, 165-171`); current registration-presentation contracts passed. No production upload, registration, or seal was performed. |
| Broad unified ingestion for images, video, documents, code, ZIPs, folders, and all media | **NOT IMPLEMENTED** | The active Loop Type Gateway says “Music-only provenance entry” and accepts audio formats. Other legacy pages/components exist, but they are not a confirmed unified canonical cross-medium engine. The public narrative must not state that the single active Loop registration flow supports every requested media type. |
| MP3 multi-Work review queue | **PARTIALLY WORKING** | Source/contracts cover a 20-file MP3 queue, per-Work review, disclosure, attestation, WID sealing choice, progress, preview, reordering, and bulk metadata proposals. It was not run with real files in this audit. |
| HAAI participation declaration corrections | **PARTIALLY WORKING** | A protected, transactional `songs.correctDeclaration` action and append-only Work-event presentation are covered by current contracts. The implementation preserves the original WID/media/relationships; final production owner submission was not performed. |
| Draft Releases / Collections | **PARTIALLY WORKING** | Live workspace displayed current private drafts; current 51-test focused readiness subset includes Draft policy/workspace coverage. Creation, edit, reorder, and archive were not invoked because they write production data. |
| Named Playlists | **PARTIALLY WORKING** | Live Collections showed existing named playlists; implementation keeps their one canonical editor and intentional duplicate Work occurrences. No live playlist mutation or external-player import was performed. |
| Legacy WID-ALB records | **PARTIALLY WORKING** | Live Collections displayed four preserved albums with their presentation/manifest/recovery entry points. Stage 0 fails closed on a composition-hash mismatch; mismatched public legacy albums are intentionally omitted from Creator Domain shelves and can be used only as a lineage source for a separate private Draft. No public album/manifest action was invoked. |
| WID-ALB2 sealed editions, creator signing keys, publication, public edition projection, and edition manifest export | **DEFERRED** | Intentional security hold. `albumEditions`, publication tables, and resource bindings have zero rows. `releaseDrafts` reports `RELEASE_SIGNING_HOLD`; the governing Collections record requires an approved signer/key lifecycle first. |
| Owner-authorized Provenance Player manifests (Work, playlist, public canonical album) | **PARTIALLY WORKING** | Current contracts and prior real-record adapter checks support owner-only `living-nexus-player/1` export, ordered lists, no raw media URL, and a revocable no-store gateway. The audit did not copy/paste/import a current production manifest or test post-withdrawal denial. No account sync, shared playback, or WID verification by the external player is implemented. |
| Creator Data Archive / preservation export | **PARTIALLY WORKING** | Live production page loaded 71 Works, pagination, batch action, and full JSON option. The active batch button calls `/api/creator-export/batch`; server code authenticates the owner and streams ZIPs containing fetched audio/cover binary files with URL fallback on fetch failure (`CreatorDataExportPage.tsx:179-205`, `creatorExportRoute.ts:56-236`). No real download was initiated. The visible explanatory copy at `CreatorDataExportPage.tsx:416-419` incorrectly says ZIPs contain only URLs; it conflicts with the active server implementation. |
| Creator payouts / Stripe Connect entry point | **PARTIALLY WORKING** | Authenticated production rendered “Payouts are ready.” Current contracts verify the canonical `/settings/payouts` route and server-owned return/refresh allowlisting. No actual support payment or payout was initiated, so financial settlement remains untested. |
| Support and licensed downloads | **PARTIALLY WORKING** | Guest Work page showed Support and Free Download controls. Source enforces download permissions and uses an authenticated/bounded batch route. No payment, license grant, or actual download was performed. |
| Mobile/responsive Creator Studio | **PARTIALLY WORKING** | Earlier checkpoint validation documented a contained 375×812 Studio layout. Current 375×812 route captures rendered without observed horizontal overflow, but the pre-existing What’s New modal covered the underlying local route content. No authenticated mobile create/edit/playback interaction was performed. |
| Accessibility across creator workflows | **UNTESTED** | Source includes focus styles, semantic headings, and reduced-motion handling. This audit did not run a full assistive-technology or automated accessibility acceptance pass. |

## 5. Creator Studio workflow map and friction assessment

The live Studio is correctly a **same-origin composition hub**, not a duplicated backend. `CreatorStudioHome.tsx:105-113` expressly keeps registry, persistence, playback, and authorization in existing authoritative systems. Its destinations are:

```text
Creator Domain / Manage
  -> /studio
       -> /manifest                 Register a Work
       -> /creator/collections      Draft Releases, legacy WID-ALB, named playlists
       -> Profile / Creator Domain  Identity and public presence
       -> /my-archive/export        Archive export
       -> /settings/payouts         Stripe Connect payout readiness
       -> /archive                  Historic records/recovery
       -> WorkEditorContext          Existing canonical Work editor
       -> external Provenance Player Experimental companion only
```

This reduces the highest-risk form of duplication: it does not make another registry, database, Work mutation API, cookie scope, PlayerContext, or playback queue. It is the correct current modularity boundary under the governing extraction ADR.

However, a creator still encounters overlapping historical surfaces: `/manage`, `/profile`, canonical Creator Domain, `/archive`, Collections, the Studio hub, and legacy pages. The hub clarifies destinations, but it does not yet remove all old navigation/copy. This is workflow friction, not evidence of a second registry authority.

### Confirmed route and content drift

1. **Broken Draft continuation.** `ArchivePage.tsx:1229-1257` generates `/upload?editId=<id>&type=<type>`, but `App.tsx:331-333` redirects every `/upload` request to `/manifest`, dropping both parameters. A direct production sandbox observation confirmed it lands at `/manifest` without the edit context. This is **BROKEN**.
2. **Stale release-note copy.** `WhatsNewModal.tsx:94-96` states that `/book/:id/studio` is a full Creator Focus workspace, while `App.tsx:349` redirects `/book/:id/studio` to `/manage`. The message is inaccurate and can send creators toward a non-existent experience.
3. **Dormant source remains.** `CreatorStudioPage.tsx` and `UploadVNextPage.tsx` remain on disk, but the Creator Studio lazy import was removed and `/upload` redirects to `/manifest`. Their presence is not active product functionality, but it increases maintenance ambiguity. Do not delete or refactor them automatically; retire or preserve them only in a separately approved cleanup slice.
4. **Archive copy contradiction.** The visible archive notice says batches provide URLs, while the active route attempts binary archive retrieval. The actual result still depends on CDN response and the 30-second audio/15-second cover-art fetch windows. The right conclusion is not “exports are broken,” but “copy and actual fallback behavior need reconciliation and a non-destructive large-export acceptance test.”

## 6. Known defects, deferred work, and prioritization

### P0 — launch/deployment blocker

| Item | Why it blocks release | Required next action (not performed) |
| --- | --- | --- |
| Drizzle schema/ledger mismatch | Tables and data exist while Stage 1 migration history is absent. Current production container starts by running Drizzle migrations; the next deployment can fail on non-idempotent existing objects. | Separate high-risk migration-lineage reconciliation: verify hashes and all missing ledger records, create/verify backup, rehearse on an equivalent database, define rollback/forward recovery, then seek explicit approval before any migration metadata or schema action. |

### P1 — correct before public launch acceptance

| Item | Evidence | Required direction |
| --- | --- | --- |
| Archive Draft “Continue” loses selected Draft | Direct URL observation plus `ArchivePage.tsx:1236` and `/upload` redirect. | Replace the obsolete resume URL with a route that preserves the correct existing draft/edit context. Add an end-to-end route contract and browser test. |
| PWA update failure has no identified worker-side cause | Current 8-second timeout and prior investigation. | Trace an actual failing worker’s state/message/cache error before changing timeout/cache logic. Preserve listener-approved updates and playback continuity. |
| Global Player final authenticated A → B comment submission | Current code/tests are correct for Global Player but production final submission was not performed. | Execute a controlled staging/review acceptance test with a test Work, then remove its test comment only under an explicitly authorized moderation/test plan if needed. |
| Draft Release write journey | Production lists drafts, but this audit did not create/edit/reorder/archive. | Controlled owner acceptance canary only after migration lineage is reconciled. Include unauthorized, conflict, legacy recovery, mobile, and return-path cases. |
| Provenance Player live owner handoff | Adapter/gateway contracts are strong; current production owner copy/paste/import and withdrawal denial were not performed. | Run a controlled owner acceptance session using eligible test records; verify order, gateway playback, and withdrawal denial without claiming account sync. |

### P2 — launch quality and maintainability debt

- The current refinement result remains **70/100 (C)** with ten open ledger items. Priority pages include Song Detail attribution/discoverability, Archive attribution/support, Home trust/discoverability, Dashboard support, and Work List Row discoverability. The debt ledger also identifies typography fragmentation, `exploreIndex` database-query/cache debt, and high-risk monolithic page files.
- The fresh build’s main JavaScript asset is **1,254,747 bytes** raw (`index-D3Sq1o9T.js`; build output reported approximately 347.74 kB gzip). Major lazy chunks include Keeper, G-code preview, Dashboard, PDF, Manifestation Studio, Upload, Profile, PNA, Archive, and Admin. This is evidence of bundle-size risk, not an observed field performance failure. No Lighthouse/real-device memory benchmark was run in this audit.
- Pnpm warns that the package’s legacy `pnpm.patchedDependencies` and `pnpm.overrides` fields are ignored by the installed pnpm version. Builds/tests currently pass, but toolchain configuration needs a separately scoped dependency-maintenance review before assuming the patch/override policy still applies.
- The Workspace includes explicit code comments and disabled alternate player surfaces. Preserve them until a bounded retirement plan is approved; do not reactivate them without playback/comment-target parity tests.

## 7. Security, identity, and authority boundaries confirmed

- Creator Studio remains on `www.livingnexus.org/studio` and uses the existing same-origin auth/tRPC authority. The separate-origin `studio.livingnexus.org` approach remains **not implemented** and requires a BFF, short-lived audience-bound assertion, narrow Creator Gateway, and explicit security acceptance. See `docs/lnls/adr/CREATOR-STUDIO-EXTRACTION-ASSESSMENT-2026-10-21.md:9-43, 62-109`.
- Current public WID reads reject ambiguity rather than silently selecting a Work; registry read failures return a typed non-disclosing failure.
- The approved Provenance Player bridge uses a revocable media gateway rather than raw storage URLs. It does not claim account connection, WID verification in the companion, or shared playback.
- The AI pause is active from one shared control plane. The PNA workspace does not register, publish, or alter a Work simply by attaching context.
- WID-ALB2 issuance, creator signing keys, sealed edition publication, and public edition projection remain held. This is the correct outcome until a creator-key threat model, enrollment, rotation/revocation, recovery, verifier, and long-term signature strategy receive separate approval.

## 8. Readiness gate for the 2027-01-01 target

Living Nexus is not “empty” or merely checkpointed: current evidence proves the latest Studio frontend is serving publicly and that key creator and public platform surfaces are live. It is nevertheless **not ready to be called launch-ready today**.

### Required gates before a launch recommendation

1. **Resolve the migration ledger mismatch first.** No ordinary deployment or publication should proceed until the schema/history state is reconciled under a separately approved high-risk runbook.
2. **Repair the Archive draft-resume route.** It is a directly observed creator-flow defect.
3. **Obtain worker-state evidence for the PWA activation failure.** Do not apply speculative cache or timeout patches.
4. **Run bounded staging/production acceptance canaries after the migration gate:** Studio entry and return paths; Draft create/edit/reorder/archive; HAAI correction; Work/album/playlist manifest copy/import and withdrawal; Global Player A → B comment submit; creator archive binary download; mobile focused workflows; and an authorized support/payout test path.
5. **Publish an accurate capability statement.** Describe current Loop registration as audio/music-focused; Draft Releases as private; WID-ALB2 editions as deferred; PNA model operations as paused; and the Provenance Player as an external experimental companion without account/queue synchronization.

## 9. No-deployment conclusion

This audit did **not** modify code, refactor, migrate, deploy, publish, create a checkpoint, manipulate production data, create a Creator record, post a comment, trigger a payment, export private data, or activate any AI operation.

The latest Creator Studio frontend checkpoint is demonstrably live, but the exact production server commit remains unproven and the database migration ledger is unreconciled. **No deployment or launch is authorized by this audit.**

## Evidence register

- Current checkpoint / source: `57f0d199082e18aef90642e873fdd41528bf86c0`, branch `review/global-player-cinematic-phase1`.
- Governing risk amendment: `/home/ubuntu/upload/pasted_content_4.txt:1-97`.
- Studio implementation: `client/src/studio/CreatorStudioHome.tsx:105-241`; historical implementation record: `docs/lnls/audits/CREATOR-STUDIO-SAME-ORIGIN-CONSOLIDATION-IMPLEMENTATION-2026-10-21.md:7-78`.
- Collections and hold: `docs/lnls/audits/COLLECTIONS-STAGE-1-DRAFT-WORKSPACE-IMPLEMENTATION-2026-10-21.md:10-67`.
- Routes and redirects: `client/src/App.tsx:320-445`; archive continuation: `client/src/pages/ArchivePage.tsx:1224-1264`.
- Migration scripts: `drizzle/0140_outgoing_ink.sql:1-104`; `drizzle/0141_shiny_betty_brant.sql:1-73`; migration lineage contract: `server/tests/drizzleMigrationLineage.contract.test.ts:17-57`.
- Comments: `client/src/components/player/GlobalPlayer.tsx:506-565`; comment audit: `docs/lnls/audits/COMMENT-ATTRIBUTION-AND-PLAYBACK-CONTINUITY-ASSESSMENT-2026-10-20.md:39-69`.
- PWA: `client/src/main.tsx:154-257`; `client/src/components/PWAInstallBanner.tsx:142-150`; `docs/lnls/audits/PWA-UPDATE-TIMEOUT-FOLLOWUP-2026-10-20.md:8-31`.
- Manifest bridge: `docs/lnls/audits/PROVENANCE-PLAYER-MANIFEST-COPY-IMPLEMENTATION-2026-10-20.md:9-61`.
- Export: `client/src/pages/CreatorDataExportPage.tsx:179-223, 405-419`; `server/routes/creatorExportRoute.ts:56-236`.
- AI pause: `shared/aiAvailability.ts:1-24`; `server/tests/aiOperationsPause.contract.test.ts:16-65`.
- Debt ledger: `refinement/debt.ts:28-170`; isolated refinement report `refinement/reports/2026-10-21-steward-report.json` recorded platform score 70/C with ten open debt items.
- Browser evidence: read-only production observations made on 2026-10-21 at `/song/60001`, `/studio`, `/creator/collections`, `/settings/payouts`, `/my-archive/export`, and `/pna`; a sandbox legacy URL observation at `/upload?editId=60001&type=audio` redirected to `/manifest`.
