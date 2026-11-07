# Living Nexus — Revised Work Ledger

**Ledger revision:** 2026-11-02
**Canonical branch:** `app/main`
**Current checkpoint:** `640cacec`
**Operating mode:** Consolidation, legibility, and release stabilization
**Feature posture:** No new feature families until the core public and creator surfaces are coherent

> One surface. One purpose. One dominant action. One readable story.

## Ledger rules

- Preserve WIDs, creator attribution, testimony, registry history, media permissions, and append-only evidence.
- Reuse existing components and authorities before creating new systems.
- Every patch must be small, reversible, testable, and tied to a visible user outcome.
- No production data writes, migrations, deployment, or publication without explicit approval.
- Do not merge independent Jellyfin work into the Living Nexus application without explicit authorization.
- Keep disabled, unfinished, or experimental systems out of the primary public shell.
- A patch is not complete until typecheck, focused tests, build, responsive review, and `git diff --check` pass.

## Status vocabulary

- **NOW** — next bounded patch
- **NEXT** — queued after the current patch passes review
- **HOLD** — intentionally paused; do not start without a new decision
- **DONE** — validated and checkpointed
- **BLOCKED** — requires an external decision, credential, or publication control

## Release track 0 — Preserve and stabilize

### P0.1 Emergency presentation containment — DONE

- [x] Contain the Signals rail so it cannot cover Work artwork, titles, WIDs, or metadata on narrow desktop/tablet widths.
- [x] Make the wide-desktop Signals rail opaque, bounded, and clear of the persistent player stack.
- [x] Add shared Public, Creator Domain, and Registry visual-mode tokens.
- [x] Add shared icon, touch-target, focus-ring, contrast, and reduced-motion tokens.
- [x] Validate `pnpm check`, full tests, production build, and whitespace.
- [x] Save checkpoint `97681295`.
- [ ] Publish through the authenticated Manus publication console.

### P0.2 Release truth and source boundary — NOW

- [ ] Confirm the live deployment commit and compare it with checkpoint `97681295`.
- [ ] Record whether publication is complete, pending, or unavailable in the release record.
- [ ] Preserve the Living Nexus/Jellyfin branch relationship explicitly after the authorized merge.
- [ ] Keep the production NO-GO state visible until publication and authenticated acceptance are verified.

## Release track 1 — Make the core Work readable

### P1.0 Work typography/readability slice — DONE

- [x] Add shared semantic hero, lead, section-title, metadata, and WID typography roles.
- [x] Apply the roles to the canonical `/song/:id` Work hero, Testimony, Chain of Record, and metadata.
- [x] Improve long-title wrapping, editorial line-height, and long-WID wrapping at narrow widths.
- [x] Add subtle hover, press, focus, and reduced-motion-safe feedback to real Work actions and provenance controls.
- [x] Add focused Work hero regression coverage; no registry, playback, route, or data behavior changed.
- [x] Validate focused tests, TypeScript, production build, whitespace, and a 375px canonical Work screenshot.

### P1.1 Canonical Work header — NOW

**Outcome:** Every public Work surface has the same readable identity block.

- [ ] Define one reusable Work header grammar for Work page, creator catalog, Archive, Collections, and player preview.
- [ ] Make the first viewport answer: what is it, who made it, what is its WID, and what can I do?
- [ ] Establish action order: Listen, Witness, Signal, Manifest, Share.
- [ ] Keep WID and verification visible but subordinate to title and creator identity.
- [ ] Remove duplicate title, creator, and WID presentations from the first viewport.
- [ ] Add focused contract coverage for title, creator, WID, action order, and missing-art states.

### P1.4 Recent activity return path — DONE

- [x] Add a read-only latest-edited panel to Work Desk using existing Work, Draft Release, and Named Playlist timestamps.
- [x] Cap the merged activity view to eight records and link each record back to its canonical editor or collection surface.
- [x] Preserve WIDs, registry history, permissions, playback, and collection authority; no activity table or migration added.
- [x] Validate focused contract coverage, TypeScript, whitespace, responsive layout, and production build.

### P1.5 Work Desk album management — DONE

- [x] Add Existing Albums and Draft Releases modes to Work Desk using existing projections and routes.
- [x] Add owner-authorized album search, identity/WID/status presentation, presentation metadata editing, and ordered track inspection.
- [x] Add desktop drag handles plus accessible Move Up/Move Down controls for touch and keyboard use.
- [x] Save metadata and order through `collectionStudio.updateMeta` and `collectionStudio.reorderTracks` with cache invalidation and error/retry feedback.
- [x] Keep sealed legacy membership immutable; route Draft Release membership changes to the existing revision-aware editor.
- [x] Add unsaved-change protection and focused contract coverage; no schema, WID, media, registry, playback, or new backend authority added.
- [x] Display track durations, add checkbox multi-select with bulk move-to-top/bottom, and add lightweight Preview/Pause through the existing PlayerContext.
- [x] Prove the preview does not create a second audio element or playback authority.
- [x] Validate full tests, TypeScript, production build, whitespace, and desktop/mobile smoke captures.

