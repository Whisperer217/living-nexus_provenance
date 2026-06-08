# Living Nexus — Changelog

All notable changes to the Living Nexus platform are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

---

## [Unreleased]

### Pending
- Router split (Phase 56) — routers.ts (~5,700 lines) to be split into per-domain files: `server/routers/songs.ts`, `keeper.ts`, `marketplace.ts`, `admin.ts`, `projects.ts`, `satchel.ts`, etc.
- Production migration `0085_romantic_fenris.sql` (provenanceEvents table) to be applied on production DB.
- Marketplace default listings to be seeded on production via the "Seed Default Listings" button.

---

## [2.46.0] — 2026-06-08 · Phase 193.5 + 194: Trust Restoration + Creator Identity Completion

### Fixed (Phase 193.5 — Trust Restoration)
- **TopBar guide autocomplete links** — `/guides/${id}` corrected to `/guide/${id}` (singular route). Guide links in the search autocomplete now resolve correctly.
- **`/settings` route** — Added redirect to `/settings/billing`. The Settings option in the avatar menu no longer 404s.
- **Duplicate archive routes** — Removed duplicate `/archive/mine` and `/archive/ledger` route registrations from the inner App.tsx block.
- **Explore deep links** — `/explore?medium=music`, `?sort=new`, `?sort=trending` now drive page state via `useSearch` + `useEffect` sync. ContextDrawer deep links are functional.

### Added (Phase 194 — Creator Identity Completion)
- **`creativeMission` DB column** — New `text` column on the `users` table (migration `0104` applied). Stores what the creator is actively building toward right now.
- **`creativeMission` in tRPC** — Added to `profile.update` input schema and `updateUserProfile` type in `server/db.ts`.
- **IdentityEditor rewrite** — The Profile → Identity tab is fully rebuilt with a two-layer structure:
  - *Witness Identity Layer:* Origin Statement (renamed from "ORIGIN STORY"; carries the prompt "What truth, experience, mission, or curiosity gave rise to this creator identity?" with live 300-word counter), Creative Mission (new), Active Mediums selector (Music / Books / Comics / Manuscripts / Video / Other toggles), Creative Philosophy, Doctrine, Archive Continuity, Sigil URL.
  - *Distribution Identity Layer:* Official Artist Name, Label/Imprint, DSP profile links (Spotify, Apple Music, YouTube Music, Other).
- **Creative Mission on CreatorIdentityPage** — Public identity page now renders the Creative Mission field.
- **Soft identity gate on UploadPage** — When `originStatement` is empty, a non-blocking gold banner prompts the creator to establish identity before registering their first work.

### Governance
- **`references/OPERATIONAL-DOCTRINE.md`** — Preference hierarchy, feature gate, and canonical sequence: `Identity → Domain → Manifestation → Provenance → Discovery → Distribution → Artifact`.
- **README three-spine structure** — Architecture Documentation table now names all three governance documents: I. LAMININ (Foundation), II. LN-ADP v1 (Drift Protocol), III. Operational Doctrine (Decision Filter).

### Technical
- TypeScript: 0 errors
- Vitest: 237/237 passing

---

## [Mobile 1.0.0] — 2026-05-26 · Mobile Phase 1: App Shell — All 5 Screens

### Platform
Native mobile app (`living-nexus-mobile`) — Expo SDK 54 / React Native 0.81 / NativeWind 4

