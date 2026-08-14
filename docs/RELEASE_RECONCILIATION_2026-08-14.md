# Release Reconciliation — GitHub Main vs. Managed Living Nexus

**Status:** Release finding. **Date:** 2026-08-14. **Scope:** Read-only reconciliation; no user record, payment, configuration, or runtime behavior was changed.

> **Finding:** GitHub `main` is currently at `4ed9a0a1b6a2fd35f5dcdee0f5735607cbfb0468` (PR #21 merge). The managed workspace was at checkpoint `b3062491` when this review began and therefore did not yet contain GitHub `main`’s PR #17/#19/#21 release surface. The user-reported public version `e5121b52` is consequently a deployment-state lag, not evidence that the merged UI disappeared.

## Confirmed GitHub lineage

| Release component | GitHub PR | Merge commit | Status |
|---|---:|---|---|
| Three-column Work page and Support drawer | [#17](https://github.com/Whisperer217/living-nexus_provenance/pull/17) | `976f6e391117599263a5b51947e87f8eccc34871` | Merged 2026-08-14 21:09 UTC |
| Breath Canon reconciled onto Work layout | [#19](https://github.com/Whisperer217/living-nexus_provenance/pull/19) | `319da113e985564e35dcc6c27400ddde3a0b7072` | Merged 2026-08-14 21:10 UTC |
| Creator Sanctuary, Explore/Chapel depth, paid/free download, music-native creator rooms | [#21](https://github.com/Whisperer217/living-nexus_provenance/pull/21) | `4ed9a0a1b6a2fd35f5dcdee0f5735607cbfb0468` | Merged 2026-08-14 21:13 UTC; current GitHub `main` |
| Creator Sanctuary standalone branch | [#20](https://github.com/Whisperer217/living-nexus_provenance/pull/20) | — | Not separately promoted; its content is represented in #21 per the merge record supplied by the Keeper |

## What will become visible after a promotion

The merged source contains the Loop Work triptych, Breath Canon atmosphere, Creator Sanctuary/creator rooms, Explore and Creative Chapel depth surfaces, and the paid/free download CTAs. These are not present on a managed deployment still serving the earlier revision.

## Release conditions rechecked in the actual merged source

The code at GitHub `main` still contains four material public-release conditions previously noted during PR #21 review. They are direct source findings, not inferences about a completed payment.

| Condition | Direct merged-source evidence | Classification | Release implication |
|---|---|---|---|
| Paid-download checkout is unauthenticated | `tips.createTipDownloadCheckout` is a `publicProcedure`; it writes an optional `ctx.user` identifier into checkout metadata. | Code/security | A guest can create a checkout that is not authoritatively attributed to a signed-in platform user. |
| Fallback download threshold is $1.79 | The same route uses `downloadTipThresholdCents ?? 179`; the public download gate repeats the fallback. | Code/product truth | The public CTA must not communicate a different canonical price, and the source lacks an explicit server-owned price policy beyond the fallback. |
| Checkout return origin is client-controlled | The procedure accepts `origin: z.string().url()` and constructs `success_url` and `cancel_url` directly from it. | Code/security | A server allow-list is required before promotion of public payment redirects. |
| Creator playlist path is still unmounted | `CreatorDomainHub` and `SanctuaryWorksOrganizer` emit `/creator/${handle}/playlists`; the project has no corresponding mounted route in the reconciled route review. | Code/navigation | Some playlist links will lead to a dead path. |
| Existing test is source-string based | `server/tests/sanctuaryDownloadContract.test.ts` reads files and asserts source fragments, including the unmounted creator-playlist string. | Test coverage | A passing test does not establish protected checkout, valid origin rejection, entitlement unlock, or route behavior. |

The current `songs.download` gate does require `ctx.user` before returning a file and checks the configured threshold. That is a positive server-side file protection seam, but it does not correct the earlier checkout-attribution and redirect-origin conditions.[1]

## Controlled release decision

The GitHub-to-managed mismatch is verified. The merged visual release can be promoted only under one of two clear instructions from the Keeper:

1. **Repair then promote (recommended):** Correct the four conditions above on a small release branch, add behavioral tests, merge, synchronize, publish, and validate the visual surfaces.
2. **Explicit override to promote current `4ed9a0a1`:** Publish the current main knowing that the visible surfaces land alongside the documented payment-route and navigation risks. This is a product-release authorization, not an implied claim that the risks are resolved.

No platform publish was performed during this reconciliation.

## References

[1]: [`server/routers/tips.ts`](../server/routers/tips.ts) and [`server/routers/songs.ts`](../server/routers/songs.ts) — current managed baseline files; the release-source findings were read from the matching files in GitHub `main` commit `4ed9a0a1`.
