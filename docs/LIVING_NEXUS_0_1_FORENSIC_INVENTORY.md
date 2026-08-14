# Living Nexus 0.1 — Music + Creator Studio Forensic Inventory

**Status:** Final evidence-bound system map. **Date:** 2026-08-14. **Author:** Manus AI.

> **Change boundary.** No recovery, reclassification, publication, generation, listing, entitlement, asset, route, or production-record behavior was changed while preparing this document.

> **Scope law.** Living Nexus 0.1 is **music-first**. Songs, creators, metadata, playback, WIDs, provenance, witnesses, and attribution remain the primary registry. The Creator Studio remains alive beside that registry: it holds working images, cover art, creator Guides, provenance avatars, and unregistered creative assets. Studio existence does **not** by itself make an asset a registered music work.

## Scope and authority boundary

Living Nexus should preserve creator sovereignty, origin integrity, and explicit authorization. This inventory separates that doctrine from verifiable system behavior and from any legal conclusion.

| Classification | Meaning here | Recovery consequence |
|---|---|---|
| **Doctrine** | Creator authority, WID/origin integrity, and stewarded assistance. | No asset is attached, promoted, registered, claimed, equipped, or published without an attributable creator action. |
| **Technical fact** | What active source, routes, storage seams, and sanitized aggregates establish. | Statements are grounded in the cited code path or observed aggregate. |
| **Creator declaration** | A creator’s testimony, origin account, rights statement, or permission setting. | It remains creator-authored context; it is not silently transformed into a legal conclusion. |
| **Evidence** | Direct source, schema, route, storage, or aggregate-database observation. | Evidence supports a recovery decision but never replaces the creator’s confirmation. |
| **Legal claim** | Ownership, copyright, derivative rights, licensing, or commercial-right conclusions. | **Unresolved; qualified counsel review required.** This inventory makes no legal determination. |

The correct boundary is therefore not “remove visuals.” It is “do not reopen a general multi-medium registry.” Visual assets remain valid Studio material when a creator uses them in approved music work, provenance context, or identity representation.[1] [2]

## Executive finding

The old image-generation and working-asset system was **not destroyed**. The active source still contains a server-side image provider, S3-backed generated-file storage, a private Quiver table and router, Guide-linked image generation, avatar-shop data, and direct Guide routes. The central break is discoverability and composition: legacy navigation still directs people to `/keeper-compose`, but that route now redirects to `/pna`. The surviving Quiver interface is therefore no longer a durable public or creator-facing destination, even though its records and procedures remain available.

> **Plain finding:** The capabilities are preserved. The creator-facing doorway that should show them together is not.

| Layer | Direct evidence | Classification | Product consequence |
|---|---|---|---|
| Image provider | `generateImage()` posts prompts and optional reference images to the configured internal image service. | **Preserved** | The generation capability remains callable through approved server procedures. |
| Storage | Generated image bytes are written through `storagePut()` under `generated/<timestamp>.png`. | **Preserved** | Generated files have a storage destination independent of a visible studio screen. |
| Quiver data | The active table and protected `quiver.save`, `list`, `updateTitle`, `delete`, and `setPublished` procedures remain mounted. | **Preserved but hidden** | Creator-owned working assets can exist without an obvious front door. |
| Quiver interface | `KeeperComposePage` still contains an Image mode and Quiver vault, but `/keeper-compose` redirects to `/pna`. | **Orphaned path** | Existing navigation leads users away from the surviving asset workflow. |
| Guides | Direct directory, detail, and upload routes remain mounted, with source-linked artwork, WID, testimony, and rights fields. | **Preserved** | Creator-authored contextual material still has an identity surface. |
| Avatar shop | Avatar Registry is mounted at `/avatar-registry`; active catalog/equip logic survives. | **Preserved but incomplete** | A commerce/equip substrate exists, but it does not yet make authored Guides discoverable as free AVT representations. |
| Legacy visual-work product | `/visual-works*` routes redirect to music-first routes. | **Intentionally delisted** | Non-music registry expansion is not part of Living Nexus 0.1. |
| Creator Studio composition | There is no single Creator-facing entry that joins upload, metadata, Quiver, Guides, avatar selection, and provenance review. | **Missing composition** | Real capabilities feel displaced because they are not presented as one workflow. |

