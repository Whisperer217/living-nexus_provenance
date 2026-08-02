# Living Nexus — Context-Engineered Refinement Prompt

**Version:** Aug 2, 2026  
**Platform:** Living Nexus — The Sovereign Creative Registry  
**Stack:** React 19 + Tailwind 4 + tRPC 11 + Drizzle ORM + MySQL (TiDB)  
**Deployment:** Auto-publish on every checkpoint to `livingnexus.org`

---

> **Standing Operational Order:** Before every checkpoint, execute the 15-pass loop defined in [`MASTER_REFINEMENT_LOOP.md`](./MASTER_REFINEMENT_LOOP.md). If any pass surfaces a "no" answer to the doctrine questions, redesign before shipping.

---

## Purpose

Preserve the living record of human creative contribution.

## Mission

> Every creator deserves attribution.  
> Every work deserves provenance.  
> Every contribution deserves preservation.  
> Every steward deserves support.

---

## The Prime Directive

> **Every design decision, database schema, API endpoint, and user interaction must increase the permanence, discoverability, attribution, and supportability of human creative contribution. If a feature optimizes engagement while diminishing those four qualities, it should be redesigned.**

This is the single sentence every decision ultimately answers. The seven doctrine questions, the design language, the provenance system, and the support infrastructure are all consequences of this one directive.

---

## The Four Permanent Platform Pillars

Everything built on Living Nexus is a consequence of these four qualities. When a decision is unclear, return to the pillar it serves.

| Pillar | Statement | What it demands |
|---|---|---|
| **PRESERVE** | Every work survives. | Append-only provenance, version history, WID permanence, archive exports |
| **ATTRIBUTE** | Every creator is visible. | Authorship above the fold, HAAI declarations as primary content, creator panels on every work screen |
| **DISCOVER** | Every contribution can be found. | Universal works index, WID search, Explore cathedral, public API, MCP tools |
| **SUPPORT** | Every creator can be sustained. | One-tap Support Creator on every creator-facing screen, full SupportCreatorDrawer, patronage tiers, licensing |

---

## Platform Identity

Living Nexus is not a streaming service. It is not a social feed. It is not a marketplace.

It is the **sovereign creative registry** — a permanent, cryptographically-anchored record of human creative contribution. Every work registered here receives a **Witness ID (WID)**, a tamper-evident timestamp that proves authorship before the work touches any other platform. Every creator is a steward. Every work is a preserved manifestation.

The design language is **Cathedral**: library, museum, archive, illuminated manuscript. Not infinite scroll. Not algorithmic content farm.

---

## Platform Architecture — Six-Layer Infrastructure Model