### Added
- **5-tab navigation** — Discover, Profile, Witness, Studio, You with gold active tint and haptic tab press.
- **Discover screen** — Light divine theme. Featured Creator card (cover gradient, WID, stats, tags), New Witnesses horizontal scroll (5 work cards with medium badge), Trending Works list, search bar scaffold, hamburger menu, quick-reference slider.
- **Creator Profile screen** — Dark sanctuary theme. Avatar, bio, verified badge, stats row, tabbed content (Works / Witnesses / About), mini audio player for featured track.
- **Witness screen** — Dark sanctuary theme. 3-step ceremony flow UI (Intake → Processing → Discharge), recent witness feed, WID badge display. Backend wiring deferred to Phase 2.
- **Studio screen** — Dark sanctuary theme. Creator identity summary, Quick Actions grid (Register, Witness, Share, Analytics), stats card, LAMININ Doctrine Arms grid (4 arms with counts), My Works list with color bar and WID.
- **You screen** — Dark sanctuary theme. Identity card with avatar and bio, WID identity section with Share/Copy actions, notification toggles, appearance settings, LAMININ Doctrine arm links, danger zone.
- **WID Badge component** — 3 size variants (sm/md/lg), verified checkmark state, gold-on-dark styling.
- **Creator Card component** — Featured (full hero card), compact (horizontal scroll), and row (list) variants.
- **Hamburger Menu component** — Slide-out drawer with LAMININ arm navigation (Registry, Community, Commerce, Doctrine) and creator identity header.
- **Quick Reference Slider component** — Left-side collapsible page summary present on all screens, 6 doctrine reference items.
- **Mini Audio Player component** — Play/pause, seek bar, track title and artist, duration display.
- **Mock data** — 5 creators, 5 works, 5 witness entries, 6 quick-reference items. All typed and contract-tested.
- **Dual divine theme** — Light palette for public entry (Discover), dark sanctuary palette for authenticated screens.
- **Unit tests** — 13 tests covering all mock data contracts. All passing.

### Technical
- TypeScript: 0 errors
- All tab icons mapped in `icon-symbol.tsx` before use
- `ScreenContainer` used on all screens for safe area handling
- `StyleSheet.create()` used throughout (no inline style objects)
- Mock data isolated in `lib/mock-data.ts` — drop-in replacement with tRPC calls in Phase 2

### Deferred to Phase 2
- Database wiring (replace mock data with live tRPC calls)
- Authentication (Manus OAuth via `expo-web-browser`)
- WID Registration ceremony (backend call to `wids.create`)
- Theme toggle wired to `ThemeProvider`
- Haptic feedback pass on all primary actions

---

## [2.40.0] — 2026-04-25 · Phase 59: TypeScript Cleanup + Engine Repo Features

### Added
- **Provenance Events schema** — new `provenanceEvents` table in `drizzle/schema.ts` with `id`, `creatorId`, `eventType`, `payload`, `witnessId`, `createdAt` columns. Migration `0085_romantic_fenris.sql` generated.
- **Agents table** — new `agents` table for Personal Nexus Agent records with `id`, `userId`, `fingerprint`, `createdAt`, `updatedAt`.
- **WIDs table** — new `wids` table for Work Identity Documents with `id`, `creatorId`, `witnessId`, `eventId`, `payload`, `createdAt`.
- **`publicKey` column on users** — nullable `text` column added to `users` table for Ed25519 public key storage (private key remains client-side only).
- **`satchel` tRPC router** — `satchel.list`, `satchel.create`, `satchel.delete` procedures replacing the previous `events.*` namespace on `CreatorSurface`.
- **`ppg` tRPC router** — Provenance Prompt Generator procedures (`ppg.generate`, `ppg.list`, `ppg.delete`).
- **`agents` tRPC router** — `agents.getOrCreate`, `agents.updateFingerprint` procedures.
- **`wids` tRPC router** — `wids.create`, `wids.getByCreator`, `wids.getById` procedures.
- **`auth.hasKeypair` procedure** — public query returning whether the current user has a stored Ed25519 public key.
- **`auth.generateKeypair` procedure** — protected mutation that generates and stores an Ed25519 keypair (public key server-side, private key returned once to client).
- **DB helpers** — `insertProvenanceEvent`, `getProvenanceEventsByCreator`, `getWidWithEvent`, `insertWid`, `getOrCreateAgent`, `updateAgentFingerprint`, `setUserPublicKey` added to `server/db.ts`.
- **`getSongByWitnessId` restored** — function was accidentally removed during AI Transform cleanup; restored to `server/db.ts` (used by `oembedRoute.ts`, `og.ts`, `routers.ts`, `shareRoute.ts`, `workRoute.ts`).

### Fixed
- **Zero TypeScript errors** — all TS errors resolved across `CreatorSurface.tsx`, `WIDLookup.tsx`, and all new router files. Confirmed by `tsc --noEmit`: 0 errors.

---

## [2.39.0] — 2026-04-25 · Phase 55: AI Transform (Sonauto) Removal

