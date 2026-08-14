# ADR-023 — Nexus Context Panel: Context Canvas Before Agent Extraction

**Status:** Proposed — no implementation authorized  
**Date:** 2026-08-14  
**Owner:** Keeper  
**Scope:** Architecture decision only. This document authorizes no component extraction, query, route, Agent behavior, database migration, asset creation, or user-data mutation.

## Decision in one sentence

Living Nexus should **promote the existing context patterns into a reusable, read-oriented `NexusContextPanel`**, but it must do so through a small versioned context contract and host adapters—not by repurposing the current navigation drawer or allowing the Agent to infer, mutate, or disclose context without authority.

> The Agent may **request that a context be shown**. It may not make a record authoritative, change playback, alter a WID, expose private material, or turn a mention into a claim merely by surfacing a panel.

## The actual starting point

The proposal is directionally strong: conversation should become a means of orientation while a visible context surface preserves what the conversation concerns. However, the current project does **not** contain one hidden Explore data drawer ready to be transplanted wholesale.

| Existing surface | What it actually owns today | What is reusable | What must not be copied as-is |
|---|---|---|---|
| `components/layout/ContextDrawer.tsx` | Mode-driven **Loop navigation** for Home, Explore, Register, Manage, and Archive. It is desktop-only, left-rail-offset, route-closing, auth-aware navigation. | Dismissal rules, Escape behavior, portal/backdrop discipline, one-mode/one-panel grammar, auth-aware link filtering. | Its `NavMode` model, navigation content, left-side placement, and route-change auto-close. It is not an artifact/context renderer. |
| `pages/ExplorePage.tsx` | Music-only discovery feeds: new manifestations, trending, recently witnessed, hidden gems, songs, and creators. | Feed categories and normalized audio work rows as **source adapters**. | No statement that Explore itself is the reusable panel host; it is a discovery consumer. |
| `components/LivingContextRail.tsx` | Work-page ecosystem rail: signals, related works, witnesses, creator activity, support, and sessions. Desktop rail / mobile accordion. | Collapsible section grammar, work-context cards, witness/provenance presentation, safe contextual navigation. | Current queries and terminology without review. Its “Creator Activity” currently calls general discovery rather than a creator-scoped procedure; it cannot be trusted as a generic creator adapter until corrected. |
| `pages/PNAShellPage.tsx` | The sole active `/pna` chat/workspace. It owns modes, diary restoration, avatar selection, now-playing stage, chat dimensions, and its own left workspace drawer. | The workspace host, mode concepts, current-player binding, collapse/persistence affordances, diary restore constraint. | A second chat owner, a second message state, hard-coded avatar gallery, or an independent context persistence model. |
| `contexts/PlayerContext.tsx` | Global current track and immutable queue/session semantics. Track metadata already carries WID, creator, content type, testimony, collection, and download fields. | Read-only `nowPlaying` adapter and explicit user-initiated playback actions. | Any context transition that rewrites queue order, starts playback, or assumes a queue remains live-query-backed. |

## Why this can strengthen Living Nexus

The correct move is **not** “chat with a side drawer.” It is a stable visual grammar in which a person can see the work, creator, registry evidence, and current network activity that the workspace is discussing. That provides discoverability without requiring users to learn a hidden affordance, and it lets Work, Person, Explore, Search, Verify, and PNA share a common orientation surface.

The panel should help preserve context rather than manufacture meaning. A WID remains a registry reference. A witness count remains an observed aggregate. A creator name remains an identity reference. An Agent’s summary remains an Agent message, not a registry fact.

| Layer | Required effect | Prohibited effect |
|---|---|---|
| Identity | Show the resolved work, creator, playlist, collection, or Guide using canonical identifiers. | Conflate a display name, a mention, and an authenticated identity. |
| Manifestation | Render cover art, player state, work metadata, WID reference, and permitted actions. | Treat a preview, inferred match, or AI summary as the original manifestation. |
| Relationship | Show public witness, creator, related-work, and support relationships with source labels. | Reveal private diary, draft, purchaser, or unconsented relationship data. |
| Registry | Link to verification and display immutable reference data. | Create, rewrite, seal, or supersede a WID from panel state. |
| Stewardship | Offer explicit human actions such as Open, Verify, Support, or Manage when authorized. | Give the Agent silent publish, purchase, witness, support, or account authority. |
| Legacy | Permit a user to retain a navigable trail of selected context. | Persist sensitive conversational context by default or confuse it with the Chain of Record. |

