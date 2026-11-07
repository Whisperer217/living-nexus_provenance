# Living Nexus — Information Architecture and Cognitive Separation Assessment

**Status:** Read-only assessment and implementation proposal  
**Date:** 2026-11-07  
**Scope:** Profile, Creator Domain, Work Desk/Manage, Archive, Collections, Studio, Settings, and global navigation  
**Implementation status:** No application code, routes, schema, registry records, or production state changed

## Executive finding

Living Nexus has strong underlying authorities, but the user-facing organization currently presents too many valid homes for the same creator responsibilities:

- `/creator/:id` and `/:handle` both represent creator identity and public work discovery.
- `/profile` represents identity settings, while `/creator/:id` represents public identity.
- `/manage` is the current Work Desk/management surface, but `/studio`, `/manifest`, `/archive`, `/creator/collections`, and legacy collection routes still appear as parallel management destinations.
- Collections are exposed through Archive, Collections Workspace, Collection Studio, Work Desk, and public collection routes.
- Settings are split across `/profile`, `/settings/*`, payout surfaces, and contextual navigation.

This produces **cognitive separation**: users must remember which page owns identity, works, collections, provenance, publishing, and account actions instead of being guided by one clear object model.

The correction should not be a rewrite. The current architecture already contains the right authorities. The task is to make the information architecture visible:

> **One creator identity. One Creator Domain. One Work Desk. Collections remain relationships between Works. Account settings remain separate from creative stewardship.**

## Authority and evidence map

| Source | Verified fact | Authority | Limitation |
|---|---|---|---|
| `LeftRail.tsx` | The LeftRail is the single global navigation authority with Home, Explore, Register, Manage, and Archive | Current navigation implementation | Labels do not fully explain the difference between personal archive and creator stewardship |
| `ContextDrawer.tsx` | Each rail mode opens a single mode-specific panel; Manage contains Works Ledger, Public Profile, Identity Settings, Archive/export, payouts, and billing | Current contextual navigation implementation | Manage mixes creative stewardship, identity, archive, and account concerns |
| `CreatorDomainShell.tsx` | Creator Domain is intended as the creator’s persistent home, with Home, Works, Drafts, Collections, Provenance, Analytics, Witnesses, Publishing, and Settings | Current domain architecture | The same responsibilities are also reachable through separate legacy surfaces |
| `App.tsx` | `/manage` maps to LoopManagePage; `/profile` maps to ProfilePage; `/creator/:id` maps to CreatorProfilePage; `/:handle` maps to CreatorDomainShell; `/studio` and collection routes remain active | Current route table | Route continuity is valuable, but visible entry-point duplication is confusing |
| Refinement report | Platform score is 71/100 C; CreatorProfilePage and DashboardPage are high-risk monoliths; Explore has remaining typography debt | Current stewardship tooling | Score findings indicate structural risk, not a reason to rewrite routes immediately |
| User testimony | Users feel separated between profile, collections, and related creator surfaces | Product-intent evidence | Requires task-based validation with real users before final information-architecture changes |

## Current mental-model collisions

### 1. “Profile” means two different things

Users can interpret Profile as:

- **Identity/account:** name, handle, avatar, biography, payout/account preferences.
- **Public creator presence:** what witnesses see, public works, collections, testimony, and domain context.

These are related but not identical. Treating them as separate destinations without a visible relationship makes users wonder whether editing Profile changes their public Creator Domain.

### 2. “Manage,” “Studio,” and “Archive” overlap

The platform has a useful distinction in the data model, but not in the navigation language:

- **Work Desk / Manage:** active stewardship and editing of registered Works.
- **Manifestation Studio:** registration/intake of a new Work.
- **Archive:** a personal record, historical access, export, and recovery surface.
- **Collection Studio / Collections Workspace:** organization of existing Works.

The user should not need to know these implementation names before choosing a path.

### 3. Collections appear to be a separate product

Collections are not new media records. They are relationships between existing Works, with distinct semantics for Draft Releases, sealed editions, legacy albums, and Named Playlists. Exposing several collection editors risks making creators think they are moving or duplicating Works.

The canonical explanation should be:

> **Works are the records. Collections are arrangements of those records.**

### 4. Account and creator stewardship are mixed

