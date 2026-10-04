# PNA Workspace Service Audit — 2026-10-04

**Status:** Stage 0 implemented and validated locally — no deployment or publication  
**Scope:** PNA route composition, workspace hierarchy, privacy/consent presentation, mobile behavior, and comparative AI-workspace patterns.  
**Decision standard:** Preserve creator sovereignty, explicit consent, private Artifact review, and the separation between PNA work records and canonical Registry/WID authority.

> **Verdict:** PNA has a strong safety foundation, but it is still being treated as both a focused creator service and an ordinary Living Nexus page. The resulting collision of shells, players, rails, modal behavior, and settings surfaces is the main reason the experience feels crowded and difficult to read. The next repair should be a **PNA service-shell consolidation**, not another cosmetic card pass.

---

## 1. What was examined

### Current-source evidence

| Area | Evidence | Finding |
|---|---|---|
| PNA local route | `client/src/App.tsx` | `/pna` is mounted inside `MainLayout`. |
| PNA subdomain route | `client/src/App.tsx` | `pna.livingnexus.org` mounts `PNAShellPage` directly, outside `MainLayout`. |
| Global chrome | `client/src/components/layout/MainLayout.tsx` | The ordinary page shell owns the LeftRail, TopBar/player, RightRail, mobile header, global player, Witnessing Circle, and What's New modal. |
| PNA workspace chrome | `client/src/pages/PNAShellPage.tsx` | PNA independently owns private navigation, a thread header, mobile header, command palette, Context/Artifact rail, local music dock, composer, and pop-out mode. |
| PNA governance | `server/routers/pnaGovernance.ts`, `server/utils/pnaGovernance.ts`, `server/routers/keeper.ts` | Creator ownership, selected-source consent, profile settings, Envelope revision, and Artifact review are enforced as separate authority boundaries. |
| Screenshots | Development preview captured at desktop and 390px mobile | The global **What's New** dialog can cover PNA and PNA Stewardship. Desktop PNA is visually squeezed between global rails plus its own rails; mobile PNA can also be masked by the global release dialog and player chrome. |
| Focused contracts | `server/tests/pnaGovernance.contract.test.ts`, `server/tests/pnaWorkspaceFoundation.contract.test.ts`, `server/tests/pnaUnifiedChat.test.ts` | Existing tests strongly protect consent and private PNA boundaries, but do not yet test service-shell parity or overlay interference. |

### Quantitative maintainability evidence

| File | Lines | Inline style objects | Button elements | Arbitrary type utilities |
|---|---:|---:|---:|---:|
| `client/src/pages/PNAShellPage.tsx` | 991 | 66 | 15 | 16 |
| `client/src/components/pna/PNAThreadRail.tsx` | 181 | 43 | 12 | 20 |
| `client/src/components/pna/PNAComposerBar.tsx` | 111 | 14 | 4 | 9 |
| `client/src/components/pna/PNAWorkspaceRail.tsx` | 159 | 65 | 5 | 34 |
| `client/src/pages/PNASettingsPage.tsx` | 67 | 25 | 1 | 15 |

These numbers are not a quality score. They do show that PNA’s visual language is fragmented across many inline decisions, which makes consistent hierarchy and responsive correction unnecessarily difficult.

---

## 2. What is already sound

The repair must preserve these strengths rather than replace them with a generic chat product:

1. **Private ownership is enforced.** PNA threads, Context Envelopes, sources, Artifacts, and governance records are owner-scoped.
2. **Context is not silently used.** Selected source use is gated by the active Stewardship Profile and verified again at model-send time.
3. **The local-only fallback is now honest.** Attached sources remain private when remote selected-context use is not permitted; a normal reply still works without forwarding them.
4. **Vision output is not treated as a Work.** It is a private proposal that requires review and a separate preservation choice.
5. **PNA does not register, publish, issue a WID, or mutate Registry identity from conversation.** This boundary is visibly stated in the composer and protected in governance contracts.
6. **The recent thread rail, command palette, consent disclosure, and Artifact review rail are the right ingredients.** They need one coherent service architecture rather than more surface additions.

---

## 3. Root causes of the current experience

### P0 — PNA has two conflicting application shells

