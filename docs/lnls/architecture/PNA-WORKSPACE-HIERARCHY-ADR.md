# PNA Workspace Hierarchy ADR

**Status:** Implemented and validated — 2026-10-04. This slice changes only PNA presentation and component composition; no schema, provider, authorization, registry, WID, or deployment behavior is activated by this document.

**Date:** 2026-10-04  
**Decision owner:** Living Nexus platform stewardship  
**Scope:** `/pna` workspace hierarchy, typography, visual density, desktop/mobile layout, and interface boundaries.

## Decision in one sentence

> Rebuild PNA around a clear private-workspace ontology—**Navigate → Converse / Create → Inspect**—so the creator’s active thread is the primary surface, contextual evidence is inspectable without competing with thought, and Cathedral atmosphere supports rather than displaces the work.

## Current-state evidence

The attached desktop screenshot and current source agree on five problems:

1. **Three competing centers of gravity.** The left avatar gallery, large passive cover-art stage, and narrow chat pane all demand primary attention. The conversation—the real working surface—is compressed into the right edge.
2. **Duplicated navigation.** Stewardship modes appear in both the left rail and the conversation header; the same decision is presented twice.
3. **Microtype and low contrast.** The PNA shell uses repeated `0.38–0.72rem` control text. Essential labels are below the Living Nexus text tier and disappear against dark panels.
4. **Card and border saturation.** Gold outlines appear around almost every local surface. The result is blocky visual noise rather than meaningful hierarchy.
5. **A decorative stage where a working canvas should be.** The center currently spends its largest area on cover art/avatar imagery even when there is no context, Artifact, or decision to review.

Current anchors:

| Concern | Existing source |
|---|---|
| Route shell, manual chat resize, stage, chat, avatar rail | `client/src/pages/PNAShellPage.tsx` |
| Context / Sources / Artifacts / Activity inspection surface | `client/src/components/pna/PNAWorkspaceRail.tsx` |
| Keyboard command palette | `client/src/components/pna/PNACommandPalette.tsx` |
| Context, consent, Artifact, and profile boundaries | `docs/lnls/architecture/PNA-CONTEXT-ENVELOPE-ARTIFACT-MANIFEST-SPEC.md` |

## Design translation

Current AI workspaces succeed because their structure is legible, not because they are visually generic. PNA adopts the underlying pattern without copying generic colors, labels, or behavior.

| Common AI-workspace principle | PNA translation |
|---|---|
| Sidebar remembers work | **Private rail** shows thread continuity and library destinations, not an avatar gallery first. |
| Conversation is the center of gravity | **Conversation** receives the fluid central column and readable body measure. |
| Context is available on demand | **Inspection rail** holds Context Envelope, Sources, Artifacts, and Activity as a deliberate secondary surface. |
| Composer makes capability clear | The **composer header** contains the one active Stewardship Profile, Context count, route state, and send action. |
| Artifact output receives a review surface | **Artifact Review** remains private, explicit, and separate from Work registration. |

## Target information architecture

### Desktop

```text
┌──────────────────────┬────────────────────────────────────────────────┬────────────────────────────┐
│ PRIVATE RAIL         │ PRIVATE THREAD / CANVAS                         │ INSPECTION RAIL            │
│                      │                                                │                            │
│ [+ New thread]       │ PNA / thread title                              │ Context · Sources ·         │
│ [Search threads]     │ [Guide ▾]  [0 attached sources] [route status] │ Artifacts · Activity        │
│                      │                                                │                            │
│ Recent threads       │ Conversation                                    │ Scope / evidence /          │
│ • intent session     │ • creator message                               │ private Artifact review     │
│ • arrangement draft  │ • PNA response                                  │                            │
│                      │                                                │                            │
│ Library              │ ────────────────────────────────────────────── │                            │
│ Quiver · Notes       │ Composer                                        │                            │
│ Diaries · Manifest   │ [Attach context] [Message PNA…] [Send]          │                            │
│                      │                                                │                            │
│ Profiles             │                                                │                            │
│ Appearance (compact) │                                                │                            │
└──────────────────────┴────────────────────────────────────────────────┴────────────────────────────┘
```

### Mobile

```text
┌───────────────────────────────────────────────┐
│ [☰] PNA · thread title            [Command]    │
├───────────────────────────────────────────────┤
│ [Conversation] [Context] [Artifacts]           │
├───────────────────────────────────────────────┤
│ One selected working surface                   │
│                                               │
│ Composer remains above player chrome           │
└───────────────────────────────────────────────┘
```

