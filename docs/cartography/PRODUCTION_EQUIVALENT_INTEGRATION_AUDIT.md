# Read-Only Production-Equivalent Integration Audit

**Status:** In progress — no application data, configuration, payment, webhook, or authentication state has been changed.

## Evidence Taxonomy

| Label | Meaning |
|---|---|
| Observed | A read-only browser, database-metadata, log, or HTTP observation from the current managed runtime. |
| Contract-verified | A source or schema path inspected without executing a state-changing operation. |
| Runtime-unverified | Requires an authenticated user-owned action, state mutation, payment, webhook, or external callback and was not run. |
| Environment delta | Source, migration ledger, database, browser, storage, or configuration facts that do not reconcile yet. |

## Initial Observations

| Audit path | Evidence class | Result | Evidence | Boundary |
|---|---|---|---|---|
| `/explore` public route | Observed | Pass | The production page loaded after the cinematic intro was skipped. It rendered the music-only Explore heading, songs, creators, and WID-MUS identifiers. | Guest observation only; no search mutation or authenticated action was performed. |
| `/song/1710006` public route | Observed | Pass | The production Work page loaded a titled music record with a visible WID-MUS Chain of Record link, creator link, Listen and Support controls, and related works. | No listen, support, download, or checkout control was activated. |
| `/creator/780095` public route | Observed | Pass | The production Creator page loaded a 243-work public catalog with creator testimony, WID-MUS links, play, witness, and support controls. The browser rendered a populated catalog rather than duplicate database rows in the visible range. | Guest observation only; no creator or witness action was activated. The public page is not a substitute for an authenticated owner-domain audit. |
| `/verify/WID-MUS-BC357BF7-57A6F302` public route | Observed | Pass | The verifier returned a resolved audio record, WID-MUS identity, creator history, SHA-256 hash, ECDSA P-256 signature and public key, registration timestamp, certificate action, and a linked WID-ALB collection. | Verification was a read-only lookup; the copy, certificate, profile, and track actions were not activated. |
| Guest OAuth return path | Observed | Pass | The production Sign In URL preserved `/explore` and `/song/1710006` as encoded `returnPath` values. | The OAuth exchange and session creation were not invoked. |
| Live song population | Observed | Partial | Read-only database metadata reported 784 songs, 782 rows with a WID value, all 784 rows with participation-axis values, zero rows with a populated tone profile, and zero rows with a waveform URL. | Counts are sanitized aggregates; individual creator records were not disclosed. |
| Album and playlist population | Observed | Partial | Read-only aggregates reported 55 collections, all with a collection WID and public visibility, and zero public playlists. | The absence of public playlists limits runtime verification of shared-playlist rendering. |
| Migration ledger parity | Environment delta | Open | The deployed Drizzle migration ledger reports 125 entries while the repository contains 156 SQL migration files. The ledger uses hashes, so exact unapplied filenames are not inferred from count alone. | Requires migration-hash reconciliation, not a schema mutation. |
| Song registry completeness | Observed | Partial | The deployed schema contains WID, participation, tone-profile, waveform, download, status, and content-type fields. Sanitized aggregates show 782 of 784 songs carry WIDs and all 784 have participation-axis values, but no row has a populated `toneProfileJson` or `waveformUrl`. | This is a data/readiness finding, not proof that the underlying fields or generation pipeline are absent. |
| Album registry completeness | Observed | Pass | The deployed database reports 55 collections; all 55 expose a collection WID and public visibility. A public verifier lookup also resolved a linked WID-ALB record. | The audit did not create, alter, or test immutability of an album record. |
| Public playlists | Observed | Runtime-limited | The deployed database has zero public playlists. | Public/shared-playlist rendering cannot be exercised against populated public data without a later approved test fixture or creator-owned publication action. |
| Media generation worker | Observed | Fail | Managed logs show VisualQueue and EmbedVideo jobs for existing songs being skipped after FFmpeg reported invalid image/audio data and exceeded stderr buffer limits. | Classified as **data/environment** until the source asset MIME/content and worker limit are inspected; no job was retried or modified. |
| Public storage objects | Observed | Partial pass | Header-only reads of representative public cover, avatar, artwork, and MP3 objects returned HTTP 200 with byte-range support and appropriate image/audio MIME types. One `.jpg` cover response advertised `image/png`, which is a metadata/extension inconsistency but not a failed delivery. | Certificates, Lexicon imagery, and upload/write behavior remain runtime-unverified. |

## Mutation-Prohibited Flows

The following requested flows remain **runtime-unverified by design**: Draft registration, explicit publish, metadata save, free-download delivery, paid checkout, Stripe webhooks, creator gift, witness/unwitness, OAuth login completion, and any purchase, grant, or marketplace fulfillment action. Their source and schema contracts may be audited, but execution requires a later, explicitly authorized sandbox procedure.

## Current Source-Contract Findings

| Area | Evidence class | Result | Exact evidence | Classification |
|---|---|---|---|---|
| Legacy route law | Contract-verified | Mixed | The router redirects `/upload` to `/manifest`, `/dashboard` to `/manage`, `/sessions` to `/manage`, and `/marketplace` to `/avatar-registry`; it mounts `/guide/:id`, `/album/:collectionWid`, `/@:handle`, and `/playlist`. No declarations were found for `/doctrine/haai`, `/registry`, `/guides/keeper/:id`, or `/w/:slug`. | Corrective — route/link audit required. |
| Upload query-state | Contract-verified | Open | `/upload` is a direct redirect to `/manifest`; the route declaration does not show query forwarding for legacy `type` or `editId` values. | Corrective. |
| Guest return-path | Observed + contract-verified | Pass | `getLoginUrl` creates a JSON-encoded state with `returnPath`; production guest links preserved `/explore`, `/song/1710006`, and `/creator/780095`. | Foundation preserved. |
| Dashboard capability reachability | Contract-verified | Open | `/dashboard` redirects to `/manage` while multiple dashboard-oriented components remain present. Whether equivalent capabilities have been moved into Manage requires an authenticated runtime inspection. | Corrective / runtime-unverified. |
| Tip-download checkout | Contract-verified | Fail | `tips.createTipDownloadCheckout` is currently a `publicProcedure` accepting `songId` and a client-supplied URL origin. Its UI may ask the user to sign in, but the server contract itself does not enforce purchaser identity or a trusted origin. | Foundational payment-integrity blocker. |
| Creator tip checkout | Contract-verified | Open | `tips.createCreatorTipCheckout` is also a `publicProcedure` with client-supplied amount and origin. This may be intentional for guest gifting, but purchaser attribution and redirect authority require separate contract review. | Foundational / counsel-and-product-review boundary. |
| Webhook processing | Contract-verified | Partial | The Stripe webhook handler verifies Stripe signatures and has an idempotent `checkout.session.completed` path. Live delivery, return URLs, fulfillment, and retry behavior were not executed. | Runtime-unverified; safe source contract only. |
| Discord capability surface | Contract-verified | Partial | Protected Discord router procedures and a DB-backed webhook service exist, while the legacy `/dashboard` redirect complicates authenticated configuration reachability. | Corrective / authenticated runtime needed. |