## Canonical contract: a context reference, not an agent-owned object

The first implementation must use a **small discriminated union of canonical references**. The panel receives a reference and resolves only the fields its host and viewer may see. The Agent never passes arbitrary rendered HTML, raw hidden data, or a free-form object that the panel accepts as fact.

```ts
type NexusContextRef =
  | { version: 1; kind: "explore"; feed: "new" | "witnessed" | "trending" | "gems" }
  | { version: 1; kind: "work"; songId: number; wid?: string }
  | { version: 1; kind: "creator"; creatorId: number }
  | { version: 1; kind: "playlist"; playlistId: number }
  | { version: 1; kind: "collection"; collectionWid: string }
  | { version: 1; kind: "provenance"; wid: string }
  | { version: 1; kind: "search"; query: string; scope: "music" | "creators" }
  | { version: 1; kind: "now-playing" };

type NexusContextResolution = {
  ref: NexusContextRef;
  visibility: "public" | "viewer-owned" | "creator-owned";
  status: "ready" | "loading" | "empty" | "not-found" | "unauthorized" | "error";
  provenance: Array<{ label: string; route: string; wid?: string }>;
  source: "registry" | "catalog" | "player" | "search" | "agent-suggestion";
  actions: Array<"open" | "verify" | "play" | "support" | "manage">;
};
```

The resolution must retain its **source**. The panel can state “Agent-suggested context” when a conversational message requests it, while a Work or WID resolution should state its canonical source. This prevents the visual panel from laundering an inference into evidence.

## Explicit ownership boundaries

### The Agent is a selector, not a sovereign data authority

The eventual Agent can emit a structured suggestion such as `show_context({kind:"work", songId: 1710006})`. The host validates it, resolves it through normal procedures, and makes it visible. The Agent cannot emit a fully populated card, set `visibility`, execute an action, or cause an unverified entity match to become active context.

Automatic surfacing is allowed only as a **suggestion**. A deterministic identifier, such as a syntactically valid WID or a direct work link, may show a small “Open context” affordance after server/client resolution. A fuzzy name match must show confidence and require human selection. It must never silently replace an existing Work context, leak creator/private data, or reframe testimony.

### The panel is read-first and action-explicit

The initial panel supports navigation and deliberate user actions only. `Open`, `Verify`, and an already-authorized `Play` may be available. `Support` must follow the existing payment boundary, and `Manage` must be hidden unless the server confirms ownership. There is no v1 action for publish, seal, witness, buy, gift, activate an avatar, alter a Guide, or mutate the Agent Ledger.

### Diary and personal context remain separate

PNA diary restoration currently rebuilds message state through `consumePnaDiaryReload()`. That process should remain the only diary restore path. The Context Panel may render a diary as a **named, owner-authorized reference** in a later phase, but it must not derive hidden context from chat history, write panel state into a diary, or make diary contents discoverable to other users.

## Required front-end architecture

The first front-end slice is five bounded pieces, not one mega-component.

| Piece | Responsibility | Must not own |
|---|---|---|
| `NexusContextPanel` | Pure responsive renderer for resolution status, header, cards, provenance labels, and approved actions. | Queries, Agent state, localStorage, playback mutation, global layout policy. |
| `NexusContextProvider` | Holds the current validated reference, compact/full/hidden preference, and dismiss history for the current session. | Registry data mutation, diary contents, user identity, persistent cross-user memory. |
| Host adapters | PNA, Work, Person, Explore, Verify, and Search translate their known local object into a canonical `NexusContextRef`. | Cross-host assumptions or duplicate query shapes. |
| Resolver hooks | One query family per context kind, using canonical tRPC procedures and viewer-aware authorization. | Free-form Agent payloads, raw database joins in components. |
| Action bridge | Maps a user click to existing navigation/player/support mechanisms. | Silent agent actions or new checkout/registry logic. |

The **primary host should be `/pna`**, where the panel is visibly a right-side context canvas on desktop and a controlled sheet/bottom panel on mobile. Work, Creator, Explore, and Verify should initially remain consumers of small host adapters or their existing rails; they should not be refactored in the same release.

### Responsive and motion constraints

The existing Loop `ContextDrawer` is desktop-only and left-side; the PNA workspace already has a left drawer, center stage/chat area, and mobile constraints. A Context Panel must therefore be a separate layout primitive.

