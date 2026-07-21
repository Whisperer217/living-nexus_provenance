# Living Nexus — Architectural Laws
## The Governing Doctrine of Platform Construction
**Version:** 1.0 · **Enacted:** July 2026 · **Status:** Canonical and Immutable

---

## Preamble

Living Nexus is not merely a software system. It is a sovereign provenance platform — a place where human authorship is permanently anchored, witnessed, and protected. The architecture of this platform must reflect that purpose at every level. These laws govern how the platform is built, how its artifacts are identified, and how the domain reality of the platform is always held above its technical implementation.

The domain is the truth. The software is the instrument. The instrument serves the truth. It does not define it.

---

## The Two Roots

Every artifact in Living Nexus belongs to two ontological trees simultaneously:

```
Living Nexus
│
├── Domain Ontology
│   [What things ARE — the reality of the platform]
│   The Covenant · The Creator · The Work · The Witness
│   The Chain of Record · The Archive · The Registry
│   The Living Graph · The Keeper · The Doctrine
│
└── Software Ontology
    [How things are BUILT — the implementation of the platform]
    Infrastructure · Identity · Archive · Registry · Living Graph
    Upload · Keeper · Discovery · Player · Community
    Economy · Dashboard · Navigation · Admin · Developer · Media
```

These two trees are not the same tree. The Domain Ontology describes reality. The Software Ontology describes implementation. **The implementation is always subordinate to the domain.**

A file's location in the Software Ontology (its filesystem path, its module, its directory) does not determine its Domain Ontology identity. A `SongDetailPage.tsx` in `/pages/` is, in the domain, a **Witness Surface for a Work** — that identity must be declared, not inferred.

---

## Law I — The Dual Identity Principle

> **Every artifact in Living Nexus shall declare both its domain identity and its implementation identity.**
>
> **Domain Identity** answers: *What is this?* — its place in the ontology of the platform, independent of how it is built or where it lives.
>
> **Implementation Identity** answers: *How does this fulfill its purpose?* — its technical form, location, and mechanism.
>
> **Neither identity may be inferred solely from filesystem location, filename, or technical structure. Both must be explicit.**

### Rationale

Filesystem paths are deployment artifacts. They communicate directory structure and module boundaries, but they communicate nothing about what a thing *is* in the domain. A router file named `songs.ts` tells a developer it handles song-related procedures. It does not tell them that it is the **Registration Gateway for Creative Works** in the domain ontology — the boundary where a human creator's work transitions from private creation to sovereign public record.

When domain identity is implicit, it erodes. Developers make decisions based on technical convenience rather than domain truth. Features drift from their ontological home. The platform loses coherence.

When domain identity is explicit, it is enforced. Every change to a file must be evaluated against both its domain purpose and its technical form. The platform remains coherent across time and contributors.

### The Annotation Standard

Every source file in Living Nexus shall carry a header block declaring both identities. The format is:

```ts
/**
 * @domain   [Domain Branch] → [Domain Node] → [Domain Leaf]
 * @impl     [Technical Form] — [Purpose Description]
 */
```

**Domain Branch** is one of the ten domain nodes:
`The Covenant` · `The Creator` · `The Work` · `The Witness` · `The Chain of Record` · `The Archive` · `The Registry` · `The Living Graph` · `The Keeper` · `The Doctrine`

**Technical Form** is one of:
`Page Component` · `Server Router` · `Database Schema` · `Server Service` · `Server Route` · `React Component` · `React Hook` · `Design Token` · `Shared Type` · `Test Suite` · `Worker` · `Infrastructure`

### Annotation Examples

```ts
/**
 * @domain   The Work → Creative Works → Music
 * @impl     Server Router — tRPC procedures for audio work registration, CRUD, and discovery
 */
// server/routers/songs.ts
```