### Removed
- **AI Transform feature** — entire Sonauto integration removed. Net: −552 lines across 6 files.
  - `songs.aiTransform`, `songs.getTransformStatus`, `songs.getMyTransforms` tRPC procedures removed from `routers.ts`.
  - `createAiTransform`, `updateAiTransform`, `getAiTransformById`, `getAiTransformsByUser`, `getAiTransformsByWitnessId`, `getAiTransformsBySong` DB helpers removed from `db.ts`.
  - `aiTransforms` table and associated types removed from `drizzle/schema.ts`.
  - AI Transform modal removed from `SongDetailPage.tsx`.
  - "My Transforms" tab removed from `DashboardPage.tsx`.
  - Lineage block removed from `workRoute.ts`.
- **Note**: The `aiTransforms` DB table was never applied to production; a `DROP TABLE aiTransforms` can be run as optional cleanup.

---

## [2.38.0] — 2026-04-25 · Phase 54: Marketplace Navigation

### Added
- **Mobile bottom nav — Shop tab** — 5-tab bottom navigation bar in `MobilePlayerLayer.tsx`: Home, Explore, **Shop** (center position, permanent gold ring border + gold icon/label), Create, Profile. Shop tab navigates to `/marketplace`.
- **Desktop top nav — Marketplace pill** — gold-bordered "MARKETPLACE" pill added to `TopBar.tsx` desktop navigation alongside existing nav items.

---

## [2.37.0] — 2026-04-25 · Phase 53: Keeper Image Vision Fix

### Fixed
- **Keeper image analysis pipeline** — `sendSandboxToKeeper` in `FloatingAvatar.tsx` was passing only the text label of an attached image to the LLM; the image itself was never sent. Fixed to route through the `analyzeImage` tRPC mutation first, then pass the vision analysis result as context to `keeper.chat`. Keeper now actually sees uploaded images.

---

## [2.36.0] — 2026-04-25 · Phase 52: Voice Recorder UX Overhaul

### Changed
- **Voice recorder interaction model** — replaced unreliable hold-to-record gesture with a deterministic click-to-start / click-to-stop state machine in `FloatingAvatar.tsx`.
  - States: `idle → recording → ready → transcribing`
  - **Idle**: mic button available.
  - **Recording**: red pulse animation; "Stop" button ends recording.
  - **Ready**: "Transcribe" and "Discard" buttons presented before committing to Whisper API call.
  - **Transcribing**: gold spinner while Whisper processes; result drops into the Write tab editor on completion.
- Eliminates accidental recordings and wasted Whisper API calls from premature releases.

---

## [2.35.0] — 2026-04-25 · Phase 51 / Phase 47: Audio Playback Fix

### Fixed
- **Web Audio API `AudioContext` suspended state silencing audio** — root cause: `glowEnabled` in `PlayerBar.tsx` and `MobilePlayerLayer.tsx` defaulted to `true` (opt-out via `!== 'off'`), causing the frequency glow hook to call `audioContext.createMediaElementSource()` on every render. This transferred ownership of the `<audio>` element to the Web Audio graph and suspended the context, silencing playback.
- **Fix**: `glowEnabled` now defaults to `false` (opt-in via `=== 'on'`). Glow is only activated when the user explicitly enables it via the Waves toggle. Audio plays correctly without any user action.
- **`useFrequencyGlow` hook** — additionally hardened to gate on `enabled === true` AND `AudioContext.state === 'running'` before connecting the audio element, preventing silent failures if the context is not yet resumed.

---

## [2.34.0] — 2026-04-25 · Phase 50: Keeper Avatar Desktop Drag

### Added
- **Desktop drag for `FloatingAvatar`** — 200 ms hold-to-drag on desktop (matching existing touch behavior). Mouse down starts a 200 ms timer; if the mouse is still held after the delay, drag mode activates and the orb follows the cursor. Mouse up commits the new position to `localStorage`. Prevents accidental drags on single clicks.

---

## [2.33.0] — 2026-04-25 · Phase 49: Marketplace Seed Defaults

### Added
- **`marketplace.seedDefaults` procedure** — protected tRPC mutation that inserts 6 curated default marketplace listings (beat packs, sample kits, session credits, etc.) when the marketplace is empty. Idempotent: checks for existing items before inserting.
- **Seed button on `MarketplacePage`** — "⊕ Seed Default Listings" button shown in the empty state for authenticated users, wired to `marketplace.seedDefaults`.

---

## [2.32.0] — 2026-04-25 · Frequency Glow Player

