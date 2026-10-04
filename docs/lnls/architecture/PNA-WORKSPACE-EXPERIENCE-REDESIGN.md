# PNA Workspace Experience Redesign

**Status:** Partially implemented — workspace foundation delivered 2026-10-03. No Libre WebUI deployment, schema change, external connector, model-provider change, WID issuance, Registry mutation, or publication is activated by this record.

**Date:** 2026-10-03  
**Scope:** Evolve the existing PNA from a visually rich chat surface into a calm, durable creator workspace while preserving Living Nexus identity, WID authority, creator consent, and provenance boundaries.

## Implementation record — Workspace Foundation

The first delivered foundation intentionally covers the three approved interaction seams rather than claiming the complete redesign:

- **Command palette:** `cmdk` now opens existing private thread history, stewardship profiles, the composer, Context, Artifacts, Quiver, notes, and archive destinations. It reuses the owner-scoped `pnaThread.list` query; it creates no new data authority.
- **Inspectable right rail:** Context makes the active session source and existing read-only `NexusContextPanel` visible; Artifacts presents persisted private visual proposals through the existing explicit **Save to Quiver privately** decision. Neither surface registers, seals, or publishes a Work.
- **Mobile surface model:** below `xl`, creators select one deliberate **Conversation / Context / Artifacts** surface at a time with 44px controls, rather than receiving a squeezed desktop rail.

Still deferred: a full left-rail thread browser, Context Envelope persistence, Sources/Activity tabs, a shared artifact manifest, profile contracts, and any Libre WebUI/local-workspace handoff. Those require separate scoped decisions and must not be implied by the foundation.

The exact proposed records, authorization gates, profile contracts, Artifact lifecycle, review flow, and migration sequence for the next PNA boundary are defined in [PNA Context Envelope, Stewardship Profile, and Artifact Manifest Specification](./PNA-CONTEXT-ENVELOPE-ARTIFACT-MANIFEST-SPEC.md). The specification remains proposed until its data/consent decisions are accepted; this link does not activate any of its behavior.

---

## Hierarchy decision

The detailed hierarchy, typography, desktop/mobile layout, implementation boundary, risks, and validation record for the PNA shell are recorded in [PNA Workspace Hierarchy ADR](./PNA-WORKSPACE-HIERARCHY-ADR.md). The approved hierarchy slice is now implemented; it changes PNA presentation and component composition only, not creator authority, providers, Registry behavior, or WID records.

## North Star

> PNA is not a chatbot with platform buttons. It is the private working room where a creator gathers intent, Work context, evidence, drafts, and decisions before they choose what belongs in the Living Nexus record.

The interface should answer four questions at a glance:

1. **What am I working on?** — an explicit Work or private draft context.
2. **Where am I in the process?** — explore, shape, review, save, register.
3. **What evidence is being used?** — visible sources, WIDs, files, and model-route disclosure.
4. **What happens if I act?** — clear, reversible, creator-confirmed action cards.

---

## What Libre WebUI Gets Right — Principles to Translate, Not Copy

Libre WebUI is compelling because it has an operating-system-like information architecture:

| Libre principle | Living Nexus translation |
|---|---|
| One sidebar anchors the user’s work history and primary destinations. | A PNA rail anchors private threads, current Work, Quiver, notes, and local workspace connection—not repeated navigation. |
| Chat and Work are peer modes. | **Conversation**, **Canvas**, and **Artifacts** are peer PNA surfaces, not feature drawers piled onto chat. |
| A centered, readable conversation does the main work. | PNA conversation remains the center of gravity; ornament does not compete with thought. |
| Context, sources, files, and activity are visible when needed. | A contextual rail exposes Work/WID, evidence, private files, and proposal activity on demand. |
| A command palette makes capability discoverable without visual clutter. | PNA offers a keyboard-first command palette for opening Work context, starting a thread, saving to Quiver, opening Manifest, and finding private materials. |
| Artifacts receive a dedicated preview surface. | PNA proposals receive a dedicated **Artifact Review** surface before any creator decision. |
| Assistant profiles bind prompt, knowledge, skills, and tools. | PNA stewardship profiles bind a purpose, allowed context, permitted actions, quality checks, and disclosure—not merely a persona label. |

**Do not copy:** Libre’s generic typography, blue runtime accent, developer-oriented labels, or its permission to run broad tools. PNA needs the same clarity and calm, translated into Cathedral typography, restrained gold, and creator-first language.

---

## Current PNA Diagnosis

The present PNA already contains valuable foundations:

- private, owner-scoped PNA thread persistence;
- PNA modes, avatar skin selection, Quiver, private visual proposals, diaries, music-bound context, and a contextual Work rail;
- an existing command-palette primitive, accessible resizable-panel primitive, Radix UI controls, Framer Motion, and streamed response rendering in the application stack.

The interface feels less mature than Libre because of how these parts are currently assembled.

| Finding | Current evidence | Why it weakens the workspace | Repair direction |
|---|---|---|---|
| One page owns too many responsibilities | `PNAShellPage.tsx` mixes sidebar, chat, stage, player, context, pop-out, resize logic, mode control, and thread lifecycle. | Interaction states are hard to evolve consistently. | Split into stable workspace primitives. |
| Two PNA surfaces diverge | Full PNA and the `PNAWorkspacePanel` drawer each render their own chat experience. | Private-thread behavior, accessibility, and design drift can separate. | Make the drawer a lightweight launcher/context handoff; one canonical PNA workspace owns conversation. |
| Mode navigation is duplicated | Modes appear in the sidebar and top tabs. | The creator has to parse the same choice twice, and the main canvas loses space. | Put the active stewardship profile in the composer/header; reserve the rail for history and library. |
| Typography is too small for a working environment | Many PNA controls are around `0.38–0.72rem`. | It reads like developer chrome instead of a serious creator tool, and it strains mobile/low-vision use. | Use the Living Nexus `--text-xs`, `--text-sm`, and `--text-base` tiers. |
| The central stage is decorative before it is useful | The large stage mostly shows cover art/avatar when no Work context is active. | It consumes primary workspace area without helping a creator make a decision. | Turn it into a contextual Canvas that explains the active Work, draft, source, or artifact. |
| Thread persistence is under-surfaced | `pnaThread.list` exists, but the full workspace rail does not foreground an accessible thread library. | A creator cannot naturally return to ongoing work. | Make thread history a first-class rail section with search and recency. |
| Context rail is too conditional | The current context panel is visible only at very wide viewport sizes. | WID and source context disappear when space becomes constrained. | Make the rail user-toggleable; on mobile, make it a clearly labeled surface switcher. |
| Generated output has no unified lifecycle | Visual proposals are special-cased; text and future artifacts do not share a clear review state. | “Save,” “register,” and “publish” can blur together. | Introduce a common artifact/proposal contract and review card. |

This is not a request to remove PNA’s atmosphere. It is a request to make the atmosphere serve work.

---

## Target Information Architecture

### Desktop — one coherent workspace

```text
┌───────────────────┬───────────────────────────────────────┬───────────────────────────────┐
│ PRIVATE RAIL      │ CONVERSATION / CANVAS                  │ CONTEXT / ARTIFACTS            │
│                   │                                       │                               │
│ + New thread      │ [Thread title] [Active Work/WID chip] │ Tabs: Context · Sources ·      │
│ Search threads    │ [Profile selector] [Model route]       │       Artifacts · Activity      │
│                   │                                       │                               │
│ RECENT WORK       │ Conversation                           │ Active Work                     │
│ • Thread title    │ • creator message                      │ • Cover / title / WID            │
│ • Thread title    │ • PNA response                         │ • purpose / declaration          │
│                   │ • source cards                         │ • linked private materials       │
│                   │                                       │                               │
│ LIBRARY           │ ───────────────────────────────────   │ Artifact preview                 │
│ • Quiver          │ Composer                               │ • draft / review / saved         │
│ • Notes           │ [+ context] [profile] [route] [send]  │ • inspect / save / import        │
│ • Diaries         │                                       │                               │
│                   │                                       │                               │
│ [Creator] [PNA]   │                                       │                               │
└───────────────────┴───────────────────────────────────────┴───────────────────────────────┘
```

### Mobile — deliberate surface switching

```text
┌─────────────────────────────────────────┐
│ PNA · Thread title          ⌘  •••       │
├─────────────────────────────────────────┤
│ [Conversation] [Context] [Artifacts]     │
├─────────────────────────────────────────┤
│ Active selected surface                  │
│                                         │
│ Composer stays fixed above player chrome │
├─────────────────────────────────────────┤
│ [Threads] [New] [Attach context]         │
└─────────────────────────────────────────┘
```

On phones, do not show a squeezed three-column desktop layout. Show one strong surface at a time, preserve the composer, and make Context/Artifacts reachable in one tap.

---

## The PNA Workspace Model

### 1. Conversation

The private working thread. It should be centered, readable, and calm.

- assistant replies are visually quiet, creator messages are raised surfaces;
- every response can expose **Sources**, **Artifacts**, and **Actions** without forcing all detail into the prose;
- an active Work context appears as a compact chip above the thread, not repeatedly inside messages;
- the composer is the visual focal point and includes only high-frequency controls.