| Current route | Shell | Consequence |
|---|---|---|
| `/pna` on the main domain | `MainLayout` + `PNAShellPage` | Global LeftRail, TopBar/player, RightRail, mobile header, release modal, global player, and PNA’s own rail/dock/rail all coexist. |
| `pna.livingnexus.org` | `PNAShellPage` directly | The global chrome is absent, so the same PNA feature has a materially different spatial hierarchy and error-boundary path. |

This is the primary problem. PNA is meant to be a creator operating environment, but the main-domain route currently embeds it as one more page inside the public discovery application.

**Symptoms already visible in the development screenshots:**

- Global navigation plus PNA private navigation creates competing left-side control systems.
- The global RightRail competes with PNA’s inspection rail, creating two different right-side information systems.
- The global TopBar/player and PNA’s thread-bound music dock create two playback focal points.
- The global release modal can cover PNA and the PNA Stewardship page, interrupting focused work.
- On mobile, global header/player layers consume scarce vertical space before the creator reaches the actual PNA working surface.

### P0 — Focused-workspace overlays are not service aware

`MainLayout` owns the automatic **What's New** modal. The desktop and mobile development screenshots show it masking both the PNA workspace and PNA Stewardship settings.

A release dialog is appropriate for ordinary site browsing. It is not appropriate as an automatic interruption inside a private creative workspace, especially when PNA has a command palette and a future Keeper’s ledger where release notes can be intentionally opened.

### P1 — PNA has the right objects, but not yet a durable workspace container

Current PNA centers on a **thread**. The service needs a creator-owned **Chamber** above the thread:

```text
Creator
└── PNA Chamber (private workspace)
    ├── Intent / instructions
    ├── Private threads
    ├── Context Envelope
    │   ├── selected sources
    │   ├── scope and route state
    │   └── use receipts
    ├── Candidate Artifacts
    │   ├── review / compare / accept / reject
    │   └── parent/version lineage
    └── Keeper’s ledger
        ├── consent changes
        ├── creator decisions
        └── external action receipts
```

A thread is a conversation. It is not enough to communicate the overall identity, purpose, source set, Artifact set, or boundaries of a prolonged creative undertaking.

### P1 — The attachment interaction is too narrow

The composer’s **Attach Context** action currently attaches the **now-playing Work**. That is safe but operationally restrictive. A creator often needs to select a specific Work, a previous private Artifact, a note, an extract, or a future source type without first manipulating playback.

The replacement must be a deliberate **source picker**, not ambient access:

- Search only within the creator’s permitted source universe.
- Add one source at a time to the active Envelope.
- Show type, title, WID where applicable, version, and reason/scope.
- Let the creator remove a source before use.
- Never treat a picker selection as remote-model permission by itself.

### P1 — General PNA responses lack a unified candidate-Artifact flow

Vision has an explicit private proposal → review → preserve route. General text, planning, research, arrangement, and registry guidance can be saved to Notes, but they do not yet share a clear **candidate Artifact** lifecycle.

The correct model is not automatic save. It is:

```text
Conversation response
  → Creator chooses “Create candidate Artifact”
  → Private review surface
  → Compare / revise / reject / preserve
  → Append-only private version record
  → Separate explicit route if the creator later wants to register a Work
```

### P1 — Stewardship settings break working continuity

`/settings/stewardship` uses the ordinary `MainLayout` rather than a PNA service frame. A creator leaves the private workbench to adjust a permission, returns through broader site chrome, and has no explicit in-context return path with the active thread/Chamber state.

Settings are not wrong. Their placement is wrong for this service.

### P2 — Hierarchy is improved but still duplicated

The completed hierarchy slice removed the former image-first center and introduced a thread-first rail. The remaining duplication is structural:

| Concept | Current locations |
|---|---|
| Navigation | Global LeftRail + PNA private rail |
| Information rail | Global RightRail + PNA inspection rail |
| Playback state | Global player/TopBar + PNA music dock |
| Release information | Global modal + potential future PNA activity/ledger |
| Active context/profile | PNA quick reference + thread header + composer route copy + inspection rail |

The solution is **not** to hide consent or source information. It is to assign each concern one primary home and use compact, linked status elsewhere.

### P2 — Error, loading, and parity concerns require explicit service testing

The main-domain PNA route benefits from the outer `MainLayout` `ErrorBoundary`; the PNA subdomain direct route does not visibly wrap `PNAShellPage` in the same boundary. The two PNA entry points should share:

- a service-level ErrorBoundary;
- predictable private-thread loading and empty states;
- the same keyboard and modal behavior;
- the same player ownership rules;
- a visible, recoverable query failure state.