### Added
- **Frequency-reactive purple glow border** on the global audio player. Three-band analysis: bass (20–250 Hz bloom), mid (250–4 kHz shimmer), high (4 k–20 kHz edge flicker).
- Desktop toggle: Waves icon button in `PlayerBar` right controls (lit purple when active).
- Mobile toggle: Glow button in expanded panel functional row.
- `localStorage` persistence for glow preference.
- CORS fallback to static ambient glow when cross-origin audio blocks `createMediaElementSource`.

---

## [2.31.0] — 2026-04-25 · Player Black Theme + Keeper Sandbox

### Changed
- **Global player black theme** — player bar background (collapsed + expanded) changed to `#000000`. Track title brightened to `#F5EDD8`, artist name to `rgba(230,220,200,0.75)`, comment text to `#EDE0C4`, comment input to `#0a0a0a` with gold border.

### Added
- **Keeper Creative Sandbox** — `FloatingAvatar` expanded panel gains two tabs:
  - **Write tab**: micro-editor with bold/italic/highlight formatting, S3 image upload, "Send to Keeper" action.
  - **PPG tab**: Provenance Prompt Generator with 5 prompt types, Suno/Udio/General platform selector, inspiration blocks, and EID badge.
- **Voice transcription in Write tab** — mic button in toolbar; hold to record (touch + mouse), Whisper processes on release, transcribed text drops into editor. Red pulse while recording, gold spinner while processing.
- **AI Artwork Generation** — after PPG prompt generation, a gold "Generate Art from Prompt" button appears; sends prompt + style tags to image engine; artwork previews inline with Download or Send to Keeper options; S3-persisted URL.
- **Image Analysis** — hover any attached image thumbnail in Write tab; Analyze button sends image + editor text to Keeper vision; result appears in chat as `[KEEPER VISION]`.

---

## [2.30.0] — 2026-04-25 · Marketplace Full Feature

### Added
- **`/marketplace` page** — hero section, filter tabs (All / Beats / Samples / Sessions / Merch / Other), item grid, Stripe checkout, My Purchases tab.
- **`MarketplaceDrawer`** — global mini-drawer accessible via a `✦ SHOP` pull handle on every page; shows 10 recent items with quick-buy.
- **`marketplace_items` + `marketplace_purchases` DB tables** — migration `0084` applied.
- **`marketplace` tRPC router** — `listItems`, `getItem`, `createCheckout`, `stripeWebhook`, `myPurchases`, `creatorSales`, `createItem`, `updateItem`, `deleteItem` procedures.

---

## [2.29.0] — 2026-04-25 · Keeper Character Page + Mobile Fixes

### Fixed
- **KeeperPage back button** — was navigating to `/create`; corrected to `/`.
- **KeeperPage mobile layout** — single-column layout with full-screen bottom sheet on mobile.

### Added
- **FloatingAvatar Creative Sandbox** (initial version) — Write tab micro-editor and PPG tab.

---

## [2.28.0] — 2026-04-25 · Album Download + CSS Variables

### Added
- **Album-level download pricing** — three tiers: `none` (disabled), `free`, `gift-gated` (requires Stripe gift purchase).
- **tRPC procedures**: `getAlbumDownload`, `setAlbumDownload`, `downloadAlbum`, `createAlbumDownloadCheckout`.
- **Stripe webhook** for `album_download` checkout type.
- **DB migration `0082_album_download.sql`** applied.

### Fixed
- **Missing CSS variables** — `--ln-panel`, `--ln-obsidian`, `--ln-panel-border` added to `index.css`; `FloatingAvatar` expanded panel and `KeeperPage` now render with solid dark backgrounds.
- **Stripe init guard** — `Stripe()` constructor now guarded against missing `STRIPE_SECRET_KEY` in dev environments.

---

## [2.27.0] — 2026-04-25 · Keeper Avatar System (Phase 2a)

### Added
- **`FloatingAvatar` orb widget** — draggable Keeper orb with StarCraft-style portrait, mode color ring, pulse animation, and `localStorage` position persistence.
- **`KeeperPage`** (`/keeper`) — character screen with 6 unlockable skins, custom S3 upload slot, live Keeper stats from DB, mode selector, and loadout slots.
- **`keeper` tRPC router** — `getProfile`, `unlockSkin`, `setActiveSkin`, `chat` procedures.
- **`keeperSkins` DB table** — migration `0081` applied.
- **Cinematic mode** — panels collapse with smooth width/opacity transitions, header hides, editor goes full-screen. `F11` toggle + button.
- **Now Playing via Media Session API** — auto-detects external tabs, injects agent thread message on track change.
- **Keeper orb z-index** — lifted above `PlayerBar` (`zIndex: 9050`, `bottom: 92px` desktop / `144px` mobile).
- **Pull tabs** — Live panel and `PlaylistDrawer` pull tabs made visible with gold accent borders and dark background.

