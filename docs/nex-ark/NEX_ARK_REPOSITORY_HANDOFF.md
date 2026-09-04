# NEX-ARK Repository Handoff

## Mission

Build **NEX-ARK (Nexus Ark)** as a standalone social environment that helps people get above the algorithmic flood. NEX-ARK owns social interaction. It can reference Living Nexus where a creator chooses to connect an identity, Work, proof, attribution, or lineage reference.

> Living Nexus is a canonical creator and provenance environment. NEX-ARK is not a fork, a UI shell, or a social rewrite of Living Nexus.

## Non-Negotiable Separation

| Area | NEX-ARK | Living Nexus | Prohibited bridge behavior |
|---|---|---|---|
| Code and delivery | Separate repository, runtime, deployment, and release history | Existing Living Nexus repository and deployment | Shared database, copied server router, embedded iframe app, or direct internal import. |
| Social activity | Posts, feed, follows, reactions, comments, bookmarks, communities, messaging, notifications, rooms, playlists, support interactions | None | Writing NEX-ARK reactions or follows into Living Nexus metadata. |
| Canonical identity and proof | Stores typed references and display projections | Creator identity, testimony, Works, WIDs, hashes, proof, attribution, AI statements, and lineage | Calling copied display data canonical or generating a WID locally. |
| Connection | Stores NEX-ARK-owned connection state and scopes | Future provider/grant authority only if deliberately built | Guessed endpoints, direct database access, browser scraping, or copied auth cookies. |

## Start Here

Copy these files into the new NEX-ARK repository before implementation:

```text
docs/nexus-bridge/NEXUS_BRIDGE_SPECIFICATION.md
src/modules/nexus-bridge/contracts/nexus-bridge.ts
```

The source versions are supplied in this handoff package as:

```text
docs/nex-ark/NEXUS_BRIDGE_SPECIFICATION.md
docs/nex-ark/contracts/nexus-bridge.ts
```

## Suggested Initial Repository Structure

```text
nex-ark/
├── apps/web/                         # Independent NEX-ARK frontend
├── apps/api/                         # Independent NEX-ARK API
├── packages/
│   ├── nexus-bridge/
│   │   ├── contracts/nexus-bridge.ts
│   │   ├── localMockNexusBridge.ts
│   │   ├── unavailableNexusBridge.ts
│   │   └── fixtures.ts
│   ├── social-domain/                # Posts, follows, comments, reactions
│   └── ui/                           # NEX-ARK design system
├── docs/
│   └── nexus-bridge/
└── README.md
```

Do not copy Living Nexus source, schema, environment variables, storage keys, or managed database data into this repository.

## First Product Slice

The first slice is not a full social platform. It demonstrates independent social operation and safe connection posture.

| Route / surface | Required behavior |
|---|---|
| `/` | NEX-ARK feed with local social fixtures or NEX-ARK-native data. No Living Nexus dependency. |
| `/discover` | Social and community discovery. Bridge-backed content is visibly source-labelled. |
| `/settings/connected-identity` | Connected Identity explanation, mock fixture selection, scopes preview, confirm/unlink flow. |
| `/creators/:id` | NEX-ARK social profile. If connected, render a labelled Living Nexus reference card, never a copied canonical record. |
| `/creations/:id` | NEX-ARK social discussion/activity around a reference. Link outward to canonical provider URL only when returned. |

## Connected Identity Prototype Copy

**Heading:** Connected Identity  
**Action:** Connect Living Nexus

> Connect your Living Nexus creator identity to bring your witnessed creations, provenance records, testimony, attribution, and lineage into NEX-ARK.

**Prototype disclosure:**

> This prototype uses local mock data. It does not sign in to Living Nexus, verify a WID, import your archive, or create a canonical record.

## Implementation Order

1. Build NEX-ARK account/profile, post, feed, reaction, comment, bookmark, follow, and community primitives against its own database.
2. Add the portable Bridge contract without importing any Living Nexus source.
3. Implement `UnavailableNexusBridge` first. Ensure the whole social app works with it.
4. Implement `LocalMockNexusBridge` with clearly fictional fixtures and mandatory mock labels.
5. Build Connected Identity UI and local connection state, including explicit scope review and unlink.
6. Add read-only reference cards for creator, creation, witness/proof, lineage, attribution, and AI statement.
7. Add audit events for NEX-ARK connect, refresh, unlink, reference-open, and provider-error events.
8. Implement a real `LivingNexusBridge` only after a separate Living Nexus API/grant project meets the acceptance criteria in the specification.

## Data Contract Rules

| Rule | Implementation requirement |
|---|---|
| Reference, do not duplicate | Use `LivingNexusReference` on NEX-ARK social objects. A cache may help display but must identify its source and time. |
| Mock is never canonical | Mark every mock result; do not use real WID-like fixture values. |
| Least privilege | Start with narrowly named read scopes only. No write scopes belong in v0.1. |
| Explicit connection | No automatic discovery/import from an email, handle, avatar, or URL. |
| Unknown is valid | Render `unknown`, `unavailable`, and `not-supported` honestly. Do not substitute a green verified badge. |
| Canonical mutations stay home | Create/edit/register/publish/seal/revise/attribute/WID/lineage actions link to Living Nexus in the future; they never execute through NEX-ARK v0.1. |

## What Must Not Be Built Yet

Do not build a guessed Living Nexus OAuth flow, a fake WID verifier, direct SQL/shared-database access, a provenance synchronization worker, automatic Work import, webhook receiver, canonical event mirror, or automatic cross-posting. Those require deliberate future provider contracts and security review.

## Definition of Ready for a Real Bridge

NEX-ARK is ready to replace `LocalMockNexusBridge` only when Living Nexus provides a documented API catalogue, explicit consent and token grant, revocation, public visibility semantics, versioned schemas, proof-verification behavior, caching/rate rules, and security review. Until then, the mock adapter is the correct product behavior—not a temporary shortcut to hide an integration gap.

## Handoff Prompt for the New NEX-ARK Instance

```text
Build NEX-ARK as a fully separate social application. Do not modify or import
Living Nexus. Copy in the Nexus Bridge v0.1 contract and start with
UnavailableNexusBridge plus LocalMockNexusBridge. NEX-ARK owns social data;
Living Nexus remains canonical for creator identity, WIDs, provenance,
attribution, AI disclosure, and lineage. Do not invent Living Nexus endpoints,
OAuth, WID verification, or production data. Every mock result must be visibly
labelled non-canonical. Implement Connected Identity as an explicit, local mock
prototype with scope review, confirmation, and unlinking.
```

## References

[1]: [Nexus Bridge specification](NEXUS_BRIDGE_SPECIFICATION.md)  
[2]: [Portable Nexus Bridge contract](contracts/nexus-bridge.ts)