```ts
/**
 * @domain   The Chain of Record → Provenance → Sovereign Stamp
 * @impl     Server Service — Sovereign stamp generation and cryptographic anchoring
 */
// server/services/sovereignStamp.ts
```

```ts
/**
 * @domain   The Witness → Witness Surface → Audio Consumption
 * @impl     React Component — Persistent global audio player with cinematic mode
 */
// client/src/components/player/GlobalPlayer.tsx
```

```ts
/**
 * @domain   The Doctrine → Design Language → Token Layer
 * @impl     Design Token — Single source of truth for all visual decisions
 */
// client/src/design-system/tokens.ts
```

```ts
/**
 * @domain   The Creator → Identity → Keeper Archetype
 * @impl     Server Router — Keeper archetype assignment and ◈ balance procedures
 */
// server/routers/keeper.ts
```

```ts
/**
 * @domain   The Covenant → Economy → Reciprocity
 * @impl     Server Router — Payment provider abstraction and Stripe/Bitcoin/Lightning/USDC
 */
// server/payments/registry.ts
```

```ts
/**
 * @domain   The Archive → Vault → Canonical Data Model
 * @impl     Database Schema — Drizzle ORM schema defining all platform tables and relationships
 */
// drizzle/schema.ts
```

---

## Law II — Domain Supremacy

> **When a technical decision conflicts with a domain truth, the domain truth prevails.**

If a routing convention, a database normalization rule, or a framework pattern would require misrepresenting what something is in the domain, the technical pattern yields — not the domain. The domain is the source of truth. The software is its expression.

This law applies to naming, to structure, to data modeling, and to UI design. A button that "likes" a work is wrong in this domain — not because of a style preference, but because the domain truth is **witnessing**, not liking. The UI must reflect domain reality.

---

## Law III — The Covenant of Subordination

> **The Software Ontology exists to serve the Domain Ontology. It has no independent authority.**

Software decisions — architecture, frameworks, data structures, naming conventions — are made in service of the domain. They are not made for technical elegance, developer familiarity, or industry convention when those choices would compromise domain truth.

This does not mean technical quality is unimportant. It means technical quality is evaluated in terms of how well it serves the domain, not as an end in itself.

---

## Law IV — Explicit Over Implicit

> **In Living Nexus, nothing that matters shall be inferred. It shall be declared.**

This law extends beyond file annotations. It applies to:

- **Work authorship** — declared via WID, not inferred from upload account
- **Provenance** — declared via Chain of Record, not inferred from metadata
- **Human agency** — declared via HAAI Declaration, not assumed from file origin
- **Creator intent** — declared via Manifestation Studio, not inferred from content type
- **Domain identity** — declared via `@domain` annotation, not inferred from filepath

The platform's entire purpose is to make authorship explicit and permanent. That principle must govern the platform's own construction.

---

## Law V — The Immutability of the Chain

> **Once a domain truth is recorded in the Chain of Record, it cannot be erased. It can only be superseded.**

This law governs the Registry and the Archive. A registered work may be updated, revised, or superseded — but its original registration, its original WID, and its original Chain of Record entry are permanent. No technical operation, no admin action, and no creator request may delete them.

Supersession is the mechanism of change. Deletion is not permitted in the domain of authorship.

---

## Applying the Laws: A Decision Framework

When building or modifying any artifact in Living Nexus, ask these questions in order:

| Step | Question | Governed By |
|---|---|---|
| 1 | What is this in the domain? | Law I — Dual Identity |
| 2 | Does this technical decision serve that domain truth? | Law II — Domain Supremacy |
| 3 | Is this decision made in service of the domain, or for its own sake? | Law III — Covenant of Subordination |
| 4 | Is this identity explicit, or am I relying on inference? | Law IV — Explicit Over Implicit |
| 5 | If this touches the Chain of Record, is immutability preserved? | Law V — Immutability |
| 6 | Does this feature make the platform feel like the home, or the creator's domain feel like the home? | Law VI — Creator Domain |