---

## [2.26.0] — 2026-04-24 · EditTrackPanel Enhancements

### Added
- **Lyric file formats** — lyrics input now accepts `.txt`, `.mus`, `.musicxml`, `.mxl`, `.xml` (max 2 MB). MusicXML files parsed via `DOMParser` extracting `lyric/text` nodes, with tag-stripping fallback.
- **Processing status strip** — gold spinner + animated progress bar + step label during Save metadata, Witness Lyrics (3 steps), and Replace Audio (4 steps) operations. Green check auto-dismisses after 2.5 s; red alert with Dismiss on error.

---

## [2.25.0] — 2026-04-24 · PlayerBar Portal Fix + Donation Redirect

### Fixed
- **PlayerBar volume popup and context menu** — converted to `position: fixed` `createPortal` calls rendered directly to `document.body`, positioned via `getBoundingClientRect`. Now immune to ancestor `overflow: hidden` and stacking context clipping.
- **Project donation Stripe checkout** — changed from `window.open(_blank)` to `window.location.href` so the Stripe `success_url` redirect fires in the same tab, `confirmDonation` runs, and the raised total updates correctly.

---

## [2.24.0] — 2026-04-24 · Cover Art Upload Fix

### Fixed
- **Cover art save failure for images >750 KB** — base64 in JSON body was exceeding the 1 MB Express limit. Cover art now uploads via multipart streaming to `/api/upload-file` (same as main upload flow, no size ceiling).
- **JSON body limit** raised from 1 MB to 10 MB as a safety net for other base64 payloads (storyboard pages, video thumbnails).

---

## [2.23.0] — 2026-04-24 · Mobile Player Readability

### Fixed
- **Mobile player contrast** — artist name, timestamps, action tray icons (Share Artifact, Support, View Record, Vol), shuffle/repeat inactive state, like button inactive state, and mini-bar Next button brightened from near-invisible dark brown/dim gold to warm parchment `rgba` values. Gold track title gradient and gold play button unchanged.

---

## [2.22.0] — 2026-04-24 · CreatorHandle Portal Fix

### Fixed
- **View Profile navigation** — `cardRef` forwarded into portal so outside-click handler ignores taps inside the card. `navigate` fires before `onClose` to prevent re-render interrupting navigation. `onPointerDown stopPropagation` on button. Both `mousedown` and `touchstart` listeners added in capture phase for full Android browser compatibility.
- **Profile navigation by numeric ID** — View Profile button and chip link were navigating to `/creator/{artistHandle}` (string), which `parseInt()` turned into `NaN`. Fixed to always navigate to `/creator/{userId}` (numeric).

---

## [2.21.0] — 2026-04-24 · Player UI Rename + TrackCard Links

### Changed
- **Player UI label rename** — TIP → Support, SHARE → Share Artifact, DETAILS → View Record across mobile expanded/cinematic player, desktop `PlayerBar` context menu, `GiftModal` tab, and `SongDetailPage` header.
- **TrackCard links** — external link and title now point to `/song/:id` (DB-backed) instead of `/track/:id` (in-memory queue).

---

## [2.20.0] — 2026-04-24 · Admin Donation Sync + Bug-Kill Badge

### Added
- **`admin.syncProjectDonations`** — tRPC procedure queries Stripe for all paid checkout sessions, deduplicates against `projectDonations` table, and backfills missing records.
- **Projects/Donations tab** on `/admin` panel with per-project Sync Donations button and inline webhook setup instructions.
- **Bug-kill pill badge** — shown on admin profile and honored creator handles (`slimdoggy`, `moshai`). `AttributionPage` gains a dedicated Build Integrity section with live BUGS KILLED counter.

---

## [2.19.0] — 2026-04-15 · Mobile Scroll Fix + Trending Filter