### P1.6 Playlist Rack integration — DONE

- [x] Add a Playlist Rack beside Album Case using existing Named Playlist projections.
- [x] Add selected registered Works through the protected `playlists.addTrack` procedure.
- [x] Display playlist occurrences while preserving intentional duplicates as distinct membership records.
- [x] Support desktop drag ordering and mobile/touch Move Up/Down controls through `playlists.reorder`.
- [x] Support occurrence removal through `playlists.removeTrack` with existing membership authorization.
- [x] Add unsaved-order warning, explicit Save Order, retry/error feedback, and cache invalidation.
- [x] Add contract coverage proving no new playlist authority, schema, or duplicate Work system was introduced.
- [x] Validate full tests, TypeScript, production build, and whitespace.
- [x] Add subtle row hover lift, dragged-row emphasis, drop-target highlight, and reduced-motion-safe transitions without changing reorder mutations.
- [x] Extend Work Desk contract coverage for all Playlist Rack motion states.
- [x] Add an accessible per-playlist contextual menu with Edit, Share playlist, and Remove playlist actions.
- [x] Reuse owner-authorized `playlists.delete` and `playlists.generateShareSlug`; share copies the existing public `/p/:slug` link.
- [x] Require confirmation before removal and explicitly preserve Works and WIDs.
- [x] Extend Playlist Rack contract coverage for menu labels, share links, owner mutations, and preservation copy.

### P1.2 Activity and Signals architecture — IN PROGRESS

**Outcome:** Community activity becomes a contained secondary voice rather than an overlay chorus.

- [ ] Define activity categories: Signal, Comment, Registry event, Playback activity, System notice.
- [x] Keep the mounted RightRail as the single passive activity authority; do not mount a second LiveActivityPanel.
- [x] Prevent activity text from rendering over primary Work identity or busy artwork by isolating the rail and capping it above the bottom stack.
- [x] Add bounded wrapping, isolated scrolling, focus-visible feedback, and reduced-motion-safe surface transitions.
- [x] Add focused regression coverage for rail ownership, aria state, narrow desktop containment, focus, and persistent-player coexistence.
- [ ] Define the full activity category taxonomy and priority/dismissal/mobile disclosure rules.

### P1.3 Provenance status grammar — NEXT

**Outcome:** Registry state is understandable without technical overload.

- [ ] Standardize Draft, Published, Verified, Withdrawn, Sealed, Derived, Historical, and Private states.
- [ ] Give each state one icon, one color treatment, one accessible label, and one explanation.
- [ ] Replace page-specific status language with the shared grammar.
- [ ] Preserve the WID as immutable and visually authoritative.

## Release track 2 — Typography and visual lineage

### P2.1 Typography enforcement — NEXT

**Outcome:** The cathedral type system behaves like a system instead of local decoration.

- [ ] Establish semantic roles: Monument, Editorial, Operational, Provenance, Atmospheric.
- [ ] Enforce a small fluid type scale through shared CSS variables.
- [ ] Reduce unnecessary uppercase and ceremonial overlines.
- [ ] Normalize button, navigation, metadata, and status typography.
- [ ] Improve muted-text contrast and long-form reading width.
- [ ] Audit inline font-family and arbitrary font-size usage and migrate high-impact surfaces first.
- [ ] Add typography regression checks for Work, Creator Domain, Registry, and mobile surfaces.

### P2.2 Surface-mode contract — NEXT

**Outcome:** Public, Creator Domain, Registry, Authoring, Player, and System surfaces feel intentionally different but related.

- [ ] Document density, overlay, typography, navigation, and allowed-action rules for each mode.
- [ ] Prevent Creator Domain controls from visually leaking into public discovery.
- [ ] Prevent Registry pages from looking like social feeds.
- [ ] Prevent cinematic Player surfaces from carrying dense administrative metadata.
- [ ] Apply mode classes/tokens consistently instead of page-local improvisation.

### P2.3 Card and spacing consolidation — NEXT

- [ ] Use the shared museum-card grammar for Work/media cards.
- [ ] Normalize card padding, title line count, metadata order, and action placement.
- [ ] Replace ad hoc borders and glows with shared cathedral utilities.
- [ ] Increase visual silence between major sections.

## Release track 3 — Imagery and art direction