The hamburger opens the private rail; the rail becomes PNA’s quick-reference slider: current thread, source count, current profile, recent work, and Library shortcuts. It is not a miniature desktop sidebar squeezed into a phone.

## Visual hierarchy and typography contract

### What becomes primary

1. **Thread title and active profile** — establishes what is being worked on.
2. **Conversation / active Canvas** — makes or reviews the work.
3. **Composer** — creates the next action.
4. **Inspection rail** — makes scope, sources, Artifacts, and decisions inspectable.
5. **Appearance/avatar** — personalizes PNA but does not take over navigation.

### Type rules

| Use | Required treatment |
|---|---|
| Thread title / active Work | `--text-h4` or `--text-h3`, Cormorant editorial / Cinzel where appropriate |
| PNA reply body | `--text-base`, DM Sans or Cormorant at comfortable line height |
| Creator message body | `--text-base`, DM Sans |
| Metadata / context chip | `--text-sm` |
| Overlines / WID / dates | `--text-xs`, Cinzel or Space Mono |
| Essential control text | never smaller than `--text-xs`; no `0.38rem` or `0.4rem` functional labels |

The workspace root must not force Space Mono across all content. Space Mono is reserved for WID, timestamps, route state, and technical evidence. Body content uses the established body font; editorial headings use Cormorant; only a small number of overlines use Cinzel.

### Surface rules

- Use three calm surface depths: void (page), panel (workspace column), coal (raised message/card).
- Gold signals an **active state, primary decision, provenance marker, or focus**, not every box edge.
- Remove ornamental borders from passive groups; rely on spacing, surface depth, and one directional divider.
- Keep one `12–16px` space rhythm. Avoid dense stacks of rounded cards.
- Motion is limited to `140–200ms` focus, surface, and panel changes; reduced-motion removes transforms.

## Proposed implementation boundary

### In scope

| File | Change |
|---|---|
| `client/src/pages/PNAShellPage.tsx` | Reorder desktop layout around thread-first conversation; remove duplicated profile tabs; demote the passive image stage; replace microtype; turn the left rail into thread/library/profile navigation; add desktop rail toggles and mobile hamburger behavior. |
| `client/src/components/pna/PNAWorkspaceRail.tsx` | Preserve existing data/authority but simplify visual density, headings, tab rhythm, cards, and scope presentation. |
| `client/src/components/pna/PNAThreadRail.tsx` | New presentational private-rail component for recent thread history, thread search, Library shortcuts, profile list, and compact appearance handoff. It uses existing owner-scoped `pnaThread.list` data only. |
| `client/src/components/pna/PNAComposerBar.tsx` | New presentational composer with profile/scope/route summary and a readable message field. No new model authority. |
| `client/src/index.css` | Add isolated PNA workspace tokens/layout classes, desktop rail toggle styles, mobile drawer/quick-reference behavior, readable type, focus, and reduced-motion rules. |
| `server/tests/pnaWorkspaceFoundation.contract.test.ts` | Replace old source-contract assumptions with hierarchy, accessibility, no-duplicate-navigation, and mobile-surface assertions. |

### Explicitly out of scope

- No Drizzle schema or migration.
- No `pnaGovernance`, `keeper`, `pnaThread`, Quiver, Manifest, WID, Registry, provider, or model-route change.
- No automatic context attachment, registration, publication, or external/local workspace handoff.
- No claims that the result imitates or embeds Libre WebUI.
- `PNAWorkspacePanel` remains a launcher in this slice; consolidating its independent chat implementation is a separate behavior-migration decision.

## Interaction rules

1. **One profile selector.** The active Stewardship Profile appears in the thread/composer area. It is not duplicated in the left rail and top tabs.
2. **One primary work surface.** The default is conversation. Canvas appears only when a selected Work, source, or Artifact needs inspection/review.
3. **Context before intelligence.** A compact thread-scope line says `0 attached sources` or `Armor of Light · WID… · 1 attached source`; it never auto-attaches data.
4. **Rail is inspectable, not chat.** The right rail owns Context / Sources / Artifacts / Activity; it does not host a second narrow conversation.
5. **Source labels remain factual.** Existing Context Envelope, route disclosure, Artifact review, and action receipts remain visible and must never be visually minimized into decorative badges.
6. **Mobile keeps one surface active.** Mobile switches Conversation / Context / Artifacts without rendering offscreen duplicate controls; the composer stays reachable and respects bottom-stack player/navigation space.

