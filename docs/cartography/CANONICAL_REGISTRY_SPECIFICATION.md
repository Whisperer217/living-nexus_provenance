# C. Canonical Registry Specification — Current Evidence Map

> **Not a legal registry specification.** This document states the records and controls located so far and identifies the verification work still required.

## Registry Flow

```text
Creator
  ↓
Intent / Origin Statement
  ↓
Manifestation (work record)
  ↓
Creator Declaration (participation, HAAI, attestation, rights metadata)
  ↓
WID / provenance anchor
  ↓
Evidence and timeline
  ↓
Relationships and versions
  ↓
Rights / licensing / support
  ↓
Distribution and archive
```

| Stage | Database representation located | API/UI evidence located | Mutability / verification boundary | Audit classification |
|---|---|---|---|---|
| Creator | `users`, profile and identity fields | Creator routes and profile pages | Identity fields can be edited; identity assertion is not independently verified by a field alone. | **EXISTS** |
| Intent | `originStatement`, `creativeMission`, work HAAI origin fields, Guides reference fields | Creator/Work surfaces indicated by spec | Creator-entered intent is a declaration; evidence and revision history require trace. | **PARTIAL** |
| Manifestation | `songs` with assets, metadata, `contentType`, status, visual, audio, and editorial fields | `/manifest`, `/song/:id`, `/manage` | Work metadata is mutable in the ordinary work record; registry-level history requires separate event evidence. | **EXISTS** |
| Participation / HAAI declaration | participation axes, `aiDisclosure`, HAAI fields, AI-tool flags | Registration law and Work spec require display | Creator declaration; not a legal authorship finding. | **EXISTS / display trace pending** |
| WID | `wids` table; `songs.witnessId`, lyrics/visual fields | `/verify/:witnessId`; `wids` router exists | `provenance.ts` canonicalizes, hashes, and supports Ed25519 signing; full issuance and historic compatibility trace pending. | **PARTIAL** |
| Evidence / timeline | WID timestamp; provenance, witness, evidence, version-related tables and routers named in architecture/router assembly | Verify, witness, registry, evidence routes exist | Must distinguish append-only event behavior from editable work records. | **PARTIAL** |
| Relationships | Collections, projects, playlists, parent song/guide fields located | collection, album, playlist, constellation routes located | Relationship history and revocation/supersession semantics require trace. | **PARTIAL** |
| Versions | `songVersions`, `audioVersions`, `versions` router named in architecture map | version router mounted | Need confirm version creation, WID relation, and public display. | **PARTIAL** |
| Rights / licensing | `ownershipStatus`, download permission, object license fields; `licenses` router; licensing pages | Support/licensing namespaces and public Terms located | Ownership and license status are not adjudicated by stored enum values. | **PARTIAL** |
| Distribution | distribution route and external links fields located | `/distribute` exists | Provider contracts, delivery status, and licensing authority are untraced. | **PARTIAL** |
| Archive / export | archive models named in architecture; `/archive`, `/my-archive/export`, archive routers | Archive and export routes exist | Completeness, restoration, and external custody need test evidence. | **PARTIAL** |

## Cryptographic Boundary

The inspected service implements canonicalization, SHA-256 hashing, Ed25519 signing, and signature verification. The service comment labels its WID assignment as “WID = content hash for MVP.” This supports a narrow technical capability claim: **the service can produce a deterministic canonical payload hash and Ed25519 signature.** It does not, by itself, prove a legal chain of title, ownership, non-repudiation in every context, storage permanence, or every historical WID’s issuance method.

## Required Registry Controls Before Stronger Claims

1. Trace every current WID issuance, versioning, witness, and verification path.
2. Identify table- and API-level update/delete permissions for all records described as append-only.
3. Record timestamp authority, signing-key custody, rotation, revocation, and public verification behavior.
4. Define evidence provenance class: creator declaration, system observation, external record, witness testimony, derived statement, or unverified assertion.
5. Define export format and restoration test for an independently inspectable registry package.

