# Mobile Cross-Page Layout Audit — 2026-10-19

**Status:** Implemented and validated in the development workspace; not a claim of production publication.

## Purpose

Investigate reported mobile clipping and crowded presentation on public Creator Domains, public Work pages, and Explore’s creator directory. The objective is to make each surface fit its own width and remain usable above the fixed Global Player, without hiding problems through page-level clipping or changing playback, WID, provenance, or Creator relationships.

## Evidence basis

This is a source inspection plus responsive preview audit of the current development workspace. It is not a claim about a deployed production build.

- Reported devices show the Explore creator directory’s lower action row being cut off and Related Works imagery reaching beyond its intended column.
- A direct Explore DOM measurement found the creator-card footer overflowing its own width: the action group measured 265px inside cards whose footer available widths were 352–358px, while the published-count label and gaps were also present.
- Responsive preview screenshots at `375 × 812` were partially obscured by the existing “What’s New” modal, so that overlay is called out separately rather than treated as conclusive page-layout evidence.
- Four independent source audits covered Explore creators, public Work related Works, public Creator Domains, and shared mobile shell/player geometry.

## Findings

### 1. Explore creator cards have an impossible one-row action budget

**Active source:** `client/src/pages/ExplorePage.tsx`, `CreatorDirectoryCard` footer, approximately lines 717–762.

Every card tries to hold the following in one unwrapped horizontal row:

1. the variable-length published-work count;
2. a full-text Witness control;
3. a full-text Support control; and
4. a `Visit domain` link.

On a narrow device, `16px` page gutters and `20px` card padding leave about `248px` of card interior. The action cluster alone is approximately `265px` before the count text is allocated. Existing mobile CSS rightly raises actions to a 44px-friendly height and readable type, but does not change the one-row layout.

This is the direct source of the cut-off footer. The desktop grid is not the cause: the directory already correctly becomes one column below `640px`.

**Repair:** In creator mode only, remove the list-only randomization control from the mobile header. Reflow the directory card footer below `640px`: count on its own line; Witness and Support as equal-width 44px-minimum controls; hide the redundant mobile-only `Visit domain` text link because the identity/header card is already a visible, keyboard-accessible Creator Domain link. The link remains on tablet and desktop. Statement copy can reduce from three lines to two on narrow screens rather than reducing target size.

### 2. Explore’s creator-mode header spends scarce width on a list-only control

**Active source:** `client/src/pages/ExplorePage.tsx`, approximately lines 1031–1069.

The mobile header places Randomize, creator sort, view toggle, and refresh in the same wrapping cluster. Randomize controls the Works discovery feed only; it does not affect `Browse creators`. Creator sort has an intentional `8.75rem` mobile minimum, which becomes crowded with the other controls.

**Repair:** Do not render Randomize in creator mode. Use a creator-mode mobile control composition with the sort as the primary row and compact view/refresh actions on a second row. Preserve the accessible select, visible view control, and 44px target floor.

### 3. Public Work “Related works” lacks an explicit one-column mobile grid

**Active source:** `client/src/pages/loop/LoopWorkPage.tsx`, Related Works section approximately lines 763–821.

The related Work collection currently begins as `grid sm:grid-cols-2 lg:grid-cols-3`, leaving the base grid track implicit. A `Link > article` card has no local `min-w-0`, while titles, Creator names, and WIDs come from external records. A long unbroken WID or Creator value can therefore enlarge the implicit track before text truncation contains it. The shared page shell then clips the oversized descendant with `overflow-x-hidden`, which makes it look as if the card is bleeding off the screen.

The query is already public and bounded to six related Works. It is not an unbounded feed problem.