---

## 4. Comparative research: principles to translate

Five mature AI-workspace patterns were researched through first-party documentation. The result is **not** an instruction to copy their products.

| Reference service | Verified principle | PNA translation | Do not copy |
|---|---|---|---|
| ChatGPT Projects and Canvas | Durable project container, explicit sources, search recovery, side-by-side editable Canvas | Creator-owned Chamber; explicit source objects; user-invoked candidate Artifact workbench | Brand styling, social chat mechanics, inherited context without a clear Envelope record |
| Claude Projects, Artifacts, and Docs | Private-by-default projects, side-by-side Artifacts, selection editing, tool approval, permission-aware sharing | Candidate Artifact review with **Compare / Accept / Reject / Revise / Restore**; sharing separate from source sharing | Its visual system; automatic artifact assumptions; lack of complete immutable version history |
| Cursor | Explicit `@` context, context visibility, Plan Mode, checkpoint/review loop, tool approvals | Named Envelope items, intention → plan → approval → execution, visible action receipts, restoration checkpoints | Auto-run defaults, coding-agent density, opaque broad tool reach |
| Notion AI | Calm hierarchy, selection-scoped changes, accept/discard/retry, narrow source selection, actionable inbox | Chamber tree, source picker, proposed changes, bounded Keeper’s ledger | Workspace-wide AI context by default, generic productivity UI, social-like activity drift |
| Open WebUI / Libre-style local workspace model | Reusable knowledge/model/tool bindings, retrieval-mode disclosure, layered tool gates, privacy as an operational boundary | Inspectable assistant recipes, retrieval modes, preflight external-action disclosure, effective-access inspection | Claims that self-hosting automatically makes data local/private; broad code tools; additive permissions without visible effective scope |

### Shared design laws

1. **The durable unit is a bounded workspace, not an endless chat.**
2. **The exact Context Envelope must be inspectable before consequential AI work.**
3. **Conversation and Artifact review are separate surfaces.**
4. **AI outputs are provisional until a creator accepts them.**
5. **Every external action needs a named, scoped approval and a receipt.**
6. **Hierarchy, search, and recoverability are better than a feed.**
7. **Progressive disclosure is essential: focus first, evidence one deliberate reveal away.**
8. **Artifact sharing, thread sharing, source sharing, and connector sharing are separate permissions.**

### Important patterns to reject

- A generic social feed, infinite activity stream, likes, ranking, or engagement mechanics.
- A hidden workspace-wide memory/context model.
- Automatic replacement of a creator’s artifact with generated output.
- Automatic sharing of source documents when an Artifact is shared.
- Claims of end-to-end encryption, local processing, privacy, or universal model behavior without deployed evidence.
- Arbitrary code tools, ambient connector access, or autonomous side effects.
- Treating citations, logs, tests, or a context count as proof rather than inspectable evidence.

---

## 5. Target PNA service layout

