# Nexus Bridge Specification

**Version:** 0.1 draft for a separate NEX-ARK repository  
**Status:** Architecture and contract handoff; no external Living Nexus production API is asserted or required.  
**Owner model:** NEX-ARK owns social activity. Living Nexus remains the canonical authority for creator identity, witnessed creations, WIDs, provenance, testimony, attribution, and lineage.

> **Bridge rule:** A NEX-ARK copy is a social reference or cached projection. It is never a replacement for, or a silent duplicate of, a Living Nexus canonical record.

## 1. Product Boundary

NEX-ARK and Living Nexus must be separate applications. They need separate repositories, deployments, databases, authentication sessions, operational logs, privacy policies, and release histories. NEX-ARK may be fully useful when no Living Nexus connection exists.

| NEX-ARK owns | Living Nexus owns | Bridge rule |
|---|---|---|
| Profiles, posts, follows, reactions, comments, social discovery, communities, messaging, notifications, rooms, social playlists, and social support interactions | Canonical creator identity, testimony, registered creations, WIDs, proof artifacts, content hashes, provenance events, creator declarations, attribution, AI disclosures, and lineage | NEX-ARK stores a reference plus a display projection; it does not issue, alter, or mirror a canonical record as if it were authoritative. |

The existing Living Nexus preparation boundary already distinguishes **WID-bound**, **editorial**, and **independent-component** information. A Bridge must not collapse those classes or infer a new sealing/revision policy. [1]

## 2. Architectural Shape

```text
NEX-ARK social UI and database
        │
        │  read-only, creator-initiated references
        ▼
Nexus Bridge contract
        │
        ├── LocalMockNexusBridge        (first implementation)
        ├── UnavailableNexusBridge      (safe disconnected state)
        └── LivingNexusBridge           (future; only after real APIs exist)
        │
        ▼
Living Nexus canonical system of record
```

The Bridge is an **anti-corruption layer**. NEX-ARK code imports only the portable `NexusBridge` interface in `contracts/nexus-bridge.ts`. It must not import Living Nexus database models, tRPC routers, secrets, storage helpers, signing code, or internal client components.

## 3. Verified Current Integration Facts

Living Nexus currently has internal, application-specific public profile resolution patterns and creator-card data, including handle resolution and public identity fields. [2] Living Nexus also maintains an exact ordered WID serialization boundary for a music Work: `fileHash`, title, participation, tone label, and timestamp. [1]

| Fact | Bridge consequence |
|---|---|
| A creator may be resolved by a canonical handle or internal creator id. [2] | The Bridge accepts both forms and returns a normalized `LivingNexusReference`. NEX-ARK must not resolve a creator by display name. |
| WID payload serialization is exact and order-sensitive. [1] | NEX-ARK never re-signs, regenerates, or claims to verify a WID merely from a copied display projection. |
| Creator-declared dates and album placement are editorial rather than currently WID-bound. [1] | NEX-ARK may display a provider-returned editorial field as a labelled projection, but cannot state that it is sealed unless the provider explicitly says so. |
| No verified public third-party Living Nexus API contract is available for this Bridge. | The first adapter is local/mock. `connected` mode is prohibited until a real, documented provider contract exists. |

## 4. Stable Reference Model

All NEX-ARK references must contain a `LivingNexusReference` rather than copying a canonical object. The portable type contract is supplied in [`contracts/nexus-bridge.ts`](contracts/nexus-bridge.ts).

| Reference kind | Preferred identifier | Optional public route | NEX-ARK storage policy |
|---|---|---|---|
| Creator | Canonical handle or Living Nexus creator id | Canonical provider-returned URL | Store reference, snapshot label, provider state, and cache time. |
| Creation | WID where one is provided; otherwise provider creation id | Canonical provider-returned URL | Store reference, social post relation, and minimal display snapshot. |
| Witness / proof | WID plus provider proof reference | Provider-returned verification URL only | Store result state and timestamp; never a private key or signing secret. |
| Lineage | Provider lineage reference plus linked WIDs | Provider-returned URL | Store a cached graph only as non-canonical projection data. |

NEX-ARK must display a source label on every Bridge-backed object:

| Bridge mode | Required UI label | Permitted claim |
|---|---|---|
| `mock` | **Mock Nexus Bridge data — not a Living Nexus record** | None about registration, WID issuance, verification, or provenance. |
| `unavailable` | **Living Nexus connection unavailable** | The social object may exist, but canonical status is unknown. |
| `connected` | **Referenced from Living Nexus** plus returned verification state | Only the exact returned state, such as `verified`, `unknown`, or `not-supported`. |