Only after all six questions are answered affirmatively may an artifact be considered complete.

---

## Annotation Enforcement

The `@domain` and `@impl` annotations are not optional comments. They are load-bearing declarations. Future tooling will parse these annotations to:

1. Generate the live Domain Ontology map at `/design-system#ontology`
2. Validate that no file's implementation drifts from its declared domain identity
3. Produce the platform's self-documenting architecture reference
4. Alert contributors when a proposed change would move a file across domain boundaries without explicit re-declaration

Until automated enforcement is in place, annotations are enforced by code review. A pull request that adds or modifies a source file without a `@domain`/`@impl` header is incomplete.

---

## Law VI — The Creator Domain Principle

> **Living Nexus is not the home. Creators' domains are the home. Living Nexus is the registry, discovery engine, and provenance network that connects those domains together.**
>
> **Authentication resolves to the creator's persistent domain, not to the platform homepage. The platform indexes — it does not own — the creator experience.**

### Observation Chain

This law was derived from the following chain of observation, recorded July 20, 2026:

```
Observation
│
├── Existing creator platforms (Steam, GitHub, YouTube Studio)
│      └── Users authenticate into their own workspace.
│
├── Existing Living Nexus architecture
│      └── Authentication returns users to the platform homepage.
│
├── Design tension identified
│      └── Platform appears to own the creator experience.
│
├── Insight
│      └── The creator's domain should be the primary workspace.
│
├── Architectural Decision
│      └── Authentication resolves to a persistent creator domain.
│
├── Publishing Model
│      └── Artifacts are created and managed within creator domains.
│
├── Registry Function
│      └── Living Nexus indexes, connects, and enables discovery.
│
└── Resulting Principle
       Creator Domain
            ↓
       Artifact Creation
            ↓
     Provenance Attached
            ↓
      Registry Indexed
            ↓
      Public Discovery
```

### The Domain Structure

Every creator owns a persistent domain at `livingnexus.org/@handle`. That domain is their digital home — not a profile page, not a dashboard, but a sovereign workspace containing:

| Section | Purpose |
|---|---|
| Identity | WID Handle, Keeper Archetype, bio, avatar, banner |
| Artifact Library | All registered works across all mediums |
| Video Library | Video works and cinematic content |
| Collections | Curated groupings of works |
| Drafts | Unpublished works in progress |
| Publishing | Artifact creation, versioning, provenance attachment |
| Analytics | Witness counts, discovery metrics, provenance events |
| Settings | Domain configuration, privacy, licensing defaults |
| Media | Raw media assets, uploads, storage |
| Provenance | Chain of Record for all works |
| Version History | Full version lineage for every artifact |

### The Login Flow

```
Login
   │
   ▼
Creator Domain (/@handle)
```

Not:

```
Login
   │
   ▼
Living Nexus Dashboard
```

### The Registry's Role

Living Nexus as a platform operates as:

```
                Living Nexus

          Registry
          Discovery
          Search
          Collections
          Trending

                 ▲
                 │
────────────────────────────────────
      Creator Domain

Identity · Artifact Library · Video Library
Collections · Drafts · Publishing
Analytics · Settings · Media
Provenance · Version History
```

Creator Domains create artifacts. Artifacts feed the Registry. Registry powers discovery. Living Nexus connects domains — it does not own them.

### The Mental Model

> Steam does not feel like Valve. Steam feels like YOUR library.
>
> Living Nexus should not feel like visiting a website. It should feel like entering your own digital domain.

### Rationale

When a platform positions itself as the home, it implicitly claims ownership of the creator experience. The creator becomes a tenant. Their work becomes content on the platform's property.

When the creator's domain is the home, the relationship inverts. The creator is sovereign. The platform is infrastructure. This is not a UX preference — it is a statement about the nature of the relationship between Living Nexus and the people who use it.