**Repair:** Make the grid explicitly mobile-first: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`. Apply `min-w-0 w-full` to the link and `min-w-0` to the article/local dynamic-text containers. Preserve the related Work limit, raw WID display, canonical `/song/:id` destinations, and existing `PlayerContext` playback path.

### 4. Creator Domain Work rows exceed their narrow-device fixed-width budget

**Active source:** `client/src/components/creator/SanctuaryWorksOrganizer.tsx`, Work rows approximately lines 148–230.

A row combines a `64px` cover, two `16px` gaps, a flexible detail column, and a nonshrinking quick-action cluster. A downloadable Work can expose heart, playlist, and download actions at 44px each. Those fixed pieces consume roughly `236px` before any title, genre, or WID text is given space; this cannot remain robust at narrow handset widths.

Some dynamic Creator Domain values also need local wrapping protection: long handles, locations, testimony text, genre chips, custom distribution labels, and memorial text can exceed their own container if they contain long uninterrupted strings. The visible app-wide overflow rule hides that instead of making the local surface resilient.

**Repair:** At a deliberate narrow breakpoint, retain the current one-row Work layout only when it fits; otherwise move its existing quick-action cluster to a full-width, end-aligned second row. Keep action targets at least 44px and retain the exact verification link, WID, and canonical `onPlay` behavior. Add `min-w-0`, `max-w-full`, and `overflow-wrap:anywhere` only to the dynamic-text containers listed above. Do not change intentional horizontal tab strips on the alternate `/@handle` Creator Domain route.

### 5. The shared mobile shell needs a geometry audit, not a player redesign

**Active sources:** `client/src/components/layout/MainLayout.tsx`, `client/src/components/player/GlobalPlayer.tsx`, and `client/src/index.css`.

The current shell uses a fixed mobile header and a fixed Global Player. The shared scroll area reserves bottom space, which is correct in principle. However:

- At authenticated widths, the header can contain a flexible logo group plus up to seven fixed or intrinsic controls without a narrow-width control budget.
- The mini player’s stated `72px` height does not include all of its declared nonshrinking children (`20px` drag handle + `2px` progress + `52px` row) or the safe-area inset.
- CSS and component rules reserve bottom space differently at `<=767px` and `768–1023px`, even though the player remains in mobile mode until `1024px`.
- The current `overflow-x-hidden` rules prevent document-wide scroll, but should remain a final containment measure rather than the way a card or header is made to fit.

The Global Player is not the root cause of the reported Related Works and Explore footer clipping. Its fixed mini-player geometry is, however, a separate shared mobile reliability issue worth correcting after the three page-local defects.

**Repair:** Define one shared `<1024px` mobile-shell geometry contract: top safe-area/header space and a mini-player height that includes handle, progress, controls, and safe-area inset. Consume those values in the header, scroller reservation, and player root. Add explicit `min-w-0` through the shared flex chain and compact already-reachable secondary header controls at `320–420px` only if the action budget requires it. Preserve the existing player, queue, and navigation authority.

### 6. Preview inspection was blocked by the existing update modal

**Source to verify:** `client/src/components/WhatsNewModal.tsx` and its shell mount.

The mobile screenshots captured during this audit displayed the “What’s New” dialog on every sampled route. This was an inspection obstruction, not proof that the dialog is shown repeatedly in all real user sessions. Its persistence/once-per-version state should be measured before changing it.

**Repair (only if reproduced):** Keep the release note available through an explicit entry point, but store/dismiss it once per release version and do not allow it to repeatedly obscure initial route assessment.

## Proposed implementation order

1. **Local page containment:** Related Works explicit grid; Creator Domain Work-row action reflow; local dynamic-text wrapping.
2. **Explore creator composition:** creator-mode control budget; stacked creator-card footer; two-line secondary disclosure.
3. **Shared shell geometry:** consolidate safe-area/header/mini-player reservation from `320px` through `1023px`; narrow header compaction.
4. **Update modal verification:** address only if repeated display is reproduced after the above.

Each step is presentation and accessibility work. It must not modify:

- `PlayerContext`, audio instances, queue construction, or playback continuity;
- WIDs, hashes, provenance, Creator associations, registration, or publication state;
- Creator Domain identity resolution, Work routes, or verification destinations;
- intentional horizontal browsing surfaces such as queue strips or `/@handle` tabs;
- database schema, migrations, server authorization, or AI-operation pause controls.

## Required validation

For the implementation slice:

- Run `pnpm check`.
- Run focused contracts for active Creator Domain, active Work, Explore creator directory, mobile guards, and Global Player access/continuity.
- Add contracts protecting the explicit Related Works mobile grid and `min-w-0` containment; Creator Work two-row action fallback; Explore creator-mode no-randomize policy and mobile footer reflow; and shared mobile geometry alignment.
- Use responsive browser checks at `320`, `375`, `390`, `414`, `767`, `768`, `1023`, and `1024px` where feasible. Verify `document.documentElement.scrollWidth <= clientWidth`, 44px action floors, readable/truncated local metadata, access to last content above the player, and intact queue/playback behavior.
- Recheck the release-notes overlay before treating it as a defect.
- Run `pnpm build`, `git diff --check`, then full `pnpm test`. State any unrelated suite failures precisely rather than calling the suite clean.

## Implementation record — 2026-10-19

The approved repair sequence is implemented as a bounded presentation and accessibility change.

- **Related Works:** `LoopWorkPage.tsx` now uses an explicit single-column base grid and local `min-w-0` containment for dynamic Work identity values. It retains the six-Work public query bound, canonical Work destinations, and the existing playback path.
- **Creator Domains:** `SanctuaryWorksOrganizer.tsx` moves existing quick actions to a second row at the narrow breakpoint. Dynamic Creator Domain, memorial, and alternate-domain values wrap locally rather than depending on app-wide clipping.
- **Explore:** Creator browsing now has a dedicated narrow-device control composition; creator-card count and actions reflow within the card instead of competing for one horizontal row. The creator identity remains the card’s accessible Creator Domain destination.
- **Shared shell:** `MainLayout.tsx`, `LeftRail.tsx`, `GlobalPlayer.tsx`, and `index.css` share a geometry contract for the safe-area-aware mobile header and mini player. On narrow screens secondary header controls are intentionally collapsed, while Compose remains available through the mobile navigation rail. The rail itself ends above the reserved player area.
- **No authority changes:** No schema, migration, server route, creator relationship, WID, provenance, public eligibility, queue construction, audio instance, or AI-operation-pause behavior changed.

### Validation evidence

- `pnpm check` passed.
- Focused mobile, Explore, Creator Domain, Work, and player-continuity contracts passed: **7 files / 32 tests**.
- After reconciling two stale source-string assertions with the preserved header and main-scroll class names, `pnpm test` passed: **127 files / 797 tests**, with **1 intentionally skipped** browser test.
- `pnpm build` passed. It retains existing build warnings from the `file-type` dependency and pre-existing large bundle notices; those are not failures from this repair.
- `git diff --check` passed.
- Direct CDP emulation measured all three affected routes at `320`, `375`, `390`, `414`, `767`, `768`, `1023`, and `1024px` widths (24 route/viewport samples total). Every sample had `document.documentElement.scrollWidth === window.innerWidth`; no horizontal document overflow was measured. At 320–414px the visible unauthenticated header had four controls; at 767–1024px it had five. At 375px the header height was 56px, and the fixed mini player and mobile navigation rail both respected the 82px safe-area reservation where a player was active.
- Responsive preview captures were taken at `375 × 812` and `768 × 1024` for the same three routes. These are development-preview observations only.

## Approval request

Approve the proposed **Mobile Containment and Hierarchy repair slice** to implement the four bounded presentation fixes in the stated order. The update-modal behavior will be measured first and changed only if its repetition is reproduced.
