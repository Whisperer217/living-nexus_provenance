# Production-Equivalent Integration Audit Matrix

**Audit mode:** Read-only. **Date:** 2026-08-13–14 CDT. **Author:** Manus AI.

> **Legal review boundary.** This audit distinguishes code and runtime facts from creator declarations, independently observable evidence, and legal claims. It is not legal advice. No statement here determines ownership, enforceability, compliance, liability, or entitlement; those remain unresolved without qualified counsel and the relevant contractual record.

## Audit Scope and Evidence Rules

The audit compared the current repository, the managed database attached to the project, the public production site, source contracts, storage headers, and managed runtime logs. It did **not** create a Draft, publish a work, authenticate through OAuth, execute checkout, invoke a webhook, grant an item, download a protected file, alter a domain, write storage, change configuration, or reveal credentials.

| Evidence label | Meaning | Permitted conclusion |
|---|---|---|
| **Observed** | Read-only browser, database metadata, HTTP header, or log observation. | The named fact occurred in the observed environment. |
| **Contract-verified** | Source/schema procedure inspection without execution. | The current code exposes the documented contract. |
| **Runtime-unverified** | Requires user session, mutation, payment, webhook, external callback, or a missing populated record. | No operational conclusion. |
| **Environment delta** | Repository, DB ledger, worker, storage, browser, or configuration facts do not reconcile. | Investigation is required before a change is authorized. |

## Executive Result

The **public provenance spine is operational** in the observed guest runtime: Explore loaded music records; a Work page resolved; a populated Creator page resolved; and a WID-MUS record verified with a linked WID-ALB record. The highest risks are not in that public read path. They are in **migration reconciliation, payment identity/return authority, batch publish parity, unresolved legacy links, unpopulated tone/waveform data, zero public playlists, and a failing media transformation worker**.

| Status | Count | Meaning |
|---|---:|---|
| Pass | 8 | Observed or contract-verified without contrary evidence. |
| Partial / Open | 14 | Contract exists or transport works, but data, runtime, or reconciliation evidence is incomplete. |
| Fail / Blocker | 8 | Current source or runtime evidence contradicts the stated target architecture. |
| Not run by design | 11 | Would require a state-changing or user-owned action. |

## Pass–Fail Matrix