Living Nexus is infrastructure, not just a website. Every component, schema table, API endpoint, and UI screen belongs to one of these six layers. Future agents should identify which layer they are working in before writing a single line of code.

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — IDENTITY                                             │
│  Creator: users, agents, artistHandle, bio, declaration,        │
│           profilePhoto, bannerImage, stripeAccountStatus        │
│  The human being behind the work. The steward.                  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  LAYER 2 — MANIFESTATION                                        │
│  Work: songs (audio, lyrics, manuscript, comic, image,          │
│        game, gcode, 3dmodel), visualWorks                       │
│  The act of creation. The manifestation.                        │
│  HAAI fields (haaiOriginStory, haaiVisualConcept, etc.)         │
│  are primary content — not metadata.                            │
│  Every work begins life here.                                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  LAYER 3 — RELATIONSHIP                                         │
│  Album • Collection • Project • Playlist                        │
│  collections, projects, playlists, manifestedCollections,       │
│  collectionTracks, projectSongs                                 │
│  How works relate to each other and to the world.               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  LAYER 4 — REGISTRY                                             │
│  WID • Provenance • Timeline • Declaration                      │
│  wids, provenanceEvents, workLineage, workWitnesses,            │
│  declarationSignatures, witnessTestimonies, workEvidence        │
│  The permanent, append-only, cryptographic record.              │
│  This layer is never edited — only appended.                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  LAYER 5 — STEWARDSHIP                                          │
│  Patronage • Licensing • Commerce • Tips • Distribution         │
│  tips, licenses, witnessSubscriptions, paymentTransactions,     │
│  creatorPaymentSettings, marketplaceItems, slotPurchases        │
│  Creation becomes economically sustainable.                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│  LAYER 6 — LEGACY                                               │
│  Sovereign Archive • Version Exports • Redundant Storage        │
│  Registry Snapshots • Cold Storage • Future Migration           │
│  sovereignArchive export, dbExport, S3 storage,                 │
│  audioVersions, songVersions, collectionVersions,               │
│  playlistVersions, selfImprovementRuns                          │
│  The work survives the platform.                                │
└─────────────────────────────────────────────────────────────────┘
```

**Layer rules for agents:**
- A change to Layer 4 (Registry) is **append-only** — never update or delete provenance records
- A change to Layer 1 (Identity) propagates to all layers below — test all downstream screens
- A change to Layer 5 (Stewardship) requires Stripe test mode verification before checkpoint
- Layer 6 (Legacy) operations are irreversible — always checkpoint before running export jobs
- When a new feature spans multiple layers, design the data model (Layer 4) before the UI (Layer 1–3)
- The path is always: Steward → Manifestation → Legacy

---

## The Seven Doctrine Questions

Before implementing any feature or change, every screen must answer **yes** to all seven:

1. **Does this increase trust?** — Cryptographic proof, WID seals, provenance chains must be visible, not buried.
2. **Does authorship feel visible?** — Creator name, avatar, handle, and declaration must be present without scrolling.
3. **Does provenance feel tangible?** — The custody chain (Creator → Collection → Work → Witness → Registry → Verification) must be traceable from the screen.
4. **Can the creator's story be understood in seconds?** — Bio, origin story (`haaiOriginStory`), and artist statement must be above the fold or within one obvious tap.
5. **Can someone support the creator with one obvious action?** — A single gold "Support Creator" button must be present on every creator-facing screen, opening the full `SupportCreatorDrawer` (one-time tip, monthly patronage, purchase, license, follow, view provenance).
6. **Does this screen preserve context instead of hiding it?** — Navigation back to the work, the creator, and the registry must always be visible.
7. **Is the work treated like a living artifact rather than just a file?** — Version history, provenance events, testimony, and declaration must be surfaced, not hidden behind tabs.

**If the answer to any question is "no," redesign the interaction before adding new functionality.**

---

## Codebase Architecture

### Key Files

```
drizzle/schema.ts          — Source of truth for all data models
server/routers/songs.ts    — Primary work procedures (verify, discover, exploreIndex, etc.)
server/routers/profile.ts  — Creator profile procedures
server/db/songs.ts         — Query helpers (getPublicSongs, getSongByWitnessId, etc.)
client/src/pages/          — 40+ page components
client/src/components/     — 80+ shared components
client/src/index.css       — Design tokens (all --ln-* variables)
client/src/contexts/WorkEditorContext.tsx — Lazy-loaded CreativeDrawer (startTransition)
```

### Content Types (songs.contentType enum)

| Value | WID Prefix | Meaning |
|---|---|---|
| `audio` | WID-MUS | Music track |
| `lyrics` | WID-LYR | Standalone lyrics |
| `manuscript` | WID-MSS | Book / manuscript |
| `comic` | WID-COM | Comic / sequential art |
| `image` | WID-IMG | Visual artwork |
| `game` | WID-GAM | Playable game |
| `gcode` | WID-GCD | G-code / fabrication file |
| `3dmodel` | WID-3DM | 3D model |

### HAAI Declaration Fields (songs table)

These fields capture the **human creative intent** behind every work. They are the soul of the provenance system and must be treated as primary content, not metadata:

| Field | Purpose |
|---|---|
| `haaiOriginStory` | The spark — the human experience that birthed the work |
| `haaiVisualConcept` | The cinematic image the creator was articulating |
| `haaiStyleLanguage` | Plain-language description of the desired style |
| `haaiInstrumentation` | Sonic palette and instrumentation choices |
| `haaiVocalConveyance` | Voice, tone, and delivery intent |
| `haaiLyricalInspiration` | Lyrical seed and inspiration anchors |
| `haaiEmotionalTone` | Emotional tone and alignment |
| `haaiDeclaredAt` | Timestamp of declaration completion |

### Design Token Reference

```css
/* Backgrounds */
--ln-void:      #0A0806   /* deepest background */
--ln-coal:      #000000   /* card/surface */
--ln-iron:      #1C1A14   /* secondary surface, hover */
--ln-ash:       #2E2B22   /* borders, dividers */
--ln-obsidian:  #060504   /* header strips, floating panels */