## 5. Provider Interfaces

NEX-ARK must implement the requested read operations through six providers:

| Provider | Required operations | Non-negotiable limit |
|---|---|---|
| `CreatorIdentityProvider` | `getCreator`, `resolveCreator` | No account linking by display name. |
| `CreationProvider` | `getCreatorWorks`, `getCreation` | No creation registration, publication, or metadata mutation. |
| `ProvenanceProvider` | `getProof` | No record issuance, resealing, or event insertion. |
| `LineageProvider` | `getLineage` | No inferred or fabricated relationship edges. |
| `WitnessProvider` | `getWitness`, `verifyReference` | No client-side claim of cryptographic verification without an actual verifier. |
| `AttributionProvider` | `getAttribution`, `getAIStatement` | No conversion of creator declaration into a legal conclusion. |

Every operation takes a `BridgeReadContext`. The context contains the NEX-ARK account id and explicit read scopes, not a Living Nexus database id. In `requireCanonical` mode, a mock adapter must return `NOT_CONNECTED` or `NOT_SUPPORTED`, never a fixture that resembles a canonical result.

## 6. Mock-First Implementation

### 6.1 LocalMockNexusBridge

The first NEX-ARK repository should ship with `LocalMockNexusBridge`. It provides UI-ready, deliberately fictional fixtures for cards and settings-flow development. Its required properties are:

1. Every result carries `source.mode = "mock"` and `provider = "local-mock"`.
2. Fixture ids use non-Living-Nexus prefixes such as `mock-creator-001` and `mock-creation-001`.
3. It must not emit a WID-shaped fixture value, a copied production creator, a real Living Nexus URL, or an unlabelled verification result.
4. `verifyReference()` returns `not-supported` unless a deterministic local fixture specifically exercises a mock verifier.
5. All fixtures live in the NEX-ARK repository, not in the Living Nexus repository or database.

### 6.2 UnavailableNexusBridge

NEX-ARK must also implement `UnavailableNexusBridge`. This protects independent operation when no adapter is configured, a real provider fails, a grant is revoked, or a reference is not public. The UI should retain the social post and show an honest non-blocking state rather than falling back to invented proof details.

### 6.3 Future LivingNexusBridge

`LivingNexusBridge` is a future adapter only. It may be created when Living Nexus deliberately publishes supported API endpoints, authentication/grant protocol, public visibility semantics, response schemas, versioning policy, rate limits, and verification behavior. Until then, the name may exist as an empty factory or disabled adapter, but it must not contain guessed URLs, undocumented bearer-token flows, direct database access, or a scraped UI transport.

## 7. Connected Identity Prototype

The NEX-ARK Settings route should contain a **Connected Identity** panel.

> **Connect Living Nexus**  
> Connect your Living Nexus creator identity to bring your witnessed creations, provenance records, testimony, attribution, and lineage into NEX-ARK.

For the prototype, the action opens a transparent staged flow:

| Step | Prototype behavior | Future connected behavior |
|---|---|---|
| 1. Explain | Explain that Living Nexus remains canonical and that NEX-ARK will hold references/projections. | Same text, retained. |
| 2. Choose scope | Let the user select illustrative read scopes only. | Request real, minimum, revocable scopes through a Living Nexus-approved grant flow. |
| 3. Choose identity | Select a mock creator fixture or remain unconnected. | Resolve a real creator only through a supported provider response. |
| 4. Review | Show exactly what NEX-ARK will display and label every fixture as mock. | Show returned references, visibility, cache policy, and provider source. |
| 5. Confirm | Persist only a NEX-ARK-local mock connection record. | Persist an encrypted, revocable connection grant and non-canonical references. |

The prototype must not simulate a successful Living Nexus login, OAuth grant, signature verification, WID issuance, consent, or import.

## 8. NEX-ARK Local Data Model

NEX-ARK has its own social database. Its Bridge tables hold only integration state and reference metadata.

