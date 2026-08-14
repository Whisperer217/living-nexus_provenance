# ADR-022: Authored Guide → Free Avatar Shop Model Conversion

**Status:** Proposed — no data, listing, price, entitlement, or account has been changed.  
**Decision owner:** Keeper authorization required before implementation.  
**Scope:** Convert selected, creator-authored Personal Nexus Guides into free Avatar Registry models while preserving Guide provenance, authored backstory, rights, and explicitly scoped strengths.

> **Core decision:** A Guide remains the canonical authored identity. A shop avatar is a separately versioned, zero-price representation that references the Guide; it must never replace, erase, or silently rewrite the Guide’s WID, testimony, lore, rights, or derivative-permission record.

## Current evidence

The active `guides` table already models the authored identity required for this conversion: canonical name, role, alignment, domain, testimony, lore description, artwork, canonical Guide WID, publication status, rights configuration, derivative permissions, revenue share, symbols, and a derived signal-personality profile. [1] The Guide lifecycle requires creator ownership for extraction, update, and publishing; public reads are limited to published Guides. [2]

The active Avatar Registry already uses `marketplace_items` of type `skin`, with zero-price support, AVT-WID attribution, creator identity, license type, image hash, version number, tags, stewardship mode, and optional 3D asset fields. [3] The registry currently allows any active skin to be equipped and has no record of a free claim or creator-specific entitlement. [4] Thus, the underlying catalog is present, but a provenance-preserving **Guide-to-avatar relation**, an explicit free-claim record, and presentation fields for authored narrative are not yet present.

Read-only inventory evidence identified three Guide records. The only immediate Keeper-owned published candidate is **THE LIVING NEXUS ARBITER** (`guideId 60001`, `LN-GUIDE-THE-LIVING-NEXUS-60001`), which has artwork, testimony, lore, and rights configuration. Its derivative-permissions configuration is absent. The published Aeralyn Virelith record belongs to another creator and is therefore ineligible for Keeper conversion without that creator’s explicit authorization. Mjolnir is in review and lacks canonical artwork/rights fields, so it is not conversion-ready.

| Candidate class | Conversion status | Required action |
|---|---|---|
| Keeper-owned, published Guide with WID, artwork, rights, derivative permissions | Eligible after Keeper selection | Create a linked free Avatar Shop model through the new conversion path. |
| Keeper-owned, published Guide missing derivative permissions | Incomplete | Keeper must explicitly set derivative/canonical-identity permissions before conversion. |
| Draft or review Guide | Ineligible | Publish and complete required authored fields first. |
| Another creator’s Guide | Ineligible for Keeper conversion | The originating creator must initiate or authorize their own conversion. |

## Conversion model

### Identity and provenance

The implementation must create a **new Avatar Registry identity** (`AVT-*`) and retain the Guide’s canonical WID (`LN-GUIDE-*`) as a source reference. The Guide record remains authoritative for authored origin; the avatar record becomes a versioned representation for discovery, claiming, and equipping.

The following new relation is required:

| Record | Required fields | Purpose |
|---|---|---|
| `guide_avatar_profiles` | `id`, `guideId`, `marketplaceItemId`, `sourceGuideWid`, `creatorId`, `testimonySnapshot`, `loreSnapshot`, `symbolsSnapshot`, `rightsSnapshot`, `derivativePermissionsSnapshot`, `strengthsJson`, `conversionVersion`, `convertedByUserId`, `convertedAt`, `supersedesProfileId` | Preserves the specific Guide evidence that produced an avatar model and permits later superseding versions without overwriting the original representation. |
| `avatar_entitlements` | `id`, `userId`, `marketplaceItemId`, `grantType`, `sourceGuideAvatarProfileId`, `grantedAt`, `revokedAt`, `provenanceEventId` | Makes a zero-price claim attributable, idempotent, and separate from a Stripe payment purchase. |

The original Guide remains editable only through the existing creator-owned Guide lifecycle. Any change to a Guide after conversion does not silently alter a claimed avatar profile; the creator may publish a superseding avatar-profile version with a fresh snapshot and explicit migration decision.

### Backstory and scoped strengths

The public Avatar Registry card and detail view should show:

1. **Canonical Guide source:** Guide name and `LN-GUIDE-*` link.
2. **Avatar provenance:** `AVT-*` link, image hash, creator credit, and conversion version.
3. **Origin and Backstory:** Snapshot of the creator-authored testimony/lore, visibly labeled as authored narrative.
4. **Guide Affinities:** Explicitly authored `strengthsJson` values, labeled as scoped strengths rather than claimed system powers.
5. **Rights posture:** Relevant license and derivative-permission summary.