/* Text */
--ln-parchment: #E8DFC8   /* headings, high-contrast */
--ln-bone:      #C9C0A8   /* primary body text */
--ln-smoke:     #6B6555   /* secondary text, labels */

/* Gold Accent System */
--ln-gold:      #C49A28   /* primary CTA, badges, WID seals */
--gold-glow:    #D4A84B   /* hover / active state */
--ln-gold-dim:  #8B6914   /* subdued accents, footnotes */

/* Semantic */
--ln-ember:     #E05A2B   /* destructive actions, warnings */
--ln-seal-bright: #4ADE80 /* verified / active state */
--ln-ink:       #0A0806   /* text on gold backgrounds */
```

### Typography System

```css
font-family: 'Cinzel', serif          /* section headers, WID labels, CTAs */
font-family: 'Cormorant Garamond'     /* origin stories, pull quotes, body editorial */
font-family: 'EB Garamond'            /* body text, descriptions */
font-family: 'Oswald', sans-serif     /* overlines, eyebrows, stat labels */
font-family: 'JetBrains Mono'         /* WID codes, hashes, technical values */
```

---

## Component Inventory (Key)

### Existing — Use Before Building New

| Component | Purpose |
|---|---|
| `SupportCreatorDrawer` | 6-option support action sheet (tip, patronage, purchase, license, follow, provenance) |
| `WorkListRow` | Premium list row — cover art, WID badge (clickable → verify), type chip, actions |
| `CreativeDrawer` | Full work editor — lazy-loaded via React.lazy + startTransition |
| `ChainOfRecordFooter` | Provenance chain visualization at page bottom |
| `ProvenanceTimeline` | Chronological custody events |
| `WIDPanel` | Cryptographic verification display |
| `SacredCanvas` | Animated SVG canvas for ambient cathedral visuals |
| `ConstellationReveal` | Star/constellation entrance animation |
| `CinematicSongHeader` | Full-bleed hero for audio works |
| `MediaAsset` | Responsive cover art with focal point control |
| `DeclarationModal` / `CovenantBadge` | HAAI declaration flow |
| `CreatorIdentitySection` | Creator bio + stats block |
| `ManifestationShelf` | Horizontal scrolling work shelf |
| `AIChatBox` | Full-featured streaming chat (for Keeper AI) |

---

## Router Namespace Reference

```
trpc.songs.*           — Works: discover, exploreIndex, verify, updateStatus, download
trpc.profile.*         — Creators: allCreators, getByHandle, getById
trpc.witnessRegistry.* — WID registry: stamp, verify, list
trpc.tips.*            — One-time support: createTipCheckout
trpc.witnessSubscription.* — Patronage: subscribe, getMySubscriptions
trpc.collectionStudio.* — Albums/collections: create, addTrack, publish
trpc.keeper.*          — AI companion: chat, notes, characterSheet
trpc.missionControl.*  — Phase ledger: getPhases, updatePhase
trpc.testimony.*       — Witness testimonies: submit, list
trpc.evidence.*        — Work evidence: attach, list
trpc.declaration.*     — HAAI declarations: submit, getByWork
trpc.search.*          — Full-text search across works and creators
trpc.auth.*            — Session: me, logout
trpc.system.*          — Owner notifications: notifyOwner
```

---

## Current Platform State (Aug 2, 2026)

### Recently Completed

- **Explore Page Cathedral Redesign** — 11 sections, list/grid/creator views, Randomize switch with constellation animation, All Tracks slider, Creator filter
- **Experience Audit Implementation** — VerifyPage creator panel (avatar, bio, origin story, Support Creator CTA), SongDetailPage origin story above fold, CreatorProfilePage Support Creator button, WID badge links to verify
- **Edit Work Freeze Fix** — CreativeDrawer lazy-loaded via React.lazy + startTransition; no more main-thread blocking on SongDetailPage
- **Platform Polish Pass** — prefers-reduced-motion global rule, focus-visible keyboard rings, mobile action button visibility, analytics script guard

### Known Open Issues

- `%VITE_ANALYTICS_ENDPOINT%` still appears in server logs (URIError) — the guard in `index.html` prevents the client error but the Express route still receives the malformed request
- The `harmonic-resonance` animation on SongDetailPage is guarded by `useReducedMotion` but the SacredCanvas rAF loop is not yet guarded
- No `staleTime` on `trpc.songs.newThisWeek` and `trpc.songs.trending` queries — refetches on every window focus

---

## Refinement Mandate

When refining any part of Living Nexus, operate under these constraints:

### What to Preserve
- The cathedral design language — dark ink backgrounds, gold accents, serif typography, generous whitespace
- The provenance-first information hierarchy — WID seals, custody chains, and declarations are primary content
- The `--ln-*` design token system — never hardcode colors
- The tRPC-first data pattern — never introduce fetch/axios wrappers
- The lazy-loaded CreativeDrawer pattern — never revert to synchronous import
- The `useReducedMotion` hook for all JS-driven animations

### What to Question
- Any screen that buries authorship below the fold
- Any action that requires more than one tap to support a creator
- Any loading state that shows a blank spinner instead of a content-shaped skeleton
- Any error message that exposes raw tRPC error codes to the user
- Any navigation dead-end (page with no escape route back to the registry)

### What to Never Do
- Hardcode colors outside the `--ln-*` token system
- Import CreativeDrawer synchronously (it is 1408 lines and must remain lazy)
- Store file bytes in database columns (always use S3 via `storagePut`)
- Nest `<a>` tags inside `<Link>` components
- Use `new Date()` or array literals as tRPC query inputs (causes infinite refetch)
- Fabricate, mock, or seed user-generated content (reviews, testimonials, ratings)
- Call LLM functions from client-side code (always server-side via tRPC procedure)

---

## Refinement Prompt Template

Use this when asking for any change, fix, or new feature:

```
CONTEXT: Living Nexus — Sovereign Creative Registry
Stack: React 19 + Tailwind 4 + tRPC 11 + Drizzle/MySQL
Design: Cathedral (dark ink, gold accents, Cinzel/Cormorant Garamond typography)
Doctrine: Every screen must answer yes to all 7 doctrine questions before shipping.

CURRENT STATE:
[Describe what exists — component name, file path, current behavior]

PROBLEM:
[Which of the 7 doctrine questions does this fail? Why does it fail?]

DESIRED OUTCOME:
[What should the screen/component do after the fix?]

CONSTRAINTS:
- Preserve the --ln-* design token system
- Do not synchronously import CreativeDrawer
- Do not introduce fetch/axios — use trpc.* hooks only
- Run `npx tsc --noEmit` and `pnpm test` before checkpoint
- Mark completed items in todo.md before saving checkpoint

RELEVANT FILES:
[List the specific files that need to change]

RELEVANT PROCEDURES:
[List the tRPC procedures that serve this screen]
```

---

## The Living Nexus Doctrine (Condensed)

> Living Nexus is not a feed. It is the living registry of human creative contribution.  
> Every work is a preserved manifestation.  
> Every creator is a steward.  
> Explore is the grand hall where those contributions are discovered.  
> The registry does not optimize for engagement. It optimizes for permanence, attribution, and trust.  
> When in doubt, ask: does this make the creator's contribution feel more permanent, more attributed, and more trustworthy? If yes, ship it. If no, redesign it.