### Desktop

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ PNA SERVICE BAR                                                           │
│ Chamber name · privacy state · active thread · compact playback · Command │
├───────────────────┬────────────────────────────────────┬──────────────────┤
│ CHAMBER NAV       │ PRIVATE WORKBENCH                  │ INSPECTOR        │
│                   │                                    │                  │
│ + New thread      │ Thread title / active profile       │ Envelope         │
│ Threads           │ Scope: 2 sources · local / remote   │ Sources          │
│ Artifacts         │                                    │ Artifacts        │
│ Notes             │ Conversation OR Candidate Artifact  │ Keeper’s ledger  │
│ Search Chamber    │                                    │                  │
│                   │ Composer / attach source picker     │                  │
├───────────────────┴────────────────────────────────────┴──────────────────┤
│ Optional compact, thread-bound playback transport (one owner only)        │
└───────────────────────────────────────────────────────────────────────────┘
```

### Mobile

```text
┌──────────────────────────────────────────────┐
│ [Menu] Chamber · active thread      [Command] │
│ Scope: 2 sources · local-only / permitted     │
├──────────────────────────────────────────────┤
│ Conversation | Envelope | Artifacts | Ledger  │
├──────────────────────────────────────────────┤
│ One selected surface                          │
│                                                │
│ Composer always above PNA-owned player chrome │
└──────────────────────────────────────────────┘
```

### Information ownership contract

| Concern | One primary home | Secondary presentation |
|---|---|---|
| General platform navigation | Outside the PNA service | An explicit “Return to Living Nexus” service-bar action |
| PNA threads and Chamber library | PNA left Chamber navigation | Command palette search results |
| Profile, Context, and route state | Composer/workbench status line | Compact count only in Chamber nav |
| Sources, receipts, Artifact review | PNA Inspector | Deep link/summary from the workbench |
| Playback | One PNA-owned compact transport when in PNA | Work/context title link only |
| Release notes | Explicit Command/utility action | Never auto-modal over active PNA work |
| Creator decisions and action evidence | Keeper’s ledger | Small “last decision” summary only |

---

## 6. Proposed implementation sequence

### Stage 0 — Service-shell parity and interruption removal

**Goal:** One PNA application shape, regardless of entry domain.

| Work item | Files/surfaces likely affected | Data authority | Risk | Test proof |
|---|---|---|---|---|
| Mount main-domain `/pna` in a PNA service frame rather than ordinary `MainLayout` | `client/src/App.tsx`, new service-frame component, route tests | None | Medium route/layout regression | Main domain and PNA subdomain share shell contract |
| Place PNA Stewardship inside the PNA service frame or provide an in-context settings sheet/return path | `client/src/App.tsx`, `PNASettingsPage.tsx`, service frame | Existing settings only | Low–medium navigation regression | Active thread return path persists |
| Suppress automatic What's New modal inside focused PNA routes | `MainLayout` or service-frame/modal policy, tests | None | Low | PNA opens without unsolicited release overlay; explicit release access remains |
| Establish one player owner in PNA | service frame, `PNAShellPage.tsx`, player route contract | Existing player state only | Medium playback regression | No duplicate global/PNA playback chrome on `/pna`; playback still works elsewhere |
| Add PNA service-level ErrorBoundary and loading/error states | service frame, PNA tests | None | Low | Both entry paths show recoverable failure state |

**Explicitly not included:** model-provider changes, schema migration, Registry/WID changes, broad Context access, external connectors, or Artifact sharing.

#### Stage 0 implementation record — 2026-10-04

**Implemented:**

- Main-domain `/pna` and `pna.livingnexus.org` now route through the same `PNAServiceRouter` and `PNAServiceFrame`, outside the public `MainLayout`.
- `/settings/stewardship` also uses the PNA service frame instead of the ordinary public settings shell.
- The automatic public **What's New** dialog, floating Keeper widget, upload engine, and PWA banner are suppressed on focused PNA service routes. Legal Terms and sign-in gates were not suppressed.
- PNA now has one service-level error boundary for both entry paths.
- The PNA workspace remains its own playback owner; it is no longer paired with `MainLayout`'s global player/TopBar/RightRail on the main-domain PNA route.
- PNA Stewardship receives an explicit **Return to workspace** action. PNA settings handoffs preserve a selected `thread` route as a validated internal `returnTo` path.

**Validation evidence:**

| Check | Result |
|---|---|
| TypeScript | `pnpm check` passed with zero errors. |
| Focused PNA contracts | 4 files / 17 tests passed: governance, focused service shell, unified chat, and workspace foundation. |
| Production build | `pnpm build` passed. Existing `file-type` eval and large-chunk warnings remain warnings, not failures. |
| Diff integrity | `git diff --check` passed. |
| Browser smoke | Development screenshots verified the main-domain desktop and 390px mobile PNA workspace have no global LeftRail, RightRail, TopBar/global player, or What's New overlay; Stewardship renders in the service frame. An unauthenticated browser smoke verified `returnTo=/pna?thread=…` is retained by the Return to workspace link. Browser console had no output during that smoke. |
| Full suite | 753 tests passed, 1 skipped, 4 failed. All four failures are pre-existing missing migration-file contract paths: `0139_core_ingestion_commission_i1.sql`, `0140_core_ingestion_review_i2.sql`, `drizzle/migrations/0135_add_creative_cathedral_workspace.sql`, and `0138_registry_api_r1a_credentials.sql`. None reference Stage 0 PNA files. |

**Not browser-exercised:** An authenticated creator request/send path was not executed in this audit browser because it did not have a creator session. No message delivery, model response, profile mutation, or playback interaction is claimed from this smoke.

### Stage 1 — Chamber and source-picker foundation

**Goal:** Turn threads into coherent private creative workspaces.

- Add a named, creator-owned **Chamber** object above threads.
- Move existing Context Envelope semantics under the Chamber without weakening thread ownership.
- Add a source picker for creator-owned eligible Works and existing private PNA objects.
- Show inclusion/exclusion preview and immutable Envelope-change receipts.
- Keep remote selected-context permission separate from attachment.
- Add Chamber-scoped search across threads, sources, and Artifacts.

**Data design will require a separate approved ADR and additive migration.** It must define retention, export, deletion, parent relationships, source version snapshots, and exact policy boundaries before implementation.

### Stage 2 — Unified candidate Artifact workbench

**Goal:** Give all significant PNA outputs the same safe review lifecycle.

- Create candidate Artifacts only through an explicit creator action.
- Add separate review mode: **Compare, Accept, Reject, Revise, Restore**.
- Store immutable prior candidate versions and parent/branch references.
- Display creator contribution, AI proposal state, source references, Envelope receipt, and acceptance timestamp.
- Preserve current Vision proposal flow as the first compatible artifact kind.
- Keep Artifact history separate from canonical Work/WID/Registry authority.

### Stage 3 — Deliberate planning, assistant recipes, and external actions

**Goal:** Add capability without ambient autonomy.

- Focused task flow: **Intent → inspect scope → plan → creator approval → execution → review**.
- Versioned assistant recipes that expose model, instructions, source bindings, tools, memory state, and output policy.
- Explicit retrieval choice: bounded excerpts versus full source where technically supported.
- External tool/connector preflight: system, operation, data leaving Envelope, destination, retention, duration, reversible path.
- Keeper’s ledger for consent, review, sharing, and external-action receipts.

This stage requires separate security, privacy, connector, and deployment-authority decisions.

---

## 7. Immediate audit conclusion

### What should happen next

1. **Approve Stage 0 first.** It removes the current structural conflict without inventing more AI capability or touching creator records.
2. **Do not redesign more cards before shell consolidation.** The existing PNA rail/composer/inspector components can be refined after they no longer compete with the global shell.
3. **Treat Stage 1 and Stage 2 as one product decision:** Chamber + Context Envelope + candidate Artifact lifecycle form the operating core of PNA.
4. **Keep PNA’s visual character:** cathedral warmth, clear thresholds, editorial reading measure, gold only for real focus/decision/provenance state, and a quiet working center.

### Approval boundary

This audit does **not** activate a migration, provider change, tool integration, external connector, Registry/WID behavior, publication behavior, sharing behavior, or deployment.

The recommended next approval is:

> **Implement Stage 0: PNA Service-Shell Parity & Focused Workspace Repair.**
>
> Scope: one shell for `/pna` and `pna.livingnexus.org`; suppress automatic release modal interruption; remove duplicate PNA/global chrome and choose one playback owner; add service-level error/loading parity; preserve current PNA governance, threads, Context Envelope, Artifacts, Registry/WID boundaries, and all existing creator data.

---

## 8. Research sources

- [OpenAI — Projects in ChatGPT](https://help.openai.com/en/articles/10169521-projects-in-chatgpt)
- [OpenAI — Introducing Canvas](https://openai.com/index/introducing-canvas/)
- [Anthropic — Collaborate with Claude on Projects](https://www.anthropic.com/news/projects)
- [Anthropic Help — Projects](https://support.anthropic.com/en/articles/9517075-what-are-projects)
- [Anthropic Help — Artifacts](https://support.anthropic.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- [Cursor — Prompting agents](https://cursor.com/docs/agent/prompting)
- [Cursor — Plan Mode](https://cursor.com/docs/agent/plan-mode)
- [Cursor — Agent tools and browser approvals](https://cursor.com/docs/agent/tools/browser)
- [Notion Help — Navigate with the sidebar](https://www.notion.so/help/navigate-with-the-sidebar)
- [Notion Help — Notion AI for documents](https://www.notion.so/help/guides/notion-ai-for-docs)
- [Open WebUI — Knowledge Bases and Document Chat](https://docs.openwebui.com/features/workspace/knowledge)
- [Open WebUI — Models](https://docs.openwebui.com/features/workspace/models/)
- [Open WebUI — Tools](https://docs.openwebui.com/features/extensibility/plugin/tools/)
- [Open WebUI — Chat data privacy and encryption](https://docs.openwebui.com/security/chat-data-privacy-and-encryption/)