### P2.3 Homepage companion spaces — DONE

- [x] Add branded companion cards to the active `HomePage` for Manifest Theatre and Provenance Player.
- [x] Use lazy sandboxed previews and explicit new-tab links without creating a second registry or playback authority.
- [x] State clearly that the companions do not provide Living Nexus account sync, WID verification, shared playback, or shared registry authority.
- [x] Validate focused contracts (14/14), full suite (943 passed, 1 skipped), TypeScript, production build, responsive browser surface, and `git diff --check`.
- [x] Save unpublished checkpoint `265c8065`; deployment and publication remain separate and unperformed.

### P3.0 Explore spatial discovery — DONE

- [x] Add the Explore-owned Creator Gallery Rail using the existing public creator projection, canonical IDs, and original artwork.
- [x] Provide Expanded, Compact, and Hidden desktop states plus a mobile horizontal snap rail; keep `LeftRail` as the only navigation authority.
- [x] Keep creator identity below artwork, preserve `selectedCreatorId`, filters, Work/WID links, PlayerContext, and Global Player continuity.
- [x] Add lazy image loading, keyboard focus, selected-state semantics, reduced-motion handling, and no-display-cap creator rendering.
- [x] Validate focused contract 8/8, full suite 944 passed/1 skipped, `pnpm check`, production build, whitespace, desktop/mobile captures, and live state-cycle smoke test.
- [x] Save unpublished checkpoint `640cacec`; no migration, route retirement, media mutation, deployment, or publication.

### P3.0.1 Explore surface depth refinement — DONE

- [x] Condense the sticky Explore header while preserving identity, search, randomization, sorting, refresh, filter, and view controls.
- [x] Add distinct layered surfaces for the global canvas, discovery header, Creator Domains rail, creator cards, and Work registry.
- [x] Add restrained bronze/gold depth, edge shadows, inner highlights, and responsive narrow-viewport rules without changing discovery behavior.
- [x] Preserve creator selection, artwork, WID/Work links, filters, PlayerContext, and Global Player continuity.
- [x] Validate focused Explore contracts (13/13), full suite (945 passed, 1 skipped), TypeScript, production build, and whitespace.
- [x] Capture updated desktop/mobile visual evidence after the final title-token compatibility repair.
- [x] Save the unpublished Explore refinement checkpoint `5c172207`.

### P3.0.2 Explore mobile architecture correction — DONE

- [x] Reflow the mobile header into identity → Explore heading → full-width search → Settings disclosure.
- [x] Preserve the existing horizontal snap Creator Domains gallery and canonical creator selection state.
- [x] Present Explore Works with opt-in mobile genre and `m:ss` duration metadata while reusing the existing WorkListRow playback/actions.
- [x] Add narrow-viewport card spacing, 320px safeguards, and bottom-stack clearance without changing Global Player authority.
- [x] Validate focused Explore/activity contracts (29/29), full suite (949 passed, 1 skipped), TypeScript, production build, and whitespace.
- [x] Save unpublished checkpoint `58198e73`; deployment and publication remain unperformed.

### P3.0.3 Explore header density correction — DONE

- [x] Replace the oversized Explore hero composition with a compact discovery toolbar targeting approximately 72–100px desktop height.
- [x] Consolidate identity, title, search, creator context, sorting, display controls, refresh, and mobile Settings disclosure without changing their behavior.
- [x] Preserve the dedicated desktop Creator Gallery rail, horizontal mobile snap strategy, creator artwork, Work/WID relationships, filters, and Global Player authority.
- [x] Validate 1440, 1024, 768, 390, 375, and 360px captures; confirm clean desktop geometry at 86.6px header height, 74.4px toolbar height, and no horizontal overflow.
- [x] Validate focused Explore/activity contracts (29/29), full suite (949 passed, 1 skipped), TypeScript, production build, and whitespace.
- [x] Package before/after evidence under `docs/evidence/explore-density/`; keep the checkpoint unpublished.

### P3.1 Four image treatments — NEXT

- [ ] Define Artifact treatment for Registry and archival views.
- [ ] Define Cinematic treatment for Global Player and immersive presentation.
- [ ] Define Catalog treatment for Explore, creator catalogs, and playlists.
- [ ] Define Testimony treatment for biography, origin story, and declarations.
- [ ] Standardize aspect ratio, focal point, crop, fallback art, safe text zones, and responsive behavior.
- [ ] Ensure image color influences ambience without controlling text readability.
- [ ] Test missing, portrait, landscape, high-contrast, and text-heavy artwork.

### P3.2 Artwork quality and accessibility — NEXT