| Domain | Exact route, procedure, or record | Evidence | Status | Finding | Classification |
|---|---|---|---|---|---|
| Public discovery | `/explore` | Observed production browser | Pass | Music-only Explore rendered public songs, creators, and WID-MUS labels after the introductory splash. | Runtime fact |
| Public Work | `/song/1710006` | Observed production browser | Pass | Work loaded with Chain of Record, WID-MUS, creator, Listen, Support, and related-work controls. | Runtime fact |
| Public Creator | `/creator/780095` | Observed production browser | Pass | Populated Creator page loaded a 243-work catalog with testimony, WID links, play, witness, and support controls. | Runtime fact |
| Public verification | `/verify/WID-MUS-BC357BF7-57A6F302` | Observed production browser | Pass | Verifier returned an audio record, WID-MUS, linked WID-ALB, hash, signature, public key, registration date, and creator history. | Runtime fact |
| Guest return path | `getLoginUrl`, public Sign In links | Observed + contract-verified | Pass | Guest Sign In links retained `/explore`, `/song/1710006`, and `/creator/780095` as encoded return paths. OAuth completion was not run. | Runtime fact / contract |
| WID fields | `songs` live table | Observed DB aggregate | Partial | 782 of 784 songs have a WID value. The two rows without WIDs require provenance-readiness review. | Data |
| Participation axes | `songs` live table | Observed DB aggregate | Pass | All 784 songs have Music/Lyrics/Voice participation values, currently including defaults. | Data fact |
| Tone profile | `songs.toneProfileJson` | Observed DB aggregate | Partial | Zero populated tone profiles were observed. The field and Music Environment write contract exist; readiness data is absent. | Data |
| Waveform | `songs.waveformUrl` | Observed DB aggregate | Partial | Zero waveform URLs were observed. The field and write contract exist; output data is absent. | Data / worker |
| Album registry | `collections`, verifier | Observed DB aggregate + verification | Pass | 55 collections were observed; all carry a collection WID and public visibility. One WID-ALB was publicly verified through a linked work. | Runtime fact |
| Public playlists | `playlists.isPublic` | Observed DB aggregate | Partial | Zero public playlists exist, so shared-playlist rendering cannot be verified with real populated data. | Data |
| Creator scale | `/creator/780095` | Observed production browser | Partial | A 243-work creator surface rendered; visible cards did not show obvious duplicates in the inspected range. Query timing and full duplicate analysis were not measured. | Runtime fact / performance-unverified |
| Migration parity | `__drizzle_migrations` vs. `drizzle/*.sql` | Observed DB + repository count | Open | Live ledger: 125 entries. Repository SQL files: 156. Drizzle ledger hashes cannot be mapped to filenames by count alone. | Environment / configuration |
| Schema parity | `information_schema` vs. `drizzle/schema.ts` | Observed metadata + source | Partial | Live camel-case song fields for WID, participation, download, and media exist. Full table/column/index/enum parity remains open until migration hashes and complete information-schema extracts are reconciled. | Environment |
| Legacy registry link | `/registry` | Source route inspection + transport check | Fail | `/witness-registry` is mounted; `/registry` has no client declaration. SPA transport returns HTML 200, which does not prove a mounted client route. | Code |
| HAAI doctrine link | `/doctrine/haai` | Source route inspection | Fail | Lexicon links to `/doctrine/haai`; no route declaration was found. | Code |
| Keeper guide link | `/guides/keeper/:id` | Source route inspection | Fail | Directory links to `/guides/keeper/:id`; mounted route is `/guide/:id`. | Code |
| Legacy work slug | `/w/:slug` | Source route inspection | Fail | No route declaration was found. | Code |
| Named playlist query | `/playlist?id=…` | Source route inspection | Open | `/playlist` is mounted, but no query-id contract was found in this pass; source must be tested against a populated public playlist. | Code / data |
| Upload query handoff | `/upload?type=…&editId=…` | Source route inspection | Fail | `/upload` directly redirects to `/manifest`; route declaration does not preserve legacy prefill/edit query state. | Code |
| Dashboard redirect | `/dashboard` → `/manage` | Source route inspection | Partial | Redirect is deliberate, but dashboard-only analytics, Discord, Stripe, and licensing tools still require an authenticated capability inventory. | Code / runtime-unverified |
| Marketplace redirect | `/marketplace` → `/avatar-registry` | Source route inspection | Partial | Redirect is deliberate; source still contains marketplace return URLs, so post-checkout landing behavior must be tested after a safe sandbox checkout is authorized. | Code / runtime-unverified |
| Single registration default | `songs.create` | Contract-verified | Fail | Server derives `createStatus = input.status ?? "Published"`; the publish gate then applies. Frozen law requires Draft default or explicit choice. | Code / doctrine divergence |
| Batch registration default | `songs.batchUpload` | Contract-verified | Pass | Input status defaults to `Draft`. | Code fact |
| Batch publish gate | `songs.batchUpload` | Contract-verified | Fail | A caller can submit `Published`; the batch procedure inserts tracks without the single-registration visual and witness-ready profile gate. | Code / doctrine divergence |
| Batch provenance parity | `songs.batchUpload` track schema | Contract-verified | Fail | Batch tracks lack participation axes, attestation, tone profile, waveform, visual lineage, and equivalent publish-seal enforcement. | Code / doctrine divergence |
| Collection WID issuance | `songs.batchUpload` | Contract-verified | Partial | A WID-ALB is generated only from supplied track WIDs. The procedure does not itself establish missing track WIDs before collection sealing. | Code / registry boundary |
| Tip-download checkout | `tips.createTipDownloadCheckout` | Contract-verified | Fail | Current server procedure is public and accepts `songId` plus caller-supplied `origin`; purchaser identity and redirect authority are not enforced in that contract. | Code / financial integrity |
| Creator tip checkout | `tips.createCreatorTipCheckout` | Contract-verified | Open | Public procedure supports guest tips, but purchaser attribution and trusted return authority require product and counsel review. | Code / legal boundary |
| Stripe webhook | `stripeWebhook` | Contract-verified | Partial | Signature construction and an idempotent completed-checkout path exist. Delivery, grant, retry, and return behavior were not executed. | Runtime-unverified |
| Download entitlement | `songDownload`, `downloadPermission` | Contract-verified | Partial | Free/tipped permission fields and server download logic exist. No free or paid file action was executed. | Runtime-unverified |
| Creator-level Support | `LoopCreatorPage` | Contract-verified | Fail | The active Creator surface passes `songs[0]` to song-bound support state despite a creator-tip procedure existing. | Code |
| PNA Session WID | `PNAWorkspacePanel`, `/sessions` | Contract-verified | Fail | PNA tells users to navigate to `/sessions`; `/sessions` redirects to `/manage`, while a server session router exists. | Code |
| Handle domain | `/@:handle` | Source + browser | Partial | Route is mounted, but public browser hydration was inconclusive; source retains a “Collections coming soon” message. | Code / runtime-unverified |
| Public storage | CloudFront headers | Observed HTTP headers | Partial pass | Representative cover, avatar, artwork, and MP3 objects returned HTTP 200 with range support and MIME responses. A `.jpg` cover advertised `image/png`. | Data / metadata |
| Media transformation | VisualQueue / EmbedVideo | Observed managed logs | Fail | FFmpeg reports invalid decoded data; VisualQueue skips jobs; EmbedVideo hits stderr max-buffer failure. | Environment / data |
| Lexicon assets | Public route / storage | Runtime-unverified | Not run | Local 500 reports were not reproducible through a safe production asset check in this pass. | Environment / configuration |
| OAuth session | OAuth callback, cookie persistence | Runtime-unverified | Not run | Requires user-owned external OAuth completion and creates session state. | Mutation-prohibited |
| Payment execution | Stripe Checkout and webhook | Runtime-unverified | Not run | Requires test transaction, return, and webhook delivery. | Mutation-prohibited |
| Draft / publish | Register and explicit publish | Runtime-unverified | Not run | Would create or alter creator-owned work records. | Mutation-prohibited |
| Witness / unwitness | Creator / Witness controls | Runtime-unverified | Not run | Would alter testimony state. | Mutation-prohibited |