| Viewport | Required behavior | Failure to avoid |
|---|---|---|
| Desktop PNA | Visible right Context Canvas, collapsible to an explicit rail. Chat remains the only chat owner. | Compressing chat below usable width or adding an unexplained second drawer. |
| Tablet | Panel opens compact beside/under stage based on measured available width. | Hard-coded breakpoints that hide the composer or player. |
| Mobile | Explicit Context button opens a focus-managed sheet with a clear return to conversation. | Hidden “secret arrow,” body scroll lock persistence, overlap with the mobile player. |
| Reduced motion | No parallax, spring, continuous pulse, or animated context replacement beyond minimal opacity where necessary. | Treating an Agent-driven context switch as a decorative spectacle. |

The panel must use existing z-index authority from the host layout. It may never declare a new magic high z-index to defeat the player. The player remains a lower-screen authority; a temporary context sheet must coordinate with it rather than cover or trap it.

## Required back-end and data architecture

No new database table is required for the first read-only panel. The first release should resolve existing canonical records by identifier. A table becomes justified only when there is a user-authored, auditable **saved workspace context** separate from a diary, not simply because the UI needs state.

| Backend need | First-release approach | Later only if proven necessary |
|---|---|---|
| Work/creator/WID context | Viewer-aware existing procedures; add narrowly scoped resolver procedures only where fields are missing. | A broad “context mega-query” that bypasses existing ownership controls. |
| Explore context | Adapt `songs.exploreIndex` audio-only buckets into canonical feed resolutions. | Duplicate discovery feeds inside PNA. |
| Now playing | Adapt `PlayerContext` read-only metadata. | A new server-persisted player context. |
| Witnesses and signals | Reuse public/authorized provenance procedures with capped payloads and pagination. | Dumping full event threads into every panel render. |
| Creator activity | Add or reuse a creator-scoped procedure; do not use a global discovery query and relabel it creator activity. | Misattributed works. |
| Saved context | Session-only local state in v1. | Durable personal context before consent, retention, deletion, and diary semantics are decided. |

Every resolver must enforce the least-privilege view. A public work context is public; Drafts, creator-only analytics, private notes, private purchaser information, hidden WIDs, and non-public playlists remain unavailable. The response must cap arrays, use pagination for event streams, and return a structured `unauthorized` or `not-found` state rather than hiding a security failure in an empty panel.

## What can break Living Nexus if this is done carelessly

| Failure mode | How it breaks the platform | Mandatory guard |
|---|---|---|
| Context becomes a second chat | Competing message ownership, duplicate state, unclear diary behavior, and PNA regression. | PNA remains sole chat owner; panel renders references and actions only. |
| Agent mention becomes fact | An LLM or fuzzy match can launder a mistaken entity into apparent provenance. | Canonical ID resolution, source labels, confidence/dismiss affordance, no silent replacement. |
| Generic data feed becomes “creator activity” | Misattribution corrupts creator trust and visible testimony. | Creator-scoped server query and contract test. |
| Context leaks protected material | A public host can expose Drafts, personal diaries, owner-only notes, or payment data. | Resolver authorization at the server, minimal fields, host/viewer scope test matrix. |
| Panel changes playback implicitly | The user loses control of queue/session semantics. | Only direct user action may call PlayerContext playback APIs. |
| Context panel creates visual debt | New overlay competes with GlobalPlayer, mobile nav, or PNA controls. | Host-owned layer policy, sheet tests, no magic z-index, no body lock outside controlled mobile sheet. |
| Query fan-out grows without limit | Work and PNA views cause repeated events, witnesses, creator works, and search loads. | Capped payloads, enabled queries, stale times, request deduplication, panel loads sections progressively. |
| New persistence becomes an ungoverned memory | Personal work history is silently retained and confused with evidence or diaries. | Session-only v1; later persistence needs a separate consent/retention ADR. |
| Context actions become commerce/registry shortcuts | Support, claims, WID, or shop entitlements bypass existing integrity controls. | Action bridge delegates only to existing protected flows; no v1 mutation commands. |

## Test and observability gates

The feature is not ready when it merely looks good. The following gates are mandatory before any panel host is released.