### 2. Canvas

A flexible surface for the thing currently being worked on:

- active Work context;
- lyrics or manuscript draft;
- visual proposal;
- provenance/timeline snapshot;
- research outline;
- music-aware context while a Work is playing.

This replaces the passive stage with a useful, inspectable work surface. Cover art and avatar remain part of the experience, but they do not occupy the primary area when a creator needs to think or review.

### 3. Context rail

A stable, inspectable record of what the PNA can see.

| Tab | Purpose |
|---|---|
| **Context** | Current Work, WID, creator-approved prompt context, and session scope. |
| **Sources** | Cited Registry records, archive files, approved documents, and statement of freshness. |
| **Artifacts** | Generated draft material with lifecycle state. |
| **Activity** | Creator decisions, saved drafts, context changes, and tool approvals. |

Every contextual item needs a source label, an owner/scope marker, and an escape path to the authoritative Living Nexus surface.

### 4. Private rail

The rail is not an avatar gallery first. It is the creator’s private navigation anchor.

Recommended sections:

1. **New thread** and Search
2. **Recent threads** (title, mode/profile, updated time, active context indicator)
3. **Pinned** (active creative projects, diaries, current Work)
4. **Library** (Quiver, Notes, Diaries)
5. **Stewardship Profiles** (Guide, Compose, Witness, Registry, Archive, Vision, Research)
6. **Avatar/appearance** in settings or a lower-priority personalization area

The active avatar remains meaningful, but it should be a companion identity—not the bulk of left navigation.

---

## The First Interface Upgrade: PNA Workspace Shell

This is the highest-leverage implementation. It does not require Libre WebUI, local models, Docker, a schema migration, or a new AI provider.

### Proposed component split

```text
client/src/components/pna/
├── PNAWorkspaceShell.tsx        # canonical desktop/mobile layout and panel state
├── PNARail.tsx                  # thread history, library, compact/expanded state
├── PNAThreadList.tsx            # recent/pinned/searchable private thread list
├── PNAConversation.tsx          # message list, response regions, live announcements
├── PNAComposer.tsx              # profile/context/attachment controls + send
├── PNAContextRail.tsx           # Context · Sources · Artifacts · Activity
├── PNAArtifactReview.tsx        # safe output preview and lifecycle action cards
├── PNAProfilePicker.tsx         # stewardship profile selection
├── PNACommandPalette.tsx        # keyboard-first actions and search
├── PNAWorkspaceMobileNav.tsx    # mobile conversation/context/artifact switcher
└── pna.types.ts                 # context, artifact, action and profile contracts
```

`PNAShellPage.tsx` becomes a route-level composition layer. The global `PNAWorkspacePanel` becomes a launcher and a context handoff into the canonical workspace rather than maintaining another independent in-memory chat.

### Existing tools to reuse first

| Need | Existing Living Nexus capability | Action |
|---|---|---|
| Keyboard command palette | `cmdk` and `client/src/components/ui/command.tsx` | Build `PNACommandPalette` without a new package. |
| Split panes and mobile fallback | `react-resizable-panels` and `components/ui/resizable.tsx` | Replace manual mouse resize code with keyboard-operable panels. |
| Accessible menus, dialogs, tabs, tooltips | Radix UI | Use for profile chooser, source inspector, artifact review, and mobile surface controls. |
| Restrained state motion | Framer Motion plus existing reduced-motion conventions | Use only for panel transitions, reorder, and focus continuity. |
| Streaming/structured response rendering | `streamdown` | Render rich PNA output consistently rather than raw paragraphs. |
| Current authority and persistence | `pnaThreads`, `keeper`, `quiver`, `NexusContextPanel` | Preserve them; do not re-create database authority in the UI. |

### Optional open-source additions — only when a measured need exists

| Need | Candidate | Why it belongs | Gate before adding |
|---|---|---|---|
| Long thread performance | `@tanstack/react-virtual` | Virtualizes large message and thread lists. | Add only after profiling real long threads. |
| Provenance/canvas graphs | `@xyflow/react` | Interactive relationship maps, version/derivative diagrams, and Work context graphs. | Must keep the Registry as source of truth; no editable provenance without explicit creator actions. |
| Rich private notes | Lexical or ProseMirror | Structured private working notes with accessible editing. | First decide whether Keeper Notes needs more than Markdown/plain text. |
| Code/research artifacts | Shiki | Consistent, accessible code rendering. | Use only if PNA exposes source/code artifacts in the primary UI. |
| Local search index | FlexSearch | Private client-side search for a bounded, already-authorized local collection. | Never index all private server records in the browser by default. |