- [ ] Add meaningful alt-text rules for creator-provided visuals.
- [ ] Keep decorative artwork empty-alt when the adjacent title carries the meaning.
- [ ] Add predictable loading, fallback, and error states.
- [ ] Avoid placing essential information directly on busy artwork.

## Release track 4 — Navigation and mobile clarity

### P4.1 Primary navigation reduction — NEXT

**Outcome:** A new visitor can understand where to go without learning the whole platform vocabulary.

- [ ] Consolidate primary navigation into Discover, Create, Community, and System.
- [ ] Move advanced tools such as PNA, companion player, Marketplace, and advanced Registry actions into contextual or secondary entry points.
- [ ] Remove duplicate routes and duplicate management surfaces from first-level navigation.
- [ ] Keep contextual back paths and breadcrumbs reliable.
- [x] Add the Work Desk as a primary additive composition surface for registered Works, the existing editor, Draft Releases, and Named Playlists; preserve legacy routes during validation.
- [x] Apply shared hover, press, focus, and reduced-motion-safe feedback to the LeftRail, mobile drawer, hamburger, and mobile chrome.
- [ ] Add route-level navigation regression coverage.

### P4.2 Mobile progressive disclosure — NEXT

- [ ] Keep artwork, title, creator, and primary action above the fold.
- [ ] Collapse secondary metadata into a readable provenance row or drawer.
- [ ] Move activity and Signals into contained mobile surfaces.
- [ ] Keep the Global Player compact and persistent without hiding page actions.
- [ ] Ensure creator cards do not expose every support action at once.
- [ ] Validate 360px, 375px, 390px, tablet, and narrow desktop widths.

## Release track 5 — Creator confidence and onboarding

### P5.1 Creator Field Guide — DONE / refine

- [x] Create testimony-first Creator Field Guide entry point.
- [x] Link the guide from onboarding and the canonical upload flow.
- [x] Explain Testimony, Work, WID, preparation, registration, and preservation.
- [ ] Add a concise “before you upload” checklist.
- [ ] Add clear Draft → Published → Verified explanations.
- [ ] Add non-fabricated visual walkthrough captures only after the current UI is stable.

### P5.2 Creator Domain simplification — HOLD

- [ ] Do not begin until the public Work hierarchy and surface-mode contract are stable.
- [ ] Reduce duplicate Studio, Archive, Collections, and management entry points.
- [ ] Preserve existing creator-authorized workflows and registry permissions.
- [ ] Keep draft editing distinct from sealed historical editions.

## Release track 6 — Quality and release gates

### P6.1 Every patch gate — NOW / recurring

- [ ] Current-state and blast-radius note before implementation.
- [ ] Smallest patch plan with affected files, routes, authorities, risks, and rollback.
- [ ] `pnpm check` passes with zero TypeScript errors.
- [ ] Focused regression tests pass.
- [ ] Full `pnpm test` passes when shared chrome or contracts change.
- [ ] Production build passes.
- [ ] Accessibility review covers focus, contrast, reduced motion, and touch targets.
- [ ] Responsive review covers mobile and narrow desktop.
- [ ] `git diff --check` passes.
- [ ] Checkpoint saved before publication.
- [ ] Publication status verified separately from implementation status.

### P6.2 Release acceptance — HOLD

- [ ] Authenticated creator can register, edit, archive, resume, and preserve a Work.
- [ ] Unauthorized creator cannot access another creator’s draft or private material.
- [ ] Public visitor can discover, read, listen, witness, verify, and export eligible public Works.
- [ ] Playback continues through route changes and visual preview changes.
- [ ] PWA activation behavior has an evidence-supported resolution or an explicit accepted limitation.
- [ ] Production frontend commit matches the approved checkpoint.
- [ ] No pending migration or schema-ledger mismatch remains.
- [ ] Separate publication approval recorded.

## Intentionally retired or deferred

- [ ] Do not add new feature families during consolidation.
- [ ] Do not reintroduce disabled AI/PNA capabilities into the primary public shell.
- [ ] Do not activate WID-ALB2 signing or sealing without separate approval.
- [ ] Do not create a second playback authority, Registry, manifest store, or media system.
- [ ] Do not expand Jellyfin integration from the application branch without an explicit shared-integration decision.
- [ ] Do not add social-feed complexity to the Witnessing model.

## Definition of a timely patch

A timely patch is a narrow change that:

1. fixes one visible user problem;
2. touches the fewest authoritative files;
3. preserves identity, provenance, permissions, and playback;
4. includes a focused regression test;
5. can be reviewed and rolled back independently;
6. produces a checkpoint and a truthful publication status.

## Archive reference

The retired ledgers are preserved at:

`docs/lnls/archives/work-ledger/2026-11-02/`

They remain historical records, not active instructions.