Payouts, billing, playback preferences, identity settings, and creator publishing are different concerns. They can remain under one account area, but they should not compete inside the same first-level creator workspace.

## Proposed information architecture

### The five visible contexts

Keep the current global rail, but clarify its meaning through context labels and destination hierarchy rather than adding more top-level destinations.

| Context | User question | Canonical visible destination | Existing authority |
|---|---|---|---|
| **Discover** | “What exists here?” | Home / Explore | Explore, public creator projections, public Works |
| **Creator Domain** | “How do people see me?” | `/:handle` or `/creator/:id` | CreatorDomainShell / public creator page |
| **Work Desk** | “What am I tending?” | `/manage` | WorkDesk / existing authorized Work procedures |
| **Collections** | “How are my Works arranged?” | Work Desk → Collections | Existing Collections Workspace and Collection Studio procedures |
| **Account** | “How do I control my account?” | `/profile` and `/settings/*` | Profile, playback, payouts, billing, payment methods |

The critical decision is that **Collections should be a Work Desk mode, not a competing global destination**. Existing routes remain for compatibility, but visible links should converge on Work Desk → Collections.

### Creator Domain as public identity; Work Desk as private stewardship

Use a persistent paired relationship:

```text
CREATOR DOMAIN                         WORK DESK
How witnesses see you                  How you tend the record
Public identity                        Owner-authorized workspace
Works / testimony / collections        Edit / organize / publish / provenance
Public URL                              Private entry point
```

Every owner-facing Creator Domain should expose one primary action:

> **Open Work Desk**

Every Work Desk should expose one identity escape route:

> **View public Creator Domain**

This creates continuity without merging the public and private surfaces.

## Dual-path experience

The user preference for a quick path and a deep path is a strong fit for Living Nexus.

### Quick path: “What are you here to do?”

At the top of Work Desk and Creator Domain owner views, offer a compact task chooser with five actions:

1. **Register a new Work** → existing `/manifest` flow.
2. **Edit a registered Work** → Work Desk Works mode.
3. **Make a Collection** → Work Desk Collections mode.
4. **Publish or verify my record** → Work Desk Provenance/Publishing mode.
5. **View my public Domain** → canonical public creator route.

This is the accessible path for a new creator or a user who does not know platform vocabulary yet.

### Deep path: “Creator workspace”

The full Work Desk remains available for experienced creators with explicit modes:

- **Works** — registered Works, statuses, editing, playback preview, WIDs.
- **Collections** — albums, Draft Releases, Sealed Editions, Named Playlists.
- **Provenance** — Chain of Record, HAAI, origin testimony, declarations.
- **Publishing** — readiness, public visibility, registry-facing actions.
- **Audience** — witnesses, signals, analytics.

The deep path should use the platform’s established terminology but keep each mode single-purpose.

## Proposed navigation vocabulary

Avoid replacing all existing labels at once. Use explanatory subtitles and consistent verbs first.

| Current label | Recommended visible treatment | Reason |
|---|---|---|
| Register | **Register a Work** | Names the object and action |
| Manage | **Work Desk** with subtitle “Tend your registered Works” | Reduces generic dashboard ambiguity |
| Archive | **Archive** with subtitle “Your personal record and exports” | Separates history/listening from editing |
| Profile | **Identity & Account** | Distinguishes account identity from public Domain |
| Collections | **Collections** under Work Desk | Reinforces relationship semantics |
| Studio | **Registration Studio** or contextual “Continue registration” | Makes Studio a task, not a second home |
| Public Profile | **View Creator Domain** | Connects public identity to the domain concept |

A compatibility label may be displayed during transition, for example: **Work Desk (Manage)**. Route names do not need to change in the first implementation.

## Surface contracts

### Creator Domain

**Primary question:** How do witnesses encounter this creator?  
**Must show:** creator identity, testimony/biography, public Works, public Collections, WIDs, witnessing/support actions.  
**Owner action:** Open Work Desk.  
**Must not become:** a second private admin dashboard.

### Work Desk

**Primary question:** What registered record is the creator tending?  
**Must show:** Works, Collections, Provenance, Publishing, and audience stewardship as explicit modes.  
**Owner action:** edit, arrange, review, publish, or return to public Domain.  
**Must not become:** a generic analytics dashboard with unrelated account controls.