## The verified surviving chain

The surviving system is coherent at the service level. It is not coherent at the surface level.

```text
Creator intent / song context
        │
        ├── GuideUploadWizard or Music Environment
        │      └── guides.generateImage (protected)
        │             └── internal image service
        │                    └── storagePut(generated/<timestamp>.png)
        │                           └── returned CDN URL
        │
        └── KeeperCompose Image mode
               └── quiver.save (protected, creator-owned)
                      └── quiverImages record
                             ├── prompt / enriched prompt
                             ├── reference-image link
                             ├── optional Guide / WID link
                             └── private working-asset state
```

The failure is the final presentation layer. `/keeper-compose` is a redirect to PNA, while legacy controls and explanatory text still point creators toward it. That mismatch makes a preserved chain appear absent.

## Read-only inventory snapshot

The following aggregates were obtained from the managed database without selecting creator names, prompts, URLs, or private asset content.

| Inventory | Observed state | Interpretation |
|---|---:|---|
| Quiver records | 86 | Working-image records survive. |
| Quiver records linked to a Guide | 5 | Some generated/working assets retain Guide context. |
| Quiver records with a WID reference | 86 | The current records retain a registry reference field. This does not prove public image registration. |
| Quiver remixes | 10 | Reference/remix history exists. |
| Quiver records marked public/registered | 0 | The public-gallery path is unused or not discoverable; it must not be treated as an asset loss. |
| Guides | 3 total; 2 published | Guide identity records remain but are not a broad user-facing Studio model. |
| Guide readiness | 2 with artwork; 3 with WID/testimony; 2 with rights; 1 with derivative-permission data | Conversion or public reuse must be per-record and rights-gated. |
| Active marketplace items | 6 | Avatar/shop catalog substrate survives. |
| Free marketplace items | 0 | “Free access” is not presently expressed by the catalog as a normal zero-price item. |
| Keeper skins | 9 total; 1 active | Cosmetic/equip records survive, but do not yet equal creator-authored provenance avatars. |

## Music-first boundary

The correct separation is not “remove visuals.” It is a relationship model.

| Object | Living Nexus 0.1 role | Registry status | Must not become |
|---|---|---|---|
| Song | Primary creative work | Music registry object; WID/provenance eligible | A generic container for every medium |
| Cover art | Supporting music manifestation | Attach to a song; may retain Studio provenance | A new mandatory independent registry flow |
| Quiver image | Private working asset | Private unless a creator deliberately promotes it | An automatic public work or ownership claim |
| Creator Guide | Creator-authored context and testimony | Guide record with its own provenance/rights boundary | An autonomous agent or generic skin by default |
| Provenance avatar | Interface/identity manifestation derived from an authorized Guide | Separate AVT/shop representation only after rights and derivative approval | A substitute for Guide authorship or creator choice |
| Agent | Read-only steward/assistant inside approved authority limits | Contextual helper, not owner or publisher | A silent authority over registry or Studio assets |

## What is preserved, hidden, and missing

### Preserved

The internal image service, protected Guide image-generation procedures, Quiver record and download paths, storage writes, prompt/reference fields, Guide artwork/WID/testimony/rights fields, avatar-marketplace equip path, and song artwork attachment seams are all present in active source. The existing route to `/guides/upload` and the mounted Avatar Registry mean this is not a greenfield rebuild.[3] [4] [5]

### Hidden or orphaned

The primary Studio problem is an orphaned entry path. `KeeperComposePage` contains the old generator and Quiver vault; current navigation sends users to `/keeper-compose`; the router redirects that address to `/pna`. The old visual-work routes are also intentionally redirected to music-first surfaces. These are different classifications: the Studio is **hidden/orphaned**, while a general visual-work registry is **delisted by scope**.[6]

### Missing

Living Nexus lacks a single Creator Studio home that lets a creator see working assets, select a Guide/avatar, generate or upload cover art in song context, attach a selected asset, inspect facts before registration, and then choose whether to promote an asset. It also lacks a first-class zero-price, attributable claim path for authorized Guide-to-AVT conversions. These are composition and entitlement gaps, not evidence that the underlying assets are gone.

## Recovery plan — evidence before replacement