“Unique strengths” must be treated as authored Guide traits or display/persona affinities. They must **not** automatically grant PNA agent capabilities, access to another creator’s data, license authority, payment privileges, registry mutation privileges, or an inference that the avatar can perform a technical function. Avatar persona is not Agent authority.

### Free access as a claim, not a payment

The shop action should be **Claim Free Model**, not Stripe checkout or an artificial `$0.00` payment. An atomic protected procedure must:

1. Verify the avatar item is active, type `skin`, price `0`, and license `free`.
2. Verify the linked Guide profile is published and valid.
3. Create or return an idempotent `avatar_entitlements` grant.
4. Write an attributable provenance/audit event.
5. Invalidate the caller’s entitlement and inventory queries.

`equipAvatar` must check either a valid free entitlement or a fulfilled paid purchase for future paid skins. Existing active free skins may receive a one-time compatibility entitlement migration or an explicit grandfather rule; this must be decided and tested before enforcement is activated.

## Architectural-layer assessment

| Layer | Strengthened by the conversion | Required safeguard |
|---|---|---|
| Identity | Keeps the Guide as the authored source and assigns a separate AVT identity to the representation. | Never conflate Guide WID and AVT-WID. |
| Manifestation | Gives canonical artwork a shop representation without relabeling the original Guide. | Preserve artwork hash and conversion snapshot. |
| Relationship | Lets users claim and equip a free model while finding the author and Guide story. | Claim must be attributable and idempotent. |
| Registry | Links authored Guide evidence to a versioned avatar representation. | Version by supersession; no silent snapshot overwrite. |
| Stewardship | Respects rights and derivative permissions before the platform distributes a representation. | Require rights/derivative configuration and creator ownership. |
| Legacy | Preserves narrative, symbols, and rights context next to the avatar over time. | Store source snapshots and export them with profile lineage. |

## Affected implementation surfaces

| Surface | Planned change after authorization | Status now |
|---|---|---|
| `drizzle/schema.ts` | Add `guide_avatar_profiles` and `avatar_entitlements`; add relation/indexes. | Not implemented |
| `server/routers/guides.ts` | Add creator-owned conversion preparation/validation procedure. | Not implemented |
| `server/routers/marketplace.ts` | Add owner-checked conversion, free claim, entitlement-aware equip, and profile detail query. | Not implemented |
| `client/src/pages/AvatarMarketplacePage.tsx` | Show canonical source, backstory, Guide Affinities, claim state, and provenance. | Not implemented |
| `client/src/pages/GuideDetailPage.tsx` | Add creator-only “Prepare Avatar Model” handoff and public “View Avatar Model” link when linked. | Not implemented |
| Tests | Cover owner boundary, published/rights prerequisites, free claim idempotency, equip entitlement, snapshot immutability, and no Agent authority escalation. | Not implemented |

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Copy Guide text and artwork directly into a generic `marketplace_items` row | Loses the explicit source relation, immutable conversion snapshot, and authored-rights boundary. |
| Make every published Guide automatically available as a free skin | Converts creator works without per-Guide intent and distributes models before rights/derivative fields are complete. |
| Treat a free avatar as a completed Marketplace purchase | Pollutes payment receipts and makes a zero-price claim look like a financial transaction. |
| Treat Guide strengths as PNA Agent capabilities | Collapses authored narrative into operational authority and violates the Authorized Agent doctrine. |

## Required Keeper decisions before implementation

1. Confirm whether **THE LIVING NEXUS ARBITER** is the first conversion candidate.
2. Complete or explicitly set its derivative-permissions configuration.
3. Approve the public label for strengths: **Guide Affinities** (recommended) or another term.
4. Decide whether existing free skins receive grandfathered entitlements when equip enforcement changes.
5. Confirm that Phase 1 means a 2D Avatar Shop representation only; `model3d*` fields are a separate future media-conversion scope.

## References

[1]: [`drizzle/schema.ts` — `guides`](../drizzle/schema.ts)
[2]: [`server/routers/guides.ts` — authored Guide lifecycle](../server/routers/guides.ts)
[3]: [`drizzle/schema.ts` — `marketplaceItems` and `marketplacePurchases`](../drizzle/schema.ts)
[4]: [`server/routers/marketplace.ts` — Avatar Registry, equip, and catalog procedures](../server/routers/marketplace.ts)