No new library should be added simply because Libre uses it. The existing stack already supports the foundational workspace rebuild.

---

## PNA Skills and Protocols

A good workspace becomes solid when its capabilities are legible, constrained, and reusable. These are **protocols first**, not a random prompt library.

### A. Stewardship Profile Contract

Profiles replace loose “mode” labels with a bounded operating contract.

```ts
interface PNAStewardshipProfile {
  id: "guide" | "compose" | "witness" | "registry" | "archive" | "vision" | "research";
  purpose: string;
  permittedContextKinds: ContextKind[];
  permittedTools: ToolId[];
  outputContracts: ArtifactKind[];
  reviewRequirements: ReviewRule[];
  modelRoutePolicy: "local-preferred" | "creator-selects" | "specific-provider";
  provenanceBoundary: string;
}
```

Examples:

| Profile | May do | Must never do automatically |
|---|---|---|
| **Guide** | Help a creator express intent and direction. | Claim authorship or write testimony as established fact. |
| **Compose** | Produce draft arrangements, lyric structures, and creative plans. | Register a resulting draft as a Work. |
| **Witness** | Reflect on emotional themes and draft testimony prompts. | Alter creator-declared testimony. |
| **Registry** | Explain current WID/provenance state and prepare registration tasks. | Issue a WID or alter Registry history. |
| **Archive** | Search creator-approved archive materials with citations. | Expose another creator’s private records. |
| **Vision** | Produce a private visual proposal. | Make an image canonical or public without creator action. |
| **Research** | Gather and cite sources. | Present inference as source-verified fact. |

### B. Context Envelope v1

No silent context injection. Every PNA thread shows what is attached.

```ts
interface PNAContextEnvelope {
  id: string;
  ownerId: number;
  entries: Array<{
    kind: "work" | "wid" | "note" | "diary" | "quiver_asset" | "document" | "public_source";
    referenceId: string;
    title: string;
    wid?: string;
    sourceUrl?: string;
    scope: "private" | "creator-approved" | "public";
    attachedAt: string;
  }>;
  modelRoute: "local" | "remote";
  expiresAt?: string;
}
```

The UI should show the context as removable chips and expose an exact **What PNA can see** list. A remote model route must visibly disclose that the selected context will leave local infrastructure.

### C. Artifact Manifest v1

Every generated result that can matter later needs one reviewable lifecycle.

```text
Draft → Reviewed → Saved privately → Prepared for registration → Registered through Manifest → Published (separate decision)
```

Artifact records should capture:

- type: text, image, audio plan, code, diagram, research brief, structured metadata;
- parent private thread and linked context envelope;
- declared model/provider route;
- source citations and creator inputs;
- optional checksum for exported files;
- creator decision and time;
- link to Quiver or another private storage location when saved.

An artifact is **not** a Work until the creator invokes the ordinary registration workflow and makes the required declaration.

### D. Action Card Protocol

Models do not get arbitrary platform controls. They propose bounded, inspectable actions:

| Action card | Effect | Confirmation |
|---|---|---|
| Save as private note | Writes a Keeper note. | Single creator confirmation. |
| Save visual to Quiver | Stores a private asset. | Single creator confirmation. |
| Attach Work context | Adds a bounded Context Envelope. | Single creator confirmation. |
| Prepare registration | Opens/creates a registration draft. | Explicit review, never seals a WID. |
| Export artifact | Produces a local/downloadable file. | Creator chooses destination. |
| Request external tool | Calls an authorized external/local connector. | Tool approval plus Living Nexus confirmation for side effects. |

Every action card must show **what changes**, **where it is stored**, and **what does not change**.

### E. Source / Inference / Proposal Labels

PNA replies should classify consequential content:

- **Source** — directly retrieved from a named Work, WID, file, or external citation;
- **Inference** — model interpretation, clearly separate from evidence;
- **Proposal** — a draft requiring creator decision;
- **Action** — a bounded possible side effect, never silently executed.

This makes the PNA interface feel trustworthy and teaches creators where their decisions matter.

### F. Creator Workspace Lifecycle

```text
Begin private thread
    ↓
Attach chosen context
    ↓
Explore / make drafts
    ↓
Review sources and artifacts
    ↓
Save privately (optional)
    ↓
Prepare registration (optional)
    ↓
Creator verifies declaration
    ↓
Manifest / WID / Registry process
    ↓
Publish (separate, explicit decision)
```

This is how PNA becomes the first leg of a creator operating system without becoming an ungoverned generator.