### Fixed
- **Song page scroll snaps back on mobile** — new `light` overlay lock mode skips `touchAction: none` and `position: fixed`. `MobilePlayerLayer` defers lock until ≥8 px upward drag is confirmed. Tap targets (play/pause, like, next) no longer kill page scroll.
- **Trending content-type filter** — `getTrendingWorks` `contentType` enum cast added; filter now correctly scopes trending results.
- **`ExplorePage` infinite loop** — `useEffect` dependency replaced from `[songs]` to stable `[mode, activeGenre, query, contentType, seed]`.

---

## [2.18.0] — 2026-04-15 · Explore Page Scale + Tip Banners

### Added
- **Explore page scale** — Randomize/Trending/New This Week modes now return up to 500 tracks (was 24). Server validator cap and `getTrendingWorks` default both raised to 500. These modes render a flat responsive grid (160 px min card width) instead of per-creator pan-rows.
- **Tip confirmation banner** — in-page gold-bordered banner on `SongDetailPage` and `CreatorProfilePage` when `?tip=success` is in the URL. Auto-dismisses after 8 s.
- **Toast position** — moved from top-center to bottom-center site-wide. Default duration raised to 5 s, tip toast to 8 s.

---

## [2.17.0] — 2026-04-15 · Genre Multi-Select + Palette Migration

### Added
- **Genre list expanded** — 20 genres → 60+ entries across 8 logical groups.
- **Multi-select genre chips** — `EditTrackPanel` and `ProfilePage` genre fields replaced with scrollable multi-select chip grids (gold highlight, comma-separated storage).
- **`songs.genre` and `users.primaryGenre`** migrated from `varchar(64)` to `TEXT`. Server-side `.max(64)` Zod validator removed.

### Changed
- **Full LN Identity Palette migration** — ~3,500 replacements across 82 files (40+ pages, 30+ components, 7 player, 5 layout, 3 reader, 2 admin). Old tokens (`#2C3438`, `#3F4A50`, `#AA8E64`, `#CBB183`, `#E6CDAE`, all `rgba` variants) fully retired. `index.css :root` is now the single source of truth.
- **Global background** — `--ln-void` changed from `#353E43` (gunmetal) to `#111009` (near-black).

---

## [2.16.0] — 2026-04-15 · Lyrics Editor Enhancements

### Added
- **Lyrics auto-save** — draft saved to `localStorage` per `songId`, restored on reopen, cleared on save.
- **Lyrics stats row** — shows chars · lines · ~syl/line.
- **Undo/redo** — 200-entry history stack via `useRef` (zero re-renders), `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` redo, toolbar Undo/Redo buttons that grey out at stack boundaries. Stack resets on panel open.
- **Contributors strip** — home page strip featuring Doc, Slimdoggy, thiiirdgenkill.

---

## [2.15.0] — 2026-04-14 · Silent Playback Fix + Content-Type Borders

### Fixed
- **Silent playback after page refresh** — one-time mount effect in `PlayerContext` sets `audio.src` + `audio.load()` from restored `sessionStorage` track so `togglePlay()` has a valid `src` after refresh.
- **Content-type border colors** — dim values updated from dark hex codes to `rgba(0.38–0.40)` matching Upload page palette; chip borders brightened to 0.35 opacity.

---

## [2.14.0] — 2026-04-14 · Harmonic Signature + WID Panel

### Added
- **Harmonic signature audio/image download endpoints** — `/api/harmonic/audio` and `/api/harmonic/image` REST endpoints.
- **WID panel download buttons** — Download Harmonic Signature and Download WID Card buttons on the WID detail panel.
- **Waveform PNG generation** — replaced `canvas` (native dependency) with `jimp` (pure JavaScript) in `server/harmonicRoute.ts`. Waveform PNG generated pixel-by-pixel using `jimp.setPixelColor`.

---

## [2.13.0] — 2026-04-14 · Book Reader + Comic Upload

### Added
- **Book access control** — consent layer, external links, Stripe purchase gate.
- **Storyboard-only comic upload** — Next: Metadata button enabled when storyboard pages exist; publish handler skips file upload when pages are present; Generate WID hashes `pagesJson` for comics with no file. File drop zone relabels to optional when pages are added.
- **`HorizontalBookReader`** — top bar `z-[100]`, page area `zIndex: 1`, close/fullscreen buttons call `stopPropagation`. Credits panel role labels changed to colored pill badges (blue for Publisher, gold for all others).
- **QR Share Modal** — rendered via `createPortal` into `document.body`, escaping sticky bottom bar stacking context. `z-index: 99999`. Canvas preview width 240 px → 320 px. Close button is a proper 32×32 circular tap target.