## Architectural alignment

| Layer | Strengthened by the hierarchy redesign |
|---|---|
| Identity | The active creator’s private thread, Work context, and WID are legible rather than lost in chrome. |
| Manifestation | A Work’s cover art becomes a contextual Canvas when useful, rather than ornamental dead space. |
| Relationship | Creator ↔ PNA ↔ selected Work scope is explicit and reversible. |
| Registry | WID/provenance retains a read-only inspection role and is not confused with AI output. |
| Stewardship | PNA route, selected sources, Artifacts, and creator decisions remain visible and readable. |
| Legacy | Thread continuity and private Artifact review are easier to return to without overstating permanence. |

## Alternatives considered

| Alternative | Decision |
|---|---|
| Cosmetic restyle only | Rejected. Font-size and border tweaks alone leave the competing three-center layout intact. |
| Copy Libre WebUI directly | Rejected. Its generic terminology, blue accent, and tool model conflict with LNLS and creator-controlled provenance. |
| Keep the image stage as the central default | Rejected. It makes the space cinematic but not operational. |
| Hide all privacy/context information | Rejected. It weakens creator consent and source inspectability. |
| Embed an external AI workspace | Rejected for this slice. It introduces provider, authentication, and data-boundary concerns before the shell is clear. |

## Risks and mitigation

| Risk | Mitigation |
|---|---|
| Broad `PNAShellPage.tsx` regression | Extract presentational components while preserving existing mutations, query inputs, and callbacks. |
| Context/Artifact actions become hard to find | Keep desktop inspection rail visible by default and mobile surface switcher one tap away. |
| Mobile composer hidden behind player chrome | Use existing bottom-stack tokens and test at 375px, 390px, 414px, 768px, and desktop widths. |
| Typography becomes too ceremonial | Use Cinzel only for labels/headings; DM Sans remains the working body type. |
| Source/consent information becomes decorative | Retain exact current disclosure text and action outcomes in the inspection rail. |

## Validation and rollback

- `pnpm check`
- Focused PNA workspace and governance contract suites
- `pnpm build`
- `git diff --check`
- Browser smoke: desktop workspace, 390px mobile surface switcher, 768px tablet, `prefers-reduced-motion`, keyboard tab/arrow navigation, command palette, rail toggle.
- Existing full-suite migration-path failures will be reported candidly if they remain unchanged.
- Rollback is one managed checkpoint; no data migration means no data rollback is required.

## Approval record

The creator approved the **PNA Workspace Hierarchy & Readability** slice on 2026-10-04. The scope deliberately fixes structure and readability before introducing new AI capability, new provider behavior, or new persistence.

## Implementation and validation record

- **Thread-first private navigation:** `PNAThreadRail` now owns Recent threads, search, a Quick reference summary, Library routes, compact Appearance handoff, and Stewardship settings access. The avatar gallery no longer dominates the workspace.
- **Readable working center:** `PNAShellPage` now gives the active private thread the central column, uses standard Living Nexus body/headline tiers, replaces the repeated mode strip with one composer Profile selector, and retains the optional focused pop-out conversation control.
- **Inspectable but secondary evidence:** `PNAWorkspaceRail` remains the Context / Sources / Artifacts / Activity surface; its tabs were compressed into a calmer single-row hierarchy.
- **Responsive behavior:** The desktop private rail appears at `lg`; smaller tablet/mobile viewports use the hamburger-accessed private navigation drawer and one active Conversation / Context / Artifacts surface at a time.
- **Accessibility and motion:** controls preserve 44px minimum tap targets, labeled tabs, visible focus rings, dialog semantics for the mobile drawer, and reduced-motion scrolling behavior.

Validation completed after implementation:

| Check | Result |
|---|---|
| `pnpm check` | Passed |
| Focused PNA governance / workspace / unified-chat contracts | 12 passed |
| `pnpm build` | Passed; existing `file-type` eval and large-chunk warnings remain warnings only |
| `git diff --check` | Passed |
| Public browser smoke | Unauthenticated PNA guard rendered correctly; authenticated thread/request/Artifact behavior was not claimed or exercised because no creator session was available in the inspection browser. |
| Full `pnpm test` | 748 passed, 1 skipped, 4 known failures caused by missing historic migration files: `0135_add_creative_cathedral_workspace.sql`, `0138_registry_api_r1a_credentials.sql`, `0139_core_ingestion_commission_i1.sql`, and `0140_core_ingestion_review_i2.sql`. |