### Collections

**Primary question:** How are existing Works arranged?  
**Must show:** clear type distinctions:

- Draft Release — private, editable, not sealed.
- Sealed Edition — historical or sealed membership, immutable membership.
- Legacy WID-ALB — preserved historical record.
- Named Playlist — editable listening path; duplicate occurrences allowed.

**Must not imply:** media duplication, new WIDs, or re-registration.

### Archive

**Primary question:** What is my personal record?  
**Must show:** owned/saved Works, historical records, exports, recovery, and listening history.  
**Must not become:** the primary editor for Works or Collections.

### Account

**Primary question:** How do I control my account and preferences?  
**Must show:** identity settings, playback, payouts, billing, payment methods, privacy/security.  
**Must not contain:** the main Work or Collection editing workflows.

## Breadcrumb and context pattern

Every owner-facing surface should expose a small context line, especially on mobile:

```text
Creator Domain / Doc Seraph Mercer
Creator Domain / Collections
Work Desk / Works / Push Forward
Account / Payouts
Archive / Exports
```

This solves the immediate feeling of “Where am I?” without adding another navigation system. Breadcrumbs should be links to existing routes and should not create new authorities.

## Implementation sequence

### Phase A — information architecture contract, no behavior change

- Add an ADR and route-to-context map.
- Add shared context labels and owner escape links.
- Rename visible subtitles before renaming routes.
- Add the Quick Path task chooser to Work Desk and owner Creator Domain only.
- Make Collections entry points converge visibly on Work Desk → Collections.

### Phase B — Work Desk consolidation

- Keep `/manage` as the canonical owner workspace.
- Make Works, Collections, Provenance, Publishing, and Audience explicit Work Desk modes.
- Reuse existing Work Desk, Collections Workspace, and Collection Studio components and procedures.
- Keep legacy `/studio`, `/archive`, `/creator/collections`, and collection routes functional as compatibility routes.
- Add “Open in Work Desk” rather than removing legacy entry points.

### Phase C — identity and account separation

- Keep `/profile` for identity/account settings.
- Keep `/:handle` and `/creator/:id` for public creator identity and public works.
- Add an explicit “Public Creator Domain” preview/link from Identity & Account.
- Move payouts, billing, playback, and payment methods under a clearly named Account grouping.

### Phase D — validation and only then retirement

- Instrument route entry and task completion, without recording private content.
- Conduct acceptance sessions with new creators and experienced creators.
- Retire redundant visible links only after task completion improves and no canonical workflow loses an escape route.
- Do not delete or redirect legacy routes until usage and recovery evidence support it.

## Protected boundaries

This proposal does **not** authorize:

- database migrations;
- schema or registry changes;
- WID changes or historical record rewrites;
- new media storage or duplicate Work records;
- a second navigation drawer;
- a second playback authority;
- removal of legacy routes;
- changing public creator identity semantics;
- production deployment or publication.

## Success measures

The organization is successful if a first-time creator can answer these questions without opening multiple unrelated surfaces:

1. Where is my public identity? → Creator Domain.
2. Where do I edit a registered Work? → Work Desk → Works.
3. Where do I arrange Works? → Work Desk → Collections.
4. Where do I see the permanent provenance record? → Work Desk → Provenance or the Work’s Chain of Record.
5. Where do I change my account or payout settings? → Account.
6. Where do I recover or export my personal history? → Archive.

Target acceptance criteria for the first implementation slice:

- A new creator reaches “Register a Work,” “Edit a Work,” and “Make a Collection” in two interactions or fewer from the Work Desk.
- Every owner-facing Creator Domain has a visible path to Work Desk.
- Every Work Desk surface has a visible path to the public Creator Domain.
- Collection entry points explain that collections arrange existing Works.
- No public route, WID, playback queue, creator association, or registry authority changes.
- Mobile users encounter one primary context at a time, with no stacked competing management panels.

## Recommendation

Approve **Phase A only** as the next bounded slice: the information-architecture contract, context labels, Quick Path proposal, and route-convergence specification. Do not implement route retirement or broad profile/Creator Domain restructuring until the Phase A wording and ownership model are reviewed.