## Sanitized Contract Shapes

| Procedure or entity | Sanitized observed/source shape | Audit interpretation |
|---|---|---|
| `songs.create` | `{ title, status?: "Draft" | "Published", participationMusic?, participationLyrics?, participationVoice?, toneProfileJson?, waveformUrl?, visual… }` | Protected write; unsafe default is `Published` when status is omitted. |
| `songs.batchUpload` | `{ albumName, status: "Draft" | "Published" = "Draft", tracks: [{ title, fileUrl, witnessId?, releaseDate?, AI fields?, lyrics?, origin story? }] }` | Protected write; lacks parity fields and publish gates required by doctrine. |
| `songs.verifyCollection` | `{ collectionWid } → { collectionWid, collectiveHash, creator, trackCount, tracks[] }` | Public read contract; observable WID-ALB verification succeeded. |
| `tips.createTipDownloadCheckout` | `{ songId, origin } → { checkoutUrl }` | Public write contract; identity and trusted-origin boundary is incomplete. |
| Public verifier | `WID-MUS → { creator, WID, hash, signature, publicKey, linkedCollection }` | Public read runtime successfully returned a cryptographic provenance presentation. |

## Relevant Runtime and Transport Evidence

| Source | Status | Relevant observation |
|---|---:|---|
| Production HTML transport | 200 | `/explore`, `/song/1710006`, `/creator/780095`, `/verify/WID-MUS-BC357BF7-57A6F302`, `/witness-registry`, and the listed legacy paths return an SPA HTML document. Transport 200 is not proof of client-route success. |
| Representative cover object | 200 | Delivered with `image/png` despite `.jpg` extension; byte ranges available. |
| Representative avatar object | 200 | Delivered with `image/webp`; byte ranges available. |
| Representative audio object | 200 | Delivered with `audio/mpeg`; byte ranges available. |
| Managed media-worker log | N/A | FFmpeg invalid-data decoder errors, skipped VisualQueue jobs, and an `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` EmbedVideo failure were observed. |

## Blocker Register

| Priority | Blocker | Class | Why it blocks |
|---|---|---|---|
| P0 | Tip-download checkout does not server-enforce identity or trusted origin. | Code / financial integrity | A paid entitlement needs durable purchaser binding and controlled return authority before it is promoted. |
| P0 | Single registration defaults to Published. | Code / doctrine divergence | It contradicts the Draft-first rule whenever status is omitted. |
| P0 | Batch Publish lacks the single-work publish gates and provenance parity. | Code / doctrine divergence | It enables a bypass of visual/witness readiness and omits required attestation/tone/waveform/lineage data. |
| P1 | Live migration ledger count differs from repository migration file count. | Environment / configuration | Schema changes cannot be safely assumed complete until hash reconciliation establishes the actual delta. |
| P1 | Media transformations are failing against existing assets. | Environment / data | Embed-video and queued visual artifacts do not reliably complete. |
| P1 | WID, tone, waveform, and playlist readiness is incomplete. | Data | Two songs lack WIDs; tone and waveform output are absent; no public playlists exist for real-flow validation. |
| P1 | Route and return integrity failures remain. | Code | HAAI, registry, guide, work-slug, upload query, PNA Session WID, and support/playlist paths do not align with active destinations. |
| P2 | Dashboard capability reachability and `/@handle` parity are unresolved. | Code / runtime | Requires authenticated capability comparison and a unified Creator Domain decision. |

## Authorized Next Validation, If Ordered

The following should be conducted only in an isolated test/sandbox process with a named user, disposable test work, explicitly agreed Stripe test-mode session, and a rollback plan:

1. Authenticate through OAuth and verify session persistence plus return-path preservation.
2. Register one disposable Draft, inspect its data, and attempt explicit Publish against both compliant and noncompliant profile/visual conditions.
3. Run a batch with Draft and attempted Published statuses to prove server parity and gate behavior.
4. Test one free download and one Stripe test-mode paid download through return, webhook, idempotent repeat prevention, and signed-file delivery.
5. Test creator tip/gift, witness/unwitness, a public playlist, and dashboard/Manage capability routing with no production work or funds.
6. Reconcile the Drizzle migration ledger hash-by-hash, inspect the asset MIME failure set, and run read-only database `EXPLAIN` plans for the populated creator and search queries.