| NEX-ARK entity | Purpose | Must not contain |
|---|---|---|
| `nexus_connections` | NEX-ARK account, adapter mode, selected scopes, status, revocation timestamp | Living Nexus password, private key, raw session cookie, undocumented token. |
| `nexus_references` | Typed canonical pointer, provider, cache metadata, last known display label | A claimed substitute provenance event or locally issued WID. |
| `nexus_projection_cache` | Expiring non-canonical display projection and source timestamp | Private media, hidden testimony, sensitive proof material, a source-of-truth flag. |
| `social_post_references` | Join between an NEX-ARK social post and one or more references | Copied Chain of Record presented as original. |
| `nexus_audit_log` | User-initiated connect, refresh, unlink, and provider error events | Content that a provider did not disclose. |

Any social reaction, comment, bookmark, follow, support interaction, playlist placement, or community activity belongs to NEX-ARK. It does not mutate Living Nexus counters, publication state, creator profile, Work metadata, or provenance.

## 9. Privacy, Consent, and Authority Rules

1. A connection is **creator-initiated** and **revocable**. Revoking NEX-ARK access removes future provider reads; it does not alter a Living Nexus record.
2. NEX-ARK must honor provider visibility exactly. `private`, `unlisted`, unknown, or insufficient-scope objects never enter a public social feed through the Bridge.
3. Caches are projections. Display `fetchedAt` internally and expire/revalidate them according to the future provider’s documented policy.
4. A copied WID string is not proof. NEX-ARK may render it only with its returned source and verification state.
5. A Bridge cannot create WIDs, publish a Work, attach assets, issue provenance events, replace audio, edit participation, or create lineage. Those actions remain in Living Nexus.
6. Creator declaration, system observation, independently verified evidence, and legal conclusion are distinct labels. The Bridge may return the first three when authorized; it must not emit the fourth.

## 10. Error and Fallback Semantics

| Condition | Bridge result | NEX-ARK behavior |
|---|---|---|
| No connection | `NOT_CONNECTED` | Keep social features usable; offer Connect Living Nexus. |
| Mock adapter with canonical requirement | `NOT_CONNECTED` | State that canonical confirmation is unavailable. |
| Reference unavailable or not public | `NOT_PUBLIC` or `NOT_FOUND` | Suppress from public display; do not guess why. |
| Provider lacks feature | `NOT_SUPPORTED` | Render a neutral “not available from this connection” state. |
| Provider outage | `UPSTREAM_UNAVAILABLE` | Preserve social post; show last known projection only if it is visibly cached/non-canonical. |
| Integrity cannot be evaluated | `INTEGRITY_UNKNOWN` | Do not call the reference verified. |

## 11. Future API Acceptance Criteria

Living Nexus should not be wired to NEX-ARK until the following are separately defined and approved:

| Requirement | Minimum evidence |
|---|---|
| Endpoint catalogue | Deliberate documented endpoints for the Bridge operations; no inferred internal routes. |
| Authentication and consent | Creator-initiated grant, narrow scopes, revocation, expiration, and auditability. |
| Visibility policy | Exact public/unlisted/private semantics for every return type. |
| Data schemas | Versioned response contracts and backwards-compatibility policy. |
| Proof verification | Explicit public verifier behavior, technical result classes, and no legal claim. |
| Rate/caching policy | Provider-defined limits and cache TTLs. |
| Security review | Token handling, redirect validation, abuse controls, audit logging, and data minimization. |

## 12. NEX-ARK Acceptance Tests

The new repository should implement these before any real connection:

1. NEX-ARK runs with `UnavailableNexusBridge`; social feed and profiles still work.
2. Mock cards visibly say mock and use only fictional identifiers.
3. `requireCanonical: true` rejects mock responses.
4. A social post with a Bridge reference does not permit a mutation to a canonical object.
5. A private/unavailable mock reference does not appear in a public social projection.
6. `verifyReference()` cannot return `verified` from a no-op mock implementation.
7. Unlinking an identity deletes or disables the NEX-ARK connection/cache according to its policy without touching any Living Nexus record.
8. Every bridge-backed UI card exposes a canonical URL only when the provider returns one.

## References

[1]: [Prepared Work registration boundary and WID serialization](../../shared/preparedWorkRegistration.ts)  
[2]: [Current internal profile resolution and creator-card fields](../../server/routers/profile.ts)  
[3]: [Public Work-to-album authority boundary](../lnls/architecture/ADR-PUBLIC-WORK-ALBUM-LINK.md)  
[4]: [Creator-ready public identity boundary](../lnls/architecture/ADR-HOME-CREATOR-IDENTITY-LAYER.md)