| Gate | Evidence required |
|---|---|
| Contract | Unit tests exhaust every `NexusContextRef` kind, malformed refs, missing IDs, version mismatch, `not-found`, `unauthorized`, and source labeling. |
| Authority | Router tests prove a public viewer cannot resolve Draft/private/owner-only data; owner and creator views receive only approved fields. |
| Provenance | WID context links to the same canonical verification record and never creates/seals/rewrites an event. |
| Player | Now-playing panel is read-only; queue, current index, and playback do not change until a user clicks a specific player action. |
| PNA | One chat owner, diary reopen unchanged, mode selection unchanged, no floating Keeper chat on `/pna`. |
| Mobile | Sheet opens/closes with Escape/backdrop/focus restoration, does not trap `body` scroll state, and remains above content without defeating the player. |
| Performance | Profile panel-open query count and payload caps; no request loop, no query on hidden panel except approved prefetch, no unbounded witness/event arrays. |
| Accessibility | Keyboard operable rail/sheet, labelled controls, `aria-expanded`, focus treatment, color-independent provenance source labels, and reduced-motion screenshot/behavior checks. |
| Regression | Existing Explore surface contract, player composition, PNA unified-chat, diary restoration, and mobile layout suites all remain green. |

Instrumentation should log **panel lifecycle and resolver status only**: opened kind, closed, source, resolution status, and query duration. It must not log diary content, prompts, testimony text, purchase information, or protected identifiers.

## Deliberate implementation sequence

| Phase | Deliverable | Explicitly excluded |
|---|---|---|
| 0 — Correctness | Repair or isolate the existing Living Context Rail’s creator-activity source and record an approved z-index/mobile-sheet authority map. | New panel UI or Agent behavior. |
| 1 — Contract | Type definitions, resolver response schema, viewer authorization, and tests for `work`, `creator`, `provenance`, `explore`, and `now-playing`. | Context persistence, AI entity extraction, database migration. |
| 2 — PNA host | Read-only right Context Canvas in `/pna`, collapsible on desktop and explicit sheet on mobile. | A second chat, mutation actions, auto-open from prose. |
| 3 — Host adapters | Add deliberate adapters for Work, Creator, Explore, Verify, and Search one surface at a time. | Whole-site drawer replacement. |
| 4 — Agent suggestions | Structured, dismissible `show_context` suggestions after authority and false-match tests pass. | Autonomous entity selection, publishing, support, or registry actions. |
| 5 — Saved workspace context | A separate ADR for consent, retention, export, deletion, diary relationship, and Agent Ledger boundary. | Silent durable memory. |

Rollback remains simple through Phases 1–4: remove the host adapter and panel mount; canonical routes, registry records, chat, player state, and diaries remain intact. No database migration is permitted until Phase 5 receives separate approval.

## Decisions required from the Keeper

Before implementation, the Keeper must decide the following:

1. **Primary host:** Is `/pna` approved as the first and only live host, with other surfaces deferred to adapters?
2. **V1 contexts:** Approve `work`, `creator`, `provenance`, `explore`, and `now-playing`; defer `playlist`, `collection`, and free-text `search` until their route/query contracts are reviewed?
3. **Automatic behavior:** Must Agent-detected entities always be a visible suggestion requiring a click, or may a deterministic WID auto-populate a non-destructive compact preview?
4. **Storage:** Approve session-only panel state with no saved history, diary integration, or cross-session memory in v1?
5. **PNA layout:** Approve a desktop right canvas and mobile explicit sheet, while retaining the existing left PNA drawer for modes/avatars?
6. **Context actions:** Approve only Open, Verify, and direct user-initiated Play in v1; defer Support and Manage until the payment/ownership integrity release is resolved?

## Source register

| Source | Used for |
|---|---|
| `client/src/components/layout/ContextDrawer.tsx` | Existing navigation-drawer grammar, accessibility, desktop-only placement, dismissal and route-close behavior. |
| `client/src/pages/ExplorePage.tsx` | Music-only discovery feed buckets and player-row adaptation. |
| `client/src/components/LivingContextRail.tsx` | Work context categories, accordion grammar, current query limitations, witness/support/session cards, and desktop/mobile rail intent. |
| `client/src/pages/PNAShellPage.tsx` | Sole PNA chat owner, modes, diary restoration, player binding, left workspace drawer, viewport and persistence constraints. |
| `client/src/contexts/PlayerContext.tsx` | Current track metadata and immutable queue/session boundary. |
| `client/src/components/layout/MainLayout.tsx` | Existing Loop chrome and host-layer boundary. |
| `docs/ADR-022-GUIDE-AVATAR-SHOP-CONVERSION.md` | Separate Avatar conversion work and its no-authority-escalation requirement. |