| Phase | Authorized purpose | Read-only / mutation boundary | Do not do |
|---|---|---|---|
| F0 — Preserve evidence | Snapshot existing routes, tables, storage headers, Guide readiness, and Quiver aggregates. | No data changes. | Do not regenerate imagery or create replacement records. |
| F1 — Restore a Studio entrance | Design one Creator Studio entry that reveals existing Quiver and generation capabilities. | Route/UI proposal only until approved. | Do not revive a general visual registry. |
| F2 — Song-context asset workflow | Let a creator generate/upload/select an asset from Quiver while working on a song. | Creator must deliberately save and attach. | Do not auto-attach, auto-register, or infer consent. |
| F3 — Guide/avatar recovery | Show eligible authored Guides and their existing assets in a clear identity shelf. | Rights/derivative checks are per Guide. | Do not convert Guides into skins or agents automatically. |
| F4 — Free AVT claim | Add a zero-price claim that produces an attributable entitlement for approved Guide-derived AVT items. | Owner-visible grant ledger and compatibility plan required. | Do not use a fake purchase, silent claim, or implicit derivative license. |
| F5 — Agent assistance | Let the PNA Context Canvas see explicit song metadata and selected Studio context. | Read-only suggestions; creator confirms each action. | Do not expose private Quiver assets by default or let an agent publish/register. |

## Required proof before any recovery code

Every future recovery release must contain these five fields in its handoff:

| Field | Required proof |
|---|---|
| **Live destination** | Exact public URL and the version/checkpoint serving it. |
| **Visibility** | Guest, signed-in creator, founder, or admin state required to see it. |
| **Data source** | Existing table/procedure/storage key being surfaced—never an assumed replacement. |
| **Authority** | The creator action that confirms attachment, promotion, claim, equip, or publication. |
| **Rollback** | The route/component/record change that can be reverted without deleting original assets or provenance. |

## Decisions required before recovery implementation

1. Approve **Living Nexus 0.1 — Music + Creator Studio** as the active scope boundary.
2. Name the first creator-facing Studio destination: `/studio`, `/creator-studio`, or an existing surface to rehabilitate.
3. Decide whether the restored Quiver is **creator-private by default** with explicit attach/promote actions. The evidence supports this as the safe default.
4. Approve the first authored Guide(s) to review for an AVT representation; each requires derivative-permission evidence before conversion.
5. Choose whether the first Studio release is **read-only recovery/discovery** or includes a creator-confirmed image attachment to a music Draft.

## Command conclusion

The next move is **not** to build another disconnected feature. It is to restore one visible Creator Studio path over the systems already preserved, with music context, creator confirmation, and evidence-first provenance at every step. The first approved Studio release should expose the current truth—existing Quiver assets, creation controls, Guide/identity records, and the creator’s chosen music context—without implying that any asset is public, registered, owned, licensed, or ready for avatar conversion until the creator explicitly confirms it.

## References

[1]: [`docs/LOOP_PRODUCT_SPEC.md`](LOOP_PRODUCT_SPEC.md) — frozen music-first product boundary and Loop surface law.

[2]: [`docs/AUTHORIZED_AGENT_DOCTRINE.md`](AUTHORIZED_AGENT_DOCTRINE.md) — authorized-agent, capability, attribution, and Law-V continuity boundary.

[3]: [`server/_core/imageGeneration.ts`](../server/_core/imageGeneration.ts) — active configured image-service invocation and S3-backed generated-file storage write.

[4]: [`server/routers/quiver.ts`](../server/routers/quiver.ts) — protected creator-owned Quiver save, list, update, delete, and publication procedures.

[5]: [`server/routers/guides.ts`](../server/routers/guides.ts), [`client/src/pages/GuideUploadWizard.tsx`](../client/src/pages/GuideUploadWizard.tsx), and [`client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx`](../client/src/pages/manifestation-studio/environments/MusicEnvironment.tsx) — existing Guide and music-context generation seams.

[6]: [`client/src/App.tsx`](../client/src/App.tsx) and [`client/src/pages/KeeperComposePage.tsx`](../client/src/pages/KeeperComposePage.tsx) — active `/keeper-compose` redirect and surviving Image mode/Quiver vault implementation.