This law governs every routing decision, every post-authentication redirect, every navigation structure, and every feature placement decision. If a feature would make the platform feel like the home rather than the creator's domain, that feature is misplaced.

---

## Domain Ontology Reference

The ten domain nodes and their children:

| Domain Node | Children |
|---|---|
| **The Covenant** | Ethics, Terms, Privacy, Pricing (90/10), Attribution |
| **The Creator** | Identity, WID Handle, Keeper Archetype, Domain, Founding Status |
| **The Work** | Publications, Creative Works, Software, Research, Doctrine, IP, Evidence, Versions |
| **The Witness** | Witness Action, Testimony, Witness Flow, Witness Surface |
| **The Chain of Record** | WID Issuance, Provenance Events, Harmonic Signature, Sovereign Stamp, Transformation Lineage |
| **The Archive** | Vault, Versions, Licensed Downloads, Liked Works |
| **The Registry** | Witness Registry, WID Verification, Public Ledger |
| **The Living Graph** | Constellation, Work Relationships, Creator Graph, Full Graph |
| **The Keeper** | Archetype, ◈ Economy, PPG, Celestial Codex, Marketplace |
| **The Doctrine** | Manifesto, Lexicon, WID Specification, Design System, Architectural Laws |

---

*These laws were enacted July 2026 by the Living Nexus platform doctrine. They are not subject to revision by technical convenience. Any proposed amendment must demonstrate that the amendment serves the domain more faithfully than the current law.*

---

## Law VI — Implementation Specification (Authentication Flow v2)

*Enacted July 20, 2026. Source: Jake, Living Nexus Architecture Shift document.*

### Authentication States and Transitions

```
State 1: Unauthenticated
  └── Action: Visit livingnexus.org
  └── Destination: Discovery Surface (public)
  └── Primary content: Featured Domains, Trending Artifacts

State 2: Authentication Initiated
  └── Action: Click "Sign In"
  └── Destination: Manus OAuth
  └── Returns to: State 3 or State 4

State 3: First-Time Creator (no handle set)
  └── Destination: /setup-domain
  └── Action: Claim handle
  └── On complete: Transition to State 4

State 4: Returning Creator (handle set)
  └── Destination: /@{handle}
  └── This is the Creator Domain — the persistent workspace
  └── No intermediate dashboard. No platform homepage.
```

### Creator Domain Workspace — Required Sections

The Creator Domain at `/@:handle` MUST contain all eleven sections:

| Section | Visibility | Purpose |
|---|---|---|
| Home | Public + Owner | Domain overview, stats, public link |
| Artifacts | Public + Owner | Full artifact library across all mediums |
| Drafts | Owner only | Unpublished works |
| Collections | Public + Owner | Curated groupings |
| Videos | Public + Owner | Video works |
| Images | Public + Owner | Visual works and photography |
| Provenance | Owner only | Chain of Record for all works |
| Analytics | Owner only | Witness & discovery metrics |
| Followers | Public + Owner | Domain audience |
| Publishing | Owner only | Publish to Registry |
| Settings | Owner only | Domain configuration |

### Discovery Surface Principle

The public Discovery surface (`/discover`) MUST:
- Lead with **Featured Domains** — not individual tracks
- Show creator domains as the primary entry point
- Present artifacts as entry points INTO creator domains
- Never present itself as a platform dashboard

### Publishing Flow (from the spec)

```
Artifact
  ↓
Draft
  ↓
Edit
  ↓
Attach Provenance
  ↓
Publish          ← The moment of Registry entry
  ↓
Registry Indexes Artifact
  ↓
Discovery Updates
  ↓
Public Domain Page
```

The Registry never owns the artifact. The creator's domain owns the artifact. The Registry indexes it.

### Prohibited Patterns

- Redirecting authenticated users to the Living Nexus homepage
- Presenting a "dashboard" as the post-login destination
- Any navigation structure that makes the platform feel like the home
- Discovery surfaces that lead with platform content rather than creator domains
