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

> **Creators do not log into Living Nexus. Creators log into their own persistent domain.**
>
> **Living Nexus is the registry, discovery engine, and provenance network — not the creator's workspace.**

---

### Core Principle

```text
Visitor
   │
   ▼
Sign In
   │
   ▼
Authenticate Identity
   │
   ▼
Resolve Creator Domain
   │
   ▼
Redirect Automatically
   │
   ▼
livingnexus.org/@username
```

**Never**

```text
Login → Living Nexus Homepage
```

**Always**

```text
Login → Creator Domain
```

---

### Creator Domain

The Creator Domain at `livingnexus.org/@handle` is the creator's permanent digital workspace:

```text
Creator Domain
│
├── Home
├── Artifact Library
├── Drafts
├── Collections
├── Videos
├── Images
├── Provenance
├── Analytics
├── Publishing
└── Settings
```

---

### Publishing Flow

```text
Creator Domain
      │
      ▼
Create Artifact
      │
      ▼
Edit
      │
      ▼
Version
      │
      ▼
Attach Provenance
      │
      ▼
Publish
      │
      ▼
Living Nexus Registry Index
      │
      ▼
Discovery
      │
      ▼
Public Artifact
```

Artifacts originate inside creator domains. The Registry never owns artifacts — it only indexes them.

---

### Public Architecture

```text
                     Living Nexus

             Discovery • Search • Registry
                    Featured Domains
                   Featured Artifacts
                      Collections

             ▲            ▲            ▲

──────────────────────────────────────────────────

      Domain A     Domain B     Domain C

      Artifacts    Artifacts    Artifacts
      Videos       Research     Images
      Collections  Papers       Projects
```

Living Nexus connects domains. Domains create artifacts. Artifacts power discovery.

---

### User Journey

```text
Visitor → Discover Artifact → Visit Creator Domain → Explore Creator
    → Follow Creator → Create Account → Own Domain Created → Publish Artifacts
```

---

### Architecture Rules

1. Authentication always redirects to the creator's domain.
2. Every creator owns one persistent domain.
3. Every artifact originates from a creator domain.
4. Living Nexus indexes published artifacts.
5. Discovery promotes both artifacts and creator domains.
6. The creator's domain is the primary workspace.
7. Living Nexus is infrastructure — not the creator's home.

---

### Design Philosophy

**Platform-first (prohibited)**

```
Website → Dashboard → Content
```

**Domain-first (required)**

```
Registry → Creator Domain → Artifacts → Discovery
```

---

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
       Creator Domain → Artifact Creation → Provenance Attached
            → Registry Indexed → Public Discovery
```

---

### Rationale

When a platform positions itself as the home, it implicitly claims ownership of the creator experience. The creator becomes a tenant. Their work becomes content on the platform's property.

When the creator's domain is the home, the relationship inverts. The creator is sovereign. The platform is infrastructure. This is not a UX preference — it is a statement about the nature of the relationship between Living Nexus and the people who use it.

This law governs every routing decision, every post-authentication redirect, every navigation structure, and every feature placement decision. If a feature would make the platform feel like the home rather than the creator's domain, that feature is misplaced.

---

### Final Principle

> Creators own domains. Domains own artifacts. Living Nexus connects the world to both.

---

### Implementation Notes

- **Post-login redirect:** `/@{handle}` (returning user) or `/setup-domain` (first-time user)
- **returnPath preservation:** If the user authenticated from a deep route, they return there first — then to their domain on next login
- **Discovery surface:** Leads with Featured Domains, not platform content
- **Prohibited:** Any redirect to the Living Nexus homepage after authentication

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
| **The Doctrine** | Manifesto, Lexicon, WID Specification, Design System, Architectural Laws, Intentional Interface |

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

---

## Law VII — Intentional Representation

*Enacted 16 August 2026. Source: Keeper direction during the Spatial Registry rebuild. Full text: `docs/INTENTIONAL_INTERFACE_DOCTRINE.md`.*

> **Nothing exists merely for decoration. Every object, movement, transition, relationship, and control must communicate the state, history, ownership, or experience of a registered work.**

The domain is the truth. The interface is testimony. Three.js, animation, lighting, sound, and conventional controls are instruments. They serve the life of a work. They do not exist to impress.

### Rationale

Profile → Edit → Register → Witness are not UI sections. They are actions in the life of a work. A spatial interface is justified only when it makes those actions tangible.

The failure mode is beauty without meaning: a constellation that looks expensive and explains nothing. The success mode is recognition: the viewer understands what they are looking at because the structure *is* the provenance.

### The Keep / Cut Test

- Cool but mute animation → cut.
- Unusual interaction that clarifies provenance → keep.
- Conventional control more intuitive than a spatial one in that case → use the conventional control.

Intentional does not mean complicated. It means nothing accidental.

### Spatial Grammar (non-exhaustive)

| Act | Meaning |
|---|---|
| Drag a work | Moving an artifact |
| Drop into Register | Declaring it |
| Witness appears | Attestation of an event |
| Follow lineage | Traversing history |
| Load into Player | Experiencing the registered artifact |
| Work revolves | Active / in playback |
| Camera approaches a node | Entering that record or domain |
| Camera pulls back | Seeing the larger lineage |
| Connection illuminates | A relationship is revealed |
| A version branches | Change without erasure |

### Prohibited

- Animation for animation's sake
- 3D because 3D is fashionable
- Buttons because SaaS platforms have buttons
- Treating the visualization layer as the registry