---

## [2.12.0] — 2026-04-14 · CCAI Attribution + Trending Filter

### Added
- **CCAI General Assembly participation record** added to Attribution page.
- **Trending content-type filter** — trending filter now respects content-type chip selection.
- **GH Actions bug-kill auto-increment** — GitHub Actions workflow increments bug-kill counter on labeled issues.
- **`isPublic` backfill migration** — ensures all existing songs have correct `isPublic` value.

---

## [2.11.0] — 2026-04-14 · Command Page Dark Theme

### Changed
- **Command Page** — full dark theme overhaul.

---

## [2.10.0] — 2026-04-14 · Donation Sync + Admin Tools

### Added
- **Admin donation sync** — `admin.syncProjectDonations` procedure + Projects/Donations admin tab.

---

## [2.9.0] — 2026-04-14 · Song Caption Rendering

### Added
- **Song caption display** — AI-generated `song.caption` field now rendered on `SongDetailPage` below the plays/comments stats row. Gold left-border accent, `--ln-smoke` color. Only renders when non-empty.

---

## [2.8.0] — 2026-04-14 · Text Contrast Lift

### Fixed
- **Near-invisible text** — raised all `white/20`–`white/35` opacity values to `white/45`–`white/70` across `MainLayout` mobile nav, `TopBar`, `ProfilePage`, `FieldNotesPage`, `LearnPage`, `NotificationsPage`, `PlaylistsPage`, `ProjectPage`, `TrackPage`.

---

## [2.7.0] — 2026-04-15 · v2.30.0 Platform Features

### Added
- **Contributors strip** on home page.
- **Lyrics auto-save/stats** (see v2.16.0).
- **What's New modal** bumped to v2.30.0 with 4 changelog entries.

---

## [2.6.0] — 2026-04-15 · v2.29.0 Tip Banner

### Added
- **Tip banner** on creator profile + `SongDetailPage`.
- **What's New modal** bumped to v2.29.0.

---

## [2.5.0] — 2026-04-15 · v2.31.0 Genre + Reader Fixes

### Added
- **Genre multi-select** (see v2.17.0).
- **What's New modal** bumped to v2.31.0.

### Fixed
- **Reader close/fullscreen** button click interception.
- **Credits role badges** — colored pills replacing invisible `--ln-iron` text.

---

## [2.0.0] — 2026-03-17 · Phase 1 MVP

### Added
- **Provenance MVP** — Ed25519 keypair management, append-only event ledger, anchor pipeline (canonicalize → SHA-256 → sign → Event + WID), 4-panel creator surface (Satchel with session grouping, editor with 7 s idle + structural-change checkpoint trigger, Agent panel with Guide/Conductor/Critic/Custodian modes, PPG 3-variant generator, provenance footer bar).
- **WID public lookup page** (`/wid/:wid`) + `GET /wid/:wid` REST endpoint.
- **Landing page**.
- **20 passing unit tests**.

---

## [1.0.0] — 2026-03-16 · Initial Platform

### Added
- Full music platform with Divine Noir design: Home (hero + genre filters + track grid), Explore (search), Listen Together (rooms + chat), Profile (avatar/banner upload + stats), Upload (drag-drop audio + artwork), Liked Songs.
- Persistent audio player bar, Quick Reference Slider, hamburger mobile menu.
- Stripe Connect integration (account.updated, payment_intent.succeeded, account.application.deauthorized webhooks).
- Music Witness ID Generator — ECDSA P-256 cryptographic provenance, SHA-256 file hashing, harmonic frequency signature derivation, animated Canvas waveform, Web Audio API identity chord playback, downloadable HTML certificate.
- Artist profile showroom — customizable banner/avatar/bio/location/website/social links, tip jar, stats dashboard, track list.
- Song detail page (`/song/:id`) — unique shareable URL, play/like/share, Twitter share, copy link, tip jar, live comments.
- 7 genre category icons (Ambient, Gospel, Jazz, Electronic, Hip-Hop, Rock, R&B) as clickable filters.
- Official Living Nexus teal nexus orb icon — sidebar logo, mobile header, browser favicon.