---

## UX Rules for PNA

1. **One primary action per surface.** The composer is for creating; the context rail is for inspecting; the artifact panel is for reviewing.
2. **No duplicate navigation.** A choice exists once, in the place where it is made.
3. **Dense but readable.** Use Cathedral type hierarchy, not microtype. Body content should be comfortable at `--text-base`; labels at `--text-sm` or `--text-xs`.
4. **Status is textual and colored.** “Local model,” “Remote provider,” “Saved privately,” and “Requires review” must never rely on color alone.
5. **Show scope before intelligence.** Display the current Work/WID/context before presenting a model answer as Work-aware.
6. **A creator can always leave.** Every private PNA state has a direct route to the Work, Creator Domain, Quiver, notes, or Manifest as appropriate.
7. **Mobile does not inherit desktop density.** Minimum 44px controls; one surface at a time; no permanent tiny sidebar.
8. **Motion clarifies state.** Use 140–200ms panel/focus transitions; no perpetual decorative animation; honor reduced motion.
9. **Do not use a chat bubble as a database.** Messages explain; the Context rail and Artifact panel hold structured material.
10. **No false permanence.** Save, seal, register, and publish are different words and different states.

---

## Delivery Sequence

### Slice 1 — Workspace shell and readability

**Goal:** Make PNA feel solid before introducing new AI capabilities.

- extract the canonical PNA workspace shell and eliminate duplicated chat ownership;
- build thread history rail from existing private thread data;
- replace manual pane resizing with the existing accessible resizable primitive;
- add command palette actions;
- collapse duplicated mode navigation into a profile picker;
- apply readable typography tiers and 44px mobile targets;
- turn the stage into a useful Canvas/Context surface.

**No schema migration. No provider change. No local-service deployment.**

### Slice 2 — Context, citations, and artifacts

**Goal:** Make PNA outputs inspectable.

- define `PNAContextEnvelope` and visibility controls;
- add Context / Sources / Artifacts / Activity rail tabs;
- normalize visual proposals and future outputs behind artifact review cards;
- label Source / Inference / Proposal / Action;
- preserve Quiver and diary integration as explicit creator actions.

**Potential schema work only after the contracts are approved.**

### Slice 3 — Profiles and skills

**Goal:** Make capability intentional and reusable.

- turn mode definitions into stewardship profile contracts;
- bind each profile to a purpose, allowed context, tool policy, output contract, and review rules;
- create a private skill library for creator-authored working protocols;
- show the active profile and its limits in the composer/header.

### Slice 4 — Local Workspace handoff

**Goal:** Add Libre WebUI as an optional local workspace without compromising Living Nexus.

- add “Local Workspace” connection state and new-tab handoff;
- no iframe, shared session, automatic context export, or direct database access;
- later introduce the read-only creator-scoped connector from the companion integration ADR.

---

## Success Measures

| Measure | Evidence |
|---|---|
| Return to work | Creator can find and reopen a private PNA thread in two interactions. |
| Context clarity | Every PNA reply with Work-aware claims exposes the associated context/source. |
| Creator agency | No PNA-generated output can register, publish, or alter authoritative provenance without a creator confirmation flow. |
| Readability | Essential controls meet the established text-tier and mobile-target standard. |
| Keyboard continuity | Command palette, panel resizing, profile selection, and Context/Artifact switching are keyboard operable. |
| Mobile integrity | Conversation, Context, and Artifacts are all usable without a squeezed desktop layout. |
| Interface restraint | Each control is discoverable, but the composer and current work remain visually primary. |

---

## Recommended First Decision

Approve **Slice 1: PNA Workspace Shell and Readability** first.

It improves the experience immediately, uses existing open-source primitives already in the project, carries little data risk, and creates the correct foundation for later Skills, Artifacts, Knowledge, and local Libre WebUI integration.

---

## Sources and References

- [Libre WebUI design specification](https://raw.githubusercontent.com/libre-webui/libre-webui/main/DESIGN.md)
- [Libre WebUI artifacts documentation](https://docs.librewebui.org/artifacts-feature)
- [Libre WebUI document knowledge and citations](https://docs.librewebui.org/rag-feature)
- [Libre WebUI assistant profiles](https://docs.librewebui.org/assistant-profiles)
- [PNA × Libre WebUI integration ADR](./PNA-LIBRE-WEBUI-INTEGRATION-ADR.md)
- Current Living Nexus PNA sources: `client/src/pages/PNAShellPage.tsx`, `client/src/components/PNAWorkspacePanel.tsx`, `server/routers/pnaThreads.ts`
